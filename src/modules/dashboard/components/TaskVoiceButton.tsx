import { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Loader2, Mic, Square } from 'lucide-react';
import { useToast } from '@/common/components/Toast';

// Dyktowanie zadania: nagranie leci na serwer, tam Whisper zamienia je w treść
// i tworzy zadanie. Przycisk ma trzy stany - gotowy, nagrywa (z licznikiem),
// wysyła - i nigdy nie zostawia otwartego strumienia z mikrofonu.

const MAX_SECONDS = 120;

const CONTAINERS = [
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg',
];

const pickMimeType = (): string => {
  if (typeof MediaRecorder === 'undefined') return '';
  return CONTAINERS.find(type => MediaRecorder.isTypeSupported(type)) ?? '';
};

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45); }
  70%      { box-shadow: 0 0 0 7px rgba(220, 38, 38, 0); }
`;

const Button = styled.button<{ $recording: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 150ms ease, color 150ms ease;

  background: ${p => (p.$recording ? '#dc2626' : '#f1f5f9')};
  color: ${p => (p.$recording ? '#fff' : '#64748b')};
  ${p => p.$recording && `animation: ${pulse.getName()} 1.6s infinite;`}

  &:hover:not(:disabled) {
    background: ${p => (p.$recording ? '#b91c1c' : '#e2e8f0')};
    color: ${p => (p.$recording ? '#fff' : '#374151')};
  }

  &:disabled { opacity: 0.6; cursor: not-allowed; }

  svg { width: 13px; height: 13px; stroke-width: 2; flex-shrink: 0; }

  /* Trwa nagranie albo wysyłka - wtedy licznik/status musi być widoczny,
     więc etykietę chowamy tylko w stanie spoczynku. */
  @media (max-width: 639px) {
    padding: 7px 9px;
    gap: ${p => (p.$recording ? '5px' : '0')};
    svg { width: 15px; height: 15px; }
  }
`;

const Label = styled.span<{ $alwaysVisible: boolean }>`
  @media (max-width: 639px) {
    display: ${p => (p.$alwaysVisible ? 'inline' : 'none')};
  }
`;

const Spinner = styled(Loader2)`
  animation: spin 900ms linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const formatSeconds = (total: number): string => {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

interface TaskVoiceButtonProps {
  /** Wysyła nagranie na serwer; odrzucenie obietnicy pokazuje komunikat błędu. */
  onRecorded: (audioBlob: Blob, mimeType: string) => Promise<unknown>;
  isSending: boolean;
}

export const TaskVoiceButton = ({ onRecorded, isSending }: TaskVoiceButtonProps) => {
  const { showError, showSuccess } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Zatrzymanie recordera jest asynchroniczne: bez tego odmontowanie w trakcie
  // nagrywania wysłałoby nagranie z komponentu, którego już nie ma.
  const abandonedRef = useRef(false);

  const releaseStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => () => {
    abandonedRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch { /* strumień i tak zaraz zamykamy */ }
    }
    releaseStream();
  }, [releaseStream]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showError('Nagrywanie niedostępne', 'Ta przeglądarka nie pozwala nagrywać dźwięku.');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      showError('Brak dostępu do mikrofonu', 'Zezwól na mikrofon w ustawieniach przeglądarki.');
      return;
    }

    if (abandonedRef.current) {
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    mimeRef.current = pickMimeType();

    const recorder = new MediaRecorder(stream, mimeRef.current ? { mimeType: mimeRef.current } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const mimeType = mimeRef.current || recorder.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      releaseStream();
      setSeconds(0);

      if (abandonedRef.current) return;
      if (blob.size === 0) {
        showError('Puste nagranie', 'Nic nie zostało nagrane - spróbuj jeszcze raz.');
        return;
      }

      void onRecorded(blob, mimeType)
        .then(() => showSuccess('Zadanie dodane', 'Nagranie zostało zamienione na zadanie.'))
        .catch(() => showError('Nie udało się dodać zadania', 'Spróbuj ponownie za chwilę.'));
    };

    recorder.start(250);
    setIsRecording(true);
    setSeconds(0);

    // Licznik z czasu startu, nie z inkrementacji stanu: dzięki temu twardy
    // limit da się sprawdzić tutaj, a updater stanu zostaje czystą funkcją.
    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      if (elapsed >= MAX_SECONDS) {
        stopRecording();
        return;
      }
      setSeconds(elapsed);
    }, 1000);
  }, [onRecorded, releaseStream, showError, showSuccess, stopRecording]);

  const label = isSending ? 'Przetwarzam…' : isRecording ? formatSeconds(seconds) : 'Dyktuj';

  return (
    <Button
      type="button"
      $recording={isRecording}
      disabled={isSending}
      onClick={() => (isRecording ? stopRecording() : void startRecording())}
      aria-label={isRecording ? 'Zakończ nagrywanie i utwórz zadanie' : 'Podyktuj zadanie'}
      title={isRecording ? 'Zakończ nagrywanie' : 'Podyktuj zadanie'}
    >
      {isSending ? <Spinner /> : isRecording ? <Square /> : <Mic />}
      <Label $alwaysVisible={isRecording || isSending}>{label}</Label>
    </Button>
  );
};
