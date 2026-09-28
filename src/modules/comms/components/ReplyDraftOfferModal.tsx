// src/modules/comms/components/ReplyDraftOfferModal.tsx
//
// „Szkic AI" z ofertą: lista usług z cenami i rabatami, którą asystent ma przedstawić
// klientowi w odpowiedzi.
//
//  • Rozmowa jest leadem z wyceną - okno otwiera się na tej wycenie i pozwala ją
//    poprawić; zmiana zapisuje się na leadzie (to jedna wycena, nie druga obok).
//  • Lead bez wyceny albo rozmowa, która leadem jeszcze nie jest - okno startuje puste.
//    Wybrana lista zakłada leada z tej rozmowy (albo uzupełnia wycenę istniejącego):
//    oferta wysłana klientowi to już zapytanie, które trzeba prowadzić dalej.
//
// Edytor to ten sam EditableServicesTable co przy oznaczaniu leada i przyjęciu pojazdu:
// cennik, własna cena i rabat na wiersz albo na wszystko. Kwoty liczy applyAdjustment
// z dokładnym brutto (CLAUDE.md §1) - i do wyceny leada, i do oferty w szkicu.
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Sparkles } from 'lucide-react';
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
import { useToast } from '@/common/components/Toast';
import { useMarkThreadAsLead, useUpdateLeadServices } from '../hooks/useLeads';
import { toLeadInputs, toServiceLines, totalGrossOf } from '../utils/leadServiceLines';
import { toDraftOffer } from '../utils/draftOffer';
import type { DraftOfferLine, Lead } from '../types';
import { PrimaryButton, formatGrosze } from './shared';

const Intro = styled.p`
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.5;
    color: ${p => p.theme.colors.textSecondary};
`;

const Total = styled.div`
    margin-right: auto;
    font-size: 15px;
    font-weight: ${p => p.theme.fontWeights.bold};
    color: ${p => p.theme.colors.text};

    small {
        display: block;
        font-size: 11.5px;
        font-weight: ${p => p.theme.fontWeights.normal};
        color: ${p => p.theme.colors.textMuted};
    }
`;

interface ReplyDraftOfferModalProps {
    threadId: string;
    /** Lead przypięty do rozmowy; null = rozmowa nie jest leadem. */
    lead: Lead | null;
    onClose: () => void;
    /** Wycena zapisana na leadzie - oferta idzie do szkicu. */
    onReady: (offer: DraftOfferLine[]) => void;
}

export function ReplyDraftOfferModal({ threadId, lead, onClose, onReady }: ReplyDraftOfferModalProps) {
    const initial = useMemo(() => toServiceLines(lead?.services ?? []), [lead]);
    const [lines, setLines] = useState<ServiceLineItem[]>(initial);
    const updateServices = useUpdateLeadServices();
    const markAsLead = useMarkThreadAsLead();
    const { showError } = useToast();

    const total = useMemo(() => totalGrossOf(lines), [lines]);
    const saving = updateServices.isPending || markAsLead.isPending;
    const hasQuote = initial.length > 0;

    const submit = async () => {
        if (lines.length === 0 || saving) return;
        const services = toLeadInputs(lines);
        try {
            if (lead) {
                // Nietknięta wycena nie jest zapisywana drugi raz - zapis przepisuje też
                // usługi powiązanej rezerwacji, więc bez zmiany nie ma po co go ruszać.
                if (JSON.stringify(services) !== JSON.stringify(toLeadInputs(initial))) {
                    await updateServices.mutateAsync({ leadId: lead.id, services });
                }
            } else {
                await markAsLead.mutateAsync({ threadId, request: { tags: [], services } });
            }
        } catch (error) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError(lead ? 'Nie udało się zapisać wyceny' : 'Nie udało się utworzyć leada', message ?? 'Spróbuj ponownie');
            return;
        }
        onReady(toDraftOffer(lines));
    };

    return (
        <ModalShell isOpen onClose={onClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Oferta w odpowiedzi</ModalTitle>
                    <ModalSubtitle>Asystent wypisze te usługi z cenami, a przy rabacie podaje cenę regularną.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Intro>
                    {lead
                        ? hasQuote
                            ? 'To wycena leada. Zmiany zapiszą się także na leadzie.'
                            : 'Lead nie ma jeszcze wyceny. Wybrane usługi zostaną jego wyceną.'
                        : 'Ta rozmowa nie jest jeszcze leadem. Po zatwierdzeniu powstanie lead z tą wyceną.'}
                </Intro>
                <EditableServicesTable services={lines} onChange={setLines} />
            </ModalContent>
            <ModalFooter>
                <Total>
                    {total > 0 ? formatGrosze(total) : '-'}
                    <small>razem brutto po rabatach</small>
                </Total>
                <PrimaryButton onClick={submit} disabled={lines.length === 0 || saving}>
                    <Sparkles size={14} /> {saving ? 'Zapisuję…' : 'Napisz szkic z ofertą'}
                </PrimaryButton>
            </ModalFooter>
        </ModalShell>
    );
}
