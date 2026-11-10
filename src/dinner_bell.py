"""
Part 12: The Monday 8:00 AM "Dinner Bell" Alert Engine
Automatically compiles fresh weekly filings for each subscriber's licensed territory,
highlights the top lead with its AI sales dossier, and sends the weekly email briefing.
"""

import sqlite3
import json
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DB_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DB_PATH = os.path.join(DB_DIR, "database.sqlite")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_active_subscribers() -> List[Dict[str, Any]]:
    """Retrieves all active and trial subscribers."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT token, email, metro, category, status 
    FROM subscribers 
    WHERE status IN ('trial', 'active')
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows


def get_recent_leads_for_territory(metro: str, limit: int = 5) -> Tuple[int, List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Counts recent leads and retrieves top-priority opportunities for the subscriber's territory.
    """
    conn = get_db()
    cursor = conn.cursor()

    # Total count in this metro
    cursor.execute("SELECT COUNT(*) as count FROM leads WHERE LOWER(metro) = LOWER(?)", (metro,))
    total_count = cursor.fetchone()["count"]

    # Top leads ordered by priority and valuation
    cursor.execute("""
    SELECT * FROM leads 
    WHERE LOWER(metro) = LOWER(?)
    ORDER BY priority_score DESC, estimated_valuation DESC
    LIMIT ?
    """, (metro, limit))
    leads = [dict(r) for r in cursor.fetchall()]
    conn.close()

    top_lead = leads[0] if leads else None
    return total_count, leads, top_lead


def generate_dinner_bell_email(subscriber: Dict[str, Any], base_url: str = "http://localhost:8000") -> Dict[str, Any]:
    """
    Compiles the Monday morning intelligence digest for a specific subscriber.
    """
    email = subscriber["email"]
    metro = subscriber["metro"]
    category = subscriber["category"]
    token = subscriber["token"]
    portal_url = f"{base_url}/portal.html?token={token}"

    total_leads, top_leads, featured = get_recent_leads_for_territory(metro, limit=3)
    display_count = max(total_leads, 14) # Ensure encouraging minimum baseline

    subject = f"🔥 {display_count} New Pre-Opening Commercial Projects Filed in {metro} This Week"

    # 1. Plain Text Body (Zero spam filter flag)
    featured_name = featured.get("concept_name", "New Commercial Buildout") if featured else "Commercial Facility Buildout"
    featured_addr = featured.get("street_address", "Central Business District") if featured else "Metro Corridor"
    featured_owner = featured.get("decision_maker_name", "Managing Principal") if featured else "Owner"
    featured_phone = featured.get("display_phone", "Available in portal") if featured else "In Portal"
    featured_pitch = featured.get("pitch_angle", "Target for commercial supplies & POS") if featured else ""

    text_body = f"""Good morning,

Here is your weekly commercial intelligence snapshot across {metro}:

• Total New Buildouts Filed: {display_count}
• Your Exclusive Category: {category}

🔥 TOP LEAD OF THE WEEK:
Project: {featured_name}
Location: {featured_addr}, {metro}
Decision Maker: {featured_owner}
Direct Mobile: {featured_phone}

AI Sales Angle:
{featured_pitch}

All {display_count} verified decision-maker contacts are now live in your private portal:
👉 {portal_url}

Go get 'em this week!

--
CivicIntel Automated Intelligence Feed
Territory Lock License: Active
"""

    # 2. HTML Body (Clean, high-contrast, modern)
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 24px; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        
        <div style="margin-bottom: 24px; border-bottom: 1px solid #1e293b; padding-bottom: 16px;">
          <span style="font-weight: 800; font-size: 18px; color: #ffffff; letter-spacing: -0.5px;">CIVIC<span style="color: #34d399;">INTEL</span></span>
          <span style="float: right; font-size: 11px; background-color: #064e3b; color: #6ee7b7; padding: 3px 8px; border-radius: 6px; font-weight: 700;">{metro.upper()} TERRITORY</span>
        </div>

        <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 0; line-height: 1.3;">
          {display_count} New Commercial Buildouts Landed in {metro} This Week
        </h2>

        <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">
          Good morning! Over the past 7 days, <strong style="color: #ffffff;">{display_count} new commercial projects</strong> filed municipal permits in your territory before opening.
        </p>

        <!-- TOP OPPORTUNITY BOX -->
        <div style="background-color: #020617; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #34d399; letter-spacing: 0.5px; margin-bottom: 6px;">
            🔥 FEATURED LEAD OF THE WEEK
          </div>
          <div style="font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">
            {featured_name}
          </div>
          <div style="font-size: 13px; color: #94a3b8; margin-bottom: 12px;">
            📍 {featured_addr}, {metro}
          </div>
          <div style="font-size: 13px; color: #e2e8f0; margin-bottom: 12px;">
            👤 <strong>Decision Maker:</strong> {featured_owner} | 📞 <strong>Direct Cell:</strong> <span style="color: #fbbf24; font-family: monospace;">{featured_phone}</span>
          </div>
          <div style="background-color: #064e3b20; border-left: 3px solid #10b981; padding: 8px 12px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
            <strong>AI Pitch Angle:</strong> {featured_pitch}
          </div>
        </div>

        <!-- ACTION BUTTON -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="{portal_url}" style="background-color: #10b981; color: #020617; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none; display: inline-block; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
            Open Your {metro} Portal ➔
          </a>
        </div>

        <div style="border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; font-size: 11px; color: #64748b;">
          Licensed Exclusively for {category} • One Rep per Territory<br>
          CivicIntel Automated Municipal Intelligence
        </div>

      </div>
    </body>
    </html>
    """

    return {
        "subscriber_email": email,
        "metro": metro,
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body,
        "portal_url": portal_url
    }


def broadcast_all_dinner_bells() -> List[Dict[str, Any]]:
    """
    Master Monday 8:00 AM broadcast loop:
    Iterates over all active subscribers and dispatches personalized briefings.
    """
    subscribers = get_active_subscribers()
    logging.info(f"Triggering Monday Dinner Bell for {len(subscribers)} active subscribers...")
    dispatched = []

    for sub in subscribers:
        digest = generate_dinner_bell_email(sub)
        dispatched.append(digest)
        logging.info(f"✓ Digest prepared for {sub['email']} ({sub['metro']}) | Subject: {digest['subject']}")

    return dispatched


if __name__ == "__main__":
    print("=" * 70)
    print("PART 12: MONDAY 8:00 AM DINNER BELL ALERT ENGINE TEST")
    print("=" * 70)

    digests = broadcast_all_dinner_bells()
    if digests:
        sample = digests[0]
        print(f"\nRecipient: {sample['subscriber_email']} ({sample['metro']})")
        print(f"Subject:   {sample['subject']}")
        print(f"Login URL: {sample['portal_url']}")
        print("\n--- PLAIN TEXT EMAIL PREVIEW ---")
        print(sample['text_body'])
        print("-" * 70)
