// ═══════════════════════════════════════════════════════════
// 📱 WHATSAPP AUTOMATION & COMMUNICATION HUB v2
// THE UNIQUE HAVEN HOMES PRIVATE LIMITED
// Supports: Free Headless Gateway (Baileys), Groups (@g.us),
// Master ON/OFF Switch, Dry-Run Mode & Live Dispatches
// ═══════════════════════════════════════════════════════════

(function() {
  const WA_LOCAL_CONFIG_KEY = 'uhhs_wa_automation_v2';
  const WA_LOCAL_LOGS_KEY = 'uhhs_wa_logs_v2';

  const DEFAULT_WA_CONFIG = {
    auto_send_enabled: false, // 🔴 MASTER OFF BY DEFAULT AS REQUESTED
    dry_run_mode: true, // 🧪 Safe test mode (no real messages sent without testing)
    gateway_url: 'http://localhost:3000',
    gateway_type: 'baileys', // 'meta_cloud_api' | 'baileys'
    meta_phone_number_id: '',
    meta_waba_id: '',
    meta_access_token: '',
    meta_verify_token: 'uhhs_meta_secure_2026',

    // Granular Sub-Toggles (Default disabled until master turned ON)
    send_booking_group: true,
    send_housekeeping_checkout: true,
    send_investor_reports: true,
    send_welcome: false,
    send_arrival: false,
    send_checkout: false,

    // Group Identifiers (Auto-discovered from your WhatsApp)
    booking_group_id: '120363425834560086@g.us', // 📒Booking Data
    housekeeping_group_id: '120363426832875312@g.us', // Chinhat All booking offline
    investor_groups: {
      'Sabir Bhai': '120363430510952329@g.us',
      'Afzal & Hazi Group': '120363412244446528@g.us',
      'Alam Sahab': '120363427249232463@g.us',
      'Sanaul Mustafa': '120363426678446574@g.us',
      'Afzal Khan': '120363411536897935@g.us',
      'Ammy Papa': '120363412078246077@g.us',
      'Shanu Bhaijaan': '120363409825792343@g.us',
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
    activeTab: 'auto',
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

  // ─── Dual-Layer Config: LocalStorage + Supabase (Free Tier Safe) ───
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
  }

  async function loadConfig() {
    const local = getLocalConfig();
    if (local) {
      HUB.config = { ...DEFAULT_WA_CONFIG, ...local };
    }
    // Attempt Supabase fetch
    try {
      if (window.sb) {
        const { data } = await sb.from('whatsapp_config').select('*').eq('id', 1).single();
        if (data) {
          HUB.config = { ...HUB.config, ...data };
        }
      }
    } catch (e) {}
    return HUB.config;
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
    try {
      if (window.sb) {
        const { data } = await sb.from('whatsapp_log').select('*').order('sent_at', { ascending: false }).limit(limit);
        if (data) dbLogs = data;
      }
    } catch (e) {}

    // Merge logs
    const map = new Map();
    dbLogs.forEach(l => map.set(l.id || `${l.sent_at}_${l.phone}`, l));
    local.forEach(l => {
      const k = l.id || `${l.sent_at}_${l.phone}`;
      if (!map.has(k)) map.set(k, l);
    });

    HUB.logs = Array.from(map.values()).sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0));
    return HUB.logs;
  }

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
      body_text: '📊 *MONTHLY INVESTOR STATEMENT — {{1}}*\n━━━━━━━━━━━━━━━━━━\n👤 *Investor:* {{2}}\n🏠 *Property:* {{3}}\n💵 *Gross Revenue:* ₹{{4}}\n📉 *Expenses & Ops:* -₹{{5}}\n━━━━━━━━━━━━━━━━━━\n💰 *NET PAYOUT:* ₹{{6}}\n━━━━━━━━━━━━━━━━━━\n_Generated via UHHS CRM_'
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
    if (!HUB.config.auto_send_enabled) {
      console.log('🛑 [WhatsApp Hub] Auto-send is MASTER OFF. Skipping message for:', to);
      return { ok: false, reason: 'master_off' };
    }

    // 2. GRANULAR TOGGLE CHECK
    if (type === 'new_booking_group' && !HUB.config.send_booking_group) {
      console.log('🛑 [WhatsApp Hub] Booking Group alerts are OFF.');
      return { ok: false, reason: 'subtoggle_off' };
    }
    if (type === 'housekeeping_checkout' && !HUB.config.send_housekeeping_checkout) {
      console.log('🛑 [WhatsApp Hub] Housekeeping Checkout alerts are OFF.');
      return { ok: false, reason: 'subtoggle_off' };
    }
    if (type === 'investor_report' && !HUB.config.send_investor_reports) {
      console.log('🛑 [WhatsApp Hub] Investor Group alerts are OFF.');
      return { ok: false, reason: 'subtoggle_off' };
    }
    if (type === 'guest_welcome' && !HUB.config.send_welcome) {
      return { ok: false, reason: 'subtoggle_off' };
    }
    if (type === 'checkout_reminder' && !HUB.config.send_checkout) {
      return { ok: false, reason: 'subtoggle_off' };
    }

    if (!to) {
      console.warn('⚠️ [WhatsApp Hub] Missing recipient / group ID.');
      return { ok: false, reason: 'missing_recipient' };
    }

    const isDryRun = HUB.config.dry_run_mode !== false;
    const logEntry = {
      id: 'walog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      booking_id: bookingId || null,
      guest_name: guestName || (isGroup ? 'WhatsApp Group' : 'Recipient'),
      phone: to,
      template_name: type,
      message_preview: (text || '').substring(0, 500),
      is_dry_run: isDryRun,
      triggered_by: 'auto',
      status: isDryRun ? 'sent' : 'pending',
      sent_at: new Date().toISOString()
    };

    // 3. DRY RUN MODE (TESTING ONLY)
    if (isDryRun) {
      logEntry.status = 'sent';
      logEntry.api_response = { dry_run: true, note: '🧪 Simulated send in Dry-Run mode' };
      appendLocalLog(logEntry);
      try { if (window.sb) await sb.from('whatsapp_log').insert(logEntry); } catch (e) {}
      console.log('🧪 [WhatsApp Hub Dry Run] Dispatched:', { to, isGroup, text });
      if (window.fsn) fsn.info('Dry Run Simulated', `Message ready for ${to}`);
      return { ok: true, dry_run: true };
    }

    // 4. LIVE SEND TO META CLOUD API OR LOCAL GATEWAY
    if (HUB.config.gateway_type === 'meta_cloud_api' && HUB.config.meta_phone_number_id && HUB.config.meta_access_token) {
      try {
        const cleanPhone = String(to).replace(/\D/g, '');
        const recipientPhone = cleanPhone.length === 10 ? ('91' + cleanPhone) : cleanPhone;
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
            to: recipientPhone,
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

        console.log('✅ [WhatsApp Hub Meta API] Dispatched to:', recipientPhone);
        if (window.fsn) fsn.success('Official WhatsApp Sent', `Delivered via Meta API to ${recipientPhone}`);
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

    const gatewayUrl = HUB.config.gateway_url || 'http://localhost:3000';
    try {
      const endpoint = gatewayUrl.replace(/\/+$/, '') + '/send-message';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to,
          message: text,
          isGroup: !!isGroup
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Gateway returned status ' + res.status);
      }

      logEntry.status = 'sent';
      logEntry.api_response = data;
      appendLocalLog(logEntry);
      try { if (window.sb) await sb.from('whatsapp_log').insert(logEntry); } catch (e) {}

      console.log('✅ [WhatsApp Hub] Dispatched successfully to:', to);
      if (window.fsn) fsn.success('WhatsApp Sent', `Delivered to ${to}`);
      return { ok: true, data };
    } catch (err) {
      logEntry.status = 'failed';
      logEntry.error_message = err.message;
      appendLocalLog(logEntry);
      try { if (window.sb) await sb.from('whatsapp_log').insert(logEntry); } catch (e) {}

      console.warn('❌ [WhatsApp Hub] Gateway failed:', err.message);
      if (window.fsn) fsn.warn('WhatsApp Gateway Notice', `Could not reach ${gatewayUrl}. Please ensure whatsapp-bot is running.`);
      return { ok: false, error: err.message };
    }
  }

  // ─── GLOBAL AUTOMATION TRIGGERS ───

  // A. Trigger New Booking Alert to Booking Group
  window.triggerBookingGroupAlert = async function(b) {
    if (!b) return;
    await loadConfig();
    const groupId = HUB.config.booking_group_id;
    if (!groupId) {
      console.log('ℹ️ Booking group ID not configured in Settings.');
      return;
    }

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
      `🛎️ *NEW BOOKING CONFIRMED*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🏠 *Property:* ${roomName}\n` +
      `👤 *Guest:* ${guest}\n` +
      `📞 *Phone:* ${phone}\n` +
      `📅 *Check-in:* ${fmtD(b.check_in)} (${b.check_in_time || '14:00'})\n` +
      `📅 *Check-out:* ${fmtD(b.check_out)} (${b.check_out_time || '11:00'})\n` +
      `🌙 *Duration:* ${nights} Night${nights > 1 ? 's' : ''}\n` +
      `💰 *Total:* ₹${tot.toLocaleString('en-IN')} | Paid: ₹${adv.toLocaleString('en-IN')} | Due: ₹${due.toLocaleString('en-IN')}\n` +
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

  // A2. Trigger Direct Booking Confirmation Pass to Guest Mobile
  window.triggerGuestBookingPass = async function(b) {
    if (!b || !b.phone) return;
    await loadConfig();
    if (!HUB.config.master_automation) {
      console.log('ℹ️ Master automation is PAUSED in WhatsApp Hub.');
      return;
    }
    if (HUB.config.send_welcome === false) {
      console.log('ℹ️ Guest booking pass toggle is OFF in WhatsApp Hub.');
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
      const roomName = b.rooms?.nickname || b.rooms?.unit_no || b.room_name || b.room_id || 'Apartment';
      const guest = b.guest_name || 'Guest';
      const fmtD = (dt) => {
        if (!dt) return '';
        try { return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
        catch(e) { return dt; }
      };
      text =
        `🎉 *BOOKING CONFIRMED — THE UNIQUE HAVEN HOMES*\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `Dear *${guest}*,\n` +
        `Thank you for choosing The Unique Haven Homes! Your stay is confirmed.\n\n` +
        `🏠 *Property:* ${roomName}\n` +
        `📅 *Check-in:* ${fmtD(b.check_in)} (From 02:00 PM)\n` +
        `📅 *Check-out:* ${fmtD(b.check_out)} (By 11:00 AM)\n` +
        `💰 *Total Amount:* ₹${(b.total_amount || 0).toLocaleString('en-IN')}\n\n` +
        `📞 *Concierge Support:*\n` +
        `• Mr. Shahanshah: +91 94500 55554\n` +
        `• Mr. Firoz Khan: +91 82996 00709\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `_The Unique Haven Homes Luxury Stays_`;
    }

    return await dispatchWhatsAppMessage({
      to: b.phone,
      isGroup: false,
      text: text,
      type: 'guest_welcome',
      bookingId: b.booking_id,
      guestName: b.guest_name || 'Guest'
    });
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
  // UI RENDERING
  // ═══════════════════════════════════════════════════════════
  async function renderWhatsAppHub() {
    renderShell('<div class="loading">📱 Loading Communication Hub...</div>', 'whatsapp-hub');

    await Promise.all([loadConfig(), loadTemplates(), loadLogs(50), fetchScheduled()]);

    const enabled = HUB.config?.auto_send_enabled;
    const dryRun = HUB.config?.dry_run_mode !== false;

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
              <div class="hub-stat-val" style="color:${enabled ? '#15803D' : '#DC2626'};">
                ${enabled ? '🟢 ACTIVE (ON)' : '🔴 PAUSED (OFF)'}
              </div>
            </div>
            <div class="hub-stat-tile">
              <div class="hub-stat-label">EXECUTION MODE</div>
              <div class="hub-stat-val" style="color:${dryRun ? '#D97706' : '#15803D'};">
                ${dryRun ? '🧪 DRY RUN' : '📡 LIVE'}
              </div>
            </div>
            <div class="hub-stat-tile">
              <div class="hub-stat-label">WHATSAPP SENDER</div>
              <div id="hubSenderHeaderBadge" class="hub-stat-val" style="color:#2563EB;font-size:15px;margin-top:4px;">
                Checking...
              </div>
            </div>
            <div class="hub-stat-tile">
              <div class="hub-stat-label">SENT TODAY</div>
              <div class="hub-stat-val" style="color:#0F172A;">${sentToday}</div>
            </div>
            <div class="hub-stat-tile">
              <div class="hub-stat-label">SCHEDULED (24h)</div>
              <div class="hub-stat-val" style="color:#2563EB;">${HUB.scheduled.length}</div>
            </div>
          </div>
        </div>

        <!-- Scrollable Navigation Tabs -->
        <div class="hub-tabs-scroller" id="hubTabsScroller">
          ${[
            { key: 'device', label: '📱 Link WhatsApp / Scan QR' },
            { key: 'auto', label: '🎯 Controls & Triggers' },
            { key: 'settings', label: '⚙️ Settings & Group IDs' },
            { key: 'scheduled', label: '⏰ Scheduled (' + HUB.scheduled.length + ')' },
            { key: 'log', label: '📋 Message Log' },
            { key: 'templates', label: '📝 Templates' }
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
    else if (HUB.activeTab === 'auto') el.innerHTML = renderOverviewTab();
    else if (HUB.activeTab === 'settings') el.innerHTML = renderSettingsTab();
    else if (HUB.activeTab === 'scheduled') el.innerHTML = renderScheduledTab();
    else if (HUB.activeTab === 'log') el.innerHTML = renderLogTab();
    else if (HUB.activeTab === 'templates') el.innerHTML = renderTemplatesTab();
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
          <div style="border:1.5px solid ${c.send_welcome ? '#86EFAC' : '#E2E8F0'};background:${c.send_welcome ? '#F0FDF4' : '#F8FAFC'};border-radius:10px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#0F172A;">📱 Guest Booking Pass &amp; Invoice</strong>
              <span class="badge ${c.send_welcome && enabled ? 'green' : 'yellow'}">
                ${c.send_welcome && enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p style="font-size:12px;color:#64748B;margin:6px 0 10px 0;">
              Instant check-in pass, Google Maps directions, and GST tax invoice sent directly to guest WhatsApp.
            </p>
            <div style="font-size:11px;color:#334155;background:rgba(0,0,0,0.04);padding:6px 8px;border-radius:6px;">
              Target: <b>Guest WhatsApp Number (Auto-detected from Booking)</b>
            </div>
          </div>

          <!-- 2. Booking Alert to Hosts & Team -->
          <div style="border:1.5px solid ${c.send_booking_group ? '#86EFAC' : '#E2E8F0'};background:${c.send_booking_group ? '#F0FDF4' : '#F8FAFC'};border-radius:10px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#0F172A;">🛎️ Owner &amp; Team Booking Alerts</strong>
              <span class="badge ${c.send_booking_group && enabled ? 'green' : 'yellow'}">
                ${c.send_booking_group && enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p style="font-size:12px;color:#64748B;margin:6px 0 10px 0;">
              Sends immediate alert to Shahanshah &amp; Firoz / Booking Group when a new booking arrives.
            </p>
            <div style="font-size:11px;color:#334155;background:rgba(0,0,0,0.04);padding:6px 8px;border-radius:6px;word-break:break-all;">
              Target: <b>${c.booking_group_id || '9450055554 / Booking Group'}</b>
            </div>
          </div>

          <!-- 3. Investor Group Alert -->
          <div style="border:1.5px solid ${c.send_investor_reports ? '#86EFAC' : '#E2E8F0'};background:${c.send_investor_reports ? '#F0FDF4' : '#F8FAFC'};border-radius:10px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <strong style="color:#0F172A;">📊 Investor Group Statements</strong>
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

  function renderSettingsTab() {
    const c = HUB.config || {};
    const groupsJson = JSON.stringify(c.investor_groups || {}, null, 2);

    return `
      <div class="card">
        <h3 style="margin:0 0 4px 0;color:#0F172A;">⚙️ WhatsApp Gateway & Group Configuration</h3>
        <p style="color:#64748B;font-size:12px;margin:0 0 16px 0;">
          Configure target groups, safe execution mode, and automated triggers.
        </p>

        <!-- Dry Run Mode Banner -->
        <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;padding:14px;margin-bottom:18px;">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
            <input type="checkbox" id="cfgDryRun" ${c.dry_run_mode !== false ? 'checked' : ''} style="width:20px;height:20px;accent-color:#D97706;flex-shrink:0;" />
            <div>
              <strong style="color:#92400E;font-size:13.5px;">🧪 Dry-Run Mode (Safe Testing)</strong>
              <div style="color:#B45309;font-size:12px;margin-top:2px;">
                When enabled, messages are formatted & logged in CRM without being sent to real WhatsApp.
              </div>
            </div>
          </label>
        </div>

        <h4 style="margin:0 0 10px 0;color:#0F172A;">🔘 Automation Toggles</h4>
        <div class="hub-toggles-grid">
          <label class="hub-toggle-card">
            <input type="checkbox" id="cfgSendBookingGroup" ${c.send_booking_group ? 'checked' : ''} />
            <span>🛎️ New Booking Alert to Hosts &amp; Team</span>
          </label>
          <label class="hub-toggle-card">
            <input type="checkbox" id="cfgSendWelcome" ${c.send_welcome ? 'checked' : ''} />
            <span>🔑 Guest Booking Pass &amp; Check-In Details</span>
          </label>
          <label class="hub-toggle-card">
            <input type="checkbox" id="cfgSendInvestor" ${c.send_investor_reports ? 'checked' : ''} />
            <span>📊 Monthly Report to Investor Groups</span>
          </label>
          <label class="hub-toggle-card">
            <input type="checkbox" id="cfgSendCheckout" ${c.send_checkout ? 'checked' : ''} />
            <span>👋 Checkout Review &amp; Feedback Message</span>
          </label>
        </div>

        <h4 style="margin:0 0 10px 0;color:#0F172A;">👥 WhatsApp Group Identifiers (@g.us)</h4>
        <div style="font-size:12px;color:#64748B;margin-bottom:10px;">
          Enter the unique Group ID (e.g. <code>12036302485984@g.us</code>) or Phone Number to receive booking alerts.
        </div>

        <div class="form-group" style="margin-bottom:12px;">
          <label style="font-weight:700;font-size:12.5px;display:block;margin-bottom:4px;">🛎️ Operations / Booking Group ID or Phone</label>
          <input type="text" id="cfgBookingGroup" value="${c.booking_group_id || ''}" style="width:100%;box-sizing:border-box;font-family:monospace;" />
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label style="font-weight:700;font-size:12.5px;display:block;margin-bottom:4px;">📊 Investor Groups Mapping (JSON)</label>
          <textarea id="cfgInvestorGroups" style="width:100%;box-sizing:border-box;height:110px;font-family:monospace;font-size:12px;">${groupsJson}</textarea>
        </div>

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
          <label style="font-weight:700;font-size:12.5px;display:block;margin-bottom:4px;">Gateway Server URL (Local Bot)</label>
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
    setLocalConfig(HUB.config);

    try {
      if (window.sb) {
        await sb.from('whatsapp_config').upsert({
          id: 1,
          auto_send_enabled: newState,
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {}

    if (window.fsn) fsn.success('Updated', `Master Automation is now ${newState ? '🟢 ACTIVE' : '🔴 PAUSED'}`);
    renderWhatsAppHub();
  };

  window.saveHubSettings = async function() {
    let invGroups = {};
    try {
      invGroups = JSON.parse(document.getElementById('cfgInvestorGroups')?.value || '{}');
    } catch (e) {
      alert('⚠️ Invalid JSON in Investor Groups mapping!');
      return;
    }

    const updates = {
      auto_send_enabled: document.getElementById('cfgAutoSend')?.checked || false,
      dry_run_mode: document.getElementById('cfgDryRun')?.checked || false,
      send_booking_group: document.getElementById('cfgSendBookingGroup')?.checked || false,
      send_housekeeping_checkout: false,
      send_investor_reports: document.getElementById('cfgSendInvestor')?.checked || false,
      send_welcome: document.getElementById('cfgSendWelcome')?.checked || false,
      send_checkout: document.getElementById('cfgSendCheckout')?.checked || false,
      booking_group_id: document.getElementById('cfgBookingGroup')?.value?.trim() || '',
      housekeeping_group_id: '',
      investor_groups: invGroups,
      gateway_type: document.getElementById('cfgGatewayType')?.value || 'meta_cloud_api',
      meta_phone_number_id: document.getElementById('cfgMetaPhoneId')?.value?.trim() || '',
      meta_waba_id: document.getElementById('cfgMetaWabaId')?.value?.trim() || '',
      meta_access_token: document.getElementById('cfgMetaToken')?.value?.trim() || '',
      meta_verify_token: 'uhhs_meta_secure_2026',
      gateway_url: document.getElementById('cfgGatewayUrl')?.value?.trim() || 'http://localhost:3000',
      updated_at: new Date().toISOString()
    };

    HUB.config = { ...HUB.config, ...updates };
    setLocalConfig(HUB.config);

    try {
      if (window.sb) {
        await sb.from('whatsapp_config').upsert({ id: 1, ...updates });
      }
    } catch (e) {}

    if (window.fsn) fsn.success('Saved', '✅ Automation settings updated successfully!');
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
      if (window.fsn) fsn.success('Sent', result.dry_run ? '🧪 Dry run — logged only' : '✅ Message dispatched');
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

  function renderLogTab() {
    const allLogs = HUB.logs || [];
    const totalCount = allLogs.length;
    const sentCount = allLogs.filter(l => l.status === 'sent' && !l.is_dry_run).length;
    const failedCount = allLogs.filter(l => l.status === 'failed').length;
    const dryCount = allLogs.filter(l => l.is_dry_run).length;

    const query = HUB._logSearchQuery;
    const filter = HUB._logFilterStatus;

    let filtered = allLogs.filter(l => {
      if (filter === 'sent' && (l.status !== 'sent' || l.is_dry_run)) return false;
      if (filter === 'failed' && l.status !== 'failed') return false;
      if (filter === 'dry' && !l.is_dry_run) return false;

      if (query) {
        const name = (l.guest_name || '').toLowerCase();
        const phone = (l.phone || '').toLowerCase();
        const type = (l.template_name || '').toLowerCase();
        const text = (l.message_preview || '').toLowerCase();
        if (!name.includes(query) && !phone.includes(query) && !type.includes(query) && !text.includes(query)) {
          return false;
        }
      }
      return true;
    });

    const rows = filtered.map(l => {
      const time = new Date(l.sent_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
      
      let statusHtml = '';
      if (l.status === 'sent' && !l.is_dry_run) {
        statusHtml = '<span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:700;padding:3px 8px;">✅ Sent</span>';
      } else if (l.status === 'failed') {
        statusHtml = '<span class="badge" style="background:#FEE2E2;color:#DC2626;font-weight:700;padding:3px 8px;">❌ Failed</span>';
      } else if (l.is_dry_run) {
        statusHtml = '<span class="badge" style="background:#FEF3C7;color:#D97706;font-weight:700;padding:3px 8px;">🧪 Dry Run</span>';
      } else {
        statusHtml = '<span class="badge yellow">⏳ Pending</span>';
      }

      const tNames = {
        'guest_confirmation': '🎉 Guest Confirmation',
        'new_booking_group': '🛎️ Booking Alert (Group)',
        'housekeeping_checkout': '🧹 Housekeeping Checkout',
        'checkout_reminder': '👋 10 AM Checkout Reminder',
        'arrival_details': '🔑 Check-in & WiFi Pass',
        'investor_report': '📊 Investor Statement',
        'airbnb_review': '⭐ Airbnb Review Link'
      };
      const typeLabel = tNames[l.template_name] || l.template_name;
      const isGroup = String(l.phone || '').includes('@g.us');
      const cleanPhone = (l.phone || '').replace(/\D/g, '');

      return `
        <tr style="border-bottom:1px solid #F1F5F9;">
          <td data-label="Time" style="white-space:nowrap;font-size:12px;color:#64748B;">
            ${time}
          </td>
          <td data-label="Status">
            ${statusHtml}
          </td>
          <td data-label="Message Type">
            <strong style="font-size:12.5px;color:#0F172A;">${typeLabel}</strong>
          </td>
          <td data-label="Guest / Recipient">
            <div style="font-weight:700;font-size:13px;color:#1E293B;">${escapeHtml(l.guest_name || 'Guest')}</div>
            <div style="font-size:11.5px;color:#64748B;">
              ${isGroup ? '<span style="color:#2563EB;">👥 Group</span>' : (cleanPhone ? `<a href="tel:${cleanPhone}" style="color:#64748B;text-decoration:none;">📞 +${cleanPhone}</a>` : '—')}
            </div>
          </td>
          <td data-label="Preview / Result" style="max-width:260px;font-size:12px;color:${l.error_message ? '#DC2626' : '#475569'};">
            ${l.error_message ? `<b>Error:</b> ${escapeHtml(l.error_message)}` : escapeHtml((l.message_preview || '').substring(0, 65) + '...')}
          </td>
          <td data-label="Action" style="white-space:nowrap;text-align:right;">
            <button onclick="showFullMessageModal('${l.id}')" class="btn-sm" style="background:#F1F5F9;border:1px solid #CBD5E1;padding:4px 8px;font-size:11px;cursor:pointer;border-radius:6px;font-weight:600;" title="View exact message text">
              👁️ View
            </button>
            ${(l.status === 'failed' || l.is_dry_run) ? `
              <button onclick="retryFailedMessage('${l.id}')" class="btn-sm green-btn" style="padding:4px 8px;font-size:11px;margin-left:4px;border-radius:6px;font-weight:700;" title="Send live now">
                🔄 Send
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    const mobileCards = filtered.map(l => {
      const time = new Date(l.sent_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
      let statusHtml = '';
      if (l.status === 'sent' && !l.is_dry_run) {
        statusHtml = '<span class="badge" style="background:#DCFCE7;color:#15803D;font-weight:700;padding:3px 8px;">✅ Sent</span>';
      } else if (l.status === 'failed') {
        statusHtml = '<span class="badge" style="background:#FEE2E2;color:#DC2626;font-weight:700;padding:3px 8px;">❌ Failed</span>';
      } else if (l.is_dry_run) {
        statusHtml = '<span class="badge" style="background:#FEF3C7;color:#D97706;font-weight:700;padding:3px 8px;">🧪 Dry Run</span>';
      } else {
        statusHtml = '<span class="badge yellow">⏳ Pending</span>';
      }

      const tNames = {
        'guest_confirmation': '🎉 Guest Confirmation',
        'new_booking_group': '🛎️ Booking Alert (Group)',
        'housekeeping_checkout': '🧹 Housekeeping Checkout',
        'checkout_reminder': '👋 10 AM Checkout Reminder',
        'arrival_details': '🔑 Check-in & WiFi Pass',
        'investor_report': '📊 Investor Statement',
        'airbnb_review': '⭐ Airbnb Review Link'
      };
      const typeLabel = tNames[l.template_name] || l.template_name;
      const isGroup = String(l.phone || '').includes('@g.us');
      const cleanPhone = (l.phone || '').replace(/\D/g, '');

      return `
        <div class="hub-mobile-log-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div>
              <div style="font-weight:800;font-size:14px;color:#0F172A;">${escapeHtml(l.guest_name || 'Guest')}</div>
              <div style="font-size:12px;color:#64748B;margin-top:2px;">
                ${isGroup ? '<span style="color:#2563EB;font-weight:600;">👥 Group</span>' : (cleanPhone ? `<a href="tel:${cleanPhone}" style="color:#2563EB;text-decoration:none;font-weight:600;">📞 +${cleanPhone}</a>` : '—')}
              </div>
            </div>
            <div style="text-align:right;">
              ${statusHtml}
              <div style="font-size:11px;color:#94A3B8;margin-top:3px;">${time}</div>
            </div>
          </div>
          <div style="display:inline-block;background:#F1F5F9;padding:3px 8px;border-radius:6px;font-size:11.5px;font-weight:700;color:#334155;width:fit-content;">
            ${typeLabel}
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:8px 10px;font-size:12px;color:${l.error_message ? '#DC2626' : '#475569'};line-height:1.4;">
            ${l.error_message ? `<b>Error:</b> ${escapeHtml(l.error_message)}` : escapeHtml((l.message_preview || '').substring(0, 110) + ((l.message_preview || '').length > 110 ? '...' : ''))}
          </div>
          <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:2px;">
            <button onclick="showFullMessageModal('${l.id}')" class="btn-sm" style="background:#F1F5F9;border:1px solid #CBD5E1;padding:6px 12px;font-size:12px;cursor:pointer;border-radius:6px;font-weight:600;">
              👁️ View Full
            </button>
            ${(l.status === 'failed' || l.is_dry_run) ? `
              <button onclick="retryFailedMessage('${l.id}')" class="btn-sm green-btn" style="padding:6px 12px;font-size:12px;border-radius:6px;font-weight:700;">
                🔄 Send Now
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <div>
            <h3 style="margin:0;font-size:17px;color:#0F172A;display:flex;align-items:center;gap:8px;">
              📋 Guest WhatsApp Delivery Tracker
            </h3>
            <p style="margin:3px 0 0 0;font-size:12.5px;color:#64748B;">
              Track which guest received automated passes, checkout reminders & alerts in real time.
            </p>
          </div>
          <button onclick="loadLogs(100).then(()=>renderWhatsAppHub())" class="btn-sm" style="background:#F1F5F9;border:1px solid #CBD5E1;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
            🔄 Refresh Logs
          </button>
        </div>

        <!-- Metric Ribbon -->
        <div class="hub-metric-grid">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:10.5px;font-weight:700;color:#64748B;text-transform:uppercase;">TOTAL LOGGED</div>
            <div style="font-size:20px;font-weight:800;color:#0F172A;margin-top:2px;">${totalCount}</div>
          </div>
          <div style="background:#F0FDF4;border:1.5px solid #86EFAC;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:10.5px;font-weight:700;color:#15803D;text-transform:uppercase;">🟢 DELIVERED</div>
            <div style="font-size:20px;font-weight:800;color:#15803D;margin-top:2px;">${sentCount}</div>
          </div>
          <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:10.5px;font-weight:700;color:#DC2626;text-transform:uppercase;">🔴 FAILED</div>
            <div style="font-size:20px;font-weight:800;color:#DC2626;margin-top:2px;">${failedCount}</div>
          </div>
          <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:10.5px;font-weight:700;color:#D97706;text-transform:uppercase;">🧪 DRY RUN</div>
            <div style="font-size:20px;font-weight:800;color:#D97706;margin-top:2px;">${dryCount}</div>
          </div>
        </div>

        <!-- Search & Filters -->
        <div class="hub-log-toolbar">
          <div class="hub-log-filters">
            <button onclick="filterHubLogs('all')" class="btn-sm ${filter === 'all' ? '' : 'secondary'}" style="${filter === 'all' ? 'background:#0F172A;color:#fff;font-weight:700;' : ''}">All (${totalCount})</button>
            <button onclick="filterHubLogs('sent')" class="btn-sm ${filter === 'sent' ? '' : 'secondary'}" style="${filter === 'sent' ? 'background:#16A34A;color:#fff;font-weight:700;' : ''}">🟢 Sent (${sentCount})</button>
            <button onclick="filterHubLogs('failed')" class="btn-sm ${filter === 'failed' ? '' : 'secondary'}" style="${filter === 'failed' ? 'background:#DC2626;color:#fff;font-weight:700;' : ''}">🔴 Failed (${failedCount})</button>
            <button onclick="filterHubLogs('dry')" class="btn-sm ${filter === 'dry' ? '' : 'secondary'}" style="${filter === 'dry' ? 'background:#D97706;color:#fff;font-weight:700;' : ''}">🧪 Dry Run (${dryCount})</button>
          </div>

          <div class="hub-log-search-box">
            <input 
              type="text" 
              placeholder="🔍 Search guest, phone, message..." 
              value="${escapeHtml(query)}"
              oninput="searchHubLogs(this.value)"
              style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #CBD5E1;border-radius:8px;font-size:12.5px;" 
            />
          </div>
        </div>

        <!-- Table for Desktop/Tablet & Cards for Mobile -->
        ${filtered.length === 0 ? `
          <div style="text-align:center;padding:40px;color:#64748B;background:#F8FAFC;border-radius:10px;border:1px dashed #CBD5E1;">
            <div style="font-size:32px;margin-bottom:8px;">📭</div>
            <div style="font-weight:700;font-size:14px;color:#1E293B;">No messages match your criteria</div>
            <div style="font-size:12px;color:#94A3B8;margin-top:2px;">Try clearing filters or search box.</div>
          </div>
        ` : `
          <!-- Desktop/Tablet Table -->
          <div class="hub-desktop-table hub-table-responsive" style="margin:0;">
            <table>
              <thead>
                <tr style="background:#F8FAFC;color:#64748B;font-size:11.5px;text-align:left;">
                  <th style="padding:10px;">TIME</th>
                  <th style="padding:10px;">STATUS</th>
                  <th style="padding:10px;">MESSAGE TYPE</th>
                  <th style="padding:10px;">GUEST / RECIPIENT</th>
                  <th style="padding:10px;">PREVIEW / RESULT</th>
                  <th style="padding:10px;text-align:right;">ACTION</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards View -->
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
    const sent = logs.find(l => l.status === 'sent' && !l.is_dry_run);
    if (sent) return { status: 'sent', time: sent.sent_at, type: sent.template_name };
    const failed = logs.find(l => l.status === 'failed');
    if (failed) return { status: 'failed', error: failed.error_message };
    const dry = logs.find(l => l.is_dry_run);
    if (dry) return { status: 'dry', time: dry.sent_at };
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

  window.renderWhatsAppHub = renderWhatsAppHub;
  window.dispatchWhatsAppMessage = dispatchWhatsAppMessage;
})();
