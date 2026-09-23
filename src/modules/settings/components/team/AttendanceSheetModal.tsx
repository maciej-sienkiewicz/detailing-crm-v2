// src/modules/settings/components/team/AttendanceSheetModal.tsx
//
// Wybór miesiąca → lista obecności ląduje w zakładce Rozliczenia.
//
// Pliku nie pobieramy od razu. Dopóki lista znikała w folderze Pobrane jednej osoby,
// przy kilku administratorach nikt nie wiedział, czy została już sprawdzona i wysłana.
// Podgląd, zatwierdzenie (z podpisem) i usunięcie są teraz w Rozliczeniach.

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
import { useToast } from '@/common/components/Toast';
import { readBlobErrorMessage, type AttendanceSheet } from '../../api/attendanceApi';
import { useGenerateAttendanceSheet } from '../../hooks/useAttendanceSheets';
import { periodLabel } from '../settlements/settlementFormat';

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
    /** Lista zapisana w Rozliczeniach - widok może to zasygnalizować. */
    onGenerated?: (sheet: AttendanceSheet) => void;
}

export function AttendanceSheetModal({ employeeIds, employeeCount, onClose, onGenerated }: Props) {
    const now = new Date();
    const { showSuccess } = useToast();
    const generate = useGenerateAttendanceSheet();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [error, setError] = useState<string | null>(null);

    const period = `${year}-${String(month).padStart(2, '0')}`;

    const handleGenerate = async () => {
        setError(null);
        try {
            const sheet = await generate.mutateAsync({ period, employeeIds });
            showSuccess(
                'Lista obecności w Rozliczeniach',
                `${periodLabel(sheet.period)} czeka na zatwierdzenie w zakładce „Rozliczenia".`,
            );
            onGenerated?.(sheet);
            onClose();
        } catch (e) {
            setError(
                (await readBlobErrorMessage(e))
                ?? 'Nie udało się wygenerować listy obecności. Spróbuj ponownie.',
            );
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Lista obecności</ModalTitle>
                    <ModalSubtitle>
                        {employeeCount === 1 ? '1 pracownik' : `${employeeCount} pracowników`} · wybierz miesiąc
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
                    W arkuszu kolumnami są zaznaczeni pracownicy, wierszami dni miesiąca,
                    a w komórkach godziny z ich kart czasu pracy. Gotowa lista trafi do
                    zakładki „Rozliczenia" - tam ją podejrzysz, zatwierdzisz i pobierzesz.
                </Hint>

                {error && <ErrorText role="alert">{error}</ErrorText>}
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
                    disabled={generate.isPending}
                >
                    {generate.isPending ? 'Generuję…' : 'Generuj listę'}
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
