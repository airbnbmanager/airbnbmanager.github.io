/* ══════════════════════════════════════════════════════════════════════
   UNIQUE HAVEN HOMES — AI Voice Concierge "Nisha"
   Powered by ElevenLabs Conversational AI
   
   Features:
   ✅ Dynamic rates injected from Supabase at every session start
   ✅ Lead capture (name + phone) via voice → saved to Supabase
   ✅ WhatsApp notification to admin when lead is captured
   ✅ Hindi / English bilingual support
   ✅ Beautiful custom floating UI
   ══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const AGENT_ID   = 'agent_7401m3qdd9edenhr91tej83z3t7y';
  const ADMIN_WA   = '919450055554'; // Mr. Shahanshah - WhatsApp number (no +)

  // ── Fallback rates (used if Supabase is unreachable) ──────────────
  const FALLBACK_RATES = [
    { room_id:'GOM-101', property_name:'RedRose Palace',            base_price:4500,  max_guests:6,  area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-102', property_name:'Black Beauty',              base_price:4500,  max_guests:6,  area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-201', property_name:'The Dark Blue',             base_price:4500,  max_guests:6,  area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-202', property_name:'The Brown',                 base_price:4500,  max_guests:6,  area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-301', property_name:'The Light Green',           base_price:4500,  max_guests:6,  area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-401', property_name:'The Nawabi Stay',           base_price:4500,  max_guests:6,  area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-501', property_name:'Starlight Blue Penthouse',  base_price:6000,  max_guests:6,  area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-302', property_name:'The Unique',                base_price:5500,  max_guests:6,  area:'Vishesh Khand, Gomti Nagar' },
    { room_id:'VIL-104', property_name:'The Green House',           base_price:5500,  max_guests:6,  area:'Vishesh Khand, Gomti Nagar' },
    { room_id:'VIL-103', property_name:'The Pink House',            base_price:9000,  max_guests:10, area:'Vishesh Khand, Gomti Nagar' },
    { room_id:'VIL-105', property_name:'The Yellow House',          base_price:5500,  max_guests:6,  area:'Vishesh Khand, Gomti Nagar' },
    { room_id:'VIL-106', property_name:'Green Forest',              base_price:4500,  max_guests:6,  area:'Madhya Kunj, Mahanagar' },
    { room_id:'VIL-108', property_name:'Pink Paradise',             base_price:4500,  max_guests:6,  area:'Madhya Kunj, Mahanagar' },
    { room_id:'LUL-402', property_name:'Celebrity Garden',          base_price:10000, max_guests:10, area:'Lullanpur, Lucknow' },
    { room_id:'VIL-101', property_name:'Gomti Grand Villa',         base_price:8000,  max_guests:6,  area:'Madhya Kunj, Mahanagar' },
    { room_id:'VIL-102', property_name:'Royal White House',         base_price:12000, max_guests:12, area:'Madhya Kunj, Mahanagar' },
    { room_id:'VIL-107', property_name:'The Velvet House',          base_price:4500,  max_guests:6,  area:'Madhya Kunj, Mahanagar' },
  ];

  let _conversation  = null;
  let _cachedRates   = null;
  let _status        = 'idle'; // idle | connecting | connected | listening | speaking

  // ── 1. GET LIVE RATES ──────────────────────────────────────────────
  async function getRates() {
    if (_cachedRates) return _cachedRates;

    // Try the shared price-sync cache first
    try {
      const cached = JSON.parse(sessionStorage.getItem('uhh_price_cache') || 'null');
      if (cached && cached.data && (Date.now() - cached.ts) < 15 * 60 * 1000) {
        _cachedRates = cached.data;
        return _cachedRates;
      }
    } catch (_) {}

    // Fetch fresh from Supabase rooms table (source of truth)
    try {
      const sb = window.sb ||
        (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY
          ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
          : null);

      if (sb) {
        const { data } = await sb
          .from('rooms')
          .select('room_id, property_name, nickname, rent_per_night, max_guests')
          .order('room_id');
        if (data && data.length > 0) {
          _cachedRates = data.map(r => ({
            room_id: r.room_id,
            property_name: r.nickname || r.property_name,
            base_price: Number(r.rent_per_night) || 4500,
            max_guests: r.max_guests || 6
          }));
          return _cachedRates;
        }
      }
    } catch (_) {}

    return FALLBACK_RATES;
  }

  // ── 2. BUILD DYNAMIC SYSTEM PROMPT ────────────────────────────────
  function buildSystemPrompt(rates) {
    const today = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    const rateLines = rates.map(r =>
      `  • ${r.property_name} (ID: ${r.room_id}) — ₹${Number(r.base_price).toLocaleString('en-IN')}/night | Max ${r.max_guests} guests`
    ).join('\n');

    return `You are Nisha, the warm and professional AI voice concierge for "Unique Haven Homes" — Lucknow's finest luxury homestay brand.

Today's Date: ${today}

═══ YOUR CHARACTER ═══
- Speak like a knowledgeable, friendly local concierge — warm but professional
- Switch naturally between Hindi and English based on what the guest uses (Hinglish is perfectly fine)
- Never rush. Let guests feel heard. Acknowledge their needs before answering
- Use "ji" politely when speaking Hindi (e.g., "Bilkul ji", "Zaroor ji")

═══ LIVE PROPERTY RATES (Updated Just Now) ═══
${rateLines}

All prices are per night for direct/website booking.
Airbnb rates are approximately ₹1,000–₹2,000 higher.

═══ PROPERTY DETAILS ═══
GOMTI NAGAR AREA (Vikalp Khand):
• RedRose Palace, Black Beauty, The Dark Blue, The Brown, The Light Green, The Nawabi Stay
  → All 3BHK luxury flats, 6 guests max, ₹4,500/night
• Starlight Blue Penthouse → 4BHK Penthouse, 6 guests, ₹6,000/night

VISHESH KHAND / GOMTI NAGAR:
• The Unique, The Green House, The Yellow House → 3BHK, 6 guests, ₹5,500/night  
• The Pink House → 3BHK, 10 guests max, ₹9,000/night (best for large groups!)

MADHYA KUNJ / MAHANAGAR AREA:
• Green Forest, Pink Paradise, The Velvet House → 3BHK, 6 guests, ₹4,500/night
• Gomti Grand Villa → Private Villa, 6 guests, ₹8,000/night
• Royal White House → Luxury Villa, 12 guests max, ₹12,000/night (ideal for big families/events)

LULLANPUR:
• Celebrity Garden → 4BHK Grand Homestay, 10 guests, ₹10,000/night (premium experience)

═══ STANDARD AMENITIES & POLICIES (All Properties) ═══
- Check-in: 12:00 PM | Check-out: 11:00 AM (early check-in & luggage drop available on request)
- Couple Friendly: 100% safe & welcoming for couples (unmarried couples allowed with valid Govt ID: Aadhaar/Passport/Driving License)
- Smoking/Alcohol: Permitted only in balconies, verandas, or open rooftop terraces. Strictly prohibited inside air-conditioned bedrooms.
- Modular Kitchen: Fully equipped with gas stove, refrigerator, RO water purifier, microwave, cookware & crockery. Swiggy, Zomato, Blinkit, and Zepto deliver in 10-15 minutes.
- Wi-Fi & Work: High-speed 100+ Mbps optical fiber with power backup.
- Parking: Free dedicated gated car and bike parking on premise.
- Security & Pricing: Zero security deposit. Advance token (30-50%) confirms booking. Official GST tax invoices available for corporate expense claims.
- Direct Discount: Booking directly with us saves 15% to 20% compared to Airbnb/MakeMyTrip.
- Group & Events: Grand Villas like Royal White House (up to 18 guests) and Gomti Grand Villa are perfect for weddings, birthdays, and family get-togethers.
- Key Landmarks: 5 mins to Lulu Mall & Phoenix Palassio, 5 mins to Medanta Hospital, 7 mins to Ekana Stadium, 20 mins to CCS International Airport.
- Direct WhatsApp & Calling: +91 94500 55554 (Mr. Shahanshah - Host & Co-Founder), +91 82996 00709 (Firoz Khan), +91 91941 09911 (Praveen Singh)

═══ LEAD CAPTURE — CRITICAL INSTRUCTIONS ═══
When a guest: asks about any specific property, inquires about availability, mentions dates, or asks how to book — you MUST:

STEP 1: Confirm their interest warmly — "Bilkul ji! Yeh property bahut popular hai." / "Great choice!"
STEP 2: Ask their name — "May I know your name please?" / "Aapka naam kya hai?"
STEP 3: Ask WhatsApp number — "And your WhatsApp number? Our team will contact you personally." / "Aapka WhatsApp number dijiye, hamaari team aapse directly baat karegi."
STEP 4: Confirm the property they're interested in
STEP 5: Call the \`capture_lead\` tool immediately with: name, phone, and interested_property
STEP 6: Say — "Perfect! Our team will WhatsApp you very soon. Koi aur sawaal?" / "Thank you [name]! We'll be in touch shortly on WhatsApp."

DO NOT end the call without attempting to collect contact info if the guest showed any interest.

═══ TOOL USAGE ═══
- \`capture_lead\`: Use this to save a guest's contact info when they show interest
  Parameters: { name: string, phone: string, interested_property: string, notes: string }
  
- \`get_property_rates\`: Call this if asked for the absolute latest prices
  Parameters: {} (no parameters needed)

═══ FOR CUSTOM REQUESTS ═══
- For instant dates lock or special corporate discount rates, guide them warmly to WhatsApp +91 94500 55554.

Remember: Your goal is to make guests fall in love with Unique Haven Homes and get their contact info so our team can close the booking. Be genuine, be warm, be helpful!`;
  }

  // ── 3. SAVE LEAD TO SUPABASE ───────────────────────────────────────
  async function saveLead({ name, phone, interested_property, notes }) {
    try {
      const sb = window.sb ||
        (typeof supabase !== 'undefined' && window.SUPABASE_URL
          ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
          : null);

      if (sb) {
        await sb.from('leads').insert({
          guest_name:          name || 'Unknown',
          phone:               phone || 'Not provided',
          interested_property: interested_property || 'General inquiry',
          source:              'voice_agent_nisha',
          notes:               notes || '',
          status:              'new'
        });
      }
    } catch (err) {
      console.warn('[Nisha] Lead save to Supabase failed (will still notify):', err.message);
    }

    // Always show notification regardless of Supabase
    showLeadNotification({ name, phone, interested_property });
    return { success: true, message: 'Lead saved! Our team has been notified.' };
  }

  // ── 4. SHOW LEAD NOTIFICATION + WHATSAPP BUTTON ───────────────────
  function showLeadNotification({ name, phone, interested_property }) {
    // Remove old notification if exists
    const old = document.getElementById('uhh-lead-notif');
    if (old) old.remove();

    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const adminMsg = encodeURIComponent(
      `🔔 *New Lead — Unique Haven Homes*\n\n` +
      `👤 *Name:* ${name || 'Unknown'}\n` +
      `📱 *Phone:* ${phone || 'N/A'}\n` +
      `🏠 *Interested in:* ${interested_property || 'General inquiry'}\n` +
      `🤖 *Source:* Voice AI (Nisha)\n` +
      `🕐 *Time:* ${new Date().toLocaleString('en-IN')}\n\n` +
      `Please follow up ASAP! 🙏`
    );

    const guestMsg = encodeURIComponent(
      `Namaste ${name || ''}! 🙏\n\n` +
      `Thank you for your interest in *Unique Haven Homes* Lucknow.\n\n` +
      `You enquired about: *${interested_property || 'our properties'}*\n\n` +
      `Our team will share more details and check availability for you shortly.\n\n` +
      `— Team Unique Haven Homes\n📍 Lucknow, UP`
    );

    const notif = document.createElement('div');
    notif.id = 'uhh-lead-notif';
    notif.innerHTML = `
      <div style="
        position:fixed; bottom:120px; right:24px; z-index:99999;
        background:linear-gradient(135deg,#0d1f0d,#1a2e1a);
        border:1px solid rgba(34,197,94,0.4); border-radius:18px;
        padding:22px 24px; max-width:320px; min-width:280px;
        box-shadow:0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,197,94,0.1);
        font-family:'Plus Jakarta Sans','Inter',sans-serif; color:#f0f2f7;
        animation: uhh-slidein 0.4s cubic-bezier(0.34,1.56,0.64,1);
      ">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🎉</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:#86efac;letter-spacing:0.3px;">New Lead Captured!</div>
            <div style="font-size:11px;color:#6b7280;margin-top:1px;">Via Voice AI • Nisha</div>
          </div>
          <button onclick="document.getElementById('uhh-lead-notif').remove()"
            style="margin-left:auto;background:none;border:none;color:#6b7280;cursor:pointer;font-size:18px;padding:2px;line-height:1;">×</button>
        </div>
        <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:12px 14px;margin-bottom:14px;">
          <div style="font-size:16px;font-weight:700;margin-bottom:4px;">${name || 'Guest'}</div>
          <div style="font-size:13px;color:#d4d4d8;margin-bottom:2px;">📱 ${phone || 'Number not captured'}</div>
          ${interested_property ? `<div style="font-size:12px;color:#a3a3a3;">🏠 ${interested_property}</div>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <a href="https://wa.me/${ADMIN_WA}?text=${adminMsg}" target="_blank"
            style="text-align:center;background:linear-gradient(135deg,#22c55e,#16a34a);color:#000;padding:10px;border-radius:10px;text-decoration:none;font-size:12px;font-weight:700;display:block;">
            📲 Alert Me
          </a>
          ${cleanPhone.length >= 10 ? `<a href="https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91'+cleanPhone}?text=${guestMsg}" target="_blank"
            style="text-align:center;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#86efac;padding:10px;border-radius:10px;text-decoration:none;font-size:12px;font-weight:700;display:block;">
            💬 Text Guest
          </a>` : `<button onclick="document.getElementById('uhh-lead-notif').remove()"
            style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#9ca3af;padding:10px;border-radius:10px;cursor:pointer;font-size:12px;font-weight:600;">
            Dismiss
          </button>`}
        </div>
      </div>
    `;

    document.body.appendChild(notif);

    // Auto-dismiss after 60 seconds
    setTimeout(() => { try { notif.remove(); } catch (_) {} }, 60000);
  }

  // ── 5. BUILD THE FLOATING VOICE BUTTON UI ─────────────────────────
  function createVoiceUI() {
    // ── Retired: Unified into single Smart Chat + Voice Concierge (js/chat-widget.js) ──
    const existing = document.getElementById('uhh-voice-widget');
    if (existing) existing.remove();
    return;
  }

  // ── 6. UPDATE UI STATE ─────────────────────────────────────────────
  function setStatus(status, text) {
    _status = status;
    const btn        = document.getElementById('uhh-voice-btn');
    const icon       = document.getElementById('uhh-btn-icon');
    const statusText = document.getElementById('uhh-status-text');
    const waveArea   = document.getElementById('uhh-wave-area');
    const waveMsg    = document.getElementById('uhh-wave-msg');
    const endBtn     = document.getElementById('uhh-end-btn');
    const ring1      = document.getElementById('uhh-pulse-ring');
    const ring2      = document.getElementById('uhh-pulse-ring2');
    const label      = document.getElementById('uhh-voice-label');

    if (statusText) statusText.textContent = text || status;
    if (label) label.textContent = text || '🎙️ Talk to Nisha';

    const waveBars = `
      <div class="uhh-soundwave">
        <div class="uhh-bar" style="--color:${status==='speaking'?'#3b82f6':'#d4a84b'}"></div>
        <div class="uhh-bar" style="--color:${status==='speaking'?'#3b82f6':'#d4a84b'}"></div>
        <div class="uhh-bar" style="--color:${status==='speaking'?'#3b82f6':'#d4a84b'}"></div>
        <div class="uhh-bar" style="--color:${status==='speaking'?'#3b82f6':'#d4a84b'}"></div>
        <div class="uhh-bar" style="--color:${status==='speaking'?'#3b82f6':'#d4a84b'}"></div>
      </div>
      <span style="font-size:12px;color:${status==='speaking'?'#93c5fd':'#fde047'};margin-left:6px;" id="uhh-wave-msg">${text || ''}</span>
    `;

    switch (status) {
      case 'idle':
        btn.className = '';
        icon.textContent = '🎙️';
        if (ring1) ring1.style.display = '';
        if (ring2) ring2.style.display = '';
        if (waveMsg) { waveArea.innerHTML = '<span style="font-size:12px;color:#6b7280;" id="uhh-wave-msg">Press mic to start talking</span>'; }
        if (endBtn) endBtn.style.display = 'none';
        break;
      case 'connecting':
        btn.className = 'connecting';
        icon.textContent = '⏳';
        if (ring1) ring1.style.display = 'none';
        if (ring2) ring2.style.display = 'none';
        if (waveArea) waveArea.innerHTML = `<span style="font-size:12px;color:#60a5fa;">⏳ ${text || 'Connecting…'}</span>`;
        break;
      case 'listening':
        btn.className = 'active';
        icon.textContent = '🔴';
        if (ring1) ring1.style.display = 'none';
        if (ring2) ring2.style.display = 'none';
        if (waveArea) waveArea.innerHTML = waveBars;
        if (endBtn) endBtn.style.display = 'block';
        break;
      case 'speaking':
        btn.className = 'active';
        icon.textContent = '🔊';
        if (waveArea) waveArea.innerHTML = waveBars;
        if (endBtn) endBtn.style.display = 'block';
        break;
      case 'error':
        btn.className = '';
        icon.textContent = '⚠️';
        if (ring1) ring1.style.display = '';
        if (ring2) ring2.style.display = '';
        if (endBtn) endBtn.style.display = 'none';
        break;
    }
  }

  // ── 7. TRANSCRIPT ──────────────────────────────────────────────────
  function appendTranscript(role, text) {
    const el = document.getElementById('uhh-transcript');
    if (!el) return;
    el.style.display = 'block';
    const line = document.createElement('div');
    line.style.cssText = `margin-bottom:6px;line-height:1.45;color:${role==='user'?'#fde047':'#e2e8f0'};`;
    const cleanFormatted = (text || '')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>');
    line.innerHTML = `<span style="font-weight:700;color:${role==='user'?'#facc15':'#93c5fd'}">${role==='user'?'You':'Nisha'}:</span> ${cleanFormatted}`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  // ── 8. START CONVERSATION (Powered by Sarvam AI Bulbul + Nisha Engine) ──
  let _isActiveVoiceSession = false;

  async function speakAndListen(textToSpeak) {
    if (!_isActiveVoiceSession) return;
    setStatus('speaking', '🔊 Nisha bol rahi hain…');

    const onDone = () => {
      if (!_isActiveVoiceSession) return;
      listenToGuest();
    };

    if (window.nishaAI) {
      await window.nishaAI.speak(textToSpeak, onDone);
    } else {
      setTimeout(onDone, 3000);
    }
  }

  function listenToGuest() {
    if (!_isActiveVoiceSession) return;
    setStatus('listening', '🔴 Sun rahi hoon... (Boliye)');

    if (!window.nishaAI) return;

    window.nishaAI.startListening(
      async (transcript) => {
        if (!_isActiveVoiceSession) return;
        if (!transcript || !transcript.trim()) {
          listenToGuest();
          return;
        }
        await handleUserQuery(transcript);
      },
      (err) => {
        if (!_isActiveVoiceSession) return;
        console.warn('[Nisha Voice] Listening status:', err);
      },
      (interim) => {
        if (!_isActiveVoiceSession) return;
        const waveMsg = document.getElementById('uhh-wave-msg');
        if (waveMsg) {
          waveMsg.textContent = `"${interim}…"`;
        }
      }
    );
  }

  async function handleUserQuery(userText) {
    if (!_isActiveVoiceSession) return;
    if (!userText || !userText.trim()) return;

    if (window.nishaAI) {
      window.nishaAI.stopListening();
    }

    appendTranscript('user', userText.trim());
    setStatus('connecting', '⏳ Soch rahi hoon…');

    // Check for phone number for lead capture
    const phoneMatch = userText.match(/(\+?\d{1,4}[-.\s]?)?([6-9]\d{9})/);
    if (phoneMatch) {
      saveLead({ name: 'Voice Guest', phone: phoneMatch[2], interested_property: userText });
    }

    const reply = await window.nishaAI.sendMessage(userText.trim());
    if (!_isActiveVoiceSession) return;

    appendTranscript('agent', reply);
    await speakAndListen(reply);
  }

  async function startConversation() {
    const panel = document.getElementById('uhh-voice-panel');
    if (panel) panel.style.display = 'block';

    if (window.nishaAI) {
      window.nishaAI.unlockAudio();
    }

    _isActiveVoiceSession = true;
    setStatus('connecting', 'Nisha se connect ho rahe hain…');

    try {
      // Request mic permission and immediately stop tracks so SpeechRecognition has full exclusive access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (_) {
      setStatus('error', 'Microphone permission required');
      const waveArea = document.getElementById('uhh-wave-area');
      if (waveArea) {
        waveArea.innerHTML = '<span style="font-size:12px;color:#ef4444;">Please allow microphone access in your browser</span>';
      }
      return;
    }

    // Pre-fetch live rates
    await getRates();

    const welcomeMsg = 'Namaste ji! Main Nisha hoon, The Unique Haven Homes Lucknow ki AI concierge. Lucknow me luxury 3BHK flat ya grand private villa booking ke baare me pooch sakte hain. Main aapki kya madad kar sakti hoon?';

    appendTranscript('agent', welcomeMsg);
    await speakAndListen(welcomeMsg);
  }

  // ── 9. END CONVERSATION ────────────────────────────────────────────
  async function endConversation() {
    _isActiveVoiceSession = false;
    if (window.nishaAI) {
      window.nishaAI.stopSpeaking();
      window.nishaAI.stopListening();
    }
    setStatus('idle', '🎙️ Talk to Nisha');
    const panel = document.getElementById('uhh-voice-panel');
    if (panel) panel.style.display = 'none';
  }

  // ── 10. TOGGLE ─────────────────────────────────────────────────────
  function toggleConversation() {
    if (_isActiveVoiceSession) {
      endConversation();
    } else {
      startConversation();
    }
  }

  // ── 11. BOOT ───────────────────────────────────────────────────────
  function boot() {
    createVoiceUI();
    getRates().catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose globally
  window.UHH_VoiceAgent = { start: startConversation, end: endConversation, getRates };

})();

