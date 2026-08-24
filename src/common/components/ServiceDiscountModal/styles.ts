// src/common/components/ServiceDiscountModal/styles.ts
import styled from 'styled-components';

export const Overlay = styled.div`
    position: fixed;
    inset: 0;
    height: 100vh;
    height: 100dvh;
    background: rgba(15, 23, 42, 0.38);
    display: flex;
    align-items: center;
    justify-content: center;
    padding:
        max(16px, env(safe-area-inset-top, 0px))
        max(16px, env(safe-area-inset-right, 0px))
        max(16px, env(safe-area-inset-bottom, 0px))
        max(16px, env(safe-area-inset-left, 0px));
    z-index: 9999;
`;

export const Card = styled.div`
    width: min(400px, calc(100vw - 32px));
    /* Wysokość liczy nakładka (z safe-area i klawiaturą), karta bierze tyle,
       ile dostanie — inaczej stopka z przyciskami wychodziła poza ekran. */
    max-height: 100%;
    display: flex;
    flex-direction: column;
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 20px 40px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.06);
`;

export const Header = styled.div`
    flex-shrink: 0;
    padding: 16px 20px 12px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

export const Title = styled.h4`
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
`;

export const ServiceName = styled.p`
    margin: 2px 0 0;
    font-size: 12px;
    color: #64748b;
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
`;

export const CloseBtn = styled.button`
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

export const Body = styled.div`
    padding: 16px 20px;
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const Footer = styled.div`
    flex-shrink: 0;
    padding: 12px 20px;
    background: #f8fafc;
    border-top: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
`;

/* ── "Cena przed rabatem" box ── */
export const FromBox = styled.div`
    padding: 10px 14px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
`;

export const FromBoxLabel = styled.div`
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
`;

export const FromPrices = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
`;

export const FromPrice = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

export const FromPriceValue = styled.span`
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
    line-height: 1.2;
`;

export const FromPriceLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

export const SectionLabel = styled.div`
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
`;

export const TypeRow = styled.div`
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
`;

export const TypePill = styled.button<{ $selected?: boolean }>`
    padding: 5px 11px;
    font-size: 12px;
    font-weight: ${p => p.$selected ? 700 : 500};
    color: ${p => p.$selected ? '#92400e' : '#78716c'};
    background: ${p => p.$selected ? '#fde68a' : '#f5f5f4'};
    border: 1.5px solid ${p => p.$selected ? '#f59e0b' : '#e7e5e4'};
    border-radius: 7px;
    cursor: pointer;
    transition: all 120ms ease;
    white-space: nowrap;
    font-family: inherit;

    &:hover { background: #fde68a; color: #92400e; border-color: #f59e0b; }
`;

export const ValueRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const ValueInput = styled.input`
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    font-size: 15px;
    font-weight: 600;
    text-align: right;
    background: #ffffff;
    border: 1.5px solid #f59e0b;
    border-radius: 8px;
    color: #0f172a;
    outline: none;
    font-variant-numeric: tabular-nums;
    font-family: inherit;
    transition: all 150ms ease;

    &:focus { box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18); }
    &::placeholder { color: #d1cdc7; font-weight: 400; }
`;

export const ValueSuffix = styled.span`
    font-size: 14px;
    font-weight: 700;
    color: #92400e;
    min-width: 22px;
`;

export const ResultBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 14px;
    background: rgba(16, 185, 129, 0.07);
    border: 1.5px solid rgba(16, 185, 129, 0.28);
    border-radius: 10px;
`;

export const ResultHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

export const ResultLabel = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: #047857;
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

export const ResultValue = styled.span<{ $strong?: boolean }>`
    font-size: ${p => p.$strong ? '17px' : '14px'};
    font-weight: ${p => p.$strong ? 700 : 600};
    color: ${p => p.$strong ? '#065f46' : '#047857'};
    font-variant-numeric: tabular-nums;
    line-height: 1.25;
`;

export const SavedChip = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: #047857;
    background: rgba(16, 185, 129, 0.14);
    border-radius: 999px;
    padding: 3px 9px;
    white-space: nowrap;
`;

export const RemoveBtn = styled.button`
    margin-right: auto;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    background: transparent;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms ease;
    white-space: nowrap;

    &:hover { color: #ef4444; border-color: #fca5a5; background: #fef2f2; }
`;

export const CancelBtn = styled.button`
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

export const ApplyBtn = styled.button`
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
