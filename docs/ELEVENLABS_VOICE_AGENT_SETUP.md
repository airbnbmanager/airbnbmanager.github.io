# 🎙️ ElevenLabs Agent Setup — Nisha (Unique Haven Homes)

**Agent ID:** `agent_7401m3qdd9edenhr91tej83z3t7y`  
**Agent Name:** Nisha - Unique Haven Homes

---

## ✅ One-Time ElevenLabs Dashboard Setup

Go to **ElevenLabs → Conversational AI → Your Agent** and configure:

---

### 1. System Prompt (in ElevenLabs Dashboard)

Set this as a **minimal placeholder** — the real prompt is injected dynamically at session start with live rates:

```
You are Nisha, the AI concierge for Unique Haven Homes, Lucknow.
Your full instructions and live property rates are provided at the start of each session.
```

> **Note:** The actual system prompt (with live rates, all 17 properties, pricing, lead capture instructions) is injected automatically by `voice-agent.js` every time a guest starts a conversation. No manual update needed!

---

### 2. Client Tools — Add These Two Tools

In **ElevenLabs Dashboard → Agent → Tools → Add Client Tool:**

#### Tool 1: `capture_lead`
| Field | Value |
|-------|-------|
| **Name** | `capture_lead` |
| **Description** | Save a guest's contact information when they show interest in booking |
| **Wait for response** | ✅ Yes |

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Full name of the guest"
    },
    "phone": {
      "type": "string",
      "description": "Guest's WhatsApp/mobile number"
    },
    "interested_property": {
      "type": "string",
      "description": "Name of the property the guest is interested in"
    },
    "notes": {
      "type": "string",
      "description": "Any additional notes or requirements mentioned by the guest"
    }
  },
  "required": ["name", "phone"]
}
```

---

#### Tool 2: `get_property_rates`
| Field | Value |
|-------|-------|
| **Name** | `get_property_rates` |
| **Description** | Get the most current property rates from the website database |
| **Wait for response** | ✅ Yes |

**Parameters (JSON Schema):**
```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

---

### 3. Voice Settings (Recommended)

| Setting | Value |
|---------|-------|
| **Voice** | "Aria" or any warm Indian-English voice |
| **Language** | English (supports Hindi/Hinglish naturally) |
| **Response length** | Medium |
| **First message** | Leave blank (injected by voice-agent.js) |

---

## 🔄 How Real-Time Rate Sync Works

```
1. Guest opens website
2. price-sync.js fetches rates from Supabase → property_rates table
3. Guest clicks "Talk to Nisha" 🎙️
4. voice-agent.js builds a FRESH system prompt with the current rates
5. Conversation starts with Nisha knowing EXACT current prices
```

**Admin updates a rate in rate-manager.html → Saves to Supabase → Next voice conversation uses new rate** ✅

---

## 📋 Lead Flow

```
Guest asks about a property
    ↓
Nisha: "May I know your name and WhatsApp number?"
    ↓
Guest provides details
    ↓
Nisha calls capture_lead tool
    ↓
voice-agent.js saves to Supabase → leads table
    ↓
Notification popup appears on the website (for admin)
    ↓
Admin gets WhatsApp deeplink to instantly message the guest
```

---

## 🗄️ Supabase Tables Required

Run these SQL files in **Supabase → SQL Editor**:

1. `sql/create-property-rates.sql` — Property rates table (for live price sync)
2. `sql/create-leads.sql` — Leads table (for voice-captured leads)

---

## 🧪 Test the Voice Agent

1. Open the website
2. Click the gold 🎙️ button (bottom right)
3. Allow microphone
4. Say: *"Hi, I want to book a property for 6 people under ₹5,000"*
5. Nisha should:
   - Suggest matching properties with correct prices
   - Ask for your name and number
   - Show a lead notification popup when you provide your details

---

## 📱 Admin Contact

All leads captured by Nisha will send a WhatsApp alert to:
**+91 91941 09911** (Praveen Singh)
