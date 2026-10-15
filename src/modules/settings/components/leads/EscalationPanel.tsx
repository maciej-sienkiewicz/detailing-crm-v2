// src/modules/settings/components/leads/EscalationPanel.tsx
//
// Ustawienia → Leady → „Przypomnienia o odpowiedzi": łańcuch eskalacji czekającego
// zapytania, jak w PagerDuty / Opsgenie. „Od razu push do zespołu, po godzinie push,
// po 2 godz. SMS do kierownika, po 4 godz. SMS do właściciela."
//
// Panel pokazuje łańcuch jako oś czasu - czyta się go jak zdanie, bez otwierania
// czegokolwiek. Edycja idzie w panelu bocznym: krok ma czas, kanał i odbiorców, więc
// edycja w miejscu rozsadziłaby sekcję, a pasek niezapisanych zmian jest już zajęty
// przez progi poniżej (dwa paski = dwa wypełnione „Zapisz", CLAUDE.md §2). Otwarty
// edytor przejmuje okno, więc jego „Zapisz" wolno wypełnić.

import { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { PhoneInput } from '@/common/components/PhoneInput';
import { formatPhoneNumber } from '@/common/utils';
import {
    Button, DrawerBody, DrawerFooterSpacer, IconButton, Notice, Panel, PanelActions, PanelHead,
    SectionTitle, Segmented, SideDrawer, ui,
} from '@/common/components/ui';
import { leadsSettingsApi } from '../../api/leadsSettingsApi';
import type { EscalationPerson, EscalationPolicy, EscalationPolicyResponse, EscalationRecipient } from '../../types';
import { serverMessage, toastedGlobally } from '../errorToast';
import {
    DAYS, ESCALATION_QUERY_KEY, MAX_RECIPIENTS, MAX_STEPS, draftProblem, nextStep, recipientNames, stepTimeLabel, switchChannel,
    toDraft, toPolicy, workingHoursSummary, type Draft, type DraftStep, type TimeUnit,
} from './escalation';

// ─── Podgląd łańcucha ─────────────────────────────────────────────────────────

export function EscalationPanel() {
    const { data, isPending, isError, refetch } = useQuery({
        queryKey: ESCALATION_QUERY_KEY,
        queryFn: leadsSettingsApi.getEscalationPolicy,
    });
    const [editing, setEditing] = useState(false);

    const steps = data ? [...data.policy.steps].sort((a, b) => a.afterMinutes - b.afterMinutes) : [];
    const usesSms = steps.some(s => s.channel === 'SMS');

    return (
        <Panel aria-labelledby="lead-escalation-title">
            <PanelHead>
                <SectionTitle as="h3" id="lead-escalation-title">Przypomnienia o zapytaniach</SectionTitle>
                {data && (
                    <PanelActions>
                        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Zmień</Button>
                    </PanelActions>
                )}
            </PanelHead>

            <Body>
                {isError && !data ? (
                    <Notice
                        tone="danger"
                        role="alert"
                        title="Nie udało się wczytać przypomnień"
                        action={<Button variant="ghost" size="sm" onClick={() => void refetch()}>Spróbuj ponownie</Button>}
                    />
                ) : isPending || !data ? (
                    <Muted role="status">Wczytywanie przypomnień…</Muted>
                ) : (
                    <>
                        <Lead>Gdy klient długo czeka na odpowiedź, wyślemy przypomnienie:</Lead>
                        {steps.length === 0 ? (
                            <Muted>Przypomnienia są wyłączone. Nikt nie dostanie powiadomienia o nowym zapytaniu.</Muted>
                        ) : (
                            <Timeline aria-label="Kroki przypomnień">
                                {steps.map(step => (
                                    <li key={step.id}>
                                        <When>{stepTimeLabel(step.afterMinutes)}</When>
                                        <What>
                                            <ChannelBadge $sms={step.channel === 'SMS'} aria-hidden="true">
                                                {step.channel === 'SMS' ? <MessageSquare /> : <Bell />}
                                            </ChannelBadge>
                                            <span>
                                                <strong>{step.channel === 'SMS' ? 'SMS' : 'Powiadomienie'}:</strong>
                                                {' '}{recipientNames(step, data.people).join(', ')}
                                                {step.anytime && <Hint>o każdej porze</Hint>}
                                            </span>
                                        </What>
                                    </li>
                                ))}
                            </Timeline>
                        )}
                        <Muted>
                            {data.policy.workingHours.alwaysOn
                                ? 'Liczymy czas przez całą dobę.'
                                : `Liczymy czas tylko w godzinach pracy: ${workingHoursSummary(data.policy.workingHours)}.`}
                            {!data.custom && ' To ustawienia domyślne.'}
                        </Muted>
                        {usesSms && <Muted>SMS-y idą z Twoich kredytów SMS.</Muted>}
                    </>
                )}
            </Body>

            {editing && data && <EscalationDrawer data={data} onClose={() => setEditing(false)} />}
        </Panel>
    );
}

// ─── Edytor ───────────────────────────────────────────────────────────────────

function EscalationDrawer({ data, onClose }: { data: EscalationPolicyResponse; onClose: () => void }) {
    const { showSuccess, showError } = useToast();
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState<Draft>(() => toDraft(data.policy));
    const [dirty, setDirty] = useState(false);
    const [showProblem, setShowProblem] = useState(false);
    const problem = draftProblem(draft);

    const save = useMutation({
        mutationFn: (policy: EscalationPolicy | null) => leadsSettingsApi.updateEscalationPolicy(policy),
        onSuccess: saved => {
            queryClient.setQueryData(ESCALATION_QUERY_KEY, saved);
            showSuccess('Zapisano', saved.custom ? 'Nowe przypomnienia już działają.' : 'Przywróciliśmy ustawienia domyślne.');
            onClose();
        },
        onError: error => {
            if (toastedGlobally(error)) return;
            showError('Nie udało się zapisać', serverMessage(error) ?? 'Spróbuj jeszcze raz. Twoje zmiany nie zniknęły.');
        },
    });

    const update = (next: Draft) => { setDraft(next); setDirty(true); };
    const updateStep = (id: string, change: (step: DraftStep) => DraftStep) =>
        update({ ...draft, steps: draft.steps.map(s => (s.id === id ? change(s) : s)) });

    const close = () => {
        if (dirty && !window.confirm('Zamknąć? Zmiany nie zostaną zapisane.')) return;
        onClose();
    };

    const submit = () => {
        if (problem) { setShowProblem(true); return; }
        save.mutate(toPolicy(draft));
    };

    const hours = draft.workingHours;

    return (
        <SideDrawer
            onClose={close}
            title="Przypomnienia o zapytaniach"
            titleId="lead-escalation-drawer"
            subtitle="Komu i kiedy przypomnieć, że klient czeka na odpowiedź"
            width={620}
            footer={
                <>
                    {data.custom && (
                        <Button variant="ghost" onClick={() => save.mutate(null)} disabled={save.isPending}>
                            Przywróć ustawienia domyślne
                        </Button>
                    )}
                    <DrawerFooterSpacer />
                    <Button variant="ghost" onClick={close} disabled={save.isPending}>Anuluj</Button>
                    <Button variant="primary" onClick={submit} disabled={save.isPending}>
                        {save.isPending ? 'Zapisywanie…' : 'Zapisz'}
                    </Button>
                </>
            }
        >
            <DrawerBody>
                {showProblem && problem && <Notice tone="danger" role="alert" title={problem.message} />}

                <Steps>
                    {draft.steps.map((step, index) => (
                        <StepEditor
                            key={step.id}
                            index={index}
                            step={step}
                            people={data.people}
                            invalid={showProblem && problem?.stepId === step.id}
                            onChange={change => updateStep(step.id, change)}
                            onRemove={() => update({ ...draft, steps: draft.steps.filter(s => s.id !== step.id) })}
                        />
                    ))}
                </Steps>
                {draft.steps.length < MAX_STEPS && (
                    <div>
                        <Button variant="outline" onClick={() => update({ ...draft, steps: [...draft.steps, nextStep(draft.steps)] })}>
                            <Plus aria-hidden="true" />Dodaj krok
                        </Button>
                    </div>
                )}

                <Fieldset>
                    <legend>Godziny pracy</legend>
                    <HelpText>Poza godzinami pracy nie liczymy czasu. Zapytanie z 19:30 przy kroku „po 1 godz.” przypomni o 8:30 następnego dnia.</HelpText>
                    <CheckLine>
                        <input
                            type="checkbox"
                            checked={hours.alwaysOn}
                            onChange={e => update({ ...draft, workingHours: { ...hours, alwaysOn: e.target.checked } })}
                        />
                        Liczymy czas przez całą dobę
                    </CheckLine>
                    {!hours.alwaysOn && (
                        <>
                            <HoursRow>
                                <label>
                                    Od
                                    <Select
                                        value={hours.fromHour}
                                        onChange={e => update({ ...draft, workingHours: { ...hours, fromHour: Number(e.target.value) } })}
                                    >
                                        {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}
                                    </Select>
                                </label>
                                <label>
                                    do
                                    <Select
                                        value={hours.toHour}
                                        onChange={e => update({ ...draft, workingHours: { ...hours, toHour: Number(e.target.value) } })}
                                    >
                                        {Array.from({ length: 24 }, (_, i) => i + 1).map(h => <option key={h} value={h}>{h}:00</option>)}
                                    </Select>
                                </label>
                            </HoursRow>
                            <DayRow role="group" aria-label="Dni pracy">
                                {DAYS.map(day => {
                                    const on = hours.days.includes(day.value);
                                    return (
                                        <DayToggle
                                            key={day.value}
                                            type="button"
                                            aria-pressed={on}
                                            $on={on}
                                            onClick={() => update({
                                                ...draft,
                                                workingHours: {
                                                    ...hours,
                                                    days: on ? hours.days.filter(d => d !== day.value) : [...hours.days, day.value],
                                                },
                                            })}
                                        >
                                            {day.short}
                                        </DayToggle>
                                    );
                                })}
                            </DayRow>
                        </>
                    )}
                </Fieldset>
            </DrawerBody>
        </SideDrawer>
    );
}

// ─── Krok ─────────────────────────────────────────────────────────────────────

interface StepEditorProps {
    index: number;
    step: DraftStep;
    people: EscalationPerson[];
    invalid: boolean;
    onChange: (change: (step: DraftStep) => DraftStep) => void;
    onRemove: () => void;
}

function StepEditor({ index, step, people, invalid, onChange, onRemove }: StepEditorProps) {
    const idBase = `escalation-step-${step.id}`;
    const has = (r: (x: EscalationRecipient) => boolean) => step.recipients.some(r);
    const toggle = (recipient: EscalationRecipient, on: boolean, same: (x: EscalationRecipient) => boolean) =>
        onChange(s => ({ ...s, recipients: on ? [...s.recipients, recipient] : s.recipients.filter(x => !same(x)) }));
    const phones = step.recipients
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.kind === 'PHONE');
    const full = step.recipients.length >= MAX_RECIPIENTS;
    const teamChosen = has(r => r.kind === 'TEAM');

    return (
        <StepCard $invalid={invalid} aria-labelledby={`${idBase}-title`}>
            <StepHead>
                <StepTitle id={`${idBase}-title`}>Krok {index + 1}</StepTitle>
                <IconButton label={`Usuń krok ${index + 1}`} variant="ghost" size="sm" onClick={onRemove}>
                    <Trash2 />
                </IconButton>
            </StepHead>

            <TimeRow>
                <span aria-hidden="true">Po</span>
                <TimeFields>
                    <TimeInput
                        id={`${idBase}-time`}
                        aria-label="Po jakim czasie bez odpowiedzi"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={step.timeText}
                        onChange={e => onChange(s => ({ ...s, timeText: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                    />
                    <Select
                        aria-label="Jednostka czasu"
                        value={step.unit}
                        onChange={e => onChange(s => ({ ...s, unit: e.target.value as TimeUnit }))}
                    >
                        <option value="minutes">min</option>
                        <option value="hours">godz.</option>
                        <option value="days">dni</option>
                    </Select>
                </TimeFields>
                <span>{step.timeText.trim() === '0' ? 'czyli od razu' : 'bez odpowiedzi'}</span>
            </TimeRow>

            <Segmented
                label="Jak przypomnieć"
                size="sm"
                value={step.channel}
                onChange={channel => onChange(s => switchChannel(s, channel))}
                options={[
                    { value: 'PUSH', label: 'Powiadomienie na telefon' },
                    { value: 'SMS', label: 'SMS' },
                ]}
            />

            <Recipients role="group" aria-label={`Komu przypomnieć w kroku ${index + 1}`}>
                {step.channel === 'PUSH' && (
                    <CheckLine>
                        <input
                            type="checkbox"
                            checked={teamChosen}
                            onChange={e => toggle({ kind: 'TEAM' }, e.target.checked, x => x.kind === 'TEAM')}
                        />
                        Wszyscy, którzy obsługują zapytania
                    </CheckLine>
                )}
                {/* „Cały zespół" obejmuje każdą osobę z listy - pokazywanie jej obok byłoby
                    pięcioma wyszarzonymi polami, których nie da się zaznaczyć. */}
                {!(step.channel === 'PUSH' && teamChosen) && people.map(person => {
                    const chosen = has(r => r.kind === 'USER' && r.userId === person.userId);
                    const noPhone = step.channel === 'SMS' && !person.phone;
                    const details = [
                        person.isOwner ? 'właściciel' : null,
                        step.channel === 'SMS' ? (person.phone ? formatPhoneNumber(person.phone) : 'brak numeru telefonu') : null,
                    ].filter(Boolean).join(', ');
                    return (
                        <CheckLine key={person.userId} $muted={noPhone}>
                            <input
                                type="checkbox"
                                checked={chosen}
                                disabled={!chosen && (full || noPhone)}
                                onChange={e => toggle(
                                    { kind: 'USER', userId: person.userId },
                                    e.target.checked,
                                    x => x.kind === 'USER' && x.userId === person.userId,
                                )}
                            />
                            <Who>
                                <span>{person.name}</span>
                                {details && <small>{details}</small>}
                            </Who>
                        </CheckLine>
                    );
                })}
                {step.channel === 'SMS' && phones.map(({ r, i }) => (
                    <PhoneLine key={i}>
                        <LabelInput
                            aria-label="Nazwa"
                            placeholder="Nazwa, np. Kierownik Marek"
                            value={r.label ?? ''}
                            maxLength={60}
                            onChange={e => onChange(s => ({
                                ...s,
                                recipients: s.recipients.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                            }))}
                        />
                        <PhoneInput
                            value={r.phone ?? ''}
                            hasError={invalid && !r.phone}
                            onChange={phone => onChange(s => ({
                                ...s,
                                recipients: s.recipients.map((x, j) => (j === i ? { ...x, phone } : x)),
                            }))}
                        />
                        <IconButton
                            label="Usuń numer"
                            variant="ghost"
                            size="sm"
                            onClick={() => onChange(s => ({ ...s, recipients: s.recipients.filter((_, j) => j !== i) }))}
                        >
                            <Trash2 />
                        </IconButton>
                    </PhoneLine>
                ))}
                {step.channel === 'SMS' && !full && (
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onChange(s => ({ ...s, recipients: [...s.recipients, { kind: 'PHONE', phone: '', label: '' }] }))}
                        >
                            <Plus aria-hidden="true" />Dodaj inny numer
                        </Button>
                    </div>
                )}
            </Recipients>

            <CheckLine>
                <input
                    type="checkbox"
                    checked={step.anytime}
                    onChange={e => onChange(s => ({ ...s, anytime: e.target.checked }))}
                />
                Wysyłaj też w nocy i w dni wolne
            </CheckLine>
        </StepCard>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 24px 20px;

    @media (max-width: 767px) { padding: 0 16px 16px; }
`;

const Lead = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.textSecondary};
    max-width: 68ch;
`;

const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

const Hint = styled.span`
    margin-left: 8px;
    font-size: 12.5px;
    font-weight: 400;
    color: ${ui.textMuted};
`;

const HelpText = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

const Timeline = styled.ol`
    margin: 0;
    padding: 0;
    list-style: none;

    li {
        display: grid;
        grid-template-columns: 132px minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        padding: 10px 0;
        border-top: 1px solid ${ui.lineFaint};
    }
    li:first-child { border-top: none; }

    @media (max-width: 520px) {
        li { grid-template-columns: 1fr; gap: 4px; }
    }
`;

const When = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
`;

const What = styled.span`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    font-size: 13.5px;
    color: ${ui.textSecondary};

    strong { color: ${ui.ink}; font-weight: 600; }
`;

/* Odcień = znaczenie: SMS kosztuje kredyty i budzi człowieka - bursztyn „przeczytaj",
   push - błękit marki. Tło i obwódka, bez wypełnienia (CLAUDE.md §2). */
const ChannelBadge = styled.span<{ $sms: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1px solid ${p => (p.$sms ? ui.warnLine : ui.brandLineSoft)};
    background: ${p => (p.$sms ? ui.warnTint : ui.brandTint)};
    color: ${p => (p.$sms ? ui.warnInk : ui.brandInk)};

    svg { width: 15px; height: 15px; }
`;

const Steps = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const StepCard = styled.section<{ $invalid: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid ${p => (p.$invalid ? ui.dangerLine : ui.line)};
    border-radius: ${ui.radiusStrip};
    background: ${p => (p.$invalid ? ui.dangerTint : ui.surface)};
`;

const StepHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const StepTitle = styled.h4`
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: ${ui.ink};
`;

const TimeRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;

    > span { font-size: 13.5px; color: ${ui.textSecondary}; }
`;

const fieldBase = `
    height: 38px;
    border: 1px solid ${ui.line};
    border-radius: 10px;
    font-family: inherit;
    font-size: 16px;
    color: ${ui.ink};
    background: ${ui.surface};

    &:focus { outline: none; border-color: ${ui.focusRing}; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12); }
    @media (min-width: 768px) { font-size: 14px; }
`;

const TimeInput = styled.input`
    ${fieldBase}
    width: 72px;
    padding: 0 10px;
    text-align: right;
    font-variant-numeric: tabular-nums;
`;

const Select = styled.select`
    ${fieldBase}
    padding: 0 8px;
    margin-left: 6px;
`;

const LabelInput = styled.input`
    ${fieldBase}
    padding: 0 10px;
    width: 170px;
    min-width: 0;

    @media (max-width: 560px) { width: 100%; }
`;

/* Liczba i jednostka to jedno pole - na telefonie nie mogą się rozjechać na dwie linie. */
const TimeFields = styled.span`
    display: inline-flex;
    align-items: center;
`;

/* Imię i dopisek (właściciel, numer) - dopisek schodzi pod imię, gdy brakuje miejsca. */
const Who = styled.span`
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 10px;
    min-width: 0;

    small { font-size: 12.5px; color: ${ui.textMuted}; }
`;

const Recipients = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const CheckLine = styled.label<{ $muted?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 32px;
    font-size: 14px;
    color: ${p => (p.$muted ? ui.textMuted : ui.ink)};
    cursor: pointer;

    input { width: 18px; height: 18px; accent-color: ${ui.brand}; flex-shrink: 0; }
`;

const PhoneLine = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;

    > :nth-child(2) { flex: 1 1 220px; min-width: 0; }
`;

const Fieldset = styled.fieldset`
    margin: 0;
    padding: 14px 16px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    display: flex;
    flex-direction: column;
    gap: 10px;

    legend { padding: 0 6px; font-size: 14px; font-weight: 700; color: ${ui.ink}; }
`;

const HoursRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;

    label { font-size: 13.5px; color: ${ui.textSecondary}; }
`;

const DayRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const DayToggle = styled.button<{ $on: boolean }>`
    min-width: 42px;
    height: 34px;
    padding: 0 10px;
    border-radius: 9px;
    border: 1px solid ${p => (p.$on ? ui.brandLine : ui.line)};
    background: ${p => (p.$on ? ui.brandTint : ui.surface)};
    color: ${p => (p.$on ? ui.brandInk : ui.textMuted)};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;
