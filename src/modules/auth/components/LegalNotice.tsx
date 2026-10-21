import styled from 'styled-components';

/**
 * Informacja o administratorze danych pod formularzem (rejestracja, aktywacja konta
 * pracownika). Obowiązek informacyjny RODO - czyta się ją, nie akceptuje, więc to
 * zwykły tekst z linkami, bez checkboxa.
 */
export const LegalNotice = styled.p`
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: #64748b;

    a {
        color: #0f172a;
        font-weight: 500;
        text-decoration: underline;
        text-decoration-color: rgba(15, 23, 42, 0.25);
        text-underline-offset: 3px;

        &:hover {
            text-decoration-color: currentColor;
        }
    }
`;
