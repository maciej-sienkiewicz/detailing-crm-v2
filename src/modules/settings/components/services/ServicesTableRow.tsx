// src/modules/settings/components/services/ServicesTableRow.tsx
import styled from 'styled-components';
import { Badge } from '@/common/components/Badge';
import { calculateGrossFromNet } from '@/modules/services/utils/priceCalculator';
import type { Service } from '@/modules/services/types';
import { SERVICES_TABLE_GRID, formatPLN, vatLabel } from './servicesTable.helpers';

/**
 * One row of the services price list, composed from four cells:
 * name → VAT → price → status (+ actions). Extracted from `ServicesSection`
 * so the row contract is typed and the section file stays orchestration-only.
 *
 * Pricing rule: a service without a fixed price (`requireManualPrice`) shows a
 * "Wycena ręczna" badge in the PRICE column: pricing mode is a fact about the
 * price, not about the name, so the name column stays clean.
 */

export interface ServicesTableRowProps {
    service: Service;
    /** Disables edit/archive while any form panel is open. */
    actionsDisabled: boolean;
    onEdit: (service: Service) => void;
    onArchive: (service: Service) => void;
}

export function ServicesTableRow({ service, actionsDisabled, onEdit, onArchive }: ServicesTableRowProps) {
    return (
        <Row>
            <ServiceNameCell service={service} />

            <VatCell>
                <VatBadge>{vatLabel(service.vatRate)}</VatBadge>
            </VatCell>

            <ServicePriceCell service={service} />

            <StatusCell>
                <StatusDot $active={service.isActive} />
                <StatusLabel $active={service.isActive}>
                    {service.isActive ? 'Aktywna' : 'Archiwalna'}
                </StatusLabel>
            </StatusCell>

            <ActionsCell>
                {service.isActive && (
                    <>
                        <ActionBtn
                            title="Edytuj"
                            disabled={actionsDisabled}
                            onClick={() => onEdit(service)}
                        >
                            <EditIcon />
                        </ActionBtn>
                        <ActionBtn
                            $danger
                            title="Archiwizuj"
                            onClick={() => onArchive(service)}
                        >
                            <ArchiveIcon />
                        </ActionBtn>
                    </>
                )}
            </ActionsCell>
        </Row>
    );
}

// ─── Cells ────────────────────────────────────────────────────────────────────

function ServiceNameCell({ service }: { service: Service }) {
    return (
        <NameCell>
            <NameLine>
                <ServiceName $muted={!service.isActive}>{service.name}</ServiceName>
                {service.isPackage && <PackageBadge>Pakiet</PackageBadge>}
            </NameLine>
            {service.isPackage && service.packageItems && service.packageItems.length > 0 && (
                <PackageItemsHint>
                    {service.packageItems.map(item => item.serviceName).join(' · ')}
                </PackageItemsHint>
            )}
        </NameCell>
    );
}

function ServicePriceCell({ service }: { service: Service }) {
    if (service.requireManualPrice) {
        return (
            <PriceCell>
                <Badge $variant="warning">Wycena ręczna</Badge>
            </PriceCell>
        );
    }

    const priceGross =
        service.basePriceGross
        ?? calculateGrossFromNet(service.basePriceNet, service.vatRate).priceGross;

    return (
        <PriceCell>
            <PriceNet>{formatPLN(service.basePriceNet)}</PriceNet>
            <PriceGross>{formatPLN(priceGross)} brutto</PriceGross>
        </PriceCell>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EditIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
);

const ArchiveIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"/>
        <rect x="1" y="3" width="22" height="5"/>
        <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const Row = styled.div`
    display: grid;
    grid-template-columns: ${SERVICES_TABLE_GRID};
    gap: 8px;
    align-items: center;
    padding: 13px 20px;
    border-bottom: 1px solid #f1f5f9;
    transition: background 150ms;

    &:last-child { border-bottom: none; }
    &:hover { background: #fafbfc; }

    /* Pięć kolumn nie mieści się na telefonie — wiersz czyta się wtedy jako
       kafelka: nazwa z VAT-em, pod nią cena, status i akcje w jednym rzędzie. */
    @media (max-width: 900px) {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 6px 10px;
        padding: 12px 14px;
        align-items: start;

        > :nth-child(1) { grid-column: 1; grid-row: 1; }
        > :nth-child(2) { grid-column: 2; grid-row: 1; justify-self: end; }
        > :nth-child(3) { grid-column: 1 / -1; grid-row: 2; align-items: flex-start; text-align: left; }
        > :nth-child(4) { grid-column: 1; grid-row: 3; }
        > :nth-child(5) { grid-column: 2; grid-row: 3; justify-self: end; }
    }
`;

const NameCell = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
`;

const NameLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
`;

const ServiceName = styled.span<{ $muted?: boolean }>`
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.$muted ? '#94a3b8' : '#0f172a'};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const PackageBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    font-size: 10px;
    font-weight: 700;
    background: rgba(37,99,235,0.08);
    color: #2563eb;
    border: 1px solid rgba(37,99,235,0.18);
    border-radius: 6px;
    white-space: nowrap;
    flex-shrink: 0;
    letter-spacing: 0.05em;
    text-transform: uppercase;
`;

const PackageItemsHint = styled.div`
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 340px;
`;

const VatCell = styled.div`
    display: flex;
    justify-content: center;
`;

const VatBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 3px 9px;
    font-size: 11px;
    font-weight: 700;
    background: rgba(14, 165, 233, 0.1);
    color: #0ea5e9;
    border-radius: 9999px;
    white-space: nowrap;
`;

const PriceCell = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
`;

const PriceNet = styled.span`
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    white-space: nowrap;
`;

const PriceGross = styled.span`
    font-size: 11px;
    color: #94a3b8;
    white-space: nowrap;
`;

const StatusCell = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    padding-left: 14px;
`;

const StatusDot = styled.div<{ $active: boolean }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${p => p.$active ? '#10b981' : '#94a3b8'};
`;

const StatusLabel = styled.span<{ $active: boolean }>`
    font-size: 11px;
    font-weight: 600;
    color: ${p => p.$active ? '#10b981' : '#94a3b8'};
`;

const ActionsCell = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
`;

const ActionBtn = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 7px;
    border: 1px solid transparent;
    background: transparent;
    color: ${p => p.$danger ? '#ef4444' : '#94a3b8'};
    cursor: pointer;
    transition: all 150ms;

    &:hover:not(:disabled) {
        background: ${p => p.$danger ? 'rgba(239,68,68,0.08)' : '#f1f5f9'};
        border-color: ${p => p.$danger ? 'rgba(239,68,68,0.2)' : '#e2e8f0'};
        color: ${p => p.$danger ? '#ef4444' : '#334155'};
    }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;
