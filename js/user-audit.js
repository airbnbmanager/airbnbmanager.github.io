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

    // Called whenever a user logs in
    async notifyDevOnLogin(userId, displayName, role, email) {
      if (!userId) return;
      // Never alert for developer's own login
      if (role === 'developer') return;

      const now = new Date();
      const alertId = `login_${userId}_${now.getTime()}`;
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const alertObj = {
        id: alertId,
        type: 'user_login',
        user_id: userId,
        user_name: displayName || email || 'Staff User',
        user_role: role || 'staff',
        user_email: email || '',
        timestamp: now.toISOString(),
        time_label: `${dateStr} at ${timeStr}`,
        read: false
      };

      // 1. Sync to Supabase `app_settings` (shared central store for all devices)
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
          if (alertsList.length > 150) alertsList = alertsList.slice(0, 150); // Keep last 150

          await window.sb.from('app_settings').upsert({
            key: 'dev_login_alerts',
            value: JSON.stringify(alertsList)
          }, { onConflict: 'key' });
        }
      } catch(e) {
        console.warn('Could not sync login alert to Supabase:', e);
      }

      // 2. Also save to user_activity_logs
      try {
        const local = JSON.parse(localStorage.getItem('uh_user_activity_logs') || '{}');
        const today = now.toISOString().slice(0, 10);
        if (!local[today]) local[today] = {};
        if (!local[today][userId]) {
          local[today][userId] = {
            userId, displayName, role,
            logDate: today, loginCount: 1, activeSeconds: 30,
            firstLoginAt: now.toISOString(), lastActiveAt: now.toISOString()
          };
        } else {
          local[today][userId].loginCount = (local[today][userId].loginCount || 1) + 1;
          local[today][userId].lastActiveAt = now.toISOString();
        }
        localStorage.setItem('uh_user_activity_logs', JSON.stringify(local));
      } catch(e) {}
    },

    // Polled by Developer's browser every 20-30s
    async pollNewAlertsForDev() {
      if (window.SESSION?.role !== 'developer') return;

      try {
        if (!window.sb) return;
        const { data: rows } = await window.sb.from('app_settings')
          .select('value')
          .eq('key', 'dev_login_alerts')
          .limit(1);

        if (!rows?.[0]?.value) return;
        const alertsList = JSON.parse(rows[0].value);
        if (!Array.isArray(alertsList) || !alertsList.length) return;

        // Check for alerts newer than last poll or unseen
        const freshAlerts = alertsList.filter(a => {
          if (this._seenAlertIds.has(a.id)) return false;
          // Only show alerts from the last 15 minutes as popup
          const alertAgeMs = Date.now() - new Date(a.timestamp).getTime();
          return alertAgeMs < 15 * 60 * 1000;
        });

        if (freshAlerts.length > 0) {
          // Play audio chime
          playLoginChime();

          // Show popup banner for newest alert
          const newest = freshAlerts[0];
          this.showFloatingToast(newest);

          // Mark as seen
          freshAlerts.forEach(a => this._seenAlertIds.add(a.id));
          sessionStorage.setItem('uh_seen_alert_ids', JSON.stringify(Array.from(this._seenAlertIds)));

          // Update topbar badge
          this.updateBellBadge(freshAlerts.length);
        }
      } catch(e) {
        // silent
      }
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
  window.UserPageAudit = {
    _buffer: [],
    _timer: null,

    trackVisit(userId, displayName, role, page) {
      if (!userId || !page) return;
      if (['menu', 'dashboard'].includes(page)) return;

      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const curMonth = today.slice(0, 7);

      const entry = {
        userId,
        displayName: displayName || 'User',
        role: role || 'staff',
        page,
        timestamp: now.toISOString(),
        date: today,
        month: curMonth
      };

      // 1. Save locally per user
      try {
        const key = `uh_audit_pages_${userId}_${curMonth}`;
        const local = JSON.parse(localStorage.getItem(key) || '[]');
        local.push(entry);
        if (local.length > 600) local.splice(0, local.length - 600);
        localStorage.setItem(key, JSON.stringify(local));
      } catch(e) {}

      // 2. Buffer & flush to central app_settings
      this._buffer.push(entry);
      if (!this._timer) {
        this._timer = setTimeout(() => this._flush(), 8000);
      }
    },

    async _flush() {
      this._timer = null;
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
        if (list.length > 2500) list = list.slice(-2500); // keep recent 2500
        await window.sb.from('app_settings').upsert({
          key,
          value: JSON.stringify(list)
        }, { onConflict: 'key' });
      } catch(e) {}
    },

    async getVisitsForUser(userId, monthStr) {
      // 1. Try central app_settings
      try {
        if (window.sb) {
          const key = `uh_audit_visits_${monthStr}`;
          const { data: rows } = await window.sb.from('app_settings').select('value').eq('key', key).limit(1);
          if (rows?.[0]?.value) {
            const list = JSON.parse(rows[0].value);
            const userVisits = list.filter(v => v.userId === userId);
            if (userVisits.length > 0) return userVisits;
          }
        }
      } catch(e) {}

      // 2. Fallback to localStorage
      try {
        const key = `uh_audit_pages_${userId}_${monthStr}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
      } catch(e) {
        return [];
      }
    }
  };

  // ═════════════════════════════════════════════════════════════
  // 4. MONTHLY USER AUDIT MODAL (For Praveen / Developer)
  // ═════════════════════════════════════════════════════════════
  window.openUserAuditModal = async function(userId, displayName, role) {
    const existing = document.getElementById('userAuditModalOverlay');
    if (existing) existing.remove();

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

    // 1. Fetch daily activity logs for this user across this month
    let dailyRecords = [];
    try {
      if (window.sb) {
        const { data } = await window.sb.from('user_activity_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('log_date', `${monthStr}-01`)
          .lte('log_date', `${monthStr}-31`)
          .order('log_date', { ascending: false });
        if (data && data.length) dailyRecords = data;
      }
    } catch(e) {}

    // Fallback to localStorage if no DB rows
    if (!dailyRecords.length) {
      try {
        const local = JSON.parse(localStorage.getItem('uh_user_activity_logs') || '{}');
        Object.keys(local).forEach(date => {
          if (date.startsWith(monthStr) && local[date][userId]) {
            const r = local[date][userId];
            dailyRecords.push({
              log_date: date,
              login_count: r.loginCount || 1,
              active_seconds: r.activeSeconds || 0,
              first_login_at: r.firstLoginAt,
              last_active_at: r.lastActiveAt
            });
          }
        });
        dailyRecords.sort((a,b) => b.log_date.localeCompare(a.log_date));
      } catch(e) {}
    }

    // 2. Fetch page visits
    const visits = await window.UserPageAudit.getVisitsForUser(userId, monthStr);

    // Metrics calculation
    const totalDaysLoggedIn = dailyRecords.length;
    const totalSecondsOnline = dailyRecords.reduce((sum, r) => sum + (r.active_seconds || 0), 0);
    const totalLoginsCount = dailyRecords.reduce((sum, r) => sum + (r.login_count || 1), 0);
    const avgSecsPerActiveDay = totalDaysLoggedIn > 0 ? Math.round(totalSecondsOnline / totalDaysLoggedIn) : 0;

    const fmtHoursMins = (sec) => {
      sec = Math.max(0, Math.floor(sec || 0));
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m ${sec % 60}s`;
    };

    // Summarize page counts
    const pageCounts = {};
    visits.forEach(v => {
      pageCounts[v.page] = (pageCounts[v.page] || 0) + 1;
    });
    const sortedPages = Object.entries(pageCounts).sort((a,b) => b[1] - a[1]);

    const PAGE_HUMAN_NAMES = {
      'bookings': '📅 Bookings / Calendar',
      'calendar': '🗓️ Timeline Gantt View',
      'rooms': '🏢 Properties & Rates',
      'flats': '🛏️ Flat Status & Cleaning',
      'expenses': '🧾 Expenses & Outflows',
      'claims': '💰 TUHH-OD & Finances',
      'employees': '👥 HRMS Staff Roster',
      'attendance': '📋 Attendance Log',
      'tasks': '🧰 Task Manager',
      'employee-ledger': '📒 Cleaner & Staff Ledger',
      'whatsapp-hub': '📱 WhatsApp Hub',
      'laundry': '🧺 Laundry Operations',
      'maintenance': '🔧 Maintenance Tickets',
      'ca-audit': '💼 GST & Audit Pack',
      'analytics': '📊 Financial Analytics',
      'daily-report': '📄 Daily Booking Report',
      'user-mgmt': '👤 User Management',
      'settings': '⚙️ Global Settings',
      'help': '❓ Operating Guide'
    };

    bodyEl.innerHTML = `
      <!-- KPI CARDS -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:12px;margin-bottom:20px;">
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:900;color:#15803D;">${totalDaysLoggedIn}</div>
          <div style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase;margin-top:2px;">Days Active</div>
          <div style="font-size:10px;color:#64748B;margin-top:2px;">in this month</div>
        </div>

        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#1D4ED8;">${fmtHoursMins(totalSecondsOnline)}</div>
          <div style="font-size:11px;font-weight:800;color:#1E40AF;text-transform:uppercase;margin-top:2px;">Total Online Time</div>
          <div style="font-size:10px;color:#64748B;margin-top:2px;">Screen duration</div>
        </div>

        <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:24px;font-weight:900;color:#C2410C;">${totalLoginsCount}</div>
          <div style="font-size:11px;font-weight:800;color:#9A3412;text-transform:uppercase;margin-top:2px;">Total Logins</div>
          <div style="font-size:10px;color:#64748B;margin-top:2px;">Browser sessions</div>
        </div>

        <div style="background:#F5F3FF;border:1px solid #DDD6FE;border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#6D28D9;">${fmtHoursMins(avgSecsPerActiveDay)}</div>
          <div style="font-size:11px;font-weight:800;color:#5B21B6;text-transform:uppercase;margin-top:2px;">Avg Daily Time</div>
          <div style="font-size:10px;color:#64748B;margin-top:2px;">per active day</div>
        </div>
      </div>

      <!-- PAGES VISITED SECTION -->
      <div style="margin-bottom:24px;">
        <div style="font-size:13px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
          <span>🧭 Pages Visited Breakdown</span>
          <span style="font-size:11.5px;font-weight:600;color:#64748B;text-transform:none;">${visits.length} total page actions</span>
        </div>

        ${sortedPages.length > 0 ? `
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(210px, 1fr));gap:8px;">
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
            No specific page navigation tracked yet for this period. As the user navigates, pages will record in real-time.
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
            <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:left;">
              <thead>
                <tr style="background:#F1F5F9;color:#475569;font-weight:800;border-bottom:1px solid #CBD5E1;">
                  <th style="padding:10px 14px;">Date</th>
                  <th style="padding:10px 14px;">First Login</th>
                  <th style="padding:10px 14px;">Last Active</th>
                  <th style="padding:10px 14px;text-align:center;">Sessions</th>
                  <th style="padding:10px 14px;text-align:right;">Active Screen Time</th>
                </tr>
              </thead>
              <tbody>
                ${dailyRecords.map((r, i) => {
                  const dObj = new Date(r.log_date);
                  const dayName = dObj.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
                  const firstT = r.first_login_at ? new Date(r.first_login_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                  const lastT = r.last_active_at ? new Date(r.last_active_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
                  return `
                    <tr style="border-bottom:1px solid #F1F5F9;${i%2===0 ? 'background:#FFFFFF;' : 'background:#FAFAFA;'}">
                      <td style="padding:10px 14px;font-weight:800;color:#0F172A;">
                        ${dayName}
                      </td>
                      <td style="padding:10px 14px;color:#64748B;">
                        🕐 ${firstT}
                      </td>
                      <td style="padding:10px 14px;color:#64748B;">
                        ⏱ ${lastT}
                      </td>
                      <td style="padding:10px 14px;text-align:center;">
                        <span style="background:#F1F5F9;padding:2px 8px;border-radius:6px;font-weight:700;color:#334155;">
                          ${r.login_count || 1}x
                        </span>
                      </td>
                      <td style="padding:10px 14px;text-align:right;font-weight:900;color:#059669;">
                        ${fmtHoursMins(r.active_seconds)}
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

  // Hook into UserActivityTracker.recordLogin
  const checkAndHookTracker = () => {
    if (window.UserActivityTracker && !window.UserActivityTracker._auditHooked) {
      window.UserActivityTracker._auditHooked = true;
      const origRecordLogin = window.UserActivityTracker.recordLogin.bind(window.UserActivityTracker);
      window.UserActivityTracker.recordLogin = async function(userId, displayName, role) {
        await origRecordLogin(userId, displayName, role);
        if (role && role !== 'developer') {
          await window.DevLoginAlert.notifyDevOnLogin(userId, displayName, role);
        }
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
        }
      };
      wrappedNavigate._auditHooked = true;
      window.navigate = wrappedNavigate;
    }
  };

  // Run hooks on load and DOMContentLoaded
  checkAndHookTracker();
  checkAndHookNavigate();
  document.addEventListener('DOMContentLoaded', () => {
    checkAndHookTracker();
    checkAndHookNavigate();
  });

  // Start poller for developer alerts
  setInterval(() => {
    if (window.SESSION?.role === 'developer' && window.DevLoginAlert?.pollNewAlertsForDev) {
      window.DevLoginAlert.pollNewAlertsForDev();
    }
  }, 25000);

  // ═════════════════════════════════════════════════════════════
  // 6. RENDER ALERTS TAB IN USER MANAGEMENT
  // ═════════════════════════════════════════════════════════════
  window.renderAlertsTabContent = async function() {
    const el = document.getElementById('alertsTabContainer');
    if (!el) return;
    el.innerHTML = '<div style="text-align:center;padding:24px;color:#64748B;">⏳ Loading login alerts...</div>';

    const alerts = await window.DevLoginAlert.fetchAlerts(100);
    if (!alerts.length) {
      el.innerHTML = `
        <div style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:12px;padding:32px;text-align:center;color:#94A3B8;">
          <div style="font-size:28px;margin-bottom:8px;">🔔</div>
          <div style="font-size:14px;font-weight:700;color:#1E293B;">No Login Alerts Recorded Yet</div>
          <div style="font-size:12px;color:#64748B;margin-top:4px;">When any staff or user logs in, Praveen will receive an alert here in real time.</div>
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
        a.user_role === 'manager' ? '💼 Manager' :
        a.user_role === 'booking_staff' ? '📅 Staff' : (a.user_role || 'Staff');

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
          🔔 Real-Time Login Alerts (Praveen / Developer Only)
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

  console.log('✅ Real-time Dev Login Alerts & User Audit System active');
})();
