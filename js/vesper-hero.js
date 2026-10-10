/**
 * Vesper Hero Showcase Controller — All 17 Luxe Properties
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

(function() {
  'use strict';

  // 17 Curated Stays Catalog with Editorial Headlines & Descriptions
  const PROPERTIES_METADATA = [
    {
      slug: 'royal-white-house',
      name: 'Royal White House',
      type: 'Royal Villa · Shaheed Path',
      headline: 'Come find your royal quiet.',
      desc: 'The entire white-marble villa, exclusively yours. 4 luxury suites, private lawn, and 24/7 caretaker near Lulu Mall & Airport.',
      specs: ['👥 Sleeps 12', '🛏️ 4 King Suites', '❄️ 100% AC', '🚗 Free Parking', '✨ Save 15% Direct'],
      price: '₹5,199 / night',
      spaces: [
        { num: '01', name: 'Grand Marble Hall', desc: 'High ceiling, plush seating & chandeliers', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/b018acc7-5ccb-440e-8bc0-afbfbb9fb2a0.jpeg?im_w=1200' },
        { num: '02', name: 'Royal Master Suite', desc: 'King bed with warm ambient cove lighting', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/b0aaece7-bd13-44a2-a040-1af26e035314.jpeg?im_w=1200' },
        { num: '03', name: 'Regal Guest Suite', desc: 'Spacious second suite with curated art', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/000de00d-6a12-43af-b11b-7fee2265d162.jpeg?im_w=1200' },
        { num: '04', name: 'Designer Marble Bath', desc: 'Glass cubicle & premium chrome fittings', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/05e0ca85-6bbb-4ab3-a47a-1e0f7da73583.jpeg?im_w=1200' },
        { num: '05', name: 'Sunset Terrace & Lawn', desc: 'Open sky panoramic views & lawn', image: 'https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/7ee5b490-e361-4270-9d5c-516e594f4698.jpeg?im_w=1200' }
      ]
    },
    {
      slug: 'black-beauty',
      name: 'Black Beauty',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Step into bold modern sophistication.',
      desc: 'Monochromatic black-and-wood luxury in Vikalp Khand. Plush leather lounge, smart mood lighting, and curated comforts.',
      specs: ['👥 Sleeps 10', '🛏️ 3 King Beds', '❄️ 100% AC', '📶 100 Mbps Wi-Fi', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Obsidian Living Lounge', desc: 'Plush sofa suite & ambient lighting' },
        { num: '02', name: 'Executive Master Bedroom', desc: 'King bed with charcoal acoustic wall' },
        { num: '03', name: 'Contemporary Guest Suite', desc: 'Cozy modern bedroom with work desk' },
        { num: '04', name: 'Luxury En-Suite Bath', desc: 'Polished tiles & walk-in shower' },
        { num: '05', name: 'Private Green Balcony', desc: 'Airy balcony overlooking quiet greens' }
      ]
    },
    {
      slug: 'starlight-blue-penthouse',
      name: 'Starlight Blue Penthouse',
      type: '4BHK Panoramic Penthouse · Gomti Nagar',
      headline: 'Elevate your stay above the skyline.',
      desc: 'Opulent top-floor penthouse with sprawling terrace, panoramic city views, and designer starry lighting.',
      specs: ['👥 Sleeps 14', '🛏️ 4 King Suites', '🌆 Panoramic Terrace', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹6,499 / night',
      spaces: [
        { num: '01', name: 'Sky High Grand Living', desc: 'Spacious lounge with city skyline views' },
        { num: '02', name: 'Panorama Master Suite', desc: 'King bed with floor-to-ceiling glass' },
        { num: '03', name: 'Starry Ceiling Suite', desc: 'Ambient starlight cove lighting' },
        { num: '04', name: 'Luxury Spa Bathroom', desc: 'Designer vanity & glass cubicle' },
        { num: '05', name: 'Open Sky Terrace', desc: 'Private rooftop terrace for evening chai' }
      ]
    },
    {
      slug: 'gomti-grand-villa',
      name: 'Gomti Grand Villa',
      type: '4BHK Royal Villa · Gomti Nagar',
      headline: 'Regal sprawling grandeur in Gomti Nagar.',
      desc: 'Expansive private villa with lush courtyards, lavish traditional seating, and unmatched Nawabi hospitality.',
      specs: ['👥 Sleeps 14', '🛏️ 4 Luxury Bedrooms', '🌳 Private Courtyard', '🚗 Dedicated Parking', '✨ Save 15% Direct'],
      price: '₹5,499 / night',
      spaces: [
        { num: '01', name: 'Grand Diwan Living', desc: 'Lavish high-ceiling family lounge' },
        { num: '02', name: 'Maharajah Master Bedroom', desc: 'King size bed with heritage touches' },
        { num: '03', name: 'Royal Guest Room', desc: 'Plush bedding with classic decor' },
        { num: '04', name: 'Classic En-Suite Bath', desc: 'Spacious tiled bath with hot shower' },
        { num: '05', name: 'Green Courtyard Lawn', desc: 'Private front garden & verandah' }
      ]
    },
    {
      slug: 'celebrity-garden',
      name: 'Celebrity Garden',
      type: 'Luxury Farmhouse & Villa · Shaheed Path',
      headline: 'Private garden sanctuary in Lucknow.',
      desc: 'Private estate enveloped in lush greenery, outdoor lawn seating, and complete privacy for families and celebrations.',
      specs: ['👥 Sleeps 15', '🏡 Private Lawn & Gazebo', '🛏️ 4 Bedrooms', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹5,999 / night',
      spaces: [
        { num: '01', name: 'Garden View Living', desc: 'Glass-walled lounge overlooking gardens' },
        { num: '02', name: 'Garden Master Suite', desc: 'King bed with serene lawn vistas' },
        { num: '03', name: 'Verandah Bedroom', desc: 'Cool breeze & garden-facing windows' },
        { num: '04', name: 'Luxury Washroom', desc: 'Clean modern bathroom with amenities' },
        { num: '05', name: 'Outdoor Gazebo & Lawn', desc: 'Expansive grass lawn & sitting area' }
      ]
    },
    {
      slug: 'the-dark-blue',
      name: 'The Dark Blue',
      type: '3BHK Luxury Flat · Vikalp Khand',
      headline: 'Deep oceanic calm in the heart of the city.',
      desc: 'Signature navy and velvet styled apartment with fast Wi-Fi, modular kitchen, and quiet leafy balcony.',
      specs: ['👥 Sleeps 10', '🛏️ 3 King Beds', '🍳 Modular Kitchen', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Deep Blue Salon', desc: 'Navy blue velvet couch & smart TV' },
        { num: '02', name: 'King Suite Bedroom', desc: 'Plush king bed with warm lamps' },
        { num: '03', name: 'Calming Blue Suite', desc: 'Serene guest bedroom with AC' },
        { num: '04', name: 'Modern Bathroom', desc: 'Spotless tiled bathroom with geyser' },
        { num: '05', name: 'Skyline Balcony', desc: 'Balcony with outdoor seating' }
      ]
    },
    {
      slug: 'the-yellow-house',
      name: 'The Yellow House',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Warm golden sunshine & soulful comfort.',
      desc: 'Vibrant, sun-drenched interiors with cheerful aesthetics, plush couches, and family-friendly dining.',
      specs: ['👥 Sleeps 10', '🛏️ 3 King Beds', '☀️ Sunlit Balcony', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Sunlit Yellow Lounge', desc: 'Cheerful yellow sofas & warm vibes' },
        { num: '02', name: 'Golden Glow Bedroom', desc: 'Bright king bedroom with fresh linen' },
        { num: '03', name: 'Family Guest Suite', desc: 'Spacious second bedroom with AC' },
        { num: '04', name: 'Clean Modern Bath', desc: 'Well-appointed bathroom & vanity' },
        { num: '05', name: 'Morning Tea Balcony', desc: 'Quiet terrace view of Gomti Nagar' }
      ]
    },
    {
      slug: 'the-green-house',
      name: 'The Green House',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Botanical oasis & serene indoor greens.',
      desc: 'Earthy tones, natural indoor foliage, and peaceful zen ambiance for true rejuvenation.',
      specs: ['👥 Sleeps 10', '🌿 Botanical Decor', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Botanical Living Hall', desc: 'Lush potted greenery & soothing decor' },
        { num: '02', name: 'Zen Forest Bedroom', desc: 'Calming king suite with garden art' },
        { num: '03', name: 'Emerald Guest Suite', desc: 'Comfortable air-conditioned bedroom' },
        { num: '04', name: 'Modern Bath', desc: 'Sparkling clean bathroom with hot water' },
        { num: '05', name: 'Plant Lover Balcony', desc: 'Green corner balcony with fresh air' }
      ]
    },
    {
      slug: 'the-pink-house',
      name: 'The Pink House',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Blush pastels, bohemian charm & romance.',
      desc: 'Aesthetic blush pink tones, cozy boho corners, and soft velvet textures crafted for aesthetic stays.',
      specs: ['👥 Sleeps 10', '🌸 Boho Chic Decor', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Blush Velvet Salon', desc: 'Rose gold lighting & pastel lounge' },
        { num: '02', name: 'Pastel Dream Bedroom', desc: 'Romantic king suite with soft hues' },
        { num: '03', name: 'Cozy Reading Suite', desc: 'Quiet aesthetic bedroom for rest' },
        { num: '04', name: 'Marble Bathroom', desc: 'Clean fittings & ambient mirror' },
        { num: '05', name: 'Floral Sunset Balcony', desc: 'Charming balcony with skyline view' }
      ]
    },
    {
      slug: 'the-light-green',
      name: 'The Light Green',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Fresh sage breeze & minimalist tranquility.',
      desc: 'Clean Scandinavian lines paired with soft sage tones and airy spacious rooms in Chinhat.',
      specs: ['👥 Sleeps 10', '🛏️ 3 King Beds', '❄️ 100% AC', '📶 100 Mbps Wi-Fi', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Sage Minimalist Hall', desc: 'Airy open living with soft tones' },
        { num: '02', name: 'Peaceful King Suite', desc: 'Uncluttered master bedroom' },
        { num: '03', name: 'Nordic Guest Suite', desc: 'Second queen suite with desk' },
        { num: '04', name: 'Clean Washroom', desc: 'Spotless bathroom with shower' },
        { num: '05', name: 'Fresh Air Balcony', desc: 'Overlooking quiet neighborhood' }
      ]
    },
    {
      slug: 'the-velvet-house',
      name: 'The Velvet House',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Plush royal textures & evening elegance.',
      desc: 'Rich velvet furnishings, deep mood lighting, and supreme comfort in Gomti Nagar.',
      specs: ['👥 Sleeps 10', '🛋️ Velvet Lounge', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Velvet Lounge Salon', desc: 'Plush royal velvet upholstery' },
        { num: '02', name: 'Royale Master Suite', desc: 'Deep comfort king size bed' },
        { num: '03', name: 'Velvet Guest Suite', desc: 'Curated cozy guest bedroom' },
        { num: '04', name: 'Designer Bath', desc: 'Polished bathroom with amenities' },
        { num: '05', name: 'Evening Balcony', desc: 'Cozy balcony for twilight coffee' }
      ]
    },
    {
      slug: 'redrose-palace',
      name: 'Redrose Palace',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Opulent palace grandeur & timeless romance.',
      desc: 'Rich crimson accents, grand chandeliers, and regal Nawabi comfort for memorable stays.',
      specs: ['👥 Sleeps 10', '🌹 Palace Interiors', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Crimson Palace Hall', desc: 'Chandelier lit regal lounge' },
        { num: '02', name: 'Royal Rose Bedroom', desc: 'King bed with plush red accents' },
        { num: '03', name: 'Classic Guest Suite', desc: 'Spacious second bedroom with AC' },
        { num: '04', name: 'Marble Bath', desc: 'Spotless tiled bathroom' },
        { num: '05', name: 'Grand Balcony', desc: 'Open terrace view of the city' }
      ]
    },
    {
      slug: 'the-nawabi-stay',
      name: 'The Nawabi Stay',
      type: '3BHK Heritage Flat · Gomti Nagar',
      headline: 'Authentic royal Awadhi heritage hospitality.',
      desc: 'Experience traditional Lakhnawi art, heritage architecture, and warm personalized care.',
      specs: ['👥 Sleeps 10', '👑 Awadhi Heritage', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Awadhi Heritage Baithak', desc: 'Traditional royal diwan seating' },
        { num: '02', name: 'Nawabi Diwan Bedroom', desc: 'Ornate king suite with heritage art' },
        { num: '03', name: 'Shahi Guest Suite', desc: 'Comfortable guest bedroom with AC' },
        { num: '04', name: 'Clean Modern Bath', desc: 'Modern bathroom with hot water' },
        { num: '05', name: 'Courtyard View Balcony', desc: 'Peaceful balcony with tree views' }
      ]
    },
    {
      slug: 'the-unique',
      name: 'The Unique',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Our signature original boutique home.',
      desc: 'The pioneer flat of The Unique Haven Homes, impeccably maintained with 4.9+ rating.',
      specs: ['👥 Sleeps 10', '⭐ 4.9+ Top Rated', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Signature Living Room', desc: 'Timeless comfort with smart TV' },
        { num: '02', name: 'Prime Master Bedroom', desc: 'Generous king bed & wardrobe' },
        { num: '03', name: 'Curated Guest Suite', desc: 'Bright second bedroom with AC' },
        { num: '04', name: 'Modern Bathroom', desc: 'Spotless vanity & glass partition' },
        { num: '05', name: 'Sunset Balcony', desc: 'Open view facing west sunset' }
      ]
    },
    {
      slug: 'the-brown',
      name: 'The Brown',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Warm teakwood warmth & timeless luxury.',
      desc: 'Rich walnut and teakwood accents, earthy textures, and an ultra-cozy ambiance.',
      specs: ['👥 Sleeps 10', '🪵 Teakwood Interiors', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Teakwood Living Salon', desc: 'Warm wooden panelling & soft sofa' },
        { num: '02', name: 'Warm Walnut Bedroom', desc: 'Wood accented king suite' },
        { num: '03', name: 'Earthy Guest Suite', desc: 'Minimal cozy second suite' },
        { num: '04', name: 'Modern Bath', desc: 'Tiled bathroom with instant geyser' },
        { num: '05', name: 'Relaxing Balcony', desc: 'Quiet evening sit-out balcony' }
      ]
    },
    {
      slug: 'green-forest',
      name: 'Green Forest',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Deep woodland tranquility & fresh greenery.',
      desc: 'Surrounded by green treetops, offering quiet bird songs and serene family living.',
      specs: ['👥 Sleeps 10', '🌲 Forest Vibe', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Pine Living Lounge', desc: 'Natural forest hues & calm ambiance' },
        { num: '02', name: 'Canopy Master Suite', desc: 'Tree-facing master bedroom' },
        { num: '03', name: 'Woodland Bedroom', desc: 'Comfortable guest bedroom with AC' },
        { num: '04', name: 'Fresh Bath', desc: 'Clean modern bathroom' },
        { num: '05', name: 'Tree Canopy Balcony', desc: 'Balcony tucked in green treetops' }
      ]
    },
    {
      slug: 'pink-paradise',
      name: 'Pink Paradise',
      type: '3BHK Luxury Flat · Gomti Nagar',
      headline: 'Soft pastel dreams & joyful celebration.',
      desc: 'Candy pastels, photogenic selfie corners, and relaxed lounge seating for group trips.',
      specs: ['👥 Sleeps 10', '📸 Highly Photogenic', '🛏️ 3 King Beds', '❄️ 100% AC', '✨ Save 15% Direct'],
      price: '₹4,500 / night',
      spaces: [
        { num: '01', name: 'Paradise Pink Living', desc: 'Vibrant pastel lounge with photo spots' },
        { num: '02', name: 'Dreamy Pastel Bedroom', desc: 'Playful pastel master bedroom' },
        { num: '03', name: 'Candy Guest Suite', desc: 'Air-conditioned cozy guest room' },
        { num: '04', name: 'Clean Bath', desc: 'Fresh bathroom with modern amenities' },
        { num: '05', name: 'Skyline Balcony', desc: 'Open sky balcony with fresh breeze' }
      ]
    }
  ];

  let currentProperty = PROPERTIES_METADATA[0]; // Default: Royal White House
  let currentRoomIndex = 0;
  let autoTimer = null;
  let activeRoomData = [];

  function getPropertyImages(slug) {
    const db = window.UHH_PHOTO_DB && window.UHH_PHOTO_DB[slug];
    const localCover = `assets/properties/${slug}/cover.jpg`;

    if (!db || !db.categories) {
      return [localCover, localCover, localCover, localCover, localCover];
    }

    const living = (db.categories.living_hall && db.categories.living_hall[0]) || localCover;
    const bed1 = (db.categories.bedrooms && db.categories.bedrooms[0]) || living;
    const bed2 = (db.categories.bedrooms && db.categories.bedrooms[1]) || bed1;
    const bath = (db.categories.bathrooms && db.categories.bathrooms[0]) || bed1;
    const balcony = (db.categories.balcony && db.categories.balcony[0]) || (db.photos && db.photos[4]) || living;

    return [living, bed1, bed2, bath, balcony];
  }

  function loadProperty(propSlug) {
    const prop = PROPERTIES_METADATA.find(p => p.slug === propSlug) || PROPERTIES_METADATA[0];
    currentProperty = prop;
    currentRoomIndex = 0;

    // Check if live CRM rate is available
    let displayPrice = prop.price;
    if (window.UHH_LIVE_RATES) {
      const live = window.UHH_LIVE_RATES[prop.slug];
      if (live && live.base_price) {
        displayPrice = '₹' + Number(live.base_price).toLocaleString('en-IN') + ' / night';
      }
    }

    const images = getPropertyImages(prop.slug);
    const localCover = `assets/properties/${prop.slug}/cover.jpg`;

    activeRoomData = prop.spaces.map((sp, idx) => ({
      num: sp.num,
      name: sp.name,
      desc: sp.desc,
      image: sp.image || images[idx] || localCover,
      fallback: localCover
    }));

    // Update Editorial Text
    const headlineEl = document.querySelector('.vesper-headline');
    if (headlineEl) {
      headlineEl.innerHTML = prop.headline.replace(/(\b[a-zA-Z]+[.?!]?$)/, '<em>$1</em>');
    }

    const subcopyEl = document.querySelector('.vesper-subcopy');
    if (subcopyEl) {
      subcopyEl.innerHTML = `${prop.desc} <strong>From ${displayPrice}</strong> (Save 15% via direct booking).`;
    }

    // Update Specs Pills
    const specRow = document.querySelector('.vesper-spec-row');
    if (specRow) {
      specRow.innerHTML = prop.specs.map(s => {
        const isHighlight = s.includes('Save 15%');
        return `<span class="vesper-pill ${isHighlight ? 'highlight' : ''}">${s}</span>`;
      }).join('');
    }

    // Update Action Buttons
    const btnExplore = document.getElementById('vesperExploreVillaBtn') || document.querySelector('.vesper-btn-secondary');
    if (btnExplore) {
      btnExplore.href = `${prop.slug}.html`;
      btnExplore.innerHTML = `🏛️ ${prop.name} Details`;
    }

    const navBookBtn = document.querySelector('.vesper-btn-book');
    if (navBookBtn) {
      navBookBtn.href = `book.html?property=${prop.slug}`;
    }

    if (typeof updateBookingWidgetLink === 'function') {
      updateBookingWidgetLink();
    }

    // Render Background Slides
    const viewport = document.getElementById('vesperBgViewport');
    if (viewport) {
      viewport.innerHTML = '';
      activeRoomData.forEach((room, idx) => {
        const slide = document.createElement('div');
        slide.className = `vesper-bg-slide ${idx === 0 ? 'active' : ''}`;
        slide.id = `vesperSlide_${idx}`;
        slide.style.backgroundImage = `url('${room.image}'), url('${room.fallback}')`;
        viewport.appendChild(slide);
      });
    }

    // Render Flight Stepper Items
    const stepsList = document.getElementById('vesperStepsList');
    if (stepsList) {
      stepsList.innerHTML = '';
      activeRoomData.forEach((room, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `vesper-step-item ${idx === 0 ? 'active' : ''}`;
        btn.setAttribute('aria-label', `Navigate to ${room.name}`);
        btn.onclick = () => {
          goToRoom(idx);
          restartTimer();
        };

        btn.innerHTML = `
          <div class="vesper-step-bullet">${room.num}</div>
          <div class="vesper-step-info">
            <span class="vesper-step-name">${room.name}</span>
            <span class="vesper-step-desc">${room.desc}</span>
          </div>
        `;
        stepsList.appendChild(btn);
      });
    }

    // Reset Counter
    const activeNumEl = document.getElementById('vesperActiveNum');
    if (activeNumEl) {
      activeNumEl.textContent = '01';
    }

    restartTimer();
  }

  function goToRoom(index) {
    if (index < 0 || index >= activeRoomData.length) return;
    currentRoomIndex = index;

    // Update slides
    const slides = document.querySelectorAll('.vesper-bg-slide');
    slides.forEach((s, idx) => {
      if (idx === index) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });

    // Update stepper buttons
    const steps = document.querySelectorAll('.vesper-step-item');
    steps.forEach((st, idx) => {
      if (idx === index) {
        st.classList.add('active');
      } else {
        st.classList.remove('active');
      }
    });

    // Update Counter
    const activeNumEl = document.getElementById('vesperActiveNum');
    if (activeNumEl && activeRoomData[index]) {
      activeNumEl.textContent = activeRoomData[index].num;
    }
  }

  function startAutoCycle() {
    stopAutoCycle();
    autoTimer = setInterval(() => {
      if (activeRoomData.length === 0) return;
      const next = (currentRoomIndex + 1) % activeRoomData.length;
      goToRoom(next);
    }, 6000);
  }

  function stopAutoCycle() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function restartTimer() {
    stopAutoCycle();
    startAutoCycle();
  }

  function initVesperHero() {
    // 1. Populate Property Picker Dropdown in Tag Bar
    const tagWrap = document.querySelector('.vesper-tag-bar') || document.querySelector('.vesper-tag');
    if (tagWrap) {
      tagWrap.className = 'vesper-tag-bar';
      tagWrap.innerHTML = `
        <span class="vesper-tag-label">⭐ FEATURED STAY:</span>
        <select id="vesperPropertySelect" class="vesper-property-picker" aria-label="Select Villa Showcase">
          ${PROPERTIES_METADATA.map(p => `
            <option value="${p.slug}" ${p.slug === 'royal-white-house' ? 'selected' : ''}>
              ${p.name} (${p.type.split('·')[0].trim()})
            </option>
          `).join('')}
        </select>
      `;

      const selectEl = document.getElementById('vesperPropertySelect');
      if (selectEl) {
        selectEl.addEventListener('change', function(e) {
          loadProperty(e.target.value);
        });
      }
    }

    // 2. Connect Search Input to Directory Filters
    const vesperInput = document.getElementById('vesperSearchInput');
    const mainSearchInput = document.getElementById('propertySearchInput');
    if (vesperInput && mainSearchInput) {
      vesperInput.addEventListener('input', function(e) {
        mainSearchInput.value = e.target.value;
        if (typeof window.applyFilters === 'function') {
          window.applyFilters();
        }
      });
      vesperInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          scrollToDirectory();
        }
      });
    }

    // 3. Connect Location Selector
    const vesperLocation = document.getElementById('vesperLocationSelect');
    const mainLocation = document.getElementById('locationSelect');
    if (vesperLocation && mainLocation) {
      vesperLocation.addEventListener('change', function(e) {
        mainLocation.value = e.target.value;
        if (typeof window.applyFilters === 'function') {
          window.applyFilters();
        }
        scrollToDirectory();
      });
    }

    // 4. Initial load with Royal White House
    loadProperty('royal-white-house');

    // 5. Initialize Advanced Motion & Interactivity
    initBookingWidget();
    initTypewriter();
    initScrollReveal();
    initSpacesLightbox();
    initSpacesProgressBar();
    initCollectionFilter();
    initStickyMobileBar();
  }

  // ── Centralized Booking Widget Sync (Zero Duplicates) ──
  function updateBookingWidgetLink() {
    const submitBtn = document.getElementById('vesperSubmitBtn');
    const dateInput = document.getElementById('vesperCheckIn');
    const guestSelect = document.getElementById('vesperGuests');
    const propSelect = document.getElementById('vesperPropertySelect');

    const prop = propSelect ? propSelect.value : 'royal-white-house';
    const date = dateInput ? dateInput.value : '';
    const guests = guestSelect ? guestSelect.value : '12';

    if (submitBtn) {
      submitBtn.href = `book.html?property=${encodeURIComponent(prop)}&checkin=${encodeURIComponent(date)}&guests=${encodeURIComponent(guests)}`;
    }
  }

  function initBookingWidget() {
    const dateInput = document.getElementById('vesperCheckIn');
    const guestSelect = document.getElementById('vesperGuests');
    const propSelect = document.getElementById('vesperPropertySelect');

    if (dateInput) dateInput.addEventListener('change', updateBookingWidgetLink);
    if (guestSelect) guestSelect.addEventListener('change', updateBookingWidgetLink);
    if (propSelect) propSelect.addEventListener('change', updateBookingWidgetLink);

    updateBookingWidgetLink();
  }

  // ── 5. TYPEWRITER EFFECT (Company Branding & 17 Stays) ──
  const TYPEWRITER_PHRASES = [
    "The Unique Haven Homes · 17 Curated Stays in Lucknow.",
    "Presidential Villas, Skyline Penthouses & 3BHK Suites.",
    "Save 15% booking direct with verified Superhosts.",
    "Royal White House · Flagship presidential residence."
  ];

  function initTypewriter() {
    const el = document.getElementById('vesperTypewriter');
    if (!el) return;
    let phraseIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    function typeLoop() {
      const currentPhrase = TYPEWRITER_PHRASES[phraseIdx];
      if (isDeleting) {
        el.textContent = currentPhrase.substring(0, charIdx - 1);
        charIdx--;
      } else {
        el.textContent = currentPhrase.substring(0, charIdx + 1);
        charIdx++;
      }

      let speed = isDeleting ? 28 : 55;

      if (!isDeleting && charIdx === currentPhrase.length) {
        speed = 2200; // Pause at end of sentence
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % TYPEWRITER_PHRASES.length;
        speed = 450;
      }

      setTimeout(typeLoop, speed);
    }
    typeLoop();
  }

  // ── 6. SCROLL REVEAL INTERSECTION OBSERVER ──
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.vesper-reveal');
    if (!reveals.length) return;

    if (!('IntersectionObserver' in window)) {
      reveals.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.12
    });

    reveals.forEach(el => observer.observe(el));
  }

  // ── 7. INTERACTIVE LIGHTBOX MODAL (Airbnb / 21st.dev Style) ──
  let lightboxPhotos = [];
  let currentLightboxIdx = 0;

  function initSpacesLightbox() {
    const cards = document.querySelectorAll('.vesper-space-card');
    if (!cards.length) return;

    lightboxPhotos = Array.from(cards).map(card => {
      const img = card.querySelector('img');
      const tag = card.querySelector('.vesper-space-tag')?.textContent || 'SPACE';
      const name = card.querySelector('.vesper-space-name')?.textContent || 'Villa Suite';
      return {
        src: img ? img.src : '',
        tag: tag,
        name: name
      };
    });

    cards.forEach((card, idx) => {
      card.addEventListener('click', () => openLightbox(idx));
      const media = card.querySelector('.vesper-space-media');
      if (media && !media.querySelector('.vesper-space-zoom-hint')) {
        const hint = document.createElement('div');
        hint.className = 'vesper-space-zoom-hint';
        hint.innerHTML = '<span>🔍 View Photo</span>';
        media.appendChild(hint);
      }
    });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      const lb = document.getElementById('vesperLightbox');
      if (!lb || !lb.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
    });
  }

  function openLightbox(index) {
    let lb = document.getElementById('vesperLightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'vesperLightbox';
      lb.className = 'vesper-lightbox';
      lb.innerHTML = `
        <div class="vesper-lightbox-header">
          <div class="vesper-lightbox-title-wrap">
            <span class="vesper-lightbox-tag" id="lbTag">THE SPACES</span>
            <h3 class="vesper-lightbox-title" id="lbTitle">Villa Walkthrough</h3>
          </div>
          <button class="vesper-lightbox-close" onclick="closeLightbox()" aria-label="Close photo viewer">✕</button>
        </div>
        <div class="vesper-lightbox-stage">
          <button class="vesper-lightbox-nav-btn vesper-lightbox-prev" onclick="prevLightbox()" aria-label="Previous photo">‹</button>
          <img id="lbImg" class="vesper-lightbox-img" src="" alt="Villa Space High-Res">
          <button class="vesper-lightbox-nav-btn vesper-lightbox-next" onclick="nextLightbox()" aria-label="Next photo">›</button>
        </div>
        <div class="vesper-lightbox-footer">
          <div class="vesper-lightbox-counter" id="lbCounter">01 / 05</div>
          <a class="vesper-lightbox-btn-book" href="book.html?property=royal-white-house">⚡ Reserve This Villa</a>
        </div>
      `;
      document.body.appendChild(lb);

      lb.addEventListener('click', (e) => {
        if (e.target === lb || e.target.classList.contains('vesper-lightbox-stage')) {
          closeLightbox();
        }
      });
    }

    currentLightboxIdx = index;
    updateLightboxUI();
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function updateLightboxUI() {
    if (!lightboxPhotos.length) return;
    const item = lightboxPhotos[currentLightboxIdx];
    const imgEl = document.getElementById('lbImg');
    const tagEl = document.getElementById('lbTag');
    const titleEl = document.getElementById('lbTitle');
    const counterEl = document.getElementById('lbCounter');

    if (imgEl) {
      imgEl.style.opacity = '0';
      imgEl.src = item.src;
      setTimeout(() => { imgEl.style.opacity = '1'; }, 80);
    }
    if (tagEl) tagEl.textContent = item.tag;
    if (titleEl) titleEl.textContent = item.name;
    if (counterEl) counterEl.textContent = `0${currentLightboxIdx + 1} / 0${lightboxPhotos.length}`;
  }

  function nextLightbox() {
    currentLightboxIdx = (currentLightboxIdx + 1) % lightboxPhotos.length;
    updateLightboxUI();
  }

  function prevLightbox() {
    currentLightboxIdx = (currentLightboxIdx - 1 + lightboxPhotos.length) % lightboxPhotos.length;
    updateLightboxUI();
  }

  function closeLightbox() {
    const lb = document.getElementById('vesperLightbox');
    if (lb) lb.classList.remove('active');
    document.body.style.overflow = '';
  }

  window.openLightbox = openLightbox;
  window.closeLightbox = closeLightbox;
  window.nextLightbox = nextLightbox;
  window.prevLightbox = prevLightbox;

  // ── 8. SYNC PROGRESS BAR WITH SPACES SCROLL ──
  function initSpacesProgressBar() {
    const grid = document.querySelector('.vesper-spaces-grid');
    const fill = document.querySelector('.vesper-spaces-progress-fill');
    if (!grid || !fill) return;

    grid.addEventListener('scroll', () => {
      const maxScroll = grid.scrollWidth - grid.clientWidth;
      if (maxScroll <= 0) {
        fill.style.width = '100%';
        return;
      }
      const pct = Math.min(100, Math.max(20, (grid.scrollLeft / maxScroll) * 100));
      fill.style.width = pct + '%';
    });
  }

  // ── 9. FAST CLIENT-SIDE FILTERING FOR 17 LUXURY STAYS ──
  function initCollectionFilter() {
    const filterBtns = document.querySelectorAll('.vesper-filter-btn');
    const stayCards = document.querySelectorAll('.vesper-stay-card');
    if (!filterBtns.length || !stayCards.length) return;

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter') || 'all';

        stayCards.forEach(card => {
          const category = card.getAttribute('data-category') || '';
          if (filter === 'all' || category === filter || category.includes(filter)) {
            card.style.display = '';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // ── 10. TACTILE STICKY MOBILE BOOKING BAR ──
  function initStickyMobileBar() {
    const bar = document.getElementById('vesperMobileStickyBar');
    if (!bar) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.scrollY > 300) {
            bar.classList.add('visible');
          } else {
            bar.classList.remove('visible');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ── 11. REACTIVE CRM PRICE EVENT LISTENER ──
  window.addEventListener('uhh:pricesSynced', () => {
    if (currentProperty && window.UHH_LIVE_RATES) {
      const live = window.UHH_LIVE_RATES[currentProperty.slug];
      if (live && live.base_price) {
        const subcopyEl = document.querySelector('.vesper-subcopy');
        if (subcopyEl) {
          const formatted = '₹' + Number(live.base_price).toLocaleString('en-IN') + ' / night';
          subcopyEl.innerHTML = `${currentProperty.desc} <strong>From ${formatted}</strong> (Save 15% via direct booking).`;
        }
      }
    }
  });

  function scrollToDirectory() {
    const grid = document.getElementById('collection') || document.getElementById('spaces') || document.getElementById('directory-grid') || document.querySelector('.airnest-cat-nav') || document.getElementById('filterPills');
    if (grid) {
      grid.scrollIntoView({ behavior: 'smooth' });
    }
  }

  window.scrollToDirectory = scrollToDirectory;
  window.goToRoom = goToRoom;
  window.loadVesperProperty = loadProperty;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVesperHero);
  } else {
    initVesperHero();
  }
})();
