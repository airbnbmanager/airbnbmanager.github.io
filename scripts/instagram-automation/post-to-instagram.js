/**
 * 📲 THE UNIQUE HAVEN HOMES - INSTAGRAM PUBLISHER & ROTATION ENGINE
 * Rotates daily across verified properties (Pink Paradise, Yellow House, Green Forest, etc.)
 * Generates the Reel & Caption, then publishes to Instagram via Official Meta Graph API.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { PROPERTIES } = require('./property-catalog.js');
const { generatePropertyReel } = require('./generate-property-reel.js');

const STATE_FILE = path.resolve(__dirname, 'rotation-state.json');

// Get last posted index and advance
function getNextProperty() {
  let state = { lastIndex: -1, history: [] };
  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {}
  }
  const nextIndex = (state.lastIndex + 1) % PROPERTIES.length;
  state.lastIndex = nextIndex;
  state.lastPostedCode = PROPERTIES[nextIndex].code;
  state.lastPostedAt = new Date().toISOString();
  state.history = state.history || [];
  state.history.unshift({ code: PROPERTIES[nextIndex].code, date: state.lastPostedAt });
  if (state.history.length > 30) state.history = state.history.slice(0, 30);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  return PROPERTIES[nextIndex];
}

// Publish to Instagram Graph API (Official Meta API)
async function publishToInstagram(videoUrl, caption) {
  const IG_USER_ID = process.env.INSTAGRAM_PAGE_ID || process.env.IG_USER_ID;
  const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.IG_ACCESS_TOKEN;

  if (!IG_USER_ID || !ACCESS_TOKEN) {
    console.log('\n⚠️ INSTAGRAM_PAGE_ID or INSTAGRAM_ACCESS_TOKEN not set in environment.');
    console.log('Video generated locally. Set environment variables to enable 100% automated publishing.');
    return { success: false, reason: 'NO_CREDENTIALS' };
  }

  console.log(`\n🚀 Initializing Instagram Graph API Reel upload for ID: ${IG_USER_ID}...`);

  // Step 1: Create Container
  const createContainerUrl = `https://graph.facebook.com/v19.0/${IG_USER_ID}/media`;
  const postData = JSON.stringify({
    media_type: 'REELS',
    video_url: videoUrl,
    caption: caption,
    share_to_feed: true,
    access_token: ACCESS_TOKEN
  });

  const containerRes = await makeHttpRequest(createContainerUrl, 'POST', postData);
  if (!containerRes.id) {
    throw new Error('Failed to create Instagram Reel container: ' + JSON.stringify(containerRes));
  }
  const containerId = containerRes.id;
  console.log(`✓ Reel container created: ${containerId}`);

  // Step 2: Poll container status until ready
  console.log('⏳ Waiting for Meta video processing...');
  let ready = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(r => setTimeout(r, 6000));
    const statusUrl = `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${ACCESS_TOKEN}`;
    const statusRes = await makeHttpRequest(statusUrl, 'GET');
    console.log(`  Processing status: ${statusRes.status_code || 'IN_PROGRESS'}`);
    if (statusRes.status_code === 'FINISHED') {
      ready = true;
      break;
    } else if (statusRes.status_code === 'ERROR') {
      throw new Error('Instagram video processing error: ' + JSON.stringify(statusRes));
    }
  }

  if (!ready) throw new Error('Video processing timed out on Meta servers.');

  // Step 3: Publish container
  console.log('📢 Publishing Reel to live Instagram feed...');
  const publishUrl = `https://graph.facebook.com/v19.0/${IG_USER_ID}/media_publish`;
  const publishData = JSON.stringify({
    creation_id: containerId,
    access_token: ACCESS_TOKEN
  });

  const publishRes = await makeHttpRequest(publishUrl, 'POST', publishData);
  console.log(`🎉 REEL PUBLISHED SUCCESSFULLY! Post ID: ${publishRes.id}`);
  return { success: true, postId: publishRes.id };
}

function makeHttpRequest(urlStr, method = 'GET', postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

// Master Runner
async function runDailyAutomation() {
  const property = getNextProperty();
  console.log(`\n======================================================`);
  console.log(`📅 ROTATION SELECTED: [${property.code}] ${property.name}`);
  console.log(`======================================================`);

  const result = await generatePropertyReel(property.code);
  return result;
}

if (require.main === module) {
  runDailyAutomation().catch(err => {
    console.error('Automation error:', err);
    process.exit(1);
  });
}

module.exports = {
  runDailyAutomation,
  getNextProperty,
  publishToInstagram
};
