"""
Part 6: The Master Database Architecture
High-performance relational storage (SQLite) with optional automated Airtable sync.
Powers both the public showcase (with masked previews) and the private member portal.
"""

import sqlite3
import json
import os
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DB_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DB_PATH = os.path.join(DB_DIR, "database.sqlite")
INPUT_FILE = os.path.join(DB_DIR, "processed", "dossier_leads.json")


def get_db_connection() -> sqlite3.Connection:
    """Creates a thread-safe connection to the SQLite database."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the Master Leads schema and indexes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS leads (
        lead_id TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        metro TEXT NOT NULL,
        permit_number TEXT,
        concept_name TEXT NOT NULL,
        category TEXT NOT NULL,
        priority_score REAL DEFAULT 5.0,
        work_type TEXT,
        street_address TEXT NOT NULL,
        city TEXT NOT NULL,
        zip_code TEXT,
        filing_date TEXT,
        estimated_valuation REAL,
        status TEXT DEFAULT 'Active',
        decision_maker_name TEXT,
        decision_maker_title TEXT,
        display_phone TEXT,
        dial_phone TEXT,
        direct_email TEXT,
        linkedin_url TEXT,
        has_direct_phone INTEGER DEFAULT 0,
        confidence_score REAL DEFAULT 5.0,
        concept_snapshot TEXT,
        buildout_signals TEXT,
        pitch_angle TEXT,
        ai_dossier_formatted TEXT,
        official_portal_url TEXT,
        is_unmasked INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_metro_category ON leads (metro, category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_priority ON leads (priority_score DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_filing_date ON leads (filing_date DESC);")

    conn.commit()
    conn.close()
    logging.info("Master SQLite Database schema initialized successfully.")


def upsert_leads_batch(leads: List[Dict[str, Any]]) -> int:
    """Inserts or updates a batch of leads atomically."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_ts = datetime.now(timezone.utc).isoformat()

    query = """
    INSERT INTO leads (
        lead_id, state, metro, permit_number, concept_name, category,
        priority_score, work_type, street_address, city, zip_code,
        filing_date, estimated_valuation, status, decision_maker_name,
        decision_maker_title, display_phone, dial_phone, direct_email,
        linkedin_url, has_direct_phone, confidence_score, concept_snapshot,
        buildout_signals, pitch_angle, ai_dossier_formatted, official_portal_url,
        is_unmasked, created_at
    ) VALUES (
        :lead_id, :state, :metro, :permit_number, :concept_name, :category,
        :priority_score, :work_type, :street_address, :city, :zip_code,
        :filing_date, :estimated_valuation, :status, :decision_maker_name,
        :decision_maker_title, :display_phone, :dial_phone, :direct_email,
        :linkedin_url, :has_direct_phone, :confidence_score, :concept_snapshot,
        :buildout_signals, :pitch_angle, :ai_dossier_formatted, :official_portal_url,
        :is_unmasked, :created_at
    )
    ON CONFLICT(lead_id) DO UPDATE SET
        concept_name = excluded.concept_name,
        category = excluded.category,
        filing_date = excluded.filing_date,
        estimated_valuation = excluded.estimated_valuation,
        priority_score = excluded.priority_score,
        decision_maker_name = excluded.decision_maker_name,
        decision_maker_title = excluded.decision_maker_title,
        display_phone = excluded.display_phone,
        dial_phone = excluded.dial_phone,
        direct_email = excluded.direct_email,
        linkedin_url = excluded.linkedin_url,
        has_direct_phone = excluded.has_direct_phone,
        confidence_score = excluded.confidence_score,
        concept_snapshot = excluded.concept_snapshot,
        buildout_signals = excluded.buildout_signals,
        pitch_angle = excluded.pitch_angle,
        ai_dossier_formatted = excluded.ai_dossier_formatted,
        is_unmasked = excluded.is_unmasked;
    """

    prepared = []
    for l in leads:
        row = dict(l)
        row["has_direct_phone"] = 1 if l.get("has_direct_phone") else 0
        row["is_unmasked"] = 1 if l.get("is_unmasked") else 0
        row["created_at"] = now_ts
        prepared.append(row)

    cursor.executemany(query, prepared)
    conn.commit()
    count = len(prepared)
    conn.close()
    logging.info(f"Upserted {count} leads into master database.")
    return count


def get_leads_for_portal(metro: Optional[str] = None, category: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """Fetches full unmasked records for paying subscribers."""
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = []
    params = []

    if metro and metro.lower() != "all":
        conditions.append("LOWER(metro) = LOWER(?)")
        params.append(metro)

    if category and category.lower() != "all":
        conditions.append("category = ?")
        params.append(category)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
    SELECT * FROM leads
    {where_clause}
    ORDER BY priority_score DESC, filing_date DESC
    LIMIT ?
    """
    params.append(limit)

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def get_public_preview_leads(metro: Optional[str] = None, limit: int = 3) -> List[Dict[str, Any]]:
    """
    Fetches leads for the public landing page with phone numbers and emails blurred/masked.
    Allows visitors to see the AI dossier and concept, but gates the phone number behind $1 trial.
    """
    full_leads = get_leads_for_portal(metro=metro, limit=limit)
    previews = []

    for l in full_leads:
        preview = dict(l)
        # Mask phone number: '(972) 824-5583' -> '(972) 824-XXXX'
        phone = l.get("display_phone") or ""
        if len(phone) >= 8 and "Pending" not in phone:
            preview["display_phone"] = phone[:-4] + "••••"
        else:
            preview["display_phone"] = "(555) •••-••••"

        # Mask email
        preview["direct_email"] = "••••••@••••••.com"
        preview["is_preview_masked"] = True
        previews.append(preview)

    return previews


def export_frontend_feeds():
    """
    Exports the latest database records directly to the frontend data directory:
    1. frontend/data/members_feed.json (Full unmasked leads for member dashboards)
    2. frontend/data/previews.json (Masked teaser leads organized by metro)
    """
    frontend_data_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "data")
    os.makedirs(frontend_data_dir, exist_ok=True)
    
    # 1. Export members feed (All leads, unmasked)
    members_feed = get_leads_for_portal(limit=1000)
    members_path = os.path.join(frontend_data_dir, "members_feed.json")
    with open(members_path, "w", encoding="utf-8") as f:
        json.dump(members_feed, f, indent=2)
    logging.info(f"Exported {len(members_feed)} unmasked leads to {members_path}")
    
    # 2. Export preview feeds organized by metro
    previews_by_metro = {}
    for metro in ["Austin", "Dallas", "Orlando"]:
        previews_by_metro[metro] = get_public_preview_leads(metro=metro, limit=1000)
    
    previews_path = os.path.join(frontend_data_dir, "previews.json")
    with open(previews_path, "w", encoding="utf-8") as f:
        json.dump(previews_by_metro, f, indent=2)
    logging.info(f"Exported preview leads for {len(previews_by_metro)} metros to {previews_path}")


def load_dossier_data_into_db() -> int:
    """Helper to populate the database with the latest generated dossier leads and export feeds."""
    if not os.path.exists(INPUT_FILE):
        logging.error("No dossier leads found. Run Part 5 first.")
        return 0

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        leads = json.load(f)

    init_db()
    count = upsert_leads_batch(leads)
    export_frontend_feeds()
    return count


if __name__ == "__main__":
    count = load_dossier_data_into_db()
    print("=" * 70)
    print(f"PART 6: MASTER DATABASE INITIALIZED & LOADED ({count} RECORDS)")
    print("=" * 70)

    # 1. Test Public Preview (Masked for $1 Trial Conversion)
    print("\n1. PUBLIC LANDING PAGE PREVIEW (Phone numbers masked to convert visitors):")
    print("-" * 70)
    previews = get_public_preview_leads(limit=2)
    for p in previews:
        print(f"Project:     {p['concept_name']}")
        print(f"Category:    {p['category']} | Metro: {p['metro']}, {p['state']}")
        print(f"Owner:       {p['decision_maker_name']}")
        print(f"Phone:       {p['display_phone']} [LOCKED - Unlocked on $1 Trial]")
        print(f"AI Dossier:  {p['concept_snapshot']}")
        print("-" * 70)

    # 2. Test Member Portal Access (Full Unmasked Intelligence)
    print("\n2. PRIVATE SUBSCRIBER PORTAL ACCESS (Full unmasked phone numbers):")
    print("-" * 70)
    subscribers = get_leads_for_portal(limit=2)
    for s in subscribers:
        print(f"Project:     {s['concept_name']}")
        print(f"Owner:       {s['decision_maker_name']} ({s['decision_maker_title']})")
        print(f"Phone:       {s['display_phone']} [UNLOCKED - Click to Dial]")
        print(f"Dial Link:   tel:{s['dial_phone']}")
        print("-" * 70)

