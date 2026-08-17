# Moduł Komunikacji i Leadów — Specyfikacja UI/UX

**Dokument projektowy (Principal UI/UX)** · wersja 1.0 · 2026-08-17
Dokument siostrzany do `communication-leads-architecture.md`. Obowiązują ustalenia: lead = zapytanie (osoba jest bytem nadrzędnym w `customers`), model danych `mail_message` + `mail_thread` + `leads.thread_id`.

---

## Część 1 — "AI SLOP" i Manifest Designu

### 1.1. Czym jest AI SLOP w interfejsach B2B

AI SLOP to styl interfejsu, który komunikuje *obecność technologii* zamiast *wykonanej pracy*. Rozpoznawalne symptomy:

1. **Syndrom gwiazdek ✨** — każda funkcja dotknięta modelem językowym dostaje ikonę iskierek, gradientowy przycisk i etykietę "AI". Ikona nie opisuje czynności ("wyceń", "odpisz"), tylko chwali się mechanizmem. Użytkownik ma podziwiać, nie pracować.
2. **Fioletowo-niebieskie gradienty i glassmorphism** — estetyka strony marketingowej startupu przeniesiona do narzędzia pracy. Gradient nie niesie informacji, a w hali, na średnim monitorze, w słońcu — degraduje czytelność.
3. **Czat jako uniwersalny interfejs** — zamiast przycisku "Wyślij wycenę" użytkownik dostaje okno konwersacji, w którym ma *wynegocjować* z botem to, co powinno być jednym kliknięciem. Czat przenosi ciężar strukturyzacji zadania z projektanta na użytkownika — to abdykacja z projektowania.
4. **Ściany wygenerowanego tekstu** — podsumowania, których nikt nie zamawiał, akapity tam, gdzie wystarczy liczba i etykieta. Tekst generowany jest tani, więc pojawia się wszędzie; dane ustrukturyzowane są drogie w projektowaniu, więc znikają.
5. **Natrętne "pomaganie"** — tooltipy "Czy wiesz, że…", proaktywne sugestie w toastach, pulsujące onboardingowe kropki. System przerywa pracę, żeby zademonstrować, że istnieje.
6. **Nieodróżnialność faktu od halucynacji** — wynik modelu prezentowany tą samą typografią i z tą samą pewnością co dane wpisane ręcznie, bez ścieżki weryfikacji i korekty jednym kliknięciem.

Wspólny mianownik: **interfejs zoptymalizowany pod demo inwestorskie, nie pod tysięczne użycie tego samego ekranu przez tę samą osobę.** Nasz użytkownik zobaczy ekran leadów ~30× dziennie przez lata. Wszystko, co jest "efektowne" za pierwszym razem, za setnym jest szumem.

### 1.2. Manifest Designu (zasady wiążące, nie inspiracje)

1. **AI jest hydrauliką, nie armaturą.** Model językowy wolno nam pokazać wyłącznie przez jego *skutek*: wypełnione pole, gotową tabelę wyceny, przypięty wątek. Zakaz słów "AI", "sztuczna inteligencja", "inteligentny", "smart", "magia" oraz ikony ✨ w całym produkcie. Przyciski nazywają czynność użytkownika ("Wstaw wycenę"), nigdy mechanizm ("Generuj z AI").
2. **Dane, nie proza.** Każda informacja, którą da się pokazać jako etykieta + wartość, chip, liczba lub wiersz tabeli — ma taką formę. Wygenerowany akapit tekstu jest dozwolony wyłącznie w polu edytora, jako edytowalny draft, na jawne żądanie.
3. **Fakt ≠ domysł.** Wartość pochodząca z ekstrakcji, dopóki niezweryfikowana, ma odrębny, systemowy stan wizualny (kropkowane obramowanie — patrz §3.3). Zatwierdzenie = jedno kliknięcie lub dowolna akcja "dalej". Korekta = kliknięcie w wartość i edycja inline. Żadnych dialogów "Czy AI dobrze wykryło?".
4. **Zero czatu.** W module nie istnieje żaden interfejs konwersacyjny. Każda operacja ma przycisk, dropdown albo skrót klawiszowy.
5. **Monochromatyczna powaga + jeden akcent.** Neutralna skala szarości (tło `#FAFAFA`, powierzchnie `#FFFFFF`, tekst `#1A1A1A`/`#6B7280`), jeden kolor akcentu (istniejący brand primary CRM) używany wyłącznie dla akcji głównej i stanu "wymaga Twojej reakcji". Kolory semantyczne (zielony/bursztyn/czerwony) tylko dla statusów. Zakaz gradientów dekoracyjnych, cieni większych niż `0 1px 3px rgba(0,0,0,.08)`, animacji dłuższych niż 150 ms.
6. **Gęstość informacyjna ponad przestronność.** To narzędzie pracy: wysokość wiersza listy 44–52 px, typografia 13–14 px dla danych, 15 px dla treści maili. Whitespace służy grupowaniu (prawo bliskości), nie "oddychaniu" marketingowemu.
7. **System milczy, dopóki nie musi mówić.** Zakaz toastów informacyjnych o pracy tła ("przeanalizowano wiadomość"). Powiadomienia tylko o zdarzeniach wymagających człowieka: nowe zapytanie, odpowiedź klienta, follow-up do zatwierdzenia, rozłączona skrzynka.
8. **Każda akcja odwracalna albo potwierdzana — nigdy jedno i drugie.** Wysyłka maila: bez modala potwierdzenia, za to 10-sekundowe "Cofnij" (wzorzec undo-send; wysyłka realnie odroczona). Operacje destrukcyjne i nieodwracalne (usunięcie leada): modal.
9. **Stan pusty uczy, stan błędu instruuje.** Empty state = 1 zdanie + 1 przycisk. Błąd = co się stało, po polsku, + co kliknąć. Zakaz kodów błędów jako jedynego komunikatu i zakaz ilustracji ozdobnych.
10. **Kciuk i rękawica.** Wszystkie akcje pierwszorzędne osiągalne przy tapach ≥ 44×44 px; krytyczna ścieżka (przeczytaj → odpisz/zadzwoń) działa jedną ręką na telefonie na hali.

---

## Część 2 — Projekt interfejsu

### 2.1. Główny układ ekranu

**Wzorzec: Master–Detail z przełączanym masterem i wysuwanym detail-drawerem.** Nie dzielimy ekranu na stałe (klasyczny 3-pane email client marnuje szerokość przy kanbanie); detail otwiera się nad masterem.

```
DESKTOP ≥ 1280 px
┌─Sidebar CRM─┬──────────────────────────────────────────────────────────────┐
│ (istniejący)│ TOPBAR modułu  h=56px, sticky, z-index 30                    │
│             │ ┌──────────────────────────────────────────────────────────┐ │
│  Zapytania ●│ │ Zapytania   [Tablica|Lista]   🔍 filtr   ⚠2 Do przejrz.  │ │
│             │ └──────────────────────────────────────────────────────────┘ │
│             │ MASTER (scroll własny)                                       │
│             │ ── widok Tablica: 5 kolumn kanban, kolumna min 260px,        │
│             │    poziomy scroll przy <1280px                                │
│             │ ── widok Lista: tabela wierszy 52px (domyślny <1024px)       │
│             │                                                              │
│             │        DETAIL DRAWER: prawa strona, width=minmax(560px,46%),│
│             │        z-index 40, overlay rgba(0,0,0,.24) na masterze,     │
│             │        master POZOSTAJE widoczny i klikalny w pasku kolumn  │
│             │        (przełączanie leadów bez zamykania drawera)          │
└─────────────┴──────────────────────────────────────────────────────────────┘
```

Decyzje i uzasadnienia:

- **Drawer, nie routing na osobną stronę** — właściciel obsługuje 5 zapytań seriami; drawer zachowuje kontekst kolumn i pozwala przeskakiwać `j/k` (klawiatura) lub tapnięciem kolejnej karty. Drawer, nie modal — modal sugeruje "zadanie do zamknięcia", drawer "panel roboczy"; nie blokujemy klawisza Esc na masterze.
- **Stan w URL** (`/zapytania?widok=tablica&lead=1234`) — odświeżenie strony i link z powiadomienia push otwierają dokładnie ten stan; drawer jest deep-linkowalny.
- **Widok Lista jest pierwszorzędny, nie zapasowy.** Na telefonie (breakpoint <768 px) kanban nie istnieje: lista posortowana "piłka u nas → wiek", etap jako chip na wierszu, drawer pełnoekranowy (pattern: page-sheet, gest swipe-down zamyka). Kanban to widok planowania przy biurku; lista to widok pracy w biegu.
- **Skeleton loading** wyłącznie przy pierwszym wejściu (3 kolumny × 3 szare karty, shimmer 1 cykl); każde kolejne przejście korzysta z cache TanStack Query (stale-while-revalidate) — dane pojawiają się natychmiast, cicha rewalidacja w tle. Nowe zdarzenia STOMP nie przestawiają kart pod ręką użytkownika: karta dostaje badge "nowa odpowiedź", przesunięcie następuje przy najbliższej interakcji lub po 5 s bezczynności (ochrona przed layout shift w trakcie celowania kursorem).

### 2.2. Karta leada (kanban) i wiersz listy

**Anatomia karty (wys. ~92 px, padding 12 px, radius 8 px, border 1px `#E5E7EB`):**

```
┌───────────────────────────────┐
│ BMW X5 · 2021        [● 12 m] │  ← wiersz 1: POJAZD, 14px/600 — to jest
│ Powłoka ceramiczna, korekta   │     nagłówek karty, nie nazwisko
│ Jan Kowalski · ↩ Stały klient │  ← 13px/#6B7280; "Stały klient" = link
│ 4 200 zł · wysłano 3 dni temu │  ← wiersz warunkowy: tylko gdy jest wycena
└───────────────────────────────┘
```

- **Pojazd jako nagłówek** — detailer myśli autami ("ten X5 od ceramiki"), nie nazwiskami. Nazwisko schodzi do wiersza 3.
- **`[● 12 m]` — wskaźnik piłki**: kropka w kolorze akcentu + wiek ostatniej wiadomości, gdy ostatnia wiadomość jest od klienta (czeka na nas); szary zegar `◷ 2 d`, gdy czekamy na klienta. To jedyny element karty w kolorze akcentu — wzrok skanuje kolumnę i natychmiast widzi, gdzie się pali. Sortowanie w kolumnie: piłka u nas → najstarsze pierwsze (kolejka, nie stos).
- Brak avatarów, brak pasków postępu, brak ikon kanału. Karta = 4 fakty.
- **Wiersz listy (52 px):** te same dane w kolumnach `Pojazd/Usługi | Klient | Etap (chip) | Wycena | Ostatnia wiadomość | ●wiek`; kolumny sortowalne, etap edytowalny dropdownem inline bez otwierania drawera.

### 2.3. Drawer szczegółów: nagłówek faktów + wątek

```
┌── DRAWER ──────────────────────────────────────────── ✕ ──┐
│ HEADER (sticky, z-index 41)                                │
│  Jan Kowalski   601 234 567 [Zadzwoń]   jan@wp.pl         │
│  ┌╌╌╌╌╌╌╌╌╌╌╌╌┐ ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐ ┌╌╌╌╌╌╌╌╌╌╌╌╌┐      │
│  ┆ BMW X5 2021 ┆ ┆ Powłoka ceramiczna┆ ┆ Korekta 1-et ┆ +  │ ← chipy faktów
│  └╌╌╌╌╌╌╌╌╌╌╌╌┘ └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘ └╌╌╌╌╌╌╌╌╌╌╌╌┘      │
│  Etap: [NOWE ▾]                                            │
├────────────────────────────────────────────────────────────┤
│ WĄTEK (scroll, flex-grow)                                  │
│   ── 12 sie ──────────────────────────────                 │
│   │Jan · 10:12                                             │
│   │Dzień dobry, ile kosztowałaby powłoka…                  │
│   │                          [pokaż pełną wiadomość]       │
│                        Ty · 12 sie 14:30│                  │
│              Dzień dobry, w załączeniu…│                   │
│              ▸ Wycena #128 · 4 200 zł  │ ← obiekt, nie tekst│
│   ▸ 3 starsze wiadomości                                   │
│   ── notatka ── "dzwonił, wróci po urlopie" · 13 sie ──    │
├────────────────────────────────────────────────────────────┤
│ COMPOSER (sticky bottom, §2.5)                             │
└────────────────────────────────────────────────────────────┘
```

**Wątek czytelniejszy niż klient pocztowy — konkretne mechanizmy:**

1. **Renderujemy `body_text_clean`** (architektura §3.3): cytaty poprzednich wiadomości i stopki są wycięte już na backendzie. Każdy dymek to *tylko nowa treść* danej wiadomości — to pojedyncza największa przewaga czytelności nad Gmailem, gdzie trzeci mail niesie całą historię potrójnie.
2. **Progressive disclosure w dół wątku:** domyślnie rozwinięte są ostatnie 2 wiadomości + pierwsza (oryginalne zapytanie ma wartość referencyjną); środek zwinięty do wiersza "▸ 3 starsze wiadomości" (accordion, rozwija całość). Wiadomość dłuższa niż ~12 linii przycięta z `[pokaż pełną wiadomość]`.
3. **Eskalacja do oryginału zawsze dostępna:** menu `⋯` na dymku → "Pokaż oryginał" (sandboxowany iframe z HTML, obrazy po kliknięciu) i "Pokaż nagłówki". Zaufanie buduje się przez możliwość sprawdzenia, nie przez zapewnienia.
4. **Obiekty domenowe w wątku są kartami, nie tekstem:** wysłana wycena renderuje się jako zwijany wiersz `▸ Wycena #128 · 4 200 zł` (rozwinięcie: tabela pozycji); zaproponowane terminy jako trzy chipy z ich stanem (wybrany/wygasł). Wątek jest osią czasu *relacji*, więc wpinamy w niego też notatki i zdarzenia systemowe ("klient wybrał termin 21 sie") jako wąskie separatory 12 px, nie dymki.
5. **Kierunek = wyrównanie + tło** (klient: lewo, białe tło z borderem; my: prawo, tło `#F3F4F6`). Żadnych kolorowych dymków messengerowych.

### 2.4. Niewidzialna asysta — wzorzec "kropkowany fakt"

Ekstrakcja LLM zasila **chipy faktów** w headerze drawera (pojazd, usługi, telefon, preferowany termin). Jeden systemowy stan wizualny zamiast komunikatów:

- **Niezweryfikowany fakt:** chip z **kropkowanym obramowaniem** (`border: 1px dashed #9CA3AF`). To cała komunikacja "to wyciągnęliśmy z maila, rzuć okiem". Zero tekstu o AI, zero ikon, zero tooltipów przy pierwszym użyciu (jednorazowy hint w onboardingu modułu: "Przerywana ramka = do potwierdzenia").
- **Weryfikacja bez ceremonii:** kliknięcie chipa → popover z wartością w polu edycyjnym + short-list podpowiedzi (dla usługi: fuzzy-match z cennika; dla auta: marka/model z naszego słownika). Enter zatwierdza → obramowanie ciągłe (`solid #E5E7EB`). **Weryfikacja domniemana:** użycie faktu w akcji (wstawienie wyceny, umówienie wizyty) zatwierdza wszystkie fakty, których akcja dotyczy — właściciel nigdy nie "sprawdza AI", on po prostu pracuje, a praca jest weryfikacją.
- **Niska pewność ekstrakcji ≠ inny kolor.** Fakt z `confidence < próg` po prostu **nie powstaje** — chip nie istnieje, jest przycisk `+` (dodaj pojazd/usługę, 2 kliknięcia z autouzupełnianiem). Lepszy brak odpowiedzi niż wątpliwa odpowiedź, którą trzeba wizualnie stopniować.
- **Pochodzenie na żądanie:** popover chipa ma link "z wiadomości 12 sie" — kliknięcie podświetla (highlight 2 s, scroll-into-view) fragment maila, z którego pochodzi wartość. To jest nasz "explainability" — cytat źródłowy zamiast procentów pewności.
- Inline validation w popoverze: usługa spoza cennika → podkreślenie i podpowiedź "Dodać do cennika?" — bez czerwonych banerów.

### 2.5. Edytor odpowiedzi (composer)

**Stan spoczynkowy — jeden wiersz, 48 px**, przyklejony do dołu drawera (sticky, z-index 42):

```
┌────────────────────────────────────────────────────────────┐
│ Odpowiedz Janowi…            [Wycena] [Terminy] [Szablon ▾]│
└────────────────────────────────────────────────────────────┘
   focus/klik → rozwija się do 240–420px (auto-grow, max 50vh)
┌────────────────────────────────────────────────────────────┐
│ Do: jan@wp.pl                     Temat: Re: (auto, ukryty)│
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Dzień dobry Panie Janie,                               │ │
│ │ ┌──────────────────────────────────────────┐           │ │
│ │ │ WYCENA · BMW X5 (segment XL)     [edytuj]│           │ │
│ │ │ Powłoka ceramiczna 3Y        3 400 zł    │ ← blok    │ │
│ │ │ Korekta lakieru 1-etap.        800 zł    │   obiektu │ │
│ │ │ Razem · ok. 2 dni robocze    4 200 zł    │           │ │
│ │ └──────────────────────────────────────────┘           │ │
│ │ Termin możemy ustalić…                                 │ │
│ └────────────────────────────────────────────────────────┘ │
│ B  I  •list  📎        po wysłaniu: [WYCENIONE ▾]  [Wyślij]│
└────────────────────────────────────────────────────────────┘
```

Specyfikacja:

- **Trzy przyciski-rzeczowniki zamiast bota.** `[Wycena]` — wstawia blok wyceny zbudowany deterministycznie z chipów faktów × cennik × mnożnik segmentu; wartości edytowalne inline w bloku (kwota = pole liczbowe po kliknięciu, wiersz usuwalny, `+ pozycja` z autouzupełnianiem cennika). `[Terminy]` — wstawia 3 najbliższe wolne okna z kalendarza jako chipy-linki; kliknięcie chipa przed wysyłką pozwala podmienić okno (popover z mini-kalendarzem). `[Szablon ▾]` — dropdown z `message-templates`, merge-pola wypełnione faktami; **fakty niewstawialne (brak auta) renderują się jako żółte puste pola wymagające uzupełnienia** — inline validation przed wysyłką, przycisk Wyślij nieaktywny, dopóki istnieją.
- **Bloki obiektów są atomowe** w edytorze (contenteditable z osadzonymi widgetami; nie da się rozjechać kursorem środka tabeli) i serializują się do czystego HTML mailowego przy wysyłce (tabela inline-styles — kompatybilność z klientami pocztowymi) oraz do rekordu `lead_quote`.
- **Tekst pisze człowiek.** Domyślnie composer nie generuje prozy. Opcjonalna (opt-in w ustawieniach firmy, domyślnie OFF) funkcja "Dopasuj treść" siedzi w dropdown­ie `Szablon ▾` jako ostatnia pozycja — przekształca wybrany szablon pod pytania klienta i pokazuje wynik jako zwykły edytowalny tekst. Bez osobnego przycisku, bez ikony, bez animacji "pisania".
- **Wysyłka:** klik `Wyślij` (lub `Cmd/Ctrl+Enter`) → composer zwija się, w wątku pojawia się dymek w stanie "wysyłanie" (opacity .6) z paskiem **`Cofnij · 10s`**; realna wysyłka po upływie okna (odroczony outbox). Błąd SMTP → dymek przechodzi w stan błędu z `[Ponów]` i przyczyną po polsku ("Serwer poczty odrzucił logowanie — sprawdź połączenie skrzynki w Ustawieniach"). Zero modali.

### 2.6. Nawigacja i akcje — status jako produkt uboczny maila

Zasada: **użytkownik nigdy nie wykonuje "aktualizacji CRM" jako osobnej czynności.** Projektujemy tak, by stan systemu był skutkiem pracy:

1. **Kontrolka `po wysłaniu: [WYCENIONE ▾]` w composerze.** System preselekcjonuje następny etap na podstawie zawartości (wstawiono blok wyceny → WYCENIONE; wstawiono terminy → DO POTWIERDZENIA; sama odpowiedź → etap bez zmian). Użytkownik widzi dokąd karta pojedzie *zanim* kliknie Wyślij i może zmienić dropdownem. To likwiduje klasę błędu "odpisałem, zapomniałem przestawić" — przestawienie jest częścią wysyłki, a nie osobnym obowiązkiem.
2. **Zdarzenia domenowe przesuwają karty same** (odpowiedź klienta → badge + piłka u nas; rezerwacja terminu → UMÓWIONE; wizyta odbyta → WYGRANE). Każde automatyczne przesunięcie zostawia wpis-separator w wątku ("→ UMÓWIONE · klient wybrał 21 sie") — historia etapów jest audytowalna w miejscu, gdzie się patrzy, bez osobnej zakładki "aktywność".
3. **Notatka w punkcie decyzji, nie w formularzu.** Ręczne przeciągnięcie karty do PRZEGRANE otwiera popover (nie modal): trzy szybkie powody-chipy `[Za drogo] [Brak odpowiedzi] [Termin]` + opcjonalne pole tekstowe, Enter zamyka. Popover na przeciągnięciu do każdego etapu "wstecz" — bo ruch wstecz zawsze ma powód wart zapisania. Ruch "do przodu" nie pyta o nic.
4. **Skróty klawiszowe** (desktop): `j/k` następny/poprzedni lead, `r` fokus composera, `w` wstaw wycenę, `n` notatka, `e` zmiana etapu, `u` cofnij wysyłkę. Cheatsheet pod `?`. Notatka z klawisza `n` = to samo pole co composer, przełączone tabem `Notatka` (żółtawe tło pola — jednoznaczność, że to nie mail do klienta; osobny przycisk `Zapisz notatkę`).
5. **Zakładka "Do przejrzenia" (topbar, badge liczbowy):** lista wątków `UNSURE` z F3 — wiersz: nadawca, temat, 2 linie treści, dwa przyciski `[To zapytanie]` `[Ignoruj nadawcę]`. Decyzja jednym kliknięciem zasila `sender_rules` (architektura §3.1). Odwiedzana raz dziennie, nie jest częścią kanbanu.
6. **Follow-upy "Do wysłania":** osobna sekcja nad kolumnami (pasek, nie kolumna — to kolejka zadań, nie etap sprzedaży): `2 follow-upy gotowe · [Przejrzyj]` → lista draftów, per wiersz `[Wyślij] [Edytuj] [Pomiń]`. Na telefonie ta lista jest pierwszym ekranem rano (deep-link z powiadomienia push).

### 2.7. Stany brzegowe interfejsu

| Stan | Zachowanie |
|---|---|
| Pusty kanban (świeże konto) | 1 zdanie: "Podłącz skrzynkę — zapytania z maila pojawią się tutaj same." + `[Podłącz skrzynkę]`. Bez ilustracji. |
| Skrzynka rozłączona (`AUTH_FAILED`) | Trwały pasek pod topbarem (bursztyn, z-index 35): "Utraciliśmy połączenie ze skrzynką jan@… · [Połącz ponownie]". Nie toast — toast znika, problem nie. |
| Offline / błąd sieci | Dane z cache + pasek "Brak połączenia — pokazuję ostatni znany stan"; composer zapisuje draft lokalnie (autosave co 3 s, również między sesjami). |
| Konflikt: klient odpisał, gdy piszesz | Dymek wpada do wątku nad composerem + delikatny highlight; treść draftu nietknięta. Bez modali "odśwież". |
| Długa kolumna (>25 kart) | Wirtualizacja listy; licznik w nagłówku kolumny zawsze rzeczywisty. |
| Wątek scalany (duplikat od tego samego klienta) | Baner w drawerze: "Jan napisał też w osobnym wątku · [Pokaż] [Scal]" — decyzja człowieka, nie automat. |

### 2.8. Tokeny (spójne z resztą CRM)

- Typografia: systemowy stack UI (`Inter`/system-ui), rozmiary 13/14/15/18, wagi 400/600. Liczby i kwoty: `font-variant-numeric: tabular-nums` (wyrównanie w tabelach wycen).
- Siatka 4 px; promienie 6 px (kontrolki) / 8 px (karty, drawer).
- Cienie: tylko dwa poziomy — karta `0 1px 3px rgba(0,0,0,.08)`, drawer/popover `0 8px 24px rgba(0,0,0,.12)`.
- Ruch: 120–150 ms `ease-out` wyłącznie dla drawer/popover/accordion; `prefers-reduced-motion` respektowane; zero animacji dekoracyjnych.
- Kontrast: minimum WCAG AA na `#FAFAFA` (hala = złe warunki oświetleniowe, to wymóg funkcjonalny, nie compliance).

---

## Podsumowanie w jednym zdaniu

Interfejs ma wyglądać jak dobrze poukładany warsztat: każda rzecz na swoim miejscu, żadna nie błyszczy — a to, że połowę roboty wykonała automatyka, użytkownik poznaje wyłącznie po tym, że jego dzień jest krótszy.
