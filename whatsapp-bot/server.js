/**
 * UHHS WhatsApp Automation Gateway
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 * Powered by Baileys (Headless WhatsApp Web Protocol - 100% Free, Zero Meta API Cost)
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
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const AUTH_FOLDER = path.join(__dirname, 'auth_session');

let sock = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
let lastQr = null;

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📡 Starting WhatsApp Client (Baileys v${version.join('.')}, isLatest: ${isLatest})...`);

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['UHHS CRM Gateway', 'Chrome', '1.0.0']
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      lastQr = qr;
      connectionStatus = 'connecting';
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📱 SCAN THIS QR CODE WITH WHATSAPP ON YOUR PHONE:');
      console.log('   (Open WhatsApp -> Linked Devices -> Link a Device)');
      console.log('   Or view in browser: http://localhost:' + PORT + '/qr');
      console.log('═══════════════════════════════════════════════════════\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`❌ WhatsApp connection closed (Reason: ${statusCode}). Reconnecting: ${shouldReconnect}`);
      connectionStatus = 'disconnected';
      lastQr = null;
      if (shouldReconnect) {
        setTimeout(startWhatsApp, 3000);
      } else {
        console.log('🚪 Logged out. Delete auth_session folder and restart to scan new QR.');
      }
    } else if (connection === 'open') {
      connectionStatus = 'connected';
      lastQr = null;
      console.log('✅ WHATSAPP CONNECTED SUCCESSFULLY!');
      console.log('👤 Connected as:', sock.user?.id || sock.user?.name);
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// ─── HELPER: Format recipient JID ───
function formatJid(target) {
  let clean = String(target || '').trim();
  if (clean.includes('@g.us') || clean.includes('@s.whatsapp.net')) {
    return clean;
  }
  // Group pattern (digits followed by hyphen or long digits)
  if (clean.includes('-') || clean.length >= 18) {
    return clean + '@g.us';
  }
  // Standard phone number
  clean = clean.replace(/\D/g, '');
  if (clean.length === 10) clean = '91' + clean;
  return clean + '@s.whatsapp.net';
}

// ─── API ENDPOINTS ───

// 1. Health & Connection Status
app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    connected: connectionStatus === 'connected',
    user: sock?.user || null,
    authExists: fs.existsSync(AUTH_FOLDER)
  });
});

// 2. JSON QR Status & Data (For CRM Embedded QR modal / tab)
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

// 2b. Disconnect / Switch WhatsApp Number
app.post('/logout', async (req, res) => {
  try {
    console.log('🔄 Logout requested. Disconnecting and clearing auth session...');
    lastQr = null;
    connectionStatus = 'disconnected';
    if (sock) {
      try { await sock.logout(); } catch(e) {}
      try { sock.end(undefined); } catch(e) {}
      sock = null;
    }
    // Delete auth session folder
    if (fs.existsSync(AUTH_FOLDER)) {
      fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
    }
    // Restart WhatsApp client to generate a fresh QR code
    setTimeout(() => {
      startWhatsApp().catch(err => console.error('Restart after logout error:', err));
    }, 1200);
    res.json({ ok: true, message: 'Logged out successfully. Fresh QR code is generating...' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 2c. Web QR Code Viewer (if viewing via browser)
app.get('/qr', async (req, res) => {
  if (connectionStatus === 'connected') {
    const userJid = sock?.user?.id || '';
    const phone = userJid.split(':')[0] || userJid.split('@')[0] || 'Unknown';
    return res.send(`
      <div style="font-family:system-ui,sans-serif;text-align:center;padding:50px;max-width:500px;margin:auto;">
        <div style="font-size:48px;margin-bottom:12px;">✅</div>
        <h2 style="color:#15803D;margin:0 0 8px 0;">WhatsApp Connected!</h2>
        <p style="font-size:16px;color:#1E293B;">Connected Number: <b>+${phone}</b></p>
        <p style="color:#64748B;font-size:13px;">Ready to send automated messages from UHHS CRM.</p>
        <div style="margin-top:24px;">
          <form method="POST" action="/logout" onsubmit="return confirm('Disconnect this number to scan a different one?');">
            <button type="submit" style="background:#DC2626;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;">
              🔄 Disconnect & Switch Number
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
      <h2 style="color:#0F172A;margin-bottom:6px;">📱 Link WhatsApp with UHHS CRM</h2>
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

// 3. List All WhatsApp Groups (Helps owner copy Group IDs easily!)
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

// 4. Send Message (Direct chat or Group chat)
app.post('/send-message', async (req, res) => {
  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({ ok: false, error: 'WhatsApp is not connected. Please scan QR first.' });
  }

  const { to, message, isGroup } = req.body;
  if (!to || !message) {
    return res.status(400).json({ ok: false, error: 'Target (to) and message text are required.' });
  }

  try {
    const jid = formatJid(to);
    console.log(`📤 Sending message to ${jid} (isGroup: ${!!isGroup})...`);

    const result = await sock.sendMessage(jid, { text: message });
    console.log(`✅ Message delivered to ${jid}! Message ID: ${result?.key?.id}`);

    res.json({
      ok: true,
      messageId: result?.key?.id,
      recipient: jid,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`❌ Failed sending message to ${to}:`, err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 5. Send Specifically to a Group
app.post('/send-group', async (req, res) => {
  const { groupId, message } = req.body;
  if (!groupId || !message) {
    return res.status(400).json({ ok: false, error: 'groupId and message are required.' });
  }
  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({ ok: false, error: 'WhatsApp is not connected. Please scan QR first.' });
  }

  const to = groupId.includes('@g.us') ? groupId : (groupId + '@g.us');
  try {
    console.log(`📤 Sending group message to ${to}...`);
    const result = await sock.sendMessage(to, { text: message });
    console.log(`✅ Group message delivered to ${to}! Message ID: ${result?.key?.id}`);
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

// Start Server & Initialize WhatsApp
app.listen(PORT, () => {
  console.log(`\n🚀 UHHS WhatsApp Gateway running on http://localhost:${PORT}`);
  console.log(`👉 Open http://localhost:${PORT}/qr to scan QR code in browser\n`);
  startWhatsApp().catch(err => console.error('Startup error:', err));
});
