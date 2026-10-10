/* ══════════════════════════════════════════════════════════════════
   THE UNIQUE HAVEN HOMES — LIVE PRICE SYNC
   Fetches current rates from Supabase → property_rates table
   and patches all price displays on the page in real-time.
   
   Usage: Include this AFTER config.js and supabase CDN script.
   No extra config needed — uses window.SUPABASE_URL / SUPABASE_ANON_KEY.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── How often to re-check for price changes (ms). 5 min default.
  const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

  // ── Cache key in sessionStorage so we don't hit Supabase every page load
  const CACHE_KEY = 'uhh_price_cache';
  const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

  // ── Mapping from data-room-id → DOM selectors to update
  // Handles both the directory cards and the map popup prices
  function getSupabaseClient() {
    if (window.sb) return window.sb;
    if (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      return window.sb;
    }
    return null;
  }

  // ── Format price as Indian Rupees string
  function formatPrice(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
  }

  const ROOM_SLUG_MAP = {
    'VIL-102': 'royal-white-house',
    'GOM-102': 'black-beauty',
    'GOM-501': 'starlight-blue-penthouse',
    'VIL-101': 'gomti-grand-villa',
    'LUL-402': 'celebrity-garden',
    'GOM-101': 'redrose-palace',
    'GOM-201': 'the-dark-blue',
    'VIL-105': 'the-yellow-house',
    'VIL-104': 'the-green-house',
    'VIL-107': 'the-velvet-house',
    'VIL-103': 'the-pink-house',
    'GOM-301': 'the-light-green',
    'GOM-202': 'the-brown',
    'GOM-401': 'the-nawabi-stay',
    'GOM-302': 'the-unique',
    'VIL-106': 'green-forest',
    'VIL-108': 'pink-paradise'
  };

  // ── Patch a single property card with new price data
  function patchCard(card, rate) {
    if (!card || !rate) return;

    // 1. Vesper Stay Cards Price
    card.querySelectorAll('.vesper-stay-price').forEach(el => {
      el.innerHTML = formatPrice(rate.base_price) + ' <small>/ night</small>';
    });

    // 2. Vesper Stay Cards Strike-Through Price (Saved ~15-25% direct)
    card.querySelectorAll('.vesper-stay-price-strike').forEach(el => {
      const strike = rate.airbnb_price || Math.round(rate.base_price * 1.25);
      el.textContent = formatPrice(strike);
    });

    // 3. Price badge / display across directory cards
    const priceSelectors = [
      '.dir-price', '.dir-price-val', '.property-price',
      '[data-price]', '.price-night', '.card-price', '.dir-card-price-main'
    ];
    priceSelectors.forEach(sel => {
      card.querySelectorAll(sel).forEach(el => {
        el.textContent = formatPrice(rate.base_price) + ' / night';
      });
    });

    // 4. Guest count badge
    const guestSelectors = ['.dir-guests', '.guest-count', '[data-guests]', '.vesper-stay-spec-pill'];
    guestSelectors.forEach(sel => {
      card.querySelectorAll(sel).forEach(el => {
        if (/👥\s*Up to|\d+\s*(guests?|person)/i.test(el.textContent)) {
          el.textContent = '👥 Up to ' + (rate.max_guests || 10);
        }
      });
    });

    // Mark card as price-synced
    card.setAttribute('data-price-synced', 'true');
    card.setAttribute('data-live-price', rate.base_price);
  }

  // ── Patch map marker popups
  function patchMapMarkers(rateMap) {
    if (!window._propertyMarkers) return;
    Object.entries(window._propertyMarkers).forEach(([roomId, { marker, prop }]) => {
      const rate = rateMap[roomId];
      if (!rate) return;

      // Update the prop object so future popup rebuilds use new price
      prop.price = formatPrice(rate.base_price);

      // Also update the live popup content if it's open
      const popup = marker.getPopup();
      if (popup) {
        const content = popup.getContent();
        if (typeof content === 'string') {
          const updated = content.replace(
            /₹[\d,]+\s*\/\s*night/g,
            formatPrice(rate.base_price) + ' / night'
          );
          popup.setContent(updated);
        }
      }
    });
  }

  // ── Update PROPERTY_PINS array (used by website-sync.js map)
  function patchPropertyPins(rateMap) {
    if (!window.PROPERTY_PINS) return;
    window.PROPERTY_PINS.forEach(pin => {
      const rate = rateMap[pin.roomId];
      if (rate) pin.price = formatPrice(rate.base_price);
    });
  }

  // ── Update UHH_PHOTO_DB (directory-photos.js static data fallback)
  function patchPhotoDb(rateMap) {
    if (!window.UHH_PHOTO_DB) return;
    Object.values(window.UHH_PHOTO_DB).forEach(prop => {
      const rate = rateMap[prop.id];
      if (rate) {
        prop.base_price = rate.base_price;
        if (rate.airbnb_price) prop.airbnb_price = rate.airbnb_price;
        if (rate.max_guests) prop.max_guests = rate.max_guests;
      }
    });
  }

  // ── Main: fetch rates and apply to page
  async function syncPrices(forceRefresh = false) {
    try {
      // Check cache first
      if (!forceRefresh) {
        try {
          const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
          if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) {
            applyRates(cached.data);
            return;
          }
        } catch (_) {}
      }

      const sb = getSupabaseClient();
      if (!sb) {
        console.warn('[UHH PriceSync] Supabase not ready – using static prices');
        return;
      }

      let rates = null;

      // 1. Primary: Query the live 'rooms' table which exists and has rent_per_night
      try {
        const { data: roomsData, error: roomsErr } = await sb
          .from('rooms')
          .select('room_id, property_name, nickname, rent_per_night, max_guests')
          .order('room_id');
        
        if (!roomsErr && roomsData && roomsData.length > 0) {
          rates = roomsData.map(r => ({
            room_id: r.room_id,
            slug: ROOM_SLUG_MAP[r.room_id] || '',
            property_name: r.nickname || r.property_name,
            base_price: Number(r.rent_per_night) || 4500,
            max_guests: r.max_guests || 6
          }));
        }
      } catch (_) {}

      // 2. Secondary fallback: property_rates if available
      if (!rates || rates.length === 0) {
        try {
          const { data, error } = await sb
            .from('property_rates')
            .select('room_id, slug, property_name, base_price, airbnb_price, max_guests, updated_at')
            .eq('is_active', true);
          if (!error && data && data.length > 0) rates = data;
        } catch (_) {}
      }

      if (!rates || rates.length === 0) return;

      // Save to cache
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: rates }));
      } catch (_) {}

      applyRates(rates);
      console.log(`[UHH PriceSync] ✅ Synced live CRM rates for ${rates.length} properties`);

    } catch (err) {
      console.warn('[UHH PriceSync] Silent fail:', err.message);
    }
  }

  // ── Apply fetched rates to the DOM
  function applyRates(rates) {
    const rateMap = {};
    const slugMap = {};

    rates.forEach(r => {
      if (!r.slug && ROOM_SLUG_MAP[r.room_id]) {
        r.slug = ROOM_SLUG_MAP[r.room_id];
      }
      rateMap[r.room_id] = r;
      if (r.slug) slugMap[r.slug] = r;
    });

    // Expose globally for vesper-hero.js and other components
    window.UHH_LIVE_RATES = { ...rateMap, ...slugMap };

    // 1. Patch all Vesper Stay cards in the collection
    document.querySelectorAll('.vesper-stay-card').forEach(card => {
      const roomId = card.dataset.roomId || card.getAttribute('data-room-id');
      const slug = card.dataset.slug || card.getAttribute('data-slug');
      const rate = (roomId && rateMap[roomId]) || (slug && slugMap[slug]);
      if (rate) patchCard(card, rate);
    });

    // 2. Patch all directory cards
    document.querySelectorAll('.dir-card[data-room-id]').forEach(card => {
      const roomId = card.dataset.roomId;
      patchCard(card, rateMap[roomId]);
    });

    // 3. Patch data-slug based elements
    document.querySelectorAll('[data-slug]').forEach(card => {
      const slug = card.dataset.slug;
      if (slugMap[slug]) patchCard(card, slugMap[slug]);
    });

    // 4. Update Hero Featured Villa pricing dynamically from CRM
    const rwhRate = slugMap['royal-white-house'] || rateMap['VIL-102'];
    if (rwhRate) {
      document.querySelectorAll('.vesper-subcopy strong').forEach(el => {
        el.textContent = 'From ' + formatPrice(rwhRate.base_price) + ' / night';
      });
    }

    // 4b. Update Mobile Floating Bar Starting Price dynamically from CRM
    const validPrices = rates.map(r => Number(r.base_price)).filter(p => p > 0);
    if (validPrices.length > 0) {
      const minStartingPrice = Math.min(...validPrices);
      document.querySelectorAll('.vesper-mobile-sticky-price, #vesperStickyMinPrice').forEach(el => {
        el.innerHTML = 'From ' + formatPrice(minStartingPrice) + ' <small>/ nt</small>';
      });
    }

    // 5. Patch map markers
    patchMapMarkers(rateMap);

    // 6. Patch PROPERTY_PINS
    patchPropertyPins(rateMap);

    // 7. Patch in-memory UHH_PHOTO_DB
    patchPhotoDb(rateMap);

    // 8. Dispatch custom event so other scripts can react
    window.dispatchEvent(new CustomEvent('uhh:pricesSynced', { detail: { rateMap, slugMap } }));
  }

  // ── Boot: run on DOMContentLoaded then poll every REFRESH_INTERVAL_MS
  function boot() {
    // Wait a short tick so Supabase client has time to init from config.js
    setTimeout(() => {
      syncPrices();
      setInterval(() => syncPrices(true), REFRESH_INTERVAL_MS);
    }, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ── Expose manual refresh for admin panel
  window.UHH_PriceSync = {
    refresh: () => syncPrices(true),
    clearCache: () => {
      try { sessionStorage.removeItem(CACHE_KEY); } catch (_) {}
    }
  };

})();
