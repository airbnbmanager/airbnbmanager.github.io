# 🏨 TUHH CRM & PMS — MASTER PROJECT CONTEXT & HANDOFF GUIDE
> **Project**: The Unique Haven Homes Private Limited (TUHH) Homestay CRM & PMS  
> **Repository Path**: `/Users/praveen/Developer/airbnbmanager.github.io`  
> **Active Branch**: `feature/tuhh-app-modern-ui` (fast-forward synchronized with `main`)  
> **Current Software Version**: `v512` (`tuhh-live-v512` in `sw.js` and `admin.html`)  
> **Live Production URL**: `https://airbnbmanager.github.io/admin.html`  
> **Local Dev URL**: `http://localhost:5500/admin.html` or `http://localhost:3000`  
> **Last Updated**: November 25, 2026

---

## 📌 1. EXECUTIVE SUMMARY & TECH STACK

TUHH CRM is a high-performance, real-time property management software built for managing 20+ luxury villas and homestays across Lucknow (Gomti Nagar, Chinhat, Vibhuti Khand, etc.).

- **Architecture**: Vanilla JavaScript (Modular ES6+ architecture in `js/*.js`), HTML5, CSS3 (`style.css` + `css/homeyindia-crm-theme.css`).
- **Database**: **Supabase** (PostgreSQL with real-time WebSocket subscriptions).
  - Supabase Project URL: `https://vexmqiodzimerbmkizoa.supabase.co`
- **Automation Gateway**: Node.js + `@whiskeysockets/baileys` running locally on Mac Mini on port `3000` (`http://localhost:3000`).
- **Service Worker / PWA**: Managed via `sw.js` (Cache identifier bumped on every release: e.g., `tuhh-live-v512`).

---

## 📁 2. PROJECT REPOSITORY STRUCTURE

```
airbnbmanager.github.io/
├── admin.html                 # Main single-page application shell (all tab hashes & script tags)
├── style.css                  # Core CSS design system, responsive styles, mobile media queries
├── sw.js                      # Service Worker caching and offline support
├── css/
│   └── homeyindia-crm-theme.css # Modern theme and UI styling rules
├── js/
│   ├── core.js                # Core app initialization, Supabase connection, routing engine
│   ├── dashboard.js           # Today · Operations (#dashboard), check-ins/outs, cleaning status
│   ├── bookings.js            # Bookings ledger (#bookings), payments, modals, receipts
│   ├── calendar.js            # Visual calendar grid, iCal Airbnb sync visualizer
│   ├── properties.js          # Properties & inventory (#properties), pricing, caretakers
│   ├── expenses.js            # Operational expenses (#expenses), repairs, maintenance
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
| `#properties` | **Properties** | `js/properties.js` | Units, nightly rates, caretaker contacts, key codes, map pins. |
| `#expenses` | **Expenses** | `js/expenses.js` | Laundry, maintenance, cleaning supplies, and vendor payments. |
| `#analytics` | **Finances** | `js/analytics.js` | Executive financial dashboards, Net Revenue, Occupancy %, ADR, RevPAR, Investor Statements. |
| `#employees` | **HRMS & Tasks** | `js/employees.js` | 5 tabs: Staff Master, Attendance, Tasks, Payroll, Performance (Mobile cards & Desktop table). |
| `#whatsapp-hub` | **WhatsApp Hub** | `js/whatsapp-hub.js` | Automated WhatsApp gateway, QR code linking, group dispatching (Streamlined to 3 tabs). |
| `#user-mgmt` | **User Management** | `js/user-mgmt.js` | System roles, developer login alerts, security logs. |
| `#help` | **Help & Guide** | `admin.html` | Step-by-step CRM operating handbook and keyboard shortcuts. |
| `#settings` | **Global Settings** | `js/core.js` | Bottom preference drawer in sidebar footer. |

---

## ⚡ 4. CRITICAL SUBSYSTEMS & RECENT REPAIRS

### A. WhatsApp Automation Hub (`js/whatsapp-hub.js`)
1. **Streamlined to 3 Essential Tabs**:
   - `⚙️ WhatsApp Automation & Groups` (`settings`): Master Switch, Guest Pass toggle, 📒 Booking Data group alert toggle, Investor Group Alerts, Group ID `120363425834560086@g.us`, property-wise routing.
   - `📱 Link WhatsApp / QR Setting` (`device`): Real-time Baileys QR code scanner, paired phone number (+91...), switch number button.
   - `📊 Message Delivery Logs` (`log`): Real-time delivery audit tracker, delivered/failed status, quick test send.
   - *Removed Duplicates*: Removed static preview `auto` tab, experimental `ai-chat`, `scheduled`, and `templates`.
2. **Central Cloud Sync (`app_settings` table)**:
   - Config toggles are synced to Supabase `app_settings` under key `whatsapp_hub_config` so changes never revert when reloading or opening on phone/iPad.
3. **Strict Guest Pass Firewall**:
   - In `dispatchWhatsAppMessage()`, if `HUB.config.send_welcome !== true`, any automated message to a guest mobile number is **immediately blocked**.
   - Group alerts to 📒 **Booking Data** (`120363425834560086@g.us`) dispatch independently without sending to guests.

### B. Payment Adjustments & Notification Drawer
- Automatic payment adjustments (`autoFixOverflowPayments`) were **completely disabled from page load** in `js/dashboard.js` to stop spamming notifications on startup.
- `window.revertAutoAdjustmentsToday()` is available in `js/bookings.js` to cleanly purge unwanted auto-adjustments.

### C. Today Operations Routing
- Removed the `window.renderFullDashboardAnalytics` hijack. Clicking `Today · Operations` in the sidebar directly opens `renderDashboard()` (operations tasks & room turns).

### D. Investor Settlement Reports
- Simplified modal to 3 clean actions:
  1. **Download PDF** (properly scaled for mobile view without cutoffs)
  2. **Print Report** (desktop AirPrint formatted)
  3. **Close**

---

## 🛡️ 5. GOLDEN RULES FOR FUTURE AGENTS / SESSIONS

When continuing work on this project in any future turn or session, the AI agent **MUST** follow these rules:

1. **Synchronize Both Branches**:
   - Always keep `feature/tuhh-app-modern-ui` and `main` branches fast-forward synchronized and pushed to `origin`.
   - Never push broken code to `main`.
2. **Mandatory Version Bumps on Every Release**:
   - In `admin.html`: Bump `?v=XXX` on all modified script and stylesheet links.
   - In `sw.js`: Bump `const CACHE_NAME = 'tuhh-live-vXXX';`.
3. **Preserve Real Production Data**:
   - Never delete Supabase tables, drop columns, or overwrite live booking data.
   - Never introduce automated background scripts that write phantom adjustments without explicit user trigger.
4. **Mobile + Desktop First**:
   - Always ensure changes render cleanly on both mobile screens (375px–430px) and wide desktop displays.
   - Keep horizontal navigation bars cleanly padded with `-webkit-overflow-scrolling: touch;`.

---

## 📞 6. REFERENCE CREDENTIALS & CONSTANTS

- **General Booking WhatsApp Group ID**: `120363425834560086@g.us`
- **Gateway Endpoint**: `http://localhost:3000`
- **Supabase Cloud App Settings Key**: `whatsapp_hub_config`
- **Supported Properties Count**: 20 Homestay properties across Lucknow
