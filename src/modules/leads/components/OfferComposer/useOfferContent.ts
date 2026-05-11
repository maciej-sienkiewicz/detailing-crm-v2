import { useState, useEffect, useRef } from 'react';
import type { Lead } from '../../types';

export type OfferPhase = 'typing' | 'revealed';

interface OfferContent {
  to: string;
  subject: string;
  body: string;
}

function buildMockBody(lead: Lead): string {
  const name = lead.customerName ?? 'Szanowna/y Pani/Panie';
  const vehicle = [lead.vehicleBrand, lead.vehicleModel].filter(Boolean).join(' ') || 'Państwa pojazdu';
  const value = lead.estimatedValue > 0
    ? `${(lead.estimatedValue / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN brutto`
    : null;

  const priceSection = value
    ? `\nSzacunkowy koszt wykonania usługi wynosi ${value}.\n`
    : '';

  return `Dzień dobry ${name},\n\nDziękujemy za kontakt z naszym serwisem. W odpowiedzi na Państwa zapytanie dotyczące ${vehicle} przygotowaliśmy dla Państwa wstępną ofertę.\n${priceSection}\nW ramach naszych usług oferujemy profesjonalne detailingowe przygotowanie pojazdu z wykorzystaniem najwyższej jakości produktów oraz technik. Gwarantujemy dbałość o każdy detal i pełne zadowolenie z efektów.\n\nZapraszamy do kontaktu w celu umówienia terminu wizyty lub zadania dodatkowych pytań.\n\nZ poważaniem,\nZespół Studio Detailingu`;
}

export function useOfferContent(lead: Lead) {
  const [phase, setPhase] = useState<OfferPhase>('typing');
  const [displayedBody, setDisplayedBody] = useState('');
  const [finalBody, setFinalBody] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const content: OfferContent = {
    to: lead.contactIdentifier,
    subject: `Oferta detailingu – ${[lead.vehicleBrand, lead.vehicleModel].filter(Boolean).join(' ') || 'Państwa pojazd'}`,
    body: finalBody,
  };

  useEffect(() => {
    const full = buildMockBody(lead);
    setFinalBody(full);
    setDisplayedBody('');
    setPhase('typing');

    let charIndex = 0;
    // Typewrite fast (chars appear quickly while blurred)
    const msPerChar = 2800 / full.length; // finish in ~2.8s

    intervalRef.current = setInterval(() => {
      charIndex += Math.ceil(full.length / 80); // batch chunks for speed
      const slice = full.slice(0, charIndex);
      setDisplayedBody(slice);
      if (charIndex >= full.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        // Small pause then reveal
        timerRef.current = setTimeout(() => {
          setDisplayedBody(full);
          setPhase('revealed');
        }, 200);
      }
    }, msPerChar * Math.ceil(full.length / 80));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  return { phase, displayedBody, content };
}
