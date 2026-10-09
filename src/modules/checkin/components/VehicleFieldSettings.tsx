// src/modules/checkin/components/VehicleFieldSettings.tsx
//
// „Ustawienia pól" w sekcji „Dane pojazdu" formularza wizyty: które pola pojazdu ten
// formularz pokazuje.
//
// Różne studia potrzebują różnych pól - jedno nie używa VIN, innego nie obchodzi kolor
// ani przebieg - a pole, którego nikt nie wypełnia, tylko wydłuża przyjęcie auta.
// Ustawienie jest całego studia (każdy na stanowisku widzi ten sam formularz), więc
// zmienia je właściciel; pozostali widzą listę, ale przełączniki mają nieaktywne.
// Ukrycie pola niczego nie kasuje: VIN czy kolor zapisany wcześniej zostaje na karcie
// pojazdu.
//
// Dymek jak „Ustawienia widoku miesiąca" w kalendarzu - ten sam wzorzec ustawienia
// wyglądu, nie danych.
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Settings2 } from 'lucide-react';
import { Toggle } from '@/common/components/Toggle';
import { useFloatingPanel } from '@/common/hooks/useFloatingPanel';
import { useToast } from '@/common/components/Toast';
import { usePermissions } from '@/core/permissions';
import { useUpdateVehicleFormConfig, useVehicleFormConfig } from '@/modules/settings/hooks/useCompany';
import type { VehicleFormFieldKey } from '@/modules/settings/types';
import { VEHICLE_FORM_FIELDS } from '../utils/vehicleFormFields';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const Trigger = styled.button<{ $open: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 11px;
    border: 1.5px solid ${p => (p.$open ? st.accentBlue : st.border)};
    border-radius: ${st.radiusSm};
    background: ${st.bgCard};
    color: ${p => (p.$open ? st.accentBlue : st.textSecondary)};
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};

    svg { width: 14px; height: 14px; }
    &:hover { border-color: ${st.accentBlue}; color: ${st.accentBlue}; }
    &:focus-visible { outline: 2px solid ${st.accentBlue}; outline-offset: 2px; }
`;

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 999;
    background: transparent;

    @media (max-width: 768px) { background: rgba(15, 23, 42, 0.25); }
`;

/* Pozycję i limit wysokości ustawia useFloatingPanel; na telefonie dolny arkusz. */
const Panel = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    visibility: hidden;
    box-sizing: border-box;
    z-index: 1000;
    width: 320px;
    max-width: calc(100vw - 24px);
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.06);
    overflow-x: hidden;
    overscroll-behavior: contain;

    @media (max-width: 768px) {
        top: auto !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100%;
        max-width: 100% !important;
        border-radius: 16px 16px 0 0;
        max-height: 80vh !important;
        overflow-y: auto !important;
        visibility: visible !important;
        padding-bottom: env(safe-area-inset-bottom, 0px);
    }
`;

const PanelHead = styled.div`
    padding: 13px 16px 11px;
    border-bottom: 1px solid #f1f5f9;

    h3 { margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; }
    p { margin: 4px 0 0; font-size: 12px; line-height: 1.45; color: #64748b; }
`;

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;

    & + & { border-top: 1px solid #f1f5f9; }

    .text { flex: 1; min-width: 0; }
    label { display: block; font-size: 13px; font-weight: 600; color: #0f172a; cursor: pointer; }
    .hint { display: block; margin-top: 1px; font-size: 12px; color: #94a3b8; }
`;

const Fixed = styled.p`
    margin: 0;
    padding: 10px 16px 12px;
    border-top: 1px solid #f1f5f9;
    font-size: 12px;
    color: #94a3b8;
`;

export function VehicleFieldSettings() {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const { config } = useVehicleFormConfig();
    const update = useUpdateVehicleFormConfig();
    const { isOwner } = usePermissions();
    const { showError } = useToast();
    const canChange = isOwner;
    const hidden = new Set(config?.hiddenFields ?? []);

    useFloatingPanel(open, btnRef, panelRef, { align: 'right', offset: 8, margin: 12 });

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const toggle = (key: VehicleFormFieldKey, visible: boolean) => {
        const next = VEHICLE_FORM_FIELDS
            .map(field => field.key)
            .filter(k => (k === key ? !visible : hidden.has(k)));
        update.mutate(
            { hiddenFields: next },
            { onError: () => showError('Nie udało się zapisać ustawień pól', 'Spróbuj ponownie za chwilę.') },
        );
    };

    return (
        <>
            <Trigger
                ref={btnRef}
                type="button"
                $open={open}
                onClick={() => setOpen(v => !v)}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <Settings2 aria-hidden="true" />
                Ustawienia pól
            </Trigger>
            {open && (
                <>
                    <Backdrop onClick={() => setOpen(false)} />
                    <Panel ref={panelRef} role="dialog" aria-label="Ustawienia pól pojazdu">
                        <PanelHead>
                            <h3>Pola pojazdu na formularzu</h3>
                            <p>
                                {canChange
                                    ? 'Wybierz, co wypełniacie przy przyjęciu. Ukrycie pola nie usuwa zapisanych danych.'
                                    : 'Pola wybiera właściciel studia - dotyczą wszystkich stanowisk.'}
                            </p>
                        </PanelHead>
                        {VEHICLE_FORM_FIELDS.map(field => (
                            <Row key={field.key}>
                                <div className="text">
                                    <label htmlFor={`vehicle-field-${field.key}`}>{field.label}</label>
                                    <span className="hint">{field.hint}</span>
                                </div>
                                <Toggle
                                    inputId={`vehicle-field-${field.key}`}
                                    size="sm"
                                    checked={!hidden.has(field.key)}
                                    onChange={visible => toggle(field.key, visible)}
                                    disabled={!canChange || !config}
                                    ariaLabel={`Pokazuj pole ${field.label}`}
                                />
                            </Row>
                        ))}
                        <Fixed>Marka i model są zawsze - bez nich nie ma pojazdu.</Fixed>
                    </Panel>
                </>
            )}
        </>
    );
}
