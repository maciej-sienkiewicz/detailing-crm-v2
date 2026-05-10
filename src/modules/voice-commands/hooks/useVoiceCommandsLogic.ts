// src/modules/voice-commands/hooks/useVoiceCommandsLogic.ts

import { useState, useRef, useEffect, useCallback } from 'react';
import { voiceCommandsApi } from '../api/voiceCommandsApi';
import type { VoiceMode, VoiceScreen, DictateState, SendStatus, SessionState } from '../types';

const SILENCE_TIMEOUT_MS = 3000;

// Extend Window for webkit-prefixed API
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

    // ─── Refs — avoids stale closures in SpeechRecognition callbacks ──────────
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const silenceExpiredRef = useRef(false);
    const finalTextRef = useRef('');
    const submittedTextRef = useRef('');
    // Mirrors for values needed in stable callbacks
    const tokenRef = useRef(token);
    const modeRef = useRef<VoiceMode | null>(null);
    const phoneRef = useRef<string | null>(null);
    const dictateStateRef = useRef<DictateState>('recording');
    const editableTextRef = useRef('');

    tokenRef.current = token;

    const hasSpeechSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

    // ─── Init: validate token ─────────────────────────────────────────────────
    useEffect(() => {
        if (!token) {
            setSessionState('error');
            return;
        }
        voiceCommandsApi.getContext(token)
            .then(ctx => {
                setFirstName(ctx.firstName);
                setSessionState('active');
            })
            .catch(() => setSessionState('error'));
    }, [token]);

    // ─── Cleanup on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        return () => { stopCurrentRecognition(); }; // eslint-disable-line react-hooks/exhaustive-deps
    }, []);

    // ─── Recognition helpers (only use refs + stable setters — safe in closures) ─

    function clearSilenceTimer() {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    }

    function stopCurrentRecognition() {
        clearSilenceTimer();
        if (recognitionRef.current) {
            silenceExpiredRef.current = true;
            try { recognitionRef.current.abort(); } catch { /* noop */ }
            recognitionRef.current = null;
        }
    }

    function enterEditMode() {
        clearSilenceTimer();
        dictateStateRef.current = 'editing';
        setDictateState('editing');
        setInterimText('');
        editableTextRef.current = finalTextRef.current;
        setEditableText(finalTextRef.current);
    }

    function resetSilenceTimer() {
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
            silenceExpiredRef.current = true;
            enterEditMode();
        }, SILENCE_TIMEOUT_MS);
    }

    function startRecognition() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SR) {
            dictateStateRef.current = 'editing';
            setDictateState('editing');
            return;
        }

        // Reset transcription state
        finalTextRef.current = '';
        silenceExpiredRef.current = false;
        setFinalText('');
        setInterimText('');
        setEditableText('');
        editableTextRef.current = '';
        dictateStateRef.current = 'recording';
        setDictateState('recording');
        setHasPermissionError(false);

        // Abort any in-flight session
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch { /* noop */ }
        }

        const recognition = new SR() as SpeechRecognition;
        recognition.lang = 'pl-PL';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognitionRef.current = recognition;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let final = '';
            let interim = '';
            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                    resetSilenceTimer();
                } else {
                    interim = event.results[i][0].transcript;
                }
            }
            finalTextRef.current = final;
            setFinalText(final);
            setInterimText(interim);
        };

        recognition.onend = () => {
            // Only restart if this specific instance ended and silence hasn't expired
            if (!silenceExpiredRef.current && recognitionRef.current === recognition) {
                try { recognition.start(); } catch { /* noop */ }
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setHasPermissionError(true);
                silenceExpiredRef.current = true;
                enterEditMode();
            }
            // Other errors: let onend handle the restart
        };

        resetSilenceTimer();
        try { recognition.start(); } catch { /* noop */ }
    }

    // ─── Shared submit logic ──────────────────────────────────────────────────

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
        startRecognition(); // called in user-gesture context (onClick) ✓
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const goBackFromPhone = useCallback(() => {
        setPhoneNumber('');
        setScreen('home');
    }, []);

    const nextPhone = useCallback(() => {
        phoneRef.current = phoneNumber.trim() || null;
        setScreen('dictate');
        startRecognition(); // called in user-gesture context (onClick) ✓
    }, [phoneNumber]); // eslint-disable-line react-hooks/exhaustive-deps

    const skipPhone = useCallback(() => {
        phoneRef.current = null;
        setScreen('dictate');
        startRecognition(); // called in user-gesture context (onClick) ✓
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const goBackFromDictate = useCallback(() => {
        stopCurrentRecognition(); // eslint-disable-line react-hooks/exhaustive-deps
        if (modeRef.current === 'lead') {
            setScreen('phone');
        } else {
            setScreen('home');
        }
    }, []);

    const submitDictate = useCallback(() => {
        const text = dictateStateRef.current === 'editing'
            ? editableTextRef.current.trim()
            : finalTextRef.current.trim();
        if (!text) return;
        stopCurrentRecognition(); // eslint-disable-line react-hooks/exhaustive-deps
        setScreen('send');
        doSend(text);
    }, [doSend]);

    const restartDictation = useCallback(() => {
        stopCurrentRecognition(); // eslint-disable-line react-hooks/exhaustive-deps
        startRecognition(); // called in user-gesture context (onClick) ✓
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const retrySubmit = useCallback(() => {
        setSendStatus('sending');
        doSend(submittedTextRef.current);
    }, [doSend]);

    const goBackFromSend = useCallback(() => {
        setScreen('dictate');
    }, []);

    const addAnother = useCallback(() => {
        modeRef.current = null;
        phoneRef.current = null;
        finalTextRef.current = '';
        submittedTextRef.current = '';
        setMode(null);
        setPhoneNumber('');
        setFinalText('');
        setInterimText('');
        setEditableText('');
        setSendStatus(null);
        setScreen('home');
    }, []);

    // ─── Keep ref mirrors in sync with state for stable callback access ───────
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
