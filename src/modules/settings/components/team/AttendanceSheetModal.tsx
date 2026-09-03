// src/modules/settings/components/team/AttendanceSheetModal.tsx
//
// Trzy kroki: wybór miesiąca → co zrobić z gotowym arkuszem → (opcjonalnie) podpis.
//
// Arkusz powstaje i zapisuje się w systemie ZANIM użytkownik go pobierze, bo podpis
// dokłada się do zapisanego dokumentu, a nie do pliku w folderze Pobrane.

import { useRef, useState } from 'react';
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
import { attendanceApi, readBlobErrorMessage, saveBlobAsFile, type AttendanceSheet } from '../../api/attendanceApi';
import { SignaturePad, type SignaturePadHandle } from './SignaturePad';

const MONTHS = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

/** Rok bieżący ±1: arkusz robi się na trwający miesiąc, czasem na sąsiedni. */
function yearOptions(): number[] {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
}

type Step = 'period' | 'choice' | 'signing';

interface Props {
    /** Identyfikatory pracowników (nie kont) zaznaczonych na liście. */
    employeeIds: string[];
    employeeCount: number;
    onClose: () => void;
}

export function AttendanceSheetModal({ employeeIds, employeeCount, onClose }: Props) {
    const now = new Date();
    const [step, setStep] = useState<Step>('period');
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [sheet, setSheet] = useState<AttendanceSheet | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasInk, setHasInk] = useState(false);

    const padRef = useRef<SignaturePadHandle>(null);

    const period = `${year}-${String(month).padStart(2, '0')}`;
    const monthLabel = `${MONTHS[month - 1]} ${year}`;

    const messageOf = async (e: unknown, fallback: string) => (await readBlobErrorMessage(e)) ?? fallback;

    const handleGenerate = async () => {
        setIsBusy(true);
        setError(null);
        try {
            setSheet(await attendanceApi.generateAttendanceSheet(period, employeeIds));
            setStep('choice');
        } catch (e) {
            setError(await messageOf(e, 'Nie udało się wygenerować listy obecności. Spróbuj ponownie.'));
        } finally {
            setIsBusy(false);
        }
    };

    const download = async (target: AttendanceSheet) => {
        const blob = await attendanceApi.downloadAttendanceSheet(target.id);
        saveBlobAsFile(blob, `lista-obecnosci-${target.period}${target.signed ? '-podpisana' : ''}.pdf`);
    };

    const handleDownloadUnsigned = async () => {
        if (!sheet) return;
        setIsBusy(true);
        setError(null);
        try {
            await download(sheet);
            onClose();
        } catch (e) {
            setError(await messageOf(e, 'Nie udało się pobrać pliku. Spróbuj ponownie.'));
        } finally {
            setIsBusy(false);
        }
    };

    const handleSign = async () => {
        if (!sheet) return;
        const signature = padRef.current?.toDataUrl();
        if (!signature) {
            setError('Najpierw złóż podpis w polu powyżej.');
            return;
        }

        setIsBusy(true);
        setError(null);
        try {
            const signed = await attendanceApi.signAttendanceSheet(sheet.id, signature);
            setSheet(signed);
            // Pobranie od razu po podpisie: podpisany arkusz zostaje w systemie, ale
            // użytkownik podpisywał go po to, żeby go mieć.
            await download(signed);
            onClose();
        } catch (e) {
            setError(await messageOf(e, 'Nie udało się zapisać podpisu. Spróbuj ponownie.'));
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Lista obecności</ModalTitle>
                    <ModalSubtitle>
                        {employeeCount === 1 ? '1 pracownik' : `${employeeCount} pracowników`}
                        {step === 'period' ? ' · wybierz miesiąc' : ` · ${monthLabel}`}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {step === 'period' && (
                    <>
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
                            a w komórkach godziny z ich kart czasu pracy.
                        </Hint>
                    </>
                )}

                {step === 'choice' && (
                    <>
                        <ReadyNote>Arkusz za {monthLabel.toLowerCase()} jest gotowy i zapisany w systemie.</ReadyNote>
                        <Choices>
                            <ChoiceCard type="button" onClick={() => { setError(null); setStep('signing'); }}>
                                <ChoiceIcon>
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 19c2.5 0 3-2.5 4.5-7S10 4 11.5 4s2 1.5 1 4.5-2.5 8-1 9.5 3-1 4-1 2 1 2 1" />
                                    </svg>
                                </ChoiceIcon>
                                <ChoiceText>
                                    <ChoiceLabel>Podpisz na tym urządzeniu</ChoiceLabel>
                                    <ChoiceDesc>Podpis myszą, rysikiem albo palcem — wtopi się w PDF.</ChoiceDesc>
                                </ChoiceText>
                            </ChoiceCard>

                            <ChoiceCard type="button" onClick={handleDownloadUnsigned} disabled={isBusy}>
                                <ChoiceIcon>
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 3v12" /><path d="m7 12 5 5 5-5" /><path d="M5 21h14" />
                                    </svg>
                                </ChoiceIcon>
                                <ChoiceText>
                                    <ChoiceLabel>{isBusy ? 'Pobieram…' : 'Kontynuuj bez podpisu'}</ChoiceLabel>
                                    <ChoiceDesc>Pobierz plik teraz; podpis możesz dodać później.</ChoiceDesc>
                                </ChoiceText>
                            </ChoiceCard>
                        </Choices>
                    </>
                )}

                {step === 'signing' && (
                    <>
                        <SignaturePad ref={padRef} onInkChange={setHasInk} />
                        <PadActions>
                            <LinkBtn type="button" onClick={() => { padRef.current?.clear(); setError(null); }}>
                                Wyczyść
                            </LinkBtn>
                        </PadActions>
                        <Hint>
                            Podpis trafi pod tabelę na ostatniej stronie arkusza, razem z Twoim
                            imieniem, nazwiskiem i datą złożenia.
                        </Hint>
                    </>
                )}

                {error && <ErrorText>{error}</ErrorText>}
            </ModalContent>

            <ModalFooter>
                {step === 'period' && (
                    <>
                        <SharedButton type="button" $variant="secondary" $size="sm" onClick={onClose}>
                            Anuluj
                        </SharedButton>
                        <SharedButton
                            type="button"
                            $variant="primary"
                            $size="sm"
                            onClick={handleGenerate}
                            disabled={isBusy}
                        >
                            {isBusy ? 'Generuję…' : 'Generuj arkusz'}
                        </SharedButton>
                    </>
                )}

                {step === 'choice' && (
                    <SharedButton type="button" $variant="secondary" $size="sm" onClick={onClose}>
                        Zamknij
                    </SharedButton>
                )}

                {step === 'signing' && (
                    <>
                        <SharedButton
                            type="button"
                            $variant="secondary"
                            $size="sm"
                            onClick={() => { setError(null); setStep('choice'); }}
                        >
                            Wstecz
                        </SharedButton>
                        <SharedButton
                            type="button"
                            $variant="primary"
                            $size="sm"
                            onClick={handleSign}
                            disabled={isBusy || !hasInk}
                        >
                            {isBusy ? 'Zapisuję…' : 'Podpisz i pobierz'}
                        </SharedButton>
                    </>
                )}
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

const ReadyNote = styled.p`
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.55;
    color: #0f172a;
`;

const Choices = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const ChoiceCard = styled.button`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 13px 14px;
    text-align: left;
    background: #fff;
    border: 1.5px solid #e2e8f0;
    border-radius: 11px;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 150ms, background 150ms;

    &:hover:not(:disabled) { border-color: #93c5fd; background: #f8fbff; }
    &:disabled { opacity: 0.6; cursor: default; }
`;

const ChoiceIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 9px;
    flex-shrink: 0;
    background: rgba(14, 165, 233, 0.1);
    color: #0284c7;
`;

const ChoiceText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const ChoiceLabel = styled.span`
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
`;

const ChoiceDesc = styled.span`
    font-size: 12px;
    line-height: 1.5;
    color: #64748b;
`;

const PadActions = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
`;

const LinkBtn = styled.button`
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;

    &:hover { color: #0f172a; }
`;

const ErrorText = styled.p`
    margin: 10px 0 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: #dc2626;
`;
