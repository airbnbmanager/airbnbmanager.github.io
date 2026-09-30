/**
 * =====================================================================
 * THE UNIQUE HAVEN HOMES (UHHS) — BOOKING RECEIPT & ADVANCE VOUCHER ENGINE
 * Non-GST Guest Confirmation Receipt, Advance Payment Voucher & Quotation
 * =====================================================================
 */

window.BOOKING_RECEIPT_ENGINE = (function() {
  'use strict';

  // Company Master Data
  const CO = {
    name:       'THE UNIQUE HAVEN HOMES PRIVATE LIMITED',
    tradeName:  'The Unique Haven Homes Homestays',
    cin:        'U68101UP2026PTC244837',
    pan:        'ABECT9843K',
    address:    'P NO 39 & 40 Radhikapuri, Indira Nagar Takrohi, Lucknow, Uttar Pradesh – 226016',
    phone:      '+91 94500 55554',
    phone2:     '+91 82996 00709',
    managerPhone: '+91 9194109911',
    managerName: 'Praveen Singh',
    owners: [
      { name: 'Mr. Shahanshah', phone: '+91 94500 55554' },
      { name: 'Mr. Firoz Khan', phone: '+91 82996 00709' }
    ],
    email:      'theuniquehavenhomes@gmail.com',
    web:        'uniquehavenhomesstay.com'
  };

  function getSignatureStampSrc() {
    try {
      const custom = typeof localStorage !== 'undefined' ? localStorage.getItem('uhh_custom_signature_stamp') : null;
      if (custom && custom.trim()) return custom;
    } catch(e) {}
    try {
      return new URL('assets/signature-stamp.svg', window.location.href).href;
    } catch(e) {
      return 'assets/signature-stamp.svg';
    }
  }

  function numToWords(n) {
    if (!n || n === 0) return 'Zero Rupees';
    const o = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function c(x) {
      if (x < 20) return o[x];
      if (x < 100) return t[Math.floor(x / 10)] + (x % 10 ? ' ' + o[x % 10] : '');
      if (x < 1000) return o[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + c(x % 100) : '');
      if (x < 100000) return c(Math.floor(x / 1000)) + ' Thousand' + (x % 1000 ? ' ' + c(x % 1000) : '');
      if (x < 10000000) return c(Math.floor(x / 100000)) + ' Lakh' + (x % 100000 ? ' ' + c(x % 100000) : '');
      return c(Math.floor(x / 10000000)) + ' Crore' + (x % 10000000 ? ' ' + c(x % 10000000) : '');
    }
    const r = Math.floor(n);
    return 'Rupees ' + c(r) + ' Only';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function calcNights(cin, cout) {
    if (!cin || !cout) return 1;
    const diff = new Date(cout) - new Date(cin);
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }

  function formatDate(dStr) {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr + (dStr.length === 10 ? 'T00:00:00' : ''));
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch(e) {
      return dStr;
    }
  }

  function formatTime(tStr) {
    if (!tStr) return '';
    const parts = tStr.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    }
    return tStr;
  }

  function cleanPhone(p) {
    if (!p) return '';
    return String(p).replace(/\D/g, '');
  }

  // 1. Fetch Complete Booking Data for Receipt
  async function fetchBookingReceiptData(bookingIdOrPhone) {
    let client = window.sb;
    if (!client && typeof supabase !== 'undefined') {
      const url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : window.SUPABASE_URL;
      const key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : window.SUPABASE_ANON_KEY;
      if (url && key) client = supabase.createClient(url, key);
    }
    if (!client) throw new Error('Supabase connection not initialized.');

    let booking = null;
    const strId = String(bookingIdOrPhone).trim();
    const isGroup = strId.startsWith('GRP-') || strId.includes('GRP');
    const isId = strId.startsWith('B') || strId.length > 12;

    if (isGroup) {
      // Group reference passed directly
      const multi = await fetchMultiBookingReceiptData(strId);
      if (multi && multi.bookings && multi.bookings.length > 0) {
        return { isMultiGroup: true, multiData: multi };
      }
    }

    if (isId) {
      const { data, error } = await client.from('guest_register')
        .select('*, rooms(*)')
        .eq('booking_id', bookingIdOrPhone)
        .maybeSingle();
      if (error) throw error;
      booking = data;
    } else {
      // Search by phone or query
      const digits = cleanPhone(bookingIdOrPhone);
      const { data, error } = await client.from('guest_register')
        .select('*, rooms(*)')
        .or(`phone.ilike.%${digits}%,booking_id.eq.${bookingIdOrPhone}`)
        .order('check_in', { ascending: false })
        .limit(10);
      if (error) throw error;
      if (!data || !data.length) return null;
      if (data.length === 1) {
        booking = data[0];
      } else {
        return { isMultiple: true, bookings: data };
      }
    }

    if (!booking) return null;

    // Fetch payments
    const { data: payments } = await client.from('payment_history')
      .select('*')
      .eq('booking_id', booking.booking_id)
      .neq('verification_status', 'rejected')
      .order('payment_date', { ascending: true });

    const totalAmount = Number(booking.total_amount || 0);
    const paidAmount = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const balanceDue = Math.max(0, totalAmount - paidAmount);
    const nights = calcNights(booking.check_in, booking.check_out);

    return {
      booking,
      payments: payments || [],
      totalAmount,
      paidAmount,
      balanceDue,
      nights
    };
  }

  // 2. Build Print-Ready Receipt HTML
  function buildReceiptHTML(data, options = {}) {
    const { booking, payments, totalAmount, paidAmount, balanceDue, nights } = data;
    const room = booking.rooms || {};
    const propName = room.nickname || room.property_name || booking.room_id || 'Homestay Property';
    const unitNo = room.unit_no ? ` (${room.unit_no})` : '';
    const address = room.address || 'Lucknow, Uttar Pradesh';
    const mapLink = room.map_link || '';

    const checkInDate = formatDate(booking.check_in);
    const checkOutDate = formatDate(booking.check_out);
    const checkInTime = formatTime(booking.check_in_time || '14:00');
    const checkOutTime = formatTime(booking.check_out_time || '11:00');
    const todayStr = formatDate(new Date().toISOString().slice(0, 10));

    const receiptNo = options.receiptNo || `UHH-REC/${booking.booking_id}`;
    const customNotes = options.customNotes || booking.notes || '';

    let statusText = 'Fully Paid';
    let statusClass = 'status-paid';
    let statusBg = '#DEF7EC';
    let statusColor = '#03543F';
    let statusBadgeText = '✅ FULLY PAID';

    if (totalAmount <= 0) {
      statusBadgeText = 'COMPLIMENTARY';
      statusBg = '#F3F4F6';
      statusColor = '#374151';
    } else if (paidAmount === 0) {
      statusBadgeText = '🔴 PAYMENT DUE';
      statusBg = '#FDE8E8';
      statusColor = '#9B1C1C';
    } else if (balanceDue > 0) {
      statusBadgeText = `⚠️ ADVANCE PAID · ₹${balanceDue.toLocaleString('en-IN')} DUE AT CHECK-IN`;
      statusBg = '#FEF08A';
      statusColor = '#854D0E';
    }

    const wordsTotal = numToWords(totalAmount);
    const wordsPaid = numToWords(paidAmount);
    const wordsBalance = balanceDue > 0 ? numToWords(balanceDue) : '';

    let logoSrc = 'assets/logo.png';
    try {
      logoSrc = new URL('assets/logo.png', window.location.href).href;
    } catch(e) {}

    return `
      <div class="uhh-receipt-container" style="background:#fff;color:#0F172A;font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif;padding:12px 16px;max-width:760px;margin:0 auto;box-sizing:border-box;page-break-inside:avoid;break-inside:avoid;line-height:1.35;font-size:10.5px;">
        
        <!-- Header Strip -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #0F172A;padding-bottom:6px;margin-bottom:6px;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${logoSrc}" alt="UHH Logo" style="width:40px;height:40px;object-fit:contain;border-radius:8px;background:#FAF8F5;border:1px solid #E2E8F0;padding:2px;flex-shrink:0;" />
            <div>
              <div style="font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#B45309;margin-bottom:1px;">
                The Unique Haven Homes Homestays
              </div>
              <div style="font-size:14px;font-weight:900;color:#0F172A;line-height:1.15;">
                ${CO.name}
              </div>
              <div style="font-size:9px;color:#64748B;margin-top:2px;line-height:1.35;">
                📍 ${CO.address} &nbsp;|&nbsp; 📞 ${CO.phone} &nbsp;|&nbsp; ✉️ ${CO.email}
              </div>
            </div>
          </div>

          <div style="text-align:right;flex-shrink:0;">
            <div style="display:inline-block;background:#0F172A;color:#fff;padding:2px 8px;border-radius:4px;font-size:9.5px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:2px;">
              Booking Voucher &amp; Receipt
            </div>
            <div style="font-size:8.5px;font-weight:700;color:#64748B;letter-spacing:0.3px;text-transform:uppercase;">
              Official Guest Receipt (Without GST)
            </div>
            <div style="margin-top:3px;font-size:9.5px;line-height:1.4;">
              <span style="color:#64748B;">Receipt No:</span> <strong style="color:#0F172A;">${escapeHtml(receiptNo)}</strong> &nbsp;|&nbsp;
              <span style="color:#64748B;">Date:</span> <strong>${todayStr}</strong><br>
              <span style="color:#64748B;">Booking ID:</span> <strong style="color:#0284C7;">${escapeHtml(booking.booking_id)}</strong>
            </div>
          </div>
        </div>

        <!-- Status Banner -->
        <div style="background:${statusBg};border:1px solid ${statusColor};color:${statusColor};border-radius:6px;padding:4px 10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
          <div style="font-weight:800;font-size:11px;letter-spacing:0.3px;text-transform:uppercase;">
            ${statusBadgeText}
          </div>
          <div style="font-size:10px;font-weight:600;">
            Channel: <strong>${escapeHtml(booking.booking_mode || 'Direct')}</strong> · Stay: <strong>${nights} Night${nights > 1 ? 's' : ''}</strong>
          </div>
        </div>

        <!-- 2 Column Overview: Guest & Stay -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px;">
          
          <!-- Guest Details Card -->
          <div style="border:1px solid #E2E8F0;border-radius:6px;padding:6px 10px;background:#F8FAFC;">
            <div style="font-size:9px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:#B45309;margin-bottom:2px;">
              👤 Guest Details
            </div>
            <div style="font-size:13px;font-weight:900;color:#0F172A;margin-bottom:2px;">
              ${escapeHtml(booking.guest_name || 'Valued Guest')}
            </div>
            <div style="font-size:10px;color:#334155;line-height:1.5;">
              📱 Phone: <strong>${escapeHtml(booking.phone || 'N/A')}</strong> &nbsp;|&nbsp; 👥 Guests: <strong>${booking.guests || 1} Person${(booking.guests || 1) > 1 ? 's' : ''}</strong><br>
              ${booking.booked_by ? `✍️ Booked By: <strong>${escapeHtml(booking.booked_by)}</strong> &nbsp;|&nbsp; ` : ''}
              ${booking.id_proof_type ? `🪪 ID Type: <strong>${escapeHtml(booking.id_proof_type)}</strong>` : ''}
            </div>
          </div>

          <!-- Property & Stay Card -->
          <div style="border:1px solid #E2E8F0;border-radius:6px;padding:6px 10px;background:#F8FAFC;">
            <div style="font-size:9px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:#B45309;margin-bottom:2px;">
              🏠 Property &amp; Stay Schedule
            </div>
            <div style="font-size:13px;font-weight:900;color:#0F172A;margin-bottom:2px;">
              ${escapeHtml(propName)}${escapeHtml(unitNo)}
            </div>
            <div style="font-size:10px;color:#334155;line-height:1.5;">
              📍 <strong>${escapeHtml(address)}</strong> ${mapLink ? `<a href="${mapLink}" target="_blank" style="color:#0284C7;text-decoration:none;font-weight:700;">[📍 Map]</a>` : ''}<br>
              📅 <strong>${checkInDate}</strong> (${checkInTime}) → <strong>${checkOutDate}</strong> (${checkOutTime}) · <strong>${nights}N</strong>
            </div>
          </div>

        </div>

        <!-- 💰 Financial & Advance Payment Tracker -->
        <div style="border:1px solid #0F172A;border-radius:6px;overflow:hidden;margin-bottom:6px;">
          
          <div style="background:#0F172A;color:#fff;padding:4px 10px;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:10px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">
              💰 Payment Breakdown &amp; Balance Statement
            </div>
            <div style="font-size:9px;color:#94A3B8;">
              All amounts in Indian Rupees (INR)
            </div>
          </div>

          <!-- 3 Highlight Boxes -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;background:#F8FAFC;border-bottom:1px solid #E2E8F0;text-align:center;">
            
            <div style="padding:6px;border-right:1px solid #E2E8F0;">
              <div style="font-size:9px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:1px;">
                Total Booking Amount
              </div>
              <div style="font-size:15px;font-weight:900;color:#0F172A;">
                ₹${totalAmount.toLocaleString('en-IN')}
              </div>
              <div style="font-size:8.5px;color:#64748B;">
                ₹${Math.round(totalAmount / (nights || 1)).toLocaleString('en-IN')} / night
              </div>
            </div>

            <div style="padding:6px;border-right:1px solid #E2E8F0;background:#F0FDF4;">
              <div style="font-size:9px;font-weight:800;color:#15803D;text-transform:uppercase;margin-bottom:1px;">
                ✔ Advance / Amount Paid
              </div>
              <div style="font-size:15px;font-weight:900;color:#059669;">
                ₹${paidAmount.toLocaleString('en-IN')}
              </div>
              <div style="font-size:8.5px;color:#15803D;font-weight:700;">
                ${totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0}% Paid
              </div>
            </div>

            <div style="padding:6px;background:${balanceDue > 0 ? '#FEF2F2' : '#F0FDF4'};">
              <div style="font-size:9px;font-weight:800;color:${balanceDue > 0 ? '#DC2626' : '#15803D'};text-transform:uppercase;margin-bottom:1px;">
                ${balanceDue > 0 ? '⚠️ Balance Due at Check-in' : '✅ Balance Remaining'}
              </div>
              <div style="font-size:15px;font-weight:900;color:${balanceDue > 0 ? '#DC2626' : '#059669'};">
                ₹${balanceDue.toLocaleString('en-IN')}
              </div>
              <div style="font-size:8.5px;color:${balanceDue > 0 ? '#B91C1C' : '#15803D'};font-weight:700;">
                ${balanceDue > 0 ? 'Payable upon arrival' : 'Clear &amp; Settled'}
              </div>
            </div>

          </div>

          <!-- Payment Transactions Table -->
          <div style="padding:5px 8px;">
            ${payments && payments.length > 0 ? `
              <table style="width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:3px;">
                <thead>
                  <tr style="background:#F1F5F9;color:#475569;text-align:left;border-bottom:1px solid #CBD5E1;">
                    <th style="padding:2px 4px;font-weight:800;width:18px;">#</th>
                    <th style="padding:2px 4px;font-weight:800;">Date</th>
                    <th style="padding:2px 4px;font-weight:800;">Mode</th>
                    <th style="padding:2px 4px;font-weight:800;">Notes / Reference</th>
                    <th style="padding:2px 4px;font-weight:800;">Received By</th>
                    <th style="padding:2px 4px;font-weight:800;text-align:right;">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map((p, idx) => `
                    <tr style="border-bottom:1px solid #E2E8F0;">
                      <td style="padding:2px 4px;color:#64748B;">${String(idx + 1).padStart(2, '0')}</td>
                      <td style="padding:2px 4px;font-weight:700;">${formatDate(p.payment_date || p.paid_at)}</td>
                      <td style="padding:2px 4px;"><span style="background:#E2E8F0;padding:1px 4px;border-radius:3px;font-size:8.5px;font-weight:700;">${escapeHtml(p.payment_mode || 'Direct')}</span></td>
                      <td style="padding:2px 4px;color:#475569;">${escapeHtml(p.notes || '-')}</td>
                      <td style="padding:2px 4px;color:#475569;">${escapeHtml(p.received_by || 'UHH Team')}</td>
                      <td style="padding:2px 4px;text-align:right;font-weight:900;color:#059669;">₹${Number(p.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="font-size:9.5px;color:#64748B;font-style:italic;padding:2px 0;">
                No payment transactions recorded yet. Balance of ₹${totalAmount.toLocaleString('en-IN')} is due on check-in.
              </div>
            `}

            <!-- Words Summary -->
            <div style="padding:3px 6px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:4px;font-size:9px;color:#334155;line-height:1.4;">
              <strong>Advance Paid in Words:</strong> ${wordsPaid} &nbsp;|&nbsp;
              ${balanceDue > 0 ? `<strong>Remaining Balance:</strong> <span style="color:#DC2626;font-weight:700;">${wordsBalance}</span> (Due at Check-in)` : '<strong>Status:</strong> <span style="color:#059669;font-weight:700;">Full payment received with thanks!</span>'}
            </div>

          </div>

        </div>

        <!-- 📞 Management & Support Contacts Strip -->
        <div style="border:1px solid #E2E8F0;border-radius:5px;padding:3px 8px;background:#F8FAFC;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;font-size:9px;flex-wrap:wrap;gap:4px;">
          <div>
            👤 <strong>Property Manager:</strong> ${CO.managerName} (📞 <a href="tel:${CO.managerPhone}" style="color:#0F172A;text-decoration:none;font-weight:700;">${CO.managerPhone}</a>)
          </div>
          <div>
            👑 <strong>Company Owners:</strong> ${CO.owners.map(o => `<strong>${o.name}:</strong> 📞 <a href="tel:${o.phone.replace(/[^0-9+]/g,'')}" style="color:#0F172A;text-decoration:none;font-weight:700;">${o.phone}</a>`).join(' &nbsp;|&nbsp; ')}
          </div>
        </div>

        ${customNotes ? `
          <!-- Special Notes -->
          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:4px;padding:3px 8px;margin-bottom:5px;font-size:9px;color:#92400E;">
            <strong>📝 Note:</strong> ${escapeHtml(customNotes)}
          </div>
        ` : ''}

        <!-- 📜 Terms & House Rules -->
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:5px;padding:4px 8px;margin-bottom:5px;font-size:8px;color:#64748B;line-height:1.35;">
          <strong style="color:#0F172A;font-size:8.5px;">📋 Stay Guidelines &amp; Important Terms:</strong>
          1. <strong>Govt ID Mandatory:</strong> Original government photo ID required for all adult guests at check-in. &nbsp;•&nbsp;
          2. <strong>Timings:</strong> Check-in: 02:00 PM | Check-out: 11:00 AM (early/late subject to availability). &nbsp;•&nbsp;
          3. <strong>Peaceful Neighbourhood:</strong> Loud music/noise prohibited after 11:00 PM. &nbsp;•&nbsp;
          4. <strong>Balance Settlement:</strong> Outstanding balance must be settled upon arrival before room handover. &nbsp;•&nbsp;
          5. <strong>Non-GST Slip:</strong> Official booking voucher &amp; payment confirmation without GST output tax credit.
        </div>

        <!-- Signature & Seal -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:3px;border-top:1px solid #CBD5E1;">
          <div style="font-size:8px;color:#94A3B8;line-height:1.35;">
            <strong style="color:#475569;">${CO.name}</strong><br>
            CIN: ${CO.cin} · PAN: ${CO.pan} · Website: <a href="https://${CO.web}" style="color:#64748B;text-decoration:none;">${CO.web}</a>
          </div>

          <div style="text-align:right;">
            <div style="display:inline-block;text-align:right;">
              <img src="${getSignatureStampSrc()}" alt="Stamp & Signature" style="height:34px;max-width:140px;object-fit:contain;margin-bottom:-4px;display:block;margin-left:auto;" />
              <div style="height:1px;border-bottom:1px dashed #CBD5E1;width:120px;margin-left:auto;"></div>
              <div style="font-size:8px;color:#64748B;margin-top:1px;">Authorised Signatory</div>
              <div style="font-size:9px;font-weight:800;color:#0F172A;">For ${CO.name}</div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  // 3. Build Formatted WhatsApp Text
  function buildReceiptWhatsAppText(data) {
    const { booking, payments, totalAmount, paidAmount, balanceDue, nights } = data;
    const room = booking.rooms || {};
    const propName = room.nickname || room.property_name || booking.room_id || 'Homestay Property';
    const unitNo = room.unit_no ? ` (${room.unit_no})` : '';
    const address = room.address || 'Lucknow, Uttar Pradesh';
    const mapStr = room.map_link ? `\n📍 *Map:* ${room.map_link}` : '';

    const checkInDate = formatDate(booking.check_in);
    const checkOutDate = formatDate(booking.check_out);
    const checkInTime = formatTime(booking.check_in_time || '14:00');
    const checkOutTime = formatTime(booking.check_out_time || '11:00');

    let payHistoryText = '';
    if (payments && payments.length > 0) {
      payHistoryText = '\n*Payment Log:*\n' + payments.map(p => 
        `• ₹${Number(p.amount || 0).toLocaleString('en-IN')} via ${p.payment_mode || 'Direct'} on ${formatDate(p.payment_date || p.paid_at)}`
      ).join('\n');
    }

    return `🏨 *THE UNIQUE HAVEN HOMES*
*BOOKING CONFIRMATION & ADVANCE RECEIPT*
Namaste *${booking.guest_name || 'Guest'}* ji 🙏

Thank you for choosing *The Unique Haven Homes*. Your direct reservation has been confirmed:

📋 *Booking ID:* ${booking.booking_id}
🏠 *Property:* ${propName}${unitNo}
📍 *Address:* ${address}${mapStr}

📅 *Check-in:* ${checkInDate} at ${checkInTime}
📅 *Check-out:* ${checkOutDate} at ${checkOutTime}
🌙 *Duration:* ${nights} Night(s) · ${booking.guests || 1} Guest(s)

💰 *PAYMENT BREAKDOWN:*
━━━━━━━━━━━━━━━━━━━━
▪️ *Total Booking Amount:* ₹${totalAmount.toLocaleString('en-IN')}
▪️ *Advance Paid:* ₹${paidAmount.toLocaleString('en-IN')} ✅
▪️ *Balance Due:* ₹${balanceDue.toLocaleString('en-IN')} ${balanceDue > 0 ? '⚠️ (Payable at Check-in)' : '✅ (Fully Cleared)'}
━━━━━━━━━━━━━━━━━━━━${payHistoryText}

👤 *Property Manager:* Praveen Singh (+91 9194109911)

👑 *Company Owners:*
• Mr. Shahanshah: +91 94500 55554
• Mr. Firoz Khan: +91 82996 00709

📋 *Key Check-in Instructions:*
• Valid Govt ID (Aadhaar / DL / Passport) mandatory for all guests.
• Check-in: 02:00 PM | Check-out: 11:00 AM.
• Quiet hours post 11:00 PM.

🌐 https://${CO.web}`;
  }

  // Helper: Sanitize string for clean cross-platform filenames (Mobile/iOS/Android/Windows/Mac)
  function sanitizeFilename(str) {
    return String(str || '')
      .trim()
      .replace(/[\/\\:*?"<>|]/g, '-')
      .replace(/\s+/g, '_')
      .replace(/-+/g, '-')
      .replace(/_+/g, '_')
      .replace(/^[_\-]+|[_\-]+$/g, '');
  }

  // Helper: PDF / Document title as requested: UHHS Receipt — Guest — Room (Date)
  function getReceiptDocTitle(booking) {
    const guest = (booking?.guest_name || 'Guest').trim();
    const room = (booking?.rooms?.nickname || booking?.rooms?.unit_no || booking?.room_id || '').trim();
    let datePart = '';
    if (booking?.check_in) {
      try {
        const d = new Date(booking.check_in + (booking.check_in.length === 10 ? 'T00:00:00' : ''));
        datePart = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch(e) {
        datePart = booking.check_in;
      }
    }
    const roomPart = room ? ` — ${room}` : '';
    const dateStr = datePart ? ` (${datePart})` : '';
    return `TUHH Receipt — ${guest}${roomPart}${dateStr}`;
  }

  function getReceiptFilename(booking) {
    const guest = sanitizeFilename(booking?.guest_name || 'Guest');
    const room = sanitizeFilename(booking?.rooms?.nickname || booking?.rooms?.unit_no || booking?.room_id || '');
    const checkIn = sanitizeFilename(booking?.check_in || '');
    const bId = sanitizeFilename(booking?.booking_id || 'Booking');
    const parts = ['TUHH_Receipt', guest];
    if (room) parts.push(room);
    if (checkIn) parts.push(checkIn);
    parts.push(bId);
    return parts.join('_') + '.pdf';
  }

  // 4. Print Booking Receipt Function (Zero-margin @page to completely suppress 'about:blank' footer/header)
  function printBookingReceipt(elementId, customTitle) {
    const el = document.getElementById(elementId);
    if (!el) {
      alert('Receipt content not found');
      return;
    }

    const title = customTitle || 'TUHH Receipt — The Unique Haven Homes';
    const origDocTitle = document.title;
    try { document.title = title; } catch(e) {}

    // Remove any previous print iframe
    let old = document.getElementById('uhhReceiptPrintFrame');
    if (old) old.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'uhhReceiptPrintFrame';
    // Position offscreen with exact dimensions, NO visibility:hidden or display:none (prevents blank output in WebKit/Safari/Mac)
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const baseUrl = window.location.href.split('?')[0].split('#')[0].replace(/\/[^\/]*$/, '/');
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <base href="${baseUrl}">
        <title>${title.replace(/"/g, '&quot;')}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 0 !important; /* CRITICAL: 0 margin completely suppresses browser default headers and footers (about:blank, date, URL) */
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0F172A !important;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 10px;
            width: 100% !important;
            height: auto !important;
          }
          .uhh-receipt-container, .invoice-doc {
            padding: 4mm 6mm !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        ${el.innerHTML}
      </body>
      </html>
    `);
    doc.close();

    const cleanup = () => {
      try {
        if (iframe && iframe.parentNode) iframe.remove();
      } catch(e) {}
      try { document.title = origDocTitle; } catch(e) {}
    };

    // Safely remove iframe ONLY after printing completes, never on an aggressive 2-second timer
    iframe.contentWindow.onafterprint = () => {
      setTimeout(cleanup, 500);
    };
    setTimeout(cleanup, 120000); // 2 minute safety fallback

    const doPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch(err) {
        console.warn('Iframe print error, falling back:', err);
        window.print();
      }
    };

    // Wait for images to be ready before calling print
    const imgs = doc.images;
    if (imgs && imgs.length > 0) {
      let pending = 0;
      for (let i = 0; i < imgs.length; i++) {
        if (!imgs[i].complete) pending++;
      }
      if (pending === 0) {
        setTimeout(doPrint, 200);
      } else {
        let doneCount = 0;
        const onImgReady = () => {
          doneCount++;
          if (doneCount >= pending) setTimeout(doPrint, 150);
        };
        for (let i = 0; i < imgs.length; i++) {
          if (!imgs[i].complete) {
            imgs[i].onload = onImgReady;
            imgs[i].onerror = onImgReady;
          }
        }
        setTimeout(doPrint, 800); // Safety timeout
      }
    } else {
      setTimeout(doPrint, 250);
    }
  }

  // 4B. Ensure html2pdf is loaded from CDN on demand
  async function ensureHtml2Pdf() {
    if (window.html2pdf) return window.html2pdf;
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="html2pdf"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.html2pdf));
        existing.addEventListener('error', () => reject(new Error('Failed to load html2pdf.')));
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      s.onload = () => resolve(window.html2pdf);
      s.onerror = () => reject(new Error('Failed to load html2pdf library.'));
      document.head.appendChild(s);
    });
  }

  // 4C. 1-Click WhatsApp PDF Sharing (Direct file attachment on mobile, direct download + prefilled text on desktop)
  async function sharePdfViaWhatsApp(containerOrId, options = {}) {
    let el = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    if (!el) {
      alert('Voucher document not found for PDF generation.');
      return;
    }

    // Target the clean inner receipt container if available (avoids modal wrappers/borders/scrollbars)
    const targetEl = el.querySelector('.uhh-receipt-container') || el.querySelector('.invoice-doc') || el;

    const rawFilename = (options.filename || 'TUHH_Booking_Receipt.pdf').replace(/\.pdf$/i, '');
    const filename = sanitizeFilename(rawFilename) + '.pdf';
    const cleanP = options.phone ? String(options.phone).replace(/\D/g, '') : '';
    const fullPhone = cleanP.length === 10 ? '91' + cleanP : cleanP;
    const message = options.message || '';
    const title = options.title || 'Booking Voucher — TUHH';

    // Show indicator on button if provided
    let triggerBtn = options.triggerBtn || null;
    let origText = '';
    if (triggerBtn) {
      origText = triggerBtn.innerHTML;
      triggerBtn.innerHTML = '⏳ Generating PDF...';
      triggerBtn.disabled = true;
    }

    try {
      await ensureHtml2Pdf();

      // Ensure all images inside targetEl are complete before html2canvas capture
      const imgs = Array.from(targetEl.querySelectorAll('img'));
      if (imgs.length > 0) {
        await Promise.all(imgs.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(res => {
            img.onload = res;
            img.onerror = res;
            setTimeout(res, 600);
          });
        }));
      }

      const captureWidth = Math.max(780, targetEl.scrollWidth || 780);

      const opt = {
        margin: [4, 4, 4, 4],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: captureWidth
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const pdfBlob = await window.html2pdf().set(opt).from(targetEl).outputPdf('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      // Native Mobile Web Share (Android Chrome, iOS Safari, macOS Safari)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: title,
          text: message
        });
        if (window.fsn?.toast) fsn.toast('🎉 Shared to WhatsApp!');
        if (triggerBtn) {
          triggerBtn.innerHTML = origText;
          triggerBtn.disabled = false;
        }
        return;
      }

      // Desktop / Unsupported WebShare fallback:
      // 1. Download file automatically
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

      // 2. Copy message to clipboard
      try {
        await navigator.clipboard.writeText(message);
      } catch(e) {}

      // 3. Open WhatsApp Web / App
      const waUrl = fullPhone 
        ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      if (window.fsn?.toast) {
        fsn.toast(`✅ PDF Bill downloaded: "${filename}"`);
      }

    } catch (err) {
      console.warn('PDF share notice:', err);
      // Fallback: direct WhatsApp URL
      const fallbackUrl = fullPhone
        ? `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(fallbackUrl, '_blank');
    } finally {
      if (triggerBtn) {
        triggerBtn.innerHTML = origText;
        triggerBtn.disabled = false;
      }
    }
  }

  // 5. Open Booking Receipt Interactive Modal
  async function openBookingReceiptModal(bookingIdOrPhone) {
    if (!bookingIdOrPhone) {
      alert('Please specify a Booking ID or Phone number.');
      return;
    }

    // Show loading indicator
    let loadingEl = document.createElement('div');
    loadingEl.className = 'modal-overlay';
    loadingEl.id = 'uhhReceiptLoadingOverlay';
    loadingEl.innerHTML = `
      <div class="modal-box" style="text-align:center;padding:30px;max-width:320px;">
        <div style="font-size:32px;margin-bottom:10px;">⏳</div>
        <div style="font-weight:700;">Loading Booking Details…</div>
        <div style="font-size:12px;color:#64748B;margin-top:4px;">Fetching payments &amp; reservation data</div>
      </div>
    `;
    document.body.appendChild(loadingEl);

    try {
      const res = await fetchBookingReceiptData(bookingIdOrPhone);
      loadingEl.remove();

      if (!res) {
        alert('No booking found for: ' + bookingIdOrPhone);
        return;
      }

      if (res.isMultiGroup) {
        renderMultiPropertyReceiptModal(res.multiData);
        return;
      }

      // If multiple bookings found for phone
      if (res.isMultiple) {
        showBookingPickerModal(res.bookings);
        return;
      }

      renderReceiptModal(res);
    } catch(err) {
      loadingEl.remove();
      alert('Error fetching booking: ' + err.message);
    }
  }

  // 1B. Fetch Multi-Property / Group Booking Data for Combined Receipt
  async function fetchMultiBookingReceiptData(identifier) {
    let client = window.sb;
    if (!client && typeof supabase !== 'undefined') {
      const url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : window.SUPABASE_URL;
      const key = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : window.SUPABASE_ANON_KEY;
      if (url && key) client = supabase.createClient(url, key);
    }
    if (!client) throw new Error('Supabase connection not initialized.');

    let bookings = [];

    if (Array.isArray(identifier)) {
      const { data, error } = await client.from('guest_register')
        .select('*, rooms(*)')
        .in('booking_id', identifier)
        .order('check_in', { ascending: true });
      if (error) throw error;
      bookings = data || [];
    } else {
      const str = String(identifier).trim();
      const isGroup = str.startsWith('GRP-') || str.includes('GRP');
      const isBookingId = str.startsWith('B') && str.length > 10;
      const digits = cleanPhone(str);

      if (isGroup) {
        const { data, error } = await client.from('guest_register')
          .select('*, rooms(*)')
          .eq('stay_group_id', str)
          .order('check_in', { ascending: true });
        if (error) throw error;
        bookings = data || [];
      } else if (isBookingId) {
        // First check if this booking has a stay_group_id
        const { data: singleBk } = await client.from('guest_register')
          .select('booking_id, stay_group_id, phone, guest_name, check_in')
          .eq('booking_id', str)
          .maybeSingle();

        if (singleBk?.stay_group_id) {
          const { data, error } = await client.from('guest_register')
            .select('*, rooms(*)')
            .eq('stay_group_id', singleBk.stay_group_id)
            .order('check_in', { ascending: true });
          if (error) throw error;
          bookings = data || [];
        } else if (singleBk?.phone) {
          const pDigits = cleanPhone(singleBk.phone);
          const { data, error } = await client.from('guest_register')
            .select('*, rooms(*)')
            .eq('phone', pDigits)
            .order('check_in', { ascending: true });
          if (error) throw error;
          bookings = data || [];
        } else {
          const { data } = await client.from('guest_register')
            .select('*, rooms(*)')
            .eq('booking_id', str);
          bookings = data || [];
        }
      } else if (digits.length >= 10) {
        // Query by phone
        const { data, error } = await client.from('guest_register')
          .select('*, rooms(*)')
          .or(`phone.ilike.%${digits}%,phone.eq.${digits}`)
          .order('check_in', { ascending: false })
          .limit(20);
        if (error) throw error;
        bookings = data || [];
      }
    }

    if (!bookings || bookings.length === 0) return null;

    // Fetch payments for all bookings
    const bIds = bookings.map(b => b.booking_id);
    const { data: allPayments } = await client.from('payment_history')
      .select('*')
      .in('booking_id', bIds)
      .neq('verification_status', 'rejected')
      .order('payment_date', { ascending: true });

    const totalAmount = bookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
    const paidAmount = (allPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const balanceDue = Math.max(0, totalAmount - paidAmount);

    // Group info
    const primaryBooking = bookings[0];
    const guestName = primaryBooking.guest_name || 'Valued Guest';
    const phone = primaryBooking.phone || '';
    const stayGroupId = primaryBooking.stay_group_id || `GRP-${cleanPhone(phone)}-${Date.now().toString().slice(-4)}`;

    // Total guests
    const totalGuests = bookings.reduce((sum, b) => sum + Number(b.guests || 1), 0);

    // Dates range
    const checkIns = bookings.map(b => b.check_in).filter(Boolean).sort();
    const checkOuts = bookings.map(b => b.check_out).filter(Boolean).sort();
    const minCheckIn = checkIns[0] || primaryBooking.check_in;
    const maxCheckOut = checkOuts[checkOuts.length - 1] || primaryBooking.check_out;
    const totalNights = calcNights(minCheckIn, maxCheckOut);

    return {
      isMulti: true,
      stayGroupId,
      guestName,
      phone,
      totalGuests,
      minCheckIn,
      maxCheckOut,
      totalNights,
      bookings,
      payments: allPayments || [],
      totalAmount,
      paidAmount,
      balanceDue,
      primaryBooking
    };
  }

  // 2B. Build Print-Ready Combined Multi-Property Receipt HTML (Compact Single-Page A4)
  function buildMultiPropertyReceiptHTML(data, options = {}) {
    const {
      stayGroupId,
      guestName,
      phone,
      totalGuests,
      minCheckIn,
      maxCheckOut,
      totalNights,
      bookings,
      payments,
      totalAmount,
      paidAmount,
      balanceDue,
      primaryBooking
    } = data;

    const todayStr = formatDate(new Date().toISOString().slice(0, 10));
    const receiptNo = options.receiptNo || `UHH-GRP/${stayGroupId || 'RECEIPT'}`;
    const customNotes = options.customNotes || primaryBooking?.notes || '';

    let statusBadgeText = '✅ FULLY PAID';
    let statusBg = '#DEF7EC';
    let statusColor = '#03543F';

    if (totalAmount <= 0) {
      statusBadgeText = 'COMPLIMENTARY GROUP STAY';
      statusBg = '#F3F4F6';
      statusColor = '#374151';
    } else if (paidAmount === 0) {
      statusBadgeText = '🔴 PAYMENT DUE AT CHECK-IN';
      statusBg = '#FDE8E8';
      statusColor = '#9B1C1C';
    } else if (balanceDue > 0) {
      statusBadgeText = `⚠️ ADVANCE PAID · ₹${balanceDue.toLocaleString('en-IN')} DUE AT CHECK-IN`;
      statusBg = '#FEF08A';
      statusColor = '#854D0E';
    }

    const wordsTotal = numToWords(totalAmount);
    const wordsPaid = numToWords(paidAmount);
    const wordsBalance = balanceDue > 0 ? numToWords(balanceDue) : '';

    let logoSrc = 'assets/logo.png';
    try {
      logoSrc = new URL('assets/logo.png', window.location.href).href;
    } catch(e) {}

    return `
      <div class="uhh-receipt-container" style="background:#fff;color:#0F172A;font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif;padding:12px 16px;max-width:760px;margin:0 auto;box-sizing:border-box;page-break-inside:avoid;break-inside:avoid;line-height:1.35;font-size:10.5px;">
        
        <!-- Header Strip -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #0F172A;padding-bottom:6px;margin-bottom:6px;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="${logoSrc}" alt="UHH Logo" style="width:40px;height:40px;object-fit:contain;border-radius:8px;background:#FAF8F5;border:1px solid #E2E8F0;padding:2px;flex-shrink:0;" />
            <div>
              <div style="font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#B45309;margin-bottom:1px;">
                The Unique Haven Homes Homestays
              </div>
              <div style="font-size:14px;font-weight:900;color:#0F172A;line-height:1.15;">
                ${CO.name}
              </div>
              <div style="font-size:9px;color:#64748B;margin-top:2px;line-height:1.35;">
                📍 ${CO.address} &nbsp;|&nbsp; 📞 ${CO.phone} &nbsp;|&nbsp; ✉️ ${CO.email}
              </div>
            </div>
          </div>

          <div style="text-align:right;flex-shrink:0;">
            <div style="display:inline-block;background:#0F172A;color:#fff;padding:2px 8px;border-radius:4px;font-size:9.5px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;margin-bottom:2px;">
              🏢 Consolidated Multi-Property Voucher
            </div>
            <div style="font-size:8.5px;font-weight:700;color:#64748B;letter-spacing:0.3px;text-transform:uppercase;">
              Official Combined Guest Receipt (Without GST)
            </div>
            <div style="margin-top:3px;font-size:9.5px;line-height:1.4;">
              <span style="color:#64748B;">Receipt No:</span> <strong style="color:#0F172A;">${escapeHtml(receiptNo)}</strong> &nbsp;|&nbsp;
              <span style="color:#64748B;">Date:</span> <strong>${todayStr}</strong><br>
              <span style="color:#64748B;">Group Ref:</span> <strong style="color:#4F46E5;">${escapeHtml(stayGroupId)}</strong>
            </div>
          </div>
        </div>

        <!-- Status & Stay Overview Banner -->
        <div style="background:${statusBg};border:1px solid ${statusColor};color:${statusColor};border-radius:6px;padding:4px 10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
          <div style="font-weight:800;font-size:11px;letter-spacing:0.3px;text-transform:uppercase;">
            ${statusBadgeText}
          </div>
          <div style="font-size:10px;font-weight:600;">
            Properties: <strong>${bookings.length} Homestays</strong> · Schedule: <strong>${formatDate(minCheckIn)} → ${formatDate(maxCheckOut)} (${totalNights} Night${totalNights > 1 ? 's' : ''})</strong>
          </div>
        </div>

        <!-- 2 Column Overview Grid: Guest & Group Schedule -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px;">
          
          <!-- Guest Details Card -->
          <div style="border:1px solid #E2E8F0;border-radius:6px;padding:6px 10px;background:#F8FAFC;">
            <div style="font-size:9px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:#B45309;margin-bottom:2px;">
              👤 Primary Guest &amp; Group
            </div>
            <div style="font-size:13px;font-weight:900;color:#0F172A;margin-bottom:2px;">
              ${escapeHtml(guestName)}
            </div>
            <div style="font-size:10px;color:#334155;line-height:1.5;">
              📱 Phone: <strong>${escapeHtml(phone || 'N/A')}</strong> &nbsp;|&nbsp; 👥 Total Guests: <strong>${totalGuests}</strong><br>
              🏢 Total Homestays: <strong>${bookings.length} Properties</strong>
              ${primaryBooking?.booked_by ? ` &nbsp;|&nbsp; ✍️ Booked By: <strong>${escapeHtml(primaryBooking.booked_by)}</strong>` : ''}
            </div>
          </div>

          <!-- Schedule & Group Reference Card -->
          <div style="border:1px solid #E2E8F0;border-radius:6px;padding:6px 10px;background:#F8FAFC;">
            <div style="font-size:9px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:#B45309;margin-bottom:2px;">
              📅 Reservation Timeline
            </div>
            <div style="font-size:13px;font-weight:900;color:#4F46E5;margin-bottom:2px;">
              ${bookings.length} Homestays Booked Together
            </div>
            <div style="font-size:10px;color:#334155;line-height:1.5;">
              📅 Check-in From: <strong>${formatDate(minCheckIn)}</strong> → Check-out: <strong>${formatDate(maxCheckOut)}</strong><br>
              🌙 Duration: <strong>${totalNights} Night${totalNights > 1 ? 's' : ''}</strong> &nbsp;|&nbsp; 🏷️ Group Ref: <strong style="font-family:monospace;color:#0F172A;">${escapeHtml(stayGroupId)}</strong>
            </div>
          </div>

        </div>

        <!-- 🏠 ALL BOOKED PROPERTIES BREAKDOWN TABLE (Centerpiece) -->
        <div style="border:1px solid #0F172A;border-radius:6px;overflow:hidden;margin-bottom:6px;">
          <div style="background:#0F172A;color:#fff;padding:4px 10px;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:10px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">
              🏠 Booked Properties &amp; Allocation Details (${bookings.length} Homestays)
            </div>
            <div style="font-size:9px;color:#94A3B8;">
              All rates in Indian Rupees (INR)
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:10px;">
            <thead>
              <tr style="background:#F1F5F9;color:#475569;text-align:left;border-bottom:1px solid #CBD5E1;">
                <th style="padding:4px 6px;font-weight:800;width:20px;text-align:center;">#</th>
                <th style="padding:4px 6px;font-weight:800;">Property &amp; Location</th>
                <th style="padding:4px 6px;font-weight:800;">Stay Dates &amp; Timings</th>
                <th style="padding:4px 6px;font-weight:800;text-align:center;">Nights</th>
                <th style="padding:4px 6px;font-weight:800;text-align:center;">Guests</th>
                <th style="padding:4px 8px;font-weight:800;text-align:right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${bookings.map((b, idx) => {
                const room = b.rooms || {};
                const prop = room.nickname || room.property_name || b.room_id || 'Homestay Property';
                const unit = room.unit_no ? ` (${room.unit_no})` : '';
                const mapLink = room.map_link ? ` <a href="${room.map_link}" target="_blank" style="color:#0284C7;text-decoration:none;font-weight:700;">[📍 Map]</a>` : '';
                const n = calcNights(b.check_in, b.check_out);
                const ciTime = formatTime(b.check_in_time || '14:00');
                const coTime = formatTime(b.check_out_time || '11:00');
                const amt = Number(b.total_amount || 0);

                return `
                  <tr style="border-bottom:1px solid #E2E8F0;background:${idx % 2 === 0 ? '#fff' : '#F8FAFC'};">
                    <td style="padding:4px 6px;color:#64748B;font-weight:700;text-align:center;">${String(idx + 1).padStart(2, '0')}</td>
                    <td style="padding:4px 6px;">
                      <strong style="color:#0F172A;font-size:10.5px;">${escapeHtml(prop)}${escapeHtml(unit)}</strong>${mapLink}
                      <span style="font-size:9px;color:#64748B;"> · ID: ${escapeHtml(b.booking_id)} · ${escapeHtml(room.address || 'Lucknow')}</span>
                    </td>
                    <td style="padding:4px 6px;">
                      <strong>${formatDate(b.check_in)}</strong> (${ciTime}) → <strong>${formatDate(b.check_out)}</strong> (${coTime})
                    </td>
                    <td style="padding:4px 6px;text-align:center;font-weight:700;">${n}N</td>
                    <td style="padding:4px 6px;text-align:center;">👥 ${b.guests || 1}</td>
                    <td style="padding:4px 8px;text-align:right;font-weight:900;font-size:11px;color:#0F172A;">₹${amt.toLocaleString('en-IN')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#F1F5F9;border-top:1.5px solid #0F172A;font-weight:900;">
                <td colspan="5" style="padding:5px 6px;text-align:right;text-transform:uppercase;letter-spacing:0.4px;font-size:10px;">
                  Grand Combined Stay Total (${bookings.length} Homestays):
                </td>
                <td style="padding:5px 8px;text-align:right;font-size:12.5px;color:#0F172A;">
                  ₹${totalAmount.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- 💰 Financial & Advance Payment Tracker -->
        <div style="border:1px solid #0F172A;border-radius:6px;overflow:hidden;margin-bottom:6px;">
          
          <!-- 3 Highlight Stat Boxes -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;background:#F8FAFC;border-bottom:1px solid #E2E8F0;text-align:center;">
            
            <div style="padding:6px;border-right:1px solid #E2E8F0;">
              <div style="font-size:9px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:1px;">
                Total Group Bill (${bookings.length} Stays)
              </div>
              <div style="font-size:15px;font-weight:900;color:#0F172A;">
                ₹${totalAmount.toLocaleString('en-IN')}
              </div>
            </div>

            <div style="padding:6px;border-right:1px solid #E2E8F0;background:#F0FDF4;">
              <div style="font-size:9px;font-weight:800;color:#15803D;text-transform:uppercase;margin-bottom:1px;">
                ✔ Advance / Amount Paid
              </div>
              <div style="font-size:15px;font-weight:900;color:#059669;">
                ₹${paidAmount.toLocaleString('en-IN')}
              </div>
            </div>

            <div style="padding:6px;background:${balanceDue > 0 ? '#FEF2F2' : '#F0FDF4'};">
              <div style="font-size:9px;font-weight:800;color:${balanceDue > 0 ? '#DC2626' : '#15803D'};text-transform:uppercase;margin-bottom:1px;">
                ${balanceDue > 0 ? '⚠️ Balance Due at Check-in' : '✅ Balance Remaining'}
              </div>
              <div style="font-size:15px;font-weight:900;color:${balanceDue > 0 ? '#DC2626' : '#059669'};">
                ₹${balanceDue.toLocaleString('en-IN')}
              </div>
            </div>

          </div>

          <!-- Payment Transactions Table (if any) -->
          <div style="padding:5px 8px;">
            ${payments && payments.length > 0 ? `
              <table style="width:100%;border-collapse:collapse;font-size:9.5px;margin-bottom:3px;">
                <thead>
                  <tr style="background:#F1F5F9;color:#475569;text-align:left;border-bottom:1px solid #CBD5E1;">
                    <th style="padding:2px 4px;font-weight:800;width:18px;">#</th>
                    <th style="padding:2px 4px;font-weight:800;">Date</th>
                    <th style="padding:2px 4px;font-weight:800;">Ref Booking ID</th>
                    <th style="padding:2px 4px;font-weight:800;">Mode</th>
                    <th style="padding:2px 4px;font-weight:800;">Notes</th>
                    <th style="padding:2px 4px;font-weight:800;">Received By</th>
                    <th style="padding:2px 4px;font-weight:800;text-align:right;">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map((p, idx) => `
                    <tr style="border-bottom:1px solid #E2E8F0;">
                      <td style="padding:2px 4px;color:#64748B;">${String(idx + 1).padStart(2, '0')}</td>
                      <td style="padding:2px 4px;font-weight:700;">${formatDate(p.payment_date || p.paid_at)}</td>
                      <td style="padding:2px 4px;font-family:monospace;font-size:9px;color:#0284C7;">${escapeHtml(p.booking_id)}</td>
                      <td style="padding:2px 4px;"><span style="background:#E2E8F0;padding:1px 4px;border-radius:3px;font-size:8.5px;font-weight:700;">${escapeHtml(p.payment_mode || 'Direct')}</span></td>
                      <td style="padding:2px 4px;color:#475569;">${escapeHtml(p.notes || '-')}</td>
                      <td style="padding:2px 4px;color:#475569;">${escapeHtml(p.received_by || 'UHH Team')}</td>
                      <td style="padding:2px 4px;text-align:right;font-weight:900;color:#059669;">₹${Number(p.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="font-size:9.5px;color:#64748B;font-style:italic;padding:2px 0;">
                No advance transactions recorded yet. Balance of ₹${totalAmount.toLocaleString('en-IN')} is due on check-in.
              </div>
            `}

            <!-- Words Summary -->
            <div style="padding:3px 6px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:4px;font-size:9px;color:#334155;line-height:1.4;">
              <strong>Advance Paid in Words:</strong> ${wordsPaid} &nbsp;|&nbsp;
              ${balanceDue > 0 ? `<strong>Remaining Balance:</strong> <span style="color:#DC2626;font-weight:700;">${wordsBalance}</span> (Due at Check-in)` : '<strong>Status:</strong> <span style="color:#059669;font-weight:700;">Full combined payment settled with thanks!</span>'}
            </div>

          </div>

        </div>

        <!-- 📞 Management & Support Contacts Strip -->
        <div style="border:1px solid #E2E8F0;border-radius:5px;padding:3px 8px;background:#F8FAFC;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;font-size:9px;flex-wrap:wrap;gap:4px;">
          <div>
            👤 <strong>Property Manager:</strong> ${CO.managerName} (📞 <a href="tel:${CO.managerPhone}" style="color:#0F172A;text-decoration:none;font-weight:700;">${CO.managerPhone}</a>)
          </div>
          <div>
            👑 <strong>Company Owners:</strong> ${CO.owners.map(o => `<strong>${o.name}:</strong> 📞 <a href="tel:${o.phone.replace(/[^0-9+]/g,'')}" style="color:#0F172A;text-decoration:none;font-weight:700;">${o.phone}</a>`).join(' &nbsp;|&nbsp; ')}
          </div>
        </div>

        ${customNotes ? `
          <!-- Special Notes -->
          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:4px;padding:3px 8px;margin-bottom:5px;font-size:9px;color:#92400E;">
            <strong>📝 Note:</strong> ${escapeHtml(customNotes)}
          </div>
        ` : ''}

        <!-- 📜 Terms & House Rules (Compact) -->
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:5px;padding:4px 8px;margin-bottom:5px;font-size:8px;color:#64748B;line-height:1.35;">
          <strong style="color:#0F172A;font-size:8.5px;">📋 Stay Guidelines &amp; Important Terms:</strong>
          1. <strong>Govt ID Mandatory:</strong> Original government photo ID required for all adult guests at check-in. &nbsp;•&nbsp;
          2. <strong>Timings:</strong> Check-in: 02:00 PM | Check-out: 11:00 AM (early/late subject to availability). &nbsp;•&nbsp;
          3. <strong>Peaceful Neighbourhood:</strong> Loud music/noise prohibited after 11:00 PM. &nbsp;•&nbsp;
          4. <strong>Balance Settlement:</strong> Outstanding balance must be settled upon arrival before key handover. &nbsp;•&nbsp;
          5. <strong>Non-GST Slip:</strong> Official booking voucher &amp; payment confirmation without GST output tax credit.
        </div>

        <!-- Signature & Seal -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:3px;border-top:1px solid #CBD5E1;">
          <div style="font-size:8px;color:#94A3B8;line-height:1.35;">
            <strong style="color:#475569;">${CO.name}</strong><br>
            CIN: ${CO.cin} · PAN: ${CO.pan} · Website: <a href="https://${CO.web}" style="color:#64748B;text-decoration:none;">${CO.web}</a>
          </div>

          <div style="text-align:right;">
            <div style="display:inline-block;text-align:right;">
              <img src="${getSignatureStampSrc()}" alt="Stamp & Signature" style="height:34px;max-width:140px;object-fit:contain;margin-bottom:-4px;display:block;margin-left:auto;" />
              <div style="height:1px;border-bottom:1px dashed #CBD5E1;width:120px;margin-left:auto;"></div>
              <div style="font-size:8px;color:#64748B;margin-top:1px;">Authorised Signatory</div>
              <div style="font-size:9px;font-weight:800;color:#0F172A;">For ${CO.name}</div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  // 3B. Build Formatted WhatsApp Text for Multi-Property Booking
  function buildMultiPropertyWhatsAppText(data) {
    const {
      stayGroupId,
      guestName,
      phone,
      totalGuests,
      minCheckIn,
      maxCheckOut,
      totalNights,
      bookings,
      payments,
      totalAmount,
      paidAmount,
      balanceDue
    } = data;

    let payHistoryText = '';
    if (payments && payments.length > 0) {
      payHistoryText = '\n*Payment Log:*\n' + payments.map(p => 
        `• ₹${Number(p.amount || 0).toLocaleString('en-IN')} via ${p.payment_mode || 'Direct'} on ${formatDate(p.payment_date || p.paid_at)}`
      ).join('\n');
    }

    const propertiesList = bookings.map((b, idx) => {
      const room = b.rooms || {};
      const propName = room.nickname || room.property_name || b.room_id || 'Homestay';
      const unit = room.unit_no ? ` (${room.unit_no})` : '';
      const n = calcNights(b.check_in, b.check_out);
      const mapStr = room.map_link ? `\n   📍 *Map:* ${room.map_link}` : '';
      const address = room.address ? `\n   📍 *Address:* ${room.address}` : '';
      return `${idx + 1}️⃣ *${propName}${unit}*
   📅 *Check-in:* ${formatDate(b.check_in)} at ${formatTime(b.check_in_time || '14:00')}
   📅 *Check-out:* ${formatDate(b.check_out)} at ${formatTime(b.check_out_time || '11:00')}
   🌙 ${n} Night(s) · 👥 ${b.guests || 1} Guest(s) · ₹${Number(b.total_amount || 0).toLocaleString('en-IN')}${address}${mapStr}`;
    }).join('\n\n');

    return `🏨 *THE UNIQUE HAVEN HOMES*
*CONSOLIDATED MULTI-PROPERTY BOOKING CONFIRMATION & ADVANCE RECEIPT*
Namaste *${guestName || 'Guest'}* ji 🙏

Thank you for choosing *The Unique Haven Homes*. Your multi-property reservation for *${bookings.length} homestays* has been confirmed:

📋 *Group Reference:* ${stayGroupId}
👥 *Total Guests:* ${totalGuests} Person(s)
📅 *Overall Stay:* ${formatDate(minCheckIn)} → ${formatDate(maxCheckOut)} (${totalNights} Night${totalNights > 1 ? 's' : ''})

🏠 *RESERVED PROPERTIES (${bookings.length}):*
━━━━━━━━━━━━━━━━━━━━
${propertiesList}
━━━━━━━━━━━━━━━━━━━━

💰 *COMBINED PAYMENT STATEMENT:*
━━━━━━━━━━━━━━━━━━━━
▪️ *Total Booking Amount:* ₹${totalAmount.toLocaleString('en-IN')}
▪️ *Advance Paid:* ₹${paidAmount.toLocaleString('en-IN')} ✅
▪️ *Balance Due at Check-in:* ₹${balanceDue.toLocaleString('en-IN')} ${balanceDue > 0 ? '⚠️ (Payable upon arrival)' : '✅ (Fully Cleared)'}
━━━━━━━━━━━━━━━━━━━━${payHistoryText}

👤 *Property Manager:* Praveen Singh (+91 9194109911)

👑 *Company Owners:*
• Mr. Shahanshah: +91 94500 55554
• Mr. Firoz Khan: +91 82996 00709

📋 *Key Check-in Instructions:*
• Original Govt ID (Aadhaar / DL / Passport) mandatory for all adult guests.
• Standard Check-in: 02:00 PM | Check-out: 11:00 AM.
• Quiet hours post 11:00 PM.

🌐 https://${CO.web}`;
  }

  function getMultiReceiptDocTitle(data) {
    const guest = (data?.guestName || 'Guest').trim();
    const count = data?.bookings?.length || 1;
    let datePart = '';
    if (data?.minCheckIn && data?.maxCheckOut) {
      datePart = `${formatDate(data.minCheckIn)} to ${formatDate(data.maxCheckOut)}`;
    } else if (data?.minCheckIn) {
      datePart = formatDate(data.minCheckIn);
    }
    return `TUHH Group Receipt — ${guest} (${count} Homestays)${datePart ? ' — ' + datePart : ''}`;
  }

  function getMultiReceiptFilename(data) {
    const guest = sanitizeFilename(data?.guestName || 'Guest');
    const count = data?.bookings?.length || 1;
    const minD = sanitizeFilename(data?.minCheckIn || '');
    const maxD = sanitizeFilename(data?.maxCheckOut || '');
    const dateRange = (minD && maxD) ? `${minD}_to_${maxD}` : (minD || '');
    const grpId = sanitizeFilename(data?.stayGroupId || 'Group');
    const parts = ['TUHH_Group_Receipt', guest, `${count}Properties`];
    if (dateRange) parts.push(dateRange);
    parts.push(grpId);
    return parts.join('_') + '.pdf';
  }

  // 5B. Open Multi-Property Receipt Interactive Modal
  async function openMultiPropertyReceiptModal(identifier) {
    if (!identifier) {
      alert('Please specify a Stay Group ID, Booking ID, or Phone number.');
      return;
    }

    // Show loading indicator
    let loadingEl = document.createElement('div');
    loadingEl.className = 'modal-overlay';
    loadingEl.id = 'uhhMultiReceiptLoadingOverlay';
    loadingEl.innerHTML = `
      <div class="modal-box" style="text-align:center;padding:30px;max-width:320px;">
        <div style="font-size:32px;margin-bottom:10px;">⏳</div>
        <div style="font-weight:700;">Loading Multi-Property Details…</div>
        <div style="font-size:12px;color:#64748B;margin-top:4px;">Aggregating all properties &amp; payments</div>
      </div>
    `;
    document.body.appendChild(loadingEl);

    try {
      const res = await fetchMultiBookingReceiptData(identifier);
      loadingEl.remove();

      if (!res || !res.bookings || !res.bookings.length) {
        alert('No multi-property bookings found for: ' + (typeof identifier === 'object' ? 'selected bookings' : identifier));
        return;
      }

      renderMultiPropertyReceiptModal(res);
    } catch(err) {
      loadingEl.remove();
      alert('Error fetching multi-property receipt: ' + err.message);
    }
  }

  function renderMultiPropertyReceiptModal(data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'uhhMultiBookingReceiptModal';
    modal.style.zIndex = '99998';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    const waText = buildMultiPropertyWhatsAppText(data);
    const guestPhone = cleanPhone(data.phone);
    const fullPhone = guestPhone.length === 10 ? '91' + guestPhone : guestPhone;
    const docTitle = getMultiReceiptDocTitle(data);
    const pdfFilename = getMultiReceiptFilename(data);

    modal.innerHTML = `
      <div class="modal-box" style="max-width:960px;width:96%;max-height:94vh;display:flex;flex-direction:column;padding:20px;border-radius:14px;background:#F1F5F9;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);position:relative;">
        
        <!-- Sticky Prominent Floating Close Button -->
        <button type="button" class="modal-close-prominent" onclick="this.closest('.modal-overlay').remove()" title="Close (ESC)" style="position:absolute;top:10px;right:10px;background:#EF4444;color:#fff;border:none;border-radius:50%;width:34px;height:34px;font-size:16px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(239,68,68,0.35);z-index:10000;">✕</button>

        <!-- Modal Topbar -->
        <div style="display:flex;justify-content:space-between;align-items:center;background:#0F172A;color:#fff;padding:12px 18px;border-radius:10px;margin-bottom:14px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);flex-wrap:wrap;gap:10px;padding-right:45px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">🏢</span>
            <div>
              <div style="font-weight:900;font-size:15px;display:flex;align-items:center;gap:8px;">
                <span>Consolidated Multi-Property Receipt</span>
                <span style="background:#4F46E5;color:#fff;font-size:10px;padding:2px 8px;border-radius:12px;font-weight:800;">${data.bookings.length} Homestays</span>
              </div>
              <div style="font-size:11px;color:#94A3B8;">
                Ref: <strong>${escapeHtml(data.stayGroupId)}</strong> · Guest: <strong>${escapeHtml(data.guestName)}</strong>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" class="btn-sm" style="background:#B45309;color:#fff;font-weight:700;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" onclick="window.printBookingReceipt('multiReceiptPrintArea', '${escapeHtml(docTitle).replace(/'/g, "\\'")}')">
              🖨️ Print / Save PDF
            </button>
            <button type="button" class="btn-sm" style="background:#25D366;color:#fff;font-weight:800;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" onclick="window.sharePdfViaWhatsApp('multiReceiptPrintArea', { filename: '${pdfFilename}', phone: '${escapeHtml(data.phone || '')}', message: document.getElementById('multiReceiptWaHidden').value, title: '${escapeHtml(docTitle).replace(/'/g, "\\'")}', triggerBtn: this })">
              📱 WhatsApp (with PDF)
            </button>
            <button type="button" class="btn-sm" style="background:#334155;color:#fff;font-weight:700;border:none;padding:7px 12px;border-radius:6px;cursor:pointer;" onclick="navigator.clipboard.writeText(document.getElementById('multiReceiptWaHidden').value);if(window.fsn?.success) fsn.success('Copied','Consolidated receipt text copied to clipboard!'); else alert('Receipt text copied!');">
              📋 Copy Text
            </button>
          </div>
        </div>

        <textarea id="multiReceiptWaHidden" style="display:none;">${escapeHtml(waText)}</textarea>

        <!-- Printable Document View Wrapper -->
        <div style="flex:1;overflow-y:auto;background:#fff;border-radius:10px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);border:1px solid #E2E8F0;" id="multiReceiptPrintArea">
          ${buildMultiPropertyReceiptHTML(data)}
        </div>

      </div>
    `;

    // ESC key listener
    const escMulti = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        modal.remove();
        window.removeEventListener('keydown', escMulti);
      }
    };
    window.addEventListener('keydown', escMulti);

    document.body.appendChild(modal);
  }

  // Helper when phone has multiple bookings (e.g. 9560172711 has multiple bookings!)
  function showBookingPickerModal(bookings) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    const bIds = bookings.map(b => b.booking_id);
    const guestName = bookings[0]?.guest_name || 'Guest';

    modal.innerHTML = `
      <div class="modal-box" style="max-width:620px;padding:24px;border-radius:14px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #E2E8F0;padding-bottom:10px;">
          <div>
            <h3 style="margin:0;font-size:17px;font-weight:900;color:#0F172A;">Multiple Bookings Found</h3>
            <div style="font-size:12px;color:#64748B;">Found ${bookings.length} reservations for <strong>${escapeHtml(guestName)}</strong>:</div>
          </div>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="font-size:20px;background:none;border:none;cursor:pointer;">✕</button>
        </div>

        <!-- 🌟 PROMINENT COMBINED MULTI-PROPERTY RECEIPT BANNER -->
        <div style="background:linear-gradient(135deg, #1E1B4B 0%, #312E81 100%);color:#fff;border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;gap:12px;box-shadow:0 4px 14px rgba(49,46,129,0.25);">
          <div>
            <div style="font-weight:900;font-size:14.5px;letter-spacing:0.3px;display:flex;align-items:center;gap:6px;">
              <span>📑 Consolidated Multi-Property Receipt</span>
              <span style="background:#4F46E5;color:#fff;font-size:10px;padding:2px 7px;border-radius:10px;font-weight:700;">${bookings.length} Properties</span>
            </div>
            <div style="font-size:11.5px;color:#C7D2FE;margin-top:3px;">
              Combine all ${bookings.length} properties of this guest into one single grand receipt with unified WhatsApp text
            </div>
          </div>
          <button type="button" class="btn-sm" style="background:#F59E0B;color:#0F172A;font-weight:800;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;white-space:nowrap;font-size:12px;"
            onclick="this.closest('.modal-overlay').remove();window.openMultiPropertyReceiptModal(${JSON.stringify(bIds).replace(/"/g, '&quot;')})">
            Open Combined Receipt →
          </button>
        </div>

        <div style="font-size:11.5px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
          Or Select An Individual Property Receipt:
        </div>

        <div style="max-height:360px;overflow-y:auto;">
          ${bookings.map(b => {
            const prop = b.rooms?.nickname || b.rooms?.property_name || b.room_id || 'Property';
            const unit = b.rooms?.unit_no ? ` (${b.rooms.unit_no})` : '';
            const n = calcNights(b.check_in, b.check_out);
            return `
              <div style="border:1.5px solid #CBD5E1;border-radius:10px;padding:12px 14px;margin-bottom:10px;cursor:pointer;transition:all 0.15s;display:flex;justify-content:space-between;align-items:center;"
                onmouseover="this.style.borderColor='#0F172A';this.style.background='#F8FAFC';"
                onmouseout="this.style.borderColor='#CBD5E1';this.style.background='#fff';"
                onclick="this.closest('.modal-overlay').remove();window.openBookingReceiptModal('${b.booking_id}')">
                <div>
                  <div style="font-weight:800;font-size:14px;color:#0F172A;">
                    ${escapeHtml(b.guest_name)} · <span style="color:#0284C7;">${escapeHtml(prop)}${escapeHtml(unit)}</span>
                  </div>
                  <div style="font-size:12px;color:#64748B;margin-top:2px;">
                    📅 ${formatDate(b.check_in)} → ${formatDate(b.check_out)} (${n} night${n > 1 ? 's' : ''})
                  </div>
                  <div style="font-size:11px;color:#94A3B8;margin-top:2px;">
                    ID: ${b.booking_id} ${b.stay_group_id ? `· <span style="color:#6366F1;font-weight:700;">Group: ${escapeHtml(b.stay_group_id)}</span>` : ''} · Phone: ${b.phone || '-'}
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-weight:900;font-size:15px;color:#059669;">
                    ₹${Number(b.total_amount || 0).toLocaleString('en-IN')}
                  </div>
                  <button class="btn-sm" style="background:#0F172A;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;margin-top:4px;">
                    Single Receipt →
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // Render the Full Interactive Receipt Modal
  function renderReceiptModal(data) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'uhhBookingReceiptModal';
    modal.style.zIndex = '99998';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    const waText = buildReceiptWhatsAppText(data);
    const guestPhone = cleanPhone(data.booking.phone);
    const fullPhone = guestPhone.length === 10 ? '91' + guestPhone : guestPhone;

    const docTitle = getReceiptDocTitle(data.booking);
    const pdfFilename = getReceiptFilename(data.booking);

    modal.innerHTML = `
      <div class="modal-box" style="max-width:920px;width:96%;max-height:94vh;display:flex;flex-direction:column;padding:20px;border-radius:14px;background:#F1F5F9;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);position:relative;">
        
        <!-- Sticky Prominent Floating Close Button -->
        <button type="button" class="modal-close-prominent" onclick="this.closest('.modal-overlay').remove()" title="Close (ESC)" style="position:absolute;top:10px;right:10px;background:#EF4444;color:#fff;border:none;border-radius:50%;width:34px;height:34px;font-size:16px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(239,68,68,0.35);z-index:10000;">✕</button>

        <!-- Modal Topbar -->
        <div style="display:flex;justify-content:space-between;align-items:center;background:#0F172A;color:#fff;padding:12px 18px;border-radius:10px;margin-bottom:14px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);flex-wrap:wrap;gap:8px;padding-right:45px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">📄</span>
            <div>
              <div style="font-weight:900;font-size:15px;">
                Booking Confirmation &amp; Advance Receipt
              </div>
              <div style="font-size:11px;color:#94A3B8;">
                Guest Receipt (Without GST) · Ref: <strong>${escapeHtml(data.booking.booking_id)}</strong>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" class="btn-sm" style="background:#B45309;color:#fff;font-weight:700;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" onclick="window.printBookingReceipt('receiptPrintArea', '${escapeHtml(docTitle).replace(/'/g, "\\'")}')">
              🖨️ Print / Save PDF
            </button>
            <button type="button" class="btn-sm" style="background:#25D366;color:#fff;font-weight:800;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" onclick="window.sharePdfViaWhatsApp('receiptPrintArea', { filename: '${pdfFilename}', phone: '${escapeHtml(data.booking.phone || '')}', message: document.getElementById('receiptWaHidden').value, title: '${escapeHtml(docTitle).replace(/'/g, "\\'")}', triggerBtn: this })">
              📱 WhatsApp (with PDF)
            </button>
            <button type="button" class="btn-sm" style="background:#334155;color:#fff;font-weight:700;border:none;padding:7px 12px;border-radius:6px;cursor:pointer;" onclick="navigator.clipboard.writeText(document.getElementById('receiptWaHidden').value);if(window.fsn?.success) fsn.success('Copied','Receipt text copied to clipboard!'); else alert('Receipt text copied!');">
              📋 Copy Text
            </button>
            ${data.booking.stay_group_id ? `
              <button type="button" class="btn-sm" style="background:#4F46E5;color:#fff;font-weight:700;border:none;padding:7px 12px;border-radius:6px;cursor:pointer;" onclick="this.closest('.modal-overlay').remove();window.openMultiPropertyReceiptModal('${data.booking.stay_group_id}')" title="View Combined Multi-Property Receipt">
                🏢 Combined Receipt
              </button>
            ` : ''}
            <button type="button" class="btn-sm outline" style="background:transparent;color:#CBD5E1;border:1px solid #475569;padding:7px 10px;font-size:11.5px;" onclick="const m=this.closest('.modal-overlay');if(m)m.remove();if(window.openGSTInvoiceModal){window.openGSTInvoiceModal('${data.booking.booking_id}');}">
              🧾 Need GST Invoice?
            </button>
          </div>
        </div>

        ${data.booking.stay_group_id ? `
          <div style="background:#EEF2FF;border:1.5px solid #818CF8;border-radius:8px;padding:8px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
            <div style="font-size:12px;color:#3730A3;font-weight:700;">
              🏢 This booking belongs to Multi-Property Group: <code>${escapeHtml(data.booking.stay_group_id)}</code>
            </div>
            <button type="button" class="btn-sm" style="background:#4F46E5;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;" onclick="this.closest('.modal-overlay').remove();window.openMultiPropertyReceiptModal('${escapeHtml(data.booking.stay_group_id)}')">
              📑 View Consolidated Multi-Property Receipt →
            </button>
          </div>
        ` : ''}

        <textarea id="receiptWaHidden" style="display:none;">${escapeHtml(waText)}</textarea>

        <!-- Printable Document View Wrapper -->
        <div style="flex:1;overflow-y:auto;background:#fff;border-radius:10px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);border:1px solid #E2E8F0;" id="receiptPrintArea">
          ${buildReceiptHTML(data)}
        </div>

      </div>
    `;

    // ESC key listener
    const escReceipt = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        modal.remove();
        window.removeEventListener('keydown', escReceipt);
      }
    };
    window.addEventListener('keydown', escReceipt);

    document.body.appendChild(modal);
  }

  // Public API
  return {
    sanitizeFilename,
    openBookingReceiptModal,
    openMultiPropertyReceiptModal,
    fetchBookingReceiptData,
    fetchMultiBookingReceiptData,
    buildReceiptHTML,
    buildMultiPropertyReceiptHTML,
    buildReceiptWhatsAppText,
    buildMultiPropertyWhatsAppText,
    getReceiptDocTitle,
    getReceiptFilename,
    getMultiReceiptDocTitle,
    getMultiReceiptFilename,
    printBookingReceipt,
    sharePdfViaWhatsApp
  };

})();

// Global aliases
window.sanitizeFilename = window.BOOKING_RECEIPT_ENGINE.sanitizeFilename;
window.openBookingReceiptModal = window.BOOKING_RECEIPT_ENGINE.openBookingReceiptModal;
window.openMultiPropertyReceiptModal = window.BOOKING_RECEIPT_ENGINE.openMultiPropertyReceiptModal;
window.buildMultiPropertyReceiptHTML = window.BOOKING_RECEIPT_ENGINE.buildMultiPropertyReceiptHTML;
window.buildMultiPropertyWhatsAppText = window.BOOKING_RECEIPT_ENGINE.buildMultiPropertyWhatsAppText;
window.fetchMultiBookingReceiptData = window.BOOKING_RECEIPT_ENGINE.fetchMultiBookingReceiptData;
window.printBookingReceipt = window.BOOKING_RECEIPT_ENGINE.printBookingReceipt;
window.getReceiptDocTitle = window.BOOKING_RECEIPT_ENGINE.getReceiptDocTitle;
window.getReceiptFilename = window.BOOKING_RECEIPT_ENGINE.getReceiptFilename;
window.getMultiReceiptDocTitle = window.BOOKING_RECEIPT_ENGINE.getMultiReceiptDocTitle;
window.getMultiReceiptFilename = window.BOOKING_RECEIPT_ENGINE.getMultiReceiptFilename;
window.sharePdfViaWhatsApp = window.BOOKING_RECEIPT_ENGINE.sharePdfViaWhatsApp;
