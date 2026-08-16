import type { HelpContent } from './components/shared/SettingsLayout';

export const COMPANY_HELP: HelpContent = {
    title: 'Dane firmy',
    items: [
        {
            id: 'logo',
            label: 'Logo firmy',
            description: 'Logo reprezentuje markę studia we wszystkich materiałach generowanych przez system. Pojawia się jako element graficzny w nagłówkach — klienci widzą je przy podpisywaniu dokumentów i w otrzymywanych wiadomościach. Zalecany format to SVG lub PNG o minimalnej szerokości 400 px. Plik nie może przekraczać 2 MB.',
            usedIn: [
                'Nagłówki faktur VAT',
                'Wiadomości e-mail do klientów',
                'Protokoły zdawczo-odbiorcze (ekran podpisu)',
                'Wydruki dokumentów PDF',
            ],
        },
        {
            id: 'nip-regon',
            label: 'NIP & REGON',
            description: 'Numery identyfikacyjne firmy wymagane przez polskie prawo na dokumentach finansowych. NIP (10 cyfr) to numer identyfikacji podatkowej — niezbędny do wystawiania faktur VAT. REGON (9 lub 14 cyfr) to numer w rejestrze podmiotów gospodarczych, wymagany m.in. przy integracji z KSeF.',
            usedIn: [
                'Faktury VAT — pole obowiązkowe',
                'Protokoły — dane wystawcy',
                'Integracja z KSeF (Krajowy System e-Faktur)',
            ],
        },
        {
            id: 'address',
            label: 'Adres',
            description: 'Pełny adres siedziby firmy składający się z ulicy z numerem, kodu pocztowego i miasta. Adres drukowany jest na dokumentach jako dane wystawcy i może być weryfikowany przez organy podatkowe. Upewnij się, że jest zgodny z wpisem w CEIDG lub KRS.',
            usedIn: [
                'Faktury VAT — dane sprzedawcy',
                'Protokoły zdawczo-odbiorcze — dane firmy',
            ],
        },
        {
            id: 'contact',
            label: 'Dane kontaktowe',
            description: 'Telefon kontaktowy i firmowy adres e-mail. Klienci mogą kontaktować się pod tymi danymi w sprawach zleceń, reklamacji lub zapytań. Adres e-mail jest również nadawcą automatycznych wiadomości wysyłanych przez system (np. potwierdzenia przyjęcia pojazdu).',
            usedIn: [
                'Stopka automatycznych wiadomości e-mail',
                'Protokoły zdawczo-odbiorcze — dane kontaktowe',
                'Faktury VAT — dane sprzedawcy',
                'Nadawca automatycznych powiadomień',
            ],
        },
        {
            id: 'website',
            label: 'Strona www',
            description: 'Adres strony internetowej studia (opcjonalnie). Pojawia się jako klikalny link w stopce automatycznych wiadomości e-mail i SMS, kierując klientów do Twojej witryny. Wpisz pełny adres URL wraz z protokołem, np. https://twojestudio.pl.',
            usedIn: [
                'Stopka automatycznych wiadomości e-mail',
                'Stopka wiadomości SMS (jako skrócony link)',
            ],
        },
        {
            id: 'bank',
            label: 'Konto bankowe',
            description: 'Numer rachunku bankowego w formacie IBAN (26 cyfr dla kont polskich). Drukowany jest na fakturach jako informacja dla klienta o tym, gdzie dokonać przelewu za usługę. Pole jest opcjonalne — jeśli przyjmujesz wyłącznie płatności gotówkowe lub kartą, możesz je pominąć.',
            usedIn: [
                'Faktury VAT — dane do przelewu',
            ],
        },
    ],
};

export const SERVICES_HELP: HelpContent = {
    title: 'Cennik usług',
    items: [
        {
            id: 'name',
            label: 'Nazwa usługi',
            description: 'Pełna nazwa usługi wyświetlana w selektorze przy tworzeniu zlecenia, na fakturach i w historii wizyt. Powinna być jednoznaczna i zrozumiała dla klienta — ta sama nazwa pojawi się na protokole zdawczo-odbiorczym. Minimalna długość to 3 znaki, maksymalna 100 znaków.',
            usedIn: [
                'Selektor usług przy tworzeniu zlecenia',
                'Faktury VAT — pozycja usługi',
                'Protokoły zdawczo-odbiorcze',
                'Raporty i statystyki sprzedaży',
                'Historia wizyt klienta',
            ],
        },
        {
            id: 'net-price',
            label: 'Cena netto',
            description: 'Cena usługi bez podatku VAT, wyrażona w złotych. Jest to wartość bazowa, od której system automatycznie oblicza cenę brutto na podstawie wybranej stawki VAT. Zmiana ceny netto powoduje natychmiastowe przeliczenie ceny brutto.',
            usedIn: [
                'Faktury VAT — wartość netto pozycji',
                'Raporty przychodów (wartości netto)',
                'Wycena zlecenia',
            ],
        },
        {
            id: 'gross-price',
            label: 'Cena brutto',
            description: 'Cena usługi z uwzględnionym podatkiem VAT — kwota, którą zapłaci klient. Możesz wpisać cenę brutto zamiast netto, a system sam wyliczy wartość netto. Oba pola są ze sobą zsynchronizowane w czasie rzeczywistym.',
            usedIn: [
                'Wyświetlana klientowi przy wyborze usługi',
                'Faktury VAT — wartość brutto pozycji',
                'Wycena zlecenia — cena dla klienta',
            ],
        },
        {
            id: 'vat',
            label: 'Stawka VAT',
            description: 'Stawka podatku VAT stosowana do tej usługi. Zmiana stawki powoduje automatyczne przeliczenie ceny brutto. Dostępne stawki: 23% (podstawowa), 8% (obniżona), 5% (obniżona), 0% (zerowa) oraz „zw." (zwolniona z VAT — np. dla podmiotów korzystających ze zwolnienia podmiotowego).',
            usedIn: [
                'Faktury VAT — kolumna stawki podatku',
                'Obliczanie ceny brutto',
                'Deklaracje podatkowe',
            ],
        },
        {
            id: 'manual',
            label: 'Wycena ręczna',
            description: 'Gdy włączona, usługa nie ma z góry ustalonej ceny — pracownik wpisuje ją indywidualnie dla każdego zlecenia. Przydatne przy pracach, których koszt zależy od stanu pojazdu lub zakresu prac: np. korekta lakieru, kompleksowe detailing, usługi specjalistyczne.',
            usedIn: [
                'Tworzenie zlecenia — pole ceny wymagane od pracownika',
                'Faktury — cena wpisywana ręcznie',
            ],
        },
        {
            id: 'archive',
            label: 'Archiwizacja',
            description: 'Archiwizacja ukrywa usługę z listy wyboru przy tworzeniu nowych zleceń, nie usuwając jej z systemu. Wszystkie historyczne zlecenia i faktury zawierające tę usługę pozostają bez zmian. Możesz odkryć archiwalne usługi używając przełącznika „Pokaż archiwalne".',
            usedIn: [
                'Wpływa na dostępność w selektorze zleceń',
                'Nie wpływa na historyczne zlecenia ani faktury',
                'Widoczna w raportach jako „archiwalna"',
            ],
        },
    ],
};

export const DOCUMENTS_HELP: HelpContent = {
    title: 'Dokumenty i podpisy',
    items: [
        {
            id: 'checkin',
            label: 'Protokół przyjęcia',
            description: 'Dokument generowany automatycznie w momencie rejestracji pojazdu (etap Check-in). Klient podpisuje go elektronicznie na ekranie dotykowym — tablecie lub smartfonie. Możesz skonfigurować wiele szablonów: jeden globalny (zawsze generowany) oraz dodatkowe aktywowane tylko dla konkretnych usług.',
            usedIn: [
                'Generowany przy każdym przyjęciu pojazdu',
                'Podpisywany elektronicznie przez klienta',
                'Archiwizowany w historii zlecenia',
                'Dostępny do pobrania jako PDF',
            ],
        },
        {
            id: 'checkout',
            label: 'Protokół wydania',
            description: 'Dokument generowany przy wydaniu pojazdu klientowi (etap Check-out). Potwierdza stan pojazdu po wykonaniu usługi i zakres zrealizowanych prac. Klient podpisuje go przy odbiorze, co stanowi formalne potwierdzenie wykonania zlecenia.',
            usedIn: [
                'Generowany przy wydaniu pojazdu',
                'Podpisywany elektronicznie przy odbiorze',
                'Archiwizowany w historii zlecenia',
                'Podstawa do ewentualnych roszczeń gwarancyjnych',
            ],
        },
        {
            id: 'templates',
            label: 'Szablony dokumentów (PDF i HTML)',
            description: 'Każdy protokół oparty jest na szablonie dokumentu — wypełnialnym formularzu PDF (AcroForm) lub samodzielnym pliku HTML. PDF ma pełne wsparcie: automatyczne uzupełnianie danymi z CRM, podpis na tablecie i pieczęć kwalifikowaną. HTML jest uzupełniany danymi po stronie serwera i służy do podglądu oraz wydruku — pełny obieg podpisu na tablecie wymaga formatu PDF. Po wgraniu plik jest automatycznie weryfikowany: system sprawdza, czy zawiera wszystkie wymagane pola, i odrzuca plik z brakami, wskazując dokładnie, czego brakuje.',
            usedIn: [
                'Bazowy projekt każdego protokołu',
                'Widoczny w podglądzie przed wdrożeniem',
                'Weryfikowany automatycznie po wgraniu',
                'Przechowywany bezpiecznie w chmurze',
            ],
        },
        {
            id: 'template-pdf-howto',
            label: 'Jak przygotować szablon PDF',
            description: 'Przygotuj jednostronicowy dokument A4 z układem protokołu (możesz pobrać szablon domyślny i użyć go jako bazy). W programie do edycji PDF (np. Adobe Acrobat lub LibreOffice Writer z eksportem do PDF z formularzem) dodaj pola formularza o dokładnych nazwach: brand, model, licenseplate, mileage, fullname, phonenumber, email, companyname, tax, date, price — jako pola tekstowe; services i remarks — jako pola tekstowe wieloliniowe; keys i documents — jako pola wyboru (checkbox). W miejscu podpisu klienta dodaj pole tekstowe o nazwie signature (minimum 60x20 pt, zalecane ok. 260x40 pt) — podpis z tabletu zostanie w nie wpasowany z zachowaniem proporcji. Opcjonalnie dodaj pole company_signature na podpis pracownika. Nie ustawiaj własnych czcionek w polach — system nadpisuje je czcionką z polskimi znakami (7 pt).',
            usedIn: [
                'Automatyczne uzupełnianie danymi wizyty',
                'Podpis klienta na tablecie (pole signature)',
                'Podpis pracownika (pole company_signature)',
            ],
        },
        {
            id: 'template-html-howto',
            label: 'Jak przygotować szablon HTML',
            description: 'Przygotuj samodzielny plik HTML — wszystkie style CSS i czcionki osadzone w pliku, bez odwołań do zasobów zewnętrznych. W miejscach, w które system ma wstawić dane z CRM, dodaj elementom atrybut data-field z nazwą pola, np. <div data-field="brand"></div>. Obowiązuje ta sama lista pól co w PDF (brand, model, licenseplate, mileage, services, remarks, fullname, companyname, phonenumber, email, tax, date, price, keys, documents) plus obszary podpisów: data-field="signature" i opcjonalnie data-field="company_signature". Zadbaj o format wydruku A4 (reguła @page { size: A4 }) — dokument drukowany jest 1:1.',
            usedIn: [
                'Uzupełnianie danymi po stronie serwera',
                'Podgląd i wydruk protokołu',
            ],
        },
        {
            id: 'default-template',
            label: 'Szablon domyślny',
            description: 'Każde studio ma zawsze przypisany szablon protokołu przyjęcia — systemowy szablon domyślny jest dodawany automatycznie przy utworzeniu profilu. Możesz zastąpić go własnym szablonem, a domyślny usunąć lub dezaktywować. Jeśli jednak usuniesz swój szablon i studio zostałoby bez żadnego szablonu przyjęcia, system automatycznie przywróci szablon domyślny — nie da się zostać bez działającego protokołu przyjęcia.',
            usedIn: [
                'Dodawany automatycznie do nowego profilu',
                'Przywracany po usunięciu ostatniego szablonu przyjęcia',
                'Oznaczony etykietą „Domyślny” na liście szablonów',
            ],
        },
        {
            id: 'consents',
            label: 'Zgody marketingowe',
            description: 'Zgody na przetwarzanie danych w celach marketingowych lub RODO zbierane są jednorazowo per klient. System zapamiętuje, że klient już wyraził daną zgodę, i nie wyświetla jej przy kolejnych wizytach. Możesz oznaczyć zgodę jako obowiązkową lub opcjonalną.',
            usedIn: [
                'Wyświetlana klientowi raz przy pierwszej wizycie',
                'Archiwizowana w profilu klienta',
                'Dostępna do wglądu w historii klienta',
                'Podstawa prawna dla działań marketingowych',
            ],
        },
    ],
};

export const MESSAGE_TEMPLATES_HELP: HelpContent = {
    title: 'Szablony wiadomości',
    items: [
        {
            id: 'list',
            label: 'Lista wiadomości',
            description: 'Jeden wiersz to jedna sytuacja, w której odzywamy się do klienta — od potwierdzenia rezerwacji po zestawienie zbiorcze dla kontrahenta. Wiersze są pogrupowane w kolejności, w jakiej dzieje się obsługa zlecenia. Pod nazwą widzisz fragment prawdziwej treści z podstawionymi przykładowymi danymi, więc nie musisz wchodzić w szczegóły, żeby sprawdzić, co dostanie klient.',
            usedIn: [
                'Ustawienia → Szablony wiadomości',
                'Historia komunikacji w profilu klienta',
            ],
        },
        {
            id: 'channels',
            label: 'Kanały SMS i e-mail',
            description: 'Część wiadomości wychodzi obydwoma kanałami — na przykład link do Karty Wizyty. Chipy w kolumnie „Kanał" włączają i wyłączają każdy kanał osobno, bez otwierania szczegółów. Szary chip oznacza, że dana wiadomość nie jest wysyłana tym kanałem w ogóle.',
            usedIn: [
                'Kolumna „Kanał" na liście',
                'Zakładki SMS / E-mail w panelu edycji',
            ],
        },
        {
            id: 'status',
            label: 'Kiedy wiadomość faktycznie wychodzi',
            description: 'Zielony chip oznacza, że wiadomość jest włączona i ma treść. Bursztynowy to ostrzeżenie: reguła jest włączona, ale temat lub treść są puste, więc mimo pozornie aktywnego stanu nic nie zostanie wysłane. System nie ma żadnej treści zapasowej — wychodzi wyłącznie to, co sam wpiszesz.',
            usedIn: [
                'Chipy na liście',
                'Filtr „Aktywne"',
            ],
        },
        {
            id: 'timing',
            label: 'Czas wysyłki',
            description: 'Trzy wiadomości mają konfigurowalne opóźnienie. Przypomnienie przed wizytą liczymy od godziny rozpoczęcia rezerwacji. Podziękowanie po wizycie i przypomnienie po przerwie liczymy od momentu odbioru pojazdu — dlatego rezerwacja, na którą klient się nie stawił, nigdy nie dostanie tych wiadomości.',
            usedIn: [
                'Kolumna „Kiedy wychodzi"',
                'Sekcja „Czas wysyłki" w panelu edycji',
            ],
        },
        {
            id: 'variables',
            label: 'Zmienne w treści',
            description: 'Zmienne wstawiasz przyciskami nad polem tekstowym. Każda wiadomość udostępnia tylko te, które potrafi wypełnić — dlatego listy różnią się między szablonami. Nazwa, adres, telefon i strona Twojej firmy nie są zmiennymi: znasz je w chwili pisania szablonu, więc wpisz je wprost w treści. Wpisanie zmiennej, której dana wiadomość nie zna, zablokuje zapis i zostanie oznaczone w edytorze.',
            usedIn: [
                'Panel edycji — przyciski „Wstaw"',
                'Podgląd wiadomości',
            ],
        },
        {
            id: 'sender',
            label: 'Nazwa nadawcy SMS',
            description: 'Do 11 znaków alfanumerycznych wyświetlanych zamiast numeru telefonu. Operator wymaga podpisanego upoważnienia — pobierz wzór, podpisz i wgraj go tutaj. Do czasu potwierdzenia przez operatora SMS-y wychodzą z numeru domyślnego.',
            usedIn: [
                'Każdy SMS wysłany do klienta',
                'Kampanie SMS',
            ],
        },
        {
            id: 'credits',
            label: 'Kredyty SMS',
            description: 'Każdy wysłany SMS zużywa kredyty. Wiadomość do 160 znaków to 1 kredyt, a polskie znaki diakrytyczne skracają ten limit do 70 znaków — licznik pod polem treści pokazuje, na ile wiadomości rozpadnie się Twój szablon. Stan kredytów uzupełnisz w zakładce „Kredyty SMS i AI".',
            usedIn: [
                'Licznik segmentów w edytorze',
                'Saldo kredytów w zakładce Kredyty',
            ],
        },
    ],
};

export const CREDITS_HELP: HelpContent = {
    title: 'Kredyty SMS i AI',
    items: [
        {
            id: 'balance',
            label: 'Saldo kredytów',
            description: 'Bieżąca liczba dostępnych kredytów na Twoim koncie. Kredyty są zużywane przy każdym wysłanym SMS-ie i każdym użyciu funkcji AI. Saldo jest aktualizowane w czasie rzeczywistym po każdej operacji.',
            usedIn: [
                'Kontrola dostępności przed masową wysyłką',
                'Widoczne na pulpicie nawigacyjnym',
            ],
        },
        {
            id: 'sms',
            label: 'Wysyłka SMS',
            description: 'Każdy wysłany SMS zużywa 1 kredyt (do 160 znaków). Dłuższe wiadomości składają się z wielu segmentów i zużywają odpowiednio więcej kredytów. Kredyty są pobierane w momencie wysłania, nie przy planowaniu.',
            usedIn: [
                'Automatyczne powiadomienia SMS do klientów',
                'Kampanie SMS',
            ],
        },
        {
            id: 'packages',
            label: 'Pakiety kredytów',
            description: 'Kredyty kupujesz jednorazowo w wybranych pakietach. Im większy pakiet, tym niższa cena jednostkowa za kredyt. Kredyty nie wygasają po zakończeniu okresu rozliczeniowego — zostają na koncie do wykorzystania.',
            usedIn: [
                'Dostępność funkcji SMS i AI',
            ],
        },
        {
            id: 'history',
            label: 'Historia transakcji',
            description: 'Pełna historia wszystkich operacji na kredytach: zakupów, wysyłek SMS, użycia AI, zwrotów i bonusów. Każda transakcja zawiera datę, typ operacji i liczbę kredytów. Możesz filtrować historię i eksportować ją do rozliczeń.',
            usedIn: [
                'Rozliczenie kosztów komunikacji',
                'Audyt użycia funkcji AI',
            ],
        },
    ],
};

export const INVOICES_HELP: HelpContent = {
    title: 'Faktury i płatności',
    items: [
        {
            id: 'ksef',
            label: 'Integracja z KSeF',
            description: 'KSeF (Krajowy System e-Faktur) to rządowa platforma do wystawiania i odbierania faktur elektronicznych. Integracja pozwala automatycznie pobierać faktury kosztowe wystawione na Twoją firmę przez dostawców. Wymaga podania danych uwierzytelniających z systemu Ministerstwa Finansów.',
            usedIn: [
                'Automatyczne pobieranie faktur kosztowych',
                'Synchronizacja z systemem podatkowym',
            ],
        },
        {
            id: 'credentials',
            label: 'Dane uwierzytelniające',
            description: 'Token API lub certyfikat wymagany do połączenia z KSeF. Dane są przechowywane w zaszyfrowanej formie i nigdy nie są widoczne w interfejsie po zapisaniu. W przypadku zmiany danych w KSeF należy zaktualizować je również tutaj.',
            usedIn: [
                'Autoryzacja połączenia z KSeF',
            ],
        },
    ],
};
