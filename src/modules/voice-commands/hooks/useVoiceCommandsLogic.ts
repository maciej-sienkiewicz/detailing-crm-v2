// src/modules/voice-commands/hooks/useVoiceCommandsLogic.ts

import { useState, useRef, useEffect, useCallback } from 'react';
import { voiceCommandsApi } from '../api/voiceCommandsApi';
import type { VoiceMode, VoiceScreen, RecordingState, SendStatus, SessionState } from '../types';

function pickMimeType(): string {
    const candidates = [
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg',
    ];
    for (const t of candidates) {
        if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
}

export interface VoiceCommandsLogic {
    sessionState: SessionState;
    firstName: string;
    screen: VoiceScreen;
    mode: VoiceMode | null;
    phoneNumber: string;
    setPhoneNumber: (v: string) => void;
    recordingState: RecordingState;
    recordingSeconds: number;
    sendStatus: SendStatus | null;
    goToLead: () => void;
    goToNote: () => void;
    goBackFromPhone: () => void;
    nextPhone: () => void;
    skipPhone: () => void;
    goBackFromDictate: () => void;
    stopAndSend: () => void;
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

    // ─── Recording ────────────────────────────────────────────────────────────
    const [recordingState, setRecordingState] = useState<RecordingState>('requesting');
    const [recordingSeconds, setRecordingSeconds] = useState(0);

    // ─── Send ─────────────────────────────────────────────────────────────────
    const [sendStatus, setSendStatus] = useState<SendStatus | null>(null);

    // ─── Refs ─────────────────────────────────────────────────────────────────
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mimeTypeRef = useRef('');
    const submittedBlobRef = useRef<Blob | null>(null);
    const modeRef = useRef<VoiceMode | null>(null);
    const phoneRef = useRef<string | null>(null);
    const tokenRef = useRef(token);
    tokenRef.current = token;

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
            stopTimer();
            releaseStream();
        };
    }, []);

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function stopTimer() {
        if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }

    function releaseStream() {
        const mr = mediaRecorderRef.current;
        if (mr && mr.state !== 'inactive') {
            try { mr.stop(); } catch { /* noop */ }
        }
        mediaRecorderRef.current = null;

        const stream = streamRef.current;
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }

    async function beginRecording() {
        setRecordingState('requesting');
        setRecordingSeconds(0);
        chunksRef.current = [];

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            setRecordingState('error');
            return;
        }

        streamRef.current = stream;

        const mimeType = pickMimeType();
        mimeTypeRef.current = mimeType;

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e: BlobEvent) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.start(250);
        setRecordingState('recording');

        timerRef.current = setInterval(() => {
            setRecordingSeconds(s => s + 1);
        }, 1000);
    }

    // ─── Send ─────────────────────────────────────────────────────────────────

    const doSend = useCallback(async (blob: Blob, mimeType: string) => {
        submittedBlobRef.current = blob;
        setSendStatus('sending');
        try {
            if (modeRef.current === 'lead') {
                await voiceCommandsApi.createLead({
                    token: tokenRef.current,
                    audioBlob: blob,
                    mimeType,
                    phoneNumber: phoneRef.current,
                });
            } else {
                await voiceCommandsApi.createNote({
                    token: tokenRef.current,
                    audioBlob: blob,
                    mimeType,
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
        beginRecording(); // user-gesture context ✓
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const goBackFromPhone = useCallback(() => {
        setPhoneNumber('');
        setScreen('home');
    }, []);

    const nextPhone = useCallback(() => {
        phoneRef.current = phoneNumber.trim() || null;
        setScreen('dictate');
        beginRecording(); // user-gesture context ✓
    }, [phoneNumber]); // eslint-disable-line react-hooks/exhaustive-deps

    const skipPhone = useCallback(() => {
        phoneRef.current = null;
        setScreen('dictate');
        beginRecording(); // user-gesture context ✓
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const goBackFromDictate = useCallback(() => {
        stopTimer();
        releaseStream();
        setScreen(modeRef.current === 'lead' ? 'phone' : 'home');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const stopAndSend = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') return;

        stopTimer();
        const mimeType = mimeTypeRef.current || recorder.mimeType || 'audio/webm';

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            releaseStream();
            setScreen('send');
            doSend(blob, mimeType);
        };

        try {
            recorder.stop();
        } catch {
            // If stop() fails, still try to send accumulated chunks
            const blob = new Blob(chunksRef.current, { type: mimeType });
            releaseStream();
            setScreen('send');
            doSend(blob, mimeType);
        }
    }, [doSend]); // eslint-disable-line react-hooks/exhaustive-deps

    const retrySubmit = useCallback(() => {
        const blob = submittedBlobRef.current;
        if (!blob) return;
        doSend(blob, mimeTypeRef.current || 'audio/webm');
    }, [doSend]);

    const goBackFromSend = useCallback(() => {
        setScreen('dictate');
        beginRecording();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const addAnother = useCallback(() => {
        modeRef.current = null;
        phoneRef.current = null;
        submittedBlobRef.current = null;
        chunksRef.current = [];
        setMode(null);
        setPhoneNumber('');
        setSendStatus(null);
        setRecordingSeconds(0);
        setScreen('home');
    }, []);

    const setPhoneNumberWithRef = useCallback((v: string) => {
        setPhoneNumber(v);
    }, []);

    return {
        sessionState,
        firstName,
        screen,
        mode,
        phoneNumber,
        setPhoneNumber: setPhoneNumberWithRef,
        recordingState,
        recordingSeconds,
        sendStatus,
        goToLead,
        goToNote,
        goBackFromPhone,
        nextPhone,
        skipPhone,
        goBackFromDictate,
        stopAndSend,
        retrySubmit,
        goBackFromSend,
        addAnother,
    };
}
