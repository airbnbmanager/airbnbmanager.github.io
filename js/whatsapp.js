/**
 * WhatsApp Module
 * UNIQUE HAVEN HOMES STAY
 */

async function shareBookingWhatsApp(bkId) {
  const {data:b} = await sb.from('guest_register')
    .select('*, rooms(unit_no, nickname, property_name, checkin_manager, caretaker_name, caretaker_phone, map_link, address, directions, landmarks, floor_info, building_name)')
    .eq('booking_id',bkId).single();
  if (!b) { alert('Not found'); return; }

  const r = b.rooms || {};
  const guestName = b.guest_name || 'Guest';
  const propertyName = r.nickname || r.unit_no || 'Property';
  const building = r.building_name || '';
  const address = r.address || '';
  const floorInfo = r.floor_info || '';
  const mapLink = r.map_link || '';
  const directions = r.directions || '';
  const landmarks = r.landmarks || '';
  const caretaker = r.caretaker_name || r.checkin_manager || '';
  const caretakerPhone = r.caretaker_phone || '';
  const checkInTime = b.check_in_time || '2:00 PM';
  const checkOutTime = b.check_out_time || '11:00 AM';

  const msg = [
    `Hii ${guestName}, welcome to ${BRAND}!`,
    `Thank you for booking your stay with us.`,
    ``,
    `📍 *Property:* ${propertyName}`,
    building ? `🏢 *Building:* ${building}` : '',
    address ? `📍 *Address:* ${address}` : '',
    floorInfo ? `🏠 ${floorInfo}` : '',
    mapLink ? `📌 *Location Pin:* ${mapLink}` : '',
    ``,
    directions ? `🗺️ *Directions:*\n${directions}` : '',
    landmarks ? `📍 *Nearby:* ${landmarks}` : '',
    ``,
    `⏰ *Timings:*`,
    `Check-in: ${b.check_in || 'N/A'} at ${checkInTime}`,
    `Check-out: ${b.check_out || 'N/A'} at ${checkOutTime}`,
    ``,
    `📋 *Check-in Instructions:*`,
    `Our caretaker will assist you with the check-in and show you around the place.`,
    caretaker ? `📞 *Caretaker:* ${caretaker}${caretakerPhone ? ' — +91 ' + caretakerPhone : ''}` : '',
    ``,
    `If you need anything or caretaker is not reachable, contact:`,
    ``,
    `⚠️ *House Rules:*`,
    `• No loud music after 11 PM`,
    `• Park where caretaker instructs`,
    `• No wild parties`,
    `• Early check-in / late check-out subject to availability`,
    `• Government ID required at check-in`,
    ``,
    `📞 *Contact:*`,
    `Mr Shahanshah: 9450055554`,
    `Mr Firoz Khan: 8299600709`,
    ``,
    `Happy to help whenever you need! 😊`,
    `— ${BRAND}`
  ].filter(Boolean).join('\n');

  // Show modal with copy + share
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
      <h2>📱 WhatsApp Message</h2>
      <div class="sub">Guest: ${guestName} · ${propertyName}</div>
      <textarea id="waMsg" style="min-height:250px;font-size:12px;line-height:1.5;">${msg}</textarea>
      <div class="btn-row" style="margin-top:10px;">
        <button onclick="navigator.clipboard.writeText(document.getElementById('waMsg').value);alert('📋 Copied!')">📋 Copy</button>
        <button class="green-btn" onclick="window.open('https://wa.me/?text='+encodeURIComponent(document.getElementById('waMsg').value),'_blank')">📱 WhatsApp</button>
        ${b.phone ? `<button class="secondary" onclick="window.open('https://wa.me/91${b.phone}?text='+encodeURIComponent(document.getElementById('waMsg').value),'_blank')">📱 Direct to ${b.phone}</button>` : ''}
        <button class="outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}