# Kontrakt API – Ujednolicony endpoint wydarzeń kalendarza

> **Wersja:** 1.0
> **Data:** 2026-04-19
> **Kontekst:** Zastępuje wzorzec N-zapytań-per-status stosowany dotychczas przez frontend
> **Frontend trigger:** `calendarApi.ts` → flaga `USE_UNIFIED_CALENDAR_API = true`

---

## Problem, który rozwiązujemy

Frontend kalendarza wykonywał dotychczas **8 oddzielnych zapytań HTTP** przy każdym załadowaniu widoku:

```
GET /v1/appointments?status=CREATED
GET /v1/appointments?status=ABANDONED
GET /v1/appointments?status=CANCELLED
GET /visits?status=IN_PROGRESS
GET /visits?status=READY_FOR_PICKUP
GET /visits?status=COMPLETED
GET /visits?status=REJECTED
GET /visits?status=ARCHIVED
```

Nowy endpoint redukuje to do **1 zapytania**, pozwalając backendowi zoptymalizować query (np. `WHERE status IN (...)` zamiast 8 osobnych selectów).

---

## Nowy endpoint

### `GET /v1/calendar/events`

Zwraca rezerwacje i wizyty z podanego zakresu dat, filtrowane po statusach.

---

## Parametry zapytania

| Parametr | Typ | Wymagany | Opis |
|---|---|---|---|
| `startDate` | `string` (ISO 8601) | **TAK** | Początek zakresu dat (włącznie) |
| `endDate` | `string` (ISO 8601) | **TAK** | Koniec zakresu dat (włącznie) |
| `appointmentStatuses` | `string` (wartości oddzielone przecinkiem) | NIE | Statusy rezerwacji do uwzględnienia. Pominięcie → wszystkie statusy. Pusta wartość → brak rezerwacji. |
| `visitStatuses` | `string` (wartości oddzielone przecinkiem) | NIE | Statusy wizyt do uwzględnienia. Pominięcie → wszystkie statusy. Pusta wartość → brak wizyt. |

### Dozwolone wartości `appointmentStatuses`

| Wartość | Opis |
|---|---|
| `CREATED` | Rezerwacja aktywna, oczekuje na realizację |
| `ABANDONED` | Porzucona (klient nie przyjechał) |
| `CANCELLED` | Anulowana przez administratora |

### Dozwolone wartości `visitStatuses`

| Wartość | Opis |
|---|---|
| `IN_PROGRESS` | Wizyta w trakcie realizacji |
| `READY_FOR_PICKUP` | Gotowe do odbioru |
| `COMPLETED` | Zakończona |
| `REJECTED` | Odrzucona |
| `ARCHIVED` | Zarchiwizowana |

### Przykłady zapytań

```
# Kalendarz z domyślnymi filtrami (wszystko)
GET /v1/calendar/events?startDate=2026-03-30T00:00:00%2B02:00&endDate=2026-05-11T00:00:00%2B02:00&appointmentStatuses=CREATED,ABANDONED,CANCELLED&visitStatuses=IN_PROGRESS,READY_FOR_PICKUP,COMPLETED,REJECTED,ARCHIVED

# Tylko aktywne rezerwacje i wizyty w toku
GET /v1/calendar/events?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z&appointmentStatuses=CREATED&visitStatuses=IN_PROGRESS,READY_FOR_PICKUP

# Tylko wizyty, bez rezerwacji
GET /v1/calendar/events?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z&visitStatuses=IN_PROGRESS,COMPLETED
```

---

## Response

### HTTP 200 OK

```json
{
  "appointments": [ /* AppointmentCalendarItem[] */ ],
  "visits":        [ /* VisitCalendarItem[] */ ]
}
```

Obie tablice mogą być puste `[]`. Nigdy `null`.

---

### Schemat: `AppointmentCalendarItem`

```json
{
  "id":               "uuid",
  "appointmentTitle": "Oklejanie PPF | null",
  "customerId":       "uuid",
  "vehicleId":        "uuid | null",
  "status":           "CREATED | ABANDONED | CANCELLED",
  "customer": {
    "firstName": "Jan",
    "lastName":  "Kowalski",
    "phone":     "+48 123 456 789",
    "email":     "jan@example.com"
  },
  "vehicle": {
    "brand":        "BMW",
    "model":        "X5",
    "year":         2021,
    "licensePlate": "WA 12345"
  },
  "services": [
    {
      "id":             "uuid",
      "serviceId":      "uuid",
      "serviceName":    "Oklejanie PPF – cały przód",
      "basePriceNet":   400000,
      "vatRate":        23,
      "finalPriceNet":  400000,
      "finalPriceGross":492000
    }
  ],
  "schedule": {
    "isAllDay":      false,
    "startDateTime": "2026-04-21T09:00:00+02:00",
    "endDateTime":   "2026-04-21T15:00:00+02:00"
  },
  "appointmentColor": {
    "id":       "uuid",
    "name":     "Czerwony",
    "hexColor": "#ef4444"
  },
  "totalNet":   495000,
  "totalGross": 608850,
  "totalVat":   113850,
  "note":       "Proszę użyć matowej folii | null"
}
```

#### Pola wymagane / opcjonalne

| Pole | Wymagane | Uwagi |
|---|---|---|
| `id` | TAK | UUID rezerwacji |
| `customerId` | TAK | UUID klienta (potrzebne do nawigacji `/customers/{id}`) |
| `vehicleId` | NIE | `null` jeśli brak pojazdu |
| `appointmentTitle` | NIE | `null` jeśli brak tytułu |
| `vehicle` | NIE | `null` jeśli brak pojazdu |
| `note` | NIE | `null` jeśli brak notatki |
| `services` | TAK | Może być `[]` |
| `appointmentColor` | TAK | Wymagane do renderowania koloru w kalendarzu |

---

### Schemat: `VisitCalendarItem`

```json
{
  "id":          "uuid",
  "title":       "PPF + Ceramika | null",
  "visitNumber": "VIS-2026-0042",
  "customerId":  "uuid",
  "vehicleId":   "uuid",
  "status":      "IN_PROGRESS",
  "scheduledDate":            "2026-04-21T08:00:00+02:00",
  "estimatedCompletionDate":  "2026-04-23T17:00:00+02:00",
  "customer": {
    "firstName":   "Jan",
    "lastName":    "Kowalski",
    "phone":       "+48 123 456 789",
    "companyName": "Kowalski Sp. z o.o. | null"
  },
  "vehicle": {
    "licensePlate":    "WA 12345",
    "brand":           "BMW",
    "model":           "X5",
    "yearOfProduction": 2021
  },
  "appointmentColor": {
    "id":       "uuid",
    "name":     "Niebieski",
    "hexColor": "#3b82f6"
  },
  "totalNet":       495000,
  "totalGross":     608850,
  "technicalNotes": "Uszkodzenie na lewym błotniku | null"
}
```

#### Pola wymagane / opcjonalne

| Pole | Wymagane | Uwagi |
|---|---|---|
| `id` | TAK | UUID wizyty |
| `customerId` | TAK | UUID klienta |
| `vehicleId` | TAK | UUID pojazdu |
| `title` | NIE | `null` jeśli brak tytułu |
| `appointmentColor` | NIE | `null` → frontend użyje koloru ze statusu |
| `technicalNotes` | NIE | `null` jeśli brak notatek |

---

## Kody błędów

| Kod | Sytuacja |
|---|---|
| `400 Bad Request` | Brak `startDate`/`endDate`, nieprawidłowy format daty, nieznana wartość statusu |
| `401 Unauthorized` | Brak lub nieważny token |
| `500 Internal Server Error` | Błąd serwera |

### Przykładowe body błędu `400`

```json
{
  "error": "INVALID_STATUS_VALUE",
  "message": "Unknown appointmentStatus: 'PENDING'. Allowed: CREATED, ABANDONED, CANCELLED",
  "field": "appointmentStatuses"
}
```

---

## Wymagania wydajnościowe

- Backend powinien realizować zapytanie jednym SQL-em z klauzulą `WHERE status IN (...)` dla każdego z typów (appointments, visits), **nie** przez N osobnych selectów.
- Docelowy czas odpowiedzi przy pełnym zakresie 6 tygodni i wszystkich statusach: **< 200 ms** (p95).
- Endpoint powinien honorować ten sam mechanizm paginacji co istniejące endpointy (jeśli zbiór jest duży), jednak dla kalendarza przyjmujemy, że zakres 6–8 tygodni zwraca rozsądną liczbę rekordów bez paginacji.

---

## Uwagi implementacyjne dla backendu

1. **Parsowanie parametru `appointmentStatuses`:** split po `,`, trim whitespace, walidacja każdej wartości — odpowiedź `400` jeśli nieznana.
2. **Brak parametru `appointmentStatuses`** → zwróć wszystkie statusy (nie filtruj).
3. **Pusta wartość `appointmentStatuses=`** → zwróć pustą tablicę `appointments: []`.
4. **Filtrowanie dat:** `scheduledDate` (wizyty) i `schedule.startDateTime` (rezerwacje) powinny przecinać się z zakresem `[startDate, endDate]`. Zalecany predykat: `startDateTime < endDate AND endDateTime > startDate`.
5. **Uprawnienia:** endpoint zwraca tylko dane dla zalogowanego tenanta (multi-tenancy bez zmian).

---

## Migracja

Frontend posiada flagę `USE_UNIFIED_CALENDAR_API` w `src/modules/calendar/api/calendarApi.ts`:

```typescript
// Flip to true once backend deploys /v1/calendar/events
const USE_UNIFIED_CALENDAR_API = true;
```

Przy `false` — używa starego wzorca N zapytań (wsteczna kompatybilność).  
Przy `true` — używa nowego unified endpointu.

**Procedura wdrożenia:**
1. Backend implementuje i deployuje `GET /v1/calendar/events`
2. Frontend ustawia flagę na `true` (już ustawiona — wymaga tylko deploy frontendu po deploy backendu)
3. Monitorujemy logi — fallback możliwy przez zmianę flagi

---

## Porównanie: przed i po

| | Przed | Po |
|---|---|---|
| Liczba requestów (pełne filtry) | **8** | **1** |
| Liczba requestów (3 statusy apt + 2 wizyty) | **5** | **1** |
| Overhead sieci | 8× handshake, 8× nagłówki | 1× handshake, 1× nagłówki |
| Możliwość optymalizacji backendowej | Nie (8 osobnych queries) | Tak (1 query z `IN (...)`) |
| Czas do pierwszego eventu | ~100ms (parallel, ale wolniejszy) | ~60–80ms (szacowany) |
