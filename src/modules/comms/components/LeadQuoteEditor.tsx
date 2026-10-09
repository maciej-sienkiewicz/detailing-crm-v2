// src/modules/comms/components/LeadQuoteEditor.tsx
//
// Wycena sprawy z widoku leadów (ołówek przy wycenie, „Dodaj wycenę"): sam wybór
// usług, bez drugiego podglądu leada.
//
// Dawniej ołówek otwierał pełne okno leada w trybie edycji wyceny - czyli jeszcze raz
// to, co skrzynka pokazuje obok: rozmowę, klienta, przebieg sprawy. Wycena to jedna
// czynność, więc okno ma jedną treść: sugestie asystenta (z „Znajdź ponownie" i
// wyjaśnieniem doboru) nad tym samym edytorem pozycji co przy przyjęciu pojazdu.
import { useMemo, useState } from 'react';
import styled from 'styled-components';
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
import { EditableServicesTable } from '@/modules/checkin/components/EditableServicesTable';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import { Button } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { useUpdateLeadServices } from '../hooks/useLeads';
import { toLeadInputs, toServiceLines, totalGrossOf } from '../utils/leadServiceLines';
import type { Lead } from '../types';
import { LeadSuggestions } from './LeadSuggestions';
import { formatGrosze } from './shared';

const Suggestions = styled.section`
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const Total = styled.div`
    margin-right: auto;
    font-size: 15px;
    font-weight: ${p => p.theme.fontWeights.bold};
    color: ${p => p.theme.colors.text};
    font-variant-numeric: tabular-nums;

    small {
        display: block;
        font-size: 11.5px;
        font-weight: ${p => p.theme.fontWeights.normal};
        color: ${p => p.theme.colors.textMuted};
    }
`;

interface LeadQuoteEditorProps {
    lead: Lead;
    /** Czego dotyczy wycena - np. „BMW X5, Jan Kowalski". */
    subtitle?: string;
    onClose: () => void;
}

export function LeadQuoteEditor({ lead, subtitle, onClose }: LeadQuoteEditorProps) {
    // Okno montuje się na jedno otwarcie - stan startowy z wyceny w chwili otwarcia.
    const [initial] = useState<ServiceLineItem[]>(() => toServiceLines(lead.services));
    const [lines, setLines] = useState<ServiceLineItem[]>(initial);
    const updateServices = useUpdateLeadServices();
    const { showSuccess, showError } = useToast();
    const total = useMemo(() => totalGrossOf(lines), [lines]);

    const save = () => {
        const services = toLeadInputs(lines);
        // Nietknięta wycena nie idzie drugi raz: zapis przepisuje też usługi rezerwacji.
        if (JSON.stringify(services) === JSON.stringify(toLeadInputs(initial))) {
            onClose();
            return;
        }
        updateServices.mutate(
            { leadId: lead.id, services },
            {
                onSuccess: () => {
                    showSuccess('Zapisano wycenę');
                    onClose();
                },
                onError: (error) => {
                    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    showError('Nie udało się zapisać wyceny', message ?? 'Spróbuj ponownie');
                },
            }
        );
    };

    return (
        <ModalShell isOpen onClose={onClose} size="xl" stableHeight>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{initial.length > 0 ? 'Wycena' : 'Dodaj wycenę'}</ModalTitle>
                    {subtitle && <ModalSubtitle>{subtitle}</ModalSubtitle>}
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Suggestions aria-label="Sugestie asystenta">
                    <LeadSuggestions
                        lead={lead}
                        onAccepted={(accepted) => setLines((current) => [...current, ...accepted])}
                    />
                </Suggestions>
                {/* Cennik jako panel obok tabeli - przy wycenie zapytania częściej się
                    przegląda, co warsztat robi, niż szuka pozycji z nazwy. */}
                <EditableServicesTable services={lines} onChange={setLines} layout="split" />
            </ModalContent>
            <ModalFooter>
                <Total>
                    {total > 0 ? formatGrosze(total) : '-'}
                    <small>razem brutto po rabatach</small>
                </Total>
                <Button onClick={onClose} disabled={updateServices.isPending}>Anuluj</Button>
                <Button variant="primary" onClick={save} disabled={updateServices.isPending}>
                    {updateServices.isPending ? 'Zapisuję…' : 'Zapisz wycenę'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}
