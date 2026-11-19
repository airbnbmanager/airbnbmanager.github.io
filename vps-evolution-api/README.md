# 🚀 The Unique Haven Homes — WhatsApp Automation Gateway

Zero per-message fees WhatsApp REST API Automation for **The Unique Haven Homes Pvt. Ltd.**  
Sender Name: **The Unique Haven Homes**  
Official Contact: **+91 9194109911**

---

## 💻 1. Current Running Setup: Mac Mini (Local 24/7 Service)

Aapke Mac Mini par Headless WhatsApp Gateway pehle se installed aur 24/7 background me live hai:
- **Status Endpoint:** `http://localhost:3000/status`
- **QR Code Webpage:** `http://localhost:3000/qr`
- **QR Raw Data:** `http://localhost:3000/qr-data`
- **Send Message API:** `POST http://localhost:3000/send-message`
  ```json
  {
    "to": "919194109911",
    "text": "Namaste ji! Welcome to The Unique Haven Homes."
  }
  ```

### Mac Mini par QR Code Scan Kaise Karein:
1. Apne browser me open karein: `http://localhost:3000/qr`
2. Apne WhatsApp phone (+91 9194109911) se **Linked Devices → Link a Device** karke QR code scan karein.
3. Connected hote hi session save ho jayega aur WhatsApp bot live ho jayega!

---

## ☁️ 2. VPS Setup (Jab bhi aap VPS par shift karein)

VPS par Evolution API v2 chalane ke liye complete ready-made files is folder me hain (`vps-evolution-api/`):

### Requirements:
- Ubuntu 22.04 / 24.04 VPS (₹400/month Hostinger, Hetzner, ya DigitalOcean)
- 2 GB RAM minimum

### Step-by-Step VPS Setup:
1. **VPS me login karein:**
   ```bash
   ssh root@YOUR_VPS_IP
   ```
2. **Yeh repository clone karein ya sirf yeh folder upload karein:**
   ```bash
   git clone https://github.com/airbnbmanager/airbnbmanager.github.io.git
   cd airbnbmanager.github.io/vps-evolution-api
   ```
3. **One-Command Setup Run karein:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
4. **Done!** Evolution API 8080 port par chal padega:
   - Dashboard / Swagger: `http://YOUR_VPS_IP:8080/docs`
   - Global API Key: `tuhh_secure_evo_key_2026`

### Instance Create Karna (WhatsApp Connect):
Terminal ya Postman se ek command run karein:
```bash
curl -X POST http://YOUR_VPS_IP:8080/instance/create \
  -H "apikey: tuhh_secure_evo_key_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "the-unique-haven-homes",
    "token": "tuhh_token_2026",
    "qrcode": true,
    "number": "919194109911"
  }'
```
Phir `http://YOUR_VPS_IP:8080/instance/connect/the-unique-haven-homes` par QR code scan karke connect kar lijiye.

---

## 🔒 Policy & Personas:
- **Sender Identity:** Hamesha **"The Unique Haven Homes"** ke naam se replies aur messages jayenge.
- **Nisha Removal:** CRM, WhatsApp Hub, Voice Concierge, aur Chat Widget se Nisha ko completely remove kar diya gaya hai.
- **Investor Reports:** Investor report me official Accounts & Audit Controller signatory "Nisha Khan" intact hai.
