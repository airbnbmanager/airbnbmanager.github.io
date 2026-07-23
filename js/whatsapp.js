/**
 * WhatsApp Module
 * UNIQUE HAVEN HOMES STAY
 */

// ============ HELPER: Property Contacts (Shift-Based) ============
async function getPropertyContactsForRoom(roomId, roomData = {}) {
  const cleanPhone = p => (p || '').replace(/[^0-9]/g, '');
  const seenNames = new Set();
  const lines = [];

  const addLine = (label, name, phone) => {
    const nm = (name || '').trim();
    if (!nm || nm.toLowerCase() === 'pending' || seenNames.has(nm.toLowerCase())) return;
    seenNames.add(nm.toLowerCase());
    const ph = cleanPhone(phone);
    lines.push("📞 *" + label + ":* " + nm + (ph ? ' — +91 ' + ph : ''));
  };

  // Step 1: property_shifts table se shift-based contacts
  const { data: shifts } = await sb.from('property_shifts')
    .select('emp_id, shift_type, shift_start, shift_end, contact_role')
    .eq('room_id', roomId)
    .eq('is_active', true);

  if (shifts && shifts.length > 0) {
    const empIds = [...new Set(shifts.map(s => s.emp_id))];
    const { data: emps } = await sb.from('employees')
      .select('emp_id, name, phone')
      .in('emp_id', empIds);

    const empMap = {};
    (emps || []).forEach(e => { empMap[e.emp_id] = e; });

    // Group by shift
    const dayShifts = shifts.filter(s => s.shift_type === 'Day');
    const nightShifts = shifts.filter(s => s.shift_type === 'Night');

    const hasMultipleShifts = dayShifts.length > 0 && nightShifts.length > 0;

    if (hasMultipleShifts) {
      // Day shift contacts
      if (dayShifts.length > 0) {
        const dayStart = dayShifts[0]?.shift_start || '8 AM';
        const dayEnd = dayShifts[0]?.shift_end || '8 PM';
        lines.push('');
        lines.push('☀️ *Day Shift (' + dayStart + ' - ' + dayEnd + '):*');
        dayShifts.forEach(s => {
          const e = empMap[s.emp_id];
          if (e) addLine(s.contact_role || 'Caretaker', e.name, e.phone);
        });
      }

      // Night shift contacts
      if (nightShifts.length > 0) {
        const nightStart = nightShifts[0]?.shift_start || '8 PM';
        const nightEnd = nightShifts[0]?.shift_end || '8 AM';
        seenNames.clear();
        lines.push('');
        lines.push('🌙 *Night Shift (' + nightStart + ' - ' + nightEnd + '):*');
        nightShifts.forEach(s => {
          const e = empMap[s.emp_id];
          if (e) addLine(s.contact_role || 'Caretaker', e.name, e.phone);
        });
      }
    } else {
      // Single shift — show all contacts flat
      shifts.forEach(s => {
        const e = empMap[s.emp_id];
        if (e) addLine(s.contact_role || 'Caretaker', e.name, e.phone);
      });
    }

    return lines.filter(l => l !== undefined);
  }

  // Step 2: Fallback to rooms table emp_id
  let r = roomData || {};
  if (!r.caretaker_emp_id && !r.checkin_manager_emp_id) {
    const { data: room } = await sb.from('rooms')
      .select('caretaker_emp_id, checkin_manager_emp_id, caretaker_name, caretaker_phone, checkin_manager')
      .eq('room_id', roomId).single();
    if (room) r = { ...r, ...room };
  }

  const ids = [r.caretaker_emp_id, r.checkin_manager_emp_id].filter(Boolean);
  if (ids.length) {
    const { data: emps } = await sb.from('employees')
      .select('emp_id, name, phone').in('emp_id', ids);
    const empMap = {};
    (emps || []).forEach(e => { empMap[e.emp_id] = e; });

    if (r.caretaker_emp_id && r.checkin_manager_emp_id && r.caretaker_emp_id === r.checkin_manager_emp_id) {
      const e = empMap[r.caretaker_emp_id];
      if (e) addLine('Caretaker / Manager', e.name, e.phone);
    } else {
      if (empMap[r.caretaker_emp_id]) addLine('Caretaker', empMap[r.caretaker_emp_id].name, empMap[r.caretaker_emp_id].phone);
      if (empMap[r.checkin_manager_emp_id]) addLine('Manager', empMap[r.checkin_manager_emp_id].name, empMap[r.checkin_manager_emp_id].phone);
    }
  }

  // Step 3: Legacy text fallback
  if (!lines.length) {
    addLine('Caretaker', r.caretaker_name || '', r.caretaker_phone || '');
    addLine('Manager', r.checkin_manager || '', '');
  }

  return lines.filter(l => l !== undefined);
}

// ============ BOOKING WELCOME MESSAGE ============
async function shareBookingWhatsApp(bkId) {
  const { data: b } = await sb.from('guest_register')
    .select('*, rooms(room_id, unit_no, nickname, property_name, checkin_manager, checkin_manager_emp_id, caretaker_name, caretaker_phone, caretaker_emp_id, map_link, address, directions, landmarks, floor_info, building_name)')
    .eq('booking_id', bkId).single();
  if (!b) { alert('Not found'); return; }

  const r = b.rooms || {};
  const roomId = r.room_id || b.room_id;

  const guestName    = b.guest_name || 'Guest';
  const propertyName = r.nickname || r.unit_no || 'Property';
  const building     = r.building_name || '';
  const address      = r.address || '';
  const floorInfo    = r.floor_info || '';
  const mapLink      = r.map_link || '';
  const directions   = r.directions || '';
  const landmarks    = r.landmarks || '';
  const checkIn      = b.check_in || 'N/A';
  const checkOut     = b.check_out || 'N/A';
  const checkInTime  = b.check_in_time || '2:00 PM';
  const checkOutTime = b.check_out_time || '11:00 AM';

  const contactLines = await getPropertyContactsForRoom(roomId, r);

  const msg = [
    `Hii ${guestName}! 👋`,
    `Welcome to *${BRAND}*!`,
    `Thank you for booking your stay with us. 😊`,
    ``,
    `🏡 *Property:* ${propertyName}`,
    building   ? `🏢 ${building}`            : '',
    address    ? `📍 *Address:* ${address}`  : '',
    floorInfo  ? `🏠 ${floorInfo}`           : '',
    mapLink    ? `📌 *Location:* ${mapLink}` : '',
    ``,
    directions ? `🗺️ *How to Reach:*\n${directions}` : '',
    landmarks  ? `📍 *Nearby:* ${landmarks}` : '',
    ``,
    `⏰ *Timings:*`,
    `▫️ Check-in: ${checkIn} at ${checkInTime}`,
    `▫️ Check-out: ${checkOut} at ${checkOutTime}`,
    ``,
    `📋 *Check-in Instructions:*`,
    `Our caretaker will assist you with the check-in and show you around the place.`,
    ...contactLines,
    ``,
    `If caretaker is not reachable, contact:`,
    `📞 Mr Shahanshah — 9450055554`,
    `📞 Mr Firoz Khan — 8299600709`,
    ``,
    `⚠️ *House Rules:*`,
    `• No loud music after 11 PM`,
    `• Park your car where caretaker instructs`,
    `• No wild parties or disruptive gatherings`,
    `• Early check-in / late check-out subject to availability`,
    `• Government ID required at check-in`,
    `• We want to keep the neighbourhood peaceful for everyone`,
    ``,
    `Need anything? Message us anytime!`,
    `Happy to help whenever you need. 😊`,
    ``,
    `— Team *${BRAND}*`,
    `🌐 uniquehavenhomesstay.com`
  ].filter(v => v !== false && v !== null && v !== undefined && v !== '').join('\n');

  showWhatsAppModal(guestName, propertyName, b.phone, msg);
}

// ============ CHECKOUT REMINDER ============
async function sendCheckoutReminder(bkId) {
  const { data: b } = await sb.from('guest_register')
    .select('*, rooms(room_id, unit_no, nickname, checkin_manager, checkin_manager_emp_id, caretaker_name, caretaker_phone, caretaker_emp_id)')
    .eq('booking_id', bkId).single();
  if (!b) { alert('Not found'); return; }

  const r = b.rooms || {};
  const roomId = r.room_id || b.room_id;

  const guestName    = b.guest_name || 'Guest';
  const propertyName = r.nickname || r.unit_no || 'Property';
  const checkOut     = b.check_out || '';
  const checkOutTime = b.check_out_time || '11:00 AM';

  const contactLines = await getPropertyContactsForRoom(roomId, r);

  const msg = [
    `Hi ${guestName}, hope you had a great stay! 😊`,
    ``,
    `Checkout time is *${checkOutTime}* on *${checkOut}*.`,
    ``,
    `A few things before you go:`,
    `🔑 Hand over the keys to our caretaker`,
    `🚪 Ensure all doors & windows are secured`,
    `👜 Check for any personal belongings`,
    b.has_vehicle ? `🚗 Please clear the parking area` : '',
    ``,
    contactLines.length ? `Your contact for any help:` : '',
    ...contactLines,
    ``,
    `Let me know if there's anything I can do for you before you go.`,
    ``,
    `If you'd like to *extend your stay*, just say the word — we'll check availability! 😊`,
    ``,
    `For any other assistance:`,
    `📞 Mr Shahanshah — 9450055554`,
    `📞 Mr Firoz Khan — 8299600709`,
    ``,
    `Thank you for choosing *${BRAND}*!`,
    `We hope to welcome you back soon. 🙏`,
    ``,
    `— Team *${BRAND}*`,
    `🌐 uniquehavenhomesstay.com`
  ].filter(v => v !== false && v !== null && v !== undefined && v !== '').join('\n');

  showWhatsAppModal(guestName, propertyName, b.phone, msg);
}

// ============ WHATSAPP MODAL ============
function showWhatsAppModal(guestName, propertyName, phone, msg) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const fullPhone  = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📱 WhatsApp Message</h2>
      <div class="sub">Guest: ${guestName} · ${propertyName}</div>
      <textarea id="waMsg" style="min-height:250px;font-size:12px;line-height:1.5;">${msg}</textarea>
      <div class="btn-row" style="margin-top:10px;">
        <button onclick="
          navigator.clipboard.writeText(document.getElementById('waMsg').value)
            .then(() => alert('📋 Message copied!'))
            .catch(() => {
              const t = document.getElementById('waMsg');
              t.select();
              document.execCommand('copy');
              alert('📋 Copied!');
            });
        ">📋 Copy</button>
        <button class="green-btn" onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.getElementById('waMsg').value),'_blank')">
          📱 WhatsApp
        </button>
        ${fullPhone ? `
          <button class="secondary" onclick="window.open('https://wa.me/${fullPhone}?text='+encodeURIComponent(document.getElementById('waMsg').value),'_blank')">
            📱 Direct ${phone || ''}
          </button>
        ` : ''}
        <button class="outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}
