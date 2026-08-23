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

// ─── Insighty ─────────────────────────────────────────────────────────────────

export type InsightSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Insight {
    id: string;
    type: string;
    severity: InsightSeverity;
    title: string;
    body: string;
    actionText: string;
    probableCause: string | null;
    username: string | null;
    permalink: string | null;
    status: 'NEW' | 'DISMISSED';
    createdAt: string;
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
    insights: Insight[];
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
    /** Dzień dodania profilu do obserwacji — wcześniejszej historii nie da się odtworzyć. */
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

/** Rodzaj zdarzenia w pulsie konkurencji. */
export type PulseEventKind =
    | 'YOUR_POST'
    | 'YOUR_SILENCE'
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

// ─── Raport tygodnia ─────────────────────────────────────────────────────────

export interface ReportEvent {
    severity: InsightSeverity;
    title: string;
    body: string;
    permalink: string | null;
}

export interface ReportPayload {
    comparisonGroupSize: number;
    hasSelf: boolean;
    selfUsername: string | null;
    position: { rank: number; total: number } | null;
    erPct: MetricTriple;
    postsPerWeek: MetricTriple;
    activityIndex: MetricTriple;
    events: ReportEvent[];
    topPost: {
        username: string;
        permalink: string;
        engagement: number;
        topicLabel: string;
        format: ContentFormat;
    } | null;
    bestSlotLabel: string | null;
    topTopicLabel: string | null;
    storefrontGaps: string[];
    recommendation: { text: string; reason: string };
}

export interface Report {
    id: string;
    periodStart: string;
    periodEnd: string;
    title: string;
    lead: string;
    narrativeSource: 'LLM' | 'TEMPLATE';
    createdAt: string;
    payload: ReportPayload;
}

export interface ReportBrief {
    id: string;
    periodStart: string;
    periodEnd: string;
    title: string;
}

// ─── Generator AI (bez zmian) ─────────────────────────────────────────────────

export interface GenerateInstagramPostRequest {
    topic: string;
    context?: string;
    postTone?: 'premium' | 'technical' | 'emotional' | 'casual';
    postLength?: 'short' | 'full';
    styleNotes?: string[];
}

export interface InstagramPostResult {
    content: string;
}

// ─── Stałe UI ─────────────────────────────────────────────────────────────────

/** Paleta kolorów przypisywanych profilom na wykresach (self zawsze pierwszy kolor). */
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
