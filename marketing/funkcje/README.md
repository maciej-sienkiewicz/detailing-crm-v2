# Samouczek funkcji DetailBoost (ok. 17 min)

Film prezentujący funkcje CRM, rozdział po rozdziale: statystyki, finanse, pracownicy,
kampanie SMS i poczta. Każda funkcja to osobna scena, którą da się wyciąć jako
samodzielny klip. Ścieżki dźwiękowej nie ma, bo lektor (ElevenLabs) dochodzi w kolejnym
etapie. Pod nagranie lektora służą `timeline.md` (czasy scen) i `napisy.md` (każdy napis
z oknem czasu, w którym stoi na ekranie).

Wideo to strona HTML z osią czasu GSAP, renderowana klatka po klatce w Chromium
i składana ffmpegiem, tak samo jak `../showreel`.

## Język wizualny

Warstwa filmu (tło, tytuły, podpisy) ma język strony `detailboost-webpage`:

- **Kroje:** Geist i Geist Mono, te same co na stronie (`a/`, licencja OFL w
  `a/OFL-Geist.txt`).
- **Kolory:** czerń i grafit, a jedynym kolorem jest złoto z logo. Złoto niesie światło
  i postęp: poświatę pod oknem, drugą linię tytułu i złotą ramkę na tym, o czym mowa.
- **Zero ikon w warstwie filmu.** Hierarchię niesie krój i numeracja `01.` w Geist Mono.
- **Podpis kroku:** etykieta w Geist Mono i jedno zdanie, jak `BeatCaption` na stronie.
- **Ruch:** okna wchodzą pochylone o 17° z osią na górnej krawędzi, jak `Stage3D`.
  Tłem jest siatka kropek z wędrującym światłem, przeniesiona z `DotField`.

## Widoki aplikacji to nagrania prawdziwego CRM

Każda scena funkcji (`recScene` w `scenes/00_nagrania.js`) to screencast uruchomionego
lokalnie backendu i frontu: klatki Chrome z czasem (`rec/<scena>/f/*.jpg`) i znaczniki
kroków (`rec/<scena>/meta.json`). Film pokazuje zawsze ostatnią klatkę przed bieżącą chwilą
nagrania, a warstwa filmu idzie za znacznikami: złota ramka mówi GDZIE (obszar elementu
zmierzony na stronie w chwili kroku), podpis mówi CO, kamera przybliża obszar kroku.
Gdy kroki są gęstsze niż czas czytania podpisu, klatka zatrzymuje się tuż przed następnym
krokiem na tyle, ile brakuje (`recPlan`).

Animacją, a nie widokiem aplikacji, są tylko: intro, plansze rozdziałów, telefon klienta
z SMS-ami (`sms-tel`, treści dokładnie z nagrań) i hasła finału. Ekrany urządzeń w finale
to zrzuty Tablicy (`capture/shots-final.mjs`).

Wszędzie, gdzie widok ma miejsce na awatar pojazdu, stoi prawdziwe logo marki z serwera
logotypów, które CRM sam wczytuje (`capture/lib.mjs` podaje je z lokalnej pamięci
podręcznej, `waitForLogo` czeka, aż się narysuje).

### Nagrywanie (`capture/`)

```sh
# Postgres, Redis, lokalny S3 (moto), SMTP na :1025, backend :8080 (-PksefStub), vite :5173.
# Backend z --ksef.sync.interval-ms=86400000 --ksef.sync.initial-delay-ms=86400000:
# harmonogram synchronizacji KSeF na atrapie SDK kończy się błędem i Finanse pokazują
# czerwony baner „Synchronizacja z KSeF nie powiodła się” - w nagraniu nie może go być.
cd capture && npm ci
node run.mjs grupy            # jedna scena → ../rec/grupy/
node shots-final.mjs          # zrzuty Tablicy do finału → ../rec/final/
```

Każde nagranie zakłada nowe konto demo (`POST /api/v1/demo`) i dosiewa dane poza
nagraniem (`seed.mjs`), tam gdzie zapisuje je CRM: przez API, a gdzie API nie ma
(synchronizacja KSeF, poczta, historia) - w te same tabele:

| Dosiewka | Po co |
|---|---|
| `seedSeasonalHistory`, `seedVisitDocuments` | 12 miesięcy zamkniętych wizyt z sezonem (szczyt kwiecień–lipiec) i dokumentami sprzedaży: statystyki, sezonowość, przychody, kasa |
| `seedCostData`, `insertIncomingInvoices`, `insertLeaseBuyout` | faktury kosztowe z KSeF z kategoriami, nowe faktury w trakcie nagrania, wykup auta zawyżający miesiąc |
| `seedTeam`, `seedPins`, `loginEmployee` | trzy osoby z rolami, godziny za sierpień i wrzesień, lista obecności za sierpień, PIN 1234, logowanie pracownika na telefonie w osobnej sesji |
| `seedTasks` | lista „Do zrobienia” |
| `enableSmsAutomation`, `seedCoatingCustomers` | kredyty SMS i automaty; klienci po powłoce sprzed pół roku, którzy nie wrócili, ze zgodą marketingową (odbiorcy kampanii „180 dni”) |
| `seedReturningCustomerLead`, `seedMailbox` | mail stałego klienta (Porsche 911) z sugestiami z cennika; skrzynka z powiadomieniami, spamem z formularza i jednym leadem odrzuconym przez pomyłkę |

Jedyna podstawiona odpowiedź serwera: szkic „Napisz z AI” (`scene-lead.mjs`), bo lokalnie
nie ma klucza OpenAI. Ma kształt `ReplyDraft` i kwoty z wyceny leada.

`rec/` (ok. 2 GB klatek) nie trafia do repozytorium - odtwarza się go skryptami powyżej.

## Czytelność

Każdy napis rejestruje się w silniku (`ctx.read`). `node render.mjs audit` sprawdza, czy
stoi w pełni widoczny co najmniej `1,4 s + 0,42 s × liczba słów` (min. 3 s). Etykieta
kroku liczy się jako 0,2 s na słowo. Przy zmianie czasów audyt musi przejść:
`134 napisów, za krótko: 0`.

## Gdzie film odbiega od haseł briefu

- **Sezonowość:** osobnego widoku nie ma. Sezon pokazuje wykres „Przychody i wizyty”
  przy okresie 12 miesięcy (CRM sam grupuje miesięcznie).
- **Prośba o opinię:** to treść „Podziękowania po wizycie” z linkiem do wizytówki
  (nagranie `sms`). Przypomnienie o powłoce to kampania automatyczna „180 dni po usłudze
  Powłoka ceramiczna IGL Eclipse” (nagranie `kampania`).
- **Lista obecności:** w CRM nie ma odbijania wejścia i wyjścia. Pracownik wpisuje godziny
  dnia, a lista obecności to PDF generowany z kart pracy.
- **Leady i Poczta** to w aplikacji jedna skrzynka „Zapytania”. Filtr poczty pokazuje
  skutki: „Sprawa”, „Powiadomienia i reklamy”, „Odrzucone przez automat”, „To jednak lead”.
- **Faktura przy wydaniu** jest pokazana w trybie, w którym CRM sam wystawia faktury.

## Pliki

| Plik | Rola |
|---|---|
| `index.html` | strona filmu; `?scene=id` pokazuje jedną scenę, `?render=1` wyłącza odtwarzacz |
| `engine.js` | silnik: rejestr scen, przejścia, podpisy, ramki, kursor, liczniki, audyt, tło z kropek |
| `style.css` | tokeny filmu (jak na stronie) i klocki aplikacji (jak w CRM) |
| `scenes/00_wspolne.js` | plansza rozdziału, wykres kołowy |
| `scenes/00_nagrania.js` | `recScene`: scena z nagrania, kroki, przytrzymania |
| `capture/` | nagrywanie prawdziwego CRM: `run.mjs`, `scene-*.mjs`, `seed.mjs`, `lib.mjs`, `recorder.mjs` |
| `scenes/01–07_*.js` | sceny w kolejności filmu |
| `render.mjs` | audyt, czasy, napisy, klatki podglądu, render i cięcie klipów |
| `timeline.md`, `napisy.md` | generowane przez `render.mjs timeline` i `render.mjs napisy` |
| `a/` | Geist i Geist Mono; logo, GSAP i Inter są brane z `../showreel/a` |

## Podgląd i render

Potrzebne: `playwright-core` i Chromium (`/opt/pw-browsers`) oraz ffmpeg z libx264.
`render.mjs` sam podnosi serwer plików. Gdy `playwright-core` nie jest w `node_modules`,
podaj ścieżkę w `PLAYWRIGHT_CORE`.

```sh
node render.mjs audit                                   # czytelność napisów
node render.mjs stills grupy 6,12.5                     # klatki podglądu jednej sceny → stills/
node render.mjs video out/detailboost_funkcje.mp4 --fps 60 --jobs 4 --crf 18
node render.mjs cut out/detailboost_funkcje.mp4         # klipy scen → out/klipy/
node render.mjs timeline && node render.mjs napisy      # ściągi pod lektora
```

Podgląd w przeglądarce: serwer z katalogu `marketing/` (np. `python3 -m http.server`) i
`/funkcje/index.html`. Spacja uruchamia i zatrzymuje, strzałki przewijają o 2 s, a
przyciski pod kadrem skaczą do scen.

Render całości w 60 kl./s trwa ok. 2 godzin na 4 rdzeniach. Klipy z `cut` są wycięte
z filmu, więc na brzegach mają po 0,7 s przenikania z sąsiednią sceną. Czysty klip
z wejściem i wyjściem z czerni daje `video --scene <id>`.
