# Moduł Instagram / Monitoring Konkurencji — Przebudowa widoków (Projekt UI)

> Status: propozycja · Data: 2026-08-12
> Dokument-towarzysz projektu przebudowy modułu. Całość (analiza API Meta, ramy prawne, metryki,
> silnik insightów, plan faz): `automotive-crm-v2-backend/docs/instagram-competitor-module-redesign.md`.
> Ten plik opisuje wyłącznie warstwę frontendową: nową architekturę informacji, widoki
> i porządki w kodzie `src/modules/competition-monitoring/`.

---

## 1. Diagnoza obecnego UI (skrót)

Route `/instagram` → `CompetitionMonitoringView`: 2 zakładki strony → 4 pod-zakładki wykresów
→ selektor okresu w headerze; obok siebie wykresy (max 4 profile), 9-kolumnowa tabela rankingowa
(wszystkie profile) i macierz "SEO profilu" — trzy różne modele selekcji na jednym ekranie.
Wszystkie liczby bezwzględne: zero delt, percentyli, benchmarków, brak wiersza "Twoje studio".
Interpretację pików wykresów tłumaczą akapity prozy zamiast systemu. Modal postów to zrzut
surowych caption'ów bez zdjęć, linków, sortowania. Stan wyłącznie w `useState` — nic w URL.

Martwy kod (nigdy nieimportowane): `CompetitionRanking.tsx`, `CompetitionTable.tsx`,
`EngagementTrendChart.tsx`, `PostVolumeChart.tsx` (~2 050 linii) + ~470 linii mock fixtures
w `api/instagramApi.ts` wchodzących do bundla. Typy `InstagramStory`/`StoryGroup` — nieużywane.

## 2. Zasady nowej architektury informacji

1. **Piramida: wniosek → kontekst → surowe dane.** Ekran startowy pokazuje insighty i pozycję
   studia; tabele i wykresy są warstwą drugą; surowe posty — trzecią, na żądanie.
2. **Żadnej liczby bez kontekstu.** Każda metryka przychodzi z backendu jako
   `{ value, delta, benchmark }` i tak jest renderowana (wartość + strzałka z deltą + pozycja
   vs mediana koszyka). Komponent `MetricCell` wymusza to kontraktem propsów.
3. **Jeden model selekcji.** Selekcja profili, okres i filtry żyją w URL-u
   (`useSearchParams`), współdzielone przez wszystkie komponenty widoku.
4. **System etykietuje, nie tłumaczy.** Zamiast akapitów "piki mogą oznaczać…" — adnotacje
   zdarzeń na wykresach (pin "promocja", "viral post", "skok obserwujących") z danych
   `GET /insights`.
5. **Stories znikają z UI** (decyzja projektowa — patrz dokument główny §4.3): zakładka
   "Stories", serie `*_stories`, `storiesPerWeek`, `dailyStoryStats`.

## 3. Nowe widoki

Nawigacja modułu: trzy zakładki płaskie (bez pod-zakładek) + panel zarządzania profilami
wysuwany z headera. Route'y: `/instagram` (Przegląd), `/instagram/porownanie`,
`/instagram/tresci` — stan w URL, deep-linkowalny z digestu e-mail.

### 3.1 Przegląd (default) — `GET /overview`

- **Pasek "Twoja pozycja"**: rank + percentyl w koszyku, indeks aktywności marketingowej
  z deltą tygodniową, wskaźnik witryny cyfrowej z linkiem do braków.
- **Feed insightów** (max 5 nowych/tydz.): karty *co się stało → dlaczego ważne → co zrobić*,
  severity kolorem, akcje "odhaczono" (`POST /insights/{id}/dismiss`) i deep-link do
  Porównania/Treści z prefiltrem.
- **Mini-ranking**: 5 wierszy (Ty + top 4), 3 kolumny: ER% · wzrost obserwujących · posty/tydz.
  — każda jako `MetricCell` z deltą.
- Stopka: "Dane z niedzieli DD.MM · następna synchronizacja za N dni" (stały, widoczny
  wskaźnik świeżości — dziś ukryty w empty state).

### 3.2 Porównanie — `GET /benchmark`

- **Tabela benchmarkowa v2**: wiersz "Twoje studio" przyklejony i wyróżniony; kolumny:
  ER% · wzrost 30d · posty/tydz. · regularność · mix formatów (mini stacked bar) · indeks;
  każda komórka z deltą i kolorem względem mediany koszyka. Sortowanie po kolumnach,
  bez limitu profili (wykresy — patrz niżej — max 4, wybór klikiem w wiersz jak dziś).
- **Dokładnie dwa wykresy** (recharts, jak dotąd): aktywność tygodniowa (posty; Reels
  odróżnione tonem, nie osobną zakładką) i obserwujący (dziennie). Oba z **adnotacjami
  zdarzeń** (`ReferenceDot`/`ReferenceLine` + tooltip insightu) zamiast czterech zakładek
  z akapitami. Tooltip pokazuje tylko hoverowaną serię.
- Wskaźnik witryny cyfrowej per profil (liczba 0–100 + expander z listą braków) zastępuje
  macierz `ProfileSeoCard`.

### 3.3 Treści — `GET /content`, `/content/heatmap`, `/hashtags`

- **Eksplorator postów koszyka**: sortowanie po ER% (default) / dacie, filtry temat + format
  + profil, paginacja z backendu. Karta posta = **oEmbed Instagrama** (oficjalny embed,
  fallback: link `permalink` + krótki cytat caption z atrybucją) + metryki + etykieta tematu
  + reakcja 👍/👎 (stan z backendu — koniec z `localStorage` `ig_post_reactions`).
- **Heatmapa publikacji**: dzień tygodnia × pora dnia, ważona ER%.
- **Top hasztagi** koszyka z ER%, z akcją "użyj w generatorze" (przekazanie do
  `GeneratePostModal` jako `styleNotes`/temat).

### 3.4 Zarządzanie profilami

Przenosi się z głównej zakładki do panelu (drawer) pod przyciskiem w headerze: lista profili
ze statusami, moderacja (approve/reject — bez zmian), usuwanie **z dialogiem potwierdzenia**
(dziś brak). Badge liczby oczekujących na przycisku headera zastępuje niebieski banner.

## 4. Porządki w kodzie (niezależne od nowych funkcji)

1. Usunąć 4 martwe komponenty (`CompetitionRanking`, `CompetitionTable`,
   `EngagementTrendChart`, `PostVolumeChart`) i mock fixtures z `instagramApi.ts`
   (jeśli mocki potrzebne — przenieść do plików testowych poza bundlem).
2. Usunąć typy `InstagramStory`/`StoryGroup` i wszystkie pola stories z `types.ts`.
3. Ujednolicić modale na `ModalKit` (dziś `PostsModal` i `GeneratePostModal` mają własne
   portale/style) i ikony na `lucide-react` (dziś mieszanka z inline SVG).
4. `GeneratePostModal`: nie połykać błędów (`catch { setPhase('form') }`) — pokazać komunikat.
5. Mutacje approve/reject/remove muszą invalidować także query summary/benchmark
   (dziś tylko `instagram-profiles` — zakładka analityki pokazuje stan sprzed zmiany).
6. Zastąpić `useMemo`-jako-efekt przy auto-selekcji profili logiką w URL-state.
7. Przenieść hardcodowane stringi modułu do `common/i18n/pl.ts` (moduł jako jedyny ich nie używa).
8. Ustawić sensowne `staleTime` dla query (dane zmieniają się raz dziennie/tydzień —
   default 0 powoduje zbędne refetche).

## 5. Kolejność wdrożenia (frontend = faza 4 planu głównego)

1. Porządki §4 (bezpieczne, natychmiastowe — można zrobić przed backendem v2).
2. Warstwa API v2 (`overview`, `insights`, `benchmark`, `content`) + typy `{value, delta, benchmark}`.
3. Widok Przegląd (za feature flagiem `INSTAGRAM_V2`).
4. Porównanie + adnotacje na wykresach; usunięcie starej zakładki Analityka.
5. Treści (oEmbed, heatmapa, hasztagi) + drawer profili; usunięcie `PostsModal`.
