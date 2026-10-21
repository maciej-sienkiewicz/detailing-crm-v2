# Rezerwacja z kalendarza (QuickEventModal) — audyt intuicyjności i spójności

Data: 21.10.2026. Zakres: okno „Nowa rezerwacja” otwierane z kalendarza i z leada
(`BookingFlowModal`), na komputerze i na telefonie, wraz z oknami pomocniczymi
(nowa usługa, cena usługi, nowy kolor, cykliczność, SMS). Porównanie z edycją rezerwacji
(`/appointments/:id/edit`), przyjęciem pojazdu (`/checkin/new`, `VerificationStep`)
i z zasadami z `CLAUDE.md`.

Metoda: przeczytany cały kod okna i ścieżki zapisu (render 2474 linii, hook 1215, style
2209, okna pomocnicze, `buildAppointmentPayload`, backend serii rezerwacji). Błędy
oznaczone **[potwierdzone]** sprawdzono testem na hooku formularza albo kodem backendu.
Niczego nie zmieniono w kodzie.

---

## 1. Werdykt w trzech zdaniach

1. Na komputerze okno jest szybkie i przemyślane (inline wyszukiwanie klienta, auto-wybór
   jedynego auta, klawiatura w liście usług, podgląd serii), ale ma kilka pułapek, które
   gubią dane albo wysyłają coś innego, niż widać.
2. Na telefonie okno jest **inną aplikacją**: brak wyboru auta klienta, brak „Całego dnia”
   i „Cyklicznej”, inna logika SMS — i dwa z tych braków kończą się złym zapisem.
3. Stylistycznie okno żyje poza systemem projektowym: ~380 kolorów wpisanych na sztywno,
   zero tokenów `ui`, własne przyciski, przełączniki i checkboksy, kolor głównego przycisku
   zależny od koloru rezerwacji.

---

## 2. Mapa funkcji

| # | Funkcja | Komputer | Telefon | Ocena |
|---|---|---|---|---|
| 0 | Tytuł rezerwacji | pole w nagłówku, autofocus | osobna sekcja „Tytuł rezerwacji” | OK; Enter w tytule wysyła formularz |
| 1 | Termin | `DateRangePicker` początek/koniec | dwa `DateTimePicker` | OK; koniec przesuwa się za początkiem |
| 1a | Cały dzień | przełącznik | **brak** | ✗ niedostępne na telefonie |
| 1b | Cykliczna | przełącznik + panel boczny | **brak** (panel ma style mobilne, ale nie da się go otworzyć) | ✗ |
| 2 | Klient: wyszukiwanie / nowy | 4 pola + lista „Istniejący klienci / Dodaj nowego” | 4 pola + podpowiedzi pod polem | OK |
| 2a | Klient: edycja wybranego | ołówek → „Zatwierdź zmiany / Anuluj” | „Zmień klienta” czyści wszystko | różne modele na dwóch ekranach |
| 3 | Pojazd: auta klienta | lista „Pojazdy klienta”, auto-wybór jedynego | **brak listy** | ✗ błąd zapisu (§3.1) |
| 3a | Pojazd: nowy | marka/model/rok + rodzaj | marka/model/rok + rodzaj | OK; **brak tablicy rejestracyjnej** |
| 3b | Pojazd: edycja wybranego | kod jest, **przycisku nie ma** | — | martwa funkcja (§7) |
| 4 | Usługi | wyszukiwarka z klawiaturą, „Utwórz „…””, tabela `ServicesTable` | arkusz „Wybierz usługę” | OK; brak oznaczenia „wymagane” |
| 4a | Nowa usługa | `QuickServiceModal` | to samo | cena 0 zł przechodzi bez pytania |
| 4b | Cena ręczna | `PriceInputModal` | to samo | „Potwierdź cenę” przy pustych polach = 0 zł |
| 5 | Notatki | textarea | za przyciskiem „Szczegóły” | OK |
| 6 | Door to door | własny przełącznik + 2 adresy + uwagi | to samo | działa, ale styl obcy (§6) |
| 7 | SMS | 3 checkboksy w wierszu bez nagłówka | wiersz-podsumowanie + arkusz | ✗ niespójne i na telefonie mylące (§3.2) |
| 8 | Kolor w kalendarzu | 5 próbek w stopce + „+N” + „Dodaj kolor” | `ColorDropdown` w sekcji Termin | dwa różne kontrolki tego samego pola |
| 9 | Wyczyść wszystko | przycisk w stopce, bez potwierdzenia | **brak** | — |
| 10 | Zapis | „Zapisz rezerwację” w kolorze rezerwacji | `FooterPrimaryButton` w kolorze marki | brak komunikatu o sukcesie (§5) |

---

## 3. Błędy, które zmieniają zapis (P1)

### 3.1 Telefon: pojazd klienta gubi się albo zapisuje się zły — **[potwierdzone testem]**

Na telefonie sekcja „Dane pojazdu” ma zawsze tylko pola marka/model/rok
(`QuickEventModal/index.tsx:1458`). Lista aut klienta i tryb „dodaję nowe auto” istnieją
tylko na komputerze, a zapis (`useQuickEventForm.ts:656`) czyta właśnie ten tryb:

| Sytuacja na telefonie | Co widzi użytkownik | Co idzie do serwera |
|---|---|---|
| Klient ma **2+ auta**, wpisano „Porsche 911” | wpisane auto | `vehicle: NONE` — auto znika |
| Klient ma **1 auto** (BMW X5, wybrane automatycznie), zmieniono na „Porsche 911” | Porsche 911 w polach | `vehicle: EXISTING car-1` — zapisuje się BMW |

Poprawka: na telefonie pokazać auta klienta (lista jak na komputerze albo
`VehicleSearchModal` z przyjęcia pojazdu), a gdy użytkownik zmienia pola wybranego auta —
traktować to jak edycję albo nowe auto, nigdy po cichu nie ignorować.

### 3.2 Telefon: arkusz SMS mówi „nie wyślemy”, a zapis wysyła

`customerPhone` bierze numer tylko z **wybranego** klienta (`index.tsx:510`). Nowy klient
wpisany w pola na telefonie nie jest „wybrany” aż do zapisu, więc:

- wiersz nad przyciskiem pokazuje „SMS: brak numeru telefonu klienta”,
- arkusz mówi „Klient nie ma numeru telefonu - nie wyślemy żadnej wiadomości” i **blokuje
  przełączniki**,
- a zapis (`useQuickEventForm.ts:680`) wysyła flagi domyślne z „Wiadomości do klientów” —
  jeśli studio ma „domyślnie zaznacz potwierdzenie”, klient dostaje SMS.

To najczęstszy przypadek na telefonie (nowy klient z ulicy), a użytkownik nie może
wyłączyć wiadomości, o której aplikacja mówi, że jej nie będzie. Poprawka: numer z pól
formularza (ta sama logika co `resolveCustomerForSubmit`), a nie z wybranego klienta.

### 3.3 Cykliczność „Co miesiąc” — **[potwierdzone kodem backendu]**

- Pole przyjmuje dzień 1–31 i podpisuje się „dzień (maks. 31)”
  (`RecurrenceSidePanel.tsx:399`), a serwer przyjmuje tylko 1–28
  (`CreateRecurringAppointmentHandler.kt:225`, „dayOfMonth musi być między 1 a 28”).
  Wybór 29–31 kończy się technicznym komunikatem w dymku.
- Podgląd dla 31. liczy daty przez `new Date(y, m, 31)` — luty „przeskakuje” na 3 marca,
  więc podgląd pokazuje inne daty niż serwer.
- Domyślny dzień miesiąca to **1.**, a nie dzień klikniętego slotu (`:343`). Klik w 15.
  i „Co miesiąc” planuje serię od 1. następnego miesiąca — rezerwacja na kliknięty dzień
  nie powstaje. Dla „Co tydzień” dzień jest brany z daty startu, więc oba tryby zachowują
  się inaczej.
- „Do daty” bez daty (`:435`) pokazuje „Utworzymy 104 rezerwacje”, a zapis wysyła
  `endDate: ''` (błąd serwera). Formularz nie waliduje reguły przed zapisem.

### 3.4 Escape zamyka całe okno zamiast listy

Escape w polu usług zamyka listę podpowiedzi (`index.tsx:1815`), ale nie zatrzymuje
zdarzenia — trafia ono do `onKeyDown` formularza (`:744`), który zamyka okno. To samo
dla każdego innego Escape wewnątrz okna (np. przy otwartym wyborze marki).

### 3.5 Porzucony szkic wraca na innym slocie

Formularz czyści się tylko po udanym zapisie (`CalendarView.tsx:2450`). Zamknięcie
(Escape, klik w tło, „Anuluj”) zostawia klienta, auto i usługi; następny klik w **inny**
slot pokazuje nowy termin z danymi poprzedniego klienta. Ochrona przed utratą danych jest
dobra, ale niewidoczna — łatwo zapisać rezerwację na złego klienta. Rozwiązanie:
jawny szkic („Wróć do niedokończonej rezerwacji: Jan Kowalski” / „Zacznij od nowa”) albo
czyszczenie przy otwarciu na nowym slocie.

---

## 4. Intuicyjność (P2)

1. **Wymagane pola oznaczone niekonsekwentnie.** „Termin” i „Dane klienta” mają
   „wymagane”, „Pojazd” ma „opcjonalne”, a **„Usługi” nie mają nic**, choć bez usługi zapis
   się nie uda. Kolor jest wymagany: na telefonie ma „*”, na komputerze siedzi w stopce bez
   oznaczenia.
2. **Błąd klienta na komputerze nie ma treści przy polu** — tylko czerwona ramka i dymek
   w rogu. Telefon pokazuje zdanie pod polami.
3. **Fokus na pustym polu usług otwiera okno „Nowa usługa”** (gdy cennik jest pusty) —
   samo przejście tabulatorem wyskakuje modalem.
4. **Cena 0 zł bez pytania** — `QuickServiceModal` nie sprawdza ceny, `PriceInputModal`
   potwierdza puste pola jako 0 zł. Edycja rezerwacji i przyjęcie pojazdu mają tu tę samą
   ścieżkę, więc to wspólna decyzja: zero zł jako świadomy wybór („Usługa gratis”) czy błąd.
5. **Brak tablicy rejestracyjnej przy nowym aucie.** Lista aut klienta pokazuje tablice,
   ale dodać jej nie można. Przyjęcie pojazdu pyta o nią później, więc to świadomy skrót —
   warto go jednak podpisać („tablicę uzupełnisz przy przyjęciu”).
6. **„X” na chipie pojazdu ma podpowiedź „Zmień pojazd”**, a na chipie klienta „Usuń
   klienta”. Ten sam gest, dwa znaczenia.
7. **Skrót „R” otwiera rezerwację dwudniową** (dziś 9:00 → jutro 20:00,
   `useQuickEventForm.ts:282`). Dla studia z krótkimi usługami domyślna doba jest zaskakująca
   — do decyzji biznesu.
8. **Enter w tytule wysyła formularz** i od razu sypie błędami walidacji.
9. **„Wyczyść wszystko” bez potwierdzenia** czyści klienta, auto, usługi, notatki i serię
   jednym kliknięciem obok „Anuluj”. Zgodnie z konwencją repo (przycisk mówi, co zrobi,
   zamiast „Czy na pewno?”) wystarczy cofnięcie w dymku albo przeniesienie do menu.

---

## 5. Spójność funkcjonalna z resztą aplikacji

| Temat | QuickEventModal | Edycja rezerwacji / przyjęcie pojazdu | Rekomendacja |
|---|---|---|---|
| Dymek po zapisie | **brak** | „Zapisano zmiany”, z leada „Rezerwacja utworzona” | dodać „Rezerwacja zapisana” + termin i klient |
| Wybór klienta | inline pola + lista | `CustomerModal` (wyszukiwanie, „Nowy klient”) | zostawić inline (szybsze), ale wspólna logika podpowiedzi |
| Wybór auta | lista (tylko komputer) | `VehicleSearchModal` z rodzajem | na telefonie użyć `VehicleSearchModal` |
| Potwierdzenie zmiany danych klienta z kartoteki | brak — zmiana idzie jako UPDATE przy zapisie | modal „Zmienić dane klienta?” | jedno zachowanie w obu miejscach |
| Tabela usług | `ServicesTable` (zakres „rezerwacja”) | `EditableServicesTable` (zakres „wizyta” także w edycji rezerwacji) | edycja rezerwacji powinna mówić „w tej rezerwacji” |
| Cena ręczna | `PriceInputModal` | `ManualPriceModal` (bliźniak) | jedno okno |
| Notatki | jedno pole | dwa pola (techniczne + do protokołu) | uzgodnić, które pole z rezerwacji trafia gdzie przy przyjęciu |
| SMS | potwierdzenie, przypomnienie, karta wizyty | edycja: stan wysłanego potwierdzenia + przełącznik przypomnienia | OK, ale wspólne nazwy („przypominający” vs „Przypomnienie o wizycie”) |
| Cały dzień / seria | jest (komputer) | edycja: seria tak, cały dzień nie | — |
| Walidacja | dymek + przewinięcie do pierwszego błędu | przyjęcie: inline; **edycja rezerwacji: żadna** (`errors={{}}`) | jedna walidacja dla obu |

Przy okazji (poza tym oknem, warte osobnej poprawki):
- `AppointmentEditView` „Anuluj” prowadzi do `/appointments`, której router nie ma — trafia
  na `HomeRedirect`.
- `AppointmentEditView` nie pokazuje błędu, gdy zapis się nie uda.
- `/appointments/create` (`AppointmentCreateView`) jest martwa: jedyny link prowadzi
  z nieużywanego hooka `useEventCreation`.

---

## 6. Spójność stylistyczna

1. **Kolory na sztywno.** `QuickEventModalStyles.ts`: 301 wartości hex, 0 tokenów `ui`;
   `index.tsx`: 31; `RecurrenceSidePanel.tsx`: 36; `SmsOptionsSheet.tsx`: 14. Wartości są
   z tej samej palety co `ui` (np. `#0ea5e9` = `ui.brand`), ale błąd ma inną czerwień
   (`#ef4444` zamiast `ui.dangerInk #b91c1c`), a każda zmiana palety ominie to okno.
   Dla porównania: `SettlementCorrectionModal` i nowe okna wydania — 0 hex.
2. **Główny przycisk w kolorze rezerwacji** (`index.tsx:2380`). Żółta albo limonkowa
   rezerwacja daje biały napis na jasnym tle (kontrast), a na telefonie ten sam przycisk
   jest w kolorze marki. Kolor rezerwacji powinien zostać na pasku/akcentach, przycisk —
   `ui` primary.
3. **Więcej niż jedno wypełnienie w oknie** (CLAUDE.md §2): pigułki numerów sekcji
   (`#0EA5E9`), zielone „Zatwierdź zmiany” (`#16a34a`), wypełniony przełącznik door to
   door i główny przycisk. Numerowane pigułki to wzór z przyjęcia pojazdu, ale tam też
   powinny być stonowane.
4. **Własne kontrolki obok wspólnych.** Okno importuje `Toggle`, a door to door ma własny
   `D2DToggleSwitch`; arkusz SMS ma trzeci przełącznik (52×32). SMS na komputerze to
   surowe checkboksy, w edycji rezerwacji — przełącznik. Pola door to door (`D2DInput`)
   nie są `InputShell`. W sumie to samo pole wygląda w aplikacji trzema sposobami.
5. **Trzy różne budowy okien pomocniczych:** „Nowy kolor” — `ModalShell`; „Nowa usługa” —
   własny portal + `useModalViewport`; „Cena usługi” — własny overlay bez portalu, bez
   Escape i bez blokady przewijania. Dwa ostatnie liczą przesunięcie od sidebaru jako 240 px
   (`QuickServiceModal.tsx:61`, `PriceInputModal.tsx:66`), a sidebar ma 248 px — błąd już
   poprawiony w samym QuickEventModal.
6. **Blokada przewijania** (CLAUDE.md §3): okno otwarte z kalendarza nie zakłada
   `acquireScrollLock()` — tło przewija się pod nim (szczególnie na iOS). Z leada blokadę
   zakłada `BookingFlowModal`, więc to samo okno zachowuje się różnie w zależności od wejścia.
7. **Kolor rezerwacji w dwóch formach** — próbki w stopce (komputer) i `ColorDropdown`
   (telefon, edycja rezerwacji, przyjęcie). Na komputerze „Dodaj kolor” znika, gdy kolorów
   jest więcej niż 5 (jest tylko „+N” i w panelu).
8. **Daty w serii** — `<input type="date">` z przeglądarki, gdy reszta aplikacji ma
   `DateTimePicker`.
9. **Wiersz SMS na komputerze nie ma nagłówka ani numeru**, w przeciwieństwie do sekcji 1–6.
10. Brak `·` w tekstach okna — zgodne z §4.

---

## 7. Martwy kod

| Co | Gdzie | Skutek |
|---|---|---|
| `openCustomerSheetFromTap` — no-op podpięty pod 8 pól | `index.tsx:390` | szum |
| `MobileNewCustomerSheet` — `setNewCustomerDraft` nigdy nie dostaje wartości | `index.tsx:364`, `:2434` | cały plik (272 linie) nieosiągalny |
| `customerSheetRef` / `customerSheetInputRef` + efekt fokusu | `index.tsx:362`, `:654` | odwołania do elementów, których nie ma |
| Tryb edycji pojazdu — `handleEnterVehicleEditMode` bez przycisku | hook + `index.tsx:1494` | ~60 linii UI nieosiągalne |
| `useEventCreation`, `useAppointmentEdit`, `AppointmentCreateView` | `modules/appointments` | martwa strona i hooki |

---

## 8. Proponowana kolejność prac

1. **Pojazd na telefonie** (§3.1) — lista aut klienta albo `VehicleSearchModal`; test na
   oba przypadki z tabeli.
2. **SMS na telefonie** (§3.2) — numer z pól formularza; test: nowy klient z numerem →
   podsumowanie pokazuje, co poleci, i da się to wyłączyć.
3. **Seria miesięczna** (§3.3) — limit 28 (albo „ostatni dzień miesiąca” po obu
   stronach), domyślnie dzień startu, walidacja „Do daty” przed zapisem.
4. **Escape, dymek po zapisie, jawny szkic** (§3.4, §3.5, §5) — małe zmiany, duży efekt.
5. **„Cały dzień” i „Cykliczna” na telefonie** — albo świadomie bez nich, ale wtedy z
   informacją.
6. **Styl**: przenieść `QuickEventModalStyles.ts` na tokeny `ui`, przycisk zapisu na
   `ui` primary, wspólny `Toggle` w door to door i SMS, okna pomocnicze na `ModalShell`,
   `acquireScrollLock()`.
7. **Sprzątanie** martwego kodu z §7.

## 9. Do decyzji biznesu

1. Czy rezerwacja może mieć usługę za 0 zł bez potwierdzenia?
2. Czy skrót „R” ma tworzyć rezerwację dwudniową, czy np. najbliższą godzinę?
3. Czy zamknięte okno ma pamiętać szkic (z jawnym „wróć do szkicu”), czy zawsze startować
   od zera?
4. Czy nowe auto w rezerwacji ma mieć pole na tablicę rejestracyjną?
5. Czy zmiana danych klienta z kartoteki w rezerwacji ma pytać „Zmienić dane klienta?”, jak
   w edycji rezerwacji?

---

## 10. Stan po poprawkach (21.10.2026, gałąź `fix/rezerwacja-z-kalendarza`)

Decyzje biznesu: usługa za 0 zł bez potwierdzenia — **tak**; skrót „R" — **zawsze cały
dzień** (dziś); zamknięte okno — **pamięta szkic** z jawnym „Wróć do szkicu"; tablica przy
nowym aucie — **nie**; zmiana danych klienta z kartoteki — **pyta**.

| Punkt | Co zrobiono |
|---|---|
| 3.1 pojazd na telefonie | Telefon ma ten sam przebieg co komputer: lista aut klienta (sama się rozwija przy 2+ autach), chip wybranego auta z ołówkiem i „×", pola tylko dla nowego auta. |
| 3.2 SMS na telefonie | Numer z pól formularza (`smsPhone`), nie tylko z wybranego klienta. Bez numeru zapis nie wysyła żadnego SMS-a - to samo, co mówi formularz. |
| 3.3 seria miesięczna | Dzień 1–28 (jak serwer), domyślnie dzień startu, podgląd tylko dla reguły, którą serwer przyjmie, walidacja przed zapisem (`recurrence.ts`), data końca z `DateTimePicker`. |
| 3.4 Escape | Escape zamyka najpierw listę/kalendarz/wybór marki, dopiero następny - okno. |
| 3.5 szkic | Zamknięcie odkłada formularz do szkicu i czyści okno; pasek „Niedokończona rezerwacja" przywraca wszystko poza terminem. „Wyczyść wszystko" da się tym samym cofnąć. Tylko w kalendarzu (okno z leada startuje z danych leada). |
| 4.1–4.3, 4.6, 4.8 | „Usługi: wymagane"; błąd klienta pod polami na komputerze; fokus w usługach nie otwiera „Nowej usługi"; „×" auta to „Usuń pojazd z rezerwacji"; Enter w tytule przechodzi do imienia. |
| 4.4, 4.5, 4.7 | Bez zmian: 0 zł dozwolone, bez tablicy, skrót „R" - cały dzisiejszy dzień. |
| Decyzja 5 | „Zmienić dane klienta?" / „Zmienić dane pojazdu?" (te same słowa co w edycji rezerwacji) przy „Zatwierdź zmiany" i przy zapisie. „Dodaj jako nowego" zakłada nowego klienta, a jego auto z kartoteki idzie jako nowe auto. Sam inny zapis numeru (spacje) nie jest zmianą. Telefon: poprawka pól wybranego klienta otwiera edycję, zamiast ginąć. |
| 5 | Dymek „Rezerwacja zapisana" / „Seria rezerwacji zapisana" z klientem i terminem. Edycja rezerwacji: walidacja (`validateAppointmentEdit`), dymek przy nieudanym zapisie, „Anuluj" wraca tam, skąd przyszedł użytkownik, napisy „rezerwacji" zamiast „wizyty" i zakres ceny „w tej rezerwacji". |
| 6 | Kolory okna, panelu serii i arkusza SMS na tokenach `ui` (te same wartości). Door to door na `Toggle` + `InputShell`. SMS na komputerze to ta sama lista co w arkuszu na telefonie. „Cena usługi" w portalu z Escape i blokadą przewijania; okno zakłada `acquireScrollLock()`. Przesunięcie od paska bocznego 248 px w 5 miejscach (także stopka przyjęcia pojazdu i `BookingFlowModal`). „Cały dzień" i „Cykliczna" na telefonie. |
| 7 | Usunięte: `MobileNewCustomerSheet`, no-op `openCustomerSheetFromTap`, martwy arkusz klienta, stara strona `AppointmentCreateView` z 16 plikami tylko dla niej (adres `/appointments/create` otwiera teraz kalendarz z oknem rezerwacji). Edycja auta z kartoteki ma przycisk. |

Sprostowanie do 6.2: przycisk „Zapisz rezerwację" nie zmieniał koloru - `--button-bg`
nie był przez `SharedButton` czytany. Usunięty martwy styl.

Bez zmian, świadomie: numerowane pigułki sekcji (wzór z przyjęcia pojazdu), zielone
„Zatwierdź zmiany" otwartej edycji (wyjątek z CLAUDE.md §2), czerwień błędów `#ef4444`
(ta sama co w zestawie `Form`).

Sprawdzenie: 25 nowych testów (`QuickEventModal.render.test.tsx`, `recordChanges.test.tsx`,
`recurrence.test.ts`, `validateAppointmentEdit.test.ts`), wszystkie testy kalendarza,
rezerwacji, przyjęcia pojazdu i wspólnych komponentów zielone; lint bez nowych uwag; ręczny
przebieg w aplikacji (komputer 1440 px i telefon 390 px). Pełny `tsc` nadal nie mieści się
w pamięci (znane ograniczenie repo).
