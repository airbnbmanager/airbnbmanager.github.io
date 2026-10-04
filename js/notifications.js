// ═══════════════════════════════════════════════════════════
// 🔔 REAL-TIME NOTIFICATIONS - Clean version
// ═══════════════════════════════════════════════════════════

(function() {
  const NOTIF = {
    channels: [],
    history: JSON.parse(localStorage.getItem('uh_notif_history') || '[]'),
    maxHistory: 50,
    isMuted: localStorage.getItem('uh_notif_muted') === 'true',
    started: false
  };

  // ─── Sound (Apple / Luxury Hospitality Harmonic Chime Synthesizer) ───
  function playSound(type) {
    if (NOTIF.isMuted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Harmonic chords with gentle attack and warm exponential decay
      const presets = {
        booking: [
          { freq: 523.25, time: 0, dur: 0.35, gain: 0.16 },    // C5
          { freq: 659.25, time: 0.08, dur: 0.35, gain: 0.18 },  // E5
          { freq: 783.99, time: 0.16, dur: 0.45, gain: 0.20 },  // G5
          { freq: 1046.5, time: 0.24, dur: 0.65, gain: 0.22 }   // C6 (crystal bell)
        ],
        payment: [
          { freq: 587.33, time: 0, dur: 0.3, gain: 0.16 },     // D5
          { freq: 880.00, time: 0.09, dur: 0.35, gain: 0.18 },   // A5
          { freq: 1174.66, time: 0.18, dur: 0.6, gain: 0.22 }   // D6
        ],
        checkin: [
          { freq: 440.00, time: 0, dur: 0.35, gain: 0.16 },    // A4
          { freq: 554.37, time: 0.1, dur: 0.5, gain: 0.20 }     // C#5
        ],
        checkout: [
          { freq: 554.37, time: 0, dur: 0.3, gain: 0.16 },
          { freq: 440.00, time: 0.1, dur: 0.45, gain: 0.18 }
        ],
        task: [
          { freq: 493.88, time: 0, dur: 0.3, gain: 0.15 },
          { freq: 659.25, time: 0.1, dur: 0.45, gain: 0.18 }
        ],
        info: [
          { freq: 523.25, time: 0, dur: 0.25, gain: 0.14 },
          { freq: 659.25, time: 0.08, dur: 0.4, gain: 0.16 }
        ]
      };

      const notes = presets[type] || presets.info;
      notes.forEach(({ freq, time, dur, gain }) => {
        setTimeout(() => {
          try {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + dur);
          } catch(err) {}
        }, time * 1000);
      });
    } catch(e) {}
  }

  function vibrate(pattern) {
    try { navigator.vibrate && navigator.vibrate(pattern); } catch(e) {}
  }

  // ─── History ───
  function saveHist(n) {
    const entry = { ...n, id: Date.now()+Math.random(), read: false, time: new Date().toISOString() };
    NOTIF.history.unshift(entry);
    if (NOTIF.history.length > NOTIF.maxHistory) NOTIF.history = NOTIF.history.slice(0, NOTIF.maxHistory);
    localStorage.setItem('uh_notif_history', JSON.stringify(NOTIF.history));
    updateBadge();
    // ✅ PERSIST TO DB (background, non-blocking)
    persistNotificationDB(entry);
  }

  // ─── Persist to DB (background) ───
  async function persistNotificationDB(n) {
    if (!window.sb || !window.SESSION?.userId) return;
    try {
      const { data, error } = await sb.from('notifications').insert({
        user_id: window.SESSION.userId,
        type: n.type || 'info',
        icon: n.icon || '🔔',
        title: n.title || '',
        message: n.message || '',
        page: n.page || null,
        data: {
          sub: n.sub || null,
          entityId: n.entityId || null,
          entityType: n.entityType || null
        }
      }).select('id').single();
      if (!error && data) {
        // Store DB id so we can update read status later
        const local = NOTIF.history.find(x => x.id === n.id);
        if (local) local.dbId = data.id;
        localStorage.setItem('uh_notif_history', JSON.stringify(NOTIF.history));
      }
    } catch(e) { console.warn('Notif DB persist failed:', e); }
  }

  // ─── Fetch unread from DB (on login) ───
  async function fetchUnreadFromDB() {
    if (!window.sb || !window.SESSION?.userId) return;
    try {
      const { data, error } = await sb.from('notifications')
        .select('*')
        .eq('user_id', window.SESSION.userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return console.warn('Notif fetch error:', error);
      if (!data || data.length === 0) return;

      // Merge with local history (dedupe by dbId)
      const existingDbIds = new Set(NOTIF.history.map(x => x.dbId).filter(Boolean));
      const newOnes = data.filter(d => !existingDbIds.has(d.id)).map(d => ({
        id: Date.now() + Math.random(),
        dbId: d.id,
        type: d.type,
        icon: d.icon || '🔔',
        title: d.title,
        message: d.message,
        page: d.page,
        sub: d.data?.sub,
        entityId: d.data?.entityId || null,
        entityType: d.data?.entityType || null,
        read: false,
        time: d.created_at
      }));
      if (newOnes.length > 0) {
        NOTIF.history = [...newOnes, ...NOTIF.history].slice(0, NOTIF.maxHistory);
        localStorage.setItem('uh_notif_history', JSON.stringify(NOTIF.history));
        updateBadge();
        console.log('🔔 Loaded', newOnes.length, 'unread notifications from DB');
      }
    } catch(e) { console.warn('Notif DB fetch failed:', e); }
  }

  // ─── Mark read in DB ───
  async function markReadDB(dbIds) {
    if (!window.sb || !window.SESSION?.userId || !dbIds?.length) return;
    try {
      await sb.from('notifications')
        .update({ is_read: true })
        .in('id', dbIds);
    } catch(e) { console.warn('Notif markRead failed:', e); }
  }

  // ─── Clear all from DB ───
  async function clearAllDB() {
    if (!window.sb || !window.SESSION?.userId) return;
    try {
      await sb.from('notifications')
        .delete()
        .eq('user_id', window.SESSION.userId);
    } catch(e) { console.warn('Notif clearAll failed:', e); }
  }

  function updateBadge() {
    const unread = NOTIF.history.filter(n => !n.read).length;
    document.querySelectorAll('.notif-bell-badge').forEach(b => {
      if (unread > 0) {
        b.textContent = unread > 99 ? '99+' : unread;
        b.style.display = 'flex';
        b.classList.remove('badge-pop');
        void b.offsetWidth;
        b.classList.add('badge-pop');
      } else {
        b.style.display = 'none';
      }
    });

    // Trigger bell swing animation
    const bellBtns = document.querySelectorAll('.topbar-icon-btn[title*="Notification"], #topbarNotifBtn, #notifBellBtn');
    bellBtns.forEach(btn => {
      btn.classList.remove('bell-ring-active');
      void btn.offsetWidth;
      btn.classList.add('bell-ring-active');
    });
  }

  // ─── Toast ───
  function showToast(n) {
    let c = document.getElementById('notifToastContainer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'notifToastContainer';
      document.body.appendChild(c);
    }
    const t = document.createElement('div');
    t.className = 'notif-toast notif-' + (n.type || 'info');

    // Build quick actions if applicable
    let actionsHtml = '';
    const bkId = n.booking_id || n.entityId || (n.data && n.data.booking_id);
    const phone = n.phone || (n.data && n.data.phone);
    if (bkId) {
      actionsHtml += `<button type="button" class="notif-action-chip" onclick="event.stopPropagation();if(window.openBookingDrawer)window.openBookingDrawer('${bkId}');else navigate('bookings');">View Stay ➔</button>`;
    }
    if (phone) {
      actionsHtml += `<button type="button" class="notif-action-chip wa" onclick="event.stopPropagation();window.open('https://wa.me/91${String(phone).replace(/[^0-9]/g,'').slice(-10)}','_blank');">💬 WhatsApp</button>`;
    } else if (n.page && !bkId) {
      actionsHtml += `<button type="button" class="notif-action-chip outline" onclick="event.stopPropagation();navigate('${n.page}');">Open ➔</button>`;
    }

    t.innerHTML = `
      <div class="notif-icon-wrap">${n.icon || '🔔'}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title || 'Notification'}</div>
        <div class="notif-msg">${n.message || ''}</div>
        ${n.sub ? `<div class="notif-sub">${n.sub}</div>` : ''}
        ${actionsHtml ? `<div class="notif-actions-row">${actionsHtml}</div>` : ''}
      </div>
      <button class="notif-close" title="Dismiss">✕</button>
      <div class="notif-progress-line"></div>
    `;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      t.classList.add('dismissing');
      setTimeout(() => t.remove(), 280);
    };

    t.onclick = e => {
      if (e.target.classList.contains('notif-close') || e.target.closest('.notif-action-chip')) {
        dismiss();
        return;
      }
      if (typeof window.openNotificationTarget === 'function') {
        window.openNotificationTarget(n);
      } else if (n.page && typeof navigate === 'function') {
        try { navigate(n.page); } catch(err) {}
      }
      dismiss();
    };

    setTimeout(dismiss, 6800);
  }

  function notify(cfg) {
    saveHist(cfg);
    showToast(cfg);
    playSound(cfg.sound || cfg.type);
    vibrate([50, 30, 50]);
  }

  // ─── Bell Panel ───
  async function openPanel() {
    // Fetch reminders first
    let overdueRem = [], upcomingRem = [];
    try {
      const now = new Date().toISOString();
      const in24h = new Date(Date.now() + 24*60*60*1000).toISOString();
      
      const [{ data: overdueRaw }, { data: upcomingRaw }] = await Promise.all([
        sb.from('reminders').select('*').eq('is_resolved', false).lt('reminder_time', now).order('reminder_time', { ascending: false }).limit(10),
        sb.from('reminders').select('*').eq('is_resolved', false).gte('reminder_time', now).lte('reminder_time', in24h).order('reminder_time').limit(10)
      ]);
      
      // Get booking names
      const allBkIds = [...new Set([...(overdueRaw||[]), ...(upcomingRaw||[])].map(r => r.booking_id))];
      let bkMap = {};
      if (allBkIds.length > 0) {
        const { data: bks } = await sb.from('guest_register')
          .select('booking_id, guest_name, room_id, phone').in('booking_id', allBkIds);
        (bks || []).forEach(b => bkMap[b.booking_id] = b);
      }
      overdueRem = (overdueRaw || []).map(r => ({ ...r, bk: bkMap[r.booking_id] || {} }));
      upcomingRem = (upcomingRaw || []).map(r => ({ ...r, bk: bkMap[r.booking_id] || {} }));
    } catch(e) { console.error('Reminders fetch error:', e); }
    
    const typeIcon = t => ({ payment: '💰', id: '🪪', checkout: '🚪', custom: '📌' })[t] || '📌';
    const renderRemItem = (r, isOverdue) => {
      const time = new Date(r.reminder_time);
      const timeStr = time.toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
      return `
        <div class="notif-item unread" style="background:${isOverdue ? '#FEE2E2' : '#FEF3C7'};border-left:4px solid ${isOverdue ? '#DC2626' : '#F59E0B'};cursor:pointer;" data-rem-id="${r.id}" data-booking-id="${r.booking_id || ''}">
          <div class="notif-icon">${typeIcon(r.reminder_type)}</div>
          <div class="notif-body">
            <div class="notif-title" style="color:${isOverdue ? '#991B1B' : '#78350F'};">
              ${r.reminder_type.toUpperCase()}${r.amount > 0 ? ' — ₹' + r.amount : ''}
              ${isOverdue ? ' <span style="background:#DC2626;color:#fff;padding:1px 6px;border-radius:8px;font-size:9px;">OVERDUE</span>' : ''}
            </div>
            <div class="notif-msg"><strong>${r.bk.guest_name || 'Unknown'}</strong> — ${r.bk.room_id || '-'}${r.reminder_note ? '<br><em>"' + r.reminder_note + '"</em>' : ''}${(r.assigned_to && r.assigned_to.length > 0) ? '<br>👥 <em>' + r.assigned_to.length + ' assigned</em>' : ''}</div>
            <div class="notif-time">⏰ ${timeStr}</div>
          </div>
        </div>`;
    };
    
    const remHtml = (overdueRem.length + upcomingRem.length) > 0 ? `
      <div style="padding:8px 12px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;font-weight:700;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;">
        📌 Reminders (${overdueRem.length + upcomingRem.length})
      </div>
      ${overdueRem.map(r => renderRemItem(r, true)).join('')}
      ${upcomingRem.map(r => renderRemItem(r, false)).join('')}
      <div style="padding:8px 12px;background:#F9FAFB;border-bottom:1px solid #E5E7EB;font-weight:700;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">
        🔔 Recent Activity
      </div>
    ` : '';
    
    const o = document.createElement('div');
    o.className = 'notif-panel-overlay';
    o.innerHTML = `
      <div class="notif-panel">
        <div class="notif-panel-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <h3 style="margin:0;font-size:16px;font-weight:800;">🔔 Notifications</h3>
            <button type="button" id="notifMuteToggle" title="Toggle sound alerts" style="background:${NOTIF.isMuted ? '#FEE2E2' : '#F1F5F9'};border:1px solid #CBD5E1;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer;color:${NOTIF.isMuted ? '#DC2626' : '#334155'};display:inline-flex;align-items:center;gap:4px;">
              ${NOTIF.isMuted ? '🔇 Muted' : '🔊 Sound ON'}
            </button>
          </div>
          <button class="notif-panel-close">×</button>
        </div>
        <div class="notif-panel-actions">
          <button class="notif-mark-all">Mark all read</button>
          <button class="notif-clear-all">Clear all</button>
          <button onclick="navigate('reminders');this.closest('.notif-panel-overlay').remove();" style="background:#7C3AED;color:#fff;">View All Reminders →</button>
        </div>
        <div class="notif-panel-list">
          ${remHtml}
          ${NOTIF.history.length === 0
            ? (remHtml ? '' : '<div class="notif-empty">No notifications yet</div>')
            : NOTIF.history.map(n => `
              <div class="notif-item ${n.read?'':'unread'}" data-id="${n.id}" data-page="${n.page||''}" data-entity-id="${n.entityId||''}" data-entity-type="${n.entityType||''}">
                <div class="notif-icon">${n.icon}</div>
                <div class="notif-body">
                  <div class="notif-title">${n.title}</div>
                  <div class="notif-msg">${n.message}</div>
                  <div class="notif-time">${timeAgo(n.time)}</div>
                </div>
              </div>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(o);
    
    const close = () => { o.classList.remove('show'); setTimeout(() => o.remove(), 250); };

    // Mute/Unmute sound toggle
    const muteBtn = o.querySelector('#notifMuteToggle');
    if (muteBtn) {
      muteBtn.onclick = (e) => {
        e.stopPropagation();
        NOTIF.isMuted = !NOTIF.isMuted;
        localStorage.setItem('uh_notif_muted', String(NOTIF.isMuted));
        muteBtn.textContent = NOTIF.isMuted ? '🔇 Muted' : '🔊 Sound ON';
        muteBtn.style.background = NOTIF.isMuted ? '#FEE2E2' : '#F1F5F9';
        muteBtn.style.color = NOTIF.isMuted ? '#DC2626' : '#334155';
        if (!NOTIF.isMuted) {
          playSound('info');
        }
      };
    }

    // Reminder item click → open target
    o.querySelectorAll('[data-rem-id]').forEach(el => {
      el.onclick = () => {
        close();
        const remId = el.dataset.remId;
        const bkId = el.dataset.bookingId;
        if (bkId) {
          window.openNotificationTarget({
            page: 'bookings',
            entityId: bkId,
            entityType: 'booking'
          });
        } else {
          window.openNotificationTarget({
            page: 'reminders',
            entityId: remId,
            entityType: 'reminder'
          });
        }
      };
    });
    
    // Regular notification click → navigate to relevant page & open target
    o.querySelectorAll('.notif-item').forEach(el => {
      if (el.dataset.remId) return; // Skip reminders (already handled)
      el.onclick = () => {
        const id = parseFloat(el.dataset.id);
        const n = NOTIF.history.find(x => x.id === id);
        if (n) {
          n.read = true;
          if (n.dbId) markReadDB([n.dbId]);
        }
        localStorage.setItem('uh_notif_history', JSON.stringify(NOTIF.history));
        updateBadge();
        close();
        
        if (n) {
          window.openNotificationTarget(n);
        } else {
          window.openNotificationTarget({
            page: el.dataset.page,
            entityId: el.dataset.entityId,
            entityType: el.dataset.entityType
          });
        }
      };
    });

    setTimeout(() => o.classList.add('show'), 10);
    o.onclick = e => { if (e.target === o) close(); };
    o.querySelector('.notif-panel-close').onclick = close;
    o.querySelector('.notif-mark-all').onclick = () => {
      const dbIds = NOTIF.history.filter(n => !n.read && n.dbId).map(n => n.dbId);
      NOTIF.history.forEach(n => n.read = true);
      localStorage.setItem('uh_notif_history', JSON.stringify(NOTIF.history));
      updateBadge();
      markReadDB(dbIds); // background
      close();
    };
    o.querySelector('.notif-clear-all').onclick = () => {
      NOTIF.history = []; localStorage.removeItem('uh_notif_history');
      updateBadge();
      clearAllDB(); // background
      close();
    };
  }

  function timeAgo(iso) {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (d < 60) return d + 's ago';
    if (d < 3600) return Math.floor(d/60) + 'm ago';
    if (d < 86400) return Math.floor(d/3600) + 'h ago';
    return Math.floor(d/86400) + 'd ago';
  }

  // ─── START/STOP realtime ───
  function stopAll() {
    console.log('🔔 Stopping', NOTIF.channels.length, 'channels');
    NOTIF.channels.forEach(ch => { try { sb.removeChannel(ch); } catch(e){} });
    NOTIF.channels = [];
    NOTIF.started = false;
  }

  function startAll() {
    if (NOTIF.started) {
      console.log('🔔 Already started');
      return true;
    }
    if (!window.sb) {
      console.warn('🔔 sb not ready');
      return false;
    }
    if (!window.SESSION || !window.SESSION.role) {
      console.warn('🔔 SESSION not ready');
      return false;
    }
    if (window.SESSION.investorId) {
      console.log('🔔 Skipping for investor');
      return false;
    }

    console.log('🔔 Starting for role:', window.SESSION.role);
    stopAll();

    // 1. Bookings INSERT
    const c1 = sb.channel('rt-bookings-' + Date.now())
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guest_register' },
        async (payload) => {
          console.log('🔔 New booking event:', payload.new);
          const b = payload.new;
          if (!b || b.is_cancelled || b.booking_mode === 'Offline-Blocked' || b.guest_name === '🔒 Blocked Slot' || String(b.booking_id || '').startsWith('BLK_') || Number(b.total_amount || 0) === 0) {
            return; // Skip dummy block slots from spamming notifications or alerts
          }
          let roomName = b.room_id;
          try {
            const { data: r } = await sb.from('rooms').select('nickname, unit_no').eq('room_id', b.room_id).single();
            if (r) roomName = (r.nickname || '') + (r.unit_no ? ' (' + r.unit_no + ')' : '');
          } catch(e) {}
          const isWeb = b.booked_by === 'Website' || b.booking_mode === 'Direct-Website' || b.verification_status === 'pending';
          notify({
            type: 'booking',
            icon: isWeb ? '🌐' : '📅',
            title: isWeb ? '🌐 New Website Booking!' : 'New Booking!',
            message: (b.guest_name || 'Guest') + ' — ' + roomName,
            sub: 'Check-in: ' + (b.check_in || '-') + ' • ₹' + (b.total_amount || 0) + (isWeb ? ' • Awaiting Approval' : ''),
            page: isWeb ? 'pendingApprovals' : 'bookings',
            sound: 'booking',
            entityId: b.booking_id,
            entityType: 'booking'
          });

          // Fail-safe WhatsApp confirmation pass & group triggers
          if (b && b.phone && typeof window.triggerGuestBookingPass === 'function') {
            window.triggerGuestBookingPass(b).catch(err => console.warn('Realtime booking pass error:', err));
          }
          if (b && typeof window.triggerBookingGroupAlert === 'function') {
            window.triggerBookingGroupAlert(b).catch(err => console.warn('Realtime booking group alert error:', err));
          }
          if (b && typeof window.triggerInvestorBookingAlert === 'function') {
            window.triggerInvestorBookingAlert(b).catch(err => console.warn('Realtime investor alert error:', err));
          }
        })
      .subscribe((s) => console.log('🔔 Bookings channel:', s));

    // 2. Payments INSERT
    const c2 = sb.channel('rt-payments-' + Date.now())
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payment_history' },
        (payload) => {
          console.log('🔔 New payment event:', payload.new);
          const p = payload.new;
          notify({
            type: 'payment', icon: '💰',
            title: 'Payment Received',
            message: '₹' + (p.amount || 0) + ' — ' + (p.payment_mode || 'Payment'),
            sub: p.notes || '',
            page: 'bookings', sound: 'payment',
            entityId: p.booking_id,
            entityType: 'payment'
          });
        })
      .subscribe((s) => console.log('🔔 Payments channel:', s));

    // 3. Tasks INSERT
    const c3 = sb.channel('rt-tasks-' + Date.now())
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'employee_tasks' },
        (payload) => {
          console.log('🔔 New task event:', payload.new);
          const t = payload.new;
          notify({
            type: 'task', icon: '🧰',
            title: 'New Task Assigned',
            message: t.task_description || 'Task',
            sub: t.emp_id || '',
            page: 'tasks', sound: 'task',
              entityId: t.task_id || t.id,
              entityType: 'task'
            });
        })
      .subscribe((s) => console.log('🔔 Tasks channel:', s));

    // 4. Booking UPDATE (checkin/checkout)
    const c4 = sb.channel('rt-updates-' + Date.now())
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'guest_register' },
        (payload) => {
          const o = payload.old, n = payload.new;
          if (!o.check_in_time && n.check_in_time) {
            notify({
              type: 'checkin', icon: '✅',
              title: 'Guest Checked In',
              message: n.guest_name || 'Guest',
              page: 'bookings', sound: 'checkin',
              entityId: n.booking_id,
              entityType: 'booking'
            });
          }
          if (!o.check_out_time && n.check_out_time) {
            notify({
              type: 'checkout', icon: '📤',
              title: 'Guest Checked Out',
              message: n.guest_name || 'Guest',
              page: 'bookings', sound: 'checkout',
              entityId: n.booking_id,
              entityType: 'booking'
            });
          }
        })
      .subscribe((s) => console.log('🔔 Updates channel:', s));

    NOTIF.channels = [c1, c2, c3, c4];
    NOTIF.started = true;
    console.log('🔔 Started', NOTIF.channels.length, 'channels');
    return true;
  }

  // Expose globals
  window.notifications = {
    start: startAll,
    stop: stopAll,
    openPanel: openPanel,
    notify: notify,
    updateBadge: updateBadge,
    history: () => NOTIF.history
  };
  window.notify = notify;
  window.showToast = showToast;

  // Auto-start when session ready
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (window.sb && window.SESSION && window.SESSION.role) {
      clearInterval(timer);
      startAll();
      updateBadge();
      fetchUnreadFromDB(); // ✅ Load persistent notifications on login
    }
    if (tries > 120) {
      clearInterval(timer);
      console.warn('🔔 Never found session');
    }
  }, 500);

  // Debug helpers (only with ?debug in URL)
  if (location.search.includes('debug')) {
    setTimeout(() => {
      const dbg = document.createElement('button');
      dbg.textContent = '🐛 Debug';
      dbg.style.cssText = 'position:fixed;bottom:80px;right:10px;z-index:99999;background:#333;color:#fff;padding:10px;border-radius:8px;border:none;font-size:14px;';
      dbg.onclick = () => {
        const info = {
          sb: !!window.sb,
          session: window.SESSION?.role || 'NO',
          channels_active: NOTIF.channels.length,
          history: NOTIF.history.length,
          started: NOTIF.started
        };
        alert(JSON.stringify(info, null, 2));
        console.table(info);
      };
      document.body.appendChild(dbg);

      const test = document.createElement('button');
      test.textContent = '🔔 Test';
      test.style.cssText = 'position:fixed;bottom:130px;right:10px;z-index:99999;background:#E2725B;color:#fff;padding:10px;border-radius:8px;border:none;font-size:14px;';
      test.onclick = () => notify({
        type: 'booking', icon: '📅',
        title: 'Test', message: 'Test notification',
        sub: 'UI check', page: 'bookings'
      });
      document.body.appendChild(test);
    }, 1000);
  }

  window.addEventListener('beforeunload', stopAll);
})();

// ═══════════════════════════════════════════════════════════
// 🔔 NOTIFICATION SETTINGS (Custom Rules)
// ═══════════════════════════════════════════════════════════
window.notifSettings = (function() {
  const KEY = 'uh_notif_settings';
  const DEFAULT = {
    booking: true,
    payment: true,
    checkin: true,
    checkout: true,
    task: true,
    sound: true,
    vibrate: true
  };

  function get() {
    try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch(e) { return DEFAULT; }
  }

  function save(settings) {
    localStorage.setItem(KEY, JSON.stringify(settings));
  }

  function isEnabled(type) {
    return get()[type] !== false;
  }

  function openSettings() {
    const s = get();
    const overlay = document.createElement('div');
    overlay.className = 'notif-panel-overlay show';
    overlay.innerHTML = `
      <div class="notif-panel" style="max-width:400px;">
        <div class="notif-panel-header">
          <h3>🔔 Notification Settings</h3>
          <button class="notif-panel-close">×</button>
        </div>
        <div style="padding:20px;">
          <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;font-weight:700;">Notify me about</div>
          ${[
            ['booking', '📅', 'New Bookings'],
            ['payment', '💰', 'Payments'],
            ['checkin', '✅', 'Check-ins'],
            ['checkout', '📤', 'Check-outs'],
            ['task', '🧰', 'Tasks']
          ].map(([key, icon, label]) => `
            <label style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #eee;cursor:pointer;">
              <span>${icon} ${label}</span>
              <input type="checkbox" data-setting="${key}" ${s[key] !== false ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;">
            </label>`).join('')}
          <div style="font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:20px 0 12px;font-weight:700;">Feedback</div>
          <label style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #eee;cursor:pointer;">
            <span>🔊 Sound</span>
            <input type="checkbox" data-setting="sound" ${s.sound !== false ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;">
          </label>
          <label style="display:flex;align-items:center;justify-content:space-between;padding:12px;cursor:pointer;">
            <span>📳 Vibrate</span>
            <input type="checkbox" data-setting="vibrate" ${s.vibrate !== false ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;">
          </label>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('input[data-setting]').forEach(input => {
      input.onchange = () => {
        const settings = get();
        settings[input.dataset.setting] = input.checked;
        save(settings);
      };
    });

    const close = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 250);
    };
    overlay.onclick = e => { if (e.target === overlay) close(); };
    overlay.querySelector('.notif-panel-close').onclick = close;
  }

  return { get, save, isEnabled, openSettings };
})();


// ═══════════════════════════════════════════════════════════
// 🎯 OPEN NOTIFICATION TARGET (Smart Auto-Navigate, Highlight & Open)
// ═══════════════════════════════════════════════════════════
window.openNotificationTarget = function(n) {
  if (!n) return;
  const entityId = n.entityId || n.booking_id || n.id;
  let entityType = n.entityType || (n.type === 'payment' ? 'payment' : (n.type === 'task' ? 'task' : (n.type === 'booking' || n.type === 'checkin' || n.type === 'checkout') ? 'booking' : (n.type === 'reminder' ? 'reminder' : null)));
  
  if (!entityType && entityId) {
    if (String(entityId).startsWith('UH') || String(entityId).length >= 8) entityType = 'booking';
  }

  let targetPage = n.page;
  if (!targetPage) {
    if (entityType === 'task') targetPage = 'tasks';
    else if (entityType === 'reminder') targetPage = 'reminders';
    else if (entityType === 'booking' || entityType === 'payment') targetPage = 'bookings';
  }

  console.log('🚀 openNotificationTarget triggered:', { entityId, entityType, targetPage, raw: n });

  // 1. Prepare filter states so target entry is definitely visible
  if (entityType === 'task' && n.date) {
    window._taskMonth = String(n.date).slice(0, 7);
  }

  if ((entityType === 'booking' || entityType === 'payment') && entityId) {
    if (window.SESSION) {
      window.SESSION.bookingSearch = String(entityId);
      window.SESSION.bookingDateFilter = '';
      window.SESSION.bookingDateFrom = '';
      window.SESSION.bookingDateTo = '';
      window.SESSION.bookingPeriod = '';
    }
  }

  // 2. Navigate to target page if needed
  if (targetPage && typeof window.navigate === 'function') {
    try {
      if (window.SESSION?.currentPage !== targetPage) {
        window.navigate(targetPage);
      } else {
        // If already on the same page, re-render to reflect cleared search filters
        if (targetPage === 'bookings' && typeof window.renderManageBookings === 'function') {
          window.renderManageBookings();
        } else if (targetPage === 'tasks' && typeof window.renderEmployeeTasks === 'function') {
          window.renderEmployeeTasks();
        }
      }
    } catch(e) { console.error('Navigation error in openNotificationTarget:', e); }
  }

  // 3. Highlight and open target modal
  if (entityId) {
    // Start highlighting entity
    setTimeout(() => {
      window.highlightEntity(entityId, entityType);
    }, 400);

    // Open corresponding modal/details if applicable
    if (entityType === 'payment') {
      let tries = 0;
      const openPay = () => {
        tries++;
        if (typeof window.showPaymentModal === 'function') {
          window.showPaymentModal(entityId);
        } else if (typeof window.openAddPaymentModal === 'function') {
          window.openAddPaymentModal(entityId);
        } else if (tries < 20) {
          setTimeout(openPay, 200);
        }
      };
      setTimeout(openPay, 600);
    } else if (entityType === 'booking') {
      let tries = 0;
      const openBk = () => {
        tries++;
        if (typeof window.editBooking === 'function') {
          window.editBooking(entityId);
        } else if (tries < 20) {
          setTimeout(openBk, 200);
        }
      };
      setTimeout(openBk, 600);
    } else if (entityType === 'task') {
      let tries = 0;
      const openT = () => {
        tries++;
        if (typeof window.editTask === 'function') {
          window.editTask(entityId);
        } else if (tries < 20) {
          setTimeout(openT, 200);
        }
      };
      setTimeout(openT, 600);
    }
  }
};

// ═══════════════════════════════════════════════════════════
// 🎯 HIGHLIGHT ENTITY (scroll + vibrant pulse animation)
// ═══════════════════════════════════════════════════════════
window.highlightEntity = function(entityId, entityType) {
  console.log('🎯 Attempting to highlight:', entityId, entityType);
  if (!entityId) return;

  const idStr = String(entityId).trim();
  let attempts = 0;
  const maxAttempts = 20; // 20 * 250ms = 5s polling while page renders

  const tryHighlight = () => {
    attempts++;

    // Look for element with matching id/data-attribute
    const selectors = [
      `[data-booking-id="${idStr}"]`,
      `#booking-${idStr}`,
      `tr[data-booking-id="${idStr}"]`,
      `[data-task-id="${idStr}"]`,
      `#task-${idStr}`,
      `#task-date-${idStr}`,
      `[data-reminder-id="${idStr}"]`,
      `#reminder-${idStr}`,
      `[data-id="${idStr}"]`,
      `#row-${idStr}`,
      `#item-${idStr}`
    ];

    let el = null;
    for (const sel of selectors) {
      try {
        el = document.querySelector(sel);
        if (el) break;
      } catch(e) {}
    }

    // Text-based fallback: find row/card containing entityId text
    if (!el) {
      const allElements = document.querySelectorAll('tr, .card, .booking-item, .task-item, .reminder-row, .notif-item');
      for (const e of allElements) {
        if (e.textContent && e.textContent.includes(idStr)) {
          el = e;
          break;
        }
      }
    }

    if (el) {
      // Smooth scroll into view centered
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // CSS Animation
      el.classList.add('uh-highlight-target');

      // Direct fallback styling
      const origBg = el.style.backgroundColor;
      const origTransition = el.style.transition;
      const origOutline = el.style.outline;
      el.style.transition = 'all 0.3s ease';
      el.style.backgroundColor = '#FEF3C7';
      el.style.outline = '3px solid #F59E0B';

      let pulses = 0;
      const pulse = () => {
        pulses++;
        if (pulses > 8) {
          el.style.backgroundColor = origBg;
          el.style.outline = origOutline;
          el.style.transition = origTransition;
          el.classList.remove('uh-highlight-target');
          return;
        }
        el.style.backgroundColor = pulses % 2 === 0 ? '#FEF3C7' : '#FDE68A';
        el.style.outline = pulses % 2 === 0 ? '3px solid #F59E0B' : '3px solid #D97706';
        setTimeout(pulse, 350);
      };
      pulse();

      console.log('🎯 Successfully highlighted entity:', idStr);
    } else if (attempts < maxAttempts) {
      setTimeout(tryHighlight, 250);
    } else {
      console.warn('⚠️ Entity not found for highlight after ' + maxAttempts + ' attempts:', idStr);
    }
  };

  tryHighlight();
};

