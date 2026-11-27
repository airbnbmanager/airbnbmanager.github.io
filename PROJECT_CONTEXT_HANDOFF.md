# 🏨 TUHH CRM & PMS — MASTER PROJECT CONTEXT & HANDOFF GUIDE
> **Project**: The Unique Haven Homes Private Limited (TUHH) Homestay CRM & PMS  
> **Repository Path**: `/Users/praveen/Developer/airbnbmanager.github.io` (or Windows clone path)  
> **Active Branch**: `feature/tuhh-app-modern-ui` (fast-forward synchronized with `main`)  
> **Current Software Version**: `v534` (`tuhh-live-v534` in `sw.js` and `admin.html`)  
> **Live Production URL**: `https://airbnbmanager.github.io/admin.html`  
> **Website URL**: `https://uniquehavenhomesstay.com` (also at `https://airbnbmanager.github.io/properties.html`)  
> **WhatsApp Business Catalog**: `https://wa.me/c/919194109911`  
> **Master Property PDFs Folder**: `https://drive.google.com/drive/folders/1DxckJITuNECeSN-SRSj4auwMsL_FOF_K?usp=sharing`  
> **Primary Public Host / Owner**: **Mr. Shahanshah (+91 9450055554)**  
> **Last Updated**: November 26, 2026 (100% Up-to-Date for Any PC / Cross-Device Resumption)

---

## 📌 1. EXECUTIVE SUMMARY & TECH STACK

TUHH CRM is a high-performance, real-time property management software built for managing 20+ luxury villas and homestays across Lucknow (Gomti Nagar, Chinhat, Vishesh Khand, Madhav Kunj, Shaheed Path, Golf City, etc.).

- **Architecture**: Vanilla JavaScript (Modular ES6+ architecture in `js/*.js`), HTML5, CSS3 (`style.css` + `css/homeyindia-crm-theme.css`). Zero complex bundlers required — runs smoothly via any static HTTP server (VSCode Live Server, Python `http.server`, etc.).
- **Database**: **Supabase** (PostgreSQL with real-time WebSocket subscriptions and row-level security).
  - Supabase Project URL: `https://vxxmigdzimnrbbmkjzoa.supabase.co`
  - Anon Key: `sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F`
- **Automation Gateway**: Node.js + `@whiskeysockets/baileys` running on port `3000` (`http://localhost:3000`).
- **Service Worker / PWA**: Managed via `sw.js` (Cache identifier bumped on every release: currently `tuhh-live-v534`).

---

## 📁 2. PROJECT REPOSITORY STRUCTURE

```
airbnbmanager.github.io/
├── admin.html                            # Main single-page application shell (all tab hashes & script tags)
├── index.html                            # Public website homepage (with WhatsApp catalog & PDF links)
├── properties.html                       # Public directory of all 20 homestays (with direct PDF buttons)
├── vendors.html                          # Emergency vendor & maintenance portal (1-tap call/WA)
├── staff.html                            # Staff & Caretaker directory portal (1-tap call/WA)
├── style.css                             # Core CSS design system, responsive styles, mobile media queries
├── sw.js                                 # Service Worker caching and offline support (CACHE_NAME = 'tuhh-live-v534')
├── config.js                             # Supabase URL & Public API Keys
├── css/
│   └── homeyindia-crm-theme.css          # Modern theme and UI styling rules
├── js/
│   ├── core.js                           # Core app initialization, Supabase connection, routing engine
│   ├── dashboard.js                      # Today · Operations (#dashboard), check-ins/outs, cleaning status
│   ├── bookings.js                       # Bookings ledger (#bookings), payments, modals, receipts
│   ├── calendar.js                       # Visual calendar grid, iCal Airbnb sync visualizer
│   ├── properties.js                     # Properties & inventory (#properties), pricing, caretakers, 20 PDF guides
│   ├── property-engine.js                # Showcase page engine, photo mosaic, direct PDF downloads
│   ├── expenses.js                       # Operational expenses (#expenses), repairs, maintenance, Anwar OD
│   ├── analytics.js                      # Finances & Executive Analytics (#analytics), investor ROI
│   ├── employees.js                      # HRMS & Staff Activity (#employees / #hrms), 5 tabs
│   ├── whatsapp-hub.js                   # WhatsApp Automation Hub (#whatsapp-hub), 3 clean tabs
│   ├── user-mgmt.js                      # User management, screen time, security audit (#user-mgmt)
│   ├── ical-sync.js                      # Automatic 2-way Airbnb calendar synchronization
│   └── notifications.js                  # Live bell notifications, sound alerts, payment audits
├── scripts/
│   ├── build_branded_property_pdfs.py    # Python engine using img2pdf & Pillow for luxury branded PDFs
│   ├── drive_pdf_links.json              # Scraped exact Google Drive file IDs and URLs
│   └── full_property_pdf_map.json        # 20/20 property mapping (Room ID, Slug, Name, View & Download URLs)
├── docs/                                 # Centralized Documentation Library
│   ├── README.md                         # Documentation index & master table of contents
│   ├── seo-and-ranking/                  # Google Maps & AI Search Domination
│   │   └── GOOGLE_AND_AI_TOP_RANKING_PLAYBOOK.md # Blueprint for #1 ranking on Maps & AI
│   ├── operations/
│   │   ├── STAFF_DIRECTORY.md            # Location-wise staff & caretaker roster
│   │   ├── VENDORS_DIRECTORY.md          # Location-wise emergency technicians & maintenance
│   │   ├── WHATSAPP_BUSINESS_CATALOGUE.md# Location-wise WhatsApp catalogue listings
│   │   ├── GOOGLE_MAPS_DIRECTORY.md      # Forwardable Google Maps check-in cards
│   │   └── NOTION_MASTER_DIRECTORY.md    # Notion master property directory
│   ├── guides/
│   │   ├── WINDOWS_WHATSAPP_SETUP.md     # Baileys Node.js Windows bot setup
│   │   ├── ELEVENLABS_VOICE_AGENT_SETUP.md# Voice AI agent configuration
│   │   └── TUHH_UPI_AUTO_SYNC_SETUP.md   # Real-time bank UPI auto-sync
│   └── planning/
│       ├── TOMORROW_ACTION_PLAN.md       # Prioritized execution checklist
│       ├── INDUSTRY_STANDARD_ROADMAP.md  # Long-term hospitality tech roadmap
│       └── NOTES_PENDING.md              # Historical operational notes
├── README.md                             # Quick-start README
└── PROJECT_CONTEXT_HANDOFF.md            # THIS MASTER HANDOFF FILE (Root)
```

---

## 🧭 3. MODULE ROUTING & NAVIGATION (`admin.html`)

The CRM uses hash-based client-side routing. Navigating to `#<module>` triggers `routeTo(hash)`:

| Route Hash | Module Script | Purpose & Key Features |
| :--- | :--- | :--- |
| `#dashboard` | `js/dashboard.js` | Today's arrivals/departures, in-house guests, housekeeping board. |
| `#bookings` | `js/bookings.js` | All Bookings ledger, new reservation modal, payment logging, UPI receipts. |
| `#calendar` | `js/calendar.js` | Interactive 30-day multi-property calendar, block dates, iCal sync status. |
| `#properties` | `js/properties.js` | 20 Units inventory, pricing, caretaker assignments, 1-click PDF download & link copy, WhatsApp catalog quick launch. |
| `#expenses` | `js/expenses.js` | Expense entry, repairs/maintenance, Anwar OD ledger, 1-click delete action. |
| `#analytics` | `js/analytics.js` | Executive finances, revenue vs. expense, Occupancy %, Investor P&L reports. |
| `#employees` | `js/employees.js` | HRMS, attendance, payroll, cleaner turnaround logs, staff permissions. |
| `#whatsapp-hub`| `js/whatsapp-hub.js` | WhatsApp gateway, QR pairing, live message logs, automated guest alerts. |
| `#user-mgmt` | `js/user-mgmt.js` | Multi-user roles (Admin, Manager, Investor, Staff), audit activity log. |

---

## ⚡ 4. CRITICAL SUBSYSTEMS & RECENT DEVELOPMENTS (v528–v534)

### A. All 20 Branded Property PDFs & Exact Drive Mapping
1. **Lossless PDF Generation**:
   - Built with `img2pdf` and custom luxury cover pages (`00_cover.jpg`) featuring the official gold-crested corporate emblem, address, hero photo, room specs, and host assurance.
   - Output folder on Mac: `/Users/praveen/Developer/Property PDFs/` (20 official PDFs, 20 high-res photo folders, and backups).
2. **Exact Google Drive File Mapping (NOT Generic Folder)**:
   - Extracted exact 33-character Google Drive file IDs for all 20 PDFs in the user's master folder (`1DxckJITuNECeSN-SRSj4auwMsL_FOF_K`).
   - Mapped in `scripts/drive_pdf_links.json` and `scripts/full_property_pdf_map.json`.
   - Updated `window.DEFAULT_PROPERTY_PDF_GUIDES` in `js/properties.js`, `const PDF_GUIDES` in `js/property-engine.js`, and `properties.html`.
   - Clicking "📥 PDF" on any property now opens/downloads **that specific property's PDF directly**.

### B. WhatsApp Business Setup & Live Catalog
1. **Statutory MCA Compliance**:
   - Legal Name: `THE UNIQUE HAVEN HOMES PRIVATE LIMITED`
   - Business Type: `Private Limited Company` (Corporate Registration)
   - CIN: `U55101UP2026PTC244637`
   - GSTIN: `09AAMCT8448C1ZX`
   - Registered Address: `Plot No. 39 & 40, Radhikapuri Colony, Takrohi, Indira Nagar, Lucknow, Uttar Pradesh - 226016`
   - Customer Care: `+91 9450055554` / `+91 9194109911` | `hello@uniquehavenhomes.com`
   - Grievance Officer: `Praveen Singh` (+91 9194109911)
2. **Live Catalog Link**:
   - **`https://wa.me/c/919194109911`**
   - Integrated into `index.html` (navbar & footer), `properties.html` (navbar & top banner pill), and `js/properties.js` (toolbar button).
3. **Master Catalogue Guide**:
   - Located at [docs/operations/WHATSAPP_BUSINESS_CATALOGUE.md](docs/operations/WHATSAPP_BUSINESS_CATALOGUE.md).
   - Provides ready-to-copy listings for all 20 properties arranged location-wise.

### C. Google Maps Check-in Navigation Directory
- Located at [docs/operations/GOOGLE_MAPS_DIRECTORY.md](docs/operations/GOOGLE_MAPS_DIRECTORY.md).
- **Section A**: Complete cards with on-arrival caretaker contact numbers (for confirmed arriving guests).
- **Section B**: Minimal cards without caretaker details (for inquiries and pre-booking privacy).
- Structured as individual messages ready to be posted in the staff WhatsApp group for **1-click forwarding** to guests.

### D. Google Maps 3-Pack & AI Search #1 Ranking Blueprint
- Located at [docs/seo-and-ranking/GOOGLE_AND_AI_TOP_RANKING_PLAYBOOK.md](docs/seo-and-ranking/GOOGLE_AND_AI_TOP_RANKING_PLAYBOOK.md).
- Reverses-engineers the ranking signals of top-ranking Lucknow listings:
  * Keyword-optimized title: `The Unique Haven Homes — Luxury Homestays & Serviced Villas Lucknow`
  * Primary Category: `Homestay`
  * 15-second vertical walkthrough video uploads
  * GMB Products carousel (20 listings with price anchoring)
  * Review generation flywheel targeting 50+ reviews with keyword rich snippets (*"best homestay in lucknow"*, *"very clean 3bhk in gomti nagar"*)
  * Generative Engine Optimization (GEO) for Gemini & ChatGPT

---

## 🛡️ 5. GOLDEN RULES & PORTFOLIO SPECIFICATIONS

### Rule 1: NEVER Mention Floor Numbers in Guest Content
- **STRICT PROHIBITION**: Never write floor numbers ("1st Floor", "2nd Floor", "3rd Floor", "Ground Floor", "Flat 402", "Flat 502") in any property name, brochure title, description, website card, or WhatsApp catalogue entry.
- Reason: User verified that floor mentions cause guest confusion and cancellations.
- All 20 property titles across `properties.html`, `js/properties.js`, and catalogues have been cleaned of floor references.

### Rule 2: Exact BHK & Bed Counts Portfolio Breakdown
| Location | Property Name | Room ID | Verified Specs |
| :--- | :--- | :--- | :--- |
| **Shaheed Path** | Royal White House | `VIL-102` | `6 BHK Royal Villa` |
| **Shaheed Path** | Celebrity Garden | `LUL-402` | `4 BHK 5 Beds with Lawn` |
| **Gomti Nagar** | Gomti Grand Villa | `VIL-101` | `4 BHK 5 Beds Villa` |
| **Vishesh Khand** | The Pink House | `VIL-103` | `5 BHK 6 Beds` |
| **Vishesh Khand** | The Green House | `VIL-104` | `3 BHK 4 Beds` |
| **Vishesh Khand** | The Yellow House | `VIL-105` | `3 BHK 4 Beds` |
| **Madhav Kunj** | The Velvet House | `VIL-107` | `3 BHK 3 Beds Villa` |
| **Madhav Kunj** | Green Forest | `VIL-106` | `3 BHK 3 Beds Villa` |
| **Madhav Kunj** | Pink Paradise | `VIL-108` | `3 BHK 3 Beds Villa` |
| **Vikalp Khand** | Black Beauty | `GOM-102` | `3 BHK 4 Beds` |
| **Vikalp Khand** | The Dark Blue | `GOM-201` | `3 BHK 4 Beds` |
| **Vikalp Khand** | The Brown | `GOM-202` | `3 BHK 4 Beds` |
| **Vikalp Khand** | The Light Green | `GOM-301` | `3 BHK 4 Beds` |
| **Vikalp Khand** | The Nawabi Stay | `GOM-401` | `3 BHK 4 Beds` |
| **Vikalp Khand** | The Unique | `GOM-302` | `3 BHK 4 Beds` |
| **Vikalp Khand** | RedRose Palace | `GOM-101` | `3 BHK 4 Beds` |
| **Vikalp Khand** | Starlight Blue PentHouse | `GOM-501` | `4 Beds Penthouse` |
| **Vikalp Khand** | The Tehzeeb Nest | `GOM-402` | `3 BHK 4 Beds` |
| **Vikalp Khand** | Sukoon Stay | `GOM-502` | `3 BHK 4 Beds` |
| **Golf City** | The Luxe Haven | `LUL-101` | `1 BHK 2 Beds` |

### Rule 3: Git Branch Discipline
- Primary Working Branch: `feature/tuhh-app-modern-ui`
- Production Branch: `main`
- **Rule**: Every single commit made to `feature/tuhh-app-modern-ui` must be merged into `main` and pushed to `origin main` to keep both branches fast-forward synchronized.
- Bump `CACHE_NAME` in `sw.js` (currently `tuhh-live-v534`) on every frontend release.

### Rule 4: Mandatory Public Contact Name & Mobile Number (ONLY Shahanshah)
- **STRICT MANDATE**: For all public Google Business Profile (GMB), Local SEO listings, Website, emergency escalations, and official contact displays, the primary name and mobile number must **ONLY be Shahanshah (+91 9450055554)**.
- No other employee, partner, or manager number may be set as the public owner/host contact.

---

## 💻 6. CROSS-DEVICE / WINDOWS PC SETUP & RESUMPTION GUIDE

When moving between your Mac and any Windows PC:

1. **Clone or Pull Latest Changes**:
   ```powershell
   git checkout feature/tuhh-app-modern-ui
   git pull origin feature/tuhh-app-modern-ui
   git checkout main
   git pull origin main
   git checkout feature/tuhh-app-modern-ui
   ```
2. **Start Local Server**:
   ```powershell
   # Using Python:
   python -m http.server 5500
   # Then open in browser:
   http://localhost:5500/admin.html
   ```
3. **If Running WhatsApp Gateway (Node.js)**:
   ```powershell
   cd whatsapp-bot
   npm install
   node server.js
   ```
4. **All Reference Files Available In Docs Library**:
   - `docs/seo-and-ranking/GOOGLE_AND_AI_TOP_RANKING_PLAYBOOK.md` -> Master ranking blueprint.
   - `docs/operations/WHATSAPP_BUSINESS_CATALOGUE.md` -> For copying catalogue listings.
   - `docs/operations/GOOGLE_MAPS_DIRECTORY.md` -> For copying guest navigation cards.
   - `scripts/full_property_pdf_map.json` -> Complete mapping of all 20 properties with download & view URLs.

---

## 📞 7. REFERENCE CREDENTIALS & CONSTANTS

- **General Booking WhatsApp Group ID**: `120363425834560086@g.us`
- **WhatsApp Business Catalog URL**: `https://wa.me/c/919194109911`
- **Gateway Endpoint**: `http://localhost:3000`
- **Public Host Contact**: **Mr. Shahanshah (+91 9450055554)**
- **Supported Properties Count**: 20 Homestay properties across Lucknow

---
*End of Master Handoff Guide — Version v534 Verified*
