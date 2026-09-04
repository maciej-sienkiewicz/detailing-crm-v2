import React from 'react';
import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';
import { useToast } from '@/common/components/Toast';
import { useKsefAutomation, useUpdateKsefAutoSendDefault } from '../hooks/useKsef';

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

/**
 * Ustawienia → Faktury → domyślna odpowiedź na pytanie o wysyłkę do KSeF.
 *
 * Wysyłka faktury z wydania pojazdu jest decyzją podejmowaną przy każdym
 * dokumencie, a nie stałą regułą - dlatego to ustawienie steruje wyłącznie
 * początkową pozycją przełącznika w modalu wydania. Trzymamy je tutaj, obok
 * poświadczeń KSeF, bo obie rzeczy odpowiadają na to samo pytanie: co się dzieje
 * z fakturą po wystawieniu.
 */
export const KsefSendingDefaultsPanel: React.FC = () => {
  const ksef = useKsefAutomation();
  const { mutate, isPending } = useUpdateKsefAutoSendDefault();
  const { showError } = useToast();

  // Przed wczytaniem ustawień pokazujemy wysyłkę włączoną - tak działał system,
  // zanim przełącznik powstał, więc migotnięcie nie sugeruje zmiany zachowania.
  const autoSendDefault = ksef.autoSendDefault ?? true;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Wysyłka faktur do KSeF</PanelTitle>
        <PanelSubtitle>Domyślne zachowanie przy wydaniu pojazdu</PanelSubtitle>
      </PanelHeader>

      <OptionRow>
        <OptionTexts>
          <OptionLabel>Domyślnie wysyłaj fakturę do KSeF</OptionLabel>
          <OptionHint>
            Ustawia początkową pozycję przełącznika „Wyślij fakturę do KSeF" w oknie
            wydania pojazdu. Osoba wydająca pojazd może go zmienić przy każdej fakturze;
            faktura niewysłana zostaje zapisana w CRM i można ją wysłać później z listy
            dokumentów przychodowych.
          </OptionHint>
        </OptionTexts>
        <Toggle
          checked={autoSendDefault}
          disabled={isPending || ksef.isLoading}
          ariaLabel="Domyślnie wysyłaj fakturę do KSeF"
          onChange={(value) =>
            mutate(value, {
              onError: () => showError('Nie udało się zapisać ustawienia wysyłki do KSeF'),
            })
          }
        />
      </OptionRow>
    </Panel>
  );
};
