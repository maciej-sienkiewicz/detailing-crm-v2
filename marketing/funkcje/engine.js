// ─────────────────────────────────────────────────────────────────────────────
// Silnik samouczka. Każda scena to osobna oś GSAP z lokalnym czasem; film to
// sceny ustawione jedna za drugą z zakładką na przenikanie.
//
// Render jest deterministyczny: window.seek(t) ustawia KAŻDĄ klatkę od zera,
// więc render.mjs może skakać po osi w dowolnej kolejności (4 procesy naraz).
// Liczniki i pisanie na klawiaturze NIE używają onUpdate GSAP-a (przy skokach
// wstecz potrafi nie zawołać się dla tweena, który jeszcze nie wystartował),
// tylko „updaterów” liczonych z czasu sceny przy każdym seek.
//
// Czytelność: każdy napis rejestruje się w ctx.read(); audit() porównuje czas,
// w którym tekst stoi na ekranie w pełni widoczny, z czasem potrzebnym na
// przeczytanie (readNeed). render.mjs przerywa render, gdy coś jest za krótkie.
// ─────────────────────────────────────────────────────────────────────────────
gsap.ticker.lagSmoothing(0);
gsap.defaults({ ease: 'expo.out', duration: 1 });

const W = 1920, H = 1080, OVER = 0.7;
const SCENES = [];
const scene = def => SCENES.push(def);

// czas na przeczytanie: 1,4 s na „złapanie” wzroku + 0,42 s na słowo, min. 3 s
const words = s => String(s).replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(w => /[\p{L}\d]/u.test(w)).length;
const readNeed = s => Math.max(3, 1.4 + 0.42 * words(s));

// liczby po polsku: 34 367 zł, 2490,00 zł (spacja twarda wąska jak w aplikacji)
const fmtInt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const fmtZl = n => fmtInt(n) + ' zł';
const fmtGr = gr => { const s = gr < 0 ? '−' : ''; gr = Math.abs(Math.round(gr)); return s + fmtInt(Math.floor(gr / 100)) + ',' + String(gr % 100).padStart(2, '0') + ' zł'; };

// deterministyczny generator losowy
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// ikony (ścieżki w stylu lucide, 24×24, obrys)
const ICON = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.9 3.9M6.6 6.6C3.6 8.5 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
  bars: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.4"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  receipt: '<path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3z"/><path d="M8 9h8M8 13h6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14a6 6 0 0 1 3 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M3.5 6l1.2 1.2L6.8 5M3.5 12l1.2 1.2L6.8 11M3.5 18l1.2 1.2L6.8 17"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  msg: '<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  car: '<path d="M5 17h14M3 17v-4l2.2-5.2A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.3L21 13v4"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M3.5 12.5h17"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.3L12 17.5 6.4 20.4l1.1-6.3L3 9.7l6.2-.9z"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v.01M18 15v.01"/>',
  pin: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h.01M12 8h.01M15 8h.01M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  filter: '<path d="M3 4h18l-7 8.5V19l-4 2v-8.5z"/>',
  sign: '<path d="M3 17c3-1 4-6 6-6s1 5 3 5 3-4 5-4 2 3 4 3"/><path d="M3 21h18"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18h2"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
};
const ic = (name, size = 24, color = 'currentColor', sw = 2) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;
const CURSOR_SVG = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M4 2 L4 20 L9 15.5 L12.2 22.5 L15.3 21.1 L12.2 14.3 L19 14.3 Z" fill="#fff" stroke="#0f172a" stroke-width="1.4" stroke-linejoin="round"/></svg>';

// boczne menu aplikacji (prawdziwe pozycje z menuSections.ts)
const SIDE_ITEMS = [
  ['Tablica', 'grid'], ['Czas pracy', 'clock'], ['Urlop', 'sun'], '|Praca', ['Wizyty', 'car'], ['Kalendarz', 'cal'],
  '|Klienci i zapytania', ['Zapytania', 'inbox'], ['Klienci', 'users'], '|Firma', ['Finanse', 'wallet'], ['Statystyki', 'chart'], ['Pracownicy', 'user'],
  '|Marketing', ['Kampanie', 'msg'],
];
function sidebar(active, items = SIDE_ITEMS) {
  return `<div class="side"><div class="org"><div class="lg">SP</div>Studio Połysk</div>${items.map(it => typeof it === 'string'
    ? `<div class="sec">${it.slice(1)}</div>`
    : `<div class="it${it[0] === active ? ' on' : ''}" data-it="${it[0]}">${ic(it[1], 18)}<span>${it[0]}</span></div>`).join('')}</div>`;
}
function appWin({ x, y, w, h, active, html, side = true, id = '' }) {
  return `<div class="win" ${id ? `id="${id}"` : ''} style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">
    <div class="body">${side ? sidebar(active) : ''}<div class="main">${html}</div></div></div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// kontekst sceny
// ─────────────────────────────────────────────────────────────────────────────
function makeCtx(def, root, tl) {
  const ups = [];
  const reads = [];
  const ctx = {
    def, root, tl, ups, reads, dur: def.dur,
    $: s => root.querySelector(s),
    $$: s => [...root.querySelectorAll(s)],
    add(html, parent = root) { const t = document.createElement('template'); t.innerHTML = html.trim(); const nodes = [...t.content.childNodes]; nodes.forEach(n => parent.appendChild(n)); return nodes[0]; },
    on(fn) { ups.push(fn); },
    // pozycja elementu w układzie sceny z samego layoutu (offsety ignorują transformacje,
    // więc pomiar nie zależy od tego, w jakim stanie są animacje wejścia)
    pos(el) {
      let x = 0, y = 0, e = el;
      while (e && e !== root) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight, cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2 };
    },
    // tekst: rejestr do audytu czytelności. tIn/tOut = chwile, gdy tekst jest w pełni widoczny.
    read(text, tIn, tOut, minExtra = 0) { reads.push({ text: String(text).replace(/<[^>]+>/g, ''), tIn, tOut, need: readNeed(text) + minExtra }); },

    // ── światło sceny: złota poświata pod oknem i chłodny kontrapunkt (siatka kropek jest globalna) ──
    bg({ stage = [1300, 600, 1300, 760], cool = [-200, 380, 1000, 700], warm = 1 } = {}) {
      const [cx, cy, w, h] = stage;
      const wm = ctx.add(`<div class="warm" style="left:${cx - w / 2}px;top:${cy - h / 2}px;width:${w}px;height:${h}px;opacity:${warm}"></div>`);
      const cl = ctx.add(`<div class="cool" style="left:${cool[0]}px;top:${cool[1]}px;width:${cool[2]}px;height:${cool[3]}px"></div>`);
      // poświata „oddycha” przez całą scenę — kadr nigdy nie stoi martwo
      tl.fromTo(wm, { x: 40, y: 10, scale: .96 }, { x: -50, y: -20, scale: 1.05, duration: def.dur, ease: 'sine.inOut' }, 0);
      tl.fromTo(cl, { x: -30 }, { x: 60, duration: def.dur, ease: 'sine.inOut' }, 0);
      return wm;
    },

    // ── blok tytułowy: etykieta rozdziału, tytuł (linie), podtytuł ──
    // Stoi na ekranie przez całą scenę — widz zawsze wie, CO ogląda.
    title({ x = 120, y = 300, w = 640, eyebrow, num, lines, sub, at = 0.5, until = def.dur - 0.6, size, gold }) {
      // pierwsze linie srebrne, ostatnia złota (jak nagłówek strony: „Zarządzaj studiem / w jednym miejscu.”)
      const g = gold ?? (lines.length > 1 ? lines.length - 1 : -1);
      const tb = ctx.add(`<div class="tb" style="left:${x}px;top:${y}px;width:${w}px">
        ${eyebrow ? `<div class="eb">${num ? `<span class="n">${num}.</span><span class="bar"></span>` : ''}<span>${eyebrow}</span></div>` : ''}
        <div class="tt" ${size ? `style="font-size:${size}px"` : ''}>${lines.map((l, i) => `<span class="ln"><span class="${i === g ? 'goldt' : 'silver'}">${l}</span></span>`).join('')}</div>
        ${sub ? `<div class="st">${sub}</div>` : ''}</div>`);
      const eb = tb.querySelector('.eb'), lns = tb.querySelectorAll('.ln > span'), st = tb.querySelector('.st');
      if (eb) tl.fromTo(eb, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 1.1 }, at);
      tl.fromTo(lns, { yPercent: 112 }, { yPercent: 0, duration: 1.25, stagger: .11 }, at + .1);
      if (st) tl.fromTo(st, { opacity: 0, y: 18, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1 }, at + .45);
      tl.to(tb, { opacity: 0, y: -12, filter: 'blur(5px)', duration: .55, ease: 'power2.in' }, until);
      ctx.read(lines.join(' '), at + 1.2, until);
      if (sub) ctx.read(sub, at + 1.5, until);
      return tb;
    },

    // ── podpis kroku: etykieta w Geist Mono + jedno zdanie (wzór BeatCaption ze strony) ──
    callout(text, x, y, at, until, { step = def.title, from = 'up' } = {}) {
      const el = ctx.add(`<div class="cap" style="left:${x}px;top:${y}px"><div class="k"><span>${step}</span><i></i></div><div class="x">${text}</div></div>`);
      const d = { up: { y: 14 }, down: { y: -14 }, left: { x: 18 }, right: { x: -18 } }[from] || { y: 14 };
      tl.fromTo(el, { opacity: 0, ...d, filter: 'blur(6px)' }, { opacity: 1, x: 0, y: 0, filter: 'blur(0px)', duration: .55, ease: 'expo.out' }, at);
      tl.fromTo(el.querySelector('.x'), { opacity: 0 }, { opacity: 1, duration: .4, ease: 'none' }, at + .12);
      tl.to(el, { opacity: 0, y: -8, filter: 'blur(4px)', duration: .35, ease: 'power2.in' }, until);
      // etykieta kroku to dwa, trzy słowa czytane rzutem oka — liczymy ją za ułamek
      ctx.read(text, at + .5, until, .2 * words(step));
      return el;
    },
    // ── złota ramka GDZIE (wzór FocusRing): element albo prostokąt {x,y,w,h} w układzie sceny ──
    focus(target, at, until, { pad = 8, parent = root, r = 10 } = {}) {
      const p = target.nodeType ? ctx.pos(target) : target;
      const el = ctx.add(`<div class="ring" style="left:${p.x - pad}px;top:${p.y - pad}px;width:${p.w + 2 * pad}px;height:${p.h + 2 * pad}px;border-radius:${r}px"></div>`, parent);
      tl.fromTo(el, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: .6, ease: 'expo.out' }, at);
      tl.to(el, { opacity: 0, scale: .98, duration: .25, ease: 'none' }, until);
      return el;
    },

    // ── wielki napis (plansza) ──
    words(el, at, { stagger = .09, dur = 1.2, y = 60 } = {}) {
      const ws = el.querySelectorAll('.w');
      tl.fromTo(ws, { opacity: 0, y, filter: 'blur(14px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: dur, stagger }, at);
      return ws;
    },

    // ── licznik liczony z czasu sceny ──
    count(el, at, dur, from, to, fmt = fmtInt, ease = 'power3.out') {
      const e = gsap.parseEase(ease);
      ups.push(t => { const p = Math.min(1, Math.max(0, (t - at) / dur)); el.textContent = fmt(from + (to - from) * e(p)); });
    },
    // ── pisanie na klawiaturze ──
    type(el, at, text, cps = 22, { caret = true } = {}) {
      const end = at + text.length / cps;
      ups.push(t => {
        const n = Math.max(0, Math.min(text.length, Math.floor((t - at) * cps)));
        const showCaret = caret && t >= at - .4 && t < end + .6 && Math.floor(t * 2.2) % 2 === 0;
        el.innerHTML = esc(text.slice(0, n)).replace(/\n/g, '<br>') + (showCaret ? '<span style="display:inline-block;width:2px;height:1.05em;background:#0ea5e9;vertical-align:-0.15em;margin-left:1px"></span>' : '');
      });
      return end;
    },

    // ── kursor myszy ──
    cursor(x0, y0, at = 0, parent = root) {
      const c = ctx.add(`<div class="cur">${CURSOR_SVG}</div>`, parent);
      const r = ctx.add('<div class="rip"></div>', parent);
      const TIP = [5.7, 2.8];
      tl.set(c, { x: x0 - TIP[0], y: y0 - TIP[1], opacity: 0 }, 0);
      tl.to(c, { opacity: 1, duration: .4, ease: 'none' }, at);
      const api = {
        el: c,
        move(t, x, y, dur = .9, ease = 'power3.inOut') { tl.to(c, { x: x - TIP[0], y: y - TIP[1], duration: dur, ease }, t); return api; },
        click(t, x, y) {
          tl.to(c, { scale: .84, duration: .07, ease: 'power2.in', transformOrigin: '12% 6%' }, t - .07);
          tl.to(c, { scale: 1, duration: .25, ease: 'power2.out' }, t);
          tl.fromTo(r, { x, y, scale: .25, opacity: .95 }, { scale: 1.5, opacity: 0, duration: .55, ease: 'power2.out', immediateRender: false }, t);
          return api;
        },
        hide(t) { tl.to(c, { opacity: 0, duration: .35, ease: 'none' }, t); return api; },
      };
      return api;
    },
    // ── dotyk palcem (telefon/tablet) ──
    tapAt(parent, t, x, y) {
      const el = ctx.add('<div class="tap"></div>', parent);
      tl.set(el, { x, y, opacity: 0 }, 0);
      tl.fromTo(el, { x, y, scale: 1.3, opacity: 0 }, { scale: 1, opacity: 1, duration: .18, ease: 'power2.out', immediateRender: false }, t - .18);
      tl.to(el, { scale: .8, duration: .1 }, t);
      tl.to(el, { opacity: 0, scale: 1.4, duration: .35, ease: 'power2.out' }, t + .12);
    },
    // ── wejście okna/karty: pochylone do tyłu o 17° z osią na GÓRNEJ krawędzi, prostuje się
    //    (parametry Stage3D ze strony — oś u góry, więc okno nie „podskakuje”) ──
    enter(el, at, { rx = 17, y = 50, s = .93, dur = 1.6, blur = 6 } = {}) {
      tl.set(el, { transformOrigin: '50% 0%' }, 0);
      tl.fromTo(el, { opacity: 0, y, rotateX: rx, scale: s, filter: `blur(${blur}px)` },
        { opacity: 1, y: 0, rotateX: 0, scale: 1, filter: 'blur(0px)', duration: dur, ease: 'expo.out' }, at);
      tl.set(el, { clearProps: 'filter' }, at + dur);
    },
    // ── powolny najazd kamery na element ──
    drift(el, from = 1, to = 1.04, t0 = 0, t1 = def.dur, extra = {}) {
      tl.fromTo(el, { scale: from, ...extra.from }, { scale: to, ...extra.to, duration: t1 - t0, ease: 'none' }, t0);
    },
    // ── delikatny impuls na elemencie aplikacji ──
    pulse(el, at, color = '#0ea5e9') {
      tl.fromTo(el, { boxShadow: `0 0 0 0px ${hexA(color, .55)}` }, { boxShadow: `0 0 0 14px ${hexA(color, 0)}`, duration: 1.1, ease: 'power2.out' }, at);
    },
  };
  return ctx;
}
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

// ─────────────────────────────────────────────────────────────────────────────
// film
// ─────────────────────────────────────────────────────────────────────────────
const film = { entries: [], total: 0 };
function buildFilm(ids) {
  const frame = document.getElementById('frame');
  const list = ids ? ids.map(id => SCENES.find(s => s.id === id)).filter(Boolean) : SCENES;
  let t = 0;
  for (const def of list) {
    const root = document.createElement('div');
    root.className = 'scene'; root.dataset.id = def.id;
    root.style.setProperty('--acc', def.accent || '#38bdf8');
    frame.insertBefore(root, document.getElementById('vignette'));
    const tl = gsap.timeline({ paused: true });
    const ctx = makeCtx(def, root, tl);
    def.build(ctx);
    // przejście: wejście i wyjście sceny (przenikanie z lekkim powiększeniem)
    if (!def.noIn) tl.fromTo(root, { opacity: 0 }, { opacity: 1, duration: OVER, ease: 'power1.inOut' }, 0);
    if (!def.noOut) tl.to(root, { opacity: 0, duration: OVER, ease: 'power1.inOut' }, def.dur - OVER);
    tl.set({}, {}, def.dur);
    // przewinięcie raz do końca i z powrotem: wszystkie tweeny zapisują wartości startowe po kolei
    tl.seek(def.dur, true); tl.seek(0, true);
    film.entries.push({ def, root, tl, ctx, start: t });
    t += def.dur - OVER;
  }
  film.total = t + OVER;
  return film;
}

const black = () => document.getElementById('black');

// Tło: siatka kropek, przez którą przechodzą wolne fale światła (port DotField ze strony,
// liczony z czasu filmu zamiast z zegara, żeby każda klatka była powtarzalna).
// Kropki stoją — rusza się tylko ich jasność; co dziewiąta niesie złoto, tylko w świetle.
const FIELD = { gap: 24, seeds: null };
function drawField(t) {
  const c = document.getElementById('field'); if (!c) return;
  const g = c.getContext('2d'); const w = 1920, h = 1080, GAP = FIELD.gap;
  const cols = Math.ceil(w / GAP) + 1, rows = Math.ceil(h / GAP) + 1;
  if (!FIELD.seeds) { const r = rng(11); FIELD.seeds = Float32Array.from({ length: cols * rows }, r); c.width = w; c.height = h; }
  g.clearRect(0, 0, w, h);
  const cx = w / 2;
  const l1x = cx + Math.sin(t * .11) * w * .32, l1y = h * .34 + Math.cos(t * .09) * h * .18;
  const l2x = cx + Math.cos(t * .07 + 2) * w * .38, l2y = h * .62 + Math.sin(t * .13 + 1) * h * .14;
  const r1 = w * .26, r2 = w * .22;
  for (let row = 0; row < rows; row++) {
    const y = row * GAP + GAP / 2;
    for (let col = 0; col < cols; col++) {
      const x = col * GAP + GAP / 2, s = FIELD.seeds[row * cols + col];
      const d1 = Math.hypot(x - l1x, y - l1y) / r1, d2 = Math.hypot(x - l2x, y - l2y) / r2;
      const light = Math.exp(-d1 * d1) + .8 * Math.exp(-d2 * d2);
      const wave = .5 + .5 * Math.sin(Math.hypot(x - cx, y - h * .45) * .018 - t * .9);
      const tw = .75 + .25 * Math.sin(t * (.6 + s * 1.4) + s * 40);
      const a = Math.min(.5, .03 + light * (.2 + .16 * wave) * tw);
      if (a < .03) continue;
      const gold = s > .89 && light > .25;
      g.fillStyle = gold ? `rgba(236,208,143,${a * 1.25})` : `rgba(244,244,242,${a})`;
      const r = gold ? 1.2 : 1;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
}
const grainCanvas = () => document.getElementById('grain');
let grainFrames = [];
function makeGrain() {
  const c = grainCanvas(); c.width = 480; c.height = 270;
  const g = c.getContext('2d'); const r = rng(42);
  for (let k = 0; k < 6; k++) {
    const img = g.createImageData(480, 270);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    grainFrames.push(img);
  }
}

function seek(T) {
  for (const e of film.entries) {
    const lt = T - e.start;
    const on = lt >= 0 && lt <= e.def.dur;
    if (on) {
      e.root.style.display = '';
      e.tl.seek(lt, true);
      for (const u of e.ctx.ups) u(lt);
    } else e.root.style.display = 'none';
  }
  // czerń na początku i końcu filmu
  const b = Math.max(0, 1 - T / .5, 1 - (film.total - T) / .5);
  black().style.opacity = Math.min(1, b);
  drawField(T);
  // odblask po górnej krawędzi oprawy okna: co 7 s, jak światło lampy na świeżej powłoce
  const ph = (T % 7) / 7, sh = ph < .55 ? 200 : 200 - (ph - .55) / .45 * 300;
  document.getElementById('frame').style.setProperty('--sheen', sh + '%');
  const gi = Math.floor(T * 24) % grainFrames.length;
  if (grainFrames[gi]) grainCanvas().getContext('2d').putImageData(grainFrames[gi], 0, 0);
}

// audyt czytelności: tekst musi stać w pełni widoczny co najmniej readNeed(tekst)
function audit() {
  const out = [];
  for (const e of film.entries) for (const r of e.ctx.reads) {
    const have = r.tOut - r.tIn;
    out.push({ scene: e.def.id, title: e.def.title, text: r.text, at: +(e.start + r.tIn).toFixed(1), until: +(e.start + r.tOut).toFixed(1), have: +have.toFixed(2), need: +r.need.toFixed(2), ok: have + 1e-6 >= r.need });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// start: ?scene=id[,id]  ?render=1
// ─────────────────────────────────────────────────────────────────────────────
window.ready = (async () => {
  const q = new URLSearchParams(location.search);
  const render = q.has('render');
  document.body.classList.add(render ? 'render' : 'preview');
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  makeGrain();
  buildFilm(q.get('scene') ? q.get('scene').split(',') : null);
  window.seek = seek;
  window.duration = film.total;
  window.timeline = film.entries.map(e => ({ id: e.def.id, title: e.def.title, start: +e.start.toFixed(3), dur: e.def.dur }));
  window.audit = audit;
  seek(0);
  if (!render) player();
  return true;
})();

function player() {
  const frame = document.getElementById('frame');
  const fit = () => { const s = Math.min(innerWidth / W, (innerHeight - 70) / H); frame.style.transform = `scale(${s})`; frame.style.marginTop = '-60px'; };
  fit(); addEventListener('resize', fit);
  const ctl = document.createElement('div'); ctl.id = 'ctl';
  ctl.innerHTML = `<button id="pp">▶︎</button><input type="range" id="sc" min="0" max="${film.total}" step="0.01" value="0"><span class="tc" id="tc"></span><span id="chips"></span>`;
  document.body.appendChild(ctl);
  const chips = ctl.querySelector('#chips');
  film.entries.forEach(e => { const b = document.createElement('button'); b.textContent = e.def.title || e.def.id; b.onclick = () => { T = e.start; playing = true; }; chips.appendChild(b); });
  let T = 0, playing = false, last = performance.now();
  const pp = ctl.querySelector('#pp'), sc = ctl.querySelector('#sc'), tc = ctl.querySelector('#tc');
  pp.onclick = () => { playing = !playing; };
  sc.oninput = () => { T = +sc.value; playing = false; };
  addEventListener('keydown', ev => {
    if (ev.code === 'Space') { playing = !playing; ev.preventDefault(); }
    if (ev.code === 'ArrowRight') T = Math.min(film.total, T + 2);
    if (ev.code === 'ArrowLeft') T = Math.max(0, T - 2);
  });
  const loop = now => {
    const dt = (now - last) / 1000; last = now;
    if (playing) { T += dt; if (T >= film.total) { T = film.total; playing = false; } }
    seek(T); sc.value = T; pp.textContent = playing ? '❚❚' : '▶︎';
    const cur = film.entries.filter(e => T >= e.start).pop();
    tc.textContent = `${T.toFixed(1)} / ${film.total.toFixed(1)} s`;
    [...chips.children].forEach((b, i) => b.classList.toggle('on', film.entries[i] === cur));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
