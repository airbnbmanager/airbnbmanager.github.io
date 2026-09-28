// ═══════════════════════════════════════════════════════════
// 📥 AIRBNB LISTING & FOOTAGE (PHOTOS) IMPORTER
// 1-Click Import: High-Res Photos, Title, Description, Specs & Amenities
// THE UNIQUE HAVEN HOMES PRIVATE LIMITED (TUHH)
// ═══════════════════════════════════════════════════════════

window.AIRBNB_IMPORTER = {
  PROXY_URL: 'https://vxxmigdzimnrbbmkjzoa.supabase.co/functions/v1/ical-proxy?url=',
  FALLBACK_PROXIES: [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
  ],

  // Extract listing ID from URL or string
  extractListingId(input) {
    if (!input) return null;
    const clean = input.trim();
    // Match /rooms/123456789
    const match = clean.match(/\/rooms\/(\d+)/i) || clean.match(/\/ical\/(\d+)\.ics/i) || clean.match(/^(\d{8,25})$/);
    return match ? match[1] : null;
  },

  // Fetch listing HTML via Supabase Edge Function Proxy
  async fetchListingHtml(listingId) {
    const targetUrl = `https://www.airbnb.co.in/rooms/${listingId}`;
    
    // Primary: our own Supabase Edge Function proxy
    try {
      const res = await fetch(this.PROXY_URL + encodeURIComponent(targetUrl), {
        headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 5000 && (text.includes('muscache.com') || text.includes('og:title'))) {
          return text;
        }
      }
    } catch(e) {
      console.warn('Primary proxy error:', e);
    }

    // Fallbacks
    for (const fb of this.FALLBACK_PROXIES) {
      try {
        const res = await fetch(fb + encodeURIComponent(targetUrl));
        if (res.ok) {
          const text = await res.text();
          if (text && text.includes('muscache.com')) return text;
        }
      } catch(err) {
        console.warn('Fallback proxy error:', err);
      }
    }

    throw new Error('Unable to connect to Airbnb. Please verify the listing URL is public.');
  },

  // Parse all details, photos, specs, amenities from Airbnb HTML
  parseListing(html, listingId) {
    // 1. Title / Name
    let title = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
                html.match(/<title>([^<]+)<\/title>/)?.[1] || '';
    title = title.replace(/\s*-\s*Airbnb.*$/i, '').trim();

    // 2. Description
    let desc = html.match(/<meta property="og:description" content="([^"]+)"/)?.[1] || '';
    desc = desc.replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"');

    // 3. Location / Specs from Title or JSON-LD
    let locality = 'Lucknow';
    let bedrooms = null;
    let beds = null;
    let baths = null;
    let rating = null;

    // Check JSON-LD
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const data = JSON.parse(jsonLdMatch[1]);
        if (data.name) title = data.name;
        if (data.description) desc = data.description;
        if (data.address?.addressLocality) locality = data.address.addressLocality;
        if (data.aggregateRating?.ratingValue) rating = parseFloat(data.aggregateRating.ratingValue);
      } catch(e) {}
    }

    // Extract specs from og:title if format like: "Home in Lucknow · ★4.81 · 5 bedrooms · 7 beds · 5 bathrooms"
    const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] || '';
    const ratingMatch = ogTitle.match(/★\s*([0-9.]+)/);
    if (ratingMatch) rating = parseFloat(ratingMatch[1]);
    
    const bedMatch = ogTitle.match(/(\d+)\s+bedroom/i);
    if (bedMatch) bedrooms = parseInt(bedMatch[1]);
    
    const bedsMatch = ogTitle.match(/(\d+)\s+bed/i);
    if (bedsMatch) beds = parseInt(bedsMatch[1]);
    
    const bathMatch = ogTitle.match(/(\d+)\s+bath/i);
    if (bathMatch) baths = parseInt(bathMatch[1]);

    const locMatch = ogTitle.match(/(?:in|at)\s+([A-Za-z\s]+?)(?:\s*·|\s*-)/i);
    if (locMatch) locality = locMatch[1].trim();

    // Max guests estimation (beds * 2 if not found)
    const maxGuests = beds ? (beds * 2) : (bedrooms ? bedrooms * 2 : 4);

    // 4. Extract all original high-resolution photos
    // Target Airbnb high-res hosting pictures on a0.muscache.com
    const hostingRegex = new RegExp(`https://a0\\.muscache\\.com/im/pictures/hosting/Hosting-${listingId}/original/[a-f0-9\\-]+\\.(jpeg|jpg|png|webp)`, 'gi');
    const genericRegex = /https:\/\/a0\.muscache\.com\/im\/pictures\/[a-f0-9\-]+\.(jpeg|jpg|png|webp)/gi;

    let photoList = [...html.matchAll(hostingRegex)].map(m => m[0]);
    if (photoList.length < 5) {
      // Fallback to all picture URLs on page
      photoList = photoList.concat([...html.matchAll(genericRegex)].map(m => m[0]));
    }

    // Deduplicate
    const uniquePhotos = [...new Set(photoList)].filter(p => !p.includes('Favicon') && !p.includes('PlatformAssets'));

    // Main Cover Photo
    const mainCover = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] || uniquePhotos[0] || '';

    // Detected amenities
    const commonAmenities = [
      { name: 'Air Conditioning', icon: '❄️', keys: ['air conditioning', 'ac', 'climate'] },
      { name: 'Fast WiFi', icon: '📶', keys: ['wifi', 'wi-fi', 'internet'] },
      { name: 'Fully Equipped Kitchen', icon: '🍳', keys: ['kitchen', 'cooking'] },
      { name: 'Dedicated Workspace', icon: '💼', keys: ['desk', 'workspace'] },
      { name: 'Free Parking', icon: '🚗', keys: ['parking', 'car'] },
      { name: 'Hot Water Geyser', icon: '🚿', keys: ['geyser', 'hot water'] },
      { name: 'Smart TV', icon: '📺', keys: ['tv', 'television'] },
      { name: 'Washing Machine', icon: '🧺', keys: ['washer', 'washing machine'] },
      { name: 'Refrigerator', icon: '🧊', keys: ['refrigerator', 'fridge'] },
      { name: 'Balcony / Terrace', icon: '🌿', keys: ['balcony', 'terrace', 'patio'] }
    ];

    const detectedAmenities = commonAmenities.filter(a => {
      const lower = html.toLowerCase();
      return a.keys.some(k => lower.includes(k));
    });

    return {
      listingId,
      url: `https://www.airbnb.co.in/rooms/${listingId}`,
      title,
      description: desc,
      locality,
      bedrooms,
      beds,
      bathrooms: baths,
      maxGuests,
      rating,
      mainCover,
      photos: uniquePhotos,
      amenities: detectedAmenities
    };
  },

  // Open the Importer Modal
  async openModal(prefillUrlOrId = '', targetRoomId = null) {
    // Get existing rooms for dropdown
    const { data: rooms } = await sb.from('rooms').select('room_id, unit_no, nickname, property_name, airbnb_ical_url').order('room_id');
    window._importerRoomsCache = rooms || [];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'airbnbImporterModal';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:850px; max-height:90vh; overflow-y:auto; border-radius:16px; padding:24px;">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
          <span style="font-size:26px;">📥</span>
          <div>
            <h2 style="margin:0; font-size:22px; font-weight:800; color:#111827;">Airbnb Footage &amp; Listing Importer</h2>
            <div style="font-size:13px; color:#6B7280;">1-Click import: Original High-Res Photos, Title, Details, Specs &amp; Amenities</div>
          </div>
        </div>

        <!-- Input Form -->
        <div style="margin:16px 0; background:#F9FAFB; padding:16px; border-radius:12px; border:1px solid #E5E7EB;">
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <div style="flex:2; min-width:260px;">
              <label style="font-size:12px; font-weight:700; color:#374151; display:block; margin-bottom:4px;">
                Paste Airbnb Listing Link or ID *
              </label>
              <input id="airbnbUrlInput" type="text" 
                     placeholder="e.g. https://www.airbnb.com/rooms/1592729438969718723" 
                     value="${prefillUrlOrId}"
                     style="width:100%; padding:10px 14px; border:1.5px solid #D1D5DB; border-radius:8px; font-size:14px; font-weight:600;" />
            </div>

            <div style="flex:1; min-width:200px;">
              <label style="font-size:12px; font-weight:700; color:#374151; display:block; margin-bottom:4px;">
                Or Auto-Pick from Existing Room
              </label>
              <select id="airbnbRoomPicker" onchange="window.AIRBNB_IMPORTER.onRoomPick(this.value)" 
                      style="width:100%; padding:10px 12px; border:1.5px solid #D1D5DB; border-radius:8px; font-size:13px; font-weight:600;">
                <option value="">-- Choose property --</option>
                ${(rooms || []).map(r => {
                  const idMatch = (r.airbnb_ical_url || '').match(/\/ical\/(\d+)\.ics/);
                  const listId = idMatch ? idMatch[1] : '';
                  return `<option value="${listId}" data-room="${r.room_id}" ${r.room_id === targetRoomId ? 'selected' : ''}>
                    ${r.room_id} (${r.nickname || r.unit_no}) ${listId ? '· Airbnb #' + listId.slice(-4) : ''}
                  </option>`;
                }).join('')}
              </select>
            </div>

            <div style="display:flex; align-items:flex-end;">
              <button onclick="window.AIRBNB_IMPORTER.startImport()" 
                      id="btnFetchAirbnb"
                      style="padding:10px 20px; background:#FF385C; color:#fff; border:none; border-radius:8px; font-weight:800; font-size:14px; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 3px 10px rgba(255,56,92,0.3);">
                🚀 Fetch Footage
              </button>
            </div>
          </div>
          <div style="font-size:11px; color:#6B7280; margin-top:8px;">
            💡 Tip: Koi bhi public Airbnb listing link daalein — saari original high-definition photos aur details instant fetch ho jayengi.
          </div>
        </div>

        <!-- Result Container -->
        <div id="airbnbImportResult"></div>
      </div>
    `;

    document.body.appendChild(modal);

    // If prefill provided, auto trigger
    if (prefillUrlOrId) {
      this.startImport();
    }
  },

  onRoomPick(listingId) {
    if (!listingId) return;
    const inp = document.getElementById('airbnbUrlInput');
    if (inp) {
      inp.value = `https://www.airbnb.co.in/rooms/${listingId}`;
      this.startImport();
    }
  },

  // Execute Import
  async startImport() {
    const input = document.getElementById('airbnbUrlInput')?.value.trim();
    const resultBox = document.getElementById('airbnbImportResult');
    const btn = document.getElementById('btnFetchAirbnb');

    const listingId = this.extractListingId(input);
    if (!listingId) {
      alert('⚠️ Please enter a valid Airbnb listing URL or ID.');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Fetching...';
    }

    resultBox.innerHTML = `
      <div style="text-align:center; padding:30px; background:#F8FAFC; border-radius:12px; margin-top:12px;">
        <div style="font-size:32px; animation:spin 1s infinite linear;">🔄</div>
        <div style="font-size:16px; font-weight:800; color:#111827; margin-top:10px;">Connecting to Airbnb...</div>
        <div style="font-size:13px; color:#6B7280; margin-top:4px;">Extracting high-resolution footage, listing photos, and amenities for #${listingId}</div>
      </div>
    `;

    try {
      const html = await this.fetchListingHtml(listingId);
      const data = this.parseListing(html, listingId);
      window._currentImportedAirbnb = data;
      this.renderResults(data);
    } catch(err) {
      resultBox.innerHTML = `
        <div style="padding:16px; background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; color:#991B1B; margin-top:12px;">
          <div style="font-weight:800; font-size:14px;">❌ Import Failed</div>
          <div style="font-size:13px; margin-top:4px;">${err.message}</div>
          <div style="font-size:12px; margin-top:6px; color:#7F1D1D;">Ensure that the Airbnb listing is active and publicly viewable.</div>
        </div>
      `;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🚀 Fetch Footage';
      }
    }
  },

  // Render Result Cards and Photos Grid
  renderResults(data) {
    const box = document.getElementById('airbnbImportResult');
    if (!box) return;

    box.innerHTML = `
      <div style="margin-top:16px; border-top:1.5px solid #E5E7EB; padding-top:16px;">
        <!-- Header Banner -->
        <div style="display:flex; gap:16px; align-items:flex-start; background:#FFF; border:1.5px solid #E5E7EB; padding:16px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04); flex-wrap:wrap;">
          ${data.mainCover ? `
            <img src="${data.mainCover}" style="width:160px; height:110px; object-fit:cover; border-radius:10px; border:1px solid #E5E7EB;" />
          ` : ''}
          <div style="flex:1; min-width:240px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="background:#FF385C; color:#fff; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">
                Airbnb #${data.listingId}
              </span>
              ${data.rating ? `
                <span style="background:#FEF3C7; color:#B45309; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">
                  ★ ${data.rating} Rating
                </span>
              ` : ''}
              <span style="background:#E0E7FF; color:#3730A3; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">
                📸 ${data.photos.length} High-Res Photos Found
              </span>
            </div>
            
            <h3 style="margin:6px 0 4px; font-size:17px; font-weight:800; color:#111827;">${escapeHtml(data.title)}</h3>
            <div style="font-size:13px; color:#4B5563;">
              📍 ${escapeHtml(data.locality)} · 
              ${data.bedrooms ? data.bedrooms + ' Bedrooms · ' : ''}
              ${data.beds ? data.beds + ' Beds · ' : ''}
              ${data.bathrooms ? data.bathrooms + ' Bathrooms · ' : ''}
              Up to ${data.maxGuests} Guests
            </div>
          </div>
        </div>

        <!-- Quick Action Toolbar -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin:16px 0 12px; background:#EFF6FF; padding:12px 16px; border-radius:10px; border:1px solid #BFDBFE;">
          <div style="font-size:13px; font-weight:800; color:#1E40AF;">
            ⚡ Apply to TUHH System:
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button onclick="window.AIRBNB_IMPORTER.savePhotosToShowcase()" 
                    style="padding:8px 14px; background:#0F766E; color:#fff; border:none; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;">
              🌐 Save to Website Showcase
            </button>
            <button onclick="window.AIRBNB_IMPORTER.applyToExistingRoomModal()" 
                    style="padding:8px 14px; background:#2563EB; color:#fff; border:none; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;">
              🏠 Update Existing Room
            </button>
            <button onclick="window.AIRBNB_IMPORTER.applyToNewRoom()" 
                    style="padding:8px 14px; background:#059669; color:#fff; border:none; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;">
              ➕ Create New Room Form
            </button>
            <button onclick="window.AIRBNB_IMPORTER.copyAllPhotoLinks()" 
                    style="padding:8px 12px; background:#4B5563; color:#fff; border:none; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;">
              📋 Copy URLs
            </button>
          </div>
        </div>

        <!-- Detected Amenities -->
        ${data.amenities.length > 0 ? `
          <div style="margin-bottom:14px; padding:10px 14px; background:#F8FAFC; border-radius:10px; border:1px solid #E2E8F0;">
            <div style="font-size:12px; font-weight:700; color:#475569; margin-bottom:6px;">✨ Detected Amenities:</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${data.amenities.map(a => `
                <span style="background:#fff; border:1px solid #CBD5E1; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:600; color:#1E293B;">
                  ${a.icon} ${a.name}
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Photos Gallery Grid -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div style="font-size:14px; font-weight:800; color:#111827;">
            🖼️ High-Definition Photos Gallery (${data.photos.length} Total)
          </div>
          <div style="display:flex; gap:8px;">
            <button onclick="window.AIRBNB_IMPORTER.toggleSelectAll(true)" style="background:none; border:none; font-size:12px; color:#2563EB; font-weight:700; cursor:pointer;">Select All</button>
            <span style="color:#CBD5E1;">|</span>
            <button onclick="window.AIRBNB_IMPORTER.toggleSelectAll(false)" style="background:none; border:none; font-size:12px; color:#64748B; font-weight:700; cursor:pointer;">Deselect All</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px; max-height:420px; overflow-y:auto; padding:6px; background:#F8FAFC; border-radius:12px; border:1px solid #E2E8F0;">
          ${data.photos.map((p, idx) => `
            <div style="position:relative; border-radius:8px; overflow:hidden; border:2px solid #E2E8F0; background:#fff; aspect-ratio:4/3; group;">
              <img src="${p}" loading="lazy" style="width:100%; height:100%; object-fit:cover; display:block;" />
              <div style="position:absolute; top:4px; left:4px; background:rgba(0,0,0,0.6); color:#fff; font-size:10px; font-weight:800; padding:1px 6px; border-radius:4px;">
                #${idx+1}
              </div>
              <input type="checkbox" class="airbnb-photo-chk" value="${p}" checked 
                     style="position:absolute; top:4px; right:4px; width:18px; height:18px; cursor:pointer; accent-color:#FF385C;" />
              <a href="${p}" target="_blank" 
                 style="position:absolute; bottom:4px; right:4px; background:rgba(255,255,255,0.9); color:#111; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; text-decoration:none;">
                🔍 View
              </a>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  toggleSelectAll(select) {
    document.querySelectorAll('.airbnb-photo-chk').forEach(c => c.checked = select);
  },

  getSelectedPhotos() {
    const chks = document.querySelectorAll('.airbnb-photo-chk:checked');
    return Array.from(chks).map(c => c.value);
  },

  // Save imported photos directly into website showcase CMS
  async savePhotosToShowcase() {
    const data = window._currentImportedAirbnb;
    if (!data) return;
    const selected = this.getSelectedPhotos();
    if (selected.length === 0) { alert('⚠️ Please select at least one photo'); return; }

    const rooms = window._importerRoomsCache || [];
    const roomSelectHtml = rooms.map(r => `<option value="${r.room_id}">${r.room_id} (${r.nickname || r.unit_no})</option>`).join('');

    const targetRoomId = prompt(`Select Room ID to attach ${selected.length} photos:\nAvailable: ` + rooms.map(r => r.room_id).join(', '), rooms[0]?.room_id || 'GOM-101');
    if (!targetRoomId) return;

    try {
      if (window.ShowcaseData && window.ShowcaseData.saveProperty) {
        const prop = (window.ShowcaseData.getAllProperties() || []).find(p => p.id === targetRoomId || p.roomId === targetRoomId) || {};
        prop.photos = prop.photos || {};
        prop.photos['living'] = selected.slice(0, 10);
        prop.photos['bedroom'] = selected.slice(10, 25);
        prop.photos['bathroom'] = selected.slice(25, 35);
        prop.photos['all'] = selected;
        window.ShowcaseData.saveProperty(targetRoomId, { photos: prop.photos, title: data.title });
      }

      // Also save in localStorage
      localStorage.setItem('tuhh_room_photos_' + targetRoomId, JSON.stringify(selected));

      if (window.fsn?.success) {
        fsn.success('Photos Saved', `✅ ${selected.length} high-res photos linked to ${targetRoomId}`);
      } else {
        alert(`✅ ${selected.length} high-res photos successfully linked to ${targetRoomId}!`);
      }
    } catch(e) {
      alert('Error saving: ' + e.message);
    }
  },

  // Update Existing Room with imported metadata
  applyToExistingRoomModal() {
    const data = window._currentImportedAirbnb;
    if (!data) return;

    const rooms = window._importerRoomsCache || [];
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:480px; border-radius:14px;">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <h3 style="margin:0 0 8px; font-size:18px; font-weight:800; color:#111827;">🏠 Update Existing Room with Airbnb Data</h3>
        <div style="font-size:13px; color:#6B7280; margin-bottom:14px;">Select which property you want to update with this listing:</div>

        <div class="form-group">
          <label style="font-weight:700;">Select Room *</label>
          <select id="updateTargetRoomId" style="width:100%; padding:9px 12px; border:1.5px solid #D1D5DB; border-radius:8px; font-size:14px; font-weight:700;">
            ${rooms.map(r => `<option value="${r.room_id}">${r.room_id} (${r.nickname || r.unit_no}) - ${r.property_name || 'No title'}</option>`).join('')}
          </select>
        </div>

        <div style="margin:14px 0; background:#F3F4F6; padding:12px; border-radius:8px; font-size:12px; color:#374151;">
          <div>✅ Updates <strong>Property Name</strong>: ${escapeHtml(data.title)}</div>
          <div>✅ Updates <strong>Max Guests</strong>: ${data.maxGuests}</div>
          <div>✅ Links <strong>${data.photos.length} Photos</strong> to Room Gallery</div>
        </div>

        <button onclick="window.AIRBNB_IMPORTER.executeRoomUpdate()" 
                style="width:100%; padding:11px; background:#2563EB; color:#fff; border:none; border-radius:8px; font-weight:800; font-size:14px; cursor:pointer;">
          💾 Confirm &amp; Update Property
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  },

  async executeRoomUpdate() {
    const targetRoomId = document.getElementById('updateTargetRoomId')?.value;
    const data = window._currentImportedAirbnb;
    if (!targetRoomId || !data) return;

    try {
      const { error } = await sb.from('rooms').update({
        property_name: data.title,
        max_guests: data.maxGuests || 4,
        notes: (data.description ? data.description.substring(0, 500) : null)
      }).eq('room_id', targetRoomId);

      if (error) throw error;

      // Save photos
      const selected = this.getSelectedPhotos();
      localStorage.setItem('tuhh_room_photos_' + targetRoomId, JSON.stringify(selected.length > 0 ? selected : data.photos));

      document.querySelector('.modal-overlay:last-child')?.remove();
      document.getElementById('airbnbImporterModal')?.remove();

      if (window.fsn?.success) fsn.success('Property Updated', `✅ ${targetRoomId} updated from Airbnb`);
      if (window.renderManageRooms) renderManageRooms();
    } catch(e) {
      alert('Error updating room: ' + e.message);
    }
  },

  // Create new room form prefilled with Airbnb data
  applyToNewRoom() {
    const data = window._currentImportedAirbnb;
    if (!data) return;

    document.getElementById('airbnbImporterModal')?.remove();
    if (window.renderAddRoom) {
      renderAddRoom();
      setTimeout(() => {
        const titleEl = document.getElementById('propertyName');
        const nickEl = document.getElementById('nickname');
        const guestsEl = document.getElementById('maxGuests');
        const notesEl = document.getElementById('notes');

        if (titleEl) titleEl.value = data.title || '';
        if (nickEl) nickEl.value = (data.title || '').split('/')[0].split('|')[0].trim().substring(0, 30);
        if (guestsEl) guestsEl.value = data.maxGuests || 4;
        if (notesEl) notesEl.value = (data.description ? data.description.substring(0, 500) : '');

        // Store photos for new room
        window._pendingNewRoomPhotos = data.photos;
        if (window.fsn?.info) fsn.info('Details Pre-Filled', '✅ Listing info populated. Enter Room ID to save.');
      }, 250);
    }
  },

  // Copy all photos URLs
  copyAllPhotoLinks() {
    const data = window._currentImportedAirbnb;
    if (!data) return;
    const selected = this.getSelectedPhotos();
    const list = selected.length > 0 ? selected : data.photos;
    navigator.clipboard.writeText(list.join('\n'));
    if (window.fsn?.success) fsn.success('Copied', `✅ ${list.length} photo URLs copied to clipboard`);
    else alert(`✅ ${list.length} photo URLs copied!`);
  }
};

console.log('✅ Airbnb Importer Module (1-Click Footage & Details) loaded');
