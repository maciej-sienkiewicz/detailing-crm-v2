import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { Repeat, Send } from 'lucide-react';
import { Stepper } from '@/common/components/Stepper/Stepper';
import {
  useActivateCampaign,
  useAudienceEstimate,
  useCampaign,
  useCreateCampaign,
  useScheduleCampaign,
  useUpdateCampaign,
} from '../hooks/useCampaigns';
import { emptyAudience } from '../types';
import type { AudienceCriteria, CampaignChannel, CampaignKind, TriggerConfig } from '../types';
import { AudienceBuilder, audienceChips, Chip, ChipRow, useServiceCatalog } from '../components/AudienceBuilder';
import { ServiceMultiSelect } from '@/modules/customers/components/CustomerFilterPanel';
import { AudienceEstimatePanel } from '../components/AudienceEstimatePanel';
import { MessageEditor, type MessageContent } from '../components/MessageEditor';
import { Eyebrow, Page, SectionCard } from '../components/shared';
import { InfoTooltip } from '@/common/components/InfoTooltip';
import { DateTimePicker } from '@/common/components/DateTimePicker';
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
  margin: 0 auto;

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

const GroupIntro = styled.p`
  margin: 4px 0 16px;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
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
  background: #ffffff;
  color: ${(p) => p.theme.colors.text};
  border: 1.5px solid ${(p) => p.theme.colors.border};
  cursor: pointer;
  padding: 10px 24px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  transition: all 180ms ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &:hover { border-color: #cbd5e1; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08); }
  &:disabled { opacity: 0.5; cursor: default; }
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
  background: #ffffff;
  color: ${(p) => p.theme.colors.text};

  &::placeholder { color: #94a3b8; }

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

const HintText = styled.p`
  margin: 6px 0 0;
  font-size: 12px;
  color: ${(p) => p.theme.colors.textMuted};
  line-height: 1.5;
`;

const AfterDaysRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 420px;
`;

const AfterDaysInput = styled.input`
  width: 90px;
  padding: 10px 14px;
  border: 1.5px solid ${(p) => p.theme.colors.border};
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  background: #ffffff;
  color: ${(p) => p.theme.colors.text};
  text-align: center;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
  }
`;

const AfterDaysUnit = styled.span`
  font-size: 14px;
  color: ${(p) => p.theme.colors.textSecondary};
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

// ─── Widok ────────────────────────────────────────────────────────────────────

type StepId = 'scenario' | 'audience' | 'content' | 'summary';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'scenario', label: 'Rodzaj' },
  { id: 'audience', label: 'Odbiorcy' },
  { id: 'content', label: 'Treść' },
  { id: 'summary', label: 'Podsumowanie' },
];

type ScheduleMode = 'NOW' | 'AT' | 'ACTIVATE';

export function CampaignWizardView() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = !!editId;

  const { campaign: existing } = useCampaign(editId);
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const scheduleCampaign = useScheduleCampaign();
  const activateCampaign = useActivateCampaign();
  const { serviceNames } = useServiceCatalog();

  const [step, setStep] = useState<StepId>(isEdit ? 'audience' : 'scenario');
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

  const pickKind = (k: CampaignKind) => {
    setKind(k);
    setScheduleMode(k === 'AUTOMATIC' ? 'ACTIVATE' : 'NOW');
    setStep('audience');
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

      <Stepper
        steps={visibleSteps}
        currentStepId={step}
        completedSteps={completedSteps}
        onStepClick={(id) => setStep(id as StepId)}
      />

      {/* ── Krok 1: Rodzaj kampanii ── */}
      {step === 'scenario' && (
        <div>
          <GroupIntro>Wybierz rodzaj kampanii, żeby zacząć.</GroupIntro>
          <KindGrid>
            <KindCard type="button" onClick={() => pickKind('ONE_TIME')}>
              <Send />
              <h3>Jednorazowa wysyłka</h3>
              <p>Wyślij raz, teraz lub w wybranym terminie, do wybranej grupy klientów. Idealna do promocji, życzeń i ogłoszeń.</p>
            </KindCard>
            <KindCard type="button" onClick={() => pickKind('AUTOMATIC')}>
              <Repeat />
              <h3>Kampania automatyczna</h3>
              <p>Działa stale: wysyła wiadomość do każdego klienta, gdy spełni warunek, np. 180 dni od wykonanej usługi.</p>
            </KindCard>
          </KindGrid>
        </div>
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
                <FormLabel>
                  Po usłudze
                  <InfoTooltip text="Kampania uruchomi się dla klientów, u których ta usługa była wykonana X dni temu. Przy kilku usługach wystarczy, że klient miał choćby jedną z nich (logika LUB)." />
                </FormLabel>
                <div style={{ maxWidth: 420 }}>
                  <ServiceMultiSelect
                    selectedIds={trigger.serviceIds}
                    onChange={(ids) => setTrigger({ ...trigger, serviceIds: ids })}
                  />
                </div>
                <HintText>
                  {trigger.serviceIds.length > 1
                    ? 'Wystarczy, że klient miał wykonaną dowolną z wybranych usług (logika LUB).'
                    : 'Możesz wybrać kilka usług: warunek spełni każda z nich (logika LUB).'}
                </HintText>
              </FormField>
              <FormField>
                <FormLabel>
                  Wyślij po
                  <InfoTooltip text="Liczba dni od wykonania usługi. System sprawdza codziennie i wysyła w dniu, w którym wizyta jest stara o dokładnie tyle dni." />
                </FormLabel>
                <AfterDaysRow>
                  <AfterDaysInput
                    type="number"
                    min={1}
                    max={3650}
                    value={trigger.afterDays}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) setTrigger({ ...trigger, afterDays: v });
                    }}
                  />
                  <AfterDaysUnit>dniach od wykonania usługi</AfterDaysUnit>
                </AfterDaysRow>
              </FormField>
              <FormField>
                <FormLabel>
                  Pomiń, jeśli klient był w międzyczasie
                  <InfoTooltip text="Jeśli klient wrócił do studia między wizytą wyzwalającą a dniem wysyłki (np. na inną usługę), kampania go pominie. Zalecane, bo chroni przed wysyłaniem do klientów, którzy sami wrócili." />
                </FormLabel>
                <FormSelect
                  value={trigger.onlyIfNoVisitSince ? 'yes' : 'no'}
                  onChange={(e) => setTrigger({ ...trigger, onlyIfNoVisitSince: e.target.value === 'yes' })}
                >
                  <option value="yes">Tak (zalecane)</option>
                  <option value="no">Nie, wyślij zawsze</option>
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
              <dd>{estimate ? `${estimate.eligible} (stan na dziś)` : '-'}</dd>
              {estimatedCredits != null && (<><dt>Szacowany koszt</dt><dd>{estimatedCredits} kredytów SMS</dd></>)}
              {kind === 'AUTOMATIC' && (
                <>
                  <dt>Warunek</dt>
                  <dd>
                    {trigger.afterDays} dni po: {trigger.serviceIds.map((sid) => serviceNames.get(sid) ?? 'usługa').join(', ') || '-'}
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
                  <DateTimePicker
                    value={scheduleAt}
                    onChange={setScheduleAt}
                    showTime
                    placeholder="Wybierz datę i godzinę"
                  />
                </FormField>
              )}
              <ScheduleNote>
                Listę odbiorców przeliczymy ponownie tuż przed wysyłką, obejmie klientów
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
