# CivicIntel Commercial Intelligence Systems: Master Architecture & Product Bible

> **Project Name:** CivicIntel Commercial Intelligence Systems  
> **Repository:** [https://github.com/raghavs1320/civicintel](https://github.com/raghavs1320/civicintel)  
> **Production App:** [https://civicintel-daas.vercel.app](https://civicintel-daas.vercel.app)  
> **Member Portal:** [https://civicintel-daas.vercel.app/portal?token=tok_live_demo](https://civicintel-daas.vercel.app/portal?token=tok_live_demo)  
> **Checkout Screen:** [https://civicintel-daas.vercel.app/checkout](https://civicintel-daas.vercel.app/checkout)  
> **Latest Deployment:** Vercel Edge Network (Auto-deploy on GitHub push)  
> **Data Infrastructure:** SQLite Relational Database + Daily Autonomous GitHub Actions  
> **Total Active Permits:** **598 verified commercial projects** (Austin: 141, Dallas: 230, Orlando: 227)  
> **Cost Profile:** $0 Upfront / $0 Infrastructure Spend (100% Free-Tier Architecture)  

---

## 1. Executive Summary & Brand Identity

**CivicIntel** is an enterprise pre-market commercial permitting Data-as-a-Service (DaaS) platform. It monitors municipal government dockets (building permits, certificates of occupancy, and contractor filings) in real-time across Austin, Dallas, and Orlando, extracts pre-opening commercial projects (restaurants, bars, retail stores, healthcare clinics, and corporate facilities), unmasks corporate shell LLCs to identify real decision makers, enriches them with direct cell phone numbers, generates AI sales dossiers, and licenses this intelligence to B2B field sales representatives under a **strict category exclusivity lock**.

### Brand Rules (Mandatory for all future AI agents):
1. **Brand Name:** Strictly **CivicIntel Commercial Intelligence Systems** (or **CivicIntel**).
2. **Zero Personal Names:** Never expose personal names in any customer-facing UI, metadata, HTML, or git commit user configs.
3. **Zero AI Emojis:** Strictly use professional vector SVG icons. No robotic emojis.
4. **Visual Theme:** Enterprise Blue-700 branding (`#1D4ED8`, `blue-700`) with high-trust white/slate backgrounds (`bg-slate-50`, `bg-white`) and subtle slate borders (`border-slate-200`).
5. **Session Persistence:** Full `localStorage` persistence across all browser sessions. Users never get logged out automatically.
6. **Legal & Compliance:** Explicitly positioned under the Texas Public Information Act, Florida Sunshine Law, and US Freedom of Information Act (FOIA). 100% compliant B2B commercial prospecting data.

---

## 2. Master Database Architecture & Data State

### Database Engine:
* SQLite 3 (`data/database.sqlite`), relational schema optimized for sub-millisecond local queries.
* Tables:
  1. `leads`: Primary repository of verified commercial projects.
  2. `subscribers`: Active territory license holders, tokens, assigned metros, and billing status.

### Current Verified Data Inventory:
* **Austin Metro, TX:** 141 verified projects.
* **Dallas–Fort Worth, TX:** 230 verified projects.
* **Orlando Metro, FL:** 227 verified projects.
* **Total Master Pipeline:** **598 verified commercial permits**.

---

## 3. Frontend Architecture & Screen Specifications

### 1. Landing Page (`frontend/index.html` & `frontend/app.js`):
* **Hero Live Badge:** `Municipal dockets indexed daily — 598 active permits across Austin, Dallas & Orlando · Latest: Nov 12, 2026`.
* **Instant First Paint (SSG):** Dynamic pre-rendered cards injected by `src/static_sync.py` for 0ms load with zero layout shift.
* **1-Click City Switcher:** Synchronized tabs displaying real live counts: `Austin, TX (141)`, `Dallas, TX (230)`, `Orlando, FL (227)`.
* **Top 10 Teaser Cards:** Renders top verified projects with masked phone numbers, official permit numbers, registration dates, and direct unlock CTA.
* **Pricing Card:** $1.00 for 7-day trial, then $199/month.

### 2. Territory Checkout (`frontend/checkout.html`):
* **City Selector:** Pre-filled from landing page or customizable.
* **10 Visual Category Cards:** Vector SVG icons, `AVAILABLE • 1 SEAT` blue badges, and `SOLD OUT` red badges.
* **Instant Activation:** Generates access token, records permanent `localStorage` session, and routes directly to the personal portal.

### 3. Member Intelligence Portal (`frontend/portal.html` & `frontend/portal.js`):
* **Enterprise Data Table:** High-density table with expandable detail rows showing full permit scope, AI sales intelligence pitch, direct phone, city docket, and Google Maps satellite link.
* **1-Click Lead CRM:** Tactile checkbox on every row (`toggleConnected(leadId, e)`) to mark leads as Connected, stored persistently in `localStorage`.
* **5-Metric Stats Strip:** Live counters for Total Leads, Connected Leads, Remaining to Call, Average Project Budget, and Last Updated date.
* **Pipeline Status Filter Tabs:** Instant 1-click filtering between `All Leads`, `Remaining to Call`, and `Connected`.
* **Sorting Engine:** `getComparableDate()` sorting ensuring newest filings (including "Recent" filings) always appear at the top.
* **CSV Export:** Full 1-click CSV export including pipeline connection status.
* **Session Persistence (`frontend/auth.js`):** Permanent `localStorage` authentication ensures users never get automatically logged out across browser sessions or days.

---

## 4. Autonomous Data Harvesting & Deployment Cycle

```
[City Open Data APIs (Austin, Dallas, Orlando)]
                      │
                      ▼
            [1. src/harvester.py]
            • Hits Socrata and ArcGIS REST endpoints
            • Filters out residential pools and minor repairs
            • Classifies commercial categories & priority scores
                      │
                      ▼
            [2. src/enricher.py & contact discovery]
            • Unmasks shell LLCs into corporate officers
            • Formats contractor dial links and direct contacts
                      │
                      ▼
            [3. src/dossier.py]
            • AI Sales Dossier Engine: estimated opening timeline
            • Generates vendor pitch angles and equipment purchase signals
                      │
                      ▼
            [4. src/database.py & src/static_sync.py]
            • Deduplicates and upserts into data/database.sqlite
            • Exports frontend/data/members_feed.json & previews.json
            • Injects live metrics & pre-rendered HTML cards for 0ms paint
                      │
                      ▼
[GitHub Actions (.github/workflows/daily_harvest.yml)] -> [Vercel Edge Network (Auto Deploy)]
```

---

## 5. Directory Reference Guide

```
chinaproducts/
├── PROJECT_MEMORY.md                     <-- Root operational briefing
├── requirements.txt                      <-- Python dependencies
├── vercel.json                           <-- Production Vercel config
├── serve.py                              <-- Local dev HTTP server (port 8000)
├── .github/workflows/
│   └── daily_harvest.yml                 <-- Autonomous daily harvest & deploy
├── config/sources.json                   <-- Municipal API endpoints & query filters
├── data/
│   ├── database.sqlite                   <-- Master SQLite database (598 leads)
│   ├── raw/harvested_leads.json          <-- Raw ingested permits
│   └── processed/                        <-- Enriched and categorized datasets
├── docs/
│   ├── PROJECT_CONTEXT_AND_VISION.md     <-- This master architecture bible
│   ├── GO_TO_MARKET_AND_VISION.md        <-- Outbound strategy, vision, and Apollo playbook
│   ├── CHAT_HISTORY_TRANSCRIPT.md        <-- Full chronological conversation transcript
│   └── raw_transcript_full.jsonl         <-- Raw structured conversation log
├── frontend/
│   ├── index.html                        <-- Public landing page (Blue-700 theme)
│   ├── checkout.html                     <-- 10-category exclusivity checkout screen
│   ├── portal.html                       <-- Member intelligence portal & CRM table
│   ├── app.js                            <-- Showcase interactive filtering & logic
│   ├── portal.js                         <-- Member portal CRM, filtering, search & sorting
│   ├── auth.js                           <-- Permanent localStorage authentication
│   └── data/
│       ├── members_feed.json             <-- 598 unmasked leads for member portal
│       ├── previews.json                 <-- Masked teaser leads by metro
│       └── tokens.json                   <-- Territory licensee tokens
├── scripts/export_project_memory.py      <-- Synchronizes all physical documentation
├── src/
│   ├── orchestrator.py                   <-- Master pipeline runner
│   ├── harvester.py                      <-- Municipal Socrata & ArcGIS scraper
│   ├── enricher.py                       <-- Corporate LLC unmasker
│   ├── contact_enricher.py               <-- Phone discovery & dialer formatter
│   ├── dossier.py                        <-- AI Sales Dossier & pitch engine
│   ├── database.py                       <-- SQLite ORM & frontend feed export engine
│   └── static_sync.py                    <-- SSG pre-rendering engine
└── tests/system_verification.py          <-- 10/10 production verification test suite
```
