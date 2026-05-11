import { useState, useEffect, useRef } from 'react';
import type { Lead } from '../../types';

export type OfferPhase = 'typing' | 'revealed';

// Target duration for the typing animation
const TYPING_DURATION_MS = 3200;

function buildMockBody(lead: Lead): string {
  const name = lead.customerName ?? 'Szanowna/y Pani/Panie';
  const vehicle = [lead.vehicleBrand, lead.vehicleModel].filter(Boolean).join(' ') || 'Państwa pojazdu';
  const value = lead.estimatedValue > 0
    ? `${(lead.estimatedValue / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN brutto`
    : null;

  const priceSection = value
    ? `\nSzacunkowy koszt wykonania usługi wynosi ${value}.\n`
    : '';

  return `Dzień dobry ${name},\n\nDziękujemy za kontakt z naszym serwisem. W odpowiedzi na Państwa zapytanie dotyczące ${vehicle} przygotowaliśmy wstępną ofertę.\n${priceSection}\nW ramach naszych usług oferujemy profesjonalne detailingowe przygotowanie pojazdu z wykorzystaniem najwyższej jakości produktów oraz technik. Gwarantujemy dbałość o każdy detal i pełne zadowolenie z efektów.\n\nZapraszamy do kontaktu w celu umówienia terminu wizyty lub zadania dodatkowych pytań.\n\nZ poważaniem,\nZespół Studio Detailingu`;
}

export function useOfferContent(lead: Lead) {
  const [phase, setPhase] = useState<OfferPhase>('typing');
  const [displayedBody, setDisplayedBody] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const charIndexRef = useRef(0);

  useEffect(() => {
    const full = buildMockBody(lead);

    // Reset state
    charIndexRef.current = 0;
    setDisplayedBody('');
    setPhase('typing');

    // One character per tick; interval adjusts to hit TYPING_DURATION_MS total.
    // Browser minimum is ~4ms; we floor at 4 to avoid unreliable sub-4ms intervals.
    const msPerChar = Math.max(4, TYPING_DURATION_MS / full.length);

    intervalRef.current = setInterval(() => {
      charIndexRef.current += 1;
      const idx = charIndexRef.current;
      setDisplayedBody(full.slice(0, idx));

      if (idx >= full.length) {
        clearInterval(intervalRef.current!);
        // Brief pause so the cursor blink is visible one last time
        timerRef.current = setTimeout(() => {
          setDisplayedBody(full);
          setPhase('revealed');
        }, 320);
      }
    }, msPerChar);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  return { phase, displayedBody };
}
