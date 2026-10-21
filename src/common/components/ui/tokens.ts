// src/common/components/ui/tokens.ts
//
// Jedno źródło kolorów dla wspólnych komponentów (Button, StatusPill, Card…).
//
// Wcześniej każdy plik widoku wizyty definiował sobie `const BRAND = '#0ea5e9'`
// i do tego sięgał po drugi niebieski (#0EA5E9) z motywu statystyk - na jednym
// ekranie stały obok siebie dwa różne „brandowe" niebieskie. Tu jest jeden.
//
// Odcień niesie ZNACZENIE (CLAUDE.md §2): sky = marka / informacja, zielony =
// „tak, domknięte", bursztyn = „przeczytaj", czerwień = „nieodwracalne".

export const ui = {
    // Neutralne są zmiennymi CSS (index.css): chłodne łupkowe w całej aplikacji,
    // ciepłe kamienne tylko wewnątrz okien (warmScope niżej). Widoki główne mają
    // zostać chłodne - kremowy na liście czy w nagłówku tabeli był obcy; ciepło
    // ma samo okno (decyzja z 21.10.2026, kierunek „Ciepła · błękit”).
    ink: 'var(--ui-ink)',
    inkSoft: 'var(--ui-ink-soft)',
    textSecondary: 'var(--ui-text-secondary)',
    textMuted: 'var(--ui-text-muted)',
    textFaint: 'var(--ui-text-faint)',

    bg: '#eef2f7',
    surface: '#ffffff',
    surfaceSoft: 'var(--ui-surface-soft)',
    surfaceAlt: 'var(--ui-surface-alt)',
    line: 'var(--ui-line)',
    lineSoft: 'var(--ui-line-soft)',
    lineFaint: 'var(--ui-line-faint)',
    lineStrong: 'var(--ui-line-strong)',

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

    /** Przyciski, pola, pigułki wyboru: łagodny róg zamiast pigułki. */
    radiusControl: '10px',
    /** Statusy, liczniki, etykiety - oznaczenia, nie kontrolki: zostają zaokrąglone. */
    radiusPill: '999px',
    radiusRow: '10px',
    radiusStrip: '12px',
    radiusPanel: '16px',
    radiusCard: '20px',

    /** Jedyne wyniesienie w kolumnie: dwa cienie, żeby karta leżała NAD tłem, a nie obok. */
    shadowCard: '0 1px 2px rgba(41, 37, 36, 0.06), 0 16px 40px rgba(41, 37, 36, 0.08)',
    shadowMenu: '0 8px 32px rgba(41, 37, 36, 0.16)',

    mono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
} as const;

/** Pod palcem każdy przycisk rośnie do 44px - to jest reguła, nie wyjątek widoku. */
export const touch = '@media (hover: none) and (pointer: coarse)';

/**
 * Ciepłe neutralne dla wnętrza okna: kamień zamiast łupku, stopka w kości słoniowej
 * z logo (#F2F1EE). Wstawiane w ramkę okna (ModalBox, okno rezerwacji) - wszystko,
 * co w środku korzysta z tokenów `ui` i zmiennych --ui-*, ociepla się samo, a widoki
 * główne zostają chłodne.
 */
export const warmScope = `
    --ui-ink: #1c1917;
    --ui-ink-strong: #292524;
    --ui-ink-soft: #44403c;
    --ui-text-secondary: #57534e;
    --ui-text-muted: #78716c;
    --ui-text-faint: #a8a29e;
    --ui-line-strong: #a8a29e;
    --ui-line-hover: #d6d1c8;
    --ui-line: #e7e3dc;
    --ui-line-soft: #efece6;
    --ui-line-faint: #f3f1ec;
    --ui-surface-alt: #f3f1ec;
    --ui-surface-soft: #f7f5f1;
`;
