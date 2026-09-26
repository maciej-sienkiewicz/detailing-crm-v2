// src/modules/settings/components/team/AttendanceSheetModal.tsx
//
// Wybór miesiąca i osób → lista obecności ląduje w zakładce Rozliczenia.
//
// Pliku nie pobieramy od razu. Dopóki lista znikała w folderze Pobrane jednej osoby,
// przy kilku administratorach nikt nie wiedział, czy została już sprawdzona i wysłana.
// Podgląd, zatwierdzenie (z podpisem) i usunięcie są teraz w Rozliczeniach.
//
// Osoby wybiera się TUTAJ. Wcześniej lista pracowników miała kolumnę pól wyboru,
// która służyła wyłącznie temu oknu: przycisk „Wygeneruj listę" był wyszarzony, dopóki
// ktoś nie odgadł, że trzeba najpierw zaznaczyć wiersze, a zaznaczać wolno było tylko
// osoby z liczonym czasem pracy - których lista nie odróżniała na pierwszy rzut oka.

import { useMemo, useState } from 'react';
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
import { useToast } from '@/common/components/Toast';
import { Button, Notice } from '@/common/components/ui';
import { readBlobErrorMessage, type AttendanceSheet } from '../../api/attendanceApi';
import { useGenerateAttendanceSheet } from '../../hooks/useAttendanceSheets';
import { useEmployees } from '../../hooks/useTeam';
import { useRoles } from '../../hooks/useRoles';
import { periodLabel } from '../settlements/settlementFormat';
import { employeesCount } from './teamPlural';

const MONTHS = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

/** Rok bieżący ±1: arkusz robi się na trwający miesiąc, czasem na sąsiedni. */
function yearOptions(): number[] {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
}

/** Backend oddaje najwyżej 500 osób na stronę - studio ma ich kilka, kilkanaście. */
const ALL_EMPLOYEES = { search: '', page: 1, limit: 500 } as const;

interface Props {
    onClose: () => void;
    /** Lista zapisana w Rozliczeniach - widok może to zasygnalizować. */
    onGenerated?: (sheet: AttendanceSheet) => void;
}

export function AttendanceSheetModal({ onClose, onGenerated }: Props) {
    const now = new Date();
    const { showSuccess } = useToast();
    const generate = useGenerateAttendanceSheet();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [error, setError] = useState<string | null>(null);

    const employees = useEmployees(ALL_EMPLOYEES);
    const { roles, isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useRoles();

    /**
     * Na liście są tylko osoby z liczonym czasem pracy - to cecha ROLI (`trackWorkTime`),
     * a arkusz bez godzin byłby pustą kolumną. Reszty nie pokazujemy wcale, zamiast
     * pokazywać ją wyszarzoną: to nie jest wybór, którego ktoś tu szuka.
     */
    const candidates = useMemo(() => {
        const workTimeRoles = new Set(roles.filter(r => r.trackWorkTime).map(r => r.id));
        return employees.items.filter(e => !!e.role && workTimeRoles.has(e.role.id));
    }, [employees.items, roles]);

    // Domyślnie wszyscy: najczęstsza lista to „cały zespół za zeszły miesiąc".
    const [picked, setPicked] = useState<Set<string> | null>(null);
    const chosen = picked ?? new Set(candidates.map(e => e.id));
    const employeeIds = candidates.filter(e => chosen.has(e.id)).map(e => e.id);
    const allChosen = candidates.length > 0 && employeeIds.length === candidates.length;

    const toggle = (id: string) => {
        const next = new Set(chosen);
        if (next.has(id)) next.delete(id); else next.add(id);
        setPicked(next);
    };
    const toggleAll = () => setPicked(allChosen ? new Set() : new Set(candidates.map(e => e.id)));

    const loading = employees.isLoading || rolesLoading;
    const loadFailed = employees.isError || rolesError;

    const period = `${year}-${String(month).padStart(2, '0')}`;

    const handleGenerate = async () => {
        if (employeeIds.length === 0) return;
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
                    <ModalSubtitle>Wybierz miesiąc i osoby, których godziny trafią do arkusza.</ModalSubtitle>
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

                <People>
                    <PeopleHead>
                        <PeopleTitle id="attendance-people">Kto trafi na listę</PeopleTitle>
                        {candidates.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={toggleAll}>
                                {allChosen ? 'Odznacz wszystkich' : 'Zaznacz wszystkich'}
                            </Button>
                        )}
                    </PeopleHead>

                    {loading ? (
                        <Muted>Wczytywanie pracowników...</Muted>
                    ) : loadFailed ? (
                        <Notice
                            tone="danger"
                            title="Nie udało się wczytać pracowników"
                            action={(
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { void employees.refetch(); void refetchRoles(); }}
                                >
                                    Spróbuj ponownie
                                </Button>
                            )}
                        />
                    ) : candidates.length === 0 ? (
                        <Notice tone="info" title="Nikt nie ma liczonego czasu pracy">
                            Lista obecności zbiera godziny z modułu „Czas pracy". Włącz „Liczony czas
                            pracy" w roli pracowników w widoku „Role".
                        </Notice>
                    ) : (
                        <PeopleList role="group" aria-labelledby="attendance-people">
                            {candidates.map(e => (
                                <Person key={e.id}>
                                    <input
                                        type="checkbox"
                                        checked={chosen.has(e.id)}
                                        onChange={() => toggle(e.id)}
                                    />
                                    <span>{e.fullName}</span>
                                    {e.role && <PersonRole>{e.role.name}</PersonRole>}
                                </Person>
                            ))}
                        </PeopleList>
                    )}
                </People>

                <Hint>
                    W arkuszu kolumnami są wybrane osoby, wierszami dni miesiąca, a w komórkach
                    godziny z ich kart czasu pracy. Gotowa lista trafi do „Rozliczeń" - tam ją
                    podejrzysz, zatwierdzisz i pobierzesz.
                </Hint>

                {error && <ErrorText role="alert">{error}</ErrorText>}
            </ModalContent>

            <ModalFooter>
                <Button variant="outline" onClick={onClose}>Anuluj</Button>
                <Button
                    variant="primary"
                    onClick={handleGenerate}
                    disabled={generate.isPending || employeeIds.length === 0}
                >
                    {generate.isPending
                        ? 'Generowanie...'
                        : employeeIds.length > 0 && !allChosen
                            ? `Generuj listę (${employeesCount(employeeIds.length)})`
                            : 'Generuj listę'}
                </Button>
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

/* Etykieta zdaniem, 13px - były 11px wersaliki w szarości (CLAUDE.md §2). */
const FieldLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: #334155;
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
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14);
    }
`;

const People = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const PeopleHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 30px;
`;

const PeopleTitle = styled.h3`
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
`;

const PeopleList = styled.div`
    display: flex;
    flex-direction: column;
    max-height: 240px;
    overflow-y: auto;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
`;

const Person = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 12px;
    font-size: 13.5px;
    color: #0f172a;
    cursor: pointer;
    & + & { border-top: 1px solid #f1f5f9; }

    input { width: 16px; height: 16px; margin: 0; accent-color: #0284c7; cursor: pointer; flex-shrink: 0; }
    > span:first-of-type { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const PersonRole = styled.span`
    font-size: 12.5px;
    color: #64748b;
    white-space: nowrap;
`;

const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
`;

const Hint = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: #64748b;
`;

const ErrorText = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: #dc2626;
`;
