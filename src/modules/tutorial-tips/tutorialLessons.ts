// src/modules/tutorial-tips/tutorialLessons.ts
//
// Który instruktaż pasuje do którego widoku. Instruktaże to animacje z podstrony
// „Poznaj program" na stronie DetailBoost (`/poznaj-program#<slug>`); chmurka na dole
// widoku prowadzi do lekcji o tym module.
//
// `view` to klucz zapisywany na serwerze przy „Nie pokazuj więcej" - musi zostać
// stały, nawet gdy zmieni się lekcja albo adres widoku (inaczej zamknięta chmurka
// wróciłaby). Widok bez lekcji nie dostaje chmurki: nie ma do czego prowadzić.

export const TUTORIALS_URL = 'https://demo.detailboost.pl/poznaj-program';

export interface TutorialLesson {
    /** Klucz widoku do zapamiętania zamknięcia (A-Z, 0-9, _). */
    view: string;
    /** Kotwica lekcji na podstronie „Poznaj program". */
    slug: string;
}

interface RouteLesson extends TutorialLesson {
    matches: (path: string) => boolean;
}

const exact = (...paths: string[]) => (path: string) => paths.includes(path);
const under = (base: string) => (path: string) => path === base || path.startsWith(`${base}/`);

const ROUTE_LESSONS: readonly RouteLesson[] = [
    { view: 'DASHBOARD', slug: 'jak-wyglada-program', matches: exact('/dashboard') },
    { view: 'CALENDAR', slug: 'jak-poslugiwac-sie-kalendarzem', matches: exact('/calendar') },
    {
        view: 'APPOINTMENT_FORM',
        slug: 'jak-dodac-rezerwacje',
        matches: path => path === '/appointments/create' || /^\/appointments\/[^/]+\/edit$/.test(path),
    },
    {
        view: 'CHECKIN',
        slug: 'jak-otworzyc-wizyte',
        matches: path => path === '/checkin/new' || /^\/reservations\/[^/]+\/checkin$/.test(path),
    },
    { view: 'VISIT', slug: 'jak-edytowac-wizyte', matches: path => /^\/visits\/[^/]+$/.test(path) },
    { view: 'BAYS', slug: 'jak-zaplanowac-auto-na-stanowisku', matches: exact('/bays') },
    { view: 'LEADS', slug: 'jak-dzialaja-zapytania', matches: exact('/leads') },
    { view: 'MAIL', slug: 'jak-odpowiedziec-klientowi', matches: exact('/mail', '/inbox') },
    {
        view: 'CAMPAIGNS',
        slug: 'jak-stworzyc-kampanie-sms',
        matches: path => under('/campaigns')(path) && path !== '/campaigns/settings',
    },
    {
        view: 'SCHEDULED_COMMUNICATION',
        slug: 'jak-wlaczyc-automatyczne-wiadomosci',
        matches: exact('/scheduled-communication'),
    },
    { view: 'INSTAGRAM', slug: 'jak-obserwowac-konkurencje-na-instagramie', matches: exact('/instagram') },
    {
        view: 'FINANCE',
        slug: 'jak-czytac-finanse-i-statystyki',
        matches: path => path === '/finances' || under('/statistics')(path),
    },
    { view: 'BATCH_ORDERS', slug: 'jak-dodac-kontrahenta-do-zlecen-zbiorczych', matches: under('/batch-orders') },
    { view: 'EMPLOYEES', slug: 'jak-zalozyc-konto-pracownikowi', matches: under('/employees') },
    { view: 'VEHICLE', slug: 'jak-dodac-skan-do-karty-pojazdu', matches: path => /^\/vehicles\/[^/]+$/.test(path) },
];

/** Sekcje Ustawień (`/settings?tab=<sekcja>`) - każda to osobny widok z osobną chmurką. */
const SETTINGS_LESSONS: Readonly<Record<string, string>> = {
    account: 'jak-dodac-swoj-podpis',
    phone: 'jak-przeniesc-kontakty-na-telefon',
    company: 'jak-uzupelnic-dane-firmy',
    services: 'jak-dodac-usluge-do-cennika',
    documents: 'jak-pokazac-ceny-na-protokole',
    tablets: 'jak-sparowac-tablet',
    bays: 'jak-ustawic-stanowiska',
    templates: 'jak-wlaczyc-automatyczne-wiadomosci',
    leads: 'jak-podlaczyc-poczte',
    finance: 'jak-polaczyc-ksef',
};

export function lessonFor(pathname: string, search: string): TutorialLesson | null {
    const path = pathname.replace(/\/+$/, '') || '/';
    if (path === '/settings') {
        const tab = new URLSearchParams(search).get('tab') ?? '';
        const slug = SETTINGS_LESSONS[tab];
        return slug ? { view: `SETTINGS_${tab.toUpperCase()}`, slug } : null;
    }
    const lesson = ROUTE_LESSONS.find(l => l.matches(path));
    return lesson ? { view: lesson.view, slug: lesson.slug } : null;
}

export const lessonUrl = (lesson: TutorialLesson) => `${TUTORIALS_URL}#${lesson.slug}`;
