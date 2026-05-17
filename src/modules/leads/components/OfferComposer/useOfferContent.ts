import { useState, useEffect, useRef } from 'react';
import type { Lead } from '../../types';
import { leadApi } from '../../api/leadApi';

export type OfferPhase = 'typing' | 'revealed';

const TYPING_DURATION_MS = 3200;

export function useOfferContent(lead: Lead) {
  const [phase, setPhase] = useState<OfferPhase>('typing');
  const [displayedBody, setDisplayedBody] = useState('');
  const [title, setTitle] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const charIndexRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const startTyping = (fullText: string) => {
      charIndexRef.current = 0;
      setDisplayedBody('');
      setPhase('typing');

      const msPerChar = Math.max(4, TYPING_DURATION_MS / fullText.length);

      intervalRef.current = setInterval(() => {
        charIndexRef.current += 1;
        const idx = charIndexRef.current;
        setDisplayedBody(fullText.slice(0, idx));

        if (idx >= fullText.length) {
          clearInterval(intervalRef.current!);
          timerRef.current = setTimeout(() => {
            setDisplayedBody(fullText);
            setPhase('revealed');
          }, 320);
        }
      }, msPerChar);
    };

    leadApi.generateQuoteReply(lead.id).then(({ title: t, reply }) => {
      if (cancelled) return;
      setTitle(t);
      startTyping(reply);
    });

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  return { phase, displayedBody, title };
}
