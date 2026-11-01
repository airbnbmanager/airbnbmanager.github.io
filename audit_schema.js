const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  const html = fs.readFileSync(file, 'utf8');
  const matches = Array.from(html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi));
  if (matches.length > 0) {
    console.log(`=== ${file} (${matches.length} schema blocks) ===`);
    matches.forEach((m, idx) => {
      try {
        const json = JSON.parse(m[1]);
        let types = [];
        if (Array.isArray(json)) {
          types = json.map(j => j['@type']);
        } else if (json['@graph']) {
          types = json['@graph'].map(g => g['@type']);
        } else {
          types = [json['@type']];
        }
        console.log(`  Block #${idx + 1} @type: ${types.join(', ')}`);
      } catch (e) {
        console.log(`  Block #${idx + 1} PARSE ERROR: ${e.message}`);
      }
    });
  }
});
