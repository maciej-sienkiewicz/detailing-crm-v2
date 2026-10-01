// src/modules/employees/components/leave/LeaveFormSteps.tsx
//
// Kroki wspólne dla wniosku pracownika i urlopu dodawanego przez administratora:
// rodzaj, termin, podsumowanie i podpis wnioskodawcy. Treść jest ta sama - różni się
// tylko to, KTO ją czyta (pracownik na swoim telefonie albo na urządzeniu studia).
//
// Termin wybiera się na tym samym kalendarzu co przy przyjmowaniu rezerwacji: pierwsze
// kliknięcie to pierwszy dzień, drugie - ostatni, a zakres jest podświetlony. Dwa
// osobne pola daty kazały otwierać kalendarz dwa razy i nie pokazywały zakresu.

import type { ReactNode, RefObject } from 'react';
import styled from 'styled-components';
import { ChoiceCard, ChoiceList, Notice, ui } from '@/common/components/ui';
import { DateRangePicker } from '@/common/components/DateTimePicker';
import { SignaturePad, type SignaturePadHandle } from '@/common/components/SignaturePad';
import type { LeaveApiError } from '../../api/leaveRequestsApi';
import type { LeaveRequestPreview } from '../../types';
import {
    LEAVE_REASON_MAX, formatDay, formatLeaveRange, formatLeaveRangeLong, workingDaysLabel,
} from '../../utils/leaveRequestFormat';
import { LEAVE_KINDS, type LeaveKind, type LeaveKindKey } from './leaveKinds';
import {
    CharCounter, Check, Field, FieldError, FieldRowPair, Hint, Label, LabelRow, Textarea,
} from './leaveForm.styles';

export type FieldErrors = Partial<Record<string, string>>;

// ─── Rodzaj ──────────────────────────────────────────────────────────────────

interface KindStepProps {
    value: LeaveKindKey | null;
    onChange: (key: LeaveKindKey) => void;
    errors: FieldErrors;
    /** Kogo dotyczy wniosek - przy urlopie dodawanym za kogoś. */
    lead?: ReactNode;
}

export function LeaveKindStep({ value, onChange, errors, lead }: KindStepProps) {
    return (
        <Stack>
            <StepHeading>Jaki to urlop?</StepHeading>
            {lead && <Lead>{lead}</Lead>}
            {errors.leaveType && <FieldError role="alert">{errors.leaveType}</FieldError>}
            {errors.onDemand && <FieldError role="alert">{errors.onDemand}</FieldError>}
            <ChoiceList role="radiogroup" aria-label="Rodzaj urlopu">
                {LEAVE_KINDS.map(({ icon: Icon, ...k }) => (
                    <ChoiceCard
                        key={k.key}
                        type="radio"
                        name="leave-kind"
                        checked={value === k.key}
                        onChange={() => onChange(k.key)}
                        title={k.title}
                        detail={k.detail}
                        icon={<Icon />}
                    />
                ))}
            </ChoiceList>
        </Stack>
    );
}

// ─── Termin ──────────────────────────────────────────────────────────────────

export interface PreviewState {
    data: LeaveRequestPreview | undefined;
    isFetching: boolean;
    error: LeaveApiError | null;
}

interface TermStepProps {
    kind: LeaveKind;
    startDate: string;
    endDate: string;
    onStartChange: (value: string) => void;
    onEndChange: (value: string) => void;
    /** Najwcześniejszy dzień: jutro, a przy „na żądanie" - dziś (kontrakt). */
    minStart: string;
    reason: string;
    onReasonChange: (value: string) => void;
    errors: FieldErrors;
    preview: PreviewState;
    /** Kto jeszcze jest wtedy nieobecny - informacja, nie blokada. */
    absentNames: string[];
    /** Zdanie pod listą nieobecnych: kto i jak rozstrzyga. */
    absentNote: string;
    /** Otwarty kalendarz przejmuje Escape - okno nie może się wtedy zamknąć. */
    onPickerOpenChange: (open: boolean) => void;
}

export function LeaveTermStep({
    kind, startDate, endDate, onStartChange, onEndChange, minStart, reason, onReasonChange,
    errors, preview, absentNames, absentNote, onPickerOpenChange,
}: TermStepProps) {
    const rangeValid = !!startDate && !!endDate && endDate >= startDate;
    const startError = errors.startDate ?? (preview.error?.field === 'startDate' ? preview.error.message : null);
    const endError = errors.endDate ?? (preview.error?.field === 'endDate' ? preview.error.message : null);
    const required = kind.leaveType === 'SPECIAL';

    const picker = (role: 'start' | 'end') => (
        <DateRangePicker
            role={role}
            id={`leave-${role}`}
            labelledBy={`leave-${role}-label`}
            start={startDate}
            end={endDate}
            onStartChange={onStartChange}
            onEndChange={onEndChange}
            showTime={false}
            endHasTime={false}
            minDate={minStart}
            hasError={role === 'start' ? !!startError : !!endError}
            placeholder={role === 'start' ? 'Pierwszy dzień' : 'Ostatni dzień'}
            onFocus={() => onPickerOpenChange(true)}
            onBlur={() => onPickerOpenChange(false)}
        />
    );

    return (
        <Stack>
            <StepHeading>{kind.title}: kiedy?</StepHeading>
            <Hint>Na kalendarzu kliknij pierwszy dzień urlopu, a potem ostatni.</Hint>

            <FieldRowPair>
                <Field>
                    <Label id="leave-start-label" htmlFor="leave-start">Od</Label>
                    {picker('start')}
                    {startError && <FieldError role="alert">{startError}</FieldError>}
                </Field>
                <Field>
                    <Label id="leave-end-label" htmlFor="leave-end">Do</Label>
                    {picker('end')}
                    {endError && <FieldError role="alert">{endError}</FieldError>}
                </Field>
            </FieldRowPair>

            {rangeValid && (
                <Tally aria-live="polite">
                    {preview.isFetching && !preview.data ? (
                        <Hint>Liczę dni robocze…</Hint>
                    ) : preview.data ? (
                        <>
                            <strong>{workingDaysLabel(preview.data.workingDays)}</strong>
                            <span>{formatLeaveRange(startDate, endDate)}</span>
                            {preview.data.holidays.length > 0 && (
                                <HolidayList aria-label="Pominięte święta">
                                    {preview.data.holidays.map(h => (
                                        <li key={h.date}>Bez {formatDay(h.date)}: {h.name}</li>
                                    ))}
                                </HolidayList>
                            )}
                        </>
                    ) : preview.error && !preview.error.field ? (
                        <FieldError role="alert">{preview.error.message ?? 'Nie udało się policzyć dni roboczych.'}</FieldError>
                    ) : null}
                </Tally>
            )}

            {absentNames.length > 0 && (
                // Informacja, nie blokada: bursztyn jako tło i obwódka, bez wypełnienia.
                <Notice tone="warn" title="W tych dniach nieobecni są też inni">
                    {absentNames.join(', ')}. {absentNote}
                </Notice>
            )}

            <Field>
                <LabelRow>
                    <Label htmlFor="leave-reason">{required ? 'Powód' : 'Powód (opcjonalnie)'}</Label>
                    <CharCounter $near={reason.length > LEAVE_REASON_MAX - 20}>{reason.length}/{LEAVE_REASON_MAX}</CharCounter>
                </LabelRow>
                <Textarea
                    id="leave-reason"
                    value={reason}
                    maxLength={LEAVE_REASON_MAX}
                    required={required}
                    $invalid={!!errors.reason}
                    aria-invalid={!!errors.reason || undefined}
                    placeholder={required ? 'np. ślub, narodziny dziecka' : ''}
                    onChange={e => onReasonChange(e.target.value)}
                />
                {errors.reason && <FieldError role="alert">{errors.reason}</FieldError>}
                <Hint>Powód trafi na wniosek, więc jest krótki - mieści się w polu dokumentu.</Hint>
            </Field>
        </Stack>
    );
}

// ─── Podsumowanie ────────────────────────────────────────────────────────────

interface SummaryProps {
    /** „Prosisz o" u pracownika, „Anna Nowak prosi o" u administratora. */
    who: string;
    kind: LeaveKind;
    startDate: string;
    endDate: string;
    workingDays: number;
    reason: string | null;
    holidays?: LeaveRequestPreview['holidays'];
}

/** Wniosek zwykłymi słowami, zanim padnie podpis - PDF pod spodem jest dowodem. */
export function LeaveSummary({ who, kind, startDate, endDate, workingDays, reason, holidays }: SummaryProps) {
    return (
        <SummaryBox>
            <span className="lede">{who} {kind.phrase}</span>
            <strong>{workingDaysLabel(workingDays)}</strong>
            <span>{formatLeaveRangeLong(startDate, endDate)}</span>
            {holidays && holidays.length > 0 && (
                <span>Święta w tym czasie nie liczą się do urlopu: {holidays.map(h => h.name).join(', ')}.</span>
            )}
            {reason && <span>Powód: {reason}</span>}
        </SummaryBox>
    );
}

// ─── Podpis wnioskodawcy ─────────────────────────────────────────────────────

interface SignatureBlockProps {
    declaration: ReactNode;
    declared: boolean;
    onDeclaredChange: (value: boolean) => void;
    padRef: RefObject<SignaturePadHandle | null>;
    onInkChange: (ink: boolean) => void;
    placeholder?: string;
    hint?: ReactNode;
}

/**
 * Oświadczenie i pole podpisu. Interfejs nie ma ścieżki z jednym z nich: przycisk
 * podpisu w stopce budzi się dopiero po narysowaniu podpisu i zaznaczeniu oświadczenia.
 */
export function SignatureBlock({
    declaration, declared, onDeclaredChange, padRef, onInkChange, placeholder = 'Podpisz palcem w tym polu', hint,
}: SignatureBlockProps) {
    return (
        <Stack>
            <Check>
                <input type="checkbox" checked={declared} onChange={e => onDeclaredChange(e.target.checked)} />
                {declaration}
            </Check>
            <PadBlock>
                <SignaturePad ref={padRef} onInkChange={onInkChange} height="clamp(150px, 26vh, 210px)" clearable placeholder={placeholder} />
                {hint && <Hint>{hint}</Hint>}
            </PadBlock>
        </Stack>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

export const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
`;

export const StepHeading = styled.h3`
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${ui.ink};
`;

export const Lead = styled.p`
    margin: -6px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${ui.textSecondary};
`;

const Tally = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border-radius: ${ui.radiusStrip};
    background: ${ui.surfaceSoft};
    border: 1px solid ${ui.lineSoft};

    strong { font-size: 20px; font-weight: 700; letter-spacing: -0.01em; color: ${ui.ink}; }
    > span { font-size: 13.5px; color: ${ui.textSecondary}; }
`;

const HolidayList = styled.ul`
    margin: 2px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    color: ${ui.textSecondary};
`;

const SummaryBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;

    .lede { font-size: 14px; color: ${ui.textSecondary}; }
    strong { font-size: 26px; font-weight: 700; letter-spacing: -0.015em; color: ${ui.ink}; }
    span { font-size: 14px; line-height: 1.45; color: ${ui.inkSoft}; }
`;

const PadBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;
