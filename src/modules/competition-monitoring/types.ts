/**
 * Typy modułu analizy konkurencji na Instagramie (API v2).
 *
 * Reguła kontraktu: każda metryka przychodzi jako MetricTriple
 * (wartość + poprzedni okres + delta % + mediana konkurencji);
 * UI nigdy nie pokazuje liczby bez kontekstu.
 */

// ─── Profile (zarządzanie) ────────────────────────────────────────────────────

export type InstagramProfileStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';

export interface InstagramProfile {
    id: string;
    profileId: string;
    username: string;
    status: InstagramProfileStatus;
    apiError: boolean;
    isSelf: boolean;
    addedAt: string;
}

// ─── Metryki ──────────────────────────────────────────────────────────────────

export interface MetricTriple {
    value: number | null;
    previous: number | null;
    deltaPct: number | null;
    benchmark: number | null;
}

export interface Storefront {
    score: number;
    gaps: string[];
}

// ─── Tydzień ──────────────────────────────────────────────────────────────────

/**
 * Werdykt tygodnia dla jednego profilu - dokładnie jeden na profil.
 *
 * SILENT nie znaczy „brak danych", tylko „zwykle publikuje, a w tym tygodniu nie".
 * NEW to profil obserwowany za krótko, żeby cokolwiek nazwać u niego zwykłym.
 */
export type DigestVerdict = 'SILENT' | 'STANDOUT' | 'ACCELERATED' | 'STEADY' | 'NEW';

export interface DigestPost {
    permalink: string;
    format: ContentFormat;
    topicLabel: string;
    engagement: number;
    takenAt: string;
}

export interface ProfileDigest {
    profileId: string;
    username: string;
    isSelf: boolean;
    verdict: DigestVerdict;
    /** „@x zwiększył aktywność" - nagłówek wiersza. */
    headline: string;
    /** Co faktycznie zrealizowali, wyciągnięte z opisów postów. Null, gdy opisy milczą. */
    achievements: string | null;
    /** Liczby stojące za werdyktem - dowód, nie komunikat. */
    evidence: string;
    postsCount: number;
    engagementTotal: number;
    highlight: DigestPost | null;
    posts: DigestPost[];
    /** Kampanie reklamowe tego profilu w tym tygodniu. Puste, gdy się nie reklamował. */
    ads: DigestAd[];
}

/** Pigułka kampanii w tygodniowym podsumowaniu. */
export interface DigestAd {
    adId: string;
    state: 'STARTED' | 'RUNNING' | 'ENDED';
    title: string | null;
    days: number;
    reach: number | null;
    startedOn: string;
}

export interface WeeklyDigest {
    weekStart: string;
    weekEnd: string;
    generatedAt: string;
    narrativeSource: 'LLM' | 'TEMPLATE';
    profiles: ProfileDigest[];
    recommendation: { text: string; reason: string } | null;
    position: { rank: number; total: number } | null;
    selfUsername: string | null;
    profilesWatched: number;
    hasSelf: boolean;
}

// ─── Pobieranie danych ────────────────────────────────────────────────────────

export interface ResyncResult {
    attempted: number;
    recovered: number;
    stillFailing: number;
}

// ─── Treści ───────────────────────────────────────────────────────────────────

export type ContentFormat = 'PHOTO' | 'REELS' | 'CAROUSEL';

export interface ContentItem {
    postId: string;
    profileId: string;
    username: string;
    isSelf: boolean;
    takenAt: string;
    permalink: string;
    caption: string | null;
    likeCount: number;
    commentCount: number;
    viewCount: number | null;
    format: ContentFormat;
    topic: string;
    topicLabel: string;
    isPromo: boolean;
    isContest: boolean;
    erPct: number | null;
    engagement: number;
    reaction: 'LIKED' | 'DISLIKED' | null;
    /** Ile razy więcej reakcji niż typowy post TEGO profilu; null przy mniej niż 3 postach. */
    relativeToNorm?: number | null;
    /** Kod posta - po nim osadzamy post (instagram.com/p/{kod}/embed). */
    postCode?: string;
}

export interface ContentPage {
    items: ContentItem[];
    page: number;
    pageSize: number;
    totalItems: number;
    topics: { value: string; label: string; count: number }[];
}

// ─── Sugestie podobnych profili ──────────────────────────────────────────────

export interface ProfileSuggestion {
    username: string;
    fullName: string | null;
    isVerified: boolean;
    /** Liczba obserwujących sugerowanego konta; null gdy nie udało się jej pobrać. */
    followerCount: number | null;
    recommendedByCount: number;
    similarTo: string;
    /** Kategoria profilu z Instagrama („Automotive Service"). */
    category?: string | null;
    /** Profil wspomina którąś z Twoich miejscowości (ustawienia „W okolicy"). */
    nearby?: boolean;
}

// ─── Generator AI ─────────────────────────────────────────────────────────────

export interface GenerateInstagramPostRequest {
    topic: string;
    context?: string;
    postTone?: 'premium' | 'technical' | 'emotional' | 'casual';
    postLength?: 'short' | 'full';
    /**
     * Reguły ad-hoc, obowiązujące tylko dla tego jednego generowania.
     * Reguły trwałe studia żyją w /style-rules i backend dokłada je sam.
     */
    styleNotes?: string[];
    /** Realizacja: backend bierze z niej auto i wykonane usługi jako fakty dla modelu. */
    visitId?: string;
    /** Zdjęcia tej wizyty, które zobaczy model (najwyżej 6), w kolejności karuzeli. */
    photoIds?: string[];
}

/**
 * Odpowiedź /generate. Pole `content` zostaje bez zmian; reszta to informacja
 * o pętli weryfikacji reguł i identyfikator posta, po którym można go ocenić.
 */
export interface FailedRule {
    rule: string;
    /** Cytat z posta, na który powołał się weryfikator. */
    reason: string;
}

export interface InstagramPostResult {
    content: string;
    postId: string;
    verificationPassed: boolean;
    /** Reguły, których nie udało się spełnić mimo korekt (puste, gdy weryfikacja przeszła). */
    failedRules: string[];
    /** To samo z uzasadnieniem - starsze odpowiedzi backendu tego pola nie mają. */
    failedRuleDetails?: FailedRule[];
    /** Liczba rund weryfikacji; 0 oznacza, że studio nie ma żadnych reguł. */
    iterations: number;
}

// ─── Reguły stylistyczne studia ──────────────────────────────────────────────

export interface InstagramStyleRule {
    id: string;
    ruleText: string;
    active: boolean;
    createdAt: number;
    updatedAt: number;
}

export const MAX_STYLE_RULE_LENGTH = 500;
export const MAX_ACTIVE_STYLE_RULES = 20;

// ─── Historia i ocena wygenerowanych postów ──────────────────────────────────

export type GeneratedPostRating = 'POSITIVE' | 'NEGATIVE';

export interface GeneratedInstagramPost {
    id: string;
    topic: string;
    content: string;
    requestedTone: string | null;
    requestedLength: string | null;
    rating: GeneratedPostRating | null;
    ratingComment: string | null;
    verificationPassed: boolean | null;
    iterations: number | null;
    failedRules: string[];
    rulesSnapshot: string[];
    createdAt: number;
    ratedAt: number | null;
}

// ─── Reklamy konkurencji (Biblioteka reklam Meta) ─────────────────────────────

/** Jeden pasek w kalendarzu — jedna kampania. */
export interface AdBar {
    adId: string;
    title: string | null;
    /** ISO. Data rozpoczęcia emisji, także gdy wypada przed oknem kalendarza. */
    start: string;
    /** ISO albo null, gdy emisja trwa. */
    stop: string | null;
    days: number;
    reach: number | null;
    platforms: AdPlatform[];
    /** Tor rysowania: kampanie równoległe leżą jedna pod drugą. */
    lane: number;
    /**
     * Ile kreacji składa się na kampanię. Biblioteka Meta nadaje numer każdemu wariantowi
     * grafiki, więc „3 kampanie od tego samego dnia" były zwykle jedną ofertą w trzech wersjach.
     */
    variants?: number;
}

export type AdPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'MESSENGER' | 'AUDIENCE_NETWORK' | 'THREADS';

export interface AdCalendarRow {
    profileId: string;
    username: string;
    isSelf: boolean;
    /** Strona na Facebooku, po której pytamy o reklamy. Null = profilu nie da się sprawdzić. */
    facebookPageId: string | null;
    campaigns: number;
    activeNow: number;
    /** Dni każdej kampanii osobno: 4 kampanie po 3 dni = 12. */
    sponsoredDays: number;
    reachTotal: number | null;
    lanes: number;
    ads: AdBar[];
}

/**
 * Wynik próby wskazania strony na Facebooku.
 *
 * Powiązanie jest wspólne dla wszystkich studiów obserwujących profil, więc zapisuje się
 * od ręki tylko przy PIERWSZYM wskazaniu. Zmiana i odpięcie idą do administratora.
 */
export type PageLinkResult =
    | { status: 'LINKED'; adsFound: number; pageName: string }
    | { status: 'REQUESTED' };

/** Kandydat na stronę reklamodawcy - wynik szukania po nazwie. */
export interface PageCandidate {
    pageId: string;
    pageName: string;
    /** Ile reklam tej strony trafiło w zapytanie - odróżnia firmę od zbieżnej nazwy. */
    ads: number;
    lastStart: string | null;
    /**
     * Nazwa profilu na Instagramie, bez małpy. Meta jej nie podaje - backend
     * wyprowadza ją z domeny reklamodawcy, więc bywa pusta i to jest normalne.
     */
    instagram: string | null;
}

export interface UnlinkedProfile {
    profileId: string;
    username: string;
}

export interface AdCalendar {
    year: number;
    /** ISO. Prawa krawędź kalendarza w roku bieżącym. */
    today: string;
    activeToday: number;
    rows: AdCalendarRow[];
    unlinked: UnlinkedProfile[];
    /** false = brak tokena Biblioteki reklam; widok pokazuje „brak danych", nie pusty rok. */
    configured: boolean;
}

export interface AdLocation {
    name: string;
    type: string;
    excluded: boolean;
}

export interface AdReachBucket {
    ageRange: string;
    male: number;
    female: number;
    /** Czy przedział mieści się w wieku ustawionym przez reklamodawcę. */
    inTargetAge: boolean;
}

export interface AdDetail {
    adId: string;
    profileId: string;
    username: string;
    title: string | null;
    start: string;
    stop: string | null;
    days: number;
    active: boolean;
    /** Zasięg w Polsce. */
    reach: number | null;
    platforms: AdPlatform[];
    targetAges: string | null;
    targetGender: string | null;
    locations: AdLocation[];
    payer: string | null;
    beneficiary: string | null;
    breakdown: AdReachBucket[];
    /** Ilu ludzi spoza ustawionego przedziału wieku reklama i tak dosięgła. */
    outOfTargetAgeReach: number;
    /**
     * Treść reklamy tak, jak widzi ją odbiorca. Razem z `title`, `linkDescription`
     * i `linkCaption` to CAŁA kreacja, jaką oddaje Biblioteka reklam — grafiki
     * Meta nie udostępnia w żadnym polu API.
     */
    body: string | null;
    linkDescription: string | null;
    /** Domena, na którą reklama kieruje — „folia-samochodowa.pl". */
    linkCaption: string | null;
    /** Publiczny link do reklamy w Bibliotece Meta. */
    snapshotUrl: string | null;
}

/** Nazwy miejsc wyświetlania — skróty FB/IG/MSG/AN nikomu nic nie mówią. */
export const AD_PLATFORM_LABELS: Record<AdPlatform, string> = {
    FACEBOOK: 'Facebook',
    INSTAGRAM: 'Instagram',
    MESSENGER: 'Messenger',
    AUDIENCE_NETWORK: 'Audience Network',
    THREADS: 'Threads',
};

export type WeeksOption = 4 | 12 | 26 | 52;

export const FORMAT_LABELS: Record<ContentFormat, string> = {
    PHOTO: 'Zdjęcie',
    REELS: 'Rolka',
    CAROUSEL: 'Karuzela',
};

// ─── Odkrywanie obszaru (kto reklamuje się na frazy w rejonie) ────────────────

/** Jak szeroko traktować „w rejonie": tylko wpisane miasta czy też szersze obszary. */
export type AreaMatchMode = 'CITIES_ONLY' | 'INCLUDE_BROADER';

/** Jeden wiersz tabeli wyników — jedna firma reklamująca się w rejonie. */
/** Odpowiedź „Obserwuj": nazwa profilu USTALONA PRZEZ SERWER, nie przez przeglądarkę. */
export interface FollowedAdvertiser {
    profileId: string;
    username: string;
    /** PENDING_APPROVAL zaraz po dodaniu - tak samo jak przy ręcznym wpisaniu nazwy. */
    status: InstagramProfileStatus;
}

export interface AdvertiserRow {
    pageId: string;
    companyName: string;
    /** Ile aktywnych reklam tej firmy trafia w obszar. */
    activeAds: number;
    /** Łączny zasięg w UE (eu_total_reach); null, gdy Meta nie podała liczby. */
    reach: number | null;
    /** Strona firmy w Bibliotece reklam Meta (aktywne reklamy, PL). */
    adLibraryUrl: string;
    /** Podgląd pojedynczej reklamy; null, gdy żadna nie ma migawki. */
    sampleSnapshotUrl: string | null;
    /**
     * Nazwa profilu na Instagramie, bez małpy. Meta jej nie podaje - backend
     * wyprowadza ją z adresu, na który kieruje reklama, więc bywa pusta.
     */
    instagram: string | null;
    /** Ile aktywnych reklam firmy w rejonie ruszyło w oknie nowości (`AreaResults.newWindowDays`). */
    newCampaigns: number;
    /**
     * Firma zaczęła się reklamować dopiero w oknie nowości — debiutant, nie rotacja
     * kreacji. Serwer rozstrzyga to po własnym rejestrze reklamodawców, nie po tym,
     * co akurat widać w cache.
     */
    newAdvertiser: boolean;
    /** ISO data (bez czasu) startu najświeższej nowej kampanii; null, gdy żadna nie jest nowa. */
    latestCampaignStart: string | null;
    /** Te same reklamy zgrupowane w kampanie: warianty jednej oferty liczą się raz. */
    activeCampaigns?: number;
    /**
     * SERVICE - studio, realna konkurencja; PRODUCTS - sklep, producent, hurtownia;
     * UNCERTAIN - do przejrzenia; PENDING - jeszcze nieocenione.
     */
    relevance?: 'SERVICE' | 'PRODUCTS' | 'UNCERTAIN' | 'PENDING';
}

/** Status frazy we wspólnym cache — po nim wiadomo, czemu tabela jest pusta/niepełna. */
export interface PhraseStatus {
    phrase: string;
    /** OK | RATE_LIMITED | NOT_VERIFIED | ERROR | PENDING (jeszcze nie pobrana). */
    status: string;
    adCount: number;
    /** true = fraza zbyt ogólna, biblioteka miała więcej reklam niż przeszliśmy. */
    truncated: boolean;
    lastFetchedAt: string | null;
}

/** Wyniki odkrywania obszaru — wspólny kształt dla podglądu i zapisanego śledzenia. */
export interface AreaResults {
    phrases: string[];
    locations: string[];
    matchMode: AreaMatchMode;
    /** false = brak tokena Biblioteki reklam; ekran pokazuje „brak danych". */
    configured: boolean;
    /** ISO. Kiedy złożono wyniki (dane z cache, nie z chwili odczytu). */
    generatedAt: string;
    /** STRONA wyników, nie całość. */
    advertisers: AdvertiserRow[];
    /** Numer strony liczony od zera. */
    page: number;
    pageSize: number;
    /** Wszyscy widoczni reklamodawcy — z tego liczy się liczbę stron. */
    totalAdvertisers: number;
    totalActiveAds: number;
    /** Ilu reklamodawców odpadło przez wykluczenia - bez tego krótka tabela nie mówi dlaczego. */
    hiddenAdvertisers: number;
    /** Ile firm w CAŁEJ tabeli zadebiutowało w oknie nowości. */
    newAdvertisers: number;
    /** Nowe kampanie firm, które już tu były (bez kampanii debiutantów). */
    newCampaigns: number;
    /** Długość okna nowości w dniach — o niej decyduje serwer, ekran tylko ją wypisuje. */
    newWindowDays: number;
    phraseStatuses: PhraseStatus[];
}

/** Jedna fraza z katalogu ustalonego przez administratora aplikacji. */
export interface CatalogPhrase {
    id: string;
    text: string;
    /** Klucz grupy (POWLOKI, FOLIE, ...) - stabilny, niezależny od etykiety. */
    group: string;
    groupLabel: string;
}

/** Reklamodawca ukryty przez to studio - da się przywrócić. */
export interface BlockedAdvertiser {
    pageId: string;
    pageName: string | null;
    reason: string | null;
    createdAt: string;
}

/** Zapisane, trwałe śledzenie obszaru. */
/** Ustawienia rejonu jednego studia. Jeden zestaw, nie lista. */
export interface AreaSettings {
    locations: string[];
    matchMode: AreaMatchMode;
    /** Identyfikatory fraz z katalogu, które studio odznaczyło. */
    excludedPhraseIds: string[];
    /** Ile fraz katalogu zostaje po odznaczeniach. */
    trackedPhraseCount: number;
    /** ISO data, do której studio odznaczyło nowości; null, gdy nigdy tego nie robiło. */
    noveltyAckedThrough: string | null;
    /** ISO albo null, gdy studio jeszcze nic nie ustawiło. */
    updatedAt: string | null;
}

export interface SaveAreaSettings {
    locations: string[];
    matchMode?: AreaMatchMode;
    /** Frazy ODZNACZONE, nie wybrane — katalog ustala administrator aplikacji. */
    excludedPhraseIds: string[];
}

// ─── Przegląd (GET /instagram/home) ───────────────────────────────────────────

export interface PostingPlan {
    /** Plan studia w postach na tydzień - ustawiany w „Moje konta", domyślnie 3. */
    weeklyGoal: number;
    /** „październiku" - miejscownik, do „Posty w październiku". */
    monthLabel: string;
    postsThisMonth: number;
    monthGoal: number;
    postsThisWeek: number;
    lastPostAt: string | null;
    daysSinceLastPost: number | null;
    /** false - posty własnego profilu nie są jeszcze pobrane; zero w bazie nie znaczy zero na profilu. */
    postsSynced: boolean;
}

export interface FollowersSummary {
    value: number | null;
    gain30d: number | null;
    gain30dPct: number | null;
    competitorsMedianGain30dPct: number | null;
}

/** Stan pobrania własnego profilu - dopóki nie READY, Przegląd nie ocenia bio ani planu. */
export type SelfSyncState = 'READY' | 'PENDING' | 'FAILED';

/**
 * Jedna rzecz do zrobienia. `target` mówi, dokąd prowadzi przycisk - lista jest zamknięta
 * po stronie serwera, a nieznany cel ekran pomija zamiast pokazać martwy przycisk.
 */
export type HomeTodoTarget =
    | 'GENERATE_POST'
    | 'OPEN_URL'
    | 'OPEN_AREA'
    | 'OPEN_PROFILES'
    | 'CONNECT'
    | 'OPEN_LEADS'
    | 'OPEN_COMPETITION'
    | 'OPEN_GOOGLE'
    | 'OPEN_ADS';

export interface HomeTodo {
    kind: string;
    title: string;
    detail: string | null;
    actionLabel: string;
    target: HomeTodoTarget | string;
    url?: string | null;
    visitId?: string | null;
}

export interface HomeMarketEvent {
    kind: string;
    title: string;
    /** ISO, sam dzień. */
    date: string;
    username: string | null;
    url: string | null;
    target: string | null;
}

export interface HomeConnection {
    username: string;
    status: string;
    lastSyncAt: string | null;
}

export interface OwnInsightsSummary {
    days: number;
    reach: number | null;
    views: number | null;
    accountsEngaged: number | null;
    follows: number | null;
    unfollows: number | null;
    contactTaps: Record<string, number>;
    lastSyncAt: string | null;
}

export interface InstagramLeadsSummary {
    days: number;
    conversations: number;
    awaitingReply: number;
    convertedToVisits: number;
    /** Brutto wygranych spraw w groszach - ta sama liczba co w analityce leadów. */
    wonValueGrossCents: number;
}

export interface HomeGoogle {
    locationTitle: string | null;
    averageRating: number | null;
    totalReviews: number | null;
    days: number;
    calls: number | null;
    directions: number | null;
    websiteClicks: number | null;
    callsPrevious: number | null;
    unansweredReviews: number;
    dataUntil: string | null;
}

export interface InstagramHome {
    hasSelf: boolean;
    selfUsername: string | null;
    selfStudioProfileId: string | null;
    profilesWatched: number;
    pendingApproval: number;
    plan: PostingPlan | null;
    followers: FollowersSummary | null;
    storefrontGaps: string[];
    todo: HomeTodo[];
    market: HomeMarketEvent[];
    connection: HomeConnection | null;
    insights: OwnInsightsSummary | null;
    leads: InstagramLeadsSummary | null;
    google?: HomeGoogle | null;
    selfSync?: SelfSyncState | null;
}

// ─── Konkurencja (GET /instagram/competition) ─────────────────────────────────

/** Okno porównania. 90 dni to minimum, w którym średnia z 1-3 postów tygodniowo coś znaczy. */
export type CompetitionDays = 90 | 365;

export const COMPETITION_DAYS_OPTIONS: { value: CompetitionDays; label: string }[] = [
    { value: 90, label: '90 dni' },
    { value: 365, label: '12 miesięcy' },
];

export interface CompetitionProfile {
    studioProfileId: string;
    profileId: string;
    username: string;
    isSelf: boolean;
    apiError: boolean;
    followers: number | null;
    followersGain: number | null;
    followersGainPct: number | null;
    /** Pierwszy pomiar w oknie; późniejszy niż `from`, gdy profil obserwujemy krócej. */
    growthFrom: string | null;
    postsInWindow: number;
    postsPerWeek: number;
    reactionsPerPost: number | null;
    /** Posty w każdym tygodniu z `CompetitionResponse.weeks`. */
    weeklyPosts: number[];
    regularityPct: number;
    formatMix: { photo: number; reels: number; carousel: number };
    /** Null - profil bez wskazanej strony na Facebooku, nie wiemy. */
    activeCampaigns: number | null;
    lastPostAt: string | null;
}

export interface CompetitionMedian {
    followers: number | null;
    followersGainPct: number | null;
    postsPerWeek: number | null;
    reactionsPerPost: number | null;
    basedOn: number;
}

export interface CompetitionEvent {
    weekStart: string;
    date: string;
    profileId: string | null;
    type: string;
    title: string;
}

export interface CompetitionResponse {
    days: number;
    from: string;
    to: string;
    /** Poniedziałki, od najstarszego; ostatni tydzień jest w toku. */
    weeks: string[];
    profiles: CompetitionProfile[];
    /** Mediana konkurentów (bez własnego studia); null poniżej dwóch z danymi. */
    median: CompetitionMedian | null;
    events: CompetitionEvent[];
}
