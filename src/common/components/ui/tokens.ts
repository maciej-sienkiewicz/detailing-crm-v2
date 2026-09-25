// src/common/components/ui/tokens.ts
//
// Jedno źródło kolorów dla wspólnych komponentów (Button, StatusPill, Card…).
//
// Wcześniej każdy plik widoku wizyty definiował sobie `const BRAND = '#0ea5e9'`
// i do tego sięgał po drugi niebieski (#3B82F6) z motywu statystyk - na jednym
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

    brand: '#0ea5e9',
    brandStrong: '#0284c7',
    brandInk: '#0369a1',
    brandDeep: '#075985',
    brandTint: '#f0f9ff',
    brandTintHover: '#e0f2fe',
    brandLine: '#7dd3fc',
    brandLineSoft: '#bae6fd',
    focusRing: '#38bdf8',

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

    radiusControl: '999px',
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
