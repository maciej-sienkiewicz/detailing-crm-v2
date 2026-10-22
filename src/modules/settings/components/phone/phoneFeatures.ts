// src/modules/settings/components/phone/phoneFeatures.ts
//
// Funkcje telefonu w Ustawienia → Telefon: kolejność w składzie, nazwy i to, komu
// je pokazać.
//
// Nazwy mówią, co człowiek z tego ma („Kto dzwoni"), a nie jak to działa technicznie
// („Synchronizacja CardDAV") - wybiera z nich detailer, nie administrator.
//
// Opisy są rzeczowe: co funkcja robi i co trzeba ustawić. Pierwsza wersja pisała
// hasłami reklamowymi („Lead, rezerwacja i przychód trafiają do kieszeni…") - właściciel
// studia odebrał to jako kicz, a hasło nie mówiło, co tu właściwie się ustawia.

export type PhoneFeatureId = 'push' | 'calls' | 'dial' | 'voice' | 'camera' | 'app';

export const PHONE_FEATURE_IDS: readonly PhoneFeatureId[] = ['push', 'calls', 'dial', 'voice', 'camera', 'app'];

export const isPhoneFeatureId = (value: unknown): value is PhoneFeatureId =>
    typeof value === 'string' && (PHONE_FEATURE_IDS as readonly string[]).includes(value);

export interface PhoneFeature {
    id: PhoneFeatureId;
    name: string;
    description: string;
    /** Przycisk otwierający ustawienia funkcji; null - nie ma czego ustawiać. */
    cta: string | null;
}

export const PHONE_FEATURES: Record<PhoneFeatureId, PhoneFeature> = {
    push: {
        id: 'push',
        name: 'Powiadomienia',
        description: 'Bądź na bieżąco ze wszystkimi wydarzeniami. Ustaw, które powiadomienia chcesz otrzymywać.',
        cta: 'Wybierz, co ma przychodzić',
    },
    calls: {
        id: 'calls',
        name: 'Kto dzwoni',
        description: 'Dodaj klientów studia do kontaktów w telefonie. Gdy klient zadzwoni, zobaczysz jego imię i nazwisko zamiast samego numeru.',
        cta: 'Dodaj klientów do kontaktów',
    },
    dial: {
        id: 'dial',
        name: 'Dzwonienie z komputera',
        description: 'Kliknij numer telefonu na karcie klienta, a Twój telefon zaproponuje połączenie z tym numerem.',
        cta: 'Sparuj telefon',
    },
    voice: {
        id: 'voice',
        name: 'Lead głosem',
        description: 'Podyktuj leada albo notatkę na telefonie, a zapiszą się w CRM. Skrót działa bez logowania.',
        cta: 'Dodaj skrót na telefon',
    },
    camera: {
        id: 'camera',
        name: 'Aparat dla komputera',
        description: 'Zrób zdjęcie albo zeskanuj kod telefonem, a wynik trafi na ekran komputera. Kod QR pojawia się wszędzie tam, gdzie można z tego skorzystać.',
        cta: null,
    },
    app: {
        id: 'app',
        name: 'Aplikacja',
        description: 'Dodaj CRM do ekranu głównego telefonu, a otworzysz go jak zwykłą aplikację. Na iPhonie powiadomienia działają tylko w ten sposób.',
        cta: 'Dodaj do ekranu',
    },
};

/** Tapeta ekranu na scenie: połączenie przychodzące jest ciemne jak w iOS, reszta jasna. */
export const screenTone = (feature: PhoneFeatureId): 'light' | 'dark' => (feature === 'calls' ? 'dark' : 'light');

interface Availability {
    canViewCustomers: boolean;
    canViewVisits: boolean;
    nativeApp: boolean;
}

/**
 * Funkcje, z których ta osoba na tym urządzeniu skorzysta. Reszty nie pokazujemy:
 * przycisk do funkcji, której backend i tak nie wpuści, kłamie.
 */
export const availablePhoneFeatures = ({ canViewCustomers, canViewVisits, nativeApp }: Availability): PhoneFeatureId[] =>
    PHONE_FEATURE_IDS.filter(id => {
        // Kontakty niosą pełną książkę klientów bez maskowania, a numer do kliknięcia
        // stoi na karcie klienta - jedno i drugie wymaga wglądu w klientów.
        if (id === 'calls') return canViewCustomers;
        // Prośba o połączenie idzie wyłącznie przez Web Push (backend: CLICK_TO_CALL ma
        // tylko transport WEB_PUSH) - aplikacja ze sklepu jej nie dostanie.
        if (id === 'dial') return canViewCustomers && !nativeApp;
        // Tak jak dawna strona „Skróty mobilne" (/mobile-shortcuts).
        if (id === 'voice') return canViewVisits;
        // Aplikacja ze sklepu już jest na ekranie głównym.
        if (id === 'app') return !nativeApp;
        return true;
    });
