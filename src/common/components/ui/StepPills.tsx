// src/common/components/ui/StepPills.tsx
//
// Kroki wewnątrz jednego okna („1 Podpis protokołu, 2 Rozliczenie").
//
// Bieżący krok ma odcień marki, zrobiony - zielony z ptaszkiem, przyszły jest
// szary. Żaden nie jest wypełniony: wcześniej aktywny krok był pełnym niebieskim
// blokiem wersalikami i konkurował z przyciskiem „Dalej" w stopce (CLAUDE.md §2).
// Ten sam język co pasek postępu w nagłówku wizyty.

import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Check } from 'lucide-react';
import { ui } from './tokens';

export type StepState = 'done' | 'active' | 'todo';

const List = styled.ol`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const Item = styled.li<{ $state: StepState }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 30px;
    padding: 0 12px 0 5px;
    border-radius: ${ui.radiusControl};
    border: 1px solid ${p => p.$state === 'active' ? ui.brandLine : p.$state === 'done' ? ui.okLine : ui.line};
    background: ${p => p.$state === 'active' ? ui.brandTint : p.$state === 'done' ? ui.okTint : ui.surface};
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.$state === 'active' ? ui.brandDeep : p.$state === 'done' ? ui.okInk : ui.textMuted};
    white-space: nowrap;
`;

const Num = styled.span<{ $state: StepState }>`
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: ${p => p.$state === 'active' ? ui.surface : p.$state === 'done' ? ui.surface : ui.surfaceAlt};
    font-size: 11.5px;
    font-weight: 700;

    svg { width: 12px; height: 12px; }
`;

const Line = styled.li`
    width: 20px;
    height: 2px;
    border-radius: 1px;
    background: ${ui.line};
`;

interface Props {
    steps: { key: string; label: ReactNode; state: StepState }[];
    label?: string;
}

export function StepPills({ steps, label = 'Kroki' }: Props) {
    return (
        <List aria-label={label}>
            {steps.map((step, i) => (
                <Fragment key={step.key} withLine={i > 0}>
                    <Item $state={step.state} aria-current={step.state === 'active' ? 'step' : undefined}>
                        <Num $state={step.state}>{step.state === 'done' ? <Check aria-hidden="true" /> : i + 1}</Num>
                        {step.label}
                    </Item>
                </Fragment>
            ))}
        </List>
    );
}

function Fragment({ withLine, children }: { withLine: boolean; children: ReactNode }) {
    return (
        <>
            {withLine && <Line role="presentation" aria-hidden="true" />}
            {children}
        </>
    );
}
