// src/modules/voice-commands/hooks/useVoiceCommandsLogic.ts

import { useState, useRef, useEffect, useCallback } from 'react';
import { voiceCommandsApi } from '../api/voiceCommandsApi';
import type { VoiceMode, VoiceScreen, DictateState, SendStatus, SessionState } from '../types';

const SILENCE_TIMEOUT_MS = 3000;
const RESTART_DELAY_MS = 150;
const MAX_AUTO_RESTARTS = 10;

declare global {
    interface Window {
        webkitSpeechRecognition: typeof SpeechRecognition;
    }
}

export interface VoiceCommandsLogic {
    sessionState: SessionState;
    firstName: string;
    screen: VoiceScreen;
    mode: VoiceMode | null;
    phoneNumber: string;
    setPhoneNumber: (v: string) => void;
    dictateState: DictateState;
    finalText: string;
    interimText: string;
    editableText: string;
    setEditableText: (v: string) => void;
    hasPermissionError: boolean;
    hasSpeechSupport: boolean;
    sendStatus: SendStatus | null;
    goToLead: () => void;
    goToNote: () => void;
    goBackFromPhone: () => void;
    nextPhone: () => void;
    skipPhone: () => void;
    goBackFromDictate: () => void;
    submitDictate: () => void;
    restartDictation: () => void;
    retrySubmit: () => void;
    goBackFromSend: () => void;
    addAnother: () => void;
}

export function useVoiceCommandsLogic(token: string): VoiceCommandsLogic {
    // ─── Session ──────────────────────────────────────────────────────────────
    const [sessionState, setSessionState] = useState<SessionState>('loading');
    const [firstName, setFirstName] = useState('');

    // ─── Navigation ───────────────────────────────────────────────────────────
    const [screen, setScreen] = useState<VoiceScreen>('home');
    const [mode, setMode] = useState<VoiceMode | null>(null);

    // ─── Phone ────────────────────────────────────────────────────────────────
    const [phoneNumber, setPhoneNumber] = useState('');

    // ─── Dictate ──────────────────────────────────────────────────────────────
    const [dictateState, setDictateState] = useState<DictateState>('recording');
    const [finalText, setFinalText] = useState('');
    const [interimText, setInterimText] = useState('');
    const [editableText, setEditableText] = useState('');
    const [hasPermissionError, setHasPermissionError] = useState(false);

    // ─── Send ─────────────────────────────────────────────────────────────────
    const [sendStatus, setSendStatus] = useState<SendStatus | null>(null);

    // ─── Refs ─────────────────────────────────────────────────────────────────
    // Recognizer instance — null means we DON'T want it running
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    // Timers
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Desired state flag — false means any active recognition should not restart
    const activeRef = useRef(false);
    // Auto-restart counter: reset on successful speech, cap at MAX_AUTO_RESTARTS
    const restartCountRef = useRef(0);
    // Accumulated text from completed sessions (survives session restarts)
    const accumulatedTextRef = useRef('');
    // Mirrors of state values for safe access inside SR callbacks
    const finalTextRef = useRef('');       // accumulated + this session's finals
    const interimTextRef = useRef('');     // current unconfirmed interim text
    const editableTextRef = useRef('');
    const modeRef = useRef<VoiceMode | null>(null);
    const phoneRef = useRef<string | null>(null);
    const dictateStateRef = useRef<DictateState>('recording');
    const submittedTextRef = useRef('');
    const tokenRef = useRef(token);
    tokenRef.current = token;

    const hasSpeechSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    // ─── Init: validate token ─────────────────────────────────────────────────
    useEffect(() => {
        if (!token) { setSessionState('error'); return; }
        voiceCommandsApi.getContext(token)
            .then(ctx => { setFirstName(ctx.firstName); setSessionState('active'); })
            .catch(() => setSessionState('error'));
    }, [token]);

    // ─── Cleanup on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            activeRef.current = false;
            if (silenceTimerRef.current !== null) clearTimeout(silenceTimerRef.current);
            if (restartTimerRef.current !== null) clearTimeout(restartTimerRef.current);
            const r = recognitionRef.current;
            recognitionRef.current = null;
            if (r) try { r.abort(); } catch { /* noop */ }
        };
    }, []);

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function clearSilenceTimer() {
        if (silenceTimerRef.current !== null) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    }

    function clearRestartTimer() {
        if (restartTimerRef.current !== null) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
    }

    // Joins two text segments, adding a space separator when needed.
    function joinText(prev: string, next: string): string {
        if (!prev) return next;
        if (!next) return prev;
        return /\s$/.test(prev) || /^\s/.test(next) ? prev + next : `${prev} ${next}`;
    }

    // Stops recognition and clears all pending timers.
    // Sets recognitionRef to null BEFORE aborting so that the onend guard
    // correctly detects a stale session and does not restart.
    function stopCurrentRecognition() {
        activeRef.current = false;
        clearSilenceTimer();
        clearRestartTimer();
        const r = recognitionRef.current;
        recognitionRef.current = null;
        if (r) try { r.abort(); } catch { /* noop */ }
    }

    // Transitions from recording → editing mode.
    // Stops recognition via the same null-before-abort pattern.
    function enterEditMode() {
        activeRef.current = false;
        clearSilenceTimer();
        clearRestartTimer();
        const r = recognitionRef.current;
        recognitionRef.current = null;
        if (r) try { r.abort(); } catch { /* noop */ }

        dictateStateRef.current = 'editing';
        setDictateState('editing');
        interimTextRef.current = '';
        setInterimText('');
        // finalTextRef already includes accumulated, but if the session ended
        // while speech was only interim, fall back to what accumulatedTextRef has.
        const textToEdit = finalTextRef.current || accumulatedTextRef.current;
        editableTextRef.current = textToEdit;
        setEditableText(textToEdit);
    }

    // Resets the 3-second silence timer. Called on every speech event.
    // The timer is NOT started until the user actually speaks.
    function resetSilenceTimer() {
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            enterEditMode();
        }, SILENCE_TIMEOUT_MS);
    }

    // Creates and starts a new SpeechRecognition session WITHOUT resetting
    // accumulated text. Called both for fresh starts (via startRecognition)
    // and for auto-restart after a session ends unexpectedly.
    function createRecognitionSession() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR || !activeRef.current) return;

        const recognition = new SR() as SpeechRecognition;
        recognition.lang = 'pl-PL';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            if (!activeRef.current) return;

            // Rebuild session's final text from the full cumulative result list.
            // Iterating from 0 is correct: event.results is the complete session list.
            let sessionFinal = '';
            let interim = '';
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    sessionFinal += event.results[i][0].transcript;
                } else {
                    interim = event.results[i][0].transcript;
                }
            }

            const total = joinText(accumulatedTextRef.current, sessionFinal);
            finalTextRef.current = total;
            interimTextRef.current = interim;
            setFinalText(total);
            setInterimText(interim);

            // Silence timer starts only after first speech, reset on each new result.
            if (sessionFinal || interim) {
                restartCountRef.current = 0; // successful speech — reset failure counter
                resetSilenceTimer();
            }
        };

        recognition.onend = () => {
            // Stale guard: if this isn't the current registered instance, ignore.
            if (recognitionRef.current !== recognition) return;
            if (!activeRef.current) return;

            // Snapshot the best text available before restarting.
            // If the session ended while speech was still interim (not yet committed
            // as final), finalTextRef equals the previous accumulated value and
            // interimTextRef holds the unconfirmed text — include it so it's not lost.
            const snapshot = joinText(finalTextRef.current, interimTextRef.current);
            if (snapshot) accumulatedTextRef.current = snapshot;
            interimTextRef.current = '';

            restartCountRef.current++;
            if (restartCountRef.current > MAX_AUTO_RESTARTS) {
                // Too many consecutive failures — fall back to edit mode.
                enterEditMode();
                return;
            }

            // Delay before restart to avoid InvalidStateError on immediate start().
            clearRestartTimer();
            restartTimerRef.current = setTimeout(() => {
                restartTimerRef.current = null;
                if (activeRef.current) createRecognitionSession();
            }, RESTART_DELAY_MS);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            switch (event.error) {
                case 'not-allowed':
                case 'service-not-allowed':
                    // Hard failure — user denied microphone. Stop and surface error.
                    activeRef.current = false;
                    setHasPermissionError(true);
                    enterEditMode();
                    break;
                case 'aborted':
                    // We triggered this abort ourselves; onend will not restart (activeRef=false).
                    break;
                default:
                    // 'no-speech', 'network', 'audio-capture', etc.
                    // These are recoverable — onend handler will schedule a restart.
                    break;
            }
        };

        try {
            recognition.start();
        } catch {
            // start() can throw if another session is still tearing down.
            // Schedule a retry with a longer delay.
            clearRestartTimer();
            restartTimerRef.current = setTimeout(() => {
                restartTimerRef.current = null;
                if (activeRef.current) createRecognitionSession();
            }, RESTART_DELAY_MS * 2);
        }
    }

    // Full reset: clears all accumulated text and starts a fresh dictation session.
    function startRecognition() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            // Browser has no speech API — go straight to manual editing.
            dictateStateRef.current = 'editing';
            setDictateState('editing');
            return;
        }

        stopCurrentRecognition();

        // Reset all transcription state
        accumulatedTextRef.current = '';
        finalTextRef.current = '';
        interimTextRef.current = '';
        editableTextRef.current = '';
        dictateStateRef.current = 'recording';
        restartCountRef.current = 0;

        setFinalText('');
        setInterimText('');
        setEditableText('');
        setDictateState('recording');
        setHasPermissionError(false);

        // Mark active BEFORE creating the session so onend logic can check it.
        activeRef.current = true;
        createRecognitionSession();
    }

    // ─── Send ─────────────────────────────────────────────────────────────────

    const doSend = useCallback(async (text: string) => {
        submittedTextRef.current = text;
        setSendStatus('sending');
        try {
            if (modeRef.current === 'lead') {
                await voiceCommandsApi.createLead({
                    token: tokenRef.current,
                    phoneNumber: phoneRef.current,
                    text,
                });
            } else {
                await voiceCommandsApi.createNote({
                    token: tokenRef.current,
                    text,
                });
            }
            setSendStatus('success');
        } catch {
            setSendStatus('error');
        }
    }, []);

    // ─── Navigation actions ───────────────────────────────────────────────────

    const goToLead = useCallback(() => {
        modeRef.current = 'lead';
        phoneRef.current = null;
        setMode('lead');
        setPhoneNumber('');
        setScreen('phone');
    }, []);

    const goToNote = useCallback(() => {
        modeRef.current = 'note';
        phoneRef.current = null;
        setMode('note');
        setScreen('dictate');
        startRecognition(); // user-gesture context ✓
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const goBackFromPhone = useCallback(() => {
        setPhoneNumber('');
        setScreen('home');
    }, []);

    const nextPhone = useCallback(() => {
        phoneRef.current = phoneNumber.trim() || null;
        setScreen('dictate');
        startRecognition(); // user-gesture context ✓
    }, [phoneNumber]); // eslint-disable-line react-hooks/exhaustive-deps

    const skipPhone = useCallback(() => {
        phoneRef.current = null;
        setScreen('dictate');
        startRecognition(); // user-gesture context ✓
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const goBackFromDictate = useCallback(() => {
        stopCurrentRecognition(); // eslint-disable-line react-hooks/exhaustive-deps
        setScreen(modeRef.current === 'lead' ? 'phone' : 'home');
    }, []);

    const submitDictate = useCallback(() => {
        let text: string;
        if (dictateStateRef.current === 'editing') {
            text = editableTextRef.current.trim();
        } else {
            // In recording mode, include interim text in case user taps DONE
            // before the browser commits the last phrase as final.
            text = joinText(finalTextRef.current, interimTextRef.current).trim()
                || accumulatedTextRef.current.trim();
        }
        if (!text) return;
        stopCurrentRecognition(); // eslint-disable-line react-hooks/exhaustive-deps
        setScreen('send');
        doSend(text);
    }, [doSend]); // eslint-disable-line react-hooks/exhaustive-deps

    const restartDictation = useCallback(() => {
        startRecognition(); // user-gesture context ✓
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const retrySubmit = useCallback(() => {
        doSend(submittedTextRef.current);
    }, [doSend]);

    const goBackFromSend = useCallback(() => {
        setScreen('dictate');
    }, []);

    const addAnother = useCallback(() => {
        modeRef.current = null;
        phoneRef.current = null;
        finalTextRef.current = '';
        interimTextRef.current = '';
        editableTextRef.current = '';
        accumulatedTextRef.current = '';
        submittedTextRef.current = '';
        setMode(null);
        setPhoneNumber('');
        setFinalText('');
        setInterimText('');
        setEditableText('');
        setSendStatus(null);
        setScreen('home');
    }, []);

    const setEditableTextWithRef = useCallback((v: string) => {
        editableTextRef.current = v;
        setEditableText(v);
    }, []);

    return {
        sessionState,
        firstName,
        screen,
        mode,
        phoneNumber,
        setPhoneNumber,
        dictateState,
        finalText,
        interimText,
        editableText,
        setEditableText: setEditableTextWithRef,
        hasPermissionError,
        hasSpeechSupport,
        sendStatus,
        goToLead,
        goToNote,
        goBackFromPhone,
        nextPhone,
        skipPhone,
        goBackFromDictate,
        submitDictate,
        restartDictation,
        retrySubmit,
        goBackFromSend,
        addAnother,
    };
}
