import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { CalendarDays, User, X } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
} from '@/common/components/ModalKit';
import { FieldLabel, Select, InputShell, BareTextArea, FormAlertBanner } from '@/common/components/Form';
import { SharedButton } from '@/common/styles';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useEmployees } from '@/modules/employees/hooks/useEmployees';
import { useAddLeave } from '@/modules/employees/hooks/useLeaves';
import { LEAVE_TYPE_LABELS } from '@/modules/employees/components/LeavesTab';
import type { LeaveType } from '@/modules/employees/types';

/**
 * Urlop wpisywany z kalendarza, a nie z kartoteki pracownika.
 *
 * Kartoteka wie wszystko o jednym człowieku, ale nie pokazuje, kto jeszcze jest wtedy
 * poza warsztatem — a to jest pytanie, od którego zaczyna się planowanie urlopu. Dlatego
 * dni wskazuje się na siatce kalendarza, tak samo jak przy wydarzeniu studia: najpierw
 * mówimy KOMU i JAKI urlop, potem widać CAŁY grafik i zaznacza się w nim dni.
 *
 * Krok ostatni jest osobnym oknem, bo zaznaczenie na siatce bywa nieopatrzne (jeden ruch
 * myszą po tygodniu), a urlop zapisany przez pomyłkę znika z kalendarza dopiero po wejściu
 * w kartotekę pracownika.
 */

export interface LeaveDraft {
    employeeId: string;
    employeeName: string;
    leaveType: LeaveType;
}

const Intro = styled.p`
    margin: 0 0 18px;
    font-size: ${st.fontSm};
    line-height: 1.55;
    color: ${st.textMuted};
`;

const Field = styled.div`
    & + & { margin-top: 16px; }
`;

const Summary = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

const SummaryRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: ${st.fontSm};
    color: ${st.text};

    svg { width: 15px; height: 15px; flex-shrink: 0; color: ${st.textMuted}; }
    strong { font-weight: 600; }
`;

const Days = styled.span`
    margin-left: auto;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
`;

const formatDay = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

/** Zakres jest obustronnie domknięty: 12-14 sierpnia to trzy dni urlopu, nie dwa. */
export const countDays = (startDate: string, endDate: string) => {
    const from = new Date(`${startDate}T00:00:00`).getTime();
    const to = new Date(`${endDate}T00:00:00`).getTime();
    return Math.max(1, Math.round((to - from) / 86_400_000) + 1);
};

// ─── Krok 1: kto i jaki urlop ────────────────────────────────────────────────

interface SetupProps {
    onConfirm: (draft: LeaveDraft) => void;
    onClose: () => void;
}

export const LeaveSetupModal: React.FC<SetupProps> = ({ onConfirm, onClose }) => {
    // Lista pracowników mieści się w jednym wywołaniu — warsztat detailingowy to
    // kilkanaście osób, nie korporacja; paginacja byłaby tu ceremonią bez treści.
    const { employees, isLoading } = useEmployees({ search: '', page: 1, limit: 100 });
    const [employeeId, setEmployeeId] = useState('');
    const [leaveType, setLeaveType] = useState<LeaveType>('ANNUAL');

    const employee = employees.find(e => e.id === employeeId);

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Urlop pracownika</ModalTitle>
                    <ModalSubtitle>Krok 1 z 2: kto i jaki urlop</ModalSubtitle>
                </ModalTitleGroup>
                <ModalCloseButton type="button" onClick={onClose} aria-label="Zamknij">
                    <X />
                </ModalCloseButton>
            </ModalHeader>

            <ModalContent>
                <Intro>
                    Po wybraniu pracownika wrócisz do kalendarza i zaznaczysz dni urlopu tak samo
                    jak przy wydarzeniu: kliknięciem albo przeciągnięciem po kilku dniach.
                </Intro>

                <Field>
                    <FieldLabel htmlFor="leave-employee">Pracownik</FieldLabel>
                    <Select
                        id="leave-employee"
                        value={employeeId}
                        onChange={event => setEmployeeId(event.target.value)}
                        disabled={isLoading}
                    >
                        <option value="">{isLoading ? 'Wczytuję…' : 'Wybierz pracownika'}</option>
                        {employees.map(candidate => (
                            <option key={candidate.id} value={candidate.id}>{candidate.fullName}</option>
                        ))}
                    </Select>
                </Field>

                <Field>
                    <FieldLabel htmlFor="leave-type">Typ urlopu</FieldLabel>
                    <Select
                        id="leave-type"
                        value={leaveType}
                        onChange={event => setLeaveType(event.target.value as LeaveType)}
                    >
                        {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(type => (
                            <option key={type} value={type}>{LEAVE_TYPE_LABELS[type]}</option>
                        ))}
                    </Select>
                </Field>

                {!isLoading && employees.length === 0 && (
                    <FormAlertBanner style={{ marginTop: 16 }}>
                        Nie ma jeszcze żadnego pracownika. Dodaj go w module Pracownicy, zanim wpiszesz urlop.
                    </FormAlertBanner>
                )}
            </ModalContent>

            <ModalFooter>
                <SharedButton type="button" $variant="secondary" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton
                    type="button"
                    disabled={!employee}
                    onClick={() => employee && onConfirm({
                        employeeId: employee.id,
                        employeeName: employee.fullName,
                        leaveType,
                    })}
                >
                    Dalej: zaznacz dni
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};

// ─── Krok 2: potwierdzenie zaznaczonych dni ──────────────────────────────────

interface ConfirmProps {
    draft: LeaveDraft;
    range: { startDate: string; endDate: string };
    /** Powrót do zaznaczania - zamyka okno, ale zostawia tryb urlopu włączony. */
    onBack: () => void;
    onSaved: () => void;
    onError: (message: string) => void;
    onClose: () => void;
}

export const LeaveConfirmModal: React.FC<ConfirmProps> = ({
    draft, range, onBack, onSaved, onError, onClose,
}) => {
    const [note, setNote] = useState('');
    const addLeave = useAddLeave(draft.employeeId);
    const days = useMemo(() => countDays(range.startDate, range.endDate), [range]);

    const save = () => {
        addLeave.mutate(
            {
                leaveType: draft.leaveType,
                startDate: range.startDate,
                endDate: range.endDate,
                note: note.trim() || null,
            },
            {
                onSuccess: onSaved,
                onError: () => onError('Nie udało się zapisać urlopu. Spróbuj ponownie za chwilę.'),
            }
        );
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Potwierdź urlop</ModalTitle>
                    <ModalSubtitle>Krok 2 z 2: sprawdź dni</ModalSubtitle>
                </ModalTitleGroup>
                <ModalCloseButton type="button" onClick={onClose} aria-label="Zamknij">
                    <X />
                </ModalCloseButton>
            </ModalHeader>

            <ModalContent>
                <Summary>
                    <SummaryRow>
                        <User />
                        <strong>{draft.employeeName}</strong>
                    </SummaryRow>
                    <SummaryRow>
                        <CalendarDays />
                        {range.startDate === range.endDate
                            ? formatDay(range.startDate)
                            : `${formatDay(range.startDate)} — ${formatDay(range.endDate)}`}
                        <Days>{days} {days === 1 ? 'dzień' : 'dni'}</Days>
                    </SummaryRow>
                    <SummaryRow>
                        <CalendarDays style={{ opacity: 0 }} />
                        {LEAVE_TYPE_LABELS[draft.leaveType]}
                    </SummaryRow>
                </Summary>

                <Field style={{ marginTop: 18 }}>
                    <FieldLabel htmlFor="leave-note">Notatka (opcjonalnie)</FieldLabel>
                    <InputShell>
                        <BareTextArea
                            id="leave-note"
                            rows={3}
                            value={note}
                            onChange={event => setNote(event.target.value)}
                            placeholder="np. wyjazd rodzinny, zgłoszone z wyprzedzeniem"
                        />
                    </InputShell>
                </Field>

                {addLeave.isError && (
                    <FormAlertBanner style={{ marginTop: 14 }}>
                        Nie udało się zapisać urlopu. Sprawdź, czy dni nie zachodzą na już wpisany urlop.
                    </FormAlertBanner>
                )}
            </ModalContent>

            <ModalFooter>
                <SharedButton
                    type="button"
                    $variant="secondary"
                    style={{ marginRight: 'auto' }}
                    onClick={onBack}
                    disabled={addLeave.isPending}
                >
                    Zaznacz inne dni
                </SharedButton>
                <SharedButton type="button" $variant="secondary" onClick={onClose} disabled={addLeave.isPending}>
                    Anuluj
                </SharedButton>
                <SharedButton type="button" onClick={save} disabled={addLeave.isPending}>
                    {addLeave.isPending ? 'Zapisuję…' : 'Zapisz urlop'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
