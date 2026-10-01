// src/modules/employees/components/leave/AddLeaveModal.tsx
//
// Urlop albo L4 wpisywany przez administratora (EMPLOYEES_MANAGE) - bez wniosku i bez
// podpisów. To decyzja pracodawcy, więc wpis trafia od razu do rejestru urlopów
// (POST /employees/{id}/leaves), a z niego do grafiku nieobecności i na listę obecności,
// tą samą drogą co z karty pracownika.
//
// Jedno okno dla obu wejść: „Dodaj urlop" w Wnioskach urlopowych i „Dodaj nieobecność
// (L4)" w Nieobecnościach (z rodzajem ustawionym na L4). Wcześniej L4 miało własne okno
// z polami dat przeglądarki, a urlopu z tego miejsca dodać się nie dało.

import { useState } from 'react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { Button } from '@/common/components/ui';
import { DateRangePicker } from '@/common/components/DateTimePicker';
import { useToast } from '@/common/components/Toast';
import { useAddLeave } from '../../hooks/useLeaves';
import type { EmployeeListItem, LeaveType } from '../../types';
import { formatLeaveRange, todayIso } from '../../utils/leaveRequestFormat';
import { LEAVE_TYPE_LABELS } from '../LeavesTab';
import { Field, FieldError, FieldRowPair, Input, Label, Select } from './leaveForm.styles';

/** Kolejność w liście: najczęstsze na górze, L4 osobno na końcu. */
const TYPES: LeaveType[] = ['ANNUAL', 'UNPAID', 'SPECIAL', 'CARE', 'PARENTAL', 'SICK'];

const TITLE_ID = 'add-leave-modal-title';

interface Props {
    employees: EmployeeListItem[];
    /** Rodzaj na starcie: „Dodaj nieobecność (L4)" otwiera okno od razu z L4. */
    initialType?: LeaveType;
    onClose: () => void;
}

export function AddLeaveModal({ employees, initialType = 'ANNUAL', onClose }: Props) {
    const { showSuccess } = useToast();
    const [employeeId, setEmployeeId] = useState('');
    const [leaveType, setLeaveType] = useState<LeaveType>(initialType);
    // L4 wpisuje się zwykle w dniu, w którym przyszło - urlop ma termin do wybrania.
    const [startDate, setStartDate] = useState(initialType === 'SICK' ? todayIso() : '');
    const [endDate, setEndDate] = useState(initialType === 'SICK' ? todayIso() : '');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const addLeave = useAddLeave(employeeId);
    const isSick = leaveType === 'SICK';

    const submit = () => {
        if (!employeeId) { setError('Wybierz pracownika.'); return; }
        if (!startDate || !endDate) { setError('Wybierz w kalendarzu pierwszy i ostatni dzień.'); return; }
        if (endDate < startDate) { setError('Koniec nie może być przed początkiem.'); return; }
        setError(null);
        addLeave.mutate(
            { leaveType, startDate, endDate, note: note.trim() || null },
            {
                onSuccess: () => {
                    const name = employees.find(e => e.id === employeeId)?.fullName ?? 'Pracownik';
                    showSuccess(
                        isSick ? 'Zwolnienie wpisane' : 'Urlop dodany',
                        `${name}, ${formatLeaveRange(startDate, endDate)}. Widać go w grafiku nieobecności.`,
                    );
                    onClose();
                },
                // Odmowę (np. nakładanie się z innym wpisem) pokazuje globalny dymek z komunikatem serwera.
                onError: () => undefined,
            },
        );
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm" labelledBy={TITLE_ID}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id={TITLE_ID}>{isSick ? 'Dodaj nieobecność (L4)' : 'Dodaj urlop'}</ModalTitle>
                    <ModalSubtitle>
                        Bez wniosku i podpisów: wpis trafia od razu do grafiku nieobecności i na listę obecności.
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Field>
                    <Label htmlFor="add-leave-employee">Pracownik</Label>
                    <Select id="add-leave-employee" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                        <option value="">Wybierz osobę</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                    </Select>
                </Field>
                <Field>
                    <Label htmlFor="add-leave-type">Rodzaj</Label>
                    <Select id="add-leave-type" value={leaveType} onChange={e => setLeaveType(e.target.value as LeaveType)}>
                        {TYPES.map(t => <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>)}
                    </Select>
                </Field>
                <FieldRowPair>
                    <Field>
                        <Label as="span">Pierwszy dzień</Label>
                        <DateRangePicker
                            role="start"
                            start={startDate}
                            end={endDate}
                            onStartChange={setStartDate}
                            onEndChange={setEndDate}
                            showTime={false}
                            placeholder="Wybierz dzień"
                        />
                    </Field>
                    <Field>
                        <Label as="span">Ostatni dzień</Label>
                        <DateRangePicker
                            role="end"
                            start={startDate}
                            end={endDate}
                            onStartChange={setStartDate}
                            onEndChange={setEndDate}
                            showTime={false}
                            placeholder="Wybierz dzień"
                        />
                    </Field>
                </FieldRowPair>
                <Field>
                    <Label htmlFor="add-leave-note">Notatka (opcjonalnie)</Label>
                    <Input id="add-leave-note" type="text" value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
                </Field>
                {error && <FieldError role="alert">{error}</FieldError>}
            </ModalContent>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose} disabled={addLeave.isPending}>Anuluj</Button>
                <Button variant="primary" onClick={submit} disabled={addLeave.isPending}>
                    {addLeave.isPending ? 'Zapisuję…' : isSick ? 'Wpisz zwolnienie' : 'Dodaj urlop'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}
