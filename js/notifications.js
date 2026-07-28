// ═══════════════════════════════════════════════════════════
// 🔔 REAL-TIME NOTIFICATIONS - Clean version
// ═══════════════════════════════════════════════════════════

(function() {
  const NOTIF = {
    channels: [],
    history: JSON.parse(localStorage.getItem('uh_notif_history') || '[]'),
    maxHistory: 50,
    started: false
  };

  // ─── Sound ───
  function playSound(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const tones = {
        booking: [523, 659, 784], payment: [659, 784, 988],
        checkin: [440, 554], checkout: [554, 440],
        task: [349, 440], info: [440]
      };
      const notes = tones[type] || tones.info;
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = 'sine'; o.frequency.value = freq;
          g.gain.setValueAtTime(0.15, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          o.start(); o.stop(ctx.currentTime + 0.15);
        }, i * 120);
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
        data: n.sub ? { sub: n.sub } : null
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
      } else {
        b.style.display = 'none';
      }
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
    t.className = 'notif-toast notif-' + n.type;
    t.innerHTML = `
      <div class="notif-icon">${n.icon}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.message}</div>
        ${n.sub ? `<div class="notif-sub">${n.sub}</div>` : ''}
      </div>
      <button class="notif-close">×</button>`;
    c.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);

    const dismiss = () => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    };
    t.onclick = e => {
      if (e.target.classList.contains('notif-close')) { dismiss(); return; }
      if (n.page && typeof navigate === 'function') try { navigate(n.page); } catch(e) {}
      dismiss();
    };
    setTimeout(dismiss, 6000);
  }

  function notify(cfg) {
    saveHist(cfg);
    showToast(cfg);
    playSound(cfg.sound || cfg.type);
    vibrate([50, 30, 50]);
  }

  // ─── Bell Panel ───
  function openPanel() {
    const o = document.createElement('div');
    o.className = 'notif-panel-overlay';
    o.innerHTML = `
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
          ${NOTIF.history.length === 0
            ? '<div class="notif-empty">No notifications yet</div>'
            : NOTIF.history.map(n => `
              <div class="notif-item ${n.read?'':'unread'}" data-id="${n.id}" data-page="${n.page||''}">
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
    setTimeout(() => o.classList.add('show'), 10);
    const close = () => { o.classList.remove('show'); setTimeout(() => o.remove(), 250); };
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
    o.querySelectorAll('.notif-item').forEach(item => {
      item.onclick = () => {
        const id = parseFloat(item.dataset.id);
        const n = NOTIF.history.find(x => x.id === id);
        if (n) {
          n.read = true;
          if (n.dbId) markReadDB([n.dbId]); // background
        }
        localStorage.setItem('uh_notif_history', JSON.stringify(NOTIF.history));
        updateBadge();
        const p = item.dataset.page;
        if (p && typeof navigate === 'function') try { navigate(p); } catch(e) {}
        close();
      };
    });
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
          let roomName = b.room_id;
          try {
            const { data: r } = await sb.from('rooms').select('nickname, unit_no').eq('room_id', b.room_id).single();
            if (r) roomName = (r.nickname || '') + (r.unit_no ? ' (' + r.unit_no + ')' : '');
          } catch(e) {}
          notify({
            type: 'booking', icon: '📅',
            title: 'New Booking!',
            message: (b.guest_name || 'Guest') + ' — ' + roomName,
            sub: 'Check-in: ' + (b.check_in || '-') + ' • ₹' + (b.total_amount || 0),
            page: 'bookings'
          });
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
            page: 'bookings', sound: 'payment'
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
            page: 'tasks', sound: 'task'
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
              page: 'bookings', sound: 'checkin'
            });
          }
          if (!o.check_out_time && n.check_out_time) {
            notify({
              type: 'checkout', icon: '📤',
              title: 'Guest Checked Out',
              message: n.guest_name || 'Guest',
              page: 'bookings', sound: 'checkout'
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
