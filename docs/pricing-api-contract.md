# Kontrakt API – Zarządzanie cenami usług

> **Wersja:** 1.0  
> **Data:** 2026-04-07  
> **Zakres:** Usługi w wizytach, wyceny, typy adiustacji, obliczanie sum

---

## 1. Zasady ogólne

### 1.1 Jednostka monetarna

Wszystkie kwoty pieniężne przesyłane w JSON (request i response) są **całkowitymi liczbami w groszach (integer, PLN × 100)**.

```
100,00 PLN  →  10000
  3,50 PLN  →    350
  0,23 PLN  →     23
```

Wyjątek: `adjustment.value` dla typu `PERCENT` — patrz §2.

**Niedopuszczalne:** przesyłanie kwot jako liczb zmiennoprzecinkowych (float) lub jako stringów. Serwer zwraca błąd `400` jeśli kwota nie jest integer.

### 1.2 Waluta

Aktualnie obsługiwana waluta: `PLN`. Pole `currency` jest wymagane w obiektach `MoneyBreakdown` i powinno mieć wartość `"PLN"`.

### 1.3 Stawki VAT

Dozwolone wartości `vatRate` (integer, procent):

| Wartość | Znaczenie |
|---------|-----------|
| `0`     | 0% VAT (zwolnienie z VAT) |
| `5`     | 5% VAT (stawka obniżona) |
| `8`     | 8% VAT (stawka obniżona) |
| `23`    | 23% VAT (stawka podstawowa) |

Inne wartości → serwer zwraca `400 Bad Request`.

### 1.4 Odpowiedzialność za obliczenia

**Serwer jest jedynym źródłem prawdy dla `finalPriceNet`, `finalPriceGross` i `totalCost`.**

- Klient (frontend) przesyła wyłącznie: `basePriceNet`, `vatRate`, `adjustment`
- Serwer oblicza i zwraca: `finalPriceNet`, `finalPriceGross`
- Serwer oblicza i zwraca: `totalCost` na obiekcie wizyty (suma wszystkich potwierdzonych usług)
- Frontend **może** przeliczać ceny lokalnie na potrzeby podglądu, ale musi używać tych samych wzorów (§3)

---

## 2. Typ adiustacji ceny (`PriceAdjustment`)

```json
{
  "type": "FIXED_NET",
  "value": 2000
}
```

### 2.1 Definicja typów

| `type`        | Semantyka `value`                         | Efekt |
|---------------|-------------------------------------------|-------|
| `PERCENT`     | Procent (integer lub float), **ujemny = rabat, dodatni = dopłata** | Zmiana procentowa ceny netto |
| `FIXED_NET`   | Kwota rabatu w groszach, **zawsze ≥ 0**   | Odejmowana od ceny netto |
| `FIXED_GROSS` | Kwota rabatu w groszach, **zawsze ≥ 0**   | Odejmowana od ceny brutto, netto przeliczane wstecznie |
| `SET_NET`     | Docelowa cena netto w groszach, **≥ 0**   | Ustawia cenę netto |
| `SET_GROSS`   | Docelowa cena brutto w groszach, **≥ 0**  | Ustawia cenę brutto, netto przeliczane wstecznie |

**Ważne: dla `FIXED_NET` i `FIXED_GROSS` wartość jest zawsze nieujemna (kwota rabatu). Serwer odejmuje ją od ceny bazowej.**

Brak adiustacji (cena katalogowa bez zmian):
```json
{ "type": "PERCENT", "value": 0 }
```

### 2.2 Wzory obliczeniowe

Niech:
- `B_net` = `basePriceNet` (grosz)
- `B_gross` = `B_net + round(B_net × vatRate / 100)`
- `v` = `adjustment.value`
- `r` = `vatRate` (%)

**PERCENT** (`v` w procentach, ujemny = rabat):
```
F_net  = round(B_net × (1 + v / 100))
F_vat  = round(F_net × r / 100)
F_gross = F_net + F_vat
```
Przykład: `B_net=10000`, `v=-10` (−10%) → `F_net = 9000`, `F_gross = 11070`

---

**FIXED_NET** (`v` = kwota rabatu w groszach, `v ≥ 0`):
```
F_net   = B_net - v
F_vat   = round(F_net × r / 100)
F_gross = F_net + F_vat
```
Przykład: `B_net=10000`, `v=2000` → `F_net = 8000`, `F_gross = 9840`

---

**FIXED_GROSS** (`v` = kwota rabatu w groszach, `v ≥ 0`):
```
F_gross = B_gross - v
F_net   = round(F_gross × 100 / (100 + r))
F_vat   = F_gross - F_net
```
Przykład: `B_net=10000`, `r=23`, `B_gross=12300`, `v=1000` → `F_gross=11300`, `F_net=9187`, `F_vat=2113`

---

**SET_NET** (`v` = docelowa cena netto w groszach):
```
F_net   = v
F_vat   = round(F_net × r / 100)
F_gross = F_net + F_vat
```
Przykład: `v=8000`, `r=23` → `F_net=8000`, `F_gross=9840`

---

**SET_GROSS** (`v` = docelowa cena brutto w groszach):
```
F_gross = v
F_net   = round(F_gross × 100 / (100 + r))
F_vat   = F_gross - F_net
```
Przykład: `v=12000`, `r=23` → `F_gross=12000`, `F_net=9756`, `F_vat=2244`

---

### 2.3 Ograniczenia wartości

- `F_net < 0` → serwer zwraca `400 Bad Request` (rabat przekracza cenę)
- `F_gross < 0` → serwer zwraca `400 Bad Request`
- `PERCENT` z `v < -100` → serwer zwraca `400 Bad Request`
- `FIXED_NET` lub `FIXED_GROSS` z `v < 0` → serwer zwraca `400 Bad Request`
- `SET_NET` lub `SET_GROSS` z `v < 0` → serwer zwraca `400 Bad Request`

---

## 3. Model danych

### 3.1 `ServiceLineItem` (w odpowiedzi serwera)

```json
{
  "id": "uuid",
  "serviceId": "uuid | null",
  "serviceName": "string",
  "basePriceNet": 10000,
  "vatRate": 23,
  "requireManualPrice": false,
  "adjustment": {
    "type": "FIXED_NET",
    "value": 2000
  },
  "note": "string",
  "finalPriceNet": 8000,
  "finalPriceGross": 9840,
  "status": "CONFIRMED",
  "pendingOperation": null,
  "hasPendingChange": false,
  "previousPriceNet": null,
  "previousPriceGross": null
}
```

| Pole | Typ | Jednostka | Oblicza |
|------|-----|-----------|---------|
| `basePriceNet` | integer | grosze | klient przesyła |
| `vatRate` | integer | % | klient przesyła |
| `adjustment.value` | integer\* | grosze / % | klient przesyła |
| `finalPriceNet` | integer | grosze | **serwer** |
| `finalPriceGross` | integer | grosze | **serwer** |
| `previousPriceNet` | integer\|null | grosze | **serwer** (przed zmianą oczekującą) |
| `previousPriceGross` | integer\|null | grosze | **serwer** (przed zmianą oczekującą) |

\* Dla `PERCENT` — procent (może być float, np. `10.5`). Dla pozostałych typów — integer (grosze).

### 3.2 `MoneyBreakdown` (pole `totalCost` na wizycie)

```json
{
  "netAmount": 35000,
  "grossAmount": 43050,
  "currency": "PLN"
}
```

`totalCost` = suma `finalPriceNet` i `finalPriceGross` wszystkich usług o statusie `CONFIRMED`.  
Usługi ze statusem `PENDING` **nie są wliczane** do `totalCost`.

---

## 4. Statusy usługi i workflow zatwierdzania

```
PENDING  →  CONFIRMED  (approve)
PENDING  →  odrzucona i usunięta  (reject)
```

| `status` | `pendingOperation` | Znaczenie |
|----------|--------------------|-----------|
| `CONFIRMED` | `null` | Usługa aktywna, wliczana do sumy |
| `PENDING` | `ADD` | Nowa usługa czeka na zatwierdzenie przez klienta |
| `PENDING` | `EDIT` | Zmiana ceny/parametrów czeka na zatwierdzenie |
| `PENDING` | `DELETE` | Usunięcie czeka na zatwierdzenie |

Przy `pendingOperation = EDIT`:
- `previousPriceNet` i `previousPriceGross` zawierają ceny **przed** zmianą
- `finalPriceNet` i `finalPriceGross` zawierają ceny **proponowane**
- Do `totalCost` wliczane są wartości `previousPriceNet`/`previousPriceGross`

---

## 5. Kontrakty endpointów

### 5.1 Pobranie wizyty

```
GET /visits/{visitId}
```

**Response 200:**
```json
{
  "visit": {
    "id": "uuid",
    "services": [ /* ServiceLineItem[] */ ],
    "totalCost": { "netAmount": 35000, "grossAmount": 43050, "currency": "PLN" }
  }
}
```

Serwer zawsze zwraca przeliczone `finalPriceNet`, `finalPriceGross` dla każdej usługi oraz aktualne `totalCost`.

---

### 5.2 Dodanie usługi do wizyty

```
POST /visits/{visitId}/services
```

**Request body:**
```json
{
  "serviceId": "uuid | null",
  "serviceName": "Polerowanie",
  "basePriceNet": 30000,
  "vatRate": 23,
  "adjustment": {
    "type": "FIXED_NET",
    "value": 5000
  },
  "note": "",
  "notifyCustomer": true
}
```

| Pole | Wymagane | Opis |
|------|----------|------|
| `serviceId` | tak | UUID usługi z katalogu lub `null` dla usługi niestandardowej |
| `serviceName` | tak | Nazwa (max 255 znaków) |
| `basePriceNet` | tak | Cena katalogowa netto w groszach (integer, > 0 lub 0 gdy `requireManualPrice=true`) |
| `vatRate` | tak | Stawka VAT: `0 | 5 | 8 | 23` |
| `adjustment` | nie | Domyślnie `{"type": "PERCENT", "value": 0}` |
| `note` | nie | Notatka (max 1000 znaków) |
| `notifyCustomer` | nie | Domyślnie `false` |

**Response 201:**
```json
{
  "id": "uuid",
  "serviceId": "uuid",
  "serviceName": "Polerowanie",
  "basePriceNet": 30000,
  "vatRate": 23,
  "requireManualPrice": false,
  "adjustment": { "type": "FIXED_NET", "value": 5000 },
  "note": "",
  "finalPriceNet": 25000,
  "finalPriceGross": 30750,
  "status": "PENDING",
  "pendingOperation": "ADD",
  "hasPendingChange": true,
  "previousPriceNet": null,
  "previousPriceGross": null
}
```

Serwer **musi** przeliczyć i zwrócić `finalPriceNet` i `finalPriceGross` zgodnie z wzorami z §2.2.

---

### 5.3 Aktualizacja usługi

```
PATCH /visits/{visitId}/services/{serviceLineItemId}
```

**Request body (wszystkie pola opcjonalne):**
```json
{
  "basePriceNet": 35000,
  "vatRate": 23,
  "adjustment": {
    "type": "PERCENT",
    "value": -15
  },
  "note": "Zmiana ceny po wycenie",
  "notifyCustomer": true
}
```

Przesłanie tylko podzbioru pól → pozostałe niezmienione (patch semantics).

**Response 200:** zaktualizowany `ServiceLineItem` (pełny obiekt, z przeliczonymi `finalPriceNet`, `finalPriceGross`).

Jeśli wizyta ma status inny niż `IN_PROGRESS` lub `READY_FOR_PICKUP` → `409 Conflict`.

---

### 5.4 Usunięcie usługi

```
DELETE /visits/{visitId}/services/{serviceLineItemId}
```

**Request body:**
```json
{ "notifyCustomer": false }
```

**Response 204** — brak body.

---

### 5.5 Zbiorczy zapis zmian

```
PATCH /visits/{visitId}/services/
```

Używane do zapisania wszystkich zmian naraz po sesji edycji (bez powiadamiania klienta o każdej z osobna).

**Request body:**
```json
{
  "notifyCustomer": true,
  "added": [
    {
      "serviceId": "uuid",
      "serviceName": "Pranie tapicerki",
      "basePriceNet": 25000,
      "vatRate": 23,
      "adjustment": { "type": "PERCENT", "value": 0 },
      "note": ""
    }
  ],
  "updated": [
    {
      "serviceLineItemId": "uuid",
      "basePriceNet": 30000,
      "vatRate": 23,
      "adjustment": { "type": "FIXED_NET", "value": 3000 },
      "note": ""
    }
  ],
  "deleted": [
    { "serviceLineItemId": "uuid" }
  ]
}
```

**Response 200:**
```json
{
  "services": [ /* ServiceLineItem[] — pełna, zaktualizowana lista usług wizyty */ ],
  "totalCost": { "netAmount": 52000, "grossAmount": 63960, "currency": "PLN" }
}
```

Serwer przetwarza operacje atomowo (wszystkie albo żadna). Jeśli jakakolwiek operacja jest nieprawidłowa → `400` i żadna zmiana nie jest zapisana.

---

### 5.6 Zatwierdzenie zmiany usługi

```
POST /visits/{visitId}/services/{serviceLineItemId}/approve
```

**Request body:** brak

**Response 200:** zaktualizowany `ServiceLineItem` ze `status: "CONFIRMED"`, `pendingOperation: null`, `hasPendingChange: false`.

Jeśli `pendingOperation = DELETE` → usługa jest usuwana, a serwer zwraca `204 No Content`.

---

### 5.7 Odrzucenie zmiany usługi

```
POST /visits/{visitId}/services/{serviceLineItemId}/reject
```

**Request body:** brak

**Response 200:** `ServiceLineItem` przywrócony do stanu sprzed zmiany.  
Przy `pendingOperation = EDIT`: `finalPriceNet` i `finalPriceGross` wracają do `previousPriceNet`/`previousPriceGross`.  
Przy `pendingOperation = ADD`: usługa jest usuwana → `204 No Content`.

---

### 5.8 Check-in — tworzenie wizyty z rezerwacji

```
POST /checkin/reservation-to-visit
```

**Request body:** zawiera tablicę `services` z pełnymi danymi usług (takimi jak w §5.2, bez `notifyCustomer`).

**Response 201:**
```json
{
  "visitId": "uuid"
}
```

Serwer tworzy wizytę, oblicza `finalPriceNet`/`finalPriceGross` dla każdej usługi i `totalCost`. Wszystkie usługi dostają status `CONFIRMED` (brak przepływu zatwierdzania przy tworzeniu).

---

## 6. Obliczanie `totalCost`

```
totalCost.netAmount   = Σ finalPriceNet   (dla usług CONFIRMED)
totalCost.grossAmount = Σ finalPriceGross (dla usług CONFIRMED)
```

Usługi ze statusem `PENDING` (oczekujące na zatwierdzenie) **nie są wliczane**.

Przy `PENDING` + `EDIT`:
```
totalCost używa previousPriceNet / previousPriceGross
(nie proponowanej nowej ceny)
```

Serwer aktualizuje `totalCost` **przy każdej operacji** modyfikującej usługi wizyty i zawsze zwraca aktualną wartość w response.

---

## 7. Błędy

| Kod HTTP | Kiedy |
|----------|-------|
| `400 Bad Request` | Nieprawidłowe dane (zła stawka VAT, ujemna kwota, cena wynikowa < 0, niepoprawny typ adiustacji) |
| `404 Not Found` | Wizyta lub pozycja usługi nie istnieje |
| `409 Conflict` | Operacja niedozwolona w danym statusie wizyty |
| `422 Unprocessable Entity` | Logicznie niepoprawna kombinacja danych (np. rabat większy niż cena) |

Ciało błędu:
```json
{
  "error": "INVALID_ADJUSTMENT_VALUE",
  "message": "Discount value exceeds base price",
  "field": "adjustment.value"
}
```

---

## 8. Przykład kompletny — wizyta z rabatem proporcjonalnym

Scenariusz: 2 usługi, rabat brutto 50 PLN rozdzielony proporcjonalnie.

**Usługi bazowe:**
- Usługa A: `basePriceNet=10000`, `vatRate=23` → `B_gross=12300`
- Usługa B: `basePriceNet=20000`, `vatRate=23` → `B_gross=24600`
- Suma brutto: `36900`

**Rabat brutto 5000 gr (50,00 PLN) rozdzielony proporcjonalnie:**
- Usługa A: `round(5000 × 12300 / 36900) = round(1666.67) = 1667`
- Usługa B: reszta = `5000 - 1667 = 3333`

**Request PATCH `/visits/{id}/services/`:**
```json
{
  "updated": [
    {
      "serviceLineItemId": "uuid-A",
      "basePriceNet": 10000,
      "vatRate": 23,
      "adjustment": { "type": "FIXED_GROSS", "value": 1667 }
    },
    {
      "serviceLineItemId": "uuid-B",
      "basePriceNet": 20000,
      "vatRate": 23,
      "adjustment": { "type": "FIXED_GROSS", "value": 3333 }
    }
  ]
}
```

**Oczekiwany response (serwer oblicza):**

Usługa A:
```
F_gross = 12300 - 1667 = 10633
F_net   = round(10633 × 100 / 123) = round(8644.7) = 8645
F_vat   = 10633 - 8645 = 1988
```

Usługa B:
```
F_gross = 24600 - 3333 = 21267
F_net   = round(21267 × 100 / 123) = round(17290.2) = 17290
F_vat   = 21267 - 17290 = 3977
```

`totalCost`:
```
netAmount   = 8645 + 17290 = 25935
grossAmount = 10633 + 21267 = 31900  (= 36900 - 5000 ✓)
```

---

## 9. Wykryte niespójności do naprawy w backendzie

Na podstawie analizy bieżącego backendu stwierdzono następujące odchylenia od niniejszego kontraktu:

| # | Problem | Oczekiwane | Aktualnie |
|---|---------|-----------|-----------|
| 1 | `FIXED_NET`: serwer **dodaje** `adjustment.value` do `basePriceNet` zamiast odejmować | `finalPriceNet = base - value` | `finalPriceNet = base + value` |
| 2 | `totalCost` nie jest aktualizowane po zmianach serwisów w trakcie wizyty | Aktualizacja po każdej operacji | Wartość z momentu created |
| 3 | `adjustment.value` przyjmowane jako `float` zamiast `integer` | `1667` (integer, grosze) | `1667.0` (float) |
