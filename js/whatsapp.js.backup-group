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
const BRAND_NAME = 'The Unique Haven Homes Stay';

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

  // Fetch staff for this property (assigned_rooms contains roomId)
  const { data: allStaff } = await sb.from('employees')
    .select('name, phone, shift, whatsapp_display_role, assigned_rooms')
    .eq('in_whatsapp_template', true);

  const propertyStaff = (allStaff || []).filter(e => {
    const rooms = (e.assigned_rooms || '').split(',').map(r => r.trim());
    return rooms.includes(roomId);
  });

  const dayStaff = propertyStaff.filter(e => e.shift === 'day' && e.phone);
  const nightStaff = propertyStaff.filter(e => e.shift === 'night' && e.phone);

  // Clean phone (remove spaces)
  const cleanPhone = p => (p || '').replace(/\s+/g, '');

  // Calculate paid + due
  const { data: pays } = await sb.from('payment_history')
    .select('amount').eq('booking_id', bkId).neq('verification_status', 'rejected');
  const totalPaid = (pays || []).reduce((s, p) => s + (p.amount || 0), 0);
  const totalDue = Math.max(0, (bk.total_amount || 0) - totalPaid);
  const nights = calcNights(bk.check_in, bk.check_out);

  // Fetch investor(s) linked to this property — for the Investor Alert template
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
    address: room.address || 'Vikalp Khand, Gomtinagar, Chinhat, Lucknow',
    mapLink: room.map_link || '',
    propertyURL: window.getPropertyURL(room.nickname),
    wifi: room.wifi_ssid || 'Ask caretaker',
    wifiPass: room.wifi_password || 'Ask caretaker',
    keyNo: room.key_number || 'Ask caretaker',
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
    dayStaff: dayStaff.map(s => ({ name: s.name, phone: cleanPhone(s.phone), role: s.whatsapp_display_role || 'Caretaker' })),
    nightStaff: nightStaff.map(s => ({ name: s.name, phone: cleanPhone(s.phone), role: s.whatsapp_display_role || 'Caretaker' })),
    owners: OWNERS,
    investors,
    websiteURL: config.website_url || BRAND_URL,
    googleReview: config.google_review_url || '',
    airbnbReview: config.airbnb_host_url || '',
    isAirbnb: bk.booking_mode === 'Online-Airbnb',
    discount: config.discount_percent || 15
  };
}

// ═══ Format contact list block ═══
function fmtContacts(d) {
  let out = '';
  if (d.dayStaff.length > 0) {
    out += '*Day (8 AM – 8 PM)*\n';
    d.dayStaff.forEach(s => {
      out += s.role + ': ' + s.name + ' — ' + s.phone + '\n';
    });
  }
  if (d.nightStaff.length > 0) {
    out += '\n*Night (8 PM – 8 AM)*\n';
    d.nightStaff.forEach(s => {
      out += s.role + ': ' + s.name + ' — ' + s.phone + '\n';
    });
  }
  out += '\n*Escalation*\n';
  d.owners.forEach(o => {
    out += o.name + ' — ' + o.phone + '\n';
  });
  return out.trim();
}

function fmtDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch(e) { return d; }
}

// ═══════════════════════════════════════════════════════════
// TEMPLATES (10 total — polished, short, marketing focus)
// ═══════════════════════════════════════════════════════════

// ═══ 1. WELCOME (New Booking) ═══
function tplWelcome(d) {
  const caretaker = d.dayStaff.find(s => /caretaker/i.test(s.role)) || d.dayStaff[0];
  const manager = d.dayStaff.find(s => /manager/i.test(s.role));

  let contactLines = '';
  if (caretaker) contactLines += `📞 ${caretaker.phone} ${caretaker.name} (Caretaker)\n`;
  if (manager) contactLines += `${manager.phone} ${manager.name} (Manager)\n`;

  return `Hii ${d.guestName} welcome to Unique Haven Home stay
Thank you for booking your stay with us

📍 Property Address:
${d.address}
Flat No ${d.flat}${d.floor ? ' ' + d.floor + ' floor' : ''}
${d.mapLink ? '📌Location pin:\n' + d.mapLink : ''}

Timings:
Check-in: ${fmtDate(d.checkIn)}, at ${d.checkInTime}
Check-out: ${fmtDate(d.checkOut)}, at ${d.checkOutTime}

Check In Instructions:
Our caretaker will assist you with the check-in and show you around the place:
${contactLines.trim()}

House rules
• No loud music after 11 PM
•Early check in/late check out subject to Availability
• No wild parties or disruptive gatherings
We want to keep the neighbourhood peaceful for everyone.

Contact
If you need anything, message me anytime or call directly
📞${d.owners[0]?.name || 'Mr Shahansha'} ${d.owners[0]?.phone || '9450055554'}
📞${d.owners[1]?.name || 'Mr Firoz khan'} ${d.owners[1]?.phone || '8299600709'}
Happy to help whenever you need.`;
}

// ═══ 2. REMINDER (Day Before Check-in) ═══
function tplReminder(d) {
  return `Hi ${d.guestName},

Your stay at *${d.propertyName}* begins tomorrow, ${fmtDate(d.checkIn)} at ${d.checkInTime}.

Please carry Government ID (Aadhar / DL / Passport) for all guests.

Address: ${d.address}
${d.mapLink ? 'Map: ' + d.mapLink : ''}

Arrival contact: ${d.dayStaff[0]?.name || 'Caretaker'} — ${d.dayStaff[0]?.phone || d.owners[0].phone}

Full arrival details (WiFi, key) will be shared 1 hour before check-in.

— Team ${BRAND_NAME}
${d.websiteURL}`;
}

// ═══ 3. ARRIVAL DETAILS (1 hr before) ═══
function tplArrival(d) {
  return `Hi ${d.guestName},

Your flat is ready. Details below.

*${d.propertyName}*
${d.address}${d.floor ? '\nFloor: ' + d.floor : ''}
${d.mapLink ? 'Map: ' + d.mapLink : ''}

*Access*
Lock: ${d.lockType}
Key: *${d.keyNo}*

*WiFi*
Network: *${d.wifi}*
Password: *${d.wifiPass}*

${fmtContacts(d)}

${d.vehicle ? 'Parking assistance available — inform caretaker (' + d.vehicle + ').\n\n' : ''}Safe journey. See you soon.

— Team ${BRAND_NAME}`;
}

// ═══ 4. ID REQUEST (Manual) ═══
function tplIdRequest(d) {
  return `Hi ${d.guestName},

Government requires ID verification for all hotel guests.

Please share on WhatsApp:
• Front + back photo of Aadhar / DL / Passport
• One ID per guest

Takes 2 minutes. Data stored securely, used only for legal compliance.

Thank you for cooperation.

— Team ${BRAND_NAME}`;
}

// ═══ 5. CHECKOUT REMINDER ═══
function tplCheckout(d) {
  return `Hi ${d.guestName},

Gentle reminder — checkout is at *${d.checkOutTime}* today from *${d.propertyName}*.

Before leaving:
• Hand keys to caretaker
• Lock all doors and windows
• Check personal belongings

Want to *extend*? Reply here — we'll check availability.

${fmtContacts(d)}

Thank you for staying with us.

— Team ${BRAND_NAME}`;
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

// ═══ 6b. AIRBNB REVIEW REQUEST — manual only, send when guest was genuinely happy ═══
function tplAirbnbReview(d) {
  return `Hi ${d.guestName},

Thank you for staying at *${d.propertyName}*. Hope you had a wonderful time with us.

If you have a moment, a review on *Airbnb* means a lot for our small team.

Review here: ${d.airbnbReview || 'https://www.airbnb.com'}

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

// ═══════════════════════════════════════════════════════════
// STAFF GROUP TEMPLATES (Internal)
// ═══════════════════════════════════════════════════════════

// ═══ 7. NEW BOOKING ALERT (Staff Group) ═══
function tplStaffNewBooking(d) {
  return `*NEW BOOKING*

Guest: ${d.guestName}
Phone: ${d.phone || '-'}
Property: ${d.propertyName} (${d.flat})${d.floor ? ' | Floor: ' + d.floor : ''}
Check-in: ${fmtDate(d.checkIn)}, ${d.checkInTime}
Check-out: ${fmtDate(d.checkOut)}, ${d.checkOutTime}
Nights: ${d.nights}
Total: ₹${d.total.toLocaleString('en-IN')} | Paid: ₹${d.paid.toLocaleString('en-IN')} | Due: ₹${d.due.toLocaleString('en-IN')}
${d.vehicle ? 'Vehicle: ' + d.vehicle + '\n' : ''}
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
      <textarea id="waMsg" style="width:100%;height:400px;font-family:monospace;font-size:12px;padding:10px;border:1px solid var(--border);border-radius:8px;">${msg}</textarea>
      <div class="btn-row" style="margin-top:12px;flex-wrap:wrap;">
        <button class="green-btn" onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.getElementById('waMsg').value),'_blank')">
          📤 Share (any contact)
        </button>
        ${phone ? `<button class="secondary" onclick="window.open('https://wa.me/${fullPhone}?text='+encodeURIComponent(document.getElementById('waMsg').value),'_blank')">
          📱 Send to ${phone}
        </button>` : ''}
        <button class="outline" onclick="navigator.clipboard.writeText(document.getElementById('waMsg').value);fsn.success('Copied','Message copied')">
          📋 Copy
        </button>
        <button class="outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// ═══ Investor alert modal — supports 1+ investors linked to a property ═══
function showInvestorAlertModal(propertyName, investors, msg) {
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
  showInvestorAlertModal(d.propertyName, d.investors, tplInvestorAlert(d));
}

// ═══ Single WhatsApp menu — all message types in one place ═══
window.showWATemplatesMenu = function(bkId, btn) {
  const menu = document.createElement('div');
  menu.className = 'modal-overlay';
  menu.onclick = e => { if (e.target === menu) menu.remove(); };
  menu.innerHTML = `
    <div class="modal-box" style="max-width:400px;">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>💬 WhatsApp Messages</h2>
      <p style="color:#666;font-size:12px;">Choose message to send</p>

      <div style="margin-top:16px;">
        <div style="font-size:11px;color:#888;text-transform:uppercase;margin:12px 0 6px;">👥 Internal</div>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="this.closest('.modal-overlay').remove();sendBookingFormat('${bkId}')">📋 New Booking Alert (Staff)</button>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="this.closest('.modal-overlay').remove();sendInvestorAlert('${bkId}')">💼 Investor Alert</button>

        <div style="font-size:11px;color:#888;text-transform:uppercase;margin:16px 0 6px;">👤 To Guest</div>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="this.closest('.modal-overlay').remove();shareBookingWhatsApp('${bkId}')">📱 Welcome / Confirmation</button>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="this.closest('.modal-overlay').remove();sendArrivalDetails('${bkId}')">🔑 Arrival Details (WiFi, Keys)</button>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="this.closest('.modal-overlay').remove();sendCheckoutReminder('${bkId}')">🔔 Checkout Reminder</button>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="this.closest('.modal-overlay').remove();requestGoogleReview('${bkId}')">⭐ Google Review Request</button>
        <button class="outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="this.closest('.modal-overlay').remove();requestAirbnbReview('${bkId}')">⭐ Airbnb Review Request <small style="color:#888;">(only if guest was happy)</small></button>
      </div>
    </div>`;
  document.body.appendChild(menu);
};

// Expose all
window.shareBookingWhatsApp = shareBookingWhatsApp;
window.sendArrivalDetails = sendArrivalDetails;
window.sendCheckoutReminder = sendCheckoutReminder;
window.requestGoogleReview = requestGoogleReview;
window.requestAirbnbReview = requestAirbnbReview;
window.sendBookingFormat = sendBookingFormat;
window.sendInvestorAlert = sendInvestorAlert;
window.buildMessageData = buildMessageData;
