// src/modules/tutorial-tips/tutorialLessons.ts
//
// Który instruktaż pasuje do którego widoku. Instruktaże to animacje z podstrony
// „Poznaj program" strony DetailBoost (repozytorium detailboost-webpage,
// public/animacje/<slug>/), skopiowane do public/animacje/ aplikacji - jak animacje okna
// poczty (mailSetup/inquiriesTour.ts): serwer strony pozwala osadzać je tylko na swojej
// domenie (frame-ancestors 'self'), a aplikacja mobilna musi je mieć bez internetu.
// Chmurka na dole widoku otwiera lekcję o tym module w oknie, w programie.
//
// `view` to klucz zapisywany na serwerze przy „Nie pokazuj więcej" - musi zostać
// stały, nawet gdy zmieni się lekcja albo adres widoku (inaczej zamknięta chmurka
// wróciłaby). Widok bez lekcji nie dostaje chmurki: nie ma do czego prowadzić.

export interface TutorialLesson {
    /** Klucz widoku do zapamiętania zamknięcia (A-Z, 0-9, _). */
    view: string;
    /** Katalog animacji w public/animacje/. */
    slug: string;
    /** Nazwa modułu jak w menu - „Instruktaż · Kalendarz". */
    module: string;
    title: string;
    /** Długość animacji w sekundach. */
    seconds: number;
    chapters: number;
}

/**
 * Tytuły, długości i rozdziały ze strony (src/poznaj/animacje.json i animacje.gen.json
 * w detailboost-webpage). Po nowym nagraniu lekcji skopiować jej pliki i poprawić wpis.
 */
const LESSONS: Readonly<Record<string, Pick<TutorialLesson, 'title' | 'seconds' | 'chapters'>>> = {
    'jak-czytac-finanse-i-statystyki': { title: 'Jak czytać finanse i statystyki?', seconds: 71, chapters: 3 },
    'jak-dodac-kontrahenta-do-zlecen-zbiorczych': { title: 'Jak dodać kontrahenta do zleceń zbiorczych?', seconds: 71, chapters: 3 },
    'jak-dodac-rezerwacje': { title: 'Jak dodać rezerwację?', seconds: 72, chapters: 6 },
    'jak-dodac-skan-do-karty-pojazdu': { title: 'Jak dodać skan do karty pojazdu?', seconds: 44, chapters: 3 },
    'jak-dodac-swoj-podpis': { title: 'Jak dodać swój podpis?', seconds: 42, chapters: 3 },
    'jak-dodac-usluge-do-cennika': { title: 'Jak dodać usługę do cennika?', seconds: 56, chapters: 3 },
    'jak-dzialaja-zapytania': { title: 'Jak działają zapytania?', seconds: 53, chapters: 4 },
    'jak-edytowac-wizyte': { title: 'Jak edytować wizytę?', seconds: 76, chapters: 4 },
    'jak-obserwowac-konkurencje-na-instagramie': { title: 'Jak obserwować konkurencję na Instagramie?', seconds: 134, chapters: 7 },
    'jak-odpowiedziec-klientowi': { title: 'Jak odpowiedzieć klientowi z wyceną?', seconds: 61, chapters: 3 },
    'jak-otworzyc-wizyte': { title: 'Jak otworzyć wizytę?', seconds: 65, chapters: 4 },
    'jak-podlaczyc-poczte': { title: 'Jak podłączyć pocztę studia?', seconds: 44, chapters: 3 },
    'jak-pokazac-ceny-na-protokole': { title: 'Jak pokazać ceny usług na protokole?', seconds: 34, chapters: 3 },
    'jak-polaczyc-ksef': { title: 'Jak połączyć KSeF z programem?', seconds: 59, chapters: 4 },
    'jak-poslugiwac-sie-kalendarzem': { title: 'Jak posługiwać się kalendarzem?', seconds: 65, chapters: 5 },
    'jak-przeniesc-kontakty-na-telefon': { title: 'Jak przenieść kontakty na telefon?', seconds: 65, chapters: 4 },
    'jak-sparowac-tablet': { title: 'Jak sparować tablet?', seconds: 52, chapters: 4 },
    'jak-stworzyc-kampanie-sms': { title: 'Jak stworzyć kampanię SMS?', seconds: 63, chapters: 4 },
    'jak-ustawic-stanowiska': { title: 'Jak ustawić stanowiska?', seconds: 61, chapters: 3 },
    'jak-uzupelnic-dane-firmy': { title: 'Jak uzupełnić dane firmy?', seconds: 59, chapters: 4 },
    'jak-wlaczyc-automatyczne-wiadomosci': { title: 'Jak włączyć automatyczne wiadomości?', seconds: 55, chapters: 4 },
    'jak-wyglada-program': { title: 'Jak wygląda program?', seconds: 58, chapters: 2 },
    'jak-zalozyc-konto-pracownikowi': { title: 'Jak założyć konto pracownikowi?', seconds: 57, chapters: 4 },
    'jak-zaplanowac-auto-na-stanowisku': { title: 'Jak zaplanować auto na stanowisku?', seconds: 97, chapters: 5 },
};

interface RouteLesson {
    view: string;
    slug: string;
    module: string;
    matches: (path: string) => boolean;
}

const exact = (...paths: string[]) => (path: string) => paths.includes(path);
const under = (base: string) => (path: string) => path === base || path.startsWith(`${base}/`);

const ROUTE_LESSONS: readonly RouteLesson[] = [
    { view: 'DASHBOARD', module: 'Tablica', slug: 'jak-wyglada-program', matches: exact('/dashboard') },
    { view: 'CALENDAR', module: 'Kalendarz', slug: 'jak-poslugiwac-sie-kalendarzem', matches: exact('/calendar') },
    {
        view: 'APPOINTMENT_FORM',
        module: 'Rezerwacja',
        slug: 'jak-dodac-rezerwacje',
        matches: path => path === '/appointments/create' || /^\/appointments\/[^/]+\/edit$/.test(path),
    },
    {
        view: 'CHECKIN',
        module: 'Przyjęcie auta',
        slug: 'jak-otworzyc-wizyte',
        matches: path => path === '/checkin/new' || /^\/reservations\/[^/]+\/checkin$/.test(path),
    },
    { view: 'VISIT', module: 'Wizyta', slug: 'jak-edytowac-wizyte', matches: path => /^\/visits\/[^/]+$/.test(path) },
    { view: 'BAYS', module: 'Stanowiska', slug: 'jak-zaplanowac-auto-na-stanowisku', matches: exact('/bays') },
    { view: 'LEADS', module: 'Zapytania', slug: 'jak-dzialaja-zapytania', matches: exact('/leads') },
    { view: 'MAIL', module: 'Poczta', slug: 'jak-odpowiedziec-klientowi', matches: exact('/mail', '/inbox') },
    {
        view: 'CAMPAIGNS',
        module: 'Kampanie',
        slug: 'jak-stworzyc-kampanie-sms',
        matches: path => under('/campaigns')(path) && path !== '/campaigns/settings',
    },
    {
        view: 'SCHEDULED_COMMUNICATION',
        module: 'Zaplanowane treści',
        slug: 'jak-wlaczyc-automatyczne-wiadomosci',
        matches: exact('/scheduled-communication'),
    },
    { view: 'INSTAGRAM', module: 'Instagram', slug: 'jak-obserwowac-konkurencje-na-instagramie', matches: exact('/instagram') },
    {
        view: 'FINANCE',
        module: 'Finanse',
        slug: 'jak-czytac-finanse-i-statystyki',
        matches: path => path === '/finances' || under('/statistics')(path),
    },
    { view: 'BATCH_ORDERS', module: 'Zlecenia zbiorcze', slug: 'jak-dodac-kontrahenta-do-zlecen-zbiorczych', matches: under('/batch-orders') },
    { view: 'EMPLOYEES', module: 'Pracownicy', slug: 'jak-zalozyc-konto-pracownikowi', matches: under('/employees') },
    { view: 'VEHICLE', module: 'Pojazdy', slug: 'jak-dodac-skan-do-karty-pojazdu', matches: path => /^\/vehicles\/[^/]+$/.test(path) },
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

const withInfo = (view: string, module: string, slug: string): TutorialLesson | null => {
    const info = LESSONS[slug];
    return info ? { view, slug, module, ...info } : null;
};

export function lessonFor(pathname: string, search: string): TutorialLesson | null {
    const path = pathname.replace(/\/+$/, '') || '/';
    if (path === '/settings') {
        const tab = new URLSearchParams(search).get('tab') ?? '';
        const slug = SETTINGS_LESSONS[tab];
        return slug ? withInfo(`SETTINGS_${tab.toUpperCase()}`, 'Ustawienia', slug) : null;
    }
    const lesson = ROUTE_LESSONS.find(l => l.matches(path));
    return lesson ? withInfo(lesson.view, lesson.module, lesson.slug) : null;
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

export const chaptersLabel = (n: number) => {
    if (n === 1) return '1 rozdział';
    const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
    return `${n} ${few ? 'rozdziały' : 'rozdziałów'}`;
};
