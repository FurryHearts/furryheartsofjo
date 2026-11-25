/* Furry Hearts of Jordan — tiny page renderer.
   Each page keeps its design as a template (#dc-root) plus a Component class
   (the <script type="text/x-dc"> block). Edit the data in that class to update
   the page: rescues, rides, CliQ accounts, photos. No build tools needed. */
(function () {
  'use strict';

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) { Object.assign(this.state, patch); render(); }
  }

  var EXPR = /\{\{\s*([^}]+?)\s*\}\}/g;
  var instance, vals, tpl, app;

  function lookup(expr, scope) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    var parts = expr.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function single(str) {
    var m = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(str);
    return m ? m[1] : null;
  }

  function interp(str, scope) {
    return str.replace(EXPR, function (_, e) {
      var v = lookup(e, scope);
      return v == null ? '' : String(v);
    });
  }

  // Keep paragraphs balanced: never leave a short word that starts a sentence
  // alone at the end of a line, and never leave one word alone on the last line.
  function tidy(t) {
    if (!t || t.length < 50 || /^\s*$/.test(t)) return t;
    t = t.replace(/([.!?:;,]) (\S{1,4}) /g, '$1 $2\u00a0');
    t = t.replace(/ (a|an|the|to|of|in|on|at|is|it|or|and|for|by|we|you|our|your|so|if|as|be|do|no) /gi, function (m, w) { return ' ' + w + '\u00a0'; });
    t = t.replace(/ (\S+)\s*$/, '\u00a0$1');
    return t;
  }

  function renderInto(src, scope, out) {
    var kids = src.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.nodeType === 3) {
        out.appendChild(document.createTextNode(tidy(interp(n.nodeValue, scope))));
        continue;
      }
      if (n.nodeType !== 1) continue;
      if (n.tagName === 'TEMPLATE' && n.hasAttribute('data-sc-for')) {
        var list = lookup(single(n.getAttribute('data-sc-for')) || '', scope) || [];
        var as = n.getAttribute('data-as') || 'item';
        for (var j = 0; j < list.length; j++) {
          var s = Object.create(scope);
          s[as] = list[j];
          s.$index = j;
          renderInto(n.content, s, out);
        }
        continue;
      }
      if (n.tagName === 'TEMPLATE' && n.hasAttribute('data-sc-if')) {
        if (lookup(single(n.getAttribute('data-sc-if')) || '', scope)) renderInto(n.content, scope, out);
        continue;
      }
      var el = document.createElementNS(n.namespaceURI, n.localName);
      for (var a = 0; a < n.attributes.length; a++) {
        var at = n.attributes[a];
        if (at.name.indexOf('hint-') === 0) continue;
        if (at.name.indexOf('on') === 0 && single(at.value)) {
          var fn = lookup(single(at.value), scope);
          if (typeof fn === 'function') el.addEventListener(at.name.slice(2), fn);
          continue;
        }
        el.setAttribute(at.name, interp(at.value, scope));
      }
      renderInto(n, scope, el);
      out.appendChild(el);
    }
  }

  function render() {
    vals = instance.renderVals();
    var ae = document.activeElement, fid = ae && ae.id && app.contains(ae) ? ae.id : null, ss = null, se = null;
    try { if (fid) { ss = ae.selectionStart; se = ae.selectionEnd; } } catch (e) {}
    var frag = document.createDocumentFragment();
    renderInto(tpl.content, vals, frag);
    app.replaceChildren(frag);
    if (fid) { var nf = document.getElementById(fid); if (nf) { nf.focus(); try { if (ss != null) nf.setSelectionRange(ss, se); } catch (e) {} } }
  }

  // Site content (edited in /admin) — loaded before the page draws.
  var COLORS = ['peach','peach-deep','tangerine','cocoa','sky','sky-light','denim','purple','orchid','lavender','sunshine','orange','coral','pink-light','pink','rose','olive','green','lime','mint','aqua','teal'];
  window.FHJ = {
    data: {},
    param: function (k) { var m = new RegExp('[?&]' + k + '=([^&#]*)').exec(location.search); if (m) return decodeURIComponent(m[1]); return k === 'id' ? decodeURIComponent(location.hash.replace(/^#/, '')) : ''; },
    color: function (name, fallback) { name = name || fallback || 'peach'; if (name === 'black') return '#1E1A19'; if (name === 'grey') return '#B8B2B0'; return COLORS.indexOf(name) >= 0 ? 'var(--' + name + ')' : name; },
    status: function (s) { if (s === 'Passed away' && window.FHJ.memoryRainbow()) return window.FHJ.RAINBOW; return { 'Available': 'var(--pink)', 'In treatment': 'var(--sunshine)', 'Reserved': 'var(--orange)', 'Adopted': 'var(--green)', 'Lives with us': 'var(--sky)', 'Soon traveling': 'var(--purple)', 'Missing': '#B8B2B0', 'Passed away': '#1E1A19' }[s] || 'var(--cocoa)'; },
    RAINBOW: 'linear-gradient(135deg, #FF696A, #FF9D46, #FEC200, #4BC939, #3DCAD1, #43BDFF, #B8B8FF, #E86CE8)',
    memoryRainbow: function () { var st = (window.FHJ.data.settings || {}).memory_style; return st !== 'black'; },
    solid: function (r) { if (r.status === 'Passed away') return window.FHJ.memoryRainbow() ? '#B87FD9' : '#1E1A19'; var c = window.FHJ.cardColor(r); return c.indexOf('gradient') >= 0 ? '#B87FD9' : c; },
    cardColor: function (r) { if (r.status === 'Passed away' && window.FHJ.memoryRainbow()) return window.FHJ.RAINBOW; var fixed = { 'Adopted': 'var(--green)', 'Reserved': 'var(--orange)', 'In treatment': 'var(--sunshine)', 'Soon traveling': 'var(--purple)', 'Missing': '#B8B2B0', 'Passed away': '#1E1A19' }[r.status]; return fixed || window.FHJ.color(r.color); },
    ageMonths: function (r) {
      if (r.birth) { var b = new Date(r.birth), n = new Date(); if (!isNaN(b)) return (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth(); }
      var m = /(\d+(?:\.\d+)?)\s*(?:[–-]\s*\d+\s*)?(week|month|year|yr|mo)/i.exec(r.age || '');
      if (!m) return null;
      var v = parseFloat(m[1]), u = m[2].toLowerCase();
      return u.indexOf('week') === 0 ? v / 4.3 : (u.indexOf('y') === 0 ? v * 12 : v);
    },
    sponsor: function (r) {
      var F = window.FHJ, D = F.data, S = D.sponsor || {}, ig = (D.settings || {}).instagram_user || '';
      var items = (S.items && S.items.length ? S.items : [{ id: 'food', label: 'Food' }, { id: 'vaccines', label: 'Vaccines' }, { id: 'flea', label: 'Flea treatment' }, { id: 'treatment', label: 'Clinic bills' }]);
      var needs = (r.sponsor_needs && r.sponsor_needs.length) ? r.sponsor_needs : (r.name === '' ? null : ['food', 'vaccines', 'flea', 'treatment']);
      if (needs) items = needs.map(function (id) { return items.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
      var color = r.name === '' ? 'var(--peach, #ffb68d)' : F.solid(r);
      var out = items.map(function (it) {
        var note = it.id === 'food' && r.sponsor_food ? r.sponsor_food : (it.note || '');
        return { id: it.id, label: it.label, cost: it.cost || '', hasCost: !!it.cost, note: note, hasNote: !!note, on: false,
          icon: 'img/sp-' + it.id + '.svg', fg: color, bg: 'color-mix(in srgb, ' + color + ' 18%, #fff)',
          state: 'Sponsor', href: 'https://ig.me/m/' + ig,
          msg: 'Hi Furry Hearts of Jordan! I would like to sponsor ' + r.name + "'s " + it.label.toLowerCase() + ' 🐾 (sent from furryheartsofjordan.com)' };
      });
      return { items: out, n: out.length };
    },
    search: function (all, q) {
      var F = this;
      var s = ' ' + String(q || '').toLowerCase().replace(/[’']/g, '') + ' ';
      var PH = [[/blue[ -]?eye[ds]?/g, ' colorpoint '], [/black (and|&|n) white/g, ' tuxedo '], [/one[ -]?eye[ds]?/g, ' oneeye '], [/three[ -]?leg(ged|s)?/g, ' tripod '], [/special[ -]?needs?/g, ' specialneed '], [/long[ -]?hair(ed)?/g, ' fluffy '], [/short[ -]?hair(ed)?/g, ' shorthair '], [/scottish fold/g, ' fold '], [/maine coon/g, ' fluffy '], [/arabian mau/g, ' mau '], [/(cant|can not|cannot) walk/g, ' paraly '], [/no teeth/g, ' noteeth '], [/(no|without a?) tail|tail(less| amputated| amputation)|lost (her|his|the) tail/g, ' notail ']];
      PH.forEach(function (p) { s = s.replace(p[0], p[1]); });
      var raw = s.replace(/[^a-z0-9؀-ۿ#]+/g, ' ').split(' ').filter(Boolean);
      var STOP = { a: 1, an: 1, the: 1, with: 1, and: 1, of: 1, for: 1, is: 1, who: 1, my: 1, i: 1, want: 1, looking: 1, to: 1, in: 1, that: 1, has: 1, have: 1, cute: 1, beautiful: 1, pretty: 1, lovely: 1, sweet: 1, color: 1, colour: 1, colored: 1, coloured: 1, hair: 1, haired: 1, fur: 1, furred: 1, eyes: 1, eye: 1, pet: 1, please: 1, me: 1, show: 1, find: 1, any: 1, some: 1, very: 1, little: 1, small: 1 };
      var SYN = { gray: 'grey', silver: 'grey', blue: 'grey', ginger: 'orange', red: 'orange', redhead: 'orange', marmalade: 'orange',
        paralysed: 'paraly', paralyzed: 'paraly', paralysis: 'paraly', paralyze: 'paraly', paralized: 'paraly', paralised: 'paraly', wheelchair: 'paraly', wheels: 'paraly',
        disabled: 'specialneed', disability: 'specialneed', handicapped: 'specialneed', handicap: 'specialneed', special: 'specialneed', needs: 'specialneed', need: 'specialneed', sn: 'specialneed', sick: 'specialneed', chronic: 'specialneed',
        blind: 'blind', blindness: 'blind', sight: 'blind', vision: 'blind', eyeless: 'blind', deaf: 'deaf', deafness: 'deaf', hearing: 'deaf',
        tripod: 'tripod', amputee: 'tripod', notail: 'notail', tailless: 'notail', bobtail: 'notail', amputated: 'tripod', legged: 'tripod',
        healthy: 'healthy', normal: 'healthy', fit: 'healthy',
        kitten: 'young', kittens: 'young', kitty: 'cat', baby: 'young', babies: 'young', young: 'young', puppy: 'puppy', puppies: 'puppy', pup: 'puppy',
        adult: 'adult', grown: 'adult', senior: 'senior', old: 'senior', older: 'senior', elderly: 'senior',
        male: 'male', boy: 'male', boys: 'male', female: 'female', girl: 'female', girls: 'female', lady: 'female',
        cat: 'cat', cats: 'cat', feline: 'cat', dog: 'dog', dogs: 'dog', doggy: 'dog', canine: 'dog',
        fluffy: 'fluffy', fluff: 'fluffy', furry: 'fluffy', hairy: 'fluffy', persian: 'fluffy', ragdoll: 'colorpoint', himalayan: 'colorpoint', angora: 'fluffy', turkish: 'fluffy', coon: 'fluffy',
        siamese: 'colorpoint', point: 'colorpoint', pointed: 'colorpoint', colorpoint: 'colorpoint', colourpoint: 'colorpoint',
        shorthair: 'shorthair', mau: 'shorthair', arabian: 'shorthair', street: 'shorthair', baladi: 'shorthair', domestic: 'shorthair',
        mix: 'mixed', mixed: 'mixed', breed: 'mixed', breeds: 'mixed', fold: 'breedish', scottish: 'breedish', british: 'breedish', bengal: 'breedish', sphynx: 'breedish', exotic: 'breedish', pure: 'breedish', purebred: 'breedish',
        tuxedo: 'tuxedo', bicolor: 'tuxedo', calico: 'calico', tricolor: 'calico', tricolour: 'calico', tortie: 'tortie', tortoiseshell: 'tortie', tabby: 'tabby', striped: 'tabby', stripes: 'tabby', stripey: 'tabby',
        'قطة': 'cat', 'قطه': 'cat', 'قط': 'cat', 'بسة': 'cat', 'بسه': 'cat', 'بس': 'cat', 'قطط': 'cat', 'كلب': 'dog', 'كلبة': 'dog', 'كلاب': 'dog', 'برتقالي': 'orange', 'برتقالية': 'orange', 'اشقر': 'orange', 'شقرا': 'orange', 'اسود': 'black', 'سوداء': 'black', 'سودا': 'black', 'ابيض': 'white', 'بيضاء': 'white', 'بيضا': 'white', 'رمادي': 'grey', 'رمادية': 'grey', 'اعمى': 'blind', 'عمياء': 'blind', 'عميا': 'blind', 'مشلول': 'paraly', 'مشلولة': 'paraly', 'صغير': 'young', 'صغيرة': 'young', 'بيبي': 'young', 'شيرازي': 'fluffy', 'سيامي': 'colorpoint' };
      var sn = function (x) { return (x.tags || []).indexOf('Special needs') >= 0 || !!x.condition; };
      var cond = function (x) { return ' ' + [x.condition, x.summary, x.story].join(' ').toLowerCase(); };
      var coat = function (x) { return (x.coat || []).map(function (c) { return String(c).toLowerCase(); }); };
      var has = function (x, c) { return coat(x).indexOf(c) >= 0; };
      var any = function (str, arr) { for (var i = 0; i < arr.length; i++) if (str.indexOf(arr[i]) >= 0) return true; return false; };
      var age = function (x) { return F.ageMonths(x); };
      var isCat = function (x) { return (x.species || 'Cat') !== 'Dog'; };
      var colourTest = function (c, words) { return function (x) { return has(x, c) || (!(x.coat || []).length && any(' ' + [x.condition, x.summary, x.story, x.color_name].join(' ').toLowerCase(), words)); }; };
      var T = {
        cat: isCat, dog: function (x) { return !isCat(x); },
        orange: colourTest('orange', ['orange', 'ginger']), grey: colourTest('grey', ['grey', 'gray']), black: colourTest('black', ['black cat', 'black kitten', 'all black']), white: colourTest('white', ['white cat', 'white kitten', 'all white', 'snow white']),
        cream: colourTest('cream', ['cream']), brown: colourTest('brown', ['brown']), golden: colourTest('golden', ['golden']), tan: colourTest('tan', [' tan ']),
        calico: colourTest('calico', ['calico']), tortie: colourTest('tortie', ['tortie', 'tortoiseshell']), tabby: colourTest('tabby', ['tabby']),
        tuxedo: function (x) { return (has(x, 'black') && has(x, 'white')) || cond(x).indexOf('tuxedo') >= 0; },
        fluffy: function (x) { return has(x, 'fluffy'); }, colorpoint: function (x) { return has(x, 'colorpoint') || /siamese|himalayan|ragdoll/i.test(x.breed || ''); },
        shorthair: function (x) { return isCat(x) && (x.coat || []).length > 0 && !has(x, 'fluffy') && !has(x, 'colorpoint'); },
        mixed: isCat, breedish: null,
        specialneed: sn, healthy: function (x) { return !sn(x) && x.status !== 'Passed away'; },
        paraly: function (x) { return any(cond(x), ['paraly', 'wheelchair', 'cannot walk']); },
        blind: function (x) { return any(cond(x), ['blind', 'eyes removed', 'lost both eyes', 'one eye', 'vision', 'see well', 'eye damaged', 'eye lost', 'eye condition']); },
        oneeye: function (x) { return any(cond(x), ['one eye', 'eye lost', 'eye damaged', 'blind in one']); },
        deaf: function (x) { return cond(x).indexOf('deaf') >= 0; },
        tripod: function (x) { return any(cond(x), ['tripod', 'three leg', 'amput', 'three-leg']); },
        noteeth: function (x) { return cond(x).indexOf('no teeth') >= 0; },
        notail: function (x) { return any(cond(x), ['tail amputated', 'lost her tail', 'lost his tail', 'no tail', 'tailless']); },
        young: function (x) { var m = age(x); return (m !== null && m < 12) || /puppy|kitten|baby/i.test(x.age || ''); }, puppy: function (x) { var m = age(x); return !isCat(x) && ((m !== null && m < 12) || /puppy|baby/i.test(x.age || '')); },
        adult: function (x) { var m = age(x); return m !== null && m >= 12; }, senior: function (x) { var m = age(x); return (m !== null && m >= 96) || cond(x).indexOf('senior') >= 0; },
        male: function (x) { return x.sex === 'Male'; }, female: function (x) { return x.sex === 'Female'; }
      };
      var lev = function (a, b) { if (Math.abs(a.length - b.length) > 2) return 9; var d = []; for (var i = 0; i <= a.length; i++) { d[i] = [i]; } for (var j = 1; j <= b.length; j++) d[0][j] = j; for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
      var tol = function (w) { return w.length >= 7 ? 2 : (w.length >= 4 ? 1 : 0); };
      var hay = function (x) { return [x.name, x.species, x.status, F.statusLabel(x.status), x.condition, (x.tags || []).join(' '), x.family, x.age, x.breed, x.color_name, F.coatWords ? F.coatWords(x) : '', x.summary, x.story, x.number, x.case_number, x.destination].join(' ').toLowerCase(); };
      var usedBreed = false, tests = [];
      raw.forEach(function (w) {
        if (STOP[w]) return;
        w = w.replace(/^#/, '');
        var c = SYN[w] || (T[w] !== undefined ? w : null);
        if (!c && w.length >= 4) { var best = null, bd = 9; Object.keys(SYN).forEach(function (k) { if (k.length < 4) return; var d = lev(w, k); if (d < bd) { bd = d; best = k; } }); if (best && bd <= tol(w)) c = SYN[best]; }
        if (c === 'breedish' || c === 'fluffy' && /persian|angora|turkish|coon/.test(w) || c === 'colorpoint' && /ragdoll|himalayan/.test(w) || c === 'shorthair') usedBreed = true;
        if (c === 'breedish' || c === 'mixed') { if (c === 'mixed') tests.push({ w: w, f: T.mixed }); return; }
        if (c && T[c]) { if (!tests.some(function (t) { return t.c === c; })) tests.push({ w: w, c: c, f: T[c] }); return; }
        var ws = w.replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1');
        tests.push({ w: ws, text: true, f: function (x) { var h = hay(x); if (h.indexOf(ws) >= 0) return true; var t = tol(ws); if (!t) return false; var toks = h.split(/[^a-z0-9؀-ۿ]+/); for (var i = 0; i < toks.length; i++) if (toks[i].length >= 3 && lev(ws, toks[i]) <= t) return true; return false; } });
      });
      if (!tests.length) return { active: raw.length > 0, ok: {}, n: 0, note: usedBreed ? 'Most of our cats are beautiful mixed breeds, so try a colour or a look instead, like fluffy, orange or blue eyes.' : '' };
      var ok = {}, n = 0;
      all.forEach(function (x) { if (tests.every(function (t) { return t.f(x); })) { ok[x.slug] = 1; n++; } });
      var note = usedBreed ? 'Most of our cats are beautiful mixed breeds, so we searched by look.' : '';
      if (!n && tests.length > 1) {
        var sc = {}, top = 0;
        all.forEach(function (x) { var k = tests.filter(function (t) { return t.f(x); }).length; sc[x.slug] = k; if (k > top) top = k; });
        if (top > 0) { all.forEach(function (x) { if (sc[x.slug] === top) { ok[x.slug] = 1; n++; } }); note = 'No exact match, so here are the closest ones.' + (note ? ' ' + note : ''); }
      }
      return { active: true, ok: ok, n: n, note: note };
    },
    coatWords: function (r) {
      var EX = { orange: 'orange ginger', grey: 'grey gray blue', black: 'black', white: 'white', cream: 'cream', brown: 'brown', golden: 'golden', tan: 'tan brown', tabby: 'tabby striped', calico: 'calico tricolor', tortie: 'tortie tortoiseshell', colorpoint: 'colorpoint pointed', fluffy: 'fluffy longhair long hair' };
      var c = (r.coat || []).map(function (x) { return String(x).toLowerCase(); });
      var out = c.map(function (x) { return EX[x] || x; });
      if (c.indexOf('black') >= 0 && c.indexOf('white') >= 0) out.push('tuxedo black and white');
      return out.join(' ');
    },
    statusLabel: function (s) { return { 'Passed away': 'In loving memory' }[s] || s; },
    meta: function (r) {
      var bits = [];
      if (r.condition) bits.push(r.condition);
      else if (r.summary) bits.push(r.summary);
      (r.tags || []).forEach(function (t) { if (t === 'Siblings') return; if (t !== 'Special needs' || !r.condition) bits.push(t); });
      if (r.family) bits.push(r.family);
      var head = [r.age, r.sex].filter(Boolean).join(' · ');
      return (head ? head + '. ' : '') + bits.join(' · ');
    },
    lines: function (t) { return Array.isArray(t) ? t : String(t || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); },
    fill: function (t, r) { return String(t || '').replace(/\{name\}/g, (r && r.name) || ''); }
  };

  function loadData() {
    var meta = document.querySelector('meta[name="fhj-data"]');
    var files = meta ? meta.content.split(/\s+/).filter(Boolean) : [];
    return Promise.all(files.map(function (f) {
      return fetch(f, { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) {
        window.FHJ.data[f.replace(/^.*\//, '').replace(/\.json$/, '')] = j;
      }).catch(function () {});
    }));
  }

  function start() {
    tpl = document.getElementById('dc-root');
    app = document.getElementById('dc-app');
    var code = document.querySelector('script[type="text/x-dc"]');
    var Component = code
      ? new Function('DCLogic', code.textContent + '\nreturn Component;')(DCLogic)
      : class extends DCLogic { renderVals() { return {}; } };
    instance = new Component({});
    render();
    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      if (t) t.scrollIntoView();
    }
  }

  // Instagram buttons: copy a ready message, then open the chat.
  function toast(t) {
    var d = document.getElementById('fhj-toast');
    if (!d) { d = document.createElement('div'); d.id = 'fhj-toast'; d.setAttribute('role', 'status');
      d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:90vw;background:#704F44;color:#fff;padding:14px 20px;border-radius:999px;font:500 15px/1.4 Figtree,system-ui,sans-serif;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.18);transition:opacity .3s';
      document.body.appendChild(d); }
    d.textContent = t; d.style.opacity = '1'; clearTimeout(d._t); d._t = setTimeout(function () { d.style.opacity = '0'; }, 4500);
  }
  document.addEventListener('click', function (e) {
    var sb = e.target.closest && e.target.closest('[data-scroll]');
    if (sb) { var sec = sb.closest('section'); var row = sec && sec.querySelector('.fhj-tails, .fhj-row'); if (row) { var card = row.firstElementChild; var step = card ? card.getBoundingClientRect().width + (parseFloat(getComputedStyle(row).columnGap) || 28) : 300; row.scrollBy({ left: step * Number(sb.getAttribute('data-scroll')), behavior: 'smooth' }); } return; }
    var a = e.target.closest && e.target.closest('a[data-msg]');
    if (!a || !a.getAttribute('data-msg')) return;
    var text = a.getAttribute('data-msg');
    try { navigator.clipboard.writeText(text).then(function () { toast('Message copied ✓ Just paste it in the Instagram chat'); }, function () {}); } catch (err) {}
  }, true);

  function boot() { loadData().then(start); window.addEventListener('hashchange', function () { if (instance) { render(); window.scrollTo(0, 0); } }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* Home hero slideshow: auto-advance + clickable dots */
(function () {
  var cur = 0, last = Date.now(), DELAY = 8000, PAUSE = 14000, hold = 0;
  function show(sec, i) {
    var slides = sec.querySelectorAll(':scope > .fhj-hero');
    if (slides.length < 2) return;
    cur = (i + slides.length) % slides.length;
    sec.classList.add('fhj-js');
    slides.forEach(function (s, k) { s.classList.toggle('fhj-show', k === cur); s.setAttribute('aria-hidden', k === cur ? 'false' : 'true'); });
    sec.querySelectorAll('.fhj-herodots button').forEach(function (b, k) { b.classList.toggle('on', k === cur); b.setAttribute('aria-pressed', k === cur ? 'true' : 'false'); });
  }
  setInterval(function () {
    var sec = document.querySelector('.fhj-heroswap.fhj-swap-on'); if (!sec) return;
    if (!sec.classList.contains('fhj-js')) { show(sec, cur); last = Date.now(); return; }
    if (sec.matches(':hover')) { last = Date.now(); return; }
    if (Date.now() - last >= (hold || DELAY)) { hold = 0; show(sec, cur + 1); last = Date.now(); }
  }, 250);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.fhj-herodots [data-hero]'); if (!b) return;
    var sec = b.closest('.fhj-heroswap'); show(sec, +b.getAttribute('data-hero')); last = Date.now(); hold = PAUSE;
  });
})();
