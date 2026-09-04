// src/modules/settings/components/MobileDevicesSection.tsx
//
// Ustawienia → Urządzenia mobilne.
//
// Trzy różne urządzenia i trzy różne konfiguracje: tablet w recepcji, telefon
// z powiadomieniami i telefon z kontaktami studia. Wcześniej stały jedna pod
// drugą na jednym przewijanym ekranie, przez co na telefonie trzeba było
// przewinąć obcą sekcję, żeby dojść do swojej. Teraz każda ma własną zakładkę.

import { useMemo } from 'react';
import styled from 'styled-components';
import { TabBar, type TabDefinition } from '@/common/components/TabBar';
import { TabletsSection } from './TabletsSection';
import { ContactsSyncSection } from './ContactsSyncSection';
import { PushNotificationsPanel } from '@/modules/push/components/PushNotificationsPanel';

export type MobileDevicesSubView = 'tablets' | 'notifications' | 'contacts';

const TabletIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
);

const BellIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const ContactsIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4z" />
        <path d="M2 8h2M2 12h2M2 16h2" />
        <circle cx="12" cy="10" r="2.2" />
        <path d="M8.5 16a3.5 3.5 0 0 1 7 0" />
    </svg>
);

interface MobileDevicesSectionProps {
    subView: MobileDevicesSubView;
    onSubViewChange: (next: MobileDevicesSubView) => void;
}

export function MobileDevicesSection({ subView, onSubViewChange }: MobileDevicesSectionProps) {
    const tabs = useMemo<TabDefinition<MobileDevicesSubView>[]>(() => ([
        { key: 'tablets', label: 'Tablety do podpisu', icon: <TabletIcon /> },
        { key: 'notifications', label: 'Powiadomienia', icon: <BellIcon /> },
        { key: 'contacts', label: 'Synchronizacja kontaktów', icon: <ContactsIcon /> },
    ]), []);

    return (
        <Container>
            <TabBar
                tabs={tabs}
                activeKey={subView}
                onChange={onSubViewChange}
                ariaLabel="Rodzaj urządzenia mobilnego"
            />

            {subView === 'tablets' && <TabletsSection />}

            {subView === 'notifications' && (
                <Block>
                    <BlockTitle>Powiadomienia</BlockTitle>
                    <BlockHint>
                        Telefon dostaje powiadomienia z CRM: prośbę o połączenie kliknięte na
                        komputerze (z przyciskiem „Zadzwoń"), zakończone wizyty i nowe zapytania.
                        Każdy włącza je na swoich urządzeniach - i tylko on je dostaje.
                    </BlockHint>
                    <PushNotificationsPanel />
                </Block>
            )}

            {subView === 'contacts' && <ContactsSyncSection />}
        </Container>
    );
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Block = styled.section`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const BlockTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const BlockHint = styled.p`
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.55;
    color: #64748b;
    max-width: 68ch;
`;
