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
  let _autoVoice   = true;   // Auto-speak Nisha's replies using Sarvam AI Bulbul voice
  let _currentSpeakingBtn = null;
  let _voiceTurn   = false;  // Whether current turn was started by voice mic

  // ── CRM LIVE RATES CACHE & SUPABASE CONNECTOR ────
  let _lastSupabaseSyncTs = 0;

  // ── 17 LUXURY PROPERTIES CATALOG (PHOTOS + AMENITIES + DIRECT RATES) ──
  const PROPERTIES_CATALOG = {
    'redrose-palace': {
      id: 'GOM-101',
      name: 'RedRose Palace',
      type: '3BHK Luxury Flat',
      area: 'Vikalp Khand, Gomti Nagar',
      price: 4500,
      originalPrice: 5499,
      rating: 4.90,
      reviews: 41,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1654261872286835347/original/cbc0aaab-4039-4892-ba03-f18c24a603c9.jpeg',
      link: 'redrose-palace.html',
      tagline: 'Rich crimson floral luxury interior · 5 min to Max Hospital',
      specs: ['3 AC Bedrooms', 'Modular Kitchen + RO', '200 Mbps Wi-Fi', '100% Couple Friendly'],
      match: /red\s*ro[szj]e?|redrose|लाल\s*गुलाब|gom-?101/i
    },
    'black-beauty': {
      id: 'GOM-102',
      name: 'Black Beauty',
      type: '3BHK Luxury Flat',
      area: 'Vikalp Khand, Gomti Nagar',
      price: 4500,
      originalPrice: 5499,
      rating: 4.95,
      reviews: 48,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655974057816027178/original/fcaaa310-7521-4fae-9ef7-47b2c58a631c.jpeg',
      link: 'black-beauty.html',
      tagline: 'Signature royal black & gold interior · VIP location',
      specs: ['3 AC Bedrooms', 'Modular Kitchen + Gas', 'Lift & Parking', 'Couple Friendly'],
      match: /black\s*beauty|kali\s*beauty|black\s*flat|gom-?102/i
    },
    'the-dark-blue': {
      id: 'GOM-201',
      name: 'The Dark Blue',
      type: '3BHK Luxury Flat',
      area: 'Vikalp Khand, Gomti Nagar',
      price: 4500,
      originalPrice: 5499,
      rating: 4.93,
      reviews: 46,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655969170448425308/original/c84e509a-1192-4491-891b-8dda32439a38.jpeg',
      link: 'the-dark-blue.html',
      tagline: 'Calming oceanic navy blue aesthetic · 100% privacy',
      specs: ['3 AC Bedrooms', 'Full Kitchen', 'High-Speed Wi-Fi', 'Couple Friendly'],
      match: /dark\s*blue|the\s*dark\s*blue|neela\s*flat|blue\s*flat|gom-?201/i
    },
    'the-brown': {
      id: 'GOM-202',
      name: 'The Brown',
      type: '3BHK Luxury Flat',
      area: 'Vikalp Khand, Gomti Nagar',
      price: 4500,
      originalPrice: 5499,
      rating: 4.88,
      reviews: 39,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655971485603770428/original/2cb059fb-e2ca-4c9f-ba52-dd58d84a7541.jpeg',
      link: 'the-brown.html',
      tagline: 'Warm walnut wood earthen interior · Peaceful family retreat',
      specs: ['3 AC Bedrooms', 'Modular Kitchen', 'Lift & Balcony', 'Couple Friendly'],
      match: /the\s*brown|brown\s*stay|brown\s*flat|gom-?202/i
    },
    'the-light-green': {
      id: 'GOM-301',
      name: 'The Light Green',
      type: '3BHK Luxury Flat',
      area: 'Vikalp Khand, Gomti Nagar',
      price: 4500,
      originalPrice: 5499,
      rating: 4.91,
      reviews: 42,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655972856417748455/original/4bfd8c83-fa56-4c4d-91b4-2b6fe18ef77a.jpeg',
      link: 'the-light-green.html',
      tagline: 'Mint & sage botanical fresh interior · Natural sunlight',
      specs: ['3 AC Bedrooms', 'Full Kitchen', 'Lift Access', 'Couple Friendly'],
      match: /light\s*green|the\s*light\s*green|hara\s*flat|gom-?301/i
    },
    'the-nawabi-stay': {
      id: 'GOM-401',
      name: 'The Nawabi Stay',
      type: '3BHK Luxury Flat',
      area: 'Vikalp Khand, Gomti Nagar',
      price: 4500,
      originalPrice: 5499,
      rating: 4.92,
      reviews: 37,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655975005881477758/original/e944bc30-f654-47ae-90b5-7c1ce3e08f51.jpeg',
      link: 'the-nawabi-stay.html',
      tagline: 'Classic Lucknowi royal heritage decor with contemporary luxuries',
      specs: ['3 AC Bedrooms', 'Modular Kitchen', 'Dedicated Parking', 'Couple Friendly'],
      match: /nawabi|nawabi\s*stay|nawab|gom-?401/i
    },
    'starlight-blue-penthouse': {
      id: 'GOM-501',
      name: 'Starlight Blue PentHouse',
      type: '4BHK Grand Skyline Penthouse',
      area: 'Vikalp Khand, Gomti Nagar',
      price: 6000,
      originalPrice: 7299,
      rating: 4.96,
      reviews: 53,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655976508493130141/original/918fa240-a1f9-4db5-b82b-bbd7c6778f65.jpeg',
      link: 'starlight-blue-penthouse.html',
      tagline: 'Top-floor penthouse with private open-air skyline terrace garden',
      specs: ['4 AC Bedrooms', 'Private Open Terrace', 'Skyline Night View', 'Up to 10 Guests'],
      match: /starlight|penthouse|pent\s*house|blue\s*penthouse|skyline|gom-?501/i
    },
    'gomti-grand-villa': {
      id: 'VIL-101',
      name: 'Gomti Grand Villa',
      type: 'Luxury Standalone Private Villa',
      area: 'Near Lulu Mall & Shaheed Path',
      price: 8000,
      originalPrice: 9599,
      rating: 4.97,
      reviews: 64,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655980649712759905/original/6c4e0f10-6c58-45a9-bc4c-a11fa7da1795.jpeg',
      link: 'gomti-grand-villa.html',
      tagline: '100% Standalone private villa with lush green lawn & private terrace',
      specs: ['3 AC Bedrooms', 'Private Green Lawn', 'Gated 3-Car Parking', 'Up to 10 Guests'],
      match: /gomti\s*grand|grand\s*villa|gomti\s*villa|vil-?101/i
    },
    'royal-white-house': {
      id: 'VIL-102',
      name: 'Royal White House',
      type: 'Grand Palatial Villa Estate',
      area: 'Near Shaheed Path / Mahanagar',
      price: 12000,
      originalPrice: 14499,
      rating: 4.98,
      reviews: 72,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655982882208007785/original/9fcfd2b8-7c8d-4e94-81ae-281b95cb9110.jpeg',
      link: 'royal-white-house.html',
      tagline: 'Palatial white estate for grand weddings, reunions & VIP celebrations',
      specs: ['Grand Bedrooms', 'Huge Event Lawn', 'Catering Kitchen', 'Up to 18 Guests'],
      match: /royal\s*white|white\s*house|royal\s*villa|badi\s*villa|wedding\s*villa|shaadi\s*villa|vil-?102/i
    },
    'celebrity-garden': {
      id: 'LUL-402',
      name: 'Celebrity Garden',
      type: 'Sprawling Green Luxury Villa',
      area: 'Near Lulu Mall & Medanta Hospital',
      price: 10000,
      originalPrice: 11999,
      rating: 4.94,
      reviews: 45,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655984620023775191/original/e944743e-a144-48ee-8957-1ffbce44cbdb.jpeg',
      link: 'celebrity-garden.html',
      tagline: 'Sprawling landscaped green lawn with premium luxury suites',
      specs: ['Private Garden Patio', 'Full Modular Kitchen', '5 Min to Lulu Mall', 'Up to 10 Guests'],
      match: /celebrity|celebrity\s*garden|garden\s*villa|lul-?402/i
    },
    'the-pink-house': {
      id: 'VIL-103',
      name: 'The Pink House',
      type: 'Aesthetic Designer Villa',
      area: 'Vishesh Khand, Gomti Nagar',
      price: 9000,
      originalPrice: 10999,
      rating: 4.95,
      reviews: 58,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655979101880521639/original/8e181958-fc20-4137-b498-8ec1f2ecf802.jpeg',
      link: 'the-pink-house.html',
      tagline: 'Instagram-famous pastel pink aesthetic villa with terrace garden',
      specs: ['Pastel Designer Themes', 'Pre-Wedding Friendly', 'Private Lawn', 'Up to 10 Guests'],
      match: /the\s*pink\s*house|pink\s*house|pink\s*villa|aesthetic\s*villa|vil-?103/i
    },
    'the-unique': {
      id: 'GOM-302',
      name: 'The Unique',
      type: '3BHK Contemporary Luxury Flat',
      area: 'Vishesh Khand, Gomti Nagar',
      price: 5500,
      originalPrice: 6499,
      rating: 4.92,
      reviews: 38,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655967664448560183/original/2e7ee400-f65f-4d97-8c46-95383f9fc3ba.jpeg',
      link: 'the-unique.html',
      tagline: 'Contemporary minimalism with opulent furnishings in Vishesh Khand',
      specs: ['3 AC Bedrooms', 'Modular Kitchen', 'High-Speed Wi-Fi', 'Couple Friendly'],
      match: /the\s*unique|unique\s*flat|unique\s*stay|gom-?302/i
    },
    'the-green-house': {
      id: 'VIL-104',
      name: 'The Green House',
      type: '3BHK Serviced Stays',
      area: 'Vishesh Khand, Gomti Nagar',
      price: 5500,
      originalPrice: 6599,
      rating: 4.90,
      reviews: 35,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655977934673623097/original/ecad21da-10eb-4856-afbf-eb5d15ca35df.jpeg',
      link: 'the-green-house.html',
      tagline: 'Nature-inspired luxury flat with tranquil green vibes',
      specs: ['3 AC Bedrooms', 'Full Kitchen', 'Private Balcony', 'Couple Friendly'],
      match: /the\s*green\s*house|green\s*house|vil-?104/i
    },
    'the-yellow-house': {
      id: 'VIL-105',
      name: 'The Yellow House',
      type: '3BHK Serviced Stays',
      area: 'Vishesh Khand, Gomti Nagar',
      price: 5500,
      originalPrice: 6599,
      rating: 4.89,
      reviews: 33,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655977196025287796/original/b0b57e4e-096b-4e6f-8706-e79e6f3b9c02.jpeg',
      link: 'the-yellow-house.html',
      tagline: 'Warm sunshine cheerful decor with modern amenities',
      specs: ['3 AC Bedrooms', 'Full Kitchen', 'Wi-Fi & RO', 'Couple Friendly'],
      match: /the\s*yellow\s*house|yellow\s*house|vil-?105/i
    },
    'the-velvet-house': {
      id: 'VIL-107',
      name: 'The Velvet House',
      type: '3BHK Serviced Stays',
      area: 'Near Lulu Mall & Shaheed Path',
      price: 4500,
      originalPrice: 5499,
      rating: 4.91,
      reviews: 36,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655986064047814407/original/35048b1d-7206-4fe4-aaee-4cb5069fae48.jpeg',
      link: 'the-velvet-house.html',
      tagline: 'Plush velvet textures and ultra-comfortable suites near Lulu Mall',
      specs: ['3 AC Bedrooms', 'Modular Kitchen', 'Lulu Mall 5 Mins', 'Couple Friendly'],
      match: /the\s*velvet\s*house|velvet\s*house|velvet|vil-?107/i
    },
    'green-forest-view': {
      id: 'VIL-106',
      name: 'Green Forest View',
      type: '3BHK Serviced Flat',
      area: 'Near Mahanagar',
      price: 4500,
      originalPrice: 5499,
      rating: 4.88,
      reviews: 29,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655987309104085461/original/91a27e7f-44e2-4113-92f7-dc41b4cfb5c0.jpeg',
      link: 'green-forest-view.html',
      tagline: 'Serene botanical balcony views in calm residential sanctuary',
      specs: ['3 AC Bedrooms', 'Scenic Balcony', 'High-Speed Wi-Fi', 'Couple Friendly'],
      match: /green\s*forest|forest\s*view|vil-?106/i
    },
    'pink-paradise-villa': {
      id: 'VIL-108',
      name: 'Pink Paradise Villa',
      type: 'Luxury Villa',
      area: 'Near Shaheed Path',
      price: 4500,
      originalPrice: 5499,
      rating: 4.92,
      reviews: 31,
      cover: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1655988674966779430/original/5e3ee077-d035-46f9-b883-7d848695f7c3.jpeg',
      link: 'pink-paradise-villa.html',
      tagline: 'Chic modern villa retreat with private patio near Shaheed Path',
      specs: ['AC Bedrooms', 'Full Kitchen', 'Private Parking', 'Couple Friendly'],
      match: /pink\s*paradise|paradise\s*villa|vil-?108/i
    }
  };

  // ── DYNAMIC RATE SYNC FROM CRM (SUPABASE ROOMS TABLE) ─────────────
  async function syncCatalogRatesFromDB(force = false) {
    // 1. Fast in-memory sync from window.UHH_PHOTO_DB if already initialized
    if (typeof window !== 'undefined' && window.UHH_PHOTO_DB) {
      Object.keys(PROPERTIES_CATALOG).forEach(slug => {
        const item = window.UHH_PHOTO_DB[slug];
        if (item && item.base_price && !isNaN(Number(item.base_price))) {
          PROPERTIES_CATALOG[slug].price = Number(item.base_price);
          if (item.airbnb_price) {
            PROPERTIES_CATALOG[slug].originalPrice = Number(item.airbnb_price);
          }
        }
      });
    }

    // 2. Query live Supabase rooms table (source of truth from CRM)
    const now = Date.now();
    if (!force && (now - _lastSupabaseSyncTs) < 30 * 1000) return _rates;
    try {
      const sb = window.sb || (typeof supabase !== 'undefined' && window.SUPABASE_URL
        ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null);
      if (sb) {
        const { data, error } = await sb
          .from('rooms')
          .select('room_id, property_name, nickname, rent_per_night, max_guests')
          .order('room_id');

        if (!error && Array.isArray(data) && data.length > 0) {
          _lastSupabaseSyncTs = now;
          _rates = data.map(r => ({
            room_id: r.room_id,
            property_name: r.nickname || r.property_name,
            base_price: Number(r.rent_per_night) || 4500,
            max_guests: r.max_guests || 6
          }));

          // Synchronize every property in PROPERTIES_CATALOG dynamically
          data.forEach(r => {
            const livePrice = Number(r.rent_per_night);
            if (!livePrice || isNaN(livePrice)) return;
            for (const slug of Object.keys(PROPERTIES_CATALOG)) {
              const prop = PROPERTIES_CATALOG[slug];
              const isIdMatch = prop.id && r.room_id && prop.id.trim().toUpperCase() === r.room_id.trim().toUpperCase();
              const isNameMatch = (r.nickname && prop.name && prop.name.toLowerCase().includes(r.nickname.toLowerCase())) ||
                                  (r.property_name && prop.name && r.property_name.toLowerCase().includes(prop.name.toLowerCase()));
              if (isIdMatch || isNameMatch) {
                prop.price = livePrice;
                prop.originalPrice = Math.round(livePrice * 1.22);
                break;
              }
            }
          });

          try {
            sessionStorage.setItem('uhh_price_cache', JSON.stringify({ ts: now, data: _rates }));
          } catch (_) {}
          return _rates;
        }
      }
    } catch (err) {
      console.warn('[NishaAI] Supabase dynamic rates sync error:', err);
    }

    // 3. Fallback rates if Supabase is offline
    if (!_rates || _rates.length === 0) {
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
    }
    return _rates;
  }

  async function getRates(force = false) {
    return await syncCatalogRatesFromDB(force);
  }

  function formatPropertyReply(prop) {
    syncCatalogRatesFromDB();
    const waMsg = encodeURIComponent(`Namaste Shahanshah ji! I am interested in booking ${prop.name} (${prop.type}) in ${prop.area}. Direct rate: ₹${prop.price.toLocaleString('en-IN')}/night. Please share availability.`);
    const waUrl = `https://wa.me/${ADMIN_WA}?text=${waMsg}`;
    return {
      text: `Namaste ji! 🙏 **${prop.name}** (${prop.type}) ke baare mein complete details:\n\n` +
            `💰 **Direct Rate:** **₹${prop.price.toLocaleString('en-IN')} / night** <small style="color:#8696a0">(Airbnb: ₹${prop.originalPrice.toLocaleString('en-IN')} — Save 15%)</small>\n` +
            `📍 **Location:** ${prop.area}\n` +
            `⭐ **Rating:** ${prop.rating}★ (${prop.reviews} verified reviews)\n\n` +
            `✨ *${prop.tagline}*\n` +
            `• ${prop.specs.join(' • ')}\n\n` +
            `🔒 **100% Couple-Friendly, Private & Safe!** Kitchen me cooking facility, RO, refrigerator, aur premise par free parking available hai.`,
      card: {
        title: prop.name,
        subtitle: `${prop.type} · ${prop.area}`,
        price: `₹${prop.price.toLocaleString('en-IN')}`,
        period: '/ night',
        rating: `${prop.rating}★ (${prop.reviews})`,
        image: prop.cover,
        link: prop.link,
        waUrl: waUrl,
        specs: prop.specs
      },
      actions: [
        { label: '💬 Book on WhatsApp', url: waUrl, isPrimary: true },
        { label: '📸 View Photos & Tour', url: prop.link }
      ],
      quickReplies: [
        `📅 Book ${prop.name}`,
        'Check-in policy?',
        'Other options dikhao',
        'Host se baat karein'
      ]
    };
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

    // Property (Dynamic Rate from PROPERTIES_CATALOG)
    if (/royal white|white house|shaadi|wedding|18 guest|badi villa/i.test(msg)) {
      info.property = 'Royal White House';
      info.rate = `₹${(PROPERTIES_CATALOG['royal-white-house']?.price || 12000).toLocaleString('en-IN')} / night`;
    } else if (/gomti grand|grand villa|gomti villa/i.test(msg)) {
      info.property = 'Gomti Grand Villa';
      info.rate = `₹${(PROPERTIES_CATALOG['gomti-grand-villa']?.price || 8000).toLocaleString('en-IN')} / night`;
    } else if (/celebrity/i.test(msg)) {
      info.property = 'Celebrity Garden';
      info.rate = `₹${(PROPERTIES_CATALOG['celebrity-garden']?.price || 10000).toLocaleString('en-IN')} / night`;
    } else if (/pink house/i.test(msg)) {
      info.property = 'The Pink House';
      info.rate = `₹${(PROPERTIES_CATALOG['the-pink-house']?.price || 9000).toLocaleString('en-IN')} / night`;
    } else if (/starlight|penthouse|blue penthouse|skyline|rooftop/i.test(msg)) {
      info.property = 'Starlight Blue PentHouse';
      info.rate = `₹${(PROPERTIES_CATALOG['starlight-blue-penthouse']?.price || 6000).toLocaleString('en-IN')} / night`;
    } else if (/unique|green house|yellow house/i.test(msg)) {
      info.property = 'Vishesh Khand 3BHK';
      info.rate = `₹${(PROPERTIES_CATALOG['the-unique']?.price || 5500).toLocaleString('en-IN')} / night`;
    } else if (/redrose|black beauty|dark blue|brown|light green|nawabi|velvet|3bhk|flat|apartment/i.test(msg)) {
      info.property = '3BHK Serviced Flat (Gomti Nagar)';
      info.rate = `₹${(PROPERTIES_CATALOG['the-dark-blue']?.price || 4500).toLocaleString('en-IN')} / night`;
    } else if (/villa/i.test(msg)) {
      info.property = 'Luxury Villa';
      const minV = PROPERTIES_CATALOG['gomti-grand-villa']?.price || 8000;
      const maxV = PROPERTIES_CATALOG['royal-white-house']?.price || 12000;
      info.rate = `₹${minV.toLocaleString('en-IN')} – ₹${maxV.toLocaleString('en-IN')} / night`;
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

    // 1. SPECIFIC 17-PROPERTY FUZZY LOOKUP (Matches ANY property by exact/typo/colloquial name)
    for (const key of Object.keys(PROPERTIES_CATALOG)) {
      const prop = PROPERTIES_CATALOG[key];
      if (prop.match && prop.match.test(msg)) {
        _leadData.property = prop.name;
        return formatPropertyReply(prop);
      }
    }

    // 2. GENERAL 3BHK SERVICED FLATS (LIVE CRM RATES)
    if (/(3bhk|3 bhk|flat|flats|serviced flat|gomti nagar flat|apartment|कमरा|फ्लैट)/i.test(msg) && !/(villa|white house|celebrity|party|wedding)/i.test(msg)) {
      const pRedRose = PROPERTIES_CATALOG['redrose-palace']?.price || 4500;
      const pBlack = PROPERTIES_CATALOG['black-beauty']?.price || 4500;
      const pDarkBlue = PROPERTIES_CATALOG['the-dark-blue']?.price || 4500;
      const pBrown = PROPERTIES_CATALOG['the-brown']?.price || 4500;
      const pLightGreen = PROPERTIES_CATALOG['the-light-green']?.price || 4500;
      const pNawabi = PROPERTIES_CATALOG['the-nawabi-stay']?.price || 4500;
      const pVelvet = PROPERTIES_CATALOG['the-velvet-house']?.price || 4500;
      return {
        text: `🏢 **Gomti Nagar Prime (Vikalp & Vishesh Khand) — Luxury 3BHK Serviced Flats:**\n\n` +
              `Hamare premium fully furnished 3BHK flats website direct rate par live CRM pricing ke saath available hain (Airbnb se 15% direct discount)!\n\n` +
              `1️⃣ **RedRose Palace:** Rich crimson floral luxury interiors (₹${pRedRose.toLocaleString('en-IN')})\n` +
              `2️⃣ **Black Beauty:** Ultra-luxurious Black & Gold royal theme (₹${pBlack.toLocaleString('en-IN')})\n` +
              `3️⃣ **The Dark Blue:** Calming oceanic navy blue aesthetic (₹${pDarkBlue.toLocaleString('en-IN')})\n` +
              `4️⃣ **The Brown:** Warm earthen walnut wood cozy interior (₹${pBrown.toLocaleString('en-IN')})\n` +
              `5️⃣ **The Light Green:** Mint & sage green fresh botanical theme (₹${pLightGreen.toLocaleString('en-IN')})\n` +
              `6️⃣ **The Nawabi Stay:** Classic royal Lucknowi heritage decor (₹${pNawabi.toLocaleString('en-IN')})\n` +
              `7️⃣ **The Velvet House:** Plush velvet decor near Lulu Mall (₹${pVelvet.toLocaleString('en-IN')})\n\n` +
              `✨ *Sabhi flats me:* 3 AC Bedrooms, Modular Kitchen (Gas + RO), High-Speed 200 Mbps Wi-Fi, Lift & Covered Parking. 100% Couple Friendly!`,
        actions: [
          { label: '💬 Book 3BHK on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent('Namaste! I want to book a luxury 3BHK flat in Gomti Nagar. Please share availability.')}`, isPrimary: true },
          { label: '🌐 View All 3BHK Flats', url: 'properties.html' }
        ],
        quickReplies: ['RedRose Palace 🌹', 'Black Beauty 🖤', 'The Dark Blue 💙', 'Check-in rules']
      };
    }

    // 3. GENERAL PRIVATE VILLAS & LARGE GROUPS (10 - 18 GUESTS)
    if (/(villa|villas|badi villa|white house|celebrity|wedding|shaadi|haldi|mehndi|party|gathering|10 guest|12 guest|15 guest|18 guest|विल्ला|विला)/i.test(msg)) {
      const pWhiteHouse = PROPERTIES_CATALOG['royal-white-house']?.price || 12000;
      const pGomtiVilla = PROPERTIES_CATALOG['gomti-grand-villa']?.price || 8000;
      const pCelebrity = PROPERTIES_CATALOG['celebrity-garden']?.price || 10000;
      const pPinkHouse = PROPERTIES_CATALOG['the-pink-house']?.price || 9000;
      return {
        text: `🏰 **Luxury Standalone Villas & Estates in Lucknow:**\n\n` +
              `1️⃣ **Royal White House:** ₹${pWhiteHouse.toLocaleString('en-IN')}/night (Grand palatial estate for up to 18 guests · Weddings & Reunions)\n` +
              `2️⃣ **Gomti Grand Villa:** ₹${pGomtiVilla.toLocaleString('en-IN')}/night (100% Private standalone villa with lawn · Up to 10 guests · Near Lulu Mall)\n` +
              `3️⃣ **Celebrity Garden:** ₹${pCelebrity.toLocaleString('en-IN')}/night (Sprawling landscaped green lawn & luxury suites near Lulu Mall)\n` +
              `4️⃣ **The Pink House:** ₹${pPinkHouse.toLocaleString('en-IN')}/night (Instagram-famous aesthetic villa in Vishesh Khand, Gomti Nagar)\n\n` +
              `✨ 100% Standalone privacy, AC in all suites, modular kitchens for self-cooking/catering & secure multi-car parking.`,
        actions: [
          { label: '💬 Book Villa on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent('Namaste! I want to inquire about luxury villas for our group stay.')}`, isPrimary: true },
          { label: '🌐 View All Villas', url: 'properties.html' }
        ],
        quickReplies: [`Gomti Grand Villa ₹${pGomtiVilla.toLocaleString('en-IN')}`, `Royal White House ₹${pWhiteHouse.toLocaleString('en-IN')}`, `Celebrity Garden ₹${pCelebrity.toLocaleString('en-IN')}`, 'Advance policy']
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

    // 27. RATES & COMPLETE PRICING LIST (LIVE CRM RATES)
    if (/rate|price|cost|kitna|charge|per night|rent|pricing|list/i.test(msg)) {
      const pRWH = PROPERTIES_CATALOG['royal-white-house']?.price || 12000;
      const pCG = PROPERTIES_CATALOG['celebrity-garden']?.price || 10000;
      const pTPH = PROPERTIES_CATALOG['the-pink-house']?.price || 9000;
      const pGGV = PROPERTIES_CATALOG['gomti-grand-villa']?.price || 8000;
      const pSBP = PROPERTIES_CATALOG['starlight-blue-penthouse']?.price || 6000;
      const pTU = PROPERTIES_CATALOG['the-unique']?.price || 5500;
      const pFlat = PROPERTIES_CATALOG['the-dark-blue']?.price || 4500;

      return {
        text: `💰 **Official Property Rates (Live Direct CRM Rates):**\n\n` +
              `🏡 **Grand Private Standalone Villas:**\n` +
              `• **Royal White House:** ₹${pRWH.toLocaleString('en-IN')} / night (Up to 18 Guests, Royal Estate)\n` +
              `• **Celebrity Garden:** ₹${pCG.toLocaleString('en-IN')} / night (Up to 8–10 Guests, Sprawling Lawn)\n` +
              `• **The Pink House:** ₹${pTPH.toLocaleString('en-IN')} / night (Up to 10 Guests, Aesthetic Luxury)\n` +
              `• **Gomti Grand Villa:** ₹${pGGV.toLocaleString('en-IN')} / night (Up to 10 Guests, Private Lawn)\n\n` +
              `🏙️ **Penthouse & Boutique Stays:**\n` +
              `• **Starlight Blue PentHouse:** ₹${pSBP.toLocaleString('en-IN')} / night (Private Open-Sky Terrace)\n` +
              `• **The Unique / Green House / Yellow House:** ₹${pTU.toLocaleString('en-IN')} / night\n\n` +
              `🏢 **Luxury 3BHK Serviced Flats (₹${pFlat.toLocaleString('en-IN')} / night):**\n` +
              `• Black Beauty • RedRose Palace • The Dark Blue • The Brown • The Light Green • The Nawabi Stay • The Velvet House\n\n` +
              `✨ *All prices direct from CRM. Includes full kitchen, AC in all rooms, high-speed WiFi & parking.*`,
        quickReplies: [`Gomti Grand Villa ₹${pGGV.toLocaleString('en-IN')}`, `3BHK Flat ₹${pFlat.toLocaleString('en-IN')}`, 'Book karna hai 📅']
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

    // 28B. COOK, CHEF & HOME-STYLE FOOD
    if (/cook|chef|khana banane|meals|breakfast|nashta|lunch|dinner|maid for cooking|ghar ka khana/i.test(msg)) {
      return {
        text: `👨‍🍳 **Cook / Chef & Meal Facilities:**\n\n` +
              `• **Cook on Call:** Aapki demand par hum trusted local home cook/chef arrange karwa sakte hain (prior notice zaroori hai, nominal charges direct cook ko pay karne hote hain).\n` +
              `• **Self-Cooking in Full Modular Kitchen:** Har flat aur villa me gas stove, microwave, refrigerator, RO water purifier, cookware aur crockery bilkul free provide ki jaati hai.\n` +
              `• **Instant Delivery:** Swiggy, Zomato, Blinkit, Zepto, aur Instamart se 10 se 15 minute me grocery aur Lucknow ke famous restaurants (Tunday, Dastarkhwan, Royal Cafe) se khana deliver ho jaata hai!`,
        quickReplies: ['Kitchen amenities? 🍳', 'Rates list 💰', 'Gomti Grand Villa 🏡', 'Book karna hai 📅']
      };
    }

    // 28C. PHOTOSHOOT, PRE-WEDDING & COMMERCIAL SHOOTS
    if (/photoshoot|shoot|pre wedding|pre-wedding|reels|video shoot|camera|shooting|model shoot/i.test(msg)) {
      return {
        text: `📸 **Photoshoots & Pre-Wedding Shoots:**\n\n` +
              `• **Permitted Venues:** Hamari private villas shoots ke liye Lucknow me sabse popular aur Instagram-aesthetic hain:\n` +
              `  🌸 **The Pink House** — Gorgeous pastel aesthetic interiors & terrace garden\n` +
              `  👑 **Royal White House** — Palatial white royal architecture & sprawling lawn\n` +
              `  🏡 **Gomti Grand Villa** — Luxury standalone villa with landscaped green lawn\n` +
              `  ✨ **Starlight Blue PentHouse** — Night skyline view open terrace\n\n` +
              `• Commercial shoot permission, camera crew equipment aur day slots ke special packages ke liye host se WhatsApp par coordinate karein.`,
        actions: [{ label: '📲 Coordinate Shoot on WhatsApp', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to inquire about a pre-wedding/photoshoot at Unique Haven Homes.` }],
        quickReplies: ['The Pink House ₹9k', 'Royal White House ₹12k', 'Rates list 💰']
      };
    }

    // 28D. AIRPORT & RAILWAY PICKUP / CAB & TRAVEL
    if (/airport pickup|railway pickup|taxi|cab|ola|uber|drop|station pickup|travel assistance|gaadi chahiye/i.test(msg)) {
      return {
        text: `🚕 **Airport & Railway Travel Assistance:**\n\n` +
              `• **Easy Cab Availability:** Ola, Uber aur inDrive hamari sabhi properties par 3–5 minute me available ho jaate hain.\n` +
              `• **Airport Distance:** CCS International Airport (Amausi) se sirf **20–25 minutes** Shaheed Path elevated expressway ke zariye.\n` +
              `• **Railway Stations:** Charbagh Station & Gomti Nagar Terminal se 15–20 minutes.\n` +
              `• **Private Cab On Request:** Agar aapko dedicated luxury sedan/SUV pickup ya drop chahiye, to hum verified driver arrange karwa dete hain.`,
        actions: [{ label: '📲 Request Cab / Travel Help', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I need taxi/pickup assistance for my stay at Unique Haven Homes.` }],
        quickReplies: ['Lulu Mall distance? 📍', 'Check-in time? 🕐', 'Book karna hai 📅']
      };
    }

    // 28E. MEDANTA HOSPITAL & MEDICAL PATIENT STAYS
    if (/medanta|hospital|doctor|patient|medical|treatment|apollo|sahara|sgpgi/i.test(msg)) {
      return {
        text: `🏥 **Medanta Hospital & Medical Recovery Stays:**\n\n` +
              `• **Super Close Distance:** Hamari villas aur serviced stays Medanta Hospital Lucknow se sirf **5 minutes ki doori** par hain!\n` +
              `• **Peaceful & Sanitized:** 100% quiet VIP colony, deeply sanitized peaceful environment jo patient recovery aur family stay ke liye best hai.\n` +
              `• **Home Cooking:** Patient ke specific diet food ke liye fully equipped kitchen (Gas, RO water, Microwave, Fridge).\n` +
              `• **Subsidized Long Stays:** Medical treatments ke liye special weekly aur monthly discounted rates provide kiye jaate hain.`,
        actions: [{ label: '📲 Inquire Medanta Stay Package', url: `https://wa.me/${ADMIN_WA}?text=Namaste! We need a clean homestay near Medanta Hospital for medical purpose.` }],
        quickReplies: ['Gomti Grand Villa ₹8k', '3BHK Flat ₹4.5k', 'Kitchen facility? 🍳']
      };
    }

    // 28F. EKANA STADIUM & IPL / MATCH / EVENTS
    if (/ekana|stadium|ipl|cricket|match|concert|palassio/i.test(msg)) {
      return {
        text: `🏏 **Ekana Stadium & Match Day Stays:**\n\n` +
              `• **Prime Location:** Hamari luxury properties Ekana Cricket Stadium aur Phoenix Palassio se sirf **7 minutes door** hain (Shaheed Path road par direct access)!\n` +
              `• Match ya concert ke baad bina kisi traffic hassle ke aap 5-7 minutes me apne luxurious private stay me relax kar sakte hain.\n` +
              `• Match dates par demand high rehti hai, isliye dates advance token se lock karein.`,
        actions: [{ label: '📲 Book Near Ekana Stadium', url: `https://wa.me/${ADMIN_WA}?text=Namaste! I want to book stay near Ekana Stadium.` }],
        quickReplies: ['Rates list 💰', 'Gomti Grand Villa ₹8k', 'Book now 📅']
      };
    }

    // 28G. SENIOR CITIZENS, LIFT, GROUND FLOOR & ACCESSIBILITY
    if (/lift|elevator|senior citizen|elderly|bujurg|wheelchair|ground floor|stairs|seedhi/i.test(msg)) {
      return {
        text: `🛗 **Accessibility & Senior Citizens Comfort:**\n\n` +
              `• **Ground Floor Villas:** Hamari private standalone villas (**Gomti Grand Villa**, **Celebrity Garden**) ground floor access ke saath aati hain — zero stairs, easy wheelchair movement aur senior citizens ke liye 100% comfortable.\n` +
              `• **Automatic Lifts:** Hamare 3BHK serviced apartments high-speed automatic elevators ke saath aate hain.\n` +
              `• Hum elderly guests ke aaram aur silent environment ka vishesh dhyan rakhte hain.`,
        quickReplies: ['Gomti Grand Villa ₹8k', 'Rates list 💰', 'Book karna hai 📅']
      };
    }

    // 28H. LAUNDRY, WASHING MACHINE & IRON
    if (/washing machine|laundry|dhona|kapde|iron|press|clothes/i.test(msg)) {
      return {
        text: `🧺 **Laundry & Washing Facilities:**\n\n` +
              `• **Washing Machine:** Hamari villas aur serviced flats me automatic washing machine aur laundry drying rack available hai.\n` +
              `• **Iron & Board:** Har stay me electric iron (press) aur ironing board complimentary provide kiya jata hai.\n` +
              `• Nearby professional dry-cleaning & express laundry service bhi available hai jo same day deliver karti hai.`,
        quickReplies: ['Cleaning policy? 🧼', 'Kitchen amenities? 🍳', 'Book now 📅']
      };
    }

    // 28I. SWIMMING POOL / WATER AMENITIES CLARIFICATION
    if (/pool|swimming|jacuzzi|water pool/i.test(msg)) {
      return {
        text: `🏊 **Pool & Open Space Information:**\n\n` +
              `• Hamare paas **private sprawling green lawns**, lush gardens aur **open-sky rooftop penthouse terraces** hain.\n` +
              `• Hamare paas open swimming pool nahi hai ji, lekin outdoor relax karne ke liye private lawns, sit-out gazebos aur terrace lounge available hain.\n` +
              `• Agar aapko private villa with lawn dekhna hai, to **Gomti Grand Villa** aur **Celebrity Garden** best options hain!`,
        quickReplies: ['Gomti Grand Villa ₹8k', 'Celebrity Garden ₹10k', 'Rates list 💰']
      };
    }

    // 28J. LUCKNOW TOURISM, SIGHTSEEING & FAMOUS FOOD
    if (/lucknow ghumna|sightseeing|tourist|tourism|imambara|rumi darwaza|hazratganj|tunday|kababi|chikan|shopping|kya dekhe/i.test(msg)) {
      return {
        text: `🕌 **Lucknow City Guide & Must-Visit Spots:**\n\n` +
              `📍 **Top Heritage Attractions:**\n` +
              `• Bara Imambara & Bhulbhulaiya, Chota Imambara, Rumi Darwaza, Clock Tower (Old Lucknow)\n` +
              `• The Residency & British Heritage Walk\n` +
              `• Ambedkar Memorial Park & Gomti Riverfront (Sirf 10 mins from Gomti Nagar)\n\n` +
              `🍽️ **Famous Lucknowi Food:**\n` +
              `• Tunday Kababi (Aminabad & Chowk) — Galawati Kabab\n` +
              `• Dastarkhwan & Naushijaan — Mughlai Biryani & Korma\n` +
              `• Royal Cafe (Hazratganj) — Famous Basket Chaat\n` +
              `• Sharma Chai (Hazratganj) — Bun Makkhan & Samosa\n\n` +
              `🛍️ **Chikankari Shopping:**\n` +
              `• Hazratganj, Janpath Market aur Chowk me best authentic Lakhnawi Chikan work milta hai!`,
        quickReplies: ['Gomti Nagar Flats ₹4.5k', 'Villas rates 💰', 'Book karna hai 📅']
      };
    }

    // 28K. SOLO FEMALE & GIRLS GROUP SAFETY
    if (/solo female|girls|women|ladies|aurat|ladkiya|safe for women|security/i.test(msg)) {
      return {
        text: `🛡️ **100% Safe for Solo Female & Women Travelers:**\n\n` +
              `• **VIP Gated Colonies:** Hamari sabhi properties safe, affluent VIP neighborhoods (Gomti Nagar & Sushant Golf City) me hain jahan 24/7 security patrolling hoti hai.\n` +
              `• **Zero Interference:** Complete privacy, secure locks, exterior CCTV monitoring.\n` +
              `• **24/7 Support:** Hamari team aur co-founder Mr. Shahanshah 24 hours kisi bhi zaroorat ke liye available rehte hain.\n` +
              `• Dozens of solo female executives, doctors, and women groups stay with us every month with 5★ ratings!`,
        quickReplies: ['Rates list 💰', '3BHK Flat ₹4,500', 'Book now 📅']
      };
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

    // 33. DYNAMIC INTELLIGENT AI FALLBACK
    if (window.nishaAI) {
      try {
        const smartReply = await window.nishaAI.sendMessage(raw);
        if (smartReply && smartReply.trim()) {
          return {
            text: smartReply,
            actions: [{ label: '📲 WhatsApp Host (+91 94500 55554)', url: `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent('Namaste! I want to confirm booking with Unique Haven Homes.')}` }],
            quickReplies: ['Book karna hai 📅', 'Rates list 💰', 'Gomti Grand Villa ₹8k']
          };
        }
      } catch (_) {}
    }

    // 34. STANDARD VERIFIED FALLBACK
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
  // ── INJECT STYLES ───────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('uhh-chat-styles')) return;
    const s = document.createElement('style');
    s.id = 'uhh-chat-styles';
    s.textContent = `
      #uhh-chat-btn-wrap {
        position: fixed; bottom: 24px; right: 24px; z-index: 9997;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      #uhh-chat-btn.uhh-chat-unified-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #00A884 0%, #008069 100%);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #FFFFFF;
        padding: 10px 18px;
        border-radius: 999px;
        font-size: 13.5px;
        font-weight: 700;
        letter-spacing: 0.2px;
        box-shadow: 0 8px 24px rgba(0, 168, 132, 0.35), 0 4px 12px rgba(0, 0, 0, 0.4);
        cursor: pointer;
        outline: none;
        position: relative;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #uhh-chat-btn.uhh-chat-unified-btn:hover {
        transform: translateY(-2px) scale(1.03);
        box-shadow: 0 12px 30px rgba(0, 168, 132, 0.5), 0 6px 16px rgba(0, 0, 0, 0.5);
      }
      .uhh-chat-btn-sparkle { font-size: 16px; }
      .uhh-chat-btn-title { color: #FFFFFF; font-weight: 700; }
      .uhh-chat-btn-pill {
        font-size: 11px;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.22);
        color: #FFFFFF;
        padding: 2px 7px;
        border-radius: 6px;
      }
      #uhh-chat-btn .uhh-chat-badge {
        position: absolute; top: -3px; right: -3px;
        width: 18px; height: 18px; background: #25D366;
        border-radius: 50%; font-size: 10px; color: #111B21;
        display: flex; align-items: center; justify-content: center;
        font-weight: 800; border: 2px solid #0B141A;
        animation: uhh-chat-pulse 2s infinite;
      }
      @keyframes uhh-chat-pulse {
        0%,100%{transform:scale(1)} 50%{transform:scale(1.2)}
      }

      /* Backdrop Scrim Overlay */
      #uhh-chat-backdrop {
        position: fixed; inset: 0;
        background: rgba(11, 20, 26, 0.72);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        z-index: 99990;
        opacity: 0; pointer-events: none;
        transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #uhh-chat-backdrop.active {
        opacity: 1; pointer-events: auto;
      }

      .uhh-sheet-handle-wrap { display: none; }

      /* WhatsApp Chat Panel */
      #uhh-chat-panel {
        position: fixed; bottom: 84px; right: 24px; z-index: 99995;
        width: min(400px, calc(100vw - 32px));
        height: min(620px, calc(100vh - 110px));
        background-color: #0B141A;
        background-image: radial-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
          url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M15 15h6v6h-6z' stroke='%23ffffff' stroke-width='0.75' stroke-opacity='0.03'/%3E%3Ccircle cx='60' cy='25' r='4' stroke='%23ffffff' stroke-width='0.75' stroke-opacity='0.03'/%3E%3Cpath d='M20 60c3-4 8-4 11 0' stroke='%23ffffff' stroke-width='0.75' stroke-opacity='0.03'/%3E%3Cpath d='M65 55l4 6h-8z' stroke='%23ffffff' stroke-width='0.75' stroke-opacity='0.03'/%3E%3C/svg%3E");
        background-size: 20px 20px, 80px 80px;
        border: 1px solid rgba(134, 150, 160, 0.2);
        border-radius: 18px; overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 1px rgba(255, 255, 255, 0.2);
        display: flex; flex-direction: column;
        transform-origin: bottom right;
        animation: uhh-chat-open 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #E9EDEF;
      }
      @keyframes uhh-chat-open {
        from { opacity: 0; transform: scale(0.92) translateY(16px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      #uhh-chat-panel.closing {
        animation: uhh-chat-close 0.2s ease forwards;
      }
      @keyframes uhh-chat-close {
        to { opacity: 0; transform: scale(0.92) translateY(16px); }
      }

      /* WhatsApp Dark Header */
      .uhh-chat-header {
        background: #1F2C34;
        border-bottom: 1px solid rgba(134, 150, 160, 0.15);
        padding: 10px 14px;
        display: flex; align-items: center; gap: 10px;
        flex-shrink: 0;
      }
      .uhh-chat-back-btn {
        display: none;
        background: none; border: none;
        color: #AEBAC1; cursor: pointer;
        padding: 4px; line-height: 1;
      }
      .uhh-chat-avatar-wrap {
        position: relative; flex-shrink: 0;
      }
      .uhh-chat-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        background: linear-gradient(135deg, #00A884 0%, #128C7E 100%);
        border: 1.5px solid rgba(255, 255, 255, 0.2);
        display: flex; align-items: center; justify-content: center;
        font-size: 19px;
      }
      .uhh-chat-avatar-dot {
        width: 10px; height: 10px; background: #00A884;
        border-radius: 50%; border: 2px solid #1F2C34;
        position: absolute; bottom: 0; right: 0;
      }
      .uhh-chat-header-info { flex: 1; min-width: 0; }
      .uhh-chat-header-name {
        font-size: 14.5px; font-weight: 700; color: #E9EDEF;
        display: flex; align-items: center; gap: 5px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .uhh-wa-verified-badge { flex-shrink: 0; }
      .uhh-chat-header-status {
        font-size: 11.5px; color: #8696A0; margin-top: 1px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .uhh-chat-header-status.typing { color: #00A884; font-weight: 600; }
      .uhh-chat-header-actions {
        display: flex; align-items: center; gap: 6px; flex-shrink: 0;
      }
      .uhh-header-icon-btn {
        width: 32px; height: 32px; border-radius: 50%;
        display: inline-flex; align-items: center; justify-content: center;
        color: #AEBAC1; text-decoration: none;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        transition: all 0.15s;
      }
      .uhh-header-icon-btn:hover {
        background: rgba(255, 255, 255, 0.12); color: #E9EDEF;
      }
      .uhh-chat-voice-toggle {
        background: rgba(0, 168, 132, 0.15);
        border: 1px solid rgba(0, 168, 132, 0.35);
        color: #00A884; width: 32px; height: 32px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; cursor: pointer; outline: none; transition: all 0.2s;
      }
      .uhh-chat-voice-toggle.muted {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.12);
        color: #8696A0;
      }
      .uhh-chat-close {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #AEBAC1;
        width: 32px; height: 32px; border-radius: 50%;
        cursor: pointer; font-size: 14px;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.15s; outline: none;
      }
      .uhh-chat-close:hover {
        background: rgba(255, 255, 255, 0.15); color: #FFFFFF;
      }

      /* Messages Stream */
      .uhh-chat-msgs {
        flex: 1; overflow-y: auto; padding: 12px 14px; display: flex;
        flex-direction: column; gap: 8px; scroll-behavior: smooth;
      }
      .uhh-chat-msgs::-webkit-scrollbar { width: 4px; }
      .uhh-chat-msgs::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 4px; }

      /* WhatsApp Security Notice Banner */
      .uhh-wa-security-banner {
        align-self: center;
        background: #182229;
        border: 1px solid rgba(255, 226, 122, 0.2);
        border-radius: 8px;
        padding: 6px 12px;
        margin: 2px 0 8px;
        max-width: 90%;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      .uhh-wa-security-banner span {
        font-size: 11px;
        color: #FFE27A;
        line-height: 1.4;
        display: inline-block;
      }

      /* Message Groups & Bubbles */
      .uhh-msg {
        max-width: 86%; display: flex; flex-direction: column;
        animation: uhh-msg-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
      }
      @keyframes uhh-msg-in {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .uhh-msg.bot { align-self: flex-start; }
      .uhh-msg.user { align-self: flex-end; }

      .uhh-msg-bubble {
        padding: 8px 11px;
        font-size: 13.5px;
        line-height: 1.48;
        word-break: break-word;
        box-shadow: 0 1px 1.5px rgba(11, 20, 26, 0.35);
        position: relative;
      }
      .bot .uhh-msg-bubble {
        background: #202C33;
        color: #E9EDEF;
        border-radius: 0 8px 8px 8px;
      }
      /* WhatsApp Left Tail */
      .bot .uhh-msg-bubble::before {
        content: "";
        position: absolute;
        top: 0;
        left: -8px;
        width: 0;
        height: 0;
        border-top: 8px solid #202C33;
        border-left: 8px solid transparent;
      }

      .user .uhh-msg-bubble {
        background: #005C4B;
        color: #E9EDEF;
        border-radius: 8px 0 8px 8px;
      }
      /* WhatsApp Right Tail */
      .user .uhh-msg-bubble::before {
        content: "";
        position: absolute;
        top: 0;
        right: -8px;
        width: 0;
        height: 0;
        border-top: 8px solid #005C4B;
        border-right: 8px solid transparent;
      }

      .uhh-msg-content { white-space: pre-wrap; }
      .uhh-msg-content strong, .uhh-msg-content b { color: #53BDEB; font-weight: 700; }
      .bot .uhh-msg-content strong { color: #53BDEB; }

      /* Message Meta (Time + Blue Ticks) */
      .uhh-msg-meta {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 3px;
        margin-top: 4px;
        float: right;
      }
      .uhh-msg-time {
        font-size: 10.5px;
        color: #8696A0;
      }
      .user .uhh-msg-time { color: rgba(255, 255, 255, 0.75); }
      .uhh-wa-ticks {
        font-size: 11.5px;
        font-weight: 700;
        color: #53BDEB;
        letter-spacing: -1.5px;
        margin-left: 2px;
      }

      /* WhatsApp Business Product Catalog Card Component */
      .uhh-wa-card {
        background: #111B21;
        border: 1px solid #2A3942;
        border-radius: 10px;
        overflow: hidden;
        margin-top: 8px;
        display: flex;
        flex-direction: column;
      }
      .uhh-wa-card-media {
        position: relative;
        height: 135px;
        overflow: hidden;
        background: #0B141A;
      }
      .uhh-wa-card-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }
      .uhh-wa-card-media:hover img {
        transform: scale(1.03);
      }
      .uhh-wa-card-badge {
        position: absolute;
        bottom: 8px;
        left: 8px;
        background: rgba(11, 20, 26, 0.88);
        color: #FFD700;
        font-size: 10.5px;
        font-weight: 700;
        padding: 3px 7px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(4px);
      }
      .uhh-wa-card-body {
        padding: 10px 12px;
      }
      .uhh-wa-card-title {
        font-size: 14.5px;
        font-weight: 700;
        color: #E9EDEF;
      }
      .uhh-wa-card-sub {
        font-size: 11px;
        color: #8696A0;
        margin-top: 2px;
      }
      .uhh-wa-card-price {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin: 6px 0 8px;
      }
      .uhh-wa-card-amount {
        font-size: 17px;
        font-weight: 800;
        color: #00A884;
      }
      .uhh-wa-card-per {
        font-size: 11px;
        color: #8696A0;
      }
      .uhh-wa-card-save {
        font-size: 10px;
        font-weight: 700;
        background: rgba(0, 168, 132, 0.15);
        color: #00A884;
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid rgba(0, 168, 132, 0.3);
      }
      .uhh-wa-card-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-bottom: 10px;
      }
      .uhh-wa-tag {
        font-size: 10.5px;
        color: #D1D7DB;
        background: #202C33;
        padding: 2px 7px;
        border-radius: 4px;
        border: 1px solid #2A3942;
      }
      .uhh-wa-card-btns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .uhh-wa-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 7px 10px;
        border-radius: 6px;
        font-size: 11.5px;
        font-weight: 700;
        text-decoration: none;
        transition: all 0.15s;
        text-align: center;
      }
      .uhh-wa-btn.secondary {
        background: #202C33;
        color: #E9EDEF;
        border: 1px solid #2A3942;
      }
      .uhh-wa-btn.secondary:hover {
        background: #2A3942;
      }
      .uhh-wa-btn.primary {
        background: #00A884;
        color: #111B21;
      }
      .uhh-wa-btn.primary:hover {
        background: #029070;
      }

      /* WhatsApp Voice Note Bar */
      .uhh-wa-voice-note {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #111B21;
        border: 1px solid #2A3942;
        padding: 6px 10px;
        border-radius: 8px;
        margin-top: 8px;
      }
      .uhh-speak-msg-btn {
        display: inline-flex; align-items: center; gap: 4px;
        background: #00A884; color: #111B21;
        border: none; border-radius: 14px;
        padding: 4px 9px; font-size: 11px; font-weight: 700;
        cursor: pointer; outline: none; transition: all 0.15s;
      }
      .uhh-speak-msg-btn:hover { background: #029070; }
      .uhh-speak-msg-btn.speaking {
        background: #EF4444; color: #FFFFFF;
      }
      .uhh-wa-waveform {
        flex: 1; display: flex; align-items: center; gap: 2.5px; height: 16px;
      }
      .uhh-wave-bar {
        width: 2.5px; background: #8696A0; border-radius: 1px;
      }
      .uhh-speak-msg-btn.speaking ~ .uhh-wa-waveform .uhh-wave-bar {
        background: #00A884;
        animation: uhh-wave-anim 0.6s ease-in-out infinite alternate;
      }
      .uhh-wa-voice-meta {
        font-size: 10.5px; color: #8696A0; white-space: nowrap;
      }

      /* Generic Actions inside Bubbles */
      .uhh-msg-actions {
        display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;
      }
      .uhh-msg-action-btn {
        display: inline-flex; align-items: center; gap: 5px;
        background: #202C33; color: #E9EDEF;
        border: 1px solid #2A3942;
        text-decoration: none; padding: 7px 12px; border-radius: 6px;
        font-size: 12px; font-weight: 700; transition: all 0.15s;
      }
      .uhh-msg-action-btn.primary {
        background: #00A884; color: #111B21; border-color: #00A884;
      }
      .uhh-msg-action-btn:hover {
        background: #2A3942;
      }
      .uhh-msg-action-btn.primary:hover {
        background: #029070;
      }

      /* Quick Replies Bar */
      .uhh-quick-replies {
        display: flex; flex-wrap: nowrap; overflow-x: auto; gap: 6px; padding: 8px 12px;
        scrollbar-width: none; -webkit-overflow-scrolling: touch;
        background: #111B21; border-top: 1px solid #222D34;
      }
      .uhh-quick-replies::-webkit-scrollbar { display: none; }
      .uhh-qr {
        background: #1F2C34;
        border: 1px solid #2A3942;
        color: #00A884; padding: 5px 12px; border-radius: 16px;
        font-size: 11.5px; font-weight: 600; cursor: pointer;
        transition: all 0.15s; white-space: nowrap; outline: none;
      }
      .uhh-qr:hover { background: #2A3942; border-color: #00A884; }

      /* Typing Indicator */
      .uhh-typing {
        display: flex; align-items: center; gap: 4px; padding: 10px 14px;
        background: #202C33; border-radius: 0 8px 8px 8px; width: fit-content;
      }
      .uhh-typing span {
        width: 6.5px; height: 6.5px; border-radius: 50%; background: #8696A0;
        animation: uhh-bounce 1.2s infinite;
      }
      .uhh-typing span:nth-child(2) { animation-delay: .15s; }
      .uhh-typing span:nth-child(3) { animation-delay: .3s; }
      @keyframes uhh-bounce {
        0%,60%,100%{ transform: translateY(0); }
        30%{ transform: translateY(-4px); }
      }

      /* Live Voice Status Bar */
      .uhh-chat-status-bar {
        display: none; align-items: center; justify-content: space-between;
        padding: 6px 12px; background: #1F2C34;
        border-top: 1px solid #222D34;
        font-size: 11.5px; color: #E9EDEF; gap: 8px;
      }
      .uhh-chat-status-bar.speaking {
        display: flex; background: rgba(0, 168, 132, 0.15); color: #00A884;
      }
      .uhh-chat-status-bar.listening {
        display: flex; background: rgba(239, 68, 68, 0.15); color: #FCA5A5;
      }
      .uhh-chat-status-bar.processing {
        display: flex; background: rgba(83, 189, 235, 0.12); color: #53BDEB;
      }
      .uhh-mini-wave {
        display: inline-flex; align-items: center; gap: 2px; height: 12px; margin-right: 4px; vertical-align: middle;
      }
      .uhh-mini-wave span {
        width: 2.5px; height: 10px; background: #00A884; border-radius: 2px;
        animation: uhh-wave-anim 0.8s ease-in-out infinite alternate;
      }
      .uhh-mini-wave span:nth-child(2) { animation-delay: 0.2s; height: 14px; }
      .uhh-mini-wave span:nth-child(3) { animation-delay: 0.4s; height: 8px; }
      @keyframes uhh-wave-anim {
        from { transform: scaleY(0.4); } to { transform: scaleY(1.2); }
      }
      .uhh-mic-pulse-dot {
        display: inline-block; width: 8px; height: 8px; border-radius: 50%;
        background: #EF4444; margin-right: 4px;
        box-shadow: 0 0 8px rgba(239, 68, 68, 0.8);
        animation: uhh-chat-pulse 1s infinite alternate;
        vertical-align: middle;
      }
      .uhh-chat-interrupt-btn {
        background: rgba(239, 68, 68, 0.22); border: 1px solid rgba(239, 68, 68, 0.45);
        color: #FEE2E2; font-size: 11px; font-weight: 700; padding: 3px 8px;
        border-radius: 10px; cursor: pointer; transition: all 0.15s; outline: none;
      }
      .uhh-chat-interrupt-btn:hover { background: #EF4444; color: #FFF; }

      /* WhatsApp Input Row */
      .uhh-chat-input-row {
        padding: 8px 10px; border-top: 1px solid #222D34;
        display: flex; gap: 8px; align-items: center; background: #1F2C34;
      }
      .uhh-wa-input-emoji {
        background: none; border: none; font-size: 20px; color: #8696A0;
        cursor: pointer; padding: 4px; line-height: 1; outline: none;
      }
      #uhh-chat-input {
        flex: 1; background: #2A3942;
        border: none; border-radius: 20px;
        padding: 9px 14px; color: #E9EDEF; font-size: 14px;
        outline: none; resize: none; max-height: 80px; min-height: 38px;
        font-family: inherit; line-height: 1.4;
      }
      #uhh-chat-input::placeholder { color: #8696A0; }
      .uhh-chat-mic-btn {
        width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
        background: none; border: none; color: #8696A0; font-size: 18px;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; outline: none;
      }
      .uhh-chat-mic-btn:hover { color: #E9EDEF; }
      .uhh-chat-mic-btn.listening {
        background: #EF4444 !important; color: #FFF !important;
        animation: uhh-mic-pulse 1s infinite alternate;
      }
      @keyframes uhh-mic-pulse {
        from { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        to   { transform: scale(1.12); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
      }
      #uhh-chat-send {
        width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
        background: #00A884; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        color: #111B21; transition: transform 0.15s, background 0.15s;
        outline: none;
      }
      #uhh-chat-send:hover { transform: scale(1.05); background: #029070; }

      /* Mobile Responsive (Full WhatsApp Experience) */
      @media (max-width: 768px) {
        #uhh-chat-btn-wrap {
          bottom: calc(76px + env(safe-area-inset-bottom, 0px));
          right: 14px;
        }
        #uhh-chat-btn.uhh-chat-unified-btn {
          width: 50px; height: 50px; min-width: 50px; min-height: 50px;
          padding: 0; border-radius: 50%; justify-content: center;
        }
        .uhh-chat-btn-title, .uhh-chat-btn-pill { display: none !important; }
        .uhh-chat-btn-sparkle { font-size: 22px; margin: 0; }
        #uhh-chat-panel {
          bottom: 0 !important; right: 0 !important; left: 0 !important; top: auto !important;
          width: 100vw !important; max-width: 100vw !important;
          height: 88vh !important; max-height: 88vh !important;
          border-radius: 20px 20px 0 0 !important;
          border: none !important;
          border-top: 1px solid rgba(134, 150, 160, 0.25) !important;
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.75) !important;
          animation: uhh-sheet-up 0.32s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        #uhh-chat-panel.closing {
          animation: uhh-sheet-down 0.22s ease forwards !important;
        }
        @keyframes uhh-sheet-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes uhh-sheet-down {
          from { transform: translateY(0); opacity: 1; }
          to   { transform: translateY(100%); opacity: 0; }
        }
        .uhh-sheet-handle-wrap {
          display: flex !important;
          justify-content: center;
          padding: 8px 0 4px;
          background: #1F2C34;
          cursor: pointer;
        }
        .uhh-sheet-handle {
          width: 40px; height: 4px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 999px;
        }
        .uhh-chat-back-btn { display: inline-flex !important; }
        .uhh-chat-input-row {
          padding-bottom: max(10px, env(safe-area-inset-bottom, 10px)) !important;
        }
      }
    `;
    document.head.appendChild(s);
  }

  // ── UPDATE LIVE VOICE STATUS BAR ────────────────────────────────
  function updateVoiceStatus(state, msg) {
    const bar = document.getElementById('uhh-chat-voice-status');
    const textEl = document.getElementById('uhh-chat-status-text');
    const interruptBtn = document.getElementById('uhh-chat-interrupt-btn');
    if (!bar) return;

    bar.classList.remove('speaking', 'listening', 'processing');

    if (state === 'idle') {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';
    bar.classList.add(state);

    if (state === 'speaking') {
      if (textEl) textEl.innerHTML = `<span class="uhh-mini-wave"><span></span><span></span><span></span></span> ${msg || 'Nisha bol rahi hain…'}`;
      if (interruptBtn) {
        interruptBtn.style.display = 'inline-flex';
        interruptBtn.textContent = '⏹️ Ruk jao / Boliye';
      }
    } else if (state === 'listening') {
      if (textEl) textEl.innerHTML = `<span class="uhh-mic-pulse-dot"></span> ${msg || 'Sun rahi hoon… Boliye'}`;
      if (interruptBtn) interruptBtn.style.display = 'none';
    } else if (state === 'processing') {
      if (textEl) textEl.textContent = msg || 'Soch rahi hoon…';
      if (interruptBtn) interruptBtn.style.display = 'none';
    }
  }

  // ── BARGE-IN INTERRUPTION HANDLER ───────────────────────────────
  function interruptNishaAndListen() {
    if (window.nishaAI) {
      window.nishaAI.stopSpeaking();
    }
    if (_currentSpeakingBtn) {
      _currentSpeakingBtn.classList.remove('speaking');
      const prevTxt = _currentSpeakingBtn.querySelector('.uhh-spk-txt');
      const prevIco = _currentSpeakingBtn.querySelector('.uhh-spk-ico');
      if (prevTxt) prevTxt.textContent = 'Suniye';
      if (prevIco) prevIco.textContent = '🔊';
      _currentSpeakingBtn = null;
    }
    // Start listening immediately
    _voiceTurn = true;
    startListeningMode();
  }

  // ── START LISTENING VIA MICROPHONE ──────────────────────────────
  function startListeningMode() {
    if (!window.nishaAI || !_chatOpen) return;
    window.nishaAI.unlockAudio();

    if (window.nishaAI.isSpeaking) {
      window.nishaAI.stopSpeaking();
    }

    const micBtn = document.getElementById('uhh-chat-mic-btn');
    const input = document.getElementById('uhh-chat-input');
    if (micBtn) micBtn.classList.add('listening');
    if (input) input.placeholder = '🎙️ Sun rahi hoon… Boliye (Listening…)';
    updateVoiceStatus('listening', 'Sun rahi hoon… Boliye');

    window.nishaAI.startListening(
      (transcript) => {
        if (micBtn) micBtn.classList.remove('listening');
        if (input) input.placeholder = 'Type ya 🎙️ bol kar poochhein…';
        updateVoiceStatus('processing', 'Nisha soch rahi hain…');
        if (transcript && transcript.trim()) {
          if (input) input.value = transcript.trim();
          _voiceTurn = true;
          sendUserMessage();
        } else {
          updateVoiceStatus('idle');
        }
      },
      (err) => {
        if (micBtn) micBtn.classList.remove('listening');
        if (input) input.placeholder = 'Type ya 🎙️ bol kar poochhein…';
        updateVoiceStatus('idle');
        console.warn('[Chat Mic Warning]', err);
      },
      (interim) => {
        if (interim) {
          if (input) input.placeholder = `🎙️ "${interim}…"`;
          updateVoiceStatus('listening', `"${interim}…"`);
        }
      }
    );
  }

  // ── BUILD UI ────────────────────────────────────────────────────
  function buildUI() {
    if (document.getElementById('uhh-chat-btn-wrap') || document.getElementById('uhh-chat-btn')) return;

    const wrap = document.createElement('div');
    wrap.id = 'uhh-chat-btn-wrap';
    wrap.innerHTML = `
      <button id="uhh-chat-btn" class="uhh-chat-unified-btn" aria-label="Chat with Nisha AI — The Unique Haven Homes">
        <span class="uhh-chat-btn-sparkle">✨</span>
        <span class="uhh-chat-btn-title">Nisha AI Concierge</span>
        <span class="uhh-chat-btn-pill">💬 Ask</span>
        <span class="uhh-chat-badge">1</span>
      </button>
    `;
    wrap.querySelector('#uhh-chat-btn').addEventListener('click', toggleChat);
    document.body.appendChild(wrap);
  }

  // ── TOGGLE CHAT ─────────────────────────────────────────────────
  function toggleChat() {
    _chatOpen ? closeChat() : openChat();
  }

  function openChat() {
    _chatOpen = true;
    document.getElementById('uhh-chat-btn')?.querySelector('.uhh-chat-badge')?.remove();

    if (window.nishaAI) window.nishaAI.unlockAudio();
    syncCatalogRatesFromDB(true).catch(() => {});

    // 1. Create or show Backdrop Overlay
    let backdrop = document.getElementById('uhh-chat-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'uhh-chat-backdrop';
      backdrop.addEventListener('click', closeChat);
      document.body.appendChild(backdrop);
    }
    requestAnimationFrame(() => backdrop.classList.add('active'));

    const panel = document.createElement('div');
    panel.id = 'uhh-chat-panel';
    panel.innerHTML = `
      <div class="uhh-sheet-handle-wrap" onclick="UHH_Chat.close()">
        <div class="uhh-sheet-handle"></div>
      </div>
      <div class="uhh-chat-header">
        <button class="uhh-chat-back-btn" onclick="UHH_Chat.close()" aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="uhh-chat-avatar-wrap">
          <div class="uhh-chat-avatar">✨</div>
          <div class="uhh-chat-avatar-dot"></div>
        </div>
        <div class="uhh-chat-header-info">
          <div class="uhh-chat-header-name">
            <span>Nisha — AI Concierge</span>
            <svg class="uhh-wa-verified-badge" width="15" height="15" viewBox="0 0 24 24" fill="#00A884"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </div>
          <div class="uhh-chat-header-status" id="uhh-chat-header-status">The Unique Haven Homes · Online</div>
        </div>
        <div class="uhh-chat-header-actions">
          <a href="tel:+919450055554" class="uhh-header-icon-btn" title="Call Host (+91 94500 55554)" aria-label="Call">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          </a>
          <a href="https://wa.me/919450055554?text=Namaste!%20I%20am%20looking%20for%20stay%20at%20Unique%20Haven%20Homes." target="_blank" rel="noopener" class="uhh-header-icon-btn" title="Direct WhatsApp" aria-label="WhatsApp">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
          </a>
          <button id="uhh-chat-voice-toggle" class="uhh-chat-voice-toggle ${_autoVoice ? 'active' : 'muted'}" title="Toggle Voice" aria-label="Toggle Voice">
            ${_autoVoice ? '🔊' : '🔈'}
          </button>
          <button class="uhh-chat-close" onclick="UHH_Chat.close()" aria-label="Close chat">✕</button>
        </div>
      </div>
      <div class="uhh-chat-msgs" id="uhh-chat-msgs">
        <div class="uhh-wa-security-banner">
          <span>🔒 Messages are encrypted & verified · 24/7 Concierge (Save 15% Direct)</span>
        </div>
      </div>
      <div class="uhh-quick-replies" id="uhh-qr-bar"></div>

      <!-- Real-time Voice Status Bar with Barge-in Interruption Button -->
      <div id="uhh-chat-voice-status" class="uhh-chat-status-bar">
        <div id="uhh-chat-status-text">Sun rahi hoon… Boliye</div>
        <button id="uhh-chat-interrupt-btn" class="uhh-chat-interrupt-btn">⏹️ Ruk jao / Boliye</button>
      </div>

      <div class="uhh-chat-input-row">
        <button type="button" class="uhh-wa-input-emoji" title="Emoji">😊</button>
        <textarea id="uhh-chat-input" placeholder="Type a message..." rows="1"></textarea>
        <button id="uhh-chat-mic-btn" class="uhh-chat-mic-btn" title="Bol kar poochhein (Mic)" aria-label="Speak">🎙️</button>
        <button id="uhh-chat-send" aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    `;
    document.body.appendChild(panel);

    // Toggle voice button in header
    const voiceToggle = panel.querySelector('#uhh-chat-voice-toggle');
    if (voiceToggle) {
      voiceToggle.addEventListener('click', () => {
        _autoVoice = !_autoVoice;
        if (_autoVoice) {
          voiceToggle.classList.remove('muted');
          voiceToggle.textContent = '🔊';
          if (window.nishaAI) window.nishaAI.unlockAudio();
        } else {
          voiceToggle.classList.add('muted');
          voiceToggle.textContent = '🔈';
          if (window.nishaAI) window.nishaAI.stopSpeaking();
          if (_currentSpeakingBtn) {
            _currentSpeakingBtn.classList.remove('speaking');
            const txt = _currentSpeakingBtn.querySelector('.uhh-spk-txt');
            const ico = _currentSpeakingBtn.querySelector('.uhh-spk-ico');
            if (txt) txt.textContent = 'Suniye';
            if (ico) ico.textContent = '▶';
            _currentSpeakingBtn = null;
          }
          updateVoiceStatus('idle');
        }
      });
    }

    // Interrupt button listener (barge-in)
    const interruptBtn = panel.querySelector('#uhh-chat-interrupt-btn');
    if (interruptBtn) {
      interruptBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        interruptNishaAndListen();
      });
    }

    // Voice mic button in input bar
    const micBtn = panel.querySelector('#uhh-chat-mic-btn');
    const input = panel.querySelector('#uhh-chat-input');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (!window.nishaAI) return;
        window.nishaAI.unlockAudio();

        // If Nisha is currently speaking, barge in and start listening immediately!
        if (window.nishaAI.isSpeaking) {
          interruptNishaAndListen();
          return;
        }

        // If currently listening, toggle off
        if (window.nishaAI.isListening) {
          window.nishaAI.stopListening();
          micBtn.classList.remove('listening');
          input.placeholder = 'Type a message...';
          updateVoiceStatus('idle');
          return;
        }

        // Normal start
        _voiceTurn = true;
        startListeningMode();
      });
    }

    // Hook engine state change to keep UI in sync
    if (window.nishaAI) {
      window.nishaAI.onStateChange = (state, extra) => {
        const headerStatus = document.getElementById('uhh-chat-header-status');
        if (state === 'speaking') {
          if (headerStatus) { headerStatus.textContent = '🔊 Nisha bol rahi hain…'; headerStatus.classList.remove('typing'); }
          updateVoiceStatus('speaking', '🔊 Nisha bol rahi hain…');
        } else if (state === 'listening') {
          if (headerStatus) { headerStatus.textContent = '🎙️ Listening to you…'; headerStatus.classList.remove('typing'); }
          updateVoiceStatus('listening', extra ? `🎙️ "${extra}…"` : '🎙️ Sun rahi hoon… Boliye');
        } else if (state === 'processing') {
          if (headerStatus) { headerStatus.textContent = 'typing…'; headerStatus.classList.add('typing'); }
          updateVoiceStatus('processing', 'Nisha soch rahi hain…');
        } else if (state === 'idle') {
          if (headerStatus) { headerStatus.textContent = 'The Unique Haven Homes · Online'; headerStatus.classList.remove('typing'); }
          updateVoiceStatus('idle');
        }
      };
    }

    // Wire events
    panel.querySelector('#uhh-chat-send').addEventListener('click', sendUserMessage);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendUserMessage(); }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 80) + 'px';
      // If user starts typing while Nisha is speaking, stop Nisha
      if (window.nishaAI && window.nishaAI.isSpeaking) {
        window.nishaAI.stopSpeaking();
        updateVoiceStatus('idle');
      }
    });

    // Send greeting after short delay
    setTimeout(() => {
      addBotMessage({
        text: 'Namaste! 🙏 Main **Nisha** hoon, aapki 24/7 AI Concierge at **The Unique Haven Homes**.\n\nLucknow mein luxury homestays, private pool villas, live availability ya **15% direct discount** ke liye batayein — kaise madad karoon?',
        quickReplies: [
          '💰 Rates & Pricing',
          '🏢 3BHK Luxury Flats',
          '🏰 Private Pool Villas',
          '❤️ Couple Friendly?',
          '📍 Near Lulu Mall',
          '🍳 Kitchen & Cook',
          '📅 Direct Booking'
        ]
      });
    }, 350);

    setTimeout(() => input.focus(), 450);
  }

  function closeChat() {
    _chatOpen = false;
    if (window.nishaAI) {
      window.nishaAI.stopSpeaking();
      window.nishaAI.stopListening();
    }
    const backdrop = document.getElementById('uhh-chat-backdrop');
    if (backdrop) {
      backdrop.classList.remove('active');
      setTimeout(() => backdrop.remove(), 250);
    }
    const panel = document.getElementById('uhh-chat-panel');
    if (!panel) return;
    panel.classList.add('closing');
    setTimeout(() => panel.remove(), 250);
  }

  // ── RENDER MESSAGES ─────────────────────────────────────────────
  function addBotMessage(reply) {
    const msgs = document.getElementById('uhh-chat-msgs');
    const qrBar = document.getElementById('uhh-qr-bar');
    const headerStatus = document.getElementById('uhh-chat-header-status');
    if (!msgs) return;

    if (headerStatus) {
      headerStatus.textContent = 'typing…';
      headerStatus.classList.add('typing');
    }

    // WhatsApp Typing indicator
    const typing = document.createElement('div');
    typing.className = 'uhh-msg bot';
    typing.innerHTML = `<div class="uhh-typing"><span></span><span></span><span></span></div>`;
    msgs.appendChild(typing);
    msgs.scrollTop = msgs.scrollHeight;

    setTimeout(() => {
      typing.remove();
      if (headerStatus) {
        headerStatus.textContent = 'The Unique Haven Homes · Online';
        headerStatus.classList.remove('typing');
      }

      const msg = document.createElement('div');
      msg.className = 'uhh-msg bot';

      // Format **bold** text
      const formatted = (reply.text || '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const cleanSpeech = (reply.text || '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/[*#_~`]/g, '')
        .replace(/https?:\/\/\S+/gi, '')
        .replace(/[•→➔➜]/g, ', ')
        .replace(/₹\s*(\d+)/g, 'Rupees $1')
        .trim();

      let html = `<div class="uhh-msg-bubble">
        <div class="uhh-msg-content">${formatted}</div>`;

      // WhatsApp Business Product Catalog Card
      if (reply.card) {
        const c = reply.card;
        html += `
        <div class="uhh-wa-card">
          <div class="uhh-wa-card-media">
            <img src="${c.image}" alt="${c.title}" loading="lazy" />
            <span class="uhh-wa-card-badge">⭐ ${c.rating}</span>
          </div>
          <div class="uhh-wa-card-body">
            <div class="uhh-wa-card-title">${c.title}</div>
            <div class="uhh-wa-card-sub">${c.subtitle}</div>
            <div class="uhh-wa-card-price">
              <span class="uhh-wa-card-amount">${c.price}</span>
              <span class="uhh-wa-card-per">${c.period}</span>
              <span class="uhh-wa-card-save">Save 15% Direct</span>
            </div>
            ${c.specs && c.specs.length ? `<div class="uhh-wa-card-tags">${c.specs.map(s => `<span class="uhh-wa-tag">${s}</span>`).join('')}</div>` : ''}
            <div class="uhh-wa-card-btns">
              <a href="${c.link}" target="_blank" rel="noopener" class="uhh-wa-btn secondary">📸 View Photos</a>
              <a href="${c.waUrl}" target="_blank" rel="noopener" class="uhh-wa-btn primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
                Book on WhatsApp
              </a>
            </div>
          </div>
        </div>`;
      }

      // WhatsApp Voice Note Preview Bar
      html += `
        <div class="uhh-wa-voice-note">
          <button class="uhh-speak-msg-btn" title="Nisha ki Sarvam Bulbul voice me suniye" aria-label="Listen Voice Note">
            <span class="uhh-spk-ico">▶</span>
            <span class="uhh-spk-txt">Suniye</span>
          </button>
          <div class="uhh-wa-waveform">
            <span class="uhh-wave-bar" style="height:8px"></span>
            <span class="uhh-wave-bar" style="height:14px"></span>
            <span class="uhh-wave-bar" style="height:10px"></span>
            <span class="uhh-wave-bar" style="height:16px"></span>
            <span class="uhh-wave-bar" style="height:12px"></span>
            <span class="uhh-wave-bar" style="height:15px"></span>
            <span class="uhh-wave-bar" style="height:9px"></span>
            <span class="uhh-wave-bar" style="height:13px"></span>
          </div>
          <span class="uhh-wa-voice-meta">Voice Note</span>
        </div>`;

      if (reply.actions && reply.actions.length && !reply.card) {
        html += `<div class="uhh-msg-actions">${reply.actions.map(a =>
          `<a href="${a.url}" target="_blank" rel="noopener" class="uhh-msg-action-btn ${a.isPrimary ? 'primary' : ''}">${a.label}</a>`
        ).join('')}</div>`;
      }

      const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      html += `<div class="uhh-msg-meta"><span class="uhh-msg-time">${nowTime}</span></div>`;
      html += `</div>`; // closes .uhh-msg-bubble

      msg.innerHTML = html;
      msgs.appendChild(msg);
      msgs.scrollTop = msgs.scrollHeight;

      // Attach speak button listener
      const spkBtn = msg.querySelector('.uhh-speak-msg-btn');
      if (spkBtn) {
        const toggleSpeakThis = () => {
          if (!window.nishaAI) return;
          window.nishaAI.unlockAudio();

          if (spkBtn.classList.contains('speaking')) {
            window.nishaAI.stopSpeaking();
            spkBtn.classList.remove('speaking');
            spkBtn.querySelector('.uhh-spk-txt').textContent = 'Suniye';
            spkBtn.querySelector('.uhh-spk-ico').textContent = '▶';
            _currentSpeakingBtn = null;
            updateVoiceStatus('idle');
          } else {
            if (_currentSpeakingBtn && _currentSpeakingBtn !== spkBtn) {
              _currentSpeakingBtn.classList.remove('speaking');
              const prevTxt = _currentSpeakingBtn.querySelector('.uhh-spk-txt');
              const prevIco = _currentSpeakingBtn.querySelector('.uhh-spk-ico');
              if (prevTxt) prevTxt.textContent = 'Suniye';
              if (prevIco) prevIco.textContent = '▶';
            }
            spkBtn.classList.add('speaking');
            spkBtn.querySelector('.uhh-spk-txt').textContent = 'Bol rahi hain…';
            spkBtn.querySelector('.uhh-spk-ico').textContent = '⏹️';
            _currentSpeakingBtn = spkBtn;
            updateVoiceStatus('speaking', '🔊 Nisha bol rahi hain…');

            window.nishaAI.speak(cleanSpeech, () => {
              spkBtn.classList.remove('speaking');
              spkBtn.querySelector('.uhh-spk-txt').textContent = 'Suniye';
              spkBtn.querySelector('.uhh-spk-ico').textContent = '▶';
              if (_currentSpeakingBtn === spkBtn) _currentSpeakingBtn = null;
              updateVoiceStatus('idle');

              // If this was a voice turn, listen for next query automatically!
              if (_autoVoice && _voiceTurn && _chatOpen) {
                setTimeout(() => {
                  if (_chatOpen && !window.nishaAI.isSpeaking) {
                    startListeningMode();
                  }
                }, 350);
              }
            });
          }
        };

        spkBtn.addEventListener('click', toggleSpeakThis);

        // If Auto Voice is turned on, speak automatically!
        if (_autoVoice && window.nishaAI && cleanSpeech) {
          toggleSpeakThis();
        }
      }

      // Quick replies
      if (qrBar) {
        qrBar.innerHTML = (reply.quickReplies || []).map(qr =>
          `<button class="uhh-qr" onclick="UHH_Chat.quickReply('${qr.replace(/'/g, "\\'")}')">${qr}</button>`
        ).join('');
      }
    }, 600 + Math.random() * 300);
  }

  async function sendUserMessage() {
    const input = document.getElementById('uhh-chat-input');
    const msgs  = document.getElementById('uhh-chat-msgs');
    if (!input || !msgs) return;
    const text = input.value.trim();
    if (!text) return;

    // Stop ongoing speech before sending next query
    if (window.nishaAI) window.nishaAI.stopSpeaking();
    updateVoiceStatus('idle');
    if (_currentSpeakingBtn) {
      _currentSpeakingBtn.classList.remove('speaking');
      const prevTxt = _currentSpeakingBtn.querySelector('.uhh-spk-txt');
      const prevIco = _currentSpeakingBtn.querySelector('.uhh-spk-ico');
      if (prevTxt) prevTxt.textContent = 'Suniye';
      if (prevIco) prevIco.textContent = '▶';
      _currentSpeakingBtn = null;
    }

    input.value = '';
    input.style.height = 'auto';

    // Clear quick replies
    const qrBar = document.getElementById('uhh-qr-bar');
    if (qrBar) qrBar.innerHTML = '';

    // WhatsApp Outgoing Bubble with Blue Double Ticks (✓✓)
    const userMsg = document.createElement('div');
    userMsg.className = 'uhh-msg user';
    const nowTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    userMsg.innerHTML = `
      <div class="uhh-msg-bubble">
        <div class="uhh-msg-content">${text}</div>
        <div class="uhh-msg-meta">
          <span class="uhh-msg-time">${nowTime}</span>
          <span class="uhh-wa-ticks" title="Read by Concierge">✓✓</span>
        </div>
      </div>
    `;
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
