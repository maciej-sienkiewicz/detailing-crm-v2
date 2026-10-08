// src/modules/comms/inbox/tokens.ts
// Kolory i miary skrzynki „Zapytania" - przepisane 1:1 z makiet (canvas „Zapytania –
// makiety"). Makiety liczą odcienie akcentu przez `color-mix`; tu stoją policzone
// wartości, żeby nie zależeć od wsparcia `color-mix` w starszym Safari.
//
//   accentInk   = mix(akcent 62%, #0f172a)  - tekst w kolorze akcentu
//   accentTint  = mix(akcent 10%, #ffffff)  - tło plakietek i przycisków z obwódką
//   accentLine  = mix(akcent 45%, #ffffff)  - obwódka przycisku z obwódką
//   gradFrom/To = mix(akcent 70% / 54%, #0f172a) - jedyne wypełnienie w oknie
export const ix = {
    accent: '#0ea5e9',
    accentInk: '#0e6fa0',
    accentTint: '#e7f6fd',
    accentLine: '#93d7f5',
    gradFrom: '#0e7ab0',
    gradTo: '#0e6491',
    accentShadow: 'rgba(14, 165, 233, 0.75)',

    ink: '#0f172a',
    inkSoft: '#334155',
    text2: '#475569',
    muted: '#64748b',
    faint: '#94a3b8',
    line: '#e2e8f0',
    lineSoft: '#eef2f7',
    surfaceAlt: '#f1f5f9',
    surfaceSoft: '#f8fafc',
    bg: '#eef2f7',

    late: '#b91c1c',
    ok: '#15803d',
    okTint: '#f0fdf4',

    font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    /** Gradient jedynego wypełnionego elementu w oknie (CLAUDE.md §2). */
    primaryGradient: 'linear-gradient(135deg, #0e7ab0 0%, #0e6491 100%)',
    primaryShadow: '0 12px 24px -12px rgba(14, 165, 233, 0.75)',
    cardShadow: '0 1px 2px rgba(15, 23, 42, 0.06), 0 16px 40px rgba(15, 23, 42, 0.08)',
} as const;

/** Próg telefonu z makiet: poniżej jedna kolumna na cały ekran. */
export const PHONE_MAX = 767;
/** Od tej szerokości okna panel sprawy stoi obok rozmowy (makieta: 1100 px). */
export const RAIL_MIN = 1100;
