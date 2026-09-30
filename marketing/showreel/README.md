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

Logo marki w nagłówku wizyty ładuje się z CDN (`car-logos-dataset`). Przeglądarka nagrania
nie ma internetu, więc `capture/lib.mjs` pobiera logo curl-em i podaje je stronie przez
`route.fulfill`. Trzy klatki filmu 1 (`a/fin/10_ready.jpg`, `a/fin/13_pay_invoice.jpg`,
`a/visit_done.jpg`) nagrano wcześniej z zastępczą ikoną auta. Wklejono w nie kafelek
z logo Porsche z nowego zrzutu (`capture/s_fix1.mjs`).

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

## Film 2: od rezerwacji do faktury (67 s)

Pliki `index2.html`, `music2.py` i `render2.mjs` (klatki do `stills2/`). Render i montaż
jak wyżej, z `render2.mjs` i `music2.wav`. Odcinki równoległe: 0–16,75, 16,75–33,5,
33,5–50,25 i 50,25–67 s.

Sceny (s): intro 0–4, rezerwacja 4–12, gotowe szablony dokumentów 12–16, przyjęcie
pojazdu w trzech krokach (zdjęcia, uszkodzenia, wysyłka do klienta) 16–24, e-mail i SMS
u klienta 24–34, podpis na tablecie 34–40, odhaczanie usług 40–44, wydanie pojazdu
z fakturą w KSeF 44–56 (kliknięcie „Wydaj pojazd” na 48,0 s), plansza 56–67: bęben
z nazwami pozostałych możliwości, „i więcej!” i znak marki.

Zasady montażu tego filmu:

- okno rezerwacji jest w kadrze w całości przez cały czas wypełniania,
- po zapisie okno znika nad kalendarzem, a kamera płynnie dojeżdża do rezerwacji,
- zmiana zrzutu to przenikanie przy nieruchomej kamerze, potem ruch kamery, nigdy oba
  naraz,
- każda wiadomość na telefonie ma pauzę na przeczytanie,
- na planszy wszystkie możliwości mają tę samą formę: sama nazwa, bez ikon i zrzutów.

Scenariusz przeszedł w aplikacji naprawdę:

- rezerwacja „Pakiet ochronny Porsche 911” na 02.10, 09:00–03.10, 16:00 z trzema usługami
  (3500,00 + 2490,00 + 306,27 = 6296,27 zł brutto, netto 5118,92 zł, VAT 1177,35 zł),
- przyjęcie VIS-2026-00002: 4 zdjęcia, 3 punkty na mapie uszkodzeń, e-mail z załącznikami
  i SMS z Kartą Wizyty,
- podpis protokołu na publicznej stronie `/sign/:token` w widoku tabletu w pionie,
- odhaczenie trzech usług i wydanie pojazdu z fakturą FV/2026/0002.

Co zbudowano w HTML i dlaczego:

- **strony szablonów** (`a/tpl/`) to wydruki szablonów HTML z backendu, a wypełniony
  protokół (`a/tpl_filled.jpg`) to wycinek z prawdziwej strony podpisu.
- **telefon klienta**: e-mail i SMS nie wyszły naprawdę (SMSAPI i poczta wyłączone,
  backend tylko je zalogował). Temat, treść i liczba załączników pochodzą z domyślnego
  szablonu i z logu wysyłki. Karta Wizyty to zrzut prawdziwej strony `/vc/:token`.
- **sukces KSeF**: jak w filmie 1, status „przyjęta” i numer KSeF ustawiono w bazie.

Okno wydania pojazdu po stubie KSeF pokazuje komunikat o trybie offline24, więc film go
pomija i przenika od razu do strony zakończonej wizyty.

## Ponowne nagranie zrzutów

Skrypty z `capture/` zakładają backend na `:8080` (`./gradlew bootRun -PksefStub`)
i front na `http://localhost:5173`. Musi to być `localhost`, bo CORS backendu nie
wpuszcza `127.0.0.1`. Zakładają też plik `state.json` z sesją konta demo. Tego pliku
nie commitujemy, bo zawiera ciasteczka sesji. Zrzuty trafiają do `shots/`, a do `a/`
przechodzą po zmniejszeniu do JPEG 2560 px.

Animacje wjazdu napisów muszą mieć stan początkowy ustawiony w chwili pokazania
elementu (`T.set` w tym samym czasie co `visibility`). Inaczej napis przez kilka
klatek widać gotowy, potem znika i wjeżdża drugi raz.
