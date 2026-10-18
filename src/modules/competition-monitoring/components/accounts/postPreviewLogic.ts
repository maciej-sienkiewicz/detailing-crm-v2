import type { OwnPost } from '../../accountsTypes';

/**
 * Logika podglądu posta w generatorze - czyste funkcje, żeby dało się je sprawdzić testem.
 *
 * Podgląd ma pokazać post tak, jak ułoży się w kanale Instagrama. Liczby i komentarze
 * są przykładowe (post jeszcze nie istnieje), ale osadzone w skali tego studia: kanał
 * z 40 polubieniami pod realizacją wyglądałby fałszywie dla konta, które zbiera 400.
 */

/** Proporcje, które przyjmuje Instagram: od 4:5 (pion) do 1,91:1 (poziom) - jak `InstagramAspect` w backendzie. */
export const MIN_ASPECT = 4 / 5;
export const MAX_ASPECT = 1.91;

/**
 * Proporcja kadru całego posta. Backend przycina pierwsze zdjęcie do zakresu Instagrama,
 * a kolejne zdjęcia karuzeli do proporcji PIERWSZEGO (InstagramPublishService) - podgląd
 * robi to samo, inaczej pokazywałby kadr, którego publikacja nie wyśle.
 */
export const postAspect = (width: number, height: number): number => {
    if (!(width > 0) || !(height > 0)) return 1;
    return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, width / height));
};

export type CaptionToken = { kind: 'text' | 'hashtag' | 'mention'; value: string };

/** Hashtagi i oznaczenia Instagram pokazuje kolorem linku - dzielimy podpis na kawałki. */
export const tokenizeCaption = (caption: string): CaptionToken[] => {
    const tokens: CaptionToken[] = [];
    const pattern = /([#@][\p{L}\p{N}_](?:[\p{L}\p{N}_.]*[\p{L}\p{N}_])?)/gu;
    let last = 0;
    for (const match of caption.matchAll(pattern)) {
        const index = match.index ?? 0;
        // „mail@studio.pl" to nie oznaczenie: przed @ / # musi stać początek albo biały znak.
        if (index > 0 && !/\s/.test(caption[index - 1])) continue;
        if (index > last) tokens.push({ kind: 'text', value: caption.slice(last, index) });
        tokens.push({ kind: match[0].startsWith('#') ? 'hashtag' : 'mention', value: match[0] });
        last = index + match[0].length;
    }
    if (last < caption.length) tokens.push({ kind: 'text', value: caption.slice(last) });
    return tokens;
};

/** Mediana polubień własnych postów, a bez nich - typowe zaangażowanie przy liczbie obserwujących. */
export const sampleLikes = (topPosts: OwnPost[] | undefined, followers: number | null | undefined): number => {
    const likes = (topPosts ?? [])
        .map(post => post.likes)
        .filter((value): value is number => value != null && value >= 0)
        .sort((a, b) => a - b);
    if (likes.length > 0) {
        const mid = Math.floor(likes.length / 2);
        return likes.length % 2 ? likes[mid] : Math.round((likes[mid - 1] + likes[mid]) / 2);
    }
    if (followers && followers > 0) return Math.max(9, Math.round(followers * 0.035));
    return 47;
};

/** „12 345" - polski zapis grupuje tysiące spacją (twardą w Intl, tu zwykłą, żeby tekst dało się porównać). */
export const formatCount = (value: number): string =>
    value.toLocaleString('pl-PL').replace(/[\u00a0\u202f]/g, ' ');

export interface SampleComment {
    username: string;
    text: string;
}

/**
 * Komentarze, jakie realnie padają pod realizacją detailingu. Neutralne wobec usługi
 * („ile kosztuje taka usługa", a nie „ile za ceramikę"), bo nie wiemy, co jest na zdjęciach.
 */
const COMMENT_POOL: SampleComment[] = [
    { username: 'marek.auto', text: 'Petarda 🔥' },
    { username: 'kasia_drives', text: 'Wygląda jak nowe 😍' },
    { username: 'tomek.garage', text: 'Ile kosztuje taka usługa?' },
    { username: 'ola.motomania', text: 'Kawał dobrej roboty 👏👏' },
    { username: 'pawel_m3', text: 'Jak długo trzeba czekać na termin?' },
    { username: 'bartek.cars', text: 'Ten połysk 🤩' },
    { username: 'ewa.k_', text: 'Mój też by się przydał 😅' },
    { username: 'kuba_detailfan', text: 'Robota na najwyższym poziomie 💪' },
];

/** Prosty, stały skrót tekstu: ten sam podpis daje te same komentarze przy każdym renderze. */
const hash = (text: string): number => {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return h;
};

/** Dwa komentarze pod postem i łączna liczba komentarzy w skali polubień (zwykle kilka procent). */
export const sampleComments = (caption: string, likes: number): { shown: SampleComment[]; total: number } => {
    const start = hash(caption) % COMMENT_POOL.length;
    const shown = [COMMENT_POOL[start], COMMENT_POOL[(start + 3) % COMMENT_POOL.length]];
    return { shown, total: Math.max(shown.length, Math.round(likes * 0.06)) };
};

/** Inicjały do awatara: „detailing_studio.pl" → „DS". */
export const avatarInitials = (username: string): string => {
    const parts = username.replace(/\.(pl|com|eu)$/i, '').split(/[._\s-]+/).filter(Boolean);
    const letters = (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2));
    return letters.toUpperCase();
};
