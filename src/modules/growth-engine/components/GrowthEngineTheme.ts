/**
 * Reports Module — Light Theme Constants
 * Consistent with other application tabs (Statistics, Finance, etc.)
 */

export const ge = {
  // Backgrounds
  bg: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgCardAlt: '#F1F5F9',
  bgInput: '#FFFFFF',
  bgOverlay: 'rgba(15, 23, 42, 0.4)',

  // Borders
  border: '#E2E8F0',
  borderHover: '#CBD5E1',
  borderFocus: '#3B82F6',

  // Text
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // Accent colors
  accentBlue: '#3B82F6',
  accentBlueDim: 'rgba(59, 130, 246, 0.10)',
  accentGreen: '#10B981',
  accentGreenDim: 'rgba(16, 185, 129, 0.10)',
  accentAmber: '#F59E0B',
  accentAmberDim: 'rgba(245, 158, 11, 0.10)',
  accentRed: '#EF4444',
  accentRedDim: 'rgba(239, 68, 68, 0.10)',
  accentPurple: '#8B5CF6',

  // Gradients
  gradientBlue: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
  gradientGreen: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',

  // Shadows
  shadowSm: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
  shadowMd: '0 4px 12px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
  shadowLg: '0 10px 24px rgba(15, 23, 42, 0.10), 0 4px 8px rgba(15, 23, 42, 0.06)',
  shadowBlue: '0 0 0 3px rgba(59, 130, 246, 0.15)',

  // Radii
  radius: '14px',
  radiusSm: '8px',
  radiusLg: '18px',

  // Transitions
  transition: '180ms ease',
  transitionSlow: '280ms ease',

  // Font sizes
  fontXs: '11px',
  fontSm: '13px',
  fontMd: '15px',
  fontLg: '18px',
  fontXl: '22px',
  fontXxl: '28px',
  fontHero: '36px',
} as const;
