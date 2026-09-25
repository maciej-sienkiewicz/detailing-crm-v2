// src/common/components/ui/ChoiceCard.tsx
//
// Wybór z dopiskiem: pole zaznaczenia, kafelek ikony, co to jest i czego dotyczy
// („SMS, +48 601 234 567"). Cała karta jest etykietą - klika się w nią, a nie
// w 15-pikselowy kwadracik.
//
// Zaznaczenie niesie ODCIEŃ (tło i obwódka marki), nie wypełnienie: w oknie
// z kilkoma kanałami powiadomień zaznaczone karty nie mogą konkurować
// z przyciskiem kroku następnego w stopce (CLAUDE.md §2).

import type { ReactNode } from 'react';
import styled from 'styled-components';
import { ui } from './tokens';

const Card = styled.label<{ $checked: boolean; $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: ${ui.radiusStrip};
    border: 1px solid ${p => p.$checked && !p.$disabled ? ui.brandLine : ui.line};
    background: ${p => p.$checked && !p.$disabled ? ui.brandTint : ui.surface};
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.55 : 1};
    transition: background 150ms ease, border-color 150ms ease;

    &:hover { border-color: ${p => p.$disabled ? ui.line : p.$checked ? ui.brandLine : ui.lineStrong}; }
    &:focus-within { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }

    input {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        margin: 0;
        accent-color: ${ui.brandStrong};
        cursor: inherit;
    }
`;

const IconTile = styled.span<{ $checked: boolean }>`
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: ${p => p.$checked ? ui.surface : ui.surfaceAlt};
    color: ${p => p.$checked ? ui.brandInk : ui.textSecondary};

    svg { width: 15px; height: 15px; }
`;

const Text = styled.span`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const Title = styled.span`
    font-size: 13.5px;
    font-weight: 600;
    color: ${ui.ink};
`;

const Detail = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

interface Props {
    checked: boolean;
    onChange: (checked: boolean) => void;
    title: ReactNode;
    detail?: ReactNode;
    icon?: ReactNode;
    disabled?: boolean;
    /** checkbox (domyślnie) albo radio w grupie. */
    type?: 'checkbox' | 'radio';
    name?: string;
    /** Element po prawej: plakietka, kwota. */
    trailing?: ReactNode;
}

export function ChoiceCard({ checked, onChange, title, detail, icon, disabled, type = 'checkbox', name, trailing }: Props) {
    return (
        <Card $checked={checked} $disabled={disabled}>
            <input
                type={type}
                name={name}
                checked={checked}
                disabled={disabled}
                onChange={e => onChange(e.target.checked)}
            />
            {icon && <IconTile $checked={checked && !disabled} aria-hidden="true">{icon}</IconTile>}
            <Text>
                <Title>{title}</Title>
                {detail && <Detail>{detail}</Detail>}
            </Text>
            {trailing}
        </Card>
    );
}

export const ChoiceList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;
