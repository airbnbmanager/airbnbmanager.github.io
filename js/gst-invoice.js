/**
 * =====================================================================
 * THE UNIQUE HAVEN HOMES (UHHS) — GST INVOICE & BILLING ENGINE
 * Integrated into Bookings & Guest Ledger with CA Return Management
 * =====================================================================
 */

window.GST_ENGINE = (function() {
  'use strict';

  // 1. COMPANY MASTER CONFIG
  const CO = {
    name:       'THE UNIQUE HAVEN HOMES PRIVATE LIMITED',
    tradeName:  'The Unique Haven Homes Homestays',
    gstin:      '09ABECT9843K1Z7',
    pan:        'ABECT9843K',
    cin:        'U68101UP2026PTC244837',
    sac:        '996311', // Accommodation services in homestays / guest houses
    address:    'P NO 39 & 40 Radhikapuri, Indira Nagar Takrohi, Lucknow, Uttar Pradesh – 226016',
    state:      'Uttar Pradesh',
    stateCode:  '09',
    phone:      '+91 94500 55554',
    email:      'uniquehavenhomestay@gmail.com',
    web:        'uniquehavenhomesstay.com'
  };

  // Signature & Stamp Source Helper
  function getSignatureStampSrc() {
    return localStorage.getItem('uhh_custom_signature_stamp') || 'assets/signature-stamp.svg';
  }

  function handleSignatureUpload(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      localStorage.setItem('uhh_custom_signature_stamp', e.target.result);
      alert('✅ Real Signature & Stamp uploaded! Ab se yeh aapke sabhi bills aur print par automatically aayega.');
      if (typeof window._gstRecompute === 'function') window._gstRecompute();
    };
    reader.readAsDataURL(file);
  }

  function resetSignatureStamp() {
    if (confirm('Kya aap default digital signature stamp par reset karna chahte hain?')) {
      localStorage.removeItem('uhh_custom_signature_stamp');
      alert('Default digital seal & signature restored.');
      if (typeof window._gstRecompute === 'function') window._gstRecompute();
    }
  }

  // 2. HELPER: FINANCIAL YEAR
  function getFY(d) {
    const date = d ? new Date(d) : new Date();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return m >= 4
      ? String(y).slice(2) + String(y + 1).slice(2)
      : String(y - 1).slice(2) + String(y).slice(2);
  }

  // 3. HELPER: NEXT INVOICE NUMBER
  function getNextInvoiceNo(dateStr) {
    const fy = getFY(dateStr);
    const key = 'uhh_inv_seq_' + fy;
    let seq = parseInt(localStorage.getItem(key) || localStorage.getItem('uhh_inv_seq') || '0', 10) + 1;
    return `UHH/${fy}/${String(seq).padStart(4, '0')}`;
  }

  function commitNextInvoiceSeq(dateStr) {
    const fy = getFY(dateStr);
    const key = 'uhh_inv_seq_' + fy;
    let seq = parseInt(localStorage.getItem(key) || localStorage.getItem('uhh_inv_seq') || '0', 10) + 1;
    localStorage.setItem(key, String(seq));
    localStorage.setItem('uhh_inv_seq', String(seq));
    return seq;
  }

  // 4. NUMBER TO WORDS (INDIAN RUPEES)
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
    const p = Math.round((n - r) * 100);
    return 'Rupees ' + c(r) + (p ? ' and ' + c(p) + ' Paise' : '') + ' Only';
  }

  // 5. LOCAL STORAGE CACHE HELPERS
  const LS_INVOICES_KEY = 'uhh_gst_invoices_registry';

  function getLocalInvoices() {
    try {
      return JSON.parse(localStorage.getItem(LS_INVOICES_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveLocalInvoice(inv) {
    const list = getLocalInvoices();
    const idx = list.findIndex(x => x.booking_id === inv.booking_id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...inv, updated_at: new Date().toISOString() };
    } else {
      list.unshift({ ...inv, created_at: new Date().toISOString() });
    }
    localStorage.setItem(LS_INVOICES_KEY, JSON.stringify(list));
  }

  // 6. FETCH INVOICE FOR A BOOKING
  async function getInvoice(bookingId) {
    // 1. Try Supabase
    if (typeof sb !== 'undefined' && sb) {
      try {
        const { data, error } = await sb.from('gst_invoices')
          .select('*')
          .eq('booking_id', bookingId)
          .maybeSingle();
        if (!error && data) {
          saveLocalInvoice(data); // Sync local
          return data;
        }
      } catch (err) {
        console.warn('Supabase gst_invoices fetch issue:', err);
      }
    }
    // 2. Fallback to LocalStorage
    const list = getLocalInvoices();
    return list.find(x => x.booking_id === bookingId) || null;
  }

  // 7. PERSIST INVOICE (SUPABASE + LOCAL STORAGE)
  async function persistInvoice(inv) {
    saveLocalInvoice(inv);

    let dbSuccess = false;
    let dbMsg = '';

    if (typeof sb !== 'undefined' && sb) {
      try {
        const payload = {
          booking_id:     inv.booking_id,
          invoice_no:     inv.invoice_no,
          invoice_date:   inv.invoice_date,
          is_gst_invoice: inv.is_gst_invoice === true,
          guest_name:     inv.guest_name,
          guest_phone:    inv.guest_phone || null,
          guest_gstin:    inv.guest_gstin || null,
          guest_company:  inv.guest_company || null,
          guest_address:  inv.guest_address || null,
          room_id:        inv.room_id || null,
          room_name:      inv.room_name || null,
          check_in:       inv.check_in || null,
          check_out:      inv.check_out || null,
          nights:         inv.nights || 1,
          total_amount:   Number(inv.total_amount || 0),
          taxable_value:  Number(inv.taxable_value || 0),
          cgst:           Number(inv.cgst || 0),
          sgst:           Number(inv.sgst || 0),
          gst_rate:       Number(inv.gst_rate || 0),
          sac_code:       CO.sac,
          booking_mode:   inv.booking_mode || 'Direct',
          status:         inv.is_gst_invoice ? 'Recorded for CA' : 'Draft / Non-GST Receipt',
          airbnb_code:    inv.airbnb_code || null,
          updated_at:     new Date().toISOString()
        };

        const { error } = await sb.from('gst_invoices')
          .upsert(payload, { onConflict: 'booking_id' });

        if (error) {
          console.warn('gst_invoices upsert error:', error);
          dbMsg = error.message;
        } else {
          dbSuccess = true;
        }
      } catch (e) {
        console.warn('gst_invoices DB error:', e);
        dbMsg = e.message;
      }
    }

    return { success: true, dbSaved: dbSuccess, dbMsg };
  }

  // 8. CALCULATIONS
  function calculateGST(totalAmount, nights, rateOverride) {
    const n = Math.max(1, parseInt(nights || 1, 10));
    const tot = Math.max(0, parseFloat(totalAmount || 0));
    const perNight = tot / n;

    // Rate: 56th GST Council rule: <= 7500 -> 5%, > 7500 -> 18%
    let rate = 5;
    if (rateOverride !== undefined && rateOverride !== null && rateOverride !== '') {
      rate = parseFloat(rateOverride);
    } else {
      rate = perNight <= 7500 ? 5 : 18;
    }

    const halfRate = rate / 2;
    // Base amount backwards from total inclusive:
    const base = rate > 0 ? Math.round(tot / (1 + rate / 100)) : tot;
    const gstAmt = tot - base;
    const cgst = Math.round(gstAmt / 2);
    const sgst = gstAmt - cgst;

    return {
      nights: n,
      total: tot,
      perNight: Math.round(perNight),
      rate: rate,
      halfRate: halfRate,
      base: base,
      gstAmt: gstAmt,
      cgst: cgst,
      sgst: sgst,
      itcAllowed: rate > 5
    };
  }

  // 9. BUILD FULL A4 PRINTABLE INVOICE HTML
  function buildPrintableInvoiceHTML(inv) {
    const isGST = inv.is_gst_invoice === true;
    const invDateFmt = inv.invoice_date
      ? new Date(inv.invoice_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const checkInFmt = inv.check_in
      ? new Date(inv.check_in + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';
    const checkOutFmt = inv.check_out
      ? new Date(inv.check_out + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';

    const words = numToWords(inv.total_amount);
    const basePerNight = inv.nights ? Math.round(inv.taxable_value / inv.nights) : inv.taxable_value;

    return `
      <div class="uhh-invoice-document" style="font-family:'Inter',Arial,Helvetica,sans-serif;color:#0F172A;background:#fff;max-width:800px;margin:0 auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
        <!-- Top Gold Rule -->
        <div style="height:6px;background:linear-gradient(90deg,#B45309,#D97706,#F59E0B,#D97706,#B45309);"></div>

        <!-- Header -->
        <div style="padding:22px 26px 18px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #E2E8F0;background:#fff;">
          <div style="display:flex;align-items:flex-start;gap:14px;">
            <img src="assets/logo.png" alt="UHH Logo" style="width:58px;height:58px;border-radius:10px;object-fit:contain;background:#F8FAFC;border:1.5px solid #E2E8F0;padding:3px;flex-shrink:0;"/>
            <div>
              <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#B45309;margin-bottom:2px;">The Unique Haven Homes</div>
              <div style="font-size:16px;font-weight:900;letter-spacing:0.2px;color:#0F172A;line-height:1.2;">PRIVATE LIMITED</div>
              <div style="font-size:11px;color:#64748B;margin-top:4px;line-height:1.6;">
                ${CO.address}<br/>
                📞 ${CO.phone} &nbsp;|&nbsp; ✉️ ${CO.email}
              </div>
            </div>
          </div>

          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:22px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#0F172A;">
              ${isGST ? 'TAX INVOICE' : 'BOOKING RECEIPT'}
            </div>
            <div style="display:inline-block;background:${isGST ? '#B45309' : '#0284C7'};color:#fff;padding:2px 10px;border-radius:5px;font-size:10px;font-weight:800;letter-spacing:0.8px;margin:4px 0 8px;">
              ${isGST ? 'GST COMPLIANT (B2C/B2B)' : 'CUSTOMER ESTIMATE / RECEIPT'}
            </div>
            <table style="margin-left:auto;border-collapse:collapse;font-size:11.5px;">
              <tr>
                <td style="padding:2px 8px 2px 0;color:#64748B;font-weight:600;">Invoice No:</td>
                <td style="padding:2px 0;font-weight:800;color:#0F172A;">${escapeHtml(inv.invoice_no)}</td>
              </tr>
              <tr>
                <td style="padding:2px 8px 2px 0;color:#64748B;font-weight:600;">Date:</td>
                <td style="padding:2px 0;font-weight:700;">${invDateFmt}</td>
              </tr>
              ${isGST ? `
              <tr>
                <td style="padding:2px 8px 2px 0;color:#64748B;font-weight:600;">GSTIN:</td>
                <td style="padding:2px 0;font-weight:800;color:#0F172A;">${CO.gstin}</td>
              </tr>
              <tr>
                <td style="padding:2px 8px 2px 0;color:#64748B;font-weight:600;">State:</td>
                <td style="padding:2px 0;font-weight:700;">${CO.state} (${CO.stateCode})</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding:2px 8px 2px 0;color:#64748B;font-weight:600;">Booking Ref:</td>
                <td style="padding:2px 0;font-weight:700;color:#2563EB;">${escapeHtml(inv.booking_id)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Supplier & Recipient Strip -->
        <div style="display:grid;grid-template-columns:1fr 1fr;background:#F8FAFC;border-bottom:1px solid #E2E8F0;">
          <!-- Supplier -->
          <div style="padding:14px 22px;border-right:1px solid #E2E8F0;">
            <div style="font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#B45309;margin-bottom:6px;">▸ Supplier (Billed By)</div>
            <div style="font-size:12.5px;font-weight:800;margin-bottom:3px;">${CO.name}</div>
            <div style="font-size:11px;color:#475569;line-height:1.6;">
              GSTIN: <strong>${CO.gstin}</strong><br/>
              PAN: <strong>${CO.pan}</strong> &nbsp;|&nbsp; CIN: ${CO.cin}<br/>
              SAC Code: <strong>${CO.sac}</strong> (Homestay Accommodation)
            </div>
          </div>

          <!-- Guest -->
          <div style="padding:14px 22px;">
            <div style="font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#0F172A;margin-bottom:6px;">▸ Recipient (Billed To)</div>
            <div style="font-size:14px;font-weight:900;color:#0F172A;margin-bottom:3px;">${escapeHtml(inv.guest_name || 'Guest')}</div>
            <div style="font-size:11px;color:#475569;line-height:1.6;">
              ${inv.guest_phone ? `📞 Phone: <strong>${escapeHtml(inv.guest_phone)}</strong><br/>` : ''}
              ${inv.guest_gstin ? `<span style="background:#DCFCE7;color:#15803D;padding:1px 6px;border-radius:4px;font-weight:800;font-size:10px;">Guest GSTIN: ${escapeHtml(inv.guest_gstin)}</span><br/>` : 'Type: <strong>Consumer / B2C</strong><br/>'}
              ${inv.guest_company ? `Company: <strong>${escapeHtml(inv.guest_company)}</strong><br/>` : ''}
              ${inv.guest_address ? `Address: ${escapeHtml(inv.guest_address)}<br/>` : ''}
              Place of Supply: <strong>${CO.state} (${CO.stateCode})</strong>
            </div>
          </div>
        </div>

        <!-- Service Line Items Table -->
        <div style="padding:16px 22px 0;">
          <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
            <thead>
              <tr style="background:#0F172A;color:#fff;">
                <th style="padding:9px 10px;text-align:left;font-weight:700;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;">#</th>
                <th style="padding:9px 10px;text-align:left;font-weight:700;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;">Description of Service</th>
                <th style="padding:9px 8px;text-align:center;font-weight:700;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;">SAC</th>
                <th style="padding:9px 8px;text-align:center;font-weight:700;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;">Nights</th>
                <th style="padding:9px 8px;text-align:right;font-weight:700;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;">Rate/Night</th>
                <th style="padding:9px 10px;text-align:right;font-weight:700;font-size:10px;letter-spacing:0.5px;text-transform:uppercase;">Taxable Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:12px 10px;border-bottom:1px solid #E2E8F0;color:#64748B;font-weight:700;">01</td>
                <td style="padding:12px 10px;border-bottom:1px solid #E2E8F0;">
                  <div style="font-weight:800;font-size:12.5px;color:#0F172A;margin-bottom:3px;">
                    ${escapeHtml(inv.room_name || inv.room_id || 'Short-Stay Accommodation')}
                  </div>
                  <div style="font-size:10.5px;color:#475569;line-height:1.6;">
                    Short-Stay Homestay Living Service<br/>
                    Check-in: <strong>${checkInFmt}</strong> &nbsp;→&nbsp; Check-out: <strong>${checkOutFmt}</strong><br/>
                    Channel: <strong>${escapeHtml(inv.booking_mode || 'Direct Booking')}</strong>
                  </div>
                </td>
                <td style="padding:12px 8px;border-bottom:1px solid #E2E8F0;text-align:center;font-weight:700;">${CO.sac}</td>
                <td style="padding:12px 8px;border-bottom:1px solid #E2E8F0;text-align:center;font-weight:800;font-size:13px;">${inv.nights}</td>
                <td style="padding:12px 8px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:700;">₹${basePerNight.toLocaleString('en-IN')}</td>
                <td style="padding:12px 10px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:800;font-size:13px;">₹${Number(inv.taxable_value || 0).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totals & Payment Summary Box -->
        <div style="display:grid;grid-template-columns:1fr 280px;margin:14px 22px 0;border:1px solid #E2E8F0;border-radius:10px;overflow:hidden;">
          <!-- Left: Payment info & Words -->
          <div style="padding:14px 16px;border-right:1px solid #E2E8F0;background:#FAFAFA;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;margin-bottom:8px;">Payment & Settlement</div>
              <div style="font-size:11.5px;color:#334155;line-height:1.8;">
                Payment Mode: <strong>${escapeHtml(inv.payment_mode || 'Direct (UPI / Cash / Bank)')}</strong><br/>
                Payment Status: <span style="background:#DCFCE7;color:#15803D;padding:1px 7px;border-radius:4px;font-weight:800;font-size:10.5px;">✅ FULLY PAID</span>
              </div>
              <div style="margin-top:10px;padding:8px 10px;background:#F0FDF4;border-radius:6px;border:1px solid #BBF7D0;">
                <div style="font-size:9.5px;font-weight:800;color:#15803D;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Amount in Words</div>
                <div style="font-size:11.5px;font-weight:800;color:#0F172A;">${words}</div>
              </div>
            </div>

            ${isGST ? `
            <div style="margin-top:10px;font-size:10px;color:#B45309;background:#FEF3C7;padding:6px 10px;border-radius:6px;border:1px solid #FDE68A;">
              ${inv.gst_rate === 5
                ? '⚠️ GST @ 5% slab: Input Tax Credit (ITC) is NOT admissible on this supply (Notification No. 11/2017-CT(R)).'
                : '✅ GST @ 18% slab: Input Tax Credit (ITC) is admissible for eligible registered B2B entities.'}
            </div>
            ` : `
            <div style="margin-top:10px;font-size:10px;color:#0284C7;background:#E0F2FE;padding:6px 10px;border-radius:6px;border:1px solid #BAE6FD;">
              ℹ️ Guest receipt / estimate generated for accommodation records.
            </div>
            `}
          </div>

          <!-- Right: GST calculation box -->
          <div>
            <table style="width:100%;border-collapse:collapse;font-size:11.5px;height:100%;">
              <tr style="background:#F8FAFC;">
                <td style="padding:8px 12px;color:#475569;font-weight:600;">Taxable Value</td>
                <td style="padding:8px 12px;text-align:right;font-weight:700;">₹${Number(inv.taxable_value || 0).toLocaleString('en-IN')}</td>
              </tr>
              ${isGST ? `
              <tr>
                <td style="padding:8px 12px;color:#475569;font-weight:600;">CGST @ ${(inv.gst_rate / 2)}%</td>
                <td style="padding:8px 12px;text-align:right;font-weight:700;">₹${Number(inv.cgst || 0).toLocaleString('en-IN')}</td>
              </tr>
              <tr style="background:#F8FAFC;">
                <td style="padding:8px 12px;color:#475569;font-weight:600;">SGST @ ${(inv.gst_rate / 2)}%</td>
                <td style="padding:8px 12px;text-align:right;font-weight:700;">₹${Number(inv.sgst || 0).toLocaleString('en-IN')}</td>
              </tr>
              ` : `
              <tr>
                <td style="padding:8px 12px;color:#64748B;font-weight:600;">GST / Taxes</td>
                <td style="padding:8px 12px;text-align:right;font-weight:700;color:#64748B;">Included</td>
              </tr>
              `}
              <tr style="background:#0F172A;">
                <td style="padding:11px 12px;font-weight:900;color:#fff;font-size:13px;">GRAND TOTAL</td>
                <td style="padding:11px 12px;text-align:right;font-weight:900;color:#F59E0B;font-size:15px;">₹${Number(inv.total_amount || 0).toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Terms & Notes -->
        <div style="margin:12px 22px 0;padding:10px 14px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;font-size:9.5px;color:#64748B;line-height:1.7;">
          <strong style="color:#0F172A;display:block;margin-bottom:2px;">📜 Statutory Declarations &amp; Terms:</strong>
          1. This is a computer-generated ${isGST ? 'GST Tax Invoice' : 'Homestay Receipt'}. &nbsp;|&nbsp;
          2. Short-stay Accommodation Service (SAC Code: ${CO.sac}). &nbsp;|&nbsp;
          3. Place of Supply: ${CO.state} (${CO.stateCode}) — CGST &amp; SGST applicable under CGST Act, 2017. &nbsp;|&nbsp;
          4. All guest check-in &amp; ID documents are verified as per local tourist regulations. &nbsp;|&nbsp;
          5. Jurisdiction: All disputes subject to Lucknow, UP jurisdiction only.
        </div>

        <!-- Footer Signature Strip -->
        <div style="margin:14px 22px 18px;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:flex-end;">
          <div style="font-size:9.5px;color:#94A3B8;line-height:1.6;">
            <div style="font-weight:800;color:#475569;margin-bottom:2px;">${CO.name}</div>
            CIN: ${CO.cin} &nbsp;|&nbsp; PAN: ${CO.pan}<br/>
            ${CO.web}
          </div>
          <div style="text-align:right;">
            <div style="position:relative;display:inline-block;text-align:right;min-height:56px;">
              <img src="${getSignatureStampSrc()}" alt="Stamp & Signature" style="height:62px;max-width:210px;object-fit:contain;margin-bottom:-12px;display:block;margin-left:auto;"/>
              <div style="height:1px;border-bottom:1px dashed #CBD5E1;width:170px;margin-left:auto;"></div>
              <div style="font-size:9.5px;color:#64748B;margin-top:4px;">Authorised Signatory</div>
              <div style="font-size:10.5px;font-weight:800;color:#0F172A;">For ${CO.name}</div>
            </div>
          </div>
        </div>

        <!-- Bottom Gold Rule -->
        <div style="height:5px;background:linear-gradient(90deg,#B45309,#D97706,#F59E0B,#D97706,#B45309);"></div>
      </div>
    `;
  }

  // 10. PRINT / PDF TRIGGER
  function printInvoiceDocument(inv) {
    const html = buildPrintableInvoiceHTML(inv);
    const win = window.open('', '_blank', 'width=900,height=800');
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this website to print the GST Invoice.');
      return;
    }
    win.document.write(`<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${escapeHtml(inv.invoice_no)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          body { margin: 0; padding: 10px; background: #fff; font-family: 'Inter', Arial, sans-serif; }
          .uhh-invoice-document { box-shadow: none !important; border: 1px solid #D1D5DB !important; }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>`);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 600);
  }

  // 11. ESCAPE HTML HELPER
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  // 12. WHATSAPP SHARE GENERATOR
  function shareInvoiceWhatsApp(inv) {
    const isGST = inv.is_gst_invoice;
    const phone = (inv.guest_phone || '').replace(/\D/g, '');
    const cleanPhone = phone.length === 10 ? '91' + phone : phone;

    const text = `*THE UNIQUE HAVEN HOMES PVT. LTD.*%0A` +
      `🧾 *${isGST ? 'TAX INVOICE' : 'BOOKING RECEIPT'}*%0A` +
      `──────────────────────────%0A` +
      `*Invoice No:* ${encodeURIComponent(inv.invoice_no)}%0A` +
      `*Date:* ${encodeURIComponent(inv.invoice_date || '')}%0A` +
      `*Guest:* ${encodeURIComponent(inv.guest_name || 'Guest')}%0A` +
      `*Stay:* ${encodeURIComponent(inv.room_name || inv.room_id || 'Property')}%0A` +
      `*Dates:* ${encodeURIComponent(inv.check_in || '')} to ${encodeURIComponent(inv.check_out || '')} (${inv.nights} Night${inv.nights > 1 ? 's' : ''})%0A` +
      `──────────────────────────%0A` +
      `*Taxable Value:* ₹${Number(inv.taxable_value || 0).toLocaleString('en-IN')}%0A` +
      (isGST ? `*GST Rate:* ${inv.gst_rate}% (CGST ₹${Number(inv.cgst || 0).toLocaleString('en-IN')} + SGST ₹${Number(inv.sgst || 0).toLocaleString('en-IN')})%0A` : '') +
      `*Total Paid:* ₹${Number(inv.total_amount || 0).toLocaleString('en-IN')}%0A` +
      `*Status:* ✅ FULLY PAID%0A` +
      `──────────────────────────%0A` +
      (isGST ? `*GSTIN:* ${CO.gstin}%0A*SAC:* ${CO.sac}%0A` : '') +
      `Thank you for choosing The Unique Haven Homes! 🙏`;

    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;

    window.open(url, '_blank');
  }

  // 13. CA EXPORT CSV (GSTR-1 READY)
  function exportCAGSTReportCSV(filteredList) {
    const list = filteredList || getLocalInvoices().filter(x => x.is_gst_invoice === true);
    if (!list.length) {
      alert('No official GST invoices found to export for CA.');
      return;
    }

    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Booking ID',
      'Customer Name',
      'Customer Phone',
      'Customer GSTIN',
      'Place of Supply',
      'Reverse Charge',
      'Invoice Type',
      'SAC Code',
      'Nights',
      'Rate %',
      'Taxable Value (₹)',
      'CGST (₹)',
      'SGST (₹)',
      'Total Invoice Value (₹)',
      'Payment Status',
      'CA Record Status'
    ];

    const rows = list.map(i => [
      `"${i.invoice_no || ''}"`,
      `"${i.invoice_date || ''}"`,
      `"${i.booking_id || ''}"`,
      `"${(i.guest_name || '').replace(/"/g, '""')}"`,
      `"${i.guest_phone || ''}"`,
      `"${i.guest_gstin || 'B2C'}"`,
      `"Uttar Pradesh (09)"`,
      `"N"`,
      `"${i.guest_gstin ? 'B2B' : 'B2C (Small)'}"`,
      `"${i.sac_code || CO.sac}"`,
      i.nights || 1,
      `${i.gst_rate || 5}%`,
      Number(i.taxable_value || 0).toFixed(2),
      Number(i.cgst || 0).toFixed(2),
      Number(i.sgst || 0).toFixed(2),
      Number(i.total_amount || 0).toFixed(2),
      `"Paid"`,
      `"${i.status || 'Recorded for CA'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `UHH_GST_Register_CA_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // 14. CA SUMMARY MODAL
  function openCARegisterModal() {
    const allInvs = getLocalInvoices();
    const gstOnly = allInvs.filter(x => x.is_gst_invoice === true);

    const totalTurnover = gstOnly.reduce((s, x) => s + Number(x.total_amount || 0), 0);
    const totalTaxable = gstOnly.reduce((s, x) => s + Number(x.taxable_value || 0), 0);
    const totalCGST = gstOnly.reduce((s, x) => s + Number(x.cgst || 0), 0);
    const totalSGST = gstOnly.reduce((s, x) => s + Number(x.sgst || 0), 0);
    const totalTax = totalCGST + totalSGST;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    modal.innerHTML = `
      <div class="modal-box" style="max-width:850px;width:95%;max-height:90vh;display:flex;flex-direction:column;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--border);padding-bottom:14px;margin-bottom:16px;">
          <div>
            <div style="font-size:11px;font-weight:800;color:#B45309;text-transform:uppercase;letter-spacing:1px;">
              CA &amp; Accounts Compliance
            </div>
            <h2 style="margin:2px 0 0;font-size:20px;font-weight:900;color:var(--dark);">
              📊 GST Sales Register &amp; CA Return Summary
            </h2>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">
              ${CO.name} · GSTIN: <strong>${CO.gstin}</strong>
            </div>
          </div>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="font-size:20px;background:none;border:none;cursor:pointer;">✕</button>
        </div>

        <!-- Summary Metric Cards -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
          <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:var(--muted);font-weight:700;">TOTAL GST BILLS</div>
            <div style="font-size:22px;font-weight:900;color:var(--dark);margin-top:2px;">${gstOnly.length}</div>
            <div style="font-size:10px;color:var(--muted);">${allInvs.length - gstOnly.length} non-GST receipts</div>
          </div>
          <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:var(--muted);font-weight:700;">TOTAL TURNOVER</div>
            <div style="font-size:20px;font-weight:900;color:#059669;margin-top:2px;">₹${totalTurnover.toLocaleString('en-IN')}</div>
            <div style="font-size:10px;color:var(--muted);">Gross value billed</div>
          </div>
          <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:10px;padding:12px;">
            <div style="font-size:11px;color:var(--muted);font-weight:700;">TAXABLE VALUE</div>
            <div style="font-size:20px;font-weight:900;color:#2563EB;margin-top:2px;">₹${totalTaxable.toLocaleString('en-IN')}</div>
            <div style="font-size:10px;color:var(--muted);">GSTR-1 Table 7/8 Base</div>
          </div>
          <div style="background:linear-gradient(135deg,#B45309,#D97706);color:#fff;border-radius:10px;padding:12px;">
            <div style="font-size:11px;opacity:0.85;font-weight:700;">TOTAL GST LIABILITY</div>
            <div style="font-size:20px;font-weight:900;margin-top:2px;">₹${totalTax.toLocaleString('en-IN')}</div>
            <div style="font-size:10px;opacity:0.9;">CGST ₹${totalCGST.toLocaleString('en-IN')} + SGST ₹${totalSGST.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <!-- Action bar -->
        <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center;">
          <button class="btn-sm" style="background:#059669;color:#fff;padding:8px 14px;font-weight:700;display:inline-flex;align-items:center;gap:6px;" onclick="window.GST_ENGINE.exportCAGSTReportCSV()">
            📥 Download GSTR-1 CSV for CA
          </button>
          <button class="btn-sm outline" style="padding:8px 14px;font-weight:700;" onclick="window.GST_ENGINE.copyCASummaryText()">
            📋 Copy CA WhatsApp Summary
          </button>
          <span style="margin-left:auto;font-size:11.5px;color:var(--muted);">
            Showing all finalized invoices
          </span>
        </div>

        <!-- Table Wrap -->
        <div style="flex:1;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
            <thead>
              <tr style="background:#F1F5F9;color:var(--dark);position:sticky;top:0;">
                <th style="padding:10px 12px;font-weight:800;">Invoice No</th>
                <th style="padding:10px 12px;font-weight:800;">Date</th>
                <th style="padding:10px 12px;font-weight:800;">Guest Name</th>
                <th style="padding:10px 12px;font-weight:800;">Type</th>
                <th style="padding:10px 12px;font-weight:800;text-align:right;">Taxable</th>
                <th style="padding:10px 12px;font-weight:800;text-align:right;">GST</th>
                <th style="padding:10px 12px;font-weight:800;text-align:right;">Total</th>
                <th style="padding:10px 12px;font-weight:800;text-align:center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${allInvs.length ? allInvs.map(i => {
                const isG = i.is_gst_invoice;
                return `
                  <tr style="border-bottom:1px solid var(--border);background:${isG ? '#fff' : '#F8FAFC'};">
                    <td style="padding:9px 12px;font-weight:800;">${escapeHtml(i.invoice_no)}</td>
                    <td style="padding:9px 12px;color:var(--muted);">${i.invoice_date || '-'}</td>
                    <td style="padding:9px 12px;">
                      <div style="font-weight:700;">${escapeHtml(i.guest_name || 'Guest')}</div>
                      ${i.guest_gstin ? `<span style="font-size:10px;color:#059669;font-weight:700;">GSTIN: ${escapeHtml(i.guest_gstin)}</span>` : ''}
                    </td>
                    <td style="padding:9px 12px;">
                      ${isG ? '<span class="badge" style="background:#DCFCE7;color:#15803D;font-size:10px;font-weight:800;">✅ GST Bill</span>' : '<span class="badge" style="background:#E2E8F0;color:#475569;font-size:10px;">📄 Receipt</span>'}
                    </td>
                    <td style="padding:9px 12px;text-align:right;font-weight:700;">₹${Number(i.taxable_value || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:9px 12px;text-align:right;color:#B45309;font-weight:700;">₹${(Number(i.cgst || 0) + Number(i.sgst || 0)).toLocaleString('en-IN')}</td>
                    <td style="padding:9px 12px;text-align:right;font-weight:800;color:var(--dark);">₹${Number(i.total_amount || 0).toLocaleString('en-IN')}</td>
                    <td style="padding:9px 12px;text-align:center;">
                      <div style="display:flex;gap:4px;justify-content:center;align-items:center;">
                        <button class="btn-sm outline" style="padding:4px 8px;font-size:11px;" onclick="window.GST_ENGINE.printStoredInvoice('${i.booking_id}')">🖨️ PDF</button>
                        <button class="btn-sm outline" style="padding:4px 8px;font-size:11px;color:#DC2626;border-color:#FCA5A5;" onclick="window.GST_ENGINE.deleteInvoice('${i.booking_id}', '${escapeHtml(i.invoice_no)}')">🗑️ Delete</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="8" style="text-align:center;padding:30px;color:var(--muted);">
                    No GST Invoices recorded yet. Open any direct booking to generate its first invoice!
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <div style="margin-top:14px;display:flex;justify-content:flex-end;">
          <button class="btn-sm outline" onclick="this.closest('.modal-overlay').remove()">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // DELETE INVOICE (CA REGISTRY + SUPABASE + LOCALSTORAGE)
  async function deleteInvoice(bookingId, invoiceNo) {
    const invLabel = invoiceNo || bookingId;
    if (!confirm(`⚠️ Kya aap Invoice "${invLabel}" ko delete karna chahte hain?\n\nYeh invoice CA Register aur database se permanently remove ho jayega.`)) {
      return;
    }

    // 1. Remove from LocalStorage
    const list = getLocalInvoices().filter(x => x.booking_id !== bookingId && x.invoice_no !== invoiceNo);
    localStorage.setItem(LS_INVOICES_KEY, JSON.stringify(list));

    // 2. Remove from Supabase
    if (typeof sb !== 'undefined' && sb) {
      try {
        await sb.from('gst_invoices').delete().eq('booking_id', bookingId);
      } catch (e) {
        console.warn('DB delete error:', e);
      }
    }

    alert(`✅ Invoice "${invLabel}" delete kar diya gaya.`);

    // 3. Refresh CA Modal if open
    const openModals = document.querySelectorAll('.modal-overlay');
    openModals.forEach(m => {
      if (m.innerText.includes('GST Sales Register')) {
        m.remove();
        openCARegisterModal();
      }
    });

    // 4. Refresh booking drawer if open
    if (window._sbkState && window._sbkState.drawerBookingId === bookingId && typeof window.openBookingDrawer === 'function') {
      window.openBookingDrawer(bookingId);
    }
  }

  function copyCASummaryText() {
    const list = getLocalInvoices().filter(x => x.is_gst_invoice === true);
    const totalTurnover = list.reduce((s, x) => s + Number(x.total_amount || 0), 0);
    const totalTaxable = list.reduce((s, x) => s + Number(x.taxable_value || 0), 0);
    const totalCGST = list.reduce((s, x) => s + Number(x.cgst || 0), 0);
    const totalSGST = list.reduce((s, x) => s + Number(x.sgst || 0), 0);

    const text = `📊 *THE UNIQUE HAVEN HOMES PVT LTD — GST SUMMARY FOR CA*
GSTIN: ${CO.gstin}
SAC Code: ${CO.sac} (Short-stay accommodation)

Summary of Finalized Tax Invoices:
• Total Invoices: ${list.length}
• Total Turnover (Gross): ₹${totalTurnover.toLocaleString('en-IN')}
• Taxable Value (Base): ₹${totalTaxable.toLocaleString('en-IN')}
• CGST: ₹${totalCGST.toLocaleString('en-IN')}
• SGST: ₹${totalSGST.toLocaleString('en-IN')}
• Total GST Output Tax: ₹${(totalCGST + totalSGST).toLocaleString('en-IN')}

Generated automatically via UHHS Management Portal.`;

    navigator.clipboard.writeText(text).then(() => {
      alert('✅ CA Summary copied to clipboard! You can paste and send directly to your CA.');
    });
  }

  function printStoredInvoice(bookingId) {
    const list = getLocalInvoices();
    const inv = list.find(x => x.booking_id === bookingId);
    if (!inv) {
      alert('Invoice details not found.');
      return;
    }
    printInvoiceDocument(inv);
  }

  // 15. MAIN INTERACTIVE MODAL: OPEN GST INVOICE MODAL
  async function openGSTInvoiceModal(bookingId) {
    if (!bookingId) {
      alert('Please provide a valid Booking ID.');
      return;
    }

    // 1. Find booking from memory or fetch
    let booking = null;
    if (window._sbkState && window._sbkState.cachedBookings) {
      booking = window._sbkState.cachedBookings.find(x => x.booking_id === bookingId);
    }
    if (!booking && typeof sb !== 'undefined' && sb) {
      try {
        const { data } = await sb.from('guest_register')
          .select('*, rooms(nickname, unit_no, rent_per_night, property_name)')
          .eq('booking_id', bookingId)
          .maybeSingle();
        booking = data;
      } catch (e) {
        console.warn('Booking fetch error:', e);
      }
    }

    if (!booking) {
      alert('Booking record not found for ID: ' + bookingId);
      return;
    }

    // 2. Check if already invoiced
    const existing = await getInvoice(bookingId);

    // 3. Compute defaults
    const today = new Date().toISOString().slice(0, 10);
    const n = Math.max(1, (booking.check_in && booking.check_out)
      ? Math.max(1, Math.round((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000))
      : 1);

    const totalAmt = existing ? existing.total_amount : (booking.total_amount || 0);
    const defaultIsGST = existing ? (existing.is_gst_invoice === true) : true;
    const defaultInvNo = existing ? existing.invoice_no : getNextInvoiceNo(today);
    const defaultInvDate = existing ? existing.invoice_date : today;
    const defaultRate = existing ? existing.gst_rate : (totalAmt / n <= 7500 ? 5 : 18);

    // Form state holder
    const state = {
      booking_id: bookingId,
      booking: booking,
      existing: existing,
      is_gst_invoice: defaultIsGST,
      invoice_no: defaultInvNo,
      invoice_date: defaultInvDate,
      guest_name: existing?.guest_name || booking.guest_name || '',
      guest_phone: existing?.guest_phone || booking.phone || '',
      guest_gstin: existing?.guest_gstin || '',
      guest_company: existing?.guest_company || '',
      guest_address: existing?.guest_address || '',
      room_id: booking.room_id || '',
      room_name: booking.rooms?.nickname || booking.rooms?.property_name || booking.room_id || 'Homestay Property',
      check_in: booking.check_in || '',
      check_out: booking.check_out || '',
      nights: n,
      total_amount: totalAmt,
      gst_rate: defaultRate,
      booking_mode: booking.booking_mode || (booking.airbnb_confirmation_code ? 'Online-Airbnb' : 'Direct'),
      payment_mode: 'Direct Payment (Cash / UPI / Bank)',
      activeTab: 'edit' // 'edit' or 'preview'
    };

    // Modal DOM
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'uhhGSTInvoiceModal';
    modal.style.zIndex = '99998';
    modal.onclick = e => { if (e.target === modal) modal.remove(); };

    function renderModalContent() {
      const calc = calculateGST(state.total_amount, state.nights, state.gst_rate);
      state.taxable_value = calc.base;
      state.cgst = calc.cgst;
      state.sgst = calc.sgst;

      const isAirbnb = state.booking_mode === 'Online-Airbnb' || !!booking.airbnb_confirmation_code;

      modal.innerHTML = `
        <div class="modal-box" style="max-width:820px;width:95%;max-height:92vh;display:flex;flex-direction:column;padding:22px;border-radius:14px;background:#fff;box-shadow:0 20px 40px rgba(0,0,0,0.2);">
          
          <!-- Top Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:14px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:18px;">🧾</span>
                <h2 style="margin:0;font-size:19px;font-weight:900;color:var(--dark);">
                  GST Invoice &amp; Tax Bill Manager
                </h2>
                ${state.existing ? '<span class="badge" style="background:#DCFCE7;color:#15803D;font-size:11px;font-weight:800;">✔ Already Invoiced</span>' : '<span class="badge" style="background:#FEF3C7;color:#B45309;font-size:11px;font-weight:700;">Draft</span>'}
              </div>
              <div style="font-size:12px;color:var(--muted);margin-top:2px;">
                Ref: <strong>${escapeHtml(booking.booking_id)}</strong> · Guest: <strong>${escapeHtml(state.guest_name)}</strong> · Room: <strong>${escapeHtml(state.room_name)}</strong>
              </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <button class="btn-sm outline" style="padding:6px 10px;font-size:11.5px;font-weight:700;" onclick="window.GST_ENGINE.openCARegisterModal()">
                📊 View All CA Records
              </button>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="font-size:20px;background:none;border:none;cursor:pointer;padding:4px 8px;">✕</button>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div style="display:flex;gap:8px;border-bottom:1px solid var(--border);padding-bottom:10px;margin-bottom:14px;">
            <button class="btn-sm ${state.activeTab === 'edit' ? 'primary' : 'outline'}" style="padding:7px 16px;font-weight:700;border-radius:8px;background:${state.activeTab === 'edit' ? 'var(--dark)' : '#fff'};color:${state.activeTab === 'edit' ? '#fff' : 'var(--dark)'};" onclick="window._gstSetTab('edit')">
              📝 Configure &amp; Options
            </button>
            <button class="btn-sm ${state.activeTab === 'preview' ? 'primary' : 'outline'}" style="padding:7px 16px;font-weight:700;border-radius:8px;background:${state.activeTab === 'preview' ? 'var(--dark)' : '#fff'};color:${state.activeTab === 'preview' ? '#fff' : 'var(--dark)'};" onclick="window._gstSetTab('preview')">
              👁️ A4 Print Preview
            </button>
          </div>

          <!-- Body Container -->
          <div style="flex:1;overflow-y:auto;padding-right:4px;">
            ${state.activeTab === 'edit' ? `

              ${isAirbnb ? `
                <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;gap:10px;align-items:center;">
                  <span style="font-size:22px;">ℹ️</span>
                  <div style="font-size:12px;color:#92400E;line-height:1.5;">
                    <strong>Airbnb Booking Detected:</strong> Under GST Section 9(5), Airbnb collects and remits GST directly on accommodation bookings. For CA filings, only <strong>Direct Bookings</strong> (Direct/Walk-in) typically need host GST output billing. You can still generate a bill if guest explicitly requested it.
                  </div>
                </div>
              ` : ''}

              <!-- ⭐️ USER'S CORE REQUIREMENT: QUESTION TOGGLE -->
              <div style="background:#F8FAFC;border:2px solid #B45309;border-radius:12px;padding:16px;margin-bottom:16px;">
                <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#B45309;margin-bottom:4px;">
                  📌 Statutory Classification Question
                </div>
                <div style="font-size:14px;font-weight:800;color:var(--dark);margin-bottom:4px;">
                  Kya ye official GST Tax Invoice rahega? (CA Return &amp; Customer Record)
                </div>
                <div style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.5;">
                  <strong>HAAN</strong> karne par iska proper record CA ke liye GSTR-1 / GSTR-3B tax return me banega aur official invoice number assign hoga. <strong>NAHI</strong> karne par yeh sirf customer internal receipt rahega.
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                  <label style="border:2px solid ${state.is_gst_invoice ? '#059669' : 'var(--border)'};background:${state.is_gst_invoice ? '#F0FDF4' : '#fff'};border-radius:10px;padding:12px;cursor:pointer;display:flex;align-items:flex-start;gap:10px;transition:all 0.15s;">
                    <input type="radio" name="is_gst_choice" value="yes" ${state.is_gst_invoice ? 'checked' : ''} onchange="window._gstSetIsGST(true)" style="margin-top:3px;"/>
                    <div>
                      <div style="font-weight:800;font-size:13px;color:${state.is_gst_invoice ? '#059669' : 'var(--dark)'};">
                        ✅ HAAN — Official GST Tax Invoice
                      </div>
                      <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                        Record for CA · Assign Tax Serial No · Full CGST/SGST Breakdown
                      </div>
                    </div>
                  </label>

                  <label style="border:2px solid ${!state.is_gst_invoice ? '#2563EB' : 'var(--border)'};background:${!state.is_gst_invoice ? '#EFF6FF' : '#fff'};border-radius:10px;padding:12px;cursor:pointer;display:flex;align-items:flex-start;gap:10px;transition:all 0.15s;">
                    <input type="radio" name="is_gst_choice" value="no" ${!state.is_gst_invoice ? 'checked' : ''} onchange="window._gstSetIsGST(false)" style="margin-top:3px;"/>
                    <div>
                      <div style="font-weight:800;font-size:13px;color:${!state.is_gst_invoice ? '#2563EB' : 'var(--dark)'};">
                        📄 NAHI — Customer Receipt / Estimate
                      </div>
                      <div style="font-size:11px;color:var(--muted);margin-top:2px;">
                        Internal guest bill · Exclude from CA GSTR-1 register
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Invoice Metadata Grid -->
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px;">Invoice Number</label>
                  <input type="text" id="gstInpInvNo" value="${escapeHtml(state.invoice_no)}" class="input-sm" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;font-weight:800;font-size:13px;" onchange="state.invoice_no=this.value"/>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px;">Invoice Date</label>
                  <input type="date" id="gstInpInvDate" value="${state.invoice_date}" class="input-sm" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;font-weight:700;font-size:12.5px;" onchange="state.invoice_date=this.value"/>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px;">Place of Supply</label>
                  <input type="text" value="Uttar Pradesh (09)" readonly class="input-sm" style="width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:8px;background:#F8FAFC;color:var(--muted);font-weight:700;font-size:12.5px;"/>
                </div>
              </div>

              <!-- Guest / Customer Details -->
              <div style="border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px;">
                <div style="font-size:12px;font-weight:800;color:var(--dark);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                  <span>👤 Guest / Customer Billed To</span>
                  <span style="font-size:10px;color:var(--muted);font-weight:normal;">(Corporate guests can provide GSTIN for Input Tax Credit)</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">
                  <div>
                    <label style="display:block;font-size:10.5px;color:var(--muted);margin-bottom:2px;">Guest Full Name</label>
                    <input type="text" id="gstInpName" value="${escapeHtml(state.guest_name)}" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;font-weight:700;" onchange="state.guest_name=this.value"/>
                  </div>
                  <div>
                    <label style="display:block;font-size:10.5px;color:var(--muted);margin-bottom:2px;">Guest Phone</label>
                    <input type="text" id="gstInpPhone" value="${escapeHtml(state.guest_phone)}" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;font-weight:700;" onchange="state.guest_phone=this.value"/>
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                  <div>
                    <label style="display:block;font-size:10.5px;color:var(--muted);margin-bottom:2px;">Guest GSTIN (Optional B2B)</label>
                    <input type="text" id="gstInpGSTIN" value="${escapeHtml(state.guest_gstin)}" placeholder="e.g. 09ABECT9843K1Z7" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;text-transform:uppercase;" onchange="state.guest_gstin=this.value.trim().toUpperCase()"/>
                  </div>
                  <div>
                    <label style="display:block;font-size:10.5px;color:var(--muted);margin-bottom:2px;">Company / Entity Name (Optional)</label>
                    <input type="text" id="gstInpCompany" value="${escapeHtml(state.guest_company)}" placeholder="e.g. Acme Tech Pvt Ltd" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;" onchange="state.guest_company=this.value"/>
                  </div>
                </div>
              </div>

              <!-- Financial & GST Computation Card -->
              <div style="border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:14px;">
                <div style="font-size:12px;font-weight:800;color:var(--dark);margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                  <span>💰 Stay Value &amp; GST Computation (SAC: 996311)</span>
                  <span style="font-size:11px;color:#B45309;font-weight:700;">Rate per night: ₹${calc.perNight.toLocaleString('en-IN')}</span>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
                  <div>
                    <label style="display:block;font-size:10.5px;color:var(--muted);margin-bottom:2px;">Total Bill Amount (₹)</label>
                    <input type="number" id="gstInpTotal" value="${state.total_amount}" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;font-weight:800;color:#059669;" oninput="state.total_amount=parseFloat(this.value)||0;window._gstRecompute();"/>
                  </div>
                  <div>
                    <label style="display:block;font-size:10.5px;color:var(--muted);margin-bottom:2px;">Total Nights</label>
                    <input type="number" id="gstInpNights" value="${state.nights}" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;font-weight:700;" oninput="state.nights=parseInt(this.value,10)||1;window._gstRecompute();"/>
                  </div>
                  <div>
                    <label style="display:block;font-size:10.5px;color:var(--muted);margin-bottom:2px;">GST Rate Slab</label>
                    <select id="gstInpRate" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;font-weight:700;" onchange="state.gst_rate=parseFloat(this.value);window._gstRecompute();">
                      <option value="5" ${state.gst_rate === 5 ? 'selected' : ''}>5% (Per night ≤ ₹7,500 - No ITC)</option>
                      <option value="18" ${state.gst_rate === 18 ? 'selected' : ''}>18% (Per night &gt; ₹7,500 - With ITC)</option>
                      <option value="12" ${state.gst_rate === 12 ? 'selected' : ''}>12% (Custom slab)</option>
                      <option value="0" ${state.gst_rate === 0 ? 'selected' : ''}>0% (Exempt)</option>
                    </select>
                  </div>
                </div>

                <!-- Breakdown summary preview -->
                <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:8px;padding:12px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;text-align:center;">
                  <div>
                    <div style="font-size:10px;color:var(--muted);font-weight:700;">TAXABLE VALUE</div>
                    <div style="font-size:15px;font-weight:800;color:var(--dark);margin-top:2px;">₹${calc.base.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div style="font-size:10px;color:var(--muted);font-weight:700;">CGST (${calc.halfRate}%)</div>
                    <div style="font-size:15px;font-weight:800;color:#B45309;margin-top:2px;">₹${calc.cgst.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div style="font-size:10px;color:var(--muted);font-weight:700;">SGST (${calc.halfRate}%)</div>
                    <div style="font-size:15px;font-weight:800;color:#B45309;margin-top:2px;">₹${calc.sgst.toLocaleString('en-IN')}</div>
                  </div>
                  <div style="background:#0F172A;color:#fff;border-radius:6px;padding:6px;">
                    <div style="font-size:10px;color:rgba(255,255,255,0.7);font-weight:700;">GRAND TOTAL</div>
                    <div style="font-size:15px;font-weight:900;color:#F59E0B;margin-top:2px;">₹${calc.total.toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>

              <!-- Digital Signature & Company Seal Bar -->
              <div style="margin-top:14px;padding:12px 14px;background:#F8FAFC;border:1px dashed var(--border);border-radius:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <img src="${getSignatureStampSrc()}" style="height:36px;max-width:110px;object-fit:contain;background:#fff;border:1px solid #E2E8F0;border-radius:6px;padding:2px;" alt="Stamp & Signature"/>
                  <div>
                    <div style="font-size:12px;font-weight:800;color:var(--dark);">🖋️ Digital Seal &amp; Authorised Signature</div>
                    <div style="font-size:11px;color:var(--muted);">Currently attached on invoice. You can upload real scanned image anytime.</div>
                  </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                  <label class="btn-sm" style="background:#0F172A;color:#fff;padding:6px 12px;font-size:11.5px;font-weight:700;cursor:pointer;border-radius:6px;display:inline-flex;align-items:center;gap:6px;">
                    📷 Upload Real Stamp / Sign
                    <input type="file" accept="image/*" style="display:none;" onchange="window.GST_ENGINE.handleSignatureUpload(this)"/>
                  </label>
                  ${localStorage.getItem('uhh_custom_signature_stamp') ? `
                    <button class="btn-sm outline" style="padding:6px 10px;font-size:11.5px;color:#DC2626;" onclick="window.GST_ENGINE.resetSignatureStamp()">Reset</button>
                  ` : ''}
                </div>
              </div>

            ` : `
              <!-- A4 PREVIEW TAB -->
              <div style="padding:10px 0;">
                ${buildPrintableInvoiceHTML({
                  ...state,
                  taxable_value: calc.base,
                  cgst: calc.cgst,
                  sgst: calc.sgst
                })}
              </div>
            `}
          </div>

          <!-- Bottom Action Buttons -->
          <div style="display:flex;gap:10px;align-items:center;border-top:1px solid var(--border);padding-top:14px;margin-top:12px;flex-wrap:wrap;">
            <button class="btn-sm" style="background:#B45309;color:#fff;padding:10px 18px;font-weight:800;display:inline-flex;align-items:center;gap:6px;" onclick="window._gstSaveAndPrint()">
              🖨️ Print / Save PDF
            </button>
            <button class="btn-sm" style="background:#059669;color:#fff;padding:10px 18px;font-weight:800;display:inline-flex;align-items:center;gap:6px;" onclick="window._gstSaveOnly()">
              💾 Save Invoice &amp; CA Record
            </button>
            <button class="btn-sm" style="background:#25D366;color:#fff;padding:10px 14px;font-weight:700;display:inline-flex;align-items:center;gap:6px;" onclick="window._gstWhatsApp()">
              💬 WhatsApp Bill
            </button>
            ${state.existing ? `
              <button class="btn-sm outline" style="padding:10px 14px;color:#DC2626;border-color:#FCA5A5;font-weight:700;display:inline-flex;align-items:center;gap:4px;" onclick="window._gstDeleteCurrent()">
                🗑️ Delete Invoice
              </button>
            ` : ''}
            <button class="btn-sm outline" style="margin-left:auto;padding:10px 14px;" onclick="this.closest('.modal-overlay').remove()">
              Close
            </button>
          </div>

        </div>
      `;
    }

    // Interactive Callbacks
    window._gstSetTab = function(tab) {
      state.activeTab = tab;
      renderModalContent();
    };

    window._gstSetIsGST = function(isG) {
      state.is_gst_invoice = isG;
      renderModalContent();
    };

    window._gstRecompute = function() {
      // Re-read inputs safely
      const totInp = document.getElementById('gstInpTotal');
      const nInp = document.getElementById('gstInpNights');
      const rInp = document.getElementById('gstInpRate');
      if (totInp) state.total_amount = parseFloat(totInp.value) || 0;
      if (nInp) state.nights = parseInt(nInp.value, 10) || 1;
      if (rInp) state.gst_rate = parseFloat(rInp.value) || 5;
      renderModalContent();
    };

    window._gstSaveOnly = async function() {
      // Sync input fields
      const noInp = document.getElementById('gstInpInvNo');
      const dtInp = document.getElementById('gstInpInvDate');
      const nameInp = document.getElementById('gstInpName');
      const phInp = document.getElementById('gstInpPhone');
      const gstinInp = document.getElementById('gstInpGSTIN');
      const compInp = document.getElementById('gstInpCompany');

      if (noInp) state.invoice_no = noInp.value.trim();
      if (dtInp) state.invoice_date = dtInp.value;
      if (nameInp) state.guest_name = nameInp.value.trim();
      if (phInp) state.guest_phone = phInp.value.trim();
      if (gstinInp) state.guest_gstin = gstinInp.value.trim();
      if (compInp) state.guest_company = compInp.value.trim();

      const calc = calculateGST(state.total_amount, state.nights, state.gst_rate);
      state.taxable_value = calc.base;
      state.cgst = calc.cgst;
      state.sgst = calc.sgst;

      const res = await persistInvoice(state);
      commitNextInvoiceSeq(state.invoice_date);

      alert(`✅ Invoice ${state.invoice_no} saved successfully!\n${state.is_gst_invoice ? 'Recorded for CA GST Return.' : 'Saved as Customer Receipt.'}`);
      state.existing = state;
      renderModalContent();
    };

    window._gstSaveAndPrint = async function() {
      await window._gstSaveOnly();
      printInvoiceDocument(state);
    };

    window._gstWhatsApp = function() {
      const calc = calculateGST(state.total_amount, state.nights, state.gst_rate);
      shareInvoiceWhatsApp({
        ...state,
        taxable_value: calc.base,
        cgst: calc.cgst,
        sgst: calc.sgst
      });
    };

    window._gstDeleteCurrent = async function() {
      if (!confirm(`⚠️ Kya aap is booking (${state.booking_id}) ka invoice delete karna chahte hain?`)) {
        return;
      }
      await deleteInvoice(state.booking_id, state.invoice_no);
      modal.remove();
    };

    renderModalContent();
    document.body.appendChild(modal);
  }

  // Global functions exposed
  return {
    CO: CO,
    openGSTInvoiceModal: openGSTInvoiceModal,
    openCARegisterModal: openCARegisterModal,
    exportCAGSTReportCSV: exportCAGSTReportCSV,
    copyCASummaryText: copyCASummaryText,
    printStoredInvoice: printStoredInvoice,
    deleteInvoice: deleteInvoice,
    getInvoice: getInvoice,
    getLocalInvoices: getLocalInvoices,
    calculateGST: calculateGST,
    getSignatureStampSrc: getSignatureStampSrc,
    handleSignatureUpload: handleSignatureUpload,
    resetSignatureStamp: resetSignatureStamp
  };
})();

// Window level bridges
window.openGSTInvoiceModal = window.GST_ENGINE.openGSTInvoiceModal;
window.openCARegisterModal = window.GST_ENGINE.openCARegisterModal;
window.exportCAGSTReportCSV = window.GST_ENGINE.exportCAGSTReportCSV;
window.deleteGSTInvoice = window.GST_ENGINE.deleteInvoice;
