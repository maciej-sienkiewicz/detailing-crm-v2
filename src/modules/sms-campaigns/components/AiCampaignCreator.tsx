import React, { useState, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { ArrowRight, RotateCcw, Users, CheckCircle2 } from 'lucide-react';
import type { AudienceCustomer, AgentAudienceResult } from '../types';
import { generateAudienceFromPrompt, createCampaign } from '../api/smsCampaignsApi';

// ─── Animations ────────────────────────────────────────────────────────────────

const dotBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
  30%           { transform: translateY(-8px); opacity: 1; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmerAnim = keyframes`
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
`;

// ─── Prompt input ─────────────────────────────────────────────────────────────

const PromptWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: ${fadeIn} 250ms ease both;
`;

const PromptLabel = styled.p`
  margin: 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
`;

const PromptBox = styled.div`
  background: #fff;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 150ms, box-shadow 150ms;
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);

  &:focus-within {
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
  }
`;

const PromptTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 16px 18px 10px;
  font-size: 14px;
  font-family: inherit;
  color: #0F172A;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  line-height: 1.65;
  box-sizing: border-box;

  &::placeholder { color: #CBD5E1; }
`;

const PromptFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px 12px;
  border-top: 1px solid #F1F5F9;
  gap: 10px;
`;

const Hint = styled.span`
  font-size: 11px;
  color: #CBD5E1;
`;

const SearchBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  background: ${p => p.$active ? 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)' : '#F1F5F9'};
  color: ${p => p.$active ? '#fff' : '#94A3B8'};
  border: none;
  border-radius: 8px;
  cursor: ${p => p.$active ? 'pointer' : 'not-allowed'};
  transition: all 150ms ease;
  box-shadow: ${p => p.$active ? '0 2px 8px rgba(59,130,246,0.28)' : 'none'};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59,130,246,0.36);
  }
`;

const ExampleChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
`;

const ChipsLabel = styled.span`
  font-size: 11px;
  color: #94A3B8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  align-self: center;
  flex-shrink: 0;
`;

const Chip = styled.button`
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 999px;
  cursor: pointer;
  transition: all 150ms ease;
  text-align: left;

  &:hover {
    background: #EFF6FF;
    color: #2563EB;
    border-color: #BFDBFE;
  }
`;

// ─── Loading ──────────────────────────────────────────────────────────────────

const LoadingWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 52px 24px;
  animation: ${fadeIn} 200ms ease both;
`;

const DotsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Dot = styled.span<{ $delay: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3B82F6;
  animation: ${dotBounce} 1.1s ease-in-out infinite;
  animation-delay: ${p => p.$delay};
`;

const LoadingText = styled.p`
  margin: 0;
  font-size: 13px;
  color: #64748B;
  text-align: center;
`;

const PromptEcho = styled.div`
  padding: 10px 16px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 12px;
  color: #64748B;
  font-style: italic;
  text-align: center;
  max-width: 480px;
`;

const ShimmerRow = styled.div<{ $w: string }>`
  height: 12px;
  width: ${p => p.$w};
  border-radius: 4px;
  background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
  background-size: 600px 100%;
  animation: ${shimmerAnim} 1.4s infinite linear;
`;

// ─── Results ──────────────────────────────────────────────────────────────────

const ResultsWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: ${fadeIn} 250ms ease both;
`;

const ResultsTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const ResultsSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #0F172A;
  font-weight: 500;
`;

const ResultsActions = styled.div`
  display: flex;
  gap: 8px;
`;

const GhostBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  color: #64748B;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 150ms ease;
  &:hover { background: #F8FAFC; color: #0F172A; border-color: #CBD5E1; }
`;

// ─── Table ─────────────────────────────────────────────────────────────────────

const TableWrap = styled.div`
  border: 1px solid #E2E8F0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
`;

const Th = styled.th`
  padding: 10px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
`;

const Tr = styled.tr<{ $checked: boolean }>`
  background: #fff;
  opacity: ${p => p.$checked ? 1 : 0.45};
  cursor: pointer;
  transition: background 120ms, opacity 120ms;
  border-bottom: 1px solid #F1F5F9;

  &:last-child { border-bottom: none; }
  &:hover { background: #F8FAFC; }
`;

const Td = styled.td`
  padding: 11px 14px;
  font-size: 13px;
  color: #0F172A;
  white-space: nowrap;
`;

const TdCenter = styled(Td)`
  text-align: center;
  width: 40px;
`;

const Checkbox = styled.input`
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: #3B82F6;
`;

const VehiclePill = styled.span`
  font-size: 11px;
  color: #475569;
  background: #F1F5F9;
  border: 1px solid #E2E8F0;
  border-radius: 999px;
  padding: 2px 8px;
  font-weight: 500;
`;

const DateCell = styled.span`
  font-size: 12px;
  color: #94A3B8;
`;

// ─── Config card ──────────────────────────────────────────────────────────────

const ConfigCard = styled.div`
  background: #fff;
  border: 1.5px solid #BFDBFE;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(59,130,246,0.06);
`;

const ConfigTitle = styled.h3`
  margin: 0 0 18px;
  font-size: 14px;
  font-weight: 700;
  color: #0F172A;
`;

const ConfigGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-size: 11px;
  font-weight: 700;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  padding: 9px 12px;
  font-size: 13px;
  font-family: inherit;
  color: #0F172A;
  background: #fff;
  border: 1.5px solid #E2E8F0;
  border-radius: 8px;
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;

  &:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
  &::placeholder { color: #CBD5E1; }
`;

const ConfigBottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid #F1F5F9;
`;

const ConfigNote = styled.p`
  margin: 0;
  font-size: 12px;
  color: #94A3B8;
  line-height: 1.5;
`;

const CreateBtn = styled.button<{ $disabled: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 22px;
  font-size: 13px;
  font-weight: 700;
  background: ${p => p.$disabled ? '#F1F5F9' : 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)'};
  color: ${p => p.$disabled ? '#94A3B8' : '#fff'};
  border: none;
  border-radius: 8px;
  cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 150ms ease;
  box-shadow: ${p => p.$disabled ? 'none' : '0 2px 8px rgba(59,130,246,0.28)'};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59,130,246,0.36);
  }
`;

// ─── Success ──────────────────────────────────────────────────────────────────

const SuccessWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  text-align: center;
  animation: ${fadeIn} 250ms ease both;
`;

const SuccessCircle = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #DCFCE7;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #16A34A;
`;

const SuccessTitle = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0F172A;
`;

const SuccessDesc = styled.p`
  margin: 0;
  font-size: 13px;
  color: #64748B;
  max-width: 380px;
  line-height: 1.6;
`;

const RestartBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  font-size: 13px;
  font-weight: 600;
  background: transparent;
  color: #3B82F6;
  border: 1.5px solid #3B82F6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;
  margin-top: 4px;
  &:hover { background: #EFF6FF; }
`;

// ─── Example prompts ──────────────────────────────────────────────────────────

const EXAMPLES = [
  'Klienci z BMW z oklejaniem PPF w ostatnim roku',
  'Osoby bez wizyty od ponad 6 miesięcy',
  'Właściciele Audi – oferta ceramiki',
  'Klienci, którzy odwiedzili nas w 2025 roku',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

type Phase = 'prompt' | 'loading' | 'results' | 'success';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AiCampaignCreator: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [phase, setPhase] = useState<Phase>('prompt');
  const [promptText, setPromptText] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [result, setResult] = useState<AgentAudienceResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSearch = useCallback(async () => {
    if (!promptText.trim()) return;
    const prompt = promptText.trim();
    setLastPrompt(prompt);
    setPhase('loading');
    try {
      const data = await generateAudienceFromPrompt({ prompt });
      setResult(data);
      setSelectedIds(new Set(data.customers.map(c => c.id)));
      setPhase('results');
    } catch {
      setPhase('prompt');
    }
  }, [promptText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSearch();
    }
  };

  const toggleCustomer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!title.trim() || selectedIds.size === 0) return;
    setIsCreating(true);
    try {
      await createCampaign({
        name: title.trim(),
        message: '',
        filters: { vehicles: [], services: [], lastVisit: null },
        excludedCustomerIds: (result?.customers ?? [])
          .filter(c => !selectedIds.has(c.id))
          .map(c => c.id),
        scheduledAt: launchDate ? new Date(launchDate).toISOString() : undefined,
      });
      setPhase('success');
      onSuccess();
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestart = () => {
    setPhase('prompt');
    setPromptText('');
    setLastPrompt('');
    setResult(null);
    setSelectedIds(new Set());
    setTitle('');
    setLaunchDate('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const customers = result?.customers ?? [];
  const selectedCount = selectedIds.size;

  // ── Prompt ──
  if (phase === 'prompt') {
    return (
      <PromptWrap>
        <PromptLabel>
          Opisz w kilku słowach, do jakich klientów chcesz wysłać kampanię.
          Przeszukamy bazę i zaproponujemy listę odbiorców.
        </PromptLabel>

        <PromptBox>
          <PromptTextarea
            ref={textareaRef}
            autoFocus
            placeholder="Np. klienci posiadający BMW, którzy w ostatnim roku odwiedzili salon i mieli oklejany samochód folią PPF…"
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
          />
          <PromptFooter>
            <Hint>Ctrl+Enter aby wyszukać · {promptText.length}/500</Hint>
            <SearchBtn
              $active={!!promptText.trim()}
              disabled={!promptText.trim()}
              onClick={handleSearch}
            >
              Znajdź klientów
              <ArrowRight size={14} strokeWidth={2.5} />
            </SearchBtn>
          </PromptFooter>
        </PromptBox>

        <ExampleChips>
          <ChipsLabel>Przykłady:</ChipsLabel>
          {EXAMPLES.map(ex => (
            <Chip key={ex} onClick={() => setPromptText(ex)}>{ex}</Chip>
          ))}
        </ExampleChips>
      </PromptWrap>
    );
  }

  // ── Loading ──
  if (phase === 'loading') {
    return (
      <LoadingWrap>
        <DotsRow>
          <Dot $delay="0s" />
          <Dot $delay="0.18s" />
          <Dot $delay="0.36s" />
        </DotsRow>
        <LoadingText>Przeszukiwanie bazy klientów…</LoadingText>
        {lastPrompt && <PromptEcho>„{lastPrompt}"</PromptEcho>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 560 }}>
          {[90, 75, 82, 65].map((w, i) => (
            <ShimmerRow key={i} $w={`${w}%`} />
          ))}
        </div>
      </LoadingWrap>
    );
  }

  // ── Success ──
  if (phase === 'success') {
    return (
      <SuccessWrap>
        <SuccessCircle><CheckCircle2 size={26} strokeWidth={2} /></SuccessCircle>
        <SuccessTitle>Kampania została zapisana</SuccessTitle>
        <SuccessDesc>
          „{title}" trafiła do listy kampanii.
          {launchDate
            ? ` Zostanie uruchomiona ${fmtDate(launchDate)}.`
            : ' Możesz ją wysłać ręcznie z listy poniżej.'}
        </SuccessDesc>
        <RestartBtn onClick={handleRestart}>
          <RotateCcw size={13} strokeWidth={2} />
          Utwórz kolejną kampanię
        </RestartBtn>
      </SuccessWrap>
    );
  }

  // ── Results ──
  return (
    <ResultsWrap>
      <ResultsTopBar>
        <ResultsSummary>
          <Users size={15} strokeWidth={2} color="#3B82F6" />
          <span>
            Znaleziono <strong>{customers.length}</strong> klientów
            {result?.generatedFiltersDescription && (
              <> · <span style={{ color: '#64748B', fontWeight: 400 }}>{result.generatedFiltersDescription}</span></>
            )}
          </span>
        </ResultsSummary>
        <ResultsActions>
          <GhostBtn onClick={handleRestart}>
            <RotateCcw size={12} strokeWidth={2} />
            Zmień opis
          </GhostBtn>
          <GhostBtn onClick={() => setSelectedIds(new Set(customers.map(c => c.id)))}>
            Zaznacz wszystkich
          </GhostBtn>
          <GhostBtn onClick={() => setSelectedIds(new Set())}>
            Odznacz wszystkich
          </GhostBtn>
        </ResultsActions>
      </ResultsTopBar>

      <TableWrap>
        <Table>
          <Thead>
            <tr>
              <Th style={{ width: 40, textAlign: 'center' }}>
                <Checkbox
                  type="checkbox"
                  checked={selectedCount === customers.length && customers.length > 0}
                  onChange={e => e.target.checked
                    ? setSelectedIds(new Set(customers.map(c => c.id)))
                    : setSelectedIds(new Set())
                  }
                />
              </Th>
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
              >
                <TdCenter onClick={e => e.stopPropagation()}>
                  <Checkbox
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleCustomer(c.id)}
                  />
                </TdCenter>
                <Td style={{ fontWeight: 600 }}>{c.firstName} {c.lastName}</Td>
                <Td style={{ color: '#64748B' }}>{c.phone}</Td>
                <Td>
                  {(c.vehicleBrand || c.vehicleModel) && (
                    <VehiclePill>{[c.vehicleBrand, c.vehicleModel].filter(Boolean).join(' ')}</VehiclePill>
                  )}
                </Td>
                <Td><DateCell>{fmtDate(c.lastVisitDate)}</DateCell></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      <ConfigCard>
        <ConfigTitle>Ustawienia kampanii</ConfigTitle>
        <ConfigGrid>
          <FieldGroup>
            <Label htmlFor="camp-title">Nazwa kampanii *</Label>
            <Input
              id="camp-title"
              type="text"
              placeholder="Np. BMW PPF – oferta specjalna"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="camp-date">Data wysyłki</Label>
            <Input
              id="camp-date"
              type="datetime-local"
              value={launchDate}
              onChange={e => setLaunchDate(e.target.value)}
            />
          </FieldGroup>
        </ConfigGrid>

        <ConfigBottom>
          <ConfigNote>
            Odbiorcy: <strong>{selectedCount}</strong> z {customers.length}.
            {!launchDate && ' Bez daty – możesz wysłać ręcznie.'}
          </ConfigNote>
          <CreateBtn
            $disabled={isCreating || !title.trim() || selectedCount === 0}
            disabled={isCreating || !title.trim() || selectedCount === 0}
            onClick={handleCreate}
          >
            {isCreating ? (
              <DotsRow style={{ gap: 5 }}>
                <Dot $delay="0s" style={{ width: 7, height: 7, background: '#94A3B8' }} />
                <Dot $delay="0.18s" style={{ width: 7, height: 7, background: '#94A3B8' }} />
                <Dot $delay="0.36s" style={{ width: 7, height: 7, background: '#94A3B8' }} />
              </DotsRow>
            ) : (
              <CheckCircle2 size={14} strokeWidth={2.5} />
            )}
            {isCreating ? 'Zapisywanie…' : 'Zapisz kampanię'}
          </CreateBtn>
        </ConfigBottom>
      </ConfigCard>
    </ResultsWrap>
  );
};
