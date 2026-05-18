import { useState, useEffect, useRef } from 'react';
import type { Lead } from '../../types';
import { leadApi } from '../../api/leadApi';

export type OfferPhase = 'typing' | 'revealed';

const TYPING_DURATION_MS = 3200;

const PLACEHOLDER_TEXT =
  'Szanowny Panie/Pani,\n\nDziękujemy za zainteresowanie naszymi usługami detailingowymi. Z przyjemnością przygotowaliśmy dla Pana/Pani indywidualną ofertę dopasowaną do potrzeb pojazdu.\n\nW skład kompleksowego pakietu wchodzą następujące usługi:\n• Szczegółowe czyszczenie i odkurzanie wnętrza pojazdu\n• Profesjonalna pielęgnacja i polerowanie lakieru\n• Ochrona powierzchni powłoką ceramiczną\n• Impregnacja tapicerki i plastików\n\nSzczegółowy cennik oraz dostępne terminy chętnie omówimy podczas bezpośredniego kontaktu.\n\nZapraszamy do umówienia wizyty.\n\nZ poważaniem,\nZespół Detailing Studio';

export function useOfferContent(lead: Lead) {
  const [phase, setPhase] = useState<OfferPhase>('typing');
  const [displayedBody, setDisplayedBody] = useState('');
  const [title, setTitle] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const charIndexRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let fakeTypingDone = false;
    let serverResult: { title: string; reply: string } | null = null;

    const reveal = (reply: string) => {
      if (cancelled) return;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDisplayedBody(reply);
      timerRef.current = setTimeout(() => {
        if (!cancelled) setPhase('revealed');
      }, 320);
    };

    // Start fake typing animation immediately so user sees activity while waiting
    charIndexRef.current = 0;
    setDisplayedBody('');
    setPhase('typing');

    const msPerChar = Math.max(4, TYPING_DURATION_MS / PLACEHOLDER_TEXT.length);

    intervalRef.current = setInterval(() => {
      charIndexRef.current += 1;
      const idx = charIndexRef.current;
      setDisplayedBody(PLACEHOLDER_TEXT.slice(0, idx));

      if (idx >= PLACEHOLDER_TEXT.length) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        fakeTypingDone = true;

        // If server already responded while we were animating, reveal now
        if (serverResult) {
          reveal(serverResult.reply);
        }
      }
    }, msPerChar);

    leadApi.generateQuoteReply(lead.id).then(({ title: t, reply }) => {
      if (cancelled) return;
      serverResult = { title: t, reply };
      setTitle(t);

      // If fake typing finished before server responded, reveal real content now
      if (fakeTypingDone) {
        reveal(reply);
      }
      // Otherwise the interval callback will call reveal when fake typing ends
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
