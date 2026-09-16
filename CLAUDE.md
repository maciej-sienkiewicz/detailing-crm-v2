# CLAUDE.md — zasady, od których nie ma odstępstw

Ten plik czyta każdy agent AI przed dotknięciem kodu. Jest krótki celowo: zawiera
wyłącznie te reguły, których złamanie kosztuje pieniądze albo zaufanie klienta.
Szersze wytyczne architektoniczne są w `.masterPrompt.txt`.

---

## 1. PIENIĄDZE: brutto, które ktoś ustalił, JEST brutto

> **Kwoty, którą wpisał człowiek, nie wolno policzyć po raz drugi.**
> Liczymy wyłącznie to, czego nikt nie ustalił.

### Dlaczego to jest reguła, a nie preferencja

Przejście brutto → netto → brutto **nie jest tożsamością**. Przy 23% VAT:

```
190000 gr brutto  →  190000 / 1,23 = 154471,54  →  154472 gr netto
154472 gr netto   →  154472 × 1,23 = 190000,56  →  190001 gr brutto
```

Kwota **1900,00 zł jest w tę stronę nieosiągalna**: 154471 gr daje 1899,99 zł,
154472 gr daje 1900,01 zł. Nie istnieje netto w groszach, z którego wyjdzie równo
1900,00 zł brutto. Żadne „lepsze zaokrąglenie" tego nie naprawi — to własność
arytmetyki liczb całkowitych, nie błąd implementacji.

Skutek biznesowy: użytkownik wpisuje 1900,00 zł, zapisuje, wraca — i widzi
1900,01 zł. Cena podana klientowi „pływa". W protokole wydania i na fakturze
oznacza to kwotę inną niż uzgodniona.

### Reguła kierunkowa

| Co wpisał człowiek | Co jest źródłem prawdy | Co wolno policzyć |
|---|---|---|
| **brutto** | brutto — przechowywane dokładnie | netto = `grossToNet(brutto, vat)` |
| **netto**  | netto — przechowywane dokładnie | brutto = `netToGross(netto, vat)` |

Wielkość wpisana przez człowieka jest zapisywana bez zmian i **nigdy** nie jest
odtwarzana z drugiej.

### Jak to robić w kodzie

Cała arytmetyka VAT mieszka w `src/common/utils/priceAdjustment.ts`. Nie pisz
własnej.

```ts
// DOBRZE — dokładne brutto wygrywa, przeliczenie jest ostatecznością
const baseGross = exactBaseGross(line) ?? netToGross(line.basePriceNet, line.vatRate);
const { finalNetCents, finalGrossCents } =
    applyAdjustment(line.basePriceNet, line.vatRate, line.adjustment, baseGross);
const vat = finalGrossCents - finalNetCents;   // VAT to RÓŻNICA pokazanych kwot
```

```ts
// ŹLE — każda z tych linijek zgubi grosz na cenie wpisanej jako brutto
const gross = Math.round(net * (1 + vatRate / 100));
const gross = Math.round((net * (100 + vatRate)) / 100);
const gross = roundTo2((net / 100) * (100 + vatRate) / 100);
const vat   = Math.round((net * vatRate) / 100);        // netto + VAT ≠ brutto
```

`netToGross()` samo w sobie nie jest zakazane — jest **fallbackiem**, wolno go
użyć dopiero wtedy, gdy `exactBaseGross()` zwróci `undefined`. Kierunek odwrotny
(`grossToNet`) jest zawsze w porządku: netto z definicji jest pochodne, gdy cenę
podano w brutto.

### Konsekwencje, o których łatwo zapomnieć

- **VAT to różnica**, nie osobne mnożenie: `vat = brutto − netto`. Inaczej suma
  w jednej linijce się nie zgadza.
- **Edycja unieważnia dokładne brutto.** Kwota przysłana przez serwer dotyczyła
  poprzedniej ceny — po lokalnej zmianie trzeba ją wyzerować, a nie rozlać
  spreadem razem z resztą obiektu.
- **Rabat liczony od netta** (procent, upust netto, ustaw netto) zmienia kwotę
  bazową, więc brutto końcowe **należy** policzyć. Rabat gross-side (`SET_GROSS`,
  `FIXED_GROSS`) i rabat zerowy — nie wolno.
- **Dokładne brutto musi przejść przez każdą granicę**: katalog → pozycja
  wyceny → payload API → odczyt z API. Zgubione raz, nie odtworzy się już nigdy.
- **Mapowania odpowiedzi API to miejsce, w którym ginie najczęściej.** Funkcja
  wypisująca pola ręcznie (`services.map(s => ({ id: s.id, basePriceNet: … }))`)
  po cichu wyrzuca `finalPriceGross`, bo nikt o nim nie pomyślał — a wtedy każda
  tabela niżej MUSI odtwarzać brutto z netta i cała naprawa idzie na marne.
  Serwer nie zwraca `basePriceGross` przy pozycjach rezerwacji; dokładne brutto
  siedzi w `finalPriceGross` i wydobywa je `exactBaseGross()`. Dodając pole do
  takiego mapowania, sprawdź najpierw, czy nie gubisz kwoty.

### Wzorce do skopiowania

- `src/common/utils/priceAdjustment.ts` — `exactBaseGross`, `applyAdjustment`
- `src/modules/appointments/hooks/useServicePricing.ts` — wycena pozycji i sumy
- `src/modules/checkin/components/SummaryStep.tsx` — podsumowanie protokołu
- `src/modules/checkin/utils/toCheckInServiceLine.ts` — przeniesienie dokładnego
  brutta przez granicę API (wzorzec dla każdego mapowania odpowiedzi)
- Backend: `AppointmentLineItem.create(basePriceGross = …)`, `Visit.calculateFinalGross`

### Testy, które tego pilnują

- `src/common/utils/priceAdjustment.test.ts` → `exactBaseGross`, „cena wpisana
  jako brutto nie pływa"
- `src/modules/appointments/hooks/useServicePricing.test.ts` → odtworzenie
  zgłoszenia z produkcji (154472 gr / 23% / rabat zerowy → **190000**, nie 190001)
- `src/modules/checkin/utils/toCheckInServiceLine.test.ts` → brutto przeżywa
  granicę API; brak brutta daje `undefined`, a nie zmyśloną kwotę

**Nie osłabiaj tych testów, żeby przepuścić zmianę.** Jeśli test zaczyna
przeszkadzać, to zmiana jest zła, a nie test.

### Zlecenie stałe

Gdy natrafisz na kod łamiący tę regułę — **napraw go**, nie tylko opisz. Jeśli
naprawa wykracza daleko poza zadanie, przy którym stoisz: napraw to, czego
dotykasz, a resztę wypisz wprost w odpowiedzi, z plikami i liniami. Nigdy nie
zostawiaj tego milcząco.

---

## 2. HIERARCHIA: jedno wypełnienie na okno

> **W jednym oknie dokładnie JEDNA rzecz jest wypełniona kolorem.**
> Jest nią krok następny. Wszystko inne nosi swój odcień jako tło i obwódkę.

### Dlaczego to jest reguła, a nie preferencja

Kolor w tym interfejsie niesie dwie różne rzeczy naraz i łatwo je pomylić:

| Nośnik | Co znaczy | Przykład |
|---|---|---|
| **Odcień** | ZNACZENIE | zielony = „tak / domknięte", bursztyn = „przeczytaj", błękit = „lead", czerwień = „nieodwracalne" |
| **Wypełnienie** | PRIORYTET | wypełniony = „to zrób teraz"; tło + obwódka = „to jest dostępne" |

Gdy dwa elementy są wypełnione, użytkownik nie ma czym rozstrzygnąć, który jest
ważniejszy — i pyta „na co mam najpierw patrzeć". Tak właśnie zepsuł się podgląd
leada: „Akceptuj" przy sugestii AI dostał wypełnioną zieleń, a przy trzech
propozycjach dawało to trzy nasycone bloki w szynie kontra jeden przycisk kroku
następnego w stopce. Akcja DRUGORZĘDNA i opcjonalna wygrywała liczbą,
powierzchnią i pozycją.

### Czego ta reguła NIE znaczy

Nie znaczy „mniej kolorów". Odbieranie barw robi interfejs smutnym i gubi
znaczenia, które odcień niesie za darmo. Wszystkie kolory zostają — znika tylko
REMIS o pierwsze miejsce.

### Jak to robić w kodzie

```ts
// DOBRZE — akcja drugorzędna: odcień zostaje, wypełnienia nie ma
border: 1px solid #86efac;
background: ${p => p.theme.colors.successLight};
color: #15803d;
```

```ts
// ŹLE — drugi wypełniony przycisk w tym samym oknie
background: ${p => p.theme.colors.success};
color: #ffffff;
```

Wypełnione zostają wyłącznie: `PrimaryButton` / `FooterPrimary` (krok następny)
oraz stany krytyczne wymagające natychmiastowej reakcji. Zanim wypełnisz cokolwiek
innego, policz, ile wypełnień jest już w tym oknie — i ile ich będzie, gdy lista
pod spodem ma trzy pozycje zamiast jednej.

### Kolejność czytania

Podgląd leada ma jedną kolejność, w panelu i w oknie modalnym:
**o co pyta klient → co mu proponujemy → co z tym zrobić**. Przebieg sprawy po
lewej, wycena i szyna po prawej. Na telefonie jest odwrotnie i to jest świadome:
tam „kolejność" znaczy „ile trzeba przewinąć", a nie „gdzie pada wzrok".

---

## 3. Uwaga o `.masterPrompt.txt`

`.masterPrompt.txt` zawiera wytyczne architektoniczne, ale jeden jego punkt jest
sprzeczny z kodem: „Zero-Comment Policy". Realna konwencja tego repozytorium jest
odwrotna — komentarze niosą UZASADNIENIE decyzji („dlaczego tak, a nie inaczej",
„co poszło źle poprzednio"), nie opis składni. Pisz jak otoczenie pliku, który
zmieniasz.
