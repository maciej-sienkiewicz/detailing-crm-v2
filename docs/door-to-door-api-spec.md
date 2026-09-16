# Specyfikacja zmian API — Door to Door: kierowca i termin dostarczenia

## 📋 Przegląd zmian

Właściciel studia zgłosił, że przy zlecaniu dowozu pojazdu potrzebuje przypisać
**kierowcę** (pracownika studia) oraz **termin dostarczenia** (data + godzina).
Dziś Door to Door przechowuje wyłącznie adresy i uwagi.

Frontend już wysyła te pola. Backend musi zostać zaktualizowany, aby je
przyjmować i zwracać — **do tego czasu kierowca i termin nie przetrwają
odświeżenia strony.**

Ustalone z właścicielem: **Door to Door nie ma ceny** — usługa nie trafia na
rozliczenie wizyty i nie wymaga pola kwoty.

---

## 📦 Zmiany w strukturze danych

### 1. Endpoint: `PUT /v1/visits/{visitId}/door-to-door`

#### Obecna struktura payloadu

```typescript
{
    pickupAddress:   { city: string; street: string };
    deliveryAddress: { city: string; street: string };
    notes?: string;
}
```

#### Docelowa struktura payloadu

```typescript
{
    /** Czy usługa jest zlecona dla tej wizyty. */
    enabled: boolean;

    pickupAddress:   { city: string; street: string };
    deliveryAddress: { city: string; street: string };
    notes?: string;

    /** ID pracownika studia. null = nieprzypisany. */
    driverId?: string | null;

    /** ISO 8601 z offsetem, np. "2026-09-20T14:30:00+02:00". null = brak terminu. */
    scheduledAt?: string | null;
}
```

### 2. Odpowiedź `GET /v1/visits/{visitId}` — obiekt `doorToDoor`

```typescript
{
    enabled: boolean;
    pickupAddress:   { city: string; street: string };
    deliveryAddress: { city: string; street: string };
    notes: string;

    driverId: string | null;
    /** Imię i nazwisko kierowcy — front wyświetla je bez dociągania pracownika. */
    driverName: string | null;
    scheduledAt: string | null;
}
```

---

## ⚠️ Zachowanie brzegowe

| Sytuacja | Oczekiwane zachowanie backendu |
|---|---|
| `enabled: false` | Adresy, kierowca i termin **zostają zapisane**, ale wizyta przestaje być oznaczona jako Door to Door (znika z filtrów i pigułki D2D). Klient bywa niezdecydowany — dane mają przetrwać wyłączenie. |
| `driverId` wskazuje zwolnionego pracownika | Zapis przechodzi; `driverName` zwracane z archiwum, żeby historyczna wizyta nie traciła informacji, kto wiózł. |
| `driverId` nie istnieje | `400` z komunikatem — front pokaże go użytkownikowi. |
| `scheduledAt` w przeszłości | **Dozwolone.** Dane bywają uzupełniane po fakcie, np. następnego dnia rano. |
| Adres niepełny (samo miasto lub sama ulica) | `400`. Front waliduje to samo, ale kontrakt nie może na tym polegać. |
| Oba adresy puste przy `enabled: true` | `400`. |

---

## 🔁 Wpływ na pozostałe endpointy

Te same pola powinny docelowo przyjmować ścieżki, którymi Door to Door powstaje:

- `POST /checkin/reservation-to-visit` — obiekt `doorToDoor`
- `POST /checkin/visits` — obiekt `doorToDoor`
- payloady rezerwacji w module `appointments`

Obecnie wszystkie trzy używają płaskiego kształtu
(`pickupCity`, `pickupStreet`, `deliveryCity`, `deliveryStreet`, `notes`).
Rozszerzenie ich nie jest wymagane do wdrożenia powyższej zmiany —
kierowcę i termin można ustawić z karty wizyty.

---

## ✅ Kryterium gotowości

Po wdrożeniu: ustawienie kierowcy i terminu w oknie Door to Door na karcie
wizyty, odświeżenie strony — obie wartości nadal widoczne.
