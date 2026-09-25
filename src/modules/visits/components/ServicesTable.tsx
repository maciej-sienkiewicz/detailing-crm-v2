import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useServicePricing } from '@/modules/appointments/hooks/useServicePricing';
import { resolveBaseNet } from '@/common/utils/priceAdjustment';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import type { AdjustmentType, PriceAdjustment } from '@/common/utils/priceAdjustment';
import {
    bulkDiscountPlan, bulkVatEdits, buildServicesChangesPayload, editFromEditor, editorAdjustment,
    editorPrefill, editorPreview as previewEditor, formatZlField, grossFieldFor, netFieldFor, parseZlCents,
    previewSide, pricedLine, restoreListPrice, visitTotals, withEditedPrice,
} from '../utils/servicePriceEdits';
import type { EditedPrice } from '../utils/servicePriceEdits';
import { formatCurrency, shouldAutoFocusInput } from '@/common/utils';
import type { ServiceLineItem, VisitSettlement, VisitStatus } from '../types';
import { usePrintServicesList } from '../hooks/usePrintServicesList';
import type { ServicesChangesPayload } from '../types';
import { useApproveServiceChange, useRejectServiceChange, useSaveServicesChanges } from '../hooks';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ServiceInlineRow } from './ServiceInlineRow';
import type { NewRow } from './ServiceInlineRow';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import { LockedSection } from '@/common/components/LockedSection';
import { ServiceDiscountModal } from '@/common/components/ServiceDiscountModal';
import { ServiceChangeSmsModal } from './ServiceChangeSmsModal';
import type { ServiceChangeSummary } from '../utils/serviceChangeSms';
import { useFeature, UpsellModal } from '@/modules/subscription';
import { useContainerWidth, useModalViewport } from '@/common/hooks';
import {
    ActionMenu, Button, Card, IconButton, MenuItem, PriceButton, PriceSub, SectionTitle, StatusPill, SummaryStrip,
    ui, useActionMenu,
} from '@/common/components/ui';
import {
    Check, ChevronRight, Clock, MoreHorizontal, MoreVertical, Pencil, Percent, Plus, Printer, ReceiptText, Trash2, Undo2,
} from 'lucide-react';
import { useHideMobileChrome } from '@/common/context/MobileChromeContext';

// Jeden niebieski marki dla całego widoku wizyty - patrz common/components/ui/tokens.
const BRAND = ui.brand;
const BRAND_DARK = ui.brandStrong;
const BRAND_DIM = 'rgba(14, 165, 233, 0.10)';

const pendingPulse = keyframes`
    0%   { background-color: rgba(245,158,11,0.04); }
    50%  { background-color: rgba(245,158,11,0.18); }
    100% { background-color: rgba(245,158,11,0.04); }
`;

const EditorVatSelect = styled.select`
    width: 100%;
    box-sizing: border-box;
    padding: 8px 6px;
    border: 1.5px solid ${st.border};
    border-radius: 9px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    color: ${st.text};
    background: ${st.bgCard};
    outline: none;
    text-align: center;
    cursor: pointer;
    appearance: none;
    transition: border-color 180ms, box-shadow 180ms;

    &:focus {
        border-color: ${BRAND};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

/* ─── Confirm modal ─── */

/**
 * Shared geometry for every dialog this file owns.
 *
 * `100dvh` (not `inset: 0`) so the box is sized against the viewport that is
 * actually visible on a phone: with `inset: 0` alone the bottom of a centred
 * dialog sits under Safari's address bar and its buttons become unreachable.
 * z-index sits above the visit view's mobile tab bar (1000), which is portalled
 * to <body> after #root and would otherwise paint over these overlays.
 */
const dialogOverlay = css`
    position: fixed;
    inset: 0;
    height: 100vh;
    height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding:
        max(16px, env(safe-area-inset-top, 0px))
        max(16px, env(safe-area-inset-right, 0px))
        max(16px, env(safe-area-inset-bottom, 0px))
        max(16px, env(safe-area-inset-left, 0px));
    z-index: 9999;

    @media (max-height: 480px) {
        padding-top: max(8px, env(safe-area-inset-top, 0px));
        padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
    }
`;

const ModalOverlay = styled.div`
    ${dialogOverlay}
    background: ${st.bgOverlay};
    backdrop-filter: blur(2px);
`;

const ModalCard = styled.div`
    width: 100%;
    max-width: 440px;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 16px;
    box-shadow: ${st.shadowLg};
    overflow: hidden;

    @media (max-width: 480px) {
        border-radius: 14px;
    }
`;

const ModalHeader = styled.div`
    padding: 20px 24px;
    border-bottom: 1px solid ${st.border};
    flex-shrink: 0;

    @media (max-width: 480px) { padding: 16px 18px; }
`;

const ModalTitle = styled.h4`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const ModalBody = styled.div`
    padding: 20px 24px;
    color: ${st.textSecondary};
    font-size: ${st.fontSm};
    line-height: 1.6;
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;
    overflow-wrap: anywhere;

    @media (max-width: 480px) { padding: 16px 18px; }
`;

const ModalFooter = styled.div`
    padding: 14px 20px;
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
    background: ${st.bg};
    border-top: 1px solid ${st.border};
    flex-shrink: 0;

    @media (max-width: 480px) {
        padding: 12px 14px;
        > button { flex: 1; min-width: 0; white-space: normal; }
    }
`;

const SecondaryBtn = styled.button`
    padding: 7px 14px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    font-size: ${st.fontSm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { background: ${st.bg}; border-color: ${st.borderHover}; }
`;

const PrimaryBtn = styled.button<{ $danger?: boolean }>`
    padding: 7px 14px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${props => props.$danger ? `${st.accentRed}44` : 'rgba(14,165,233,0.3)'};
    background: ${props => props.$danger ? st.accentRedDim : BRAND_DIM};
    color: ${props => props.$danger ? st.accentRed : BRAND_DARK};
    font-size: ${st.fontSm};
    font-weight: 700;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover:not(:disabled) {
        background: ${props => props.$danger ? '#fee2e2' : 'rgba(14,165,233,0.18)'};
        transform: translateY(-1px);
    }

    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/* Status shown only by exception: pending states */

/* ─── Karta „Usługi" ─────────────────────────────────────────────────────────
 *
 * Jedyna wyniesiona powierzchnia w kolumnie treści wizyty (CLAUDE.md §2,
 * „wyniesienie"): wszystko inne - produkty, zdjęcia, komunikacja - leży płasko.
 * Kwota do zapłaty stoi na GÓRZE karty jako pasek podsumowania (ten sam co w
 * zleceniach zbiorczych), a nie 22px na dole pod tabelą: przy kilku pozycjach
 * i pakietach trzeba było przewinąć cały wykaz, żeby zobaczyć sumę.
 *
 * Tabela albo lista zależy od szerokości KARTY, nie okna.
 */

/** Od tej szerokości karty usługi są tabelą, poniżej listą jak na telefonie. */
const TABLE_MIN_WIDTH = 560;

const ServicesCard = styled(Card)`
    display: flex;
    flex-direction: column;
`;

const CardHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 22px 0;

    @media (max-width: 640px) { padding: 14px 16px 0; }
`;

const Strip = styled(SummaryStrip)`
    margin: 14px 22px 0;

    @media (max-width: 640px) { margin: 10px 16px 0; }
`;

const Grid = styled.table`
    width: 100%;
    margin-top: 14px;
    border-collapse: collapse;
    table-layout: fixed;
`;

const Th = styled.th<{ $right?: boolean }>`
    padding: 10px 12px;
    text-align: ${p => p.$right ? 'right' : 'left'};
    font-size: 12px;
    font-weight: 600;
    color: ${ui.textMuted};
    background: ${ui.surfaceSoft};
    border-top: 1px solid ${ui.lineSoft};
    border-bottom: 1px solid ${ui.lineSoft};
    white-space: nowrap;

    &:first-child { padding-left: 22px; }
    &:last-child { padding-right: 22px; }
`;

type RowTone = 'ADD' | 'EDIT' | 'DELETE' | null;

const Row = styled.tr<{ $tone: RowTone; $highlight?: boolean; $struck?: boolean }>`
    border-bottom: 1px solid ${ui.lineFaint};
    background: ${p => p.$tone === 'DELETE' ? 'rgba(239, 68, 68, 0.04)'
        : p.$tone === 'EDIT' ? 'rgba(245, 158, 11, 0.04)'
        : p.$tone === 'ADD' ? 'rgba(16, 185, 129, 0.04)'
        : ui.surface};
    /* Stan wyjątkowy dostaje cienki pasek przy lewej krawędzi. */
    box-shadow: ${p => p.$tone === 'DELETE' ? 'inset 3px 0 0 #ef4444'
        : p.$tone === 'EDIT' ? 'inset 3px 0 0 #f59e0b'
        : p.$tone === 'ADD' ? 'inset 3px 0 0 #10b981'
        : 'none'};
    opacity: ${p => p.$struck ? 0.55 : 1};
    transition: background 150ms ease;
    ${p => p.$highlight && css`animation: ${pendingPulse} 0.9s ease-in-out 4;`}

    &:hover { background: ${p => p.$tone ? undefined : ui.surfaceSoft}; }
`;

const Td = styled.td<{ $right?: boolean }>`
    padding: 12px;
    vertical-align: middle;
    text-align: ${p => p.$right ? 'right' : 'left'};
    font-size: 13px;
    color: ${ui.textSecondary};
    min-width: 0;

    &:first-child { padding-left: 22px; }
    &:last-child { padding-right: 22px; }
`;

const NameCell = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    min-width: 0;
`;

const ServiceName = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
    /* Nazwy usług to wolny tekst i bywają jednym długim słowem. */
    overflow-wrap: anywhere;
`;

const Pills = styled.span`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const ServiceNote = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
    overflow-wrap: anywhere;
`;

const PackageItems = styled.ul`
    margin: 2px 0 0;
    padding: 0 0 0 14px;
    font-size: 12.5px;
    color: ${ui.textSecondary};

    li::marker { color: ${ui.textFaint}; }
`;

const Trend = styled.span<{ $trend: 'up' | 'down' | 'neutral' }>`
    font-size: 11px;
    font-weight: 700;
    color: ${p => p.$trend === 'up' ? ui.dangerInk : p.$trend === 'down' ? ui.okInk : ui.textMuted};
`;

const EmptyServices = styled.p`
    margin: 14px 22px 4px;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

/* ── Telefon: lista, pozycja to jeden duży przycisk ── */

const MobileList = styled.ul`
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
`;

const MobileItem = styled.li<{ $tone: RowTone; $highlight?: boolean; $struck?: boolean }>`
    border-top: 1px solid ${ui.lineFaint};
    box-shadow: ${p => p.$tone === 'DELETE' ? 'inset 3px 0 0 #ef4444'
        : p.$tone === 'EDIT' ? 'inset 3px 0 0 #f59e0b'
        : p.$tone === 'ADD' ? 'inset 3px 0 0 #10b981'
        : 'none'};
    opacity: ${p => p.$struck ? 0.55 : 1};
    ${p => p.$highlight && css`animation: ${pendingPulse} 0.9s ease-in-out 4;`}
`;

/* Strzałka mówi „to się otwiera" - na dotyku nie ma najechania, które by to zdradziło. */
const MobileRow = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 60px;
    padding: 10px 12px 10px 16px;
    border: none;
    background: transparent;
    font-family: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    &:active { background: ${ui.surfaceSoft}; }
    &:disabled { cursor: default; }
    > svg { width: 16px; height: 16px; flex-shrink: 0; color: ${ui.textFaint}; }
`;

const MobileText = styled.span`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;

    ${ServiceName} { font-size: 14.5px; }
`;

const MobileAmounts = styled.span`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    flex-shrink: 0;
`;

const MobileGross = styled.span`
    font-size: 14.5px;
    font-weight: 700;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const MobileSub = styled.span<{ $ok?: boolean }>`
    font-size: 12px;
    color: ${p => p.$ok ? ui.okInk : ui.textMuted};
    white-space: nowrap;
`;

/* Nowe wiersze w trakcie edycji to <tr> - na telefonie stoją pod listą w tabeli blokowej. */
const DraftTable = styled.table`
    width: 100%;
    border-collapse: collapse;

    @media (max-width: 767px) { display: block; tbody { display: block; } }
`;

/* ─── Discount / editor modal shared styles ─── */

const DiscountModalOverlay = styled.div`
    ${dialogOverlay}
    background: ${st.bgOverlay};
    backdrop-filter: blur(2px);
`;

const DiscountModalCard = styled.div`
    width: 100%;
    max-width: 440px;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    overflow: hidden;
    box-shadow: ${st.shadowLg};
`;

const DiscountModalHeader = styled.div`
    padding: 18px 22px 14px;
    border-bottom: 1px solid ${st.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
    min-width: 0;

    @media (max-width: 480px) { padding: 15px 16px 12px; }
`;

const DiscountModalTitle = styled.h4`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    letter-spacing: -0.2px;
    color: ${st.text};
`;

const DiscountModalSubtitle = styled.p`
    margin: 3px 0 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    /* Was a hard 320px, but on a 360px phone that alone overflowed the card. */
    max-width: 100%;
`;

const DiscountModalBody = styled.div`
    padding: 18px 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;

    @media (max-width: 480px) { padding: 15px 16px; gap: 14px; }
`;

const DiscountModalFooter = styled.div`
    padding: 14px 22px;
    background: ${st.bg};
    border-top: 1px solid ${st.border};
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: 480px) {
        padding: 12px 14px;
        > button { flex: 1 1 auto; min-width: 0; white-space: normal; }
    }
`;

const DiscountFromBox = styled.div`
    padding: 12px 16px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

const DiscountFromBoxLabel = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
`;

const DiscountFromPrices = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
`;

const DiscountFromPrice = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;

    &:first-child {
        padding-right: 8px;
        border-right: 1px solid ${st.border};
    }
`;

const DiscountFromPriceValue = styled.span`
    font-size: ${st.fontLg};
    font-weight: 700;
    letter-spacing: -0.2px;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;

const DiscountFromPriceLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const DiscountSectionLabel = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 8px;
`;

const DiscountTypeRow = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

const DiscountTypePill = styled.button<{ $selected?: boolean }>`
    padding: 6px 12px;
    font-size: 12px;
    font-weight: ${p => p.$selected ? 700 : 600};
    color: ${p => p.$selected ? '#ffffff' : st.textSecondary};
    background: ${p => p.$selected ? BRAND : st.bgCard};
    border: 1.5px solid ${p => p.$selected ? BRAND : st.border};
    border-radius: ${st.radiusFull};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    font-family: inherit;
    box-shadow: ${p => p.$selected ? '0 2px 8px rgba(14, 165, 233, 0.28)' : 'none'};

    &:hover {
        ${p => !p.$selected && css`
            border-color: ${BRAND};
            color: ${BRAND_DARK};
            background: ${BRAND_DIM};
        `}
    }
`;

const DiscountValueRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 4px 3px 16px;
    background: ${st.bgCard};
    border: 1.5px solid ${st.border};
    border-radius: ${st.radiusSm};
    transition: all ${st.transition};

    &:focus-within {
        border-color: ${BRAND};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14);
    }
`;

const DiscountValueInput = styled.input<{ $compact?: boolean }>`
    flex: 1;
    width: 100%;
    min-width: 0;
    padding: ${p => p.$compact ? '6px 0' : '9px 0'};
    /* Doubled selector so the global touch-device 16px floor does not shrink
       this deliberately oversized amount field. Never goes below 16px, or iOS
       zooms the page on focus and never zooms back. */
    && { font-size: ${p => p.$compact ? '16px' : '20px'}; }
    font-weight: 700;
    text-align: left;
    background: transparent;
    border: none;
    color: ${st.text};
    outline: none;
    font-family: inherit;
    font-variant-numeric: tabular-nums;
    &::placeholder { color: ${st.textMuted}; font-weight: 600; }
`;

const DiscountValueSuffix = styled.span`
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 700;
    color: ${BRAND_DARK};
    background: ${BRAND_DIM};
    border-radius: ${st.radiusFull};
    padding: 5px 11px;
`;

const DiscountCloseBtn = styled.button`
    flex-shrink: 0;
    padding: 5px;
    color: ${st.textMuted};
    background: none;
    border: none;
    border-radius: ${st.radiusFull};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all ${st.transition};
    &:hover { color: ${st.accentRed}; background: ${st.accentRedDim}; }
    svg { width: 14px; height: 14px; }
`;

const DiscountApplyBtn = styled.button`
    padding: 9px 20px;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: #ffffff;
    background: ${BRAND};
    border: none;
    border-radius: ${st.radiusFull};
    cursor: pointer;
    font-family: inherit;
    transition: all ${st.transition};
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);

    &:hover:not(:disabled) {
        background: ${BRAND_DARK};
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.36);
        transform: translateY(-1px);
    }
    &:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
`;

const DiscountCancelBtn = styled.button`
    padding: 9px 18px;
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.textSecondary};
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    cursor: pointer;
    font-family: inherit;
    transition: all ${st.transition};
    &:hover { background: ${st.bg}; border-color: ${st.borderHover}; }
`;

const DiscountRemoveBtn = styled.button`
    padding: 9px 16px;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    background: transparent;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    cursor: pointer;
    font-family: inherit;
    margin-right: auto;
    transition: all ${st.transition};
    &:hover { color: ${st.accentRed}; border-color: #fca5a5; background: ${st.accentRedDim}; }
`;

/* ─── Unified price editor ─── */

const EditorGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 84px;
    gap: 10px;

    /* Netto / brutto stay paired; the VAT chip drops to its own row rather than
       squeezing both price fields into ~70px. */
    @media (max-width: 400px) {
        grid-template-columns: 1fr 1fr;
        > *:last-child { grid-column: 1 / -1; }
    }
`;

const EditorField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const EditorFieldLabel = styled.label`
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const EditorPriceInput = styled.input`
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border: 1.5px solid ${st.border};
    border-radius: 9px;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    color: ${st.text};
    background: ${st.bgCard};
    outline: none;
    text-align: right;
    font-variant-numeric: tabular-nums;
    transition: border-color 180ms, box-shadow 180ms;

    &:focus {
        border-color: ${BRAND};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

const EditorPreview = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

const EditorPreviewLine = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-variant-numeric: tabular-nums;
    flex-wrap: wrap;
`;

const EditorPreviewLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const EditorPreviewOld = styled.span`
    font-size: 11px;
    font-weight: 500;
    color: ${st.textMuted};
    text-decoration: line-through;
    font-variant-numeric: tabular-nums;
`;

const EditorModeRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 4px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

const EditorModeTab = styled.button<{ $active?: boolean }>`
    padding: 9px 10px;
    font-size: 13px;
    font-weight: ${p => p.$active ? 700 : 500};
    font-family: inherit;
    color: ${p => p.$active ? BRAND_DARK : st.textMuted};
    background: ${p => p.$active ? st.bgCard : 'transparent'};
    border: 1.5px solid ${p => p.$active ? BRAND : 'transparent'};
    border-radius: ${st.radiusSm};
    cursor: pointer;
    transition: all 140ms ease;

    &:hover { color: ${BRAND_DARK}; }
`;

const EditorListBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 14px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

const EditorListLabel = styled.span`
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

/* Netto → brutto → VAT: ta sama kolejność kolumn co w polach edycji ceny,
   dzięki czemu cennik, formularz i podsumowanie czyta się w jednej linii. */
const EditorSummaryGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 84px;
    gap: 10px;

    @media (max-width: 400px) {
        grid-template-columns: 1fr 1fr;
        > *:last-child { grid-column: 1 / -1; }
    }
`;

const EditorSummaryCell = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const EditorSummaryLabel = styled.span`
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const EditorSummaryValue = styled.span<{ $strong?: boolean }>`
    font-size: ${p => p.$strong ? '17px' : '14px'};
    font-weight: ${p => p.$strong ? 800 : 600};
    color: ${p => p.$strong ? BRAND_DARK : st.textSecondary};
    letter-spacing: ${p => p.$strong ? '-0.3px' : 'normal'};
    font-variant-numeric: tabular-nums;
    line-height: 1.25;
`;

/* Pole wartości rabatu ma wyglądać i mierzyć dokładnie tyle, co pola ceny. */
const EditorInputWrap = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1.5px solid ${st.border};
    border-radius: 9px;
    background: ${st.bgCard};
    transition: border-color 180ms, box-shadow 180ms;

    &:focus-within {
        border-color: ${BRAND};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

const EditorBareInput = styled.input`
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    outline: none;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    color: ${st.text};
    text-align: right;
    font-variant-numeric: tabular-nums;

    &::placeholder { color: ${st.textMuted}; font-weight: 500; }
`;

const EditorUnit = styled.span`
    flex-shrink: 0;
    min-width: 16px;
    font-size: 13px;
    font-weight: 700;
    color: ${st.textSecondary};
`;

const EditorNarrowField = styled(EditorField)`
    max-width: 220px;
`;

const EditorSavedChip = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: ${st.accentGreen};
    background: ${st.accentGreenDim};
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-radius: ${st.radiusFull};
    padding: 3px 9px;
    white-space: nowrap;
    flex-shrink: 0;
`;

/* ─── Bulk-discount "wide" modal with live preview ─── */

const BulkModalCard = styled.div`
    width: 100%;
    max-width: 940px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusLg};
    overflow: hidden;
    box-shadow: ${st.shadowLg};
    display: flex;
    flex-direction: column;
    max-height: 100%;
`;

const BulkModalHeader = styled.div`
    padding: 18px 22px 14px;
    border-bottom: 1px solid ${st.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
    flex-shrink: 0;

    @media (max-width: 480px) { padding: 15px 16px 12px; }
`;

const BulkModalLayout = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
    min-height: 0;
    flex: 1;

    @media (max-width: 768px) {
        grid-template-columns: minmax(0, 1fr);
        overflow-y: auto;
        overscroll-behavior: contain;
    }
`;

const BulkControlsPanel = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
    border-right: 1px solid ${st.border};
    overflow-y: auto;

    @media (max-width: 768px) {
        border-right: none;
        border-bottom: 1px solid ${st.border};
        overflow-y: visible;
    }

    @media (max-width: 480px) { padding: 16px; gap: 14px; }
`;

const BulkPreviewPanel = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: ${st.bg};
    overflow: hidden;
`;

const BulkPreviewHeader = styled.div`
    padding: 14px 20px;
    border-bottom: 1px solid ${st.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-shrink: 0;
`;

const BulkPreviewHeaderMain = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
`;

const BulkPreviewHeaderIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: ${st.radiusSm};
    background: ${BRAND_DIM};
    color: ${BRAND_DARK};
    svg { width: 14px; height: 14px; }
`;

const BulkPreviewHeaderText = styled.div`
    min-width: 0;
`;

const BulkPreviewHeaderLabel = styled.div`
    font-size: ${st.fontSm};
    font-weight: 700;
    letter-spacing: -0.1px;
    color: ${st.text};
`;

const BulkPreviewHeaderCaption = styled.div`
    font-size: 11px;
    color: ${st.textMuted};
    margin-top: 1px;
`;

const BulkPreviewList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    &::-webkit-scrollbar { width: 5px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: ${st.border}; border-radius: 99px; }
`;

const BulkPreviewCard = styled.div<{ $active: boolean }>`
    background: ${st.bgCard};
    border: 1px solid ${p => p.$active ? 'rgba(14, 165, 233, 0.35)' : st.border};
    border-radius: ${st.radiusSm};
    padding: 10px 14px;
    transition: border-color 200ms ease, box-shadow 200ms ease;
    box-shadow: ${p => p.$active ? '0 1px 6px rgba(14, 165, 233, 0.10)' : st.shadowXs};
`;

const BulkPreviewCardTop = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
`;

const BulkPreviewRowName = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const BulkPreviewPriceGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
`;

const BulkPreviewPriceCol = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;

    &:last-child {
        padding-left: 14px;
        border-left: 1px solid ${st.border};
    }
`;

const BulkPreviewPriceColLabel = styled.span`
    font-size: 9px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.07em;
`;

const BulkPreviewRowPrices = styled.div`
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
`;

const BulkPreviewOriginalPrice = styled.span<{ $strikethrough: boolean }>`
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: ${p => p.$strikethrough ? st.textMuted : st.text};
    font-weight: ${p => p.$strikethrough ? 400 : 600};
    text-decoration: ${p => p.$strikethrough ? 'line-through' : 'none'};
    transition: color 200ms ease;
    white-space: nowrap;
`;

const BulkPreviewArrow = styled.span<{ $active: boolean }>`
    font-size: 10px;
    color: ${p => p.$active ? BRAND : st.border};
    transition: color 200ms ease;
    flex-shrink: 0;
`;

const BulkPreviewNewPrice = styled.span<{ $active: boolean; $primary?: boolean }>`
    font-size: ${p => p.$primary ? '14px' : '12px'};
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: ${p => p.$active ? BRAND_DARK : st.text};
    transition: color 200ms ease;
    white-space: nowrap;
`;

const BulkPreviewDiscountChip = styled.span<{ $visible: boolean }>`
    font-size: 10px;
    font-weight: 700;
    color: ${BRAND_DARK};
    background: ${BRAND_DIM};
    border: 1px solid rgba(14, 165, 233, 0.25);
    border-radius: ${st.radiusFull};
    padding: 2px 8px;
    white-space: nowrap;
    flex-shrink: 0;
    opacity: ${p => p.$visible ? 1 : 0};
    transform: scale(${p => p.$visible ? 1 : 0.85});
    transition: opacity 200ms ease, transform 200ms ease;
`;

const BulkPreviewTotalsBar = styled.div`
    border-top: 1px solid ${st.border};
    padding: 12px 20px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    background: ${st.bgCard};
    flex-shrink: 0;
`;

const BulkPreviewTotalsRow = styled.div<{ $secondary?: boolean }>`
    display: flex;
    align-items: center;
    gap: 9px;
    opacity: ${p => p.$secondary ? 0.75 : 1};
`;

const BulkPreviewTotalsLabel = styled.div<{ $secondary?: boolean }>`
    font-size: ${p => p.$secondary ? '10px' : st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex: 1;
`;

const BulkPreviewTotalsBefore = styled.span<{ $secondary?: boolean }>`
    font-size: ${p => p.$secondary ? '11px' : st.fontSm};
    font-variant-numeric: tabular-nums;
    color: ${st.textMuted};
    text-decoration: line-through;
    font-weight: 400;
`;

const BulkPreviewTotalsArrow = styled.span`
    font-size: 11px;
    color: ${BRAND};
`;

const BulkPreviewTotalsAfter = styled.span<{ $active?: boolean; $secondary?: boolean }>`
    font-size: ${p => p.$secondary ? '12px' : st.fontLg};
    font-weight: 700;
    letter-spacing: -0.2px;
    font-variant-numeric: tabular-nums;
    color: ${p => p.$active ? BRAND_DARK : (p.$secondary ? st.textSecondary : st.text)};
`;

const BulkPreviewTotalsSaved = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: ${st.accentGreen};
    background: ${st.accentGreenDim};
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-radius: ${st.radiusFull};
    padding: 3px 9px;
`;

const BulkPreviewEmptyState = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 24px 16px;
    color: ${st.textMuted};
`;

const BulkPreviewEmptyIcon = styled.div`
    font-size: 28px;
    opacity: 0.5;
`;

const BulkPreviewEmptyText = styled.div`
    font-size: ${st.fontSm};
    text-align: center;
    line-height: 1.5;
`;

const BulkModalFooter = styled.div`
    padding: 14px 22px;
    background: ${st.bg};
    border-top: 1px solid ${st.border};
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: 480px) {
        padding: 12px 14px;
        > button { flex: 1 1 auto; min-width: 0; white-space: normal; }
    }
`;

const DISCOUNT_TYPES: { type: AdjustmentType; label: string }[] = [
    { type: 'PERCENT', label: '%' },
    { type: 'FIXED_NET', label: '−Netto' },
    { type: 'FIXED_GROSS', label: '−Brutto' },
    { type: 'SET_NET', label: '=Netto' },
    { type: 'SET_GROSS', label: '=Brutto' },
];

/* Editor uses only the true discount types; setting a price is done via the price fields */
const EDITOR_DISCOUNT_TYPES: { type: AdjustmentType; label: string }[] = [
    { type: 'PERCENT', label: 'Procent' },
    { type: 'FIXED_NET', label: 'Kwota netto' },
    { type: 'FIXED_GROSS', label: 'Kwota brutto' },
];

const MAX_2_DECIMALS = /^\d*[.,]?\d{0,2}$/;

/* ─── Focus-mode overlay (shown while adding a new service row) ─── */

const discardBtnAttention = keyframes`
    0%, 100% { transform: scale(1);    box-shadow: none; }
    35%       { transform: scale(1.07); box-shadow: 0 0 0 4px rgba(100, 116, 139, 0.38); }
    65%       { transform: scale(1.03); box-shadow: 0 0 0 2px rgba(100, 116, 139, 0.2); }
`;

const acceptBtnAttention = keyframes`
    0%, 100% { transform: scale(1);    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28); }
    35%       { transform: scale(1.09); box-shadow: 0 0 0 5px rgba(14, 165, 233, 0.5), 0 4px 24px rgba(14, 165, 233, 0.45); }
    65%       { transform: scale(1.04); box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.3), 0 2px 14px rgba(14, 165, 233, 0.3); }
`;

const FocusWrapper = styled.div<{ $active?: boolean }>`
    position: relative;
    z-index: ${p => p.$active ? 1051 : 'auto'};
    border-radius: ${p => p.$active ? '12px' : '0'};
    box-shadow: ${p => p.$active
        ? `0 0 0 3px rgba(14,165,233,.55), 0 0 18px 9px rgba(14,165,233,.18), 0 0 52px 26px rgba(14,165,233,.05), 0 0 0 9999px rgba(15,23,42,.52)`
        : `0 0 0 0 rgba(14,165,233,0), 0 0 0 0 rgba(14,165,233,0), 0 0 0 0 rgba(14,165,233,0), 0 0 0 0 rgba(15,23,42,0)`
    };
    transition: box-shadow 350ms ease, border-radius 300ms ease;
`;

const DraftBar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    background: rgba(14, 165, 233, 0.05);
    border-top: 1px solid rgba(14, 165, 233, 0.18);

    @media (max-width: 767px) {
        flex-direction: column;
        align-items: flex-start;
        /* Miejsce po schowanych paskach nawigacji zajmuje przypięty pasek akcji,
           więc karta nie potrzebuje własnego zapasu na dole. */
        padding-bottom: 12px;
    }
`;

const DraftBarCheckboxes = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px;
`;

const DraftBarLabel = styled.label<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${st.fontSm};
    color: ${p => p.$disabled ? st.textMuted : st.textSecondary};
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    user-select: none;
    opacity: ${p => p.$disabled ? 0.5 : 1};
    transition: opacity 150ms, color 150ms;

    input[type='checkbox'] {
        width: 14px;
        height: 14px;
        accent-color: ${BRAND};
        cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    }
`;

/**
 * Na telefonie przyciski decyzji są przypięte do dolnej krawędzi ekranu: to
 * jedyne wyjście z trybu edycji, więc nie mogą wymagać scrollowania. Oba dolne
 * paski nawigacji chowają się na ten czas (useHideMobileChrome), więc pasek nie
 * konkuruje z niczym o tę krawędź.
 */
const DraftBarActions = styled.div`
    display: flex;
    gap: 8px;
    flex-shrink: 0;

    @media (max-width: 767px) {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1200;
        width: auto;
        gap: 10px;
        padding: 10px max(14px, env(safe-area-inset-left, 0px))
            calc(10px + env(safe-area-inset-bottom, 0px))
            max(14px, env(safe-area-inset-right, 0px));
        background: ${st.bgCard};
        border-top: 1px solid rgba(14, 165, 233, 0.25);
        box-shadow: 0 -6px 20px rgba(15, 23, 42, 0.12);
    }
`;

const DraftBarSmsWrap = styled.div`
    flex: 1;
    min-width: 0;

    @media (max-width: 767px) {
        width: 100%;
    }
`;

const DiscardBtn = styled.button<{ $highlighting?: boolean }>`
    padding: 7px 14px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    font-size: ${st.fontSm};
    font-weight: 500;
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { background: ${st.bg}; border-color: ${st.borderHover}; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
    ${p => p.$highlighting && css`animation: ${discardBtnAttention} 550ms ease;`}

    @media (max-width: 767px) {
        flex: 1;
        padding: 12px 14px;
        font-size: 14px;
        min-height: 46px;
    }
`;

const AcceptBtn = styled.button<{ $highlighting?: boolean }>`
    padding: 7px 16px;
    border-radius: ${st.radiusFull};
    border: none;
    background: ${BRAND};
    color: white;
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);

    &:hover:not(:disabled) {
        background: ${BRAND_DARK};
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.36);
        transform: translateY(-1px);
    }

    &:disabled { opacity: 0.45; cursor: not-allowed; }
    ${p => p.$highlighting && css`animation: ${acceptBtnAttention} 550ms ease;`}

    @media (max-width: 767px) {
        flex: 1;
        padding: 12px 14px;
        font-size: 14px;
        min-height: 46px;
    }
`;

interface ServicesTableProps {
    services: ServiceLineItem[];
    visitStatus?: VisitStatus;
    visitId?: string;
    highlightPending?: boolean;
    /** Czym wizytę rozliczono; brak = nierozliczona. */
    settlement?: VisitSettlement | null;
}

const SETTLEMENT_LABEL: Record<NonNullable<VisitSettlement['documentType']>, string> = {
    INVOICE: 'Rozliczona fakturą',
    RECEIPT: 'Rozliczona paragonem',
    OTHER: 'Rozliczona',
};

/** 1 usługa, 2 usługi, 5 usług, 22 usługi. */
function servicesWord(n: number): string {
    if (n === 1) return 'usługa';
    const tens = n % 100;
    const units = n % 10;
    return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? 'usługi' : 'usług';
}

/** Zmiana czeka na zgodę klienta (SMS z prośbą o potwierdzenie) - pełnym zdaniem, nie „OCZEKUJE". */
function pendingLabel(op: ServiceLineItem['pendingOperation']): string {
    if (op === 'ADD') return 'Nowa, czeka na zgodę klienta';
    if (op === 'DELETE') return 'Usunięcie czeka na zgodę klienta';
    if (op === 'EDIT') return 'Zmiana czeka na zgodę klienta';
    return 'Czeka na zgodę klienta';
}

/** „Rabat 10%" zamiast gołego „-10%"; kwotowe i ręczne ceny mają już pełną etykietę. */
function discountPillLabel(adjustment: PriceAdjustment, label: string): string {
    if (adjustment.type === 'PERCENT') {
        const v = Math.abs(adjustment.value);
        return adjustment.value < 0 ? `Rabat ${v}%` : `Narzut ${v}%`;
    }
    return label;
}

const HEADER_MENU = '__header__';

export const ServicesTable = ({ services, visitStatus, visitId, highlightPending, settlement }: ServicesTableProps) => {
    const { calculateServicePrice } = useServicePricing();
    const { print: printServicesList, isPrinting } = usePrintServicesList();
    const { saveServicesChanges, isSaving } = useSaveServicesChanges(visitId ?? '');
    const smsFeature = useFeature('SMS_EMAIL');
    const [upsellOpen, setUpsellOpen] = useState(false);

    /* ── Row / header menus ── */
    const menu = useActionMenu<ServiceLineItem | null>();
    const [cardRef, cardWidth] = useContainerWidth<HTMLElement>();
    const asList = cardWidth === null ? window.innerWidth < 768 : cardWidth < TABLE_MIN_WIDTH;
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<null | 'approve' | 'reject'>(null);
    const [targetService, setTargetService] = useState<ServiceLineItem | null>(null);

    /* ── Draft state ── */
    const [newRows, setNewRows] = useState<NewRow[]>([]);

    /* ── Focus-mode button highlight ── */
    const [isHighlighting, setIsHighlighting] = useState(false);
    const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Okna na własnych nakładkach: blokada przewijania tła i układ przy
    // wysuniętej klawiaturze idą przez useModalViewport, tak samo jak
    // w ModalShell. Escape obsługuje wspólny handler niżej, więc hook nie
    // dostaje onClose.
    const editorOverlayRef = useRef<HTMLDivElement>(null);
    const bulkVatOverlayRef = useRef<HTMLDivElement>(null);
    const bulkDiscountOverlayRef = useRef<HTMLDivElement>(null);
    const bulkConflictOverlayRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerHighlight = useCallback(() => {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setIsHighlighting(false);
        requestAnimationFrame(() => {
            setIsHighlighting(true);
            highlightTimerRef.current = setTimeout(() => setIsHighlighting(false), 600);
        });
    }, []);

    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [notifyCustomer, setNotifyCustomer] = useState(true);
    const [requireConfirmation, setRequireConfirmation] = useState(false);
    const [isQuickServiceOpen, setIsQuickServiceOpen] = useState(false);
    const [quickServicePrefill, setQuickServicePrefill] = useState('');
    const [quickServiceDraftId, setQuickServiceDraftId] = useState<string | null>(null);

    /* ── Draft discount modal ── */
    const [draftDiscountId, setDraftDiscountId] = useState<string | null>(null);

    const [editedPrices, setEditedPrices] = useState<Record<string, EditedPrice>>({}); // id → price override

    /* ── Unified price editor ── */
    const [editorId, setEditorId] = useState<string | null>(null);
    const [edNetStr, setEdNetStr] = useState('');
    const [edGrossStr, setEdGrossStr] = useState('');
    const [edLastField, setEdLastField] = useState<'net' | 'gross'>('gross');
    const [edVatRate, setEdVatRate] = useState<number>(23);
    const [edMode, setEdMode] = useState<'SET' | 'DISCOUNT'>('SET');
    const [edAdjType, setEdAdjType] = useState<AdjustmentType>('PERCENT');
    const [edDiscountValue, setEdDiscountValue] = useState('');
    const [edDirty, setEdDirty] = useState(false);

    /* ── Bulk discount modal ── */
    const [bulkDiscountOpen, setBulkDiscountOpen] = useState(false);
    const [bulkDiscountType, setBulkDiscountType] = useState<AdjustmentType>('PERCENT');
    const [bulkDiscountValue, setBulkDiscountValue] = useState('');
    const [bulkDiscountConflictOpen, setBulkDiscountConflictOpen] = useState(false);
    const [bulkDiscountUseEdited, setBulkDiscountUseEdited] = useState(false);

    /* ── Modal z treścią SMS-a (pokazywany przed zapisem, gdy informujemy klienta) ── */
    const [pendingSmsPayload, setPendingSmsPayload] = useState<ServicesChangesPayload | null>(null);

    /* ── Bulk VAT modal ── */
    const [bulkVatOpen, setBulkVatOpen] = useState(false);
    const [bulkVatRate, setBulkVatRate] = useState<number>(23);

    const fmtVat = (v: number) => v === -1 ? 'zw.' : `${v}%`;

    /**
     * Cena bazowa pozycji - to, od czego liczy się rabat i co widać jako
     * „Cena z cennika".
     *
     * Dla zwykłej usługi jest nią po prostu `basePriceNet`. Dla usługi z ceną
     * ustalaną ręcznie cennik NIE MA ceny: serwer zapisuje przy takiej pozycji
     * `basePriceNet = 0`, a kwotę ustaloną z klientem niesie rabat `SET_NET`
     * albo `SET_GROSS` (tak wysyła ją przyjęcie pojazdu - patrz
     * `toApiServiceLineItem`). Czytanie wtedy samego `basePriceNet` pokazywało
     * „Cena z cennika: 0,00 zł" i liczyło każdy rabat od zera, więc rabatu nie
     * dało się w ogóle nadać - kwota końcowa zawsze wychodziła zerowa.
     *
     * `resolveBaseNet` istnieje dokładnie po to i było już używane przy rabacie
     * zbiorczym; edytor pojedynczej pozycji jako jedyny go pomijał.
     */
    const listBaseNet = (service: ServiceLineItem): number => resolveBaseNet(pricedLine(service));

    /* ── Editor open / close / apply ── */

    const openEditor = (service: ServiceLineItem) => {
        const ep = editedPrices[service.id];
        const line = pricedLine(service);
        const adj = ep?.adjustment ?? line.adjustment;
        const isDiscountAdj = (adj.type === 'PERCENT' || adj.type === 'FIXED_NET' || adj.type === 'FIXED_GROSS') && adj.value !== 0;
        // Kwota, którą pozycja ma teraz, z DOKŁADNYM brutto - netto × stawka otwierało
        // 1900,00 zł jako 1900,01 zł, a sama zmiana stawki zapisywała tę kwotę jako cenę.
        const prefill = editorPrefill(line, ep);

        setEditorId(service.id);
        setEdVatRate(prefill.vatRate);
        setEdNetStr(formatZlField(prefill.netCents));
        setEdGrossStr(formatZlField(prefill.grossCents));
        setEdLastField(prefill.lastField);
        if (isDiscountAdj) {
            setEdMode('DISCOUNT');
            setEdAdjType(adj.type);
            setEdDiscountValue(adj.type === 'PERCENT' ? String(Math.abs(adj.value)) : String(adj.value / 100));
        } else {
            setEdMode('SET');
            setEdAdjType('PERCENT');
            setEdDiscountValue('');
        }
        setEdDirty(false);
    };

    const closeEditor = () => { setEditorId(null); setEdDirty(false); };

    /** Preview of the editor's current state against the ORIGINAL base price. */
    const editorPreview = (service: ServiceLineItem) => previewEditor(
        pricedLine(service),
        edVatRate,
        editorAdjustment({
            mode: edMode, discountType: edAdjType, discount: edDiscountValue,
            net: edNetStr, gross: edGrossStr, lastField: edLastField,
        }),
    );

    const applyEditor = () => {
        if (!editorId) return;
        const service = services.find(s => s.id === editorId);
        if (!service) { closeEditor(); return; }
        if (!edDirty) { closeEditor(); return; }
        const { adj } = editorPreview(service);
        setEditedPrices(prev => ({
            ...prev,
            // Baza zapisana wprost, a nie jako zero z rabatem SET_NET: dzięki temu
            // kolejny rabat nałożony na tę pozycję ma od czego liczyć. Jej dokładne
            // brutto jedzie razem z nią - upust brutto schodzi z wpisanej kwoty.
            [editorId]: editFromEditor(pricedLine(service), edVatRate, adj),
        }));
        closeEditor();
    };

    /** Powrót do ceny cennikowej: kasuje rabat i ręczną cenę, przywraca stawkę VAT usługi. */
    const removeEditorDiscount = () => {
        if (!editorId) return;
        const service = services.find(s => s.id === editorId);
        if (!service) { closeEditor(); return; }
        setEditedPrices(prev => ({
            ...prev,
            // Dla usługi z ceną ręczną „cena cennikowa" to kwota ustalona z klientem -
            // cennik nie ma dla niej żadnej innej. Wraca z dokładnym brutto.
            [editorId]: restoreListPrice(pricedLine(service)),
        }));
        closeEditor();
    };

    const handleEdNetChange = (val: string) => {
        if (val && !/^[0-9]*[,.]?[0-9]{0,2}$/.test(val)) return;
        setEdMode('SET');
        setEdLastField('net');
        setEdNetStr(val);
        setEdDirty(true);
        const gross = grossFieldFor(val, edVatRate);
        if (gross !== null) setEdGrossStr(gross);
    };

    const handleEdGrossChange = (val: string) => {
        if (val && !/^[0-9]*[,.]?[0-9]{0,2}$/.test(val)) return;
        setEdMode('SET');
        setEdLastField('gross');
        setEdGrossStr(val);
        setEdDirty(true);
        const net = netFieldFor(val, edVatRate);
        if (net !== null) setEdNetStr(net);
    };

    /** Zmiana stawki zachowuje stronę wpisaną (albo ustaloną przy pozycji) i liczy drugą. */
    const handleEdVatChange = (rate: number) => {
        setEdVatRate(rate);
        setEdDirty(true);
        if (edLastField === 'gross') {
            const net = netFieldFor(edGrossStr, rate);
            if (net !== null) setEdNetStr(net);
        } else {
            const gross = grossFieldFor(edNetStr, rate);
            if (gross !== null) setEdGrossStr(gross);
        }
    };

    /** Explicit switch between "set a price" and "give a discount". */
    const switchEditorMode = (mode: 'SET' | 'DISCOUNT') => {
        if (mode === edMode) return;
        if (mode === 'SET') {
            const service = services.find(s => s.id === editorId);
            if (service) {
                const { adj, finalNetCents, finalGrossCents } = editorPreview(service);
                setEdNetStr(formatZlField(finalNetCents));
                setEdGrossStr(formatZlField(finalGrossCents));
                // Po rabacie od netta ustalone jest netto - brutto z podglądu jest z niego
                // policzone i zapisane jako SET_GROSS przesunęłoby netto o grosz.
                setEdLastField(previewSide(pricedLine(service), edVatRate, adj));
            } else {
                setEdLastField('gross');
            }
        }
        setEdMode(mode);
    };

    const handleEdDiscountValueChange = (val: string) => {
        if (val && !MAX_2_DECIMALS.test(val)) return;
        setEdMode('DISCOUNT');
        setEdDiscountValue(val);
        setEdDirty(true);
    };

    /* ── Bulk actions ── */

    /** Pozycje objęte operacjami zbiorczymi: bez usuniętych i bez czekających na klienta. */
    const bulkEligibleLines = () => services
        .filter(s => !deletedIds.has(s.id) && !(s.hasPendingChange ?? (s.status === 'PENDING')))
        .map(s => ({ id: s.id, ...pricedLine(s) }));

    /** Wartość rabatu zbiorczego: procent albo grosze; null, gdy nie wpisano poprawnej. */
    const bulkDiscountAmount = (): number | null => {
        const val = parseFloat(bulkDiscountValue.replace(',', '.'));
        if (isNaN(val) || val <= 0) return null;
        return bulkDiscountType === 'PERCENT' ? val : Math.round(val * 100);
    };

    const applyBulkDiscount = () => {
        const value = bulkDiscountAmount();
        if (value === null) return;
        // Podgląd w oknie liczy się tą samą funkcją - zapisuje się dokładnie to, co było widać.
        setEditedPrices(bulkDiscountPlan(bulkEligibleLines(), editedPrices, bulkDiscountType, value, bulkDiscountUseEdited).edits);
        setBulkDiscountOpen(false);
        setBulkDiscountValue('');
    };

    const openBulkDiscountModal = () => {
        const eligible = services.filter(s => !deletedIds.has(s.id) && !(s.hasPendingChange ?? (s.status === 'PENDING')));
        const hasManualPriceEdits = eligible.some(s => {
            const ep = editedPrices[s.id];
            return ep && (ep.adjustment.type === 'SET_NET' || ep.adjustment.type === 'SET_GROSS');
        });
        if (hasManualPriceEdits) {
            setBulkDiscountConflictOpen(true);
        } else {
            setBulkDiscountUseEdited(false);
            setBulkDiscountValue('');
            setBulkDiscountOpen(true);
        }
    };

    const applyBulkVat = (rate: number) => {
        const eligible = bulkEligibleLines();
        // Pozycje z tą stawką zostają nietknięte; przy zmianie stawki zostaje strona ustalona.
        setEditedPrices(prev => bulkVatEdits(eligible, prev, rate));
        setBulkVatOpen(false);
    };

    /* ── New rows ── */

    const addNewRow = () => {
        const draftId = `draft-${Date.now()}`;
        setNewRows(prev => [...prev, {
            draftId,
            serviceId: null,
            serviceName: '',
            basePriceNet: 0,
            vatRate: 23,
            requireManualPrice: false,
            adjustment: { type: 'FIXED_NET', value: 0 },
        }]);
    };

    const updateRow = (draftId: string, partial: Partial<NewRow>) => {
        setNewRows(prev => prev.map(r => r.draftId === draftId ? { ...r, ...partial } : r));
    };

    const removeRow = (draftId: string) => {
        setNewRows(prev => prev.filter(r => r.draftId !== draftId));
    };

    const toggleDelete = (serviceId: string) => {
        setDeletedIds(prev => {
            const next = new Set(prev);
            if (next.has(serviceId)) next.delete(serviceId); else next.add(serviceId);
            return next;
        });
    };

    const handleAddCustom = (draftId: string, name: string) => {
        setQuickServicePrefill(name);
        setQuickServiceDraftId(draftId);
        setIsQuickServiceOpen(true);
    };

    const handleQuickServiceCreate = (svc: { id?: string; name: string; basePriceNet: number; basePriceGross: number; vatRate: number }) => {
        if (quickServiceDraftId) {
            updateRow(quickServiceDraftId, {
                serviceId: svc.id ?? null,
                serviceName: svc.name,
                basePriceNet: svc.basePriceNet,
                // Para z okna nowej usługi - brutto wpisane tam przechodzi bez przeliczania.
                basePriceGross: svc.basePriceGross,
                vatRate: svc.vatRate,
                requireManualPrice: false,
            });
        }
        setIsQuickServiceOpen(false);
        setQuickServiceDraftId(null);
    };

    const openDraftDiscount = (draftId: string) => {
        if (!newRows.some(r => r.draftId === draftId)) return;
        setDraftDiscountId(draftId);
    };

    const closeDraftDiscount = () => {
        setDraftDiscountId(null);
    };

    const applyDraftDiscount = (adjustment: PriceAdjustment) => {
        if (!draftDiscountId) return;
        updateRow(draftDiscountId, { adjustment });
        closeDraftDiscount();
    };

    const removeDraftDiscount = () => {
        if (!draftDiscountId) return;
        updateRow(draftDiscountId, { adjustment: { type: 'FIXED_NET', value: 0 } });
        closeDraftDiscount();
    };

    const hasChanges = newRows.some(r => r.serviceName.trim()) || deletedIds.size > 0 || Object.keys(editedPrices).length > 0;
    const isInEditMode = newRows.length > 0 || deletedIds.size > 0 || Object.keys(editedPrices).length > 0;

    useEffect(() => {
        if (!isInEditMode) return;
        const onDocClick = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                triggerHighlight();
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [isInEditMode, triggerHighlight]);

    const discardDraft = useCallback(() => {
        setNewRows([]);
        setDeletedIds(new Set());
        setEditedPrices({});
        setEditorId(null);
        setEdDirty(false);
        setDraftDiscountId(null);
    }, []);

    // ESC zamyka to, co jest na wierzchu: najpierw modal, potem sekcję edycji.
    // Sekcję z wprowadzonymi zmianami tylko podświetlamy, żeby nie zgubić pracy.
    const anyModalOpen = isQuickServiceOpen || bulkDiscountOpen || bulkDiscountConflictOpen
        || bulkVatOpen || isConfirmOpen || upsellOpen || editorId !== null || draftDiscountId !== null
        || pendingSmsPayload !== null;

    useEffect(() => {
        if (!isInEditMode && !anyModalOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (isQuickServiceOpen || isConfirmOpen || upsellOpen || pendingSmsPayload) return; // własna obsługa w modalu
            if (bulkDiscountConflictOpen) { setBulkDiscountConflictOpen(false); return; }
            if (bulkDiscountOpen) { setBulkDiscountOpen(false); return; }
            if (bulkVatOpen) { setBulkVatOpen(false); return; }
            if (draftDiscountId) { closeDraftDiscount(); return; }
            if (editorId) { closeEditor(); return; }
            if (!isInEditMode) return;
            if (hasChanges) triggerHighlight(); else discardDraft();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isInEditMode, anyModalOpen, hasChanges, isQuickServiceOpen, isConfirmOpen, upsellOpen,
        bulkDiscountConflictOpen, bulkDiscountOpen, bulkVatOpen, draftDiscountId, editorId,
        pendingSmsPayload, triggerHighlight, discardDraft]);

    const buildChangesPayload = (): ServicesChangesPayload => buildServicesChangesPayload({
        newRows,
        editedPrices,
        deletedIds,
        notifyCustomer: smsFeature.enabled ? notifyCustomer : false,
        requireConfirmation,
    });

    /** Nazwy usług i cena końcowa dla treści SMS-a - wszystko już jest w komponencie. */
    const buildSmsSummary = (): ServiceChangeSummary => {
        const nameById = new Map(services.map(s => [s.id, s.serviceName]));
        return {
            addedNames: newRows.filter(r => r.serviceName.trim()).map(r => r.serviceName.trim()),
            removedNames: Array.from(deletedIds).map(id => nameById.get(id)).filter((n): n is string => !!n),
            priceChangedNames: Object.keys(editedPrices)
                .filter(id => !deletedIds.has(id))
                .map(id => nameById.get(id))
                .filter((n): n is string => !!n),
            totalGrossAfter: totals.totalFinalGross,
        };
    };

    const persistChanges = (payload: ServicesChangesPayload) => {
        saveServicesChanges(payload, {
            onSuccess: () => {
                setNewRows([]);
                setDeletedIds(new Set());
                setEditedPrices({});
                setPendingSmsPayload(null);
            },
        });
    };

    /**
     * Gdy klient ma dostać SMS-a, najpierw pokazujemy jego treść do akceptacji -
     * zapis leci dopiero po zatwierdzeniu wiadomości w modalu.
     */
    const acceptDraft = () => {
        const payload = buildChangesPayload();
        if (payload.notifyCustomer || payload.requireConfirmation) {
            setPendingSmsPayload(payload);
            return;
        }
        persistChanges(payload);
    };

    const openConfirm = (service: ServiceLineItem, action: 'approve' | 'reject') => {
        setTargetService(service);
        setConfirmAction(action);
        setIsConfirmOpen(true);
    };

    const closeConfirm = () => {
        setIsConfirmOpen(false);
        setConfirmAction(null);
        setTargetService(null);
    };

    // Prices are hidden when the backend omits them (null) due to missing
    // VISITS_SERVICE_PRICES_VIEW permission. In that case we suppress all
    // price columns and calculations to avoid Dinero crashes.
    const pricesHidden = services.length > 0 && services[0]?.basePriceNet === null;

    // Te same kwoty trafiają do treści SMS-a dla klienta („Razem X zł"), więc liczą się
    // z dokładnym brutto - także pozycji zmienionych w tej sesji i nowych wierszy.
    const totals = pricesHidden
        ? { totalFinalNet: 0, totalFinalGross: 0, totalVat: 0, totalDiscountGross: 0, hasTotalDiscount: false, totalGrossBefore: 0 }
        : visitTotals({ services, editedPrices, newRows, deletedIds });

    const { approveServiceChange, isApproving } = useApproveServiceChange(visitId || '');
    const { rejectServiceChange, isRejecting } = useRejectServiceChange(visitId || '');

    const canEdit = !pricesHidden && (visitStatus === 'IN_PROGRESS' || visitStatus === 'READY_FOR_PICKUP');
    const hasPendingServices = services.some(s => (s.hasPendingChange ?? (s.status === 'PENDING')));
    const showActionsCol = canEdit || hasPendingServices;
    const canPrint = !!visitId && services.length > 0;

    // Wykaz drukuje stan zapisany na serwerze - bez cen i bez niezapisanych zmian z edycji.
    const handlePrint = () => {
        if (visitId) void printServicesList(visitId);
    };
    const bulkEligibleCount = services.filter(s => !deletedIds.has(s.id) && !(s.hasPendingChange ?? (s.status === 'PENDING'))).length;

    /* ── Model wiersza: to samo dla tabeli i listy na telefonie ── */
    const rows = services.map(service => {
        const ep = editedPrices[service.id];
        // Zmiana ceny w tabeli unieważnia brutto policzone przez serwer:
        // dotyczyło POPRZEDNIEJ ceny, a rozlany obiekt zachowałby je
        // i pokazywał kwotę sprzed edycji jako dokładną.
        const effectiveService = withEditedPrice(service, ep);
        const pricing = pricesHidden ? null : calculateServicePrice(effectiveService as Parameters<typeof calculateServicePrice>[0]);
        const showDiscount = !pricesHidden && !!pricing?.hasDiscount && service.basePriceNet !== 0;
        const isMarkedForDelete = deletedIds.has(service.id);
        const isPendingRow = service.hasPendingChange ?? (service.status === 'PENDING');
        const canDelete = canEdit && !isPendingRow && !isMarkedForDelete;
        const canEditPrice = canEdit && !isPendingRow && !isMarkedForDelete;
        const hasEditedPrice = ep !== undefined;
        const effectiveVat = ep?.vatRate ?? service.vatRate;
        const tone: 'ADD' | 'EDIT' | 'DELETE' | null = isMarkedForDelete ? 'DELETE'
            : isPendingRow ? (service.pendingOperation || 'EDIT') : null;

        const isEditPending = isPendingRow && service.pendingOperation === 'EDIT'
            && (service.previousPriceNet ?? null) !== null
            && (service.previousPriceGross ?? null) !== null;

        const discountPill = showDiscount && pricing
            ? (effectiveService.adjustment ? discountPillLabel(effectiveService.adjustment, pricing.discountLabel) : pricing.discountLabel)
            : null;

        const name = (
            <NameCell>
                <ServiceName>{service.serviceName}</ServiceName>
                {(service.isPackage || isPendingRow || isMarkedForDelete || discountPill || (!isPendingRow && hasEditedPrice)) && (
                    <Pills>
                        {service.isPackage && <StatusPill $tone="neutral">Pakiet</StatusPill>}
                        {isPendingRow && <StatusPill $tone="warn"><Clock />{pendingLabel(service.pendingOperation)}</StatusPill>}
                        {isMarkedForDelete && <StatusPill $tone="danger">Do usunięcia po zapisie</StatusPill>}
                        {discountPill && <StatusPill $tone="ok">{discountPill}</StatusPill>}
                        {!isPendingRow && !discountPill && hasEditedPrice && <StatusPill $tone="info">Cena zmieniona</StatusPill>}
                    </Pills>
                )}
                {service.note && <ServiceNote>{service.note}</ServiceNote>}
                {service.isPackage && service.packageItems && service.packageItems.length > 0 && (
                    <PackageItems>
                        {service.packageItems.map(item => <li key={item.serviceId}>{item.serviceName}</li>)}
                    </PackageItems>
                )}
            </NameCell>
        );

        let price: ReactNode = null;
        if (pricing) {
            if (isEditPending) {
                const prevGross = service.previousPriceGross as number;
                const prevNet = service.previousPriceNet as number;
                const trend: 'up' | 'down' | 'neutral' = pricing.finalPriceGross > prevGross ? 'up'
                    : pricing.finalPriceGross < prevGross ? 'down' : 'neutral';
                price = (
                    <PriceButton
                        readOnly
                        old={formatCurrency(prevGross / 100)}
                        gross={<>{formatCurrency(pricing.finalPriceGross / 100)} <Trend $trend={trend}>{trend === 'up' ? '▲' : trend === 'down' ? '▼' : '▬'}</Trend></>}
                        sub={<PriceSub>netto {formatCurrency(prevNet / 100)} → {formatCurrency(pricing.finalPriceNet / 100)}</PriceSub>}
                    />
                );
            } else {
                price = (
                    <PriceButton
                        readOnly={!canEditPrice}
                        old={showDiscount ? formatCurrency(pricing.originalPriceGross / 100) : undefined}
                        gross={formatCurrency(pricing.finalPriceGross / 100)}
                        net={formatCurrency(pricing.finalPriceNet / 100).replace(/\s?zł$/, '')}
                        aria-label={`Zmień cenę: ${service.serviceName}, ${formatCurrency(pricing.finalPriceGross / 100)}`}
                        title="Zmień cenę lub rabat"
                        onClick={() => openEditor(service)}
                    />
                );
            }
        }

        return {
            service, pricing, isMarkedForDelete, isPendingRow, canDelete, canEditPrice, effectiveVat, tone,
            discountPill, name, price,
            showRowMenu: showActionsCol && (isPendingRow || canEditPrice || canDelete || isMarkedForDelete),
        };
    });

    const menuService = menu.menu?.item ?? null;
    const menuRow = menuService ? rows.find(r => r.service.id === menuService.id) ?? null : null;

    const pendingCount = rows.filter(r => r.isPendingRow).length;
    const servicesSubtitle = services.length === 0 ? undefined : [
        `${services.length} ${servicesWord(services.length)}`,
        pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? 'czeka' : 'czekają'} na zgodę klienta` : null,
    ].filter(Boolean).join(', ');

    // Stan rozliczenia jako plakietka obok kwoty - to z nią wraca się do wizyty
    // przy wydaniu pojazdu.
    const settlementPill = pricesHidden || services.length === 0 ? null : settlement ? (
        <StatusPill $tone="ok"><Check />{SETTLEMENT_LABEL[settlement.documentType ?? 'OTHER']}</StatusPill>
    ) : (
        <StatusPill $tone="neutral">Nierozliczona</StatusPill>
    );

    // W trybie edycji dolne paski nawigacji ustępują miejsca paskowi
    // „Odrzuć / Zaakceptuj", który na telefonie jest przypięty do dołu ekranu.
    useHideMobileChrome('visit-services-edit', isInEditMode);

    // Na telefonie okno nie zabiera focusu samo z siebie - klawiatura zasłoniłaby
    // je, zanim użytkownik zdąży je zobaczyć.
    const autoFocusFields = shouldAutoFocusInput();

    const editorService = editorId ? services.find(s => s.id === editorId) ?? null : null;
    useModalViewport(editorService !== null, editorOverlayRef);
    useModalViewport(bulkVatOpen, bulkVatOverlayRef);
    useModalViewport(bulkDiscountOpen, bulkDiscountOverlayRef);
    useModalViewport(bulkDiscountConflictOpen, bulkConflictOverlayRef);

    return (
        <>
        <FocusWrapper $active={isInEditMode} ref={wrapperRef}>
        <ServicesCard ref={cardRef} aria-labelledby="visit-services-title">
            <CardHead>
                <SectionTitle id="visit-services-title" size="lg" count={servicesSubtitle}>Usługi</SectionTitle>
                {(canEdit || canPrint) && !isInEditMode && (
                    <IconButton
                        label={canEdit ? 'Rabat i VAT dla całej wizyty' : 'Więcej opcji wykazu'}
                        aria-haspopup="menu"
                        aria-expanded={menu.isOpen(HEADER_MENU)}
                        active={menu.isOpen(HEADER_MENU)}
                        disabled={isSaving}
                        onClick={e => menu.toggle(e, null, HEADER_MENU)}
                    >
                        <MoreHorizontal />
                    </IconButton>
                )}
            </CardHead>

            {!pricesHidden && (
                <Strip
                    label="Do zapłaty"
                    amount={formatCurrency(totals.totalFinalGross / 100)}
                    details={[
                        `netto ${formatCurrency(totals.totalFinalNet / 100)}`,
                        `VAT ${formatCurrency(totals.totalVat / 100)}`,
                        totals.hasTotalDiscount ? `rabaty −${formatCurrency(totals.totalDiscountGross / 100)}` : null,
                    ].filter(Boolean).join(', ')}
                    actions={(
                        <>
                            {!asList && settlementPill}
                            {canEdit && (
                                <Button variant="tinted" onClick={addNewRow} disabled={isSaving}>
                                    <Plus />Dodaj usługę
                                </Button>
                            )}
                        </>
                    )}
                />
            )}
            {pricesHidden && canEdit && (
                <Strip
                    label="Usługi wizyty"
                    amount={`${services.length} ${servicesWord(services.length)}`}
                    actions={<Button variant="tinted" onClick={addNewRow} disabled={isSaving}><Plus />Dodaj usługę</Button>}
                />
            )}

            {services.length === 0 && newRows.length === 0 && (
                <EmptyServices>Wizyta nie ma jeszcze żadnej usługi.</EmptyServices>
            )}

            {!asList ? (
                <Grid>
                    <colgroup>
                        <col />
                        {!pricesHidden && <col style={{ width: 76 }} />}
                        {!pricesHidden && <col style={{ width: 210 }} />}
                        {showActionsCol && <col style={{ width: 74 }} />}
                    </colgroup>
                    {(services.length > 0 || newRows.length > 0) && (
                        <thead>
                            <tr>
                                <Th>Usługa</Th>
                                {!pricesHidden && <Th>VAT</Th>}
                                {!pricesHidden && <Th $right>Kwota brutto</Th>}
                                {showActionsCol && <Th><span className="sr-only">Akcje</span></Th>}
                            </tr>
                        </thead>
                    )}
                    <tbody>
                        {rows.map(r => (
                            <Row
                                key={r.service.id}
                                $tone={r.tone}
                                $highlight={highlightPending && r.service.status === 'PENDING'}
                                $struck={r.isMarkedForDelete}
                            >
                                <Td>{r.name}</Td>
                                {!pricesHidden && <Td>{fmtVat(r.effectiveVat)}</Td>}
                                {!pricesHidden && <Td $right>{r.price}</Td>}
                                {showActionsCol && (
                                    <Td $right>
                                        {r.showRowMenu && (
                                            <IconButton
                                                shape="square"
                                                label={`Więcej akcji: ${r.service.serviceName}`}
                                                aria-haspopup="menu"
                                                aria-expanded={menu.isOpen(r.service.id)}
                                                active={menu.isOpen(r.service.id)}
                                                disabled={isApproving || isRejecting}
                                                onClick={e => menu.toggle(e, r.service, r.service.id)}
                                            >
                                                <MoreVertical />
                                            </IconButton>
                                        )}
                                    </Td>
                                )}
                            </Row>
                        ))}
                        {newRows.map(row => (
                            <ServiceInlineRow
                                key={row.draftId}
                                row={row}
                                nameColSpan={pricesHidden ? 1 : 2}
                                onUpdate={partial => updateRow(row.draftId, partial)}
                                onRemove={() => removeRow(row.draftId)}
                                onAddCustom={name => handleAddCustom(row.draftId, name)}
                                onEdit={() => handleAddCustom(row.draftId, row.serviceName)}
                                onDiscount={() => openDraftDiscount(row.draftId)}
                            />
                        ))}
                    </tbody>
                </Grid>
            ) : (
                <>
                    <MobileList>
                        {rows.map(r => {
                            const interactive = r.canEditPrice || r.showRowMenu;
                            return (
                                <MobileItem
                                    key={r.service.id}
                                    $tone={r.tone}
                                    $highlight={highlightPending && r.service.status === 'PENDING'}
                                    $struck={r.isMarkedForDelete}
                                >
                                    {/* Na dotyku cała pozycja otwiera menu akcji usługi - cena,
                                        usunięcie, zatwierdzenie zmiany - zamiast małego ⋮ z boku. */}
                                    <MobileRow
                                        type="button"
                                        disabled={!interactive}
                                        aria-haspopup={interactive ? 'menu' : undefined}
                                        onClick={interactive ? e => menu.toggle(e, r.service, r.service.id) : undefined}
                                    >
                                        <MobileText>{r.name}</MobileText>
                                        {!pricesHidden && r.pricing && (
                                            <MobileAmounts>
                                                <MobileGross>{formatCurrency(r.pricing.finalPriceGross / 100)}</MobileGross>
                                                {r.discountPill
                                                    ? <MobileSub $ok>{r.discountPill.toLowerCase()}</MobileSub>
                                                    : <MobileSub>VAT {fmtVat(r.effectiveVat)}</MobileSub>}
                                            </MobileAmounts>
                                        )}
                                        {interactive && <ChevronRight aria-hidden="true" />}
                                    </MobileRow>
                                </MobileItem>
                            );
                        })}
                    </MobileList>
                    {newRows.length > 0 && (
                        <DraftTable>
                            <tbody>
                                {newRows.map(row => (
                                    <ServiceInlineRow
                                        key={row.draftId}
                                        row={row}
                                        onUpdate={partial => updateRow(row.draftId, partial)}
                                        onRemove={() => removeRow(row.draftId)}
                                        onAddCustom={name => handleAddCustom(row.draftId, name)}
                                        onEdit={() => handleAddCustom(row.draftId, row.serviceName)}
                                        onDiscount={() => openDraftDiscount(row.draftId)}
                                    />
                                ))}
                            </tbody>
                        </DraftTable>
                    )}
                </>
            )}
            <div style={{ height: 8 }} />

            {isInEditMode && (
                <DraftBar>
                    <DraftBarSmsWrap>
                        <LockedSection
                            locked={!smsFeature.enabled}
                            message="Twój abonament nie obsługuje powiadomień SMS."
                            onLockedClick={() => setUpsellOpen(true)}
                        >
                            <DraftBarCheckboxes>
                                <DraftBarLabel>
                                    <input
                                        type="checkbox"
                                        checked={smsFeature.enabled ? notifyCustomer : false}
                                        onChange={e => setNotifyCustomer(e.target.checked)}
                                    />
                                    Poinformuj klienta SMS-em o zmianach
                                </DraftBarLabel>
                                <DraftBarLabel $disabled={!notifyCustomer}>
                                    <input
                                        type="checkbox"
                                        checked={notifyCustomer ? requireConfirmation : false}
                                        onChange={e => setRequireConfirmation(e.target.checked)}
                                        disabled={!notifyCustomer}
                                    />
                                    Wymagaj potwierdzenia od klienta
                                </DraftBarLabel>
                            </DraftBarCheckboxes>
                        </LockedSection>
                    </DraftBarSmsWrap>
                    <DraftBarActions>
                        <DiscardBtn
                            onClick={discardDraft}
                            disabled={isSaving}
                            $highlighting={isHighlighting}
                            title="Zamknij bez zapisywania (Esc)"
                        >
                            {hasChanges ? 'Odrzuć' : 'Zamknij'}
                        </DiscardBtn>
                        <AcceptBtn onClick={acceptDraft} disabled={isSaving || !hasChanges} $highlighting={isHighlighting}>
                            {isSaving ? 'Zapisywanie...' : 'Zaakceptuj'}
                        </AcceptBtn>
                    </DraftBarActions>
                </DraftBar>
            )}
        </ServicesCard>

        <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label={menuService ? `Akcje usługi ${menuService.serviceName}` : 'Operacje na całej wizycie'}>
            {menu.isOpen(HEADER_MENU) && (
                <>
                    {canEdit && (
                        <>
                            <MenuItem icon={<Percent />} disabled={bulkEligibleCount === 0} onClick={openBulkDiscountModal}>
                                Rabatuj całość...
                            </MenuItem>
                            <MenuItem icon={<ReceiptText />} disabled={bulkEligibleCount === 0} onClick={() => setBulkVatOpen(true)}>
                                VAT dla wszystkich usług...
                            </MenuItem>
                        </>
                    )}
                    {canPrint && (
                        <MenuItem icon={<Printer />} disabled={isPrinting} onClick={handlePrint}>Drukuj wykaz</MenuItem>
                    )}
                </>
            )}
            {menuRow && (
                <>
                    {menuRow.isPendingRow && (
                        <>
                            <MenuItem icon={<Check />} disabled={!visitId} onClick={() => openConfirm(menuRow.service, 'approve')}>
                                Zatwierdź zmianę
                            </MenuItem>
                            <MenuItem icon={<Undo2 />} danger disabled={!visitId} onClick={() => openConfirm(menuRow.service, 'reject')}>
                                Wycofaj zmianę
                            </MenuItem>
                        </>
                    )}
                    {menuRow.canEditPrice && (
                        <MenuItem icon={<Pencil />} onClick={() => openEditor(menuRow.service)}>Zmień cenę / rabat</MenuItem>
                    )}
                    {menuRow.canDelete && (
                        <MenuItem icon={<Trash2 />} danger onClick={() => toggleDelete(menuRow.service.id)}>Usuń usługę</MenuItem>
                    )}
                    {menuRow.isMarkedForDelete && (
                        <MenuItem icon={<Undo2 />} onClick={() => toggleDelete(menuRow.service.id)}>Przywróć</MenuItem>
                    )}
                </>
            )}
        </ActionMenu>

        <div style={{ zIndex: 1100, position: 'relative' }}>
            <QuickServiceModal
                isOpen={isQuickServiceOpen}
                onClose={() => { setIsQuickServiceOpen(false); setQuickServiceDraftId(null); }}
                onServiceCreate={handleQuickServiceCreate}
                initialServiceName={quickServicePrefill}
            />
        </div>

        {/* ─── Draft row discount modal (wspólny komponent) ─── */}
        {draftDiscountId && (() => {
            const draftRow = newRows.find(r => r.draftId === draftDiscountId);
            if (!draftRow) return null;
            return (
                <ServiceDiscountModal
                    serviceName={draftRow.serviceName}
                    basePriceNet={draftRow.basePriceNet}
                    basePriceGross={draftRow.basePriceGross}
                    vatRate={draftRow.vatRate}
                    adjustment={draftRow.adjustment}
                    onApply={applyDraftDiscount}
                    onRemove={removeDraftDiscount}
                    onClose={closeDraftDiscount}
                />
            );
        })()}

        {/* ─── Unified price editor ─── */}
        {editorService && (() => {
            const svc = editorService;
            const preview = editorPreview(svc);
            const listNet = listBaseNet(svc);
            const listGross = preview.listGross;
            const changed = preview.finalGrossCents !== listGross;
            const existingAdj = editedPrices[svc.id]?.adjustment ?? svc.adjustment;
            // Każda odchyłka od cennika (rabat lub ręczna cena) daje możliwość powrotu do ceny cennikowej.
            const hasCustomPrice = existingAdj.value !== 0;

            const discountValNum = parseFloat(edDiscountValue.replace(',', '.'));
            const discountInvalid = edMode === 'DISCOUNT' && (isNaN(discountValNum) || discountValNum <= 0);
            const setInvalid = edMode === 'SET' && parseZlCents(edNetStr) === null;
            const applyDisabled = discountInvalid || setInvalid;

            return (
                <DiscountModalOverlay ref={editorOverlayRef} onClick={closeEditor}>
                    <DiscountModalCard onClick={e => e.stopPropagation()}>
                        <DiscountModalHeader>
                            <div>
                                <DiscountModalTitle>Cena usługi</DiscountModalTitle>
                                <DiscountModalSubtitle>{svc.serviceName}</DiscountModalSubtitle>
                            </div>
                            <DiscountCloseBtn type="button" aria-label="Zamknij" onClick={closeEditor}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </DiscountCloseBtn>
                        </DiscountModalHeader>
                        <DiscountModalBody>
                            <EditorListBox>
                                <EditorListLabel>Cena z cennika</EditorListLabel>
                                <EditorSummaryGrid>
                                    <EditorSummaryCell>
                                        <EditorSummaryLabel>Netto</EditorSummaryLabel>
                                        <EditorSummaryValue>{formatCurrency(listNet / 100)}</EditorSummaryValue>
                                    </EditorSummaryCell>
                                    <EditorSummaryCell>
                                        <EditorSummaryLabel>Brutto</EditorSummaryLabel>
                                        <EditorSummaryValue>{formatCurrency(listGross / 100)}</EditorSummaryValue>
                                    </EditorSummaryCell>
                                    <EditorSummaryCell>
                                        <EditorSummaryLabel>VAT</EditorSummaryLabel>
                                        <EditorSummaryValue>{fmtVat(svc.vatRate ?? edVatRate)}</EditorSummaryValue>
                                    </EditorSummaryCell>
                                </EditorSummaryGrid>
                            </EditorListBox>

                            <EditorModeRow role="tablist">
                                <EditorModeTab
                                    type="button"
                                    role="tab"
                                    aria-selected={edMode === 'SET'}
                                    $active={edMode === 'SET'}
                                    onClick={() => switchEditorMode('SET')}
                                >
                                    Wpisz cenę
                                </EditorModeTab>
                                <EditorModeTab
                                    type="button"
                                    role="tab"
                                    aria-selected={edMode === 'DISCOUNT'}
                                    $active={edMode === 'DISCOUNT'}
                                    onClick={() => switchEditorMode('DISCOUNT')}
                                >
                                    Udziel rabatu
                                </EditorModeTab>
                            </EditorModeRow>

                            {edMode === 'SET' ? (
                                <div>
                                    <DiscountSectionLabel>Cena dla klienta</DiscountSectionLabel>
                                    <EditorGrid>
                                        <EditorField>
                                            <EditorFieldLabel>Netto</EditorFieldLabel>
                                            <EditorPriceInput
                                                type="text" inputMode="decimal" placeholder="0.00"
                                                value={edNetStr}
                                                onChange={e => handleEdNetChange(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !applyDisabled) applyEditor();
                                                    handleZeroAwareKeyDown(edNetStr, handleEdNetChange)(e);
                                                }}
                                            />
                                        </EditorField>
                                        <EditorField>
                                            <EditorFieldLabel>Brutto</EditorFieldLabel>
                                            <EditorPriceInput
                                                type="text" inputMode="decimal" placeholder="0.00" autoFocus={autoFocusFields}
                                                value={edGrossStr}
                                                onChange={e => handleEdGrossChange(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !applyDisabled) applyEditor();
                                                    handleZeroAwareKeyDown(edGrossStr, handleEdGrossChange)(e);
                                                }}
                                            />
                                        </EditorField>
                                        <EditorField>
                                            <EditorFieldLabel>Stawka VAT</EditorFieldLabel>
                                            <EditorVatSelect
                                                value={edVatRate}
                                                onChange={e => handleEdVatChange(Number(e.target.value))}
                                            >
                                                {([23, 8, 5, 0, -1] as const).map(rate => (
                                                    <option key={rate} value={rate}>{rate === -1 ? 'zw.' : `${rate}%`}</option>
                                                ))}
                                            </EditorVatSelect>
                                        </EditorField>
                                    </EditorGrid>
                                </div>
                            ) : (
                                <div>
                                    <DiscountSectionLabel>Rodzaj rabatu</DiscountSectionLabel>
                                    <DiscountTypeRow style={{ marginBottom: 10 }}>
                                        {EDITOR_DISCOUNT_TYPES.map(({ type, label }) => (
                                            <DiscountTypePill
                                                key={type}
                                                type="button"
                                                $selected={edAdjType === type}
                                                onClick={() => { setEdAdjType(type); setEdDiscountValue(''); }}
                                            >
                                                {label}
                                            </DiscountTypePill>
                                        ))}
                                    </DiscountTypeRow>
                                    <EditorNarrowField>
                                        <EditorFieldLabel>Wysokość rabatu</EditorFieldLabel>
                                        <EditorInputWrap>
                                            <EditorBareInput
                                                type="text" inputMode="decimal"
                                                placeholder="0"
                                                autoFocus={autoFocusFields}
                                                value={edDiscountValue}
                                                onChange={e => handleEdDiscountValueChange(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !applyDisabled) applyEditor();
                                                    handleZeroAwareKeyDown(edDiscountValue, handleEdDiscountValueChange)(e);
                                                }}
                                            />
                                            <EditorUnit>{edAdjType === 'PERCENT' ? '%' : 'zł'}</EditorUnit>
                                        </EditorInputWrap>
                                    </EditorNarrowField>
                                </div>
                            )}

                            <EditorPreview>
                                <EditorPreviewLine>
                                    <EditorPreviewLabel>Do zapłaty</EditorPreviewLabel>
                                    {changed && preview.savedGross > 0 && (
                                        <EditorSavedChip>Taniej o {formatCurrency(preview.savedGross / 100)}</EditorSavedChip>
                                    )}
                                </EditorPreviewLine>
                                <EditorSummaryGrid>
                                    <EditorSummaryCell>
                                        <EditorSummaryLabel>Netto</EditorSummaryLabel>
                                        <EditorSummaryValue>{formatCurrency(preview.finalNetCents / 100)}</EditorSummaryValue>
                                    </EditorSummaryCell>
                                    <EditorSummaryCell>
                                        <EditorSummaryLabel>Brutto</EditorSummaryLabel>
                                        <EditorSummaryValue $strong>{formatCurrency(preview.finalGrossCents / 100)}</EditorSummaryValue>
                                        {changed && (
                                            <EditorPreviewOld>{formatCurrency(listGross / 100)}</EditorPreviewOld>
                                        )}
                                    </EditorSummaryCell>
                                    <EditorSummaryCell>
                                        <EditorSummaryLabel>VAT</EditorSummaryLabel>
                                        <EditorSummaryValue>{fmtVat(edVatRate)}</EditorSummaryValue>
                                    </EditorSummaryCell>
                                </EditorSummaryGrid>
                            </EditorPreview>
                        </DiscountModalBody>
                        <DiscountModalFooter>
                            {hasCustomPrice && (
                                <DiscountRemoveBtn type="button" onClick={removeEditorDiscount}>Przywróć cenę z cennika</DiscountRemoveBtn>
                            )}
                            <DiscountCancelBtn type="button" onClick={closeEditor} style={{ marginLeft: hasCustomPrice ? undefined : 'auto' }}>
                                Anuluj
                            </DiscountCancelBtn>
                            <DiscountApplyBtn type="button" onClick={applyEditor} disabled={applyDisabled}>
                                Zapisz cenę
                            </DiscountApplyBtn>
                        </DiscountModalFooter>
                    </DiscountModalCard>
                </DiscountModalOverlay>
            );
        })()}

        {/* ─── Treść SMS-a przed zapisem ─── */}
        {pendingSmsPayload && (
            <ServiceChangeSmsModal
                summary={buildSmsSummary()}
                totalGrossBefore={totals.totalGrossBefore}
                requireConfirmation={pendingSmsPayload.requireConfirmation}
                isSaving={isSaving}
                onCancel={() => setPendingSmsPayload(null)}
                onConfirm={(smsMessage, smsUsePolishCharacters) =>
                    persistChanges({ ...pendingSmsPayload, smsMessage, smsUsePolishCharacters })}
            />
        )}

        {/* Bulk VAT modal */}
        {bulkVatOpen && (
            <DiscountModalOverlay ref={bulkVatOverlayRef} onClick={() => setBulkVatOpen(false)}>
                <DiscountModalCard onClick={e => e.stopPropagation()}>
                    <DiscountModalHeader>
                        <DiscountModalTitle>VAT dla wszystkich usług</DiscountModalTitle>
                        <DiscountCloseBtn type="button" aria-label="Zamknij" onClick={() => setBulkVatOpen(false)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </DiscountCloseBtn>
                    </DiscountModalHeader>
                    <DiscountModalBody>
                        <DiscountTypeRow>
                            {([23, 8, 5, 0, -1] as const).map(rate => (
                                <DiscountTypePill
                                    key={rate}
                                    type="button"
                                    $selected={bulkVatRate === rate}
                                    onClick={() => { setBulkVatRate(rate); applyBulkVat(rate); }}
                                >
                                    {rate === -1 ? 'zw.' : `${rate}%`}
                                </DiscountTypePill>
                            ))}
                        </DiscountTypeRow>
                    </DiscountModalBody>
                </DiscountModalCard>
            </DiscountModalOverlay>
        )}

        {/* Bulk discount modal */}
        {bulkDiscountOpen && (() => {
            const eligible = services.filter(s => !deletedIds.has(s.id) && !(s.hasPendingChange ?? (s.status === 'PENDING')));
            const parsedVal = parseFloat(bulkDiscountValue.replace(',', '.'));
            const discountAmount = bulkDiscountAmount();
            const hasValidValue = discountAmount !== null;
            // Ta sama funkcja co przy zapisie - okno pokazuje dokładnie to, co się zapisze,
            // z dokładnym brutto cen z cennika (a nie netto × stawka).
            const plan = bulkDiscountPlan(bulkEligibleLines(), editedPrices, bulkDiscountType, discountAmount, bulkDiscountUseEdited);
            const allBases = plan.bases;

            const previews = plan.rows.map((row, i) => {
                const beforeGross = row.beforeGross / 100;
                const afterGross = row.afterGross / 100;
                return {
                    service: eligible[i],
                    beforeNet: row.beforeNet / 100,
                    afterNet: row.afterNet / 100,
                    beforeGross,
                    afterGross,
                    discountGross: beforeGross - afterGross,
                };
            });

            // Sumy w groszach - sumowanie złotówek we floatach gubiło grosze na długich listach.
            const sumCents = (pick: (row: typeof plan.rows[number]) => number) =>
                plan.rows.reduce((sum, row) => sum + pick(row), 0);
            const totalBeforeNet = sumCents(r => r.beforeNet) / 100;
            const totalAfterNet = sumCents(r => r.afterNet) / 100;
            const totalBeforeGross = sumCents(r => r.beforeGross) / 100;
            const totalAfterGross = sumCents(r => r.afterGross) / 100;
            const totalSavedGross = (sumCents(r => r.beforeGross) - sumCents(r => r.afterGross)) / 100;
            const totalSavedNet = (sumCents(r => r.beforeNet) - sumCents(r => r.afterNet)) / 100;

            const fmtPct = (v: number) => `${Math.round(Math.abs(v))}%`;
            const fmtAmt = (v: number) => `−${Math.abs(v).toFixed(2)} zł`;
            const fmtZl = (v: number) => formatCurrency(v);

            return (
                <DiscountModalOverlay ref={bulkDiscountOverlayRef} onClick={() => setBulkDiscountOpen(false)}>
                    <BulkModalCard onClick={e => e.stopPropagation()}>
                        <BulkModalHeader>
                            <div>
                                <DiscountModalTitle>Rabatuj całość</DiscountModalTitle>
                                <DiscountModalSubtitle>{eligible.length} {eligible.length === 1 ? 'pozycja' : eligible.length < 5 ? 'pozycje' : 'pozycji'}</DiscountModalSubtitle>
                            </div>
                            <DiscountCloseBtn type="button" aria-label="Zamknij" onClick={() => setBulkDiscountOpen(false)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </DiscountCloseBtn>
                        </BulkModalHeader>

                        <BulkModalLayout>
                            {/* Left: controls */}
                            <BulkControlsPanel>
                                <DiscountFromBox>
                                    <DiscountFromBoxLabel>Łącznie przed rabatem</DiscountFromBoxLabel>
                                    <DiscountFromPrices>
                                        <DiscountFromPrice>
                                            <DiscountFromPriceValue>{totalBeforeGross.toFixed(2)} zł</DiscountFromPriceValue>
                                            <DiscountFromPriceLabel>Brutto</DiscountFromPriceLabel>
                                        </DiscountFromPrice>
                                        <DiscountFromPrice>
                                            <DiscountFromPriceValue>{(allBases.reduce((s, b) => s + b.basePriceNetCents, 0) / 100).toFixed(2)} zł</DiscountFromPriceValue>
                                            <DiscountFromPriceLabel>Netto</DiscountFromPriceLabel>
                                        </DiscountFromPrice>
                                    </DiscountFromPrices>
                                </DiscountFromBox>

                                <div>
                                    <DiscountSectionLabel>Rodzaj rabatu</DiscountSectionLabel>
                                    <DiscountTypeRow>
                                        {DISCOUNT_TYPES.map(({ type, label }) => (
                                            <DiscountTypePill key={type} type="button" $selected={bulkDiscountType === type}
                                                onClick={() => { setBulkDiscountType(type); setBulkDiscountValue(''); }}>
                                                {label}
                                            </DiscountTypePill>
                                        ))}
                                    </DiscountTypeRow>
                                </div>

                                <div>
                                    <DiscountSectionLabel>Wartość rabatu</DiscountSectionLabel>
                                    <DiscountValueRow>
                                        <DiscountValueInput
                                            type="text" inputMode="decimal" placeholder="0" autoFocus={autoFocusFields}
                                            value={bulkDiscountValue}
                                            onChange={e => { if (MAX_2_DECIMALS.test(e.target.value)) setBulkDiscountValue(e.target.value); }}
                                            onKeyDown={handleZeroAwareKeyDown(bulkDiscountValue, setBulkDiscountValue)}
                                        />
                                        <DiscountValueSuffix>{bulkDiscountType === 'PERCENT' ? '%' : 'zł'}</DiscountValueSuffix>
                                    </DiscountValueRow>
                                </div>
                            </BulkControlsPanel>

                            {/* Right: live preview */}
                            <BulkPreviewPanel>
                                <BulkPreviewHeader>
                                    <BulkPreviewHeaderMain>
                                        <BulkPreviewHeaderIcon>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>
                                        </BulkPreviewHeaderIcon>
                                        <BulkPreviewHeaderText>
                                            <BulkPreviewHeaderLabel>Podgląd zmian cen</BulkPreviewHeaderLabel>
                                            <BulkPreviewHeaderCaption>Rozkład rabatu na poszczególne usługi</BulkPreviewHeaderCaption>
                                        </BulkPreviewHeaderText>
                                    </BulkPreviewHeaderMain>
                                    {hasValidValue && totalSavedGross > 0.001 && (
                                        <BulkPreviewTotalsSaved>Oszczędność {fmtZl(totalSavedGross)}</BulkPreviewTotalsSaved>
                                    )}
                                </BulkPreviewHeader>

                                {previews.length === 0 ? (
                                    <BulkPreviewEmptyState>
                                        <BulkPreviewEmptyIcon>🏷️</BulkPreviewEmptyIcon>
                                        <BulkPreviewEmptyText>Brak pozycji do rabatowania</BulkPreviewEmptyText>
                                    </BulkPreviewEmptyState>
                                ) : (
                                    <>
                                        <BulkPreviewList>
                                            {previews.map(({ service, beforeNet, afterNet, beforeGross, afterGross, discountGross }) => {
                                                const isDiscounted = hasValidValue && discountGross > 0.001;
                                                const chipLabel = bulkDiscountType === 'PERCENT'
                                                    ? fmtPct(parsedVal)
                                                    : fmtAmt(discountGross);
                                                return (
                                                    <BulkPreviewCard key={service.id} $active={isDiscounted}>
                                                        <BulkPreviewCardTop>
                                                            <BulkPreviewRowName title={service.serviceName}>
                                                                {service.serviceName}
                                                            </BulkPreviewRowName>
                                                            <BulkPreviewDiscountChip $visible={isDiscounted}>
                                                                {chipLabel}
                                                            </BulkPreviewDiscountChip>
                                                        </BulkPreviewCardTop>
                                                        <BulkPreviewPriceGrid>
                                                            <BulkPreviewPriceCol>
                                                                <BulkPreviewPriceColLabel>Netto</BulkPreviewPriceColLabel>
                                                                <BulkPreviewRowPrices>
                                                                    <BulkPreviewOriginalPrice $strikethrough={isDiscounted}>
                                                                        {fmtZl(beforeNet)}
                                                                    </BulkPreviewOriginalPrice>
                                                                    {isDiscounted && <>
                                                                        <BulkPreviewArrow $active={isDiscounted}>→</BulkPreviewArrow>
                                                                        <BulkPreviewNewPrice $active={isDiscounted}>{fmtZl(afterNet)}</BulkPreviewNewPrice>
                                                                    </>}
                                                                </BulkPreviewRowPrices>
                                                            </BulkPreviewPriceCol>
                                                            <BulkPreviewPriceCol>
                                                                <BulkPreviewPriceColLabel>Brutto</BulkPreviewPriceColLabel>
                                                                <BulkPreviewRowPrices>
                                                                    <BulkPreviewOriginalPrice $strikethrough={isDiscounted}>
                                                                        {fmtZl(beforeGross)}
                                                                    </BulkPreviewOriginalPrice>
                                                                    {isDiscounted && <>
                                                                        <BulkPreviewArrow $active={isDiscounted}>→</BulkPreviewArrow>
                                                                        <BulkPreviewNewPrice $active={isDiscounted} $primary>{fmtZl(afterGross)}</BulkPreviewNewPrice>
                                                                    </>}
                                                                </BulkPreviewRowPrices>
                                                            </BulkPreviewPriceCol>
                                                        </BulkPreviewPriceGrid>
                                                    </BulkPreviewCard>
                                                );
                                            })}
                                        </BulkPreviewList>

                                        <BulkPreviewTotalsBar>
                                            <BulkPreviewTotalsRow>
                                                <BulkPreviewTotalsLabel>Razem brutto</BulkPreviewTotalsLabel>
                                                {hasValidValue && totalSavedGross > 0.001 ? (
                                                    <>
                                                        <BulkPreviewTotalsBefore>{fmtZl(totalBeforeGross)}</BulkPreviewTotalsBefore>
                                                        <BulkPreviewTotalsArrow>→</BulkPreviewTotalsArrow>
                                                        <BulkPreviewTotalsAfter $active>{fmtZl(totalAfterGross)}</BulkPreviewTotalsAfter>
                                                    </>
                                                ) : (
                                                    <BulkPreviewTotalsAfter>{fmtZl(totalBeforeGross)}</BulkPreviewTotalsAfter>
                                                )}
                                            </BulkPreviewTotalsRow>
                                            <BulkPreviewTotalsRow $secondary>
                                                <BulkPreviewTotalsLabel $secondary>Razem netto</BulkPreviewTotalsLabel>
                                                {hasValidValue && totalSavedNet > 0.001 ? (
                                                    <>
                                                        <BulkPreviewTotalsBefore $secondary>{fmtZl(totalBeforeNet)}</BulkPreviewTotalsBefore>
                                                        <BulkPreviewTotalsArrow>→</BulkPreviewTotalsArrow>
                                                        <BulkPreviewTotalsAfter $secondary>{fmtZl(totalAfterNet)}</BulkPreviewTotalsAfter>
                                                    </>
                                                ) : (
                                                    <BulkPreviewTotalsAfter $secondary>{fmtZl(totalBeforeNet)}</BulkPreviewTotalsAfter>
                                                )}
                                            </BulkPreviewTotalsRow>
                                        </BulkPreviewTotalsBar>
                                    </>
                                )}
                            </BulkPreviewPanel>
                        </BulkModalLayout>

                        <BulkModalFooter>
                            <DiscountCancelBtn type="button" onClick={() => setBulkDiscountOpen(false)} style={{ marginLeft: 'auto' }}>Anuluj</DiscountCancelBtn>
                            <DiscountApplyBtn type="button" onClick={applyBulkDiscount}
                                disabled={!hasValidValue}>
                                Zastosuj rabat
                            </DiscountApplyBtn>
                        </BulkModalFooter>
                    </BulkModalCard>
                </DiscountModalOverlay>
            );
        })()}

        {bulkDiscountConflictOpen && (
            <ModalOverlay ref={bulkConflictOverlayRef} onClick={() => setBulkDiscountConflictOpen(false)}>
                <ModalCard role="dialog" aria-modal="true" aria-labelledby="bulk-conflict-title" onClick={e => e.stopPropagation()}>
                    <ModalHeader>
                        <ModalTitle id="bulk-conflict-title">Naniesione poprawki cen</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        Niektóre usługi mają ręcznie zmienione ceny lub stawki VAT. Czy rabat powinien zostać naliczony od zmienionych wartości, czy nadpisać wszystkie dotychczasowe zmiany i naliczyć od cen pierwotnych?
                    </ModalBody>
                    <ModalFooter>
                        <SecondaryBtn onClick={() => {
                            setBulkDiscountUseEdited(false);
                            setBulkDiscountConflictOpen(false);
                            setBulkDiscountValue('');
                            setBulkDiscountOpen(true);
                        }}>Nadpisz zmiany</SecondaryBtn>
                        <PrimaryBtn $danger={false} onClick={() => {
                            setBulkDiscountUseEdited(true);
                            setBulkDiscountConflictOpen(false);
                            setBulkDiscountValue('');
                            setBulkDiscountOpen(true);
                        }}>Uwzględnij poprawki</PrimaryBtn>
                    </ModalFooter>
                </ModalCard>
            </ModalOverlay>
        )}

        {isConfirmOpen && targetService && (
            <ModalOverlay onClick={(e) => { if (e.target === e.currentTarget) closeConfirm(); }}>
                <ModalCard role="dialog" aria-modal="true" aria-labelledby="confirm-title">
                    <ModalHeader>
                        <ModalTitle id="confirm-title">
                            {confirmAction === 'approve' ? 'Potwierdź zmianę' : 'Wycofać zmianę?'}
                        </ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        {confirmAction === 'approve' ? (
                            <>
                                {targetService.pendingOperation === 'DELETE'
                                    ? 'Zatwierdzenie spowoduje trwałe usunięcie tej usługi z wizyty. Czy na pewno chcesz kontynuować?'
                                    : 'Zatwierdzenie zmiany spowoduje jej wejście w życie. Czy na pewno chcesz kontynuować?'}
                            </>
                        ) : (
                            <>Odrzucenie spowoduje przywrócenie ostatniego zatwierdzonego stanu tej usługi. Kontynuować?</>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <SecondaryBtn onClick={closeConfirm}>Anuluj</SecondaryBtn>
                        <PrimaryBtn
                            $danger={confirmAction === 'reject'}
                            disabled={(confirmAction === 'approve' && isApproving) || (confirmAction === 'reject' && isRejecting)}
                            onClick={() => {
                                if (!visitId || !targetService) return;
                                if (confirmAction === 'approve') {
                                    approveServiceChange(targetService.id, { onSettled: closeConfirm });
                                } else if (confirmAction === 'reject') {
                                    rejectServiceChange(targetService.id, { onSettled: closeConfirm });
                                }
                            }}
                        >
                            {confirmAction === 'approve' ? 'Zatwierdź' : 'Wycofaj'}
                        </PrimaryBtn>
                    </ModalFooter>
                </ModalCard>
            </ModalOverlay>
        )}
        {upsellOpen && <UpsellModal feature="SMS_EMAIL" onClose={() => setUpsellOpen(false)} />}
        </FocusWrapper>
        </>
    );
};
