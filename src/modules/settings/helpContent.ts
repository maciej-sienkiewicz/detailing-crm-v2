import { canPurchaseHere } from '@/core/native/platform';
import type { HelpContent } from './components/shared/SettingsLayout';

// Teksty przewodników w nagłówkach sekcji ustawień. Jeden temat to 1-2 zdania: co to jest
// i co z tego wynika. Wcześniejsze wersje miały po 5-7 zdań, „system" jako podmiot, żargon
// (Check-in, selektor, chip) i obietnice, których aplikacja nie spełniała (filtr i eksport
// historii kredytów, saldo „na pulpicie"). Opisując coś, sprawdź najpierw w kodzie, że tak
// działa. Ceny: kwota wpisana przez człowieka zostaje dokładnie taka (CLAUDE.md §1), więc
// pomoc nie może mówić, że brutto „liczy się z netto".

export const COMPANY_HELP: HelpContent = {
    title: 'Dane firmy',
    items: [
        {
            id: 'logo',
            label: 'Logo firmy',
            description: 'Wgraj jeden plik, a przygotujemy wersję na ekran i do druku. Najlepiej SVG albo PNG z przezroczystym tłem, dłuższy bok najlepiej 1000 px (co najmniej 300 px), do 5 MB; czy logo trafia na dokumenty, ustawisz w „Przyjęciu i wydaniu".',
            usedIn: [
                'Nagłówek protokołów przyjęcia i wydania',
                'Nagłówek zgód marketingowych',
                'Karta wizyty',
            ],
        },
        {
            id: 'nip-regon',
            label: 'NIP i REGON',
            description: 'Numery firmy, które muszą być na dokumentach finansowych. NIP ma 10 cyfr, REGON 9 albo 14.',
            usedIn: [
                'Faktury',
                'Protokoły przyjęcia i wydania',
            ],
        },
        {
            id: 'address',
            label: 'Adres',
            description: 'Adres siedziby, który drukujemy na dokumentach jako dane firmy. Wpisz go tak, jak w CEIDG albo KRS.',
            usedIn: [
                'Faktury',
                'Protokoły przyjęcia i wydania',
            ],
        },
        {
            id: 'contact',
            label: 'Dane kontaktowe',
            description: 'Telefon i e-mail, pod którymi klienci mogą się z Tobą skontaktować.',
            usedIn: [
                'Stopka e-maili do klientów',
                'Protokoły przyjęcia i wydania',
                'Faktury',
            ],
        },
        {
            id: 'website',
            label: 'Strona www',
            description: 'Adres strony studia, np. https://twojestudio.pl. Pole jest opcjonalne.',
            usedIn: [
                'Stopka e-maili do klientów',
            ],
        },
        {
            id: 'bank',
            label: 'Konto bankowe',
            description: 'Numer konta w formacie IBAN, na które klient zrobi przelew. Jeśli bierzesz tylko gotówkę albo kartę, zostaw puste.',
            usedIn: [
                'Faktury: dane do przelewu',
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
            description: 'Ta nazwa trafia na listę usług przy nowym zleceniu, na protokoły i na faktury, więc napisz ją tak, żeby klient ją zrozumiał. Od 3 do 100 znaków.',
            usedIn: [
                'Lista usług przy nowym zleceniu',
                'Protokoły przyjęcia i wydania',
                'Faktury',
                'Statystyki sprzedaży',
                'Historia wizyt klienta',
            ],
        },
        {
            id: 'net-price',
            label: 'Cena netto',
            description: 'Wpisz netto albo brutto, drugą kwotę policzymy sami. Kwota, którą wpiszesz, zostaje dokładnie taka.',
            usedIn: [
                'Wycena zlecenia',
                'Faktury',
                'Statystyki przychodów',
            ],
        },
        {
            id: 'gross-price',
            label: 'Cena brutto',
            description: 'Kwota, którą zapłaci klient. Jeśli wpiszesz brutto, zostanie co do grosza, a netto policzymy z niej.',
            usedIn: [
                'Wycena zlecenia: cena dla klienta',
                'Protokół przyjęcia',
                'Faktury',
            ],
        },
        {
            id: 'vat',
            label: 'Stawka VAT',
            description: 'Do wyboru 23%, 8%, 5%, 0% i „zw." (zwolnienie z VAT). Po zmianie stawki zostaje kwota wpisana przez Ciebie, a drugą przeliczamy.',
            usedIn: [
                'Wycena zlecenia',
                'Faktury',
            ],
        },
        {
            id: 'manual',
            label: 'Wycena ręczna',
            description: 'Usługa bez stałej ceny: kwotę wpisujesz przy każdym zleceniu. Przydaje się, gdy koszt zależy od stanu auta, np. przy korekcie lakieru albo kompleksowym detailingu.',
            usedIn: [
                'Nowe zlecenie: cenę trzeba wpisać',
            ],
        },
        {
            id: 'archive',
            label: 'Archiwizacja',
            description: 'Usługa znika z listy usług przy nowym zleceniu, a wizyty i faktury, w których już jest, zostają bez zmian. Archiwalne usługi zobaczysz po kliknięciu „Pokaż archiwalne".',
            usedIn: [
                'Znika z listy usług przy nowym zleceniu',
                'Nie zmienia dawnych wizyt ani faktur',
            ],
        },
    ],
};

export const DOCUMENTS_HELP: HelpContent = {
    title: 'Przyjęcie i wydanie',
    items: [
        {
            id: 'vehicle-fields',
            label: 'Pola pojazdu w formularzu przyjęcia',
            description: 'Które pola pojazdu wypełniasz przy przyjęciu auta. Marka i model są zawsze. Ukrycie pola niczego nie kasuje: zapisany wcześniej VIN czy kolor zostaje na karcie pojazdu. Ten sam wybór jest pod „Ustawienia pól" w formularzu wizyty.',
            usedIn: [
                'Przyjęcie auta',
                'VIN na protokole przyjęcia',
            ],
        },
        {
            id: 'logo-on-documents',
            label: 'Logo na dokumentach',
            description: 'Przełącznik „Logo na dokumentach" wstawia logo z „Danych firmy" w nagłówek gotowych protokołów i zgody marketingowej. Własnych szablonów nie zmieniamy, a dokumentów już podpisanych też nie.',
            usedIn: [
                'Protokół przyjęcia (szablon gotowy)',
                'Protokół wydania (szablon gotowy)',
                'Zgody marketingowe (szablon gotowy)',
            ],
        },
        {
            id: 'checkin',
            label: 'Protokół przyjęcia',
            description: 'Powstaje przy przyjęciu pojazdu, a klient podpisuje go na tablecie albo telefonie. Możesz mieć protokół dla każdej wizyty i dodatkowe dla wybranych usług.',
            usedIn: [
                'Przyjęcie pojazdu',
                'Historia wizyty',
                'Pobieranie jako PDF',
            ],
        },
        {
            id: 'checkout',
            label: 'Protokół wydania',
            description: 'Powstaje przy wydaniu pojazdu. Klient podpisuje go przy odbiorze, potwierdzając wykonanie zlecenia.',
            usedIn: [
                'Wydanie pojazdu',
                'Historia wizyty',
                'Ewentualna reklamacja',
            ],
        },
        {
            id: 'templates',
            label: 'Szablony dokumentów (PDF i HTML)',
            description: 'Każdy protokół powstaje z szablonu: formularza PDF albo pliku HTML. Tylko PDF obsługuje podpis na tablecie, HTML służy do podglądu i wydruku; po wgraniu sprawdzamy, czy plik ma wszystkie wymagane pola, i mówimy, czego brakuje.',
            usedIn: [
                'Każdy protokół',
                'Podgląd przed użyciem',
                'Sprawdzenie pól po wgraniu',
            ],
        },
        {
            id: 'template-pdf-howto',
            label: 'Jak przygotować szablon PDF',
            description: 'Zrób jedną stronę A4 (możesz zacząć od szablonu domyślnego) i dodaj pola formularza o nazwach: brand, model, licenseplate, mileage, fullname, phonenumber, email, companyname, tax, date, price (tekstowe), services i remarks (tekstowe wieloliniowe), keys i documents (pola wyboru). Na podpis klienta dodaj pole tekstowe signature (co najmniej 60x20 pt, najlepiej ok. 260x40 pt), a na podpis pracownika opcjonalnie company_signature; czcionek nie ustawiaj, wstawimy własną z polskimi znakami.',
            usedIn: [
                'Dane wizyty w polach formularza',
                'Podpis klienta (pole signature)',
                'Podpis pracownika (pole company_signature)',
            ],
        },
        {
            id: 'template-html-howto',
            label: 'Jak przygotować szablon HTML',
            description: 'Jeden plik ze wszystkimi stylami i czcionkami w środku, bez odwołań do zewnętrznych zasobów. Miejsca na dane oznacz atrybutem data-field z nazwą pola, np. <div data-field="brand"></div> (te same pola co w PDF, plus signature i opcjonalnie company_signature), i ustaw wydruk A4: @page { size: A4 }.',
            usedIn: [
                'Dane wizyty wstawiane w szablon',
                'Podgląd i wydruk protokołu',
            ],
        },
        {
            id: 'default-template',
            label: 'Szablon domyślny',
            description: 'Każde studio dostaje na start gotowy protokół przyjęcia, który możesz zastąpić własnym. Gdy usuniesz ostatni szablon przyjęcia, domyślny wróci sam, bo przyjęcie bez protokołu nie jest możliwe.',
            usedIn: [
                'Nowe studio',
                'Po usunięciu ostatniego szablonu przyjęcia',
                'Etykieta „Domyślny" na liście',
            ],
        },
        {
            id: 'consents',
            label: 'Zgody marketingowe',
            description: 'Klient podpisuje zgodę raz, a przy kolejnych wizytach już jej nie widzi. Zgoda może być obowiązkowa albo opcjonalna.',
            usedIn: [
                'Pierwsza wizyta klienta',
                'Karta klienta',
            ],
        },
    ],
};

export const MESSAGE_TEMPLATES_HELP: HelpContent = {
    title: 'Wiadomości do klientów',
    items: [
        {
            id: 'list',
            label: 'Oś wizyty',
            description: 'Wiadomości stoją w kolejności obsługi zlecenia, od rezerwacji po rozliczenie. Każda pokazuje treść z przykładowymi danymi. Podświetlone fragmenty, takie jak imię, data czy link, system wstawia sam przy wysyłce.',
            usedIn: [
                'Ustawienia → Wiadomości do klientów',
            ],
        },
        {
            id: 'visit-card',
            label: 'Karta wizyty',
            description: 'Strona dla klienta z rezerwacją, usługami i wyceną, a w trakcie wizyty także ze zdjęciami. Link do niej wysyłają wiadomości „Link do Karty Rezerwacji" i „Link do Karty Wizyty". Po wyłączeniu karty linki nie wychodzą.',
            usedIn: [
                'Rezerwacja',
                'Przyjęcie auta',
            ],
        },
        {
            id: 'redirect',
            label: 'Przekierowanie na moje dane',
            description: 'Gdy jest włączone, każda wiadomość do klienta trafia na Twój numer i e-mail, a klienci nie dostają nic. „Wyślij wszystkie testowo" wysyła Ci wszystkie szablony z przykładowymi danymi, a jeśli któryś ma błąd, nie wysyła żadnego.',
            usedIn: [
                'Karta nad listą wiadomości',
                'Każdy SMS i e-mail do klienta',
            ],
        },
        {
            id: 'channels',
            label: 'Kanały SMS i e-mail',
            description: 'Znaczki w kolumnie „Kanał" włączają i wyłączają SMS i e-mail osobno. Wyszarzony znaczek znaczy, że ta wiadomość nie wychodzi tym kanałem.',
            usedIn: [
                'Kolumna „Kanał"',
                'Zakładki SMS i E-mail w szczegółach wiadomości',
            ],
        },
        {
            id: 'status',
            label: 'Kiedy wiadomość faktycznie wychodzi',
            description: 'Zielony znaczek: wiadomość jest włączona i ma treść. Bursztynowy: jest włączona, ale bez treści, więc nic nie wyjdzie, choć wygląda na włączoną.',
            usedIn: [
                'Znaczki na liście',
                'Filtr „Włączone"',
            ],
        },
        {
            id: 'timing',
            label: 'Czas wysyłki',
            description: 'Przypomnienie przed wizytą liczymy od początku rezerwacji, a podziękowanie i przypomnienie po przerwie od odbioru pojazdu, więc klient, który nie przyjechał, ich nie dostanie. Godzinę podziękowania możesz też wybrać przy wydaniu pojazdu.',
            usedIn: [
                'Kolumna „Kiedy wychodzi"',
                'Czas wysyłki w szczegółach wiadomości',
            ],
        },
        {
            id: 'variables',
            label: 'Zmienne w treści',
            description: 'Zmienne wstawiasz przyciskami nad treścią, a każda wiadomość ma tylko te, które umie wypełnić. Nazwę, adres, telefon i stronę firmy wpisz wprost w treści.',
            usedIn: [
                'Przyciski „Wstaw w miejscu kursora"',
                'Podgląd wiadomości',
            ],
        },
        {
            id: 'sender',
            label: 'Nazwa nadawcy SMS',
            description: 'Do 11 liter i cyfr widocznych zamiast numeru telefonu, po wgraniu podpisanego upoważnienia. Dopóki operator nie potwierdzi nazwy, SMS-y wychodzą z numeru. Prośba o odpowiedź „TAK” zawsze wychodzi z numeru, bo na nazwę nie da się odpisać.',
            usedIn: [
                'Każdy SMS do klienta',
                'Kampanie SMS',
            ],
        },
        {
            id: 'credits',
            label: 'Kredyty SMS',
            // W aplikacji ze sklepu sekcji kredytów nie ma i nie wolno odsyłać do zakupu.
            description: 'SMS do 160 znaków to 1 kredyt, a z polskimi znakami limit spada do 70 znaków; licznik pod treścią pokazuje, ile SMS-ów wyjdzie z wiadomości.'
                + (canPurchaseHere() ? ' Kredyty dokupisz w „Kredyty SMS i AI".' : ''),
            usedIn: canPurchaseHere()
                ? ['Licznik SMS-ów pod treścią', 'Ustawienia → Kredyty SMS i AI']
                : ['Licznik SMS-ów pod treścią'],
        },
    ],
};

export const CREDITS_HELP: HelpContent = {
    title: 'Kredyty SMS i AI',
    items: [
        {
            id: 'balance',
            label: 'Saldo kredytów',
            description: 'Ile kredytów masz teraz na koncie. Schodzą przy każdym SMS-ie i każdym użyciu AI.',
            usedIn: [
                'Sprawdzenie przed większą wysyłką',
            ],
        },
        {
            id: 'sms',
            label: 'Wysyłka SMS',
            description: 'SMS do 160 znaków to 1 kredyt, dłuższy zużywa ich więcej. Kredyty schodzą przy wysłaniu, a nie przy zaplanowaniu.',
            usedIn: [
                'Wiadomości do klientów',
                'Kampanie SMS',
            ],
        },
        {
            id: 'packages',
            label: 'Pakiety kredytów',
            description: 'Kredyty kupujesz jednorazowo w pakietach. Nie wygasają z końcem miesiąca.',
            usedIn: [
                'SMS-y i funkcje AI',
            ],
        },
        {
            id: 'history',
            label: 'Historia transakcji',
            description: 'Każdy zakup, SMS, użycie AI, zwrot i bonus z datą i liczbą kredytów.',
            usedIn: [
                'Koszty komunikacji',
                'Ile kredytów zużyło AI',
            ],
        },
    ],
};

export const INVOICES_HELP: HelpContent = {
    title: 'Finanse i KSeF',
    items: [
        {
            id: 'ksef',
            label: 'Połączenie z KSeF',
            description: 'KSeF to rządowy system e-faktur. Po połączeniu pobieramy z niego faktury kosztowe, a gdy faktury wystawia księgowość, także jej faktury sprzedaży.',
            usedIn: [
                'Pobieranie faktur kosztowych',
                'Faktury wystawione przez księgowość',
            ],
        },
        {
            id: 'credentials',
            label: 'Dane logowania do KSeF',
            description: 'Token z KSeF; NIP bierzemy z Danych firmy, więc bez niego połączenia nie da się zapisać. Po zapisie sprawdzamy, co token pozwala zrobić. Gdy zmienisz token w KSeF, wpisz nowy także tutaj.',
            usedIn: [
                'Połączenie z KSeF',
            ],
        },
        {
            id: 'auto-send-default',
            label: 'Domyślna wysyłka faktur do KSeF',
            description: 'Tak ustawi się przełącznik „Wyślij fakturę do KSeF" przy wydaniu pojazdu, ale przy każdej fakturze możesz go zmienić. Niewysłaną fakturę wyślesz później z listy dokumentów przychodowych.',
            usedIn: [
                'Wydanie pojazdu',
                'Dokumenty przychodowe: status „Poza KSeF"',
            ],
        },
        {
            id: 'payment-tracking',
            label: 'Obsługa statusów płatności',
            description: 'Faktury i koszty mają status opłacone albo nieopłacone. Należności i zobowiązania w Finansach liczą się z nieopłaconych.',
            usedIn: [
                'Finanse: należności i zobowiązania',
            ],
        },
    ],
};
