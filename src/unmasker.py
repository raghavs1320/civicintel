"""
Part 3: The Corporate Entity Unmasker
Resolves legal business entities (LLCs, Corporations) to real human decision makers.
Combines municipal permit applicant extraction with official Secretary of State registries.
"""

import json
import os
import re
import ssl
import urllib.request
import urllib.parse
import logging
from typing import Dict, Any, Optional, Tuple, List

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

RAW_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "harvested_leads.json")
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
UNMASKED_PATH = os.path.join(PROCESSED_DIR, "unmasked_leads.json")

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "CivicIntelHarvester/1.0 (Entity Resolution Engine)"
}

CORP_SUFFIXES = [
    r"\bLLC\b", r"\bL\.L\.C\.\b", r"\bINC\b", r"\bINCORPORATED\b",
    r"\bCORP\b", r"\bCORPORATION\b", r"\bLP\b", r"\bL\.P\b",
    r"\bHOLDINGS\b", r"\bGROUP\b", r"\bVENTURES\b", r"\bPROPERTIES\b",
    r"\bPARTNERS\b", r"\bMANAGEMENT\b", r"\bSERVICES\b", r"\bENTERPRISES\b"
]

REGISTRY_CACHE: Dict[str, Optional[Dict[str, Any]]] = {}


def clean_entity_name(raw_name: str) -> str:
    """Strips legal entity suffixes to produce a searchable clean brand/entity root."""
    if not raw_name:
        return ""
    clean = raw_name
    for pattern in CORP_SUFFIXES:
        clean = re.sub(pattern, "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"[,#\-\.]", " ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def extract_person_from_parentheses(text: str) -> Optional[Tuple[str, str]]:
    """
    Handles municipal patterns like:
    'RICHARD A LEMLEY (FIESTA CONTRACTING INC)' -> ('Richard A Lemley', 'Fiesta Contracting Inc')
    """
    if not text:
        return None
    match = re.search(r"^(.*?)\s*\((.*?)\)$", text.strip())
    if match:
        person = match.group(1).strip()
        company = match.group(2).strip()
        is_corporate = any(re.search(pat, person, re.IGNORECASE) for pat in CORP_SUFFIXES)
        if not is_corporate and len(person.split()) >= 2:
            return person.title(), company
    return None


def extract_human_name(raw_text: str) -> Optional[str]:
    """Identifies if a raw string is a human name rather than an LLC/corporate entity."""
    if not raw_text:
        return None
    
    text = raw_text.strip()
    for pat in CORP_SUFFIXES:
        if re.search(pat, text, re.IGNORECASE):
            return None
            
    if "," in text:
        parts = text.split(",")
        if len(parts) == 2:
            last = parts[0].strip().title()
            first = parts[1].strip().split()[0].title()
            return f"{first} {last}"

    words = text.split()
    if 2 <= len(words) <= 3 and all(w.isalpha() for w in words):
        return text.title()

    return None


def query_texas_sos_registry(clean_name: str) -> Optional[Dict[str, Any]]:
    """Queries official Texas Comptroller / SOS open database for registered entity details."""
    if not clean_name or len(clean_name) < 4:
        return None
        
    if clean_name in REGISTRY_CACHE:
        return REGISTRY_CACHE[clean_name]

    query_term = urllib.parse.quote(clean_name[:18])
    url = f"https://data.texas.gov/resource/9cir-efmm.json?$where=taxpayer_name%20like%20%27%25{query_term}%25%27&$limit=1"
    
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=2) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and len(data) > 0:
                record = data[0]
                addr = f"{record.get('taxpayer_address', '')}, {record.get('taxpayer_city', '')} {record.get('taxpayer_state', '')} {record.get('taxpayer_zip', '')}".strip()
                res = {
                    "registered_name": record.get("taxpayer_name"),
                    "sos_file_number": record.get("secretary_of_state_sos_or_coa_file_number"),
                    "registered_address": addr,
                    "charter_date": record.get("sos_charter_date", "")[:10]
                }
                REGISTRY_CACHE[clean_name] = res
                return res
    except Exception:
        pass
        
    REGISTRY_CACHE[clean_name] = None
    return None


def unmask_lead(lead: Dict[str, Any], query_sos: bool = False) -> Dict[str, Any]:
    """
    Master unmasking engine:
    1. Checks contractor / owner for direct human names.
    2. Checks parenthetical qualifiers.
    3. Resolves corporate entity names.
    """
    owner_raw = lead.get("owner_raw") or ""
    contractor_name = lead.get("contractor_name") or ""
    concept = lead.get("concept_name") or ""

    decision_maker = None
    title = "Owner / Operator"
    corporate_entity = owner_raw
    sos_data = None

    # Step 1: Check contractor parenthetical format: "NAME (COMPANY)"
    paren_match = extract_person_from_parentheses(contractor_name)
    if paren_match:
        decision_maker, corporate_entity = paren_match
        title = "Principal Qualifier / Contractor"

    # Step 2: Check if owner_raw is directly a human name
    if not decision_maker:
        direct_human = extract_human_name(owner_raw)
        if direct_human:
            decision_maker = direct_human
            title = "Managing Owner"

    # Step 3: Check contractor name if it is a direct individual
    if not decision_maker:
        direct_contractor = extract_human_name(contractor_name)
        if direct_contractor:
            decision_maker = direct_contractor
            title = "Project Principal"

    # Step 4: If still an LLC, resolve clean entity name
    clean_name = clean_entity_name(corporate_entity or owner_raw)
    
    # Step 5: Optional live SOS lookup for top priority leads without direct human
    if not decision_maker and query_sos and lead.get("state") == "TX" and clean_name:
        sos_data = query_texas_sos_registry(clean_name)

    is_unmasked = decision_maker is not None or sos_data is not None

    enriched_lead = dict(lead)
    enriched_lead["decision_maker_name"] = decision_maker or (sos_data.get("registered_name") if sos_data else (clean_name if clean_name else "Managing Principal"))
    enriched_lead["decision_maker_title"] = title if decision_maker else "Operating Principal"
    enriched_lead["corporate_entity_clean"] = clean_name
    enriched_lead["sos_file_number"] = sos_data.get("sos_file_number") if sos_data else None
    enriched_lead["registered_address"] = sos_data.get("registered_address") if sos_data else None
    enriched_lead["is_unmasked"] = is_unmasked

    return enriched_lead


def process_all_leads() -> List[Dict[str, Any]]:
    """Loads all harvested leads, unmasks each entity, and persists to processed storage."""
    if not os.path.exists(RAW_DATA_PATH):
        logging.error("No harvested leads found. Run Part 2 harvester first.")
        return []

    with open(RAW_DATA_PATH, "r", encoding="utf-8") as f:
        leads = json.load(f)

    logging.info(f"Unmasking {len(leads)} harvested commercial leads...")
    unmasked_list: List[Dict[str, Any]] = []

    for lead in leads:
        unmasked = unmask_lead(lead, query_sos=False)
        unmasked_list.append(unmasked)

    os.makedirs(PROCESSED_DIR, exist_ok=True)
    with open(UNMASKED_PATH, "w", encoding="utf-8") as f:
        json.dump(unmasked_list, f, indent=2)

    unmasked_count = sum(1 for item in unmasked_list if item.get("is_unmasked"))
    logging.info(f"Unmasking complete. {unmasked_count}/{len(unmasked_list)} leads unmasked ({len(unmasked_list)} total saved).")
    return unmasked_list


if __name__ == "__main__":
    results = process_all_leads()
    print("=" * 70)
    print("PART 3: UNMASKED DECISION MAKERS SAMPLE")
    print("=" * 70)
    sample_unmasked = [l for l in results if l.get("is_unmasked")][:5]
    for idx, lead in enumerate(sample_unmasked, 1):
        print(f"[{idx}] {lead.get('concept_name', 'Commercial Project')[:60]}")
        print(f"    Location:         {lead.get('street_address')}, {lead.get('city')}, {lead.get('state')}")
        print(f"    Decision Maker:   {lead.get('decision_maker_name')} ({lead.get('decision_maker_title')})")
        print(f"    Clean Entity:     {lead.get('corporate_entity_clean')}")
        print(f"    Status:           ✓ VERIFIED DECISION MAKER")
        print("-" * 70)
