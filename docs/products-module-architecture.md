# Moduł Produktów — architektura rozwiązania produkcyjnego

> **Wersja:** 1.0
> **Data:** 2026-09-17
> **Zakres:** oba repozytoria — `detailing-crm-v2` (frontend) i `automotive-crm-v2-backend`
> **Status:** dokument architektoniczny do wdrożenia; sekcja 14 zawiera decyzje biznesowe do potwierdzenia

Dokument jest jednym źródłem prawdy dla tego modułu. Backend ma własny plik
`docs/products-module.md` — zawiera **wyłącznie** rzeczy lokalne dla tamtego repo
(układ pakietów, rejestracja w seederze, klucze konfiguracji), nigdy kopię reguł stąd.

---

## 0a. Zmiany po decyzjach właściciela (v1.1 — wdrożone)

Ten dokument powstał jako propozycja (v1.0). Po akceptacji właściciel doprecyzował
sześć punktów; poniższe zmiany są **wdrożone w kodzie** i mają pierwszeństwo nad
sekcjami, których dotyczą.

1. **Relacja wizyta↔produkt jest czysto informacyjna.** Znika ewidencja zużycia:
   żadnej ilości, ceny snapshotowej, kosztu materiału ani wpływu na `totalCost` czy
   statystyki. `visit_products` niesie wyłącznie „do tej wizyty użyliśmy tego
   produktu". **Zastępuje** §5.1–§5.3 w części o zużyciu i koszcie; §2.3 (kolumny
   ilości/ceny w `visit_products`) — te kolumny NIE powstają. Reguła brutto (CLAUDE.md
   §1) obowiązuje już tylko na jednym polu: opcjonalnej cenie jednostkowej w nakładce
   studia (`product_studio`).
2. **Krok AI ma niezależny weryfikator.** Łańcuch to LOKALNY → AI (odczyt niską
   temperaturą + drugi, mniejszy model „czy na pewno ta karta należy do tego kodu")
   → GS1. Weryfikator może tylko obniżyć pewność; „nie" spycha wynik poniżej progu
   0,90 i łańcuch schodzi do GS1. **Rozszerza** §3.1/§3.3.
3. **Skanowanie tylko przez kod QR + telefon — jak mapa uszkodzeń.** Bez wsparcia
   skanerów USB. Komputer pokazuje kod QR, telefon otwiera aparat, wykryte kody
   wracają po WebSocketcie (+ polling). **Zastępuje** §4.2 (część o skanerze USB)
   i doprecyzowuje §4.3.
4. **Uprawnienia produktów żyją w module wizyt (wzorzec BATCH_ORDERS), nie jako
   osobny `PermissionModule`.** Repo egzekwuje testem, że każdy korzeń SPOZA modułu
   wizyt implikuje `VISITS_CREATE` (a to ciągnie `CUSTOMERS_VIEW`). Żeby dać osobie
   od zaopatrzenia sam katalog bez kartoteki klientów — jak chce wymaganie — korzeń
   `PRODUCTS_VIEW` musi być niezależny i nic nie implikować, co w tym repo znaczy:
   w module wizyt, z `featureKeyOverride = FeatureKey.PRODUCTS`. „Osobny moduł"
   z wymagania realizują finanse/abonament (FeatureKey/AddOnKey/CapabilityKey).
   **Zastępuje** §7.2 w części o `PermissionModule.PRODUCTS`.
5. **Nazwa modułu:** „Produkty w studiu" (bez słowa „zużycie", które sugerowałoby
   ewidencję rozchodu).

Reszta dokumentu (dwuwarstwowy katalog, ślad pochodzenia, governance, hierarchia
wizualna, kontrakt API poza zużyciem) obowiązuje bez zmian.

---

## 0. Streszczenie decyzji

Zespół (Lead Software Architect, Lead Frontend Developer, Lead CX/UX Designer, Project
Manager) przeszedł przez wymagania i rozstrzygnął dziewięć rzeczy. Każda z nich jest
poniżej rozpisana; tu skrót, żeby dało się przeczytać jedną tabelą.

| # | Decyzja | Alternatywa, którą odrzuciliśmy | Dlaczego |
|---|---|---|---|
| 1 | Katalog dzieli się na **warstwę globalną** (specyfikacja produktu) i **nakładkę studia** (cena, notatki, ocena, zużycie) | Wszystko globalne, dokładnie jak w wymaganiu | Cena zakupu i notatki to tajemnica przedsiębiorstwa. Studia detailingowe w jednym mieście to konkurenci — wspólny wiersz z ceną zakupu byłby wyciekiem, nie funkcją. Szczegóły: §2.2 |
| 2 | GTIN jest **kluczem tożsamości** produktu; produkty bez kodu też są obsługiwane | Klucz na (nazwa, marka) | Kod kreskowy jest jedyną wartością, co do której wszystkie studia zgodzą się bez negocjacji. Nazwy wpisuje człowiek — będą trzy warianty tego samego |
| 3 | Dane z LLM nigdy nie awansują do poziomu „zweryfikowane" bez drugiego, niezależnego potwierdzenia | Zapis danych z LLM jako pełnoprawnych | Model potrafi wypełnić kartę produktu, którego nie zna, i zrobi to płynnie. Bez śladu pochodzenia zatruwa katalog wszystkim tenantom naraz. §3.2 |
| 4 | Łańcuch rozpoznawania: **baza → LLM (≥90% pewności) → GS1**, jak w wymaganiu, ale konfigurowalny i z twardą walidacją sumy kontrolnej przed pierwszym płatnym zapytaniem | GS1 najpierw | Kolejność jest wymaganiem biznesowym; ryzyko neutralizujemy śladem pochodzenia (§3.1) zamiast zmieniać kolejność na własną rękę |
| 5 | Zużycie produktu na wizycie to **snapshot** (ilość + cena + VAT z momentu użycia) | Wyliczanie kosztu z bieżącej ceny | Cena chemii zmienia się co kwartał. Rentowność wizyty sprzed roku musi zostać taka, jaka była |
| 6 | Koszt materiału **nigdy** nie wchodzi do `totalCost` wizyty | Doliczanie materiału do rachunku klienta | To koszt wewnętrzny studia. Klient płaci za usługę, a nie za butelkę. Wejście do `totalCost` zmieniłoby kwoty na protokołach i fakturach |
| 7 | Nowy moduł abonamentowy `PRODUCTS` + nowy `PermissionModule.PRODUCTS` z czterema uprawnieniami | Doklejenie do modułu wizyt | Wymaganie wprost. Poza tym zaopatrzeniem w studiu zajmuje się często ktoś inny niż recepcja |
| 8 | `PRODUCTS_VIEW` jest **niezależnym korzeniem** — nie implikuje `VISITS_CREATE` | Konwencja „każdy korzeń spoza wizyt implikuje VISITS_CREATE" | Ta sama argumentacja, co przy `BATCH_ORDERS`: osoba od chemii nie musi widzieć kartoteki klientów. §7.2 |
| 9 | Trzy drogi dodania produktu dzielą **jeden ekran** z przełącznikiem, nie trzy osobne przyciski | Trzy wejścia w nagłówku | Reguła hierarchii: jedno wypełnienie na okno. Trzy równorzędne przyciski „Dodaj" to remis, czyli brak odpowiedzi na pytanie „od czego zacząć". §9.5 |

---

## 1. Co ten moduł rozwiązuje

Perspektywa PM-a, bo od niej zależy, co jest w module, a czego w nim celowo nie ma.

Studio detailingowe zużywa kilkadziesiąt preparatów: powłoki ceramiczne po 300–900 zł za
30 ml, pasty polerskie, szampony, folie, aplikatory. Dziś ta wiedza żyje w trzech
miejscach i w żadnym z nich nie jest kompletna:

1. **W głowie właściciela** — „ta powłoka trzyma się gorzej na czarnym lakierze".
2. **Na paragonach** — ile kosztowała i u kogo kupiona.
3. **Na zdjęciach z wizyt** — co faktycznie poszło na konkretne auto.

Z tego biorą się cztery realne problemy, i to one wyznaczają zakres modułu:

- **Nie wiadomo, ile kosztuje wizyta naprawdę.** Usługa za 1900 zł, w której zeszło
  powłoki za 640 zł, to inna wizyta niż ta sama usługa z chemią za 90 zł. Bez ewidencji
  zużycia rentowność jest zgadywana.
- **Wiedza o produkcie znika wraz z pracownikiem.** Detailer, który wie, że dany preparat
  gryzie się z konkretnym woskiem, odchodzi i zabiera to ze sobą.
- **Reklamacja nie ma dowodu.** „Czym to było robione rok temu?" — dziś odpowiedź brzmi
  „chyba tym".
- **Wpisywanie produktu ręcznie jest na tyle upierdliwe, że nikt tego nie robi.** Stąd
  wymóg skanowania: jeśli dodanie produktu trwa dłużej niż 15 sekund, moduł będzie pusty.

Czego w module **nie ma** w wersji pierwszej, świadomie: stanów magazynowych, zamówień do
dostawców, inwentaryzacji. To osobny produkt. Moduł produktów ma najpierw odpowiedzieć na
„co to jest, co o tym wiemy i gdzie tego użyliśmy". Stany magazynowe to naturalna faza
piąta (§13) i model danych jest pod nią przygotowany, ale nie jest teraz budowany.

---

## 2. Granice modułu i model danych

### 2.1 Dwie warstwy

Wymaganie mówi: *„wszystkie produkty muszą być współdzielone między wszystkimi
tenantami"*. Bierzemy je poważnie i realizujemy dosłownie — dla **specyfikacji produktu**.
Dane, które opisują butelkę stojącą na półce, są obiektywne: ta sama powłoka ma tę samą
nazwę, markę, pojemność i producenta niezależnie od tego, kto ją kupił. Trzymanie ich
osobno w każdym tenancie oznacza, że setne studio skanujące ten sam kod kreskowy płaci za
rozpoznanie tak samo jak pierwsze — a to jest dokładnie ta oszczędność, po którą warto
budować wspólny katalog.

```
┌──────────────────────────────────────────────────────────────────────┐
│  WARSTWA GLOBALNA — jeden wiersz na produkt, widoczny dla wszystkich │
│  products                                                            │
│    gtin, nazwa, marka, producent, jednostka miary,                   │
│    wielkość opakowania, gabaryty, opis katalogowy, zdjęcie,          │
│    ślad pochodzenia (skąd te dane), poziom weryfikacji               │
└──────────────────────────────────────────────────────────────────────┘
                                 ▲
                                 │ product_id
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────┴────────┐      ┌────────┴────────┐      ┌────────┴────────┐
│ NAKŁADKA       │      │ NOTATKI         │      │ ZUŻYCIE         │
│ STUDIA         │      │ product_notes   │      │ visit_products  │
│ product_studio │      │ (studio_id)     │      │ (studio_id)     │
│  cena zakupu   │      │ ocena:          │      │  wizyta,        │
│  dostawca      │      │ product_ratings │      │  ilość,         │
│  własna nazwa  │      │ (studio_id)     │      │  cena snapshot  │
│  ukryty u nas  │      │                 │      │                 │
└────────────────┘      └─────────────────┘      └─────────────────┘
        └────────── wszystko poniżej: PRYWATNE dla studia ───────────┘
```

### 2.2 Dlaczego cena, notatki i ocena nie mogą być globalne

To jedyne miejsce, w którym odchodzimy od dosłownego brzmienia wymagania, więc uzasadnienie
musi być mocne.

**Cena.** Studio A kupuje powłokę za 420 zł, studio B za 310 zł, bo ma lepszy rabat u
dystrybutora. Wspólny wiersz z ceną oznacza, że B widzi marżę A i odwrotnie. Studia
detailingowe w jednym mieście konkurują ze sobą bezpośrednio — ceny zakupu to tajemnica
przedsiębiorstwa w rozumieniu art. 11 ust. 2 u.z.n.k. Gdyby ktoś to zauważył po wdrożeniu,
jedynym wyjściem byłoby wyłączenie modułu.

**Notatki.** „Nie dawać tego na auta klienta X, reklamował" — to zdanie o kliencie, nie
o produkcie. Notatki nieuchronnie zawierają dane osobowe i wewnętrzne ustalenia. Wspólna
przestrzeń notatek to wyciek RODO w pierwszym tygodniu.

**Ocena.** Ocena jest opinią, i opinia studia A o produkcie ma dla studia B wartość
**tylko jako średnia z wielu studiów**, nigdy jako pojedynczy głos z podpisem. Dlatego:
ocena jest prywatna, a średnia społeczności to osobna, opcjonalna funkcja z progiem
anonimowości (§6.2).

**Co zostaje globalne i naprawdę na tym zyskujemy:** kod kreskowy, nazwa, marka, producent,
jednostka miary, wielkość opakowania, gabaryty, opis katalogowy, zdjęcie. Czyli wszystko,
co i tak jest wydrukowane na etykiecie. Drugie studio skanujące ten sam kod dostaje
komplet danych w 40 ms i za zero złotych.

### 2.3 Schemat bazy

Schemat powstaje z encji JPA (`spring.jpa.hibernate.ddl-auto=update`), a plik
`db/migration/V138__products_module.sql` jest **skryptem przeglądowym uruchamianym
ręcznie** — Flyway jest w tym repo wyłączony (`spring.flyway.enabled=false`). Skrypt
zawiera to, czego Hibernate nie zrobi: indeksy częściowe, ograniczenia `CHECK`,
`COMMENT ON` i ewentualne backfille. Taka jest realna konwencja repozytorium (patrz
`V99__customer_import.sql`), nie odstępstwo.

```sql
-- ── WARSTWA GLOBALNA ────────────────────────────────────────────────────────
-- Brak kolumny studio_id jest tu ŚWIADOMY i jest jedynym takim wyjątkiem w bazie.
-- Każdy przegląd bezpieczeństwa, który go znajdzie, ma trafić na ten komentarz.
CREATE TABLE products (
    id                      UUID PRIMARY KEY,

    -- Tożsamość. GTIN znormalizowany do 14 cyfr z wiodącymi zerami (GTIN-8/12/13 → 14),
    -- żeby ten sam produkt zapisany raz jako UPC-A, raz jako EAN-13 był jednym wierszem.
    gtin                    VARCHAR(14),

    name                    VARCHAR(200) NOT NULL,
    brand                   VARCHAR(120) NOT NULL,
    -- Właściciel licencji GTIN wg GS1 albo producent wpisany ręcznie.
    -- To NIE jest dostawca, u którego studio kupuje — ten siedzi w nakładce studia.
    manufacturer_name       VARCHAR(200) NOT NULL,

    -- Jednostka, w której MIERZY SIĘ ZUŻYCIE: ML, L, G, KG, PIECE, PAIR, M, M2.
    unit_of_measure         VARCHAR(10)  NOT NULL,

    -- „Wymiary opakowania" — dwa różne pojęcia, oba potrzebne (§14, decyzja otwarta).
    -- 1) Ile jest w opakowaniu. To ta liczba decyduje o koszcie zużycia.
    package_size_value      NUMERIC(12,3) NOT NULL,
    package_size_unit       VARCHAR(10)   NOT NULL,   -- ta sama dziedzina co unit_of_measure
    -- 2) Gabaryty fizyczne — z GS1 albo z miarki. Do planowania półki, opcjonalne.
    package_height_mm       INTEGER,
    package_width_mm        INTEGER,
    package_depth_mm        INTEGER,

    description             TEXT,
    image_file_id           VARCHAR(500),             -- S3, ten sam storage co zdjęcia wizyt

    -- ── Ślad pochodzenia. Bez tego katalog globalny nie da się moderować. ──
    source                  VARCHAR(20) NOT NULL,     -- MANUAL | AI | GS1 | CURATED
    verification_level      VARCHAR(20) NOT NULL,     -- UNVERIFIED | AI_SUGGESTED | GS1_VERIFIED | STUDIO_CONFIRMED | CURATED
    source_confidence       NUMERIC(4,3),             -- 0.000–1.000, wypełnione tylko dla source = AI
    source_payload          JSONB,                    -- surowa odpowiedź dostawcy, do audytu i reprocessingu
    resolved_at             TIMESTAMPTZ,

    -- Kto fizycznie utworzył wiersz. Trzymamy do moderacji i do cofania zatruć,
    -- ale NIE pokazujemy innym tenantom — to informacja o tym, kto czym pracuje.
    created_by_studio_id    UUID NOT NULL,
    created_by              UUID NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL,
    updated_by              UUID NOT NULL,
    updated_at              TIMESTAMPTZ NOT NULL,

    -- Miękkie usunięcie z katalogu globalnego — tylko moderacja. Studio ukrywa
    -- produkt u siebie przez product_studio.is_hidden, nie przez ten wiersz.
    is_withdrawn            BOOLEAN NOT NULL DEFAULT FALSE,
    withdrawn_reason        VARCHAR(300),

    CONSTRAINT chk_products_package_size_positive CHECK (package_size_value > 0)
);

-- Jeden produkt = jeden GTIN. To jest cały mechanizm deduplikacji katalogu.
CREATE UNIQUE INDEX uq_products_gtin ON products (gtin) WHERE gtin IS NOT NULL;

-- Produkty bez kodu (chemia przelewana, towar luzem) też muszą się deduplikować,
-- inaczej dziesięć studiów zrobi dziesięć „Pasta polerska 1kg". Klucz zapasowy:
-- znormalizowana (marka, nazwa, wielkość opakowania).
CREATE UNIQUE INDEX uq_products_natural_key
    ON products (LOWER(brand), LOWER(name), package_size_value, package_size_unit)
    WHERE gtin IS NULL;

CREATE INDEX idx_products_search ON products USING GIN (
    to_tsvector('simple', COALESCE(brand,'') || ' ' || COALESCE(name,'') || ' ' || COALESCE(manufacturer_name,''))
);
CREATE INDEX idx_products_brand ON products (LOWER(brand));

COMMENT ON TABLE products IS
    'Katalog globalny — wiersze WSPÓŁDZIELONE między wszystkimi tenantami. Brak studio_id jest zamierzony. Dane prywatne studia (cena, notatki, ocena, zużycie) leżą w tabelach product_studio / product_notes / product_ratings / visit_products, każda z własnym studio_id.';


-- ── NAKŁADKA STUDIA ─────────────────────────────────────────────────────────
CREATE TABLE product_studio (
    id                        UUID PRIMARY KEY,
    studio_id                 UUID NOT NULL,
    product_id                UUID NOT NULL REFERENCES products(id),

    -- Cena zakupu. Reguła brutto z CLAUDE.md §1 obowiązuje tu w całości (§5.2).
    -- Przechowujemy OBIE kwoty i kierunek, z którego przyszły.
    purchase_price_net_cents   BIGINT,
    purchase_price_gross_cents BIGINT,
    price_entered_as           VARCHAR(5),            -- NET | GROSS — źródło prawdy
    -- Dziedzina jak w VatRate (shared/ValueClasses.kt): 23 | 8 | 5 | 0 | -1 (zwolniony).
    -- -1 jest wartownikiem zwolnienia, nie stawką — zakup od podatnika zwolnionego
    -- z VAT jest realnym przypadkiem i CHECK nie ma prawa go odrzucić.
    vat_rate                   SMALLINT,

    supplier_name             VARCHAR(200),           -- u kogo TO studio kupuje
    internal_name             VARCHAR(200),           -- jak TO studio na to mówi
    internal_note             TEXT,                   -- jedna notatka „przyklejona", poza wątkiem notatek
    is_favourite              BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden                 BOOLEAN NOT NULL DEFAULT FALSE,   -- „nie używamy tego"

    created_by                UUID NOT NULL,
    created_at                TIMESTAMPTZ NOT NULL,
    updated_by                UUID NOT NULL,
    updated_at                TIMESTAMPTZ NOT NULL,

    -- Para cena/kierunek jest albo kompletna, albo pusta. Połowiczna cena to kwota,
    -- której nie da się pokazać bez policzenia jej po raz drugi — czyli dokładnie to,
    -- czego zakazuje CLAUDE.md §1.
    CONSTRAINT chk_product_studio_price_complete CHECK (
        (purchase_price_net_cents IS NULL AND purchase_price_gross_cents IS NULL
            AND price_entered_as IS NULL AND vat_rate IS NULL)
        OR
        (purchase_price_net_cents IS NOT NULL AND purchase_price_gross_cents IS NOT NULL
            AND price_entered_as IS NOT NULL AND vat_rate IS NOT NULL)
    ),
    CONSTRAINT chk_product_studio_vat CHECK (vat_rate IS NULL OR vat_rate IN (-1,0,5,8,23))
);
CREATE UNIQUE INDEX uq_product_studio ON product_studio (studio_id, product_id);
CREATE INDEX idx_product_studio_studio ON product_studio (studio_id) WHERE is_hidden = FALSE;


-- ── NOTATKI (nieskończenie wiele) ───────────────────────────────────────────
CREATE TABLE product_notes (
    id              UUID PRIMARY KEY,
    studio_id       UUID NOT NULL,
    product_id      UUID NOT NULL REFERENCES products(id),
    content         TEXT NOT NULL,
    -- Notatka może być powiązana z wizytą („na tym aucie wyszło tak") — wtedy
    -- pokazuje się w obu miejscach. NULL = notatka ogólna o produkcie.
    visit_id        UUID,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      UUID NOT NULL,
    created_by_name VARCHAR(200) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_by      UUID,
    updated_by_name VARCHAR(200),
    updated_at      TIMESTAMPTZ,
    deleted_by      UUID,
    deleted_at      TIMESTAMPTZ
);
CREATE INDEX idx_product_notes_lookup ON product_notes (studio_id, product_id, created_at DESC)
    WHERE is_deleted = FALSE;


-- ── OCENA (dokładnie jedna na produkt) ──────────────────────────────────────
CREATE TABLE product_ratings (
    id              UUID PRIMARY KEY,
    studio_id       UUID NOT NULL,
    product_id      UUID NOT NULL REFERENCES products(id),
    rating          SMALLINT NOT NULL,
    justification   VARCHAR(500),
    -- Kto ostatnio ustawił. Ocena należy do STUDIA, nie do osoby (§6.1),
    -- ale musi być wiadomo, kogo zapytać.
    rated_by        UUID NOT NULL,
    rated_by_name   VARCHAR(200) NOT NULL,
    rated_at        TIMESTAMPTZ NOT NULL,

    CONSTRAINT chk_product_ratings_range CHECK (rating BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX uq_product_ratings ON product_ratings (studio_id, product_id);


-- ── RELACJA WIELE-DO-WIELU: WIZYTA ↔ PRODUKT ────────────────────────────────
CREATE TABLE visit_products (
    id                      UUID PRIMARY KEY,
    studio_id               UUID NOT NULL,
    visit_id                UUID NOT NULL,
    product_id              UUID NOT NULL REFERENCES products(id),

    -- Ile zeszło. NUMERIC, nie integer: „0,3 butelki", „35 ml", „1,5 szt." to realne wpisy.
    quantity                NUMERIC(12,3) NOT NULL,
    quantity_unit           VARCHAR(10) NOT NULL,

    -- ── SNAPSHOT z momentu użycia. Nic tu nie jest wyliczane na odczycie. ──
    -- Wielkość opakowania też jest kopiowana: producent zmienia gramaturę,
    -- a ułamek zużytego opakowania ma zostać odtwarzalny.
    package_size_value      NUMERIC(12,3) NOT NULL,
    unit_price_net_cents    BIGINT,
    unit_price_gross_cents  BIGINT,
    price_entered_as        VARCHAR(5),
    vat_rate                SMALLINT,
    -- Koszt wyliczony RAZ, przy zapisie, przez skalowanie strony źródłowej (§5.2).
    cost_net_cents          BIGINT,
    cost_gross_cents        BIGINT,

    note                    VARCHAR(500),
    created_by              UUID NOT NULL,
    created_by_name         VARCHAR(200) NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL,

    CONSTRAINT chk_visit_products_qty_positive CHECK (quantity > 0)
);
-- Ten sam produkt może wystąpić na wizycie kilka razy (dwa etapy pracy, dwie osoby),
-- więc NIE ma tu klucza unikalnego na (visit_id, product_id). Agregujemy przy odczycie.
CREATE INDEX idx_visit_products_visit   ON visit_products (studio_id, visit_id);
CREATE INDEX idx_visit_products_product ON visit_products (studio_id, product_id, created_at DESC);


-- ── PROPOZYCJE KOREKT DO KATALOGU GLOBALNEGO ────────────────────────────────
CREATE TABLE product_correction_proposals (
    id              UUID PRIMARY KEY,
    product_id      UUID NOT NULL REFERENCES products(id),
    studio_id       UUID NOT NULL,
    proposed_fields JSONB NOT NULL,
    reason          VARCHAR(500),
    status          VARCHAR(20) NOT NULL,   -- PENDING | APPLIED | REJECTED | SUPERSEDED
    created_by      UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL,
    reviewed_by     UUID,
    reviewed_at     TIMESTAMPTZ,
    review_note     VARCHAR(500)
);
CREATE INDEX idx_product_proposals_pending ON product_correction_proposals (status, created_at)
    WHERE status = 'PENDING';


-- ── SESJE SKANOWANIA TELEFONEM (handoff desktop → telefon) ──────────────────
-- Wzorzec przeniesiony 1:1 z customer_import_sessions (V99) — łącznie z tym,
-- dlaczego token jest jednorazowy, a nie users.mobile_token.
CREATE TABLE product_scan_sessions (
    id              UUID PRIMARY KEY,
    studio_id       UUID NOT NULL,
    created_by      UUID NOT NULL,
    handoff_token   VARCHAR(128) NOT NULL,
    status          VARCHAR(20) NOT NULL,   -- OPEN | CONSUMED | EXPIRED
    -- Kody zebrane przez telefon, w kolejności skanowania, z czasem.
    scanned_codes   JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    consumed_at     TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_product_scan_sessions_token ON product_scan_sessions (handoff_token);
CREATE INDEX idx_product_scan_sessions_expiry ON product_scan_sessions (expires_at) WHERE status = 'OPEN';
```

### 2.4 Governance katalogu globalnego

Wspólna tabela bez `studio_id` ma jedną wadę, której nie da się obejść architekturą:
literówka jednego tenanta psuje widok wszystkim. Trzy zasady, które to trzymają w ryzach:

1. **Edycja in-place jest dozwolona tylko na własnym świeżym wpisie.** Produkt o poziomie
   `GS1_VERIFIED`, `STUDIO_CONFIRMED` lub `CURATED` nie jest edytowalny przez zwykłe
   `PATCH` — zamiast zapisu powstaje wiersz w `product_correction_proposals` i endpoint
   zwraca `202 Accepted` z informacją, że zgłoszenie trafiło do weryfikacji. Studio, które
   chce inną nazwę u siebie, ma `product_studio.internal_name` i dostaje ją natychmiast.
2. **Poziom weryfikacji rośnie tylko przez niezależne potwierdzenie** (§3.2). Nic nie awansuje
   samo z upływem czasu.
3. **Wycofanie jest odwracalne i zostawia ślad** — `is_withdrawn` plus powód. Produkt
   zniknięty z katalogu nie kasuje historii zużycia na wizytach; `visit_products` trzyma
   snapshot i pozostaje czytelne.

Kolejka moderacyjna jest ekranem wewnętrznym (poza CRM-em studia, na panelu operatora
platformy) — nie budujemy jej w fazie pierwszej, ale wiersze propozycji zbierają się
od pierwszego dnia, żeby po włączeniu panelu było na czym pracować.

---

## 3. Rozpoznawanie produktu po kodzie

### 3.1 Łańcuch i jego kolejność

Wymaganie: *baza → LLM → (gdy pewność < 90%) GS1*. Realizujemy dokładnie to.

```
              ┌──────────────────────────────────────────┐
  kod ───────▶│ 0. WALIDACJA LOKALNA                     │
              │    suma kontrolna GTIN, normalizacja      │──✗──▶ 422, zero kosztu
              │    do 14 cyfr                             │
              └────────────────┬─────────────────────────┘
                               ▼
              ┌──────────────────────────────────────────┐
              │ 1. KATALOG LOKALNY (products.gtin)       │──✓──▶ FOUND_LOCAL, ~40 ms, 0 zł
              └────────────────┬─────────────────────────┘
                               ▼ brak
              ┌──────────────────────────────────────────┐
              │ 2. LLM — „co to za produkt o GTIN X?"    │
              │    structured output + confidence         │
              └────────────────┬─────────────────────────┘
                               ▼
                     confidence ≥ 0,90 ?
                    ┌──────────┴──────────┐
                  tak                    nie
                    │                     ▼
                    │        ┌──────────────────────────────┐
                    │        │ 3. GS1 (Verified by GS1 /    │
                    │        │    GEPIR jako zapas)         │
                    │        └──────────────┬───────────────┘
                    │                       │
                    ▼                       ▼
        source = AI                  source = GS1
        verification = AI_SUGGESTED  verification = GS1_VERIFIED
                    └───────────┬───────────┘
                                ▼
                    zapis do katalogu globalnego
                    + zwrot karty do uzupełnienia przez człowieka
```

**Zastrzeżenie zespołu, zgłaszane wprost i tylko raz:** technicznie właściwsza kolejność to
GS1 przed LLM — GS1 jest rejestrem, a model językowy potrafi napisać wiarygodnie brzmiącą
kartę produktu, którego nigdy nie widział, i zrobi to również przy wysokiej deklarowanej
pewności. Kolejność z wymagania zostaje (jest szybsza, tańsza i pokrywa produkty, których
w GS1 nie ma), a ryzyko neutralizujemy trzema rzeczami zamiast zmianą kolejności:

- **krok 0** odrzuca kody z literówką, zanim cokolwiek kosztuje;
- **ślad pochodzenia** (§3.2) trzyma dane z LLM w osobnej, widocznej klasie zaufania;
- **kolejność jest konfiguracją**, nie kodem: `crm.products.resolution.order=LOCAL,AI,GS1`.
  Zmiana na `LOCAL,GS1,AI` to jedna właściwość w `application.properties`, bez deployu kodu.

### 3.2 Poziomy zaufania

| Poziom | Skąd | Co widzi użytkownik | Czy trafia do pola „gotowe" |
|---|---|---|---|
| `AI_SUGGESTED` | LLM, pewność ≥ 0,90 | Bursztynowa plakietka „Dane z AI — sprawdź etykietę" | Nie. Formularz jest wstępnie wypełniony, ale pola są edytowalne i wymagają zatwierdzenia |
| `GS1_VERIFIED` | Rejestr GS1 | Plakietka neutralna „GS1" | Tak |
| `STUDIO_CONFIRMED` | Człowiek potwierdził, że etykieta się zgadza | Bez plakietki | Tak |
| `CURATED` | Moderacja platformy | Bez plakietki | Tak |
| `UNVERIFIED` | Wpis w pełni ręczny | Plakietka szara „Wpisane ręcznie" | Tak, ale nie blokuje korekty in-place |

Reguła twarda, egzekwowana testem: **`AI_SUGGESTED` nigdy nie awansuje do `GS1_VERIFIED`
bez odpowiedzi z GS1, ani do `STUDIO_CONFIRMED` bez akcji człowieka.** Awans zapisuje, kto
i kiedy go wykonał.

Drugi mechanizm obronny: kiedy produkt z `AI_SUGGESTED` zostanie po raz pierwszy użyty na
wizycie, a osoba go zatwierdzająca niczego nie poprawiła — to **nie** jest potwierdzenie.
Potwierdzeniem jest wyłącznie jawne „dane się zgadzają z etykietą" w karcie produktu.
Milczenie nie jest zgodą, bo ludzie klikają „dalej".

### 3.3 Porty i adaptery

Struktura kopiuje moduł `gus` — jest w tym repozytorium sprawdzona i robi dokładnie to samo
zadanie (rozpoznanie podmiotu po identyfikatorze w rejestrze zewnętrznym).

```
pl.detailing.crm.product/
├── ProductController.kt
├── domain/               ProductSpec, ProductIdentity, Gtin, Provenance, UnitOfMeasure
├── port/                 ProductDataProvider        ← interfejs, jeden na dostawcę
├── adapter/
│   ├── local/            LocalCatalogProvider       (krok 1)
│   ├── ai/               AiProductProvider          (krok 2) + AiProductConfig
│   └── gs1/              Gs1ProductProvider         (krok 3) + GEPIR jako zapas
├── application/          ProductResolutionService   ← łańcuch, limity, cache
├── create/ update/ list/ get/   (handlery + walidatory, konwencja jak w `service/`)
├── notes/ rating/        handlery warstwy studia
├── usage/                VisitProductsController + handlery (relacja M:N)
├── scan/                 ProductScanSessionService + MobileProductScanController
└── infrastructure/       encje + repozytoria
```

```kotlin
/** Jeden dostawca danych o produkcie. Kolejność wywołań ustala konfiguracja. */
interface ProductDataProvider {
    val source: ProductSource
    suspend fun findByGtin(gtin: Gtin): ProductLookupResult?
}

data class ProductLookupResult(
    val spec: ProductSpec,
    val source: ProductSource,
    /** 0.0–1.0. Rejestry zwracają 1.0; tylko LLM zwraca wartość pośrednią. */
    val confidence: Double,
    val rawPayload: String?
)
```

`AiProductProvider` korzysta z istniejącej infrastruktury Spring AI (`ChatClient`,
`temperature = 0.0`, structured output) — dokładnie tak, jak `LeadVehicleExtractionService`.
Prompt pyta **wyłącznie** o produkt o podanym GTIN i wymaga wprost, żeby model zwrócił
`confidence: 0` zamiast zgadywać, gdy kodu nie zna; to jest sformułowanie, które w tym
repozytorium już działa („NIE ZGADUJ. Jeśli marki nie podano, zostaw pole puste").

### 3.4 Koszt, limity, cache

- **Cache globalny to sam katalog.** Drugi tenant skanujący ten sam kod nie wywołuje
  niczego zewnętrznego — to jest cały zwrot z inwestycji we wspólną tabelę.
- **Negatywny cache w Redis**, TTL 7 dni: kod, którego nie zna ani LLM, ani GS1, nie jest
  odpytywany ponownie przy każdym skanie. Klucz `product:lookup:miss:{gtin}`.
- **Limit dzienny na studio**: `crm.products.lookup.rate-limit.per-day=100`, konwencja
  z `crm.ai.lead-classification.rate-limit.per-day`. Przekroczenie → `429` z czytelnym
  komunikatem i propozycją wpisania ręcznego, nigdy cicha awaria.
- **Twardy budżet miesięczny platformy** z alarmem — jedno studio nie może przepalić
  budżetu wszystkim.
- **Timeouty:** LLM 8 s, GS1 5 s. Po timeoucie łańcuch idzie dalej, a przy całkowitym
  niepowodzeniu użytkownik dostaje pusty formularz z wpisanym kodem, nie błąd.

**Zależność operacyjna do domknięcia przed fazą 3:** „Verified by GS1" wymaga umowy
licencyjnej z GS1; GEPIR jest dostępny szerzej, ale zwraca głównie dane licencjobiorcy
(nazwa firmy, kraj), bez nazwy handlowej i pojemności. Moduł działa bez GS1 — traci
wtedy krok 3, a produkty o niskiej pewności lądują w formularzu do ręcznego uzupełnienia.
Adapter jest tak zaprojektowany, żeby brak umowy był konfiguracją (`gs1.enabled=false`),
a nie blokadą wdrożenia.

---

## 4. Trzy drogi wprowadzenia produktu

Wszystkie trzy prowadzą do **jednego formularza** — różnią się tylko tym, skąd biorą się
wartości początkowe. To nie jest oszczędność kodu, tylko decyzja UX: użytkownik, który raz
nauczy się karty produktu, nie uczy się jej drugi raz dla innej ścieżki.

### 4.1 Ręcznie

Formularz z polami z §2.3. Wymagane: nazwa, marka, jednostka miary, wielkość opakowania,
nazwa firmy. Opcjonalne: opis, cena, dostawca, zdjęcie. Marka i jednostka to pola
z podpowiedziami z istniejącego katalogu (`PickerList`), żeby nie mnożyć wariantów zapisu.

### 4.2 Kod kreskowy wpisany lub „wstrzelony" skanerem

Skaner USB/Bluetooth w studiu zachowuje się jak klawiatura: wysyła ciąg cyfr i `Enter`.
Komponent `BarcodeField` rozpoznaje tę sytuację po tempie zdarzeń (kilkanaście znaków
w < 120 ms) i sam uruchamia pobranie — bez klikania. Ta sama kontrolka obsługuje wpisanie
ręczne i przycisk **„Pobierz dane"**.

Walidacja sumy kontrolnej dzieje się **na froncie, natychmiast**, zanim poleci
jakiekolwiek żądanie: `src/modules/products/utils/gtin.ts`. Kod z literówką dostaje
komunikat od razu, a serwer nie płaci za rozpoznanie śmiecia. Serwer waliduje powtórnie —
front jest wygodą, nie zabezpieczeniem.

### 4.3 Skan telefonem

Dwa różne scenariusze, świadomie rozdzielone:

**(a) Telefon jako urządzenie pracy (zalogowana sesja).** Użytkownik jest w CRM-ie na
telefonie, wchodzi w „Dodaj produkt → Skanuj". Otwiera się kamera:

```ts
// Preferujemy natywne API przeglądarki — zero kilobajtów w bundlu.
// Fallback (WASM) ładujemy leniwie i tylko tam, gdzie natywnego nie ma,
// dokładnie jak pdf.js w module podpisów.
const detector = 'BarcodeDetector' in window
    ? new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] })
    : await import('./zxingFallback').then(m => m.createDetector());
```

Na iOS Safari `BarcodeDetector` nie jest dostępny — fallback WASM jest tam ścieżką główną,
nie awaryjną, i musi być przetestowany na realnym iPhonie przed wydaniem. Wzorzec
uczciwego komunikatu zamiast martwego przycisku mamy już w `MobileContactsImportView`.

**(b) Desktop deleguje skanowanie do telefonu.** Użytkownik siedzi przy komputerze bez
kamery. Klika „Skanuj telefonem" → pojawia się kod QR → telefon wchodzi na
`/m/scan?s=<handoffToken>` (trasa **publiczna**, bez logowania) → skanuje dowolną liczbę
kodów → desktop widzi je na żywo.

Ten przepływ jest kopią wzorca z importu kontaktów (`customer_import_sessions`, V99),
łącznie z jego najważniejszą decyzją: **`handoff_token` jest jednorazowy i wygasa**
(15 minut), a nie jest stałym `users.mobile_token` — zdjęcie ekranu z kodem QR nie może
dawać komuś bezterminowego prawa wysyłania danych do studia.

Transport wyników: `STOMP` przez istniejący `socketClient`, z odpytywaniem co 3 s jako
zapas (w studiach bywa słaby WiFi i to nie jest hipoteza). Ładunek sesji leży w bazie,
nie w pamięci przeglądarki — zamknięcie karty na desktopie nie kasuje pracy telefonu.

---

## 5. Relacja wizyta ↔ produkt i pieniądze

### 5.1 Zużycie jako snapshot

Wymaganie: relacja wiele-do-wielu. Realizujemy przez `visit_products`, ale **nie jako
gołą tabelę łączącą** — bo sama informacja „użyto produktu X" nie odpowiada na pytanie,
dla którego ta ewidencja powstaje, czyli „ile ta wizyta naprawdę kosztowała".

Dlatego wiersz zużycia niesie: ilość, jednostkę, wielkość opakowania z momentu użycia,
cenę jednostkową z momentu użycia i wyliczony koszt. Ten sam produkt może wystąpić na
wizycie wielokrotnie (dwa etapy, dwie osoby) — brak klucza unikalnego jest celowy.

Kierunek odwrotny („do jednego produktu wiele wizyt") to ten sam wiersz czytany po
`product_id` — sekcja „Gdzie tego używaliśmy" w karcie produktu, zawężona do wizyt tego
studia.

### 5.2 Reguła brutto (CLAUDE.md §1) w tym module

To jest **powierzchnia pieniężna** i obowiązuje na niej cała reguła kierunkowa. Trzy
konsekwencje, których nie wolno pominąć:

**(1) Cena zakupu przechowuje kierunek.** Człowiek wpisuje albo netto, albo brutto.
Wpisana kwota jest zapisywana bez zmian, druga strona jest liczona **raz, przy zapisie**,
przez `VatRate.netCentsFromGrossCents` / `calculateGrossAmount`. Na odczycie nie liczymy
niczego. Kolumna `price_entered_as` jest tym, co pozwala to utrzymać przy zmianie stawki
VAT za dwa lata.

**(2) Koszt zużycia skaluje stronę źródłową.** Zużycie to ułamek opakowania, więc koszt
jest liczbą wyliczoną — to legalne, bo nikt jej nie wpisywał. Kierunek jednak ma znaczenie:

```kotlin
// DOBRZE — skalujemy tę stronę, którą ustalił człowiek; druga wynika z niej.
val ratio = quantity / packageSizeValue
val cost = when (priceEnteredAs) {
    GROSS -> {
        val gross = scale(unitPriceGrossCents, ratio)          // źródło prawdy
        Cost(netCents = vatRate.netCentsFromGrossCents(gross), grossCents = gross)
    }
    NET -> {
        val net = scale(unitPriceNetCents, ratio)              // źródło prawdy
        Cost(netCents = net, grossCents = vatRate.calculateGrossAmount(Money.fromCents(net)).amountInCents)
    }
}
val vat = cost.grossCents - cost.netCents    // VAT to RÓŻNICA, nigdy osobne mnożenie
```

Z tego wynika niezmiennik, który musi mieć test: **zużycie całego opakowania kosztuje
dokładnie tyle, ile wpisano** — przy `ratio = 1,0` skalowanie jest tożsamością, więc cena
wpisana jako 1900,00 zł brutto daje koszt 1900,00 zł brutto, a nie 1900,01 zł. Gdyby
koszt liczyć z netta, ta sama wizyta pokazałaby o grosz więcej i reguła z CLAUDE.md §1
byłaby złamana w nowym miejscu.

**(3) Sumy sumują strony osobno.** Koszt materiału na wizycie to `Σ cost_net` i
`Σ cost_gross`, a VAT to różnica tych sum. Nigdy suma VAT-ów z pozycji.

**Do naprawy przy okazji (zlecenie stałe z CLAUDE.md §1):** przegląd kodu nie znalazł
w istniejących plikach naruszeń reguły brutto poza tymi, które CLAUDE.md już wymienia jako
znane wzorce poprawne. Nowy moduł **nie pisze własnej arytmetyki VAT** — front korzysta
z `src/common/utils/priceAdjustment.ts`, backend z `VatRate` w `shared/ValueClasses.kt`.
`src/modules/products/utils/unitCost.ts` zawiera wyłącznie skalowanie ułamkiem i deleguje
konwersje do `priceAdjustment.ts`.

### 5.3 Granica: koszt materiału nie jest kosztem klienta

**`visit_products` nie dotyka `totalCost` wizyty.** To jest twarda granica, nie preferencja:
`totalCost` jest kwotą, którą klient zobaczy na protokole wydania i na fakturze. Wrzucenie
tam butelki chemii zmieniłoby kwotę uzgodnioną z klientem — czyli dokładnie ten rodzaj
szkody, przed którym broni CLAUDE.md §1.

Koszt materiału płynie osobnym kanałem: do modułu `costs`/`statistics`, jako składnik
rentowności wizyty. Tam jest jego miejsce i tam ma wartość.

---

## 6. Notatki i ocena

### 6.1 Notatki

Nieskończona liczba, wzorzec 1:1 z `visit_comments` i `VehicleNotes`: treść, autor,
znacznik czasu, miękkie usunięcie, pełny audyt edycji. Dwa rozszerzenia względem wzorca:

- **Notatka może być przypięta do wizyty** (`visit_id`). Wtedy widać ją i w karcie
  produktu, i w karcie wizyty. To jest najczęstszy realny moment powstania notatki:
  „właśnie to nałożyłem i wyszło tak".
- **Notatki są prywatne dla studia.** Zawsze. Bez opcji udostępnienia.

### 6.2 Ocena

Jedna ocena na produkt (1–5) plus opcjonalne jednozdaniowe uzasadnienie.

**Ocena należy do studia, nie do osoby.** Uzasadnienie: w trzyosobowym studiu ocena „nasza
opinia o tym preparacie" jest jedna i wspólna; gdyby była per-użytkownik, karta produktu
pokazywałaby trzy różne liczby i nie odpowiadałaby na pytanie „brać to jeszcze raz czy
nie". Zapisujemy jednak, kto ostatnio ustawił i kiedy — żeby było wiadomo, kogo zapytać,
i żeby nadpisanie cudzej oceny nie było anonimowe. Zmiana oceny wymaga uprawnienia
`PRODUCTS_MANAGE` i trafia do dziennika aktywności.

**Średnia społeczności (faza 5, opcjonalna).** Wartość tego modułu rośnie skokowo, jeśli
studio widzi „4,6 — z 23 studiów". Warunki, bez których tego nie włączamy: minimum
**5 studiów** w próbce (próg anonimowości), brak jakiejkolwiek możliwości zidentyfikowania
głosu, i przełącznik opt-out na poziomie studia. Poniżej progu pole nie istnieje —
nie pokazuje „brak danych", tylko go nie ma.

---

## 7. Abonament i uprawnienia

Wymaganie stawia dwa niezależne warunki: moduł ma być osobno **kupowany** i osobno
**nadawany w roli**. To dokładnie te dwa poziomy, które system już rozróżnia
(`CapabilityKey` = co studio kupiło, `Permission` = co wolno człowiekowi), więc nie
dokładamy trzeciego mechanizmu.

### 7.1 Warstwa abonamentowa

```kotlin
// FeatureKey.kt
PRODUCTS("Produkty i zużycie materiałów"),

// domain/EntitlementDomain.kt
PRODUCTS_MODULE("Produkty i zużycie materiałów"),

// capability/Capability.kt
PRODUCTS_ACCESS(
    "Moduł produktów",
    setOf(FeatureKey.PRODUCTS)
),
```

Rejestracja w `EntitlementDataSeeder`: nowy dodatek **29,00 zł/mies.**, wchodzący również
w skład pakietu FULL. Po dodaniu: BASIC + wszystkie dodatki = 384,00 zł wobec FULL za
299,00 zł — relacja opisana w komentarzu seedera („pakiet jest tańszy niż składanka")
zostaje zachowana, więc nie trzeba przy okazji przeliczać cennika.

Cena 29 zł jest rekomendacją zespołu, nie ustaleniem: moduł ma realny koszt krańcowy
(zapytania LLM/GS1), ale ten koszt spada wraz z zapełnianiem wspólnego katalogu, więc
plasowanie go przy `MARKETING_CAMPAIGNS` (29) zamiast przy `FINANCE_MODULE` (49) jest
bezpieczniejsze przy wejściu. Do potwierdzenia — §14.

Kontrolery modułu dostają `@RequiresCapability(CapabilityKey.PRODUCTS_ACCESS)` na klasie.
Skutkiem dla studia bez wykupionego modułu jest `402` z gotowym ładunkiem sprzedażowym,
a na froncie — `ModuleGate` z rozmytą demonstracją zamiast pustki. Ten mechanizm już
działa i niczego w nim nie zmieniamy.

### 7.2 Warstwa uprawnień

```kotlin
// PermissionModule.kt
PRODUCTS("Produkty", FeatureKey.PRODUCTS),

// Permission.kt — nowa gałąź
PRODUCTS_VIEW(
    PermissionModule.PRODUCTS, "Podgląd katalogu produktów",
    description = "Lista produktów, karta produktu, notatki i oceny studia. " +
        "Bez cen zakupu — te wymagają osobnego uprawnienia."
),
PRODUCTS_USAGE(
    PermissionModule.PRODUCTS, "Ewidencja zużycia na wizytach",
    parent = PRODUCTS_VIEW,
    description = "Przypisywanie produktów do wizyt i wpisywanie zużytych ilości."
),
PRODUCTS_MANAGE(
    PermissionModule.PRODUCTS, "Dodawanie i edycja produktów",
    parent = PRODUCTS_VIEW,
    description = "Dodawanie produktów (ręcznie, z kodu, ze skanu), edycja danych, " +
        "notatki i ocena studia."
),
PRODUCTS_COSTS(
    PermissionModule.PRODUCTS, "Ceny zakupu i koszt materiału",
    parent = PRODUCTS_VIEW,
    description = "Ceny jednostkowe, koszt materiału na wizycie i w statystykach. " +
        "Marża studia — osobno od reszty modułu."
);
```

Implikacja międzymodułowa (`PermissionHierarchy.implications`):

```kotlin
Permission.PRODUCTS_USAGE to setOf(Permission.VISITS_VIEW),
```

**Dlaczego `PRODUCTS_VIEW` jest niezależnym korzeniem, wbrew konwencji „każdy korzeń spoza
wizyt implikuje `VISITS_CREATE`".** Ta sama argumentacja, którą kod już przyjął dla
`BATCH_ORDERS`. Zaopatrzeniem w studiu zajmuje się często osoba, która nie siedzi na
recepcji: zamawia chemię, pilnuje cen u dystrybutorów, prowadzi katalog. Nie ma żadnego
powodu, żeby przy okazji dostała kartotekę klientów i kalendarz — a implikacja
`VISITS_CREATE` dałaby jej jedno i drugie. W drugą stronę: detailer, który **ewidencjonuje
zużycie**, musi widzieć wizytę, do której to wpisuje — stąd `PRODUCTS_USAGE → VISITS_VIEW`,
i celowo `VISITS_VIEW`, a nie `VISITS_CREATE`: wpisanie zużycia nie jest umawianiem wizyty.

Niezmienniki katalogu pozostają spełnione: każde dziecko jest w module rodzica, moduł ma
korzeń, implikacja przecina moduły (co `impliesOf` dopuszcza).

Lustro na froncie: `src/core/permissions/catalog.ts` — cztery nowe kody plus skrót
`ANY_PRODUCTS`.

### 7.3 Kto co widzi

| Rola w studiu | Uprawnienia | Katalog | Cena zakupu | Dodawanie | Zużycie na wizycie |
|---|---|---|---|---|---|
| Detailer | `PRODUCTS_VIEW`, `PRODUCTS_USAGE` | tak | **nie** | nie | tak |
| Osoba od zaopatrzenia | `PRODUCTS_VIEW`, `PRODUCTS_MANAGE`, `PRODUCTS_COSTS` | tak | tak | tak | nie |
| Kierownik / właściciel | całość (właściciel z pominięciem sprawdzeń) | tak | tak | tak | tak |
| Recepcja bez modułu | brak | nie widzi pozycji w menu | — | — | — |

Ukrycie ceny nie jest maskowaniem na froncie: endpointy nie wypuszczają pól
`purchasePrice*` ani `cost*` bez `PRODUCTS_COSTS`, a front nie ma czego ukryć.

---

## 8. Kontrakt API

Wszystkie kwoty w **groszach (integer)**, zgodnie z `docs/pricing-api-contract.md` §1.1.
Wszystkie ścieżki pod `/api/v1`, sesja jak w reszcie systemu.

### 8.1 Katalog

| Metoda | Ścieżka | Uprawnienie | Opis |
|---|---|---|---|
| `GET` | `/products` | `PRODUCTS_VIEW` | Lista. Parametry: `search`, `brand`, `onlyOurs`, `onlyFavourite`, `includeHidden`, `page`, `limit`, `sortBy`, `sortDirection`. Sortowanie i stronicowanie **po stronie serwera** |
| `GET` | `/products/{id}` | `PRODUCTS_VIEW` | Karta: warstwa globalna + nakładka studia + ocena + skrót notatek |
| `POST` | `/products` | `PRODUCTS_MANAGE` | Dodanie. `409` gdy GTIN już istnieje — z `existingProductId`, żeby front mógł od razu zaproponować otwarcie tamtego |
| `PATCH` | `/products/{id}` | `PRODUCTS_MANAGE` | Edycja pól globalnych. `200` dla wpisów edytowalnych, `202` + `proposalId` dla zweryfikowanych (§2.4) |
| `PUT` | `/products/{id}/studio` | `PRODUCTS_MANAGE` (cena dodatkowo `PRODUCTS_COSTS`) | Nakładka studia: cena, dostawca, własna nazwa, ulubiony, ukryty |
| `POST` | `/products/{id}/confirm` | `PRODUCTS_MANAGE` | „Dane zgadzają się z etykietą" → `STUDIO_CONFIRMED` |

### 8.2 Rozpoznawanie

```http
POST /api/v1/products/lookup
{ "barcode": "5901234123457" }
```

```jsonc
// 200 — znalezione w katalogu
{
  "status": "FOUND_LOCAL",
  "product": { /* pełna karta */ },
  "provenance": { "source": "GS1", "verificationLevel": "GS1_VERIFIED", "confidence": null }
}

// 200 — rozpoznane zewnętrznie i zapisane do katalogu globalnego
{
  "status": "RESOLVED",
  "product": { /* karta do zatwierdzenia przez człowieka */ },
  "provenance": { "source": "AI", "verificationLevel": "AI_SUGGESTED", "confidence": 0.94 }
}

// 200 — nierozpoznane; front otwiera pusty formularz z wpisanym kodem
{ "status": "NOT_FOUND", "product": null, "provenance": null }
```

Kody błędów: `422` niepoprawna suma kontrolna GTIN · `429` limit dzienny studia ·
`402` brak modułu · `403` brak uprawnienia.

### 8.3 Notatki i ocena

| Metoda | Ścieżka | Uprawnienie |
|---|---|---|
| `GET` | `/products/{id}/notes` | `PRODUCTS_VIEW` |
| `POST` | `/products/{id}/notes` | `PRODUCTS_MANAGE` |
| `PATCH` | `/products/{id}/notes/{noteId}` | `PRODUCTS_MANAGE` (autor lub właściciel) |
| `DELETE` | `/products/{id}/notes/{noteId}` | `PRODUCTS_MANAGE` |
| `PUT` | `/products/{id}/rating` | `PRODUCTS_MANAGE` — upsert, `{ "rating": 4, "justification": "…" }` |
| `DELETE` | `/products/{id}/rating` | `PRODUCTS_MANAGE` |

### 8.4 Relacja z wizytami

| Metoda | Ścieżka | Uprawnienie | Opis |
|---|---|---|---|
| `GET` | `/api/visits/{visitId}/products` | `PRODUCTS_VIEW` + `VISITS_VIEW` | Zużycie na wizycie; `cost*` tylko z `PRODUCTS_COSTS` |
| `POST` | `/api/visits/{visitId}/products` | `PRODUCTS_USAGE` | Dopisanie zużycia (ilość + jednostka); serwer robi snapshot ceny |
| `PATCH` | `/api/visits/{visitId}/products/{linkId}` | `PRODUCTS_USAGE` | Korekta ilości/notatki; **nie** przelicza snapshotu ceny |
| `DELETE` | `/api/visits/{visitId}/products/{linkId}` | `PRODUCTS_USAGE` | |
| `GET` | `/products/{id}/visits` | `PRODUCTS_VIEW` | Wizyty tego studia, na których użyto produktu |

### 8.5 Sesja skanowania

| Metoda | Ścieżka | Dostęp | Opis |
|---|---|---|---|
| `POST` | `/products/scan-sessions` | `PRODUCTS_MANAGE` | → `{ sessionId, handoffToken, handoffUrl, expiresAt }` |
| `GET` | `/products/scan-sessions/{id}` | `PRODUCTS_MANAGE` | Odpytywanie zapasowe wobec WebSocketa |
| `DELETE` | `/products/scan-sessions/{id}` | `PRODUCTS_MANAGE` | Zamknięcie sesji |
| `GET` | `/mobile/products/scan/{handoffToken}` | **publiczny**, token | Kontekst dla telefonu: nazwa studia, ile kodów już przyszło |
| `POST` | `/mobile/products/scan/{handoffToken}` | **publiczny**, token | `{ "codes": ["5901234123457"] }` — idempotentne po kodzie w obrębie sesji |

Kanał WebSocket: `/topic/studio/{studioId}/product-scan/{sessionId}`.

---

## 9. Frontend

### 9.1 Struktura modułu

Pionowy plaster, zgodnie z `.masterPrompt.txt` §4 i układem pozostałych modułów:

```
src/modules/products/
├── api/
│   ├── productsApi.ts            # katalog + nakładka studia
│   ├── productNotesApi.ts        # notatki i ocena
│   ├── productUsageApi.ts        # relacja z wizytami
│   ├── productScanApi.ts         # sesje skanowania (desktop + publiczne mobilne)
│   └── productQueries.ts         # klucze i hooki TanStack Query
├── components/
│   ├── ProductTable.tsx          # desktop ≥ lg
│   ├── ProductGrid.tsx           # karty < lg
│   ├── ProductSearchFilter.tsx
│   ├── ProductFilterPanel.tsx
│   ├── AddProductModal.tsx       # JEDEN modal, trzy ścieżki
│   ├── BarcodeField.tsx          # skaner USB + wpis ręczny + „Pobierz dane"
│   ├── CameraScanner.tsx         # lazy: BarcodeDetector / WASM
│   ├── ScanHandoffPanel.tsx      # kod QR + nasłuch wyników
│   ├── ProductIdentityCard.tsx
│   ├── ProductProvenanceBadge.tsx
│   ├── ProductRatingBlock.tsx
│   ├── ProductNotes.tsx
│   ├── ProductVisitsSection.tsx
│   ├── ProductPriceSection.tsx   # renderuje się tylko z PRODUCTS_COSTS
│   └── VisitProductsSection.tsx  # osadzane w widoku wizyty
├── hooks/
│   ├── useProducts.ts  useProductDetail.ts  useProductSearch.ts
│   ├── useProductLookup.ts  useBarcodeScanner.ts  useScanHandoff.ts
│   ├── useProductNotes.ts  useProductRating.ts  useVisitProducts.ts
├── utils/
│   ├── gtin.ts                   # suma kontrolna, normalizacja do GTIN-14
│   ├── unitCost.ts               # koszt zużycia — deleguje do priceAdjustment.ts
│   └── productFormat.ts          # „500 ml", „0,3 opak.", „12,40 zł / 100 ml"
├── views/
│   ├── ProductListView.tsx
│   ├── ProductDetailView.tsx
│   └── MobileProductScanView.tsx # trasa publiczna /m/scan
├── types.ts
└── index.ts
```

Trzy nowe pliki poza modułem: wpisy w `core/router.tsx`, cztery kody w
`core/permissions/catalog.ts`, pozycja w `widgets/Sidebar/Sidebar.tsx`. Plus osadzenie
`VisitProductsSection` w widoku wizyty. Nic więcej istniejącego nie jest ruszane.

### 9.2 Trasy i nawigacja

```tsx
const PRODUCTS_BENEFITS = [
    'Katalog preparatów z danymi pobieranymi z kodu kreskowego',
    'Notatki i ocena zespołu przy każdym produkcie',
    'Zużycie materiału na wizycie i realny koszt roboty',
];

// wewnątrz children: — moduł płatny, więc gatedPage, nie page
{ path: '/products',     element: gatedPage(<ProductListView />,   'PRODUCTS', PRODUCTS_BENEFITS, 'PRODUCTS_VIEW') },
{ path: '/products/:id', element: gatedPage(<ProductDetailView />, 'PRODUCTS', PRODUCTS_BENEFITS, 'PRODUCTS_VIEW') },

// trasa publiczna, obok /m/upload, /m/contacts, /m/voice
{ path: '/m/scan', element: <MobileProductScanView /> },
```

`ProductDetailView` i `CameraScanner` ładujemy leniwie (`lazyNamedWithRetry`) — dekoder
WASM nie ma prawa wejść do głównego bundla, tak samo jak pdf.js w module podpisów.

**Sidebar:** nowa sekcja `Studio` z jedną pozycją, przygotowana pod rozrost (stany
magazynowe, sprzęt):

```ts
{
    title: 'Studio',
    items: [
        { path: '/products', label: 'Produkty', icon: Package, requires: 'PRODUCTS_VIEW' },
    ],
},
```

Świadomie nie dokładamy pozycji do „Baza klientów" (tam mieszkają klienci i ich pojazdy —
produkt nie jest niczyją własnością) ani do „Główne" (to ciąg pracy: wizyta → kalendarz →
galeria → poczta).

**BottomNav** zostaje bez zmian. Pasek ma cztery skróty i jest dla ekranów, do których
wraca się co kilka minut; katalog produktów taki nie jest. Na telefonie wchodzi się w
produkty z menu, a najczęstsza akcja mobilna — „zeskanuj i dodaj" — ma własny, szybszy
punkt wejścia w nagłówku listy.

### 9.3 Widoki

**`ProductListView`** — konstrukcja skopiowana z `VehicleListView`, bo rozwiązuje ten sam
problem i użytkownik zna już te ruchy:

```
PageContainer
├── PageHeader (desktop) / MobilePageHeader (telefon)
│     tytuł „Produkty" + TotalChip z liczbą + PageHeaderPrimaryButton „Dodaj produkt"
├── ProductSearchFilter          — szukajka + skrótowe chipy (Nasze / Ulubione / Z AI)
├── ProductFilterPanel           — marka, jednostka, zakres ceny, poziom weryfikacji
├── useBreakpoint('lg')
│     ? <ProductTable />         — nazwa+marka, opakowanie, producent, cena, ocena, użycia
│     : <ProductGrid />          — karty: nazwa, marka, opakowanie, gwiazdki, cena
├── EmptyState                   — osobny tekst dla „pusty katalog" i „nic nie znaleziono"
└── Pagination
```

Kolumna z ceną i cały filtr ceny znikają bez `PRODUCTS_COSTS` — nie są wyszarzane, tylko
ich nie ma. Wyszarzona kolumna mówi „to tu jest, ale ci nie pokażemy", co jest gorsze niż
brak kolumny.

**`ProductDetailView`** — dwie kolumny na desktopie, stos na telefonie:

```
DetailHero            nazwa · marka · opakowanie · plakietka pochodzenia · gwiazdki
──────────────────────────────────────────────────────────────────────────────────
lewa kolumna (dowody)                    prawa kolumna (to, po co się tu wraca)
  Specyfikacja        (płasko)             ╔════════════════════════════════════╗
  Cena i koszt jedn.  (płasko, tylko       ║  DOŚWIADCZENIE STUDIA              ║
                       z PRODUCTS_COSTS)   ║  ocena + uzasadnienie              ║
  Gdzie używaliśmy    (płasko)             ║  notatki (nieskończenie wiele)     ║
                                           ╚════ JEDYNA wyniesiona sekcja ══════╝
```

Na telefonie kolejność się odwraca — „Doświadczenie studia" idzie pierwsze, a nawigację
między sekcjami bierze wspólny `MobileSectionNav`. To ten sam świadomy zabieg, co
w podglądzie leada: na telefonie „kolejność" znaczy „ile trzeba przewinąć".

**`VisitProductsSection`** — osadzana w karcie wizyty, płaska sekcja z listą zużycia,
przyciskiem „Dodaj produkt" (obwódka, nie wypełnienie — w oknie wizyty krokiem następnym
jest co innego) i sumą kosztu materiału widoczną tylko z `PRODUCTS_COSTS`.

**`MobileProductScanView`** — ciemny, jednozadaniowy ekran na wzór
`MobileContactsImportView`: podgląd kamery, licznik zeskanowanych kodów, lista ostatnich
trzech, przycisk „Gotowe". Bez menu, bez nawigacji, bez niczego do kliknięcia obok.

### 9.4 Responsywność

| Zakres | Lista | Karta produktu | Dodawanie |
|---|---|---|---|
| < 640 px | karty, jedna kolumna | stos, `MobileSectionNav`, „Doświadczenie" na górze | arkusz pełnoekranowy, `useVisualViewportSheet` pod klawiaturę |
| 640–1023 px | karty, dwie kolumny | stos, szersze karty | arkusz |
| ≥ 1024 px | tabela | dwie kolumny | modal `ModalKit` |

Skanowanie kamerą jest dostępne wszędzie, gdzie przeglądarka daje strumień wideo (również
na laptopie z kamerką); handoff przez QR pokazuje się tylko tam, gdzie kamery nie ma —
inaczej byłby to trzeci przycisk konkurujący o to samo zadanie.

### 9.5 Hierarchia wizualna (CLAUDE.md §2)

Reguły stosujemy dosłownie, bo ten moduł ma dokładnie ten układ, w którym się je łamie:
listę z wieloma pozycjami i formularz z kilkoma drogami.

**Jedno wypełnienie na okno.**

| Okno | Jedyny wypełniony element | Co ma odcień bez wypełnienia |
|---|---|---|
| Lista produktów | `PageHeaderPrimaryButton` „Dodaj produkt" | chipy filtrów, „Skanuj", plakietki pochodzenia, gwiazdki ocen |
| Karta produktu | brak — okno jest do czytania; akcje edycji mają obwódki | „Edytuj", „Oceń", „Dodaj notatkę", „Potwierdź dane" |
| Karta wizyty | przycisk kroku następnego wizyty, już istniejący | „Dodaj produkt" w sekcji zużycia |
| Modal dodawania | **kontekstowo jeden**: przed pobraniem `Pobierz dane`, po pobraniu `Dodaj produkt` | druga z tych dwóch akcji degraduje się do obwódki |

Ostatni wiersz jest tym, o który najłatwiej się potknąć. W ścieżce „kod kreskowy" krokiem
następnym jest najpierw pobranie danych, a dopiero potem zapis. Gdyby oba przyciski były
wypełnione jednocześnie, dostalibyśmy remis — a tu akurat kolejność jest oczywista i
interfejs ma ją pokazać, a nie zaciemnić. Modal jest stanem przejściowym, więc korzysta
z wyjątku „otwarty edytor" z CLAUDE.md §2.

**Jedno wyniesienie na kolumnę.** W karcie produktu wyniesiona jest wyłącznie sekcja
„Doświadczenie studia". Wybór jest argumentowany: specyfikację produktu można odczytać
z etykiety na butelce, a tego, co nasi ludzie o nim napisali i jak go ocenili, nie ma
nigdzie indziej. To jest przedmiot tego okna. Specyfikacja, cena i historia użyć leżą
płasko i rozdziela je odstęp.

**Liczba jako nagłówek.** Cena jednostkowa i koszt za mililitr są nagłówkami swojej sekcji
(duża liczba, nazwa pod spodem), a rozbicie na netto/VAT/brutto jest dowodem pod nią.
Nie robimy z nich etykiety pola — to lekarstwo na „wszystko jest płaskie i tekstowe"
opisane w CLAUDE.md §2.

**Wersaliki 11 px.** Nowy moduł ich nie używa jako jedynego oznaczenia sekcji. Nagłówki
sekcji to pismo tekstowe z kafelkiem ikony, zgodnie z kierunkiem przyjętym w podglądzie
leada.

### 9.6 i18n

Wszystkie napisy w `src/common/i18n/pl.ts` pod kluczem `products`, zgodnie z regułą
externalizacji z `.masterPrompt.txt` §5. Dotyczy również komunikatów o pochodzeniu danych
(„Dane z AI — sprawdź etykietę") i błędów skanowania.

---

## 10. Bezpieczeństwo i wielotenantowość

Katalog globalny jest jedynym miejscem w systemie bez `studio_id`, więc lista kontrolna
musi być jawna:

1. **Każde zapytanie o dane prywatne filtruje po `studio_id` z sesji.** `product_studio`,
   `product_notes`, `product_ratings`, `visit_products` — bez wyjątku, również w zapytaniach
   agregujących. Test integracyjny (§12.4) sprawdza to od strony API, nie repozytorium.
2. **`products.created_by_studio_id` nie wychodzi na zewnątrz.** Informacja, kto dodał
   produkt do katalogu, mówi konkurencji, czym pracujemy. Pole służy wyłącznie moderacji.
3. **Ceny i koszty nie opuszczają serwera bez `PRODUCTS_COSTS`.** Filtrowanie na poziomie
   mapowania odpowiedzi, nie na froncie.
4. **Token handoffu jest jednorazowy i krótkoterminowy** (15 min), a jego trafienie jest
   logowane. Endpointy `/api/mobile/products/scan/*` przyjmują wyłącznie kody kreskowe —
   nie ma tam żadnej ścieżki do danych studia poza nazwą wyświetlaną na ekranie telefonu.
5. **Ograniczenie tempa na endpointach publicznych** sesji skanowania: 60 kodów/min na
   sesję. Skaner nie nadaje szybciej, a bot owszem.
6. **Dane osobowe nie mają prawa trafić do katalogu globalnego.** Pola globalne to
   specyfikacja produktu; notatki (jedyne miejsce, gdzie ludzie naturalnie wpiszą nazwisko
   klienta) są prywatne z definicji. Prompt LLM dostaje **wyłącznie GTIN** — nigdy nazwy
   studia, klienta ani kontekstu wizyty.
7. **Audyt.** Dodanie produktu, zmiana oceny, zmiana ceny i wpisanie zużycia trafiają do
   dziennika aktywności (moduł `audit`), bo dotyczą pieniędzy i wspólnego zasobu.

---

## 11. Wydajność i obserwowalność

- **Lista:** stronicowanie i sortowanie po stronie serwera (`.masterPrompt.txt` §3.3).
  Wyszukiwanie po indeksie GIN `to_tsvector`, nie po `LIKE '%…%'` — katalog globalny rośnie
  liniowo wraz z liczbą tenantów, więc zaczyna być duży szybciej niż jakakolwiek tabela
  w tym systemie.
- **Karta produktu:** jedno zapytanie łączące warstwę globalną z nakładką studia; notatki
  i historia użyć dociągane osobno (leniwie, po wejściu w sekcję).
- **Cache:** `products` po `gtin` w Redis, TTL 24 h, unieważniany przy zapisie. Negatywny
  cache nierozpoznanych kodów — §3.4.
- **Metryki do wystawienia od pierwszego dnia:**
  `products.lookup.{local_hit|ai_hit|gs1_hit|miss}`, koszt zapytań AI na studio i łącznie,
  rozkład `confidence`, odsetek kart poprawianych przez człowieka po rozpoznaniu AI
  (to najwcześniejszy sygnał, że model zaczyna zmyślać), czas od skanu do zapisu produktu.
- **Alarmy:** przekroczenie miesięcznego budżetu AI, wzrost odsetka poprawek po AI powyżej
  ustalonego progu, spadek dostępności GS1.

---

## 12. Testy pilnujące niezmienników

Testy nie są tu listą życzeń — każdy odpowiada konkretnej rzeczy, której złamanie kosztuje
pieniądze albo zaufanie.

1. **`src/modules/products/utils/gtin.test.ts`** — suma kontrolna EAN-13/EAN-8/UPC-A,
   normalizacja do GTIN-14, odrzucenie kodu z przestawioną cyfrą. To brama przed płatnym
   zapytaniem.
2. **`src/modules/products/utils/unitCost.test.ts`** — *zużycie całego opakowania kosztuje
   dokładnie tyle, ile wpisano*: cena 190000 gr brutto przy 23% i `ratio = 1,0` daje
   190000, nie 190001. Dodatkowo: VAT jako różnica, suma pozycji sumująca strony osobno.
3. **`ProductResolutionChainTest`** (backend) — kolejność LOCAL → AI → GS1; pewność 0,89
   schodzi do GS1, 0,90 nie schodzi; brak odpowiedzi z obu źródeł zwraca `NOT_FOUND`
   i **nie zapisuje** niczego zmyślonego.
4. **`ProductTenantIsolationTest`** (backend, integracyjny po API) — studio B widzi ten sam
   wiersz katalogu, a **nie widzi** ceny, notatek, oceny ani zużycia studia A; nie widzi
   też `createdByStudioId`.
5. **`ProductProvenanceTest`** — `AI_SUGGESTED` nie awansuje bez potwierdzenia; awans
   zapisuje autora i czas.
6. **`VisitProductsCostTest`** — koszt materiału **nie wchodzi** do `totalCost` wizyty;
   snapshot ceny nie zmienia się po zmianie ceny w katalogu.
7. **`PermissionCatalogTest`** (istniejący) — po dodaniu modułu nadal: każde dziecko
   w module rodzica, każdy moduł ma korzeń, `close()` idempotentne.
8. **`ProductCostsVisibilityTest`** — odpowiedź API bez `PRODUCTS_COSTS` nie zawiera pól
   cenowych (asercja na treści JSON, nie na obiekcie domenowym).

Reguła z CLAUDE.md obowiązuje: **żadnego z tych testów nie wolno osłabić, żeby przepuścić
zmianę.**

---

## 13. Plan wdrożenia

| Faza | Zakres | Co działa po fazie | Zależności zewnętrzne |
|---|---|---|---|
| **1. Fundament** | Model danych (globalny + nakładka), uprawnienia, moduł abonamentowy, lista i karta produktu (desktop + mobile), dodawanie ręczne, notatki, ocena | Studio prowadzi katalog i wiedzę o preparatach. Moduł jest sprzedawalny | brak |
| **2. Wizyty** | `visit_products`, sekcja w karcie wizyty, „gdzie używaliśmy" w karcie produktu, koszt materiału | Rentowność wizyty przestaje być zgadywana | brak |
| **3. Rozpoznawanie** | Walidacja GTIN, „Pobierz dane", łańcuch LOCAL → AI → GS1, ślad pochodzenia, limity i cache | Dodanie produktu skraca się z ~2 min do ~15 s | klucz LLM (jest), **umowa GS1 (do domknięcia)** |
| **4. Skan telefonem** | Kamera w aplikacji (BarcodeDetector + WASM), sesja handoffu, QR, `/m/scan` | Dodawanie produktu przy półce, bez komputera | testy na realnym iPhonie |
| **5. Dojrzewanie** | Panel moderacji katalogu, średnia społeczności (próg 5 studiów), stany magazynowe i alerty | Katalog utrzymuje jakość bez ręcznej pracy zespołu | decyzja o opt-in społeczności |

Fazy 1–2 dają moduł, który sprzedaje się sam i nie zależy od niczego na zewnątrz. Fazy 3–4
są tym, co odróżnia go od arkusza kalkulacyjnego. Kolejność jest tak dobrana, żeby w razie
opóźnienia umowy z GS1 nic się nie zablokowało.

---

## 14. Ryzyka i decyzje do potwierdzenia

### Ryzyka

| Ryzyko | Skutek | Co z tym robimy |
|---|---|---|
| LLM zmyśla dane produktu przy wysokiej deklarowanej pewności | Zatruty katalog u wszystkich tenantów naraz | Ślad pochodzenia, brak awansu bez potwierdzenia, metryka odsetka poprawek po AI, możliwość odwrócenia kolejności jedną właściwością |
| Brak umowy „Verified by GS1" | Krok 3 nie działa, gorsze pokrycie | `gs1.enabled=false` — moduł działa bez niego; GEPIR jako częściowy zapas |
| Zatrucie katalogu przez literówkę tenanta | Wszyscy widzą błędne dane | Brak edycji in-place na wpisach zweryfikowanych, propozycje korekt, wycofanie z powodem |
| Przepalenie budżetu zapytań przez jedno studio | Koszt platformy | Limit dzienny na studio, budżet miesięczny z alarmem, negatywny cache |
| iOS bez `BarcodeDetector` | Połowa telefonów nie skanuje | Dekoder WASM jako ścieżka główna na iOS, przetestowana przed wydaniem; uczciwy komunikat zamiast martwego przycisku |
| Wyciek cen zakupu | Utrata zaufania, ryzyko prawne | Rozdział warstw (§2.2), filtrowanie cen na poziomie odpowiedzi, test integracyjny |

### Decyzje dla biznesu

Sześć rzeczy, których nie da się rozstrzygnąć z kodu. Przy każdej jest rekomendacja
zespołu — jeśli nie ma odmiennej decyzji, wdrażamy rekomendację.

1. **„Wymiary opakowania" — pojemność czy gabaryty?** Modelujemy **oba**
   (`package_size_*` i `package_*_mm`), więc żadne odczytanie nie jest błędne.
   *Rekomendacja:* wymagana jest pojemność (500 ml, 5 l, 1 kg) — to ona decyduje o koszcie
   zużycia; gabaryty opcjonalne, uzupełniane z GS1.
2. **„Nazwa firmy" — producent czy dostawca?** Modelujemy oba: `manufacturer_name`
   w warstwie globalnej (z GS1), `supplier_name` w nakładce studia.
   *Rekomendacja:* wymagany producent, dostawca opcjonalny.
3. **Ocena: jedna na studio czy jedna na osobę?**
   *Rekomendacja:* jedna na studio, z zapisem kto ostatnio ustawił (§6.2).
4. **Średnia społeczności — wdrażać?**
   *Rekomendacja:* tak, ale dopiero w fazie 5, z progiem 5 studiów i możliwością wypisania.
5. **Cena modułu w cenniku.**
   *Rekomendacja:* 29,00 zł/mies., wliczony w FULL (§7.1).
6. **Koszt materiału w rentowności wizyty — od razu?**
   *Rekomendacja:* tak, w fazie 2, ale wyłącznie w statystykach i kosztach. Na dokumencie
   klienta nie pojawia się nigdy (§5.3).

---

## 15. Co ten dokument świadomie pomija

Żeby nie było wątpliwości, że o tym nie pomyślano:

- **Stany magazynowe i zamówienia** — faza 5, model danych jest pod to przygotowany
  (`visit_products` daje rozchód, wystarczy dołożyć przychód).
- **Wielowalutowość** — cały system jest na PLN; moduł nie wprowadza wyjątku.
- **Odczyt paragonów/faktur zakupowych** (OCR → automatyczne ceny) — kuszące i naturalnie
  pasujące do modułu `finance`, ale to osobny projekt.
- **Normy zużycia** („na sedana idzie 30 ml") — ma sens dopiero, gdy uzbiera się historia
  z fazy 2. Wtedy liczy się je z danych, a nie wpisuje ręcznie.
