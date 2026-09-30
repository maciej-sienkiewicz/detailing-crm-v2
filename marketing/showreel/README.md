# Showreel DetailBoost (60 s)

Minutowa reklama produktowa: rezerwacja, przypomnienie SMS, podpis na tablecie,
wydanie pojazdu z fakturą wysłaną do KSeF jednym kliknięciem, statystyki i powiadomienia push. Wszystkie teksty są
po polsku.

Wideo to strona HTML z osią czasu GSAP, renderowana klatka po klatce w Chromium
i składana ffmpegiem. Podkład muzyczny jest syntetyzowany w `music.py`.

## Skąd są widoki

Widoki aplikacji są prawdziwymi zrzutami z działającego frontu i backendu (konto demo,
`POST /api/v1/demo`), a nie makietami. Scenariusz przeszedł w aplikacji naprawdę:

- usługa „Oklejanie PPF – pełny przód” za 3500,00 zł brutto (netto 2845,53 zł),
- rezerwacja „Oklejanie PPF Porsche 911” na 01.10, 09:00–02.10, 17:00 z przypomnieniem SMS,
- przyjęcie pojazdu, „Oznacz jako gotowe”, „Wydaj pojazd” z fakturą VAT FV/2026/0001,
- statystyki przed wizytą i po niej (30 867 zł → 34 367 zł, 22 → 23 zlecenia).

Kwoty w klipie są spójne z regułą z `CLAUDE.md`: brutto wpisane przez człowieka zostaje
brutto, a VAT to różnica brutto i netto (654,47 zł).

Trzy elementy zbudowano w HTML, bo w środowisku nagrania nie dało się ich uzyskać
z aplikacji:

- **ekran podpisu**: szablon protokołu wymaga wgrania pliku do S3. Wygląd odwzorowuje
  `src/modules/public-signing/views/PublicSigningView.tsx`.
- **sukces KSeF**: SDK KSeF był zastąpiony stubem, więc faktura trafiła do kolejki
  offline24. Status „przyjęta” i numer KSeF ustawiono w bazie. Animacja wysyłki jest
  zbudowana, a zrzut z Finansów pochodzi z aplikacji.
- **ekrany telefonów** (SMS, push): to ekran blokady systemu, nie widok aplikacji.
  Treść SMS pochodzi z domyślnego szablonu „Przypominamy o wizycie dnia {{data}}
  o godz. {{godzina}}. Do zobaczenia, {{imie}}!”.

Zdjęcia samochodów pochodzą z Unsplash (licencja Unsplash).

## Pliki

| Plik | Rola |
|---|---|
| `index.html` | cały klip: sceny, kamera, typografia, efekty; `window.seek(t)` ustawia klatkę |
| `music.py` | podkład 120 BPM (takt = 2 s) i efekty zsynchronizowane z osią czasu |
| `render.mjs` | render klatek do ffmpeg (`stills` do podglądu, `video` do pliku) |
| `capture/` | skrypty Playwright, którymi nagrano zrzuty z aplikacji |
| `a/` | zrzuty (JPEG), zdjęcia, logo, GSAP, font Inter |

Czasy scen (s): intro 0–4, rezerwacja 4–12, SMS 12–18, podpis 18–26, wydanie pojazdu
i faktura w KSeF 26–40 (kliknięcie „Wydaj pojazd” na 32,0 s), statystyki 40–48,
push 48–56, plansza końcowa 56–60.
Te same liczby są w `music.py`. Zmieniając jedno, zmień drugie.

## Render

Potrzebne: `playwright-core` i Chromium (`/opt/pw-browsers`), ffmpeg z libx264
(np. z pakietu `imageio-ffmpeg`), Python z `numpy` i `scipy`. Ścieżki do binariów
są na górze `render.mjs`.

```sh
python3 -m http.server 8765 --bind 127.0.0.1 &      # z tego katalogu
python3 music.py music.wav
node render.mjs stills 5.3,14.6,33.9,48.3           # podgląd wybranych chwil
for i in 0 1 2 3; do node render.mjs video 60 $((i*15)) $((i*15+15)) part$i.mp4 & done; wait
printf "file 'part%s.mp4'\n" 0 1 2 3 > list.txt
ffmpeg -f concat -safe 0 -i list.txt -i music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest out.mp4
```

Render 60 fps trwa ok. 11 minut na 4 rdzeniach (4 odcinki równolegle).

## Ponowne nagranie zrzutów

Skrypty z `capture/` zakładają backend na `:8080` (`./gradlew bootRun -PksefStub`)
i front na `http://localhost:5173`. Musi to być `localhost`, bo CORS backendu nie
wpuszcza `127.0.0.1`. Zakładają też plik `state.json` z sesją konta demo. Tego pliku
nie commitujemy, bo zawiera ciasteczka sesji. Zrzuty trafiają do `shots/`, a do `a/`
przechodzą po zmniejszeniu do JPEG 2560 px.

Animacje wjazdu napisów muszą mieć stan początkowy ustawiony w chwili pokazania
elementu (`T.set` w tym samym czasie co `visibility`). Inaczej napis przez kilka
klatek widać gotowy, potem znika i wjeżdża drugi raz.
