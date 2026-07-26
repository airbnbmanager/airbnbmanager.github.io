// ═══════════════════════════════════════════════════════════
// 🔔 REAL-TIME NOTIFICATIONS SYSTEM (Supabase Realtime)
// Handles: new bookings, payments, check-ins, check-outs, tasks
// ═══════════════════════════════════════════════════════════

(function() {
  const NOTIFICATIONS = {
    channels: [],
    unreadCount: 0,
    history: JSON.parse(localStorage.getItem('uh_notif_history') || '[]'),
    maxHistory: 50,
    startupTime: Date.now()
  };

  // ─── Notification Sound (built-in beep) ───
  function playSound(type = 'info') {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Different tones for different types
      const tones = {
        booking: [523, 659, 784],  // C-E-G chord (happy)
        payment: [659, 784, 988],  // E-G-B (cash)
        checkin: [440, 554],        // A-C#
        checkout: [554, 440],       // C#-A
        task: [349, 440],           // F-A
        info: [440]
      };
      const notes = tones[type] || tones.info;

      notes.forEach((freq, i) => {
        setTimeout(() => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'sine';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.15, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          o.start();
          o.stop(ctx.currentTime + 0.15);
        }, i * 120);
      });
    } catch(e) { console.warn('Sound failed:', e); }
  }

  function vibrate(pattern) {
    try { navigator.vibrate && navigator.vibrate(pattern); } catch(e) {}
  }

  // ─── Save to history ───
  function saveToHistory(notif) {
    NOTIFICATIONS.history.unshift({
      ...notif,
      id: Date.now() + Math.random(),
      read: false,
      time: new Date().toISOString()
    });
    if (NOTIFICATIONS.history.length > NOTIFICATIONS.maxHistory) {
      NOTIFICATIONS.history = NOTIFICATIONS.history.slice(0, NOTIFICATIONS.maxHistory);
    }
    localStorage.setItem('uh_notif_history', JSON.stringify(NOTIFICATIONS.history));
    updateBellBadge();
  }

  // ─── Show notification toast (top-right slide-in) ───
  function showToast(notif) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = 'notif-toast notif-' + notif.type;
    toast.innerHTML = `
      <div class="notif-icon">${notif.icon}</div>
      <div class="notif-body">
        <div class="notif-title">${notif.title}</div>
        <div class="notif-msg">${notif.message}</div>
        ${notif.sub ? `<div class="notif-sub">${notif.sub}</div>` : ''}
      </div>
      <button class="notif-close">×</button>
    `;
    container.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);

    // Click to navigate
    toast.onclick = (e) => {
      if (e.target.classList.contains('notif-close')) {
        dismiss();
        return;
      }
      if (notif.page && typeof navigate === 'function') {
        try { navigate(notif.page); } catch(e) {}
      }
      dismiss();
    };

    function dismiss() {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }

    // Auto-dismiss after 6 seconds
    setTimeout(dismiss, 6000);
  }

  function getToastContainer() {
    let c = document.getElementById('notifToastContainer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'notifToastContainer';
      document.body.appendChild(c);
    }
    return c;
  }

  // ─── Bell badge update ───
  function updateBellBadge() {
    const unread = NOTIFICATIONS.history.filter(n => !n.read).length;
    NOTIFICATIONS.unreadCount = unread;
    document.querySelectorAll('.notif-bell-badge').forEach(b => {
      if (unread > 0) {
        b.textContent = unread > 99 ? '99+' : unread;
        b.style.display = 'flex';
      } else {
        b.style.display = 'none';
      }
    });
  }

  // ─── Main notification handler ───
  function notify(config) {
    // config: { type, icon, title, message, sub, page, sound }
    saveToHistory(config);
    showToast(config);
    playSound(config.sound || config.type);
    vibrate([50, 30, 50]);
  }

  // ─── Bell panel (notification history) ───
  function openBellPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'notif-panel-overlay';
    overlay.innerHTML = `
      <div class="notif-panel">
        <div class="notif-panel-header">
          <h3>🔔 Notifications</h3>
          <button class="notif-panel-close">×</button>
        </div>
        <div class="notif-panel-actions">
          <button class="notif-mark-all">Mark all read</button>
          <button class="notif-clear-all">Clear all</button>
        </div>
        <div class="notif-panel-list">
          ${NOTIFICATIONS.history.length === 0
            ? '<div class="notif-empty">No notifications yet</div>'
            : NOTIFICATIONS.history.map(n => `
              <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}" data-page="${n.page || ''}">
                <div class="notif-icon">${n.icon}</div>
                <div class="notif-body">
                  <div class="notif-title">${n.title}</div>
                  <div class="notif-msg">${n.message}</div>
                  <div class="notif-time">${timeAgo(n.time)}</div>
                </div>
              </div>`).join('')
          }
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => overlay.classList.add('show'), 10);

    const close = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 250);
    };

    overlay.onclick = e => { if (e.target === overlay) close(); };
    overlay.querySelector('.notif-panel-close').onclick = close;

    overlay.querySelector('.notif-mark-all').onclick = () => {
      NOTIFICATIONS.history.forEach(n => n.read = true);
      localStorage.setItem('uh_notif_history', JSON.stringify(NOTIFICATIONS.history));
      updateBellBadge();
      close();
    };

    overlay.querySelector('.notif-clear-all').onclick = () => {
      NOTIFICATIONS.history = [];
      localStorage.removeItem('uh_notif_history');
      updateBellBadge();
      close();
    };

    overlay.querySelectorAll('.notif-item').forEach(item => {
      item.onclick = () => {
        const id = parseFloat(item.dataset.id);
        const n = NOTIFICATIONS.history.find(x => x.id === id);
        if (n) n.read = true;
        localStorage.setItem('uh_notif_history', JSON.stringify(NOTIFICATIONS.history));
        updateBellBadge();
        const page = item.dataset.page;
        if (page && typeof navigate === 'function') {
          try { navigate(page); } catch(e) {}
        }
        close();
      };
    });
  }

  function timeAgo(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  // ─── Subscribe to Supabase Realtime ───
  function startRealtime() {
    if (!window.sb || !window.SESSION || !window.SESSION.role) return;

    // Skip for investor role (not needed)
    if (window.SESSION.investorId) return;

    // Cleanup any existing
    stopRealtime();

    // 1. New Bookings
    const bookingChannel = sb.channel('notif-bookings')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guest_register' },
        async (payload) => {
          const b = payload.new;
          // Skip if this booking existed before app opened
          if (new Date(b.created_at || 0).getTime() < NOTIFICATIONS.startupTime - 5000) return;

          // Fetch room name
          let roomName = b.room_id;
          try {
            const { data: r } = await sb.from('rooms')
              .select('nickname, unit_no')
              .eq('room_id', b.room_id)
              .single();
            if (r) roomName = (r.nickname || '') + (r.unit_no ? ' (' + r.unit_no + ')' : '');
          } catch(e) {}

          notify({
            type: 'booking',
            icon: '📅',
            title: 'New Booking!',
            message: `${b.guest_name || 'Guest'} — ${roomName}`,
            sub: `Check-in: ${b.check_in || '-'} • ₹${b.total_amount || 0}`,
            page: 'bookings'
          });
        })
      .subscribe();

    // 2. New Payments
    const paymentChannel = sb.channel('notif-payments')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payment_history' },
        (payload) => {
          const p = payload.new;
          if (new Date(p.created_at || 0).getTime() < NOTIFICATIONS.startupTime - 5000) return;
          notify({
            type: 'payment',
            icon: '💰',
            title: 'Payment Received',
            message: `₹${p.amount || 0} — ${p.mode || 'Payment'}`,
            sub: p.guest_name || p.notes || '',
            page: 'bookings',
            sound: 'payment'
          });
        })
      .subscribe();

    // 3. New Tasks
    const taskChannel = sb.channel('notif-tasks')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'employee_tasks' },
        (payload) => {
          const t = payload.new;
          if (new Date(t.created_at || 0).getTime() < NOTIFICATIONS.startupTime - 5000) return;
          notify({
            type: 'task',
            icon: '🧰',
            title: 'New Task Assigned',
            message: t.task_title || t.description || 'Task',
            sub: t.assigned_to || '',
            page: 'tasks',
            sound: 'task'
          });
        })
      .subscribe();

    // 4. Booking updates (check-in/out)
    const bookingUpdateChannel = sb.channel('notif-booking-updates')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'guest_register' },
        async (payload) => {
          const oldB = payload.old;
          const newB = payload.new;

          // Detect check-in
          if (!oldB.actual_checkin && newB.actual_checkin) {
            notify({
              type: 'checkin',
              icon: '✅',
              title: 'Guest Checked In',
              message: newB.guest_name || 'Guest',
              page: 'bookings',
              sound: 'checkin'
            });
          }
          // Detect check-out
          if (!oldB.actual_checkout && newB.actual_checkout) {
            notify({
              type: 'checkout',
              icon: '📤',
              title: 'Guest Checked Out',
              message: newB.guest_name || 'Guest',
              page: 'bookings',
              sound: 'checkout'
            });
          }
        })
      .subscribe();

    NOTIFICATIONS.channels = [bookingChannel, paymentChannel, taskChannel, bookingUpdateChannel];
    console.log('🔔 Realtime notifications: ACTIVE');
  }

  function stopRealtime() {
    NOTIFICATIONS.channels.forEach(ch => {
      try { sb.removeChannel(ch); } catch(e) {}
    });
    NOTIFICATIONS.channels = [];
  }

  // Expose globals
  window.notifications = {
    start: startRealtime,
    stop: stopRealtime,
    openPanel: openBellPanel,
    notify: notify,
    updateBadge: updateBellBadge,
    history: () => NOTIFICATIONS.history
  };

  // Auto-start when session becomes available
  const startCheck = setInterval(() => {
    if (window.SESSION && window.SESSION.role && window.sb) {
      clearInterval(startCheck);
      startRealtime();
      updateBellBadge();
    }
  }, 500);

  // Cleanup on unload
  window.addEventListener('beforeunload', stopRealtime);
})();
