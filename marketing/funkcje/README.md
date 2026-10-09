# Samouczek funkcji DetailBoost (7 min)

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

Okna aplikacji są odtworzone w HTML: krój Inter, kolory CRM, prawdziwe etykiety z kodu.
Obowiązują w nich reguły z `CLAUDE.md`:

- jeden wypełniony przycisk na okno;
- brak kropki środkowej jako separatora;
- kwoty brutto wpisane przez człowieka zostają brutto, a netto i VAT są z nich liczone
  (1 230,00 zł → netto 1 000,00 zł; 2 490,00 zł → netto 2 024,39 zł, VAT 465,61 zł).

## Czytelność

Każdy napis rejestruje się w silniku (`ctx.read`). `node render.mjs audit` sprawdza, czy
stoi w pełni widoczny co najmniej `1,4 s + 0,42 s × liczba słów` (min. 3 s). Etykieta
kroku liczy się jako 0,2 s na słowo. Przy zmianie czasów audyt musi przejść:
`100 napisów, za krótko: 0`.

## Gdzie film odbiega od aplikacji

Trzy hasła z briefu nie mają w CRM dokładnego odpowiednika:

- **Sezonowość:** osobnego widoku sezonowości nie ma. Sezon pokazuje wykres
  „Przychody i wizyty” przy grupowaniu „Miesięcznie” i okresie 12 miesięcy, i tak go
  pokazujemy.
- **Prośba o opinię:** gotowej automatyzacji nie ma. W filmie to kampania automatyczna
  („3 dni po usłudze”) z własną treścią studia, co CRM już umożliwia. Przypomnienie
  o powłoce to kampania „180 dni po usłudze Powłoka ceramiczna” i szablon „Przypomnienie
  po przerwie”.
- **Lista obecności:** w CRM nie ma odbijania wejścia i wyjścia. Godziny raportuje się
  przyciskiem „Zaraportuj 8 godzin pracy”, a lista obecności to dokument generowany
  z zatwierdzonych kart pracy. Film pokazuje dokładnie to.

Pozostałe różnice:

- **Leady i Poczta** to w aplikacji jedna skrzynka „Zapytania”.
- **Filtr maili:** interfejs nie mówi o AI. Pokazuje skutki: etykiety „Sprawa” i „Spam”,
  grupę „Powiadomienia i reklamy” oraz folder „Odrzucone przez automat”. Słowo „AI” pada
  tylko w tytułach filmu i na przycisku „Napisz z AI”.
- **Faktura przy wydaniu** jest pokazana w trybie, w którym CRM sam wystawia faktury.
  W trybie „Faktury wystawia księgowość” wydanie pojazdu zapisuje tylko płatność.

## Pliki

| Plik | Rola |
|---|---|
| `index.html` | strona filmu; `?scene=id` pokazuje jedną scenę, `?render=1` wyłącza odtwarzacz |
| `engine.js` | silnik: rejestr scen, przejścia, podpisy, ramki, kursor, liczniki, audyt, tło z kropek |
| `style.css` | tokeny filmu (jak na stronie) i klocki aplikacji (jak w CRM) |
| `scenes/00_wspolne.js` | plansza rozdziału, wykres kołowy |
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

Render 7 minut w 60 kl./s trwa ok. 50 minut na 4 rdzeniach. Klipy z `cut` są wycięte
z filmu, więc na brzegach mają po 0,7 s przenikania z sąsiednią sceną. Czysty klip
z wejściem i wyjściem z czerni daje `video --scene <id>`.
