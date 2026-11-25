# 🏨 TUHH CRM & PMS — MASTER PROJECT CONTEXT & HANDOFF GUIDE
> **Project**: The Unique Haven Homes Private Limited (TUHH) Homestay CRM & PMS  
> **Repository Path**: `/Users/praveen/Developer/airbnbmanager.github.io` (or Windows clone path)  
> **Active Branch**: `feature/tuhh-app-modern-ui` (fast-forward synchronized with `main`)  
> **Current Software Version**: `v526` (`tuhh-live-v526` in `sw.js` and `admin.html`)  
> **Live Production URL**: `https://airbnbmanager.github.io/admin.html`  
> **Local Dev URL**: `http://localhost:5500/admin.html` or `http://localhost:3000`  
> **Last Updated**: November 25, 2026 (Ready for Windows PC Session)

---

## 📌 1. EXECUTIVE SUMMARY & TECH STACK

TUHH CRM is a high-performance, real-time property management software built for managing 20+ luxury villas and homestays across Lucknow (Gomti Nagar, Chinhat, Vibhuti Khand, Shaheed Path, etc.).

- **Architecture**: Vanilla JavaScript (Modular ES6+ architecture in `js/*.js`), HTML5, CSS3 (`style.css` + `css/homeyindia-crm-theme.css`). Zero complex bundlers required — runs smoothly via any static HTTP server.
- **Database**: **Supabase** (PostgreSQL with real-time WebSocket subscriptions and row-level security).
  - Supabase Project URL: `https://vxxmigdzimnrbbmkjzoa.supabase.co`
  - Anon Key: `sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F`
- **Automation Gateway**: Node.js + `@whiskeysockets/baileys` running on port `3000` (`http://localhost:3000`).
- **Service Worker / PWA**: Managed via `sw.js` (Cache identifier bumped on every release: currently `tuhh-live-v517`).

---

## 📁 2. PROJECT REPOSITORY STRUCTURE

```
airbnbmanager.github.io/
├── admin.html                 # Main single-page application shell (all tab hashes & script tags)
├── style.css                  # Core CSS design system, responsive styles, mobile media queries
├── sw.js                      # Service Worker caching and offline support (CACHE_NAME = 'tuhh-live-v517')
├── config.js                  # Supabase URL & Public API Keys
├── css/
│   └── homeyindia-crm-theme.css # Modern theme and UI styling rules
├── js/
│   ├── core.js                # Core app initialization, Supabase connection, routing engine
│   ├── dashboard.js           # Today · Operations (#dashboard), check-ins/outs, cleaning status
│   ├── bookings.js            # Bookings ledger (#bookings), payments, modals, receipts
│   ├── calendar.js            # Visual calendar grid, iCal Airbnb sync visualizer
│   ├── properties.js          # Properties & inventory (#properties), pricing, caretakers, PDF guides
│   ├── expenses.js            # Operational expenses (#expenses), repairs, maintenance, Anwar OD
│   ├── analytics.js           # Finances & Executive Analytics (#analytics), investor ROI
│   ├── employees.js           # HRMS & Staff Activity (#employees / #hrms), 5 tabs
│   ├── whatsapp-hub.js        # WhatsApp Automation Hub (#whatsapp-hub), 3 clean tabs
│   ├── user-mgmt.js           # User management, screen time, security audit (#user-mgmt)
│   ├── ical-sync.js           # Automatic 2-way Airbnb calendar synchronization
│   └── notifications.js       # Live bell notifications, sound alerts, payment audits
└── PROJECT_CONTEXT_HANDOFF.md # THIS MASTER HANDOFF FILE
```

---

## 🧭 3. MODULE ROUTING & NAVIGATION (`admin.html`)

| Hash Anchor | Module Name | Key JS File | Purpose & Architecture |
|---|---|---|---|
| `#dashboard` | **Today · Operations** | `js/dashboard.js` | Operations queue, today's check-ins, check-outs, room readiness. Must render `renderDashboard()` (never hijacked to Analytics). |
| `#bookings` | **Bookings / Calendar** | `js/bookings.js`, `js/calendar.js` | Interactive booking grid, calendar timeline, booking receipts, guest passes. |
| `#properties` | **Properties** | `js/properties.js` | Units, nightly rates, caretaker contacts, key codes, map pins, PDF guides. |
| `#expenses` | **Expenses** | `js/expenses.js` | Laundry, maintenance, cleaning supplies, and vendor payments. |
| `#analytics` | **Finances** | `js/analytics.js` | Executive financial dashboards, Net Revenue, Occupancy %, ADR, RevPAR, Investor Statements. |
| `#employees` | **HRMS & Tasks** | `js/employees.js` | 5 tabs: Staff Master, Attendance, Tasks, Payroll, Performance (Mobile cards & Desktop table). |
| `#whatsapp-hub` | **WhatsApp Hub** | `js/whatsapp-hub.js` | Automated WhatsApp gateway, QR code linking, group dispatching (Streamlined to 3 tabs). |
| `#user-mgmt` | **User Management** | `js/user-mgmt.js` | System roles, developer login alerts, security logs. |
| `#help` | **Help & Guide** | `admin.html` | Step-by-step CRM operating handbook and keyboard shortcuts. |
| `#settings` | **Global Settings** | `js/core.js` | Bottom preference drawer in sidebar footer. |

---

## ⚡ 4. CRITICAL SUBSYSTEMS & LATEST DEVELOPMENTS

### A. Property PDF & House Manual Guide System (`js/properties.js`) — *NEW (v513–v517)*
1. **Direct Download Engine (`window.getDirectDownloadPdfUrl`)**:
   - Automatically parses Google Drive URLs and converts web preview URLs (`/file/d/{ID}/view...`) into high-speed direct download links (`https://drive.google.com/uc?export=download&id={ID}`).
   - Solves the mobile browser issue where clicking PDF opened a blank viewer or required multiple taps.
2. **Buttons on Property Cards (`#properties`)**:
   - **`📥 Download PDF`**: Green button on cards with PDFs. Triggers immediate `.pdf` file download.
   - **`📋 Copy PDF Link`**: Blue button beside download. Copies the Google Drive PDF link to clipboard with instant `✅ Copied!` visual animation. Perfect for pasting into WhatsApp for guests.
   - **`📄 No PDF` + `➕ Attach PDF`**: Clear separation for units without PDFs. Eliminates accidental modal popups.
3. **Pre-Linked Verified Properties**:
   - **Penthouse (Flat 501 / Starlight Blue PentHouse, ID `GOM-501`)**:
     `https://drive.google.com/file/d/131sOZc5f8K3IOv-NsFTWZMVOfmzVTfkY/view?usp=sharing`
   - **Pink Paradise Villa (Front of Lulu Mall 3 BHK / 3rd Floor, ID `VIL-108`)**:
     `https://drive.google.com/file/d/1DLY90HRpIKU9__lXHibImrjq9mh6UoFD/view?usp=sharing`
4. **Cloud Persistence**:
   - Stored in Supabase `app_settings` under key `property_pdf_guides` and synchronized across all phones, tablets, and PCs.
   - Header button **`⚙️ Manage PDFs`** opens the quick search and bulk edit portal.

### B. WhatsApp Automation Hub (`js/whatsapp-hub.js`)
1. **Streamlined to 3 Essential Tabs**:
   - `⚙️ WhatsApp Automation & Groups` (`settings`): Master Switch, Guest Pass toggle, 📒 Booking Data group alert toggle, Investor Group Alerts, Group ID `120363425834560086@g.us`, property-wise routing.
   - `📱 Link WhatsApp / QR Setting` (`device`): Real-time Baileys QR code scanner, paired phone number (+91...), switch number button.
   - `📊 Message Delivery Logs` (`log`): Real-time delivery audit tracker, delivered/failed status, quick test send.
2. **Central Cloud Sync (`app_settings` table)**:
   - Config toggles are synced to Supabase `app_settings` under key `whatsapp_hub_config` so changes never revert when reloading or opening on phone/iPad.
3. **Strict Guest Pass Firewall**:
   - In `dispatchWhatsAppMessage()`, if `HUB.config.send_welcome !== true`, any automated message to a guest mobile number is **immediately blocked**.
   - Group alerts to 📒 **Booking Data** (`120363425834560086@g.us`) dispatch independently without sending to guests.

### C. Cash & Payment Receiver Ledger / Anwar OD
- Full dual-party cash accounting: Caretakers and staff collecting cash on-ground vs. Anwar OD bank account.
- Supports handover logs and balance tracking ("Kiske Paas Kitna Hai").

---

## 💻 5. WINDOWS PC SETUP & RESUMPTION GUIDE (FOR TOMORROW)

When starting on the Windows PC, follow this exact step-by-step procedure:

### Step 1: Clone / Pull Latest Code
```powershell
# Open PowerShell or Windows Terminal in your projects folder
cd C:\Users\<YourUser>\Developer\airbnbmanager.github.io

# Fetch all branches and check status
git fetch origin

# Switch to the active feature branch and pull latest (v517)
git checkout feature/tuhh-app-modern-ui
git pull origin feature/tuhh-app-modern-ui

# Verify fast-forward sync with main
git checkout main
git pull origin main
git checkout feature/tuhh-app-modern-ui

# Ensure working tree is clean
git status
```

### Step 2: Start Local Dev Server
```powershell
# Option A: Using npx serve (recommended)
npx serve -l 5500

# Option B: Using Python built-in server
python -m http.server 5500

# Open in browser:
# http://localhost:5500/admin.html
```

### Step 3: If Running WhatsApp Automation Gateway (Node.js)
```powershell
cd whatsapp-bot
npm install
npm start
# Gateway runs on http://localhost:3000
```

---

## 🛡️ 6. GOLDEN RULES FOR ALL SESSIONS

1. **Synchronize Both Branches**:
   - Always keep `feature/tuhh-app-modern-ui` and `main` branches fast-forward synchronized and pushed to `origin`.
   - Never push broken code to `main`.
2. **Mandatory Version Bumps on Every Release**:
   - In `admin.html`: Bump `?v=XXX` on all modified script and stylesheet links.
   - In `sw.js`: Bump `const CACHE_NAME = 'tuhh-live-vXXX';`.
   - Current Version: **`v517`**. Next release will be **`v518`**.
3. **Preserve Real Production Data**:
   - Never delete Supabase tables, drop columns, or overwrite live booking data.
   - Never introduce automated background scripts that write phantom adjustments without explicit user trigger.
4. **Mobile + Desktop First**:
   - Always ensure changes render cleanly on both mobile screens (375px–430px) and wide desktop displays.
   - Keep horizontal navigation bars cleanly padded with `-webkit-overflow-scrolling: touch;`.

---

## 📞 7. REFERENCE CREDENTIALS & CONSTANTS

- **General Booking WhatsApp Group ID**: `120363425834560086@g.us`
- **Gateway Endpoint**: `http://localhost:3000`
- **Supabase Cloud App Settings Key for WhatsApp**: `whatsapp_hub_config`
- **Supabase Cloud App Settings Key for PDFs**: `property_pdf_guides`
- **Supported Properties Count**: 20 Homestay properties across Lucknow

---

## 🧠 8. CRITICAL KNOWLEDGE & USER PREFERENCES (DO NOT FORGET)

1. **Accidental "Monthly bulk entry" (2026-11-22)**:
   - On Nov 22, 2026, test entries were saved via `saveMonthlyExpenses()` on Penthouse (`GOM-501` / Flat 501) under description `Monthly bulk entry`.
   - **User Resolution**: User instructed to permanently delete and remember this context.
   - An auto-purge hook and strict runtime filter are in place in `js/expenses.js`.
   - An **Action column (`🗑️ Delete`)** is now permanently added to the unified Expenses table so any record can be deleted with 1 click.

2. **Property PDF Link Status (Google Drive Portal)**:
   - The user has updated PDF links for all properties EXCEPT these 6 (links to be provided later by user):
     * **The Brown**
     * **The Unique**
     * **Celebrity Garden**
     * **The Pink House**
     * **The Green House**
     * **The Yellow House**
   - **Rule**: NEVER overwrite other properties with the Penthouse link. Keep the above 6 blank until the user explicitly provides their links.

3. **TUHH-OD Balance & Daily Statement Reconciliation**:
   - The Top Banner ("TUHH-OD Account Online Balance") and the Daily Statement ("OD Balance & Daily Closing Statement" + Mobile Proof Screenshot) must ALWAYS stay 100% synchronized.
   - Fixed an edge-case where a deposit dated on or after a guest's future check-in date was omitted when filtering cumulative closing balance up to Today's date (`25-Nov`), creating an artificial ₹1,000 difference (`-₹869.94` vs `-₹1,869.94`).
   - `renderClosingStatementForDate` now computes full live ledger totals for Today's view, ensuring `Total Deposited - Total Utilized = Closing Balance` (`-₹869.94`) consistently across both banners and mobile screenshots.

4. **New TUHH-OD Account Cycle (1 Dec 2026 Onwards)**:
   - Built dynamic multi-cycle OD support:
     * **Cycle 2 (New OD Account)**: Effective from `2026-12-01`. Fresh ledger for all deposits & claims starting 1 Dec.
     * **Cycle 1 (Previous OD Account)**: `17-Sep to 30-Nov-2026` settled historical ledger safely archived and switchable with 1 click.
   - **Opening Balance**: Can be set/updated by user anytime via modal button `⚙️ Set 1-Dec Opening Balance`. Saved into Supabase `app_settings` (`tuhh_od_dec_config`).
   - On reaching 1-Dec-2026, the app automatically defaults to the new cycle. User can toggle between cycles using the top banner pills.

