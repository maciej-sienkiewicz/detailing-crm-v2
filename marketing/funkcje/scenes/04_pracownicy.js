// ROZDZIAŁ 3: PRACOWNICY — role i uprawnienia, PIN, „Do zrobienia”, urlopy, czas pracy
// i lista obecności. Etykiety z settings/roles (RoleEditorModal, Permission.kt), pin-switcher,
// dashboard/TasksPanel, employees/leave i worktime.
//
// W aplikacji nie ma odbijania wejścia i wyjścia: czas pracy raportuje się godzinami
// („Zaraportuj 8 godzin pracy”), a lista obecności to dokument generowany z kart pracy.

chapter({
  id: 'r3', num: '03', name: 'Pracownicy',
  slogan: ['Klienci, realizacje, finanse i zespół.', 'Jeden system.'],
  items: ['Role i dostęp', 'Kod PIN', 'Do zrobienia', 'Urlopy', 'Czas pracy'],
});

const CB = (on = true) => `<span class="cb" style="position:relative;width:22px;height:22px;border-radius:6px;border:2px solid #cbd5e1;background:#fff;flex:none">
  <span class="cf" style="position:absolute;inset:-2px;border-radius:6px;background:#0ea5e9;display:grid;place-items:center;opacity:${on ? 1 : 0}">${ic('check', 14, '#fff', 3.2)}</span></span>`;

// ── 3.1 ROLE I UPRAWNIENIA ───────────────────────────────────────────────────
scene({
  id: 'role', title: 'Role i dostęp', dur: 19,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Pracownicy', num: '03', lines: ['Profile', 'pracowników'], sub: 'Każdy ma własne konto i widzi tylko to, <b>do czego dasz mu dostęp.</b>', y: 330, w: 600 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const P = [
      ['Wizyty i kalendarz', [['Podgląd wizyt i kalendarza', 1], ['Tworzenie i edycja wizyt oraz rezerwacji', 1], ['Podgląd cen usług w wizycie', 1, 'ceny']]],
      ['Finanse', [['Faktury i dokumenty przychodowe', 1, 'fin1'], ['Podgląd raportów finansowych', 1, 'fin2']]],
      ['Statystyki', [['Podgląd statystyk', 1, 'stat']]],
      ['Zadania', [['Podgląd i realizacja zadań', 1]]],
    ];
    const md = c.add(`<div class="modal abs" style="left:770px;top:60px;width:700px;height:890px">
      <div class="mh"><h2>Edytuj rolę</h2><p>Co kto może w systemie</p></div>
      <div style="padding:18px 28px">
        <div class="fl">Nazwa roli*</div><div class="inp">Detailer</div>
        <div class="fl" style="margin-top:12px">Opis</div><div class="inp" style="color:#475569">Wykonuje wizyty, bez cen, finansów i ustawień</div>
        <div style="display:flex;align-items:center;gap:14px;margin-top:16px;padding:12px 14px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0">
          <div class="tg"><div class="f" style="opacity:1"></div><div class="k" style="left:23px"></div></div>
          <div><div style="font-size:15px;font-weight:650">Liczony czas pracy</div><div style="font-size:13px;color:#64748b;margin-top:2px">Osoby z tą rolą rejestrują godziny i trafiają na listę obecności.</div></div></div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:20px"><div style="font-size:17px;font-weight:700">Uprawnienia</div><div style="font-size:13.5px;color:#64748b">Zaznaczono <b class="cnt num" style="color:#0f172a">7</b></div></div>
        ${P.map(([g, rows]) => `<div style="margin-top:12px"><div class="lbl" style="margin-bottom:4px">${g}</div>${rows.map(([n, on, k]) =>
          `<div class="pr" ${k ? `data-k="${k}"` : ''} style="display:flex;align-items:center;gap:12px;height:40px;font-size:15px;color:#0f172a">${CB(on)}<span>${n}</span></div>`).join('')}</div>`).join('')}
      </div>
      <div class="mf" style="justify-content:space-between"><div class="btn">${ic('eye', 16)}Podgląd roli</div><div style="display:flex;gap:12px"><div class="btn">Anuluj</div><div class="btn p save">Zapisz rolę</div></div></div></div>`, ui);

    // podgląd roli: menu i wizyta tak, jak zobaczy je Detailer
    const items = [['Tablica', 'grid'], ['Czas pracy', 'clock'], ['Wizyty', 'car'], ['Kalendarz', 'cal'], ['Klienci', 'users'], ['Finanse', 'wallet', 'fin'], ['Statystyki', 'chart', 'stat']];
    const pv = c.add(`<div class="card float abs" style="left:1500px;top:150px;width:340px;height:560px;overflow:hidden">
      <div style="padding:20px 22px 14px;border-bottom:1px solid #f1f5f9"><div class="lbl">Podgląd roli</div><div style="font-size:19px;font-weight:700;margin-top:4px">Detailer</div></div>
      <div style="background:#0f172a;margin:14px;border-radius:12px;padding:10px 8px">${items.map(([n, i, k]) =>
        `<div class="si" ${k ? `data-k="${k}"` : ''} style="display:flex;align-items:center;gap:11px;height:40px;padding:0 10px;color:#cbd5e1;font-size:15px;overflow:hidden">${ic(i, 17, '#94a3b8')}${n}</div>`).join('')}</div>
      <div style="margin:4px 14px 0;padding:14px 16px;border-radius:12px;border:1px solid #e2e8f0">
        <div style="font-size:12px;color:#64748b">Wizyta w trakcie</div><div style="font-size:15.5px;font-weight:650;margin-top:3px">Porsche 911 Carrera 4S</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:14px;color:#475569"><span>Powłoka ceramiczna</span>
          <span style="position:relative;display:inline-block;width:110px;height:20px;text-align:right"><b class="pz num abs" style="right:0;color:#0f172a">2 490,00 zł</b>
          <span class="pl abs" style="right:0;opacity:0;color:#94a3b8;display:inline-flex;gap:5px;align-items:center">${ic('lock', 14, '#94a3b8')}ukryta</span></span></div></div></div>`, ui);

    c.enter(md, .8);
    c.enter(pv, 1.2);
    const cur = c.cursor(1200, 1000, 2.2, ui);
    const order = ['ceny', 'fin1', 'fin2', 'stat'];
    let cnt = 7;
    order.forEach((k, i) => {
      const row = md.querySelector(`.pr[data-k="${k}"]`);
      const p = c.pos(row.querySelector('.cb'));
      const t = 3.2 + i * 1.05;
      cur.move(t - .75, p.cx, p.cy, .65);
      cur.click(t, p.cx, p.cy);
      tl.to(row.querySelector('.cf'), { opacity: 0, duration: .15, ease: 'none' }, t);
      tl.to(row, { color: '#94a3b8', duration: .2, ease: 'none' }, t);
      cnt--; tl.set(md.querySelector('.cnt'), { textContent: String(cnt) }, t);
      if (k === 'ceny') { tl.to(pv.querySelector('.pz'), { opacity: 0, duration: .3, ease: 'none' }, t + .1); tl.to(pv.querySelector('.pl'), { opacity: 1, duration: .3, ease: 'none' }, t + .25); }
      if (k === 'fin2') tl.to(pv.querySelector('.si[data-k="fin"]'), { height: 0, opacity: 0, duration: .6, ease: 'expo.inOut' }, t + .1);
      if (k === 'stat') tl.to(pv.querySelector('.si[data-k="stat"]'), { height: 0, opacity: 0, duration: .6, ease: 'expo.inOut' }, t + .1);
    });
    c.callout('Odznaczasz to, czego pracownik nie zobaczy.', 770, 966, 3.0, 9.0, { step: 'Uprawnienia' });
    cur.move(7.0, 1600, 720, 1.0);
    c.focus(pv, 7.9, 12.6, { parent: ui, pad: 6, r: 20 });
    c.callout('Detailer widzi wizyty, ale bez cen i finansów.', 1180, 966, 9.4, 15.6, { step: 'Podgląd roli' });
    const sv = c.pos(md.querySelector('.save'));
    cur.move(13.6, sv.cx, sv.cy, 1.0); cur.click(14.8, sv.cx, sv.cy);
    tl.to(md.querySelector('.save'), { scale: .95, duration: .08 }, 14.75); tl.to(md.querySelector('.save'), { scale: 1, duration: .25 }, 14.85);
    const toast = c.add(`<div class="abs" style="left:1000px;top:40px;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:12px;background:#fff;color:#0f172a;font-family:InterV;font-size:15px;font-weight:600;box-shadow:0 20px 40px rgba(0,0,0,.4)">
      <span style="width:22px;height:22px;border-radius:50%;background:#dcfce7;display:grid;place-items:center">${ic('check', 13, '#15803d', 3)}</span>Rola zapisana</div>`, ui);
    tl.fromTo(toast, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: .5 }, 15.0);
    tl.to(toast, { opacity: 0, duration: .4 }, 18.0);
    cur.hide(16.0);
    c.drift(ui, 1, 1.02, 0, 19);
    tl.set(ui, { transformOrigin: '1300px 500px' }, 0);
  },
});

// ── 3.2 KOD PIN ──────────────────────────────────────────────────────────────
scene({
  id: 'pin', title: 'Kod PIN', dur: 16,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Pracownicy', num: '03', lines: ['Jeden tablet,', 'wielu ludzi'], sub: 'Każdy loguje się swoim kodem PIN i <b>pracuje na swoim profilu.</b>', y: 330, w: 600 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const tab = c.add(`<div class="abs" style="left:760px;top:150px;width:1090px;height:760px;border-radius:44px;padding:20px;background:linear-gradient(145deg,#3b3b42,#16161a 40%,#2a2a30);
      box-shadow:inset 0 0 0 1px #55555e,0 60px 110px -30px #000,0 0 120px -40px rgba(220,174,92,.25)">
      <div class="scr abs" style="inset:20px;border-radius:26px;overflow:hidden;background:#0a0d14;font-family:InterV;color:#fff"></div></div>`, ui);
    const scr = tab.querySelector('.scr');
    const people = [['Anna Nowak', 'Właściciel', 'AN'], ['Kamil Zieliński', 'Detailer', 'KZ'], ['Ola Wójcik', 'Recepcja', 'OW'], ['Marek Lis', 'Detailer', 'ML']];
    const pick = c.add(`<div class="abs" style="inset:0;background:rgba(10,13,20,.97);text-align:center">
      <div style="margin-top:110px;font-size:34px;font-weight:700;letter-spacing:-0.02em">Wybierz użytkownika</div>
      <div style="margin-top:10px;font-size:17px;color:#94a3b8">Wybierz profil i wprowadź kod PIN, aby się przełączyć</div>
      <div style="display:flex;justify-content:center;gap:26px;margin-top:70px">${people.map(([n, r, i], k) =>
        `<div class="pt" data-k="${k}" style="width:190px;padding:26px 0 22px;border-radius:20px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
          <div style="width:84px;height:84px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#6366f1);display:grid;place-items:center;font-size:28px;font-weight:700">${i}</div>
          <div style="margin-top:16px;font-size:18px;font-weight:650">${n}</div><div style="font-size:14.5px;color:#94a3b8;margin-top:3px">${r}</div></div>`).join('')}</div></div>`, scr);
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    const pin = c.add(`<div class="abs" style="inset:0;background:rgba(10,13,20,.98);opacity:0">
      <div style="position:absolute;left:60px;top:44px;font-size:15px;color:#94a3b8">‹ Wróć do listy</div>
      <div style="position:absolute;left:150px;top:200px;width:300px;text-align:center">
        <div style="width:120px;height:120px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#6366f1);display:grid;place-items:center;font-size:40px;font-weight:700">KZ</div>
        <div style="margin-top:22px;font-size:26px;font-weight:700">Kamil Zieliński</div><div style="font-size:16px;color:#94a3b8;margin-top:4px">Detailer</div>
        <div style="display:flex;justify-content:center;gap:18px;margin-top:34px">${[0, 1, 2, 3].map(i => `<span class="dot" style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.15)"></span>`).join('')}</div></div>
      <div class="kp" style="position:absolute;left:560px;top:120px;display:grid;grid-template-columns:repeat(3,96px);gap:16px">${keys.map(k =>
        `<div class="ky" style="height:76px;border-radius:18px;background:${k ? 'rgba(255,255,255,.07)' : 'transparent'};display:grid;place-items:center;font-size:30px;font-weight:500">${k}</div>`).join('')}</div></div>`, scr);
    const app = c.add(`<div class="abs" style="inset:0;background:#eef2f7;color:#0f172a;opacity:0;display:flex">
      ${sidebar('Tablica', [['Tablica', 'grid'], ['Czas pracy', 'clock'], ['Urlop', 'sun'], '|Praca', ['Wizyty', 'car'], ['Kalendarz', 'cal'], '|Klienci i zapytania', ['Klienci', 'users']])}
      <div style="flex:1;padding:36px 40px"><div style="font-size:30px;font-weight:750;letter-spacing:-0.02em">Dzień dobry, Kamil</div><div style="font-size:15px;color:#64748b;margin-top:4px">Piątek, 9 października</div>
        <div class="card" style="margin-top:26px;padding:20px 22px"><div class="lbl">Twoje wizyty dziś</div>
          ${[['08:00', 'Porsche 911 Carrera 4S', 'Powłoka ceramiczna'], ['13:30', 'Audi A6 Avant', 'Pranie tapicerki']].map(([h, a, s]) =>
            `<div style="display:flex;gap:18px;align-items:center;padding:14px 0;border-bottom:1px solid #f1f5f9"><span class="num" style="font-weight:700;width:56px">${h}</span><span><b style="display:block">${a}</b><span style="font-size:14px;color:#64748b">${s}</span></span></div>`).join('')}</div></div></div>`, scr);

    c.enter(tab, .8);
    const tk = c.pos(pick.querySelector('.pt[data-k="1"]'));
    c.tapAt(scr, 3.0, tk.cx - 780, tk.cy - 170);
    tl.to(pick.querySelector('.pt[data-k="1"]'), { backgroundColor: 'rgba(14,165,233,.18)', borderColor: 'rgba(56,189,248,.6)', duration: .2, ease: 'none' }, 3.0);
    tl.to(pick, { opacity: 0, duration: .4, ease: 'none' }, 3.3);
    tl.to(pin, { opacity: 1, duration: .4, ease: 'none' }, 3.3);
    const kys = pin.querySelectorAll('.ky'), dots = pin.querySelectorAll('.dot');
    [4, 0, 8, 1].forEach((ki, i) => {
      const t = 4.3 + i * .55;
      const kp = c.pos(kys[ki]);
      c.tapAt(scr, t, kp.cx - 780, kp.cy - 170);
      tl.to(kys[ki], { backgroundColor: 'rgba(255,255,255,.22)', duration: .08, ease: 'none' }, t);
      tl.to(kys[ki], { backgroundColor: 'rgba(255,255,255,.07)', duration: .3, ease: 'none' }, t + .12);
      tl.to(dots[i], { backgroundColor: '#0ea5e9', scale: 1.15, duration: .15, ease: 'none' }, t);
      tl.to(dots[i], { scale: 1, duration: .2 }, t + .15);
    });
    tl.to(pin, { opacity: 0, duration: .5, ease: 'none' }, 6.9);
    tl.to(app, { opacity: 1, duration: .5, ease: 'none' }, 6.9);
    c.callout('Wybierasz profil i wpisujesz swój PIN.', 760, 950, 2.8, 8.4, { step: 'Zmiana użytkownika' });
    c.callout('Kamil widzi swój dzień, bez finansów.', 760, 950, 8.8, 15.3, { step: 'Profil detailera' });
    c.drift(ui, 1, 1.02, 0, 16);
    tl.set(ui, { transformOrigin: '1300px 520px' }, 0);
  },
});

// ── 3.3 DO ZROBIENIA ─────────────────────────────────────────────────────────
scene({
  id: 'todo', title: 'Do zrobienia', dur: 20,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Pracownicy', num: '03', lines: ['Listy', 'do zrobienia'], sub: 'Zadania dla zespołu, osoby albo roli. <b>Wykonane same trafiają do archiwum.</b>', y: 330, w: 600 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const vis = (t, role) => role ? `<span class="bdg" style="background:#f5f3ff;color:#7c3aed;height:24px;font-size:12.5px">${t}</span>` : `<span class="bdg" style="background:#f0f9ff;color:#0284c7;height:24px;font-size:12.5px">${t}</span>`;
    const task = (t, meta, who, v, extra = '') => `<div class="tk" style="display:flex;gap:14px;padding:16px 22px;border-bottom:1px solid #f1f5f9;background:#fff">
      <span class="chk" style="margin-top:2px"><span class="f">${ic('check', 13, '#fff', 3.4)}</span></span>
      <div style="flex:1;min-width:0"><div class="tt2" style="font-size:16px;font-weight:650;color:#0f172a;position:relative;display:inline-block">${t}<span class="strike abs" style="left:0;right:0;top:52%;height:1.5px;background:#94a3b8;transform:scaleX(0);transform-origin:0 50%"></span></div>
        <div style="font-size:13.5px;color:#64748b;margin-top:3px">${meta}</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:12.5px;color:#94a3b8">${v}<span class="who">Dodał: ${who}</span>${extra}</div></div></div>`;
    const card = c.add(`<div class="card float abs" style="left:780px;top:150px;width:580px;height:660px;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:22px 22px 16px;border-bottom:1px solid #f1f5f9">
        <div style="font-size:20px;font-weight:700">Do zrobienia</div><div style="display:flex;gap:8px"><div class="btn" style="height:36px">Archiwum</div>
        <div class="btn add" style="height:36px;background:#f0f9ff;color:#0369a1;border-color:#bae6fd">${ic('plus', 15)}Dodaj</div></div></div>
      <div class="list">
        ${task('Zamówić pady polerskie 3M', 'Zostały dwa komplety', 'Anna Nowak, wczoraj', vis('Wszyscy'))}
        ${task('Zadzwonić do p. Wiśniewskiego w sprawie odbioru', 'Auto gotowe od 14:00', 'Anna Nowak, dziś', vis('Ola Wójcik'))}
        ${task('Umyć auto demo przed sesją zdjęciową', 'Sesja w sobotę o 9:00', 'Anna Nowak, dziś', vis('Rola: Detailer', 1))}
        ${task('Sprawdzić stan lampy do korekty', 'Migocze przy pełnej mocy', 'Marek Lis, 2 dni temu', vis('Wszyscy'))}</div></div>`, ui);
    const list = card.querySelector('.list');
    const nt = c.add(task('Odebrać folię PPF od dostawcy', 'Pilne, do piątku', 'Anna Nowak, teraz', vis('Kamil Zieliński')));
    list.insertBefore(nt, list.firstChild);
    tl.set(nt, { height: 0, opacity: 0, overflow: 'hidden', paddingTop: 0, paddingBottom: 0 }, 0);

    const md = c.add(`<div class="modal abs" style="left:1240px;top:180px;width:600px;height:640px;z-index:40">
      <div class="mh"><h2>Nowa notatka</h2></div>
      <div style="padding:20px 28px">
        <div class="fl">Tytuł <span style="font-weight:500;color:#94a3b8;font-size:12px">Obowiązkowe</span></div><div class="inp i1"><span class="tx"></span></div>
        <div class="fl" style="margin-top:14px">Kontekst <span style="font-weight:500;color:#94a3b8;font-size:12px">Opcjonalne</span></div><div class="inp i2"><span class="tx"></span></div>
        <div class="fl" style="margin-top:18px">Widoczność zadania</div>
        <div class="seg"><div class="on v0">Wszyscy</div><div class="v1">Osoby</div><div>Rola</div></div>
        <div class="ppl" style="margin-top:14px;opacity:0">${['Anna Nowak', 'Kamil Zieliński', 'Ola Wójcik'].map((n, i) =>
          `<div class="pp" data-k="${i}" style="display:flex;align-items:center;gap:12px;height:40px;font-size:15px">${CB(false)}${n}</div>`).join('')}</div></div>
      <div class="mf"><div class="btn">Anuluj</div><div class="btn p save">Dodaj notatkę</div></div></div>`, ui);

    c.enter(card, .8);
    tl.fromTo(list.querySelectorAll('.tk'), { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: .8, stagger: .08 }, 1.2);
    const cur = c.cursor(1200, 1000, 2.0, ui);
    const ad = c.pos(card.querySelector('.add'));
    cur.move(2.2, ad.cx, ad.cy, .9); cur.click(3.2, ad.cx, ad.cy);
    tl.fromTo(md, { opacity: 0, y: 40, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .8 }, 3.3);
    tl.set(md.querySelector('.i1'), { className: 'inp i1 focus' }, 3.8);
    c.type(md.querySelector('.i1 .tx'), 3.85, 'Odebrać folię PPF od dostawcy', 26);
    tl.set(md.querySelector('.i1'), { className: 'inp i1' }, 5.05);
    tl.set(md.querySelector('.i2'), { className: 'inp i2 focus' }, 5.1);
    c.type(md.querySelector('.i2 .tx'), 5.15, 'Pilne, do piątku', 24);
    tl.set(md.querySelector('.i2'), { className: 'inp i2' }, 5.9);
    const v1 = c.pos(md.querySelector('.v1'));
    cur.move(5.6, v1.cx, v1.cy, .7); cur.click(6.4, v1.cx, v1.cy);
    tl.to(md.querySelector('.v0'), { backgroundColor: 'rgba(255,255,255,0)', boxShadow: 'none', color: '#64748b', duration: .2, ease: 'none' }, 6.4);
    tl.to(md.querySelector('.v1'), { backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(15,23,42,.12)', color: '#0f172a', duration: .2, ease: 'none' }, 6.4);
    tl.to(md.querySelector('.ppl'), { opacity: 1, duration: .4, ease: 'none' }, 6.5);
    const kz = md.querySelector('.pp[data-k="1"] .cb'), kp = c.pos(kz);
    cur.move(6.8, kp.cx, kp.cy, .6); cur.click(7.5, kp.cx, kp.cy);
    tl.to(kz.querySelector('.cf'), { opacity: 1, duration: .15, ease: 'none' }, 7.5);
    const sv = c.pos(md.querySelector('.save'));
    cur.move(7.8, sv.cx, sv.cy, .7); cur.click(8.6, sv.cx, sv.cy);
    tl.to(md, { opacity: 0, y: 30, scale: .96, duration: .4, ease: 'power2.in' }, 8.7);
    tl.to(nt, { height: 'auto', opacity: 1, paddingTop: 16, paddingBottom: 16, duration: .8, ease: 'expo.out' }, 9.0);
    tl.fromTo(nt, { backgroundColor: '#e0f2fe' }, { backgroundColor: '#ffffff', duration: 2.4, ease: 'power1.in', immediateRender: false }, 9.3);
    c.callout('Zadanie widzi tylko wybrana osoba.', 780, 846, 8.9, 13.6, { step: 'Widoczność' });

    // odhaczenie: przekreślenie i podpis „Do archiwum…”
    const t3 = list.querySelectorAll('.tk')[3];
    const ck = t3.querySelector('.chk');
    // pozycja odhaczanego zadania po wsunięciu nowego wiersza: wiersz wyżej o jego wysokość
    const cpos = c.pos(ck);
    const shift = 112;
    cur.move(11.6, cpos.cx, cpos.cy + shift, 1.0); cur.click(12.8, cpos.cx, cpos.cy + shift);
    tl.to(ck.querySelector('.f'), { opacity: 1, duration: .2, ease: 'none' }, 12.8);
    tl.to(t3.querySelector('.strike'), { scaleX: 1, duration: .5, ease: 'power2.inOut' }, 12.9);
    tl.to(t3.querySelector('.tt2'), { color: '#94a3b8', duration: .4, ease: 'none' }, 12.9);
    tl.set(t3.querySelector('.who'), { textContent: 'Do archiwum 11.10 o 14:32' }, 13.1);
    cur.move(13.4, 1500, 1000, 1).hide(14.2);
    c.callout('Wykonane trafiają do archiwum po 48 godzinach.', 780, 846, 13.9, 19.4, { step: 'Archiwum' });
    c.drift(ui, 1, 1.02, 0, 20);
    tl.set(ui, { transformOrigin: '1300px 500px' }, 0);
  },
});

// ── 3.4 URLOPY ───────────────────────────────────────────────────────────────
scene({
  id: 'urlopy', title: 'Urlopy', dur: 20,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Pracownicy', num: '03', lines: ['Urlopy'], sub: 'Wniosek z telefonu, akceptacja podpisem i <b>grafik nieobecności dla całego zespołu.</b>', y: 360, w: 580 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const pw = c.add('<div class="abs" style="left:740px;top:110px;width:412px;height:840px;transform:scale(.86);transform-origin:0 0"></div>', ui);
    const ph = c.add(`<div class="phone" style="left:0;top:0"><div class="ps"><div class="island"></div>
      <div class="sb"><span>9:41</span><span>5G</span></div><div class="scrs abs" style="left:0;right:0;top:56px;bottom:0;background:#f8fafc"></div></div></div>`, pw);
    const S = ph.querySelector('.scrs');
    const scr = html => c.add(`<div class="abs" style="inset:0;padding:26px 22px;opacity:0">${html}</div>`, S);
    const s1 = scr(`<div style="font-size:26px;font-weight:750">Urlop</div>
      <div class="card" style="margin-top:18px;padding:20px"><div class="num" style="font-size:44px;font-weight:800;letter-spacing:-0.03em">6</div><div style="font-size:14px;color:#64748b">dni wykorzystane w 2026</div></div>
      <div class="go1" style="margin-top:16px;padding:16px 18px;border-radius:16px;background:#0ea5e9;color:#fff"><div style="font-size:17px;font-weight:700">Złóż wniosek o urlop</div><div style="font-size:13px;opacity:.85;margin-top:2px">trafi do akceptacji</div></div>
      <div style="margin-top:22px;font-size:15px;font-weight:700">Twoje wnioski</div>
      <div class="card" style="margin-top:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;font-size:14px"><span>3–7.08.2026</span><span class="bdg green">Zatwierdzony</span></div>`);
    const types = ['Urlop wypoczynkowy', 'Na żądanie', 'Zwolnienie lekarskie', 'Urlop bezpłatny', 'Urlop okolicznościowy'];
    const s2 = scr(`<div style="font-size:13px;color:#64748b;font-weight:600">Rodzaj</div><div style="font-size:24px;font-weight:750;margin-top:4px">Jaki to urlop?</div>
      ${types.map((t, i) => `<div class="ty" data-k="${i}" style="margin-top:${i ? 10 : 18}px;padding:16px 18px;border-radius:14px;background:#fff;border:1.5px solid #e2e8f0;font-size:16px;font-weight:600">${t}</div>`).join('')}`);
    // październik 2026: 1.10 to czwartek
    const days = []; for (let i = 0; i < 3; i++) days.push(''); for (let d = 1; d <= 31; d++) days.push(d);
    const s3 = scr(`<div style="font-size:13px;color:#64748b;font-weight:600">Termin</div><div style="font-size:15px;color:#334155;margin-top:6px;line-height:1.4">Na kalendarzu kliknij pierwszy dzień urlopu, a potem ostatni.</div>
      <div class="card" style="margin-top:14px;padding:14px"><div style="text-align:center;font-weight:700;margin-bottom:10px">Październik 2026</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;font-size:12px;color:#94a3b8;margin-bottom:6px">${['pn', 'wt', 'śr', 'cz', 'pt', 'so', 'nd'].map(d => `<span>${d}</span>`).join('')}</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;text-align:center;font-size:14.5px">${days.map(d => `<span class="dd" data-d="${d}" style="height:36px;line-height:36px;border-radius:9px;${d && (days.indexOf(d) % 7) >= 5 ? 'color:#94a3b8' : ''}">${d}</span>`).join('')}</div></div>
      <div class="cnt5" style="margin-top:14px;text-align:center;font-size:16px;font-weight:700;opacity:0">5 dni roboczych</div>
      <div class="dal" style="margin-top:12px;padding:14px;border-radius:14px;background:#0ea5e9;color:#fff;text-align:center;font-weight:700">Dalej</div>`);
    const s4 = scr(`<div style="font-size:13px;color:#64748b;font-weight:600">Podpis</div><div style="font-size:20px;font-weight:750;margin-top:4px">Urlop wypoczynkowy</div><div style="font-size:15px;color:#475569;margin-top:2px">19–23.10.2026, 5 dni roboczych</div>
      <div style="margin-top:18px;height:230px;border:1.5px dashed #cbd5e1;border-radius:16px;background:#fff;position:relative">
        <svg width="340" height="230" viewBox="0 0 340 230" style="position:absolute;left:0;top:0"><path class="sig" d="M40 150 C 60 90, 80 60, 96 90 C 110 118, 84 150, 104 140 C 126 128, 130 100, 148 104 C 166 108, 150 146, 172 140 C 196 132, 200 92, 222 98 C 240 104, 226 140, 248 136 C 270 132, 280 108, 300 112" fill="none" stroke="#0f172a" stroke-width="3.4" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>
        <div style="position:absolute;left:0;right:0;bottom:14px;text-align:center;font-size:13px;color:#94a3b8">Podpisz palcem w tym polu</div></div>
      <div class="snd" style="margin-top:16px;padding:16px;border-radius:14px;background:#0ea5e9;color:#fff;text-align:center;font-weight:700">Podpisz i wyślij wniosek</div>`);
    const s5 = scr(`<div style="margin-top:150px;text-align:center"><div style="width:84px;height:84px;margin:0 auto;border-radius:50%;background:#dcfce7;display:grid;place-items:center">${ic('check', 44, '#15803d', 2.6)}</div>
      <div style="font-size:24px;font-weight:750;margin-top:20px">Wniosek wysłany</div><div style="font-size:15px;color:#64748b;margin-top:8px;line-height:1.45">Czeka na akceptację.<br>Dostaniesz powiadomienie.</div></div>`);

    // grafik nieobecności (kierownik)
    const D0 = 12, D1 = 30, N = D1 - D0 + 1, CW = 24;
    const ppl = ['Anna Nowak', 'Kamil Zieliński', 'Ola Wójcik', 'Marek Lis'];
    const cal = c.add(`<div class="card float abs" style="left:1196px;top:230px;width:650px;height:400px;overflow:hidden">
      <div style="padding:22px 24px 10px;display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:19px;font-weight:700">Nieobecności</div><div style="font-size:14px;color:#64748b">październik 2026</div></div>
      <div style="position:relative;margin:10px 24px 0">
        <div style="display:grid;grid-template-columns:150px repeat(${N},${CW}px);font-size:11.5px;color:#94a3b8;text-align:center;height:28px;align-items:center"><span style="text-align:left">Osoba</span>${Array.from({ length: N }, (_, i) => `<span>${D0 + i}</span>`).join('')}</div>
        ${ppl.map((p, r) => `<div class="pr${r}" style="display:grid;grid-template-columns:150px repeat(${N},${CW}px);height:58px;align-items:center;border-top:1px solid #f1f5f9;font-size:14.5px;font-weight:600">
          <span>${p}</span>${Array.from({ length: N }, (_, i) => { const d = D0 + i, dow = (d + 2) % 7; return `<span class="c" data-d="${d}" style="height:34px;margin:0 1px;border-radius:5px;background:${dow >= 5 ? '#f1f5f9' : 'transparent'}"></span>`; }).join('')}</div>`).join('')}
      </div>
      <div style="position:absolute;left:24px;bottom:20px;display:flex;gap:20px;font-size:13px;color:#64748b">
        <span style="display:inline-flex;gap:7px;align-items:center"><i style="width:14px;height:14px;border-radius:4px;background:#fde68a"></i>urlop</span>
        <span style="display:inline-flex;gap:7px;align-items:center"><i style="width:14px;height:14px;border-radius:4px;background:repeating-linear-gradient(45deg,#fde68a 0 4px,#fff 4px 8px);border:1px solid #fde68a"></i>wniosek oczekuje</span></div></div>`, ui);
    // Ola ma już urlop 13–14.10
    [13, 14].forEach(d => { cal.querySelector(`.pr2 .c[data-d="${d}"]`).style.background = '#fde68a'; });
    const kamil = [19, 20, 21, 22, 23].map(d => cal.querySelector(`.pr1 .c[data-d="${d}"]`));

    // telefon pomniejszony do 0,86 — przeliczenie współrzędnych dotyku na układ ekranu telefonu
    c.enter(ph, .8);
    tl.to(s1, { opacity: 1, duration: .3, ease: 'none' }, 1.0);
    const tapS = (el, t) => { const p = c.pos(el), q = c.pos(S); c.tapAt(S, t, p.cx - q.x, p.cy - q.y); };
    tapS(s1.querySelector('.go1'), 2.4);
    tl.to(s1, { opacity: 0, duration: .3, ease: 'none' }, 2.6); tl.to(s2, { opacity: 1, duration: .3, ease: 'none' }, 2.7);
    tapS(s2.querySelector('.ty[data-k="0"]'), 3.6);
    tl.to(s2.querySelector('.ty[data-k="0"]'), { borderColor: '#0ea5e9', backgroundColor: '#f0f9ff', duration: .15, ease: 'none' }, 3.6);
    tl.to(s2, { opacity: 0, duration: .3, ease: 'none' }, 3.9); tl.to(s3, { opacity: 1, duration: .3, ease: 'none' }, 4.0);
    const d19 = s3.querySelector('.dd[data-d="19"]'), d23 = s3.querySelector('.dd[data-d="23"]');
    tapS(d19, 4.8); tapS(d23, 5.5);
    tl.to(d19, { backgroundColor: '#0ea5e9', color: '#fff', duration: .1, ease: 'none' }, 4.8);
    [20, 21, 22].forEach(d => tl.to(s3.querySelector(`.dd[data-d="${d}"]`), { backgroundColor: '#e0f2fe', duration: .1, ease: 'none' }, 5.5));
    tl.to(d23, { backgroundColor: '#0ea5e9', color: '#fff', duration: .1, ease: 'none' }, 5.5);
    tl.to(s3.querySelector('.cnt5'), { opacity: 1, duration: .3, ease: 'none' }, 5.6);
    tapS(s3.querySelector('.dal'), 6.4);
    tl.to(s3, { opacity: 0, duration: .3, ease: 'none' }, 6.6); tl.to(s4, { opacity: 1, duration: .3, ease: 'none' }, 6.7);
    tl.to(s4.querySelector('.sig'), { attr: { 'stroke-dashoffset': 0 }, duration: 1.2, ease: 'power1.inOut' }, 7.1);
    tapS(s4.querySelector('.snd'), 8.7);
    tl.to(s4, { opacity: 0, duration: .3, ease: 'none' }, 8.9); tl.to(s5, { opacity: 1, duration: .3, ease: 'none' }, 9.0);

    c.enter(cal, 1.6);
    tl.to(kamil, { background: 'repeating-linear-gradient(45deg,#fde68a 0 4px,#fff 4px 8px)', boxShadow: 'inset 0 0 0 1px #fde68a', duration: .3, stagger: .06, ease: 'none' }, 9.3);
    c.callout('Wniosek trafia do kierownika do akceptacji.', 1196, 680, 9.2, 14.2, { step: 'Wniosek' });

    const pop = c.add(`<div class="card abs" style="left:1330px;top:440px;width:420px;padding:20px 22px;box-shadow:0 30px 60px rgba(0,0,0,.45);opacity:0">
      <div style="font-size:17px;font-weight:700">Wniosek urlopowy</div><div style="font-size:14px;color:#475569;margin-top:4px">Kamil Zieliński, urlop wypoczynkowy, 19–23.10</div>
      <div style="font-size:13px;color:#64748b;margin-top:12px">Kto jeszcze jest wtedy nieobecny</div><div style="font-size:14px;font-weight:600;margin-top:2px">Nikt z zespołu</div>
      <div style="display:flex;gap:10px;margin-top:16px"><div class="btn" style="flex:1">Podpisz odmowę</div><div class="btn p ok" style="flex:1.3">Podpisz zatwierdzenie</div></div></div>`, ui);
    tl.to(pop, { opacity: 1, y: -10, duration: .6 }, 10.6);
    const cur = c.cursor(1500, 1000, 10.8, ui);
    const okp = c.pos(pop.querySelector('.ok'));
    cur.move(11.0, okp.cx, okp.cy - 10, 1.0); cur.click(12.4, okp.cx, okp.cy - 10);
    tl.to(pop, { opacity: 0, y: 0, duration: .35, ease: 'power2.in' }, 12.6);
    tl.to(kamil, { background: '#fde68a', boxShadow: 'inset 0 0 0 1px #fde68a', duration: .3, stagger: .05, ease: 'none' }, 12.8);
    cur.hide(13.4);
    c.focus(cal.querySelector('.pr1'), 13.2, 16.6, { parent: ui, pad: 4, r: 8 });
    c.callout('Grafik nieobecności widzi cały zespół.', 1196, 680, 14.4, 19.4, { step: 'Zatwierdzony' });
    c.drift(ui, 1, 1.02, 0, 20);
    tl.set(ui, { transformOrigin: '1300px 500px' }, 0);
  },
});

// ── 3.5 CZAS PRACY I LISTA OBECNOŚCI ─────────────────────────────────────────
scene({
  id: 'obecnosc', title: 'Czas pracy', dur: 19,
  build(c) {
    const { tl } = c;
    c.bg();
    c.title({ eyebrow: 'Pracownicy', num: '03', lines: ['Czas pracy', 'i lista obecności'], sub: 'Pracownik raportuje godziny, Ty zatwierdzasz karty <b>i generujesz listę obecności.</b>', y: 320, w: 600, size: 74 });

    const ui = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    const ec = c.add(`<div class="card float abs" style="left:780px;top:130px;width:440px;height:360px;padding:24px 26px">
      <div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:19px;font-weight:700">Czas pracy</div><div style="font-size:14px;color:#64748b;margin-top:2px">Październik 2026</div></div>
        <span class="bdg st1" style="background:#f1f5f9;color:#64748b">Szkic</span></div>
      <div style="display:flex;gap:26px;margin-top:26px"><div><div class="num hh" style="font-size:46px;font-weight:800;letter-spacing:-0.03em">48 h</div><div style="font-size:13.5px;color:#64748b">z 168 h normy</div></div>
        <div><div class="num dd" style="font-size:46px;font-weight:800;letter-spacing:-0.03em;color:#475569">6</div><div style="font-size:13.5px;color:#64748b">dni</div></div></div>
      <div style="margin-top:18px;height:8px;border-radius:99px;background:#f1f5f9"><div class="bar" style="height:100%;width:${48 / 168 * 100}%;border-radius:99px;background:#0ea5e9"></div></div>
      <div class="btn p rep" style="width:100%;height:50px;margin-top:26px;font-size:16px">${ic('clock', 18)}Zaraportuj 8 godzin pracy</div>
      <div class="btn" style="width:100%;height:46px;margin-top:10px">Złóż kartę do zatwierdzenia</div></div>`, ui);
    const rows = [['Anna Nowak', '168:00 z 168 h', 'Zatwierdzona', 1], ['Kamil Zieliński', '160:00 z 168 h, urlop 1 dzień', 'Do zatwierdzenia', 0], ['Ola Wójcik', '152:00 z 168 h, brak 2 dni', 'W trakcie', 2], ['Marek Lis', '168:00 z 168 h', 'Zatwierdzona', 1]];
    const mc = c.add(`<div class="card float abs" style="left:1250px;top:130px;width:590px;height:360px;overflow:hidden">
      <div style="padding:22px 24px 14px;display:flex;justify-content:space-between;align-items:baseline"><div style="font-size:19px;font-weight:700">Karty pracy, wrzesień</div><div class="sum" style="font-size:14px;color:#64748b">4 z 7 kart zatwierdzonych</div></div>
      ${rows.map(([n, h, s, k], i) => `<div class="mr" data-k="${i}" style="display:grid;grid-template-columns:1fr auto;align-items:center;padding:13px 24px;border-top:1px solid #f1f5f9">
        <div><div style="font-size:15.5px;font-weight:650">${n}</div><div style="font-size:13px;color:#64748b;margin-top:2px">${h}</div></div>
        <div style="display:flex;gap:10px;align-items:center">${k === 1 ? '<span class="bdg green">Zatwierdzona</span>' : k === 0 ? '<span class="bdg st2" style="background:#fffbeb;color:#92400e;border-color:#fcd34d">Do zatwierdzenia</span><span class="btn okl ap" style="height:34px;font-size:14px">Zatwierdź kartę</span>' : '<span class="bdg gray">W trakcie</span><span class="btn" style="height:34px;font-size:14px">Przypomnij</span>'}</div></div>`).join('')}</div>`, ui);
    const lc = c.add(`<div class="card float abs" style="left:780px;top:520px;width:1060px;height:262px;overflow:hidden">
      <div style="padding:20px 24px 14px;display:flex;justify-content:space-between;align-items:center"><div style="font-size:19px;font-weight:700">Listy obecności</div><div class="btn gen" style="height:38px">${ic('file', 16)}Wygeneruj listę obecności</div></div>
      <div class="tbl"><div class="tr th" style="grid-template-columns:1fr 220px 300px"><span>Okres</span><span>Wygenerowano</span><span>Status</span></div><div class="lr">
        <div class="tr" style="grid-template-columns:1fr 220px 300px"><span style="font-weight:650">Sierpień 2026</span><span class="num" style="color:#475569">01.09.2026</span><span style="display:flex;gap:8px"><span class="bdg green">Zatwierdzona</span><span style="font-size:13px;color:#64748b;align-self:center">podpisana</span></span></div></div></div></div>`, ui);
    const lr = lc.querySelector('.lr');
    const nr = c.add(`<div class="tr" style="grid-template-columns:1fr 220px 300px"><span style="font-weight:650">Wrzesień 2026</span><span class="num" style="color:#475569">09.10.2026</span>
      <span style="position:relative;height:26px"><span class="w1 abs" style="left:0;top:0"><span class="bdg" style="background:#fffbeb;color:#92400e;border-color:#fcd34d">Do zatwierdzenia</span></span>
      <span class="w2 abs" style="left:0;top:0;display:flex;gap:8px;opacity:0"><span class="bdg green">Zatwierdzona</span><span style="font-size:13px;color:#64748b;align-self:center">podpisana</span></span></span></div>`);
    lr.insertBefore(nr, lr.firstChild);
    tl.set(nr, { height: 0, opacity: 0, overflow: 'hidden' }, 0);

    c.enter(ec, .8); c.enter(mc, 1.0); c.enter(lc, 1.2);
    const cur = c.cursor(1000, 1000, 2.0, ui);
    const rp = c.pos(ec.querySelector('.rep'));
    cur.move(2.2, rp.cx, rp.cy, .9); cur.click(3.2, rp.cx, rp.cy);
    c.count(ec.querySelector('.hh'), 3.3, .9, 48, 56, n => Math.round(n) + ' h');
    c.count(ec.querySelector('.dd'), 3.3, .9, 6, 7);
    tl.to(ec.querySelector('.bar'), { width: `${56 / 168 * 100}%`, duration: .9, ease: 'power3.out' }, 3.3);
    const toast = c.add(`<div class="abs" style="left:800px;top:40px;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:12px;background:#fff;color:#0f172a;font-family:InterV;font-size:15px;font-weight:600;box-shadow:0 20px 40px rgba(0,0,0,.4)">
      <span style="width:22px;height:22px;border-radius:50%;background:#dcfce7;display:grid;place-items:center">${ic('check', 13, '#15803d', 3)}</span>Zapisano 8 godzin pracy na dziś.</div>`, ui);
    tl.fromTo(toast, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: .5 }, 3.3);
    tl.to(toast, { opacity: 0, duration: .4 }, 6.0);
    c.callout('Jedno kliknięcie zapisuje dzień pracy.', 780, 820, 3.4, 8.6, { step: 'Pracownik' });

    const ap = mc.querySelector('.ap'), app = c.pos(ap);
    cur.move(6.0, app.cx, app.cy, 1.0); cur.click(7.3, app.cx, app.cy);
    tl.to(ap, { opacity: 0, duration: .15, ease: 'none' }, 7.35);
    tl.set(ap, { display: 'none' }, 7.5);
    tl.to(mc.querySelector('.st2'), { backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#86efac', duration: .3, ease: 'none' }, 7.35);
    tl.set(mc.querySelector('.st2'), { textContent: 'Zatwierdzona' }, 7.35);
    tl.set(mc.querySelector('.sum'), { textContent: '5 z 7 kart zatwierdzonych' }, 7.35);

    const gp = c.pos(lc.querySelector('.gen'));
    cur.move(8.6, gp.cx, gp.cy, 1.0); cur.click(9.9, gp.cx, gp.cy);
    tl.to(nr, { height: 58, opacity: 1, duration: .8, ease: 'expo.out' }, 10.2);
    tl.fromTo(nr, { backgroundColor: '#fef3c7' }, { backgroundColor: '#ffffff', duration: 2.2, ease: 'power1.in', immediateRender: false }, 10.5);
    tl.to(nr.querySelector('.w1'), { opacity: 0, duration: .3, ease: 'none' }, 12.6);
    tl.to(nr.querySelector('.w2'), { opacity: 1, duration: .3, ease: 'none' }, 12.6);
    cur.move(10.4, 1500, 1000, 1).hide(11.2);
    c.focus(nr, 12.7, 16.0, { parent: ui, pad: 2, r: 6 });
    c.callout('Lista obecności powstaje z zatwierdzonych kart.', 780, 820, 9.6, 18.4, { step: 'Lista obecności' });
    c.drift(ui, 1, 1.02, 0, 19);
    tl.set(ui, { transformOrigin: '1300px 500px' }, 0);
  },
});
