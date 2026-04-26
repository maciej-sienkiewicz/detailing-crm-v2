import styled, { keyframes, css } from 'styled-components';
import { TIME_COL_W } from './layout';

const pulse = keyframes`
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.55; }
`;

// ─── Root ─────────────────────────────────────────────────────────────────────

export const Root = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #f8fafc;
    overflow: hidden;
`;

// ─── Stats strip ──────────────────────────────────────────────────────────────

export const StatsBar = styled.div`
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 16px;
    background: #fff;
    border-bottom: 1px solid rgba(15, 23, 42, 0.07);
    flex-shrink: 0;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

export const StatCell = styled.div`
    display: flex;
    flex-direction: column;
    padding: 8px 20px 8px 0;
    margin-right: 20px;
    border-right: 1px solid rgba(15, 23, 42, 0.06);
    flex-shrink: 0;

    &:last-child { border-right: none; margin-right: 0; }
`;

export const StatLabel = styled.span`
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: rgba(100, 116, 139, 0.6);
    white-space: nowrap;
`;

export const StatValue = styled.span<{ $accent?: boolean }>`
    font-size: 16px;
    font-weight: 700;
    color: ${p => p.$accent ? '#6366f1' : '#0f172a'};
    letter-spacing: -0.3px;
    white-space: nowrap;
`;

// ─── All-day strip ────────────────────────────────────────────────────────────

export const AllDayStrip = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 6px 12px 6px ${TIME_COL_W + 12}px;
    background: #fff;
    border-bottom: 1px solid rgba(15, 23, 42, 0.07);
    flex-wrap: wrap;
    flex-shrink: 0;
`;

export const AllDayChip = styled.div<{ $color: string }>`
    padding: 3px 10px;
    border-radius: 4px;
    background: ${p => p.$color}22;
    border-left: 3px solid ${p => p.$color};
    font-size: 12px;
    font-weight: 600;
    color: #1e293b;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s;
    &:hover { opacity: 0.8; }
`;

// ─── Timeline scroll ──────────────────────────────────────────────────────────

export const TimelineScroll = styled.div`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.12); border-radius: 3px; }
`;

export const TimelineGrid = styled.div<{ $totalPx: number }>`
    position: relative;
    height: ${p => p.$totalPx}px;
    display: flex;
`;

// ─── Time column ──────────────────────────────────────────────────────────────

export const TimeCol = styled.div`
    width: ${TIME_COL_W}px;
    flex-shrink: 0;
    position: relative;
`;

export const HourLabel = styled.div<{ $topPx: number }>`
    position: absolute;
    top: ${p => p.$topPx - 9}px;
    right: 10px;
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.02em;
    user-select: none;
    white-space: nowrap;
`;

// ─── Events area ──────────────────────────────────────────────────────────────

export const EventsArea = styled.div`
    flex: 1;
    position: relative;
    min-width: 0;
    padding-right: 12px;
`;

export const HourLine = styled.div<{ $topPx: number; $isHalf?: boolean }>`
    position: absolute;
    top: ${p => p.$topPx}px;
    left: 0;
    right: 0;
    height: 1px;
    background: ${p => p.$isHalf
        ? 'rgba(15, 23, 42, 0.04)'
        : 'rgba(15, 23, 42, 0.08)'};
    pointer-events: none;
`;

// ─── Now indicator ────────────────────────────────────────────────────────────

export const NowLine = styled.div<{ $topPx: number }>`
    position: absolute;
    top: ${p => p.$topPx}px;
    left: -4px;
    right: 0;
    height: 2px;
    background: #ef4444;
    pointer-events: none;
    z-index: 10;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: -4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ef4444;
        animation: ${pulse} 2s ease-in-out infinite;
    }
`;

// ─── Event card (positioned) ──────────────────────────────────────────────────

export const CardWrap = styled.div<{
    $topPx: number;
    $heightPx: number;
    $leftPct: number;
    $widthPct: number;
    $color: string;
    $dimmed: boolean;
}>`
    position: absolute;
    top: ${p => p.$topPx}px;
    height: ${p => p.$heightPx}px;
    left: ${p => p.$leftPct}%;
    width: ${p => p.$widthPct}%;
    padding: 0 2px;
    box-sizing: border-box;
    z-index: 2;
    opacity: ${p => p.$dimmed ? 0.45 : 1};
    transition: opacity 0.15s;
`;

export const CardInner = styled.div<{ $color: string; $crossedOut: boolean }>`
    height: 100%;
    background: #fff;
    border-left: 3px solid ${p => p.$color};
    border-radius: 0 6px 6px 0;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.05);
    padding: 4px 7px;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 1px;
    transition: box-shadow 0.15s, transform 0.12s;
    text-decoration: ${p => p.$crossedOut ? 'line-through' : 'none'};

    &:hover {
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.08);
        transform: translateX(1px);
        z-index: 20;
    }
`;

export const CardStatusDot = styled.span<{ $color: string }>`
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
    margin-right: 4px;
    margin-top: 1px;
`;

export const CardStatusRow = styled.div`
    display: flex;
    align-items: center;
    overflow: hidden;
`;

export const CardStatusLabel = styled.span<{ $color: string }>`
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${p => p.$color};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const CardTitle = styled.div`
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const CardMeta = styled.div`
    font-size: 10px;
    color: #64748b;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const CardFooter = styled.div`
    margin-top: auto;
    padding-top: 2px;
    font-size: 10px;
    color: #94a3b8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

// ─── Compact card variant (< 36px height) ────────────────────────────────────

export const CompactCard = styled.div<{ $color: string; $dimmed: boolean }>`
    height: 100%;
    background: ${p => p.$color}18;
    border-left: 3px solid ${p => p.$color};
    border-radius: 0 4px 4px 0;
    padding: 2px 6px;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: ${p => p.$dimmed ? 0.45 : 1};
    transition: opacity 0.15s, box-shadow 0.15s;

    &:hover {
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
    }
`;

export const CompactTitle = styled.span`
    font-size: 10px;
    font-weight: 700;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;
