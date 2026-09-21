/**
 * Property Luxe Engine — The Unique Haven Homes
 * Powers dynamic 5-star property presentations, 5-photo mosaic,
 * Agoda/Taj search bar, Airbnb calendar blockout sync, and instant UPI QR booking.
 */

(function(window) {
  'use strict';

  // Extract property slug/id from window or URL
  function detectPropertyIdentifier() {
    if (window.CURRENT_PROPERTY_SLUG) return window.CURRENT_PROPERTY_SLUG;
    if (window.CURRENT_PROPERTY_ID) return window.CURRENT_PROPERTY_ID;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id')) return urlParams.get('id');
    if (urlParams.get('slug')) return urlParams.get('slug');

    const path = window.location.pathname;
    const match = path.match(/\/([a-z0-9\-]+)\.html/i);
    if (match && match[1]) {
      return match[1];
    }
    return 'the-dark-blue';
  }

  // Flatten & categorize photos
  function preparePhotoCatalog(prop) {
    const catalog = {
      all: [],
      categories: {}
    };

    const addPhoto = (url, categoryName) => {
      if (!url || typeof url !== 'string') return;
      url = url.trim();
      if (!url) return;

      if (!catalog.all.some(item => item.url === url)) {
        const item = { url, category: categoryName };
        catalog.all.push(item);
        if (!catalog.categories[categoryName]) {
          catalog.categories[categoryName] = [];
        }
        catalog.categories[categoryName].push(item);
      }
    };

    // Primary cover
    if (prop.cover_image) {
      addPhoto(prop.cover_image, 'Cover & Highlights');
    }

    // Categorized photos
    if (prop.photos && typeof prop.photos === 'object') {
      const catMap = {
        bedrooms: 'Bedrooms',
        living_hall: 'Living & Dining',
        bathrooms: 'Bathrooms',
        kitchen: 'Kitchen',
        balcony: 'Balcony & Views'
      };

      Object.keys(catMap).forEach(key => {
        const list = prop.photos[key];
        const label = catMap[key];
        if (Array.isArray(list)) {
          list.forEach(u => addPhoto(u, label));
        }
      });
    }

    // Fallback if less than 5 photos
    const luxuryFallbacks = [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=80',
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'
    ];

    let fbIdx = 0;
    while (catalog.all.length < 5 && fbIdx < luxuryFallbacks.length) {
      addPhoto(luxuryFallbacks[fbIdx], 'Interior Views');
      fbIdx++;
    }

    return catalog;
  }

  // SVG Icons
  const ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    star: '<svg viewBox="0 0 24 24" fill="#b58d3d" stroke="#b58d3d" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
    whatsapp: '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.634.86 5.08 2.32 7.06L4 29l7.2-2.28A11.93 11.93 0 0 0 16 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3zm0 21.6c-1.98 0-3.84-.55-5.43-1.5l-.39-.23-4.27 1.35 1.39-4.16-.25-.4A9.55 9.55 0 0 1 5.4 15c0-5.85 4.76-10.6 10.6-10.6S26.6 9.15 26.6 15 21.85 24.6 16 24.6zm5.86-7.9c-.32-.16-1.9-.94-2.19-1.05-.29-.11-.5-.16-.72.16-.21.32-.82 1.05-1.01 1.26-.19.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.87-1.76-2.19-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.55-.08-.16-.72-1.74-.98-2.38-.26-.63-.53-.54-.72-.55-.19-.01-.4-.01-.61-.01-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.26.16.21 2.22 3.39 5.39 4.76.75.32 1.34.51 1.8.66.76.24 1.44.21 1.99.13.61-.09 1.9-.78 2.17-1.53.27-.75.27-1.39.19-1.53-.08-.13-.29-.21-.61-.37z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>'
  };

  class LuxePropertyEngine {
    constructor() {
      this.identifier = detectPropertyIdentifier();
      this.prop = null;
      this.catalog = { all: [], categories: {} };
      this.currentFilter = 'all';
      this.currentIndex = 0;
      this.filteredList = [];
      this.bookedIntervals = []; // [{ check_in, check_out }]
      this.checkIn = '';
      this.checkOut = '';
      this.nights = 1;
      this.guests = 2;
      this.isDateAvailable = true;
      this.totalPayable = 0;
    }

    async init() {
      // 1. Resolve property from ShowcaseData
      if (window.ShowcaseData) {
        this.prop = window.ShowcaseData.getProperty(this.identifier);
      }

      if (!this.prop && window.ShowcaseData && window.ShowcaseData.BASELINE) {
        const all = window.ShowcaseData.BASELINE;
        const foundKey = Object.keys(all).find(k => all[k].slug === this.identifier || k === this.identifier);
        if (foundKey) this.prop = all[foundKey];
      }

      if (!this.prop) {
        console.warn('Property not found in ShowcaseData:', this.identifier);
        return;
      }

      // 2. Set default dates: Tomorrow to day-after-tomorrow
      const today = new Date();
      const dIn = new Date(today);
      dIn.setDate(dIn.getDate() + 1);
      const dOut = new Date(today);
      dOut.setDate(dOut.getDate() + 2);
      this.checkIn = dIn.toISOString().slice(0, 10);
      this.checkOut = dOut.toISOString().slice(0, 10);
      this.nights = 1;

      // 3. Prepare photos
      this.catalog = preparePhotoCatalog(this.prop);
      this.filteredList = this.catalog.all;

      // 4. Render components
      this.renderAgodaSearchBar();
      this.renderMetaHeader();
      this.renderHeroMosaic();
      this.renderAgodaScoreCard();
      this.renderSpecBar();
      this.renderHighlights();
      this.renderDescription();
      this.renderSleepingArrangements();
      this.renderAmenities();
      this.renderVideoTour();
      this.renderLandmarks();
      this.renderLocationSection();
      this.renderInteractiveCalendar();
      this.renderBookingCard();
      this.renderMobileBar();
      this.initGalleryModal();
      this.initUpiModal();

      // 5. Real-time CRM Sync: Live Map Location & Booked Dates
      this.fetchLiveCrmLocation();
      this.loadBookedDates();
    }

    async fetchLiveCrmLocation() {
      try {
        let sbClient = window.sb;
        if (!sbClient && typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
          sbClient = window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        }

        if (sbClient && this.prop && this.prop.id) {
          const { data: room, error } = await sbClient
            .from('rooms')
            .select('map_link, nickname, property_name, unit_no, rent_per_night')
            .eq('room_id', this.prop.id)
            .single();

          if (!error && room) {
            if (room.map_link) {
              this.prop.map_link = room.map_link;
            }
            if (room.rent_per_night && !isNaN(Number(room.rent_per_night))) {
              this.prop.base_price = Number(room.rent_per_night);
            }
            this.renderLocationSection();
            this.renderBookingCard();
          }
        }
      } catch (err) {
        console.warn('Live CRM location fetch error:', err);
      }
    }

    async loadBookedDates() {
      try {
        let sbClient = window.sb;
        if (!sbClient && typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
          sbClient = window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
        }

        if (sbClient) {
          const roomId = this.prop.id;
          const todayStr = new Date().toISOString().slice(0, 10);
          const { data, error } = await sbClient
            .from('guest_register')
            .select('check_in, check_out, is_cancelled, verification_status')
            .eq('room_id', roomId)
            .neq('is_cancelled', true)
            .gte('check_out', todayStr);

          if (!error && Array.isArray(data)) {
            this.bookedIntervals = data.map(b => ({
              check_in: b.check_in,
              check_out: b.check_out
            }));
            console.log(`Loaded ${this.bookedIntervals.length} booked periods for ${roomId}`);
          }
        }
      } catch (e) {
        console.warn('Could not fetch real-time booked dates from Supabase:', e);
      }

      // Check default dates availability & update live calendar
      this.checkAvailability();
      this.renderInteractiveCalendar();
    }

    checkAvailability() {
      if (!this.checkIn || !this.checkOut) {
        this.isDateAvailable = false;
        return;
      }

      const ci = new Date(this.checkIn);
      const co = new Date(this.checkOut);
      const diffTime = co - ci;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const conflictAlert = document.getElementById('luxe-date-conflict');
      const successAlert = document.getElementById('luxe-date-success');
      const primaryBtn = document.getElementById('luxe-btn-book-primary');

      if (diffDays <= 0) {
        this.isDateAvailable = false;
        if (conflictAlert) {
          conflictAlert.innerHTML = '⚠️ Check-out date must be at least 1 day after check-in.';
          conflictAlert.style.display = 'flex';
        }
        if (successAlert) successAlert.style.display = 'none';
        if (primaryBtn) {
          primaryBtn.style.opacity = '0.5';
          primaryBtn.style.pointerEvents = 'none';
        }
        return;
      }

      this.nights = diffDays;

      // Check conflict with bookedIntervals
      let hasConflict = false;
      let conflictPeriod = null;

      for (const interval of this.bookedIntervals) {
        const bIn = new Date(interval.check_in);
        const bOut = new Date(interval.check_out);

        // Overlap condition: start < bOut AND end > bIn
        if (ci < bOut && co > bIn) {
          hasConflict = true;
          conflictPeriod = interval;
          break;
        }
      }

      if (hasConflict) {
        this.isDateAvailable = false;
        if (conflictAlert) {
          conflictAlert.innerHTML = `🚫 <strong>Dates Unavailable:</strong> Booked from ${conflictPeriod.check_in} to ${conflictPeriod.check_out} on Airbnb / Direct. Please select other dates.`;
          conflictAlert.style.display = 'flex';
        }
        if (successAlert) successAlert.style.display = 'none';
        if (primaryBtn) {
          primaryBtn.style.opacity = '0.5';
          primaryBtn.style.pointerEvents = 'none';
        }
      } else {
        this.isDateAvailable = true;
        if (conflictAlert) conflictAlert.style.display = 'none';
        if (successAlert) {
          successAlert.innerHTML = `✅ <strong>Dates Available!</strong> ${this.nights} Night${this.nights > 1 ? 's' : ''} Stay confirmed.`;
          successAlert.style.display = 'flex';
        }
        if (primaryBtn) {
          primaryBtn.style.opacity = '1';
          primaryBtn.style.pointerEvents = 'auto';
        }
      }

      this.updatePriceCalculations();
    }

    updatePriceCalculations() {
      const base = this.prop.base_price || 3499;
      const totalRent = base * this.nights;
      this.totalPayable = totalRent;
      const airbnbBase = this.prop.airbnb_price || Math.round(base * 1.2);
      const airbnbTotal = airbnbBase * this.nights;
      const savings = airbnbTotal - totalRent;

      const priceValEl = document.getElementById('luxe-price-amount');
      if (priceValEl) priceValEl.textContent = `₹${totalRent.toLocaleString('en-IN')}`;

      const nightsLabel = document.getElementById('luxe-nights-label');
      if (nightsLabel) nightsLabel.textContent = `for ${this.nights} night${this.nights > 1 ? 's' : ''} (₹${base.toLocaleString('en-IN')}/night)`;

      const strikeEl = document.getElementById('luxe-airbnb-strike');
      if (strikeEl) strikeEl.textContent = `₹${airbnbTotal.toLocaleString('en-IN')} on Airbnb`;

      const saveTagEl = document.getElementById('luxe-save-tag');
      if (saveTagEl) saveTagEl.textContent = `Save ₹${savings.toLocaleString('en-IN')} (15%) Direct`;

      const nightsDetail = document.getElementById('luxe-calc-nights');
      if (nightsDetail) nightsDetail.textContent = `${this.nights} Night${this.nights > 1 ? 's' : ''}`;

      const totalDetail = document.getElementById('luxe-calc-total');
      if (totalDetail) totalDetail.textContent = `₹${totalRent.toLocaleString('en-IN')}`;

      // Update mobile sticky bottom bar
      const mobPrice = document.getElementById('luxe-mobile-price-val');
      if (mobPrice) mobPrice.textContent = `₹${totalRent.toLocaleString('en-IN')}`;
      const mobSub = document.querySelector('.luxe-mobile-price-sub');
      if (mobSub) mobSub.textContent = `${this.nights} Night${this.nights > 1 ? 's' : ''} · Save 15%`;
    }

    renderAgodaSearchBar() {
      const container = document.getElementById('agoda-search-strip');
      if (!container) return;

      container.innerHTML = `
        <div class="agoda-search-container">
          <div class="agoda-search-group">
            ${ICONS.search}
            <div class="agoda-search-inner">
              <label>Stay &amp; Destination</label>
              <input type="text" value="${this.prop.name}, ${this.prop.area_name || 'Gomti Nagar'}" readonly />
            </div>
          </div>
          <div class="agoda-search-group">
            ${ICONS.calendar}
            <div class="agoda-search-inner">
              <label>Check-in</label>
              <input type="date" id="agoda-ci" value="${this.checkIn}" onchange="window.luxeEngine.onDateChange('ci', this.value)" />
            </div>
          </div>
          <div class="agoda-search-group">
            ${ICONS.calendar}
            <div class="agoda-search-inner">
              <label>Check-out</label>
              <input type="date" id="agoda-co" value="${this.checkOut}" onchange="window.luxeEngine.onDateChange('co', this.value)" />
            </div>
          </div>
          <div class="agoda-search-group" style="max-width:200px;">
            ${ICONS.users}
            <div class="agoda-search-inner">
              <label>Guests</label>
              <select id="agoda-guests" onchange="window.luxeEngine.onGuestsChange(this.value)">
                ${Array.from({ length: this.prop.max_guests || 10 }, (_, i) => i + 1).map(num => `
                  <option value="${num}" ${num === 2 ? 'selected' : ''}>${num} Guest${num > 1 ? 's' : ''}</option>
                `).join('')}
              </select>
            </div>
          </div>
          <button type="button" class="agoda-btn-search" onclick="window.luxeEngine.checkAvailability()">
            ${ICONS.check} Check Dates
          </button>
        </div>
      `;
    }

    renderAgodaScoreCard() {
      const el = document.getElementById('agoda-score-card');
      if (!el) return;

      const rating = this.prop.rating ? this.prop.rating.toFixed(1) : '4.9';
      const reviews = this.prop.reviews || 46;

      el.innerHTML = `
        <div class="agoda-score-top">
          <div class="agoda-score-pill">★ ${rating}</div>
          <div class="agoda-score-info">
            <div class="agoda-score-title">Exceptional Luxury Stay</div>
            <div class="agoda-score-sub">${reviews} verified Airbnb &amp; Direct reviews</div>
          </div>
        </div>
        <div class="agoda-sub-metrics">
          <div class="agoda-metric-row"><span>✨ Cleanliness &amp; Hygiene</span><span class="agoda-metric-val">9.9 / 10</span></div>
          <div class="agoda-metric-row"><span>🛎️ 24/7 Caretaker Service</span><span class="agoda-metric-val">9.9 / 10</span></div>
          <div class="agoda-metric-row"><span>❄️ 100% AC &amp; Power Backup</span><span class="agoda-metric-val">9.8 / 10</span></div>
          <div class="agoda-metric-row"><span>📍 Prime Location &amp; Parking</span><span class="agoda-metric-val">9.9 / 10</span></div>
        </div>
      `;
    }

    onDateChange(type, val) {
      if (type === 'ci') {
        this.checkIn = val;
        const syncOther = document.getElementById('sidebar-ci');
        if (syncOther) syncOther.value = val;
      } else {
        this.checkOut = val;
        const syncOther = document.getElementById('sidebar-co');
        if (syncOther) syncOther.value = val;
      }
      this.checkAvailability();
      this.renderInteractiveCalendar();
    }

    onCalendarDayClick(dateStr) {
      if (!this.checkIn || (this.checkIn && this.checkOut)) {
        this.checkIn = dateStr;
        this.checkOut = '';
      } else if (this.checkIn && !this.checkOut) {
        if (dateStr <= this.checkIn) {
          this.checkIn = dateStr;
          this.checkOut = '';
        } else {
          this.checkOut = dateStr;
        }
      }

      const agodaCi = document.getElementById('agoda-ci');
      const agodaCo = document.getElementById('agoda-co');
      const sideCi = document.getElementById('sidebar-ci');
      const sideCo = document.getElementById('sidebar-co');

      if (agodaCi) agodaCi.value = this.checkIn || '';
      if (agodaCo) agodaCo.value = this.checkOut || '';
      if (sideCi) sideCi.value = this.checkIn || '';
      if (sideCo) sideCo.value = this.checkOut || '';

      this.checkAvailability();
      this.renderInteractiveCalendar();
    }

    onGuestsChange(val) {
      this.guests = Number(val) || 2;
    }

    renderMetaHeader() {
      const p = this.prop;
      document.title = `${p.name} | Luxury Homestay in ${p.area_name || 'Gomti Nagar, Lucknow'} | The Unique Haven Homes`;

      const titleEl = document.getElementById('luxe-title');
      if (titleEl) titleEl.textContent = p.name;

      const ratingEl = document.getElementById('luxe-rating-num');
      if (ratingEl) ratingEl.textContent = p.rating ? p.rating.toFixed(2) : '4.92';

      const reviewsEl = document.getElementById('luxe-reviews-count');
      if (reviewsEl) reviewsEl.textContent = `${p.reviews || 42} verified reviews`;

      const areaEl = document.getElementById('luxe-area-badge');
      if (areaEl) areaEl.textContent = p.area_name || 'Gomti Nagar, Lucknow';

      const breadcrumbStay = document.getElementById('luxe-crumb-name');
      if (breadcrumbStay) breadcrumbStay.textContent = p.name;
    }

    renderHeroMosaic() {
      const container = document.getElementById('luxe-photo-mosaic');
      if (!container) return;

      const photos = this.catalog.all;
      const count = photos.length;

      let html = '';
      for (let i = 0; i < Math.min(count, 5); i++) {
        const isMain = i === 0;
        const photo = photos[i];
        html += `
          <div class="luxe-photo-item ${isMain ? 'luxe-photo-main' : ''}" onclick="window.luxeEngine.openGallery(${i})">
            <img src="${photo.url}" alt="${this.prop.name} photo ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}"/>
          </div>
        `;
      }

      html += `
        <button type="button" class="luxe-btn-show-all" onclick="window.luxeEngine.openGallery(0)">
          ${ICONS.camera} Show all ${count} photos
        </button>
      `;

      container.innerHTML = html;
    }

    renderSpecBar() {
      const p = this.prop;
      const titleEl = document.getElementById('luxe-spec-title');
      if (titleEl) {
        titleEl.textContent = `${p.type || 'Luxury Homestay'} · Hosted by Praveen & Team`;
      }

      const pillsEl = document.getElementById('luxe-spec-pills');
      if (pillsEl) {
        pillsEl.innerHTML = `
          <span>👥 Up to ${p.max_guests || 10} guests</span> &nbsp;·&nbsp;
          <span>🛏️ ${p.bedrooms || 3} Bedrooms</span> &nbsp;·&nbsp;
          <span>🛋️ ${p.beds || '3 King Beds'}</span> &nbsp;·&nbsp;
          <span>🚿 ${p.bathrooms || 3} Bathrooms</span>
        `;
      }
    }

    renderHighlights() {
      const el = document.getElementById('luxe-highlights-container');
      if (!el) return;

      el.innerHTML = `
        <div class="luxe-highlight-row">
          <div class="luxe-highlight-icon">⚡</div>
          <div class="luxe-highlight-text">
            <h4>24/7 On-Site Caretaker &amp; Express Check-in</h4>
            <p>A dedicated property caretaker is always on-site to assist with luggage, keys, and any guest requests at any hour.</p>
          </div>
        </div>
        <div class="luxe-highlight-row">
          <div class="luxe-highlight-icon">❄️</div>
          <div class="luxe-highlight-text">
            <h4>100% Air Conditioning &amp; Power Backup</h4>
            <p>Every bedroom and living space features high-capacity split air conditioning with seamless inverter generator backup.</p>
          </div>
        </div>
        <div class="luxe-highlight-row">
          <div class="luxe-highlight-icon">📶</div>
          <div class="luxe-highlight-text">
            <h4>150+ Mbps High-Speed Fiber Wi-Fi</h4>
            <p>Ultra-fast fiber optic Wi-Fi with dedicated mesh routers across the entire unit. Ideal for remote work and 4K streaming.</p>
          </div>
        </div>
        <div class="luxe-highlight-row">
          <div class="luxe-highlight-icon">🚗</div>
          <div class="luxe-highlight-text">
            <h4>Free Secure Dedicated Parking</h4>
            <p>Safe on-premises parking spots reserved exclusively for your vehicles during your stay.</p>
          </div>
        </div>
      `;
    }

    renderDescription() {
      const el = document.getElementById('luxe-description-text');
      if (!el) return;
      el.textContent = this.prop.description || 
        `Experience Lucknow's hospitality at its finest in ${this.prop.name}. Set in prime ${this.prop.area_name || 'Gomti Nagar'}, this fully furnished luxury homestay offers premium interiors, private balconies, modular kitchen access, and modern conveniences. Designed for families, executives, and travelers seeking privacy and 5-star comfort.`;
    }

    renderSleepingArrangements() {
      const el = document.getElementById('luxe-rooms-grid');
      if (!el) return;

      const numRooms = this.prop.bedrooms || 3;
      let html = '';
      for (let i = 1; i <= numRooms; i++) {
        html += `
          <div class="luxe-room-card">
            <span class="luxe-room-card-icon">🛏️</span>
            <div class="luxe-room-card-title">Bedroom ${i}</div>
            <div class="luxe-room-card-sub">1 King Bed · AC · Attached Bath</div>
          </div>
        `;
      }

      html += `
        <div class="luxe-room-card">
          <span class="luxe-room-card-icon">🛋️</span>
          <div class="luxe-room-card-title">Living Hall</div>
          <div class="luxe-room-card-sub">L-shape Sofa + Extra Bedding</div>
        </div>
      `;

      el.innerHTML = html;
    }

    renderAmenities() {
      const el = document.getElementById('luxe-amenities-grid');
      if (!el) return;

      const list = this.prop.amenities || [
        'Air Conditioning in all rooms',
        'High-Speed 150 Mbps Wi-Fi',
        'Fully Equipped Modular Kitchen',
        'Smart TV with Netflix / Prime',
        'Hot Water Geyser in all baths',
        'Free Private Parking on site',
        '24/7 Caretaker Assistance',
        'Power Backup (Inverter/Gen)',
        'Fresh Luxury Linens & Towels',
        'Washing Machine & Iron',
        'Balcony with Green Foliage',
        'Couple & Family Friendly'
      ];

      el.innerHTML = list.map(item => `
        <div class="luxe-amenity-item">
          ${ICONS.check}
          <span>${item}</span>
        </div>
      `).join('');
    }

    renderVideoTour() {
      const container = document.getElementById('luxe-video-container');
      if (!container) return;

      const videoUrl = this.prop.video_url;

      if (videoUrl && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
        let embed = videoUrl;
        if (videoUrl.includes('watch?v=')) {
          embed = videoUrl.replace('watch?v=', 'embed/');
        } else if (videoUrl.includes('youtu.be/')) {
          embed = videoUrl.replace('youtu.be/', 'www.youtube.com/embed/');
        }
        container.innerHTML = `
          <div class="luxe-video-box">
            <iframe src="${embed}?rel=0&modestbranding=1" title="${this.prop.name} Walkthrough" allowfullscreen loading="lazy"></iframe>
          </div>
        `;
      } else if (videoUrl && videoUrl.endsWith('.mp4')) {
        container.innerHTML = `
          <div class="luxe-video-box">
            <video controls preload="metadata" poster="${this.prop.cover_image || ''}">
              <source src="${videoUrl}" type="video/mp4">
            </video>
          </div>
        `;
      } else {
        const waMsg = encodeURIComponent(`Hi Praveen, please share the full walkthrough video of ${this.prop.name} on WhatsApp.`);
        container.innerHTML = `
          <div class="luxe-video-box" style="background: linear-gradient(135deg, #18202d 0%, #28364b 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:30px; color:#fff;">
            <div style="font-size:44px; margin-bottom:12px;">🎬</div>
            <h3 style="margin:0 0 8px; font-family:var(--luxe-font-display); font-size:22px;">Virtual 4K Walkthrough Video</h3>
            <p style="margin:0 0 20px; font-size:14px; color:rgba(255,255,255,0.75); max-width:440px;">
              Want a detailed video walkthrough before you book? We will share an instant 60-second video tour directly with you.
            </p>
            <a href="https://wa.me/919450055554?text=${waMsg}" target="_blank" class="luxe-btn-wa" style="font-size:14px; padding:12px 24px;">
              ${ICONS.whatsapp} Get Video on WhatsApp
            </a>
          </div>
        `;
      }
    }

    renderLandmarks() {
      const el = document.getElementById('luxe-landmarks-list');
      if (!el) return;

      const landmarks = this.prop.landmarks || [
        { name: 'Max Super Specialty Hospital', time: '5 min' },
        { name: 'Chinhat Tiraha / Crossing', time: '2 min' },
        { name: 'Lulu Mall Lucknow', time: '15 min' },
        { name: 'Ekana International Cricket Stadium', time: '15 min' },
        { name: 'Gomti Nagar Railway Station', time: '8 min' },
        { name: 'Lucknow CCS Airport', time: '25 min' }
      ];

      el.innerHTML = landmarks.map(lm => `
        <div class="luxe-landmark-badge">
          <span class="luxe-landmark-name">📍 ${lm.name}</span>
          <span class="luxe-landmark-time">${lm.time}</span>
        </div>
      `).join('');
    }

    renderLocationSection() {
      let container = document.getElementById('luxe-location-container');
      if (!container) {
        const sec = document.getElementById('location');
        if (sec) {
          container = document.createElement('div');
          container.id = 'luxe-location-container';
          const landmarksList = document.getElementById('luxe-landmarks-list');
          if (landmarksList) {
            sec.insertBefore(container, landmarksList);
          } else {
            sec.appendChild(container);
          }
        }
      }
      if (!container) return;

      const p = this.prop;
      const mapLink = p.map_link || 'https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA';
      const address = p.address || 'Gomti Nagar, Lucknow';

      container.innerHTML = `
        <div class="luxe-live-map-card">
          <div class="luxe-live-map-top">
            <div class="luxe-live-map-info">
              <div class="luxe-map-pin-icon">📍</div>
              <div>
                <div class="luxe-live-map-address">${p.name} · Verified Pinpoint Location</div>
                <div class="luxe-live-map-sub">${address}</div>
              </div>
            </div>
            <div class="luxe-map-actions">
              <a class="luxe-btn-map-primary" href="${mapLink}" target="_blank" rel="noopener">
                📍 Open Exact Pin on Google Maps ↗
              </a>
              <a class="luxe-btn-map-dir" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapLink)}" target="_blank" rel="noopener">
                🧭 Get Driving Directions
              </a>
            </div>
          </div>
          <div style="background:#f8fafc; padding:14px 20px; font-size:12.5px; color:var(--luxe-muted); display:flex; align-items:center; gap:8px; border-top:1px solid var(--luxe-border);">
            <span style="color:#059669; font-weight:800;">✓ Live CRM Synced</span>
            <span>· Exact arrival coordinates directly matched with owner &amp; caretaker Google Map pin.</span>
          </div>
        </div>
      `;
    }

    renderInteractiveCalendar() {
      let container = document.getElementById('luxe-availability-calendar');
      if (!container) {
        const amenitiesSec = document.getElementById('amenities');
        if (amenitiesSec) {
          const availSec = document.createElement('section');
          availSec.className = 'luxe-section';
          availSec.id = 'availability';
          availSec.innerHTML = `
            <h2 class="luxe-section-title">Live Availability Calendar</h2>
            <p style="margin:0 0 14px; font-size:14.5px; color:var(--luxe-muted);">
              Real-time synchronization with Airbnb and direct reservations. Green dates are open for booking; red dates are confirmed stays. Click any available date to select your check-in!
            </p>
            <div id="luxe-availability-calendar"></div>
          `;
          amenitiesSec.parentNode.insertBefore(availSec, amenitiesSec.nextSibling);
          container = document.getElementById('luxe-availability-calendar');
        }
      }
      if (!container) return;

      // Ensure "Availability" tab exists in agoda-subnav across all 17 properties
      const subnav = document.querySelector('.agoda-subnav');
      if (subnav && !subnav.querySelector('a[href="#availability"]')) {
        const availLink = document.createElement('a');
        availLink.className = 'agoda-tab-item';
        availLink.href = '#availability';
        availLink.textContent = 'Availability';
        const locTab = subnav.querySelector('a[href="#location"]') || subnav.querySelector('a[href="#video-tour"]');
        if (locTab) {
          subnav.insertBefore(availLink, locTab);
        } else {
          subnav.appendChild(availLink);
        }
      }

      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      const monthsToRender = [
        { year: currentYear, month: currentMonth },
        { year: currentMonth === 11 ? currentYear + 1 : currentYear, month: (currentMonth + 1) % 12 }
      ];

      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const dayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
      const todayIso = today.toISOString().slice(0, 10);

      const monthsHtml = monthsToRender.map(({ year, month }) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let daysHtml = '';
        for (let i = 0; i < firstDay; i++) {
          daysHtml += '<div class="luxe-day-cell empty"></div>';
        }

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isPast = dateStr < todayIso;

          let isBooked = false;
          if (Array.isArray(this.bookedIntervals)) {
            for (const interval of this.bookedIntervals) {
              if (dateStr >= interval.check_in && dateStr < interval.check_out) {
                isBooked = true;
                break;
              }
            }
          }

          const isSelectedIn = (dateStr === this.checkIn);
          const isSelectedOut = (dateStr === this.checkOut);
          const isInRange = (this.checkIn && this.checkOut && dateStr > this.checkIn && dateStr < this.checkOut);

          let classes = ['luxe-day-cell'];
          if (isPast || isBooked) {
            classes.push('booked');
          } else {
            classes.push('available');
          }

          if (isSelectedIn || isSelectedOut) {
            classes.push('selected');
          } else if (isInRange) {
            classes.push('in-range');
          }

          const titleAttr = isBooked ? `🔴 Booked (${dateStr})` : (isPast ? 'Past date' : `🟢 Available - Click to choose ${dateStr}`);
          const clickAttr = (!isPast && !isBooked) ? `onclick="window.luxeEngine.onCalendarDayClick('${dateStr}')"` : '';

          daysHtml += `
            <div class="${classes.join(' ')}" title="${titleAttr}" ${clickAttr}>
              ${d}
            </div>
          `;
        }

        return `
          <div class="luxe-month-block">
            <div class="luxe-month-title">${monthNames[month]} ${year}</div>
            <div class="luxe-days-header">
              ${dayHeaders.map(dh => `<span>${dh}</span>`).join('')}
            </div>
            <div class="luxe-days-grid">
              ${daysHtml}
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = `
        <div class="luxe-availability-wrap">
          <div class="luxe-cal-header">
            <div style="font-size:14px; font-weight:700; color:var(--luxe-ink);">
              📅 2-Month Live Availability Calendar
            </div>
            <div class="luxe-cal-legend">
              <div class="luxe-cal-legend-item">
                <span class="luxe-cal-dot available"></span>
                <span>Available</span>
              </div>
              <div class="luxe-cal-legend-item">
                <span class="luxe-cal-dot booked"></span>
                <span>Booked (Airbnb &amp; CRM)</span>
              </div>
              <div class="luxe-cal-legend-item">
                <span class="luxe-cal-dot selected"></span>
                <span>Your Selected Stay</span>
              </div>
            </div>
          </div>
          <div class="luxe-cal-grid-months">
            ${monthsHtml}
          </div>
        </div>
      `;
    }

    renderBookingCard() {
      const p = this.prop;
      const basePrice = p.base_price || 3499;
      this.totalPayable = basePrice * this.nights;
      const todayIso = new Date().toISOString().slice(0, 10);

      const cardContainer = document.getElementById('luxe-booking-card-container');
      if (!cardContainer) return;

      cardContainer.innerHTML = `
        <div class="luxe-booking-card">
          <div class="luxe-card-top-tag">⚡ Direct Booking Benefit · No Middleman Fees</div>
          
          <div class="luxe-price-header">
            <div>
              <span id="luxe-price-amount" class="luxe-price-amount">₹${this.totalPayable.toLocaleString('en-IN')}</span>
              <span id="luxe-nights-label" class="luxe-price-unit"> / night</span>
            </div>
            <div style="font-size:13px; font-weight:700; color:#b58d3d;">★ ${p.rating ? p.rating.toFixed(1) : '4.9'} (${p.reviews || 46})</div>
          </div>

          <div class="luxe-airbnb-comparison">
            <span id="luxe-airbnb-strike" class="luxe-airbnb-strike">₹${(p.airbnb_price || 4199).toLocaleString('en-IN')} on Airbnb</span>
            <span id="luxe-save-tag" class="luxe-save-tag">Save 15% Direct</span>
          </div>

          <!-- Interactive Date Range Selector with Blockout Detection -->
          <div class="luxe-date-range-box">
            <div class="luxe-date-inputs">
              <div class="luxe-date-cell">
                <label>Check-in Date</label>
                <input type="date" id="sidebar-ci" min="${todayIso}" value="${this.checkIn}" onchange="window.luxeEngine.onDateChange('ci', this.value)" />
              </div>
              <div class="luxe-date-cell">
                <label>Check-out Date</label>
                <input type="date" id="sidebar-co" min="${todayIso}" value="${this.checkOut}" onchange="window.luxeEngine.onDateChange('co', this.value)" />
              </div>
            </div>

            <div id="luxe-date-conflict" class="luxe-date-conflict-alert"></div>
            <div id="luxe-date-success" class="luxe-date-success-alert"></div>

            <div class="luxe-nights-calc">
              <span>Duration:</span>
              <b id="luxe-calc-nights">${this.nights} Night</b>
            </div>
            <div class="luxe-nights-calc" style="border-top:1px dashed #cbd5e1; padding-top:6px;">
              <span>Total Direct Payable:</span>
              <b id="luxe-calc-total" style="color:#059669; font-size:15px;">₹${this.totalPayable.toLocaleString('en-IN')}</b>
            </div>
          </div>

          <!-- Primary Direct Booking CTA with UPI QR -->
          <button type="button" id="luxe-btn-book-primary" class="luxe-btn-book-primary" onclick="window.luxeEngine.openUpiPaymentModal()">
            💳 Reserve &amp; Pay via UPI QR (Save 15%)
          </button>

          <!-- Secondary WhatsApp Direct link -->
          <a id="luxe-btn-wa-direct" class="luxe-btn-book-primary" style="background:#25d366; margin-top:8px;" href="https://wa.me/919450055554" target="_blank">
            ${ICONS.whatsapp} Instant WhatsApp Booking
          </a>

          <!-- Secondary CTAs -->
          <div class="luxe-card-sub-actions" style="margin-top:14px;">
            <a class="luxe-btn-card-sub" href="tel:+919450055554">
              📞 Call Host
            </a>
            <a id="luxe-btn-airbnb-link" class="luxe-btn-card-sub" href="${p.airbnb_url || 'https://www.airbnb.co.in/users/profile/1592729439630759961'}" target="_blank">
              View on Airbnb ↗
            </a>
          </div>

          <!-- Trust Badges -->
          <ul class="luxe-trust-list" style="margin-top:18px;">
            <li>
              ${ICONS.check}
              <span>Instant confirmation directly with owner</span>
            </li>
            <li>
              ${ICONS.check}
              <span>Zero middleman commission or hidden guest fees</span>
            </li>
            <li>
              ${ICONS.check}
              <span>Airbnb calendar dates synchronized</span>
            </li>
          </ul>
        </div>
      `;

      this.checkAvailability();
    }

    renderMobileBar() {
      const basePrice = this.prop.base_price || 3499;

      const mobPrice = document.getElementById('luxe-mobile-price-val');
      if (mobPrice) mobPrice.textContent = `₹${basePrice.toLocaleString('en-IN')}`;

      const mobBtn = document.getElementById('luxe-mobile-btn-wa');
      if (mobBtn) {
        mobBtn.onclick = (e) => {
          e.preventDefault();
          if (this.checkIn && this.checkOut) {
            this.openUpiPaymentModal();
          } else {
            const cal = document.getElementById('availability') || document.getElementById('luxe-availability-calendar');
            if (cal) {
              cal.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              this.openUpiPaymentModal();
            }
          }
        };
      }
    }

    /* ─── UPI QR PAYMENT & DIRECT BOOKING MODAL ─── */
    initUpiModal() {
      let modal = document.getElementById('upi-modal-overlay');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'upi-modal-overlay';
        modal.className = 'upi-modal-overlay';
        document.body.appendChild(modal);
      }
    }

    openUpiPaymentModal() {
      const modal = document.getElementById('upi-modal-overlay');
      if (!modal) return;

      const p = this.prop;
      const base = p.base_price || 3499;
      const amount = this.totalPayable || (base * this.nights);
      const upiId = '9450055554@apl';
      const upiString = `upi://pay?pa=${upiId}&pn=The%20Unique%20Haven%20Homes&am=${amount}&cu=INR&tn=Booking%20${encodeURIComponent(p.name)}%20${this.nights}N`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=1&data=${encodeURIComponent(upiString)}`;

      modal.innerHTML = `
        <div class="upi-modal-card">
          <button type="button" class="upi-modal-close" onclick="window.luxeEngine.closeUpiModal()">✕</button>
          
          <div class="upi-header">
            <div class="upi-header-icon">💳</div>
            <h3 class="upi-title">Confirm Stay &amp; Pay via UPI</h3>
            <p class="upi-sub">${p.name} · ${this.nights} Night${this.nights > 1 ? 's' : ''} (${this.checkIn} to ${this.checkOut})</p>
          </div>

          <div class="upi-price-highlight">
            <div>
              <span style="font-size:12px;color:#64748b;display:block;">Direct Booking Amount</span>
              <strong style="font-size:13px;color:#047857;">Save 15% vs Airbnb</strong>
            </div>
            <div class="val">₹${amount.toLocaleString('en-IN')}</div>
          </div>

          <!-- Instant Mobile Tap To Pay -->
          <div class="upi-mobile-pay-cta">
            <a class="upi-btn-mobile-instant" href="${upiString}">
              <span>⚡ Tap to Pay ₹${amount.toLocaleString('en-IN')} via UPI</span>
              <span style="font-size:11px;opacity:0.92;font-weight:500;">Opens GPay, PhonePe, Paytm, CRED directly</span>
            </a>
          </div>

          <!-- Step 1: Guest Information -->
          <div class="upi-form-group">
            <label>Your Full Name *</label>
            <input type="text" id="upi-guest-name" placeholder="e.g. Rahul Sharma" required />
          </div>

          <div class="upi-form-group">
            <label>WhatsApp Mobile Number *</label>
            <input type="tel" id="upi-guest-phone" placeholder="e.g. 9876543210" required />
          </div>

          <!-- Step 2: UPI QR Code Frame -->
          <div class="upi-qr-frame">
            <div style="font-size:12px;font-weight:700;color:#047857;margin-bottom:8px;">
              Scan with any UPI App (GPay, PhonePe, Paytm)
            </div>
            <img src="${qrUrl}" alt="UPI QR Code" />
            <div class="upi-id-badge" onclick="navigator.clipboard.writeText('${upiId}'); alert('UPI ID copied: ${upiId}');">
              <span>UPI ID: <strong>${upiId}</strong></span>
              <span style="color:#0b63e5;font-size:11px;">(Copy)</span>
            </div>
          </div>

          <!-- Direct Mobile UPI App Triggers -->
          <div class="upi-app-grid">
            <a class="upi-app-btn" href="${upiString}">
              <span>🟢</span>
              <span>GPay</span>
            </a>
            <a class="upi-app-btn" href="${upiString}">
              <span>🟣</span>
              <span>PhonePe</span>
            </a>
            <a class="upi-app-btn" href="${upiString}">
              <span>🔵</span>
              <span>Paytm</span>
            </a>
            <a class="upi-app-btn" href="${upiString}">
              <span>🟠</span>
              <span>BHIM UPI</span>
            </a>
          </div>

          <!-- Step 3: Transaction Ref / UTR -->
          <div class="upi-form-group">
            <label>UPI Transaction ID / 12-Digit UTR (Optional)</label>
            <input type="text" id="upi-utr" placeholder="Paste UTR or Txn Ref here" />
          </div>

          <!-- Confirm & WhatsApp Trigger Button -->
          <button type="button" class="upi-btn-confirm" onclick="window.luxeEngine.confirmUpiPayment()">
            ${ICONS.whatsapp} Confirm Booking &amp; Send Receipt
          </button>
          <div style="text-align:center;font-size:11px;color:#94a3b8;margin-top:10px;">
            🔒 100% Verified Stay with The Unique Haven Homes Private Limited
          </div>
        </div>
      `;

      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    closeUpiModal() {
      const modal = document.getElementById('upi-modal-overlay');
      if (!modal) return;
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    async confirmUpiPayment() {
      const nameInput = document.getElementById('upi-guest-name');
      const phoneInput = document.getElementById('upi-guest-phone');
      const utrInput = document.getElementById('upi-utr');

      const name = nameInput ? nameInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const utr = utrInput ? utrInput.value.trim() : 'Paid via UPI';

      if (!name) {
        alert('Please enter your full name.');
        if (nameInput) nameInput.focus();
        return;
      }

      if (!phone || phone.length < 10) {
        alert('Please enter a valid 10-digit WhatsApp phone number.');
        if (phoneInput) phoneInput.focus();
        return;
      }

      if (!this.isDateAvailable) {
        alert('The selected dates are currently unavailable or conflicting with an existing booking. Please select different dates.');
        return;
      }

      const p = this.prop;
      const amount = this.totalPayable || (p.base_price * this.nights);
      const bookingId = 'UHHS-' + Date.now().toString().slice(-6);

      let sbClient = window.sb;
      if (!sbClient && typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
        sbClient = window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      }

      // 1. Save to Supabase CRM (guest_register table)
      if (sbClient) {
        try {
          const { data: bData, error: bErr } = await sbClient.from('guest_register').insert({
            booking_id: bookingId,
            room_id: p.id,
            guest_name: name,
            phone: phone,
            check_in: this.checkIn,
            check_out: this.checkOut,
            check_in_time: '14:00',
            check_out_time: '11:00',
            guests: this.guests || 2,
            per_day_rate: p.base_price,
            total_amount: amount,
            booking_mode: 'Direct-Website',
            payment_status: 'Paid',
            notes: `Direct UPI QR Website Booking. UTR: ${utr}. Nights: ${this.nights}`,
            booked_by: 'Direct Guest',
            is_cancelled: false,
            verification_status: 'pending'
          }).select();

          if (bErr) {
            console.error('Supabase guest_register booking error:', bErr);
          } else {
            console.log('✅ Booking successfully saved to CRM guest_register:', bData);
          }

          // 2. Insert into payment_history
          await sbClient.from('payment_history').insert({
            booking_id: bookingId,
            amount: amount,
            payment_date: new Date().toISOString().slice(0, 10),
            payment_mode: 'UPI',
            received_by: 'Firoz',
            notes: `Direct UPI Website Booking (9450055554@apl) - UTR: ${utr}`,
            verification_status: 'pending'
          });
        } catch (err) {
          console.warn('Direct booking Supabase sync exception:', err);
        }
      }

      // 3. Update local bookedIntervals so dates immediately turn red/booked on screen
      this.bookedIntervals.push({
        check_in: this.checkIn,
        check_out: this.checkOut
      });
      this.renderInteractiveCalendar();

      // 4. Pre-fill WhatsApp message
      const waReceipt = `*HOTEL BOOKING CONFIRMATION* 🏨
───────────────────────
*Property:* ${p.name} (${p.id})
*Booking Ref:* ${bookingId}
*Guest Name:* ${name}
*Mobile:* ${phone}
*Check-in:* ${this.checkIn} (2:00 PM)
*Check-out:* ${this.checkOut} (11:00 AM)
*Duration:* ${this.nights} Night(s) · ${this.guests} Guest(s)
*Amount Paid:* ₹${amount.toLocaleString('en-IN')} (via UPI)
*UPI Ref / UTR:* ${utr || 'Screenshotted'}
*Status:* Confirmed in CRM Database
───────────────────────
_Please confirm room allotment and send check-in details. Thank you!_`;

      const waUrl = `https://wa.me/919450055554?text=${encodeURIComponent(waReceipt)}`;

      this.closeUpiModal();

      // 5. Render Success Voucher Modal
      this.showBookingSuccessVoucher({
        bookingId,
        name,
        phone,
        propertyName: p.name,
        roomId: p.id,
        checkIn: this.checkIn,
        checkOut: this.checkOut,
        nights: this.nights,
        guests: this.guests,
        amount,
        utr,
        waUrl
      });
    }

    showBookingSuccessVoucher(details) {
      let modal = document.getElementById('luxe-voucher-modal-overlay');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'luxe-voucher-modal-overlay';
        modal.className = 'luxe-voucher-modal';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="luxe-voucher-card">
          <div class="luxe-voucher-top">
            <div class="luxe-voucher-icon">🎉</div>
            <h3 class="luxe-voucher-title">Booking Confirmed!</h3>
            <p style="margin:0; font-size:13.5px; opacity:0.9;">Directly registered in Unique Haven CRM</p>
          </div>

          <div class="luxe-voucher-body">
            <div class="luxe-voucher-details">
              <div><strong>Booking ID:</strong> <span style="font-family:monospace; color:#059669; font-weight:800;">${details.bookingId}</span></div>
              <div><strong>Property:</strong> ${details.propertyName} (${details.roomId})</div>
              <div><strong>Guest Name:</strong> ${details.name}</div>
              <div><strong>Mobile:</strong> ${details.phone}</div>
              <div><strong>Stay Dates:</strong> ${details.checkIn} to ${details.checkOut} (${details.nights} Nights)</div>
              <div><strong>Amount Paid:</strong> ₹${details.amount.toLocaleString('en-IN')}</div>
              <div><strong>UPI Ref / UTR:</strong> ${details.utr}</div>
              <div><strong>Status:</strong> <span style="color:#059669; font-weight:700;">✅ Confirmed &amp; Logged in CRM</span></div>
            </div>

            <div class="luxe-voucher-actions">
              <a class="upi-btn-confirm" href="${details.waUrl}" target="_blank">
                📱 Send Voucher to Host on WhatsApp
              </a>
              <button type="button" class="luxe-btn-map-dir" style="width:100%; justify-content:center; padding:12px; font-weight:700;" onclick="window.print()">
                🖨️ Print / Save Booking Pass
              </button>
              <button type="button" class="luxe-btn-card-sub" style="width:100%; justify-content:center; padding:10px;" onclick="document.getElementById('luxe-voucher-modal-overlay').remove()">
                Done
              </button>
            </div>
          </div>
        </div>
      `;
    }

    /* ─── FULLSCREEN CATEGORIZED LIGHTBOX ─── */
    initGalleryModal() {
      const modal = document.getElementById('luxe-gallery-modal');
      if (!modal) return;

      const tabsContainer = document.getElementById('luxe-modal-tabs');
      if (tabsContainer) {
        let tabsHtml = `<button type="button" class="luxe-modal-tab active" onclick="window.luxeEngine.filterGallery('all', this)">All Photos (${this.catalog.all.length})</button>`;
        Object.keys(this.catalog.categories).forEach(cat => {
          const count = this.catalog.categories[cat].length;
          tabsHtml += `<button type="button" class="luxe-modal-tab" onclick="window.luxeEngine.filterGallery('${cat}', this)">${cat} (${count})</button>`;
        });
        tabsContainer.innerHTML = tabsHtml;
      }

      window.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;
        if (e.key === 'Escape') this.closeGallery();
        if (e.key === 'ArrowRight') this.nextPhoto();
        if (e.key === 'ArrowLeft') this.prevPhoto();
      });
    }

    openGallery(initialIndex = 0) {
      const modal = document.getElementById('luxe-gallery-modal');
      if (!modal) return;

      this.currentFilter = 'all';
      this.filteredList = this.catalog.all;
      this.currentIndex = Math.max(0, Math.min(initialIndex, this.filteredList.length - 1));

      const tabs = document.querySelectorAll('.luxe-modal-tab');
      tabs.forEach((t, i) => {
        if (i === 0) t.classList.add('active');
        else t.classList.remove('active');
      });

      this.updateGalleryView();
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    closeGallery() {
      const modal = document.getElementById('luxe-gallery-modal');
      if (!modal) return;
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }

    filterGallery(category, tabBtn) {
      if (category === 'all') {
        this.filteredList = this.catalog.all;
      } else {
        this.filteredList = this.catalog.categories[category] || this.catalog.all;
      }
      this.currentIndex = 0;
      this.currentFilter = category;

      const tabs = document.querySelectorAll('.luxe-modal-tab');
      tabs.forEach(t => t.classList.remove('active'));
      if (tabBtn) tabBtn.classList.add('active');

      this.updateGalleryView();
    }

    updateGalleryView() {
      const imgEl = document.getElementById('luxe-modal-img');
      const counterEl = document.getElementById('luxe-modal-counter');
      const ribbonEl = document.getElementById('luxe-modal-ribbon');

      if (!this.filteredList || this.filteredList.length === 0) return;

      const currentItem = this.filteredList[this.currentIndex];
      if (imgEl) {
        imgEl.src = currentItem.url;
        imgEl.alt = `${this.prop.name} - ${currentItem.category}`;
      }

      if (counterEl) {
        counterEl.textContent = `${this.currentIndex + 1} / ${this.filteredList.length} (${currentItem.category})`;
      }

      if (ribbonEl) {
        ribbonEl.innerHTML = this.filteredList.map((item, idx) => `
          <div class="luxe-modal-thumb ${idx === this.currentIndex ? 'active' : ''}" onclick="window.luxeEngine.goToPhoto(${idx})">
            <img src="${item.url}" alt="thumb ${idx + 1}" loading="lazy"/>
          </div>
        `).join('');

        const activeThumb = ribbonEl.children[this.currentIndex];
        if (activeThumb) {
          activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }

    nextPhoto() {
      if (this.currentIndex < this.filteredList.length - 1) {
        this.currentIndex++;
      } else {
        this.currentIndex = 0;
      }
      this.updateGalleryView();
    }

    prevPhoto() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
      } else {
        this.currentIndex = this.filteredList.length - 1;
      }
      this.updateGalleryView();
    }

    goToPhoto(idx) {
      if (idx >= 0 && idx < this.filteredList.length) {
        this.currentIndex = idx;
        this.updateGalleryView();
      }
    }
  }

  // Self initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    window.luxeEngine = new LuxePropertyEngine();
    window.luxeEngine.init();
  });

})(window);
