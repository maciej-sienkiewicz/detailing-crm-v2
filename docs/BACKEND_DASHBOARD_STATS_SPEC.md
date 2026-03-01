# Specyfikacja zmian API — Dashboard Stats

## Endpoint

```
GET /api/v1/dashboard/stats
```

---

## Wymagane rozszerzenia odpowiedzi

### 1. `stats.abandonedLast30Days` — Porzucone rezerwacje (ostatnie 30 dni)

Pole dodane do obiektu `stats` w odpowiedzi endpointu.

**Definicja:** Liczba rezerwacji/wizyt ze statusem `abandoned` (porzucona) lub
`cancelled` (odwołana przez klienta bez reschedulingu) w ciągu ostatnich 30 dni
kalendarzowych, licząc od bieżącej daty.

**Typ:** `number` (liczba całkowita ≥ 0)

**Przykład rozszerzonej odpowiedzi:**

```json
{
  "stats": {
    "inProgress": 8,
    "overdue": 2,
    "readyForPickup": 3,
    "incomingToday": 5,
    "abandonedLast30Days": 7,
    "inProgressDetails": [...],
    "readyForPickupDetails": [...],
    "incomingTodayDetails": [...]
  },
  "revenue": { ... },
  "callActivity": { ... },
  "instagramPhotos": { ... },
  "recentCalls": [...],
  "googleReviews": { ... }
}
```

**Logika zliczania (sugerowana implementacja):**

```sql
SELECT COUNT(*) AS abandonedLast30Days
FROM reservations
WHERE status IN ('abandoned', 'cancelled_by_customer')
  AND updated_at >= NOW() - INTERVAL '30 days';
```

Alternatywnie, jeżeli statusy są inne — zliczaj wizyty spełniające warunek:
- klient potwierdził rezerwację (lub był w kolejce do potwierdzenia)  
- wizyta **nie doszła do skutku** bez reschedulingu w ciągu 30 dni
- brak faktury / brak statusu `completed` / `in_progress`

---

### 2. `instagramPhotos` — Aktywność na Instagramie (tydzień do tygodnia)

Nowy klucz na poziomie głównym odpowiedzi (obok `revenue`, `callActivity`).

**Typ:** Obiekt `BusinessMetric`:

```typescript
interface BusinessMetric {
  currentValue: number;   // liczba postów w bieżącym tygodniu (pon–ndz)
  previousValue: number;  // liczba postów w poprzednim tygodniu (pon–ndz)
  deltaPercentage: number; // ((current - previous) / previous) * 100, zaokr. do 2 miejsc
  unit: 'posts';
}
```

**Przykład:**

```json
"instagramPhotos": {
  "currentValue": 14,
  "previousValue": 9,
  "deltaPercentage": 55.56,
  "unit": "posts"
}
```

**Źródło danych:** Instagram Basic Display API lub Instagram Graph API.
- Filtruj po `media_type = IMAGE | CAROUSEL_ALBUM | VIDEO`
- Zakres czasu: bieżący tydzień ISO (poniedziałek 00:00 – niedziela 23:59 UTC)
- Poprzedni tydzień: poniedziałek 00:00 – niedziela 23:59 UTC tygodnia -1

Jeśli integracja z Instagramem nie jest dostępna, endpoint może zwrócić `null`
lub pominąć klucz — frontend obsłuży brakujące dane.

---

## Istniejące pola `stats` (bez zmian)

| Pole | Typ | Opis |
|------|-----|------|
| `inProgress` | `number` | Wizyty aktualnie realizowane |
| `overdue` | `number?` | Wizyty po terminie realizacji |
| `readyForPickup` | `number` | Gotowe do odbioru przez klienta |
| `incomingToday` | `number` | Umówione wizyty dzisiaj |
| `inProgressDetails` | `VisitDetail[]` | Szczegóły wizyt w realizacji |
| `readyForPickupDetails` | `VisitDetail[]` | Szczegóły gotowych wizyt |
| `incomingTodayDetails` | `VisitDetail[]` | Szczegóły dzisiejszych wizyt |

---

## Frontend — status integracji

Frontend jest gotowy i oczekuje tych pól w odpowiedzi API:

- `stats.abandonedLast30Days` → wyświetlany w czerwonym kafelku KPI na dashboardzie
- `instagramPhotos` → wyświetlany jako 3. karta metryk (obok przychodów i połączeń)

Jeśli pole `instagramPhotos` nie istnieje w odpowiedzi, kafelek nie zostanie wyświetlony
(opcjonalne pole z `?` w TypeScript).
