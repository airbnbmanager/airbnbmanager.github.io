/**
 * ═══════════════════════════════════════════════════════════
 * 🔄 RECONCILE AIRBNB EXACT PAYOUTS (NO 5% TDS DOUBLE DEDUCTION)
 * Sets total_amount and payment_history to the exact official
 * "You earn" amount from the official Airbnb CSV (e.g. ₹3,912.35).
 * ═══════════════════════════════════════════════════════════
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const cfg = fs.readFileSync('config.js', 'utf8');
const urlMatch = cfg.match(/SUPABASE_URL\s*=\s*['\"]([^'\"]+)['\"]/);
const keyMatch = cfg.match(/SUPABASE_ANON_KEY\s*=\s*['\"]([^'\"]+)['\"]/);
const sb = createClient(urlMatch[1], keyMatch[1]);

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const parseLine = (line) => {
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '\"' && line[i+1] === '\"') { cur += '\"'; i++; }
      else if (ch === '\"') inQ = !inQ;
      else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map(h => h.trim().replace(/^\uFEFF/, '').replace(/^\"|\"$/g, ''));
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((h, i) => { 
      row[h] = (values[i] || '').trim().replace(/^\"|\"$/g, ''); 
    });
    return row;
  });
}

function parseDate(str) {
  if (!str) return null;
  str = String(str).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      let m = parts[0], d = parts[1], y = parts[2];
      return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    }
  }
  return str;
}

function getRoomIdByListing(listingName) {
  if (!listingName) return null;
  const l = listingName.toLowerCase();
  if (l.includes('pink paradise') || l.includes('vil-108')) return 'VIL-108';
  if (l.includes('yellow house') || l.includes('vil-105')) return 'VIL-105';
  if (l.includes('green forest') || l.includes('vil-106')) return 'VIL-106';
  if (l.includes('celebrity') || l.includes('lul-402')) return 'LUL-402';
  if (l.includes('unique') || l.includes('gom-302')) return 'GOM-302';
  if (l.includes('light green') || l.includes('gom-301')) return 'GOM-301';
  if (l.includes('starlight') || l.includes('penthouse') || l.includes('gom-501')) return 'GOM-501';
  if (l.includes('black beauty') || l.includes('gom-102')) return 'GOM-102';
  if (l.includes('nawabi') || l.includes('gom-401')) return 'GOM-401';
  if (l.includes('gomti grand') || l.includes('vil-101')) return 'VIL-101';
  if (l.includes('green house') || l.includes('vil-104')) return 'VIL-104';
  if (l.includes('pink house') || l.includes('vil-103')) return 'VIL-103';
  if (l.includes('brown') || l.includes('gom-202')) return 'GOM-202';
  if (l.includes('velvet') || l.includes('vil-107')) return 'VIL-107';
  if (l.includes('royal white') || l.includes('vil-102')) return 'VIL-102';
  if (l.includes('dark blue') || l.includes('gom-201')) return 'GOM-201';
  if (l.includes('redrose') || l.includes('gom-101')) return 'GOM-101';
  return null;
}

async function reconcileAllAirbnbBookings() {
  console.log('🚀 Starting Airbnb Exact Payout Reconciler...');
  const csvText = fs.readFileSync('airbnb_07_2026-10_2026.csv', 'utf8');
  const rows = parseCSV(csvText);

  // Group all transaction rows by confirmation code
  const codeAgg = {};
  rows.forEach(r => {
    const type = (r['Type'] || '').trim();
    const code = (r['Confirmation Code'] || r['Confirmation code'] || '').trim();
    if (!code || type === 'Payout') return;

    if (!codeAgg[code]) {
      codeAgg[code] = { netAmountSum: 0, reservationRow: null };
    }
    const amt = parseFloat((r['Amount'] || '0').replace(/,/g, '').trim()) || 0;
    codeAgg[code].netAmountSum += amt;

    if (type === 'Reservation') {
      codeAgg[code].reservationRow = r;
    }
  });

  const reservations = [];
  Object.keys(codeAgg).forEach(code => {
    const agg = codeAgg[code];
    const r = agg.reservationRow;
    if (!r) return;

    const sDate = parseDate(r['Start date']);
    const eDate = parseDate(r['End date']);
    const guest = (r['Guest'] || '').trim();
    const listing = (r['Listing'] || '').trim();
    const nights = parseInt(r['Nights'] || '1', 10) || 1;
    const gross = parseFloat((r['Gross earnings'] || '0').replace(/,/g, '')) || 0;
    const resAmount = parseFloat((r['Amount'] || '0').replace(/,/g, '')) || 0;

    // Exact official "You earn" (algebraic sum of all items for this code)
    let you_earn = Math.round(agg.netAmountSum * 100) / 100;
    if (you_earn <= 0) {
      you_earn = Math.round((resAmount > 0 ? resAmount : gross) * 100) / 100;
    }

    reservations.push({
      code,
      guest,
      checkIn: sDate,
      checkOut: eDate,
      nights,
      you_earn,
      roomId: getRoomIdByListing(listing)
    });
  });

  console.log(`📋 Found ${reservations.length} reservations in Airbnb CSV`);

  const { data: dbBks } = await sb.from('guest_register')
    .select('booking_id, guest_name, check_in, check_out, total_amount, airbnb_confirmation_code, room_id, booking_mode');

  let updatedCount = 0;

  for (const r of reservations) {
    let match = dbBks.find(b => b.airbnb_confirmation_code === r.code);
    if (!match && r.roomId && r.checkIn) {
      match = dbBks.find(b => b.room_id === r.roomId && b.check_in === r.checkIn);
    }

    if (match) {
      const cur = Number(match.total_amount) || 0;
      if (Math.abs(cur - r.you_earn) > 0.01) {
        // Update guest_register
        await sb.from('guest_register').update({
          total_amount: r.you_earn,
          per_day_rate: r.nights > 0 ? Math.round(r.you_earn / r.nights) : r.you_earn,
          payment_status: 'Paid',
          airbnb_confirmation_code: r.code
        }).eq('booking_id', match.booking_id);

        // Update payment_history to match exact net payout
        const { data: payList } = await sb.from('payment_history').select('id, amount').eq('booking_id', match.booking_id);
        if (payList && payList.length > 0) {
          await sb.from('payment_history').update({
            amount: r.you_earn,
            notes: 'Reconciled to exact Airbnb You Earn payout'
          }).eq('id', payList[0].id);
        } else {
          await sb.from('payment_history').insert({
            booking_id: match.booking_id,
            amount: r.you_earn,
            payment_mode: 'Airbnb Payout',
            payment_date: match.check_in,
            received_by: 'Firoz',
            received_by_type: 'employee',
            handover_status: 'handed_over',
            verification_status: 'verified',
            notes: 'Reconciled to exact Airbnb You Earn payout'
          });
        }
        updatedCount++;
      }
    }
  }

  console.log(`✅ Successfully updated ${updatedCount} Airbnb bookings to exact official payout!`);
}

reconcileAllAirbnbBookings().catch(console.error);
