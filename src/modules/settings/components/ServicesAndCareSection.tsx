// src/modules/settings/components/ServicesAndCareSection.tsx
//
// Ustawienia → Cennik usług.
//
// Cennik i słownik instrukcji pielęgnacyjnych stoją w jednej zakładce, bo instrukcje
// przypisuje się do pozycji cennika — rozdzielone na dwie pozycje nawigacji zmuszałyby
// do skakania tam i z powrotem przy każdej usłudze.
import styled from 'styled-components';
import { TabBar, type TabDefinition } from '@/common/components/TabBar';
import { ServicesSection } from './ServicesSection';
import { CareInstructionsSection } from './CareInstructionsSection';

export type ServicesSubView = 'pricing' | 'care';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const PriceTagIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
        <circle cx="7.5" cy="7.5" r="1.3" />
    </svg>
);

const DropletIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.7 6.9 8.4a7 7 0 1 0 10.2 0L12 2.7Z" />
    </svg>
);

const TABS: TabDefinition<ServicesSubView>[] = [
    { key: 'pricing', label: 'Usługi', icon: <PriceTagIcon /> },
    { key: 'care', label: 'Instrukcje pielęgnacji', icon: <DropletIcon /> },
];

interface Props {
    subView: ServicesSubView;
    onSubViewChange: (next: ServicesSubView) => void;
}

export function ServicesAndCareSection({ subView, onSubViewChange }: Props) {
    return (
        <Container>
            <TabBar
                tabs={TABS}
                activeKey={subView}
                onChange={onSubViewChange}
                ariaLabel="Zakres ustawień cennika"
            />
            {subView === 'care' ? <CareInstructionsSection /> : <ServicesSection />}
        </Container>
    );
}
