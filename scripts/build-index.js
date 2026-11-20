// Runs on Netlify after every save: collects every rescue file into one list.
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'content', 'rescues');
const list = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  .map(f => { const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); r.slug = f.replace(/\.json$/, ''); return r; })
  .sort((a, b) => (a.number || a.order || 999) - (b.number || b.order || 999));
fs.writeFileSync(path.join(__dirname, '..', 'content', 'rescues-index.json'), JSON.stringify({ rescues: list }, null, 2));
console.log('rescues:', list.length);
