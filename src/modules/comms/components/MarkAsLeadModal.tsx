// src/modules/comms/components/MarkAsLeadModal.tsx
// Utworzenie leada z rozmowy. Dwa pola i ani jednego więcej - resztę system wie
// sam: kontakt z wątku, klienta po adresie, treść pierwszej wiadomości, a markę
// i model auta odczytuje z korespondencji już po zapisaniu (backend, LLM).
//
//  • Okno jest celowo małe - to potwierdzenie decyzji, a nie formularz. Rozwlekłe
//    objaśnienia pod polami kazałyby je czytać za każdym razem, choć wystarczy raz.
//  • TAGI - dropdown wielokrotnego wyboru, ten sam wzorzec co „Kolor w kalendarzu”
//    przy przyjęciu: lista zamknięta w menu nie rozpycha okna, gdy tagów przybędzie.
//  • USŁUGI - schowane za przyciskiem. Wycena na etapie oznaczania to wyjątek, nie
//    reguła: zwykle wiadomo, o czym jest rozmowa, a nie ile to będzie kosztować.
//    Rozwinięta sekcja to ten sam edytor co przy przyjęciu pojazdu i w panelu
//    leada: „Edytuj pozycję" i rabat na wiersz zamiast gołego pola z ceną. Wycena
//    to ta sama czynność niezależnie od ekranu, więc i narzędzie ma być to samo -
//    a rabat trzeba umieć zapisać jako rabat, nie jako niższą kwotę bez śladu.
//    Ilości tu nie ma: pozycja z własną ceną i notatką niesie więcej niż mnożnik,
//    a dwie takie same usługi to po prostu dwa wiersze.
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Plus } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { EditableServicesTable } from '@/modules/checkin/components/EditableServicesTable';
import { PRICE_SCOPES } from '@/common/components/ServicePriceModal';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import { useToast } from '@/common/components/Toast';
import { useLeadDictionaries, useMarkThreadAsLead } from '../hooks/useLeads';
import { toLeadInputs, totalGrossOf } from '../utils/leadServiceLines';
import { TagMultiSelect } from './TagMultiSelect';
import { useTagCatalogActions } from '../hooks/useTagCatalogActions';
import { IconButton, PrimaryButton, formatGrosze } from './shared';
import { problemDetail } from '@/core/problem';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
`;

/** Etykieta pola zdaniem, nie wersalikami 11 px - te są wycofane jako jedyna rama sekcji (CLAUDE.md §2). */
const FieldLabel = styled.div`
    font-size: 14px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    color: ${p => p.theme.colors.text};
`;

// ─── Usługi ───────────────────────────────────────────────────────────────────

const WideButton = styled(IconButton)`
    width: 100%;
    border-radius: ${p => p.theme.radii.md};
    padding: 10px 14px;
    border-style: dashed;
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

interface MarkAsLeadModalProps {
    threadId: string;
    onClose: () => void;
    onCreated: (leadId: string) => void;
}

export function MarkAsLeadModal({ threadId, onClose, onCreated }: MarkAsLeadModalProps) {
    const [tags, setTags] = useState<string[]>([]);
    const [servicesOpen, setServicesOpen] = useState(false);
    const [services, setServices] = useState<ServiceLineItem[]>([]);

    const { data: dictionaries } = useLeadDictionaries();
    const markAsLead = useMarkThreadAsLead();
    const { showSuccess, showError } = useToast();
    // Dodawanie i kasowanie tagów w słowniku - ta sama obsługa co przy edycji z tabeli.
    const tagActions = useTagCatalogActions((code) =>
        setTags((current) => (current.includes(code) ? current : [...current, code]))
    );

    const total = useMemo(() => totalGrossOf(services), [services]);

    const submit = () => {
        markAsLead.mutate(
            // Kwoty po rabatach, nazwa i stawka VAT - dokładnie to samo tłumaczenie,
            // którym zapisuje wycenę panel leada. Cennik jest podpowiedzią, wycena
            // ma zapamiętać kwotę uzgodnioną w rozmowie.
            { threadId, request: { tags, services: toLeadInputs(services) } },
            {
                onSuccess: (result) => {
                    showSuccess(
                        'Lead utworzony',
                        total > 0
                            ? `Wycena: ${formatGrosze(total)}`
                            : 'Znajdziesz go w Zapytaniach'
                    );
                    onCreated(result.leadId);
                    onClose();
                },
                onError: (error) => {
                    const message =
                        problemDetail(error);
                    showError('Nie udało się utworzyć leada', message ?? 'Spróbuj ponownie');
                },
            }
        );
    };

    // Rozwinięta wycena to tabela z czterema kolumnami kwot - w 480 px byłaby
    // nieczytelna. Okno rośnie dopiero wtedy, gdy naprawdę jest czym je wypełnić,
    // zamiast stać szerokie przy dwóch polach.
    return (
        <ModalShell isOpen onClose={onClose} size={servicesOpen ? 'lg' : 'sm'}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Utwórz lead z tej rozmowy</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Body>
                    <Field>
                        <FieldLabel>O co pyta klient</FieldLabel>
                        <TagMultiSelect
                            options={dictionaries?.tags ?? []}
                            value={tags}
                            onChange={setTags}
                            onCreate={tagActions.onCreate}
                            onDelete={tagActions.onDelete}
                            isCreating={tagActions.isCreating}
                        />
                    </Field>

                    <Field>
                        <FieldLabel>Usługi</FieldLabel>
                        {!servicesOpen ? (
                            <WideButton type="button" onClick={() => setServicesOpen(true)}>
                                <Plus /> Dodaj usługi
                            </WideButton>
                        ) : (
                            <EditableServicesTable services={services} onChange={setServices} scope={PRICE_SCOPES.quote} />
                        )}
                    </Field>
                </Body>
            </ModalContent>
            <ModalFooter>
                {/* Bez usług nie ma czego pokazać - dawniej stał tu samotny „-". */}
                {total > 0 ? (
                    <Total>
                        {formatGrosze(total)}
                        <small>wycena brutto</small>
                    </Total>
                ) : (
                    <Total as="span" style={{ fontWeight: 400 }}><small>Wycenę możesz dodać później</small></Total>
                )}
                <PrimaryButton onClick={submit} disabled={markAsLead.isPending}>
                    {markAsLead.isPending ? 'Zapisywanie…' : 'Utwórz lead'}
                </PrimaryButton>
            </ModalFooter>
        </ModalShell>
    );
}
