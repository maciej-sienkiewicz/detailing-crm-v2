import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useSmsReminder, type SmsReminderResponse } from '../hooks/useSmsReminder';
import type { CustomerInfo } from '../types';

// ── Animations ────────────────────────────────────────────────────────────────

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const slideUp = keyframes`
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
`;

// ── Layout ────────────────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    padding: 20px;
    animation: ${fadeIn} 0.18s ease;
`;

const Container = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: ${slideUp} 0.22s ease;
`;

const Header = styled.div`
    padding: 16px 20px 14px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
`;

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

const HeaderText = styled.div`
    flex: 1;
    min-width: 0;
`;

const Title = styled.h2`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    line-height: 1.2;
`;

const Subtitle = styled.p`
    margin: 2px 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const CloseBtn = styled.button`
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: ${st.textMuted};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all ${st.transition};
    flex-shrink: 0;
    &:hover { background: ${st.bgCardAlt}; color: ${st.text}; }
    svg { width: 16px; height: 16px; }
`;

const Body = styled.div`
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Footer = styled.div`
    padding: 12px 20px;
    border-top: 1px solid ${st.border};
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
`;

const FooterRight = styled.div`
    margin-left: auto;
    display: flex;
    gap: 8px;
`;

// ── Inner components ──────────────────────────────────────────────────────────

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

const DateInput = styled.input`
    width: 100%;
    padding: 9px 12px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    color: ${st.text};
    font-size: ${st.fontSm};
    font-family: inherit;
    outline: none;
    transition: border-color ${st.transition};
    box-sizing: border-box;
    color-scheme: dark;

    &:focus { border-color: ${st.accentBlue}; }
`;

const DateHint = styled.p`
    margin: 4px 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const Btn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
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

    ${p => p.$primary && `
        background: ${st.accentBlue};
        color: white;
        border: none;
        box-shadow: ${st.shadowXs};
        &:hover:not(:disabled) { background: #2563EB; box-shadow: ${st.shadowSm}; transform: translateY(-1px); }
    `}

    ${p => p.$danger && `
        background: transparent;
        color: #EF4444;
        border: 1px solid rgba(239,68,68,0.35);
        &:hover:not(:disabled) { background: rgba(239,68,68,0.08); border-color: #EF4444; }
    `}

    ${p => !p.$primary && !p.$danger && `
        background: transparent;
        color: ${st.textSecondary};
        border: 1px solid ${st.border};
        &:hover:not(:disabled) { border-color: ${st.accentBlue}; color: ${st.accentBlue}; background: ${st.accentBlueDim}; }
    `}

    &:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDatetimeLocalValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultScheduledFor(): string {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    d.setHours(10, 0, 0, 0);
    return toDatetimeLocalValue(d);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SmsReminderModalProps {
    visitId: string;
    customer: CustomerInfo;
    /** When provided, opens in edit mode for an existing PENDING reminder */
    existingReminder?: SmsReminderResponse | null;
    onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const SmsReminderModal = ({ visitId, customer, existingReminder, onClose }: SmsReminderModalProps) => {
    const isEditMode = !!existingReminder;

    const [message, setMessage] = useState(existingReminder?.messageContent ?? '');
    const [scheduledFor, setScheduledFor] = useState<string>(() => {
        if (existingReminder) {
            return toDatetimeLocalValue(new Date(existingReminder.scheduledFor));
        }
        return defaultScheduledFor();
    });

    const { generateContent, isGenerating, scheduleReminder, isScheduling, updateReminder, isUpdating, cancelReminder, isCancelling } = useSmsReminder(visitId);

    const charCount = message.length;
    const isBusy = isGenerating || isScheduling || isUpdating || isCancelling;

    useEffect(() => {
        if (existingReminder) {
            setMessage(existingReminder.messageContent);
            setScheduledFor(toDatetimeLocalValue(new Date(existingReminder.scheduledFor)));
        }
    }, [existingReminder]);

    const handleGenerate = async () => {
        const result = await generateContent(new Date(scheduledFor).toISOString());
        setMessage(result.content);
    };

    const handleSubmit = async () => {
        if (!message.trim()) return;

        if (isEditMode && existingReminder) {
            await updateReminder({
                reminderId: existingReminder.id,
                messageContent: message,
                scheduledFor: new Date(scheduledFor).toISOString(),
            });
        } else {
            await scheduleReminder({
                messageContent: message,
                scheduledFor: new Date(scheduledFor).toISOString(),
            });
        }
        onClose();
    };

    const handleCancel = async () => {
        if (!existingReminder) return;
        await cancelReminder(existingReminder.id);
        onClose();
    };

    return (
        <Overlay onClick={onClose}>
            <Container onClick={e => e.stopPropagation()}>
                <Header>
                    <IconWrap>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </IconWrap>
                    <HeaderText>
                        <Title>{isEditMode ? 'Edytuj zaplanowany SMS' : 'Zaplanuj SMS przypominający'}</Title>
                        <Subtitle>
                            {isEditMode ? 'Zmień treść lub termin wysyłki' : 'Wyślij przypomnienie za 90 dni'}
                        </Subtitle>
                    </HeaderText>
                    <CloseBtn onClick={onClose} title="Zamknij">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </CloseBtn>
                </Header>

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
                        <FieldLabel>Termin wysyłki</FieldLabel>
                        <DateInput
                            type="datetime-local"
                            value={scheduledFor}
                            onChange={e => setScheduledFor(e.target.value)}
                            disabled={isBusy}
                        />
                        <DateHint>Domyślnie 90 dni od dziś</DateHint>
                    </div>
                </Body>

                <Footer>
                    {isEditMode && (
                        <Btn $danger onClick={handleCancel} disabled={isBusy}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="15" y1="9" x2="9" y2="15"/>
                                <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                            Anuluj zaplanowanie
                        </Btn>
                    )}
                    <FooterRight>
                        <Btn onClick={onClose} disabled={isBusy}>
                            Pomiń
                        </Btn>
                        <Btn
                            $primary
                            onClick={handleSubmit}
                            disabled={!message.trim() || isBusy}
                        >
                            {(isScheduling || isUpdating) ? 'Zapisywanie...' : isEditMode ? 'Zapisz zmiany' : 'Zaplanuj SMS'}
                        </Btn>
                    </FooterRight>
                </Footer>
            </Container>
        </Overlay>
    );
};
