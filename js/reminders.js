/**
 * Reminders Module
 * Payment/ID/Custom reminders with dashboard bell alerts
 */

// ═══ SHOW REMINDER MODAL (from booking) ═══
window.showReminderModal = async function(bookingId) {
  const { data: bk } = await sb.from('guest_register')
    .select('booking_id, guest_name, phone, total_amount, check_in, check_out, room_id')
    .eq('booking_id', bookingId).single();
  
  if (!bk) { fsn.error('Error', 'Booking not found'); return; }

  // Get existing pending reminders
  const { data: existing } = await sb.from('reminders')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('is_resolved', false)
    .order('reminder_time');

  // Calculate default reminder time (tomorrow 9 AM)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const defaultDT = tomorrow.toISOString().slice(0, 16);

  // Get pending amount
  const { data: pays } = await sb.from('payment_history')
    .select('amount').eq('booking_id', bookingId).neq('verification_status', 'rejected');
  const paid = (pays || []).reduce((s, p) => s + (p.amount || 0), 0);
  const due = Math.max((bk.total_amount || 0) - paid, 0);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  const q = String.fromCharCode(39);
  
  modal.innerHTML = `
    <div class="modal-box" style="max-width:550px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>🔔 Set Reminder</h2>
      <div style="background:#F0F9FF;padding:10px;border-radius:6px;margin:12px 0;font-size:13px;">
        <strong>${bk.guest_name}</strong> — ${bk.room_id}<br>
        <small>${bk.check_in} to ${bk.check_out || 'Open'}</small>
        ${due > 0 ? `<br><strong style="color:#DC2626;">Due: ₹${due.toLocaleString('en-IN')}</strong>` : ''}
      </div>

      ${existing && existing.length > 0 ? `
        <div style="background:#FEF3C7;padding:10px;border-radius:6px;margin:12px 0;">
          <div style="font-weight:700;color:#B45309;font-size:12px;margin-bottom:6px;">⏰ Existing Reminders (${existing.length}):</div>
          ${existing.map(r => `
            <div style="font-size:12px;padding:4px;background:#fff;border-radius:4px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
              <span>${r.reminder_type === 'payment' ? '💰' : r.reminder_type === 'id' ? '🪪' : r.reminder_type === 'checkout' ? '🚪' : '📌'} 
              ${r.reminder_note || r.reminder_type}${r.amount ? ' (₹' + r.amount + ')' : ''}<br>
              <small style="color:#666;">${new Date(r.reminder_time).toLocaleString('en-IN')}</small></span>
              <button onclick="resolveReminder(${r.id}, ${q}${bookingId}${q})" style="background:#059669;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">✓ Done</button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="form-group">
        <label>Reminder Type</label>
        <select id="remType" onchange="updateReminderNote()">
          <option value="payment" ${due > 0 ? 'selected' : ''}>💰 Payment Collection</option>
          <option value="id">🪪 ID Proof Collection</option>
          <option value="checkout">🚪 Checkout Reminder</option>
          <option value="custom">📌 Custom Note</option>
        </select>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Date & Time</label>
          <input type="datetime-local" id="remTime" value="${defaultDT}" />
        </div>
        <div class="form-group" id="remAmtGroup">
          <label>Amount (₹)</label>
          <input type="number" id="remAmt" value="${due}" placeholder="0" />
        </div>
      </div>

      <div class="form-group">
        <label>Note</label>
        <input type="text" id="remNote" placeholder="Guest ne 9 AM tak dene ka bola hai" />
      </div>

      <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;">
        <button onclick="setQuickReminderTime('9am')" class="btn-sm outline">🌅 9 AM</button>
        <button onclick="setQuickReminderTime('12pm')" class="btn-sm outline">☀️ 12 PM</button>
        <button onclick="setQuickReminderTime('6pm')" class="btn-sm outline">🌇 6 PM</button>
        <button onclick="setQuickReminderTime('tomorrow9')" class="btn-sm outline">📅 Tomorrow 9 AM</button>
      </div>

      <button onclick="saveReminder('${bookingId}')" style="width:100%;margin-top:14px;background:#7C3AED;color:#fff;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:700;">
        🔔 Save Reminder
      </button>
      <div id="remErr" style="margin-top:8px;"></div>
    </div>
  `;
  document.body.appendChild(modal);
  updateReminderNote();
};

// Quick time setters
window.setQuickReminderTime = function(preset) {
  const d = new Date();
  if (preset === '9am') d.setHours(9, 0, 0, 0);
  else if (preset === '12pm') d.setHours(12, 0, 0, 0);
  else if (preset === '6pm') d.setHours(18, 0, 0, 0);
  else if (preset === 'tomorrow9') {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  }
  // If time already passed today, move to tomorrow
  if (d < new Date() && preset !== 'tomorrow9') {
    d.setDate(d.getDate() + 1);
  }
  document.getElementById('remTime').value = d.toISOString().slice(0, 16);
};

// Update note placeholder based on type
window.updateReminderNote = function() {
  const type = document.getElementById('remType').value;
  const noteEl = document.getElementById('remNote');
  const amtGroup = document.getElementById('remAmtGroup');
  
  const placeholders = {
    payment: 'e.g. Guest ne 9 AM tak payment karne ka bola',
    id: 'e.g. Guest ne subah ID proof denga',
    checkout: 'e.g. 11 AM checkout confirm karna hai',
    custom: 'e.g. Extra bed request follow up'
  };
  noteEl.placeholder = placeholders[type] || 'Custom note';
  
  amtGroup.style.display = type === 'payment' ? 'block' : 'none';
};

// ═══ SAVE REMINDER ═══
window.saveReminder = async function(bookingId) {
  const type = document.getElementById('remType').value;
  const time = document.getElementById('remTime').value;
  const note = document.getElementById('remNote').value.trim();
  const amt = parseFloat(document.getElementById('remAmt').value) || 0;

  if (!time) {
    document.getElementById('remErr').innerHTML = '<div class="error">Time required</div>';
    return;
  }

  const { error } = await sb.from('reminders').insert({
    booking_id: bookingId,
    reminder_type: type,
    reminder_time: new Date(time).toISOString(),
    reminder_note: note || null,
    amount: type === 'payment' ? amt : 0,
    created_by: SESSION.userId
  });

  if (error) {
    document.getElementById('remErr').innerHTML = `<div class="error">${error.message}</div>`;
    return;
  }

  fsn.success('Success', '🔔 Reminder set!');
  document.querySelector('.modal-overlay').remove();
  loadPendingRemindersBadge(); // Update bell
};

// ═══ RESOLVE REMINDER ═══
window.resolveReminder = async function(reminderId, bookingId) {
  const { error } = await sb.from('reminders').update({
    is_resolved: true,
    resolved_at: new Date().toISOString(),
    resolved_by: SESSION.userId
  }).eq('id', reminderId);

  if (error) { fsn.error('Error', error.message); return; }
  fsn.success('Resolved', '✅ Marked as done');
  
  document.querySelector('.modal-overlay')?.remove();
  loadPendingRemindersBadge();
  if (SESSION.currentPage === 'reminders') renderReminders();
};

// ═══ DELETE REMINDER (developer only) ═══
window.deleteReminder = async function(reminderId) {
  if (!confirm('Delete this reminder?')) return;
  const { error } = await sb.from('reminders').delete().eq('id', reminderId);
  if (error) { fsn.error('Error', error.message); return; }
  fsn.success('Deleted', '✅ Reminder deleted');
  loadPendingRemindersBadge();
  if (SESSION.currentPage === 'reminders') renderReminders();
};

// ═══ REMINDERS PAGE ═══
async function renderReminders() {
  renderShell(`<div class="loading">Loading reminders...</div>`, 'reminders');

  const now = new Date().toISOString();
  
  // Fetch reminders (without join due to no foreign key)
  const [{ data: pendingRaw }, { data: overdueRaw }, { data: resolvedRaw }] = await Promise.all([
    sb.from('reminders').select('*').eq('is_resolved', false).gte('reminder_time', now).order('reminder_time'),
    sb.from('reminders').select('*').eq('is_resolved', false).lt('reminder_time', now).order('reminder_time', { ascending: false }),
    sb.from('reminders').select('*').eq('is_resolved', true).order('resolved_at', { ascending: false }).limit(20)
  ]);

  // Manual join with bookings
  const allBkIds = [...new Set([
    ...(pendingRaw || []).map(r => r.booking_id),
    ...(overdueRaw || []).map(r => r.booking_id),
    ...(resolvedRaw || []).map(r => r.booking_id)
  ])];

  let bkMap = {};
  if (allBkIds.length > 0) {
    const { data: bks } = await sb.from('guest_register')
      .select('booking_id, guest_name, phone, room_id, total_amount')
      .in('booking_id', allBkIds);
    (bks || []).forEach(b => bkMap[b.booking_id] = b);
  }

  const attachBooking = arr => (arr || []).map(r => ({ ...r, guest_register: bkMap[r.booking_id] || {} }));
  const pending = attachBooking(pendingRaw);
  const overdue = attachBooking(overdueRaw);
  const resolved = attachBooking(resolvedRaw);

  const typeIcon = t => ({ payment: '💰', id: '🪪', checkout: '🚪', custom: '📌' })[t] || '📌';
  const typeName = t => ({ payment: 'Payment', id: 'ID Proof', checkout: 'Checkout', custom: 'Custom' })[t] || t;

  const renderRow = (r, isOverdue) => {
    const gr = r.guest_register || {};
    const time = new Date(r.reminder_time);
    const timeStr = time.toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
    return `
      <div style="background:${isOverdue ? '#FEE2E2' : '#fff'};border:1px solid ${isOverdue ? '#DC2626' : '#E5E7EB'};padding:12px;border-radius:8px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;">
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:700;">
              ${typeIcon(r.reminder_type)} ${typeName(r.reminder_type)}
              ${r.amount > 0 ? ` — ₹${r.amount.toLocaleString('en-IN')}` : ''}
              ${isOverdue ? '<span style="background:#DC2626;color:#fff;padding:2px 6px;border-radius:10px;font-size:10px;margin-left:6px;">OVERDUE</span>' : ''}
            </div>
            <div style="font-size:13px;color:#374151;margin-top:4px;">
              <strong>${gr.guest_name || 'Unknown'}</strong> — ${gr.room_id || '-'}
              ${gr.phone ? ` · 📞 ${gr.phone}` : ''}
            </div>
            ${r.reminder_note ? `<div style="font-size:12px;color:#6B7280;margin-top:4px;font-style:italic;">"${r.reminder_note}"</div>` : ''}
            <div style="font-size:11px;color:${isOverdue ? '#DC2626' : '#059669'};margin-top:6px;font-weight:600;">
              ⏰ ${timeStr}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <button onclick="resolveReminder(${r.id}, '${r.booking_id}')" 
                    style="background:#059669;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;">
              ✓ Done
            </button>
            ${gr.phone ? `<button onclick="window.open('https://wa.me/91${gr.phone.replace(/[^0-9]/g, '')}', '_blank')" 
                    style="background:#25D366;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;">
              📱 WA
            </button>` : ''}
            ${window.canDelete && window.canDelete() ? `<button onclick="deleteReminder(${r.id})" 
                    style="background:#DC2626;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:11px;">
              🗑️
            </button>` : ''}
          </div>
        </div>
      </div>
    `;
  };

  renderShell(`
    <div class="card">
      <h1>🔔 Reminders & Alarms</h1>
      <div class="sub">Manage payment, ID collection & custom reminders</div>
    </div>

    ${overdue && overdue.length > 0 ? `
      <div class="card" style="border-left:4px solid #DC2626;background:#FEF2F2;">
        <div class="section-title" style="color:#DC2626;">🚨 Overdue (${overdue.length})</div>
        ${overdue.map(r => renderRow(r, true)).join('')}
      </div>
    ` : ''}

    <div class="card">
      <div class="section-title">⏰ Pending Reminders (${(pending || []).length})</div>
      ${(pending || []).length === 0 
        ? '<div class="sub">No upcoming reminders ✅</div>' 
        : pending.map(r => renderRow(r, false)).join('')}
    </div>

    <div class="card">
      <div class="section-title">✅ Recently Resolved (${(resolved || []).length})</div>
      ${(resolved || []).length === 0 
        ? '<div class="sub">None yet</div>' 
        : `<div style="max-height:300px;overflow-y:auto;">
            ${resolved.map(r => `
              <div style="padding:8px;border-bottom:1px solid #E5E7EB;font-size:12px;">
                ${typeIcon(r.reminder_type)} <strong>${r.guest_register?.guest_name || '-'}</strong> 
                (${r.guest_register?.room_id || '-'}) 
                — <span style="color:#059669;">Resolved ${new Date(r.resolved_at).toLocaleString('en-IN', {day:'2-digit', month:'short'})}</span>
              </div>
            `).join('')}
          </div>`}
    </div>
  `, 'reminders');
}

// ═══ LOAD PENDING COUNT (for badge on bell) ═══
async function loadPendingRemindersBadge() {
  const now = new Date().toISOString();
  const { count } = await sb.from('reminders')
    .select('*', { count: 'exact', head: true })
    .eq('is_resolved', false)
    .lte('reminder_time', now); // Overdue or due now

  const badge = document.getElementById('reminderBadge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Auto-refresh every 60 seconds
setInterval(loadPendingRemindersBadge, 60000);

// Initial load
if (typeof SESSION !== 'undefined' && SESSION.userId) {
  setTimeout(loadPendingRemindersBadge, 2000);
}

window.renderReminders = renderReminders;
window.loadPendingRemindersBadge = loadPendingRemindersBadge;
