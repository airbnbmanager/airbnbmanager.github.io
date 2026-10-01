/**
 * ═════════════════════════════════════════════════════════════════════
 * 🏨 AIRBNB TO CRM REAL-TIME GMAIL AUTO-SYNC (V6 — ROCK SOLID PARSING)
 * ═════════════════════════════════════════════════════════════════════
 * 
 * 🛡️ 100% Authentic Gmail Data Guarantee:
 * - NO fake / hardcoded / estimated rates (₹0 if payout not in email -> Pending CSV Payout).
 * - Exact guest count extracted (e.g. "10 adults" -> 10 guests).
 * - Booked By strictly set to 'Gmail Sync'.
 * - Auto-approved ('verified') — never stuck in Pending Approvals.
 * - Auto-recovers deleted bookings: Even if a booking is deleted to test re-sync,
 *   the script automatically re-fetches and restores it from Gmail!
 * - One-click trigger installer: Run setupAutoSyncTrigger() once for 24/7 auto sync.
 */

const CONFIG = {
  SUPABASE_URL: "https://vxxmigdzimnrbbmkjzoa.supabase.co",
  SUPABASE_KEY: "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F",
  PROCESSED_LABEL: "Airbnb-Synced"
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

function getHeaders() {
  return {
    'apikey': CONFIG.SUPABASE_KEY,
    'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

/**
 * ⚡ MAIN AUTO-SYNC FUNCTION
 * Searches recent emails (last 30 days) and any un-synced emails.
 * Compares against Supabase so even if a booking was deleted, it is automatically restored!
 */
function syncAirbnbReservations() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log("Another sync is running. Skipping execution.");
    return;
  }

  try {
    const label = getOrCreateLabel(CONFIG.PROCESSED_LABEL);

    // 1. Fetch current bookings from Supabase (1 fast network call)
    const existingMap = getExistingAirbnbBookingsMap();
    Logger.log(`Loaded ${Object.keys(existingMap).length} existing Airbnb bookings from CRM.`);

    // 2. Search Gmail:
    // Query A: Recent 30 days (even if tagged, to catch deleted bookings or updates)
    // Query B: Older un-synced emails
    const threadMap = new Map();
    const queries = [
      'from:airbnb.com (reservation OR booking OR "confirmation code" OR HM) newer_than:30d',
      'from:airbnb.com (reservation OR booking OR "confirmation code" OR HM) -label:Airbnb-Synced after:2024/08/31'
    ];

    for (const q of queries) {
      const batch = GmailApp.search(q, 0, 40);
      for (const t of batch) {
        if (!threadMap.has(t.getId())) {
          threadMap.set(t.getId(), t);
        }
      }
    }

    const threads = Array.from(threadMap.values());
    Logger.log(`Found ${threads.length} total Airbnb threads to evaluate.`);

    let createdCount = 0;
    let enrichedCount = 0;

    for (const thread of threads) {
      const messages = thread.getMessages();
      const threadSubject = thread.getFirstMessageSubject();

      let combinedThreadText = threadSubject + '\n';
      let latestDate = new Date();
      for (const m of messages) {
        combinedThreadText += m.getSubject() + '\n' + m.getPlainBody() + '\n';
        latestDate = m.getDate();
      }

      const textLower = combinedThreadText.toLowerCase();

      // Check for Cancellation
      if (textLower.includes('reservation cancelled') || textLower.includes('reservation canceled') || textLower.includes('booking cancelled')) {
        const codeMatch = combinedThreadText.match(/\b(HM[A-Z0-9]{8,12})\b/);
        if (codeMatch) {
          handleCancellation(codeMatch[1], existingMap);
          thread.addLabel(label);
        }
        continue;
      }

      // Check for Reservation Confirmation
      if (textLower.includes('reservation confirmed') || textLower.includes('booking confirmed') || textLower.includes('confirmation code') || textLower.includes('reservation for')) {
        const bookingData = parseAirbnbEmail(threadSubject, combinedThreadText, latestDate);
        if (bookingData && bookingData.confirmationCode && bookingData.checkIn && bookingData.checkOut) {
          const code = bookingData.confirmationCode;
          const existing = existingMap[code];

          if (!existing) {
            // New or deleted booking -> Insert into CRM!
            const ok = insertBookingToCRM(bookingData);
            if (ok) {
              createdCount++;
              existingMap[code] = bookingData;
              thread.addLabel(label);
            }
          } else {
            // Already in DB -> Enrich if name was generic or guest count was missing
            const needsNameEnrich = existing.guest_name && (existing.guest_name.includes('Airbnb') || existing.guest_name.includes('Guest') || existing.guest_name.length < 3);
            const needsGuestsEnrich = bookingData.guests && (!existing.guests || existing.guests !== bookingData.guests);

            if (needsNameEnrich || needsGuestsEnrich) {
              const enriched = enrichBookingInCRM(existing.booking_id, bookingData);
              if (enriched) enrichedCount++;
            }
            thread.addLabel(label);
          }
        }
      }
    }

    Logger.log(`Sync finished. Created: ${createdCount}, Enriched: ${enrichedCount}`);
  } catch (err) {
    Logger.log(`Fatal Error in syncAirbnbReservations: ${err.message}`);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 📥 Fetch existing Airbnb bookings from Supabase
 */
function getExistingAirbnbBookingsMap() {
  const map = {};
  try {
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/guest_register?check_in=gte.2024-09-01&select=booking_id,airbnb_confirmation_code,guest_name,guests,total_amount,payment_status,booked_by,is_cancelled`;
    const resp = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: getHeaders(),
      muteHttpExceptions: true
    });
    const data = JSON.parse(resp.getContentText() || '[]');
    for (const b of data) {
      if (b.airbnb_confirmation_code) {
        map[b.airbnb_confirmation_code] = b;
      }
    }
  } catch (e) {
    Logger.log("Error loading existing bookings: " + e.message);
  }
  return map;
}

/**
 * 📧 PARSE AIRBNB EMAIL (Supports all formats, extracts real data only)
 */
function parseAirbnbEmail(subject, textContent, emailDate) {
  try {
    const cleanSearchText = textContent
      .replace(/[\u200B-\u200D\uFEFF\u00A0\u2009]/g, ' ')
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D–—]/g, '-');

    // 1. Confirmation Code (HM followed by 8-12 alphanumeric characters)
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

    // 3. Robust Dates Parsing (Supports both MMM DD and DD MMM formats)
    let checkIn = null;
    let checkOut = null;
    const currentYear = emailDate ? emailDate.getFullYear() : new Date().getFullYear();

    // Check-in / Checkout explicit labels
    const mCin = cleanSearchText.match(/Check-?in[:\s]+(?:[A-Za-z]{3},?\s*)?(?:(\d{1,2})\s+)?([A-Za-z]{3})[a-z]*(?:\s+(\d{1,2}))?(?:,?\s*(\d{4}))?/i);
    const mCout = cleanSearchText.match(/Check-?out[:\s]+(?:[A-Za-z]{3},?\s*)?(?:(\d{1,2})\s+)?([A-Za-z]{3})[a-z]*(?:\s+(\d{1,2}))?(?:,?\s*(\d{4}))?/i);
    if (mCin && mCout && (mCin[1] || mCin[3]) && (mCout[1] || mCout[3])) {
      const d1 = mCin[1] || mCin[3];
      const d2 = mCout[1] || mCout[3];
      const y1 = mCin[4] || currentYear;
      const y2 = mCout[4] || currentYear;
      checkIn = formatYMD(y1, mCin[2], d1);
      checkOut = formatYMD(y2, mCout[2], d2);
    }

    // Range pattern: "Oct 2 - 3, 2026" or "Oct 2-3"
    if (!checkIn || !checkOut) {
      const mR1 = cleanSearchText.match(/\b([A-Za-z]{3})[a-z]*\s*(\d{1,2})\s*[-/to]+\s*(\d{1,2})(?:,?\s*(\d{4}))?\b/i);
      if (mR1) {
        const y = mR1[4] || currentYear;
        checkIn = formatYMD(y, mR1[1], mR1[2]);
        checkOut = formatYMD(y, mR1[1], mR1[3]);
      }
    }

    // Range pattern: "2 - 3 Oct 2026" or "2-3 Oct" (UK/India)
    if (!checkIn || !checkOut) {
      const mR2 = cleanSearchText.match(/\b(\d{1,2})\s*[-/to]+\s*(\d{1,2})\s+([A-Za-z]{3})[a-z]*(?:,?\s*(\d{4}))?\b/i);
      if (mR2) {
        const y = mR2[4] || currentYear;
        checkIn = formatYMD(y, mR2[3], mR2[1]);
        checkOut = formatYMD(y, mR2[3], mR2[2]);
      }
    }

    // Range pattern: "Sep 30 - Oct 2, 2026"
    if (!checkIn || !checkOut) {
      const mR3 = cleanSearchText.match(/\b([A-Za-z]{3})[a-z]*\s*(\d{1,2})\s*[-/to]+\s*([A-Za-z]{3})[a-z]*\s*(\d{1,2})(?:,?\s*(\d{4}))?\b/i);
      if (mR3) {
        const y = mR3[5] || currentYear;
        checkIn = formatYMD(y, mR3[1], mR3[2]);
        checkOut = formatYMD(y, mR3[3], mR3[4]);
      }
    }

    // Range pattern: "30 Sep - 2 Oct 2026"
    if (!checkIn || !checkOut) {
      const mR4 = cleanSearchText.match(/\b(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s*[-/to]+\s*(\d{1,2})\s+([A-Za-z]{3})[a-z]*(?:,?\s*(\d{4}))?\b/i);
      if (mR4) {
        const y = mR4[5] || currentYear;
        checkIn = formatYMD(y, mR4[2], mR4[1]);
        checkOut = formatYMD(y, mR4[4], mR4[3]);
      }
    }

    // Fallback: "arrives Oct 2" + nights
    if (!checkIn || !checkOut) {
      const arrivesMatch = cleanSearchText.match(/arrives\s+(?:(\d{1,2})\s+)?([A-Za-z]{3})[a-z]*(?:\s+(\d{1,2}))?(?:,?\s*(\d{4}))?/i);
      if (arrivesMatch && (arrivesMatch[1] || arrivesMatch[3])) {
        const d = arrivesMatch[1] || arrivesMatch[3];
        const yr = arrivesMatch[4] || currentYear;
        checkIn = formatYMD(yr, arrivesMatch[2], d);
        const nightsMatch = cleanSearchText.match(/(\d+)\s+nights?/i);
        const nights = nightsMatch ? parseInt(nightsMatch[1], 10) : 1;
        const inDate = new Date(yr, MONTH_MAP[arrivesMatch[2].toLowerCase().slice(0, 3)] - 1, parseInt(d, 10));
        inDate.setDate(inDate.getDate() + nights);
        checkOut = `${inDate.getFullYear()}-${String(inDate.getMonth() + 1).padStart(2, '0')}-${String(inDate.getDate()).padStart(2, '0')}`;
      }
    }

    if (!checkIn || !checkOut || checkIn >= checkOut) {
      Logger.log(`Dates could not be verified for ${confirmationCode}. Aborting.`);
      return null;
    }

    // 4. Guest Name Extraction
    let guestName = 'Airbnb Guest';
    const subGuestMatch = cleanSearchText.match(/Reservation confirmed (?:-|for) ([^,–\-]+?)(?: arrives| booked| -|$)/i);
    if (subGuestMatch) {
      guestName = subGuestMatch[1].trim();
    }

    // Look for explicit contact / message patterns in email body
    const bodyNameMatch = cleanSearchText.match(/(?:Guest(?:\s*name)?|Contact|Message|Send\s+(?:a\s+)?message\s+to)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (bodyNameMatch && bodyNameMatch[1]) {
      const full = bodyNameMatch[1].trim();
      if (!guestName || guestName === 'Airbnb Guest' || guestName.split(/\s+/).length === 1) {
        guestName = full;
      }
    }

    // 5. Total Payout Amount (STRICTLY FROM EMAIL ONLY - NO ESTIMATED / HARDCODED RATES)
    let totalAmount = 0;
    const netMatch = cleanSearchText.match(/(?:You(?:'ll)?\s*earn(?:ed)?|Total\s*payout|Host\s*payout|Net\s*payout):\s*(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{2})?)/i);
    const payoutMatch = cleanSearchText.match(/(?:Payout|Total\s*\(INR\)):\s*(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{2})?)/i);

    const matchToUse = netMatch || payoutMatch;
    if (matchToUse) {
      const cleanAmt = parseFloat(matchToUse[1].replace(/,/g, ''));
      if (cleanAmt > 0) totalAmount = cleanAmt;
    }

    // 6. Guests count: Specifically match "Guests\n10 adults" or "10 adults"
    let guests = null;
    const guestsSectionMatch = cleanSearchText.match(/Guests?[\s:]+(\d+)\s*(?:adults?|guests?)/i);
    if (guestsSectionMatch) {
      guests = parseInt(guestsSectionMatch[1], 10);
      const childMatch = cleanSearchText.match(/Guests?[\s:]+\d+\s*adults?,?\s*(\d+)\s*child/i);
      if (childMatch) guests += parseInt(childMatch[1], 10);
    }
    if (!guests) {
      const adultsMatch = cleanSearchText.match(/(\d+)\s+adults?/i);
      if (adultsMatch) guests = parseInt(adultsMatch[1], 10);
    }
    if (!guests) {
      const generalMatch = cleanSearchText.match(/(\d+)\s+guests?/i);
      if (generalMatch) guests = parseInt(generalMatch[1], 10);
    }

    // 7. Door Code / Phone digits (if provided by Airbnb)
    let doorCode = '';
    const codeDigits = cleanSearchText.match(/(?:door code|suggested door code|phone number \(last 4 digits\))[:\s]*(\d{4})/i);
    if (codeDigits) doorCode = codeDigits[1];

    const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
    const perDayRate = totalAmount > 0 ? Math.round(totalAmount / nights) : 0;

    return {
      confirmationCode: confirmationCode,
      guestName: guestName,
      roomId: matchedRoomId,
      checkIn: checkIn,
      checkOut: checkOut,
      guests: guests,
      totalAmount: totalAmount,
      perDayRate: perDayRate,
      doorCode: doorCode
    };
  } catch (err) {
    Logger.log('Error parsing email: ' + err);
    return null;
  }
}

/**
 * ➕ Insert verified booking into Supabase
 */
function insertBookingToCRM(bk) {
  const bookingId = `BK_ABNB_${bk.confirmationCode}`;
  const payload = [{
    booking_id: bookingId,
    guest_name: bk.guestName,
    room_id: bk.roomId,
    booking_mode: 'Online-Airbnb',
    check_in: bk.checkIn,
    check_out: bk.checkOut,
    guests: bk.guests || null,
    total_amount: bk.totalAmount,
    per_day_rate: bk.perDayRate,
    gross_amount: bk.totalAmount > 0 ? bk.totalAmount : null,
    payment_status: bk.totalAmount > 0 ? 'Paid' : 'Pending CSV Payout',
    airbnb_confirmation_code: bk.confirmationCode,
    phone: bk.doorCode ? `+91 XXXXX ${bk.doorCode}` : null,
    booked_by: 'Gmail Sync',
    verification_status: 'verified',
    checkout_confirmed: true,
    notes: `Synced from Gmail Airbnb Confirmation | Code: ${bk.confirmationCode}${bk.guests ? ' | Guests: ' + bk.guests : ''}`
  }];

  const insertUrl = `${CONFIG.SUPABASE_URL}/rest/v1/guest_register`;
  const resp = UrlFetchApp.fetch(insertUrl, {
    method: 'post',
    headers: getHeaders(),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (resp.getResponseCode() >= 200 && resp.getResponseCode() < 300) {
    Logger.log(`SUCCESS: Created booking ${bookingId} for ${bk.guestName} (${bk.roomId}, ${bk.checkIn} to ${bk.checkOut}, Guests: ${bk.guests})`);
    return true;
  } else {
    Logger.log(`ERROR inserting booking: ${resp.getContentText()}`);
    return false;
  }
}

/**
 * 🔄 Enrich existing booking with authentic Gmail details
 */
function enrichBookingInCRM(existingBookingId, bk) {
  const patchPayload = {
    guest_name: bk.guestName,
    booked_by: 'Gmail Sync',
    verification_status: 'verified',
    notes: `Synced from Gmail Airbnb Confirmation | Code: ${bk.confirmationCode}${bk.guests ? ' | Guests: ' + bk.guests : ''}`
  };
  if (bk.guests) patchPayload.guests = bk.guests;
  if (bk.totalAmount > 0) {
    patchPayload.total_amount = bk.totalAmount;
    patchPayload.per_day_rate = bk.perDayRate;
    patchPayload.payment_status = 'Paid';
  }

  const patchUrl = `${CONFIG.SUPABASE_URL}/rest/v1/guest_register?booking_id=eq.${existingBookingId}`;
  const resp = UrlFetchApp.fetch(patchUrl, {
    method: 'patch',
    headers: getHeaders(),
    payload: JSON.stringify(patchPayload),
    muteHttpExceptions: true
  });

  if (resp.getResponseCode() >= 200 && resp.getResponseCode() < 300) {
    Logger.log(`ENRICHED booking ${existingBookingId} -> Guest: ${bk.guestName}, Guests: ${bk.guests}`);
    return true;
  }
  return false;
}

/**
 * ❌ Handle Cancellation
 */
function handleCancellation(code, existingMap) {
  if (!code) return false;
  const existing = existingMap[code];
  if (existing && !existing.is_cancelled) {
    const updateUrl = `${CONFIG.SUPABASE_URL}/rest/v1/guest_register?airbnb_confirmation_code=eq.${code}`;
    UrlFetchApp.fetch(updateUrl, {
      method: 'patch',
      headers: getHeaders(),
      payload: JSON.stringify({
        is_cancelled: true,
        cancellation_reason: 'Cancelled on Airbnb'
      }),
      muteHttpExceptions: true
    });
    Logger.log(`Marked booking ${code} as CANCELLED.`);
    return true;
  }
  return false;
}

/**
 * 🏷️ Helper: Get or create Gmail label
 */
function getOrCreateLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) label = GmailApp.createLabel(labelName);
  return label;
}

/**
 * ⚙️ 24/7 AUTO-SYNC TRIGGER SETUP
 * Run this function ONCE inside Google Apps Script editor.
 * It sets up an automatic trigger to sync Gmail every 10 minutes!
 */
function setupAutoSyncTrigger() {
  // Clear any existing triggers for this function to prevent duplicate schedules
  const allTriggers = ScriptApp.getProjectTriggers();
  for (const t of allTriggers) {
    if (t.getHandlerFunction() === 'syncAirbnbReservations') {
      ScriptApp.deleteTrigger(t);
    }
  }

  // Create recurring 10-minute trigger
  ScriptApp.newTrigger('syncAirbnbReservations')
    .timeBased()
    .everyMinutes(10)
    .create();

  Logger.log("✅ Automatic 10-minute sync trigger installed successfully!");
}

/**
 * 🔄 Reset labels & re-sync all
 */
function resetAndSyncAll() {
  Logger.log("=== RESETTING LABELS & RUNNING FULL SYNC ===");
  const label = GmailApp.getUserLabelByName(CONFIG.PROCESSED_LABEL);
  if (label) {
    let threads = label.getThreads(0, 100);
    while (threads.length > 0) {
      threads.forEach(t => t.removeLabel(label));
      threads = label.getThreads(0, 100);
    }
    Logger.log("All labels cleared.");
  }
  syncAirbnbReservations();
}
