# Kontrakt API – Moduł leads / podgląd podobnych realizacji

> **Wersja:** 1.0
> **Data:** 2026-06-14
> **Kontekst:** Sekcja „Podobne realizacje" w `LeadDetailModal` – karty referencyjnych wizyt i modal podglądu wizyty

---

## Opis funkcjonalności

Widok `/leads` otwiera modal szczegółów leada (`LeadDetailModal`). Sekcja **„Podobne realizacje"** wyświetla karty referencyjnych wizyt powiązanych z wycenami. Kliknięcie karty otwiera **modal podglądu wizyty** (`VisitPreviewModal`). Oba elementy konsumują trzy endpointy REST.

---

## 1. `GET /v1/leads/:id` — szczegóły leada

### Pole do uzupełnienia w odpowiedzi

```jsonc
"estimation": {
  // ...pola istniejące...
  "relatedVisits": [
    { "id": "<uuid-wizyty>", "title": "<string | null>" }
  ]
}
```

**Wymagania:**
- `id` musi być **UUID istniejącej wizyty** dostępnej przez `GET /visits/:id`.
- `title` to opcjonalny tytuł (może być `null`); używany jako fallback gdy wizyta jest niedostępna.
- Backend powinien zwracać max 5–6 wizyt (frontend renderuje grid kart).

*Pozostała struktura odpowiedzi nie zmienia się.*

---

## 2. `GET /visits/:visitId` — szczegóły wizyty

Endpoint już istnieje. Poniżej lista **wszystkich pól których frontend aktywnie używa** w nowym modal podglądu oraz w kartach referencyjnych.

### Response body

```jsonc
{
  "visit": {
    "id": "uuid",
    "visitNumber": "VIS-2025-00112",
    "title": "Opcjonalny tytuł",           // może być null
    "status": "COMPLETED",

    "scheduledDate": "2025-03-10T09:00:00Z",
    "estimatedCompletionDate": "2025-03-13T17:00:00Z",  // opcjonalne
    "completedDate": "2025-03-13T15:30:00Z",            // opcjonalne
    "createdAt": "2025-03-05T10:00:00Z",
    "updatedAt": "2025-03-13T15:30:00Z",

    "mileageAtArrival": 12400,             // integer km, opcjonalne
    "keysHandedOver": true,
    "documentsHandedOver": true,
    "colorId": "silver",

    "technicalNotes": "Notatki serwisowe…", // może być null lub ""

    "vehicle": {
      "id": "uuid",
      "licensePlate": "KR 55599",
      "brand": "Porsche",
      "model": "911 Carrera",
      "yearOfProduction": 2023,
      "color": "GT Silver Metallic",
      "currentMileage": 12400              // opcjonalne
    },

    "customer": {
      "id": "uuid",
      "firstName": "Arkadiusz",
      "lastName": "Wróbel",
      "email": "a.wrobel@example.com",
      "phone": "+48 601 200 300",
      "companyName": "Firma XYZ Sp. z o.o.",  // opcjonalne
      "stats": {
        "totalVisits": 3,
        "totalSpent": {
          "netAmount": 150000,             // grosze PLN
          "grossAmount": 184500,           // grosze PLN
          "currency": "PLN"
        },
        "vehiclesCount": 1
      }
    },

    "services": [
      {
        "id": "uuid",
        "serviceId": "uuid",
        "serviceName": "Folia PPF – całość",
        "basePriceNet": 499900,            // grosze
        "vatRate": 23,                     // 23 | 8 | 5 | 0 | -1 (zwolniony)
        "requireManualPrice": false,
        "adjustment": {
          "type": "PERCENT",               // PERCENT | FIXED_NET | FIXED_GROSS | SET_NET | SET_GROSS
          "value": -10
        },
        "note": "Dodatkowa warstwa na maskę",
        "finalPriceNet": 449910,           // grosze
        "finalPriceGross": 553389,         // grosze
        "status": "CONFIRMED",             // CONFIRMED | PENDING | APPROVED | REJECTED
        "isPackage": false,
        "packageItems": null
      }
    ],

    "totalCost": {
      "netAmount": 449910,                 // grosze
      "grossAmount": 553389,               // grosze
      "currency": "PLN"
    }
  }
}
```

### Enum: `VisitStatus`

| Wartość | Wyświetlana etykieta | Kolor badge |
|---|---|---|
| `DRAFT` | Szkic | szary |
| `IN_PROGRESS` | W realizacji | niebieski |
| `READY_FOR_PICKUP` | Gotowy do odbioru | zielony jasny |
| `COMPLETED` | Zakończona | zielony |
| `REJECTED` | Odrzucona | czerwony |
| `ARCHIVED` | Zarchiwizowana | szary ciemny |

### Wartości specjalne `vatRate`

| Wartość | Znaczenie | Wyświetlane |
|---|---|---|
| `23` | VAT 23% | `23%` |
| `8` | VAT 8% | `8%` |
| `5` | VAT 5% | `5%` |
| `0` | VAT 0% | `0%` |
| `-1` | zwolniony z VAT | `zw.` |

### Mapowanie pól na UI

| Pole | Gdzie używane |
|---|---|
| `vehicle.brand + model` | Nagłówek hero modala, etykieta karty |
| `vehicle.licensePlate` | Chip tablicy w hero |
| `vehicle.yearOfProduction + color` | Pod-nagłówek hero |
| `vehicle.id` | Nawigacja → `/vehicles/:id` |
| `status` | Badge w hero i na karcie |
| `scheduledDate` | Meta „Termin" w hero |
| `completedDate` | Meta „Zakończono" w hero |
| `mileageAtArrival` | Meta „Przebieg" w hero |
| `visitNumber` | Meta „Numer" + tytuł modala |
| `totalCost.netAmount` | Kafelek „Wartość netto" |
| `totalCost.grossAmount` | Kafelek „Wartość brutto" |
| `grossAmount - netAmount` | Kafelek „VAT" (obliczany po stronie frontend) |
| `services[].serviceName` | Tabela usług — kolumna „Usługa" |
| `services[].finalPriceNet` | Tabela usług — kolumna „Netto" |
| `services[].finalPriceGross` | Tabela usług — kolumna „Brutto" |
| `services[].vatRate` | Tabela usług — kolumna „VAT" |
| `services[].note` | Pod-wiersz z notatką do usługi |
| `technicalNotes` | Sekcja „Notatki z realizacji" |
| `customer.firstName + lastName` | Karta klienta + hero |
| `customer.phone + email` | Karta klienta meta |
| `customer.companyName` | Karta klienta |
| `customer.stats.totalVisits` | Karta klienta statystyki |
| `customer.stats.totalSpent.grossAmount` | Karta klienta statystyki |
| `customer.id` | Nawigacja → `/customers/:id` |

---

## 3. `GET /visits/:visitId/photos` — zdjęcia wizyty

Endpoint już istnieje.

```jsonc
{
  "photos": [
    {
      "id": "uuid",
      "fileName": "vehicle-front.jpg",
      "description": "Opcjonalny opis zdjęcia",   // może być null/pominięty
      "uploadedAt": "2025-03-10T09:05:00Z",
      "thumbnailUrl": "https://...",    // presigned URL, ważny ≥ 10 min
      "fullSizeUrl": "https://...",     // presigned URL, ważny ≥ 10 min
      "tags": ["przód", "PPF"]          // opcjonalne
    }
  ]
}
```

**Krytyczne wymagania:**
- `thumbnailUrl` — okładka karty referencyjnej i miniatura w galerii. Dostępny przez przeglądarkę bez dodatkowych nagłówków (CORS OK).
- `fullSizeUrl` — używany w lightboxie po kliknięciu zdjęcia.
- Presigned URL-e muszą być ważne przez co najmniej **10 minut** (frontend trzyma w cache przez ≤ 60 s via `staleTime`).
- `photos[0]` staje się okładką karty — backend powinien sortować po priorytecie lub `uploadedAt`.

---

## 4. Wymagania wydajnościowe

Sekcja „Podobne realizacje" renderuje **N kart równolegle** (N = liczba elementów w `relatedVisits`, max ~6). Każda karta wysyła **2 zapytania** (detail + photos) po montażu — łącznie do 12 requestów jednocześnie.

**Rekomendacje:**
- Rozważyć endpoint `GET /visits/bulk?ids=id1,id2,...` lub embedded dane w `relatedVisits` bezpośrednio w odpowiedzi leada — eliminuje 2×N requestów.
- Jeśli pozostają osobne requesty: CDN/cache na `GET /visits/:id` (wizyty ze statusem `COMPLETED` rzadko się zmieniają).

---

## 5. Opcjonalne rozszerzenie: embedded dane w `relatedVisits`

Zamiast N × 2 requestów, backend może osadzić dane bezpośrednio w payloadzie leada. Frontend jest przygotowany na stopniowe wzbogacanie `RelatedVisit`:

```jsonc
{
  "id": "uuid",
  "title": "Sienkiewicz na full body",
  "vehicleBrand": "BMW",
  "vehicleModel": "M3 Competition",
  "vehicleYear": 2022,
  "status": "COMPLETED",
  "scheduledDate": "2025-04-02T08:00:00Z",
  "totalGross": 756333,           // grosze
  "servicesCount": 3,
  "serviceNames": ["Folia PPF – całość", "Detailing wnętrza premium", "Korekta lakieru 2-etapowa"],
  "coverPhotoThumbnailUrl": "https://..."  // eliminuje /photos request
}
```

Przy takim podejściu `RelatedVisitCard` renderuje się natychmiastowo bez osobnych requestów, a kliknięcie otwiera pełny modal (który dociąga photos dla lightboxa).

---

## 6. Nawigacja (tylko frontend — brak zmian po stronie backend)

| Przycisk | Docelowy URL |
|---|---|
| Klikalna nazwa pojazdu w hero | `/vehicles/:vehicle.id` |
| „Profil" przy karcie klienta | `/customers/:customer.id` |
| „Profil pojazdu" w stopce | `/vehicles/:vehicle.id` |
| „Przejdź do wizyty" (CTA) | `/visits/:visit.id` |

Wszystkie trasy już istnieją w routerze aplikacji.

---

## 7. Implementacja frontendu

Kod referencyjny:
- `src/modules/leads/components/LeadDetailModal/index.tsx` — `VisitPreviewModal` (linie ~1366–1628), `RelatedVisitCard` (linie ~1641–1750)
- `src/modules/visits/api/visitApi.ts` — `getVisitDetail`, `getVisitPhotos` (z danymi mock dla trzech wizyt referencyjnych)
- `src/modules/visits/types.ts` — typy `Visit`, `VisitPhoto`, `VisitDetailResponse`, `VisitPhotosResponse`

Query keys używane przez frontend:
- `['visit-preview', visitId]` — szczegóły wizyty (staleTime: 60 s)
- `['visit-photos-preview', visitId]` — zdjęcia wizyty (staleTime: 60 s)

Flaga mock: `USE_MOCKS = true` w `visitApi.ts` — do wyłączenia po integracji z backendem.
