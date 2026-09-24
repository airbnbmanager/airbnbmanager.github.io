// ═══════════════════════════════════════════════════════════
// 📱 WHATSAPP TEMPLATES v2 — Universal Data Fetch
// Professional, short, marketing-focused
// ═══════════════════════════════════════════════════════════

// ═══ HARDCODED: Business Owners (Escalation) ═══
const OWNERS = [
  { name: 'Mr. Shahanshah', phone: '9450055554' },
  { name: 'Mr. Firoz Khan', phone: '8299600709' }
];

const BRAND_URL = 'https://uniquehavenhomesstay.com';
const BRAND_NAME = 'The Unique Haven Homes';

// ═══ Get property URL from nickname ═══
window.getPropertyURL = function(nickname) {
  if (!nickname) return BRAND_URL;
  const slug = String(nickname).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return BRAND_URL + '/' + slug + '.html';
};

// ═══ UNIVERSAL DATA BUILDER ═══
async function buildMessageData(bkId) {
  const { data: bk, error } = await sb.from('guest_register')
    .select('*, rooms(*)')
    .eq('booking_id', bkId).single();

  if (error || !bk) return null;

  const room = bk.rooms || {};
  const roomId = bk.room_id;

  // Fetch config
  const { data: cfg } = await sb.from('company_config').select('*').eq('id', 1).single();
  const config = cfg || {};

  // Fetch active staff for this property
  let propertyStaff = [];
  const cleanPhone = p => (p || '').replace(/\D/g, '');

  try {
    const { data: allStaff } = await sb.from('employees')
      .select('name, phone, shift, role, property_role, whatsapp_display_role, assigned_rooms, status, is_active, in_whatsapp_template');

    // Room tokens representing this property
    const roomTokens = new Set([
      (roomId || '').toLowerCase().trim(),
      (room.room_id || '').toLowerCase().trim(),
      (room.unit_no || '').toLowerCase().trim(),
      (room.nickname || '').toLowerCase().trim()
    ].filter(Boolean));

    propertyStaff = (allStaff || []).filter(e => {
      // 1. Must be active (not fired, inactive, terminated)
      const st = String(e.status || '').trim().toLowerCase();
      const isActive = (st === 'active' || e.is_active === true) && !['inactive', 'fired', 'terminated'].includes(st) && e.is_active !== false;
      if (!isActive) return false;
      if (e.in_whatsapp_template === false) return false;

      // 2. Must have a valid phone number (at least 10 digits)
      const p = cleanPhone(e.phone);
      if (!p || p.length < 10) return false;

      // 3. Must NOT be manager (Praveen Singh has dedicated Property Manager section)
      const roleStr = String(e.role || '').toLowerCase();
      const nameStr = String(e.name || '').toLowerCase();
      if (nameStr.includes('praveen') || roleStr.includes('manager')) return false;

      // 4. Must be Caretaker role
      const propRole = String(e.property_role || '').toLowerCase();
      const isCaretaker = roleStr.includes('caretaker') || propRole.includes('caretaker') || roleStr.includes('care taker') || e.whatsapp_display_role === 'Caretaker';
      if (!isCaretaker) return false;

      // 5. Must match assigned property room tokens
      const assigned = String(e.assigned_rooms || '').split(',').map(r => r.trim().toLowerCase()).filter(Boolean);
      if (assigned.length === 0) return false;

      return assigned.some(a => roomTokens.has(a));
    });
  } catch(e) {
    console.error('Error fetching propertyStaff:', e);
  }

  const dayCaretakers = propertyStaff.filter(e => e.shift === 'day' && cleanPhone(e.phone));
  const nightCaretakers = propertyStaff.filter(e => e.shift === 'night' && cleanPhone(e.phone));

  let caretakerBlock = '';
  let primaryCaretaker = null;

  // Scenario 1: Property has 2 separate caretakers (Day shift & Night shift)
  if (dayCaretakers.length > 0 && nightCaretakers.length > 0) {
    const dC = dayCaretakers[0];
    const nC = nightCaretakers[0];
    caretakerBlock = 
      `☀️ *Day Caretaker (9 AM – 9 PM):* ${dC.name} (${cleanPhone(dC.phone)})\n` +
      `🌙 *Night Caretaker (9 PM – 9 AM):* ${nC.name} (${cleanPhone(nC.phone)})`;
    const nowH = new Date().getHours();
    primaryCaretaker = (nowH >= 21 || nowH < 9) ? nC : dC;
  } 
  // Scenario 2: Property has a single caretaker from employees (Single caretaker: NO shift name, 24h duty)
  else if (propertyStaff.length > 0) {
    const s = propertyStaff[0];
    caretakerBlock = `🛡️ *Caretaker:* ${s.name} (${cleanPhone(s.phone)})`;
    primaryCaretaker = s;
  } 
  // Scenario 3: Fallback to room's configured caretaker or default company caretaker
  else {
    let careName = room.caretaker_name;
    let carePhone = cleanPhone(room.caretaker_phone);
    if (!careName || careName === 'Pending' || !carePhone || carePhone === '9999999999' || carePhone.length < 10) {
      careName = 'Arman Commandar';
      carePhone = '8467080284';
    }
    caretakerBlock = `🛡️ *Caretaker:* ${careName} (${carePhone})`;
    primaryCaretaker = { name: careName, phone: carePhone };
  }

  // Dedicated Host & Operations: Shahanshah (9450055554) & Firoz (8299600709)
  const manager = {
    name: 'Shahanshah',
    phone: '9450055554',
    hours: '10 AM to 09 PM',
    role: 'Host'
  };

  // Calculate paid + due
  const { data: pays } = await sb.from('payment_history')
    .select('amount').eq('booking_id', bkId).neq('verification_status', 'rejected');
  const totalPaid = (pays || []).reduce((s, p) => s + (p.amount || 0), 0);
  const totalDue = Math.max(0, (bk.total_amount || 0) - totalPaid);
  const nights = calcNights(bk.check_in, bk.check_out);

  // Fetch investor(s) linked to this property
  const { data: invLinks } = await sb.from('investor_properties')
    .select('investor_id, investors(name, phone)')
    .eq('room_id', roomId);
  const investors = (invLinks || [])
    .filter(l => l.investors && l.investors.phone)
    .map(l => ({ name: l.investors.name, phone: cleanPhone(l.investors.phone) }));

  return {
    bk, room, config,
    guestName: bk.guest_name || 'Guest',
    phone: bk.phone,
    propertyName: room.nickname || room.property_name || roomId,
    propertyFullName: room.property_name || room.nickname || roomId,
    flat: room.unit_no || roomId,
    floor: room.floor || '',
    address: room.address || 'Vikalp Khand, Gomti Nagar, Lucknow',
    mapLink: room.map_link || '',
    propertyURL: window.getPropertyURL(room.nickname),
    wifi: room.wifi_ssid || 'UniqueHaven_WiFi',
    wifiPass: room.wifi_password || 'Airbnb.in1',
    keyNo: room.key_number || 'With Caretaker',
    lockType: room.lock_type || 'Physical',
    checkIn: bk.check_in || '',
    checkOut: bk.check_out || '',
    checkInTime: bk.check_in_time || '14:00',
    checkOutTime: bk.check_out_time || '11:00',
    nights,
    total: bk.total_amount || 0,
    paid: totalPaid,
    due: totalDue,
    vehicle: bk.has_vehicle ? ((bk.vehicle_name || '') + ' ' + (bk.vehicle_number || '')).trim() : null,
    caretaker: primaryCaretaker,
    caretakerBlock,
    manager,
    dayStaff: dayCaretakers.map(s => ({ name: s.name, phone: cleanPhone(s.phone), role: s.whatsapp_display_role || 'Caretaker' })),
    nightStaff: nightCaretakers.map(s => ({ name: s.name, phone: cleanPhone(s.phone), role: s.whatsapp_display_role || 'Caretaker' })),
    owners: OWNERS,
    investors,
    websiteURL: config.website_url || BRAND_URL,
    googleReview: config.google_review_url || '',
    airbnbReview: config.airbnb_host_url || '',
    airbnbReviewLink: bk.airbnb_confirmation_code
      ? `https://www.airbnb.com/reviews/write?reservationId=${bk.airbnb_confirmation_code}`
      : (room.airbnb_url || config.airbnb_host_url || 'https://www.airbnb.com/progress/reviews'),
    isAirbnb: bk.booking_mode === 'Online-Airbnb',
    discount: config.discount_percent || 15
  };
}

function fmtDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch(e) { return d; }
}

// ═══════════════════════════════════════════════════════════
// TEMPLATES (Short, Crisp, Professional with Emojis & Maps)
// ═══════════════════════════════════════════════════════════

// ═══ 0. ALL-IN-ONE BOOKING CONFIRMATION & WELCOME PASS ═══
function tplConfirmation(d) {
  const mapStr = d.mapLink ? `\n📍 *Map:* ${d.mapLink}` : '';
  const floorStr = d.floor ? ` (${d.floor} floor)` : '';
  const lockStr = d.lockType ? ` (${d.lockType} Lock)` : '';

  return `🏨 *THE UNIQUE HAVEN HOMES*
Namaste *${d.guestName}* ji 🙏
Thank you for booking with us!

🏠 *Property:* ${d.propertyName}
🚪 *Flat:* ${d.flat}${floorStr}
📍 *Address:* ${d.address}${mapStr}

⏰ *Check-in:* ${fmtDate(d.checkIn)} at ${d.checkInTime || '14:00'}
⏰ *Check-out:* ${fmtDate(d.checkOut)} at ${d.checkOutTime || '11:00'}

👤 *Manager:* ${d.manager.name} (${d.manager.phone}) — ${d.manager.hours}
${d.caretakerBlock}

🔑 *Key / Lock:* ${d.keyNo}${lockStr}
🔑 *WiFi Password:* ${d.wifiPass}

*Quick Rules:*
• Govt ID required at check-in

House Rules⚠️
• No loud music after 11 PM
• Early check in/late check out subject to Availability
• No wild parties or disruptive gatherings
We want to keep the neighbourhood peaceful for everyone.

*Escalation / Assistance:*
📞 Mr. Shahanshah: 9450055554
📞 Mr. Firoz Khan: 8299600709
🌐 ${d.websiteURL || 'https://uniquehavenhomesstay.com'}`;
}

// Alias for backwards compatibility
function tplWelcome(d) {
  return tplConfirmation(d);
}

// ═══ 2. REMINDER (Day Before Check-in) ═══
function tplReminder(d) {
  const mapStr = d.mapLink ? `\n📍 *Map:* ${d.mapLink}` : '';

  return `🏨 *THE UNIQUE HAVEN HOMES*
Hi *${d.guestName}*, your stay at *${d.propertyName}* starts tomorrow (${fmtDate(d.checkIn)} at ${d.checkInTime}).

📍 *Address:* ${d.address}${mapStr}
📄 *Reminder:* Please carry Govt IDs (Aadhar/DL/Passport) for all guests.

👤 *Manager:* ${d.manager.name} (${d.manager.phone}) — 10 AM to 10 PM
${d.caretakerBlock}

Full Wi-Fi & access details will be sent 1 hour before check-in.`;
}

// ═══ 3. ARRIVAL DETAILS (1 hr before) ═══
function tplArrival(d) {
  const mapStr = d.mapLink ? `\n📍 *Map:* ${d.mapLink}` : '';

  return `🏨 *THE UNIQUE HAVEN HOMES*
Hi *${d.guestName}*, your stay is ready!

🏠 *${d.propertyName}* (${d.flat})${mapStr}
🔑 *Key:* ${d.keyNo} (${d.lockType} Lock)
🔑 *WiFi Password:* ${d.wifiPass}

👤 *Manager:* ${d.manager.name} (${d.manager.phone}) — 10 AM to 10 PM
${d.caretakerBlock}
${d.vehicle ? '🚗 Parking: ' + d.vehicle + '\n' : ''}
Safe journey & see you soon!`;
}

// ═══ 4. ID REQUEST (Manual) ═══
function tplIdRequest(d) {
  return `🏨 *THE UNIQUE HAVEN HOMES*
Hi *${d.guestName}*,

As per Govt hotel regulations, kindly share photo of Govt ID (Aadhar / DL / Passport) for all staying guests here on WhatsApp.

Takes just 1 minute & ensures quick contactless check-in.
Thank you! 🙏`;
}

// ═══ 5. CHECKOUT REMINDER ═══
function tplCheckout(d) {
  return `🏨 *THE UNIQUE HAVEN HOMES*
Hi *${d.guestName}*, reminder that checkout is today at *${d.checkOutTime}* from *${d.propertyName}*.

• Hand over keys to Caretaker:
${d.caretakerBlock}
• Please check all personal belongings

*Assistance / Queries:*
📞 Mr. Shahanshah: 9450055554
📞 Mr. Firoz Khan: 8299600709

Need an extension? Reply here to check availability.
Thank you for staying with us! 🙏`;
}

// ═══ 6a. GOOGLE REVIEW REQUEST ═══
function tplGoogleReview(d) {
  return `Hi ${d.guestName},

Thank you for staying at *${d.propertyName}*. Hope you had a comfortable time.

If you enjoyed your stay, a 30-second review on *Google* helps our small team a lot.

Review here: ${d.googleReview || 'https://google.com'}

*Planning your next Lucknow trip?*
Book direct on our website — save ${d.discount}% vs Airbnb/Booking.com:
${d.websiteURL}

Save our number — we'd love to host you again.

— Team ${BRAND_NAME}`;
}

// ═══ 6b. AIRBNB REVIEW REQUEST ═══
function tplAirbnbReview(d) {
  return `Hi ${d.guestName},

Thank you for staying at *${d.propertyName}*. Hope you had a wonderful time with us.

If you have a moment, a review on *Airbnb* means a lot for our small team.

Review here: ${d.airbnbReviewLink || 'https://www.airbnb.com/progress/reviews'}

Save our number — we'd love to host you again.

— Team ${BRAND_NAME}`;
}

// ═══ INVESTOR CHECK-IN ALERT — short, no payment breakdown ═══
function tplInvestorAlert(d) {
  return `*Booking Update*

Property: ${d.propertyName} (${d.flat})
Booking: ${d.isAirbnb ? 'Online (Airbnb)' : 'Offline (Direct)'}
Check-in: ${fmtDate(d.checkIn)}, ${d.checkInTime}
Check-out: ${fmtDate(d.checkOut)}, ${d.checkOutTime}
Nights: ${d.nights}
Amount: ₹${d.total.toLocaleString('en-IN')}

— Team ${BRAND_NAME}`;
}

// ═══ SECURITY DEPOSIT RECEIPT (On Collection) ═══
function tplSecurityDepositReceipt(d) {
  const sec = d.securityDeposit || {};
  const amt = (sec.amount || 0).toLocaleString('en-IN');
  return `🛡️ *SECURITY DEPOSIT RECEIPT*
*${BRAND_NAME}*
━━━━━━━━━━━━━━━━━━
Dear *${d.guestName}*,

We have safely received your refundable Security Deposit:
💰 *Deposit Amount:* ₹${amt}
📅 *Date Received:* ${sec.receivedDate || fmtDate(d.checkIn)}
💳 *Payment Mode:* ${sec.mode || 'UPI'}${sec.receivedBy ? '\n👤 *Received By:* ' + sec.receivedBy : ''}${sec.notes ? '\n🔖 *Ref/Note:* ' + sec.notes : ''}

🏠 *Property:* ${d.propertyName} (${d.flat})
🗓️ *Stay Dates:* ${fmtDate(d.checkIn)} ➔ ${fmtDate(d.checkOut)}

ℹ️ *Important Policy:*
• This deposit is fully refundable at check-out after routine property inspection.
• It protects against accidental damages, missing items, or policy violations.
• We ensure a swift & smooth refund upon your departure.

Thank you for choosing ${BRAND_NAME}!
📞 Helpline: ${OWNERS[0].name} (${OWNERS[0].phone})`;
}

// ═══ SECURITY DEPOSIT REFUND & DAMAGE SETTLEMENT ═══
function tplSecurityDepositRefund(d) {
  const sec = d.securityDeposit || {};
  const initial = (sec.amount || 0).toLocaleString('en-IN');
  const deducted = (sec.deductedAmount || 0).toLocaleString('en-IN');
  const netRefund = (sec.refundAmount || 0).toLocaleString('en-IN');
  const hasDeduction = (sec.deductedAmount || 0) > 0;

  return `🛡️ *SECURITY DEPOSIT SETTLEMENT & REFUND*
*${BRAND_NAME}*
━━━━━━━━━━━━━━━━━━
Dear *${d.guestName}*,

Here is the final settlement statement for your Security Deposit:

🏠 *Property:* ${d.propertyName} (${d.flat})
💰 *Initial Security Deposit:* ₹${initial}

${hasDeduction ? `⚠️ *Damage / Penalty Deduction:* -₹${deducted}
📝 *Reason for Deduction:* ${sec.deductionReason || 'Property damage / penalty'}
━━━━━━━━━━━━━━━━━━
💸 *NET REFUND PROCESSED:* ₹${netRefund}` : `✅ *Deduction:* ₹0 (No damage / Property in great condition!)
━━━━━━━━━━━━━━━━━━
💸 *FULL REFUND PROCESSED:* ₹${netRefund}`}

📅 *Refund Date:* ${sec.refundDate || new Date().toISOString().slice(0, 10)}
💳 *Refund Mode:* ${sec.refundMode || 'UPI'}${sec.refundedBy ? '\n👤 *Processed By:* ' + sec.refundedBy : ''}${sec.notes ? '\n🔖 *Reference / UTR:* ' + sec.notes : ''}

It was a pleasure hosting you. We look forward to welcoming you again!
${BRAND_URL}`;
}

// ═══════════════════════════════════════════════════════════
// STAFF GROUP TEMPLATES (Internal)
// ═══════════════════════════════════════════════════════════

// ═══ 7. NEW BOOKING ALERT (Operations / Booking Group) ═══
function tplStaffNewBooking(d) {
  return `🛎️ *NEW BOOKING CONFIRMED*
━━━━━━━━━━━━━━━━━━
🏠 *Property:* ${d.propertyName} (${d.flat})${d.floor ? ' | Flr ' + d.floor : ''}
👤 *Guest:* ${d.guestName}
📞 *Phone:* ${d.phone || '-'}
📅 *Check-in:* ${fmtDate(d.checkIn)} (${d.checkInTime})
📅 *Check-out:* ${fmtDate(d.checkOut)} (${d.checkOutTime})
🌙 *Duration:* ${d.nights} Night${d.nights > 1 ? 's' : ''}
💰 *Total:* ₹${d.total.toLocaleString('en-IN')} | Paid: ₹${d.paid.toLocaleString('en-IN')} | Due: ₹${d.due.toLocaleString('en-IN')}
${d.vehicle ? '🚗 *Vehicle:* ' + d.vehicle + '\n' : ''}━━━━━━━━━━━━━━━━━━
Caretaker: Please prepare property.`;
}

// ═══ 8. CARETAKER CHECK-IN FORM ═══
function tplStaffCheckinForm(d) {
  return `*CHECK-IN UPDATE — Fill & Send*

Booking: ${d.guestName}
Property: ${d.propertyName}

Actual Check-in Time: ____
Total Guests: ____

Vehicle: Yes / No
Vehicle Details: ____

ID Collected: Yes / No
IDs Received: __ / __

Keys Handed: Yes / No
Room Was Clean: Yes / No
Special Requests: ____

— Fill above, then attach ID photos below`;
}

// ═══ 9. PAYMENT UPDATE FORM ═══
function tplStaffPaymentForm(d) {
  return `*PAYMENT RECEIVED — Fill & Send*

Guest: ${d.guestName}
Property: ${d.propertyName}
Booking ID: ${d.bk.booking_id}

Date: ____
Amount: ₹____
Mode: Cash / UPI / Bank

Total Booking: ₹${d.total.toLocaleString('en-IN')}
Paid Till Now: ₹${d.paid.toLocaleString('en-IN')}
Balance Due: ₹${d.due.toLocaleString('en-IN')}

Notes: ____

— Attach payment screenshot below`;
}

// ═══ 10. ID UPLOAD REQUEST (Staff) ═══
function tplStaffIdRequest(d) {
  return `*ID UPLOAD NEEDED*

Booking: ${d.guestName}
Property: ${d.propertyName}
Booking ID: ${d.bk.booking_id}

Required:
• Aadhar / DL / Passport
• Front + Back both sides
• All guests

IDs sending: __ of __

— Attach ID photos below this message`;
}

// ═══════════════════════════════════════════════════════════
// UI FUNCTIONS (Modal + Send)
// ═══════════════════════════════════════════════════════════

async function sendViaBotFromModal(toPhone, guestName) {
  const text = document.getElementById('waMsg')?.value;
  if (!text) return;
  if (typeof window.dispatchWhatsAppMessage !== 'function') {
    window.open(`https://wa.me/${toPhone}?text=${encodeURIComponent(text)}`, '_blank');
    return;
  }
  const res = await window.dispatchWhatsAppMessage({
    to: toPhone,
    isGroup: false,
    text,
    type: 'guest_pass_manual',
    bookingId: window._currentWaBookingId || null,
    guestName: guestName
  });
  if (res.ok) {
    if (window.fsn) fsn.success('Delivered!', res.dry_run ? '🧪 Dry-Run Simulated' : '✅ Dispatched via WhatsApp Gateway');
  } else {
    if (window.fsn) fsn.error('Gateway Error', res.error || 'Opening WhatsApp Web...');
    window.open(`https://wa.me/${toPhone}?text=${encodeURIComponent(text)}`, '_blank');
  }
}
window.sendViaBotFromModal = sendViaBotFromModal;

function showWhatsAppModal(guestName, propertyName, phone, msg) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const fullPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📱 WhatsApp — ${guestName}</h2>
      <p style="color:#666;font-size:12px;margin:0 0 8px;">${propertyName}${phone ? ' · ' + phone : ''}</p>
      <textarea id="waMsg" style="width:100%;height:380px;font-family:monospace;font-size:12px;padding:10px;border:1px solid var(--border);border-radius:8px;">${msg}</textarea>
      <div class="btn-row" style="margin-top:12px;flex-wrap:wrap;gap:8px;">
        ${fullPhone ? `
          <button style="background:#0F172A;color:#fff;font-weight:700;" onclick="sendViaBotFromModal('${fullPhone}','${guestName.replace(/'/g, "\\'")}')">
            ⚡ Send via Bot (Auto)
          </button>
          <button class="secondary" onclick="window.open('https://wa.me/${fullPhone}?text='+encodeURIComponent(document.getElementById('waMsg').value),'_blank')">
            📱 Open in WhatsApp
          </button>
        ` : ''}
        <button class="green-btn" onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.getElementById('waMsg').value),'_blank')">
          📤 Share to Other
        </button>
        <button class="outline" onclick="navigator.clipboard.writeText(document.getElementById('waMsg').value);fsn.success('Copied','Message copied')">
          📋 Copy
        </button>
        <button class="outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ═══ Investor alert modal — supports 1+ investors linked to a property ═══
function showInvestorAlertModal(propertyName, investors, msg, groupLink, groupName) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  const recipients = (investors || []).map(inv => {
    const clean = (inv.phone || '').replace(/[^0-9]/g, '');
    const full = clean.length === 10 ? '91' + clean : clean;
    return `<button class="secondary" style="margin-right:6px;margin-bottom:6px;" onclick="window.open('https://wa.me/${full}?text='+encodeURIComponent(document.getElementById('waMsg').value),'_blank')">
      📱 Send to ${inv.name} — ${inv.phone}
    </button>`;
  }).join('');

  modal.innerHTML = `
    <div class="modal-box" style="max-width:600px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📱 Investor Alert</h2>
      <p style="color:#666;font-size:12px;margin:0 0 8px;">${propertyName}</p>
      ${!investors || investors.length === 0 ? '<div class="error" style="margin-bottom:10px;">⚠️ No investor with a phone number is linked to this property. Add one in Investors → Edit.</div>' : ''}
      <textarea id="waMsg" style="width:100%;height:200px;font-family:monospace;font-size:12px;padding:10px;border:1px solid var(--border);border-radius:8px;">${msg}</textarea>
      <div class="btn-row" style="margin-top:12px;flex-wrap:wrap;">
        ${groupLink ? `<button style="background:#128C7E;color:#fff;font-weight:700;padding:10px 16px;font-size:14px;" onclick="
          const msg = document.getElementById('waMsg').value;
          navigator.clipboard.writeText(msg).then(function() {
            const helpBox = document.createElement('div');
            helpBox.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center;color:#fff;';
            helpBox.innerHTML = '<div style=\\'font-size:60px;margin-bottom:20px;\\'>📱</div>' +
              '<h2 style=\\'color:#25D366;margin-bottom:20px;\\'>Message Copied! ✅</h2>' +
              '<div style=\\'background:#128C7E;padding:20px;border-radius:12px;max-width:400px;margin-bottom:20px;\\'>' +
                '<div style=\\'font-size:14px;line-height:1.8;\\'>' +
                  '<strong>Group opening in 3 seconds...</strong><br><br>' +
                  '📝 <strong>Steps:</strong><br>' +
                  '1️⃣ Group chat khulega<br>' +
                  '2️⃣ Message box <strong>long-press</strong> karo<br>' +
                  '3️⃣ <strong>Paste</strong> select karo<br>' +
                  '4️⃣ <strong>Send</strong> button (➤) dabao<br><br>' +
                  '<div style=\\'background:#075E54;padding:8px;border-radius:6px;font-size:12px;\\'>💡 Total: 3 taps</div>' +
                '</div>' +
              '</div>' +
              '<button onclick=\\'this.parentElement.remove()\\' style=\\'background:#fff;color:#000;padding:10px 30px;border:none;border-radius:8px;font-weight:700;cursor:pointer;\\'>Close</button>';
            document.body.appendChild(helpBox);
            setTimeout(function() {
              window.open('${groupLink}', '_blank');
              setTimeout(function() { helpBox.remove(); }, 5000);
            }, 3000);
          });
        ">📢 Send to Group (${groupName || 'Property Group'})</button>` : '<button disabled style="background:#ccc;color:#666;cursor:not-allowed;padding:10px 16px;" title="Add WhatsApp group link in Property Edit">📢 No Group Link (add in Property Edit)</button>'}
      ${recipients}
        <button class="outline" onclick="navigator.clipboard.writeText(document.getElementById('waMsg').value);fsn.success('Copied','Message copied')">
          📋 Copy
        </button>
        <button class="outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ═══════════════════════════════════════════════════════════
// EXPOSED FUNCTIONS (Called from bookings.js buttons)
// ═══════════════════════════════════════════════════════════

async function shareBookingWhatsApp(bkId) {
  const d = await buildMessageData(bkId);
  if (!d) { fsn.error('Error', 'Booking not found'); return; }
  showWhatsAppModal(d.guestName, d.propertyName, d.phone, tplConfirmation(d));
}

async function sendBookingConfirmation(bkId) {
  const d = await buildMessageData(bkId);
  if (!d) { fsn.error('Error', 'Booking not found'); return; }
  showWhatsAppModal(d.guestName, d.propertyName, d.phone, tplConfirmation(d));
}

async function sendWelcomePass(bkId) {
  const d = await buildMessageData(bkId);
  if (!d) { fsn.error('Error', 'Booking not found'); return; }
  showWhatsAppModal(d.guestName, d.propertyName, d.phone, tplWelcome(d));
}

async function sendArrivalDetails(bkId) {
  const d = await buildMessageData(bkId);
  if (!d) { fsn.error('Error', 'Booking not found'); return; }
  showWhatsAppModal(d.guestName, d.propertyName, d.phone, tplArrival(d));
}

async function sendCheckoutReminder(bkId) {
  const d = await buildMessageData(bkId);
  if (!d) { fsn.error('Error', 'Booking not found'); return; }
  showWhatsAppModal(d.guestName, d.propertyName, d.phone, tplCheckout(d));
}

async function requestGoogleReview(bkId) {
  const d = await buildMessageData(bkId);
  if (!d) { fsn.error('Error', 'Booking not found'); return; }
  showWhatsAppModal(d.guestName, d.propertyName, d.phone, tplGoogleReview(d));
}

async function requestAirbnbReview(bkId) {
  const d = await buildMessageData(bkId);
  if (!d) { fsn.error('Error', 'Booking not found'); return; }
  showWhatsAppModal(d.guestName, d.propertyName, d.phone, tplAirbnbReview(d));
}

async function sendBookingFormat(bkId) {
  const d = await buildMessageData(bkId);
  if (!d) { fsn.error('Error', 'Booking not found'); return; }
  showWhatsAppModal('Staff Group', d.propertyName, '', tplStaffNewBooking(d));
}

async function sendInvestorAlert(bkId) {
  const d = await buildMessageData(bkId);
  if (!d) { fsn.error('Error', 'Booking not found'); return; }
  showInvestorAlertModal(d.propertyName, d.investors, tplInvestorAlert(d), d.room?.whatsapp_group_link || "", d.room?.whatsapp_group_name || "");
}

// ═══ Single WhatsApp menu — all message types in one place ═══
window.showWATemplatesMenu = function(bkId, btn) {
  window._currentWaBookingId = bkId;
  const waStat = (typeof window.getBookingWhatsAppStatus === 'function') ? window.getBookingWhatsAppStatus(bkId) : null;
  const menu = document.createElement('div');
  menu.className = 'modal-overlay';
  menu.onclick = e => { if (e.target === menu) menu.remove(); };
  menu.innerHTML = `
    <div class="modal-box" style="max-width:420px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2 style="margin:0 0 4px 0;">💬 WhatsApp Dispatcher</h2>
      <p style="color:#666;font-size:12px;margin:0 0 12px 0;">Send passes, alerts or reminders directly to this guest</p>

      ${waStat ? `
        <div style="background:${waStat.status === 'sent' ? '#F0FDF4' : (waStat.status === 'failed' ? '#FEF2F2' : '#FFFBEB')};border:1px solid ${waStat.status === 'sent' ? '#86EFAC' : (waStat.status === 'failed' ? '#F87171' : '#FDE68A')};border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;">
          ${waStat.status === 'sent' 
            ? `<b style="color:#15803D;">✅ Last Dispatched:</b> <span style="color:#166534;">Delivered (${waStat.type || 'Pass'}) on ${new Date(waStat.time).toLocaleDateString('en-IN', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>`
            : (waStat.status === 'failed'
              ? `<b style="color:#991B1B;">❌ Previous Failed:</b> <span style="color:#7F1D1D;">${waStat.error || 'Check WhatsApp Bot connection'}</span>`
              : `<b style="color:#92400E;">🧪 Dry Run:</b> <span style="color:#78350F;">Simulated on ${new Date(waStat.time).toLocaleDateString('en-IN', {day:'numeric',month:'short'})}</span>`)}
        </div>
      ` : `
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:12px;color:#64748B;">
          ℹ️ No automated WhatsApp messages logged yet for this booking.
        </div>
      `}

      <div style="margin-top:12px;">
        <div style="font-size:11px;color:#888;text-transform:uppercase;margin:10px 0 6px;font-weight:700;">👤 Guest Communications</div>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;font-weight:700;background:#F0FDF4;color:#15803D;border-color:#86EFAC;" onclick="this.closest('.modal-overlay').remove();sendBookingConfirmation('${bkId}')">🎉 Booking Confirmation &amp; Check-in Pass</button>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;font-weight:600;" onclick="this.closest('.modal-overlay').remove();sendCheckoutReminder('${bkId}')">👋 11:00 AM Checkout Reminder</button>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;background:#F0F9FF;color:#0284C7;border-color:#BAE6FD;" onclick="this.closest('.modal-overlay').remove();sendSecurityDepositReceipt('${bkId}')">🛡️ Security Deposit Receipt (Collected)</button>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;background:#FAF5FF;color:#7C3AED;border-color:#DDD6FE;" onclick="this.closest('.modal-overlay').remove();sendSecurityDepositRefund('${bkId}')">💸 Security Deposit Refund &amp; Damage Slip</button>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="this.closest('.modal-overlay').remove();requestGoogleReview('${bkId}')">⭐ Google Review Request</button>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="this.closest('.modal-overlay').remove();requestAirbnbReview('${bkId}')">⭐ Airbnb Review Form Link</button>

        <div style="font-size:11px;color:#888;text-transform:uppercase;margin:14px 0 6px;font-weight:700;">👥 Internal Alerts</div>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="this.closest('.modal-overlay').remove();sendBookingFormat('${bkId}')">📋 Booking Data Group Alert</button>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="this.closest('.modal-overlay').remove();sendInvestorAlert('${bkId}')">💼 Investor Group Statement</button>
      </div>
    </div>`;
  document.body.appendChild(menu);
};

// ═══ Security Deposit WhatsApp Send Triggers ═══
async function sendSecurityDepositReceipt(bkId) {
  const d = await buildMessageData(bkId);
  if (!d) return;
  if (typeof window.getSecurityDeposit === 'function') {
    d.securityDeposit = window.getSecurityDeposit(d.bk);
  }
  showWhatsAppModal(d.guestName, d.phone, d.propertyName, tplSecurityDepositReceipt(d));
}

async function sendSecurityDepositRefund(bkId) {
  const d = await buildMessageData(bkId);
  if (!d) return;
  if (typeof window.getSecurityDeposit === 'function') {
    d.securityDeposit = window.getSecurityDeposit(d.bk);
  }
  showWhatsAppModal(d.guestName, d.phone, d.propertyName, tplSecurityDepositRefund(d));
}


// Expose all
window.shareBookingWhatsApp = shareBookingWhatsApp;
window.sendBookingConfirmation = sendBookingConfirmation;
window.sendWelcomePass = sendWelcomePass;
window.sendArrivalDetails = sendArrivalDetails;
window.sendCheckoutReminder = sendCheckoutReminder;
window.requestGoogleReview = requestGoogleReview;
window.requestAirbnbReview = requestAirbnbReview;
window.sendSecurityDepositReceipt = sendSecurityDepositReceipt;
window.sendSecurityDepositRefund = sendSecurityDepositRefund;
window.sendBookingFormat = sendBookingFormat;
window.sendInvestorAlert = sendInvestorAlert;
window.buildMessageData = buildMessageData;
window.tplConfirmation = tplConfirmation;
