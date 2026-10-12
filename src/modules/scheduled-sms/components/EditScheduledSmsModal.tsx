// src/modules/scheduled-sms/components/EditScheduledSmsModal.tsx
//
// Zmiana treści i terminu zaplanowanego SMS-a - to samo okno co „Zmień datę rezerwacji"
// na liście wizyt (ModalShell + DateTimePicker + SharedButton).
//
// Termin jest propozycją: serwer dociąga go do godzin wysyłki (21:00 → jutro 12:00)
// i odrzuca przypomnienie, które wyszłoby po rozpoczęciu wizyty. Okno mówi o tym
// zawczasu, a komunikat serwera pokazuje tu, a nie w toaście, który zniknie.

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
import { FormErrorMessage, FormFieldGroup, FormLabel, FormSubmitError, FormTextarea, SharedButton } from '@/common/styles';
import { DateTimePicker } from '@/common/components/DateTimePicker';
import { instantToLocalDateTime, localDateTimeToInstant } from '@/common/utils/localDateTime';
import { smsMeta } from '@/modules/campaigns/utils/sms';
import type { ScheduledSmsItem } from '../types';
import { contentLimit, formatWhen, isAutomation, recipientLabel } from '../utils/scheduledSmsFormat';

const Fields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Counter = styled.div<{ $over: boolean }>`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    color: ${p => p.$over ? '#dc2626' : '#94a3b8'};
    font-variant-numeric: tabular-nums;
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

interface Props {
    item: ScheduledSmsItem | null;
    sendWindow: { opensAt: string; closesAt: string };
    isSaving: boolean;
    /** Komunikat serwera po nieudanym zapisie. */
    error: string | null;
    onConfirm: (payload: { messageContent: string; scheduledFor: string }) => void;
    onClose: () => void;
}

export const EditScheduledSmsModal = ({ item, ...rest }: Props) =>
    // Klucz po wierszu: każde otwarcie zaczyna od wartości tego SMS-a, bez efektu kopiującego stan.
    item ? <EditForm key={`${item.source}:${item.id}`} item={item} {...rest} /> : null;

function EditForm({ item, sendWindow, isSaving, error, onConfirm, onClose }: Props & { item: ScheduledSmsItem }) {
    const [content, setContent] = useState(item.messageContent ?? '');
    const [when, setWhen] = useState(instantToLocalDateTime(item.scheduledFor) ?? '');
    const [validation, setValidation] = useState('');

    const limit = contentLimit(item.source);
    const meta = smsMeta(content);

    const handleConfirm = () => {
        setValidation('');
        const trimmed = content.trim();
        const scheduledFor = localDateTimeToInstant(when);
        if (!trimmed) return setValidation('Wpisz treść wiadomości');
        if (content.length > limit) return setValidation(`Treść może mieć najwyżej ${limit} znaków`);
        if (!scheduledFor) return setValidation('Wybierz datę i godzinę wysyłki');
        if (Date.parse(scheduledFor) <= Date.now()) return setValidation('Termin wysyłki musi być w przyszłości');
        onConfirm({ messageContent: trimmed, scheduledFor });
    };

    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zmień treść i termin SMS-a</ModalTitle>
                    <ModalSubtitle>{item.kindLabel}, do: {recipientLabel(item)}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Fields>
                    {error && <FormSubmitError role="alert">{error}</FormSubmitError>}

                    <FormFieldGroup>
                        <FormLabel htmlFor="scheduled-sms-content">Treść wiadomości</FormLabel>
                        <FormTextarea
                            id="scheduled-sms-content"
                            rows={5}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            $hasError={content.length > limit}
                        />
                        <Counter $over={content.length > limit}>
                            <span>{content.length} / {limit} znaków</span>
                            {meta.segments > 1 && <span>{meta.segments} części SMS</span>}
                        </Counter>
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
                                SMS-y do klientów wychodzą między {sendWindow.opensAt} a {sendWindow.closesAt}.
                                Godzina spoza tego zakresu przesunie się na najbliższe otwarcie.
                            </p>
                            {item.source === 'PRE_VISIT' && item.appointmentStart && (
                                <p>Wizyta zaczyna się {formatWhen(item.appointmentStart)}, przypomnienie musi wyjść wcześniej.</p>
                            )}
                            {isAutomation(item.source) && (
                                <p>
                                    Zmiana dotyczy tylko tego SMS-a, pozostałe wychodzą według ustawień automatu.
                                    {item.source === 'PRE_VISIT' && ' Gdy wizyta zostanie przełożona, przypomnienie wróci do ustawień.'}
                                </p>
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
