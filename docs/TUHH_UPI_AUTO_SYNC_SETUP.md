# ⚡ TUHH Native Zero-Fee UPI Auto-Sync Engine — Setup Guide

> **THE UNIQUE HAVEN HOMES PRIVATE LIMITED (CIN: U55101UP2026PTC244637)**  
> **100% Free · 0% Gateway Commission · 0-Day Settlement · Instant Guest Verification**

---

## 🎯 Why This Architecture? (Razorpay vs Native TUHH UPI Engine)

| Feature | Razorpay / Cashfree | ⚡ Native TUHH UPI Engine |
| :--- | :--- | :--- |
| **Transaction Fee** | **2% + 18% GST** (₹118 on ₹5,000) | **₹0 (100% Free)** |
| **Settlement Time** | T+2 to T+3 Working Days | **0 Seconds (Direct in Your Bank Account)** |
| **KYC / Monthly Quotas**| Complex corporate KYC & holds | **Zero Red Tape (Your Own Account)** |
| **Supported Banks** | Limited bank callbacks | **HDFC, SBI, ICICI, PhonePe, Paytm, Yes Bank, Axis, Kotak** |
| **Guest Auto-Checkin** | Webhook dependent | **Automated Supabase Status Update (`Paid`)** |

---

## 🚀 2-Minute Deployment Steps (Praveen & Firoz Bhai)

### Step 1: Open Google Apps Script
1. Log in to the Google Account that receives your bank/UPI credit notification emails (e.g. `videoeditorlucknow@gmail.com` or Firoz Khan's email).
2. Go to: **[script.google.com](https://script.google.com/)**
3. Click on **"+ New project"** (ऊपर बाएँ कोने में "+ New project" पर क्लिक करें).
4. Rename the project to: `TUHH-UPI-Auto-Sync`.

---

### Step 2: Paste the Script Code
1. Open the project file `scripts/tuhh_upi_bank_auto_sync.gs` from this repository.
2. Select all (`Ctrl+A` or `Cmd+A`) and copy the code.
3. In the Google Apps Script editor, replace all default code in `Code.gs` with the copied script.
4. Click the **💾 Save** icon (या `Ctrl+S` / `Cmd+S`).

---

### Step 3: Run Test Execution & Grant Gmail Permission
1. Editor ke top toolbar me function dropdown se **`syncBankUpiPayments`** select karein.
2. **▶ Run** button par click karein.
3. Google ek popup dikhayega: **"Authorization required"**:
   - **Review permissions** par click karein.
   - Apna Google Account choose karein.
   - **Advanced** par click karein -> **Go to TUHH-UPI-Auto-Sync (unsafe)** par click karein.
   - **Allow** par click karein.
4. Execution log me check karein:
   ```
   Starting TUHH UPI Bank Auto-Sync...
   TUHH UPI Bank Auto-Sync completed. Processed: 0 payments.
   ```
   *(Initial run successful!)*

---

### Step 4: Set the 1-Minute Auto-Trigger (24/7 Automation)
Bank se jab bhi guest paise bheje, system bina kisi manual button dabaye khud verify kare:

1. Left sidebar me clock icon **⏰ Triggers** par click karein.
2. Neeche daayein kone me **"+ Add Trigger"** button par click karein.
3. Nimn settings select karein:
   - **Choose which function to run:** `syncBankUpiPayments`
   - **Choose which deployment should run:** `Head`
   - **Select event source:** `Time-driven`
   - **Select type of time based trigger:** `Minutes timer`
   - **Select minute interval:** `Every minute` (या `Every 5 minutes`)
4. **Save** par click karein.

🎉 **Mubarak ho!** Ab 24 ghante jab bhi koi guest QR code scan karke payment karega:
1. Bank credit alert email aate hi Google Apps Script Amount aur 12-digit UTR extract karega.
2. Supabase `guest_register` me booking status automatically **`Paid`** ho jayega.
3. `payment_history` me verified entry ban jayegi.
4. Guest ke samne `pay.html` par turant **"🎉 Payment Confirmed & Verified"** screen aur **Official E-Receipt** show ho jayegi!

---

## 📱 How Guests & Staff Use It

### 1. In CRM (`admin.html`)
- Operations ya Bookings me kisi bhi reservation par **"⚡ Instant QR Pay"** click karein.
- Branded QR generate hoga jisme guest ka name, flat number aur exact amount auto-locked hoga.
- **"📲 Send QR on WhatsApp"** dabate hi guest ke number par formatted WhatsApp message chala jayega.

### 2. On Guest Mobile (`pay.html`)
- Guest WhatsApp link par tap karta hai.
- Guest direct **PhonePe / Google Pay / Paytm / BHIM** button par tap karke 1-click me pay kar sakta hai.
- Live radar screen par sunta rehta hai. Bank se credit aate hi screen par green confirmation badge aur download receipt ka option aa jata hai!

---

## 🛡️ Technical Architecture & Security Notes

- **Zero Gateway Leakage:** Money flows peer-to-peer into `8299600709@ybl` (Firoz Khan) or `9454470872@apl` (Praveen Singh) or TUHH Bank Current Account.
- **Deduplication:** Every transaction is tracked with its unique 12-digit UTR. A single bank transaction can never be recorded twice.
- **Gmail Labeling:** Processed emails are labeled `TUHH-UPI-Synced` in Gmail so search queries remain lightweight (1-2 seconds execution time).
- **PostgREST Integration:** Uses authenticated REST calls directly to Supabase (`payment_history` and `guest_register`).

---
*Developed with ❤️ for THE UNIQUE HAVEN HOMES PRIVATE LIMITED by Praveen Singh.*

