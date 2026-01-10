import { breakpoints } from './breakpoints';

export const theme = {
    breakpoints,

    colors: {
        background: '#f8fafc',
        surface: '#ffffff',
        surfaceAlt: '#f1f5f9',
        surfaceHover: '#f8fafc',

        text: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#94a3b8',

        border: '#e2e8f0',

        primary: 'var(--brand-primary)',

        error: '#dc2626',
        errorLight: '#fef2f2',
        success: '#16a34a',
        successLight: '#f0fdf4',
        warning: '#d97706',
        warningLight: '#fffbeb',
    },

    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
    },

    fontSizes: {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '18px',
        xl: '20px',
        xxl: '24px',
        xxxl: '32px',
    },

    fontWeights: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },

    radii: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
    },

    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },

    transitions: {
        fast: '150ms ease',
        normal: '200ms ease',
        slow: '300ms ease',
    },
} as const;

export type Theme = typeof theme;