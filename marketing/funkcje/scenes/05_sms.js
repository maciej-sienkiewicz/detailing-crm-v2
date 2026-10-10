// ROZDZIAŁ 4: KAMPANIE SMS — wiadomości automatyczne i kampanie automatyczne (nagrania
// prawdziwego CRM), a potem to samo z perspektywy telefonu klienta.
//
// „Prośba o opinię” to w CRM treść „Podziękowania po wizycie” (nagranie „sms”: szablon
// z linkiem do wizytówki), a „serwis powłoki” to kampania automatyczna „180 dni po usłudze
// Powłoka ceramiczna IGL Eclipse” (nagranie „kampania”). Scena „sms-tel” NIE jest
// widokiem aplikacji, tylko telefonem klienta - treści są dokładnie te z nagrań.

chapter({
  id: 'r4', num: '04', name: 'Kampanie SMS',
  slogan: ['Cyfrowa obsługa klienta,', 'bez papierologii.'],
  items: ['Wiadomości automatyczne', 'Kampanie automatyczne', 'Telefon klienta'],
});

// ── 4.1 WIADOMOŚCI AUTOMATYCZNE ──────────────────────────────────────────────
recScene({
  id: 'sms', title: 'Wiadomości automatyczne', eyebrow: 'Kampanie SMS', num: '01', lines: ['Podziękowanie', 'i prośba o opinię'],
  sub: 'SMS wychodzi sam po odbiorze auta.',
  steps: {
    etap: { step: 'Po wizycie', text: 'Wiadomości ułożone według etapów wizyty.' },
    wlacz: { step: 'Włączona', text: 'Podziękowanie wychodzi samo, 30 minut po odbiorze auta.' },
    tresc: { step: 'Treść', text: 'Własna treść z imieniem klienta i prośbą o opinię.' },
    podglad: { step: 'Podgląd', text: 'Tak SMS zobaczy klient.' },
    zapisz: { step: 'Zapis', text: 'Zmiany obowiązują od następnej wysyłki.' },
    zapisane: { step: 'Aktywna', text: 'Na liście: włączona, kanał SMS, 30 minut po odbiorze.' },
  },
});

// ── 4.2 KAMPANIA AUTOMATYCZNA ────────────────────────────────────────────────
recScene({
  id: 'kampania', title: 'Kampania automatyczna', eyebrow: 'Kampanie SMS', num: '02', lines: ['Serwis powłoki', 'po 180 dniach'],
  sub: 'Kampania, która działa sama, codziennie.', speed: 1.15,
  steps: {
    rodzaj: { step: 'Rodzaj', text: 'Kampania automatyczna: wysyła, gdy klient spełni warunek.' },
    warunek: { step: 'Warunek', text: 'Po usłudze Powłoka ceramiczna, po 180 dniach, o 10:00.' },
    odbiorcy: { step: 'Odbiorcy', text: 'Klienci policzeni z historii wizyt, ze zgodą marketingową.' },
    tresc: { step: 'Treść', text: 'Imię i marka auta wstawiają się same.' },
    podglad: { step: 'Podgląd', text: 'Gotowy SMS z liczbą znaków i kosztem.' },
    podsumowanie: { step: 'Podsumowanie', text: 'Odbiorcy, koszt w kredytach i warunek wysyłki.' },
    dziala: { step: 'Działa', text: 'Pomija klientów, którzy wrócili w międzyczasie.' },
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
      ['Pt., 9 października 15:40', 'Drogi/a Piotr, Twój pojazd Porsche 911 Carrera 4S jest gotowy do odbioru. Zapraszamy!', 'Gotowe do odbioru', 'Auto gotowe'],
      ['Pt., 9 października 16:30', 'Dziękujemy za wizytę, Piotr! Jeśli jesteś zadowolony, zostaw nam opinię: g.page/r/studio-polysk', '30 min po odbiorze', 'Podziękowanie i opinia'],
      ['Śr., 7 kwietnia 2027 10:00', 'Cześć Piotr! Pół roku temu nałożyliśmy powłokę ceramiczną na Twój Porsche. Zapraszamy na przegląd powłoki: 22 100 20 30', '180 dni później', 'Serwis powłoki'],
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
    const T = [2.2, 6.2, 10.2];
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
