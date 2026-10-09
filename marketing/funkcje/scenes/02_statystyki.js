// ROZDZIAŁ 1: STATYSTYKI — grupy usług, sezonowość, koszty i przychody.
// Etykiety jak w module statistics (StatisticsView, CostsView) i finance (FinanceSummaryCards).
// Kwoty: brutto w statystykach przychodów, netto w podsumowaniu finansowym — jak w aplikacji.
// 84 260 zł brutto ÷ 1,23 = 68 504 zł netto; zysk = 68 504 − 25 723 = 42 781 zł.

chapter({
  id: 'r1', num: '01', name: 'Statystyki',
  slogan: ['Zarządzaj firmą prościej.', 'Kontroluj więcej.'],
  items: ['Grupy usług', 'Sezonowość', 'Koszty i przychody'],
});

// ── 1.1 GRUPY USŁUG ──────────────────────────────────────────────────────────
scene({
  id: 'grupy', title: 'Grupy usług', dur: 19,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Statystyki', num: '01', lines: ['Grupy usług'], sub: 'Ile zleceń zrealizowałeś w każdej grupie i <b>ile na nich zarobiłeś.</b>', y: 340 });

    const cats = [
      { n: 'Pielęgnacja lakieru', k: 92, v: 49210, col: '#2563eb' },
      { n: 'Ochrona PPF', k: 11, v: 18290, col: '#8b5cf6' },
      { n: 'Detailing wnętrza', k: 47, v: 10620, col: '#16a34a' },
      { n: 'Usługi podstawowe', k: 36, v: 6140, col: '#f97316' },
    ];
    const subs = [['Powłoka ceramiczna IGL Eclipse', 14, 34860], ['Korekta lakieru 1-etapowa', 38, 9880], ['Polerowanie reflektorów', 40, 4470]];
    const maxV = 49210;

    const ui = c.add('<div class="persp"><div class="rig" id="ui"></div></div>').firstChild;
    const card = c.add(`<div class="card float abs" style="left:790px;top:140px;width:640px;height:800px;overflow:hidden">
      <div style="padding:26px 26px 18px;display:flex;justify-content:space-between;align-items:flex-end">
        <div><div class="h3" style="font-size:22px">Kategorie usług</div><div style="font-size:14px;color:#64748b;margin-top:4px">Podział według kategorii, ostatnie 12 miesięcy</div></div>
        <div class="bdg gray">${ic('cal', 14)}2025/26</div></div>
      <div class="tbl"><div class="tr th" style="grid-template-columns:1fr 110px 160px;padding:0 26px"><span>Kategoria</span><span style="text-align:right">Zlecenia</span><span style="text-align:right">Przychód</span></div></div>
      <div id="rows"></div>
      <div class="foot" style="position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 110px 160px;align-items:center;height:72px;padding:0 26px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:18px;font-weight:700;color:#0f172a">
        <span>Razem</span><span class="num ft1" style="text-align:right;font-size:22px">0</span><span class="num ft2" style="text-align:right;font-size:22px;font-weight:800">0 zł</span></div></div>`, ui);
    const rows = card.querySelector('#rows');
    const rowEls = cats.map((ct, i) => c.add(`<div><div class="crow" style="display:grid;grid-template-columns:1fr 110px 160px;align-items:center;padding:18px 26px;border-bottom:1px solid #f1f5f9;position:relative">
        <div><div style="display:flex;align-items:center;gap:11px;font-size:18px;font-weight:650;color:#0f172a">
          <span style="width:11px;height:11px;border-radius:50%;background:${ct.col}"></span>${ct.n}
          ${i === 0 ? `<span class="chev" style="display:inline-flex;color:#94a3b8">${ic('arrow', 16, '#94a3b8')}</span>` : ''}</div>
          <div style="margin-top:12px;height:8px;border-radius:99px;background:#f1f5f9;width:300px"><div class="fill" style="height:100%;width:${ct.v / maxV * 100}%;background:${ct.col};border-radius:99px;transform-origin:0 50%"></div></div></div>
        <div class="num cnt" style="text-align:right;font-size:22px;font-weight:700;color:#0f172a">0</div>
        <div class="num rev" style="text-align:right;font-size:22px;font-weight:800;color:#0f172a">0 zł</div></div>
        ${i === 0 ? `<div class="exp" style="height:0;overflow:hidden;background:#f8fafc">${subs.map(s => `<div class="srow" style="display:grid;grid-template-columns:1fr 110px 160px;align-items:center;height:56px;padding:0 26px 0 48px;border-bottom:1px solid #eef2f7;font-size:16px;color:#334155">
          <span>${s[0]}</span><span class="num" style="text-align:right;font-weight:600">${s[1]}</span><span class="num" style="text-align:right;font-weight:700;color:#0f172a">${fmtZl(s[2])}</span></div>`).join('')}</div>` : ''}</div>`, rows));

    c.enter(card, .8);
    rowEls.forEach((r, i) => {
      tl.fromTo(r, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 1 }, 1.4 + i * .12);
      tl.fromTo(r.querySelector('.fill'), { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'power3.inOut' }, 1.6 + i * .12);
      c.count(r.querySelector('.cnt'), 1.6 + i * .12, 1.8, 0, cats[i].k);
      c.count(r.querySelector('.rev'), 1.6 + i * .12, 1.8, 0, cats[i].v, fmtZl);
    });

    tl.fromTo(card.querySelector('.foot'), { opacity: 0 }, { opacity: 1, duration: .8, ease: 'none' }, 1.9);
    c.count(card.querySelector('.ft1'), 2.0, 1.9, 0, 186);
    c.count(card.querySelector('.ft2'), 2.0, 1.9, 0, 84260, fmtZl);

    // pierścień i wskaźniki
    const dc = c.add(`<div class="card float abs" style="left:1460px;top:140px;width:380px;height:500px">
      <div class="lbl" style="padding:24px 24px 0;line-height:1.5">Struktura przychodów<br>wg kategorii</div>
      <div class="dn" style="position:absolute;left:60px;top:120px;width:260px;height:260px"></div>
      <div style="position:absolute;left:60px;top:120px;width:260px;height:260px;display:grid;place-items:center;text-align:center">
        <div><div class="num tot" style="font-size:30px;font-weight:800;letter-spacing:-0.03em;color:#0f172a">0 zł</div><div style="font-size:14px;color:#64748b;margin-top:2px">Łącznie brutto</div></div></div>
      <div style="position:absolute;left:24px;right:24px;bottom:22px;display:flex;flex-wrap:wrap;gap:8px 14px;font-size:13px;color:#475569">
        ${cats.map(ct => `<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:9px;height:9px;border-radius:50%;background:${ct.col}"></i>${(ct.v / 84260 * 100).toFixed(1).replace('.', ',')}%</span>`).join('')}</div></div>`, ui);
    c.enter(dc, 2.6);
    donut(c, dc.querySelector('.dn'), { size: 260, stroke: 42, segs: cats.map(ct => ({ v: ct.v, color: ct.col })), at: 3.0, dur: 1.9 });
    c.count(dc.querySelector('.tot'), 3.0, 1.9, 0, 84260, fmtZl);

    const k1 = c.add(`<div class="card float abs kpi" style="--k:#10b981;left:1460px;top:668px;width:380px;height:128px"><div class="lbl">Łączny przychód brutto</div><div class="v num" id="k1">0 zł</div></div>`, ui);
    const k2 = c.add(`<div class="card float abs kpi" style="--k:#0ea5e9;left:1460px;top:812px;width:380px;height:128px"><div class="lbl">Liczba zleceń</div><div class="v num" id="k2">0</div></div>`, ui);
    c.enter(k1, 3.3); c.enter(k2, 3.45);
    c.count(k1.querySelector('#k1'), 3.5, 1.8, 0, 84260, fmtZl);
    c.count(k2.querySelector('#k2'), 3.6, 1.8, 0, 186);

    c.callout('Liczba zleceń i przychód w każdej grupie.', 790, 962, 4.4, 10.2, { step: 'Ile i za ile' });
    c.focus({ x: 1150, y: 270, w: 260, h: 330 }, 4.7, 9.0, { parent: ui });
    

    // rozwinięcie kategorii: usługi z liczbą zleceń i przychodem
    const cur = c.cursor(1250, 1000, 10.0, ui);
    cur.move(10.2, 1010, 314, 1.1);
    cur.click(11.3, 1010, 314);
    const r0 = rowEls[0];
    tl.to(r0.querySelector('.crow'), { backgroundColor: '#f0f9ff', duration: .3, ease: 'none' }, 11.3);
    tl.to(r0.querySelector('.chev'), { rotate: 90, duration: .5 }, 11.3);
    tl.to(r0.querySelector('.exp'), { height: 168, duration: .9, ease: 'expo.inOut' }, 11.35);
    tl.fromTo(r0.querySelectorAll('.srow'), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: .8, stagger: .1 }, 11.7);
    cur.move(12.2, 1180, 440, 1.2).hide(13.4);
    c.callout('Każda usługa osobno, z liczbą zleceń i przychodem.', 790, 962, 12.4, 18.2, { step: 'Wnętrze grupy' });

    c.drift(ui, 1, 1.035, 0, 19);
    tl.set(ui, { transformOrigin: '1300px 540px' }, 0);
  },
});

// ── 1.2 SEZONOWOŚĆ ───────────────────────────────────────────────────────────
scene({
  id: 'sezon', title: 'Sezonowość', dur: 17,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Statystyki', num: '01', lines: ['Sezonowość', 'biznesu'], sub: 'Zobacz, kiedy masz <b>szczyt sezonu,</b> a kiedy warto zaplanować kampanię.', y: 330 });

    const M = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
    const REV = [9800, 11200, 21400, 38600, 46900, 44300, 39800, 35200, 30400, 24100, 15300, 12600];
    const ORD = [9, 10, 18, 31, 38, 36, 33, 29, 25, 20, 13, 11];
    const PX = 92, PY = 196, PW = 920, PH = 400, MAXV = 50000, MAXO = 44;

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const card = c.add(`<div class="card float abs" style="left:780px;top:170px;width:1060px;height:720px;overflow:hidden">
      <div style="position:absolute;left:30px;right:30px;bottom:0;height:62px;border-top:1px solid #f1f5f9;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;color:#64748b">
        <i style="width:14px;height:14px;border-radius:50%;background:#d1fae5"></i>Kliknij dowolny okres na wykresie, aby zobaczyć szczegóły wizyt</div>
      <div style="position:absolute;left:30px;top:28px;right:30px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:16px"><div class="lbl" style="font-size:13px">Przychody i wizyty</div>
          <div class="bdg" style="background:#f0f9ff;color:#0369a1;border-color:#bae6fd">${ic('cal', 14)}Ostatnie 12 miesięcy</div></div>
        <div class="seg" id="seg"><div>Dziennie</div><div class="on" id="sTyg">Tygodniowo</div><div id="sMies">Miesięcznie</div><div>Kwartalnie</div><div>Rocznie</div></div></div>
      <div style="position:absolute;right:34px;top:92px;display:flex;gap:18px;font-size:13.5px;color:#475569">
        <span style="display:inline-flex;align-items:center;gap:7px"><i style="width:11px;height:11px;border-radius:3px;background:#10b981"></i>Przychód</span>
        <span style="display:inline-flex;align-items:center;gap:7px"><i style="width:16px;height:3px;border-radius:2px;background:#0ea5e9"></i>Zlecenia</span></div>
      <div id="plot" style="position:absolute;left:0;top:0;width:1060px;height:740px"></div></div>`, ui);
    const plot = card.querySelector('#plot');
    // siatka i oś
    for (let i = 0; i <= 5; i++) {
      const y = PY + PH - i * PH / 5;
      c.add(`<div class="abs" style="left:${PX}px;width:${PW}px;top:${y}px;border-top:1px ${i ? 'dashed #eef2f7' : 'solid #e2e8f0'}"></div>`, plot);
      c.add(`<div class="abs num" style="left:0;width:${PX - 16}px;text-align:right;top:${y - 9}px;font-size:13px;color:#94a3b8">${i ? i * 10 + 'k' : '0'}</div>`, plot);
    }
    // słupki tygodniowe (52) — te same dane rozpisane na tygodnie
    const r = rng(7);
    const wk = [];
    for (let m = 0; m < 12; m++) for (let k = 0; k < (m % 3 === 2 ? 5 : 4) && wk.length < 52; k++) wk.push(REV[m] / 4.33 * (0.75 + r() * .5));
    while (wk.length < 52) wk.push(REV[11] / 4.33);
    const WS = PW / 52;
    const wkEls = wk.map((v, i) => c.add(`<div class="abs" style="left:${PX + i * WS + WS * .18}px;width:${WS * .64}px;top:${PY + PH - v / 14000 * PH}px;height:${v / 14000 * PH}px;background:#10b981;border-radius:3px 3px 0 0;transform-origin:50% 100%"></div>`, plot));
    // słupki miesięczne
    const S = PW / 12, BW = 46;
    const mEls = REV.map((v, i) => c.add(`<div class="abs" style="left:${PX + i * S + (S - BW) / 2}px;width:${BW}px;top:${PY + PH - v / MAXV * PH}px;height:${v / MAXV * PH}px;background:linear-gradient(#34d399,#10b981);border-radius:7px 7px 0 0;transform-origin:50% 100%"></div>`, plot));
    const mLbl = M.map((m, i) => c.add(`<div class="abs" style="left:${PX + i * S}px;width:${S}px;text-align:center;top:${PY + PH + 14}px;font-size:15px;font-weight:600;color:#64748b">${m}</div>`, plot));
    // linia zleceń
    const pts = ORD.map((o, i) => [PX + i * S + S / 2, PY + PH - o / MAXO * PH]);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    const svg = c.add(`<svg class="abs" width="1060" height="740" style="left:0;top:0;overflow:visible"><path d="${d}" fill="none" stroke="#0ea5e9" stroke-width="3.5" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/>
      ${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#fff" stroke="#0ea5e9" stroke-width="3" style="transform-box:fill-box;transform-origin:center"/>`).join('')}</svg>`, plot);
    const path = svg.querySelector('path'), dots = svg.querySelectorAll('circle');

    c.enter(card, .8);
    tl.fromTo(wkEls, { scaleY: 0 }, { scaleY: 1, duration: .9, stagger: .012, ease: 'power3.out' }, 1.5);
    tl.set(mEls, { scaleY: 0 }, 0); tl.set(mLbl, { opacity: 0 }, 0); tl.set(dots, { scale: 0 }, 0);

    const cur = c.cursor(1500, 900, 2.6, ui);
    cur.move(2.8, 1555, 216, 1.0);
    cur.click(3.9, 1555, 216);
    const seg = card.querySelector('#seg');
    tl.to(card.querySelector('#sTyg'), { backgroundColor: 'rgba(255,255,255,0)', boxShadow: '0 0 0 rgba(0,0,0,0)', color: '#64748b', duration: .25, ease: 'none' }, 3.9);
    tl.to(card.querySelector('#sMies'), { backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(15,23,42,.12)', color: '#0f172a', duration: .25, ease: 'none' }, 3.9);
    cur.move(4.4, 1640, 330, 1.2).hide(5.4);
    tl.to(wkEls, { scaleY: 0, duration: .45, stagger: { each: .006, from: 'end' }, ease: 'power2.in' }, 4.0);
    tl.to(mEls, { scaleY: 1, duration: 1.1, stagger: .06, ease: 'expo.out' }, 4.55);
    tl.to(mLbl, { opacity: 1, duration: .5, stagger: .04, ease: 'none' }, 4.6);
    tl.to(path, { attr: { 'stroke-dashoffset': 0 }, duration: 1.4, ease: 'power2.inOut' }, 5.3);
    tl.to(dots, { scale: 1, duration: .4, stagger: .1, ease: 'back.out(3)' }, 5.3);

    // pasma sezonu w wykresie
    const band = (i0, i1, col, txt, at, top = 110) => {
      const b = c.add(`<div class="abs" style="left:${PX + i0 * S + 4}px;width:${(i1 - i0 + 1) * S - 8}px;top:${PY - 28}px;height:${PH + 28}px;border-radius:14px;background:${hexA(col, .09)};border:2px dashed ${hexA(col, .55)}"></div>`, plot);
      plot.insertBefore(b, plot.firstChild);
      const p = c.add(`<div class="abs" style="left:${PX + i0 * S + 4}px;width:${(i1 - i0 + 1) * S - 8}px;top:${top}px;text-align:center"><span class="bdg" style="height:32px;font-size:15px;background:${hexA(col, .12)};color:${col === '#10b981' ? '#047857' : '#b45309'};border-color:${hexA(col, .5)}">${txt}</span></div>`, plot);
      tl.fromTo(b, { opacity: 0, scaleY: .92 }, { opacity: 1, scaleY: 1, duration: .9 }, at);
      tl.fromTo(p, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .8 }, at + .2);
      c.read(txt, at + .8, 16.4);
    };
    band(3, 6, '#10b981', 'Szczyt sezonu', 7.0, PY - 12);
    band(0, 1, '#f59e0b', 'Spokojniejsze miesiące', 8.6, PY - 12);
    c.callout('Najlepszy miesiąc to maj: 46 900 zł brutto.', 780, 920, 10.0, 16.3, { step: 'Szczyt sezonu' });

    c.drift(ui, 1, 1.03, 0, 17);
    tl.set(ui, { transformOrigin: '1300px 520px' }, 0);
  },
});

// ── 1.3 KOSZTY I PRZYCHODY ───────────────────────────────────────────────────
scene({
  id: 'koszty', title: 'Koszty i przychody', dur: 17,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Statystyki', num: '01', lines: ['Koszty', 'i przychody'], sub: 'Przychody, koszty i <b>zysk w jednym miejscu,</b> bez arkuszy kalkulacyjnych.', y: 330 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const tiles = [
      ['Przychody', 'netto, opłacone faktury / paragony', 68504, '#16a34a', '#f0fdf4'],
      ['Koszty', 'netto, opłacone faktury kosztowe', 25723, '#dc2626', '#fef2f2'],
      ['Zysk', 'netto, przychody − koszty', 42781, '#0ea5e9', '#f0f9ff'],
      ['Należności', 'netto, czekamy na zapłatę', 3920, '#d97706', '#fffbeb'],
    ];
    const tEls = tiles.map((t, i) => c.add(`<div class="card float abs" style="left:${780 + i * 269}px;top:140px;width:253px;height:176px;border-top:3px solid ${t[3]};background:linear-gradient(180deg, ${t[4]}, #fff 75%);padding:20px 20px">
      <div style="font-size:16px;font-weight:700;color:#0f172a">${t[0]}</div><div style="font-size:12.5px;color:#64748b;margin-top:3px;line-height:1.35">${t[1]}</div>
      <div class="num v" style="font-size:31px;font-weight:800;letter-spacing:-0.03em;color:#0f172a;margin-top:16px">0 zł</div></div>`, ui));
    tEls.forEach((el, i) => { c.enter(el, .8 + i * .12); c.count(el.querySelector('.v'), 1.3 + i * .12, 2, 0, tiles[i][2], fmtZl); });
    c.pulse(tEls[2], 3.8, '#0ea5e9');
    c.callout('Przychody minus koszty, liczone na bieżąco.', 780, 940, 3.6, 8.8, { step: 'Zysk' });
    c.focus(tEls[2], 3.9, 7.4, { parent: ui, r: 18 });

    const CC = [['Materiały i chemia', 9840, '#ef4444'], ['Wynagrodzenia', 8200, '#f97316'], ['Najem', 4500, '#f59e0b'], ['Media', 1683, '#8b5cf6'], ['Marketing', 1500, '#0ea5e9']];
    const dc = c.add(`<div class="card float abs" style="left:780px;top:346px;width:470px;height:560px">
      <div class="lbl" style="padding:24px 26px 0">Struktura kosztów wg kategorii</div>
      <div class="dn" style="position:absolute;left:135px;top:66px;width:200px;height:200px"></div>
      <div style="position:absolute;left:135px;top:66px;width:200px;height:200px;display:grid;place-items:center;text-align:center"><div><div class="num tot" style="font-size:24px;font-weight:800;color:#0f172a">0 zł</div><div style="font-size:12.5px;color:#64748b">netto</div></div></div>
      <div class="lg" style="position:absolute;left:26px;right:26px;top:296px">${CC.map(([n, v, col]) => `<div class="lr" style="display:grid;grid-template-columns:18px 1fr auto 62px;align-items:center;height:48px;border-bottom:1px solid #f1f5f9;font-size:15.5px;color:#334155;border-radius:10px">
        <i style="width:10px;height:10px;border-radius:50%;background:${col}"></i><span style="font-weight:600;color:#0f172a">${n}</span><span class="num" style="color:#475569">${fmtZl(v)}</span><b class="num" style="text-align:right;color:#0f172a">${(v / 25723 * 100).toFixed(1).replace('.', ',')}%</b></div>`).join('')}</div></div>`, ui);
    c.enter(dc, 4.6);
    donut(c, dc.querySelector('.dn'), { size: 200, stroke: 34, segs: CC.map(x => ({ v: x[1], color: x[2] })), at: 5.0, dur: 1.8 });
    c.count(dc.querySelector('.tot'), 5.0, 1.8, 0, 25723, fmtZl);
    tl.fromTo(dc.querySelectorAll('.lr'), { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: .7, stagger: .08 }, 5.4);

    const MON = [['maj', 4100], ['cze', 3900], ['lip', 4450], ['sie', 4300], ['wrz', 4480], ['paź', 4493]];
    const tc = c.add(`<div class="card float abs" style="left:1270px;top:346px;width:570px;height:560px">
      <div class="lbl" style="padding:24px 26px 0">Rozkład kosztów w czasie</div>
      <div class="pl" style="position:absolute;left:40px;right:30px;top:90px;bottom:60px"></div></div>`, ui);
    const pl = tc.querySelector('.pl');
    const bars = MON.map(([m, v], i) => {
      const h = v / 5000 * 360;
      const b = c.add(`<div class="abs" style="left:${i * 83 + 14}px;width:52px;bottom:0;height:${h}px;border-radius:8px 8px 0 0;background:linear-gradient(#f87171,#ef4444);transform-origin:50% 100%"></div>`, pl);
      c.add(`<div class="abs num" style="left:${i * 83 - 6}px;width:92px;text-align:center;bottom:${h + 10}px;font-size:14px;font-weight:700;color:#0f172a">${fmtZl(v)}</div>`, pl);
      c.add(`<div class="abs" style="left:${i * 83 + 14}px;width:52px;text-align:center;bottom:-32px;font-size:14px;font-weight:600;color:#64748b">${m}</div>`, pl);
      return b;
    });
    c.add('<div class="abs" style="left:0;right:0;bottom:0;border-top:1px solid #e2e8f0"></div>', pl);
    c.enter(tc, 4.9);
    tl.fromTo(bars, { scaleY: 0 }, { scaleY: 1, duration: 1.2, stagger: .08 }, 5.4);
    tl.fromTo(pl.querySelectorAll('.num'), { opacity: 0 }, { opacity: 1, duration: .5, stagger: .08, ease: 'none' }, 6.0);

    tl.to(dc.querySelector('.lr'), { backgroundColor: '#fef2f2', duration: .4, ease: 'none' }, 9.4);
    c.callout('Widzisz, na co idzie najwięcej pieniędzy.', 780, 940, 9.4, 16.3, { step: 'Struktura kosztów' });
    c.focus(dc.querySelector('.lr'), 9.6, 13.0, { parent: ui, pad: 6 });

    c.drift(ui, 1, 1.03, 0, 17);
    tl.set(ui, { transformOrigin: '1300px 520px' }, 0);
  },
});
