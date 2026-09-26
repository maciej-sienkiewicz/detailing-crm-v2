// src/modules/settings/components/LabelsSection.tsx
//
// Ustawienia → Oznaczenia.
//
// Numeracja wizyt i kolory odpowiadają na to samo pytanie - „po czym poznajemy
// wizytę?" - i obie są ustawieniem studia, a nie modułem. Wcześniej numeracja
// była osobną pozycją w nawigacji, a kolory nie miały jej wcale: widok istniał
// pod /appointment-colors, do którego nic nie prowadziło.
//
// Przełącznik widoków to Segmented, jak w pozostałych sekcjach ustawień - pasek
// zakładek z podkreśleniem wyglądał tu jak druga nawigacja strony.

import styled from 'styled-components';
import { Segmented, type SegmentedOption } from '@/common/components/ui';
import { VisitNumberingSection } from './VisitNumberingSection';
import { AppointmentColorsSection } from './AppointmentColorsSection';

export type LabelsSubView = 'numbering' | 'colors';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
`;

// W kolumnie flex przełącznik rozciągał się na całą szerokość - szary pas zamiast dwóch klawiszy.
const Switcher = styled.div`
    align-self: flex-start;
    max-width: 100%;
`;

const OPTIONS: SegmentedOption<LabelsSubView>[] = [
    { value: 'numbering', label: 'Numeracja wizyt' },
    { value: 'colors', label: 'Kolory wizyt' },
];

interface LabelsSectionProps {
    subView: LabelsSubView;
    onSubViewChange: (next: LabelsSubView) => void;
    /** Numeracja to ustawienie właściciela; pracownik z prawem do wizyt widzi same kolory. */
    canSeeNumbering: boolean;
}

export function LabelsSection({ subView, onSubViewChange, canSeeNumbering }: LabelsSectionProps) {
    const active: LabelsSubView = canSeeNumbering ? subView : 'colors';

    return (
        <Container>
            {canSeeNumbering && (
                <Switcher>
                    <Segmented
                        label="Rodzaj oznaczeń"
                        options={OPTIONS}
                        value={active}
                        onChange={onSubViewChange}
                    />
                </Switcher>
            )}

            {active === 'colors' ? <AppointmentColorsSection /> : <VisitNumberingSection />}
        </Container>
    );
}
