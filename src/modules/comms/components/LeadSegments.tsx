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
import { FilterChip } from './shared';

export type LeadSegment = 'OURS' | 'CLIENT' | 'ARCHIVE';

/** Rząd chipów - ten sam układ co rząd folderów w Poczcie. */
const Bar = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
`;

/**
 * Chip segmentu - dokładnie ten sam kształt co chip folderu w Poczcie
 * (FilterChip z shared.ts): aktywny to ciemna pigułka, nieaktywny obwódka.
 *
 * Wcześniej był tu jasny tor z białą pigułką w środku - inny język niż
 * o jedną zakładkę dalej, choć obie rzeczy robią to samo: przełączają widok
 * tej samej listy. Licznik siedzi teraz wewnątrz chipa, bo należy do jego
 * etykiety („Twój ruch: 3"), a nie do osobnego elementu obok.
 */
const Tab = styled(FilterChip)`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 13px;
    font-size: 12px;
    min-width: 0;
`;

/**
 * Licznik zaległości - jedyna liczba w module, która ma prawo być czerwona.
 * Na chipie aktywnym (ciemne tło) czerwień na jasnym tle traci kontrast, więc
 * tam licznik przechodzi na jasny napis bez własnego tła.
 */
const DueCount = styled.span<{ $onDark?: boolean }>`
    min-width: 21px;
    height: 19px;
    padding: 0 6px;
    border-radius: ${p => p.theme.radii.full};
    background: ${p => (p.$onDark ? 'rgba(255, 255, 255, 0.18)' : p.theme.colors.error)};
    color: #ffffff;
    font-size: 11.5px;
    font-weight: ${p => p.theme.fontWeights.bold};
    display: inline-flex;
    align-items: center;
    justify-content: center;
`;

const QuietCount = styled.span<{ $onDark?: boolean }>`
    font-size: 11.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => (p.$onDark ? 'rgba(255, 255, 255, 0.72)' : p.theme.colors.textMuted)};
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
                {ours > 0 && <DueCount $onDark={value === 'OURS'}>{ours}</DueCount>}
            </Tab>
            <Tab
                type="button"
                role="tab"
                aria-selected={value === 'CLIENT'}
                $active={value === 'CLIENT'}
                onClick={() => onChange('CLIENT')}
            >
                U klienta
                {client > 0 && <QuietCount $onDark={value === 'CLIENT'}>{client}</QuietCount>}
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
