/**
 * ═════════════════════════════════════════════════════════════════════
 * 🏨 AIRBNB TO CRM REAL-TIME GMAIL AUTO-SYNC (V8 — 100% BULLETPROOF)
 * ═════════════════════════════════════════════════════════════════════
 * 
 * 🛡️ Solves "Block hua bas details nahi aaya across all properties":
 * 1. Targeted Code Search: Directly searches Gmail for each confirmation code (HM...)
 *    found in iCal blocks, fetching exact Guest Name, Guest Count & Net Payout.
 * 2. Complete 17-Property Mapping: Includes all listing IDs, unit names (FLAT101, Villa 1),
 *    and nicknames so new bookings are instantly recognized.
 * 3. Never rejects an existing iCal booking: If the confirmation code is already in CRM,
 *    it enriches it immediately without requiring keyword matching.
 * 4. Strictly authentic data: ₹0 if payout not in email (no fake numbers).
 * 5. Auto-approved ('verified') and Booked By strictly set to 'Gmail Sync'.
 */

const CONFIG = {
  SUPABASE_URL: "https://vxxmigdzimnrbbmkjzoa.supabase.co",
  SUPABASE_KEY: "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F",
  PROCESSED_LABEL: "Airbnb-Synced"
};

// 17 Properties with COMPLETE Listing IDs, Units, and Nicknames
const ROOM_MAPPING = [
  { roomId: 'GOM-101', name: 'RedRose Palace', unit: 'FLAT101', listingId: '1654261872286835347', keywords: ['redrose palace', 'redrose entire', 'red rose palace', 'redrose', 'red rose', 'flat 101', 'flat101', 'gom-101', '1654261872286835347'] },
  { roomId: 'GOM-102', name: 'Black Beauty', unit: 'FLAT102', listingId: '1676840617430941240', keywords: ['black beauty', 'beauty', 'flat 102', 'flat102', 'gom-102', '1676840617430941240'] },
  { roomId: 'GOM-201', name: 'The Dark Blue', unit: 'FLAT201', listingId: '1655969170448425308', keywords: ['dark blue', 'the dark blue', 'flat 201', 'flat201', 'gom-201', '1655969170448425308'] },
  { roomId: 'GOM-202', name: 'The Brown', unit: 'FLAT202', listingId: '1660898784168880636', keywords: ['the brown', 'brown 3bhk', 'the brown 3bhk', 'brown', 'flat 202', 'flat202', 'gom-202', '1660898784168880636'] },
  { roomId: 'GOM-301', name: 'The Light Green', unit: 'FLAT301', listingId: '1679155811558485410', keywords: ['the light green', 'light green 3bhk', 'light green', 'flat 301', 'flat301', 'gom-301', '1679155811558485410'] },
  { roomId: 'GOM-302', name: 'The Unique', unit: 'FLAT302', listingId: '1679190202218939181', keywords: ['the unique 3bhk', 'the unique', 'unique', 'flat 302', 'flat302', 'gom-302', '1679190202218939181'] },
  { roomId: 'GOM-401', name: 'The Nawabi Stay', unit: 'FLAT401', listingId: '1723434530455939144', keywords: ['nawabi stay', 'nawabi', 'the nawabi stay', 'flat 401', 'flat401', 'gom-401', '1723434530455939144'] },
  { roomId: 'LUL-402', name: 'Celebrity Garden', unit: 'FLAT402', listingId: '1606514664948608755', keywords: ['celebrity garden', 'celebrity', 'flat 402', 'flat402', 'lul-402', '1606514664948608755'] },
  { roomId: 'GOM-501', name: 'Starlight Blue PentHouse', unit: 'FLAT501', listingId: '1718385679817913835', keywords: ['starlight blue', 'starlight penthouse', 'starlight', 'penthouse', 'flat 501', 'flat501', 'gom-501', '1718385679817913835'] },
  { roomId: 'VIL-101', name: 'Gomti Grand Villa', unit: 'Villa (One)', listingId: '1721732716374002170', keywords: ['gomti grand villa', 'gomti grand', 'grand villa', 'villa (one)', 'villa one', 'villa 1', 'vil-101', '1721732716374002170'] },
  { roomId: 'VIL-102', name: 'Royal White House', unit: 'Villa (Two)', listingId: '1718315215180636685', keywords: ['royal white house', 'royal white', 'white house', 'villa (two)', 'villa two', 'villa 2', 'vil-102', '1718315215180636685'] },
  { roomId: 'VIL-103', name: 'The Pink House', unit: 'Villa (Three)', listingId: '1592729438969718723', keywords: ['the pink house', 'pink house', 'villa (three)', 'villa three', 'villa 3', 'vil-103', '1592729438969718723'] },
  { roomId: 'VIL-104', name: 'The Green House', unit: 'Villa (Four)', listingId: '1593461780265937816', keywords: ['the green house', 'green house', 'villa (four)', 'villa four', 'villa 4', 'vil-104', '1593461780265937816'] },
  { roomId: 'VIL-105', name: 'The Yellow House', unit: 'Villa (Five)', listingId: '1592729918855637425', keywords: ['the yellow house', 'yellow house', 'villa (five)', 'villa five', 'villa 5', 'vil-105', '1592729918855637425'] },
  { roomId: 'VIL-106', name: 'Green forest View', unit: 'Villa (Six)', listingId: '1739254108962193705', keywords: ['green forest view', 'green forest', 'forest view', 'villa (six)', 'villa six', 'villa 6', 'vil-106', '1739254108962193705'] },
  { roomId: 'VIL-107', name: 'The Velvet House', unit: 'Villa (Seven)', listingId: '1727830063287100082', keywords: ['the velvet house', 'velvet house', 'velvet', 'villa (seven)', 'villa seven', 'villa 7', 'vil-107', '1727830063287100082'] },
  { roomId: 'VIL-108', name: 'Pink Paradise Villa', unit: 'Villa (Eight)', listingId: '1756799939825259443', keywords: ['pink paradise villa', 'pink paradise', 'paradise villa', 'villa (eight)', 'villa eight', 'villa 8', 'vil-108', '1756799939825259443'] }
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
 */
function syncAirbnbReservations() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    Logger.log("Another sync is running. Skipping execution.");
    return;
  }

  try {
    const label = getOrCreateLabel(CONFIG.PROCESSED_LABEL);

    // 1. Fetch current bookings from Supabase
    const existingMap = getExistingAirbnbBookingsMap();
    const existingList = Object.values(existingMap);
    Logger.log(`Loaded ${existingList.length} existing Airbnb bookings from CRM.`);

    let enrichedCount = 0;
    let createdCount = 0;

    // ─────────────────────────────────────────────────────────────
    // STEP 1: TARGETED ENRICHMENT FOR ANY BOOKING MISSING DETAILS
    // Searches Gmail specifically by confirmation code (HM...)
    // ─────────────────────────────────────────────────────────────
    const needsEnrichment = existingList.filter(b => {
      const isGeneric = !b.guest_name || b.guest_name.includes('Airbnb') || b.guest_name.includes('Guest') || b.guest_name.startsWith('🏨') || b.guest_name.length <= 2;
      const isMissingGuests = !b.guests;
      const isZeroAmount = !b.total_amount || b.total_amount === 0;
      return (isGeneric || isMissingGuests || isZeroAmount) && b.airbnb_confirmation_code;
    });

    Logger.log(`Found ${needsEnrichment.length} bookings needing detail enrichment in CRM.`);

    for (const b of needsEnrichment) {
      const code = b.airbnb_confirmation_code;
      try {
        const threads = GmailApp.search(`from:airbnb.com ${code}`, 0, 1);
        if (threads && threads.length > 0) {
          const t = threads[0];
          const messages = t.getMessages();
          let combinedText = t.getFirstMessageSubject() + '\n';
          let latestDate = new Date();
          for (const m of messages) {
            combinedText += m.getSubject() + '\n' + m.getPlainBody() + '\n';
            latestDate = m.getDate();
          }

          const parsed = parseAirbnbEmail(t.getFirstMessageSubject(), combinedText, latestDate, b);
          if (parsed && parsed.guestName && parsed.guestName !== 'Airbnb Guest') {
            const ok = enrichBookingInCRM(b.booking_id, parsed);
            if (ok) {
              enrichedCount++;
              b.guest_name = parsed.guestName;
              b.guests = parsed.guests;
              b.total_amount = parsed.totalAmount;
              t.addLabel(label);
            }
          }
        }
      } catch (e) {
        Logger.log(`Error enriching code ${code}: ${e.message}`);
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2: GENERAL DISCOVERY OF NEW AIRBNB RESERVATIONS
    // ─────────────────────────────────────────────────────────────
    const generalThreads = GmailApp.search('from:airbnb.com ("Reservation confirmed" OR "Booking confirmed" OR "confirmation code") -label:Airbnb-Synced', 0, 50);
    Logger.log(`Scanning ${generalThreads.length} unlabelled confirmation threads for new reservations.`);

    for (const thread of generalThreads) {
      const messages = thread.getMessages();
      const threadSubject = thread.getFirstMessageSubject();

      let combinedThreadText = threadSubject + '\n';
      let latestDate = new Date();
      for (const m of messages) {
        combinedThreadText += m.getSubject() + '\n' + m.getPlainBody() + '\n';
        latestDate = m.getDate();
      }

      const textLower = combinedThreadText.toLowerCase();

      // Check Cancellation
      if (textLower.includes('reservation cancelled') || textLower.includes('reservation canceled') || textLower.includes('booking cancelled')) {
        const codeMatch = combinedThreadText.match(/\b(HM[A-Z0-9]{8,12})\b/);
        if (codeMatch) {
          handleCancellation(codeMatch[1], existingMap);
          thread.addLabel(label);
        }
        continue;
      }

      // Check Confirmation
      if (textLower.includes('reservation confirmed') || textLower.includes('booking confirmed') || textLower.includes('confirmation code') || textLower.includes('arrives')) {
        const bookingData = parseAirbnbEmail(threadSubject, combinedThreadText, latestDate, null);
        if (bookingData && bookingData.confirmationCode) {
          const code = bookingData.confirmationCode;
          const existing = existingMap[code];

          if (!existing) {
            if (bookingData.roomId && bookingData.checkIn && bookingData.checkOut) {
              const ok = insertBookingToCRM(bookingData);
              if (ok) {
                createdCount++;
                existingMap[code] = bookingData;
                thread.addLabel(label);
              }
            }
          } else {
            // Already exists -> Enrich if generic
            const isGenericName = !existing.guest_name || existing.guest_name.includes('Airbnb') || existing.guest_name.startsWith('🏨');
            if (isGenericName || (!existing.guests && bookingData.guests)) {
              enrichBookingInCRM(existing.booking_id, bookingData);
              enrichedCount++;
            }
            thread.addLabel(label);
          }
        }
      }
    }

    Logger.log(`✅ SYNC COMPLETE: Enriched: ${enrichedCount} | Newly Created: ${createdCount}`);
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
    const url = `${CONFIG.SUPABASE_URL}/rest/v1/guest_register?check_in=gte.2024-01-01&select=booking_id,airbnb_confirmation_code,guest_name,guests,total_amount,payment_status,booked_by,is_cancelled,room_id,check_in,check_out`;
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
 * 📧 PARSE AIRBNB EMAIL (BULLETPROOF)
 */
function parseAirbnbEmail(subject, textContent, emailDate, existingBooking) {
  try {
    // 0. Clean & normalize text
    const cleanSearchText = textContent
      .replace(/[\u200B-\u200D\uFEFF\u00A0\u2009]/g, ' ')
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D–—]/g, '-');

    // 1. Confirmation Code
    let confirmationCode = null;
    const codeMatch = cleanSearchText.match(/\b(HM[A-Z0-9]{8,12})\b/);
    if (codeMatch) confirmationCode = codeMatch[1];
    if (!confirmationCode && existingBooking) confirmationCode = existingBooking.airbnb_confirmation_code;
    if (!confirmationCode) return null;

    // 2. Room ID Resolution
    let matchedRoomId = existingBooking ? existingBooking.room_id : null;
    if (!matchedRoomId) {
      const searchLower = cleanSearchText.toLowerCase();
      for (const prop of ROOM_MAPPING) {
        if (prop.keywords.some(k => searchLower.includes(k))) {
          matchedRoomId = prop.roomId;
          break;
        }
      }
    }

    // 3. Dates Parsing
    let checkIn = existingBooking ? existingBooking.check_in : null;
    let checkOut = existingBooking ? existingBooking.check_out : null;
    const currentYear = emailDate ? emailDate.getFullYear() : new Date().getFullYear();

    if (!checkIn || !checkOut) {
      // Explicit Check-in and Checkout lines
      const mCin = cleanSearchText.match(/Check-?in[:\s]+(?:[A-Za-z]{3},?\s*)?(?:(\d{1,2})\s+)?([A-Za-z]{3})[a-z]*(?:\s+(\d{1,2}))?(?:,?\s*(\d{4}))?/i);
      const mCout = cleanSearchText.match(/Check-?out[:\s]+(?:[A-Za-z]{3},?\s*)?(?:(\d{1,2})\s+)?([A-Za-z]{3})[a-z]*(?:\s+(\d{1,2}))?(?:,?\s*(\d{4}))?/i);
      if (mCin && mCout) {
        const d1 = mCin[1] || mCin[3];
        const d2 = mCout[1] || mCout[3];
        if (d1 && d2) {
          const y1 = mCin[4] || currentYear;
          const y2 = mCout[4] || currentYear;
          checkIn = formatYMD(y1, mCin[2], d1);
          checkOut = formatYMD(y2, mCout[2], d2);
        }
      }
    }

    if (!checkIn || !checkOut) {
      // Range: Thu, Oct 8 - Sun, Oct 11, 2026
      const mFull = cleanSearchText.match(/(?:[A-Za-z]{3},?\s*)?([A-Za-z]{3})[a-z]*\s*(\d{1,2})(?:,?\s*(\d{4}))?\s*[-/to]+\s*(?:[A-Za-z]{3},?\s*)?([A-Za-z]{3})[a-z]*\s*(\d{1,2})(?:,?\s*(\d{4}))?/i);
      if (mFull) {
        const y1 = mFull[3] || currentYear;
        const y2 = mFull[6] || mFull[3] || currentYear;
        checkIn = formatYMD(y1, mFull[1], mFull[2]);
        checkOut = formatYMD(y2, mFull[4], mFull[5]);
      }
    }

    if (!checkIn || !checkOut) {
      // Range: Oct 8 - 11, 2026
      const mSameMonth = cleanSearchText.match(/\b([A-Za-z]{3})[a-z]*\s*(\d{1,2})\s*[-/to]+\s*(\d{1,2})(?:,?\s*(\d{4}))?\b/i);
      if (mSameMonth) {
        const y = mSameMonth[4] || currentYear;
        checkIn = formatYMD(y, mSameMonth[1], mSameMonth[2]);
        checkOut = formatYMD(y, mSameMonth[1], mSameMonth[3]);
      }
    }

    if (!checkIn || !checkOut) {
      // Range: 8 - 11 Oct, 2026
      const mDayFirstSame = cleanSearchText.match(/\b(\d{1,2})\s*[-/to]+\s*(\d{1,2})\s+([A-Za-z]{3})[a-z]*(?:,?\s*(\d{4}))?\b/i);
      if (mDayFirstSame) {
        const y = mDayFirstSame[4] || currentYear;
        checkIn = formatYMD(y, mDayFirstSame[3], mDayFirstSame[1]);
        checkOut = formatYMD(y, mDayFirstSame[3], mDayFirstSame[2]);
      }
    }

    if (!checkIn || !checkOut) {
      // "arrives Oct 8" + nights
      const mArrives = cleanSearchText.match(/arrives\s+(?:(\d{1,2})\s+)?([A-Za-z]{3})[a-z]*(?:\s+(\d{1,2}))?(?:,?\s*(\d{4}))?/i);
      if (mArrives && (mArrives[1] || mArrives[3])) {
        const d = mArrives[1] || mArrives[3];
        const yr = parseInt(mArrives[4] || currentYear, 10);
        const mIdx = MONTH_MAP[mArrives[2].toLowerCase().slice(0, 3)];
        checkIn = formatYMD(yr, mIdx, d);

        const nightsMatch = cleanSearchText.match(/(\d+)\s+nights?/i);
        const nights = nightsMatch ? parseInt(nightsMatch[1], 10) : 1;
        const inDate = new Date(yr, mIdx - 1, parseInt(d, 10));
        inDate.setDate(inDate.getDate() + nights);
        checkOut = `${inDate.getFullYear()}-${String(inDate.getMonth() + 1).padStart(2, '0')}-${String(inDate.getDate()).padStart(2, '0')}`;
      }
    }

    // 4. Guest Name Extraction
    let guestName = null;
    const subMatch = cleanSearchText.match(/(?:Reservation|Booking)\s+confirmed\s*(?:-|–|:|for)\s*([A-Za-z\s.'’]+?)(?:\s+arrives|\s+booked|\s+is|\s+-|\s+–|$|\n)/i);
    if (subMatch && subMatch[1].trim().length > 1) {
      guestName = subMatch[1].trim();
    }

    // Only if not found in subject, check explicit "Guest: Name" or "Guest name: Name"
    if (!guestName || guestName.toLowerCase() === 'airbnb guest') {
      const guestLabelMatch = cleanSearchText.match(/Guest(?:\s*name)?[:\s]+([A-Za-z\s.'’]+?)(?:\n|$)/i);
      if (guestLabelMatch && guestLabelMatch[1].trim().length > 1) {
        guestName = guestLabelMatch[1].trim();
      }
    }

    // Safety: ensure no accidental UI button words leak into name
    if (guestName) {
      guestName = guestName.replace(/^(Send|Message|Contact)\s+/i, '').trim();
    }

    if (!guestName) {
      guestName = existingBooking && existingBooking.guest_name && !existingBooking.guest_name.startsWith('🏨')
        ? existingBooking.guest_name
        : 'Airbnb Guest';
    }

    // 5. Total Payout (Net payout to host from email)
    let totalAmount = 0;
    const netMatch = cleanSearchText.match(/(?:Total\s*payout|Host\s*payout|Net\s*payout|You(?:'ll)?\s*earn(?:ed)?|Payout|Total\s*\(INR\))[:\s]*(?:₹|INR|Rs\.?)\s*([\d,]+(?:\.\d{2})?)/i);
    if (netMatch) {
      const cleanAmt = parseFloat(netMatch[1].replace(/,/g, ''));
      if (cleanAmt > 0) totalAmount = cleanAmt;
    }

    // 6. Guests count
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

    // 7. Door Code / Phone digits
    let doorCode = '';
    const codeDigits = cleanSearchText.match(/(?:door code|suggested door code|phone number \(last 4 digits\))[:\s]*(\d{4})/i);
    if (codeDigits) doorCode = codeDigits[1];

    let perDayRate = 0;
    if (checkIn && checkOut && totalAmount > 0) {
      const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)));
      perDayRate = Math.round(totalAmount / nights);
    }

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
  if (bk.doorCode) patchPayload.phone = `+91 XXXXX ${bk.doorCode}`;
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
    Logger.log(`ENRICHED booking ${existingBookingId} -> Guest: ${bk.guestName}, Guests: ${bk.guests}, Amount: ${bk.totalAmount}`);
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
  const allTriggers = ScriptApp.getProjectTriggers();
  for (const t of allTriggers) {
    if (t.getHandlerFunction() === 'syncAirbnbReservations') {
      ScriptApp.deleteTrigger(t);
    }
  }

  ScriptApp.newTrigger('syncAirbnbReservations')
    .timeBased()
    .everyMinutes(10)
    .create();

  Logger.log("✅ Automatic 10-minute sync trigger installed successfully!");
}

/**
 * 🔄 Force Enrich All: Run this to instantly update all upcoming bookings
 */
function forceEnrichAll() {
  Logger.log("=== RUNNING FORCE ENRICHMENT FOR ALL BOOKINGS ===");
  syncAirbnbReservations();
}
