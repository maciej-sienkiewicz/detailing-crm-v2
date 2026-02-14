# Specyfikacja zmian API - Adres i dane firmowe klienta w Check-In

## 📋 Przegląd zmian

W ramach usprawnienia procesu przyjęcia pojazdu do studia, dodano możliwość wprowadzania **adresu domowego** oraz **danych firmowych** klienta bezpośrednio w widoku Check-In.

Frontend już wysyła te dane do API, ale backend musi zostać zaktualizowany, aby je obsługiwać.

---

## 🎯 Cel

Umożliwienie operatorom studia detailingowego zbieranie pełnych danych klienta (adres zamieszkania i dane firmowe) podczas przyjęcia pojazdu, bez konieczności przechodzenia do osobnego modułu zarządzania klientami.

---

## 📦 Zmiany w strukturze danych

### 1. Endpoint: `POST /checkin/reservation-to-visit`

#### Obecna struktura payloadu (fragment):

```typescript
interface ReservationToVisitPayload {
    reservationId: string;
    startDateTime?: string;
    endDateTime?: string;
    customer?: CheckInCustomerIdentity;
    vehicle: CheckInVehicleIdentity;
    // ... pozostałe pola
}
```

#### ✅ Rozszerzona struktura `CheckInCustomerIdentity`:

Obecnie frontend wysyła w `customer` pole następujące warianty:

**Wariant 1: EXISTING (istniejący klient)**
```json
{
    "mode": "EXISTING",
    "id": "customer_123"
}
```

**Wariant 2: NEW (nowy klient)** ⬅️ **WYMAGA ZMIAN**
```json
{
    "mode": "NEW",
    "newData": {
        "firstName": "Jan",
        "lastName": "Kowalski",
        "phone": "+48 123 456 789",
        "email": "jan.kowalski@example.com",
        "homeAddress": {
            "street": "ul. Główna 123",
            "city": "Warszawa",
            "postalCode": "00-001",
            "country": "Polska"
        },
        "company": {
            "name": "ABC Sp. z o.o.",
            "nip": "1234567890",
            "regon": "123456789",
            "address": {
                "street": "ul. Biznesowa 456",
                "city": "Warszawa",
                "postalCode": "00-002",
                "country": "Polska"
            }
        }
    }
}
```

**Wariant 3: UPDATE (aktualizacja istniejącego klienta)** ⬅️ **WYMAGA ZMIAN**
```json
{
    "mode": "UPDATE",
    "id": "customer_123",
    "updateData": {
        "firstName": "Jan",
        "lastName": "Kowalski",
        "phone": "+48 123 456 789",
        "email": "jan.kowalski@example.com",
        "homeAddress": {
            "street": "ul. Główna 123",
            "city": "Warszawa",
            "postalCode": "00-001",
            "country": "Polska"
        },
        "company": {
            "name": "ABC Sp. z o.o.",
            "nip": "1234567890",
            "regon": "123456789",
            "address": {
                "street": "ul. Biznesowa 456",
                "city": "Warszawa",
                "postalCode": "00-002",
                "country": "Polska"
            }
        }
    }
}
```

---

## 🔧 Wymagane zmiany w backendzie

### 1. **Rozszerz model Customer**

Upewnij się, że model `Customer` w bazie danych zawiera:

```sql
-- Tabela: customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS home_address_street VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS home_address_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS home_address_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS home_address_country VARCHAR(100);

-- Tabela: companies (jeśli osobna) lub pola w customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_nip VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_regon VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_address_street VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_address_city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_address_postal_code VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_address_country VARCHAR(100);
```

**Uwaga:** Jeśli już istnieje osobna tabela `companies` z relacją 1:1 do `customers`, należy wykorzystać tę strukturę.

---

### 2. **Zaktualizuj walidację API**

W endpoincie `POST /checkin/reservation-to-visit` dodaj walidację dla nowych pól:

#### Walidacja `homeAddress` (opcjonalne):
- `street` - string, max 255 znaków
- `city` - string, max 100 znaków
- `postalCode` - string, max 20 znaków
- `country` - string, max 100 znaków, domyślnie "Polska"

#### Walidacja `company` (opcjonalne):
- `name` - string, wymagane jeśli `company` jest obecne, max 255 znaków
- `nip` - string, opcjonalne, max 20 znaków
- `regon` - string, opcjonalne, max 20 znaków
- `address.street` - string, max 255 znaków
- `address.city` - string, max 100 znaków
- `address.postalCode` - string, max 20 znaków
- `address.country` - string, max 100 znaków

---

### 3. **Logika przetwarzania**

#### Dla `mode: "NEW"`:
1. Utwórz nowego klienta z podstawowymi danymi (firstName, lastName, phone, email)
2. Jeśli `homeAddress` jest obecny → zapisz adres domowy klienta
3. Jeśli `company` jest obecny → utwórz wpis firmy powiązany z klientem
4. Zwróć ID utworzonego klienta

#### Dla `mode: "UPDATE"`:
1. Pobierz istniejącego klienta po `id`
2. Zaktualizuj podstawowe dane (firstName, lastName, phone, email)
3. Jeśli `homeAddress` jest obecny → zaktualizuj lub utwórz adres domowy
4. Jeśli `homeAddress` jest `null` lub brak pola → usuń adres domowy (jeśli istniał)
5. Jeśli `company` jest obecny → zaktualizuj lub utwórz dane firmowe
6. Jeśli `company` jest `null` lub brak pola → usuń dane firmowe (jeśli istniały)

#### Dla `mode: "EXISTING"`:
Bez zmian - używaj istniejącego klienta bez modyfikacji.

---

### 4. **Response API**

Response pozostaje bez zmian:

```json
{
    "visitId": "visit_abc123",
    "protocols": [
        {
            "id": "protocol_1",
            "templateId": "template_checkin",
            "templateName": "Protokół przyjęcia pojazdu",
            "stage": "CHECK_IN",
            "isMandatory": true,
            "status": "READY_FOR_SIGNATURE",
            "filledPdfUrl": "https://..."
        }
    ]
}
```

---

## 📊 Przykładowe scenariusze

### Scenariusz 1: Nowy klient z adresem i danymi firmowymi

**Request:**
```json
POST /checkin/reservation-to-visit
{
    "reservationId": "res_123",
    "customer": {
        "mode": "NEW",
        "newData": {
            "firstName": "Anna",
            "lastName": "Nowak",
            "phone": "+48 987 654 321",
            "email": "anna.nowak@firma.pl",
            "homeAddress": {
                "street": "ul. Kwiatowa 45/12",
                "city": "Kraków",
                "postalCode": "30-001",
                "country": "Polska"
            },
            "company": {
                "name": "Nowak Transport Sp. z o.o.",
                "nip": "9876543210",
                "regon": "987654321",
                "address": {
                    "street": "ul. Przemysłowa 100",
                    "city": "Kraków",
                    "postalCode": "30-500",
                    "country": "Polska"
                }
            }
        }
    },
    "vehicle": { ... },
    "technicalState": { ... },
    "services": [ ... ]
}
```

**Oczekiwane działanie backendu:**
1. Utwórz klienta `Anna Nowak`
2. Zapisz adres domowy: `ul. Kwiatowa 45/12, 30-001 Kraków`
3. Utwórz firmę: `Nowak Transport Sp. z o.o.` (NIP: 9876543210)
4. Zapisz adres firmy: `ul. Przemysłowa 100, 30-500 Kraków`
5. Powiąż klienta z firmą
6. Utwórz wizytę

---

### Scenariusz 2: Aktualizacja istniejącego klienta - dodanie adresu

**Request:**
```json
POST /checkin/reservation-to-visit
{
    "reservationId": "res_456",
    "customer": {
        "mode": "UPDATE",
        "id": "customer_existing_789",
        "updateData": {
            "firstName": "Piotr",
            "lastName": "Wiśniewski",
            "phone": "+48 111 222 333",
            "email": "piotr.wisniewski@email.com",
            "homeAddress": {
                "street": "ul. Spacerowa 7",
                "city": "Gdańsk",
                "postalCode": "80-001",
                "country": "Polska"
            }
        }
    },
    "vehicle": { ... }
}
```

**Oczekiwane działanie backendu:**
1. Pobierz klienta `customer_existing_789`
2. Zaktualizuj dane kontaktowe
3. Dodaj/zaktualizuj adres domowy: `ul. Spacerowa 7, 80-001 Gdańsk`
4. Jeśli klient nie miał wcześniej danych firmowych, pozostaw je puste
5. Utwórz wizytę

---

### Scenariusz 3: Usunięcie danych firmowych z klienta

**Request:**
```json
POST /checkin/reservation-to-visit
{
    "reservationId": "res_789",
    "customer": {
        "mode": "UPDATE",
        "id": "customer_existing_456",
        "updateData": {
            "firstName": "Maria",
            "lastName": "Kowalczyk",
            "phone": "+48 555 666 777",
            "email": "maria@example.com",
            "homeAddress": {
                "street": "ul. Leśna 23",
                "city": "Poznań",
                "postalCode": "60-001",
                "country": "Polska"
            }
            // brak pola "company" oznacza usunięcie danych firmowych
        }
    },
    "vehicle": { ... }
}
```

**Oczekiwane działanie backendu:**
1. Pobierz klienta `customer_existing_456`
2. Zaktualizuj dane kontaktowe
3. Dodaj/zaktualizuj adres domowy
4. **Usuń dane firmowe**, jeśli wcześniej istniały (pole `company` nie jest obecne w `updateData`)
5. Utwórz wizytę

---

## ✅ Checklist dla zespołu backendowego

- [ ] Dodać kolumny do tabeli `customers` dla adresu domowego
- [ ] Dodać kolumny do tabeli `customers` lub `companies` dla danych firmowych
- [ ] Zaktualizować DTO/Model dla `CheckInCustomerIdentity` z polami `homeAddress` i `company`
- [ ] Dodać walidację dla nowych pól
- [ ] Zaimplementować logikę zapisu adresu domowego dla `mode: NEW`
- [ ] Zaimplementować logikę zapisu danych firmowych dla `mode: NEW`
- [ ] Zaimplementować logikę aktualizacji adresu domowego dla `mode: UPDATE`
- [ ] Zaimplementować logikę aktualizacji danych firmowych dla `mode: UPDATE`
- [ ] Obsłużyć przypadek, gdy `homeAddress` lub `company` są `undefined` (nie modyfikuj istniejących danych)
- [ ] Obsłużyć przypadek, gdy brak pola (usuń istniejące dane)
- [ ] Dodać testy jednostkowe dla nowych scenariuszy
- [ ] Zaktualizować dokumentację API (Swagger/OpenAPI)

---

## 📝 Dodatkowe uwagi

### Obsługa wartości `null` vs brak pola

Frontend może wysłać:
- `homeAddress: null` → oznacza "usuń adres domowy"
- brak pola `homeAddress` → oznacza "nie modyfikuj adresu domowego"

To samo dotyczy pola `company`.

**Rekomendacja dla backendu:**
- Jeśli pole nie jest obecne w payloadzie → nie rób żadnych zmian
- Jeśli pole ma wartość `null` → usuń dane (ustaw kolumny na NULL)
- Jeśli pole ma obiekt z danymi → zapisz/zaktualizuj dane

---

## 🔗 Powiązane pliki frontendowe

### Typy TypeScript:
- `src/modules/checkin/types.ts` (linie 106-163) - definicja `CheckInCustomerIdentity`
- `src/modules/customers/types.ts` - definicje `HomeAddress`, `CompanyDetails`

### Komponenty:
- `src/modules/checkin/components/VerificationStep.tsx` - formularz z panelami
- `src/modules/checkin/hooks/useCheckInWizard.ts` - logika wysyłania do API

### API Client:
- `src/modules/checkin/api/checkinApi.ts` - klient API

---

## 📞 Kontakt

W razie pytań lub wątpliwości dotyczących specyfikacji, skontaktuj się z zespołem frontendowym.

**Deadline:** Do uzgodnienia z Product Ownerem

---

**Wersja dokumentu:** 1.0
**Data utworzenia:** 2026-02-14
**Autor:** Claude (AI Assistant)
