import styled from 'styled-components';
import { InfoTooltip } from '@/common/components/InfoTooltip';
import type { AudienceCriteria, AudienceEstimate } from '../types';

/**
 * Panel prognozy — jedyny element kroku „Odbiorcy", który ma się rzucić w oczy.
 *
 * Filtrów po lewej jest kilkanaście i wszystkie ważą tyle samo; jedyna liczba,
 * dla której ktoś je w ogóle ustawia, stoi tutaj i jest największa na ekranie.
 * Hierarchia rozmiarem, nie barwą: liczba odbiorców pomalowana na kolor
 * wyglądałaby jak ostrzeżenie, a nie jak fakt.
 */
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

const BreakdownLabel = styled.span`
  display: inline-flex;
  align-items: center;
`;

const Breakdown = styled.ul`
  list-style: none;
  margin: 0 0 14px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;

  li {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: ${(p) => p.theme.colors.textSecondary};
    font-variant-numeric: tabular-nums;
  }

  li strong {
    font-weight: ${(p) => p.theme.fontWeights.semibold};
    color: ${(p) => p.theme.colors.text};
  }
`;

const RecipientList = styled.div`
  max-height: 340px;
  overflow-y: auto;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  margin-top: 4px;
`;

const RecipientRow = styled.div<{ $excluded?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 2px;
  border-bottom: 1px solid ${(p) => p.theme.colors.surfaceAlt};
  opacity: ${(p) => (p.$excluded ? 0.5 : 1)};

  &:last-child { border-bottom: none; }
`;

const RecipientName = styled.div`
  font-size: 13px;
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.text};
`;

const RecipientMeta = styled.div`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textMuted};
`;

const ExcludeBtn = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${(p) => p.theme.colors.textMuted};
  font-size: 16px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: ${(p) => p.theme.radii.sm};
  transition: all ${(p) => p.theme.transitions.fast};

  &:hover {
    background: ${(p) => p.theme.colors.errorLight};
    color: ${(p) => p.theme.colors.error};
  }
`;

const CostRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: ${(p) => p.theme.fontWeights.semibold};
  color: ${(p) => p.theme.colors.text};
  padding-top: 10px;
  border-top: 1px solid ${(p) => p.theme.colors.border};
  font-variant-numeric: tabular-nums;
`;

interface Props {
  estimate: AudienceEstimate | undefined;
  isEstimating: boolean;
  audience: AudienceCriteria;
  onChangeAudience?: (next: AudienceCriteria) => void;
  showCost?: boolean;
}

export function AudienceEstimatePanel({ estimate, isEstimating, audience, onChangeAudience, showCost }: Props) {
  const e = estimate;

  return (
    <Panel>
      <BigNumber $dim={isEstimating}>{e ? e.eligible : '-'}</BigNumber>
      <BigLabel>
        Odbiorców dostanie wiadomość
        <InfoTooltip text="Finalna liczba klientów po odjęciu wszystkich wykluczeń systemowych (brak zgody, brak kontaktu, STOP, limit częstości)." />
      </BigLabel>

      {e && (
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
        </Breakdown>
      )}

      {showCost && e?.estimatedCredits != null && (
        <CostRow>
          <span>Szacowany koszt</span>
          <span>{e.estimatedCredits} kredytów SMS</span>
        </CostRow>
      )}

      {e && e.sample.length > 0 && (
        <RecipientList>
          {e.sample.map((c) => {
            const excluded = c.eligibility !== 'ELIGIBLE';
            return (
              <RecipientRow key={c.customerId} $excluded={excluded}>
                <div>
                  <RecipientName>
                    {[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Klient'}
                  </RecipientName>
                  <RecipientMeta>
                    {[c.phone ?? c.email, [c.vehicleBrand, c.vehicleModel].filter(Boolean).join(' ')]
                      .filter(Boolean)
                      .join(' · ')}
                  </RecipientMeta>
                </div>
                {onChangeAudience && !excluded && (
                  <ExcludeBtn
                    title="Wyklucz z kampanii"
                    onClick={() =>
                      onChangeAudience({
                        ...audience,
                        excludeCustomerIds: [...audience.excludeCustomerIds, c.customerId],
                      })
                    }
                  >
                    ×
                  </ExcludeBtn>
                )}
              </RecipientRow>
            );
          })}
        </RecipientList>
      )}
    </Panel>
  );
}
