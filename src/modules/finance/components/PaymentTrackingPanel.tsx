import React from 'react';
import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';
import { useToast } from '@/common/components/Toast';
import { usePaymentTracking, useUpdatePaymentTracking } from '../hooks/usePaymentTracking';

const Panel = styled.div`
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};
  background: ${(p) => p.theme.colors.surfaceAlt};

  @media (max-width: 639px) {
    padding: 16px;
  }
`;

const PanelTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: ${(p) => p.theme.colors.text};
  margin: 0 0 3px;
`;

const PanelSubtitle = styled.p`
  font-size: 12px;
  color: ${(p) => p.theme.colors.textMuted};
  margin: 0;
`;

const OptionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 24px;

  @media (max-width: 639px) {
    padding: 16px;
  }
`;

const OptionTexts = styled.div`
  min-width: 0;
`;

const OptionLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => p.theme.colors.text};
`;

const OptionHint = styled.div`
  font-size: 12.5px;
  color: ${(p) => p.theme.colors.textSecondary};
  margin-top: 3px;
  line-height: 1.5;
  max-width: 62ch;
`;

const Slot = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  min-height: 44px;
`;

/**
 * Ustawienia → Finanse i KSeF → „Obsługa statusów płatności".
 *
 * Biznes nie potrafił odpowiedzieć sobie, jaki ma realny przychód i realne koszty:
 * kafle liczyły tylko dokumenty opłacone, a przelew bez kliknięcia „Oznacz jako
 * opłacone" nie istniał w żadnej sumie. Studio, które płatności nie śledzi, wyłącza
 * obsługę - każdy dokument od razu jest przychodem albo kosztem.
 *
 * Przełącznika nie ma, dopóki stan jest nieznany: „włączone" przed odpowiedzią
 * serwera wyglądałoby jak prawdziwy stan i zapraszało do kliknięcia na ślepo.
 */
export const PaymentTrackingPanel: React.FC = () => {
  const { known } = usePaymentTracking();
  const { mutate, isPending } = useUpdatePaymentTracking();
  const { showError } = useToast();

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Płatności</PanelTitle>
        <PanelSubtitle>Co liczy się do przychodu i kosztów</PanelSubtitle>
      </PanelHeader>

      <OptionRow>
        <OptionTexts>
          <OptionLabel>Obsługa statusów płatności</OptionLabel>
          <OptionHint>
            {known === false
              ? 'Każdy dokument od razu liczy się do przychodu albo kosztu, bez należności. ' +
                'Status płatności przy dokumentach pokazuje osobno „Pokaż kolumnę ze statusem ' +
                'płatności”. Statusy nie są kasowane: po ponownym włączeniu liczą się takie, jakie są.'
              : 'Przychodem i kosztem jest dokument opłacony. Przelew i nieopłacona faktura ' +
                'kosztowa czekają w należnościach, dopóki ktoś nie oznaczy ich jako opłaconych. ' +
                'Wyłącz, jeśli nie śledzisz płatności - wtedy każdy dokument liczy się od razu.'}
          </OptionHint>
        </OptionTexts>
        <Slot>
          {known !== undefined && (
            <Toggle
              checked={known}
              disabled={isPending}
              ariaLabel="Obsługa statusów płatności"
              onChange={(value) =>
                mutate({ paymentTrackingEnabled: value }, {
                  onError: () => showError('Nie udało się zapisać ustawienia płatności'),
                })
              }
            />
          )}
        </Slot>
      </OptionRow>
    </Panel>
  );
};
