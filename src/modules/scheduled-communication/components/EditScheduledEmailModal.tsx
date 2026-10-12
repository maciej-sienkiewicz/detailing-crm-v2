// src/modules/scheduled-communication/components/EditScheduledEmailModal.tsx
//
// Zmiana tematu, treści i terminu zaplanowanego e-maila - to samo okno co przy SMS-ie
// (EditScheduledSmsModal), z tematem zamiast licznika części SMS.
//
// Załączniki zostają takie, jakie były (protokół, zdjęcia, zestawienie): formularz
// zmienia tylko tekst, więc okno mówi wprost, co pójdzie razem z mailem.

import { useState } from 'react';
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
import {
    FormErrorMessage, FormFieldGroup, FormInput, FormLabel, FormSubmitError, FormTextarea, SharedButton,
} from '@/common/styles';
import { DateTimePicker } from '@/common/components/DateTimePicker';
import { instantToLocalDateTime, localDateTimeToInstant } from '@/common/utils/localDateTime';
import type { ScheduledEmailItem } from '../types';
import { recipientLabel } from '../utils/scheduledFormat';

/** Takie same limity jak na serwerze (ScheduledEmailCommandService). */
const SUBJECT_LIMIT = 500;
const CONTENT_LIMIT = 20_000;

const Fields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const InfoBox = styled.div`
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.5;
    color: #475569;

    svg { width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    p { margin: 0; }
    p + p { margin-top: 4px; }
`;

/** div, nie p: lista w akapicie to niepoprawny HTML. */
const Attachments = styled.div`
    margin-top: 4px;
`;

const Files = styled.ul`
    margin: 4px 0 0;
    padding-left: 18px;
`;

interface Props {
    item: ScheduledEmailItem | null;
    sendWindow: { opensAt: string; closesAt: string };
    isSaving: boolean;
    /** Komunikat serwera po nieudanym zapisie. */
    error: string | null;
    onConfirm: (payload: { subject: string; messageContent: string; scheduledFor: string }) => void;
    onClose: () => void;
}

export const EditScheduledEmailModal = ({ item, ...rest }: Props) =>
    // Klucz po wierszu: każde otwarcie zaczyna od wartości tego e-maila, bez efektu kopiującego stan.
    item ? <EditForm key={`${item.source}:${item.id}`} item={item} {...rest} /> : null;

function EditForm({ item, sendWindow, isSaving, error, onConfirm, onClose }: Props & { item: ScheduledEmailItem }) {
    const [subject, setSubject] = useState(item.subject ?? '');
    const [content, setContent] = useState(item.messageContent ?? '');
    const [when, setWhen] = useState(instantToLocalDateTime(item.scheduledFor) ?? '');
    const [validation, setValidation] = useState('');

    const handleConfirm = () => {
        setValidation('');
        const trimmedSubject = subject.trim();
        const trimmed = content.trim();
        const scheduledFor = localDateTimeToInstant(when);
        if (!trimmedSubject) return setValidation('Wpisz temat wiadomości');
        if (subject.length > SUBJECT_LIMIT) return setValidation(`Temat może mieć najwyżej ${SUBJECT_LIMIT} znaków`);
        if (!trimmed) return setValidation('Wpisz treść wiadomości');
        if (content.length > CONTENT_LIMIT) return setValidation(`Treść może mieć najwyżej ${CONTENT_LIMIT} znaków`);
        if (!scheduledFor) return setValidation('Wybierz datę i godzinę wysyłki');
        if (Date.parse(scheduledFor) <= Date.now()) return setValidation('Termin wysyłki musi być w przyszłości');
        onConfirm({ subject: trimmedSubject, messageContent: trimmed, scheduledFor });
    };

    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zmień treść i termin e-maila</ModalTitle>
                    <ModalSubtitle>{item.kindLabel}, do: {recipientLabel(item)}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Fields>
                    {error && <FormSubmitError role="alert">{error}</FormSubmitError>}

                    <FormFieldGroup>
                        <FormLabel htmlFor="scheduled-email-subject">Temat</FormLabel>
                        <FormInput
                            id="scheduled-email-subject"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            $hasError={subject.length > SUBJECT_LIMIT}
                        />
                    </FormFieldGroup>

                    <FormFieldGroup>
                        <FormLabel htmlFor="scheduled-email-content">Treść wiadomości</FormLabel>
                        <FormTextarea
                            id="scheduled-email-content"
                            rows={10}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            $hasError={content.length > CONTENT_LIMIT}
                        />
                    </FormFieldGroup>

                    <FormFieldGroup>
                        <FormLabel as="span">Data i godzina wysyłki</FormLabel>
                        <DateTimePicker value={when} onChange={setWhen} placeholder="Wybierz datę i godzinę" />
                    </FormFieldGroup>

                    <InfoBox>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <div>
                            <p>
                                E-maile do klientów wychodzą między {sendWindow.opensAt} a {sendWindow.closesAt}.
                                Godzina spoza tego zakresu przesunie się na najbliższe otwarcie.
                            </p>
                            {item.attachmentNames.length > 0 && (
                                <Attachments>
                                    Razem z e-mailem wyjdą załączniki, bez zmian:
                                    <Files>{item.attachmentNames.map(name => <li key={name}>{name}</li>)}</Files>
                                </Attachments>
                            )}
                        </div>
                    </InfoBox>

                    {validation && <FormErrorMessage>{validation}</FormErrorMessage>}
                </Fields>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isSaving}>
                    Anuluj
                </SharedButton>
                <SharedButton $variant="primary" type="button" onClick={handleConfirm} disabled={isSaving}>
                    {isSaving ? 'Zapisywanie…' : 'Zapisz zmiany'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
}
