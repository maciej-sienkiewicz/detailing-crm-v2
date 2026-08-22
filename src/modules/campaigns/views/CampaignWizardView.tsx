// src/modules/campaigns/views/CampaignWizardView.tsx
// Kreator kampanii — cztery kroki, w każdym jedno pytanie i jedna akcja główna.
//
// Układ kroku „Odbiorcy" odpowiada kolejności, w jakiej człowiek o tym myśli:
// najpierw kogo szukam (filtry), potem ilu ich jest (jedna wielka liczba i rachunek
// wykluczeń), a na końcu kto konkretnie — imiennie, w tabeli, w której da się kogoś
// wypisać. Wcześniej ostatniego piętra nie było wcale: lista odbiorców była
// nieklikalną „próbką" w wąskiej kolumnie, a jedynym gestem był krzyżyk, po którym
// klient znikał bezpowrotnie.
//
// Prawa, które ten ekran ma respektować:
// · jedna dominanta na widok — liczba odbiorców, rozmiarem, nie barwą;
// · prawo Hicka — jedna akcja główna w stopce kroku, cofnięcie po lewej, zapis
//   szkicu jako odnośnik, bo to wyjście awaryjne, nie równorzędna droga;
// · kolor = znaczenie — barwę niesie akcja główna, ostrzeżenie o kredytach i pole,
//   którego brakuje; nic poza tym;
// · widoczność stanu systemu — „Dalej" bez nazwy kampanii nie jest martwe: mówi,
//   czego brakuje, i przewija do tego pola;
// · podgląd przed wysłaniem — treść widać tak, jak zobaczy ją klient, w trakcie
//   pisania, a nie dopiero po zapisaniu kampanii.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { AlertTriangle, ArrowLeft, ArrowRight, Coins, Repeat, Send } from 'lucide-react';
import { Stepper } from '@/common/components/Stepper/Stepper';
import { PageHeader, PageHeaderGhostButton } from '@/common/components/PageHeader';
import { InfoTooltip } from '@/common/components/InfoTooltip';
import { DateTimePicker } from '@/common/components/DateTimePicker';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
  useActivateCampaign,
  useAudienceEstimate,
  useCampaign,
  useCampaignStats,
  useCreateCampaign,
  useScheduleCampaign,
  useUpdateCampaign,
} from '../hooks/useCampaigns';
import { emptyAudience } from '../types';
import type {
  AudienceCriteria,
  AudienceEstimateParams,
  AudienceTriggerProjection,
  CampaignChannel,
  CampaignKind,
  RecipientChannel,
  TriggerConfig,
} from '../types';
import { AUDIENCE_PAGE_SIZE, TRIGGER_HORIZON_DAYS } from '../constants';
import { AudienceBuilder, audienceChips, useServiceCatalog } from '../components/AudienceBuilder';
import { ServiceMultiSelect } from '@/modules/customers/components/CustomerFilterPanel';
import { AudienceEstimatePanel } from '../components/AudienceEstimatePanel';
import { AudienceTable } from '../components/AudienceTable';
import { ContentPreview } from '../components/ContentPreview';
import { MessageEditor, type MessageContent } from '../components/MessageEditor';
import { smsMeta } from '../utils/sms';
import {
  Chip,
  ChipRow,
  Field,
  FieldLabel,
  GuardedButton,
  HintText,
  IconButton,
  Note,
  Panel,
  QuietLink,
  SelectField,
  TextField,
  ViewContainer,
} from '../components/shared';

// ─── Styl ─────────────────────────────────────────────────────────────────────

const TwoCols = styled.div<{ $aside?: string }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) ${(p) => p.$aside ?? '340px'};
  gap: 20px;
  align-items: start;

  @media (max-width: 1099px) { grid-template-columns: minmax(0, 1fr); }
`;

/** Podgląd treści jedzie z ekranem — pisze się w lewej kolumnie, patrzy w prawą. */
const StickyAside = styled.div`
  position: sticky;
  top: 24px;

  @media (max-width: 1099px) { position: static; }
`;

/**
 * Wybór rodzaju kampanii — dwie karty, żadna nie jest domyślna.
 *
 * To jedyny krok bez akcji głównej w stopce, bo akcją jest sam wybór. Ikona jest
 * przygaszona: gdyby świeciła kolorem akcji, obie karty wyglądałyby jak dwa
 * przyciski „wyślij".
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

const InlineRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

/** Komunikat pod polem, którego brakuje — pojawia się dopiero po próbie przejścia dalej. */
const FieldError = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${(p) => p.theme.colors.error};
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

// ─── Kroki ────────────────────────────────────────────────────────────────────

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

/**
 * Podpis samych kryteriów wyszukiwania — bez list zaznaczeń.
 *
 * Służy do rozróżnienia dwóch rzeczy, które wyglądają tak samo („zmieniły się
 * kryteria odbiorców"), a znaczą co innego: zmiana filtra przelicza listę od nowa
 * i może unieważnić ręczne odznaczenia, a samo odznaczenie kogoś jest właśnie tym
 * ręcznym gestem i nie ma prawa pytać samo o siebie.
 */
function filterSignature(
  audience: AudienceCriteria,
  trigger: AudienceTriggerProjection | null,
  channel: RecipientChannel
): string {
  // Listy zaznaczeń wyzerowane, a nie usunięte: kolejność kluczy zostaje ta sama
  // po obu stronach porównania, także po podróży przez JSON.
  const criteria = { ...audience, includeCustomerIds: [], excludeCustomerIds: [] };
  return JSON.stringify({ criteria, trigger, channel });
}

/** Ten sam podpis, ale policzony z parametrów, na których stoi wynik na ekranie. */
function appliedFilterSignature(appliedKey: string): string | null {
  try {
    const applied = JSON.parse(appliedKey) as AudienceEstimateParams;
    return filterSignature(applied.audience, applied.trigger ?? null, applied.channel);
  } catch {
    return null;
  }
}

export function CampaignWizardView() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = !!editId;

  const { campaign: existing } = useCampaign(editId);
  const { stats } = useCampaignStats();
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

  // Krok „Odbiorcy": strona tabeli i los ręcznych odznaczeń.
  const [audiencePage, setAudiencePage] = useState(0);
  /** Zmieniono filtr, a na liście wiszą ręczne odznaczenia — trzeba o nie zapytać. */
  const [exclusionQuestionPending, setExclusionQuestionPending] = useState(false);
  /** Użytkownik już powiedział „zachowaj" — nie pytamy przy każdej kolejnej zmianie. */
  const [exclusionsAcknowledged, setExclusionsAcknowledged] = useState(false);

  // Brakujące pola: zapalane dopiero po próbie przejścia dalej, gaszone pierwszym znakiem.
  const [nameMissing, setNameMissing] = useState(false);
  const [contentMissing, setContentMissing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

  const estimateChannel: RecipientChannel = content.channel === 'EMAIL' ? 'EMAIL' : 'SMS';

  /*
   * Warunek jako pierwsze sito prognozy.
   *
   * Kampania automatyczna nie wychodzi od kryteriów odbiorców, tylko od zdarzenia:
   * „180 dni po powłoce ceramicznej". Dopóki prognoza o tym nie wiedziała, liczba
   * pod filtrami pokazywała całą bazę klientów i nie drgała przy zmianie warunku —
   * czyli kłamała dokładnie w tym miejscu, w którym ktoś jej najbardziej potrzebuje.
   */
  const triggerProjection: AudienceTriggerProjection | null =
    kind === 'AUTOMATIC'
      ? {
          serviceIds: trigger.serviceIds,
          afterDays: trigger.afterDays,
          onlyIfNoVisitSince: trigger.onlyIfNoVisitSince,
          horizonDays: TRIGGER_HORIZON_DAYS,
        }
      : null;
  const awaitingTrigger = kind === 'AUTOMATIC' && trigger.serviceIds.length === 0;

  const { estimate, isEstimating, appliedKey } = useAudienceEstimate({
    audience,
    channel: estimateChannel,
    smsTemplate: content.smsTemplate || undefined,
    trigger: triggerProjection,
    sampleLimit: AUDIENCE_PAGE_SIZE,
    sampleOffset: audiencePage * AUDIENCE_PAGE_SIZE,
  });

  /*
   * Pytanie o odznaczenia zadajemy dopiero wtedy, gdy tabela naprawdę się odświeżyła:
   * parametry, na których stoi wynik, dogoniły to, co ustawił użytkownik, i nic już
   * się nie dolicza. Gdyby okno wyskakiwało w chwili zmiany filtra, pojawiałoby się
   * po pierwszym naciśniętym klawiszu — w środku wpisywania liczby dni.
   */
  const currentSignature = filterSignature(audience, triggerProjection, estimateChannel);
  const listCaughtUp = appliedFilterSignature(appliedKey) === currentSignature && !isEstimating;
  const askAboutExclusions = exclusionQuestionPending && listCaughtUp;

  /** Zmiana filtra: strona wraca na początek, a odznaczenia domagają się decyzji. */
  const noteFilterChange = (nextSignature: string, exclusions: number) => {
    if (nextSignature === currentSignature) return;
    setAudiencePage(0);
    if (exclusions > 0 && !exclusionsAcknowledged) setExclusionQuestionPending(true);
  };

  const changeAudience = (next: AudienceCriteria) => {
    noteFilterChange(
      filterSignature(next, triggerProjection, estimateChannel),
      next.excludeCustomerIds.length
    );
    setAudience(next);
  };

  const changeTrigger = (next: TriggerConfig) => {
    const nextProjection: AudienceTriggerProjection = {
      serviceIds: next.serviceIds,
      afterDays: next.afterDays,
      onlyIfNoVisitSince: next.onlyIfNoVisitSince,
      horizonDays: TRIGGER_HORIZON_DAYS,
    };
    noteFilterChange(
      filterSignature(audience, nextProjection, estimateChannel),
      audience.excludeCustomerIds.length
    );
    setTrigger(next);
  };

  /** Odznaczenie w tabeli to nowa decyzja — o nią zapytamy przy następnej zmianie filtra. */
  const changeExcluded = (next: string[]) => {
    setExclusionsAcknowledged(false);
    setAudience({ ...audience, excludeCustomerIds: next });
  };

  const chips = useMemo(() => audienceChips(audience, serviceNames), [audience, serviceNames]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const completedSteps = STEPS.slice(0, stepIndex).map((s) => s.id);
  const visibleSteps = isEdit ? STEPS.filter((s) => s.id !== 'scenario') : STEPS;

  const hasName = name.trim().length > 0;
  const missingContent =
    content.channel !== 'EMAIL' && content.smsTemplate.trim().length === 0
      ? 'Napisz treść SMS-a.'
      : content.channel !== 'SMS' && content.emailSubject.trim().length === 0
        ? 'Uzupełnij temat e-maila.'
        : content.channel !== 'SMS' && content.emailBody.trim().length === 0
          ? 'Uzupełnij treść e-maila.'
          : null;

  /**
   * „Dalej" bez nazwy kampanii nie jest martwym przyciskiem.
   *
   * Wyłączony `disabled` nie przyjmuje kliknięcia, nie łapie tabulatora i nie mówi
   * nic czytnikowi ekranu — ktoś, kto nie zauważył pustego pola dwa ekrany wyżej,
   * zostaje z przyciskiem, który po prostu nie działa. Przycisk zostaje więc żywy,
   * a wygląda i ogłasza się jako niedostępny (`aria-disabled`): kliknięcie przewija
   * do brakującego pola, ustawia w nim kursor i zapala przy nim komunikat.
   */
  const revealMissing = (target: { current: HTMLElement | null }, focus: boolean) => {
    // Krótka zwłoka, bo do tego samego pola trafiamy też ze Steppera — wtedy krok
    // dopiero się montuje i sekundę wcześniej referencji jeszcze nie ma.
    window.setTimeout(() => {
      target.current?.scrollIntoView({ behavior: 'smooth', block: focus ? 'center' : 'start' });
      // Fokus bez własnego przewijania: inaczej ekran drgnąłby dwa razy.
      if (focus) (target.current as HTMLInputElement | null)?.focus({ preventScroll: true });
    }, 60);
  };

  const goToContent = () => {
    if (!hasName) {
      setNameMissing(true);
      revealMissing(nameRef, true);
      return;
    }
    setStep('content');
  };

  const goToSummary = () => {
    if (missingContent) {
      setContentMissing(true);
      revealMissing(contentRef, false);
      return;
    }
    setStep('summary');
  };

  /** Do kroku wolno skoczyć tylko wtedy, gdy poprzednie bramki są przejechane. */
  const jumpToStep = (id: StepId) => {
    if ((id === 'content' || id === 'summary') && !hasName) {
      setStep('audience');
      goToContent();
      return;
    }
    if (id === 'summary' && missingContent) {
      setStep('content');
      setContentMissing(true);
      revealMissing(contentRef, false);
      return;
    }
    setStep(id);
  };

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
  const creditsShort =
    estimatedCredits != null && stats != null && estimatedCredits > stats.smsCreditsAvailable;

  const leaveWizard = () => navigate(isEdit ? `/campaigns?campaign=${editId}` : '/campaigns');

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
        onStepClick={(id) => jumpToStep(id as StepId)}
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
          <Panel>
            <h4>Kampania</h4>
            <Field style={{ maxWidth: 460 }}>
              <FieldLabel htmlFor="campaign-name">Nazwa</FieldLabel>
              <TextField
                id="campaign-name"
                ref={nameRef}
                $invalid={nameMissing}
                value={name}
                onChange={(e) => { setName(e.target.value); if (nameMissing) setNameMissing(false); }}
                placeholder="np. Życzenia świąteczne 2026"
                aria-invalid={nameMissing}
                aria-describedby={nameMissing ? 'campaign-name-error' : undefined}
              />
              {nameMissing ? (
                <FieldError id="campaign-name-error">
                  Nazwa jest potrzebna, żeby odnaleźć tę kampanię na liście. Nie zobaczy jej klient.
                </FieldError>
              ) : (
                <HintText>Widoczna tylko dla Ciebie — po niej odnajdziesz kampanię na liście.</HintText>
              )}
            </Field>
          </Panel>

          {kind === 'AUTOMATIC' && (
            <Panel>
              <h4>Warunek wysyłki</h4>
              <HintText>
                Kampania sprawdza ten warunek codziennie i odzywa się do każdego klienta,
                który go spełni. Zmiana warunku od razu przelicza listę poniżej.
              </HintText>
              <Field style={{ maxWidth: 460 }}>
                <FieldLabel>
                  Po usłudze
                  <InfoTooltip text="Kampania uruchomi się dla klientów, u których ta usługa była wykonana X dni temu. Przy kilku usługach wystarczy, że klient miał choćby jedną z nich (logika LUB)." />
                </FieldLabel>
                <ServiceMultiSelect
                  selectedIds={trigger.serviceIds}
                  onChange={(ids) => changeTrigger({ ...trigger, serviceIds: ids })}
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
                <InlineRow>
                  <TextField
                    style={{ width: 90, textAlign: 'center' }}
                    type="number"
                    min={1}
                    max={3650}
                    value={trigger.afterDays}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v > 0) changeTrigger({ ...trigger, afterDays: v });
                    }}
                  />
                  <HintText style={{ fontSize: 14 }}>dniach od wykonania usługi, o</HintText>
                  <TextField
                    style={{ width: 110 }}
                    type="time"
                    value={trigger.sendTime}
                    onChange={(e) => setTrigger({ ...trigger, sendTime: e.target.value })}
                  />
                </InlineRow>
              </Field>
              <Field style={{ maxWidth: 460 }}>
                <FieldLabel>
                  Pomiń, jeśli klient był w międzyczasie
                  <InfoTooltip text="Jeśli klient wrócił do studia między wizytą wyzwalającą a dniem wysyłki (np. na inną usługę), kampania go pominie. Zalecane, bo chroni przed wysyłaniem do klientów, którzy sami wrócili." />
                </FieldLabel>
                <SelectField
                  value={trigger.onlyIfNoVisitSince ? 'yes' : 'no'}
                  onChange={(e) => changeTrigger({ ...trigger, onlyIfNoVisitSince: e.target.value === 'yes' })}
                >
                  <option value="yes">Tak (zalecane)</option>
                  <option value="no">Nie, wyślij zawsze</option>
                </SelectField>
              </Field>
            </Panel>
          )}

          <TwoCols>
            {/* Filtry siedzą na cichym tle: białe karty sekcji czytają się wtedy jako
                warstwa nad podłożem, a nie jako biel na bieli. */}
            <Panel $quiet>
              <h4>Kogo szukamy</h4>
              <AudienceBuilder value={audience} onChange={changeAudience} />
            </Panel>
            <AudienceEstimatePanel
              estimate={estimate}
              isEstimating={isEstimating}
              awaitingTrigger={awaitingTrigger}
            />
          </TwoCols>

          <AudienceTable
            estimate={estimate}
            isEstimating={isEstimating}
            channel={estimateChannel}
            excluded={audience.excludeCustomerIds}
            onExcludedChange={changeExcluded}
            page={audiencePage}
            onPageChange={setAudiencePage}
            awaitingTrigger={awaitingTrigger}
          />

          <NavRow>
            {!isEdit ? (
              <IconButton type="button" onClick={() => setStep('scenario')}>
                <ArrowLeft /> Wstecz
              </IconButton>
            ) : <span />}
            <GuardedButton type="button" aria-disabled={!hasName} onClick={goToContent}>
              Dalej <ArrowRight />
            </GuardedButton>
          </NavRow>
        </>
      )}

      {/* ── Krok 3: Treść ── */}
      {step === 'content' && (
        <>
          <TwoCols $aside="380px" ref={contentRef}>
            <Panel>
              <h4>Treść wiadomości</h4>
              <MessageEditor
                value={content}
                onChange={(next) => { setContent(next); if (contentMissing) setContentMissing(false); }}
              />
            </Panel>
            {/* Podgląd obok edytora, nie po zapisaniu: kampanię pisze się raz, a czyta
                ją tysiąc osób — zobaczyć ich widok trzeba w trakcie, nie po fakcie. */}
            <StickyAside>
              <Panel>
                <ContentPreview
                  smsTemplate={content.smsTemplate}
                  emailSubject={content.emailSubject}
                  emailBody={content.emailBody}
                  channel={content.channel}
                  layout="stacked"
                />
              </Panel>
            </StickyAside>
          </TwoCols>

          {contentMissing && missingContent && (
            <Note $tone="warn">
              <AlertTriangle />
              <span>{missingContent}</span>
            </Note>
          )}

          <NavRow>
            <IconButton type="button" onClick={() => setStep('audience')}>
              <ArrowLeft /> Wstecz
            </IconButton>
            <GuardedButton type="button" aria-disabled={!!missingContent} onClick={goToSummary}>
              Dalej <ArrowRight />
            </GuardedButton>
          </NavRow>
        </>
      )}

      {/* ── Krok 4: Podsumowanie ── */}
      {step === 'summary' && (
        <>
          {/* Ostrzeżenie o kredytach stoi nad podsumowaniem, bo jest jedyną rzeczą,
              która może tę wysyłkę zatrzymać w połowie. */}
          {creditsShort && (
            <Note $tone="warn">
              <Coins />
              <span>
                Ta wysyłka zużyje <strong>{estimatedCredits}</strong> kredytów, a na koncie jest
                ich <strong>{stats?.smsCreditsAvailable}</strong>. Bez doładowania część
                wiadomości nie wyjdzie.
              </span>
              <span className="spacer" />
              <QuietLink type="button" onClick={() => navigate('/settings?tab=credits')}>
                Doładuj
              </QuietLink>
            </Note>
          )}

          <Panel>
            <h4>Podsumowanie</h4>
            <RecapList>
              <dt>Kampania</dt><dd>{name}</dd>
              <dt>Kanał</dt>
              <dd>{content.channel === 'BOTH' ? 'SMS i e-mail' : content.channel === 'SMS' ? 'SMS' : 'E-mail'}</dd>
              <dt>{kind === 'AUTOMATIC' ? `Odbiorcy (${TRIGGER_HORIZON_DAYS} dni)` : 'Odbiorcy'}</dt>
              <dd>{estimate ? `${estimate.eligible} (stan na dziś)` : '—'}</dd>
              {audience.excludeCustomerIds.length > 0 && (
                <>
                  <dt>Odznaczeni ręcznie</dt>
                  <dd>{audience.excludeCustomerIds.length}</dd>
                </>
              )}
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

          <Panel $quiet>
            <ContentPreview
              smsTemplate={content.smsTemplate}
              emailSubject={content.emailSubject}
              emailBody={content.emailBody}
              channel={content.channel}
            />
          </Panel>

          {kind === 'ONE_TIME' && (
            <Panel>
              <h4>Kiedy wysłać</h4>
              <Field style={{ maxWidth: 460 }}>
                <SelectField value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value as ScheduleMode)}>
                  <option value="NOW">Wyślij teraz</option>
                  <option value="AT">Zaplanuj termin</option>
                </SelectField>
              </Field>
              {scheduleMode === 'AT' && (
                <Field style={{ maxWidth: 460 }}>
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
                spełniających warunki w dniu wysyłki. Twoje ręczne odznaczenia zostaną zachowane.
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
              <GuardedButton
                type="button"
                aria-disabled={isSaving || (scheduleMode === 'AT' && !scheduleAt)}
                onClick={() => {
                  if (isSaving) return;
                  if (scheduleMode === 'AT' && !scheduleAt) return;
                  void finish();
                }}
              >
                <Send />
                {kind === 'AUTOMATIC' ? 'Aktywuj kampanię' : scheduleMode === 'AT' ? 'Zaplanuj wysyłkę' : 'Wyślij teraz'}
              </GuardedButton>
            </NavRight>
          </NavRow>
        </>
      )}

      {/*
        Zmieniły się filtry, a na liście wiszą ręczne odznaczenia.
        Nie zgadujemy za użytkownika: „odznaczyłem Kowalskiego, bo był u mnie wczoraj"
        i „odznaczyłem trzy osoby, zanim zmieniłem grupę na zupełnie inną" to dwie
        różne intencje, a interfejs nie ma jak ich rozróżnić. Pytamy raz — po zmianie
        filtra, nie po każdym klawiszu — i zapamiętujemy odpowiedź do następnego
        odznaczenia.
      */}
      <ConfirmationModal
        isOpen={askAboutExclusions}
        variant="info"
        title="Zachować ręczne odznaczenia?"
        message={
          `Lista odbiorców przeliczyła się po zmianie filtrów, a ${audience.excludeCustomerIds.length} ` +
          `${audience.excludeCustomerIds.length === 1 ? 'osoba została' : 'osób zostało'} przez Ciebie ` +
          'odznaczona wcześniej. Zachowane odznaczenia obowiązują też na nowej liście — również ' +
          'w dniu wysyłki.'
        }
        confirmText="Zachowaj odznaczenia"
        cancelText="Zaznacz wszystkich"
        onConfirm={() => {
          setExclusionQuestionPending(false);
          setExclusionsAcknowledged(true);
        }}
        onCancel={() => {
          setExclusionQuestionPending(false);
          setExclusionsAcknowledged(false);
          setAudience({ ...audience, excludeCustomerIds: [] });
        }}
      />
    </ViewContainer>
  );
}
