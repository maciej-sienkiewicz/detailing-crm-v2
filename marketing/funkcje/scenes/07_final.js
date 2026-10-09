// FINAŁ: „Pełna kontrola nad firmą. Z każdego miejsca.” na trzech urządzeniach →
// „Jedno miejsce. Wszystkie procesy. Pełna kontrola.” → znak i adres.

// miniatura Tablicy: ten sam układ na każdym urządzeniu, inna szerokość
function miniBoard(narrow) {
  const kpi = (l, v, col) => `<div style="flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;border-top:3px solid ${col}">
    <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#94a3b8">${l}</div><div class="num" style="font-size:${narrow ? 20 : 24}px;font-weight:800;margin-top:4px;color:#0f172a">${v}</div></div>`;
  const visits = [['08:00', 'Porsche 911 Carrera 4S', 'Powłoka ceramiczna', 'W trakcie'], ['10:30', 'Audi A6 Avant', 'Pranie tapicerki', 'Przyjęty'], ['13:00', 'BMW X5', 'Korekta lakieru', 'Rezerwacja']];
  return `<div style="font-family:InterV;color:#0f172a;padding:${narrow ? '18px 16px' : '24px 26px'}">
    <div style="font-size:${narrow ? 22 : 26}px;font-weight:750;letter-spacing:-0.02em">Dzień dobry, Anna</div><div style="font-size:13px;color:#64748b;margin-top:2px">Piątek, 9 października</div>
    <div style="display:flex;gap:10px;margin-top:16px;${narrow ? 'flex-direction:column' : ''}">${kpi('Przychód dziś', '4 980 zł', '#10b981')}${kpi('Wizyty dziś', '6', '#0ea5e9')}${narrow ? '' : kpi('Zapytania', '3', '#8b5cf6')}</div>
    <div style="margin-top:14px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:6px 14px">${visits.map(([h, a, s, st]) =>
      `<div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:13.5px"><b class="num" style="width:44px">${h}</b><span style="flex:1;min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a}</b><span style="color:#64748b">${s}</span></span>${narrow ? '' : `<span class="bdg gray" style="height:22px;font-size:12px">${st}</span>`}</div>`).join('')}</div></div>`;
}

scene({
  id: 'final', title: 'Finał', dur: 21.5, noOut: true,
  build(c) {
    const { tl } = c;
    c.bg({ stage: [960, 640, 1700, 900] });

    const s1 = c.add(`<div class="abs" style="left:0;right:0;top:96px;text-align:center;font-size:80px;font-weight:620;letter-spacing:-0.052em;line-height:1.02">
      <div>${'Pełna kontrola nad firmą.'.split(' ').map(w => `<span class="w silver">${w}</span>`).join(' ')}</div>
      <div>${'Z każdego miejsca.'.split(' ').map(w => `<span class="w goldt">${w}</span>`).join(' ')}</div></div>`);
    c.words(s1, .6, { stagger: .09, y: 40 });
    c.read('Pełna kontrola nad firmą. Z każdego miejsca.', 2.2, 8.0);

    const dev = c.add('<div class="persp"><div class="rig"></div></div>').firstChild;
    // laptop: oprawa jak okno na stronie, pod spodem podstawa
    const lap = c.add(`<div class="abs" style="left:520px;top:340px;width:880px;height:560px">
      <div class="win" style="left:0;top:0;width:880px;height:540px"><div class="body">${sidebar('Tablica', [['Tablica', 'grid'], ['Czas pracy', 'clock'], '|Praca', ['Wizyty', 'car'], ['Kalendarz', 'cal'], '|Klienci i zapytania', ['Zapytania', 'inbox'], ['Klienci', 'users'], '|Firma', ['Finanse', 'wallet'], ['Statystyki', 'chart']])}
        <div class="main" style="padding:0">${miniBoard(false)}</div></div></div>
      <div class="abs" style="left:-60px;right:-60px;top:538px;height:18px;border-radius:0 0 18px 18px;background:linear-gradient(#2a2a30,#121216);box-shadow:0 30px 60px -10px #000"></div></div>`, dev);
    const tab = c.add(`<div class="abs" style="left:96px;top:480px;width:400px;height:540px;border-radius:34px;padding:14px;background:linear-gradient(145deg,#3b3b42,#16161a 40%,#2a2a30);box-shadow:inset 0 0 0 1px #55555e,0 50px 100px -30px #000">
      <div style="width:100%;height:100%;border-radius:22px;overflow:hidden;background:#eef2f7">${miniBoard(true)}</div></div>`, dev);
    const ph = c.add(`<div class="abs" style="left:1440px;top:440px;width:300px;height:610px;border-radius:48px;padding:10px;background:linear-gradient(145deg,#3b3b42,#16161a 40%,#2a2a30);box-shadow:inset 0 0 0 1px #55555e,0 50px 100px -30px #000,0 0 120px -40px rgba(220,174,92,.3)">
      <div style="position:relative;width:100%;height:100%;border-radius:39px;overflow:hidden;background:#eef2f7;padding-top:34px">
        <div style="position:absolute;left:50%;top:9px;width:90px;height:26px;margin-left:-45px;border-radius:14px;background:#000"></div>${miniBoard(true)}</div></div>`, dev);
    c.enter(lap, 1.2, { y: 80 });
    tl.fromTo(tab, { opacity: 0, x: -80, rotateY: 18 }, { opacity: 1, x: 0, rotateY: 0, duration: 1.6 }, 1.7);
    tl.fromTo(ph, { opacity: 0, x: 80, rotateY: -18 }, { opacity: 1, x: 0, rotateY: 0, duration: 1.6 }, 1.9);
    // urządzenia unoszą się nierówno — trzy osobne przedmioty, nie jeden obrazek
    tl.to(lap, { y: -10, duration: 6, ease: 'sine.inOut' }, 2.8);
    tl.to(tab, { y: -18, duration: 6, ease: 'sine.inOut' }, 3.1);
    tl.to(ph, { y: -24, duration: 6, ease: 'sine.inOut' }, 3.3);
    tl.to(s1, { opacity: 0, y: -20, filter: 'blur(8px)', duration: .7, ease: 'power2.in' }, 8.0);
    tl.to([tab, lap, ph], { opacity: 0, y: 60, scale: .94, filter: 'blur(10px)', duration: .9, ease: 'power2.in', stagger: .06 }, 8.0);

    const L = [['Jedno', 'miejsce.'], ['Wszystkie', 'procesy.'], ['Pełna', 'kontrola.']];
    const s2 = c.add(`<div class="abs" style="left:0;right:0;top:300px;text-align:center;font-size:124px;font-weight:620;letter-spacing:-0.058em;line-height:1.02">
      ${L.map((l, i) => `<div>${l.map(w => `<span class="w ${i === 2 ? 'goldt' : 'silver'}">${w}</span>`).join(' ')}</div>`).join('')}</div>`);
    for (let i = 0; i < 3; i++) tl.fromTo(s2.children[i].querySelectorAll('.w'), { opacity: 0, y: 60, filter: 'blur(14px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.3, stagger: .11 }, 8.9 + i * .7);
    c.read('Jedno miejsce. Wszystkie procesy. Pełna kontrola.', 11.5, 15.6);
    tl.to(s2, { opacity: 0, scale: .97, filter: 'blur(10px)', duration: .7, ease: 'power2.in' }, 15.6);

    const lg = c.add(`<div class="abs" style="left:790px;top:300px;width:340px;height:172px">
      <img src="../showreel/a/logo.png" style="width:340px;height:172px;display:block">
      <div class="sw" style="position:absolute;inset:0;-webkit-mask:url(../showreel/a/logo.png) center/100% 100% no-repeat;mask:url(../showreel/a/logo.png) center/100% 100% no-repeat;
        background:linear-gradient(105deg, transparent 40%, rgba(255,250,228,.95) 50%, transparent 60%) no-repeat;background-size:300% 100%;background-position:120% 0"></div></div>`);
    const wm = c.add('<div class="abs silver" style="left:0;right:0;top:500px;text-align:center;font-size:96px;font-weight:620;letter-spacing:-0.055em">DetailBoost</div>');
    const url = c.add(`<div class="abs mono" style="left:0;right:0;top:640px;display:flex;justify-content:center;align-items:center;gap:16px;font-size:18px;letter-spacing:.22em;color:#ecd08f">
      <span style="width:30px;height:1px;background:linear-gradient(90deg,transparent,#dcae5c)"></span>DETAILBOOST.PL<span style="width:30px;height:1px;background:linear-gradient(270deg,transparent,#dcae5c)"></span></div>`);
    tl.fromTo(lg, { opacity: 0, scale: .92, filter: 'blur(16px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.8 }, 16.1);
    tl.fromTo(lg.querySelector('.sw'), { backgroundPosition: '120% 0' }, { backgroundPosition: '-20% 0', duration: 1.6, ease: 'power2.inOut' }, 16.9);
    tl.fromTo(wm, { opacity: 0, y: 26, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.3 }, 16.5);
    tl.fromTo(url, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'none' }, 17.1);
    c.read('DetailBoost detailboost.pl', 17.8, 21.0);
  },
});
