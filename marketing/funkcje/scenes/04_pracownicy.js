// ROZDZIAŁ 3: PRACOWNICY — role i uprawnienia, PIN, „Do zrobienia”, urlopy, czas pracy
// i lista obecności. Nagrania prawdziwego CRM (capture/scene-<id>.mjs); urlop i czas
// pracy zaczynają się na telefonie pracownika (osobne konto i osobna sesja przeglądarki).
//
// W aplikacji nie ma odbijania wejścia i wyjścia: czas pracy raportuje się godzinami,
// a lista obecności to dokument generowany z kart pracy.

chapter({
  id: 'r3', num: '03', name: 'Pracownicy',
  slogan: ['Klienci, realizacje, finanse i zespół.', 'Jeden system.'],
  items: ['Role i dostęp', 'Kod PIN', 'Do zrobienia', 'Urlopy', 'Czas pracy'],
});

// ── 3.1 ROLE I UPRAWNIENIA ───────────────────────────────────────────────────
recScene({
  id: 'role', title: 'Role i dostęp', eyebrow: 'Pracownicy', num: '01', lines: ['Role', 'i dostęp'],
  sub: 'Każdy widzi tylko to, czego potrzebuje.',
  steps: {
    role: { step: 'Role', text: 'Rola mówi, co pracownik widzi i co może zmieniać.' },
    uprawnienia: { step: 'Uprawnienia', text: 'Uprawnienia w grupach: wizyty, klienci, ceny.' },
    finanse: { step: 'Finanse zamknięte', text: 'Detailer nie widzi finansów ani cen usług.' },
    zapisana: { step: 'Zapisane', text: 'Zmiana od razu obejmuje wszystkich z tą rolą.' },
  },
});

// ── 3.2 KOD PIN ──────────────────────────────────────────────────────────────
recScene({
  id: 'pin', title: 'Kod PIN', eyebrow: 'Pracownicy', num: '02', lines: ['Jedno urządzenie,', 'wiele osób'],
  sub: 'Przełączenie użytkownika kodem PIN.',
  steps: {
    wybor: { step: 'Kto pracuje', text: 'Na wspólnym tablecie każdy wybiera swój profil.' },
    pin: { step: 'Kod PIN', text: 'Cztery cyfry zamiast hasła.' },
    detailer: { step: 'Swój widok', text: 'Detailer widzi swoje menu: bez finansów i ustawień.' },
  },
});

// ── 3.3 DO ZROBIENIA ─────────────────────────────────────────────────────────
recScene({
  id: 'todo', title: 'Do zrobienia', eyebrow: 'Pracownicy', num: '03', lines: ['Do zrobienia'],
  sub: 'Lista zadań zespołu na Tablicy.',
  steps: {
    lista: { step: 'Lista zadań', text: 'Zadania zespołu na Tablicy, z kontekstem i autorem.' },
    notatka: { step: 'Nowe zadanie', text: 'Tytuł i krótki kontekst.' },
    osoby: { step: 'Dla kogo', text: 'Zadanie widzi tylko wybrana osoba.' },
    dodana: { step: 'Dodane', text: 'Na liście z imieniem osoby, która ma je zrobić.' },
    wykonane: { step: 'Zrobione', text: 'Odhaczone zadanie samo trafi do archiwum.' },
  },
});

// ── 3.4 URLOPY ───────────────────────────────────────────────────────────────
recScene({
  id: 'urlop', title: 'Urlopy', eyebrow: 'Pracownicy', num: '04', lines: ['Urlopy'],
  sub: 'Wniosek z telefonu, decyzja jednym podpisem.', speed: 1.35,
  steps: {
    telefon: { step: 'Telefon pracownika', text: 'Pracownik składa wniosek ze swojego telefonu.' },
    rodzaj: { step: 'Rodzaj urlopu', text: 'Wypoczynkowy, na żądanie, okolicznościowy i inne.' },
    termin: { step: 'Termin', text: 'Pierwszy i ostatni dzień w kalendarzu.' },
    sprawdz: { step: 'Sprawdzenie', text: 'Dni robocze policzone same, z gotowym wnioskiem.' },
    podpis: { step: 'Podpis', text: 'Podpis palcem na wniosku.' },
    wyslany: { step: 'Wysłany', text: 'Wniosek czeka na decyzję kierownika.' },
    czeka: { step: 'Właściciel', text: 'Nowy wniosek czeka w Pracownicy, w Wnioskach urlopowych.' },
    wniosek: { step: 'Wniosek', text: 'Termin, powód i kto jeszcze jest wtedy nieobecny.' },
    decyzja: { step: 'Decyzja', text: 'Zatwierdź albo odrzuć z uzasadnieniem.' },
    'podpis-szefa': { step: 'Podpis decyzji', text: 'Decyzja podpisana na tym samym dokumencie.' },
    kalendarz: { step: 'Nieobecności', text: 'Urlop od razu stoi w kalendarzu nieobecności.' },
    'decyzja-tel': { step: 'Decyzja na telefonie', text: 'Pracownik widzi zatwierdzony urlop u siebie.' },
  },
});

// ── 3.5 CZAS PRACY I LISTA OBECNOŚCI ─────────────────────────────────────────
recScene({
  id: 'obecnosc', title: 'Czas pracy', eyebrow: 'Pracownicy', num: '05', lines: ['Czas pracy', 'i obecność'],
  sub: 'Godziny z telefonu, lista obecności z PDF.', speed: 1.15,
  steps: {
    miesiac: { step: 'Karta pracy', text: 'Pracownik widzi miesiąc i dni bez wpisu.' },
    dzien: { step: 'Godziny', text: 'Dzień i liczba godzin, nic więcej.' },
    wpisane: { step: 'Wpisane', text: 'Godziny dnia na karcie miesiąca.' },
    karty: { step: 'Karty zespołu', text: 'Właściciel widzi karty wszystkich za miesiąc.' },
    karta: { step: 'Karta pracownika', text: 'Dzień po dniu, z nadgodzinami.' },
    zatwierdzona: { step: 'Zatwierdzona', text: 'Karta zatwierdzona jednym kliknięciem.' },
    lista: { step: 'Lista obecności', text: 'Miesiąc i osoby: lista składa się z kart pracy.' },
    pdf: { step: 'PDF', text: 'Gotowa lista obecności do pobrania i podpisu.' },
  },
});
