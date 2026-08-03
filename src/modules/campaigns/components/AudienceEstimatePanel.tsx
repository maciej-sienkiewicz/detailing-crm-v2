import styled from 'styled-components';
import type { AudienceCriteria, AudienceEstimate } from '../types';

const Panel = styled.div`
  position: sticky;
  top: 24px;
  background: #ffffff;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.04);
`;

const BigNumber = styled.div<{ $dim: boolean }>`
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
  color: ${(p) => p.theme.colors.text};
  opacity: ${(p) => (p.$dim ? 0.45 : 1)};
  transition: opacity 180ms ease;
  line-height: 1;
`;

const BigLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${(p) => p.theme.colors.textMuted};
  margin: 6px 0 14px;
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

  li strong { font-weight: 600; }
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
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  opacity: ${(p) => (p.$excluded ? 0.5 : 1)};

  &:last-child { border-bottom: none; }
`;

const RecipientName = styled.div`
  font-size: 13px;
  font-weight: 600;
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
  border-radius: 6px;
  transition: all 150ms ease;

  &:hover { background: #fee2e2; color: #dc2626; }
`;

const CostRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
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
      <BigNumber $dim={isEstimating}>{e ? e.eligible : '—'}</BigNumber>
      <BigLabel>Odbiorców dostanie wiadomość</BigLabel>

      {e && (
        <Breakdown>
          <li><span>Pasuje do filtrów</span><strong>{e.matched}</strong></li>
          {e.noConsent > 0 && <li><span>Brak zgody marketingowej</span><strong>−{e.noConsent}</strong></li>}
          {e.noAddress > 0 && <li><span>Brak numeru / adresu</span><strong>−{e.noAddress}</strong></li>}
          {e.optedOut > 0 && <li><span>Zrezygnowali (STOP)</span><strong>−{e.optedOut}</strong></li>}
          {e.frequencyCapped > 0 && <li><span>Limit wysyłek</span><strong>−{e.frequencyCapped}</strong></li>}
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
