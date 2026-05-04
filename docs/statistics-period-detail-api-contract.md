# Statistics — Period Detail (drill-down wizyt) API Contract

**Adresaci:** zespół backendowy  
**Status:** do implementacji  
**Priorytet:** średni — endpoint opcjonalny dla istniejącego widoku statystyk  
**Kontekst UI:** drawer boczny otwierany po kliknięciu słupka na wykresie przychodów

---

## 1. Kontekst i cel

Widok `/statistics` pozwala użytkownikowi kliknąć dowolny słupek na wykresie przychodów,
aby zobaczyć listę wizyt składających się na tę wartość oraz usługi wykonane w ramach
każdej wizyty. Endpoint obsługuje dwa tryby:

- **Bez filtra kategorii** — wszystkie wizyty i usługi z danego okresu
- **Z filtrem kategorii** — wszystkie wizyty z danego okresu, z oznaczeniem
  które usługi należą do wybranej kategorii (pozostałe widoczne jako kontekst,
  ale wizualnie wyciszone)

---

## 2. Endpoint

```
GET /v1/statistics/periods/{period}/visits
```

### 2.1 Parametry ścieżki

| Parametr | Typ | Opis |
|---|---|---|
| `period` | `string` | Identyfikator okresu — **ten sam format co `StatsDataPoint.period`** z `/v1/statistics/breakdown`. Frontend przekazuje wartość 1:1 z osi X wykresu, backend musi umieć go sparsować. |

Format `period` zależy od `granularity`:

| `granularity` | Format | Przykład |
|---|---|---|
| `DAILY` | `YYYY-MM-DD` | `2025-04-15` |
| `WEEKLY` | `YYYY-Www` (ISO 8601) | `2025-W16` |
| `MONTHLY` | `YYYY-MM` | `2025-04` |
| `QUARTERLY` | `YYYY-Qq` | `2025-Q2` |
| `YEARLY` | `YYYY` | `2025` |

### 2.2 Parametry zapytania (query string)

| Parametr | Typ | Wymagany | Opis |
|---|---|---|---|
| `granularity` | `Granularity` | **tak** | Wymagany do interpretacji formatu `period` w ścieżce. |
| `categoryId` | `string` (UUID) | nie | Jeśli podany, każda usługa w odpowiedzi otrzymuje pole `inCategory: boolean`. Wizyty i KPI na poziomie okresu są liczone dla **wszystkich usług** — `categoryId` wpływa tylko na tagowanie, nie na filtrowanie. |

> **Uwaga:** `categoryId` nie filtruje wizyt — wizyta pojawia się w liście niezależnie od tego,
> czy ma usługi z danej kategorii. Nawet wizyta z zerowym wkładem kategorii powinna być widoczna,
> bo informacja "ta wizyta nie miała usług z Myjni" jest wartościowa dla użytkownika.

---

## 3. Typy odpowiedzi

```typescript
type Granularity = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

interface PeriodDetailResponse {
    /**
     * Echo parametrów żądania — frontend używa do nagłówka drawera.
     */
    period: string;
    granularity: Granularity;

    /**
     * Łączna liczba zleceń (wizyt) w tym okresie.
     * Nie zmienia się w zależności od categoryId.
     */
    orderCount: number;

    /**
     * Przychód brutto WYŁĄCZNIE z usług należących do categoryId (jeśli podano).
     * Jeśli categoryId nie podano: równe totalRevenueGrossAll.
     * Jednostka: grosze (integer). Przykład: 124900 = 1 249,00 zł
     */
    totalRevenueGross: number;

    /**
     * Przychód brutto ze WSZYSTKICH usług w tym okresie, niezależnie od filtra.
     * Zawsze równy sumie wizyt z wszystkimi usługami.
     * Używany przez frontend do pokazania "X zł łącznie" przy aktywnym filtrze.
     */
    totalRevenueGrossAll: number;

    /**
     * Nazwa kategorii filtra — echo parametru categoryId.
     * null gdy categoryId nie podano.
     * Używany w nagłówku drawera i labelach sekcji usług.
     */
    categoryName: string | null;

    /**
     * Lista wizyt, sortowanie: malejąco wg daty zakończenia (najnowsze pierwsze).
     * Zawiera WSZYSTKIE zlecenia zakończone (status = COMPLETED) w danym okresie.
     * Wizyty bez żadnej usługi z categoryId RÓWNIEŻ są zwracane.
     */
    visits: PeriodVisit[];
}

interface PeriodVisit {
    visitId: string;        // UUID zlecenia

    /**
     * Data zakończenia wizyty, format dla polskiego UI: "D MMM YYYY"
     * Przykłady: "3 kwi 2025", "15 sty 2025"
     * Backend formatuje po stronie serwera (locale pl-PL).
     */
    visitDate: string;

    /**
     * Imię i nazwisko klienta przypisanego do zlecenia.
     * Format: "Jan Kowalski"
     * Jeśli klient usunięty/anonimizowany: "Klient usunięty"
     */
    clientName: string;

    /**
     * Opis pojazdu w formacie: "Marka Model (Rok)"
     * Przykład: "BMW 5 Series (2022)"
     * Jeśli brak pojazdu: null
     */
    vehicleInfo: string | null;

    /**
     * Przychód brutto WYŁĄCZNIE z usług należących do categoryId.
     * Gdy categoryId nie podano: równe totalRevenueGrossAll.
     * Gdy podano, ale wizyta nie ma usług z tej kategorii: 0.
     * Jednostka: grosze.
     */
    totalRevenueGross: number;

    /**
     * Przychód brutto ze WSZYSTKICH usług tej wizyty.
     * Jednostka: grosze.
     */
    totalRevenueGrossAll: number;

    /**
     * Lista pozycji zrealizowanych w ramach wizyty.
     * Sortowanie:
     *   1. Usługi z kategorii (inCategory = true) — malejąco wg priceGross
     *   2. Pozostałe usługi (inCategory = false) — malejąco wg priceGross
     *   Gdy categoryId nie podano: wszystkie malejąco wg priceGross.
     */
    services: PeriodVisitService[];
}

interface PeriodVisitService {
    serviceId: string;      // UUID usługi z katalogu
    serviceName: string;    // Nazwa usługi, np. "Polerowanie maszynowe dwuetapowe"

    /**
     * Cena brutto tej pozycji w wizycie.
     * Uwaga: to cena z konkretnego zlecenia (może się różnić od aktualnej ceny katalogowej).
     * Jednostka: grosze.
     */
    priceGross: number;

    /**
     * Obecne tylko gdy w żądaniu podano categoryId.
     * true  → usługa należy do żądanej kategorii
     * false → usługa należy do innej kategorii lub jest nieprzypisana
     * Gdy categoryId nie podano: pole nieobecne w odpowiedzi (undefined).
     */
    inCategory?: boolean;
}
```

---

## 4. Przykłady

### 4.1 Bez filtra kategorii

**Żądanie:**
```
GET /v1/statistics/periods/2025-04/visits?granularity=MONTHLY
Authorization: Bearer {token}
```

**Odpowiedź `200 OK`:**
```json
{
  "period": "2025-04",
  "granularity": "MONTHLY",
  "orderCount": 8,
  "totalRevenueGross": 1245000,
  "totalRevenueGrossAll": 1245000,
  "categoryName": null,
  "visits": [
    {
      "visitId": "550e8400-e29b-41d4-a716-446655440001",
      "visitDate": "28 kwi 2025",
      "clientName": "Jan Kowalski",
      "vehicleInfo": "BMW 5 Series (2022)",
      "totalRevenueGross": 470000,
      "totalRevenueGrossAll": 470000,
      "services": [
        {
          "serviceId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Powłoka ceramiczna Gtechniq Crystal Serum",
          "priceGross": 399900
        },
        {
          "serviceId": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Mycie kompleksowe + wosk",
          "priceGross": 34900
        },
        {
          "serviceId": "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Czyszczenie felg i opon",
          "priceGross": 35200
        }
      ]
    },
    {
      "visitId": "550e8400-e29b-41d4-a716-446655440002",
      "visitDate": "19 kwi 2025",
      "clientName": "Anna Nowak",
      "vehicleInfo": "Mercedes-Benz C 300 (2021)",
      "totalRevenueGross": 249900,
      "totalRevenueGrossAll": 249900,
      "services": [
        {
          "serviceId": "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Polerowanie maszynowe dwuetapowe",
          "priceGross": 119900
        },
        {
          "serviceId": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Mycie kompleksowe + wosk",
          "priceGross": 34900
        },
        {
          "serviceId": "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Renowacja tapicerki skórzanej",
          "priceGross": 95100
        }
      ]
    }
  ]
}
```

---

### 4.2 Z filtrem kategorii "Myjnia"

**Żądanie:**
```
GET /v1/statistics/periods/2025-04/visits?granularity=MONTHLY&categoryId=cat-550e8400-myjnia
Authorization: Bearer {token}
```

**Odpowiedź `200 OK`:**
```json
{
  "period": "2025-04",
  "granularity": "MONTHLY",
  "orderCount": 8,
  "totalRevenueGross": 278400,
  "totalRevenueGrossAll": 1245000,
  "categoryName": "Myjnia",
  "visits": [
    {
      "visitId": "550e8400-e29b-41d4-a716-446655440001",
      "visitDate": "28 kwi 2025",
      "clientName": "Jan Kowalski",
      "vehicleInfo": "BMW 5 Series (2022)",
      "totalRevenueGross": 70100,
      "totalRevenueGrossAll": 470000,
      "services": [
        {
          "serviceId": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Mycie kompleksowe + wosk",
          "priceGross": 34900,
          "inCategory": true
        },
        {
          "serviceId": "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Czyszczenie felg i opon",
          "priceGross": 35200,
          "inCategory": true
        },
        {
          "serviceId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Powłoka ceramiczna Gtechniq Crystal Serum",
          "priceGross": 399900,
          "inCategory": false
        }
      ]
    },
    {
      "visitId": "550e8400-e29b-41d4-a716-446655440002",
      "visitDate": "19 kwi 2025",
      "clientName": "Anna Nowak",
      "vehicleInfo": "Mercedes-Benz C 300 (2021)",
      "totalRevenueGross": 34900,
      "totalRevenueGrossAll": 249900,
      "services": [
        {
          "serviceId": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Mycie kompleksowe + wosk",
          "priceGross": 34900,
          "inCategory": true
        },
        {
          "serviceId": "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Polerowanie maszynowe dwuetapowe",
          "priceGross": 119900,
          "inCategory": false
        },
        {
          "serviceId": "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Renowacja tapicerki skórzanej",
          "priceGross": 95100,
          "inCategory": false
        }
      ]
    }
  ]
}
```

---

## 5. Kody błędów

| Kod HTTP | Kod błędu | Kiedy |
|---|---|---|
| `400 Bad Request` | `MISSING_GRANULARITY` | Brakuje parametru `granularity` |
| `400 Bad Request` | `INVALID_GRANULARITY` | Nieznana wartość `granularity` |
| `400 Bad Request` | `INVALID_PERIOD_FORMAT` | `period` nie pasuje do formatu wymaganego przez podane `granularity` |
| `400 Bad Request` | `FUTURE_PERIOD` | Żądany okres jest w całości w przyszłości |
| `401 Unauthorized` | `UNAUTHORIZED` | Brak/wygasły token |
| `403 Forbidden` | `FORBIDDEN` | Zalogowany użytkownik nie ma dostępu do statystyk tego warsztatu |
| `404 Not Found` | `CATEGORY_NOT_FOUND` | `categoryId` nie istnieje lub nie należy do warsztatu |

**Format błędu:**
```json
{
  "error": "INVALID_PERIOD_FORMAT",
  "message": "Period '2025-13' is not a valid MONTHLY period (expected YYYY-MM)",
  "field": "period"
}
```

---

## 6. Reguły biznesowe

### 6.1 Które zlecenia wchodzą do odpowiedzi

- Tylko zlecenia ze statusem **`COMPLETED`**
- Zakończone (`completed_at`) w granicach okresu wyznaczonego przez `period` + `granularity`
- Należące do warsztatu (`studio_id`) zalogowanego użytkownika

Przykłady granic:

| `period` | `granularity` | Zakres `completed_at` |
|---|---|---|
| `2025-04` | `MONTHLY` | `2025-04-01 00:00:00` ≤ t < `2025-05-01 00:00:00` |
| `2025-W16` | `WEEKLY` | `2025-04-14 00:00:00` ≤ t < `2025-04-21 00:00:00` (pn–nd, ISO 8601) |
| `2025-Q2` | `QUARTERLY` | `2025-04-01 00:00:00` ≤ t < `2025-07-01 00:00:00` |
| `2025` | `YEARLY` | `2025-01-01 00:00:00` ≤ t < `2026-01-01 00:00:00` |
| `2025-04-15` | `DAILY` | `2025-04-15 00:00:00` ≤ t < `2025-04-16 00:00:00` |

Zakresy w strefie czasowej warsztatów (pole `timezone` w ustawieniach warsztatu).

### 6.2 Obliczanie `totalRevenueGross`

```
PeriodVisit.totalRevenueGross =
    SUM(priceGross) WHERE service.categoryId = :categoryId
    // 0 jeśli wizyta nie ma usług z tej kategorii

PeriodVisit.totalRevenueGrossAll =
    SUM(priceGross) wszystkich usług wizyty

PeriodDetailResponse.totalRevenueGross =
    SUM(visit.totalRevenueGross) dla wszystkich wizyt w okresie

PeriodDetailResponse.totalRevenueGrossAll =
    SUM(visit.totalRevenueGrossAll) dla wszystkich wizyt w okresie
```

> Wartości `totalRevenueGross` na poziomie okresu muszą być **spójne z danymi na wykresie**
> z endpointu `GET /v1/statistics/breakdown`. Jeśli użytkownik kliknie słupek "kwiecień 2025",
> wartość w KPI tytułowym drawera musi być identyczna z wysokością słupka — inaczej użytkownik
> straci zaufanie do danych.

### 6.3 `inCategory` — reguła przypisania

```
inCategory = true
    ↔ usługa (service_id) jest przypisana do kategorii o id = :categoryId
    ↔ istnieje rekord w tabeli service_category_assignments
       WHERE service_id = oi.service_id AND category_id = :categoryId

// Przypisanie obowiązuje w momencie ZAPYTANIA, nie w momencie wykonania wizyty.
// Jeśli usługa została przeniesiona do innej kategorii po zakończeniu wizyty,
// frontend pokaże ją z aktualnym przypisaniem.
```

### 6.4 Usługi z usuniętą/nieaktywną kategorią

Jeśli `categoryId` wskazuje na kategorię, która istnieje w bazie, ale:
- `is_active = false` — endpoint zwraca `404 CATEGORY_NOT_FOUND` (kategoria wycofana)
- Kategoria należy do innego warsztatu — `403 FORBIDDEN`
- Kategoria usunięta (`deleted_at IS NOT NULL`) — `404 CATEGORY_NOT_FOUND`

---

## 7. Uwagi dot. wydajności

### 7.1 Oczekiwana liczba wierszy

Dla typowego warsztatu detailingowego i granularity `MONTHLY`: 3–25 wizyt na miesiąc, 1–8 usług na wizytę. Endpoint nie wymaga paginacji na MVP.

Jeśli w przyszłości zakres danych wzrośnie, paginacja powinna być dodana z zachowaniem kompatybilności wstecznej:

```
?page=1&pageSize=20
```

Na MVP: **brak paginacji**, limit 200 wizyt per okres (odpowiedź 400 `PERIOD_TOO_LARGE` jeśli przekroczony).

### 7.2 Sugerowane zapytanie SQL (uproszczone)

```sql
SELECT
    o.id                                    AS visit_id,
    o.completed_at                          AS completed_at,
    CONCAT(c.first_name, ' ', c.last_name)  AS client_name,
    CONCAT(v.make, ' ', v.model,
           ' (', v.year, ')')               AS vehicle_info,
    s.id                                    AS service_id,
    s.name                                  AS service_name,
    oi.unit_price_gross                     AS price_gross,
    -- inCategory tylko gdy :categoryId IS NOT NULL
    CASE
        WHEN :categoryId IS NULL THEN NULL
        WHEN sca.service_id IS NOT NULL THEN TRUE
        ELSE FALSE
    END                                     AS in_category
FROM orders o
JOIN clients c            ON c.id = o.client_id
LEFT JOIN vehicles v      ON v.id = o.vehicle_id
JOIN order_items oi       ON oi.order_id = o.id
JOIN services s           ON s.id = oi.service_id
LEFT JOIN service_category_assignments sca
    ON sca.service_id = s.id
    AND sca.category_id = :categoryId       -- NULL-safe: nie matchuje gdy :categoryId IS NULL
WHERE o.studio_id    = :studioId
  AND o.status       = 'COMPLETED'
  AND o.completed_at >= :periodStart
  AND o.completed_at  < :periodEnd
ORDER BY
    o.completed_at DESC,
    -- usługi z kategorii pierwsze, gdy filtr aktywny
    CASE WHEN sca.service_id IS NOT NULL THEN 0 ELSE 1 END,
    oi.unit_price_gross DESC;
```

Wynik grupowany po `visit_id` po stronie aplikacji (nie SQL), żeby uniknąć N+1 i złożonego GROUP BY z JSON_AGG.

### 7.3 Indeksy

Upewnić się, że istnieją:
```sql
CREATE INDEX IF NOT EXISTS idx_orders_studio_status_completed
    ON orders (studio_id, status, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sca_service_category
    ON service_category_assignments (service_id, category_id);
```

---

## 8. Autentykacja i autoryzacja

Identyczna z innymi endpointami statystyk:

- Wymagany nagłówek `Authorization: Bearer {token}`
- Token JWT z claimem `studioId` — endpoint zwraca dane wyłącznie dla warsztatu z tokenu
- Wymagana rola: `OWNER` lub `MANAGER` (nie `TECHNICIAN`)

---

## 9. Kontrakt frontendu — jak frontend używa tego endpointu

### 9.1 Kiedy jest wywoływany

```
Użytkownik klika słupek na wykresie
    → setDrillPeriod(period)           // period = wartość z osi X, np. "2025-04"
    → PeriodDetailDrawer otwiera się
    → fetchPeriodDetail(period, granularity, { categoryId, categoryName })
    → GET /v1/statistics/periods/{period}/visits?granularity={g}&categoryId={id}
```

### 9.2 Aktualny mock (do zastąpienia)

```
src/modules/statistics/api/periodDetailMockApi.ts
```

Funkcja `fetchPeriodDetail` — po implementacji backendu należy ją zastąpić wywołaniem HTTP.
Sygnatura publiczna (nie zmieni się):

```typescript
fetchPeriodDetail(
    period: string,
    granularity: Granularity,
    options?: {
        categoryId?: string | null;
        categoryName?: string | null;   // używane lokalnie, nie wysyłane do API
    }
): Promise<PeriodDetail>
```

### 9.3 Mapowanie typów frontend → backend

| Pole frontend (`PeriodDetail`) | Pole backend (`PeriodDetailResponse`) | Uwagi |
|---|---|---|
| `period` | `period` | echo |
| `granularity` | `granularity` | echo |
| `orderCount` | `orderCount` | |
| `totalRevenueGross` | `totalRevenueGross` | grosze |
| `totalRevenueGrossAll` | `totalRevenueGrossAll` | grosze |
| `categoryName` | `categoryName` | echo `categoryId` → name |
| `visits[].visitId` | `visits[].visitId` | UUID |
| `visits[].visitDate` | `visits[].visitDate` | string pl-PL |
| `visits[].clientName` | `visits[].clientName` | |
| `visits[].vehicleInfo` | `visits[].vehicleInfo` | `null` → ukryty |
| `visits[].totalRevenueGross` | `visits[].totalRevenueGross` | grosze |
| `visits[].totalRevenueGrossAll` | `visits[].totalRevenueGrossAll` | grosze |
| `visits[].services[].serviceId` | `visits[].services[].serviceId` | |
| `visits[].services[].serviceName` | `visits[].services[].serviceName` | |
| `visits[].services[].priceGross` | `visits[].services[].priceGross` | grosze |
| `visits[].services[].inCategory` | `visits[].services[].inCategory` | `undefined` gdy bez filtra |

---

## 10. Checklist implementacji

- [ ] Endpoint zarejestrowany w routerze: `GET /v1/statistics/periods/:period/visits`
- [ ] Walidacja parametrów (`granularity`, format `period`, opcjonalne `categoryId`)
- [ ] Parsowanie granic okresu zgodnie z tabelą w sekcji 6.1 (ze strefą czasową warsztatu)
- [ ] Zapytanie SQL z obsługą opcjonalnego `categoryId`
- [ ] Indeksy z sekcji 7.3
- [ ] Sortowanie wizyt malejąco wg `completed_at`
- [ ] Sortowanie usług: in-category pierwsze, następnie malejąco wg ceny
- [ ] `totalRevenueGross` / `totalRevenueGrossAll` poprawnie liczone na poziomie wizyty i okresu
- [ ] Spójność `totalRevenueGross` z danymi z `/v1/statistics/breakdown` (ten sam zakres, ten sam filtr)
- [ ] Obsługa `vehicleInfo = null` (zlecenie bez pojazdu)
- [ ] Obsługa `clientName` dla usuniętych klientów (`"Klient usunięty"`)
- [ ] Kody błędów z sekcji 5
- [ ] Testy jednostkowe: obliczanie `totalRevenueGross` z filtrem i bez
- [ ] Testy integracyjne: `WEEKLY` i `QUARTERLY` — poprawne granice zakresu
