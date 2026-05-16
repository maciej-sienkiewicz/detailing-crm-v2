import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useSmsReminder, type SmsReminderResponse } from '../hooks/useSmsReminder';
import type { CustomerInfo } from '../types';
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
import { SharedButton } from '@/common/styles';

// ── Inner components ──────────────────────────────────────────────────────────

const IconWrap = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: ${st.gradientBlue};
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    svg { width: 14px; height: 14px; }
`;

const Body = styled.div`
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const FooterLeft = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
`;

const FooterRight = styled.div`
    display: flex;
    gap: 8px;
`;

const CustomerRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

const CustomerAvatar = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${st.gradientBlue};
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    svg { width: 15px; height: 15px; }
`;

const CustomerDetails = styled.div`
    flex: 1;
    min-width: 0;
`;

const CustomerName = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const CustomerPhone = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const FieldLabel = styled.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 6px;
`;

const CharCount = styled.span<{ $warn: boolean }>`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${p => p.$warn ? '#d97706' : st.textMuted};
    text-transform: none;
    letter-spacing: 0;
`;

const Textarea = styled.textarea`
    width: 100%;
    min-height: 100px;
    padding: 10px 12px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    color: ${st.text};
    font-size: ${st.fontSm};
    font-family: inherit;
    resize: vertical;
    outline: none;
    transition: border-color ${st.transition};
    box-sizing: border-box;

    &:focus { border-color: ${st.accentBlue}; }
    &::placeholder { color: ${st.textMuted}; }
`;

const GenerateBtn = styled.button<{ $loading?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$loading ? 0.65 : 1};
    background: transparent;
    color: ${st.accentBlue};
    border: 1px solid rgba(59,130,246,0.35);
    transition: all ${st.transition};
    align-self: flex-start;

    &:hover:not(:disabled) {
        background: ${st.accentBlueDim};
        border-color: ${st.accentBlue};
    }

    svg { width: 13px; height: 13px; flex-shrink: 0; }
`;

const DaysRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const DaysInput = styled.input`
    width: 80px;
    padding: 9px 12px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    color: ${st.text};
    font-size: ${st.fontSm};
    font-family: inherit;
    font-weight: 700;
    outline: none;
    transition: border-color ${st.transition};
    box-sizing: border-box;
    text-align: center;
    -moz-appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button { -webkit-appearance: none; }
    &:focus { border-color: ${st.accentBlue}; }
`;

const DaysSuffix = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    white-space: nowrap;
`;

const PresetRow = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
`;

const PresetBtn = styled.button<{ $active: boolean }>`
    padding: 4px 10px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    border: 1px solid ${p => p.$active ? st.accentBlue : st.border};
    background: ${p => p.$active ? st.accentBlueDim : 'transparent'};
    color: ${p => p.$active ? st.accentBlue : st.textMuted};
    &:hover { border-color: ${st.accentBlue}; color: ${st.accentBlue}; background: ${st.accentBlueDim}; }
`;

const DatePreview = styled.p`
    margin: 8px 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    display: flex;
    align-items: center;
    gap: 5px;
    svg { width: 11px; height: 11px; opacity: 0.6; flex-shrink: 0; }
`;

const CancelScheduleBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    background: transparent;
    color: #EF4444;
    border: 1px solid rgba(239,68,68,0.35);
    &:hover:not(:disabled) { background: rgba(239,68,68,0.08); border-color: #EF4444; }
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const SubmitError = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 7px;
    padding: 8px 12px;
    background: #fef2f2;
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    color: #dc2626;
    line-height: 1.45;
    width: 100%;

    svg { width: 14px; height: 14px; flex-shrink: 0; margin-top: 1px; }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_PRESETS = [7, 14, 30, 60, 90];

function scheduledDateFromDays(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(16, 0, 0, 0);
    return d;
}

function formatPreviewDate(days: number): string {
    return scheduledDateFromDays(days).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function daysFromNowForDate(isoDate: string): number {
    const diff = new Date(isoDate).getTime() - Date.now();
    return Math.max(1, Math.round(diff / 86_400_000));
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SmsReminderModalProps {
    isOpen: boolean;
    visitId: string;
    customer: CustomerInfo;
    /** When provided, opens in edit mode for an existing PENDING reminder */
    existingReminder?: SmsReminderResponse | null;
    onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const SmsReminderModal = ({ isOpen, visitId, customer, existingReminder, onClose }: SmsReminderModalProps) => {
    const isEditMode = !!existingReminder;

    const [message, setMessage] = useState(existingReminder?.messageContent ?? '');
    const [days, setDays] = useState<number>(() =>
        existingReminder ? daysFromNowForDate(existingReminder.scheduledFor) : 90
    );
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { generateContent, isGenerating, scheduleReminder, isScheduling, updateReminder, isUpdating, cancelReminder, isCancelling } = useSmsReminder(visitId);

    const charCount = message.length;
    const isBusy = isGenerating || isScheduling || isUpdating || isCancelling;

    useEffect(() => {
        if (existingReminder) {
            setMessage(existingReminder.messageContent);
            setDays(daysFromNowForDate(existingReminder.scheduledFor));
        }
    }, [existingReminder]);

    const handleDaysChange = (raw: string) => {
        const val = parseInt(raw, 10);
        if (!isNaN(val) && val >= 1 && val <= 999) setDays(val);
        else if (raw === '') setDays(1);
    };

    const handleGenerate = async () => {
        const result = await generateContent(scheduledDateFromDays(days).toISOString());
        setMessage(result.content);
    };

    const handleSubmit = async () => {
        if (!message.trim()) return;
        setSubmitError(null);
        const scheduledFor = scheduledDateFromDays(days).toISOString();

        try {
            if (isEditMode && existingReminder) {
                await updateReminder({ reminderId: existingReminder.id, messageContent: message, scheduledFor });
            } else {
                await scheduleReminder({ messageContent: message, scheduledFor });
            }
            onClose();
        } catch (err: unknown) {
            const apiMessage =
                (err as any)?.response?.data?.message ??
                (err instanceof Error ? err.message : null) ??
                'Nie udało się zaplanować SMS-a. Spróbuj ponownie.';
            setSubmitError(apiMessage);
        }
    };

    const handleCancel = async () => {
        if (!existingReminder) return;
        await cancelReminder(existingReminder.id);
        onClose();
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="520px">
            <ModalHeader>
                <IconWrap>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                </IconWrap>
                <ModalTitleGroup>
                    <ModalTitle>{isEditMode ? 'Edytuj zaplanowany SMS' : 'Zaplanuj SMS przypominający'}</ModalTitle>
                    <ModalSubtitle>
                        {isEditMode ? 'Zmień treść lub termin wysyłki' : 'Wybierz za ile dni wysłać przypomnienie'}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <Body>
                <CustomerRow>
                    <CustomerAvatar>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="8" r="4"/>
                            <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"/>
                        </svg>
                    </CustomerAvatar>
                    <CustomerDetails>
                        <CustomerName>{customer.firstName} {customer.lastName}</CustomerName>
                        <CustomerPhone>{customer.phone}</CustomerPhone>
                    </CustomerDetails>
                </CustomerRow>

                <div>
                    <FieldLabel>
                        Treść wiadomości
                        <CharCount $warn={charCount > 160}>
                            {charCount} / 160 znaków
                        </CharCount>
                    </FieldLabel>
                    <Textarea
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Wpisz treść SMS lub wygeneruj automatycznie..."
                        disabled={isBusy}
                    />
                    <GenerateBtn
                        onClick={handleGenerate}
                        disabled={isBusy}
                        $loading={isGenerating}
                        style={{ marginTop: 8 }}
                    >
                        {isGenerating ? (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite' }}>
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                                </svg>
                                Generowanie...
                            </>
                        ) : (
                            <>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                                Wygeneruj treść
                            </>
                        )}
                    </GenerateBtn>
                </div>

                <div>
                    <FieldLabel htmlFor="sms-days">Wyślij za</FieldLabel>
                    <DaysRow>
                        <DaysInput
                            id="sms-days"
                            type="number"
                            min={1}
                            max={999}
                            value={days}
                            onChange={e => handleDaysChange(e.target.value)}
                            disabled={isBusy}
                        />
                        <DaysSuffix>dni od dziś</DaysSuffix>
                    </DaysRow>
                    <PresetRow>
                        {DAY_PRESETS.map(preset => (
                            <PresetBtn
                                key={preset}
                                $active={days === preset}
                                onClick={() => setDays(preset)}
                                disabled={isBusy}
                            >
                                {preset} dni
                            </PresetBtn>
                        ))}
                    </PresetRow>
                    <DatePreview>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        SMS zostanie wysłany: <strong>{formatPreviewDate(days)} o 16:00</strong>
                    </DatePreview>
                </div>
            </Body>

            <ModalFooter>
                {submitError && (
                    <SubmitError>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        {submitError}
                    </SubmitError>
                )}
                {isEditMode && (
                    <FooterLeft>
                        <CancelScheduleBtn onClick={handleCancel} disabled={isBusy}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="15" y1="9" x2="9" y2="15"/>
                                <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                            Anuluj zaplanowanie
                        </CancelScheduleBtn>
                    </FooterLeft>
                )}
                <FooterRight>
                    <SharedButton $variant="secondary" onClick={onClose} disabled={isBusy}>
                        Pomiń
                    </SharedButton>
                    <SharedButton
                        $variant="primary"
                        onClick={handleSubmit}
                        disabled={!message.trim() || isBusy}
                    >
                        {(isScheduling || isUpdating) ? 'Zapisywanie...' : isEditMode ? 'Zapisz zmiany' : 'Zaplanuj SMS'}
                    </SharedButton>
                </FooterRight>
            </ModalFooter>
        </ModalShell>
    );
};
