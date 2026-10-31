/* ══════════════════════════════════════════════════════════════════
   THE UNIQUE HAVEN HOMES — SEASONAL & DYNAMIC PRICING ENGINE
   Synchronizes real-time seasonal multipliers (+10% Oct, +15% Nov)
   between Website (book.html, property-engine.js, price-sync.js)
   and CRM (rate-manager.html, smart-bookings.js, Supabase tables).
   ══════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UHH_SEASONAL = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // ── Baseline Master Rates for all 17 Properties (Direct Base / Airbnb Strike)
  const BASELINE_RATES = {
    'GOM-101': { id: 'GOM-101', slug: 'redrose-palace',           name: 'RedRose Palace',           base: 4500, airbnb: 5499, guests: 6 },
    'GOM-102': { id: 'GOM-102', slug: 'black-beauty',             name: 'Black Beauty',             base: 4500, airbnb: 5499, guests: 6 },
    'GOM-201': { id: 'GOM-201', slug: 'the-dark-blue',            name: 'The Dark Blue',            base: 4500, airbnb: 5499, guests: 6 },
    'GOM-202': { id: 'GOM-202', slug: 'the-brown',                name: 'The Brown',                base: 4500, airbnb: 5499, guests: 6 },
    'GOM-301': { id: 'GOM-301', slug: 'the-light-green',          name: 'The Light Green',          base: 4500, airbnb: 5499, guests: 6 },
    'GOM-302': { id: 'GOM-302', slug: 'the-unique',               name: 'The Unique',               base: 5500, airbnb: 6499, guests: 6 },
    'GOM-401': { id: 'GOM-401', slug: 'the-nawabi-stay',          name: 'The Nawabi Stay',          base: 4500, airbnb: 5499, guests: 6 },
    'GOM-501': { id: 'GOM-501', slug: 'starlight-blue-penthouse', name: 'Starlight Blue Penthouse', base: 6000, airbnb: 7499, guests: 6 },
    'VIL-101': { id: 'VIL-101', slug: 'gomti-grand-villa',        name: 'Gomti Grand Villa',        base: 8000, airbnb: 9499, guests: 6 },
    'VIL-102': { id: 'VIL-102', slug: 'royal-white-house',        name: 'Royal White House',        base: 12000, airbnb: 14999, guests: 12 },
    'VIL-103': { id: 'VIL-103', slug: 'the-pink-house',           name: 'The Pink House',           base: 9000, airbnb: 10499, guests: 10 },
    'VIL-104': { id: 'VIL-104', slug: 'the-green-house',          name: 'The Green House',          base: 5500, airbnb: 6499, guests: 6 },
    'VIL-105': { id: 'VIL-105', slug: 'the-yellow-house',         name: 'The Yellow House',         base: 5500, airbnb: 6499, guests: 6 },
    'VIL-106': { id: 'VIL-106', slug: 'green-forest',             name: 'Green Forest',             base: 4500, airbnb: 5499, guests: 6 },
    'VIL-107': { id: 'VIL-107', slug: 'the-velvet-house',         name: 'The Velvet House',         base: 4500, airbnb: 5499, guests: 6 },
    'VIL-108': { id: 'VIL-108', slug: 'pink-paradise',            name: 'Pink Paradise',            base: 4500, airbnb: 5499, guests: 6 },
    'LUL-402': { id: 'LUL-402', slug: 'celebrity-garden',         name: 'Celebrity Garden',         base: 10000, airbnb: 11999, guests: 10 }
  };

  // ── Month-Based Rate Adjustments (Oct: +10%, Nov: +15%)
  const SEASONAL_RULES = {
    10: { monthName: 'October',  surgePercent: 10, multiplier: 1.10, tag: 'October Rate', season: 'October' },
    11: { monthName: 'November', surgePercent: 15, multiplier: 1.15, tag: 'November Rate', season: 'November' }
  };

  // Helper: Round nicely to nearest 50
  function roundTo50(num) {
    return Math.round(num / 50) * 50;
  }

  // Helper: Get rule for a given Date or month number (1-12)
  function getRuleForMonth(month1to12) {
    return SEASONAL_RULES[month1to12] || null;
  }

  function getRuleForDate(dateInput) {
    if (!dateInput) return null;
    const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    const month = d.getMonth() + 1; // 1-indexed (10 for Oct, 11 for Nov)
    return getRuleForMonth(month);
  }

  // ── Calculate Night-by-Night Pricing for a Stay
  // Accurately splits nights spanning across months (e.g. Oct 30 to Nov 2)
  function calculateStayPricing(baseRate, checkInStr, checkOutStr) {
    const fallbackRate = Number(baseRate) || 4500;
    if (!checkInStr || !checkOutStr) {
      return {
        totalBase: fallbackRate,
        effectiveNightlyRate: fallbackRate,
        nights: 1,
        octNights: 0,
        novNights: 0,
        standardNights: 1,
        surgeSummary: '',
        gstRate: fallbackRate <= 7500 ? 5 : 18,
        gstAmount: Math.round(fallbackRate * ((fallbackRate <= 7500 ? 5 : 18) / 100)),
        grossTotal: fallbackRate + Math.round(fallbackRate * ((fallbackRate <= 7500 ? 5 : 18) / 100)),
        nightDetails: []
      };
    }

    const start = new Date(checkInStr);
    const end = new Date(checkOutStr);
    const msPerDay = 86400000;
    const rawNights = Math.round((end - start) / msPerDay);
    const nights = Math.max(rawNights, 1);

    let totalBase = 0;
    let octNights = 0;
    let novNights = 0;
    let standardNights = 0;
    const nightDetails = [];

    // Loop through each night of the booking
    const curr = new Date(start);
    for (let i = 0; i < nights; i++) {
      const month = curr.getMonth() + 1; // 1-12
      const dateIso = curr.toISOString().slice(0, 10);
      let nightRate = fallbackRate;
      let surgePct = 0;
      let label = 'Standard';

      if (month === 10) {
        surgePct = 10;
        nightRate = roundTo50(fallbackRate * 1.10);
        octNights++;
        label = 'October';
      } else if (month === 11) {
        surgePct = 15;
        nightRate = roundTo50(fallbackRate * 1.15);
        novNights++;
        label = 'November';
      } else {
        standardNights++;
      }

      totalBase += nightRate;
      nightDetails.push({ date: dateIso, rate: nightRate, surgePct, label });
      curr.setDate(curr.getDate() + 1);
    }

    const effectiveNightlyRate = Math.round(totalBase / nights);
    const gstRate = effectiveNightlyRate <= 7500 ? 5 : 18;
    const gstAmount = Math.round(totalBase * (gstRate / 100));
    const grossTotal = totalBase + gstAmount;

    // No promotional/surge text on invoices or summary — keep 100% clean
    const surgeSummary = '';

    return {
      totalBase,
      effectiveNightlyRate,
      nights,
      octNights,
      novNights,
      standardNights,
      surgeSummary,
      gstRate,
      gstAmount,
      grossTotal,
      nightDetails
    };
  }

  // ── Calculate Surged Rate for a Single Month
  function getSurgedRate(baseRate, month1to12) {
    const rate = Number(baseRate) || 4500;
    if (month1to12 === 10) return roundTo50(rate * 1.10);
    if (month1to12 === 11) return roundTo50(rate * 1.15);
    return rate;
  }

  // ── Get Active Season for Current Timestamp
  function getActiveSeason(now = new Date()) {
    const month = now.getMonth() + 1;
    if (month === 10) {
      return {
        month: 10,
        monthName: 'October',
        surgePercent: 10,
        multiplier: 1.10,
        badge: 'October Rates (+10%)',
        status: 'active'
      };
    }
    if (month === 11) {
      return {
        month: 11,
        monthName: 'November',
        surgePercent: 15,
        multiplier: 1.15,
        badge: 'November Rates (+15%)',
        status: 'active'
      };
    }
    return {
      month,
      monthName: now.toLocaleString('en-US', { month: 'long' }),
      surgePercent: 0,
      multiplier: 1.0,
      badge: 'Standard Rates Active',
      status: 'standard'
    };
  }

  return {
    BASELINE_RATES,
    SEASONAL_RULES,
    roundTo50,
    getRuleForMonth,
    getRuleForDate,
    calculateStayPricing,
    getSurgedRate,
    getActiveSeason
  };
});
