// src/modules/settings/components/services/ServicesTableRow.tsx
import styled from 'styled-components';
import { calculateGrossFromNet } from '@/modules/services/utils/priceCalculator';
import type { Service } from '@/modules/services/types';
import {
    SERVICES_TABLE_GRID,
    SERVICES_TABLE_GRID_WITH_STATUS,
    formatPLN,
    vatLabel,
} from './servicesTable.helpers';

/**
 * Jeden wiersz cennika: nazwa → cena → (status) → akcje.
 *
 * Zasada barwy w tej tabeli: KOLOR OZNACZA ODSTĘPSTWO. Stawka 23% i status „aktywna"
 * są przy niemal każdej pozycji, więc pokolorowane nie niosły informacji — malowały
 * całe kolumny i konkurowały z „Wyceną ręczną", która naprawdę coś mówi. Dlatego VAT
 * jest szarym dopiskiem przy cenie i barwi się dopiero, gdy jest inny niż podstawowy,
 * a status pojawia się tylko wtedy, gdy na liście są też wiersze archiwalne.
 */

/** Stawka podstawowa — wszystko inne jest na tej liście wyjątkiem i dlatego ma kolor. */
const DEFAULT_VAT_RATE = 23;

export interface ServicesTableRowProps {
    service: Service;
    /** Disables edit/archive while any form panel is open. */
    actionsDisabled: boolean;
    /** Kolumna statusu dochodzi dopiero, gdy lista pokazuje też archiwalne. */
    showStatus: boolean;
    onEdit: (service: Service) => void;
    onArchive: (service: Service) => void;
}

export function ServicesTableRow({
    service, actionsDisabled, showStatus, onEdit, onArchive,
}: ServicesTableRowProps) {
    return (
        <Row $withStatus={showStatus}>
            <ServiceNameCell service={service} />

            <ServicePriceCell service={service} />

            {showStatus && (
                <StatusCell>
                    {service.isActive
                        ? <StatusLabel>Aktywna</StatusLabel>
                        : <StatusLabel $archived>Archiwalna</StatusLabel>}
                </StatusCell>
            )}

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
    const vat = vatLabel(service.vatRate);
    const vatIsDefault = service.vatRate === DEFAULT_VAT_RATE;

    if (service.requireManualPrice) {
        return (
            <PriceCell>
                <ManualPrice>Wycena ręczna</ManualPrice>
                <PriceGross>cena ustalana przy zleceniu</PriceGross>
            </PriceCell>
        );
    }

    const priceGross =
        service.basePriceGross
        ?? calculateGrossFromNet(service.basePriceNet, service.vatRate).priceGross;

    return (
        <PriceCell>
            <PriceNet>{formatPLN(service.basePriceNet)}</PriceNet>
            <PriceGross>
                {formatPLN(priceGross)} brutto{' '}
                {vatIsDefault
                    ? <VatMuted>· {vat}</VatMuted>
                    : <VatOdd>· VAT {vat}</VatOdd>}
            </PriceGross>
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

const Row = styled.div<{ $withStatus: boolean }>`
    display: grid;
    grid-template-columns: ${p => (p.$withStatus ? SERVICES_TABLE_GRID_WITH_STATUS : SERVICES_TABLE_GRID)};
    gap: 8px;
    align-items: center;
    padding: 13px 20px;
    border-bottom: 1px solid #f1f5f9;
    transition: background 150ms;

    &:last-child { border-bottom: none; }
    &:hover { background: #fafbfc; }

    /* Na telefonie wiersz czyta się jako kafelka: nazwa w pierwszej linii,
       pod nią cena, a status i akcje w jednym rzędzie na dole. */
    @media (max-width: 900px) {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 6px 10px;
        padding: 12px 14px;
        align-items: start;

        > :nth-child(1) { grid-column: 1 / -1; grid-row: 1; }
        > :nth-child(2) { grid-column: 1 / -1; grid-row: 2; align-items: flex-start; text-align: left; }
        > :nth-child(3) { grid-column: 1; grid-row: 3; }
        > :nth-child(4) { grid-column: 2; grid-row: 3; justify-self: end; }
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

/* Ten sam błękit marki co reszta interfejsu. Wcześniej był tu drugi, ciemniejszy
   niebieski (#2563eb) — dwa odcienie znaczące co innego, nie do rozróżnienia z metra. */
const PackageBadge = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    font-size: 10px;
    font-weight: 700;
    background: rgba(14,165,233,0.1);
    color: #0369a1;
    border: 1px solid rgba(14,165,233,0.22);
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

const PriceCell = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    min-width: 0;
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

const VatMuted = styled.span`
    color: #94a3b8;
`;

/* Jedyne miejsce, w którym VAT dostaje barwę: stawka inna niż podstawowa. */
const VatOdd = styled.span`
    font-weight: 700;
    color: #b45309;
`;

const ManualPrice = styled.span`
    font-size: 13px;
    font-weight: 700;
    color: #b45309;
    white-space: nowrap;
`;

const StatusCell = styled.div`
    display: flex;
    align-items: center;
    padding-left: 14px;
`;

const StatusLabel = styled.span<{ $archived?: boolean }>`
    font-size: 11px;
    font-weight: 600;
    color: ${p => p.$archived ? '#94a3b8' : '#475569'};
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
    color: #94a3b8;
    cursor: pointer;
    transition: all 150ms;

    /* Czerwień pojawia się dopiero pod kursorem: w spoczynku ikona archiwizacji
       przy każdym wierszu malowała listę na czerwono bez powodu. */
    &:hover:not(:disabled) {
        background: ${p => p.$danger ? 'rgba(239,68,68,0.08)' : '#f1f5f9'};
        border-color: ${p => p.$danger ? 'rgba(239,68,68,0.2)' : '#e2e8f0'};
        color: ${p => p.$danger ? '#ef4444' : '#334155'};
    }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;
