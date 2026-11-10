"""
Part 2: The Automated Data Harvester
Fetches raw public records from all configured municipal endpoints,
filters for high-value commercial buildouts (Hospitality, Retail, Healthcare),
deduplicates records, and saves clean structured leads to local storage.
"""

import json
import os
import re
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from src.config import StandardLead, load_data_sources
from src.pipeline_architect import query_socrata_source, normalize_record

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
HARVESTED_FILE = os.path.join(RAW_DATA_DIR, "harvested_leads.json")

# High-Intent Target Keywords
HOSPITALITY_KEYWORDS = [
    r"\brestaurant\b", r"\bbar\b", r"\blounge\b", r"\bcafe\b", r"\bcoffee\b",
    r"\bbakery\b", r"\bpizza\b", r"\bpizzeria\b", r"\bgrill\b", r"\bkitchen\b",
    r"\bbrewery\b", r"\bbrewing\b", r"\btavern\b", r"\bdining\b", r"\bbistro\b",
    r"\bpub\b", r"\bcantina\b", r"\bsushi\b", r"\bsteakhouse\b", r"\bhood\b",
    r"\bgrease\b", r"\bdraft\b", r"\btap\b", r"\bquick serve\b", r"\bfood\b"
]

HEALTHCARE_KEYWORDS = [
    r"\bdental\b", r"\bdentist\b", r"\bclinic\b", r"\bmedical\b", r"\bdoctor\b",
    r"\bwellness\b", r"\bspa\b", r"\bsalon\b", r"\bfitness\b", r"\bgym\b",
    r"\bpilates\b", r"\btherapy\b", r"\bmedspa\b", r"\boptometry\b", r"\bpharmacy\b"
]

COMMERCIAL_REMODEL_KEYWORDS = [
    r"\btenant improvement\b", r"\binterior remodel\b", r"\bbuildout\b",
    r"\bfinish out\b", r"\bfirst time finish\b", r"\bcommercial remodel\b",
    r"\bmulti-tenant\b", r"\bretail\b", r"\boutlet\b"
]

EXCLUSION_KEYWORDS = [
    r"\bsingle family\b", r"\bduplex\b", r"\btriplex\b", r"\bresidential\b",
    r"\bswimming pool\b", r"\bpool fence\b", r"\bstorage shed\b", r"\bpatio cover\b",
    r"\bdemolition of shed\b", r"\bcarport\b"
]


def classify_lead_category(text: str, work_type: str) -> Tuple[str, float]:
    """
    Analyzes project description and work type.
    Returns: (Category, PriorityScore: 1.0 to 10.0)
    """
    combined = f"{text} {work_type}".lower()

    # Check exclusions first
    for ex in EXCLUSION_KEYWORDS:
        if re.search(ex, combined):
            return "Excluded (Residential)", 0.0

    # 1. Hospitality & Dining (Highest B2B vendor value)
    for kw in HOSPITALITY_KEYWORDS:
        if re.search(kw, combined):
            return "Hospitality & Dining", 9.5

    # 2. Healthcare, Wellness & Fitness
    for kw in HEALTHCARE_KEYWORDS:
        if re.search(kw, combined):
            return "Healthcare & Wellness", 8.5

    # 3. Commercial Tenant Improvements & Retail Buildouts
    for kw in COMMERCIAL_REMODEL_KEYWORDS:
        if re.search(kw, combined):
            return "Retail & Commercial Buildout", 7.5

    # General Commercial Default
    return "General Commercial", 5.0


def is_high_value_lead(lead: StandardLead) -> bool:
    """
    Quality gate: Determines if a lead should be saved and presented to paying sales reps.
    """
    category, score = classify_lead_category(lead.concept_name, lead.work_type)
    
    # Immediately drop excluded residential permits
    if score == 0.0:
        return False

    # Hospitality and Healthcare are always high-priority
    if category in ["Hospitality & Dining", "Healthcare & Wellness"]:
        return True

    # High valuation commercial remodels (> $30,000)
    if lead.estimated_valuation and lead.estimated_valuation >= 30000:
        return True

    # Well-described tenant improvements
    if category == "Retail & Commercial Buildout":
        return True

    return False


def load_existing_harvested() -> Dict[str, Dict[str, Any]]:
    """Loads existing leads to prevent duplicates."""
    if not os.path.exists(HARVESTED_FILE):
        return {}
    try:
        with open(HARVESTED_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return {item["lead_id"]: item for item in data}
    except Exception as e:
        logging.warning(f"Could not read existing harvested file: {e}")
        return {}


def save_harvested_leads(leads: List[StandardLead]) -> int:
    """
    Deduplicates and stores harvested leads in local JSON storage.
    Returns count of newly added unique leads.
    """
    os.makedirs(RAW_DATA_DIR, exist_ok=True)
    existing = load_existing_harvested()
    initial_count = len(existing)

    for lead in leads:
        category, priority = classify_lead_category(lead.concept_name, lead.work_type)
        lead_dict = lead.to_dict()
        lead_dict["category"] = category
        lead_dict["priority_score"] = priority
        lead_dict["harvested_at"] = datetime.now(timezone.utc).isoformat()
        
        # Save or update existing
        existing[lead.lead_id] = lead_dict

    with open(HARVESTED_FILE, "w", encoding="utf-8") as f:
        json.dump(list(existing.values()), f, indent=2)

    new_count = len(existing) - initial_count
    return new_count


def run_harvest() -> List[StandardLead]:
    """
    Master harvest pipeline:
    1. Connects to all active municipal endpoints.
    2. Ingests raw filings.
    3. Filters for high-value commercial buildouts.
    4. Deduplicates against previously saved records.
    """
    sources = load_data_sources()
    logging.info(f"Initiating harvest across {len(sources)} municipal sources...")

    harvested: List[StandardLead] = []

    for src in sources:
        try:
            raw_records = query_socrata_source(src, limit=100)
            for raw in raw_records:
                normalized = normalize_record(raw, src)
                if is_high_value_lead(normalized):
                    harvested.append(normalized)
        except Exception as e:
            logging.error(f"Error harvesting source {src.get('name')}: {e}")

    new_added = save_harvested_leads(harvested)
    logging.info(f"Harvest complete. Found {len(harvested)} qualified leads ({new_added} brand new).")
    return harvested


if __name__ == "__main__":
    leads = run_harvest()
    print("=" * 70)
    print(f"HARVEST RESULTS: {len(leads)} High-Value Leads Extracted & Stored")
    print("=" * 70)
    for idx, lead in enumerate(leads[:5], 1):
        cat, score = classify_lead_category(lead.concept_name, lead.work_type)
        print(f"[{idx}] Category: {cat} (Score: {score})")
        print(f"    Permit: {lead.permit_number} | City: {lead.city}, {lead.state}")
        print(f"    Project: {lead.concept_name}")
        print(f"    Address: {lead.street_address}")
        if lead.estimated_valuation:
            print(f"    Valuation: ${lead.estimated_valuation:,.2f}")
        print("-" * 70)
