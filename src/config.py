"""
Part 1: Government Data Source & Pipeline Architecture
Defines unified data models and configurations for open government permit endpoints.
"""

from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any, List
import json
import os

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "sources.json")

@dataclass
class StandardLead:
    """
    The Unified Lead Schema:
    Standardizes commercial permits across any city or state into a clean format.
    """
    lead_id: str                   # Composite unique ID: {state}_{city}_{permit_id}
    state: str                     # e.g., 'TX', 'FL'
    metro: str                     # e.g., 'Austin', 'Orlando', 'Dallas'
    permit_number: str             # Official municipal permit tracking code
    concept_name: str              # Extracted venue name or project description
    work_type: str                 # 'Tenant Improvement', 'New Construction', 'Remodel'
    street_address: str            # Physical jobsite address
    city: str                      # Municipality
    zip_code: str                  # Postal code
    filing_date: str               # ISO date of permit filing/issuance
    estimated_valuation: Optional[float] # Estimated buildout cost
    status: str                    # 'Active', 'In Review', 'Issued'
    owner_raw: Optional[str]       # Raw legal owner from municipal filing
    contractor_name: Optional[str] # General contractor
    contractor_contact: Optional[str] # Phone/address if provided in permit
    official_portal_url: Optional[str] # Direct link to city hall record

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def load_data_sources() -> List[Dict[str, Any]]:
    """Loads all active open government endpoints from configuration."""
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("sources", [])

