// Downloads the cat breed list once per deploy into content/breeds.json.
// Never fails the build: if TheCatAPI is unreachable, the old file is kept.
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, '..', 'content', 'breeds.json');
const headers = { Accept: 'application/json' };
if (process.env.CAT_API_KEY) headers['x-api-key'] = process.env.CAT_API_KEY;
(async () => {
  try {
    if (typeof fetch !== 'function') throw new Error('fetch not available in this Node version');
    const r = await fetch('https://api.thecatapi.com/v1/breeds', { headers });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const breeds = (d || []).map((x) => ({
      name: x.name,
      origin: x.origin || '',
      img: (x.image && x.image.url) || (x.reference_image_id ? 'https://cdn2.thecatapi.com/images/' + x.reference_image_id + '.jpg' : ''),
      wiki: x.wikipedia_url || ''
    })).filter((b) => b.name).sort((a, b) => a.name.localeCompare(b.name));
    if (!breeds.length) throw new Error('empty list');
    fs.writeFileSync(out, JSON.stringify({ updated: new Date().toISOString(), source: 'TheCatAPI', breeds }, null, 1));
    console.log('fetch-breeds: saved ' + breeds.length + ' breeds');
  } catch (e) {
    console.log('fetch-breeds: kept existing file (' + e.message + ')');
  }
})();
