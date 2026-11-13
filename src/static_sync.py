"""
Static Site Pre-Renderer & Synchronizer (SSG Engine)
Bakes real-time permit counts, newest docket filings, and instant-paint preview
cards directly into static HTML files during daily harvest pipeline execution.
Ensures 0ms first-contentful-paint with zero client-side delay or layout shifts.
"""

import os
import json
import re
from datetime import datetime, timezone

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")
DATA_DIR = os.path.join(FRONTEND_DIR, "data")
MEMBERS_FEED_FILE = os.path.join(DATA_DIR, "members_feed.json")
PREVIEWS_FILE = os.path.join(DATA_DIR, "previews.json")


def format_date_str(date_str: str) -> str:
    if not date_str or date_str == "Recent":
        return "Recent Filing"
    parts = str(date_str).strip().split("-")
    if len(parts) == 3:
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        try:
            m = int(parts[1]) - 1
            if 0 <= m < 12:
                return f"{months[m]} {int(parts[2])}, {parts[0]}"
        except ValueError:
            pass
    return str(date_str)


def clean_concept_name(name: str) -> str:
    if not name:
        return "Commercial Buildout"
    cleaned = re.sub(r"\s*\(.*?\)\s*", "", name)
    cleaned = re.sub(r"LLC\.?$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"Inc\.?$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"Corp\.?$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or "Commercial Buildout"


def format_category(cat: str) -> str:
    mapping = {
        "Hospitality & Dining": "Hospitality",
        "Retail & Commercial Buildout": "Retail",
        "Healthcare & Wellness": "Healthcare",
        "General Commercial": "Commercial",
        "Office & Professional Services": "Office",
        "Industrial & Warehouse": "Industrial"
    }
    return mapping.get(cat, cat or "Commercial")


def escape_html(val: str) -> str:
    if not val:
        return ""
    return (
        str(val)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#039;")
    )


def get_comparable_date(lead: dict) -> str:
    d = lead.get("filing_date")
    if not d or d == "Recent":
        created = lead.get("created_at") or ""
        return created[:10] if len(created) >= 10 else "2099-12-31"
    return str(d).strip()


def build_prerendered_cards_html(leads: list, metro: str, total_count: int) -> str:
    """Pre-renders top 10 preview cards for instant 0ms first paint on index.html."""
    state_code = "FL" if metro == "Orlando" else "TX"
    cards_html = []

    for lead in leads[:10]:
        val = lead.get("estimated_valuation")
        val_text = f"${int(val):,}" if val else "Undisclosed"
        f_date = lead.get("filing_date")
        date_formatted = format_date_str(f_date)
        title = clean_concept_name(lead.get("concept_name") or "")
        cat_label = format_category(lead.get("category") or "")
        scope = lead.get("project_description") or lead.get("scope_of_work") or lead.get("concept_snapshot") or ""
        scope_text = scope[:280] + ("..." if len(scope) > 280 else "") if scope else ""

        scope_box = (
            f'<div class="bg-slate-50 rounded-xl px-3.5 py-2.5 mb-3">'
            f'<div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Permit Scope</div>'
            f'<div class="text-xs text-slate-700 leading-relaxed">{escape_html(scope_text)}</div>'
            f'</div>'
            if scope_text else ""
        )

        val_span = f'<span class="font-bold text-slate-800">{val_text}</span>' if val_text != "Undisclosed" else ""
        permit_num = escape_html(lead.get("permit_number") or "MUNI")
        street = escape_html(lead.get("street_address") or "")

        card = (
            f'<div class="lead-card bg-white border border-slate-200 rounded-2xl p-5">'
            f'<div class="flex items-start justify-between gap-3 mb-3">'
            f'<div class="flex-1 min-w-0">'
            f'<div class="font-bold text-slate-900 text-base leading-snug truncate">{escape_html(title)}</div>'
            f'<div class="text-xs text-slate-500 mt-0.5 truncate">{street}, {state_code}</div>'
            f'</div>'
            f'<span class="mono text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md whitespace-nowrap flex-shrink-0">'
            f'{escape_html(cat_label)}'
            f'</span>'
            f'</div>'
            f'{scope_box}'
            f'<div class="flex items-center justify-between pt-3 border-t border-slate-100">'
            f'<div class="flex items-center space-x-3 text-[11px] text-slate-500 mono">'
            f'{val_span}'
            f'<span>#{permit_num}</span>'
            f'<span>Filed {escape_html(date_formatted)}<span class="mono text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded ml-1.5">NEW</span></span>'
            f'</div>'
            f'<button onclick="goToPersonalizedCheckout()" class="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap">'
            f'View Territory'
            f'</button>'
            f'</div>'
            f'</div>'
        )
        cards_html.append(card)

    cards_block = '<div class="space-y-3">' + "".join(cards_html) + '</div>'

    # Overflow banner
    hidden = max(0, total_count - 10)
    overflow_block = ""
    if hidden > 0:
        overflow_block = (
            f'<div class="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center mt-4">'
            f'<div class="max-w-lg mx-auto">'
            f'<div class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mono">Preview Limited to 10 Records</div>'
            f'<h3 class="text-xl font-bold text-slate-900 mb-2">'
            f'{hidden} additional buildouts in {metro}, {state_code} not shown'
            f'</h3>'
            f'<p class="text-sm text-slate-600 leading-relaxed mb-5">'
            f'Full access includes all {total_count} active permit records with jobsite addresses, contractor names, project budgets, and CSV export. New permits are indexed every morning from official city hall dockets.'
            f'</p>'
            f'<button onclick="goToPersonalizedCheckout()" class="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-3 rounded-lg transition cursor-pointer">'
            f'Check Territory Availability'
            f'</button>'
            f'<div class="mt-4 flex items-center justify-center space-x-4 text-[11px] text-slate-400 mono">'
            f'<span>Official municipal records</span>'
            f'<span>·</span>'
            f'<span>One licensee per industry</span>'
            f'<span>·</span>'
            f'<span>7-day trial for $1</span>'
            f'</div>'
            f'</div>'
            f'</div>'
        )

    return cards_block + overflow_block


def sync_static_site() -> dict:
    """
    Reads the latest data files and compiles live metrics and pre-rendered
    DOM components directly into index.html, checkout.html, and portal.html.
    """
    if not os.path.exists(MEMBERS_FEED_FILE) or not os.path.exists(PREVIEWS_FILE):
        return {"status": "SKIPPED", "reason": "Data files missing"}

    with open(MEMBERS_FEED_FILE, "r", encoding="utf-8") as f:
        members_feed = json.load(f)

    with open(PREVIEWS_FILE, "r", encoding="utf-8") as f:
        previews = json.load(f)

    total_leads = len(members_feed)
    austin_leads = previews.get("Austin", [])
    dallas_leads = previews.get("Dallas", [])
    orlando_leads = previews.get("Orlando", [])

    # Sort Austin leads descending by newest filing date
    austin_sorted = sorted(austin_leads, key=get_comparable_date, reverse=True)

    # Determine latest filing date across all leads
    latest_date_str = ""
    for l in members_feed:
        fd = l.get("filing_date")
        if fd and fd != "Recent" and fd > latest_date_str:
            latest_date_str = fd

    latest_formatted = format_date_str(latest_date_str) if latest_date_str else "Today"

    # 1. Update frontend/index.html
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            index_content = f.read()

        # Update hero badge
        index_content = re.sub(
            r'<span id="hero-live-badge"[^>]*>.*?</span>',
            f'<span id="hero-live-badge" class="text-xs font-semibold text-slate-500 tracking-wide uppercase">Municipal dockets indexed daily — {total_leads} active permits across Austin, Dallas &amp; Orlando · Latest: {latest_formatted}</span>',
            index_content
        )

        # Update leads section subtitle
        index_content = re.sub(
            r'<p class="text-sm text-slate-500 mt-1.5" id="leads-subtitle">.*?</p>',
            f'<p class="text-sm text-slate-500 mt-1.5" id="leads-subtitle">Real businesses currently under construction across our three covered markets. Latest filing indexed {latest_formatted} across {total_leads} active buildouts.</p>',
            index_content
        )

        # Update city button badges
        index_content = re.sub(
            r'data-metro="Austin">\s*Austin, TX <span class="opacity-60 ml-1">\(\d+\)</span>',
            f'data-metro="Austin">\n            Austin, TX <span class="opacity-60 ml-1">({len(austin_leads)})</span>',
            index_content
        )
        index_content = re.sub(
            r'data-metro="Dallas">\s*Dallas, TX <span class="opacity-60 ml-1">\(\d+\)</span>',
            f'data-metro="Dallas">\n            Dallas, TX <span class="opacity-60 ml-1">({len(dallas_leads)})</span>',
            index_content
        )
        index_content = re.sub(
            r'data-metro="Orlando">\s*Orlando, FL <span class="opacity-60 ml-1">\(\d+\)</span>',
            f'data-metro="Orlando">\n            Orlando, FL <span class="opacity-60 ml-1">({len(orlando_leads)})</span>',
            index_content
        )

        # Update summary strip counters
        index_content = re.sub(
            r'<strong class="text-slate-800" id="matched-lead-count">\d+</strong>',
            f'<strong class="text-slate-800" id="matched-lead-count">{len(austin_leads)}</strong>',
            index_content
        )

        # Pre-render top 10 Austin preview cards into #leads-container for instant first paint
        prerendered_cards = build_prerendered_cards_html(austin_sorted, "Austin", len(austin_leads))
        container_pattern = r'(<div id="leads-container" class="space-y-3">).*?(</div>\s*</section>)'
        # Replace contents inside leads-container
        if '<div id="leads-container" class="space-y-3">' in index_content:
            before_cont, after_cont = index_content.split('<div id="leads-container" class="space-y-3">', 1)
            # Find the closing </section>
            if '</section>' in after_cont:
                _, rest_of_html = after_cont.split('</section>', 1)
                index_content = (
                    before_cont
                    + '<div id="leads-container" class="space-y-3">'
                    + prerendered_cards
                    + '</div>\n  </section>'
                    + rest_of_html
                )

        with open(index_path, "w", encoding="utf-8") as f:
            f.write(index_content)

    # 2. Update frontend/checkout.html
    checkout_path = os.path.join(FRONTEND_DIR, "checkout.html")
    if os.path.exists(checkout_path):
        with open(checkout_path, "r", encoding="utf-8") as f:
            checkout_content = f.read()

        checkout_content = re.sub(
            r'id="city-count-badge-Austin"[^>]*>\d+</span>',
            f'id="city-count-badge-Austin" class="mono text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">{len(austin_leads)}</span>',
            checkout_content
        )
        checkout_content = re.sub(
            r'id="city-count-badge-Dallas"[^>]*>\d+</span>',
            f'id="city-count-badge-Dallas" class="mono text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{len(dallas_leads)}</span>',
            checkout_content
        )
        checkout_content = re.sub(
            r'id="city-count-badge-Orlando"[^>]*>\d+</span>',
            f'id="city-count-badge-Orlando" class="mono text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{len(orlando_leads)}</span>',
            checkout_content
        )
        checkout_content = re.sub(
            r'id="city-lead-count-badge"[^>]*>\d+ permits indexed</span>',
            f'id="city-lead-count-badge" class="text-xs text-slate-400 mono">{len(austin_leads)} permits indexed</span>',
            checkout_content
        )

        with open(checkout_path, "w", encoding="utf-8") as f:
            f.write(checkout_content)

    # 3. Update frontend/portal.html static stats placeholders
    portal_path = os.path.join(FRONTEND_DIR, "portal.html")
    if os.path.exists(portal_path):
        with open(portal_path, "r", encoding="utf-8") as f:
            portal_content = f.read()

        portal_content = re.sub(
            r'<div id="stat-total"[^>]*>.*?</div>',
            f'<div id="stat-total" class="mono text-2xl font-bold text-slate-900">{total_leads}</div>',
            portal_content
        )
        portal_content = re.sub(
            r'<div id="stat-updated"[^>]*>.*?</div>',
            f'<div id="stat-updated" class="mono text-2xl font-bold text-slate-900">{latest_formatted}</div>',
            portal_content
        )

        with open(portal_path, "w", encoding="utf-8") as f:
            f.write(portal_content)

    return {
        "status": "SUCCESS",
        "total_leads": total_leads,
        "latest_filing_date": latest_formatted,
        "austin_leads": len(austin_leads),
        "dallas_leads": len(dallas_leads),
        "orlando_leads": len(orlando_leads)
    }


if __name__ == "__main__":
    res = sync_static_site()
    print("Static Site Synchronization Result:")
    print(json.dumps(res, indent=2))
