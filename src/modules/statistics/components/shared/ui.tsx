// src/modules/statistics/components/shared/ui.tsx
// Wspólne komponenty prezentacyjne zakładek statystyk (Przychody / Koszty).
// Styl referencyjny: widok "Koszty".
import styled, { css } from 'styled-components';
import { st } from '../StatisticsTheme';
import { cardEntrance } from './animations';

// ─── Layout ───────────────────────────────────────────────────────────────────

export const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: ${p => p.theme.spacing.lg};
    max-width: 1800px;
    margin: 0 auto;
    width: 100%;
    @media (max-width: 639px) { padding: ${p => p.theme.spacing.md}; }
    @media (min-width: ${p => p.theme.breakpoints.md}) { padding: ${p => p.theme.spacing.xl}; }
    @media (min-width: ${p => p.theme.breakpoints.xl}) { padding: ${p => p.theme.spacing.xxl}; }
`;

export const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

export const SectionHeading = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

export const SectionTitle = styled.h2`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.7px;
`;

export const SectionRule = styled.div`
    flex: 1;
    height: 1px;
    background: ${st.border};
`;

const twoColGrid = css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    @media (max-width: ${p => p.theme.breakpoints.lg}) { grid-template-columns: 1fr; }
`;

export const TablesHeaderRow = styled.div`${twoColGrid} align-items: start;`;
export const TablesGrid = styled.div`${twoColGrid} align-items: start;`;

export const TableColumn = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
`;

export const TableColumnHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
`;

export const TableColumnTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const HdrBtns = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: 639px) {
        flex-wrap: wrap;
        width: 100%;
    }
`;

// ─── KPI tiles ────────────────────────────────────────────────────────────────

export const KpiRow = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    @media (max-width: 700px) { grid-template-columns: 1fr 1fr; }
`;

export const KpiCard = styled.div<{ $accent: string }>`
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 20px 20px 16px;
    border-top: 3px solid ${p => p.$accent};
    display: flex;
    flex-direction: column;
    gap: 6px;
    ${cardEntrance}

    /* Lekki efekt kaskady kolejnych kafli */
    &:nth-child(2) { animation-delay: 0.06s; }
    &:nth-child(3) { animation-delay: 0.12s; }
`;

export const KpiLabel = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

export const KpiValue = styled.div`
    font-size: ${st.fontXl};
    font-weight: 800;
    color: ${st.text};
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
`;

// ─── Chart cards ──────────────────────────────────────────────────────────────

export const ChartsRow = styled.div`
    display: grid;
    grid-template-columns: minmax(340px, 2fr) 3fr;
    gap: 16px;
    align-items: stretch;
    @media (max-width: 1100px) { grid-template-columns: 1fr; }
`;

export const ChartCard = styled.div`
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 20px;
    ${cardEntrance}
`;

export const ChartTitle = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 16px;
`;

export const ChartEmpty = styled.div`
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

export const Spinner = styled.div`
    display: inline-block;
    width: 22px;
    height: 22px;
    border: 2px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

export const LoadingOverlay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
`;

// ─── Error box ────────────────────────────────────────────────────────────────

export const ErrorBox = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px;
    background: ${st.accentRedDim};
    border: 1px solid ${st.accentRed}33;
    border-radius: ${st.radius};
    text-align: center;
`;

export const ErrorText = styled.p`
    margin: 0;
    color: ${st.accentRed};
    font-size: ${st.fontSm};
    font-weight: 500;
`;

export const RetryButton = styled.button`
    padding: 8px 20px;
    background: transparent;
    border: 1px solid ${st.accentBlue};
    color: ${st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { background: ${st.accentBlueDim}; }
`;

// ─── Categories table (left panel) ────────────────────────────────────────────

export const CatTable = styled.div`
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};
`;

export const CatRow = styled.div<{ $dragOver?: boolean; $selected?: boolean; $excluded?: boolean }>`
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border-bottom: 1px solid ${st.border};
    cursor: pointer;
    transition: background ${st.transition};
    position: relative;

    &:last-child { border-bottom: none; }
    &:hover { background: ${st.bg}; }

    /* Kategoria pomijana w statystykach — delikatnie wyszarzony wiersz
       (spany = kropka koloru, nazwa, kwota; akcje pozostają w pełni widoczne) */
    ${p => p.$excluded && css`
        background: ${st.bgCardAlt};
        > span { opacity: 0.55; }
    `}

    ${p => p.$selected && css`
        background: ${st.accentBlueDim} !important;
        box-shadow: inset 3px 0 0 ${st.accentBlue};
    `}

    ${p => p.$dragOver && css`
        background: ${st.accentBlueDim} !important;
        outline: 2px dashed ${st.accentBlue};
        outline-offset: -2px;
    `}
`;

export const CatDot = styled.span<{ $color: string }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${p => p.$color};
    box-shadow: 0 0 0 2px ${p => p.$color}22;
    flex-shrink: 0;
`;

export const CatName = styled.span`
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const CatMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

export const CatActions = styled.div`
    display: flex;
    gap: 3px;
    flex-shrink: 0;
`;

export const IconBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    background: transparent;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    color: ${st.textMuted};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { background: ${st.bg}; color: ${st.text}; border-color: ${st.borderHover}; }
    svg { width: 12px; height: 12px; }
`;

export const TableEmpty = styled.div`
    padding: 32px 16px;
    text-align: center;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

export const TableLoading = styled(TableEmpty)``;

// ─── Items table (right panel) ────────────────────────────────────────────────

export const ItemsTable = styled.div<{ $maxHeight?: string }>`
    background: #fff;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    overflow: hidden;
    box-shadow: ${st.shadowSm};

    /* Ograniczona wysokość + wewnętrzny scroll — lista kategorii po lewej
       pozostaje widoczna, więc drag&drop działa bez przewijania całej strony. */
    ${p => p.$maxHeight && css`
        max-height: ${p.$maxHeight};
        overflow-y: auto;
    `}
`;

export const ItemsHeader = styled.div`
    display: grid;
    grid-template-columns: 1fr auto auto auto auto;
    gap: 8px;
    padding: 8px 14px;
    background: ${st.bg};
    border-bottom: 1px solid ${st.border};
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: sticky;
    top: 0;
    z-index: 1;
`;

export const ItemRow = styled.div<{ $draggable?: boolean; $dimmed?: boolean }>`
    display: grid;
    grid-template-columns: 1fr auto auto auto auto;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid ${st.border};
    transition: background ${st.transition}, opacity 0.2s;
    cursor: ${p => p.$draggable ? 'grab' : 'default'};
    opacity: ${p => p.$dimmed ? 0.4 : 1};

    &:last-child { border-bottom: none; }
    &:hover { background: ${p => p.$draggable ? st.bg : 'transparent'}; }
    &:active { cursor: ${p => p.$draggable ? 'grabbing' : 'default'}; }
`;

export const ItemName = styled.span`
    display: block;
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const ItemMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

export const CatBadge = styled.span<{ $color?: string }>`
    display: inline-block;
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    background: ${p => p.$color ? `${p.$color}22` : st.accentBlueDim};
    color: ${p => p.$color ?? st.accentBlue};
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const KebabBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: ${st.radiusSm};
    color: ${st.textMuted};
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    transition: all ${st.transition};
    flex-shrink: 0;
    &:hover { background: ${st.bg}; border-color: ${st.border}; color: ${st.text}; }
`;

// ─── Filters / search ─────────────────────────────────────────────────────────

export const FilterBar = styled.div`
    display: flex;
    gap: 2px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    padding: 3px;
    flex-shrink: 0;
`;

export const FilterBtn = styled.button<{ $active: boolean }>`
    padding: 4px 10px;
    border: none;
    border-radius: ${st.radiusFull};
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    background: ${p => p.$active ? '#fff' : 'transparent'};
    color: ${p => p.$active ? st.text : st.textMuted};
    box-shadow: ${p => p.$active ? st.shadowXs : 'none'};
    &:hover { color: ${p => p.$active ? st.text : st.textSecondary}; }
`;

export const SearchInput = styled.input`
    flex: 1;
    min-width: 140px;
    padding: 6px 12px;
    background: ${st.bg};
    color: ${st.text};
    border: 1.5px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-family: inherit;
    font-size: ${st.fontSm};
    transition: border-color ${st.transition};
    &::placeholder { color: ${st.textMuted}; }
    &:focus { outline: none; border-color: ${st.accentBlue}; }
`;

export const ClearFilterBtn = styled.button`
    padding: 3px 10px;
    background: transparent;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 500;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover {
        color: ${st.text};
        border-color: ${st.borderHover};
        background: ${st.bg};
    }
`;

// ─── Buttons / hints ──────────────────────────────────────────────────────────

export const AddButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    background: ${st.accentBlue};
    color: #fff;
    border: none;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: ${st.shadowXs};
    transition: all ${st.transition};
    svg { width: 14px; height: 14px; }
    &:hover { background: #2563EB; box-shadow: ${st.shadowSm}; transform: translateY(-1px); }
    &:active { transform: translateY(0); }
`;

export const DragHint = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: ${st.accentAmberDim};
    border: 1px solid ${st.accentAmber}44;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;
