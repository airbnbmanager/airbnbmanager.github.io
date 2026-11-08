/**
 * 🔔 USER AUDIT & REAL-TIME LOGIN NOTIFICATION SYSTEM
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED
 * Developer: Praveen Singh
 * 
 * Features:
 * 1. Real-time Login Alerts to Praveen (Developer) when any user logs in
 * 2. Per-User Page Visit History (which pages, timestamps, durations)
 * 3. Monthly Login Audit (days logged in, total hours online, average daily activity)
 * 4. Beautiful Audit Modal in User Management
 */

(function() {
  'use strict';

  function isDeveloperRecipient() {
    if (typeof window.isDeveloperUser === 'function') {
      return window.isDeveloperUser(window.SESSION?.userId, window.SESSION?.email, window.SESSION?.displayName, window.SESSION?.role);
    }
    return window.SESSION?.role === 'developer';
  }

  // ═════════════════════════════════════════════════════════════
  // 1. SOUND & AUDIO ALERT (Web Audio API Chime)
  // ═════════════════════════════════════════════════════════════
  function playLoginChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      // Pleasant dual tone: 587.33Hz (D5) -> 880Hz (A5)
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch(e) {
      // Audio autoplay policy might block before first click, safe ignore
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 2. DEVELOPER LOGIN ALERT SYSTEM
  // ═════════════════════════════════════════════════════════════
  window.DevLoginAlert = {
    _lastPolledAlertTime: localStorage.getItem('uh_last_dev_alert_ts') || new Date().toISOString(),
    _seenAlertIds: new Set(JSON.parse(sessionStorage.getItem('uh_seen_alert_ids') || '[]')),

    // Called whenever ANY user logs in (ANY role: admin, owner, manager, staff, cleaner, developer, subowner, etc.)
    async notifyDevOnLogin(userId, displayName, role, email) {
      if (!userId) return;

      const now = new Date();
      const alertId = `login_${userId}_${now.getTime()}`;
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const isMobile = /Android|iPhone|iPad|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceStr = isMobile ? '📱 Mobile' : '💻 Desktop';

      const alertObj = {
        id: alertId,
        type: 'user_login',
        user_id: userId,
        user_name: displayName || email || 'Staff User',
        user_role: role || 'staff',
        user_email: email || '',
        device: deviceStr,
        timestamp: now.toISOString(),
        time_label: `${dateStr} at ${timeStr}`,
        read: false
      };

      // 1. Same-browser instant broadcast (0ms across tabs in same browser)
      try {
        if (window.BroadcastChannel) {
          const bc = new BroadcastChannel('tuhh_login_channel');
          bc.postMessage({ type: 'NEW_LOGIN', alert: alertObj });
        }
      } catch(e) {}

      // 2. LocalStorage storage event
      try {
        localStorage.setItem('uh_latest_login_alert', JSON.stringify(alertObj));
      } catch(e) {}

      // 3. Central Supabase app_settings (syncs to Developer group across any phone/laptop/iPad)
      try {
        if (window.sb) {
          const { data: rows } = await window.sb.from('app_settings')
            .select('value')
            .eq('key', 'dev_login_alerts')
            .limit(1);

          let alertsList = [];
          if (rows?.[0]?.value) {
            try { alertsList = JSON.parse(rows[0].value); } catch(e) {}
          }
          alertsList.unshift(alertObj);
          if (alertsList.length > 250) alertsList = alertsList.slice(0, 250);

          await window.sb.from('app_settings').upsert({
            key: 'dev_login_alerts',
            value: JSON.stringify(alertsList),
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
        }
      } catch(e) {
        console.warn('Could not sync login alert to Supabase:', e);
      }

      // 4. Also update local activity log
      try {
        const local = JSON.parse(localStorage.getItem('uh_user_activity_logs') || '{}');
        const today = now.toISOString().slice(0, 10);
        if (!local[today]) local[today] = {};
        if (!local[today][userId]) {
          local[today][userId] = {
            userId, displayName, role,
            logDate: today, loginCount: 1, activeSeconds: 60,
            firstLoginAt: now.toISOString(), lastActiveAt: now.toISOString()
          };
        } else {
          local[today][userId].loginCount = (local[today][userId].loginCount || 1) + 1;
          local[today][userId].lastActiveAt = now.toISOString();
        }
        localStorage.setItem('uh_user_activity_logs', JSON.stringify(local));
      } catch(e) {}
    },

    // Polled by Developer's device every 10-12s (Strictly Developer Group Only)
    async pollNewAlertsForDev() {
      if (!isDeveloperRecipient()) return;

      try {
        if (!window.sb) return;
        const { data: rows } = await window.sb.from('app_settings')
          .select('value')
          .eq('key', 'dev_login_alerts')
          .limit(1);

        if (!rows?.[0]?.value) return;
        const alertsList = JSON.parse(rows[0].value);
        if (!Array.isArray(alertsList) || !alertsList.length) return;

        // Check for unseen alerts from the last 20 minutes
        const curUid = window.SESSION?.userId;
        const freshAlerts = alertsList.filter(a => {
          if (this._seenAlertIds.has(a.id)) return false;
          const alertAgeMs = Date.now() - new Date(a.timestamp).getTime();
          return alertAgeMs < 20 * 60 * 1000;
        });

        if (freshAlerts.length > 0) {
          // Suppress audio chime & toast for the current session's own initial login
          const alertToShow = freshAlerts.find(a => a.user_id !== curUid) || freshAlerts[0];
          const isOwnRecentLogin = freshAlerts.every(a => a.user_id === curUid);

          if (!isOwnRecentLogin) {
            playLoginChime();
            this.showFloatingToast(alertToShow);
          }

          freshAlerts.forEach(a => this._seenAlertIds.add(a.id));
          sessionStorage.setItem('uh_seen_alert_ids', JSON.stringify(Array.from(this._seenAlertIds)));
          this.updateBellBadge(freshAlerts.length);
        }
      } catch(e) {}
    },

    showFloatingToast(alert) {
      const old = document.getElementById('devLoginToastBanner');
      if (old) old.remove();

      const toast = document.createElement('div');
      toast.id = 'devLoginToastBanner';
      toast.style.cssText = `
        position: fixed;
        top: 68px;
        right: 18px;
        z-index: 999999;
        background: #0F172A;
        color: #FFFFFF;
        border-radius: 14px;
        padding: 12px 16px;
        box-shadow: 0 12px 35px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 420px;
        animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;

      const roleBadges = {
        owner: '👑 Owner',
        admin: '🛡️ Admin',
        manager: '💼 Manager',
        booking_staff: '📅 Staff',
        caretaker: '🔑 Caretaker',
        cleaner: '🧹 Cleaner'
      };
      const badgeText = roleBadges[alert.user_role] || alert.user_role || 'Staff';

      toast.innerHTML = `
        <div style="width:38px;height:38px;border-radius:50%;background:#10B981;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:0 0 12px rgba(16,185,129,0.5);">
          🟢
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.5px;">User Login Detected</div>
          <div style="font-size:14px;font-weight:800;color:#FFFFFF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${alert.user_name} <span style="background:#334155;color:#E2E8F0;font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;">${badgeText}</span>
            <span style="background:#1E293B;color:#38BDF8;font-size:10px;padding:1px 6px;border-radius:4px;font-weight:700;">${alert.device || '💻 Desktop'}</span>
          </div>
          <div style="font-size:11.5px;color:#CBD5E1;margin-top:2px;">Logged in at ${alert.time_label || 'Just now'}</div>
        </div>
        <button onclick="window.openUserAuditModal('${alert.user_id}','${(alert.user_name||'').replace(/'/g, "\\'")}', '${alert.user_role}');document.getElementById('devLoginToastBanner')?.remove();"
          style="background:#0284C7;color:#fff;border:none;border-radius:8px;padding:6px 10px;font-size:11px;font-weight:800;cursor:pointer;flex-shrink:0;">
          📊 Audit
        </button>
        <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:#94A3B8;font-size:14px;cursor:pointer;padding:2px 4px;margin-left:2px;">✕</button>
      `;

      document.body.appendChild(toast);

      // Auto dismiss after 10s
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.opacity = '0';
          toast.style.transition = 'opacity 0.4s';
          setTimeout(() => toast.remove(), 400);
        }
      }, 10000);
    },

    updateBellBadge(count) {
      const bellBadges = document.querySelectorAll('.notif-bell-badge, #notifBadge, #topbarNotifBadge');
      bellBadges.forEach(badge => {
        badge.textContent = String(count || 1);
        badge.style.display = 'inline-flex';
        badge.style.background = '#EF4444';
        badge.style.color = '#FFFFFF';
      });
    },

    async fetchAlerts(limit) {
      limit = limit || 60;
      try {
        if (window.sb) {
          const { data: rows } = await window.sb.from('app_settings')
            .select('value')
            .eq('key', 'dev_login_alerts')
            .limit(1);
          if (rows?.[0]?.value) {
            const list = JSON.parse(rows[0].value);
            return list.slice(0, limit);
          }
        }
      } catch(e) {}
      return [];
    },

    async markAllRead() {
      try {
        if (window.sb) {
          const { data: rows } = await window.sb.from('app_settings').select('value').eq('key', 'dev_login_alerts').limit(1);
          if (rows?.[0]?.value) {
            let list = JSON.parse(rows[0].value);
            list = list.map(a => ({ ...a, read: true }));
            await window.sb.from('app_settings').upsert({ key: 'dev_login_alerts', value: JSON.stringify(list) }, { onConflict: 'key' });
          }
        }
      } catch(e) {}
      const badges = document.querySelectorAll('.notif-bell-badge, #notifBadge, #topbarNotifBadge');
      badges.forEach(b => { b.style.display = 'none'; });
    }
  };

  // ═════════════════════════════════════════════════════════════
  // 3. PER-USER PAGE AUDIT SYSTEM
  // ═════════════════════════════════════════════════════════════
  // 3. PER-USER PAGE AUDIT SYSTEM
  // ═════════════════════════════════════════════════════════════
  window.UserPageAudit = {
    _buffer: [],
    _timer: null,

    trackVisit(userId, displayName, role, page) {
      if (!userId || !page) return;
      page = String(page).trim().toLowerCase();
      if (!page) return;

      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const curMonth = today.slice(0, 7);
      const isMobile = /Android|iPhone|iPad|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      const entry = {
        userId: String(userId),
        displayName: displayName || 'User',
        role: role || 'staff',
        page,
        device: isMobile ? '📱 Mobile' : '💻 Desktop',
        timestamp: now.toISOString(),
        date: today,
        month: curMonth
      };

      // 1. Save locally per user
      try {
        const key = `uh_audit_pages_${userId}_${curMonth}`;
        const local = JSON.parse(localStorage.getItem(key) || '[]');
        const last = local[local.length - 1];
        // Ignore same page clicks within 2 seconds
        if (!last || last.page !== page || (now.getTime() - new Date(last.timestamp).getTime() > 2000)) {
          local.push(entry);
          if (local.length > 800) local.splice(0, local.length - 800);
          localStorage.setItem(key, JSON.stringify(local));
        }
      } catch(e) {}

      // 2. Buffer & flush quickly to central app_settings
      this._buffer.push(entry);
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(() => this._flush(), 600);
    },

    async _flush() {
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
      if (!this._buffer.length || !window.sb) return;
      const batch = this._buffer.splice(0);
      const curMonth = new Date().toISOString().slice(0, 7);
      const key = `uh_audit_visits_${curMonth}`;

      try {
        const { data: rows } = await window.sb.from('app_settings').select('value').eq('key', key).limit(1);
        let list = [];
        if (rows?.[0]?.value) {
          try { list = JSON.parse(rows[0].value); } catch(e) {}
        }
        list.push(...batch);
        if (list.length > 3000) list = list.slice(-3000); // keep recent 3000
        await window.sb.from('app_settings').upsert({
          key,
          value: JSON.stringify(list),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      } catch(e) {
        console.warn('UserPageAudit _flush warning:', e);
        // Put unwritten batch back in buffer
        this._buffer.unshift(...batch);
      }
    },

    async getVisitsForUser(userId, displayName, monthStr) {
      let remoteVisits = [];
      // 1. Central app_settings
      try {
        if (window.sb) {
          const key = `uh_audit_visits_${monthStr}`;
          const { data: rows } = await window.sb.from('app_settings').select('value').eq('key', key).limit(1);
          if (rows?.[0]?.value) {
            const list = JSON.parse(rows[0].value);
            const targetId = (userId || '').toLowerCase();
            const targetName = (displayName || '').trim().toLowerCase();
            remoteVisits = list.filter(v => {
              const vId = (v.userId || '').toLowerCase();
              const vName = (v.displayName || '').trim().toLowerCase();
              return (targetId && vId === targetId) || (targetName && vName === targetName);
            });
          }
        }
      } catch(e) {}

      // 2. LocalStorage visits
      let localVisits = [];
      try {
        const key = `uh_audit_pages_${userId}_${monthStr}`;
        localVisits = JSON.parse(localStorage.getItem(key) || '[]');
      } catch(e) {}

      // 3. Merge and deduplicate by timestamp + page
      const visitMap = new Map();
      [...remoteVisits, ...localVisits].forEach(v => {
        const dedupKey = `${v.timestamp}_${v.page}`;
        if (!visitMap.has(dedupKey)) {
          visitMap.set(dedupKey, v);
        }
      });
      return Array.from(visitMap.values()).sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    }
  };

  // Synchronous flush on page exit/refresh
  window.addEventListener('beforeunload', () => {
    if (window.UserPageAudit?._buffer?.length) {
      window.UserPageAudit._flush();
    }
  });

  // ═════════════════════════════════════════════════════════════
  // 4. MONTHLY USER AUDIT MODAL (Developer Group Only)
  // ═════════════════════════════════════════════════════════════
  window.openUserAuditModal = async function(userId, displayName, role) {
    if (!isDeveloperRecipient()) {
      alert('🔒 Access Restricted: User Activity Audit & Intelligence is strictly reserved for the Developer group.');
      return;
    }

    const existing = document.getElementById('userAuditModalOverlay');
    if (existing) existing.remove();

    // Flush any pending in-memory visits to Supabase immediately so modal has up-to-the-second data!
    if (window.UserPageAudit && typeof window.UserPageAudit._flush === 'function') {
      try { await window.UserPageAudit._flush(); } catch(e) {}
    }

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // e.g. "2026-11"

    const overlay = document.createElement('div');
    overlay.id = 'userAuditModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px); z-index: 999999;
      display: flex; align-items: center; justify-content: center; padding: 16px;
    `;
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `
      <div style="background:#FFFFFF;border-radius:20px;width:100%;max-width:740px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 60px rgba(0,0,0,0.35);overflow:hidden;">
        <!-- Header -->
        <div style="padding:18px 24px;border-bottom:1px solid #E2E8F0;display:flex;align-items:center;justify-content:space-between;background:#F8FAFC;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:44px;height:44px;border-radius:50%;background:#0284C7;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;">
              ${(displayName || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-size:18px;font-weight:900;color:#0F172A;display:flex;align-items:center;gap:8px;">
                ${escapeHtml(displayName || 'User')}
                <span style="background:#E2E8F0;color:#334155;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;">${role || 'Staff'}</span>
              </div>
              <div style="font-size:12px;color:#64748B;margin-top:2px;">User Audit & Activity Intelligence</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <select id="auditMonthSelector" style="padding:6px 12px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:13px;font-weight:700;color:#0F172A;background:#FFFFFF;">
              <option value="2026-11" selected>November 2026</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-09">September 2026</option>
            </select>
            <button onclick="document.getElementById('userAuditModalOverlay').remove()" style="background:#E2E8F0;border:none;border-radius:50%;width:32px;height:32px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#475569;">✕</button>
          </div>
        </div>

        <!-- Body -->
        <div id="userAuditModalBody" style="padding:20px 24px;overflow-y:auto;flex:1;">
          <div style="text-align:center;padding:40px;color:#64748B;">⏳ Loading comprehensive user audit...</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Initial load
    await loadAuditData(userId, displayName, currentMonth);

    // Month change handler
    document.getElementById('auditMonthSelector').onchange = async function() {
      await loadAuditData(userId, displayName, this.value);
    };
  };

  async function loadAuditData(userId, displayName, monthStr) {
    const bodyEl = document.getElementById('userAuditModalBody');
    if (!bodyEl) return;
    bodyEl.innerHTML = `<div style="text-align:center;padding:40px;color:#64748B;">⏳ Loading data for ${monthStr}...</div>`;

    const dailyMap = {}; // Key: "YYYY-MM-DD" -> Record
    const targetUid = (userId || '').toLowerCase();
    const targetName = (displayName || '').trim().toLowerCase();

    // 1. Fetch daily activity logs from Supabase table if available
    try {
      if (window.sb) {
        const { data } = await window.sb.from('user_activity_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('log_date', `${monthStr}-01`)
          .lte('log_date', `${monthStr}-31`)
          .order('log_date', { ascending: false });
        if (data && data.length) {
          data.forEach(d => {
            dailyMap[d.log_date] = {
              log_date: d.log_date,
              login_count: d.login_count || 1,
              active_seconds: d.active_seconds || 0,
              first_login_at: d.first_login_at,
              last_active_at: d.last_active_at
            };
          });
        }
      }
    } catch(e) {}

    // 2. Fetch from Supabase app_settings (user_daily_activity_logs) — CENTRAL SYNC STORE
    try {
      if (window.sb) {
        const { data: setRows } = await window.sb.from('app_settings')
          .select('value')
          .eq('key', 'user_daily_activity_logs')
          .limit(1);

        if (setRows?.[0]?.value) {
          const remoteMap = JSON.parse(setRows[0].value);
          Object.keys(remoteMap).forEach(date => {
            if (date.startsWith(monthStr)) {
              const dayEntries = remoteMap[date] || {};
              // Match by userId or displayName
              Object.values(dayEntries).forEach(r => {
                const rUid = (r.userId || '').toLowerCase();
                const rName = (r.displayName || '').trim().toLowerCase();
                if ((targetUid && rUid === targetUid) || (targetName && rName === targetName)) {
                  const prev = dailyMap[date] || {};
                  dailyMap[date] = {
                    log_date: date,
                    login_count: Math.max(prev.login_count || 0, r.loginCount || r.login_count || 1),
                    active_seconds: Math.max(prev.active_seconds || 0, r.activeSeconds || r.active_seconds || 0),
                    first_login_at: prev.first_login_at || r.firstLoginAt || r.first_login_at,
                    last_active_at: r.lastActiveAt || r.last_active_at || prev.last_active_at
                  };
                }
              });
            }
          });
        }
      }
    } catch(e) {}

    // 3. Cross-reference dev_login_alerts from Supabase app_settings (every logged alert)
    try {
      if (window.sb) {
        const { data: alertRows } = await window.sb.from('app_settings')
          .select('value')
          .eq('key', 'dev_login_alerts')
          .limit(1);

        if (alertRows?.[0]?.value) {
          const alertList = JSON.parse(alertRows[0].value);
          if (Array.isArray(alertList)) {
            alertList.forEach(a => {
              const aUid = (a.user_id || '').toLowerCase();
              const aName = (a.user_name || '').trim().toLowerCase();
              if ((targetUid && aUid === targetUid) || (targetName && aName === targetName)) {
                const d = (a.timestamp || '').slice(0, 10);
                if (d && d.startsWith(monthStr)) {
                  const prev = dailyMap[d] || {};
                  dailyMap[d] = {
                    log_date: d,
                    login_count: (prev.login_count || 0) + 1,
                    active_seconds: Math.max(prev.active_seconds || 0, 180),
                    first_login_at: prev.first_login_at || a.timestamp,
                    last_active_at: a.timestamp || prev.last_active_at
                  };
                }
              }
            });
          }
        }
      }
    } catch(e) {}

    // 4. Fallback to localStorage activity logs (for current device)
    try {
      const local = JSON.parse(localStorage.getItem('uh_user_activity_logs') || '{}');
      Object.keys(local).forEach(date => {
        if (date.startsWith(monthStr)) {
          const dayEntries = local[date] || {};
          Object.values(dayEntries).forEach(r => {
            const rUid = (r.userId || '').toLowerCase();
            const rName = (r.displayName || '').trim().toLowerCase();
            if ((targetUid && rUid === targetUid) || (targetName && rName === targetName)) {
              const prev = dailyMap[date] || {};
              dailyMap[date] = {
                log_date: date,
                login_count: Math.max(prev.login_count || 0, r.loginCount || 1),
                active_seconds: Math.max(prev.active_seconds || 0, r.activeSeconds || 0),
                first_login_at: prev.first_login_at || r.firstLoginAt,
                last_active_at: r.lastActiveAt || prev.last_active_at
              };
            }
          });
        }
      });
    } catch(e) {}

    // 5. Fetch page visits from central app_settings + localStorage (Matching ID or Name)
    const visits = await window.UserPageAudit.getVisitsForUser(userId, displayName, monthStr);

    // 5b. Fetch operational actions performed by this user (Bookings, Payments, Advances, Expenses)
    let userActions = [];
    if (window.UserActionAudit && typeof window.UserActionAudit.fetchUserActionsForMonth === 'function') {
      try { userActions = await window.UserActionAudit.fetchUserActionsForMonth(userId, displayName, monthStr); } catch(e) {}
    }

    // 5c. Cross-correlate verified operational work (Bookings, Payments, Advances, Expenses) into dailyMap!
    // Ensures real database work from 1 Nov 2026 onwards is credited as verified active days
    (userActions || []).forEach(act => {
      const d = act.date || (act.timestamp ? act.timestamp.slice(0, 10) : '');
      if (d && d.startsWith(monthStr)) {
        if (!dailyMap[d]) {
          dailyMap[d] = {
            log_date: d,
            login_count: 1,
            active_seconds: 600, // minimum 10 min session credited for taking operational action
            first_login_at: act.timestamp || `${d}T10:00:00.000Z`,
            last_active_at: act.timestamp || `${d}T10:10:00.000Z`
          };
        } else {
          const r = dailyMap[d];
          r.login_count = Math.max(r.login_count || 1, 1);
          r.active_seconds = Math.max(r.active_seconds || 0, 600);
          if (act.timestamp) {
            if (!r.first_login_at || new Date(act.timestamp) < new Date(r.first_login_at)) r.first_login_at = act.timestamp;
            if (!r.last_active_at || new Date(act.timestamp) > new Date(r.last_active_at)) r.last_active_at = act.timestamp;
          }
        }
      }
    });

    // 6. Cross-correlate Page Visits into dailyMap!
    // Every day that has verified page actions MUST be counted as an active day with true timings
    const visitsByDate = {};
    visits.forEach(v => {
      const d = v.date || (v.timestamp ? v.timestamp.slice(0, 10) : '');
      if (d && d.startsWith(monthStr)) {
        if (!visitsByDate[d]) visitsByDate[d] = [];
        visitsByDate[d].push(v);
      }
    });

    Object.keys(visitsByDate).forEach(date => {
      const dayVisits = visitsByDate[date];
      dayVisits.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
      const firstVisitTime = dayVisits[0]?.timestamp;
      const lastVisitTime = dayVisits[dayVisits.length - 1]?.timestamp;

      let visitSpanSec = 0;
      if (firstVisitTime && lastVisitTime) {
        visitSpanSec = Math.round((new Date(lastVisitTime).getTime() - new Date(firstVisitTime).getTime()) / 1000);
      }
      // Allocate minimum 45s per page navigation
      const minPageSec = dayVisits.length * 45;
      const calculatedSec = Math.max(visitSpanSec, minPageSec);

      if (!dailyMap[date]) {
        // Date was missing from tracker, reconstruct from verified page visits
        dailyMap[date] = {
          log_date: date,
          login_count: Math.max(1, Math.ceil(dayVisits.length / 4)),
          active_seconds: calculatedSec,
          first_login_at: firstVisitTime,
          last_active_at: lastVisitTime
        };
      } else {
        const r = dailyMap[date];
        if (firstVisitTime && (!r.first_login_at || new Date(firstVisitTime) < new Date(r.first_login_at))) {
          r.first_login_at = firstVisitTime;
        }
        if (lastVisitTime && (!r.last_active_at || new Date(lastVisitTime) > new Date(r.last_active_at))) {
          r.last_active_at = lastVisitTime;
        }
        r.active_seconds = Math.max(r.active_seconds || 0, calculatedSec);
      }
    });

    // 7. Convert dailyMap into sorted dailyRecords array with human-accurate duration
    const dailyRecords = Object.values(dailyMap).sort((a, b) => b.log_date.localeCompare(a.log_date));

    // Calculate realistic, accurate seconds for each record
    dailyRecords.forEach(r => {
      let sec = r.active_seconds || 0;
      if (r.first_login_at && r.last_active_at) {
        const diff = Math.round((new Date(r.last_active_at).getTime() - new Date(r.first_login_at).getTime()) / 1000);
        if (diff > 0 && diff < 86400) {
          // If first-to-last action span is larger, use the true span!
          sec = Math.max(sec, diff);
        }
      }
      // Minimum 2 minutes per login session
      const minSession = (r.login_count || 1) * 120;
      r.computedSeconds = Math.max(sec, minSession);
    });

    // 8. Calculate Monthly Totals
    const totalDaysLoggedIn = dailyRecords.length;
    const totalSecondsOnline = dailyRecords.reduce((sum, r) => sum + r.computedSeconds, 0);
    const totalLoginsCount = dailyRecords.reduce((sum, r) => sum + (r.login_count || 1), 0);
    const avgSecsPerActiveDay = totalDaysLoggedIn > 0 ? Math.round(totalSecondsOnline / totalDaysLoggedIn) : 0;

    const fmtHoursMins = (sec) => {
      sec = Math.max(0, Math.floor(sec || 0));
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      if (h > 0) return `${h}h ${m}m`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    };

    // Summarize page counts
    const pageCounts = {};
    visits.forEach(v => {
      const p = (v.page || '').trim().toLowerCase();
      if (p) pageCounts[p] = (pageCounts[p] || 0) + 1;
    });
    const sortedPages = Object.entries(pageCounts).sort((a,b) => b[1] - a[1]);

    const PAGE_HUMAN_NAMES = {
      'dashboard': '📊 Operations Dashboard',
      'today': '📊 Operations Dashboard',
      'menu': '⚙️ App & Profile Menu',
      'bookings': '📅 Bookings / Calendar',
      'calendar': '🗓️ Timeline Gantt View',
      'reports': '🗓️ Timeline Gantt View',
      'rooms': '🏢 Properties & Rates',
      'flats': '🛏️ Flat Status & Cleaning',
      'properties': '🏢 Properties & Rates',
      'expenses': '🧾 Expenses & Outflows',
      'monthly-expenses': '🧾 Monthly Expenses',
      'emp-expenses': '🧾 Staff Expenses',
      'claims': '💰 TUHH-OD & Finances',
      'finance': '💰 TUHH-OD & Finances',
      'finances': '💰 TUHH-OD & Finances',
      'cashbook': '💰 Cashbook & Reimbursements',
      'investors': '💼 Investor Portfolios',
      'invester': '💼 Investor Portfolios',
      'employees': '👥 HRMS Staff Roster',
      'attendance': '📋 Attendance Log',
      'att-summary': '📋 Attendance Summary',
      'tasks': '🧰 Task Manager',
      'task-and-housekeeping': '🧰 Task & Housekeeping',
      'tasks-and-housekeeping': '🧰 Task & Housekeeping',
      'housekeeping': '🧰 Housekeeping',
      'employee-ledger': '📒 Cleaner & Staff Ledger',
      'whatsapp-hub': '📱 WhatsApp Hub',
      'whatsapp': '📱 WhatsApp Hub',
      'laundry': '🧺 Laundry Operations',
      'maintenance': '🔧 Maintenance Tickets',
      'ca-audit': '💼 GST & Audit Pack',
      'analytics': '📊 Financial Analytics',
      'daily-report': '📄 Daily Booking Report',
      'dailyreport': '📄 Daily Booking Report',
      'user-mgmt': '👤 User Management',
      'settings': '⚙️ Global Settings',
      'help': '❓ Operating Guide',
      'sop': '📋 Operating Procedures',
      'reminders': '⏰ System Reminders',
      'salary': '💳 Salary Tracker',
      'advance': '💵 Advance Tracker',
      'employee-portal': '📱 Employee Portal',
      'checkin': '🔑 Check-in Manager Desk',
      'reviews-followup': '⭐ Airbnb Review Followup'
    };

    // Latest 25 visits in reverse chronological order for detailed activity stream
    const recentVisitsStream = [...visits].reverse().slice(0, 25);

    bodyEl.innerHTML = `
      <!-- KPI CARDS -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(115px, 1fr));gap:10px;margin-bottom:20px;">
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:22px;font-weight:900;color:#15803D;">${totalDaysLoggedIn}</div>
          <div style="font-size:10.5px;font-weight:800;color:#166534;text-transform:uppercase;margin-top:2px;">Days Active</div>
          <div style="font-size:10px;color:#64748B;margin-top:1px;">in this month</div>
        </div>

        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:900;color:#1D4ED8;">${fmtHoursMins(totalSecondsOnline)}</div>
          <div style="font-size:10.5px;font-weight:800;color:#1E40AF;text-transform:uppercase;margin-top:2px;">Screen Time</div>
          <div style="font-size:10px;color:#64748B;margin-top:1px;">total active</div>
        </div>

        <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:22px;font-weight:900;color:#C2410C;">${totalLoginsCount}</div>
          <div style="font-size:10.5px;font-weight:800;color:#9A3412;text-transform:uppercase;margin-top:2px;">Total Logins</div>
          <div style="font-size:10px;color:#64748B;margin-top:1px;">sessions</div>
        </div>

        <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:900;color:#6D28D9;">${fmtHoursMins(avgSecsPerActiveDay)}</div>
          <div style="font-size:10.5px;font-weight:800;color:#5B21B6;text-transform:uppercase;margin-top:2px;">Avg Daily</div>
          <div style="font-size:10px;color:#64748B;margin-top:1px;">per active day</div>
        </div>

        <div style="background:#ECFEFF;border:1px solid #A5F3FC;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:22px;font-weight:900;color:#0E7490;">${visits.length}</div>
          <div style="font-size:10.5px;font-weight:800;color:#155E75;text-transform:uppercase;margin-top:2px;">Navigations</div>
          <div style="font-size:10px;color:#64748B;margin-top:1px;">pages visited</div>
        </div>
      </div>

      <!-- PAGES VISITED SECTION -->
      <div style="margin-bottom:22px;">
        <div style="font-size:13px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
          <span>🧭 Pages Visited Breakdown</span>
          <span style="font-size:11.5px;font-weight:600;color:#64748B;text-transform:none;">${visits.length} total page actions</span>
        </div>

        ${sortedPages.length > 0 ? `
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:8px;">
            ${sortedPages.map(([pageKey, count]) => `
              <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:12.5px;font-weight:700;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  ${PAGE_HUMAN_NAMES[pageKey] || pageKey}
                </span>
                <span style="background:#0284C7;color:#fff;font-size:11px;font-weight:800;padding:2px 7px;border-radius:6px;flex-shrink:0;">
                  ${count}
                </span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:10px;padding:16px;text-align:center;color:#94A3B8;font-size:12.5px;">
            No specific page navigation tracked yet for this period. As the user navigates, pages record in real-time.
          </div>
        `}
      </div>

      <!-- RECENT PAGE NAVIGATION STREAM (LIVE TIMELINE) -->
      ${recentVisitsStream.length > 0 ? `
        <div style="margin-bottom:22px;">
          <div style="font-size:13px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <span>🕒 Recent Page Navigation Stream (Latest ${recentVisitsStream.length})</span>
            <span style="font-size:11px;font-weight:700;color:#0284C7;background:#E0F2FE;padding:2px 8px;border-radius:6px;">Live Trace</span>
          </div>
          <div style="border:1px solid #E2E8F0;border-radius:10px;max-height:180px;overflow-y:auto;background:#FAFAFA;">
            ${recentVisitsStream.map(v => {
              const vDate = v.timestamp ? new Date(v.timestamp).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
              }) : '-';
              return `
                <div style="padding:6px 12px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between;font-size:12px;">
                  <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                    <span style="color:#64748B;font-size:11px;white-space:nowrap;">${vDate}</span>
                    <span style="font-weight:700;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      ${PAGE_HUMAN_NAMES[v.page] || v.page}
                    </span>
                  </div>
                  <span style="font-size:10.5px;color:#0369A1;background:#E0F2FE;padding:1px 6px;border-radius:4px;flex-shrink:0;">
                    ${v.device || '💻 Desktop'}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- OPERATIONAL ACTIONS PERFORMED SECTION (Bookings, Payments, Advances, Expenses) -->
      <div style="margin-bottom:24px;">
        <div style="font-size:13px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
          <span>🛠️ Operational Work &amp; Actions (${userActions.length} Actions)</span>
          <span style="font-size:11px;font-weight:700;color:#059669;background:#ECFDF5;padding:2px 8px;border-radius:6px;">Staff Activity Record</span>
        </div>

        ${userActions.length > 0 ? `
          <div style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02);max-height:220px;overflow-y:auto;background:#FFFFFF;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
              <thead>
                <tr style="background:#F1F5F9;color:#475569;font-weight:800;border-bottom:1px solid #CBD5E1;">
                  <th style="padding:8px 12px;width:100px;">Date &amp; Time</th>
                  <th style="padding:8px 12px;width:130px;">Action</th>
                  <th style="padding:8px 12px;">Particulars</th>
                  <th style="padding:8px 12px;text-align:right;width:95px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${userActions.map((a, i) => {
                  const aTime = a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                  const d = a.details || {};
                  let amt = d.amount || d.totalAmount || null;
                  let summary = '';
                  if (a.actionType === 'booking_add') summary = `Guest: <strong>${escapeHtml(d.guestName || '')}</strong> &middot; Room: ${d.roomId || '-'} &middot; ${d.checkIn || ''} to ${d.checkOut || ''}`;
                  else if (a.actionType === 'booking_modify') summary = `Guest: <strong>${escapeHtml(d.guestName || '')}</strong> &middot; ${escapeHtml(d.changes || 'Updated')}`;
                  else if (a.actionType === 'booking_delete') summary = `Deleted: <strong>${escapeHtml(d.guestName || '')}</strong> &middot; ${d.bookingId || ''}`;
                  else if (a.actionType === 'payment_add') summary = `Guest: <strong>${escapeHtml(d.guestName || '')}</strong> &middot; ${d.mode || 'Cash'} &middot; Received by: ${d.receivedBy || ''}`;
                  else if (a.actionType === 'advance_give') summary = `Given to: <strong>${escapeHtml(d.empName || '')}</strong> &middot; Reason: ${escapeHtml(d.reason || '')}`;
                  else if (a.actionType === 'expense_add') summary = `Category: <strong>${escapeHtml(d.categoryName || '')}</strong> &middot; ${escapeHtml(d.roomName || '')}`;
                  else summary = JSON.stringify(d);

                  return `
                    <tr style="border-bottom:1px solid #F1F5F9;${i%2===0 ? 'background:#FFFFFF;' : 'background:#FAFAFA;'}">
                      <td style="padding:8px 12px;color:#64748B;white-space:nowrap;">🕐 ${aTime}</td>
                      <td style="padding:8px 12px;font-weight:700;white-space:nowrap;">${a.actionTitle || a.actionType}</td>
                      <td style="padding:8px 12px;color:#334155;">${summary}</td>
                      <td style="padding:8px 12px;text-align:right;font-weight:800;white-space:nowrap;">${amt ? '₹' + Number(amt).toLocaleString('en-IN') : '—'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:10px;padding:16px;text-align:center;color:#94A3B8;font-size:12.5px;">
            No direct bookings, payments, advances, or expenses recorded by this user in this month.
          </div>
        `}
      </div>

      <!-- DAILY LOGIN & SCREEN TIME BREAKDOWN -->
      <div>
        <div style="font-size:13px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">
          📅 Daily Attendance & Screen Time History (${dailyRecords.length} Active Days)
        </div>

        ${dailyRecords.length > 0 ? `
          <div style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
            <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
              <thead>
                <tr style="background:#F1F5F9;color:#475569;font-weight:800;border-bottom:1px solid #CBD5E1;">
                  <th style="padding:10px 12px;">Date</th>
                  <th style="padding:10px 12px;">First Login</th>
                  <th style="padding:10px 12px;">Last Active</th>
                  <th style="padding:10px 10px;text-align:center;">Sessions</th>
                  <th style="padding:10px 12px;text-align:right;">Screen Time</th>
                  <th style="padding:10px 12px;">Pages Visited</th>
                </tr>
              </thead>
              <tbody>
                ${dailyRecords.map((r, i) => {
                  const dObj = new Date(r.log_date);
                  const dayName = dObj.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
                  const firstT = r.first_login_at ? new Date(r.first_login_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                  const lastT = r.last_active_at ? new Date(r.last_active_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';

                  const dayVisits = visitsByDate[r.log_date] || [];
                  const dayDistinctPages = {};
                  dayVisits.forEach(v => {
                    const pk = v.page || 'page';
                    dayDistinctPages[pk] = (dayDistinctPages[pk] || 0) + 1;
                  });
                  const dayPagesSummary = Object.entries(dayDistinctPages)
                    .map(([pk, cnt]) => `${(PAGE_HUMAN_NAMES[pk] || pk).replace(/^[^\w\s]+\s*/, '')} (${cnt})`)
                    .slice(0, 3)
                    .join(', ');

                  return `
                    <tr style="border-bottom:1px solid #F1F5F9;${i%2===0 ? 'background:#FFFFFF;' : 'background:#FAFAFA;'}">
                      <td style="padding:10px 12px;font-weight:800;color:#0F172A;white-space:nowrap;">
                        ${dayName}
                      </td>
                      <td style="padding:10px 12px;color:#64748B;white-space:nowrap;">
                        🕐 ${firstT}
                      </td>
                      <td style="padding:10px 12px;color:#64748B;white-space:nowrap;">
                        ⏱ ${lastT}
                      </td>
                      <td style="padding:10px 10px;text-align:center;white-space:nowrap;">
                        <span style="background:#F1F5F9;padding:2px 7px;border-radius:6px;font-weight:700;color:#334155;">
                          ${r.login_count || 1}x
                        </span>
                      </td>
                      <td style="padding:10px 12px;text-align:right;font-weight:900;color:#059669;white-space:nowrap;">
                        ${fmtHoursMins(r.computedSeconds || r.active_seconds)}
                      </td>
                      <td style="padding:10px 12px;color:#64748B;font-size:11px;">
                        ${dayPagesSummary ? `${dayPagesSummary}${Object.keys(dayDistinctPages).length > 3 ? '...' : ''}` : '<span style="color:#CBD5E1;">—</span>'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:10px;padding:20px;text-align:center;color:#94A3B8;font-size:13px;">
            No daily logins recorded yet for this month.
          </div>
        `}
      </div>
    `;
  }

  // ═════════════════════════════════════════════════════════════
  // 5. HOOKS INTO CORE.JS
  // ═════════════════════════════════════════════════════════════

  // Hook into UserActivityTracker.recordLogin (Capture ANY user from ANY group)
  const checkAndHookTracker = () => {
    if (window.UserActivityTracker && !window.UserActivityTracker._auditHooked) {
      window.UserActivityTracker._auditHooked = true;
      const origRecordLogin = window.UserActivityTracker.recordLogin.bind(window.UserActivityTracker);
      window.UserActivityTracker.recordLogin = async function(userId, displayName, role) {
        await origRecordLogin(userId, displayName, role);
        await window.DevLoginAlert.notifyDevOnLogin(userId, displayName, role, window.SESSION?.email);
      };
    }
  };

  // Hook into navigate
  const checkAndHookNavigate = () => {
    if (window.navigate && !window.navigate._auditHooked) {
      const origNavigate = window.navigate;
      const wrappedNavigate = function(page) {
        origNavigate(page);
        if (window.SESSION?.userId) {
          window.UserPageAudit.trackVisit(
            window.SESSION.userId,
            window.SESSION.displayName,
            window.SESSION.role,
            page
          );
          if (window.UserActivityTracker) {
            window.UserActivityTracker.pulseActivity(
              window.SESSION.userId,
              window.SESSION.displayName,
              window.SESSION.role
            );
          }
        }
      };
      wrappedNavigate._auditHooked = true;
      window.navigate = wrappedNavigate;
    }
  };

  // Track on hashchange
  window.addEventListener('hashchange', () => {
    const hash = (window.location.hash || '').replace('#', '').trim();
    if (hash && window.SESSION?.userId && window.UserPageAudit?.trackVisit) {
      window.UserPageAudit.trackVisit(window.SESSION.userId, window.SESSION.displayName, window.SESSION.role, hash);
    }
  });

  // Run hooks on load and DOMContentLoaded
  checkAndHookTracker();
  checkAndHookNavigate();
  document.addEventListener('DOMContentLoaded', () => {
    checkAndHookTracker();
    checkAndHookNavigate();
    // Track current page if already present
    if (window.SESSION?.userId && window.SESSION?.currentPage && window.UserPageAudit?.trackVisit) {
      window.UserPageAudit.trackVisit(window.SESSION.userId, window.SESSION.displayName, window.SESSION.role, window.SESSION.currentPage);
    }
  });

  // Check pending login alert queued before this script finished loading
  if (window._pendingLoginAlert) {
    window.DevLoginAlert.notifyDevOnLogin(
      window._pendingLoginAlert.userId,
      window._pendingLoginAlert.displayName,
      window._pendingLoginAlert.role,
      window._pendingLoginAlert.email
    );
    window._pendingLoginAlert = null;
  }

  // Fast poller for Developer alerts (every 10 seconds - Developer Group Only)
  setInterval(() => {
    if (isDeveloperRecipient() && window.DevLoginAlert?.pollNewAlertsForDev) {
      window.DevLoginAlert.pollNewAlertsForDev();
    }
  }, 10000);

  // Poll immediately when Developer switches to the tab or focuses window
  window.addEventListener('focus', () => {
    if (isDeveloperRecipient() && window.DevLoginAlert?.pollNewAlertsForDev) {
      window.DevLoginAlert.pollNewAlertsForDev();
    }
  });

  // Real-time BroadcastChannel listener (Instant 0ms across tabs in same browser - Developer Group Only)
  try {
    if (window.BroadcastChannel) {
      const bc = new BroadcastChannel('tuhh_login_channel');
      bc.onmessage = function(ev) {
        if (ev?.data?.type === 'NEW_LOGIN' && ev.data.alert) {
          if (isDeveloperRecipient()) {
            if (ev.data.alert.user_id !== window.SESSION?.userId) {
              playLoginChime();
              window.DevLoginAlert.showFloatingToast(ev.data.alert);
            }
            window.DevLoginAlert.updateBellBadge(1);
          }
        }
      };
    }
  } catch(e) {}

  // Real-time storage listener (Cross-tab fallback - Developer Group Only)
  window.addEventListener('storage', function(e) {
    if (e.key === 'uh_latest_login_alert' && e.newValue) {
      try {
        const alert = JSON.parse(e.newValue);
        if (isDeveloperRecipient() && alert) {
          if (alert.user_id !== window.SESSION?.userId) {
            playLoginChime();
            window.DevLoginAlert.showFloatingToast(alert);
          }
          window.DevLoginAlert.updateBellBadge(1);
        }
      } catch(err) {}
    }
  });

  // ═════════════════════════════════════════════════════════════
  // 6. RENDER ALERTS TAB IN USER MANAGEMENT (Developer Group Only)
  // ═════════════════════════════════════════════════════════════
  window.renderAlertsTabContent = async function() {
    const el = document.getElementById('alertsTabContainer');
    if (!el) return;

    if (!isDeveloperRecipient()) {
      el.innerHTML = `
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:24px;text-align:center;color:#991B1B;">
          <div style="font-size:24px;margin-bottom:6px;">🔒</div>
          <div style="font-size:14px;font-weight:800;">Access Restricted</div>
          <div style="font-size:12px;margin-top:4px;">Login alerts and user tracking are visible exclusively to Developer group accounts.</div>
        </div>
      `;
      return;
    }

    el.innerHTML = '<div style="text-align:center;padding:24px;color:#64748B;">⏳ Loading login alerts...</div>';

    const alerts = await window.DevLoginAlert.fetchAlerts(100);
    if (!alerts.length) {
      el.innerHTML = `
        <div style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">
          <div style="font-size:28px;margin-bottom:8px;">🔔</div>
          <div style="font-size:14px;font-weight:700;color:#1E293B;">No Login Alerts Recorded Yet</div>
          <div style="font-size:12px;color:#64748B;margin-top:4px;">When any user logs in, real-time alerts will appear here.</div>
        </div>
      `;
      return;
    }

    const rows = alerts.map(a => {
      const ts = a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
      }) : (a.time_label || '-');
      const unread = !a.read;

      const roleBadge = a.user_role === 'owner' ? '👑 Owner' :
        a.user_role === 'admin' ? '🛡️ Admin' :
        a.user_role === 'developer' ? '⚡ Developer' :
        a.user_role === 'manager' ? '💼 Manager' :
        a.user_role === 'booking_staff' ? '📅 Staff' :
        a.user_role === 'cleaner' ? '🧹 Cleaner' :
        a.user_role === 'caretaker' ? '🔑 Caretaker' : (a.user_role || 'Staff');

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid #F1F5F9;${unread ? 'background:#F0F9FF;border-left:3px solid #0284C7;' : 'background:#FFFFFF;'}">
          <div style="display:flex;align-items:center;gap:12px;min-width:0;">
            <div style="width:40px;height:40px;border-radius:50%;background:${unread ? '#0284C7' : '#94A3B8'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;flex-shrink:0;">
              ${(a.user_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div style="min-width:0;">
              <div style="font-size:13.5px;font-weight:800;color:#0F172A;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <span>${escapeHtml(a.user_name || 'Unknown')}</span>
                <span style="background:#E2E8F0;color:#334155;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">${roleBadge}</span>
                ${a.device ? `<span style="background:#F1F5F9;color:#0284C7;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid #E2E8F0;">${a.device}</span>` : ''}
                ${unread ? '<span style="background:#EF4444;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:10px;">NEW</span>' : ''}
              </div>
              <div style="font-size:12px;color:#64748B;margin-top:2px;">
                🕐 Logged in: <strong>${ts}</strong>
              </div>
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
            <button class="btn-sm" onclick="window.openUserAuditModal('${a.user_id}','${(a.user_name||'').replace(/'/g, "\\'")}', '${a.user_role}')"
              style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;font-weight:700;padding:6px 12px;font-size:12px;" title="View User Audit">
              📊 Audit History
            </button>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div style="font-size:13px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;">
          🔔 Real-Time Login Alerts (Developer Group Only &middot; ${alerts.length} Total)
        </div>
        <button class="btn-sm" onclick="window.DevLoginAlert.markAllRead();renderAlertsTabContent();"
          style="background:#F1F5F9;color:#334155;font-weight:700;border:1px solid #CBD5E1;font-size:12px;padding:6px 12px;">
          ✅ Mark All as Read
        </button>
      </div>

      <div style="border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        ${rows}
      </div>
    `;
  };

  // ═════════════════════════════════════════════════════════════
  // 7. USER OPERATIONAL ACTIONS AUDIT SYSTEM (Developer Group Only)
  // Bookings Added, Modified, Deleted, Payments, Advances, Expenses
  // ═════════════════════════════════════════════════════════════
  window.UserActionAudit = {
    _buffer: [],
    _timer: null,

    async recordAction(actionType, details = {}) {
      try {
        const user = window.SESSION || {};
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const curMonth = today.slice(0, 7);
        const isMobile = /Android|iPhone|iPad|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        const titles = {
          booking_add: '➕ Added Booking',
          booking_modify: '✏️ Modified Booking',
          booking_delete: '🗑️ Deleted Booking',
          payment_add: '💰 Added Payment',
          advance_give: '💵 Disbursed Advance',
          expense_add: '🧾 Recorded Expense',
          expense_modify: '✏️ Modified Expense',
          expense_delete: '🗑️ Deleted Expense'
        };

        const entry = {
          id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          timestamp: now.toISOString(),
          date: today,
          month: curMonth,
          userId: user.userId || 'anon',
          userName: user.displayName || user.email || 'Staff User',
          userRole: user.role || 'staff',
          userEmail: user.email || '',
          device: isMobile ? '📱 Mobile' : '💻 Desktop',
          actionType,
          actionTitle: titles[actionType] || 'Operational Action',
          details: details || {}
        };

        // 1. Save locally per month
        try {
          const lKey = `uh_user_actions_${curMonth}`;
          const localList = JSON.parse(localStorage.getItem(lKey) || '[]');
          localList.unshift(entry);
          if (localList.length > 1200) localList.length = 1200;
          localStorage.setItem(lKey, JSON.stringify(localList));
        } catch(e) {}

        // 2. BroadcastChannel
        try {
          if (window.BroadcastChannel) {
            const bc = new BroadcastChannel('tuhh_actions_channel');
            bc.postMessage({ type: 'NEW_ACTION', action: entry });
          }
        } catch(e) {}

        // 3. Central Supabase app_settings sync
        this._buffer.push(entry);
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => this._flush(), 500);
      } catch(err) {
        console.warn('UserActionAudit.recordAction error:', err);
      }
    },

    async _flush() {
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
      if (!this._buffer.length || !window.sb) return;
      const batch = this._buffer.splice(0);
      const curMonth = new Date().toISOString().slice(0, 7);
      const key = `uh_user_actions_${curMonth}`;

      try {
        const { data: rows } = await window.sb.from('app_settings')
          .select('value')
          .eq('key', key)
          .limit(1);

        let list = [];
        if (rows?.[0]?.value) {
          try { list = JSON.parse(rows[0].value); } catch(e) {}
        }
        list.unshift(...batch);
        if (list.length > 3000) list = list.slice(0, 3000);

        await window.sb.from('app_settings').upsert({
          key,
          value: JSON.stringify(list),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      } catch(e) {
        console.warn('UserActionAudit _flush warning:', e);
        this._buffer.unshift(...batch);
      }
    },

    async fetchActionsForDate(targetDate, targetUserId) {
      targetDate = targetDate || new Date().toISOString().slice(0, 10);
      const monthStr = targetDate.slice(0, 7);
      const actions = [];
      const seenActionIds = new Set();

      // 1. Central app_settings actions
      try {
        if (window.sb) {
          const key = `uh_user_actions_${monthStr}`;
          const { data: rows } = await window.sb.from('app_settings').select('value').eq('key', key).limit(1);
          if (rows?.[0]?.value) {
            const list = JSON.parse(rows[0].value);
            (list || []).forEach(a => {
              if (a.date === targetDate) {
                const matchUser = !targetUserId || a.userId === targetUserId || (a.userName || '').toLowerCase() === (targetUserId || '').toLowerCase();
                if (matchUser && !seenActionIds.has(a.id)) {
                  seenActionIds.add(a.id);
                  actions.push(a);
                }
              }
            });
          }
        }
      } catch(e) {}

      // 2. LocalStorage actions
      try {
        const lKey = `uh_user_actions_${monthStr}`;
        const localList = JSON.parse(localStorage.getItem(lKey) || '[]');
        (localList || []).forEach(a => {
          if (a.date === targetDate) {
            const matchUser = !targetUserId || a.userId === targetUserId || (a.userName || '').toLowerCase() === (targetUserId || '').toLowerCase();
            if (matchUser && !seenActionIds.has(a.id)) {
              seenActionIds.add(a.id);
              actions.push(a);
            }
          }
        });
      } catch(e) {}

      // 3. Database Cross-Correlation for targetDate:
      // A) guest_register bookings (check_in on targetDate OR airbnb_booking_date on targetDate)
      try {
        if (window.sb) {
          const { data: bks } = await window.sb.from('guest_register')
            .select('booking_id, guest_name, room_id, check_in, check_out, total_amount, payment_status, booked_by, created_by, airbnb_booking_date, rooms(nickname, unit_no)')
            .or(`check_in.eq.${targetDate},airbnb_booking_date.eq.${targetDate}`)
            .neq('is_cancelled', true);

          (bks || []).forEach(b => {
            const bId = `db_bk_${b.booking_id}`;
            const bUser = (b.booked_by || '').trim() || 'Staff';
            const matchUser = !targetUserId || b.created_by === targetUserId || bUser.toLowerCase() === (targetUserId || '').toLowerCase();
            if (matchUser && !seenActionIds.has(bId)) {
              seenActionIds.add(bId);
              actions.push({
                id: bId,
                timestamp: `${targetDate}T10:00:00.000Z`,
                date: targetDate,
                month: monthStr,
                userId: b.created_by || 'staff',
                userName: bUser,
                userRole: (bUser.toLowerCase().includes('praveen') || bUser.toLowerCase().includes('admin')) ? 'manager' : (bUser === 'Gmail Sync' ? 'system' : 'staff'),
                actionType: 'booking_add',
                actionTitle: '➕ Added Booking',
                device: '💻 System Record',
                details: {
                  bookingId: b.booking_id,
                  guestName: b.guest_name,
                  roomId: b.rooms?.nickname || b.rooms?.unit_no || b.room_id,
                  checkIn: b.check_in,
                  checkOut: b.check_out,
                  totalAmount: b.total_amount,
                  paymentStatus: b.payment_status,
                  bookingMode: b.booked_by === 'Gmail Sync' ? 'Airbnb Sync' : 'Direct'
                }
              });
            }
          });
        }
      } catch(e) {}

      // B) payment_history
      try {
        if (window.sb) {
          const { data: pays } = await window.sb.from('payment_history')
            .select('id, booking_id, amount, payment_mode, received_by, created_by, payment_date, paid_at, notes, guest_register(guest_name, room_id)')
            .eq('payment_date', targetDate)
            .order('paid_at', { ascending: false });

          (pays || []).forEach(p => {
            const pId = `db_pay_${p.id}`;
            const pUser = (p.received_by || '').trim() || 'Staff';
            const matchUser = !targetUserId || p.created_by === targetUserId || pUser.toLowerCase() === (targetUserId || '').toLowerCase();
            if (matchUser && !seenActionIds.has(pId)) {
              seenActionIds.add(pId);
              actions.push({
                id: pId,
                timestamp: p.paid_at || `${targetDate}T12:00:00.000Z`,
                date: targetDate,
                month: monthStr,
                userId: p.created_by || 'staff',
                userName: pUser,
                userRole: 'staff',
                actionType: 'payment_add',
                actionTitle: '💰 Added Payment',
                device: '💻 System',
                details: {
                  bookingId: p.booking_id,
                  guestName: p.guest_register?.guest_name || 'Guest',
                  roomId: p.guest_register?.room_id,
                  amount: p.amount,
                  mode: p.payment_mode,
                  receivedBy: p.received_by,
                  paymentDate: p.payment_date,
                  notes: p.notes
                }
              });
            }
          });
        }
      } catch(e) {}

      // B) advance_tracker
      try {
        if (window.sb) {
          const { data: advs } = await window.sb.from('advance_tracker')
            .select('id, emp_id, advance_amount, payment_mode, paid_by, reason, date_given, created_at, employees(name, role)')
            .eq('date_given', targetDate)
            .order('created_at', { ascending: false });

          (advs || []).forEach(adv => {
            const aId = `db_adv_${adv.id}`;
            const advGiver = adv.paid_by || 'Management';
            const matchUser = !targetUserId || advGiver.toLowerCase() === (targetUserId || '').toLowerCase();
            if (matchUser && !seenActionIds.has(aId)) {
              seenActionIds.add(aId);
              actions.push({
                id: aId,
                timestamp: adv.created_at || `${targetDate}T12:00:00.000Z`,
                date: targetDate,
                month: monthStr,
                userId: 'mgmt',
                userName: advGiver,
                userRole: 'manager',
                actionType: 'advance_give',
                actionTitle: '💵 Disbursed Advance',
                device: '💻 System',
                details: {
                  empId: adv.emp_id,
                  empName: adv.employees?.name || adv.emp_id,
                  amount: adv.advance_amount,
                  mode: adv.payment_mode,
                  paidBy: adv.paid_by,
                  reason: adv.reason,
                  dateGiven: adv.date_given
                }
              });
            }
          });
        }
      } catch(e) {}

      // C) expenses
      try {
        if (window.sb) {
          const { data: exps } = await window.sb.from('expenses')
            .select('id, amount, paid_by, payment_mode, notes, room_id, entry_date, created_at, created_by, expense_categories(category_name), rooms(nickname)')
            .eq('entry_date', targetDate)
            .order('created_at', { ascending: false });

          (exps || []).forEach(exp => {
            const eId = `db_exp_${exp.id}`;
            const expUser = exp.paid_by || 'Staff';
            const matchUser = !targetUserId || exp.created_by === targetUserId || expUser.toLowerCase() === (targetUserId || '').toLowerCase();
            if (matchUser && !seenActionIds.has(eId)) {
              seenActionIds.add(eId);
              actions.push({
                id: eId,
                timestamp: exp.created_at || `${targetDate}T12:00:00.000Z`,
                date: targetDate,
                month: monthStr,
                userId: exp.created_by || 'staff',
                userName: expUser,
                userRole: 'staff',
                actionType: 'expense_add',
                actionTitle: '🧾 Recorded Expense',
                device: '💻 System',
                details: {
                  amount: exp.amount,
                  categoryName: exp.expense_categories?.category_name || 'Expense',
                  roomName: exp.rooms?.nickname || exp.room_id || 'General',
                  paidBy: exp.paid_by,
                  mode: exp.payment_mode,
                  notes: exp.notes,
                  entryDate: exp.entry_date
                }
              });
            }
          });
        }
      } catch(e) {}

      return actions.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    },

    async fetchUserActionsForMonth(userId, displayName, monthStr) {
      monthStr = monthStr || new Date().toISOString().slice(0, 7);
      const targetUid = (userId || '').toLowerCase();
      const targetName = (displayName || '').trim().toLowerCase();
      const list = [];
      const seen = new Set();

      // 1. Central app_settings actions
      try {
        if (window.sb) {
          const key = `uh_user_actions_${monthStr}`;
          const { data: rows } = await window.sb.from('app_settings').select('value').eq('key', key).limit(1);
          if (rows?.[0]?.value) {
            const raw = JSON.parse(rows[0].value);
            (raw || []).forEach(a => {
              const aUid = (a.userId || '').toLowerCase();
              const aName = (a.userName || '').trim().toLowerCase();
              if ((targetUid && aUid === targetUid) || (targetName && aName === targetName)) {
                if (!seen.has(a.id)) {
                  seen.add(a.id);
                  list.push(a);
                }
              }
            });
          }
        }
      } catch(e) {}

      // 2. LocalStorage actions
      try {
        const lKey = `uh_user_actions_${monthStr}`;
        const localList = JSON.parse(localStorage.getItem(lKey) || '[]');
        (localList || []).forEach(a => {
          const aUid = (a.userId || '').toLowerCase();
          const aName = (a.userName || '').trim().toLowerCase();
          if ((targetUid && aUid === targetUid) || (targetName && aName === targetName)) {
            if (!seen.has(a.id)) {
              seen.add(a.id);
              list.push(a);
            }
          }
        });
      } catch(e) {}

      // 3. Database Cross-Correlation for the ENTIRE Month (From 1st of month onwards):
      // A) guest_register bookings
      try {
        if (window.sb) {
          const { data: bks } = await window.sb.from('guest_register')
            .select('booking_id, guest_name, room_id, check_in, check_out, total_amount, payment_status, booked_by, created_by, rooms(nickname, unit_no)')
            .gte('check_in', `${monthStr}-01`)
            .lte('check_in', `${monthStr}-31`)
            .neq('is_cancelled', true)
            .order('check_in', { ascending: false });

          (bks || []).forEach(b => {
            const bUser = (b.booked_by || '').trim();
            const bUid = (b.created_by || '').trim().toLowerCase();
            const matchUser = (targetName && bUser.toLowerCase().includes(targetName)) ||
                              (targetName && targetName.includes(bUser.toLowerCase())) ||
                              (targetUid && bUid === targetUid);
            if (matchUser) {
              const actionId = `db_bk_${b.booking_id}`;
              if (!seen.has(actionId)) {
                seen.add(actionId);
                const rName = b.rooms?.nickname || b.rooms?.unit_no || b.room_id;
                list.push({
                  id: actionId,
                  timestamp: `${b.check_in}T10:00:00.000Z`,
                  date: b.check_in,
                  month: monthStr,
                  userId: b.created_by || userId || 'staff',
                  userName: b.booked_by || displayName,
                  userRole: 'staff',
                  actionType: 'booking_add',
                  actionTitle: '➕ Added Booking',
                  device: '💻 System Record',
                  details: {
                    bookingId: b.booking_id,
                    guestName: b.guest_name,
                    roomId: b.room_id,
                    propertyTitle: rName,
                    amount: b.total_amount,
                    paymentStatus: b.payment_status,
                    checkIn: b.check_in,
                    checkOut: b.check_out,
                    bookedBy: b.booked_by
                  }
                });
              }
            }
          });
        }
      } catch(e) {}

      // B) payment_history
      try {
        if (window.sb) {
          const { data: pays } = await window.sb.from('payment_history')
            .select('id, booking_id, amount, payment_mode, received_by, created_by, payment_date, paid_at, notes, guest_register(guest_name, room_id)')
            .gte('payment_date', `${monthStr}-01`)
            .lte('payment_date', `${monthStr}-31`)
            .order('payment_date', { ascending: false });

          (pays || []).forEach(p => {
            const pUser = (p.received_by || '').trim();
            const pUid = (p.created_by || '').trim().toLowerCase();
            const matchUser = (targetName && pUser.toLowerCase().includes(targetName)) ||
                              (targetName && targetName.includes(pUser.toLowerCase())) ||
                              (targetUid && pUid === targetUid);
            if (matchUser) {
              const pId = `db_pay_${p.id}`;
              if (!seen.has(pId)) {
                seen.add(pId);
                list.push({
                  id: pId,
                  timestamp: p.paid_at || `${p.payment_date}T12:00:00.000Z`,
                  date: p.payment_date,
                  month: monthStr,
                  userId: p.created_by || userId || 'staff',
                  userName: p.received_by || displayName,
                  userRole: 'staff',
                  actionType: 'payment_add',
                  actionTitle: '💰 Added Payment',
                  device: '💻 System Record',
                  details: {
                    bookingId: p.booking_id,
                    guestName: p.guest_register?.guest_name || 'Guest',
                    roomId: p.guest_register?.room_id,
                    amount: p.amount,
                    mode: p.payment_mode,
                    receivedBy: p.received_by,
                    paymentDate: p.payment_date,
                    notes: p.notes
                  }
                });
              }
            }
          });
        }
      } catch(e) {}

      // C) expenses
      try {
        if (window.sb) {
          const { data: exps } = await window.sb.from('expenses')
            .select('id, amount, paid_by, payment_mode, notes, room_id, entry_date, created_at, created_by, expense_categories(category_name), rooms(nickname)')
            .gte('entry_date', `${monthStr}-01`)
            .lte('entry_date', `${monthStr}-31`)
            .order('entry_date', { ascending: false });

          (exps || []).forEach(exp => {
            const expUser = (exp.paid_by || '').trim();
            const expUid = (exp.created_by || '').trim().toLowerCase();
            const matchUser = (targetName && expUser.toLowerCase().includes(targetName)) ||
                              (targetName && targetName.includes(expUser.toLowerCase())) ||
                              (targetUid && expUid === targetUid);
            if (matchUser) {
              const eId = `db_exp_${exp.id}`;
              if (!seen.has(eId)) {
                seen.add(eId);
                list.push({
                  id: eId,
                  timestamp: exp.created_at || `${exp.entry_date}T12:00:00.000Z`,
                  date: exp.entry_date,
                  month: monthStr,
                  userId: exp.created_by || userId || 'staff',
                  userName: exp.paid_by || displayName,
                  userRole: 'staff',
                  actionType: 'expense_add',
                  actionTitle: '🧾 Recorded Expense',
                  device: '💻 System Record',
                  details: {
                    expenseId: exp.id,
                    category: exp.expense_categories?.category_name || 'Expense',
                    amount: exp.amount,
                    mode: exp.payment_mode,
                    paidBy: exp.paid_by,
                    property: exp.rooms?.nickname || exp.room_id || 'General',
                    date: exp.entry_date,
                    notes: exp.notes
                  }
                });
              }
            }
          });
        }
      } catch(e) {}

      // D) advance_tracker
      try {
        if (window.sb) {
          const { data: advs } = await window.sb.from('advance_tracker')
            .select('id, emp_id, advance_amount, payment_mode, paid_by, reason, date_given, created_at, employees(name, role)')
            .gte('date_given', `${monthStr}-01`)
            .lte('date_given', `${monthStr}-31`)
            .order('date_given', { ascending: false });

          (advs || []).forEach(adv => {
            const advUser = (adv.paid_by || '').trim();
            const matchUser = (targetName && advUser.toLowerCase().includes(targetName)) ||
                              (targetName && targetName.includes(advUser.toLowerCase()));
            if (matchUser) {
              const aId = `db_adv_${adv.id}`;
              if (!seen.has(aId)) {
                seen.add(aId);
                list.push({
                  id: aId,
                  timestamp: adv.created_at || `${adv.date_given}T12:00:00.000Z`,
                  date: adv.date_given,
                  month: monthStr,
                  userId: userId || 'mgmt',
                  userName: adv.paid_by || displayName,
                  userRole: 'manager',
                  actionType: 'advance_give',
                  actionTitle: '💵 Disbursed Advance',
                  device: '💻 System Record',
                  details: {
                    empId: adv.emp_id,
                    empName: adv.employees?.name || adv.emp_id,
                    amount: adv.advance_amount,
                    mode: adv.payment_mode,
                    paidBy: adv.paid_by,
                    reason: adv.reason,
                    dateGiven: adv.date_given
                  }
                });
              }
            }
          });
        }
      } catch(e) {}

      return list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    }
  };

  // ═════════════════════════════════════════════════════════════
  // 8. RENDER DAILY WORK & ACTIONS AUDIT TAB (Developer Only)
  // ═════════════════════════════════════════════════════════════
  window._workAuditDate = window._workAuditDate || new Date().toISOString().slice(0, 10);
  window._workAuditUserFilter = window._workAuditUserFilter || '';
  window._workAuditTypeFilter = window._workAuditTypeFilter || '';

  window.renderWorkAuditTabContent = async function() {
    const el = document.getElementById('workAuditTabContainer');
    if (!el) return;

    if (!isDeveloperRecipient()) {
      el.innerHTML = `
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:24px;text-align:center;color:#991B1B;">
          <div style="font-size:24px;margin-bottom:6px;">🔒</div>
          <div style="font-size:14px;font-weight:800;">Access Restricted</div>
          <div style="font-size:12px;margin-top:4px;">Operational actions and staff work logs are visible exclusively to Developer group accounts.</div>
        </div>
      `;
      return;
    }

    const curDate = window._workAuditDate;
    el.innerHTML = '<div style="text-align:center;padding:24px;color:#64748B;">⏳ Loading staff work actions for ' + curDate + '...</div>';

    // Flush any pending actions buffer
    if (window.UserActionAudit && typeof window.UserActionAudit._flush === 'function') {
      try { await window.UserActionAudit._flush(); } catch(e) {}
    }

    const allActions = await window.UserActionAudit.fetchActionsForDate(curDate, window._workAuditUserFilter);

    // Filter by action type if selected
    const filteredActions = window._workAuditTypeFilter
      ? allActions.filter(a => a.actionType === window._workAuditTypeFilter)
      : allActions;

    // Metrics calculation
    const bookingsAdded = allActions.filter(a => a.actionType === 'booking_add');
    const bookingsModified = allActions.filter(a => a.actionType === 'booking_modify');
    const bookingsDeleted = allActions.filter(a => a.actionType === 'booking_delete');
    const payments = allActions.filter(a => a.actionType === 'payment_add');
    const advances = allActions.filter(a => a.actionType === 'advance_give');
    const expenses = allActions.filter(a => a.actionType === 'expense_add');

    const totalPaymentsAmount = payments.reduce((sum, a) => sum + (Number(a.details?.amount) || 0), 0);
    const totalAdvancesAmount = advances.reduce((sum, a) => sum + (Number(a.details?.amount) || 0), 0);
    const totalExpensesAmount = expenses.reduce((sum, a) => sum + (Number(a.details?.amount) || 0), 0);

    // List of unique users who did work on this date for filter dropdown
    const uniqueUserMap = new Map();
    allActions.forEach(a => {
      const uName = a.userName || 'Staff';
      if (!uniqueUserMap.has(uName)) uniqueUserMap.set(uName, a.userRole || 'staff');
    });

    const isToday = curDate === new Date().toISOString().slice(0, 10);
    const dObj = new Date(curDate + 'T12:00:00');
    const dateFormatted = dObj.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

    el.innerHTML = `
      <!-- TOP CONTROLS & FILTER BAR -->
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:14px 16px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <div style="font-size:14px;font-weight:900;color:#0F172A;display:flex;align-items:center;gap:8px;">
              <span>🛠️ Staff Operational Work &amp; Actions Audit</span>
              <span style="background:#059669;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;">Developer Master View</span>
            </div>
            <div style="font-size:12px;color:#64748B;margin-top:2px;">
              Live log of bookings added/modified/deleted, payments collected, advances given, and expenses entered.
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn-sm" onclick="window._workAuditDate=new Date().toISOString().slice(0,10);window.renderWorkAuditTabContent();"
              style="padding:6px 12px;font-size:12px;font-weight:700;border-radius:8px;cursor:pointer;${isToday ? 'background:#059669;color:#fff;border:none;' : 'background:#FFFFFF;border:1px solid #CBD5E1;color:#334155;'}">
              Today
            </button>
            <button type="button" class="btn-sm" onclick="const y=new Date();y.setDate(y.getDate()-1);window._workAuditDate=y.toISOString().slice(0,10);window.renderWorkAuditTabContent();"
              style="padding:6px 12px;font-size:12px;font-weight:700;border-radius:8px;cursor:pointer;background:#FFFFFF;border:1px solid #CBD5E1;color:#334155;">
              Yesterday
            </button>
            <input type="date" id="workAuditDateSelector" value="${curDate}"
              onchange="window._workAuditDate=this.value;window.renderWorkAuditTabContent();"
              style="padding:6px 10px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:12.5px;font-weight:700;color:#0F172A;background:#FFFFFF;" />
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid #E2E8F0;flex-wrap:wrap;align-items:center;">
          <div style="display:flex;align-items:center;gap:6px;">
            <label style="font-size:12px;font-weight:700;color:#475569;">Staff / User:</label>
            <select id="workAuditUserSelect" onchange="window._workAuditUserFilter=this.value;window.renderWorkAuditTabContent();"
              style="padding:5px 10px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:12px;font-weight:700;color:#0F172A;background:#FFFFFF;">
              <option value="" ${window._workAuditUserFilter === '' ? 'selected' : ''}>All Staff &amp; Users</option>
              ${Array.from(uniqueUserMap.entries()).map(([uName, uRole]) => `
                <option value="${uName}" ${window._workAuditUserFilter === uName ? 'selected' : ''}>
                  ${uName} (${uRole})
                </option>
              `).join('')}
            </select>
          </div>

          <div style="display:flex;align-items:center;gap:6px;">
            <label style="font-size:12px;font-weight:700;color:#475569;">Action Category:</label>
            <select id="workAuditTypeSelect" onchange="window._workAuditTypeFilter=this.value;window.renderWorkAuditTabContent();"
              style="padding:5px 10px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:12px;font-weight:700;color:#0F172A;background:#FFFFFF;">
              <option value="" ${window._workAuditTypeFilter === '' ? 'selected' : ''}>All Actions (${allActions.length})</option>
              <option value="booking_add" ${window._workAuditTypeFilter === 'booking_add' ? 'selected' : ''}>➕ Bookings Added (${bookingsAdded.length})</option>
              <option value="booking_modify" ${window._workAuditTypeFilter === 'booking_modify' ? 'selected' : ''}>✏️ Bookings Modified (${bookingsModified.length})</option>
              <option value="booking_delete" ${window._workAuditTypeFilter === 'booking_delete' ? 'selected' : ''}>🗑️ Bookings Deleted (${bookingsDeleted.length})</option>
              <option value="payment_add" ${window._workAuditTypeFilter === 'payment_add' ? 'selected' : ''}>💰 Payments Collected (${payments.length})</option>
              <option value="advance_give" ${window._workAuditTypeFilter === 'advance_give' ? 'selected' : ''}>💵 Advances Given (${advances.length})</option>
              <option value="expense_add" ${window._workAuditTypeFilter === 'expense_add' ? 'selected' : ''}>🧾 Expenses Entered (${expenses.length})</option>
            </select>
          </div>

          <div style="margin-left:auto;font-size:12px;font-weight:800;color:#059669;">
            📅 ${dateFormatted}
          </div>
        </div>
      </div>

      <!-- KPI METRIC CARDS -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:16px;">
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#15803D;">${bookingsAdded.length}</div>
          <div style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase;">Bookings Added</div>
          <div style="font-size:10px;color:#64748B;">on ${curDate}</div>
        </div>

        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#B45309;">${bookingsModified.length}</div>
          <div style="font-size:11px;font-weight:800;color:#92400E;text-transform:uppercase;">Bookings Modified</div>
          <div style="font-size:10px;color:#64748B;">edits tracked</div>
        </div>

        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#DC2626;">${bookingsDeleted.length}</div>
          <div style="font-size:11px;font-weight:800;color:#991B1B;text-transform:uppercase;">Bookings Deleted</div>
          <div style="font-size:10px;color:#64748B;">purged from register</div>
        </div>

        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:900;color:#1D4ED8;">₹${totalPaymentsAmount.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;font-weight:800;color:#1E40AF;text-transform:uppercase;">Payments Collected</div>
          <div style="font-size:10px;color:#64748B;">${payments.length} collections</div>
        </div>

        <div style="background:#FDF2F8;border:1px solid #FBCFE8;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:900;color:#BE185D;">₹${totalAdvancesAmount.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;font-weight:800;color:#9D174D;text-transform:uppercase;">Advances Given</div>
          <div style="font-size:10px;color:#64748B;">${advances.length} staff disbursements</div>
        </div>

        <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px;padding:10px;text-align:center;">
          <div style="font-size:18px;font-weight:900;color:#6D28D9;">₹${totalExpensesAmount.toLocaleString('en-IN')}</div>
          <div style="font-size:11px;font-weight:800;color:#5B21B6;text-transform:uppercase;">Expenses Entered</div>
          <div style="font-size:10px;color:#64748B;">${expenses.length} outflow entries</div>
        </div>
      </div>

      <!-- MASTER ACTIONS TABLE / LIST -->
      ${filteredActions.length > 0 ? `
        <div style="border:1px solid #E2E8F0;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.02);background:#FFFFFF;">
          <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:left;">
            <thead>
              <tr style="background:#F1F5F9;color:#475569;font-weight:800;border-bottom:1px solid #CBD5E1;">
                <th style="padding:10px 14px;width:95px;">Time</th>
                <th style="padding:10px 14px;width:150px;">Staff / User</th>
                <th style="padding:10px 14px;width:150px;">Action</th>
                <th style="padding:10px 14px;">Full Particulars &amp; Details</th>
                <th style="padding:10px 14px;text-align:right;width:110px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredActions.map((a, i) => {
                const aTime = a.timestamp ? new Date(a.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                const d = a.details || {};

                // Action tag styles
                const actionBadges = {
                  booking_add: '<span style="background:#DCFCE7;color:#15803D;font-weight:800;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid #BBF7D0;">➕ Booking Added</span>',
                  booking_modify: '<span style="background:#FEF3C7;color:#B45309;font-weight:800;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid #FDE68A;">✏️ Modified</span>',
                  booking_delete: '<span style="background:#FEE2E2;color:#DC2626;font-weight:800;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid #FECACA;">🗑️ Deleted</span>',
                  payment_add: '<span style="background:#DBEAFE;color:#1D4ED8;font-weight:800;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid #BFDBFE;">💰 Payment</span>',
                  advance_give: '<span style="background:#FCE7F3;color:#BE185D;font-weight:800;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid #FBCFE8;">💵 Advance</span>',
                  expense_add: '<span style="background:#EDE9FE;color:#6D28D9;font-weight:800;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid #DDD6FE;">🧾 Expense</span>'
                };
                const actionBadgeHtml = actionBadges[a.actionType] || `<span style="background:#F1F5F9;color:#334155;font-weight:700;font-size:11px;padding:3px 8px;border-radius:6px;">${a.actionTitle || 'Action'}</span>`;

                // Description formatting
                let descHtml = '';
                let amtVal = null;

                if (a.actionType === 'booking_add') {
                  amtVal = d.totalAmount || 0;
                  descHtml = `
                    <div style="font-weight:700;color:#0F172A;">
                      Guest: <span style="color:#0284C7;">${escapeHtml(d.guestName || 'Guest')}</span>
                      ${d.bookingId ? ` &middot; <span style="font-family:monospace;font-size:11.5px;color:#475569;">${d.bookingId}</span>` : ''}
                    </div>
                    <div style="font-size:11.5px;color:#64748B;margin-top:2px;">
                      Room: <strong>${d.roomId || '-'}</strong> &middot; Check-in: <strong>${d.checkIn || '-'}</strong> to <strong>${d.checkOut || '-'}</strong> (${d.bookingMode || 'Direct'})
                    </div>
                  `;
                } else if (a.actionType === 'booking_modify') {
                  amtVal = d.totalAmount || null;
                  descHtml = `
                    <div style="font-weight:700;color:#0F172A;">
                      Guest: <span style="color:#0284C7;">${escapeHtml(d.guestName || 'Guest')}</span>
                      ${d.bookingId ? ` &middot; <span style="font-family:monospace;font-size:11.5px;color:#475569;">${d.bookingId}</span>` : ''}
                    </div>
                    <div style="font-size:11.5px;color:#B45309;margin-top:2px;font-style:italic;">
                      ${escapeHtml(d.changes || 'Booking details updated')}
                    </div>
                  `;
                } else if (a.actionType === 'booking_delete') {
                  amtVal = d.totalAmount || null;
                  const canRestore = window.isPraveenUser && window.isPraveenUser();
                  descHtml = `
                    <div style="font-weight:700;color:#DC2626;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
                      <span>Deleted: ${escapeHtml(d.guestName || 'Guest')} &middot; <span style="font-family:monospace;font-size:11.5px;">${d.bookingId || '-'}</span></span>
                      ${canRestore && d.bookingId ? `
                        <button type="button" class="btn-sm" onclick="window.restoreDeletedBooking('${d.bookingId}')" style="background:#10B981;color:#fff;border:none;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                          🔄 Restore Booking
                        </button>
                      ` : ''}
                    </div>
                    <div style="font-size:11.5px;color:#64748B;margin-top:2px;">
                      Archived in Trash Vault. Room: ${d.roomId || '-'} ${canRestore ? ' &middot; <span style="color:#059669;font-weight:600;">Restorable by Praveen</span>' : ''}
                    </div>
                  `;
                } else if (a.actionType === 'payment_add') {
                  amtVal = d.amount || 0;
                  descHtml = `
                    <div style="font-weight:700;color:#0F172A;">
                      Received via <strong>${d.mode || 'Cash/UPI'}</strong> by <strong style="color:#15803D;">${escapeHtml(d.receivedBy || a.userName || 'Staff')}</strong>
                    </div>
                    <div style="font-size:11.5px;color:#64748B;margin-top:2px;">
                      Guest: <strong>${escapeHtml(d.guestName || 'Guest')}</strong> &middot; Booking: <span style="font-family:monospace;">${d.bookingId || '-'}</span> ${d.notes ? `&middot; <em>"${escapeHtml(d.notes)}"</em>` : ''}
                    </div>
                  `;
                } else if (a.actionType === 'advance_give') {
                  amtVal = d.amount || 0;
                  descHtml = `
                    <div style="font-weight:700;color:#0F172A;">
                      Given to: <strong style="color:#BE185D;">${escapeHtml(d.empName || d.empId || 'Staff')}</strong> &middot; Paid by: <strong>${escapeHtml(d.paidBy || a.userName || 'Management')}</strong>
                    </div>
                    <div style="font-size:11.5px;color:#64748B;margin-top:2px;">
                      Purpose: <em>${escapeHtml(d.reason || 'Staff Advance')}</em> (${d.mode || 'Cash'})
                    </div>
                  `;
                } else if (a.actionType === 'expense_add') {
                  amtVal = d.amount || 0;
                  descHtml = `
                    <div style="font-weight:700;color:#0F172A;">
                      Category: <strong style="color:#6D28D9;">${escapeHtml(d.categoryName || 'General')}</strong> &middot; Room: <strong>${escapeHtml(d.roomName || 'Property')}</strong>
                    </div>
                    <div style="font-size:11.5px;color:#64748B;margin-top:2px;">
                      Paid by: <strong>${escapeHtml(d.paidBy || a.userName || 'Staff')}</strong> (${d.mode || 'UPI'}) ${d.notes ? `&middot; <em>"${escapeHtml(d.notes)}"</em>` : ''}
                    </div>
                  `;
                } else {
                  descHtml = `<div style="font-weight:600;color:#334155;">${JSON.stringify(d)}</div>`;
                }

                return `
                  <tr style="border-bottom:1px solid #F1F5F9;${i%2===0 ? 'background:#FFFFFF;' : 'background:#FAFAFA;'}">
                    <td style="padding:10px 14px;color:#64748B;font-weight:700;white-space:nowrap;">
                      🕐 ${aTime}
                    </td>
                    <td style="padding:10px 14px;white-space:nowrap;">
                      <div style="font-weight:800;color:#0F172A;display:flex;align-items:center;gap:4px;">
                        <span>${escapeHtml(a.userName || 'Staff')}</span>
                        <span style="font-size:10px;color:#64748B;">${a.device || ''}</span>
                      </div>
                      <div style="font-size:10.5px;color:#64748B;text-transform:capitalize;">${a.userRole || 'staff'}</div>
                    </td>
                    <td style="padding:10px 14px;white-space:nowrap;">
                      ${actionBadgeHtml}
                    </td>
                    <td style="padding:10px 14px;">
                      ${descHtml}
                    </td>
                    <td style="padding:10px 14px;text-align:right;white-space:nowrap;">
                      ${amtVal !== null ? `
                        <span style="font-weight:900;font-size:13px;color:${a.actionType === 'payment_add' ? '#059669' : a.actionType === 'advance_give' ? '#BE185D' : a.actionType === 'expense_add' ? '#6D28D9' : '#0F172A'};">
                          ₹${Number(amtVal).toLocaleString('en-IN')}
                        </span>
                      ` : '<span style="color:#CBD5E1;">—</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:14px;padding:36px 20px;text-align:center;color:#94A3B8;">
          <div style="font-size:32px;margin-bottom:8px;">📝</div>
          <div style="font-size:14px;font-weight:800;color:#1E293B;">No Operational Actions Recorded for ${dateFormatted}</div>
          <div style="font-size:12px;color:#64748B;margin-top:4px;">
            As staff add or delete bookings, collect payments, disburse advances, or enter expenses, they will stream here in real time.
          </div>
        </div>
      `}
    `;
  };

  console.log('✅ Real-time Dev Login Alerts & User Audit System active');
})();
