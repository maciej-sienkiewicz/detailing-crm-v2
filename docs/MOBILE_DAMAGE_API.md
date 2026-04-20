# Mobile Damage Points – Specyfikacja API dla Backendu

**Data:** 2026-04-20  
**Autor:** Frontend Team  
**Dotyczy:** Rozszerzenie widoku mobilnego (MobilePhotoUploadView) o moduł dokumentacji uszkodzeń pojazdu

---

## Kontekst

Widok mobilny (`/m/upload?t=<token>`) działa jako publiczny punkt dostępu (brak sesji/ciasteczek), uwierzytelniany wyłącznie przez `X-Upload-Token` przekazywany jako nagłówek HTTP.

Dotychczas widok obsługiwał tylko przesyłanie zdjęć. Po rozszerzeniu użytkownik CRM może poprowadzić klienta do pojazdu i na bieżąco zaznaczać uszkodzenia na interaktywnym schemacie. Oznaczenia (punkty XY + notatki) muszą być trwale zapisywane po stronie serwera i dostępne po powrocie do stanowiska komputerowego.

---

## Nowe endpointy

### 1. Zapisz punkty uszkodzeń (mobile)

```
PUT /mobile/checkin/damage-points
```

**Nagłówki:**
```
X-Upload-Token: <token>
Content-Type: application/json
```

**Ciało żądania:**
```json
{
  "damagePoints": [
    { "id": 1, "x": 45.2, "y": 30.5, "note": "Głęboka rysa na drzwiach kierowcy" },
    { "id": 2, "x": 78.1, "y": 62.3, "note": "Wgniecenie zderzaka tylnego" }
  ]
}
```

**Opis pól `damagePoints`:**

| Pole   | Typ      | Opis                                          |
|--------|----------|-----------------------------------------------|
| `id`   | integer  | Numer porządkowy nadawany przez frontend (1, 2, 3, …) |
| `x`    | float    | Pozycja pozioma w procentach (0–100), względem szerokości obrazu |
| `y`    | float    | Pozycja pionowa w procentach (0–100), względem wysokości obrazu  |
| `note` | string   | Opis uszkodzenia (może być pusty)             |

**Semantyka:** PUT zastępuje całą listę punktów dla danego check-inu. Puste `damagePoints: []` czyści istniejące punkty.

**Odpowiedź `200 OK`:**
```json
{
  "checkinId": "550e8400-e29b-41d4-a716-446655440000",
  "damagePoints": [
    { "id": 1, "x": 45.2, "y": 30.5, "note": "Głęboka rysa na drzwiach kierowcy" },
    { "id": 2, "x": 78.1, "y": 62.3, "note": "Wgniecenie zderzaka tylnego" }
  ],
  "savedAt": "2024-01-15T10:30:00Z"
}
```

**Błędy:**

| Kod | Przyczyna                              |
|-----|----------------------------------------|
| 401 | Brak lub nieprawidłowy `X-Upload-Token` |
| 403 | Token wygasł lub został unieważniony   |
| 422 | Walidacja – wartości `x`/`y` poza zakresem 0–100 |

---

### 2. Pobierz punkty uszkodzeń (mobile)

```
GET /mobile/checkin/damage-points
```

**Nagłówki:**
```
X-Upload-Token: <token>
```

**Odpowiedź `200 OK`:**
```json
{
  "checkinId": "550e8400-e29b-41d4-a716-446655440000",
  "damagePoints": [
    { "id": 1, "x": 45.2, "y": 30.5, "note": "Głęboka rysa na drzwiach kierowcy" }
  ],
  "savedAt": "2024-01-15T10:30:00Z"
}
```

Jeśli punkty nie zostały jeszcze zapisane:
```json
{
  "checkinId": "550e8400-e29b-41d4-a716-446655440000",
  "damagePoints": [],
  "savedAt": null
}
```

**Błędy:** analogiczne jak w PUT (401, 403).

---

### 3. Pobierz punkty uszkodzeń (desktop / CRM)

```
GET /checkin/{appointmentId}/mobile-damage-points
```

**Autoryzacja:** standardowa sesja CRM (JWT cookie / Bearer token).

**Cel:** widok desktopowy (kreator check-inu) odpytuje ten endpoint, aby pre-populować sekcję „Dokumentacja uszkodzeń" punktami naniesionymi przez pracownika ze smartfona. Dzięki temu po powrocie do komputera wszystkie zaznaczenia są od razu widoczne i można je edytować przed ostatecznym zatwierdzeniem.

**Odpowiedź `200 OK`:**
```json
{
  "checkinId": "550e8400-e29b-41d4-a716-446655440000",
  "damagePoints": [
    { "id": 1, "x": 45.2, "y": 30.5, "note": "Głęboka rysa" }
  ],
  "savedAt": "2024-01-15T10:30:00Z"
}
```

**Odpowiedź `404 Not Found`:** brak aktywnej sesji mobilnej dla danego appointmentId lub brak zapisanych punktów (frontend obsługuje to jako pustą tablicę – `[]`).

---

## WebSocket – nowe zdarzenie

**Temat (topic):** `/topic/studio.{studioId}.checkin.{checkinId}`

**Zdarzenie:** `CHECKIN_DAMAGE_UPDATED`

```json
{
  "type": "CHECKIN_DAMAGE_UPDATED",
  "checkinId": "550e8400-e29b-41d4-a716-446655440000",
  "damagePoints": [
    { "id": 1, "x": 45.2, "y": 30.5, "note": "Głęboka rysa na drzwiach kierowcy" },
    { "id": 2, "x": 78.1, "y": 62.3, "note": "Wgniecenie zderzaka tylnego" }
  ],
  "updatedAt": "2024-01-15T10:30:05Z"
}
```

**Kiedy wysyłać:** każdorazowo po zapisaniu punktów przez `PUT /mobile/checkin/damage-points`, push do wszystkich subskrybentów tematu check-inu.

**Cel:** desktopowy kreator check-inu subskrybuje ten temat. Po odebraniu zdarzenia sekcja uszkodzeń jest automatycznie odświeżana bez potrzeby przeładowania strony — pracownik przy komputerze widzi zmiany naniesione przez kolegę przy pojeździe w czasie rzeczywistym.

---

## Przechowywanie danych

### Sugestia schematu (relacyjna baza danych)

```sql
CREATE TABLE checkin_damage_points (
    id           BIGSERIAL PRIMARY KEY,
    checkin_id   UUID        NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    point_order  SMALLINT    NOT NULL,  -- numer porządkowy (= "id" z frontendu)
    x            DECIMAL(6,3) NOT NULL CHECK (x BETWEEN 0 AND 100),
    y            DECIMAL(6,3) NOT NULL CHECK (y BETWEEN 0 AND 100),
    note         TEXT        NOT NULL DEFAULT '',
    saved_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_checkin_point UNIQUE (checkin_id, point_order)
);

CREATE INDEX idx_cdp_checkin_id ON checkin_damage_points(checkin_id);
```

Alternatywnie: kolumna `JSONB damage_points` w tabeli `checkins` jeśli nie wymagana jest normalizacja ani wyszukiwanie po treści notatek.

---

## Istniejące endpointy – wymagane zmiany

### Brak zmian w kontrakcie tworzenia wizyty

Obecne payloady (`ReservationToVisitPayload`, `WalkInVisitPayload`) już zawierają pole:
```json
"damagePoints": [ ... ]
```

Backend podczas tworzenia wizyty powinien **scalić** punkty z tabeli `checkin_damage_points` z punktami przesłanymi w payloadzie (priorytet: payload z formularza desktopowego).

Sugerowane podejście: frontend wyśle w payloadzie punkty już po scaleniu (pobrane z endpointu `GET /checkin/{appointmentId}/mobile-damage-points` i zmerge'owane z edycjami w kreatorze). Brak zmian wymaganych po stronie backendu dla tego kroku.

---

## Walidacja

| Reguła                           | Szczegół                                                     |
|----------------------------------|--------------------------------------------------------------|
| Token musi być aktywny           | Sprawdzić w `checkin_upload_sessions` lub ekwiwalencie       |
| Max. punktów per check-in        | Sugestia: 50 (konfigurowalne)                                |
| Zakres x, y                      | 0.000 – 100.000 (inkluzywny)                                 |
| Długość notatki                  | Max. 500 znaków                                              |
| Duplikaty `id` w żądaniu         | Odrzuć z 422 i komunikatem                                   |

---

## Przykładowy flow end-to-end

```
1. Pracownik przy komputerze generuje QR → POST /checkin/{appointmentId}/upload-token
2. Klient skanuje QR → GET /mobile/checkin/context (token → checkinId)
3. Pracownik bierze telefon, idzie z klientem do pojazdu
4. Pracownik dotyka schemat → frontend dodaje punkt lokalnie
5. Po 1.8s debounce → PUT /mobile/checkin/damage-points  (auto-save)
6. Backend zapisuje, wysyła WS: CHECKIN_DAMAGE_UPDATED
7. Przy komputerze: kreator odświeża sekcję uszkodzeń (WS event)
8. Pracownik wraca do komputera → dane są już w kreatorze
9. Pracownik zatwierdza check-in → POST /checkin/reservation-to-visit
   (payload zawiera damagePoints ze scalonych danych)
```

---

## Uwagi implementacyjne

- Endpoint mobilny NIE wymaga sesji – wyłącznie `X-Upload-Token` w nagłówku.
- Token jest jednorazowy per sesja check-inu; po wygaśnięciu lub anulowaniu check-inu wszystkie żądania zwracają 403.
- Frontend przechowuje punkty lokalnie (`localStorage`) jako backup offline – synchronizacja następuje automatycznie po przywróceniu łączności.
- Obrazek schematu pojazdu: `/assets/image_627063.jpg` (top-down view). Koordynaty XY są względne do wymiarów tego obrazu, więc są niezależne od rozdzielczości ekranu.

---

## Pytania / do ustalenia

1. Czy maksymalna liczba punktów (50) jest akceptowalna?
2. Czy zdarzenie WS `CHECKIN_DAMAGE_UPDATED` powinno zawierać pełną listę punktów (jak zaproponowano) czy tylko diff (dodane/usunięte)?  
   → Rekomendacja: pełna lista – prostsze dla klienta, rozmiar payload pomijalny.
3. Czy punkty uszkodzeń powinny być dostępne w historii wizyty (panel wizyty po check-inie)? Jeśli tak, backend powinien skopiować je do tabeli `visit_damage_points` przy tworzeniu wizyty.
