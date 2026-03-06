import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CampaignFilters, ServiceFilter, AudienceCustomer } from '../types';
import { CampaignFiltersPanel } from './CampaignFiltersPanel';
import { AudiencePreview } from './AudiencePreview';
import { useVehicleBrands, usePreviewAudience, useCreateCampaign } from '../hooks';

// ─── Animations ───────────────────────────────────────────────────────────────

const overlayIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const drawerIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
`;

// ─── Modal layout ─────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${st.bgOverlay};
  z-index: 1200;
  animation: ${overlayIn} 0.2s ease;
  display: flex;
  justify-content: flex-end;
`;

const Drawer = styled.div`
  width: 100%;
  max-width: 760px;
  height: 100%;
  background: ${st.bg};
  display: flex;
  flex-direction: column;
  animation: ${drawerIn} 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: -8px 0 40px rgba(15, 23, 42, 0.15);
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 28px;
  border-bottom: 1px solid ${st.border};
  background: ${st.bgCard};
  flex-shrink: 0;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: ${st.fontLg};
  font-weight: 800;
  color: ${st.text};
  letter-spacing: -0.3px;
`;

const HeaderSubtitle = styled.p`
  margin: 0;
  font-size: ${st.fontXs};
  color: ${st.textMuted};
`;

const CloseBtn = styled.button`
  margin-left: auto;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  font-size: 15px;
  color: ${st.textSecondary};
  cursor: pointer;
  transition: all ${st.transition};
  flex-shrink: 0;

  &:hover {
    background: ${st.bg};
    color: ${st.text};
    border-color: ${st.borderHover};
  }
`;

// ─── Stepper ──────────────────────────────────────────────────────────────────

const StepperBar = styled.div`
  display: flex;
  align-items: center;
  padding: 0 28px;
  background: ${st.bgCard};
  border-bottom: 1px solid ${st.border};
  flex-shrink: 0;
  overflow-x: auto;
`;

const StepItem = styled.div<{ $active: boolean; $done: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 0;
  margin-right: 32px;
  position: relative;
  cursor: ${(p) => (p.$done ? 'pointer' : 'default')};
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${(p) => (p.$active ? st.accentBlue : 'transparent')};
    border-radius: 2px 2px 0 0;
    transition: background ${st.transition};
  }
`;

const StepNumber = styled.div<{ $active: boolean; $done: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${st.fontXs};
  font-weight: 700;
  background: ${(p) =>
    p.$done ? st.accentGreen : p.$active ? st.accentBlue : st.bgCardAlt};
  color: ${(p) => (p.$done || p.$active ? '#fff' : st.textMuted)};
  transition: all ${st.transition};
  flex-shrink: 0;
`;

const StepLabel = styled.span<{ $active: boolean }>`
  font-size: ${st.fontSm};
  font-weight: ${(p) => (p.$active ? 700 : 400)};
  color: ${(p) => (p.$active ? st.text : st.textMuted)};
  white-space: nowrap;
`;

// ─── Body & Footer ────────────────────────────────────────────────────────────

const DrawerBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DrawerFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  border-top: 1px solid ${st.border};
  background: ${st.bgCard};
  flex-shrink: 0;
  gap: 12px;
`;

const BackBtn = styled.button`
  padding: 9px 20px;
  font-size: ${st.fontSm};
  font-weight: 600;
  background: transparent;
  color: ${st.textSecondary};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};

  &:hover {
    background: ${st.bg};
    color: ${st.text};
    border-color: ${st.borderHover};
  }
`;

const NextBtn = styled.button`
  padding: 9px 24px;
  font-size: ${st.fontSm};
  font-weight: 700;
  background: ${st.accentBlue};
  color: #fff;
  border: none;
  border-radius: ${st.radiusFull};
  cursor: pointer;
  box-shadow: ${st.shadowXs};
  transition: all ${st.transition};

  &:hover:not(:disabled) {
    background: #2563EB;
    box-shadow: ${st.shadowSm};
    transform: translateY(-1px);
  }
  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

const SubmitBtn = styled(NextBtn)`
  background: ${st.accentGreen};
  &:hover:not(:disabled) { background: #059669; }
`;

// ─── Step 3 specific ─────────────────────────────────────────────────────────

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  padding: 10px 14px;
  font-size: ${st.fontSm};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
`;

const Textarea = styled.textarea`
  padding: 10px 14px;
  font-size: ${st.fontSm};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  background: ${st.bgCard};
  color: ${st.text};
  outline: none;
  resize: vertical;
  min-height: 100px;
  line-height: 1.6;
  font-family: inherit;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
`;

const CharCounter = styled.span<{ $warning: boolean }>`
  align-self: flex-end;
  font-size: ${st.fontXs};
  color: ${(p) => (p.$warning ? st.accentRed : st.textMuted)};
  font-weight: ${(p) => (p.$warning ? 700 : 400)};
`;

const HintBox = styled.div`
  padding: 10px 14px;
  background: ${st.accentBlueDim};
  border: 1px solid ${st.accentBlue}33;
  border-radius: ${st.radiusSm};
  font-size: ${st.fontXs};
  color: ${st.textSecondary};
  line-height: 1.6;
`;

const VariableChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`;

const VarChip = styled.button`
  padding: 3px 9px;
  font-size: ${st.fontXs};
  font-weight: 600;
  background: ${st.bgCardAlt};
  color: ${st.accentBlue};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  cursor: pointer;
  font-family: monospace;
  transition: all ${st.transition};

  &:hover {
    background: ${st.accentBlueDim};
    border-color: ${st.accentBlue}44;
  }
`;

const AudienceSummaryCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  background: ${st.gradientCardBlue};
  border: 1px solid ${st.accentBlue}22;
  border-radius: ${st.radiusSm};
  box-shadow: ${st.shadowXs};
`;

const AudienceNumber = styled.span`
  font-size: ${st.fontXl};
  font-weight: 800;
  color: ${st.accentBlue};
  line-height: 1;
`;

const AudienceLabel = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
`;

// ─── Types ────────────────────────────────────────────────────────────────────

const EMPTY_FILTERS: CampaignFilters = {
  vehicles: [],
  services: [],
  lastVisit: null,
};

const MOCK_SERVICES: ServiceFilter[] = [
  { serviceId: 'svc-ppf', serviceName: 'Oklejanie PPF' },
  { serviceId: 'svc-wrap', serviceName: 'Car Wrapping' },
  { serviceId: 'svc-ceramic', serviceName: 'Powłoka ceramiczna' },
  { serviceId: 'svc-detail', serviceName: 'Detailing wnętrza' },
  { serviceId: 'svc-polish', serviceName: 'Korekta lakieru' },
  { serviceId: 'svc-wash', serviceName: 'Mycie ręczne' },
  { serviceId: 'svc-tint', serviceName: 'Przyciemnianie szyb' },
];

const TEMPLATE_VARS = ['{{imie}}', '{{nazwisko}}', '{{data}}', '{{godzina}}', '{{studio}}'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CreateCampaignModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [filters, setFilters] = useState<CampaignFilters>(EMPTY_FILTERS);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [audienceCustomers, setAudienceCustomers] = useState<AudienceCustomer[]>([]);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [message, setMessage] = useState('');

  const { brands } = useVehicleBrands();
  const { preview } = usePreviewAudience();
  const createMutation = useCreateCampaign();

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFilters(EMPTY_FILTERS);
      setExcludedIds([]);
      setAudienceCustomers([]);
      setCampaignName('');
      setMessage('');
    }
  }, [isOpen]);

  // Load audience when moving to step 2
  const loadAudience = useCallback(async () => {
    setAudienceLoading(true);
    try {
      const result = await preview(filters);
      setAudienceCustomers(result.customers);
    } finally {
      setAudienceLoading(false);
    }
  }, [filters, preview]);

  const goToStep2 = () => {
    setStep(2);
    loadAudience();
  };

  const toggleExclude = (id: string) => {
    setExcludedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    await createMutation.mutateAsync({
      name: campaignName.trim(),
      message: message.trim(),
      filters,
      excludedCustomerIds: excludedIds,
    });
    onClose();
  };

  const insertVar = (v: string) => {
    setMessage((prev) => prev + v);
  };

  const effectiveCount = audienceCustomers.length - excludedIds.filter((id) =>
    audienceCustomers.some((c) => c.id === id)
  ).length;

  const canSubmit =
    campaignName.trim().length > 0 &&
    message.trim().length > 0 &&
    message.length <= 320;

  if (!isOpen) return null;

  return createPortal(
    <Overlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Drawer>
        {/* Header */}
        <DrawerHeader>
          <div>
            <HeaderTitle>Nowa kampania SMS</HeaderTitle>
            <HeaderSubtitle>Krok {step} z 3 — {['Filtry odbiorców', 'Podgląd odbiorców', 'Treść i wysyłka'][step - 1]}</HeaderSubtitle>
          </div>
          <CloseBtn onClick={onClose} title="Zamknij">✕</CloseBtn>
        </DrawerHeader>

        {/* Stepper */}
        <StepperBar>
          {[
            { n: 1, label: 'Filtry odbiorców' },
            { n: 2, label: 'Podgląd odbiorców' },
            { n: 3, label: 'Treść i wysyłka' },
          ].map(({ n, label }) => (
            <StepItem
              key={n}
              $active={step === n}
              $done={step > n}
              onClick={() => step > n && setStep(n)}
            >
              <StepNumber $active={step === n} $done={step > n}>
                {step > n ? '✓' : n}
              </StepNumber>
              <StepLabel $active={step === n}>{label}</StepLabel>
            </StepItem>
          ))}
        </StepperBar>

        {/* Body */}
        <DrawerBody>
          {step === 1 && (
            <CampaignFiltersPanel
              filters={filters}
              onChange={setFilters}
              brands={brands}
              availableServices={MOCK_SERVICES}
            />
          )}

          {step === 2 && (
            <AudiencePreview
              customers={audienceCustomers}
              isLoading={audienceLoading}
              excludedIds={excludedIds}
              onToggleExclude={toggleExclude}
            />
          )}

          {step === 3 && (
            <>
              {/* Audience summary */}
              <AudienceSummaryCard>
                <AudienceNumber>{effectiveCount}</AudienceNumber>
                <div>
                  <AudienceLabel>odbiorców otrzyma tę wiadomość</AudienceLabel>
                  {excludedIds.length > 0 && (
                    <div style={{ fontSize: st.fontXs, color: st.textMuted }}>
                      ({excludedIds.length} wykluczono)
                    </div>
                  )}
                </div>
              </AudienceSummaryCard>

              {/* Campaign name */}
              <FormGroup>
                <Label>Nazwa kampanii</Label>
                <Input
                  type="text"
                  placeholder="np. Właściciele BMW – oferta PPF marzec 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  maxLength={100}
                />
              </FormGroup>

              {/* Message */}
              <FormGroup>
                <Label>Treść wiadomości SMS</Label>
                <HintBox>
                  Możesz użyć zmiennych dynamicznych — zostaną one zastąpione danymi klienta przy wysyłce.
                </HintBox>
                <VariableChips>
                  {TEMPLATE_VARS.map((v) => (
                    <VarChip key={v} onClick={() => insertVar(v)} type="button">
                      {v}
                    </VarChip>
                  ))}
                </VariableChips>
                <Textarea
                  placeholder="Treść SMS…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={320}
                />
                <CharCounter $warning={message.length > 280}>
                  {message.length} / 160 znaków
                  {message.length > 160 && message.length <= 320 && ' (2 SMS)'}
                  {message.length > 320 && ' — przekroczono limit!'}
                </CharCounter>
              </FormGroup>
            </>
          )}
        </DrawerBody>

        {/* Footer */}
        <DrawerFooter>
          <div>
            {step > 1 && (
              <BackBtn onClick={() => setStep((s) => s - 1)}>← Wstecz</BackBtn>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <BackBtn onClick={onClose}>Anuluj</BackBtn>
            {step < 3 && (
              <NextBtn onClick={() => (step === 1 ? goToStep2() : setStep(3))}>
                Dalej →
              </NextBtn>
            )}
            {step === 3 && (
              <SubmitBtn
                onClick={handleSubmit}
                disabled={!canSubmit || createMutation.isPending}
              >
                {createMutation.isPending ? 'Zapisywanie…' : '✓ Zapisz kampanię'}
              </SubmitBtn>
            )}
          </div>
        </DrawerFooter>
      </Drawer>
    </Overlay>,
    document.body
  );
};
