import styled, { keyframes } from 'styled-components';

export const ServicesBlock = styled.div`
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    transition: border-color 180ms ease;

    &:focus-within { border-color: #bae6fd; }
`;

export const ServicesTableHeader = styled.div`
    display: grid;
    grid-template-columns: 1fr 74px 60px 74px 90px;
    align-items: center;
    gap: 4px;
    padding: 7px 8px 7px 14px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
`;

export const ServicesHeaderCell = styled.span`
    font-size: 10px;
    font-weight: 700;
    color: #b0bec5;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-align: right;

    &:first-child { text-align: left; }
`;

export const ServicesList = styled.div`
    display: flex;
    flex-direction: column;
`;

export const ServiceItem = styled.div<{ $hasDiscount?: boolean }>`
    border-bottom: 1px solid #f1f5f9;
    background: ${p => p.$hasDiscount ? '#fffbeb' : 'transparent'};
    transition: background 120ms ease;

    &:last-child { border-bottom: none; }
    &:hover { background: ${p => p.$hasDiscount ? '#fef3c7' : '#fafbfd'}; }
`;

export const ServiceItemRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 74px 60px 74px 90px;
    align-items: center;
    gap: 4px;
    padding: 8px 8px 8px 14px;
`;

export const ServiceNameWrap = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding-right: 4px;
`;

export const ServiceName = styled.span`
    font-size: 14px;
    font-weight: 500;
    color: #0f172a;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const ServiceNoteInline = styled.span`
    font-size: 11px;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const PriceDisplay = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    padding: 5px 8px;
`;

export const PriceDisplayMain = styled.span<{ $isBrutto?: boolean; $isDiscounted?: boolean }>`
    font-size: 13px;
    font-weight: ${p => p.$isBrutto ? 600 : 400};
    color: ${p => p.$isDiscounted ? '#059669' : (p.$isBrutto ? '#0f172a' : '#64748b')};
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
    white-space: nowrap;
`;

export const PriceDisplayOriginal = styled.span`
    font-size: 10px;
    color: #b0bec5;
    text-decoration: line-through;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
    white-space: nowrap;
`;

export const ServiceActions = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    flex-shrink: 0;
`;

export const DiscountButton = styled.button<{ $active?: boolean }>`
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    border: none;
    background: ${p => p.$active ? '#fef3c7' : 'transparent'};
    color: ${p => p.$active ? '#d97706' : '#b0bec5'};
    cursor: pointer;
    transition: all 150ms ease;

    &:hover { background: #fef3c7; color: #d97706; }
    svg { width: 13px; height: 13px; }
`;

export const IconButton = styled.button<{ $active?: boolean }>`
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    border: none;
    background: ${p => p.$active ? '#e0f2fe' : 'transparent'};
    color: ${p => p.$active ? '#0284c7' : '#b0bec5'};
    cursor: pointer;
    transition: all 150ms ease;

    &:hover { background: #e0f2fe; color: #0284c7; }
    svg { width: 13px; height: 13px; }
`;

export const DeleteButton = styled.button`
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: #b0bec5;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover { background: #fef2f2; color: #ef4444; }
    svg { width: 13px; height: 13px; }
`;

const slideDown = keyframes`
    from { max-height: 0; opacity: 0; transform: translateY(-4px); }
    to   { max-height: 160px; opacity: 1; transform: translateY(0); }
`;

export const DiscountPanel = styled.div`
    overflow: hidden;
    animation: ${slideDown} 200ms ease-out forwards;
    padding: 8px 10px 10px 14px;
    background: #fffbeb;
    border-top: 1px dashed #fde68a;
    display: flex;
    flex-direction: column;
    gap: 7px;
`;

export const DiscountTypeRow = styled.div`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
`;

export const DiscountTypePill = styled.button<{ $selected?: boolean }>`
    padding: 3px 9px;
    font-size: 11px;
    font-weight: ${p => p.$selected ? 700 : 500};
    color: ${p => p.$selected ? '#92400e' : '#78716c'};
    background: ${p => p.$selected ? '#fde68a' : '#f5f5f4'};
    border: 1.5px solid ${p => p.$selected ? '#f59e0b' : '#e7e5e4'};
    border-radius: 6px;
    cursor: pointer;
    transition: all 120ms ease;
    white-space: nowrap;
    font-family: inherit;

    &:hover { background: #fde68a; color: #92400e; border-color: #f59e0b; }
`;

export const DiscountValueRow = styled.div`
    display: flex;
    align-items: center;
    gap: 7px;
`;

export const DiscountValueInput = styled.input`
    width: 110px;
    padding: 5px 8px;
    font-size: 13px;
    font-weight: 500;
    text-align: right;
    background: #ffffff;
    border: 1.5px solid #f59e0b;
    border-radius: 8px;
    color: #0f172a;
    outline: none;
    font-variant-numeric: tabular-nums;
    font-family: inherit;
    transition: all 150ms ease;

    &:focus { box-shadow: 0 0 0 2px rgba(245,158,11,0.20); }
    &::placeholder { color: #d1cdc7; }
`;

export const DiscountValueSuffix = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #92400e;
    min-width: 20px;
`;

export const DiscountActionButtons = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    margin-left: auto;
`;

export const DiscountRemoveButton = styled.button`
    padding: 3px 9px;
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    background: transparent;
    border: 1.5px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms ease;
    white-space: nowrap;

    &:hover { color: #ef4444; border-color: #fca5a5; background: #fef2f2; }
`;

export const DiscountHideButton = styled.button`
    padding: 3px 9px;
    font-size: 11px;
    font-weight: 500;
    color: #92400e;
    background: transparent;
    border: 1.5px solid #fde68a;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms ease;
    white-space: nowrap;

    &:hover { background: #fef3c7; }
`;

export const ServiceNoteContainer = styled.div`
    padding: 0 10px 10px 14px;
`;

export const ServiceNoteTextarea = styled.textarea`
    width: 100%;
    padding: 7px 10px;
    background: #f8fafc;
    border: 1.5px solid #f1f5f9;
    border-radius: 8px;
    font-size: 12.5px;
    color: #475569;
    outline: none;
    resize: none;
    transition: all 150ms ease;
    font-family: inherit;
    line-height: 1.45;
    box-sizing: border-box;

    &::placeholder { color: #b0bec5; }
    &:hover { border-color: #e2e8f0; }
    &:focus {
        background: #ffffff;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 2px rgba(14,165,233,0.10);
    }
`;

export const SummarySection = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
`;

export const BulkDiscountTrigger = styled.button`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    color: #92400e;
    background: #fef3c7;
    border: 1.5px solid #fde68a;
    border-radius: 7px;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms ease;
    white-space: nowrap;

    svg { width: 11px; height: 11px; }
    &:hover { background: #fde68a; border-color: #f59e0b; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const SummaryTotals = styled.div`
    display: flex;
    align-items: center;
    gap: 0;
`;

export const SummaryItem = styled.div`
    display: flex;
    align-items: baseline;
    gap: 5px;
    padding: 0 14px;
    border-right: 1px solid #e2e8f0;

    &:last-child { border-right: none; padding-right: 0; }
    &:first-child { padding-left: 0; }
`;

export const SummaryLabel = styled.span`
    font-size: 11px;
    font-weight: 500;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
`;

export const SummaryValue = styled.span<{ $isTotal?: boolean }>`
    font-size: ${p => p.$isTotal ? '15px' : '13px'};
    color: ${p => p.$isTotal ? '#0f172a' : '#475569'};
    font-weight: ${p => p.$isTotal ? 700 : 500};
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
    white-space: nowrap;
`;

export const BulkDiscountOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
`;

export const BulkDiscountCard = styled.div`
    width: min(400px, calc(100vw - 32px));
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0,0,0,0.06);
`;

export const BulkDiscountHeader = styled.div`
    padding: 16px 20px 12px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

export const BulkDiscountTitle = styled.h4`
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
`;

export const BulkDiscountBody = styled.div`
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const BulkDiscountFooter = styled.div`
    padding: 12px 20px;
    background: #f8fafc;
    border-top: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
`;

export const BulkDiscountCancelBtn = styled.button`
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
    background: transparent;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms ease;
    &:hover { background: #f1f5f9; }
`;

export const BulkDiscountApplyBtn = styled.button`
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    background: #d97706;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms ease;
    &:hover { background: #b45309; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const CloseIconButton = styled.button`
    flex-shrink: 0;
    padding: 4px;
    color: #94a3b8;
    background: none;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 150ms ease;

    &:hover { color: #ef4444; background: #fef2f2; }
    svg { width: 14px; height: 14px; }
`;

export const DiscountModalServiceName = styled.p`
    margin: 2px 0 0;
    font-size: 12px;
    color: #64748b;
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 320px;
`;

/* ── "Od kwoty" box ── */
export const DiscountFromBox = styled.div`
    padding: 10px 14px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
`;

export const DiscountFromBoxLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
`;

export const DiscountFromPrices = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
`;

export const DiscountFromPrice = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

export const DiscountFromPriceValue = styled.span`
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
    line-height: 1.2;
`;

export const DiscountFromPriceLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

/* ── Section labels inside body ── */
export const DiscountSectionLabel = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
`;

/* ── Package sub-rows ── */

export const PackageSubRows = styled.div`
    position: relative;
    margin: 0 14px 10px 14px;
    background: rgba(37, 99, 235, 0.03);
    border: 1px solid rgba(37, 99, 235, 0.10);
    border-radius: 8px;
    overflow: hidden;
`;

export const PackageSubRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px 6px 12px;
    border-bottom: 1px solid rgba(37, 99, 235, 0.06);

    &:last-child { border-bottom: none; }
`;

export const PackageSubRowDot = styled.span`
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(37, 99, 235, 0.35);
    flex-shrink: 0;
`;

export const PackageSubRowName = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: #475569;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
`;

export const PackageBadgeInline = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 7px;
    background: rgba(37, 99, 235, 0.08);
    color: #2563eb;
    border: 1px solid rgba(37, 99, 235, 0.18);
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
`;

export const NoteConfirmButton = styled.button`
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 8px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #ffffff;
    background: #16a34a;
    border: none;
    border-radius: 7px;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms ease;

    svg { width: 12px; height: 12px; }
    &:hover { background: #15803d; }
`;

export const VatCell = styled.div`
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    text-align: center;
    font-variant-numeric: tabular-nums;
`;

export const VatHeaderCell = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 10px;
    font-weight: 700;
    color: #b0bec5;
    text-transform: uppercase;
    letter-spacing: 0.08em;
`;

export const VatHeaderBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    background: transparent;
    border: none;
    color: #b0bec5;
    cursor: pointer;
    border-radius: 3px;
    transition: all 150ms ease;
    flex-shrink: 0;

    svg { width: 10px; height: 10px; }
    &:hover { color: #0ea5e9; background: #e0f2fe; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;
