# Wydanie pojazdu - przeprojektowanie flow

Dokument projektowy. Zakres: przejścia `IN_PROGRESS → READY_FOR_PICKUP` oraz
`READY_FOR_PICKUP → COMPLETED` wraz z wystawieniem dokumentu sprzedaży.
Implementacja: osobne zadania, wg faz z sekcji 8.

---

## 1. Streszczenie

Wydanie pojazdu to z perspektywy recepcji **jedno zdarzenie przy ladzie**, przy
kliencie, który czeka. Aplikacja rozbija je dziś na **dwa kreatory, pięć ekranów
i jeden modal zagnieżdżony w modalu**. Trzy z pięciu ekranów nie zbierają żadnych
danych - są rytuałem klikania „dalej".

Wydanie z fakturą dla firmy kosztuje dziś ok. **8 kliknięć i 4 pola przepisane
ręcznie** (NIP, nazwa, ulica, kod i miasto) - mimo że NIP i adres firmy **są już
w kartotece klienta**, a system i tak dokleja NIP po stronie backendu, tylko bez
pokazania tego użytkownikowi.

Propozycja: zastąpić kreator **jednym ekranem decyzyjnym z gotowymi
odpowiedziami**. Wszystko widoczne od razu, każdy blok edytowalny w miejscu,
jeden przycisk kończący. Ścieżka nominalna: **2 kliknięcia, zero pól**.

| | dziś | cel |
|---|---|---|
| Kliknięcia: oznaczenie gotowości | 3 | 2 |
| Kliknięcia: wydanie + faktura firmowa | ~8 | 2 |
| Pola przepisywane ręcznie | 4 | 0 |
| Modali otwartych jednocześnie | 2 | 1 |
| Ekranów bez zbierania danych | 3 | 0 |

Przy 15 wydaniach dziennie to ok. **90 kliknięć i 60 przepisanych pól dziennie**
mniej.

---

## 2. Jak to wygląda dziś

### Etap A - „Oznacz jako gotowe" (`InProgressToReadyWizard`)

```
[Wydaj pojazd / Oznacz jako gotowe] w nagłówku wizyty
   │
   ├─ Krok 1/2  Weryfikacja jakości
   │     3 checkboxy, WSZYSTKIE zaznaczone domyślnie
   │     [Wymaga poprawek]            [Zatwierdź jakość]
   │
   └─ Krok 2/2  Powiadomienie klienta
         SMS ✓ / Email ✓
         [Wstecz] [Pomiń]             [Wyślij i kontynuuj]
```

### Etap B - „Wydaj pojazd" (`ReadyToCompletedWizard`)

```
[Wydaj pojazd]
   │
   ├─ Krok 1/3  Odprawa klienta          (read-only; pomijany gdy brak komentarzy)
   │     lista komentarzy FOR_CUSTOMER
   │                                      [Kontynuuj]
   │
   ├─ Krok 2/3  Podpis protokołu
   │     🚧 „Funkcjonalność dostępna wkrótce"
   │     [Podpisano] ← w treści        i  [Podpisano] ← w stopce (to samo)
   │
   └─ Krok 3/3  Finalizacja płatności
         Metoda płatności:  ( Gotówka )( Karta ✓)( Przelew )( BLIK )( BLIK term. )
                            ← pięć równorzędnych pigułek, każdą trzeba przeczytać
         Dokument:          ( Faktura VAT ✓)( Paragon )( Inny )
         ┌─ Faktura KSeF: 1 722,00 zł · nabywca: Jan Kowalski  [Wprowadź zmiany] ─┐
         │                                                                        │
         │   ▼ MODAL W MODALU (xl) - InvoiceAdjustmentModal                       │
         │     • dane firmy (gdy niekompletne - formularz + osobny zapis)         │
         │     • Nabywca: NIP □ / nazwa □ / ulica □ / kod+miasto □   ← 4 pola     │
         │     • Pozycje: nazwa / netto / brutto / VAT / usuń  + dodaj            │
         │     • Podstawa zwolnienia (gdy „zw")                                   │
         │     • Pasek bilansu + „reszta paragonem" + 5 pigułek metody reszty     │
         │     [Anuluj]                              [Zapisz zmiany]              │
         └────────────────────────────────────────────────────────────────────────┘
                                                [Zatwierdź i wydaj pojazd]
   │
   └─ toast
```

Po zakończeniu: **toast i nic więcej**. Brak ekranu potwierdzenia, brak numeru
dokumentu do pokazania klientowi, brak akcji „wyślij fakturę mailem".

---

## 3. Diagnoza

### P1 - Kroki, które nic nie zapisują

**Weryfikacja jakości nie trafia nigdzie.** W `useStateTransition.ts:52` stan
nazywa się `_qualityChecks` (podkreślnik = nieużywany), a payload przejścia to
wyłącznie `{ sms, email }` (`stateTransitionApi.markReadyForPickup`). Backend
`MarkVisitReadyForPickupHandler` przyjmuje tylko `sendSms` / `sendEmail`.
Wszystkie trzy checkboxy są domyślnie zaznaczone, więc krok nawet nie blokuje -
jedyne, co robi, to odblokowuje przycisk, który i tak jest odblokowany.

**To ekran, którego jedyną funkcją jest istnienie.** Realna bramka jakości już
działa gdzie indziej: `VisitDetailView.tsx:816` blokuje przejście, gdy są usługi
w statusie `PENDING`, i podświetla je na liście. To jest sensowna kontrola.

**Odprawa klienta** (`ClientBriefingStep`) jest read-only - to informacja, nie
decyzja. Informacja nie zasługuje na własny ekran w kreatorze; zasługuje na
sekcję.

### P2 - „Wymaga poprawek" to ślepy zaułek

`TransitionWizards.tsx:41` - `handleQualityReject` = `handleClose(); onClose();`.
Przycisk zamyka okno bez śladu: bez cofnięcia statusu, bez notatki, bez zadania
dla pracownika. Użytkownik, który go kliknie, dostaje dokładnie to samo co po
naciśnięciu X.

### P3 - Podpis, którego nie ma, raportowany jako uzyskany

`SignatureStep` to placeholder z plakietką „🚧 Funkcjonalność dostępna wkrótce",
ale kliknięcie „Podpisano" wysyła `signatureObtained: true`
(`useStateTransition.ts:88`). System twierdzi, że protokół został podpisany,
choć nic nie zostało podpisane.

To nie jest tylko dług UX - to **ryzyko dowodowe**. Przy sporze o stan pojazdu
po wydaniu w bazie stoi flaga „podpis uzyskany", której nie da się poprzeć
niczym.

Jednocześnie backend **ma gotowy moduł podpisu na tablecie**:
`SignatureRequestController` (`POST /api/v1/visits/{visitId}/protocols/{protocolId}/signature-requests`),
z kanałem tabletu i SMS, ze zdarzeniami po WebSocket. Front używa go już w
check-inie (`checkin/components/SigningRequirementModal.tsx`,
`checkin/hooks/useSignatureRequestsSocket.ts`). W wydaniu pojazdu - nie.

### P4 - Faktura: przepisywanie danych, które system już ma

**Kartoteka klienta zawiera NIP i adres firmy.** `CustomerEntity` ma
`companyNip`, `companyAddressStreet`, `companyAddressCity`,
`companyAddressPostalCode`. Ale DTO detalu wizyty `CustomerInfoResponse`
(`GetVisitDetailDtos.kt:80`) zwraca tylko `id / firstName / lastName / email /
phone / companyName / stats`. **Front fizycznie nie ma czym prefillować** - więc
pole NIP w `InvoiceAdjustmentModal` startuje puste, przy każdym wydaniu, dla
tego samego stałego klienta.

**Interfejs pokazuje co innego, niż zostanie wystawione.** Kafelek w
`PaymentStep.tsx:276` renderuje `invoice.buyerNip ? 'NIP …' : (buyerName ??
'konsument')`. Skoro pole NIP jest puste, kafelek mówi np. „nabywca: Jan
Kowalski". Tymczasem `CompleteVisitInvoiceOrchestrator.kt:213` robi:

```kotlin
val buyerNip = invoice.buyer.nip?…  ?: customer?.companyNip?…
```

- czyli **backend i tak dokleja NIP z kartoteki**. Wystawiona faktura jest B2B,
a użytkownik był przekonany, że wystawia dla konsumenta. Rozjazd między tym, co
widać, a tym, co się dzieje, jest gorszy niż sama niewygoda: podważa zaufanie do
całego modułu.

**Adres nabywcy nigdy nie jest prefillowany i nie ma fallbacku.** `addressLine1`
/ `addressLine2` idą do `IssueRevenueInvoiceHandler` jako `null`, jeśli nikt ich
nie wpisze. KSeF ich nie wymaga (walidacja sprawdza tylko 10 cyfr NIP lub
nazwisko konsumenta), więc faktury dla firm wychodzą **bez adresu nabywcy** -
cicho, bez ostrzeżenia.

**GUS jest podłączony i nieużywany.** `gusApi.getCompanyByNip` zwraca nazwę,
adres, REGON, status aktywności. W tym flow nie jest wywoływany ani razu.

**Walidacja sprzedawcy przychodzi na końcu.** Dane firmy (nazwa + NIP studia)
sprawdzane są dopiero po otwarciu zagnieżdżonego modala
(`InvoiceAdjustmentModal.tsx:302`), czyli w ostatnim możliwym momencie - przy
kliencie stojącym przy ladzie. Backend rzuca tę samą walidację
(`CompleteVisitInvoiceOrchestrator.kt:126`). Powinna być widoczna zanim
ktokolwiek zacznie wydawać.

### P5 - Utrata pracy przy zamknięciu

`handleClose()` (`useStateTransition.ts:144`) czyści `wizardData` i wraca do
kroku 1. Escape, kliknięcie w tło albo X - i wszystko, co wpisano w fakturze,
znika. Bez pytania, bez draftu.

### P6 - Fałszywy pasek postępu

Trzy nakładające się korekty numeracji w `TransitionWizards.tsx:161-172`:

```ts
const effectiveTotalSteps = totalSteps - (isFreeVisit ? 1 : 0);
const displayStep         = skipBriefing ? currentStep - 1 : currentStep;
const displayTotalSteps   = effectiveTotalSteps - (skipBriefing ? 1 : 0);
useEffect(() => { if (isOpen && currentStep === 1 && skipBriefing) handleNext(); }, …);
```

Pasek pokazuje „1/2", gdy wewnętrznie jesteśmy w kroku 2 z 3. Przy wizycie
bezpłatnej stopka mówi „Zatwierdź i wydaj pojazd", a w treści stoi drugi
przycisk „Podpisano" robiący dokładnie to samo. Konstrukcja jest krucha -
każdy kolejny warunek pomijania kroku pomnoży liczbę przypadków brzegowych.

### P7 - Podział płatności sklejony z podziałem dokumentu

Dziś jedyny sposób na „500 zł kartą, reszta gotówką" to mechanizm
`remainderPaymentMethod`, który **jednocześnie tworzy drugi dokument
(paragon)**. To dwa różne pojęcia sklejone w jedno:

- **podział płatności** - jedna sprzedaż, jeden dokument, dwie formy zapłaty;
- **podział dokumentu** - faktura na firmę na część kwoty + paragon na resztę.

Realne scenariusze recepcji (karta + gotówka, wcześniejsza zaliczka, dopłata)
wymagają pierwszego, a system oferuje wyłącznie drugi - schowany w
zagnieżdżonym modalu, pod przyciskiem „Resztę kwoty pokryj drugim dokumentem".

### P8 - Brak domknięcia po wydaniu

- Sukces → toast. Numer faktury przemyka i znika.
- KSeF `REJECTED` → wizyta **jest zakończona**, faktura odrzucona, a użytkownik
  dostaje komunikat „Szczegóły znajdziesz w Finanse → Faktury KSeF"
  (`useStateTransition.ts:111`). Zostaje z zamkniętą wizytą i zepsutym
  dokumentem, bez akcji naprawczej w miejscu, w którym się znajduje -
  **mimo że endpoint `POST /api/…/invoices/{id}/retry` już istnieje**.
- Brak „wyślij fakturę mailem", brak „drukuj protokół wydania".

### P9 - Rozproszone źródła danych ekranu

Ekran płatności składa stan z: `useVisitDetail` + `useVisitComments` +
`useServicePricing` + `companyApi.getCompanySettings` (leniwie, dopiero w
zagnieżdżonym modalu). Stąd migotanie i późna walidacja. Jedno zapytanie
kontekstowe rozwiązuje oba problemy naraz.

---

## 4. Zasady projektowe nowego flow

1. **Domyślne odpowiedzi zamiast pytań.** System proponuje komplet decyzji;
   użytkownik potwierdza lub punktowo zmienia. Nie pytamy o nic, co możemy
   wywnioskować z kartoteki, ustawień studia albo historii.
2. **Wszystko widoczne, szczegóły zwinięte.** Użytkownik widzi pełny zakres
   zobowiązania przed kliknięciem. Zwijamy tylko to, co w 90% przypadków jest
   poprawne (pozycje faktury), nigdy samą decyzję.
3. **Zero modali w modalach.** Edycja odbywa się w miejscu (accordion), w tym
   samym oknie.
4. **Interfejs nie kłamie.** To, co widać na kafelku nabywcy, jest dokładnie
   tym, co pójdzie do KSeF. Żadnych cichych fallbacków po stronie serwera bez
   odzwierciedlenia w UI.
5. **Blokady na wejściu, nie na wyjściu.** Brakujące dane firmy, brak NIP
   nabywcy przy fakturze B2B - sygnalizowane, zanim użytkownik zacznie.
6. **Praca się nie gubi.** Zamknięcie okna zachowuje stan.
7. **Każda ścieżka ma domknięcie.** Także ta nieudana.

---

## 5. Nowy projekt - etap A: „Pojazd gotowy"

Z dwóch kroków robi się **jedno potwierdzenie**.

```
┌─ Pojazd gotowy do odbioru ───────────────────────────────── [×] ─┐
│                                                                   │
│  BMW X5 (WW 12345) · Jan Kowalski · Wizyta #2024/0417            │
│                                                                   │
│  Powiadom klienta                                                 │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ ☑ SMS      +48 601 234 567                                │   │
│  │ ☑ Email    jan.kowalski@example.com                       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ⓘ Wszystkie 4 usługi potwierdzone.                              │
│                                                                   │
│  Cofnij do realizacji            [Powiadom i oznacz jako gotowe]  │
└───────────────────────────────────────────────────────────────────┘
```

**Zmiany:**

- **Krok „Weryfikacja jakości" znika.** Nie zapisywał danych i nie blokował
  niczego. Kontrola, która realnie działa - blokada przy usługach `PENDING` -
  zostaje bez zmian i dostaje jedną linijkę statusu na tym ekranie.
  *Jeśli biznes chce zachować weryfikację jako fakt audytowalny*, to trzeba ją
  zbudować od nowa: jeden checkbox + zapis do audytu z imieniem pracownika i
  znacznikiem czasu. Trzy checkboxy, które nigdzie nie trafiają, to nie kontrola
  jakości, tylko jej pozór - patrz decyzja **D1** w sekcji 10.
- **„Wymaga poprawek" → „Cofnij do realizacji"** - realna akcja: przywraca
  `IN_PROGRESS` i wymusza notatkę wewnętrzną (jednowierszowe pole pojawiające
  się po kliknięciu). Alternatywa: usunąć przycisk. Ślepy zaułek nie zostaje.
- Kanały powiadomień: prefill jak dziś; e-mail wyszarzony, gdy brak adresu.
  „Pomiń" znika - odznaczenie obu checkboxów daje ten sam efekt, a przycisk
  zmienia się wtedy na „Oznacz jako gotowe".

**Koszt: 2 kliknięcia** (otwarcie + potwierdzenie), zamiast 3.

---

## 6. Nowy projekt - etap B: „Wydanie pojazdu"

Jeden ekran, stopka przyklejona, przycisk główny dostępny od pierwszej sekundy.

```
┌─ Wydanie pojazdu ────────────────────────────────────────── [×] ─┐
│  BMW X5 (WW 12345) · Jan Kowalski · Wizyta #2024/0417            │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ① DO PRZEKAZANIA KLIENTOWI                          (2)  ▾      │
│     ┌───────────────────────────────────────────────────────┐    │
│     │ Anna Nowak · 14.08, 11:20                             │    │
│     │ Zalecana korekta lakieru na masce w przyszłym sezonie.│    │
│     ├───────────────────────────────────────────────────────┤    │
│     │ Piotr Wiśniewski · 14.08, 13:05                       │    │
│     │ Powłoka wymaga 48 h bez mycia.                        │    │
│     └───────────────────────────────────────────────────────┘    │
│     - sekcja nie pojawia się, gdy brak komentarzy dla klienta -   │
│                                                                   │
│  ② ROZLICZENIE                                                    │
│     ┌───────────────────────────────────────────────────────┐    │
│     │  Do zapłaty                            1 722,00 zł    │    │
│     │  netto 1 400,00 · VAT 322,00                          │    │
│     └───────────────────────────────────────────────────────┘    │
│                                                                   │
│     Zapłacono   (Karta ✓)(Gotówka)(Inna metoda ▾)                │
│                 ⌐ Podziel płatność                                │
│                                                                   │
│     Dokument    (Paragon)(Faktura VAT ✓)(Bez dokumentu)          │
│                                                                   │
│     ┌─ Faktura ─────────────────────────────────────────────┐    │
│     │ Nabywca                                                │    │
│     │ ACME Sp. z o.o. · NIP 521-301-72-28                   │    │
│     │ ul. Kwiatowa 3, 00-001 Warszawa            [Zmień]    │    │
│     │ ─────────────────────────────────────────────────────  │    │
│     │ Pozycje   3 · zgodne z usługami · 1 722,00 zł  ▸Edytuj│    │
│     │ ─────────────────────────────────────────────────────  │    │
│     │ Trafi do KSeF automatycznie po wydaniu.                │    │
│     └───────────────────────────────────────────────────────┘    │
│                                                                   │
│  ③ PROTOKÓŁ WYDANIA                                               │
│     ┌───────────────────────────────────────────────────────┐    │
│     │ 📄 Protokół wydania pojazdu       👁   🖨   💬   📱   │    │
│     └───────────────────────────────────────────────────────┘    │
│          podgląd · wydruk · na telefon klienta · na tablet       │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│                          [ Wydaj pojazd i wystaw fakturę ]        │
└───────────────────────────────────────────────────────────────────┘
```

### Co się zmienia względem dziś

| dziś | nowy projekt |
|---|---|
| 3 kroki kreatora | 1 ekran, 3 sekcje |
| Odprawa jako osobny krok z przyciskiem | Sekcja u góry, bez akcji |
| Podpis: placeholder + wymagane kliknięcie | Sekcja z realnym tabletem albo jawną deklaracją |
| Faktura: modal w modalu | Sekcja rozwijana w miejscu |
| NIP i adres: 4 puste pola | Wiersz nabywcy wypełniony z kartoteki |
| „Zatwierdź i wydaj pojazd" po 3 ekranach | Przycisk widoczny od otwarcia |
| Toast na koniec | Ekran potwierdzenia z akcjami |

### Sekcja ② - rozliczenie, stany

**Wiersz nabywcy** - cztery stany, wszystkie rozstrzygane automatycznie:

| stan | co widzi użytkownik | akcja |
|---|---|---|
| Klient ma NIP w kartotece | `ACME Sp. z o.o. · NIP 521-301-72-28 · ul. Kwiatowa 3, 00-001 Warszawa` | `[Zmień]` |
| Klient bez NIP | `Faktura dla konsumenta: Jan Kowalski` | `[To firma - podaj NIP]` |
| Po wpisaniu 10 cyfr NIP | spinner → dane z GUS → nazwa + adres, `☑ Zapisz w kartotece klienta` | - |
| GUS niedostępny | pola ręczne z komunikatem „Nie udało się pobrać z GUS - uzupełnij ręcznie" | - |

Zasada **„interfejs nie kłamie"**: cokolwiek stoi w tym wierszu, dokładnie to
idzie do KSeF. Cichy fallback `?: customer?.companyNip` po stronie serwera
zostaje jako zabezpieczenie, ale przestaje być jedyną drogą, którą NIP trafia na
fakturę - front ustala nabywcę jawnie i wysyła komplet.

**Pozycje faktury** - domyślnie zwinięte do jednej linijki
(`3 · zgodne z usługami · 1 722,00 zł`). Rozwinięcie pokazuje dzisiejszą tabelę
(nazwa / netto / brutto / VAT / usuń / dodaj) **w tym samym oknie**, z paskiem
bilansu przyklejonym do dołu sekcji. Cała logika kwotowa
(`mode: NET | GROSS`, „kwota wpisana jest źródłem prawdy", VAT „w stu")
przechodzi bez zmian - jest poprawna i zgodna z backendem.

**Podział płatności - odłożony (D5).** Sekcja zapłaty ma jedną formę na całość;
lista wpłat wejdzie osobno. Podział **dokumentu** (faktura na część kwoty +
paragon na resztę) zostaje i działa jak dotąd, ale wyszedł z zagnieżdżonego
modala do sekcji faktury: pasek bilansu pokazuje różnicę, a wybór metody
płatności reszty pojawia się dopiero po kliknięciu „Resztę udokumentuj
paragonem". Rozróżnienie z P7 zostaje w mocy jako kierunek - dopóki lista wpłat
nie powstanie, podział dokumentu pozostaje jedynym sposobem na dwie formy
zapłaty.

**„Bez dokumentu"** - dzisiejsze `Inny` mapuje się na `DocumentType.OTHER`
i tworzy dokument z prefiksem `DOK`. Etykieta „Inny" nie mówi nic; zmiana na
opis tego, co realnie się stanie - patrz decyzja **D3**.

### Sekcja ③ - protokół

Wiersz dokumentu identyczny jak w modalu „Dokumentacja i Podpisy" przy
przyjęciu pojazdu - ta sama maszyneria, te same akcje:

```
 ┌──────────────────────────────────────────────────────────────┐
 │ 📄  Protokół wydania pojazdu        👁  🖨  💬  📱          │
 └──────────────────────────────────────────────────────────────┘
        podgląd · wydruk · wysyłka na telefon klienta · na tablet
```

- **Podgląd** otwiera `DocumentPreview`, **wydruk** - wypełniony PDF.
- **Telefon klienta** wysyła SMS z linkiem do podpisu, **tablet** kieruje na
  sparowane urządzenie (przy kilku - lista wyboru). Obie drogi to istniejący
  `POST /api/v1/visits/{visitId}/protocols/{protocolId}/signature-requests`.
- Status podpisu przychodzi na żywo po WebSockecie; po zerwaniu połączenia
  stan jest dopytywany. Po podpisie ikona zmienia się w ✓, po odrzuceniu
  pojawia się „Ponów" na tym samym kanale.
- Protokoły etapu `CHECK_OUT` generujemy przy otwarciu ekranu - nic wcześniej
  ich nie tworzy, a `generate` jest idempotentne. Gdy studio nie ma
  skonfigurowanego dokumentu na wydanie, sekcja mówi to wprost i odsyła do
  ustawień.
- `signatureObtained` wysyłamy zgodnie ze stanem faktycznym - protokół
  podpisany albo nie. Koniec z twardym `true`.
- Gdy pracownik nie ma dostępu do danych osobowych, imię podpisującego jest
  zamaskowane - wysyłka do podpisu jest wtedy wyłączona z podaniem powodu,
  zamiast wpisywać `***` na dokument.

### Stopka

Jeden przycisk, etykieta zależna od wybranego dokumentu:

| dokument | etykieta |
|---|---|
| Faktura VAT | `Wydaj pojazd i wystaw fakturę` |
| Paragon | `Wydaj pojazd i wystaw paragon` |
| Bez dokumentu | `Wydaj pojazd` |
| Wizyta bezpłatna (0 zł) | `Wydaj pojazd` + sekcja ② zwinięta do informacji |

Blokada przycisku wyłącznie przy realnych brakach (bilans faktury się nie
zgadza, brak podstawy prawnej przy stawce „zw", brak danych firmy) - z
komunikatem **przy sekcji, której dotyczy**, nie w banerze na górze.

### Ekran potwierdzenia (nowy)

Zastępuje toast. Ta sama ramka, przewinięta do stanu końcowego:

```
┌───────────────────────────────────────────────────────────────────┐
│                        ✓  Pojazd wydany                           │
│                                                                   │
│  Faktura FV/2026/0184 · przyjęta przez KSeF                       │
│  Zapłacono 1 722,00 zł - karta 1 200,00 · gotówka 522,00          │
│                                                                   │
│  [Wyślij fakturę mailem]  [Drukuj protokół]  [Wróć do wizyty]     │
└───────────────────────────────────────────────────────────────────┘
```

Warianty:

- `QUEUED_RETRY` → „KSeF chwilowo niedostępny - faktura zostanie dosłana
  automatycznie." + `[Sprawdź status]`
- `REJECTED` → **`[Popraw dane i wyślij ponownie]`** w tym miejscu, bez
  odsyłania do innego modułu. Endpoint `POST /…/invoices/{id}/retry` już
  istnieje; po stronie frontu potrzebna jest ścieżka edycji nabywcy/pozycji i
  ponownej wysyłki.

---

## 7. Zmiany w kontraktach

### Backend

**7.1. `CustomerInfoResponse` += dane firmowe** *(warunek konieczny każdego
prefillu)*

```kotlin
data class CustomerInfoResponse(
    val id: String,
    @Pii val firstName: String?,
    @Pii val lastName: String?,
    @Pii val email: String?,
    @Pii val phone: String?,
    val companyName: String?,
    val companyNip: String?,                       // NOWE
    val companyAddress: CompanyAddressResponse?,   // NOWE
    val stats: CustomerStatsResponse
)
```

Uwaga na `@Pii`: NIP spółki nie jest daną osobową, ale adres firmowy JDG bywa
adresem domowym. Oznaczyć spójnie z resztą modelu - do rozstrzygnięcia przy
implementacji.

**7.2. `GET /api/visits/{visitId}/handover-context`** *(nowy - jedno zapytanie
zamiast czterech)*

```jsonc
{
  "amounts":   { "net": 140000, "vat": 32200, "gross": 172200, "currency": "PLN" },
  "services":  [ { "name": "Powłoka ceramiczna", "net": 120000, "gross": 147600, "vatRate": "23" } ],
  "customer":  { "fullName": "Jan Kowalski", "companyName": "ACME Sp. z o.o.",
                 "companyNip": "5213017228",
                 "companyAddress": { "street": "ul. Kwiatowa 3", "postalCode": "00-001", "city": "Warszawa" },
                 "email": "jan@example.com", "phone": "+48601234567" },
  "seller":    { "name": "Detailing Studio", "taxId": "1234567890", "isComplete": true },
  "customerComments": [ { "author": "Anna Nowak", "createdAt": "…", "content": "…" } ],
  "defaults":  { "paymentMethod": "CARD", "documentType": "INVOICE" },
  "signature": { "tabletPaired": true, "tabletName": "Recepcja 1", "protocolId": "…" },
  "flags":     { "isFreeVisit": false, "pendingServices": 0, "doorToDoor": false }
}
```

Powód: dziś ekran składa stan z czterech źródeł, z czego ustawienia firmy
ładują się leniwie **dopiero w zagnieżdżonym modalu** - stąd migotanie i
walidacja przychodząca w najgorszym możliwym momencie.

**7.3. `POST /api/visits/{visitId}/complete` - lista wpłat**

```kotlin
data class PaymentRequest(
    val method: String,                    // zachowane - wstecznie zgodne
    val invoiceType: String? = null,
    val dueDate: LocalDate? = null,
    val amount: Long? = null,
    val payments: List<PaymentSplit>? = null   // NOWE; gdy podane, suma == amount
)
data class PaymentSplit(val method: String, val amount: Long, val dueDate: LocalDate? = null)
```

Gdy `payments` jest `null` - zachowanie bez zmian. Gdy podane - walidacja sumy i
zapis wielu form zapłaty do dokumentu finansowego.

**7.4. Draft wydania** - opcjonalnie `PUT/GET /api/visits/{visitId}/handover-draft`.
Na start wystarczy `localStorage` po stronie frontu (klucz per `visitId`,
czyszczony po sukcesie) - tańsze i rozwiązuje P5 w całości dla pojedynczej
stacji roboczej.

**7.5. Bez zmian** - `POST /…/invoices/{id}/retry` istnieje i wystarcza do
obsługi odrzuceń KSeF. Logika kwot w `CompleteVisitInvoiceOrchestrator`
(niezmiennik „faktura + reszta == kwota wizyty") zostaje nietknięta.

### Frontend

| plik | los |
|---|---|
| `transitions/TransitionWizards.tsx` | `ReadyToCompletedWizard` → nowy `VehicleHandoverSheet`; `InProgressToReadyWizard` → `MarkReadyDialog` |
| `transitions/InvoiceAdjustmentModal.tsx` | modal → sekcja `InvoiceSection` (accordion); logika kwot bez zmian |
| `transitions/PaymentStep.tsx` | → `SettlementSection` |
| `transitions/ClientBriefingStep.tsx` | → `CustomerNotesSection` (bez `onContinue`) |
| `transitions/SignatureStep.tsx` | → `ProtocolSection` z realnym podpisem |
| `transitions/QualityCheckStep.tsx` | **usunięty** (patrz D1) |
| `transitions/WizardLayout.tsx` | zostaje dla innych kreatorów; wypada z tej ścieżki |
| `hooks/useStateTransition.ts` | rozbity: `useMarkReady` + `useHandover` (bez `currentStep`, bez `_qualityChecks`) |
| `types/stateTransitions.ts` | += `PaymentSplit`, `HandoverContext` |

---

## 8. Plan wdrożenia

Fazy są ułożone tak, żeby **każda z osobna dawała odczuwalną poprawę** i mogła
pójść na produkcję niezależnie.

| faza | zakres | efekt dla użytkownika | status |
|---|---|---|---|
| **0** | `CustomerInfoResponse` += NIP i adres firmy | fundament prefillu | **zrobione** |
| **1** | Prefill nabywcy + jawny wiersz nabywcy + GUS po NIP + walidacja danych studia na wejściu | **znika przepisywanie 4 pól**; koniec rozjazdu „UI mówi konsument, backend wystawia B2B” | **zrobione** |
| **2** | Kreator → jeden ekran; `InvoiceAdjustmentModal` → sekcja; pozycje zwinięte | **z ~8 kliknięć do 2**; koniec modala w modalu | **zrobione** |
| **3** | Etap A: usunięcie kroku jakości (D1) | oznaczenie gotowości: 3 → 2 kliknięcia | **zrobione** |
| **4** | Ekran potwierdzenia + ponowna wysyłka do KSeF w miejscu + autozapis draftu | domknięcie ścieżek, koniec gubienia pracy | **zrobione** |
| **5** | Podpis na tablecie - po powstaniu formularza protokołu (D2) | podpis, który istnieje | odłożone |
| **6** | Podział płatności - lista wpłat (D5) | karta + gotówka bez sztucznego paragonu | odłożone |
| **-** | Endpoint `handover-context` (jedno zapytanie zamiast czterech) | mniej migotania przy otwarciu | niezrobione, opis w §7 |

Faza 0 objęła wyłącznie rozszerzenie DTO - nowego endpointu agregującego nie
budowaliśmy. Problem „późnej walidacji sprzedawcy" rozwiązało przeniesienie
pobrania ustawień studia z zagnieżdżonego modala na poziom ekranu wydania
(`useHandover`), co daje ten sam efekt bez nowej powierzchni API.

### Co powstało

| plik | rola |
|---|---|
| `visits/types/handover.ts` | model stanu, arytmetyka kwot, walidacja lustrzana do backendowej |
| `visits/hooks/useHandover.ts` | stan ekranu, draft w localStorage, zapis, wynik |
| `visits/hooks/useMarkReady.ts` | oznaczenie gotowości |
| `visits/api/apiError.ts` | odczyt błędu API bez `any` |
| `handover/HandoverSheet.tsx` | ekran wydania - jedno okno, trzy sekcje |
| `handover/SettlementSection.tsx` | kwota, forma zapłaty, dokument |
| `handover/InvoiceSection.tsx` | nabywca i pozycje zwinięte, bilans, reszta |
| `handover/BuyerEditor.tsx` | nabywca z GUS (`NipInputWithGus`) |
| `handover/InvoiceItemsEditor.tsx` | pozycje faktury (przeniesione z modala) |
| `handover/SellerPrompt.tsx` | uzupełnienie danych studia bez wychodzenia |
| `handover/ProtocolSection.tsx` | deklaracja podpisu (D2) |
| `handover/HandoverResultView.tsx` | potwierdzenie + ponowna wysyłka do KSeF |
| `handover/MarkReadyDialog.tsx` | oznaczenie gotowości (D1) |

Usunięte: `TransitionWizards`, `WizardLayout`, `QualityCheckStep`,
`NotificationStep`, `ClientBriefingStep`, `SignatureStep`, `PaymentStep`,
`InvoiceAdjustmentModal`, `useStateTransition`.

**Kolejność nie jest przypadkowa.** Faza 1 daje największy stosunek zysku do
kosztu i jest niezależna od przebudowy ekranu - można ją wypuścić w tym tygodniu
i biznes od razu odczuje różnicę. Faza 5 jest najpilniejsza z punktu widzenia
ryzyka (P3), ale najdroższa; jeśli ryzyko dowodowe jest realne, przesunąć ją
przed fazę 2 - patrz **D2**.

---

## 9. Jak zmierzymy, że jest lepiej

| metryka | dziś (szac.) | cel |
|---|---|---|
| Mediana kliknięć: wydanie z fakturą firmową | ~8 + 4 pola | ≤ 2, 0 pól |
| Mediana czasu: „Wydaj pojazd" → zakończone | - | < 20 s |
| Odsetek wydań porzuconych (okno otwarte, brak transakcji) | - | < 5 % |
| Faktury odrzucone przez KSeF | - | < 1 % |
| Faktury B2B bez adresu nabywcy | prawdopodobnie wysoki | 0 % |
| Wydania z `signatureObtained: true` bez realnego podpisu | 100 % | 0 % |

Pierwsze trzy wymagają zdarzeń telemetrycznych, których dziś nie ma - do dołożenia
w fazie 2 (`handover_opened`, `handover_completed`, `handover_abandoned`).
Czwartą i piątą da się policzyć zapytaniem do bazy od razu, przed wdrożeniem -
warto to zrobić, żeby mieć punkt odniesienia.

---

## 10. Decyzje dla biznesu - rozstrzygnięte

| | decyzja | co z niej wynikło |
|---|---|---|
| **D1** | Weryfikacja jakości: **usunąć** | `QualityCheckStep` skasowany, `MarkReadyDialog` to jedno potwierdzenie |
| **D2** | Protokół ma wyglądać i działać jak wiersz w „Dokumentacji i Podpisach" | `ProtocolSection` używa istniejącej maszynerii podpisu: podgląd, wydruk, wysyłka na telefon i tablet, status na żywo. Okazało się, że backend obsługuje etap `CHECK_OUT` w całości - brakowało tylko wywołania generowania i UI. `signatureObtained` wysyła stan faktyczny zamiast twardego `true` |
| **D3** | „Inny” = rozliczenie poza dokumentem, **nienazywane wprost** | etykieta „Inne rozliczenie”, bez tekstu objaśniającego |
| **D4** | Domyślny typ dokumentu: **bez zmian** | zostaje faktura VAT na sztywno |
| **D5** | Podział płatności: **później** | usunięty z zakresu i z projektu dla czytelności; podział *dokumentu* (faktura + paragon na resztę) zostaje |

Poniższy zapis pytań zostaje jako uzasadnienie decyzji.

### Pytania w brzmieniu pierwotnym

**D1 - Weryfikacja jakości: usunąć czy zbudować od nowa?**
Dziś nie zapisuje niczego i nie blokuje niczego. Do wyboru:
(a) usunąć - realna bramka (usługi `PENDING`) już działa;
(b) zbudować jako fakt audytowalny - jeden checkbox, zapis do audytu z osobą i
czasem, ewentualnie wymagany przy usługach powyżej progu kwotowego.
*Rekomendacja: (a) teraz, (b) osobno, jeśli pojawi się realna potrzeba
audytowa.* Nie ma sensu utrzymywać pozoru kontroli.

**D2 - `signatureObtained: true` bez podpisu - jak pilne?**
Czy przy sporze o stan pojazdu ta flaga bywa przywoływana? Jeśli tak, faza 5
idzie przed fazą 2. Jeśli nie - zostaje w kolejności.

**D3 - Co ma znaczyć „Bez dokumentu"?**
Dziś opcja „Inny" tworzy dokument `DOK` w finansach. Czy chodzi o: (a) dokument
inny niż paragon/faktura, (b) wydanie bez żadnego dokumentu (np. rozliczone
wcześniej), czy (c) obie rzeczy jako osobne opcje? Wpływa na etykiety i na to,
czy w ogóle dopuszczamy wydanie bez śladu przychodu.

**D4 - Domyślny typ dokumentu.**
Dziś na sztywno `Faktura VAT`. Czy to odpowiada realnej strukturze sprzedaży,
czy powinno być ustawieniem studia (a docelowo - pamiętane per klient)?

**D5 - Podział płatności - czy naprawdę występuje?**
Sekcja 6 zakłada, że tak. Jeśli w praktyce nie zdarza się to nigdy, faza 6
wypada z zakresu i zostaje sam podział dokumentu.

---

## 11. Czego świadomie nie zmieniamy

- **Logika kwot faktury.** `mode: NET | GROSS`, zasada „kwota wpisana jest
  źródłem prawdy", VAT „w stu" (art. 106e ust. 7), lustrzane obliczenia po obu
  stronach - to jest zrobione dobrze i zgodnie z przepisami. Przenosimy bez
  ingerencji.
- **Niezmiennik księgowy** `faktura + reszta == kwota wizyty` w
  `CompleteVisitInvoiceOrchestrator`. Zostaje.
- **Kolejność operacji w orkiestratorze** (pre-walidacja → zakończenie wizyty →
  dokument reszty → sieć do KSeF na końcu, poza transakcją). Świadoma i słuszna.
- **Blokada przejścia przy usługach `PENDING`** wraz z podświetleniem listy -
  to jedyna kontrola jakości, która realnie działa.
- **`WizardLayout`** - zostaje dla pozostałych kreatorów w aplikacji.

## 12. Odrzucone warianty

- **„Szybkie wydanie" jako osobny przycisk-skrót w nagłówku.** Kusi, ale po
  przeprojektowaniu pełny ekran kosztuje 2 kliknięcia - skrót oszczędziłby
  jedno, dokładając drugą ścieżkę kodu, drugi zestaw przypadków brzegowych i
  ryzyko, że użytkownik wyda pojazd, nie widząc komentarzy dla klienta. Nie
  warto.
- **Wydanie na osobnej stronie zamiast w modalu.** Traci kontekst wizyty,
  wymaga nawigacji i obsługi powrotu. Modal z przyklejoną stopką jest tu
  właściwy - czynność jest krótka i zamknięta.
- **Zostawienie kreatora i skrócenie go do dwóch kroków.** Nie usuwa źródła
  problemu: kreator z natury wymusza uwagę tam, gdzie decyzja jest oczywista.
  Ekran podsumowania z domyślnymi odpowiedziami wymusza uwagę tylko tam, gdzie
  coś odbiega od normy.
