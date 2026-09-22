# CLAUDE.md — zasady, od których nie ma odstępstw

Ten plik czyta każdy agent AI przed dotknięciem kodu. Jest krótki celowo: zawiera
wyłącznie te reguły, których złamanie kosztuje pieniądze albo zaufanie klienta.
Szersze wytyczne architektoniczne są w `.masterPrompt.txt`.

---

## 1. PIENIĄDZE: brutto, które ktoś ustalił, JEST brutto

> **Kwoty, którą wpisał człowiek, nie wolno policzyć po raz drugi.**
> Liczymy wyłącznie to, czego nikt nie ustalił.

### Dlaczego to jest reguła, a nie preferencja

Przejście brutto → netto → brutto **nie jest tożsamością**. Przy 23% VAT:

```
190000 gr brutto  →  190000 / 1,23 = 154471,54  →  154472 gr netto
154472 gr netto   →  154472 × 1,23 = 190000,56  →  190001 gr brutto
```

Kwota **1900,00 zł jest w tę stronę nieosiągalna**: 154471 gr daje 1899,99 zł,
154472 gr daje 1900,01 zł. Nie istnieje netto w groszach, z którego wyjdzie równo
1900,00 zł brutto. Żadne „lepsze zaokrąglenie" tego nie naprawi — to własność
arytmetyki liczb całkowitych, nie błąd implementacji.

Skutek biznesowy: użytkownik wpisuje 1900,00 zł, zapisuje, wraca — i widzi
1900,01 zł. Cena podana klientowi „pływa". W protokole wydania i na fakturze
oznacza to kwotę inną niż uzgodniona.

### Reguła kierunkowa

| Co wpisał człowiek | Co jest źródłem prawdy | Co wolno policzyć |
|---|---|---|
| **brutto** | brutto — przechowywane dokładnie | netto = `grossToNet(brutto, vat)` |
| **netto**  | netto — przechowywane dokładnie | brutto = `netToGross(netto, vat)` |

Wielkość wpisana przez człowieka jest zapisywana bez zmian i **nigdy** nie jest
odtwarzana z drugiej.

### Jak to robić w kodzie

Cała arytmetyka VAT mieszka w `src/common/utils/priceAdjustment.ts`. Nie pisz
własnej.

```ts
// DOBRZE — dokładne brutto wygrywa, przeliczenie jest ostatecznością
const baseGross = exactBaseGross(line) ?? netToGross(line.basePriceNet, line.vatRate);
const { finalNetCents, finalGrossCents } =
    applyAdjustment(line.basePriceNet, line.vatRate, line.adjustment, baseGross);
const vat = finalGrossCents - finalNetCents;   // VAT to RÓŻNICA pokazanych kwot
```

```ts
// ŹLE — każda z tych linijek zgubi grosz na cenie wpisanej jako brutto
const gross = Math.round(net * (1 + vatRate / 100));
const gross = Math.round((net * (100 + vatRate)) / 100);
const gross = roundTo2((net / 100) * (100 + vatRate) / 100);
const vat   = Math.round((net * vatRate) / 100);        // netto + VAT ≠ brutto
```

`netToGross()` samo w sobie nie jest zakazane — jest **fallbackiem**, wolno go
użyć dopiero wtedy, gdy `exactBaseGross()` zwróci `undefined`. Kierunek odwrotny
(`grossToNet`) jest zawsze w porządku: netto z definicji jest pochodne, gdy cenę
podano w brutto.

### Konsekwencje, o których łatwo zapomnieć

- **VAT to różnica**, nie osobne mnożenie: `vat = brutto − netto`. Inaczej suma
  w jednej linijce się nie zgadza.
- **Edycja unieważnia dokładne brutto.** Kwota przysłana przez serwer dotyczyła
  poprzedniej ceny — po lokalnej zmianie trzeba ją wyzerować, a nie rozlać
  spreadem razem z resztą obiektu.
- **Rabat liczony od netta** (procent, upust netto, ustaw netto) zmienia kwotę
  bazową, więc brutto końcowe **należy** policzyć. Rabat gross-side (`SET_GROSS`,
  `FIXED_GROSS`) i rabat zerowy — nie wolno.
- **Zmiana stawki VAT zachowuje stronę wpisaną** i liczy drugą
  (`repriceForVatRate`, `withVatRate`). Ta sama stawka nie zmienia niczego —
  „przeliczenie na wszelki wypadek" kasuje dokładne brutto. Gdy strony nie da się
  ustalić (`typedPriceSide` zwraca `null`: brutto z cennika równe netto × stawka),
  ekran zachowuje swoje dotychczasowe zachowanie.
- **Dokładne brutto musi przejść przez każdą granicę**: katalog → pozycja
  wyceny → payload API → odczyt z API. Zgubione raz, nie odtworzy się już nigdy.
- **Mapowania odpowiedzi API to miejsce, w którym ginie najczęściej.** Funkcja
  wypisująca pola ręcznie (`services.map(s => ({ id: s.id, basePriceNet: … }))`)
  po cichu wyrzuca `finalPriceGross`, bo nikt o nim nie pomyślał — a wtedy każda
  tabela niżej MUSI odtwarzać brutto z netta i cała naprawa idzie na marne.
  Serwer zwraca `basePriceGross` przy pozycjach rezerwacji i wizyty (od migracji
  V151); przy starszych pozycjach bywa `null` i wtedy dokładne brutto siedzi
  w `finalPriceGross` — wydobywa je `exactBaseGross()`, które sprawdza oba pola.
  Dodając pole do takiego mapowania, sprawdź najpierw, czy nie gubisz kwoty.

### Wzorce do skopiowania

- `src/common/utils/priceAdjustment.ts` — `exactBaseGross`, `applyAdjustment`,
  `resolveBaseGross` (cena ręczna: baza 0 + SET_*), `typedPriceSide`,
  `repriceForVatRate`, `withVatRate`
- `src/modules/visits/utils/servicePriceEdits.ts` — edycja cen wizyty: okno ceny,
  rabat i VAT zbiorczy, sumy, payload z `basePriceGross`
- `src/modules/appointments/hooks/useServicePricing.ts` — wycena pozycji i sumy
- `src/modules/checkin/components/SummaryStep.tsx` — podsumowanie protokołu
- `src/modules/checkin/utils/toCheckInServiceLine.ts` — przeniesienie dokładnego
  brutta przez granicę API (wzorzec dla każdego mapowania odpowiedzi)
- Backend: `AppointmentLineItem.create(basePriceGross = …)`, `Visit.calculateFinalGross`

### Testy, które tego pilnują

- `src/common/utils/priceAdjustment.test.ts` → `exactBaseGross`, „cena wpisana
  jako brutto nie pływa"
- `src/modules/appointments/hooks/useServicePricing.test.ts` → odtworzenie
  zgłoszenia z produkcji (154472 gr / 23% / rabat zerowy → **190000**, nie 190001)
- `src/modules/checkin/utils/toCheckInServiceLine.test.ts` → brutto przeżywa
  granicę API; brak brutta daje `undefined`, a nie zmyśloną kwotę
- `src/modules/visits/utils/servicePriceEdits.test.ts` i
  `src/modules/visits/components/ServiceInlineRow.test.tsx` → brutto wpisane
  w wykazie usług wizyty dochodzi do payloadu; VAT zbiorczy nie rusza pozycji
  z tą samą stawką; podgląd rabatu = zapis

**Nie osłabiaj tych testów, żeby przepuścić zmianę.** Jeśli test zaczyna
przeszkadzać, to zmiana jest zła, a nie test.

### Zlecenie stałe

Gdy natrafisz na kod łamiący tę regułę — **napraw go**, nie tylko opisz. Jeśli
naprawa wykracza daleko poza zadanie, przy którym stoisz: napraw to, czego
dotykasz, a resztę wypisz wprost w odpowiedzi, z plikami i liniami. Nigdy nie
zostawiaj tego milcząco.

---

## 2. HIERARCHIA: jedno wypełnienie na okno

> **W jednym oknie dokładnie JEDNA rzecz jest wypełniona kolorem.**
> Jest nią krok następny. Wszystko inne nosi swój odcień jako tło i obwódkę.

### Dlaczego to jest reguła, a nie preferencja

Kolor w tym interfejsie niesie dwie różne rzeczy naraz i łatwo je pomylić:

| Nośnik | Co znaczy | Przykład |
|---|---|---|
| **Odcień** | ZNACZENIE | zielony = „tak / domknięte", bursztyn = „przeczytaj", błękit = „lead", czerwień = „nieodwracalne" |
| **Wypełnienie** | PRIORYTET | wypełniony = „to zrób teraz"; tło + obwódka = „to jest dostępne" |

Gdy dwa elementy są wypełnione, użytkownik nie ma czym rozstrzygnąć, który jest
ważniejszy — i pyta „na co mam najpierw patrzeć". Tak właśnie zepsuł się podgląd
leada: „Akceptuj" przy sugestii AI dostał wypełnioną zieleń, a przy trzech
propozycjach dawało to trzy nasycone bloki w szynie kontra jeden przycisk kroku
następnego w stopce. Akcja DRUGORZĘDNA i opcjonalna wygrywała liczbą,
powierzchnią i pozycją.

### Czego ta reguła NIE znaczy

Nie znaczy „mniej kolorów". Odbieranie barw robi interfejs smutnym i gubi
znaczenia, które odcień niesie za darmo. Wszystkie kolory zostają — znika tylko
REMIS o pierwsze miejsce.

### Jak to robić w kodzie

```ts
// DOBRZE — akcja drugorzędna: odcień zostaje, wypełnienia nie ma
border: 1px solid #86efac;
background: ${p => p.theme.colors.successLight};
color: #15803d;
```

```ts
// ŹLE — drugi wypełniony przycisk w tym samym oknie
background: ${p => p.theme.colors.success};
color: #ffffff;
```

Wypełnione zostają wyłącznie: `PrimaryButton` / `FooterPrimary` (krok następny)
oraz stany krytyczne wymagające natychmiastowej reakcji. Zanim wypełnisz cokolwiek
innego, policz, ile wypełnień jest już w tym oknie — i ile ich będzie, gdy lista
pod spodem ma trzy pozycje zamiast jednej.

Jeden wyjątek: **otwarty edytor** (wycena, pojazd, usługi, notatka) przejmuje
okno, więc jego „Zapisz" jest na ten moment krokiem następnym i wolno mu być
wypełnionym. Wyjątek działa, bo edytor jest stanem PRZEJŚCIOWYM i sam znika —
nie wolno go rozciągać na elementy widoczne stale.

### Czego ta reguła NIE znaczy, część druga

Nie znaczy „akcja główna ma być skromna". Zakazany jest REMIS, a nie zwycięstwo.
Jedyny wypełniony element w oknie wolno — i należy — zbudować tak, żeby nie dało
się go pomylić z „Zapisz": dwie linie (co się stanie + dokąd to prowadzi), kafelek
ikony, gradient marki, cień w kolorze marki, strzałka reagująca na kursor. Dopóki
jest JEDEN, im mocniejszy, tym lepiej działa reguła — bo tym szybciej wzrok kończy
szukanie. Wzorzec: `FooterPrimary` w `LeadDetailModal.tsx`.

### Trzeci nośnik: WYNIESIENIE niesie TEMAT

| Nośnik | Co znaczy |
|---|---|
| **Odcień** | ZNACZENIE treści |
| **Wypełnienie** | PRIORYTET akcji |
| **Wyniesienie** | TEMAT okna |

W jednej kolumnie treści dokładnie JEDNA sekcja leży na własnej powierzchni
(biel/gradient, promień `xl`, dwa cienie, pasek marki u góry). Reszta leży płasko
na tle i rozdziela ją odstęp. Dwie wyniesione karty znaczą dokładnie tyle samo co
dwa wypełnione przyciski — czyli nic.

Stąd bierze się też odpowiedź na „wszystko jest takie płaskie i tekstowe": płaskość
NIE jest brakiem koloru i nie naprawia jej dosypanie barwy. Bierze się z tego, że
każda sekcja jest tą samą ramą — kreska, etykieta 11 px wersalikami w szarości,
tekst — więc nic w kolumnie nie jest PRZEDMIOTEM. Lekarstwem są: materiał (dwa
plany zamiast pięciu identycznych ram), typografia nagłówka (nazwa pismem
tekstowym z kafelkiem ikony zamiast podpisu pola) i hierarchia liczby (kwota, po
którą się wraca, jest nagłówkiem sekcji, a rozpisanie na pozycje — dowodem pod
nią). Wersaliki 11 px w `textMuted` jako JEDYNY sposób oznaczenia sekcji są w tym
repozytorium wycofane wszędzie tam, gdzie były jedyną ramą sekcji — w podglądzie
leada (`LeadDetailModal`, `SuggestedServiceRows`, `SimilarVisitsSection`) nie ma
już ani jednego. Reszta modułu `comms` jeszcze je ma; przy okazji dotykania tych
plików idą tą samą drogą.

### Kolejność czytania

Podgląd leada ma jedną kolejność, w panelu i w oknie modalnym:
**o co pyta klient → co mu proponujemy → co z tym zrobić**. Przebieg sprawy po
lewej, wycena i szyna po prawej. Na telefonie jest odwrotnie i to jest świadome:
tam „kolejność" znaczy „ile trzeba przewinąć", a nie „gdzie pada wzrok".

---

## 3. SCROLL: blokadę przewijania tła wolno założyć tylko przez `acquireScrollLock()`

> **Nikomu nie wolno pisać po `document.body.style` ani po stylach `<html>`
> na własną rękę.** Jedynym właścicielem blokady scrolla jest
> `src/common/utils/scrollLock.ts`.

### Dlaczego to jest reguła, a nie preferencja

Wzorzec „zapisz poprzedni styl → nadpisz → przywróć zapisany" jest poprawny
w izolacji i błędny przy nakładających się oknach. Okno otwarte NAD innym
zapamiętuje `hidden` jako „stan do przywrócenia" — a React odmontowuje efekty
od rodzica w dół, więc modal + jego potwierdzenie zamykane jednym kliknięciem
sprzątają w kolejności odwrotnej do otwierania. To okno, które sprząta
ostatnie, przywraca `hidden` i dokument zostaje zablokowany NA STAŁE.

Skutek biznesowy: zgłoszenie „strona się blokuje, nie reaguje na scroll na
komputerze ani na telefonie, pomaga dopiero odświeżenie". Błąd nie zostawia
śladu w konsoli i nie da się go złapać po fakcie, bo F5 czyści style inline —
dowód znika razem z objawem. Zanim blokadę scentralizowano, w kodzie żyło
SZEŚĆ niezależnych wariantów tego wzorca, z trzema różnymi wartościami
„odblokowania" (`prev`, `'unset'`, `''`).

### Jak to robić w kodzie

```ts
// DOBRZE — blokada ze zliczaniem referencji, odporna na kolejność zamykania
useEffect(() => {
    if (!isOpen) return;
    return acquireScrollLock();          // menu mobilne: acquireScrollLock('fixed')
}, [isOpen]);
```

```ts
// ŹLE — każda z tych linijek prędzej czy później zamrozi stronę
document.body.style.overflow = 'hidden';
document.body.style.overflow = 'unset';
document.documentElement.style.overflow = prev;
```

Zasady szczegółowe:

- **Okna budowane na `ModalShell` / `useModalViewport` mają blokadę w cenie** —
  nie dokładaj drugiej. Własna nakładka poza ModalShell woła `acquireScrollLock()`
  sama, wprost z efektu, i oddaje zwróconą funkcję jako cleanup.
- **Wariant `'fixed'`** (twarde `position: fixed` na `<body>`, dla menu
  mobilnego i pełnoekranowych nakładek dotykowych) też przechodzi przez ten
  moduł — sam zdejmuje się we właściwym momencie i wraca do zapamiętanej
  pozycji scrolla.
- **Blokada żyje w osobnym efekcie zależnym tylko od `isOpen`**, nigdy w jednym
  efekcie z obsługą klawiatury zależną od callbacków rodzica: restart takiego
  efektu przy każdym renderze zwalnia i zakłada blokadę w pętli.
- **Siatka bezpieczeństwa**: `ScrollLockRouteReset` w routerze zwalnia wszystkie
  blokady po zmianie ścieżki. Nie jest to licencja na brak cleanupu — chroni
  przed awarią, nie przed niechlujstwem.

### Wzorce do skopiowania

- `src/common/utils/scrollLock.ts` — moduł blokady i pełne uzasadnienie
- `src/common/hooks/useModalViewport.ts` — użycie w oknie modalnym
- `src/widgets/Sidebar/context/SidebarContext.tsx` — wariant `'fixed'` (menu mobilne)

### Testy, które tego pilnują

- `src/common/utils/scrollLock.test.tsx` → nakładające się blokady w obu
  kolejnościach zwalniania, idempotentny release, wariant `'fixed'`
- `src/common/hooks/useModalViewport.test.tsx` → odtworzenie zgłoszenia
  z produkcji: modal + potwierdzenie odmontowane jednym kliknięciem nie
  zostawiają `overflow: hidden`

**Nie osłabiaj tych testów, żeby przepuścić zmianę.**

### Zlecenie stałe

Gdy natrafisz na kod piszący po stylach scrolla `<body>`/`<html>` poza
`scrollLock.ts` — przepnij go na `acquireScrollLock()`, nie tylko opisz.
Dotyczy to także kodu wklejanego z bibliotek i przykładów: wzorzec
„save/restore overflow" wygląda niewinnie i właśnie dlatego wraca.

---

## 4. Uwaga o `.masterPrompt.txt`

`.masterPrompt.txt` zawiera wytyczne architektoniczne, ale jeden jego punkt jest
sprzeczny z kodem: „Zero-Comment Policy". Realna konwencja tego repozytorium jest
odwrotna — komentarze niosą UZASADNIENIE decyzji („dlaczego tak, a nie inaczej",
„co poszło źle poprzednio"), nie opis składni. Pisz jak otoczenie pliku, który
zmieniasz.
