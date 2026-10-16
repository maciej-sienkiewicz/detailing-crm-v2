# Schematy motocykla i skutera wodnego do mapy uszkodzeń

Źródła rysunków `public/assets/motorcycle.webp` i `jetski.webp`
(oraz ich kopii PNG w backendzie: `src/main/resources/images/vehicle/`). Rysunki są
wektorowe i parametryczne: każdy model to skrypt w `models/`, który rysuje widoki
w prawdziwych wymiarach (milimetry), a `build.mjs` składa z nich arkusz 768×768.

Schematy samochodów (`sedan`, `suv`, …) powstały inaczej i tu ich nie ma.

## Po co to trzymamy

Punkty mapy uszkodzeń są **procentami szerokości i wysokości obrazka**. Rysunek wolno
poprawiać (detal, kreska, panel), ale przesunięcie całego widoku na arkuszu przesuwa
pod spodem wszystkie zapisane już punkty tego typu. Zmieniaj więc kształty, a nie
układ arkusza (`build.mjs`: marginesy, odstępy, skala) — chyba że świadomie godzisz
się na to, że stare mapy tego typu „przeskoczą".

## Uruchomienie

Wymaga Pythona 3 i Playwrighta z Chromium (jest w `devDependencies`).

```sh
cd scripts/vehicle-schematics
./make.sh motorcycle                     # models/<klucz>.py -> out/<klucz>.png + wycinki widoków
node export.mjs ../../public/assets \
  ../../../automotive-crm-v2-backend/src/main/resources/images/vehicle \
  motorcycle                             # WebP 1536 px dla frontu, PNG 768 px dla backendu
```

Gdy Playwright zgłasza brak swojej przeglądarki, a jakiś Chromium jest pod ręką:
`CHROMIUM_PATH=/ścieżka/do/chrome ./make.sh …` (tak samo przy `export.mjs`).

`out/<klucz>.png` to cały arkusz, `out/<klucz>-right|left|top|front|rear.png`
to powiększone widoki do oględzin.

## Konwencje rysowania

* Jednostka 1 mm, podłoże y = 0, w górę y ujemne. Arkusz sam dobiera wspólną skalę
  wszystkich widoków, więc proporcje między nimi są prawdziwe.
* `#side` — PRAWY bok, przód w +x; lewy bok powstaje jako odbicie. `data-axles`
  = środki kół (pionowe znaczniki osi). Warstwy od spodu: `side0`, `sideR0`/`sideL0`,
  `side`, `sideR`/`sideL` (części tylko z jednej strony: tłumik, łańcuch).
* `#front` — oś x = 0, prawa strona pojazdu po LEWEJ stronie rysunku.
  `#rear` — oś x = 0, prawa strona po prawej. `#top` — przód w +x, prawa strona po +y.
* Skuter wodny nie ma kół: `data-axles=""`, y = 0 = stępka.
* Klasy kreski: `x` opona, `o` kontur, `d` detal, `t` linia podziału. Wypełnienia:
  `w` białe (zasłania to, co pod spodem — kolejność w pliku = kolejność rysowania),
  `g` szare (opona z przodu/tyłu/góry), `l` szyba/klosz, `k` ciemne (tylko drobne).
* Bez tekstu, logo i cieni. Każdy panel, na którym może powstać rysa, ma być osobnym,
  czytelnym obszarem.
