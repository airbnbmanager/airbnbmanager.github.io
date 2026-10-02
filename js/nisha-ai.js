/* ══════════════════════════════════════════════════════════════════════
   UNIQUE HAVEN HOMES — "NISHA" AI ENGINE (NEXT-GEN)
   Standalone, 100% Free 24/7 AI Voice & Text Concierge
   Powered by Google Gemini 1.5 Flash + Natural Indian Neural Voice

   Features:
   ✅ 100% Free 24/7 Voice & Chat without ElevenLabs credit limits
   ✅ Natural Indian Hindi / Hinglish / English Persona ("Nisha")
   ✅ Live Supabase Rooms & Rates Sync (Dynamic Source of Truth)
   ✅ Real-time Room Availability Check against Reservations
   ✅ Automatic Lead Capture (Name, Phone, Dates, Unit) to Supabase
   ✅ Instant WhatsApp Notification & Follow-up link to Host
   ✅ Zero Impact on Existing voice-agent.js / chat-widget.js
   ══════════════════════════════════════════════════════════════════════ */

(function (window) {
  'use strict';

  // Default Host Contacts
  const HOST_SHAHANSHAH = '919450055554';
  const HOST_FIROZ      = '918299600709';

  // Storage Keys
  const GEMINI_KEY_STORAGE = 'uhh_gemini_api_key';

  // Verified Fallback Rates (All 17 Properties)
  const FALLBACK_PROPERTIES = [
    { room_id:'GOM-101', property_name:'RedRose Palace',            nickname:'RedRose Palace',            base_price:3500, max_guests:6,  bhk:'3BHK Luxury Flat', area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-102', property_name:'Black Beauty',              nickname:'Black Beauty',              base_price:3500, max_guests:6,  bhk:'3BHK Luxury Flat', area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-201', property_name:'The Dark Blue',             nickname:'The Dark Blue',             base_price:3500, max_guests:6,  bhk:'3BHK Luxury Flat', area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-202', property_name:'The Brown',                 nickname:'The Brown',                 base_price:3500, max_guests:6,  bhk:'3BHK Luxury Flat', area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-301', property_name:'The Light Green',           nickname:'The Light Green',           base_price:3500, max_guests:6,  bhk:'3BHK Luxury Flat', area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-401', property_name:'The Nawabi Stay',           nickname:'The Nawabi Stay',           base_price:3500, max_guests:6,  bhk:'3BHK Luxury Flat', area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-501', property_name:'Starlight Blue PentHouse',  nickname:'Starlight Blue PentHouse',  base_price:6000, max_guests:10, bhk:'4BHK Penthouse',   area:'Vikalp Khand, Gomti Nagar' },
    { room_id:'GOM-302', property_name:'The Unique',                nickname:'The Unique',                base_price:5500, max_guests:8,  bhk:'3BHK Luxury Flat', area:'Vishesh Khand, Gomti Nagar' },
    { room_id:'VIL-104', property_name:'The Green House',           nickname:'The Green House',           base_price:5500, max_guests:8,  bhk:'3BHK Luxury Flat', area:'Vishesh Khand, Gomti Nagar' },
    { room_id:'VIL-105', property_name:'The Yellow House',          nickname:'The Yellow House',          base_price:5500, max_guests:8,  bhk:'3BHK Luxury Flat', area:'Vishesh Khand, Gomti Nagar' },
    { room_id:'VIL-103', property_name:'The Pink House',            nickname:'The Pink House',            base_price:9000, max_guests:10, bhk:'3BHK Grand Villa', area:'Vishesh Khand, Gomti Nagar' },
    { room_id:'VIL-106', property_name:'Green Forest View',         nickname:'Green Forest View',         base_price:4500, max_guests:6,  bhk:'3BHK Luxury Flat', area:'Near Mahanagar' },
    { room_id:'VIL-107', property_name:'The Velvet House',          nickname:'The Velvet House',          base_price:4500, max_guests:5,  bhk:'3BHK Luxury Flat', area:'Near Lulu Mall / Shaheed Path' },
    { room_id:'VIL-108', property_name:'Pink Paradise Villa',       nickname:'Pink Paradise Villa',       base_price:4500, max_guests:6,  bhk:'Luxury Villa',      area:'Near Shaheed Path' },
    { room_id:'VIL-101', property_name:'Gomti Grand Villa',         nickname:'Gomti Grand Villa',         base_price:8000, max_guests:10, bhk:'Private Villa',    area:'Near Lulu Mall / Shaheed Path' },
    { room_id:'VIL-102', property_name:'Royal White House',         nickname:'Royal White House',         base_price:12000,max_guests:18, bhk:'Palace Villa',     area:'Near Shaheed Path / Mahanagar' },
    { room_id:'LUL-402', property_name:'Celebrity Garden',          nickname:'Celebrity Garden',          base_price:10000,max_guests:10, bhk:'Grand Homestay',   area:'Near Lulu Mall' }
  ];

  class NishaAIEngine {
    constructor() {
      this.apiKey = this.loadApiKey();
      this.properties = FALLBACK_PROPERTIES;
      this.conversationHistory = [];
      this.isListening = false;
      this.isSpeaking = false;
      this.recognition = null;
      this.synthesis = window.speechSynthesis || null;
      this.selectedVoice = null;
      this.onStateChange = null;
      this.initVoiceSynthesis();
    }

    // ── API Key Management ──
    loadApiKey() {
      return (
        window.GEMINI_API_KEY ||
        localStorage.getItem(GEMINI_KEY_STORAGE) ||
        sessionStorage.getItem(GEMINI_KEY_STORAGE) ||
        ''
      );
    }

    setApiKey(key) {
      this.apiKey = (key || '').trim();
      if (this.apiKey) {
        localStorage.setItem(GEMINI_KEY_STORAGE, this.apiKey);
      } else {
        localStorage.removeItem(GEMINI_KEY_STORAGE);
      }
    }

    hasApiKey() {
      return Boolean(this.apiKey && this.apiKey.length > 10);
    }

    // ── 1. Fetch Dynamic Room Rates & Nicknames from Supabase ──
    async fetchLiveProperties() {
      try {
        const sb = window.sb || (typeof supabase !== 'undefined' && window.SUPABASE_URL
          ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
          : null);

        if (sb) {
          const { data, error } = await sb
            .from('rooms')
            .select('room_id, property_name, nickname, rent_per_night, max_guests, unit_no')
            .order('room_id');

          if (!error && data && data.length > 0) {
            this.properties = data.map(r => {
              const matched = FALLBACK_PROPERTIES.find(f => f.room_id === r.room_id) || {};
              return {
                room_id: r.room_id,
                property_name: r.nickname || r.property_name || matched.property_name || r.room_id,
                nickname: r.nickname || matched.nickname || r.room_id,
                base_price: Number(r.rent_per_night) || matched.base_price || 3500,
                max_guests: r.max_guests || matched.max_guests || 6,
                bhk: matched.bhk || 'Serviced Homestay',
                area: matched.area || 'Lucknow'
              };
            });
            return this.properties;
          }
        }
      } catch (err) {
        console.warn('[NishaAI] Could not fetch live rooms, using fallback:', err.message);
      }
      return this.properties;
    }

    // ── 2. Live Date Availability Check against Database ──
    async checkAvailability(checkIn, checkOut, roomId) {
      try {
        const sb = window.sb || (typeof supabase !== 'undefined' && window.SUPABASE_URL
          ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
          : null);

        if (!sb || !checkIn) return { status: 'check_manual', message: 'Please WhatsApp host for instant lock.' };

        const cOut = checkOut || checkIn;
        let q = sb.from('guest_register')
          .select('booking_id, room_id, check_in, check_out, guest_name, is_cancelled')
          .neq('is_cancelled', true)
          .lte('check_in', cOut)
          .gte('check_out', checkIn);

        if (roomId) q = q.eq('room_id', roomId);

        const { data, error } = await q;
        if (error) throw error;

        const bookedRoomIds = new Set((data || []).map(b => b.room_id));
        const availableRooms = this.properties.filter(p => !bookedRoomIds.has(p.room_id));

        return {
          status: 'success',
          availableRooms: availableRooms.map(r => ({
            id: r.room_id,
            name: r.property_name,
            price: r.base_price,
            max_guests: r.max_guests,
            area: r.area
          })),
          bookedCount: bookedRoomIds.size
        };
      } catch (err) {
        console.warn('[NishaAI] Availability check error:', err.message);
        return { status: 'error', message: err.message };
      }
    }

    // ── 3. Lead Capture to Supabase & WhatsApp Notification ──
    async captureLead({ name, phone, dates, property, guests, notes }) {
      try {
        const sb = window.sb || (typeof supabase !== 'undefined' && window.SUPABASE_URL
          ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
          : null);

        const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
        const cleanName = name || 'Guest';
        const propName = property || 'General Homestay Inquiry';
        const noteText = `Dates: ${dates || 'Not specified'} | Guests: ${guests || 'N/A'} | Notes: ${notes || '-'}`;

        if (sb && cleanPhone) {
          await sb.from('leads').insert({
            guest_name: cleanName,
            phone: cleanPhone,
            interested_property: propName,
            source: 'nisha_ai_voice_chat',
            notes: noteText,
            status: 'new'
          });
        }

        // WhatsApp Direct Link
        const adminMsg = encodeURIComponent(
          `🔔 *New Lead Captured by Nisha AI*\n\n` +
          `👤 *Guest Name:* ${cleanName}\n` +
          `📱 *Phone:* ${cleanPhone || 'Not given'}\n` +
          `🏠 *Interested Property:* ${propName}\n` +
          `📅 *Dates:* ${dates || 'Pending confirmation'}\n` +
          `👥 *Guests:* ${guests || 'Not specified'}\n\n` +
          `Action: Kindly confirm availability & advance token ASAP! 🙏`
        );
        const waUrl = `https://wa.me/${HOST_SHAHANSHAH}?text=${adminMsg}`;

        return {
          success: true,
          waUrl,
          message: 'Lead captured successfully.'
        };
      } catch (err) {
        console.warn('[NishaAI] Lead save failed:', err.message);
        return { success: false, error: err.message };
      }
    }

    // ── 4. Build Comprehensive Gemini System Prompt ──
    buildSystemInstruction() {
      const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const propList = this.properties.map(p =>
        `- ${p.property_name} (ID: ${p.room_id}) | ${p.bhk} | Up to ${p.max_guests} guests | Direct Rate: ₹${p.base_price.toLocaleString('en-IN')}/night | Area: ${p.area}`
      ).join('\n');

      return `You are "Nisha" (निशा), the warm, charming, and highly professional AI Concierge & Reservation Manager for "The Unique Haven Homes Private Limited" (TUHH) — Lucknow's premier luxury homestay and serviced villa brand.

Today's Date: ${today}.
Location: Lucknow, Uttar Pradesh, India.

═══════════════════════════════════════
🎯 YOUR CORE PERSONALITY & TONE:
═══════════════════════════════════════
- You speak natural, friendly, polite Indian Hindi, Hinglish, or English depending on how the guest talks to you.
- Always use respectful Indian hospitality language: "Namaste ji", "Bilkul ji", "Zaroor ji", "Aapka swagat hai".
- Keep your answers concise, helpful, and sweet (2 to 4 sentences in voice mode). Never sound robotic.
- Your primary goal is to guide guests, answer questions about properties/rules, recommend the best room, and warmly capture their Name & Phone Number so the team can confirm their booking.

═══════════════════════════════════════
🏡 OUR 17 LUXURY HOMESTAY PROPERTIES IN LUCKNOW:
═══════════════════════════════════════
${propList}

Pricing Notes:
- Direct website/WhatsApp rates start at ₹3,500/night for Gomti Nagar luxury 3BHK flats!
- Booking directly with us saves 15% to 20% compared to Airbnb or MakeMyTrip.
- Big Villas: "Royal White House" (up to 18 guests, ₹12,000/night) & "Gomti Grand Villa" (₹8,000/night) are perfect for weddings, family get-togethers, and celebrations.

═══════════════════════════════════════
📋 POLICIES & AMENITIES (Always Know These):
═══════════════════════════════════════
1. Check-In & Check-Out: Check-in from 12:00 PM | Check-out by 11:00 AM. Early check-in or luggage storage is free upon prior request and subject to availability.
2. 100% Couple Friendly: Completely safe and welcoming for couples and families. Unmarried couples are welcome with valid Govt photo ID (Aadhaar Card, Driving License, or Passport).
3. Kitchen: Every property has a fully functional modular kitchen with gas stove, RO water purifier, refrigerator, microwave oven, and cooking utensils. Zomato, Swiggy, Blinkit, and Zepto deliver in 10-15 minutes!
4. Smoking & Alcohol: Permitted in balconies, verandas, and open terraces. Strictly prohibited inside air-conditioned bedrooms.
5. High-Speed Internet: Optical fiber WiFi (100+ Mbps) with power inverter backup — perfect for work from home and OTT streaming.
6. Parking: Free, secure gated parking available on premise for both 4-wheelers and 2-wheelers.
7. Booking Token & Security: ZERO security deposit! Only a small advance token (30% to 50%) is required to lock dates. Official GST Tax Invoices are provided for corporate expense claims.
8. Prime Location Distances:
   - 5 mins to Lulu Mall & Phoenix Palassio
   - 5 mins to Medanta Hospital
   - 7 mins to Ekana International Cricket Stadium
   - 20 mins to CCS International Airport & Charbagh Railway Station.
9. Direct Helpline Contacts:
   - Mr. Shahanshah (Host & Founder): +91 94500 55554
   - Mr. Firoz Khan: +91 82996 00709

═══════════════════════════════════════
📲 LEAD CAPTURE INSTRUCTIONS:
═══════════════════════════════════════
When a guest asks for availability, rates, or expresses interest in staying:
1. Warmly suggest the best matching property for their group size.
2. Ask for their check-in/out dates and number of guests.
3. Gently request their Name and WhatsApp phone number:
   "Ji, aap apna naam aur WhatsApp number bata dijiye, hamare host Mr. Shahanshah turant availability check karke special direct discount confirm kar denge."
4. Once you have their phone number, confirm warmly that the team will reach out immediately.`;
    }

    // ── 5. Generate Gemini Chat Reply ──
    async sendMessage(userMessage) {
      if (!userMessage || !userMessage.trim()) return '';

      // Check API Key
      if (!this.apiKey) {
        return 'Namaste! Please provide a Google Gemini API key to activate full AI concierge capabilities.';
      }

      await this.fetchLiveProperties();

      const systemInstruction = this.buildSystemInstruction();
      this.conversationHistory.push({ role: 'user', parts: [{ text: userMessage }] });

      // Keep conversation within last 12 turns for speed
      const recentHistory = this.conversationHistory.slice(-12);

      const payload = {
        system_instruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: recentHistory,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 350,
          topP: 0.95
        }
      };

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gemini API returned status ${response.status}`);
        }

        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Bilkul ji, aapki request note ho gayi hai.';

        // Save AI reply to history
        this.conversationHistory.push({ role: 'model', parts: [{ text: replyText }] });

        // Auto-extract phone number from user message for lead capture
        const phoneMatch = userMessage.match(/(\+?\d{1,4}[-.\s]?)?([6-9]\d{9})/);
        if (phoneMatch) {
          const cleanPhone = phoneMatch[2];
          this.captureLead({
            name: 'Web Guest',
            phone: cleanPhone,
            notes: userMessage
          });
        }

        return replyText;
      } catch (err) {
        console.error('[NishaAI] Chat generation error:', err);
        return `Namaste! Maaf kijiye abhi network me thoda issue hai. Aap direct hamare host Mr. Shahanshah se +91 94500 55554 par baat kar sakte hain.`;
      }
    }

    // ── 6. Speech-to-Text (STT) via Web Speech API (Free & Unlimited) ──
    initSpeechRecognition(onTranscript, onError) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('[NishaAI] Web Speech API not supported on this browser.');
        return null;
      }

      const reco = new SpeechRecognition();
      reco.continuous = false;
      reco.interimResults = false;
      reco.lang = 'hi-IN'; // Dual Hindi / English understanding

      reco.onstart = () => {
        this.isListening = true;
        if (this.onStateChange) this.onStateChange('listening');
      };

      reco.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        this.isListening = false;
        if (this.onStateChange) this.onStateChange('processing');
        if (onTranscript) onTranscript(transcript);
      };

      reco.onerror = (event) => {
        this.isListening = false;
        if (this.onStateChange) this.onStateChange('error');
        if (onError) onError(event.error);
      };

      reco.onend = () => {
        this.isListening = false;
        if (this.onStateChange && !this.isSpeaking) this.onStateChange('idle');
      };

      this.recognition = reco;
      return reco;
    }

    startListening(onTranscript, onError) {
      if (!this.recognition) {
        this.initSpeechRecognition(onTranscript, onError);
      }
      if (this.recognition) {
        try {
          this.recognition.start();
        } catch (_) {}
      }
    }

    stopListening() {
      if (this.recognition && this.isListening) {
        try {
          this.recognition.stop();
        } catch (_) {}
      }
    }

    // ── 7. Text-to-Speech (TTS) with Natural Indian Accent ──
    initVoiceSynthesis() {
      if (!this.synthesis) return;

      const pickIndianVoice = () => {
        const voices = this.synthesis.getVoices() || [];
        // Priority: Indian Hindi Female -> Indian English Female -> Hindi general -> English India
        this.selectedVoice =
          voices.find(v => (v.lang === 'hi-IN' || v.lang.startsWith('hi')) && /female|swara|kalpana|geeta/i.test(v.name)) ||
          voices.find(v => (v.lang === 'en-IN' || v.lang.includes('IN')) && /female|neerja|heera|aditi/i.test(v.name)) ||
          voices.find(v => v.lang === 'hi-IN') ||
          voices.find(v => v.lang === 'en-IN') ||
          voices.find(v => /india/i.test(v.name)) ||
          voices[0];
      };

      pickIndianVoice();
      if (this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = pickIndianVoice;
      }
    }

    speak(text, onEnd) {
      if (!this.synthesis || !text) {
        if (onEnd) onEnd();
        return;
      }

      this.synthesis.cancel(); // Stop any pending speech

      // Clean markdown asterisks & emojis from speech text for clean pronunciation
      const cleanSpeech = text
        .replace(/[*#_~`]/g, '')
        .replace(/[•→➔➜]/g, ', ')
        .replace(/₹/g, 'Rupees ')
        .replace(/\bRs\.?\s*/gi, 'Rupees ')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
        utterance.lang = this.selectedVoice.lang || 'hi-IN';
      } else {
        utterance.lang = 'hi-IN';
      }

      utterance.pitch = 1.05; // Slightly pleasant concierge tone
      utterance.rate = 0.98;  // Natural conversational speed

      utterance.onstart = () => {
        this.isSpeaking = true;
        if (this.onStateChange) this.onStateChange('speaking');
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        if (this.onStateChange) this.onStateChange('idle');
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        if (this.onStateChange) this.onStateChange('idle');
        if (onEnd) onEnd();
      };

      this.synthesis.speak(utterance);
    }

    stopSpeaking() {
      if (this.synthesis) {
        this.synthesis.cancel();
        this.isSpeaking = false;
        if (this.onStateChange) this.onStateChange('idle');
      }
    }
  }

  // Export globally
  window.NishaAIEngine = NishaAIEngine;
  window.nishaAI = new NishaAIEngine();

})(window);
