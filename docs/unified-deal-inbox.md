# Zapytania: jedna skrzynka zamiast „Leadów” i „Poczty”

**Audyt i projekt przebudowy**, 2026-10-08
Dotyczy: `src/modules/comms` (frontend) oraz `leads/`, `comms/`, `appointment/` (backend
`automotive-crm-v2-backend`). Dokument uzupełnia `communication-leads-ui-spec.md`
i `leads-queue-backend-spec.md`. Nie powtarza ich, tylko mówi, co z nich zrobiono, czego
nie zrobiono i co trzeba zmienić.

Ścieżki bez prefiksu są względne do `src/modules/comms/`. Ścieżki backendu są względne do
`src/main/kotlin/pl/detailing/crm/`. Numery linii podano według stanu z dnia audytu.

---

## Najważniejsze w pięciu zdaniach

1. Moduł leadów nie jest dziś kanbanem do przeciągania, tylko dobrze przemyślaną kolejką
   „czyj ruch” (`views/LeadsView.tsx`, `utils/leadWorklist.ts`). Tę kolejkę zostawiamy i robimy
   z niej kręgosłup nowego widoku.
2. Największe tarcie bierze się z tego, że **nie da się odpisać klientowi tam, gdzie się
   czyta jego sprawę**. „Odpisz klientowi” wyrzuca z leada do Poczty, a Poczta pokazuje
   o leadzie tylko zieloną plakietkę „Lead”, bez etapu i bez kwoty.
3. Statusów jest sześć, a obok nich żyje jeszcze pięć osi stanu: czyj ruch, dług, cisza,
   weryfikacja i archiwum wątku. Dwa statusy dotyczą wizyty, a nie sprzedaży. Jedno ważne
   zdarzenie, **„wycena wysłana”, w modelu w ogóle nie istnieje**.
4. Rekomendacja: **Opcja A, Actionable Inbox w trzech kolumnach**: kolejka spraw, rozmowa
   z edytorem, szyna z wyceną i jednym przyciskiem kroku następnego. Etapy są tylko cztery:
   Nowe zapytanie → Wycena wysłana → Umówione, a z każdego z nich można przejść do Zamknięte.
   Etap zmienia się wyłącznie jako skutek pracy: wysłanie wyceny, założenie terminu, przyjazd
   auta.
5. Podstawowa ścieżka od maila klienta do terminu w kalendarzu skraca się z ok. 13 kliknięć
   i dwóch przeskoków między modułami do ok. 6 kliknięć bez opuszczania ekranu (liczenie
   w §1.2).

---

## Krok 1. Audyt

### 1.1. Co działa i ma zostać

Przebudowa nie zaczyna się od zera. Te decyzje są dobre i nowy widok je dziedziczy:

| Co | Gdzie | Dlaczego zostaje |
|---|---|---|
| Kolejka po osi „czyj ruch”, a w niej kolejność po wieku oczekiwania | `utils/leadWorklist.ts`, `utils/leadUrgency.ts` | To jest właśnie semantyka skrzynki odbiorczej: „nieprzeczytane” znaczy „nasz ruch”. |
| Statusu nie ma na liście | `views/LeadsView.tsx:16-18` | Lista odpowiada na pytanie „co teraz zrobić”, a nie „gdzie co leży”. |
| Jedna akcja główna wynikająca ze stanu sprawy | `utils/leadPrimaryAction.ts`, `components/LeadDetailModal.tsx:2281-2361` | To fundament reguły „jedno wypełnienie na okno”. |
| Automat NEW → IN_PROGRESS po pierwszej odpowiedzi | backend `leads/update/LeadFirstResponseListener.kt:58-85` | To pierwszy krok w stronę „status jako skutek pracy”. |
| Automat CONFIRMED po założeniu terminu z leada | backend `leads/appointment/LeadSyncService.kt:38-67` | Jw. |
| Rezerwacja z leada w oknie, z prefillem klienta, auta i usług z dokładnym brutto | `utils/bookingPrefill.ts`, `calendar/components/BookingFlowModal.tsx` | To gotowy klocek pod „Zamień na wizytę”. |
| Szkic odpowiedzi z wyceną leada i kontrolą kwot | backend `comms/draft/ReplyDraftService.kt:278-289`, `DraftAmountChecker.kt` | Kontrola kwot chroni przed kwotą zmyśloną przez model. |
| Wycena trzyma brutto wpisane przez człowieka | backend `LeadSupportEntities.kt:38-108`, `LeadQuoteSyncService.kt:137` | Reguła §1 CLAUDE.md. Nowy przepływ nie może jej zgubić. |

### 1.2. Friction points: gdzie każemy klikać albo pamiętać

| # | Miejsce w kodzie | Co musi zrobić użytkownik | Koszt |
|---|---|---|---|
| F1 | `widgets/Sidebar/menuSections.ts:113-114` | Wybrać jeden z dwóch modułów („Leady” albo „Poczta”), choć oba pokazują tę samą rozmowę. | Pierwsza decyzja dnia jest decyzją o nawigacji, a nie o pracy. |
| F2 | `menuSections.ts:113-114`, `hooks/useComms.ts:256-264`, `hooks/useLeads.ts:273-281` | Ten sam mail klienta zapala **dwa** liczniki: nieprzeczytane w Poczcie (czerwony `alert`) i „czeka na nas” w Leadach. | Użytkownik nie wie, czy to dwie sprawy, czy jedna. Dwa czerwone wskaźniki w jednym menu mają ten sam problem co dwa wypełnione przyciski. |
| F3 | `widgets/BottomNav/BottomNav.tsx:130-139` | Na telefonie widać tylko licznik Poczty. Leadów w dolnym pasku nie ma. | Na hali, gdzie moduł jest najczęściej używany, kolejka sprzedaży jest niewidoczna. |
| F4 | `components/LeadDetailModal.tsx:1585-1588, 1605` | „Odpisz klientowi” robi `navigate('/communication?thread=…')`. Panel leada znika, wycena znika, a powrotu do leada nie ma. | Pełna zmiana kontekstu przy najczęstszej czynności w module. |
| F5 | `LeadDetailModal.tsx:1607, 2323-2347` | Gdy ruch jest po stronie klienta, panel leada **nie ma żadnej drogi do korespondencji**. `writeToClient` pojawia się tylko w sprawie zamkniętej albo zaległej. Komentarz w `:2293-2296` obiecuje link w wierszu tożsamości, ale ten link usunięto (`:1589-1604`). | Chcąc dopisać „a jednak jest wolny wtorek”, trzeba wyjść z modułu i szukać wątku wyszukiwarką. |
| F6 | `views/MailView.tsx:685`, `components/ConversationView.tsx:739-744` | W Poczcie lead to zielona plakietka „Lead” bez etapu, kwoty i pilności. Hook `useLead` jest pobierany, ale korzysta się tylko z `appointmentId`. | Żeby sprawdzić, czy klientowi już wysłano cenę, trzeba otworzyć okno leada, które zasłania rozmowę. |
| F7 | `ConversationView.tsx:1005-1019, 1094` | Podgląd leada w Poczcie to **okno modalne nad rozmową**, z wyłączonym linkiem do wątku (`showThreadLink={false}`). | Wycenę i treść maila klienta nie da się zobaczyć jednocześnie. A to dokładnie ta para, którą porównuje się przy pisaniu oferty. |
| F8 | `components/MarkAsLeadModal.tsx`, `ConversationView.tsx:1102`, `MarkAsLeadModal.tsx:115` | Wątek bez leada: „Oznacz jako lead” → okno → „Utwórz lead”. Potem jest tylko toast „Znajdziesz go w zakładce Leady”, bez nawigacji (`onCreated={() => undefined}`). | Trzy kliknięcia, a na końcu instrukcja, że trzeba pójść gdzie indziej. |
| F9 | `components/ReplyDraftOfferModal.tsx:88-90` | „Szkic AI” → „Z ofertą” na wątku bez leada **po cichu zakłada leada**. | Ten sam skutek co F8 osiągnięty drogą, której nikt nie podejrzewa. Dwa sposoby na to samo, z różnymi efektami ubocznymi (tagi `[]`). |
| F10 | `components/ReplyDraftButton.tsx:327-397` | Wycena trafia do maila tylko przez szkic modelu: „Szkic AI” → „Z ofertą / Bez oferty” → okno usług → „Napisz szkic z ofertą” (+ przy pierwszym razie okno stylu). Nie ma deterministycznego bloku wyceny. | 4-5 kliknięć za każdym razem i proza, którą trzeba przeczytać, bo może pomylić kwotę (stąd `DraftAmountChecker`). |
| F11 | `components/LeadQueueCard.tsx:253-274` | Karta w kolejce nie pokazuje, **co klient napisał**: pokazuje auto, usługi i osobę. Lista w Poczcie pokazuje snippet, ale nie pokazuje pilności. | Żeby zdecydować, którą sprawę otworzyć, trzeba ją otworzyć. Każda lista ma połowę potrzebnej informacji. |
| F12 | `commsApi.ts:262-291` vs `leadsApi.ts:143-154` | Dwie osobne kolekcje notatek: per adres e-mail (Poczta) i per lead (Leady). Żaden widok nie pokazuje notatek drugiego. | „Woli kontakt po 16” zapisane w Poczcie nie istnieje w leadzie i odwrotnie. Użytkownik musi pamiętać, gdzie co zapisał. |
| F13 | `components/LeadTimeline.tsx` vs `components/ConversationView.tsx` | Ta sama korespondencja ma dwie implementacje: oś czasu w leadzie (tylko do czytania) i wątek w Poczcie (z edytorem). | Dwa wyglądy tej samej rozmowy i dwa miejsca do utrzymania. |
| F14 | backend `comms/api/CommsQueryHandlers.kt:166-171`, `CommsRepositories.kt:130` | Zarchiwizowany wątek **zostaje w archiwum, gdy klient odpisze**, i nie wchodzi do licznika nieprzeczytanych. | Odpowiedź klienta na wątek „posprzątany” w Poczcie jest niewidoczna, chyba że wątek ma leada. |
| F15 | backend `shared/DashboardEvents.kt:91`, `dashboard/WebSocketEventBridge.kt:72`, `push/notify/PushEventBridge.kt:73-90` | `LeadClientRepliedEvent` ma nasłuch, ale **nikt go nie publikuje**. Push przychodzi o nowym zapytaniu, nie przychodzi o tym, że klient odpisał na wycenę (punkt O2 z `leads-queue-backend-spec.md`, niezrobiony). | Najcenniejszy moment w lejku, „klient odpisał na cenę”, nie budzi telefonu właściciela. |
| F16 | `LeadsView.tsx:548` (`isSplit` od 1280 px) vs `MailView.tsx:363` (od 1024 px) | Na laptopie 1024-1279 px Poczta ma dwie kolumny, a Leady jedną kolumnę i okno pełnoekranowe. | Ten sam ekran zachowuje się różnie w zależności od tego, przez który moduł się weszło. |
| F17 | `hooks/useLeads.ts:820-832` (nieużywany `useUpdateLead`), backend `LeadEntity.assignedUserId` | Przypisanie do osoby istnieje w danych, ale nie ma go w interfejsie. Wątki nie mają przypisania wcale. | W studiu z dwiema osobami przy skrzynce nie wiadomo, kto odpisuje. Ryzyko podwójnej odpowiedzi. |

**Liczenie kliknięć dla ścieżki podstawowej** („klient pisze → wysyłamy cenę → odpisuje →
umawiamy”), dziś, przy włączonej automatycznej klasyfikacji:

```
Leady (1) → karta (2) → edycja wyceny w panelu → „Odpisz klientowi” = PRZESKOK do Poczty (3)
→ „Szkic AI” (4) → „Z ofertą” (5) → „Napisz szkic z ofertą” (6) → poprawki → „Wyślij” (7)
… klient odpisuje, zapalają się dwa liczniki …
Poczta albo Leady (8) → wątek (9) → ikona leada otwiera okno nad rozmową (10)
→ „Stwórz rezerwację” (11) → dzień w kalendarzu (12) → zapis formularza (13)
```

Po przebudowie (makiety w §3):

```
Zapytania (1) → sprawa ze szkicem gotowym do wysłania (2) → „Wyślij wycenę” (3)
… klient odpisuje, jeden licznik, push „odpisał na wycenę” …
sprawa (4) → „Umów na wt 21.10, 8:00” (5) → potwierdzenie w wypełnionym formularzu (6)
```

### 1.3. Statusy: co jest nie tak

Słownik: backend `shared/ValueClasses.kt:258-265`, etykiety `types.ts:869-888`.

| Status (etykieta) | Jak powstaje dziś | Problem | Werdykt |
|---|---|---|---|
| `NEW` „Nowy” | Utworzenie leada w każdej ścieżce. | Brak, poza nazwą: „Nowy” mówi o wieku, a nie o tym, czego sprawa potrzebuje. | **Zostaje** jako „Nowe zapytanie”. |
| `IN_PROGRESS` „W kontakcie” | Dowolna nasza wiadomość albo odnotowany telefon (`LeadFirstResponseListener.kt:84`, `LeadCallbacks.kt:128-135`). | Wrzuca do jednego worka „poprosiłem o zdjęcia” i „wysłałem cenę 7 800 zł”. Każda otwarta sprawa po pierwszej odpowiedzi jest „w kontakcie”, więc etykieta nic nie odróżnia. | **Rozbić**: bez ceny zostaje „Nowe zapytanie”, z ceną staje się nowym etapem „Wycena wysłana”. |
| `CONFIRMED` „Rezerwacja” | Termin założony z leada (`LeadSyncService.kt:62`). Można go też ustawić ręcznie bez terminu (`types.ts:888`, `LeadStatusService` przyjmuje każde przejście). | Etykieta jest rzeczownikiem, a nie stanem. Ręczne „Rezerwacja” bez rezerwacji tworzy sprawę, której kalendarz nie zna. | **Zostaje** jako „Umówione”, tylko automatycznie, nigdy ręcznie. |
| `COMPLETED` „Zrealizowany” | Przyjęcie pojazdu, czyli podpisanie protokołu (`ConfirmVisitHandler.kt:79` → `LeadSyncService.kt:114-117`). | To stan **wizyty**, a nie sprzedaży. „Zrealizowany” w chwili, gdy auto dopiero wjechało na halę, jest nieprawdą. | **Usunąć z listy etapów**: przyjazd auta zamyka sprawę jako wygraną, a wynik czyta się z wizyty. |
| `NO_SHOW` „Nie pojawił się” | **Każde** anulowanie terminu (`CancelAppointmentHandler.kt:64`) i porzucenie przez zadanie co 15 min (`ReservationStatusUpdateJob.kt:130`). | Klient, który dzwoni dwa tygodnie wcześniej i przekłada termin, dostaje „Nie pojawił się”. Studio, które samo odwołało termin, też. To stan **terminu**, a nie sprzedaży, i to stan zwykle nieprawdziwy. | **Usunąć**: odwołany albo porzucony termin cofa sprawę do „Wycena wysłana” z ruchem po naszej stronie. Statystykę niestawiennictwa liczy się z terminów. |
| `LOST` „Przegrany” | Ręcznie, z wymaganym powodem (`LeadStatusService.kt:51`). | Słownik powodów jest dobry, ale etykieta „Przegrany” obejmuje też „Spam” i „Sami odmówiliśmy”, które stratą nie są (`Lead.kt`, `countsAsLoss = false`). | **Zostaje** jako „Zamknięte” z powodem. „Przegrana” to tylko jeden z rodzajów powodu. |

**Błędy w przejściach**, niezależne od przebudowy (do naprawy w fazie 0, §4):

- **Brak macierzy przejść.** `LeadStatusService.transition` przyjmuje każde przejście
  (`:38-118`), a `LEAD_STATUS_FLOW` pokazuje w menu wszystkie sześć wartości (`types.ts:888`).
  Do tego dochodzi zbiorcze „Zmień status” na liście (`LeadsView.tsx:1123`).
- **Synchronizacja z kalendarzem nadpisuje decyzję człowieka.** `LeadSyncService.syncStatus`
  pomija tylko przejście na ten sam status (`:128-131`). Sprawa zamknięta ręcznie jako
  przegrana staje się „Nie pojawił się”, gdy ktoś anuluje jej termin, a „Rezerwacja”, gdy
  ktoś go przywróci.
- **Odpowiedź klienta nie otwiera ponownie sprawy zamkniętej.** Klient zamkniętej sprawy,
  który pisze „jednak się decyduję”, trafia do Poczty jako zwykły mail. W kolejce nie ma go,
  bo `CLOSED_STATUSES` daje mu turę `SETTLED` (`utils/leadUrgency.ts`).
- **Telefon zakłada dwa leady.** `RegisterInboundCallHandler.kt:53-87` tworzy leada przy
  rejestracji połączenia, a `AcceptCallHandler.kt:41-76` tworzy drugiego przy akceptacji, bez
  sprawdzenia, czy pierwszy istnieje. Webowy frontend ma wywołanie akceptacji zakomentowane
  (`dashboard/api/dashboardApi.ts:415`), ale endpoint jest publiczny dla innych klientów.

**Pięć osi stanu obok statusu.** Każda z osobna jest uzasadniona w komentarzach, ale razem
dają model, którego właściciel studia nie ma szans odtworzyć w głowie:

| Oś | Gdzie | Ustawiana | Kłopot |
|---|---|---|---|
| Czyj ruch (`OURS` / `CLIENT` / `SETTLED`) | backend `leads/conversation/LeadTurn.kt`, frontend `utils/leadUrgency.ts` | Wyliczana | Liczona **dwa razy** (komentarz w `LeadTurn.kt` mówi wprost: „ta reguła jest lustrem… i ma nim pozostać”). Do tego dochodzą trzy dalsze źródła: `thread.lastDirection`, `LeadReplyState` i filtr SQL `awaitingReply`. Telefony nie wliczają się do ruchu, więc frontend zgaduje z `firstResponseAt` (`leadUrgency.ts`, „O4” w specyfikacji: niezrobione). |
| Dług „obiecałem coś wysłać” (`owedSince`) | `LeadOwedService.kt`, `components/RecordCallbackDialog.tsx` | Ręcznie | Dobry pomysł, ale żyje tylko w oknie telefonu. To samo w Poczcie robi „Oznacz jako nieprzeczytane” i obie rzeczy nic o sobie nie wiedzą. |
| Cisza klienta (`tone: 'stale'`) | `leadUrgency.ts` | Wyliczana z progu studia | W porządku: to jest sekcja „Ucichło”. Zostaje. |
| Weryfikacja (`requiresVerification`) | `RegisterInboundCallHandler.kt:63` | Tylko leady z telefonu | Flaga, której interfejs nie tłumaczy. Kasuje ją przypięcie klienta albo terminu. |
| Archiwum wątku (`thread.archived`) vs zamknięcie leada | `CommsQueryHandlers.kt:166-171` | Ręcznie, niezależnie | Zamknięcie leada nie archiwizuje wątku, a archiwizacja wątku nie zamyka leada. Trzy kosze „to nie jest sprzedaż”: archiwum Poczty, folder „Odrzucone” (spam) i powód `SPAM` w leadzie. |

Do tego martwe albo półżywe pola: `category` (zastąpione tagami, brak w DTO), `stagnantAlertSentAt`
(wewnętrzny znacznik pushy), `assignedUser` (bez interfejsu, F17).

---

## Krok 2. Nowa architektura: „Zapytania”

### 2.1. Opcja A czy B

| Kryterium | A: Actionable Inbox (3 kolumny) | B: Kanban / Lista + szuflada |
|---|---|---|
| Test 5 sekund | Jedna lista, czytana od góry. Pierwszy wiersz to pierwsza praca. | Najpierw trzeba wybrać projekcję, a w kanbanie znaleźć kolumnę. |
| Ile etapów ma sens jako kolumny | Bez znaczenia: etap to chip na wierszu. | Przy 4 etapach dwie kolumny są końcowe. Zostają **dwie** kolumny robocze, czyli kanban jest pusty z definicji. |
| Ręczna zmiana statusu | Nie istnieje, bo nie ma czego przeciągać. | Przeciąganie kafelka to ręczna zmiana statusu, którą właśnie usuwamy. |
| Pisanie odpowiedzi | Pełna kolumna środkowa z edytorem i wątkiem. | Szuflada nad kanbanem: wąski edytor, wątek ściśnięty obok wyceny (ten sam problem, o którym mówi komentarz w `LeadDetailModal.tsx:9-12`). |
| Telefon (hala, jedna ręka) | Lista → rozmowa → arkusz wyceny. Naturalny wzorzec komunikatora. | Kanban na telefonie nie istnieje, więc i tak wraca lista. Dwa modele do utrzymania. |
| Koszt wdrożenia | Złożenie istniejących klocków: `LeadsView` (kolejka) + `ConversationView` / `ReplyComposer` (rozmowa) + `LeadDetailPane` (szyna). | Nowy kanban od zera. Widok tablicowy usunięto już raz świadomie (`LeadsView.tsx:1-25`, `leads-queue-backend-spec.md`: „ręcznego przeciągania świadomie nie ma”). |
| Przegląd lejka „ile pieniędzy w wycenach” | Pasek sumy nad listą („W wycenach 18 400 zł, 7 spraw”) + istniejący raport `LeadAnalyticsView`. | Kolumny z sumami. To jedyna realna przewaga B. |

**Wybór: Opcja A.** Studio detailingowe ma zwykle 5-40 otwartych spraw, a jego dzień składa
się z serii „przeczytaj → wyceń → odpisz → umów”. To jest praca w skrzynce, a nie planowanie
na tablicy. Jedyną przewagę B, czyli widok pieniędzy w lejku, daje jeden wiersz sumy nad
listą. Specyfikacja z sierpnia (`communication-leads-ui-spec.md` §2.1) proponowała przełącznik
„Tablica | Lista”. Zespół zbudował wyłącznie listę i opisał dlaczego, więc rzeczywistość już
zagłosowała.

### 2.2. Model: sprawa jest jednostką, kanał jest jej częścią

- **Jeden byt na liście: sprawa** (dzisiejszy `Lead`). Mail, formularz, telefon i notatka to
  wpisy na jej osi czasu. Wątek mailowy jest kanałem sprawy, a nie osobnym obiektem do
  zarządzania.
- **Każdy mail, który jest zapytaniem, zakłada sprawę sam.** Klasyfikacja
  (`AutoLeadClassificationListener`, dziś za flagą studia) jest domyślnie włączona. Gdy model
  nie jest pewny (`AutoLeadProcessor.kt:147`, próg 0,7), wątek ląduje w zakładce „Pozostała
  poczta” z przyciskiem **„To zapytanie”** (jedno kliknięcie, bez okna) w miejsce
  `MarkAsLeadModal`. Tagi i usługi uzupełnia się później w szynie, bo i tak tam się je
  ogląda.
- **„Pozostała poczta”** to druga zakładka tego samego ekranu: faktury dostawców, newslettery,
  sprawy nie-sprzedażowe. Dzisiejszy `MailView` w uproszczonej postaci, bez własnej pozycji
  w menu. Jej nieprzeczytane pokazują szary licznik w zakładce, a nie czerwony w menu.
- **Jeden licznik w menu i w dolnym pasku telefonu**: liczba spraw z ruchem po naszej stronie
  (`/leads/attention-count`, który już istnieje). Znika licznik nieprzeczytanych Poczty.
- **Jedne notatki**: notatki kontaktu i notatki leada łączą się w jedną kolekcję widoczną na
  osi czasu sprawy. Notatka kontaktu jest pokazywana we wszystkich sprawach tej osoby.
- **Jedna rozmowa**: `ConversationView` z edytorem zastępuje `LeadTimeline`. Zmiany etapu
  i telefony wchodzą do wątku jako wąskie separatory („Etap: Wycena wysłana”), tak jak
  zapowiadała sekcja 2.6 specyfikacji z sierpnia.

### 2.3. Maszyna stanów: cztery etapy, reszta to fakty

**Etap** (persystowany, zmienia się sam) odpowiada na pytanie „jak daleko jest sprzedaż”.
**Czyj ruch** (wyliczany, nigdy ustawiany) odpowiada na pytanie „kto ma teraz coś zrobić”.
To dwie osie i żadnej nie wolno wcisnąć w drugą. Ten rozdział już istnieje w kodzie
(komentarz w `LeadReplyState.kt:7-15`) i jest dobry. Nowy model go doprowadza do końca.

```
   klient pisze: mail, formularz, telefon albo „To zapytanie” w Pozostałej poczcie
                                  │  system zakłada sprawę
                                  ▼
                  ┌───────────────────────────────┐
  odpowiedź bez   │  1. NOWE ZAPYTANIE      (NEW) │───────┐  „Umów” bez wyceny
  ceny: etap      └───────────────┬───────────────┘       │  (klient dzwoni i od
  stoi, zmienia                   │                       │  razu się umawia)
  się czyj ruch                   │ wiadomość z blokiem   │
                                  │ wyceny albo „Podałem  │
                                  │ cenę” przy telefonie  │
                                  ▼                       │
                  ┌───────────────────────────────┐       │
                  │  2. WYCENA WYSŁANA   (QUOTED) │◀──────┼─────────┐  termin odwołany,
                  └───────────────┬───────────────┘       │         │  usunięty albo
                                  │ „Umów na …”: termin   │         │  klient nie przyjechał;
                                  │ z tej sprawy          │         │  ruch po naszej stronie
                                  ▼                       │         │
                  ┌───────────────────────────────┐       │         │
                  │  3. UMÓWIONE         (BOOKED) │◀──────┘         │
                  └───────────────┬───────────────┘─────────────────┘
                                  │ auto przyjęte na halę
                                  │ (protokół podpisany)
                                  ▼
                  sprawa schodzi z listy: archiwum „Wygrane”
                  (wynik, kwota i termin czyta się z wizyty)

   z 1, 2 lub 3:  „Zamknij” + powód jednym kliknięciem  ──▶  4. ZAMKNIĘTE (LOST)
   z 4:           klient pisze ponownie                 ──▶  wraca do 1 albo 2, ruch po naszej stronie
```

**Niezmienniki**, które pilnuje backend, a nie użytkownik:

- `BOOKED` ⇔ sprawa ma aktywny termin (`appointmentId` niepusty, termin nie jest odwołany
  ani porzucony). Ręcznie nie da się ustawić ani zdjąć.
- `QUOTED` ⇔ istnieje wysłana wycena (`lead_quotes.sent_at`). Wycena nie jest tekstem maila,
  tylko rekordem z pozycjami.
- `LOST` ustawia wyłącznie człowiek, z powodem ze słownika. **Automat kalendarza nie nadpisuje
  `LOST`** (to naprawia błąd z §1.3).
- Nie ma przejścia, którego użytkownik musi dokonać po to, żeby system „wiedział”. Jedyną
  ręczną decyzją jest zamknięcie sprawy, bo tylko człowiek wie, że klient wybrał konkurencję.

**Oś „czyj ruch”** zostaje trójwartościowa (Czeka na nas / U klienta / Ucichło). Liczy ją
**tylko backend**, ze wszystkich kanałów: mail, telefon, SMS i dług. Zwraca ją w DTO jako
`turn`, `waitingSince` i `overdue`, a frontendowa kopia reguły (`resolveTurn`) znika. Do
osi dochodzi jedno nowe pole: **„Odłóż do …”** (`snoozedUntil`, punkt O3 specyfikacji). Ukrywa
sprawę z „Czeka na nas” do wskazanej chwili albo do następnej wiadomości klienta. To uczciwa
odpowiedź na „widziałem, wrócę po południu”, która dziś kończy się przestawianiem statusu.

### 2.4. Automatyka pod spodem: tabela przejść

| Zdarzenie | Kto | Etap | Czyj ruch | Co jeszcze |
|---|---|---|---|---|
| Wpływa zapytanie (mail, formularz, telefon) | system | → NEW | nasz | Szkic odpowiedzi z wyceną z cennika i podobnych zleceń przygotowany w tle. Push „Nowe zapytanie”. |
| Wysyłamy odpowiedź **bez** bloku wyceny | człowiek klika „Wyślij” | bez zmian | klienta | Separator na osi czasu. |
| Wysyłamy odpowiedź **z** blokiem wyceny | człowiek klika „Wyślij wycenę” | NEW → QUOTED | klienta | Zapis `lead_quotes`: pozycje z dokładnym brutto, suma, `messageId`, `sentAt`. |
| Odnotowany telefon z zaznaczonym „Podałem cenę” | człowiek | NEW → QUOTED | klienta | Wycena z szyny zapisana jako wysłana ustnie. |
| Odnotowany telefon „Mam coś wysłać” | człowiek | bez zmian | nasz (dług) | Jak dziś (`RecordCallbackDialog`). |
| Klient odpisuje | system | bez zmian (LOST → NEW/QUOTED) | nasz | **Push „Jan odpisał na wycenę 4 200 zł”** (F15). Asystent przygotowuje podpowiedź (np. wolne terminy, gdy klient pyta o termin). |
| Klient milczy dłużej niż próg studia | system | bez zmian | sekcja „Ucichło” | Gotowy szkic przypomnienia, wysyłany jednym kliknięciem („Przypomnij się”). |
| „Umów na …” w szynie | człowiek | → BOOKED | — | Termin z pozycjami wyceny (dokładne brutto) + szkic potwierdzenia do klienta. |
| Termin odwołany / usunięty / porzucony | człowiek / zadanie co 15 min | BOOKED → QUOTED (albo NEW) | nasz | Separator „Termin 21.10 odwołany” i dwie akcje: „Umów ponownie”, „Zamknij”. **Zamiast** dzisiejszego `NO_SHOW`. |
| Auto przyjęte (protokół) | system | BOOKED, sprawa zamknięta jako wygrana | — | Sprawa schodzi z listy. **Zamiast** dzisiejszego `COMPLETED`. |
| „Zamknij” + powód | człowiek | → LOST | — | Szybkie chipy powodów. Dla „Spam” wątek trafia też do „Pozostałej poczty”. |

**Jak „Wyślij wycenę” przesuwa sprawę bez udziału człowieka:**

```
Edytor (ReplyComposer)                Backend
──────────────────────                ──────────────────────────────────────────────────────
blok WYCENA wstawiony z szyny
(pozycje z lead_service_items,
 brutto tak, jak je wpisano)
        │
        │ POST /api/v1/comms/send
        │ { threadId, leadId, html,
        │   quote: { items[ serviceId, name, qty,
        │            priceGross, priceNet, vatRate ],
        │            totalGross } }
        └───────────────────────────▶ SendMailHandler
                                         ├─ wysyła maila (jak dziś)
                                         └─ LeadQuoteService.recordSent(leadId, quote, messageId)
                                               ├─ zapis lead_quotes (snapshot, sent_at)
                                               ├─ LeadStatusService.transition(→ QUOTED)
                                               └─ LeadChangedEvent → WebSocket
Kolejka: sprawa przechodzi z „Czeka na nas” do „U klienta”,
na osi czasu pojawia się „Etap: Wycena wysłana (z wysyłki)”.
```

Przełącznik **„Po wysłaniu: Wycena wysłana ▾”** pod edytorem pokazuje, dokąd sprawa pojedzie,
**zanim** człowiek kliknie. Zaznacza się sam, gdy w treści jest blok wyceny, a także gdy
`DraftAmountChecker` znajdzie w treści kwotę. Można go odznaczyć. Dzięki temu znika cała
klasa błędu „odpisałem, zapomniałem przestawić”, a przestawianie nie jest osobną czynnością.

**Pieniądze** (CLAUDE.md §1). Snapshot wyceny niesie `priceGross` z pozycji leada **bez
przeliczania**. Blok w mailu pokazuje te same kwoty, a VAT, jeśli jest pokazany, liczy się
jako różnica brutto − netto. „Umów na …” przenosi do terminu `basePriceGross` dokładnie tak,
jak dziś robi to `bookingPrefill.ts`. Test „1900,00 zł nie pływa” trzeba rozszerzyć o ścieżkę
„wycena w mailu → snapshot → termin”.

### 2.5. Mapowanie starych statusów

| Dziś | Po migracji | Reguła |
|---|---|---|
| `NEW` | `NEW` | bez zmian |
| `IN_PROGRESS` | `QUOTED` albo `NEW` | `QUOTED`, gdy sprawa ma zaakceptowane pozycje z ceną **i** naszą wiadomość wysłaną po ich wycenie. W pozostałych przypadkach `NEW`. Reguła przybliżona. Przed wdrożeniem trzeba ją zmierzyć na kopii produkcji i pokazać biznesowi liczby. |
| `CONFIRMED` | `BOOKED` | bez zmian znaczenia |
| `COMPLETED` | `BOOKED` + `closedAt` (wygrana) | wynik z `visitId` |
| `NO_SHOW` | `QUOTED` (ruch nasz) albo `LOST` / `NO_RESPONSE` | starsze niż próg ciszy zamykamy, młodsze wracają do kolejki |
| `LOST` | `LOST` | bez zmian |

Historia (`lead_status_history`) **zostaje nietknięta**. Kolumna jest tekstowa, a analityka
przez okres przejściowy czyta oba słowniki. Live metrics (`LeadOutcome`) liczy wygraną z
`closedAt` + `visitId`, a niestawiennictwo z terminów (`ABANDONED`), a nie ze statusu leada.

### 2.6. Co znika z interfejsu

- `LeadStatusPicker` i zbiorcze „Zmień status”. Zostaje chip etapu (tylko do odczytu)
  i akcja „Zamknij”.
- `MarkAsLeadModal`, zastąpiony przyciskiem „To zapytanie” bez okna.
- Pozycje „Leady” i „Poczta” w menu: jedna pozycja „Zapytania” z jednym licznikiem. Stare
  adresy `/leads` i `/communication` przekierowują z zachowaniem `?lead=` / `?thread=`.
- `LeadTimeline` jako osobna implementacja rozmowy.
- Druga kolekcja notatek.
- Okno modalne leada nad rozmową: kontekst zawsze stoi obok, w szynie.

---

## Krok 3. Makiety

Legenda do wszystkich makiet:

| Znak | Znaczenie | Jak w interfejsie |
|---|---|---|
| `●` | Ruch po naszej stronie | Pogrubiony nagłówek wiersza (jak nieprzeczytane w poczcie) i kropka w kolorze marki. |
| `○` | Czekamy na klienta | Zwykła waga pisma, szary tekst, bez kropki w kolorze. |
| `◷` | Ucichło (próg ciszy przekroczony) | Szary zegar, wiek w odcieniu bursztynu. |
| `!26 godz.` | Nasza zwłoka przekroczyła próg studia | Wiek w czerwieni. To jedyny czerwony element listy. |
| `[Odpisał na wycenę 4 200 zł]` | Klient odpowiedział po wysłaniu wyceny, czyli najgorętsza sprawa | Chip z tłem i obwódką w odcieniu marki, **bez wypełnienia**. |
| `▌` | Sprawa otwarta obok | Pasek przy lewej krawędzi i tło `surfaceAlt`. |
| `╔═╗` | Jedyna wyniesiona sekcja kolumny | Powierzchnia, promień `xl`, dwa cienie, pasek marki u góry (CLAUDE.md §2, „wyniesienie”). |
| `███` | **Jedyny wypełniony element okna** | `FooterPrimary`: dwie linie, kafelek ikony, strzałka. |
| `( … )` | Akcje drugorzędne | Obwódka i tło w odcieniu, bez wypełnienia. |

Makiety nie używają kropki środkowej jako separatora (CLAUDE.md §4). Dwa fakty w jednym
wierszu rozdziela odstęp, przecinek albo osobna linia.

### 3.1. Desktop (≥ 1280 px): klient odpisał na wycenę i pyta o termin

Krokiem następnym jest **umówienie**, więc wypełniony jest przycisk w szynie. „Wyślij” w edytorze
jest drugorzędny, a podpowiedź asystenta pokazuje wolne okna z kalendarza.

```
┌────┬────────────────────────────────────┬──────────────────────────────────────────────────┬────────────────────────────────────────┐
│ ⌂  │ Zapytania                    ⌕  ✎  │ BMW X5 G05                [Odłóż ▾]  [⋯]         │ ╔════════════════════════════════════╗ │
│    │ W wycenach 18 400 zł, 7 spraw      │ Jan Kowalski, jan.k@wp.pl                        │ ║ Wycena                 4 200,00 zł ║ │
│ ✉3 │ (Sprawy 9) (Pozostała poczta 4)    │ Wycena wysłana       Odpisał 2 godz. temu        │ ║ wysłana 12 paź, 14:30              ║ │
│    │─────────────────────────────────── │──────────────────────────────────────────────────│ ║ ────────────────────────────────── ║ │
│ ▦  │ Czeka na nas                    3  │                     12 paź                       │ ║ Powłoka ceramiczna 3 l.   3 400,00 ║ │
│    │▌● BMW X5 G05              2 godz.  │ ┌ Jan Kowalski, 10:12 ──────────────────┐        │ ║ Korekta 1-etapowa           800,00 ║ │
│ ☺  │▌  [Odpisał na wycenę 4 200 zł]     │ │ Dzień dobry, ile kosztowałaby powłoka │        │ ║ (+ usługa)                         ║ │
│    │▌  „Czy da się w przyszły wtorek?”  │ │ ceramiczna na X5? Lakier ma rysy.     │        │ ║ Podobne zlecenia: 3 900–4 600 zł   ║ │
│ $  │▌  Jan Kowalski                     │ │ Załączniki: 2 zdjęcia                 │        │ ╚════════════════════════════════════╝ │
│    │                                    │ └───────────────────────────────────────┘        │                                        │
│ ⚙  │ ● Audi RS6 C8            !26 godz. │         ┌ Ty, 14:30 ─────────────────────────┐   │ Pojazd                         zmień   │
│    │   Nowe zapytanie                   │         │ Dzień dobry, przesyłam wycenę…     │   │ BMW X5 G05, 2021, czarny               │
│    │   „Ile za PPF na cały przód?”      │         │ ▸ Wycena 4 200,00 zł, 2 pozycje    │   │ 2 zdjęcia z maila                      │
│    │   Anna Nowak                       │         └────────────────────────────────────┘   │                                        │
│    │                                    │    ── Etap: Wycena wysłana (z wysyłki) ──        │ Klient                                 │
│    │ ● Tesla Model 3             5 min  │    ── Telefon 13 paź: „wraca po urlopie” ──      │ Jan Kowalski                           │
│    │   Nowe zapytanie, formularz WWW    │                      dziś                        │ +48 601 234 567              ☎         │
│    │   „Dzień dobry, interesuje mnie…”  │ ┌ Jan Kowalski, 9:40 ───────────────────┐        │ Stały klient: 3 wizyty, 9 800 zł       │
│    │                                    │ │ Czy da się w przyszły wtorek?         │        │ Ostatnio: korekta lakieru, 03.2026     │
│    │ Ucichło                         2  │ └───────────────────────────────────────┘        │                                        │
│    │ ◷ Porsche 911 992           6 dni  │                                                  │ Notatki                            1   │
│    │   Wycena 7 900 zł bez odzewu       │ ┌ Podpowiedź ──────────────────────────────────┐ │ „Woli kontakt po 16”                   │
│    │   (Przypomnij się)                 │ │ Klient pyta o termin. Wolne okna:            │ │                                        │
│    │ ◷ VW Golf 8 GTI             9 dni  │ │ wtorek 21.10 od 8:00 (2 dni pracy)           │ │                                        │
│    │   Wycena 1 900 zł bez odzewu       │ │ czwartek 23.10 od 8:00                       │ │                                        │
│    │                                    │ │ (Wstaw odpowiedź z tymi terminami)           │ │                                        │
│    │ U klienta                     4 ▾  │ └──────────────────────────────────────────────┘ │                                        │
│    │ ○ Škoda Octavia           1 dzień  │──────────────────────────────────────────────────│ ██████████████████████████████████████ │
│    │   Wycena wysłana 1 200 zł          │ Odpowiedz Janowi…                                │ ██ ▦  Umów na wt 21.10, 8:00     → ██  │
│    │ ○ Mercedes C W206           3 dni  │                                                  │ ██    i wyślij potwierdzenie       ██  │
│    │   Czekamy na zdjęcia auta          │ (+ Wycena) (+ Terminy) (Szkic) (Szablon ▾)       │ ██████████████████████████████████████ │
│    │                                    │                                   ( Wyślij )     │ Inny termin       Zamknij: przegrane   │
└────┴────────────────────────────────────┴──────────────────────────────────────────────────┴────────────────────────────────────────┘
```

Szerokości kolumn: kolejka 360 px (zwija się do 0, jak dziś `QueueColumn`), rozmowa elastyczna
z minimum 480 px, szyna 380 px. Poniżej 1280 px szyna chowa się do paska nad rozmową
(„Wycena 4 200 zł, wysłana ▾”), a jej treść wysuwa się jako panel, tak jak na telefonie.

### 3.2. Desktop: nowe zapytanie, wycena czeka na wysłanie

Ten sam ekran, inna sprawa. Krokiem następnym jest **wysłanie wyceny**: edytor jest otwarty ze
szkicem przygotowanym w tle, więc wypełniony jest „Wyślij wycenę”, a „Umów termin” w szynie
gaśnie do obwódki. Reguła z CLAUDE.md §2 („otwarty edytor przejmuje okno”) działa tu wprost.

```
┌────────────────────────────────────┬──────────────────────────────────────────────────┬────────────────────────────────────────┐
│ Czeka na nas                    3  │ Audi RS6 C8                 [Odłóż ▾]  [⋯]       │ ╔════════════════════════════════════╗ │
│ ● BMW X5 G05              2 godz.  │ Anna Nowak, a.nowak@firma.pl                     │ ║ Wycena (szkic)         7 800,00 zł ║ │
│   [Odpisał na wycenę 4 200 zł]     │ Nowe zapytanie        Czeka na nas 26 godz.      │ ║ nie wysłana                        ║ │
│                                    │──────────────────────────────────────────────────│ ║ ────────────────────────────────── ║ │
│▌● Audi RS6 C8            !26 godz. │ ┌ Anna Nowak, wczoraj 8:15 ─────────────┐        │ ║ PPF pełny przód           6 900,00 ║ │
│▌  Nowe zapytanie                   │ │ Ile za PPF na cały przód? Auto odbie- │        │ ║ Powłoka na folię            900,00 ║ │
│▌  „Ile za PPF na cały przód?”      │ │ ram z salonu w listopadzie.           │        │ ║ Podobne zlecenia: 7 200–8 400 zł   ║ │
│▌  Anna Nowak                       │ └───────────────────────────────────────┘        │ ╚════════════════════════════════════╝ │
│                                    │──────────────────────────────────────────────────│                                        │
│ ● Tesla Model 3             5 min  │ Do: a.nowak@firma.pl           Szkic gotowy ✓    │ Pojazd                                 │
│   Nowe zapytanie, formularz WWW    │ ┌──────────────────────────────────────────────┐ │ Audi RS6 C8, nowy (rozpoznany ┄┄)      │
│                                    │ │ Dzień dobry Pani Anno,                       │ │                                        │
│                                    │ │ dziękujemy za zapytanie. Dla RS6 C8:         │ │ Klient                                 │
│                                    │ │ ┌ WYCENA ─────────────────────── [edytuj] ┐  │ │ Anna Nowak, nowy kontakt               │
│                                    │ │ │ PPF pełny przód          6 900,00 zł    │  │ │ (Dodaj do kartoteki)                   │
│                                    │ │ │ Powłoka na folię           900,00 zł    │  │ │                                        │
│                                    │ │ │ Razem brutto             7 800,00 zł    │  │ │                                        │
│                                    │ │ └─────────────────────────────────────────┘  │ │                                        │
│                                    │ │ Termin: 2 dni robocze, wolne od 4.11.        │ │                                        │
│                                    │ └──────────────────────────────────────────────┘ │                                        │
│                                    │ (+ Terminy) (Szablon ▾)      Po wysłaniu:        │                                        │
│                                    │                              Wycena wysłana ▾    │                                        │
│                                    │                  ████████████████████████████    │ ┌────────────────────────────────────┐ │
│                                    │                  ██ Wyślij wycenę 7 800 zł ██    │ │ ▦  Umów termin                     │ │
│                                    │                  ████████████████████████████    │ └────────────────────────────────────┘ │
└────────────────────────────────────┴──────────────────────────────────────────────────┴────────────────────────────────────────┘
```

Szczegóły, które robią różnicę:

- **„Szkic gotowy ✓”**: szkic powstaje w chwili wpływu zapytania, a nie po kliknięciu.
  Właściciel otwiera sprawę i czyta gotową odpowiedź zamiast czekać na model.
- **Blok WYCENA** w treści jest obiektem atomowym, budowanym z szyny, a nie prozą modelu.
  „[edytuj]” otwiera tę samą tabelę co szyna (`EditableServicesTable`). Edycja w jednym
  miejscu zmienia oba.
- **„Rozpoznany ┄┄”**: wartość wyciągnięta z maila, niepotwierdzona, ma przerywaną obwódkę.
  Wysłanie wyceny ją potwierdza (wzorzec „kropkowany fakt” ze specyfikacji UI, §2.4).

### 3.3. Telefon (< 768 px)

```
┌──────────────────────────────────┬──────────────────────────────────┬──────────────────────────────────┐
│ Zapytania                    ⌕   │ ‹  BMW X5 G05            [⋯]     │ ‹  BMW X5 G05                    │
│ W wycenach 18 400 zł             │    Jan Kowalski                  │                                  │
│──────────────────────────────────│ ┌──────────────────────────────┐ │ ┌──────────────────────────────┐ │
│ Czeka na nas                 3   │ │ Wycena 4 200 zł, wysłana   ▴ │ │ │ ━━━━                         │ │
│ ● BMW X5 G05           2 godz.   │ └──────────────────────────────┘ │ │ Wycena          4 200,00 zł  │ │
│   [Odpisał na wycenę 4 200]      │                                  │ │ wysłana 12 paź, 14:30        │ │
│   „Czy da się we wtorek?”        │ ┌ Jan, 12 paź 10:12 ───────┐     │ │                              │ │
│                                  │ │ Ile kosztowałaby powłoka │     │ │ Powłoka cer. 3 l.  3 400,00  │ │
│ ● Audi RS6 C8         !26 godz.  │ │ na X5? Lakier ma rysy.   │     │ │ Korekta 1-etap.      800,00  │ │
│   Nowe zapytanie                 │ └──────────────────────────┘     │ │ (+ usługa)                   │ │
│   „Ile za PPF na przód?”         │       ┌ Ty, 14:30 ───────────┐   │ │                              │ │
│                                  │       │ ▸ Wycena 4 200,00 zł │   │ │ Pojazd                       │ │
│ Ucichło                      2   │       └──────────────────────┘   │ │ BMW X5 G05, 2021, czarny     │ │
│ ◷ Porsche 911            6 dni   │ ┌ Jan, dziś 9:40 ──────────┐     │ │                              │ │
│   Wycena 7 900 zł bez odzewu     │ │ Czy da się we wtorek?    │     │ │ Klient                       │ │
│                                  │ └──────────────────────────┘     │ │ Stały: 3 wizyty, 9 800 zł    │ │
│ U klienta                  4 ▸   │                                  │ │ +48 601 234 567          ☎   │ │
│                                  │ ████████████████████████████████ │ │                              │ │
│                                  │ ██ Umów na wt 21.10, 8:00   ██   │ │ (Zamknij jako przegrane)     │ │
│                                  │ ████████████████████████████████ │ └──────────────────────────────┘ │
│──────────────────────────────────│ Odpowiedz…            (Szkic) ☎  │                                  │
│  ⌂     ▦    [✉ 3]    ☺     ≡     │                                  │                                  │
└──────────────────────────────────┴──────────────────────────────────┴──────────────────────────────────┘
   1. Lista (kciuk)                    2. Rozmowa                         3. Wycena: arkusz z dołu (▴)
```

- Ekran 1: licznik w dolnym pasku jest **jeden**, ten sam co w menu na komputerze (F3).
- Ekran 2: kwota wyceny stoi w pasku nad rozmową. Stuknięcie wysuwa arkusz (ekran 3).
  Krok następny siedzi nad edytorem, w zasięgu kciuka. Gdy krokiem jest odpowiedź, wypełniony
  jest „Wyślij” w edytorze, a pasek „Umów” znika.
- Arkusz i edytor pełnoekranowy blokują przewijanie tła **wyłącznie** przez `ModalShell` /
  `acquireScrollLock()` (CLAUDE.md §3).

### 3.4. Jak odróżniamy „ruch właściciela” od „czekamy na klienta”

```
 ┌──────────────────────────────────────┐
 │ Czeka na nas                       3 │   nagłówek sekcji: nazwa pismem tekstowym i licznik
 │ ● BMW X5 G05                2 godz.  │ ← pogrubione, kropka w kolorze marki
 │   [Odpisał na wycenę 4 200 zł]       │ ← chip w odcieniu marki: najgorętszy przypadek
 │   „Czy da się w przyszły wtorek?”    │ ← ostatnie zdanie klienta, nie temat maila
 │                                      │
 │ ● Audi RS6 C8              !26 godz. │ ← wiek w czerwieni: przekroczony próg studia
 │   Nowe zapytanie                     │
 │                                      │
 │ Ucichło                            2 │
 │ ◷ Porsche 911 992             6 dni  │ ← szary zegar, wiek w bursztynie
 │   Wycena 7 900 zł bez odzewu         │ ← tu kwota JEST argumentem: to pieniądze do odzyskania
 │   (Przypomnij się)                   │ ← jedno kliknięcie, szkic przypomnienia gotowy
 │                                      │
 │ U klienta                        4 ▾ │ ← zwijana sekcja (jak dziś quietFolded)
 │ ○ Škoda Octavia             1 dzień  │ ← zwykła waga, szary tekst
 │   Wycena wysłana 1 200 zł            │
 └──────────────────────────────────────┘
```

Zasady, które tu działają, i źródło każdej:

1. **Waga pisma niesie „czyj ruch”**, a kolor tylko wyjątek, czyli przekroczony próg
   (`LeadQueueCard.tsx:1-28`, decyzja już podjęta, zostaje).
2. **Druga linia to zdanie o stanie, a trzecia to głos klienta.** Dzisiejsza karta nie ma
   trzeciej linii (F11). To jedyna rzecz, która pozwala zdecydować bez otwierania sprawy.
3. **Chip „Odpisał na wycenę”** pojawia się wyłącznie przy `turn = OURS` i etapie `QUOTED`.
   To jest moment, w którym sprawa jest najbliżej pieniędzy, więc dostaje jedyny akcent
   na wierszu. Chip ma tło i obwódkę, nigdy wypełnienie.
4. Kolejność: najpierw czyj ruch, potem wiek. W „Czeka na nas” sprawy z chipem
   „Odpisał na wycenę” idą **przed** nowymi zapytaniami w tym samym wieku. To jedyna zmiana
   w `buildWorklist`.

### 3.5. Co jest wypełnione w którym stanie

| Stan sprawy | Jedyny wypełniony element | Reszta |
|---|---|---|
| Nowe zapytanie, ruch nasz | „Wyślij wycenę” w edytorze | „Umów termin” w szynie: obwódka |
| Wycena wysłana, klient odpisał i pyta o termin | „Umów na …” w szynie | „Wyślij”: obwódka |
| Wycena wysłana, klient odpisał z pytaniem (nie o termin) | „Wyślij” w edytorze | „Umów termin”: obwódka |
| Wycena wysłana, ruch klienta | **nic**: nie ma kroku następnego, więc nic nie woła | „Przypomnij się” pojawia się dopiero w „Ucichło” |
| Umówione | „Zobacz termin” | — |
| Zamknięte | „Napisz wiadomość” (jak dziś) | — |

Logika jest już w `leadPrimaryAction.ts` i w stopce `LeadDetailModal.tsx:2309-2361`.
Przebudowa przenosi ją w jedno miejsce i dokłada gałąź „klient pyta o termin”, którą
rozpoznaje asystent.

---

## Krok 4. Plan wdrożenia

Wiadomość z zadaniem zapowiadała cztery kroki, a opisywała trzy. Czwarty potraktowałem
jako plan wdrożenia, bo bez niego trzy poprzednie nie dają się wycenić.

### Faza 0. Naprawy niezależne od przebudowy (bez migracji)

| Zadanie | Gdzie |
|---|---|
| Publikować `LeadClientRepliedEvent` przy przychodzącej wiadomości w wątku leada. Dodać push i obsługę w `useLeadsSocket` (O2). | `comms/engine/CommsIngestService.kt`, `push/notify/PushEventBridge.kt`, `hooks/useLeads.ts` |
| Automat kalendarza nie nadpisuje `LOST`. | `leads/appointment/LeadSyncService.kt:120-140` |
| Odwołanie terminu ≠ „Nie pojawił się”: cofać do `IN_PROGRESS` jak przy usunięciu, a `NO_SHOW` zostawić tylko dla porzucenia. **Wymaga decyzji biznesu**: dziś to świadoma reguła („anulowanie znaczy, że klient się wycofał”, komentarz w `LeadSyncService.kt:70-72`), tyle że anuluje też studio. | `LeadSyncService.kt:101-104`, `appointment/cancel/CancelAppointmentHandler.kt:64` |
| Wiadomość klienta przywraca wątek z archiwum i otwiera ponownie zamkniętą sprawę. | `comms/engine/CommsIngestService.kt`, `LeadStatusService` |
| Akceptacja połączenia nie zakłada drugiego leada. | `inbound/accept/AcceptCallHandler.kt:41-76` |
| Ślepa uliczka w panelu leada: droga do rozmowy niezależnie od tego, czyj jest ruch. | `components/LeadDetailModal.tsx:1607, 2323-2347` |
| Licznik leadów w dolnym pasku telefonu. | `widgets/BottomNav/BottomNav.tsx:130-139` |

### Faza 1. Jeden ekran (sam frontend, bez zmian modelu)

1. Trasa `/zapytania` złożona z istniejących klocków: kolejka z `LeadsView` (+ trzecia linia
   z ostatnim zdaniem klienta), środek z `ConversationView` + `ReplyComposer` (z `leadId`),
   szyna z treści `LeadDetailPane`.
2. Zakładka „Pozostała poczta”: lista z `MailView` z filtrem „wątki bez sprawy”. Potrzebny
   parametr `withoutLead=true` na `GET /comms/threads`, bo dziś jest tylko `onlyLeads`.
3. Jedna pozycja menu, jeden licznik, przekierowania ze starych adresów.
4. `LeadStatusPicker` znika z interfejsu. W jego miejscu chip etapu i „Zamknij”.
5. Jeden próg układu dla całego ekranu (dziś 1024 vs 1280 px, F16).

Po tej fazie znikają F1-F8, F11, F13 i F16, a backend jeszcze się nie zmienił.

### Faza 2. Model (backend + frontend)

1. Tabela `lead_quotes` (snapshot wysłanej wyceny) + `quote` w `POST /comms/send` + przejście
   `QUOTED`. Blok wyceny w edytorze i przełącznik „Po wysłaniu”.
2. Migracja słownika statusów według §2.5 (po zmierzeniu reguły dla `IN_PROGRESS` na kopii
   produkcji). Macierz dozwolonych przejść w `LeadStatusService`.
3. „Czyj ruch” liczony wyłącznie w backendzie, ze wszystkich kanałów (`lastContactAt`, O4),
   zwracany w DTO. Usunięcie `resolveTurn` z frontendu i pozostałych trzech źródeł.
4. `snoozedUntil` (O3) i akcja „Odłóż”.
5. Jedna kolekcja notatek (migracja notatek kontaktu do wspólnej tabeli).

### Faza 3. Asystent, który oszczędza kliknięcia

1. Szkic odpowiedzi generowany przy wpływie zapytania, a nie po kliknięciu (z limitem
   dziennym, jak `LeadClassificationRateLimiter`).
2. Podpowiedź „klient pyta o termin” z wolnymi oknami z kalendarza i akcja
   „Umów na …” z terminem wyjętym z wiadomości.
3. Przypomnienia w „Ucichło” (O5, `stagnant_alert_sent_at` już istnieje).
4. Przypisanie sprawy do osoby, gdy w studiu pracuje więcej niż jedna (F17).

### Testy, które muszą pilnować nowego modelu

- `LeadStatusService`: macierz przejść, `LOST` nienadpisywany przez kalendarz, ponowne
  otwarcie po wiadomości klienta.
- `SendMailHandler`: wysyłka z `quote` → `QUOTED` + snapshot. Wysyłka bez `quote` → etap
  bez zmian.
- Snapshot wyceny: 1900,00 zł brutto wpisane w szynie = 1900,00 zł w mailu = 1900,00 zł
  w terminie (rozszerzenie testów z CLAUDE.md §1).
- `buildWorklist`: „Odpisał na wycenę” przed nowym zapytaniem w tym samym wieku.
- Istniejące testy z CLAUDE.md (`priceAdjustment`, `useServicePricing`, `scrollLock`,
  `useModalViewport`) zostają nietknięte.

### Jak sprawdzić, że cel osiągnięty

| Miara | Dziś (do zmierzenia) | Cel |
|---|---|---|
| Ręczne zmiany statusu na sprawę | `lead_status_history` z `changed_by_user_id` | bliskie 0, poza „Zamknij” |
| Kliknięcia od maila do wysłanej wyceny | ok. 7 | 3 |
| Czas pierwszej odpowiedzi (mediana) | `firstResponseAt − createdAt` | spadek |
| Udział spraw „Odpisał na wycenę” obsłużonych w 24 h | brak danych (F15) | mierzone od fazy 0 |

---

## Znalezione przy okazji, poza zakresem przebudowy

- `LeadsView.tsx:548` przełącza układ przez `useBreakpoint('xl')` (`min-width: 1280px`),
  a CSS kolumn przez `max-width: 1280px`. Przy oknie szerokim dokładnie na 1280 px oba
  warunki są prawdziwe naraz. Do sprawdzenia w przeglądarce.
- Komentarze niezgodne z kodem: `MailView.tsx:5-11` (mówi o dwóch folderach, są trzy),
  `menuSections.ts:110-112` (mówi, że lead powstaje tylko z kliknięcia, a są leady
  automatyczne), `LeadDetailModal.tsx:2293-2296` (obiecuje link, którego nie ma).
- `MarkThreadAsLeadHandler.kt:149` nie zdejmuje `thread.screening`, a
  `FormSubmissionThreads.attachLead` zdejmuje (`:86-91`). Wątek oznaczony jako lead może
  zostać w „Odrzuconych”.
- `AwaitingWorkService.kt` liczy `CONFIRMED` jako otwarte, więc sprawa z terminem, w której
  klient napisał „dziękuję”, zapala licznik „czeka na nas”.
