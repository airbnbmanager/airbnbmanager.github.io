// ═══════════════════════════════════════════════════════════
// 📱 WHATSAPP COMMUNICATION HUB
// ═══════════════════════════════════════════════════════════

(function() {
  const HUB = {
    config: null,
    templates: [],
    logs: [],
    scheduled: [],
    activeTab: 'auto',
    scheduler: null
  };

  window.setHubTab = function(tab) {
    HUB.activeTab = tab;
    renderHubBody();
  };

  // ─── Load config from DB ───
  async function loadConfig() {
    const { data } = await sb.from('whatsapp_config').select('*').eq('id', 1).single();
    HUB.config = data || {};
    return HUB.config;
  }

  // ─── Load templates ───
  async function loadTemplates() {
    const { data } = await sb.from('whatsapp_templates').select('*').eq('is_active', true).order('id');
    HUB.templates = data || [];
    return HUB.templates;
  }

  // ─── Load recent logs ───
  async function loadLogs(limit = 100) {
    const { data } = await sb.from('whatsapp_log')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit);
    HUB.logs = data || [];
    return HUB.logs;
  }

  // ─── Fetch scheduled messages (next 24hrs) ───
  async function fetchScheduled() {
    if (!HUB.config) return [];
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const today = now.toISOString().slice(0, 10);
    const tomorrow = in24h.toISOString().slice(0, 10);

    // Fetch upcoming bookings
    const { data: bookings } = await sb.from('guest_register')
      .select('booking_id, guest_name, phone, check_in, check_in_time, check_out, check_out_time, room_id, rooms(nickname, unit_no, property_name, wifi_ssid, wifi_password, key_number)')
      .gte('check_in', today)
      .lte('check_in', tomorrow)
      .neq('is_cancelled', true)
      .neq('verification_status', 'rejected');

    const { data: checkoutBks } = await sb.from('guest_register')
      .select('booking_id, guest_name, phone, check_in, check_out, check_out_time, room_id, rooms(nickname, unit_no, property_name)')
      .eq('check_out', today)
      .neq('is_cancelled', true)
      .neq('verification_status', 'rejected');

    const scheduled = [];

    // Arrival details — 1 hr before check-in
    (bookings || []).forEach(b => {
      if (!b.phone || !b.check_in_time) return;
      const checkInDT = new Date(b.check_in + 'T' + b.check_in_time);
      const sendAt = new Date(checkInDT.getTime() - (HUB.config.arrival_before_minutes || 60) * 60 * 1000);
      if (sendAt > now && sendAt < in24h) {
        scheduled.push({
          when: sendAt,
          template: 'arrival_details',
          booking: b,
          type: '🔑 Arrival Details'
        });
      }
    });

    // Checkout reminder — today at configured hour
    (checkoutBks || []).forEach(b => {
      if (!b.phone) return;
      const sendAt = new Date(today + 'T' + String(HUB.config.checkout_send_hour || 8).padStart(2, '0') + ':00:00');
      if (sendAt > now && sendAt < in24h) {
        scheduled.push({
          when: sendAt,
          template: 'checkout_reminder',
          booking: b,
          type: '👋 Checkout Reminder'
        });
      }
    });

    scheduled.sort((a, b) => a.when - b.when);
    HUB.scheduled = scheduled;
    return scheduled;
  }

  // ─── Substitute template variables ───
  function fillTemplate(template, booking) {
    if (!template || !booking) return '';
    const room = booking.rooms || {};
    const propName = room.property_name || room.nickname || booking.room_id;
    const flat = room.unit_no || booking.room_id;

    let text = template.body_text;
    const vals = {
      guest_name: booking.guest_name || 'Guest',
      property_name: propName,
      flat_number: flat,
      key_info: room.key_number || 'Info shared separately',
      wifi_ssid: room.wifi_ssid || 'Ask caretaker',
      wifi_password: room.wifi_password || 'Ask caretaker',
      check_in: booking.check_in || '',
      check_out: booking.check_out || ''
    };

    (template.variables || []).forEach((v, i) => {
      const placeholder = '{{' + (i + 1) + '}}';
      text = text.split(placeholder).join(vals[v] || '');
    });
    return text;
  }

  // ─── Send message (via Edge Function or dry-run) ───
  async function sendMessage(templateName, booking, triggeredBy) {
    const template = HUB.templates.find(t => t.template_name === templateName);
    if (!template) return { ok: false, error: 'Template not found' };
    if (!booking.phone) return { ok: false, error: 'No phone' };

    const preview = fillTemplate(template, booking);
    const isDryRun = HUB.config?.dry_run_mode !== false;

    // Log attempt
    const logEntry = {
      booking_id: booking.booking_id,
      guest_name: booking.guest_name,
      phone: booking.phone,
      template_name: templateName,
      message_preview: preview.substring(0, 500),
      is_dry_run: isDryRun,
      triggered_by: triggeredBy || 'auto',
      triggered_by_user: SESSION?.userId || null,
      status: isDryRun ? 'sent' : 'pending'
    };

    if (isDryRun || !HUB.config?.api_token) {
      // Dry run — just log
      logEntry.status = 'sent';
      logEntry.api_response = { dry_run: true, note: 'Not actually sent - dry run mode' };
      const { data } = await sb.from('whatsapp_log').insert(logEntry).select().single();
      return { ok: true, dry_run: true, log: data };
    }

    // Real send via Edge Function
    try {
      const { data, error } = await sb.functions.invoke('send-whatsapp', {
        body: {
          phone: booking.phone,
          template_name: templateName,
          preview: preview,
          booking_id: booking.booking_id
        }
      });

      if (error) throw error;

      logEntry.status = 'sent';
      logEntry.api_response = data;
      await sb.from('whatsapp_log').insert(logEntry);
      return { ok: true, response: data };
    } catch (e) {
      logEntry.status = 'failed';
      logEntry.error_message = e.message;
      await sb.from('whatsapp_log').insert(logEntry);
      return { ok: false, error: e.message };
    }
  }

  window.hubSendMessage = sendMessage;

  // ─── Check for duplicates (last 12 hrs) ───
  async function alreadySent(bookingId, templateName) {
    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data } = await sb.from('whatsapp_log')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('template_name', templateName)
      .eq('status', 'sent')
      .gte('sent_at', cutoff)
      .limit(1);
    return (data || []).length > 0;
  }

  // ─── Auto-scheduler tick ───
  async function schedulerTick() {
    try {
      await loadConfig();
      if (!HUB.config?.auto_send_enabled) return;

      await loadTemplates();

      const now = new Date();
      const nowTime = now.toTimeString().slice(0, 5);
      const today = now.toISOString().slice(0, 10);

      // 1) Arrival details (1hr before check-in)
      if (HUB.config.send_arrival) {
        const before = HUB.config.arrival_before_minutes || 60;
        const targetTime = new Date(now.getTime() + before * 60 * 1000);
        const targetDate = targetTime.toISOString().slice(0, 10);
        const targetHM = targetTime.toTimeString().slice(0, 5);

        const { data: arrBks } = await sb.from('guest_register')
          .select('booking_id, guest_name, phone, check_in, check_in_time, room_id, rooms(nickname, unit_no, property_name, wifi_ssid, wifi_password, key_number)')
          .eq('check_in', targetDate)
          .neq('is_cancelled', true)
          .neq('verification_status', 'rejected');

        for (const b of (arrBks || [])) {
          if (!b.phone) continue;
          const bkTime = b.check_in_time || '14:00';
          // Send if within 15 min window of "1 hr before"
          const bkDT = new Date(b.check_in + 'T' + bkTime);
          const minDiff = (bkDT - now) / 60000;
          if (minDiff <= before && minDiff >= before - 15) {
            const dupe = await alreadySent(b.booking_id, 'arrival_details');
            if (!dupe) {
              await sendMessage('arrival_details', b, 'auto');
              console.log('📱 Auto-sent arrival details to', b.guest_name);
            }
          }
        }
      }

      // 2) Checkout reminder (day of, at configured hour)
      if (HUB.config.send_checkout) {
        const targetHour = HUB.config.checkout_send_hour || 8;
        const currentHour = now.getHours();
        // Send within 30 min of target hour
        if (currentHour === targetHour && now.getMinutes() < 30) {
          const { data: coBks } = await sb.from('guest_register')
            .select('booking_id, guest_name, phone, check_out, room_id, rooms(nickname, unit_no, property_name)')
            .eq('check_out', today)
            .neq('is_cancelled', true)
            .neq('verification_status', 'rejected');

          for (const b of (coBks || [])) {
            if (!b.phone) continue;
            const dupe = await alreadySent(b.booking_id, 'checkout_reminder');
            if (!dupe) {
              await sendMessage('checkout_reminder', b, 'auto');
              console.log('📱 Auto-sent checkout reminder to', b.guest_name);
            }
          }
        }
      }
    } catch (e) {
      console.warn('WhatsApp scheduler tick failed:', e);
    }
  }

  // ─── Trigger on new booking (welcome message) ───
  window.triggerWelcomeMessage = async function(bookingId) {
    await loadConfig();
    if (!HUB.config?.auto_send_enabled || !HUB.config?.send_welcome) return;
    await loadTemplates();

    const { data: b } = await sb.from('guest_register')
      .select('booking_id, guest_name, phone, check_in, check_out, room_id, rooms(nickname, unit_no, property_name)')
      .eq('booking_id', bookingId).single();
    if (!b || !b.phone) return;

    const dupe = await alreadySent(bookingId, 'booking_welcome');
    if (!dupe) {
      await sendMessage('booking_welcome', b, 'auto');
      console.log('📱 Welcome sent to', b.guest_name);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // UI RENDERING
  // ═══════════════════════════════════════════════════════════
  async function renderWhatsAppHub() {
    if (!['developer', 'owner'].includes(SESSION.role)) {
      renderShell('<div class="card"><div class="error">❌ Only Owner/Developer</div></div>', 'whatsapp-hub');
      return;
    }

    renderShell('<div class="loading">📱 Loading Communication Hub...</div>', 'whatsapp-hub');

    await Promise.all([loadConfig(), loadTemplates(), loadLogs(50), fetchScheduled()]);

    const enabled = HUB.config?.auto_send_enabled;
    const dryRun = HUB.config?.dry_run_mode !== false;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = HUB.logs.filter(l => l.sent_at && l.sent_at.slice(0, 10) === todayStr);
    const sentToday = todayLogs.filter(l => l.status === 'sent').length;
    const failedToday = todayLogs.filter(l => l.status === 'failed').length;

    const html =
      '<div class="wrap">' +
        '<h1>📱 Communication Hub</h1>' +
        '<p style="color:#888;">Auto WhatsApp messages for bookings — welcome, arrival, checkout</p>' +

        // Status bar
        '<div class="card" style="border-left:4px solid ' + (enabled ? '#0A7D1A' : '#DC2626') + ';">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">' +
            '<div><div style="font-size:11px;color:#888;">AUTO-SEND</div>' +
              '<div style="font-size:18px;font-weight:800;color:' + (enabled ? '#0A7D1A' : '#DC2626') + ';">' +
                (enabled ? '🟢 ENABLED' : '🔴 DISABLED') +
              '</div></div>' +
            '<div><div style="font-size:11px;color:#888;">MODE</div>' +
              '<div style="font-size:18px;font-weight:800;color:' + (dryRun ? '#F59E0B' : '#0A7D1A') + ';">' +
                (dryRun ? '🧪 DRY RUN' : '📡 LIVE') +
              '</div></div>' +
            '<div><div style="font-size:11px;color:#888;">SENT TODAY</div>' +
              '<div style="font-size:18px;font-weight:800;">' + sentToday + '</div></div>' +
            '<div><div style="font-size:11px;color:#888;">FAILED TODAY</div>' +
              '<div style="font-size:18px;font-weight:800;color:' + (failedToday > 0 ? '#DC2626' : '#888') + ';">' + failedToday + '</div></div>' +
            '<div><div style="font-size:11px;color:#888;">SCHEDULED (24h)</div>' +
              '<div style="font-size:18px;font-weight:800;color:#3B82F6;">' + HUB.scheduled.length + '</div></div>' +
          '</div>' +
        '</div>' +

        // Tabs
        '<div style="display:flex;gap:6px;margin:16px 0;border-bottom:2px solid #eee;flex-wrap:wrap;">' +
          ['auto', 'scheduled', 'log', 'templates', 'settings'].map(t => {
            const labels = { auto: '🎯 Overview', scheduled: '⏰ Scheduled', log: '📋 Message Log', templates: '📝 Templates', settings: '⚙️ Settings' };
            const active = HUB.activeTab === t;
            return '<button onclick="setHubTab(\'' + t + '\')" style="padding:8px 16px;border:none;background:' + (active ? '#FF385C' : 'transparent') + ';color:' + (active ? '#fff' : '#666') + ';border-radius:6px 6px 0 0;cursor:pointer;font-weight:600;">' + labels[t] + '</button>';
          }).join('') +
        '</div>' +

        '<div id="hubBody"></div>' +
      '</div>';

    renderShell(html, 'whatsapp-hub');
    renderHubBody();
  }

  async function renderHubBody() {
    const el = document.getElementById('hubBody');
    if (!el) return;

    if (HUB.activeTab === 'auto') el.innerHTML = renderOverviewTab();
    else if (HUB.activeTab === 'scheduled') el.innerHTML = renderScheduledTab();
    else if (HUB.activeTab === 'log') el.innerHTML = renderLogTab();
    else if (HUB.activeTab === 'templates') el.innerHTML = renderTemplatesTab();
    else if (HUB.activeTab === 'settings') el.innerHTML = renderSettingsTab();
  }

  function renderOverviewTab() {
    const enabled = HUB.config?.auto_send_enabled;
    const activeTemplates = HUB.templates.filter(t => t.auto_send);

    return '<div class="card">' +
      '<div class="section-title">🎯 Auto-Send Configuration</div>' +

      '<div style="padding:14px;background:' + (enabled ? '#D1FAE5' : '#FEE2E2') + ';border-radius:8px;margin-bottom:16px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;">' +
          '<div>' +
            '<div style="font-weight:700;">' + (enabled ? '✅ Auto-send is ACTIVE' : '❌ Auto-send is DISABLED') + '</div>' +
            '<div style="font-size:12px;color:#666;margin-top:4px;">' +
              (enabled ? 'Messages are being sent automatically to guests based on their booking timings' : 'Enable in Settings to activate') +
            '</div>' +
          '</div>' +
          '<button onclick="toggleAutoSend()" class="btn-sm" style="background:' + (enabled ? '#DC2626' : '#0A7D1A') + ';color:#fff;padding:10px 20px;">' +
            (enabled ? '⏸ Disable' : '▶️ Enable') +
          '</button>' +
        '</div>' +
      '</div>' +

      '<h3>Active Auto Templates</h3>' +
      (activeTemplates.length === 0
        ? '<div style="color:#888;padding:20px;text-align:center;">No auto templates enabled</div>'
        : activeTemplates.map(t => {
            const triggerText = {
              'on_booking_created': '🆕 Fires when new booking created',
              'before_check_in_60min': '⏰ Fires 1 hour before check-in',
              'on_checkout_day': '👋 Fires on checkout day morning'
            }[t.trigger_event] || t.trigger_event;

            return '<div style="border:1px solid #eee;border-radius:10px;padding:14px;margin-bottom:10px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                '<strong>' + t.display_name + '</strong>' +
                '<span class="badge blue">' + t.template_name + '</span>' +
              '</div>' +
              '<div style="font-size:12px;color:#666;">' + triggerText + '</div>' +
              '<div style="font-size:11px;color:#888;margin-top:6px;font-family:monospace;background:#f9f9f9;padding:8px;border-radius:6px;white-space:pre-wrap;">' +
                t.body_text.substring(0, 200) + (t.body_text.length > 200 ? '...' : '') +
              '</div>' +
            '</div>';
          }).join('')) +
    '</div>';
  }

  function renderScheduledTab() {
    if (HUB.scheduled.length === 0) {
      return '<div class="card"><div style="text-align:center;padding:30px;color:#888;">No messages scheduled in next 24 hours</div></div>';
    }

    return '<div class="card">' +
      '<div class="section-title">⏰ Next 24 Hours (' + HUB.scheduled.length + ')</div>' +
      HUB.scheduled.map(s => {
        const whenStr = s.when.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
        const propName = s.booking.rooms?.property_name || s.booking.rooms?.nickname || s.booking.room_id;

        return '<div style="border:1px solid #eee;border-radius:10px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">' +
          '<div>' +
            '<div style="font-weight:700;">' + s.type + '</div>' +
            '<div style="font-size:13px;margin-top:2px;">' + s.booking.guest_name + ' → ' + propName + '</div>' +
            '<div style="font-size:11px;color:#888;">📞 ' + (s.booking.phone || 'No phone') + '</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
            '<div style="font-size:12px;color:#3B82F6;font-weight:700;">🕐 ' + whenStr + '</div>' +
            '<button onclick="hubSendNow(\'' + s.template + '\',\'' + s.booking.booking_id + '\')" class="btn-sm" style="background:#0A7D1A;color:#fff;margin-top:6px;">📤 Send Now</button>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  window.hubSendNow = async function(templateName, bookingId) {
    if (!confirm('Send now?')) return;
    const { data: b } = await sb.from('guest_register')
      .select('*, rooms(nickname, unit_no, property_name, wifi_ssid, wifi_password, key_number)')
      .eq('booking_id', bookingId).single();
    if (!b) { fsn.error('Error', 'Booking not found'); return; }

    const result = await sendMessage(templateName, b, 'manual');
    if (result.ok) {
      fsn.success('Sent', result.dry_run ? '🧪 Dry run — logged only' : '✅ Message sent');
      renderWhatsAppHub();
    } else {
      fsn.error('Failed', result.error);
    }
  };

  function renderLogTab() {
    if (HUB.logs.length === 0) {
      return '<div class="card"><div style="text-align:center;padding:30px;color:#888;">No messages yet</div></div>';
    }

    const rows = HUB.logs.map(l => {
      const time = new Date(l.sent_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
      const statusBadge = l.status === 'sent'
        ? '<span class="badge green">✅ Sent</span>'
        : l.status === 'failed'
        ? '<span class="badge red">❌ Failed</span>'
        : '<span class="badge yellow">⏳ Pending</span>';
      const dryRunBadge = l.is_dry_run ? ' <span style="background:#F59E0B;color:#fff;font-size:9px;padding:1px 5px;border-radius:4px;">DRY</span>' : '';
      const triggerBadge = l.triggered_by === 'auto' ? '🤖' : '👤';

      return '<tr>' +
        '<td><small>' + time + '</small></td>' +
        '<td>' + statusBadge + dryRunBadge + '</td>' +
        '<td><small>' + triggerBadge + ' ' + l.template_name + '</small></td>' +
        '<td>' + (l.guest_name || '-') + '</td>' +
        '<td><small>' + (l.phone || '-') + '</small></td>' +
        '<td><small style="color:' + (l.error_message ? '#DC2626' : '#888') + ';">' + (l.error_message || (l.message_preview || '').substring(0, 60) + '...') + '</small></td>' +
      '</tr>';
    }).join('');

    return '<div class="card">' +
      '<div class="section-title">📋 Recent Messages (Last ' + HUB.logs.length + ')</div>' +
      '<div class="table-wrap"><table>' +
        '<thead><tr><th>Time</th><th>Status</th><th>Template</th><th>Guest</th><th>Phone</th><th>Message / Error</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table></div>' +
    '</div>';
  }

  function renderTemplatesTab() {
    return '<div class="card">' +
      '<div class="section-title">📝 Message Templates</div>' +
      '<p style="color:#888;font-size:12px;">These need to be submitted & approved by Meta before going live</p>' +
      HUB.templates.map(t => {
        return '<div style="border:1px solid #eee;border-radius:10px;padding:14px;margin-bottom:12px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
            '<div>' +
              '<strong>' + t.display_name + '</strong>' +
              ' <span class="badge blue">' + t.template_name + '</span>' +
              (t.auto_send ? ' <span class="badge green">AUTO</span>' : '') +
              (t.meta_approved ? ' <span class="badge green">✅ Approved</span>' : ' <span class="badge yellow">⏳ Pending Meta</span>') +
            '</div>' +
          '</div>' +
          '<pre style="background:#f9f9f9;padding:12px;border-radius:6px;font-size:12px;white-space:pre-wrap;font-family:monospace;">' + t.body_text + '</pre>' +
          '<div style="font-size:11px;color:#888;margin-top:6px;">Variables: ' + (t.variables || []).join(', ') + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function renderSettingsTab() {
    const c = HUB.config || {};
    return '<div class="card">' +
      '<div class="section-title">⚙️ Settings</div>' +

      '<div class="form-group">' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
          '<input type="checkbox" id="cfgAutoSend"' + (c.auto_send_enabled ? ' checked' : '') + ' />' +
          '<strong>Master Auto-Send Switch</strong>' +
        '</label>' +
        '<small style="color:#888;">When OFF, no automatic messages are sent</small>' +
      '</div>' +

      '<div class="form-group">' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;">' +
          '<input type="checkbox" id="cfgDryRun"' + (c.dry_run_mode !== false ? ' checked' : '') + ' />' +
          '<strong>🧪 Dry Run Mode</strong>' +
        '</label>' +
        '<small style="color:#888;">Logs messages without actually sending (safe for testing)</small>' +
      '</div>' +

      '<hr style="margin:16px 0;" />' +

      '<h3>Per-Template Auto-Send</h3>' +

      '<div class="form-group">' +
        '<label><input type="checkbox" id="cfgWelcome"' + (c.send_welcome ? ' checked' : '') + ' /> Send Welcome on new booking</label>' +
      '</div>' +
      '<div class="form-group">' +
        '<label><input type="checkbox" id="cfgArrival"' + (c.send_arrival ? ' checked' : '') + ' /> Send Arrival Details before check-in</label>' +
        '<div style="margin-left:24px;font-size:13px;">Send <input type="number" id="cfgArrivalMin" value="' + (c.arrival_before_minutes || 60) + '" style="width:60px;padding:2px 6px;" /> minutes before check-in</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label><input type="checkbox" id="cfgCheckout"' + (c.send_checkout ? ' checked' : '') + ' /> Send Checkout Reminder on checkout day</label>' +
        '<div style="margin-left:24px;font-size:13px;">Send at <input type="number" id="cfgCheckoutHour" value="' + (c.checkout_send_hour || 8) + '" min="0" max="23" style="width:60px;padding:2px 6px;" />:00 hours</div>' +
      '</div>' +

      '<hr style="margin:16px 0;" />' +

      '<h3>🔐 Meta WhatsApp API Credentials</h3>' +
      '<p style="color:#F59E0B;font-size:12px;">⚠️ Keep these secret. Enter only when you have Meta credentials.</p>' +

      '<div class="form-group">' +
        '<label>Phone Number ID</label>' +
        '<input id="cfgPhoneId" value="' + (c.api_phone_id || '') + '" placeholder="Meta phone number ID" />' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Business Account ID</label>' +
        '<input id="cfgBusinessId" value="' + (c.api_business_id || '') + '" placeholder="Meta business account ID" />' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Access Token</label>' +
        '<input id="cfgToken" type="password" value="' + (c.api_token || '') + '" placeholder="Permanent access token" />' +
      '</div>' +

      '<button onclick="saveHubSettings()" style="width:100%;background:#0A7D1A;color:#fff;margin-top:12px;padding:12px;">💾 Save Settings</button>' +

    '</div>';
  }

  window.toggleAutoSend = async function() {
    await sb.from('whatsapp_config').update({
      auto_send_enabled: !HUB.config.auto_send_enabled,
      updated_at: new Date().toISOString(),
      updated_by: SESSION.userId
    }).eq('id', 1);
    fsn.success('Updated', 'Auto-send ' + (!HUB.config.auto_send_enabled ? 'ENABLED' : 'DISABLED'));
    renderWhatsAppHub();
  };

  window.saveHubSettings = async function() {
    const updates = {
      auto_send_enabled: document.getElementById('cfgAutoSend')?.checked || false,
      dry_run_mode: document.getElementById('cfgDryRun')?.checked || false,
      send_welcome: document.getElementById('cfgWelcome')?.checked || false,
      send_arrival: document.getElementById('cfgArrival')?.checked || false,
      send_checkout: document.getElementById('cfgCheckout')?.checked || false,
      arrival_before_minutes: parseInt(document.getElementById('cfgArrivalMin')?.value) || 60,
      checkout_send_hour: parseInt(document.getElementById('cfgCheckoutHour')?.value) || 8,
      api_phone_id: document.getElementById('cfgPhoneId')?.value?.trim() || null,
      api_business_id: document.getElementById('cfgBusinessId')?.value?.trim() || null,
      api_token: document.getElementById('cfgToken')?.value?.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: SESSION.userId
    };
    const { error } = await sb.from('whatsapp_config').update(updates).eq('id', 1);
    if (error) { fsn.error('Error', error.message); return; }
    fsn.success('Saved', 'Settings updated successfully');
    renderWhatsAppHub();
  };

  // ─── Start scheduler ───
  function startScheduler() {
    if (HUB.scheduler) return;
    // Run every 5 min
    HUB.scheduler = setInterval(schedulerTick, 5 * 60 * 1000);
    // Also run once after 30 sec
    setTimeout(schedulerTick, 30000);
    console.log('📱 WhatsApp scheduler started');
  }

  // Auto-start when session ready
  const timer = setInterval(() => {
    if (window.sb && window.SESSION && window.SESSION.role) {
      clearInterval(timer);
      if (['developer', 'owner'].includes(window.SESSION.role)) {
        startScheduler();
      }
    }
  }, 1000);

  window.renderWhatsAppHub = renderWhatsAppHub;
})();
