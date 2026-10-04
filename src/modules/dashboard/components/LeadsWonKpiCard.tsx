import styled from 'styled-components';
import { CalendarCheck } from 'lucide-react';
import { formatCurrency } from '@/common/utils/formatters';

/**
 * Pokwitowanie, nie zadanie: ile pieniędzy z zapytań trafiło od poniedziałku do
 * kalendarza jako rezerwacje. Studio, które odpisuje, ma widzieć, że to się opłaca -
 * z narzędzia, które jest źródłem pieniędzy, korzysta się chętniej niż z listy
 * obowiązków. Slajd pokazuje się tylko wtedy, gdy jest co pokazać (patrz KpiSlider).
 */

const Card = styled.div`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 18px 22px;
  min-width: 220px;
  backdrop-filter: blur(4px);

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    min-width: 0;
    width: 100%;
  }
`;

const Eyebrow = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 6px;
`;

const Amount = styled.div`
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -1.2px;
  line-height: 1;
  color: #fff;
  font-variant-numeric: tabular-nums;
`;

const Note = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #10b981;
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  svg { width: 13px; height: 13px; stroke-width: 2.5; }
`;

export const LeadsWonKpiCard = ({ valueCents }: { valueCents: number }) => (
  <Card>
    <Eyebrow>Z zapytań od poniedziałku</Eyebrow>
    <Amount>{formatCurrency(valueCents / 100, 'PLN')}</Amount>
    <Note><CalendarCheck />trafiło do kalendarza</Note>
  </Card>
);
