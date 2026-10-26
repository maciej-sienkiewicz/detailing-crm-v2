// src/modules/employees/components/leave/AddLeaveModal.tsx
//
// „Dodaj urlop": administrator wpisuje urlop pracownika (pracownik nie musi mieć konta).
//
// Dwa ekrany zamiast pięciu kroków:
//   1. pracownik, rodzaj, termin w kalendarzu na stałe, powód - „Zapisz urlop" zapisuje
//      urlop OD RAZU ZATWIERDZONY (POST /leave-requests/record). Dawny krok „Twoja decyzja"
//      zawsze kończył się tą samą zgodą osoby, która urlop właśnie wpisała.
//   2. podpis pracownika - teraz, na tablecie, SMS-em albo bez podpisu. Urlop już stoi
//      w kalendarzu, więc zamknięcie okna niczego nie traci; podpis można zebrać później
//      w szczegółach wniosku.
//
// Otwierane też z siatki „Nieobecności" (zaznaczone dni) - wtedy pracownik i termin są gotowe.

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { Check, PenLine, Send } from 'lucide-react';
import { Button, Notice, ui } from '@/common/components/ui';
import { BareInput, FieldLabel, InputShell } from '@/common/components/Form';
import { useAuth } from '@/core/context/AuthContext';
import { leaveApiError, leaveRequestsApi } from '../../api/leaveRequestsApi';
import { useEmployees } from '../../hooks/useEmployees';
import { LEAVE_REQUESTS_KEY, useAbsentColleagues, useLeaveRequestPreview } from '../../hooks/useLeaveRequests';
import { useEmployeeSigning } from '../../hooks/useEmployeeSigning';
import type { CreateOnBehalfLeaveRequestPayload, LeaveRequestDetail } from '../../types';
import { LEAVE_REASON_MAX, formatLeaveRange, todayIso, workingDaysLabel } from '../../utils/leaveRequestFormat';
import { PrimaryAction } from './PrimaryAction';
import { FooterPrimary, LeaveStepModal } from './LeaveStepModal';
import { LEAVE_KINDS, type LeaveKindKey } from './leaveKinds';
import { LeaveRangeCalendar } from './LeaveRangeCalendar';
import { EmployeeSigningBody } from './EmployeeSigning';

interface Props {
    onClose: () => void;
    /** Otwarte z okna pracownika albo z siatki „Nieobecności": osoba jest już wybrana. */
    employeeId?: string;
    /** Dni zaznaczone w siatce „Nieobecności". */
    startDate?: string;
    endDate?: string;
}

/* Pracownik, rodzaj i powód w jednym rzędzie nad kalendarzem - całe okno bez przewijania. */
const TopRow = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;

    /* Okno ma 800 px, gdy ekran na to pozwala - wtedy trzy pola obok siebie. */
    @media (min-width: 860px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
`;

const Form = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
`;

/* Natywny select w powłoce pola - jak w ustawieniach stanowisk. */
const Select = styled.select`
    width: 100%;
    padding: 12px 30px 12px 12px;
    border: none;
    background: transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 12px center;
    appearance: none;
    font-family: inherit;
    font-size: 14px;
    color: ${ui.ink};
    cursor: pointer;

    &:focus { outline: none; }
`;

const Summary = styled.p`
    margin: 0;
    font-size: 14px;
    color: ${ui.inkSoft};

    strong { color: ${ui.ink}; }
`;

const Small = styled.p`
    margin: 0;
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const ErrorText = styled.span`
    font-size: 12.5px;
    color: ${ui.dangerInk};
`;

export function AddLeaveModal({ onClose, employeeId: presetEmployeeId, startDate: presetStart, endDate: presetEnd }: Props) {
    const [recorded, setRecorded] = useState<LeaveRequestDetail | null>(null);
    return recorded
        ? <LeaveSignatureModal request={recorded} onSigned={setRecorded} onClose={onClose} />
        : <FormStep presetEmployeeId={presetEmployeeId} presetStart={presetStart} presetEnd={presetEnd} onRecorded={setRecorded} onClose={onClose} />;
}

function FormStep({ presetEmployeeId, presetStart, presetEnd, onRecorded, onClose }: {
    presetEmployeeId?: string;
    presetStart?: string;
    presetEnd?: string;
    onRecorded: (request: LeaveRequestDetail) => void;
    onClose: () => void;
}) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const selfEmployeeId = user?.employeeId ?? null;
    const today = todayIso();

    const [employeeId, setEmployeeId] = useState<string>(presetEmployeeId ?? '');
    const [kind, setKind] = useState<LeaveKindKey>('ANNUAL');
    const [start, setStart] = useState(presetStart ?? '');
    const [end, setEnd] = useState(presetEnd ?? presetStart ?? '');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [notice, setNotice] = useState<string | null>(null);

    // Bez siebie: własny urlop składa się w zakładce „Urlop".
    const { employees: all } = useEmployees({ search: '', page: 1, pageSize: 100 });
    const employees = useMemo(() => all.filter(e => e.id !== selfEmployeeId), [all, selfEmployeeId]);
    const kindDef = LEAVE_KINDS.find(k => k.key === kind)!;
    const preview = useLeaveRequestPreview(start, end, employeeId || null);
    const absent = useAbsentColleagues(start, end, employeeId || null, true);

    const record = useMutation({
        mutationFn: (payload: CreateOnBehalfLeaveRequestPayload) => leaveRequestsApi.record(payload),
        onSuccess: request => {
            void queryClient.invalidateQueries({ queryKey: LEAVE_REQUESTS_KEY });
            void queryClient.invalidateQueries({ queryKey: ['employees', 'leave-calendar'] });
            void queryClient.invalidateQueries({ queryKey: ['employees', 'leaves'] });
            onRecorded(request);
        },
        onError: error => {
            const { field, message } = leaveApiError(error);
            if (field && message) { setErrors({ [field === 'endDate' ? 'startDate' : field]: message }); return; }
            setNotice(message ?? 'Nie udało się zapisać urlopu. Spróbuj ponownie.');
        },
    });

    const save = () => {
        const next: Record<string, string> = {};
        if (!employeeId) next.employeeId = 'Wybierz pracownika.';
        if (!start || !end) next.startDate = 'Zaznacz dni urlopu w kalendarzu.';
        if (kindDef.leaveType === 'SPECIAL' && !reason.trim()) next.reason = 'Przy urlopie okolicznościowym podaj powód.';
        if (reason.trim().length > LEAVE_REASON_MAX) next.reason = `Najwyżej ${LEAVE_REASON_MAX} znaków.`;
        setErrors(next);
        setNotice(null);
        if (Object.keys(next).length > 0) return;
        const trimmed = reason.trim();
        record.mutate({
            employeeId, leaveType: kindDef.leaveType, onDemand: kindDef.onDemand, startDate: start, endDate: end,
            ...(trimmed ? { reason: trimmed } : {}),
        });
    };

    const workingDays = preview.data?.workingDays;

    return (
        <LeaveStepModal
            titleId="add-leave-title"
            title="Dodaj urlop"
            size="xl"
            onClose={onClose}
            footer={(
                <>
                    <Button variant="ghost" onClick={onClose}>Anuluj</Button>
                    <FooterPrimary>
                        <PrimaryAction
                            icon={<Check />}
                            title={record.isPending ? 'Zapisywanie…' : 'Zapisz urlop'}
                            sub="od razu zatwierdzony"
                            disabled={record.isPending}
                            onClick={save}
                        />
                    </FooterPrimary>
                </>
            )}
        >
            <Form>
                <TopRow>
                    {!presetEmployeeId && (
                        <Field>
                            <FieldLabel htmlFor="add-leave-employee">Pracownik</FieldLabel>
                            <InputShell>
                                <Select id="add-leave-employee" value={employeeId} onChange={e => { setEmployeeId(e.target.value); setErrors(p => ({ ...p, employeeId: undefined })); }}>
                                    <option value="" disabled>Wybierz osobę</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                                </Select>
                            </InputShell>
                            {errors.employeeId && <ErrorText role="alert">{errors.employeeId}</ErrorText>}
                        </Field>
                    )}

                    <Field>
                        <FieldLabel htmlFor="add-leave-kind">Rodzaj</FieldLabel>
                        <InputShell>
                            <Select id="add-leave-kind" value={kind} onChange={e => setKind(e.target.value as LeaveKindKey)}>
                                {LEAVE_KINDS.map(k => <option key={k.key} value={k.key}>{k.title}</option>)}
                            </Select>
                        </InputShell>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="add-leave-reason">
                            Powód{kindDef.leaveType === 'SPECIAL' ? '' : ' (opcjonalnie)'}
                        </FieldLabel>
                        <InputShell>
                            <BareInput id="add-leave-reason" value={reason} maxLength={LEAVE_REASON_MAX}
                                onChange={e => { setReason(e.target.value); setErrors(p => ({ ...p, reason: undefined })); }} />
                        </InputShell>
                        {errors.reason && <ErrorText role="alert">{errors.reason}</ErrorText>}
                    </Field>
                </TopRow>

                <Field>
                    <LeaveRangeCalendar
                        start={start}
                        end={end}
                        today={today}
                        onChange={(s, e) => { setStart(s); setEnd(e); setErrors(p => ({ ...p, startDate: undefined })); }}
                    />
                    {start && end ? (
                        <Summary>
                            <strong>{formatLeaveRange(start, end)}</strong>
                            {workingDays !== undefined && <>, {workingDaysLabel(workingDays)}</>}
                        </Summary>
                    ) : <Small>Kliknij dzień albo przeciągnij po kilku dniach.</Small>}
                    {absent.length > 0 && <Small>W tym czasie nie ma też: {absent.join(', ')}</Small>}
                    {errors.startDate && <ErrorText role="alert">{errors.startDate}</ErrorText>}
                </Field>

                {notice && <Notice tone="danger" role="alert">{notice}</Notice>}
            </Form>
        </LeaveStepModal>
    );
}

/** Podpis pracownika pod zapisanym urlopem - po „Zapisz urlop" i ze szczegółów wniosku („Zbierz podpis"). */
export function LeaveSignatureModal({ request, onSigned, onClose }: {
    request: LeaveRequestDetail;
    onSigned: (request: LeaveRequestDetail) => void;
    onClose: () => void;
}) {
    const signing = useEmployeeSigning(request, onSigned);
    const primary = signing.primary;
    return (
        <LeaveStepModal
            titleId="add-leave-sign-title"
            title="Podpis pracownika"
            subtitle={`${request.employeeName}, ${formatLeaveRange(request.startDate, request.endDate)}`}
            size="xl"
            onClose={onClose}
            footer={primary ? (
                <>
                    <Button variant="ghost" onClick={onClose}>Później</Button>
                    <FooterPrimary>
                        <PrimaryAction
                            icon={signing.method === 'NOW' ? <PenLine /> : <Send />}
                            title={primary.title}
                            sub={primary.sub}
                            disabled={primary.disabled}
                            onClick={primary.run}
                        />
                    </FooterPrimary>
                </>
            ) : (
                <FooterPrimary>
                    <PrimaryAction icon={<Check />} title="Gotowe" sub="zamknij okno" onClick={onClose} />
                </FooterPrimary>
            )}
        >
            <EmployeeSigningBody s={signing} />
        </LeaveStepModal>
    );
}
