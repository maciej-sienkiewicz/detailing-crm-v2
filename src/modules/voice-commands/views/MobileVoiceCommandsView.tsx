// src/modules/voice-commands/views/MobileVoiceCommandsView.tsx

import { useState, useRef, useEffect, useCallback } from 'react';
import { useVoiceCommandsLogic } from '../hooks/useVoiceCommandsLogic';
import {
    Container,
    LoadingWrap, Spinner, SpinnerSm, LoadingText,
    ErrorWrap, ErrorIconWrap, ErrorTitle, ErrorMessage,
    ScreenBody, ScreenContent, ScreenHeader, BackBtn, ModeBadge,
    SplitLayout, SplitBtn, SplitIcon, SplitLabel,
    ScreenTitle,
    FormLabel, FormField, PhoneInput,
    MicArea, MicRingWrap, MicRing, MicRingOuter, MicCircle, MicStatus,
    TranscriptDisplay, Placeholder, InterimText, TranscriptTextarea,
    PermissionError,
    PrimaryBtn, SecondaryBtn, LinkBtn,
    BottomBar,
    SendBody, SendIconWrap, SendTitle, SendMessage,
    Toast,
} from './mobile/VoiceCommands.styles';

interface Props {
    token: string;
}

export const MobileVoiceCommandsView = ({ token }: Props) => {
    const logic = useVoiceCommandsLogic(token);

    const [toastText, setToastText] = useState('');
    const [toastVisible, setToastVisible] = useState(false);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
    }, []);

    const showToast = useCallback((msg: string) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastText(msg);
        setToastVisible(true);
        toastTimerRef.current = setTimeout(() => {
            setToastVisible(false);
            toastTimerRef.current = null;
        }, 2500);
    }, []);

    const handleSubmitDictate = useCallback(() => {
        const text = logic.dictateState === 'editing'
            ? logic.editableText.trim()
            : (logic.finalText + (logic.interimText ? ' ' + logic.interimText : '')).trim();
        if (!text) {
            showToast('Podyktuj lub wpisz treść');
            return;
        }
        logic.submitDictate();
    }, [logic, showToast]);

    // ─── Loading ──────────────────────────────────────────────────────────────

    if (logic.sessionState === 'loading') {
        return (
            <Container>
                <LoadingWrap>
                    <Spinner />
                    <LoadingText>Łączenie...</LoadingText>
                </LoadingWrap>
            </Container>
        );
    }

    // ─── Error ────────────────────────────────────────────────────────────────

    if (logic.sessionState === 'error') {
        return (
            <Container>
                <ErrorWrap>
                    <ErrorIconWrap>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </ErrorIconWrap>
                    <ErrorTitle>Link nieaktywny lub wygasły</ErrorTitle>
                    <ErrorMessage>Wygeneruj nowy link w ustawieniach CRM.</ErrorMessage>
                </ErrorWrap>
            </Container>
        );
    }

    const { screen, mode } = logic;

    return (
        <Container>

            {/* ── Screen 1: Home ──────────────────────────────────────────── */}
            {screen === 'home' && (
                <SplitLayout>
                    <SplitBtn $variant="dark" onClick={logic.goToLead} type="button" aria-label="Nowy lead">
                        <SplitIcon $variant="dark" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </SplitIcon>
                        <SplitLabel $variant="dark">Nowy Lead</SplitLabel>
                    </SplitBtn>

                    <SplitBtn $variant="light" onClick={logic.goToNote} type="button" aria-label="Notatka głosowa">
                        <SplitIcon $variant="light" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </SplitIcon>
                        <SplitLabel $variant="light">Notatka</SplitLabel>
                    </SplitBtn>
                </SplitLayout>
            )}

            {/* ── Screen 2: Phone number ───────────────────────────────────── */}
            {screen === 'phone' && (
                <ScreenBody>
                    <ScreenHeader>
                        <BackBtn onClick={logic.goBackFromPhone} type="button" aria-label="Wróć">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Wróć
                        </BackBtn>
                    </ScreenHeader>
                    <ScreenContent>
                        <ScreenTitle>Numer telefonu</ScreenTitle>
                        <FormField>
                            <FormLabel htmlFor="voice-phone">Numer klienta</FormLabel>
                            <PhoneInput
                                id="voice-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="+48 000 000 000"
                                value={logic.phoneNumber}
                                onChange={e => logic.setPhoneNumber(e.target.value)}
                                autoFocus
                            />
                        </FormField>
                    </ScreenContent>
                    <BottomBar>
                        <PrimaryBtn
                            type="button"
                            disabled={!logic.phoneNumber.trim()}
                            onClick={logic.nextPhone}
                        >
                            Dalej
                        </PrimaryBtn>
                        <SecondaryBtn type="button" onClick={logic.skipPhone}>
                            Pomiń
                        </SecondaryBtn>
                    </BottomBar>
                </ScreenBody>
            )}

            {/* ── Screen 3: Dictation ─────────────────────────────────────── */}
            {screen === 'dictate' && mode && (
                <ScreenBody>
                    <ScreenHeader>
                        <BackBtn onClick={logic.goBackFromDictate} type="button" aria-label="Wróć">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Wróć
                        </BackBtn>
                        <ModeBadge $mode={mode}>
                            {mode === 'lead' ? 'Lead' : 'Notatka'}
                        </ModeBadge>
                    </ScreenHeader>

                    {/* Microphone hero — shown only in recording mode */}
                    {logic.dictateState === 'recording' && (
                        <MicArea>
                            <MicRingWrap>
                                {!logic.hasPermissionError && (
                                    <>
                                        <MicRing />
                                        <MicRingOuter />
                                    </>
                                )}
                                <MicCircle $active={!logic.hasPermissionError}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                                        <path strokeLinecap="round" strokeLinejoin="round"
                                              d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                        <path strokeLinecap="round" strokeLinejoin="round"
                                              d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
                                        <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
                                    </svg>
                                </MicCircle>
                            </MicRingWrap>
                            <MicStatus $active={!logic.hasPermissionError}>
                                {logic.hasPermissionError ? 'Brak dostępu do mikrofonu' : 'Słucham...'}
                            </MicStatus>
                        </MicArea>
                    )}

                    <ScreenContent>
                        {logic.hasPermissionError && logic.dictateState === 'recording' && (
                            <PermissionError role="alert">
                                Zezwól na dostęp do mikrofonu w ustawieniach przeglądarki i odśwież stronę.
                            </PermissionError>
                        )}

                        {/* Recording mode: live transcript */}
                        {logic.dictateState === 'recording' && (
                            <TranscriptDisplay aria-live="polite" aria-label="Transkrypcja">
                                {!logic.finalText && !logic.interimText && (
                                    <Placeholder>Zacznij mówić — tekst pojawi się tutaj...</Placeholder>
                                )}
                                {logic.finalText}
                                {logic.interimText && (
                                    <InterimText>
                                        {logic.finalText ? ' ' : ''}{logic.interimText}
                                    </InterimText>
                                )}
                            </TranscriptDisplay>
                        )}

                        {/* Editing mode */}
                        {logic.dictateState === 'editing' && (
                            <>
                                <ScreenTitle>Sprawdź i wyślij</ScreenTitle>
                                <TranscriptTextarea
                                    value={logic.editableText}
                                    onChange={e => logic.setEditableText(e.target.value)}
                                    placeholder={
                                        logic.hasSpeechSupport
                                            ? 'Edytuj lub wpisz tekst...'
                                            : 'Wpisz tekst lub użyj dyktowania z klawiatury'
                                    }
                                    aria-label="Treść"
                                    autoFocus
                                />
                                <LinkBtn onClick={logic.restartDictation} type="button">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round"
                                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Dyktuj ponownie
                                </LinkBtn>
                            </>
                        )}
                    </ScreenContent>

                    <BottomBar>
                        <PrimaryBtn type="button" onClick={handleSubmitDictate}>
                            Gotowe
                        </PrimaryBtn>
                    </BottomBar>
                </ScreenBody>
            )}

            {/* ── Screen 4: Send / Confirmation ───────────────────────────── */}
            {screen === 'send' && (
                <ScreenBody>
                    {logic.sendStatus === 'error' && (
                        <ScreenHeader>
                            <BackBtn onClick={logic.goBackFromSend} type="button" aria-label="Wróć">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Wróć
                            </BackBtn>
                        </ScreenHeader>
                    )}

                    {logic.sendStatus === 'sending' && (
                        <SendBody>
                            <SpinnerSm />
                            <LoadingText>Wysyłanie...</LoadingText>
                        </SendBody>
                    )}

                    {logic.sendStatus === 'success' && (
                        <>
                            <SendBody>
                                <SendIconWrap $type="success" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </SendIconWrap>
                                <SendTitle>Zapisano!</SendTitle>
                                <SendMessage>Dane zostały dodane do systemu.</SendMessage>
                            </SendBody>
                            <BottomBar>
                                <PrimaryBtn type="button" onClick={logic.addAnother}>
                                    Dodaj kolejny
                                </PrimaryBtn>
                            </BottomBar>
                        </>
                    )}

                    {logic.sendStatus === 'error' && (
                        <>
                            <SendBody>
                                <SendIconWrap $type="error" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </SendIconWrap>
                                <SendTitle>Nie udało się wysłać</SendTitle>
                                <SendMessage>Sprawdź połączenie i spróbuj ponownie.</SendMessage>
                            </SendBody>
                            <BottomBar>
                                <PrimaryBtn type="button" onClick={logic.retrySubmit}>
                                    Spróbuj ponownie
                                </PrimaryBtn>
                                <SecondaryBtn type="button" onClick={logic.goBackFromSend}>
                                    Wróć
                                </SecondaryBtn>
                            </BottomBar>
                        </>
                    )}
                </ScreenBody>
            )}

            <Toast $visible={toastVisible} role="status" aria-live="polite">
                {toastText}
            </Toast>

        </Container>
    );
};
