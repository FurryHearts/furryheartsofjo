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
      var items = (S.items && S.items.length ? S.items : [{ id: 'treatment', label: 'Treatment' }, { id: 'vaccines', label: 'Vaccines' }, { id: 'food', label: 'Food' }, { id: 'litter', label: 'Litter' }]);
      var needs = (r.sponsor_needs && r.sponsor_needs.length) ? r.sponsor_needs : (r.name === '' ? null : ['treatment', 'vaccines', 'food', 'litter']);
      if (needs) items = needs.map(function (id) { return items.filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
      var now = new Date(), cur = now.getFullYear() * 12 + now.getMonth();
      var MONTH = now.toLocaleString('en', { month: 'long' });
      var m = /^(\d{4})-(\d{1,2})/.exec(r.sponsor_month || ''), last = m ? (+m[1]) * 12 + (+m[2] - 1) : null;
      var since = last === null ? null : cur - last, thisMonth = since === 0;
      var got = thisMonth ? (r.sponsor_covered || []) : [];
      var color = F.solid(r);
      var out = items.map(function (it) {
        var on = got.indexOf(it.id) >= 0;
        var note = it.id === 'food' && r.sponsor_food ? r.sponsor_food : (it.note || '');
        return { id: it.id, label: it.label, cost: it.cost || '', hasCost: !!it.cost, note: note, hasNote: !!note, on: on, off: !on,
          icon: 'img/sp-' + it.id + '.svg', fg: on ? color : '#D8C8C2', bg: on ? 'color-mix(in srgb, ' + color + ' 18%, #fff)' : 'var(--cream, #fcf2f0)',
          state: on ? 'Covered ✓' : 'Sponsor', href: 'https://ig.me/m/' + ig,
          msg: 'Hi Furry Hearts of Jordan! I would like to sponsor ' + r.name + "'s " + it.label.toLowerCase() + ' for ' + MONTH + ' 🐾 (sent from furryheartsofjordan.com)' };
      });
      var n = out.filter(function (x) { return x.on; }).length;
      var line = n === out.length ? r.name + ' is fully covered for ' + MONTH + '. Thank you! ♥'
        : n > 0 ? n + ' of ' + out.length + ' covered for ' + MONTH + '.'
        : since === null ? 'Be the first to sponsor ' + r.name + '.'
        : since === 1 ? 'No one has sponsored ' + r.name + ' this month yet.'
        : 'No one has sponsored ' + r.name + ' for ' + since + ' months.';
      return { items: out, covered: n, line: line, urgent: n === 0 && since !== null && since >= 2, month: MONTH };
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
