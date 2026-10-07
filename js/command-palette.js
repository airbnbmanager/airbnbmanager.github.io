/* ══════════════════════════════════════════════════════════════════
   🔍 GLOBAL SPOTLIGHT COMMAND PALETTE (Cmd+K) & 🎙️ AI VOICE-TO-BOOKING
   Unique Haven Homes Property Management System
   ══════════════════════════════════════════════════════════════════ */

(function initCommandAndVoice() {
  'use strict';

  // ─── 1. Navigation & Actions Directory ───
  const SYSTEM_COMMANDS = [
    { type: 'action', icon: '🎙️', title: 'Voice-to-Booking (Hindi/English)', sub: 'Speak to create a booking instantly', action: () => window.openVoiceBookingModal() },
    { type: 'action', icon: '➕', title: 'New Booking Form', sub: 'Open manual booking creation', action: () => { if (window.renderAddBooking) window.renderAddBooking(); else window.navigate('bookings'); } },
    { type: 'action', icon: '🧹', title: 'Housekeeping Turnaround Board', sub: 'Open realtime Kanban room turnaround', action: () => { window.setFlatsViewMode && window.setFlatsViewMode('kanban'); window.navigate('flats'); } },
    { type: 'action', icon: '📱', title: 'WhatsApp Hub & Automations', sub: 'Guest chat triggers, scheduled messages', action: () => window.navigate('whatsapp-hub') },
    
    // Page Routes
    { type: 'page', icon: '📊', title: 'Dashboard', sub: 'Overview, KPIs, live occupancy', page: 'dashboard' },
    { type: 'page', icon: '📑', title: 'Smart Bookings', sub: 'Search reservations, follow-ups, passes', page: 'bookings' },
    { type: 'page', icon: '📅', title: 'Calendar View', sub: 'Airbnb-style multi-property calendar', page: 'calendar' },
    { type: 'page', icon: '🛏️', title: 'Flats & Housekeeping', sub: 'Rooms status, dirty/clean turnaround', page: 'flats' },
    { type: 'page', icon: '📝', title: 'Daily Report', sub: 'Daily collections, handovers, check-ins', page: 'daily-report' },
    { type: 'page', icon: '💰', title: 'Cash Book', sub: 'Income, petty expenses, UPI reconciliation', page: 'cashbook' },
    { type: 'page', icon: '🧾', title: 'GST Invoices & CA Pack', sub: 'Tax invoices, bills, audit reports', page: 'ca-audit' },
    { type: 'page', icon: '🧺', title: 'Laundry Tracker', sub: 'Linen counts, washer pickups & deliveries', page: 'laundry' },
    { type: 'page', icon: '📈', title: 'Analytics & RevPAR', sub: 'Revenue charts, ADR, occupancy heatmap', page: 'analytics' },
    { type: 'page', icon: '⏰', title: 'Reminders & Follow-ups', sub: 'Pending payments, ID collections', page: 'reminders' },
    { type: 'page', icon: '👥', title: 'Employees & HRMS', sub: 'Staff attendance, salaries, tasks', page: 'employees' },
    { type: 'page', icon: '📋', title: 'SOPs & Checklists', sub: 'Standard operating procedures', page: 'sop' }
  ];

  // ─── 2. Properties Directory ───
  const PROPERTIES_LIST = [
    {
      id: '101', roomId: 'VIL-108', unitNo: '101',
      name: 'Pink Paradise Villa (101)', nickname: 'Pink Paradise',
      aliases: ['pink paradise villa', 'pink paradise', 'paradise villa', 'पिंक पैराडाइज', 'पिंक पैराडाइज़', 'पिंक पैराडाइस', 'पिंक विला', 'गुलाबी विला', 'गुलाबी पैराडाइज', '101', 'vil-108']
    },
    {
      id: '102', roomId: 'VIL-105', unitNo: '102',
      name: 'The Yellow House (102)', nickname: 'Yellow House',
      aliases: ['the yellow house', 'yellow house', 'yellow', 'येलो हाउस', 'येलो', 'द येलो हाउस', 'पीला घर', 'पीला हाउस', 'पीला', 'peela house', 'peela', '102', 'vil-105']
    },
    {
      id: '103', roomId: 'VIL-106', unitNo: '103',
      name: 'Green Forest View (103)', nickname: 'Green Forest',
      aliases: ['green forest view', 'green forest', 'forest view', 'forest', 'ग्रीन फॉरेस्ट', 'ग्रीन फारेस्ट', 'ग्रीन व्यू', 'हरा जंगल', '103', 'vil-106']
    },
    {
      id: '104', roomId: 'LUL-402', unitNo: '104',
      name: 'Celebrity Garden (104)', nickname: 'Celebrity Garden',
      aliases: ['celebrity garden', 'celebrity', 'garden villa', 'सेलिब्रिटी गार्डन', 'सेलिब्रिटी', 'सेलेब्रिटी', '104', 'lul-402']
    },
    {
      id: '105', roomId: 'GOM-302', unitNo: '105',
      name: 'The Unique 3BHK (105)', nickname: 'Unique 3BHK',
      aliases: ['the unique 3bhk', 'the unique', 'unique 3bhk', 'unique', 'द यूनिक', 'यूनिक', '105', 'gom-302']
    },
    {
      id: '106', roomId: 'GOM-301', unitNo: '106',
      name: 'The Light Green (106)', nickname: 'Light Green',
      aliases: ['the light green', 'light green', 'लाइट ग्रीन', 'हल्का हरा', '106', 'gom-301']
    },
    {
      id: '107', roomId: 'GOM-501', unitNo: '107',
      name: 'Starlight Blue Penthouse (107)', nickname: 'Starlight Blue',
      aliases: ['starlight blue penthouse', 'starlight blue', 'starlight', 'blue penthouse', 'penthouse', 'स्टारलाइट ब्लू', 'स्टारलाइट', 'ब्लू पेंटहाउस', 'पेंटहाउस', 'नीला पेंटहाउस', '107', 'gom-501']
    },
    {
      id: '108', roomId: 'GOM-102', unitNo: '108',
      name: 'Black Beauty (108)', nickname: 'Black Beauty',
      aliases: ['black beauty', 'black', 'ब्लैक ब्यूटी', 'ब्लैक', 'काला ब्यूटी', 'काला', '108', 'gom-102']
    },
    {
      id: '109', roomId: 'GOM-401', unitNo: '109',
      name: 'The Nawabi Stay (109)', nickname: 'Nawabi Stay',
      aliases: ['the nawabi stay', 'nawabi stay', 'nawabi', 'द नवाबी स्टे', 'नवाबी स्टे', 'नवाबी', '109', 'gom-401']
    },
    {
      id: '110', roomId: 'VIL-101', unitNo: '110',
      name: 'Gomti Grand Villa (110)', nickname: 'Gomti Grand Villa',
      aliases: ['gomti grand villa', 'gomti grand', 'grand villa', 'gomti villa', 'गोमती ग्रैंड विला', 'गोमती ग्रैंड', 'ग्रैंड विला', 'गोमती विला', '110', 'vil-101']
    },
    {
      id: '111', roomId: 'VIL-104', unitNo: '111',
      name: 'The Green House (111)', nickname: 'Green House',
      aliases: ['the green house', 'green house', 'द ग्रीन हाउस', 'ग्रीन हाउस', 'हरा घर', 'हरा हाउस', 'हरा', '111', 'vil-104']
    },
    {
      id: '112', roomId: 'VIL-103', unitNo: '112',
      name: 'The Pink House (112)', nickname: 'Pink House',
      aliases: ['the pink house', 'pink house', 'द पिंक हाउस', 'पिंक हाउस', 'गुलाबी घर', 'गुलाबी हाउस', 'गुलाबी', 'पिंक', '112', 'vil-103']
    },
    {
      id: '113', roomId: 'GOM-202', unitNo: '113',
      name: 'The Brown Flat (113)', nickname: 'Brown Flat',
      aliases: ['the brown flat', 'the brown', 'brown flat', 'brown', 'द ब्राउन फ्लैट', 'द ब्राउन', 'ब्राउन फ्लैट', 'ब्राउन', '113', 'gom-202']
    },
    {
      id: '114', roomId: 'VIL-107', unitNo: '114',
      name: 'The Velvet House (114)', nickname: 'Velvet House',
      aliases: ['the velvet house', 'velvet house', 'velvet', 'द वेलवेट हाउस', 'वेलवेट हाउस', 'वेलवेट', '114', 'vil-107']
    },
    {
      id: '115', roomId: 'VIL-102', unitNo: '115',
      name: 'Royal White House (115)', nickname: 'Royal White',
      aliases: ['royal white house', 'royal white', 'white house', 'royal villa', 'रॉयल व्हाइट हाउस', 'रॉयल व्हाइट', 'व्हाइट हाउस', 'सफेद कोठी', 'सफेद घर', 'सफेद हाउस', 'सफेद', '115', 'vil-102']
    },
    {
      id: '116', roomId: 'GOM-201', unitNo: '116',
      name: 'The Dark Blue (116)', nickname: 'Dark Blue',
      aliases: ['the dark blue', 'dark blue', 'द डार्क ब्लू', 'डार्क ब्लू', 'गहरा नीला', 'नीला', '116', 'gom-201']
    },
    {
      id: '117', roomId: 'GOM-101', unitNo: '117',
      name: 'RedRose Palace (117)', nickname: 'RedRose Palace',
      aliases: ['redrose palace', 'redrose', 'red rose', 'the red', 'red', 'रेडरोज़ पैलेस', 'रेडरोज़', 'रेड रोज', 'रेड रोज़', 'रेड', 'हेरेड', 'द रेड', 'ह रेड', 'दे रेड', 'लाल घर', 'लाल पैलेस', 'लाल रोज', 'लाल', '117', 'gom-101']
    }
  ];

  // ─── 3. State Management ───
  let _selectedIndex = 0;
  let _currentResults = [];

  // ─── 4. Command Palette Modal ───
  window.openCommandPalette = function() {
    let el = document.getElementById('cmdPaletteBackdrop');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cmdPaletteBackdrop';
      el.className = 'cmd-palette-backdrop';
      el.onclick = (e) => { if (e.target === el) closeCommandPalette(); };
      document.body.appendChild(el);
    }

    el.innerHTML = `
      <div class="cmd-palette-box" onclick="event.stopPropagation()">
        <div class="cmd-palette-header">
          <span style="font-size:18px;color:#94A3B8;">🔍</span>
          <input type="text" id="cmdPaletteInput" class="cmd-palette-input" placeholder="Search guests, rooms, pages, or actions..." autocomplete="off" />
          <span class="cmd-palette-kbd">ESC</span>
        </div>
        <div class="cmd-palette-results" id="cmdPaletteResults"></div>
      </div>
    `;

    el.style.display = 'flex';
    const input = document.getElementById('cmdPaletteInput');
    if (input) {
      input.focus();
      input.oninput = () => renderPaletteResults(input.value);
      input.onkeydown = handlePaletteKeydown;
    }

    renderPaletteResults('');
  };

  function closeCommandPalette() {
    const el = document.getElementById('cmdPaletteBackdrop');
    if (el) el.style.display = 'none';
  }
  window.closeCommandPalette = closeCommandPalette;

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const el = document.getElementById('cmdPaletteBackdrop');
      if (el && el.style.display === 'flex') closeCommandPalette();
      else window.openCommandPalette();
    } else if (e.key === 'Escape') {
      closeCommandPalette();
      closeVoiceBookingModal();
    }
  });

  // Render & Filter Results
  async function renderPaletteResults(query) {
    const q = (query || '').toLowerCase().trim();
    const resultsContainer = document.getElementById('cmdPaletteResults');
    if (!resultsContainer) return;

    let items = [];

    // Filter System Actions & Pages
    const matchedCommands = SYSTEM_COMMANDS.filter(c => 
      !q || c.title.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q)
    );
    if (matchedCommands.length) {
      items.push({ isHeader: true, title: '⚡ Actions & Navigation' });
      items.push(...matchedCommands);
    }

    // Filter Properties
    const matchedProps = PROPERTIES_LIST.filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.nickname.toLowerCase().includes(q) || p.id.includes(q)
    );
    if (matchedProps.length) {
      items.push({ isHeader: true, title: '🏡 Properties & Flats' });
      matchedProps.forEach(p => {
        items.push({
          type: 'property',
          icon: '🛏️',
          title: p.name,
          sub: `Jump to ${p.nickname} in turnaround board`,
          action: () => {
            window.setFlatsFilter && window.setFlatsFilter('all');
            window._flatsSearchQuery = p.nickname;
            window.navigate('flats');
          }
        });
      });
    }

    // Search Live Bookings & Guests from cache or direct Supabase fallback
    let guestPool = window._sbkState?.cachedBookings || [];
    if (q && guestPool.length === 0 && window.sb) {
      try {
        const { data: directBks } = await sb.from('guest_register')
          .select('booking_id, guest_name, phone, room_id, check_in, check_out, total_amount')
          .or(`guest_name.ilike.%${q}%,phone.ilike.%${q}%,booking_id.ilike.%${q}%`)
          .limit(8);
        if (directBks && directBks.length) guestPool = directBks;
      } catch(e) {}
    }

    if (q && guestPool.length) {
      const matchedGuests = guestPool.filter(b => 
        (b.guest_name && b.guest_name.toLowerCase().includes(q)) ||
        (b.phone && b.phone.includes(q)) ||
        (b.booking_id && String(b.booking_id).toLowerCase().includes(q))
      ).slice(0, 8);

      if (matchedGuests.length) {
        items.push({ isHeader: true, title: '👥 Guest Reservations' });
        matchedGuests.forEach(b => {
          items.push({
            type: 'guest',
            icon: '👤',
            title: `${b.guest_name || 'Guest'} (${b.booking_id})`,
            sub: `${b.room_id || 'Room'} · ${b.check_in || '-'} to ${b.check_out || '-'} · ${b.phone || 'No phone'}`,
            action: () => {
              if (window.openBookingDrawer) window.openBookingDrawer(b.booking_id);
              else {
                if (window.SESSION) window.SESSION.bookingSearch = b.booking_id;
                window.navigate('bookings');
              }
            }
          });
        });
      }
    }

    _currentResults = items.filter(x => !x.isHeader);
    _selectedIndex = 0;

    if (!items.length) {
      resultsContainer.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:#94A3B8;font-size:13px;">
          No matching results found for "<strong>${escapeHtml(query)}</strong>"
        </div>
      `;
      return;
    }

    let selectableCounter = 0;
    resultsContainer.innerHTML = items.map(item => {
      if (item.isHeader) {
        return `<div class="cmd-result-group-title">${item.title}</div>`;
      }
      const myIdx = selectableCounter++;
      const isSel = myIdx === _selectedIndex;
      return `
        <div class="cmd-result-item ${isSel ? 'selected' : ''}" data-idx="${myIdx}" onclick="executePaletteItem(${myIdx})">
          <div class="cmd-result-left">
            <span class="cmd-result-icon">${item.icon}</span>
            <div>
              <div class="cmd-result-label">${item.title}</div>
              <div class="cmd-result-sub">${item.sub}</div>
            </div>
          </div>
          <span style="font-size:11px;color:#94A3B8;">↵</span>
        </div>
      `;
    }).join('');
  }

  function handlePaletteKeydown(e) {
    if (!_currentResults.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _selectedIndex = (_selectedIndex + 1) % _currentResults.length;
      updatePaletteSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _selectedIndex = (_selectedIndex - 1 + _currentResults.length) % _currentResults.length;
      updatePaletteSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executePaletteItem(_selectedIndex);
    }
  }

  function updatePaletteSelection() {
    document.querySelectorAll('.cmd-result-item').forEach((el, idx) => {
      if (idx === _selectedIndex) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  }

  window.executePaletteItem = function(idx) {
    const item = _currentResults[idx];
    if (!item) return;
    closeCommandPalette();
    if (item.action) {
      item.action();
    } else if (item.page) {
      window.navigate(item.page);
    }
  };


  // ══════════════════════════════════════════════════════════════════
  // 🎙️ 5. AI VOICE-TO-BOOKING ENGINE (Hindi & English)
  // ══════════════════════════════════════════════════════════════════
  let _recognition = null;
  let _isRecording = false;

  window.openVoiceBookingModal = function() {
    closeCommandPalette();

    let el = document.getElementById('voiceBookingBackdrop');
    if (!el) {
      el = document.createElement('div');
      el.id = 'voiceBookingBackdrop';
      el.className = 'voice-booking-backdrop';
      el.onclick = (e) => { if (e.target === el) closeVoiceBookingModal(); };
      document.body.appendChild(el);
    }

    el.innerHTML = `
      <div class="voice-booking-card" onclick="event.stopPropagation()">
        <button onclick="closeVoiceBookingModal()" style="position:absolute;top:16px;right:18px;background:none;border:none;color:#94A3B8;font-size:22px;cursor:pointer;">✕</button>

        <div style="font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;color:#fff;">
          🎙️ AI Voice-to-Booking
        </div>
        <div style="font-size:12.5px;color:#94A3B8;margin-top:-8px;">
          Speak in Hindi or English to automatically create a booking
        </div>

        <div class="voice-mic-glow" id="voiceMicBtn" onclick="toggleVoiceRecording()">
          🎤
        </div>

        <div class="voice-waveform-container" id="voiceWaveform" style="opacity:0.3;">
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
          <div class="voice-wave-bar"></div>
        </div>

        <div id="voiceStatusText" style="font-size:13px;font-weight:700;color:#38BDF8;">
          Tap microphone to start speaking...
        </div>

        <textarea class="voice-transcript-box" id="voiceTranscriptBox" rows="3"
          placeholder="Boliye ya type karein (e.g. 'गेस्ट नेम प्रवीण सिंह मोबाइल 9454470872 हेरेड प्रॉपर्टी')"
          oninput="processVoiceCommand(this.value)"
          style="width:100%;box-sizing:border-box;background:#1E293B;color:#F1F5F9;border:1.5px solid #334155;border-radius:10px;padding:10px 12px;font-size:13px;font-family:inherit;resize:none;outline:none;margin:10px 0 8px 0;line-height:1.5;"></textarea>

        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;width:100%;">
          <button type="button" style="background:#334155;color:#E2E8F0;border:1px solid #475569;padding:4px 9px;border-radius:6px;font-size:11px;cursor:pointer;" onclick="const t='गेस्ट नेम प्रवीण सिंह मोबाइल नंबर 9454470872 हेरेड प्रॉपर्टी रहेंगी।';document.getElementById('voiceTranscriptBox').value=t;processVoiceCommand(t);">
            ⚡ Test 1: प्रवीण सिंह (RedRose)
          </button>
          <button type="button" style="background:#334155;color:#E2E8F0;border:1px solid #475569;padding:4px 9px;border-radius:6px;font-size:11px;cursor:pointer;" onclick="const t='गेस्ट राहुल शर्मा फोन 9876543210 येलो हाउस 2 रात रेट 3500 एडवांस 2000';document.getElementById('voiceTranscriptBox').value=t;processVoiceCommand(t);">
            ⚡ Test 2: राहुल शर्मा (Yellow House)
          </button>
          <button type="button" style="background:#334155;color:#E2E8F0;border:1px solid #475569;padding:4px 9px;border-radius:6px;font-size:11px;cursor:pointer;" onclick="const t='लांगेस्ट नाम राजीव तलवार बुकिंग डेट 15 अक्टूबर 2026 से 20 अक्टूबर 2026 रेट पर दे 6000 प्रॉपर्टी पीला हाउस';document.getElementById('voiceTranscriptBox').value=t;processVoiceCommand(t);">
            ⚡ Test 3: राजीव तलवार (पीला हाउस 15-20 Oct)
          </button>
        </div>

        <div id="voiceParsedContainer" style="display:none;width:100%;">
          <div class="voice-parsed-summary" id="voiceParsedSummary"></div>
          <button type="button" class="btn" onclick="applyVoiceBooking()" style="width:100%;margin-top:10px;background:#10B981;color:#fff;font-weight:800;padding:12px;border-radius:10px;border:none;cursor:pointer;">
            ✨ Populate Booking Form ➔
          </button>
        </div>
      </div>
    `;

    el.style.display = 'flex';
    startVoiceRecording();
  };

  function closeVoiceBookingModal() {
    stopVoiceRecording();
    const el = document.getElementById('voiceBookingBackdrop');
    if (el) el.style.display = 'none';
  }
  window.closeVoiceBookingModal = closeVoiceBookingModal;

  function toggleVoiceRecording() {
    if (_isRecording) stopVoiceRecording();
    else startVoiceRecording();
  }
  window.toggleVoiceRecording = toggleVoiceRecording;

  function startVoiceRecording() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const statusText = document.getElementById('voiceStatusText');
    if (!SpeechRec) {
      if (statusText) {
        statusText.textContent = '⚠️ Mic not supported in this browser. Please type below.';
        statusText.style.color = '#F59E0B';
      }
      return;
    }

    try {
      if (_recognition) _recognition.abort();
    } catch(e) {}

    _recognition = new SpeechRec();
    _recognition.lang = 'hi-IN'; // Bilingual fallback handles Hinglish
    _recognition.continuous = true; // Keep recording through natural pauses
    _recognition.interimResults = true;

    const micBtn = document.getElementById('voiceMicBtn');
    const waveform = document.getElementById('voiceWaveform');

    if (micBtn) micBtn.style.animation = 'pulseVoice 1.2s infinite';
    if (waveform) waveform.style.opacity = '1';
    if (statusText) {
      statusText.textContent = '🔴 Listening... bolo abhi';
      statusText.style.color = '#FF385C';
    }

    _isRecording = true;

    _recognition.onresult = (event) => {
      let fullSpeech = '';
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i] && event.results[i][0]) {
          fullSpeech += event.results[i][0].transcript + ' ';
        }
      }
      fullSpeech = fullSpeech.trim();
      const transcriptBox = document.getElementById('voiceTranscriptBox');
      if (transcriptBox) {
        transcriptBox.value = fullSpeech;
      }
      if (fullSpeech) {
        processVoiceCommand(fullSpeech);
      }
    };

    _recognition.onerror = (event) => {
      console.warn('Speech error:', event.error);
      if (statusText) {
        statusText.textContent = '⚠️ Mic Error: ' + event.error;
        statusText.style.color = '#F59E0B';
      }
      stopVoiceRecording();
    };

    _recognition.onend = () => {
      stopVoiceRecording();
      const transcriptBox = document.getElementById('voiceTranscriptBox');
      const text = transcriptBox ? (transcriptBox.value || '').trim() : '';
      if (text) {
        processVoiceCommand(text);
      }
    };

    try {
      _recognition.start();
    } catch (err) {
      console.warn('Recognition start error:', err);
    }
  }

  function stopVoiceRecording() {
    _isRecording = false;
    const micBtn = document.getElementById('voiceMicBtn');
    const waveform = document.getElementById('voiceWaveform');
    const statusText = document.getElementById('voiceStatusText');

    if (micBtn) micBtn.style.animation = 'none';
    if (waveform) waveform.style.opacity = '0.3';
    if (statusText && statusText.textContent.includes('Listening')) {
      statusText.textContent = 'Speech processed successfully!';
      statusText.style.color = '#38BDF8';
    }

    try {
      if (_recognition) _recognition.stop();
    } catch(e) {}
  }

  // ─── 6. Natural Speech Parser (Hindi, Hinglish & English) ───
  let _lastParsedData = null;

  const HINDI_MONTH_MAP = {
    'जनवरी': 1, 'january': 1, 'jan': 1,
    'फरवरी': 2, 'फ़रवरी': 2, 'february': 2, 'feb': 2,
    'मार्च': 3, 'march': 3, 'mar': 3,
    'अप्रैल': 4, 'अप्रेल': 4, 'एप्रिल': 4, 'april': 4, 'apr': 4,
    'मई': 5, 'may': 5,
    'जून': 6, 'june': 6, 'jun': 6,
    'जुलाई': 7, 'july': 7, 'jul': 7,
    'अगस्त': 8, 'august': 8, 'aug': 8,
    'सितंबर': 9, 'सितम्बर': 9, 'september': 9, 'sep': 9, 'sept': 9,
    'अक्टूबर': 10, 'अक्तूबर': 10, 'october': 10, 'oct': 10,
    'नवंबर': 11, 'नवम्बर': 11, 'november': 11, 'nov': 11,
    'दिसंबर': 12, 'दिसम्बर': 12, 'december': 12, 'dec': 12
  };

  const MONTH_PATTERN = '(?:जनवरी|फरवरी|फ़रवरी|मार्च|अप्रैल|अप्रेल|एप्रिल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)';

  function normalizeHindiDigits(str) {
    if (!str) return '';
    const hindiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return String(str).replace(/[०-९]/g, d => {
      const idx = hindiDigits.indexOf(d);
      return idx !== -1 ? idx : d;
    });
  }

  function formatGuestName(str) {
    if (!str) return '';
    let clean = String(str).replace(/[।\,\.\-\:\;]/g, ' ').trim();
    // Strip accidental leading speech recognition prefixes
    clean = clean.replace(/^(?:लांगेस्ट|लॉन्गस्ट|लॉन्गेस्ट|गेस्ट|गस्ट|कस्टमर|क्लाइंट|यात्री|guest|customer|client|name|naam|नेम|नाम)\s*/i, '').trim();
    // Strip trailing postpositions or booking keywords
    clean = clean.replace(/\s+(?:का|की|के|ने|me|में|ko|को|ki|ka|ke|ne|booking|बुकिंग)$/i, '').trim();
    // Capitalize words for Latin characters while preserving Devanagari
    return clean.replace(/\b[a-z]/g, l => l.toUpperCase());
  }

  function buildIsoDate(dayNum, monthStr, yearNum) {
    const day = parseInt(dayNum, 10);
    const mKey = String(monthStr || '').toLowerCase().trim();
    const month = HINDI_MONTH_MAP[mKey];
    if (!day || !month || day < 1 || day > 31) return null;

    let year = yearNum ? parseInt(yearNum, 10) : new Date().getFullYear();
    if (year < 100) year += 2000;

    const pad = n => String(n).padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  function addDaysToIso(isoStr, days) {
    if (!isoStr) return '';
    const d = new Date(isoStr + 'T00:00:00');
    d.setDate(d.getDate() + (days || 1));
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function processVoiceCommand(text) {
    if (!text || !text.trim()) return;

    // Convert Hindi Devanagari numerals if any
    const normText = normalizeHindiDigits(text);
    const lower = normText.toLowerCase();

    const parsed = {
      guestName: '',
      roomNickname: '',
      roomId: '',
      nights: 1,
      rate: '',
      advance: '',
      phone: '',
      checkIn: '',
      checkOut: ''
    };

    // 1. Match Phone Number (10 digits starting with 6-9)
    const phoneCleaned = normText.replace(/[-\s]/g, '');
    const phoneMatch = phoneCleaned.match(/(?:\+?91)?([6-9]\d{9})/);
    if (phoneMatch) {
      parsed.phone = phoneMatch[1];
    }

    // 2. Match Property (Multi-lingual: Hindi Devanagari, English, and phonetic speech variations)
    // First, sort PROPERTIES_LIST aliases by descending length for greedy matching
    let matchedProp = null;
    let longestMatchLen = 0;

    for (const p of PROPERTIES_LIST) {
      const aliases = p.aliases || [p.nickname.toLowerCase()];
      for (const alias of aliases) {
        const al = alias.toLowerCase().trim();
        if (al.length > longestMatchLen && lower.includes(al)) {
          matchedProp = p;
          longestMatchLen = al.length;
        }
      }
      if (!matchedProp && (lower.includes(`room ${p.id}`) || lower.includes(`flat ${p.id}`) || lower.includes(`unit ${p.id}`))) {
        matchedProp = p;
        longestMatchLen = 1;
      }
    }

    if (matchedProp) {
      parsed.roomNickname = matchedProp.name;
      parsed.roomId = matchedProp.roomId || matchedProp.id;
    }

    // Fallback matching for speech recognition phonetic variations
    if (!parsed.roomNickname) {
      if (/हेरेड|रेडरोज़|रेड रोज|रेड रोज़|रेड पैलेस|द रेड|redrose|red rose|the red|लाल घर|लाल पैलेस|लाल/i.test(lower)) {
        parsed.roomNickname = 'RedRose Palace (117)';
        parsed.roomId = 'GOM-101';
      } else if (/पिंक पैरा|pink paradise|गुलाबी पैरा/i.test(lower)) {
        parsed.roomNickname = 'Pink Paradise Villa (101)';
        parsed.roomId = 'VIL-108';
      } else if (/पिंक|pink|गुलाबी/i.test(lower)) {
        parsed.roomNickname = 'The Pink House (112)';
        parsed.roomId = 'VIL-103';
      } else if (/येलो|yellow|पीला|peela/i.test(lower)) {
        parsed.roomNickname = 'The Yellow House (102)';
        parsed.roomId = 'VIL-105';
      } else if (/फॉरेस्ट|green forest|हरा जंगल/i.test(lower)) {
        parsed.roomNickname = 'Green Forest View (103)';
        parsed.roomId = 'VIL-106';
      } else if (/सेलिब्रिटी|celebrity/i.test(lower)) {
        parsed.roomNickname = 'Celebrity Garden (104)';
        parsed.roomId = 'LUL-402';
      } else if (/यूनिक|unique/i.test(lower)) {
        parsed.roomNickname = 'The Unique 3BHK (105)';
        parsed.roomId = 'GOM-302';
      } else if (/लाइट ग्रीन|light green/i.test(lower)) {
        parsed.roomNickname = 'The Light Green (106)';
        parsed.roomId = 'GOM-301';
      } else if (/स्टारलाइट|पेंटहाउस|penthouse|starlight|नीला पेंट/i.test(lower)) {
        parsed.roomNickname = 'Starlight Blue Penthouse (107)';
        parsed.roomId = 'GOM-501';
      } else if (/ब्लैक ब्यूटी|ब्लैक|black|काला/i.test(lower)) {
        parsed.roomNickname = 'Black Beauty (108)';
        parsed.roomId = 'GOM-102';
      } else if (/नवाबी|nawabi/i.test(lower)) {
        parsed.roomNickname = 'The Nawabi Stay (109)';
        parsed.roomId = 'GOM-401';
      } else if (/गोमती ग्रैंड|ग्रैंड विला|gomti grand|गोमती विला/i.test(lower)) {
        parsed.roomNickname = 'Gomti Grand Villa (110)';
        parsed.roomId = 'VIL-101';
      } else if (/हरा हाउस|हरा घर|green house/i.test(lower)) {
        parsed.roomNickname = 'The Green House (111)';
        parsed.roomId = 'VIL-104';
      } else if (/ब्राउन|brown/i.test(lower)) {
        parsed.roomNickname = 'The Brown Flat (113)';
        parsed.roomId = 'GOM-202';
      } else if (/वेलवेट|velvet/i.test(lower)) {
        parsed.roomNickname = 'The Velvet House (114)';
        parsed.roomId = 'VIL-107';
      } else if (/रॉयल व्हाइट|व्हाइट हाउस|royal white|सफेद घर|सफेद हाउस|सफेद कोठी/i.test(lower)) {
        parsed.roomNickname = 'Royal White House (115)';
        parsed.roomId = 'VIL-102';
      } else if (/डार्क ब्लू|dark blue|गहरा नीला|नीला/i.test(lower)) {
        parsed.roomNickname = 'The Dark Blue (116)';
        parsed.roomId = 'GOM-201';
      }
    }

    // 3. Match Nights / Duration (supports digits and Hindi words)
    const hindiWordToNum = {
      'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
      'छह': 6, 'छः': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5
    };
    const nightsMatch = lower.match(/(\d+|एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|दस|one|two|three|four|five)\s*(night|nights|नाइट्स|नाइट|रात|रातें|दिन|din|day|days)/i);
    if (nightsMatch) {
      const val = nightsMatch[1];
      parsed.nights = hindiWordToNum[val] || parseInt(val, 10) || 1;
    }

    // 4. Match Dates (Full support for Hindi & English spoken dates & ranges)
    let foundCheckIn = null;
    let foundCheckOut = null;

    // Pattern A: Two dates with explicit month names (e.g. "15 अक्टूबर 2026 से 20 अक्टूबर 2026" or "15 Oct to 20 Oct")
    const dateRangeBothMonthsRegex = new RegExp(
      `(\\d{1,2})(?:th|st|nd|rd)?\\s*(?:तारीख)?\\s*(${MONTH_PATTERN})\\s*(\\d{4})?\\s*(?:से|to|तक|-)\\s*(\\d{1,2})(?:th|st|nd|rd)?\\s*(?:तारीख)?\\s*(${MONTH_PATTERN})\\s*(\\d{4})?`,
      'i'
    );
    const mRangeBoth = lower.match(dateRangeBothMonthsRegex);

    if (mRangeBoth) {
      const y1 = mRangeBoth[3] || mRangeBoth[6] || '';
      const y2 = mRangeBoth[6] || mRangeBoth[3] || '';
      foundCheckIn = buildIsoDate(mRangeBoth[1], mRangeBoth[2], y1);
      foundCheckOut = buildIsoDate(mRangeBoth[4], mRangeBoth[5], y2);
    }

    // Pattern B: Shared month range (e.g. "15 से 20 अक्टूबर 2026" or "15 to 20 october 2026")
    if (!foundCheckIn) {
      const dateRangeSharedMonthRegex = new RegExp(
        `(\\d{1,2})(?:th|st|nd|rd)?\\s*(?:तारीख)?\\s*(?:से|to|तक|-)\\s*(\\d{1,2})(?:th|st|nd|rd)?\\s*(?:तारीख)?\\s*(${MONTH_PATTERN})\\s*(\\d{4})?`,
        'i'
      );
      const mRangeShared = lower.match(dateRangeSharedMonthRegex);
      if (mRangeShared) {
        foundCheckIn = buildIsoDate(mRangeShared[1], mRangeShared[3], mRangeShared[4]);
        foundCheckOut = buildIsoDate(mRangeShared[2], mRangeShared[3], mRangeShared[4]);
      }
    }

    // Pattern C: Numeric date range (e.g. "15/10/2026 से 20/10/2026" or "15-10-2026 to 20-10-2026")
    if (!foundCheckIn) {
      const numericRangeRegex = /(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\s*(?:से|to|तक|-)\s*(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/i;
      const mNum = lower.match(numericRangeRegex);
      if (mNum) {
        const y1 = mNum[3] || mNum[6] || '';
        const y2 = mNum[6] || mNum[3] || '';
        const pad = n => String(n).padStart(2, '0');
        const curY = new Date().getFullYear();
        foundCheckIn = `${y1 || curY}-${pad(mNum[2])}-${pad(mNum[1])}`;
        foundCheckOut = `${y2 || curY}-${pad(mNum[5])}-${pad(mNum[4])}`;
      }
    }

    // Pattern D: Single start date (e.g. "15 अक्टूबर 2026" or "चेक इन 15 अक्टूबर")
    if (!foundCheckIn) {
      const singleDateRegex = new RegExp(
        `(?:बुकिंग\\s*डेट|चेक\\s*इन|तारीख|डेट|from|date)?\\s*[:=\\-]?\\s*(\\d{1,2})(?:th|st|nd|rd)?\\s*(?:तारीख)?\\s*(${MONTH_PATTERN})\\s*(\\d{4})?`,
        'i'
      );
      const mSingle = lower.match(singleDateRegex);
      if (mSingle && mSingle[1] && mSingle[2]) {
        foundCheckIn = buildIsoDate(mSingle[1], mSingle[2], mSingle[3]);
      }
    }

    // Apply resolved dates or fall back to relative dates
    if (foundCheckIn && foundCheckOut) {
      parsed.checkIn = foundCheckIn;
      parsed.checkOut = foundCheckOut;
      const diffMs = new Date(foundCheckOut + 'T00:00:00') - new Date(foundCheckIn + 'T00:00:00');
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        parsed.nights = diffDays;
      }
    } else if (foundCheckIn) {
      parsed.checkIn = foundCheckIn;
      parsed.checkOut = addDaysToIso(foundCheckIn, parsed.nights || 1);
    } else {
      const today = new Date();
      let checkInDate = new Date(today);
      checkInDate.setDate(checkInDate.getDate() + 1); // default tomorrow

      if (/आज|today/i.test(lower)) {
        checkInDate = new Date(today);
      } else if (/परसों|day after tomorrow/i.test(lower)) {
        checkInDate = new Date(today);
        checkInDate.setDate(checkInDate.getDate() + 2);
      } else if (/कल|tomorrow/i.test(lower)) {
        checkInDate = new Date(today);
        checkInDate.setDate(checkInDate.getDate() + 1);
      }

      const pad = n => String(n).padStart(2, '0');
      parsed.checkIn = `${checkInDate.getFullYear()}-${pad(checkInDate.getMonth() + 1)}-${pad(checkInDate.getDate())}`;
      parsed.checkOut = addDaysToIso(parsed.checkIn, parsed.nights || 1);
    }

    // 5. Match Rate & Advance (Ensuring 4-digit years like 2026 are never mistaken for rates)
    const isYearOrDateDigit = (val) => {
      if (!val) return false;
      const n = parseInt(val, 10);
      if (n >= 2024 && n <= 2035) {
        const re = new RegExp(`(?:${MONTH_PATTERN}|[0-9]{1,2}[\\/\\-\\.]|तारीख)\\s*${val}`, 'i');
        if (re.test(lower)) return true;
      }
      return false;
    };

    // Forward rate: "रेट पर दे 6000", "रेट पर डे 6000", "रेट 6000", "rate per day 6000", "किराया 6000"
    const rateMatch1 = lower.match(/(?:रेट|rate|किराया|rent|price|प्राइस)\s*(?:पर\s*दे|पर\s*डे|परदे|परडे|पर\s*दिन|प्रति\s*दिन|रोज\s*का|per\s*day|per\s*night|पर\s*नाइट|पर\s*रात|है|होगा|रहेगा|का|की|के|is)?\s*[:=\-]?\s*(\d{3,6})/i);
    // Reverse rate: "6000 रुपये", "6000 रेट", "6000 पर डे"
    const rateMatch2 = lower.match(/(\d{3,6})\s*(?:रेट|rate|रुपये|रुपया|रू|रु|₹|rs\.?|inr|per night|पर नाइट|per day|पर डे|पर दे|पर दिन|प्रति दिन|रोज का|में|me)/i);

    if (rateMatch1 && !isYearOrDateDigit(rateMatch1[1])) {
      parsed.rate = rateMatch1[1];
    } else if (rateMatch2 && !isYearOrDateDigit(rateMatch2[1])) {
      parsed.rate = rateMatch2[1];
    }

    const advMatch1 = lower.match(/(?:एडवांस|advance|टोकन|token|जमा|paid)\s*(?:में|का|की|के|is)?\s*[:=\-]?\s*(\d{3,6})/i);
    const advMatch2 = lower.match(/(\d{3,6})\s*(?:एडवांस|advance|मिला|paid|टोकन|token|जमा)/i);
    if (advMatch1 && !isYearOrDateDigit(advMatch1[1])) parsed.advance = advMatch1[1];
    else if (advMatch2 && !isYearOrDateDigit(advMatch2[1])) parsed.advance = advMatch2[1];

    // 6. Match Guest Name (Hindi Devanagari & English)
    // Pattern A: Prefix like "लांगेस्ट नाम राजीव तलवार", "गेस्ट नेम प्रवीण सिंह", "गेस्ट नाम राहुल", "नाम अमित", "guest name John"
    const prefixNameRegex = /(?:(?:लांगेस्ट|लॉन्गस्ट|लॉन्गेस्ट|गेस्ट|गस्ट|कस्टमर|क्लाइंट|यात्री|guest|customer|client)\s*(?:नेम|नाम|name)?|(?:नेम|नाम|name|naam)|for|booked\s*for|booking\s*for)\s*[:=\-]?\s*([a-zA-Z\u0900-\u097F\s\.\'\-]+?)(?=\s+(?:बुकिंग|booking|डेट|date|तारीख|tarikh|from|to|से|तक|चेक\s*इन|check\s*in|चेक\s*आउट|check\s*out|मोबाइल|फोन|नंबर|phone|mobile|number|mob|\d+|प्रॉपर्टी|property|रूम|room|कमरा|फ्लैट|flat|विला|villa|हाउस|house|होटल|hotel|रेट|rate|किराया|rent|price|प्राइस|एडवांस|advance|टोकन|token|जमा|कल|आज|परसों|today|tomorrow|night|nights|नाइट|नाइट्स|रात|रातें|दिन|din|day|days|(?:का|की|के|ने)\s+(?:बुकिंग|कमरा|stay))|[\,\.\।\:\;\-\n]|$)/i;
    const prefixMatch = normText.match(prefixNameRegex);

    if (prefixMatch && prefixMatch[1] && prefixMatch[1].trim()) {
      parsed.guestName = formatGuestName(prefixMatch[1]);
    } else {
      // Pattern B: Postfix particle like "प्रवीण सिंह का बुकिंग", "Rahul Sharma ki booking"
      const postfixMatch = normText.match(/([a-zA-Z\u0900-\u097F\s\.\'\-]{2,30}?)\s+(?:का|की|के|ने|ka|ki|ke|ne)\s+(?:बुकिंग|booking|कमरा|stay|room|staying)/i);
      if (postfixMatch && postfixMatch[1] && postfixMatch[1].trim()) {
        parsed.guestName = formatGuestName(postfixMatch[1]);
      } else {
        // Pattern C: Leading Name without prefix before booking/date/property keyword (e.g. "राजीव तलवार बुकिंग डेट...")
        const leadMatch = normText.match(/^\s*([a-zA-Z\u0900-\u097F\s\.\'\-]{2,30}?)\s+(?:बुकिंग|booking|मोबाइल|फोन|phone|mobile|डेट|date|तारीख|tarikh|check|चेक|रूम|room|प्रॉपर्टी|property|rate|रेट)/i);
        if (leadMatch && leadMatch[1] && leadMatch[1].trim()) {
          const candidate = leadMatch[1].trim();
          const words = candidate.split(/\s+/).filter(w => !/^(बुकिंग|booking|डेट|date|का|की|के|ने|for)$/i.test(w));
          if (words.length >= 1 && words.length <= 4) {
            parsed.guestName = formatGuestName(words.join(' '));
          }
        } else if (parsed.phone) {
          // Pattern D: Context before phone number (e.g. "प्रवीण सिंह मोबाइल 9454470872")
          const parts = normText.split(parsed.phone);
          if (parts[0]) {
            let candidate = parts[0].replace(/(?:मोबाइल|फोन|नंबर|phone|mobile|number|का|की|ke|ka|ki)\s*$/i, '').trim();
            candidate = candidate.replace(/^(?:लांगेस्ट|गेस्ट\s*(?:नेम|नाम)|नेम|नाम|guest\s*name|guest|name)\s*/i, '').trim();
            const words = candidate.split(/\s+/).filter(w => w && !/^(का|की|के|हेरेड|रेड|रूम|होटल|stay|प्रॉपर्टी|property)$/i.test(w));
            if (words.length >= 1 && words.length <= 4) {
              parsed.guestName = formatGuestName(words.join(' '));
            }
          }
        }
      }
    }

    _lastParsedData = parsed;

    // Display summary
    const parsedContainer = document.getElementById('voiceParsedContainer');
    const summaryBox = document.getElementById('voiceParsedSummary');
    const statusText = document.getElementById('voiceStatusText');

    if (parsedContainer && summaryBox) {
      parsedContainer.style.display = 'block';
      const totalEstimated = parsed.rate ? Number(parsed.rate) * (parsed.nights || 1) : 0;
      summaryBox.innerHTML = `
        <div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#fff;">✅ Speech Parsed Successfully:</div>
        <div style="margin-bottom:3px;">👤 <strong>Guest Name:</strong> ${parsed.guestName ? `<span style="color:#34D399;font-weight:800;">${escapeHtml(parsed.guestName)}</span>` : '<span style="color:#FBBF24;">(Not specified)</span>'}</div>
        <div style="margin-bottom:3px;">🏡 <strong>Property:</strong> ${parsed.roomNickname ? `<span style="color:#38BDF8;font-weight:800;">${escapeHtml(parsed.roomNickname)}</span>` : '<span style="color:#FBBF24;">(Select in form)</span>'}</div>
        <div style="margin-bottom:3px;">🌙 <strong>Duration:</strong> ${parsed.nights} Night(s) (${parsed.checkIn} → ${parsed.checkOut})</div>
        ${parsed.rate ? `<div style="margin-bottom:3px;">💰 <strong>Rate:</strong> ₹${parsed.rate} / night ${parsed.nights > 1 ? `<span style="color:#94A3B8;font-size:11.5px;">(Total: ₹${totalEstimated})</span>` : ''}</div>` : ''}
        ${parsed.advance ? `<div style="margin-bottom:3px;">💵 <strong>Advance:</strong> ₹${parsed.advance}</div>` : ''}
        ${parsed.phone ? `<div style="margin-bottom:3px;">📞 <strong>Phone:</strong> <span style="color:#A7F3D0;font-weight:800;">${escapeHtml(parsed.phone)}</span></div>` : ''}
      `;
    }

    if (statusText) {
      statusText.textContent = '🎉 Ready! Tap button below to populate form';
      statusText.style.color = '#10B981';
    }

    // Play pleasant confirmation sound if available
    if (window.notifications && typeof window.notifications.notify === 'function') {
      // Audio chime
    }
  }

  window.processVoiceCommand = processVoiceCommand;
  window.getLastParsedVoiceData = () => _lastParsedData;

  window.applyVoiceBooking = function() {
    if (!_lastParsedData) return;
    const p = _lastParsedData;
    closeVoiceBookingModal();

    window._bookingPrefill = {
      guestName: p.guestName || '',
      guestPhone: p.phone || '',
      checkIn: p.checkIn,
      checkOut: p.checkOut,
      totalAmount: p.rate ? Number(p.rate) * (p.nights || 1) : '',
      advance: p.advance || '',
      advanceAmt: p.advance || '',
      roomId: p.roomId || '',
      room_id: p.roomId || ''
    };

    if (typeof window.renderAddBooking === 'function') {
      window.renderAddBooking();
    } else {
      window.navigate('bookings');
    }
  };

  function capitalizeWords(str) {
    if (!str) return '';
    return str.replace(/\b\w/g, l => l.toUpperCase());
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

})();
