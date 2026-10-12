// Zmiana treści i terminu zaplanowanego SMS-a.
//
// Otwarty panel przejmuje okno, więc jego „Zapisz" jest na ten moment krokiem następnym
// i jako jedyny jest wypełniony (CLAUDE.md §2, wyjątek „otwarty edytor").
//
// Termin wpisany tu jest propozycją: serwer dociąga go do godzin wysyłki (np. 21:00 →
// jutro 12:00) i odrzuca przypomnienie, które wyszłoby po rozpoczęciu wizyty. Panel mówi
// o tym zawczasu, a po zapisie lista pokazuje termin, który faktycznie zapisano.

import { useId, useState } from 'react';
import styled from 'styled-components';
import { DateTimePicker } from '@/common/components/DateTimePicker';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { Button, DrawerBody, DrawerFooterSpacer, Notice, SideDrawer, StatusPill, ui } from '@/common/components/ui';
import { instantToLocalDateTime, localDateTimeToInstant } from '@/common/utils/localDateTime';
import { smsMeta } from '@/modules/campaigns/utils/sms';
import type { ScheduledSmsItem } from '../types';
import { contentLimit, formatWhen, isAutomation, recipientLabel } from '../utils/scheduledSmsFormat';

interface Props {
    item: ScheduledSmsItem;
    sendWindow: { opensAt: string; closesAt: string };
    saving: boolean;
    /** Komunikat serwera po nieudanym zapisie - zostaje w panelu, obok pola, którego dotyczy. */
    error: string | null;
    onSave: (payload: { messageContent: string; scheduledFor: string }) => void;
    onClose: () => void;
}

export function ScheduledSmsEditDrawer({ item, sendWindow, saving, error, onSave, onClose }: Props) {
    const titleId = useId();
    const contentId = useId();
    const [content, setContent] = useState(item.messageContent ?? '');
    const [when, setWhen] = useState(instantToLocalDateTime(item.scheduledFor) ?? '');
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    // Chwila otwarcia panelu jako „teraz": panel żyje minuty, a serwer i tak odrzuci termin z przeszłości.
    const [openedAt] = useState(() => Date.now());

    const limit = contentLimit(item.source);
    const meta = smsMeta(content);
    const trimmed = content.trim();
    const scheduledFor = localDateTimeToInstant(when);
    const inPast = !!scheduledFor && Date.parse(scheduledFor) <= openedAt;
    const dirty = content !== (item.messageContent ?? '') || when !== (instantToLocalDateTime(item.scheduledFor) ?? '');
    const valid = trimmed.length > 0 && content.length <= limit && !!scheduledFor && !inPast;

    const requestClose = () => (dirty ? setConfirmDiscard(true) : onClose());

    return (
        <SideDrawer
            onClose={requestClose}
            escapeEnabled={!confirmDiscard}
            titleId={titleId}
            title="Zmień SMS"
            status={<StatusPill $tone="info">{item.kindLabel}</StatusPill>}
            subtitle={<span>Do: {recipientLabel(item)}{item.phoneNumber ? `, ${item.phoneNumber}` : ''}</span>}
            width={520}
            footer={
                <>
                    <DrawerFooterSpacer />
                    <Button variant="ghost" onClick={requestClose} disabled={saving}>Anuluj</Button>
                    <Button
                        variant="primary"
                        disabled={!valid || !dirty || saving}
                        onClick={() => scheduledFor && onSave({ messageContent: trimmed, scheduledFor })}
                    >
                        {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
                    </Button>
                </>
            }
            overlays={
                <ConfirmationModal
                    isOpen={confirmDiscard}
                    title="Porzucić zmiany?"
                    message="Treść i termin SMS-a zostaną takie, jak przed otwarciem okna."
                    variant="warning"
                    confirmText="Porzuć zmiany"
                    cancelText="Wróć do edycji"
                    onConfirm={() => { setConfirmDiscard(false); onClose(); }}
                    onCancel={() => setConfirmDiscard(false)}
                />
            }
        >
            <DrawerBody>
                {error && <Notice tone="danger" role="alert" title="Nie udało się zapisać">{error}</Notice>}

                <Field>
                    <Label htmlFor={contentId}>Treść</Label>
                    <TextArea
                        id={contentId}
                        value={content}
                        rows={6}
                        onChange={e => setContent(e.target.value)}
                        $invalid={content.length > limit || trimmed.length === 0}
                    />
                    <Counter $over={content.length > limit}>
                        <span>{content.length} / {limit} znaków</span>
                        {meta.segments > 1 && <span>{meta.segments} części SMS</span>}
                    </Counter>
                </Field>

                <Field>
                    <Label as="span">Kiedy wysłać</Label>
                    <DateTimePicker value={when} onChange={setWhen} hasError={inPast} />
                    <Hint>
                        SMS-y wychodzą między {sendWindow.opensAt} a {sendWindow.closesAt}. Godzina spoza tego
                        zakresu przesunie się na najbliższe otwarcie.
                    </Hint>
                    {inPast && <ErrorHint>Wybierz termin w przyszłości.</ErrorHint>}
                    {item.source === 'PRE_VISIT' && item.appointmentStart && (
                        <Hint>Wizyta zaczyna się {formatWhen(item.appointmentStart)}. Przypomnienie musi wyjść wcześniej.</Hint>
                    )}
                </Field>

                {isAutomation(item.source) && (
                    <Notice tone="info" title="Zmiana dotyczy tylko tego SMS-a">
                        Pozostałe wiadomości automatu nadal wychodzą według ustawień.
                        {item.source === 'PRE_VISIT' && ' Gdy wizyta zostanie przełożona, przypomnienie wróci do ustawień automatu.'}
                    </Notice>
                )}
            </DrawerBody>
        </SideDrawer>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Label = styled.label`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
`;

const TextArea = styled.textarea<{ $invalid: boolean }>`
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border: 1px solid ${p => p.$invalid ? ui.dangerLine : ui.line};
    border-radius: ${ui.radiusRow};
    background: ${ui.surface};
    font: inherit;
    font-size: 14.5px;
    line-height: 1.5;
    color: ${ui.ink};
    resize: vertical;

    &:focus { outline: none; border-color: ${ui.brandLine}; box-shadow: 0 0 0 3px ${ui.brandTint}; }
`;

const Counter = styled.div<{ $over: boolean }>`
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
    color: ${p => p.$over ? ui.dangerInk : ui.textMuted};
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: ${ui.textSecondary};
`;

const ErrorHint = styled(Hint)`
    color: ${ui.dangerInk};
    font-weight: 600;
`;
