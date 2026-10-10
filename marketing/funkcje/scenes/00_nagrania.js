// Scena z nagrania prawdziwego CRM (capture/run.mjs → rec/<id>/f/*.jpg + meta.json).
//
// Kadr: przez pierwsze ~4,5 s tytuł sceny i małe okno z początkiem nagrania, potem okno
// rośnie na cały kadr. Klatki to zrzuty screencastu Chrome z czasem — film pokazuje
// zawsze ostatnią klatkę przed bieżącą chwilą nagrania (tak samo jak ffmpeg concat).
//
// Warstwa „motion” idzie za znacznikami kroków z nagrania (lib.beat), jak na stronie:
// złota ramka mówi GDZIE, podpis mówi CO, kamera przybliża obszar kroku (do ~1,3×,
// bo klatka ma 2160 px, a okno w kadrze ok. 1620 px).

const RW = { x: 140, y: 24, w: 1640, h: 1033 };       // oprawa okna na całym kadrze
const RS = { x: 930, y: 250, w: 860 };                 // to samo okno obok tytułu
// Tytuł z podtytułem musi dać się przeczytać (audit: ~3,5 s tytuł, ~4 s podtytuł), więc okno
// rośnie dopiero w 6,4 s. Nagranie zaczyna się w 2,6 s: w chwili powiększenia jest w ~3,8 s
// z 4,6 s nieruchomego początku (capture/common.mjs TITLE_HOLD) - akcja rusza na całym kadrze.
const T_EXP = 6.4, START = 2.6;

/*
 * Przytrzymania: w nagraniu kroki bywają gęstsze niż czas czytania podpisu (klik za
 * klikiem). Zamiast zwalniać całe nagranie, zatrzymujemy klatkę w chwili kroku, na tyle,
 * ile brakuje jego podpisowi. Znacznik kroku stawia lib.beat, gdy ekran już pokazuje to,
 * o czym krok mówi (i przestał się ruszać), więc zatrzymana klatka zgadza się z podpisem.
 * Przytrzymanie na następnym znaczniku pokazywało już skutek następnego kliknięcia (np.
 * otwarte okno) pod starym podpisem. Czas nagrania r ↔ czas sceny f: recAt/filmAt.
 */
function recPlan(meta, steps, speed, tail) {
  const need = st => Math.max(3, 1.4 + .42 * words(st.text)) + .2 * words(st.step);
  const marks = meta.marks, holds = [];
  marks.forEach((m, i) => {
    const st = steps[m.id];
    if (!st?.text) return;
    const last = i === marks.length - 1;
    const nextR = last ? meta.dur : marks[i + 1].t;
    // podpis czytany od t0 + 0,65 do następnego kroku − 0,1 (ostatni: do końca sceny − 0,8)
    const avail = (nextR - m.t) / speed - .75 + (last ? tail - .8 + .1 : 0);
    const extra = need(st) + .3 - avail;
    if (extra > 0) holds.push({ r: m.t, d: +extra.toFixed(2) });
  });
  // krok w chwili h.r zaczyna się PRZED swoim przytrzymaniem (podpis wchodzi na zatrzymaną klatkę)
  const filmAt = r => START + r / speed + holds.filter(h => h.r < r).reduce((a, h) => a + h.d, 0);
  const recAt = f => {
    let t = START, r0 = 0;
    if (f <= t) return 0;
    for (const h of holds) {
      const len = (h.r - r0) / speed;
      if (f < t + len) return r0 + (f - t) * speed;
      t += len;
      if (f < t + h.d) return h.r;
      t += h.d; r0 = h.r;
    }
    return r0 + (f - t) * speed;
  };
  const dur = START + meta.dur / speed + holds.reduce((a, h) => a + h.d, 0) + tail;
  return { holds, filmAt, recAt, dur };
}

function recScene({ id, title, eyebrow, num, lines, sub, rec = id, speed = 1, steps = {}, tail = 1.4, maxZoom = 1.3 }) {
  scene({
    id, title, rec, speed,
    durFrom: meta => recPlan(meta, steps, speed, tail).dur,
    build(c) {
      const { tl, def } = c;
      const meta = def.meta;
      const plan = recPlan(meta, steps, speed, tail);
      const dir = `rec/${rec}/f/`;
      c.bg({ stage: [1290, 560, 1500, 900] });
      c.title({ x: 120, y: sub ? 330 : 380, w: 760, eyebrow, num, lines, sub, at: .4, until: T_EXP });

      const persp = c.add('<div class="persp"></div>');
      const rs = c.add(`<div class="win rs" style="left:${RW.x}px;top:${RW.y}px;width:${RW.w}px;height:${RW.h}px">
        <div class="body" style="display:block"><div class="zm abs" style="inset:0;transform-origin:50% 50%">
          <img class="fb" src="${dir}${meta.frames[0].f}" style="position:absolute;inset:0;width:100%;height:100%;display:block">
          <div class="rings abs" style="inset:0"></div></div></div></div>`, persp);
      const zm = rs.querySelector('.zm'), img = rs.querySelector('.fb'), rings = rs.querySelector('.rings');
      const s0 = RS.w / RW.w;
      tl.set(rs, { transformOrigin: '0% 0%', x: RS.x - RW.x, y: RS.y - RW.y, scale: s0 }, 0);
      tl.fromTo(rs, { opacity: 0, rotateX: 14, filter: 'blur(6px)' }, { opacity: 1, rotateX: 0, filter: 'blur(0px)', duration: 1.5, ease: 'expo.out' }, .5);
      tl.to(rs, { x: 0, y: 0, scale: 1, duration: 1.3, ease: 'expo.inOut' }, T_EXP);

      // flipbook: ostatnia klatka nie późniejsza niż bieżąca chwila nagrania
      const ts = meta.frames.map(f => f.t);
      let shown = 0;
      c.on(t => {
        const r = plan.recAt(t);
        let lo = 0, hi = ts.length - 1;
        while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ts[mid] <= r) lo = mid; else hi = mid - 1; }
        if (lo !== shown || !img.dataset.ok) {
          shown = lo; img.dataset.ok = 1;
          img.src = dir + meta.frames[lo].f;
          PENDING.push(img.decode().catch(() => {}));
        }
      });

      // kroki: podpis, ramka, kamera
      const at = plan.filmAt;
      const marks = meta.marks;
      const endT = def.dur - .8;
      let camFree = T_EXP + 1.4;   // kamera rusza dopiero, gdy okno jest już na całym kadrze
      marks.forEach((m, i) => {
        const st = steps[m.id];
        const t0 = at(m.t), next = marks[i + 1] ? at(marks[i + 1].t) : endT;
        const fu = m.until != null ? Math.min(at(m.until), next) : next;
        const f = m.focus;
        if (f) {
          const ring = c.add(`<div class="ring" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%;border-radius:10px"></div>`, rings);
          tl.fromTo(ring, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: .6, ease: 'expo.out', immediateRender: false }, t0 + .35);
          tl.to(ring, { opacity: 0, duration: .25, ease: 'none' }, Math.max(t0 + 1, fu));
          tl.set(ring, { opacity: 0 }, 0);
          const z = Math.max(1, Math.min(st?.zoom ?? maxZoom, 90 / f.w, 90 / f.h));
          if (z > 1.03 && st?.zoom !== 1) {
            const cx = f.x + f.w / 2, cy = f.y + f.h / 2, mx = (z - 1) * 50;
            const tx = Math.max(-mx, Math.min(mx, z * (50 - cx))), ty = Math.max(-mx, Math.min(mx, z * (50 - cy)));
            tl.to(zm, { scale: z, xPercent: tx, yPercent: ty, duration: 1.1, ease: 'expo.out' }, Math.max(t0, camFree));
            const back = fu + .15;
            const nz = marks[i + 1] && marks[i + 1].focus && at(marks[i + 1].t) - back < .9;
            if (!nz) tl.to(zm, { scale: 1, xPercent: 0, yPercent: 0, duration: 1.0, ease: 'expo.inOut' }, back);
            camFree = nz ? next : back + 1.0;
          }
        }
        if (st?.text) {
          const right = f && f.x + f.w / 2 < 50;
          const cap = c.add(`<div class="cap" style="${right ? `right:${1920 - RW.x - RW.w + 44}px` : `left:${RW.x + 44}px`};bottom:${1080 - RW.y - RW.h + 44}px;top:auto">
            <div class="k"><span>${st.step}</span><i></i></div><div class="x">${st.text}</div></div>`);
          const cEnd = Math.min(next - .1, endT);
          tl.fromTo(cap, { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .55, ease: 'expo.out', immediateRender: false }, t0 + .15);
          tl.to(cap, { opacity: 0, y: -8, filter: 'blur(4px)', duration: .35, ease: 'power2.in' }, cEnd);
          tl.set(cap, { opacity: 0 }, 0);
          c.read(st.text, t0 + .65, cEnd, .2 * words(st.step));
        }
      });
    },
  });
}
