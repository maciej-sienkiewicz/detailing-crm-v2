// src/modules/dashboard/components/DashboardHintsBar.tsx
//
// Pasek podpowiedzi między powitaniem a kafelkami stanu. Tylko komputer:
// na telefonie każdy piksel nad listą rzeczy do zrobienia jest droższy,
// a podpowiedzi mówią o pracy, którą i tak wykonuje się przy biurku.
//
// Jedna podpowiedź naraz (serwer sortuje po ważności), jedno zdanie, najwyżej
// jeden przycisk akcji i zamknięcie. Po zamknięciu wskakuje następna.

import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, X } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import {
    useDashboardHints,
    useDismissDashboardHint,
    useDisableWorkTimeTracking,
    type DashboardHint,
} from '../hooks/useDashboardHints';

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Bar = styled.div`
    display: none;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 18px;
        background: ${p => p.theme.colors.surface};
        border: 1px solid ${p => p.theme.colors.border};
        border-left: 3px solid #0ea5e9;
        border-radius: ${p => p.theme.radii.lg};
        animation: ${slideIn} 220ms ease both;
    }
`;

const HintIcon = styled.span`
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #e0f2fe;
    color: #0369a1;

    svg { width: 16px; height: 16px; }
`;

const HintText = styled.p`
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: ${p => p.theme.colors.text};
`;

const ActionBtn = styled.button`
    flex-shrink: 0;
    padding: 7px 14px;
    background: transparent;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 9999px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: #0369a1;
    cursor: pointer;
    white-space: nowrap;
    transition: all 150ms ease;

    &:hover:not(:disabled) { border-color: #0ea5e9; background: #f0f9ff; }
    &:disabled { opacity: 0.6; cursor: default; }
`;

const CloseBtn = styled.button`
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 50%;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;

    &:hover { background: ${p => p.theme.colors.surfaceHover}; color: ${p => p.theme.colors.text}; }
    svg { width: 14px; height: 14px; }
`;

export const DashboardHintsBar = () => {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const { hints } = useDashboardHints();
    const dismiss = useDismissDashboardHint();
    const disableWorkTime = useDisableWorkTimeTracking();
    const [busy, setBusy] = useState(false);

    const hint = hints[0];
    if (!hint) return null;

    const runAction = async (current: DashboardHint) => {
        const action = current.action;
        if (!action) return;

        if (action.type === 'NAVIGATE' && action.url) {
            navigate(action.url);
            return;
        }
        if (action.type === 'EXTERNAL' && action.url) {
            window.open(action.url, '_blank', 'noopener,noreferrer');
            return;
        }
        if (action.type === 'DISABLE_WORKTIME') {
            setBusy(true);
            try {
                await disableWorkTime.mutateAsync();
                // Podpowiedź o nieużywanej funkcji znika razem z funkcją.
                dismiss.mutate(current.key);
                showSuccess(
                    'Funkcja wyłączona',
                    'Śledzenie czasu pracy zostało wyłączone. Możesz je włączyć ponownie w rolach pracowników.'
                );
            } catch {
                showError('Nie udało się wyłączyć funkcji', 'Spróbuj ponownie.');
            } finally {
                setBusy(false);
            }
        }
    };

    return (
        <Bar role="status">
            <HintIcon><Lightbulb /></HintIcon>
            <HintText>{hint.text}</HintText>
            {hint.action && (
                <ActionBtn type="button" onClick={() => runAction(hint)} disabled={busy}>
                    {busy ? 'Chwila...' : hint.action.label}
                </ActionBtn>
            )}
            <CloseBtn
                type="button"
                aria-label="Zamknij podpowiedź"
                onClick={() => dismiss.mutate(hint.key)}
            >
                <X />
            </CloseBtn>
        </Bar>
    );
};
