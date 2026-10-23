// src/modules/settings/components/StudioDevicesSection.tsx
//
// Ustawienia → Studio → Urządzenia w studiu.
//
// Sprzęt, który stoi w studiu, a nie chodzi z kimś w kieszeni: tablety (w recepcji
// klient podpisuje na nim protokół, na hali detailer odhacza wykonane usługi) i komputer,
// na którym teraz pracujesz. Telefon ma własną sekcję w „Moje": każdy paruje swój.
//
// „Ten komputer" zebrał dwa ustawienia, które dawniej żyły osobno - blokadę po
// bezczynności w „Bezpieczeństwie" i skróty klawiszowe we własnej sekcji. Oba dotyczą
// stanowiska, a nie osoby ani studia: komputer w recepcji blokuje się szybciej niż
// laptop w biurze, a skróty to nawyk przy konkretnej klawiaturze.

import styled from 'styled-components';
import { usePermissions } from '@/core/permissions';
import { SectionTitle, ui } from '@/common/components/ui';
import { TabletsSection } from './TabletsSection';
import { ServiceChecklistCard } from './ServiceChecklistCard';
import { ShortcutsSection } from './ShortcutsSection';
import { IdleLockCard } from './AccountCards';
import { View } from './devicesLayout';

const Group = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    margin-top: 8px;
`;

const GroupHead = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;

    p { margin: 0; font-size: 13.5px; line-height: 1.5; color: ${ui.textSecondary}; }
`;

export function StudioDevicesSection() {
    const { can, isOwner } = usePermissions();
    // Tablety paruje i ustawia ten, kto przyjmuje auta. Skróty i blokada nie mają
    // takiego wymogu, więc sekcja jest widoczna dla każdego, a tablety chowają się w środku.
    const canManageTablets = can('VISITS_CREATE');

    return (
        <View>
            {canManageTablets && <TabletsSection />}
            {/* Scenariusz tabletu na hali: ten sam ekran wizyty, tylko z listą „zrobione”. */}
            {canManageTablets && <ServiceChecklistCard />}

            <Group aria-labelledby="this-computer-title">
                <GroupHead>
                    <SectionTitle as="h3" size="lg" id="this-computer-title">Ten komputer</SectionTitle>
                    <p>Działa tylko na tym komputerze, dla każdego konta, które na nim pracuje.</p>
                </GroupHead>
                {/* Blokada zostaje przy właścicielu, tak jak w dawnym „Bezpieczeństwie”. */}
                {isOwner && <IdleLockCard />}
                <ShortcutsSection />
            </Group>
        </View>
    );
}
