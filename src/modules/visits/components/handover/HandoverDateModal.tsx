// src/modules/visits/components/handover/HandoverDateModal.tsx
//
// Pierwsze okno po „Wydaj pojazd", gdy dziś jest już po dniu planowanego zakończenia
// wizyty: z jaką datą zamknąć wizytę. Osobne okno, a nie sekcja w rozliczeniu (decyzja
// biznesu z 05.11.2026): od tej daty zależy wszystko dalej - data zapisu płatności,
// data sprzedaży na fakturze - więc zapada, zanim ktokolwiek zacznie rozliczać.

import { useState } from 'react';
import styled from 'styled-components';
import { ArrowRight } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { Button } from '@/common/components/ui';
import { localIsoDate } from '@/common/utils/localDate';
import { HandoverDateSection } from './HandoverDateSection';
import { emptyHandoverDate, handoverDateProblems, plannedDay, type HandoverDateState } from './handoverDate';
import type { Visit } from '../../types';

const FooterSplit = styled(ModalFooter)`
    @media (max-width: 560px) {
        flex-direction: column-reverse;
        align-items: stretch;

        > button { width: 100%; }
    }
`;

interface HandoverDateModalProps {
    visit: Visit;
    isOpen: boolean;
    /** Wybór sprzed „Zmień datę” w oknie wydania - wraca zaznaczony. */
    initial?: HandoverDateState | null;
    onClose: () => void;
    onConfirm: (value: HandoverDateState) => void;
}

export const HandoverDateModal = ({ visit, isOpen, initial, onClose, onConfirm }: HandoverDateModalProps) => {
    const [value, setValue] = useState<HandoverDateState>(initial ?? emptyHandoverDate);
    const today = localIsoDate();
    const planned = plannedDay(visit.estimatedCompletionDate) ?? today;
    // Serwer liczy od startu prac, front zna datę wizyty z kalendarza - kalendarz nie podsuwa
    // dni sprzed wizyty, a ostatnie słowo i tak ma serwer.
    const earliest = visit.scheduledDate ? localIsoDate(new Date(visit.scheduledDate)) : null;
    const problems = handoverDateProblems(value, earliest, today);

    const vehicleLabel = [
        [visit.vehicle.brand, visit.vehicle.model].filter(Boolean).join(' '),
        visit.vehicle.licensePlate,
    ].filter(Boolean).join(', ');
    const customerLabel = `${visit.customer.firstName} ${visit.customer.lastName}`.trim();

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Wydanie pojazdu</ModalTitle>
                    <ModalSubtitle>{[vehicleLabel, customerLabel].filter(Boolean).join(', ')}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <HandoverDateSection
                    value={value}
                    onChange={setValue}
                    planned={planned}
                    today={today}
                    earliest={earliest}
                    // Brak odpowiedzi mówi wyłączony „Dalej” - czerwony komunikat na dzień
                    // dobry, zanim ktoś cokolwiek kliknął, byłby karceniem za nic.
                    problems={value.choice ? problems : []}
                />
            </ModalContent>

            <FooterSplit>
                <Button onClick={onClose}>Anuluj</Button>
                <Button variant="primary" disabled={problems.length > 0} onClick={() => onConfirm(value)}>
                    Dalej<ArrowRight size={16} aria-hidden="true" />
                </Button>
            </FooterSplit>
        </ModalShell>
    );
};
