// src/modules/employees/components/leave/LeaveRequestWizard.tsx
//
// Kreator wniosku urlopowego w oknie, krok po kroku: 1 Rodzaj, 2 Termin, 3 Dokument,
// 4 Podpis. Każdy krok zadaje jedno pytanie. Był bocznym panelem z całym formularzem
// naraz i ze zbędnymi polami (zastępca) - zgłoszenie: mało czytelne, nie wiadomo,
// od czego zacząć.
//
// Termin wybiera się na tym samym kalendarzu co przy rezerwacji (DateRangePicker):
// pierwsze kliknięcie to pierwszy dzień urlopu, drugie - ostatni, bez zamykania okna.
//
// „Dalej" z kroku terminu tworzy SZKIC na serwerze (DRAFT z gotowym PDF), bo krok
// dokumentu pokazuje dokładnie ten dokument, który powstanie - podpis dotyczy bajtów,
// których skrót dał backend (WYSIWYS). Szkic bez podpisu nie jest wnioskiem: nie
// trafia do kolejki ani do kalendarza, a porzucony backend usuwa po 24 h. Mimo to
// kreator nie zostawia po sobie więcej niż jednego szkicu: powrót i zmiana danych
// wycofuje stary szkic, zamknięcie bez wysłania - też.
//
// Interfejs nie ma ścieżki z jednym podpisem: „Podpisz i wyślij wniosek" budzi się
// dopiero po narysowaniu podpisu i zaznaczeniu oświadczenia.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import {
    Baby, CalendarHeart, CalendarX2, PenLine, Sun, Timer, Users,
} from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import {
    Button, ChoiceCard, ChoiceList, Notice, StepPills, ui, type StepState,
} from '@/common/components/ui';
import { DateRangePicker } from '@/common/components/DateTimePicker';
import { useToast } from '@/common/components/Toast';
import { SignaturePad, type SignaturePadHandle } from '@/common/components/SignaturePad';
import { useAuth } from '@/core/context/AuthContext';
import { usePermissions, ANY_EMPLOYEES } from '@/core/permissions';
import { leaveApiError, myLeaveRequestsApi } from '../../api/leaveRequestsApi';
import { useLeaveCalendar } from '../../hooks/useLeaves';
import {
    MY_LEAVE_REQUESTS_KEY, useCreateLeaveRequest, useLeaveRequestPreview, useSubmitLeaveRequest,
} from '../../hooks/useLeaveRequests';
import type { CreateLeaveRequestPayload, LeaveRequestDetail, LeaveRequestType, SigningSession } from '../../types';
import {
    LEAVE_REASON_MAX, addDaysIso, formatDay, formatLeaveRange, leaveRequestTypeLabel, todayIso, workingDaysLabel,
} from '../../utils/leaveRequestFormat';
import { PrimaryAction } from './PrimaryAction';
import { LeavePdf } from './LeavePdf';
import {
    CharCounter, Check, Field, FieldError, FieldRowPair, Hint, Label, LabelRow, Textarea,
} from './leaveForm.styles';
import { FooterSpacer, HeadStack, StepBody, StepHead } from './leaveModal.styles';

// ─── Rodzaje ─────────────────────────────────────────────────────────────────

type KindKey = 'ANNUAL' | 'ON_DEMAND' | 'UNPAID' | 'SPECIAL' | 'CARE' | 'PARENTAL';

interface KindDef {
    key: KindKey;
    leaveType: LeaveRequestType;
    onDemand: boolean;
    title: string;
    detail: string;
    icon: ReactNode;
}

const KINDS: KindDef[] = [
    { key: 'ANNUAL', leaveType: 'ANNUAL', onDemand: false, title: 'Wypoczynkowy', detail: 'Zaplanowany urlop, najwcześniej od jutra', icon: <Sun /> },
    { key: 'ON_DEMAND', leaveType: 'ANNUAL', onDemand: true, title: 'Na żądanie', detail: 'Także od dziś, najwyżej 4 dni w roku', icon: <Timer /> },
    { key: 'UNPAID', leaveType: 'UNPAID', onDemand: false, title: 'Bezpłatny', detail: 'Bez wynagrodzenia za te dni', icon: <CalendarX2 /> },
    { key: 'SPECIAL', leaveType: 'SPECIAL', onDemand: false, title: 'Okolicznościowy', detail: 'Ślub, narodziny dziecka, pogrzeb - z podaniem powodu', icon: <CalendarHeart /> },
    { key: 'CARE', leaveType: 'CARE', onDemand: false, title: 'Opieka nad dzieckiem', detail: 'Zwolnienie od pracy na opiekę', icon: <Users /> },
    { key: 'PARENTAL', leaveType: 'PARENTAL', onDemand: false, title: 'Rodzicielski / wychowawczy', detail: 'Dłuższa nieobecność po narodzinach dziecka', icon: <Baby /> },
];

type Step = 1 | 2 | 3 | 4;
type FieldErrors = Partial<Record<string, string>>;

const STEP_LABELS: Record<Step, string> = { 1: 'Rodzaj', 2: 'Termin', 3: 'Dokument', 4: 'Podpis' };

/** Pola kroku 2 - błąd z `field` spoza tej listy (leaveType, onDemand) cofa do kroku 1. */
const TERM_FIELDS = new Set(['startDate', 'endDate', 'reason']);

interface Draft {
    request: LeaveRequestDetail;
    session: SigningSession;
    /** Dane, z których powstał szkic - inne dane = nowy szkic. */
    payloadKey: string;
}

const REFRESHED_MESSAGE = 'Dokument został odświeżony. Sprawdź go i podpisz ponownie.';
const TITLE_ID = 'leave-request-wizard-title';

/** Wycofanie szkicu „w tle": nieudane nic nie psuje, backend i tak sprząta szkice po 24 h. */
function discardDraft(target: Draft | null) {
    if (!target) return;
    void myLeaveRequestsApi.withdraw(target.request.id).catch(() => undefined);
}

interface Props {
    onClose: () => void;
}

export function LeaveRequestWizard({ onClose }: Props) {
    const { user } = useAuth();
    const { can } = usePermissions();
    const { showSuccess, showError } = useToast();
    const selfEmployeeId = user?.employeeId ?? null;

    const [step, setStep] = useState<Step>(1);
    const [kind, setKind] = useState<KindKey | null>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});

    const [draft, setDraft] = useState<Draft | null>(null);
    const draftRef = useRef<Draft | null>(null);
    const submittedRef = useRef(false);
    useEffect(() => { draftRef.current = draft; }, [draft]);

    const kindDef = KINDS.find(k => k.key === kind) ?? null;
    const today = todayIso();
    // Zwykły wniosek najwcześniej od jutra; „na żądanie" - także na dziś (kontrakt).
    const minStartFor = (def: KindDef | null) => (def?.onDemand ? today : addDaysIso(today, 1));
    const minStart = minStartFor(kindDef);

    // ── Krok 2: licznik na żywo, święta, kto jeszcze jest wtedy nieobecny ──
    const preview = useLeaveRequestPreview(startDate, endDate);
    const previewError = preview.isError ? leaveApiError(preview.error) : null;

    // Kalendarz urlopów to widok kadrowy/warsztatowy - kto go nie ma, nie dostaje
    // bursztynowej informacji, zamiast pytać API o 403.
    const canSeeTeam = can('VISITS_VIEW') || can(ANY_EMPLOYEES);
    const rangeValid = !!startDate && !!endDate && endDate >= startDate;
    const { leaveDayMap } = useLeaveCalendar(
        canSeeTeam && rangeValid ? startDate : null,
        canSeeTeam && rangeValid ? endDate : null,
    );
    const absentColleagues = useMemo(() => {
        const names = new Map<string, string>();
        leaveDayMap.forEach(day => day.employees.forEach(e => {
            if (e.id !== selfEmployeeId) names.set(e.id, e.fullName);
        }));
        return [...names.values()];
    }, [leaveDayMap, selfEmployeeId]);

    // ── Kroki 3-4: dokument i podpis ──
    const documentQuery = useQuery({
        queryKey: [...MY_LEAVE_REQUESTS_KEY, 'document', draft?.request.id ?? '', draft?.session.challenge ?? ''],
        queryFn: () => myLeaveRequestsApi.document(draft!.request.id),
        enabled: step >= 3 && !!draft,
        retry: false,
        staleTime: Infinity,
        gcTime: 0,
    });
    const padRef = useRef<SignaturePadHandle>(null);
    const [hasInk, setHasInk] = useState(false);
    const [declared, setDeclared] = useState(false);
    const [signNotice, setSignNotice] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const createDraft = useCreateLeaveRequest();
    const submit = useSubmitLeaveRequest();

    // Szkic, który nie został wysłany, nie może wisieć po zamknięciu kreatora.
    useEffect(() => () => {
        if (!submittedRef.current) discardDraft(draftRef.current);
    }, []);

    const chooseKind = (next: KindDef) => {
        setKind(next.key);
        setErrors({});
        // Zmiana z „na żądanie" na zwykły urlop przesuwa najwcześniejszy dzień na jutro:
        // termin od dziś nie przejdzie, więc nie ma go co zostawiać w polach.
        if (startDate && startDate < minStartFor(next)) {
            setStartDate('');
            setEndDate('');
        }
    };

    const payload = (): CreateLeaveRequestPayload | null => {
        if (!kindDef) return null;
        const trimmedReason = reason.trim();
        return {
            leaveType: kindDef.leaveType,
            onDemand: kindDef.onDemand,
            startDate,
            endDate,
            ...(trimmedReason ? { reason: trimmedReason } : {}),
        };
    };

    const validateTerm = (): FieldErrors => {
        const next: FieldErrors = {};
        if (!startDate) next.startDate = 'Wybierz w kalendarzu pierwszy dzień urlopu.';
        if (!endDate) next.endDate = 'Wybierz w kalendarzu ostatni dzień urlopu.';
        if (startDate && endDate && endDate < startDate) next.endDate = 'Koniec nie może być przed początkiem.';
        if (kindDef?.leaveType === 'SPECIAL' && !reason.trim()) next.reason = 'Przy urlopie okolicznościowym podaj powód.';
        if (reason.trim().length > LEAVE_REASON_MAX) next.reason = `Najwyżej ${LEAVE_REASON_MAX} znaków.`;
        return next;
    };

    const goToDocument = () => {
        const body = payload();
        if (!body) return;
        const local = validateTerm();
        if (Object.keys(local).length > 0) { setErrors(local); return; }
        const key = JSON.stringify(body);
        // Te same dane - ten sam szkic i ten sam dokument, bez nowego żądania.
        if (draft && draft.payloadKey === key) { setStep(3); return; }

        createDraft.mutate(body, {
            onSuccess: ({ request, session }) => {
                discardDraft(draft);
                setDraft({ request, session, payloadKey: key });
                setErrors({});
                setSignNotice(null);
                setDeclared(false);
                setStep(3);
            },
            onError: error => {
                const { field, message } = leaveApiError(error);
                if (field && message) {
                    setErrors({ [field]: message });
                    if (!TERM_FIELDS.has(field)) setStep(1);
                    return;
                }
                showError('Nie udało się przygotować wniosku', message ?? 'Spróbuj ponownie za chwilę.');
            },
        });
    };

    /** 409: dokument albo jednorazowy challenge się zmienił - nowa sesja, nowy dokument, czysty pad. */
    const refreshSigning = async (message: string) => {
        if (!draft) return;
        setRefreshing(true);
        try {
            const session = await myLeaveRequestsApi.signingSession(draft.request.id);
            setDraft({ ...draft, session });
        } catch (error) {
            showError('Nie udało się odświeżyć dokumentu', leaveApiError(error).message ?? 'Zacznij wniosek od nowa.');
        } finally {
            setRefreshing(false);
        }
        padRef.current?.clear();
        setDeclared(false);
        setSignNotice(message);
        // Odświeżony dokument trzeba najpierw zobaczyć - podpis dotyczy nowych bajtów.
        setStep(3);
    };

    const handleSubmit = () => {
        if (!draft) return;
        const signatureImageBase64 = padRef.current?.toPngBase64();
        if (!signatureImageBase64 || !declared) return;
        submit.mutate(
            {
                id: draft.request.id,
                payload: {
                    signatureImageBase64,
                    documentSha256: draft.session.documentSha256,
                    challenge: draft.session.challenge,
                    declarationAccepted: true,
                },
            },
            {
                onSuccess: () => {
                    submittedRef.current = true;
                    showSuccess('Wniosek wysłany', 'Czeka na akceptację. Dostaniesz powiadomienie.');
                    onClose();
                },
                onError: error => {
                    const { status, message } = leaveApiError(error);
                    if (status === 409) { void refreshSigning(REFRESHED_MESSAGE); return; }
                    setSignNotice(message ?? 'Nie udało się wysłać wniosku. Spróbuj ponownie.');
                },
            },
        );
    };

    const setField = (field: string, apply: () => void) => {
        apply();
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const stepState = (n: Step): StepState => (step === n ? 'active' : step > n ? 'done' : 'todo');
    const steps = ([1, 2, 3, 4] as Step[]).map(n => ({ key: String(n), label: STEP_LABELS[n], state: stepState(n) }));

    const canSubmit = step === 4 && !!draft && hasInk && declared && !submit.isPending && !refreshing
        && !!documentQuery.data;

    // ── Stopka: jedno wypełnienie - krok następny ──
    let footer;
    if (step === 1) {
        footer = (
            <>
                <Button variant="ghost" onClick={onClose}>Anuluj</Button>
                <FooterSpacer />
                <Button variant="primary" size="lg" disabled={!kind} onClick={() => setStep(2)}>Dalej</Button>
            </>
        );
    } else if (step === 2) {
        footer = (
            <>
                <Button variant="outline" onClick={() => setStep(1)}>Wstecz</Button>
                <FooterSpacer />
                <Button variant="primary" size="lg" disabled={createDraft.isPending} onClick={goToDocument}>
                    {createDraft.isPending ? 'Przygotowuję wniosek…' : 'Dalej'}
                </Button>
            </>
        );
    } else if (step === 3) {
        footer = (
            <>
                <Button variant="outline" onClick={() => setStep(2)}>Wstecz</Button>
                <FooterSpacer />
                <Button
                    variant="primary"
                    size="lg"
                    disabled={!documentQuery.data || refreshing}
                    onClick={() => setStep(4)}
                >
                    Wszystko się zgadza
                </Button>
            </>
        );
    } else {
        footer = (
            <>
                <Button variant="outline" onClick={() => setStep(3)} disabled={submit.isPending}>Wstecz</Button>
                <SubmitSlot>
                    <PrimaryAction
                        block
                        icon={<PenLine />}
                        title={submit.isPending ? 'Wysyłam…' : 'Podpisz i wyślij wniosek'}
                        sub="kierownik dostanie powiadomienie"
                        disabled={!canSubmit}
                        onClick={handleSubmit}
                    />
                </SubmitSlot>
            </>
        );
    }

    const pendingPreview = preview.isFetching && !preview.data;

    return (
        <ModalShell isOpen onClose={onClose} size="lg" labelledBy={TITLE_ID}>
            <ModalHeader>
                <HeadStack>
                    <ModalTitle id={TITLE_ID}>Wniosek o urlop</ModalTitle>
                    <StepPills steps={steps} label="Kroki wniosku" />
                </HeadStack>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {step === 1 && (
                    <StepBody>
                        <StepHead>
                            <h3>Jaki to urlop?</h3>
                            <p>Wybierz rodzaj. W następnym kroku wskażesz termin.</p>
                        </StepHead>
                        {errors.leaveType && <FieldError role="alert">{errors.leaveType}</FieldError>}
                        {errors.onDemand && <FieldError role="alert">{errors.onDemand}</FieldError>}
                        <ChoiceList role="radiogroup" aria-label="Rodzaj urlopu">
                            {KINDS.map(k => (
                                <ChoiceCard
                                    key={k.key}
                                    type="radio"
                                    name="leave-kind"
                                    checked={kind === k.key}
                                    onChange={() => chooseKind(k)}
                                    title={k.title}
                                    detail={k.detail}
                                    icon={k.icon}
                                />
                            ))}
                        </ChoiceList>
                    </StepBody>
                )}

                {step === 2 && kindDef && (
                    <StepBody>
                        <StepHead>
                            <h3>Kiedy?</h3>
                            <p>
                                {kindDef.title}. Kliknij w kalendarzu pierwszy dzień urlopu, a zaraz potem ostatni.
                            </p>
                        </StepHead>

                        <FieldRowPair>
                            <Field>
                                <Label as="span">Pierwszy dzień</Label>
                                <DateRangePicker
                                    role="start"
                                    start={startDate}
                                    end={endDate}
                                    onStartChange={value => setField('startDate', () => setStartDate(value))}
                                    onEndChange={value => setField('endDate', () => setEndDate(value))}
                                    showTime={false}
                                    minDate={minStart}
                                    placeholder="Wybierz dzień"
                                    hasError={!!errors.startDate}
                                />
                                {(errors.startDate || previewError?.field === 'startDate') && (
                                    <FieldError role="alert">{errors.startDate ?? previewError?.message}</FieldError>
                                )}
                            </Field>
                            <Field>
                                <Label as="span">Ostatni dzień</Label>
                                <DateRangePicker
                                    role="end"
                                    start={startDate}
                                    end={endDate}
                                    onStartChange={value => setField('startDate', () => setStartDate(value))}
                                    onEndChange={value => setField('endDate', () => setEndDate(value))}
                                    showTime={false}
                                    minDate={minStart}
                                    placeholder="Wybierz dzień"
                                    hasError={!!errors.endDate}
                                />
                                {(errors.endDate || previewError?.field === 'endDate') && (
                                    <FieldError role="alert">{errors.endDate ?? previewError?.message}</FieldError>
                                )}
                            </Field>
                        </FieldRowPair>

                        {rangeValid && (
                            <Tally aria-live="polite">
                                {pendingPreview ? (
                                    <Hint>Liczę dni robocze…</Hint>
                                ) : preview.data ? (
                                    <>
                                        <strong>
                                            {workingDaysLabel(preview.data.workingDays)}, {formatLeaveRange(startDate, endDate)}
                                        </strong>
                                        {preview.data.holidays.length > 0 && (
                                            <HolidayList aria-label="Pominięte święta">
                                                {preview.data.holidays.map(h => (
                                                    <li key={h.date}>Bez {formatDay(h.date)}: {h.name}</li>
                                                ))}
                                            </HolidayList>
                                        )}
                                    </>
                                ) : previewError && !previewError.field ? (
                                    <FieldError role="alert">{previewError.message ?? 'Nie udało się policzyć dni roboczych.'}</FieldError>
                                ) : null}
                            </Tally>
                        )}

                        {absentColleagues.length > 0 && (
                            // Informacja, nie blokada: bursztyn jako tło i obwódka, bez wypełnienia.
                            <Notice tone="warn" title="W tych dniach nieobecni są też inni">
                                {absentColleagues.join(', ')}. Wniosek możesz złożyć, decyzję podejmie kierownik.
                            </Notice>
                        )}

                        <Field>
                            <LabelRow>
                                <Label htmlFor="leave-reason">
                                    {kindDef.leaveType === 'SPECIAL' ? 'Powód' : 'Powód (opcjonalnie)'}
                                </Label>
                                <CharCounter $near={reason.length > LEAVE_REASON_MAX - 20}>
                                    {reason.length}/{LEAVE_REASON_MAX}
                                </CharCounter>
                            </LabelRow>
                            <Textarea
                                id="leave-reason"
                                value={reason}
                                maxLength={LEAVE_REASON_MAX}
                                required={kindDef.leaveType === 'SPECIAL'}
                                $invalid={!!errors.reason}
                                aria-invalid={!!errors.reason || undefined}
                                placeholder={kindDef.leaveType === 'SPECIAL' ? 'np. ślub, narodziny dziecka' : ''}
                                onChange={e => setField('reason', () => setReason(e.target.value))}
                            />
                            {errors.reason && <FieldError role="alert">{errors.reason}</FieldError>}
                            <Hint>Powód trafi na wniosek, więc jest krótki - mieści się w polu dokumentu.</Hint>
                        </Field>
                    </StepBody>
                )}

                {step === 3 && draft && (
                    <StepBody>
                        <StepHead>
                            <h3>Sprawdź wniosek</h3>
                            <p>Tak wygląda dokument, który podpiszesz. Jeśli coś się nie zgadza, wróć i popraw.</p>
                        </StepHead>
                        <Summary>
                            <strong>{leaveRequestTypeLabel(draft.request.leaveType, draft.request.onDemand)}</strong>
                            <span>
                                {formatLeaveRange(draft.request.startDate, draft.request.endDate)},{' '}
                                {workingDaysLabel(draft.request.workingDays)}
                            </span>
                        </Summary>
                        {signNotice && <Notice tone="warn" role="alert">{signNotice}</Notice>}
                        <LeavePdf
                            bytes={documentQuery.data?.bytes}
                            isLoading={documentQuery.isLoading || refreshing}
                            isError={documentQuery.isError}
                            onRetry={() => { void documentQuery.refetch(); }}
                        />
                    </StepBody>
                )}

                {step === 4 && draft && (
                    <StepBody>
                        <StepHead>
                            <h3>Podpisz</h3>
                            <p>Podpis trafi tylko na ten wniosek. Po wysłaniu kierownik dostanie powiadomienie.</p>
                        </StepHead>

                        {signNotice && <Notice tone="warn" role="alert">{signNotice}</Notice>}

                        <Check>
                            <input
                                type="checkbox"
                                checked={declared}
                                onChange={e => setDeclared(e.target.checked)}
                            />
                            Znam treść wniosku i podpisuję go.
                        </Check>

                        <PadBlock>
                            <SignaturePad ref={padRef} onInkChange={setHasInk} height={190} placeholder="Podpisz palcem w tym polu" />
                            <PadActions>
                                <Hint>{formatLeaveRange(draft.request.startDate, draft.request.endDate)}, {workingDaysLabel(draft.request.workingDays)}</Hint>
                                <Button variant="ghost" size="sm" disabled={!hasInk} onClick={() => padRef.current?.clear()}>
                                    Wyczyść
                                </Button>
                            </PadActions>
                        </PadBlock>
                    </StepBody>
                )}
            </ModalContent>

            <ModalFooter>{footer}</ModalFooter>
        </ModalShell>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const Tally = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border-radius: ${ui.radiusStrip};
    background: ${ui.surfaceSoft};
    border: 1px solid ${ui.lineSoft};

    strong { font-size: 16px; font-weight: 700; color: ${ui.ink}; }
`;

const HolidayList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    color: ${ui.textSecondary};
`;

const Summary = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong { font-size: 16px; font-weight: 700; color: ${ui.ink}; }
    span { font-size: 13.5px; color: ${ui.textSecondary}; }
`;

const PadBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const PadActions = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const SubmitSlot = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: flex-end;

    > button { max-width: 360px; }
`;
