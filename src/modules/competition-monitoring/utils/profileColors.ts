import { ui } from '@/common/components/ui';

/**
 * Stały kolor profilu w całym module.
 *
 * Wcześniej kolor wynikał z pozycji wiersza, a każda zakładka sortuje inaczej - ten sam
 * konkurent był pomarańczowy w Porównaniu i fioletowy w kalendarzu reklam. Teraz kolor
 * zależy od nazwy profilu: skrót nazwy wybiera miejsce w palecie, a przy kolizji bierzemy
 * następne wolne, w kolejności alfabetycznej. Dodanie profilu zwykle nie przestawia
 * kolorów pozostałych, a dwa profile w jednym widoku nigdy nie dzielą koloru, dopóki
 * paleta się nie skończy.
 *
 * Własne studio ma zawsze kolor marki i nie zajmuje miejsca w palecie.
 */

export const SELF_COLOR = ui.brand;

/** Bez błękitu marki - zarezerwowany dla własnego studia. */
export const PROFILE_PALETTE = [
    '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4',
    '#f97316', '#ec4899', '#84cc16', '#6366f1', '#64748b',
] as const;

const hash = (text: string): number => {
    // FNV-1a: krótki, deterministyczny i dobrze rozrzuca podobne nazwy („studio_a", „studio_b").
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
};

export const normalizeUsername = (username: string) => username.trim().toLowerCase().replace(/^@/, '');

export interface ColorableProfile {
    username: string;
    isSelf?: boolean;
}

/** Mapa nazwa profilu (małymi literami) → kolor dla całego koszyka obserwowanych. */
export const buildProfileColors = (profiles: ColorableProfile[]): Map<string, string> => {
    const colors = new Map<string, string>();
    const taken = new Set<number>();
    const others = [...new Set(
        profiles.filter(p => !p.isSelf).map(p => normalizeUsername(p.username)),
    )].sort();

    profiles.filter(p => p.isSelf).forEach(p => colors.set(normalizeUsername(p.username), SELF_COLOR));

    others.forEach(username => {
        if (colors.has(username)) return;
        const preferred = hash(username) % PROFILE_PALETTE.length;
        let slot = preferred;
        for (let step = 0; step < PROFILE_PALETTE.length; step++) {
            const candidate = (preferred + step) % PROFILE_PALETTE.length;
            if (!taken.has(candidate)) { slot = candidate; break; }
        }
        taken.add(slot);
        colors.set(username, PROFILE_PALETTE[slot]);
    });
    return colors;
};

export const colorFor = (colors: Map<string, string>, username: string, fallback = ui.textFaint): string =>
    colors.get(normalizeUsername(username)) ?? fallback;
