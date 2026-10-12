// src/modules/scheduled-sms/components/queueTable.tsx
//
// Wspólny wygląd obu tabel widoku - kolejki („Zaplanowane", „Anulowane") i historii
// („Wysłane"): jeden SMS to jedna niska linia, bez pasków koloru, pigułek i kafelek.
// Na wąskiej liście wiersz łamie się na dwie krótkie linie.
//
// Kolumny podaje tabela ($cols), bo historia ma o jedną więcej („Wynik").

import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { SMS_LIST_CONTAINER, smsCards } from './smsListLayout';

export const Outer = styled.div`
    container-type: inline-size;
    container-name: ${SMS_LIST_CONTAINER};
`;

export const HeaderRow = styled.div<{ $cols: string }>`
    display: grid;
    grid-template-columns: ${p => p.$cols};
    gap: 16px;
    padding: 9px 20px;
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};

    ${smsCards} {
        display: none;
    }
`;

export const HeaderCell = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.07em;
    white-space: nowrap;
`;

export const Row = styled.div<{ $cols: string; $clickable: boolean; $cancelled: boolean }>`
    display: grid;
    grid-template-columns: ${p => p.$cols};
    gap: 16px;
    align-items: center;
    min-height: 44px;
    padding: 6px 20px;
    border-bottom: 1px solid ${st.border};
    font-size: 13px;
    color: ${p => p.$cancelled ? st.textMuted : st.text};
    cursor: ${p => p.$clickable ? 'pointer' : 'default'};
    transition: background ${st.transition};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${p => p.$clickable ? st.bgCardAlt : 'transparent'};
    }

    /* Wąska lista: dwie krótkie linie zamiast kafelki - kiedy i do kogo, pod spodem rodzaj. */
    ${smsCards} {
        grid-template-columns: auto minmax(0, 1fr) 32px;
        gap: 2px 12px;
        padding: 8px 14px;

        > :nth-child(1) { grid-column: 1; grid-row: 1; }
        > :nth-child(2) { grid-column: 2; grid-row: 1; }
        > :nth-child(3) { grid-column: 1 / 3; grid-row: 2; }
        > :nth-child(4) { display: none; }
        > :nth-child(5) { grid-column: 3; grid-row: 1 / 3; }
    }
`;

export const Cell = styled.div`
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const When = styled(Cell)<{ $cancelled: boolean }>`
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-decoration: ${p => p.$cancelled ? 'line-through' : 'none'};
`;

export const Recipient = styled(Cell)`
    font-weight: 500;
`;

export const Kind = styled(Cell)`
    color: ${st.textSecondary};

    ${smsCards} {
        font-size: 12px;
    }
`;

export const Content = styled(Cell)`
    color: ${st.textMuted};
`;

export const MenuBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: ${st.textMuted};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.border};
        color: ${st.text};
        background: ${st.bgCard};
    }

    svg {
        width: 15px;
        height: 15px;
    }
`;

export const DropdownMenu = styled.div`
    position: fixed;
    min-width: 200px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    z-index: 1000;
    overflow: hidden;
    padding: 4px 0;
`;

export const DropdownItem = styled.button`
    display: block;
    width: 100%;
    padding: 9px 14px;
    border: none;
    background: none;
    font-size: 13px;
    font-weight: 500;
    color: ${st.text};
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition};

    &:hover {
        background: ${st.bgCardAlt};
    }
`;

export const Empty = styled.div`
    padding: 48px 24px;
    text-align: center;

    strong {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: ${st.text};
        margin-bottom: 4px;
    }

    span {
        font-size: 13px;
        color: ${st.textMuted};
    }
`;

export const Loading = styled.div`
    padding: 48px 24px;
    text-align: center;
    font-size: 13px;
    color: ${st.textMuted};
`;

export const DotsIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
    </svg>
);

