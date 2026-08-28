// src/modules/settings/components/LabelsSection.tsx
//
// Ustawienia → Oznaczenia.
//
// Numeracja wizyt i kolory odpowiadają na to samo pytanie — „po czym poznajemy
// wizytę?" — i obie są ustawieniem studia, a nie modułem. Wcześniej numeracja
// była osobną pozycją w nawigacji, a kolory nie miały jej wcale: widok istniał
// pod /appointment-colors, do którego nic nie prowadziło.

import { useMemo } from 'react';
import styled from 'styled-components';
import { TabBar, type TabDefinition } from '@/common/components/TabBar';
import { VisitNumberingSection } from './VisitNumberingSection';
import { AppointmentColorsSection } from './AppointmentColorsSection';

export type LabelsSubView = 'numbering' | 'colors';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const HashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 9h14M5 15h14M10 3 8 21M16 3l-2 18" />
    </svg>
);

const PaletteIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="1.5" />
        <circle cx="17.5" cy="10.5" r="1.5" />
        <circle cx="8.5" cy="7.5" r="1.5" />
        <circle cx="6.5" cy="12.5" r="1.5" />
        <path d="M12 2a10 10 0 0 0 0 20c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16a6 6 0 0 0 6-6c0-4.4-4.5-8-10-8z" />
    </svg>
);

interface LabelsSectionProps {
    subView: LabelsSubView;
    onSubViewChange: (next: LabelsSubView) => void;
    /** Numeracja to ustawienie właściciela; pracownik z prawem do wizyt widzi same kolory. */
    canSeeNumbering: boolean;
}

export function LabelsSection({ subView, onSubViewChange, canSeeNumbering }: LabelsSectionProps) {
    const tabs = useMemo<TabDefinition<LabelsSubView>[]>(() => {
        const all: TabDefinition<LabelsSubView>[] = [
            { key: 'numbering', label: 'Numeracja wizyt', icon: <HashIcon /> },
            { key: 'colors', label: 'Kolory wizyt', icon: <PaletteIcon /> },
        ];
        return canSeeNumbering ? all : all.filter(tab => tab.key === 'colors');
    }, [canSeeNumbering]);

    const active: LabelsSubView = canSeeNumbering ? subView : 'colors';

    return (
        <Container>
            {tabs.length > 1 && (
                <TabBar
                    tabs={tabs}
                    activeKey={active}
                    onChange={onSubViewChange}
                    ariaLabel="Rodzaj oznaczeń"
                />
            )}

            {active === 'colors' ? <AppointmentColorsSection /> : <VisitNumberingSection />}
        </Container>
    );
}
