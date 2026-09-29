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

  // ── Patch a single property card with new price data
  function patchCard(card, rate) {
    if (!card || !rate) return;

    // Price badge / display (various class names used across templates)
    const priceSelectors = [
      '.dir-price', '.dir-price-val', '.property-price',
      '[data-price]', '.price-night', '.card-price'
    ];
    priceSelectors.forEach(sel => {
      card.querySelectorAll(sel).forEach(el => {
        el.textContent = formatPrice(rate.base_price) + ' / night';
      });
    });

    // Guest count badge
    const guestSelectors = ['.dir-guests', '.guest-count', '[data-guests]'];
    guestSelectors.forEach(sel => {
      card.querySelectorAll(sel).forEach(el => {
        // Only update if element contains a number + "guests" pattern
        if (/\d+\s*(guests?|person)/i.test(el.textContent)) {
          el.textContent = rate.max_guests + ' Guests';
        }
      });
    });

    // Mark card as price-synced so we can debug easily
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

      const { data: rates, error } = await sb
        .from('property_rates')
        .select('room_id, slug, property_name, base_price, airbnb_price, max_guests, updated_at')
        .eq('is_active', true);

      if (error) {
        console.warn('[UHH PriceSync] Fetch error:', error.message);
        return;
      }

      if (!rates || rates.length === 0) return;

      // Save to cache
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: rates }));
      } catch (_) {}

      applyRates(rates);
      console.log(`[UHH PriceSync] ✅ Synced prices for ${rates.length} properties`);

    } catch (err) {
      console.warn('[UHH PriceSync] Silent fail:', err.message);
    }
  }

  // ── Apply fetched rates to the DOM
  function applyRates(rates) {
    // Build lookup by room_id
    const rateMap = {};
    rates.forEach(r => { rateMap[r.room_id] = r; });

    // 1. Patch all directory cards  
    document.querySelectorAll('.dir-card[data-room-id]').forEach(card => {
      const roomId = card.dataset.roomId;
      patchCard(card, rateMap[roomId]);
    });

    // 2. Also try data-slug based cards (some pages use slug)
    const slugMap = {};
    rates.forEach(r => { slugMap[r.slug] = r; });
    document.querySelectorAll('[data-slug]').forEach(card => {
      const slug = card.dataset.slug;
      patchCard(card, slugMap[slug]);
    });

    // 3. Patch map markers
    patchMapMarkers(rateMap);

    // 4. Patch PROPERTY_PINS
    patchPropertyPins(rateMap);

    // 5. Patch in-memory UHH_PHOTO_DB
    patchPhotoDb(rateMap);

    // 6. Dispatch custom event so other scripts can react
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
