# Moduł Komunikacji i Leadów 2.0 — Architektura i UX

**Dokument techniczno-produktowy** · wersja 1.0 · 2026-08-17
Stack odniesienia: backend Kotlin / Spring Boot 3 / PostgreSQL / Quartz / jakarta.mail / STOMP-WebSocket, frontend React 19 / TanStack Query / styled-components. Wykorzystujemy istniejące moduły: `leads`, `message-templates`, `services` (cennik), `appointments` + `calendar` (FullCalendar), `customers`, `vehicles`.

---

## 0. Teza produktowa

Dziś moduł leadów jest "podglądem cudzej skrzynki" — CRM widzi tylko to, co przeleci przez forwarding, a użytkownik i tak pracuje w Gmailu. Docelowo odwracamy relację: **CRM staje się miejscem, w którym odpowiada się na zapytania**, bo tylko tam wycena składa się sama z cennika, wątek jest przypięty do leada i auta, a follow-up czeka gotowy do kliknięcia. Gmail zostaje transportem, nie narzędziem pracy.

Zasada projektowa dla całego modułu: **AI przygotowuje, człowiek zatwierdza, system pilnuje.** Żadna wiadomość nie wychodzi bez kliknięcia użytkownika (właściciele nie ufają wygenerowanym tekstom — i słusznie), ale żaden lead nie ginie, bo system pilnuje terminów i podsuwa gotowce.

---

## 1. Onboarding i autoryzacja poczty (bez tarcia)

### 1.1. Trzy ścieżki, jedna decyzja użytkownika

Użytkownik podaje **wyłącznie adres e-mail**. Wszystko dalej wybiera system (wzorzec *provider detection → strategy selection*):

```
Użytkownik wpisuje: kontakt@studioblysk.pl
        │
        ▼
[Backend: EmailProviderDetector]
 1. Znany domenowo? (gmail.com, googlemail.com → GOOGLE_OAUTH;
    outlook.com/hotmail/live → MS_OAUTH)
 2. Lookup MX domeny:
    - MX *.google.com / googlemail.com  → GOOGLE_OAUTH (Google Workspace)
    - MX *.outlook.com / *.protection.* → MS_OAUTH (Microsoft 365)
 3. W pozostałych wypadkach → IMAP_AUTODISCOVER
        │
        ▼
UI pokazuje JEDEN z trzech ekranów — nigdy wyboru "IMAP czy OAuth"
```

**Ścieżka A — OAuth2 (Gmail / Microsoft 365).** Przycisk "Połącz z Google" / "Połącz z Microsoft". Standardowy Authorization Code + PKCE, redirect na nasz backend.

- Google: **Gmail API** zamiast IMAP (scope `gmail.readonly` + `gmail.send` + `gmail.modify` do oznaczania przeczytanych). Dostajemy `historyId` do przyrostowej synchronizacji i `X-GM-THRID` jako bonus do threadingu.
- Microsoft: **Microsoft Graph** (`Mail.ReadWrite`, `Mail.Send`, `offline_access`) z delta query do synchronizacji przyrostowej.
- MFA jest problemem *providera*, nie naszym — użytkownik przechodzi swój zwykły ekran logowania Google/MS razem z drugim składnikiem. Zero konfiguracji po naszej stronie.
- **Pułapka:** Gmail scopes to kategoria *restricted* — wymaga weryfikacji aplikacji przez Google i corocznego audytu CASA (koszt ~kilkanaście tys. USD lub self-assessment przy <100k użytkowników). Zaplanować w roadmapie; do czasu weryfikacji działamy na "unverified app" tylko dla testerów. Dla Microsoft analogicznie: publisher verification.

**Ścieżka B — IMAP/SMTP autodiscover (wzorzec Thunderbirda).** Dla home.pl, nazwa.pl, OVH, cyber_folks i innych hostingów, które obsługują ~połowę polskich firm z branży:

1. **Mozilla ISPDB** (`autoconfig.thunderbird.net/v1.1/{domena}`) — gotowa baza konfiguracji, pokrywa większość dużych providerów.
2. `https://autoconfig.{domena}/mail/config-v1.1.xml` oraz `https://{domena}/.well-known/autoconfig/...`
3. **DNS SRV** (RFC 6186): `_imaps._tcp.{domena}`, `_submission._tcp.{domena}`.
4. Heurystyka po MX: MX wskazuje `mail.hostingprovider.pl` → probing `imap.{domena}`, `mail.{domena}`, `imap.{provider}` na portach 993/465/587 z krótkim timeoutem, równolegle.
5. Dopiero gdy wszystko zawiedzie (rzadkość) — formularz zaawansowany host/port, schowany za linkiem "Konfiguracja ręczna".

Użytkownik widzi: pole e-mail → pole hasło → "Połącz". Test połączenia (LOGIN + LIST + próbny SMTP EHLO/AUTH) robimy od razu, z czytelnym komunikatem błędu po polsku.

**Ścieżka C — hasła aplikacji (MFA na IMAP).** Providerzy tacy jak Gmail-po-IMAP (nie używamy — mamy OAuth), ale też np. iCloud czy skrzynki z włączonym 2FA na hostingach, odrzucą zwykłe hasło. Obsługa UX:

- Błąd logowania klasyfikujemy po odpowiedzi serwera (np. Gmail `[ALERT] Application-specific password required`, iCloud analogicznie) i zamiast "błędne hasło" pokazujemy **kreator krok-po-kroku z zrzutami ekranu** dla wykrytego providera: "Twoja skrzynka wymaga tzw. hasła aplikacji. To 2 minuty: 1) wejdź tutaj [głęboki link do panelu providera], 2) wygeneruj hasło, 3) wklej je poniżej." Instrukcje trzymamy jako dane (tabela `provider_setup_guides`), nie kod — dopisujemy providerów bez deployu.
- Nigdy nie każemy użytkownikowi wyłączać 2FA.

### 1.2. Bezpieczne przechowywanie poświadczeń

Tabela (istniejący moduł `email` rozszerzamy, nie piszemy od zera):

```sql
CREATE TABLE mail_account (
  id               BIGSERIAL PRIMARY KEY,
  company_id       BIGINT NOT NULL REFERENCES companies(id),
  email_address    TEXT NOT NULL,
  provider_type    TEXT NOT NULL,        -- GOOGLE_API | MS_GRAPH | IMAP_SMTP
  auth_type        TEXT NOT NULL,        -- OAUTH2 | PASSWORD | APP_PASSWORD
  credentials_enc  BYTEA NOT NULL,       -- AES-256-GCM, klucz z KMS/env, per-rekord IV
  imap_host TEXT, imap_port INT, smtp_host TEXT, smtp_port INT,
  oauth_refresh_token_enc BYTEA,
  status           TEXT NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | AUTH_FAILED | DISABLED
  last_sync_at     TIMESTAMPTZ,
  sync_cursor      JSONB,                -- {historyId} | {deltaLink} | {uidvalidity, lastUid per folder}
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, email_address)
);
```

- Poświadczenia szyfrowane AES-256-GCM (envelope encryption; klucz główny poza bazą). Nigdy w logach, nigdy w odpowiedziach API.
- **Health monitoring:** Quartz job co 15 min robi lekki `NOOP`/token refresh. Gdy refresh token wygaśnie (użytkownik zmienił hasło, cofnął dostęp — to *będzie* się działo), konto przechodzi w `AUTH_FAILED`, a użytkownik dostaje powiadomienie w CRM + (przez moduł `notifications`) push/SMS: "Rozłączyliśmy się z Twoją skrzynką — kliknij, by połączyć ponownie." Reconnect = ten sam kreator, dane wstępnie wypełnione.
- **Pułapka:** hostingi współdzielone potrafią rate-limitować IMAP (np. max N równoległych sesji). Jedna trwała sesja IMAP na konto + pojedynczy worker per konto, nie pula.

### 1.3. Strategia synchronizacji

- **Gmail:** push przez Pub/Sub `users.watch` (webhook) + `history.list` od zapisanego `historyId`. Fallback: poll co 2 min.
- **Graph:** subskrypcje webhook (odnawiane Quartzem, max 3 dni życia!) + delta query jako źródło prawdy.
- **IMAP:** IDLE na `INBOX` w dedykowanym wątku per konto (jakarta.mail `IdleManager`), poll co 5 min jako watchdog. Śledzimy `UIDVALIDITY` + `lastSeenUid` per folder; zmiana `UIDVALIDITY` = pełna resynchronizacja okna czasowego.
- Zakres wsteczny przy podpięciu: **ostatnie 30 dni z INBOX + Sent** (Sent jest niezbędny: odpowiedzi wysłane z telefonu poza CRM-em też muszą trafić do wątku — patrz §2). Głębsza historia jako opcjonalny import w tle.
- Cały ingest przechodzi przez wspólny, znormalizowany model `IncomingMailEvent` — dalszy pipeline (§3) nie wie, skąd przyszedł mail. Dotychczasowy webhook Cloudflare zostaje jako czwarty adapter tego samego interfejsu (płynna migracja obecnych klientów).

---

## 2. Ciągłość konwersacji (threading)

### 2.1. Model danych

Rozdzielamy trzy pojęcia, które dziś są zlepione: **wiadomość** (immutable fakt), **wątek** (kontener konwersacji), **lead** (obiekt sprzedażowy). Wątek istnieje niezależnie od leada; lead *wskazuje* na wątek (a docelowo może agregować kilka wątków i kanałów).

```sql
CREATE TABLE mail_thread (
  id               BIGSERIAL PRIMARY KEY,
  company_id       BIGINT NOT NULL,
  mail_account_id  BIGINT NOT NULL REFERENCES mail_account(id),
  subject_norm     TEXT,                 -- temat po zdjęciu Re:/Fwd:/Odp:/PD:
  external_thread_key TEXT,             -- X-GM-THRID / Graph conversationId (pomocniczo)
  classification   TEXT NOT NULL DEFAULT 'PENDING', -- PENDING|INQUIRY|OTHER|SPAM (per wątek!)
  last_message_at  TIMESTAMPTZ NOT NULL,
  last_direction   TEXT,                 -- INBOUND | OUTBOUND (kto "ma piłkę")
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mail_message (
  id               BIGSERIAL PRIMARY KEY,
  company_id       BIGINT NOT NULL,
  thread_id        BIGINT NOT NULL REFERENCES mail_thread(id),
  mail_account_id  BIGINT NOT NULL,
  direction        TEXT NOT NULL,        -- INBOUND | OUTBOUND
  message_id       TEXT NOT NULL,        -- RFC 5322 Message-ID (znormalizowany, bez <>)
  in_reply_to      TEXT,
  references_ids   TEXT[] NOT NULL DEFAULT '{}',
  from_email TEXT NOT NULL, from_name TEXT,
  to_emails TEXT[] NOT NULL, cc_emails TEXT[] DEFAULT '{}',
  subject          TEXT,
  sent_at          TIMESTAMPTZ NOT NULL,
  body_html        TEXT,                 -- oryginał (lub wskaźnik do object storage)
  body_text_clean  TEXT,                 -- po odszumieniu (§3.3) — to widzi UI i LLM
  has_attachments  BOOLEAN NOT NULL DEFAULT FALSE,
  provider_uid     TEXT,                 -- IMAP UID / Gmail msg id / Graph id
  UNIQUE (mail_account_id, message_id)   -- idempotencja ingestu
);
CREATE INDEX ix_msg_thread ON mail_message(thread_id, sent_at);
CREATE INDEX ix_msg_msgid  ON mail_message(company_id, message_id);

-- lead wskazuje wątek; osobna tabela na wypadek wielu wątków/kanałów per lead
CREATE TABLE lead_thread_link (
  lead_id   BIGINT NOT NULL REFERENCES leads(id),
  thread_id BIGINT NOT NULL REFERENCES mail_thread(id),
  PRIMARY KEY (lead_id, thread_id)
);
```

### 2.2. Algorytm przypinania (deterministyczna kaskada, wariant algorytmu JWZ)

Dla każdej przychodzącej wiadomości, w tej kolejności — **pierwsze trafienie kończy**:

1. **`In-Reply-To`** → szukamy `mail_message.message_id` w ramach `company_id`. Trafienie = ten sam `thread_id`. To rozstrzyga ~90% przypadków.
2. **`References`** — iterujemy od ostatniego (najświeższego) identyfikatora do pierwszego; niektórzy klienci (część mobilnych, Outlook w edge case'ach) gubią `In-Reply-To`, ale zostawiają `References`.
3. **Klucz providera** — `X-GM-THRID` / Graph `conversationId` równy `external_thread_key` istniejącego wątku.
4. **Heurystyka miękka (ostatnia deska):** ten sam nadawca + `subject_norm` równy tematowi wątku z ostatnich 30 dni. Normalizacja tematu musi znać polskie prefiksy: `Re:`, `Odp:`, `ODP:`, `Fwd:`, `PD:`, `FW:` (wielokrotne, w dowolnej kombinacji).
5. Brak trafień → **nowy wątek**.

Kluczowe domknięcie pętli — **wysyłka z CRM (SMTP/API) ustawia nagłówki sama**:

- Generujemy własny `Message-ID` (`<uuid@mail.carslab.app>` lub domena klienta) i **zapisujemy go do `mail_message` PRZED wysyłką** (wzorzec *transactional outbox*: rekord `OUTBOX_PENDING` → wysyłka → `SENT`; retry bez podwójnej wysyłki dzięki temu samemu Message-ID).
- Ustawiamy `In-Reply-To` = Message-ID ostatniej wiadomości wątku oraz `References` = pełny łańcuch (przycięty do ~10 ostatnich, limit długości nagłówka).
- Efekt: odpowiedź klienta *musi* wrócić z naszym Message-ID w `In-Reply-To` — przypięcie jest deterministyczne, heurystyka "otwartego leada" znika całkowicie.

**Deduplikacja wysyłki własnej:** mail wysłany z CRM przez konto Gmail pojawi się też w synchronizacji folderu Sent. `UNIQUE (mail_account_id, message_id)` sprawia, że ingest go rozpozna i tylko uzupełni `provider_uid`, zamiast tworzyć duplikat. Analogicznie odpowiedź wysłana **z telefonu poza CRM-em** wpada z Sent jako `OUTBOUND` i poprawnie ląduje w wątku — CRM widzi pełną rozmowę nawet, gdy użytkownik czasem "zdradzi" nas z Gmailem. To celowa cecha, nie bug: obniża próg adopcji.

### 2.3. Edge cases

| Przypadek | Zachowanie |
|---|---|
| Klient pisze nowy mail zamiast "odpowiedz" (brak nagłówków) | Krok 4 kaskady; jeśli i to zawiedzie — nowy wątek, ale UI pokazuje przy nadawcy plakietkę "2 inne wątki z tym adresem" + akcja **Scal wątki** (merge przepina `mail_message.thread_id`, zostawia rekord w `thread_merge_log` dla odwracalności) |
| Zmiana tematu w trakcie rozmowy | Nagłówki i tak trzymają wątek (krok 1–2); `subject_norm` aktualizujemy tylko przy utworzeniu |
| Forward zapytania od wspólnika ("zobacz, wyceń") | `From` ≠ klient — ekstrakcja LLM (§3) wyciąga prawdziwy adres klienta z treści forwardu do pola `lead.contact_email`; odpowiadamy na adres klienta, nowy wątek zepnie się przez nasze Message-ID |
| Dwóch klientów, identyczny temat ("Wycena") | Krok 4 wymaga zgodności nadawcy — brak fałszywego sklejenia |
| Mail przychodzi dwa razy (IMAP re-fetch po zerwaniu sesji) | Idempotencja po `(mail_account_id, message_id)` |
| Brak Message-ID (zdarza się w spamie/starych systemach) | Syntetyczny: hash(from, sent_at, subject) — deterministyczny, więc nadal idempotentny |

---

## 3. Filtrowanie AI i koszty

### 3.1. Lejek klasyfikacji (płacimy LLM-em tylko za to, czego nie rozstrzygną reguły)

Cała skrzynka to w większości szum. Pipeline (wzorzec *pipes & filters*, każdy etap tańszy niż następny):

```
INGEST (mail znormalizowany)
  │
  ├─ [F0] Reguły zerokosztowe — odrzucenie bez LLM:
  │    • folder ≠ INBOX/Sent → ignoruj (Spam/Trash nie synchronizujemy)
  │    • nagłówki List-Unsubscribe / List-Id / Precedence: bulk → NEWSLETTER
  │    • Auto-Submitted: auto-generated / auto-replied → AUTOMAT (faktury, potwierdzenia, OOO)
  │    • nadawca na liście ignorowanych (patrz "uczenie się" niżej)
  │    • nadawca = istniejący klient CRM z aktywną wizytą → od razu INQUIRY-kontynuacja
  │
  ├─ [F1] Wątek już sklasyfikowany? → dziedziczy klasę wątku, ZERO wywołań LLM.
  │    Klasyfikujemy WĄTKI, nie wiadomości — 2. i każda kolejna wiadomość
  │    w rozmowie jest darmowa. (Największa pojedyncza oszczędność.)
  │
  ├─ [F2] Klasyfikator tani (Haiku, temperatura 0, wyjście: jedna etykieta
  │    INQUIRY | OTHER | UNSURE) — wejście: from, subject, pierwsze ~1500 znaków
  │    body_text_clean. Koszt: ułamek grosza / mail.
  │
  └─ [F3] Ekstrakcja droga (Sonnet) — TYLKO dla INQUIRY/UNSURE:
       structured output {marka, model, rocznik, usługi[], lokalizacja?,
       preferowany_termin?, telefon?, budżet?} + confidence.
       Wynik → utworzenie/aktualizacja leada + dopasowanie usług do
       modułu `services` (cennik) po nazwach + fuzzy match.
```

**Uczenie się bez ML-owej ceremonii:** gdy użytkownik ręcznie oznaczy wątek "To nie zapytanie" / przeciągnie mail z widoku "Inne" do leadów, zapisujemy `(from_domain | from_email) → etykieta` w tabeli `sender_rules` per firma. Reguły wchodzą do F0. Po tygodniu używania skrzynka "sama" się czyści, bez treningu modeli.

**Fail-safe:** `UNSURE` po F3 z niskim confidence nie znika — ląduje w podręcznej zakładce **"Do przejrzenia"** (raz dziennie badge z licznikiem). Lepiej pokazać 3 śmieci, niż zgubić 1 zapytanie warte 2000 zł. Wszystko sklasyfikowane jako OTHER jest przechowywane (mamy je z IMAP i tak), ale nie tworzy leadów i nie wysyła powiadomień.

**Prywatność (istotne przy pełnym IMAP):** maile OTHER nie są nigdy wysyłane do LLM poza jednorazową klasyfikacją F2 (obciętą do 1500 znaków), treści prywatne nie trafiają do żadnych promptów zbiorczych. Zapisać to wprost w polityce prywatności i w UI onboardingu ("Analizujemy tylko pod kątem zapytań ofertowych") — to pytanie padnie.

### 3.2. Szacunek kosztów (sanity check)

Studio: ~300 maili/mies. na skrzynce, z czego ~60 nowych wątków, ~25 zapytań.
F0+F1 zdejmują ~70% wolumenu. F2: ~90 wywołań Haiku (grosze). F3: ~30 wywołań Sonnet z odszumionym wejściem ~1–2k tokenów. Łącznie **koszt LLM < 1 zł/klienta/mies.** — pomijalny w cenie abonamentu. Wniosek: nie ma sensu budować własnego klasyfikatora embeddingowego na start; wrócić do tematu przy >5k klientów.

### 3.3. Odszumianie HTML (zanim cokolwiek zobaczy LLM)

Deterministyczny preprocessing w Kotlinie (jsoup już w zasięgu stacku), wynik zapisany raz do `mail_message.body_text_clean` — płacimy CPU raz, nie tokenami przy każdym prompcie:

1. **HTML → tekst:** jsoup, usuwamy `<style>`, `<script>`, tracking pixels, `display:none`; tabele layoutowe spłaszczamy do linii.
2. **Cytaty poprzednich wiadomości:** wycinamy `div.gmail_quote`, `blockquote[type=cite]`, `#divRplyFwdMsg` (Outlook) oraz tekstowe markery: `On ... wrote:`, `W dniu ... napisał(a):`, `Dnia ... pisze:`, linie `>`. To one puchną najbardziej — trzeci mail w wątku bez tego niesie całą historię ×3.
3. **Stopki i sygnatury:** heurystyka linii (`--`, `Pozdrawiam`, `Z poważaniem`, telefon+NIP w bloku końcowym) + **dedup per nadawca**: trzymamy hash 5 ostatnich linii poprzednich maili nadawcy; powtarzający się sufiks = stopka, wycinamy (podejście à la biblioteka talon, ale własne, proste).
4. **Twardy limit:** 4000 znaków wejścia do F3; jeśli po odszumieniu nadal więcej — bierzemy początek + ostatni akapit.

Oryginalny HTML zostaje nietknięty do wyświetlania w UI (sandboxowany iframe, CSP, obrazki proxowane/klikalne po zgodzie — nie odpalamy trackerów automatycznie).

---

## 4. UX/UI i przepływ pracy w CRM

### 4.1. Jeden ekran: "Zapytania" (kanban × skrzynka)

Nie budujemy osobno "skrzynki" i osobno "kanbana" — to jeden widok w dwóch projekcjach tego samego stanu, przełączany segmentem [**Tablica** | **Lista**]:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Zapytania      [Tablica ▾]        🔍          (3) Do przejrzenia    │
├────────────┬────────────┬────────────────┬───────────────┬──────────┤
│  NOWE  (4) │ WYCENIONE 6│ DO POTWIERDZ. 2│ UMÓWIONE  (3) │ PRZEGRANE│
│ ┌────────┐ │ ┌────────┐ │                │               │          │
│ │● BMW X5│ │ │Audi A4 │ │   ...          │    ...        │   ...    │
│ │Ceramika│ │ │Korekta │ │                │               │          │
│ │Jan K.  │ │ │⏱ 3 dni │←── badge "czeka na follow-up"    │          │
│ │12 min ⚡│ │ │  cisza │ │                │               │          │
│ └────────┘ │ └────────┘ │                │               │          │
└────────────┴────────────┴────────────────┴───────────────┴──────────┘
   Kliknięcie karty → wysuwany panel (drawer) na 60% szerokości:
┌──────────────────────────────────────────────────────────────────────┐
│  Jan Kowalski · jan@…    BMW X5 2021        [Zadzwoń] [Umów wizytę]  │
│  Usługi: powłoka ceramiczna, korekta lakieru      Etap: NOWE ▾       │
│ ─────────────────────────────────────────────────────────────────── │
│  WĄTEK (chat-style, czyszczony tekst, „pokaż oryginał" per mail)    │
│   Klient 10:12  Dzień dobry, ile za ceramikę na X5 z 2021…          │
│ ─────────────────────────────────────────────────────────────────── │
│  [✍ Odpowiedz]  [📋 Wyślij wycenę]  [🗓 Zaproponuj terminy]          │
└──────────────────────────────────────────────────────────────────────┘
```

Decyzje projektowe:

- **Karta = lead, nie mail.** Na karcie: auto (marka/model — to język, którym myśli detailer), usługi, imię, wiek ostatniej wiadomości i wskaźnik kierunku ("piłka u nas" = kropka pulsująca; "czekamy na klienta" = zegar). Sortowanie w kolumnie: najpierw te, gdzie piłka u nas.
- **Wątek renderujemy jak czat** (dymki, `body_text_clean`), bo cytowania już wycięliśmy — to daje "messengerową" lekkość, której Gmail nie ma. Link "pokaż oryginał" otwiera surowy HTML.
- **Etapy przesuwają się same** na zdarzeniach: wysłano wycenę → WYCENIONE; klient odpisał → badge + powrót "piłki"; utworzono wizytę w kalendarzu → UMÓWIONE; wizyta odbyta → lead zamknięty WYGRANY (konwersja do `customers`+`vehicles`, jeśli jeszcze nie istnieją). Ręczne przeciąganie zostaje, ale w praktyce jest korektą, nie obowiązkiem. **To likwiduje "wróć do CRM i zaktualizuj status" z obecnego procesu.**
- Nowe wiadomości wpadają na żywo przez istniejący kanał STOMP (`/topic/company/{id}/inbox`), TanStack Query robi selektywną inwalidację.
- **Mobile first dla właściciela z myjni:** lista zamiast kanbana, drawer pełnoekranowy, przycisk "Zadzwoń" wybiera wyciągnięty numer telefonu.

### 4.2. Edytor odpowiedzi i "magia AI"

Kompozytor otwiera się w drawerze pod wątkiem (kontekst zawsze widoczny). Trzy tryby jednego edytora:

1. **Pusta odpowiedź** — zwykły rich-text (minimalny: pogrubienie, listy, załącznik). Wysyłka przez SMTP/API konta użytkownika — **klient dostaje mail z prawdziwego adresu studia**, nie z `noreply@`. Nagłówki wątku ustawiane automatycznie (§2.2).
2. **Szablon** — istniejący moduł `message-templates` z merge-polami `{{imie}}, {{auto}}, {{uslugi}}`.
3. **📋 Wycena (killer flow, §5.1)** — patrz niżej.

Zasady "magii AI" (dopasowane do nieufności właścicieli wobec generowanych tekstów):

- AI **nigdy nie pisze prozy za użytkownika w trybie domyślnym**. Zamiast tego składa **konkret**: tabelę wyceny z *ich własnego cennika*, ich szablon, ich stopkę. Tekst łączący jest z szablonu użytkownika, nie z modelu.
- Opcjonalny przycisk "✨ Dopasuj treść" przepisuje szablon pod kontekst maila klienta (ton, odpowiedź na zadane pytania) — ale to zawsze **draft do edycji**, z widoczną różnicą względem szablonu, i funkcja jest opt-in per firma.
- Draft ≠ wysyłka. Wysyłka to zawsze świadome kliknięcie. (Wyjątek: §5.2, i tam też jest kliknięcie.)

---

## 5. Killer features

### 5.1. "Wycena w 60 sekund" — z cennika, nie z LLM-a

Największy ból: wycena ceramiki na X5 wymaga sprawdzenia cennika, przeliczenia rozmiaru auta, spisania pozycji. Robimy to za użytkownika **deterministycznie**:

- Moduł `services` rozszerzamy o **mnożniki rozmiaru nadwozia** (S/M/L/XL — jednorazowa, prosta konfiguracja suwakami przy onboardingu; słownik marka/model → segment utrzymujemy my, globalnie, nie klient).
- F3 wyciągnęło "BMW X5 2021 + ceramika + korekta" → klik **📋 Wyślij wycenę** → edytor otwiera się z gotową tabelą: pozycje z cennika klienta, ceny po mnożniku XL, suma, czas realizacji (z konfiguracji usług), tekst z szablonu "wycena" użytkownika. Użytkownik poprawia kwotę lub nie — i wysyła. 60 sekund zamiast 10 minut, **zero tekstu wymyślonego przez LLM** — same liczby z jego własnego cennika.
- Wycena zapisuje się na leadzie jako obiekt (`lead_quote`: pozycje, suma, wysłano_at) → zasila raport "wysłane vs. wygrane" i §5.2.

### 5.2. Follow-up, który czeka na jedno kliknięcie

Prawda branżowa: większość wycen umiera w ciszy, a nikt nie pamięta, żeby się odezwać. Automat, ale zgodny z zasadą "człowiek zatwierdza":

- Reguła domyślna (konfigurowalna jednym suwakiem): **3 dni po wysłaniu wyceny bez odpowiedzi** → Quartz tworzy draft follow-upu z szablonu użytkownika ("Dzień dobry, czy miał Pan okazję zapoznać się z wyceną…") i kładzie go w kolumnie/zakładce **"Do wysłania (2)"** + powiadomienie push rano.
- Użytkownik rano, przy kawie: otwiera listę, kciukiem **[Wyślij] [Wyślij] [Pomiń]**. 15 sekund dziennie. Dla odważnych: przełącznik "wysyłaj follow-upy automatycznie" (opt-in, domyślnie OFF).
- Odpowiedź klienta w międzyczasie automatycznie kasuje zaplanowany follow-up (idempotentny warunek w jobie: `last_direction = OUTBOUND AND last_message_at < now() - interval`).
- Drugi follow-up po kolejnych 4 dniach → potem lead automatycznie do "PRZEGRANE (brak odpowiedzi)" — tablica sama się sprząta.

To jest feature, który *mierzalnie* zarabia: pokazujemy w statystykach "X klientów wróciło po follow-upie, wartość wycen: Y zł" — bezpośredni argument, że CRM się spłaca.

### 5.3. "Zaproponuj terminy" — domknięcie w kalendarzu

Deal w detailingu zamyka się w momencie rezerwacji terminu, a ping-pong "to może środa? — środa nie, może piątek?" potrafi trwać tydzień. Wykorzystujemy istniejący moduł `appointments`/`calendar`:

- W kompozytorze przycisk **🗓 Zaproponuj terminy**: system bierze czas trwania z wycenionych usług, znajduje 3 najbliższe wolne okna w kalendarzu i wkleja do maila **link do publicznej strony rezerwacji** (wzorzec istniejącego modułu `public-signing`) z tymi oknami.
- Klient klika termin → wizyta ląduje w kalendarzu jako "do potwierdzenia", lead sam przechodzi na UMÓWIONE, obie strony dostają potwierdzenie. Zero kolejnych maili.
- Edge case: dwóch klientów klika ten sam slot → rezerwacja pesymistyczna (pierwszy wygrywa, drugi widzi odświeżone okna).

*(Feature'y 5.1–5.3 składają się w jedną opowieść sprzedażową: zapytanie → wycena 60 s → follow-up jednym kciukiem → klient sam się umawia. Właściciel wraca do Gmaila tylko po to, żeby sprawdzić, czy na pewno wszystko już jest w CRM.)*

---

## 6. Architektura — widok całości i kolejność wdrożenia

```
[Gmail API push] [Graph webhook] [IMAP IDLE] [Cloudflare webhook (legacy)]
        └──────────────┴──────┬───────┴──────────────┘
                       IngestService (normalizacja, idempotencja)
                              │  (transactional outbox → zdarzenia domenowe)
                       ThreadingService (§2.2)
                              │
                       CleaningService (§3.3, zapis body_text_clean)
                              │
                       ClassificationPipeline F0→F3 (§3.1)
                              │
              ┌───────────────┼──────────────────┐
        LeadService      NotificationService   STOMP push do UI
   (create/update, quote,  (push/badge)
    follow-up scheduler ─ Quartz)
                              ▲
        SendService (kompozytor → outbox → SMTP/Gmail/Graph, nagłówki wątku)
```

Wzorce: *ports & adapters* na źródła poczty, *transactional outbox* dla wysyłki i zdarzeń, *pipes & filters* w klasyfikacji, CQRS-lite zgodnie z konwencją istniejącego modułu `email` (commands/queries/read models). Wszystko multi-tenant po `company_id` jak reszta systemu.

**Fazowanie (każda faza dowozi wartość samodzielnie):**

1. **Fundament:** model wątków + threading po nagłówkach + wysyłka z CRM z poprawnymi nagłówkami (działa jeszcze na Cloudflare-forwardingu!). Już to likwiduje najgorszy ból: odpowiadanie z CRM i pewne przypinanie odpowiedzi.
2. **Podpięcie skrzynek:** OAuth Google → Microsoft → IMAP autodiscover (w tej kolejności; weryfikację Google uruchomić natychmiast, bo trwa tygodnie).
3. **Lejek klasyfikacji** F0–F3 + widok "Zapytania" (tablica/lista + drawer).
4. **Killer features:** wycena z cennika → follow-upy → terminy.

**Ryzyka do pilnowania:** audyt CASA Google (czas i koszt), stabilność IMAP na tanich hostingach (limity sesji, zrywane IDLE — watchdog obowiązkowy), wygasające subskrypcje Graph (odnawianie Quartzem), oraz produktowo — dyscyplina, by "magia AI" pozostała proponowaniem, nigdy wysyłaniem bez człowieka.
