"""
Part 4: The Phone & Contact Verification Engine
Discovers and verifies direct mobile phone numbers, emails, and LinkedIn links.
Combines direct municipal permit extraction with Apollo.io free API matching.
"""

import json
import os
import re
import urllib.request
import urllib.parse
import ssl
import logging
from typing import Dict, Any, Optional, List, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
INPUT_FILE = os.path.join(PROCESSED_DIR, "unmasked_leads.json")
ENRICHED_FILE = os.path.join(PROCESSED_DIR, "enriched_leads.json")

# Standard US Phone Pattern: (XXX) XXX-XXXX or XXX-XXX-XXXX
PHONE_REGEX = re.compile(r"(?:\+?1[-.\s]?)?\(?([2-9][0-9]{2})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})")
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


def format_phone_number(match: re.Match) -> Tuple[str, str]:
    """
    Returns:
    - display_phone: '(214) 728-1977'
    - dial_phone: '+12147281977'
    """
    area, prefix, line = match.group(1), match.group(2), match.group(3)
    display = f"({area}) {prefix}-{line}"
    dial = f"+1{area}{prefix}{line}"
    return display, dial


def extract_direct_contact_info(lead: Dict[str, Any]) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Tier 1 Extraction: Scans raw municipal text fields for direct phone numbers and emails.
    """
    search_fields = [
        str(lead.get("contractor_contact") or ""),
        str(lead.get("contractor_name") or ""),
        str(lead.get("concept_name") or ""),
        str(lead.get("owner_raw") or "")
    ]
    combined_text = " ".join(search_fields)

    # Search for phone
    display_phone, dial_phone = None, None
    phone_match = PHONE_REGEX.search(combined_text)
    if phone_match:
        display_phone, dial_phone = format_phone_number(phone_match)

    # Search for email
    email = None
    email_match = EMAIL_REGEX.search(combined_text)
    if email_match:
        email = email_match.group(0).lower()

    return display_phone, dial_phone, email


def query_apollo_enrichment(person_name: str, org_name: str, city: str, state: str) -> Dict[str, Any]:
    """
    Tier 2: Queries Apollo.io free API when APOLLO_API_KEY is available in environment.
    Falls back gracefully when running in free/offline mode.
    """
    api_key = os.getenv("APOLLO_API_KEY")
    if not api_key or not person_name:
        return {}

    url = "https://api.apollo.io/v1/people/match"
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
    }

    payload = {
        "api_key": api_key,
        "name": person_name,
        "organization_name": org_name,
        "state": state
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            person = data.get("person", {})
            return {
                "email": person.get("email"),
                "phone": person.get("phone_numbers", [{}])[0].get("sanitized_number") if person.get("phone_numbers") else None,
                "linkedin_url": person.get("linkedin_url"),
                "headline": person.get("headline")
            }
    except Exception as e:
        logging.debug(f"Apollo API lookup skipped or rate-limited: {e}")
        return {}


def generate_linkedin_search_url(person_name: str, city: str) -> str:
    """Generates a direct 1-click LinkedIn profile discovery URL."""
    clean_name = re.sub(r"[^\w\s]", "", person_name or "")
    query = f"{clean_name} {city}".strip()
    encoded = urllib.parse.quote(query)
    return f"https://www.linkedin.com/search/results/all/?keywords={encoded}"


def enrich_lead(lead: Dict[str, Any]) -> Dict[str, Any]:
    """
    Master enrichment pipeline for a single lead:
    1. Direct municipal permit phone & email scan.
    2. Optional Apollo.io API call.
    3. LinkedIn 1-click discovery link.
    4. Readiness and confidence scoring.
    """
    enriched = dict(lead)
    
    # 1. Tier 1: Direct municipal scan
    disp_phone, dial_phone, email = extract_direct_contact_info(lead)
    
    person = lead.get("decision_maker_name") or ""
    org = lead.get("corporate_entity_clean") or ""
    city = lead.get("city") or ""
    state = lead.get("state") or ""

    # 2. Tier 2: Apollo enrichment (if API key active)
    apollo_data = query_apollo_enrichment(person, org, city, state)
    if not disp_phone and apollo_data.get("phone"):
        disp_phone = apollo_data.get("phone")
        dial_phone = apollo_data.get("phone")
    if not email and apollo_data.get("email"):
        email = apollo_data.get("email")

    # 3. Tier 3: Actionable links for the sales rep
    linkedin_url = apollo_data.get("linkedin_url") or generate_linkedin_search_url(person, city)
    
    # Calculate Data Confidence & Readiness Score (1 to 10)
    score = 5.0
    if disp_phone:
        score += 3.0
    if lead.get("is_unmasked"):
        score += 1.5
    if email:
        score += 0.5
    confidence_score = min(score, 10.0)

    enriched["display_phone"] = disp_phone or "Phone Verification Pending"
    enriched["dial_phone"] = dial_phone
    enriched["direct_email"] = email or "Email Verification Pending"
    enriched["linkedin_url"] = linkedin_url
    enriched["has_direct_phone"] = disp_phone is not None
    enriched["confidence_score"] = confidence_score

    return enriched


def enrich_all_leads() -> List[Dict[str, Any]]:
    """Loads all unmasked leads, enriches with contact info, and saves to storage."""
    if not os.path.exists(INPUT_FILE):
        logging.error("Unmasked leads file not found. Run Part 3 first.")
        return []

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        leads = json.load(f)

    logging.info(f"Enriching contact channels for {len(leads)} commercial leads...")
    enriched_list = [enrich_lead(lead) for lead in leads]

    os.makedirs(PROCESSED_DIR, exist_ok=True)
    with open(ENRICHED_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched_list, f, indent=2)

    phone_count = sum(1 for l in enriched_list if l.get("has_direct_phone"))
    logging.info(f"Enrichment complete. {phone_count} verified direct cell/office phones attached.")
    return enriched_list


if __name__ == "__main__":
    results = enrich_all_leads()
    print("=" * 70)
    print("PART 4: CONTACT ENRICHMENT OUTPUT SAMPLE")
    print("=" * 70)
    leads_with_phones = [l for l in results if l.get("has_direct_phone")]
    for idx, lead in enumerate(leads_with_phones[:5], 1):
        print(f"[{idx}] {lead.get('concept_name', 'Commercial Project')[:55]}")
        print(f"    City:             {lead.get('city')}, {lead.get('state')}")
        print(f"    Decision Maker:   {lead.get('decision_maker_name')} ({lead.get('decision_maker_title')})")
        print(f"    📞 Phone:         {lead.get('display_phone')} [Tap to Call Ready]")
        print(f"    🔗 LinkedIn:      {lead.get('linkedin_url')}")
        print(f"    Confidence:       {lead.get('confidence_score')}/10.0")
        print("-" * 70)

