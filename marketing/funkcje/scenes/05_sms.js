// ROZDZIAŁ 4: KAMPANIE SMS — wiadomości automatyczne i kampanie automatyczne, a potem
// to samo z perspektywy telefonu klienta.
//
// Treści: „Podziękowanie po wizycie” i „Przypomnienie po przerwie” to szablony startowe
// z message-templates/starters.ts. Gotowej automatyzacji „prośba o opinię” w CRM nie ma —
// to kampania automatyczna („Wyślij po N dniach” po usłudze) z własną treścią studia,
// i tak jest tu pokazana. „180 dni po usłudze Powłoka ceramiczna” to opis z widoku kampanii.

chapter({
  id: 'r4', num: '04', name: 'Kampanie SMS',
  slogan: ['Cyfrowa obsługa klienta,', 'bez papierologii.'],
  items: ['Wiadomości automatyczne', 'Kampanie automatyczne', 'Telefon klienta'],
});

// ── 4.1 AUTOMATY ─────────────────────────────────────────────────────────────
scene({
  id: 'sms-auto', title: 'Wiadomości automatyczne', dur: 19,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Kampanie SMS', num: '04', lines: ['Kampanie SMS', 'pracują same'], sub: 'Podziękowanie po wizycie, prośba o opinię i <b>przypomnienie o serwisie powłoki.</b>', y: 320, w: 600, size: 76 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const G = 'grid-template-columns:1fr 250px 280px';
    const chan = (on, k = '') => `<span style="display:flex;align-items:center;gap:10px" ${k ? `data-k="${k}"` : ''}>
      <span class="tg"><span class="f" style="opacity:${on ? 1 : 0}"></span><span class="k" style="left:${on ? 23 : 3}px"></span></span>
      <span style="display:flex;flex-direction:column"><b style="font-size:14px">SMS</b><span class="cs" style="font-size:12px;color:${on ? '#15803d' : '#94a3b8'}">${on ? 'włączona: wychodzi do klienta' : 'wyłączona'}</span></span></span>`;
    const stage = (n, s) => `<div style="display:flex;gap:10px;align-items:baseline;padding:12px 24px 6px;background:#f8fafc;border-top:1px solid #eef2f7"><b style="font-size:14px">${n}</b><span style="font-size:13px;color:#64748b">${s}</span></div>`;
    const row = (n, ch, when) => `<div class="tr" style="${G};height:60px"><span style="font-weight:650">${n}</span>${ch}<span style="color:#475569;font-size:14.5px">${when}</span></div>`;
    const c1 = c.add(`<div class="card float abs" style="left:780px;top:96px;width:1060px;height:430px;overflow:hidden">
      <div style="padding:20px 24px 14px;display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font-size:20px;font-weight:700">Wiadomości automatyczne</div>
        <div style="font-size:14px;color:#64748b;margin-top:2px">Potwierdzenia, przypomnienia, gotowość do odbioru</div></div><div style="font-size:14px;color:#64748b">aktywne: <b class="cnt num" style="color:#0f172a">7</b> z 12</div></div>
      <div class="tbl"><div class="tr th" style="${G}"><span>Wiadomość</span><span>Kanał</span><span>Kiedy wychodzi</span></div>
        ${stage('Odbiór', 'Auto gotowe')}${row('Pojazd gotowy do odbioru', chan(1), 'Po oznaczeniu gotowości')}
        ${stage('Po wizycie', 'Klient już odjechał')}${row('Podziękowanie po wizycie', chan(0, 'a'), '30 minut po odbiorze pojazdu')}${row('Przypomnienie po przerwie', chan(0, 'b'), '90 dni po odbiorze pojazdu')}</div></div>`, ui);
    const C = 'grid-template-columns:1fr 70px 110px 110px 290px';
    const dot = (col, t) => `<span style="display:inline-flex;align-items:center;gap:7px;font-size:14px"><i style="width:8px;height:8px;border-radius:50%;background:${col}"></i>${t}</span>`;
    const c2 = c.add(`<div class="card float abs" style="left:780px;top:552px;width:1060px;height:356px;overflow:hidden">
      <div style="padding:20px 24px 14px;display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font-size:20px;font-weight:700">Kampanie</div>
        <div style="font-size:14px;color:#64748b;margin-top:2px">Wysyłki SMS i e-mail do Twoich klientów</div></div><div style="font-size:14px;color:#64748b">1 240 kredytów SMS</div></div>
      <div class="tbl"><div class="tr th" style="${C}"><span>Kampania</span><span>Kanał</span><span>Status</span><span>Odbiorcy</span><span>Termin</span></div>
        <div class="tr" style="${C}"><span style="font-weight:650">Prośba o opinię</span><span>SMS</span>${dot('#15803d', 'Działa')}<span class="num">212 / 214</span><span style="font-size:14px;color:#475569">3 dni po usłudze</span></div>
        <div class="tr pw" style="${C}"><span style="font-weight:650">Serwis powłoki ceramicznej</span><span>SMS</span>${dot('#15803d', 'Działa')}<span class="num">47 / 50</span><span style="font-size:14px;color:#475569">180 dni po usłudze</span></div>
        <div class="ex" style="height:0;overflow:hidden;background:#f8fafc;font-size:14.5px;color:#334155;padding:0 24px"><div style="padding:14px 0;line-height:1.5"><span style="color:#64748b">Kiedy wychodzi:</span> <b>180 dni</b> po usłudze <b>Powłoka ceramiczna</b>, o 10:00, z pominięciem klientów, którzy byli w międzyczasie.</div></div>
        <div class="tr" style="${C}"><span style="font-weight:650">Jesień: pranie tapicerki</span><span>SMS</span>${dot('#15803d', 'Wysłana')}<span class="num">380 / 392</span><span style="font-size:14px;color:#475569">15.09.2026</span></div></div></div>`, ui);

    c.enter(c1, .8); c.enter(c2, 1.05);
    const cur = c.cursor(1300, 1000, 2.0, ui);
    let n = 7;
    ['a', 'b'].forEach((k, i) => {
      const el = c1.querySelector(`[data-k="${k}"]`), tg = el.querySelector('.tg'), p = c.pos(tg);
      const t = 3.2 + i * 1.3;
      cur.move(t - .9, p.cx, p.cy, .8); cur.click(t, p.cx, p.cy);
      tl.to(tg.querySelector('.f'), { opacity: 1, duration: .2, ease: 'none' }, t);
      tl.to(tg.querySelector('.k'), { left: 23, duration: .25, ease: 'power2.out' }, t);
      tl.set(el.querySelector('.cs'), { textContent: 'włączona: wychodzi do klienta', color: '#15803d' }, t + .1);
      n++; tl.set(c1.querySelector('.cnt'), { textContent: String(n) }, t + .1);
    });
    c.callout('Wiadomość wychodzi sama, we właściwym momencie.', 780, 930, 3.4, 9.2, { step: 'Automaty' });

    const pw = c2.querySelector('.pw'), pp = c.pos(pw);
    cur.move(8.6, pp.x + 200, pp.cy, 1.0); cur.click(9.8, pp.x + 200, pp.cy);
    tl.to(pw, { backgroundColor: '#f0f9ff', duration: .3, ease: 'none' }, 9.8);
    tl.to(c2.querySelector('.ex'), { height: 78, duration: .8, ease: 'expo.inOut' }, 9.9);
    tl.to(c2, { height: 420, top: 500, duration: .8, ease: 'expo.inOut' }, 9.9);
    tl.to(c1, { y: -50, duration: .8, ease: 'expo.inOut' }, 9.9);
    cur.move(10.4, 1500, 1040, 1).hide(11.2);
    c.callout('Pomija klientów, którzy wrócili w międzyczasie.', 780, 940, 10.6, 18.4, { step: 'Kampania automatyczna' });
    c.drift(ui, 1, 1.02, 0, 19);
    tl.set(ui, { transformOrigin: '1300px 500px' }, 0);
  },
});

// ── 4.2 TELEFON KLIENTA ──────────────────────────────────────────────────────
scene({
  id: 'sms-tel', title: 'Telefon klienta', dur: 21,
  build(c) {
    const { tl } = c;
    c.bg({ stage: [1490, 520, 900, 900] });
    c.title({ eyebrow: 'Kampanie SMS', num: '04', lines: ['Klient', 'o Tobie pamięta'], sub: 'Każda wiadomość wychodzi we właściwym momencie, <b>podpisana nazwą Twojego studia.</b>', y: 300, w: 600, size: 76 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const ph = c.add(`<div class="phone" style="left:1290px;top:110px"><div class="ps" style="background:#fff">
      <div class="island"></div><div class="sb"><span>16:30</span><span>5G</span></div>
      <div class="abs" style="left:0;right:0;top:54px;height:96px;border-bottom:1px solid #e5e7eb;background:#f9fafb;text-align:center;padding-top:8px">
        <div style="width:46px;height:46px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#9ca3af,#6b7280);color:#fff;display:grid;place-items:center;font-weight:700;font-size:16px">SP</div>
        <div style="font-size:13px;margin-top:4px;color:#111">Studio Połysk</div></div>
      <div class="msgs abs" style="left:14px;right:14px;top:166px"></div></div></div>`, ui);
    const msgs = ph.querySelector('.msgs');
    const M = [
      ['Pt., 9 października 16:30', 'Dziękujemy za wizytę, Piotr! Mamy nadzieję, że efekt się podoba.', '30 min po odbiorze', 'Podziękowanie po wizycie'],
      ['Pn., 12 października 10:00', 'Piotr, jak sprawuje się powłoka? Będziemy wdzięczni za opinię: g.page/studio-polysk', '3 dni później', 'Prośba o opinię'],
      ['Śr., 7 kwietnia 2027 10:00', 'Dzień dobry, Piotr. Czas na odświeżenie powłoki? Chętnie zaproponujemy termin.', '180 dni później', 'Serwis powłoki'],
    ];
    const bubbles = M.map(([d, t]) => c.add(`<div class="bb" style="margin-bottom:14px">
      <div style="text-align:center;font-size:12px;color:#8e8e93;margin:6px 0 8px">${d}</div>
      <div style="max-width:300px;padding:12px 15px;border-radius:20px;background:#e9e9eb;color:#111;font-size:17px;line-height:1.32;letter-spacing:-0.01em">${t}</div></div>`, msgs));
    // znaczniki czasu po lewej: Geist Mono w złocie mówi KIEDY, zdanie mówi CO
    const marks = M.map(([, , w, n], i) => c.add(`<div class="abs" style="left:790px;width:440px;top:${300 + i * 132}px">
      <div style="position:relative;padding-top:16px;display:grid;grid-template-columns:44px 1fr">
        <span style="position:absolute;left:0;right:0;top:0;height:1px;background:rgba(255,255,255,.16)"></span>
        <span class="gl" style="position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,#ecd08f,#b8873a);transform-origin:0 50%;transform:scaleX(0)"></span>
        <span class="mono" style="font-size:14px;color:#ecd08f;padding-top:4px">${String(i + 1).padStart(2, '0')}.</span>
        <span><span class="mono" style="display:block;font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:#ecd08f">${w}</span>
        <span style="display:block;font-size:28px;font-weight:560;letter-spacing:-0.025em;color:#f4f4f2;margin-top:6px">${n}</span></span></div></div>`));

    c.enter(ph, .8);
    const T = [2.2, 7.0, 11.8];
    bubbles.forEach((b, i) => {
      tl.fromTo(b, { opacity: 0, y: 24, scale: .96, transformOrigin: '0% 100%' }, { opacity: 1, y: 0, scale: 1, duration: .7, ease: 'back.out(1.4)' }, T[i]);
      tl.fromTo(marks[i], { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: .9 }, T[i] - .2);
      tl.to(marks[i].querySelector('.gl'), { scaleX: 1, duration: .9, ease: 'expo.inOut' }, T[i]);
      // drgnięcie telefonu przy nowej wiadomości
      tl.to(ph, { x: -3, duration: .04, yoyo: true, repeat: 5, ease: 'none' }, T[i]);
      c.read(M[i][1], T[i] + .7, 20.4);
      c.read(M[i][2] + ' ' + M[i][3], T[i] + .7, 20.4);
    });
    c.drift(ui, 1, 1.02, 0, 21);
    tl.set(ui, { transformOrigin: '1500px 500px' }, 0);
  },
});
