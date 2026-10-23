// src/modules/settings/components/ProtocolVinCard.tsx
//
// Ustawienia → Komunikacja → Dokumenty i podpisy → „VIN na protokole przyjęcia".
//
// Część studiów chce mieć numer VIN na dokumencie, który podpisuje klient, część nie.
// Inaczej niż ceny usług, to zmienia UKŁAD protokołu: serwer od razu podmienia plik
// systemowego szablonu na wariant z wierszem „VIN" (albo bez niego) - w tej samej
// operacji, w której zapisuje ustawienie. Dlatego podpis mówi wprost, czego zmiana nie
// dotyka: protokołów już wygenerowanych i własnego szablonu studia.
//
// Budowa jak karta cen obok (ProtocolServicePricesCard): pytanie jest nagłówkiem, podpis
// mówi, co się stanie, zapis od razu po kliknięciu, błąd cofa stan.

import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';
import { useToast } from '@/common/components/Toast';
import { usePermissions } from '@/core/permissions';
import { Panel } from '@/common/components/ui';
import { useProtocolContentConfig, useUpdateProtocolContentConfig, useVehicleFormConfig } from '../hooks/useCompany';
import { shownByInterceptor } from './studioErrors';

const Card = styled(Panel)`
    padding: 16px 20px;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

const OptionRow = styled.div<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 16px;
    opacity: ${p => (p.$disabled ? 0.6 : 1)};
`;

const OptionTexts = styled.div`
    flex: 1;
    min-width: 0;
`;

const OptionLabel = styled.h3<{ $bare?: boolean }>`
    margin: 0;
    font-size: ${p => (p.$bare ? '14px' : '15px')};
    font-weight: ${p => (p.$bare ? 600 : 700)};
    color: ${p => p.theme.colors.text};
`;

const OptionHint = styled.div`
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
    margin-top: 2px;
    line-height: 1.45;
`;

const LABEL = 'VIN na protokole przyjęcia';

interface Props {
    /**
     * Sam wiersz, bez własnej ramki: w „Przyjęciu i wydaniu" trzy przełączniki protokołu
     * stoją w jednym panelu „Co jest na protokole" (ProtocolContentPanel).
     */
    bare?: boolean;
}

export function ProtocolVinCard({ bare = false }: Props = {}) {
    const { isOwner } = usePermissions();
    const { config, isLoading } = useProtocolContentConfig();
    const { config: vehicleForm } = useVehicleFormConfig();
    const updateMutation = useUpdateProtocolContentConfig();
    const { showError } = useToast();

    // Do czasu odpowiedzi zakładamy stan domyślny backendu (bez VIN-u).
    const enabled = config?.showVin ?? false;
    // Formularz wizyty, który nie zbiera VIN-u, dałby na protokole pustą ramkę - serwer
    // odmawia włączenia. Wyłączyć wolno zawsze.
    const vinHiddenInForm = vehicleForm?.hiddenFields.includes('vin') ?? false;
    const blockedByForm = vinHiddenInForm && !enabled;
    const locked = isLoading || updateMutation.isPending || !isOwner || blockedByForm;

    const handleChange = (value: boolean) => {
        updateMutation.mutate(
            { showVin: value },
            {
                onError: error => {
                    if (!shownByInterceptor(error)) showError('Nie udało się zapisać ustawienia protokołu');
                },
            },
        );
    };

    const hint = !isOwner
        ? 'Zmienić to ustawienie może tylko właściciel studia.'
        : blockedByForm
            ? 'VIN jest ukryty w formularzu pojazdu, więc protokół miałby pustą ramkę. Najpierw włącz pole VIN w polach pojazdu formularza przyjęcia.'
            : enabled
                ? 'Protokół ma wiersz VIN w ramce pojazdu. Po wyłączeniu wiersz zniknie z kolejnych protokołów; już wygenerowane zostają bez zmian.'
                : 'Protokół nie pokazuje numeru VIN. Po włączeniu wiersz VIN pojawi się w ramce pojazdu na kolejnych protokołach; już wygenerowane zostają bez zmian.';

    const row = (
        <OptionRow $disabled={!isOwner || blockedByForm}>
            <OptionTexts>
                <OptionLabel as={bare ? 'h4' : 'h3'} $bare={bare}>{LABEL}</OptionLabel>
                <OptionHint>{hint}</OptionHint>
            </OptionTexts>
            <Toggle checked={enabled} disabled={locked} ariaLabel={LABEL} onChange={handleChange} />
        </OptionRow>
    );

    return bare ? row : <Card>{row}</Card>;
}
