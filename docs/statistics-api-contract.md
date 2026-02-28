# Statistics API — nowy kontrakt

**Adresaci:** zespół backendowy
**Status:** do implementacji
**Priorytet:** wysoki — widok statystyk wykonuje obecnie 3 + N + M żądań HTTP przy każdym renderowaniu

---

## 1. Kontekst i problem

### Obecne wywołania przy wejściu na widok statystyk

| # | Endpoint | Opis |
|---|---|---|
| 1 | `GET /v1/service-categories` | lista kategorii |
| 2 | `GET /v1/statistics/overview` | dane wykresu |
| 3..N+2 | `GET /v1/service-categories/{id}` | **po jednym na każdą kategorię** |
| N+3 | `GET /v1/statistics/unassigned-services` | nieprzypisane usługi |
| N+4..N+M+3 | `GET /v1/statistics/services/{id}` | **po jednym na każdą usługę** |

Przy 5 kategoriach i 20 usługach = **28 żądań HTTP na jedno otwarcie strony**.

### Po implementacji nowego kontraktu

| Scenariusz | Przed | Po |
|---|---|---|
| Wejście na widok | 3 + N + M | **1** |
| Zmiana filtrów | 3 + N + M | **1** |
| Kliknięcie kategorii (wykres) | +1 | **+1** (bez zmian) |
| Przypisanie usługi do kategorii | N + 1 (odczyt listy + zapis) | **1** |
| Odpięcie usługi | N + 1 | **1** |

---

## 2. Typy wspólne (bez zmian)

```typescript
type Granularity = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

interface StatsDataPoint {
    period: string;          // format zależny od granularity — patrz sekcja 6
    orderCount: number;      // liczba zleceń całkowita (nie pozycji)
    totalRevenueGross: number; // w groszach, integer
}

interface StatsTotals {
    orderCount: number;
    totalRevenueGross: number; // w groszach, integer
}
```

---

## 3. Nowe i zmienione endpointy

### 3.1 `GET /v1/statistics/breakdown` ★ NOWY

Główny endpoint widoku. Zastępuje: `overview`, `unassigned-services`, N × `service stats`, N × `category detail`.

#### Parametry zapytania

| Parametr | Typ | Wymagany | Opis |
|---|---|---|---|
| `granularity` | `Granularity` | tak | poziom agregacji czasowej |
| `startDate` | `string` (YYYY-MM-DD) | tak | początek zakresu (włącznie) |
| `endDate` | `string` (YYYY-MM-DD) | tak | koniec zakresu (włącznie) |

**Walidacja:**
- `startDate` musi być ≤ `endDate`
- `endDate` nie może być datą z przyszłości większą niż dziś + 1 dzień (tolerancja stref czasowych)
- Maksymalny zakres: 5 lat (`endDate - startDate ≤ 1826 dni`)
- `granularity` musi być jedną z dozwolonych wartości

#### Response `200 OK`

```typescript
interface BreakdownResponse {
    period: {
        granularity: Granularity;
        startDate: string;   // YYYY-MM-DD, echo parametru
        endDate: string;     // YYYY-MM-DD, echo parametru
    };

    /**
     * Dane wykresu i totals dla całego warsztatu (wszystkie kategorie razem).
     * Używane gdy żadna kategoria nie jest wybrana.
     */
    overview: {
        data: StatsDataPoint[];
        totals: StatsTotals;
    };

    /**
     * Aktywne (isActive=true) kategorie wraz ze statystykami i listą usług.
     * Sortowanie: malejąco wg totals.totalRevenueGross.
     */
    categories: CategoryBreakdownItem[];

    /**
     * Usługi nieprzypisane do żadnej aktywnej kategorii.
     * Sortowanie: malejąco wg totals.totalRevenueGross.
     */
    unassignedServices: ServiceBreakdownItem[];
}

interface CategoryBreakdownItem {
    categoryId: string;
    categoryName: string;
    description: string | null;
    color: string | null;         // hex, np. "#3B82F6"
    totals: StatsTotals;
    /**
     * Usługi przypisane do tej kategorii — WSZYSTKIE przypisane usługi,
     * nie tylko te z aktywnymi zleceniami w podanym zakresie.
     * Jeśli usługa nie ma zleceń w zakresie, totals = { orderCount: 0, totalRevenueGross: 0 }.
     * Sortowanie: malejąco wg totals.totalRevenueGross.
     */
    services: ServiceBreakdownItem[];
}

interface ServiceBreakdownItem {
    serviceId: string;
    serviceName: string;
    isActive: boolean;     // czy usługa jest aktywna w katalogu
    totals: StatsTotals;
}
```

#### Przykład odpowiedzi

```json
{
  "period": {
    "granularity": "MONTHLY",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "overview": {
    "data": [
      { "period": "2024-01", "orderCount": 12, "totalRevenueGross": 486000 },
      { "period": "2024-02", "orderCount": 9,  "totalRevenueGross": 361500 }
    ],
    "totals": { "orderCount": 21, "totalRevenueGross": 847500 }
  },
  "categories": [
    {
      "categoryId": "550e8400-e29b-41d4-a716-446655440000",
      "categoryName": "Lakiernictwo",
      "description": "Polerowanie i zabezpieczanie lakieru",
      "color": "#3B82F6",
      "totals": { "orderCount": 15, "totalRevenueGross": 625000 },
      "services": [
        {
          "serviceId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Polerowanie maszynowe",
          "isActive": true,
          "totals": { "orderCount": 10, "totalRevenueGross": 420000 }
        },
        {
          "serviceId": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
          "serviceName": "Powłoka ceramiczna",
          "isActive": true,
          "totals": { "orderCount": 5, "totalRevenueGross": 205000 }
        }
      ]
    }
  ],
  "unassignedServices": [
    {
      "serviceId": "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
      "serviceName": "Pranie tapicerki",
      "isActive": true,
      "totals": { "orderCount": 6, "totalRevenueGross": 222500 }
    }
  ]
}
```

#### Błędy

| Kod | Kiedy |
|---|---|
| `400 Bad Request` | brakujące/nieprawidłowe parametry |
| `401 Unauthorized` | brak/wygasły token |
| `403 Forbidden` | brak uprawnień do statystyk warsztatu |

```json
{
  "error": "VALIDATION_ERROR",
  "message": "startDate must be before or equal to endDate",
  "field": "startDate"
}
```

---

### 3.2 `GET /v1/statistics/categories/{categoryId}` — BEZ ZMIAN

Używany wyłącznie gdy użytkownik kliknie kategorię, żeby wyświetlić jej wykres czasowy. Endpoint istnieje, **nie wymaga modyfikacji**.

```typescript
// Istniejąca odpowiedź — bez zmian
interface CategoryStatsResponse {
    categoryId: string;
    categoryName: string;
    granularity: Granularity;
    startDate: string;
    endDate: string;
    data: StatsDataPoint[];
    totals: StatsTotals;
}
```

---

### 3.3 `GET /v1/service-categories` — ZMIANA w response

Dodanie pola `serviceIds` do każdej kategorii eliminuje konieczność wywoływania `GET /v1/service-categories/{id}` tylko po to, żeby pobrać listę usług.

#### Response `200 OK` — dodane pole `serviceIds`

```typescript
interface CategoryListResponse {
    categories: CategoryListItem[];
}

interface CategoryListItem {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    isActive: boolean;
    serviceCount: number;
    serviceIds: string[];   // ← NOWE: ID usług przypisanych do kategorii
    createdAt: string;      // ISO 8601
    updatedAt: string;      // ISO 8601
}
```

**Parametr `includeInactive` zostaje usunięty z frontendu** — endpoint zawsze może zwracać wszystkie kategorie (aktywne i nieaktywne), frontend zignoruje nieaktywne. Parametr można zachować po stronie backendu dla przyszłych potrzeb, domyślnie `false`.

---

### 3.4 `POST /v1/service-categories/{categoryId}/services/{serviceId}` ★ NOWY

Przypisuje **pojedynczą usługę** do kategorii. Idempotentne — jeśli usługa już jest przypisana, zwraca `204` bez błędu.

```
POST /v1/service-categories/{categoryId}/services/{serviceId}
Authorization: Bearer {token}
```

Brak request body.

#### Response

| Kod | Kiedy |
|---|---|
| `204 No Content` | sukces (lub usługa już była przypisana) |
| `404 Not Found` | nieznane `categoryId` lub `serviceId` |
| `409 Conflict` | kategoria jest nieaktywna |

---

### 3.5 `DELETE /v1/service-categories/{categoryId}/services/{serviceId}` ★ NOWY

Odpina **pojedynczą usługę** od kategorii. Idempotentne — jeśli usługa nie była przypisana, zwraca `204`.

```
DELETE /v1/service-categories/{categoryId}/services/{serviceId}
Authorization: Bearer {token}
```

#### Response

| Kod | Kiedy |
|---|---|
| `204 No Content` | sukces |
| `404 Not Found` | nieznane `categoryId` lub `serviceId` |

---

### 3.6 `PUT /v1/service-categories/{categoryId}/services` — BEZ ZMIAN (zachowany)

Zastępuje całą listę usług kategorii naraz. Endpoint zostaje dla kompatybilności (używany np. przez modal zarządzania usługami). Frontend stopniowo przejdzie na granularne `POST`/`DELETE` powyżej.

---

## 4. Endpointy do deprecacji (po wdrożeniu frontendu)

Po aktualizacji frontendu poniższe endpointy nie będą wywoływane przez aplikację. Można je usunąć po upewnieniu się, że żaden inny klient ich nie używa.

| Endpoint | Zastąpiony przez |
|---|---|
| `GET /v1/statistics/overview` | `GET /v1/statistics/breakdown` |
| `GET /v1/statistics/services/{serviceId}` | `GET /v1/statistics/breakdown` |
| `GET /v1/statistics/unassigned-services` | `GET /v1/statistics/breakdown` |

> **Uwaga:** nie usuwać w ramach tego PR — najpierw wdrożyć backend, potem zaktualizować frontend, dopiero potem usunąć deprecated endpointy.

---

## 5. Endpointy bez zmian

| Endpoint | Status |
|---|---|
| `POST /v1/service-categories` | bez zmian |
| `PUT /v1/service-categories/{id}` | bez zmian |
| `DELETE /v1/service-categories/{id}` | bez zmian — przy usunięciu kategorii usługi automatycznie stają się nieprzypisane (soft delete) |
| `GET /v1/service-categories/{id}` | bez zmian — używany przez modal edycji |

---

## 6. Format pola `period` w `StatsDataPoint`

Pole `period` jest stringiem używanym bezpośrednio jako etykieta osi X wykresu. Backend musi formatować go zgodnie z granularity:

| `granularity` | Format | Przykład |
|---|---|---|
| `DAILY` | `YYYY-MM-DD` | `"2024-03-15"` |
| `WEEKLY` | `YYYY-Www` (ISO 8601) | `"2024-W11"` |
| `MONTHLY` | `YYYY-MM` | `"2024-03"` |
| `QUARTERLY` | `YYYY-Qq` | `"2024-Q1"` |
| `YEARLY` | `YYYY` | `"2024"` |

Punkty danych **muszą zawierać wszystkie okresy w zakresie** — nawet te z zerową sprzedażą. Frontend nie interpoluje brakujących punktów.

Przykład dla MONTHLY, zakres 2024-01-01 do 2024-03-31:
```json
[
  { "period": "2024-01", "orderCount": 12, "totalRevenueGross": 486000 },
  { "period": "2024-02", "orderCount": 0,  "totalRevenueGross": 0 },
  { "period": "2024-03", "orderCount": 9,  "totalRevenueGross": 361500 }
]
```

---

## 7. Wskazówki do implementacji `GET /v1/statistics/breakdown`

### 7.1 Strategia zapytań

Zalecane podejście: **2 zapytania SQL**, nie 2+N+M.

**Zapytanie 1 — szeregi czasowe dla overview:**
```sql
SELECT
    date_trunc(:granularity, o.completed_at) AS period,
    COUNT(DISTINCT o.id)                      AS order_count,
    SUM(oi.unit_price_gross * oi.quantity)    AS total_revenue_gross
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.studio_id    = :studioId
  AND o.status       = 'COMPLETED'
  AND o.completed_at >= :startDate
  AND o.completed_at <= :endDate
GROUP BY date_trunc(:granularity, o.completed_at)
ORDER BY period;
```

**Zapytanie 2 — sumy per usługa z przypisaniem do kategorii:**
```sql
SELECT
    sc.id            AS category_id,
    sc.name          AS category_name,
    sc.description   AS category_description,
    sc.color         AS category_color,
    s.id             AS service_id,
    s.name           AS service_name,
    s.is_active      AS service_is_active,
    COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN o.id END) AS order_count,
    COALESCE(SUM(oi.unit_price_gross * oi.quantity), 0)      AS total_revenue_gross
FROM services s
JOIN studios_services ss ON ss.service_id = s.id AND ss.studio_id = :studioId
LEFT JOIN service_category_assignments sca ON sca.service_id = s.id
LEFT JOIN service_categories sc
    ON sc.id = sca.category_id
    AND sc.is_active = true
    AND sc.studio_id = :studioId
LEFT JOIN order_items oi ON oi.service_id = s.id
LEFT JOIN orders o
    ON o.id          = oi.order_id
    AND o.studio_id  = :studioId
    AND o.status     = 'COMPLETED'
    AND o.completed_at >= :startDate
    AND o.completed_at <= :endDate
GROUP BY sc.id, sc.name, sc.description, sc.color, s.id, s.name, s.is_active;
```

> Nazwy tabel i kolumn są pseudokodem — dostosować do rzeczywistego schematu.

### 7.2 Agregacja wyników zapytania 2 po stronie aplikacji

Z zapytania 2 otrzymujesz płaską listę `(category, service, totals)`. Mapuj do struktury odpowiedzi:

```
row.category_id IS NULL  →  trafia do unassignedServices[]
row.category_id NOT NULL →  trafia do categories[category_id].services[]
```

Sumy kategorii (`categories[i].totals`) oblicz jako sumę totals ich usług — **nie osobnym zapytaniem**.

### 7.3 Uzupełnianie brakujących okresów (gap filling)

Zapytanie SQL zwróci tylko okresy z danymi. Musisz uzupełnić brakujące okresy wartościami zerowymi:

```
wygeneruj wszystkie okresy w zakresie [startDate, endDate] dla danej granularity
dla każdego okresu: jeśli brak w wynikach SQL → dodaj { period, orderCount: 0, totalRevenueGross: 0 }
posortuj rosnąco wg period
```

### 7.4 Indeksy do sprawdzenia

Zapytanie 2 powinno być szybkie przy poprawnych indeksach:

```sql
-- Kluczowe indeksy (jeśli nie istnieją — dodać)
CREATE INDEX IF NOT EXISTS idx_orders_studio_status_completed
    ON orders (studio_id, status, completed_at);

CREATE INDEX IF NOT EXISTS idx_order_items_service
    ON order_items (service_id, order_id);

CREATE INDEX IF NOT EXISTS idx_sca_service_id
    ON service_category_assignments (service_id);

CREATE INDEX IF NOT EXISTS idx_sca_category_id
    ON service_category_assignments (category_id);
```

### 7.5 Caching

Endpoint jest **read-only i deterministyczny** dla danych wejściowych — nadaje się do cache'owania po stronie serwera:

- Cache key: `{studioId}:{granularity}:{startDate}:{endDate}`
- TTL: 5–15 minut (dane historyczne nie zmieniają się często)
- Invalidacja: po każdym zakończeniu zlecenia (`status → COMPLETED`) i po każdej zmianie przypisania usług do kategorii

---

## 8. Zachowanie przy usunięciu kategorii (`DELETE /v1/service-categories/{id}`)

Backend powinien już to obsługiwać, ale warto potwierdzić:

1. Kategoria jest **dezaktywowana** (soft delete: `is_active = false`), **nie usuwana** fizycznie — zachowujemy historyczność danych
2. Wiersze w `service_category_assignments` dla tej kategorii są **usuwane** — usługi stają się nieprzypisane
3. Frontend po operacji pobierze nowy `/v1/statistics/breakdown` i zobaczy te usługi w `unassignedServices`

---

## 9. Kolejność wdrożenia

```
1. Backend implementuje GET /v1/statistics/breakdown
2. Backend dodaje serviceIds do GET /v1/service-categories
3. Backend dodaje POST i DELETE /v1/service-categories/{id}/services/{serviceId}
4. Testy integracyjne po stronie backendu
5. Frontend przełącza się na nowy kontrakt (osobny PR)
6. Po stabilizacji: usunięcie deprecated endpointów (osobny PR)
```

Kroki 1–3 można implementować równolegle w osobnych branchach — są od siebie niezależne.

---

## 10. Pytania i niejasności do wyjaśnienia

- [ ] Jak wygląda model danych dla przypisania usług do kategorii — tabela łącząca `service_category_assignments`? Czy jedna usługa może należeć do wielu kategorii? (Frontend zakłada jeden-do-jednej)
- [ ] Co oznacza `totalRevenueGross` — wartość pozycji zlecenia brutto? Czy uwzględniamy rabaty?
- [ ] Czy `completed_at` to data zakończenia zlecenia czy data wystawienia faktury?
- [ ] Jak obsługujemy zlecenia anulowane — czy liczymy je do statystyk?
- [ ] Jaka jest maksymalna liczba aktywnych usług w warsztacie? (wpływa na wydajność zapytania 2)
