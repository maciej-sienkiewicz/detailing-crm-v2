// src/modules/campaigns/components/WizardSteps.tsx
// Wskaźnik kroków kreatora — listwa, nie panel.
//
// Wspólny [Stepper] aplikacji rysuje czterdziestoośmiopikselowe kółka z gradientem,
// powiększone o dziesięć procent na kroku bieżącym, w białej karcie z cieniem
// i trzydziestodwupikselowym marginesem. Przy czterech krokach zabierało to pas
// wysokości porównywalny z pierwszą sekcją formularza — a to jest wskazówka
// „gdzie jestem", nie treść. Wskazówka nie ma prawa ważyć tyle, co praca.
//
// Kreator kampanii ma więc własną, płaską listwę: siedmiopikselowa kropka, nazwa
// kroku obok niej, kreska między krokami. Zajmuje jedną linijkę, czyta się jednym
// spojrzeniem i nie konkuruje z niczym. Wspólny Stepper zostaje nietknięty, bo
// używają go przyjęcie auta, protokoły i wizyty — jego zmiana byłaby zmianą
// czterech innych modułów przy okazji.
import styled from 'styled-components';
import { Check } from 'lucide-react';

const Rail = styled.nav`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    /* Bez ramki i tła: listwa siedzi na tle strony, pod nagłówkiem. */
    padding: 2px 0;
`;

const Item = styled.button<{ $state: 'done' | 'current' | 'todo' }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: none;
    background: none;
    padding: 4px 8px;
    border-radius: ${p => p.theme.radii.full};
    font-family: inherit;
    font-size: 13px;
    white-space: nowrap;
    cursor: ${p => (p.$state === 'current' ? 'default' : 'pointer')};
    transition: background ${p => p.theme.transitions.fast};

    font-weight: ${({ $state, theme }) =>
        $state === 'current' ? theme.fontWeights.semibold : theme.fontWeights.normal};
    color: ${({ $state, theme }) =>
        $state === 'current' ? theme.colors.text
        : $state === 'done' ? theme.colors.textSecondary
        : theme.colors.textMuted};

    &:hover { background: ${p => (p.$state === 'current' ? 'transparent' : p.theme.colors.surfaceHover)}; }
    &:focus-visible { outline: 2px solid ${p => p.theme.colors.primary}; outline-offset: 1px; }
`;

/**
 * Znacznik kroku. Krok zrobiony dostaje ptaszka, bieżący — wypełnioną kropkę,
 * przyszły — pustą obwódkę. Numer porządkowy jest zbędny: nazwy kroków są krótkie
 * i same układają się w kolejność, a cyfra w kółku to jeszcze jeden znak do
 * odczytania.
 */
const Mark = styled.span<{ $state: 'done' | 'current' | 'todo' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    border-radius: 50%;
    box-sizing: border-box;

    background: ${({ $state, theme }) =>
        $state === 'todo' ? 'transparent' : theme.colors.primary};
    border: ${({ $state, theme }) =>
        $state === 'todo' ? `1px solid ${theme.colors.border}` : '1px solid transparent'};

    svg { width: 10px; height: 10px; color: #ffffff; stroke-width: 3; }

    /* Bieżący krok: pełne kółko bez ptaszka — „tu jesteś", a nie „gotowe". */
    &::after {
        content: '';
        display: ${p => (p.$state === 'current' ? 'block' : 'none')};
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #ffffff;
    }
`;

const Line = styled.span`
    flex: 0 1 28px;
    min-width: 12px;
    height: 1px;
    background: ${p => p.theme.colors.border};
`;

export interface WizardStep {
    id: string;
    label: string;
}

interface Props {
    steps: WizardStep[];
    currentStepId: string;
    onStepClick: (id: string) => void;
}

export function WizardSteps({ steps, currentStepId, onStepClick }: Props) {
    const currentIndex = steps.findIndex((s) => s.id === currentStepId);

    return (
        <Rail aria-label="Kroki kreatora">
            {steps.map((step, index) => {
                const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';
                return (
                    <span key={step.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {index > 0 && <Line />}
                        <Item
                            type="button"
                            $state={state}
                            aria-current={state === 'current' ? 'step' : undefined}
                            onClick={() => state !== 'current' && onStepClick(step.id)}
                        >
                            <Mark $state={state}>{state === 'done' && <Check />}</Mark>
                            {step.label}
                        </Item>
                    </span>
                );
            })}
        </Rail>
    );
}
