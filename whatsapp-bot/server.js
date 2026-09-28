/**
 * TUHH WhatsApp Automation Gateway & AI Agent
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED (Lucknow)
 * Powered by Baileys (Headless WhatsApp Web Protocol)
 */

const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const QRCodeNode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const AUTH_FOLDER = path.join(__dirname, 'auth_session');
const CHATS_FILE = path.join(AUTH_FOLDER, 'chats_store.json');

let sock = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
let lastQr = null;
let isStarting = false;
let botBootTimestamp = Math.floor(Date.now() / 1000); // 🛡️ Timestamp barrier: ignores ALL previous/backlog messages!

// ─── META OFFICIAL CLOUD API CONFIGURATION ───
let META_WABA_ID = process.env.META_WABA_ID || '2158082111408544';
let META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1340519029145106';
let META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAYuuQ2ylIABSknXkM9nXYpzZBB8IY2QRwpZB2kyKo0NGWweLYAZB39xs7lNN5KtcDgBBsGk1HqYK18iaECErnMcsZAoz9eqoOwobYvNppUZCtraxlXj4ip0imB8HEiAlo3LXgdcnO6yxCLphWW159cQGnxWilG4ZBvzXFaZA1FSH3rpSLZCny23rguDBoVGy2ZCrddoIRT7YMTeZBsGIc3iVMcCOTgjOtaDTvvjYVXvypWvtBID0tZAN9mZC8FZBpepkM4i7QHV3nw7Fvu8jZAuQLM16sVs9fAQZDZD';
let META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'uhhs_meta_secure_2026';

async function sendMetaMessage(to, text) {
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    throw new Error('Meta Cloud API credentials missing');
  }
  const cleanPhone = String(to).replace(/\D/g, '');
  const url = `https://graph.facebook.com/v21.0/${META_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: { preview_url: true, body: text }
    })
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'Failed sending via Meta API');
  }
  return data;
}

// ─── CHAT SESSIONS & AI/HUMAN MODE STORE ───
const chatsStore = new Map(); // phone -> { phone, name, mode: 'ai'|'human', channel: 'meta'|'baileys', lastMessage, lastTime, history: [] }
const userLastReply = new Map(); // phone -> timestamp of last auto-reply (anti-spam cooldown)

function loadChatsStore() {
  try {
    if (fs.existsSync(CHATS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
      for (const c of data) {
        chatsStore.set(c.phone, c);
      }
      console.log(`📂 Loaded ${chatsStore.size} saved WhatsApp conversation(s).`);
    }
  } catch (err) {
    console.warn('⚠️ Could not load chats store:', err.message);
  }
}

function saveChatsStore() {
  try {
    if (!fs.existsSync(AUTH_FOLDER)) {
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    }
    const arr = Array.from(chatsStore.values()).slice(-200); // keep last 200 active chats
    fs.writeFileSync(CHATS_FILE, JSON.stringify(arr, null, 2));
  } catch (err) {
    console.warn('⚠️ Could not save chats store:', err.message);
  }
}

loadChatsStore();

// ─── HELPER: Clean & Close Socket ───
async function cleanupSocket() {
  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.end(undefined);
    } catch (e) {}
    sock = null;
  }
  // Wait a short moment to release WebSocket handles & file locks
  await new Promise(r => setTimeout(r, 400));
}

// ─── START BAILEYS WHATSAPP CLIENT ───
async function startWhatsApp() {
  if (isStarting) {
    console.log('⏳ startWhatsApp already in progress, skipping duplicate call.');
    return;
  }
  isStarting = true;

  try {
    await cleanupSocket();

    if (!fs.existsSync(AUTH_FOLDER)) {
      fs.mkdirSync(AUTH_FOLDER, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📡 Starting WhatsApp Client (Baileys v${version.join('.')}, isLatest: ${isLatest})...`);

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      // 🛡️ Use standard stable Chrome browser tuple (prevents WhatsApp desktop protocol drops)
      browser: Browsers.ubuntu('Chrome'),
      keepAliveIntervalMs: 15_000,
      connectTimeoutMs: 90_000,
      defaultQueryTimeoutMs: 90_000,
      emitOwnEvents: false,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      retryRequestDelayMs: 250,
      generateHighQualityLinkPreview: false,
      getMessage: async (key) => {
        return { conversation: '' };
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        lastQr = qr;
        connectionStatus = 'connecting';
        console.log('📱 [WhatsApp QR Ready] Scan via browser: http://localhost:' + PORT + '/qr');
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        console.log(`❌ WhatsApp connection closed (Reason: ${statusCode}). Logged out: ${isLoggedOut}`);

        connectionStatus = 'disconnected';
        lastQr = null;

        if (isLoggedOut) {
          console.log('🚪 Session logged out. Clearing auth_session to prepare fresh QR...');
          try {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
          } catch(e) {}
          setTimeout(() => startWhatsApp(), 1500);
        } else {
          // Reconnect with safe backoff
          const delay = (statusCode === 515 || statusCode === 408) ? 3000 : 5000;
          console.log(`🔄 Reconnecting WhatsApp in ${delay}ms...`);
          setTimeout(() => startWhatsApp(), delay);
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        lastQr = null;
        // 🛡️ CRITICAL: Set boot timestamp right at connection so NO historical backlog messages get replied to!
        botBootTimestamp = Math.floor(Date.now() / 1000);
        console.log('✅ WHATSAPP CONNECTED SUCCESSFULLY!');
        console.log('👤 Connected as:', sock.user?.id || sock.user?.name);
      }
    });

    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (err) {
        console.warn('⚠️ Error saving WhatsApp creds:', err.message);
      }
    });

    // ─── Incoming Message Smart Bot & AI Handler ───
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const from = msg.key.remoteJid;
        if (!from || from === 'status@broadcast' || from.endsWith('@g.us')) continue; // Ignore groups and status

        // 🛡️ STRICT RULE 1: Never reply to any message timestamped BEFORE the bot booted!
        const msgTime = Number(msg.messageTimestamp || 0);
        if (msgTime < botBootTimestamp) {
          // Past synced message from phone history — skip completely!
          continue;
        }

        // 🛡️ STRICT RULE 2: Ignore stale messages older than 90 seconds
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec - msgTime > 90) {
          continue;
        }

        // Extract message text
        const text = (
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          ''
        ).trim();

        if (!text) continue;

        const senderPhone = from.replace(/[^0-9]/g, '');
        const senderName = msg.pushName || ('Guest ' + senderPhone.slice(-4));

        await handleGuestMessage(from, senderPhone, senderName, text, msgTime);
      }
    });

  } catch (err) {
    console.error('❌ startWhatsApp error:', err);
    setTimeout(() => startWhatsApp(), 5000);
  } finally {
    isStarting = false;
  }
}

// ─── SMART AI AGENT FOR THE UNIQUE HAVEN HOMES ───
async function handleGuestMessage(fromJid, phone, name, text, msgTime, channel = 'baileys') {
  console.log(`📩 Incoming WhatsApp from ${phone} (${name}) via ${channel.toUpperCase()}: "${text}"`);

  // 1. Get or create conversation record
  let chat = chatsStore.get(phone);
  if (!chat) {
    chat = {
      phone,
      name,
      mode: 'ai', // default is 'ai' mode!
      channel,
      lastMessage: text,
      lastTime: new Date(msgTime * 1000).toISOString(),
      history: []
    };
    chatsStore.set(phone, chat);
  } else {
    chat.name = name || chat.name;
    chat.channel = channel || chat.channel;
    chat.lastMessage = text;
    chat.lastTime = new Date(msgTime * 1000).toISOString();
  }

  // Record incoming message to history
  chat.history.push({
    id: 'in_' + Date.now(),
    fromMe: false,
    text,
    time: new Date().toISOString()
  });
  if (chat.history.length > 50) chat.history.shift(); // keep last 50 messages
  saveChatsStore();

  // 2. CHECK MODE: If in Human Mode, DO NOT AUTO-REPLY!
  if (chat.mode === 'human') {
    console.log(`👤 [Human Mode Active] AI reply muted for ${phone}. Waiting for staff reply in CRM.`);
    return;
  }

  // 3. Debounce rapid identical messages (2 seconds debounce to prevent accidental double-tap)
  const lastReply = userLastReply.get(phone) || 0;
  const now = Date.now();
  const lower = text.toLowerCase();

  if (now - lastReply < 2000) {
    console.log(`⏳ Rapid message debounce active for ${phone}. Skipping.`);
    return;
  }

  // 4. GENERATE AI RESPONSE (Homestay Master Knowledge)
  let replyText = '';

  // Trigger Human Takeover via message
  if (lower.includes('human') || lower.includes('agent') || lower.includes('manager se baat') || lower.includes('praveen')) {
    chat.mode = 'human';
    saveChatsStore();
    replyText =
`👤 *Switched to Human Support Mode!*

Aapki chat ko hamare live property manager ko assign kar diya gaya hai.

📞 *Direct Support Contacts:*
• *Property Manager:* Praveen Singh — +91 9194109911
• *Company Owners:* Mr. Shahanshah (+91 94500 55554) | Mr. Firoz Khan (+91 82996 00709)

Hamari team aapse turant connect karegi. Aap apna requirement yahan likh sakte hain. 🙏`;

  } else if (lower.includes('availab') || lower.includes('booking') || lower.includes('chahiye') || lower.includes('khali') || lower.includes('book')) {
    replyText =
`🏡 *Haanji! The Unique Haven Homes me luxury villas aur apartments available hain!* ✨

Hum Lucknow me 100% verified, fully furnished private serviced stays provide karte hain:
• *3BHK Luxury Flats:* ₹3,499 – ₹3,999/night
• *3BHK Private Independent Villas:* ₹3,999 – ₹4,499/night
• *4BHK/5BHK Grand Villas:* ₹4,999 – ₹6,999/night

📅 *Aapki stay details kya hain?*
1. Check-in Date & Check-out Date?
2. Total kitne guests (adults/kids) hain?
3. Kaunsi location pasand hai (Gomti Nagar / Lulu Mall / Shaheed Path)?

Aap yahan dates batayein ya direct call karein:
📞 *Manager Praveen Singh:* +91 9194109911
🌐 *Live Property Showcase:* https://uniquehavenhomesstay.com/properties.html`;

  } else if (lower === '1' || lower.includes('villa') || lower.includes('flat') || lower.includes('property') || lower.includes('photos') || lower.includes('room') || lower.includes('catalog')) {
    replyText =
`🏨 *The Unique Haven Homes — Verified Homestays in Lucknow* ✨

🏡 *TOP LUXURY INDEPENDENT VILLAS:*
1. *The Yellow House* (3BHK Villa, Gomti Nagar) — ₹3,999/night
👉 https://uniquehavenhomesstay.com/the-yellow-house.html

2. *The Pink House* (5BR Luxury Villa, Lulu Mall) — ₹4,999/night
👉 https://uniquehavenhomesstay.com/the-pink-house.html

3. *The Green House* (3BR Private Villa, Gomti Nagar) — ₹3,999/night
👉 https://uniquehavenhomesstay.com/the-green-house.html

4. *Gomti Grand Villa* (4BHK Villa, Ekana Stadium) — ₹4,999/night
👉 https://uniquehavenhomesstay.com/gomti-grand-villa.html

🏢 *PREMIUM 3BHK APARTMENTS:*
• *Black Beauty* (3BHK Luxury Flat, Chinhat) — ₹3,499/night
👉 https://uniquehavenhomesstay.com/black-beauty.html

• *The Dark Blue* (3BHK Flat, Gomti Nagar) — ₹3,499/night
👉 https://uniquehavenhomesstay.com/the-dark-blue.html

• *Starlight Blue PentHouse* (Near Max Hospital) — ₹3,999/night
👉 https://uniquehavenhomesstay.com/starlight-blue-penthouse.html

🌐 *Browse All 14+ Properties & Photos:*
https://uniquehavenhomesstay.com/properties.html

_Reply *2* for Pricing, *3* for Check-in Rules, or *5* to speak with Manager._`;

  } else if (lower === '2' || lower.includes('rate') || lower.includes('price') || lower.includes('cost') || lower.includes('charges') || lower.includes('kitne ka')) {
    replyText =
`💰 *The Unique Haven Homes — Transparent Pricing Guide:*

• *3BHK Luxury Apartments:* ₹3,499 – ₹3,999 per night
• *3BHK Independent Villas:* ₹3,999 – ₹4,499 per night
• *4BHK & 5BHK Grand Villas:* ₹4,999 – ₹6,999 per night

✨ *Included Amenities:*
✔ High-Speed Wi-Fi
✔ Fully Equipped Kitchen & Gas
✔ Air-Conditioned Bedrooms
✔ 100% Power Backup & Geyser
✔ Caretaker Support & Daily Housekeeping

💳 *Booking Policy:* ₹2,000 to ₹5,000 advance payment secures your dates. Remaining balance payable at check-in.

Direct booking ke liye reply karein ya call karein: 📞 +91 9450055554`;

  } else if (lower === '3' || lower.includes('checkin') || lower.includes('check-in') || lower.includes('checkout') || lower.includes('rules') || lower.includes('id')) {
    replyText =
`📋 *Check-in Guidelines & Important House Rules:*

⏰ *Standard Timings:*
• Check-in Time: *02:00 PM*
• Check-out Time: *11:00 AM*
_(Early check-in subject to availability)_

🪪 *Mandatory Requirements:*
1. Original Govt ID (Aadhaar / Passport / DL) strictly required for all adult guests.
2. Quiet hours: Residential quiet hours after 11:00 PM.
3. Balance settlement: Any remaining balance is payable at check-in before key handover.`;

  } else if (lower === '4' || lower.includes('location') || lower.includes('map') || lower.includes('kaha') || lower.includes('address') || lower.includes('kahan')) {
    replyText =
`📍 *The Unique Haven Homes — Prime Lucknow Locations:*

🏢 Properties available at:
• *Gomti Nagar & Gomti Nagar Extension* (Near Shaheed Path)
• *Near Lulu Mall & Medanta Hospital*
• *Near Ekana International Cricket Stadium*
• *Chinhat & Faizabad Road*

📍 *Central Location Link:*
https://maps.google.com/?q=Lucknow+Homestays+Unique+Haven+Homes

Exact property pin drop check-in ke time manager dwara share ki jati hai.
📞 Need help with directions? Call: +91 9194109911`;

  } else if (lower === '5' || lower.includes('call') || lower.includes('owner') || lower.includes('contact') || lower.includes('number')) {
    replyText =
`📞 *Direct Management & Owner Contacts:*

👤 *Property Manager:*
• Praveen Singh: 📞 +91 9194109911

👑 *Company Owners:*
• Mr. Shahanshah: 📞 +91 94500 55554
• Mr. Firoz Khan: 📞 +91 82996 00709

Office: The Unique Haven Homes Pvt. Ltd., Lucknow
Website: https://uniquehavenhomesstay.com`;

  } else {
    // Default Warm Welcome Menu
    replyText =
`👋 *Hello ${name}! Welcome to The Unique Haven Homes.* 🏨✨
Luxury Serviced Homestays & Independent Villas in Lucknow.

Main aapka AI assistant hoon. Main aapki kya madad kar sakta hoon?

Reply with a number:
*1* 🏡 View Luxury Villas & Flats
*2* 💰 Pricing & Advance Booking
*3* 🔑 Check-in & House Rules
*4* 📍 Locations & Directions
*5* 👤 Speak with Property Manager

_Direct website: https://uniquehavenhomesstay.com_`;
  }

  // 5. Send AI Reply (Meta Cloud API or Baileys)
  try {
    let sentId = null;
    if (channel === 'meta') {
      const metaRes = await sendMetaMessage(phone, replyText);
      sentId = metaRes?.messages?.[0]?.id;
    } else if (sock) {
      const sent = await sock.sendMessage(fromJid, { text: replyText });
      sentId = sent?.key?.id;
    }
    userLastReply.set(phone, now);

    // Record AI reply in history
    chat.history.push({
      id: sentId || ('out_' + Date.now()),
      fromMe: true,
      text: replyText,
      time: new Date().toISOString()
    });
    if (chat.history.length > 50) chat.history.shift();
    saveChatsStore();

    console.log(`🤖 AI Auto-Replied to ${phone} via ${channel.toUpperCase()} successfully!`);
  } catch (err) {
    console.error(`❌ Failed to send AI auto-reply to ${phone} via ${channel}:`, err.message);
  }
}

// ─── HELPER: Format recipient JID ───
function formatJid(target) {
  let clean = String(target || '').trim();
  if (clean.includes('@g.us') || clean.includes('@s.whatsapp.net')) {
    return clean;
  }
  if (clean.includes('-') || clean.length >= 18) {
    return clean + '@g.us';
  }
  clean = clean.replace(/\D/g, '');
  if (clean.length === 10) clean = '91' + clean;
  return clean + '@s.whatsapp.net';
}

// ═══════════════════════════════════════════════════════════
// 🌐 REST API ENDPOINTS
// ═══════════════════════════════════════════════════════════

// 0. Root & Health
app.get('/', (req, res) => {
  res.json({
    name: 'TUHH WhatsApp AI & Automation Gateway (Dual: Meta Cloud API + Baileys)',
    status: connectionStatus,
    connected: connectionStatus === 'connected',
    metaConfigured: !!(META_ACCESS_TOKEN && META_PHONE_NUMBER_ID),
    metaPhoneNumberId: META_PHONE_NUMBER_ID,
    metaWabaId: META_WABA_ID,
    activeChats: chatsStore.size,
    bootTime: new Date(botBootTimestamp * 1000).toISOString(),
    time: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', connected: connectionStatus === 'connected' });
});

// 1. Connection Status
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    connected: connectionStatus === 'connected',
    user: sock?.user || null,
    activeChats: chatsStore.size,
    authExists: fs.existsSync(AUTH_FOLDER)
  });
});

// 2. JSON QR Status & Data (For In-CRM QR Modal)
app.get('/qr-data', async (req, res) => {
  let qrImage = null;
  if (lastQr) {
    try {
      qrImage = await QRCodeNode.toDataURL(lastQr, { margin: 2, width: 320 });
    } catch(e) {
      qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lastQr)}`;
    }
  }
  res.json({
    connected: connectionStatus === 'connected',
    status: connectionStatus,
    user: sock?.user || null,
    qr: lastQr || null,
    qrImage
  });
});

// 3. Disconnect / Switch WhatsApp Number
app.post('/logout', async (req, res) => {
  try {
    console.log('🔄 Logout requested. Disconnecting and clearing auth session...');
    lastQr = null;
    connectionStatus = 'disconnected';
    await cleanupSocket();

    if (fs.existsSync(AUTH_FOLDER)) {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    }
    setTimeout(() => {
      startWhatsApp().catch(err => console.error('Restart after logout error:', err));
    }, 1200);

    res.json({ ok: true, message: 'Logged out successfully. Fresh QR code is generating...' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 4. Web QR Code Viewer
app.get('/qr', async (req, res) => {
  if (connectionStatus === 'connected') {
    const userJid = sock?.user?.id || '';
    const phone = userJid.split(':')[0] || userJid.split('@')[0] || 'Unknown';
    return res.send(`
      <div style="font-family:system-ui,sans-serif;text-align:center;padding:50px;max-width:500px;margin:auto;">
        <div style="font-size:48px;margin-bottom:12px;">✅</div>
        <h2 style="color:#15803D;margin:0 0 8px 0;">WhatsApp Connected!</h2>
        <p style="font-size:16px;color:#1E293B;">Connected Number: <b>+${phone}</b></p>
        <p style="color:#64748B;font-size:13px;">AI Agent &amp; Gateway are LIVE 24x7.</p>
        <div style="margin-top:24px;">
          <form method="POST" action="/logout" onsubmit="return confirm('Disconnect this number to scan a different one?');">
            <button type="submit" style="background:#DC2626;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;">
              🔄 Disconnect &amp; Switch Number
            </button>
          </form>
        </div>
      </div>
    `);
  }
  if (!lastQr) {
    return res.send(`
      <div style="font-family:system-ui,sans-serif;text-align:center;padding:50px;">
        <div style="font-size:36px;margin-bottom:10px;">⏳</div>
        <h2>Initializing WhatsApp Client...</h2>
        <p style="color:#64748B;">Please wait, fresh QR code is being generated...</p>
        <script>setTimeout(()=>location.reload(), 2500);</script>
      </div>
    `);
  }
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCodeNode.toDataURL(lastQr, { margin: 2, width: 300 });
  } catch(e) {
    qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lastQr)}`;
  }
  res.send(`
    <div style="font-family:system-ui,sans-serif;text-align:center;padding:40px;max-width:500px;margin:auto;">
      <h2 style="color:#0F172A;margin-bottom:6px;">📱 Link WhatsApp with TUHH CRM</h2>
      <p style="color:#64748B;font-size:13px;margin-top:0;">Open WhatsApp on phone → <b>Linked Devices</b> → <b>Link a Device</b></p>
      <div style="display:inline-block;padding:16px;background:#fff;border:2px solid #CBD5E1;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,0.08);margin:14px 0;">
        <img src="${qrDataUrl}" alt="WhatsApp QR Code" style="width:280px;height:280px;display:block;" />
      </div>
      <p style="color:#64748B;font-size:12px;">⏳ Auto-refreshes when scanned from your phone.</p>
      <script>
        setInterval(async () => {
          const r = await fetch('/status');
          const d = await r.json();
          if (d.connected) location.reload();
        }, 2000);
      </script>
    </div>
  `);
});

// ═══════════════════════════════════════════════════════════
// 🤖 AI & HUMAN CHAT DASHBOARD API (As shown in video!)
// ═══════════════════════════════════════════════════════════

// 5. Get All Conversations (with Mode: 'ai' or 'human')
app.get('/api/chats', (req, res) => {
  const list = Array.from(chatsStore.values()).map(c => ({
    phone: c.phone,
    name: c.name,
    mode: c.mode || 'ai',
    lastMessage: c.lastMessage || '',
    lastTime: c.lastTime || '',
    messageCount: c.history?.length || 0
  })).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));

  res.json({ ok: true, count: list.length, chats: list });
});

// 6. Get Chat History for a Specific Guest
app.get('/api/chat/:phone', (req, res) => {
  const phone = req.params.phone.replace(/\D/g, '');
  const chat = chatsStore.get(phone);
  if (!chat) {
    return res.status(404).json({ ok: false, error: 'Chat not found for this phone' });
  }
  res.json({ ok: true, chat });
});

// 7. Toggle Mode: AI Mode vs Human Mode!
app.post('/api/chat/mode', (req, res) => {
  const { phone, mode } = req.body;
  if (!phone || !['ai', 'human'].includes(mode)) {
    return res.status(400).json({ ok: false, error: 'Valid phone and mode ("ai" | "human") required.' });
  }
  const cleanPhone = String(phone).replace(/\D/g, '');
  let chat = chatsStore.get(cleanPhone);
  if (!chat) {
    chat = {
      phone: cleanPhone,
      name: 'Guest ' + cleanPhone.slice(-4),
      mode,
      lastMessage: '',
      lastTime: new Date().toISOString(),
      history: []
    };
    chatsStore.set(cleanPhone, chat);
  } else {
    chat.mode = mode;
  }
  saveChatsStore();
  console.log(`🔀 Switched chat for ${cleanPhone} to [${mode.toUpperCase()} MODE]`);
  res.json({ ok: true, phone: cleanPhone, mode: chat.mode });
});

// 8. Staff Manual Reply from Dashboard (Human Mode)
app.post('/api/chat/send', async (req, res) => {
  const { to, message, keepAIMode, channel } = req.body;
  if (!to || !message) {
    return res.status(400).json({ ok: false, error: 'Recipient "to" and "message" are required.' });
  }

  const cleanPhone = String(to).replace(/\D/g, '');
  let sentVia = 'baileys';
  let messageId = null;

  try {
    // Determine channel: send via Meta if requested, or if Baileys is not connected, or if channel is meta
    const existingChat = chatsStore.get(cleanPhone);
    const targetChannel = channel || existingChat?.channel || (META_ACCESS_TOKEN && connectionStatus !== 'connected' ? 'meta' : 'baileys');

    if (targetChannel === 'meta' && META_ACCESS_TOKEN) {
      const resMeta = await sendMetaMessage(cleanPhone, message);
      sentVia = 'meta';
      messageId = resMeta?.messages?.[0]?.id;
    } else if (sock && connectionStatus === 'connected') {
      const jid = formatJid(cleanPhone);
      const result = await sock.sendMessage(jid, { text: message });
      sentVia = 'baileys';
      messageId = result?.key?.id;
    } else if (META_ACCESS_TOKEN) {
      const resMeta = await sendMetaMessage(cleanPhone, message);
      sentVia = 'meta';
      messageId = resMeta?.messages?.[0]?.id;
    } else {
      return res.status(503).json({ ok: false, error: 'Neither Meta WhatsApp Cloud API nor QR connection is active.' });
    }

    // Update chat history
    let chat = chatsStore.get(cleanPhone);
    if (!chat) {
      chat = {
        phone: cleanPhone,
        name: 'Guest ' + cleanPhone.slice(-4),
        mode: keepAIMode ? 'ai' : 'human',
        channel: sentVia,
        lastMessage: message,
        lastTime: new Date().toISOString(),
        history: []
      };
      chatsStore.set(cleanPhone, chat);
    } else {
      if (!keepAIMode) chat.mode = 'human'; // Staff replied manually, switch to human mode
      chat.channel = sentVia;
      chat.lastMessage = message;
      chat.lastTime = new Date().toISOString();
    }

    chat.history.push({
      id: messageId || ('out_' + Date.now()),
      fromMe: true,
      text: message,
      time: new Date().toISOString()
    });
    if (chat.history.length > 50) chat.history.shift();
    saveChatsStore();

    res.json({
      ok: true,
      messageId,
      phone: cleanPhone,
      mode: chat.mode,
      sentVia
    });
  } catch (err) {
    console.error(`❌ Error sending manual reply to ${to}:`, err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── META WEBHOOK VERIFICATION (GET) ───
app.get(['/api/whatsapp/webhook', '/webhook'], (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    console.log('✅ Meta Webhook challenge verified successfully!');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ─── META INCOMING MESSAGE WEBHOOK (POST) ───
app.post(['/api/whatsapp/webhook', '/webhook'], async (req, res) => {
  res.sendStatus(200); // Meta expects 200 fast

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const val = change?.value;
    const statuses = val?.statuses;
    if (statuses && statuses.length) {
      for (const s of statuses) {
        console.log(`📊 [Meta Delivery Status] ID: ${s.id} | Status: ${s.status} | Recipient: ${s.recipient_id}`, s.errors ? JSON.stringify(s.errors) : '');
      }
    }

    const messages = val?.messages;
    if (!messages || !messages.length) return;

    for (const m of messages) {
      const from = m.from; // Sender phone number
      const contact = val?.contacts?.find(c => c.wa_id === from);
      const name = contact?.profile?.name || ('Guest ' + from.slice(-4));
      const msgTime = parseInt(m.timestamp, 10) || Math.floor(Date.now() / 1000);

      let text = '';
      if (m.type === 'text') {
        text = m.text?.body || '';
      } else if (m.type === 'interactive') {
        text = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
      } else if (m.type === 'button') {
        text = m.button?.text || '';
      }

      text = text.trim();
      if (!text) continue;

      console.log(`📡 [Meta Webhook] Incoming message from ${from} (${name}): "${text}"`);
      await handleGuestMessage(`meta_${from}`, from, name, text, msgTime, 'meta');
    }
  } catch (err) {
    console.error('❌ Error handling Meta webhook message:', err);
  }
});

// ─── META DIRECT SEND API ───
app.post('/api/whatsapp/send-meta', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ ok: false, error: 'Recipient "to" and "message" are required.' });
  }
  try {
    const result = await sendMetaMessage(to, message);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 9. Standard Send Message API (With Smart Dual-Engine Fallback)
app.post('/send-message', async (req, res) => {
  const { to, message, isGroup } = req.body;
  if (!to || !message) {
    return res.status(400).json({ ok: false, error: 'Target (to) and message text are required.' });
  }

  const isGroupMsg = !!isGroup || String(to).includes('@g.us') || String(to).includes('-');

  // 🛡️ DUAL-ENGINE FALLBACK: If Baileys is offline and recipient is a guest/individual phone:
  if (!isGroupMsg && (connectionStatus !== 'connected' || !sock) && META_ACCESS_TOKEN) {
    try {
      console.log(`🔀 Baileys offline. Smart failover: Sending guest message to ${to} via Meta Cloud API...`);
      const metaRes = await sendMetaMessage(to, message);
      return res.json({
        ok: true,
        messageId: metaRes?.messages?.[0]?.id,
        sentVia: 'meta_fallback',
        recipient: to,
        timestamp: new Date().toISOString()
      });
    } catch(mErr) {
      console.warn('⚠️ Meta fallback attempt error:', mErr.message);
    }
  }

  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({ ok: false, error: 'WhatsApp sender is not connected. Please scan QR in WhatsApp Hub.' });
  }

  try {
    const jid = formatJid(to);
    const result = await sock.sendMessage(jid, { text: message });

    const cleanPhone = String(to).replace(/\D/g, '');
    let chat = chatsStore.get(cleanPhone);
    if (chat) {
      chat.history.push({
        id: result?.key?.id || ('out_' + Date.now()),
        fromMe: true,
        text: message,
        time: new Date().toISOString()
      });
      if (chat.history.length > 50) chat.history.shift();
      saveChatsStore();
    }

    res.json({
      ok: true,
      messageId: result?.key?.id,
      recipient: jid,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`❌ Failed sending message to ${to}:`, err);

    // Secondary fallback for individual phone if Baileys threw socket error
    if (!isGroupMsg && META_ACCESS_TOKEN) {
      try {
        console.log(`🔀 Secondary fallback: Retrying ${to} via Meta Cloud API...`);
        const metaRes = await sendMetaMessage(to, message);
        return res.json({
          ok: true,
          messageId: metaRes?.messages?.[0]?.id,
          sentVia: 'meta_fallback',
          recipient: to,
          timestamp: new Date().toISOString()
        });
      } catch (e) {}
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// 10. Send Group Message
app.post('/send-group', async (req, res) => {
  const { groupId, message } = req.body;
  if (!groupId || !message) {
    return res.status(400).json({ ok: false, error: 'groupId and message are required.' });
  }
  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({ ok: false, error: 'WhatsApp is not connected.' });
  }

  const to = groupId.includes('@g.us') ? groupId : (groupId + '@g.us');
  try {
    const result = await sock.sendMessage(to, { text: message });
    res.json({
      ok: true,
      messageId: result?.key?.id,
      recipient: to,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`❌ Failed sending group message to ${to}:`, err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 11. List WhatsApp Groups
app.get('/groups', async (req, res) => {
  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({ ok: false, error: 'WhatsApp is not connected yet.' });
  }
  try {
    const groupData = await sock.groupFetchAllParticipating();
    const groups = Object.values(groupData).map(g => ({
      id: g.id,
      subject: g.subject,
      size: g.participants?.length || 0,
      creation: g.creation,
      owner: g.owner
    }));
    res.json({ ok: true, count: groups.length, groups });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── START SERVER & DAEMON ───
app.listen(PORT, () => {
  console.log(`\n🚀 TUHH WhatsApp AI Gateway running on http://localhost:${PORT}`);
  console.log(`👉 Open http://localhost:${PORT}/qr to scan QR code in browser\n`);
  startWhatsApp().catch(err => console.error('Startup error:', err));
});
