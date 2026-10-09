// ROZDZIAŁ 2: FINANSE — KSeF na bieżąco, ukrywanie faktury, dokumenty spoza KSeF, kasa,
// faktura przy wydaniu pojazdu. Etykiety z modułu finance (KsefExpensesTable, AddExpenseModal,
// CashRegisterPanel) i visits/handover.
//
// Kwoty wg CLAUDE.md: kwota wpisana w brutto zostaje brutto, netto jest z niej liczone,
// VAT to różnica. 1 230,00 zł brutto / 23% → netto 1 000,00 zł; 2 490,00 zł → netto 2 024,39 zł,
// VAT 465,61 zł (249000 − 202439 gr).

chapter({
  id: 'r2', num: '02', name: 'Finanse',
  slogan: ['Mniej chaosu.', 'Więcej kontroli nad biznesem.'],
  items: ['Faktury z KSeF', 'Dokumenty kosztowe', 'Stan kasy', 'Faktura przy wydaniu'],
});

const COST_GRID = 'grid-template-columns:140px 1fr 150px 128px 80px';
function costRow(d, seller, no, gross, net, paid, src = 'KSeF', extra = '') {
  return `<div class="tr cr" style="${COST_GRID};height:62px">
    <span style="color:#475569">${d}</span>
    <span style="min-width:0"><b style="display:block;font-weight:650;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${seller}</b><span style="font-size:12.5px;color:#94a3b8">${no}</span></span>
    <span class="num" style="text-align:right;padding-right:18px"><b style="display:block;color:#0f172a">${fmtGr(gross)}</b><span style="font-size:12.5px;color:#94a3b8">netto ${fmtGr(net)}</span></span>
    <span><span class="bdg ${paid ? 'ok' : 'wait'} pay" style="position:relative"><span class="pt">${paid ? 'Opłacona' : 'Oczekuje'}</span>${ic('arrow', 12)}</span></span>
    <span><span class="bdg ${src === 'KSeF' ? 'ksef' : 'man'}">${src === 'KSeF' ? 'KSeF' : 'Ręcznie'}</span></span>${extra}</div>`;
}
const costHead = `<div class="tr th" style="${COST_GRID}"><span>Data sprzedaży</span><span>Sprzedawca</span><span style="text-align:right;padding-right:18px">Kwota</span><span>Płatność</span><span>Źródło</span></div>`;

// ── 2.1 KSeF NA BIEŻĄCO ──────────────────────────────────────────────────────
scene({
  id: 'ksef', title: 'Faktury z KSeF', dur: 17,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Finanse', num: '02', lines: ['Faktury', 'kosztowe z KSeF'], sub: 'Faktury od dostawców pojawiają się same, na bieżąco. <b>Jednym kliknięciem oznaczasz je jako opłacone.</b>', y: 300, w: 600, size: 72 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const win = c.add(appWin({ x: 744, y: 100, w: 1110, h: 830, active: 'Finanse', html: `
      <div class="ph"><div><h1>Finanse</h1><p>Dokumenty przychodowe, koszty KSeF i raporty</p></div><div class="btn p">${ic('plus', 17)}Dodaj dokument kosztowy</div></div>
      <div class="card" style="overflow:hidden;height:660px">
        <div class="tabs"><div>Dokumenty przychodowe</div><div class="on">Dokumenty kosztowe</div><div>Kasa</div><div>Podsumowanie płatności</div></div>
        <div style="display:flex;align-items:center;gap:12px;height:54px;padding:0 20px;border-bottom:1px solid #f1f5f9;font-size:14.5px;color:#475569">
          <span class="bdg ksef">KSeF</span><span class="spin" style="display:inline-flex">${ic('refresh', 17, '#7c3aed')}</span>
          <span style="position:relative;display:inline-block;width:420px;height:20px"><span class="s1 abs" style="left:0;top:0;white-space:nowrap">Synchronizacja z KSeF…</span>
          <span class="s2 abs" style="left:0;top:0;white-space:nowrap;color:#15803d;font-weight:600;opacity:0">Zsynchronizowano z KSeF, 3 nowe faktury</span></span></div>
        <div class="tbl">${costHead}<div class="rows">
          ${costRow('05.10.2026', 'Nieruchomości Bałtyk Sp. z o.o.', 'FV 10/2026', 553500, 450000, true)}
          ${costRow('03.10.2026', 'Allegro Sp. z o.o.', 'FV/2026/10/88214', 36900, 30000, true)}
          ${costRow('01.10.2026', 'Play Sp. z o.o.', 'F/26/10/552781', 9840, 8000, true)}
          ${costRow('29.09.2026', 'Hurtownia Auto-Detal', 'FV 1882/09/2026', 147600, 120000, true)}
        </div></div></div>` }), ui);
    const rows = win.querySelector('.rows');
    const nw = [
      costRow('08.10.2026', 'PGE Obrót S.A.', 'P/26/10/0081124', 68880, 56000, false),
      costRow('09.10.2026', 'Orlen S.A.', 'FV/O/26/1009/3311', 41820, 34000, false),
      costRow('09.10.2026', 'Koch-Chemie Polska Sp. z o.o.', 'FV/2026/10/0412', 233700, 190000, false),
    ].map(h => { const el = c.add(h); rows.insertBefore(el, rows.firstChild); return el; });
    const top0 = c.pos(rows);

    c.enter(win, .8);
    tl.to(win.querySelector('.spin'), { rotate: 720, duration: 3.2, ease: 'power1.inOut' }, 1.6);
    tl.set(nw, { height: 0, opacity: 0, overflow: 'hidden' }, 0);
    nw.forEach((r, i) => {
      const t = 2.7 + i * .8;
      tl.to(r, { height: 62, opacity: 1, duration: .8, ease: 'expo.out' }, t);
      tl.fromTo(r, { backgroundColor: '#ede9fe' }, { backgroundColor: '#ffffff', duration: 2.4, ease: 'power1.in', immediateRender: false }, t + .3);
    });
    tl.to(win.querySelector('.s1'), { opacity: 0, y: -8, duration: .4 }, 4.8);
    tl.fromTo(win.querySelector('.s2'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .6 }, 4.95);
    c.callout('Nowe faktury kosztowe pobierają się same.', 744, 952, 3.4, 8.8, { step: 'KSeF' });

    // „Oczekuje” → „Opłacona”
    const koch = nw[2], pay = koch.querySelector('.pay');
    const pp = c.pos(pay);
    const px = pp.x + 46, py = top0.y + 31;
    const pop = c.add(`<div class="abs" style="left:${pp.x - 6}px;top:${top0.y + 54}px;width:190px;background:#fff;border-radius:12px;box-shadow:0 18px 40px rgba(15,23,42,.22),0 0 0 1px rgba(15,23,42,.06);padding:6px;z-index:30;color:#0f172a;font-size:14.5px">
      <div class="o1" style="display:flex;align-items:center;gap:9px;height:40px;padding:0 10px;border-radius:8px">${ic('check', 16, '#16a34a', 2.6)}Opłacona</div>
      <div style="display:flex;align-items:center;gap:9px;height:40px;padding:0 10px;border-radius:8px;color:#64748b">${ic('clock', 16, '#d97706')}Oczekuje</div></div>`, ui);
    const cur = c.cursor(1500, 900, 8.2, ui);
    cur.move(8.4, px, py, 1.1);
    cur.click(9.7, px, py);
    tl.fromTo(pop, { opacity: 0, y: -8, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .35, ease: 'power2.out' }, 9.75);
    cur.move(10.2, pp.x + 40, top0.y + 80, .6);
    tl.to(pop.querySelector('.o1'), { backgroundColor: '#f0fdf4', duration: .2, ease: 'none' }, 10.6);
    cur.click(11.0, pp.x + 40, top0.y + 80);
    tl.to(pop, { opacity: 0, y: -6, duration: .25, ease: 'power2.in' }, 11.1);
    tl.to(pay, { backgroundColor: '#dcfce7', color: '#166534', duration: .3, ease: 'none' }, 11.15);
    tl.set(pay.querySelector('.pt'), { textContent: 'Opłacona' }, 11.15);
    c.pulse(pay, 11.2, '#16a34a');
    cur.move(11.6, 1450, 760, 1).hide(12.4);
    c.callout('Jedno kliknięcie i faktura jest opłacona.', 744, 952, 11.6, 16.3, { step: 'Płatność' });
    c.drift(ui, 1, 1.03, 0, 17);
    tl.set(ui, { transformOrigin: '1300px 540px' }, 0);
  },
});

// ── 2.2 UKRYJ ZE STATYSTYK ───────────────────────────────────────────────────
scene({
  id: 'ukryj', title: 'Ukryj ze statystyk', dur: 18,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Finanse', num: '02', lines: ['Ukryj fakturę', 'ze statystyk'], sub: 'Jednorazowy wydatek nie zaburzy wyników. <b>Faktura zostaje w dokumentach,</b> ale nie liczy się do statystyk.', y: 290, w: 600, size: 72 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const grid = 'grid-template-columns:140px 1fr 150px 128px 50px';
    const row = (d, s, no, g, n, extra = '') => `<div class="tr" style="${grid};height:64px">
      <span style="color:#475569">${d}</span><span><b style="display:block;font-weight:650;color:#0f172a">${s}</b><span style="font-size:12.5px;color:#94a3b8">${no}</span></span>
      <span class="num" style="text-align:right;padding-right:18px"><b style="display:block;color:#0f172a">${fmtGr(g)}</b><span style="font-size:12.5px;color:#94a3b8">netto ${fmtGr(n)}</span></span>
      <span><span class="bdg ok">Opłacona</span></span>${extra}<span class="dt" style="display:grid;place-items:center;width:34px;height:34px;border-radius:8px;color:#64748b">${ic('dots', 20)}</span></div>`;
    const tc = c.add(`<div class="card float abs" style="left:760px;top:110px;width:1080px;height:356px;overflow:hidden">
      <div style="padding:22px 24px 16px;display:flex;justify-content:space-between;align-items:center"><div class="h3" style="font-size:20px">Dokumenty kosztowe</div><span class="bdg gray">Październik 2026</span></div>
      <div class="tbl"><div class="tr th" style="${grid}"><span>Data sprzedaży</span><span>Sprzedawca</span><span style="text-align:right;padding-right:18px">Kwota</span><span>Płatność</span><span></span></div>
      ${row('09.10.2026', 'Koch-Chemie Polska Sp. z o.o.', 'FV/2026/10/0412', 233700, 190000)}
      <div class="lease">${row('07.10.2026', 'Auto-Moto Leasing S.A.', 'Wykup samochodu firmowego, FV/L/2026/7781', 6150000, 5000000, '<span class="bdg gray hid" style="position:absolute;left:440px;top:10px;opacity:0">' + ic('eyeoff', 13) + 'Ukryta</span>')}</div>
      ${row('05.10.2026', 'Nieruchomości Bałtyk Sp. z o.o.', 'FV 10/2026', 553500, 450000)}</div></div>`, ui);
    const lease = tc.querySelector('.lease .tr');

    const kc = c.add(`<div class="card float abs" style="left:760px;top:500px;width:340px;height:196px;border-top:3px solid #dc2626;background:linear-gradient(180deg,#fef2f2,#fff 75%);padding:20px 22px">
      <div style="font-size:16px;font-weight:700">Koszty</div><div style="font-size:12.5px;color:#64748b;margin-top:3px">netto, opłacone faktury kosztowe</div>
      <div class="num v" style="font-size:38px;font-weight:800;letter-spacing:-0.03em;margin-top:18px">75 723 zł</div></div>`, ui);
    const zc = c.add(`<div class="card float abs" style="left:760px;top:720px;width:340px;height:196px;border-top:3px solid #0ea5e9;background:linear-gradient(180deg,#f0f9ff,#fff 75%);padding:20px 22px">
      <div style="font-size:16px;font-weight:700">Zysk</div><div style="font-size:12.5px;color:#64748b;margin-top:3px">netto, przychody − koszty</div>
      <div class="num v" style="font-size:38px;font-weight:800;letter-spacing:-0.03em;margin-top:18px;color:#dc2626">−7 219 zł</div></div>`, ui);
    const MON = [['maj', 4100], ['cze', 3900], ['lip', 4450], ['sie', 4300], ['wrz', 4480], ['paź', 54493]];
    const ch = c.add(`<div class="card float abs" style="left:1124px;top:500px;width:716px;height:416px">
      <div class="lbl" style="padding:22px 26px 0">Rozkład kosztów w czasie</div><div class="pl" style="position:absolute;left:36px;right:30px;top:76px;bottom:50px"></div></div>`, ui);
    const pl = ch.querySelector('.pl');
    const PH = 270;
    const bars = MON.map(([m, v], i) => {
      const b = c.add(`<div class="abs" style="left:${i * 108 + 22}px;width:62px;bottom:0;height:${PH}px;border-radius:8px 8px 0 0;background:linear-gradient(#f87171,#ef4444);transform-origin:50% 100%"></div>`, pl);
      const l = c.add(`<div class="abs num" style="left:${i * 108 - 2}px;width:110px;text-align:center;bottom:0;font-size:14px;font-weight:700;color:#0f172a">${fmtZl(v)}</div>`, pl);
      c.add(`<div class="abs" style="left:${i * 108 + 22}px;width:62px;text-align:center;bottom:-30px;font-size:14px;font-weight:600;color:#64748b">${m}</div>`, pl);
      return { b, l, v };
    });
    c.add('<div class="abs" style="left:0;right:0;bottom:0;border-top:1px solid #e2e8f0"></div>', pl);
    // skala wykresu: przed ukryciem dyktuje ją wykup auta (60 tys.), po ukryciu zwykły miesiąc (5 tys.)
    c.on(t => {
      const p = prog(t, 9.3, 1.3, 'expo.inOut');
      const grow = prog(t, 1.8, 1.4, 'expo.out');
      const max = lerp(60000, 5000, p);
      bars.forEach(({ b, l, v }, i) => {
        const val = i === 5 ? lerp(v, 4493, p) : v;
        const h = Math.min(PH, val / max * PH) * grow;
        b.style.transform = `scaleY(${h / PH})`;
        l.style.bottom = (h + 8) + 'px';
        l.textContent = fmtZl(val);
        l.style.opacity = grow;
        b.style.background = i === 5 && p < .5 ? 'linear-gradient(#fb7185,#e11d48)' : 'linear-gradient(#f87171,#ef4444)';
      });
    });

    c.enter(tc, .8);
    c.enter(kc, 1.3); c.enter(zc, 1.45); c.enter(ch, 1.4);
    c.callout('Wykup auta zawyża koszty całego miesiąca.', 760, 944, 2.9, 7.6, { step: 'Problem' });
    tl.to(lease, { backgroundColor: '#fff1f2', duration: .4, ease: 'none' }, 3.0);

    const dp = c.pos(lease.querySelector('.dt'));
    const ly = c.pos(tc.querySelector('.lease')).y;
    const menu = c.add(`<div class="abs" style="left:${dp.x - 236}px;top:${ly + 54}px;width:260px;background:#fff;border-radius:12px;box-shadow:0 22px 50px rgba(15,23,42,.28),0 0 0 1px rgba(15,23,42,.06);padding:6px;z-index:30;color:#0f172a;font-size:15px">
      <div style="display:flex;align-items:center;gap:10px;height:42px;padding:0 12px;border-radius:8px">${ic('file', 17, '#64748b')}Podgląd faktury</div>
      <div class="mi" style="display:flex;align-items:center;gap:10px;height:42px;padding:0 12px;border-radius:8px">${ic('eyeoff', 17, '#64748b')}Ukryj ze statystyk</div>
      <div style="display:flex;align-items:center;gap:10px;height:42px;padding:0 12px;border-radius:8px;color:#94a3b8">${ic('check', 17, '#94a3b8')}Oznacz jako opłaconą</div></div>`, ui);
    const cur = c.cursor(1500, 900, 6.6, ui);
    cur.move(6.8, dp.cx, ly + 32, 1.0);
    cur.click(7.9, dp.cx, ly + 32);
    tl.to(lease.querySelector('.dt'), { backgroundColor: '#f1f5f9', duration: .2, ease: 'none' }, 7.9);
    tl.fromTo(menu, { opacity: 0, y: -8, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .35, ease: 'power2.out' }, 7.95);
    cur.move(8.3, dp.x - 120, ly + 54 + 6 + 63, .5);
    tl.to(menu.querySelector('.mi'), { backgroundColor: '#f1f5f9', duration: .15, ease: 'none' }, 8.75);
    cur.click(9.0, dp.x - 120, ly + 54 + 6 + 63);
    tl.to(menu, { opacity: 0, y: -6, duration: .25, ease: 'power2.in' }, 9.1);
    tl.to(lease, { backgroundColor: '#f8fafc', duration: .5, ease: 'none' }, 9.2);
    tl.to([...lease.children].filter(e => !e.classList.contains('hid')), { opacity: .42, duration: .5, ease: 'none' }, 9.2);
    tl.to(lease.querySelector('.hid'), { opacity: 1, duration: .4, ease: 'none' }, 9.3);
    c.count(kc.querySelector('.v'), 9.3, 1.4, 75723, 25723, fmtZl, 'expo.inOut');
    c.count(zc.querySelector('.v'), 9.3, 1.4, -7219, 42781, n => (n < 0 ? '−' : '') + fmtZl(Math.abs(n)), 'expo.inOut');
    tl.to(zc.querySelector('.v'), { color: '#0f172a', duration: .5, ease: 'none' }, 9.7);
    cur.move(9.8, 1500, 980, 1).hide(10.6);
    c.callout('Faktura zostaje, wyniki wracają do normy.', 760, 944, 10.8, 17.3, { step: 'Ukryj ze statystyk' });
    c.drift(ui, 1, 1.03, 0, 18);
    tl.set(ui, { transformOrigin: '1300px 520px' }, 0);
  },
});

// ── 2.3 DOKUMENTY SPOZA KSeF ─────────────────────────────────────────────────
scene({
  id: 'reczne', title: 'Dokumenty spoza KSeF', dur: 19.5,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Finanse', num: '02', lines: ['Dokumenty', 'spoza KSeF'], sub: 'Paragony, rachunki i faktury spoza KSeF dodasz ręcznie. <b>Wszystkie koszty w jednym miejscu.</b>', y: 300, w: 600 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const lc = c.add(`<div class="card float abs" style="left:760px;top:150px;width:1080px;height:640px;overflow:hidden">
      <div style="padding:22px 24px 16px;display:flex;justify-content:space-between;align-items:center"><div class="h3" style="font-size:20px">Dokumenty kosztowe</div><div class="btn p add">${ic('plus', 17)}Dodaj dokument kosztowy</div></div>
      <div class="tbl">${costHead}<div class="rows">
        ${costRow('09.10.2026', 'Koch-Chemie Polska Sp. z o.o.', 'FV/2026/10/0412', 233700, 190000, true)}
        ${costRow('09.10.2026', 'Orlen S.A.', 'FV/O/26/1009/3311', 41820, 34000, true)}
        ${costRow('08.10.2026', 'PGE Obrót S.A.', 'P/26/10/0081124', 68880, 56000, false)}
        ${costRow('05.10.2026', 'Nieruchomości Bałtyk Sp. z o.o.', 'FV 10/2026', 553500, 450000, true)}
        ${costRow('03.10.2026', 'Allegro Sp. z o.o.', 'FV/2026/10/88214', 36900, 30000, true)}</div></div>
      <div class="scr abs" style="inset:0;background:rgba(15,23,42,.42);opacity:0"></div></div>`, ui);
    const rows = lc.querySelector('.rows');
    const newRow = c.add(costRow('09.10.2026', 'Sklep Detailingowy Pro', 'Paragon, mikrofibry i pady polerskie', 123000, 100000, true, 'Ręcznie'));
    rows.insertBefore(newRow, rows.firstChild);
    tl.set(newRow, { height: 0, opacity: 0, overflow: 'hidden' }, 0);

    const field = (label, inner, opt = false, w = '100%') => `<div style="width:${w}"><div class="fl">${label}${opt ? ' <span style="font-weight:500;color:#94a3b8;font-size:12px;margin-left:4px">opcjonalne</span>' : ''}</div>${inner}</div>`;
    const md = c.add(`<div class="modal abs" style="left:900px;top:96px;width:800px;height:850px;z-index:40">
      <div class="mh"><h2>Dodaj dokument kosztowy</h2><p>Faktura spoza KSeF, paragon, rachunek albo inny koszt</p></div>
      <div style="padding:20px 28px;display:flex;flex-direction:column;gap:18px">
        <div style="display:flex;gap:10px;align-items:center;padding:12px 14px;border-radius:12px;background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;font-size:14.5px">${ic('file', 18, '#0284c7')}Faktury z KSeF pobierają się same – tu dodajesz resztę kosztów.</div>
        ${field('Rodzaj dokumentu', `<div class="seg kind"><div class="on k0">Faktura</div><div class="k1">Paragon</div><div>Rachunek</div><div>Inny dokument</div></div>`)}
        ${field('Czego dotyczy', `<div class="inp f1"><span class="tx"></span></div>`)}
        <div style="display:flex;gap:16px">${field('Data dokumentu', '<div class="inp">09.10.2026</div>', false, '50%')}${field('Nazwa sprzedawcy', '<div class="inp f2"><span class="tx"></span></div>', true, '50%')}</div>
        ${field('Stawka VAT', `<div class="seg"><div class="on">23%</div><div>8%</div><div>5%</div><div>0%</div><div>zw.</div></div>`)}
        <div style="display:flex;gap:16px">${field('Kwota brutto', '<div class="inp f3"><span class="tx num"></span><span style="margin-left:auto;color:#94a3b8">zł</span></div>', false, '50%')}
          ${field('Kwota netto', '<div class="inp f4" style="background:#f8fafc"><span class="tx num" style="color:#475569"></span><span style="margin-left:auto;color:#94a3b8">zł</span></div>', false, '50%')}</div>
      </div>
      <div class="mf"><div class="btn">Anuluj</div><div class="btn p save">Zapisz dokument</div></div></div>`, ui);

    c.enter(lc, .8);
    const cur = c.cursor(1400, 950, 1.6, ui);
    const ab = c.pos(lc.querySelector('.add'));
    cur.move(1.8, ab.cx, ab.cy, 1.0);
    cur.click(2.9, ab.cx, ab.cy);
    tl.to(lc.querySelector('.scr'), { opacity: 1, duration: .4, ease: 'none' }, 3.0);
    tl.to(lc, { scale: .97, duration: .8, ease: 'power2.out' }, 3.0);
    tl.fromTo(md, { opacity: 0, y: 50, scale: .95 }, { opacity: 1, y: 0, scale: 1, duration: .9 }, 3.0);

    const k1 = c.pos(md.querySelector('.k1'));
    cur.move(3.6, k1.cx, k1.cy, .7);
    cur.click(4.4, k1.cx, k1.cy);
    tl.to(md.querySelector('.k0'), { backgroundColor: 'rgba(255,255,255,0)', boxShadow: 'none', color: '#64748b', duration: .2, ease: 'none' }, 4.4);
    tl.to(md.querySelector('.k1'), { backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(15,23,42,.12)', color: '#0f172a', duration: .2, ease: 'none' }, 4.4);
    const f = s => md.querySelector(s);
    tl.set(f('.f1'), { className: 'inp f1 focus' }, 4.7);
    c.type(f('.f1 .tx'), 4.8, 'Mikrofibry i pady polerskie', 26);
    tl.set(f('.f1'), { className: 'inp f1' }, 5.95);
    tl.set(f('.f2'), { className: 'inp f2 focus' }, 6.0);
    c.type(f('.f2 .tx'), 6.05, 'Sklep Detailingowy Pro', 26);
    tl.set(f('.f2'), { className: 'inp f2' }, 7.0);
    tl.set(f('.f3'), { className: 'inp f3 focus' }, 7.05);
    c.type(f('.f3 .tx'), 7.1, '1 230,00', 12);
    // netto pojawia się dopiero, gdy brutto jest kompletne: 123000 gr / 1,23 = 100000 gr
    tl.set(f('.f4 .tx'), { textContent: '1 000,00' }, 7.85);
    tl.fromTo(f('.f4'), { backgroundColor: '#ecfdf5' }, { backgroundColor: '#f8fafc', duration: 1.4, ease: 'power1.in', immediateRender: false }, 7.85);
    tl.set(f('.f3'), { className: 'inp f3' }, 8.0);
    cur.move(7.4, 1400, 830, .8);
    c.callout('Wpisujesz brutto, netto liczy się samo.', 900, 962, 7.9, 12.6, { step: 'Kwota' });

    const sv = c.pos(md.querySelector('.save'));
    cur.move(11.0, sv.cx, sv.cy, .8);
    cur.click(12.0, sv.cx, sv.cy);
    tl.to(md, { opacity: 0, y: 30, scale: .96, duration: .45, ease: 'power2.in' }, 12.1);
    tl.to(lc.querySelector('.scr'), { opacity: 0, duration: .4, ease: 'none' }, 12.3);
    tl.to(lc, { scale: 1, duration: .8, ease: 'power2.out' }, 12.3);
    tl.to(newRow, { height: 62, opacity: 1, duration: .8, ease: 'expo.out' }, 12.6);
    tl.fromTo(newRow, { backgroundColor: '#dbeafe' }, { backgroundColor: '#ffffff', duration: 2.6, ease: 'power1.in', immediateRender: false }, 12.9);
    cur.move(12.6, 1600, 1000, 1).hide(13.4);
    c.callout('Paragon stoi na liście obok faktur z KSeF.', 760, 812, 13.0, 18.7, { step: 'Dokumenty kosztowe' });
    c.drift(ui, 1, 1.025, 0, 19.5);
    tl.set(ui, { transformOrigin: '1300px 540px' }, 0);
  },
});

// ── 2.4 STAN KASY ────────────────────────────────────────────────────────────
scene({
  id: 'kasa', title: 'Stan kasy', dur: 17.6,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Finanse', num: '02', lines: ['Stan kasy'], sub: 'Saldo gotówki zawsze aktualne. <b>Każda wpłata i wypłata zostaje w historii.</b>', y: 360, w: 600 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const sc = c.add(`<div class="card float abs" style="left:770px;top:160px;width:480px;height:300px;border-top:4px solid #16a34a;background:linear-gradient(180deg,#f0fdf4,#fff 80%);padding:28px 30px">
      <div style="display:flex;align-items:center;gap:12px"><span style="width:44px;height:44px;border-radius:12px;background:#dcfce7;display:grid;place-items:center">${ic('cash', 24, '#15803d')}</span><span style="font-size:20px;font-weight:700">Saldo kasy</span></div>
      <div class="num bal" style="font-size:66px;font-weight:800;letter-spacing:-0.04em;margin-top:30px;color:#0f172a">0,00 zł</div>
      <div style="font-size:14px;color:#64748b;margin-top:8px">Ostatnia aktualizacja: <span class="upd">dziś, 12:05</span></div></div>`, ui);
    const kc = c.add(`<div class="card float abs" style="left:770px;top:490px;width:480px;height:340px;padding:24px 28px">
      <div style="font-size:18px;font-weight:700">Korekta ręczna</div>
      <div class="fl" style="margin-top:18px">Kwota (PLN)</div><div class="inp a"><span class="tx num"></span></div>
      <div class="fl" style="margin-top:14px">Komentarz</div><div class="inp b"><span class="tx" style="color:#0f172a"></span><span class="ph" style="color:#94a3b8">Opis operacji (wymagany)</span></div>
      <div style="display:flex;gap:12px;margin-top:20px"><div class="btn okl" style="flex:1">${ic('plus', 16)}Wpłata</div><div class="btn wyp" style="flex:1;background:#fef2f2;border-color:#fca5a5;color:#b91c1c">${ic('minus', 16)}Wypłata</div></div></div>`, ui);
    const G = 'grid-template-columns:118px 1fr 136px 136px';
    const hr = (d, typ, kw, saldo, plus) => `<div class="tr" style="${G};height:64px;font-size:14.5px"><span style="color:#475569">${d}</span>
      <span><b style="display:block;font-weight:650">${typ[0]}</b><span style="font-size:12.5px;color:#94a3b8">${typ[1]}</span></span>
      <span class="num" style="text-align:right;font-weight:700;color:${plus ? '#15803d' : '#b91c1c'}">${kw}</span><span class="num" style="text-align:right;color:#0f172a;font-weight:600">${saldo}</span></div>`;
    const hc = c.add(`<div class="card float abs" style="left:1276px;top:160px;width:566px;height:670px;overflow:hidden">
      <div style="padding:24px 24px 14px;font-size:18px;font-weight:700">Historia operacji</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:0 24px 18px">
        <div style="background:#f8fafc;border-radius:10px;padding:10px 12px"><div style="font-size:12px;color:#64748b">Łącznie wpłat</div><div class="num w1" style="font-weight:800;font-size:17px;color:#15803d">5 240,00 zł</div></div>
        <div style="background:#f8fafc;border-radius:10px;padding:10px 12px"><div style="font-size:12px;color:#64748b">Łącznie wypłat</div><div class="num w2" style="font-weight:800;font-size:17px;color:#b91c1c">370,00 zł</div></div>
        <div style="background:#f8fafc;border-radius:10px;padding:10px 12px"><div style="font-size:12px;color:#64748b">Zmiana w okresie</div><div class="num w3" style="font-weight:800;font-size:17px">4 870,00 zł</div></div></div>
      <div class="tbl"><div class="tr th" style="${G}"><span>Data</span><span>Typ operacji</span><span style="text-align:right">Kwota</span><span style="text-align:right">Saldo po</span></div><div class="rows">
        ${hr('09.10, 12:05', ['Wpłata', 'Wizyta: Audi A6, gotówka'], '+1 350,00 zł', '4 870,00 zł', 1)}
        ${hr('08.10, 17:40', ['Wypłata', 'Zakup kawy i wody dla klientów'], '−90,00 zł', '3 520,00 zł', 0)}
        ${hr('08.10, 15:10', ['Wpłata', 'Wizyta: Toyota RAV4, gotówka'], '+890,00 zł', '3 610,00 zł', 1)}
        ${hr('07.10, 09:00', ['Wpłata', 'Saldo otwarcia'], '+3 000,00 zł', '2 720,00 zł', 1)}</div></div></div>`, ui);
    const rows = hc.querySelector('.rows');
    const r1 = c.add(hr('09.10, 14:32', ['Wpłata', 'Wizyta: Porsche 911, gotówka'], '+2 490,00 zł', '7 360,00 zł', 1)); rows.insertBefore(r1, rows.firstChild);
    const r2 = c.add(hr('09.10, 14:40', ['Wypłata', 'Zakup mikrofibr'], '−180,00 zł', '7 180,00 zł', 0)); rows.insertBefore(r2, rows.firstChild);
    tl.set([r1, r2], { height: 0, opacity: 0, overflow: 'hidden' }, 0);

    c.enter(sc, .8); c.enter(kc, 1.0); c.enter(hc, 1.1);
    const bal = sc.querySelector('.bal');
    c.on(t => {
      let v = 4870 * prog(t, 1.3, 1.6);
      v += 2490 * prog(t, 3.6, 1.2, 'expo.out');
      v -= 180 * prog(t, 11.0, 1.0, 'expo.out');
      bal.textContent = fmtGr(Math.round(v * 100));
    });
    // płatność gotówką z wizyty wpada do kasy sama
    tl.to(r1, { height: 64, opacity: 1, duration: .8, ease: 'expo.out' }, 3.4);
    tl.fromTo(r1, { backgroundColor: '#dcfce7' }, { backgroundColor: '#ffffff', duration: 2.6, ease: 'power1.in', immediateRender: false }, 3.7);
    tl.set(sc.querySelector('.upd'), { textContent: 'dziś, 14:32' }, 3.6);
    tl.set(hc.querySelector('.w1'), { textContent: '7 730,00 zł' }, 3.6);
    tl.set(hc.querySelector('.w3'), { textContent: '7 360,00 zł' }, 3.6);
    c.pulse(sc, 3.7, '#16a34a');
    c.callout('Zapłata gotówką za wizytę sama trafia do kasy.', 770, 856, 4.0, 9.6, { step: 'Wpłata' });
    c.focus(r1, 4.3, 7.6, { parent: ui, pad: 2, r: 6 });

    const cur = c.cursor(1100, 1000, 7.4, ui);
    const ia = c.pos(kc.querySelector('.a')), ib = c.pos(kc.querySelector('.b')), bw = c.pos(kc.querySelector('.wyp'));
    cur.move(7.6, ia.x + 120, ia.cy, .8); cur.click(8.45, ia.x + 120, ia.cy);
    tl.set(kc.querySelector('.a'), { className: 'inp a focus' }, 8.5);
    c.type(kc.querySelector('.a .tx'), 8.55, '180,00', 12);
    tl.set(kc.querySelector('.a'), { className: 'inp a' }, 9.1);
    tl.set(kc.querySelector('.b'), { className: 'inp b focus' }, 9.15);
    tl.set(kc.querySelector('.b .ph'), { display: 'none' }, 9.2);
    c.type(kc.querySelector('.b .tx'), 9.2, 'Zakup mikrofibr', 22);
    tl.set(kc.querySelector('.b'), { className: 'inp b' }, 10.0);
    cur.move(9.4, bw.cx, bw.cy, 1.2); cur.click(10.85, bw.cx, bw.cy);
    tl.to(r2, { height: 64, opacity: 1, duration: .8, ease: 'expo.out' }, 11.0);
    tl.fromTo(r2, { backgroundColor: '#fee2e2' }, { backgroundColor: '#ffffff', duration: 2.6, ease: 'power1.in', immediateRender: false }, 11.3);
    tl.set(hc.querySelector('.w2'), { textContent: '550,00 zł' }, 11.0);
    tl.set(hc.querySelector('.w3'), { textContent: '7 180,00 zł' }, 11.0);
    tl.set(sc.querySelector('.upd'), { textContent: 'dziś, 14:40' }, 11.0);
    tl.set([kc.querySelector('.a .tx'), kc.querySelector('.b .tx')], { opacity: 0 }, 11.1);
    cur.move(11.4, 1150, 1000, 1).hide(12.2);
    c.callout('Każda operacja zostaje w historii kasy.', 770, 856, 11.2, 17.0, { step: 'Wypłata' });
    c.drift(ui, 1, 1.03, 0, 17.6);
    tl.set(ui, { transformOrigin: '1300px 500px' }, 0);
  },
});

// ── 2.5 FAKTURA PRZY WYDANIU → KSeF ──────────────────────────────────────────
scene({
  id: 'faktura', title: 'Faktura do KSeF', dur: 22,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Finanse', num: '02', lines: ['Wydajesz auto,', 'faktura idzie', 'do KSeF'], sub: 'Fakturę wystawiasz przy wydaniu pojazdu. <b>Wysyłka do KSeF dzieje się sama.</b>', y: 250, w: 620, size: 74 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const pill = (t, cls = '') => `<div class="pl ${cls}" style="height:44px;padding:0 18px;border-radius:12px;border:1.5px solid #e2e8f0;display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:600;color:#334155;background:#fff">${t}</div>`;
    const md = c.add(`<div class="modal abs" style="left:800px;top:100px;width:680px;height:880px">
      <div class="mh" style="display:flex;justify-content:space-between;align-items:flex-start"><div><h2>Wydanie pojazdu</h2><p>Porsche 911 Carrera 4S, GD 99999</p></div>
        <div style="display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:#64748b;margin-top:6px">
          <span style="display:inline-flex;align-items:center;gap:6px;color:#15803d"><span style="width:22px;height:22px;border-radius:50%;background:#dcfce7;display:grid;place-items:center">${ic('check', 13, '#15803d', 3)}</span>Podpis protokołu</span>
          <span style="width:22px;height:2px;background:#cbd5e1"></span>
          <span style="display:inline-flex;align-items:center;gap:6px;color:#0f172a"><span style="width:22px;height:22px;border-radius:50%;background:#0ea5e9;color:#fff;display:grid;place-items:center;font-size:12px">2</span>Rozliczenie</span></div></div>
      <div style="padding:22px 28px">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0">
          <div><div style="font-size:14px;color:#64748b;font-weight:600">Do zapłaty</div><div style="font-size:13px;color:#94a3b8;margin-top:4px">netto 2 024,39 zł, VAT 465,61 zł</div></div>
          <div class="num" style="font-size:36px;font-weight:800;letter-spacing:-0.03em">2 490,00 zł</div></div>
        <div class="fl" style="margin-top:22px">Forma zapłaty</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">${pill(ic('card', 17) + 'Karta', 'card')}${pill(ic('cash', 17) + 'Gotówka')}${pill('Przelew')}${pill('BLIK na numer')}</div>
        <div class="fl" style="margin-top:22px">Dokument</div>
        <div style="display:flex;gap:10px">${pill('Paragon')}${pill(ic('file', 17) + 'Faktura VAT', 'fv')}${pill('Inne rozliczenie')}</div>
        <div class="inv" style="height:0;overflow:hidden">
          <div style="margin-top:22px;display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-radius:12px;border:1px solid #e2e8f0">
            <div><div style="font-size:12.5px;color:#64748b">Nabywca</div><div style="font-size:16px;font-weight:650;margin-top:2px">Piotr Wiśniewski</div></div><span style="color:#0284c7;font-weight:600;font-size:14.5px">Zmień</span></div>
          <div style="margin-top:12px;display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:12px;background:#f0f9ff;border:1px solid #bae6fd">
            <div class="tg ks"><div class="f" style="opacity:1"></div><div class="k" style="left:23px"></div></div>
            <div><div style="font-size:15.5px;font-weight:650;color:#0f172a">Wyślij fakturę do KSeF</div><div style="font-size:13.5px;color:#0369a1;margin-top:2px">Wyślemy fakturę do KSeF automatycznie po wydaniu pojazdu.</div></div></div>
          <div style="margin-top:12px;display:grid;grid-template-columns:1fr auto;row-gap:6px;font-size:14.5px;color:#475569;padding:0 4px">
            <span>Kwota wizyty</span><b class="num" style="color:#0f172a">2 490,00 zł</b><span>Suma faktury</span><b class="num" style="color:#0f172a">2 490,00 zł</b>
            <span>Pozostaje do udokumentowania</span><b class="num" style="color:#15803d">0,00 zł</b></div></div>
      </div>
      <div class="mf"><div class="btn">Wstecz</div><div class="btn p go" style="height:50px;padding:0 28px;font-size:16.5px">${ic('car', 19)}Wydaj pojazd</div></div></div>`, ui);
    c.enter(md, .8);
    const cur = c.cursor(1300, 1000, 1.8, ui);
    const pk = c.pos(md.querySelector('.card')), pf = c.pos(md.querySelector('.fv'));
    const sel = (el, t) => tl.to(el, { borderColor: '#0ea5e9', backgroundColor: '#f0f9ff', color: '#0369a1', duration: .25, ease: 'none' }, t);
    cur.move(2.0, pk.cx, pk.cy, .9); cur.click(3.0, pk.cx, pk.cy); sel(md.querySelector('.card'), 3.0);
    cur.move(3.3, pf.cx, pf.cy, .8); cur.click(4.2, pf.cx, pf.cy); sel(md.querySelector('.fv'), 4.2);
    tl.to(md.querySelector('.inv'), { height: 316, duration: 1.0, ease: 'expo.inOut' }, 4.3);
    cur.move(4.6, 1440, 700, 1.0);
    c.callout('Faktura VAT od razu przy wydaniu auta.', 120, 790, 4.8, 9.9, { step: 'Rozliczenie' });
    c.focus(md.querySelector('.ks').parentNode, 5.6, 9.2, { parent: ui, pad: 4, r: 14 });
    c.pulse(md.querySelector('.ks'), 6.0, '#0ea5e9');
    const pg = c.pos(md.querySelector('.go'));
    cur.move(9.0, pg.cx, pg.cy, .9); cur.click(10.0, pg.cx, pg.cy);
    tl.to(md.querySelector('.go'), { scale: .96, duration: .1 }, 9.95);
    tl.to(md.querySelector('.go'), { scale: 1, duration: .25 }, 10.05);
    cur.hide(10.3);
    tl.to(md, { opacity: 0, scale: .9, y: 40, filter: 'blur(8px)', duration: .6, ease: 'power2.in' }, 10.3);

    // dokument leci do KSeF
    const inv = c.add(`<div class="abs" style="left:820px;top:210px;width:430px;height:540px;background:#fff;border-radius:22px;color:#0f172a;padding:34px 36px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.1),0 60px 120px rgba(0,0,0,.6)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-size:13px;color:#64748b;font-weight:600">Faktura VAT</div><div style="font-size:28px;font-weight:800;letter-spacing:-0.03em;margin-top:4px">FV/2026/0142</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px">Data wystawienia: 09.10.2026</div></div><div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;font-weight:800;display:grid;place-items:center">SP</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:26px;font-size:13.5px;line-height:1.5;color:#334155">
        <div><div style="font-size:12px;color:#64748b;font-weight:600">Sprzedawca</div><b>Studio Połysk</b><br>NIP 584-273-91-45</div>
        <div><div style="font-size:12px;color:#64748b;font-weight:600">Nabywca</div><b>Piotr Wiśniewski</b><br>Konsument</div></div>
      <div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:13.5px">
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9"><span>Powłoka ceramiczna IGL Eclipse</span><b class="num">2 490,00 zł</b></div></div>
      <div style="margin-top:16px;display:grid;grid-template-columns:1fr auto;row-gap:6px;font-size:14px;color:#475569"><span>Netto</span><span class="num">2 024,39 zł</span><span>VAT 23%</span><span class="num">465,61 zł</span></div>
      <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:baseline"><span style="font-weight:700">Razem brutto</span><span class="num" style="font-size:30px;font-weight:800;letter-spacing:-0.03em">2 490,00 zł</span></div>
      <div class="stt abs" style="left:36px;bottom:30px;display:flex;gap:8px;align-items:center">
        <span class="bdg s1" style="background:#f0f9ff;color:#0369a1">${ic('refresh', 13)}Wysyłanie…</span><span class="bdg s2" style="background:#f0fdf4;color:#15803d;border-color:#86efac;position:absolute;left:0;opacity:0">${ic('check', 13, '#15803d', 3)}W KSeF</span></div>
      <div class="scan abs" style="left:0;right:0;height:120px;top:-120px;background:linear-gradient(to bottom, transparent, rgba(14,165,233,.22) 80%, rgba(56,189,248,.9) 98%, transparent);mix-blend-mode:multiply"></div></div>`, ui);
    tl.fromTo(inv, { opacity: 0, scale: .8, rotateY: -20, y: 40 }, { opacity: 1, scale: 1, rotateY: 0, y: 0, duration: 1.3 }, 10.6);
    tl.fromTo(inv.querySelector('.scan'), { top: -120 }, { top: 640, duration: 1.4, ease: 'power1.inOut' }, 11.4);

    // węzeł KSeF: grafit i złoty pierścień — złoto znaczy tu „przyjęte”, nic więcej
    const node = c.add(`<div class="abs" style="left:1450px;top:300px;width:360px;height:360px">
      <div class="orb abs" style="inset:0;border-radius:50%;border:1px dashed rgba(220,174,92,.38)"></div>
      <div class="abs" style="inset:30px;border-radius:50%;border:1px solid rgba(255,255,255,.08)"></div>
      <div class="core abs" style="left:66px;top:66px;width:228px;height:228px;border-radius:50%;background:radial-gradient(circle at 38% 30%,#1d1d22,#0b0b0d 72%);
        border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 80px -20px #000;display:grid;place-items:center;text-align:center">
        <div><div class="kk silver" style="font-size:66px;font-weight:620;letter-spacing:-0.05em;line-height:1">KSeF</div>
        <div class="mono" style="font-size:11.5px;letter-spacing:.16em;color:#a1a1aa;margin-top:12px">KRAJOWY SYSTEM<br>E-FAKTUR</div></div></div></div>`, ui);
    tl.fromTo(node, { opacity: 0, scale: .85 }, { opacity: 1, scale: 1, duration: 1.4 }, 11.0);
    tl.to(node.querySelector('.orb'), { rotate: 120, duration: 11, ease: 'none' }, 11.0);
    const beam = c.add(`<svg class="abs" width="1920" height="1080" style="left:0;top:0;overflow:visible"><path d="M1252 470 C 1310 380, 1390 410, 1500 470" stroke="rgba(220,174,92,.45)" stroke-width="1.5" fill="none" stroke-dasharray="4 8"/></svg>`, ui);
    tl.fromTo(beam, { opacity: 0 }, { opacity: 1, duration: .6, ease: 'none' }, 11.6);
    const bp = beam.querySelector('path'); const BL = bp.getTotalLength();
    const pk2 = Array.from({ length: 7 }, () => c.add('<div class="abs" style="left:0;top:0;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#f6efd2;box-shadow:0 0 14px rgba(236,208,143,.9),0 0 30px rgba(220,174,92,.6);opacity:0"></div>', ui));
    c.on(t => pk2.forEach((p, i) => {
      const u = (t - 11.8 - i * .22) / .9;
      if (u < 0 || u > 1 || t > 13.6) { p.style.opacity = 0; return; }
      const pt = bp.getPointAtLength(u * BL);
      p.style.opacity = Math.sin(u * Math.PI);
      p.style.transform = `translate(${pt.x}px, ${pt.y}px)`;
    }));
    tl.to(node.querySelector('.core'), { borderColor: 'rgba(236,208,143,.9)', boxShadow: '0 30px 80px -20px #000, 0 0 70px -6px rgba(220,174,92,.55)', duration: .7, ease: 'power2.out' }, 13.5);
    tl.set(node.querySelector('.kk'), { className: 'kk goldt' }, 13.5);
    tl.to(node.querySelector('.orb'), { borderColor: 'rgba(236,208,143,.8)', duration: .6, ease: 'none' }, 13.5);
    tl.to(inv.querySelector('.s1'), { opacity: 0, duration: .2, ease: 'none' }, 13.5);
    tl.to(inv.querySelector('.s2'), { opacity: 1, duration: .3, ease: 'none' }, 13.55);
    tl.to(beam, { opacity: 0, duration: .5, ease: 'none' }, 13.6);
    c.focus(inv.querySelector('.s2'), 13.9, 17.5, { parent: ui, pad: 6, r: 999 });

    const ok = c.add(`<div class="cap" style="left:820px;top:800px;max-width:none"><div class="k"><span>Przyjęta w KSeF</span><i></i></div>
      <div class="x mono" style="font-size:22px;letter-spacing:.02em">5842739145-20261009-3F8A21C4B7E0-6D</div></div>`, ui);
    tl.fromTo(ok, { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .6 }, 14.0);
    c.read('Przyjęta w KSeF numer', 14.5, 21.3);
    c.drift(ui, 1, 1.025, 0, 22);
    tl.set(ui, { transformOrigin: '1300px 540px' }, 0);
  },
});
