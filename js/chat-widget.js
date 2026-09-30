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

  const ADMIN_WA   = '919450055554'; // Mr. Shahanshah (+91 94500 55554)
  const CHAT_KEY   = 'uhh_chat_history';
  const LEAD_KEY   = 'uhh_chat_lead';

  let _rates       = null;
  let _chatOpen    = false;
  let _leadData    = {};
  let _step        = 'init'; // init | greet | ask_requirement | show_props | ask_name | ask_phone | done
  let _history     = [];

  // ── GET LIVE RATES FROM SUPABASE ROOMS TABLE (SOURCE OF TRUTH) ────
  async function getRates() {
    if (_rates && _rates.length > 0) return _rates;
    try {
      const cached = JSON.parse(sessionStorage.getItem('uhh_price_cache') || 'null');
      if (cached && cached.data && (Date.now() - cached.ts) < 15 * 60 * 1000) {
        _rates = cached.data; return _rates;
      }
      const sb = window.sb || (typeof supabase !== 'undefined' && window.SUPABASE_URL
        ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null);
      if (sb) {
        // Query live rooms table
        const { data, error } = await sb
          .from('rooms')
          .select('room_id, property_name, nickname, rent_per_night, max_guests')
          .order('room_id');
        if (!error && data && data.length > 0) {
          _rates = data.map(r => ({
            room_id: r.room_id,
            property_name: r.nickname || r.property_name,
            base_price: Number(r.rent_per_night) || 4500,
            max_guests: r.max_guests || 6
          }));
          return _rates;
        }
      }
    } catch (_) {}

    // Fallback: Exact verified rates (Gomti Grand Villa = ₹8,000)
    _rates = [
      { room_id:'VIL-101', property_name:'Gomti Grand Villa',         base_price:8000,  max_guests:10, type:'villa', area:'Near Lulu Mall / Shaheed Path' },
      { room_id:'VIL-102', property_name:'Royal White House',        base_price:12000, max_guests:18, type:'villa', area:'Near Shaheed Path / Mahanagar' },
      { room_id:'LUL-402', property_name:'Celebrity Garden',         base_price:10000, max_guests:8,  type:'villa', area:'Near Lulu Mall' },
      { room_id:'VIL-103', property_name:'The Pink House',           base_price:9000,  max_guests:10, type:'villa', area:'Vishesh Khand, Gomti Nagar' },
      { room_id:'GOM-501', property_name:'Starlight Blue PentHouse', base_price:6000,  max_guests:10, type:'penthouse', area:'Vikalp Khand, Gomti Nagar' },
      { room_id:'GOM-302', property_name:'The Unique',               base_price:5500,  max_guests:10, type:'flat',  area:'Vishesh Khand, Gomti Nagar' },
      { room_id:'VIL-104', property_name:'The Green House',          base_price:5500,  max_guests:10, type:'flat',  area:'Vishesh Khand, Gomti Nagar' },
      { room_id:'VIL-105', property_name:'The Yellow House',         base_price:5500,  max_guests:10, type:'flat',  area:'Vishesh Khand, Gomti Nagar' },
      { room_id:'GOM-101', property_name:'RedRose Palace',           base_price:4500,  max_guests:10, type:'flat',  area:'Vikalp Khand, Gomti Nagar' },
      { room_id:'GOM-102', property_name:'Black Beauty',             base_price:4500,  max_guests:10, type:'flat',  area:'Vikalp Khand, Gomti Nagar' },
      { room_id:'GOM-201', property_name:'The Dark Blue',            base_price:4500,  max_guests:10, type:'flat',  area:'Vikalp Khand, Gomti Nagar' },
      { room_id:'GOM-202', property_name:'The Brown',                base_price:4500,  max_guests:10, type:'flat',  area:'Vikalp Khand, Gomti Nagar' },
      { room_id:'GOM-301', property_name:'The Light Green',          base_price:4500,  max_guests:10, type:'flat',  area:'Vikalp Khand, Gomti Nagar' },
      { room_id:'GOM-401', property_name:'The Nawabi Stay',          base_price:4500,  max_guests:10, type:'flat',  area:'Vikalp Khand, Gomti Nagar' },
      { room_id:'VIL-107', property_name:'The Velvet House',         base_price:4500,  max_guests:5,  type:'flat',  area:'Near Lulu Mall' },
      { room_id:'VIL-106', property_name:'Green Forest View',        base_price:4500,  max_guests:6,  type:'flat',  area:'Near Mahanagar' },
      { room_id:'VIL-108', property_name:'Pink Paradise Villa',      base_price:4500,  max_guests:6,  type:'villa', area:'Near Shaheed Path' },
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
    // Popup notification for admin
    const msg = encodeURIComponent(`🔔 *New Chat Lead*\n👤 ${name}\n📱 ${phone}\n💬 ${note || 'Chat enquiry'}`);
    const notif = document.createElement('div');
    notif.innerHTML = `<div style="position:fixed;bottom:100px;left:24px;z-index:99999;background:#1a2e1a;border:1px solid rgba(34,197,94,0.4);border-radius:16px;padding:16px 20px;max-width:290px;font-family:sans-serif;color:#f0f2f7;box-shadow:0 16px 48px rgba(0,0,0,.5)">
      <div style="font-size:13px;color:#86efac;font-weight:700;margin-bottom:6px">🎉 New Booking Lead!</div>
      <div style="font-size:14px;font-weight:700">${name}</div>
      <div style="font-size:13px;color:#d4d4d8">📱 ${phone}</div>
      <a href="https://wa.me/${ADMIN_WA}?text=${msg}" target="_blank" style="display:block;margin-top:10px;background:#22c55e;color:#000;text-align:center;padding:8px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:700">📲 WhatsApp Guest</a>
    </div>`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 25000);
  }

  // ── ENTITY EXTRACTOR (DATES, GUESTS, PROPERTIES, NAMES, PHONES) ──
  function parseBookingEntities(raw) {
    const msg = raw.toLowerCase();
    const info = {
      phone: null,
      dates: null,
      guests: null,
      property: null,
      rate: null,
      name: null,
      isBookingIntent: false,
      isAdvanceQuery: false,
      isCancelQuery: false,
      isAvailQuery: false
    };

    // Phone
    const phoneMatch = raw.match(/(\+?\d{1,4}[-.\s]?)?([6-9]\d{9})/);
    if (phoneMatch) info.phone = phoneMatch[2];

    // Property
    if (/royal white|white house|shaadi|wedding|18 guest|badi villa/i.test(msg)) {
      info.property = 'Royal White House';
      info.rate = '₹12,000 / night';
    } else if (/gomti grand|grand villa|gomti villa/i.test(msg)) {
      info.property = 'Gomti Grand Villa';
      info.rate = '₹8,000 / night';
    } else if (/celebrity/i.test(msg)) {
      info.property = 'Celebrity Garden';
      info.rate = '₹10,000 / night';
    } else if (/pink house/i.test(msg)) {
      info.property = 'The Pink House';
      info.rate = '₹9,000 / night';
    } else if (/starlight|penthouse|blue penthouse|skyline|rooftop/i.test(msg)) {
      info.property = 'Starlight Blue PentHouse';
      info.rate = '₹6,000 / night';
    } else if (/unique|green house|yellow house/i.test(msg)) {
      info.property = 'Vishesh Khand 3BHK';
      info.rate = '₹5,500 / night';
    } else if (/redrose|black beauty|dark blue|brown|light green|nawabi|velvet|3bhk|flat|apartment/i.test(msg)) {
      info.property = '3BHK Serviced Flat (Gomti Nagar)';
      info.rate = '₹4,500 / night';
    } else if (/villa/i.test(msg)) {
      info.property = 'Luxury Villa';
      info.rate = '₹8,000 – ₹12,000 / night';
    }

    // Guests
    const guestMatch = msg.match(/(\d{1,2})\s*(?:log|people|guests?|persons?|members?|pax|aadmi)/i) || msg.match(/\b(couple|family|friends|group)\b/i);
    if (guestMatch) {
      if (guestMatch[1]) info.guests = `${guestMatch[1]} guests`;
      else if (guestMatch[0]) info.guests = guestMatch[0];
    }

    // Dates
    const dateMatch = msg.match(/(\d{1,2}(?:st|nd|rd|th)?\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?|\b(?:today|tonight|tomorrow|kal|parso|aaj|weekend|next week|diwali|new year)\b)/i);
    if (dateMatch) info.dates = dateMatch[0];

    // Name
    const nameMatch = raw.match(/(?:mera naam|my name is|i am|this is|naam)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
    if (nameMatch) {
      info.name = nameMatch[1];
    }

    // Intent flags
    if (/book|booking|reserve|chahiye|stay karna|staying|check in|available|booking karna|book karo/i.test(msg)) {
      info.isBookingIntent = true;
    }
    if (/advance|token|advance kitna|payment method|upi|qr|card|cash|kitna dena/i.test(msg)) {
      info.isAdvanceQuery = true;
    }
    if (/refund|cancel|cancellation|reschedule|plan change/i.test(msg)) {
      info.isCancelQuery = true;
    }
    if (/available|free hai|khali hai|availability/i.test(msg)) {
      info.isAvailQuery = true;
    }

    return info;
  }

  // ── SMART KNOWLEDGE ENGINE (COMPREHENSIVE TRAINING) ──────────────
  async function getReply(userMsg) {
    const raw = userMsg.trim();
    const msg = raw.toLowerCase();
    const rates = await getRates();
    const parsed = parseBookingEntities(raw);

    // 0. DETECT PHONE NUMBER ANYWHERE (Direct Lead Capture)
    if (parsed.phone && (_step === 'ask_phone' || _step === 'ask_name' || _step === 'booking_flow' || /phone|number|whatsapp|call|contact/i.test(msg) || raw.length <= 15)) {
      const phoneClean = parsed.phone;
      const guestName = _leadData.name || 'Valued Guest';
      _leadData.phone = phoneClean;
      _step = 'done';
      await saveLead(guestName, phoneClean, _leadData.interest || _leadData.property || 'Chat booking enquiry');
      
      const propText = _leadData.property ? ` for ${_leadData.property}` : '';
      const datesText = _leadData.dates ? ` (${_leadData.dates})` : '';
      const waMsg = encodeURIComponent(`Namaste Shahanshah ji! I'm ${guestName} (${phoneClean}). I want to book a stay${propText}${datesText} at Unique Haven Homes. Please share confirmation.`);
      return {
        text: `✅ **Bahut shukriya ${guestName} ji!** 🙏\n\nHamaare host **Mr. Shahanshah (+91 94500 55554)** aapko WhatsApp number **${phoneClean}** par abhi live details aur confirmation voucher bhej rahe hain.\n\nAap chahein to turant WhatsApp par bhi connect kar sakte hain:`,
        actions: [{ label: '📲 Message Shahanshah on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=${waMsg}` }],
        quickReplies: ['Check-in time kya hai?', 'Advance policy?', 'Other options dikhao']
      };
    }

    // 0B. GUEST EXPLICITLY INTRODUCES NAME
    if (parsed.name) {
      _leadData.name = parsed.name;
      return {
        text: `Namaste **${parsed.name} ji**! 🙏 Unique Haven Homes me aapka swaagat hai.\n\nAap aane ki **Dates** aur **Kitne Log** hain bata dijiye, ya property select karein:`,
        quickReplies: ['Gomti Grand Villa ₹8k', 'Royal White House ₹12k', '3BHK Flat ₹4.5k', 'Advance policy']
      };
    }

    // 1. SPECIFIC VILLA: GOMTI GRAND VILLA (VIL-101)
    if (/gomti grand|grand villa|gomti villa/i.test(msg)) {
      return {
        text: `🏡 **Gomti Grand Villa — Luxury Private Villa**\n\n` +
              `💰 **Rate:** **₹8,000 / night** (Direct Booking — Save 15%)\n` +
              `👥 **Capacity:** Up to 10 Guests\n` +
              `📍 **Location:** Near Lulu Mall & Shaheed Path (Central Lucknow)\n\n` +
              `✨ **Highlights & Amenities:**\n` +
              `• 100% Private Standalone Villa with private green lawn & terrace\n` +
              `• Fully equipped modern modular kitchen (Gas, Fridge, RO water, Cookware)\n` +
              `• All bedrooms 100% Split AC, High-speed optical fiber WiFi & Smart LED TV\n` +
              `• Gated private parking inside premises (2-3 cars safely)\n` +
              `• Pet-friendly (prior notice required)\n` +
              `• Ideal for family holidays, intimate celebrations & Medanta/Ekana visits.`,
        actions: [{ label: '📲 Book Gomti Grand Villa', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to book Gomti Grand Villa (₹8,000/night). Please share availability.` }],
        quickReplies: ['Book karna hai 📅', 'Advance policy?', 'Other villas dikhao']
      };
    }

    // 2. SPECIFIC VILLA: ROYAL WHITE HOUSE (VIL-102)
    if (/royal white|white house|royal villa|18 guest|badi villa|wedding villa|shaadi/i.test(msg)) {
      return {
        text: `👑 **Royal White House — Grand Luxury Estate**\n\n` +
              `💰 **Rate:** **₹12,000 / night** (Best Value for Large Groups)\n` +
              `👥 **Capacity:** Up to 18 Guests (4-5 Spacious Bedrooms)\n` +
              `📍 **Location:** Near Shaheed Path & Mahanagar connectivity\n\n` +
              `✨ **Highlights & Amenities:**\n` +
              `• Palatial white exterior with royal architecture & massive private lawn\n` +
              `• Huge living & dining hall, grand open terrace with panoramic views\n` +
              `• Full modular kitchen for self-cooking or catering service\n` +
              `• Gated parking for 4+ cars inside premises\n` +
              `• Perfect for: Wedding stays (Haldi, Mehndi, Barat stay), Family reunions, Corporate offsites.`,
        actions: [{ label: '📲 Inquire Royal White House', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to book Royal White House (₹12,000/night) for large group/event.` }],
        quickReplies: ['Gomti Grand Villa ₹8,000', 'Celebrity Garden ₹10,000', 'Book karna hai 📅']
      };
    }

    // 3. SPECIFIC VILLA: CELEBRITY GARDEN (LUL-402)
    if (/celebrity garden|celebrity|lul-402|garden villa/i.test(msg)) {
      return {
        text: `🌴 **Celebrity Garden — Sprawling Green Luxury Villa**\n\n` +
              `💰 **Rate:** **₹10,000 / night**\n` +
              `👥 **Capacity:** Up to 8–10 Guests\n` +
              `📍 **Location:** Near Lulu Mall & Medanta Hospital\n\n` +
              `✨ **Highlights:**\n` +
              `• Lush sprawling landscaped garden & private sit-out patio\n` +
              `• Super high-end luxury interiors, 100% split AC in all rooms\n` +
              `• Full modern kitchen & rapid delivery from Swiggy/Zomato/Blinkit\n` +
              `• 5 mins to Lulu Mall & 7 mins to Ekana Stadium.`,
        actions: [{ label: '📲 Book Celebrity Garden', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to book Celebrity Garden (₹10,000/night).` }],
        quickReplies: ['Book karna hai 📅', 'Lulu Mall distance?', 'Villas rates']
      };
    }

    // 4. SPECIFIC VILLA: THE PINK HOUSE (VIL-103)
    if (/pink house|pink villa|aesthetic villa/i.test(msg)) {
      return {
        text: `🌸 **The Pink House — Aesthetic Designer Villa**\n\n` +
              `💰 **Rate:** **₹9,000 / night**\n` +
              `👥 **Capacity:** Up to 10 Guests\n` +
              `📍 **Location:** Vishesh Khand, Gomti Nagar\n\n` +
              `✨ **Highlights:**\n` +
              `• Gorgeous pastel aesthetic theme with Instagram-worthy interiors\n` +
              `• Private terrace garden, full modular kitchen, high-speed WiFi\n` +
              `• Located in upscale quiet VIP colony of Gomti Nagar\n` +
              `• Pet friendly (prior approval needed).`,
        actions: [{ label: '📲 Book The Pink House', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to book The Pink House (₹9,000/night).` }],
        quickReplies: ['Book karna hai 📅', 'Check-in time?', 'Rates list']
      };
    }

    // 5. SPECIFIC PENTHOUSE: STARLIGHT BLUE PENTHOUSE (GOM-501)
    if (/starlight|penthouse|blue penthouse|rooftop|skyline/i.test(msg)) {
      return {
        text: `✨ **Starlight Blue PentHouse — Open Sky Skyline Living**\n\n` +
              `💰 **Rate:** **₹6,000 / night**\n` +
              `👥 **Capacity:** Up to 10 Guests\n` +
              `📍 **Location:** Vikalp Khand, Gomti Nagar\n\n` +
              `✨ **Highlights:**\n` +
              `• Top floor penthouse with huge private open-sky terrace\n` +
              `• Breathtaking night skyline view of Lucknow city lights\n` +
              `• Designer blue & gold luxury mood lighting\n` +
              `• 3 AC Bedrooms + Large Living Space + Full Kitchen\n` +
              `• Perfect for romantic getaways, family birthdays & relaxing evenings.`,
        actions: [{ label: '📲 Book Starlight Penthouse', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to book Starlight Blue Penthouse (₹6,000/night).` }],
        quickReplies: ['Book karna hai 📅', 'Couples allowed?', '3BHK flats dikhao']
      };
    }

    // 6. SPECIFIC BOUTIQUE FLATS: THE UNIQUE / GREEN HOUSE / YELLOW HOUSE
    if (/the unique|green house|yellow house|vil-104|vil-105|gom-302/i.test(msg)) {
      return {
        text: `🏡 **Designer Serviced Stays — Vishesh Khand, Gomti Nagar**\n\n` +
              `• **The Unique:** ₹5,500/night (Contemporary luxury styling)\n` +
              `• **The Green House:** ₹5,500/night (Lush nature-inspired interior)\n` +
              `• **The Yellow House:** ₹5,500/night (Warm vibrant sunshine aesthetic)\n\n` +
              `✨ All units feature 3 fully AC bedrooms, modular kitchen with gas stove & RO, high-speed WiFi, dedicated parking and 100% privacy.`,
        actions: [{ label: '📲 Book Vishesh Khand Flat', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I am interested in The Unique / Green / Yellow House (₹5,500).` }],
        quickReplies: ['Book karna hai 📅', '₹4,500 flats dikhao', 'Check-in rules']
      };
    }

    // 7. SPECIFIC 3BHK SERVICED FLATS (₹4,500 / NIGHT): REDROSE, BLACK BEAUTY, DARK BLUE, ETC.
    if (/redrose|black beauty|dark blue|the brown|light green|nawabi stay|velvet house|4500|3bhk/i.test(msg)) {
      return {
        text: `🏢 **Luxury 3BHK Serviced Flats (₹4,500 / night):**\n\n` +
              `1️⃣ **Black Beauty:** Ultra-luxurious Black & Gold royal theme\n` +
              `2️⃣ **RedRose Palace:** Rich crimson floral luxury interiors\n` +
              `3️⃣ **The Dark Blue:** Calming oceanic navy blue aesthetic\n` +
              `4️⃣ **The Nawabi Stay:** Classic royal Lucknowi heritage decor\n` +
              `5️⃣ **The Brown:** Warm earthen walnut wood cozy interior\n` +
              `6️⃣ **The Light Green:** Mint & sage green fresh botanical theme\n` +
              `7️⃣ **The Velvet House:** Plush velvet decor near Lulu Mall\n\n` +
              `✨ **Every flat includes:** 3 AC Bedrooms, Full Kitchen, Refrigerator, RO water, High-speed WiFi, 24/7 Security & CCTV parking. 100% Couple Friendly!`,
        actions: [{ label: '📲 Book 3BHK Flat @ ₹4,500', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to book a 3BHK luxury flat at ₹4,500/night.` }],
        quickReplies: ['Couples allowed?', 'Kitchen facility?', 'Book karna hai 📅']
      };
    }

    // 8. CHECK-IN / CHECK-OUT TIMINGS & EARLY/LATE
    if (/check in|check out|check-in|check-out|timing|time|samay|kab aana|early check|late check|luggage/i.test(msg)) {
      return {
        text: `🕐 **Standard Check-in & Check-out Timings:**\n\n` +
              `• **Check-in Time:** **12:00 PM** (Noon)\n` +
              `• **Check-out Time:** **11:00 AM** (Morning)\n\n` +
              `✨ **Early Check-in & Luggage Drop:**\n` +
              `• Agar aap subah jaldi aa rahe hain aur property pehle se free hai, to hum **complimentary early check-in (1-2 hours)** accommodate kar dete hain!\n` +
              `• Agar room occupied hai, to aap check-in se pehle apna luggage safely drop kar sakte hain.\n` +
              `• Late check-out bhi next booking ke schedule ke hisaab se flexible rehta hai.`,
        quickReplies: ['ID proof kya chahiye?', 'Advance kitna lagega?', 'Book karna hai 📅']
      };
    }

    // 9. COUPLE FRIENDLY / UNMARRIED COUPLES / SAFETY / PRIVACY
    if (/couple|unmarried|girlfriend|boyfriend|safe|privacy|ladka ladki|couples allowed/i.test(msg)) {
      return {
        text: `❤️ **100% Couple Friendly & Completely Safe!**\n\n` +
              `• **Unmarried couples are warmly welcomed** with zero moral policing or intrusive questioning.\n` +
              `• **Complete privacy guaranteed:** Private entrance, digital self/in-person check-in, zero staff interference during your stay.\n` +
              `• **Safety:** Gated secure societies, 24/7 exterior security cameras (zero cameras inside living/bedroom spaces).\n` +
              `• **Rule:** Sabhi 18+ adult guests ke paas valid original Government Photo ID (Aadhaar / Driving License / Passport / Voter ID) hona anivarya hai.`,
        quickReplies: ['ID rules?', 'Private Flats ₹4,500', 'Book karna hai 📅']
      };
    }

    // 10. ID PROOF & VERIFICATION
    if (/id proof|aadhaar|aadhar|id chahiye|document|passport|pan card|age/i.test(msg)) {
      return {
        text: `📋 **Check-in ID Guidelines:**\n\n` +
              `• Sabhi 18+ adult guests ke paas valid **Government Photo ID** hona zaroori hai:\n` +
              `  ✅ **Aadhaar Card** (Original or digital Digilocker)\n` +
              `  ✅ **Driving License**\n` +
              `  ✅ **Passport**\n` +
              `  ✅ **Voter ID Card**\n` +
              `• *(Note: Income Tax PAN Card address proof nahi hota, isliye Aadhaar/DL preferred hai).*\n` +
              `• Check-in par hamare manager verification ke baad contactless digital register me entry karte hain.`,
        quickReplies: ['Check-in time?', 'Couples allowed?', 'Rates dikhao 💰']
      };
    }

    // 11. SMOKING & ALCOHOL / DRINKING POLICY
    if (/smoke|smoking|cigarette|cigar|beedi|hookah|hukkah|drink|alcohol|wine|beer|sharab|daaru/i.test(msg)) {
      return {
        text: `🚬 **Smoking & Drinking Policy:**\n\n` +
              `• **Smoking:** Open balconies, private terraces aur outdoor garden lawns me smoking **100% allowed** hai. Rooms ke andar AC fragrance fresh rakhne ke liye indoor smoking avoid karein.\n` +
              `• **Drinking:** Legal drinking age adults ke liye private villa/flat ke andar responsible alcohol consumption **100% allowed** hai.\n` +
              `• Kripya dhyan rakhein ki kisi bhi tarah ka public nuisance ya loud disturbance na ho.`,
        quickReplies: ['Parties allowed?', 'Villas rates', 'Book karna hai 📅']
      };
    }

    // 12. FOOD, COOKING & KITCHEN FACILITIES
    if (/kitchen|cook|khana|food|gas|stove|swiggy|zomato|blinkit|zepto|fridge|refrigerator|bartan|utensil|ro water/i.test(msg)) {
      return {
        text: `🍳 **Kitchen & Food Facilities:**\n\n` +
              `• **Full Modular Kitchen in Every Unit:** Gas stove, Refrigerator, RO Water Filter, Microwave, cookware, frying pans, plates, spoons & tea set.\n` +
              `• **Self Cooking:** Aap apna khana, chai, breakfast khud bina kisi extra charge ke bana sakte hain.\n` +
              `• **Instant Grocery & Food Delivery:** **Swiggy, Zomato, Blinkit, Zepto, Instamart** sabhi properties par 10–15 minutes me deliver karte hain.\n` +
              `• Dastarkhwan, Tunday Kababi, Royal Cafe, Bikanervala jaise top restaurants paas me hi hain.`,
        quickReplies: ['WiFi speed?', 'Rates list', 'Book karna hai 📅']
      };
    }

    // 13. PARTIES, EVENTS, WEDDINGS & CELEBRATIONS
    if (/party|celebrat|birthday|anniversary|gathering|event|dj|music|loud|function|shaadi|wedding|haldi|mehndi/i.test(msg)) {
      return {
        text: `🎉 **Parties, Events & Wedding Stays:**\n\n` +
              `• **Permitted Venues:** Small family gatherings, birthdays, anniversaries, Haldi & Mehndi events hamari private villas me allow hain:\n` +
              `  👑 **Royal White House (₹12,000)** — Up to 18 Guests, massive lawn & terrace\n` +
              `  🏡 **Gomti Grand Villa (₹8,000)** — Up to 10 Guests, private garden lawn\n` +
              `  🌴 **Celebrity Garden (₹10,000)** — Up to 10 Guests, expansive lawn\n\n` +
              `• **Music Rules:** Indoor music/bluetooth speakers anytime. Raat **10:00 PM** ke baad outdoor high-bass DJ strictly prohibited hai taaki colony norms follow hon.\n` +
              `• Event setup ya catering coordination ke liye booking ke samay inform karein.`,
        actions: [{ label: '📲 Coordinate Event on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to plan an event/wedding stay at Unique Haven Homes.` }],
        quickReplies: ['Royal White House', 'Gomti Grand Villa', 'Direct Call Host']
      };
    }

    // 14. WIFI, AC, WORK FROM HOME & POWER BACKUP
    if (/wifi|internet|speed|wfh|work|ac|air condition|power backup|generator|inverter|tv|smart tv/i.test(msg)) {
      return {
        text: `📶 **Amenities & Comfort Standards:**\n\n` +
              `• **100+ Mbps Fiber WiFi:** Unlimited optical fiber internet (seamless for WFH, Zoom conferences, 4K streaming).\n` +
              `• **100% Air Conditioned:** Sabhi bedrooms aur living halls fully split-AC equipped hain.\n` +
              `• **Uninterrupted Power Backup:** Inverter / generator backup taaki lights, fans aur WiFi bina rukaawat chalein.\n` +
              `• **Smart 43"–55" LED TVs:** Netflix, Prime Video, YouTube ready.`,
        quickReplies: ['Kitchen facility?', 'Rates list', 'Book now 📅']
      };
    }

    // 15. PARKING & VEHICLE SAFETY
    if (/parking|car|vehicle|gaadi|bike|safe parking/i.test(msg)) {
      return {
        text: `🅿️ **Parking & Vehicle Safety:**\n\n` +
              `• **100% Free & Secure Parking!**\n` +
              `• **Villas me:** Dedicated private parking inside closed boundary gate (2-4 cars safely).\n` +
              `• **Flats me:** Dedicated building parking with 24/7 CCTV surveillance and security guards.\n` +
              `• Sedans, Fortuner/Scorpio/SUVs aur two-wheelers aaram se park ho sakti hain.`,
        quickReplies: ['Check-in timing?', 'Gomti Grand Villa', 'Book karna hai 📅']
      };
    }

    // 16. PET POLICY
    if (/pet|dog|cat|kutta|billi|animals/i.test(msg)) {
      return {
        text: `🐾 **Pet-Friendly Policy:**\n\n` +
              `• Hamari select private villas (**Gomti Grand Villa**, **The Pink House**) me trained pets **allowed** hain!\n` +
              `• Booking se pehle inform karna anivarya hai taaki garden aur cleaning arrangement ho sake.\n` +
              `• Society flats/apartments me building norms ki wajah se pets restricted hain.`,
        quickReplies: ['Gomti Grand Villa ₹8,000', 'Host se WhatsApp karein', 'Check-in time']
      };
    }

    // 17. EXTRA BED, MATTRESS & CHILDREN
    if (/extra bed|extra mattress|mattress|gadda|blanket|bed|bache|child|kids|baby/i.test(msg)) {
      return {
        text: `🛏️ **Extra Bedding & Children Policy:**\n\n` +
              `• **Extra Mattresses:** Comfortable premium floor mattresses with fresh bedsheets, pillows, and clean blankets available on request for extra guests.\n` +
              `• **Kids Policy:** 6 saal se chhote bachon ke liye stay **100% Free** hai!\n` +
              `• Extra guest charge flat bookings me nominal rehta hai.`,
        quickReplies: ['Rates list dikhao', 'Gomti Grand Villa', 'Book karna hai 📅']
      };
    }

    // 18. CLEANING, HOUSEKEEPING & HYGIENE
    if (/clean|cleaning|housekeeping|maid|safai|towel|soap|shampoo|geyser|hot water/i.test(msg)) {
      return {
        text: `🧼 **5-Star Hygiene & Housekeeping:**\n\n` +
              `• **Fresh Linens:** Every check-in par 100% sanitized, fresh washed bedsheets, pillow covers, and fresh towels provide kiye jaate hain.\n` +
              `• **Daily Housekeeping:** Long stays ke liye daily trash removal & cleaning available on request between 11:00 AM – 2:00 PM.\n` +
              `• **Toiletries:** Branded handwash, soaps, geyser hot water in all bathrooms.\n` +
              `• Hum Airbnb Superhost standards strictly follow karte hain.`,
        quickReplies: ['Couples allowed?', 'Kitchen facility?', 'Rates list']
      };
    }

    // 19. GST INVOICE & CORPORATE TRAVEL
    if (/gst|invoice|bill|tax invoice|company|corporate|reimbursement|receipt/i.test(msg)) {
      return {
        text: `📄 **Official GST Tax Invoice:**\n\n` +
              `• Hum **The Unique Haven Homes Pvt Ltd** ke official registered GSTIN ke saath GST Tax Invoice provide karte hain.\n` +
              `• Corporate expense claims, IT reimbursement aur business travel ke liye 100% compliant bill WhatsApp / Email par check-out ke time generate ho jata hai.\n` +
              `• Booking karte samay bas aapka Company Name aur GST number share karein.`,
        quickReplies: ['Advance payment method', '3BHK Flat ₹4,500', 'Book karna hai 📅']
      };
    }

    // 20. SECURITY DEPOSIT / CAUTION MONEY
    if (/deposit|security deposit|caution money|security amount/i.test(msg)) {
      return {
        text: `🛡️ **Zero Security Deposit Policy:**\n\n` +
              `• Direct bookings par hum **Zero / No Security Deposit** charge karte hain!\n` +
              `• Sirf standard booking advance token pay karke dates confirm ki jaati hain.\n` +
              `• Balance payment property check-in ke time pay karna hota hai.`,
        quickReplies: ['Advance payment process', 'Rates list', 'Book now 📅']
      };
    }

    // 21. ADVANCE PAYMENT, TOKEN & HOW TO BOOK
    if (/advance|token|booking process|kaise book|payment method|upi|qr|card|cash|refund|cancellation|cancel/i.test(msg)) {
      return {
        text: `💳 **Booking & Payment Process:**\n\n` +
              `1️⃣ **Dates Block:** Dates lock karne ke liye ek chhota advance token (typically 30% to 50%) pay karna hota hai.\n` +
              `2️⃣ **Payment Modes:** UPI (PhonePe, Google Pay, Paytm), Bank Transfer (IMPS/NEFT), ya official QR code.\n` +
              `3️⃣ **Instant Confirmation:** Advance confirm hote hi official Booking Voucher, Check-in details aur Caretaker Location Pin WhatsApp par instant bhej di jaati hai.\n` +
              `4️⃣ **Balance Amount:** Baaki bacha payment aap check-in ke samay property pahunch kar pay kar sakte hain.\n` +
              `5️⃣ **Cancellation:** Check-in se 48 hours pehle tak full reschedule / flexible cancellation policy available hai.`,
        actions: [{ label: '📲 Pay Advance & Block Dates', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to pay advance token and confirm my booking.` }],
        quickReplies: ['Mera naam...', 'Host se baat karein', 'Rates dikhao 💰']
      };
    }

    // 22. DIRECT BOOKING VS AIRBNB / WHY BOOK DIRECT
    if (/airbnb|booking.com|makemytrip|goibibo|direct booking|fayda|why direct|commission/i.test(msg)) {
      return {
        text: `💎 **Direct Booking Ka Fayda (Save 15%):**\n\n` +
              `• **15% Flat Savings:** Airbnb aur OTAs 14%–18% guest service fee add karte hain. Direct booking me zero platform fee hoti hai!\n` +
              `• **Verified Superhost Stays:** Same luxury properties, same 4.9★ hospitality standards.\n` +
              `• **Flexible Timings:** Early check-in & late checkout me maximum flexibility.\n` +
              `• **Personal Host Contact:** Direct co-founder & host Mr. Shahanshah (+91 94500 55554) se round-the-clock support.`,
        actions: [{ label: '📲 Book Direct & Save 15%', url: `https://wa.me/${ADMIN_WA}?text=Namaste Shahanshah ji! I want to book direct to save platform fees.` }],
        quickReplies: ['Rates list dikhao 💰', 'Gomti Grand Villa ₹8,000', 'Book now 📅']
      };
    }

    // 23. DISCOUNTS & LONG STAY OFFERS
    if (/discount|offer|sasta|kam karo|bargain|weekly|monthly|long stay|corporate/i.test(msg)) {
      return {
        text: `🎁 **Discounts & Extended Stay Offers:**\n\n` +
              `• **Weekly Stay (7+ nights):** Flat **10% to 15% Discount**\n` +
              `• **Monthly Stay (30+ nights):** Up to **25% Super Saver Discount**\n` +
              `• **Medanta Medical Stays:** Special subsidized packages for patient families.\n` +
              `• **Direct Booking Bonus:** 15% less than Airbnb rates.\n\n` +
              `Best custom quote ke liye seedha host Mr. Shahanshah ji se baat karein!`,
        actions: [{ label: '📲 Claim Best Discount on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=Hi Shahanshah ji! I need a special discount for stay at Unique Haven Homes.` }],
        quickReplies: ['Book karna hai 📅', 'Flats ke rates', 'Villas ke rates']
      };
    }

    // 24. LOCATIONS, LANDMARKS & DISTANCES (LULU, EKANA, MEDANTA, AIRPORT)
    if (/location|address|kahan|where|distance|door|airport|station|charbagh|lulu|ekana|medanta|palassio|summit/i.test(msg)) {
      return {
        text: `📍 **Unique Haven Homes Locations in Lucknow:**\n\n` +
              `1️⃣ **Near Lulu Mall & Shaheed Path (Villas & Luxury Stays):**\n` +
              `   • 5 mins to Lulu Mall & Phoenix Palassio\n` +
              `   • 7 mins to Ekana International Cricket Stadium\n` +
              `   • 5 mins to Medanta Hospital\n` +
              `   • Properties: Gomti Grand Villa, Celebrity Garden, The Velvet House\n\n` +
              `2️⃣ **Gomti Nagar Prime (Vikalp & Vishesh Khand):**\n` +
              `   • 5 mins to Summit Building, Wave Mall, Husariya, Cinepolis\n` +
              `   • Near Gomti Nagar Railway Station\n` +
              `   • Properties: Starlight Blue Penthouse, Black Beauty, RedRose Palace, The Dark Blue, The Pink House, The Unique\n\n` +
              `🚗 **City Connectivity:**\n` +
              `• **CCS Airport (Amausi):** 20–25 mins via Shaheed Path elevated expressway\n` +
              `• **Charbagh Railway Station:** 20–25 mins`,
        quickReplies: ['Lulu Mall ke paas 📍', 'Gomti Nagar Flats 🏢', 'Book karna hai 📅']
      };
    }

    // 25. HOSTS, FOUNDERS & CONTACT DETAILS
    if (/host|owner|firoz|shahanshah|praveen|contact|phone|number|call|baat karni/i.test(msg)) {
      return {
        text: `📞 **Unique Haven Homes — Founder & Host Contacts:**\n\n` +
              `• 👑 **Mr. Shahanshah (Co-Founder & Host):**\n` +
              `  📱 **+91 94500 55554** (Direct Calls & WhatsApp)\n\n` +
              `• ⭐ **Mr. Firoz Khan (Superhost & Co-Founder):**\n` +
              `  📱 **+91 82996 00709**\n\n` +
              `• 🛡️ **Praveen Singh (Operations & Support):**\n` +
              `  📱 **+91 91941 09911**\n\n` +
              `🏢 **Company:** THE UNIQUE HAVEN HOMES PRIVATE LIMITED\n` +
              `📍 **Office:** Radhikapuri, Indira Nagar, Lucknow`,
        actions: [{ label: '📲 Call / WhatsApp Shahanshah (+91 94500 55554)', url: `https://wa.me/${ADMIN_WA}?text=Namaste Shahanshah ji! I want to inquire about Unique Haven Homes booking.` }],
        quickReplies: ['Rates list dikhao 💰', 'Gomti Grand Villa ₹8,000', 'Book now 📅']
      };
    }

    // 26. PHOTOS, VIDEOS & WALKTHROUGHS
    if (/photo|photos|video|tasveer|image|pic|pics|dekhna/i.test(msg)) {
      return {
        text: `📸 **Property Photos & Walkthrough Videos:**\n\n` +
              `• Aap website par sabhi **17 properties ki HD photo galleries** explore kar sakte hain.\n` +
              `• Agar aapko kisi specific property ka detailed video tour ya bathroom/kitchen photos chahiye, to WhatsApp par hum instant album bhej denge!`,
        actions: [{ label: '📲 Get HD Photos on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=Namaste! Please share HD photos and video tour of available properties.` }],
        quickReplies: ['Gomti Grand Villa photos', '3BHK Flat photos', 'Rates list']
      };
    }

    // 27. RATES & COMPLETE PRICING LIST
    if (/rate|price|cost|kitna|charge|per night|rent|pricing|list/i.test(msg)) {
      return {
        text: `💰 **Official Property Rates (Verified Direct Rates):**\n\n` +
              `🏡 **Grand Private Standalone Villas:**\n` +
              `• **Royal White House:** ₹12,000 / night (Up to 18 Guests, Royal Estate)\n` +
              `• **Celebrity Garden:** ₹10,000 / night (Up to 8–10 Guests, Sprawling Lawn)\n` +
              `• **The Pink House:** ₹9,000 / night (Up to 10 Guests, Aesthetic Luxury)\n` +
              `• **Gomti Grand Villa:** ₹8,000 / night (Up to 10 Guests, Private Lawn)\n\n` +
              `🏙️ **Penthouse & Boutique Stays:**\n` +
              `• **Starlight Blue PentHouse:** ₹6,000 / night (Private Open-Sky Terrace)\n` +
              `• **The Unique / Green House / Yellow House:** ₹5,500 / night\n\n` +
              `🏢 **Luxury 3BHK Serviced Flats (₹4,500 / night):**\n` +
              `• Black Beauty • RedRose Palace • The Dark Blue • The Brown • The Light Green • The Nawabi Stay • The Velvet House\n\n` +
              `✨ *All prices include full kitchen, AC in all rooms, high-speed WiFi & parking.*`,
        quickReplies: ['Gomti Grand Villa ₹8,000', '3BHK Flat ₹4,500', 'Book karna hai 📅']
      };
    }

    // 28. GUEST CAPACITY / NUMBER OF PEOPLE
    const guestMatch = msg.match(/(\d+)\s*(log|person|guest|people|adult|member|aadmi)/i) || msg.match(/(2|3|4|5|6|7|8|9|10|12|15|18)\s*(?:log|people)?/);
    if (guestMatch) {
      const count = parseInt(guestMatch[1], 10);
      _leadData.interest = `${count} guests`;
      if (count > 8) {
        return {
          text: `👥 **${count} Logon ke liye Best Luxury Villas:**\n\n` +
                `1️⃣ **Royal White House** — ₹12,000/night (Up to 18 Guests, Royal Estate with huge lawn)\n` +
                `2️⃣ **Celebrity Garden** — ₹10,000/night (Huge Garden & Lawn near Lulu Mall)\n` +
                `3️⃣ **Gomti Grand Villa** — ₹8,000/night (Private Villa with Lawn)\n` +
                `4️⃣ **The Pink House** — ₹9,000/night (Aesthetic 10-Guest Villa)\n\n` +
                `Konsi villa aapki family/group ke liye check karein?`,
          quickReplies: ['Gomti Grand Villa ₹8,000', 'Royal White House ₹12,000', 'Book karna hai 📅']
        };
      } else {
        return {
          text: `👥 **${count} Logon ke liye Perfect Options:**\n\n` +
                `• **Luxury 3BHK Flats:** ₹4,500/night (Black Beauty, RedRose, Dark Blue) — 3 AC Bedrooms, Full Kitchen, Living Room.\n` +
                `• **Private Villa:** **Gomti Grand Villa (₹8,000/night)** — standalone luxury property.\n` +
                `• **Penthouse:** **Starlight Blue (₹6,000/night)** — romantic skyline terrace.\n\n` +
                `Aapki dates kab ki hain?`,
          quickReplies: ['₹4,500 wale flats', 'Gomti Grand Villa', 'Direct WhatsApp']
        };
      }
    }

    // 29. WEBSITE & SOFTWARE / HOW THE PLATFORM WORKS
    if (/software|crm|system|website|platform|tech|sync|app/i.test(msg)) {
      return {
        text: `💻 **Unique Haven Homes Platform & Software:**\n\n` +
              `• **Direct Booking Engine:** Hum live rates aur instant booking enable karte hain without 3rd-party commission.\n` +
              `• **Real-Time Database:** Property availability aur dynamic rates Supabase database se direct connected hain.\n` +
              `• **Instant WhatsApp Dispatch:** Booking confirm hote hi guest ko WhatsApp invoice, gate pass aur caretaker location pin auto-deliver hota hai.\n` +
              `• **Digital Guest Register:** Aadhaar/ID verification contactless digital portal ke zariye hoti hai.`,
        quickReplies: ['Rates list dikhao 💰', 'Gomti Grand Villa', 'Book now 📅']
      };
    }

    // 30A. RICH BOOKING REQUEST (Dates, Property, or Guests specified by user)
    if (parsed.isBookingIntent && (parsed.property || parsed.dates || parsed.guests)) {
      if (parsed.property) _leadData.property = parsed.property;
      if (parsed.dates) _leadData.dates = parsed.dates;
      if (parsed.guests) _leadData.guests = parsed.guests;
      _step = 'booking_flow';

      const propLabel = _leadData.property || parsed.property || 'Luxury Homestay / Villa';
      const rateLabel = parsed.rate ? ` (${parsed.rate})` : '';
      const datesLabel = _leadData.dates || parsed.dates || 'Aapki dates';
      const guestsLabel = _leadData.guests || parsed.guests || 'Aapke guests';

      const waText = encodeURIComponent(`Namaste Shahanshah ji! I want to book ${propLabel} for ${datesLabel} (${guestsLabel}). Please confirm availability & advance token details.`);

      return {
        text: `✨ **Booking Request Note Kar Li Hai!**\n\n` +
              `• 🏡 **Stay:** **${propLabel}**${rateLabel}\n` +
              `• 🗓️ **Dates:** **${datesLabel}**\n` +
              `• 👥 **Guests:** **${guestsLabel}**\n\n` +
              `💎 **Direct Booking Benefits:**\n` +
              `✅ Airbnb ke mukable **15% Flat Discount** (Zero platform commission)\n` +
              `✅ 100% Private, Split AC, Full Modular Kitchen, 100+ Mbps WiFi & Gated Parking\n` +
              `✅ 100% Couple Friendly (Unmarried couples welcome with valid Govt ID)\n\n` +
              `🔒 Booking confirm karne ke liye bas **30% advance token** lagta hai.\n` +
              `Kripya apna **10-digit WhatsApp number** type karein ya direct WhatsApp par voucher lock karein:`,
        actions: [{ label: '📲 WhatsApp Pe Voucher Lock Karein', url: `https://wa.me/${ADMIN_WA}?text=${waText}` }],
        quickReplies: ['💳 Advance payment rule', '📍 Location pin bhejo', 'Check-in timing', 'Host se call pe baat']
      };
    }

    // 30B. INTERACTIVE BOOKING GUIDE (User asks how to book or clicks 'Book karna hai')
    if (/book|booking|reserve|how to book|kaise book|stay karna|chahiye/i.test(msg)) {
      _step = 'booking_flow';
      return {
        text: `📅 **Booking Concierge — Unique Haven Homes**\n\n` +
              `Hum 3 simple steps me direct booking confirm karte hain:\n` +
              `1️⃣ **Property choose karein** (Grand Villa, Penthouse ya 3BHK Flat)\n` +
              `2️⃣ **Dates & Guests confirm karein**\n` +
              `3️⃣ **30% advance token** se instant WhatsApp booking voucher & gate pass receive karein!\n\n` +
              `👉 **Neeche diye options me se select karein**, ya\n` +
              `👉 **Seedha type karein** (Jaise: *"10 Oct ko 4 log Gomti Grand Villa"*):`,
        actions: [{ label: '📲 Direct WhatsApp Host (Mr. Shahanshah)', url: `https://wa.me/${ADMIN_WA}?text=Namaste Shahanshah ji! I want to book a stay at Unique Haven Homes. Please share available options.` }],
        quickReplies: [
          '🏡 Gomti Grand Villa (₹8k)',
          '👑 Royal White House (₹12k)',
          '🏢 3BHK Flat (₹4.5k)',
          '✨ Starlight Penthouse (₹6k)',
          '💳 Advance kitna lagega?',
          'Couple friendly hai? ❤️'
        ]
      };
    }

    // 30C. ADVANCE TOKEN & PAYMENT METHODS
    if (parsed.isAdvanceQuery || /advance|token|payment|upi|qr|card|cash|kitna dena/i.test(msg)) {
      return {
        text: `💳 **Booking Advance & Payment Policy:**\n\n` +
              `• **Advance Token:** Booking lock karne ke liye sirf **30% se 50% token amount** lagta hai.\n` +
              `• **Payment Modes:** UPI (PhonePe, Google Pay, Paytm), Bank Transfer (IMPS/NEFT) ya Cash.\n` +
              `• **Instant Voucher:** Advance transfer hote hi digital booking receipt, check-in instructions aur caretaker pin WhatsApp par aa jata hai.\n` +
              `• **Balance Payment:** Baaki bacha payment aap property check-in ke time de sakte hain.\n` +
              `• **Zero Security Deposit:** Hum koi security deposit nahi lete!`,
        actions: [{ label: '📲 Pay Advance & Lock Dates', url: `https://wa.me/${ADMIN_WA}?text=Namaste Shahanshah ji! I want to pay advance token and confirm my booking.` }],
        quickReplies: ['Book karna hai 📅', 'Cancellation refund policy?', 'Gomti Grand Villa ₹8k']
      };
    }

    // 30D. CANCELLATION & RESCHEDULING
    if (parsed.isCancelQuery || /refund|cancel|reschedule|plan change/i.test(msg)) {
      return {
        text: `🔄 **Cancellation & Rescheduling Policy:**\n\n` +
              `• **100% Free Rescheduling:** Agar aapka plan change hota hai aur aap check-in se **48 hours pehle** inform karte hain, to bina kisi deduction ke aapki dates aage badha di jaati hain!\n` +
              `• **Safe Token Guarantee:** Aapka advance amount future stay me 100% adjust hota hai.\n` +
              `• **Zero Hidden Charges:** Full transparency aur guest-first hospitality policy.`,
        actions: [{ label: '📲 Chat with Host on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=Namaste Shahanshah ji! I have a question regarding cancellation/rescheduling.` }],
        quickReplies: ['Advance payment rule', 'Check-in timing', 'Book karna hai 📅']
      };
    }

    // 30E. AVAILABILITY CHECK
    if (parsed.isAvailQuery || /available|free hai|khali hai|availability/i.test(msg)) {
      return {
        text: `🗓️ **Live Availability & Slot Check:**\n\n` +
              `• Hamaare sabhi 17 homestays ka calendar real-time Supabase database se synced rehta hai.\n` +
              `• Aap apni **Dates (Jaise: 15 to 17 Oct)** aur **Property Name** yahan type karein, hum turant bata denge!\n` +
              `• Ya aap seedha WhatsApp par instant calendar slot check karwa sakte hain:`,
        actions: [{ label: '📲 Check Live Slots on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=Namaste! Please check availability for my dates.` }],
        quickReplies: ['Gomti Grand Villa ₹8k', '3BHK Flat ₹4.5k', 'Advance policy']
      };
    }

    // 31. SAFE NAME COLLECTION (Only when actually typing a human name)
    if (_step === 'ask_name' && /^[a-zA-Z\s]{3,20}$/.test(raw) && !/villa|flat|book|rate|house|price|room|help|hi|hello|check|food|wifi/i.test(raw)) {
      _leadData.name = raw;
      _step = 'ask_phone';
      return {
        text: `Bahut achha ${_leadData.name} ji! 🙏\n\nBas aapka **10-digit WhatsApp Number** dijiye taaki hamaare manager aapko photos, live location pin aur booking voucher bhej sakein:`,
        quickReplies: ['Seedha WhatsApp karo', 'Gomti Grand Villa ₹8k', '3BHK Flat ₹4.5k']
      };
    }

    // 32. GREETINGS
    if (/^(hi|hello|hii|hey|helo|namaste|namaskar|pranam|good morning|good evening|kya haal)\b/i.test(msg) || raw.length < 3) {
      return {
        text: `Namaste! 🙏 Main **Nisha** hoon, **Unique Haven Homes, Lucknow** ki verified AI concierge.\n\n` +
              `Main aapki turant sahayata kar sakti hoon:\n` +
              `• 🏡 **Gomti Grand Villa (₹8,000)** & Royal White House (₹12,000)\n` +
              `• 🏢 **3BHK Luxury Flats (₹4,500/night)** in Gomti Nagar\n` +
              `• 🕐 **Check-in / Check-out & Rules (100% Couple Friendly)**\n` +
              `• 📍 **Locations (Gomti Nagar, Lulu Mall, Ekana, Medanta)**\n\n` +
              `Aap kis baare me jaanna chahte hain?`,
        quickReplies: ['Rates & Prices 💰', 'Gomti Grand Villa 🏡', 'Couples allowed? ❤️', 'Book karna hai 📅']
      };
    }

    // 33. INTELLIGENT DEFAULT
    return {
      text: `Ji bilkul! Unique Haven Homes me hum luxury stays, 100% privacy aur verified 4.9★ hospitality provide karte hain.\n\n` +
            `Aap mujhse pooch sakte hain:\n` +
            `• **Property Rates & Availability** (Gomti Grand Villa ₹8,000, 3BHK Flats ₹4,500)\n` +
            `• **Check-in (12 PM) / Check-out (11 AM)**\n` +
            `• **Kitchen, WiFi, Parking, Food & Couples Safety Policy**\n\n` +
            `Ya aap seedha host se WhatsApp par baat kar sakte hain:`,
      actions: [{ label: '📲 Chat with Host on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I have a question about Unique Haven Homes.` }],
      quickReplies: ['Gomti Grand Villa ₹8,000', 'Rates list dikhao 💰', 'Couple friendly? ❤️', 'Book now 📅']
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
  window.UHH_ChatWidget = window.UHH_Chat;

})();
