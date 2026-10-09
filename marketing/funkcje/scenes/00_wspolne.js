// Klocki wspólne dla scen: plansza rozdziału, wykres kołowy, postęp z czasu.

// postęp 0..1 tweena [at, at+dur] liczony z czasu sceny (dla updaterów)
const prog = (t, at, dur, ease = 'power3.out') => gsap.parseEase(ease)(Math.min(1, Math.max(0, (t - at) / dur)));
const lerp = (a, b, p) => a + (b - a) * p;

// ─────────────────────────────────────────────────────────────────────────────
// Plansza rozdziału: nazwa, hasło (druga linia złota) i spis funkcji jako numerowane
// bloki z kreską u góry — jak lista korzyści na stronie. Kreska zapala się złotem po kolei,
// zapowiadając kolejność scen. Bez ikon: numer w Geist Mono robi to, co ikona udaje.
// ─────────────────────────────────────────────────────────────────────────────
function chapter({ id, num, name, slogan, items, dur = 9 }) {
  scene({
    id, title: name, dur,
    build(c) {
      const { tl } = c;
      c.bg({ stage: [1250, 420, 1500, 900], warm: .8 });

      const eb = c.add(`<div class="eb abs" style="left:160px;top:250px"><span class="n">${num}.</span><span class="bar"></span><span>Rozdział</span></div>`);
      tl.fromTo(eb, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 1.2 }, .3);

      const nm = c.add(`<div class="abs" style="left:152px;top:296px;font-size:184px;font-weight:620;letter-spacing:-0.058em;line-height:1.02"><span class="ln"><span class="silver">${name}</span></span></div>`);
      tl.fromTo(nm.querySelector('.ln > span'), { yPercent: 112 }, { yPercent: 0, duration: 1.5 }, .4);

      const sl = c.add(`<div class="abs" style="left:160px;top:528px;font-size:58px;font-weight:600;letter-spacing:-0.045em;line-height:1.12">${slogan.map((l, i) =>
        `<div>${l.split(' ').map(w => `<span class="w ${i === slogan.length - 1 ? 'goldt' : 'silver'}">${w}&nbsp;</span>`).join('')}</div>`).join('')}</div>`);
      c.words(sl, 1.1, { stagger: .07, y: 30, dur: 1.1 });
      const nW = sl.querySelectorAll('.w').length;
      c.read(slogan.join(' '), 1.1 + nW * .07 + .6, dur - .8);

      const row = c.add(`<div class="abs" style="left:160px;top:770px;display:flex;gap:40px">${items.map((t, i) =>
        `<div style="position:relative;width:300px;padding-top:20px;display:grid;grid-template-columns:44px 1fr">
          <span style="position:absolute;left:0;right:0;top:0;height:1px;background:rgba(255,255,255,.16)"></span>
          <span class="gl" style="position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,#ecd08f,#b8873a);transform-origin:0 50%;transform:scaleX(0)"></span>
          <span class="mono nn" style="font-size:15px;color:#71717a;padding-top:4px">${String(i + 1).padStart(2, '0')}.</span>
          <span style="font-size:25px;font-weight:560;letter-spacing:-0.025em;color:#f4f4f2;line-height:1.25">${t}</span></div>`).join('')}</div>`);
      tl.fromTo(row.children, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, stagger: .1 }, 1.4);
      row.querySelectorAll('.gl').forEach((g, i) => {
        tl.to(g, { scaleX: 1, duration: .9, ease: 'expo.inOut' }, 2.4 + i * .35);
        tl.to(row.querySelectorAll('.nn')[i], { color: '#ecd08f', duration: .4, ease: 'none' }, 2.6 + i * .35);
      });
      c.read(items.join(' '), 1.4 + items.length * .1 + .7, dur - .8);

      tl.to([eb, nm, sl, row], { y: -24, opacity: 0, duration: .7, ease: 'power2.in', stagger: .03 }, dur - .8);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Wykres kołowy (pierścień) rysowany z czasu sceny.
// segs: [{v, color}] ; zwraca svg
// ─────────────────────────────────────────────────────────────────────────────
function donut(c, parent, { size = 260, stroke = 44, segs, at = 0, dur = 1.6, gap = .6 }) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r;
  const total = segs.reduce((s, x) => s + x.v, 0);
  const svg = c.add(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${stroke}"/>
    ${segs.map(s => `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${stroke}" stroke-dasharray="0 ${C}"/>`).join('')}</svg>`, parent);
  const arcs = [...svg.querySelectorAll('circle')].slice(1);
  c.on(t => {
    const p = prog(t, at, dur, 'power3.inOut');
    let acc = 0;
    segs.forEach((s, i) => {
      const frac = s.v / total;
      const start = acc * C, len = Math.max(0, frac * C - gap);
      // segment rośnie, gdy wskazówka postępu przejdzie przez jego początek
      const shown = Math.max(0, Math.min(len, p * C - start));
      arcs[i].setAttribute('stroke-dasharray', `${shown} ${C}`);
      arcs[i].setAttribute('stroke-dashoffset', `${-start}`);
      acc += frac;
    });
  });
  return svg;
}
