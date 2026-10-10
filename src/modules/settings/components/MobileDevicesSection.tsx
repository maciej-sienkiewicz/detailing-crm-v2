// src/modules/settings/components/MobileDevicesSection.tsx
//
// Ustawienia → Tablety, telefon, kontakty.
//
// Trzy różne urządzenia i trzy różne konfiguracje: tablet w recepcji, telefon
// z powiadomieniami i telefon z kontaktami studia. Wcześniej stały jedna pod
// drugą na jednym przewijanym ekranie, potem pod podkreślonymi zakładkami.
// Teraz przełącza je `Segmented` - ten sam, co w innych sekcjach ustawień -
// z licznikiem tam, gdzie liczba coś mówi (sparowane tablety, telefony z kontaktami).
//
// Kontrakt z ramą (SettingsView) bez zmian: widok siedzi w `?view=`, a zmianę
// zgłasza `onSubViewChange`.

import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { Segmented, type SegmentedOption } from '@/common/components/ui';
import { useCapability } from '@/modules/subscription';
import { carddavApi, CARDDAV_ACCOUNTS_KEY } from '@/modules/carddav';
import { PushNotificationsPanel } from '@/modules/push/components/PushNotificationsPanel';
import { useTablets } from '../hooks/useTablets';
import { TabletsSection } from './TabletsSection';
import { ServiceChecklistCard } from './ServiceChecklistCard';
import { ContactsSyncSection } from './ContactsSyncSection';
import { View } from './devicesLayout';
import { usePermissions } from '@/core/permissions';

export type MobileDevicesSubView = 'tablets' | 'notifications' | 'contacts';

interface MobileDevicesSectionProps {
    subView: MobileDevicesSubView;
    onSubViewChange: (next: MobileDevicesSubView) => void;
}

export function MobileDevicesSection({ subView, onSubViewChange }: MobileDevicesSectionProps) {
    // Liczniki z tej samej pamięci podręcznej, z której czytają widoki - bez
    // osobnych zapytań. Brak danych (wczytywanie, błąd, brak modułu) = brak liczby.
    const signatures = useCapability('SIGNATURE_LOCAL');
    // Sparowany telefon dostaje pełną książkę klientów bez maskowania - backend wymaga do
    // tego CUSTOMERS_VIEW, więc kto go nie ma, nie widzi zakładki, zamiast dostać odmowę.
    const { can } = usePermissions();
    const canSyncContacts = can('CUSTOMERS_VIEW');
    const view: MobileDevicesSubView = subView === 'contacts' && !canSyncContacts ? 'tablets' : subView;
    const { tablets, loaded: tabletsLoaded } = useTablets({ enabled: signatures.enabled });
    const { data: phones } = useQuery({
        queryKey: CARDDAV_ACCOUNTS_KEY,
        queryFn: carddavApi.listAccounts,
        staleTime: 30_000,
        enabled: canSyncContacts,
    });

    const options: SegmentedOption<MobileDevicesSubView>[] = [
        { value: 'tablets', label: 'Tablety', count: tabletsLoaded ? tablets.length : null },
        { value: 'notifications', label: 'Powiadomienia' },
        ...(canSyncContacts
            ? [{ value: 'contacts' as const, label: 'Kontakty', count: phones ? phones.length : null }]
            : []),
    ];

    return (
        <View>
            <SwitchScroll>
                <Segmented
                    label="Rodzaj urządzenia"
                    options={options}
                    value={view}
                    onChange={onSubViewChange}
                />
            </SwitchScroll>

            {view === 'tablets' && (
                <>
                    <TabletsSection />
                    {/* Scenariusz tabletu na hali: ten sam ekran wizyty, tylko z listą „zrobione”. */}
                    <ServiceChecklistCard />
                </>
            )}

            {view === 'notifications' && (
                <View>
                    {/* Bez wstępu: pięć linii wyliczanki powtarzało listę z kreatora poniżej. */}
                    <PushNotificationsPanel />
                </View>
            )}

            {view === 'contacts' && <ContactsSyncSection />}
        </View>
    );
}

/* Krótkie etykiety mieszczą się w 358 px; gdyby liczby urosły, przełącznik
   przewija się sam, zamiast rozpychać stronę (która ma `overflow-x: clip`). */
const SwitchScroll = styled.div`
    max-width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;
