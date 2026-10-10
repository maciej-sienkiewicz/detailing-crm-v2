// ROZDZIAŁ 5: POCZTA — stopki, zapytania (leady) z ofertą pisaną z asystentem i filtr
// poczty. Nagrania prawdziwego CRM (capture/scene-<id>.mjs). Leady i Poczta są w aplikacji
// jedną skrzynką „Zapytania” (zakładki „Sprawy”, „Poczta”, „Wysłane”).
//
// Szkic „Napisz z AI” w nagraniu „lead” jest podstawiony w przeglądarce (lokalnie nie ma
// klucza OpenAI) w kształcie odpowiedzi serwera i z kwotami wyceny leada - patrz
// capture/scene-lead.mjs. Wszystko inne, z wysyłką maila, to prawdziwy CRM.

chapter({
  id: 'r5', num: '05', name: 'Poczta',
  slogan: ['Twój biznes uporządkowany', 'w jednym miejscu.'],
  items: ['Szablony stopek', 'Zapytania i oferta z AI', 'Filtr poczty'],
});

// ── 5.1 SZABLONY STOPEK ──────────────────────────────────────────────────────
recScene({
  id: 'stopka', title: 'Szablony stopek', eyebrow: 'Poczta', num: '01', lines: ['Szablony', 'stopek'],
  sub: 'Firmowa stopka pod każdym mailem.', speed: 1.15,
  steps: {
    motywy: { step: 'Motyw', text: 'Gotowe motywy stopki: klasyczna, ze zdjęciem, z logo.' },
    dane: { step: 'Dane', text: 'Imię, stanowisko i kontakt, podgląd zmienia się na żywo.' },
    styl: { step: 'Styl', text: 'Kolor marki i krój pisma.' },
    podglad: { step: 'Logo', text: 'Logo studia i gotowa stopka w podglądzie maila.' },
    'w-mailu': { step: 'W odpowiedzi', text: 'Stopka dokleja się sama do każdej odpowiedzi.' },
  },
});

// ── 5.2 ZAPYTANIA I OFERTA Z AI ──────────────────────────────────────────────
recScene({
  id: 'lead', title: 'Zapytania i oferta', eyebrow: 'Poczta', num: '02', lines: ['Zapytanie,', 'wycena, oferta'],
  sub: 'Od maila klienta do oferty.', speed: 1.2,
  steps: {
    sprawy: { step: 'Czeka na nas', text: 'Każde zapytanie to sprawa, z czasem oczekiwania na odpowiedź.' },
    mail: { step: 'Mail klienta', text: 'Klient pyta o korektę lakieru i powłokę na konkretny termin.' },
    klient: { step: 'Stały klient', text: 'CRM rozpoznaje klienta i pokazuje jego historię wizyt.' },
    sugestie: { step: 'Sugerowane usługi', text: 'Usługi z cennika wyczytane z treści maila.' },
    wycena: { step: 'Wycena', text: 'Zaakceptowane sugestie składają się w wycenę sprawy.' },
    ai: { step: 'Napisz z AI', text: 'Asystent pisze odpowiedź, z ofertą albo bez.' },
    oferta: { step: 'Oferta', text: 'Do szkicu idą usługi i ceny z wyceny.' },
    szkic: { step: 'Szkic', text: 'Gotowa odpowiedź z cenami i terminem, do przeczytania i poprawy.' },
    wyslane: { step: 'U klienta', text: 'Wysłana z poczty CRM: sprawa czeka teraz na klienta.' },
  },
});

// ── 5.3 FILTR POCZTY ─────────────────────────────────────────────────────────
recScene({
  id: 'filtr', title: 'Filtr poczty', eyebrow: 'Poczta', num: '03', lines: ['Filtr', 'poczty'],
  sub: 'Reklamy osobno, zapytania na wierzchu.',
  steps: {
    poczta: { step: 'Poczta', text: 'Zapytania oznaczone jako sprawa, reszta zwykłej poczty pod nimi.' },
    automaty: { step: 'Powiadomienia i reklamy', text: 'Newslettery i powiadomienia zwinięte w jeden wiersz.' },
    odrzucone: { step: 'Odrzucone przez automat', text: 'Spam z formularza nie zaśmieca spraw.' },
    pomylka: { step: 'Sprawdź', text: 'Każde odrzucenie ma powód, który da się sprawdzić.' },
    lead: { step: 'To jednak lead', text: 'Jedno kliknięcie i zgłoszenie wraca jako sprawa z usługą.' },
    sprawa: { step: 'Sprawa', text: 'Zapytanie z wyceną na liście spraw.' },
  },
});
