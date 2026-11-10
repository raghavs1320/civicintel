"""
Part 10: The Token Access Gate & Territory Locking System
Manages cryptographically secure passwordless tokens and enforces category exclusivity per city.
"""

import sqlite3
import secrets
import hashlib
import json
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DB_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DB_PATH = os.path.join(DB_DIR, "database.sqlite")
TOKENS_EXPORT_PATH = os.path.join(os.path.dirname(__file__), "..", "frontend", "data", "tokens.json")


def get_db():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_subscribers_table():
    """Initializes the subscriber and territory exclusivity tables."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subscribers (
        token TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        metro TEXT NOT NULL,
        category TEXT NOT NULL,
        stripe_customer_id TEXT,
        status TEXT DEFAULT 'trial',
        trial_ends_at TEXT,
        created_at TEXT NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_territory ON subscribers (metro, category);")
    conn.commit()
    conn.close()
    logging.info("Subscribers and territory licensing schema initialized.")


def check_territory_availability(metro: str, category: str) -> Tuple[bool, Optional[str]]:
    """
    Enforces Category Exclusivity:
    Returns (True, None) if the category in this metro is open.
    Returns (False, licensee_email) if the category is already locked by a competitor.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT email FROM subscribers 
    WHERE LOWER(metro) = LOWER(?) 
      AND LOWER(category) = LOWER(?) 
      AND status IN ('trial', 'active')
    LIMIT 1;
    """, (metro, category))
    row = cursor.fetchone()
    conn.close()

    if row:
        return False, row["email"]
    return True, None


def issue_subscriber_token(
    email: str,
    metro: str,
    category: str,
    stripe_customer_id: Optional[str] = None,
    trial_days: int = 7
) -> str:
    """
    Issues a passwordless magic token for a new subscriber.
    Automatically locks their territory and sets trial expiration.
    """
    init_subscribers_table()

    # Generate cryptographically secure token: tok_live_...
    token = f"tok_live_{secrets.token_urlsafe(24)}"
    now = datetime.now(timezone.utc)
    trial_ends = (now + timedelta(days=trial_days)).isoformat()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO subscribers (
        token, email, metro, category, stripe_customer_id, status, trial_ends_at, created_at
    ) VALUES (?, ?, ?, ?, ?, 'trial', ?, ?)
    """, (token, email.lower().strip(), metro.strip(), category.strip(), stripe_customer_id, trial_ends, now.isoformat()))
    conn.commit()
    conn.close()

    logging.info(f"Token issued: {email} | Territory: {metro} ({category}) | Trial ends: {trial_ends[:10]}")
    sync_tokens_export()
    return token


def validate_token(token: str) -> Optional[Dict[str, Any]]:
    """Validates an access token and returns subscriber profile if active."""
    if not token:
        return None
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT token, email, metro, category, status, trial_ends_at 
    FROM subscribers 
    WHERE token = ? AND status IN ('trial', 'active')
    """, (token,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None


def sync_tokens_export():
    """Exports active tokens to frontend/data/tokens.json for client-side authentication."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT token, email, metro, category, status FROM subscribers WHERE status IN ('trial', 'active')")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    tokens_map = {
        r["token"]: {
            "email": r["email"],
            "metro": r["metro"],
            "category": r["category"],
            "status": r["status"]
        } for r in rows
    }

    os.makedirs(os.path.dirname(TOKENS_EXPORT_PATH), exist_ok=True)
    with open(TOKENS_EXPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(tokens_map, f, indent=2)


if __name__ == "__main__":
    init_subscribers_table()

    # Test Territory Check
    open_status, licensee = check_territory_availability("Austin", "POS Systems")
    print("=" * 70)
    print("PART 10: TOKEN ACCESS GATE & TERRITORY LOCKING TEST")
    print("=" * 70)
    print(f"Checking Territory [Austin, POS Systems]: {'Available' if open_status else 'Locked'}")

    # Issue demo token for testing
    demo_token = issue_subscriber_token(
        email="john.rep@toasttab.com",
        metro="Austin",
        category="Point-of-Sale (POS)",
        stripe_customer_id="cus_demo_toast_123"
    )

    print(f"\n✓ Demo Token Created: {demo_token}")
    print(f"✓ Member Access URL:  portal.html?token={demo_token}")

    # Validate Territory is now locked for competitors
    recheck_status, current_owner = check_territory_availability("Austin", "Point-of-Sale (POS)")
    print(f"\nRe-checking Territory [Austin, Point-of-Sale (POS)]:")
    print(f"Status:               {'Available' if recheck_status else '🔒 LOCKED'}")
    print(f"Licensed Exclusively To: {current_owner}")
    print("-" * 70)

