import styled from 'styled-components';
import { Check, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { usePeriodDetail, useStandardToday } from '../hooks/useWorkTime';

// Zgłoszenie standardowego dnia pracy jednym dotknięciem. Dla pracownika bez
// dostępu do danych osobowych to jedyna czynność, jaką wykonuje na ekranie
// startowym — więc ma być pierwszym, co widzi, i ma jasno mówić, czy dzień
// został już zaraportowany.

/** Lokalne YYYY-MM / YYYY-MM-DD: toISOString() liczy w UTC i po 22:00 wskazałby jutro. */
const pad = (n: number) => String(n).padStart(2, '0');
const localPeriod = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const localDate = (d: Date) => `${localPeriod(d)}-${pad(d.getDate())}`;

const Row = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 9999px;
  background: #0ea5e9;
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);
  transition: background 180ms ease, opacity 180ms ease;
  -webkit-tap-highlight-color: transparent;

  &:hover:not(:disabled) { background: #0284c7; }

  &:disabled {
    background: rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    box-shadow: none;
    cursor: default;
  }

  svg { width: 16px; height: 16px; stroke-width: 2; flex-shrink: 0; }

  @media (max-width: 639px) {
    padding: 9px 16px;
    font-size: 13px;
  }
`;

const DoneMark = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.16);
  color: #10b981;

  svg { width: 15px; height: 15px; stroke-width: 3; }
`;

const Spinner = styled(Loader2)`
  animation: spin 900ms linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export const ReportWorkdayButton = () => {
  const { showSuccess, showError } = useToast();
  const today = new Date();
  const period = localPeriod(today);
  const todayKey = localDate(today);

  const { data: periodDetail, isLoading } = usePeriodDetail(period);
  const standardToday = useStandardToday(period);

  const alreadyReported = !!periodDetail?.entries.some(
    entry => entry.date === todayKey && entry.minutes > 0,
  );

  const handleClick = () => {
    standardToday.mutate(undefined, {
      onSuccess: () => showSuccess('Dzień zaraportowany', 'Zapisano 8 godzin pracy na dziś.'),
      onError: () => showError('Nie udało się zapisać', 'Spróbuj ponownie za chwilę.'),
    });
  };

  return (
    <Row>
      <Button
        type="button"
        onClick={handleClick}
        disabled={isLoading || alreadyReported || standardToday.isPending}
      >
        {standardToday.isPending ? <Spinner /> : <Clock />}
        {alreadyReported ? 'Dzień zaraportowany' : 'Zaraportuj 8 godzin pracy'}
      </Button>

      {alreadyReported && (
        <DoneMark title="Dzisiejszy dzień pracy jest już zgłoszony" aria-hidden="true">
          <Check />
        </DoneMark>
      )}
    </Row>
  );
};
