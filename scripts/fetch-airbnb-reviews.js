#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════
 *  UNIQUE HAVEN HOMES — Airbnb Review Fetcher
 *  
 *  Fetches reviews for all 17 properties from Airbnb's internal API
 *  and saves the best reviews to Supabase → property_reviews table.
 *  
 *  Usage:
 *    node scripts/fetch-airbnb-reviews.js
 *    node scripts/fetch-airbnb-reviews.js --limit 7
 *    node scripts/fetch-airbnb-reviews.js --property dark-blue
 * 
 *  Run this monthly or whenever you want fresh reviews on the website.
 * ═══════════════════════════════════════════════════════════════════
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// ── CONFIG ────────────────────────────────────────────────────────
const SUPABASE_URL     = 'https://vxxmigdzimnrbbmkjzoa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 
  // Use the service role key (NOT anon key) for write access
  // Get from: Supabase Dashboard → Settings → API → service_role key
  'YOUR_SUPABASE_SERVICE_ROLE_KEY';

const REVIEW_LIMIT  = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '8');
const FILTER_PROP   = process.argv.find(a => a.startsWith('--property='))?.split('=')[1];

// ── ALL 17 PROPERTIES WITH AIRBNB LISTING IDs ────────────────────
const PROPERTIES = [
  { room_id:'GOM-101', slug:'redrose-palace',          name:'RedRose Palace',           airbnb_id:'1654261872286835347' },
  { room_id:'GOM-102', slug:'black-beauty',            name:'Black Beauty',             airbnb_id:'1676840617430941240' },
  { room_id:'GOM-201', slug:'the-dark-blue',           name:'The Dark Blue',            airbnb_id:'1655969170448425308' },
  { room_id:'GOM-202', slug:'the-brown',               name:'The Brown',                airbnb_id:'1660898784168880636' },
  { room_id:'GOM-301', slug:'the-light-green',         name:'The Light Green',          airbnb_id:'1679155811558485410' },
  { room_id:'GOM-401', slug:'the-nawabi-stay',         name:'The Nawabi Stay',          airbnb_id:'1723434530455939144' },
  { room_id:'GOM-501', slug:'starlight-blue-penthouse',name:'Starlight Blue Penthouse', airbnb_id:'1718385679817913835' },
  { room_id:'GOM-302', slug:'the-unique',              name:'The Unique',               airbnb_id:'1679190202218939181' },
  { room_id:'VIL-104', slug:'the-green-house',         name:'The Green House',          airbnb_id:'1593461780265937816' },
  { room_id:'VIL-103', slug:'the-pink-house',          name:'The Pink House',           airbnb_id:'1592729438969718723' },
  { room_id:'VIL-105', slug:'the-yellow-house',        name:'The Yellow House',         airbnb_id:'1592729918855637425' },
  { room_id:'VIL-106', slug:'green-forest',            name:'Green Forest',             airbnb_id:'1739254108962193705' },
  { room_id:'VIL-108', slug:'pink-paradise',           name:'Pink Paradise',            airbnb_id:'1756799939825259443' },
  { room_id:'LUL-402', slug:'celebrity-garden',        name:'Celebrity Garden',         airbnb_id:'1606514664948608755' },
  { room_id:'VIL-101', slug:'gomti-grand-villa',       name:'Gomti Grand Villa',        airbnb_id:'1721732716374002170' },
  { room_id:'VIL-102', slug:'royal-white-house',       name:'Royal White House',        airbnb_id:'1718315215180636685' },
  { room_id:'VIL-107', slug:'the-velvet-house',        name:'The Velvet House',         airbnb_id:'1727830063287100082' },
];

// ── FETCH HELPERS ─────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Airbnb-API-Key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
        ...options.headers
      }
    };
    const req = https.get(url, opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ── AIRBNB REVIEW FETCHER ─────────────────────────────────────────
async function fetchReviewsForListing(airbnb_id, limit = 8) {
  const url = `https://www.airbnb.com/api/v2/reviews?listing_id=${airbnb_id}&_limit=${limit}&role=guest&_format=for_p3&_source=5&language=en`;
  
  try {
    const data = await fetchJson(url);
    
    if (!data.reviews || !Array.isArray(data.reviews)) {
      console.log(`  ⚠️  No reviews array in response for ${airbnb_id}`);
      return [];
    }
    
    return data.reviews.map(r => ({
      reviewer_name:   r.reviewer?.first_name || r.reviewer_name || 'Guest',
      reviewer_from:   r.reviewer?.location || '',
      reviewer_avatar: (r.reviewer?.picture_url) || '',
      rating:          r.rating || 5,
      review_text:     r.comments || r.response || '',
      review_date:     r.created_at ? r.created_at.split('T')[0] : null,
      review_date_str: r.localized_date || '',
    })).filter(r => r.review_text && r.review_text.length > 20); // Skip blank/tiny reviews
    
  } catch (err) {
    console.log(`  ❌ Fetch error for ${airbnb_id}: ${err.message}`);
    return [];
  }
}

// ── POLISH REVIEW TEXT ────────────────────────────────────────────
function polishReview(text) {
  if (!text) return '';
  
  // Trim and normalize whitespace
  let cleaned = text.trim().replace(/\s+/g, ' ');
  
  // Limit to reasonable length for display (keep it punchy)
  if (cleaned.length > 380) {
    // Cut at last complete sentence before 380 chars
    const cutoff = cleaned.substring(0, 380);
    const lastPeriod = Math.max(cutoff.lastIndexOf('.'), cutoff.lastIndexOf('!'), cutoff.lastIndexOf('?'));
    cleaned = lastPeriod > 200 ? cutoff.substring(0, lastPeriod + 1) : cutoff + '…';
  }
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  return cleaned;
}

// ── SCORE A REVIEW (pick the best ones) ──────────────────────────
function scoreReview(review) {
  let score = 0;
  const text = review.review_text || '';
  
  // Length score (20-300 chars is the sweet spot for display)
  const len = text.length;
  if (len >= 80 && len <= 300) score += 30;
  else if (len >= 40) score += 15;
  
  // Rating
  score += (review.rating || 0) * 10;
  
  // Positive keywords
  const positive = ['amazing', 'excellent', 'perfect', 'wonderful', 'fantastic', 'great', 
    'beautiful', 'loved', 'best', 'highly recommend', 'clean', 'comfortable', 'luxury',
    'awesome', 'spacious', 'superb', 'outstanding', 'lovely', 'stunning', 'fabulous',
    'immaculate', 'gorgeous', 'incredible', 'marvelous', 'exceptional'];
  const textLower = text.toLowerCase();
  positive.forEach(word => { if (textLower.includes(word)) score += 5; });
  
  // Has location mention = authentic
  if (textLower.includes('lucknow') || textLower.includes('gomti')) score += 8;
  
  // Penalize very short reviews
  if (len < 40) score -= 20;
  
  // Penalize complaint keywords
  const negative = ['but', 'however', 'except', 'issue', 'problem', 'noise', 'dirty'];
  negative.forEach(word => { if (textLower.includes(word)) score -= 5; });
  
  return score;
}

// ── SAVE TO SUPABASE ──────────────────────────────────────────────
async function saveReviews(sb, property, reviews) {
  if (!reviews.length) return 0;
  
  const rows = reviews.map((r, i) => ({
    room_id:        property.room_id,
    slug:           property.slug,
    property_name:  property.name,
    airbnb_id:      property.airbnb_id,
    reviewer_name:  r.reviewer_name,
    reviewer_avatar:r.reviewer_avatar || '',
    reviewer_from:  r.reviewer_from  || '',
    rating:         r.rating,
    review_text:    polishReview(r.review_text),
    review_date:    r.review_date,
    review_date_str:r.review_date_str,
    is_featured:    i === 0, // Mark the best review as featured
    fetched_at:     new Date().toISOString()
  })).filter(r => r.review_text.length > 20);
  
  const { data, error } = await sb
    .from('property_reviews')
    .upsert(rows, { onConflict: 'airbnb_id,reviewer_name,review_date_str', ignoreDuplicates: false })
    .select();
  
  if (error) {
    console.log(`  ❌ Supabase save error: ${error.message}`);
    return 0;
  }
  
  return data?.length || rows.length;
}

// ── MAIN ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n🏡 Unique Haven Homes — Airbnb Review Fetcher');
  console.log('━'.repeat(50));
  
  if (SUPABASE_SERVICE_KEY === 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
    console.error('\n❌ ERROR: Set SUPABASE_SERVICE_KEY environment variable!');
    console.error('   Get it from: Supabase → Settings → API → service_role\n');
    console.error('   Run: SUPABASE_SERVICE_KEY=your_key node scripts/fetch-airbnb-reviews.js\n');
    process.exit(1);
  }
  
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const properties = FILTER_PROP
    ? PROPERTIES.filter(p => p.slug.includes(FILTER_PROP) || p.room_id.includes(FILTER_PROP))
    : PROPERTIES;
  
  console.log(`\n📋 Processing ${properties.length} properties, ${REVIEW_LIMIT} reviews each…\n`);
  
  let totalSaved = 0;
  
  for (const prop of properties) {
    process.stdout.write(`  🔍 ${prop.name.padEnd(30)} `);
    
    const rawReviews = await fetchReviewsForListing(prop.airbnb_id, Math.min(REVIEW_LIMIT + 5, 15));
    
    if (!rawReviews.length) {
      console.log('⚠️  No reviews fetched');
      await delay(1500);
      continue;
    }
    
    // Score and sort — pick the best ones
    const scored = rawReviews
      .map(r => ({ ...r, score: scoreReview(r) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, REVIEW_LIMIT);
    
    const saved = await saveReviews(sb, prop, scored);
    totalSaved += saved;
    
    console.log(`✅ ${rawReviews.length} fetched → ${saved} saved`);
    
    // Polite delay between requests (avoid rate limiting)
    await delay(1200 + Math.random() * 800);
  }
  
  console.log('\n' + '━'.repeat(50));
  console.log(`✅ DONE! Saved ${totalSaved} reviews to Supabase`);
  console.log(`🌐 Reviews will now appear live on the website!\n`);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
