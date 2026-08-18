// src/modules/communication/components/FactChip.tsx
// Wzorzec „kropkowany fakt": przerywana ramka = lead oznaczony jako wymagający
// sprawdzenia. Chip jest wyłącznie prezentacyjny — backend nie udostępnia edycji
// pojedynczego faktu, a udawana edycja byłaby gorsza niż jej brak.
import styled from 'styled-components';
import type { Fact, FactKey } from '../types';

const Chip = styled.span<{ $verified: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    font-size: 13px;
    color: #1a1a1a;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px ${({ $verified }) => ($verified ? 'solid #e5e7eb' : 'dashed #9ca3af')};
    border-radius: 6px;
`;

const KeyLabel = styled.span`
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const FACT_KEY_LABELS: Record<FactKey, string> = {
    VEHICLE: 'Pojazd',
    SERVICE: 'Usługa',
    CONTACT: 'Kontakt',
};

interface FactChipProps {
    fact: Fact;
}

export const FactChip = ({ fact }: FactChipProps) => (
    <Chip
        $verified={fact.verified}
        title={fact.verified ? undefined : 'Lead oznaczony do sprawdzenia'}
    >
        <KeyLabel>{FACT_KEY_LABELS[fact.key]}</KeyLabel>
        {fact.value}
    </Chip>
);
