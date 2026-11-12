#!/usr/bin/env python3
"""
CivicIntel Project Memory & Conversation History Exporter
Parses the complete conversation transcript and generates comprehensive physical
documentation files in the repository for future AI models and developers.
"""

import json
import os
import re
from datetime import datetime

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCS_DIR = os.path.join(WORKSPACE_DIR, "docs")
TRANSCRIPT_SOURCE = "/Users/raghavsharma/.gemini/antigravity/brain/d044597a-159b-4f87-bfd4-c37812e2f290/.system_generated/logs/transcript_full.jsonl"
CONVERSATION_ID = "d044597a-159b-4f87-bfd4-c37812e2f290"

def sanitize_secrets(text: str) -> str:
    """Redacts sensitive API and personal access tokens to comply with security rules."""
    text = re.sub(r'ghp_[A-Za-z0-9]{20,}', '[REDACTED_GITHUB_TOKEN]', text)
    text = re.sub(r'vcp_[A-Za-z0-9]{20,}', '[REDACTED_VERCEL_TOKEN]', text)
    return text

def export_chat_transcript():
    print(f"Reading transcript from {TRANSCRIPT_SOURCE}...")
    if not os.path.exists(TRANSCRIPT_SOURCE):
        print("Transcript source not found, checking docs/raw_transcript_full.jsonl...")
        source = os.path.join(DOCS_DIR, "raw_transcript_full.jsonl")
    else:
        source = TRANSCRIPT_SOURCE

    # Also write a sanitized copy to docs/raw_transcript_full.jsonl
    raw_dest = os.path.join(DOCS_DIR, "raw_transcript_full.jsonl")
    with open(source, "r", encoding="utf-8") as f_in, open(raw_dest, "w", encoding="utf-8") as f_out:
        for line in f_in:
            f_out.write(sanitize_secrets(line))
    print(f"✓ Sanitized raw transcript written to {raw_dest}")

    with open(raw_dest, "r", encoding="utf-8") as f:
        lines = [json.loads(l) for l in f]

    turns = []
    current_turn = None

    for step in lines:
        stype = step.get("type")
        if stype == "USER_INPUT":
            if current_turn:
                turns.append(current_turn)
            current_turn = {
                "user": step,
                "model_steps": [],
                "tools": []
            }
        elif current_turn is not None:
            if stype == "PLANNER_RESPONSE":
                current_turn["model_steps"].append(step)
                for tc in step.get("tool_calls", []):
                    name = tc.get("name") or tc.get("tool_name") or "tool"
                    current_turn["tools"].append(name)

    if current_turn:
        turns.append(current_turn)

    out_path = os.path.join(DOCS_DIR, "CHAT_HISTORY_TRANSCRIPT.md")
    print(f"Writing {len(turns)} turns to {out_path}...")

    with open(out_path, "w", encoding="utf-8") as out:
        out.write("# CivicIntel: Complete Conversation History & Development Transcript\n\n")
        out.write(f"> **Archive Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
        out.write(f"> **Conversation ID:** `{CONVERSATION_ID}`\n")
        out.write(f"> **Total Interaction Turns:** {len(turns)}\n")
        out.write(f"> **Original Source:** `{TRANSCRIPT_SOURCE}`\n\n")
        out.write("This document records the complete chronological conversation history between the User and Antigravity, documenting every design decision, business iteration, architectural pivot, and engineering milestone from inception to full production deployment.\n\n---\n\n")

        for i, t in enumerate(turns):
            turn_num = i + 1
            u_step = t["user"]
            step_idx = u_step.get("step_index", "")
            created_at = u_step.get("created_at", "")
            user_content = u_step.get("content", "").strip()

            # Clean user tags
            clean_user = re.sub(r'</?USER_REQUEST>', '', user_content).strip()
            clean_user = re.sub(r'<ADDITIONAL_METADATA>.*?</ADDITIONAL_METADATA>', '', clean_user, flags=re.DOTALL).strip()
            clean_user = re.sub(r'<USER_SETTINGS_CHANGE>.*?</USER_SETTINGS_CHANGE>', '', clean_user, flags=re.DOTALL).strip()
            clean_user = sanitize_secrets(clean_user)

            # Find final model response
            final_response = ""
            for s in reversed(t["model_steps"]):
                c = s.get("content", "")
                if c:
                    final_response = sanitize_secrets(c.strip())
                    break

            out.write(f"## Turn {turn_num} • Step {step_idx} ({created_at})\n\n")
            out.write("### 👤 User Request:\n\n")
            out.write(f"{clean_user}\n\n")

            if t["tools"]:
                unique_tools = sorted(list(set(t["tools"])))
                tool_summary = ", ".join(f"`{tool}`" for tool in unique_tools)
                out.write(f"*Engineering Actions Executed ({len(t['tools'])} tool calls):* {tool_summary}\n\n")

            out.write("### 🤖 Antigravity Response:\n\n")
            if final_response:
                out.write(f"{final_response}\n\n")
            else:
                out.write("*(Engineering tasks and script executions processed)*\n\n")
            out.write("---\n\n")

    print(f"✓ Chat history transcript written successfully ({out_path})")


def export_project_context_and_vision():
    out_path = os.path.join(DOCS_DIR, "PROJECT_CONTEXT_AND_VISION.md")
    print(f"Writing Master Context & Vision to {out_path}...")

    content = """# CivicIntel Commercial Intelligence Systems: Master Architecture & Product Bible

> **Project Name:** CivicIntel Commercial Intelligence Systems  
> **Repository:** [https://github.com/raghavs1320/civicintel](https://github.com/raghavs1320/civicintel)  
> **Production App:** [https://civicintel-daas.vercel.app](https://civicintel-daas.vercel.app)  
> **Latest Deployment:** Vercel Edge Network (Auto-deploy on GitHub push)  
> **Data Infrastructure:** SQLite Relational Database + Daily Autonomous GitHub Actions  
> **Cost Profile:** $0 Upfront / $0 Infrastructure Spend (100% Free-Tier Architecture)  

---

## 1. Executive Summary & Brand Identity

**CivicIntel** is an enterprise pre-opening commercial permitting Data-as-a-Service (DaaS) platform. It monitors municipal government dockets (building permits, certificates of occupancy, and contractor filings) in real-time, extracts pre-opening commercial projects (restaurants, bars, retail stores, healthcare clinics, and corporate facilities), unmasks corporate shell LLCs to identify real human decision makers, enriches them with direct cell phone numbers, generates AI sales dossiers, and licenses this intelligence to B2B field sales representatives under a **strict category exclusivity lock**.

### Brand Rules (Mandatory for all future AI agents):
1. **Brand Name:** Strictly **CivicIntel Commercial Intelligence Systems** (or **CivicIntel**).
2. **Zero Personal Names:** Never expose personal names (e.g., "Raghav") in any customer-facing UI, metadata, HTML, or git commit user configs.
3. **Zero AI Emojis:** Strictly use professional vector SVG icons. No robotic emojis (🤖, 🚀, 💰, etc.).
4. **Visual Theme:** Clean, high-trust **enterprise light mode** (`bg-slate-50`, `bg-white`, crisp slate borders `border-slate-200`, and emerald accents `emerald-600`).
5. **Legal & Compliance:** Explicitly positioned under the Texas Public Information Act, Florida Sunshine Law, and US Freedom of Information Act (FOIA). 100% compliant B2B commercial prospecting data.

---

## 2. The Core Problem & Value Proposition

### The Problem in Commercial Sales:
In B2B territory sales (POS systems, food wholesale, commercial insurance, signage, commercial kitchen equipment, linens):
* Once a new restaurant or retail shop hangs a *"Coming Soon"* banner or opens its doors, **it is already too late**. 
* The POS system (Toast, Square) was contracted 90 days ago.
* The commercial kitchen stoves, grease traps, and walk-in coolers were ordered 120 days ago.
* The commercial property & liability insurance policy was signed before the lease was executed.
* Platforms like ZoomInfo, Apollo, and Google Maps only list businesses **after** they have already been operating for months.

### The CivicIntel Solution:
1. **90-Day Head Start:** Detects businesses at the municipal permit filing stage—months before physical construction is finished.
2. **LLC Unmasking:** Converts obscure shell filings like *"TX TACO VENTURES 2026 LLC"* into the real operating principal, managing partner, or general contractor.
3. **Direct Contact Discovery:** Matches verified corporate registry records to surface direct decision-maker cell phone numbers.
4. **AI Sales Dossiers:** Provides vendor sales reps with equipment requirements, estimated opening timelines, and tailored sales pitch angles.
5. **Category Exclusivity (1 Rep per Category per City):** Sales reps know their local direct competitor cannot purchase or receive the same leads.

---

## 3. Customer Segments & Sales Rep Personas

CivicIntel sells to 10 non-competing B2B territory vendor categories in each metropolitan area:

| # | Vendor Seat Category | Target Companies / Reps | What They Sell | Why Timing Matters |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Point-of-Sale (POS) Systems** | Toast, Clover, Square, Shift4, SpotOn reps | Touchscreen terminals, handhelds, kitchen display systems (KDS) | Must be cabled and configured 30–60 days before staff training. |
| **2** | **Food & Beverage Wholesale** | Sysco, US Foods, Gordon Food Service, Ben E. Keith | Meats, seafood, dry goods, produce distribution contracts | Exclusive primary vendor supply contracts signed during kitchen buildout. |
| **3** | **Commercial Insurance** | State Farm, Farmers, Travelers, independent brokers | General liability, workers' comp, commercial property | Landlords require proof of insurance before handing over buildout keys. |
| **4** | **Commercial Kitchen Equipment** | Restaurant depot dealers, Hobart, True Refrigeration | Ovens, walk-in coolers, ventilation hoods, fryers | Ordered during rough electrical and plumbing phase (months 2–4). |
| **5** | **Commercial Signage & Graphics** | FASTSIGNS, Signarama, local custom neon fabricators | Channel letter signs, exterior monument signs, window vinyl | City sign permits take 4–8 weeks; exterior signage needed before launch. |
| **6** | **Commercial Cleaning & Janitorial** | Post-construction cleaners, commercial janitorial franchises | Rough cleans, final turnover cleans, recurring nightly service | Needed immediately prior to municipal final inspection and certificate of occupancy. |
| **7** | **Waste & Dumpster Services** | Waste Management, Republic Services | Commercial dumpsters, grease trap pumping | Mandatory city health and environmental compliance requirement. |
| **8** | **Uniforms & Linen Services** | Cintas, Aramark, UniFirst territory reps | Chef coats, aprons, bar towels, floor mat leasing | Contracts signed 30 days before grand opening. |
| **9** | **Security & Audio/Visual** | ADT Commercial, local alarm and camera installers | IP cameras, burglar alarms, ceiling audio systems | Low-voltage cabling must be pulled before drywall installation. |
| **10** | **Merchant Working Capital** | Equipment leasing brokers, merchant cash advance agents | Buildout loans, equipment lease financing | Owners experience capital crunches in months 3–5 of construction. |

---

## 4. Monetization & Territory Exclusivity Economics

### The Model: "1 City = 10 Non-Competing Seats"
* In each city, there are exactly **10 exclusive seats** (1 per product category).
* A POS rep does not compete with an insurance broker; an insurance broker does not compete with a sign maker. They all sell non-competing goods to the exact same new businesses.
* **100% Exclusivity**: If a Toast rep buys the Austin POS seat, that card turns red (`SOLD OUT (Austin)`). No other POS vendor can buy Austin.

### Pricing Structure:
* **Entry / Trial:** **$1.00 for a 7-Day Full Access License** (Zero-friction impulse conversion).
* **Recurring:** **$199.00 / month per territory seat** (Auto-renews, cancel anytime).
* **Corporate Expense Sweet Spot:** $199/month sits comfortably below the standard $250.00 US corporate expense threshold that field sales reps can swipe without senior management approval.

### Revenue Unit Economics:
* **Per City Potential:** 10 seats × $199/mo = **$1,990 / month** ($23,880 / year per city).
* **Current 3 Metros (Austin, Dallas, Orlando):** 30 seats = **$5,970 / month** ($71,640 / year).
* **Expansion to 10 Metros (Houston, Miami, Atlanta, Phoenix, etc.):** 100 seats = **$19,900 / month MRR** ($238,800 / year).
* **Expansion to 25 Metros:** 250 seats = **$49,750 / month MRR** ($597,000 / year).
* **Gross Margins:** **>98%**. Municipal government data is free public FOIA records; GitHub Actions and Vercel hosting run on free-tier infrastructure.

---

## 5. Master Database Architecture & Data State

### Database Engine:
* SQLite 3 (`data/database.sqlite`), relational schema optimized for sub-millisecond local queries.
* Tables:
  1. `leads`: Primary repository of verified commercial projects.
  2. `subscribers`: Active territory license holders, tokens, assigned metros, and billing status.

### Current Verified Data Inventory (448 Commercial Leads):
* **Austin Metro, TX:** 71 verified projects (13 Hospitality/Dining, 52 Retail/Commercial, 6 Healthcare).
* **Dallas–Fort Worth, TX:** 187 verified projects ($199.18M pipeline, 9 verified direct mobile numbers, 10 Hospitality, 46 Retail, 7 Healthcare, 124 General Commercial).
* **Orlando Metro, FL:** 190 verified projects ($284.28M pipeline, 6 Hospitality, 3 Retail, 8 Healthcare, 173 General Commercial).
* **Total Master Pipeline Valuation:** **$483,471,248.11** across all 3 metros.
* **Current Month Filings (Nov 2026):** 189 filings.
* **Rolling 90-Day Pipeline (Aug–Nov 2026):** 261 filings.

### `leads` Table Schema:
```sql
CREATE TABLE IF NOT EXISTS leads (
    lead_id TEXT PRIMARY KEY,
    state TEXT,
    metro TEXT,
    permit_number TEXT UNIQUE,
    concept_name TEXT,
    category TEXT,
    priority_score REAL,
    work_type TEXT,
    street_address TEXT,
    city TEXT,
    zip_code TEXT,
    filing_date TEXT,
    estimated_valuation REAL,
    status TEXT,
    decision_maker_name TEXT,
    decision_maker_title TEXT,
    display_phone TEXT,
    dial_phone TEXT,
    direct_email TEXT,
    linkedin_url TEXT,
    has_direct_phone INTEGER,
    confidence_score REAL,
    concept_snapshot TEXT,
    buildout_signals TEXT,
    pitch_angle TEXT,
    ai_dossier_formatted TEXT,
    official_portal_url TEXT,
    is_unmasked INTEGER,
    created_at TEXT
);
```

---

## 6. Autonomous Data Harvesting & Enrichment Pipeline

The Python pipeline is organized in modular stages under `src/`:

```
[City Open Data Socrata APIs]
              │
              ▼
   [1. src/harvester.py]
   • Hits Austin (3syk-w9eu), Dallas (9n26-66g4), Orlando (e25j-psfz)
   • Filters out residential pools, patio covers, fence repairs
   • Classifies commercial categories & priority scores (1.0 to 10.0)
              │
              ▼
   [2. src/enricher.py]
   • Unmasks shell LLCs into corporate officers & managing members
   • Cross-references Texas Comptroller & Florida Sunbiz registries
              │
              ▼
   [3. src/lead_extractor.py & contact discovery]
   • Formats telephone numbers: display format (512) 840-XXXX and tel:+1...
   • Matches direct contractor and owner contact records
              │
              ▼
   [4. src/dossier.py]
   • AI Sales Dossier Engine: estimated opening timeline (60-120 days)
   • Vendor sales pitch angle & high-value equipment purchase signals
              │
              ▼
   [5. src/database.py & export_frontend_feeds()]
   • Deduplicates and upserts records into data/database.sqlite
   • Exports frontend/data/members_feed.json (448 unmasked leads)
   • Exports frontend/data/previews.json (masked teaser leads by city)
```

---

## 7. Cloud Cron & Automated Deployment Cycle

```
Every Monday–Friday at 06:00 UTC (2:00 AM Eastern / 11:00 PM Pacific)
                                │
                                ▼
         [GitHub Actions Runner (.github/workflows/daily_harvest.yml)]
         • Checks out repo, sets up Python 3.11
         • Runs: PYTHONPATH=. python3 src/orchestrator.py
         • Updates data/database.sqlite, members_feed.json, previews.json
         • Commits changes: 'Auto-Harvest: Update leads database and member feed'
         • Pushes to origin main
                                │
                                ▼
         [Vercel Global Edge Network]
         • Detects git push to main
         • Builds and deploys static frontend in ~7 seconds
         • Edge caches invalidated globally with zero downtime
                                │
                                ▼
         [Subscriber Dashboards Updated Live]
         • Subscribers refresh portal and see fresh morning filings
```

---

## 8. Frontend Architecture & Screen Specifications

Built with zero framework bloat: pure semantic **HTML5**, **Tailwind CSS (CDN)**, and **Vanilla JavaScript**.

### 1. Landing Page (`frontend/index.html` & `frontend/app.js`):
* **Hero**: Institutional headline *"Close Deals Before Construction Starts."* with live daily sync badge.
* **1-Click City Switcher**: `[Austin, TX (71 Projects)]` `[Dallas, TX (187 Projects • $199M)]` `[Orlando, FL (190 Projects • $284M)]`.
* **Category Pills**: `[All Commercial]` `[Restaurants & Bars]` `[Retail & Commercial]` `[Healthcare & Clinics]`.
* **Top 10 Teaser Cards**: Renders top 10 verified projects with masked phone numbers (`(512) •••-••••`), official permit numbers, registration dates, and `[Unlock Direct Mobile ➔]` CTA.
* **Luxury Overflow Banner**: Displays total active count (e.g. 187 buildouts) with luxury daily government ingestion notice and trial CTA.
* **Pricing Card**: $1.00 for 7-day trial, then $199/month.

### 2. Territory Checkout (`frontend/checkout.html`):
* **City Selector**: Pre-filled from landing page or customizable.
* **10 Visual Category Cards**: Vector SVG icons, `AVAILABLE • 1 SEAT` green badges, and `🔒 SOLD OUT` red badges driven by `frontend/data/tokens.json`.
* **Motivation & Valuation Box**: Displays live pipeline size and average commission ($3,000–$7,500).
* **Instant Activation**: Generates access token, records browser session, and routes immediately to customer's personal portal.

### 3. Member Intelligence Portal (`frontend/portal.html` & `frontend/portal.js`):
* **Territory Lock Header**: Shows active license status and assigned metro corridor.
* **Unmasked Intelligence**: 100% full direct phone numbers with `tel:` tap-to-call links.
* **Filters**: Quick pills for Restaurants, Bars & Breweries, Cafes & Bakeries, Retail, Healthcare.
* **Toggles**: `Direct Phones Only` toggle and `Current Month Only` toggle.
* **Live Search**: Instant search by concept name, street address, or owner name.
* **Sales Dossier Modal**: Complete AI pre-opening dossier with 1-click clipboard copy.

---

## 9. Key Architectural Decisions & Pivots Log

| Decision / Pivot | Why It Was Made |
| :--- | :--- |
| **90-Day Rolling Pipeline vs 30 Days** | Commercial buildouts take 3–6 months. Contracts for equipment, POS, and food supply are signed in months 2–4. Restricting to 30 days deleted leads right before owners buy. |
| **10 Vendor Seats at Checkout vs Full City Feed in Portal** | Early design artificially restricted reps to 3–6 leads per micro-category, making the tool feel empty. Solution: sell exclusivity by vendor product type, but grant the subscriber the full city pipeline with in-dashboard filter pills so they never miss deals. |
| **10 Preview Leads on Landing Page vs 30 Leads** | Showing 30 cards created page scroll fatigue. 10 preview leads provides immediate proof of quality, followed by a luxury callout banner showing the remaining 170+ leads unlocked via trial. |
| **$199/month Pricing vs $350/month** | Research into US field sales corporate credit card allowances revealed that expenses under $250 do not require VP/manager approval. Reps can expense $199/month on impulse. |
| **Pure Static Frontend with JSON Feeds vs Dynamic Server API** | Running static JSON feeds deployed to Vercel global CDN achieves 0ms database query latency, $0 server cost, 100% uptime, and scales to millions of visitors without infrastructure failure. |

---

## 10. File & Directory Reference Guide

```
chinaproducts/
├── PROJECT_MEMORY.md                     <-- Master quick-reference for AI & developers
├── requirements.txt                      <-- Python dependencies (requests, pydantic, etc.)
├── vercel.json                           <-- Production Vercel configuration (outputDirectory: frontend)
├── serve.py                              <-- Local dev HTTP server (port 8000)
├── .github/
│   └── workflows/
│       ├── daily_harvest.yml             <-- Monday-Friday 06:00 UTC autonomous cron harvester
│       └── deploy_frontend.yml           <-- GitHub Pages deployment workflow
├── config/
│   └── sources.json                      <-- Municipal API endpoints, query filters, and field mappings
├── data/
│   ├── database.sqlite                   <-- Master SQLite database (448 commercial leads)
│   ├── raw/harvested_leads.json          <-- Raw ingested permits
│   └── processed/
│       ├── unmasked_leads.json           <-- Leads with unmasked LLC owners
│       ├── enriched_leads.json           <-- Leads with verified phone numbers
│       └── dossier_leads.json            <-- Leads with AI sales dossiers
├── docs/
│   ├── PROJECT_CONTEXT_AND_VISION.md     <-- This master architectural bible
│   ├── CHAT_HISTORY_TRANSCRIPT.md        <-- Full formatted chronological conversation dialogue
│   ├── raw_transcript_full.jsonl         <-- Complete raw structured JSONL transcript
│   └── FIRST_CUSTOMER_SPRINT.md          <-- Outbound sales acquisition playbook
├── frontend/
│   ├── index.html                        <-- Public landing page & showcase
│   ├── checkout.html                     <-- 10-category exclusivity checkout screen
│   ├── portal.html                       <-- Member intelligence portal
│   ├── app.js                            <-- Showcase interactive filtering & top 10 rendering
│   ├── portal.js                         <-- Member portal filtering, search, and dialer logic
│   ├── auth.js                           <-- Token authentication and license gating logic
│   └── data/
│       ├── members_feed.json             <-- 448 unmasked leads for member dashboards
│       ├── previews.json                 <-- Masked teaser leads by metro (Austin, Dallas, Orlando)
│       └── tokens.json                   <-- Active territory licensee tokens and FOMO locks
├── scripts/
│   └── export_project_memory.py          <-- Generates physical documentation from transcript
├── src/
│   ├── orchestrator.py                   <-- Master pipeline runner (stages 1 to 5)
│   ├── harvester.py                      <-- Municipal Socrata Open Data scraper & classifier
│   ├── enricher.py                       <-- Corporate LLC unmasker
│   ├── contact_enricher.py               <-- Phone discovery & dialer formatter
│   ├── dossier.py                        <-- AI Sales Dossier & pitch engine
│   └── database.py                       <-- SQLite ORM & frontend feed export engine
└── tests/
    └── system_verification.py            <-- 10/10 production health test suite
```
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"✓ Master Context & Vision written successfully ({out_path})")


def export_root_project_memory():
    out_path = os.path.join(WORKSPACE_DIR, "PROJECT_MEMORY.md")
    print(f"Writing Root Project Memory to {out_path}...")

    content = """# CivicIntel: Core Project Memory & Operational Guide

> **Welcome AI Assistant / Developer!**  
> This file is your primary briefing on **CivicIntel Commercial Intelligence Systems**.  
> Read this file first, then consult [`docs/PROJECT_CONTEXT_AND_VISION.md`](docs/PROJECT_CONTEXT_AND_VISION.md) and [`docs/CHAT_HISTORY_TRANSCRIPT.md`](docs/CHAT_HISTORY_TRANSCRIPT.md) for full context.

---

## 1. Quick Facts

* **Product:** Pre-market commercial permitting Data-as-a-Service (DaaS) for B2B sales reps.
* **Production URL:** [https://civicintel-daas.vercel.app](https://civicintel-daas.vercel.app)
* **GitHub Repository:** [https://github.com/raghavs1320/civicintel](https://github.com/raghavs1320/civicintel)
* **Current Database:** **448 verified commercial leads** across **$483.47 Million** in active buildouts in Austin, TX, Dallas, TX, and Orlando, FL.
* **Autonomous Ingestion:** Runs every Monday–Friday at 06:00 UTC via GitHub Actions, pulls from municipal government APIs, unmasks LLCs, writes AI dossiers, updates SQLite, exports JSON feeds, commits to git, and auto-deploys to Vercel in 7 seconds.
* **Infrastructure Cost:** $0.00 upfront (100% free-tier: Socrata Open Data, SQLite, GitHub Actions, Vercel).

---

## 2. Strict Rules & Constraints (DO NOT VIOLATE)

1. **Zero Personal Names:** The founder/user's personal name must **never** appear in public HTML, UI, metadata, or git commit author configs. Brand strictly as **CivicIntel Commercial Intelligence Systems**.
2. **Zero Robotic Emojis:** Use clean, professional inline vector SVGs. No AI emojis (🚀, 🤖, 💡, 💰).
3. **Enterprise Light Theme:** Backgrounds use `bg-slate-50` and `bg-white`, borders use `border-slate-200`, text uses `text-slate-900`, accents use `emerald-600`.
4. **Pricing Standard:** **$1.00 for a 7-day trial**, auto-renewing at **$199.00 / month per territory seat**. (Do not change to $350/mo; $199 sits below the $250 US corporate card expense approval limit).
5. **Exclusivity Model:** Exactly **10 non-competing seats per city** (POS, Food Supply, Insurance, Equipment, Signage, Cleaning, Waste, Linens, Security, Working Capital). Available seats show `AVAILABLE • 1 SEAT`; taken seats show `🔒 SOLD OUT (City)`.
6. **Data Delivery Model:** On checkout, reps lock their category, but inside their private portal they receive the **complete city feed** with 1-click filter pills so they never miss misclassified permits.

---

## 3. Directory Navigation

* **Master Context & Architecture Bible:** [`docs/PROJECT_CONTEXT_AND_VISION.md`](docs/PROJECT_CONTEXT_AND_VISION.md)
* **Full Chronological Chat History:** [`docs/CHAT_HISTORY_TRANSCRIPT.md`](docs/CHAT_HISTORY_TRANSCRIPT.md)
* **Raw JSONL Transcript:** [`docs/raw_transcript_full.jsonl`](docs/raw_transcript_full.jsonl)
* **Pipeline Orchestrator:** [`src/orchestrator.py`](src/orchestrator.py)
* **Database & Feed Generator:** [`src/database.py`](src/database.py)
* **Daily Cron Workflow:** [`.github/workflows/daily_harvest.yml`](.github/workflows/daily_harvest.yml)
* **Public Landing Page:** [`frontend/index.html`](frontend/index.html)
* **Checkout Screen:** [`frontend/checkout.html`](frontend/checkout.html)
* **Member Portal:** [`frontend/portal.html`](frontend/portal.html)
* **System Test Suite:** [`tests/system_verification.py`](tests/system_verification.py)

---

## 4. Key CLI Commands

* **Run System Verification (10/10 checks):** `python3 tests/system_verification.py`
* **Run Harvest & AI Enrichment Pipeline:** `PYTHONPATH=. python3 src/orchestrator.py`
* **Export Frontend Data Feeds:** `python3 -c "from src.database import export_frontend_feeds; export_frontend_feeds()"`
* **Start Local Dev Server:** `python3 serve.py` (serves on http://localhost:8000)
* **Deploy Production to Vercel:** `npx --yes vercel --prod --yes`
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"✓ Root Project Memory written successfully ({out_path})")


if __name__ == "__main__":
    print("=" * 70)
    print("CIVICINTEL: EXPORTING PHYSICAL PROJECT DOCUMENTATION & MEMORY")
    print("=" * 70)
    export_chat_transcript()
    print("-" * 70)
    export_project_context_and_vision()
    print("-" * 70)
    export_root_project_memory()
    print("=" * 70)
    print("ALL PROJECT MEMORY FILES GENERATED AND SYNCHRONIZED.")
    print("=" * 70)
