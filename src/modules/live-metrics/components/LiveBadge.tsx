// src/modules/live-metrics/components/LiveBadge.tsx
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const pulse = keyframes`
    0%   { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45); }
    100% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
`;

const Badge = styled.span<{ $live: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: ${st.radiusFull};
    background: ${p => (p.$live ? st.bgAccentGreen : st.bgCardAlt)};
    border: 1px solid ${p => (p.$live ? st.accentGreenDim : st.border)};
    font-size: ${st.fontSm};
    color: ${p => (p.$live ? st.accentGreen : st.textSecondary)};
    font-weight: 600;
    white-space: nowrap;
`;

const Dot = styled.span<{ $live: boolean }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => (p.$live ? st.accentGreen : st.textMuted)};
    animation: ${p => (p.$live ? pulse : 'none')} 1.8s ease-out infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

interface Props {
    /** Czy dotarła już choć jedna ramka z WebSocketu. */
    isLive: boolean;
    /** Czy trwa odświeżanie pełnej migawki. */
    isRefreshing: boolean;
}

/**
 * Stan kanału na żywo. „Nasłuchiwanie" zamiast „rozłączono", dopóki nic nie przyszło:
 * cisza w małym studiu jest normalna i nie powinna wyglądać jak awaria.
 */
export const LiveBadge = ({ isLive, isRefreshing }: Props) => (
    <Badge $live={isLive} title={isLive ? 'Zdarzenia płyną przez WebSocket' : 'Połączono, czekam na pierwsze zdarzenie'}>
        <Dot $live={isLive} />
        {isLive ? 'Na żywo' : isRefreshing ? 'Odświeżanie…' : 'Nasłuchiwanie'}
    </Badge>
);
