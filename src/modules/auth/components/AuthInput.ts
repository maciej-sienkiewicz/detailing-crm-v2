// src/modules/auth/components/AuthInput.tsx
//
// JEDYNA definicja wyglądu pola na ekranach logowania, rejestracji i resetu
// hasła. Każde pole tych widoków - email, imię, nazwisko, hasło - bierze
// wygląd stąd i nie opisuje go u siebie.
//
// Dlaczego: wcześniej pola tekstowe brały wspólny `Input` z `common/Form`
// (41 px wysokości, ramka 1 px, promień 8 px, tekst 14 px, szare tło), a pola
// hasła miały własną kopię stylów w PasswordInput (60 px, ramka 2 px, promień
// 12 px, tekst 16 px, tło białe). W jednym formularzu dawało to dwa różne
// pola jedno pod drugim - 19 px różnicy wysokości widać gołym okiem i klient
// zgłosił to jako niedoróbkę. Sam `common/Form` nie jest tu odpowiedzią:
// wnętrze aplikacji pracuje w skali 14 px przy gęstych tabelach, a ekran
// logowania to pojedyncza karta z przyciskiem `$size="lg"`, przy którym pole
// 41 px wygląda na wciśnięte. Skala 16 px jest więc świadomie inna niż
// w panelu - ale JEDNA dla całego modułu auth.

import styled, { css } from 'styled-components';

/**
 * Wspólny wygląd pola formularza auth. Wydzielony jako `css`, żeby
 * PasswordInput (który potrzebuje dodatkowego miejsca na przycisk podglądu)
 * budował się na dokładnie tej samej podstawie zamiast ją kopiować.
 */
export const authFieldStyles = css<{ $hasError?: boolean }>`
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    height: 44px;
    padding: 0 14px;
    border: 1px solid ${props => props.$hasError ? props.theme.colors.error : '#cfd6df'};
    border-radius: ${props => props.theme.radii.md};
    font-family: inherit;
    font-size: 15px;
    color: ${props => props.theme.colors.text};
    background-color: ${props => props.theme.colors.surface};
    transition: border-color ${props => props.theme.transitions.fast}, box-shadow ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.$hasError ? props.theme.colors.error : '#0f172a'};
        box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(15, 23, 42, 0.08)'};
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }

    &:disabled {
        background-color: ${props => props.theme.colors.surfaceAlt};
        cursor: not-allowed;
    }
`;

/** Pole tekstowe ekranów auth: email, imię, nazwisko. Hasło ma PasswordInput. */
export const AuthInput = styled.input<{ $hasError?: boolean }>`
    ${authFieldStyles}
`;
