# Specyfikacja endpointu — eksport klientów CSV

## `GET /v1/customers/export`

Zwraca plik CSV ze wszystkimi klientami pasującymi do podanych filtrów.
Akceptuje dokładnie te same parametry co `GET /v1/customers` z wyjątkiem `page` i `limit`.

---

## Parametry zapytania

| Parametr             | Typ      | Opis                                           |
|----------------------|----------|------------------------------------------------|
| `search`             | string   | Wyszukiwanie pełnotekstowe (imię, nazwisko, NIP)|
| `sortBy`             | string   | Pole sortowania (domyślnie: `lastName`)        |
| `sortDirection`      | string   | `asc` / `desc` (domyślnie: `asc`)              |
| `customerType`       | string   | `individual` / `business`                      |
| `services`           | string[] | IDs usług (wielokrotny parametr)               |
| `lastVisitWithinDays`| number   | Klienci, którzy byli w ciągu N dni             |
| `notVisitedSinceDays`| number   | Klienci nieobecni od N dni                     |
| `vehicleBrand`       | string   | Marka pojazdu                                  |
| `vehicleModel`       | string   | Model pojazdu                                  |
| `minRevenue`         | number   | Minimalny przychód brutto (grosze)             |
| `maxRevenue`         | number   | Maksymalny przychód brutto (grosze)            |
| `minVisits`          | number   | Minimalna liczba wizyt                         |
| `maxVisits`          | number   | Maksymalna liczba wizyt                        |

---

## Odpowiedź (sukces)

```
HTTP 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="klienci-2025-01-15.csv"
Transfer-Encoding: chunked
X-Export-Count: 1234
```

Treść: strumień CSV z nagłówkiem BOM (`\xEF\xBB\xBF`), pierwsza linia to nagłówki kolumn.

### Kolumny CSV

```
ID,Imię,Nazwisko,Email,Telefon,Typ,NIP,Firma,Liczba wizyt,Ostatnia wizyta,Przychód brutto (PLN),Liczba pojazdów,Data rejestracji
```

---

## Odpowiedzi błędów

| Status | Kiedy                                                          |
|--------|----------------------------------------------------------------|
| `422`  | Wynik zapytania przekracza 10 000 rekordów                    |
| `429`  | Rate limit: jeden eksport na użytkownika/tenant na 30 sekund  |
| `401`  | Brak sesji                                                     |

```json
{ "message": "Zawęź filtry — wynik zawiera 15 432 rekordy (limit: 10 000)" }
```

---

## Jak to zaimplementować, żeby nie ubić serwera

### Problem

Naiwna implementacja:
```sql
SELECT * FROM customers WHERE ... -- może zwrócić 50 000 wierszy
```
→ ładuje wszystko do pamięci RAM, blokuje connection pool, zajmuje CPU do serializacji JSON/CSV.

### Rozwiązanie: streaming + chunking

#### 1. Pre-flight COUNT (przed rozpoczęciem streamu)

```sql
SELECT COUNT(*) FROM customers c
LEFT JOIN ... -- te same JOINy co w głównym zapytaniu
WHERE ... -- te same warunki
```

Jeśli `COUNT > 10_000` → zwróć `422` natychmiast. To szybkie zapytanie (korzysta z indeksów).

#### 2. Nagłówki HTTP ustawiane od razu

```js
res.setHeader('Content-Type', 'text/csv; charset=utf-8');
res.setHeader('Content-Disposition', `attachment; filename="klienci-${date}.csv"`);
res.setHeader('Transfer-Encoding', 'chunked');
res.write('\xEF\xBB\xBF'); // UTF-8 BOM dla Excela
res.write('ID,Imię,Nazwisko,...\n'); // nagłówek CSV
```

#### 3. Chunked fetch z bazy (porcje po 500 wierszy)

```js
const CHUNK = 500;
let offset = 0;

while (true) {
    const rows = await db.query(`
        SELECT c.id, c.first_name, c.last_name, c.email, c.phone,
               c.customer_type, co.nip, co.name AS company_name,
               COUNT(v.id) AS visit_count,
               MAX(v.end_date) AS last_visit,
               COALESCE(SUM(v.total_gross), 0) AS total_revenue,
               COUNT(DISTINCT vh.id) AS vehicle_count,
               c.created_at
        FROM customers c
        LEFT JOIN companies co ON co.customer_id = c.id
        LEFT JOIN visits v ON v.customer_id = c.id AND v.status = 'COMPLETED'
        LEFT JOIN vehicles vh ON vh.customer_id = c.id
        WHERE c.tenant_id = $tenantId
          AND <filtry>
        GROUP BY c.id, co.nip, co.name
        ORDER BY <sortBy> <sortDirection>
        LIMIT $1 OFFSET $2
    `, [CHUNK, offset]);

    if (rows.length === 0) break;

    for (const row of rows) {
        res.write(toCsvLine(row) + '\n');
    }

    if (rows.length < CHUNK) break;
    offset += CHUNK;
}

res.end();
```

**Dlaczego LIMIT/OFFSET a nie kursor bazodanowy?**
- Kursory PostgreSQL wymagają trzymania otwartej transakcji przez cały czas streamu
- Dla < 10 000 rekordów LIMIT/OFFSET jest wystarczające i prostsze
- Przy dużych zbiorach (> 100k) lepszy byłby kursor (`DECLARE … CURSOR FOR …; FETCH 500 FROM …`)

#### 4. Rate limiting (Redis)

```js
const key = `export:rate:${tenantId}:${userId}`;
const ok = await redis.set(key, '1', { NX: true, EX: 30 }); // TTL 30s
if (!ok) return res.status(429).json({ message: 'Poczekaj 30 sekund przed kolejnym eksportem' });
```

`NX` (set only if Not eXists) + TTL 30s = atomowy rate limit bez wyścigu.

#### 5. Read replica (opcjonalne)

Jeśli aplikacja ma read replica, eksport powinien trafiać tam:

```js
const db = getReadReplicaConnection(); // nie primary!
```

Eksport to ciężkie, sekwencyjne czytanie — idealny kandydat na read replica.

#### 6. Jedna efektywna kwerenda zamiast N+1

Jeden JOIN zamiast N osobnych zapytań po `SELECT * FROM visits WHERE customer_id = ?`:

```sql
-- ✅ Dobrze: jeden JOIN z agregacją
LEFT JOIN visits v ON v.customer_id = c.id AND v.status = 'COMPLETED'
GROUP BY c.id

-- ❌ Źle: N+1 — pętla po klientach z osobnym zapytaniem o wizyty
```

---

## Diagram przepływu

```
Klient HTTP
    │
    ▼
[Rate limit check] ──── 429 ──→ odpowiedź natychmiastowa
    │ OK
    ▼
[COUNT(*) query] ─────── 422 ──→ odpowiedź natychmiastowa (> 10 000)
    │ OK
    ▼
[Ustaw nagłówki + BOM + nagłówek CSV]
    │
    ▼
┌─────────────────────────────────┐
│  LOOP: OFFSET 0, 500, 1000, …  │
│   SELECT … LIMIT 500 OFFSET n  │ ─── chunk z bazy
│   for row in chunk:            │
│       res.write(csvLine(row))  │ ─── stream do klienta
│   if chunk.length < 500: break │
└─────────────────────────────────┘
    │
    ▼
[res.end()] — połączenie zamknięte
```

---

## Helpery do CSV (pseudokod)

```js
function escapeCsv(val) {
    if (val == null) return '';
    const s = String(val);
    // RFC 4180: wartości z przecinkiem, cudzysłowem lub newline
    // muszą być otoczone cudzysłowami, a wewnętrzne " → ""
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function toCsvLine(row) {
    return [
        row.id,
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.customer_type === 'business' ? 'Firma' : 'Osoba fizyczna',
        row.nip,
        row.company_name,
        row.visit_count,
        row.last_visit ? row.last_visit.toISOString().slice(0, 10) : '',
        (row.total_revenue / 100).toFixed(2),  // grosze → PLN
        row.vehicle_count,
        row.created_at.toISOString().slice(0, 10),
    ].map(escapeCsv).join(',');
}
```
