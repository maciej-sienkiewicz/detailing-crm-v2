# Kontrakt WebSocket: czego oczekuje frontend

Dokument dla zespołu backendowego. Opisuje, jak frontend CRM łączy się z serwerem
w czasie rzeczywistym i jakiego zachowania oraz jakich danych oczekuje. Służy do
weryfikacji implementacji po stronie backendu (broker STOMP, publikacja zdarzeń,
kształty payloadów, bezpieczeństwo).

Stan na: lipiec 2026, branch `claude/websocket-lead-notifications-5awtzu`.
Źródła prawdy w kodzie frontendu:

| Obszar | Plik |
|---|---|
| Klient STOMP / zarządzanie połączeniem | `src/core/socketClient.ts` |
| Zdarzenia leadów | `src/modules/leads/hooks/useLeadSocket.ts`, `src/modules/leads/types.ts` |
| Zdarzenia dashboardu | `src/modules/dashboard/hooks/useDashboardSocket.ts`, `src/modules/dashboard/types.ts` |
| Zdarzenia check-in | `src/modules/checkin/hooks/useCheckinSocket.ts`, `src/modules/checkin/types.ts` |

---

## 1. Transport i handshake

- Protokół: **STOMP przez SockJS** (biblioteka `@stomp/stompjs` 7.2.1 + `sockjs-client` 1.6).
- Endpoint: **`/ws-registry`** (ścieżka względna — w produkcji za tym samym
  hostem co SPA, proxowana przez nginx do backendu).
- SockJS wykonuje najpierw `GET /ws-registry/info`, potem próbuje transportów
  w kolejności: `websocket` → `xhr-streaming` → `xhr-polling`.
  **Backend musi mieć włączony SockJS** na tym endpoincie (Spring:
  `registry.addEndpoint("/ws-registry").withSockJS()`), a odpowiedź `/info`
  musi być JSON-em SockJS, nie HTML-em.
- Frontend **nie wysyła żadnych nagłówków CONNECT** (brak tokenu w headerach
  STOMP). Uwierzytelnienie opiera się wyłącznie na **cookie sesyjnym** —
  wszystkie żądania REST idą z `withCredentials: true` i handshake SockJS
  niesie te same cookies. Backend musi autoryzować użytkownika na etapie
  handshake'u HTTP.

## 2. Heartbeaty i cykl życia połączenia

- Frontend deklaruje heartbeaty **10000 ms w obu kierunkach**
  (`heart-beat:10000,10000`). Backend musi je negocjować i faktycznie wysyłać
  (Spring simple broker: `enableSimpleBroker(...).setHeartbeatValue(new long[]{10000,10000}).setTaskScheduler(...)`).
  Jeśli backend odpowie `0,0`, frontend nie wykryje martwego połączenia i
  wrócimy do problemu „brak powiadomień do czasu odświeżenia strony".
- Heartbeaty po stronie przeglądarki chodzą w Web Workerze, więc działają też
  w kartach w tle — backend powinien się spodziewać ruchu heartbeat od
  nieaktywnych kart i **nie** ubijać takich sesji.
- Po zerwaniu połączenia frontend robi automatyczny reconnect co **3 s**
  (bez backoffu) i po każdym połączeniu **subskrybuje wszystkie topici od
  nowa**. Backend musi więc traktować subskrypcje jako ulotne — żadnych założeń,
  że klient „już jest zapisany".
- Proxy (nginx) ma `proxy_read_timeout 90s` na `/ws-registry` — przy działających
  heartbeatach co 10 s to bezpieczny margines.

## 3. Semantyka dostarczania i spójność z REST

- Model dostarczania to **at-most-once**: zdarzenia wysłane, gdy klient był
  rozłączony, przepadają. Frontend kompensuje to tak, że **po każdym
  reconnect refetchuje REST** (`GET /api/v1/leads...`, pipeline-summary,
  statystyki dashboardu).
- Z tego wynikają dwa twarde wymagania dla backendu:
  1. **Zdarzenie wolno opublikować dopiero po zatwierdzeniu transakcji w DB.**
     Jeśli event wyjdzie przed commitem, frontend po otrzymaniu toasta
     zrobi refetch listy i leada tam jeszcze nie będzie — użytkownik widzi
     powiadomienie o leadzie, którego „nie ma".
  2. REST musi zawsze zwracać stan co najmniej tak świeży jak wyemitowane
     zdarzenia (brak cache'owania odpowiedzi listy leadów po stronie serwera).
- **Duplikaty są bezpieczne**: frontend deduplikuje NEW_LEAD po `payload.id`
  (zarówno w liście leadów, jak i w „ostatnich połączeniach" na dashboardzie).
  W razie wątpliwości lepiej wysłać zdarzenie dwa razy niż wcale.

## 4. Topici, które subskrybuje frontend

| Topic | Kto subskrybuje | Kiedy |
|---|---|---|
| `/topic/studio.{studioId}.dashboard` | sidebar (cały czas po zalogowaniu) oraz widok Tablicy | zawsze, gdy użytkownik jest zalogowany |
| `/topic/studio.{studioId}.checkin.{checkinId}` | ekran generatora QR check-in | tylko gdy otwarty jest konkretny check-in |

- `studioId` pochodzi z profilu zalogowanego użytkownika (`GET auth/me` →
  `user.studioId`).
- Uwaga: topic `…dashboard` jest subskrybowany **dwukrotnie** (dwa niezależne
  hooki na tej samej przeglądarce → dwie ramki SUBSCRIBE z różnymi `id`).
  To poprawne zachowanie STOMP — broker musi dostarczyć wiadomość do obu
  subskrypcji.
- **Bezpieczeństwo (do zweryfikowania po stronie backendu):** nazwa topicu
  zawiera `studioId`, a klient teoretycznie może wysłać SUBSCRIBE na dowolny
  topic. Backend powinien mieć interceptor na ramce SUBSCRIBE, który sprawdza,
  czy `studioId`/`checkinId` z destination należy do uwierzytelnionego
  użytkownika, i odrzuca obce subskrypcje. Frontend tego nie wymusi.

## 5. Format wiadomości

Każda wiadomość to **pojedyncza ramka tekstowa z JSON-em**. Frontend robi
`JSON.parse(message.body)` — nagłówek `content-type` nie jest sprawdzany,
ale body musi być poprawnym JSON-em (niepoprawny jest logowany i ignorowany).

Wspólna koperta na topicu dashboardowym:

```json
{
  "type": "<TYP_ZDARZENIA>",
  "timestamp": "2026-07-04T12:34:56Z",
  "payload": { }
}
```

Nieznane wartości `type` są logowane ostrzeżeniem i **ignorowane** — można
bezpiecznie dodawać nowe typy zdarzeń bez łamania starszych wersji frontendu.

### 5.1. Zdarzenia na `/topic/studio.{studioId}.dashboard`

#### `NEW_LEAD` — nowy lead / kontakt przychodzący

```json
{
  "type": "NEW_LEAD",
  "timestamp": "2026-07-04T12:34:56Z",
  "payload": {
    "id": "uuid-leada",
    "source": "PHONE",
    "contactIdentifier": "+48600100200",
    "customerName": "Jan Kowalski",
    "estimatedValue": 250000,
    "createdAt": "2026-07-04T12:34:55Z"
  }
}
```

| Pole | Typ | Wymagane | Uwagi |
|---|---|---|---|
| `id` | string (UUID) | tak | klucz deduplikacji |
| `source` | `PHONE` \| `EMAIL` \| `MANUAL` | tak | |
| `contactIdentifier` | string | tak | telefon lub e-mail |
| `customerName` | string \| null | tak (może być null) | |
| `estimatedValue` | int | tak | **grosze** (250000 = 2500,00 zł) |
| `createdAt` | string ISO-8601 | tak | |

Reakcja frontendu: toast „Pojawił się nowy kontakt klienta", optymistyczne
dopisanie leada do listy, refetch listy leadów i pipeline-summary,
aktualizacja badge'a w sidebarze, dopisanie pozycji do „ostatnich połączeń"
na Tablicy.

> Historycznie dashboard oczekiwał pól `phoneNumber` / `callerName` /
> `receivedAt`. Frontend nadal akceptuje oba warianty (fallback), ale
> **kanonicznym kształtem jest powyższy** (`contactIdentifier` /
> `customerName` / `createdAt`). Prosimy o potwierdzenie, który wariant
> faktycznie wysyłacie — docelowo chcemy usunąć aliasy.

#### `LEAD_UPDATED` oraz `LEAD_STATUS_CHANGED`

`payload` = **pełny obiekt leada** (dokładnie ten sam DTO co element listy w
`GET /api/v1/leads`). Frontend podmienia nim cały wiersz w cache'u, więc pola
nieprzysłane w evencie **znikną z UI** do czasu refetchu. Minimalny wymagany
zestaw pól:

```
id, source, status, contactIdentifier, createdAt, estimatedValue,
estimationStatus, requiresVerification, relatedVisits
```

plus wszystkie pola opcjonalne, które są ustawione (customerName, summary,
assignedUserId/assignedUserName, serviceTags, newActivityAt, …).
`status` ∈ `NEW | IN_PROGRESS | CONFIRMED | COMPLETED | LOST | NO_SHOW`,
`estimationStatus` ∈ `PENDING | COMPLETED | FAILED | null`.

#### `REPLY_APPENDED`

`payload` = pełny obiekt leada (jak wyżej). Dodatkowo frontend pokazuje toast
„Nowa odpowiedź od klienta".

#### `LEAD_CLIENT_REPLIED`

```json
{
  "type": "LEAD_CLIENT_REPLIED",
  "timestamp": "2026-07-04T12:40:00Z",
  "payload": {
    "leadId": "uuid-leada",
    "activityAt": "2026-07-04T12:39:58Z",
    "customerName": "Jan Kowalski"
  }
}
```

`customerName` jest opcjonalne/nullable. Reakcja: oznaczenie leada jako
„nowa aktywność" (`newActivityAt`), refetch szczegółu leada (jeśli otwarty),
toast „… odpisał na zapytanie".

### 5.2. Zdarzenia na `/topic/studio.{studioId}.checkin.{checkinId}`

Tu **nie ma koperty** `{type, payload, timestamp}` — pola leżą płasko obok
`type`:

#### `CHECKIN_PHOTO_UPLOADED`

```json
{
  "type": "CHECKIN_PHOTO_UPLOADED",
  "checkinId": "uuid",
  "photoId": "uuid",
  "fileName": "front.jpg",
  "timestamp": "2026-07-04T12:00:00Z",
  "thumbnailUrl": "https://..."   // opcjonalne
}
```

#### `CHECKIN_DAMAGE_UPDATED`

```json
{
  "type": "CHECKIN_DAMAGE_UPDATED",
  "checkinId": "uuid",
  "updatedAt": "2026-07-04T12:00:00Z",
  "damagePoints": [
    { "id": 1, "x": 42.5, "y": 17.0, "note": "rysa" }
  ]
}
```

`x`/`y` to procenty (0–100). `note` może być `null` — frontend normalizuje do
pustego stringa.

## 6. Wylogowanie i zmiana użytkownika

Przy wylogowaniu frontend wysyła STOMP `DISCONNECT` i zamyka transport.
Po zalogowaniu innego użytkownika powstaje nowa sesja z nowymi subskrypcjami.
Backend nie musi nic sprzątać poza standardową obsługą rozłączenia, ale
powinien wiązać autoryzację subskrypcji z **bieżącą** sesją HTTP (patrz pkt 4).

## 7. Checklist weryfikacyjny dla backendu

1. [ ] `GET /ws-registry/info` zwraca JSON SockJS (a nie 404/HTML) i przechodzi
       przez wszystkie proxy w torze produkcyjnym.
2. [ ] Transport `websocket` działa przez proxy (nagłówki `Upgrade`/`Connection`),
       a fallbacki `xhr-streaming`/`xhr-polling` nie są blokowane.
3. [ ] Handshake uwierzytelnia po cookie sesyjnym; anonimowe połączenie jest
       odrzucane.
4. [ ] Broker negocjuje i wysyła heartbeaty (`heart-beat` ≠ `0,0`), skonfigurowany
       `TaskScheduler`.
5. [ ] SUBSCRIBE na `/topic/studio.{X}.…` jest odrzucany, gdy `X` nie jest
       studiem uwierzytelnionego użytkownika (analogicznie `checkinId`).
6. [ ] Zdarzenia publikowane są **po commicie** transakcji (np.
       `TransactionalEventListener(AFTER_COMMIT)`), nigdy przed.
7. [ ] `NEW_LEAD` niesie kanoniczny payload (pkt 5.1) — potwierdzić lub zgłosić
       rozbieżność.
8. [ ] `LEAD_UPDATED` / `LEAD_STATUS_CHANGED` / `REPLY_APPENDED` niosą pełne DTO
       leada, identyczne z odpowiedzią `GET /api/v1/leads`.
9. [ ] Każda zmiana leada widoczna dla wielu użytkowników studia jest
       broadcastowana na topic studia (wszystkie zalogowane osoby mają widzieć
       zmianę bez odświeżania).
10. [ ] Duplikat zdarzenia nie powoduje błędów po stronie serwera (frontend jest
        na nie odporny).
11. [ ] Serwer toleruje wielokrotne subskrypcje tego samego topicu z jednej
        sesji oraz szybkie cykle reconnect/resubscribe (co 3 s przy awarii).
12. [ ] Sesje z kart w tle (ruch tylko heartbeat przez wiele minut) nie są
        ubijane po stronie serwera/proxy.
