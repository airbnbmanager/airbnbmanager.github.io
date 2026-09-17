/**
 * Property Showcase Admin CMS (Airbnb-Style Manager)
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 */

(function(window) {
  'use strict';

  let currentPropId = 'GOM-201';
  let activeTab = 'overview';

  window.renderShowcaseAdmin = async function() {
    if (window.showLoadingSkeleton) window.showLoadingSkeleton('card');

    if (!['owner', 'admin', 'developer', 'manager'].includes(SESSION.role)) {
      renderShell('<div class="card"><div class="error">❌ Access denied</div></div>', 'showcase-admin');
      return;
    }

    // Ensure database sync is fresh
    if (window.ShowcaseData && window.ShowcaseData.syncFromDatabase) {
      await window.ShowcaseData.syncFromDatabase();
    }

    const properties = window.ShowcaseData ? window.ShowcaseData.getProperties() : {};
    const propIds = Object.keys(properties);
    if (propIds.length === 0) {
      renderShell('<div class="card"><div class="error">No properties found in showcase directory.</div></div>', 'showcase-admin');
      return;
    }

    if (!properties[currentPropId]) {
      currentPropId = propIds[0];
    }

    const prop = properties[currentPropId] || {};

    const html = `
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <h1 style="font-size:22px;display:flex;align-items:center;gap:8px;">
              <span>🌐</span> Website Showcase &amp; Media CMS
            </h1>
            <div class="sub" style="font-size:13px;color:#64748B;">
              Manage photos, video tours, Google Maps locations &amp; pricing like Airbnb for <strong>index.html</strong>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <a href="index.html" target="_blank" class="btn secondary" style="padding:9px 16px;border-radius:10px;text-decoration:none;font-weight:600;font-size:13px;display:inline-flex;align-items:center;gap:6px;">
              👁️ View Website
            </a>
            <button onclick="saveCurrentShowcase()" style="background:#0F766E;padding:9px 20px;border-radius:10px;font-weight:700;font-size:13.5px;box-shadow:0 4px 12px rgba(15,118,110,0.3);">
              💾 Save &amp; Publish Live
            </button>
          </div>
        </div>

        <div style="margin-top:20px;background:#F8FAFC;padding:14px 16px;border-radius:12px;border:1px solid #E2E8F0;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <label style="font-weight:700;font-size:13px;color:#334155;white-space:nowrap;">Select Property to Edit:</label>
          <select id="showcasePropSelector" onchange="window.switchShowcaseProperty(this.value)" style="flex:1;min-width:240px;max-width:400px;font-weight:600;font-size:14px;padding:9px 12px;border-radius:8px;border:1.5px solid #CBD5E1;">
            ${propIds.map(id => {
              const p = properties[id];
              return `<option value="${id}" ${id === currentPropId ? 'selected' : ''}>${id} — ${p.name} (${p.type})</option>`;
            }).join('')}
          </select>
          <span style="font-size:12px;color:#64748B;">
            📍 ${prop.area_name || prop.address || ''}
          </span>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        <button onclick="window.switchShowcaseTab('overview')" class="${activeTab==='overview'?'':'secondary'}" style="padding:9px 16px;border-radius:9px;font-size:13px;font-weight:600;">
          📋 Overview &amp; Pricing
        </button>
        <button onclick="window.switchShowcaseTab('photos')" class="${activeTab==='photos'?'':'secondary'}" style="padding:9px 16px;border-radius:9px;font-size:13px;font-weight:600;">
          📸 Room Photos (Bed, Bath, Hall)
        </button>
        <button onclick="window.switchShowcaseTab('video')" class="${activeTab==='video'?'':'secondary'}" style="padding:9px 16px;border-radius:9px;font-size:13px;font-weight:600;">
          🎥 Video Tour
        </button>
        <button onclick="window.switchShowcaseTab('location')" class="${activeTab==='location'?'':'secondary'}" style="padding:9px 16px;border-radius:9px;font-size:13px;font-weight:600;">
          📍 Google Map &amp; Landmarks
        </button>
        <button onclick="window.switchShowcaseTab('amenities')" class="${activeTab==='amenities'?'':'secondary'}" style="padding:9px 16px;border-radius:9px;font-size:13px;font-weight:600;">
          ✨ Amenities &amp; Rules
        </button>
      </div>

      <!-- Tab Content -->
      <div id="showcaseTabContainer">
        ${renderTabContent(prop)}
      </div>
    `;

    renderShell(html, 'showcase-admin');
  };

  function renderTabContent(prop) {
    if (activeTab === 'overview') return renderOverviewTab(prop);
    if (activeTab === 'photos') return renderPhotosTab(prop);
    if (activeTab === 'video') return renderVideoTab(prop);
    if (activeTab === 'location') return renderLocationTab(prop);
    if (activeTab === 'amenities') return renderAmenitiesTab(prop);
    return '';
  }

  // 1. OVERVIEW & PRICING TAB
  function renderOverviewTab(prop) {
    return `
      <div class="card">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;color:#0F172A;border-bottom:1px solid #F1F5F9;padding-bottom:10px;">
          🏷️ Property Details &amp; Pricing
        </h2>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-bottom:20px;">
          <div>
            <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Property Display Name</label>
            <input type="text" id="propName" value="${prop.name || ''}" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;" />
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Property Type</label>
            <input type="text" id="propType" value="${prop.type || ''}" placeholder="e.g. 3BHK Luxury Flat, Grand Villa" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;" />
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Area Tag</label>
            <select id="propArea" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;">
              <option value="vikalp" ${prop.area === 'vikalp' ? 'selected' : ''}>Vikalp Khand, Gomti Nagar</option>
              <option value="vishesh" ${prop.area === 'vishesh' ? 'selected' : ''}>Vishesh Khand, Gomti Nagar</option>
              <option value="shaheed" ${prop.area === 'shaheed' ? 'selected' : ''}>Near Lulu Mall / Shaheed Path</option>
            </select>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;background:#F8FAFC;padding:16px;border-radius:12px;border:1px solid #E2E8F0;margin-bottom:20px;">
          <div>
            <label style="font-size:12px;font-weight:700;color:#047857;display:block;margin-bottom:4px;">Direct Booking Price (₹ / night)</label>
            <input type="number" id="propBasePrice" value="${prop.base_price || ''}" style="width:100%;padding:9px 12px;border-radius:8px;border:1.5px solid #059669;font-weight:700;color:#047857;" />
            <small style="font-size:11px;color:#64748B;">Price shown to guests booking direct</small>
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;color:#DC2626;display:block;margin-bottom:4px;">Airbnb Comparison Price (₹ / night)</label>
            <input type="number" id="propAirbnbPrice" value="${prop.airbnb_price || ''}" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;" />
            <small style="font-size:11px;color:#64748B;">Shows "Save 15% vs Airbnb" comparison</small>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Max Guests</label>
            <input type="number" id="propGuests" value="${prop.max_guests || 10}" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;" />
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Bedrooms / Bathrooms</label>
            <div style="display:flex;gap:8px;">
              <input type="number" id="propBeds" value="${prop.bedrooms || 3}" placeholder="Beds" title="Bedrooms" style="width:50%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;" />
              <input type="number" id="propBaths" value="${prop.bathrooms || 3}" placeholder="Baths" title="Bathrooms" style="width:50%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;" />
            </div>
          </div>
        </div>

        <div>
          <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Full Address</label>
          <input type="text" id="propAddress" value="${prop.address || ''}" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;margin-bottom:14px;" />
        </div>

        <div>
          <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">About Stay Description</label>
          <textarea id="propDesc" rows="4" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #CBD5E1;line-height:1.5;">${prop.description || ''}</textarea>
        </div>
      </div>
    `;
  }

  // 2. CATEGORIZED PHOTOS TAB (AIRBNB STYLE)
  function renderPhotosTab(prop) {
    const photos = prop.photos || {};
    const categories = [
      { key: 'bedrooms', title: '🛏️ Bedroom Photos', desc: 'Photos of individual master & guest bedrooms' },
      { key: 'bathrooms', title: '🚿 Bathroom Photos', desc: 'Clean, well-lit modern bathroom fixtures' },
      { key: 'living_hall', title: '🛋️ Living Hall / Drawing Room', desc: 'Main living sofa, dining space & decor' },
      { key: 'kitchen', title: '🍳 Modular Kitchen', desc: 'Stove, refrigerator, appliances & cookware' },
      { key: 'balcony', title: '🏞️ Balcony & Views', desc: 'Balcony seating, morning sun & exterior view' }
    ];

    return `
      <div class="card">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:14px;color:#0F172A;border-bottom:1px solid #F1F5F9;padding-bottom:10px;">
          📸 Categorized Photo Galleries (Airbnb Style)
        </h2>
        <div style="font-size:13px;color:#64748B;margin-bottom:20px;">
          Guests can filter photos by category on the website. Add image URLs or select demo images.
        </div>

        <!-- Cover Image -->
        <div style="background:#F8FAFC;padding:16px;border-radius:12px;border:1px solid #E2E8F0;margin-bottom:24px;">
          <label style="font-size:13px;font-weight:700;color:#1E293B;display:block;margin-bottom:6px;">
            🌟 Primary Cover Photo (Shown on Homepage Card)
          </label>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
            <input type="text" id="propCover" value="${prop.cover_image || ''}" style="flex:1;min-width:280px;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;" placeholder="assets/properties/the-dark-blue/cover.jpg or https://..." />
            <img src="${prop.cover_image || 'assets/logo.png'}" alt="Cover Preview" style="width:60px;height:45px;border-radius:8px;object-fit:cover;border:1px solid #CBD5E1;" />
          </div>
        </div>

        <!-- Category Photo Groups -->
        ${categories.map(cat => {
          const list = photos[cat.key] || [];
          return `
            <div style="border:1px solid #E2E8F0;border-radius:12px;padding:16px;margin-bottom:20px;background:#FFFFFF;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div>
                  <h3 style="font-size:14.5px;font-weight:700;color:#1E293B;margin:0;">${cat.title}</h3>
                  <div style="font-size:12px;color:#64748B;">${cat.desc} &bull; <strong>${list.length} photos</strong></div>
                </div>
              </div>

              <!-- Thumbnails Grid -->
              <div style="display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;margin-bottom:12px;">
                ${list.map((url, idx) => `
                  <div style="position:relative;width:110px;height:80px;flex-shrink:0;border-radius:8px;overflow:hidden;border:1.5px solid #CBD5E1;">
                    <img src="${url}" alt="${cat.key}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='assets/logo.png';" />
                    <button onclick="window.removeShowcasePhoto('${cat.key}', ${idx})" title="Remove Photo" style="position:absolute;top:3px;right:3px;background:rgba(239,68,68,0.9);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                      ✕
                    </button>
                  </div>
                `).join('')}
                ${list.length === 0 ? `<div style="font-size:12px;color:#94A3B8;padding:10px;">No photos added yet in this category.</div>` : ''}
              </div>

              <!-- Add Photo Input -->
              <div style="display:flex;gap:8px;">
                <input type="text" id="addPhoto_${cat.key}" placeholder="Paste Image URL (https://... or assets/...)" style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid #CBD5E1;font-size:13px;" />
                <button onclick="window.addShowcasePhoto('${cat.key}')" class="btn-sm" style="background:#4F46E5;color:#fff;padding:8px 16px;border-radius:8px;font-weight:600;">
                  + Add Photo
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 3. VIDEO TOUR TAB
  function renderVideoTab(prop) {
    const videoUrl = prop.video_url || '';
    const isEmbed = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo.com');

    return `
      <div class="card">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:14px;color:#0F172A;border-bottom:1px solid #F1F5F9;padding-bottom:10px;">
          🎥 Property Video Tour
        </h2>
        <div style="font-size:13px;color:#64748B;margin-bottom:16px;">
          Add a video walk-through (YouTube URL, MP4 link, or Instagram reel embed). Guests can watch before booking!
        </div>

        <div style="margin-bottom:16px;">
          <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Video Tour URL</label>
          <input type="text" id="propVideo" value="${videoUrl}" placeholder="https://www.youtube.com/embed/... or https://...video.mp4" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;" />
          <small style="font-size:11px;color:#64748B;">For YouTube, use embed URL format: <code>https://www.youtube.com/embed/VIDEO_ID</code></small>
        </div>

        ${videoUrl ? `
          <div style="margin-top:20px;border-radius:12px;overflow:hidden;background:#000;max-width:600px;border:1px solid #E2E8F0;">
            <div style="padding:8px 12px;background:#1E293B;color:#fff;font-size:12px;font-weight:600;">Video Preview</div>
            <iframe src="${videoUrl}" style="width:100%;height:320px;border:none;" allowfullscreen></iframe>
          </div>
        ` : `
          <div style="padding:30px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:12px;text-align:center;color:#94A3B8;">
            📹 No video tour linked yet. Enter a YouTube or video URL above to preview here.
          </div>
        `}
      </div>
    `;
  }

  // 4. LOCATION & GOOGLE MAPS TAB
  function renderLocationTab(prop) {
    const mapLink = prop.map_link || '';
    const mapEmbed = prop.map_embed || '';

    return `
      <div class="card">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:14px;color:#0F172A;border-bottom:1px solid #F1F5F9;padding-bottom:10px;">
          📍 Google Maps Location &amp; Nearby Highlights
        </h2>

        <div style="margin-bottom:16px;">
          <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Google Maps Share Link</label>
          <input type="text" id="propMapLink" value="${mapLink}" placeholder="https://maps.google.com/?q=..." style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;" />
          <small style="font-size:11px;color:#64748B;">Direct link opened when guests click "Get Directions"</small>
        </div>

        <div style="margin-bottom:20px;">
          <label style="font-size:12px;font-weight:600;color:#475569;display:block;margin-bottom:4px;">Google Maps Embed URL</label>
          <input type="text" id="propMapEmbed" value="${mapEmbed}" placeholder="https://www.google.com/maps?q=...&output=embed" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid #CBD5E1;" />
        </div>

        ${mapEmbed ? `
          <div style="margin-top:16px;border-radius:12px;overflow:hidden;border:1px solid #CBD5E1;height:260px;">
            <iframe src="${mapEmbed}" style="width:100%;height:100%;border:none;" loading="lazy"></iframe>
          </div>
        ` : ''}
      </div>
    `;
  }

  // 5. AMENITIES TAB
  function renderAmenitiesTab(prop) {
    const standardAmenities = [
      'AC in all Rooms', 'High-Speed Wi-Fi', 'Modular Kitchen', 'Geyser Hot Water',
      'Designated Parking', '24/7 Caretaker', 'Power Backup', 'Smart TV with OTT',
      'Washing Machine', 'Refrigerator', 'Balcony View', 'Elevator / Lift',
      'Private Lawn / Garden', 'Rooftop Terrace'
    ];

    const currentAmenities = prop.amenities || [];

    return `
      <div class="card">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:14px;color:#0F172A;border-bottom:1px solid #F1F5F9;padding-bottom:10px;">
          ✨ Amenities Checklist
        </h2>
        <div style="font-size:13px;color:#64748B;margin-bottom:16px;">
          Select all amenities included with this property:
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">
          ${standardAmenities.map(amenity => {
            const checked = currentAmenities.includes(amenity);
            return `
              <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:#F8FAFC;border:1px solid ${checked ? '#818CF8' : '#E2E8F0'};cursor:pointer;transition:all 0.15s;">
                <input type="checkbox" class="amenity-checkbox" value="${amenity}" ${checked ? 'checked' : ''} style="width:17px;height:17px;accent-color:#4F46E5;" />
                <span style="font-size:13.5px;font-weight:500;color:#1E293B;">${amenity}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Switch Property
  window.switchShowcaseProperty = function(id) {
    currentPropId = id;
    renderShowcaseAdmin();
  };

  // Switch Tab
  window.switchShowcaseTab = function(tab) {
    activeTab = tab;
    const prop = window.ShowcaseData.getProperty(currentPropId) || {};
    document.getElementById('showcaseTabContainer').innerHTML = renderTabContent(prop);
    renderShowcaseAdmin();
  };

  // Photo Add
  window.addShowcasePhoto = function(catKey) {
    const input = document.getElementById('addPhoto_' + catKey);
    if (!input || !input.value.trim()) {
      alert('Please enter a valid image URL');
      return;
    }
    const prop = window.ShowcaseData.getProperty(currentPropId) || {};
    prop.photos = prop.photos || {};
    prop.photos[catKey] = prop.photos[catKey] || [];
    prop.photos[catKey].push(input.value.trim());

    window.ShowcaseData.saveProperty(currentPropId, { photos: prop.photos });
    renderShowcaseAdmin();
  };

  // Photo Remove
  window.removeShowcasePhoto = function(catKey, index) {
    const prop = window.ShowcaseData.getProperty(currentPropId) || {};
    if (prop.photos && prop.photos[catKey]) {
      prop.photos[catKey].splice(index, 1);
      window.ShowcaseData.saveProperty(currentPropId, { photos: prop.photos });
      renderShowcaseAdmin();
    }
  };

  // Save All
  window.saveCurrentShowcase = async function() {
    const prop = window.ShowcaseData.getProperty(currentPropId) || {};

    const updates = {};
    const nameEl = document.getElementById('propName');
    const typeEl = document.getElementById('propType');
    const areaEl = document.getElementById('propArea');
    const basePriceEl = document.getElementById('propBasePrice');
    const airbnbPriceEl = document.getElementById('propAirbnbPrice');
    const guestsEl = document.getElementById('propGuests');
    const bedsEl = document.getElementById('propBeds');
    const bathsEl = document.getElementById('propBaths');
    const addressEl = document.getElementById('propAddress');
    const descEl = document.getElementById('propDesc');
    const coverEl = document.getElementById('propCover');
    const videoEl = document.getElementById('propVideo');
    const mapLinkEl = document.getElementById('propMapLink');
    const mapEmbedEl = document.getElementById('propMapEmbed');

    if (nameEl) updates.name = nameEl.value.trim();
    if (typeEl) updates.type = typeEl.value.trim();
    if (areaEl) {
      updates.area = areaEl.value;
      updates.area_name = areaEl.options[areaEl.selectedIndex].text;
    }
    if (basePriceEl) updates.base_price = Number(basePriceEl.value) || prop.base_price;
    if (airbnbPriceEl) updates.airbnb_price = Number(airbnbPriceEl.value) || prop.airbnb_price;
    if (guestsEl) updates.max_guests = Number(guestsEl.value) || prop.max_guests;
    if (bedsEl) updates.bedrooms = Number(bedsEl.value) || prop.bedrooms;
    if (bathsEl) updates.bathrooms = Number(bathsEl.value) || prop.bathrooms;
    if (addressEl) updates.address = addressEl.value.trim();
    if (descEl) updates.description = descEl.value.trim();
    if (coverEl) updates.cover_image = coverEl.value.trim();
    if (videoEl) updates.video_url = videoEl.value.trim();
    if (mapLinkEl) updates.map_link = mapLinkEl.value.trim();
    if (mapEmbedEl) updates.map_embed = mapEmbedEl.value.trim();

    // Amenities
    const checkedAmenities = [];
    document.querySelectorAll('.amenity-checkbox:checked').forEach(cb => {
      checkedAmenities.push(cb.value);
    });
    if (checkedAmenities.length > 0) updates.amenities = checkedAmenities;

    await window.ShowcaseData.saveProperty(currentPropId, updates);

    if (typeof fsn !== 'undefined') {
      fsn.success('Showcase Published!', `${updates.name || prop.name} updated live.`);
    } else {
      alert(`✅ ${updates.name || prop.name} updated live!`);
    }

    renderShowcaseAdmin();
  };

})(window);
