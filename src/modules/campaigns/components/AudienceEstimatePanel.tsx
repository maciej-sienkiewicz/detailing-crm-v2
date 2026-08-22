// src/modules/campaigns/components/AudienceEstimatePanel.tsx
// Odpowiedź na jedno pytanie: ilu ludzi to dostanie.
//
// Filtrów obok jest kilkanaście i wszystkie ważą tyle samo; jedyna liczba, dla
// której ktoś je w ogóle ustawia, stoi tutaj i jest największym elementem kroku.
// Hierarchia rozmiarem, nie barwą — liczba odbiorców pomalowana na kolor
// wyglądałaby jak ostrzeżenie, a nie jak fakt.
//
// Pod liczbą stoi rachunek, nie wykres: „pasuje 480, minus 41 bez zgody, minus 12
// bez numeru". Różnica między tym, czego ktoś się spodziewał, a tym, co wyjdzie,
// jest jedyną rzeczą, o którą pyta po wysyłce — więc pokazujemy ją przed.
//
// Sama lista odbiorców przeniosła się do [AudienceTable]: w wąskiej kolumnie była
// nieczytelna, a jako tabela na pełnej szerokości może mieć pola wyboru.
import styled from 'styled-components';
import { InfoTooltip } from '@/common/components/InfoTooltip';
import type { AudienceEstimate } from '../types';

const Panel = styled.div`
  position: sticky;
  top: 24px;
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.xl};
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.04);
`;

const BigNumber = styled.div<{ $dim: boolean }>`
  font-size: 40px;
  font-weight: ${(p) => p.theme.fontWeights.bold};
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  color: ${(p) => p.theme.colors.text};
  opacity: ${(p) => (p.$dim ? 0.45 : 1)};
  transition: opacity 180ms ease;
  line-height: 1;
`;

const BigLabel = styled.div`
  font-size: 11px;
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${(p) => p.theme.colors.textMuted};
  margin: 6px 0 14px;
  display: flex;
  align-items: center;
`;

/** Okno prognozy automatu — zdanie, nie plakietka: to warunek odczytu liczby wyżej. */
const HorizonNote = styled.p`
  margin: -8px 0 14px;
  font-size: 12px;
  line-height: 1.5;
  color: ${(p) => p.theme.colors.textMuted};
`;

const BreakdownLabel = styled.span`
  display: inline-flex;
  align-items: center;
`;

const Breakdown = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;

  li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 13px;
    color: ${(p) => p.theme.colors.textSecondary};
    font-variant-numeric: tabular-nums;
  }

  li strong {
    font-weight: ${(p) => p.theme.fontWeights.semibold};
    color: ${(p) => p.theme.colors.text};
  }
`;

const CostRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.text};
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  font-variant-numeric: tabular-nums;
`;

interface Props {
  estimate: AudienceEstimate | undefined;
  isEstimating: boolean;
  showCost?: boolean;
  /** Kampania automatyczna bez wybranej usługi — liczba nie ma jeszcze o czym mówić. */
  awaitingTrigger?: boolean;
}

export function AudienceEstimatePanel({ estimate, isEstimating, showCost, awaitingTrigger }: Props) {
  const e = estimate;

  return (
    <Panel>
      <BigNumber $dim={isEstimating}>{awaitingTrigger ? '—' : e ? e.eligible : '—'}</BigNumber>
      <BigLabel>
        {e?.projectionHorizonDays ? 'Odezwiemy się do tylu klientów' : 'Odbiorców dostanie wiadomość'}
        <InfoTooltip text="Finalna liczba klientów po odjęciu wszystkich wykluczeń systemowych (brak zgody, brak kontaktu, STOP, limit częstości) oraz odznaczonych ręcznie." />
      </BigLabel>

      {awaitingTrigger ? (
        <HorizonNote>
          Kampania automatyczna wychodzi od warunku, nie od filtrów. Wybierz usługę, po której
          ma się odezwać — dopiero wtedy da się policzyć, kogo obejmie.
        </HorizonNote>
      ) : (
        e?.projectionHorizonDays != null && (
          <HorizonNote>
            Prognoza na najbliższe <strong>{e.projectionHorizonDays} dni</strong>: tylu klientów
            przejdzie w tym czasie przez warunek. Kampania działa dalej — to nie jest limit.
          </HorizonNote>
        )
      )}

      {e && !awaitingTrigger && (
        <Breakdown>
          <li>
            <BreakdownLabel>
              Pasuje do filtrów
              <InfoTooltip text="Łączna liczba klientów spełniających ustawione kryteria odbiorców, przed zastosowaniem wykluczeń systemowych." />
            </BreakdownLabel>
            <strong>{e.matched}</strong>
          </li>
          {e.noConsent > 0 && (
            <li>
              <BreakdownLabel>
                Brak zgody marketingowej
                <InfoTooltip text="Klient nie wyraził zgody na komunikację marketingową tym kanałem (SMS lub e-mail). Zgody konfiguruje się w Ustawieniach → Zgody." />
              </BreakdownLabel>
              <strong>−{e.noConsent}</strong>
            </li>
          )}
          {e.noAddress > 0 && (
            <li>
              <BreakdownLabel>
                Brak numeru / adresu
                <InfoTooltip text="Dla wysyłki SMS: brak numeru telefonu w profilu klienta. Dla e-mail: brak adresu e-mail." />
              </BreakdownLabel>
              <strong>−{e.noAddress}</strong>
            </li>
          )}
          {e.optedOut > 0 && (
            <li>
              <BreakdownLabel>
                Wypisani (STOP)
                <InfoTooltip text="Klient odpowiedział STOP na poprzednią kampanię lub został ręcznie wypisany z listy. Tych klientów nigdy nie obejmują żadne kampanie." />
              </BreakdownLabel>
              <strong>−{e.optedOut}</strong>
            </li>
          )}
          {e.frequencyCapped > 0 && (
            <li>
              <BreakdownLabel>
                Niedawno kontaktowani
                <InfoTooltip text="Klient otrzymał wiadomość kampanijną w ciągu ustawionego limitu dni. Chroni przed zbyt częstym spamowaniem. Minimalny odstęp między kampaniami ustawiasz w Ustawieniach → Wysyłka." />
              </BreakdownLabel>
              <strong>−{e.frequencyCapped}</strong>
            </li>
          )}
          {e.excludedManually > 0 && (
            <li>
              <BreakdownLabel>
                Odznaczeni ręcznie
                <InfoTooltip text="Klienci, których odznaczyłeś w tabeli odbiorców. Odznaczenie zapisuje się razem z kampanią i przetrwa ponowne przeliczenie listy w dniu wysyłki." />
              </BreakdownLabel>
              <strong>−{e.excludedManually}</strong>
            </li>
          )}
        </Breakdown>
      )}

      {showCost && !awaitingTrigger && e?.estimatedCredits != null && (
        <CostRow>
          <span>Szacowany koszt</span>
          <span>{e.estimatedCredits} kredytów SMS</span>
        </CostRow>
      )}
    </Panel>
  );
}
