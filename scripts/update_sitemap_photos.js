const fs = require('fs');
const data = require('../scratch/airbnb_photos_all.json');

const slugMap = {
  'the-dark-blue': 'GOM-201',
  'the-unique': 'GOM-302',
  'black-beauty': 'GOM-102',
  'redrose-palace': 'GOM-101',
  'the-brown': 'GOM-202',
  'the-light-green': 'GOM-301',
  'the-nawabi-stay': 'GOM-401',
  'starlight-blue-penthouse': 'GOM-501',
  'the-yellow-house': 'VIL-105',
  'the-green-house': 'VIL-104',
  'the-pink-house': 'VIL-103',
  'gomti-grand-villa': 'VIL-101',
  'royal-white-house': 'VIL-102',
  'celebrity-garden': 'LUL-402',
  'the-velvet-house': 'VIL-107',
  'green-forest': 'VIL-106',
  'pink-paradise': 'VIL-108'
};

let sitemap = fs.readFileSync('sitemap.xml', 'utf8');

// For each url block in sitemap
sitemap = sitemap.replace(/<url>([\s\S]*?)<\/url>/g, (match, body) => {
  const locMatch = body.match(/<loc>https:\/\/uniquehavenhomesstay\.com\/([a-z0-9\-]+)\.html<\/loc>/);
  if (!locMatch) return match;
  const slug = locMatch[1];
  const code = slugMap[slug];
  if (!code || !data[code] || !data[code].photos) return match;

  const prop = data[code];
  const photos = prop.photos.map(p => p.includes('?') ? p : p + '?im_w=1200');

  // Extract base url metadata
  const lastmod = (body.match(/<lastmod>(.*?)<\/lastmod>/) || [])[1] || '2026-09-29';
  const changefreq = (body.match(/<changefreq>(.*?)<\/changefreq>/) || [])[1] || 'weekly';
  const priority = (body.match(/<priority>(.*?)<\/priority>/) || [])[1] || '0.9';

  const titleMatch = body.match(/<image:title>(.*?)<\/image:title>/);
  const captionMatch = body.match(/<image:caption>(.*?)<\/image:caption>/);
  const title = titleMatch ? titleMatch[1] : `${slug} - Luxury Homestay`;
  const caption = captionMatch ? captionMatch[1] : `${slug} in Gomti Nagar Lucknow`;

  const dir = slug === 'starlight-blue-penthouse' ? 'starlight-blue' : slug;

  let imgBlocks = `    <image:image>\n      <image:loc>https://uniquehavenhomesstay.com/assets/properties/${dir}/cover.jpg</image:loc>\n      <image:title>${title}</image:title>\n      <image:caption>${caption}</image:caption>\n    </image:image>`;

  for (let i = 1; i < Math.min(photos.length, 6); i++) {
    imgBlocks += `\n    <image:image>\n      <image:loc>${photos[i].replace(/&/g, '&amp;')}</image:loc>\n      <image:title>${title} - Photo ${i + 1}</image:title>\n      <image:caption>${caption}</image:caption>\n    </image:image>`;
  }

  return `<url>\n    <loc>https://uniquehavenhomesstay.com/${slug}.html</loc>\n    <lastmod>2026-09-29</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n${imgBlocks}\n  </url>`;
});

fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
console.log('sitemap.xml updated with genuine Airbnb photo URLs!');
