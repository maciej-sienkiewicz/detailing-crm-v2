// src/modules/visits/components/ServiceCheckToggle.tsx
//
// Pole „zrobione" przy usłudze wizyty (lista kontrolna, np. tablet na hali).
//
// Odhaczona usługa nosi odcień zieleni jako tło i obwódkę, bez wypełnienia (CLAUDE.md §2):
// przy dziesięciu odhaczonych usługach byłoby dziesięć pełnych zielonych kwadratów, które
// przegrywałyby z przyciskiem kroku następnego w nagłówku wizyty. Samo pole jest drobne
// (20 px), ale cel dotyku na ekranie dotykowym zostaje 44 px - na hali stuka się palcem,
// często w rękawiczce.

import styled from 'styled-components';
import { Check } from 'lucide-react';
import { ui, touch } from '@/common/components/ui';

const Hit = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: transparent;
    border-radius: 10px;
    cursor: pointer;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
    ${touch} { width: 44px; height: 44px; }
`;

const Box = styled.span<{ $checked: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    border: 2px solid ${p => (p.$checked ? ui.okLine : ui.lineStrong)};
    background: ${p => (p.$checked ? ui.okTint : ui.surface)};
    color: ${ui.okInk};
    transition: background 120ms ease, border-color 120ms ease;

    svg { width: 13px; height: 13px; stroke-width: 3; }

    ${Hit}:hover & { border-color: ${p => (p.$checked ? ui.okInk : ui.textMuted)}; }
`;

interface Props {
    checked: boolean;
    serviceName: string;
    onChange: (checked: boolean) => void;
}

export const ServiceCheckToggle = ({ checked, serviceName, onChange }: Props) => (
    <Hit
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`Zrobione: ${serviceName}`}
        title={checked ? 'Odznacz jako niezrobioną' : 'Odhacz jako zrobioną'}
        onClick={e => {
            // Pozycja na telefonie sama jest przyciskiem menu - stuknięcie w pole nie może go otworzyć.
            e.stopPropagation();
            onChange(!checked);
        }}
    >
        <Box $checked={checked} aria-hidden="true">{checked && <Check />}</Box>
    </Hit>
);
