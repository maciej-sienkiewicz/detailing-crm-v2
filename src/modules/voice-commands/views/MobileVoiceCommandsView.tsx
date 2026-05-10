// src/modules/voice-commands/views/MobileVoiceCommandsView.tsx

import { useVoiceCommandsLogic } from '../hooks/useVoiceCommandsLogic';
import {
    Container,
    LoadingWrap, Spinner, SpinnerSm, LoadingText,
    ErrorWrap, ErrorIconWrap, ErrorTitle, ErrorMessage,
    ScreenBody, ScreenContent, ScreenHeader, BackBtn, ModeBadge,
    FloatLayout, FloatCard, FloatIcon, FloatLabel,
    ScreenTitle,
    FormLabel, FormField, PhoneInput,
    MicArea, MicRingWrap, MicRing, MicRingOuter, MicCircle, MicStatus,
    RecordingTimer,
    PermissionError,
    PrimaryBtn, SecondaryBtn,
    BottomBar,
    SendBody, SendIconWrap, SendTitle, SendMessage,
    Toast,
} from './mobile/VoiceCommands.styles';

interface Props {
    token: string;
}

function formatSeconds(s: number): string {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
}

export const MobileVoiceCommandsView = ({ token }: Props) => {
    const logic = useVoiceCommandsLogic(token);

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
                <FloatLayout>
                    <FloatCard $accent="blue" onClick={logic.goToLead} type="button" aria-label="Nowy lead">
                        <FloatIcon $accent="blue" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="7" r="4" />
                                <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8H4z" />
                            </svg>
                        </FloatIcon>
                        <FloatLabel>Nowy Lead</FloatLabel>
                    </FloatCard>

                    <FloatCard $accent="violet" onClick={logic.goToNote} type="button" aria-label="Notatka głosowa">
                        <FloatIcon $accent="violet" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <rect x="9" y="2" width="6" height="12" rx="3" />
                                <path d="M5 11a7 7 0 0014 0h-2a5 5 0 01-10 0H5z" />
                                <rect x="11" y="19" width="2" height="3" />
                                <rect x="8" y="22" width="8" height="2" rx="1" />
                            </svg>
                        </FloatIcon>
                        <FloatLabel>Notatka</FloatLabel>
                    </FloatCard>
                </FloatLayout>
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

            {/* ── Screen 3: Recording ─────────────────────────────────────── */}
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

                    <MicArea>
                        <MicRingWrap>
                            {logic.recordingState === 'recording' && (
                                <>
                                    <MicRing />
                                    <MicRingOuter />
                                </>
                            )}
                            <MicCircle $active={logic.recordingState === 'recording'}>
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

                        <RecordingTimer aria-live="polite" aria-label="Czas nagrania">
                            {formatSeconds(logic.recordingSeconds)}
                        </RecordingTimer>

                        <MicStatus $active={logic.recordingState === 'recording'}>
                            {logic.recordingState === 'requesting' && 'Oczekiwanie na mikrofon...'}
                            {logic.recordingState === 'recording' && 'Nagrywanie...'}
                            {logic.recordingState === 'error' && 'Brak dostępu do mikrofonu'}
                        </MicStatus>
                    </MicArea>

                    <ScreenContent>
                        {logic.recordingState === 'error' && (
                            <PermissionError role="alert">
                                Zezwól na dostęp do mikrofonu w ustawieniach przeglądarki i odśwież stronę.
                            </PermissionError>
                        )}
                    </ScreenContent>

                    <BottomBar>
                        <PrimaryBtn
                            type="button"
                            disabled={logic.recordingState !== 'recording'}
                            onClick={logic.stopAndSend}
                        >
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

            {/* Toast is kept for potential future use but currently unused */}
            <Toast $visible={false} role="status" aria-live="polite" />

        </Container>
    );
};
