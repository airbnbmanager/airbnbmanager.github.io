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
    { id: '101', name: 'Pink Paradise Villa (101)', nickname: 'Pink Paradise' },
    { id: '102', name: 'The Yellow House (102)', nickname: 'Yellow House' },
    { id: '103', name: 'Green Forest View (103)', nickname: 'Green Forest' },
    { id: '104', name: 'Celebrity Garden (104)', nickname: 'Celebrity Garden' },
    { id: '105', name: 'The Unique 3BHK (105)', nickname: 'Unique 3BHK' },
    { id: '106', name: 'The Light Green (106)', nickname: 'Light Green' },
    { id: '107', name: 'Starlight Blue Penthouse (107)', nickname: 'Starlight Blue' },
    { id: '108', name: 'Black Beauty (108)', nickname: 'Black Beauty' },
    { id: '109', name: 'The Nawabi Stay (109)', nickname: 'Nawabi Stay' },
    { id: '110', name: 'Gomti Grand Villa (110)', nickname: 'Gomti Grand Villa' },
    { id: '111', name: 'The Green House (111)', nickname: 'Green House' },
    { id: '112', name: 'The Pink House (112)', nickname: 'Pink House' },
    { id: '113', name: 'The Brown Flat (113)', nickname: 'Brown Flat' },
    { id: '114', name: 'The Velvet House (114)', nickname: 'Velvet House' },
    { id: '115', name: 'Royal White House (115)', nickname: 'Royal White' },
    { id: '116', name: 'The Dark Blue (116)', nickname: 'Dark Blue' },
    { id: '117', name: 'RedRose Palace (117)', nickname: 'RedRose Palace' }
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

  window.closeCommandPalette = function() {
    const el = document.getElementById('cmdPaletteBackdrop');
    if (el) el.style.display = 'none';
  };

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

    // Search Live Bookings & Guests from cache
    const cachedBks = window._sbkState?.cachedBookings || [];
    if (q && cachedBks.length) {
      const matchedGuests = cachedBks.filter(b => 
        (b.guest_name && b.guest_name.toLowerCase().includes(q)) ||
        (b.phone && b.phone.includes(q)) ||
        (b.booking_id && b.booking_id.toLowerCase().includes(q))
      ).slice(0, 6);

      if (matchedGuests.length) {
        items.push({ isHeader: true, title: '👥 Guest Reservations' });
        matchedGuests.forEach(b => {
          items.push({
            type: 'guest',
            icon: '👤',
            title: `${b.guest_name || 'Guest'} (${b.booking_id})`,
            sub: `${b.room_id || 'Room'} · ${b.check_in} to ${b.check_out} · ${b.phone || 'No phone'}`,
            action: () => {
              if (window.openBookingDrawer) window.openBookingDrawer(b.booking_id);
              else window.navigate('bookings');
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

        <div class="voice-transcript-box" id="voiceTranscriptBox">
          <em>e.g. "Pink Paradise me Rahul Sharma ka kal se 3 nights ka booking banao ₹3500 rate pe, 2000 advance mila hai..."</em>
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

  window.closeVoiceBookingModal = function() {
    stopVoiceRecording();
    const el = document.getElementById('voiceBookingBackdrop');
    if (el) el.style.display = 'none';
  };

  window.toggleVoiceRecording = function() {
    if (_isRecording) stopVoiceRecording();
    else startVoiceRecording();
  };

  function startVoiceRecording() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Safari.');
      return;
    }

    try {
      if (_recognition) _recognition.abort();
    } catch(e) {}

    _recognition = new SpeechRec();
    _recognition.lang = 'hi-IN'; // Bilingual fallback handles Hinglish
    _recognition.continuous = false;
    _recognition.interimResults = true;

    const micBtn = document.getElementById('voiceMicBtn');
    const statusText = document.getElementById('voiceStatusText');
    const waveform = document.getElementById('voiceWaveform');
    const transcriptBox = document.getElementById('voiceTranscriptBox');

    if (micBtn) micBtn.style.animation = 'pulseVoice 1.2s infinite';
    if (waveform) waveform.style.opacity = '1';
    if (statusText) {
      statusText.textContent = '🔴 Listening... bolo abhi';
      statusText.style.color = '#FF385C';
    }

    _isRecording = true;

    _recognition.onresult = (event) => {
      let speech = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        speech += event.results[i][0].transcript;
      }
      if (transcriptBox) transcriptBox.textContent = speech;
      if (event.results[0].isFinal) {
        processVoiceCommand(speech);
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
      statusText.textContent = 'Processing speech...';
      statusText.style.color = '#38BDF8';
    }

    try {
      if (_recognition) _recognition.stop();
    } catch(e) {}
  }

  // ─── 6. Natural Speech Parser ───
  let _lastParsedData = null;

  function processVoiceCommand(text) {
    if (!text || !text.trim()) return;

    const lower = text.toLowerCase();
    const parsed = {
      guestName: '',
      roomNickname: '',
      roomId: '',
      nights: 1,
      rate: '',
      advance: '',
      phone: ''
    };

    // 1. Match Property
    for (const p of PROPERTIES_LIST) {
      const nick = p.nickname.toLowerCase();
      const id = p.id;
      if (lower.includes(nick) || lower.includes(`room ${id}`) || lower.includes(`flat ${id}`) || lower.includes(`unit ${id}`)) {
        parsed.roomNickname = p.nickname;
        parsed.roomId = p.id;
        break;
      }
    }
    if (!parsed.roomNickname) {
      // Fallback matching
      if (lower.includes('pink')) parsed.roomNickname = 'Pink Paradise';
      else if (lower.includes('yellow')) parsed.roomNickname = 'Yellow House';
      else if (lower.includes('green forest')) parsed.roomNickname = 'Green Forest';
      else if (lower.includes('celebrity')) parsed.roomNickname = 'Celebrity Garden';
      else if (lower.includes('unique')) parsed.roomNickname = 'Unique 3BHK';
      else if (lower.includes('blue') || lower.includes('penthouse')) parsed.roomNickname = 'Starlight Blue';
      else if (lower.includes('grand villa')) parsed.roomNickname = 'Gomti Grand Villa';
    }

    // 2. Match Nights / Days
    const nightsMatch = lower.match(/(\d+)\s*(night|nights|din|day|days)/);
    if (nightsMatch) {
      parsed.nights = parseInt(nightsMatch[1], 10) || 1;
    }

    // 3. Match Rate & Advance
    const rateMatch = lower.match(/(₹|rs\.?|inr)?\s*(\d{3,6})\s*(rate|per night|me|ka)/);
    if (rateMatch) {
      parsed.rate = rateMatch[2];
    } else {
      const anyNum = lower.match(/(\d{3,6})\s*(rupaye|rs|inr)/);
      if (anyNum) parsed.rate = anyNum[1];
    }

    const advMatch = lower.match(/(\d{3,6})\s*(advance|mila|paid)/);
    if (advMatch) {
      parsed.advance = advMatch[1];
    }

    // 4. Match Phone Number (10 digits)
    const phoneMatch = lower.replace(/\s+/g, '').match(/\d{10}/);
    if (phoneMatch) {
      parsed.phone = phoneMatch[0];
    }

    // 5. Match Guest Name (words before "ka", "ki", "booked for", "for")
    const forMatch = lower.match(/(for|naam|guest)\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)/);
    if (forMatch) {
      parsed.guestName = capitalizeWords(forMatch[2]);
    } else {
      const kaMatch = text.match(/([A-Z\u0900-\u097F][a-zA-Z\u0900-\u097F]+(?:\s+[A-Z\u0900-\u097F][a-zA-Z\u0900-\u097F]+)?)\s+(ka|ki|ne)/);
      if (kaMatch) {
        parsed.guestName = capitalizeWords(kaMatch[1]);
      }
    }

    _lastParsedData = parsed;

    // Display summary
    const parsedContainer = document.getElementById('voiceParsedContainer');
    const summaryBox = document.getElementById('voiceParsedSummary');
    const statusText = document.getElementById('voiceStatusText');

    if (parsedContainer && summaryBox) {
      parsedContainer.style.display = 'block';
      summaryBox.innerHTML = `
        <div style="font-weight:800;font-size:13px;margin-bottom:4px;color:#fff;">✅ Speech Parsed Successfully:</div>
        <div>👤 <strong>Guest Name:</strong> ${parsed.guestName || '<span style="color:#FBBF24;">(Not specified)</span>'}</div>
        <div>🏡 <strong>Property:</strong> ${parsed.roomNickname || '<span style="color:#FBBF24;">(Select in form)</span>'}</div>
        <div>🌙 <strong>Duration:</strong> ${parsed.nights} Night(s)</div>
        ${parsed.rate ? `<div>💰 <strong>Rate:</strong> ₹${parsed.rate}</div>` : ''}
        ${parsed.advance ? `<div>💵 <strong>Advance:</strong> ₹${parsed.advance}</div>` : ''}
        ${parsed.phone ? `<div>📞 <strong>Phone:</strong> ${parsed.phone}</div>` : ''}
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

  window.applyVoiceBooking = function() {
    if (!_lastParsedData) return;
    const p = _lastParsedData;
    closeVoiceBookingModal();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkout = new Date(tomorrow);
    checkout.setDate(checkout.getDate() + (p.nights || 1));

    const checkInStr = tomorrow.toISOString().slice(0, 10);
    const checkOutStr = checkout.toISOString().slice(0, 10);

    window._bookingPrefill = {
      guestName: p.guestName || '',
      guestPhone: p.phone || '',
      checkIn: checkInStr,
      checkOut: checkOutStr,
      totalAmount: p.rate ? Number(p.rate) * (p.nights || 1) : '',
      advance: p.advance || '',
      roomId: p.roomId || ''
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
