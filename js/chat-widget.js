/* ══════════════════════════════════════════════════════════════════
   UNIQUE HAVEN HOMES — Smart Chat Widget (Nisha AI Text Chat)
   
   Features:
   ✅ Smart FAQ with live Supabase rates
   ✅ Lead capture (name + phone)
   ✅ WhatsApp routing for booking
   ✅ Mobile-first design
   ✅ Auto-greet on first open
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const ADMIN_WA   = '919194109911';
  const CHAT_KEY   = 'uhh_chat_history';
  const LEAD_KEY   = 'uhh_chat_lead';

  let _rates       = null;
  let _chatOpen    = false;
  let _leadData    = {};
  let _step        = 'init'; // init | greet | ask_requirement | show_props | ask_name | ask_phone | done
  let _history     = [];

  // ── GET LIVE RATES ──────────────────────────────────────────────
  async function getRates() {
    if (_rates) return _rates;
    try {
      const cached = JSON.parse(sessionStorage.getItem('uhh_price_cache') || 'null');
      if (cached && cached.data && (Date.now() - cached.ts) < 15 * 60 * 1000) {
        _rates = cached.data; return _rates;
      }
      const sb = window.sb || (typeof supabase !== 'undefined' && window.SUPABASE_URL
        ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null);
      if (sb) {
        const { data } = await sb.from('property_rates').select('*').eq('is_active', true).order('base_price');
        if (data && data.length > 0) { _rates = data; return _rates; }
      }
    } catch (_) {}
    // Fallback
    _rates = [
      { room_id:'GOM-101', slug:'redrose-palace',           property_name:'RedRose Palace',           base_price:4500,  max_guests:6  },
      { room_id:'GOM-102', slug:'black-beauty',             property_name:'Black Beauty',             base_price:4500,  max_guests:6  },
      { room_id:'GOM-201', slug:'the-dark-blue',            property_name:'The Dark Blue',            base_price:4500,  max_guests:6  },
      { room_id:'GOM-202', slug:'the-brown',                property_name:'The Brown',                base_price:4500,  max_guests:6  },
      { room_id:'GOM-301', slug:'the-light-green',          property_name:'The Light Green',          base_price:4500,  max_guests:6  },
      { room_id:'GOM-401', slug:'the-nawabi-stay',          property_name:'The Nawabi Stay',          base_price:4500,  max_guests:6  },
      { room_id:'GOM-501', slug:'starlight-blue-penthouse', property_name:'Starlight Blue Penthouse', base_price:6000,  max_guests:6  },
      { room_id:'GOM-302', slug:'the-unique',               property_name:'The Unique',               base_price:5500,  max_guests:6  },
      { room_id:'VIL-104', slug:'the-green-house',          property_name:'The Green House',          base_price:5500,  max_guests:6  },
      { room_id:'VIL-103', slug:'the-pink-house',           property_name:'The Pink House',           base_price:9000,  max_guests:10 },
      { room_id:'VIL-105', slug:'the-yellow-house',         property_name:'The Yellow House',         base_price:5500,  max_guests:6  },
      { room_id:'VIL-106', slug:'green-forest',             property_name:'Green Forest',             base_price:4500,  max_guests:6  },
      { room_id:'VIL-108', slug:'pink-paradise',            property_name:'Pink Paradise',            base_price:4500,  max_guests:6  },
      { room_id:'LUL-402', slug:'celebrity-garden',         property_name:'Celebrity Garden',         base_price:10000, max_guests:10 },
      { room_id:'VIL-101', slug:'gomti-grand-villa',        property_name:'Gomti Grand Villa',        base_price:8000,  max_guests:6  },
      { room_id:'VIL-102', slug:'royal-white-house',        property_name:'Royal White House',        base_price:12000, max_guests:12 },
      { room_id:'VIL-107', slug:'the-velvet-house',         property_name:'The Velvet House',         base_price:4500,  max_guests:6  },
    ];
    return _rates;
  }

  // ── SAVE LEAD ───────────────────────────────────────────────────
  async function saveLead(name, phone, note) {
    try {
      const sb = window.sb || (typeof supabase !== 'undefined' && window.SUPABASE_URL
        ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null);
      if (sb) {
        await sb.from('leads').insert({
          guest_name: name, phone, source: 'chat_widget',
          interested_property: note || 'Chat enquiry', status: 'new'
        });
      }
    } catch (_) {}
    // Show notification popup (reuse voice-agent notification style)
    if (window.UHH_VoiceAgent) return;
    const msg = encodeURIComponent(`🔔 *New Chat Lead*\n👤 ${name}\n📱 ${phone}\n💬 ${note || 'Chat widget'}`);
    const notif = document.createElement('div');
    notif.innerHTML = `<div style="position:fixed;bottom:100px;left:24px;z-index:99999;background:#1a2e1a;border:1px solid rgba(34,197,94,0.4);border-radius:16px;padding:18px 20px;max-width:280px;font-family:sans-serif;color:#f0f2f7;box-shadow:0 16px 48px rgba(0,0,0,.5)">
      <div style="font-size:13px;color:#86efac;font-weight:700;margin-bottom:8px">🎉 New Lead!</div>
      <div style="font-size:14px;font-weight:700">${name}</div>
      <div style="font-size:13px;color:#d4d4d8">📱 ${phone}</div>
      <a href="https://wa.me/${ADMIN_WA}?text=${msg}" target="_blank" style="display:block;margin-top:12px;background:#22c55e;color:#000;text-align:center;padding:8px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700">📲 WhatsApp Alert</a>
    </div>`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 30000);
  }

  // ── SMART RESPONSE ENGINE ───────────────────────────────────────
  async function getReply(userMsg) {
    const msg  = userMsg.toLowerCase().trim();
    const rates = await getRates();
    
    // ── Booking / Contact intent
    if (/book|booking|reserve|confirm|payment|advance|pay|availab/i.test(msg)) {
      _step = 'ask_name';
      return {
        text: '🏠 Bookings ke liye main aapko hamare team se directly connect karta hoon!\n\nPehle aapka naam bata dijiye?',
        quickReplies: []
      };
    }

    // ── Price / Rate queries
    if (/rate|price|cost|kitna|charge|per night|night|rs|rupee|₹/i.test(msg)) {
      const cheap = rates.filter(r => r.base_price <= 5000).slice(0, 3);
      const mid   = rates.filter(r => r.base_price > 5000 && r.base_price <= 8000).slice(0, 2);
      const prem  = rates.filter(r => r.base_price > 8000).slice(0, 2);
      
      let reply = '💰 **Current Rates (Tonight):**\n\n';
      if (cheap.length) reply += `**₹4,500–₹5,000/night:**\n${cheap.map(r=>`• ${r.property_name} (${r.max_guests} guests)`).join('\n')}\n\n`;
      if (mid.length)   reply += `**₹5,500–₹8,000/night:**\n${mid.map(r=>`• ${r.property_name} — ₹${r.base_price.toLocaleString('en-IN')} (${r.max_guests} guests)`).join('\n')}\n\n`;
      if (prem.length)  reply += `**Premium ₹9,000+:**\n${prem.map(r=>`• ${r.property_name} — ₹${r.base_price.toLocaleString('en-IN')} (${r.max_guests} guests)`).join('\n')}\n\n`;
      reply += '📅 Aapki dates kab ki hain? Main check karta hoon availability!';
      return { text: reply, quickReplies: ['3–4 log', '6 log', '10+ log', 'Book karna hai'] };
    }

    // ── Guest count
    const guestMatch = msg.match(/(\d+)\s*(log|person|guest|people|adult|member)/i) || msg.match(/(3|4|5|6|7|8|9|10|11|12)\s*(?:log|people)?/);
    if (guestMatch || /kitne log|how many|group|family|friends/i.test(msg)) {
      const count = guestMatch ? parseInt(guestMatch[1]) : 0;
      const suitable = count > 0 
        ? rates.filter(r => r.max_guests >= count)
        : rates.filter(r => r.max_guests >= 6);
      const topPicks = suitable.sort((a,b) => a.base_price - b.base_price).slice(0, 4);
      
      let reply = count > 0 
        ? `👥 ${count} logon ke liye perfect options:\n\n`
        : '👥 Hamare popular options:\n\n';
      
      topPicks.forEach(r => {
        reply += `🏠 **${r.property_name}**\n   ₹${r.base_price.toLocaleString('en-IN')}/night · Max ${r.max_guests} guests\n\n`;
      });
      reply += 'Koi specific property chahiye ya dates confirm karni hain?';
      return { text: reply, quickReplies: ['Book karna hai', 'More options', 'WhatsApp karo'] };
    }

    // ── Specific property queries
    const propMatch = rates.find(r => 
      msg.includes(r.property_name.toLowerCase()) || 
      msg.includes(r.slug.replace(/-/g,' '))
    );
    if (propMatch) {
      return {
        text: `🏠 **${propMatch.property_name}**\n\n💰 ₹${propMatch.base_price.toLocaleString('en-IN')} / night\n👥 Max ${propMatch.max_guests} guests\n✅ AC, WiFi, Full Kitchen, Parking\n🕐 Check-in: 12 PM | Check-out: 11 AM\n\nIs property mein interested hain? Booking ke liye naam aur number dijiye!`,
        quickReplies: ['Haan, book karna hai!', 'Aur options dikhao', 'WhatsApp karo']
      };
    }

    // ── Location queries  
    if (/location|address|kahan|where|lulu|gomti|airport|medanta|map/i.test(msg)) {
      return {
        text: '📍 Hamare properties mainly 3 areas mein hain:\n\n🏘️ **Vikalp Khand, Gomti Nagar** — 7 properties (₹4,500–₹6,000)\n🏘️ **Vishesh Khand, Gomti Nagar** — 5 properties (₹5,500–₹9,000)\n🏡 **Near Lulu Mall / Mahanagar** — 5 villas (₹4,500–₹12,000)\n\nKis area mein chahiye?',
        quickReplies: ['Gomti Nagar', 'Lulu Mall ke paas', 'Sab dikhao']
      };
    }

    // ── WhatsApp request
    if (/whatsapp|call|contact|phone|number|rang|speak/i.test(msg)) {
      return {
        text: '📲 Bilkul! Hamare team se directly baat karein:\n\n👤 **Praveen Singh** (Owner)\n📱 +91 91941 09911',
        actions: [{ label: '📲 WhatsApp Now', url: `https://wa.me/${ADMIN_WA}?text=Hi! I'm interested in booking a property.` }],
        quickReplies: []
      };
    }

    // ── Amenities
    if (/ameniti|facility|wifi|ac|kitchen|parking|pool|tv|gym|clean/i.test(msg)) {
      return {
        text: '✅ Sabhi properties mein ye facilities hain:\n\n❄️ 100% AC\n📶 High-Speed WiFi\n📺 Smart TV (Netflix ready)\n🍳 Fully Equipped Kitchen\n🅿️ Free Parking\n🧹 Professional Cleaning\n📞 24/7 Caretaker\n\nKoi specific property dekhni hai?',
        quickReplies: ['Rates dikhao', 'Book karna hai', '6 logon ke liye']
      };
    }

    // ── Lead capture flow
    if (_step === 'ask_name') {
      _leadData.name = userMsg.trim();
      _step = 'ask_phone';
      return { text: `Shukriya ${_leadData.name} ji! 🙏\n\nAapka WhatsApp number dijiye — hamaari team aapko abhi contact karegi:`, quickReplies: [] };
    }

    if (_step === 'ask_phone') {
      const phoneClean = userMsg.replace(/[^0-9+]/g, '');
      if (phoneClean.length < 10) {
        return { text: '📱 Sahi number dijiye (10 digits), please:', quickReplies: [] };
      }
      _leadData.phone = phoneClean;
      _step = 'done';
      
      await saveLead(_leadData.name, _leadData.phone, _leadData.interest || 'Chat enquiry');
      
      const waMsg = encodeURIComponent(`Namaste! I'm ${_leadData.name}. I'm interested in booking a property at Unique Haven Homes, Lucknow. Please share availability and details.`);
      return {
        text: `✅ Shukriya ${_leadData.name} ji!\n\nHamaari team aapko ${_leadData.phone} pe bahut jaldi WhatsApp karegi! 🙏\n\nYa aap directly hamare host ko WhatsApp kar sakte hain:`,
        actions: [{ label: '📲 WhatsApp Team Now', url: `https://wa.me/${ADMIN_WA}?text=${waMsg}` }],
        quickReplies: ['Aur sawaal hain', 'Dhanyawad! 🙏']
      };
    }

    // ── General greetings
    if (/^(hi|hello|hii|hey|helo|namaste|namaskar|hy|haai)\b/i.test(msg) || msg.length < 4) {
      return {
        text: 'Namaste! 🙏 Main Nisha hoon, Unique Haven Homes ki AI assistant.\n\nMain aapki help kar sakti hoon:\n• 🏠 Property recommendations\n• 💰 Rates & availability\n• 📍 Location info\n• 📅 Booking assistance\n\nAap kya jaanna chahte hain?',
        quickReplies: ['Rates dikhao', '6 logon ke liye', 'Lulu Mall ke paas', 'Book karna hai']
      };
    }

    // ── Default
    return {
      text: 'Aapka sawaal samajh aaya! 😊 Main aapki help ke liye hoon.\n\nKya aap bata sakte hain — kitne log hain aur kab ke liye chahiye?',
      quickReplies: ['Rates dikhao', '4 log', '6 log', '10+ log', 'Book karna hai']
    };
  }

  // ── INJECT STYLES ───────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('uhh-chat-styles')) return;
    const s = document.createElement('style');
    s.id = 'uhh-chat-styles';
    s.textContent = `
      #uhh-chat-btn {
        position: fixed; bottom: 24px; left: 24px; z-index: 9997;
        width: 56px; height: 56px; border-radius: 50%;
        background: linear-gradient(135deg,#22c55e,#16a34a);
        border: none; cursor: pointer;
        box-shadow: 0 6px 28px rgba(34,197,94,0.45);
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; transition: transform 0.2s, box-shadow 0.2s;
        outline: none;
      }
      #uhh-chat-btn:hover { transform: scale(1.1); box-shadow: 0 10px 36px rgba(34,197,94,0.6); }
      #uhh-chat-btn .uhh-chat-badge {
        position: absolute; top: -4px; right: -4px;
        width: 18px; height: 18px; background: #ef4444;
        border-radius: 50%; font-size: 10px; color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; border: 2px solid #0d0f14;
        animation: uhh-chat-pulse 2s infinite;
      }
      @keyframes uhh-chat-pulse {
        0%,100%{transform:scale(1)} 50%{transform:scale(1.2)}
      }
      #uhh-chat-panel {
        position: fixed; bottom: 90px; left: 16px; z-index: 9997;
        width: min(360px, calc(100vw - 32px));
        height: min(520px, calc(100vh - 120px));
        background: #111318;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 20px; overflow: hidden;
        box-shadow: 0 24px 80px rgba(0,0,0,0.7);
        display: flex; flex-direction: column;
        transform-origin: bottom left;
        animation: uhh-chat-open 0.3s cubic-bezier(0.34,1.56,0.64,1);
        font-family: 'Plus Jakarta Sans','Inter',sans-serif;
      }
      @keyframes uhh-chat-open {
        from { opacity:0; transform: scale(0.85) translateY(20px); }
        to   { opacity:1; transform: scale(1) translateY(0); }
      }
      #uhh-chat-panel.closing {
        animation: uhh-chat-close 0.2s ease forwards;
      }
      @keyframes uhh-chat-close {
        to { opacity:0; transform: scale(0.85) translateY(20px); }
      }
      .uhh-chat-header {
        background: linear-gradient(135deg,#162218,#1a2e1a);
        border-bottom: 1px solid rgba(34,197,94,0.15);
        padding: 14px 16px;
        display: flex; align-items: center; gap: 10px;
      }
      .uhh-chat-avatar {
        width: 38px; height: 38px; border-radius: 50%;
        background: linear-gradient(135deg,#22c55e,#16a34a);
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; flex-shrink: 0;
      }
      .uhh-chat-avatar-dot {
        width: 10px; height: 10px; background: #22c55e;
        border-radius: 50%; border: 2px solid #111;
        position: absolute; bottom: 0; right: 0;
      }
      .uhh-chat-header-info { flex: 1; }
      .uhh-chat-header-name { font-size: 14px; font-weight: 700; color: #f0f2f7; }
      .uhh-chat-header-status { font-size: 11px; color: #22c55e; margin-top: 1px; }
      .uhh-chat-close {
        background: none; border: none; color: #6b7280;
        cursor: pointer; font-size: 20px; padding: 2px;
        line-height: 1; transition: color 0.15s;
      }
      .uhh-chat-close:hover { color: #f0f2f7; }
      .uhh-chat-msgs {
        flex: 1; overflow-y: auto; padding: 14px 12px; display: flex;
        flex-direction: column; gap: 10px; scroll-behavior: smooth;
      }
      .uhh-chat-msgs::-webkit-scrollbar { width: 3px; }
      .uhh-chat-msgs::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      .uhh-msg {
        max-width: 88%; display: flex; flex-direction: column; gap: 3px;
        animation: uhh-msg-in 0.25s ease;
      }
      @keyframes uhh-msg-in {
        from { opacity:0; transform: translateY(8px); }
        to   { opacity:1; transform: translateY(0); }
      }
      .uhh-msg.bot { align-self: flex-start; }
      .uhh-msg.user { align-self: flex-end; }
      .uhh-msg-bubble {
        padding: 10px 14px; border-radius: 16px;
        font-size: 13.5px; line-height: 1.55; white-space: pre-wrap;
      }
      .bot .uhh-msg-bubble {
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.07);
        color: #e2e8f0; border-radius: 4px 16px 16px 16px;
      }
      .user .uhh-msg-bubble {
        background: linear-gradient(135deg,#22c55e,#16a34a);
        color: #fff; border-radius: 16px 16px 4px 16px;
      }
      .uhh-msg-time { font-size: 10px; color: #4b5563; padding: 0 4px; }
      .uhh-msg-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
      .uhh-msg-action-btn {
        display: inline-flex; align-items: center; gap: 5px;
        background: #22c55e; color: #fff; text-decoration: none;
        padding: 8px 14px; border-radius: 10px; font-size: 12.5px;
        font-weight: 700; transition: all 0.15s; border: none; cursor: pointer;
      }
      .uhh-msg-action-btn:hover { background: #16a34a; transform: translateY(-1px); }
      .uhh-quick-replies {
        display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px 0;
      }
      .uhh-qr {
        background: rgba(34,197,94,0.1);
        border: 1px solid rgba(34,197,94,0.25);
        color: #86efac; padding: 6px 12px; border-radius: 20px;
        font-size: 12px; font-weight: 600; cursor: pointer;
        transition: all 0.15s; white-space: nowrap;
      }
      .uhh-qr:hover { background: rgba(34,197,94,0.2); border-color: rgba(34,197,94,0.4); }
      .uhh-typing {
        display: flex; align-items: center; gap: 4px; padding: 10px 14px;
        background: rgba(255,255,255,0.07); border-radius: 4px 16px 16px 16px;
        width: fit-content;
      }
      .uhh-typing span {
        width: 7px; height: 7px; border-radius: 50%; background: #6b7280;
        animation: uhh-bounce 1.2s infinite;
      }
      .uhh-typing span:nth-child(2){animation-delay:.15s}
      .uhh-typing span:nth-child(3){animation-delay:.3s}
      @keyframes uhh-bounce {
        0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)}
      }
      .uhh-chat-input-row {
        padding: 10px 12px; border-top: 1px solid rgba(255,255,255,0.06);
        display: flex; gap: 8px; align-items: flex-end; background: #0d0f14;
      }
      #uhh-chat-input {
        flex: 1; background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.1); border-radius: 22px;
        padding: 10px 14px; color: #f0f2f7; font-size: 14px;
        outline: none; resize: none; max-height: 80px; min-height: 40px;
        font-family: inherit; line-height: 1.4; transition: border-color 0.2s;
      }
      #uhh-chat-input:focus { border-color: rgba(34,197,94,0.4); }
      #uhh-chat-input::placeholder { color: #4b5563; }
      #uhh-chat-send {
        width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
        background: linear-gradient(135deg,#22c55e,#16a34a);
        border: none; cursor: pointer; display: flex;
        align-items: center; justify-content: center;
        transition: transform 0.15s, box-shadow 0.15s;
        color: #fff; font-size: 18px;
      }
      #uhh-chat-send:hover { transform: scale(1.05); box-shadow: 0 4px 16px rgba(34,197,94,0.4); }
      /* Bold in chat */
      .uhh-msg-bubble strong, .uhh-msg-bubble b { color: #f0c96b; font-weight: 700; }

      /* Mobile: full-screen chat on very small screens */
      @media (max-width: 420px) {
        #uhh-chat-panel {
          bottom: 0; left: 0; right: 0; width: 100vw;
          height: 70vh; border-radius: 20px 20px 0 0;
        }
        #uhh-chat-btn { bottom: 16px; left: 16px; width: 52px; height: 52px; font-size: 20px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── BUILD UI ────────────────────────────────────────────────────
  function buildUI() {
    if (document.getElementById('uhh-chat-btn')) return;

    // Floating button
    const btn = document.createElement('button');
    btn.id = 'uhh-chat-btn';
    btn.setAttribute('aria-label', 'Chat with Nisha');
    btn.innerHTML = `💬<span class="uhh-chat-badge">1</span>`;
    btn.addEventListener('click', toggleChat);
    document.body.appendChild(btn);
  }

  // ── TOGGLE CHAT ─────────────────────────────────────────────────
  function toggleChat() {
    _chatOpen ? closeChat() : openChat();
  }

  function openChat() {
    _chatOpen = true;
    document.getElementById('uhh-chat-btn').querySelector('.uhh-chat-badge')?.remove();

    const panel = document.createElement('div');
    panel.id = 'uhh-chat-panel';
    panel.innerHTML = `
      <div class="uhh-chat-header">
        <div class="uhh-chat-avatar" style="position:relative">💬<div class="uhh-chat-avatar-dot"></div></div>
        <div class="uhh-chat-header-info">
          <div class="uhh-chat-header-name">Nisha — UHH Assistant</div>
          <div class="uhh-chat-header-status">🟢 Online • Replies instantly</div>
        </div>
        <button class="uhh-chat-close" onclick="UHH_Chat.close()" aria-label="Close chat">×</button>
      </div>
      <div class="uhh-chat-msgs" id="uhh-chat-msgs"></div>
      <div class="uhh-quick-replies" id="uhh-qr-bar"></div>
      <div class="uhh-chat-input-row">
        <textarea id="uhh-chat-input" placeholder="Type your message…" rows="1"></textarea>
        <button id="uhh-chat-send" aria-label="Send">➤</button>
      </div>
    `;
    document.body.appendChild(panel);

    // Wire events
    const input = panel.querySelector('#uhh-chat-input');
    panel.querySelector('#uhh-chat-send').addEventListener('click', sendUserMessage);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage(); }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 80) + 'px';
    });

    // Send greeting after short delay
    setTimeout(() => {
      addBotMessage({
        text: 'Namaste! 🙏 Main Nisha hoon — Unique Haven Homes ki AI assistant.\n\nMain aapki help kar sakti hoon properties dhundne mein, rates check karne mein, ya booking ke liye!\n\nAap kya jaanna chahte hain?',
        quickReplies: ['Rates dikhao 💰', '6 logon ke liye 👥', 'Lulu Mall ke paas 📍', 'Book karna hai 📅']
      });
    }, 400);

    setTimeout(() => input.focus(), 500);
  }

  function closeChat() {
    _chatOpen = false;
    const panel = document.getElementById('uhh-chat-panel');
    if (!panel) return;
    panel.classList.add('closing');
    setTimeout(() => panel.remove(), 200);
  }

  // ── RENDER MESSAGES ─────────────────────────────────────────────
  function addBotMessage(reply) {
    const msgs = document.getElementById('uhh-chat-msgs');
    const qrBar = document.getElementById('uhh-qr-bar');
    if (!msgs) return;

    // Typing indicator
    const typing = document.createElement('div');
    typing.className = 'uhh-msg bot';
    typing.innerHTML = `<div class="uhh-typing"><span></span><span></span><span></span></div>`;
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    setTimeout(() => {
      typing.remove();

      const msg = document.createElement('div');
      msg.className = 'uhh-msg bot';

      // Format **bold** text
      const formatted = (reply.text || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      let html = `<div class="uhh-msg-bubble">${formatted}</div>`;
      if (reply.actions && reply.actions.length) {
        html += `<div class="uhh-msg-actions">${reply.actions.map(a =>
          `<a href="${a.url}" target="_blank" rel="noopener" class="uhh-msg-action-btn">${a.label}</a>`
        ).join('')}</div>`;
      }
      html += `<span class="uhh-msg-time">${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>`;
      msg.innerHTML = html;
      msgs.appendChild(msg);
      msgs.scrollTop = msgs.scrollHeight;

      // Quick replies
      if (qrBar) {
        qrBar.innerHTML = (reply.quickReplies || []).map(qr =>
          `<button class="uhh-qr" onclick="UHH_Chat.quickReply('${qr.replace(/'/g, "\\'")}')">${qr}</button>`
        ).join('');
      }
    }, 700 + Math.random() * 400);
  }

  async function sendUserMessage() {
    const input = document.getElementById('uhh-chat-input');
    const msgs  = document.getElementById('uhh-chat-msgs');
    if (!input || !msgs) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = 'auto';

    // Clear quick replies
    const qrBar = document.getElementById('uhh-qr-bar');
    if (qrBar) qrBar.innerHTML = '';

    // User bubble
    const userMsg = document.createElement('div');
    userMsg.className = 'uhh-msg user';
    userMsg.innerHTML = `<div class="uhh-msg-bubble">${text}</div>
      <span class="uhh-msg-time" style="text-align:right">${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>`;
    msgs.appendChild(userMsg);
    msgs.scrollTop = msgs.scrollHeight;

    // Get bot reply
    const reply = await getReply(text);
    addBotMessage(reply);
  }

  // ── INIT ────────────────────────────────────────────────────────
  function boot() {
    injectStyles();
    buildUI();
    getRates().catch(() => {}); // Pre-warm
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.UHH_Chat = {
    open:       openChat,
    close:      closeChat,
    toggle:     toggleChat,
    quickReply: (text) => {
      const input = document.getElementById('uhh-chat-input');
      if (input) { input.value = text; sendUserMessage(); }
    }
  };

})();
