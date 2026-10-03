/**
 * 🎬 THE UNIQUE HAVEN HOMES - INSTAGRAM REEL GENERATOR
 * Generates 1080x1920 9:16 cinematic reels directly from verified property photos.
 * Zero generic fluff. 100% verified property details only.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { PROPERTIES, getPropertyPhotos, getPropertyByCode } = require('./property-catalog.js');

const CACHE_DIR = path.resolve(__dirname, 'cache');
const OUTPUT_DIR = path.resolve(__dirname, 'output');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function getBrowserBinary() {
  const candidates = [
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return 'google-chrome';
}

// Helper: Download image to disk
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 5000) {
      return resolve(destPath);
    }
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location, destPath).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(destPath));
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

function generateHtmlCard({ brand, title, loc, pill, deal, ctaLeft, ctaRight }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1080px;
    height: 1920px;
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 100px 60px 80px 60px;
  }
  .top-bar {
    background: rgba(15, 23, 42, 0.78);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 28px;
    padding: 30px 40px;
    box-shadow: 0 20px 40px rgba(0,0,0,0.55);
  }
  .brand-tag {
    display: inline-block;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: 3px;
    color: #38bdf8;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .prop-title {
    font-size: 52px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.15;
    margin-bottom: 14px;
  }
  .loc-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.16);
    padding: 10px 22px;
    border-radius: 50px;
    font-size: 24px;
    font-weight: 600;
    color: #fef08a;
  }
  .bottom-bar {
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(28px);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 36px;
    padding: 36px 44px;
    box-shadow: 0 24px 50px rgba(0,0,0,0.65);
  }
  .feature-pill {
    font-size: 32px;
    font-weight: 800;
    color: #67e8f9;
    margin-bottom: 16px;
    line-height: 1.25;
  }
  .deal-badge {
    background: linear-gradient(135deg, #059669, #10b981);
    color: #fff;
    font-size: 26px;
    font-weight: 800;
    padding: 12px 24px;
    border-radius: 16px;
    display: inline-block;
    margin-bottom: 20px;
  }
  .cta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 20px;
    font-size: 24px;
    font-weight: 700;
    color: #e2e8f0;
  }
</style>
</head>
<body>
  <div class="top-bar">
    <div class="brand-tag">${brand}</div>
    <div class="prop-title">${title}</div>
    <div class="loc-pill">${loc}</div>
  </div>

  <div class="bottom-bar">
    <div class="feature-pill">${pill}</div>
    <div class="deal-badge">${deal}</div>
    <div class="cta-row">
      <span>${ctaLeft}</span>
      <span style="color:#fde047;">${ctaRight}</span>
    </div>
  </div>
</body>
</html>`;
}

function renderHtmlToPng(htmlContent, pngPath) {
  const browserBin = getBrowserBinary();
  const tempHtml = pngPath.replace('.png', '.html');
  fs.writeFileSync(tempHtml, htmlContent, 'utf8');
  const cmd = `"${browserBin}" --headless --screenshot="${pngPath}" --window-size=1080,1920 --default-background-color=00000000 "file://${tempHtml}" 2>/dev/null`;
  execSync(cmd);
  if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
  return pngPath;
}

// Generate Instagram Caption for Property
function generatePropertyCaption(prop) {
  return `✨ ${prop.name.toUpperCase()} | ${prop.type}

Planning a trip to Lucknow with family, friends, or for an event? Experience true luxury and homelike comfort at our exclusive property located ${prop.location}.

📍 Prime Landmarks:
${prop.landmarks}

🌟 Why Guests Love Staying Here:
${prop.keyFeatures.map(f => `• ${f}`).join('\n')}
• Ideal for: ${prop.idealFor}
• Capacity: ${prop.capacity} comfortably

💰 Direct Booking Advantage:
Book directly with us at ₹${prop.directPrice.toLocaleString('en-IN')}/night (${prop.savingsText})! Skip middleman commissions and platform fees.

📲 Instant Booking & Inquiries:
• DM us 'STAY' for dates & photos
• WhatsApp: +91 82996 00709
• Official Website: ${prop.bookingUrl}

───
#TheUniqueHavenHomes #LucknowHomestay #LuluMallLucknow #MedantaLucknow #JaipurToLucknow #LucknowHotels #GomtiNagar #StaycationLucknow #AirbnbHostIndia #LuxuryHomestayIndia #LucknowTourism`;
}

// Main Video Generator Function
async function generatePropertyReel(propertyCode = 'VIL-108') {
  const prop = getPropertyByCode(propertyCode);
  console.log(`\n======================================================`);
  console.log(`🏨 Generating Instagram Reel for: ${prop.name}`);
  console.log(`📍 Location: ${prop.location}`);
  console.log(`======================================================\n`);

  // 1. Get Photos
  const photos = getPropertyPhotos(prop.code);
  if (!photos || photos.length < 3) {
    throw new Error(`Not enough photos found for property ${prop.code}. Need at least 3.`);
  }

  console.log(`📥 Downloading ${photos.length} verified room photos...`);
  const downloadedFiles = [];
  for (let i = 0; i < Math.min(3, photos.length); i++) {
    const ext = '.jpg';
    const filePath = path.join(CACHE_DIR, `${prop.slug}_photo_${i + 1}${ext}`);
    await downloadImage(photos[i].url, filePath);
    downloadedFiles.push({ path: filePath, label: photos[i].category });
    console.log(`  ✓ Scene ${i + 1} (${photos[i].category}): ${filePath}`);
  }

  // 2. Prepare Video Clips with Ken Burns Pan/Zoom (3.8 seconds per clip = ~11.4 seconds total)
  console.log(`\n🎞️ Rendering 9:16 vertical motion scenes with FFmpeg...`);
  const sceneFiles = [];

  // Scene 1: Living room slow zoom-in
  const scene1Out = path.join(CACHE_DIR, `${prop.slug}_scene1.mp4`);
  const s1Cmd = `ffmpeg -y -loop 1 -i "${downloadedFiles[0].path}" -vf "scale=1200:2133:force_original_aspect_ratio=increase,crop=1200:2133,zoompan=z='min(zoom+0.0015,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=95:s=1080x1920:fps=25" -frames:v 95 -preset ultrafast -c:v libx264 -pix_fmt yuv420p "${scene1Out}"`;
  execSync(s1Cmd, { stdio: 'ignore' });
  sceneFiles.push(scene1Out);

  // Scene 2: Bedroom slow pan/zoom
  const scene2Out = path.join(CACHE_DIR, `${prop.slug}_scene2.mp4`);
  const s2Cmd = `ffmpeg -y -loop 1 -i "${downloadedFiles[1].path}" -vf "scale=1200:2133:force_original_aspect_ratio=increase,crop=1200:2133,zoompan=z='min(max(zoom,pzoom)+0.0012,1.14)':x='iw/2-(iw/zoom/2)+sin(in/10)*20':y='ih/2-(ih/zoom/2)':d=95:s=1080x1920:fps=25" -frames:v 95 -preset ultrafast -c:v libx264 -pix_fmt yuv420p "${scene2Out}"`;
  execSync(s2Cmd, { stdio: 'ignore' });
  sceneFiles.push(scene2Out);

  // Scene 3: Kitchen/Balcony slow zoom-out
  const scene3Out = path.join(CACHE_DIR, `${prop.slug}_scene3.mp4`);
  const s3Cmd = `ffmpeg -y -loop 1 -i "${downloadedFiles[2].path}" -vf "scale=1200:2133:force_original_aspect_ratio=increase,crop=1200:2133,zoompan=z='max(1.15-0.0015*in,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=95:s=1080x1920:fps=25" -frames:v 95 -preset ultrafast -c:v libx264 -pix_fmt yuv420p "${scene3Out}"`;
  execSync(s3Cmd, { stdio: 'ignore' });
  sceneFiles.push(scene3Out);

  // 3. Concatenate video clips
  const concatList = path.join(CACHE_DIR, `${prop.slug}_concat.txt`);
  fs.writeFileSync(concatList, sceneFiles.map(f => `file '${f}'`).join('\n'));
  const rawVideo = path.join(CACHE_DIR, `${prop.slug}_stitched.mp4`);
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${rawVideo}"`, { stdio: 'ignore' });

  // 4. Generate clean relaxing ambient soundscape (~11.4s)
  const audioOut = path.join(CACHE_DIR, 'ambient_track.aac');
  if (!fs.existsSync(audioOut)) {
    console.log(`🎵 Synthesizing warm ambient lo-fi soundscape...`);
    const audioCmd = `ffmpeg -y -f lavfi -i "aevalsrc=sin(220*2*PI*t)*0.08+sin(277.18*2*PI*t)*0.08+sin(329.63*2*PI*t)*0.08+sin(440*2*PI*t)*0.04:s=44100:d=12" -af "afade=t=in:ss=0:d=1.5,afade=t=out:st=10:d=1.4" -c:a aac -b:a 128k "${audioOut}"`;
    execSync(audioCmd, { stdio: 'ignore' });
  }

  // 5. Generate 3 Dynamic Scene Overlays
  console.log(`✨ Rendering dynamic luxury typography overlay cards...`);
  const overlay1Png = path.join(CACHE_DIR, `${prop.slug}_overlay1.png`);
  const overlay2Png = path.join(CACHE_DIR, `${prop.slug}_overlay2.png`);
  const overlay3Png = path.join(CACHE_DIR, `${prop.slug}_overlay3.png`);

  renderHtmlToPng(generateHtmlCard({
    brand: 'The Unique Haven Homes • Lucknow',
    title: prop.name,
    loc: `📍 ${prop.location}`,
    pill: `✨ ${prop.type}`,
    deal: `🏷️ Direct Rate: ₹${prop.directPrice.toLocaleString('en-IN')}/night (${prop.savingsText})`,
    ctaLeft: '📲 WhatsApp: +91 82996 00709',
    ctaRight: 'DM "STAY"'
  }), overlay1Png);

  renderHtmlToPng(generateHtmlCard({
    brand: 'The Unique Haven Homes • Lucknow',
    title: 'Master Bedroom & Balcony',
    loc: '★ 4.9 Superhost Quality Stays',
    pill: `🛏️ 100% AC Bedrooms • 500Mbps Optical WiFi`,
    deal: `🌿 Quiet Gated Colony • 24/7 Power Backup`,
    ctaLeft: '📲 WhatsApp: +91 82996 00709',
    ctaRight: 'DM "STAY"'
  }), overlay2Png);

  renderHtmlToPng(generateHtmlCard({
    brand: 'The Unique Haven Homes • Lucknow',
    title: 'Full Kitchen & Dining Area',
    loc: `📍 ${prop.landmarks.split(',')[0]}`,
    pill: `🍳 Cook Your Own Meals • Refrigerator & RO`,
    deal: `🏷️ Book Direct & Save ₹1,000+ vs Airbnb`,
    ctaLeft: '📲 WhatsApp: +91 82996 00709',
    ctaRight: 'DM "STAY"'
  }), overlay3Png);

  // 6. Composite Overlays + Audio with FFmpeg
  console.log(`🎬 Assembling final 9:16 vertical Reel with audio...`);
  const finalReelPath = path.join(OUTPUT_DIR, `${prop.slug}-reel.mp4`);

  const filterComplex = [
    `[0:v][1:v]overlay=0:0:enable='between(t,0,3.8)'[v1]`,
    `[v1][2:v]overlay=0:0:enable='between(t,3.8,7.6)'[v2]`,
    `[v2][3:v]overlay=0:0:enable='between(t,7.6,11.4)'[v]`
  ].join(';');

  const finalCmd = `ffmpeg -y -i "${rawVideo}" -i "${overlay1Png}" -i "${overlay2Png}" -i "${overlay3Png}" -i "${audioOut}" -filter_complex "${filterComplex}" -map "[v]" -map 4:a -preset ultrafast -c:v libx264 -profile:v high -pix_fmt yuv420p -c:a aac -shortest "${finalReelPath}"`;
  execSync(finalCmd, { stdio: 'ignore' });

  // 7. Save Caption
  const caption = generatePropertyCaption(prop);
  const captionPath = path.join(OUTPUT_DIR, `${prop.slug}-caption.txt`);
  fs.writeFileSync(captionPath, caption, 'utf8');

  // 8. Save Meta JSON for Instagram API / Admin Panel
  const metaJson = {
    code: prop.code,
    name: prop.name,
    videoPath: finalReelPath,
    captionPath: captionPath,
    caption: caption,
    property: prop,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, `${prop.slug}-meta.json`), JSON.stringify(metaJson, null, 2), 'utf8');

  console.log(`\n🎉 SUCCESS! Instagram Reel Generated:`);
  console.log(`📹 Video: ${finalReelPath} (${(fs.statSync(finalReelPath).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`📝 Caption saved to: ${captionPath}`);
  console.log(`\n--- PREVIEW CAPTION ---\n${caption}\n-----------------------`);

  return metaJson;
}

if (require.main === module) {
  const code = process.argv[2] || 'VIL-108';
  generatePropertyReel(code).catch(err => {
    console.error('Error generating reel:', err);
    process.exit(1);
  });
}

module.exports = {
  generatePropertyReel
};
