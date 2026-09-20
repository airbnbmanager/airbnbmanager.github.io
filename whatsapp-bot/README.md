# 📱 UHHS WhatsApp Automation Gateway

A lightweight, zero-cost, headless WhatsApp Web microservice built with **Baileys**.
Enables The Unique Haven Homes CRM to automate WhatsApp group alerts and guest messages **without** paying for Meta Cloud API!

---

## 🚀 Quick Setup (Only Once)

### Step 1: Install Dependencies
Open your terminal in this folder:
```bash
cd whatsapp-bot
npm install
```

### Step 2: Start the Gateway
```bash
npm start
```

### Step 3: Scan QR Code
* You will see a QR code right in your terminal, or open **`http://localhost:3000/qr`** in any browser.
* Open WhatsApp on your phone → **Linked Devices** → **Link a Device** → Scan the QR!
* **Done!** Your WhatsApp session is saved in `auth_session/` and will stay permanently connected across restarts.

---

## 📡 API Endpoints

* **`GET /status`** — Check WhatsApp connection status.
* **`GET /qr`** — Scan QR code in your browser.
* **`GET /groups`** — Lists all your WhatsApp groups and their unique Group IDs (e.g. `1203630...@g.us`).
* **`POST /send-message`** — Send text to any phone number or group:
  ```json
  {
    "to": "919450055554",
    "message": "Hello from CRM!"
  }
  ```
* **`POST /send-group`** — Send text directly to a WhatsApp group:
  ```json
  {
    "groupId": "12036302485984@g.us",
    "message": "🛎️ New Booking confirmed!"
  }
  ```
