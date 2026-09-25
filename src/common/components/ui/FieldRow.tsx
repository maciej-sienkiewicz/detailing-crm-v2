// src/common/components/ui/FieldRow.tsx
//
// Wiersz „etykieta - wartość": szara etykieta zwykłym pismem po lewej, wartość po
// prawej, cienka kreska nad wierszem. Zastępuje etykiety 11px wersalikami
// w kartach bocznych wizyty.

import type { ReactNode } from 'react';
import styled from 'styled-components';
import { ui } from './tokens';

const Row = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    padding: 9px 0;
    border-top: 1px solid ${ui.lineFaint};
    font-size: 13.5px;
    color: ${ui.ink};

    @media (max-width: 640px) { padding: 10px 0; font-size: 14px; }
`;

const Label = styled.span`
    flex-shrink: 0;
    color: ${ui.textMuted};
`;

const Value = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    min-width: 0;
    text-align: right;
    overflow-wrap: anywhere;

    a { color: ${ui.brandInk}; text-decoration: none; }
    a:hover { color: ${ui.brandDeep}; text-decoration: underline; }
    strong { font-weight: 600; }
`;

interface Props {
    label: ReactNode;
    children: ReactNode;
}

export function FieldRow({ label, children }: Props) {
    return (
        <Row>
            <Label>{label}</Label>
            <Value>{children}</Value>
        </Row>
    );
}

export const FieldList = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
`;
