const fs = require('fs');

const listings = [
  { code: 'VIL-103', id: '1592729438969718723', name: 'The Pink House', slug: 'the-pink-house' },
  { code: 'VIL-102', id: '1718315215180636685', name: 'Royal White House', slug: 'royal-white-house' },
  { code: 'VIL-104', id: '1593461780265937816', name: 'The Green House', slug: 'the-green-house' },
  { code: 'GOM-102', id: '1676840617430941240', name: 'Black Beauty', slug: 'black-beauty' },
  { code: 'GOM-201', id: '1655969170448425308', name: 'The Dark Blue', slug: 'the-dark-blue' },
  { code: 'VIL-101', id: '1721732716374002170', name: 'Gomti Grand Villa', slug: 'gomti-grand-villa' },
  { code: 'GOM-101', id: '1654261872286835347', name: 'RedRose Palace', slug: 'redrose-palace' },
  { code: 'VIL-105', id: '1592729918855637425', name: 'The Yellow House', slug: 'the-yellow-house' },
  { code: 'LUL-402', id: '1606514664948608755', name: 'Celebrity Garden', slug: 'celebrity-garden' },
  { code: 'VIL-108', id: '1756799939825259443', name: 'Pink Paradise Villa', slug: 'pink-paradise' },
  { code: 'VIL-106', id: '1739254108962193705', name: 'Green forest View', slug: 'green-forest' },
  { code: 'GOM-202', id: '1660898784168880636', name: 'The Brown', slug: 'the-brown' },
  { code: 'GOM-302', id: '1679190202218939181', name: 'The Unique', slug: 'the-unique' },
  { code: 'GOM-301', id: '1679155811558485410', name: 'The Light Green', slug: 'the-light-green' },
  { code: 'VIL-107', id: '1727830063287100082', name: 'The Velvet House', slug: 'the-velvet-house' },
  { code: 'GOM-401', id: '1723434530455939144', name: 'The Nawabi Stay', slug: 'the-nawabi-stay' },
  { code: 'GOM-501', id: '1718385679817913835', name: 'Starlight Blue PentHouse', slug: 'starlight-blue-penthouse' }
];

async function fetchListing(item) {
  const url = 'https://www.airbnb.co.in/rooms/' + item.id;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();

    const matches = [...html.matchAll(/"accessibilityLabel":"([^"]+image[^"]*)"[\s\S]{1,300}?"baseUrl":"([^"]+)"/gi)];
    
    // Fallback if forward match didn't find all
    let photoMap = [];
    matches.forEach(m => {
      photoMap.push({ label: m[1].trim(), url: m[2].trim() });
    });

    // If matches count is small, also look for reverse format
    if (photoMap.length < 5) {
      const altMatches = [...html.matchAll(/"baseUrl":"([^"]+)"[\s\S]{1,300}?"accessibilityLabel":"([^"]+image[^"]*)"/gi)];
      altMatches.forEach(m => {
        if (!photoMap.some(x => x.url === m[1].trim())) {
          photoMap.push({ label: m[2].trim(), url: m[1].trim() });
        }
      });
    }

    // Categorize
    const categorized = {
      bedrooms: [],
      bathrooms: [],
      kitchen: [],
      living_hall: [],
      balcony: [],
      all: []
    };

    const normalize = u => u.split('?')[0];

    photoMap.forEach(item => {
      const u = item.url;
      const lbl = item.label.toLowerCase();
      
      if (!categorized.all.some(x => normalize(x) === normalize(u))) {
        categorized.all.push(u);
      }

      if (lbl.includes('bedroom')) {
        if (!categorized.bedrooms.some(x => normalize(x) === normalize(u))) categorized.bedrooms.push(u);
      } else if (lbl.includes('bathroom')) {
        if (!categorized.bathrooms.some(x => normalize(x) === normalize(u))) categorized.bathrooms.push(u);
      } else if (lbl.includes('kitchen')) {
        if (!categorized.kitchen.some(x => normalize(x) === normalize(u))) categorized.kitchen.push(u);
      } else if (lbl.includes('living') || lbl.includes('dining')) {
        if (!categorized.living_hall.some(x => normalize(x) === normalize(u))) categorized.living_hall.push(u);
      } else if (lbl.includes('balcony') || lbl.includes('patio') || lbl.includes('terrace') || lbl.includes('exterior') || lbl.includes('view') || lbl.includes('garden') || lbl.includes('outdoor')) {
        if (!categorized.balcony.some(x => normalize(x) === normalize(u))) categorized.balcony.push(u);
      } else {
        // Additional / other photos
        if (!categorized.living_hall.some(x => normalize(x) === normalize(u))) categorized.living_hall.push(u);
      }
    });

    const coverMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const cover = coverMatch ? coverMatch[1].replace(/&amp;/g, '&') : (categorized.all[0] || '');

    return {
      code: item.code,
      name: item.name,
      slug: item.slug,
      cover,
      photos: categorized,
      total: categorized.all.length
    };
  } catch (e) {
    console.error('Error fetching', item.code, e.message);
    return null;
  }
}

async function run() {
  console.log('Fetching categorized photos for all 17 Airbnb listings...');
  const results = {};
  for (const item of listings) {
    const res = await fetchListing(item);
    if (res && res.total > 0) {
      console.log(`✅ ${res.code.padEnd(8)} ${res.name.padEnd(25)} Total: ${String(res.total).padEnd(3)} | Bed: ${String(res.photos.bedrooms.length).padEnd(2)} | Bath: ${String(res.photos.bathrooms.length).padEnd(2)} | Kit: ${String(res.photos.kitchen.length).padEnd(2)} | Living: ${String(res.photos.living_hall.length).padEnd(2)} | Balcony: ${String(res.photos.balcony.length).padEnd(2)}`);
      results[res.code] = res;
    } else {
      console.warn(`⚠️ ${item.code} ${item.name} could not fetch categorized photos`);
    }
  }

  fs.writeFileSync('scratch/airbnb_photos_strictly_categorized.json', JSON.stringify(results, null, 2));
  console.log('Saved to scratch/airbnb_photos_strictly_categorized.json');
}

run();
