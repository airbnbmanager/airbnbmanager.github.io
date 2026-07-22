/**
 * WhatsApp Module
 * UNIQUE HAVEN HOMES STAY
 */

// ============ BOOKING WELCOME MESSAGE ============
async function shareBookingWhatsApp(bkId) {
  const {data:b} = await sb.from('guest_register')
    .select('*, rooms(unit_no, nickname, property_name, checkin_manager, caretaker_name, caretaker_phone, map_link, address, directions, landmarks, floor_info, building_name)')
    .eq('booking_id', bkId).single();
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
  const checkIn = b.check_in || 'N/A';
  const checkOut = b.check_out || 'N/A';
  const checkInTime = b.check_in_time || '2:00 PM';
  const checkOutTime = b.check_out_time || '11:00 AM';

  const msg = [
    `Hii ${guestName}! 👋`,
    `Welcome to *${BRAND}*!`,
    `Thank you for booking your stay with us. 😊`,
    ``,
    `🏡 *Property:* ${propertyName}`,
    building ? `🏢 ${building}` : '',
    address ? `📍 *Address:* ${address}` : '',
    floorInfo ? `🏠 ${floorInfo}` : '',
    mapLink ? `📌 *Location:* ${mapLink}` : '',
    ``,
    directions ? `🗺️ *How to Reach:*\n${directions}` : '',
    landmarks ? `📍 *Nearby:* ${landmarks}` : '',
    ``,
    `⏰ *Timings:*`,
    `▫️ Check-in: ${checkIn} at ${checkInTime}`,
    `▫️ Check-out: ${checkOut} at ${checkOutTime}`,
    ``,
    `📋 *Check-in Instructions:*`,
    `Our caretaker will assist you with the check-in and show you around the place.`,
    caretaker ? `📞 *Caretaker:* ${caretaker}${caretakerPhone ? ' — +91 ' + caretakerPhone : ''}` : '',
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
  ].filter(Boolean).join('\n');

  showWhatsAppModal(guestName, propertyName, b.phone, msg);
}

// ============ CHECKOUT REMINDER ============
async function sendCheckoutReminder(bkId) {
  const {data:b} = await sb.from('guest_register')
    .select('*, rooms(unit_no, nickname, checkin_manager, caretaker_name, caretaker_phone)')
    .eq('booking_id', bkId).single();
  if (!b) { alert('Not found'); return; }

  const guestName = b.guest_name || 'Guest';
  const propertyName = b.rooms?.nickname || '';
  const checkOut = b.check_out || '';
  const checkOutTime = b.check_out_time || '11:00 AM';
  const caretaker = b.rooms?.caretaker_name || b.rooms?.checkin_manager || '';
  const caretakerPhone = b.rooms?.caretaker_phone || '';

  const msg = [
    `Hi ${guestName}! 👋`,
    ``,
    `Hope you had a wonderful stay at *${propertyName}*! 😊`,
    ``,
    `Just a gentle reminder — your checkout is scheduled for *${checkOutTime}* on *${checkOut}*.`,
    ``,
    `Before you leave:`,
    `🔑 Please hand over the keys to our caretaker`,
    `🚪 Kindly ensure all doors & windows are secured`,
    `👀 Do check for any personal belongings`,
    b.has_vehicle ? `🅿️ Please clear the parking area` : '',
    ``,
    `Would you like to *extend your stay*?`,
    `We'd love to have you longer! Just let us know and we'll check availability for you. 😊`,
    ``,
    `Need any help?`,
    caretaker ? `📞 *Caretaker:* ${caretaker}${caretakerPhone ? ' — +91 ' + caretakerPhone : ''}` : '',
    ``,
    `For any other assistance:`,
    `📞 Mr Shahanshah — 9450055554`,
    `📞 Mr Firoz Khan — 8299600709`,
    ``,
    `Thank you for choosing *${BRAND}*! 🏠`,
    `It was a pleasure hosting you.`,
    `We hope to welcome you back soon! 🙏`,
    ``,
    `— Team *${BRAND}*`,
    `🌐 uniquehavenhomesstay.com`
  ].filter(Boolean).join('\n');

  showWhatsAppModal(guestName, propertyName, b.phone, msg);
}

// ============ WHATSAPP MODAL (shared) ============
function showWhatsAppModal(guestName, propertyName, phone, msg) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.onclick = e => { if (e.target === modal) modal.remove(); };

  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const fullPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

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