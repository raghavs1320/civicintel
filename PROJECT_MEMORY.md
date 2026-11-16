# CivicIntel: Core Project Memory & Operational Guide

> **Welcome AI Assistant / Developer / Founder!**  
> This file is your primary briefing on **CivicIntel Commercial Intelligence Systems**.  
> Read this file first, then consult [`docs/PROJECT_CONTEXT_AND_VISION.md`](docs/PROJECT_CONTEXT_AND_VISION.md), [`docs/GO_TO_MARKET_AND_VISION.md`](docs/GO_TO_MARKET_AND_VISION.md), and [`docs/CHAT_HISTORY_TRANSCRIPT.md`](docs/CHAT_HISTORY_TRANSCRIPT.md) for full context.

---

## 1. Quick Facts

* **Product:** Pre-market commercial permitting Data-as-a-Service (DaaS) for B2B territory sales reps.
* **Production URL:** [https://civicintel-daas.vercel.app](https://civicintel-daas.vercel.app)
* **Demo Member Portal:** [https://civicintel-daas.vercel.app/portal?token=tok_live_demo](https://civicintel-daas.vercel.app/portal?token=tok_live_demo)
* **Territory Checkout:** [https://civicintel-daas.vercel.app/checkout](https://civicintel-daas.vercel.app/checkout)
* **GitHub Repository:** [https://github.com/raghavs1320/civicintel](https://github.com/raghavs1320/civicintel)
* **Current Database:** **598 verified commercial leads** across Austin, TX (141), Dallas, TX (230), and Orlando, FL (227).
* **Autonomous Ingestion:** Runs every Monday–Friday at 06:00 UTC via GitHub Actions, pulls from municipal APIs, cleans legal codes, enriches contractor contacts, writes AI dossiers, runs SSG pre-rendering, commits to git, and auto-deploys to Vercel in 7 seconds.
* **Infrastructure Cost:** $0.00 upfront (100% free-tier architecture: Socrata/ArcGIS Open Data, SQLite, GitHub Actions, Vercel).

---

## 2. Strict Rules & Constraints (DO NOT VIOLATE)

1. **Zero Personal Names:** The founder's personal name must **never** appear in public HTML, UI, metadata, documentation, or git commit author configs. Brand strictly as **CivicIntel Commercial Intelligence Systems**.
2. **Zero Robotic Emojis:** Use clean, professional inline vector SVGs or words. No robotic AI emojis.
3. **Enterprise Blue-700 Theme:** High-trust corporate styling using `#1D4ED8` (`blue-700`), crisp slate borders `border-slate-200`, and clean backgrounds `bg-slate-50` / `bg-white`.
4. **Pricing Standard:** **$1.00 for a 7-day trial**, auto-renewing at **$199.00 / month per territory seat** (under the $250 US corporate card approval threshold).
5. **Exclusivity Model:** Exactly **10 non-competing seats per city** (POS, Food Supply, Insurance, Equipment, Signage, Cleaning, Waste, Linens, Security, Working Capital).
6. **Permanent Session Persistence:** Auth tokens stored in `localStorage` (`civic_auth_token`, `civic_user_session`). Users must **never** be auto-logged out.
7. **Table-First CRM Dashboard:** Full interactive data table with expandable detail rows, 1-click tactile CRM checkmarks (`toggleConnected`), 5-metric stats strip, pipeline filter tabs (`All Leads`, `Remaining to Call`, `Connected`), and CSV export.

---

## 3. Directory Navigation

* **Master Architecture & Product Bible:** [`docs/PROJECT_CONTEXT_AND_VISION.md`](docs/PROJECT_CONTEXT_AND_VISION.md)
* **Go-To-Market, Vision & Economics Guide:** [`docs/GO_TO_MARKET_AND_VISION.md`](docs/GO_TO_MARKET_AND_VISION.md)
* **Full Chronological Chat History (All Turns):** [`docs/CHAT_HISTORY_TRANSCRIPT.md`](docs/CHAT_HISTORY_TRANSCRIPT.md)
* **Raw JSONL Transcript:** [`docs/raw_transcript_full.jsonl`](docs/raw_transcript_full.jsonl)
* **Pipeline Orchestrator:** [`src/orchestrator.py`](src/orchestrator.py)
* **Database & Feed Generator:** [`src/database.py`](src/database.py)
* **SSG Pre-rendering Engine:** [`src/static_sync.py`](src/static_sync.py)
* **Daily Cron Workflow:** [`.github/workflows/daily_harvest.yml`](.github/workflows/daily_harvest.yml)
* **Public Landing Page:** [`frontend/index.html`](frontend/index.html)
* **Checkout Screen:** [`frontend/checkout.html`](frontend/checkout.html)
* **Member Portal:** [`frontend/portal.html`](frontend/portal.html)
* **System Test Suite:** [`tests/system_verification.py`](tests/system_verification.py)

---

## 4. Key CLI Commands

* **Run System Verification (10/10 checks):** `python3 tests/system_verification.py`
* **Run Harvest & AI Enrichment Pipeline:** `PYTHONPATH=. python3 src/orchestrator.py`
* **Run SSG Static Pre-rendering:** `PYTHONPATH=. python3 src/static_sync.py`
* **Export Frontend Data Feeds:** `python3 -c "from src.database import export_frontend_feeds; export_frontend_feeds()"`
* **Export Project Documentation & Memory:** `python3 scripts/export_project_memory.py`
* **Start Local Dev Server:** `python3 serve.py` (serves on http://localhost:8000)
* **Deploy Production to Vercel:** `npx --yes vercel --prod --yes`
