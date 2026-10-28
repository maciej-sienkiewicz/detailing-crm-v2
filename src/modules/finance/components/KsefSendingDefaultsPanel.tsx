import React from 'react';
import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';
import { useToast } from '@/common/components/Toast';
import { useKsefAutomation, useUpdateKsefInvoicingSettings } from '../hooks/useKsef';

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

  & + & {
    border-top: 1px solid ${(p) => p.theme.colors.border};
  }

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
  const { mutate, isPending } = useUpdateKsefInvoicingSettings();
  const { showError } = useToast();

  // Przed wczytaniem ustawień pokazujemy wysyłkę włączoną - tak działał system,
  // zanim przełącznik powstał, więc migotnięcie nie sugeruje zmiany zachowania.
  const autoSendDefault = ksef.autoSendDefault ?? true;
  const external = ksef.invoicesIssuedExternally;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Faktury przy wydaniu pojazdu</PanelTitle>
        <PanelSubtitle>Kto wystawia fakturę i czy CRM wysyła ją do KSeF</PanelSubtitle>
      </PanelHeader>

      {/*
        Faktury wystawia księgowość: przy wydaniu pojazdu „Faktura” nie tworzy faktury
        w CRM, więc nie ma też czego wysyłać - przełącznik wysyłki traci sens i jest
        wyłączony, żeby nie sugerował, że cokolwiek pojedzie do KSeF.

        Ostrzeżenie „przychód pojawi się dopiero po pobraniu z KSeF” zniknęło razem
        z pobieraniem faktur sprzedaży: przychodem jest zapis płatności z wydania.
      */}
      <OptionRow>
        <OptionTexts>
          <OptionLabel>Faktury wystawia księgowość</OptionLabel>
          <OptionHint>
            Przy wydaniu pojazdu „Faktura” nie tworzy faktury w CRM, tylko zapis płatności.
            Kwota od razu liczy się do przychodu w Finansach, a fakturę wystawia księgowość
            w swoim programie.
          </OptionHint>
        </OptionTexts>
        <Toggle
          checked={external}
          disabled={isPending || ksef.isLoading}
          ariaLabel="Faktury wystawia księgowość"
          onChange={(value) =>
            mutate({ invoicesIssuedExternally: value }, {
              onError: () => showError('Nie udało się zapisać ustawienia fakturowania'),
            })
          }
        />
      </OptionRow>

      <OptionRow>
        <OptionTexts>
          <OptionLabel>Domyślnie wysyłaj fakturę do KSeF</OptionLabel>
          <OptionHint>
            {external
              ? 'Nie dotyczy, gdy faktury wystawia księgowość: CRM nie tworzy wtedy faktur, więc nie ma czego wysyłać.'
              : 'Tak ustawi się przełącznik „Wyślij fakturę do KSeF” przy wydaniu pojazdu. ' +
                'Można go zmienić przy każdej fakturze, a niewysłaną fakturę wysłać później.'}
          </OptionHint>
        </OptionTexts>
        <Toggle
          checked={autoSendDefault && !external}
          disabled={isPending || ksef.isLoading || external}
          ariaLabel="Domyślnie wysyłaj fakturę do KSeF"
          onChange={(value) =>
            mutate({ autoSendDefault: value }, {
              onError: () => showError('Nie udało się zapisać ustawienia wysyłki do KSeF'),
            })
          }
        />
      </OptionRow>
    </Panel>
  );
};
