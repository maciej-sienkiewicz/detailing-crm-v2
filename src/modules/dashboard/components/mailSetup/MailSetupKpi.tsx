// src/modules/dashboard/components/mailSetup/MailSetupKpi.tsx
//
// Trzeci wskaźnik karty powitania, gdy zapytania z poczty jeszcze nie działają: zamiast
// licznika krótka zachęta. „Sprawdź, jak to działa” otwiera okno z animacjami ze strony
// „Poznaj program”, a w nim następny krok - „Podłącz pocztę” albo, gdy skrzynka już jest,
// „Włącz tworzenie zapytań”.
import { useState } from 'react';
import styled from 'styled-components';
import { MailSetupModal, type MailSetupStep } from './MailSetupModal';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const Headline = styled.div`
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.3px;
    line-height: 1.3;
    color: #f8fafc;
`;

const LinkBtn = styled.button`
    align-self: flex-start;
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: #cbd5e1;
    cursor: pointer;

    &:hover { color: #ffffff; text-decoration: underline; }
    &:focus-visible { outline: 2px solid #8ebbd5; outline-offset: 2px; border-radius: 4px; }
`;

export const MailSetupKpi = ({ step = 'connect' }: { step?: MailSetupStep }) => {
    const [open, setOpen] = useState(false);

    return (
        <Wrap>
            <Headline>Zarządzaj zapytaniami</Headline>
            <LinkBtn type="button" onClick={() => setOpen(true)}>Sprawdź, jak to działa →</LinkBtn>
            <MailSetupModal isOpen={open} onClose={() => setOpen(false)} step={step} />
        </Wrap>
    );
};
