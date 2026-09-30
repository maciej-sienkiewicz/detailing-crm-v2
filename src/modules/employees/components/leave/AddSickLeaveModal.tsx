// src/modules/employees/components/leave/AddSickLeaveModal.tsx
//
// Zwolnienie lekarskie (L4) wpisywane przez menedżera. L4 nie jest wnioskiem: pochodzi
// z e-ZLA, a nie z prośby pracownika, więc trafia wprost do rejestru urlopów
// (POST /employees/{id}/leaves, typ SICK) - tą samą drogą co z karty pracownika.

import { useState } from 'react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { Button } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { useAddLeave } from '../../hooks/useLeaves';
import type { EmployeeListItem } from '../../types';
import { formatLeaveRange, todayIso } from '../../utils/leaveRequestFormat';
import { Field, FieldError, FieldRowPair, Input, Label, Select } from './leaveForm.styles';

interface Props {
    employees: EmployeeListItem[];
    onClose: () => void;
}

export function AddSickLeaveModal({ employees, onClose }: Props) {
    const { showSuccess } = useToast();
    const [employeeId, setEmployeeId] = useState('');
    const [startDate, setStartDate] = useState(todayIso());
    const [endDate, setEndDate] = useState(todayIso());
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const addLeave = useAddLeave(employeeId);

    const submit = () => {
        if (!employeeId) { setError('Wybierz pracownika.'); return; }
        if (!startDate || !endDate || endDate < startDate) { setError('Sprawdź daty: koniec nie może być przed początkiem.'); return; }
        setError(null);
        addLeave.mutate(
            { leaveType: 'SICK', startDate, endDate, note: note.trim() || null },
            {
                onSuccess: () => {
                    const name = employees.find(e => e.id === employeeId)?.fullName ?? 'Pracownik';
                    showSuccess('Zwolnienie wpisane', `${name}, ${formatLeaveRange(startDate, endDate)}.`);
                    onClose();
                },
                // Odmowę (np. nakładanie się z innym wpisem) pokazuje globalny dymek z komunikatem serwera.
                onError: () => undefined,
            },
        );
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj nieobecność (L4)</ModalTitle>
                    <ModalSubtitle>Zwolnienie lekarskie trafia od razu do grafiku i na listę obecności.</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Field>
                    <Label htmlFor="sick-employee">Pracownik</Label>
                    <Select id="sick-employee" value={employeeId} onChange={e => setEmployeeId(e.target.value)}>
                        <option value="">Wybierz osobę</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                    </Select>
                </Field>
                <FieldRowPair style={{ marginTop: 12 }}>
                    <Field>
                        <Label htmlFor="sick-start">Od</Label>
                        <Input
                            id="sick-start"
                            type="date"
                            value={startDate}
                            onChange={e => {
                                setStartDate(e.target.value);
                                if (endDate < e.target.value) setEndDate(e.target.value);
                            }}
                        />
                    </Field>
                    <Field>
                        <Label htmlFor="sick-end">Do</Label>
                        <Input id="sick-end" type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
                    </Field>
                </FieldRowPair>
                <Field style={{ marginTop: 12 }}>
                    <Label htmlFor="sick-note">Notatka (opcjonalnie)</Label>
                    <Input id="sick-note" type="text" value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
                </Field>
                {error && <FieldError role="alert" style={{ marginTop: 10 }}>{error}</FieldError>}
            </ModalContent>
            <ModalFooter>
                <Button variant="ghost" onClick={onClose} disabled={addLeave.isPending}>Anuluj</Button>
                <Button variant="primary" onClick={submit} disabled={addLeave.isPending}>
                    {addLeave.isPending ? 'Zapisuję…' : 'Wpisz zwolnienie'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}
