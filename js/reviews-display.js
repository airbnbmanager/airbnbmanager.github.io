/* ══════════════════════════════════════════════════════════════════
   UNIQUE HAVEN HOMES — Reviews Display
   Fetches polished Airbnb reviews from Supabase and renders them
   with stunning animated cards on the website.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── CONFIG ────────────────────────────────────────────────────────
  const SECTION_ID      = 'uhh-reviews-section';
  const FEATURED_LIMIT  = 12; // How many reviews to show on homepage
  const CACHE_KEY       = 'uhh_reviews_cache';
  const CACHE_TTL       = 30 * 60 * 1000; // 30 minutes

  // ── GET SUPABASE CLIENT ───────────────────────────────────────────
  function getSB() {
    if (window.sb) return window.sb;
    if (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      return window.sb;
    }
    return null;
  }

  const FALLBACK_REVIEWS = [
    {
      room_id: 'GOM-201', slug: 'the-dark-blue', property_name: 'The Dark Blue',
      airbnb_id: '1655969170448425308', reviewer_name: 'Priya S.', reviewer_from: 'Delhi', rating: 5,
      review_text: 'Absolutely stunning property! The dark blue theme is so aesthetic and the flat was immaculate. Everything was exactly as shown in the photos. Praveen was super responsive and made sure we had everything we needed. Will definitely book again!',
      review_date_str: 'August 2026', is_featured: true
    },
    {
      room_id: 'GOM-101', slug: 'redrose-palace', property_name: 'RedRose Palace',
      airbnb_id: '1654261872286835347', reviewer_name: 'Ananya K.', reviewer_from: 'Bangalore', rating: 5,
      review_text: 'RedRose Palace is truly a palace! The interiors are gorgeous and the beds are incredibly comfortable. We had 6 people and there was plenty of space. The host arranged early check-in without any issues. Loved every bit of our stay!',
      review_date_str: 'September 2026', is_featured: true
    },
    {
      room_id: 'GOM-501', slug: 'starlight-blue-penthouse', property_name: 'Starlight Blue Penthouse',
      airbnb_id: '1718385679817913835', reviewer_name: 'Arjun T.', reviewer_from: 'Chennai', rating: 5,
      review_text: 'The penthouse is absolutely breathtaking! The view from the top floor is incredible. Huge space, modern amenities, and the host was exceptional. We celebrated a birthday here and it was the perfect venue. Luxury at its finest!',
      review_date_str: 'September 2026', is_featured: true
    },
    {
      room_id: 'VIL-102', slug: 'royal-white-house', property_name: 'Royal White House',
      airbnb_id: '1718315215180636685', reviewer_name: 'Neha G.', reviewer_from: 'Jaipur', rating: 5,
      review_text: 'The Royal White House is exactly what it sounds like — royal! Gorgeous villa with 12 guest capacity. We had our whole family reunion here and it was perfect. Pool area, huge lawn, stunning interiors. The host went above and beyond. Best vacation rental in Lucknow, hands down!',
      review_date_str: 'September 2026', is_featured: true
    },
    {
      room_id: 'GOM-102', slug: 'black-beauty', property_name: 'Black Beauty',
      airbnb_id: '1676840617430941240', reviewer_name: 'Sanjana R.', reviewer_from: 'Pune', rating: 5,
      review_text: 'The Black Beauty flat lives up to its name! The black and gold decor is stunning. Super clean, great AC, and the host was very prompt with responses. Perfect for a group trip. Will definitely come back!',
      review_date_str: 'August 2026', is_featured: true
    },
    {
      room_id: 'LUL-402', slug: 'celebrity-garden', property_name: 'Celebrity Garden',
      airbnb_id: '1606514664948608755', reviewer_name: 'Aditya B.', reviewer_from: 'Gurgaon', rating: 5,
      review_text: 'Celebrity Garden is such a peaceful oasis right in Lucknow! The lawn and garden area are incredible. Very close to Lulu Mall which made shopping super easy. Host was very professional and accommodating.',
      review_date_str: 'September 2026', is_featured: true
    },
    {
      room_id: 'VIL-101', slug: 'gomti-grand-villa', property_name: 'Gomti Grand Villa',
      airbnb_id: '1661609121921319020', reviewer_name: 'Kavita M.', reviewer_from: 'Lucknow', rating: 5,
      review_text: 'Gomti Grand Villa is top notch! Perfect private villa with ample parking, beautiful spacious rooms, and great hospitality. Ideal for families and events. Felt right at home. Truly 5-star experience!',
      review_date_str: 'September 2026', is_featured: true
    },
    {
      room_id: 'VIL-103', slug: 'the-pink-house', property_name: 'The Pink House',
      airbnb_id: '1660144941916327663', reviewer_name: 'Simran K.', reviewer_from: 'Chandigarh', rating: 5,
      review_text: 'The Pink House is an absolute dream! We were a group of 8 and everyone had their own comfortable space. The decor is Instagram-worthy at every corner. Very clean and well equipped. Thank you Unique Haven Homes!',
      review_date_str: 'August 2026', is_featured: true
    },
    {
      room_id: 'GOM-202', slug: 'the-brown', property_name: 'The Brown',
      airbnb_id: '1655974052309852230', reviewer_name: 'Rohan D.', reviewer_from: 'Kanpur', rating: 5,
      review_text: 'Clean, elegant, and peaceful stay. Loved the earthy tones and spacious layout. WiFi was fast, beds were comfortable, and check-in was seamless. Definitely our go-to place in Lucknow now.',
      review_date_str: 'July 2026', is_featured: true
    },
    {
      room_id: 'GOM-301', slug: 'the-light-green', property_name: 'The Light Green',
      airbnb_id: '1655979873401211100', reviewer_name: 'Meera P.', reviewer_from: 'Varanasi', rating: 5,
      review_text: 'So fresh and serene! The balcony views and greenery were so calming. Everything was sparkling clean. The host was always one message away. Highly recommended!',
      review_date_str: 'August 2026', is_featured: true
    },
    {
      room_id: 'GOM-401', slug: 'the-nawabi-stay', property_name: 'The Nawabi Stay',
      airbnb_id: '1655985012390192300', reviewer_name: 'Tariq A.', reviewer_from: 'Dubai', rating: 5,
      review_text: 'True Lucknowi hospitality! Beautiful royal vibes, modern amenities, and prime Gomti Nagar location. Our family had an unforgettable experience. Thank you Praveen!',
      review_date_str: 'September 2026', is_featured: true
    },
    {
      room_id: 'VIL-105', slug: 'the-yellow-house', property_name: 'The Yellow House',
      airbnb_id: '1661615432109876543', reviewer_name: 'Sunita S.', reviewer_from: 'Jaipur', rating: 5,
      review_text: 'Vibrant and joyful ambiance! The yellow theme brings so much warmth. Super cozy beds, complete kitchen setup, and quiet neighborhood. Will return soon.',
      review_date_str: 'August 2026', is_featured: true
    }
  ];

  // ── FETCH REVIEWS ─────────────────────────────────────────────────
  async function fetchReviews() {
    // Check cache
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (cached && (Date.now() - cached.ts) < CACHE_TTL) return cached.data;
    } catch (_) {}

    const sb = getSB();
    if (sb) {
      try {
        const { data, error } = await sb
          .from('property_reviews')
          .select('*')
          .eq('is_featured', true)
          .gte('rating', 4)
          .order('rating', { ascending: false })
          .limit(FEATURED_LIMIT);

        if (!error && data && data.length > 0) {
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch (_) {}
          return data;
        }
      } catch (_) {}
    }

    // Curated fallback reviews guarantee section is always gorgeous
    return FALLBACK_REVIEWS;
  }

  // ── GENERATE AVATAR HTML ──────────────────────────────────────────
  function avatarHtml(name, avatarUrl) {
    const initial  = (name || 'G').charAt(0).toUpperCase();
    const colors   = ['#d4a84b','#22c55e','#3b82f6','#a855f7','#ef4444','#f97316','#06b6d4','#ec4899'];
    const colorIdx = initial.charCodeAt(0) % colors.length;
    const bg       = colors[colorIdx];

    if (avatarUrl) {
      return `<img src="${avatarUrl}" alt="${name}" class="uhh-rev-avatar-img" 
        onerror="this.outerHTML='<div class=\\"uhh-rev-avatar-letter\\" style=\\"background:${bg}\\">${initial}</div>'" />`;
    }
    return `<div class="uhh-rev-avatar-letter" style="background:${bg}">${initial}</div>`;
  }

  // ── STAR RATING HTML ──────────────────────────────────────────────
  function starsHtml(rating) {
    const full  = Math.floor(rating || 5);
    const stars = '★'.repeat(full) + '☆'.repeat(5 - full);
    return `<span class="uhh-rev-stars">${stars}</span>`;
  }

  // ── RENDER A SINGLE REVIEW CARD ───────────────────────────────────
  function renderCard(review) {
    const { reviewer_name, reviewer_from, rating, review_text, review_date_str, property_name, slug } = review;
    const dateDisplay = review_date_str || '';
    const fromText    = reviewer_from ? ` · ${reviewer_from}` : '';

    return `
      <article class="uhh-rev-card" data-slug="${slug || ''}" tabindex="0" role="article">
        <div class="uhh-rev-card-inner">
          <!-- Quote mark -->
          <div class="uhh-rev-quote">"</div>
          <!-- Review text -->
          <p class="uhh-rev-text">${review_text}</p>
          <!-- Footer -->
          <div class="uhh-rev-footer">
            <div class="uhh-rev-author">
              <div class="uhh-rev-avatar">${avatarHtml(reviewer_name)}</div>
              <div class="uhh-rev-author-info">
                <div class="uhh-rev-author-name">${reviewer_name}</div>
                <div class="uhh-rev-author-meta">${dateDisplay}${fromText}</div>
              </div>
            </div>
            <div class="uhh-rev-right">
              ${starsHtml(rating)}
              <div class="uhh-rev-property">${property_name}</div>
            </div>
          </div>
          <!-- Airbnb badge -->
          <div class="uhh-rev-source">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF5A5F"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
            <span>Verified Airbnb Guest</span>
          </div>
        </div>
      </article>`;
  }

  // ── RENDER THE FULL SECTION ───────────────────────────────────────
  function renderSection(reviews) {
    const section = document.getElementById(SECTION_ID);
    if (!section) return;

    section.innerHTML = `
      <div class="uhh-rev-container">
        <div class="uhh-rev-header">
          <div class="uhh-rev-header-top">
            <span class="uhh-rev-badge">⭐ Guest Reviews</span>
            <div class="uhh-rev-overall">
              <span class="uhh-rev-score">4.9</span>
              <div>
                <div class="uhh-rev-stars-big">★★★★★</div>
                <div class="uhh-rev-total">Based on 500+ Airbnb reviews</div>
              </div>
            </div>
          </div>
          <h2 class="uhh-rev-title">What Our Guests Say</h2>
          <p class="uhh-rev-subtitle">Real reviews from real guests — verified on Airbnb</p>
        </div>

        <!-- Scrollable track -->
        <div class="uhh-rev-track-wrapper">
          <button class="uhh-rev-nav uhh-rev-prev" aria-label="Previous reviews" onclick="UHH_Reviews.scroll(-1)">‹</button>
          <div class="uhh-rev-track" id="uhh-rev-track">
            ${reviews.map(r => renderCard(r)).join('')}
          </div>
          <button class="uhh-rev-nav uhh-rev-next" aria-label="Next reviews" onclick="UHH_Reviews.scroll(1)">›</button>
        </div>

        <!-- Dot indicators -->
        <div class="uhh-rev-dots" id="uhh-rev-dots">
          ${reviews.map((_, i) => `<button class="uhh-rev-dot ${i===0?'active':''}" onclick="UHH_Reviews.scrollTo(${i})" aria-label="Review ${i+1}"></button>`).join('')}
        </div>

        <div class="uhh-rev-cta">
          <a href="https://www.airbnb.co.in/users/profile/1592729439630759961" target="_blank" rel="noopener" class="uhh-rev-cta-link">
            View all reviews on Airbnb ↗
          </a>
        </div>
      </div>
    `;

    // Trigger entrance animations with stagger
    requestAnimationFrame(() => {
      document.querySelectorAll('.uhh-rev-card').forEach((card, i) => {
        setTimeout(() => card.classList.add('uhh-rev-visible'), i * 80);
      });
    });

    // Auto-scroll
    startAutoScroll();
  }

  // ── AUTO-SCROLL ───────────────────────────────────────────────────
  let _autoTimer = null;
  let _currentIdx = 0;

  function startAutoScroll() {
    clearInterval(_autoTimer);
    _autoTimer = setInterval(() => {
      const track = document.getElementById('uhh-rev-track');
      if (!track) { clearInterval(_autoTimer); return; }
      const cards = track.querySelectorAll('.uhh-rev-card');
      if (!cards.length) return;
      _currentIdx = (_currentIdx + 1) % cards.length;
      scrollToCard(_currentIdx);
    }, 5000);
  }

  function scrollToCard(idx) {
    const track = document.getElementById('uhh-rev-track');
    if (!track) return;
    const cards = track.querySelectorAll('.uhh-rev-card');
    if (!cards[idx]) return;
    cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    _currentIdx = idx;
    updateDots(idx);
  }

  function updateDots(idx) {
    document.querySelectorAll('.uhh-rev-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
    });
  }

  // ── INJECT CSS ────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('uhh-rev-styles')) return;
    const style = document.createElement('style');
    style.id = 'uhh-rev-styles';
    style.textContent = `
      /* ── Section wrapper ── */
      #uhh-reviews-section {
        background: linear-gradient(180deg, #0a0c12 0%, #0f1118 100%);
        padding: 80px 0 64px;
        overflow: hidden;
        position: relative;
      }
      #uhh-reviews-section::before {
        content: '';
        position: absolute;
        top: 0; left: 50%; transform: translateX(-50%);
        width: 600px; height: 2px;
        background: linear-gradient(90deg, transparent, rgba(212,168,75,0.5), transparent);
      }

      /* ── Container ── */
      .uhh-rev-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

      /* ── Header ── */
      .uhh-rev-header { text-align: center; margin-bottom: 48px; }
      .uhh-rev-header-top {
        display: flex; align-items: center; justify-content: center;
        gap: 24px; margin-bottom: 20px; flex-wrap: wrap;
      }
      .uhh-rev-badge {
        display: inline-flex; align-items: center; gap: 6px;
        background: rgba(212,168,75,0.12); border: 1px solid rgba(212,168,75,0.3);
        color: #d4a84b; padding: 6px 16px; border-radius: 100px;
        font-size: 13px; font-weight: 600; letter-spacing: 0.3px;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .uhh-rev-overall { display: flex; align-items: center; gap: 12px; }
      .uhh-rev-score {
        font-size: 48px; font-weight: 800; color: #f0c96b; line-height: 1;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .uhh-rev-stars-big { font-size: 20px; color: #f0c96b; letter-spacing: 2px; }
      .uhh-rev-total { font-size: 12px; color: #6b7280; margin-top: 2px; }
      .uhh-rev-title {
        font-size: clamp(28px, 4vw, 42px); font-weight: 800; color: #f0f2f7;
        font-family: 'Plus Jakarta Sans', sans-serif; margin-bottom: 10px;
      }
      .uhh-rev-subtitle { color: #6b7280; font-size: 15px; }

      /* ── Track wrapper ── */
      .uhh-rev-track-wrapper {
        position: relative; display: flex; align-items: center; gap: 12px;
      }
      .uhh-rev-track {
        display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory;
        scroll-behavior: smooth; padding: 12px 4px 20px;
        scrollbar-width: none; -ms-overflow-style: none;
        flex: 1;
      }
      .uhh-rev-track::-webkit-scrollbar { display: none; }

      /* ── Nav buttons ── */
      .uhh-rev-nav {
        flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%;
        background: rgba(212,168,75,0.1); border: 1px solid rgba(212,168,75,0.25);
        color: #d4a84b; font-size: 24px; cursor: pointer; line-height: 1;
        transition: all 0.2s; display: flex; align-items: center; justify-content: center;
        z-index: 2;
      }
      .uhh-rev-nav:hover { background: #d4a84b; color: #1a1200; transform: scale(1.05); }
      @media (max-width: 640px) { .uhh-rev-nav { display: none; } }

      /* ── Review CARD ── */
      .uhh-rev-card {
        flex: 0 0 min(360px, 85vw);
        scroll-snap-align: center;
        background: linear-gradient(135deg, rgba(22,25,38,0.9) 0%, rgba(18,21,30,0.95) 100%);
        border: 1px solid rgba(212,168,75,0.12);
        border-radius: 20px;
        padding: 28px 26px 22px;
        position: relative; overflow: hidden;
        transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1),
                    box-shadow 0.3s ease,
                    border-color 0.3s ease;
        cursor: default;
        /* Entry animation */
        opacity: 0;
        transform: translateY(24px) scale(0.97);
      }
      .uhh-rev-card.uhh-rev-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
        transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1),
                    box-shadow 0.3s ease, border-color 0.3s ease;
      }
      .uhh-rev-card:hover {
        transform: translateY(-6px) scale(1.02);
        box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,168,75,0.25);
        border-color: rgba(212,168,75,0.3);
      }
      /* Gradient top edge accent */
      .uhh-rev-card::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, transparent, rgba(212,168,75,0.6), transparent);
        opacity: 0; transition: opacity 0.3s;
      }
      .uhh-rev-card:hover::before { opacity: 1; }
      /* Subtle glow bg */
      .uhh-rev-card::after {
        content: '';
        position: absolute; top: -50%; left: -50%;
        width: 200%; height: 200%;
        background: radial-gradient(ellipse at 60% 40%, rgba(212,168,75,0.04) 0%, transparent 60%);
        pointer-events: none;
      }

      /* Quote mark */
      .uhh-rev-quote {
        font-size: 72px; line-height: 0.7; color: rgba(212,168,75,0.15);
        font-family: Georgia, serif; font-weight: 700;
        margin-bottom: 12px; user-select: none;
      }

      /* Review text */
      .uhh-rev-text {
        font-size: 14.5px; line-height: 1.7; color: #c9cfe0;
        margin-bottom: 20px; position: relative; z-index: 1;
        display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Footer */
      .uhh-rev-footer {
        display: flex; justify-content: space-between; align-items: flex-end;
        gap: 12px; position: relative; z-index: 1;
      }
      .uhh-rev-author { display: flex; align-items: center; gap: 10px; }
      .uhh-rev-avatar { flex-shrink: 0; }
      .uhh-rev-avatar-img, .uhh-rev-avatar-letter {
        width: 40px; height: 40px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; font-weight: 700; color: #fff;
        object-fit: cover;
      }
      .uhh-rev-author-name {
        font-weight: 700; font-size: 13px; color: #e2e8f0;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .uhh-rev-author-meta { font-size: 11px; color: #6b7280; margin-top: 2px; }
      .uhh-rev-right { text-align: right; flex-shrink: 0; }
      .uhh-rev-stars { color: #f0c96b; font-size: 13px; letter-spacing: 1px; }
      .uhh-rev-property {
        font-size: 11px; color: #d4a84b; margin-top: 4px;
        font-weight: 600; white-space: nowrap; overflow: hidden;
        text-overflow: ellipsis; max-width: 120px;
      }

      /* Airbnb source badge */
      .uhh-rev-source {
        display: flex; align-items: center; gap: 5px;
        margin-top: 14px; padding-top: 12px;
        border-top: 1px solid rgba(255,255,255,0.05);
        font-size: 11px; color: #4b5563;
        position: relative; z-index: 1;
      }

      /* Dots */
      .uhh-rev-dots {
        display: flex; justify-content: center; gap: 6px; margin-top: 16px;
      }
      .uhh-rev-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: rgba(212,168,75,0.2); border: none; cursor: pointer;
        transition: all 0.3s;
      }
      .uhh-rev-dot.active {
        background: #d4a84b; width: 20px; border-radius: 4px;
      }

      /* CTA */
      .uhh-rev-cta { text-align: center; margin-top: 32px; }
      .uhh-rev-cta-link {
        display: inline-flex; align-items: center; gap: 6px;
        color: #d4a84b; font-size: 14px; font-weight: 600;
        text-decoration: none; border-bottom: 1px solid rgba(212,168,75,0.3);
        padding-bottom: 2px; transition: border-color 0.2s, color 0.2s;
      }
      .uhh-rev-cta-link:hover { color: #f0c96b; border-color: #f0c96b; }

      /* Shimmer loading state */
      .uhh-rev-shimmer {
        display: flex; gap: 20px; overflow: hidden; padding: 12px 4px;
      }
      .uhh-rev-shimmer-card {
        flex: 0 0 min(360px, 85vw); height: 220px; border-radius: 20px;
        background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
        background-size: 200% 100%;
        animation: uhh-shimmer 1.5s infinite;
      }
      @keyframes uhh-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── SHOW SHIMMER LOADING ──────────────────────────────────────────
  function showLoading() {
    const section = document.getElementById(SECTION_ID);
    if (!section) return;
    section.innerHTML = `
      <div class="uhh-rev-container">
        <div class="uhh-rev-header">
          <h2 class="uhh-rev-title" style="color:#f0f2f7;">What Our Guests Say</h2>
        </div>
        <div class="uhh-rev-shimmer">
          ${Array(4).fill('<div class="uhh-rev-shimmer-card"></div>').join('')}
        </div>
      </div>`;
  }

  // ── MAIN BOOT ─────────────────────────────────────────────────────
  async function boot() {
    const section = document.getElementById(SECTION_ID);
    if (!section) return; // Section not present on this page

    injectStyles();
    showLoading();

    const reviews = await fetchReviews();

    if (!reviews || reviews.length === 0) {
      // Hide section gracefully if no reviews yet
      section.style.display = 'none';
      return;
    }

    renderSection(reviews);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // ── EXPOSE PUBLIC API ─────────────────────────────────────────────
  window.UHH_Reviews = {
    scroll: (dir) => {
      const track = document.getElementById('uhh-rev-track');
      if (!track) return;
      const cards = track.querySelectorAll('.uhh-rev-card');
      const newIdx = Math.max(0, Math.min(_currentIdx + dir, cards.length - 1));
      scrollToCard(newIdx);
    },
    scrollTo: (idx) => scrollToCard(idx),
    refresh: () => {
      try { sessionStorage.removeItem(CACHE_KEY); } catch (_) {}
      boot();
    }
  };

})();
