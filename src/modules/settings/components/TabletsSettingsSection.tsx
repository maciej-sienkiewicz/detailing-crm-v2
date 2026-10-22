// src/modules/settings/components/TabletsSettingsSection.tsx
//
// Ustawienia → Tablety.
//
// Dwa tablety, dwa miejsca: w recepcji klient podpisuje na nim protokół, na hali
// detailer odhacza na nim wykonane usługi. Telefon wyszedł stąd do własnej sekcji
// (Ustawienia → Telefon) - to inne urządzenie w innych rękach, a wspólny przełącznik
// „Tablety / Powiadomienia / Kontakty" kazał szukać telefonu pod tabletem.

import { TabletsSection } from './TabletsSection';
import { ServiceChecklistCard } from './ServiceChecklistCard';
import { View } from './devicesLayout';

export function TabletsSettingsSection() {
    return (
        <View>
            <TabletsSection />
            {/* Scenariusz tabletu na hali: ten sam ekran wizyty, tylko z listą „zrobione”. */}
            <ServiceChecklistCard />
        </View>
    );
}
