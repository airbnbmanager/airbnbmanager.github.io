const fs = require('fs');
const data = require('../scratch/airbnb_photos_all.json');

const slugMap = {
  'the-dark-blue.html': { code: 'GOM-201', name: 'The Dark Blue', dir: 'the-dark-blue' },
  'the-unique.html': { code: 'GOM-302', name: 'The Unique', dir: 'the-unique' },
  'black-beauty.html': { code: 'GOM-102', name: 'Black Beauty', dir: 'black-beauty' },
  'redrose-palace.html': { code: 'GOM-101', name: 'RedRose Palace', dir: 'redrose-palace' },
  'the-brown.html': { code: 'GOM-202', name: 'The Brown', dir: 'the-brown' },
  'the-light-green.html': { code: 'GOM-301', name: 'The Light Green', dir: 'the-light-green' },
  'the-nawabi-stay.html': { code: 'GOM-401', name: 'The Nawabi Stay', dir: 'the-nawabi-stay' },
  'starlight-blue-penthouse.html': { code: 'GOM-501', name: 'Starlight Blue PentHouse', dir: 'starlight-blue' },
  'the-yellow-house.html': { code: 'VIL-105', name: 'The Yellow House', dir: 'the-yellow-house' },
  'the-green-house.html': { code: 'VIL-104', name: 'The Green House', dir: 'the-green-house' },
  'the-pink-house.html': { code: 'VIL-103', name: 'The Pink House', dir: 'the-pink-house' },
  'gomti-grand-villa.html': { code: 'VIL-101', name: 'Gomti Grand Villa', dir: 'gomti-grand-villa' },
  'royal-white-house.html': { code: 'VIL-102', name: 'Royal White House', dir: 'royal-white-house' },
  'celebrity-garden.html': { code: 'LUL-402', name: 'Celebrity Garden', dir: 'celebrity-garden' },
  'the-velvet-house.html': { code: 'VIL-107', name: 'The Velvet House', dir: 'the-velvet-house' },
  'green-forest.html': { code: 'VIL-106', name: 'Green forest View', dir: 'green-forest' },
  'pink-paradise.html': { code: 'VIL-108', name: 'Pink Paradise Villa', dir: 'pink-paradise' }
};

for (const [filename, info] of Object.entries(slugMap)) {
  let content = fs.readFileSync(filename, 'utf8');
  const prop = data[info.code];
  if (!prop || !prop.photos || prop.photos.length === 0) {
    console.warn('No photos for', filename);
    continue;
  }

  const pList = prop.photos.map(p => p.includes('?') ? p : p + '?im_w=1200');
  const p1 = pList[1] || pList[0];
  const p2 = pList[2] || pList[0];
  const p3 = pList[3] || pList[0];
  const p4 = pList[4] || pList[0];

  // Update JSON-LD 'image' array
  const imgRegex = /"image":\s*\[[\s\S]*?\](?=,)/;
  const newImgJson = `"image": [\n    "https://uniquehavenhomesstay.com/assets/properties/${info.dir}/cover.jpg",\n    "${p1}",\n    "${p2}",\n    "${p3}",\n    "${p4}"\n  ]`;
  content = content.replace(imgRegex, newImgJson);

  // Update luxe-photo-mosaic
  const mosaicRegex = /<section id="luxe-photo-mosaic"[\s\S]*?<\/section>/;
  const newMosaic = `<section id="luxe-photo-mosaic" class="luxe-photo-mosaic" aria-label="Property Gallery">
    <div class="luxe-photo-item luxe-photo-main" onclick="window.luxeEngine && window.luxeEngine.openGallery(0)">
      <img alt="${info.name} Lead Photo" src="assets/properties/${info.dir}/cover.jpg" loading="eager"/>
    </div>
    <div class="luxe-photo-item" onclick="window.luxeEngine && window.luxeEngine.openGallery(1)">
      <img alt="${info.name} Living Area" src="${p1}" loading="lazy"/>
    </div>
    <div class="luxe-photo-item" onclick="window.luxeEngine && window.luxeEngine.openGallery(2)">
      <img alt="${info.name} Bedroom" src="${p2}" loading="lazy"/>
    </div>
    <div class="luxe-photo-item" onclick="window.luxeEngine && window.luxeEngine.openGallery(3)">
      <img alt="${info.name} Interior" src="${p3}" loading="lazy"/>
    </div>
    <div class="luxe-photo-item" onclick="window.luxeEngine && window.luxeEngine.openGallery(4)">
      <img alt="${info.name} View" src="${p4}" loading="lazy"/>
    </div>
    <button type="button" class="luxe-btn-show-all" onclick="window.luxeEngine && window.luxeEngine.openGallery(0)">
      📷 Show all ${prop.photos.length} photos
    </button>
  </section>`;

  content = content.replace(mosaicRegex, newMosaic);
  fs.writeFileSync(filename, content, 'utf8');
  console.log('Updated', filename, `with ${prop.photos.length} photos`);
}
