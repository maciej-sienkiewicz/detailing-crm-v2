// src/modules/settings/components/ProtocolContentPanels.tsx
//
// Ustawienia → Studio → Przyjęcie i wydanie: „Co jest na protokole" i „Pola pojazdu
// w formularzu przyjęcia".
//
// Logo, ceny usług i VIN były trzema osobnymi kartami o identycznej budowie, ułożonymi
// jedna pod drugą - trzy ramy na trzy przełączniki tego samego dokumentu. Teraz to jeden
// panel z jednym zdaniem o tym, czego zmiana nie dotyka (protokołów już wygenerowanych).
//
// Pola pojazdu dało się ustawić wyłącznie z dymka w formularzu wizyty, w trakcie
// przyjmowania auta. Dymek zostaje jako skrót, a stałe miejsce jest tu, obok VIN-u na
// protokole, który od pola VIN zależy (ProtocolVinCard blokuje włączenie bez niego).

import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';
import { useToast } from '@/common/components/Toast';
import { usePermissions } from '@/core/permissions';
import { Panel, SectionTitle, ui } from '@/common/components/ui';
import { VEHICLE_FORM_FIELDS, hiddenFieldsAfterToggle, isVehicleFieldVisible } from '@/modules/checkin/utils/vehicleFormFields';
import type { VehicleFormFieldKey } from '../types';
import { useUpdateVehicleFormConfig, useVehicleFormConfig } from '../hooks/useCompany';
import { DocumentLogoCard } from './DocumentLogoCard';
import { ProtocolServicePricesCard } from './ProtocolServicePricesCard';
import { ProtocolVinCard } from './ProtocolVinCard';

const Box = styled(Panel)`
    display: flex;
    flex-direction: column;
    padding: 18px 22px 8px;

    @media (max-width: 640px) { padding: 16px 16px 6px; }
`;

const Head = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 6px;

    p { margin: 0; font-size: 13px; line-height: 1.5; color: ${ui.textMuted}; }
`;

/** Wiersze rozdziela kreska, nie ramka: to jeden temat, nie kilka kart. */
const Rows = styled.div`
    display: flex;
    flex-direction: column;

    > * { padding: 12px 0; }
    > * + * { border-top: 1px solid ${ui.lineFaint}; }
`;

const FieldRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;

    .text { flex: 1; min-width: 0; }
    label { display: block; font-size: 14px; font-weight: 600; color: ${ui.ink}; cursor: pointer; }
    .hint { display: block; margin-top: 2px; font-size: 12.5px; color: ${ui.textMuted}; }
`;

const Fixed = styled.p`
    margin: 0;
    padding: 10px 0 12px;
    border-top: 1px solid ${ui.lineFaint};
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

export function ProtocolContentPanel() {
    return (
        <Box aria-labelledby="protocol-content-title">
            <Head>
                <SectionTitle as="h3" id="protocol-content-title">Co jest na protokole</SectionTitle>
                <p>Dotyczy nowych protokołów. Już wygenerowane zostają bez zmian.</p>
            </Head>
            <Rows>
                <DocumentLogoCard bare />
                <ProtocolServicePricesCard bare />
                <ProtocolVinCard bare />
            </Rows>
        </Box>
    );
}

export function VehicleFieldsPanel() {
    const { config } = useVehicleFormConfig();
    const update = useUpdateVehicleFormConfig();
    const { isOwner } = usePermissions();
    const { showError } = useToast();

    const toggle = (key: VehicleFormFieldKey, visible: boolean) => {
        update.mutate(
            { hiddenFields: hiddenFieldsAfterToggle(config?.hiddenFields, key, visible) },
            { onError: () => showError('Nie udało się zapisać ustawień pól', 'Spróbuj ponownie za chwilę.') },
        );
    };

    return (
        <Box aria-labelledby="vehicle-fields-title">
            <Head>
                <SectionTitle as="h3" id="vehicle-fields-title">Pola pojazdu w formularzu przyjęcia</SectionTitle>
                <p>
                    {isOwner
                        ? 'Ukrycie pola niczego nie kasuje. Zapisany wcześniej VIN czy kolor zostaje na karcie pojazdu.'
                        : 'Pola wybiera właściciel studia. Dotyczą wszystkich stanowisk.'}
                </p>
            </Head>
            <Rows>
                {VEHICLE_FORM_FIELDS.map(field => (
                    <FieldRow key={field.key}>
                        <div className="text">
                            <label htmlFor={`settings-vehicle-field-${field.key}`}>{field.label}</label>
                            <span className="hint">{field.hint}</span>
                        </div>
                        <Toggle
                            inputId={`settings-vehicle-field-${field.key}`}
                            checked={isVehicleFieldVisible(config?.hiddenFields, field.key)}
                            onChange={visible => toggle(field.key, visible)}
                            disabled={!isOwner || !config || update.isPending}
                            ariaLabel={`Pokazuj pole ${field.label}`}
                        />
                    </FieldRow>
                ))}
            </Rows>
            <Fixed>Marka i model są zawsze. Bez nich nie ma auta.</Fixed>
        </Box>
    );
}
