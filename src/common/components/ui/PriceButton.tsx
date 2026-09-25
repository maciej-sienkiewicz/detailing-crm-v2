// src/common/components/ui/PriceButton.tsx
//
// Kwota, którą da się zmienić. Ołówek jest widoczny ZAWSZE, a po najechaniu na
// wiersz pojawia się przerywana ramka w odcieniu marki.
//
// Wzór pochodzi z naprawy zleceń zbiorczych: biznes zgłosił, że „nie da się
// edytować cen - klikali w kolumnę z ceną i nic się nie działo". Cena była
// zwykłym tekstem, a edycja chowała się w niewidocznym ⋮. W wizycie komórka ceny
// reagowała na kliknięcie, ale niczym tego nie zdradzała - ten sam błąd.
//
// Komponent tylko POKAZUJE kwoty - dostaje je sformatowane. Liczenie brutto
// zostaje przy wywołującym i jego regułach (CLAUDE.md §1).

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { Lock, Pencil } from 'lucide-react';
import { ui } from './tokens';

const Base = styled.button<{ $locked?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-right: -10px;
    padding: 6px 10px;
    border-radius: ${ui.radiusRow};
    border: 1px dashed transparent;
    background: transparent;
    font-family: inherit;
    color: inherit;
    text-align: right;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease;

    > svg { width: 15px; height: 15px; flex-shrink: 0; color: ${p => p.$locked ? ui.textFaint : ui.textMuted}; }

    ${p => p.$locked ? css`
        tr:hover &, [data-price-row]:hover &, &:hover, &:focus-visible {
            border-color: ${ui.line};
            background: ${ui.surfaceAlt};
            > svg { color: ${ui.textMuted}; }
        }
    ` : css`
        tr:hover &, [data-price-row]:hover &, &:hover, &:focus-visible {
            border-color: ${ui.brandLine};
            background: ${ui.brandTint};
            > svg { color: ${ui.brandInk}; }
        }
    `}
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
    &:disabled { cursor: default; }
`;

const Static = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 6px 0;
`;

const Amounts = styled.span`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    line-height: 1.3;
`;

const MainLine = styled.span`
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 2px 8px;
`;

const Gross = styled.span`
    font-size: 14.5px;
    font-weight: 700;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const Old = styled.span`
    font-size: 12px;
    color: ${ui.textFaint};
    text-decoration: line-through;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const Sub = styled.span`
    font-size: 12px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    /** Brutto, sformatowane: „3 690,00 zł". */
    gross: ReactNode;
    /** Linia pod kwotą; domyślnie „{net} netto". */
    net?: ReactNode;
    sub?: ReactNode;
    /** Kwota sprzed rabatu, przekreślona. */
    old?: ReactNode;
    /** Kwota zamknięta (np. auto w zestawieniu): kłódka zamiast ołówka, szara ramka. */
    locked?: boolean;
    /** Bez możliwości edycji - sama kwota, bez przycisku. */
    readOnly?: boolean;
}

export function PriceButton({ gross, net, sub, old, locked, readOnly, type = 'button', ...rest }: Props) {
    const content = (
        <Amounts>
            <MainLine>
                {old && <Old>{old}</Old>}
                <Gross>{gross}</Gross>
            </MainLine>
            {sub ?? (net !== undefined && <Sub>{net} netto</Sub>)}
        </Amounts>
    );
    if (readOnly) return <Static>{content}</Static>;
    return (
        <Base type={type} $locked={locked} {...rest}>
            {locked ? <Lock aria-hidden="true" /> : <Pencil aria-hidden="true" />}
            {content}
        </Base>
    );
}

export const PriceSub = Sub;
