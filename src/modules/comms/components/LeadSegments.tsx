// src/modules/comms/components/LeadSegments.tsx
// Przełącznik trzech widoków kolejki.
//
// „Twój ruch" i „U klienta" dzielą sprawy OTWARTE po tym, czyj jest ruch - to
// oś prostopadła do statusu i nie da się jej z niego wyprowadzić. „Zamknięte"
// nie jest trzecią wartością tej samej osi: sprawa rozstrzygnięta nie ma czyjego
// ruchu, więc nie mieści się w żadnym z dwóch pierwszych. Stąd trzy przyciski,
// a nie dwa plus filtr.
//
// Archiwum świadomie NIE MA licznika. Liczba przy archiwum czytałaby się jak
// zaległość do nadrobienia, a to jedyne miejsce w module, gdzie nie ma nic do
// zrobienia.
import styled from 'styled-components';

export type LeadSegment = 'OURS' | 'CLIENT' | 'ARCHIVE';

const Bar = styled.div`
    display: flex;
    gap: 0;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 4px;
`;

/** 48 px wysokości - ten sam cel dotykowy co przycisk akcji na karcie. */
const Tab = styled.button<{ $active: boolean }>`
    flex: 1 1 0;
    min-width: 0;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    font-family: inherit;
    font-size: 13.5px;
    white-space: nowrap;
    transition: background ${p => p.theme.transitions.fast};

    background: ${({ $active, theme }) => ($active ? theme.colors.text : 'transparent')};
    color: ${({ $active, theme }) => ($active ? '#ffffff' : theme.colors.textSecondary)};
    font-weight: ${({ $active, theme }) =>
        $active ? theme.fontWeights.semibold : theme.fontWeights.medium};

    &:hover {
        ${({ $active, theme }) => !$active && `background: ${theme.colors.surfaceHover};`}
    }
`;

/** Licznik zaległości - jedyna liczba w module, która ma prawo być czerwona. */
const DueCount = styled.span`
    min-width: 21px;
    height: 19px;
    padding: 0 6px;
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.error};
    color: #ffffff;
    font-size: 11.5px;
    font-weight: ${p => p.theme.fontWeights.bold};
    display: inline-flex;
    align-items: center;
    justify-content: center;
`;

const QuietCount = styled.span`
    font-size: 11.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.textMuted};
`;

interface LeadSegmentsProps {
    value: LeadSegment;
    ours: number;
    client: number;
    /**
     * Czy pokazać zakładkę archiwum. Na telefonie nie: trzy segmenty w 390 px
     * odbierają szerokość dwóm, które niosą pracę, a archiwum na małym ekranie
     * odwiedza się z konkretnym pytaniem, nie przeglądając. Tam wejściem jest
     * lupa w nagłówku.
     */
    showArchive: boolean;
    onChange: (segment: LeadSegment) => void;
}

export function LeadSegments({ value, ours, client, showArchive, onChange }: LeadSegmentsProps) {
    return (
        <Bar role="tablist" aria-label="Widok zapytań">
            <Tab
                type="button"
                role="tab"
                aria-selected={value === 'OURS'}
                $active={value === 'OURS'}
                onClick={() => onChange('OURS')}
            >
                Twój ruch
                {ours > 0 && <DueCount>{ours}</DueCount>}
            </Tab>
            <Tab
                type="button"
                role="tab"
                aria-selected={value === 'CLIENT'}
                $active={value === 'CLIENT'}
                onClick={() => onChange('CLIENT')}
            >
                U klienta
                {client > 0 && <QuietCount>{client}</QuietCount>}
            </Tab>
            {showArchive && (
                <Tab
                    type="button"
                    role="tab"
                    aria-selected={value === 'ARCHIVE'}
                    $active={value === 'ARCHIVE'}
                    onClick={() => onChange('ARCHIVE')}
                >
                    Zamknięte
                </Tab>
            )}
        </Bar>
    );
}
