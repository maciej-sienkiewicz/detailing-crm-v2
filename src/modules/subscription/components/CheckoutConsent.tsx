// src/modules/subscription/components/CheckoutConsent.tsx
//
// Zgoda przed przejściem do Przelewy24. Wymaga jej P24 (akceptacja regulaminu i polityki
// „z poziomu koszyka") i ustawa o prawach konsumenta (informacja o odstąpieniu przed
// zamówieniem). Każde miejsce, które tworzy płatne zamówienie, pokazuje ten blok i wysyła
// `acceptTerms` - backend zapisuje akceptację z wersją dokumentów.

import styled from 'styled-components';
import { legalPath } from '@/modules/legal/documents';
import type { CheckoutConsentState } from '../hooks/useCheckoutConsent';

const link = (slug: Parameters<typeof legalPath>[0], label: string) => (
    <a href={legalPath(slug)} target="_blank" rel="noopener noreferrer">{label}</a>
);

export function CheckoutConsent({ consent }: { consent: CheckoutConsentState }) {
    return (
        <Box $missing={consent.missing}>
            <label>
                <input
                    type="checkbox"
                    checked={consent.accepted}
                    onChange={(e) => consent.setAccepted(e.target.checked)}
                    aria-invalid={consent.missing || undefined}
                />
                <span>
                    Akceptuję {link('regulamin', 'regulamin')} i {link('polityka-prywatnosci', 'politykę prywatności')}.
                </span>
            </label>
            <Note>
                Przedsiębiorca na prawach konsumenta może odstąpić od umowy w ciągu 14 dni od zapłaty
                (§ 9 regulaminu, {link('formularz-odstapienia', 'formularz odstąpienia')}).
            </Note>
            {consent.missing && <Missing role="alert">Zaznacz akceptację regulaminu, aby przejść do płatności.</Missing>}
        </Box>
    );
}

const Box = styled.div<{ $missing: boolean }>`
    margin: 12px 0;
    padding: 10px 12px;
    border: 1px solid ${p => (p.$missing ? '#f04438' : '#e4e7ec')};
    border-radius: 10px;
    background: ${p => (p.$missing ? '#fef3f2' : '#f9fafb')};
    font-size: 13px;
    line-height: 1.45;
    color: #344054;
    text-align: left;

    label {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        cursor: pointer;
    }

    input {
        flex: 0 0 auto;
        width: 16px;
        height: 16px;
        margin-top: 1px;
        accent-color: #0f172a;
    }

    a {
        color: #0f172a;
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 2px;
    }
`;

const Note = styled.p`
    margin: 6px 0 0 24px;
    font-size: 12px;
    color: #667085;
`;

const Missing = styled.p`
    margin: 6px 0 0 24px;
    font-size: 12px;
    font-weight: 500;
    color: #b42318;
`;
