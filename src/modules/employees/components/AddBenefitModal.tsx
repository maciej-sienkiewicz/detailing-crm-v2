import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useAddWorkTimeBenefit } from '../hooks/useWorkTime';
import type { BenefitType, AddWorkTimeBenefitPayload } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    employeeId: string;
    /** YYYY-MM – the period the benefit is being added to. */
    period: string;
    onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BENEFIT_OPTIONS: { value: BenefitType; label: string; description: string; multiplier: string }[] = [
    {
        value: 'OVERTIME_150',
        label: 'Nadgodziny 150%',
        description: 'Praca w godzinach nadliczbowych w dzień powszedni',
        multiplier: '×1.5',
    },
    {
        value: 'OVERTIME_200',
        label: 'Nadgodziny 200%',
        description: 'Praca w godzinach nadliczbowych w nocy, niedziele lub święta',
        multiplier: '×2.0',
    },
    {
        value: 'NIGHT_WORK',
        label: 'Praca nocna',
        description: 'Praca wykonywana między 21:00 a 7:00',
        multiplier: '+dodatek',
    },
    {
        value: 'HOLIDAY_WORK',
        label: 'Praca w święto',
        description: 'Praca wykonywana w dzień ustawowo wolny od pracy',
        multiplier: '×2.0',
    },
    {
        value: 'ON_CALL',
        label: 'Dyżur',
        description: 'Gotowość do pracy poza normalnymi godzinami',
        multiplier: '+ryczałt',
    },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: ${st.bgOverlay};
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
`;

const ModalBox = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    padding: 28px;
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-height: 90vh;
    overflow-y: auto;
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
`;

const ModalTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
`;

const ModalSubtitle = styled.p`
    margin: 2px 0 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const CloseBtn = styled.button`
    background: none;
    border: none;
    color: ${st.textMuted};
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
    &:hover { color: ${st.text}; }
`;

const SectionLabel = styled.p`
    margin: 0 0 8px 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const BenefitGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const BenefitOption = styled.label<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1.5px solid ${({ $selected }) => ($selected ? st.accentBlue : st.border)};
    border-radius: ${st.radiusSm};
    background: ${({ $selected }) => ($selected ? st.accentBlueDim : st.bgCard)};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${({ $selected }) => ($selected ? st.accentBlue : st.borderHover)};
        background: ${({ $selected }) => ($selected ? st.accentBlueDim : st.bgCardAlt)};
    }
`;

const BenefitRadio = styled.input`
    accent-color: ${st.accentBlue};
    width: 16px;
    height: 16px;
    flex-shrink: 0;
`;

const BenefitInfo = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const BenefitLabel = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const BenefitDesc = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const MultiplierBadge = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.accentBlue};
    background: ${st.accentBlueDim};
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    white-space: nowrap;
    flex-shrink: 0;
`;

const FieldRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const FieldFull = styled(Field)`
    grid-column: 1 / -1;
`;

const FieldLabel = styled.label`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const Input = styled.input`
    padding: 9px 11px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    transition: border-color ${st.transition};

    &:focus { border-color: ${st.accentBlue}; box-shadow: ${st.shadowBlue}; }
    &:disabled { background: ${st.bgCardAlt}; color: ${st.textMuted}; }
`;

const Textarea = styled.textarea`
    padding: 9px 11px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    resize: vertical;
    min-height: 56px;
    font-family: inherit;
    transition: border-color ${st.transition};

    &:focus { border-color: ${st.accentBlue}; box-shadow: ${st.shadowBlue}; }
`;

const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
    padding: 8px 12px;
    background: ${st.accentRedDim};
    border-radius: ${st.radiusSm};
`;

const ModalActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 4px;
    border-top: 1px solid ${st.border};
`;

const CancelBtn = styled.button`
    padding: 8px 16px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { border-color: ${st.borderHover}; color: ${st.text}; }
`;

const SaveBtn = styled.button`
    padding: 8px 20px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: #2563EB; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the first day of the period (e.g. "2026-04" → "2026-04-01"). */
function periodFirstDay(period: string): string {
    return `${period}-01`;
}

/** Returns today's date string if it falls within the period, otherwise first day. */
function defaultDate(period: string): string {
    const [year, month] = period.split('-').map(Number);
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() + 1 === month) {
        const d = String(today.getDate()).padStart(2, '0');
        return `${period}-${d}`;
    }
    return periodFirstDay(period);
}

/** Min date for the date picker (first day of period). */
function periodMinDate(period: string): string {
    return `${period}-01`;
}

/** Max date for the date picker (last day of period). */
function periodMaxDate(period: string): string {
    const [year, month] = period.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return `${period}-${String(lastDay).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AddBenefitModal = ({ employeeId, period, onClose }: Props) => {
    const [selectedType, setSelectedType] = useState<BenefitType>('OVERTIME_150');
    const [date, setDate] = useState(defaultDate(period));
    const [hours, setHours] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    const addBenefit = useAddWorkTimeBenefit(employeeId);

    const handleSave = async () => {
        const h = parseFloat(hours);
        if (!date) { setError('Wybierz datę.'); return; }
        if (!hours || isNaN(h) || h <= 0 || h > 24) {
            setError('Podaj poprawną liczbę godzin (0 – 24).');
            return;
        }

        setError('');

        const payload: AddWorkTimeBenefitPayload = {
            date,
            benefitType: selectedType,
            hours: h,
            notes: notes.trim() || null,
        };

        try {
            await addBenefit.mutateAsync(payload);
            onClose();
        } catch {
            setError('Nie udało się zapisać świadczenia. Spróbuj ponownie.');
        }
    };

    const [year, month] = period.split('-').map(Number);
    const MONTH_NAMES_PL = [
        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
    ];
    const periodDisplayName = `${MONTH_NAMES_PL[month - 1]} ${year}`;

    return (
        <Overlay onClick={onClose}>
            <ModalBox onClick={e => e.stopPropagation()}>
                <ModalHeader>
                    <div>
                        <ModalTitle>Dodaj nowe świadczenie</ModalTitle>
                        <ModalSubtitle>Okres: {periodDisplayName}</ModalSubtitle>
                    </div>
                    <CloseBtn onClick={onClose} aria-label="Zamknij">×</CloseBtn>
                </ModalHeader>

                {/* Benefit type selection */}
                <div>
                    <SectionLabel>Typ świadczenia</SectionLabel>
                    <BenefitGrid>
                        {BENEFIT_OPTIONS.map(opt => (
                            <BenefitOption key={opt.value} $selected={selectedType === opt.value}>
                                <BenefitRadio
                                    type="radio"
                                    name="benefitType"
                                    value={opt.value}
                                    checked={selectedType === opt.value}
                                    onChange={() => setSelectedType(opt.value)}
                                />
                                <BenefitInfo>
                                    <BenefitLabel>{opt.label}</BenefitLabel>
                                    <BenefitDesc>{opt.description}</BenefitDesc>
                                </BenefitInfo>
                                <MultiplierBadge>{opt.multiplier}</MultiplierBadge>
                            </BenefitOption>
                        ))}
                    </BenefitGrid>
                </div>

                {/* Date and hours */}
                <FieldRow>
                    <Field>
                        <FieldLabel htmlFor="benefit-date">Data *</FieldLabel>
                        <Input
                            id="benefit-date"
                            type="date"
                            value={date}
                            min={periodMinDate(period)}
                            max={periodMaxDate(period)}
                            onChange={e => setDate(e.target.value)}
                        />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="benefit-hours">Liczba godzin *</FieldLabel>
                        <Input
                            id="benefit-hours"
                            type="number"
                            placeholder="np. 4"
                            min={0.5}
                            max={24}
                            step={0.5}
                            value={hours}
                            onChange={e => setHours(e.target.value)}
                        />
                    </Field>
                    <FieldFull>
                        <FieldLabel htmlFor="benefit-notes">Notatki (opcjonalne)</FieldLabel>
                        <Textarea
                            id="benefit-notes"
                            placeholder="np. Praca na nocnej zmianie podczas inwentaryzacji"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </FieldFull>
                </FieldRow>

                {error && <ErrorMsg>{error}</ErrorMsg>}

                <ModalActions>
                    <CancelBtn onClick={onClose}>Anuluj</CancelBtn>
                    <SaveBtn onClick={handleSave} disabled={addBenefit.isPending}>
                        {addBenefit.isPending ? 'Zapisywanie...' : 'Dodaj świadczenie'}
                    </SaveBtn>
                </ModalActions>
            </ModalBox>
        </Overlay>
    );
};
