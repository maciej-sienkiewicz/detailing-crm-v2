// src/modules/calendar/components/StudioEventModal.tsx
//
// Zakładanie i edycja wydarzenia studia. Zakres dni przychodzi z zaznaczenia na
// kalendarzu, ale zostaje edytowalny — łatwiej poprawić datę w polu niż trafić
// myszą w dokładnie te dni po raz drugi.

import { useState } from 'react';
import styled from 'styled-components';
import { Bell, Trash2 } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import {
    FormField, FormGrid, FieldLabel, InputShell, InputShellTextArea, BareInput, BareTextArea,
} from '@/common/components/Form';
import { SharedButton } from '@/common/styles';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { StudioCalendarEvent, StudioCalendarEventPayload } from '../types';

const IconBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: ${st.accentAmberDim};
    color: ${st.accentAmber};
    flex-shrink: 0;
`;

const HeaderRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
`;

const FooterRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    flex-wrap: wrap;

    /* Usunięcie stoi po lewej, z dala od „Zapisz" — to jedyna nieodwracalna
       akcja w tym oknie. */
    .spacer { flex: 1; }
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: ${st.accentRed};
`;

/**
 * Okno montuje się na jedno zaznaczenie: wywołujący nadaje mu `key` zależny od
 * zakresu (albo id wydarzenia), więc stan pól nie musi gonić za propsami.
 */
interface StudioEventModalProps {
    /** Zakres wskazany na kalendarzu (nowe wydarzenie) albo edytowane wydarzenie. */
    initialRange?: { startDate: string; endDate: string };
    event?: StudioCalendarEvent | null;
    isSaving?: boolean;
    isDeleting?: boolean;
    onSave: (payload: StudioCalendarEventPayload) => void;
    onDelete?: () => void;
    onClose: () => void;
}

export const StudioEventModal = ({
    initialRange, event, isSaving, isDeleting, onSave, onDelete, onClose,
}: StudioEventModalProps) => {
    const [title, setTitle] = useState(event?.title ?? '');
    const [description, setDescription] = useState(event?.description ?? '');
    const [startDate, setStartDate] = useState(event?.startDate ?? initialRange?.startDate ?? '');
    const [endDate, setEndDate] = useState(event?.endDate ?? initialRange?.endDate ?? '');
    const [error, setError] = useState<string | null>(null);

    const submit = () => {
        if (!title.trim()) {
            setError('Podaj tytuł wydarzenia');
            return;
        }
        if (!startDate || !endDate) {
            setError('Podaj zakres dat');
            return;
        }
        if (endDate < startDate) {
            setError('Koniec wydarzenia nie może być wcześniejszy niż początek');
            return;
        }
        setError(null);
        onSave({
            title: title.trim(),
            description: description.trim() || null,
            startDate,
            endDate,
        });
    };

    const isEdit = !!event;

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <HeaderRow>
                    <IconBadge><Bell size={17} /></IconBadge>
                    <ModalTitleGroup>
                        <ModalTitle>{isEdit ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'}</ModalTitle>
                        <ModalSubtitle>
                            {isEdit
                                ? `Dodane przez ${event!.createdByName}`
                                : 'Wpis w kalendarzu, który nie jest wizytą ani rezerwacją'}
                        </ModalSubtitle>
                    </ModalTitleGroup>
                </HeaderRow>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <FormGrid>
                    <FormField>
                        <FieldLabel htmlFor="studio-event-start">Od</FieldLabel>
                        <InputShell>
                            <BareInput
                                id="studio-event-start"
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </InputShell>
                    </FormField>
                    <FormField>
                        <FieldLabel htmlFor="studio-event-end">Do</FieldLabel>
                        <InputShell>
                            <BareInput
                                id="studio-event-end"
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </InputShell>
                    </FormField>
                </FormGrid>

                <FormField>
                    <FieldLabel htmlFor="studio-event-title">Tytuł</FieldLabel>
                    <InputShell>
                        <BareInput
                            id="studio-event-title"
                            value={title}
                            maxLength={200}
                            placeholder="np. Urlop, szkolenie, dostawa chemii"
                            onChange={e => setTitle(e.target.value)}
                        />
                    </InputShell>
                </FormField>

                <FormField>
                    <FieldLabel htmlFor="studio-event-description">Opis</FieldLabel>
                    <InputShellTextArea>
                        <BareTextArea
                            id="studio-event-description"
                            rows={4}
                            value={description}
                            placeholder="Szczegóły widoczne po kliknięciu w wydarzenie (opcjonalnie)"
                            onChange={e => setDescription(e.target.value)}
                        />
                    </InputShellTextArea>
                </FormField>

                {error && <ErrorText>{error}</ErrorText>}
            </ModalContent>

            <ModalFooter>
                <FooterRow>
                    {isEdit && onDelete && (
                        <SharedButton $variant="danger" onClick={onDelete} disabled={isDeleting || isSaving}>
                            <Trash2 size={14} />
                            {isDeleting ? 'Usuwanie…' : 'Usuń'}
                        </SharedButton>
                    )}
                    <span className="spacer" />
                    <SharedButton $variant="secondary" onClick={onClose} disabled={isSaving || isDeleting}>
                        Anuluj
                    </SharedButton>
                    <SharedButton $variant="primary" onClick={submit} disabled={isSaving || isDeleting}>
                        {isSaving ? 'Zapisywanie…' : isEdit ? 'Zapisz zmiany' : 'Dodaj wydarzenie'}
                    </SharedButton>
                </FooterRow>
            </ModalFooter>
        </ModalShell>
    );
};
