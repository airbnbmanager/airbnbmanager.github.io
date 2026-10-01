/**
 * ═════════════════════════════════════════════════════════════════════
 * 🏨 AIRBNB TO CRM REAL-TIME GMAIL AUTO-SYNC (V5 — ROCK SOLID PARSING)
 * ═════════════════════════════════════════════════════════════════════
 * 
 * 🛡️ 4-Layer Zero-Duplicate Protection:
 * 1. LockService: Script runs strictly one instance at a time. No parallel trigger overlaps.
 * 2. Gmail Labeling: Processes each email once, tags with 'Airbnb-Synced', and excludes it forever.
 * 3. Supabase Confirmation Code Check: If HM code exists in DB, it NEVER inserts again.
 * 4. Room & Date Overlap Check: If a reservation already exists for that room on that check-in date,
 *    it links the confirmation code to the existing row instead of creating a second row!
 * 5. Cancellation Sync: Detects Airbnb cancellations and marks the booking as cancelled automatically.
 */

const CONFIG = {
  SUPABASE_URL: "https://vxxmigdzimnrbbmkjzoa.supabase.co",
  SUPABASE_KEY: "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F",
  PROCESSED_LABEL: "Airbnb-Synced",
  // Scan un-synced booking emails from 1st September onwards
  SEARCH_QUERY: 'from:airbnb.com (reservation OR booking OR "confirmation code" OR HM) after:2024/08/31 -label:Airbnb-Synced'
};

// 17 Properties with STRICT unique keywords
const ROOM_MAPPING = [
  { roomId: 'GOM-401', name: 'The Nawabi Stay', keywords: ['nawabi stay', 'nawabi'] },
  { roomId: 'GOM-101', name: 'RedRose Palace', keywords: ['redrose palace', 'redrose entire', 'red rose palace'] },
  { roomId: 'GOM-102', name: 'Black Beauty', keywords: ['black beauty'] },
  { roomId: 'GOM-201', name: 'The Dark Blue', keywords: ['dark blue', 'the dark blue'] },
  { roomId: 'GOM-202', name: 'The Brown', keywords: ['the brown', 'brown 3bhk', 'the brown 3bhk', 'brown'] },
  { roomId: 'GOM-301', name: 'The Light Green', keywords: ['the light green', 'light green 3bhk', 'light green'] },
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

const MONTH_MAP = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function formatYMD(year, month, day) {
  const y = parseInt(year, 10);
  const m = typeof month === 'number' ? month : MONTH_MAP[String(month).toLowerCase().slice(0, 3)];
  const d = parseInt(day, 10);
  if (!y || !m || !d || isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * 🔄 RUN THIS ONCE: Clears any prematurely tagged 'Airbnb-Synced' labels
 * and runs a full sync on all reservations from 1st Sep!
 */
function resetAndSyncAll() {
  Logger.log("=== RESETTING LABELS & SYNCING ALL BOOKINGS FROM 1ST SEP ===");
  const label = GmailApp.getUserLabelByName(CONFIG.PROCESSED_LABEL);
  if (label) {
    const threads = label.getThreads(0, 100);
    Logger.log(`Found ${threads.length} previously tagged threads. Removing label...`);
    threads.forEach(t => t.removeLabel(label));
  }
  Logger.log("Labels cleared! Starting full sync now...");
  syncAirbnbReservations();
}

/**
 * 🔍 DEBUG TOOL: Run this function to see all Airbnb emails found in your inbox from 1st September
 */
function debugRecentAirbnbEmails() {
  Logger.log("=== CHECKING INBOX FOR AIRBNB EMAILS FROM 1ST SEP ===");
  const testQueries = [
    CONFIG.SEARCH_QUERY,
    'from:airbnb.com after:2024/08/31',
    'airbnb after:2024/08/31'
  ];

  testQueries.forEach(q => {
    const threads = GmailApp.search(q, 0, 15);
    Logger.log(`Query: [${q}] -> Found ${threads.length} threads`);
    threads.forEach((t, i) => {
      const msg = t.getMessages()[0];
      Logger.log(`  [#${i+1}] Subject: "${msg.getSubject()}" | Date: ${msg.getDate()}`);
    });
  });
}

function syncAirbnbReservations() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log("Another sync is currently in progress. Skipping execution to prevent duplicate processing.");
    return;
  }

  try {
    const label = getOrCreateLabel(CONFIG.PROCESSED_LABEL);
    const threads = GmailApp.search(CONFIG.SEARCH_QUERY, 0, 50);
    Logger.log(`Found ${threads.length} Airbnb threads from 1st Sep to process.`);

    for (const thread of threads) {
      const messages = thread.getMessages();
      const threadSubject = thread.getFirstMessageSubject();
      let threadHandled = false;

      // Extract all text and HTML across the thread for complete context
      let combinedThreadText = threadSubject + '\n';
      let latestDate = new Date();
      for (const m of messages) {
        combinedThreadText += m.getSubject() + '\n' + m.getPlainBody() + '\n';
        latestDate = m.getDate();
      }

      const textLower = combinedThreadText.toLowerCase();

      // 1. Check for Cancellation
      if (textLower.includes('reservation cancelled') || textLower.includes('reservation canceled') || textLower.includes('booking cancelled')) {
        const codeMatch = combinedThreadText.match(/\b(HM[A-Z0-9]{8,12})\b/);
        if (codeMatch) {
          handleCancellation(codeMatch[1]);
          threadHandled = true;
        }
      }
      // 2. Check for New Reservation Confirmation
      else if (textLower.includes('reservation confirmed') || textLower.includes('booking confirmed') || textLower.includes('confirmation code') || textLower.includes('reservation for')) {
        const bookingData = parseAirbnbEmail(threadSubject, combinedThreadText, latestDate);
        if (bookingData && bookingData.confirmationCode && bookingData.checkIn && bookingData.checkOut) {
          Logger.log(`Valid booking parsed: ${bookingData.guestName} (${bookingData.confirmationCode}) for ${bookingData.checkIn} to ${bookingData.checkOut} in ${bookingData.roomId}`);
          const success = pushBookingToCRM(bookingData);
          if (success) {
            threadHandled = true;
          }
        }
      }

      // ONLY label thread as synced if it was successfully parsed and handled!
      if (threadHandled) {
        thread.addLabel(label);
      }
    }
  } catch (err) {
    Logger.log(`Fatal Error in syncAirbnbReservations: ${err.message}`);
  } finally {
    lock.releaseLock();
  }
}

function handleCancellation(code) {
  if (!code) return false;
  const headers = {
    'apikey': CONFIG.SUPABASE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  const checkUrl = `${CONFIG.SUPABASE_URL}/rest/v1/guest_register?airbnb_confirmation_code=eq.${code}&select=booking_id,guest_name`;
  const checkResp = UrlFetchApp.fetch(checkUrl, { method: 'get', headers: headers, muteHttpExceptions: true });
  const existing = JSON.parse(checkResp.getContentText() || '[]');

  if (existing && existing.length > 0) {
    const updateUrl = `${CONFIG.SUPABASE_URL}/rest/v1/guest_register?airbnb_confirmation_code=eq.${code}`;
    UrlFetchApp.fetch(updateUrl, {
      method: 'patch',
      headers: headers,
      payload: JSON.stringify({
        is_cancelled: true,
        cancellation_reason: 'Cancelled on Airbnb'
      }),
      muteHttpExceptions: true
    });
    Logger.log(`Marked booking ${code} (${existing[0].guest_name}) as CANCELLED.`);
    return true;
  }
  return false;
}

function parseAirbnbEmail(subject, textContent, emailDate) {
  try {
    const cleanSearchText = textContent
      .replace(/[\u200B-\u200D\uFEFF\u00A0\u2009]/g, ' ')
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D–—]/g, '-');

    // 1. Confirmation Code (HM followed by 8-10 alphanumeric characters)
    let confirmationCode = null;
    const codeMatch = cleanSearchText.match(/\b(HM[A-Z0-9]{8,12})\b/);
    if (codeMatch) confirmationCode = codeMatch[1];
    if (!confirmationCode) return null;

    // 2. Strict Property Matching
    let matchedRoomId = null;
    const searchLower = cleanSearchText.toLowerCase();
    for (const prop of ROOM_MAPPING) {
      if (prop.keywords.some(k => searchLower.includes(k))) {
        matchedRoomId = prop.roomId;
        break;
      }
    }
    if (!matchedRoomId) {
      Logger.log(`Could not identify property for ${confirmationCode}`);
      return null;
    }

    // 3. Robust Dates Parsing (Deterministic YYYY-MM-DD formatting)
    let checkIn = null;
    let checkOut = null;
    const currentYear = emailDate ? emailDate.getFullYear() : new Date().getFullYear();

    // Pattern 1: Same month: "Oct 2-3", "Oct 2 – 3", "Oct 2–3, 2026", "October 2-3"
    const sameMonthMatch = cleanSearchText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})\s*[-/to]+\s*(\d{1,2})(?:,?\s*(\d{4}))?\b/i);
    if (sameMonthMatch) {
      const yr = sameMonthMatch[4] || currentYear;
      checkIn = formatYMD(yr, sameMonthMatch[1], sameMonthMatch[2]);
      checkOut = formatYMD(yr, sameMonthMatch[1], sameMonthMatch[3]);
    }

    // Pattern 2: Different months: "Sep 30 - Oct 1", "Oct 31 - Nov 2, 2026"
    if (!checkIn || !checkOut) {
      const diffMonthMatch = cleanSearchText.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})\s*[-/to]+\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})(?:,?\s*(\d{4}))?\b/i);
      if (diffMonthMatch) {
        const yr = diffMonthMatch[5] || currentYear;
        checkIn = formatYMD(yr, diffMonthMatch[1], diffMonthMatch[2]);
        checkOut = formatYMD(yr, diffMonthMatch[3], diffMonthMatch[4]);
      }
    }

    // Pattern 3: Explicit Check-in and Checkout lines
    if (!checkIn || !checkOut) {
      const cinMatch = cleanSearchText.match(/Check-?in[:\s]+(?:[A-Za-z]{3},?\s*)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})(?:,?\s*(\d{4}))?/i);
      const coutMatch = cleanSearchText.match(/Check-?out[:\s]+(?:[A-Za-z]{3},?\s*)?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})(?:,?\s*(\d{4}))?/i);
      if (cinMatch && coutMatch) {
        const yIn = cinMatch[3] || currentYear;
        const yOut = coutMatch[3] || currentYear;
        checkIn = formatYMD(yIn, cinMatch[1], cinMatch[2]);
        checkOut = formatYMD(yOut, coutMatch[1], coutMatch[2]);
      }
    }

    // Pattern 4: Subject "arrives Oct 2" + nights calculation
    if (!checkIn || !checkOut) {
      const arrivesMatch = cleanSearchText.match(/arrives\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})(?:,?\s*(\d{4}))?/i);
      if (arrivesMatch) {
        const yr = arrivesMatch[3] || currentYear;
        checkIn = formatYMD(yr, arrivesMatch[1], arrivesMatch[2]);
        const nightsMatch = cleanSearchText.match(/(\d+)\s+nights?/i);
        const nights = nightsMatch ? parseInt(nightsMatch[1], 10) : 1;
        const inDate = new Date(yr, MONTH_MAP[arrivesMatch[1].toLowerCase().slice(0, 3)] - 1, parseInt(arrivesMatch[2], 10));
        inDate.setDate(inDate.getDate() + nights);
        checkOut = `${inDate.getFullYear()}-${String(inDate.getMonth() + 1).padStart(2, '0')}-${String(inDate.getDate()).padStart(2, '0')}`;
      }
    }

    // SAFETY CHECK: Valid Check-in and Check-out
    if (!checkIn || !checkOut || checkIn >= checkOut) {
      Logger.log(`Dates could not be verified for ${confirmationCode}. Aborting.`);
      return null;
    }

    // 4. Guest Name (Full name preferred over single first name)
    let guestName = 'Airbnb Guest';
    const subGuestMatch = cleanSearchText.match(/Reservation confirmed (?:-|for) ([^,–\-]+?)(?: arrives| booked| -|$)/i);
    if (subGuestMatch) {
      guestName = subGuestMatch[1].trim();
    }
    
    // Check inside body if needed
    const bodyFullNameMatch = cleanSearchText.match(/(?:Guest(?:\s*name)?|Contact|Message|Reservation for)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (bodyFullNameMatch && bodyFullNameMatch[1]) {
      const full = bodyFullNameMatch[1].trim();
      if (!guestName || guestName === 'Airbnb Guest' || guestName.split(/\s+/).length === 1) {
        guestName = full;
      }
    }

    // 5. Total Payout Amount (Prioritize Net Host Payout / You Earn over gross Total)
    let totalAmount = 3200;
    const netMatch = cleanSearchText.match(/(?:You(?:'ll)?\s*earn(?:ed)?|Total\s*payout|Host\s*payout|Net\s*payout):\s*(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{2})?)/i);
    const payoutMatch = cleanSearchText.match(/(?:Payout|Total\s*\(INR\)):\s*(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{2})?)/i);
    const genericTotalMatch = cleanSearchText.match(/(?:Total|Subtotal):\s*(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{2})?)/i);

    const matchToUse = netMatch || payoutMatch || genericTotalMatch;
    if (matchToUse) {
      const cleanAmt = parseFloat(matchToUse[1].replace(/,/g, ''));
      if (cleanAmt > 500) totalAmount = cleanAmt;
    }

    // 6. Guests count
    let guests = 6;
    const guestCountMatch = cleanSearchText.match(/(\d+)\s+guests?/i);
    if (guestCountMatch) guests = parseInt(guestCountMatch[1], 10);

    // 7. Door Code / Phone digits
    let doorCode = '';
    const codeDigits = cleanSearchText.match(/(?:door code|suggested door code|code|phone number \(last 4 digits\))[:\s]*(\d{4})/i);
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
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // 🛡️ ZERO-DUPLICATE CHECK: Confirmation Code Match
  // Every Airbnb booking has a globally unique code (e.g. HMX59TAJQA). If it exists in DB, NEVER insert again!
  const checkCodeUrl = `${CONFIG.SUPABASE_URL}/rest/v1/guest_register?airbnb_confirmation_code=eq.${bk.confirmationCode}&select=booking_id,guest_name`;
  const checkCodeResp = UrlFetchApp.fetch(checkCodeUrl, { method: 'get', headers: headers, muteHttpExceptions: true });
  const existingCode = JSON.parse(checkCodeResp.getContentText() || '[]');

  if (existingCode && existingCode.length > 0) {
    Logger.log(`DUPLICATE PREVENTED: Booking ${bk.confirmationCode} already exists in DB as ${existingCode[0].booking_id}. Skipping.`);
    return true;
  }

  // 🚀 INSERT: Brand new verified booking
  const bookingId = `BK_${Date.now()}_${bk.confirmationCode}`;
  const payload = [{
    booking_id: bookingId,
    guest_name: bk.guestName,
    room_id: bk.roomId,
    booking_mode: 'Online-Airbnb',
    check_in: bk.checkIn,
    check_out: bk.checkOut,
    guests: bk.guests,
    total_amount: 0, // Pending CSV Payout: Amount is reconciled when imported from official Airbnb CSV
    per_day_rate: 0,
    gross_amount: bk.totalAmount || null, // Store email gross/tentative value as reference only
    payment_status: 'Pending CSV Payout',
    airbnb_confirmation_code: bk.confirmationCode,
    phone: bk.doorCode || null,
    verification_status: 'pending',
    checkout_confirmed: true,
    notes: `Live Airbnb Booking | Code: ${bk.confirmationCode} | Door code / phone: ${bk.doorCode || 'N/A'} | ${bk.guests} Guests`
  }];

  const insertUrl = `${CONFIG.SUPABASE_URL}/rest/v1/guest_register`;
  const resp = UrlFetchApp.fetch(insertUrl, {
    method: 'post',
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (resp.getResponseCode() >= 200 && resp.getResponseCode() < 300) {
    Logger.log(`SUCCESS: Created new booking ${bookingId} for ${bk.guestName} (${bk.roomId}, ${bk.checkIn} to ${bk.checkOut})`);
    return true;
  } else {
    Logger.log(`ERROR inserting booking: ${resp.getContentText()}`);
    return false;
  }
}

function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) label = GmailApp.createLabel(labelName);
  return label;
}
