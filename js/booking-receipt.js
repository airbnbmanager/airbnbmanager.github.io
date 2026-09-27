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
    const custom = localStorage.getItem('uhh_custom_signature_stamp');
    if (custom && custom.trim()) return custom;
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
    const isId = String(bookingIdOrPhone).startsWith('B') || String(bookingIdOrPhone).length > 12;

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
      <div class="uhh-receipt-container" style="background:#fff;color:#0F172A;font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif;padding:20px 24px;max-width:850px;margin:0 auto;box-sizing:border-box;page-break-inside:avoid;break-inside:avoid;">
        
        <!-- Header Strip -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0F172A;padding-bottom:12px;margin-bottom:12px;gap:16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${logoSrc}" alt="UHH Logo" style="width:54px;height:54px;object-fit:contain;border-radius:10px;background:#FAF8F5;border:1.5px solid #E2E8F0;padding:3px;flex-shrink:0;" />
            <div>
              <div style="font-size:10.5px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#B45309;margin-bottom:1px;">
                The Unique Haven Homes Homestays
              </div>
              <div style="font-size:16px;font-weight:900;color:#0F172A;line-height:1.2;">
                ${CO.name}
              </div>
              <div style="font-size:10.5px;color:#64748B;margin-top:3px;line-height:1.5;">
                📍 ${CO.address}<br>
                📞 ${CO.phone} | ${CO.phone2} &nbsp;|&nbsp; ✉️ ${CO.email}
              </div>
            </div>
          </div>

          <div style="text-align:right;flex-shrink:0;">
            <div style="display:inline-block;background:#0F172A;color:#fff;padding:3px 10px;border-radius:5px;font-size:10.5px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:4px;">
              Booking Voucher &amp; Receipt
            </div>
            <div style="font-size:9.5px;font-weight:700;color:#64748B;letter-spacing:0.4px;text-transform:uppercase;">
              Official Guest Receipt (Without GST)
            </div>
            <div style="margin-top:5px;font-size:11px;line-height:1.6;">
              <span style="color:#64748B;">Receipt No:</span> <strong style="color:#0F172A;">${escapeHtml(receiptNo)}</strong><br>
              <span style="color:#64748B;">Date:</span> <strong>${todayStr}</strong><br>
              <span style="color:#64748B;">Booking ID:</span> <strong style="color:#0284C7;">${escapeHtml(booking.booking_id)}</strong>
            </div>
          </div>
        </div>

        <!-- Status Banner -->
        <div style="background:${statusBg};border:1.5px solid ${statusColor};color:${statusColor};border-radius:8px;padding:7px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
          <div style="font-weight:800;font-size:12px;letter-spacing:0.4px;text-transform:uppercase;">
            ${statusBadgeText}
          </div>
          <div style="font-size:11.5px;font-weight:600;">
            Channel: <strong>${escapeHtml(booking.booking_mode || 'Direct')}</strong> · Stay: <strong>${nights} Night${nights > 1 ? 's' : ''}</strong>
          </div>
        </div>

        <!-- 2 Column Overview: Guest & Stay -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px;">
          
          <!-- Guest Details Card -->
          <div style="border:1.5px solid #E2E8F0;border-radius:8px;padding:12px 14px;background:#F8FAFC;">
            <div style="font-size:10.5px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#B45309;margin-bottom:6px;">
              👤 Guest Details
            </div>
            <div style="font-size:14.5px;font-weight:900;color:#0F172A;margin-bottom:4px;">
              ${escapeHtml(booking.guest_name || 'Valued Guest')}
            </div>
            <div style="font-size:11.5px;color:#334155;line-height:1.7;">
              📱 Phone: <strong>${escapeHtml(booking.phone || 'N/A')}</strong><br>
              👥 Number of Guests: <strong>${booking.guests || 1} Person${(booking.guests || 1) > 1 ? 's' : ''}</strong><br>
              ${booking.booked_by ? `✍️ Booked By: <strong>${escapeHtml(booking.booked_by)}</strong><br>` : ''}
              ${booking.id_proof_type ? `🪪 ID Type: <strong>${escapeHtml(booking.id_proof_type)}</strong>` : ''}
            </div>
          </div>

          <!-- Property & Stay Card -->
          <div style="border:1.5px solid #E2E8F0;border-radius:8px;padding:12px 14px;background:#F8FAFC;">
            <div style="font-size:10.5px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#B45309;margin-bottom:6px;">
              🏠 Property &amp; Stay Schedule
            </div>
            <div style="font-size:14.5px;font-weight:900;color:#0F172A;margin-bottom:4px;">
              ${escapeHtml(propName)}${escapeHtml(unitNo)}
            </div>
            <div style="font-size:11.5px;color:#334155;line-height:1.7;">
              📍 <strong>${escapeHtml(address)}</strong> ${mapLink ? `<a href="${mapLink}" target="_blank" style="color:#0284C7;text-decoration:none;font-weight:700;">[📍 Map]</a>` : ''}<br>
              📅 Check-in: <strong>${checkInDate}</strong> &nbsp;🕒 <strong>${checkInTime}</strong><br>
              📅 Check-out: <strong>${checkOutDate}</strong> &nbsp;🕒 <strong>${checkOutTime}</strong><br>
              🌙 Duration: <strong>${nights} Night${nights > 1 ? 's' : ''} Stay</strong>
            </div>
          </div>

        </div>

        <!-- 💰 Financial & Advance Payment Tracker (Centerpiece) -->
        <div style="border:1.5px solid #0F172A;border-radius:10px;overflow:hidden;margin-bottom:12px;">
          
          <div style="background:#0F172A;color:#fff;padding:9px 14px;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:11.5px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;">
              💰 Payment Breakdown &amp; Balance Statement
            </div>
            <div style="font-size:10px;color:#94A3B8;">
              All amounts in Indian Rupees (INR)
            </div>
          </div>

          <!-- 3 Highlight Boxes -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;background:#F8FAFC;border-bottom:1px solid #E2E8F0;text-align:center;">
            
            <div style="padding:10px;border-right:1px solid #E2E8F0;">
              <div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;margin-bottom:2px;">
                Total Booking Amount
              </div>
              <div style="font-size:18px;font-weight:900;color:#0F172A;">
                ₹${totalAmount.toLocaleString('en-IN')}
              </div>
              <div style="font-size:9.5px;color:#64748B;margin-top:2px;">
                ₹${Math.round(totalAmount / nights).toLocaleString('en-IN')} / night
              </div>
            </div>

            <div style="padding:10px;border-right:1px solid #E2E8F0;background:#F0FDF4;">
              <div style="font-size:10px;font-weight:800;color:#15803D;text-transform:uppercase;margin-bottom:2px;">
                ✔ Advance / Amount Paid
              </div>
              <div style="font-size:18px;font-weight:900;color:#059669;">
                ₹${paidAmount.toLocaleString('en-IN')}
              </div>
              <div style="font-size:9.5px;color:#15803D;margin-top:2px;font-weight:700;">
                ${totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0}% Paid
              </div>
            </div>

            <div style="padding:10px;background:${balanceDue > 0 ? '#FEF2F2' : '#F0FDF4'};">
              <div style="font-size:10px;font-weight:800;color:${balanceDue > 0 ? '#DC2626' : '#15803D'};text-transform:uppercase;margin-bottom:2px;">
                ${balanceDue > 0 ? '⚠️ Balance Due at Check-in' : '✅ Balance Remaining'}
              </div>
              <div style="font-size:18px;font-weight:900;color:${balanceDue > 0 ? '#DC2626' : '#059669'};">
                ₹${balanceDue.toLocaleString('en-IN')}
              </div>
              <div style="font-size:9.5px;color:${balanceDue > 0 ? '#B91C1C' : '#15803D'};margin-top:2px;font-weight:700;">
                ${balanceDue > 0 ? 'Payable upon arrival' : 'Clear &amp; Settled'}
              </div>
            </div>

          </div>

          <!-- Payment Transactions Table -->
          <div style="padding:10px 14px;">
            <div style="font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
              📋 Received Payment Transactions
            </div>

            ${payments && payments.length > 0 ? `
              <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead>
                  <tr style="background:#F1F5F9;color:#475569;text-align:left;border-bottom:1px solid #CBD5E1;">
                    <th style="padding:5px 8px;font-weight:800;width:24px;">#</th>
                    <th style="padding:5px 8px;font-weight:800;">Date</th>
                    <th style="padding:5px 8px;font-weight:800;">Mode</th>
                    <th style="padding:5px 8px;font-weight:800;">Notes / Reference</th>
                    <th style="padding:5px 8px;font-weight:800;">Received By</th>
                    <th style="padding:5px 8px;font-weight:800;text-align:right;">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments.map((p, idx) => `
                    <tr style="border-bottom:1px solid #E2E8F0;">
                      <td style="padding:5px 8px;color:#64748B;">${String(idx + 1).padStart(2, '0')}</td>
                      <td style="padding:5px 8px;font-weight:700;">${formatDate(p.payment_date || p.paid_at)}</td>
                      <td style="padding:5px 8px;"><span style="background:#E2E8F0;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">${escapeHtml(p.payment_mode || 'Direct')}</span></td>
                      <td style="padding:5px 8px;color:#475569;">${escapeHtml(p.notes || '-')}</td>
                      <td style="padding:5px 8px;color:#475569;">${escapeHtml(p.received_by || 'UHH Team')}</td>
                      <td style="padding:5px 8px;text-align:right;font-weight:900;color:#059669;">₹${Number(p.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="font-size:11px;color:#64748B;font-style:italic;padding:4px 0;">
                No payment transactions recorded yet. Balance of ₹${totalAmount.toLocaleString('en-IN')} is due on check-in.
              </div>
            `}

            <!-- Words Summary -->
            <div style="margin-top:8px;padding:7px 10px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:6px;font-size:10.5px;color:#334155;line-height:1.6;">
              <strong>Advance Paid in Words:</strong> ${wordsPaid}<br>
              ${balanceDue > 0 ? `<strong>Remaining Balance in Words:</strong> <span style="color:#DC2626;font-weight:700;">${wordsBalance}</span> (Due at Check-in)` : '<strong>Status:</strong> <span style="color:#059669;font-weight:700;">Full payment received with thanks!</span>'}
            </div>

          </div>

        </div>

        <!-- 📞 Management & Company Owner Contacts -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px;">
          
          <!-- Property Manager -->
          <div style="border:1.5px solid #E2E8F0;border-radius:8px;padding:10px 12px;background:#F8FAFC;">
            <div style="font-size:10.5px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;color:#0284C7;margin-bottom:4px;">
              👤 Property Manager
            </div>
            <div style="font-size:11px;line-height:1.7;color:#334155;">
              Manager: <strong>${CO.managerName}</strong><br>
              Phone: 📞 <a href="tel:${CO.managerPhone}" style="color:#0F172A;text-decoration:none;font-weight:700;">${CO.managerPhone}</a><br>
              Available: <strong>10:00 AM – 09:00 PM</strong>
            </div>
          </div>

          <!-- Company Owners -->
          <div style="border:1.5px solid #E2E8F0;border-radius:8px;padding:10px 12px;background:#F8FAFC;">
            <div style="font-size:10.5px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;color:#B45309;margin-bottom:4px;">
              👑 Company Owners
            </div>
            <div style="font-size:11px;line-height:1.7;color:#334155;">
              ${CO.owners.map(o => `<strong>${o.name}:</strong> 📞 <a href="tel:${o.phone.replace(/[^0-9+]/g,'')}" style="color:#0F172A;text-decoration:none;font-weight:700;">${o.phone}</a>`).join('<br>')}
            </div>
          </div>

        </div>

        ${customNotes ? `
          <!-- Special Notes -->
          <div style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:6px;padding:7px 12px;margin-bottom:10px;font-size:10.5px;color:#92400E;">
            <strong>📝 Note:</strong> ${escapeHtml(customNotes)}
          </div>
        ` : ''}

        <!-- 📜 Terms & House Rules -->
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:9.5px;color:#64748B;line-height:1.6;">
          <strong style="color:#0F172A;display:block;margin-bottom:2px;font-size:10px;">📋 Stay Guidelines &amp; Important Terms:</strong>
          1. <strong>Govt ID Mandatory:</strong> Original government-issued photo ID (Aadhaar / Passport / Voter ID / DL) is strictly required for all adult guests at check-in.<br>
          2. <strong>Timings:</strong> Standard Check-in time is 02:00 PM; Standard Check-out time is 11:00 AM. Early check-in or late checkout is subject to availability and prior confirmation.<br>
          3. <strong>Peaceful Neighbourhood:</strong> Loud music or disruptive noise is prohibited after 11:00 PM to respect residential quiet hours.<br>
          4. <strong>Balance Settlement:</strong> Outstanding balance (if any) must be settled at the time of check-in before room handover.<br>
          5. <strong>Non-GST Slip:</strong> This receipt is an official booking voucher and payment confirmation without GST output tax credit.
        </div>

        <!-- Signature & Seal -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:6px;border-top:1.5px solid #E2E8F0;">
          <div style="font-size:9.5px;color:#94A3B8;line-height:1.5;">
            <strong style="color:#475569;">${CO.name}</strong><br>
            CIN: ${CO.cin} · PAN: ${CO.pan}<br>
            Website: <a href="https://${CO.web}" style="color:#64748B;text-decoration:none;">${CO.web}</a>
          </div>

          <div style="text-align:right;">
            <div style="display:inline-block;text-align:right;">
              <img src="${getSignatureStampSrc()}" alt="Stamp & Signature" style="height:50px;max-width:180px;object-fit:contain;margin-bottom:-8px;display:block;margin-left:auto;" />
              <div style="height:1px;border-bottom:1px dashed #CBD5E1;width:150px;margin-left:auto;"></div>
              <div style="font-size:9.5px;color:#64748B;margin-top:3px;">Authorised Signatory</div>
              <div style="font-size:10.5px;font-weight:800;color:#0F172A;">For ${CO.name}</div>
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

  // Helper: PDF / Document filename as requested: Booking Receipt — Guestname - short date or month
  function getReceiptDocTitle(booking) {
    const guest = (booking?.guest_name || 'Guest').trim();
    let datePart = '';
    if (booking?.check_in) {
      try {
        const d = new Date(booking.check_in + (booking.check_in.length === 10 ? 'T00:00:00' : ''));
        datePart = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch(e) {
        datePart = booking.check_in;
      }
    }
    return `Booking Receipt — ${guest}${datePart ? ' - ' + datePart : ''}`;
  }

  // 4. Print Booking Receipt Function (Zero-margin @page to completely suppress 'about:blank' footer/header)
  function printBookingReceipt(elementId, customTitle) {
    const el = document.getElementById(elementId);
    if (!el) {
      alert('Receipt content not found');
      return;
    }

    const title = customTitle || 'Booking Receipt — The Unique Haven Homes';

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
            font-size: 11px;
            width: 100% !important;
            height: auto !important;
          }
          .uhh-receipt-container, .invoice-doc {
            padding: 6mm 10mm !important;
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

  // Helper when phone has multiple bookings (e.g. 7905497434 has 2 bookings!)
  function showBookingPickerModal(bookings) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:560px;padding:24px;border-radius:14px;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid #E2E8F0;padding-bottom:10px;">
          <div>
            <h3 style="margin:0;font-size:17px;font-weight:900;color:#0F172A;">Multiple Bookings Found</h3>
            <div style="font-size:12px;color:#64748B;">Please select which booking receipt you want to generate:</div>
          </div>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="font-size:20px;background:none;border:none;cursor:pointer;">✕</button>
        </div>

        <div style="max-height:420px;overflow-y:auto;">
          ${bookings.map(b => {
            const prop = b.rooms?.nickname || b.rooms?.property_name || b.room_id || 'Property';
            const n = calcNights(b.check_in, b.check_out);
            return `
              <div style="border:1.5px solid #CBD5E1;border-radius:10px;padding:12px 14px;margin-bottom:10px;cursor:pointer;transition:all 0.15s;display:flex;justify-content:space-between;align-items:center;"
                onmouseover="this.style.borderColor='#0F172A';this.style.background='#F8FAFC';"
                onmouseout="this.style.borderColor='#CBD5E1';this.style.background='#fff';"
                onclick="this.closest('.modal-overlay').remove();window.openBookingReceiptModal('${b.booking_id}')">
                <div>
                  <div style="font-weight:800;font-size:14px;color:#0F172A;">
                    ${escapeHtml(b.guest_name)} · <span style="color:#0284C7;">${escapeHtml(prop)}</span>
                  </div>
                  <div style="font-size:12px;color:#64748B;margin-top:2px;">
                    📅 ${formatDate(b.check_in)} → ${formatDate(b.check_out)} (${n} night${n > 1 ? 's' : ''})
                  </div>
                  <div style="font-size:11px;color:#94A3B8;margin-top:2px;">
                    ID: ${b.booking_id} · Phone: ${b.phone || '-'}
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-weight:900;font-size:15px;color:#059669;">
                    ₹${Number(b.total_amount || 0).toLocaleString('en-IN')}
                  </div>
                  <button class="btn-sm" style="background:#0F172A;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;margin-top:4px;">
                    Open Receipt →
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

    modal.innerHTML = `
      <div class="modal-box" style="max-width:920px;width:96%;max-height:94vh;display:flex;flex-direction:column;padding:20px;border-radius:14px;background:#F1F5F9;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
        
        <!-- Modal Topbar -->
        <div style="display:flex;justify-content:space-between;align-items:center;background:#0F172A;color:#fff;padding:12px 18px;border-radius:10px;margin-bottom:14px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
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
            ${fullPhone ? `
              <button type="button" class="btn-sm" style="background:#25D366;color:#fff;font-weight:700;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" onclick="window.open('https://wa.me/${fullPhone}?text='+encodeURIComponent(document.getElementById('receiptWaHidden').value),'_blank')">
                💬 WhatsApp Guest
              </button>
            ` : ''}
            <button type="button" class="btn-sm" style="background:#334155;color:#fff;font-weight:700;border:none;padding:7px 12px;border-radius:6px;cursor:pointer;" onclick="navigator.clipboard.writeText(document.getElementById('receiptWaHidden').value);if(window.fsn?.success) fsn.success('Copied','Receipt text copied to clipboard!'); else alert('Receipt text copied!');">
              📋 Copy Text
            </button>
            <button type="button" class="btn-sm outline" style="background:transparent;color:#CBD5E1;border:1px solid #475569;padding:7px 10px;font-size:11.5px;" onclick="if(window.openGSTInvoiceModal) { modal.remove(); window.openGSTInvoiceModal('${data.booking.booking_id}'); }">
              🧾 Need GST Invoice?
            </button>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="font-size:18px;background:none;border:none;color:#fff;cursor:pointer;padding:4px 8px;">✕</button>
          </div>
        </div>

        <textarea id="receiptWaHidden" style="display:none;">${escapeHtml(waText)}</textarea>

        <!-- Printable Document View Wrapper -->
        <div style="flex:1;overflow-y:auto;background:#fff;border-radius:10px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);border:1px solid #E2E8F0;" id="receiptPrintArea">
          ${buildReceiptHTML(data)}
        </div>

      </div>
    `;

    document.body.appendChild(modal);
  }

  // Public API
  return {
    openBookingReceiptModal,
    fetchBookingReceiptData,
    buildReceiptHTML,
    buildReceiptWhatsAppText,
    getReceiptDocTitle,
    printBookingReceipt
  };

})();

// Global alias
window.openBookingReceiptModal = window.BOOKING_RECEIPT_ENGINE.openBookingReceiptModal;
window.printBookingReceipt = window.BOOKING_RECEIPT_ENGINE.printBookingReceipt;
window.getReceiptDocTitle = window.BOOKING_RECEIPT_ENGINE.getReceiptDocTitle;
