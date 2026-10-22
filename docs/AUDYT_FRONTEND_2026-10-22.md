# Frontend (przeglądarka) — audyt bezpieczeństwa, zależności i nieużywanego kodu

Data: 22.10.2026. Zakres: wszystko, co trafia do przeglądarki albo ją konfiguruje —
`src/`, `public/`, `index.html`, `package.json` / `package-lock.json`, konfiguracja
Vite / TypeScript / ESLint, nagłówki HTTP z `deploy/ngnix/ngnix.conf`. Backend poza
zakresem.

Metoda: `npm audit`, `npm outdated`, `knip` (nieużywane pliki, eksporty, zależności),
`tsc -b`, `eslint .`, `vitest run`, `vite build` z przeszukaniem paczki, ręczny przegląd
kodu pod kątem XSS, przekierowań, `postMessage`, `window.open`, przechowywania danych,
źródeł zewnętrznych i nagłówków. Stan wyjściowy: gałąź `feat/dokumenty-prawne`
z niezacommitowanymi zmianami (dokumenty prawne, subskrypcja) — tych plików audyt nie
poprawia poza tym, co wymusza kompilacja.

---

## 1. Werdykt w czterech zdaniach

1. Kod przeglądarki jest w dobrej kondycji pod względem XSS — każde miejsce wstawiające
   HTML przechodzi przez DOMPurify albo własny filtr — ale ma luki na granicach: mail od
   obcego nadawcy może przykryć cały CRM fałszywą nakładką, adresy z serwera trafiają do
   `window.open`/`location` bez sprawdzenia schematu, push może otworzyć obcą stronę,
   brak Content-Security-Policy i Permissions-Policy (sekcja 5).
2. `npm audit`: **23 podatności (1 krytyczna, 12 wysokich, 9 średnich, 1 niska)** —
   żadna nie trafia do paczki przeglądarki (wszystkie siedzą w narzędziach: Vite, PostCSS,
   Rollup, jsdom, ESLint, Capacitor CLI), ale dwie dotyczą serwera deweloperskiego Vite,
   który czyta pliki z dysku programisty. Wszystkie da się usunąć bez zmiany wersji głównej.
3. `npm run build` **nie przechodzi**: `tsc -b` zgłasza 159 błędów i zużywa ~8 GB pamięci
   (przy domyślnym limicie Node pada z „heap out of memory"), dlatego Dockerfile buduje
   `build:prod` z pominięciem sprawdzania typów. Kilka z tych błędów to prawdziwe usterki,
   reszta to martwy kod i nieaktualne typy.
4. Nieużywany kod: 61 plików w `src/` (~3,8 tys. linii), martwe gałęzie z danymi
   testowymi (`USE_MOCKS = false`) w 17 plikach API, strona demonstracyjna
   `/protocols/demo` w produkcji, 1042 eksporty, z których nikt nie importuje
   (484 symbole całkowicie martwe), 75 nieużywanych zmiennych.

---

## 2. Podatności w zależnościach (`npm audit`)

Żaden z tych pakietów nie jest w paczce, którą pobiera przeglądarka (sprawdzone na
`vite build`: brak `faye-websocket` / `websocket-driver` w `dist/`, `sockjs-client`
podmienia transport na przeglądarkowy przez pole `browser`). Ryzyko dotyczy maszyn
deweloperskich i budowania.

| Pakiet | Waga | Skąd | Co grozi | Naprawa |
|---|---|---|---|---|
| `websocket-driver` ≤0.7.4 | krytyczna | `sockjs-client` → `faye-websocket` | obejście limitów kompresji (tylko Node) | `npm audit fix` → 0.7.5 |
| `vite` 7.3.1 | wysoka | bezpośrednia | **odczyt dowolnego pliku przez WebSocket serwera dev**, obejście `server.fs.deny`, wykonanie skryptu z innego źródła przez middleware | ≥7.3.7 |
| `postcss` 8.5.6 (+ 8.4.49 w `styled-components`) | wysoka | bezpośrednia | XSS przez `</style>` w wyjściu, odczyt pliku przez źródłową mapę | ≥8.5.31, `styled-components` ≥6.6.0 |
| `rollup` ≤4.58 | wysoka | `vite` | zapis pliku poza katalogiem (path traversal) | `npm audit fix` |
| `undici` 7.25 | wysoka | `jsdom` (testy) | 21 błędów klienta HTTP | `npm audit fix` |
| `brace-expansion`, `minimatch`, `picomatch`, `flatted`, `js-yaml`, `nanoid`, `source-map-js`, `browserslist` | wysoka | ESLint, Vite, PostCSS | DoS / ReDoS w narzędziach | `npm audit fix` |
| `vitest` 4.1.6 / `@vitest/mocker` | średnia | bezpośrednia | odczyt pliku, wstrzyknięcie mocka przez serwer testów | ≥4.1.12 |
| `ajv`, `@humanfs/node`, `baseline-browser-mapping` | średnia | ESLint, browserslist | ReDoS, kopiowanie przez dowiązania | `npm audit fix` |
| `uuid` <11.1.1 → `xcode` → `@capacitor/cli` | średnia | narzędzie iOS | brak kontroli granic bufora (nieużywana ścieżka v3/v5/v6) | `overrides` dla `xcode` (audit proponuje cofnięcie CLI do 8.4.3 — zły kierunek) |
| `@babel/core` ≤7.29 | niska | `@vitejs/plugin-react` | odczyt pliku przez `sourceMappingURL` | `npm audit fix` |

---

## 3. Problemy z zależnościami

| # | Problem | Skutek | Naprawa |
|---|---|---|---|
| 3.1 | `@types/styled-components` (typy v5) przy `styled-components` v6, która ma własne typy | martwa zależność, myląca przy aktualizacjach | usunąć |
| 3.2 | `@radix-ui/react-dialog` — zero importów | martwa zależność | usunąć |
| 3.3 | `dinero.js@2.0.0-alpha.14` + `@dinero.js/currencies` (porzucony pakiet, ostatnia wersja alpha.15) | biblioteka pieniędzy na wersji alfa; od 2.0 stabilnej waluty są w `dinero.js/currencies` | `dinero.js@^2.0.2`, import `PLN` z `dinero.js/currencies`, usunąć `@dinero.js/currencies` |
| 3.4 | `react-router` importowany wprost (`ProtectedRoute.tsx`, test `IdleTimeoutProvider`), a w `package.json` jest tylko `react-router-dom` | działa przypadkiem (zależność przechodnia); inna wersja po deduplikacji = dwa routery i zerwany kontekst | import z `react-router-dom` |
| 3.5 | `vite.config.ts`: `defineConfig` z `vite` z kluczem `test` → błąd TS2769; `environmentMatchGlobs` usunięte w Vitest 4 (ignorowane po cichu — środowisko jsdom ustawia komentarz `@vitest-environment` w każdym teście) | `tsc -b` pada na konfiguracji | `defineConfig` z `vitest/config`, usunąć martwy klucz |
| 3.6 | `tsconfig.app.json` — nikt go nie używa (`tsc -b` i edytor czytają `tsconfig.json`), a `tsconfig.json` ma `lib: ES2020`, choć Vite celuje w przeglądarki z ES2022 | 3 fałszywe błędy (`Array.prototype.at`), dwie rozjechane konfiguracje | `tsconfig.json` → ES2022, usunąć `tsconfig.app.json` |
| 3.7 | `tailwind.config.js` — w Tailwind 4 plik konfiguracyjny JS jest ignorowany bez dyrektywy `@config` | martwa konfiguracja udająca żywą | usunąć |
| 3.8 | ESLint lintuje `android/app/build/…`, `ios/`, `marketing/` (wygenerowane i obce pliki) | szum w wynikach | `globalIgnores` |
| 3.9 | Baza `caniuse-lite` sprzed 10 miesięcy | Autoprefixer i cel budowania liczą na starych danych | `update-browserslist-db` |
| 3.10 | `detailboost-release.jks` (klucz podpisu aplikacji Android) leży w katalogu repozytorium, nieśledzony, ale **nie jest w `.gitignore` ani `.dockerignore`** | jedno `git add .` i klucz podpisu sklepu jest w historii; `COPY . .` wnosi go do obrazu budującego | `*.jks`, `*.keystore` do `.gitignore` i `.dockerignore` |
| 3.11 | `@capacitor/ios` zgłaszany przez knip jako nieużywany | fałszywy alarm — potrzebny `cap sync ios` | zostaje; konfiguracja `knip.json` |

Poza zakresem (świadomie, wymagają osobnej decyzji): aktualizacje wersji głównych
(`vite` 8, `vitest` 5, `eslint` 10, `typescript` 7, `lucide-react` 1.x,
`@fullcalendar` 7, `@hookform/resolvers` 6), zastąpienie `sockjs-client` czystym
WebSocketem (wymaga zmiany punktu końcowego na backendzie).

---

## 4. Błędy kompilacji i lintera

`tsc -b`: 159 błędów w 57 plikach. Po kategoriach:

| Kategoria | Liczba | Przykład |
|---|---|---|
| Nieużywane zmienne / importy / komponenty stylów (TS6133, TS6196) | 45 | `VehicleTable.tsx` — `StatusBadge`, `StatusDot`, `STATUS_CONFIG` |
| Dane testowe niezgodne z typami w martwych gałęziach `USE_MOCKS` | ~55 | `customerApi.ts` — 12× `notes: string` zamiast `CustomerNote[]` |
| Typy niezgodne z danymi (`null` vs `undefined`, brakujące pola) | ~40 | `CustomerModal.tsx`, `QuickEventModal/index.tsx` |
| Nieistniejące eksporty / nazwy | 9 | `DateClickArg` z `@fullcalendar/core` (jest w `interaction`), `AdjustmentType`, `CalendarViewType`, `DictateState`, `CommunicationEntry` |
| `JSX` jako globalna przestrzeń nazw (usunięta w React 19) | 2 | `OperationStatusBadge.tsx` |
| Prawdziwe usterki logiki | kilka | `PaymentSummaryTab.tsx` porównuje `ReportGranularity` z wartościami, których typ nie zna (`YEARLY`, `QUARTERLY`); `useReservationActions.ts` woła `showToast('…', 'success')`, a funkcja przyjmuje obiekt — po porzuceniu, przywróceniu i usunięciu rezerwacji pokazuje się **pusty** toast; `Tablica` podstawiała zmyślone zdjęcia z Instagrama, opinie Google i zadania, gdy backend ich nie zwrócił |

`eslint .`: 210 problemów — 75 nieużywanych zmiennych, 36 `set-state-in-effect`,
28 `no-explicit-any`, 23 `only-export-components`, 12 `refs`, 10 `exhaustive-deps`,
5 `immutability`, po kilka `prefer-const`, `no-case-declarations`, `ban-ts-comment`,
nieaktualne dyrektywy `eslint-disable`.

Wdrożenie naprawia: wszystkie błędy `tsc`, wszystkie nieużywane zmienne, `prefer-const`,
`no-case-declarations`, `ban-ts-comment`, `no-unused-expressions`, `no-empty-object-type`,
`immutability` w `useVoiceCommandsLogic` (sprzątanie przed deklaracją pomocników),
`purity`, nieaktualne dyrektywy. Reguły React Compiler (`set-state-in-effect`, `refs`,
`exhaustive-deps`), `any` i `only-export-components` dotyczą wydajności i HMR, nie
bezpieczeństwa ani martwego kodu — każda wymaga przepisania logiki komponentu
i osobnego testu; zostają opisane w sekcji 9.

---

## 5. Luki w kodzie przeglądarki

Bez znalezisk krytycznych i wysokich. Logowanie stoi na ciasteczku sesji — w
`localStorage`, adresach URL ani na WebSockecie nie ma tokenów. React 19 blokuje
`javascript:` w `href`/`src` renderowanych przez JSX, więc linki z danych serwera
w komponentach nie są wektorem XSS. Wszystkie miejsca wstawiające HTML przechodzą przez
DOMPurify albo filtr kompozytora. `postMessage` sprawdza źródło i podaje jawny
`targetOrigin`. W kodzie produkcyjnym nie ma `console.log`, sekretów ani otwartych
przekierowań (logowanie nie przyjmuje `returnTo`). Devtools React Query są wycinane
z paczki produkcyjnej.

### 5.1 Średnie

**M1. Mail od kogokolwiek może przykryć cały CRM fałszywą nakładką.**
`comms/components/MessageBody.tsx` — prosty mail (≤3 elementy ze stylami) renderuje się
wprost w stronie CRM, nie w ramce. DOMPurify i backend (jsoup) przepuszczają atrybut
`style`, a w nim `position:fixed; inset:0; z-index:2147483647`. Obcy nadawca wysyła
`<div style="position:fixed;inset:0;…">Sesja wygasła — zaloguj się</div>` z linkiem do
swojej strony; pracownik otwiera mail i widzi „ekran logowania" w zaufanej aplikacji.
Naprawa: hak DOMPurify usuwający `position`, `z-index`, `inset`/`top`/`left`/… z `style`
w treści maili.

**M2. Klucz podpisu aplikacji Android w katalogu repozytorium bez wpisu w `.gitignore`.**
Patrz 3.10.

### 5.2 Niskie

**L1. Brak wspólnej kontroli schematu adresu tam, gdzie React nie chroni.**
`core/native/nativeFiles.ts` (`openNatively`) w aplikacji ze sklepu kończy się
`window.location.href = url.href` dla każdego schematu poza http(s)/blob/data — także
`javascript:`, który wykonałby się w originie aplikacji razem z mostem Capacitora.
W przeglądarce chroni przed tym `noopener` w `window.open`, ale powłoka natywna
(`installNativeShell.ts`) podmienia `window.open` i flagę ignoruje. To samo dotyczy
`window.location.assign` z adresem z serwera (`useAccounts.ts`, `ContactsSyncSection.tsx`,
`useCheckoutHandoff.ts`) i `window.open` w `DashboardHintsBar.tsx`,
`CompetitionMonitoringView.tsx`. Dziś wszystkie te adresy buduje serwer — luka zależy od
tego, że backend nigdy nie odda adresu podyktowanego przez klienta. Naprawa:
`common/utils/safeUrl.ts` (http, https, mailto, tel, sms, własny blob) i użycie go w tych
miejscach.

**L2. Kliknięcie powiadomienia push może otworzyć dowolną stronę.**
`public/service-worker.js` — `new URL(data.url, origin)` przyjmuje adres absolutny.
Aplikacja natywna (`nativePush.ts`) już ogranicza to do ścieżek `/`. Naprawa: odrzucić
adres spoza własnego originu.

**L3. `window.open(url, '_blank')` bez `noopener` na plikach z S3** (13 miejsc:
`DocumentsManager`, `VehicleDocuments`, `VehiclePhotoGallery`, `ProtocolSection`,
`DocumentPreview`, `SigningRequirementModal`). Typ pliku przy wgrywaniu ustala klient
(`file.type`), więc wgrany plik HTML dostałby `window.opener` do karty CRM
(reverse tabnabbing). Naprawa: `'noopener,noreferrer'`.

**L4. Ramka maila projektowanego bez warstwy klienckiej.** `MessageBody.tsx` — `srcDoc`
dostaje HTML z API bez DOMPurify, choć nagłówek pliku obiecuje dwie warstwy (backend jest
szczelny, sandbox bez `allow-scripts`). `ADD_ATTR: ['rel']` przepuszcza `rel="opener"`.
Naprawa: DOMPurify także dla ramki, CSP w `<meta>` wewnątrz `srcdoc`, wymuszone
`rel="noopener noreferrer"` przy `target`.

**L5. Ochrona przed CSRF stoi wyłącznie na `SameSite=Lax`.** Backend ma CSRF wyłączone,
`apiClient` nie wysyła nagłówka anty-CSRF, a każda subdomena `*.detailboost.pl` jest
„same-site". Naprawa wymaga backendu (nagłówek wymagany na mutacjach albo
`CookieCsrfTokenRepository`) — poza zakresem, opisane w sekcji 8.

**L6. Cache logo w service workerze łapie za dużo.** `LOGO_URL_PATTERN` nie jest
zakotwiczony: każde żądanie, którego adres *zawiera* ten ciąg (także nawigacja do
`/api/…?x=cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset`), idzie z cache na zawsze;
cache'owane są też odpowiedzi błędne. Naprawa: wzorzec od `^https://cdn.jsdelivr.net/`,
tylko `destination === 'image'`, tylko odpowiedzi poprawne.

### 5.3 Drobne / informacyjne

- Dane osobowe przeżywające wylogowanie na wspólnym urządzeniu: szkice wydania pojazdu
  z danymi nabywcy (`useHandover.ts`), szkice uszkodzeń z telefonu
  (`mobile-damage-<token>`). Naprawa: czyszczenie przy wylogowaniu.
- `useCheckInWizard.saveDraft` — martwy kod, który zapisywałby dane klienta w
  `localStorage`. Usunąć.
- Wyciek `URL.createObjectURL` bez `revokeObjectURL` (`VisitDetailView.tsx`).
- Logo marek z `@master` repozytorium GitHub przez jsDelivr (`carLogos.ts`) —
  niezapięte na commit; zmiana w obcym repozytorium zmienia obrazki w CRM.
- Ramki PDF bez `sandbox` (`PdfViewerModal`, `ImageViewerModal`, `DocumentPreview`) —
  zostają: Chrome nie wyświetla PDF w ramce z `sandbox`.
- Tokeny stron publicznych (`/vc`, `/sign`, `/m/…`) zostają w historii przeglądarki;
  do zewnętrznych serwisów nie wyciekają (`Referrer-Policy`, brak obcych zasobów na tych
  stronach).

### 5.4 Nagłówki HTTP (`deploy/ngnix/ngnix.conf`)

Jest: `frame-ancestors 'self'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`,
`server_tokens off`. Brakuje:

- **Content-Security-Policy dla skryptów.** Paczka nie ma skryptów inline ani `eval`,
  więc `script-src 'self'` jest osiągalne, ale strona ładuje obrazy, pliki i ramki
  z adresów, które podaje serwer (S3 — dokładny host zależy od `S3_ENDPOINT`, CDN-y Meta,
  Instagram), a aplikacja ze sklepu wstrzykuje most Capacitora. Wymuszenie pełnej polityki
  na ślepo grozi wyłączeniem wgrywania plików na produkcji. Wdrożenie: wymuszone
  dyrektywy, które niczego legalnego nie blokują (`object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `frame-ancestors 'self'`), oraz pełna polityka w trybie
  `Content-Security-Policy-Report-Only` — naruszenia widać w konsoli przeglądarki; po
  tygodniu bez naruszeń przełącza się ją na wymuszaną.
- **Permissions-Policy.** Aplikacja używa kamery (skaner kodów) i mikrofonu (notatki
  głosowe), nic więcej: `camera=(self), microphone=(self), geolocation=(), payment=(),
  usb=()`.
- HSTS ustawia proxy z TLS przed kontenerem (kontener słucha na 80) — poza tym plikiem.

---

## 6. Nieużywany kod

### 6.1 Pliki bez żadnego importu (61 plików, ~3,8 tys. linii)

Barrel-e modułów, z których nikt nie importuje (`auth`, `batch-orders`, `campaigns`,
`competition-monitoring`, `consents`, `customers`, `dashboard`, `employees`, `finance`,
`protocols`, `public-signing`, `settings`, `statistics`, `vehicles`, `visits`,
`voice-commands` — `index.ts`), stare komponenty (`Badge`, `BaseControls`, `Card`,
`Divider`, `Stepper`, `TabBar`, `DetailHero`, `MobileSectionNav`, `ComingSoonView`,
`VisitHistoryStyles`, `SummaryStep`, `ErrorScreen`, `LeadUrgencyBadge`, `PeriodPicker`,
`EditReservationDetailsModal`, `CategoryCard`, `vehicleMappers`), nieużywane hooki
(`useCustomerReservations`, `useUpdateConsent`, `useUpdateNotes`, `useEmailCampaigns`,
`useVehicleAppointments`, `useVehicleVisits`), `delayStatsApi.ts`, `App.css`.

**Mina:** `src/modules/protocols/index.ts` przy imporcie instaluje na `apiClient`
interceptor podmieniający odpowiedzi API danymi testowymi (`mockProtocolsInterceptor.ts`).
Dziś nikt tego pliku nie importuje, ale pierwszy, kto napisze
`import { … } from '@/modules/protocols'`, przełączy protokoły w produkcji na dane
zmyślone.

`SummaryStep.tsx` jest wymieniony w `CLAUDE.md` jako wzorzec podsumowania protokołu,
choć od dawna nic go nie renderuje — wpis w `CLAUDE.md` do poprawienia razem z usunięciem.

### 6.2 Martwe gałęzie z danymi testowymi

17 plików API ma `const USE_MOCKS = false` i obok prawdziwych wywołań pełne zestawy
zmyślonych danych (klienci, pojazdy, wizyty, logowanie `test@example.com` /
`password123`). Rollup usuwa je z paczki, ale w kodzie stanowią ~połowę błędów `tsc`,
a przełączenie flagi przez pomyłkę daje aplikację na danych zmyślonych. Usunąć gałęzie
i dane.

### 6.3 Strona demonstracyjna w produkcji

`/protocols/demo` (`ProtocolDemoView.tsx`) — strona testowa z identyfikatorem wizyty
`demo-visit-123`, dostępna dla każdego z uprawnieniem `VISITS_CREATE`, niepodlinkowana
z menu. Trafia do paczki jako osobny plik. Usunąć trasę i widok.

### 6.4 Eksporty bez importu

1042 eksporty i typy, których nikt nie importuje: 557 jest używanych lokalnie
(zbędne `export`), 484 to symbole całkowicie martwe (nieużywane komponenty stylów,
funkcje pomocnicze, typy). Do tego 5 zdublowanych eksportów (ten sam symbol pod dwiema
nazwami). Wyjątek świadomy: wartości enumów odpowiadające kontraktowi backendu
(`DocumentType.INVOICE`, `CORRECTION`, `DocumentDirection.EXPENSE`) zostają.

---

## 7. Plan wdrożenia

1. Zależności: `npm audit fix`, podniesienie dolnych granic `vite`, `vitest`, `postcss`,
   `styled-components`, `dompurify`; `overrides` dla `uuid` w `xcode`; usunięcie
   `@types/styled-components`, `@radix-ui/react-dialog`, `@dinero.js/currencies`;
   `dinero.js` stabilne; `react-router` → `react-router-dom`; baza browserslist.
2. Konfiguracja: `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, usunięcie
   `tsconfig.app.json` i `tailwind.config.js`, `.gitignore`/`.dockerignore`, `knip.json`.
3. Luki z sekcji 5 i nagłówki `nginx`.
4. Nieużywany kod z sekcji 6.
5. Pozostałe błędy `tsc` i lintera z sekcji 4.
6. Weryfikacja: `tsc -b`, `eslint .`, `vitest run`, `vite build`, `npm audit`, `knip`.

Eksporty używane tylko we własnym pliku (557) nie są martwym kodem — zbędne słowo
`export` nie zmienia paczki, więc ich nie ruszamy (`ignoreExportsUsedInFile` w
`knip.json`). Usuwamy symbole, których nie używa nikt.

---

## 8. Wynik wdrożenia

| Sprawdzenie | Przed | Po |
|---|---|---|
| `npm audit` | 23 podatności (1 krytyczna, 12 wysokich) | **0** |
| `tsc -b` | 159 błędów, ~8 GB pamięci, 139 s (pada na domyślnym limicie Node) | **0 błędów**, 2,4 GB, 26 s |
| `npm run build` | nie przechodzi | **przechodzi** |
| `eslint .` | 210 problemów | 112 (wyłącznie reguły z listy niżej) |
| `vitest run` | 338 plików, 2722 testy | **340 plików, 2743 testy, wszystkie zielone** |
| `knip` | 61 plików, 1042 eksporty, 3 zależności | **0** |
| Kod | | −13,5 tys. linii w 279 plikach |

Pamięć `tsc` zjadały głównie zmyślone dane w martwych gałęziach `USE_MOCKS` (wielkie
literały obiektów niezgodne z typami) — po ich usunięciu `npm run build` mieści się
w domyślnym limicie i Dockerfile może wrócić do budowania ze sprawdzaniem typów.

Przy okazji wyszły i zostały naprawione usterki widoczne dla użytkownika:

- pusty toast po porzuceniu, przywróceniu i usunięciu rezerwacji (`useReservationActions`);
- okno usuwania rezerwacji z serii otwarte z kalendarza pisało „rezerwacja klienta "
  bez nazwiska (obiekt miał pole `customerName`, okno czytało `customerFirstName`);
- typ szczegółowości raportu płatności nie zgadzał się z backendem
  (`PaymentMethodReportHandler`: `MONTHLY | QUARTERLY | YEARLY`);
- przyjęcie pojazdu wczytywało do nowego przyjęcia dane klienta z dawnego szkicu
  w `localStorage`, którego nic już nie zapisywało.

Nowe testy: `common/utils/safeUrl.test.ts` (schematy adresów), `MessageBody.test.tsx`
(nakładka z maila, `rel="noopener"`, skrypty), przypadek `javascript:` w
`installNativeShell.test.ts`. Testy `MessageBody` przy wycofanej poprawce padają.

Niezweryfikowane lokalnie: `nginx -t` (Docker nie działał — składnia `map` w `conf.d`
jest standardowa, test `nginxConfig.test.ts` przechodzi) oraz ekrany po zalogowaniu
(lokalnie nie było backendu; zbudowana paczka renderuje logowanie i strony dokumentów
prawnych bez błędów JS).

## 9. Poza zakresem / do decyzji

- **CSRF (L5)** — wymaga backendu: nagłówek wymagany na mutacjach albo
  `CookieCsrfTokenRepository` w Spring Security (axios wyśle `X-XSRF-TOKEN` sam).
- **Wymuszenie pełnej CSP** — po tygodniu bez naruszeń w konsoli przenieść
  `$csp_report_only` do `$csp_enforced` w `ngnix.conf`; najpierw potwierdzić host S3
  z `S3_ENDPOINT` i domeny CDN Meta.
- **Logo marek** — zapiąć `carLogos.ts` (i wzorzec w `service-worker.js`) na konkretny
  commit repozytorium `car-logos-dataset` zamiast `@master`.
- **Szkice wydania z danymi nabywcy w `localStorage`** — czy czyścić je przy
  wylogowaniu, to decyzja produktowa (szkic ma przeżyć odświeżenie strony).
- **Limity rozmiaru plików** po stronie klienta dla dokumentów klienta/pojazdu, zdjęć
  i szablonów protokołów (backend i tak ogranicza).
- **ESLint, 112 pozostałych zgłoszeń** — reguły React Compiler (`set-state-in-effect` 35,
  `refs` 13, `exhaustive-deps` 10, `immutability` 3 — zapis do refa przez obiekt z hooka,
  `incompatible-library` 3), `no-explicit-any` 27, `only-export-components` 21 (tylko HMR).
  Każde wymaga przepisania logiki komponentu z osobnym testem; nie dotyczą bezpieczeństwa
  ani martwego kodu.
- **Aktualizacje wersji głównych**: `vite` 8, `vitest` 5, `eslint` 10, `typescript` 7,
  `lucide-react` 1.x, `@fullcalendar` 7, `@hookform/resolvers` 6.
- **Dockerfile** — `node:current-alpine` (pływająca wersja, dziś nieparzysta gałąź)
  i `build:prod` bez sprawdzania typów; po tym wdrożeniu można przejść na
  `node:24-alpine` i `npm run build`.
