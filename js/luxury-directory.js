/**
 * THE UNIQUE HAVEN HOMES — LUXURY DIRECTORY CONTROLLER
 * Features:
 * 1. In-Card Interactive Photo Carousel (arrows + indicators)
 * 2. Full-Screen Luxury Photo Lightbox with Categories & Thumbnails
 * 3. Instant Multi-Facet Filtering (Category, Location, Keyword, Sort)
 * 4. Mobile Touch & Swipe Support
 * 5. Keyboard Navigation (Arrow Keys + ESC)
 */

(function() {
  'use strict';

  // State
  let currentLightboxSlug = null;
  let currentLightboxIndex = 0;
  let currentCategory = 'all';
  let activeLightboxPhotos = [];

  // Card Photo Indices
  const cardPhotoIndices = {};

  // Initialize
  function initLuxuryDirectory() {
    syncCardPricesFromDatabase();
    setupCardCarousels();
    setupLightboxModal();
    setupFilters();
    setupKeyboardListeners();
    setupBackToTop();
  }

  // Live Sync Card Prices from Master Database (Ensures 100% price parity with booking)
  function syncCardPricesFromDatabase() {
    const db = window.UHH_PHOTO_DB || (window.UHH_SHOWCASE_DATA && window.UHH_SHOWCASE_DATA.properties);

    const cards = document.querySelectorAll('.dir-card');
    cards.forEach(card => {
      // Ensure + GST · Direct Discount tag exists with official rate (5% <= 7500, 18% > 7500)
      let taxEl = card.querySelector('.dir-card-price-tax');
      const cardPrice = Number(card.dataset.price || 4500);
      const taxRate = cardPrice <= 7500 ? 5 : 18;
      if (!taxEl) {
        taxEl = document.createElement('span');
        taxEl.className = 'dir-card-price-tax';
        taxEl.innerHTML = `+ ${taxRate}% GST · Direct Discount`;
        const pBlock = card.querySelector('.dir-card-price-block');
        if (pBlock) pBlock.appendChild(taxEl);
      } else {
        taxEl.innerHTML = `+ ${taxRate}% GST · Direct Discount`;
      }

      const slug = card.dataset.slug;
      if (!slug || !db) return;
      const propData = db[slug];
      if (propData && propData.base_price) {
        const basePrice = Number(propData.base_price);
        const airbnbPrice = Number(propData.airbnb_price || Math.round(basePrice * 1.18));
        card.dataset.price = String(basePrice);

        const mainPriceEl = card.querySelector('.dir-card-price-main');
        if (mainPriceEl) {
          mainPriceEl.innerHTML = `₹${basePrice.toLocaleString('en-IN')} <small>/ night</small>`;
        }

        const strikePriceEl = card.querySelector('.dir-card-price-strike');
        if (strikePriceEl) {
          strikePriceEl.textContent = `₹${airbnbPrice.toLocaleString('en-IN')}`;
        }
      }
    });
  }

  // Floating Back to Top Button
  function setupBackToTop() {
    const btn = document.getElementById('backToTopBtn');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 350) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    }, { passive: true });
  }

  // 1. In-Card Photo Carousel Setup
  function setupCardCarousels() {
    const cards = document.querySelectorAll('.dir-card');
    cards.forEach(card => {
      const slug = card.dataset.slug;
      if (!slug) return;

      const photoData = (window.UHH_PHOTO_DB && window.UHH_PHOTO_DB[slug]) || null;
      if (!photoData || !photoData.photos || photoData.photos.length <= 1) return;

      cardPhotoIndices[slug] = 0;

      const mediaWrap = card.querySelector('.dir-card-media');
      if (!mediaWrap) return;

      // Add Save Badge if not present
      if (!mediaWrap.querySelector('.dir-card-save-badge')) {
        const saveBadge = document.createElement('span');
        saveBadge.className = 'dir-card-save-badge';
        saveBadge.textContent = '15% OFF Direct';
        mediaWrap.appendChild(saveBadge);
      }

      // Add Photo Count Badge if not present
      if (!mediaWrap.querySelector('.dir-card-photo-count')) {
        const countBadge = document.createElement('button');
        countBadge.className = 'dir-card-photo-count';
        countBadge.type = 'button';
        countBadge.setAttribute('aria-label', `View all ${photoData.totalCount} photos`);
        countBadge.innerHTML = `📷 <span>${photoData.totalCount} Photos</span>`;
        countBadge.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openLightbox(slug, 0);
        });
        mediaWrap.appendChild(countBadge);
      }

      // Add Nav Arrows
      if (!mediaWrap.querySelector('.dir-carousel-nav')) {
        const navWrap = document.createElement('div');
        navWrap.className = 'dir-carousel-nav';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'dir-carousel-btn dir-carousel-prev';
        prevBtn.type = 'button';
        prevBtn.setAttribute('aria-label', 'Previous photo');
        prevBtn.innerHTML = '‹';
        prevBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          changeCardPhoto(slug, -1, mediaWrap);
        });

        const nextBtn = document.createElement('button');
        nextBtn.className = 'dir-carousel-btn dir-carousel-next';
        nextBtn.type = 'button';
        nextBtn.setAttribute('aria-label', 'Next photo');
        nextBtn.innerHTML = '›';
        nextBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          changeCardPhoto(slug, 1, mediaWrap);
        });

        navWrap.appendChild(prevBtn);
        navWrap.appendChild(nextBtn);
        mediaWrap.appendChild(navWrap);

        // Dot indicators
        const dotsWrap = document.createElement('div');
        dotsWrap.className = 'dir-carousel-dots';
        const displayCount = Math.min(5, photoData.photos.length);
        for (let i = 0; i < displayCount; i++) {
          const dot = document.createElement('span');
          dot.className = 'dir-carousel-dot' + (i === 0 ? ' active' : '');
          dotsWrap.appendChild(dot);
        }
        mediaWrap.appendChild(dotsWrap);
      }

      // Clicking on the media opens the full lightbox
      mediaWrap.addEventListener('click', (e) => {
        // If clicking on Explore or direct links, allow navigation if intended, else open lightbox
        if (e.target.closest('.dir-carousel-btn') || e.target.closest('.dir-card-photo-count')) return;
        e.preventDefault();
        const currentIndex = cardPhotoIndices[slug] || 0;
        openLightbox(slug, currentIndex);
      });
    });
  }

  function changeCardPhoto(slug, direction, mediaWrap) {
    const photoData = window.UHH_PHOTO_DB && window.UHH_PHOTO_DB[slug];
    if (!photoData || !photoData.photos.length) return;

    const list = photoData.photos;
    let idx = (cardPhotoIndices[slug] || 0) + direction;
    if (idx < 0) idx = list.length - 1;
    if (idx >= list.length) idx = 0;
    cardPhotoIndices[slug] = idx;

    const img = mediaWrap.querySelector('img');
    if (img) {
      // Smooth fade
      img.style.opacity = '0.5';
      const targetSrc = list[idx];
      const preload = new Image();
      preload.src = targetSrc;
      preload.onload = () => {
        img.src = targetSrc;
        img.style.opacity = '1';
      };
      preload.onerror = () => {
        img.style.opacity = '1';
      };
    }

    // Update dots
    const dots = mediaWrap.querySelectorAll('.dir-carousel-dot');
    const dotIdx = idx % (dots.length || 1);
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === dotIdx);
    });
  }

  // 2. Full-Screen Photo Lightbox Modal
  function setupLightboxModal() {
    let modal = document.getElementById('luxuryPhotoLightbox');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'luxuryPhotoLightbox';
      modal.className = 'lux-lightbox';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Property Photo Gallery');
      modal.innerHTML = `
        <div class="lux-lightbox-backdrop" onclick="window.LuxuryDirectory.closeLightbox()"></div>
        <div class="lux-lightbox-container">
          <!-- Header Bar -->
          <div class="lux-lightbox-header">
            <div class="lux-lightbox-info">
              <h3 id="luxLbTitle" class="lux-lightbox-title">Property Gallery</h3>
              <div id="luxLbMeta" class="lux-lightbox-meta">Luxury Homestay · Lucknow</div>
            </div>
            <div class="lux-lightbox-header-actions">
              <a id="luxLbWaBtn" class="lux-lb-wa-btn" href="book.html">
                <span>📋 Book Now</span>
              </a>
              <button type="button" class="lux-lightbox-close" onclick="window.LuxuryDirectory.closeLightbox()" aria-label="Close photo gallery">✕</button>
            </div>
          </div>

          <!-- Category Filter Bar -->
          <div class="lux-lightbox-tabs" id="luxLbTabs">
            <button class="lux-lb-tab active" data-cat="all" onclick="window.LuxuryDirectory.filterCategory('all')">All Photos</button>
            <button class="lux-lb-tab" data-cat="bedrooms" onclick="window.LuxuryDirectory.filterCategory('bedrooms')">🛏️ Bedrooms</button>
            <button class="lux-lb-tab" data-cat="living_hall" onclick="window.LuxuryDirectory.filterCategory('living_hall')">🛋️ Living Room</button>
            <button class="lux-lb-tab" data-cat="kitchen" onclick="window.LuxuryDirectory.filterCategory('kitchen')">🍳 Kitchen</button>
            <button class="lux-lb-tab" data-cat="bathrooms" onclick="window.LuxuryDirectory.filterCategory('bathrooms')">🚿 Bathrooms</button>
            <button class="lux-lb-tab" data-cat="balcony" onclick="window.LuxuryDirectory.filterCategory('balcony')">🌅 Balcony</button>
          </div>

          <!-- Main Stage -->
          <div class="lux-lightbox-stage">
            <button type="button" class="lux-stage-arrow lux-arrow-prev" onclick="window.LuxuryDirectory.navigateLightbox(-1)" aria-label="Previous photo">‹</button>
            <div class="lux-stage-img-wrap">
              <img id="luxLbMainImg" src="" alt="Property Gallery High Resolution Photo" />
              <div id="luxLbCounter" class="lux-stage-counter">1 / 10</div>
            </div>
            <button type="button" class="lux-stage-arrow lux-arrow-next" onclick="window.LuxuryDirectory.navigateLightbox(1)" aria-label="Next photo">›</button>
          </div>

          <!-- Thumbnail Strip -->
          <div class="lux-lightbox-thumbs-wrap">
            <div id="luxLbThumbs" class="lux-lightbox-thumbs"></div>
          </div>

          <!-- Bottom Sticky Action Dock (High-Conversion Thumb Zone for Mobile) -->
          <div class="lux-lightbox-dock">
            <div class="lux-lb-dock-info">
              <div id="luxLbDockPrice" class="lux-lb-dock-price">₹4,500 / night</div>
              <div class="lux-lb-dock-sub">Direct Host Rate · Best Price</div>
            </div>
            <a id="luxLbDockBtn" class="lux-lb-dock-btn" href="book.html">
              <span>📋 Book Direct</span>
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
  }

  function openLightbox(slug, startIndex) {
    const data = window.UHH_PHOTO_DB && window.UHH_PHOTO_DB[slug];
    if (!data) return;

    currentLightboxSlug = slug;
    currentCategory = 'all';
    activeLightboxPhotos = (data.photos && data.photos.length) ? data.photos : [data.localCover];
    currentLightboxIndex = startIndex >= 0 && startIndex < activeLightboxPhotos.length ? startIndex : 0;

    const modal = document.getElementById('luxuryPhotoLightbox');
    if (!modal) return;

    // Set Info
    const titleEl = document.getElementById('luxLbTitle');
    const metaEl = document.getElementById('luxLbMeta');
    const waBtn = document.getElementById('luxLbWaBtn');

    if (titleEl) titleEl.textContent = data.name;
    if (metaEl) {
      metaEl.textContent = `${data.type} · ${data.area} · ₹${(data.base_price || 4499).toLocaleString('en-IN')}/night (Direct Price)`;
    }
    if (waBtn) {
      waBtn.innerHTML = '<span>📋 Book This Stay</span>';
      waBtn.removeAttribute('target');
      waBtn.href = `book.html?property=${data.id || slug}`;
    }

    const dockPriceEl = document.getElementById('luxLbDockPrice');
    const dockBtn = document.getElementById('luxLbDockBtn');
    if (dockPriceEl) {
      dockPriceEl.textContent = `₹${(data.base_price || 4499).toLocaleString('en-IN')} / night`;
    }
    if (dockBtn) {
      dockBtn.href = `book.html?property=${data.id || slug}`;
    }

    // Dynamic category tabs with real photo counts
    const tabsContainer = document.getElementById('luxLbTabs');
    if (tabsContainer) {
      let tabsHtml = `<button class="lux-lb-tab active" data-cat="all" onclick="window.LuxuryDirectory.filterCategory('all')">All Photos (${data.photos ? data.photos.length : 0})</button>`;
      
      const catConfig = [
        { key: 'bedrooms', label: '🛏️ Bedrooms' },
        { key: 'living_hall', label: '🛋️ Living & Dining' },
        { key: 'kitchen', label: '🍳 Kitchen' },
        { key: 'bathrooms', label: '🚿 Bathrooms' },
        { key: 'balcony', label: '🌅 Balcony' }
      ];

      catConfig.forEach(c => {
        const list = data.categories && data.categories[c.key];
        if (list && list.length > 0) {
          tabsHtml += `<button class="lux-lb-tab" data-cat="${c.key}" onclick="window.LuxuryDirectory.filterCategory('${c.key}')">${c.label} (${list.length})</button>`;
        }
      });

      tabsContainer.innerHTML = tabsHtml;
    }

    renderLightboxContent();

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const modal = document.getElementById('luxuryPhotoLightbox');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function filterCategory(category) {
    currentCategory = category;
    const data = window.UHH_PHOTO_DB && window.UHH_PHOTO_DB[currentLightboxSlug];
    if (!data) return;

    if (category === 'all') {
      activeLightboxPhotos = (data.photos && data.photos.length) ? data.photos : [];
    } else if (data.categories && data.categories[category] && data.categories[category].length > 0) {
      activeLightboxPhotos = data.categories[category];
    } else {
      activeLightboxPhotos = [];
    }

    currentLightboxIndex = 0;

    // Update tab active state
    document.querySelectorAll('.lux-lb-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === category);
    });

    renderLightboxContent();
  }

  function navigateLightbox(direction) {
    if (!activeLightboxPhotos.length) return;
    currentLightboxIndex += direction;
    if (currentLightboxIndex < 0) currentLightboxIndex = activeLightboxPhotos.length - 1;
    if (currentLightboxIndex >= activeLightboxPhotos.length) currentLightboxIndex = 0;

    renderLightboxMainPhoto();
  }

  function renderLightboxContent() {
    renderLightboxMainPhoto();
    renderLightboxThumbs();
  }

  function renderLightboxMainPhoto() {
    const mainImg = document.getElementById('luxLbMainImg');
    const counterEl = document.getElementById('luxLbCounter');
    if (!mainImg || !activeLightboxPhotos.length) return;

    const currentSrc = activeLightboxPhotos[currentLightboxIndex];
    mainImg.style.opacity = '0.4';

    const preload = new Image();
    preload.src = currentSrc;
    preload.onload = () => {
      mainImg.src = currentSrc;
      mainImg.style.opacity = '1';
    };
    preload.onerror = () => {
      mainImg.style.opacity = '1';
    };

    if (counterEl) {
      const catLabels = {
        all: 'All Photos',
        bedrooms: 'Bedrooms',
        living_hall: 'Living & Dining',
        kitchen: 'Kitchen',
        bathrooms: 'Bathrooms',
        balcony: 'Balcony'
      };
      const label = catLabels[currentCategory] || currentCategory;
      counterEl.textContent = `${currentLightboxIndex + 1} / ${activeLightboxPhotos.length} (${label})`;
    }

    // Update active thumb
    const thumbs = document.querySelectorAll('.lux-lb-thumb');
    thumbs.forEach((th, idx) => {
      th.classList.toggle('active', idx === currentLightboxIndex);
      if (idx === currentLightboxIndex) {
        th.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  }

  function renderLightboxThumbs() {
    const thumbsContainer = document.getElementById('luxLbThumbs');
    if (!thumbsContainer) return;

    thumbsContainer.innerHTML = '';
    activeLightboxPhotos.forEach((src, idx) => {
      const btn = document.createElement('button');
      btn.className = 'lux-lb-thumb' + (idx === currentLightboxIndex ? ' active' : '');
      btn.type = 'button';
      btn.innerHTML = `<img src="${src}" alt="Thumbnail ${idx + 1}" loading="lazy" />`;
      btn.addEventListener('click', () => {
        currentLightboxIndex = idx;
        renderLightboxMainPhoto();
      });
      thumbsContainer.appendChild(btn);
    });
  }

  // 3. Multi-Facet Instant Filters
  let activeFilterCategory = 'all';

  const LULU_SLUGS = new Set([
    'green-forest',
    'pink-paradise',
    'celebrity-garden',
    'gomti-grand-villa',
    'royal-white-house',
    'the-velvet-house'
  ]);

  const VIKALP_SLUGS = new Set([
    'redrose-palace',
    'black-beauty',
    'the-dark-blue',
    'the-brown',
    'the-light-green',
    'the-unique',
    'the-nawabi-stay',
    'starlight-blue-penthouse'
  ]);

  const VISHESH_SLUGS = new Set([
    'the-green-house',
    'the-pink-house',
    'the-yellow-house'
  ]);

  function setupFilters() {
    window.setCategoryFilter = function(category, btnElement) {
      activeFilterCategory = category;
      const locationSelect = document.getElementById('locationSelect');
      if (locationSelect) {
        if (category === 'lulu') locationSelect.value = 'lulu';
        else if (category === 'gomti') locationSelect.value = 'gomti';
        else if (category === 'all' && (locationSelect.value === 'lulu' || locationSelect.value === 'gomti')) locationSelect.value = 'all';
      }
      document.querySelectorAll('#filterPills .airnest-cat-btn, #filterPills .dir-pill-btn').forEach(b => b.classList.remove('active'));
      if (btnElement) {
        btnElement.classList.add('active');
      } else {
        const matchingBtn = document.querySelector(`#filterPills [onclick*="'${category}'"]`);
        if (matchingBtn) matchingBtn.classList.add('active');
      }
      applyFilters();
    };

    window.applyFilters = applyFilters;

    const locationSelect = document.getElementById('locationSelect');
    if (locationSelect && !locationSelect._hasBoundFilter) {
      locationSelect._hasBoundFilter = true;
      locationSelect.addEventListener('change', () => {
        if (locationSelect.value === 'lulu') {
          activeFilterCategory = 'lulu';
        } else if (locationSelect.value === 'gomti') {
          activeFilterCategory = 'gomti';
        } else if (locationSelect.value === 'all' && (activeFilterCategory === 'lulu' || activeFilterCategory === 'gomti')) {
          activeFilterCategory = 'all';
        }
        document.querySelectorAll('#filterPills .airnest-cat-btn, #filterPills .dir-pill-btn').forEach(b => b.classList.remove('active'));
        const matchingBtn = document.querySelector(`#filterPills [onclick*="'${activeFilterCategory}'"]`);
        if (matchingBtn) matchingBtn.classList.add('active');
        applyFilters();
      });
    }
  }

  function applyFilters() {
    const searchInput = document.getElementById('propertySearchInput');
    const locationSelect = document.getElementById('locationSelect');
    const sortSelect = document.getElementById('sortSelect');

    const searchVal = (searchInput && searchInput.value || '').trim().toLowerCase();
    const locationVal = (locationSelect && locationSelect.value) || 'all';
    const sortVal = (sortSelect && sortSelect.value) || 'recommended';

    const cards = Array.from(document.querySelectorAll('.dir-card'));
    let visibleCount = 0;

    cards.forEach(card => {
      const type = (card.dataset.type || '').toLowerCase();
      const area = (card.dataset.area || '').toLowerCase();
      const name = (card.dataset.name || '').toLowerCase();
      const slug = (card.dataset.slug || '').toLowerCase();
      const rating = parseFloat(card.dataset.rating || 0);
      const cardText = (card.textContent || '').toLowerCase();

      const isLuluProperty = LULU_SLUGS.has(slug) || area === 'lulu' || card.dataset.location === 'lulu';
      const isVikalpProperty = VIKALP_SLUGS.has(slug) || area === 'vikalp';
      const isVisheshProperty = VISHESH_SLUGS.has(slug) || area === 'vishesh';
      const isGomtiProperty = isVikalpProperty || isVisheshProperty || (!isLuluProperty && (area === 'gomti' || card.dataset.location === 'gomti'));

      // Category match
      let catMatch = false;
      if (activeFilterCategory === 'all') {
        catMatch = true;
      } else if (activeFilterCategory === 'flat') {
        catMatch = type.includes('flat');
      } else if (activeFilterCategory === 'villa') {
        catMatch = type.includes('villa');
      } else if (activeFilterCategory === 'penthouse') {
        catMatch = type.includes('penthouse');
      } else if (activeFilterCategory === 'top-rated') {
        catMatch = rating >= 4.90;
      } else if (activeFilterCategory === 'gomti') {
        catMatch = isGomtiProperty;
      } else if (activeFilterCategory === 'lulu') {
        catMatch = isLuluProperty;
      }

      // Location dropdown match
      let locMatch = false;
      if (locationVal === 'all') {
        locMatch = true;
      } else if (locationVal === 'vikalp') {
        locMatch = isVikalpProperty;
      } else if (locationVal === 'vishesh') {
        locMatch = isVisheshProperty;
      } else if (locationVal === 'lulu') {
        locMatch = isLuluProperty;
      } else if (locationVal === 'gomti') {
        locMatch = isGomtiProperty;
      }

      // Search keyword match
      let searchMatch = true;
      if (searchVal) {
        searchMatch = cardText.includes(searchVal) || name.includes(searchVal) || area.includes(searchVal) || type.includes(searchVal) || slug.includes(searchVal);
      }

      const isMatch = catMatch && locMatch && searchMatch;
      card.style.display = isMatch ? 'flex' : 'none';
      if (isMatch) visibleCount++;
    });

    // Update count indicator
    const countEl = document.getElementById('visibleCount');
    if (countEl) {
      countEl.textContent = `Showing ${visibleCount} of ${cards.length} luxury homestays`;
    }

    // Sort visible cards if container exists
    const grid = document.getElementById('propertiesList');
    if (grid && sortVal !== 'recommended') {
      const sortedCards = cards.filter(c => c.style.display !== 'none').sort((a, b) => {
        const priceA = parseCardPrice(a);
        const priceB = parseCardPrice(b);
        const ratingA = parseFloat(a.dataset.rating || 0);
        const ratingB = parseFloat(b.dataset.rating || 0);

        if (sortVal === 'price-low') return priceA - priceB;
        if (sortVal === 'price-high') return priceB - priceA;
        if (sortVal === 'rating-high') return ratingB - ratingA;
        return 0;
      });

      sortedCards.forEach(c => grid.appendChild(c));
    }
  }

  function parseCardPrice(card) {
    const priceText = card.querySelector('.dir-card-price-main');
    if (!priceText) return 0;
    const match = priceText.textContent.replace(/,/g, '').match(/₹?(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // 4. Keyboard Navigation
  function setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      const modal = document.getElementById('luxuryPhotoLightbox');
      if (!modal || !modal.classList.contains('active')) return;

      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        navigateLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        navigateLightbox(1);
      }
    });
  }

  // 5. Smart WhatsApp & Link Sharing System
  window.shareProperty = function(slug, name, price, area, e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
    const propUrl = `${baseUrl}/${slug}.html`;

    const shareText = `*${name}* · ₹${price}/night\nLuxury 3BHK Homestay in ${area}, Lucknow.\n\n📸 Photos, pricing & instant direct booking:\n${propUrl}`;

    // Copy direct link to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(propUrl).catch(() => {});
    }

    showShareToast(`✓ Link Copied! Opening WhatsApp to share ${name}...`);

    // Web Share API on mobile / supporting devices
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      navigator.share({
        title: `${name} — Unique Haven Homes Lucknow`,
        text: shareText,
        url: propUrl
      }).catch(() => {
        openWhatsAppShare(shareText);
      });
    } else {
      // Desktop: Open WhatsApp contact/chat picker
      openWhatsAppShare(shareText);
    }
  };

  function openWhatsAppShare(text) {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  }

  function showShareToast(message) {
    let toast = document.getElementById('dirShareToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'dirShareToast';
      toast.className = 'dir-share-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="font-size:16px;">📲</span><span>${message}</span>`;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // Expose API
  window.LuxuryDirectory = {
    init: initLuxuryDirectory,
    openLightbox: openLightbox,
    closeLightbox: closeLightbox,
    filterCategory: filterCategory,
    navigateLightbox: navigateLightbox,
    shareProperty: window.shareProperty
  };

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLuxuryDirectory);
  } else {
    initLuxuryDirectory();
  }

})();
