import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { Gem, Gift, Moon, Repeat, Car, Send } from 'lucide-react';
import { Stepper } from '@/common/components/Stepper/Stepper';
import {
  useActivateCampaign,
  useAudienceEstimate,
  useCampaign,
  useCreateCampaign,
  useScheduleCampaign,
  useUpdateCampaign,
} from '../hooks/useCampaigns';
import { KIND_DESCRIPTIONS, SCENARIOS } from '../constants';
import { emptyAudience } from '../types';
import type { AudienceCriteria, CampaignChannel, CampaignKind, Scenario, ScenarioId, TriggerConfig } from '../types';
import { AudienceBuilder, audienceChips, Chip, ChipRow, useServiceCatalog } from '../components/AudienceBuilder';
import { AudienceEstimatePanel } from '../components/AudienceEstimatePanel';
import { MessageEditor, type MessageContent } from '../components/MessageEditor';
import { Eyebrow, Page, SectionCard } from '../components/shared';
import { smsMeta } from '../utils/sms';

// ─── Styles ───────────────────────────────────────────────────────────────────

const WizardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px; color: ${(p) => p.theme.colors.text}; }
`;

const TwoCols = styled.div`
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 20px;
  align-items: start;

  @media (max-width: 1023px) { grid-template-columns: 1fr; }
`;

const KindGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  max-width: 700px;

  @media (max-width: 767px) { grid-template-columns: 1fr; }
`;

const KindCard = styled.button`
  text-align: left;
  background: #ffffff;
  border: 2px solid ${(p) => p.theme.colors.border};
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  font-family: inherit;
  transition: all 180ms ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

  &:hover {
    border-color: #0ea5e9;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }

  svg { width: 24px; height: 24px; stroke-width: 1.75; color: #0ea5e9; margin-bottom: 12px; display: block; }
  h3 { margin: 0 0 6px; font-size: 17px; font-weight: 700; color: ${(p) => p.theme.colors.text}; }
  p  { margin: 0; font-size: 13px; color: ${(p) => p.theme.colors.textMuted}; line-height: 1.5; }
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 600px;

  @media (max-width: 767px) { grid-template-columns: 1fr; }
`;

const ScenarioCard = styled.button<{ $selected: boolean }>`
  text-align: left;
  background: #ffffff;
  border: 1.5px solid ${(p) => (p.$selected ? '#0ea5e9' : p.theme.colors.border)};
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  font-family: inherit;
  transition: all 180ms ease;
  box-shadow: ${(p) => (p.$selected ? '0 0 0 3px rgba(14,165,233,0.18)' : 'none')};

  &:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08); }

  svg { width: 16px; height: 16px; stroke-width: 1.75; color: #0ea5e9; margin-bottom: 8px; display: block; }
  h3 { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: ${(p) => p.theme.colors.text}; }
  p  { margin: 0; font-size: 12.5px; color: ${(p) => p.theme.colors.textMuted}; line-height: 1.4; }
`;

const GroupIntro = styled.p`
  margin: 4px 0 16px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

const SkipLink = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  color: ${(p) => p.theme.colors.textSecondary};
  padding: 0;
  margin-top: 14px;
  text-decoration: underline;
  text-decoration-color: ${(p) => p.theme.colors.border};

  &:hover { color: ${(p) => p.theme.colors.text}; }
`;

const NavRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
`;

const PrimaryBtn = styled.button`
  background: #0ea5e9;
  color: #fff;
  border: none;
  cursor: pointer;
  padding: 10px 24px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  transition: all 180ms ease;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);

  &:hover:not(:disabled) { background: #0284c7; transform: translateY(-1px); }
  &:disabled { opacity: 0.5; cursor: default; }
`;

const GhostBtn = styled.button`
  background: transparent;
  color: ${(p) => p.theme.colors.textSecondary};
  border: 1px solid ${(p) => p.theme.colors.border};
  cursor: pointer;
  padding: 10px 24px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  transition: all 180ms ease;

  &:hover { background: ${(p) => p.theme.colors.surfaceAlt}; }
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
`;

const FormLabel = styled.label`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${(p) => p.theme.colors.textMuted};
`;

const FormInput = styled.input`
  padding: 10px 14px;
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  max-width: 420px;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
  }
`;

const FormSelect = styled.select`
  padding: 10px 14px;
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  max-width: 420px;
  background: #ffffff;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
  }
`;

const ScheduleNote = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
  max-width: 560px;
  line-height: 1.5;
`;

const RecapList = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: 180px 1fr;
  row-gap: 10px;
  font-size: 14px;

  dt { color: ${(p) => p.theme.colors.textMuted}; }
  dd { margin: 0; font-weight: 600; color: ${(p) => p.theme.colors.text}; font-variant-numeric: tabular-nums; }
`;

// ─── Ikony scenariuszy ────────────────────────────────────────────────────────

const SCENARIO_ICONS: Partial<Record<ScenarioId, React.ElementType>> = {
  HOLIDAY: Gift,
  REACTIVATION: Moon,
  VEHICLE_OWNERS: Car,
  VIP: Gem,
  SERVICE_FOLLOW_UP: Repeat,
};

// ─── Widok ────────────────────────────────────────────────────────────────────

type StepId = 'scenario' | 'audience' | 'content' | 'summary';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'scenario', label: 'Scenariusz' },
  { id: 'audience', label: 'Odbiorcy' },
  { id: 'content', label: 'Treść' },
  { id: 'summary', label: 'Podsumowanie' },
];

type ScheduleMode = 'NOW' | 'AT' | 'ACTIVATE';

export function CampaignWizardView() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = !!editId;

  const { campaign: existing } = useCampaign(editId);
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const scheduleCampaign = useScheduleCampaign();
  const activateCampaign = useActivateCampaign();
  const { services, serviceNames } = useServiceCatalog();

  const [step, setStep] = useState<StepId>(isEdit ? 'audience' : 'scenario');
  const [kindPhase, setKindPhase] = useState<'kind' | 'preset'>('kind');
  const [scenarioId, setScenarioId] = useState<ScenarioId | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CampaignKind>('ONE_TIME');
  const [audience, setAudience] = useState<AudienceCriteria>(emptyAudience());
  const [content, setContent] = useState<MessageContent>({
    channel: 'SMS', smsTemplate: '', emailSubject: '', emailBody: '',
  });
  const [trigger, setTrigger] = useState<TriggerConfig>({
    serviceIds: [], afterDays: 180, sendTime: '10:00', onlyIfNoVisitSince: true,
  });
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('NOW');
  const [scheduleAt, setScheduleAt] = useState('');

  // Prefill z edytowanej kampanii
  useEffect(() => {
    if (existing && isEdit) {
      setName(existing.name);
      setKind(existing.kind);
      setAudience(existing.audience);
      setContent({
        channel: existing.channel,
        smsTemplate: existing.smsTemplate ?? '',
        emailSubject: existing.emailSubject ?? '',
        emailBody: existing.emailBody ?? '',
      });
      if (existing.trigger) setTrigger(existing.trigger);
      if (existing.kind === 'AUTOMATIC') setScheduleMode('ACTIVATE');
    }
  }, [existing, isEdit]);

  // Prefill ze scenariusza w URL (karty na pustym stanie listy)
  useEffect(() => {
    const fromUrl = searchParams.get('scenario') as ScenarioId | null;
    if (fromUrl && !isEdit) {
      const s = SCENARIOS.find((x) => x.id === fromUrl);
      if (s) {
        applyScenario(s);
        setKindPhase('preset');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyScenario = (s: Scenario) => {
    setScenarioId(s.id);
    setKind(s.kind);
    setName(s.title);
    setAudience({ ...emptyAudience(), ...s.prefillAudience });
    if (s.prefillSms) setContent((c) => ({ ...c, smsTemplate: s.prefillSms! }));
    if (s.prefillTrigger) setTrigger((t) => ({ ...t, ...s.prefillTrigger }));
    setScheduleMode(s.kind === 'AUTOMATIC' ? 'ACTIVATE' : 'NOW');
  };

  const estimateChannel = content.channel === 'EMAIL' ? 'EMAIL' : 'SMS';
  const { estimate, isEstimating } = useAudienceEstimate(audience, estimateChannel, content.smsTemplate || undefined);

  const chips = useMemo(() => audienceChips(audience, serviceNames), [audience, serviceNames]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const completedSteps = STEPS.slice(0, stepIndex).map((s) => s.id);
  const visibleSteps = isEdit ? STEPS.filter((s) => s.id !== 'scenario') : STEPS;

  const canLeaveContent =
    (content.channel !== 'EMAIL' ? content.smsTemplate.trim().length > 0 : true) &&
    (content.channel !== 'SMS' ? content.emailSubject.trim().length > 0 && content.emailBody.trim().length > 0 : true);

  const buildPayload = () => ({
    name,
    kind,
    channel: content.channel as CampaignChannel,
    audience,
    smsTemplate: content.channel !== 'EMAIL' ? content.smsTemplate : null,
    emailSubject: content.channel !== 'SMS' ? content.emailSubject : null,
    emailBody: content.channel !== 'SMS' ? content.emailBody : null,
    scheduledAt: scheduleMode === 'AT' && scheduleAt ? new Date(scheduleAt).toISOString() : null,
    trigger: kind === 'AUTOMATIC' ? trigger : null,
  });

  const finish = async () => {
    const payload = buildPayload();
    const saved = isEdit
      ? await updateCampaign.mutateAsync({ id: editId!, payload })
      : await createCampaign.mutateAsync(payload);
    const campaignId = (saved as { id: string }).id ?? editId!;

    if (kind === 'AUTOMATIC') {
      if (!isEdit || existing?.status === 'DRAFT') await activateCampaign.mutateAsync(campaignId);
    } else if (existing?.status !== 'SCHEDULED' || !isEdit) {
      await scheduleCampaign.mutateAsync({
        id: campaignId,
        scheduledAt: scheduleMode === 'AT' && scheduleAt ? new Date(scheduleAt).toISOString() : null,
      });
    }
    navigate(`/campaigns/${campaignId}`);
  };

  const saveDraft = async () => {
    const payload = buildPayload();
    if (isEdit) {
      await updateCampaign.mutateAsync({ id: editId!, payload });
      navigate(`/campaigns/${editId}`);
    } else {
      const saved = await createCampaign.mutateAsync(payload);
      navigate(`/campaigns/${(saved as { id: string }).id}`);
    }
  };

  const isSaving =
    createCampaign.isPending || updateCampaign.isPending ||
    scheduleCampaign.isPending || activateCampaign.isPending;

  const smsSegments = smsMeta(content.smsTemplate).segments;
  const estimatedCredits =
    content.channel !== 'EMAIL' && estimate ? estimate.eligible * Math.max(smsSegments, 1) : null;

  return (
    <Page>
      <WizardHeader>
        <h1>{isEdit ? `Edytujesz: ${existing?.name ?? ''}` : 'Nowa kampania'}</h1>
        <GhostBtn onClick={() => navigate(isEdit ? `/campaigns/${editId}` : '/campaigns')}>
          {isEdit ? 'Odrzuć zmiany' : 'Anuluj'}
        </GhostBtn>
      </WizardHeader>

      <Stepper steps={visibleSteps} currentStepId={step} completedSteps={completedSteps} />

      {/* ── Krok 1: Scenariusz ── */}
      {step === 'scenario' && (
        <>
          {kindPhase === 'kind' && (
            <div>
              <GroupIntro>Wybierz rodzaj kampanii, żeby zacząć.</GroupIntro>
              <KindGrid>
                <KindCard type="button" onClick={() => { setKind('ONE_TIME'); setScheduleMode('NOW'); setKindPhase('preset'); }}>
                  <Send />
                  <h3>Jednorazowa wysyłka</h3>
                  <p>Wyślij raz — teraz lub w wybranym terminie — do wybranej grupy klientów. Idealna do promocji, życzeń i ogłoszeń.</p>
                </KindCard>
                <KindCard type="button" onClick={() => { setKind('AUTOMATIC'); setScheduleMode('ACTIVATE'); setKindPhase('preset'); }}>
                  <Repeat />
                  <h3>Kampania automatyczna</h3>
                  <p>Działa stale: wysyła wiadomość do każdego klienta, gdy spełni warunek — np. 180 dni od wykonanej usługi.</p>
                </KindCard>
              </KindGrid>
            </div>
          )}

          {kindPhase === 'preset' && (
            <div>
              <GhostBtn type="button" style={{ marginBottom: 20 }} onClick={() => { setKindPhase('kind'); setScenarioId(null); }}>
                ← Wróć
              </GhostBtn>
              <Eyebrow>
                {kind === 'ONE_TIME' ? 'Wybierz szablon lub zacznij od zera' : 'Wybierz szablon'}
              </Eyebrow>
              <GroupIntro>
                {kind === 'ONE_TIME'
                  ? 'Szablony wypełniają treść i ustawiają filtry odbiorców. Możesz je zmienić w kolejnych krokach.'
                  : 'Szablon konfiguruje warunek wysyłki i treść wiadomości.'}
              </GroupIntro>
              <PresetGrid>
                {SCENARIOS
                  .filter((s) => s.kind === kind && s.id !== 'CUSTOM_ONE_TIME' && s.id !== 'CUSTOM_AUTOMATIC')
                  .map((s) => {
                    const Icon = SCENARIO_ICONS[s.id] ?? Send;
                    return (
                      <ScenarioCard
                        key={s.id}
                        $selected={scenarioId === s.id}
                        type="button"
                        onClick={() => { applyScenario(s); setStep('audience'); }}
                      >
                        <Icon />
                        <h3>{s.title}</h3>
                        <p>{s.description}</p>
                      </ScenarioCard>
                    );
                  })}
              </PresetGrid>
              <div>
                <SkipLink type="button" onClick={() => { setScenarioId(null); setStep('audience'); }}>
                  Pomiń — zacznij od pustego formularza
                </SkipLink>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Krok 2: Odbiorcy ── */}
      {step === 'audience' && (
        <>
          <FormField>
            <FormLabel>Nazwa kampanii</FormLabel>
            <FormInput value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Życzenia świąteczne 2026" />
          </FormField>

          {kind === 'AUTOMATIC' && (
            <SectionCard style={{ marginBottom: 16 }}>
              <Eyebrow>Warunek wysyłki</Eyebrow>
              <FormField>
                <FormLabel>Po usłudze</FormLabel>
                <FormSelect
                  value=""
                  onChange={(e) => {
                    const sid = e.target.value;
                    if (sid && !trigger.serviceIds.includes(sid)) {
                      setTrigger({ ...trigger, serviceIds: [...trigger.serviceIds, sid] });
                    }
                  }}
                >
                  <option value="">Dodaj usługę…</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </FormSelect>
                {trigger.serviceIds.length > 0 && (
                  <ChipRow>
                    {trigger.serviceIds.map((sid) => (
                      <Chip
                        key={sid}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setTrigger({ ...trigger, serviceIds: trigger.serviceIds.filter((x) => x !== sid) })}
                      >
                        {serviceNames.get(sid) ?? 'usługa'} ×
                      </Chip>
                    ))}
                  </ChipRow>
                )}
              </FormField>
              <FormField>
                <FormLabel>Wyślij po</FormLabel>
                <FormSelect
                  value={String(trigger.afterDays)}
                  onChange={(e) => setTrigger({ ...trigger, afterDays: Number(e.target.value) })}
                >
                  <option value="30">30 dniach</option>
                  <option value="90">90 dniach</option>
                  <option value="180">180 dniach</option>
                  <option value="365">roku</option>
                </FormSelect>
              </FormField>
              <FormField>
                <FormLabel>Pomiń, jeśli klient był w międzyczasie</FormLabel>
                <FormSelect
                  value={trigger.onlyIfNoVisitSince ? 'yes' : 'no'}
                  onChange={(e) => setTrigger({ ...trigger, onlyIfNoVisitSince: e.target.value === 'yes' })}
                >
                  <option value="yes">Tak (zalecane)</option>
                  <option value="no">Nie — wyślij zawsze</option>
                </FormSelect>
              </FormField>
            </SectionCard>
          )}

          <TwoCols>
            <AudienceBuilder value={audience} onChange={setAudience} />
            <AudienceEstimatePanel
              estimate={estimate}
              isEstimating={isEstimating}
              audience={audience}
              onChangeAudience={setAudience}
            />
          </TwoCols>

          <NavRow>
            {!isEdit ? <GhostBtn onClick={() => setStep('scenario')}>Wstecz</GhostBtn> : <span />}
            <PrimaryBtn disabled={!name.trim()} onClick={() => setStep('content')}>Dalej</PrimaryBtn>
          </NavRow>
        </>
      )}

      {/* ── Krok 3: Treść ── */}
      {step === 'content' && (
        <>
          <SectionCard>
            <Eyebrow>Treść wiadomości</Eyebrow>
            <MessageEditor value={content} onChange={setContent} />
          </SectionCard>
          <NavRow>
            <GhostBtn onClick={() => setStep('audience')}>Wstecz</GhostBtn>
            <PrimaryBtn disabled={!canLeaveContent} onClick={() => setStep('summary')}>Dalej</PrimaryBtn>
          </NavRow>
        </>
      )}

      {/* ── Krok 4: Podsumowanie ── */}
      {step === 'summary' && (
        <>
          <SectionCard>
            <Eyebrow>Podsumowanie</Eyebrow>
            <RecapList>
              <dt>Kampania</dt><dd>{name}</dd>
              <dt>Kanał</dt><dd>{content.channel === 'BOTH' ? 'SMS i e-mail' : content.channel === 'SMS' ? 'SMS' : 'E-mail'}</dd>
              <dt>Odbiorcy</dt>
              <dd>{estimate ? `${estimate.eligible} (stan na dziś)` : '—'}</dd>
              {estimatedCredits != null && (<><dt>Szacowany koszt</dt><dd>{estimatedCredits} kredytów SMS</dd></>)}
              {kind === 'AUTOMATIC' && (
                <>
                  <dt>Warunek</dt>
                  <dd>
                    {trigger.afterDays} dni po: {trigger.serviceIds.map((sid) => serviceNames.get(sid) ?? 'usługa').join(', ') || '—'}
                  </dd>
                </>
              )}
            </RecapList>
            {chips.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <ChipRow>{chips.map((c) => <Chip key={c}>{c}</Chip>)}</ChipRow>
              </div>
            )}
          </SectionCard>

          {kind === 'ONE_TIME' && (
            <SectionCard style={{ marginTop: 16 }}>
              <Eyebrow>Kiedy wysłać</Eyebrow>
              <FormField>
                <FormSelect value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value as ScheduleMode)}>
                  <option value="NOW">Wyślij teraz</option>
                  <option value="AT">Zaplanuj termin</option>
                </FormSelect>
              </FormField>
              {scheduleMode === 'AT' && (
                <FormField>
                  <FormLabel>Data i godzina wysyłki</FormLabel>
                  <FormInput type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
                </FormField>
              )}
              <ScheduleNote>
                Listę odbiorców przeliczymy ponownie tuż przed wysyłką — obejmie klientów
                spełniających warunki w dniu wysyłki. Twoje ręczne wykluczenia zostaną zachowane.
              </ScheduleNote>
            </SectionCard>
          )}

          <NavRow>
            <GhostBtn onClick={() => setStep('content')}>Wstecz</GhostBtn>
            <div style={{ display: 'flex', gap: 8 }}>
              <GhostBtn disabled={isSaving} onClick={saveDraft}>Zapisz jako szkic</GhostBtn>
              <PrimaryBtn
                disabled={isSaving || (scheduleMode === 'AT' && !scheduleAt)}
                onClick={finish}
              >
                {kind === 'AUTOMATIC' ? 'Aktywuj kampanię' : scheduleMode === 'AT' ? 'Zaplanuj wysyłkę' : 'Wyślij teraz'}
              </PrimaryBtn>
            </div>
          </NavRow>
        </>
      )}
    </Page>
  );
}
