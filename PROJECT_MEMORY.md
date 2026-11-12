# CivicIntel: Core Project Memory & Operational Guide

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
