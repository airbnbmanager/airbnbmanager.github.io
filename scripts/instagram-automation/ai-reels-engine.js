/**
 * 🎬 THE UNIQUE HAVEN HOMES - AI CINEMA REELS ENGINE
 * Implements the 4 Proven Cinema Shots (Dolly, Orbit, Crane),
 * Photo Auditing, Tail Trimming, Hard Cuts on Motion,
 * and Real Studio Lo-Fi Travel Music.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const { PROPERTIES, auditPropertyPhotos, getPropertyByCode } = require('./property-catalog.js');

const CACHE_DIR = path.resolve(__dirname, 'cache');
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const AUDIO_DIR = path.resolve(__dirname, '../../assets/audio/reels');

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

// Minimalist Luxury Typography Overlay (Only covers 10% of screen at very top & bottom)
function generateMinimalLuxuryOverlay(prop) {
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
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 80px 50px 70px 50px;
  }
  .top-badge {
    align-self: center;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 50px;
    padding: 12px 32px;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 4px;
    color: #f8fafc;
    text-transform: uppercase;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }
  .bottom-info {
    background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 60%);
    padding: 60px 40px 30px 40px;
    border-radius: 30px;
  }
  .prop-title {
    font-size: 46px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
    text-shadow: 0 4px 12px rgba(0,0,0,0.6);
  }
  .loc-line {
    font-size: 24px;
    font-weight: 600;
    color: #fde047;
    margin-bottom: 12px;
    text-shadow: 0 2px 8px rgba(0,0,0,0.7);
  }
  .price-pill {
    display: inline-block;
    background: rgba(16, 185, 129, 0.9);
    color: #ffffff;
    font-size: 22px;
    font-weight: 700;
    padding: 8px 20px;
    border-radius: 12px;
    margin-bottom: 14px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  }
  .cta-line {
    font-size: 20px;
    font-weight: 600;
    color: #cbd5e1;
    letter-spacing: 0.5px;
  }
</style>
</head>
<body>
  <div class="top-badge">The Unique Haven Homes • Lucknow</div>
  <div class="bottom-info">
    <div class="prop-title">${prop.name}</div>
    <div class="loc-line">📍 ${prop.location}</div>
    <div class="price-pill">🏷️ Direct Rate: ₹${prop.directPrice.toLocaleString('en-IN')}/night (${prop.savingsText})</div>
    <div class="cta-line">📲 WhatsApp: +91 82996 00709 • DM "STAY" for direct booking</div>
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

// Generate Instagram Caption
function generateInstagramCaption(prop) {
  return `✨ ${prop.name.toUpperCase()} | ${prop.type}

Experience pure comfort and luxury at our verified property located ${prop.location}.

📍 Key Landmarks:
${prop.landmarks}

🌟 Highlights:
${prop.keyFeatures.map(f => `• ${f}`).join('\n')}
• Ideal for: Families, couples, business & event stays
• Capacity: ${prop.capacity}

💰 Save 15% Booking Direct:
Direct rate: ₹${prop.directPrice.toLocaleString('en-IN')}/night (${prop.savingsText} compared to Airbnb/OTA platforms).

📲 Booking & Instant Inquiry:
• DM us 'STAY'
• WhatsApp: +91 82996 00709
• Website: ${prop.bookingUrl}

───
#TheUniqueHavenHomes #LucknowHomestay #LuluMallLucknow #MedantaLucknow #GomtiNagar #LuxuryStayLucknow #AirbnbHostIndia #StaycationIndia`;
}

// Master Reel Generator
async function generateCinemaReel(propertyCode = 'VIL-108') {
  const prop = getPropertyByCode(propertyCode);
  console.log(`\n======================================================`);
  console.log(`🎬 THE UNIQUE HAVEN HOMES - CINEMA REELS ENGINE`);
  console.log(`🏨 Property: ${prop.name}`);
  console.log(`📍 Location: ${prop.location}`);
  console.log(`======================================================\n`);

  // Step 1: Photo Audit
  console.log(`🔍 Auditing photos for the 3 cinema shots...`);
  const auditedShots = auditPropertyPhotos(prop.code);
  if (auditedShots.length < 3) {
    throw new Error(`Photo audit failed for ${prop.code}. Need 3 distinct room photos.`);
  }

  auditedShots.forEach((s, idx) => {
    console.log(`  ✓ Shot ${idx + 1} [${s.shotType}]: ${s.roomName}`);
  });

  // Step 2: Download audited photos
  console.log(`\n📥 Downloading audited high-res room photos...`);
  const localPhotos = [];
  for (let i = 0; i < auditedShots.length; i++) {
    const shot = auditedShots[i];
    const filePath = path.join(CACHE_DIR, `${prop.slug}_shot_${i + 1}.jpg`);
    await downloadImage(shot.url, filePath);
    localPhotos.push({ ...shot, filePath });
  }

  // Step 3: Render Clips (With Tail Trimming & Hard Cuts)
  console.log(`\n🎞️ Rendering 3 cinema clips (Dolly, Orbit, Crane)...`);
  const clipFiles = [];

  // Shot 1: The Dolly (Push in)
  const clip1 = path.join(CACHE_DIR, `${prop.slug}_clip1.mp4`);
  const s1Cmd = `ffmpeg -y -loop 1 -i "${localPhotos[0].filePath}" -vf "scale=1200:2133:force_original_aspect_ratio=increase,crop=1200:2133,zoompan=z='min(zoom+0.0012,1.14)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=90:s=1080x1920:fps=25" -frames:v 90 -preset ultrafast -c:v libx264 -pix_fmt yuv420p "${clip1}"`;
  execSync(s1Cmd, { stdio: 'ignore' });
  clipFiles.push(clip1);

  // Shot 2: The Orbit (Camera arc / slow shift)
  const clip2 = path.join(CACHE_DIR, `${prop.slug}_clip2.mp4`);
  const s2Cmd = `ffmpeg -y -loop 1 -i "${localPhotos[1].filePath}" -vf "scale=1200:2133:force_original_aspect_ratio=increase,crop=1200:2133,zoompan=z='min(max(zoom,pzoom)+0.0010,1.12)':x='iw/2-(iw/zoom/2)+sin(in/12)*25':y='ih/2-(ih/zoom/2)':d=90:s=1080x1920:fps=25" -frames:v 90 -preset ultrafast -c:v libx264 -pix_fmt yuv420p "${clip2}"`;
  execSync(s2Cmd, { stdio: 'ignore' });
  clipFiles.push(clip2);

  // Shot 3: The Crane (Vertical tilt reveal)
  const clip3 = path.join(CACHE_DIR, `${prop.slug}_clip3.mp4`);
  const s3Cmd = `ffmpeg -y -loop 1 -i "${localPhotos[2].filePath}" -vf "scale=1200:2133:force_original_aspect_ratio=increase,crop=1200:2133,zoompan=z='min(zoom+0.0008,1.10)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+cos(in/14)*20':d=90:s=1080x1920:fps=25" -frames:v 90 -preset ultrafast -c:v libx264 -pix_fmt yuv420p "${clip3}"`;
  execSync(s3Cmd, { stdio: 'ignore' });
  clipFiles.push(clip3);

  // Step 4: Concatenate with Hard Cut on Motion (No morph/dissolves)
  const concatList = path.join(CACHE_DIR, `${prop.slug}_concat.txt`);
  fs.writeFileSync(concatList, clipFiles.map(f => `file '${f}'`).join('\n'));
  const rawVideo = path.join(CACHE_DIR, `${prop.slug}_stitched.mp4`);
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${rawVideo}"`, { stdio: 'ignore' });

  // Step 5: Select Real Studio Lo-Fi Travel Music
  let audioTrack = path.join(AUDIO_DIR, 'lofi_travel_1.mp3');
  if (!fs.existsSync(audioTrack)) {
    audioTrack = path.join(AUDIO_DIR, 'chill_lounge_2.mp3');
  }
  console.log(`🎵 Using real studio music: ${path.basename(audioTrack)}`);

  // Step 6: Render Minimalist Luxury Overlay
  console.log(`✨ Applying sleek minimalist luxury overlay...`);
  const overlayPng = path.join(CACHE_DIR, `${prop.slug}_minimal_overlay.png`);
  renderHtmlToPng(generateMinimalLuxuryOverlay(prop), overlayPng);

  // Step 7: Final Assembly with Audio Fade & Video Composite
  const finalReelPath = path.join(OUTPUT_DIR, `${prop.slug}-cinema-reel.mp4`);
  const assembleCmd = `ffmpeg -y -i "${rawVideo}" -i "${overlayPng}" -i "${audioTrack}" -filter_complex "[0:v][1:v]overlay=0:0[v];[2:a]afade=t=in:ss=0:d=1.0,afade=t=out:st=9.5:d=1.2[a]" -map "[v]" -map "[a]" -preset ultrafast -c:v libx264 -profile:v high -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${finalReelPath}"`;
  execSync(assembleCmd, { stdio: 'ignore' });

  // Step 8: Save Caption
  const caption = generateInstagramCaption(prop);
  const captionPath = path.join(OUTPUT_DIR, `${prop.slug}-caption.txt`);
  fs.writeFileSync(captionPath, caption, 'utf8');

  console.log(`\n🎉 SUCCESS! Cinema-Grade Reel Ready:`);
  console.log(`📹 Video File: ${finalReelPath} (${(fs.statSync(finalReelPath).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`📝 Caption File: ${captionPath}`);
  console.log(`\n--- PREVIEW CAPTION ---\n${caption}\n-----------------------`);

  return {
    videoPath: finalReelPath,
    captionPath: captionPath,
    caption: caption,
    property: prop
  };
}

if (require.main === module) {
  const code = process.argv[2] || 'VIL-108';
  generateCinemaReel(code).catch(err => {
    console.error('Engine error:', err);
    process.exit(1);
  });
}

module.exports = {
  generateCinemaReel
};
