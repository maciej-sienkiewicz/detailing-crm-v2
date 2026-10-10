// ROZDZIAŁ 1: STATYSTYKI — grupy usług, sezonowość, koszty i przychody.
// Każda scena to nagranie prawdziwego CRM (capture/scene-<id>.mjs → rec/<id>/).
// Podpisy kroków są kluczowane id znaczników z nagrania (lib.beat); kwoty w podpisach
// nie są wpisywane - mówi je kadr, podpis mówi, na co patrzeć.

chapter({
  id: 'r1', num: '01', name: 'Statystyki',
  slogan: ['Zarządzaj firmą prościej.', 'Kontroluj więcej.'],
  items: ['Grupy usług', 'Sezonowość', 'Koszty i przychody'],
});

// ── 1.1 GRUPY USŁUG ──────────────────────────────────────────────────────────
recScene({
  id: 'grupy', title: 'Grupy usług', eyebrow: 'Statystyki', num: '01', lines: ['Grupy usług'],
  sub: 'Ile zleceń i za ile.',
  steps: {
    struktura: { step: 'Struktura przychodów', text: 'Udział każdej grupy usług w przychodzie z 12 miesięcy.' },
    uslugi: { step: 'Ile i za ile', text: 'Każda usługa z liczbą zleceń i przychodem.' },
    grupa: { step: 'Jedna grupa', text: 'Kliknięta grupa: jej przychód, liczba zleceń i średnia.', zoom: 1.12 },
    'uslugi-grupy': { step: 'Usługi w grupie', text: 'Lista zawęża się do usług z tej grupy.' },
  },
});

// ── 1.2 SEZONOWOŚĆ ───────────────────────────────────────────────────────────
recScene({
  id: 'sezon', title: 'Sezonowość', eyebrow: 'Statystyki', num: '02', lines: ['Sezonowość'],
  sub: 'Kiedy studio zarabia najwięcej, a kiedy stoi.',
  steps: {
    tygodnie: { step: 'Przychód w czasie', text: 'Przychód i liczba wizyt tydzień po tygodniu.' },
    zakres: { step: 'Zakres', text: 'Ostatnie 12 miesięcy jednym kliknięciem.' },
    rok: { step: 'Cały rok', text: 'Miesiące obok siebie: widać, kiedy zaczyna się sezon.' },
    szczyt: { step: 'Szczyt sezonu', text: 'Najlepszy miesiąc: przychód i liczba wizyt.' },
    dolek: { step: 'Dołek', text: 'Zima: dobry moment na promocję albo urlopy.' },
  },
});

// ── 1.3 KOSZTY I PRZYCHODY ───────────────────────────────────────────────────
recScene({
  id: 'koszty', title: 'Koszty i przychody', eyebrow: 'Statystyki', num: '03', lines: ['Koszty', 'i przychody'],
  sub: 'Koszty prosto z faktur pobranych z KSeF.',
  steps: {
    podsumowanie: { step: 'Finanse', text: 'Przychody, koszty i zysk netto w jednym miejscu.' },
    struktura: { step: 'Na co idą pieniądze', text: 'Koszty z 12 miesięcy podzielone na kategorie.' },
    czas: { step: 'Koszty w czasie', text: 'Miesiąc po miesiącu: widać każdy skok kosztów.' },
    kategorie: { step: 'Kategorie', text: 'Każda kategoria z kwotą i liczbą faktur.' },
  },
});
