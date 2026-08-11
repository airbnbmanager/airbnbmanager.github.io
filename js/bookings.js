/**
 * Bookings Module
 * UNIQUE HAVEN HOMES STAY
 */

// ═══ APPROVAL WORKFLOW HELPERS ═══
function isTrustedUser() {
  return ['developer', 'owner'].includes(SESSION.role);
}
// ═══ LOYALTY TIER SYSTEM ═══
window._guestStaysCache = window._guestStaysCache || {};

function getLoyaltyTier(stays) {
  if (stays >= 7) return { tier: 'Platinum', icon: '💎', color: '#8B5CF6', discount: 20 };
  if (stays >= 4) return { tier: 'Gold', icon: '🥇', color: '#F59E0B', discount: 15 };
  if (stays >= 2) return { tier: 'Silver', icon: '🥈', color: '#6B7280', discount: 10 };
  return { tier: 'Bronze', icon: '🥉', color: '#B45309', discount: 0 };
}

async function preloadGuestStays() {
  try {
    const { data } = await sb.from('guest_register')
      .select('phone, guest_name, is_cancelled')
      .neq('is_cancelled', true);
    window._guestStaysCache = {};
    (data || []).forEach(b => {
      const key = (b.phone || b.guest_name || '').trim();
      if (!key) return;
      window._guestStaysCache[key] = (window._guestStaysCache[key] || 0) + 1;
    });
  } catch(e) { console.warn('Loyalty preload failed:', e); }
}

function getGuestTierBadge(guest) {
  const key = (guest.phone || guest.guest_name || '').trim();
  const stays = window._guestStaysCache[key] || 0;
  if (stays < 2) return '';
  const t = getLoyaltyTier(stays);
  return ' <span style="background:' + t.color + ';color:#fff;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700;" title="' + t.tier + ' member — ' + stays + ' stays, ' + t.discount + '% loyalty discount">' + t.icon + ' ' + t.tier + '</span>';
}

function approvalMeta() {
  const trusted = isTrustedUser();
  return {
    created_by: SESSION.userId,
    verification_status: trusted ? 'verified' : 'pending',
    verified_by: trusted ? SESSION.userId : null,
    verified_at: trusted ? new Date().toISOString() : null
  };
}

function approvalUpdateMeta() {
  const trusted = isTrustedUser();
  return {
    verification_status: trusted ? 'verified' : 'pending',
    verified_by: trusted ? SESSION.userId : null,
    verified_at: trusted ? new Date().toISOString() : null,
    rejection_reason: null
  };
}

// Get user display name for a user_id (cached)
window._userNameCache = window._userNameCache || {};
async function getUserName(userId) {
  if (!userId) return 'Unknown';
  if (window._userNameCache[userId]) return window._userNameCache[userId];
  try {
    const { data } = await sb.from('profiles').select('display_name').eq('user_id', userId).single();
    const name = data?.display_name || 'User';
    window._userNameCache[userId] = name;
    return name;
  } catch(e) { return 'User'; }
}

// Preload all user names once
async function preloadUserNames() {
  try {
    const { data } = await sb.from('profiles').select('user_id, display_name');
    (data || []).forEach(p => { window._userNameCache[p.user_id] = p.display_name || 'User'; });
  } catch(e) {}
}

// ═══ APPROVE / REJECT BOOKING ═══
window.approveBooking = async function(bkId) {
  if (!isTrustedUser()) { fsn.error('Denied', 'Only owner/developer can approve'); return; }
  const { error } = await sb.from('guest_register').update({
    verification_status: 'verified',
    verified_by: SESSION.userId,
    verified_at: new Date().toISOString(),
    rejection_reason: null
  }).eq('booking_id', bkId);
  if (error) { fsn.error('Error', error.message); return; }
  fsn.success('Approved', '✅ Booking verified');
  if (window.renderManageBookings) renderManageBookings();
  if (window.renderPendingApprovals) renderPendingApprovals();
};

window.rejectBooking = async function(bkId) {
  if (!isTrustedUser()) { fsn.error('Denied', 'Only owner/developer can reject'); return; }
  const reason = prompt('Reason for rejection?');
  if (!reason || !reason.trim()) return;
  const { error } = await sb.from('guest_register').update({
    verification_status: 'rejected',
    verified_by: SESSION.userId,
    verified_at: new Date().toISOString(),
    rejection_reason: reason.trim()
  }).eq('booking_id', bkId);
  if (error) { fsn.error('Error', error.message); return; }
  fsn.warning('Rejected', 'Booking marked rejected');
  if (window.renderManageBookings) renderManageBookings();
  if (window.renderPendingApprovals) renderPendingApprovals();
};

window.approvePayment = async function(payId) {
  if (!isTrustedUser()) { fsn.error('Denied', 'Only owner/developer can approve'); return; }
  const { error } = await sb.from('payment_history').update({
    verification_status: 'verified',
    verified_by: SESSION.userId,
    verified_at: new Date().toISOString(),
    rejection_reason: null
  }).eq('id', payId);
  if (error) { fsn.error('Error', error.message); return; }
  fsn.success('Approved', '✅ Payment verified');
  if (window.renderPendingApprovals) renderPendingApprovals();
  if (window.renderManageBookings) renderManageBookings();
};

window.rejectPayment = async function(payId) {
  if (!isTrustedUser()) { fsn.error('Denied', 'Only owner/developer can reject'); return; }
  const reason = prompt('Reason for rejection?');
  if (!reason || !reason.trim()) return;
  const { error } = await sb.from('payment_history').update({
    verification_status: 'rejected',
    verified_by: SESSION.userId,
    verified_at: new Date().toISOString(),
    rejection_reason: reason.trim()
  }).eq('id', payId);
  if (error) { fsn.error('Error', error.message); return; }
  fsn.warning('Rejected', 'Payment marked rejected');
  if (window.renderPendingApprovals) renderPendingApprovals();
};


// ============ GUEST LEDGER ============
async function showGuestLedger(guestName) {
  const {data:bookings} = await sb.from('guest_register')
    .select('*, rooms(nickname, unit_no)')
    .ilike('guest_name', `%${guestName}%`)
    .order('check_in', {ascending:false});

  if (!bookings || !bookings.length) { fsn.info('Info', 'No bookings found for: ' + guestName); return; }

  const bkIds = bookings.map(b => b.booking_id);
  const {data:payments} = await sb.from('payment_history')
    .select('booking_id, amount, payment_mode, payment_date, verification_status')
    .in('booking_id', bkIds)
    .neq('verification_status', 'rejected');

  const payMap = {};
  (payments || []).forEach(p => { payMap[p.booking_id] = (payMap[p.booking_id] || 0) + (p.amount || 0); });

  const totalAmount = bookings.reduce((s, b) => s + (b.total_amount || 0), 0);
  const totalPaid = bookings.reduce((s, b) => s + (payMap[b.booking_id] || 0), 0);
  const totalDue = totalAmount - totalPaid;
  const totalNights = bookings.reduce((s, b) => {
    if (b.check_in && b.check_out) return s + calcNights(b.check_in, b.check_out);
    return s;
  }, 0);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>👤 Guest Ledger — ${guestName}</h2>
      ${(() => {
        const t = getLoyaltyTier(bookings.length);
        const nextTier = bookings.length < 2 ? { tier: 'Silver', at: 2 } :
                         bookings.length < 4 ? { tier: 'Gold', at: 4 } :
                         bookings.length < 7 ? { tier: 'Platinum', at: 7 } : null;
        return '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:linear-gradient(135deg,' + t.color + ',rgba(0,0,0,0.1));color:#fff;border-radius:10px;margin-bottom:12px;">' +
          '<div style="font-size:32px;">' + t.icon + '</div>' +
          '<div style="flex:1;">' +
            '<div style="font-weight:700;font-size:16px;">' + t.tier + ' Member</div>' +
            '<div style="font-size:12px;opacity:0.9;">' + bookings.length + ' stay(s) · ' + t.discount + '% loyalty discount available</div>' +
            (nextTier ? '<div style="font-size:11px;margin-top:4px;opacity:0.8;">🎯 ' + (nextTier.at - bookings.length) + ' more stay(s) to reach ' + nextTier.tier + '</div>' : '<div style="font-size:11px;margin-top:4px;">🏆 Top tier reached!</div>') +
          '</div>' +
        '</div>';
      })()}
      <div class="stat-grid" style="grid-template-columns:repeat(2,1fr);margin:12px 0;">
        <div class="stat-card" style="border-left:4px solid var(--blue);"><div class="stat-num">${bookings.length}</div><div class="stat-label">Stays</div></div>
        <div class="stat-card" style="border-left:4px solid var(--green);"><div class="stat-num">${totalNights}</div><div class="stat-label">Nights</div></div>
      </div>
      <div class="card" style="box-shadow:none;border:1px solid var(--border);margin:0 0 12px;">
        <div class="metric-row"><span class="metric-label">Total Billed</span><span class="metric-value">₹${totalAmount.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Total Paid</span><span class="metric-value" style="color:var(--green);">₹${totalPaid.toLocaleString('en-IN')}</span></div>
        <div class="metric-row"><span class="metric-label">Total Due</span><span class="metric-value${totalDue > 0 ? ' warn' : ''}">₹${totalDue.toLocaleString('en-IN')}</span></div>
        ${totalDue > 0
          ? `<div style="margin-top:8px;padding:8px;background:#FDE8E8;border-radius:8px;font-size:12px;color:var(--red);">⚠️ ₹${totalDue.toLocaleString('en-IN')} pending</div>`
          : `<div style="margin-top:8px;padding:8px;background:#DEF7EC;border-radius:8px;font-size:12px;color:var(--green);">✅ All clear</div>`}
      </div>
      <div class="section-title">Booking History</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Property</th><th>Mode</th><th>In</th><th>Out</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead>
        <tbody>${bookings.map(b => {
          const pd = payMap[b.booking_id] || 0;
          const due = (b.total_amount || 0) - pd;
          return `<tr>
            <td>${propLabel(b.rooms) || b.room_id || '-'}</td>
            <td><span class="channel-badge ${b.booking_mode === 'Online-Airbnb' ? 'channel-airbnb' : 'channel-direct'}">${b.booking_mode === 'Online-Airbnb' ? 'Airbnb' : 'Direct'}</span></td>
            <td>${b.check_in || '-'}</td><td>${b.check_out || '-'}</td>
            <td>₹${(b.total_amount || 0).toLocaleString('en-IN')}</td>
            <td style="color:var(--green);">₹${pd.toLocaleString('en-IN')}</td>
            <td class="${due > 0 ? 'metric-value warn' : ''}">₹${due.toLocaleString('en-IN')}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
      <div class="section-title" style="margin-top:12px;">Payment Log</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Amount</th><th>Mode</th></tr></thead>
        <tbody>${(payments || []).sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || '')).map(p => `<tr>
          <td>${p.payment_date || '-'}</td>
          <td>₹${(p.amount || 0).toLocaleString('en-IN')}</td>
          <td>${p.payment_mode || '-'}</td>
        </tr>`).join('') || '<tr><td colspan="3" class="sub">No payments</td></tr>'}</tbody>
      </table></div>
      <div class="btn-row" style="margin-top:12px;">
        <button onclick="printGuestLedger('${guestName.replace(/'/g, "\\'")}')" style="background:#00A699;color:#fff;">🖨️ Print Ledger</button>
        <button onclick="whatsappGuestLedger('${guestName.replace(/'/g, "\\'")}')" style="background:#25D366;color:#fff;">📱 WhatsApp</button>
        <button class="outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}



// ============ PRINT GUEST LEDGER ============
async function printGuestLedger(guestName) {
  const {data:bookings} = await sb.from('guest_register')
    .select('*, rooms(nickname, unit_no, property_name)')
    .ilike('guest_name', '%' + guestName + '%')
    .order('check_in', {ascending:false});
  if (!bookings || !bookings.length) { fsn.info('Info', 'No bookings'); return; }

  const bkIds = bookings.map(b => b.booking_id);
  const {data:payments} = await sb.from('payment_history').select('*').in('booking_id', bkIds);
  const payMap = {};
  (payments || []).forEach(p => { payMap[p.booking_id] = (payMap[p.booking_id] || 0) + (p.amount || 0); });

  const totalAmount = bookings.reduce((s, b) => s + (b.total_amount || 0), 0);
  const totalPaid = bookings.reduce((s, b) => s + (payMap[b.booking_id] || 0), 0);
  const totalDue = totalAmount - totalPaid;
  const totalNights = bookings.reduce((s, b) => {
    if (b.check_in && b.check_out) return s + calcNights(b.check_in, b.check_out);
    return s;
  }, 0);

  const firstBk = bookings[0];
  const dateStr = new Date().toLocaleDateString('en-IN');
  const dueColor = totalDue > 0 ? '#FF385C' : '#0A7D1A';
  const dueBg = totalDue > 0 ? '#FDE8E8' : '#DEF7EC';

  let bkRows = '';
  bookings.forEach(b => {
    const pd = payMap[b.booking_id] || 0;
    const due = (b.total_amount || 0) - pd;
    const dc = due > 0 ? '#FF385C' : '#0A7D1A';
    bkRows += '<tr>' +
      '<td>' + (propLabel(b.rooms) || b.room_id || '-') + '</td>' +
      '<td>' + (b.booking_mode === 'Online-Airbnb' ? 'Online' : 'Offline') + '</td>' +
      '<td>' + (b.check_in || '-') + '</td>' +
      '<td>' + (b.check_out || '-') + '</td>' +
      '<td style="text-align:right;">₹' + (b.total_amount || 0).toLocaleString('en-IN') + '</td>' +
      '<td style="text-align:right;color:#0A7D1A;">₹' + pd.toLocaleString('en-IN') + '</td>' +
      '<td style="text-align:right;color:' + dc + ';font-weight:700;">₹' + due.toLocaleString('en-IN') + '</td>' +
      '</tr>';
  });

  let payRows = '';
  const sortedPays = (payments || []).sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));
  if (sortedPays.length === 0) {
    payRows = '<tr><td colspan="4" style="text-align:center;color:#717171;">No payments recorded</td></tr>';
  } else {
    sortedPays.forEach(p => {
      payRows += '<tr>' +
        '<td>' + (p.payment_date || '-') + '</td>' +
        '<td style="text-align:right;">₹' + (p.amount || 0).toLocaleString('en-IN') + '</td>' +
        '<td>' + (p.payment_mode || '-') + '</td>' +
        '<td>' + (p.notes || '-') + '</td>' +
        '</tr>';
    });
  }

  const dueMsg = totalDue > 0
    ? '⚠️ Balance Due: ₹' + totalDue.toLocaleString('en-IN') + ' — Kindly clear at earliest'
    : '✅ Fully Settled — Thank You!';

  const html = '<!DOCTYPE html><html><head><title>Guest Ledger - ' + guestName + '</title>' +
    '<style>' +
    '@page { size: A4; margin: 12mm; }' +
    'body { font-family: -apple-system, sans-serif; color: #222; margin: 0; padding: 20px; }' +
    '.header { background: linear-gradient(135deg,#FF385C,#E00B41); color: #fff; padding: 20px; border-radius: 12px; margin-bottom: 20px; }' +
    '.header h1 { margin: 0 0 6px 0; font-size: 22px; }' +
    '.header .meta { font-size: 13px; opacity: 0.9; }' +
    '.guest-info { background: #F7F7F7; padding: 14px 18px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }' +
    '.summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }' +
    '.summary-card { background: #FAFAFA; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #EBEBEB; }' +
    '.summary-card .label { font-size: 10px; color: #717171; text-transform: uppercase; }' +
    '.summary-card .value { font-size: 18px; font-weight: 800; margin-top: 4px; }' +
    '.section-title { font-size: 14px; font-weight: 700; margin: 18px 0 8px; color: #222; border-bottom: 2px solid #FF385C; padding-bottom: 4px; }' +
    'table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; }' +
    'th { background: #222; color: #fff; padding: 8px; text-align: left; font-size: 11px; }' +
    'td { padding: 7px 8px; border-bottom: 1px solid #EBEBEB; }' +
    'tr:nth-child(even) { background: #FAFAFA; }' +
    '.due-alert { background: ' + dueBg + '; color: ' + dueColor + '; padding: 14px; border-radius: 8px; text-align: center; font-weight: 700; font-size: 15px; margin-top: 16px; }' +
    '.footer { margin-top: 24px; text-align: center; font-size: 11px; color: #717171; border-top: 1px solid #EBEBEB; padding-top: 12px; }' +
    '@media print { body { padding: 0; } .no-print { display: none; } }' +
    '</style></head><body>' +
    '<div class="header"><h1>👤 Guest Ledger — ' + guestName + '</h1>' +
    '<div class="meta">' + BRAND + ' · Generated ' + dateStr + '</div></div>' +
    '<div class="guest-info"><strong>Guest:</strong> ' + guestName + ' &nbsp;·&nbsp; ' +
    '<strong>Phone:</strong> ' + (firstBk.phone || '-') + ' &nbsp;·&nbsp; ' +
    '<strong>Stays:</strong> ' + bookings.length + ' &nbsp;·&nbsp; ' +
    '<strong>Nights:</strong> ' + totalNights + '</div>' +
    '<div class="summary">' +
    '<div class="summary-card"><div class="label">Stays</div><div class="value">' + bookings.length + '</div></div>' +
    '<div class="summary-card"><div class="label">Total Billed</div><div class="value">₹' + totalAmount.toLocaleString('en-IN') + '</div></div>' +
    '<div class="summary-card"><div class="label">Total Paid</div><div class="value" style="color:#0A7D1A;">₹' + totalPaid.toLocaleString('en-IN') + '</div></div>' +
    '<div class="summary-card"><div class="label">Balance Due</div><div class="value" style="color:' + dueColor + ';">₹' + totalDue.toLocaleString('en-IN') + '</div></div>' +
    '</div>' +
    '<div class="section-title">📅 Booking History</div>' +
    '<table><thead><tr><th>Property</th><th>Mode</th><th>Check-in</th><th>Check-out</th>' +
    '<th style="text-align:right;">Total</th><th style="text-align:right;">Paid</th><th style="text-align:right;">Due</th></tr></thead>' +
    '<tbody>' + bkRows + '</tbody></table>' +
    '<div class="section-title">💰 Payment Log</div>' +
    '<table><thead><tr><th>Date</th><th style="text-align:right;">Amount</th><th>Mode</th><th>Notes</th></tr></thead>' +
    '<tbody>' + payRows + '</tbody></table>' +
    '<div class="due-alert">' + dueMsg + '</div>' +
    '<div class="footer">' + BRAND + ' · Contact: Mr. Shahanshah 9450055554 · Mr. Firoz Khan 8299600709<br>Generated ' + dateStr + '</div>' +
    '<div class="no-print" style="text-align:center;margin-top:20px;">' +
    '<button onclick="window.print()" style="padding:12px 32px;background:#FF385C;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:15px;">🖨️ Print / Save as PDF</button>' +
    '</div>' +
    '<script>setTimeout(function(){window.print();}, 500);<\/script>' +
    '</body></html>';

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ============ WHATSAPP GUEST LEDGER ============
async function whatsappGuestLedger(guestName) {
  const {data:bookings} = await sb.from('guest_register')
    .select('*, rooms(nickname, unit_no, property_name)')
    .ilike('guest_name', '%' + guestName + '%')
    .order('check_in', {ascending:false});
  if (!bookings || !bookings.length) { fsn.info('Info', 'No bookings'); return; }

  const bkIds = bookings.map(b => b.booking_id);
  const {data:payments} = await sb.from('payment_history').select('*').in('booking_id', bkIds);
  const payMap = {};
  (payments || []).forEach(p => { payMap[p.booking_id] = (payMap[p.booking_id] || 0) + (p.amount || 0); });

  const totalAmount = bookings.reduce((s, b) => s + (b.total_amount || 0), 0);
  const totalPaid = bookings.reduce((s, b) => s + (payMap[b.booking_id] || 0), 0);
  const totalDue = totalAmount - totalPaid;
  const totalNights = bookings.reduce((s, b) => {
    if (b.check_in && b.check_out) return s + calcNights(b.check_in, b.check_out);
    return s;
  }, 0);

  const firstBk = bookings[0];
  const phone = (firstBk.phone || '').replace(/[^0-9]/g, '');
  const NL = String.fromCharCode(10);

  let bkList = '';
  bookings.forEach((b, i) => {
    const pd = payMap[b.booking_id] || 0;
    const due = (b.total_amount || 0) - pd;
    const prop = propLabel(b.rooms) || b.room_id;
    bkList += (i + 1) + '. ' + prop + NL +
      '   ' + (b.check_in || '-') + ' -> ' + (b.check_out || '-') + NL +
      '   Total: Rs.' + (b.total_amount || 0).toLocaleString('en-IN') +
      ' | Paid: Rs.' + pd.toLocaleString('en-IN') +
      ' | Due: Rs.' + due.toLocaleString('en-IN') + NL + NL;
  });

  let payList = '';
  const sortedPays = (payments || []).sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));
  if (sortedPays.length === 0) {
    payList = '- No payments recorded';
  } else {
    sortedPays.forEach(p => {
      payList += '- ' + (p.payment_date || '-') + ' Rs.' + (p.amount || 0).toLocaleString('en-IN') +
        ' (' + (p.payment_mode || '-') + ')' + NL;
    });
  }

  const dueLine = totalDue > 0
    ? NL + '*Kindly clear pending Rs.' + totalDue.toLocaleString('en-IN') + '*' + NL
    : NL + '*Fully Settled - Thank You!*' + NL;

  const msg = '*UNIQUE HAVEN HOMES STAY*' + NL +
    '*Guest Ledger - ' + guestName + '*' + NL + NL +
    '*Summary:*' + NL +
    '- Total Stays: ' + bookings.length + NL +
    '- Total Nights: ' + totalNights + NL +
    '- Total Billed: Rs.' + totalAmount.toLocaleString('en-IN') + NL +
    '- Total Paid: Rs.' + totalPaid.toLocaleString('en-IN') + NL +
    '- *Balance Due: Rs.' + totalDue.toLocaleString('en-IN') + '*' + NL + NL +
    '*Booking History:*' + NL + bkList +
    '*Payment Log:*' + NL + payList +
    dueLine +
    '*Contact:*' + NL +
    'Mr. Shahanshah - 9450055554' + NL +
    'Mr. Firoz Khan - 8299600709';

  const shareModal = document.createElement('div');
  shareModal.className = 'modal-overlay';
  shareModal.onclick = e => { if (e.target === shareModal) shareModal.remove(); };

  const q = String.fromCharCode(39);
  const sendBtn = phone
    ? '<button style="background:#25D366;color:#fff;" onclick="window.open(' + q + 'https://wa.me/' + phone + '?text=' + q + '+encodeURIComponent(document.getElementById(' + q + 'waLedgerMsg' + q + ').value),' + q + '_blank' + q + ')">Send to ' + phone + '</button>'
    : '';
  const shareBtn = '<button style="background:#128C7E;color:#fff;" onclick="window.open(' + q + 'https://wa.me/?text=' + q + '+encodeURIComponent(document.getElementById(' + q + 'waLedgerMsg' + q + ').value),' + q + '_blank' + q + ')">Share</button>';
  const copyBtn = '<button class="outline" onclick="navigator.clipboard.writeText(document.getElementById(' + q + 'waLedgerMsg' + q + ').value);fsn.success(' + q + 'Copied' + q + ',' + q + 'Message copied' + q + ')">Copy</button>';
  const closeBtn = '<button class="outline" onclick="this.closest(' + q + '.modal-overlay' + q + ').remove()">Close</button>';

  shareModal.innerHTML =
    '<div class="modal-box" style="max-width:600px;">' +
    '<button class="modal-close" onclick="this.closest(' + q + '.modal-overlay' + q + ').remove()">X</button>' +
    '<h2>WhatsApp Ledger - ' + guestName + '</h2>' +
    '<textarea id="waLedgerMsg" style="width:100%;height:400px;font-family:monospace;font-size:12px;padding:10px;border:1px solid var(--border);border-radius:8px;">' + msg + '</textarea>' +
    '<div class="btn-row" style="margin-top:12px;">' +
    sendBtn + shareBtn + copyBtn + closeBtn +
    '</div></div>';
  document.body.appendChild(shareModal);
}

// ============ ID BUTTON BUILDER ============
function buildIdButtons(b) {
  const fp = parseIdPathArray(b.id_proof_front_paths).filter(Boolean);
  const bp = parseIdPathArray(b.id_proof_back_paths).filter(Boolean);
  const ap = [...new Set((b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean))];
  const seen = new Set();
  const allPhotos = [...fp, ...bp, ...ap].filter(p => { if (seen.has(p)) return false; seen.add(p); return true; });

  if (!allPhotos.length) return '<small style="color:var(--red);">❌ No ID</small>';

  const count = allPhotos.length;
  // Count front/back per guest
  const frontCount = {};
  const backCount = {};

  return `<span style="font-size:10px;color:var(--green);font-weight:600;">✅ ${count}</span> ` +
    allPhotos.map((p, i) => {
      let label;
      if (fp.includes(p)) {
        const idx = fp.indexOf(p) + 1;
        label = 'F' + idx;
      } else if (bp.includes(p)) {
        const idx = bp.indexOf(p) + 1;
        label = 'B' + idx;
      } else {
        label = 'ID' + (i + 1);
      }
      return `<button class="btn-sm outline" style="padding:1px 5px;font-size:9px;min-height:20px;margin:1px;" onclick="dlIdPhoto('${p}')">${label}</button>`;
    }).join('');
}

// ============ MANAGE BOOKINGS ============
async function renderManageBookings() {
  if (window.showLoadingSkeleton) window.showLoadingSkeleton('list');
  if (typeof preloadUserNames === 'function') await preloadUserNames();
  if (typeof preloadGuestStays === 'function') await preloadGuestStays();

  // For caretaker/checkin_manager - filter to only their properties
  if (['caretaker', 'checkin_manager'].includes(SESSION.role) && SESSION.empId) {
    const { data: emp } = await sb.from('employees')
      .select('assigned_rooms')
      .eq('emp_id', SESSION.empId).single();
    if (emp?.assigned_rooms) {
      window._myAssignedRooms = emp.assigned_rooms.split(',').map(r => r.trim()).filter(Boolean);
    }
  }

  // Fetch payments for filter (exclude REJECTED + cancelled bookings)
  const { data: allPays } = await sb.from('payment_history')
    .select('booking_id, amount, payment_date, verification_status')
    .neq('verification_status', 'rejected');
  // Get cancelled booking IDs to exclude their payments from revenue calc
  const { data: cancelledBks } = await sb.from('guest_register')
    .select('booking_id').eq('is_cancelled', true);
  const cancelledSet = new Set((cancelledBks || []).map(b => b.booking_id));
  const paidMap = {};
  (allPays || []).forEach(p => {
    paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
  });
  window._bkPaidMap = paidMap;

  renderShell(`<div class="loading">Loading...</div>`, 'bookings');

  const {data:all, error} = await sb.from("guest_register")
    .select("*, rooms(unit_no, nickname, property_name)").order("check_in", {ascending:false});
  if (error) { renderShell(`<div class="error">${error.message}</div>`, 'bookings'); return; }
  window._allBookings = all || []; // ✅ Store globally for prev-due calculation

  const {data:rooms} = await sb.from('rooms').select('room_id, unit_no, nickname, property_name').order('unit_no');
  const roomMap = {};
  (rooms || []).forEach(r => { roomMap[r.room_id] = r; });

  const mf = SESSION.bookingFilter || 'All';
  const pf = SESSION.bookingPropFilter || '';
  const df = SESSION.bookingDateFilter || '';
  const d1 = SESSION.bookingDateFrom || '';
  const d2 = SESSION.bookingDateTo || '';
  const sq = SESSION.bookingSearch || '';

  window._rawBookingsList = all || []; // for dupe check

  let f = all || [];
  window._allBookings = f; // For duplicate detection
  // Filter for caretaker - only their properties
  if (window._myAssignedRooms && window._myAssignedRooms.length) {
    f = f.filter(b => window._myAssignedRooms.includes(b.room_id));
  }

  if (mf !== 'All') f = f.filter(b => b.booking_mode === mf);
  if (pf) f = f.filter(b => b.room_id === pf);
  if (df) f = f.filter(b => b.check_in === df);
  if (d1) f = f.filter(b => b.check_in >= d1);
  if (d2) f = f.filter(b => b.check_in <= d2);
  if (sq) f = f.filter(b => (b.guest_name || '').toLowerCase().includes(sq.toLowerCase()) || (b.phone || '').includes(sq));

  // Period filter
  const period = SESSION.bookingPeriod;
  if (period) {
    const now = new Date();
    let ps, pe;
    if (period === 'thisMonth') {
      ps = new Date(now.getFullYear(), now.getMonth(), 1);
      pe = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'lastMonth') {
      ps = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      pe = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (period === 'thisQtr') {
      const q = Math.floor(now.getMonth() / 3);
      ps = new Date(now.getFullYear(), q * 3, 1);
      pe = new Date(now.getFullYear(), q * 3 + 3, 0);
    } else if (period === 'lastQtr') {
      const q = Math.floor(now.getMonth() / 3) - 1;
      const y = q < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const qq = q < 0 ? 3 : q;
      ps = new Date(y, qq * 3, 1);
      pe = new Date(y, qq * 3 + 3, 0);
    } else if (period === 'thisYear') {
      ps = new Date(now.getFullYear(), 0, 1);
      pe = new Date(now.getFullYear(), 11, 31);
    } else if (period === 'lastYear') {
      ps = new Date(now.getFullYear() - 1, 0, 1);
      pe = new Date(now.getFullYear() - 1, 11, 31);
    }
    if (ps && pe) {
      const psStr = ps.toISOString().slice(0, 10);
      const peStr = pe.toISOString().slice(0, 10);
      f = f.filter(b => b.check_in >= psStr && b.check_in <= peStr);
    }
  }

  // Payment date filter (from dashboard KPI click)
  if (SESSION._filterByPaymentDate) {
    const payDate = SESSION._filterByPaymentDate;
    const paidMap2 = window._bkPaidMap || {};
    // Get booking IDs that received payment on this date
    const paymentDateBkIds = new Set();
    (allPays || []).forEach(p => {
      if (p.payment_date === payDate) paymentDateBkIds.add(p.booking_id);
    });
    f = f.filter(b => paymentDateBkIds.has(b.booking_id));
    SESSION._filterByPaymentDate = null; // Clear after use
  }

  // Payment filter (also handles 'duplicates' special case)
  const payFilter = SESSION.bookingPayFilter;
  if (payFilter === 'duplicates') {
    // Use the raw fetched list (before any filtering) for accurate duplicate detection
    const rawAll = window._rawBookingsList || f;
    f = f.filter(b => {
      // Explicit skips — these are legitimate, not duplicates
      if (b.linked_booking_id) return false;
      if (b.show_to_investor === false) return false;
      if (b.is_cancelled) return false;
      if (b.parent_booking_id) return false;
      if (b.stay_group_id) return false;
      
      // Check against ALL raw bookings, not filtered subset
      if (!window.checkDuplicate) return false;
      return window.checkDuplicate(b, rawAll);
    });
  }
  // No ID filter (from dashboard KPI)
  // 🟢 Currently Staying filter
  if (SESSION._filterCurrentStay) {
    const today = new Date().toISOString().slice(0, 10);
    f = f.filter(b => 
      b.check_in && b.check_in <= today && 
      (!b.check_out || b.check_out > today) &&
      !b.is_cancelled &&
      b.verification_status !== 'rejected'
    );
    SESSION._filterCurrentStay = null;
  }

  // ⭐ Review Bookings filter
  if (SESSION._filterReviewOnly) {
    f = f.filter(b => b.is_review_booking === true);
    SESSION._filterReviewOnly = null;
  }

  if (SESSION._filterNoId) {
    f = f.filter(b => {
      const hasId = (b.id_proof_photo_paths || b.id_proof_photo_path || '').split(',').filter(Boolean).length > 0;
      return !hasId;
    });
    SESSION._filterNoId = null;
  }

  if (payFilter) {
    // Get all payments for these bookings
    const bookingIds = f.map(b => b.booking_id);
    const paidMap = window._bkPaidMap || {};

    if (payFilter === 'zero') {
      f = f.filter(b => (b.total_amount || 0) === 0);
    } else if (payFilter === 'unpaid') {
      f = f.filter(b => (paidMap[b.booking_id] || 0) === 0 && (b.total_amount || 0) > 0);
    } else if (payFilter === 'partial') {
      f = f.filter(b => {
        const paid = paidMap[b.booking_id] || 0;
        const total = b.total_amount || 0;
        return paid > 0 && paid < total;
      });
    } else if (payFilter === 'paid') {
      f = f.filter(b => {
        const paid = paidMap[b.booking_id] || 0;
        const total = b.total_amount || 0;
        return total > 0 && paid >= total;
      });
    } else if (payFilter === 'due') {
      f = f.filter(b => {
        const paid = paidMap[b.booking_id] || 0;
        const total = b.total_amount || 0;
        return total > 0 && (total - paid) > 0;
      });
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  f.sort((a, b2) => {
    const aA = a.check_in <= today && a.check_out > today;
    const bA = b2.check_in <= today && b2.check_out > today;
    const aT = a.check_out === today, bT = b2.check_out === today;
    const aF = a.check_in > today, bF = b2.check_in > today;
    if (aA && !bA) return -1; if (!aA && bA) return 1;
    if (aT && !bT) return -1; if (!aT && bT) return 1;
    if (aF && !bF) return -1; if (!aF && bF) return 1;
    return (b2.check_in || '').localeCompare(a.check_in || '');
  });

  const overlaps = findOverlappingBookings(all || []);
  const pm = await getPaidMap(f.map(b => b.booking_id));
  const canM = ['owner','admin','manager','moderator','developer'].includes(SESSION.role);
  const canD = ['developer'].includes(SESSION.role);

  renderShell(`
    <div class="card">
      <h1>📅 Bookings</h1>
      <div class="sub">${f.length} bookings ${sq ? 'matching "' + sq + '"' : ''}</div>
      ${canM ? `<button onclick="renderAddBooking()">➕ New Booking</button>` : ''}
    </div>

    ${overlaps.length ? `<div class="card"><div class="error"><strong>⚠️ Overlapping (${overlaps.length})</strong><br>
      ${overlaps.slice(0, 5).map(o => `<div style="margin:4px 0;font-size:12px;"><strong>${o.roomId}</strong> — ${o.a.guest_name || '-'} ↔ ${o.b.guest_name || '-'}</div>`).join('')}
    </div></div>` : ''}

    <div class="card">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input type="text" id="bkSearch" placeholder="Search guest name or phone..." value="${sq}"
          oninput="SESSION.bookingSearch=this.value; clearTimeout(window._searchTimer); window._searchTimer=setTimeout(()=>renderManageBookings(),600);" />
        ${sq ? `<button class="outline btn-sm" onclick="SESSION.bookingSearch='';renderManageBookings();" style="min-height:30px;padding:4px 8px;">✕</button>` : ''}
      </div>
      <div class="section-title">Filters</div>
      <div class="filter-bar">
        <div class="filter-item"><label>Period</label>
          <select id="fPeriod" onchange="onPeriodChg()">
            <option value="">Custom</option>
            <option value="thisMonth" ${SESSION.bookingPeriod === 'thisMonth' ? 'selected' : ''}>This Month</option>
            <option value="lastMonth" ${SESSION.bookingPeriod === 'lastMonth' ? 'selected' : ''}>Last Month</option>
            <option value="thisQtr" ${SESSION.bookingPeriod === 'thisQtr' ? 'selected' : ''}>This Quarter</option>
            <option value="lastQtr" ${SESSION.bookingPeriod === 'lastQtr' ? 'selected' : ''}>Last Quarter</option>
            <option value="thisYear" ${SESSION.bookingPeriod === 'thisYear' ? 'selected' : ''}>This Year</option>
            <option value="lastYear" ${SESSION.bookingPeriod === 'lastYear' ? 'selected' : ''}>Last Year</option>
          </select>
        </div>
        <div class="filter-item"><label>Payment</label>
          <select id="fPayStatus">
            <option value="">All Payments</option>
            <option value="unpaid" ${SESSION.bookingPayFilter === 'unpaid' ? 'selected' : ''}>❌ Unpaid</option>
            <option value="partial" ${SESSION.bookingPayFilter === 'partial' ? 'selected' : ''}>⚠️ Partial</option>
            <option value="paid" ${SESSION.bookingPayFilter === 'paid' ? 'selected' : ''}>✅ Fully Paid</option>
            <option value="zero" ${SESSION.bookingPayFilter === 'zero' ? 'selected' : ''}>🔴 ₹0 Amount</option>
            <option value="due" ${SESSION.bookingPayFilter === 'due' ? 'selected' : ''}>💰 Has Balance Due</option>
            <option value="duplicates" ${SESSION.bookingPayFilter === 'duplicates' ? 'selected' : ''}>⚠️ Duplicates Only</option>
          </select>
        </div>
        <div class="filter-item"><label>Mode</label><select id="fMode">
          <option value="All" ${mf === 'All' ? 'selected' : ''}>All</option>
          <option value="Online-Airbnb" ${mf === 'Online-Airbnb' ? 'selected' : ''}>Online</option>
          <option value="Offline" ${mf === 'Offline' ? 'selected' : ''}>Offline</option>
        </select></div>
        <div class="filter-item"><label>Property</label><select id="fProp">
          <option value="">All</option>
          ${(rooms || []).map(r => `<option value="${r.room_id}" ${pf === r.room_id ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
        </select></div>
        <div class="filter-item"><label>Date</label><input type="date" id="fDate" value="${df}" /></div>
        <div class="filter-item"><label>From</label><input type="date" id="fFrom" value="${d1}" /></div>
        <div class="filter-item"><label>To</label><input type="date" id="fTo" value="${d2}" /></div>
        <div class="filter-item" style="flex-direction:row;gap:4px;align-items:flex-end;">
          <button class="btn-sm" onclick="applyBkFilters()">Apply</button>
          <button class="btn-sm" style="background:#00A699;" onclick="exportBookingsPDF()">📄 Export PDF</button>
          <button class="btn-sm outline" onclick="clearBkFilters()">Clear</button>
        </div>
      </div>
    </div>

    <div class="card"><div class="table-wrap"><table>
      <thead><tr>
        <th>Status</th><th>Guest</th><th>Property</th><th>Mode</th>
        <th>In</th><th>Out</th><th>ID</th><th>Total</th><th>Paid</th><th>Due</th>
        ${canM ? '<th>Actions</th>' : ''}
      </tr></thead>
      <tbody>${f.map(b => {
        const pd = pm[b.booking_id] || 0;
        const bal = (b.total_amount || 0) - pd;
        const isActive = b.check_in <= today && b.check_out > today;
        const isCheckoutToday = b.check_out === today;
        const isPast = b.check_out < today;
        const isOpenEnded = b.checkout_confirmed === false;

        const statusBadge = isActive
          ? (isOpenEnded ? '<span class="badge yellow">🔄 Open</span>' : '<span class="badge green">🟢 Active</span>')
          : isCheckoutToday ? '<span class="badge yellow">📤 Today</span>'
          : isPast ? '<span class="badge" style="background:#F3F4F6;color:#6B7280;">Done</span>'
          : '<span class="badge blue">Upcoming</span>';

        const rowBg = isActive ? 'background:#f0fff4;' : isCheckoutToday ? 'background:#fffbeb;' : '';

        return `<tr style="${rowBg}">
          <td>${statusBadge}</td>
          <td>
            <strong style="cursor:pointer;text-decoration:underline;color:var(--blue);"
              onclick="showGuestLedger('${(b.guest_name || '').replace(/'/g, "\\'")}')">${b.guest_name || '-'}</strong>${typeof getGuestTierBadge === 'function' ? getGuestTierBadge(b) : ''}${b.is_cancelled ? ' <span class="badge red" style="font-size:9px;" title="' + (b.cancellation_reason || '').replace(/"/g,'&quot;') + '">🚫 CANCELLED</span>' : ''}${b.verification_status === 'pending' ? ' <span class="badge yellow" style="font-size:9px;">🟡 Pending</span>' : ''}${b.is_review_booking ? ' <span class="badge" style="font-size:9px;background:#8B5CF6;color:#fff;">👻 Review</span>' : ''}${b.show_to_investor === false ? ' <span class="badge" style="font-size:9px;background:#DC2626;color:#fff;" title="' + (b.hide_reason || 'Hidden from investor reports').replace(/"/g,'&quot;') + '">🚫 Hidden</span>' : ''}${b.verification_status === 'rejected' ? ' <span class="badge red" style="font-size:9px;" title="' + (b.rejection_reason || '').replace(/"/g,'&quot;') + '">❌ Rejected</span>' : ''}<br>
            <small style="color:var(--muted);">${b.phone || ''}</small>
            ${b.created_by ? '<br><small style="color:#888;font-size:10px;">👤 ' + (window._userNameCache[b.created_by] || b.booked_by || 'User') + '</small>' : (b.booked_by ? '<br><small style="color:#888;font-size:10px;">👤 ' + b.booked_by + '</small>' : '')}
            ${b.verification_status === 'pending' && isTrustedUser() ? '<br><button class="btn-sm green-btn" style="padding:2px 8px;font-size:10px;margin-top:2px;" onclick="event.stopPropagation();approveBooking(\'' + b.booking_id + '\')">✅ Approve</button> <button class="btn-sm danger" style="padding:2px 8px;font-size:10px;" onclick="event.stopPropagation();rejectBooking(\'' + b.booking_id + '\')">❌ Reject</button>' : ''}
            ${(() => {
              const allBks = window._allBookings || [];
              const pm = window._bkPaidMap || {};
              const sameGuest = allBks.filter(x =>
                x.booking_id !== b.booking_id &&
                ((b.phone && x.phone === b.phone) || x.guest_name === b.guest_name)
              );
              const prevDue = sameGuest.reduce((s, x) => {
                const due = (x.total_amount || 0) - (pm[x.booking_id] || 0);
                return s + (due > 0 ? due : 0);
              }, 0);
              return prevDue > 0
                ? `<br><small style="color:#FF385C;font-weight:700;font-size:10px;">⚠️ Prev Due ₹${prevDue.toLocaleString('en-IN')}</small>`
                : '';
            })()}
            ${b.has_vehicle ? `<br><small>🚗 ${b.vehicle_name || ''} ${b.vehicle_number || ''}${b.vehicle_photo_path ? ` <button class="btn-sm green-btn" style="padding:1px 6px;font-size:9px;min-height:18px;" onclick="dlIdPhoto('${b.vehicle_photo_path}')">📷</button>` : ''}</small>` : ''}
          </td>
          <td>
            <strong>${propLabel(b.rooms) || '-'}</strong><br>
            <small style="color:var(--muted);">${b.rooms?.unit_no || b.room_id}</small>
            ${b.source_room_id && b.source_room_id !== b.room_id
              ? `<br><small style="color:var(--blue);font-size:10px;">📍 ${propLabel(roomMap[b.source_room_id]) || b.source_room_id}</small>`
              : ''}
          </td>
          <td>
              <span class="channel-badge ${b.booking_mode === 'Online-Airbnb' ? 'channel-airbnb' : 'channel-direct'}">${b.booking_mode === 'Online-Airbnb' ? 'Airbnb' : 'Direct'}</span>
              ${b.is_review_booking ? '<span class="badge" style="background:#722ED1;color:#fff;font-size:9px;">⭐ REVIEW</span>' : ''}
              ${b.linked_booking_id ? `<span class="badge" style="background:#0EA5E9;color:#fff;font-size:9px;cursor:pointer;" title="Linked to booking ${b.linked_booking_id}" onclick="showLinkedBooking('${b.linked_booking_id}')">🔗 LINKED</span>` : ''}
              ${(!b.linked_booking_id && !b.is_review_booking && !b.is_cancelled && !b.parent_booking_id && !b.stay_group_id && window.checkDuplicate && window.checkDuplicate(b, window._rawBookingsList || window._allBookings || [])) ? `<span class="badge" style="background:#F59E0B;color:#fff;font-size:9px;cursor:pointer;" title="Same room + date overlap detected" onclick="showDuplicateOptions('${b.booking_id}')">⚠️ DUPE</span>` : ''}
            </td>
          <td><small>${b.check_in || '-'}</small></td>
          <td><small>${b.check_out || '-'}</small></td>
          <td>${buildIdButtons(b)}</td>
          <td><strong>₹${(b.total_amount || 0).toLocaleString('en-IN')}</strong></td>
          <td style="color:var(--green);">₹${pd.toLocaleString('en-IN')}</td>
          <td><strong class="${bal > 0.99 ? 'metric-value warn' : ''}">₹${Math.abs(bal) < 1 ? '0' : bal.toLocaleString('en-IN')}</strong></td>
          ${canM ? `<td class="table-actions">
            <button class="btn-sm" onclick="editBooking('${b.booking_id}')" title="Edit">✏️</button>
            <button class="btn-sm" style="background:#8B5CF6;color:#fff;" onclick="duplicateBooking('${b.booking_id}')" title="Duplicate this booking">📋</button>
            <button class="btn-sm secondary" onclick="showPaymentModal('${b.booking_id}')" title="Pay">💰</button>
            <button class="btn-sm" style="background:var(--primary);color:#fff;" onclick="quickExtend('${b.booking_id}')" title="Extend">⏭️</button>
            <button class="btn-sm outline" onclick="createOfflineExtension('${b.booking_id}')" title="New Ext">➕</button>
            <button class="btn-sm" style="background:#8B5CF6;color:#fff;" onclick="showGroupBookingModal('${b.booking_id}')" title="Group">🎊</button>
            ${isActive ? `<button class="btn-sm secondary" onclick="quickCheckout('${b.booking_id}','${b.room_id}')" title="Checkout">📤</button>` : ''}
            <button class="btn-sm" style="background:#25D366;color:#fff;display:inline-flex;align-items:center;justify-content:center;" onclick="showWATemplatesMenu('${b.booking_id}',this)" title="WhatsApp"><svg viewBox="0 0 24 24" width="15" height="15" fill="#fff"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.55 1.36 5.09L2 22l5.25-1.38c1.48.8 3.13 1.23 4.79 1.23h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.17-3.12.82.83-3.04-.2-.32a8.2 8.2 0 0 1-1.26-4.37c.01-4.54 3.7-8.23 8.25-8.23M8.53 6.98c-.16 0-.43.06-.65.31s-.85.83-.85 2.02.87 2.35.99 2.51c.12.17 1.71 2.75 4.28 3.72 2.12.8 2.55.64 3.01.6.46-.05 1.5-.61 1.71-1.2.21-.59.21-1.09.15-1.19s-.23-.16-.48-.28-1.5-.74-1.73-.82c-.23-.08-.4-.12-.57.13s-.65.82-.8.99c-.15.17-.29.19-.55.06-.26-.13-1.09-.4-2.08-1.29-.77-.68-1.29-1.53-1.44-1.79-.15-.26-.02-.4.11-.53.12-.12.26-.31.4-.47.13-.16.17-.27.26-.45.09-.18.04-.34-.02-.47-.06-.13-.57-1.37-.78-1.87s-.42-.42-.57-.43z"/></svg></button>
            <button class="btn-sm" style="background:var(--primary);color:#fff;" onclick="showReminderModal('${b.booking_id}')" title="Set Reminder">🔔</button>
            ${!b.is_cancelled && canM ? `<button class="btn-sm" style="background:var(--yellow);color:#fff;" onclick="cancelBooking('${b.booking_id}','${(b.guest_name || '').replace(/'/g, "\\'")}')" title="Cancel">🚫</button>` : ''}
            ${b.is_cancelled && canM ? `<button class="btn-sm outline" onclick="uncancelBooking('${b.booking_id}')" title="Restore">↩️</button>` : ''}
            ${canD ? `<button class="btn-sm danger" onclick="delBooking('${b.booking_id}','${(b.guest_name || '').replace(/'/g, "\\'")}','${b.room_id}')">🗑️</button>` : ''}
          </td>` : ''}
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>
  `, 'bookings');
}

function applyBkFilters() {
  SESSION.bookingPeriod = document.getElementById('fPeriod')?.value || '';
  SESSION.bookingPayFilter = document.getElementById('fPayStatus')?.value || '';
  SESSION.bookingFilter = document.getElementById('fMode').value;
  SESSION.bookingPropFilter = document.getElementById('fProp').value;
  SESSION.bookingDateFilter = document.getElementById('fDate').value;
  SESSION.bookingDateFrom = document.getElementById('fFrom').value;
  SESSION.bookingDateTo = document.getElementById('fTo').value;
  renderManageBookings();
}

function clearBkFilters() {
  SESSION.bookingFilter = 'All'; SESSION.bookingPropFilter = '';
  SESSION.bookingPeriod = ''; SESSION.bookingPayFilter = '';
  SESSION.bookingDateFilter = ''; SESSION.bookingDateFrom = ''; SESSION.bookingDateTo = '';
  SESSION.bookingSearch = '';
  renderManageBookings();
}

// ============ ADD BOOKING ============
// ═══════════════════════════════════════════════════════════
// 🔍 REPEAT GUEST SEARCH
// ═══════════════════════════════════════════════════════════

let _repeatSearchTimer = null;

window.searchRepeatGuests = function(query) {
  clearTimeout(_repeatSearchTimer);
  const resultsEl = document.getElementById('repeatGuestResults');
  
  if (!query || query.trim().length < 3) {
    resultsEl.innerHTML = '';
    return;
  }
  
  resultsEl.innerHTML = '<div style="color:#666;font-size:12px;">Searching...</div>';
  
  _repeatSearchTimer = setTimeout(async () => {
    const q = query.trim();
    // Search by name OR phone
    const { data } = await sb.from('guest_register')
      .select('booking_id, guest_name, phone, room_id, check_in, check_out, booking_mode, id_proof_type, id_proof_no, id_proof_front_paths, id_proof_back_paths, id_proof_photo_paths, has_vehicle, vehicle_name, vehicle_number, guests, rooms(nickname, unit_no)')
      .or(`guest_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .neq('is_cancelled', true)
      .order('check_in', { ascending: false })
      .limit(10);
    
    if (!data || data.length === 0) {
      resultsEl.innerHTML = '<div style="color:#999;font-size:12px;padding:8px;">No past guests found. Continue with new entry below.</div>';
      return;
    }
    
    // Group by unique guest (name+phone)
    const uniqueGuests = {};
    data.forEach(b => {
      const key = (b.guest_name || '') + '|' + (b.phone || '');
      if (!uniqueGuests[key]) uniqueGuests[key] = { guest: b, bookings: [] };
      uniqueGuests[key].bookings.push(b);
    });
    
    resultsEl.innerHTML = Object.values(uniqueGuests).map(({ guest, bookings }) => {
      const propName = guest.rooms?.nickname || guest.rooms?.unit_no || guest.room_id || '-';
      const hasId = guest.id_proof_no || guest.id_proof_front_paths || guest.id_proof_photo_paths;
      return `
        <div style="padding:10px;background:#fff;border:1px solid #ddd;border-radius:8px;margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div>
              <strong style="color:#1E40AF;">${guest.guest_name}</strong>
              ${guest.phone ? `<span style="color:#666;font-size:12px;"> · 📱 ${guest.phone}</span>` : ''}
              ${hasId ? '<span style="background:#059669;color:#fff;font-size:10px;padding:2px 6px;border-radius:8px;margin-left:4px;">✓ ID Saved</span>' : ''}
            </div>
            <button onclick="rebookGuest('${guest.booking_id}')" style="background:#3B82F6;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;">🔄 Rebook</button>
          </div>
          <div style="font-size:11px;color:#666;margin-top:4px;">
            Last: ${propName} · ${guest.check_in} → ${guest.check_out} · ${bookings.length} total booking${bookings.length>1?'s':''}
          </div>
        </div>
      `;
    }).join('');
  }, 300);
};

window.rebookGuest = async function(bookingId) {
  const { data: b } = await sb.from('guest_register').select('*').eq('booking_id', bookingId).single();
  if (!b) { fsn.error('Error', 'Booking not found'); return; }
  
  // Pre-fill all fields (except dates, property, amount)
  const setVal = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
  
  setVal('guestName', b.guest_name || '');
  setVal('guestPhone', b.phone || '');
  setVal('idType', b.id_proof_type || '');
  setVal('idNo', b.id_proof_no || '');
  setVal('guests', b.guests || 1);
  if (typeof showIdSlots === 'function') showIdSlots();
  
  // Vehicle (hasVehicle is a SELECT with Yes/No)
  if (b.has_vehicle) {
    setVal('hasVehicle', 'Yes');
    if (typeof toggleVehicle === 'function') toggleVehicle();
    setTimeout(() => {
      setVal('vehicleName', b.vehicle_name || '');
      setVal('vehicleNumber', b.vehicle_number || '');
    }, 100);
  }
  
  // Show existing ID photos (reuse info)
  const hasPhotos = b.id_proof_front_paths || b.id_proof_back_paths || b.id_proof_photo_paths;
  if (hasPhotos) {
    window._rebookedGuestData = {
      id_proof_front_paths: b.id_proof_front_paths,
      id_proof_back_paths: b.id_proof_back_paths,
      id_proof_photo_paths: b.id_proof_photo_paths,
      vehicle_photo_path: b.vehicle_photo_path
    };
    
    const resultsEl = document.getElementById('repeatGuestResults');
    resultsEl.innerHTML = `
      <div style="padding:10px;background:#F0FDF4;border:2px solid #059669;border-radius:8px;">
        <div style="color:#059669;font-weight:700;">✅ Guest data loaded! Photos will be reused.</div>
        <div style="font-size:11px;color:#666;margin-top:4px;">Just enter new: Property + Dates + Amount</div>
        <button onclick="clearRebookData()" style="margin-top:8px;background:#DC2626;color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:11px;cursor:pointer;">✕ Clear (Start Fresh)</button>
      </div>
    `;
    document.getElementById('repeatGuestSearch').value = '✓ ' + b.guest_name + ' (rebook)';
  }
  
  fsn.success('Loaded', '✅ ' + b.guest_name + ' - data pre-filled');
  
  // Scroll to property field
  document.getElementById('roomId')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.clearRebookData = function() {
  window._rebookedGuestData = null;
  document.getElementById('repeatGuestSearch').value = '';
  document.getElementById('repeatGuestResults').innerHTML = '';
  ['guestName', 'guestPhone', 'idProofNo', 'vehicleName', 'vehicleNumber'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  fsn.info('Cleared', 'Start fresh entry');
};

// ═══════════════════════════════════════════════════════════
// 🔄 DUPLICATE BOOKING (One-Click Clone)
// ═══════════════════════════════════════════════════════════

window.duplicateBooking = async function(bookingId) {
  const { data: b } = await sb.from('guest_register').select('*').eq('booking_id', bookingId).single();
  if (!b) { fsn.error('Error', 'Booking not found'); return; }
  
  const today = new Date().toISOString().slice(0, 10);
  
  // Calculate same nights as original
  const origIn = new Date(b.check_in);
  const origOut = new Date(b.check_out);
  const nights = Math.max(1, Math.round((origOut - origIn) / (1000*60*60*24)));
  
  const newOut = new Date();
  newOut.setDate(newOut.getDate() + nights);
  const newOutStr = newOut.toISOString().slice(0, 10);
  
  // Set prefill data (reuses existing renderAddBooking pre-fill mechanism)
  window._bookingPrefill = {
    guestName: b.guest_name || '',
    guestPhone: b.phone || '',
    roomId: b.room_id || '',
    bookingMode: b.booking_mode || 'Offline',
    checkIn: today,
    checkOut: newOutStr,
    checkInTime: b.check_in_time || '14:00',
    checkOutTime: b.check_out_time || '11:00',
    guests: b.guests || 1,
    idType: b.id_proof_type || '',
    idNo: b.id_proof_no || '',
    checkoutConfirmed: b.checkout_confirmed === false ? 'no' : 'yes',
    hasVehicle: b.has_vehicle ? 'Yes' : 'No',
    vehicleName: b.vehicle_name || '',
    vehicleNumber: b.vehicle_number || '',
    sourceRoomId: b.source_room_id || ''
  };
  
  // Reuse photos from original
  window._rebookedGuestData = {
    id_proof_front_paths: b.id_proof_front_paths,
    id_proof_back_paths: b.id_proof_back_paths,
    id_proof_photo_paths: b.id_proof_photo_paths,
    vehicle_photo_path: b.vehicle_photo_path
  };
  
  fsn.success('Duplicated', '✅ ' + b.guest_name + ' - just change property/dates if needed');
  renderAddBooking();
  
  // Scroll top after render
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Highlight duplicated notification
    const wrap = document.querySelector('.card');
    if (wrap) {
      const notice = document.createElement('div');
      notice.style.cssText = 'padding:12px;background:#F0FDF4;border:2px solid #059669;border-radius:8px;margin-bottom:12px;';
      notice.innerHTML = '<strong style="color:#059669;">🔄 Duplicated from: ' + (b.guest_name || 'previous booking') + '</strong>' +
        '<div style="font-size:12px;color:#666;margin-top:4px;">✅ All data + photos reused. Check-in set to today. Adjust property/dates/amount as needed.</div>' +
        '<button onclick="window._bookingPrefill=null;window._rebookedGuestData=null;renderAddBooking();" style="margin-top:8px;background:#DC2626;color:#fff;border:none;padding:4px 10px;border-radius:4px;font-size:11px;cursor:pointer;">✕ Clear (Start Fresh)</button>';
      wrap.parentNode.insertBefore(notice, wrap.nextSibling);
    }
  }, 200);
};

async function renderAddBooking() {
  const today_iso = new Date().toISOString().slice(0,10);
  const { data: recentBookings } = await sb.from('guest_register').select('booking_id, guest_name, room_id, check_in, check_out, rooms(nickname)').gte('check_out', today_iso).eq('is_review_booking', false).order('check_in', {ascending: true}).limit(100);
  const pre = window._bookingPrefill || {};
  const {data:rooms} = await sb.from('rooms')
    .select('room_id, unit_no, nickname, property_name, bookable, checkin_manager, caretaker_phone, map_link')
    .order('room_id');
  window._roomsCache = rooms || [];

  let idSlots = '';
  for (let i = 1; i <= 8; i++) {
    idSlots += `
      <div style="padding:10px;margin-bottom:8px;background:var(--bg);border:1px solid var(--border);border-radius:10px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:6px;">
          👤 Guest ${i} ${i === 1 ? '(Primary)' : ''}
        </div>
        <input type="text" id="gN${i}" placeholder="Guest ${i} naam"
          value="${i === 1 ? (pre.guestName || '') : ''}"
          style="font-size:13px;min-height:36px;margin-bottom:8px;width:100%;" />
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:4px;">📄 Front</div>
            <div class="id-card-btns">
              <button type="button" class="outline" onclick="document.getElementById('idFrontCam${i}').click()">📷 Camera</button>
              <button type="button" class="outline" onclick="document.getElementById('idFrontGal${i}').click()">🖼️ Gallery</button>
            </div>
            <input type="file" id="idFrontCam${i}" accept="image/*" capture="environment" style="display:none;" onchange="onIdFileSelect(this,${i},'front')" />
            <input type="file" id="idFrontGal${i}" accept="image/*" style="display:none;" onchange="onIdFileSelect(this,${i},'front')" />
            <div id="previewFront${i}" style="margin-top:4px;"></div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:4px;">📄 Back</div>
            <div class="id-card-btns">
              <button type="button" class="outline" onclick="document.getElementById('idBackCam${i}').click()">📷 Camera</button>
              <button type="button" class="outline" onclick="document.getElementById('idBackGal${i}').click()">🖼️ Gallery</button>
            </div>
            <input type="file" id="idBackCam${i}" accept="image/*" capture="environment" style="display:none;" onchange="onIdFileSelect(this,${i},'back')" />
            <input type="file" id="idBackGal${i}" accept="image/*" style="display:none;" onchange="onIdFileSelect(this,${i},'back')" />
            <div id="previewBack${i}" style="margin-top:4px;"></div>
          </div>
        </div>
      </div>`;
  }

  const idSummaryHtml = '<div id="idUploadSummary"></div>';

  renderShell(`
    <div class="card">
      <h1>➕ New Booking</h1>
      <button class="secondary btn-sm" onclick="window._bookingPrefill=null;renderManageBookings()">← Back</button>
    </div>
    <div class="card">
      <input type="hidden" id="parentBookingId" value="${pre.parentBookingId || ''}" />
      <input type="hidden" id="stayGroupId" value="${pre.stayGroupId || ''}" />
      ${pre.parentBookingId ? `<div class="success-msg" style="margin-bottom:10px;">Extension of <strong>${pre.parentBookingId}</strong></div>` : ''}

<div class="form-grid">
        <div class="form-group"><label>Guest Name *</label><input id="guestName" placeholder="Guest ka naam" value="${pre.guestName || ''}" /></div>
        <div class="form-group"><label>Phone</label><input id="guestPhone" type="tel" placeholder="Mobile" value="${pre.guestPhone || ''}" /></div>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Property *</label>
          <select id="roomId" onchange="onRoomChg()">
            <option value="">Select</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}" ${pre.roomId === r.room_id ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
          </select>
          <div id="roomInfo" style="font-size:11px;color:var(--muted);margin-top:2px;"></div>
        </div>
        <div class="form-group">
          <label>Mode</label>
          <select id="bookingMode" onchange="onModeChg()">
            <option value="Offline" ${(pre.bookingMode || 'Offline') === 'Offline' ? 'selected' : ''}>Offline</option>
            <option value="Online-Airbnb" ${(pre.bookingMode || '') === 'Online-Airbnb' ? 'selected' : ''}>Online (Airbnb)</option>
          </select>
        </div>
      </div>

      <div class="form-group" style="padding:12px;background:#FFF8E1;border-radius:8px;border:1px solid #FFC107;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
          <input type="checkbox" id="isReviewBooking" onchange="toggleReviewBooking()" style="width:18px;height:18px;" />
          <span>🔗 Review Booking (Airbnb duplicate — for reviews only)</span>
        </label>
        <div id="linkedBookingWrap" style="display:none;margin-top:8px;">
          <label style="font-size:12px;color:#666;">Link to existing booking:</label>
          <select id="linkedBookingId" style="width:100%;padding:8px;margin-top:4px;"><option value="">-- Select existing booking --</option>${(recentBookings || []).map(rb => `<option value="${rb.booking_id}">${rb.guest_name} — ${rb.rooms?.nickname || rb.room_id} (${rb.check_in} to ${rb.check_out})</option>`).join('')}</select>
          <div style="font-size:11px;color:#888;margin-top:4px;">This booking will skip clash check + not count in revenue/occupancy</div>
        </div>
      </div>

      ${['developer','admin','manager'].includes(SESSION.role) ? `
      <div class="form-group" style="padding:12px;background:#F0F7FF;border-radius:8px;border:1px solid #3B82F6;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
          <input type="checkbox" id="showToInvestor" checked onchange="toggleHideReason()" style="width:18px;height:18px;" />
          <span>👁️ Show this booking to Investor</span>
        </label>
        <div style="font-size:11px;color:#666;margin-top:4px;margin-left:26px;">
          ✅ Checked (default): Booking will appear in investor reports<br>
          🚫 Unchecked: Booking hidden from investor reports (admin-only)
        </div>
        <div id="hideReasonWrap" style="display:none;margin-top:8px;">
          <label style="font-size:12px;color:#666;">📝 Reason for hiding (optional):</label>
          <input id="hideReason" placeholder="e.g. Complimentary stay, renovation team, personal use" style="width:100%;padding:8px;margin-top:4px;font-size:13px;" />
        </div>
      </div>` : ''}


      <div id="onlineBox" style="display:none;background:#f0f7ff;padding:12px;border-radius:8px;margin:6px 0;">
        <div class="section-title">🌐 Source Listing</div>
        <div class="form-group">
          <label>Original Listing (agar shift hua)</label>
          <select id="sourceRoomId">
            <option value="">Same as actual</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}" ${(pre.sourceRoomId || '') === r.room_id ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Check-in Date</label><input id="checkIn" type="date" onchange="onRoomChg()" value="${pre.checkIn || ''}" /></div>
        <div class="form-group"><label>Check-in Time</label><input id="checkInTime" type="time" value="${pre.checkInTime || '14:00'}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Check-out Date</label><input id="checkOut" type="date" onchange="onRoomChg()" value="${pre.checkOut || ''}" /></div>
        <div class="form-group"><label>Check-out Time</label><input id="checkOutTime" type="time" value="${pre.checkOutTime || '11:00'}" /></div>
      </div>
      <div id="nightsInfo" style="font-size:12px;color:var(--muted);margin-bottom:6px;"></div>

      <div class="form-grid">
        <div class="form-group">
          <label>Checkout Type</label>
          <select id="checkoutConfirmed">
            <option value="yes" ${(pre.checkoutConfirmed || 'yes') === 'yes' ? 'selected' : ''}>Fixed Date</option>
            <option value="no" ${pre.checkoutConfirmed === 'no' ? 'selected' : ''}>Open — Per Day</option>
          </select>
        </div>
        <div class="form-group"><label>Guests</label>
          <input id="guests" type="number" value="${pre.guests || 1}" min="1" max="8"
            onchange="showIdSlots()" oninput="showIdSlots()" />
        </div>
      </div>

      <!-- OFFLINE: Total Amount + per day auto calc -->
      <div id="offlineAmtBox">
        <div class="form-grid">
          <div class="form-group">
            <label>Total Amount ₹ *</label>
            <input id="totalAmount" type="number" placeholder="Total kitne me book hua"
              oninput="onAmtChg()" value="${pre.totalAmount || ''}" />
            <div id="sugInfo" style="font-size:11px;color:var(--muted);"></div>
          </div>
          <div class="form-group">
            <label>Per Day Rate ₹ (auto)</label>
            <input id="perDayRate" type="number" placeholder="Auto from total ÷ nights" readonly
              style="background:#f5f5f5;color:var(--muted);" value="${pre.perDayRate || ''}" />
          </div>
        </div>
      </div>

      <!-- ONLINE: Total Amount + per day auto calc -->
      <div id="onlineAmtBox" style="display:none;">
        <div class="form-grid">
          <div class="form-group">
            <label>Total Amount ₹ * (Net Payout)</label>
            <input id="totalAmountOnline" type="number" placeholder="Jo bank me aaya"
              oninput="onAmtChg()" value="${pre.totalAmount || ''}" />
          </div>
          <div class="form-group">
            <label>Per Day Rate ₹ (auto)</label>
            <input id="perDayRateOnline" type="number" placeholder="Auto calc" readonly
              style="background:#f5f5f5;color:var(--muted);" value="${pre.perDayRate || ''}" />
          </div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Advance ₹</label>
          <input id="advanceAmt" type="number" value="${pre.advanceAmt || 0}" oninput="onAmtChg()" />
        </div>
        <div class="form-group"><label>Advance Mode</label>
          <select id="advMode">
            <option value="">--</option>
            <option value="Cash" ${pre.advMode === 'Cash' ? 'selected' : ''}>Cash</option>
            <option value="UPI" ${pre.advMode === 'UPI' ? 'selected' : ''}>UPI</option>
            <option value="Bank" ${pre.advMode === 'Bank' ? 'selected' : ''}>Bank</option>
            <option value="Airbnb Payout" ${pre.advMode === 'Airbnb Payout' ? 'selected' : ''}>Airbnb Payout</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Advance Date</label>
        <input id="advDate" type="date" value="${new Date().toISOString().slice(0, 10)}" />
      </div>
      <div id="balInfo" style="font-size:13px;font-weight:600;margin:2px 0 8px;"></div>

      <!-- VEHICLE -->
      <div class="form-grid">
        <div class="form-group">
          <label>Vehicle?</label>
          <select id="hasVehicle" onchange="toggleVehicle()">
            <option value="false" ${pre.hasVehicle ? '' : 'selected'}>No</option>
            <option value="true" ${pre.hasVehicle ? 'selected' : ''}>Yes</option>
          </select>
        </div>
      </div>
      <div id="vehicleBox" style="display:${pre.hasVehicle ? 'block' : 'none'};">
        <div class="form-grid">
          <div class="form-group"><label>Vehicle Name</label>
            <input id="vehicleName" placeholder="e.g. Swift Dzire" value="${pre.vehicleName || ''}" />
          </div>
          <div class="form-group"><label>Registration No.</label>
            <input id="vehicleNumber" placeholder="e.g. UP32 XX 1234" value="${pre.vehicleNumber || ''}" />
          </div>
        </div>
        <div class="form-group">
          <label>Vehicle Photo (Optional)</label>
          <input type="file" id="vehiclePhoto" accept="image/*" capture="environment"
            style="font-size:12px;" onchange="onVehiclePhotoSelect(this)" />
          <div id="vehiclePhotoPreview" style="margin:4px 0;"></div>
        </div>
      </div>

      <!-- ID PROOF -->
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin-top:6px;">
        <div class="section-title">🪪 ID Proof (Front & Back)</div>
        <div class="form-grid">
          <div class="form-group"><label>ID Type</label>
            <select id="idType">
              <option value="Aadhar" selected>Aadhar</option>
              <option value="PAN">PAN</option>
              <option value="DL">DL</option>
              <option value="Passport">Passport</option>
            </select>
          </div>
          <div class="form-group"><label>ID Number</label>
            <input id="idNo" placeholder="e.g. 1234 5678 9012" value="${pre.idNo || ''}" />
          </div>
        </div>
        <div class="id-grid">${idSlots}</div>
      </div>

      <div class="form-group" style="margin-top:10px;">
        <label>Notes</label>
        <textarea id="bkNotes" placeholder="Special notes...">${pre.bkNotes || ''}</textarea>
      </div>
      <button id="saveBtn" onclick="saveBooking()" style="width:100%;padding:14px;font-size:15px;margin-top:10px;">
        💾 Save Booking
      </button>
      <div id="addBkErr"></div>
    </div>
  `, 'bookings');

  onModeChg(); onRoomChg(); showIdSlots();
}

// ============ BOOKING HELPERS ============
function showIdSlots() {
  const n = Math.min(parseInt(document.getElementById('guests')?.value) || 1, 8);
  for (let i = 1; i <= 8; i++) {
    const el = document.getElementById(`idSlot${i}`);
    if (el) el.style.display = i <= n ? 'block' : 'none';
  }
}

function showEditIdSlots() {
  const n = Math.min(parseInt(document.getElementById('guests')?.value) || 1, 8);
  for (let i = 1; i <= 8; i++) {
    const el = document.getElementById(`editIdSlot${i}`);
    if (el) el.style.display = i <= n ? 'block' : 'none';
  }
}


// ============ VEHICLE PHOTO HANDLER ============
function onVehiclePhotoPick(src, mode = 'new') {
  const prefix = mode === 'edit' ? 'editVehicle' : 'vehicle';
  const inp = document.getElementById(src === 'cam' ? `${prefix}PhotoCam` : `${prefix}PhotoGal`);
  const preview = document.getElementById('vehiclePhotoPreview');
  if (!inp?.files?.[0] || !preview) return;

  openCropModal(inp.files[0], (croppedFile) => {
    const dt = new DataTransfer();
    dt.items.add(croppedFile);
    inp.files = dt.files;
    const url = URL.createObjectURL(croppedFile);
    const sizeMB = (croppedFile.size / 1024 / 1024).toFixed(1);
    preview.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f0fff4;border-radius:8px;border:1.5px solid var(--green);margin:6px 0;">
        <img src="${url}" style="width:70px;height:50px;object-fit:cover;border-radius:6px;" />
        <div style="flex:1;">
          <div style="font-size:12px;color:var(--green);font-weight:700;">✅ Ready</div>
          <div style="font-size:10px;color:var(--muted);">${sizeMB} MB</div>
        </div>
        <button type="button" class="btn-sm outline" style="padding:4px 10px;font-size:11px;"
          onclick="onVehiclePhotoPick('gal','${mode}')">✂️ Re-crop</button>
        <button type="button" class="btn-sm danger" style="padding:4px 10px;font-size:11px;"
          onclick="document.getElementById('${prefix}PhotoCam').value='';document.getElementById('${prefix}PhotoGal').value='';document.getElementById('vehiclePhotoPreview').innerHTML='';">🗑️</button>
      </div>`;
  });
}

function toggleVehicle() {
  const hasV = document.getElementById('hasVehicle')?.value === 'true';
  const box = document.getElementById('vehicleBox');
  if (box) box.style.display = hasV ? 'block' : 'none';
}

function onModeChg() {
  const m = document.getElementById('bookingMode')?.value;
  const isOnline = m === 'Online-Airbnb';

  // Toggle source listing box
  const onlineBox = document.getElementById('onlineBox');
  if (onlineBox) onlineBox.style.display = isOnline ? 'block' : 'none';

  // Toggle amount boxes
  const offBox = document.getElementById('offlineAmtBox');
  const onBox = document.getElementById('onlineAmtBox');
  if (offBox) offBox.style.display = isOnline ? 'none' : 'block';
  if (onBox) onBox.style.display = isOnline ? 'block' : 'none';

  if (isOnline) {
    const rid = document.getElementById('roomId')?.value;
    const src = document.getElementById('sourceRoomId');
    if (src && !src.value && rid) src.value = rid;
    // Online: auto fill advance = total
    const tot = parseFloat(document.getElementById('totalAmountOnline')?.value) || 0;
    if (tot > 0) {
      const advEl = document.getElementById('advanceAmt');
      if (advEl) advEl.value = tot;
    }
  }
  onAmtChg();
}

function onRoomChg() {
  const rid = document.getElementById('roomId')?.value;
  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const room = (window._roomsCache || []).find(r => r.room_id === rid);
  const rInfo = document.getElementById('roomInfo');
  if (room) rInfo.innerHTML = `${room.bookable ? '✅' : '⚠️'} · ${room.checkin_manager || 'No manager'}`;
  else if (rInfo) rInfo.innerHTML = '';

  const mode = document.getElementById('bookingMode')?.value;
  const src = document.getElementById('sourceRoomId');
  if (mode === 'Online-Airbnb' && src && !src.value && rid) src.value = rid;

  const nInfo = document.getElementById('nightsInfo');
  if (ci && co) {
    const nights = calcNights(ci, co);
    if (nInfo) nInfo.innerHTML = nights > 0
      ? `🌙 <strong>${nights} night(s)</strong>`
      : `<span style="color:var(--red);">Invalid dates</span>`;
  } else if (nInfo) nInfo.innerHTML = '';

  onAmtChg();
}

function onRateChg() {
  // Not used directly — kept for compatibility
}

function onAmtChg() {
  const mode = document.getElementById('bookingMode')?.value;
  const isOnline = mode === 'Online-Airbnb';

  const ci = document.getElementById('checkIn')?.value;
  const co = document.getElementById('checkOut')?.value;
  const nights = calcNights(ci, co);

  let total = 0;

  if (isOnline) {
    // Online: user enters total (net payout) → per day auto calc → advance = total
    total = parseFloat(document.getElementById('totalAmountOnline')?.value) || 0;
    const rateEl = document.getElementById('perDayRateOnline');
    if (rateEl && total > 0 && nights > 0) {
      rateEl.value = Math.round(total / nights);
    }
    const advEl = document.getElementById('advanceAmt');
    if (advEl && total > 0) advEl.value = total;

  } else {
    // Offline: user enters total → per day auto calc
    total = parseFloat(document.getElementById('totalAmount')?.value) || 0;
    const rateEl = document.getElementById('perDayRate');
    if (rateEl && total > 0 && nights > 0) {
      rateEl.value = Math.round(total / nights);
    }
  }

  const adv = parseFloat(document.getElementById('advanceAmt')?.value) || 0;
  const bal = total - adv;
  const el = document.getElementById('balInfo');
  if (el) {
    if (total > 0) el.innerHTML = bal > 0
      ? `<span style="color:var(--red);">💳 Balance: ₹${bal.toLocaleString('en-IN')}</span>`
      : `<span style="color:var(--green);">✅ Fully Paid</span>`;
    else el.innerHTML = '';
  }

  // Update sugInfo for offline
  if (!isOnline && total > 0 && nights > 0) {
    const rate = Math.round(total / nights);
    const sugInfo = document.getElementById('sugInfo');
    if (sugInfo) sugInfo.innerHTML = `💡 ₹${rate.toLocaleString('en-IN')}/night × ${nights} nights = ₹${total.toLocaleString('en-IN')}`;
  }
}

// ============ ROBUST FILE UPLOAD HELPERS ============


// ═══════════════════════════════════════════════════════════
// 🔒 STABLE - DO NOT MODIFY (ID Upload Fixed 2026-07-26)
// Uses window._editIdFiles map + maxGuestWithFile loop
// Works for all 8 guests, mobile crop, DataTransfer fallback
// ═══════════════════════════════════════════════════════════
function onEditIdFileSelect(input, guestNum, side) {
  if (!input.files || !input.files[0]) return;
  const originalFile = input.files[0];

  openCropModal(originalFile, (croppedFile) => {
    if (!window._editIdFiles) window._editIdFiles = {};
    const key = `${side}_${guestNum}`;
    window._editIdFiles[key] = croppedFile;

    try {
      const dt = new DataTransfer();
      dt.items.add(croppedFile);
      input.files = dt.files;
    } catch(e) {}

    showEditPreview(input, guestNum, side);
  });
}

function showEditPreview(input, guestNum, side) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  const sideLabel = side === 'front' ? 'Front' : 'Back';
  const previewEl = document.getElementById(`ePreview${sideLabel}${guestNum}`);
  const reader = new FileReader();
  reader.onload = function(e) {
    if (previewEl) {
      previewEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#f0fff4;border-radius:8px;border:1.5px solid var(--green);margin:4px 0;">
          <img src="${e.target.result}" style="width:56px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />
          <div style="flex:1;">
            <div style="font-size:11px;color:var(--green);font-weight:700;">✅ New ${sideLabel} Ready</div>
            <div style="font-size:10px;color:var(--muted);">${sizeMB} MB · Save to upload</div>
          </div>
        </div>`;
    }
  };
  reader.readAsDataURL(file);
}

function onIdFileSelect(input, guestNum, side) {
  const previewEl = document.getElementById(`preview${side === 'front' ? 'Front' : 'Back'}${guestNum}`);
  const slot = document.getElementById(`idSlot${guestNum}`);

  if (!input.files || !input.files[0]) {
    if (previewEl) previewEl.innerHTML = '';
    return;
  }

  // Open crop modal
  openCropModal(input.files[0], (croppedFile) => {
    // Replace input's file with cropped version
    const dt = new DataTransfer();
    dt.items.add(croppedFile);
    input.files = dt.files;
    showIdPreview(input, guestNum, side);
  });
}

function showIdPreview(input, guestNum, side) {
  const previewEl = document.getElementById(`preview${side === 'front' ? 'Front' : 'Back'}${guestNum}`);
  const slot = document.getElementById(`idSlot${guestNum}`);
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  const sideLabel = side === 'front' ? 'Front' : 'Back';

  const reader = new FileReader();
  reader.onload = function(e) {
    if (previewEl) {
      previewEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#f0fff4;border-radius:8px;border:1.5px solid var(--green);margin:4px 0;">
          <img src="${e.target.result}" style="width:56px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />
          <div style="flex:1;">
            <div style="font-size:11px;color:var(--green);font-weight:700;">✅ ${sideLabel} Ready</div>
            <div style="font-size:10px;color:var(--muted);">${sizeMB} MB · Will compress on upload</div>
          </div>
          <button type="button" class="btn-sm danger" style="min-height:24px;padding:2px 8px;font-size:10px;"
            onclick="clearIdFile(${guestNum},'${side}')">✕</button>
        </div>`;
    }
    if (slot) {
      slot.classList.add('done');
      slot.style.borderColor = 'var(--green)';
    }
    updateIdUploadSummary();
  };
  reader.readAsDataURL(file);
}

function clearIdFile(guestNum, side) {
  const prefix = side === 'front' ? 'idFront' : 'idBack';
  const cam = document.getElementById(`${prefix}Cam${guestNum}`);
  const gal = document.getElementById(`${prefix}Gal${guestNum}`);
  const previewId = `preview${side === 'front' ? 'Front' : 'Back'}${guestNum}`;
  if (cam) cam.value = '';
  if (gal) gal.value = '';
  const preview = document.getElementById(previewId);
  if (preview) preview.innerHTML = '';
  updateIdUploadSummary();
}

function updateIdUploadSummary() {
  const el = document.getElementById('idUploadSummary');
  if (!el) return;
  const cnt = Math.min(parseInt(document.getElementById('guests')?.value) || 1, 8);
  let ready = 0, total = 0;
  for (let i = 1; i <= 8; i++) {
    const fc = document.getElementById(`idFrontCam${i}`);
    const fg = document.getElementById(`idFrontGal${i}`);
    const bc = document.getElementById(`idBackCam${i}`);
    const bg = document.getElementById(`idBackGal${i}`);
    total += 2;
    if (fc?.files?.length || fg?.files?.length) ready++;
    if (bc?.files?.length || bg?.files?.length) ready++;
  }
  const pct = total > 0 ? Math.round(ready / total * 100) : 0;
  const color = pct === 100 ? 'var(--green)' : pct > 0 ? 'var(--yellow)' : 'var(--red)';
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg);border-radius:8px;margin:8px 0;">
      <div style="flex:1;">
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 0.3s;"></div>
        </div>
      </div>
      <span style="font-size:11px;font-weight:700;color:${color};">${ready}/${total} photos · ${pct}%</span>
    </div>`;
}

function onVehiclePhotoSelect(input) {
  const previewEl = document.getElementById('vehiclePhotoPreview');
  if (!input.files || !input.files[0]) {
    if (previewEl) previewEl.innerHTML = '';
    return;
  }

  openCropModal(input.files[0], (croppedFile) => {
    const dt = new DataTransfer();
    dt.items.add(croppedFile);
    input.files = dt.files;
    showVehiclePreview(input);
  });
}

function showVehiclePreview(input) {
  const previewEl = document.getElementById('vehiclePhotoPreview');
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  const reader = new FileReader();
  reader.onload = function(e) {
    if (previewEl) {
      previewEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f0fff4;border-radius:8px;border:1.5px solid var(--green);margin:6px 0;">
          <img src="${e.target.result}" style="width:70px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />
          <div style="flex:1;">
            <div style="font-size:12px;color:var(--green);font-weight:700;">✅ Vehicle Photo Ready</div>
            <div style="font-size:10px;color:var(--muted);">${sizeMB} MB</div>
          </div>
          <button type="button" class="btn-sm outline" style="padding:4px 10px;font-size:11px;"
            onclick="reCropVehicle()">✂️ Re-crop</button>
          <button type="button" class="btn-sm danger" style="padding:4px 10px;font-size:11px;"
            onclick="clearVehiclePhoto()">🗑️ Delete</button>
        </div>`;
    }
  };
  reader.readAsDataURL(file);
}

function clearVehiclePhoto() {
  const inp = document.getElementById('vehiclePhoto');
  const preview = document.getElementById('vehiclePhotoPreview');
  if (inp) inp.value = '';
  if (preview) preview.innerHTML = '';
}

function reCropVehicle() {
  const inp = document.getElementById('vehiclePhoto');
  if (!inp?.files?.[0]) return;
  openCropModal(inp.files[0], (croppedFile) => {
    const dt = new DataTransfer();
    dt.items.add(croppedFile);
    inp.files = dt.files;
    showVehiclePreview(inp);
  });
}

function parseIdPathArray(val) {
  if (!val) return [];
  const txt = String(val).trim();
  if (!txt) return [];
  if (txt.startsWith('[')) {
    try {
      const arr = JSON.parse(txt);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {}
  }
  return txt.split(',').filter(Boolean);
}

function stringifyIdPathArray(arr) {
  return JSON.stringify((arr || []).map(x => x || null));
}

// ============ ROBUST UPLOAD WITH RETRY & PROGRESS ============

async function robustUpload(path, blob, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await sb.storage.from('id-proofs').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600'
      });
      if (!error) return { success: true, path };
      lastError = error;
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, attempt * 800));
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, attempt * 800));
    }
  }
  return { success: false, error: lastError?.message || 'Upload failed after 3 attempts' };
}

async function smartCompress(file, targetSizeKB = 300) {
  // Progressive compression - reduces quality until under target size
  let quality = 0.8;
  let maxDim = 1200;

  // Large files get more aggressive compression
  const sizeMB = file.size / 1024 / 1024;
  if (sizeMB > 5) { quality = 0.6; maxDim = 1000; }
  if (sizeMB > 10) { quality = 0.5; maxDim = 800; }

  try {
    return await compressImage(file, maxDim, quality);
  } catch (e) {
    console.warn('Compression failed, using original:', e);
    return file;
  }
}

async function uploadIdPhotos(bkId) {
  const cnt = Math.min(parseInt(document.getElementById('guests')?.value) || 1, 8);
  const frontPaths = Array(cnt).fill(null);
  const backPaths = Array(cnt).fill(null);
  const allPaths = [];
  const failedUploads = [];

  // Collect all files to upload
  const uploadQueue = [];
  for (let i = 1; i <= cnt; i++) {
    const guestName = (document.getElementById(`gN${i}`)?.value?.trim() || `Guest${i}`)
      .replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);

    const frontFile = document.getElementById(`idFrontCam${i}`)?.files?.[0]
      || document.getElementById(`idFrontGal${i}`)?.files?.[0];
    if (frontFile) uploadQueue.push({ file: frontFile, side: 'front', guestNum: i, guestName });

    const backFile = document.getElementById(`idBackCam${i}`)?.files?.[0]
      || document.getElementById(`idBackGal${i}`)?.files?.[0];
    if (backFile) uploadQueue.push({ file: backFile, side: 'back', guestNum: i, guestName });
  }

  const totalFiles = uploadQueue.length;
  if (totalFiles === 0) {
    return { frontPaths: null, backPaths: null, allPaths: null, firstPath: null };
  }

  const progressEl = document.getElementById('idUploadSummary') || document.getElementById('addBkErr');

  const renderProgress = (currentIdx, currentFile, status) => {
    if (!progressEl) return;
    const pct = totalFiles > 0 ? Math.round((currentIdx / totalFiles) * 100) : 0;

    let queueList = '';
    uploadQueue.forEach((item, i) => {
      let icon = '⏳';
      let color = '#B0B0B0';
      if (i < currentIdx) { icon = '✅'; color = '#00A699'; }
      if (i === currentIdx) { icon = status || '📤'; color = '#FF385C'; }
      queueList += `
        <div style="display:flex;align-items:center;gap:6px;padding:4px 8px;background:${i === currentIdx ? '#FFF0F3' : 'transparent'};border-radius:4px;font-size:11px;">
          <span style="color:${color};font-weight:700;">${icon}</span>
          <span style="color:${color};">Guest ${item.guestNum} ${item.side === 'front' ? 'Front' : 'Back'}</span>
          <span style="color:var(--muted);font-size:10px;margin-left:auto;">${(item.file.size/1024/1024).toFixed(1)}MB</span>
        </div>`;
    });

    progressEl.innerHTML = `
      <div style="padding:14px;background:#fff;border:2px solid #FF385C;border-radius:12px;margin:8px 0;box-shadow:0 4px 12px rgba(255,56,92,0.15);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-size:14px;font-weight:700;color:var(--dark);">
            📤 Uploading ID Photos...
          </div>
          <div style="font-size:13px;font-weight:700;color:#FF385C;">${currentIdx}/${totalFiles}</div>
        </div>
        <div style="height:8px;background:#EBEBEB;border-radius:4px;overflow:hidden;margin-bottom:12px;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#FF385C,#E00B41);border-radius:4px;transition:width 0.3s;"></div>
        </div>
        <div style="max-height:200px;overflow-y:auto;">
          ${queueList}
        </div>
        <div style="font-size:11px;color:var(--muted);margin-top:8px;text-align:center;">
          ${pct}% complete · Please don't close this window
        </div>
      </div>`;
  };

  for (let i = 0; i < uploadQueue.length; i++) {
    const item = uploadQueue[i];
    renderProgress(i, item, '📤');

    try {
      // Compress
      const compressed = await smartCompress(item.file);

      // Upload with retry
      const timestamp = Date.now();
      const path = `${bkId}/${timestamp}_${item.guestName}_${item.side}.jpg`;
      const result = await robustUpload(path, compressed, 3);

      if (result.success) {
        if (item.side === 'front') {
          frontPaths[item.guestNum - 1] = path;
        } else {
          backPaths[item.guestNum - 1] = path;
        }
        allPaths.push(path);
        renderProgress(i + 1, item, '✅');
      } else {
        failedUploads.push({ ...item, error: result.error });
        renderProgress(i + 1, item, '❌');
        console.warn(`Failed: Guest ${item.guestNum} ${item.side}:`, result.error);
      }
    } catch (e) {
      failedUploads.push({ ...item, error: e.message });
      console.error(`Error uploading Guest ${item.guestNum} ${item.side}:`, e);
    }
  }

  // Final summary
  if (progressEl) {
    const successCount = allPaths.length;
    const isPerfect = failedUploads.length === 0;

    progressEl.innerHTML = `
      <div style="padding:14px;background:${isPerfect ? '#f0fff4' : '#FFF5F5'};border:2px solid ${isPerfect ? '#00A699' : '#FF385C'};border-radius:12px;margin:8px 0;">
        <div style="font-size:15px;font-weight:800;color:${isPerfect ? '#00A699' : '#FF385C'};margin-bottom:6px;">
          ${isPerfect ? '✅ All Photos Uploaded Successfully!' : '⚠️ Upload Completed with Errors'}
        </div>
        <div style="font-size:13px;color:var(--dark);">
          <strong>${successCount}</strong> of <strong>${totalFiles}</strong> photos uploaded
          ${failedUploads.length > 0 ? `<br><span style="color:var(--red);">❌ ${failedUploads.length} failed - please retry</span>` : ''}
        </div>
        <div style="height:8px;background:#EBEBEB;border-radius:4px;overflow:hidden;margin-top:8px;">
          <div style="height:100%;width:100%;background:${isPerfect ? '#00A699' : '#FF385C'};border-radius:4px;"></div>
        </div>
      </div>`;
  }

  return {
    frontPaths: stringifyIdPathArray(frontPaths),
    backPaths: stringifyIdPathArray(backPaths),
    allPaths: allPaths.length ? allPaths.join(',') : null,
    firstPath: allPaths[0] || null,
    failedCount: failedUploads.length
  };
}

async function uploadVehiclePhoto(bkId) {
  const input = document.getElementById('vehiclePhoto');
  if (!input?.files?.[0]) return null;

  try {
    const compressed = await smartCompress(input.files[0]);
    const path = `${bkId}/${Date.now()}_vehicle.jpg`;
    const result = await robustUpload(path, compressed, 3);
    if (result.success) return path;
    console.warn('Vehicle photo failed:', result.error);
  } catch (e) {
    console.warn('Vehicle photo failed:', e);
  }
  return null;
}
// ============ SAVE BOOKING ============
function toggleHideReason() {
  const cb = document.getElementById('showToInvestor');
  const wrap = document.getElementById('hideReasonWrap');
  if (!cb || !wrap) return;
  wrap.style.display = cb.checked ? 'none' : 'block';
}

function toggleEditHideReason() {
  const cb = document.getElementById('editShowToInvestor');
  const wrap = document.getElementById('editHideReasonWrap');
  if (!cb || !wrap) return;
  wrap.style.display = cb.checked ? 'none' : 'block';
}

async function saveBooking() {
  const btn = document.getElementById('saveBtn');
  if (btn.disabled) return;
  btn.disabled = true; btn.textContent = '⏳ Saving...';

  try {
    const gn = document.getElementById('guestName').value.trim();
    const ph = document.getElementById('guestPhone').value.trim();
    const rid = document.getElementById('roomId').value;
    const mode = document.getElementById('bookingMode').value;
    const isOnline = mode === 'Online-Airbnb';
    const sourceRoomId = isOnline ? (document.getElementById('sourceRoomId')?.value || rid) : null;
    const ci = document.getElementById('checkIn').value;
    const co = document.getElementById('checkOut').value;
    const checkInTime = document.getElementById('checkInTime')?.value || '14:00';
    const checkOutTime = document.getElementById('checkOutTime')?.value || '11:00';
    const checkoutConfirmed = document.getElementById('checkoutConfirmed')?.value === 'yes';
    const gs = Math.min(Math.max(parseInt(document.getElementById('guests').value) || 1, 1), 8);
    const nights = calcNights(ci, co);

    // Get total from correct field
    let tot = isOnline
      ? parseFloat(document.getElementById('totalAmountOnline')?.value) || 0
      : parseFloat(document.getElementById('totalAmount')?.value) || 0;

    // Per day rate
    const perDayRate = nights > 0 && tot > 0 ? Math.round(tot / nights) : 0;

    // Advance: online = tot, offline = whatever entered
    let adv = isOnline ? tot : (parseFloat(document.getElementById('advanceAmt').value) || 0);

    const advMode = document.getElementById('advMode').value;
    const advDate = document.getElementById('advDate')?.value || new Date().toISOString().slice(0, 10);
    const idType = document.getElementById('idType').value;
    const idNo = document.getElementById('idNo').value.trim();
    const parentBookingId = document.getElementById('parentBookingId')?.value || null;
    const stayGroupId = document.getElementById('stayGroupId')?.value || null;
    const hasVehicle = document.getElementById('hasVehicle')?.value === 'true';
    const vehicleName = hasVehicle ? (document.getElementById('vehicleName')?.value.trim() || null) : null;
    const vehicleNumber = hasVehicle ? (document.getElementById('vehicleNumber')?.value.trim() || null) : null;
    let notes = document.getElementById('bkNotes').value.trim();

    // NEW: Read show_to_investor + hide_reason (admin toggle)
    const showToInvEl = document.getElementById('showToInvestor');
    const showToInvestor = showToInvEl ? showToInvEl.checked : true;  // default true
    const hideReasonEl = document.getElementById('hideReason');
    const hideReason = (!showToInvestor && hideReasonEl) ? hideReasonEl.value.trim() || null : null;

    if (!gn || !rid) {
      document.getElementById('addBkErr').innerHTML = '<div class="error">Guest name & property required</div>';
      btn.disabled = false; btn.textContent = '💾 Save Booking'; return;
    }

    if (tot === 0) {
      const proceed = confirm('⚠️ Total amount ₹0 hai. Save karna hai?');
      if (!proceed) { btn.disabled = false; btn.textContent = '💾 Save Booking'; return; }
    }

    // Clash check — WARN but allow (Phase 2 upgrade)
    let doubleBookingNote = null;
    if (ci && co) {
      const { data: ex } = await sb.from('guest_register')
        .select('booking_id,guest_name,check_in,check_out,booking_mode,total_amount,is_cancelled')
        .eq('room_id', rid);
      const isReviewBk = document.getElementById('isReviewBooking')?.checked;
      const clashes = isReviewBk ? [] : (ex || []).filter(b =>
        !b.is_cancelled && b.check_in && b.check_out && b.check_in < co && b.check_out > ci
      );

      if (clashes.length > 0) {
        const clashList = clashes.map(c => {
          const modeLabel = c.booking_mode === 'Online-Airbnb' ? '🌐 Airbnb' : '🏠 Direct';
          return `• ${c.guest_name} (${c.check_in} → ${c.check_out}) — ${modeLabel} — ₹${(c.total_amount || 0).toLocaleString('en-IN')}`;
        }).join('\n');

        const warningMsg = `⚠️ DOUBLE BOOKING WARNING\n\n` +
          `Ye slot pe pehle se ${clashes.length} booking hai:\n\n${clashList}\n\n` +
          `Kya fir bhi save karna hai?\n\n` +
          `✅ OK = Save Anyway (audit note add hoga)\n` +
          `❌ Cancel = Booking cancel karo`;

        const proceed = confirm(warningMsg);
        if (!proceed) {
          document.getElementById('addBkErr').innerHTML =
            `<div class="error">❌ Booking cancelled — clash with ${clashes[0].guest_name}</div>`;
          btn.disabled = false;
          btn.textContent = '💾 Save Booking';
          return;
        }

        // User approved — add audit note
        const userName = SESSION.displayName || SESSION.role || 'Unknown';
        const clashNames = clashes.map(c => c.guest_name).join(', ');
        doubleBookingNote = `⚠️ Double booking approved by ${userName} on ${new Date().toISOString().slice(0,10)} — clashes with: ${clashNames}`;
      }
    }

    const bkId = 'B' + Date.now();
    const finalStayGroupId = stayGroupId || bkId;
    // 🔄 REUSE photos from rebook if available
    let photos;
    if (window._rebookedGuestData) {
      photos = {
        front: window._rebookedGuestData.id_proof_front_paths,
        back: window._rebookedGuestData.id_proof_back_paths,
        combined: window._rebookedGuestData.id_proof_photo_paths
      };
      console.log('♻️ Reusing photos from rebook');
    } else {
      photos = await uploadIdPhotos(bkId);
    }
    const vehiclePhotoPath = hasVehicle 
      ? (window._rebookedGuestData?.vehicle_photo_path || await uploadVehiclePhoto(bkId))
      : null;
    

    const noteParts = [];
    if (notes) noteParts.push(notes);
    if (doubleBookingNote) noteParts.push(doubleBookingNote);
    if (isOnline && sourceRoomId && sourceRoomId !== rid) noteParts.push(`Airbnb booked on ${sourceRoomId}, shifted to ${rid}`);
    if (parentBookingId) noteParts.push(`Extension after previous stay (${parentBookingId})`);
    if (!checkoutConfirmed) noteParts.push('Open-ended stay — per day basis');
    const finalNotes = noteParts.join(' | ');

    const payStatus = isOnline ? 'Paid' : (adv >= tot && tot > 0 ? 'Paid' : (adv > 0 ? 'Partial' : 'Unpaid'));

    const { error } = await sb.from('guest_register').insert({
      ...approvalMeta(),
      booking_id: bkId, guest_name: gn, phone: ph || null,
      is_review_booking: document.getElementById('isReviewBooking')?.checked || false,
      linked_booking_id: document.getElementById('linkedBookingId')?.value || null,
      id_proof_type: idType || null, id_proof_no: idNo || null,
      id_proof_photo_path: photos.firstPath, id_proof_photo_paths: photos.allPaths,
      id_proof_front_paths: photos.frontPaths, id_proof_back_paths: photos.backPaths,
      room_id: rid, source_room_id: sourceRoomId,
      parent_booking_id: parentBookingId, stay_group_id: finalStayGroupId,
      booking_mode: mode, check_in: ci || null, check_out: co || null,
      check_in_time: checkInTime, check_out_time: checkOutTime,
      checkout_confirmed: checkoutConfirmed,
      guests: gs, per_day_rate: perDayRate, total_amount: tot,
      has_vehicle: hasVehicle, vehicle_name: vehicleName, vehicle_number: vehicleNumber,
      vehicle_photo_path: vehiclePhotoPath,
      payment_status: payStatus, notes: finalNotes || null,
      booked_by: SESSION.displayName || SESSION.role,
      show_to_investor: showToInvestor,
      hide_reason: hideReason
    });

    if (error) {
      document.getElementById('addBkErr').innerHTML = `<div class="error">${error.message}</div>`;
      btn.disabled = false; btn.textContent = '💾 Save Booking'; return;
    }

    if (adv > 0) {
      // Compute current booking's remaining due (total - already-paid, though for new booking paid=0)
      const currTotal = totalAmount || 0;
      const currRemaining = currTotal; // new booking, no prior payments
      let payForCurrent = adv;
      let overflow = 0;
      if (adv > currRemaining && currRemaining >= 0) {
        payForCurrent = currRemaining;
        overflow = adv - currRemaining;
      }

      // Insert current booking payment (capped at remaining)
      if (payForCurrent > 0) {
        await sb.from('payment_history').insert({
          booking_id: bkId, amount: payForCurrent, payment_mode: advMode || null,
          payment_date: advDate, notes: isOnline ? 'Airbnb Payout' : 'Advance',
          created_by: SESSION.userId,
          ...approvalMeta()
        });
      }

      // Distribute overflow to same guest's other unpaid bookings (oldest first)
      let remainingOverflow = overflow;
      const distributedAdv = [];
      if (overflow > 0) {
        const { data: otherBks } = await sb.from('guest_register')
          .select('booking_id, total_amount, check_in, guest_name, phone, rooms(unit_no,nickname)')
          .neq('booking_id', bkId)
          .or(`phone.eq.${ph || 'xxx'},guest_name.eq.${gn}`)
          .order('check_in', { ascending: true });

        for (const ob of (otherBks || [])) {
          if (remainingOverflow <= 0) break;
          const { data: obPays } = await sb.from('payment_history')
            .select('amount, verification_status').eq('booking_id', ob.booking_id)
            .neq('verification_status', 'rejected');
          const obPaid = (obPays || []).reduce((s, p) => s + (p.amount || 0), 0);
          const obDue = Math.max((ob.total_amount || 0) - obPaid, 0);
          if (obDue <= 0) continue;
          const toApply = Math.min(remainingOverflow, obDue);
          const { error: distErr } = await sb.from('payment_history').insert({
            booking_id: ob.booking_id, amount: toApply, payment_mode: advMode || null,
            payment_date: advDate,
            notes: `Auto-adjusted from booking ${bkId}`,
            created_by: SESSION.userId,
            ...approvalMeta()
          });
          if (!distErr) {
            await recalcPaymentStatus(ob.booking_id);
            distributedAdv.push({ bkId: ob.booking_id, amount: toApply, room: propLabel(ob.rooms) || ob.booking_id });
            remainingOverflow -= toApply;
          }
        }
      }

      // Any leftover overflow → save as advance/extra on current booking
      if (remainingOverflow > 0) {
        await sb.from('payment_history').insert({
          booking_id: bkId, amount: remainingOverflow, payment_mode: advMode || null,
          payment_date: advDate, notes: 'Advance / extra payment',
          created_by: SESSION.userId,
          ...approvalMeta()
        });
      }

      await recalcPaymentStatus(bkId);

      // Log distribution to console for verification
      if (distributedAdv.length > 0) {
        console.log('💰 Auto-distributed advance payment:', distributedAdv);
      }
    }
    await sb.from('flats_status').upsert({ room_id: rid, status: 'Booked' });

    window._bookingPrefill = null;

    // Success feedback
    fsn.success('Success', '✅ Booking saved successfully!\n\nGuest: ' + gn + '\nProperty: ' + (document.getElementById('roomId').selectedOptions[0]?.text || rid));

    // WhatsApp share option
    if (confirm('📱 WhatsApp message share karna hai?')) {
      shareBookingWhatsApp(bkId);
    }

    window._rebookedGuestData = null;
    renderManageBookings();

  } catch (err) {
    document.getElementById('addBkErr').innerHTML = `<div class="error">${err.message || err}</div>`;
    btn.disabled = false; btn.textContent = '💾 Save Booking';
  }
}

// ============ EXTENSION ============
async function createOfflineExtension(parentBookingId) {
  const { data: b } = await sb.from('guest_register').select('*').eq('booking_id', parentBookingId).single();
  if (!b) { fsn.error('Error', 'Not found'); return; }
  const today = new Date().toISOString().slice(0, 10);
  if (b.check_out >= today) {
    await sb.from('guest_register').update({
      check_out: today,
      notes: (b.notes ? b.notes + ' | ' : '') + 'Auto-closed: extended on ' + today
    }).eq('booking_id', parentBookingId);
  }
  if (b.room_id) {
    await sb.from('flats_status').update({ 
      status: 'Free', 
      cleaning_status: 'Dirty',
      last_checkout: today
    }).eq('room_id', b.room_id);

      // Auto-sync room statuses after checkout
      try {
        if (typeof window.autoCheckout === 'function') {
          await window.autoCheckout();
          console.log('🔄 Auto-sync done after checkout');
        }
      } catch(e) { console.warn('Auto-sync failed:', e); }
  }
  window._bookingPrefill = {
    guestName: b.guest_name || '', guestPhone: b.phone || '',
    roomId: b.room_id || '', sourceRoomId: b.source_room_id || b.room_id || '',
    bookingMode: 'Offline', checkIn: today, checkOut: '',
    checkInTime: '14:00', checkOutTime: '11:00', checkoutConfirmed: 'no',
    guests: b.guests || 1, totalAmount: '', advanceAmt: 0, advMode: '',
    perDayRate: b.per_day_rate || '',
    hasVehicle: b.has_vehicle || false, vehicleName: b.vehicle_name || '',
    vehicleNumber: b.vehicle_number || '',
    idType: b.id_proof_type || 'Aadhar', idNo: b.id_proof_no || '',
    bkNotes: `Extension after previous stay (${parentBookingId})`,
    parentBookingId: parentBookingId, stayGroupId: b.stay_group_id || b.booking_id
  };
  renderAddBooking();
}

// ═══ QUICK EXTEND (one-click N days extension) ═══
window.quickExtend = async function(bkId) {
  const { data: b } = await sb.from('guest_register').select('*').eq('booking_id', bkId).single();
  if (!b) { fsn.error('Error', 'Not found'); return; }

  const days = prompt('Extend for how many days?\n\nGuest: ' + b.guest_name + '\nCurrent check-out: ' + b.check_out + '\nPer day rate: ₹' + (b.per_day_rate || 0), '3');
  if (!days) return;
  const n = parseInt(days);
  if (isNaN(n) || n < 1) { fsn.error('Error', 'Invalid days'); return; }

  const perDay = b.per_day_rate || 0;
  if (perDay <= 0) {
    fsn.error('Error', 'Per day rate not set on original booking');
    return;
  }

  const extraAmount = perDay * n;
  if (!confirm('Extend ' + b.guest_name + ' for ' + n + ' more days?\n\nExtra: ₹' + extraAmount.toLocaleString('en-IN') + ' (₹' + perDay + ' × ' + n + ' days)\n\nProceed?')) return;

  // Calculate new check-out date
  const oldCheckout = new Date(b.check_out);
  const newCheckout = new Date(oldCheckout);
  newCheckout.setDate(newCheckout.getDate() + n);
  const newCheckoutStr = newCheckout.toISOString().slice(0, 10);
  const newTotal = (b.total_amount || 0) + extraAmount;

  // Check room availability for extension period
  const today = new Date().toISOString().slice(0, 10);
  const { data: conflicts } = await sb.from('guest_register')
    .select('booking_id, guest_name, check_in')
    .eq('room_id', b.room_id)
    .neq('booking_id', bkId)
    .neq('is_cancelled', true)
    .gte('check_in', b.check_out)
    .lt('check_in', newCheckoutStr);

  if (conflicts && conflicts.length > 0) {
    fsn.error('Conflict', 'Room booked by ' + conflicts[0].guest_name + ' on ' + conflicts[0].check_in);
    return;
  }

  // Update booking
  const { error } = await sb.from('guest_register').update({
    check_out: newCheckoutStr,
    total_amount: newTotal,
    notes: (b.notes ? b.notes + ' | ' : '') + 'Quick-extended ' + n + ' days on ' + today + ' (+₹' + extraAmount + ')'
  }).eq('booking_id', bkId);

  if (error) { fsn.error('Error', error.message); return; }

  fsn.success('Extended', '✅ ' + b.guest_name + ' extended ' + n + ' days\nNew checkout: ' + newCheckoutStr + '\nNew total: ₹' + newTotal.toLocaleString('en-IN'));
  renderManageBookings();
};

// ============ QUICK CHECKOUT ============
async function quickCheckout(bkId, roomId) {
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);
  const { data: bk } = await sb.from('guest_register')
    .select('guest_name,check_in,per_day_rate,total_amount,notes').eq('booking_id', bkId).single();
  if (!bk) { fsn.error('Error', 'Not found'); return; }
  const nights = Math.max(calcNights(bk.check_in, today), 1);
  const calcTotal = bk.per_day_rate ? bk.per_day_rate * nights : bk.total_amount;
  if (!confirm(`Quick Checkout for ${bk.guest_name}?\n\nNights: ${nights}\nTotal: ₹${calcTotal.toLocaleString('en-IN')}\n\nProceed?`)) return;
  await sb.from('guest_register').update({
    check_out: today, check_out_time: nowTime, total_amount: calcTotal,
    checkout_confirmed: true,
    notes: (bk.notes ? bk.notes + ' | ' : '') + `Quick checkout ${today} ${nowTime}. ${nights} nights.`
  }).eq('booking_id', bkId);
  if (roomId) await sb.from('flats_status').update({ 
    status: 'Free', 
    cleaning_status: 'Dirty',
    last_checkout: today
  }).eq('room_id', roomId);

      // Auto-sync room statuses after checkout
      try {
        if (typeof window.autoCheckout === 'function') {
          await window.autoCheckout();
          console.log('🔄 Auto-sync done after checkout');
        }
      } catch(e) { console.warn('Auto-sync failed:', e); }
  fsn.success(`Success`, `✅ ${bk.guest_name} checked out! Total: ₹${calcTotal.toLocaleString('en-IN')}`);
  renderManageBookings();
}

// ============ EDIT BOOKING ============
async function editBooking(bkId) {
  window._origBooking = null; // reset
  const { data: b } = await sb.from('guest_register').select('*').eq('booking_id', bkId).single();
  if (!b) { fsn.error('Error', 'Not found'); return; }
  window._origBooking = b; // ✅ Store original for auto-dirty check
  const today_iso = new Date().toISOString().slice(0,10);
  const { data: recentBookings } = await sb.from('guest_register').select('booking_id, guest_name, room_id, check_in, check_out, rooms(nickname)').gte('check_out', today_iso).eq('is_review_booking', false).order('check_in', {ascending: true}).limit(100);
  const { data: rooms } = await sb.from('rooms').select('room_id,unit_no,nickname,property_name').order('room_id');
  const { data: pays } = await sb.from('payment_history').select('*').eq('booking_id', bkId).order('paid_at', { ascending: false });
  const tp = (pays || []).reduce((s, p) => s + (p.amount || 0), 0);
  const bal = Math.round(((b.total_amount || 0) - tp) * 100) / 100;

  const frontPaths = parseIdPathArray(b.id_proof_front_paths);
  const backPaths = parseIdPathArray(b.id_proof_back_paths);
  const guestCountForUI = Math.min(Math.max(parseInt(b.guests || 1) || 1, 1), 8);

  let idSlots = '';
  for (let i = 1; i <= 8; i++) {
    const fp = frontPaths[i - 1] || null;
    const bp = backPaths[i - 1] || null;
    idSlots += `
      <div style="padding:10px;margin-bottom:8px;background:var(--bg);border:1px solid var(--border);border-radius:10px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:6px;">👤 Guest ${i}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:4px;">📄 Front</div>
            ${fp ? `<div style="padding:6px;background:#f0fff4;border:1.5px solid var(--green);border-radius:8px;margin-bottom:6px;">
              <div style="font-size:11px;color:var(--green);font-weight:700;">✅ Uploaded</div>
              <div class="btn-row" style="margin-top:4px;">
                <button class="btn-sm green-btn" onclick="dlIdPhoto('${fp}')">📥 View</button>
                ${window.canDelete && window.canDelete() ? `<button class="btn-sm danger" onclick="deleteIdPhoto('${bkId}','${fp}','front',${i - 1})">🗑️</button>` : ''}
              </div>
            </div>` : '<div style="font-size:11px;color:var(--red);margin-bottom:4px;">⚠️ No photo</div>'}
            <div class="id-card-btns">
              <button type="button" class="outline" onclick="document.getElementById('eFrontCam${i}').click()">📷 Camera</button>
              <button type="button" class="outline" onclick="document.getElementById('eFrontGal${i}').click()">🖼️ Gallery</button>
            </div>
            <input type="file" id="eFrontCam${i}" accept="image/*" capture="environment" style="display:none;" onchange="onEditIdFileSelect(this,${i},'front')" />
            <input type="file" id="eFrontGal${i}" accept="image/*" style="display:none;" onchange="onEditIdFileSelect(this,${i},'front')" />
            <div id="ePreviewFront${i}" style="margin-top:4px;"></div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:4px;">📄 Back</div>
            ${bp ? `<div style="padding:6px;background:#f0fff4;border:1.5px solid var(--green);border-radius:8px;margin-bottom:6px;">
              <div style="font-size:11px;color:var(--green);font-weight:700;">✅ Uploaded</div>
              <div class="btn-row" style="margin-top:4px;">
                <button class="btn-sm green-btn" onclick="dlIdPhoto('${bp}')">📥 View</button>
                ${window.canDelete && window.canDelete() ? `<button class="btn-sm danger" onclick="deleteIdPhoto('${bkId}','${bp}','back',${i - 1})">🗑️</button>` : ''}
              </div>
            </div>` : '<div style="font-size:11px;color:var(--red);margin-bottom:4px;">⚠️ No photo</div>'}
            <div class="id-card-btns">
              <button type="button" class="outline" onclick="document.getElementById('eBackCam${i}').click()">📷 Camera</button>
              <button type="button" class="outline" onclick="document.getElementById('eBackGal${i}').click()">🖼️ Gallery</button>
            </div>
            <input type="file" id="eBackCam${i}" accept="image/*" capture="environment" style="display:none;" onchange="onEditIdFileSelect(this,${i},'back')" />
            <input type="file" id="eBackGal${i}" accept="image/*" style="display:none;" onchange="onEditIdFileSelect(this,${i},'back')" />
            <div id="ePreviewBack${i}" style="margin-top:4px;"></div>
          </div>
        </div>
      </div>`;
  }

  renderShell(`
    <div class="card">
      <h1>✏️ Edit Booking</h1>
      <button class="secondary btn-sm" onclick="renderManageBookings()">← Back</button>
    </div>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Guest Name</label><input id="guestName" value="${b.guest_name || ''}" /></div>
        <div class="form-group"><label>Phone</label><input id="guestPhone" value="${b.phone || ''}" /></div>
      </div>
      <div class="form-group" style="padding:12px;background:#FFF8E1;border-radius:8px;border:1px solid #FFC107;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
          <input type="checkbox" id="isReviewBooking" ${b.is_review_booking ? 'checked' : ''} onchange="toggleReviewBooking()" style="width:18px;height:18px;" />
          <span>🔗 Review Booking (Airbnb duplicate — for reviews only)</span>
        </label>
        <div id="linkedBookingWrap" style="display:${b.is_review_booking ? 'block' : 'none'};margin-top:8px;">
          <label style="font-size:12px;color:#666;">Link to existing booking:</label>
          <select id="linkedBookingId" style="width:100%;padding:8px;margin-top:4px;"><option value="">-- Select existing booking --</option>${(recentBookings || []).map(rb => `<option value="${rb.booking_id}" ${b.linked_booking_id === rb.booking_id ? 'selected' : ''}>${rb.guest_name} — ${rb.rooms?.nickname || rb.room_id} (${rb.check_in})</option>`).join('')}</select>
          <div style="font-size:11px;color:#888;margin-top:4px;">Skips clash check + not counted in revenue/occupancy</div>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>ID Type</label>
          <select id="idType">
            <option value="Aadhar" ${b.id_proof_type === 'Aadhar' ? 'selected' : ''}>Aadhar</option>
            <option value="PAN" ${b.id_proof_type === 'PAN' ? 'selected' : ''}>PAN</option>
            <option value="DL" ${b.id_proof_type === 'DL' ? 'selected' : ''}>DL</option>
            <option value="Passport" ${b.id_proof_type === 'Passport' ? 'selected' : ''}>Passport</option>
          </select>
        </div>
        <div class="form-group"><label>ID Number</label><input id="idNo" value="${b.id_proof_no || ''}" /></div>
      </div>

      <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:14px;margin:8px 0;">
        <div class="section-title">🪪 ID Photos (Front & Back)</div>
        <div class="id-grid">${idSlots}</div>
      </div>

      <div class="form-grid">
        <div class="form-group"><label>Property</label>
          <select id="roomId">
            ${(rooms || []).map(r => `<option value="${r.room_id}" ${r.room_id === b.room_id ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Mode</label>
          <select id="bookingMode" onchange="toggleEditSourceBox()">
            <option value="Offline" ${b.booking_mode !== 'Online-Airbnb' ? 'selected' : ''}>Offline</option>
            <option value="Online-Airbnb" ${b.booking_mode === 'Online-Airbnb' ? 'selected' : ''}>Online</option>
          </select>
        </div>
      </div>

      <div id="editSourceBox" style="display:${b.booking_mode === 'Online-Airbnb' ? 'block' : 'none'};background:#f0f7ff;padding:12px;border-radius:8px;margin:6px 0;">
        <div class="form-group"><label>Source Listing</label>
          <select id="sourceRoomId"><option value="">Same</option>
            ${(rooms || []).map(r => `<option value="${r.room_id}" ${(b.source_room_id || b.room_id) === r.room_id ? 'selected' : ''}>${propLabel(r)}</option>`).join('')}
          </select>
        </div>
      </div>
      ${b.parent_booking_id ? `<div class="sub">Extension of: <code>${b.parent_booking_id}</code></div>` : ''}

      <div class="form-grid">
        <div class="form-group"><label>Check-in Date</label><input id="checkIn" type="date" value="${b.check_in || ''}" /></div>
        <div class="form-group"><label>Check-in Time</label><input id="checkInTime" type="time" value="${b.check_in_time || '14:00'}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Check-out Date</label><input id="checkOut" type="date" value="${b.check_out || ''}" /></div>
        <div class="form-group"><label>Check-out Time</label><input id="checkOutTime" type="time" value="${b.check_out_time || '11:00'}" /></div>
      </div>
      <div class="form-group"><label>Checkout Type</label>
        <select id="checkoutConfirmed">
          <option value="yes" ${b.checkout_confirmed !== false ? 'selected' : ''}>Fixed Date</option>
          <option value="no" ${b.checkout_confirmed === false ? 'selected' : ''}>Open — Per Day</option>
        </select>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Guests</label><input id="guests" type="number" value="${guestCountForUI}" min="1" max="8" onchange="showEditIdSlots()" oninput="showEditIdSlots()" /></div>
        <div class="form-group"><label>Per Day Rate ₹</label><input id="perDayRate" type="number" value="${b.per_day_rate || ''}" /></div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Total ₹</label><input id="totalAmount" type="number" value="${b.total_amount || 0}" /></div>
        <div class="form-group"><label>Status</label>
          <select id="paySt">
            <option value="Unpaid" ${b.payment_status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
            <option value="Partial" ${b.payment_status === 'Partial' ? 'selected' : ''}>Partial</option>
            <option value="Paid" ${b.payment_status === 'Paid' ? 'selected' : ''}>Paid</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group"><label>Vehicle?</label>
          <select id="hasVehicle" onchange="toggleVehicle()">
            <option value="false" ${b.has_vehicle ? '' : 'selected'}>No</option>
            <option value="true" ${b.has_vehicle ? 'selected' : ''}>Yes</option>
          </select>
        </div>
      </div>
      <div id="vehicleBox" style="display:${b.has_vehicle ? 'block' : 'none'};">
        <div class="form-grid">
          <div class="form-group"><label>Vehicle Name</label><input id="vehicleName" value="${b.vehicle_name || ''}" /></div>
          <div class="form-group"><label>Registration No.</label><input id="vehicleNumber" value="${b.vehicle_number || ''}" /></div>
        </div>
        <div class="form-group">
          <label>Vehicle Photo</label>
          ${b.vehicle_photo_path
            ? `<div class="btn-row" style="margin:4px 0;">
                <button class="btn-sm green-btn" onclick="dlIdPhoto('${b.vehicle_photo_path}')">📥 View Photo</button>
                ${window.canDelete && window.canDelete() ? `<button class="btn-sm danger" onclick="deleteVehiclePhoto('${bkId}','${b.vehicle_photo_path}')">🗑️ Delete</button>` : ''}
                <span style="font-size:10px;color:var(--green);">✅ Uploaded</span>
              </div>`
            : '<div style="font-size:11px;color:var(--muted);margin-bottom:6px;">No photo yet</div>'}
          <div class="id-card-btns">
            <button type="button" class="outline" onclick="document.getElementById('vehiclePhotoCam').click()">📷 Camera</button>
            <button type="button" class="outline" onclick="document.getElementById('vehiclePhotoGal').click()">🖼️ Gallery</button>
          </div>
          <input type="file" id="vehiclePhotoCam" accept="image/*" capture="environment" style="display:none;" onchange="onEditVehiclePick(this)" />
          <input type="file" id="vehiclePhotoGal" accept="image/*" style="display:none;" onchange="onEditVehiclePick(this)" />
          <div id="vehiclePhotoPreview"></div>
        </div>
      </div>

      ${['developer','admin','manager'].includes(SESSION.role) ? `
      <div class="form-group" style="padding:12px;background:#F0F7FF;border-radius:8px;border:1px solid #3B82F6;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
          <input type="checkbox" id="editShowToInvestor" ${b.show_to_investor !== false ? 'checked' : ''} onchange="toggleEditHideReason()" style="width:18px;height:18px;" />
          <span>👁️ Show this booking to Investor</span>
        </label>
        <div style="font-size:11px;color:#666;margin-top:4px;margin-left:26px;">
          ✅ Checked: Booking appears in investor reports<br>
          🚫 Unchecked: Booking hidden from investor reports (admin-only)
        </div>
        <div id="editHideReasonWrap" style="display:${b.show_to_investor === false ? 'block' : 'none'};margin-top:8px;">
          <label style="font-size:12px;color:#666;">📝 Reason for hiding (optional):</label>
          <input id="editHideReason" value="${(b.hide_reason || '').replace(/"/g, '&quot;')}" placeholder="e.g. Complimentary stay, renovation team" style="width:100%;padding:8px;margin-top:4px;font-size:13px;" />
        </div>
      </div>` : ''}

      <div class="form-group"><label>Notes</label><textarea id="bkNotes">${b.notes || ''}</textarea></div>
      <button onclick="updateBooking('${bkId}','${b.parent_booking_id || ''}','${b.stay_group_id || b.booking_id}')">💾 Update</button>
      <div id="editBkErr"></div>
    </div>

    <div class="card">
      <div class="section-title">💳 Payment History</div>
      <div class="metric-row"><span class="metric-label">Total</span><span class="metric-value">₹${(b.total_amount || 0).toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Paid</span><span class="metric-value" style="color:var(--green);">₹${tp.toLocaleString('en-IN')}</span></div>
      <div class="metric-row"><span class="metric-label">Balance</span><span class="metric-value${bal > 0 ? ' warn' : ''}">₹${bal.toLocaleString('en-IN')}</span></div>
      ${(pays || []).length ? `<div class="table-wrap" style="margin-top:8px;"><table>
        <thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Notes</th><th>Actions</th></tr></thead>
        <tbody>${pays.map(p => `<tr>
          <td>${p.payment_date || new Date(p.paid_at).toLocaleDateString('en-IN')}</td>
          <td>₹${(p.amount || 0).toLocaleString('en-IN')}</td>
          <td>${p.payment_mode || '-'}</td>
          <td>${p.notes || '-'}</td>
          <td class="table-actions">
            <button class="btn-sm" onclick="editPayment(${p.id},'${bkId}')">✏️</button>
            ${window.canDelete && window.canDelete() ? `<button class="btn-sm danger" onclick="delPayment(${p.id},'${bkId}')">🗑️</button>` : ''}
          </td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<div class="sub">No payments</div>'}
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn-sm" onclick="showPaymentModal('${bkId}')">➕ Payment</button>
        <button class="btn-sm outline" onclick="createOfflineExtension('${bkId}')">➕ Extension</button>
        <button class="btn-sm outline" onclick="shareBookingWhatsApp('${bkId}')">📱 Share</button>
        ${bal > 0 ? `<button class="btn-sm secondary" onclick="markFullyPaid('${bkId}')">✅ Paid</button>` : ''}
      </div>
    </div>
  `, 'bookings');
}

function toggleEditSourceBox() {
  const mode = document.getElementById('bookingMode')?.value;
  const box = document.getElementById('editSourceBox');
  if (box) box.style.display = mode === 'Online-Airbnb' ? 'block' : 'none';
}

// ============ DELETE ID PHOTO ============
async function deleteIdPhoto(bkId, path, side, index) {
  if (!confirm('Delete this photo?')) return;
  try {
    await sb.storage.from('id-proofs').remove([path]);

    const { data: bk } = await sb.from('guest_register')
      .select('id_proof_front_paths, id_proof_back_paths, id_proof_photo_paths, id_proof_photo_path')
      .eq('booking_id', bkId).single();
    if (!bk) return;

    const updateObj = {};
    const frontArr = parseIdPathArray(bk.id_proof_front_paths);
    const backArr = parseIdPathArray(bk.id_proof_back_paths);

    if (side === 'front') {
      while (frontArr.length <= index) frontArr.push(null);
      frontArr[index] = null;
      updateObj.id_proof_front_paths = stringifyIdPathArray(frontArr);
    } else {
      while (backArr.length <= index) backArr.push(null);
      backArr[index] = null;
      updateObj.id_proof_back_paths = stringifyIdPathArray(backArr);
    }

    const allArr = (bk.id_proof_photo_paths || '')
      .split(',')
      .filter(Boolean)
      .filter(x => x !== path);

    updateObj.id_proof_photo_paths = allArr.join(',') || null;
    updateObj.id_proof_photo_path = allArr[0] || null;

    // NEW: Add show_to_investor + hide_reason to update
    const editShowToInvEl = document.getElementById('editShowToInvestor');
    if (editShowToInvEl) {
      updateObj.show_to_investor = editShowToInvEl.checked;
      const editHideReasonEl = document.getElementById('editHideReason');
      updateObj.hide_reason = (!editShowToInvEl.checked && editHideReasonEl) 
        ? editHideReasonEl.value.trim() || null 
        : null;
    }
    
    await sb.from('guest_register').update(updateObj).eq('booking_id', bkId);

    fsn.success('Success', '✅ Photo deleted');
    editBooking(bkId);
  } catch (e) {
    fsn.error('Error', '❌ Delete failed: ' + e.message);
  }
}

// ============ UPDATE BOOKING ============
async function updateBooking(bkId, parentBookingId = '', stayGroupId = '') {
  const gn = document.getElementById('guestName').value.trim();
  const rid = document.getElementById('roomId').value;
  if (!gn || !rid) { document.getElementById('editBkErr').innerHTML = '<div class="error">Name & property required</div>'; return; }

  const mode = document.getElementById('bookingMode').value;
  const sourceRoomId = mode === 'Online-Airbnb' ? (document.getElementById('sourceRoomId')?.value || rid) : null;
  const ci = document.getElementById('checkIn').value;
  const co = document.getElementById('checkOut').value;
  const hasVehicle = document.getElementById('hasVehicle')?.value === 'true';

  if (ci && co) {
    const { data: ex } = await sb.from('guest_register')
      .select('booking_id,guest_name,check_in,check_out,booking_mode,total_amount,is_cancelled')
      .eq('room_id', rid).neq('booking_id', bkId);
    const isReviewBk = document.getElementById('isReviewBooking')?.checked;
    const clashes = isReviewBk ? [] : (ex || []).filter(b =>
      !b.is_cancelled && b.check_in && b.check_out && b.check_in < co && b.check_out > ci
    );
    if (clashes.length > 0) {
      const clashList = clashes.map(c =>
        `• ${c.guest_name} (${c.check_in} → ${c.check_out}) — ₹${(c.total_amount || 0).toLocaleString('en-IN')}`
      ).join('\n');
      const proceed = confirm(`⚠️ DOUBLE BOOKING WARNING\n\nYe slot pe pehle se ${clashes.length} booking hai:\n\n${clashList}\n\nFir bhi update karna hai?`);
      if (!proceed) {
        document.getElementById('editBkErr').innerHTML = `<div class="error">❌ Update cancelled — clash with ${clashes[0].guest_name}</div>`;
        return;
      }
    }
  }
  const gc = Math.min(Math.max(parseInt(document.getElementById('guests')?.value) || 1, 1), 8);
  const { data: oldBk } = await sb.from('guest_register')
    .select('id_proof_front_paths, id_proof_back_paths, id_proof_photo_paths')
    .eq('booking_id', bkId).single();

  const existFront = parseIdPathArray(oldBk?.id_proof_front_paths);
  const existBack  = parseIdPathArray(oldBk?.id_proof_back_paths);
  const fArr = existFront.length ? existFront.slice() : Array(gc).fill(null);
  const bArr = existBack.length  ? existBack.slice()  : Array(gc).fill(null);
  const aArr = [...new Set((oldBk?.id_proof_photo_paths || '').split(',').filter(Boolean))];
  // Find max guest index with pending files
  let maxGuestWithFile = gc;
  if (window._editIdFiles) {
    Object.keys(window._editIdFiles).forEach(key => {
      const num = parseInt(key.split('_')[1]);
      if (num > maxGuestWithFile) maxGuestWithFile = num;
    });
  }
  // Also check DOM inputs
  for (let i = 1; i <= 8; i++) {
    if (document.getElementById(`eFrontCam${i}`)?.files?.[0] ||
        document.getElementById(`eFrontGal${i}`)?.files?.[0] ||
        document.getElementById(`eBackCam${i}`)?.files?.[0] ||
        document.getElementById(`eBackGal${i}`)?.files?.[0]) {
      if (i > maxGuestWithFile) maxGuestWithFile = i;
    }
  }
  for (let i = 1; i <= maxGuestWithFile; i++) {
    const fFile = (window._editIdFiles && window._editIdFiles[`front_${i}`]) 
      || document.getElementById(`eFrontCam${i}`)?.files?.[0] 
      || document.getElementById(`eFrontGal${i}`)?.files?.[0];
    if (fFile) {
      try {
        const c = await smartCompress(fFile);
        const p = `${bkId}/${Date.now()}_g${i}_front.jpg`;
        const result = await robustUpload(p, c, 3);
        if (result.success) { while(fArr.length < i) fArr.push(null); fArr[i-1] = p; aArr.push(p); }
        else console.warn('Front upload failed:', result.error);
      } catch (e) { console.warn('Front upload error:', e); }
    }
    const bFile = (window._editIdFiles && window._editIdFiles[`back_${i}`])
      || document.getElementById(`eBackCam${i}`)?.files?.[0] 
      || document.getElementById(`eBackGal${i}`)?.files?.[0];
    if (bFile) {
      try {
        const c = await smartCompress(bFile);
        const p = `${bkId}/${Date.now()}_g${i}_back.jpg`;
        const result = await robustUpload(p, c, 3);
        if (result.success) { while(bArr.length < i) bArr.push(null); bArr[i-1] = p; aArr.push(p); }
        else console.warn('Back upload failed:', result.error);
      } catch (e) { console.warn('Back upload error:', e); }
    }
  }


  const totVal = parseFloat(document.getElementById('totalAmount').value) || 0;
  const nights = calcNights(ci, co);
  const perDay = nights > 0 && totVal > 0 ? Math.round(totVal / nights) : parseFloat(document.getElementById('perDayRate')?.value) || 0;

  const obj = {
    guest_name: gn, phone: document.getElementById('guestPhone').value.trim() || null,
    is_review_booking: document.getElementById('isReviewBooking')?.checked || false,
    linked_booking_id: document.getElementById('linkedBookingId')?.value || null,
    id_proof_type: document.getElementById('idType').value || null,
    id_proof_no: document.getElementById('idNo').value.trim() || null,
    room_id: rid, source_room_id: sourceRoomId,
    parent_booking_id: parentBookingId || null, stay_group_id: stayGroupId || bkId,
    booking_mode: mode, check_in: ci || null, check_out: co || null,
    check_in_time: document.getElementById('checkInTime')?.value || '14:00',
    check_out_time: document.getElementById('checkOutTime')?.value || '11:00',
    checkout_confirmed: document.getElementById('checkoutConfirmed')?.value === 'yes',
    guests: gc, per_day_rate: perDay, total_amount: totVal,
    payment_status: document.getElementById('paySt').value,
    has_vehicle: hasVehicle,
    vehicle_name: hasVehicle ? (document.getElementById('vehicleName')?.value.trim() || null) : null,
    vehicle_number: hasVehicle ? (document.getElementById('vehicleNumber')?.value.trim() || null) : null,
    notes: document.getElementById('bkNotes').value.trim() || null,
  };
  obj.id_proof_front_paths = stringifyIdPathArray(fArr);
  obj.id_proof_back_paths  = stringifyIdPathArray(bArr);
  const uniqA = [...new Set(aArr.filter(Boolean))];
  if (uniqA.length) { obj.id_proof_photo_paths = uniqA.join(','); obj.id_proof_photo_path = uniqA[0]; }

  // Vehicle photo upload
  if (obj.has_vehicle) {
    const vFile = document.getElementById('vehiclePhotoCam')?.files?.[0]
      || document.getElementById('vehiclePhotoGal')?.files?.[0] || document.getElementById('vehiclePhoto')?.files?.[0];
    if (vFile) {
      try {
        const vc = await smartCompress(vFile);
        const vp = `${bkId}/vehicle_${Date.now()}.jpg`;
        const result = await robustUpload(vp, vc, 3);
        if (result.success) obj.vehicle_photo_path = vp;
        else console.warn('Vehicle upload failed:', result.error);
      } catch (e) { console.warn('Vehicle photo update failed', e); }
    }
  }

  Object.assign(obj, approvalUpdateMeta());


  // ═══ DETECT CHANGES for notification ═══


  const orig = window._origBooking || {};


  const trackFields = {


    guest_name: 'Guest Name',


    phone: 'Phone',


    check_in: 'Check-in',


    check_out: 'Check-out',


    room_id: 'Room',


    total_amount: 'Amount',


    booking_mode: 'Mode',


    guests: 'Guest Count'


  };


  const changes = [];


  Object.keys(trackFields).forEach(f => {


    const oldVal = orig[f];


    const newVal = obj[f];


    if (oldVal !== undefined && newVal !== undefined && String(oldVal || '') !== String(newVal || '')) {


      changes.push(trackFields[f] + ': ' + (oldVal || '-') + ' -> ' + (newVal || '-'));


    }


  });


  const { error } = await sb.from('guest_register').update(obj).eq('booking_id', bkId);


  // ═══ SEND NOTIFICATION if changes detected & non-trusted user ═══


  if (!error && changes.length > 0 && !isTrustedUser()) {


    try {


      const userName = (SESSION.displayName || 'Someone').split(' ')[0];


      // Fetch developer/owner users to notify
      const { data: notifTargets } = await sb.from('profiles')
        .select('user_id').in('role', ['developer', 'owner']);
      if (notifTargets && notifTargets.length > 0) {
        const notifRows = notifTargets.map(u => ({
          user_id: u.user_id,
          type: 'booking',
          icon: '✏️',
          title: 'Booking Edited: ' + (obj.guest_name || bkId),
          message: userName + ' changed ' + changes.join(' | '),
          page: 'bookings',
          data: { booking_id: bkId, changes: changes },
          is_read: false
        }));
        await sb.from('notifications').insert(notifRows);
      }


    } catch(e) { console.warn('Notify failed:', e); }


  }
  if (error) { document.getElementById('editBkErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
  window._editIdFiles = {}; // Clear cache

  // ✅ AUTO-DIRTY: If checkout_confirmed newly set to true → mark flat dirty
  try {
    const isNowConfirmed  = obj.checkout_confirmed === true;
    const today           = new Date().toISOString().slice(0, 10);
    const coDate          = obj.check_out || '';
    const isPastOrToday   = coDate && coDate <= today;

    if (isNowConfirmed && isPastOrToday && rid) {
      await sb.from('flats_status').update({
        status: 'Free',
        cleaning_status: 'Dirty',
        last_checkout: today
      }).eq('room_id', rid);

      // Auto-sync room statuses after checkout
      try {
        if (typeof window.autoCheckout === 'function') {
          await window.autoCheckout();
          console.log('🔄 Auto-sync done after checkout');
        }
      } catch(e) { console.warn('Auto-sync failed:', e); }
      console.log('🧹 Auto-dirty triggered for room:', rid);
      fsn.success('Checked Out', '✅ Flat marked Dirty');
    }
  } catch(e) { console.warn('Auto-dirty error:', e); }

  renderManageBookings();
}

// ============ DELETE BOOKING ============
async function delBooking(bkId, guestName, roomId) {
  if (!confirm(`Delete "${guestName}" booking?\nPayments + photos bhi delete hongi.`)) return;
  try {
    const { data: bk } = await sb.from('guest_register')
      .select('room_id, id_proof_photo_paths, id_proof_photo_path, id_proof_front_paths, id_proof_back_paths, vehicle_photo_path')
      .eq('booking_id', bkId).single();

    const allPaths = [
      bk?.id_proof_photo_paths,
      bk?.id_proof_photo_path,
      bk?.id_proof_front_paths,
      bk?.id_proof_back_paths,
      bk?.vehicle_photo_path
    ]
      .filter(Boolean)
      .join(',')
      .split(',')
      .filter(Boolean);

    const uniquePaths = [...new Set(allPaths)];

    if (uniquePaths.length) {
      try { await sb.storage.from('id-proofs').remove(uniquePaths); } catch (e) {}
    }

    await sb.from('payment_history').delete().eq('booking_id', bkId);
    const { error } = await sb.from('guest_register').delete().eq('booking_id', bkId);
    if (error) { fsn.error('Error', '❌ Delete failed: ' + error.message); return; }

    const rid = roomId || bk?.room_id;
    if (rid) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: active } = await sb.from('guest_register')
        .select('booking_id')
        .eq('room_id', rid)
        .gt('check_out', today);

      if (!active || !active.length) {
        await sb.from('flats_status').update({
          status: 'Free',
          cleaning_status: 'Dirty'
        }).eq('room_id', rid);
      }
    }

    fsn.success('Success', '✅ Booking deleted');
    renderManageBookings();
  } catch (err) {
    fsn.error('Error', '❌ Error: ' + (err.message || err));
  }
}

// ============ PAYMENT MODAL ============

// ═══ Cash Book: Payment Received By helpers ═══
window.onPayModeChange = async function() {
  const mode = document.getElementById('payMode')?.value;
  const receivedBy = document.getElementById('payReceivedBy');
  const custom = document.getElementById('payReceivedByCustom');
  if (!receivedBy) return;

  // Load employees ONCE (cache)
  if (!window._empListCache) {
    const { data: emps } = await sb.from('employees')
      .select('emp_id, name').eq('status', 'Active').order('name');
    window._empListCache = (emps || []).map(e => e.name);
  }
  const owners = ['Firoz', 'Shahenshah'];
  const staffOnly = window._empListCache.filter(n => !owners.includes(n));

  let html = '<option value="">-- Select who received --</option>';

  if (mode === 'Cash') {
    // CASH: Owners + Staff dropdown (NO typing = NO typos)
    html += '<optgroup label="Owners">';
    owners.forEach(o => html += `<option value="${o}">${o}</option>`);
    html += '</optgroup>';
    html += '<optgroup label="Staff (Cash Receivers)">';
    staffOnly.forEach(s => html += `<option value="${s}">${s}</option>`);
    html += '</optgroup>';
    receivedBy.innerHTML = html;
    if (custom) { custom.style.display = 'none'; custom.value = ''; }
  } else {
    // UPI / Bank / Airbnb Payout: ONLY Firoz + Shahenshah
    html += '<optgroup label="Final Holders (Company Accounts)">';
    owners.forEach(o => html += `<option value="${o}">${o}</option>`);
    html += '</optgroup>';
    receivedBy.innerHTML = html;
    if (custom) { custom.style.display = 'none'; custom.value = ''; }
    receivedBy.value = 'Firoz'; // auto-select
  }
};

// Handle custom name toggle
document.addEventListener('change', e => {
  if (e.target?.id === 'payReceivedBy') {
    const custom = document.getElementById('payReceivedByCustom');
    if (custom) custom.style.display = e.target.value === '__custom__' ? 'block' : 'none';
    if (e.target.value === '__custom__') {
      setTimeout(() => custom?.focus(), 50);
    }
  }
});

function showPaymentModal(bkId) {
  // Build previous due warning for this guest
  const allBks = window._allBookings || [];
  const pm = window._bkPaidMap || {};
  const thisBk = allBks.find(x => x.booking_id === bkId) || {};
  const sameGuest = allBks.filter(x =>
    x.booking_id !== bkId &&
    ((thisBk.phone && x.phone === thisBk.phone) || x.guest_name === thisBk.guest_name)
  );
  const prevDue = sameGuest.reduce((s, x) => {
    const due = (x.total_amount || 0) - (pm[x.booking_id] || 0);
    return s + (due > 0 ? due : 0);
  }, 0);
  const currentDue = (thisBk.total_amount || 0) - (pm[bkId] || 0);
  const totalCollectible = Math.max(currentDue, 0) + prevDue;

  const prevDueHtml = prevDue > 0 ? `
    <div style="background:#FDE8E8;border:1px solid #FCA5A5;border-radius:8px;padding:10px;margin-bottom:12px;font-size:13px;">
      <div style="font-weight:700;color:#DC2626;margin-bottom:4px;">⚠️ Guest has Previous Due!</div>
      <div style="color:#374151;">Current Booking Due: <strong>₹\${Math.max(currentDue,0).toLocaleString('en-IN')}</strong></div>
      <div style="color:#DC2626;">Previous Bookings Due: <strong>₹\${prevDue.toLocaleString('en-IN')}</strong></div>
      <div style="border-top:1px solid #FCA5A5;margin-top:6px;padding-top:6px;font-weight:700;color:#DC2626;">
        Total Collectible: ₹\${totalCollectible.toLocaleString('en-IN')}
      </div>
    </div>` : '';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>💰 Add Payment</h2>
      ${prevDueHtml}
      <div class="form-group"><label>Amount ₹ *</label><input id="payAmt" type="number" placeholder="Amount" /></div>
      <div class="form-group"><label>Mode</label>
        <select id="payMode" onchange="onPayModeChange()">
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Bank">Bank Transfer</option>
          <option value="Airbnb Payout">Airbnb Payout</option>
        </select>
      </div>
      
      <div class="form-group"><label>💰 Received By *</label>
        <select id="payReceivedBy" style="width:100%;padding:8px;">
          <option value="">-- Select who received --</option>
          <optgroup label="Final Holders (UPI/Bank)">
            <option value="Firoz">Firoz</option>
            <option value="Shahenshah">Shahenshah</option>
          </optgroup>
          <optgroup label="Cash Receivers" id="payCashReceivers">
            <!-- Populated dynamically -->
          </optgroup>
          <option value="__custom__" style="color:#059669;font-weight:700;">✏️ Custom name...</option>
        </select>
        <input id="payReceivedByCustom" type="text" placeholder="Type name..." style="display:none;margin-top:6px;width:100%;padding:8px;">
      </div>
      
      <div class="form-group"><label>Date</label><input id="payDate" type="date" value="${new Date().toISOString().slice(0, 10)}" /></div>
      <div class="form-group"><label>Notes</label><input id="payNotes" placeholder="Optional" /></div>
      <button onclick="savePaymentModal('${bkId}')" style="width:100%;margin-top:10px;">💾 Save Payment</button>
      <div id="payErr"></div>
    </div>`;
  document.body.appendChild(modal);
}

async function savePaymentModal(bkId) {
  const receivedByEl = document.getElementById('payReceivedBy');
  let receivedBy = receivedByEl?.value || '';
  if (receivedBy === '__custom__') {
    receivedBy = document.getElementById('payReceivedByCustom')?.value?.trim() || '';
  }
  if (!receivedBy) {
    document.getElementById('payErr').innerHTML = '<div class="error">Please select who received the payment</div>';
    return;
  }
  
  const amt = parseFloat(document.getElementById('payAmt')?.value) || 0;
  if (amt <= 0) { document.getElementById('payErr').innerHTML = '<div class="error">Amount required</div>'; return; }

  const mode = document.getElementById('payMode')?.value;
  const payDate = document.getElementById('payDate')?.value;
  const userNotes = document.getElementById('payNotes')?.value?.trim() || null;

  // Get current booking + guest info for auto-distribution
  const { data: currBk } = await sb.from('guest_register')
    .select('total_amount, guest_name, phone, room_id, check_in, check_out, booking_mode, is_review_booking, linked_booking_id').eq('booking_id', bkId).single();

  // 🚨 DUPLICATE BOOKING CHECK — Same room + overlapping dates
  if (currBk && !window._paymentConfirmedForDupe) {
    const { data: sameRoomBks } = await sb.from('guest_register')
      .select('booking_id, guest_name, booking_mode, check_in, check_out, total_amount, is_review_booking, linked_booking_id')
      .eq('room_id', currBk.room_id)
      .neq('booking_id', bkId)
      .lte('check_in', currBk.check_out || currBk.check_in)
      .gte('check_out', currBk.check_in);

    // 🎯 SMART FILTER: Skip warning if same guest (extension/duplicate) or linked booking
    const currGuestNorm = (currBk.guest_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const filteredSameRoomBks = (sameRoomBks || []).filter(b => {
      const otherGuestNorm = (b.guest_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      // Same guest name → obviously same person, no warning needed
      if (otherGuestNorm === currGuestNorm) return false;
      // Linked bookings (review/extension) → no warning
      if (b.linked_booking_id === bkId || currBk.linked_booking_id === b.booking_id) return false;
      // Both marked as review → no warning
      if (b.is_review_booking && currBk.is_review_booking) return false;
      return true; // Different guest → real conflict, show warning
    });

    if (filteredSameRoomBks.length > 0) {
      // Fetch payments for other bookings
      const otherBkIds = filteredSameRoomBks.map(b => b.booking_id);
      const { data: otherPays } = await sb.from('payment_history')
        .select('booking_id, amount').in('booking_id', otherBkIds).neq('verification_status', 'rejected');
      
      const payMap = {};
      (otherPays || []).forEach(p => {
        payMap[p.booking_id] = (payMap[p.booking_id] || 0) + (p.amount || 0);
      });

      // Also current booking's paid amount
      const { data: currPays2 } = await sb.from('payment_history')
        .select('amount').eq('booking_id', bkId).neq('verification_status', 'rejected');
      const currPaidTotal = (currPays2 || []).reduce((s, p) => s + (p.amount || 0), 0);

      const currDue = Math.max((currBk.total_amount || 0) - currPaidTotal, 0);

      // Build warning UI
      const bookingsList = [
        {
          bookingId: bkId,
          name: currBk.guest_name,
          mode: currBk.booking_mode,
          isReview: currBk.is_review_booking,
          total: currBk.total_amount || 0,
          paid: currPaidTotal,
          due: currDue,
          isCurrent: true
        },
        ...filteredSameRoomBks.map(b => {
          const paid = payMap[b.booking_id] || 0;
          return {
            bookingId: b.booking_id,
            name: b.guest_name,
            mode: b.booking_mode,
            isReview: b.is_review_booking,
            total: b.total_amount || 0,
            paid: paid,
            due: Math.max((b.total_amount || 0) - paid, 0),
            isCurrent: false
          };
        })
      ];

      const warningHtml = 
        '<div style="background:#FFF9E6;border:2px solid #FFB800;padding:14px;border-radius:8px;margin-bottom:12px;">' +
          '<div style="font-weight:800;color:#B45309;margin-bottom:8px;font-size:14px;">⚠️ Multiple Bookings for ' + currBk.room_id + '</div>' +
          '<div style="font-size:12px;color:#666;margin-bottom:10px;">Same room mein overlapping dates hain. Confirm karo payment kaunse booking mein add karna hai:</div>' +
          bookingsList.map(b => 
            '<div style="padding:8px;background:' + (b.isCurrent ? '#E6F7FF' : '#fff') + ';border:1px solid ' + (b.isCurrent ? '#1E429F' : '#ddd') + ';border-radius:6px;margin-bottom:6px;cursor:pointer;" onclick="switchPaymentBooking(\'' + b.bookingId + '\',\'' + bkId + '\')">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                '<div>' +
                  '<strong>' + b.name + '</strong>' +
                  (b.isReview ? ' <span style="background:#722ED1;color:#fff;padding:2px 6px;border-radius:10px;font-size:10px;">⭐ REVIEW</span>' : '') +
                  ' <span style="background:' + (b.mode === 'Online-Airbnb' ? '#FF385C' : '#6C5CE0') + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">' + (b.mode === 'Online-Airbnb' ? '🌐 Airbnb' : '🏠 Direct') + '</span>' +
                  (b.isCurrent ? ' <span style="color:#1E429F;font-weight:700;font-size:11px;">← Selected</span>' : '') +
                '</div>' +
              '</div>' +
              '<div style="font-size:11px;color:#666;margin-top:4px;">' +
                'Total: ₹' + b.total.toLocaleString('en-IN') + 
                ' · Paid: ₹' + b.paid.toLocaleString('en-IN') + 
                ' · <strong style="color:' + (b.due > 0 ? '#DC2626' : '#059669') + ';">Due: ₹' + b.due.toLocaleString('en-IN') + '</strong>' +
              '</div>' +
            '</div>'
          ).join('') +
          '<div style="display:flex;gap:8px;margin-top:10px;">' +
            '<button onclick="proceedPaymentAnyway(\'' + bkId + '\')" style="flex:1;background:#059669;color:#fff;padding:8px;border:none;border-radius:6px;cursor:pointer;font-weight:700;">✅ Confirm & Save Payment</button>' +
            '<button onclick="cancelPayment()" style="flex:1;background:#DC2626;color:#fff;padding:8px;border:none;border-radius:6px;cursor:pointer;">❌ Cancel</button>' +
          '</div>' +
        '</div>';

      document.getElementById('payErr').innerHTML = warningHtml;
      return;
    }
  }

  // Reset flag
  window._paymentConfirmedForDupe = false;

  const { data: currBk2 } = await sb.from('guest_register')
    .select('total_amount, guest_name, phone').eq('booking_id', bkId).single();
  const { data: currPays } = await sb.from('payment_history').select('amount, verification_status').eq('booking_id', bkId).neq('verification_status', 'rejected');
  const currPaid = (currPays || []).reduce((s, p) => s + (p.amount || 0), 0);
  const currTotal = currBk2?.total_amount || currBk?.total_amount || 0;
  const currRemaining = Math.max(currTotal - currPaid, 0); // how much still due on current

  let paymentForCurrent = amt;
  let overflow = 0;

  // If payment exceeds current due -> auto-distribute overflow to oldest unpaid booking
  if (amt > currRemaining && currRemaining >= 0) {
    paymentForCurrent = currRemaining;
    overflow = amt - currRemaining;
  }

  // Step 1: Insert current booking payment (only up to remaining)
  if (paymentForCurrent > 0) {
    const { error } = await sb.from('payment_history').insert({
      booking_id: bkId, amount: paymentForCurrent,
      payment_mode: mode,
    received_by: receivedBy,
    handover_status: (mode === "Cash" && !["Firoz","Shahenshah"].includes(receivedBy)) ? "in_hand" : "handed_over",
      payment_date: payDate,
      notes: userNotes,
      created_by: SESSION.userId,
      ...approvalMeta()
    });
    if (error) { document.getElementById('payErr').innerHTML = `<div class="error">${error.message}</div>`; return; }
    await recalcPaymentStatus(bkId);
  }

  // Step 2: Distribute overflow to previous unpaid bookings (oldest first)
  let distributed = [];
  let remainingOverflow = overflow;

  if (overflow > 0 && currBk) {
    // Find same guest's other bookings with due > 0, oldest first
    const { data: otherBks } = await sb.from('guest_register')
      .select('booking_id, total_amount, check_in, guest_name, phone, rooms(unit_no,nickname)')
      .neq('booking_id', bkId)
      .or(`phone.eq.${currBk.phone || 'xxx'},guest_name.eq.${currBk.guest_name}`)
      .order('check_in', { ascending: true });

    for (const ob of (otherBks || [])) {
      if (remainingOverflow <= 0) break;
      const { data: obPays } = await sb.from('payment_history').select('amount, verification_status').eq('booking_id', ob.booking_id).neq('verification_status', 'rejected');
      const obPaid = (obPays || []).reduce((s, p) => s + (p.amount || 0), 0);
      const obDue = Math.max((ob.total_amount || 0) - obPaid, 0);
      if (obDue <= 0) continue;

      const toApply = Math.min(remainingOverflow, obDue);
      const { error: distErr } = await sb.from('payment_history').insert({
        booking_id: ob.booking_id,
        amount: toApply,
        payment_mode: mode,
        payment_date: payDate,
        notes: (userNotes ? userNotes + ' | ' : '') + `Auto-adjusted from booking ${bkId}`,
        created_by: SESSION.userId,
        ...approvalMeta()
      });
      if (!distErr) {
        await recalcPaymentStatus(ob.booking_id);
        distributed.push({
          bkId: ob.booking_id,
          amount: toApply,
          room: propLabel(ob.rooms) || ob.booking_id,
          date: ob.check_in
        });
        remainingOverflow -= toApply;
      }
    }
  }

  // If any overflow left uncovered, add as advance/extra on current
  if (remainingOverflow > 0) {
    const { error: extraErr } = await sb.from('payment_history').insert({
      booking_id: bkId, amount: remainingOverflow,
      payment_mode: mode,
      payment_date: payDate,
      notes: (userNotes ? userNotes + ' | ' : '') + 'Advance / extra payment',
      created_by: SESSION.userId,
      ...approvalMeta()
    });
    if (!extraErr) await recalcPaymentStatus(bkId);
  }

  document.querySelector('.modal-overlay')?.remove();

  // Show distribution summary
  if (distributed.length > 0) {
    const distMsg = distributed.map(d =>
      `• ₹${d.amount.toLocaleString('en-IN')} → ${d.room} (${d.date})`
    ).join('\n');
    if (window.fsn) {
      fsn.success('Payment Auto-Distributed',
        `₹${paymentForCurrent.toLocaleString('en-IN')} on current booking\n` +
        `${distMsg}` +
        (remainingOverflow > 0 ? `\n• ₹${remainingOverflow.toLocaleString('en-IN')} → Advance` : '')
      );
    }
  }

  if (document.getElementById('editBkErr')) editBooking(bkId);
  else renderManageBookings();
}

async function addPaymentWithDate(bkId) { showPaymentModal(bkId); }

async function editPayment(payId, bkId) {
  const { data: pay } = await sb.from('payment_history').select('*').eq('id', payId).single();
  if (!pay) { fsn.error('Error', 'Not found'); return; }
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>✏️ Edit Payment</h2>
      <div class="form-group"><label>Amount ₹</label><input id="editPayAmt" type="number" value="${pay.amount}" /></div>
      <div class="form-group"><label>Mode</label>
        <select id="editPayMode">
          <option value="Cash" ${pay.payment_mode === 'Cash' ? 'selected' : ''}>Cash</option>
          <option value="UPI" ${pay.payment_mode === 'UPI' ? 'selected' : ''}>UPI</option>
          <option value="Bank" ${pay.payment_mode === 'Bank' ? 'selected' : ''}>Bank</option>
          <option value="Airbnb Payout" ${pay.payment_mode === 'Airbnb Payout' ? 'selected' : ''}>Airbnb Payout</option>
        </select>
      </div>
      <div class="form-group"><label>Date</label><input id="editPayDate" type="date" value="${pay.payment_date || ''}" /></div>
      <div class="form-group"><label>Notes</label><input id="editPayNotes" value="${pay.notes || ''}" /></div>
      <button onclick="saveEditPayment(${payId},'${bkId}')" style="width:100%;margin-top:10px;">💾 Update</button>
    </div>`;
  document.body.appendChild(modal);
}

async function saveEditPayment(payId, bkId) {
  const payPatch = {
    amount: parseFloat(document.getElementById('editPayAmt')?.value) || 0,
    payment_mode: document.getElementById('editPayMode')?.value,
    payment_date: document.getElementById('editPayDate')?.value || null,
    notes: document.getElementById('editPayNotes')?.value?.trim() || null
  };
  Object.assign(payPatch, approvalUpdateMeta());
  await sb.from('payment_history').update(payPatch).eq('id', payId);
  await recalcPaymentStatus(bkId);
  document.querySelector('.modal-overlay')?.remove();
  editBooking(bkId);
}

async function delPayment(payId, bkId) {
  if (!confirm('Delete this payment?')) return;
  await sb.from('payment_history').delete().eq('id', payId);
  await recalcPaymentStatus(bkId);
  editBooking(bkId);
}

async function markFullyPaid(bkId) {
  const { data: b } = await sb.from('guest_register').select('total_amount').eq('booking_id', bkId).single();
  const { data: p } = await sb.from('payment_history').select('amount, verification_status').eq('booking_id', bkId).neq('verification_status', 'rejected');
  const paid = (p || []).reduce((s, x) => s + (x.amount || 0), 0);
  const bal = (b?.total_amount || 0) - paid;
  if (bal <= 0) { fsn.info('Info', 'Already paid'); return; }
  showPaymentModal(bkId);
}

async function recalcPaymentStatus(bkId) {
  const { data: b } = await sb.from('guest_register').select('total_amount').eq('booking_id', bkId).single();
  const { data: p } = await sb.from('payment_history').select('amount, verification_status').eq('booking_id', bkId).neq('verification_status', 'rejected');
  const paid = (p || []).reduce((s, x) => s + (x.amount || 0), 0);
  const st = paid >= (b?.total_amount || 0) && b?.total_amount > 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');
  await sb.from('guest_register').update({ payment_status: st }).eq('booking_id', bkId);
}

function onPeriodChg() {
  SESSION.bookingPeriod = document.getElementById('fPeriod')?.value || '';
  renderManageBookings();
}


// ============ EXPORT FILTERED BOOKINGS TO PDF ============
async function exportBookingsPDF() {
  // Get current filtered bookings from displayed table
  const rows = document.querySelectorAll('.table-wrap table tbody tr');
  if (!rows.length) { fsn.info('Info', 'No bookings to export'); return; }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN');
  const filterInfo = [];

  const period = SESSION.bookingPeriod || '';
  const payFilter = SESSION.bookingPayFilter || '';
  const mode = SESSION.bookingFilter || '';
  const prop = SESSION.bookingPropFilter || '';
  const search = SESSION.bookingSearch || '';

  if (period) filterInfo.push(`Period: ${period}`);
  if (payFilter) filterInfo.push(`Payment: ${payFilter}`);
  if (mode && mode !== 'All') filterInfo.push(`Mode: ${mode}`);
  if (prop) filterInfo.push(`Property: ${prop}`);
  if (search) filterInfo.push(`Search: ${search}`);

  // Build print HTML
  let tableRows = '';
  let totalDue = 0, totalAmount = 0, totalPaid = 0;

  rows.forEach(tr => {
    const cells = tr.querySelectorAll('td');
    if (cells.length < 8) return;

    const guest = cells[1]?.innerText?.trim() || '';
    const property = cells[2]?.innerText?.trim() || '';
    const mode2 = cells[3]?.innerText?.trim() || '';
    const checkIn = cells[4]?.innerText?.trim() || '';
    const checkOut = cells[5]?.innerText?.trim() || '';
    const total = cells[7]?.innerText?.trim() || '';
    const paid = cells[8]?.innerText?.trim() || '';
    const due = cells[9]?.innerText?.trim() || '';

    // Parse amounts
    const totalNum = parseFloat(total.replace(/[₹,]/g, '')) || 0;
    const paidNum = parseFloat(paid.replace(/[₹,]/g, '')) || 0;
    const dueNum = parseFloat(due.replace(/[₹,]/g, '')) || 0;

    totalAmount += totalNum;
    totalPaid += paidNum;
    totalDue += dueNum;

    tableRows += `
      <tr>
        <td>${guest}</td>
        <td>${property}</td>
        <td>${mode2}</td>
        <td>${checkIn}</td>
        <td>${checkOut}</td>
        <td style="text-align:right;">${total}</td>
        <td style="text-align:right;color:#0A7D1A;">${paid}</td>
        <td style="text-align:right;color:#FF385C;font-weight:700;">${due}</td>
      </tr>`;
  });

  const html = `<!DOCTYPE html>
<html>
<head>
<title>Bookings Report - ${dateStr}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: -apple-system, sans-serif; color: #222; margin: 0; padding: 20px; }
  .header { background: linear-gradient(135deg,#FF385C,#E00B41); color: #fff; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
  .header h1 { margin: 0 0 6px 0; font-size: 22px; }
  .header .meta { font-size: 13px; opacity: 0.9; }
  .filters { background: #FEF3C7; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 12px; }
  .filters strong { color: #B45309; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #222; color: #fff; padding: 10px 8px; text-align: left; font-weight: 700; }
  td { padding: 8px; border-bottom: 1px solid #EBEBEB; }
  tr:nth-child(even) { background: #FAFAFA; }
  .totals { margin-top: 20px; background: #F7F7F7; padding: 16px; border-radius: 8px; display: flex; justify-content: space-around; }
  .totals div { text-align: center; }
  .totals .label { font-size: 11px; color: #717171; text-transform: uppercase; letter-spacing: 1px; }
  .totals .value { font-size: 20px; font-weight: 800; margin-top: 4px; }
  .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #717171; border-top: 1px solid #EBEBEB; padding-top: 12px; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    <h1>📅 Bookings Report</h1>
    <div class="meta">${BRAND} · Generated ${dateStr}</div>
  </div>

  ${filterInfo.length ? `
  <div class="filters">
    <strong>🔍 Filters Applied:</strong> ${filterInfo.join(' | ')}
  </div>
  ` : ''}

  <table>
    <thead>
      <tr>
        <th>Guest</th>
        <th>Property</th>
        <th>Mode</th>
        <th>Check-in</th>
        <th>Check-out</th>
        <th style="text-align:right;">Total</th>
        <th style="text-align:right;">Paid</th>
        <th style="text-align:right;">Due</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="totals">
    <div>
      <div class="label">Total Bookings</div>
      <div class="value">${rows.length}</div>
    </div>
    <div>
      <div class="label">Total Amount</div>
      <div class="value">₹${totalAmount.toLocaleString('en-IN')}</div>
    </div>
    <div>
      <div class="label">Total Paid</div>
      <div class="value" style="color:#0A7D1A;">₹${totalPaid.toLocaleString('en-IN')}</div>
    </div>
    <div>
      <div class="label">Total Due</div>
      <div class="value" style="color:#FF385C;">₹${totalDue.toLocaleString('en-IN')}</div>
    </div>
  </div>

  <div class="footer">
    ${BRAND} · Contact: Mr. Shahanshah 9450055554 · Mr. Firoz Khan 8299600709<br>
    Generated from UHHS Admin System
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:12px 32px;background:#FF385C;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:15px;">🖨️ Print / Save as PDF</button>
  </div>

  <script>
    setTimeout(() => window.print(), 500);
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}


// ============ CROP MODAL ============
function openCropModal(file, callback) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.zIndex = '10000';

  modal.innerHTML = `
    <div class="modal-box" style="max-width:700px;padding:16px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>✂️ Crop Image</h2>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">
        Drag corners to select area. Click Save when done.
      </div>

      <div style="position:relative;overflow:hidden;background:#000;border-radius:8px;">
        <canvas id="cropCanvas" style="display:block;max-width:100%;cursor:crosshair;"></canvas>
        <div id="cropOverlay" style="position:absolute;border:2px dashed #FF385C;background:rgba(255,56,92,0.15);pointer-events:none;display:none;"></div>
      </div>

      <div class="btn-row" style="margin-top:12px;justify-content:center;">
        <button class="btn-sm" onclick="applyCrop()" style="background:#00A699;">✂️ Apply Crop</button>
        <button class="btn-sm outline" onclick="resetCrop()">↻ Reset</button>
        <button class="btn-sm" onclick="saveCroppedImage()" style="background:#FF385C;">💾 Save</button>
        <button class="btn-sm secondary" onclick="skipCrop()">⏭️ Use Original</button>
      </div>

      <div id="cropInfo" style="font-size:11px;color:var(--muted);margin-top:6px;text-align:center;"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const canvas = document.getElementById('cropCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('cropOverlay');
  const info = document.getElementById('cropInfo');

  const img = new Image();
  img.onload = () => {
    // Fit image to max 600px width
    const maxW = 600;
    const scale = Math.min(1, maxW / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    info.innerHTML = `Original: ${img.width}×${img.height} · Displayed: ${Math.round(canvas.width)}×${Math.round(canvas.height)}`;

    window._cropData = {
      img, canvas, ctx, scale,
      originalFile: file,
      callback,
      selection: null,
      startX: 0, startY: 0,
      isDragging: false
    };

    // Mouse events
    canvas.onmousedown = startCropSelect;
    canvas.onmousemove = updateCropSelect;
    canvas.onmouseup = endCropSelect;
    canvas.ontouchstart = e => { e.preventDefault(); startCropSelect(e.touches[0]); };
    canvas.ontouchmove = e => { e.preventDefault(); updateCropSelect(e.touches[0]); };
    canvas.ontouchend = e => { e.preventDefault(); endCropSelect(); };
  };
  img.src = URL.createObjectURL(file);
}

function startCropSelect(e) {
  const cd = window._cropData;
  if (!cd) return;
  const rect = cd.canvas.getBoundingClientRect();
  // Scale from displayed size to canvas actual size
  const scaleX = cd.canvas.width / rect.width;
  const scaleY = cd.canvas.height / rect.height;
  cd.startX = (e.clientX - rect.left) * scaleX;
  cd.startY = (e.clientY - rect.top) * scaleY;
  cd.dispScaleX = scaleX;
  cd.dispScaleY = scaleY;
  cd.isDragging = true;
}

function updateCropSelect(e) {
  const cd = window._cropData;
  if (!cd || !cd.isDragging) return;
  const rect = cd.canvas.getBoundingClientRect();
  const scaleX = cd.canvas.width / rect.width;
  const scaleY = cd.canvas.height / rect.height;

  // Coordinates in canvas natural space
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const overlay = document.getElementById('cropOverlay');
  const canvas = cd.canvas;

  const left = Math.min(cd.startX, x);
  const top = Math.min(cd.startY, y);
  const width = Math.abs(x - cd.startX);
  const height = Math.abs(y - cd.startY);

  cd.selection = { x: left, y: top, w: width, h: height };

  // Overlay in DISPLAYED coordinates (divide by scale)
  overlay.style.display = 'block';
  overlay.style.left = (canvas.offsetLeft + left / scaleX) + 'px';
  overlay.style.top = (canvas.offsetTop + top / scaleY) + 'px';
  overlay.style.width = (width / scaleX) + 'px';
  overlay.style.height = (height / scaleY) + 'px';

  document.getElementById('cropInfo').innerHTML =
    `Selection: ${Math.round(width)}×${Math.round(height)}px`;
}

function endCropSelect() {
  const cd = window._cropData;
  if (cd) cd.isDragging = false;
}

function applyCrop() {
  const cd = window._cropData;
  if (!cd || !cd.selection || cd.selection.w < 10 || cd.selection.h < 10) {
    fsn.info('Info', 'Please select an area first (drag on image)');
    return;
  }
  const { canvas, ctx, img, scale, selection } = cd;
  // Get cropped area
  const sx = selection.x / scale;
  const sy = selection.y / scale;
  const sw = selection.w / scale;
  const sh = selection.h / scale;

  // Draw cropped image
  canvas.width = selection.w;
  canvas.height = selection.h;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, selection.w, selection.h);

  cd.selection = null;
  document.getElementById('cropOverlay').style.display = 'none';
  document.getElementById('cropInfo').innerHTML = `✅ Cropped to ${Math.round(canvas.width)}×${Math.round(canvas.height)}`;
}

function resetCrop() {
  const cd = window._cropData;
  if (!cd) return;
  const { img } = cd;
  const maxW = 600;
  const scale = Math.min(1, maxW / img.width);
  cd.canvas.width = img.width * scale;
  cd.canvas.height = img.height * scale;
  cd.scale = scale;
  cd.ctx.drawImage(img, 0, 0, cd.canvas.width, cd.canvas.height);
  cd.selection = null;
  document.getElementById('cropOverlay').style.display = 'none';
  document.getElementById('cropInfo').innerHTML = `Reset · ${img.width}×${img.height}`;
}

function saveCroppedImage() {
  const cd = window._cropData;
  if (!cd) return;
  cd.canvas.toBlob(blob => {
    const croppedFile = new File([blob], cd.originalFile.name, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
    cd.callback(croppedFile);
    document.querySelector('.modal-overlay').remove();
    window._cropData = null;
  }, 'image/jpeg', 0.9);
}

function skipCrop() {
  const cd = window._cropData;
  if (!cd) return;
  cd.callback(cd.originalFile);
  document.querySelector('.modal-overlay').remove();
  window._cropData = null;
}


async function deleteVehiclePhoto(bkId, path) {
  if (!confirm('Delete vehicle photo?')) return;
  try {
    await sb.storage.from('id-proofs').remove([path]);
    await sb.from('guest_register').update({ vehicle_photo_path: null }).eq('booking_id', bkId);
    fsn.success('Success', '✅ Vehicle photo deleted');
    editBooking(bkId);
  } catch (e) {
    fsn.error('Error', '❌ ' + e.message);
  }
}

function onEditVehiclePick(input) {
  if (!input.files || !input.files[0]) return;
  openCropModal(input.files[0], (croppedFile) => {
    const dt = new DataTransfer();
    dt.items.add(croppedFile);
    input.files = dt.files;
    const url = URL.createObjectURL(croppedFile);
    const sizeMB = (croppedFile.size / 1024 / 1024).toFixed(1);
    document.getElementById('vehiclePhotoPreview').innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f0fff4;border-radius:8px;border:1.5px solid var(--green);margin:6px 0;">
        <img src="${url}" style="width:70px;height:50px;object-fit:cover;border-radius:6px;" />
        <div style="flex:1;">
          <div style="font-size:12px;color:var(--green);font-weight:700;">✅ New Photo Ready</div>
          <div style="font-size:10px;color:var(--muted);">${sizeMB} MB · Save to upload</div>
        </div>
        <button type="button" class="btn-sm danger" style="padding:4px 10px;font-size:11px;"
          onclick="document.getElementById('vehiclePhotoCam').value='';document.getElementById('vehiclePhotoGal').value='';document.getElementById('vehiclePhotoPreview').innerHTML='';">🗑️</button>
      </div>`;
  });
}

// Fix updateBooking to use new input IDs


// WhatsApp menu now lives in whatsapp.js (window.showWATemplatesMenu) — single source of truth


// ═══ CANCEL BOOKING ═══
window.cancelBooking = async function(bkId, guestName) {
  const { data: bk } = await sb.from('guest_register')
    .select('total_amount, is_cancelled').eq('booking_id', bkId).single();
  if (!bk) { fsn.error('Error', 'Not found'); return; }
  if (bk.is_cancelled) { fsn.info('Info', 'Already cancelled'); return; }

  const { data: pays } = await sb.from('payment_history')
    .select('amount').eq('booking_id', bkId).neq('verification_status', 'rejected');
  const totalPaid = (pays || []).reduce((s, p) => s + (p.amount || 0), 0);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML =
    '<div class="modal-box" style="max-width:450px;">' +
      '<button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button>' +
      '<h2>❌ Cancel Booking</h2>' +
      '<p style="color:var(--muted);margin:0 0 12px;">Guest: <strong>' + (guestName || bkId) + '</strong></p>' +
      '<div style="background:#FEF3C7;padding:10px;border-radius:8px;margin-bottom:12px;font-size:12px;">' +
        '💰 Total Amount: <strong>₹' + (bk.total_amount || 0).toLocaleString('en-IN') + '</strong><br>' +
        '💵 Already Paid: <strong>₹' + totalPaid.toLocaleString('en-IN') + '</strong>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Cancellation Reason *</label>' +
        '<select id="cancelReason">' +
          '<option value="">— Select —</option>' +
          '<option value="Guest cancelled - Change of plans">Guest cancelled — Change of plans</option>' +
          '<option value="Guest cancelled - Emergency">Guest cancelled — Emergency</option>' +
          '<option value="No show">Guest No-show</option>' +
          '<option value="Property unavailable">Property unavailable</option>' +
          '<option value="Payment issue">Payment issue</option>' +
          '<option value="Duplicate booking">Duplicate booking</option>' +
          '<option value="Airbnb cancelled">Airbnb cancelled</option>' +
          '<option value="Other">Other</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Additional Notes</label>' +
        '<textarea id="cancelNotes" rows="2" placeholder="Optional details..." style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;"></textarea>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Refund Amount ₹ (of ₹' + totalPaid.toLocaleString('en-IN') + ' paid)</label>' +
        '<input id="cancelRefund" type="number" value="' + totalPaid + '" min="0" max="' + totalPaid + '" />' +
      '</div>' +
      '<button onclick="saveCancelBooking(\'' + bkId + '\')" style="width:100%;background:#DC2626;color:#fff;margin-top:10px;">🚫 Confirm Cancellation</button>' +
      '<div id="cancelErr"></div>' +
    '</div>';
  document.body.appendChild(modal);
};

window.saveCancelBooking = async function(bkId) {
  const reason = document.getElementById('cancelReason')?.value;
  const notes = document.getElementById('cancelNotes')?.value?.trim() || '';
  const refund = parseFloat(document.getElementById('cancelRefund')?.value) || 0;

  if (!reason) {
    document.getElementById('cancelErr').innerHTML = '<div class="error">Please select a reason</div>';
    return;
  }

  const fullReason = notes ? reason + ' — ' + notes : reason;

  const { error } = await sb.from('guest_register').update({
    is_cancelled: true,
    cancelled_at: new Date().toISOString(),
    cancelled_by: SESSION.userId,
    cancellation_reason: fullReason,
    refund_amount: refund,
    payment_status: 'Cancelled'
  }).eq('booking_id', bkId);

  if (error) {
    document.getElementById('cancelErr').innerHTML = '<div class="error">' + error.message + '</div>';
    return;
  }

  // Free up the room
  const { data: bk } = await sb.from('guest_register').select('room_id').eq('booking_id', bkId).single();
  if (bk?.room_id) {
    await sb.from('flats_status').upsert({
      room_id: bk.room_id,
      status: 'Free',
      cleaning_status: 'Dirty',
      last_checkout: new Date().toISOString().slice(0, 10)
    }, { onConflict: 'room_id' });
  }

  fsn.warning('Cancelled', '❌ Booking cancelled\n💰 Refund: ₹' + refund.toLocaleString('en-IN'));
  document.querySelector('.modal-overlay')?.remove();
  renderManageBookings();
};

window.uncancelBooking = async function(bkId) {
  if (!confirm('Restore this cancelled booking?')) return;
  const { error } = await sb.from('guest_register').update({
    is_cancelled: false,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    refund_amount: 0
  }).eq('booking_id', bkId);
  if (error) { fsn.error('Error', error.message); return; }
  fsn.success('Restored', '✅ Booking restored');
  renderManageBookings();
};

// ═══ PENDING APPROVALS PAGE ═══
window.renderPendingApprovals = async function() {
  if (!isTrustedUser()) {
    renderShell('<div class="card"><div class="error">❌ Access denied — Only Owner/Developer</div></div>', 'pendingApprovals');
    return;
  }

  renderShell('<div class="loading">Loading pending approvals...</div>', 'pendingApprovals');

  const [bkResult, payResult] = await Promise.all([
    sb.from('guest_register')
      .select('*, rooms(unit_no, nickname, property_name)')
      .eq('verification_status', 'pending')
      .order('booking_id', { ascending: false }),
    sb.from('payment_history')
      .select('*, guest:guest_register(guest_name, room_id, rooms(unit_no, nickname))')
      .eq('verification_status', 'pending')
      .order('id', { ascending: false })
  ]);

  const bkList = bkResult.data || [];
  const payList = payResult.data || [];
  const totalPending = bkList.length + payList.length;

  let bkRows = '';
  bkList.forEach(b => {
    const creator = b.booked_by || 'Unknown';
    bkRows += '<tr>' +
      '<td><strong>' + (b.guest_name || '-') + '</strong><br><small style="color:#888;">' + (b.phone || '') + '</small></td>' +
      '<td>' + (propLabel(b.rooms) || b.room_id) + '</td>' +
      '<td><small>' + (b.check_in || '') + ' → ' + (b.check_out || '') + '</small></td>' +
      '<td><strong>₹' + (b.total_amount || 0).toLocaleString('en-IN') + '</strong></td>' +
      '<td><small style="color:#F59E0B;">👤 ' + creator + '</small></td>' +
      '<td>' +
        '<button class="btn-sm green-btn" onclick="approveBooking(\'' + b.booking_id + '\')">✅ Approve</button> ' +
        '<button class="btn-sm danger" onclick="rejectBooking(\'' + b.booking_id + '\')">❌ Reject</button> ' +
        '<button class="btn-sm outline" onclick="editBooking(\'' + b.booking_id + '\')">✏️ View</button>' +
      '</td>' +
      '</tr>';
  });

  let payRows = '';
  payList.forEach(p => {
    const guestName = p.guest?.guest_name || '-';
    const roomLabel = p.guest?.rooms ? (propLabel(p.guest.rooms) || p.guest.room_id) : (p.booking_id || '');
    payRows += '<tr>' +
      '<td><strong>' + guestName + '</strong><br><small style="color:#888;">' + (p.booking_id || '') + '</small></td>' +
      '<td>' + roomLabel + '</td>' +
      '<td><strong style="color:#0A7D1A;">₹' + (p.amount || 0).toLocaleString('en-IN') + '</strong><br><small>' + (p.payment_mode || '-') + '</small></td>' +
      '<td><small>' + (p.payment_date || '-') + '</small><br><small style="color:#888;">' + (p.notes || '') + '</small></td>' +
      '<td>' +
        '<button class="btn-sm green-btn" onclick="approvePayment(' + p.id + ')">✅ Approve</button> ' +
        '<button class="btn-sm danger" onclick="rejectPayment(' + p.id + ')">❌ Reject</button>' +
      '</td>' +
      '</tr>';
  });

  const html = '<div class="wrap">' +
    '<h1>🟡 Pending Approvals <span style="background:#F59E0B;color:#fff;padding:4px 12px;border-radius:20px;font-size:14px;margin-left:8px;">' + totalPending + '</span></h1>' +
    '<p style="color:#888;">Items created by moderators awaiting your verification</p>' +
    '<div class="card" style="margin-top:16px;">' +
      '<div class="section-title">📅 Pending Bookings (' + bkList.length + ')</div>' +
      (bkList.length === 0
        ? '<div style="text-align:center;padding:30px;color:#888;">✨ No pending bookings</div>'
        : '<div class="table-wrap"><table>' +
            '<thead><tr><th>Guest</th><th>Property</th><th>Dates</th><th>Amount</th><th>Created By</th><th>Actions</th></tr></thead>' +
            '<tbody>' + bkRows + '</tbody>' +
          '</table></div>') +
    '</div>' +
    '<div class="card" style="margin-top:16px;">' +
      '<div class="section-title">💰 Pending Payments (' + payList.length + ')</div>' +
      (payList.length === 0
        ? '<div style="text-align:center;padding:30px;color:#888;">✨ No pending payments</div>'
        : '<div class="table-wrap"><table>' +
            '<thead><tr><th>Guest</th><th>Property</th><th>Amount</th><th>Date/Notes</th><th>Actions</th></tr></thead>' +
            '<tbody>' + payRows + '</tbody>' +
          '</table></div>') +
    '</div>' +
    '</div>';

  renderShell(html, 'pendingApprovals');
  window._pendingCount = totalPending;
};

// ═══ Fetch pending count for menu badge ═══
window.fetchPendingCount = async function() {
  if (!isTrustedUser()) { window._pendingCount = 0; return 0; }
  try {
    const [bkRes, payRes] = await Promise.all([
      sb.from('guest_register').select('booking_id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      sb.from('payment_history').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending')
    ]);
    const total = (bkRes.count || 0) + (payRes.count || 0);
    window._pendingCount = total;
    document.querySelectorAll('.pending-approvals-badge').forEach(el => {
      if (total > 0) {
        el.textContent = total > 99 ? '99+' : total;
        el.style.display = 'inline-flex';
      } else {
        el.style.display = 'none';
      }
    });
    return total;
  } catch(e) { console.warn('Pending count fetch failed:', e); return 0; }
};

setInterval(function() { if (window.sb && window.SESSION?.userId && isTrustedUser()) window.fetchPendingCount(); }, 60000);
setTimeout(function() { if (window.sb && window.SESSION?.userId && isTrustedUser()) window.fetchPendingCount(); }, 3000);




// Toggle review booking dropdown visibility
window.toggleReviewBooking = function() {
  const wrap = document.getElementById('linkedBookingWrap');
  const cb = document.getElementById('isReviewBooking');
  if (wrap && cb) wrap.style.display = cb.checked ? 'block' : 'none';
};


// ═══ PAYMENT DUPLICATE WARNING HELPERS ═══
window.proceedPaymentAnyway = function(bkId) {
  window._paymentConfirmedForDupe = true;
  document.getElementById('payErr').innerHTML = '';
  savePaymentModal(bkId);
};

window.cancelPayment = function() {
  document.querySelector('.modal-overlay')?.remove();
  window._paymentConfirmedForDupe = false;
};

window.switchPaymentBooking = function(newBkId, oldBkId) {
  if (newBkId === oldBkId) return;
  if (!confirm('Payment ko is booking mein switch karein?')) return;
  document.querySelector('.modal-overlay')?.remove();
  window._paymentConfirmedForDupe = false;
  showPaymentModal(newBkId);
};


// ═══ SHOW LINKED BOOKING DETAILS ═══
window.showLinkedBooking = async function(linkedBookingId) {
  const { data: bk } = await sb.from('guest_register')
    .select('booking_id, guest_name, phone, room_id, booking_mode, check_in, check_out, total_amount, is_review_booking')
    .eq('booking_id', linkedBookingId).single();
  
  if (!bk) {
    fsn.error('Not Found', 'Linked booking not found');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  modal.innerHTML = `
    <div class="modal-box" style="max-width:450px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>🔗 Linked Booking</h2>
      <div style="background:#F0F9FF;padding:14px;border-radius:8px;margin-top:12px;border:1px solid #0EA5E9;">
        <div style="font-size:16px;font-weight:700;">${bk.guest_name}</div>
        <div style="font-size:12px;color:#666;margin-top:4px;">
          📞 ${bk.phone || '-'} · 🏠 ${bk.room_id}<br>
          📅 ${bk.check_in} → ${bk.check_out || 'Open'}<br>
          💰 ₹${(bk.total_amount || 0).toLocaleString('en-IN')}<br>
          <span class="badge ${bk.booking_mode === 'Online-Airbnb' ? 'blue' : 'yellow'}">${bk.booking_mode}</span>
          ${bk.is_review_booking ? '<span class="badge" style="background:#722ED1;color:#fff;">⭐ REVIEW</span>' : ''}
        </div>
      </div>
      <div style="margin-top:14px;font-size:12px;color:#666;font-style:italic;">
        💡 Dono bookings same guest ka hai — offline stay + online review booking
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

// ═══ AUTO-DETECT DUPLICATE ═══
window.detectDuplicateBookings = function(bookings) {
  const groups = {};
  bookings.forEach(b => {
    if (b.is_cancelled) return;
    const key = `${b.room_id}_${b.check_in}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });
  
  const dupes = {};
  Object.entries(groups).forEach(([key, bks]) => {
    if (bks.length > 1) {
      bks.forEach(b => dupes[b.booking_id] = bks.length);
    }
  });
  return dupes;
};


// ═══ DUPLICATE DETECTION ═══
window.checkDuplicate = function(booking, allBookings) {
  if (!allBookings) return false;
  const dupes = allBookings.filter(b => {
    // Basic filters
    if (b.booking_id === booking.booking_id) return false;
    if (b.is_cancelled) return false;
    if (b.room_id !== booking.room_id) return false;
    
    // Skip if same group (family/wedding/multi-room booking)
    if (booking.stay_group_id && b.stay_group_id === booking.stay_group_id) return false;
    
    // Skip if parent-child (extended stay)
    if (b.parent_booking_id === booking.booking_id) return false;
    if (booking.parent_booking_id === b.booking_id) return false;
    if (b.parent_booking_id && b.parent_booking_id === booking.parent_booking_id) return false;
    
    // Skip if already linked to each other
    if (b.linked_booking_id === booking.booking_id) return false;
    if (booking.linked_booking_id === b.booking_id) return false;
    
    // Skip review bookings (fake Airbnb entries)
    if (b.is_review_booking || booking.is_review_booking) return false;
    
    // Check for date overlap
    const bCheckOut = b.check_out || b.check_in;
    const bookCheckOut = booking.check_out || booking.check_in;
    if (b.check_in > bookCheckOut) return false;
    if (bCheckOut < booking.check_in) return false;
    
    // Same guest + same date range = likely group booking, not duplicate
    if (b.guest_name && booking.guest_name 
        && b.guest_name.trim().toLowerCase() === booking.guest_name.trim().toLowerCase()
        && b.check_in === booking.check_in) {
      return false;
    }
    
    // Same phone + same date = likely group booking by one person
    if (b.phone && booking.phone 
        && b.phone === booking.phone
        && b.check_in === booking.check_in) {
      return false;
    }
    
    return true; // Real overlap detected
  });
  return dupes.length > 0;
};

// ═══ SHOW DUPLICATE OPTIONS MODAL ═══
window.showDuplicateOptions = async function(bookingId) {
  const { data: currBk } = await sb.from('guest_register')
    .select('*')
    .eq('booking_id', bookingId).single();
  
  if (!currBk) return;
  
  // Find overlapping bookings
  const { data: overlaps } = await sb.from('guest_register')
    .select('booking_id, guest_name, room_id, booking_mode, check_in, check_out, total_amount, is_review_booking, linked_booking_id')
    .eq('room_id', currBk.room_id)
    .neq('booking_id', bookingId)
    .lte('check_in', currBk.check_out || currBk.check_in)
    .gte('check_out', currBk.check_in);
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>⚠️ Duplicate Bookings Detected</h2>
      
      <div style="background:#FEF3C7;padding:12px;border-radius:8px;margin:12px 0;border:1px solid #F59E0B;">
        <div style="font-weight:700;color:#78350F;margin-bottom:6px;">Current Booking:</div>
        <div><strong>${currBk.guest_name}</strong> — ${currBk.room_id}</div>
        <div style="font-size:12px;color:#666;">${currBk.check_in} → ${currBk.check_out || 'Open'} · ${currBk.booking_mode}</div>
      </div>
      
      <div style="font-weight:700;margin:14px 0 8px;">Overlapping Bookings (${(overlaps || []).length}):</div>
      
      ${(overlaps || []).map(b => `
        <div style="background:#F9FAFB;padding:12px;border-radius:8px;margin-bottom:8px;border:1px solid #E5E7EB;">
          <div><strong>${b.guest_name}</strong>
            ${b.is_review_booking ? '<span class="badge" style="background:#722ED1;color:#fff;font-size:9px;">⭐ REVIEW</span>' : ''}
            ${b.linked_booking_id === bookingId ? '<span class="badge" style="background:#0EA5E9;color:#fff;font-size:9px;">🔗 LINKED</span>' : ''}
          </div>
          <div style="font-size:12px;color:#666;margin:4px 0;">
            ${b.check_in} → ${b.check_out || 'Open'} · ${b.booking_mode} · ₹${(b.total_amount || 0).toLocaleString('en-IN')}
          </div>
          ${!b.linked_booking_id ? `
            <button onclick="linkBookings('${bookingId}', '${b.booking_id}')" 
                    style="background:#0EA5E9;color:#fff;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;margin-top:6px;">
              🔗 Link These Bookings
            </button>
          ` : `<span style="font-size:11px;color:#059669;">✓ Already linked</span>`}
        </div>
      `).join('') || '<div style="color:#999;">No overlaps found</div>'}
      
      <div style="margin-top:14px;padding:10px;background:#F0F9FF;border-radius:6px;font-size:12px;color:#0369A1;">
        💡 <strong>Tip:</strong> Link karo agar dono same guest ki bookings hain (e.g., offline stay + online review booking)
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

// ═══ LINK TWO BOOKINGS ═══
window.linkBookings = async function(bookingA, bookingB) {
  if (!confirm('Ye dono bookings ko link karna hai? Same guest hone ki confirmation.')) return;
  
  // Link A → B (A is the review booking, B is the original)
  // Set linked_booking_id on the newer one
  const { data: bkA } = await sb.from('guest_register').select('created_at, is_review_booking').eq('booking_id', bookingA).single();
  const { data: bkB } = await sb.from('guest_register').select('created_at, is_review_booking').eq('booking_id', bookingB).single();
  
  // The review one should link to the offline (original)
  let sourceId, targetId;
  if (bkA?.is_review_booking) {
    sourceId = bookingA;
    targetId = bookingB;
  } else if (bkB?.is_review_booking) {
    sourceId = bookingB;
    targetId = bookingA;
  } else {
    // Neither is review, link newer to older
    if (new Date(bkA.created_at) > new Date(bkB.created_at)) {
      sourceId = bookingA;
      targetId = bookingB;
    } else {
      sourceId = bookingB;
      targetId = bookingA;
    }
  }
  
  const { error } = await sb.from('guest_register')
    .update({ linked_booking_id: targetId })
    .eq('booking_id', sourceId);
  
  if (error) {
    fsn.error('Error', error.message);
    return;
  }
  
  fsn.success('Linked!', '✅ Bookings linked successfully');
  document.querySelector('.modal-overlay')?.remove();
  if (typeof renderManageBookings === 'function') renderManageBookings();
};

// ═══ UNLINK BOOKING ═══
window.unlinkBooking = async function(bookingId) {
  if (!confirm('Remove the link from this booking?')) return;
  
  const { error } = await sb.from('guest_register')
    .update({ linked_booking_id: null })
    .eq('booking_id', bookingId);
  
  if (error) { fsn.error('Error', error.message); return; }
  fsn.success('Unlinked', '✅ Link removed');
  if (typeof renderManageBookings === 'function') renderManageBookings();
};


// ═══════════════════════════════════════════════
// 🎊 GROUP BOOKING MODAL — Wedding/Family/Corporate
// ═══════════════════════════════════════════════
window.showGroupBookingModal = async function(bookingId) {
  const { data: currBk } = await sb.from('guest_register')
    .select('*, rooms(unit_no, nickname)')
    .eq('booking_id', bookingId).single();
  
  if (!currBk) {
    if (window.fsn) fsn.error('Not found', 'Booking not found');
    return;
  }
  
  const { data: candidates } = await sb.from('guest_register')
    .select('booking_id, guest_name, room_id, phone, check_in, check_out, total_amount, booking_mode, stay_group_id, rooms(unit_no, nickname)')
    .neq('booking_id', bookingId)
    .or('is_cancelled.is.null,is_cancelled.eq.false');
  
  const nameNorm = (currBk.guest_name || '').trim().toLowerCase();
  const relatedBookings = (candidates || []).filter(b => {
    const nameMatch = b.guest_name && b.guest_name.trim().toLowerCase() === nameNorm;
    const phoneMatch = b.phone && currBk.phone && b.phone === currBk.phone;
    if (!nameMatch && !phoneMatch) return false;
    const daysDiff = Math.abs(new Date(b.check_in) - new Date(currBk.check_in)) / (1000*60*60*24);
    return daysDiff <= 3;
  });
  
  const existingGroupId = currBk.stay_group_id;
  const groupBookings = existingGroupId ? (candidates || []).filter(b => b.stay_group_id === existingGroupId) : [];
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  
  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>🎊 Group Booking Manager</h2>
      <div class="sub">Weddings, family trips, corporate — link related bookings together</div>
      
      <div style="background:#F5F3FF;border:1px solid #8B5CF6;border-radius:10px;padding:12px;margin:12px 0;">
        <div style="font-size:12px;color:#6D28D9;font-weight:700;margin-bottom:4px;">CURRENT BOOKING</div>
        <div><strong>${currBk.guest_name}</strong> — ${propLabel(currBk.rooms) || currBk.room_id}</div>
        <div style="font-size:12px;color:var(--muted);">📅 ${currBk.check_in} → ${currBk.check_out || 'Open'} · 📞 ${currBk.phone || '-'} · ₹${(currBk.total_amount || 0).toLocaleString('en-IN')}</div>
        ${existingGroupId ? `<div style="margin-top:6px;font-size:11px;color:#059669;">✅ Already in group: <code>${existingGroupId}</code></div>` : ''}
      </div>
      
      ${groupBookings.length > 0 ? `
        <div style="margin:14px 0 8px;font-weight:700;color:#059669;">✅ Bookings already in this group (${groupBookings.length}):</div>
        ${groupBookings.map(b => `
          <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:10px;margin-bottom:6px;">
            <div><strong>${b.guest_name}</strong> — ${propLabel(b.rooms) || b.room_id}</div>
            <div style="font-size:12px;color:var(--muted);">${b.check_in} → ${b.check_out || 'Open'} · ₹${(b.total_amount || 0).toLocaleString('en-IN')}</div>
          </div>
        `).join('')}
      ` : ''}
      
      ${relatedBookings.filter(b => b.stay_group_id !== existingGroupId).length > 0 ? `
        <div style="margin:14px 0 8px;font-weight:700;">Related bookings found (${relatedBookings.filter(b => b.stay_group_id !== existingGroupId).length}):</div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">Check the ones that belong to this group:</div>
        ${relatedBookings.filter(b => b.stay_group_id !== existingGroupId).map(b => `
          <label style="display:flex;align-items:flex-start;gap:10px;background:#fafafa;border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:6px;cursor:pointer;">
            <input type="checkbox" class="grp-check" data-bid="${b.booking_id}" style="margin-top:3px;width:18px;height:18px;">
            <div style="flex:1;">
              <div><strong>${b.guest_name}</strong> — ${propLabel(b.rooms) || b.room_id}</div>
              <div style="font-size:12px;color:var(--muted);">${b.check_in} → ${b.check_out || 'Open'} · 📞 ${b.phone || '-'} · ${b.booking_mode} · ₹${(b.total_amount || 0).toLocaleString('en-IN')}</div>
              ${b.stay_group_id ? `<div style="font-size:10px;color:#F59E0B;">⚠️ Already in group: ${b.stay_group_id}</div>` : ''}
            </div>
          </label>
        `).join('')}
      ` : (groupBookings.length === 0 ? '<div class="sub" style="padding:10px;">No related bookings found within ±3 days of check-in.</div>' : '')}
      
      <div style="margin:14px 0 8px;">
        <label style="font-size:12px;font-weight:600;color:#484848;">Group Type</label>
        <select id="grpType" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid var(--border);margin-top:4px;">
          <option value="WEDDING">💒 Wedding</option>
          <option value="FAMILY">👨‍👩‍👧 Family Trip</option>
          <option value="CORPORATE">💼 Corporate Event</option>
          <option value="FRIENDS">👥 Friends Group</option>
          <option value="OTHER">📌 Other</option>
        </select>
      </div>
      
      <div style="margin:10px 0;">
        <label style="font-size:12px;font-weight:600;color:#484848;">Notes (optional)</label>
        <textarea id="grpNotes" placeholder="e.g. Wedding - 35 guests - Full building" style="width:100%;padding:10px;border-radius:8px;border:1.5px solid var(--border);margin-top:4px;min-height:60px;">${currBk.notes || ''}</textarea>
      </div>
      
      <div class="btn-row" style="margin-top:16px;">
        <button onclick="this.closest('.modal-overlay').remove()" class="outline">Cancel</button>
        <button style="background:#8B5CF6;color:#fff;" onclick="saveGroupBooking('${bookingId}')">
          🎊 ${existingGroupId ? 'Update Group' : 'Create Group'}
        </button>
        ${existingGroupId ? `<button class="danger" onclick="removeFromGroup('${bookingId}')">🚫 Remove from Group</button>` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
};

window.saveGroupBooking = async function(bookingId) {
  const checkedIds = Array.from(document.querySelectorAll('.grp-check:checked')).map(cb => cb.dataset.bid);
  const grpType = document.getElementById('grpType').value;
  const notes = document.getElementById('grpNotes').value.trim();
  
  const { data: currBk } = await sb.from('guest_register')
    .select('stay_group_id, guest_name, check_in')
    .eq('booking_id', bookingId).single();
  
  let groupId = currBk.stay_group_id;
  if (!groupId) {
    const guestSlug = (currBk.guest_name || 'GUEST').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    const dateSlug = (currBk.check_in || '').replace(/-/g, '');
    groupId = `GRP-${guestSlug}-${grpType}-${dateSlug}`;
  }
  
  const allBookingIds = [bookingId, ...checkedIds];
  
  const { error } = await sb.from('guest_register')
    .update({ 
      stay_group_id: groupId,
      notes: notes || null
    })
    .in('booking_id', allBookingIds);
  
  if (error) {
    if (window.fsn) fsn.error('Error', error.message);
    else alert('Error: ' + error.message);
    return;
  }
  
  document.querySelector('.modal-overlay')?.remove();
  if (window.fsn) fsn.success('Group Created', `${allBookingIds.length} bookings grouped as ${groupId}`);
  renderManageBookings();
};

window.removeFromGroup = async function(bookingId) {
  if (!confirm('Remove this booking from its group?')) return;
  
  const { error } = await sb.from('guest_register')
    .update({ stay_group_id: null })
    .eq('booking_id', bookingId);
  
  if (error) {
    if (window.fsn) fsn.error('Error', error.message);
    else alert('Error: ' + error.message);
    return;
  }
  
  document.querySelector('.modal-overlay')?.remove();
  if (window.fsn) fsn.success('Removed', 'Booking removed from group');
  renderManageBookings();
};



// ═══════════════════════════════════════════════════════════
// AUTO-FIX OVERFLOW: Detects bookings with negative due and
// redistributes extra payment to same guest's unpaid bookings
// ═══════════════════════════════════════════════════════════
async function autoFixOverflowPayments() {
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Scanning...'; }

  try {
    // Fetch all active bookings
    const { data: allBks } = await sb.from('guest_register')
      .select('booking_id, guest_name, phone, total_amount, room_id, check_in, is_cancelled, rooms(nickname, unit_no)')
      .neq('is_cancelled', true);

    const { data: allPays } = await sb.from('payment_history')
      .select('booking_id, amount, verification_status')
      .neq('verification_status', 'rejected');

    // Calculate paid per booking
    const paidMap = {};
    (allPays || []).forEach(p => {
      paidMap[p.booking_id] = (paidMap[p.booking_id] || 0) + (p.amount || 0);
    });

    // Find bookings with negative due (overpaid)
    const overpaid = (allBks || []).filter(b => {
      const paid = paidMap[b.booking_id] || 0;
      return paid > (b.total_amount || 0);
    }).map(b => ({
      ...b,
      paid: paidMap[b.booking_id] || 0,
      overflow: (paidMap[b.booking_id] || 0) - (b.total_amount || 0)
    }));

    if (overpaid.length === 0) {
      alert('✅ No overpaid bookings found. Everything is balanced!');
      if (btn) { btn.disabled = false; btn.textContent = '🔧 Fix Overflow Payments'; }
      return;
    }

    // Build preview of adjustments
    const adjustments = [];

    for (const ob of overpaid) {
      let remaining = ob.overflow;
      // Find same guest's unpaid bookings
      const sameGuest = (allBks || []).filter(b => {
        if (b.booking_id === ob.booking_id) return false;
        if (b.phone && ob.phone && b.phone === ob.phone) return true;
        if (b.guest_name === ob.guest_name) return true;
        return false;
      }).sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));

      for (const target of sameGuest) {
        if (remaining <= 0) break;
        const tPaid = paidMap[target.booking_id] || 0;
        const tDue = Math.max((target.total_amount || 0) - tPaid, 0);
        if (tDue <= 0) continue;
        const toMove = Math.min(remaining, tDue);
        adjustments.push({
          fromBk: ob.booking_id,
          fromRoom: ob.rooms?.nickname || ob.room_id,
          toBk: target.booking_id,
          toRoom: target.rooms?.nickname || target.room_id,
          guestName: ob.guest_name,
          amount: toMove
        });
        remaining -= toMove;
        // Update local paidMap so subsequent iterations know
        paidMap[target.booking_id] = tPaid + toMove;
        paidMap[ob.booking_id] = (paidMap[ob.booking_id] || 0) - toMove;
      }
    }

    if (adjustments.length === 0) {
      alert('⚠️ Found ' + overpaid.length + ' overpaid booking(s) but no matching unpaid bookings from same guest to adjust to.');
      if (btn) { btn.disabled = false; btn.textContent = '🔧 Fix Overflow Payments'; }
      return;
    }

    // Show preview modal
    const previewText = adjustments.map((a, i) =>
      (i + 1) + '. ' + a.guestName + ': Move ₹' + a.amount.toLocaleString('en-IN') +
      '\n   FROM: ' + a.fromRoom + ' (' + a.fromBk + ')' +
      '\n   TO:   ' + a.toRoom + ' (' + a.toBk + ')'
    ).join('\n\n');

    const confirmed = confirm(
      '🔧 OVERFLOW AUTO-FIX PREVIEW\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      previewText +
      '\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      'Total adjustments: ' + adjustments.length + '\n' +
      'Apply these changes?'
    );

    if (!confirmed) {
      if (btn) { btn.disabled = false; btn.textContent = '🔧 Fix Overflow Payments'; }
      return;
    }

    if (btn) btn.textContent = '⏳ Applying...';

    // Apply adjustments
    let successCount = 0;
    for (const a of adjustments) {
      // 1. Add negative correction to source (reduces its paid amount)
      const { error: e1 } = await sb.from('payment_history').insert({
        booking_id: a.fromBk,
        amount: -a.amount,
        payment_mode: 'Adjustment',
        payment_date: new Date().toISOString().slice(0, 10),
        notes: 'Overflow auto-adjusted → ' + a.toBk + ' (' + a.toRoom + ')',
        created_by: SESSION.userId,
        verification_status: 'verified'
      });

      // 2. Add positive payment to target
      const { error: e2 } = await sb.from('payment_history').insert({
        booking_id: a.toBk,
        amount: a.amount,
        payment_mode: 'Adjustment',
        payment_date: new Date().toISOString().slice(0, 10),
        notes: 'Overflow received from ' + a.fromBk + ' (' + a.fromRoom + ')',
        created_by: SESSION.userId,
        verification_status: 'verified'
      });

      if (!e1 && !e2) {
        await recalcPaymentStatus(a.fromBk);
        await recalcPaymentStatus(a.toBk);
        successCount++;
      } else {
        console.error('Adjustment failed:', a, e1, e2);
      }
    }

    alert('✅ Done! ' + successCount + '/' + adjustments.length + ' adjustments applied successfully.');
    if (btn) { btn.disabled = false; btn.textContent = '🔧 Fix Overflow Payments'; }

    // Refresh bookings if visible
    if (typeof renderManageBookings === 'function' && location.hash.includes('bookings')) {
      renderManageBookings();
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = '🔧 Fix Overflow Payments'; }
  }
}

window.autoFixOverflowPayments = autoFixOverflowPayments;
