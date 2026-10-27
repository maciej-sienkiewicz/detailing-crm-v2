// src/modules/tutorial-tips/tutorialLessons.ts
//
// Które instruktaże pasują do którego widoku. Instruktaże to animacje z podstrony
// „Poznaj program" strony DetailBoost (repozytorium detailboost-webpage,
// public/animacje/<slug>/), skopiowane do public/animacje/ aplikacji - jak animacje okna
// poczty (mailSetup/inquiriesTour.ts): serwer strony pozwala osadzać je tylko na swojej
// domenie (frame-ancestors 'self'), a aplikacja mobilna musi je mieć bez internetu.
// Chmurka na dole widoku otwiera lekcje o tym module w oknie, w programie.
//
// `view` to klucz zapisywany na serwerze przy „Nie pokazuj więcej" - musi zostać
// stały, nawet gdy zmienią się lekcje albo adres widoku (inaczej zamknięta chmurka
// wróciłaby). Widok bez lekcji nie dostaje chmurki: nie ma do czego prowadzić.

export interface TutorialLesson {
    /** Katalog animacji w public/animacje/. */
    slug: string;
    title: string;
    /** Długość animacji w sekundach. */
    seconds: number;
    chapters: number;
}

export interface TutorialModule {
    /** Klucz widoku do zapamiętania zamknięcia (A-Z, 0-9, _). */
    view: string;
    /** Nazwa modułu jak w menu - „Instruktaż: Kalendarz". */
    module: string;
    /** Najpierw lekcja, od której warto zacząć - to ją pokazuje chmurka. */
    lessons: readonly TutorialLesson[];
}

/**
 * Tytuły, długości i rozdziały ze strony (src/poznaj/animacje.json i animacje.gen.json
 * w detailboost-webpage). Po nowym nagraniu lekcji skopiować jej pliki i dopisać wpis.
 */
const LESSONS: Readonly<Record<string, Omit<TutorialLesson, 'slug'>>> = {
    'jak-wyglada-program': { title: 'Jak wygląda program?', seconds: 58, chapters: 2 },
    'jak-uzupelnic-dane-firmy': { title: 'Jak uzupełnić dane firmy?', seconds: 59, chapters: 4 },
    'jak-dodac-usluge-do-cennika': { title: 'Jak dodać usługę do cennika?', seconds: 56, chapters: 3 },
    'jak-stworzyc-pakiet-uslug': { title: 'Jak stworzyć pakiet usług?', seconds: 53, chapters: 3 },
    'jak-zalozyc-konto-pracownikowi': { title: 'Jak założyć konto pracownikowi?', seconds: 57, chapters: 4 },
    'jak-dodac-swoj-podpis': { title: 'Jak dodać swój podpis?', seconds: 42, chapters: 3 },
    'jak-sparowac-tablet': { title: 'Jak sparować tablet?', seconds: 52, chapters: 4 },
    'jak-przeniesc-kontakty-na-telefon': { title: 'Jak przenieść kontakty na telefon?', seconds: 65, chapters: 4 },
    'jak-ustawic-nazwe-nadawcy-sms': { title: 'Jak ustawić nazwę nadawcy SMS?', seconds: 51, chapters: 4 },
    'jak-wlaczyc-automatyczne-wiadomosci': { title: 'Jak włączyć automatyczne wiadomości?', seconds: 55, chapters: 4 },
    'jak-wylaczyc-karte-wizyty': { title: 'Jak wyłączyć kartę wizyty?', seconds: 40, chapters: 3 },
    'jak-podlaczyc-poczte': { title: 'Jak podłączyć pocztę studia?', seconds: 44, chapters: 3 },
    'jak-ustawic-stopke-email': { title: 'Jak ustawić stopkę e-mail?', seconds: 57, chapters: 4 },
    'jak-polaczyc-ksef': { title: 'Jak połączyć KSeF z programem?', seconds: 59, chapters: 4 },
    'jak-pokazac-ceny-na-protokole': { title: 'Jak pokazać ceny usług na protokole?', seconds: 34, chapters: 3 },
    'jak-ustawic-stanowiska': { title: 'Jak ustawić stanowiska?', seconds: 61, chapters: 3 },
    'jak-dzialaja-zapytania': { title: 'Jak działają zapytania?', seconds: 53, chapters: 4 },
    'jak-odpowiedziec-klientowi': { title: 'Jak odpowiedzieć klientowi z wyceną?', seconds: 61, chapters: 3 },
    'jak-dziala-tablica-zapytan': { title: 'Jak działa tablica zapytań?', seconds: 87, chapters: 5 },
    'jak-poslugiwac-sie-kalendarzem': { title: 'Jak posługiwać się kalendarzem?', seconds: 65, chapters: 5 },
    'jak-dodac-rezerwacje': { title: 'Jak dodać rezerwację?', seconds: 72, chapters: 6 },
    'jak-odwolac-rezerwacje': { title: 'Jak odwołać rezerwację?', seconds: 38, chapters: 5 },
    'jak-otworzyc-wizyte': { title: 'Jak otworzyć wizytę?', seconds: 65, chapters: 4 },
    'jak-dodac-vin-ze-zdjecia': { title: 'Jak dodać VIN ze zdjęcia?', seconds: 42, chapters: 4 },
    'jak-dodac-zdjecia-i-uszkodzenia': { title: 'Jak dodać zdjęcia i uszkodzenia?', seconds: 97, chapters: 4 },
    'jak-podpisac-i-wydrukowac-protokol': { title: 'Jak podpisać i wydrukować protokół?', seconds: 67, chapters: 4 },
    'jak-dodac-zadania-dla-zespolu': { title: 'Jak dodać zadanie dla zespołu?', seconds: 68, chapters: 4 },
    'jak-zaplanowac-auto-na-stanowisku': { title: 'Jak zaplanować auto na stanowisku?', seconds: 97, chapters: 5 },
    'jak-edytowac-wizyte': { title: 'Jak edytować wizytę?', seconds: 76, chapters: 4 },
    'jak-dodac-zdjecia-do-wizyty': { title: 'Jak dodać zdjęcia do wizyty?', seconds: 63, chapters: 4 },
    'jak-zaproponowac-dodatkowe-uslugi': { title: 'Jak zaproponować dodatkowe usługi?', seconds: 71, chapters: 4 },
    'jak-dodac-dodatkowe-uslugi': { title: 'Jak dodać dodatkowe usługi?', seconds: 59, chapters: 4 },
    'jak-zmienic-cene-uslugi-w-wizycie': { title: 'Jak zmienić cenę usługi w wizycie?', seconds: 50, chapters: 3 },
    'jak-dodac-skan-do-karty-pojazdu': { title: 'Jak dodać skan do karty pojazdu?', seconds: 44, chapters: 3 },
    'jak-wydac-auto-i-rozliczyc-wizyte': { title: 'Jak wydać auto i rozliczyć wizytę?', seconds: 106, chapters: 4 },
    'jak-sprawdzic-koszty-i-zysk-wizyty': { title: 'Jak sprawdzić koszty i zysk wizyty?', seconds: 50, chapters: 3 },
    'jak-usunac-wizyte': { title: 'Jak usunąć wizytę?', seconds: 40, chapters: 3 },
    'jak-dodac-kontrahenta-do-zlecen-zbiorczych': { title: 'Jak dodać kontrahenta do zleceń zbiorczych?', seconds: 71, chapters: 3 },
    'jak-wygenerowac-pdf-zlecenia-zbiorczego': { title: 'Jak wygenerować PDF zlecenia zbiorczego?', seconds: 62, chapters: 3 },
    'jak-dziala-zestawienie': { title: 'Jak działa zestawienie?', seconds: 103, chapters: 3 },
    'jak-dziala-cennik-zlecen-zbiorczych': { title: 'Jak działa cennik zleceń zbiorczych?', seconds: 71, chapters: 3 },
    'do-czego-jest-archiwum-kontrahentow': { title: 'Do czego jest archiwum kontrahentów?', seconds: 67, chapters: 3 },
    'jak-stworzyc-kampanie-sms': { title: 'Jak stworzyć kampanię SMS?', seconds: 63, chapters: 4 },
    'jak-obserwowac-konkurencje-na-instagramie': { title: 'Jak obserwować konkurencję na Instagramie?', seconds: 134, chapters: 7 },
    'jak-czytac-finanse-i-statystyki': { title: 'Jak czytać finanse i statystyki?', seconds: 71, chapters: 3 },
};

interface RouteModule {
    view: string;
    module: string;
    slugs: readonly string[];
    matches: (path: string) => boolean;
}

const exact = (...paths: string[]) => (path: string) => paths.includes(path);
const under = (base: string) => (path: string) => path === base || path.startsWith(`${base}/`);

const ROUTE_MODULES: readonly RouteModule[] = [
    {
        view: 'DASHBOARD',
        module: 'Tablica',
        slugs: ['jak-wyglada-program', 'jak-dodac-zadania-dla-zespolu'],
        matches: exact('/dashboard'),
    },
    {
        view: 'CALENDAR',
        module: 'Kalendarz',
        slugs: ['jak-poslugiwac-sie-kalendarzem', 'jak-dodac-rezerwacje', 'jak-odwolac-rezerwacje'],
        matches: exact('/calendar'),
    },
    {
        view: 'APPOINTMENT_FORM',
        module: 'Rezerwacja',
        slugs: ['jak-dodac-rezerwacje', 'jak-odwolac-rezerwacje'],
        matches: path => path === '/appointments/create' || /^\/appointments\/[^/]+\/edit$/.test(path),
    },
    {
        view: 'CHECKIN',
        module: 'Przyjęcie auta',
        slugs: [
            'jak-otworzyc-wizyte', 'jak-dodac-vin-ze-zdjecia', 'jak-dodac-zdjecia-i-uszkodzenia',
            'jak-podpisac-i-wydrukowac-protokol',
        ],
        matches: path => path === '/checkin/new' || /^\/reservations\/[^/]+\/checkin$/.test(path),
    },
    {
        view: 'OPERATIONS',
        module: 'Wizyty',
        slugs: ['jak-edytowac-wizyte', 'jak-usunac-wizyte'],
        matches: exact('/operations'),
    },
    {
        view: 'VISIT',
        module: 'Wizyta',
        slugs: [
            'jak-edytowac-wizyte', 'jak-dodac-zdjecia-do-wizyty', 'jak-zaproponowac-dodatkowe-uslugi',
            'jak-dodac-dodatkowe-uslugi', 'jak-zmienic-cene-uslugi-w-wizycie', 'jak-wydac-auto-i-rozliczyc-wizyte',
            'jak-sprawdzic-koszty-i-zysk-wizyty',
        ],
        matches: path => /^\/visits\/[^/]+$/.test(path),
    },
    {
        view: 'BAYS',
        module: 'Stanowiska',
        slugs: ['jak-zaplanowac-auto-na-stanowisku', 'jak-ustawic-stanowiska'],
        matches: exact('/bays'),
    },
    {
        view: 'LEADS',
        module: 'Zapytania',
        slugs: ['jak-dzialaja-zapytania', 'jak-dziala-tablica-zapytan', 'jak-odpowiedziec-klientowi'],
        matches: exact('/leads'),
    },
    {
        view: 'MAIL',
        module: 'Poczta',
        slugs: ['jak-odpowiedziec-klientowi', 'jak-podlaczyc-poczte', 'jak-ustawic-stopke-email'],
        matches: exact('/mail', '/inbox'),
    },
    {
        view: 'CAMPAIGNS',
        module: 'Kampanie',
        slugs: ['jak-stworzyc-kampanie-sms', 'jak-ustawic-nazwe-nadawcy-sms'],
        matches: path => under('/campaigns')(path) && path !== '/campaigns/settings',
    },
    {
        view: 'SCHEDULED_COMMUNICATION',
        module: 'Zaplanowane treści',
        slugs: ['jak-wlaczyc-automatyczne-wiadomosci'],
        matches: exact('/scheduled-communication'),
    },
    {
        view: 'INSTAGRAM',
        module: 'Instagram',
        slugs: ['jak-obserwowac-konkurencje-na-instagramie'],
        matches: exact('/instagram'),
    },
    {
        view: 'FINANCE',
        module: 'Finanse',
        slugs: ['jak-czytac-finanse-i-statystyki', 'jak-sprawdzic-koszty-i-zysk-wizyty', 'jak-polaczyc-ksef'],
        matches: path => path === '/finances' || under('/statistics')(path),
    },
    {
        view: 'BATCH_ORDERS',
        module: 'Zlecenia zbiorcze',
        slugs: [
            'jak-dodac-kontrahenta-do-zlecen-zbiorczych', 'jak-dziala-zestawienie', 'jak-wygenerowac-pdf-zlecenia-zbiorczego',
            'jak-dziala-cennik-zlecen-zbiorczych', 'do-czego-jest-archiwum-kontrahentow',
        ],
        matches: under('/batch-orders'),
    },
    {
        view: 'EMPLOYEES',
        module: 'Pracownicy',
        slugs: ['jak-zalozyc-konto-pracownikowi'],
        matches: under('/employees'),
    },
    {
        view: 'VEHICLE',
        module: 'Pojazdy',
        slugs: ['jak-dodac-skan-do-karty-pojazdu'],
        matches: path => /^\/vehicles\/[^/]+$/.test(path),
    },
];

/** Sekcje Ustawień (`/settings?tab=<sekcja>`) - każda to osobny widok z osobną chmurką. */
const SETTINGS_LESSONS: Readonly<Record<string, readonly string[]>> = {
    account: ['jak-dodac-swoj-podpis', 'jak-ustawic-stopke-email'],
    phone: ['jak-przeniesc-kontakty-na-telefon'],
    company: ['jak-uzupelnic-dane-firmy'],
    services: ['jak-dodac-usluge-do-cennika', 'jak-stworzyc-pakiet-uslug'],
    documents: ['jak-pokazac-ceny-na-protokole'],
    tablets: ['jak-sparowac-tablet'],
    bays: ['jak-ustawic-stanowiska'],
    templates: ['jak-wlaczyc-automatyczne-wiadomosci', 'jak-ustawic-nazwe-nadawcy-sms', 'jak-wylaczyc-karte-wizyty'],
    leads: ['jak-podlaczyc-poczte'],
    finance: ['jak-polaczyc-ksef'],
};

const withLessons = (view: string, module: string, slugs: readonly string[]): TutorialModule | null => {
    const lessons = slugs.flatMap(slug => (LESSONS[slug] ? [{ slug, ...LESSONS[slug] }] : []));
    return lessons.length ? { view, module, lessons } : null;
};

export function tutorialFor(pathname: string, search: string): TutorialModule | null {
    const path = pathname.replace(/\/+$/, '') || '/';
    if (path === '/settings') {
        const tab = new URLSearchParams(search).get('tab') ?? '';
        const slugs = SETTINGS_LESSONS[tab];
        return slugs ? withLessons(`SETTINGS_${tab.toUpperCase()}`, 'Ustawienia', slugs) : null;
    }
    const route = ROUTE_MODULES.find(r => r.matches(path));
    return route ? withLessons(route.view, route.module, route.slugs) : null;
}

/**
 * Wprost do pliku, nie do katalogu: nginx aplikacji (`try_files $uri /index.html`)
 * oddałby na `/animacje/<slug>/` samą aplikację zamiast animacji.
 */
export const lessonFrameSrc = (lesson: TutorialLesson) => `/animacje/${lesson.slug}/index.html`;
export const lessonPosterSrc = (lesson: TutorialLesson) => `/animacje/${lesson.slug}/plakat.webp`;

/** 65 → „1:05". */
export const formatDuration = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const plural = (n: number, one: string, few: string, many: string) => {
    if (n === 1) return `1 ${one}`;
    const isFew = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
    return `${n} ${isFew ? few : many}`;
};

export const chaptersLabel = (n: number) => plural(n, 'rozdział', 'rozdziały', 'rozdziałów');
export const lessonsLabel = (n: number) => plural(n, 'lekcja', 'lekcje', 'lekcji');
