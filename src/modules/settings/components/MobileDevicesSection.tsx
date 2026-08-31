// src/modules/settings/components/MobileDevicesSection.tsx
//
// „Urządzenia mobilne" to jeden temat — sprzęt sparowany ze studiem — ale trzy
// osobne sprawy: tablet do podpisu, zezwolenia na powiadomienia i kontakty
// klientów na telefonie. Ułożone jedna pod drugą robiły ze strony przewijaną
// płachtę, w której nie było widać, że są tu trzy niezależne konfiguracje.
// Zakładki (ten sam pasek co w „Role i pracownicy") pokazują je jako
// równorzędne wybory i pozwalają wysłać komuś link wprost do właściwej.

import { useMemo } from 'react';
import { TabBar, type TabDefinition } from '@/common/components/TabBar';
import { Container } from './rbacShared.styles';
import { TabletsSection } from './TabletsSection';
import { PushDevicesSection } from './PushDevicesSection';
import { ContactsSyncSection } from './ContactsSyncSection';

export type MobileDevicesSubView = 'tablets' | 'push' | 'contacts';

const TabletIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18" />
    </svg>
);

const BellIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const ContactsIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
);

interface MobileDevicesSectionProps {
    subView: MobileDevicesSubView;
    onSubViewChange: (next: MobileDevicesSubView) => void;
}

export function MobileDevicesSection({ subView, onSubViewChange }: MobileDevicesSectionProps) {
    const tabs = useMemo<TabDefinition<MobileDevicesSubView>[]>(() => ([
        { key: 'tablets', label: 'Tablety', icon: <TabletIcon /> },
        { key: 'push', label: 'Zezwolenia na powiadomienia', icon: <BellIcon /> },
        { key: 'contacts', label: 'Kontakty na telefonie', icon: <ContactsIcon /> },
    ]), []);

    return (
        <Container>
            <TabBar
                tabs={tabs}
                activeKey={subView}
                onChange={onSubViewChange}
                ariaLabel="Rodzaj urządzenia"
            />

            {subView === 'push' ? <PushDevicesSection />
                : subView === 'contacts' ? <ContactsSyncSection />
                : <TabletsSection />}
        </Container>
    );
}
