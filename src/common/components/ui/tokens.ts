// src/common/components/ui/tokens.ts
//
// Jedno źródło kolorów dla wspólnych komponentów (Button, StatusPill, Card…).
//
// Wcześniej każdy plik widoku wizyty definiował sobie `const BRAND = '#0369a1'`
// i do tego sięgał po drugi niebieski (#0369A1) z motywu statystyk - na jednym
// ekranie stały obok siebie dwa różne „brandowe" niebieskie. Tu jest jeden.
//
// Odcień niesie ZNACZENIE (CLAUDE.md §2): sky = marka / informacja, zielony =
// „tak, domknięte", bursztyn = „przeczytaj", czerwień = „nieodwracalne".

export const ui = {
    ink: '#0f172a',
    inkSoft: '#334155',
    textSecondary: '#475569',
    textMuted: '#64748b',
    textFaint: '#94a3b8',

    bg: '#eef2f7',
    surface: '#ffffff',
    surfaceSoft: '#f8fafc',
    surfaceAlt: '#f1f5f9',
    line: '#e2e8f0',
    lineSoft: '#eef2f7',
    lineFaint: '#f1f5f9',
    lineStrong: '#94a3b8',

    // Głęboki błękit marki zamiast jaskrawego #0369a1 (decyzja z 21.10.2026): akcje,
    // zaznaczenia i fokus nie świecą mocniej niż treść. Jasne odcienie to ten sam
    // błękit na białym tle (6/10/25/35/45%), zapisane jako hex, bo bywają sklejane
    // z przezroczystością.
    brand: '#0369a1',
    brandStrong: '#075985',
    brandInk: '#0369a1',
    brandDeep: '#075985',
    brandTint: '#f0f6f9',
    brandTintHover: '#e6f0f6',
    brandLine: '#a7cadd',
    brandLineSoft: '#c0d9e8',
    focusRing: '#8ebbd5',

    okInk: '#15803d',
    okTint: '#f0fdf4',
    okTintHover: '#dcfce7',
    okLine: '#86efac',

    warnInk: '#92400e',
    warnTint: '#fffbeb',
    warnLine: '#fcd34d',

    dangerInk: '#b91c1c',
    dangerTint: '#fef2f2',
    dangerLine: '#fecaca',

    /** Przyciski, pola, pigułki wyboru: łagodny róg zamiast pigułki. */
    radiusControl: '10px',
    /** Statusy, liczniki, etykiety - oznaczenia, nie kontrolki: zostają zaokrąglone. */
    radiusPill: '999px',
    radiusRow: '10px',
    radiusStrip: '12px',
    radiusPanel: '16px',
    radiusCard: '20px',

    /** Jedyne wyniesienie w kolumnie: dwa cienie, żeby karta leżała NAD tłem, a nie obok. */
    shadowCard: '0 1px 2px rgba(15, 23, 42, 0.06), 0 16px 40px rgba(15, 23, 42, 0.08)',
    shadowMenu: '0 8px 32px rgba(15, 23, 42, 0.16)',

    mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
} as const;

/** Pod palcem każdy przycisk rośnie do 44px - to jest reguła, nie wyjątek widoku. */
export const touch = '@media (hover: none) and (pointer: coarse)';
