// src/modules/settings/components/team/AttendanceSheetModal.tsx
//
// Wybór miesiąca dla listy obecności. Domyślnie miesiąc bieżący — arkusz drukuje
// się zwykle na trwający miesiąc, a nie na przeszły.

import { useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { attendanceApi, readBlobErrorMessage } from '../../api/attendanceApi';

const MONTHS = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

/** Rok bieżący ±1: arkusz robi się na trwający miesiąc, czasem na sąsiedni. */
function yearOptions(): number[] {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
}

interface Props {
    /** Identyfikatory pracowników (nie kont) zaznaczonych na liście. */
    employeeIds: string[];
    employeeCount: number;
    onClose: () => void;
}

export function AttendanceSheetModal({ employeeIds, employeeCount, onClose }: Props) {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const period = `${year}-${String(month).padStart(2, '0')}`;

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const blob = await attendanceApi.generateAttendanceSheet(period, employeeIds);
            // Pobranie przez obiekt URL: PDF przychodzi w odpowiedzi na POST-a, więc nie
            // da się go otworzyć zwykłym linkiem.
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `lista-obecnosci-${period}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            onClose();
        } catch (e) {
            setError(await readBlobErrorMessage(e) ?? 'Nie udało się wygenerować listy obecności. Spróbuj ponownie.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Lista obecności</ModalTitle>
                    <ModalSubtitle>
                        {employeeCount === 1
                            ? '1 pracownik'
                            : `${employeeCount} pracowników`}
                        {' · arkusz do wydruku i podpisu'}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Fields>
                    <Field>
                        <FieldLabel htmlFor="attendance-month">Miesiąc</FieldLabel>
                        <Select
                            id="attendance-month"
                            value={month}
                            onChange={e => setMonth(Number(e.target.value))}
                        >
                            {MONTHS.map((label, index) => (
                                <option key={label} value={index + 1}>{label}</option>
                            ))}
                        </Select>
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="attendance-year">Rok</FieldLabel>
                        <Select
                            id="attendance-year"
                            value={year}
                            onChange={e => setYear(Number(e.target.value))}
                        >
                            {yearOptions().map(value => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </Select>
                    </Field>
                </Fields>

                <Hint>
                    W arkuszu kolumnami są zaznaczeni pracownicy, a wierszami kolejne dni miesiąca.
                    Komórki zostają puste — do podpisu.
                </Hint>

                {error && <ErrorText>{error}</ErrorText>}
            </ModalContent>

            <ModalFooter>
                <SharedButton type="button" $variant="secondary" $size="sm" onClick={onClose}>
                    Anuluj
                </SharedButton>
                <SharedButton
                    type="button"
                    $variant="primary"
                    $size="sm"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                >
                    {isGenerating ? 'Generuję…' : 'Pobierz PDF'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
}

const Fields = styled.div`
    display: flex;
    gap: 12px;

    @media (max-width: 480px) { flex-direction: column; }
`;

const Field = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const FieldLabel = styled.label`
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: #64748b;
`;

const Select = styled.select`
    width: 100%;
    padding: 9px 12px;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    outline: none;
    cursor: pointer;
    transition: border-color 150ms, box-shadow 150ms;

    &:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
    }
`;

const Hint = styled.p`
    margin: 14px 0 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: #64748b;
`;

const ErrorText = styled.p`
    margin: 10px 0 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: #dc2626;
`;
