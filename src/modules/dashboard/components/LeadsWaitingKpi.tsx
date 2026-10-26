// src/modules/dashboard/components/LeadsWaitingKpi.tsx
//
// Trzeci wskaźnik w karcie powitania na Tablicy: zapytania, które czekają na naszą
// odpowiedź. Ten sam licznik co przy „Zapytaniach” w menu - sprawy ze wszystkich
// źródeł (formularze, Facebook, telefon, poczta), więc nie zależy od tego, czy studio
// podłączyło skrzynkę. Komponent montuje widok tylko dla LEADS_MANAGE.
//
// Czerwień tylko wtedy, gdy ktoś czeka. Zero to spokojny stan („wszystko obsłużone”),
// a jeśli w tym tygodniu zapytania zamieniły się w rezerwacje - ta kwota, zamiast
// pustego miejsca (dawny slajd „wygrane z zapytań” z karuzeli).
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/common/utils/formatters';
import { useLeadOverview, useNewLeadsCount } from '@/modules/comms/hooks/useLeads';
import { MailSetupKpi } from './mailSetup/MailSetupKpi';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const Label = styled.div<{ $alert: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  color: ${p => (p.$alert ? '#fca5a5' : '#94a3b8')};

  &::before {
    content: '';
    display: ${p => (p.$alert ? 'block' : 'none')};
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #f87171;
  }
`;

const Value = styled.div`
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.4px;
  line-height: 1.15;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
`;

const Note = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  font-size: 12.5px;
  font-weight: 500;
  color: #94a3b8;
`;

const ReplyLink = styled.button`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-weight: 600;
  color: #fca5a5;
  cursor: pointer;

  &:hover { color: #fecaca; text-decoration: underline; }
  &:focus-visible { outline: 2px solid #fca5a5; outline-offset: 2px; border-radius: 4px; }
`;

interface LeadsWaitingKpiProps {
    /**
     * Skrzynka podłączona, ale „Twórz zapytania z poczty” wyłączone. Przy zerze kafel
     * zamiast „Wszystko obsłużone” zachęca do włączenia - to zero znaczyło tylko, że maile
     * w ogóle nie stają się zapytaniami. Gdy coś czeka (formularz, Facebook), zostaje licznik.
     */
    autoLeadsOff?: boolean;
}

export const LeadsWaitingKpi = ({ autoLeadsOff = false }: LeadsWaitingKpiProps) => {
    const navigate = useNavigate();
    const waiting = useNewLeadsCount();
    const { data: overview } = useLeadOverview();
    const wonThisWeek = overview?.confirmedValueThisWeek ?? 0;
    const alert = waiting > 0;

    if (autoLeadsOff && !alert) return <MailSetupKpi step="auto-leads" />;

    return (
        <Wrap>
            <Label $alert={alert}>{alert ? 'Zapytania czekają na odpowiedź' : 'Zapytania'}</Label>
            <Value>{waiting}</Value>
            <Note>
                {alert ? (
                    <ReplyLink type="button" onClick={() => navigate('/inbox')}>Odpisz →</ReplyLink>
                ) : (
                    <>
                        <span>Wszystko obsłużone</span>
                        {/* Osobny element, nie „·” jako klej (CLAUDE.md §4). */}
                        {wonThisWeek > 0 && <span>W tym tygodniu z zapytań {formatCurrency(wonThisWeek / 100, 'PLN')}</span>}
                    </>
                )}
            </Note>
        </Wrap>
    );
};
