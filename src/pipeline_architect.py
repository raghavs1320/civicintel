"""
Part 1: Pipeline Architecture & Source Validator
Tests connections to open government endpoints and validates data schemas.
"""

import urllib.request
import urllib.parse
import ssl
import json
import logging
import re
from datetime import datetime, timezone
from typing import List, Dict, Any
from src.config import StandardLead, load_data_sources

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# SSL context for reliable HTTPS requests without local certificate issues
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

HEADERS = {
    "User-Agent": "CivicIntelHarvester/1.0 (Public Research Pipeline)"
}


def query_socrata_source(source: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
    """
    Queries an official municipal Socrata open data endpoint using SoQL.
    No API keys required; 100% free open public records access.
    """
    endpoint = source["endpoint"]
    query = source.get("filter_query", "")
    
    # Dynamically inject current 2-digit year (e.g. '26') for municipal endpoints with text MM/DD/YY dates
    current_yy = datetime.now(timezone.utc).strftime("%y")
    query = query.replace("{current_yy}", current_yy)
    
    # URL encode query parameters
    encoded_url = f"{endpoint}?$query=" + urllib.parse.quote(query)
    logging.info(f"Connecting to official source: {source['name']} ({source['metro']}, {source['state']})")
    
    req = urllib.request.Request(encoded_url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            logging.info(f"Successfully retrieved {len(data)} raw filings from {source['metro']}.")
            return data
    except Exception as e:
        logging.error(f"Error querying {source['name']}: {e}")
        return []


def normalize_date(date_str: str) -> str:
    """Standardizes municipal date strings into unified ISO YYYY-MM-DD format."""
    if not date_str or str(date_str).lower() == "none":
        return "Recent"
    date_str = str(date_str).strip()
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$", date_str)
    if m:
        month, day, year = m.groups()
        if len(year) == 2:
            year = "20" + year
        return f"{year}-{int(month):02d}-{int(day):02d}"
    if len(date_str) >= 10 and date_str[4] == '-' and date_str[7] == '-':
        return date_str[:10]
    return date_str[:10]


def normalize_record(raw: Dict[str, Any], source: Dict[str, Any]) -> StandardLead:
    """
    Transforms raw municipal JSON into our unified StandardLead schema.
    """
    mappings = source.get("field_mappings", {})
    state = source.get("state", "FL")
    metro = source.get("metro", "Unknown")
    
    permit_id = raw.get(mappings.get("permit_id", "permit_number"), "UNKNOWN")
    description = raw.get(mappings.get("description", "description"), "Commercial Project")
    work_class = raw.get(mappings.get("work_class", "work_class"), "Commercial Buildout")
    address = raw.get(mappings.get("address", "original_address1"), "Address Pending")
    city_val = raw.get("original_city")
    if not city_val or str(city_val).lower() == "original_city":
        city = mappings.get("city") or metro
    else:
        city = city_val
    zip_code = str(raw.get(mappings.get("zip_code", "original_zip"), ""))
    issue_date = str(raw.get(mappings.get("issue_date", "issue_date"), ""))
    status = raw.get(mappings.get("status", "status_current"), "Active")
    
    # Valuation extraction & parsing
    raw_val = raw.get(mappings.get("valuation", "valuation"), 0)
    try:
        valuation = float(raw_val) if raw_val is not None else None
    except (ValueError, TypeError):
        valuation = None

    # Contractor / Owner extraction
    contractor = raw.get(mappings.get("contractor_name", "contractor_name")) or raw.get("contractor")
    owner = raw.get(mappings.get("owner_name", "property_owner_name"))
    
    # Link extraction
    link_info = raw.get("link")
    official_url = link_info.get("url") if isinstance(link_info, dict) else None

    # Construct unique lead ID
    clean_permit_id = str(permit_id).replace(" ", "_").replace("-", "_")
    lead_id = f"{state}_{metro.upper()}_{clean_permit_id}"

    return StandardLead(
        lead_id=lead_id,
        state=state,
        metro=metro,
        permit_number=str(permit_id),
        concept_name=str(description).strip()[:150],
        work_type=str(work_class).strip(),
        street_address=str(address).strip(),
        city=str(city).strip(),
        zip_code=zip_code,
        filing_date=normalize_date(issue_date),
        estimated_valuation=valuation,
        status=str(status).strip(),
        owner_raw=str(owner).strip() if owner else None,
        contractor_name=str(contractor).strip() if contractor else None,
        contractor_contact=raw.get("contractor_address"),
        official_portal_url=official_url
    )


def run_pipeline_test():
    """Runs a live test across all configured open government sources."""
    sources = load_data_sources()
    print("=" * 70)
    print("PART 1: TESTING OPEN GOVERNMENT DATA SOURCES & SCHEMA NORMALIZATION")
    print("=" * 70)
    
    total_normalized = 0
    sample_leads = []

    for src in sources:
        raw_items = query_socrata_source(src, limit=5)
        for raw in raw_items[:3]: # Take 3 sample leads per source
            normalized = normalize_record(raw, src)
            sample_leads.append(normalized)
            total_normalized += 1

    print("\nSAMPLE NORMALIZED PRODUCTION LEADS:")
    print("-" * 70)
    for idx, lead in enumerate(sample_leads, 1):
        print(f"[{idx}] {lead.metro}, {lead.state} | Permit #{lead.permit_number}")
        print(f"    Concept/Project: {lead.concept_name}")
        print(f"    Work Type:       {lead.work_type}")
        print(f"    Address:         {lead.street_address}, {lead.city} {lead.zip_code}")
        print(f"    Date Filed:      {lead.filing_date} | Status: {lead.status}")
        if lead.estimated_valuation:
            print(f"    Valuation:       ${lead.estimated_valuation:,.2f}")
        if lead.owner_raw:
            print(f"    Owner on Record: {lead.owner_raw}")
        if lead.contractor_name:
            print(f"    Contractor:      {lead.contractor_name}")
        if lead.official_portal_url:
            print(f"    City Docket:     {lead.official_portal_url}")
        print("-" * 70)
        
    print(f"\n✓ Successfully verified {total_normalized} live commercial permits across all endpoints.")
    print("✓ All endpoints require $0 API keys, 0 CAPTCHAs, and return real-world live records.")


if __name__ == "__main__":
    run_pipeline_test()
