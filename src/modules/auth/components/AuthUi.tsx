import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';

/**
 * Elementy prawej, jasnej strony bramy - w języku aplikacji, nie strony: krój Inter,
 * kolory panelu CRM, przyciski 44 px (jak w formularzach aplikacji, nie plakatowe
 * 70 px). Główny przycisk ma granat paska bocznego CRM: to ostatnie kliknięcie przed
 * wejściem do aplikacji.
 */

const INK = '#0f172a';
const LINE = '#cfd6df';

export const AuthHeading = styled.header`
    margin-bottom: 28px;

    h1 {
        font-size: 26px;
        line-height: 1.2;
        font-weight: 650;
        letter-spacing: -0.02em;
        color: ${INK};
    }

    p {
        margin-top: 6px;
        font-size: 15px;
        line-height: 1.5;
        color: #64748b;
    }
`;

export const AuthForm = styled.form`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const button = css`
    width: 100%;
    height: 44px;
    padding: 0 16px;
    border-radius: 8px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    cursor: pointer;
    transition:
        background-color 150ms ease,
        border-color 150ms ease,
        color 150ms ease;

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    &:focus-visible {
        outline: 2px solid ${INK};
        outline-offset: 2px;
    }
`;

export const AuthPrimaryButton = styled.button`
    ${button}
    border: 1px solid ${INK};
    background: ${INK};
    color: #ffffff;

    &:hover:not(:disabled) {
        background: #1e293b;
        border-color: #1e293b;
    }
`;

export const AuthSecondaryButton = styled.button`
    ${button}
    border: 1px solid ${LINE};
    background: #ffffff;
    color: ${INK};
    font-weight: 500;

    &:hover:not(:disabled) {
        border-color: #94a3b8;
    }
`;

const link = css`
    color: ${INK};
    font-weight: 600;
    text-decoration: underline;
    text-decoration-color: rgba(15, 23, 42, 0.25);
    text-underline-offset: 3px;
    transition: text-decoration-color 150ms ease;

    &:hover {
        text-decoration-color: currentColor;
    }
`;

export const AuthLink = styled(Link)`
    ${link}
`;

export const AuthAnchor = styled.a`
    ${link}
`;

/** Drobny tekst pod formularzem: „Nie masz konta?", opis konta demo. */
export const AuthMeta = styled.p`
    font-size: 14px;
    line-height: 1.5;
    color: #64748b;
`;

/** Oddzielony linią blok pod formularzem - druga droga (demo, rejestracja). */
export const AuthAside = styled.div`
    margin-top: 28px;
    padding-top: 24px;
    border-top: 1px solid #dde3ea;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;
