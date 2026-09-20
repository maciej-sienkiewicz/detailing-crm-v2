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

     The :not()s and the leading html are deliberate, and both are about
     specificity. A styled-component that styles a field through a NESTED
     selector emits ".sc-hash textarea", which weighs (0,1,1) - exactly as much
     as "textarea:not([hidden])". A tie is settled by order, and styled-components
     injects after this sheet, so the component won and the field stayed at 13px.
     That is how the „Kontakt poza pocztą" dialog kept zooming the page on iOS:
     its note field is styled from the card around it.

     The html prefix adds one element to each selector, which beats the nested
     selector tie without touching fields that render LARGER than 16px on
     purpose - those re-declare their size with a doubled && selector, worth
     (0,2,0), and two classes still outrank one class plus two elements.
  */
  @media (hover: none) and (pointer: coarse) {
    html input:not([type='checkbox']):not([type='radio']):not([type='range']),
    html textarea:not([hidden]),
    html select:not([hidden]) {
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