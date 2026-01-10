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
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};
    line-height: 1.5;
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
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