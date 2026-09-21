/**
 * Property Luxe Engine — The Unique Haven Homes
 * Powers dynamic 5-star property presentations, 5-photo mosaic,
 * categorized photo lightbox, 4K video player, and real-time CMS sync.
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
    airbnb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-3.1 0-6 2.5-6 6.3 0 4.9 6 13.7 6 13.7s6-8.8 6-13.7c0-3.8-2.9-6.3-6-6.3zm0 9c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
  };

  class LuxePropertyEngine {
    constructor() {
      this.identifier = detectPropertyIdentifier();
      this.prop = null;
      this.catalog = { all: [], categories: {} };
      this.currentFilter = 'all';
      this.currentIndex = 0;
      this.filteredList = [];
    }

    async init() {
      // 1. Resolve property from ShowcaseData
      if (window.ShowcaseData) {
        this.prop = window.ShowcaseData.getProperty(this.identifier);
      }

      if (!this.prop && window.ShowcaseData && window.ShowcaseData.BASELINE) {
        // Search baseline
        const all = window.ShowcaseData.BASELINE;
        const foundKey = Object.keys(all).find(k => all[k].slug === this.identifier || k === this.identifier);
        if (foundKey) this.prop = all[foundKey];
      }

      if (!this.prop) {
        console.warn('Property not found in ShowcaseData:', this.identifier);
        return;
      }

      // 2. Prepare photos
      this.catalog = preparePhotoCatalog(this.prop);
      this.filteredList = this.catalog.all;

      // 3. Render page components
      this.renderMetaHeader();
      this.renderHeroMosaic();
      this.renderSpecBar();
      this.renderHighlights();
      this.renderDescription();
      this.renderSleepingArrangements();
      this.renderAmenities();
      this.renderVideoTour();
      this.renderLandmarks();
      this.renderBookingCard();
      this.renderMobileBar();
      this.initGalleryModal();

      // 4. Background sync from Supabase if online
      if (window.ShowcaseData && typeof window.ShowcaseData.syncFromDatabase === 'function') {
        window.ShowcaseData.syncFromDatabase().then(() => {
          const fresh = window.ShowcaseData.getProperty(this.identifier);
          if (fresh) {
            this.prop = fresh;
            this.catalog = preparePhotoCatalog(fresh);
            this.updatePricingOnly();
          }
        }).catch(() => {});
      }
    }

    renderMetaHeader() {
      const p = this.prop;

      // Document title & SEO
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
        // WhatsApp video request teaser
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

    renderBookingCard() {
      const p = this.prop;
      const basePrice = p.base_price || 3499;
      const airbnbPrice = p.airbnb_price || Math.round(basePrice * 1.2);
      const savings = airbnbPrice - basePrice;

      const priceValEl = document.getElementById('luxe-price-amount');
      if (priceValEl) priceValEl.textContent = `₹${basePrice.toLocaleString('en-IN')}`;

      const strikeEl = document.getElementById('luxe-airbnb-strike');
      if (strikeEl) strikeEl.textContent = `₹${airbnbPrice.toLocaleString('en-IN')} on Airbnb`;

      const saveTagEl = document.getElementById('luxe-save-tag');
      if (saveTagEl) saveTagEl.textContent = `Save ₹${savings.toLocaleString('en-IN')} (15%) Direct`;

      const roomIdEl = document.getElementById('luxe-room-id');
      if (roomIdEl) roomIdEl.textContent = p.id || 'GOM-201';

      const guestsEl = document.getElementById('luxe-max-guests');
      if (guestsEl) guestsEl.textContent = `${p.max_guests || 10} Guests Max`;

      // WhatsApp Booking CTA
      const waMsg = encodeURIComponent(
        `Hello Praveen, I want to book ${p.name} (${p.id}) directly at ₹${basePrice}/night. Please confirm dates and availability.`
      );
      const waBtn = document.getElementById('luxe-btn-book-primary');
      if (waBtn) {
        waBtn.href = `https://wa.me/919450055554?text=${waMsg}`;
      }

      // Airbnb Link fallback
      const airBtn = document.getElementById('luxe-btn-airbnb-link');
      if (airBtn) {
        airBtn.href = p.airbnb_url || 'https://www.airbnb.co.in/users/profile/1592729439630759961';
      }
    }

    renderMobileBar() {
      const p = this.prop;
      const basePrice = p.base_price || 3499;

      const mobPrice = document.getElementById('luxe-mobile-price-val');
      if (mobPrice) mobPrice.textContent = `₹${basePrice.toLocaleString('en-IN')}`;

      const waMsg = encodeURIComponent(
        `Hello Praveen, I want to book ${p.name} (${p.id}) directly. Please share availability.`
      );
      const mobBtn = document.getElementById('luxe-mobile-btn-wa');
      if (mobBtn) {
        mobBtn.href = `https://wa.me/919450055554?text=${waMsg}`;
      }
    }

    updatePricingOnly() {
      this.renderBookingCard();
      this.renderMobileBar();
    }

    /* ─── FULLSCREEN CATEGORIZED LIGHTBOX ─── */
    initGalleryModal() {
      const modal = document.getElementById('luxe-gallery-modal');
      if (!modal) return;

      // Build tabs
      const tabsContainer = document.getElementById('luxe-modal-tabs');
      if (tabsContainer) {
        let tabsHtml = `<button type="button" class="luxe-modal-tab active" onclick="window.luxeEngine.filterGallery('all', this)">All Photos (${this.catalog.all.length})</button>`;
        Object.keys(this.catalog.categories).forEach(cat => {
          const count = this.catalog.categories[cat].length;
          tabsHtml += `<button type="button" class="luxe-modal-tab" onclick="window.luxeEngine.filterGallery('${cat}', this)">${cat} (${count})</button>`;
        });
        tabsContainer.innerHTML = tabsHtml;
      }

      // Keyboard navigation
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

      // Reset tabs active state
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

      // Render ribbon thumbnails
      if (ribbonEl) {
        ribbonEl.innerHTML = this.filteredList.map((item, idx) => `
          <div class="luxe-modal-thumb ${idx === this.currentIndex ? 'active' : ''}" onclick="window.luxeEngine.goToPhoto(${idx})">
            <img src="${item.url}" alt="thumb ${idx + 1}" loading="lazy"/>
          </div>
        `).join('');

        // Auto-scroll ribbon to active thumb
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
        this.currentIndex = 0; // loop
      }
      this.updateGalleryView();
    }

    prevPhoto() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
      } else {
        this.currentIndex = this.filteredList.length - 1; // loop
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
