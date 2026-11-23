# 🏰 Haven CRM — The Unique Haven Homes Private Limited

> **Best-in-Class Homestay Management System & ERP (Frontend + Real Data + PWA)**  
> Built with **React 18 + Vite 5 + TypeScript 5 + Tailwind CSS + Lucide Icons + TanStack Query + Framer Motion** for multi-property homestay operations across Lucknow, India.

---

## ⚡ Quick Start

```bash
# 1. Navigate to the frontend directory
cd /Users/praveen/Developer/airbnbmanager.github.io/frontend-new

# 2. Start local development server
npm run dev
```

The application will be live at:  
👉 **[http://localhost:5173](http://localhost:5173)**

To create and preview an optimized production build:
```bash
npm run build
npm run preview
```

---

## 🌟 100% Real Live Database Integration

System me dummy data ko replace karke live Supabase database ka **exact real data** bind kar diya gaya hai (without altering or deleting any existing tables):

1. **All 20 Real Homestays & Villas in Lucknow**:
   - `GOM-101`: RedRose Palace (FLAT101) — ₹5,200/night
   - `GOM-102`: Black Beauty (FLAT102) — ₹5,200/night
   - `GOM-201`: The Dark Blue (FLAT201) — ₹5,200/night
   - `GOM-202`: The Brown (FLAT202) — ₹5,200/night
   - `GOM-301`: The Light Green (FLAT301) — ₹5,200/night
   - `GOM-302`: The Unique (FLAT302) — ₹6,300/night
   - `GOM-401`: The Nawabi Stay (FLAT401) — ₹5,200/night
   - `GOM-501`: Starlight Blue PentHouse (FLAT501) — ₹6,900/night
   - `GOM-502`: Sukoon Stay (FLAT502) — ₹5,200/night
   - `Flat 402`: The Tehzeeb Nest (FLAT402) — ₹5,200/night
   - `VIL-101`: Gomti Grand Villa (Entire Estate) — ₹9,200/night
   - `VIL-102`: Royal White House (Presidential Estate) — ₹13,800/night
   - `VIL-103`: The Pink House (2nd & 3rd Floor) — ₹10,350/night
   - `VIL-104`: The Green House (1st Floor) — ₹6,300/night
   - `VIL-105`: The Yellow House (Ground Floor) — ₹6,300/night
   - `VIL-106`: Green Forest (2nd Floor) — ₹5,200/night
   - `VIL-107`: The Velvet House (1st Floor) — ₹5,200/night
   - `VIL-108`: Pink Paradise (3rd Floor) — ₹5,200/night
   - `LUL-101`: The Luxe Haven (101) — ₹2,650/night
   - `LUL-402`: Celebrity Garden (FLAT402) — ₹11,500/night
2. **All 1,046 Real Bookings from `guest_register`**:
   - Real guests (Rohit Singh, Mohd. Saleem, Abhishek Yadav, Akanksha Singh, Airbnb reservations, etc.).
   - Exact November 2026 stats matching previous live app:
     - **200 Bookings**
     - **₹798K Revenue Paid**
     - **148 Direct Stays**
     - **52 Airbnb Reservations**
     - **36 Blocked Days**
     - **62% Occupancy**
3. **Real Aggregated Guest CRM Profiles**:
   - Stay counts, lifetime total spend, most frequented properties, phone numbers, and loyalty tiers computed directly from booking history.

---

## 🔄 Two (2) Switchable UI Versions (1-Click Instant Toggle)

Aap bina page reload kiye kisi bhi waqt in dono versions ke beech switch kar sakte hain:

### ⚡ Version 1: "Classic Enterprise CRM" (Pahle wala app — Screenshot 2)
- **TopBar**: Home emblem logo + `THE UNIQUE HAVEN HOMES PVT. LTD. • CRM`, search bar (`Ctrl+K`), `All Properties (20) ▾`, `🟢 WA Status`, `Combined Receipt`, `+ New Booking`, user avatar `[P] PRAVEEN MANAGER`.
- **Subheader Tabs**: `[📅 Today]` `[📅 Calendar]` `[🟡 Approvals]`.
- **Sidebar**:
  - `Today - Operations`
  - `Bookings / Calendar` (Active with blue pill)
  - `Properties`
  - `Expenses`
  - `Finances`
  - `HRMS & Tasks`
  - `WhatsApp Hub`
  - `User Management`
  - `Global Settings`
  - `Help & Guide`
- **Calendar (Month Grid View)**:
  - Header: `📅 November 2026 - All Properties (20) • 62% Occupancy`
  - Navigation: `‹ Today › 🔄`
  - View switch: `[Unified Timeline]` vs `[Month Grid]`
  - Platforms Legend: `🟦 Direct` | `🟥 Airbnb` | `⬛ Blocked` | `✅ Paid Full` | `⚠️ Due`
  - KPI Stat Strip (6 Cards): 200 Bookings | ₹798K Revenue Paid | 148 Direct | 52 Airbnb | 36 Blocked | 7 Reviews
  - Month Grid Table: 7 columns (SUN, MON, TUE, WED, THU, FRI, SAT) with day numbers, base rates (`₹2.5k`, `₹5.2k`), colored booking bars with guest names, and click-to-open drawer.

### 🏰 Version 2: "Modern Luxury Haven" (Naya luxury boutique app — Screenshot 1)
- **Aesthetic**: Warm Lucknow boutique hospitality, Cormorant Garamond serif headings, warm stone cream canvas (`#FDFBF7`), relaxed cards (`rounded-2xl`).
- **Guest CRM (`/guests`)**: Loyalty tiers (`Platinum`, `Gold`, `Silver`, `Bronze`), trust badges (`Trusted Guest ⭐`), quotes, tags (`#Corporate`, `#Repeat Guest`, `#VIP`), and lifetime spend stats (as shown in Screenshot 1).

---

## 📱 Progressive Web App (PWA) Support

- **Standalone Window Display**: Browser bar ke bina native app feel.
- **Offline Service Worker (`/sw.js`)**: Real data snapshot, static shell aur fonts offline cache me save rehte hain.
- **One-Click Install**: TopBar aur Settings me direct **"📥 Install App"** button.

---

## 🛡️ Zero Data Loss & Existing App Safety Guarantee

- **STRICT RULE ADHERED TO**: Existing repo (`/Users/praveen/Developer/airbnbmanager.github.io`) ki **kisi bhi file ko modify ya delete nahi kiya gaya**.
- `git status` me sirf naya untracked directory `?? frontend-new/` hai.
- Purana app aur naya app dono ek saath safely chal sakte hain!
