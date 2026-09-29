#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  UNIQUE HAVEN HOMES — Airbnb Review Fetcher (HTML Scraper)
 *  
 *  Fetches reviews by scraping Airbnb listing pages (JSON-LD + 
 *  Next.js __NEXT_DATA__ embedded in the HTML).
 *  
 *  Usage:
 *    SUPABASE_SERVICE_KEY=xxx node scripts/fetch-airbnb-reviews.js
 *    SUPABASE_SERVICE_KEY=xxx node scripts/fetch-airbnb-reviews.js --limit=6
 * ═══════════════════════════════════════════════════════════════════
 */

'use strict';
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vxxmigdzimnrbbmkjzoa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const REVIEW_LIMIT = parseInt((process.argv.find(a => a.startsWith('--limit=')) || '=8').split('=')[1]);

// ── ALL 17 PROPERTIES ─────────────────────────────────────────────
const PROPERTIES = [
  { room_id:'GOM-101', slug:'redrose-palace',           name:'RedRose Palace',           airbnb_id:'1654261872286835347' },
  { room_id:'GOM-102', slug:'black-beauty',             name:'Black Beauty',             airbnb_id:'1676840617430941240' },
  { room_id:'GOM-201', slug:'the-dark-blue',            name:'The Dark Blue',            airbnb_id:'1655969170448425308' },
  { room_id:'GOM-202', slug:'the-brown',                name:'The Brown',                airbnb_id:'1660898784168880636' },
  { room_id:'GOM-301', slug:'the-light-green',          name:'The Light Green',          airbnb_id:'1679155811558485410' },
  { room_id:'GOM-401', slug:'the-nawabi-stay',          name:'The Nawabi Stay',          airbnb_id:'1723434530455939144' },
  { room_id:'GOM-501', slug:'starlight-blue-penthouse', name:'Starlight Blue Penthouse', airbnb_id:'1718385679817913835' },
  { room_id:'GOM-302', slug:'the-unique',               name:'The Unique',               airbnb_id:'1679190202218939181' },
  { room_id:'VIL-104', slug:'the-green-house',          name:'The Green House',          airbnb_id:'1593461780265937816' },
  { room_id:'VIL-103', slug:'the-pink-house',           name:'The Pink House',           airbnb_id:'1592729438969718723' },
  { room_id:'VIL-105', slug:'the-yellow-house',         name:'The Yellow House',         airbnb_id:'1592729918855637425' },
  { room_id:'VIL-106', slug:'green-forest',             name:'Green Forest',             airbnb_id:'1739254108962193705' },
  { room_id:'VIL-108', slug:'pink-paradise',            name:'Pink Paradise',            airbnb_id:'1756799939825259443' },
  { room_id:'LUL-402', slug:'celebrity-garden',         name:'Celebrity Garden',         airbnb_id:'1606514664948608755' },
  { room_id:'VIL-101', slug:'gomti-grand-villa',        name:'Gomti Grand Villa',        airbnb_id:'1721732716374002170' },
  { room_id:'VIL-102', slug:'royal-white-house',        name:'Royal White House',        airbnb_id:'1718315215180636685' },
  { room_id:'VIL-107', slug:'the-velvet-house',         name:'The Velvet House',         airbnb_id:'1727830063287100082' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'identity',
  'Cache-Control': 'no-cache',
};

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── FETCH LISTING PAGE HTML ───────────────────────────────────────
function fetchHtml(airbnb_id) {
  return new Promise((resolve) => {
    const url = `https://www.airbnb.co.in/rooms/${airbnb_id}?adults=2`;
    const req = https.get(url, { headers: HEADERS }, (res) => {
      // Handle redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        resolve({ html: '', redirected: true });
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8'), status: res.statusCode }));
    });
    req.on('error', e => resolve({ html: '', error: e.message }));
    req.setTimeout(20000, () => { req.destroy(); resolve({ html: '', error: 'timeout' }); });
  });
}

// ── EXTRACT REVIEWS FROM __NEXT_DATA__ ───────────────────────────
function extractReviews(html, airbnb_id) {
  const reviews = [];
  
  // Method 1: Extract from __NEXT_DATA__ JSON blob
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const reviewsData = findReviewsInObject(nextData);
      if (reviewsData.length > 0) return reviewsData;
    } catch (_) {}
  }
  
  // Method 2: Extract from JSON-LD structured data
  const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  for (const match of jsonLdMatches) {
    try {
      const ld = JSON.parse(match[1]);
      if (ld.review || ld.aggregateRating) {
        const ldReviews = (ld.review || []).map(r => ({
          reviewer_name:   r.author?.name || r.author || 'Guest',
          reviewer_from:   '',
          reviewer_avatar: '',
          rating:          parseInt(r.reviewRating?.ratingValue || 5),
          review_text:     r.reviewBody || r.description || '',
          review_date:     r.datePublished || null,
          review_date_str: formatDate(r.datePublished),
        }));
        if (ldReviews.length > 0) reviews.push(...ldReviews);
      }
    } catch (_) {}
  }
  
  // Method 3: Regex extract from raw HTML (review text patterns)
  if (reviews.length === 0) {
    const reviewRegex = /"reviewBody":"([^"]{40,400})"/g;
    const nameRegex   = /"author":\{"@type":"Person","name":"([^"]+)"/g;
    const dateRegex   = /"datePublished":"([^"]+)"/g;
    
    const texts  = [...html.matchAll(reviewRegex)].map(m => m[1]);
    const names  = [...html.matchAll(nameRegex)].map(m => m[1]);
    const dates  = [...html.matchAll(dateRegex)].map(m => m[1]);
    
    texts.forEach((text, i) => {
      reviews.push({
        reviewer_name:   names[i] || 'Guest',
        reviewer_from:   '',
        reviewer_avatar: '',
        rating:          5,
        review_text:     text.replace(/\\n/g, ' ').replace(/\\"/g, '"'),
        review_date:     dates[i] || null,
        review_date_str: formatDate(dates[i]),
      });
    });
  }
  
  return reviews;
}

// ── RECURSIVELY FIND REVIEWS IN NEXT.JS DATA ─────────────────────
function findReviewsInObject(obj, depth = 0) {
  if (depth > 8 || !obj || typeof obj !== 'object') return [];
  
  // Look for reviews arrays
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findReviewsInObject(item, depth + 1);
      if (found.length > 0) return found;
    }
    return [];
  }
  
  // Check if this looks like a review object
  if (obj.comments && obj.reviewer && typeof obj.comments === 'string' && obj.comments.length > 20) {
    return [{
      reviewer_name:   obj.reviewer?.first_name || obj.reviewer_name || 'Guest',
      reviewer_from:   obj.reviewer?.location || '',
      reviewer_avatar: obj.reviewer?.picture_url || '',
      rating:          obj.rating || 5,
      review_text:     obj.comments,
      review_date:     obj.created_at ? obj.created_at.split('T')[0] : null,
      review_date_str: obj.localized_date || formatDate(obj.created_at),
    }];
  }
  
  // Check for pdpReviews or reviews key
  if (obj.pdpReviews || obj.reviews) {
    const arr = obj.pdpReviews?.reviews || obj.reviews;
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.map(r => ({
        reviewer_name:   r.reviewer?.first_name || r.reviewer?.name || r.author?.name || 'Guest',
        reviewer_from:   r.reviewer?.location || '',
        reviewer_avatar: r.reviewer?.picture_url || '',
        rating:          r.rating || r.overallRating || 5,
        review_text:     r.comments || r.response || r.reviewBody || '',
        review_date:     (r.created_at || r.date || '').split('T')[0] || null,
        review_date_str: r.localized_date || formatDate(r.created_at),
      })).filter(r => r.review_text.length > 20);
    }
  }
  
  // Recurse into object values
  const results = [];
  for (const [key, val] of Object.entries(obj)) {
    if (['reviews', 'pdpReviews', 'reviewsData', 'guestReviews'].includes(key)) {
      const found = findReviewsInObject(val, depth + 1);
      if (found.length > 0) return found;
    }
  }
  for (const val of Object.values(obj)) {
    if (typeof val === 'object') {
      const found = findReviewsInObject(val, depth + 1);
      if (found.length > 0) return found;
    }
  }
  return results;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch (_) { return ''; }
}

// ── SCORE REVIEWS ─────────────────────────────────────────────────
function scoreReview(r) {
  let s = (r.rating || 5) * 10;
  const t = (r.review_text || '').toLowerCase();
  const len = t.length;
  if (len >= 60 && len <= 320) s += 25;
  else if (len >= 30) s += 10;
  ['amazing','excellent','perfect','wonderful','fantastic','great','beautiful','loved',
   'best','highly recommend','clean','comfortable','luxury','awesome','superb'].forEach(w => {
    if (t.includes(w)) s += 5;
  });
  if (t.includes('lucknow') || t.includes('gomti') || t.includes('lulu')) s += 10;
  if (len < 30) s -= 20;
  return s;
}

function polishText(text) {
  if (!text) return '';
  let t = text.trim().replace(/\s+/g, ' ').replace(/\\n/g, ' ');
  if (t.length > 380) {
    const cut = t.substring(0, 380);
    const last = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
    t = last > 150 ? cut.substring(0, last + 1) : cut + '…';
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ── SAVE TO SUPABASE ──────────────────────────────────────────────
async function saveReviews(sb, prop, reviews) {
  if (!reviews.length) return 0;
  const rows = reviews.map((r, i) => ({
    room_id:        prop.room_id,
    slug:           prop.slug,
    property_name:  prop.name,
    airbnb_id:      prop.airbnb_id,
    reviewer_name:  r.reviewer_name  || 'Guest',
    reviewer_avatar:r.reviewer_avatar || '',
    reviewer_from:  r.reviewer_from  || '',
    rating:         Math.min(5, Math.max(1, parseInt(r.rating) || 5)),
    review_text:    polishText(r.review_text),
    review_date:    r.review_date || null,
    review_date_str:r.review_date_str || '',
    is_featured:    i === 0,
    fetched_at:     new Date().toISOString(),
  })).filter(r => r.review_text.length > 15);

  const { data, error } = await sb.from('property_reviews')
    .upsert(rows, { onConflict: 'airbnb_id,reviewer_name,review_date_str', ignoreDuplicates: false })
    .select();
  
  if (error) { console.log(`  ❌ DB: ${error.message}`); return 0; }
  return data?.length || rows.length;
}

// ── MAIN ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n🏡 Unique Haven Homes — Airbnb Review Fetcher');
  console.log('━'.repeat(55));

  if (!SUPABASE_SERVICE_KEY) {
    console.error('\n❌ Set SUPABASE_SERVICE_KEY env variable!');
    console.error('   Supabase → Settings → API → service_role key');
    console.error('\n   Run: SUPABASE_SERVICE_KEY=eyJ... node scripts/fetch-airbnb-reviews.js\n');
    process.exit(1);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  let totalSaved = 0, totalFailed = 0;

  for (const prop of PROPERTIES) {
    process.stdout.write(`  🔍 ${prop.name.padEnd(32)} `);

    const { html, error, status } = await fetchHtml(prop.airbnb_id);

    if (error || !html) {
      console.log(`⚠️  ${error || 'Empty response'}`);
      totalFailed++;
      await delay(2000);
      continue;
    }

    const rawReviews = extractReviews(html, prop.airbnb_id);

    if (!rawReviews.length) {
      console.log(`⚠️  No reviews found in page (status: ${status})`);
      totalFailed++;
      await delay(2500);
      continue;
    }

    const best = rawReviews
      .map(r => ({ ...r, _score: scoreReview(r) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, REVIEW_LIMIT);

    const saved = await saveReviews(sb, prop, best);
    totalSaved += saved;
    console.log(`✅ ${rawReviews.length} found → ${saved} saved`);

    await delay(1500 + Math.random() * 1000);
  }

  console.log('\n' + '━'.repeat(55));
  console.log(`✅ DONE! Saved ${totalSaved} reviews to Supabase`);
  if (totalFailed > 0) {
    console.log(`⚠️  ${totalFailed} properties failed (may need re-run)`);
    console.log(`   Try: SUPABASE_SERVICE_KEY=xxx node scripts/fetch-airbnb-reviews.js`);
  }
  console.log(`🌐 Reviews will now appear live on the website!\n`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
