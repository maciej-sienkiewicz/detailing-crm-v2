// ROZDZIAŁ 2: FINANSE — KSeF na bieżąco, ukrywanie faktury, dokumenty spoza KSeF, kasa,
// faktura przy wydaniu pojazdu. Nagrania prawdziwego CRM (capture/scene-<id>.mjs).
//
// Kwoty wg CLAUDE.md: kwota wpisana w brutto zostaje brutto, netto jest z niej liczone,
// VAT to różnica - tak liczy formularz w nagraniu „reczne” (1 230,00 zł → netto 1 000,00 zł).

chapter({
  id: 'r2', num: '02', name: 'Finanse',
  slogan: ['Mniej chaosu.', 'Więcej kontroli nad biznesem.'],
  items: ['Faktury z KSeF', 'Ukryj ze statystyk', 'Dokumenty spoza KSeF', 'Stan kasy', 'Faktura przy wydaniu'],
  dur: 10.8,
});

// ── 2.1 KSeF NA BIEŻĄCO ──────────────────────────────────────────────────────
recScene({
  id: 'ksef', title: 'Faktury z KSeF', eyebrow: 'Finanse', num: '01', lines: ['Faktury kosztowe', 'z KSeF'],
  sub: 'Same trafiają do CRM, na bieżąco.',
  steps: {
    lista: { step: 'Dokumenty kosztowe', text: 'Faktury od dostawców pobrane z KSeF, z kategorią i statusem płatności.' },
    nowe: { step: 'Nowe faktury', text: 'Synchronizacja dokłada nowe faktury bez przepisywania.' },
    oplacona: { step: 'Opłacona', text: 'Jedno kliknięcie i faktura jest oznaczona jako opłacona.' },
  },
});

// ── 2.2 UKRYJ ZE STATYSTYK ───────────────────────────────────────────────────
recScene({
  id: 'ukryj', title: 'Ukryj ze statystyk', eyebrow: 'Finanse', num: '02', lines: ['Ukryj', 'ze statystyk'],
  sub: 'Jednorazowy wydatek nie psuje wykresów.',
  steps: {
    zawyzone: { step: 'Zawyżony miesiąc', text: 'Wykup auta po leasingu wywindował koszty miesiąca.' },
    wykup: { step: 'Ta faktura', text: 'W Finansach: faktura za wykup dostaje „Ukryj ze statystyk”.' },
    ukryta: { step: 'Ukryta', text: 'Faktura zostaje w dokumentach, ale nie liczy się do statystyk.' },
    po: { step: 'Po zmianie', text: 'Koszty miesiąca wracają do normalnego poziomu.' },
  },
});

// ── 2.3 DOKUMENTY SPOZA KSeF ─────────────────────────────────────────────────
recScene({
  id: 'reczne', title: 'Dokumenty spoza KSeF', eyebrow: 'Finanse', num: '03', lines: ['Paragony', 'i dokumenty'],
  sub: 'Wszystko, czego nie ma w KSeF.', speed: 1.2,
  steps: {
    okno: { step: 'Nowy dokument', text: 'Paragon ze sklepu: rodzaj, czego dotyczy i sprzedawca.' },
    kwota: { step: 'Kwota z paragonu', text: 'Wpisujesz brutto z paragonu, netto liczy się samo.' },
    zapisany: { step: 'Na liście', text: 'Paragon stoi obok faktur z KSeF i liczy się do kosztów.' },
  },
});

// ── 2.4 STAN KASY ────────────────────────────────────────────────────────────
recScene({
  id: 'kasa', title: 'Stan kasy', eyebrow: 'Finanse', num: '04', lines: ['Stan kasy'],
  sub: 'Gotówka w szufladzie zawsze się zgadza.',
  steps: {
    saldo: { step: 'Saldo', text: 'Ile gotówki powinno być teraz w kasie.' },
    historia: { step: 'Historia', text: 'Wpłaty za wizyty zapisują się same przy wydaniu auta.' },
    wyplata: { step: 'Wypłata', text: 'Wypłata z kasy z opisem: saldo od razu się zmienia.' },
  },
});

// ── 2.5 FAKTURA PRZY WYDANIU ─────────────────────────────────────────────────
recScene({
  id: 'faktura', title: 'Faktura do KSeF', eyebrow: 'Finanse', num: '05', lines: ['Faktura', 'przy wydaniu'],
  sub: 'Zamykasz wizytę, faktura idzie do KSeF.', speed: 1.25,
  steps: {
    ready: { step: 'Auto gotowe', text: 'Wizyta oznaczona jako gotowa do odbioru.' },
    notify: { step: 'SMS do klienta', text: 'Klient dostaje SMS, że może odebrać auto.' },
    protocol: { step: 'Protokół wydania', text: 'Protokół wydania idzie do podpisu na telefon klienta.' },
    document: { step: 'Telefon klienta', text: 'Klient czyta protokół u siebie, bez papieru.' },
    sign: { step: 'Podpis', text: 'Oświadczenie i podpis palcem.' },
    // „signed” to ostatnia klatka telefonu tuż przed cięciem (ten sam czas co „back”)
    back: { step: 'Podpisane', text: 'Wydanie od razu widzi podpisany protokół.' },
    invoice: { step: 'Faktura VAT', text: 'Faktura z pozycji wizyty, z wysyłką do KSeF.' },
    ksef: { step: 'W KSeF', text: 'Faktura w Finansach ze statusem „W KSeF”.' },
    qr: { step: 'Kod QR', text: 'Kod weryfikacyjny KSeF na fakturze.' },
  },
});
