// INTRO: znak DetailBoost → „Cała firma. Jeden system. Pełna kontrola.” → spis rozdziałów.
// Kolejność i forma jak nagłówek strony: etykieta w Geist Mono między kreskami, srebro,
// a złoto dopiero w ostatnim zdaniu, które jest obietnicą.
scene({
  id: 'intro', title: 'Intro', dur: 13.5, noIn: true,
  build(c) {
    const { tl } = c;
    c.bg({ stage: [960, 470, 1500, 900], warm: .9 });

    const eb = c.add(`<div class="abs mono" style="left:0;right:0;top:214px;display:flex;justify-content:center;align-items:center;gap:16px;font-size:15px;letter-spacing:.22em;color:#a1a1aa">
      <span style="width:30px;height:1px;background:linear-gradient(90deg,transparent,#dcae5c)"></span>CRM DLA STUDIÓW AUTO DETAILINGU<span style="width:30px;height:1px;background:linear-gradient(270deg,transparent,#dcae5c)"></span></div>`);
    const lg = c.add(`<div class="abs" style="left:770px;top:300px;width:380px;height:192px">
      <img src="../showreel/a/logo.png" style="width:380px;height:192px;display:block">
      <div class="sw" style="position:absolute;inset:0;-webkit-mask:url(../showreel/a/logo.png) center/100% 100% no-repeat;mask:url(../showreel/a/logo.png) center/100% 100% no-repeat;
        background:linear-gradient(105deg, transparent 40%, rgba(255,250,228,.95) 50%, transparent 60%) no-repeat;background-size:300% 100%;background-position:120% 0"></div></div>`);
    const word = c.add(`<div class="abs" style="left:0;right:0;top:530px;text-align:center;font-size:104px;font-weight:620;letter-spacing:-0.055em">${'DetailBoost'.split('').map(ch => `<span class="w silver">${ch}</span>`).join('')}</div>`);
    tl.fromTo(lg, { opacity: 0, scale: .9, filter: 'blur(18px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 2.2 }, .3);
    tl.fromTo(lg.querySelector('.sw'), { backgroundPosition: '120% 0' }, { backgroundPosition: '-20% 0', duration: 1.7, ease: 'power2.inOut' }, 1.1);
    tl.fromTo(word.querySelectorAll('.w'), { opacity: 0, y: 34, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, stagger: .04 }, .9);
    tl.fromTo(eb, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'none' }, 1.4);
    c.read('DetailBoost CRM dla studiów auto detailingu', 2.4, 4.8, -1.6);

    // znak odjeżdża w górę, robi miejsce na hasło
    tl.to([word, eb], { opacity: 0, y: -24, filter: 'blur(8px)', duration: .7, ease: 'power2.in', stagger: .05 }, 4.8);
    tl.to(lg, { y: -205, scale: .38, duration: 1.4, ease: 'expo.inOut' }, 4.75);

    const L = [['Cała', 'firma.'], ['Jeden', 'system.'], ['Pełna', 'kontrola.']];
    const sl = c.add(`<div class="abs" style="left:0;right:0;top:300px;text-align:center;font-size:124px;font-weight:620;letter-spacing:-0.058em;line-height:1.02">
      ${L.map((l, i) => `<div>${l.map(w => `<span class="w ${i === 2 ? 'goldt' : 'silver'}">${w}</span>`).join(' ')}</div>`).join('')}</div>`);
    for (let i = 0; i < 3; i++) tl.fromTo(sl.children[i].querySelectorAll('.w'), { opacity: 0, y: 60, filter: 'blur(14px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.3, stagger: .11 }, 5.4 + i * .85);

    // spis rozdziałów: numer w Geist Mono i nazwa, kreska zapala się złotem po kolei
    const mods = ['Statystyki', 'Finanse', 'Pracownicy', 'Kampanie SMS', 'Poczta'];
    const row = c.add(`<div class="abs" style="left:0;right:0;top:800px;display:flex;justify-content:center;gap:34px">${mods.map((m, i) =>
      `<div style="position:relative;width:236px;padding-top:18px;display:grid;grid-template-columns:40px 1fr">
        <span style="position:absolute;left:0;right:0;top:0;height:1px;background:rgba(255,255,255,.16)"></span>
        <span class="gl" style="position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,#ecd08f,#b8873a);transform-origin:0 50%;transform:scaleX(0)"></span>
        <span class="mono" style="font-size:14px;color:#ecd08f;padding-top:3px">${String(i + 1).padStart(2, '0')}.</span>
        <span style="font-size:23px;font-weight:560;letter-spacing:-0.02em;color:#f4f4f2">${m}</span></div>`).join('')}</div>`);
    tl.fromTo(row.children, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, stagger: .09 }, 7.9);
    tl.to(row.querySelectorAll('.gl'), { scaleX: 1, duration: 1, stagger: .18, ease: 'expo.inOut' }, 8.4);
    c.read('Cała firma. Jeden system. Pełna kontrola.', 8.1, 12.7);
    c.read(mods.join(' '), 8.7, 12.7);
    tl.to([sl, row, lg], { opacity: 0, y: -16, filter: 'blur(8px)', duration: .7, ease: 'power2.in', stagger: .04 }, 12.7);
  },
});
