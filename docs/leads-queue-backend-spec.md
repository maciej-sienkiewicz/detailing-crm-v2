# Kolejka zapytań — zmiany wymagane po stronie backendu

**Dokument wdrożeniowy** · 2026-09-06
Repozytorium docelowe: `maciej-sienkiewicz/automotive-crm-v2-backend`
Odpowiadający frontend: commit „feat(leady): kolejka «Skrzynka zapytań» zamiast tabeli"

Frontend modułu leadów przeszedł z tabeli na kolejkę priorytetową. Część decyzji
projektowych da się utrzymać wyłącznie razem ze zmianami po stronie serwera.
Ten dokument je wylicza, w kolejności wdrożenia.

---

## ⚠️ Kolejność wdrożenia ma znaczenie

**B3 musi trafić na produkcję PRZED frontendem**, inaczej zmienia się widoczne
zachowanie u wszystkich klientów naraz, bez powodu produktowego.

Frontend czyta teraz progi stygnięcia z `GET /api/v1/company/lead-alert-config`.
Kontroler zwraca dziś `settings?.leadStagnantOurThresholdHours ?: 48`
(`studio/settings/CompanyController.kt:238-239`). Interfejs pokazywał dotąd
**24 h i 120 h** (5 dni) — wartości zaszyte w usuniętym `leadReply.ts`. Jeśli
frontend pojedzie pierwszy, każda plakietka „Wymagany kontakt / Czeka N dni"
przeskoczy z progu 24 h na 48 h, a „Cisza" z 5 dni na 3.

Do czasu wdrożenia B3 frontend zachowuje się bezpiecznie tylko wtedy, gdy
endpoint **zawodzi** (wtedy sięga po `DEFAULT_STAGNATION` = 24 h / 120 h).
To nie jest stan, na którym wolno poprzestać.

---

## B3 — progi stygnięcia: migracja i domyślne (BLOKUJĄCE)

**Problem.** Kolumny `lead_stagnant_our_threshold_hours` i
`lead_stagnant_client_threshold_hours` istnieją **wyłącznie w encji Kotlina**
(`studio/settings/StudioSettingsEntity.kt:47-51`). Żadna migracja Flyway ich nie
tworzy — `grep -rn "lead_stagnant" src/main/resources/` nie zwraca nic. Powstają
więc tylko przez `ddl-auto=update` z profilu lokalnego
(`application.properties:13`), podczas gdy profil produkcyjny ma
`ddl-auto=validate` + Flyway (`application-docker-props.properties:12-16`).

**Do zrobienia.**

1. Migracja `V115__lead_stagnation_thresholds.sql` (V114 to ostatnia zajęta):

```sql
ALTER TABLE studio_settings
    ADD COLUMN IF NOT EXISTS lead_stagnant_our_threshold_hours    INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN IF NOT EXISTS lead_stagnant_client_threshold_hours INTEGER NOT NULL DEFAULT 120;
```

   Bez backfillu — `DEFAULT` obsługuje istniejące wiersze. Jeśli kolumny już
   powstały przez `ddl-auto=update` z wartościami 48/72, migracja musi je
   wyrównać:

```sql
UPDATE studio_settings SET lead_stagnant_our_threshold_hours = 24
    WHERE lead_stagnant_our_threshold_hours = 48;
UPDATE studio_settings SET lead_stagnant_client_threshold_hours = 120
    WHERE lead_stagnant_client_threshold_hours = 72;
```

   To jest świadomie ryzykowne dla studia, które ustawiło 48/72 ręcznie — ale
   ustawić ich nie mogło, bo żaden ekran tego nie oferuje, a endpoint jest
   `@RequiresOwner` i nieudokumentowany. Jeżeli w produkcyjnej bazie kolumny
   nie istnieją, oba `UPDATE` są no-opem.

2. Domyślne w encji: `StudioSettingsEntity.kt:48` → `24`, `:51` → `120`.

3. Fallbacki w kontrolerze: `CompanyController.kt:238-239` → `?: 24` i `?: 120`.

**Dlaczego 24/120, a nie 48/72.** Progi sterują wyłącznie warstwą prezentacji.
Backendowe 48/72 nigdy nie były przez nic czytane, więc nie ma czego zachowywać;
24/120 to liczby, które użytkownicy widzą od miesięcy. Zmiana domyślnych
przesunęłaby każdą plakietkę na ekranie bez decyzji produktowej.

---

## B2 — reguła pilności obejmuje leady bez wątku (BLOKUJĄCE dla spójności liczb)

**Problem.** `awaitingReply` wymaga `l.threadId IS NOT NULL`
(`leads/infrastructure/LeadRepository.kt:63`), a `LeadConversationStateService`
mapuje wyłącznie leady z wątkiem (`:26-27`) — reszta dostaje `NO_CONVERSATION`,
czyli `waitingSince = null`. **Lead z telefonu, z formularza albo dodany ręcznie
nigdy nie pokaże się jako wymagający odpowiedzi**: nie wejdzie do `awaiting`
w analityce, nie trafi do filtru „Do odpisania", nie dostanie paska pilności.
Łapie go jedynie `countNeedingAttention`, i to tylko dopóki ma status `NEW`
(`LeadRepository.kt:120`) — a odnotowanie telefonu przestawia go na
`IN_PROGRESS` i gasi plakietkę.

Frontend liczy to już poprawnie po swojej stronie
(`comms/utils/leadUrgency.ts`), ale **serwerowe liczniki i analityka nadal
liczą inaczej** — czyli plakietka w menu i kwota w analityce rozjeżdżają się
z tym, co widać na liście.

**Do zrobienia.** Rozszerzyć warunek zaległości o gałąź dla leadów bez wątku,
w trzech miejscach, tą samą regułą:

> lead jest „naszym ruchem" gdy: (ma wątek I jest wiadomość od klienta bez
> naszej odpowiedzi po niej) **LUB** (nie ma wątku I `first_response_at IS NULL`).

1. `LeadRepository.search(...)` — warunek `awaitingReply` (`:62-72`).
2. `LeadRepository.countNeedingAttention(...)` (`:117-131`) — po tej zmianie
   warunek `status = NEW` przestaje być potrzebny jako osobna gałąź, bo lead
   `NEW` bez odpowiedzi i tak spełnia nową regułę.
3. `GetLeadAnalyticsHandler.awaiting(...)` (`:536-575`) — dziś odsiewa wszystko,
   co nie jest `AWAITING_OUR_REPLY`, więc leady telefoniczne nie wchodzą do
   `AwaitingWorkDto.value`. Kwota „czeka na odpowiedź" jest przez to zaniżona.

Kolumny są — `thread_id` (`V63:163`) i `first_response_at` (`V63:166`).
**Bez migracji.**

---

## B1 — kierunek sortowania listy (WAŻNE, przestało być blokujące)

**Ustalenie z implementacji.** W specyfikacji figurowało jako blokujące. Nie
jest: „wszystkie otwarte" to i tak **trzy zapytania** (filtr `status` jest
jednowartościowy), więc żadne sortowanie serwerowe nie ułoży trzech odpowiedzi
w jedną kolejkę — frontend scala je i porządkuje sam, po wieku oczekiwania.

Zostaje jednak realny problem: `ORDER BY l.createdAt DESC` jest zaszyte w JPQL
(`LeadRepository.kt:73`), a `PageRequest.of(...)` powstaje **bez `Sort`**
(`LeadQueryHandlers.kt:62`). Archiwum chce dokładnie tej kolejności, kolejka —
odwrotnej. Podmiana stałej naprawiłaby jedno i zepsuła drugie.

**Do zrobienia.** Parametr `sortDirection` (`ASC` | `DESC`, domyślnie `DESC`)
na `GET /api/v1/leads` (`LeadsController.kt:139-146`), przekazany jako `Sort`
do `PageRequest` i usunięty z treści JPQL. Frontend **już go wysyła** — archiwum
posyła jawne `DESC`. Indeks `idx_leads_studio_created` (`V63:174`) pokrywa oba
kierunki, więc **bez migracji**.

---

## O1 — filtr wielostatusowy (podnosi sufit skalowania)

`status` jest jednowartościowy (`LeadRepository.kt:58`), stąd trzy zapytania na
kolejkę i trzy na archiwum. Przy dziesiątkach spraw otwartych to bez znaczenia,
ale frontend zapala ostrzeżenie, gdy któraś strona dobije do sufitu
(`pageSize.coerceIn(1, 100)`, `LeadQueryHandlers.kt:62`). Gdy zacznie się
zapalać u realnych klientów, kolejka musi dostać **jedno** zapytanie:
`status IN (:statuses)` plus sortowanie serwerowe. Indeks
`idx_leads_studio_status` pokrywa. Bez migracji.

---

## O2 — push przy odpowiedzi klienta

`LeadClientRepliedEvent` ma nasłuch WebSocket (`dashboard/WebSocketEventBridge.kt:72-83`),
ale **nie ma nasłuchu push**: `PushEventBridge.kt:63-90` reaguje wyłącznie na
`NewLeadCreatedEvent` i `NewCallReceivedEvent`. Właściciel dostaje więc
powiadomienie o nowym zapytaniu, ale nie o tym, że klient odpisał na jego wycenę
— a to drugie jest w lejku ważniejsze. Nowy nasłuch, `PushNotificationType`
istnieje. Bez migracji.

Powiązane: frontend nadal ignoruje `LEAD_CLIENT_REPLIED` w `useLeadsSocket`
(przepuszcza tylko `LEAD_UPDATED` i `LEAD_STATUS_CHANGED`). Do podpięcia razem.

---

## O3 — odłożenie sprawy (`snoozed_until`)

Jedyny sposób na „widziałem, wrócę po południu" bez fałszowania statusu. Dziś
właściciel, który chce coś odłożyć, nie ma czym — a przestawienie statusu żeby
zniknęło z kolejki jest dokładnie tym nawykiem, który psuje dane.

Migracja prosta: kolumna nullable, `NULL` = brak odłożenia, **zero backfillu**.

---

## O4 — znacznik ostatniego kontaktu poza pocztą

**Podniesione z „opcjonalne" na „wysokie" po zgłoszeniu z użytkowania.** To nie
jest już kosmetyka wieku etykiety: bez tego pola segment „Twój ruch" pokazuje
sprawy, które są załatwione.

**Objaw.** Użytkownik klika „Kontakt poza pocztą", dostaje potwierdzenie —
i lead zostaje w „Twój ruch".

**Przyczyna, potwierdzona kodem.** `RecordLeadCallbackHandler.handle`
(`leads/callback/LeadCallbacks.kt:91-127`) robi trzy rzeczy: zapisuje wiersz
w `lead_callbacks`, stempluje `first_response_at` **tylko gdy jest `null`**
(komentarz w kodzie mówi wprost: kolejne telefony go nie przesuwają, żeby
statystyka mierzyła czas pierwszej reakcji) i przesuwa `NEW → IN_PROGRESS`.
Nie rusza natomiast `replyState` — bo ten nie jest kolumną, tylko wynikiem
zapytania po `comm_messages` (`LeadConversationStateService`). Telefon nie jest
wiadomością, więc „czyj ruch" go nie widzi.

**Co front robi dzisiaj.** `resolveTurn` traktuje `first_response_at` nowszy niż
`waiting_since` jako dowód, że odezwaliśmy się po ostatniej wiadomości klienta,
i oddaje ruch klientowi. To domyka **pierwszy** kontakt w sprawie i tylko jego.
Sekwencja: klient pisze → odpisujemy mailem → klient pisze znowu → dzwonimy —
nadal zostawia leada w „Twój ruch", bo `first_response_at` stoi na pierwszym
mailu i jest starszy od ostatniej wiadomości klienta.

**Naprawa.** Wystawić w DTO leada znacznik ostatniego wpisu z `lead_callbacks`
(tabela istnieje, `V110`), np. `lastContactAt`. Migracja niepotrzebna, jeśli
liczone przy odczycie — jak `replyState`. Front zamieni wtedy `first_response_at`
w tej gałęzi na nowy znacznik i przybliżenie zniknie.

---

## O5 — follow-upy i zadanie cykliczne

Opisane w `docs/communication-leads-architecture.md:295-304`, niezbudowane.
Kolumna `leads.stagnant_alert_sent_at` istnieje od `V63:162` i **nigdy nie jest
ustawiana na wartość inną niż `null`** — każde miejsce, które ją zapisuje,
wpisuje `null`. W pakiecie `leads` nie ma ani jednego `@Scheduled` poza
indekserem podobnych zleceń (`similar/VisitSimilarityIndexer.kt:105`).

Duża praca, ale scheduler jest ścieżką wydeptaną — w aplikacji działa już
26 klas z `@Scheduled`. To brama do wariantu „system mówi, co zrobić dziś",
który świadomie odrzuciliśmy w pierwszej wersji.

---

## Czego frontend NIE wymaga

Dla porządku, żeby nikt nie robił tego „przy okazji":

- **Pola kolejności/pozycji** (`position`, `sort_order`) — nie ma i nie jest
  potrzebne. Kolejka układa się po wieku oczekiwania; ręcznego przeciągania
  świadomie nie ma.
- **Zmian w modelu statusów** — sześć wartości zostaje bez zmian.
- **Nowych kanałów** (SMS, WhatsApp) — poza zakresem.
