// src/modules/settings/components/FinanceSection.tsx
//
// Ustawienia → Finanse → Finanse i KSeF.
//
// Dawniej dwie sekcje obok siebie: „KSeF" (połączenie i to, kto wystawia faktury przy
// wydaniu) i „Finanse" (statusy płatności). Obie mówią o tym samym - jak pieniądz
// z wizyty trafia do Finansów - i obie zmienia właściciel, więc szukało się ich na
// zmianę w dwóch miejscach. Kolejność idzie za wizytą: najpierw faktura przy wydaniu,
// potem połączenie, które ją wysyła, na końcu to, jak płatność liczy się w Finansach.
//
// Bez modułu ustawienia niczego nie zmieniają, więc w ich miejscu stoi oferta modułu
// (konfigurowanie nieposiadanego modułu tylko myli, a backend i tak odpowiada 402).

import styled from 'styled-components';
import { KsefCredentialsPanel, KsefSendingDefaultsPanel, PaymentTrackingPanel } from '@/modules/finance/components';
import { RequireCapability } from '@/modules/subscription';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

export function FinanceSection() {
    // KSeF i Finanse wynikają dziś z tego samego modułu, więc jedna oferta na całą
    // sekcję, a nie dwie rozmyte nakładki z tym samym zdaniem. Wewnętrzne sprawdzenie
    // KSeF zostaje na wypadek, gdyby KSeF stał się osobnym dodatkiem.
    return (
        <RequireCapability
            capability="FINANCE_ACCESS"
            mode="upsell"
            message="Finanse i KSeF wymagają modułu „Kontrola nad finansami”."
        >
            <Wrap>
                <RequireCapability capability="FINANCE_KSEF" mode="hide">
                    <KsefSendingDefaultsPanel />
                    <KsefCredentialsPanel />
                </RequireCapability>
                <PaymentTrackingPanel />
            </Wrap>
        </RequireCapability>
    );
}
