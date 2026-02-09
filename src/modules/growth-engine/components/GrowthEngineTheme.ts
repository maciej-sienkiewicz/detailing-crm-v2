/**
 * Growth Engine Dark Theme Constants
 * Premium dark mode with neon accents for the luxury auto-detailing segment
 */

export const ge = {
  // Backgrounds
  bg: '#0B0E14',
  bgCard: '#131720',
  bgCardHover: '#1A1F2E',
  bgInput: '#0F1219',
  bgOverlay: 'rgba(0,0,0,0.6)',

  // Borders
  border: '#1E2535',
  borderHover: '#2A3347',
  borderAccent: '#00F5A0',

  // Text
  text: '#E8ECF4',
  textSecondary: '#8892A8',
  textMuted: '#5A6478',

  // Accent colors
  neonGreen: '#00F5A0',
  neonGreenDim: 'rgba(0, 245, 160, 0.15)',
  neonGreenGlow: '0 0 20px rgba(0, 245, 160, 0.3)',
  neonRed: '#FF4D6A',
  neonRedDim: 'rgba(255, 77, 106, 0.15)',
  neonRedGlow: '0 0 20px rgba(255, 77, 106, 0.3)',
  neonCyan: '#00D9F5',
  neonCyanDim: 'rgba(0, 217, 245, 0.15)',
  neonAmber: '#F5A623',
  neonAmberDim: 'rgba(245, 166, 35, 0.15)',
  neonPurple: '#BD10E0',

  // Gradients
  gradientGreen: 'linear-gradient(135deg, #00F5A0 0%, #00D9F5 100%)',
  gradientRed: 'linear-gradient(135deg, #FF4D6A 0%, #FF8A80 100%)',
  gradientCard: 'linear-gradient(180deg, #131720 0%, #0F1219 100%)',
  gradientHeader: 'linear-gradient(135deg, #0B0E14 0%, #131720 100%)',

  // Shadows
  shadowSm: '0 2px 8px rgba(0,0,0,0.3)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.4)',
  shadowLg: '0 8px 32px rgba(0,0,0,0.5)',
  shadowGlow: '0 0 30px rgba(0, 245, 160, 0.1)',

  // Radii
  radius: '12px',
  radiusSm: '8px',
  radiusLg: '16px',

  // Transitions
  transition: '200ms ease',
  transitionSlow: '300ms ease',

  // Font sizes
  fontXs: '11px',
  fontSm: '13px',
  fontMd: '15px',
  fontLg: '18px',
  fontXl: '22px',
  fontXxl: '28px',
  fontHero: '36px',
} as const;
