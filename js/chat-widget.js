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

  // ── SMART KNOWLEDGE ENGINE (COMPREHENSIVE TRAINING) ──────────────
  async function getReply(userMsg) {
    const raw = userMsg.trim();
    const msg = raw.toLowerCase();
    const rates = await getRates();

    // 0. DETECT PHONE NUMBER ANYWHERE (Direct Lead Capture)
    const phoneMatch = raw.match(/(\+?\d{1,4}[-.\s]?)?(\d{10})/);
    if (phoneMatch && (_step === 'ask_phone' || _step === 'ask_name' || /phone|number|whatsapp|call|contact/i.test(msg) || raw.length <= 15)) {
      const phoneClean = phoneMatch[2];
      const guestName = _leadData.name || 'Valued Guest';
      _leadData.phone = phoneClean;
      _step = 'done';
      await saveLead(guestName, phoneClean, _leadData.interest || 'Chat booking enquiry');
      
      const waMsg = encodeURIComponent(`Namaste Praveen ji! I'm ${guestName} (${phoneClean}). I want to book a stay at Unique Haven Homes. Please share details.`);
      return {
        text: `✅ **Bahut shukriya ${guestName} ji!** 🙏\n\nHamaare host **Praveen Singh** aapko WhatsApp number **${phoneClean}** par abhi contact kar rahe hain.\n\nAap chahein to seedha WhatsApp par bhi baat kar sakte hain:`,
        actions: [{ label: '📲 Message Praveen on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=${waMsg}` }],
        quickReplies: ['Check-in time?', 'Location details', 'Aur options dikhao']
      };
    }

    // 1. SPECIFIC: GOMTI GRAND VILLA
    if (/gomti grand|grand villa|gomti villa/i.test(msg)) {
      return {
        text: `🏡 **Gomti Grand Villa — Luxury Private Villa**\n\n` +
              `💰 **Rate:** **₹8,000 / night**\n` +
              `👥 **Capacity:** Up to 10 Guests\n` +
              `📍 **Location:** Near Lulu Mall & Shaheed Path (Central Lucknow)\n\n` +
              `✨ **Special Features:**\n` +
              `• 100% Private Standalone Villa with private lawn & terrace\n` +
              `• Fully equipped modern modular kitchen & dining hall\n` +
              `• 100% AC bedrooms, high-speed WiFi, smart LED TVs\n` +
              `• Safe private gated car parking inside the villa premises\n` +
              `• Ideal for family vacations, intimate get-togethers & peaceful stays.\n\n` +
              `Kya aap iski availability check karna chahte hain?`,
        actions: [{ label: '📲 Book Gomti Grand Villa', url: `https://wa.me/${ADMIN_WA}?text=Hi! I want to book Gomti Grand Villa (₹8,000/night). Please check availability.` }],
        quickReplies: ['Book karna hai 📅', 'Advance policy?', 'Other villas dikhao']
      };
    }

    // 2. CHECK-IN / CHECK-OUT TIMINGS
    if (/check in|check out|check-in|check-out|timing|time|samay|kab aana|early check|late check/i.test(msg)) {
      return {
        text: `🕐 **Standard Timings:**\n\n` +
              `• **Check-in:** **12:00 PM** (Noon)\n` +
              `• **Check-out:** **11:00 AM** (Morning)\n\n` +
              `✨ **Early Check-in / Late Check-out Policy:**\n` +
              `Subject to availability! Agar pehle se koi booking nahi hai to hum guest convenience ke mutabiq 1–2 ghante adjust kar dete hain. Advance me inform karna zaroori hai.`,
        quickReplies: ['ID proof kya chahiye?', 'Advance kitna lagega?', 'Book karna hai']
      };
    }

    // 3. COUPLE FRIENDLY / UNMARRIED COUPLES / SAFETY
    if (/couple|unmarried|girlfriend|boyfriend|safe|privacy|ladka ladki|couples allowed/i.test(msg)) {
      return {
        text: `❤️ **100% Couple Friendly & Safe!**\n\n` +
              `• Unmarried couples bilkul welcome hain.\n` +
              `• **Complete privacy and zero disturbance** guaranteed.\n` +
              `• No intrusive questioning at check-in.\n` +
              `• Sabhi adult guests (18+) ke paas original Govt Photo ID (Aadhaar / Driving License / Voter ID / Passport) hona zaroori hai.`,
        quickReplies: ['ID rules?', 'Private Flats dikhao', 'Book karna hai']
      };
    }

    // 4. ID PROOF & DOCUMENTATION
    if (/id proof|aadhaar|aadhar|id chahiye|document|passport|pan card|age/i.test(msg)) {
      return {
        text: `📋 **Check-in ID Guidelines:**\n\n` +
              `• Sabhi 18+ adult guests ke paas valid **Government Photo ID** hona anivarya hai:\n` +
              `  ✅ **Aadhaar Card**\n` +
              `  ✅ **Driving License**\n` +
              `  ✅ **Passport**\n` +
              `  ✅ **Voter ID Card**\n` +
              `• *(Note: Income Tax PAN Card address proof ke roop me maanya nahi hota).*\n` +
              `• Check-in par hamare manager verification ke baad contactless digital register me entry karte hain.`,
        quickReplies: ['Check-in time?', 'Couples allowed?', 'Rates dikhao']
      };
    }

    // 5. PARTY / GATHERING / BIRTHDAY / CELEBRATION / MUSIC
    if (/party|celebrat|birthday|anniversary|gathering|get together|dj|music|loud|function/i.test(msg)) {
      return {
        text: `🎉 **Parties & Celebrations Policy:**\n\n` +
              `• **Villas me Allowed:** Small family gatherings, birthdays aur peaceful celebrations hamari private villas jaise **Gomti Grand Villa (₹8,000)**, **Celebrity Garden (₹10,000)** aur **Royal White House (₹12,000)** me allow hain.\n` +
              `• **Music Rule:** Indoor soft music anytime. Raat **10:00 PM** ke baad outdoor loud DJ/speakers strictly restricted hain taaki residential colony ke rules follow hon.\n` +
              `• Cleanliness aur decor coordination ke liye advance notification zaroori hai.`,
        quickReplies: ['Gomti Grand Villa', 'Royal White House', 'Host se baat karein']
      };
    }

    // 6. FOOD, COOKING & KITCHEN FACILITIES
    if (/kitchen|cook|khana|food|gas|stove|swiggy|zomato|blinkit|fridge|refrigerator|bartan|utensil|ro water/i.test(msg)) {
      return {
        text: `🍳 **Kitchen & Food Facilities:**\n\n` +
              `• **Full Modular Kitchen:** Gas stove, Refrigerator, RO Water Filter, Microwave, aur complete cookware & dinner set uplabdh hai.\n` +
              `• **Self Cooking:** Aap apna khana khud bana sakte hain (chai, breakfast, meals).\n` +
              `• **Superfast Delivery:** **Swiggy, Zomato, Blinkit, Zepto, Instamart** sabhi properties par 15–20 minutes me deliver karte hain.\n` +
              `• Aas-paas famous Lucknowi restaurants (Awadhi, Mughlai, Pure Veg) bhi walking/short drive par hain.`,
        quickReplies: ['WiFi kaisa hai?', 'Rates list', 'Book karna hai']
      };
    }

    // 7. LOCATION & DISTANCE QUERIES
    if (/location|address|kahan|where|distance|door|airport|station|charbagh|lulu|ekana|medanta|palassio|summit/i.test(msg)) {
      return {
        text: `📍 **Unique Haven Homes Locations in Lucknow:**\n\n` +
              `1️⃣ **Gomti Nagar Prime (Vikalp & Vishesh Khand):**\n` +
              `   • 5 mins to Summit Building, Wave Mall, Husariya, Cinepolis\n` +
              `   • Near Gomti Nagar Railway Station\n\n` +
              `2️⃣ **Near Lulu Mall & Shaheed Path (Villas Hub):**\n` +
              `   • 5 mins to Lulu Mall & Phoenix Palassio\n` +
              `   • 7 mins to Ekana International Cricket Stadium\n` +
              `   • 5 mins to Medanta Hospital\n\n` +
              `🚗 **Connectivity:**\n` +
              `• **CCS Airport (Amausi):** 20–25 mins via Shaheed Path bypass\n` +
              `• **Charbagh Railway Station:** 20–25 mins\n\n` +
              `Aapko kis area me property chahiye?`,
        quickReplies: ['Gomti Nagar Flats', 'Lulu Mall Villas', 'Airport connectivity']
      };
    }

    // 8. PARKING & VEHICLE SAFETY
    if (/parking|car|vehicle|gaadi|bike|safe parking/i.test(msg)) {
      return {
        text: `🅿️ **Parking & Vehicle Safety:**\n\n` +
              `• **100% Free & Safe Parking** uplabdh hai!\n` +
              `• **Villas me:** Dedicated private parking inside closed gate boundary (2-3 cars aaram se park ho sakti hain).\n` +
              `• **Flats me:** Dedicated building parking with 24/7 CCTV surveillance & security guard.\n` +
              `• Sedan, SUV aur bikes sabhi safely park ho sakti hain.`,
        quickReplies: ['Check-in timing?', 'Gomti Grand Villa', 'Book karna hai']
      };
    }

    // 9. WIFI, AC & WORK FROM HOME
    if (/wifi|internet|speed|wfh|work|ac|air condition|power backup|generator|inverter/i.test(msg)) {
      return {
        text: `📶 **Amenities & Comfort:**\n\n` +
              `• **High-Speed Fiber WiFi:** 100+ Mbps unlimited optical fiber internet (ideal for Work From Home, Zoom meetings, streaming).\n` +
              `• **100% Air Conditioned:** Sabhi bedrooms aur living room fully AC hain.\n` +
              `• **Power Backup:** Inverter / generator backup taaki lights aur fans continuous chalein.\n` +
              `• **Smart TV:** Netflix, YouTube, Prime ready smart screens.`,
        quickReplies: ['Kitchen facility?', 'Rates list', 'Book now']
      };
    }

    // 10. ADVANCE PAYMENT, TOKEN & HOW TO BOOK
    if (/advance|token|booking process|kaise book|payment method|upi|qr|card|cash|refund|cancellation/i.test(msg)) {
      return {
        text: `💳 **Booking & Payment Process:**\n\n` +
              `1️⃣ **Dates Block:** Dates confirm karne ke liye ek chhota sa advance token (typically 30% to 50%) pay karna hota hai.\n` +
              `2️⃣ **Payment Modes:** UPI (PhonePe, GPay, Paytm), Bank Transfer (IMPS/NEFT), ya QR code.\n` +
              `3️⃣ **Instant Confirmation:** Advance receive hote hi official GST Tax Invoice / Booking Voucher aur caretaker ka location pin WhatsApp par turant send ho jata hai.\n` +
              `4️⃣ **Balance Amount:** Baaki bacha payment aap check-in ke time property pahunch kar pay kar sakte hain.\n\n` +
              `Book karne ke liye apna naam aur dates bataiye!`,
        actions: [{ label: '📲 Pay Advance & Block Dates', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to pay advance token and confirm my booking.` }],
        quickReplies: ['Mera naam...', 'Direct WhatsApp call', 'Rates dikhao']
      };
    }

    // 11. DISCOUNTS & LONG STAY OFFERS
    if (/discount|offer|sasta|kam karo|bargain|weekly|monthly|long stay|corporate/i.test(msg)) {
      return {
        text: `🎁 **Discounts & Extended Stay Offers:**\n\n` +
              `• **Weekly Stay (7+ nights):** Flat **10% to 15% Discount**\n` +
              `• **Monthly Stay (30+ nights):** Up to **25% Super Saver Discount**\n` +
              `• **Corporate / Medical Stay (Medanta):** Special discounted packages available.\n\n` +
              `Best discounted offer ke liye seedha host Praveen ji se baat karein!`,
        actions: [{ label: '📲 Claim Best Discount on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=Hi Praveen ji! I need a special discount for stay at Unique Haven Homes.` }],
        quickReplies: ['Book karna hai', 'Flats ke rates', 'Villas ke rates']
      };
    }

    // 12. PET FRIENDLY
    if (/pet|dog|cat|kutta|billi|animals/i.test(msg)) {
      return {
        text: `🐾 **Pet Policy:**\n\n` +
              `• Hamari select private villas (jaise **Gomti Grand Villa**, **The Pink House**) me trained pets allowed hain!\n` +
              `• Booking se pehle inform karna anivarya hai taaki proper arrangements kiye ja sakein.\n` +
              `• Apartments/flats me building norms ke karan pets restricted hain.`,
        quickReplies: ['Gomti Grand Villa', 'Host se baat karein', 'Check-in time']
      };
    }

    // 13. RATES & COMPLETE PRICING LIST
    if (/rate|price|cost|kitna|charge|per night|rent|pricing|list/i.test(msg)) {
      return {
        text: `💰 **Official Property Rates (Verified):**\n\n` +
              `🏡 **Grand Private Villas (Big Groups & Families):**\n` +
              `• **Royal White House:** ₹12,000 / night (Up to 18 Guests)\n` +
              `• **Celebrity Garden:** ₹10,000 / night (Up to 8–10 Guests)\n` +
              `• **The Pink House:** ₹9,000 / night (Up to 10 Guests)\n` +
              `• **Gomti Grand Villa:** ₹8,000 / night (Up to 10 Guests)\n\n` +
              `🏙️ **Penthouse & Boutique Stays:**\n` +
              `• **Starlight Blue PentHouse:** ₹6,000 / night (Open Sky View)\n` +
              `• **The Unique / Green House / Yellow House:** ₹5,500 / night\n\n` +
              `🏢 **Luxury 3BHK Serviced Flats (₹4,500 / night):**\n` +
              `• RedRose Palace • Black Beauty • The Dark Blue • The Brown • The Light Green • The Nawabi Stay • The Velvet House\n\n` +
              `Aap kitne logon ke liye dekh rahe hain?`,
        quickReplies: ['Gomti Grand Villa ₹8,000', '3BHK Flat ₹4,500', 'Book karna hai 📅']
      };
    }

    // 14. GUEST CAPACITY / NUMBER OF PEOPLE
    const guestMatch = msg.match(/(\d+)\s*(log|person|guest|people|adult|member|aadmi)/i) || msg.match(/(2|3|4|5|6|7|8|9|10|12|15|18)\s*(?:log|people)?/);
    if (guestMatch) {
      const count = parseInt(guestMatch[1], 10);
      _leadData.interest = `${count} guests`;
      if (count > 8) {
        return {
          text: `👥 **${count} Logon ke liye Best Luxury Villas:**\n\n` +
                `1️⃣ **Royal White House** — ₹12,000/night (Up to 18 Guests, Royal Estate)\n` +
                `2️⃣ **Celebrity Garden** — ₹10,000/night (Huge Garden & Lawn)\n` +
                `3️⃣ **Gomti Grand Villa** — ₹8,000/night (Private Villa with Lawn)\n` +
                `4️⃣ **The Pink House** — ₹9,000/night (Aesthetic 10-Guest Villa)\n\n` +
                `Konsi villa pasand aayi aapko?`,
          quickReplies: ['Gomti Grand Villa', 'Royal White House', 'Book karna hai']
        };
      } else {
        return {
          text: `👥 **${count} Logon ke liye Perfect Options:**\n\n` +
                `• **Luxury 3BHK Flats:** ₹4,500/night (The Dark Blue, RedRose Palace, Black Beauty) — 3 AC Bedrooms, Full Kitchen, Living Room.\n` +
                `• **Private Villa:** **Gomti Grand Villa (₹8,000/night)** — standalone luxury property.\n` +
                `• **Penthouse:** **Starlight Blue (₹6,000/night)** — romantic skyline terrace.\n\n` +
                `Aapki dates kab ki hain?`,
          quickReplies: ['₹4,500 wale flats', 'Gomti Grand Villa', 'Direct WhatsApp']
        };
      }
    }

    // 15. BOOKING INTENT / CONTACT HOST
    if (/book|booking|reserve|confirm|baat karni|number|call|contact|praveen/i.test(msg)) {
      _step = 'ask_name';
      return {
        text: `📅 **Booking ke liye main aapko host se turant connect kar rahi hoon!**\n\n` +
              `Kripya **Aapka Naam** aur **Aane ki Tareekh (Dates)** bata dijiye:`,
        actions: [{ label: '📲 WhatsApp Host Directly', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to book a stay at Unique Haven Homes.` }],
        quickReplies: ['Praveen Singh', 'Gomti Grand Villa book karo', 'Rates batao pehle']
      };
    }

    // 16. IF WAITING FOR NAME IN LEAD FLOW
    if (_step === 'ask_name' && raw.length > 2 && !raw.includes('?')) {
      _leadData.name = raw;
      _step = 'ask_phone';
      return {
        text: `Bahut achha ${_leadData.name} ji! 🙏\n\nBas aapka **10-digit WhatsApp Number** dijiye taaki hamaare manager aapko photos, live location pin aur booking voucher bhej sakein:`,
        quickReplies: ['Seedha WhatsApp karo', 'Gomti Grand Villa']
      };
    }

    // 17. GREETINGS
    if (/^(hi|hello|hii|hey|helo|namaste|namaskar|pranam|good morning|good evening|kya haal)\b/i.test(msg) || raw.length < 3) {
      return {
        text: `Namaste! 🙏 Main **Nisha** hoon, **Unique Haven Homes, Lucknow** ki verified AI concierge.\n\n` +
              `Main aapki turant sahayata kar sakti hoon:\n` +
              `• 🏡 **Gomti Grand Villa (₹8,000)** & Luxury Villas\n` +
              `• 🏢 **3BHK Luxury Flats (₹4,500/night)**\n` +
              `• 🕐 **Check-in / Check-out & Rules (100% Couple Friendly)**\n` +
              `• 📍 **Locations (Gomti Nagar, Lulu Mall, Ekana)**\n\n` +
              `Aap kis baare me jaanna chahte hain?`,
        quickReplies: ['Rates & Prices 💰', 'Gomti Grand Villa 🏡', 'Couples allowed? ❤️', 'Book karna hai 📅']
      };
    }

    // 18. INTELLIGENT DEFAULT
    return {
      text: `Ji bilkul! Unique Haven Homes me hum luxury living, 100% privacy aur seamless hospitality provide karte hain.\n\n` +
            `Aap humse pooch sakte hain:\n` +
            `• **Property Rates & Availability** (Gomti Grand Villa ₹8,000, 3BHK Flats ₹4,500)\n` +
            `• **Check-in (12 PM) / Check-out (11 AM)**\n` +
            `• **Kitchen, WiFi, Parking & Couples Policy**\n\n` +
            `Ya aap direct host se WhatsApp par baat kar sakte hain:`,
      actions: [{ label: '📲 Chat with Host on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I have a question about Unique Haven Homes.` }],
      quickReplies: ['Gomti Grand Villa ₹8,000', 'Rates list dikhao', 'Couple friendly?', 'Book now']
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
