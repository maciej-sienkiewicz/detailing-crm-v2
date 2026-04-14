# Ewidencja czasu pracy — kontrakt API

**Adresaci:** zespół backendowy  
**Status:** do implementacji  
**Moduł frontendowy:** `src/modules/employees/components/WorkTimeTab/`

---

## 1. Kontekst i przepływ użytkownika

Zakładka **„Czas pracy"** w widoku szczegółów pracownika pozwala na:

1. Przegląd listy miesięcy (od daty zatrudnienia do bieżącego miesiąca) z sumą godzin i statusem każdego okresu.
2. Rozwinięcie dowolnego miesiąca — siatka dzienna (wiersze: godziny regularne + wiersz na każdy typ świadczenia).
3. Edycję wpisów i zapisanie całego miesiąca jako jedną atomową operację.
4. Usunięcie konkretnego wpisu świadczenia ze statusem `PENDING`.

```
WorkTimeTab (lista miesięcy)
  └─ GET /v1/employees/{id}/worktime/periods        ← sumy + statusy
  
MonthDetail (siatka dni po rozwinięciu miesiąca)
  └─ GET /v1/employees/{id}/worktime?from=&to=      ← wpisy w zakresie dat
  └─ PUT /v1/employees/{id}/worktime/periods/{period} ← zapis całego miesiąca
  └─ DELETE /v1/employees/{id}/worktime/{entryId}   ← usuń pojedynczy wpis
```

---

## 2. Typy wspólne

```typescript
// Status miesiąca (arkusza)
type TimesheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED';

// Typ wpisu (typ wiersza w siatce)
type WorkTimeEntryType =
    | 'REGULAR'       // zwykłe godziny pracy
    | 'OVERTIME_150'  // nadgodziny ×1,5
    | 'OVERTIME_200'  // nadgodziny ×2,0
    | 'NIGHT_WORK'    // praca nocna (21:00–7:00)
    | 'HOLIDAY_WORK'; // praca w święto ×2,0

// Typ świadczenia (podzbiór WorkTimeEntryType — bez REGULAR)
// Używany w payloadzie zapisu; zawiera dodatkowo ON_CALL
type BenefitType =
    | 'OVERTIME_150'
    | 'OVERTIME_200'
    | 'NIGHT_WORK'
    | 'HOLIDAY_WORK'
    | 'ON_CALL';      // ⚠️ patrz uwaga §7.1

// Status wpisu
type WorkTimeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
```

---

## 3. Endpoint: lista okresów

### `GET /v1/employees/{employeeId}/worktime/periods`

Zwraca zagregowane podsumowanie dla każdego miesiąca, w którym pracownik ma co najmniej jeden wpis. Miesiące bez wpisów nie muszą być zwracane — frontend domyślnie wyświetla dla nich `0,00 h` i status `DRAFT`.

#### Parametry ścieżki

| Parametr | Typ | Opis |
|---|---|---|
| `employeeId` | `string (UUID)` | identyfikator pracownika |

#### Response `200 OK`

```typescript
type GetWorkTimePeriodsResponse = WorkTimePeriodSummary[];

interface WorkTimePeriodSummary {
    period: string;       // format YYYY-MM, np. "2026-04"
    totalHours: number;   // suma effectiveHours wszystkich wpisów w miesiącu (decimal)
    status: TimesheetStatus;
}
```

**Przykład:**
```json
[
  { "period": "2026-04", "totalHours": 160.0, "status": "DRAFT" },
  { "period": "2026-03", "totalHours": 176.5, "status": "APPROVED" },
  { "period": "2026-02", "totalHours": 0.0,   "status": "DRAFT" }
]
```

#### Kody odpowiedzi

| Kod | Opis |
|---|---|
| `200` | lista podsumowań (może być pusta `[]`) |
| `404` | pracownik o danym `employeeId` nie istnieje |

#### Uwagi

- Wyniki powinny być posortowane **malejąco** po `period` (najnowszy miesiąc pierwszy).
- `totalHours` to suma **wszystkich** typów wpisów (REGULAR + wszystkie świadczenia) za dany miesiąc.
- Frontend generuje listę miesięcy samodzielnie po stronie klienta (od `hireDate` do dzisiaj) i uzupełnia ją danymi z tego endpointu. Miesiące nieobecne w odpowiedzi wyświetlają `0,00 h` i status `DRAFT`.

---

## 4. Endpoint: lista wpisów w zakresie dat

### `GET /v1/employees/{employeeId}/worktime`

Zwraca płaską listę wpisów czasu pracy w podanym zakresie dat. Wywoływany przy rozwinięciu wiersza konkretnego miesiąca.

#### Parametry ścieżki

| Parametr | Typ | Opis |
|---|---|---|
| `employeeId` | `string (UUID)` | identyfikator pracownika |

#### Parametry zapytania

| Parametr | Typ | Wymagany | Opis |
|---|---|---|---|
| `from` | `string (YYYY-MM-DD)` | nie | pierwsza data zakresu (włącznie) |
| `to` | `string (YYYY-MM-DD)` | nie | ostatnia data zakresu (włącznie) |

Frontend zawsze wysyła oba parametry: `from=YYYY-MM-01&to=YYYY-MM-{ostatni dzień}`.

#### Response `200 OK`

```typescript
type GetWorkTimeResponse = WorkTimeEntry[];

interface WorkTimeEntry {
    id: string;              // UUID wpisu
    date: string;            // YYYY-MM-DD
    effectiveHours: number;  // liczba godzin (decimal, np. 8.0 lub 7.5)
    entryType: WorkTimeEntryType;
    status: WorkTimeStatus;
    notes: string | null;
}
```

**Przykład:**
```json
[
  { "id": "e1a2b3c4-...", "date": "2026-04-01", "effectiveHours": 8.0,  "entryType": "REGULAR",      "status": "PENDING",  "notes": null },
  { "id": "e2b3c4d5-...", "date": "2026-04-01", "effectiveHours": 2.5,  "entryType": "OVERTIME_150", "status": "PENDING",  "notes": null },
  { "id": "e3c4d5e6-...", "date": "2026-04-02", "effectiveHours": 8.0,  "entryType": "REGULAR",      "status": "APPROVED", "notes": null }
]
```

#### Kody odpowiedzi

| Kod | Opis |
|---|---|
| `200` | lista wpisów (może być pusta `[]`) |
| `400` | nieprawidłowy format `from`/`to` |
| `404` | pracownik nie istnieje |

#### Uwagi

- Dla tego samego `date` + `entryType` może istnieć **więcej niż jeden wpis** (jeśli np. pracownik miał dwie sesje). Frontend sumuje `effectiveHours` po stronie klienta na potrzeby wyświetlania w siatce.
- Wpisy z `status = APPROVED` lub `REJECTED` są wyświetlane jako **read-only** w siatce (frontend blokuje ich edycję).

---

## 5. Endpoint: atomowy zapis miesiąca

### `PUT /v1/employees/{employeeId}/worktime/periods/{period}`

Atomowo **zastępuje** wszystkie wpisy ze statusem `PENDING` dla danego miesiąca dostarczonymi danymi. Wpisy z `status = APPROVED` lub `REJECTED` pozostają **bez zmian**.

#### Parametry ścieżki

| Parametr | Typ | Opis |
|---|---|---|
| `employeeId` | `string (UUID)` | identyfikator pracownika |
| `period` | `string (YYYY-MM)` | miesiąc, np. `"2026-04"` |

#### Request body

```typescript
interface SavePeriodPayload {
    regular: SavePeriodRegularEntry[];
    benefits: SavePeriodBenefitEntry[];
}

interface SavePeriodRegularEntry {
    date: string;   // YYYY-MM-DD — musi należeć do podanego period
    hours: number;  // > 0; wpisy z hours = 0 nie są wysyłane przez frontend
}

interface SavePeriodBenefitEntry {
    date: string;       // YYYY-MM-DD — musi należeć do podanego period
    benefitType: BenefitType;
    hours: number;      // > 0
}
```

**Przykład:**
```json
{
  "regular": [
    { "date": "2026-04-01", "hours": 8.0 },
    { "date": "2026-04-02", "hours": 8.0 },
    { "date": "2026-04-03", "hours": 7.5 }
  ],
  "benefits": [
    { "date": "2026-04-01", "benefitType": "OVERTIME_150", "hours": 2.0 }
  ]
}
```

#### Semantyka operacji

Backend powinien wykonać następujące kroki w ramach **jednej transakcji**:

1. Pobierz wszystkie istniejące wpisy dla pracownika w danym miesiącu z `status = PENDING`.
2. **Usuń** te wpisy, które nie mają odpowiednika w payloadzie (usunięte przez użytkownika).
3. **Utwórz lub zastąp** wpisy dostarczone w payloadzie:
   - Dla `regular`: jeden wpis `entryType = REGULAR` na każdą podaną datę.
   - Dla `benefits`: jeden wpis odpowiedniego `entryType` na każdą kombinację `date + benefitType`.
4. Wpisów z `status ≠ PENDING` (APPROVED, REJECTED) **nie dotykaj**.

#### Kody odpowiedzi

| Kod | Opis |
|---|---|
| `204` | zapisano pomyślnie, brak body |
| `400` | nieprawidłowy format daty lub `hours ≤ 0` |
| `404` | pracownik nie istnieje |
| `409` | próba modyfikacji okresu o statusie `APPROVED` (cały miesiąc zatwierdzony) |
| `422` | daty z payloadu nie należą do podanego `period` |

#### Uwagi

- Frontend wysyła **tylko wpisy z `hours > 0`**. Brak daty w payloadzie = usunięcie istniejącego PENDING wpisu dla tej daty.
- Pole `notes` nie jest aktualnie obsługiwane przez frontend (możliwa przyszła rozbudowa) — przy tworzeniu wpisów ustaw `null`.
- `effectiveHours` przechowywane jest bezpośrednio jako dostarczone `hours` (bez obliczeń ze strony backendu na tym etapie).

---

## 6. Endpoint: usunięcie pojedynczego wpisu

### `DELETE /v1/employees/{employeeId}/worktime/{entryId}`

Usuwa wskazany wpis czasu pracy. Wywoływany z widoku listy świadczeń (sekcja „Świadczenia" pod siatką), tylko dla wpisów ze statusem `PENDING`.

#### Parametry ścieżki

| Parametr | Typ | Opis |
|---|---|---|
| `employeeId` | `string (UUID)` | identyfikator pracownika |
| `entryId` | `string (UUID)` | identyfikator wpisu do usunięcia |

#### Kody odpowiedzi

| Kod | Opis |
|---|---|
| `204` | usunięto pomyślnie, brak body |
| `403` | próba usunięcia wpisu z `status = APPROVED` lub `REJECTED` |
| `404` | pracownik lub wpis nie istnieje, albo wpis nie należy do tego pracownika |

#### Uwagi

- Frontend wyświetla przycisk „Usuń" wyłącznie dla wpisów z `status = PENDING`. Backend powinien jednak egzekwować tę regułę niezależnie.
- Dotyczy wyłącznie wpisów **niebędących** wpisami regularnymi w siatce (frontend pokazuje ten przycisk tylko dla wpisów świadczeń w sekcji poniżej siatki).

---

## 7. Dodatkowe uwagi i nieścisłości do wyjaśnienia

### 7.1 Niezgodność `ON_CALL` między typami

Aktualnie w kodzie frontendowym zachodzi następująca niezgodność:

| Miejsce | Zawiera `ON_CALL`? |
|---|---|
| `BenefitType` (wysyłany w payloadzie PUT) | **tak** |
| Modal „Dodaj świadczenie" (`AddBenefitModal`) | **tak** — widoczny dla użytkownika |
| Filtr pobieranych wpisów (`BENEFIT_ENTRY_TYPES` w `MonthDetail`) | **nie** |
| `WorkTimeEntryType` (używany w odpowiedzi GET) | **nie** |

**Skutek:** użytkownik może dodać wiersz `ON_CALL` w siatce i wysłać go przez PUT, ale przy kolejnym wczytaniu miesiąca wpis **nie pojawi się** w siatce (jest filtrowany po stronie klienta).

**Prośba:** ustalenie wspólnie z zespołem frontendowym, czy `ON_CALL` ma być:
- a) **pełnoprawnym typem wpisu** — wówczas dodać `ON_CALL` do `WorkTimeEntryType` i filtra,
- b) **osobną encją** (np. harmonogramem dyżurów) obsługiwaną innym endpointem,
- c) **usuniętym** z opcji modalu do czasu wyjaśnienia.

Do czasu rozstrzygnięcia rekomendujemy, żeby backend **akceptował** `ON_CALL` w payloadzie PUT i zwracał go w odpowiedzi GET (jako dowolny `entryType`).

### 7.2 Brak mechanizmu `SUBMITTED`

Frontend wyświetla status `SUBMITTED` ("Złożony") w liście miesięcy, ale **nie ma przycisku ani akcji**, która zmieniałaby status miesiąca. Przejście `DRAFT → SUBMITTED → APPROVED` nie jest aktualnie dostępne w UI.

**Prośba:** potwierdzenie, czy endpoint zatwierdzania okresu (np. `POST /v1/employees/{id}/worktime/periods/{period}/approve`) jest potrzebny w bieżącym zakresie, czy odkładamy na kolejną iterację.

### 7.3 Brak zarządzania statusem okresu z poziomu frontendowego

Aktualnie `TimesheetStatus` jest **tylko odczytywany** (wyświetlany w tabeli). Frontend blokuje edycję siatki gdy `status === 'APPROVED'`. Brak jest przycisku „zatwierdź miesiąc" ani „cofnij do szkicu".

---

## 8. Podsumowanie endpointów

| Metoda | URL | Opis |
|---|---|---|
| `GET` | `/v1/employees/{id}/worktime/periods` | lista podsumowań miesięcy |
| `GET` | `/v1/employees/{id}/worktime?from=&to=` | wpisy w zakresie dat |
| `PUT` | `/v1/employees/{id}/worktime/periods/{period}` | atomowy zapis miesiąca |
| `DELETE` | `/v1/employees/{id}/worktime/{entryId}` | usunięcie pojedynczego wpisu |
