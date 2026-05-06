# Specyfikacja API — Dashboard Reservation Summary

## Endpoint

```
GET /api/v1/dashboard/reservation-summary?weeks=13
```

### Parametry zapytania

| Parametr | Typ     | Domyślnie | Opis                                           |
|----------|---------|-----------|------------------------------------------------|
| `weeks`  | integer | `13`      | Liczba tygodni wstecz do uwzględnienia w bucketach (≥ 1) |

---

## Cel biznesowy

Endpoint pozwala śledzić, jak w danym tygodniu lub dniu radzimy sobie z pozyskiwaniem nowych rezerwacji. Dane te umożliwiają wyciąganie wniosków, takich jak:

- „W 10. dniu miesiąca często jest wzmożony ruch — może warto wtedy puścić kampanię adsową lub zadbać o Instagram?"
- „W tym tygodniu salon nie przyjął żadnych rezerwacji — gdzie popełniliśmy błąd?"

---

## Odpowiedź

### HTTP 200 OK

```json
{
  "currentWeek": { "count": 7 },
  "previousWeek": { "count": 4 },
  "deltaPercentage": 75.0,
  "buckets": [
    { "weekStart": "2025-11-03", "count": 2 },
    { "weekStart": "2025-11-10", "count": 5 },
    { "weekStart": "2025-11-17", "count": 3 },
    { "weekStart": "2025-11-24", "count": 6 },
    { "weekStart": "2025-12-01", "count": 4 },
    { "weekStart": "2025-12-08", "count": 8 },
    { "weekStart": "2025-12-15", "count": 3 },
    { "weekStart": "2025-12-22", "count": 1 },
    { "weekStart": "2025-12-29", "count": 5 },
    { "weekStart": "2026-01-05", "count": 7 },
    { "weekStart": "2026-01-12", "count": 4 },
    { "weekStart": "2026-01-19", "count": 4 },
    { "weekStart": "2026-01-26", "count": 7 }
  ]
}
```

### Schemat TypeScript (frontend)

```typescript
interface DashboardReservationBucket {
  weekStart: string;  // ISO date, poniedziałek danego tygodnia (YYYY-MM-DD)
  count: number;      // liczba rezerwacji w tym tygodniu (≥ 0)
}

interface DashboardReservationSummary {
  currentWeek:    { count: number };
  previousWeek:   { count: number };
  deltaPercentage: number;  // ((current - previous) / previous) * 100, zaokr. do 1 miejsca
  buckets:        DashboardReservationBucket[];
}
```

---

## Logika backendowa

### Definicja „rezerwacji"

Zliczamy rekordy ze statusem wskazującym na **nową, zaplanowaną rezerwację** (nie odwołaną, nie porzuconą):

```sql
SELECT
  DATE_TRUNC('week', created_at)::date AS week_start,
  COUNT(*)                             AS count
FROM appointments
WHERE
  studio_id   = :studioId
  AND status  IN ('CREATED', 'CONFIRMED')
  AND created_at >= DATE_TRUNC('week', NOW()) - INTERVAL ':weeks weeks'
GROUP BY week_start
ORDER BY week_start;
```

> **Uwaga:** Użyj `created_at` (data złożenia rezerwacji), **nie** `scheduled_date` (data wizyty).  
> Celem jest śledzenie *aktywności sprzedażowej*, a nie *obłożenia kalendarza*.

### Obliczanie `deltaPercentage`

```
delta = ((currentWeek.count - previousWeek.count) / previousWeek.count) * 100
```

Jeśli `previousWeek.count == 0`:
- zwróć `deltaPercentage: 0` (lub `100` jeśli `currentWeek.count > 0` — do uzgodnienia)

### `currentWeek` i `previousWeek`

- `currentWeek` = bieżący tydzień ISO (poniedziałek 00:00 UTC — niedziela 23:59 UTC)
- `previousWeek` = poprzedni tydzień ISO

Są to wartości identyczne z dwoma ostatnimi bucketami, ale zwracane osobno dla wygody frontendu.

### Obsługa brakujących tygodni

Jeśli w danym tygodniu nie było żadnych rezerwacji, bucket powinien i tak pojawić się w odpowiedzi z `count: 0`. Zapobiega to „dziurom" na wykresie słupkowym.

---

## Handler — struktura kodu (sugestia)

```
dashboard/reservationsummary/
├── GetDashboardReservationSummaryCommand.ts   — { studioId, weeks }
├── GetDashboardReservationSummaryResult.ts    — { currentWeek, previousWeek, deltaPercentage, buckets }
└── GetDashboardReservationSummaryHandler.ts   — logika grupowania per tydzień
```

---

## Frontend — status integracji

Frontend jest gotowy i oczekuje danych z tego endpointu:

- **`ReservationsKpiCard`** (`src/modules/dashboard/components/ReservationsKpiCard.tsx`) — wyświetla liczbę rezerwacji w bieżącym tygodniu, deltę procentową i wykres słupkowy (hover popover) za ostatnie 13 tygodni
- Karta jest umieszczona w nagłówku dashboardu **pod kartą przychodu** (`RevenueKpiCard`), w tej samej kolumnie po prawej stronie hero bana
- Hook: `useDashboardReservations(weeks = 13)` w `src/modules/dashboard/hooks/useDashboardReservations.ts`

Jeśli endpoint zwróci błąd lub `null`, karta po prostu nie wyrenderuje się (graceful degradation).
