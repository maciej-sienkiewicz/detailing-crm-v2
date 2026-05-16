import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    ModalSectionTitle,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import type { BenefitType } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    /** YYYY-MM – used only for display. */
    period: string;
    /** Benefit types that already have an active row in the grid. */
    existingTypes: BenefitType[];
    /** Called when the user confirms; the modal does NOT make any API calls. */
    onAdd: (type: BenefitType) => void;
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

const MONTH_NAMES_PL = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const BenefitGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const BenefitOption = styled.label<{ $selected: boolean; $existing: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1.5px solid ${({ $selected }) => ($selected ? st.accentBlue : st.border)};
    border-radius: ${st.radiusSm};
    background: ${({ $selected }) => ($selected ? st.accentBlueDim : st.bgCard)};
    cursor: ${({ $existing }) => ($existing ? 'default' : 'pointer')};
    opacity: ${({ $existing }) => ($existing ? 0.5 : 1)};
    transition: all ${st.transition};

    &:hover {
        border-color: ${({ $selected, $existing }) =>
            $existing ? st.border : $selected ? st.accentBlue : st.borderHover};
        background: ${({ $selected, $existing }) =>
            $existing ? st.bgCard : $selected ? st.accentBlueDim : st.bgCardAlt};
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

const ExistingBadge = styled.span`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    white-space: nowrap;
    flex-shrink: 0;
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const AddBenefitModal = ({ period, existingTypes, onAdd, onClose }: Props) => {
    const [year, month] = period.split('-').map(Number);
    const periodDisplayName = `${MONTH_NAMES_PL[month - 1]} ${year}`;

    // Pick first option that isn't already active, fall back to first option
    const defaultType = BENEFIT_OPTIONS.find(o => !existingTypes.includes(o.value))?.value
        ?? BENEFIT_OPTIONS[0].value;
    const [selectedType, setSelectedType] = useState<BenefitType>(defaultType);

    const handleAdd = () => {
        onAdd(selectedType);
        onClose();
    };

    const isSelectedExisting = existingTypes.includes(selectedType);

    return (
        <ModalShell isOpen={true} onClose={onClose} maxWidth="480px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj nowe świadczenie</ModalTitle>
                    <ModalSubtitle>
                        Okres: {periodDisplayName} · Wybierz rodzaj — wiersz pojawi się w tabeli
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} aria-label="Zamknij" />
            </ModalHeader>

            <ModalContent>
                <div>
                    <ModalSectionTitle>Typ świadczenia</ModalSectionTitle>
                    <BenefitGrid>
                        {BENEFIT_OPTIONS.map(opt => {
                            const isExisting = existingTypes.includes(opt.value);
                            return (
                                <BenefitOption
                                    key={opt.value}
                                    $selected={selectedType === opt.value}
                                    $existing={isExisting}
                                >
                                    <BenefitRadio
                                        type="radio"
                                        name="benefitType"
                                        value={opt.value}
                                        checked={selectedType === opt.value}
                                        disabled={isExisting}
                                        onChange={() => !isExisting && setSelectedType(opt.value)}
                                    />
                                    <BenefitInfo>
                                        <BenefitLabel>{opt.label}</BenefitLabel>
                                        <BenefitDesc>{opt.description}</BenefitDesc>
                                    </BenefitInfo>
                                    {isExisting
                                        ? <ExistingBadge>już dodane</ExistingBadge>
                                        : <MultiplierBadge>{opt.multiplier}</MultiplierBadge>
                                    }
                                </BenefitOption>
                            );
                        })}
                    </BenefitGrid>
                </div>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton $variant="primary" type="button" onClick={handleAdd} disabled={isSelectedExisting}>
                    Dodaj wiersz
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
