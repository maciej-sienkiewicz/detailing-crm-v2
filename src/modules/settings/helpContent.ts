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
            label: 'Szablony PDF',
            description: 'Każdy protokół oparty jest na szablonie dokumentu PDF. Szablon definiuje wygląd i treść dokumentu — możesz go podejrzeć przed wdrożeniem klikając ikonę oka. Nazwy szablonów możesz edytować bezpośrednio w widoku (ikona ołówka).',
            usedIn: [
                'Bazowy projekt każdego protokołu',
                'Widoczny w podglądzie PDF przed wysłaniem',
                'Przechowywany bezpiecznie w chmurze',
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

export const SMS_TEMPLATES_HELP: HelpContent = {
    title: 'Szablony SMS',
    items: [
        {
            id: 'trigger',
            label: 'Wyzwalacz wysyłki',
            description: 'Określa zdarzenie, po którym SMS jest wysyłany automatycznie. Każdy szablon przypisany jest do konkretnego etapu obsługi zlecenia — np. przyjęcia pojazdu, zakończenia usługi lub gotowości do odbioru.',
            usedIn: [
                'Automatyczna wysyłka przy zdarzeniach w zleceniu',
                'Widoczny w historii komunikacji z klientem',
            ],
        },
        {
            id: 'content',
            label: 'Treść wiadomości',
            description: 'Tekst SMS wysyłanego do klienta. Możesz używać zmiennych dynamicznych otoczonych podwójnymi nawiasami klamrowymi — np. {{imię}}, {{numer_zlecenia}}, {{marka_pojazdu}}. System zastąpi je rzeczywistymi danymi przed wysyłką. Jeden SMS to standardowo 160 znaków; dłuższe wiadomości są łączone i zużywają więcej kredytów.',
            usedIn: [
                'Wiadomość SMS do klienta',
                'Historia komunikacji w profilu klienta',
            ],
        },
        {
            id: 'credits',
            label: 'Kredyty SMS',
            description: 'Każdy wysłany SMS zużywa kredyty z Twojego konta. Wiadomość do 160 znaków to 1 kredyt; dłuższe wiadomości składające się z wielu segmentów zużywają odpowiednio więcej. Stan kredytów możesz sprawdzić i uzupełnić w zakładce „Kredyty SMS i AI".',
            usedIn: [
                'Saldo kredytów SMS w zakładce Kredyty',
                'Historia transakcji kredytowych',
            ],
        },
    ],
};

export const EMAIL_TEMPLATES_HELP: HelpContent = {
    title: 'Szablony e-mail',
    items: [
        {
            id: 'trigger',
            label: 'Wyzwalacz wysyłki',
            description: 'Określa zdarzenie, po którym e-mail jest wysyłany automatycznie do klienta. Dostępne wyzwalacze odpowiadają etapom obsługi zlecenia — od przyjęcia pojazdu po wystawienie faktury.',
            usedIn: [
                'Automatyczna wysyłka przy zdarzeniach w zleceniu',
                'Historia komunikacji z klientem',
            ],
        },
        {
            id: 'content',
            label: 'Treść wiadomości',
            description: 'Treść e-maila wysyłanego do klienta. Możesz używać zmiennych dynamicznych — np. {{imię_klienta}}, {{numer_zlecenia}}. Stopka z danymi firmy (logo, adres, dane kontaktowe) jest dodawana automatycznie na podstawie ustawień w zakładce „Dane firmy".',
            usedIn: [
                'Wiadomość e-mail do klienta',
                'Historia komunikacji w profilu klienta',
            ],
        },
        {
            id: 'footer',
            label: 'Stopka e-maila',
            description: 'Stopka jest generowana automatycznie na podstawie danych z zakładki „Dane firmy". Zawiera logo, dane kontaktowe i opcjonalnie link do strony www. Nie wymaga ręcznej konfiguracji — zmiany w danych firmy są od razu widoczne w stopce.',
            usedIn: [
                'Każdy automatyczny e-mail',
                'Budowanie rozpoznawalności marki',
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
