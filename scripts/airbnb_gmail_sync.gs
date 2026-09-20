/**
 * ═════════════════════════════════════════════════════════════════════
 * 🏨 AIRBNB TO CRM REAL-TIME GMAIL AUTO-SYNC (V2 — BULLETPROOF)
 * ═════════════════════════════════════════════════════════════════════
 * 
 * Safety Rules:
 * 1. ONLY scans emails from the last 2 days (never touches historical emails).
 * 2. NEVER modifies or shifts any existing booking. If confirmation code exists, it SKIPS.
 * 3. STRICT date verification: If check-in or check-out dates are not 100% matched, it ABORTS (NEVER invents today's date).
 * 4. STRICT property matching: Only matches unique property names, never generic words like 'chinhat'.
 */

const CONFIG = {
  SUPABASE_URL: "https://vxxmigdzimnrbbmkjzoa.supabase.co",
  SUPABASE_KEY: "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F",
  PROCESSED_LABEL: "Airbnb-Synced",
  // ONLY scan new emails from the last 2 days
  SEARCH_QUERY: 'from:airbnb.com ("Reservation confirmed" OR "booking confirmed") newer_than:2d -label:Airbnb-Synced'
};

// 17 Properties with STRICT unique keywords
const ROOM_MAPPING = [
  { roomId: 'GOM-401', name: 'The Nawabi Stay', keywords: ['nawabi stay', 'nawabi'] },
  { roomId: 'GOM-101', name: 'RedRose Palace', keywords: ['redrose palace', 'redrose entire', 'red rose palace'] },
  { roomId: 'GOM-102', name: 'Black Beauty', keywords: ['black beauty'] },
  { roomId: 'GOM-201', name: 'The Dark Blue', keywords: ['the dark blue', 'dark blue 3bhk'] },
  { roomId: 'GOM-202', name: 'The Brown', keywords: ['the brown 3bhk', 'the brown'] },
  { roomId: 'GOM-301', name: 'The Light Green', keywords: ['the light green', 'light green 3bhk'] },
  { roomId: 'GOM-302', name: 'The Unique', keywords: ['the unique 3bhk', 'the unique'] },
  { roomId: 'GOM-501', name: 'Starlight Blue PentHouse', keywords: ['starlight blue', 'starlight penthouse'] },
  { roomId: 'LUL-402', name: 'Celebrity Garden', keywords: ['celebrity garden'] },
  { roomId: 'VIL-101', name: 'Gomti Grand Villa', keywords: ['gomti grand villa', 'gomti grand'] },
  { roomId: 'VIL-102', name: 'Royal White House', keywords: ['royal white house'] },
  { roomId: 'VIL-103', name: 'The Pink House', keywords: ['the pink house'] },
  { roomId: 'VIL-104', name: 'The Green House', keywords: ['the green house'] },
  { roomId: 'VIL-105', name: 'The Yellow House', keywords: ['the yellow house'] },
  { roomId: 'VIL-106', name: 'Green forest View', keywords: ['green forest view', 'green forest'] },
  { roomId: 'VIL-107', name: 'The Velvet House', keywords: ['the velvet house'] },
  { roomId: 'VIL-108', name: 'Pink Paradise Villa', keywords: ['pink paradise villa', 'pink paradise'] }
];

function syncAirbnbReservations() {
  const label = getOrCreateLabel(CONFIG.PROCESSED_LABEL);
  const threads = GmailApp.search(CONFIG.SEARCH_QUERY, 0, 10);
  
  Logger.log(`Found ${threads.length} new Airbnb threads to process.`);

  for (const thread of threads) {
    const messages = thread.getMessages();
    let threadHandled = false;

    for (const msg of messages) {
      const subject = msg.getSubject();
      const body = msg.getPlainBody();
      
      if (subject.toLowerCase().includes('reservation confirmed') || 
          body.toLowerCase().includes('reservation confirmed') ||
          body.toLowerCase().includes('confirmation code')) {
        
        const bookingData = parseAirbnbEmail(subject, body, msg.getDate());
        
        if (bookingData && bookingData.confirmationCode && bookingData.checkIn && bookingData.checkOut) {
          Logger.log(`Valid booking parsed: ${bookingData.guestName} (${bookingData.confirmationCode}) for ${bookingData.checkIn} to ${bookingData.checkOut} in ${bookingData.roomId}`);
          const success = pushBookingToCRM(bookingData);
          if (success) threadHandled = true;
        } else {
          Logger.log(`Skipped message: dates or code could not be verified with 100% certainty.`);
          threadHandled = true; // label so we don't repeatedly fail on unparseable notifications
        }
      }
    }

    if (threadHandled) {
      thread.addLabel(label);
    }
  }
}

function parseAirbnbEmail(subject, body, emailDate) {
  try {
    // 1. Confirmation Code (HM followed by 8-10 alphanumeric characters)
    let confirmationCode = null;
    const codeMatch = body.match(/\b(HM[A-Z0-9]{8,12})\b/) || subject.match(/\b(HM[A-Z0-9]{8,12})\b/);
    if (codeMatch) confirmationCode = codeMatch[1];
    if (!confirmationCode) return null;

    // 2. Strict Property Matching
    let matchedRoomId = null;
    const searchContent = (subject + " " + body).toLowerCase();
    for (const prop of ROOM_MAPPING) {
      if (prop.keywords.some(k => searchContent.includes(k))) {
        matchedRoomId = prop.roomId;
        break;
      }
    }
    if (!matchedRoomId) {
      Logger.log(`Could not identify property for ${confirmationCode}`);
      return null;
    }

    // 3. Strict Dates Parsing (Must find valid Check-in AND Check-out)
    let checkIn = null;
    let checkOut = null;
    const currentYear = emailDate ? emailDate.getFullYear() : new Date().getFullYear();

    // Pattern 1: "Sep 20, 2026 – Sep 21, 2026" or "Sep 20 – Sep 21, 2026"
    const rangeMatch = body.match(/([A-Z][a-z]{2}\s+\d{1,2}(?:,?\s+\d{4})?)\s*(?:–|-|to)\s*([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})/i);
    if (rangeMatch) {
      checkIn = parseDateString(rangeMatch[1], currentYear);
      checkOut = parseDateString(rangeMatch[2], currentYear);
    }

    // Pattern 2: "Check-in\nSun, Sep 20, 2026" and "Checkout\nMon, Sep 21, 2026"
    if (!checkIn || !checkOut) {
      const cinMatch = body.match(/Check-?in:?\s*(?:[A-Za-z]{3},?\s*)?([A-Za-z]{3}\s+\d{1,2}(?:,?\s+\d{4})?)/i);
      const coutMatch = body.match(/Check-?out:?\s*(?:[A-Za-z]{3},?\s*)?([A-Za-z]{3}\s+\d{1,2}(?:,?\s+\d{4})?)/i);
      if (cinMatch && coutMatch) {
        checkIn = parseDateString(cinMatch[1], currentYear);
        checkOut = parseDateString(coutMatch[1], currentYear);
      }
    }

    // Pattern 3: "20 Sep 2026 - 21 Sep 2026"
    if (!checkIn || !checkOut) {
      const dmMatch = body.match(/(\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{4})?)\s*(?:–|-|to)\s*(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/i);
      if (dmMatch) {
        checkIn = parseDateString(dmMatch[1], currentYear);
        checkOut = parseDateString(dmMatch[2], currentYear);
      }
    }

    // SAFETY CHECK: If dates are not cleanly found, DO NOT INVENT DATES!
    if (!checkIn || !checkOut || checkIn >= checkOut) {
      Logger.log(`Dates could not be verified for ${confirmationCode}. Aborting.`);
      return null;
    }

    // 4. Guest Name (Full name preferred over single first name)
    let guestName = 'Airbnb Guest';
    const subGuestMatch = subject.match(/Reservation confirmed (?:-|for) ([^,–\-]+?)(?: arrives| booked| -|$)/i);
    if (subGuestMatch) {
      guestName = subGuestMatch[1].trim();
    }
    
    // If subject only provided a single first name (e.g. "Ankit"), look inside email body for full name ("Ankit Raj")
    const bodyFullNameMatch = body.match(/(?:Guest(?:\s*name)?|Contact|Message|Reservation for)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (bodyFullNameMatch && bodyFullNameMatch[1]) {
      const full = bodyFullNameMatch[1].trim();
      if (!guestName || guestName === 'Airbnb Guest' || guestName.split(/\s+/).length === 1) {
        guestName = full;
      }
    } else if (!guestName || guestName === 'Airbnb Guest') {
      const bodyGuestMatch = body.match(/Guest:?\s*([A-Za-z\s]+)/i);
      if (bodyGuestMatch) guestName = bodyGuestMatch[1].trim().split('\n')[0];
    }

    // 5. Total Payout Amount (Prioritize Net Host Payout / You Earn over gross Total)
    let totalAmount = 3200;
    const netMatch = body.match(/(?:You(?:'ll)?\s*earn(?:ed)?|Total\s*payout|Host\s*payout|Net\s*payout):\s*(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{2})?)/i);
    const payoutMatch = body.match(/(?:Payout|Total\s*\(INR\)):\s*(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{2})?)/i);
    const genericTotalMatch = body.match(/(?:Total|Subtotal):\s*(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{2})?)/i);

    const matchToUse = netMatch || payoutMatch || genericTotalMatch;
    if (matchToUse) {
      const cleanAmt = parseFloat(matchToUse[1].replace(/,/g, ''));
      if (cleanAmt > 500) totalAmount = cleanAmt;
    }

    // 6. Guests count
    let guests = 6;
    const guestCountMatch = body.match(/(\d+)\s+guests?/i);
    if (guestCountMatch) guests = parseInt(guestCountMatch[1], 10);

    // 7. Door Code / Phone digits
    let doorCode = '';
    const codeDigits = body.match(/(?:door code|suggested door code|code|phone number \(last 4 digits\))[:\s]*(\d{4})/i);
    if (codeDigits) doorCode = codeDigits[1];

    return {
      confirmationCode: confirmationCode,
      guestName: guestName,
      roomId: matchedRoomId,
      checkIn: checkIn,
      checkOut: checkOut,
      guests: guests,
      totalAmount: totalAmount,
      doorCode: doorCode
    };
  } catch (err) {
    Logger.log('Error parsing email: ' + err);
    return null;
  }
}

function pushBookingToCRM(bk) {
  const headers = {
    'apikey': CONFIG.SUPABASE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  // 1. SAFETY CHECK: If booking ALREADY exists in Supabase, DO NOT TOUCH IT!
  const checkUrl = `${CONFIG.SUPABASE_URL}/rest/v1/guest_register?airbnb_confirmation_code=eq.${bk.confirmationCode}&select=booking_id`;
  const checkResp = UrlFetchApp.fetch(checkUrl, { method: 'get', headers: headers });
  const existing = JSON.parse(checkResp.getContentText());

  if (existing && existing.length > 0) {
    Logger.log(`Booking ${bk.confirmationCode} already exists in DB. Skipping to prevent duplicates.`);
    return true;
  }

  // 2. Insert brand new booking
  const bookingId = `BK_${Date.now()}_${bk.confirmationCode}`;
  const payload = [{
    booking_id: bookingId,
    guest_name: bk.guestName,
    room_id: bk.roomId,
    booking_mode: 'Online-Airbnb',
    check_in: bk.checkIn,
    check_out: bk.checkOut,
    guests: bk.guests,
    total_amount: 0, // Pending CSV Payout: Amount is only filled when imported from official Airbnb CSV
    per_day_rate: 0,
    gross_amount: bk.totalAmount || null, // Store email gross/tentative value as reference only
    payment_status: 'Pending CSV Payout',
    airbnb_confirmation_code: bk.confirmationCode,
    phone: bk.doorCode || null,
    notes: `Door code: ${bk.doorCode || 'N/A'} | ${bk.guestName} group of ${bk.guests} | Live Airbnb booking (Payout pending CSV sync)`
  }];

  const insertUrl = `${CONFIG.SUPABASE_URL}/rest/v1/guest_register`;
  const resp = UrlFetchApp.fetch(insertUrl, {
    method: 'post',
    headers: headers,
    payload: JSON.stringify(payload)
  });

  if (resp.getResponseCode() >= 200 && resp.getResponseCode() < 300) {
    Logger.log(`Successfully created new booking ${bookingId} for ${bk.guestName} with amount 0 (Pending CSV Payout)`);
  }

  return true;
}

function parseDateString(dStr, year) {
  try {
    dStr = dStr.trim();
    if (!dStr.includes(year.toString())) {
      dStr = `${dStr}, ${year}`;
    }
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  } catch (e) {}
  return null;
}

function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) label = GmailApp.createLabel(labelName);
  return label;
}
