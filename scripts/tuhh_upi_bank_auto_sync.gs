/**
 * ═════════════════════════════════════════════════════════════════════
 * ⚡ TUHH NATIVE ZERO-FEE UPI AUTO-SYNC ENGINE (V1 — 100% PRODUCTION)
 * ═════════════════════════════════════════════════════════════════════
 * THE UNIQUE HAVEN HOMES PRIVATE LIMITED (CIN: U55101UP2026PTC244637)
 * 
 * 🎯 Purpose:
 * Automatically monitors incoming Indian Bank & UPI Credit Alert emails
 * (HDFC, SBI, ICICI, Kotak, Yes Bank, PhonePe, Paytm, Axis Bank).
 * 
 * When a guest scans the QR and pays:
 * 1. Reads incoming bank email within 30-60 seconds.
 * 2. Extracts exact Amount (₹), 12-digit UTR / UPI Ref number, Payer Name, and Note.
 * 3. Matches transaction with pending reservation in Supabase (guest_register).
 * 4. Inserts verified record into payment_history.
 * 5. Updates guest_register to 'Paid'.
 * 6. Labels email 'TUHH-UPI-Synced' so it is never re-processed.
 * 
 * 0% Commission & 0-Second Direct Bank Settlement!
 */

const CONFIG = {
  SUPABASE_URL: "https://vxxmigdzimnrbbmkjzoa.supabase.co",
  SUPABASE_KEY: "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F",
  PROCESSED_LABEL: "TUHH-UPI-Synced",
  ADMIN_WHATSAPP: "918299600709", // Firoz Khan
  RECEIVER_ACCOUNTS: {
    "8299600709@ybl": "Firoz Khan (PhonePe/Yes Bank)",
    "9454470872@apl": "Praveen Singh (Amazon Pay/Axis)",
    "company": "TUHH Current Account (HDFC/SBI)"
  }
};

/**
 * Main Trigger Function (Set up Time-driven trigger to run every 1 or 2 minutes)
 */
function syncBankUpiPayments() {
  Logger.log("Starting TUHH UPI Bank Auto-Sync...");
  const label = getOrCreateLabel(CONFIG.PROCESSED_LABEL);

  // Search queries matching incoming credit alerts from major Indian banks & UPI handles
  const queries = [
    'from:(alerts@hdfcbank.net OR hdfcbank.net) "credited" "UPI" -label:' + CONFIG.PROCESSED_LABEL,
    'from:(alerts@sbi.co.in OR sbi.co.in) "credited" "UPI" -label:' + CONFIG.PROCESSED_LABEL,
    'from:(alerts@icicibank.com OR icicibank.com) "credited" "UPI" -label:' + CONFIG.PROCESSED_LABEL,
    'from:(alerts@phonepe.com OR nodal@phonepe.com OR yesbank.in) "received" OR "credited" -label:' + CONFIG.PROCESSED_LABEL,
    'from:(no-reply@paytm.com OR paytm.com) "Money received" OR "UPI" -label:' + CONFIG.PROCESSED_LABEL,
    'from:(alerts@axisbank.com OR axisbank.com) "credited" "UPI" -label:' + CONFIG.PROCESSED_LABEL,
    'from:(alerts@kotak.com OR kotak.com) "credited" "UPI" -label:' + CONFIG.PROCESSED_LABEL,
    'subject:("UPI" AND ("credited" OR "received")) -label:' + CONFIG.PROCESSED_LABEL
  ];

  let totalProcessed = 0;

  for (let q of queries) {
    try {
      const threads = GmailApp.search(q, 0, 15);
      for (let thread of threads) {
        const messages = thread.getMessages();
        for (let msg of messages) {
          if (msg.isDraft()) continue;

          const body = msg.getPlainBody() || msg.getBody();
          const subject = msg.getSubject() || "";
          const date = msg.getDate();

          const parsed = parseBankUpiAlert(subject, body, date);
          if (parsed && parsed.amount > 0) {
            Logger.log("Parsed UPI Txn: " + JSON.stringify(parsed));
            const matched = recordVerifiedPaymentInSupabase(parsed);
            if (matched) {
              totalProcessed++;
            }
          }
        }
        thread.addLabel(label);
      }
    } catch (err) {
      Logger.log("Query error [" + q + "]: " + err.message);
    }
  }

  Logger.log("TUHH UPI Bank Auto-Sync Finished. Processed: " + totalProcessed);
}

/**
 * Parses Amount, UTR, Sender, and Booking Reference from Bank Email
 */
function parseBankUpiAlert(subject, body, emailDate) {
  const fullText = (subject + " " + body).replace(/\s+/g, ' ');

  // 1. Extract Amount
  // Matches: "credited with INR 5,200.00", "Rs. 5200.00", "INR 5200", "₹5,200"
  let amount = 0;
  const amtMatch = fullText.match(/(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
                   fullText.match(/credited with\s*(?:Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i) ||
                   fullText.match(/received\s*(?:Rs\.?|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i);

  if (amtMatch) {
    amount = parseFloat(amtMatch[1].replace(/,/g, ''));
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return null;
  }

  // 2. Extract 12-Digit UPI Reference Number (UTR)
  // Matches: "UPI/CR/630812345678", "UPI Ref 630812345678", "UTR: 630812345678", "Ref no 630812345678"
  let utr = "";
  const utrMatch = fullText.match(/UPI(?:\/CR)?\/(\d{12})/i) ||
                   fullText.match(/(?:UTR|Ref(?:erence)?\s*(?:No\.?)?|Txn\s*ID)[:\s]*(\d{12})/i) ||
                   fullText.match(/\b(\d{12})\b/);

  if (utrMatch) {
    utr = utrMatch[1];
  }

  // 3. Extract Sender / Payer Name
  // Matches: "from ADITYA DEY", "by ADITYA DEY", "VPA ... of ADITYA"
  let sender = "";
  const senderMatch = fullText.match(/(?:from|by)\s+([A-Z\s]{3,30})(?:\s+on|\s+via|\s+UPI|\s+Ref|\.|\s*-\s*)/i) ||
                      fullText.match(/(?:VPA|UPI ID)\s+[\w\.\-]+@\w+\s+(?:of|from)?\s*([A-Za-z\s]{3,30})/i);

  if (senderMatch) {
    sender = senderMatch[1].trim();
  }

  // 4. Extract Custom Booking Tag / Unit Reference if present
  // Matches: "TUHH_179364", "BK_179364", "FLAT402", "GOM-402", "Krish"
  let bookingHint = "";
  const hintMatch = fullText.match(/\b(TUHH[_\-][A-Za-z0-9]+)\b/i) ||
                    fullText.match(/\b(BK[_\-][A-Za-z0-9]+)\b/i) ||
                    fullText.match(/\b(FLAT\s*\d{3})\b/i) ||
                    fullText.match(/\b(GOM[_\-]\d{3})\b/i);

  if (hintMatch) {
    bookingHint = hintMatch[1].trim();
  }

  // Format Date (YYYY-MM-DD)
  const d = emailDate ? new Date(emailDate) : new Date();
  const dateStr = d.toISOString().slice(0, 10);
  const timeStr = d.toLocaleTimeString('en-IN', { hour12: false });

  return {
    amount: amount,
    utr: utr || "UPI-" + d.getTime(),
    sender: sender || "Guest",
    bookingHint: bookingHint,
    dateStr: dateStr,
    timeStr: timeStr,
    rawSnippet: fullText.slice(0, 300)
  };
}

/**
 * Matches and Records Verified UPI Payment into Supabase
 */
function recordVerifiedPaymentInSupabase(parsed) {
  // Prevent duplicate insertion if this UTR was already recorded
  const existingPay = fetchFromSupabase('payment_history?reference_note=ilike.*' + encodeURIComponent(parsed.utr) + '*&select=id,booking_id');
  if (existingPay && existingPay.length > 0) {
    Logger.log("Payment with UTR " + parsed.utr + " already recorded. Skipping.");
    return false;
  }

  // 1. Find matching reservation in guest_register
  // Search priority:
  // A) By bookingHint if booking ID was in transaction note
  // B) By exact pending amount and recent check-in/active date
  let matchedBooking = null;

  if (parsed.bookingHint) {
    const cleanHint = parsed.bookingHint.replace(/^(TUHH_|BK_)/i, '');
    const bks = fetchFromSupabase('guest_register?booking_id=ilike.*' + encodeURIComponent(cleanHint) + '*&select=booking_id,guest_name,total_amount,room_id,phone');
    if (bks && bks.length > 0) {
      matchedBooking = bks[0];
    }
  }

  // Fallback: Match pending/due reservation active today with matching amount (or close round amount)
  if (!matchedBooking) {
    const today = parsed.dateStr;
    const candidates = fetchFromSupabase(
      'guest_register?check_in=lte.' + today +
      '&check_out=gte.' + today +
      '&verification_status=neq.rejected' +
      '&select=booking_id,guest_name,total_amount,room_id,phone' +
      '&order=check_in.desc&limit=10'
    );

    if (candidates && candidates.length > 0) {
      // Find candidate whose total_amount or remaining balance matches parsed.amount
      for (let cand of candidates) {
        const pays = fetchFromSupabase('payment_history?booking_id=eq.' + cand.booking_id + '&verification_status=neq.rejected&select=amount');
        const paidSoFar = (pays || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const due = (Number(cand.total_amount) || 0) - paidSoFar;

        // Check if amount matches due balance or total stay amount
        if (Math.abs(due - parsed.amount) < 1 || Math.abs(Number(cand.total_amount) - parsed.amount) < 1) {
          matchedBooking = cand;
          break;
        }

        // Check if guest name matches sender name
        if (parsed.sender && cand.guest_name && cand.guest_name.toLowerCase().includes(parsed.sender.toLowerCase().split(' ')[0])) {
          matchedBooking = cand;
          break;
        }
      }
    }
  }

  const bookingId = matchedBooking ? matchedBooking.booking_id : null;
  const guestName = matchedBooking ? matchedBooking.guest_name : parsed.sender;
  const refNote = "⚡ Bank UPI Auto-Sync | UTR: " + parsed.utr + (parsed.sender ? " | Sender: " + parsed.sender : "");

  // Insert into payment_history with verified status
  const payload = {
    booking_id: bookingId,
    amount: parsed.amount,
    payment_mode: "UPI",
    payment_date: parsed.dateStr,
    received_by: "UHHS-OD",
    reference_note: refNote,
    notes: "Auto-verified from Bank Credit Email at " + parsed.timeStr,
    verification_status: "verified"
  };

  const insertRes = postToSupabase('payment_history', payload);
  Logger.log("Payment history insert response: " + insertRes);

  // If matched to a booking, recalculate and update booking payment status
  if (bookingId) {
    const allPays = fetchFromSupabase('payment_history?booking_id=eq.' + bookingId + '&verification_status=neq.rejected&select=amount');
    const totalPaid = (allPays || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalAmt = Number(matchedBooking.total_amount) || 0;

    let newStatus = 'Unpaid';
    if (totalPaid >= totalAmt && totalAmt > 0) {
      newStatus = 'Paid';
    } else if (totalPaid > 0) {
      newStatus = 'Partial';
    }

    patchSupabase('guest_register?booking_id=eq.' + bookingId, {
      payment_status: newStatus
    });

    Logger.log("Updated Booking #" + bookingId + " payment_status to: " + newStatus);
  }

  return true;
}

/**
 * Supabase REST API Helpers
 */
function fetchFromSupabase(endpoint) {
  const url = CONFIG.SUPABASE_URL + "/rest/v1/" + endpoint;
  const options = {
    method: "get",
    headers: {
      "apikey": CONFIG.SUPABASE_KEY,
      "Authorization": "Bearer " + CONFIG.SUPABASE_KEY,
      "Content-Type": "application/json"
    },
    muteHttpExceptions: true
  };
  try {
    const res = UrlFetchApp.fetch(url, options);
    if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
      return JSON.parse(res.getContentText());
    }
  } catch (e) {
    Logger.log("fetchFromSupabase error: " + e.message);
  }
  return null;
}

function postToSupabase(endpoint, payload) {
  const url = CONFIG.SUPABASE_URL + "/rest/v1/" + endpoint;
  const options = {
    method: "post",
    headers: {
      "apikey": CONFIG.SUPABASE_KEY,
      "Authorization": "Bearer " + CONFIG.SUPABASE_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    const res = UrlFetchApp.fetch(url, options);
    return res.getContentText();
  } catch (e) {
    Logger.log("postToSupabase error: " + e.message);
    return null;
  }
}

function patchSupabase(endpoint, payload) {
  const url = CONFIG.SUPABASE_URL + "/rest/v1/" + endpoint;
  const options = {
    method: "patch",
    headers: {
      "apikey": CONFIG.SUPABASE_KEY,
      "Authorization": "Bearer " + CONFIG.SUPABASE_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log("patchSupabase error: " + e.message);
  }
}

function getOrCreateLabel(name) {
  let label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
  }
  return label;
}
