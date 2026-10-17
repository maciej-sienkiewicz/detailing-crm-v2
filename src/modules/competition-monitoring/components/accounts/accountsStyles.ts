import styled from 'styled-components';
import { ui } from '@/common/components/ui';

/**
 * Klocki zakładki „Moje konta". Kafle liczb leżą PŁASKO (obwódka, bez cienia):
 * wyniesiona jest tylko karta Instagrama, bo to ona jest tematem zakładki
 * (CLAUDE.md §2, wyniesienie niesie temat).
 */

export const Columns = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 20px;
    align-items: start;

    @media (max-width: 1100px) { grid-template-columns: minmax(0, 1fr); }
`;

export const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
`;

/** Nagłówek sekcji konta: kafelek ikony, nazwa, linia stanu pod spodem. */
export const AccountHead = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
`;

export const IconTile = styled.span<{ $tone?: 'brand' | 'google' }>`
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: ${p => p.$tone === 'google' ? ui.okTint : ui.brandTint};
    color: ${p => p.$tone === 'google' ? ui.okInk : ui.brandInk};

    svg { width: 20px; height: 20px; }
`;

export const HeadText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

export const HeadTitle = styled.h2`
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: ${ui.ink};
    overflow-wrap: anywhere;
`;

/** Atrybuty obok siebie z odstępem zamiast sklejania kropką (CLAUDE.md §4). */
export const Meta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 2px 12px;
    font-size: 12.5px;
    color: ${ui.textMuted};
    min-width: 0;
`;

export const CardBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 0 22px 22px;
    min-width: 0;

    @media (max-width: 640px) { padding: 0 16px 16px; }
`;

export const CardHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 20px 22px 18px;

    @media (max-width: 640px) { padding: 16px; }
`;

export const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

export const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
`;

export const KpiGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;

    @media (max-width: 760px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;

export const Kpi = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surface};
    min-width: 0;
`;

export const KpiLabel = styled.span`
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.textSecondary};
`;

export const KpiValue = styled.span`
    font-size: 22px;
    font-weight: 750;
    letter-spacing: -0.01em;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
`;

export const KpiSub = styled.span`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 12px;
    color: ${ui.textMuted};
`;

/** Zmiana do poprzednich 30 dni: odcień niesie kierunek, liczba stoi obok strzałki. */
export const Change = styled.span<{ $dir: 'up' | 'down' | 'flat' }>`
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${p => p.$dir === 'up' ? ui.okInk : p.$dir === 'down' ? ui.dangerInk : ui.textMuted};
`;

export const Chips = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

export const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
    line-height: 1.5;
`;

export const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const Row = styled.li`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    background: ${ui.surface};
    min-width: 0;
`;

export const RowText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;

    strong {
        font-size: 13.5px;
        font-weight: 650;
        color: ${ui.ink};
        overflow-wrap: anywhere;
    }
`;

export const Snippet = styled.span`
    font-size: 12.5px;
    color: ${ui.textSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const Loading = styled.div`
    padding: 24px 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;
