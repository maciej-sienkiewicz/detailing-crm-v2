// src/modules/voice-commands/views/MobileVoiceCommandsView.tsx

import { useState, useRef, useEffect, useCallback } from 'react';
import { useVoiceCommandsLogic } from '../hooks/useVoiceCommandsLogic';
import {
    Container,
    LoadingWrap, Spinner, SpinnerSm, LoadingText,
    ErrorWrap, ErrorIconWrap, ErrorTitle, ErrorMessage,
    ScreenBody, ScreenContent, ScreenHeader, BackBtn, ModeBadge,
    HomeHeader, HomeGreeting, HomeSubtitle, TilesGrid, Tile, TileIcon, TileTitle, TileSubtitle,
    ScreenTitle,
    FormLabel, FormField, PhoneInput,
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

    // Toast state — purely UI, lives in the view
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
            : logic.finalText.trim();
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

    // ─── Error (invalid / expired token) ─────────────────────────────────────

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
                    <ErrorTitle>Link nieaktywny lub wygasły.</ErrorTitle>
                    <ErrorMessage>Wygeneruj nowy link w ustawieniach CRM.</ErrorMessage>
                </ErrorWrap>
            </Container>
        );
    }

    // ─── Active session ───────────────────────────────────────────────────────

    const { screen, mode } = logic;

    return (
        <Container>

            {/* ── Screen 1: Home ──────────────────────────────────────────── */}
            {screen === 'home' && (
                <ScreenBody>
                    <HomeHeader>
                        <HomeGreeting>Cześć, {logic.firstName}!</HomeGreeting>
                        <HomeSubtitle>Co chcesz zrobić?</HomeSubtitle>
                    </HomeHeader>
                    <TilesGrid>
                        <Tile $mode="lead" onClick={logic.goToLead} type="button"
                              aria-label="Nowy lead — zapisz rozmowę z klientem">
                            <TileIcon $mode="lead" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </TileIcon>
                            <TileTitle>NOWY LEAD</TileTitle>
                            <TileSubtitle>Zapisz rozmowę z klientem</TileSubtitle>
                        </Tile>

                        <Tile $mode="note" onClick={logic.goToNote} type="button"
                              aria-label="Notatka — szybka notatka głosowa">
                            <TileIcon $mode="note" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </TileIcon>
                            <TileTitle>NOTATKA</TileTitle>
                            <TileSubtitle>Szybka notatka głosowa</TileSubtitle>
                        </Tile>
                    </TilesGrid>
                </ScreenBody>
            )}

            {/* ── Screen 2: Phone number (lead only) ──────────────────────── */}
            {screen === 'phone' && (
                <ScreenBody>
                    <ScreenHeader>
                        <BackBtn onClick={logic.goBackFromPhone} type="button" aria-label="Wróć">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Wróć
                        </BackBtn>
                    </ScreenHeader>
                    <ScreenContent>
                        <ScreenTitle>Numer telefonu klienta</ScreenTitle>
                        <FormField>
                            <FormLabel htmlFor="voice-phone">Numer telefonu</FormLabel>
                            <PhoneInput
                                id="voice-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="+48 ..."
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
                            DALEJ
                        </PrimaryBtn>
                        <SecondaryBtn type="button" onClick={logic.skipPhone}>
                            POMIŃ
                        </SecondaryBtn>
                    </BottomBar>
                </ScreenBody>
            )}

            {/* ── Screen 3: Dictation ─────────────────────────────────────── */}
            {screen === 'dictate' && mode && (
                <ScreenBody>
                    <ScreenHeader>
                        <BackBtn onClick={logic.goBackFromDictate} type="button" aria-label="Wróć">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Wróć
                        </BackBtn>
                        <ModeBadge $mode={mode}>
                            {mode === 'lead' ? 'Lead' : 'Notatka'}
                        </ModeBadge>
                    </ScreenHeader>
                    <ScreenContent>
                        <ScreenTitle $recording={logic.dictateState === 'recording'}>
                            {logic.dictateState === 'recording' ? 'Mów teraz...' : 'Sprawdź i wyślij'}
                        </ScreenTitle>

                        {logic.hasPermissionError && (
                            <PermissionError role="alert">
                                Brak dostępu do mikrofonu. Zezwól na mikrofon w ustawieniach
                                przeglądarki i spróbuj ponownie.
                            </PermissionError>
                        )}

                        {/* Recording mode: read-only display with interim text */}
                        {logic.dictateState === 'recording' && (
                            <TranscriptDisplay aria-live="polite" aria-label="Transkrypcja">
                                {!logic.finalText && !logic.interimText && (
                                    <Placeholder>Słucham...</Placeholder>
                                )}
                                {logic.finalText}
                                {logic.interimText && (
                                    <InterimText>
                                        {logic.finalText ? ' ' : ''}{logic.interimText}
                                    </InterimText>
                                )}
                            </TranscriptDisplay>
                        )}

                        {/* Editing mode: editable textarea */}
                        {logic.dictateState === 'editing' && (
                            <TranscriptTextarea
                                value={logic.editableText}
                                onChange={e => logic.setEditableText(e.target.value)}
                                placeholder={
                                    logic.hasSpeechSupport
                                        ? 'Napisz lub edytuj tekst...'
                                        : 'Wpisz tekst lub użyj dyktowania z klawiatury'
                                }
                                aria-label="Treść"
                                autoFocus
                            />
                        )}

                        {logic.dictateState === 'editing' && (
                            <LinkBtn onClick={logic.restartDictation} type="button">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Dyktuj ponownie
                            </LinkBtn>
                        )}
                    </ScreenContent>
                    <BottomBar>
                        <PrimaryBtn type="button" onClick={handleSubmitDictate}>
                            GOTOWE
                        </PrimaryBtn>
                    </BottomBar>
                </ScreenBody>
            )}

            {/* ── Screen 4: Send / Confirmation ───────────────────────────── */}
            {screen === 'send' && (
                <ScreenBody>
                    {logic.sendStatus === 'error' && (
                        <ScreenHeader>
                            <BackBtn onClick={logic.goBackFromSend} type="button" aria-label="Wróć do dyktowania">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Wróć
                            </BackBtn>
                        </ScreenHeader>
                    )}

                    {/* Sending */}
                    {logic.sendStatus === 'sending' && (
                        <SendBody>
                            <SpinnerSm />
                            <LoadingText>Wysyłanie...</LoadingText>
                        </SendBody>
                    )}

                    {/* Success */}
                    {logic.sendStatus === 'success' && (
                        <>
                            <SendBody>
                                <SendIconWrap $type="success" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </SendIconWrap>
                                <SendTitle>Wysłano!</SendTitle>
                            </SendBody>
                            <BottomBar>
                                <PrimaryBtn type="button" onClick={logic.addAnother}>
                                    Dodaj kolejny
                                </PrimaryBtn>
                            </BottomBar>
                        </>
                    )}

                    {/* Error */}
                    {logic.sendStatus === 'error' && (
                        <>
                            <SendBody>
                                <SendIconWrap $type="error" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </SendIconWrap>
                                <SendTitle>Nie udało się wysłać.</SendTitle>
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

            {/* ── Toast ───────────────────────────────────────────────────── */}
            <Toast $visible={toastVisible} role="status" aria-live="polite">
                {toastText}
            </Toast>

        </Container>
    );
};
