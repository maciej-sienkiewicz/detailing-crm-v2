// src/modules/settings/components/leads/escalation.ts
//
// Czysta logika ustawień eskalacji czekających zapytań: opisy kroków po ludzku,
// szkic edycji (czas trzymany jako tekst + jednostka, jak w szablonach wiadomości)
// i walidacja przed zapisem. Kontrakt z backendem: LeadEscalationPolicyController.

import type {
    DayOfWeek, EscalationPerson, EscalationPolicy, EscalationRecipient, EscalationStep, EscalationWorkingHours,
} from '../../types';

export const ESCALATION_QUERY_KEY = ['settings', 'lead-escalation-policy'] as const;

export const MAX_STEPS = 10;
export const MAX_RECIPIENTS = 5;
export const MAX_AFTER_MINUTES = 7 * 24 * 60;

export type TimeUnit = 'minutes' | 'hours' | 'days';

export const UNIT_MINUTES: Record<TimeUnit, number> = { minutes: 1, hours: 60, days: 1440 };

export const DAYS: { value: DayOfWeek; short: string }[] = [
    { value: 'MONDAY', short: 'pn' },
    { value: 'TUESDAY', short: 'wt' },
    { value: 'WEDNESDAY', short: 'śr' },
    { value: 'THURSDAY', short: 'cz' },
    { value: 'FRIDAY', short: 'pt' },
    { value: 'SATURDAY', short: 'sb' },
    { value: 'SUNDAY', short: 'nd' },
];

/** 0 → „Od razu", 60 → „Po 1 godz.", 150 → „Po 2 godz. 30 min", 2880 → „Po 2 dniach". */
export function stepTimeLabel(minutes: number): string {
    if (minutes <= 0) return 'Od razu';
    if (minutes % 1440 === 0) {
        const days = minutes / 1440;
        return days === 1 ? 'Po 1 dniu' : `Po ${days} dniach`;
    }
    if (minutes < 60) return `Po ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `Po ${hours} godz.` : `Po ${hours} godz. ${rest} min`;
}

/** Kto dostaje krok - nazwy do jednej linijki opisu, bez kropek-separatorów. */
export function recipientNames(step: EscalationStep, people: EscalationPerson[]): string[] {
    return step.recipients.map(r => {
        if (r.kind === 'TEAM') return 'cały zespół';
        if (r.kind === 'USER') return people.find(p => p.userId === r.userId)?.name ?? 'osoba bez konta';
        return r.label?.trim() || r.phone || 'numer';
    });
}

/** „pn–sb, 8:00–20:00" albo „całą dobę". Ciągłe dni jako zakres, rozrzucone po przecinku. */
export function workingHoursSummary(hours: EscalationWorkingHours): string {
    if (hours.alwaysOn) return 'całą dobę, 7 dni w tygodniu';
    const picked = DAYS.filter(d => hours.days.includes(d.value));
    const indexes = picked.map(d => DAYS.indexOf(d));
    const contiguous = indexes.every((v, i) => i === 0 || v === indexes[i - 1] + 1);
    const days = picked.length === 7 ? 'codziennie'
        : contiguous && picked.length > 2 ? `${picked[0].short}–${picked[picked.length - 1].short}`
        : picked.map(d => d.short).join(', ');
    return `${days}, ${hours.fromHour}:00–${hours.toHour}:00`;
}

// ─── Szkic edycji ────────────────────────────────────────────────────────────────

export interface DraftStep extends EscalationStep {
    /** Tekst w polu czasu - pusty i „0" są dozwolone w trakcie pisania. */
    timeText: string;
    unit: TimeUnit;
}

export interface Draft {
    steps: DraftStep[];
    workingHours: EscalationWorkingHours;
}

export function toDraftStep(step: EscalationStep): DraftStep {
    const unit: TimeUnit = step.afterMinutes > 0 && step.afterMinutes % 1440 === 0 ? 'days'
        : step.afterMinutes > 0 && step.afterMinutes % 60 === 0 ? 'hours'
        : 'minutes';
    return { ...step, unit, timeText: String(step.afterMinutes / UNIT_MINUTES[unit]) };
}

export const toDraft = (policy: EscalationPolicy): Draft => ({
    steps: [...policy.steps].sort((a, b) => a.afterMinutes - b.afterMinutes).map(toDraftStep),
    workingHours: { ...policy.workingHours, days: [...policy.workingHours.days] },
});

/** Minuty kroku albo null, gdy pole jest puste, ułamkowe albo poza zakresem. */
export function draftMinutes(step: Pick<DraftStep, 'timeText' | 'unit'>): number | null {
    const text = step.timeText.trim();
    if (!/^\d+$/.test(text)) return null;
    const minutes = Number(text) * UNIT_MINUTES[step.unit];
    return minutes <= MAX_AFTER_MINUTES ? minutes : null;
}

export const newStepId = () => `step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Następny krok: godzinę po ostatnim, push do zespołu - najczęstszy wybór. */
export function nextStep(steps: DraftStep[]): DraftStep {
    const last = steps.reduce((max, s) => Math.max(max, draftMinutes(s) ?? 0), 0);
    return toDraftStep({
        id: newStepId(),
        afterMinutes: Math.min(last + 60, MAX_AFTER_MINUTES),
        channel: 'PUSH',
        anytime: false,
        recipients: [{ kind: 'TEAM' }],
    });
}

const digits = (phone: string) => phone.replace(/\D/g, '');

/** Numer, który backend przyjmie (normalizeToE164): 9 cyfr albo +kraj i 8-15 cyfr. */
export function isPlausiblePhone(phone: string | null | undefined): boolean {
    const raw = (phone ?? '').trim();
    if (!raw) return false;
    const d = digits(raw);
    return raw.startsWith('+') ? d.length >= 8 && d.length <= 15 : d.length === 9;
}

export interface DraftProblem {
    stepId: string | null;
    message: string;
}

/** Pierwszy problem szkicu albo null. Kolejność = kolejność na ekranie. */
export function draftProblem(draft: Draft): DraftProblem | null {
    for (const [index, step] of draft.steps.entries()) {
        const n = index + 1;
        if (draftMinutes(step) === null) return { stepId: step.id, message: `Krok ${n}: podaj czas do 7 dni.` };
        if (step.recipients.length === 0) return { stepId: step.id, message: `Krok ${n}: wybierz, kogo powiadomić.` };
        const badPhone = step.recipients.find(r => r.kind === 'PHONE' && !isPlausiblePhone(r.phone));
        if (badPhone) return { stepId: step.id, message: `Krok ${n}: popraw numer telefonu.` };
    }
    const hours = draft.workingHours;
    if (!hours.alwaysOn && hours.fromHour >= hours.toHour) {
        return { stepId: null, message: 'Godziny pracy: początek musi być przed końcem.' };
    }
    if (!hours.alwaysOn && hours.days.length === 0) return { stepId: null, message: 'Wybierz co najmniej jeden dzień pracy.' };
    return null;
}

/** Szkic → polityka do zapisu, kroki od najwcześniejszego. Wołać po [draftProblem] == null. */
export function toPolicy(draft: Draft): EscalationPolicy {
    return {
        steps: draft.steps
            .map(({ timeText: _t, unit: _u, ...step }) => ({ ...step, afterMinutes: draftMinutes({ timeText: _t, unit: _u }) ?? 0 }))
            .sort((a, b) => a.afterMinutes - b.afterMinutes),
        workingHours: draft.workingHours,
    };
}

/** Zmiana kanału czyści odbiorców, których nowy kanał nie obsłuży (push na numer, SMS „do zespołu"). */
export function switchChannel(step: DraftStep, channel: DraftStep['channel']): DraftStep {
    if (step.channel === channel) return step;
    const kept: EscalationRecipient[] = step.recipients.filter(r => r.kind === 'USER');
    return { ...step, channel, recipients: channel === 'PUSH' && kept.length === 0 ? [{ kind: 'TEAM' }] : kept };
}
