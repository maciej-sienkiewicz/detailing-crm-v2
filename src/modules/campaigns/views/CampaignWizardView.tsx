// src/modules/campaigns/views/CampaignWizardView.tsx
// Kreator kampanii — cztery kroki, w każdym jedna akcja główna.
//
// Wcześniej stopka ostatniego kroku niosła trzy równoważne przyciski („Wstecz",
// „Zapisz jako szkic", „Wyślij teraz") w jednym rzędzie i o tej samej wadze.
// Trzy równorzędne podpowiedzi to zero podpowiedzi: prawo Hicka mówi, że czas
// decyzji rośnie z liczbą równych opcji, a kreator ma tę decyzję podejmować za
// człowieka. Zostaje jedna akcja główna po prawej — ta, po którą ktoś tu
// przyszedł — cofnięcie po lewej i zapis szkicu jako odnośnik tekstowy, bo to
// wyjście awaryjne, a nie równorzędna droga.
//
// Wszystkie barwy poza akcją główną i kropką „ten filtr jest ustawiony"
// zniknęły: kolor w tym module znaczy etap, pilność albo akcję, nigdy dekorację.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, Repeat, Send } from 'lucide-react';
import { Stepper } from '@/common/components/Stepper/Stepper';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { InfoTooltip } from '@/common/components/InfoTooltip';
import { DateTimePicker } from '@/common/components/DateTimePicker';
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
import { AudienceBuilder, audienceChips, useServiceCatalog } from '../components/AudienceBuilder';
import { ServiceMultiSelect } from '@/modules/customers/components/CustomerFilterPanel';
import { AudienceEstimatePanel } from '../components/AudienceEstimatePanel';
import { MessageEditor, type MessageContent } from '../components/MessageEditor';
import { smsMeta } from '../utils/sms';
import {
  Chip,
  ChipRow,
  Field,
  FieldLabel,
  HintText,
  IconButton,
  Panel,
  PrimaryButton,
  QuietLink,
  SelectField,
  TextField,
  ViewContainer,
} from '../components/shared';

// ─── Styl ─────────────────────────────────────────────────────────────────────

const TwoCols = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 20px;
  align-items: start;

  @media (max-width: 1023px) { grid-template-columns: minmax(0, 1fr); }
`;

/**
 * Wybór rodzaju kampanii — dwie karty, żadna nie jest domyślna.
 *
 * To jedyny krok, w którym nie ma akcji głównej w stopce, bo akcją jest sam
 * wybór. Ikona jest przygaszona: gdyby świeciła kolorem akcji, obie karty
 * wyglądałyby jak dwa przyciski „wyślij".
 */
const KindGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  max-width: 760px;

  @media (max-width: 767px) { grid-template-columns: 1fr; }
`;

const KindCard = styled.button`
  text-align: left;
  background: ${(p) => p.theme.colors.surface};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.xl};
  padding: 22px;
  cursor: pointer;
  font-family: inherit;
  transition: all ${(p) => p.theme.transitions.fast};

  &:hover {
    border-color: ${(p) => p.theme.colors.primary};
    background: ${(p) => p.theme.colors.surfaceHover};
  }

  svg {
    width: 20px;
    height: 20px;
    color: ${(p) => p.theme.colors.textMuted};
    margin-bottom: 12px;
    display: block;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: ${(p) => p.theme.fontWeights.semibold};
    color: ${(p) => p.theme.colors.text};
  }
  p {
    margin: 0;
    font-size: 13px;
    color: ${(p) => p.theme.colors.textSecondary};
    line-height: 1.55;
  }
`;

const GroupIntro = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
`;

/**
 * Stopka kroku. Po lewej cofnięcie, po prawej jedna akcja główna; zapis szkicu
 * jest odnośnikiem tuż przy niej, bo to wyjście awaryjne, nie druga droga.
 */
const NavRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 4px;
`;

const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const AfterDaysRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 420px;
`;

const ScheduleNote = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${(p) => p.theme.colors.textSecondary};
  max-width: 620px;
  line-height: 1.55;
`;

/** Podsumowanie: pary „pytanie — odpowiedź", odpowiedzi cięższe od pytań. */
const RecapList = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  row-gap: 10px;
  font-size: 14px;

  dt { color: ${(p) => p.theme.colors.textMuted}; }
  dd {
    margin: 0;
    font-weight: ${(p) => p.theme.fontWeights.semibold};
    color: ${(p) => p.theme.colors.text};
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: ${(p) => p.theme.breakpoints.sm}) {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 2px;
    dd { margin-bottom: 8px; }
  }
`;

// ─── Widok ────────────────────────────────────────────────────────────────────

type StepId = 'scenario' | 'audience' | 'content' | 'summary';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'scenario', label: 'Rodzaj' },
  { id: 'audience', label: 'Odbiorcy' },
  { id: 'content', label: 'Treść' },
  { id: 'summary', label: 'Podsumowanie' },
];

const STEP_QUESTIONS: Record<StepId, string> = {
  scenario: 'Raz czy stale?',
  audience: 'Do kogo ma trafić?',
  content: 'Co mają przeczytać?',
  summary: 'Wszystko się zgadza?',
};

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
    navigate(`/campaigns?campaign=${campaignId}`);
  };

  const saveDraft = async () => {
    const payload = buildPayload();
    if (isEdit) {
      await updateCampaign.mutateAsync({ id: editId!, payload });
      navigate(`/campaigns?campaign=${editId}`);
    } else {
      const saved = await createCampaign.mutateAsync(payload);
      navigate(`/campaigns?campaign=${(saved as { id: string }).id}`);
    }
  };

  const isSaving =
    createCampaign.isPending || updateCampaign.isPending ||
    scheduleCampaign.isPending || activateCampaign.isPending;

  const smsSegments = smsMeta(content.smsTemplate).segments;
  const estimatedCredits =
    content.channel !== 'EMAIL' && estimate ? estimate.eligible * Math.max(smsSegments, 1) : null;

  const leaveWizard = () =>
    navigate(isEdit ? `/campaigns?campaign=${editId}` : '/campaigns');

  return (
    <ViewContainer>
      <PageHeader
        title={isEdit ? existing?.name || 'Edycja kampanii' : 'Nowa kampania'}
        subtitle={STEP_QUESTIONS[step]}
        actions={
          <PageHeaderGhostButton onClick={leaveWizard}>
            {isEdit ? 'Odrzuć zmiany' : 'Anuluj'}
          </PageHeaderGhostButton>
        }
      />

      <Stepper
        steps={visibleSteps}
        currentStepId={step}
        completedSteps={completedSteps}
        onStepClick={(id) => setStep(id as StepId)}
      />

      {/* ── Krok 1: Rodzaj kampanii ── */}
      {step === 'scenario' && (
        <>
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
        </>
      )}

      {/* ── Krok 2: Odbiorcy ── */}
      {step === 'audience' && (
        <>
          <Field style={{ maxWidth: 420 }}>
            <FieldLabel>Nazwa kampanii</FieldLabel>
            <TextField
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Życzenia świąteczne 2026"
            />
          </Field>

          {kind === 'AUTOMATIC' && (
            <Panel>
              <h4>Warunek wysyłki</h4>
              <Field style={{ maxWidth: 420 }}>
                <FieldLabel>
                  Po usłudze
                  <InfoTooltip text="Kampania uruchomi się dla klientów, u których ta usługa była wykonana X dni temu. Przy kilku usługach wystarczy, że klient miał choćby jedną z nich (logika LUB)." />
                </FieldLabel>
                <ServiceMultiSelect
                  selectedIds={trigger.serviceIds}
                  onChange={(ids) => setTrigger({ ...trigger, serviceIds: ids })}
                />
                <HintText>
                  {trigger.serviceIds.length > 1
                    ? 'Wystarczy, że klient miał wykonaną dowolną z wybranych usług (logika LUB).'
                    : 'Możesz wybrać kilka usług: warunek spełni każda z nich (logika LUB).'}
                </HintText>
              </Field>
              <Field>
                <FieldLabel>
                  Wyślij po
                  <InfoTooltip text="Liczba dni od wykonania usługi. System sprawdza codziennie i wysyła w dniu, w którym wizyta jest stara o dokładnie tyle dni." />
                </FieldLabel>
                <AfterDaysRow>
                  <TextField
                    style={{ width: 90, textAlign: 'center' }}
                    type="number"
                    min={1}
                    max={3650}
                    value={trigger.afterDays}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) setTrigger({ ...trigger, afterDays: v });
                    }}
                  />
                  <HintText style={{ fontSize: 14 }}>dniach od wykonania usługi</HintText>
                </AfterDaysRow>
              </Field>
              <Field style={{ maxWidth: 420 }}>
                <FieldLabel>
                  Pomiń, jeśli klient był w międzyczasie
                  <InfoTooltip text="Jeśli klient wrócił do studia między wizytą wyzwalającą a dniem wysyłki (np. na inną usługę), kampania go pominie. Zalecane, bo chroni przed wysyłaniem do klientów, którzy sami wrócili." />
                </FieldLabel>
                <SelectField
                  value={trigger.onlyIfNoVisitSince ? 'yes' : 'no'}
                  onChange={(e) => setTrigger({ ...trigger, onlyIfNoVisitSince: e.target.value === 'yes' })}
                >
                  <option value="yes">Tak (zalecane)</option>
                  <option value="no">Nie, wyślij zawsze</option>
                </SelectField>
              </Field>
            </Panel>
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
            {!isEdit ? (
              <IconButton type="button" onClick={() => setStep('scenario')}>
                <ArrowLeft /> Wstecz
              </IconButton>
            ) : <span />}
            <PrimaryButton type="button" disabled={!name.trim()} onClick={() => setStep('content')}>
              Dalej <ArrowRight />
            </PrimaryButton>
          </NavRow>
        </>
      )}

      {/* ── Krok 3: Treść ── */}
      {step === 'content' && (
        <>
          <Panel>
            <h4>Treść wiadomości</h4>
            <MessageEditor value={content} onChange={setContent} />
          </Panel>
          <NavRow>
            <IconButton type="button" onClick={() => setStep('audience')}>
              <ArrowLeft /> Wstecz
            </IconButton>
            <PrimaryButton type="button" disabled={!canLeaveContent} onClick={() => setStep('summary')}>
              Dalej <ArrowRight />
            </PrimaryButton>
          </NavRow>
        </>
      )}

      {/* ── Krok 4: Podsumowanie ── */}
      {step === 'summary' && (
        <>
          <Panel>
            <h4>Podsumowanie</h4>
            <RecapList>
              <dt>Kampania</dt><dd>{name}</dd>
              <dt>Kanał</dt>
              <dd>{content.channel === 'BOTH' ? 'SMS i e-mail' : content.channel === 'SMS' ? 'SMS' : 'E-mail'}</dd>
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
              <ChipRow>{chips.map((c) => <Chip key={c}>{c}</Chip>)}</ChipRow>
            )}
          </Panel>

          {kind === 'ONE_TIME' && (
            <Panel>
              <h4>Kiedy wysłać</h4>
              <Field style={{ maxWidth: 420 }}>
                <SelectField value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value as ScheduleMode)}>
                  <option value="NOW">Wyślij teraz</option>
                  <option value="AT">Zaplanuj termin</option>
                </SelectField>
              </Field>
              {scheduleMode === 'AT' && (
                <Field style={{ maxWidth: 420 }}>
                  <FieldLabel>Data i godzina wysyłki</FieldLabel>
                  <DateTimePicker
                    value={scheduleAt}
                    onChange={setScheduleAt}
                    showTime
                    placeholder="Wybierz datę i godzinę"
                  />
                </Field>
              )}
              <ScheduleNote>
                Listę odbiorców przeliczymy ponownie tuż przed wysyłką, obejmie klientów
                spełniających warunki w dniu wysyłki. Twoje ręczne wykluczenia zostaną zachowane.
              </ScheduleNote>
            </Panel>
          )}

          <NavRow>
            <IconButton type="button" onClick={() => setStep('content')}>
              <ArrowLeft /> Wstecz
            </IconButton>
            <NavRight>
              {/* Zapis szkicu to wyjście awaryjne, nie druga droga do celu —
                  jako równy przycisk kazałby wybierać między dwoma „zapisz". */}
              <QuietLink type="button" disabled={isSaving} onClick={saveDraft}>
                Zapisz jako szkic
              </QuietLink>
              <PrimaryButton
                type="button"
                disabled={isSaving || (scheduleMode === 'AT' && !scheduleAt)}
                onClick={finish}
              >
                <Send />
                {kind === 'AUTOMATIC' ? 'Aktywuj kampanię' : scheduleMode === 'AT' ? 'Zaplanuj wysyłkę' : 'Wyślij teraz'}
              </PrimaryButton>
            </NavRight>
          </NavRow>
        </>
      )}
    </ViewContainer>
  );
}
