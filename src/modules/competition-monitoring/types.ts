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

// ─── Przegląd ─────────────────────────────────────────────────────────────────

export interface MiniRankRow {
    studioProfileId: string;
    profileId: string;
    username: string;
    isSelf: boolean;
    followers: number | null;
    followerDelta30d: number | null;
    erPct: number | null;
    postsPerWeek: number | null;
    activityIndex: number;
}

export interface Overview {
    weeks: number;
    /** Liczebność obserwowanej grupy, wszystkie porównania dotyczą tylko tej grupy. */
    comparisonGroupSize: number;
    lastSyncAt: string | null;
    /** Najbliższa lekka synchronizacja (codzienna). */
    nextDailySyncAt: string | null;
    /** Najbliższa pełna synchronizacja (tygodniowa). */
    nextDeepSyncAt: string | null;
    profilesCount: number;
    hasSelf: boolean;
    selfUsername: string | null;
    position: { rank: number; total: number } | null;
    erPct: MetricTriple;
    postsPerWeek: MetricTriple;
    activityIndex: MetricTriple;
    storefront: Storefront | null;
    miniRanking: MiniRankRow[];
}

// ─── Porównanie ───────────────────────────────────────────────────────────────

export interface FormatMix {
    photoPct: number;
    reelsPct: number;
    carouselPct: number;
}

export interface BenchmarkRow {
    studioProfileId: string;
    profileId: string;
    username: string;
    isSelf: boolean;
    apiError: boolean;
    followers: MetricTriple;
    erPct: MetricTriple;
    postsPerWeek: MetricTriple;
    regularityPct: number;
    formatMix: FormatMix;
    activityIndex: MetricTriple;
    storefront: Storefront;
}

export interface WeeklyChartPoint {
    weekStart: string;
    values: Record<string, { posts: number; engagement: number }>;
}

export interface FollowerSeries {
    profileId: string;
    username: string;
    isSelf: boolean;
    /** Dzień dodania profilu do obserwacji - wcześniejszej historii nie da się odtworzyć. */
    observedSince: string;
    points: { date: string; count: number | null }[];
}

export interface ChartAnnotation {
    date: string;
    profileId: string | null;
    type: string;
    title: string;
}

export interface Benchmark {
    weeks: number;
    /** Liczebność obserwowanej grupy, wszystkie porównania dotyczą tylko tej grupy. */
    comparisonGroupSize: number;
    rows: BenchmarkRow[];
    weekly: WeeklyChartPoint[];
    followers: FollowerSeries[];
    annotations: ChartAnnotation[];
}

/** Wynik ręcznego ponowienia pobrania danych dla profili z błędem. */
export interface ResyncResult {
    attempted: number;
    recovered: number;
    stillFailing: number;
}

/** Rodzaj zdarzenia w pulsie konkurencji. */
export type PulseEventKind =
    | 'YOUR_POST'
    | 'YOUR_SILENCE'
    /** Konkurent uruchomił sponsorowaną kampanię (Biblioteka reklam Meta). */
    | 'AD_STARTED'
    /** Nasz odczyt wykrył, że kampania przestała się emitować. */
    | 'AD_ENDED'
    | 'ACCELERATION'
    | 'SLOWDOWN'
    | 'STANDOUT_POST'
    | 'NEW_TOPIC'
    | 'FOLLOWER_SPIKE'
    | 'FOLLOWER_DROP';

export interface PulseEvent {
    kind: PulseEventKind;
    isSelf: boolean;
    username: string;
    headline: string;
    detail: string;
    permalink: string | null;
    occurredAt: string;
}

export interface CompetitorPulse {
    events: PulseEvent[];
    windowFrom: string;
    windowTo: string;
    /** Ile tygodni historii posłużyło za normę, do której porównujemy zdarzenia. */
    baselineWeeks: number;
    hasSelfProfile: boolean;
    profilesWatched: number;
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
}

export interface ContentPage {
    items: ContentItem[];
    page: number;
    pageSize: number;
    totalItems: number;
    topics: { value: string; label: string; count: number }[];
}

export interface HeatmapCell {
    dayOfWeek: number; // 1 = poniedziałek ... 7 = niedziela
    daypart: number;   // 0: 6-11, 1: 11-16, 2: 16-21, 3: 21-6
    posts: number;
    avgEngagement: number;
}

export interface Heatmap {
    cells: HeatmapCell[];
    bestDayOfWeek: number | null;
    bestDaypart: number | null;
    /**
     * Posty odrzucone jako wyskoki - powyżej percentyla 90. zaangażowania w całym oknie.
     * Zwykle oznaczenie kogoś znanego, płatna promocja albo przypadkowy viral: zdarzenia
     * bez związku z porą publikacji, a zdolne samodzielnie przesądzić o rekomendacji.
     * Nie ma ich ani w licznikach komórek, ani w średnich.
     */
    excludedOutliers: number;
}

export interface HashtagStat {
    tag: string;
    uses: number;
    profilesCount: number;
    avgEngagement: number;
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
}

// ─── Wyjaśnienie tygodnia (klik w słupek przyrostu obserwujących) ────────────

export interface WeekDetailPost {
    postId: string;
    permalink: string;
    takenAt: string;
    format: ContentFormat;
    caption: string | null;
    likeCount: number;
    commentCount: number;
    viewCount: number | null;
    engagement: number;
}

export interface WeekDetail {
    profileId: string;
    username: string;
    weekStart: string;
    followerDelta: number | null;
    medianEngagement: number | null;
    medianViews: number | null;
    posts: WeekDetailPost[];
    insights: { type: string; title: string }[];
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

// ─── Stałe UI ─────────────────────────────────────────────────────────────────

/** Paleta kolorów przypisywanych profilom na wykresach (self zawsze pierwszy kolor). */

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

export const PROFILE_COLORS = [
    '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981',
    '#ef4444', '#06b6d4', '#f97316', '#64748b',
] as const;

export type WeeksOption = 4 | 12 | 26 | 52;

export const WEEKS_OPTIONS: { value: WeeksOption; label: string }[] = [
    { value: 4, label: 'Miesiąc' },
    { value: 12, label: 'Kwartał' },
    { value: 26, label: 'Pół roku' },
    { value: 52, label: 'Rok' },
];

export const FORMAT_LABELS: Record<ContentFormat, string> = {
    PHOTO: 'Zdjęcie',
    REELS: 'Rolka',
    CAROUSEL: 'Karuzela',
};

export const DAYPART_LABELS = ['Rano (6-11)', 'Południe (11-16)', 'Wieczór (16-21)', 'Noc (21-6)'];

export const DAY_LABELS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];

// ─── Odkrywanie obszaru (kto reklamuje się na frazy w rejonie) ────────────────

/** Jak szeroko traktować „w rejonie": tylko wpisane miasta czy też szersze obszary. */
export type AreaMatchMode = 'CITIES_ONLY' | 'INCLUDE_BROADER';

/** Jeden wiersz tabeli wyników — jedna firma reklamująca się w rejonie. */
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
