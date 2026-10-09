// ROZDZIAŁ 5: POCZTA — stopki, zapytania (leady), filtr wiadomości i oferta pisana z asystentem.
// Etykiety z modułu comms: SignatureSettingsModal, inbox (CaseList, MailList), LeadDetailModal,
// SuggestedServiceRows, ReplyDraftButton. Leady i Poczta są w aplikacji jedną skrzynką
// „Zapytania” (zakładki „Sprawy”, „Poczta”, „Wysłane”).
//
// Interfejs CRM nie używa słowa „AI” poza przyciskiem „Napisz z AI” — w kadrze aplikacji
// pokazujemy wyłącznie jej etykiety, a hasła marketingowe stoją w warstwie filmu.

chapter({
  id: 'r5', num: '05', name: 'Poczta',
  slogan: ['Twój biznes uporządkowany', 'w jednym miejscu.'],
  items: ['Szablony stopek', 'Zapytania i leady', 'Filtr AI', 'Oferta z AI'],
});

// FooterPrimary: jedyny wypełniony element w oknie
const footerPrimary = (t1, t2, cls = '') => `<div class="fp ${cls}"><span class="ic">${ic('send', 20, '#fff')}</span><span><div class="t1">${t1}</div><div class="t2">${t2}</div></span>
  <span style="margin-left:14px;opacity:.8">${ic('arrow', 18, '#fff')}</span></div>`;

// ── 5.1 SZABLONY STOPEK ──────────────────────────────────────────────────────
scene({
  id: 'stopka', title: 'Szablony stopek', dur: 18,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Poczta', num: '05', lines: ['Szablony', 'stopek'], sub: 'Wybierasz motyw, wpisujesz dane <b>i każdy mail wychodzi z firmową stopką.</b>', y: 330, w: 600 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const thumbs = [['Klasyczna', 0], ['Ze zdjęciem', 1], ['Firmowa z logo', 2], ['Baner z kołem', 3], ['Dwa pasma', 4]];
    const thumb = k => {
      const l = (w, o = .9) => `<i style="display:block;height:5px;width:${w}px;border-radius:3px;background:rgba(15,23,42,${o * .25});margin-top:5px"></i>`;
      if (k === 1) return `<div style="display:flex;gap:8px;align-items:center"><i style="width:28px;height:28px;border-radius:50%;background:#cbd5e1"></i><div>${l(60)}${l(44)}${l(52)}</div></div>`;
      if (k === 2) return `<div style="display:flex;gap:8px"><i style="width:4px;height:40px;border-radius:2px;background:#0ea5e9"></i><i style="width:26px;height:26px;border-radius:7px;background:#0ea5e9"></i><div>${l(56)}${l(40)}${l(60)}</div></div>`;
      if (k === 3) return `<div style="height:14px;border-radius:4px;background:#e2e8f0;margin-bottom:4px"></div><div style="display:flex;gap:6px"><i style="width:22px;height:22px;border-radius:50%;background:#cbd5e1;margin-top:-10px"></i><div>${l(50)}${l(40)}</div></div>`;
      if (k === 4) return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div>${l(40)}${l(30)}</div><div>${l(44)}${l(34)}</div></div>`;
      return `${l(60)}${l(44)}${l(70)}${l(50)}`;
    };
    const md = c.add(`<div class="modal abs" style="left:770px;top:96px;width:1070px;height:820px">
      <div class="mh" style="display:flex;justify-content:space-between;align-items:flex-start"><div><h2>Twoja stopka e-mail</h2><p>Przypisana do Ciebie, nie do skrzynki - inne osoby w studiu podpisują się własną.</p></div>
        <div class="seg"><div class="on">Motyw graficzny</div><div>Zwykły tekst</div></div></div>
      <div style="display:grid;grid-template-columns:440px 1fr;height:640px">
        <div style="padding:18px 24px;border-right:1px solid #f1f5f9;position:relative">
          <div style="display:flex;gap:18px;font-size:14.5px;font-weight:600;color:#64748b;border-bottom:1px solid #e2e8f0">${['Motyw', 'Dane', 'Styl', 'Zdjęcie i logo', 'Social'].map((t, i) =>
            `<div class="wt" data-k="${i}" style="padding:8px 0 10px;position:relative;${i === 0 ? 'color:#0ea5e9;box-shadow:inset 0 -2px 0 #0ea5e9' : ''}">${t}</div>`).join('')}</div>
          <div class="pane1 abs" style="left:24px;right:24px;top:70px;display:grid;grid-template-columns:1fr 1fr;gap:12px">${thumbs.map(([n, k]) =>
            `<div class="th" data-k="${k}" style="border:1.5px solid ${k === 0 ? '#0ea5e9' : '#e2e8f0'};border-radius:12px;padding:12px;background:#fff">
              <div style="height:52px;border-radius:8px;background:#f8fafc;padding:8px">${thumb(k)}</div><div style="font-size:14px;font-weight:650;margin-top:8px">${n}</div></div>`).join('')}</div>
          <div class="pane2 abs" style="left:24px;right:24px;top:70px;opacity:0">
            <div class="fl">Kolor przewodni</div><div style="display:flex;gap:10px">${['#0ea5e9', '#0f172a', '#b8873a', '#16a34a', '#be123c'].map((col, i) =>
              `<span class="sw" data-k="${i}" style="width:38px;height:38px;border-radius:10px;background:${col};box-shadow:${i === 0 ? '0 0 0 3px #fff,0 0 0 5px #0ea5e9' : 'none'}"></span>`).join('')}</div>
            <div class="fl" style="margin-top:20px">Rozmiar stopki</div><div class="seg"><div>Mniejsza</div><div class="on">Większa</div></div>
            <div class="fl" style="margin-top:20px">Czcionka</div><div class="inp">Inter</div>
            <div class="fl" style="margin-top:20px">Ikony social media</div><div class="seg"><div class="on">Jednokolorowe</div><div>Kolorowe koła</div><div>Kolorowe kwadraty</div></div></div>
        </div>
        <div style="padding:18px 26px;background:#f8fafc">
          <div class="lbl">Podgląd na żywo</div>
          <div style="margin-top:12px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:20px 22px;height:540px;position:relative">
            <div style="font-size:13px;color:#64748b">Do: <span style="color:#0f172a">tomasz.lewandowski@gmail.com</span></div>
            <div style="font-size:13px;color:#64748b;margin-top:3px">Temat: <span style="color:#0f172a">Wycena: korekta lakieru i powłoka</span></div>
            <div style="font-size:15px;line-height:1.55;color:#334155;margin-top:16px">Dzień dobry Panie Tomaszu,<br>w załączniku wycena dla BMW X5. Termin we wtorek 20.10 jest wolny.</div>
            <div style="margin-top:14px;border-top:1px solid #e2e8f0"></div>
            <div class="sg0 abs" style="left:22px;right:22px;top:200px;font-size:14.5px;line-height:1.55;color:#334155">
              <b style="color:#0f172a;font-size:16px">Anna Nowak</b><br>Opiekun klienta<br>Studio Połysk<br>+48 600 120 450<br>anna@studiopolysk.pl<br>www.studiopolysk.pl</div>
            <div class="sg2 abs" style="left:22px;right:22px;top:200px;opacity:0;display:flex;gap:18px">
              <span class="bar" style="width:4px;border-radius:2px;background:#0ea5e9"></span>
              <span class="lgo" style="width:64px;height:64px;border-radius:14px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff;font-weight:800;font-size:22px;display:grid;place-items:center;flex:none">SP</span>
              <div><div class="nm" style="font-size:19px;font-weight:750;color:#0ea5e9">Anna Nowak</div><div style="font-size:14px;color:#64748b">Opiekun klienta, Studio Połysk</div>
                <div style="display:grid;grid-template-columns:auto auto;gap:4px 20px;margin-top:10px;font-size:13.5px;color:#334155"><span>+48 600 120 450</span><span>anna@studiopolysk.pl</span><span>www.studiopolysk.pl</span><span>ul. Grunwaldzka 212, Gdańsk</span></div>
                <div style="display:flex;gap:8px;margin-top:12px">${['IG', 'FB', 'TT'].map(s => `<span class="so" style="width:26px;height:26px;border-radius:6px;border:1.5px solid #0ea5e9;color:#0ea5e9;font-size:10px;font-weight:800;display:grid;place-items:center">${s}</span>`).join('')}</div></div></div>
          </div></div></div>
      <div class="mf"><div class="btn">Anuluj</div><div class="btn p save">Zapisz stopkę</div></div></div>`, ui);

    c.enter(md, .8);
    const cur = c.cursor(1300, 1000, 2.0, ui);
    const t2 = md.querySelector('.th[data-k="2"]'), p2 = c.pos(t2);
    cur.move(2.2, p2.cx, p2.cy, 1.0); cur.click(3.4, p2.cx, p2.cy);
    tl.to(md.querySelector('.th[data-k="0"]'), { borderColor: '#e2e8f0', duration: .2, ease: 'none' }, 3.4);
    tl.to(t2, { borderColor: '#0ea5e9', backgroundColor: '#f0f9ff', duration: .2, ease: 'none' }, 3.4);
    tl.to(md.querySelector('.sg0'), { opacity: 0, y: -8, duration: .35, ease: 'power2.in' }, 3.45);
    tl.fromTo(md.querySelector('.sg2'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .6 }, 3.7);
    c.focus(md.querySelector('.sg2'), 4.2, 8.0, { parent: ui, pad: 14, r: 12 });
    c.callout('Podgląd na żywo pokazuje stopkę od razu.', 770, 940, 3.8, 9.2, { step: 'Motyw' });

    const st = md.querySelector('.wt[data-k="2"]'), ps = c.pos(st);
    cur.move(6.6, ps.cx, ps.cy, .9); cur.click(7.7, ps.cx, ps.cy);
    tl.to(md.querySelector('.wt[data-k="0"]'), { color: '#64748b', boxShadow: 'inset 0 -2px 0 rgba(14,165,233,0)', duration: .2, ease: 'none' }, 7.7);
    tl.to(st, { color: '#0ea5e9', boxShadow: 'inset 0 -2px 0 #0ea5e9', duration: .2, ease: 'none' }, 7.7);
    tl.to(md.querySelector('.pane1'), { opacity: 0, duration: .25, ease: 'none' }, 7.75);
    tl.to(md.querySelector('.pane2'), { opacity: 1, duration: .3, ease: 'none' }, 7.95);
    const sw = md.querySelector('.sw[data-k="2"]'), pw = c.pos(sw);
    cur.move(8.4, pw.cx, pw.cy, .8); cur.click(9.4, pw.cx, pw.cy);
    tl.to(md.querySelector('.sw[data-k="0"]'), { boxShadow: '0 0 0 3px #fff,0 0 0 5px rgba(14,165,233,0)', duration: .2, ease: 'none' }, 9.4);
    tl.to(sw, { boxShadow: '0 0 0 3px #fff,0 0 0 5px #b8873a', duration: .2, ease: 'none' }, 9.4);
    const sg = md.querySelector('.sg2');
    tl.to(sg.querySelector('.bar'), { backgroundColor: '#b8873a', duration: .4, ease: 'none' }, 9.5);
    tl.to(sg.querySelector('.lgo'), { background: 'linear-gradient(135deg,#d6a75a,#9a6b26)', duration: .4, ease: 'none' }, 9.5);
    tl.to(sg.querySelector('.nm'), { color: '#9a6b26', duration: .4, ease: 'none' }, 9.5);
    tl.to(sg.querySelectorAll('.so'), { borderColor: '#b8873a', color: '#9a6b26', duration: .4, ease: 'none' }, 9.5);

    const sv = c.pos(md.querySelector('.save'));
    cur.move(10.6, sv.cx, sv.cy, 1.0); cur.click(11.8, sv.cx, sv.cy);
    const toast = c.add(`<div class="abs" style="left:1200px;top:30px;display:flex;align-items:center;gap:12px;padding:12px 18px;border-radius:12px;background:#fff;color:#0f172a;font-family:InterV;box-shadow:0 20px 40px rgba(0,0,0,.4)">
      <span style="width:24px;height:24px;border-radius:50%;background:#dcfce7;display:grid;place-items:center">${ic('check', 13, '#15803d', 3)}</span>
      <span><b style="display:block;font-size:15px">Stopka zapisana</b><span style="font-size:13.5px;color:#64748b">Dołączysz ją przełącznikiem przy wysyłce</span></span></div>`, ui);
    tl.fromTo(toast, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: .5 }, 12.0);
    tl.to(toast, { opacity: 0, duration: .4 }, 16.6);
    cur.hide(12.8);
    c.callout('Stopka dołącza się jednym przełącznikiem.', 770, 940, 12.4, 17.4, { step: 'Zapisano' });
    c.drift(ui, 1, 1.02, 0, 18);
    tl.set(ui, { transformOrigin: '1300px 500px' }, 0);
  },
});

// ── 5.2 ZAPYTANIA I LEADY ────────────────────────────────────────────────────
scene({
  id: 'leady', title: 'Zapytania i leady', dur: 20,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Poczta', num: '05', lines: ['Zapytania', 'pod kontrolą'], sub: 'Każdy mail od klienta staje się sprawą. <b>Widzisz, kto czeka na odpowiedź.</b>', y: 330, w: 600 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const caseRow = (car, age, st, cls = '') => `<div class="cr ${cls}" style="padding:13px 16px;border-bottom:1px solid #f1f5f9;background:#fff;position:relative">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:15.5px">${car}</b><span style="font-size:12.5px;color:#94a3b8">${age}</span></div>
      <div style="font-size:13.5px;color:#64748b;margin-top:3px">${st}</div></div>`;
    const win = c.add(appWin({ x: 744, y: 96, w: 1110, h: 840, active: 'Zapytania', html: `
      <div class="ph" style="margin-bottom:16px"><div><h1>Zapytania</h1></div>
        <div class="seg"><div class="on">Sprawy <b class="cnt" style="color:#0e6fa0;margin-left:4px">2</b></div><div>Poczta <b style="margin-left:4px">12</b></div><div>Wysłane</div></div></div>
      <div style="display:grid;grid-template-columns:270px 1fr;gap:16px;height:700px">
        <div class="card" style="overflow:hidden">
          <div style="padding:14px 16px 8px;font-size:13px;font-weight:700;color:#0f172a">Czeka na nas <span class="cnt2" style="color:#0e6fa0">2</span></div>
          <div class="cl">${caseRow('Audi A6 Avant', '2 godz.', 'Odpisał na wycenę')}${caseRow('Tesla Model 3', 'wczoraj', 'Obiecaliśmy odpowiedź')}</div>
          <div style="padding:14px 16px 8px;font-size:13px;font-weight:700;color:#64748b;border-top:1px solid #e2e8f0">Ucichło 2</div>
          <div style="padding:10px 16px 8px;font-size:13px;font-weight:700;color:#64748b;border-top:1px solid #e2e8f0">U klienta 5</div></div>
        <div class="card dt" style="position:relative;overflow:hidden">
          <div class="empty abs" style="inset:0;display:grid;place-items:center;color:#94a3b8;font-size:15px">Wybierz sprawę z listy</div>
          <div class="full abs" style="inset:0;opacity:0;padding:20px 22px">
            <div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;gap:12px;align-items:center">
              <span style="width:44px;height:44px;border-radius:12px;background:#f1f5f9;display:grid;place-items:center">${ic('car', 22, '#475569')}</span>
              <div><div style="font-size:21px;font-weight:750">BMW X5</div><div style="font-size:13.5px;color:#64748b;display:flex;gap:6px;align-items:center">${ic('user', 14, '#64748b')}Tomasz Lewandowski</div></div></div>
              <span class="bdg" style="background:#fef2f2;color:#b91c1c">Bez odpowiedzi</span></div>
            <div class="mail" style="margin-top:18px;padding:16px 18px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;font-size:15px;line-height:1.55;color:#334155">
              <div style="font-size:12.5px;color:#94a3b8;margin-bottom:6px">tomasz.lewandowski@gmail.com, dziś 9:12</div>
              Dzień dobry, interesuje mnie korekta lakieru i powłoka ceramiczna do BMW X5 z 2021 r. Jaki koszt i najbliższy termin?<br>Pozdrawiam, Tomasz</div>
            <div class="lbl" style="margin-top:20px">Usługi, o które pyta klient</div>
            <div class="facts" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">${['BMW X5, 2021', 'Korekta lakieru', 'Powłoka ceramiczna'].map(f =>
              `<span class="fc" style="padding:7px 12px;border-radius:999px;border:1.5px dashed #93d7f5;background:#e7f6fd;color:#0e6fa0;font-size:14px;font-weight:600">${f}</span>`).join('')}</div>
            <div class="abs" style="left:22px;right:22px;bottom:20px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f1f5f9;padding-top:16px">
              <div class="btn">Kontakt poza pocztą</div>${footerPrimary('Wyślij wycenę', 'Ruch jest po naszej stronie', 'nx')}</div></div></div></div>` }), ui);
    const cl = win.querySelector('.cl');
    const nr = c.add(caseRow('BMW X5', 'teraz', 'Nowe zapytanie', 'new'));
    cl.insertBefore(nr, cl.firstChild);
    tl.set(nr, { height: 0, opacity: 0, overflow: 'hidden', paddingTop: 0, paddingBottom: 0 }, 0);

    c.enter(win, .8);
    tl.to(nr, { height: 'auto', paddingTop: 13, paddingBottom: 13, opacity: 1, duration: .8, ease: 'expo.out' }, 2.6);
    tl.fromTo(nr, { backgroundColor: '#e7f6fd' }, { backgroundColor: '#ffffff', duration: 3, ease: 'power1.in', immediateRender: false }, 2.9);
    tl.set([win.querySelector('.cnt'), win.querySelector('.cnt2')], { textContent: '3' }, 2.7);
    c.callout('Mail od klienta od razu staje się sprawą.', 744, 956, 2.9, 8.6, { step: 'Nowe zapytanie' });

    const cur = c.cursor(1200, 1000, 5.0, ui);
    const np = c.pos(cl); // nowy wiersz wchodzi na górę listy
    cur.move(5.2, np.x + 120, np.y + 34, 1.0); cur.click(6.4, np.x + 120, np.y + 34);
    tl.to(nr, { backgroundColor: '#f0f9ff', boxShadow: 'inset 3px 0 0 #0ea5e9', duration: .2, ease: 'none' }, 6.4);
    tl.to(win.querySelector('.empty'), { opacity: 0, duration: .2, ease: 'none' }, 6.45);
    tl.to(win.querySelector('.full'), { opacity: 1, duration: .5, ease: 'none' }, 6.5);
    tl.fromTo(win.querySelectorAll('.fc'), { opacity: 0, scale: .8 }, { opacity: 1, scale: 1, duration: .5, stagger: .15, ease: 'back.out(2)' }, 7.6);
    cur.move(7.0, 1500, 1040, 1).hide(7.8);
    c.focus(win.querySelector('.facts'), 8.6, 12.6, { parent: ui, pad: 8, r: 14 });
    c.callout('Najważniejsze fakty są wypisane z maila.', 744, 956, 8.9, 14.2, { step: 'Sprawa' });
    c.focus(win.querySelector('.nx'), 14.4, 18.0, { parent: ui, pad: 6, r: 20 });
    c.callout('Zawsze wiesz, jaki jest następny krok.', 744, 956, 14.5, 19.4, { step: 'Krok następny' });
    c.drift(ui, 1, 1.02, 0, 20);
    tl.set(ui, { transformOrigin: '1300px 500px' }, 0);
  },
});

// ── 5.3 FILTR ────────────────────────────────────────────────────────────────
scene({
  id: 'filtr', title: 'Filtr AI', dur: 19,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Poczta', num: '05', lines: ['Filtr AI'], sub: 'Z dziesiątek maili wyłapuje realne zapytania klientów. <b>Reklamy i spam nie zabierają Ci czasu.</b>', y: 360, w: 580 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const MAIL = [
      ['Allegro', 'Twoje zamówienie zostało wysłane', 'p'], ['Tomasz Lewandowski', 'Wycena powłoki do BMW X5', 's'],
      ['Koch-Chemie Newsletter', 'Nowości na jesień 2026', 'p'], ['Google', 'Alert bezpieczeństwa konta', 'p'],
      ['Katarzyna Mazur', 'Ile kosztuje pranie tapicerki?', 's'], ['Pozycjonowanie TOP10', 'Oferta współpracy SEO!!!', 'x'],
      ['Orlen Paliwa', 'Faktura za paliwo', 'p'], ['Michał Kaczmarek', 'PPF na przód Audi RS6, termin?', 's'], ['LinkedIn', 'Masz 3 nowe zaproszenia', 'p'],
    ];
    const tag = k => k === 's' ? '<span class="bdg lead">Sprawa</span>' : k === 'x' ? '<span class="bdg amber">Spam</span>' : '<span class="bdg gray">Powiadomienie</span>';
    const pc = c.add(`<div class="card float abs" style="left:780px;top:110px;width:560px;height:820px;overflow:hidden">
      <div style="padding:20px 22px 14px;display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:20px;font-weight:700">Poczta</div><div style="font-size:14px;color:#64748b">9 nowych</div></div>
      <div class="ml" style="position:relative">${MAIL.map(([f, s, k], i) => `<div class="mr" data-k="${k}" style="display:flex;justify-content:space-between;align-items:center;gap:12px;height:76px;padding:0 22px;border-top:1px solid #f1f5f9;background:#fff;overflow:hidden">
        <div style="min-width:0"><div style="font-size:15.5px;font-weight:650;color:#0f172a">${f}</div><div style="font-size:14px;color:#64748b;margin-top:2px;white-space:nowrap">${s}</div></div>
        <span class="tg2" style="opacity:0">${tag(k)}</span></div>`).join('')}
        <div class="scan abs" style="left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#ecd08f,transparent);box-shadow:0 0 18px rgba(220,174,92,.8);opacity:0"></div></div></div>`, ui);
    const sc = c.add(`<div class="card float abs" style="left:1370px;top:110px;width:470px;height:420px;overflow:hidden">
      <div style="padding:20px 22px 12px;display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:20px;font-weight:700">Sprawy</div><div style="font-size:14px;color:#0e6fa0;font-weight:700">Czeka na nas <span class="sn">0</span></div></div>
      <div class="sl">${MAIL.filter(m => m[2] === 's').map(([f, s]) => `<div class="si" style="padding:14px 22px;border-top:1px solid #f1f5f9;opacity:0">
        <div style="display:flex;justify-content:space-between"><b style="font-size:15.5px">${f}</b><span class="bdg lead" style="height:22px;font-size:12px">Nowe zapytanie</span></div><div style="font-size:14px;color:#64748b;margin-top:3px">${s}</div></div>`).join('')}</div></div>`, ui);
    const oc = c.add(`<div class="card float abs" style="left:1370px;top:560px;width:470px;height:250px;overflow:hidden">
      <div style="padding:20px 22px 8px;font-size:20px;font-weight:700">Poza sprawami</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-top:1px solid #f1f5f9"><span style="font-size:15.5px;font-weight:600">Powiadomienia i reklamy</span><b class="n1 num" style="font-size:18px">0</b></div>
      <div class="rej" style="display:flex;justify-content:space-between;align-items:center;padding:16px 22px;border-top:1px solid #f1f5f9"><span style="font-size:15.5px;font-weight:600">Odrzucone przez automat</span><b class="n2 num" style="font-size:18px">0</b></div></div>`, ui);

    c.enter(pc, .8); c.enter(sc, 1.1); c.enter(oc, 1.25);
    const rows = [...pc.querySelectorAll('.mr')];
    tl.fromTo(rows, { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: .6, stagger: .07 }, 1.3);
    // złota linia przegląda skrzynkę z góry na dół; każdy mail dostaje etykietę, gdy linia go minie
    const scan = pc.querySelector('.scan');
    tl.set(scan, { opacity: 1 }, 3.0);
    tl.fromTo(scan, { top: 0 }, { top: 76 * 9, duration: 2.7, ease: 'none' }, 3.0);
    tl.to(scan, { opacity: 0, duration: .3, ease: 'none' }, 5.7);
    rows.forEach((r, i) => tl.fromTo(r.querySelector('.tg2'), { opacity: 0, scale: .85 }, { opacity: 1, scale: 1, duration: .35, ease: 'back.out(2)' }, 3.0 + (i + .6) * .3));
    c.callout('Każdy mail oceniony, zanim go otworzysz.', 780, 952, 3.2, 8.6, { step: 'Filtr' });

    // rozdział: sprawy w prawo, reszta zwija się w liczniki
    const sis = sc.querySelectorAll('.si'); let si = 0, n1 = 0, n2 = 0;
    rows.forEach((r, i) => {
      const t = 6.4 + i * .16, k = r.dataset.k;
      if (k === 's') {
        tl.to(r, { x: 120, opacity: 0, duration: .45, ease: 'power2.in' }, t);
        tl.fromTo(sis[si], { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: .6 }, t + .3);
        si++; tl.set(sc.querySelector('.sn'), { textContent: String(si) }, t + .3);
      } else {
        tl.to(r, { height: 0, opacity: 0, duration: .45, ease: 'power2.in' }, t);
        if (k === 'x') { n2++; tl.set(oc.querySelector('.n2'), { textContent: String(n2) }, t + .3); }
        else { n1++; tl.set(oc.querySelector('.n1'), { textContent: String(n1) }, t + .3); }
      }
    });
    tl.to(rows.filter(r => r.dataset.k === 's'), { height: 0, duration: .4 }, 8.4);
    const done = c.add(`<div class="abs" style="left:0;right:0;top:300px;text-align:center;color:#64748b;font-size:16px;opacity:0">${ic('check', 30, '#16a34a', 2.4)}<div style="margin-top:8px">Wszystko przejrzane</div></div>`, pc);
    tl.to(done, { opacity: 1, duration: .5, ease: 'none' }, 8.8);
    c.focus(sc, 9.0, 13.0, { parent: ui, pad: 8, r: 22 });
    c.callout('Do Ciebie trafiają tylko prawdziwe zapytania.', 780, 952, 8.9, 13.6, { step: 'Wynik' });
    c.focus(oc.querySelector('.rej'), 14.2, 17.8, { parent: ui, pad: 2, r: 8 });
    c.callout('Pomyłkę cofasz przyciskiem „To jednak lead”.', 780, 952, 13.8, 18.5, { step: 'Kontrola' });
    c.drift(ui, 1, 1.02, 0, 19);
    tl.set(ui, { transformOrigin: '1300px 500px' }, 0);
  },
});

// ── 5.4 OFERTA Z ASYSTENTEM ──────────────────────────────────────────────────
scene({
  id: 'oferta', title: 'Oferta z AI', dur: 23.5,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Poczta', num: '05', lines: ['Oferta', 'z pomocą AI'], sub: 'Asystent dobiera usługi z cennika, podaje ceny z historii <b>i pisze odpowiedź w Twoim stylu.</b>', y: 320, w: 600 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    // ceny brutto z cennika; suma to suma kwot brutto — nic nie jest przeliczane przez netto
    const SUG = [['Korekta lakieru 1-etapowa', 120000], ['Powłoka ceramiczna IGL Eclipse', 249000]];
    const md = c.add(`<div class="modal abs" style="left:756px;top:90px;width:1094px;height:860px">
      <div class="mh" style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;gap:12px;align-items:center"><span style="width:46px;height:46px;border-radius:12px;background:#f1f5f9;display:grid;place-items:center">${ic('car', 22, '#475569')}</span>
          <div><h2>BMW X5</h2><div style="font-size:14px;color:#64748b;display:flex;gap:6px;align-items:center;margin-top:2px">${ic('user', 14, '#64748b')}Tomasz Lewandowski</div></div></div>
        <span class="bdg" style="background:#fef2f2;color:#b91c1c">Bez odpowiedzi</span></div>
      <div style="display:grid;grid-template-columns:1fr 450px;gap:22px;padding:20px 26px">
        <div style="position:relative">
          <div class="lbl">Przebieg sprawy</div>
          <div style="margin-top:10px;padding:14px 16px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;font-size:14.5px;line-height:1.55;color:#334155">
            <div style="font-size:12.5px;color:#94a3b8;margin-bottom:4px">Klient, dziś 9:12</div>Dzień dobry, interesuje mnie korekta lakieru i powłoka ceramiczna do BMW X5 z 2021 r. Jaki koszt i najbliższy termin?</div>
          <div class="ai btn" style="margin-top:14px;height:38px;border-color:#bae6fd;color:#0369a1;background:#f0f9ff"><span class="a1">✦ Napisz z AI</span><span class="a2" style="display:none">Piszę szkic…</span></div>
          <div class="cmp" style="margin-top:14px;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;opacity:0;background:#fff">
            <div style="font-size:12.5px;color:#64748b;margin-bottom:8px">Do: tomasz.lewandowski@gmail.com</div>
            <div class="dr" style="font-size:14.5px;line-height:1.5;color:#0f172a;height:200px"></div>
            <div class="nt" style="margin-top:10px;padding:8px 12px;border-radius:10px;background:#f8fafc;font-size:12.5px;color:#64748b;opacity:0">Szkic w Twoim stylu, na podstawie 14 wysłanych odpowiedzi na podobne pytania. <span style="color:#0284c7;font-weight:600">Napisz inaczej</span></div></div>
        </div>
        <div>
          <div class="card" style="padding:18px 20px;box-shadow:0 12px 30px rgba(15,23,42,.08);border-top:3px solid #0ea5e9">
            <div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:16px;font-weight:700">Wycena</div><span style="font-size:14px;color:#0284c7;font-weight:600">Edytuj</span></div>
            <div class="num tot" style="font-size:36px;font-weight:800;letter-spacing:-0.03em;margin-top:8px">0,00 zł</div>
            <div class="cap2" style="font-size:13px;color:#64748b">0 pozycji, kwota brutto</div>
            <div class="it" style="margin-top:10px">${SUG.map(([n, g], i) => `<div class="li" data-k="${i}" style="display:flex;justify-content:space-between;font-size:14.5px;padding:8px 0;border-top:1px solid #f1f5f9;height:0;opacity:0;overflow:hidden"><span>${n}</span><b class="num">${fmtGr(g)}</b></div>`).join('')}</div></div>
          <div class="sh" style="margin-top:18px;font-size:14px;font-weight:700">Sugerowane usługi <span class="sc" style="color:#64748b">2</span></div>
          ${SUG.map(([n, g], i) => `<div class="sg" data-k="${i}" style="margin-top:10px;padding:12px 14px;border-radius:12px;border-left:3px solid #0ea5e9;background:rgba(14,165,233,.05);overflow:hidden">
            <div style="display:flex;justify-content:space-between"><b style="font-size:14.5px">${n}</b><span class="num" style="font-size:14px;color:#64748b">${fmtGr(g)}</span></div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px">z historii</div>
            <div style="display:flex;gap:8px;margin-top:10px"><span class="acc" style="padding:6px 12px;border-radius:999px;border:1px solid #86efac;background:#f0fdf4;color:#15803d;font-size:13px;font-weight:650">✓ Akceptuj</span><span style="padding:6px 12px;border-radius:999px;color:#94a3b8;font-size:13px;font-weight:600">✕ Odrzuć</span></div></div>`).join('')}
        </div></div>
      <div class="mf" style="justify-content:space-between;align-items:center"><span style="color:#94a3b8">${ic('trash', 20, '#94a3b8')}</span><div style="display:flex;gap:12px;align-items:center"><div class="btn">Kontakt poza pocztą</div>${footerPrimary('Wyślij wycenę', 'Ruch jest po naszej stronie', 'nx')}</div></div></div>`, ui);

    c.enter(md, .8);
    tl.fromTo(md.querySelectorAll('.sg'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .7, stagger: .2 }, 2.0);
    c.callout('Usługi dobrane do pytania klienta, ceny z historii.', 120, 760, 2.6, 8.4, { step: 'Wycena' });
    const cur = c.cursor(1200, 1040, 3.0, ui);
    let total = 0;
    SUG.forEach(([, g], i) => {
      const sg = md.querySelector(`.sg[data-k="${i}"]`), ac = c.pos(sg.querySelector('.acc'));
      const t = 4.2 + i * 1.3;
      // po akceptacji pierwszej karty druga podjeżdża na jej miejsce
      const dy = i === 1 ? -(c.pos(md.querySelector('.sg[data-k="1"]')).y - c.pos(md.querySelector('.sg[data-k="0"]')).y) : 0;
      cur.move(t - .9, ac.cx, ac.cy + dy, .8); cur.click(t, ac.cx, ac.cy + dy);
      tl.to(sg, { height: 0, opacity: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, duration: .5, ease: 'power2.in' }, t + .05);
      const li = md.querySelector(`.li[data-k="${i}"]`);
      tl.to(li, { height: 37, opacity: 1, duration: .5, ease: 'expo.out' }, t + .2);
      total += g;
      c.count(md.querySelector('.tot'), t + .2, .8, total - g, total, v => fmtGr(v));
      tl.set(md.querySelector('.cap2'), { textContent: `${i + 1} ${i ? 'pozycje' : 'pozycja'}, kwota brutto` }, t + .2);
      tl.set(md.querySelector('.sc'), { textContent: String(1 - i) }, t + .1);
    });
    tl.to(md.querySelector('.sh'), { opacity: 0, duration: .4, ease: 'none' }, 5.9);
    c.focus(md.querySelector('.tot').parentNode, 6.6, 9.0, { parent: ui, pad: 4, r: 18 });

    const ai = md.querySelector('.ai'), ap = c.pos(ai);
    cur.move(8.4, ap.cx, ap.cy, .9); cur.click(9.5, ap.cx, ap.cy);
    tl.set(ai.querySelector('.a1'), { display: 'none' }, 9.5); tl.set(ai.querySelector('.a2'), { display: 'inline' }, 9.5);
    tl.set(ai.querySelector('.a2'), { display: 'none' }, 10.4); tl.set(ai.querySelector('.a1'), { display: 'inline' }, 10.4);
    tl.to(md.querySelector('.cmp'), { opacity: 1, duration: .5, ease: 'none' }, 10.3);
    cur.move(9.8, 1240, 1040, 1).hide(10.6);
    const draft = 'Dzień dobry Panie Tomaszu,\ndziękujemy za zapytanie. Dla BMW X5 proponujemy:\n– korektę lakieru 1-etapową: 1 200,00 zł,\n– powłokę ceramiczną IGL Eclipse: 2 490,00 zł.\nRazem 3 690,00 zł brutto. Najbliższy wolny termin to wtorek 20.10.\nPozdrawiam, Anna Nowak';
    const end = c.type(md.querySelector('.dr'), 10.6, draft, 58);
    tl.to(md.querySelector('.nt'), { opacity: 1, duration: .4, ease: 'none' }, end + .3);
    c.callout('Odpowiedź w Twoim stylu, gotowa do wysłania.', 120, 760, 10.8, 16.6, { step: 'Szkic odpowiedzi' });

    const nx = md.querySelector('.nx'), np = c.pos(nx);
    const cur2 = c.cursor(1240, 1040, 16.4, ui);
    cur2.move(16.6, np.cx, np.cy, 1.0); cur2.click(17.9, np.cx, np.cy);
    tl.to(nx, { scale: .97, duration: .08 }, 17.85); tl.to(nx, { scale: 1, duration: .25 }, 17.95);
    const toast = c.add(`<div class="abs" style="left:1240px;top:20px;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:12px;background:#fff;color:#0f172a;font-family:InterV;font-size:15px;font-weight:600;box-shadow:0 20px 40px rgba(0,0,0,.4)">
      <span style="width:22px;height:22px;border-radius:50%;background:#dcfce7;display:grid;place-items:center">${ic('check', 13, '#15803d', 3)}</span>Wycena wysłana</div>`, ui);
    tl.fromTo(toast, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: .5 }, 18.1);
    cur2.hide(18.8);
    c.callout('Klient dostaje ofertę w kilka minut.', 120, 760, 18.2, 22.9, { step: 'Wysłane' });
    c.drift(ui, 1, 1.015, 0, 23.5);
    tl.set(ui, { transformOrigin: '1300px 500px' }, 0);
  },
});
