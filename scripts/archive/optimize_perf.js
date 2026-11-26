const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Optimize <head>
const oldHead = `<!-- Google Fonts: Fraunces, Outfit & Plus Jakarta Sans for 5-Star Luxury Feel -->
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..800;1,9..144,400..800&amp;family=Outfit:wght@400;500;600;700;800&amp;family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<!-- Core Luxe & Directory Stylesheets -->
<link href="css/property-luxe.css" rel="stylesheet"/>
<link href="css/mobile-fixes.css?v=206" rel="stylesheet"/>
<link href="css/vesper-hero.css?v=5" rel="stylesheet"/>
<!-- Supabase Client for Real-Time CRM Geolocation Sync -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="config.js"></script>`;

const newHead = `<!-- Preload LCP Hero Flagship Villa Image for Instant Mobile LCP -->
<link rel="preload" as="image" href="https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/b018acc7-5ccb-440e-8bc0-afbfbb9fb2a0.jpeg?im_w=1200" fetchpriority="high">

<!-- Google Fonts: Non-blocking display swap -->
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'"/>
<noscript>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Outfit:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"/>
</noscript>

<!-- Core Luxe & Directory Stylesheets -->
<link href="css/property-luxe.css?v=207" rel="stylesheet"/>
<link href="css/mobile-fixes.css?v=207" rel="stylesheet"/>
<link href="css/vesper-hero.css?v=6" rel="stylesheet"/>

<!-- Supabase Client & Config (Deferred to prevent render blocking) -->
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script defer src="config.js"></script>`;

if (html.includes(oldHead)) {
  html = html.replace(oldHead, newHead);
  console.log("Successfully replaced head tags!");
} else {
  console.error("Could not find exact oldHead block!");
}

// 2. Pre-render initial slide inside vesperBgViewport
const oldViewport = `<div class="vesper-bg-viewport" id="vesperBgViewport">
    <!-- Populated by js/vesper-hero.js with 5 real high-res rooms -->
  </div>`;
const newViewport = `<div class="vesper-bg-viewport" id="vesperBgViewport">
    <div class="vesper-bg-slide active" id="vesperSlide_0" style="background-image: url('https://a0.muscache.com/im/pictures/hosting/Hosting-1718315215180636685/original/b018acc7-5ccb-440e-8bc0-afbfbb9fb2a0.jpeg?im_w=1200'); opacity: 1;"></div>
  </div>`;

if (html.includes(oldViewport)) {
  html = html.replace(oldViewport, newViewport);
  console.log("Successfully added initial static hero slide!");
} else {
  console.log("Could not find exact oldViewport");
}

// 3. Optimize property card images with width, height, and decoding=async
html = html.replace(/<img src="assets\/properties\/([^"]+)" alt="([^"]+)" loading="lazy">/g, 
  '<img src="assets/properties/$1" alt="$2" loading="lazy" decoding="async" width="600" height="400">');

// 4. Optimize founders images
html = html.replace(/class="vesper-host-avatar" onerror="this\.src='assets\/logo-emblem\.png'">/g,
  'class="vesper-host-avatar" width="72" height="72" loading="lazy" decoding="async" onerror="this.src=\'assets/logo-emblem.png\'">');

// 5. Fix logo dimensions
html = html.replace(/<img alt="TUHH Crest" src="assets\/logo-emblem\.png"\/>/g,
  '<img alt="TUHH Crest" src="assets/logo-emblem.png" width="40" height="40" decoding="async"/>');
html = html.replace(/<img alt="The Unique Haven Homes Emblem" src="assets\/logo-emblem\.png"\/>/g,
  '<img alt="The Unique Haven Homes Emblem" src="assets/logo-emblem.png" width="40" height="40" decoding="async"/>');

// 6. Fix footer text color contrast
html = html.replace(/color: #64748b;/g, "color: #94a3b8;");

// 7. Defer bottom scripts
html = html.replace('<script src="js/seasonal-pricing.js"></script>', '<script defer src="js/seasonal-pricing.js"></script>');
html = html.replace('<script src="js/price-sync.js?v=2"></script>', '<script defer src="js/price-sync.js?v=2"></script>');
html = html.replace('<script src="js/vesper-hero.js?v=5"></script>', '<script defer src="js/vesper-hero.js?v=6"></script>');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully written optimized index.html!');
