// ═══════════════════════════════════════════════════════════
// 📱 WHATSAPP AUTOMATION & COMMUNICATION HUB v2
// THE UNIQUE HAVEN HOMES PRIVATE LIMITED
// Supports: Free Headless Gateway (Baileys), Groups (@g.us),
// Master ON/OFF Switch & Live Automated Dispatches
// ═══════════════════════════════════════════════════════════

(function() {
  const WA_LOCAL_CONFIG_KEY = 'uhhs_wa_clean_v8';
  const WA_LOCAL_LOGS_KEY = 'uhhs_wa_logs_v2';

  const DEFAULT_WA_CONFIG = {
    auto_send_enabled: true, // 🟢 1-BUTTON MASTER AUTOMATION (ON/OFF)
    gateway_url: 'http://localhost:3000',
    gateway_type: 'baileys',
    meta_phone_number_id: '',
    meta_waba_id: '',
    meta_access_token: '',
    meta_verify_token: 'uhhs_meta_secure_2026',

    // 3 Essential Auto-Dispatches for New Bookings
    send_welcome: false, // 🔑 Direct Guest Booking Pass (OFF by default — only fires if explicitly enabled)
    send_booking_group: true, // 🛎️ 📒Booking Data Group Alert (ON by default)
    send_investor_booking: false, // 💼 Property Investor Group Alert (OFF by default — only fires if enabled)
    send_housekeeping_checkout: false, // OFF
    send_investor_reports: false, // OFF
    send_arrival: false, // OFF
    send_checkout: false, // OFF

    // Group Identifiers (Auto-discovered from your WhatsApp)
    booking_group_id: '120363425834560086@g.us', // 📒Booking Data
    housekeeping_group_id: '120363426832875312@g.us', // Chinhat All booking offline
    investor_groups: {
      // Room IDs
      'VIL-105': '120363427551867491@g.us', // The Yellow House -> UHHS Owners Group
      'VIL-103': '120363427551867491@g.us', // The Pink House -> UHHS Owners Group
      'VIL-104': '120363427551867491@g.us', // The Green House -> UHHS Owners Group
      'VIL-106': '120363427551867491@g.us', // Green forest View -> UHHS Owners Group
      'VIL-107': '120363427551867491@g.us', // The Velvet House -> UHHS Owners Group
      'LUL-101': '120363427551867491@g.us', // The Luxe Haven (1BHK) -> UHHS Owners Group (Firoz & Shahenshah)
      'LUL-402': '120363427551867491@g.us', // Celebrity Garden -> UHHS Owners Group
      'VIL-103': '120363427551867491@g.us', // The Pink House -> UHHS Owners Group
      'VIL-104': '120363427551867491@g.us', // The Green House -> UHHS Owners Group
      'VIL-105': '120363427551867491@g.us', // The Yellow House -> UHHS Owners Group
      'VIL-106': '120363427551867491@g.us', // Green Forest View -> UHHS Owners Group (Firoz & Shahenshah)
      'VIL-107': '120363427551867491@g.us', // The Velvet House -> UHHS Owners Group (Firoz & Shahenshah)
      'VIL-108': '120363427551867491@g.us', // Pink Paradise Villa -> UHHS Owners Group (Firoz & Shahenshah)
      'VIL-101': '120363412244446528@g.us', // Gomti Grand Villa -> Afzal & Hazi Group
      'VIL-102': '120363412244446528@g.us', // Royal White House -> Afzal & Hazi Group
      'GOM-102': '120363427249232463@g.us', // Black Beauty -> Alam Sahab
      'GOM-302': '120363427249232463@g.us', // The Unique -> Alam Sahab
      'GOM-201': '120363430510952329@g.us', // The Dark Blue -> Sabir Bhai
      'GOM-101': '120363411536897935@g.us', // RedRose Palace -> Afzal Khan
      'GOM-202': '120363412078246077@g.us', // The Brown -> Ammy Papa
      'GOM-301': '120363409825792343@g.us', // The Light Green -> Shanu Bhaijaan
      'GOM-401': '120363426678446574@g.us', // The Nawabi Stay -> Sanaul Mustafa
      'GOM-501': '120363411439466222@g.us', // Starlight Blue PentHouse -> Shahil Khan

      // Property & Group Names
      'UHHS Owners Group': '120363427551867491@g.us',
      'The Luxe Haven': '120363427551867491@g.us',
      'Pink Paradise Villa': '120363427551867491@g.us',
      'Pink Paradise': '120363427551867491@g.us',
      'Green Forest View': '120363427551867491@g.us',
      'Green Forest': '120363427551867491@g.us',
      'The Velvet House': '120363427551867491@g.us',
      'Velvet House': '120363427551867491@g.us',
      'The Yellow House': '120363427551867491@g.us',
      'The Green House': '120363427551867491@g.us',
      'The Pink House': '120363427551867491@g.us',
      'Yellow House': '120363427551867491@g.us',
      'Firoz& Shahenshah': '120363427551867491@g.us',
      'Firoz & Shahenshah': '120363427551867491@g.us',
      'UHHS — Sabir Bhai': '120363430510952329@g.us',
      'Sabir Bhai': '120363430510952329@g.us',
      'UHHS — Afzal & Hazi Group': '120363412244446528@g.us',
      'Afzal & Hazi Group': '120363412244446528@g.us',
      'UHHS — Alam Sahab': '120363427249232463@g.us',
      'Alam Sahab': '120363427249232463@g.us',
      'UHHS — Sanaul Mustafa': '120363426678446574@g.us',
      'Sanaul Mustafa': '120363426678446574@g.us',
      'UHHS — Afzal Khan': '120363411536897935@g.us',
      'Afzal Khan': '120363411536897935@g.us',
      'UHHS — Ammy Papa': '120363412078246077@g.us',
      'Ammy Papa': '120363412078246077@g.us',
      'UHHS — Shanu Bhaijaan': '120363409825792343@g.us',
      'Shanu Bhaijaan': '120363409825792343@g.us',
      'UHHS — Shahil Khan': '120363411439466222@g.us',
      'Shahil Khan': '120363411439466222@g.us'
    },

    // Schedules
    checkout_send_hour: 10, // 10:00 AM
    arrival_before_minutes: 60
  };

  const HUB = {
    config: { ...DEFAULT_WA_CONFIG },
    templates: [],
    logs: [],
    scheduled: [],
    activeTab: 'settings', // ⚙️ Default to WhatsApp Automation & Groups
    scheduler: null,
    gatewayConnected: false,
    gatewayUser: null
  };

  window.setHubTab = function(tab) {
    HUB.activeTab = tab;
    document.querySelectorAll('.hub-tab-pill').forEach(btn => {
      if (btn.dataset.tab === tab) {
        btn.classList.add('active');
        try { btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch(e) {}
      } else {
        btn.classList.remove('active');
      }
    });
    renderHubBody();
  };

  // ─── Dual-Layer Config: LocalStorage + Mac Mini Gateway API ───
  function getLocalConfig() {
    try {
      const raw = localStorage.getItem(WA_LOCAL_CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setLocalConfig(c) {
    try {
      localStorage.setItem(WA_LOCAL_CONFIG_KEY, JSON.stringify(c));
    } catch (e) {}
    try {
      const gwUrl = (c?.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');
      fetch(gwUrl + '/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c)
      }).catch(() => {});
    } catch (e) {}
  }

  async function saveCloudAndLocalConfig(c) {
    setLocalConfig(c);
    // Realtime Cloud Persistence across all devices via Supabase app_settings
    try {
      if (window.sb) {
        await sb.from('app_settings').upsert({
          key: 'whatsapp_hub_config',
          value: JSON.stringify(c),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      }
    } catch (e) {
      console.warn('⚠️ Cloud sync error for whatsapp_hub_config:', e);
    }
  }

  async function loadConfig() {
    HUB.config = { ...DEFAULT_WA_CONFIG };

    // 1. Fetch Cloud Config from Supabase app_settings (Single Source of Truth across all devices)
    let cloudCfg = null;
    try {
      if (window.sb) {
        const { data, error } = await sb.from('app_settings')
          .select('value')
          .eq('key', 'whatsapp_hub_config')
          .limit(1);
        if (!error && data && data[0] && data[0].value) {
          const parsed = JSON.parse(data[0].value);
          if (parsed && typeof parsed === 'object') cloudCfg = parsed;
        }
      }
    } catch (e) { console.warn('Supabase config load fallback:', e); }

    // 2. Check local server (Mac Mini / Baileys Gateway)
    let serverCfg = null;
    try {
      const gwUrl = (DEFAULT_WA_CONFIG.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');
      const res = await fetch(gwUrl + '/api/config');
      if (res.ok) {
        const d = await res.json();
        if (d.ok && d.config && typeof d.config === 'object') {
          serverCfg = d.config;
        }
      }
    } catch (e) {}

    const localSaved = getLocalConfig();
    const merged = {
      ...DEFAULT_WA_CONFIG,
      ...(serverCfg || {}),
      ...(localSaved || {}),
      ...(cloudCfg || {})
    };

    HUB.config = merged;

    // Strict preservation of explicit booleans
    if (HUB.config.auto_send_enabled === undefined) HUB.config.auto_send_enabled = true;
    if (HUB.config.send_welcome === undefined) HUB.config.send_welcome = false;
    if (HUB.config.send_booking_group === undefined) HUB.config.send_booking_group = true;
    if (HUB.config.send_investor_booking === undefined) HUB.config.send_investor_booking = false;

    if (!HUB.config.booking_group_id) {
      HUB.config.booking_group_id = DEFAULT_WA_CONFIG.booking_group_id;
    }
    if (!HUB.config.gateway_url || HUB.config.gateway_url.includes('onrender.com')) {
      HUB.config.gateway_url = 'http://localhost:3000';
    }
    delete HUB.config.dry_run_mode;
    setLocalConfig(HUB.config);
    startGatewayKeepAlive();
    return HUB.config;
  }

  // ─── 24/7 Gateway Heartbeat Keeper (Prevents Render Free Tier from Sleeping) ───
  function startGatewayKeepAlive() {
    if (window._waGatewayPingInterval) return;
    window._waGatewayPingInterval = setInterval(async () => {
      try {
        const gwUrl = (HUB.config?.gateway_url || 'https://uhhs-whatsapp-bot.onrender.com').replace(/\/+$/, '');
        await fetch(gwUrl + '/health');
      } catch (e) {}
    }, 4 * 60 * 1000);
  }

  // ─── Dual-Layer Logs ───
  function getLocalLogs() {
    try {
      const raw = localStorage.getItem(WA_LOCAL_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function appendLocalLog(entry) {
    try {
      const list = getLocalLogs();
      list.unshift(entry);
      localStorage.setItem(WA_LOCAL_LOGS_KEY, JSON.stringify(list.slice(0, 200)));
    } catch (e) {}
  }

  async function loadLogs(limit = 100) {
    const local = getLocalLogs();
    let dbLogs = [];

    // 1. Fetch live persistent logs from Mac Mini / active Gateway API
    const gwCandidates = [
      (HUB.config?.gateway_url || 'http://localhost:3000').replace(/\/+$/, ''),
      'http://localhost:3000'
    ];
    for (const gwUrl of [...new Set(gwCandidates)]) {
      try {
        const res = await fetch(gwUrl + '/api/audit-logs');
        if (res.ok) {
          const d = await res.json();
          if (d.ok && Array.isArray(d.logs) && d.logs.length > 0) {
            dbLogs = d.logs;
            break;
          }
        }
      } catch (e) {}
    }

    // 2. Fetch Supabase logs if accessible
    try {
      if (window.sb) {
        const { data } = await sb.from('whatsapp_log').select('*').order('sent_at', { ascending: false }).limit(limit);
        if (data && data.length) dbLogs = dbLogs.concat(data);
      }
    } catch (e) {}

    // Merge logs deduplicating by ID or timestamp+phone
    const map = new Map();
    dbLogs.forEach(l => map.set(l.id || `${l.sent_at}_${l.phone}`, l));
    local.forEach(l => {
      const k = l.id || `${l.sent_at}_${l.phone}`;
      if (!map.has(k)) map.set(k, l);
    });

    const clearedAt = parseInt(localStorage.getItem('uhhs_wa_logs_cleared_at') || '0', 10);
    let merged = Array.from(map.values());
    if (clearedAt > 0) {
      merged = merged.filter(l => {
        const t = new Date(l.sent_at || 0).getTime();
        return t > clearedAt;
      });
    }

    HUB.logs = merged.sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0));
    return HUB.logs;
  }

  window.clearAllWhatsAppLogs = async function() {
    if (!confirm('Are you sure you want to delete all previous message logs? This will reset the message counter to 0.')) return;
    const now = Date.now();
    localStorage.setItem(WA_LOCAL_LOGS_KEY, '[]');
    localStorage.setItem('uhhs_wa_logs_cleared_at', String(now));
    HUB.logs = [];

    const gwCandidates = [
      (HUB.config?.gateway_url || 'http://localhost:3000').replace(/\/+$/, ''),
      'http://localhost:3000'
    ];
    for (const gwUrl of [...new Set(gwCandidates)]) {
      try {
        await fetch(gwUrl + '/api/audit-logs/clear', { method: 'POST' });
      } catch (e) {}
    }

    const el = document.getElementById('hubBody');
    if (el && HUB.activeTab === 'log') el.innerHTML = renderLogTab();
    if (window.fsn?.toast) fsn.toast('🗑️ All previous message logs have been deleted successfully!');
  };

  // ─── Load templates ───
  const BUILTIN_TEMPLATES = [
    {
      template_name: 'guest_confirmation',
      display_name: '🎉 New Booking Confirmation (Guest)',
      auto_send: true,
      body_text: 'Hi {{1}}, welcome to Unique Haven Homes Stay! 🎉\n\nYour booking is confirmed:\n📍 Property: {{2}}\n📅 Check-in: {{3}}\n📅 Check-out: {{4}}\n\nWe\'ll send arrival details 1 hour before your check-in with WiFi and key info.\n\nFor any query: 9450055554 / 8299600709'
    },
    {
      template_name: 'booking_group_alert',
      display_name: '🚨 New Booking Alert (Booking Group)',
      auto_send: true,
      body_text: '🛎️ *NEW BOOKING CONFIRMED!*\n━━━━━━━━━━━━━━━━━━\n🏠 *Property:* {{1}}\n👤 *Guest:* {{2}}\n📅 *Check-in:* {{3}}\n📅 *Check-out:* {{4}} ({{5}} Nights)\n🏷️ *Source:* {{6}}\n💰 *Amount:* {{7}}\n━━━━━━━━━━━━━━━━━━\n_The Unique Haven Homes CRM_'
    },
    {
      template_name: 'housekeeping_checkout',
      display_name: '🧹 10:00 AM Checkout Alert (Housekeeping Group)',
      auto_send: true,
      body_text: '🧹 *TODAY\'S CHECKOUT & CLEANING ALERT*\n━━━━━━━━━━━━━━━━━━\n{{1}}\n━━━━━━━━━━━━━━━━━━\n⚡ _Please prepare rooms for incoming guests by 2:00 PM._'
    },
    {
      template_name: 'investor_report',
      display_name: '📊 Monthly Statement (Investor Group)',
      auto_send: true,
      body_text: '📊 *MONTHLY INVESTOR STATEMENT — {{1}}*\n━━━━━━━━━━━━━━━━━━\n👤 *Investor:* {{2}}\n🏠 *Property:* {{3}}\n💵 *Gross Revenue:* ₹{{4}}\n📉 *Expenses & Ops:* -₹{{5}}\n━━━━━━━━━━━━━━━━━━\n💰 *NET PAYOUT:* ₹{{6}}\n━━━━━━━━━━━━━━━━━━\n_Generated via TUHH CRM_'
    },
    {
      template_name: 'new_booking_investor',
      display_name: '💼 Investor Booking Update (Short & Private)',
      auto_send: true,
      body_text: 'Booking Update\n\nProperty: {{1}}\nBooking: {{2}}\nCheck-in: {{3}}\nCheck-out: {{4}}\nNights: {{5}}\nAmount: ₹{{6}}\n\nThe Unique Haven Homes Property Management'
    },
    {
      template_name: 'arrival_details',
      display_name: '🔑 Arrival Details & WiFi Pass',
      auto_send: true,
      body_text: 'Dear {{1}},\nWelcome to *{{2}}* ({{3}})!\nYour check-in is ready.\n\n📍 Location: https://maps.google.com\n🔑 WiFi Password: {{4}}\n🔐 Door Code / Keys: {{5}}\n\nFor any query: 9450055554 / 8299600709\n_The Unique Haven Homes_'
    },
    {
      template_name: 'checkout_reminder',
      display_name: '👋 10:00 AM Checkout Reminder (Guest)',
      auto_send: true,
      body_text: 'Good morning {{1}},\nHope you had a wonderful stay at *{{2}}*!\n\nThis is a gentle reminder that checkout is today at *11:00 AM*.\n\nFor any query: 9450055554 / 8299600709\nThank you for choosing The Unique Haven Homes!'
    }
  ];

  async function loadTemplates() {
    let dbTemplates = [];
    try {
      if (window.sb) {
        const { data } = await sb.from('whatsapp_templates').select('*');
        if (data && data.length > 0) dbTemplates = data;
      }
    } catch (e) {}

    const map = new Map();
    BUILTIN_TEMPLATES.forEach(t => map.set(t.template_name, t));
    dbTemplates.forEach(t => map.set(t.template_name, t));
    HUB.templates = Array.from(map.values());
    return HUB.templates;
  }

  // ─── Fetch scheduled messages (next 24hrs) ───
  async function fetchScheduled() {
    if (!HUB.config) return [];
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const today = now.toISOString().slice(0, 10);
    const tomorrow = in24h.toISOString().slice(0, 10);

    let bookings = [];
    let checkoutBks = [];
    try {
      if (window.sb) {
        const { data: b1 } = await sb.from('guest_register')
          .select('booking_id, guest_name, phone, check_in, check_in_time, check_out, check_out_time, room_id, rooms(nickname, unit_no, property_name)')
          .gte('check_in', today)
          .lte('check_in', tomorrow)
          .neq('is_cancelled', true);
        bookings = b1 || [];

        const { data: b2 } = await sb.from('guest_register')
          .select('booking_id, guest_name, phone, check_in, check_out, check_out_time, room_id, rooms(nickname, unit_no, property_name)')
          .eq('check_out', today)
          .neq('is_cancelled', true);
        checkoutBks = b2 || [];
      }
    } catch (e) {}

    const scheduled = [];
    (checkoutBks || []).forEach(b => {
      const sendAt = new Date(today + 'T' + String(HUB.config.checkout_send_hour || 10).padStart(2, '0') + ':00:00');
      if (sendAt > now && sendAt < in24h) {
        scheduled.push({
          when: sendAt,
          template: 'checkout_reminder',
          booking: b,
          type: '👋 Guest Checkout Reminder'
        });
      }
    });

    if (checkoutBks.length > 0 && HUB.config.send_housekeeping_checkout) {
      const sendAt = new Date(today + 'T' + String(HUB.config.checkout_send_hour || 10).padStart(2, '0') + ':00:00');
      if (sendAt > now && sendAt < in24h) {
        scheduled.push({
          when: sendAt,
          template: 'housekeeping_checkout',
          booking: { guest_name: 'Housekeeping Team', room_id: 'All Checkouts' },
          type: '🧹 Housekeeping Checkout Group Alert'
        });
      }
    }

    scheduled.sort((a, b) => a.when - b.when);
    HUB.scheduled = scheduled;
    return scheduled;
  }

  // ─── GATEWAY DISPATCH ENGINE (100% Free / Baileys microservice) ───
  async function dispatchWhatsAppMessage({ to, isGroup, text, type, bookingId, guestName }) {
    await loadConfig();

    // 1. MASTER ON/OFF CHECK
    if (HUB.config.auto_send_enabled !== true) {
      console.log('🛑 [WhatsApp Hub] Auto-send is MASTER OFF. Skipping message for:', to);
      return { ok: false, reason: 'master_off' };
    }

    // 2. GRANULAR TOGGLE CHECK
    const isBookingGroup = String(to).includes('120363425834560086') ||
                           String(to) === String(HUB.config.booking_group_id) ||
                           type === 'new_booking_group' ||
                           type === 'booking_group_alert' ||
                           (text && text.includes('BOOKING DATA'));

    if (isBookingGroup && HUB.config.send_booking_group !== true) {
      console.log('🛑 [WhatsApp Hub] Booking Group alerts are OFF. Dropping dispatch for:', to);
      return { ok: false, reason: 'subtoggle_off' };
    }

    const isInvestorGroup = type === 'new_booking_investor' ||
                            type === 'investor_report' ||
                            (text && (text.includes('Investor') || text.includes('INVESTOR')));

    if (isInvestorGroup && HUB.config.send_investor_booking !== true) {
      console.log('🛑 [WhatsApp Hub] Investor Booking alerts are OFF. Dropping dispatch for:', to);
      return { ok: false, reason: 'subtoggle_off' };
    }

    if (type === 'housekeeping_checkout' && !HUB.config.send_housekeeping_checkout) {
      console.log('🛑 [WhatsApp Hub] Housekeeping Checkout alerts are OFF.');
      return { ok: false, reason: 'subtoggle_off' };
    }
    if (type === 'investor_report' && !HUB.config.send_investor_reports) {
      console.log('🛑 [WhatsApp Hub] Investor Group monthly reports are OFF.');
      return { ok: false, reason: 'subtoggle_off' };
    }
    // STRICT GUEST PASS TOGGLE GUARD:
    // If recipient is a private user/guest (not a group) and not an explicit manual test/send:
    if ((type === 'guest_welcome' || (!isGroup && type !== 'direct_test' && type !== 'guest_pass_manual')) && HUB.config.send_welcome !== true) {
      console.log('🛑 [WhatsApp Hub] Guest Booking Pass automation is OFF. Blocking automated message to guest phone:', to);
      return { ok: false, reason: 'guest_pass_disabled' };
    }
    if (type === 'checkout_reminder' && !HUB.config.send_checkout) {
      return { ok: false, reason: 'subtoggle_off' };
    }

    if (!to) {
      console.warn('⚠️ [WhatsApp Hub] Missing recipient / group ID.');
      return { ok: false, reason: 'missing_recipient' };
    }

    let targetPhone = String(to).trim();
    if (!isGroup) {
      const digitsOnly = targetPhone.replace(/\D/g, '');
      if (digitsOnly.length === 10) targetPhone = '91' + digitsOnly;
      else if (digitsOnly.length > 10) targetPhone = digitsOnly;
    }

    const logEntry = {
      id: 'walog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      booking_id: bookingId || null,
      guest_name: guestName || (isGroup ? 'WhatsApp Group' : 'Recipient'),
      phone: targetPhone,
      template_name: type,
      message_preview: (text || '').substring(0, 500),
      triggered_by: 'auto',
      status: 'pending',
      sent_at: new Date().toISOString()
    };

    // 3. LIVE SEND TO META CLOUD API OR RENDER / BAILEYS GATEWAY
    if (HUB.config.gateway_type === 'meta_cloud_api' && HUB.config.meta_phone_number_id && HUB.config.meta_access_token) {
      try {
        const metaUrl = `https://graph.facebook.com/v21.0/${HUB.config.meta_phone_number_id}/messages`;
        const res = await fetch(metaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${HUB.config.meta_access_token}`
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: targetPhone,
            type: 'text',
            text: { preview_url: true, body: text }
          })
        });
        const metaRes = await res.json();
        if (metaRes.error) throw new Error(metaRes.error.message || 'Meta Cloud API error');

        logEntry.status = 'sent';
        logEntry.api_response = metaRes;
        appendLocalLog(logEntry);
        try { if (window.sb) await sb.from('whatsapp_log').insert(logEntry); } catch (e) {}

        console.log('✅ [WhatsApp Hub Meta API] Dispatched to:', targetPhone);
        if (window.fsn) fsn.success('Official WhatsApp Sent', `Delivered via Meta API to ${targetPhone}`);
        return { ok: true, data: metaRes };
      } catch (err) {
        logEntry.status = 'failed';
        logEntry.error_message = err.message;
        appendLocalLog(logEntry);
        try { if (window.sb) await sb.from('whatsapp_log').insert(logEntry); } catch (e) {}
        console.warn('❌ [WhatsApp Hub Meta API] Failed:', err.message);
        if (window.fsn) fsn.error('Meta API Error', err.message);
        return { ok: false, error: err.message };
      }
    }

    // Smart candidate gateway resolution with automatic failover
    const candidates = [];
    if (HUB.config.gateway_url && !HUB.config.gateway_url.includes('onrender.com')) {
      candidates.push(HUB.config.gateway_url.replace(/\/+$/, ''));
    }
    // Always prioritize local Mac Mini gateway (100% active 24x7 on port 3000)
    candidates.push('http://localhost:3000');
    if (HUB.config.gateway_url && HUB.config.gateway_url.includes('onrender.com')) {
      candidates.push(HUB.config.gateway_url.replace(/\/+$/, ''));
    }
    const uniqueCandidates = [...new Set(candidates)];

    let lastError = null;
    for (const gwUrl of uniqueCandidates) {
      try {
        const endpoint = gwUrl + '/send-message';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: targetPhone,
            message: text,
            isGroup: !!isGroup
          })
        });

        const data = await res.json();
        if (res.ok && data.ok) {
          logEntry.status = 'sent';
          logEntry.gateway_used = gwUrl;
          logEntry.api_response = data;
          appendLocalLog(logEntry);
          try { if (window.sb) await sb.from('whatsapp_log').insert(logEntry); } catch (e) {}

          console.log(`✅ [WhatsApp Hub via ${gwUrl}] Dispatched successfully to:`, targetPhone);
          if (window.fsn) fsn.success('WhatsApp Sent', `Delivered to ${targetPhone}`);
          return { ok: true, data };
        } else {
          lastError = new Error(data.error || 'Gateway returned status ' + res.status);
        }
      } catch (err) {
        lastError = err;
      }
    }

    logEntry.status = 'failed';
    logEntry.error_message = lastError ? lastError.message : 'All gateways unreachable';
    appendLocalLog(logEntry);
    try { if (window.sb) await sb.from('whatsapp_log').insert(logEntry); } catch (e) {}

    console.warn('❌ [WhatsApp Hub] All gateways failed:', lastError?.message);
    if (window.fsn) fsn.warn('WhatsApp Gateway Notice', `Could not reach WhatsApp Gateway. Error: ${lastError?.message}`);
    return { ok: false, error: lastError?.message };
  }

  // ─── GLOBAL AUTOMATION TRIGGERS ───

  window._dispatchedGroupAlerts = window._dispatchedGroupAlerts || new Set();

  // A. Trigger New Booking Alert to Booking Group (📒Booking Data)
  window.triggerBookingGroupAlert = async function(b) {
    if (!b) return;
    if (b.booking_id && window._dispatchedGroupAlerts.has(b.booking_id)) {
      console.log('ℹ️ Booking group alert already dispatched for:', b.booking_id);
      return;
    }
    await loadConfig();

    if (HUB.config.auto_send_enabled !== true) {
      console.log('ℹ️ Master automation is PAUSED in WhatsApp Hub.');
      return;
    }
    if (HUB.config.send_booking_group !== true) {
      console.log('ℹ️ Booking group alert toggle is OFF in WhatsApp Hub (must be explicitly true). Skipping.');
      return;
    }

    const groupId = HUB.config.booking_group_id || '120363425834560086@g.us';
    if (!groupId) {
      console.log('ℹ️ Booking group ID not configured in Settings.');
      return;
    }

    if (b.booking_id) window._dispatchedGroupAlerts.add(b.booking_id);

    const roomName = b.rooms?.nickname || b.rooms?.unit_no || b.room_name || b.room_id || 'Apartment';
    const guest = b.guest_name || 'Guest';
    const phone = b.phone || '-';
    const nights = (b.check_in && b.check_out && window.calcNights) ? calcNights(b.check_in, b.check_out) : 1;
    const tot = b.total_amount || 0;
    const adv = b.advance || 0;
    const due = Math.max(0, tot - adv);

    const fmtD = (dt) => {
      if (!dt) return '';
      try { return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
      catch(e) { return dt; }
    };

    const text =
      `🛎️ *NEW BOOKING CONFIRMED — 📒BOOKING DATA*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🏠 *Property:* ${roomName}\n` +
      `👤 *Guest:* ${guest}\n` +
      `📞 *Phone:* ${phone}\n` +
      `📅 *Check-in:* ${fmtD(b.check_in)} (${b.check_in_time || '14:00'})\n` +
      `📅 *Check-out:* ${fmtD(b.check_out)} (${b.check_out_time || '11:00'})\n` +
      `🌙 *Duration:* ${nights} Night${nights > 1 ? 's' : ''}\n` +
      `💰 *Total:* ₹${tot.toLocaleString('en-IN')} | Paid: ₹${adv.toLocaleString('en-IN')} | Due: ₹${due.toLocaleString('en-IN')}\n` +
      `🌐 *Source:* ${b.booking_mode || 'Direct'}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `Caretaker: Please prepare property.`;

    return await dispatchWhatsAppMessage({
      to: groupId,
      isGroup: true,
      text: text,
      type: 'new_booking_group',
      bookingId: b.booking_id,
      guestName: guest
    });
  };

  window._dispatchedInvestorAlerts = window._dispatchedInvestorAlerts || new Set();

  // A1. Trigger New Booking Alert to Dedicated Property Investor Group
  window.triggerInvestorBookingAlert = async function(b) {
    if (!b) return;
    if (b.booking_id && window._dispatchedInvestorAlerts.has(b.booking_id)) {
      console.log('ℹ️ Investor booking alert already dispatched for:', b.booking_id);
      return;
    }
    await loadConfig();

    if (HUB.config.auto_send_enabled !== true) {
      console.log('ℹ️ Master automation is PAUSED in WhatsApp Hub.');
      return;
    }
    if (HUB.config.send_investor_booking !== true) {
      console.log('ℹ️ Investor booking alert toggle is OFF in WhatsApp Hub (must be explicitly true). Skipping.');
      return;
    }

    const roomId = b.room_id || '';
    let roomNickname = b.rooms?.nickname || '';
    let unitNo = b.rooms?.unit_no || '';

    // Check cached rooms / properties if unit_no or nickname missing
    if ((!roomNickname || !unitNo) && window.UHHS_PROPERTIES) {
      const p = window.UHHS_PROPERTIES.find(x => x.unit_no === roomId || (x.nickname && (b.room_name || '').includes(x.nickname)));
      if (p) {
        if (!roomNickname) roomNickname = p.nickname;
        if (!unitNo) unitNo = p.unit_no;
      }
    }

    let propDisplay = '';
    if (roomNickname && unitNo) {
      propDisplay = `${roomNickname} (${unitNo})`;
    } else if (b.room_name) {
      propDisplay = b.room_name;
    } else if (roomNickname) {
      propDisplay = roomNickname;
    } else {
      propDisplay = roomId || 'Property';
    }

    const groupMap = HUB.config.investor_groups || {};

    // Match target: Room ID -> Room Nickname -> DB Group Name
    let target = groupMap[roomId] ||
                 groupMap[roomNickname] ||
                 groupMap[b.rooms?.whatsapp_group_name] ||
                 groupMap[b.rooms?.nickname];

    if (!target) {
      for (const [key, gid] of Object.entries(groupMap)) {
        if (key && ((b.room_name && b.room_name.toLowerCase().includes(key.toLowerCase())) ||
                    (roomNickname && roomNickname.toLowerCase().includes(key.toLowerCase())) ||
                    (roomId && roomId.toLowerCase() === key.toLowerCase()))) {
          target = gid;
          break;
        }
      }
    }

    // Check if alerts for this property were explicitly disabled by user
    if (target === 'disabled' || target === 'off' || target === false || target === '') {
      console.log('ℹ️ Investor alerts explicitly DISABLED by user for property:', propDisplay);
      return { ok: false, reason: 'disabled_for_this_property' };
    }

    if (!target) {
      console.warn('⚠️ No Investor Group mapped for property:', roomId, propDisplay);
      return { ok: false, reason: 'no_investor_group_mapped' };
    }

    if (b.booking_id) window._dispatchedInvestorAlerts.add(b.booking_id);

    const isGroup = String(target).includes('@g.us');
    const nights = (b.check_in && b.check_out && window.calcNights) ? calcNights(b.check_in, b.check_out) : 1;
    const tot = b.total_amount || 0;

    const fmtD = (dt) => {
      if (!dt) return '';
      try {
        const parts = String(dt).split('-');
        if (parts.length === 3) {
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const yr = parts[0];
          const m = months[parseInt(parts[1], 10) - 1] || parts[1];
          const d = parseInt(parts[2], 10);
          return `${d} ${m} ${yr}`;
        }
        const dtObj = new Date(dt);
        return dtObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch(e) { return dt; }
    };

    const ciDate = fmtD(b.check_in);
    const coDate = fmtD(b.check_out);
    const ciTime = b.check_in_time || '14:00';
    const coTime = b.check_out_time || '11:00';

    let bookingMode = b.booking_mode || 'Offline (Direct)';
    if (bookingMode.toLowerCase() === 'direct' || bookingMode.toLowerCase() === 'offline') {
      bookingMode = 'Offline (Direct)';
    }

    const text =
`Booking Update

Property: ${propDisplay}
Booking: ${bookingMode}
Check-in: ${ciDate}, ${ciTime}
Check-out: ${coDate}, ${coTime}
Nights: ${nights}
Amount: ₹${tot.toLocaleString('en-IN')}

The Unique Haven Homes Property Management`;

    return await dispatchWhatsAppMessage({
      to: target,
      isGroup: isGroup,
      text: text,
      type: 'new_booking_investor',
      bookingId: b.booking_id,
      guestName: 'Investor Alert'
    });
  };

  window._dispatchedBkPasses = window._dispatchedBkPasses || new Set();

  // A2. Trigger Direct Booking Confirmation Pass to Guest Mobile
  window.triggerGuestBookingPass = async function(b) {
    console.log('📱 [triggerGuestBookingPass] Invoked with booking payload:', b);
    if (!b || !b.phone) {
      console.warn('⚠️ [triggerGuestBookingPass] Missing booking object or phone:', b);
      return;
    }
    if (b.booking_id && window._dispatchedBkPasses.has(b.booking_id)) {
      console.log('ℹ️ Guest booking pass already dispatched for:', b.booking_id);
      return;
    }

    await loadConfig();
    if (HUB.config.auto_send_enabled !== true) {
      console.log('ℹ️ Master automation is PAUSED in WhatsApp Hub. Skipping guest pass.');
      return;
    }
    if (HUB.config.send_welcome !== true) {
      console.log('ℹ️ Guest booking pass toggle is OFF in WhatsApp Hub (must be explicitly true). Skipping.');
      return;
    }

    let text = '';
    if (typeof window.buildMessageData === 'function' && typeof window.tplConfirmation === 'function' && b.booking_id) {
      try {
        const d = await window.buildMessageData(b.booking_id);
        if (d) text = window.tplConfirmation(d);
      } catch(e) { console.warn('buildMessageData fallback:', e); }
    }

    if (!text) {
      // Resolve Google Maps link from room data or fallback
      let mapLink = b.rooms?.map_link || b.map_link || '';
      if (!mapLink && b.room_id && window.sb) {
        try {
          const { data: rm } = await window.sb.from('rooms').select('map_link').eq('room_id', b.room_id).maybeSingle();
          if (rm?.map_link) mapLink = rm.map_link;
        } catch(e) {}
      }
      if (!mapLink) {
        const rid = ((b.room_id || '') + ' ' + (b.room_name || '') + ' ' + (b.rooms?.nickname || '')).toUpperCase();
        if (rid.includes('VIL-103') || rid.includes('PINK HOUSE') || rid.includes('VIL-104') || rid.includes('GREEN HOUSE') || rid.includes('VIL-105') || rid.includes('YELLOW HOUSE')) {
          mapLink = 'https://maps.app.goo.gl/pCGigAPQGHjcfadQ8';
        } else if (rid.includes('VIL-101') || rid.includes('GRAND VILLA')) {
          mapLink = 'https://maps.app.goo.gl/qQRbCANwvez7mnD3A';
        } else if (rid.includes('LUL') || rid.includes('LUXE') || rid.includes('VELVET') || rid.includes('PINK PARADISE') || rid.includes('GREEN FOREST') || rid.includes('CELEBRITY') || rid.includes('ROYAL WHITE')) {
          mapLink = 'https://maps.app.goo.gl/b8YjBduoQxa98QhT6';
        } else {
          mapLink = 'https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA';
        }
      }

      const mapSection = mapLink ? `📍 *Google Maps Location:*\n${mapLink}\n\n` : '';
      const roomName = b.rooms?.nickname || b.rooms?.unit_no || b.room_name || b.room_id || 'Apartment';
      const guest = b.guest_name || 'Guest';
      const fmtD = (dt) => {
        if (!dt) return '';
        try { return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
        catch(e) { return dt; }
      };
      const advStr = b.advance ? `💳 *Advance Paid:* ₹${Number(b.advance).toLocaleString('en-IN')}\n` : '';
      text =
        `🎉 *BOOKING CONFIRMED — THE UNIQUE HAVEN HOMES*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Dear *${guest}*,\n` +
        `Thank you for choosing The Unique Haven Homes! Your stay is confirmed.\n\n` +
        `🏠 *Property:* ${roomName}\n` +
        `📅 *Check-in:* ${fmtD(b.check_in)} (From 02:00 PM)\n` +
        `📅 *Check-out:* ${fmtD(b.check_out)} (By 11:00 AM)\n` +
        `💰 *Total Amount:* ₹${(b.total_amount || 0).toLocaleString('en-IN')}\n` +
        advStr +
        `\n` +
        mapSection +
        `👤 *Manager:* Praveen Singh (9194109911)\n\n` +
        `*Contact*\n` +
        `If you need anything, message me anytime or call directly\n` +
        `📞Mr Shahansha 9450055554\n` +
        `📞Mr Firoz khan 8299600709\n` +
        `Happy to help whenever you need.\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `_The Unique Haven Homes Luxury Stays_`;
    }

    console.log('📤 [triggerGuestBookingPass] Dispatching pass to:', b.phone);
    const res = await dispatchWhatsAppMessage({
      to: b.phone,
      isGroup: false,
      text: text,
      type: 'guest_welcome',
      bookingId: b.booking_id,
      guestName: b.guest_name || 'Guest'
    });
    console.log('📬 [triggerGuestBookingPass] Result:', res);
    if (res && res.ok && b.booking_id) {
      window._dispatchedBkPasses.add(b.booking_id);
    }
    return res;
  };

  // B. Trigger Housekeeping Checkout Alert to Staff Group
  window.triggerHousekeepingCheckoutAlert = async function() {
    await loadConfig();
    const groupId = HUB.config.housekeeping_group_id;
    if (!groupId) return;

    const today = new Date().toISOString().slice(0, 10);
    let checkoutBks = [];
    try {
      const { data } = await sb.from('guest_register')
        .select('booking_id, guest_name, check_out, room_id, rooms(nickname, unit_no)')
        .eq('check_out', today)
        .neq('is_cancelled', true);
      checkoutBks = data || [];
    } catch (e) {}

    if (checkoutBks.length === 0) return;

    const list = checkoutBks.map((b, i) => {
      const room = b.rooms?.nickname || b.rooms?.unit_no || b.room_id;
      return `${i + 1}. 🚪 *${room}* (Guest: ${b.guest_name || 'Guest'}) — Checkout at 11:00 AM`;
    }).join('\n');

    const text =
      `🧹 *TODAY'S CHECKOUT & CLEANING ALERT*\n` +
      `📅 *Date:* ${today}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${list}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `⚡ _Please prepare rooms for incoming guests by 2:00 PM._`;

    return await dispatchWhatsAppMessage({
      to: groupId,
      isGroup: true,
      text: text,
      type: 'housekeeping_checkout',
      bookingId: 'checkout_' + today,
      guestName: 'Housekeeping Staff'
    });
  };

  // C. Trigger Investor Statement to Investor Group
  window.triggerInvestorGroupAlert = async function(invName, propName, roomId, monthStr, gross, expenses, netPayout) {
    await loadConfig();
    const groupMap = HUB.config.investor_groups || {};
    const target = groupMap[roomId] || groupMap[propName] || groupMap[invName];
    if (!target) {
      if (window.fsn) fsn.warn('No Group Mapped', `Please map a WhatsApp Group ID for ${propName} in Settings.`);
      return { ok: false, error: 'no_group_mapped' };
    }

    const text =
      `📊 *MONTHLY INVESTOR STATEMENT — ${monthStr}*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Investor:* ${invName}\n` +
      `🏠 *Property:* ${propName}\n` +
      `💵 *Gross Revenue:* ₹${Number(gross || 0).toLocaleString('en-IN')}\n` +
      `📉 *Expenses & Ops:* -₹${Number(expenses || 0).toLocaleString('en-IN')}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `💰 *NET PAYOUT:* ₹${Number(netPayout || 0).toLocaleString('en-IN')}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `_Generated via The Unique Haven Homes CRM_`;

    return await dispatchWhatsAppMessage({
      to: target,
      isGroup: true,
      text: text,
      type: 'investor_report',
      bookingId: 'inv_' + roomId + '_' + monthStr,
      guestName: invName
    });
  };

  // ─── Test Gateway Connection Helper ───
  window.testWhatsAppGateway = async function() {
    const btn = document.getElementById('testGatewayBtn');
    if (btn) { btn.disabled = true; btn.innerText = '⏳ Testing Connection...'; }

    const url = (document.getElementById('cfgGatewayUrl')?.value || HUB.config.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');
    const resultDiv = document.getElementById('gatewayTestResult');

    try {
      const res = await fetch(url + '/status');
      const data = await res.json();

      HUB.gatewayConnected = data.connected;
      HUB.gatewayUser = data.user;

      if (data.connected) {
        // Fetch groups
        let groupsHtml = '';
        try {
          const gRes = await fetch(url + '/groups');
          const gData = await gRes.json();
          if (gData.ok && gData.groups) {
            groupsHtml = `
              <div style="margin-top:10px;text-align:left;max-height:160px;overflow-y:auto;background:#fff;border:1px solid #CBD5E1;border-radius:6px;padding:8px;font-size:11px;">
                <div style="font-weight:700;margin-bottom:4px;color:#334155;">Available WhatsApp Groups (Click to copy ID):</div>
                ${gData.groups.map(g => `
                  <div style="padding:4px;border-bottom:1px solid #F1F5F9;cursor:pointer;" onclick="navigator.clipboard.writeText('${g.id}');if(window.fsn)fsn.toast('Copied: ${g.id}');" title="Click to copy Group ID">
                    👥 <b>${g.subject}</b> — <code style="color:#0284C7;">${g.id}</code>
                  </div>
                `).join('')}
              </div>
            `;
          }
        } catch (ge) {}

        if (resultDiv) {
          resultDiv.innerHTML = `
            <div style="background:#DCFCE7;border:1.5px solid #16A34A;padding:10px;border-radius:8px;color:#15803D;font-weight:700;font-size:12.5px;">
              ✅ WhatsApp Connected! Logged in as: ${data.user?.id || 'Connected User'}
              ${groupsHtml}
            </div>
          `;
        }
        if (window.fsn) fsn.success('Connected', 'WhatsApp Gateway is live and connected!');
      } else {
        if (resultDiv) {
          resultDiv.innerHTML = `
            <div style="background:#FEF3C7;border:1.5px solid #F59E0B;padding:10px;border-radius:8px;color:#92400E;font-size:12px;">
              ⚠️ Gateway is running on ${url}, but <b>WhatsApp is not linked yet</b>.<br>
              👉 <a href="${url}/qr" target="_blank" style="color:#2563EB;font-weight:700;">Click here to open and scan QR Code</a>
            </div>
          `;
        }
      }
    } catch (err) {
      if (resultDiv) {
        resultDiv.innerHTML = `
          <div style="background:#FEE2E2;border:1.5px solid #EF4444;padding:10px;border-radius:8px;color:#991B1B;font-size:12px;">
            ❌ Could not reach Gateway at <code>${url}</code>.<br>
            Please start the gateway: <code>cd whatsapp-bot && npm start</code>
          </div>
        `;
      }
    } finally {
      if (btn) { btn.disabled = false; btn.innerText = '⚡ Test Gateway Connection'; }
    }
  };

  // ─── Direct In-CRM WhatsApp QR Scanner & Device Management ───
  let _qrPollInterval = null;

  window.openWhatsAppQRModal = async function() {
    const existing = document.getElementById('waQrModal');
    if (existing) existing.remove();
    if (_qrPollInterval) clearInterval(_qrPollInterval);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'waQrModal';
    modal.onclick = (e) => { if (e.target === modal) window.closeWhatsAppQRModal(); };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:500px;width:95vw;padding:24px;text-align:center;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #E2E8F0;padding-bottom:10px;">
          <h3 style="margin:0;font-size:17px;color:#0F172A;display:flex;align-items:center;gap:8px;">
            📱 WhatsApp Device & QR Connection
          </h3>
          <button onclick="closeWhatsAppQRModal()" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
        </div>
        <div id="waQrModalBody">
          <div style="padding:30px;color:#64748B;">⏳ Checking WhatsApp connection status...</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    await checkAndRenderModalContent();
  };

  window.closeWhatsAppQRModal = function() {
    if (_qrPollInterval) {
      clearInterval(_qrPollInterval);
      _qrPollInterval = null;
    }
    const m = document.getElementById('waQrModal');
    if (m) m.remove();
  };

  async function checkAndRenderModalContent() {
    const body = document.getElementById('waQrModalBody');
    if (!body) return;

    const gatewayUrl = (HUB.config?.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');
    try {
      const res = await fetch(gatewayUrl + '/qr-data');
      const data = await res.json();

      if (data.connected) {
        if (_qrPollInterval) { clearInterval(_qrPollInterval); _qrPollInterval = null; }
        const userJid = data.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0] || 'Unknown';
        const userName = data.user?.name || 'WhatsApp User';
        body.innerHTML = `
          <div style="background:#F0FDF4;border:1.5px solid #86EFAC;padding:20px;border-radius:12px;margin-bottom:14px;">
            <div style="font-size:40px;margin-bottom:6px;">🟢</div>
            <h3 style="margin:0 0 6px 0;color:#15803D;font-size:18px;">WhatsApp Connected!</h3>
            <div style="font-size:20px;color:#1E293B;font-weight:800;">+${phone}</div>
            <div style="font-size:13px;color:#475569;margin-top:2px;">Account: <b>${userName}</b></div>
            <div style="font-size:12px;color:#15803D;margin-top:8px;">✅ Ready to send automated group alerts, passes & reminders.</div>
          </div>
          <div style="background:#FFFBEB;border:1px solid #FDE68A;padding:12px;border-radius:8px;margin-bottom:16px;font-size:12px;color:#92400E;text-align:left;line-height:1.4;">
            💡 <b>Want to change number?</b> Click below to disconnect this account and scan a QR code from any other phone.
          </div>
          <button onclick="confirmDisconnectAndScan()" style="background:#DC2626;color:#fff;border:none;padding:11px 18px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;width:100%;">
            🔄 Switch / Link Different WhatsApp Number
          </button>
        `;
      } else {
        renderScanQrView(data, body);
      }
    } catch (err) {
      body.innerHTML = `
        <div style="background:#FEF2F2;border:1.5px solid #F87171;padding:16px;border-radius:10px;color:#991B1B;font-size:12.5px;text-align:left;">
          <b>❌ Could not reach WhatsApp Bot gateway at:</b><br>
          <code style="background:#FEE2E2;padding:2px 6px;border-radius:4px;display:inline-block;margin:4px 0;">${gatewayUrl}</code><br><br>
          <b>📱 iPhone / iPad user?</b><br>
          <button onclick="window.setQuickGatewayUrl('http://192.168.29.155:3000');checkAndRenderModalContent();" style="margin-top:6px;background:#0F766E;color:#fff;border:none;padding:7px 12px;border-radius:6px;font-weight:700;font-size:11.5px;cursor:pointer;width:100%;text-align:center;">
            ⚡ Same Wi-Fi: Connect to Mac Mini (192.168.29.155:3000)
          </button>
        </div>
      `;
    }
  }

  function renderScanQrView(data, body) {
    if (!body) return;

    if (data.qrImage) {
      body.innerHTML = `
        <div style="margin-bottom:12px;">
          <h4 style="margin:0 0 4px 0;color:#0F172A;font-size:15px;">Scan QR with your phone</h4>
          <div style="font-size:12px;color:#64748B;line-height:1.4;">
            Open WhatsApp on phone → <b>Linked Devices</b> → <b>Link a Device</b>
          </div>
        </div>
        <div style="display:inline-block;padding:12px;background:#fff;border:2px solid #CBD5E1;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.06);margin-bottom:12px;">
          <img id="modalLiveQrImg" src="${data.qrImage}" style="width:250px;height:250px;display:block;" alt="WhatsApp QR Code" />
        </div>
        <div style="font-size:11.5px;color:#64748B;">
          ⏳ Waiting for scan... Page will auto-connect once scanned.
        </div>
      `;
    } else {
      body.innerHTML = `
        <div style="padding:24px 10px;">
          <div style="font-size:28px;margin-bottom:8px;">⏳</div>
          <div style="font-weight:700;font-size:14px;color:#1E293B;">Generating fresh QR code...</div>
          <div style="font-size:12px;color:#64748B;margin-top:4px;">Please wait 2-3 seconds.</div>
        </div>
      `;
    }

    startGlobalQrPolling();
  }

  function startGlobalQrPolling() {
    if (_qrPollInterval) return;
    const gatewayUrl = (HUB.config?.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');
    _qrPollInterval = setInterval(async () => {
      try {
        const res = await fetch(gatewayUrl + '/qr-data');
        const d = await res.json();
        if (d.connected) {
          clearInterval(_qrPollInterval);
          _qrPollInterval = null;
          if (window.fsn) fsn.success('Connected!', 'WhatsApp successfully paired!');
          await checkAndRenderModalContent();
          if (HUB.activeTab === 'device') await updateDeviceView();
          updateHeaderSenderBadge();
        } else if (d.qrImage) {
          const img1 = document.getElementById('modalLiveQrImg');
          const img2 = document.getElementById('tabLiveQrImg');
          if (img1 && img1.src !== d.qrImage) img1.src = d.qrImage;
          if (img2 && img2.src !== d.qrImage) img2.src = d.qrImage;
          if (!img1 && !img2) {
            const body = document.getElementById('waQrModalBody');
            if (body) renderScanQrView(d, body);
            const container = document.getElementById('hubDeviceViewContent');
            if (container) renderLiveQrInContainer(container, d);
          }
        }
      } catch(e) {}
    }, 2000);
  }

  window.confirmDisconnectAndScan = async function() {
    if (!confirm('Are you sure you want to disconnect current WhatsApp number and scan a new one from another phone?')) return;
    await disconnectAndScanNewQR();
  };

  window.disconnectAndScanNewQR = async function() {
    const body = document.getElementById('waQrModalBody');
    const container = document.getElementById('hubDeviceViewContent');
    const loadingHtml = `
      <div style="padding:34px;text-align:center;color:#1E293B;">
        <div style="font-size:32px;margin-bottom:8px;">🔄</div>
        <div style="font-weight:700;font-size:15px;">Disconnecting current WhatsApp session...</div>
        <div style="font-size:12px;color:#64748B;margin-top:4px;">Preparing fresh QR code for your other phone number.</div>
      </div>
    `;
    if (body) body.innerHTML = loadingHtml;
    if (container) container.innerHTML = loadingHtml;

    const gatewayUrl = (HUB.config?.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');
    try {
      await fetch(gatewayUrl + '/logout', { method: 'POST' });
    } catch(e) {}

    setTimeout(async () => {
      if (body) await checkAndRenderModalContent();
      if (container) await updateDeviceView();
      startGlobalQrPolling();
    }, 1500);
  };

  // ─── Dedicated WhatsApp Device View Tab ───
  async function renderDeviceTab() {
    const el = document.getElementById('hubBody');
    if (!el) return;

    el.innerHTML = `
      <div class="card hub-device-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1.5px solid #F1F5F9;padding-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div>
            <h3 style="margin:0;font-size:17px;color:#0F172A;display:flex;align-items:center;gap:8px;">
              📱 WhatsApp Device & QR Connection
            </h3>
            <p style="margin:3px 0 0 0;font-size:12.5px;color:#64748B;">
              Link or switch the WhatsApp phone number used for sending automated messages & passes
            </p>
          </div>
          <button onclick="updateDeviceView()" style="background:#F1F5F9;border:1px solid #CBD5E1;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;">
            🔄 Refresh Status
          </button>
        </div>

        <div id="hubDeviceViewContent">
          <div style="padding:40px;text-align:center;color:#64748B;">
            <div style="font-size:32px;margin-bottom:8px;">⏳</div>
            <div>Checking WhatsApp connection status...</div>
          </div>
        </div>
      </div>
    `;

    await updateDeviceView();
  }

  window.setQuickGatewayUrl = async function(newUrl) {
    if (!newUrl) return;
    const cleanUrl = newUrl.trim().replace(/\/+$/, '');
    HUB.config = { ...(HUB.config || DEFAULT_WA_CONFIG), gateway_url: cleanUrl };
    setLocalConfig(HUB.config);
    try {
      if (window.sb) {
        await sb.from('whatsapp_config').upsert({ id: 1, gateway_url: cleanUrl, updated_at: new Date().toISOString() });
      }
    } catch (e) {}
    if (window.fsn?.info) fsn.info('Gateway Updated', cleanUrl);
    await updateDeviceView();
  };

  async function updateDeviceView() {
    const container = document.getElementById('hubDeviceViewContent');
    if (!container) return;

    const gatewayUrl = (HUB.config?.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');
    try {
      const res = await fetch(gatewayUrl + '/qr-data');
      const data = await res.json();

      if (data.connected) {
        if (_qrPollInterval) { clearInterval(_qrPollInterval); _qrPollInterval = null; }
        const userJid = data.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0] || 'Unknown';
        const userName = data.user?.name || 'WhatsApp User';

        container.innerHTML = `
          <div style="background:#F0FDF4;border:2px solid #86EFAC;border-radius:12px;padding:20px;text-align:center;margin-bottom:18px;">
            <div style="font-size:40px;margin-bottom:8px;">🟢</div>
            <div style="font-size:11.5px;font-weight:800;color:#15803D;letter-spacing:0.5px;text-transform:uppercase;">Active WhatsApp Account</div>
            <div style="font-size:22px;font-weight:800;color:#0F172A;margin-top:4px;word-break:break-all;">+${phone}</div>
            <div style="font-size:13.5px;color:#475569;margin-top:4px;">Account: <b>${userName}</b></div>
            <div style="font-size:12px;color:#16A34A;margin-top:8px;font-weight:600;line-height:1.4;">
              ✅ Ready! All automated booking alerts, guest passes & checkout reminders will be sent from this number.
            </div>
          </div>

          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px;margin-bottom:18px;">
            <div style="font-weight:700;font-size:13px;color:#92400E;margin-bottom:4px;display:flex;align-items:center;gap:6px;">
              💡 <span>Kisi aur number se bhejna chahte hain?</span>
            </div>
            <div style="font-size:12.5px;color:#78350F;line-height:1.5;">
              Aap kisi bhi time dusre number ya SIM se connect kar sakte hain. Neeche <b>"Switch / Link Different WhatsApp Number"</b> par click karein. Yeh number disconnect ho jayega aur turant naya QR code aa jayega jise aap kisi aur phone se scan kar sakte hain.
            </div>
          </div>

          <button onclick="confirmDisconnectAndScan()" style="background:#DC2626;color:#fff;border:none;padding:13px 20px;border-radius:8px;font-weight:800;font-size:14px;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 3px 10px rgba(220,38,38,0.25);">
            🔄 Switch / Link Different WhatsApp Number (Scan New QR)
          </button>
        `;
      } else {
        renderLiveQrInContainer(container, data);
      }
    } catch (err) {
      container.innerHTML = `
        <div style="background:#FEF2F2;border:1.5px solid #F87171;padding:18px;border-radius:12px;color:#991B1B;font-size:13px;text-align:center;">
          <div style="font-size:28px;margin-bottom:6px;">⚠️</div>
          <b style="font-size:15px;">Could not reach WhatsApp Gateway at:</b><br>
          <code style="display:inline-block;background:#FEE2E2;padding:4px 8px;border-radius:6px;margin:6px 0;font-size:12px;color:#991B1B;">${gatewayUrl}</code>

          <div style="margin-top:12px;background:#FFF;border:1px solid #FECDD3;padding:14px;border-radius:10px;text-align:left;color:#7F1D1D;font-size:12.5px;line-height:1.5;">
            <div style="font-weight:800;color:#991B1B;font-size:13px;display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              📱 iPhone ya iPad par hain?
            </div>
            <code>localhost:3000</code> sirf Mac Mini ke andar chalta hai. iPhone/iPad se connect karne ke options:
            
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
              <button onclick="window.setQuickGatewayUrl('http://192.168.29.155:3000')" style="background:#0F766E;color:#fff;border:none;padding:10px 14px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 5px rgba(15,118,110,0.25);">
                <span>⚡ Same Wi-Fi: Connect to Mac Mini</span>
                <span style="font-size:10.5px;background:rgba(255,255,255,0.2);padding:2px 6px;border-radius:4px;">192.168.29.155:3000</span>
              </button>
            </div>

            <div style="margin-top:12px;border-top:1px dashed #FECDD3;padding-top:10px;">
              <label style="font-size:11px;font-weight:700;display:block;margin-bottom:4px;color:#64748B;">🌐 Or Custom Cloud / Tunnel URL (24/7):</label>
              <div style="display:flex;gap:6px;">
                <input id="quickCustomGwUrl" type="text" placeholder="https://your-bot.onrender.com" value="${gatewayUrl}" style="flex:1;padding:7px 10px;font-size:12px;border:1px solid #CBD5E1;border-radius:6px;">
                <button onclick="window.setQuickGatewayUrl(document.getElementById('quickCustomGwUrl').value)" style="background:#2563EB;color:#fff;border:none;padding:7px 14px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">
                  Connect
                </button>
              </div>
            </div>
          </div>

          <div style="font-size:11.5px;color:#7F1D1D;margin-top:12px;">
            Mac Mini terminal me command: <code>cd whatsapp-bot && npm start</code>
          </div>
          <button onclick="updateDeviceView()" style="margin-top:10px;padding:8px 18px;background:#991B1B;color:#fff;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">
            🔄 Retry Connection
          </button>
        </div>
      `;
    }
  }

  function renderLiveQrInContainer(container, data) {
    if (data.qrImage) {
      container.innerHTML = `
        <div style="text-align:center;">
          <div style="background:#EFF6FF;border:1.5px solid #BFDBFE;padding:14px 16px;border-radius:10px;margin-bottom:16px;text-align:left;">
            <div style="font-weight:800;color:#1E40AF;font-size:13px;margin-bottom:6px;">
              📲 Scan with WhatsApp to Link Phone:
            </div>
            <ol style="margin:0;padding-left:20px;font-size:12.5px;color:#1E3A8A;line-height:1.6;">
              <li>Open <b>WhatsApp</b> on the phone you want to send from.</li>
              <li>Tap <b>Settings</b> (iOS) or <b>3 Dots Menu</b> (Android) → <b>Linked Devices</b>.</li>
              <li>Tap <b>Link a Device</b> and point your camera at this QR code.</li>
              <li>Jaise hi scan hoga, screen auto-detect karke <b>Connected</b> dikhayegi!</li>
            </ol>
          </div>

          <div class="hub-qr-box" style="margin-bottom:12px;">
            <img id="tabLiveQrImg" class="hub-qr-img" src="${data.qrImage}" alt="WhatsApp QR Code" />
          </div>

          <div style="font-size:12px;color:#64748B;margin-bottom:14px;">
            ⏳ Waiting for scan... Screen will auto-connect once scanned from your phone.
          </div>

          <button onclick="updateDeviceView()" style="background:#F1F5F9;border:1px solid #CBD5E1;color:#334155;padding:8px 16px;border-radius:6px;font-weight:700;font-size:12.5px;cursor:pointer;">
            🔄 Reload QR Code
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="padding:34px 10px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">⏳</div>
          <div style="font-weight:800;font-size:15px;color:#1E293B;">Generating fresh QR code...</div>
          <div style="font-size:12px;color:#64748B;margin-top:4px;">Please wait 2-3 seconds for new QR code.</div>
        </div>
      `;
    }

    startGlobalQrPolling();
  }

  async function updateHeaderSenderBadge() {
    const badge = document.getElementById('hubSenderHeaderBadge');
    if (!badge) return;

    const gatewayUrl = (HUB.config?.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');
    try {
      const res = await fetch(gatewayUrl + '/status');
      const data = await res.json();
      if (data.connected) {
        const userJid = data.user?.id || '';
        const phone = userJid.split(':')[0] || userJid.split('@')[0] || 'Linked';
        badge.innerHTML = `<span style="color:#15803D;cursor:pointer;font-weight:800;" onclick="setHubTab('device')" title="Click to view device or switch number">🟢 +${phone}</span>`;
      } else {
        badge.innerHTML = `<button onclick="setHubTab('device')" style="background:#DC2626;color:#fff;border:none;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;">🔴 Not Linked [Scan QR]</button>`;
      }
    } catch(e) {
      badge.innerHTML = `<span style="color:#94A3B8;font-size:12px;">Offline</span>`;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🤖 AI AGENT & LIVE CHAT DASHBOARD
  // ═══════════════════════════════════════════════════════════
  let _aiChatPollInterval = null;
  let _selectedChatPhone = null;
  let _aiChatFilterText = '';
  let _cachedChats = [];

  async function renderAiChatTab() {
    const el = document.getElementById('hubBody');
    if (!el) return;

    if (_aiChatPollInterval) {
      clearInterval(_aiChatPollInterval);
      _aiChatPollInterval = null;
    }

    const isMobile = window.innerWidth <= 768;
    const hideLeftOnMobile = isMobile && _selectedChatPhone;
    const hideRightOnMobile = isMobile && !_selectedChatPhone;

    el.innerHTML = `
      <style>
        .ai-chat-split-container {
          display: grid;
          grid-template-columns: 320px 1fr;
          height: 560px;
          max-height: 72vh;
          min-height: 460px;
        }
        @media (max-width: 768px) {
          .ai-chat-split-container {
            display: flex !important;
            flex-direction: column !important;
            height: calc(100vh - 220px) !important;
            max-height: 80vh !important;
          }
          .ai-chat-left-col {
            width: 100% !important;
            height: 100% !important;
            border-right: none !important;
          }
          .ai-chat-right-col {
            width: 100% !important;
            height: 100% !important;
          }
          .ai-mobile-hidden {
            display: none !important;
          }
        }
      </style>

      <div class="card" style="padding:0;overflow:hidden;border:1px solid #E2E8F0;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,0.06);background:#fff;margin-bottom:20px;">
        <div class="ai-chat-split-container">
          
          <!-- Left Column: Conversations List -->
          <div id="aiChatLeftPane" class="ai-chat-left-col ${hideLeftOnMobile ? 'ai-mobile-hidden' : ''}" style="border-right:1px solid #E2E8F0;background:#F8FAFC;display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;">
            <div style="padding:12px 14px;border-bottom:1px solid #E2E8F0;background:#fff;flex-shrink:0;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h4 style="margin:0;font-size:14px;color:#0F172A;display:flex;align-items:center;gap:6px;">
                  💬 WhatsApp Chats <span id="aiChatTotalBadge" style="background:#E2E8F0;color:#334155;padding:1px 6px;border-radius:10px;font-size:11px;">0</span>
                </h4>
                <button onclick="refreshAiChatsList()" style="background:none;border:none;cursor:pointer;font-size:14px;" title="Refresh Chats">🔄</button>
              </div>
              <input type="text" id="aiChatSearchInput" placeholder="🔍 Search phone or name..." value="${escapeHtml(_aiChatFilterText)}" oninput="window.filterAiChats(this.value)" style="width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #CBD5E1;border-radius:8px;font-size:12px;outline:none;" />
            </div>

            <!-- Conversations List Items Container -->
            <div id="aiChatsListContainer" style="flex:1 1 auto;min-height:0;overflow-y:auto;padding:8px;">
              <div style="text-align:center;padding:30px;color:#64748B;font-size:12.5px;">⏳ Loading conversations...</div>
            </div>
          </div>

          <!-- Right Column: Live Conversation Stream -->
          <div id="aiChatMainPane" class="ai-chat-right-col ${hideRightOnMobile ? 'ai-mobile-hidden' : ''}" style="display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;background:#F1F5F9;">
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748B;text-align:center;padding:20px;">
              <div>
                <div style="font-size:42px;margin-bottom:10px;">🤖</div>
                <div style="font-weight:700;font-size:16px;color:#0F172A;">TUHH WhatsApp AI Agent Dashboard</div>
                <div style="font-size:13px;color:#64748B;margin-top:6px;max-width:380px;line-height:1.5;">
                  Select an active guest chat on the left to see live messages, toggle between <b>AI Mode</b> and <b>Human Mode</b>, or send a manual reply.
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;

    await refreshAiChatsList();
    if (_selectedChatPhone) {
      await refreshSelectedChatMessages();
    }

    // Start live auto-polling every 3.5s
    _aiChatPollInterval = setInterval(async () => {
      if (HUB.activeTab !== 'ai-chat') {
        clearInterval(_aiChatPollInterval);
        _aiChatPollInterval = null;
        return;
      }
      await refreshAiChatsList(true); // background silent update
      if (_selectedChatPhone) {
        await refreshSelectedChatMessages(true);
      }
    }, 3500);
  }

  window.backToAiChatList = function() {
    _selectedChatPhone = null;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const leftCol = document.getElementById('aiChatLeftPane');
      const rightCol = document.getElementById('aiChatMainPane');
      if (leftCol) leftCol.classList.remove('ai-mobile-hidden');
      if (rightCol) rightCol.classList.add('ai-mobile-hidden');
    }
    renderChatsListItems();
  };

  async function refreshAiChatsList(isSilent = false) {
    const listEl = document.getElementById('aiChatsListContainer');
    const badgeEl = document.getElementById('aiChatTotalBadge');
    if (!listEl) return;

    const gatewayUrl = (HUB.config?.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');
    try {
      const res = await fetch(gatewayUrl + '/api/chats');
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed');

      _cachedChats = data.chats || [];
      if (badgeEl) badgeEl.textContent = _cachedChats.length;

      renderChatsListItems();
    } catch(err) {
      if (!isSilent && listEl) {
        listEl.innerHTML = `
          <div style="text-align:center;padding:24px 12px;color:#DC2626;font-size:12px;">
            ⚠️ Gateway Offline or Disconnected.<br>
            <span style="color:#64748B;font-size:11px;">Make sure WhatsApp Bot is running on http://localhost:3000.</span>
            <div style="margin-top:10px;">
              <button onclick="setHubTab('device')" class="btn-sm" style="background:#0F172A;color:#fff;">📱 Link Device / Scan QR</button>
            </div>
          </div>
        `;
      }
    }
  }

  window.filterAiChats = function(val) {
    _aiChatFilterText = (val || '').toLowerCase().trim();
    renderChatsListItems();
  };

  function renderChatsListItems() {
    const listEl = document.getElementById('aiChatsListContainer');
    if (!listEl) return;

    let filtered = _cachedChats;
    if (_aiChatFilterText) {
      filtered = filtered.filter(c => 
        (c.phone && c.phone.includes(_aiChatFilterText)) ||
        (c.name && c.name.toLowerCase().includes(_aiChatFilterText)) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(_aiChatFilterText))
      );
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center;padding:30px 10px;color:#64748B;font-size:12px;">
          📭 No WhatsApp conversations recorded yet.<br>
          <span style="font-size:11px;color:#94A3B8;">When a guest messages your WhatsApp, it will appear here instantly!</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(c => {
      const isSel = _selectedChatPhone === c.phone;
      const isAi = c.mode !== 'human';
      const timeStr = c.lastTime ? formatTimeAgo(c.lastTime) : '';

      return `
        <div onclick="window.selectAiChat('${c.phone}')" style="background:${isSel ? '#E2E8F0' : '#fff'};border:1px solid ${isSel ? '#94A3B8' : '#E2E8F0'};border-radius:10px;padding:10px 12px;margin-bottom:8px;cursor:pointer;transition:all 0.15s ease;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
            <div style="font-weight:700;font-size:13px;color:#0F172A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px;">
              ${escapeHtml(c.name || 'Guest')}
            </div>
            <span style="font-size:10px;padding:2px 6px;border-radius:12px;font-weight:800;background:${isAi ? '#DEF7EC' : '#FEF3C7'};color:${isAi ? '#03543F' : '#92400E'};">
              ${isAi ? '🤖 AI' : '👤 Human'}
            </span>
          </div>
          <div style="font-size:11px;color:#64748B;margin-bottom:4px;">+${escapeHtml(c.phone)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#334155;">
            <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:210px;color:#475569;">
              ${escapeHtml(c.lastMessage || 'No message')}
            </div>
            <div style="font-size:10px;color:#94A3B8;flex-shrink:0;">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.selectAiChat = async function(phone) {
    _selectedChatPhone = phone;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const leftCol = document.getElementById('aiChatLeftPane');
      const rightCol = document.getElementById('aiChatMainPane');
      if (leftCol) leftCol.classList.add('ai-mobile-hidden');
      if (rightCol) rightCol.classList.remove('ai-mobile-hidden');
    }
    renderChatsListItems();
    await refreshSelectedChatMessages();
  };

  async function refreshSelectedChatMessages(isSilent = false) {
    const pane = document.getElementById('aiChatMainPane');
    if (!pane || !_selectedChatPhone) return;

    const gatewayUrl = (HUB.config?.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');
    try {
      const res = await fetch(`${gatewayUrl}/api/chat/${_selectedChatPhone}`);
      const data = await res.json();
      if (!data.ok) return;

      const chat = data.chat;
      const isAi = chat.mode !== 'human';

      // Keep scroll position if already scrolled
      const prevBox = document.getElementById('aiChatHistoryBox');
      const shouldScrollBottom = prevBox ? (prevBox.scrollHeight - prevBox.scrollTop - prevBox.clientHeight < 60) : true;

      pane.innerHTML = `
        <!-- Chat Header -->
        <div style="background:#fff;padding:10px 14px;border-bottom:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <button onclick="window.backToAiChatList()" style="background:#F1F5F9;border:1px solid #CBD5E1;color:#1E293B;padding:6px 10px;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;">
              ← Back
            </button>
            <div>
              <div style="font-weight:800;font-size:14px;color:#0F172A;display:flex;align-items:center;gap:6px;">
                👤 ${escapeHtml(chat.name || 'Guest')}
                <span style="font-size:11px;color:#64748B;font-weight:normal;">(+${chat.phone})</span>
              </div>
              <div style="font-size:10.5px;color:#64748B;margin-top:2px;">
                Status: <strong>${isAi ? '🤖 AI Auto-Responding' : '👤 Human Mode Active'}</strong>
              </div>
            </div>
          </div>

          <!-- Mode Switch Toggle -->
          <div style="display:flex;align-items:center;gap:8px;">
            <button onclick="window.toggleChatMode('${chat.phone}', '${chat.mode || 'ai'}')" style="background:${isAi ? '#059669' : '#D97706'};color:#fff;border:none;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
              ${isAi ? '🤖 AI Mode: ON' : '👤 Human Mode: ON'}
            </button>
          </div>
        </div>

        <!-- Chat History Messages Stream -->
        <div id="aiChatHistoryBox" style="flex:1 1 auto;min-height:0;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;">
          ${(chat.history && chat.history.length > 0) ? chat.history.map(m => {
            const isMe = m.fromMe;
            return `
              <div style="display:flex;flex-direction:column;align-items:${isMe ? 'flex-end' : 'flex-start'};">
                <div style="max-width:85%;background:${isMe ? '#DCF8C6' : '#fff'};color:#0F172A;padding:9px 13px;border-radius:${isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px'};box-shadow:0 1px 2px rgba(0,0,0,0.08);border:1px solid ${isMe ? '#C7E7A6' : '#E2E8F0'};font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word;">
                  ${escapeHtml(m.text || '')}
                </div>
                <div style="font-size:9.5px;color:#94A3B8;margin-top:3px;padding:0 4px;">
                  ${m.time ? new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} ${isMe ? '· Delivered' : ''}
                </div>
              </div>
            `;
          }).join('') : `
            <div style="text-align:center;padding:40px;color:#64748B;font-size:12.5px;">
              No messages recorded yet in this session.
            </div>
          `}
        </div>

        <!-- Send Manual Reply Bar (Always Pinned at Bottom) -->
        <div style="flex-shrink:0;background:#fff;padding:12px 16px;border-top:2px solid #E2E8F0;box-shadow:0 -4px 12px rgba(0,0,0,0.04);z-index:5;">
          <form onsubmit="event.preventDefault(); window.sendManualAiReply('${chat.phone}');" style="display:flex;gap:10px;align-items:center;">
            <input type="text" id="aiManualReplyInput" placeholder="💬 Type your message here to ${escapeHtml(chat.name)}..." style="flex:1;padding:10px 14px;border:2px solid #CBD5E1;border-radius:8px;font-size:13px;outline:none;background:#F8FAFC;transition:border-color 0.2s;" onfocus="this.style.borderColor='#2563EB';this.style.background='#fff';" onblur="this.style.borderColor='#CBD5E1';this.style.background='#F8FAFC';" />
            <button type="submit" id="btnSendManualReply" style="background:#16A34A;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(22,163,74,0.3);flex-shrink:0;">
              Send 📤
            </button>
          </form>
          <div style="font-size:11px;color:#64748B;margin-top:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
            <span>💡 Click <b>AI Mode: ON</b> above anytime to let AI handle guest questions.</span>
            <a href="https://wa.me/${chat.phone}" target="_blank" style="color:#0284C7;text-decoration:none;font-weight:600;">Open WhatsApp App ↗</a>
          </div>
        </div>
      `;

      const box = document.getElementById('aiChatHistoryBox');
      if (box && shouldScrollBottom) {
        box.scrollTop = box.scrollHeight;
      }
    } catch(err) {
      console.warn('Error refreshing selected chat:', err);
    }
  }

  window.toggleChatMode = async function(phone, currentMode) {
    const newMode = currentMode === 'human' ? 'ai' : 'human';
    const gatewayUrl = (HUB.config?.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');
    try {
      const res = await fetch(`${gatewayUrl}/api/chat/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mode: newMode })
      });
      const data = await res.json();
      if (data.ok) {
        if (window.fsn?.success) fsn.success('Mode Updated', `Switched to ${newMode.toUpperCase()} Mode!`);
        await refreshAiChatsList(true);
        await refreshSelectedChatMessages();
      }
    } catch(err) {
      alert('Failed to update mode: ' + err.message);
    }
  };

  window.sendManualAiReply = async function(phone) {
    const input = document.getElementById('aiManualReplyInput');
    const btn = document.getElementById('btnSendManualReply');
    if (!input || !input.value.trim()) return;

    const message = input.value.trim();
    const gatewayUrl = (HUB.config?.gateway_url || 'http://localhost:3000').replace(/\/+$/, '');

    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
      const res = await fetch(`${gatewayUrl}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, message })
      });
      const data = await res.json();
      if (data.ok) {
        input.value = '';
        await refreshSelectedChatMessages();
        await refreshAiChatsList(true);
      } else {
        alert('Failed sending message: ' + (data.error || 'Unknown error'));
      }
    } catch(err) {
      alert('Error sending reply: ' + err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Send 📤'; }
    }
  };

  function formatTimeAgo(isoDate) {
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch(e) {
      return '';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UI RENDERING
  // ═══════════════════════════════════════════════════════════
  async function renderWhatsAppHub() {
    renderShell('<div class="loading">📱 Loading Communication Hub...</div>', 'whatsapp-hub');

    await Promise.all([loadConfig(), loadTemplates(), loadLogs(50), fetchScheduled()]);

    const c = HUB.config || {};
    const enabled = c.auto_send_enabled !== false;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = HUB.logs.filter(l => l.sent_at && l.sent_at.slice(0, 10) === todayStr);
    const sentToday = todayLogs.filter(l => l.status === 'sent').length;
    const failedToday = todayLogs.filter(l => l.status === 'failed').length;

    const html = `
      <div class="wrap hub-wrapper">
        <div class="hub-header-container">
          <div class="hub-header-text">
            <h1>
              📱 WhatsApp Automation Hub
            </h1>
            <p>
              Zero-cost automated alerts for Booking Groups, Cleaning Staff, Investor Groups & Guests
            </p>
          </div>
          <div class="hub-header-actions">
            <button onclick="setHubTab('device')" style="background:#2563EB;color:#fff;padding:9px 16px;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 6px rgba(37,99,235,0.25);">
              📱 Link WhatsApp / Scan QR
            </button>
            <button onclick="toggleAutoSend()" style="background:${enabled ? '#DC2626' : '#16A34A'};color:#fff;padding:9px 18px;border:none;border-radius:8px;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
              ${enabled ? '⏸ Pause Master Automation' : '▶️ Resume Master Automation'}
            </button>
          </div>
        </div>

        <!-- Master Status Banner -->
        <div class="card" style="border-left:5px solid ${enabled ? '#16A34A' : '#DC2626'};background:${enabled ? '#F0FDF4' : '#FEF2F2'};margin-bottom:14px;padding:14px 18px;">
          <div class="hub-stats-grid">
            <div class="hub-stat-tile">
              <div class="hub-stat-label">MASTER AUTOMATION</div>
              <div class="hub-stat-val" style="margin-top:3px;">
                <button onclick="toggleAutoSend()" style="
                  background:${enabled ? '#DCFCE7' : '#FEE2E2'};
                  color:${enabled ? '#15803D' : '#991B1B'};
                  border:1.5px solid ${enabled ? '#86EFAC' : '#FCA5A5'};
                  padding:5px 14px;
                  border-radius:20px;
                  font-size:12px;
                  font-weight:800;
                  cursor:pointer;
                  display:inline-flex;
                  align-items:center;
                  gap:6px;
                  box-shadow:0 1px 3px rgba(0,0,0,0.06);
                " title="Click to toggle Master Automation ON / OFF">
                  ${enabled ? '🟢 AUTOMATION ON' : '🔴 AUTOMATION OFF'}
                </button>
              </div>
            </div>
            <div class="hub-stat-tile">
              <div class="hub-stat-label">ACTIVE SUB-AUTOMATIONS</div>
              <div class="hub-stat-val" style="color:#15803D;font-size:12.5px;font-weight:700;margin-top:5px;line-height:1.3;">
                ${
                  [
                    c.send_welcome === true ? '🔑 Guest Pass' : null,
                    c.send_booking_group === true ? '📒 Booking Group' : null,
                    c.send_investor_booking === true ? '💼 Investor' : null
                  ].filter(Boolean).join(' • ') || 'None Active'
                }
              </div>
            </div>
            <div class="hub-stat-tile">
              <div class="hub-stat-label">CONNECTED SENDER</div>
              <div id="hubSenderHeaderBadge" class="hub-stat-val" style="color:#2563EB;font-size:14.5px;margin-top:4px;">
                Checking...
              </div>
            </div>
            <div class="hub-stat-tile">
              <div class="hub-stat-label">SENT TODAY</div>
              <div class="hub-stat-val" style="color:#0F172A;">${sentToday}</div>
            </div>
            <div class="hub-stat-tile">
              <div class="hub-stat-label">TOTAL DELIVERED</div>
              <div class="hub-stat-val" style="color:#2563EB;">${HUB.logs.filter(l => l.status === 'sent').length}</div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs: Essential 3 Tabs (No Duplicates) -->
        <div class="hub-tabs-scroller" id="hubTabsScroller">
          ${[
            { key: 'settings', label: '⚙️ WhatsApp Automation & Groups' },
            { key: 'device', label: '📱 Link WhatsApp / QR Setting' },
            { key: 'log', label: '📊 Message Delivery Logs' }
          ].map(t => {
            const active = HUB.activeTab === t.key;
            return `<button class="hub-tab-pill ${active ? 'active' : ''}" data-tab="${t.key}" onclick="setHubTab('${t.key}')">${t.label}</button>`;
          }).join('')}
        </div>

        <div id="hubBody"></div>
      </div>
    `;

    renderShell(html, 'whatsapp-hub');
    renderHubBody();
    updateHeaderSenderBadge();
  }

  async function renderHubBody() {
    const el = document.getElementById('hubBody');
    if (!el) return;

    if (HUB.activeTab === 'device') renderDeviceTab();
    else if (HUB.activeTab === 'log') el.innerHTML = renderLogTab();
    else el.innerHTML = renderSettingsTab();
  }

  function renderOverviewTab() {
    const c = HUB.config || {};
    const enabled = c.auto_send_enabled;

    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
          <div>
            <h3 style="margin:0;font-size:16px;color:#0F172A;">⚡ Live Automation Triggers</h3>
            <p style="margin:2px 0 0 0;font-size:12px;color:#64748B;">Control what gets sent automatically vs on-demand.</p>
          </div>
          <button onclick="setHubTab('settings')" class="btn-sm" style="background:#0F172A;color:#fff;">⚙️ Configure Groups & Toggles</button>
        </div>

        <div class="hub-trigger-grid">
          <!-- 1. Direct Guest Booking Pass & GST Invoice -->
          <div style="border:1.5px solid ${c.send_welcome === true ? '#86EFAC' : '#E2E8F0'};background:${c.send_welcome === true ? '#F0FDF4' : '#F8FAFC'};border-radius:10px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#0F172A;">📱 Guest Booking Pass &amp; Invoice</strong>
              <span class="badge ${c.send_welcome === true && enabled ? 'green' : 'yellow'}">
                ${c.send_welcome === true && enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p style="font-size:12px;color:#64748B;margin:6px 0 10px 0;">
              Instant check-in pass, Google Maps directions, and GST tax invoice sent directly to guest WhatsApp.
            </p>
            <div style="font-size:11px;color:#334155;background:rgba(0,0,0,0.04);padding:6px 8px;border-radius:6px;">
              Target: <b>Guest WhatsApp Number (Auto-detected from Booking)</b>
            </div>
          </div>

          <!-- 2. Booking Alert to Booking Data Group -->
          <div style="border:1.5px solid ${c.send_booking_group === true ? '#86EFAC' : '#E2E8F0'};background:${c.send_booking_group === true ? '#F0FDF4' : '#F8FAFC'};border-radius:10px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#0F172A;">📒 Booking Data Group Alert</strong>
              <span class="badge ${c.send_booking_group === true && enabled ? 'green' : 'yellow'}">
                ${c.send_booking_group === true && enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p style="font-size:12px;color:#64748B;margin:6px 0 10px 0;">
              Sends immediate booking summary to 📒Booking Data group when a booking is confirmed.
            </p>
            <div style="font-size:11px;color:#334155;background:rgba(0,0,0,0.04);padding:6px 8px;border-radius:6px;word-break:break-all;">
              Target: <b>${c.booking_group_id || '120363425834560086@g.us (📒Booking Data)'}</b>
            </div>
          </div>

          <!-- 3. Investor Booking Alert -->
          <div style="border:1.5px solid ${c.send_investor_booking !== false ? '#86EFAC' : '#E2E8F0'};background:${c.send_investor_booking !== false ? '#F0FDF4' : '#F8FAFC'};border-radius:10px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#0F172A;">💼 Investor Booking Alerts</strong>
              <span class="badge ${c.send_investor_booking !== false && enabled ? 'green' : 'yellow'}">
                ${c.send_investor_booking !== false && enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p style="font-size:12px;color:#64748B;margin:6px 0 10px 0;">
              Dispatches new booking details directly to that property's dedicated Investor WhatsApp Group.
            </p>
            <div style="font-size:11px;color:#334155;background:rgba(0,0,0,0.04);padding:6px 8px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
              <span>Mapped Groups: <b>${Object.keys(c.investor_groups || {}).length} properties/groups</b></span>
              <button type="button" class="btn-sm" style="background:#4F46E5;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-weight:800;font-size:11px;cursor:pointer;" onclick="window.openInvestorBookingBroadcastModal()">
                📢 Date-Range Dispatcher
              </button>
            </div>
          </div>

          <!-- 4. Investor Monthly Statement -->
          <div style="border:1.5px solid ${c.send_investor_reports ? '#86EFAC' : '#E2E8F0'};background:${c.send_investor_reports ? '#F0FDF4' : '#F8FAFC'};border-radius:10px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#0F172A;">📊 Investor Monthly Statements</strong>
              <span class="badge ${c.send_investor_reports && enabled ? 'green' : 'yellow'}">
                ${c.send_investor_reports && enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p style="font-size:12px;color:#64748B;margin:6px 0 10px 0;">
              Dispatches monthly revenue &amp; net profit statements to dedicated Investor groups.
            </p>
            <div style="font-size:11px;color:#334155;">
              Active Mapped Properties: <b>${Object.keys(c.investor_groups || {}).length} groups</b>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSwitchCard({ id, checked, title, subtitle }) {
    const isChecked = !!checked;
    const bg = isChecked ? '#ECFDF5' : '#FFFFFF';
    const borderColor = isChecked ? '#10B981' : '#E2E8F0';
    const knobBg = isChecked ? '#10B981' : '#CBD5E1';
    const knobLeft = isChecked ? '25px' : '3px';
    const badgeText = isChecked ? '🟢 ON (ACTIVE)' : '⚪ OFF (DISABLED)';
    const badgeBg = isChecked ? '#DCFCE7' : '#F1F5F9';
    const badgeColor = isChecked ? '#15803D' : '#64748B';
    const badgeBorder = isChecked ? '#86EFAC' : '#CBD5E1';

    return `
      <div id="card_${id}" onclick="toggleHubSwitch('${id}', event)" style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        background:${bg};
        border:2px solid ${borderColor};
        border-radius:12px;
        padding:14px 16px;
        cursor:pointer;
        transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        user-select:none;
        box-shadow:${isChecked ? '0 3px 12px rgba(16,185,129,0.12)' : '0 1px 3px rgba(0,0,0,0.04)'};
      ">
        <input type="checkbox" id="${id}" ${isChecked ? 'checked' : ''} style="display:none;" />
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
            <strong style="font-size:14px;color:#0F172A;">${title}</strong>
            <span id="badge_${id}" style="
              font-size:11px;
              font-weight:800;
              letter-spacing:0.3px;
              padding:3px 10px;
              border-radius:20px;
              background:${badgeBg};
              color:${badgeColor};
              border:1.5px solid ${badgeBorder};
            ">${badgeText}</span>
          </div>
          ${subtitle ? `<div style="font-size:12px;color:#64748B;line-height:1.4;">${subtitle}</div>` : ''}
        </div>
        <div id="knob_${id}" style="
          width:50px;
          height:28px;
          background:${knobBg};
          border-radius:28px;
          position:relative;
          flex-shrink:0;
          transition:background 0.2s ease;
        ">
          <div id="knob_thumb_${id}" style="
            width:22px;
            height:22px;
            background:#FFFFFF;
            border-radius:50%;
            position:absolute;
            top:3px;
            left:${knobLeft};
            box-shadow:0 2px 5px rgba(0,0,0,0.25);
            transition:left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          "></div>
        </div>
      </div>
    `;
  }

  window.toggleHubSwitch = async function(id, event) {
    if (event && event.target && event.target.tagName === 'INPUT') return;
    const input = document.getElementById(id);
    if (!input) return;
    input.checked = !input.checked;

    const card = document.getElementById('card_' + id);
    const badge = document.getElementById('badge_' + id);
    const knob = document.getElementById('knob_' + id);
    const thumb = document.getElementById('knob_thumb_' + id);
    if (!card || !badge || !knob || !thumb) return;

    const isChecked = input.checked;
    if (isChecked) {
      card.style.background = '#ECFDF5';
      card.style.borderColor = '#10B981';
      card.style.boxShadow = '0 3px 12px rgba(16,185,129,0.15)';
      badge.innerText = '🟢 ON (ACTIVE)';
      badge.style.background = '#DCFCE7';
      badge.style.color = '#15803D';
      badge.style.borderColor = '#86EFAC';
      knob.style.background = '#10B981';
      thumb.style.left = '25px';
    } else {
      card.style.background = '#FFFFFF';
      card.style.borderColor = '#E2E8F0';
      card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
      badge.innerText = '⚪ OFF (DISABLED)';
      badge.style.background = '#F1F5F9';
      badge.style.color = '#64748B';
      badge.style.borderColor = '#CBD5E1';
      knob.style.background = '#CBD5E1';
      thumb.style.left = '3px';
    }

    // Instantly save state to HUB.config, localStorage & Supabase Cloud so it NEVER reverts!
    HUB.config = HUB.config || {};
    if (id === 'cfgAutoSend') HUB.config.auto_send_enabled = isChecked;
    else if (id === 'cfgSendWelcome') HUB.config.send_welcome = isChecked;
    else if (id === 'cfgSendBookingGroup') HUB.config.send_booking_group = isChecked;
    else if (id === 'cfgSendInvestorBooking') HUB.config.send_investor_booking = isChecked;
    else if (id === 'cfgSendInvestor') HUB.config.send_investor_reports = isChecked;
    else if (id === 'cfgSendCheckout') HUB.config.send_checkout = isChecked;

    await saveCloudAndLocalConfig(HUB.config);
    updateHeaderSenderBadge();

    const switchNames = {
      cfgAutoSend: 'Master Automation',
      cfgSendWelcome: 'Guest Booking Pass',
      cfgSendBookingGroup: 'Booking Data Group Alert',
      cfgSendInvestorBooking: 'Investor Booking Alert',
      cfgSendInvestor: 'Investor Monthly Reports',
      cfgSendCheckout: 'Checkout Review Message'
    };
    const sName = switchNames[id] || 'Automation Rule';
    if (window.fsn?.toast) {
      fsn.toast(`${sName}: ${isChecked ? '🟢 ON (Active)' : '⚪ OFF (Disabled)'}`);
    }
  };

  const PROPERTY_ROSTER = [
    { key: '101-Pink Paradise', name: 'Pink Paradise Villa (101)', defaultGroup: '120363427551867491@g.us' },
    { key: '102-Yellow House', name: 'The Yellow House (102)', defaultGroup: '120363427551867491@g.us' },
    { key: '103-Green Forest', name: 'Green Forest View (103)', defaultGroup: '120363427551867491@g.us' },
    { key: '104-Celebrity Garden', name: 'Celebrity Garden (104)', defaultGroup: '120363427551867491@g.us' },
    { key: '105-Unique 3BHK', name: 'The Unique 3BHK (105)', defaultGroup: '120363427249232463@g.us' },
    { key: '106-Light Green', name: 'The Light Green (106)', defaultGroup: '120363409825792343@g.us' },
    { key: '107-Starlight Blue', name: 'Starlight Blue PentHouse (107)', defaultGroup: '120363411439466222@g.us' },
    { key: '108-Black Beauty', name: 'Black Beauty (108)', defaultGroup: '120363427249232463@g.us' },
    { key: '109-Nawabi Stay', name: 'The Nawabi Stay (109)', defaultGroup: '120363426678446574@g.us' },
    { key: '110-Gomti Grand Villa', name: 'Gomti Grand Villa (110)', defaultGroup: '120363412244446528@g.us' },
    { key: '111-Green House', name: 'The Green House (111)', defaultGroup: '120363427551867491@g.us' },
    { key: '112-Pink House', name: 'The Pink House (112)', defaultGroup: '120363427551867491@g.us' },
    { key: '113-Brown Flat', name: 'The Brown Flat (113)', defaultGroup: '120363412078246077@g.us' },
    { key: '114-Velvet House', name: 'The Velvet House (114)', defaultGroup: '120363427551867491@g.us' },
    { key: '115-Royal White', name: 'Royal White House (115)', defaultGroup: '120363412244446528@g.us' },
    { key: '116-Dark Blue', name: 'The Dark Blue (116)', defaultGroup: '120363430510952329@g.us' },
    { key: '117-RedRose Palace', name: 'RedRose Palace (117)', defaultGroup: '120363411536897935@g.us' },
    { key: 'FLAT402-The Tehzeeb Nest', name: 'The Tehzeeb Nest (FLAT402)', defaultGroup: '120363427551867491@g.us' },
    { key: '101-The Luxe Haven', name: 'The Luxe Haven (101)', defaultGroup: '120363427551867491@g.us' }
  ];

  window.togglePropGroupRoute = function(key) {
    HUB.config = HUB.config || {};
    HUB.config.investor_groups = HUB.config.investor_groups || {};
    const item = PROPERTY_ROSTER.find(p => p.key === key);
    const defGroup = item ? item.defaultGroup : '120363427551867491@g.us';

    const current = HUB.config.investor_groups[key];
    const isCurrentlyDisabled = (current === 'disabled' || current === 'off' || current === '');

    if (isCurrentlyDisabled) {
      // Turn ON
      HUB.config.investor_groups[key] = defGroup;
    } else {
      // Turn OFF
      HUB.config.investor_groups[key] = 'disabled';
    }

    setLocalConfig(HUB.config);
    const el = document.getElementById('hubBody');
    if (el && HUB.activeTab === 'settings') el.innerHTML = renderSettingsTab();
    if (window.fsn?.toast) {
      fsn.toast(`${key}: Group alert is now ${isCurrentlyDisabled ? '🟢 ACTIVE' : '⚪ OFF'}`);
    }
  };

  window.setAllPropertyAlerts = function(enable) {
    HUB.config = HUB.config || {};
    HUB.config.investor_groups = HUB.config.investor_groups || {};

    PROPERTY_ROSTER.forEach(p => {
      HUB.config.investor_groups[p.key] = enable ? p.defaultGroup : 'disabled';
      // Also sync shorthand keys
      const shortKey = p.name.split(' (')[0];
      HUB.config.investor_groups[shortKey] = enable ? p.defaultGroup : 'disabled';
    });

    setLocalConfig(HUB.config);
    const el = document.getElementById('hubBody');
    if (el && HUB.activeTab === 'settings') el.innerHTML = renderSettingsTab();
    if (window.fsn?.toast) {
      fsn.toast(enable ? '🟢 All property group alerts ENABLED' : '⚪ All property group alerts SILENCED');
    }
  };

  window.updatePropGroupTarget = function(key, val) {
    HUB.config = HUB.config || {};
    HUB.config.investor_groups = HUB.config.investor_groups || {};
    HUB.config.investor_groups[key] = val.trim();
    setLocalConfig(HUB.config);
  };

  function renderSettingsTab() {
    const c = HUB.config || {};
    const groupsJson = JSON.stringify(c.investor_groups || {}, null, 2);

    const propRows = PROPERTY_ROSTER.map(p => {
      const map = c.investor_groups || {};
      const current = map[p.key] !== undefined ? map[p.key] : (map[p.name] !== undefined ? map[p.name] : p.defaultGroup);
      const isEnabled = (current !== 'disabled' && current !== 'off' && current !== '' && current !== false);
      const targetVal = isEnabled ? (current || p.defaultGroup) : '';

      return `
        <tr style="border-bottom:1px solid #F1F5F9;transition:background 0.15s ease;">
          <td style="padding:10px 12px;">
            <div style="font-weight:700;color:#0F172A;font-size:12.5px;">${escapeHtml(p.name)}</div>
            <div style="font-size:11px;color:#94A3B8;font-family:monospace;">${escapeHtml(p.key)}</div>
          </td>
          <td style="padding:10px 12px;white-space:nowrap;">
            <button type="button" onclick="togglePropGroupRoute('${p.key}')" style="
              border:1.5px solid ${isEnabled ? '#86EFAC' : '#CBD5E1'};
              background:${isEnabled ? '#DCFCE7' : '#F1F5F9'};
              color:${isEnabled ? '#15803D' : '#64748B'};
              font-weight:800;
              font-size:11.5px;
              padding:5px 12px;
              border-radius:20px;
              cursor:pointer;
              transition:all 0.15s ease;
            ">
              ${isEnabled ? '🟢 ACTIVE (ON)' : '⚪ OFF (DISABLED)'}
            </button>
          </td>
          <td style="padding:10px 12px;">
            <input 
              type="text" 
              value="${escapeHtml(targetVal)}" 
              placeholder="${isEnabled ? 'Group ID or Phone (e.g. 120363...@g.us)' : 'Alerts Disabled for this Property'}"
              ${!isEnabled ? 'disabled style="width:100%;box-sizing:border-box;background:#F8FAFC;color:#94A3B8;border:1px solid #E2E8F0;border-radius:6px;padding:6px 10px;font-family:monospace;font-size:11.5px;"' : 'style="width:100%;box-sizing:border-box;background:#FFFFFF;color:#0F172A;border:1px solid #CBD5E1;border-radius:6px;padding:6px 10px;font-family:monospace;font-size:11.5px;"'}
              onchange="updatePropGroupTarget('${p.key}', this.value)"
            />
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="card">
        <h3 style="margin:0 0 4px 0;color:#0F172A;">⚡ WhatsApp Automation & Group Routing</h3>
        <p style="color:#64748B;font-size:12px;margin:0 0 16px 0;">
          Live switches for Guest passes, Booking Data group alert, Investor group routing, and gateway settings.
        </p>

        <!-- 1-Button Master Automation Switch -->
        <div style="margin-bottom:18px;">
          ${renderSwitchCard({
            id: 'cfgAutoSend',
            checked: HUB.config.auto_send_enabled !== false,
            title: '⚡ Master WhatsApp Automation Switch',
            subtitle: 'New booking confirm hote hi real WhatsApp pass guest mobile par automatic dispatch hoga.'
          })}
        </div>

        <h4 style="margin:0 0 10px 0;color:#0F172A;">🔘 Sub-Automations (Guest + Booking Group + Investor)</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:18px;">
          ${renderSwitchCard({
            id: 'cfgSendWelcome',
            checked: c.send_welcome === true,
            title: '🔑 Guest Booking Pass & Check-In Details',
            subtitle: 'New booking aate hi guest ke WhatsApp mobile par instant luxury pass bhejta hai.'
          })}
          ${renderSwitchCard({
            id: 'cfgSendBookingGroup',
            checked: c.send_booking_group === true,
            title: '🛎️ 📒Booking Data Group Alert',
            subtitle: 'Booking confirm hote hi 📒Booking Data WhatsApp group me instant booking alert bhejta hai.'
          })}
          ${renderSwitchCard({
            id: 'cfgSendInvestorBooking',
            checked: c.send_investor_booking === true,
            title: '💼 Investor Group Booking Alert',
            subtitle: 'New booking confirm hote hi us property ke Investor WhatsApp group me alert bhejta hai.'
          })}
          ${renderSwitchCard({
            id: 'cfgSendInvestor',
            checked: !!c.send_investor_reports,
            title: '📊 Monthly Report to Investor Groups',
            subtitle: 'Har mahine revenue aur net profit report dedicated investor group me send karta hai.'
          })}
          ${renderSwitchCard({
            id: 'cfgSendCheckout',
            checked: !!c.send_checkout,
            title: '👋 Checkout Review & Feedback Message',
            subtitle: 'Checkout ke baad guest se feedback aur Google review request karta hai.'
          })}
        </div>

        <h4 style="margin:0 0 10px 0;color:#0F172A;">👥 General Booking Group Identifier</h4>
        <div class="form-group" style="margin-bottom:18px;background:#F8FAFC;padding:12px 14px;border-radius:10px;border:1px solid #E2E8F0;">
          <label style="font-weight:700;font-size:12.5px;display:block;margin-bottom:4px;color:#0F172A;">
            🛎️ Operations / 📒Booking Data Group ID or Phone
          </label>
          <input type="text" id="cfgBookingGroup" value="${c.booking_group_id || '120363425834560086@g.us'}" style="width:100%;box-sizing:border-box;font-family:monospace;padding:8px;border-radius:6px;border:1px solid #CBD5E1;" />
          <div style="font-size:11.5px;color:#64748B;margin-top:4px;">
            Target group receives immediate notification for every booking across all properties when "📒Booking Data Group Alert" toggle is ON.
          </div>
        </div>

        <!-- 🏢 Interactive Property-Wise Group Routing -->
        <div style="margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
            <div>
              <h4 style="margin:0;color:#0F172A;font-size:14.5px;">🏢 Property-Wise WhatsApp Group Routing</h4>
              <p style="margin:2px 0 0 0;font-size:12px;color:#64748B;">
                Aap individual properties ke group alerts ko yahin se ek click me ON ya OFF kar sakte hain.
              </p>
            </div>
            <div style="display:flex;gap:6px;">
              <button type="button" onclick="setAllPropertyAlerts(true)" class="btn-sm" style="background:#ECFDF5;color:#15803D;border:1px solid #A7F3D0;padding:5px 12px;font-size:11.5px;font-weight:700;border-radius:6px;cursor:pointer;">
                🟢 Enable All Properties
              </button>
              <button type="button" onclick="setAllPropertyAlerts(false)" class="btn-sm" style="background:#FEE2E2;color:#DC2626;border:1px solid #FCA5A5;padding:5px 12px;font-size:11.5px;font-weight:700;border-radius:6px;cursor:pointer;">
                ⚪ Silence All Properties
              </button>
            </div>
          </div>

          <div style="max-height:360px;overflow-y:auto;overflow-x:auto;-webkit-overflow-scrolling:touch;border:1.5px solid #E2E8F0;border-radius:10px;background:#fff;">
            <table style="width:100%;min-width:480px;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#F8FAFC;border-bottom:1.5px solid #E2E8F0;text-align:left;color:#475569;font-size:11px;">
                  <th style="padding:10px 12px;">HOMESTAY PROPERTY</th>
                  <th style="padding:10px 12px;">STATUS</th>
                  <th style="padding:10px 12px;">TARGET WHATSAPP GROUP / NUMBER</th>
                </tr>
              </thead>
              <tbody>
                ${propRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Advanced JSON editor (collapsible) -->
        <details style="margin-bottom:18px;border:1px solid #E2E8F0;border-radius:8px;padding:10px 14px;background:#F8FAFC;">
          <summary style="font-size:12.5px;font-weight:700;color:#475569;cursor:pointer;">
            🛠️ Advanced: Direct JSON Mapping Editor
          </summary>
          <div style="margin-top:10px;">
            <textarea id="cfgInvestorGroups" style="width:100%;box-sizing:border-box;height:110px;font-family:monospace;font-size:12px;padding:8px;border-radius:6px;border:1px solid #CBD5E1;">${groupsJson}</textarea>
          </div>
        </details>

        <h4 style="margin:0 0 10px 0;color:#0F172A;">🛡️ Official Meta Cloud API (100% Free & Ban-Proof)</h4>
        <div style="font-size:12px;color:#64748B;margin-bottom:12px;background:#EFF6FF;padding:10px 14px;border-radius:8px;border:1px solid #BFDBFE;">
          💡 <strong>Official Meta WhatsApp Cloud API</strong>: 1,000 free conversations/month provided by Meta. Zero phone disconnection, runs 24/7 in cloud. Grab credentials from <a href="https://developers.facebook.com" target="_blank" style="color:#2563EB;font-weight:700;">developers.facebook.com</a>.
        </div>

        <div class="form-group" style="margin-bottom:12px;">
          <label style="font-weight:700;font-size:12.5px;display:block;margin-bottom:4px;">Gateway Engine</label>
          <select id="cfgGatewayType" style="width:100%;box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid #CBD5E1;font-weight:600;">
            <option value="meta_cloud_api" ${c.gateway_type === 'meta_cloud_api' ? 'selected' : ''}>🛡️ Official Meta Cloud API (Recommended — Ban-Proof & Cloud 24/7)</option>
            <option value="baileys" ${c.gateway_type === 'baileys' ? 'selected' : ''}>📱 Local Baileys Gateway (QR Code)</option>
          </select>
        </div>

        <div class="form-group" style="margin-bottom:12px;">
          <label style="font-weight:700;font-size:12.5px;display:block;margin-bottom:4px;">Meta Phone Number ID</label>
          <input type="text" id="cfgMetaPhoneId" placeholder="e.g. 104829582910482" value="${c.meta_phone_number_id || ''}" style="width:100%;box-sizing:border-box;font-family:monospace;" />
        </div>

        <div class="form-group" style="margin-bottom:12px;">
          <label style="font-weight:700;font-size:12.5px;display:block;margin-bottom:4px;">WhatsApp Business Account ID (WABA ID)</label>
          <input type="text" id="cfgMetaWabaId" placeholder="e.g. 102948201948201" value="${c.meta_waba_id || ''}" style="width:100%;box-sizing:border-box;font-family:monospace;" />
        </div>

        <div class="form-group" style="margin-bottom:12px;">
          <label style="font-weight:700;font-size:12.5px;display:block;margin-bottom:4px;">Meta Permanent Access Token (System User)</label>
          <input type="password" id="cfgMetaToken" placeholder="EAAB..." value="${c.meta_access_token || ''}" style="width:100%;box-sizing:border-box;font-family:monospace;" />
        </div>

        <div class="form-group" style="margin-bottom:14px;">
          <label style="font-weight:700;font-size:12.5px;display:block;margin-bottom:4px;">Meta Webhook Callback URL & Verify Token</label>
          <div style="background:#F8FAFC;padding:8px 12px;border-radius:6px;border:1px solid #E2E8F0;font-family:monospace;font-size:12px;color:#334155;word-break:break-all;">
            <strong>Callback URL:</strong> <code>https://&lt;your-domain&gt;/api/whatsapp/webhook</code><br>
            <strong>Verify Token:</strong> <code>${c.meta_verify_token || 'uhhs_meta_secure_2026'}</code>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:18px;">
          <button type="button" onclick="testMetaWhatsApp()" style="padding:9px 14px;background:#2563EB;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;flex:1;">
            ⚡ Send Test Official WhatsApp via Meta API
          </button>
        </div>

        <h4 style="margin:0 0 10px 0;color:#0F172A;">📡 Baileys QR Local Gateway (Alternative)</h4>
        <div class="form-group" style="margin-bottom:12px;">
          <label style="font-weight:700;font-size:12.5px;display:block;margin-bottom:4px;">Gateway Server URL (Local Mac Mini)</label>
          <input type="text" id="cfgGatewayUrl" value="${c.gateway_url || 'http://localhost:3000'}" style="width:100%;box-sizing:border-box;font-family:monospace;margin-bottom:8px;" />
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="testGatewayBtn" onclick="testWhatsAppGateway()" style="padding:9px 14px;background:#0F172A;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;white-space:nowrap;flex:1 1 auto;">
              ⚡ Test Gateway Connection
            </button>
            <button type="button" onclick="setHubTab('device')" style="padding:9px 14px;background:#475569;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;white-space:nowrap;flex:1 1 auto;">
              📱 Scan QR / Switch Number
            </button>
          </div>
        </div>
        <div id="gatewayTestResult" style="margin-bottom:16px;"></div>

        <button onclick="saveHubSettings()" style="width:100%;background:#16A34A;color:#fff;border:none;padding:12px;border-radius:8px;font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 2px 6px rgba(22,163,74,0.3);">
          💾 Save Automation Settings
        </button>
      </div>
    `;
  }

  window.toggleAutoSend = async function() {
    await loadConfig();
    const newState = !HUB.config.auto_send_enabled;
    HUB.config.auto_send_enabled = newState;
    delete HUB.config.dry_run_mode;
    await saveCloudAndLocalConfig(HUB.config);

    if (window.fsn) fsn.success('Updated', `Master Automation is now ${newState ? '🟢 ACTIVE' : '🔴 PAUSED'}`);
    renderWhatsAppHub();
  };

  window.saveHubSettings = async function() {
    let invGroups = HUB.config?.investor_groups || {};
    try {
      const raw = document.getElementById('cfgInvestorGroups')?.value;
      if (raw) invGroups = JSON.parse(raw);
    } catch (e) {
      alert('⚠️ Invalid JSON in Investor Groups mapping!');
      return;
    }

    const updates = {
      auto_send_enabled: document.getElementById('cfgAutoSend') ? document.getElementById('cfgAutoSend').checked : (HUB.config.auto_send_enabled !== false),
      send_welcome: document.getElementById('cfgSendWelcome') ? document.getElementById('cfgSendWelcome').checked : (HUB.config.send_welcome === true),
      send_booking_group: document.getElementById('cfgSendBookingGroup') ? document.getElementById('cfgSendBookingGroup').checked : (HUB.config.send_booking_group === true),
      send_investor_booking: document.getElementById('cfgSendInvestorBooking') ? document.getElementById('cfgSendInvestorBooking').checked : (HUB.config.send_investor_booking === true),
      send_housekeeping_checkout: false,
      send_investor_reports: document.getElementById('cfgSendInvestor')?.checked === true,
      send_checkout: document.getElementById('cfgSendCheckout')?.checked === true,
      booking_group_id: document.getElementById('cfgBookingGroup')?.value?.trim() || '120363425834560086@g.us',
      housekeeping_group_id: '',
      investor_groups: invGroups,
      gateway_type: document.getElementById('cfgGatewayType')?.value || 'baileys',
      meta_phone_number_id: document.getElementById('cfgMetaPhoneId')?.value?.trim() || '',
      meta_waba_id: document.getElementById('cfgMetaWabaId')?.value?.trim() || '',
      meta_access_token: document.getElementById('cfgMetaToken')?.value?.trim() || '',
      meta_verify_token: 'uhhs_meta_secure_2026',
      gateway_url: document.getElementById('cfgGatewayUrl')?.value?.trim() || 'http://localhost:3000',
      updated_at: new Date().toISOString()
    };

    HUB.config = { ...HUB.config, ...updates };
    delete HUB.config.dry_run_mode;
    await saveCloudAndLocalConfig(HUB.config);

    if (window.fsn) fsn.success('Saved', '✅ Automation settings updated & synced to cloud!');
    renderWhatsAppHub();
  };

  window.testMetaWhatsApp = async function() {
    const phone = prompt('Enter recipient WhatsApp number with country code (e.g. 919876543210):', '91');
    if (!phone) return;
    const phoneId = document.getElementById('cfgMetaPhoneId')?.value?.trim() || HUB.config.meta_phone_number_id;
    const token = document.getElementById('cfgMetaToken')?.value?.trim() || HUB.config.meta_access_token;
    if (!phoneId || !token) {
      alert('⚠️ Please enter Meta Phone Number ID and Permanent Access Token first!');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    try {
      if (window.fsn) fsn.info('Sending...', 'Dispatching Meta Cloud API message');
      const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { preview_url: true, body: '👋 *Test Message from The Unique Haven Homes!*\n\nYour official Meta WhatsApp Cloud API is successfully configured and active! 🚀\n\n100% Free & Ban-Proof cloud connectivity.' }
        })
      });
      const data = await res.json();
      if (data.error) {
        alert('❌ Meta API Error:\n' + data.error.message);
      } else {
        alert('✅ SUCCESS! Official Meta WhatsApp message delivered to ' + cleanPhone + '!\nMessage ID: ' + (data.messages?.[0]?.id || 'delivered'));
      }
    } catch (err) {
      alert('❌ Failed: ' + err.message);
    }
  };

  function renderScheduledTab() {
    if (HUB.scheduled.length === 0) {
      return '<div class="card"><div style="text-align:center;padding:30px;color:#888;">No messages scheduled in next 24 hours</div></div>';
    }

    return `
      <div class="card">
        <div class="section-title">⏰ Next 24 Hours (${HUB.scheduled.length})</div>
        ${HUB.scheduled.map(s => {
          const whenStr = s.when.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
          const propName = s.booking.rooms?.property_name || s.booking.rooms?.nickname || s.booking.room_id;

          return `
            <div class="hub-scheduled-card">
              <div>
                <div style="font-weight:700;color:#0F172A;">${s.type}</div>
                <div style="font-size:13px;margin-top:2px;color:#334155;">${escapeHtml(s.booking.guest_name)} → ${escapeHtml(propName)}</div>
                <div style="font-size:11.5px;color:#64748B;margin-top:2px;">📞 ${s.booking.phone || 'No phone'}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:12px;color:#2563EB;font-weight:700;">🕐 ${whenStr}</div>
                <button onclick="hubSendNow('${s.template}','${s.booking.booking_id}')" class="btn-sm green-btn" style="margin-top:6px;padding:5px 12px;font-size:12px;">📤 Send Now</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  window.hubSendNow = async function(templateName, bookingId) {
    if (!confirm('Send message now?')) return;
    const { data: b } = await sb.from('guest_register')
      .select('*, rooms(nickname, unit_no, property_name, wifi_ssid, wifi_password, key_number)')
      .eq('booking_id', bookingId).single();
    if (!b) { fsn.error('Error', 'Booking not found'); return; }

    const result = await dispatchWhatsAppMessage({
      to: b.phone,
      isGroup: false,
      text: `Hello ${b.guest_name}, this is an update regarding your booking at ${b.rooms?.nickname || b.room_id}.`,
      type: templateName,
      bookingId: b.booking_id,
      guestName: b.guest_name
    });

    if (result.ok) {
      if (window.fsn) fsn.success('Sent', '✅ Message dispatched successfully');
      renderWhatsAppHub();
    } else {
      if (window.fsn) fsn.error('Failed', result.error || result.reason);
    }
  };

  // ─── Enhanced Guest Message Delivery Tracker ───
  HUB._logFilterStatus = 'all';
  HUB._logSearchQuery = '';

  window.filterHubLogs = function(status) {
    HUB._logFilterStatus = status;
    const el = document.getElementById('hubBody');
    if (el && HUB.activeTab === 'log') el.innerHTML = renderLogTab();
  };

  window.searchHubLogs = function(val) {
    HUB._logSearchQuery = (val || '').toLowerCase().trim();
    const el = document.getElementById('hubBody');
    if (el && HUB.activeTab === 'log') el.innerHTML = renderLogTab();
  };

  window.refreshHubDeliveryLogs = async function() {
    const btn = document.getElementById('btnRefreshLogs');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Syncing...'; }
    await loadLogs(150);
    const el = document.getElementById('hubBody');
    if (el && HUB.activeTab === 'log') el.innerHTML = renderLogTab();
    if (window.fsn?.toast) fsn.toast('✅ Live WhatsApp delivery logs updated!');
  };

  window.openQuickSendTestModal = function() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
      <div class="modal-box" style="max-width:480px;width:95vw;padding:20px;border-radius:14px;box-shadow:0 20px 40px rgba(0,0,0,0.18);">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E2E8F0;padding-bottom:10px;margin-bottom:14px;">
          <h3 style="margin:0;font-size:16.5px;color:#0F172A;display:flex;align-items:center;gap:6px;">
            💬 Send Test WhatsApp Message
          </h3>
          <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:12px;font-weight:700;color:#334155;display:block;margin-bottom:4px;">Mobile Number</label>
          <input type="tel" id="quickTestPhone" value="9454470872" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:14px;font-weight:600;" placeholder="e.g. 9454470872" />
        </div>
        <div style="margin-bottom:14px;">
          <label style="font-size:12px;font-weight:700;color:#334155;display:block;margin-bottom:4px;">Message Text</label>
          <textarea id="quickTestMsg" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:13px;height:120px;font-family:system-ui,-apple-system,sans-serif;" placeholder="Type your WhatsApp message here...">Namaste! This is an automated test message from The Unique Haven Homes. 
📍 Property: The Luxe Haven
Google Maps: https://maps.app.goo.gl/b8YjBduoQxa98QhT6</textarea>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
          <button onclick="this.closest('.modal-overlay').remove()" style="background:#F1F5F9;border:1px solid #CBD5E1;padding:8px 14px;border-radius:8px;font-weight:600;font-size:12.5px;cursor:pointer;">Cancel</button>
          <button id="btnDoQuickSend" onclick="submitQuickSendTest(this)" style="background:#25D366;color:#fff;border:none;padding:8px 18px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
            🚀 Send via WhatsApp
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  window.submitQuickSendTest = async function(btn) {
    const ph = document.getElementById('quickTestPhone')?.value?.trim();
    const msg = document.getElementById('quickTestMsg')?.value?.trim();
    if (!ph || !msg) { alert('Mobile number and message are required.'); return; }
    btn.disabled = true; btn.textContent = '⏳ Sending...';
    const res = await dispatchWhatsAppMessage({
      to: ph,
      isGroup: false,
      text: msg,
      type: 'direct_test',
      guestName: 'Test Recipient'
    });
    btn.closest('.modal-overlay')?.remove();
    if (res.ok) {
      if (window.fsn) fsn.success('Delivered!', `WhatsApp message delivered to ${ph}`);
      await refreshHubDeliveryLogs();
    } else {
      if (window.fsn) fsn.error('Send Failed', res.error || 'Could not send');
    }
  };

  function renderLogTab() {
    const allLogs = HUB.logs || [];
    const totalCount = allLogs.length;
    const sentCount = allLogs.filter(l => l.status === 'sent').length;
    const failedCount = allLogs.filter(l => l.status === 'failed').length;

    const query = HUB._logSearchQuery;
    const filter = HUB._logFilterStatus;

    let filtered = allLogs.filter(l => {
      if (filter === 'sent' && l.status !== 'sent') return false;
      if (filter === 'failed' && l.status !== 'failed') return false;
      if (filter === 'passes' && !l.template_name?.includes('confirmation') && !l.template_name?.includes('welcome')) return false;
      if (filter === 'groups' && !String(l.phone || '').includes('@g.us') && !l.template_name?.includes('group')) return false;

      if (query) {
        const name = (l.guest_name || '').toLowerCase();
        const phone = (l.phone || '').toLowerCase();
        const type = (l.template_name || '').toLowerCase();
        const text = (l.message_preview || '').toLowerCase();
        const prop = (l.property_name || '').toLowerCase();
        const bId = (l.booking_id || '').toLowerCase();
        if (!name.includes(query) && !phone.includes(query) && !type.includes(query) && !text.includes(query) && !prop.includes(query) && !bId.includes(query)) {
          return false;
        }
      }
      return true;
    });

    const rows = filtered.map(l => {
      const time = new Date(l.sent_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
      
      let statusHtml = '';
      if (l.status === 'sent') {
        statusHtml = '<span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:700;padding:4px 9px;border-radius:6px;font-size:11.5px;display:inline-flex;align-items:center;gap:4px;">✅ Sent</span>';
      } else if (l.status === 'failed') {
        statusHtml = '<span class="badge" style="background:#FEE2E2;color:#DC2626;font-weight:700;padding:4px 9px;border-radius:6px;font-size:11.5px;display:inline-flex;align-items:center;gap:4px;">❌ Failed</span>';
      } else {
        statusHtml = '<span class="badge yellow">⏳ Pending</span>';
      }

      const tNames = {
        'guest_confirmation': '🎉 Guest Booking Pass',
        'guest_welcome': '🎉 Guest Booking Pass',
        'new_booking_group': '🛎️ Booking Alert (Group)',
        'booking_group_alert': '🛎️ Booking Alert (Group)',
        'housekeeping_checkout': '🧹 Housekeeping Checkout',
        'checkout_reminder': '👋 10 AM Checkout Reminder',
        'arrival_details': '🔑 Check-in & WiFi Pass',
        'investor_report': '📊 Investor Statement',
        'booking_receipt': '🧾 Advance Payment Receipt',
        'direct_test': '💬 Quick Test Message'
      };
      const typeLabel = tNames[l.template_name] || l.template_name;
      const isGroup = String(l.phone || '').includes('@g.us');
      const cleanPhone = (l.phone || '').replace(/\D/g, '');
      const hasMap = (l.message_preview || '').includes('maps.app.goo.gl') || (l.message_preview || '').includes('maps.google.com');

      let propName = l.property_name || '';
      if (!propName && l.message_preview) {
        const pm = l.message_preview.match(/Property:\*?\s+([^\n\r]+)/i);
        if (pm && pm[1]) propName = pm[1].trim();
      }

      return `
        <tr style="border-bottom:1px solid #F1F5F9;transition:background 0.15s ease;">
          <td data-label="Time" style="white-space:nowrap;font-size:12px;color:#64748B;">
            ${time}
          </td>
          <td data-label="Status">
            ${statusHtml}
          </td>
          <td data-label="Automated Action">
            <strong style="font-size:12.5px;color:#0F172A;display:block;">${typeLabel}</strong>
            ${hasMap ? '<span style="display:inline-block;margin-top:3px;font-size:10.5px;font-weight:700;color:#0284C7;background:#E0F2FE;padding:1px 6px;border-radius:4px;">📍 Google Map Attached</span>' : ''}
          </td>
          <td data-label="Recipient">
            <div style="font-weight:800;font-size:13.5px;color:#1E293B;">${escapeHtml(l.guest_name || 'Guest')}</div>
            <div style="font-size:11.5px;color:#64748B;margin-top:2px;">
              ${isGroup ? '<span style="color:#2563EB;font-weight:700;">👥 Group</span>' : (cleanPhone ? `<a href="https://wa.me/${cleanPhone}" target="_blank" style="color:#059669;text-decoration:none;font-weight:700;display:inline-flex;align-items:center;gap:3px;"><i class="ti ti-brand-whatsapp"></i> +${cleanPhone}</a>` : '—')}
            </div>
          </td>
          <td data-label="Property / Reference">
            <div style="font-weight:700;font-size:12.5px;color:#334155;">${escapeHtml(propName || 'Apartment')}</div>
            ${l.booking_id ? `<span style="display:inline-block;font-size:11px;font-family:monospace;background:#F1F5F9;padding:1px 5px;border-radius:4px;color:#475569;margin-top:2px;">${escapeHtml(l.booking_id)}</span>` : ''}
          </td>
          <td data-label="Preview / Result" style="max-width:240px;font-size:11.5px;color:${l.error_message ? '#DC2626' : '#64748B'};line-height:1.4;">
            ${l.error_message ? `<b>Error:</b> ${escapeHtml(l.error_message)}` : escapeHtml((l.message_preview || '').substring(0, 60) + '...')}
          </td>
          <td data-label="Action" style="white-space:nowrap;text-align:right;">
            <button onclick="showFullMessageModal('${l.id}')" class="btn-sm" style="background:#F1F5F9;border:1px solid #CBD5E1;padding:5px 9px;font-size:11.5px;cursor:pointer;border-radius:6px;font-weight:700;" title="View exact message text">
              👁️ View Message
            </button>
            <button onclick="retryFailedMessage('${l.id}')" class="btn-sm" style="background:#ECFDF5;color:#059669;border:1px solid #A7F3D0;padding:5px 9px;font-size:11.5px;margin-left:4px;border-radius:6px;font-weight:700;cursor:pointer;" title="Resend to WhatsApp">
              🔄 Resend
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const mobileCards = filtered.map(l => {
      const time = new Date(l.sent_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
      let statusHtml = '';
      if (l.status === 'sent') {
        statusHtml = '<span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:700;padding:3px 8px;">✅ Sent</span>';
      } else if (l.status === 'failed') {
        statusHtml = '<span class="badge" style="background:#FEE2E2;color:#DC2626;font-weight:700;padding:3px 8px;">❌ Failed</span>';
      } else {
        statusHtml = '<span class="badge yellow">⏳ Pending</span>';
      }

      const tNames = {
        'guest_confirmation': '🎉 Guest Booking Pass',
        'guest_welcome': '🎉 Guest Booking Pass',
        'new_booking_group': '🛎️ Booking Alert (Group)',
        'booking_group_alert': '🛎️ Booking Alert (Group)',
        'housekeeping_checkout': '🧹 Housekeeping Checkout',
        'checkout_reminder': '👋 10 AM Checkout Reminder',
        'arrival_details': '🔑 Check-in & WiFi Pass',
        'investor_report': '📊 Investor Statement',
        'booking_receipt': '🧾 Advance Payment Receipt',
        'direct_test': '💬 Quick Test Message'
      };
      const typeLabel = tNames[l.template_name] || l.template_name;
      const isGroup = String(l.phone || '').includes('@g.us');
      const cleanPhone = (l.phone || '').replace(/\D/g, '');
      const hasMap = (l.message_preview || '').includes('maps.app.goo.gl') || (l.message_preview || '').includes('maps.google.com');

      let propName = l.property_name || '';
      if (!propName && l.message_preview) {
        const pm = l.message_preview.match(/Property:\*?\s+([^\n\r]+)/i);
        if (pm && pm[1]) propName = pm[1].trim();
      }

      return `
        <div class="hub-mobile-log-card" style="border:1px solid #E2E8F0;border-radius:12px;padding:14px;margin-bottom:10px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div>
              <div style="font-weight:800;font-size:14.5px;color:#0F172A;">${escapeHtml(l.guest_name || 'Guest')}</div>
              <div style="font-size:12px;color:#64748B;margin-top:2px;">
                ${isGroup ? '<span style="color:#2563EB;font-weight:700;">👥 Group</span>' : (cleanPhone ? `<a href="https://wa.me/${cleanPhone}" target="_blank" style="color:#059669;text-decoration:none;font-weight:700;">📞 +${cleanPhone}</a>` : '—')}
              </div>
            </div>
            <div style="text-align:right;">
              ${statusHtml}
              <div style="font-size:11px;color:#94A3B8;margin-top:3px;">${time}</div>
            </div>
          </div>
          <div style="margin:8px 0;display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <span style="background:#F1F5F9;padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:700;color:#334155;">
              ${typeLabel}
            </span>
            ${propName ? `<span style="font-size:11.5px;font-weight:600;color:#475569;">🏠 ${escapeHtml(propName)}</span>` : ''}
            ${hasMap ? '<span style="font-size:10.5px;font-weight:700;color:#0284C7;background:#E0F2FE;padding:1px 6px;border-radius:4px;">📍 Map Attached</span>' : ''}
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:8px 10px;font-size:12px;color:${l.error_message ? '#DC2626' : '#475569'};line-height:1.4;">
            ${l.error_message ? `<b>Error:</b> ${escapeHtml(l.error_message)}` : escapeHtml((l.message_preview || '').substring(0, 110) + ((l.message_preview || '').length > 110 ? '...' : ''))}
          </div>
          <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:8px;">
            <button onclick="showFullMessageModal('${l.id}')" class="btn-sm" style="background:#F1F5F9;border:1px solid #CBD5E1;padding:6px 12px;font-size:12px;cursor:pointer;border-radius:6px;font-weight:700;">
              👁️ View Full
            </button>
            <button onclick="retryFailedMessage('${l.id}')" class="btn-sm" style="background:#ECFDF5;color:#059669;border:1px solid #A7F3D0;padding:6px 12px;font-size:12px;border-radius:6px;font-weight:700;cursor:pointer;">
              🔄 Resend
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="padding:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <div>
            <h3 style="margin:0;font-size:18px;color:#0F172A;display:flex;align-items:center;gap:8px;">
              📊 Message Delivery & Automation Audit Tracker
            </h3>
            <p style="margin:4px 0 0 0;font-size:12.5px;color:#64748B;">
              Real-time audit log of automated booking passes, Google Maps links, and group alerts dispatched via WhatsApp.
            </p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="openQuickSendTestModal()" class="btn-sm" style="background:#25D366;color:#fff;border:none;padding:7px 14px;border-radius:7px;font-size:12.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
              💬 Test Any Mobile Number
            </button>
            <button id="btnRefreshLogs" onclick="refreshHubDeliveryLogs()" class="btn-sm" style="background:#0F172A;color:#fff;border:none;padding:7px 14px;border-radius:7px;font-size:12.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
              🔄 Live Refresh
            </button>
            <button onclick="clearAllWhatsAppLogs()" class="btn-sm" style="background:#EF4444;color:#fff;border:none;padding:7px 14px;border-radius:7px;font-size:12.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;">
              🗑️ Clear Old Logs
            </button>
          </div>
        </div>

        <!-- Metric Ribbon -->
        <div class="hub-metric-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px;">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">TOTAL DELIVERED</div>
            <div style="font-size:22px;font-weight:900;color:#0F172A;margin-top:2px;">${sentCount}</div>
          </div>
          <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:12px 14px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#15803D;text-transform:uppercase;letter-spacing:0.5px;">🏨 GUEST PASSES & MAPS</div>
            <div style="font-size:22px;font-weight:900;color:#15803D;margin-top:2px;">${allLogs.filter(l => (l.template_name||'').includes('confirmation') || (l.template_name||'').includes('welcome')).length}</div>
          </div>
          <div style="background:#EFF6FF;border:1.5px solid #93C5FD;border-radius:10px;padding:12px 14px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#1D4ED8;text-transform:uppercase;letter-spacing:0.5px;">👥 GROUP ALERTS</div>
            <div style="font-size:22px;font-weight:900;color:#1D4ED8;margin-top:2px;">${allLogs.filter(l => String(l.phone||'').includes('@g.us') || (l.template_name||'').includes('group')).length}</div>
          </div>
          <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:10px;padding:12px 14px;text-align:center;">
            <div style="font-size:11px;font-weight:800;color:#DC2626;text-transform:uppercase;letter-spacing:0.5px;">🔴 FAILED</div>
            <div style="font-size:22px;font-weight:900;color:#DC2626;margin-top:2px;">${failedCount}</div>
          </div>
        </div>

        <!-- Search & Filter Controls -->
        <div class="hub-log-toolbar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div class="hub-log-filters" style="display:flex;gap:6px;flex-wrap:wrap;">
            <button onclick="filterHubLogs('all')" class="btn-sm" style="${filter === 'all' ? 'background:#0F172A;color:#fff;font-weight:700;' : 'background:#F1F5F9;color:#334155;border:1px solid #CBD5E1;'}">All Messages (${totalCount})</button>
            <button onclick="filterHubLogs('passes')" class="btn-sm" style="${filter === 'passes' ? 'background:#0284C7;color:#fff;font-weight:700;' : 'background:#F1F5F9;color:#334155;border:1px solid #CBD5E1;'}">🔑 Guest Passes</button>
            <button onclick="filterHubLogs('groups')" class="btn-sm" style="${filter === 'groups' ? 'background:#6366F1;color:#fff;font-weight:700;' : 'background:#F1F5F9;color:#334155;border:1px solid #CBD5E1;'}">👥 Group Alerts</button>
            <button onclick="filterHubLogs('failed')" class="btn-sm" style="${filter === 'failed' ? 'background:#DC2626;color:#fff;font-weight:700;' : 'background:#F1F5F9;color:#334155;border:1px solid #CBD5E1;'}">🔴 Failed (${failedCount})</button>
          </div>

          <div class="hub-log-search-box" style="flex:1 1 240px;max-width:360px;">
            <input 
              type="text" 
              placeholder="🔍 Search guest, phone, property..." 
              value="${escapeHtml(query)}"
              oninput="searchHubLogs(this.value)"
              style="width:100%;box-sizing:border-box;padding:8px 12px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:12.5px;" 
            />
          </div>
        </div>

        <!-- Table for Desktop/Tablet & Cards for Mobile -->
        ${filtered.length === 0 ? `
          <div style="text-align:center;padding:40px;color:#64748B;background:#F8FAFC;border-radius:10px;border:1px dashed #CBD5E1;">
            <div style="font-size:32px;margin-bottom:8px;">📭</div>
            <div style="font-weight:700;font-size:14px;color:#1E293B;">No automated messages match your criteria</div>
            <div style="font-size:12px;color:#94A3B8;margin-top:2px;">Try clearing filters or search box.</div>
          </div>
        ` : `
          <!-- Desktop/Tablet Table -->
          <div class="hub-desktop-table hub-table-responsive" style="margin:0;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#F8FAFC;color:#64748B;font-size:11.5px;text-align:left;border-bottom:1.5px solid #E2E8F0;">
                  <th style="padding:10px 12px;">TIME</th>
                  <th style="padding:10px 12px;">STATUS</th>
                  <th style="padding:10px 12px;">AUTOMATED TRIGGER</th>
                  <th style="padding:10px 12px;">RECIPIENT / GUEST</th>
                  <th style="padding:10px 12px;">PROPERTY & REF</th>
                  <th style="padding:10px 12px;">PREVIEW</th>
                  <th style="padding:10px 12px;text-align:right;">ACTION</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="hub-mobile-cards">
            ${mobileCards}
          </div>
        `}
      </div>
    `;
  }

  window.showFullMessageModal = function(logId) {
    const log = (HUB.logs || []).find(l => l.id === logId);
    if (!log) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:540px;width:95vw;max-height:85vh;padding:18px;box-sizing:border-box;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid #E2E8F0;padding-bottom:8px;flex-shrink:0;">
          <h3 style="margin:0;font-size:16px;color:#0F172A;display:flex;align-items:center;gap:6px;">
            💬 WhatsApp Message Preview
          </h3>
          <button onclick="this.closest('.modal-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;padding:4px 8px;">✕</button>
        </div>

        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px;font-size:12px;margin-bottom:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px;flex-shrink:0;">
          <div><span style="color:#64748B;">Recipient:</span> <b>${escapeHtml(log.guest_name || 'Guest')}</b></div>
          <div><span style="color:#64748B;">Phone:</span> <code>${escapeHtml(log.phone || '-')}</code></div>
          <div><span style="color:#64748B;">Type:</span> <b>${escapeHtml(log.template_name || '-')}</b></div>
          <div><span style="color:#64748B;">Dispatched:</span> ${new Date(log.sent_at).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}</div>
        </div>

        <div style="background:#fff;border:1.5px solid #CBD5E1;border-radius:10px;padding:12px;font-family:system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.6;white-space:pre-wrap;overflow-y:auto;flex:1 1 auto;color:#0F172A;box-shadow:inset 0 1px 4px rgba(0,0,0,0.03);min-height:120px;">
          ${escapeHtml(log.message_preview || 'No text stored')}
        </div>

        ${log.error_message ? `
          <div style="margin-top:10px;background:#FEF2F2;border:1px solid #F87171;padding:10px;border-radius:8px;color:#991B1B;font-size:12px;flex-shrink:0;">
            <b>Failure Reason:</b> ${escapeHtml(log.error_message)}
          </div>
        ` : ''}

        <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:8px;">
          <button onclick="navigator.clipboard.writeText(\`${(log.message_preview || '').replace(/`/g, '\\`')}\`);if(window.fsn)fsn.success('Copied!','Text copied to clipboard');" style="background:#F1F5F9;border:1px solid #CBD5E1;padding:8px 14px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">
            📋 Copy Message
          </button>
          <button onclick="this.closest('.modal-overlay').remove()" style="background:#0F172A;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-weight:700;font-size:12.5px;">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  };

  window.retryFailedMessage = async function(logId) {
    const log = (HUB.logs || []).find(l => l.id === logId);
    if (!log) return;
    if (!confirm(`Dispatch message live to ${log.guest_name || log.phone}?`)) return;

    const result = await dispatchWhatsAppMessage({
      to: log.phone,
      isGroup: String(log.phone || '').includes('@g.us'),
      text: log.message_preview,
      type: log.template_name,
      bookingId: log.booking_id,
      guestName: log.guest_name
    });

    if (result.ok) {
      if (window.fsn) fsn.success('Success', 'Message delivered successfully!');
    } else {
      if (window.fsn) fsn.error('Delivery Failed', result.error || result.reason || 'Could not send');
    }
    await loadLogs(100);
    renderWhatsAppHub();
  };

  window.getBookingWhatsAppStatus = function(bookingId) {
    if (!bookingId || !HUB || !HUB.logs) return null;
    const logs = (HUB.logs || []).filter(l => l.booking_id === bookingId);
    if (logs.length === 0) return null;
    const sent = logs.find(l => l.status === 'sent');
    if (sent) return { status: 'sent', time: sent.sent_at, type: sent.template_name };
    const failed = logs.find(l => l.status === 'failed');
    if (failed) return { status: 'failed', error: failed.error_message };
    return { status: logs[0].status };
  };

  function renderTemplatesTab() {
    return `
      <div class="card">
        <div class="section-title">📝 Message Templates & Formats</div>
        <p style="color:#64748B;font-size:12px;margin:0 0 14px 0;">Formatted dynamically with real-time property and booking variables.</p>
        ${HUB.templates.map(t => `
          <div style="border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:12px;background:#F8FAFC;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="color:#0F172A;">${t.display_name}</strong>
              <span class="badge blue">${t.template_name}</span>
            </div>
            <pre style="background:#fff;border:1px solid #E2E8F0;padding:12px;border-radius:6px;font-size:12px;white-space:pre-wrap;font-family:monospace;margin:0;">${t.body_text}</pre>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Auto-scheduler tick
  async function schedulerTick() {
    try {
      await loadConfig();
      if (!HUB.config?.auto_send_enabled) return;

      const now = new Date();
      const currentHour = now.getHours();

      // Check 10:00 AM Housekeeping Checkout Alert
      if (HUB.config.send_housekeeping_checkout && currentHour === (HUB.config.checkout_send_hour || 10) && now.getMinutes() < 15) {
        const today = now.toISOString().slice(0, 10);
        const alreadyFired = (HUB.logs || []).some(l => l.template_name === 'housekeeping_checkout' && l.sent_at && l.sent_at.slice(0, 10) === today && l.status === 'sent');
        if (!alreadyFired) {
          await triggerHousekeepingCheckoutAlert();
        }
      }
    } catch (e) {}
  }

  function startScheduler() {
    if (HUB.scheduler) return;
    HUB.scheduler = setInterval(schedulerTick, 5 * 60 * 1000); // Check every 5 mins
    setTimeout(schedulerTick, 15000);
    console.log('📱 WhatsApp Hub Scheduler active');
  }

  // Start scheduler on session ready
  const timer = setInterval(() => {
    if (window.sb) {
      clearInterval(timer);
      startScheduler();
    }
  }, 1000);

  // ─── 15. DATE-RANGE INVESTOR BOOKING BROADCAST & DISPATCHER ───
  async function openInvestorBookingBroadcastModal(initialParams = {}) {
    await loadConfig();

    const getLocalDateStr = (d = new Date()) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 10);
    };

    const getDays = (ci, co) => {
      if (!ci || !co) return 1;
      try {
        const diff = (new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24);
        return Math.max(1, Math.round(diff));
      } catch(e) { return 1; }
    };

    const today = getLocalDateStr();
    const startDefault = initialParams.startDate || '2026-09-01'; // User's requested backlog start
    const endDefault = initialParams.endDate || today;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'uhhInvestorBroadcastModal';
    modal.style.zIndex = '99999';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    // Fetch properties from cache or DB
    let rooms = [];
    try {
      if (window.sb) {
        const { data } = await sb.from('rooms').select('room_id, unit_no, nickname, property_name').order('unit_no');
        if (data) rooms = data;
      }
    } catch(e) {}
    if (!rooms.length && window.UHHS_PROPERTIES) rooms = window.UHHS_PROPERTIES;

    modal.innerHTML = `
      <style>
        #uhhInvestorBroadcastModal .ib-modal-box {
          max-width: 960px;
          width: 96%;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          padding: 22px;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          position: relative;
          box-sizing: border-box;
        }
        #uhhInvestorBroadcastModal .ib-presets-bar {
          display: flex;
          gap: 8px;
          align-items: center;
          overflow-x: auto;
          white-space: nowrap;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 6px;
          margin-bottom: 10px;
        }
        #uhhInvestorBroadcastModal .ib-filter-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1.5fr 110px;
          gap: 10px;
          align-items: flex-end;
        }
        #uhhInvestorBroadcastModal .ib-card-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        #uhhInvestorBroadcastModal .ib-mobile-bks {
          display: none;
        }
        #uhhInvestorBroadcastModal .ib-desktop-bks {
          display: block;
        }
        @media (max-width: 640px) {
          #uhhInvestorBroadcastModal .ib-modal-box {
            width: 98% !important;
            max-height: 96vh !important;
            padding: 14px 10px !important;
            border-radius: 12px !important;
          }
          #uhhInvestorBroadcastModal .ib-header-title {
            font-size: 16px !important;
          }
          #uhhInvestorBroadcastModal .ib-filter-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          #uhhInvestorBroadcastModal .ib-filter-prop {
            grid-column: span 2 !important;
          }
          #uhhInvestorBroadcastModal .ib-filter-btn {
            grid-column: span 2 !important;
          }
          #uhhInvestorBroadcastModal .ib-dispatch-wrap {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          #uhhInvestorBroadcastModal .ib-dispatch-wrap button {
            width: 100% !important;
            justify-content: center !important;
          }
          #uhhInvestorBroadcastModal .ib-card-header {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          #uhhInvestorBroadcastModal .ib-card-actions {
            width: 100% !important;
            margin-top: 8px !important;
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
          }
          #uhhInvestorBroadcastModal .ib-card-actions button {
            width: 100% !important;
            justify-content: center !important;
            font-size: 11px !important;
            padding: 8px 4px !important;
          }
          #uhhInvestorBroadcastModal .ib-card-actions button:last-child {
            grid-column: span 2 !important;
          }
          #uhhInvestorBroadcastModal .ib-mobile-bks {
            display: block !important;
          }
          #uhhInvestorBroadcastModal .ib-desktop-bks {
            display: none !important;
          }
        }
      </style>

      <div class="ib-modal-box modal-box">
        
        <!-- Sticky Prominent Close Button -->
        <button type="button" class="modal-close-prominent" onclick="this.closest('.modal-overlay').remove()" title="Close (ESC)" style="position:absolute;top:12px;right:12px;background:#EF4444;color:#fff;border:none;border-radius:50%;width:34px;height:34px;font-size:16px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(239,68,68,0.35);z-index:10000;">✕</button>

        <!-- Top Header -->
        <div style="border-bottom:1px solid #E2E8F0;padding-bottom:12px;margin-bottom:12px;padding-right:45px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:24px;">📢</span>
            <div>
              <h2 class="ib-header-title" style="margin:0;font-size:18px;font-weight:900;color:#0F172A;">
                Investor Booking Broadcast &amp; Dispatcher
              </h2>
              <div style="font-size:11.5px;color:#64748B;margin-top:2px;">
                Select custom date range (e.g. from 1 Sep) and dispatch date-wise booking updates to property investors.
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:12px;padding:12px;margin-bottom:12px;">
          
          <!-- Quick Preset Chips -->
          <div class="ib-presets-bar">
            <span style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;flex-shrink:0;">Presets:</span>
            <button type="button" class="btn-sm" style="background:#EEF2FF;color:#4F46E5;border:1px solid #C7D2FE;font-weight:700;font-size:11px;cursor:pointer;flex-shrink:0;" onclick="window._setIbPreset('2026-09-01', '${today}')">
              📅 1 Sep – Today (Backlog)
            </button>
            <button type="button" class="btn-sm" style="background:#F0FDF4;color:#15803D;border:1px solid #BBF7D0;font-weight:700;font-size:11px;cursor:pointer;flex-shrink:0;" onclick="window._setIbPreset('${today}', '${today}')">
              📅 Today Only
            </button>
            <button type="button" class="btn-sm" style="background:#FFFBEB;color:#B45309;border:1px solid #FDE68A;font-weight:700;font-size:11px;cursor:pointer;flex-shrink:0;" onclick="window._setIbPreset('${getLocalDateStr(new Date(Date.now() - 86400000))}', '${getLocalDateStr(new Date(Date.now() - 86400000))}')">
              📅 Yesterday Only
            </button>
            <button type="button" class="btn-sm" style="background:#F1F5F9;color:#334155;border:1px solid #CBD5E1;font-weight:700;font-size:11px;cursor:pointer;flex-shrink:0;" onclick="window._setIbPreset('${getLocalDateStr(new Date(Date.now() - 6*86400000))}', '${today}')">
              📅 Last 7 Days
            </button>
          </div>

          <!-- Date & Property Selectors -->
          <div class="ib-filter-grid">
            <div>
              <label style="font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">From Date</label>
              <input type="date" id="ibStartDate" value="${startDefault}" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:12.5px;font-weight:600;" onchange="window._loadInvestorBroadcastData()"/>
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">To Date</label>
              <input type="date" id="ibEndDate" value="${endDefault}" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:12.5px;font-weight:600;" onchange="window._loadInvestorBroadcastData()"/>
            </div>
            <div class="ib-filter-prop">
              <label style="font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Property</label>
              <select id="ibPropertyFilter" style="width:100%;box-sizing:border-box;padding:8px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:12px;font-weight:600;" onchange="window._loadInvestorBroadcastData()">
                <option value="">🏢 All Properties (All Investors)</option>
                ${rooms.map(r => `<option value="${r.room_id}">${r.nickname || r.property_name || r.room_id} (${r.unit_no || '-'})</option>`).join('')}
              </select>
            </div>
            <div class="ib-filter-btn">
              <button type="button" class="btn-sm" style="width:100%;box-sizing:border-box;padding:9px;background:#0F172A;color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer;" onclick="window._loadInvestorBroadcastData()">
                🔍 Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Master Dispatch Action & Progress Bar -->
        <div id="ibDispatchBanner" style="display:none;background:#EEF2FF;border:1.5px solid #818CF8;border-radius:12px;padding:12px 16px;margin-bottom:12px;">
          <div class="ib-dispatch-wrap" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
              <div style="font-size:13.5px;font-weight:900;color:#1E1B4B;" id="ibSummaryTitle">
                Found Bookings Across 0 Properties
              </div>
              <div style="font-size:11.5px;color:#4338CA;margin-top:2px;" id="ibSummarySub">
                Ready to dispatch date-wise booking summaries to investors.
              </div>
            </div>
            <div>
              <button type="button" id="ibBtnSendAll" style="padding:10px 16px;background:#4F46E5;color:#fff;border:none;border-radius:10px;font-weight:900;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(79,70,229,0.35);" onclick="window._dispatchAllInvestorReports()">
                🚀 Send All to All Investors
              </button>
            </div>
          </div>
          <!-- Live progress bar -->
          <div id="ibProgressWrap" style="display:none;margin-top:10px;">
            <div style="font-size:11.5px;font-weight:700;color:#4338CA;margin-bottom:4px;" id="ibProgressLabel">Dispatching 1 of X...</div>
            <div style="height:8px;background:#C7D2FE;border-radius:4px;overflow:hidden;">
              <div id="ibProgressBar" style="height:100%;width:0%;background:#4F46E5;transition:width 0.3s;"></div>
            </div>
          </div>
        </div>

        <!-- Results Container (Scrollable Property Cards) -->
        <div style="flex:1;overflow-y:auto;padding-right:2px;" id="ibResultsArea">
          <div style="text-align:center;padding:40px;color:#64748B;">
            <div style="font-size:32px;margin-bottom:8px;">⏳</div>
            <div>Loading bookings for selected period...</div>
          </div>
        </div>

      </div>
    `;

    // Global callbacks for the modal
    window._setIbPreset = function(s, e) {
      const sInp = document.getElementById('ibStartDate');
      const eInp = document.getElementById('ibEndDate');
      if (sInp) sInp.value = s;
      if (eInp) eInp.value = e;
      window._loadInvestorBroadcastData();
    };

    window._loadInvestorBroadcastData = async function() {
      const sInp = document.getElementById('ibStartDate');
      const eInp = document.getElementById('ibEndDate');
      const sDate = (sInp && sInp.value) ? sInp.value : startDefault;
      const eDate = (eInp && eInp.value) ? eInp.value : endDefault;
      const propFilter = document.getElementById('ibPropertyFilter')?.value || '';
      const resultsArea = document.getElementById('ibResultsArea');
      const banner = document.getElementById('ibDispatchBanner');
      if (!resultsArea) return;

      resultsArea.innerHTML = `
        <div style="text-align:center;padding:40px;color:#64748B;">
          <div style="font-size:32px;margin-bottom:8px;">⏳</div>
          <div style="font-weight:700;">Fetching bookings from ${sDate} to ${eDate}...</div>
        </div>
      `;

      try {
        let client = window.sb || window.supabaseClient;
        if (!client) {
          for (let i = 0; i < 8; i++) {
            await new Promise(r => setTimeout(r, 250));
            client = window.sb || window.supabaseClient;
            if (client) break;
          }
        }
        if (!client) throw new Error('Database client not loaded. Please refresh page.');

        if (!rooms || rooms.length === 0) {
          try {
            const { data } = await client.from('rooms').select('room_id, unit_no, nickname, property_name, whatsapp_group_name').order('unit_no');
            if (data && data.length) rooms = data;
          } catch(e) {}
          if (!rooms.length && window.UHHS_PROPERTIES) rooms = window.UHHS_PROPERTIES;
        }

        let query = client.from('guest_register')
          .select('booking_id, guest_name, phone, room_id, check_in, check_out, check_in_time, check_out_time, guests, total_amount, payment_status, booking_mode, is_cancelled, is_review_booking, rooms(nickname, unit_no, property_name, whatsapp_group_name)')
          .gte('check_in', sDate)
          .lte('check_in', eDate)
          .range(0, 4999)
          .order('check_in', { ascending: true });

        if (propFilter) {
          query = query.eq('room_id', propFilter);
        }

        let { data: bks, error } = await query;
        if (error) {
          console.warn('Rooms relation query failed, falling back to direct table:', error);
          let fallbackQ = client.from('guest_register')
            .select('booking_id, guest_name, phone, room_id, check_in, check_out, check_in_time, check_out_time, guests, total_amount, payment_status, booking_mode, is_cancelled, is_review_booking')
            .gte('check_in', sDate)
            .lte('check_in', eDate)
            .range(0, 4999)
            .order('check_in', { ascending: true });
          if (propFilter) fallbackQ = fallbackQ.eq('room_id', propFilter);
          const fbRes = await fallbackQ;
          if (fbRes.error) throw fbRes.error;
          bks = fbRes.data;
        }

        const validBookings = (bks || []).filter(b => !b.is_review_booking && b.is_cancelled !== true && b.is_cancelled !== 'true');

        if (!validBookings.length) {
          if (banner) banner.style.display = 'none';
          resultsArea.innerHTML = `
            <div style="text-align:center;padding:36px;background:#F8FAFC;border:1.5px dashed #CBD5E1;border-radius:12px;">
              <div style="font-size:36px;margin-bottom:8px;">📭</div>
              <div style="font-size:15px;font-weight:800;color:#0F172A;">No Bookings Found</div>
              <div style="font-size:12px;color:#64748B;margin-top:4px;">
                No confirmed bookings found with check-in between <strong>${sDate}</strong> and <strong>${eDate}</strong>.
              </div>
            </div>
          `;
          return;
        }

        // Group by property
        const groupMap = HUB.config?.investor_groups || DEFAULT_WA_CONFIG.investor_groups || {};
        const propertyGroups = new Map();

        validBookings.forEach(b => {
          const rid = b.room_id || 'Unknown';
          if (!propertyGroups.has(rid)) {
            const roomObj = b.rooms || rooms.find(r => r.room_id === rid) || {};
            const nick = roomObj.nickname || roomObj.property_name || rid;
            const unit = roomObj.unit_no || '';

            // Find target group
            let targetGroup = groupMap[rid] || groupMap[nick] || groupMap[roomObj.whatsapp_group_name];
            if (!targetGroup) {
              for (const [k, gid] of Object.entries(groupMap)) {
                if (k && nick.toLowerCase().includes(k.toLowerCase())) {
                  targetGroup = gid;
                  break;
                }
              }
            }
            if (!targetGroup && (rid === 'VIL-105' || nick.toLowerCase().includes('yellow') || rid.startsWith('VIL-'))) {
              targetGroup = '120363427551867491@g.us';
            }

            // Find friendly investor name
            let investorName = 'Investor Group';
            for (const [k, gid] of Object.entries(groupMap)) {
              if (gid === targetGroup && !k.startsWith('VIL-') && !k.startsWith('GOM-') && !k.startsWith('LUL-')) {
                investorName = k;
                break;
              }
            }

            propertyGroups.set(rid, {
              roomId: rid,
              roomNickname: nick,
              unitNo: unit,
              targetGroup: targetGroup || null,
              investorName: investorName,
              bookings: []
            });
          }

          propertyGroups.get(rid).bookings.push(b);
        });

        const propList = Array.from(propertyGroups.values());
        window._currentInvestorProps = propList;

        const totalBksCount = validBookings.length;
        const totalRevenueAll = validBookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);

        // Update top banner
        if (banner) {
          banner.style.display = 'block';
          const titleEl = document.getElementById('ibSummaryTitle');
          const subEl = document.getElementById('ibSummarySub');
          const btnAll = document.getElementById('ibBtnSendAll');
          if (titleEl) titleEl.textContent = `Found ${totalBksCount} Bookings Across ${propList.length} Properties`;
          if (subEl) subEl.textContent = `Period: ${sDate} to ${eDate} · Total Revenue: ₹${totalRevenueAll.toLocaleString('en-IN')}`;
          if (btnAll) btnAll.textContent = `🚀 Send All to All Investors (${propList.length} Properties)`;
        }

        // Render Property Cards
        resultsArea.innerHTML = propList.map((p, pIdx) => {
          const propTotal = p.bookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);
          const totalNights = p.bookings.reduce((s, b) => s + getDays(b.check_in, b.check_out), 0);
          const msgText = window._buildInvestorPropMessage(p, sDate, eDate);

          return `
            <div id="propGroupCard_${pIdx}" style="background:#fff;border:1.5px solid #E2E8F0;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 2px 6px rgba(0,0,0,0.04);box-sizing:border-box;">
              
              <!-- Card Header -->
              <div class="ib-card-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                <div>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:16px;">🏠</span>
                    <strong style="font-size:14.5px;color:#0F172A;">${escapeHtml(p.roomNickname)} ${p.unitNo ? `(${escapeHtml(p.unitNo)})` : ''}</strong>
                    <span class="badge" style="background:#EEF2FF;color:#4F46E5;font-size:10px;font-weight:800;">${p.roomId}</span>
                  </div>
                  <div style="font-size:11.5px;color:#64748B;margin-top:2px;">
                    Investor: <strong>${escapeHtml(p.investorName)}</strong> · 
                    Target: <code style="font-size:10.5px;color:${p.targetGroup ? '#059669' : '#DC2626'};">${p.targetGroup || '⚠️ Group Not Mapped'}</code>
                  </div>
                </div>

                <!-- Per-Property Action Buttons -->
                <div class="ib-card-actions">
                  <button type="button" id="btnSendProp_${pIdx}" class="btn-sm" style="background:#4F46E5;color:#fff;border:none;padding:7px 12px;border-radius:8px;font-weight:800;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" onclick="window._sendSinglePropertyToInvestor(${pIdx})">
                    📤 Send to Investor
                  </button>
                  <button type="button" class="btn-sm" style="background:#25D366;color:#fff;border:none;padding:7px 10px;border-radius:8px;font-weight:800;font-size:11.5px;cursor:pointer;" onclick="window._openPropInWhatsAppWeb(${pIdx})">
                    📱 WhatsApp
                  </button>
                  <button type="button" class="btn-sm outline" style="padding:7px 8px;font-size:11.5px;" onclick="window._toggleMsgPreview(${pIdx})">
                    👁️ Preview
                  </button>
                </div>
              </div>

              <!-- Stats Pill Strip -->
              <div style="display:flex;gap:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:8px 10px;font-size:11.5px;margin-bottom:10px;flex-wrap:wrap;align-items:center;">
                <div>📅 Bookings: <strong style="color:#0F172A;">${p.bookings.length}</strong></div>
                <div>🌙 Nights: <strong style="color:#0F172A;">${totalNights}</strong></div>
                <div>💰 Revenue: <strong style="color:#059669;">₹${propTotal.toLocaleString('en-IN')}</strong></div>
                <div id="propStatus_${pIdx}" style="margin-left:auto;font-weight:700;color:#64748B;">Ready to send</div>
              </div>

              <!-- Collapsible Message Preview -->
              <div id="msgPreviewBox_${pIdx}" style="display:none;background:#F1F5F9;border:1px dashed #CBD5E1;border-radius:8px;padding:12px;margin-bottom:10px;position:relative;">
                <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;margin-bottom:6px;">Message Preview:</div>
                <pre style="white-space:pre-wrap;font-family:sans-serif;font-size:11.5px;color:#1E293B;margin:0;line-height:1.5;">${escapeHtml(msgText)}</pre>
                <button type="button" class="btn-sm" style="position:absolute;top:8px;right:8px;background:#fff;border:1px solid #CBD5E1;font-size:10.5px;cursor:pointer;" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(msgText)}'));alert('Copied to clipboard!');">📋 Copy</button>
              </div>

              <!-- 1. Mobile Cards View (shown on screen <= 640px) -->
              <div class="ib-mobile-bks" style="border:1px solid #E2E8F0;border-radius:8px;background:#fff;overflow:hidden;">
                ${p.bookings.map((b, bIdx) => {
                  const n = getDays(b.check_in, b.check_out);
                  return `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #F1F5F9;background:${bIdx % 2 === 0 ? '#fff' : '#FAFAFA'};">
                      <div>
                        <div style="font-weight:800;color:#0F172A;font-size:12px;display:flex;align-items:center;gap:6px;">
                          <span>📅 ${b.check_in} → ${b.check_out}</span>
                          <span style="background:#E2E8F0;color:#334155;font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;">${n}N</span>
                        </div>
                        <div style="color:#475569;font-size:11.5px;margin-top:3px;display:flex;align-items:center;gap:6px;">
                          <span>👤 <strong>${escapeHtml(b.guest_name || 'Guest')}</strong></span>
                          <span class="badge" style="background:${b.booking_mode === 'Online-Airbnb' ? '#FEF3C7' : '#F1F5F9'};color:${b.booking_mode === 'Online-Airbnb' ? '#B45309' : '#334155'};font-size:9.5px;padding:1px 5px;">
                            ${escapeHtml(b.booking_mode || 'Direct')}
                          </span>
                        </div>
                      </div>
                      <div style="text-align:right;">
                        <div style="font-weight:900;color:#059669;font-size:13.5px;">₹${Number(b.total_amount || 0).toLocaleString('en-IN')}</div>
                        <div style="font-size:9.5px;color:#94A3B8;">#${bIdx + 1}</div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- 2. Desktop Table View (shown on screen > 640px) -->
              <div class="ib-desktop-bks" style="border:1px solid #E2E8F0;border-radius:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;">
                <table style="width:100%;min-width:520px;border-collapse:collapse;font-size:11.5px;">
                  <thead>
                    <tr style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;color:#475569;text-align:left;">
                      <th style="padding:6px 10px;width:30px;">#</th>
                      <th style="padding:6px 10px;">Check-In → Check-Out</th>
                      <th style="padding:6px 10px;">Guest</th>
                      <th style="padding:6px 10px;">Mode</th>
                      <th style="padding:6px 10px;text-align:right;">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${p.bookings.map((b, bIdx) => {
                      const n = getDays(b.check_in, b.check_out);
                      return `
                        <tr style="border-bottom:1px solid #F1F5F9;background:${bIdx % 2 === 0 ? '#fff' : '#FAFAFA'};">
                          <td style="padding:6px 10px;color:#64748B;">${bIdx + 1}</td>
                          <td style="padding:6px 10px;font-weight:700;color:#0F172A;">
                            ${b.check_in} → ${b.check_out} <span style="font-weight:400;color:#64748B;">(${n}N)</span>
                          </td>
                          <td style="padding:6px 10px;color:#334155;">${escapeHtml(b.guest_name || 'Guest')}</td>
                          <td style="padding:6px 10px;">
                            <span class="badge" style="background:${b.booking_mode === 'Online-Airbnb' ? '#FEF3C7' : '#F1F5F9'};color:${b.booking_mode === 'Online-Airbnb' ? '#B45309' : '#334155'};font-size:10px;">
                              ${escapeHtml(b.booking_mode || 'Direct')}
                            </span>
                          </td>
                          <td style="padding:6px 10px;text-align:right;font-weight:800;color:#059669;">
                            ₹${Number(b.total_amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>

            </div>
          `;
        }).join('');

      } catch(err) {
        console.error('Error loading investor broadcast bookings:', err);
        resultsArea.innerHTML = `<div class="error" style="color:#DC2626;background:#FEF2F2;padding:16px;border-radius:10px;">❌ Error loading bookings: ${escapeHtml(err.message)}</div>`;
      }
    };

    // Format Date-wise Message
    window._buildInvestorPropMessage = function(p, sDate, eDate) {
      const propTotal = p.bookings.reduce((s, b) => s + Number(b.total_amount || 0), 0);
      const totalNights = p.bookings.reduce((s, b) => s + (b.check_in && b.check_out && window.calcNights ? calcNights(b.check_in, b.check_out) : 1), 0);

      const items = p.bookings.map((b, i) => {
        const n = (b.check_in && b.check_out && window.calcNights) ? calcNights(b.check_in, b.check_out) : 1;
        const ci = b.check_in;
        const co = b.check_out;
        const mode = b.booking_mode || 'Offline (Direct)';
        const amt = Number(b.total_amount || 0).toLocaleString('en-IN');
        return `${i + 1}. 📅 *${ci}* to *${co}* (${n}N)\n   • Booking: ${mode}\n   • Amount: ₹${amt}`;
      }).join('\n\n');

      return `Booking Update — Investor Statement

Property: ${p.roomNickname} ${p.unitNo ? `(${p.unitNo})` : ''}
Period: ${sDate} to ${eDate}

Date-wise Bookings (${p.bookings.length}):

${items}

━━━━━━━━━━━━━━━━━━━━━━
📈 Total Bookings: ${p.bookings.length}
🌙 Total Nights: ${totalNights} Nights
💰 Total Revenue: ₹${propTotal.toLocaleString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━━

The Unique Haven Homes Property Management`;
    };

    window._toggleMsgPreview = function(idx) {
      const box = document.getElementById(`msgPreviewBox_${idx}`);
      if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
    };

    window._openPropInWhatsAppWeb = function(idx) {
      const p = window._currentInvestorProps?.[idx];
      if (!p) return;
      const sDate = document.getElementById('ibStartDate')?.value || startDefault;
      const eDate = document.getElementById('ibEndDate')?.value || endDefault;
      const msg = window._buildInvestorPropMessage(p, sDate, eDate);

      let target = p.targetGroup || '';
      let url = '';
      const isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent || '');
      const cleanP = target.includes('@') ? '' : target.replace(/\D/g, '');

      if (isMobile) {
        if (cleanP) {
          url = `https://api.whatsapp.com/send?phone=${cleanP}&text=${encodeURIComponent(msg)}`;
        } else {
          url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
        }
      } else {
        if (cleanP) {
          url = `https://web.whatsapp.com/send?phone=${cleanP}&text=${encodeURIComponent(msg)}`;
        } else {
          url = `https://web.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
        }
      }
      window.open(url, '_blank');
    };

    window._sendSinglePropertyToInvestor = async function(idx) {
      const p = window._currentInvestorProps?.[idx];
      if (!p) return;
      const sDate = document.getElementById('ibStartDate')?.value || startDefault;
      const eDate = document.getElementById('ibEndDate')?.value || endDefault;
      const msg = window._buildInvestorPropMessage(p, sDate, eDate);

      const btn = document.getElementById(`btnSendProp_${idx}`);
      const statusEl = document.getElementById(`propStatus_${idx}`);
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending...'; }
      if (statusEl) statusEl.innerHTML = '<span style="color:#4F46E5;">⏳ Sending...</span>';

      if (!p.targetGroup) {
        alert(`⚠️ No target WhatsApp group mapped for property: ${p.roomNickname}.\nPlease send manually via WhatsApp Web or map the group in WhatsApp Hub.`);
        if (btn) { btn.disabled = false; btn.textContent = '📤 Send to Investor'; }
        if (statusEl) statusEl.innerHTML = '<span style="color:#DC2626;">❌ Group not mapped</span>';
        return;
      }

      try {
        const res = await dispatchWhatsAppMessage({
          to: p.targetGroup,
          isGroup: p.targetGroup.includes('@g.us'),
          text: msg,
          type: 'new_booking_investor',
          guestName: `Investor Statement (${p.roomNickname})`
        });

        if (res && res.ok) {
          if (btn) { btn.disabled = false; btn.textContent = '✅ Sent'; btn.style.background = '#059669'; }
          if (statusEl) statusEl.innerHTML = '<span style="color:#059669;font-weight:800;">✅ Dispatched</span>';
        } else {
          throw new Error(res?.error || 'Failed to dispatch via gateway');
        }
      } catch(err) {
        console.warn('Dispatch failed:', err);
        if (btn) { btn.disabled = false; btn.textContent = '⚠️ Retry Send'; btn.style.background = '#DC2626'; }
        if (statusEl) statusEl.innerHTML = `<span style="color:#DC2626;">❌ Failed: ${escapeHtml(err.message)}</span>`;
        alert(`❌ Could not send automatically: ${err.message}\nOpening WhatsApp Web as fallback...`);
        window._openPropInWhatsAppWeb(idx);
      }
    };

    window._dispatchAllInvestorReports = async function() {
      const props = window._currentInvestorProps || [];
      if (!props.length) return;

      const ok = confirm(`🚀 Kya aap sabhi (${props.length}) properties ke investors ko date-wise booking updates send karna chahte hain?`);
      if (!ok) return;

      const pWrap = document.getElementById('ibProgressWrap');
      const pLabel = document.getElementById('ibProgressLabel');
      const pBar = document.getElementById('ibProgressBar');
      const btnAll = document.getElementById('ibBtnSendAll');

      if (pWrap) pWrap.style.display = 'block';
      if (btnAll) { btnAll.disabled = true; btnAll.textContent = '⏳ Dispatching All...'; }

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < props.length; i++) {
        const p = props[i];
        const pct = Math.round(((i + 1) / props.length) * 100);
        if (pLabel) pLabel.textContent = `Dispatching ${i + 1} of ${props.length}: ${p.roomNickname}...`;
        if (pBar) pBar.style.width = pct + '%';

        const btn = document.getElementById(`btnSendProp_${i}`);
        const statusEl = document.getElementById(`propStatus_${i}`);
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending...'; }

        if (!p.targetGroup) {
          failCount++;
          if (statusEl) statusEl.innerHTML = '<span style="color:#DC2626;">❌ Group not mapped</span>';
          continue;
        }

        const sDate = document.getElementById('ibStartDate')?.value || startDefault;
        const eDate = document.getElementById('ibEndDate')?.value || endDefault;
        const msg = window._buildInvestorPropMessage(p, sDate, eDate);

        try {
          const res = await dispatchWhatsAppMessage({
            to: p.targetGroup,
            isGroup: p.targetGroup.includes('@g.us'),
            text: msg,
            type: 'new_booking_investor',
            guestName: `Investor Statement (${p.roomNickname})`
          });

          if (res && res.ok) {
            successCount++;
            if (btn) { btn.disabled = false; btn.textContent = '✅ Sent'; btn.style.background = '#059669'; }
            if (statusEl) statusEl.innerHTML = '<span style="color:#059669;font-weight:800;">✅ Dispatched</span>';
          } else {
            throw new Error(res?.error || 'Failed');
          }
        } catch(err) {
          failCount++;
          if (btn) { btn.disabled = false; btn.textContent = '⚠️ Retry'; }
          if (statusEl) statusEl.innerHTML = `<span style="color:#DC2626;">❌ ${escapeHtml(err.message)}</span>`;
        }

        // 1-second delay between dispatches
        await new Promise(r => setTimeout(r, 1000));
      }

      if (btnAll) {
        btnAll.disabled = false;
        btnAll.textContent = `✅ Completed (${successCount} Sent, ${failCount} Failed)`;
      }
      if (pLabel) {
        pLabel.textContent = `Completed! ${successCount} sent successfully${failCount > 0 ? `, ${failCount} failed/unmapped` : ''}.`;
      }
      alert(`🎉 Dispatch Completed!\n✅ Successfully sent to ${successCount} property investors.\n${failCount > 0 ? `⚠️ ${failCount} properties could not be sent (group unmapped or offline).` : ''}`);
    };

    // Close on Escape key press
    const escIb = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        modal.remove();
        window.removeEventListener('keydown', escIb);
      }
    };
    window.addEventListener('keydown', escIb);

    document.body.appendChild(modal);

    // Initial load
    setTimeout(() => {
      window._loadInvestorBroadcastData();
    }, 100);
  }

  window.renderWhatsAppHub = renderWhatsAppHub;
  window.dispatchWhatsAppMessage = dispatchWhatsAppMessage;
  window.openInvestorBookingBroadcastModal = openInvestorBookingBroadcastModal;
})();
