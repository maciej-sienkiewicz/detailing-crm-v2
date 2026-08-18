import { ThemeProvider as StyledThemeProvider, createGlobalStyle } from 'styled-components';
import { theme, Theme } from './theme';

const GlobalStyles = createGlobalStyle`
  :root {
    --brand-primary: #0ea5e9;
    --brand-primary-dark: #0284c7;
    --brand-primary-light: #38bdf8;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    /* iOS inflates text in landscape unless this is pinned, which silently
       reflows every layout the moment the phone is rotated. */
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    line-height: 1.5;
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    /* No rubber-band sideways drag when a child does overflow by a pixel. */
    overscroll-behavior-x: none;
  }

  #root {
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
    max-width: 100%;
    /* clip (not hidden): it never turns #root into a scroll container, so
       position: sticky inside the app keeps working. */
    overflow-x: clip;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    font-family: inherit;
  }

  input,
  textarea,
  select {
    font-family: inherit;
  }

  img {
    max-width: 100%;
    display: block;
  }

  /* ─── Touch devices ────────────────────────────────────────────────────────
     iOS Safari zooms the whole viewport the moment a field smaller than 16px
     takes focus, and never zooms back out after the field is committed, which
     leaves the page stranded at 1.3x with fixed chrome floating mid-screen.
     16px is also the smallest comfortable tap-to-type size, so this is a win
     twice over.

     The :not()s are deliberate: they lift the rule to (0,1,1) so it outranks
     the single class styled-components emits. Fields that intentionally render
     LARGER than 16px re-declare their size with a doubled && selector in their
     own mobile query.
  */
  @media (hover: none) and (pointer: coarse) {
    input:not([type='checkbox']):not([type='radio']):not([type='range']),
    textarea:not([hidden]),
    select:not([hidden]) {
      font-size: 16px;
    }
  }

  /* Tap targets should not flash a grey box on every touch. */
  button, a, label, [role='button'] {
    -webkit-tap-highlight-color: transparent;
  }
`;

interface ThemeProviderProps {
    children: React.ReactNode;
    brandColor?: string;
}

export const ThemeProvider = ({ children, brandColor }: ThemeProviderProps) => {
    return (
        <StyledThemeProvider theme={theme}>
            <GlobalStyles />
            {brandColor && (
                <style>{`:root { --brand-primary: ${brandColor}; }`}</style>
            )}
            {children}
        </StyledThemeProvider>
    );
};

declare module 'styled-components' {
    export interface DefaultTheme extends Theme {}
}