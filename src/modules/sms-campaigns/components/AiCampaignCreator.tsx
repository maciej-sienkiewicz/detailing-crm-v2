import React, { useState, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { AudienceCustomer, AgentAudienceResult } from '../types';
import { generateAudienceFromPrompt, createCampaign } from '../api/smsCampaignsApi';

// ─── Animations ────────────────────────────────────────────────────────────────

const dotBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
  30% { transform: translateY(-9px); opacity: 1; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: -600px 0; }
  100% { background-position: 600px 0; }
`;

// ─── Prompt stage ─────────────────────────────────────────────────────────────

const PromptStage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 56px 24px 48px;
  animation: ${fadeIn} 300ms ease both;
`;

const PromptHero = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const SparkIcon = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: ${st.gradientBlue};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  box-shadow: 0 4px 16px rgba(59,130,246,0.28);
  margin-bottom: 4px;
`;

const HeroTitle = styled.h2`
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: ${st.text};
  letter-spacing: -0.5px;
`;

const HeroSubtitle = styled.p`
  margin: 0;
  font-size: ${st.fontSm};
  color: ${st.textMuted};
  max-width: 480px;
  line-height: 1.6;
`;

const PromptBox = styled.div`
  width: 100%;
  max-width: 680px;
  background: ${st.bgCard};
  border: 1.5px solid ${st.border};
  border-radius: 18px;
  box-shadow: ${st.shadowMd};
  overflow: hidden;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus-within {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue}, ${st.shadowMd};
  }
`;

const PromptTextarea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 20px 22px 12px;
  font-size: ${st.fontMd};
  font-family: inherit;
  color: ${st.text};
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  line-height: 1.65;
  box-sizing: border-box;

  &::placeholder {
    color: ${st.textMuted};
  }
`;

const PromptActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 14px;
  border-top: 1px solid ${st.border};
  gap: 10px;
`;

const CharCount = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
`;

const SendButton = styled.button<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 22px;
  font-size: ${st.fontSm};
  font-weight: 700;
  background: ${(p) => (p.$disabled ? st.bgCardAlt : st.gradientBlue)};
  color: ${(p) => (p.$disabled ? st.textMuted : '#fff')};
  border: none;
  border-radius: ${st.radiusFull};
  cursor: ${(p) => (p.$disabled ? 'not-allowed' : 'pointer')};
  transition: all ${st.transition};
  box-shadow: ${(p) => (p.$disabled ? 'none' : '0 2px 8px rgba(59,130,246,0.3)')};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(59,130,246,0.4);
  }
  &:active:not(:disabled) { transform: translateY(0); }
`;

const ExampleChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 680px;
`;

const Chip = styled.button`
  padding: 6px 14px;
  font-size: ${st.fontXs};
  font-weight: 500;
  color: ${st.textSecondary};
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};

  &:hover {
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    border-color: ${st.accentBlue}55;
  }
`;

// ─── Loading stage ─────────────────────────────────────────────────────────────

const LoadingStage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 72px 24px;
  animation: ${fadeIn} 250ms ease both;
`;

const DotsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Dot = styled.span<{ $delay: string }>`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: ${st.accentBlue};
  display: inline-block;
  animation: ${dotBounce} 1.1s ease-in-out infinite;
  animation-delay: ${(p) => p.$delay};
`;

const LoadingLabel = styled.p`
  margin: 0;
  font-size: ${st.fontSm};
  color: ${st.textMuted};
  text-align: center;
  max-width: 380px;
  line-height: 1.6;
`;

const PromptEcho = styled.div`
  max-width: 560px;
  background: ${st.bgCardAlt};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusSm};
  padding: 12px 18px;
  font-size: ${st.fontSm};
  color: ${st.textSecondary};
  text-align: center;
  font-style: italic;
  line-height: 1.55;
`;

// ─── Results stage ─────────────────────────────────────────────────────────────

const ResultsStage = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  animation: ${fadeIn} 300ms ease both;
`;

const ResultsHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ResultsBanner = styled.div`
  background: ${st.accentBlueDim};
  border: 1px solid ${st.accentBlue}33;
  border-radius: ${st.radiusSm};
  padding: 14px 18px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const BannerIcon = styled.span`
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
`;

const BannerText = styled.div`
  flex: 1;
`;

const BannerTitle = styled.p`
  margin: 0 0 2px;
  font-size: ${st.fontSm};
  font-weight: 700;
  color: ${st.accentBlue};
`;

const BannerDesc = styled.p`
  margin: 0;
  font-size: ${st.fontXs};
  color: ${st.textSecondary};
  line-height: 1.55;
`;

const SelectionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const SelectionCount = styled.span`
  font-size: ${st.fontSm};
  font-weight: 600;
  color: ${st.text};
`;

const SelectionActions = styled.div`
  display: flex;
  gap: 8px;
`;

const GhostBtn = styled.button`
  padding: 5px 14px;
  font-size: ${st.fontXs};
  font-weight: 600;
  background: transparent;
  color: ${st.textSecondary};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};
  &:hover { background: ${st.bgCardAlt}; color: ${st.text}; }
`;

// ─── Table ─────────────────────────────────────────────────────────────────────

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  box-shadow: ${st.shadowXs};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: ${st.bgCardAlt};
`;

const Th = styled.th`
  padding: 11px 16px;
  text-align: left;
  font-size: ${st.fontXs};
  font-weight: 700;
  color: ${st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  border-bottom: 1px solid ${st.border};
`;

const ThCenter = styled(Th)`
  text-align: center;
`;

const Tr = styled.tr<{ $checked: boolean }>`
  background: ${(p) => (p.$checked ? st.bgCard : st.bgCardAlt)};
  transition: background ${st.transition};
  opacity: ${(p) => (p.$checked ? 1 : 0.55)};

  &:hover {
    background: ${st.bgAccentBlue};
  }

  &:not(:last-child) td {
    border-bottom: 1px solid ${st.border};
  }
`;

const Td = styled.td`
  padding: 12px 16px;
  font-size: ${st.fontSm};
  color: ${st.text};
  white-space: nowrap;
`;

const TdCenter = styled(Td)`
  text-align: center;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: ${st.accentBlue};
`;

const BadgeVehicle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: ${st.bgCardAlt};
  border: 1px solid ${st.border};
  border-radius: ${st.radiusFull};
  font-size: ${st.fontXs};
  font-weight: 600;
  color: ${st.textSecondary};
`;

const DateText = styled.span`
  font-size: ${st.fontXs};
  color: ${st.textMuted};
`;

// ─── Configure stage ──────────────────────────────────────────────────────────

const ConfigCard = styled.div`
  background: ${st.bgCard};
  border: 1.5px solid ${st.accentBlue}44;
  border-radius: ${st.radius};
  padding: 28px 28px 24px;
  box-shadow: ${st.shadowSm};
`;

const ConfigTitle = styled.h3`
  margin: 0 0 20px;
  font-size: ${st.fontMd};
  font-weight: 800;
  color: ${st.text};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const FieldGroup = styled.div`
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
  font-family: inherit;
  color: ${st.text};
  background: ${st.bgInput};
  border: 1.5px solid ${st.border};
  border-radius: ${st.radiusSm};
  outline: none;
  transition: border-color ${st.transition}, box-shadow ${st.transition};

  &:focus {
    border-color: ${st.accentBlue};
    box-shadow: ${st.shadowBlue};
  }
  &::placeholder { color: ${st.textMuted}; }
`;

const ConfigFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${st.border};
`;

const SummaryText = styled.p`
  margin: 0;
  font-size: ${st.fontXs};
  color: ${st.textMuted};
  line-height: 1.5;
`;

const CreateBtn = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 26px;
  font-size: ${st.fontSm};
  font-weight: 700;
  background: ${st.gradientBlue};
  color: #fff;
  border: none;
  border-radius: ${st.radiusFull};
  cursor: ${(p) => (p.$loading ? 'not-allowed' : 'pointer')};
  opacity: ${(p) => (p.$loading ? 0.7 : 1)};
  transition: all ${st.transition};
  box-shadow: 0 2px 8px rgba(59,130,246,0.3);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(59,130,246,0.4);
  }
`;

// ─── Success stage ─────────────────────────────────────────────────────────────

const SuccessStage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 64px 24px;
  text-align: center;
  animation: ${fadeIn} 300ms ease both;
`;

const SuccessCircle = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${st.accentGreenDim};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
`;

const SuccessTitle = styled.h3`
  margin: 0;
  font-size: ${st.fontXl};
  font-weight: 800;
  color: ${st.text};
`;

const SuccessDesc = styled.p`
  margin: 0;
  font-size: ${st.fontSm};
  color: ${st.textMuted};
  max-width: 400px;
  line-height: 1.6;
`;

const StartOverBtn = styled.button`
  padding: 9px 24px;
  font-size: ${st.fontSm};
  font-weight: 600;
  background: transparent;
  color: ${st.accentBlue};
  border: 1.5px solid ${st.accentBlue};
  border-radius: ${st.radiusFull};
  cursor: pointer;
  transition: all ${st.transition};
  &:hover { background: ${st.accentBlueDim}; }
`;

// ─── Outer wrapper ─────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

// ─── Shimmer (skeleton) ───────────────────────────────────────────────────────

const ShimmerRow = styled.div`
  height: 44px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    ${st.bgCardAlt} 25%,
    ${st.border} 50%,
    ${st.bgCardAlt} 75%
  );
  background-size: 600px 100%;
  animation: ${shimmer} 1.4s infinite linear;
  margin-bottom: 8px;
`;

// ─── Example prompts ──────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  'Klienci z BMW, którzy klejili PPF w ostatnim roku',
  'Osoby bez wizyty od ponad 6 miesięcy',
  'Właściciele Audi i Porsche – oferta ceramiki',
  'Klienci, którzy wydali ponad 3000 zł w tym roku',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

type Phase = 'prompt' | 'loading' | 'results' | 'success';

// ─── Component ────────────────────────────────────────────────────────────────

export const AiCampaignCreator: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('prompt');
  const [promptText, setPromptText] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [agentResult, setAgentResult] = useState<AgentAudienceResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [campaignTitle, setCampaignTitle] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    if (!promptText.trim()) return;
    const prompt = promptText.trim();
    setLastPrompt(prompt);
    setPhase('loading');

    try {
      const result = await generateAudienceFromPrompt({ prompt });
      setAgentResult(result);
      setSelectedIds(new Set(result.customers.map((c) => c.id)));
      setPhase('results');
    } catch {
      setPhase('prompt');
    }
  }, [promptText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleCustomer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (agentResult) setSelectedIds(new Set(agentResult.customers.map((c) => c.id)));
  };

  const deselectAll = () => setSelectedIds(new Set());

  const handleCreate = async () => {
    if (!campaignTitle.trim() || selectedIds.size === 0) return;
    setIsCreating(true);
    try {
      await createCampaign({
        name: campaignTitle.trim(),
        message: '',
        filters: { vehicles: [], services: [], lastVisit: null },
        excludedCustomerIds: (agentResult?.customers ?? [])
          .filter((c) => !selectedIds.has(c.id))
          .map((c) => c.id),
        scheduledAt: launchDate ? new Date(launchDate).toISOString() : undefined,
      });
      setPhase('success');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartOver = () => {
    setPhase('prompt');
    setPromptText('');
    setLastPrompt('');
    setAgentResult(null);
    setSelectedIds(new Set());
    setCampaignTitle('');
    setLaunchDate('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // ── Prompt phase ──
  if (phase === 'prompt') {
    return (
      <Wrapper>
        <PromptStage>
          <PromptHero>
            <SparkIcon>✨</SparkIcon>
            <HeroTitle>Kreator kampanii AI</HeroTitle>
            <HeroSubtitle>
              Opisz w języku naturalnym, do jakich klientów chcesz dotrzeć.
              Agenci przeszukają bazę i zaproponują listę odbiorców.
            </HeroSubtitle>
          </PromptHero>

          <PromptBox>
            <PromptTextarea
              ref={textareaRef}
              placeholder="Np. stwórz kampanię SMS do wszystkich osób, które w ostatnim roku odwiedziły nasz salon i mają samochód BMW i mieli oklejany cały samochód folią PPF…"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
              autoFocus
            />
            <PromptActions>
              <CharCount>{promptText.length}/500 · Ctrl+Enter aby wysłać</CharCount>
              <SendButton
                $disabled={!promptText.trim()}
                disabled={!promptText.trim()}
                onClick={handleSend}
              >
                <span>Szukaj klientów</span>
                <span>→</span>
              </SendButton>
            </PromptActions>
          </PromptBox>

          <ExampleChips>
            {EXAMPLE_PROMPTS.map((ex) => (
              <Chip key={ex} onClick={() => setPromptText(ex)}>
                {ex}
              </Chip>
            ))}
          </ExampleChips>
        </PromptStage>
      </Wrapper>
    );
  }

  // ── Loading phase ──
  if (phase === 'loading') {
    return (
      <Wrapper>
        <LoadingStage>
          <DotsRow>
            <Dot $delay="0s" />
            <Dot $delay="0.18s" />
            <Dot $delay="0.36s" />
          </DotsRow>
          <LoadingLabel>
            Agenci przeszukują bazę klientów i dopasowują kryteria…
          </LoadingLabel>
          {lastPrompt && (
            <PromptEcho>„{lastPrompt}"</PromptEcho>
          )}
          {[1, 2, 3, 4].map((i) => (
            <ShimmerRow key={i} style={{ width: `${90 - i * 6}%`, maxWidth: 640 }} />
          ))}
        </LoadingStage>
      </Wrapper>
    );
  }

  // ── Success phase ──
  if (phase === 'success') {
    return (
      <Wrapper>
        <SuccessStage>
          <SuccessCircle>✓</SuccessCircle>
          <SuccessTitle>Kampania została utworzona!</SuccessTitle>
          <SuccessDesc>
            Kampania „{campaignTitle}" trafiła do zakładki Kampanie.
            {launchDate
              ? ` Zostanie uruchomiona ${formatDate(launchDate)}.`
              : ' Możesz ją wysłać ręcznie z listy kampanii.'}
          </SuccessDesc>
          <StartOverBtn onClick={handleStartOver}>
            Utwórz kolejną kampanię
          </StartOverBtn>
        </SuccessStage>
      </Wrapper>
    );
  }

  // ── Results phase ──
  const customers = agentResult?.customers ?? [];
  const selectedCount = selectedIds.size;

  return (
    <Wrapper>
      <ResultsStage>
        {/* Banner */}
        <ResultsHeader>
          {agentResult?.generatedFiltersDescription && (
            <ResultsBanner>
              <BannerIcon>🤖</BannerIcon>
              <BannerText>
                <BannerTitle>Agenci znaleźli {customers.length} klientów</BannerTitle>
                <BannerDesc>{agentResult.generatedFiltersDescription}</BannerDesc>
              </BannerText>
            </ResultsBanner>
          )}

          <SelectionBar>
            <SelectionCount>
              Zaznaczono {selectedCount} z {customers.length} klientów
            </SelectionCount>
            <SelectionActions>
              <GhostBtn onClick={handleStartOver}>← Zmień prompt</GhostBtn>
              <GhostBtn onClick={selectAll}>Zaznacz wszystkich</GhostBtn>
              <GhostBtn onClick={deselectAll}>Odznacz wszystkich</GhostBtn>
            </SelectionActions>
          </SelectionBar>
        </ResultsHeader>

        {/* Table */}
        <TableWrap>
          <Table>
            <Thead>
              <tr>
                <ThCenter style={{ width: 44 }}>
                  <Checkbox
                    type="checkbox"
                    checked={selectedCount === customers.length && customers.length > 0}
                    onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                    title="Zaznacz / odznacz wszystkich"
                  />
                </ThCenter>
                <Th>Klient</Th>
                <Th>Telefon</Th>
                <Th>Pojazd</Th>
                <Th>Ostatnia wizyta</Th>
              </tr>
            </Thead>
            <tbody>
              {customers.map((c: AudienceCustomer) => (
                <Tr
                  key={c.id}
                  $checked={selectedIds.has(c.id)}
                  onClick={() => toggleCustomer(c.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <TdCenter onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleCustomer(c.id)}
                    />
                  </TdCenter>
                  <Td>
                    <span style={{ fontWeight: 600 }}>{c.firstName} {c.lastName}</span>
                  </Td>
                  <Td style={{ color: st.textSecondary }}>{c.phone}</Td>
                  <Td>
                    {(c.vehicleBrand || c.vehicleModel) && (
                      <BadgeVehicle>
                        🚗 {[c.vehicleBrand, c.vehicleModel].filter(Boolean).join(' ')}
                      </BadgeVehicle>
                    )}
                  </Td>
                  <Td>
                    <DateText>{formatDate(c.lastVisitDate)}</DateText>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>

        {/* Configure campaign */}
        <ConfigCard>
          <ConfigTitle>
            <span>📋</span> Konfiguracja kampanii
          </ConfigTitle>

          <ConfigGrid>
            <FieldGroup>
              <Label htmlFor="ai-camp-title">Tytuł kampanii *</Label>
              <Input
                id="ai-camp-title"
                type="text"
                placeholder="Np. BMW PPF – oferta specjalna"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
              />
            </FieldGroup>
            <FieldGroup>
              <Label htmlFor="ai-camp-date">Data uruchomienia</Label>
              <Input
                id="ai-camp-date"
                type="datetime-local"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
              />
            </FieldGroup>
          </ConfigGrid>

          <ConfigFooter>
            <SummaryText>
              Kampania zostanie zapisana jako szkic.{' '}
              {launchDate
                ? `Zaplanowana wysyłka: ${formatDate(launchDate)}.`
                : 'Brak daty — wyślij ręcznie z zakładki Kampanie.'}
              {' '}Odbiorcy: <strong>{selectedCount}</strong>.
            </SummaryText>
            <CreateBtn
              $loading={isCreating}
              disabled={isCreating || !campaignTitle.trim() || selectedCount === 0}
              onClick={handleCreate}
            >
              {isCreating ? (
                <>
                  <DotsRow style={{ gap: 5 }}>
                    <Dot $delay="0s" style={{ width: 7, height: 7 }} />
                    <Dot $delay="0.18s" style={{ width: 7, height: 7 }} />
                    <Dot $delay="0.36s" style={{ width: 7, height: 7 }} />
                  </DotsRow>
                  Tworzenie…
                </>
              ) : (
                <>✓ Utwórz kampanię</>
              )}
            </CreateBtn>
          </ConfigFooter>
        </ConfigCard>
      </ResultsStage>
    </Wrapper>
  );
};
