// src/modules/live-metrics/components/EventFeed.tsx
import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { cardEntrance } from '@/modules/statistics/components/shared/animations';
import { ATTRIBUTE_LABELS, seriesColor, seriesLabel } from './liveMetricsTheme';
import { formatClock } from './format';
import type { BusinessEventDto } from '../types';

const highlight = keyframes`
    from { background: rgba(59, 130, 246, 0.12); }
    to   { background: transparent; }
`;

const Card = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    padding: 20px;
    min-width: 0;
    ${cardEntrance}
`;

const Title = styled.h3`
    margin: 0 0 4px;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const Description = styled.p`
    margin: 0 0 12px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
`;

const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 340px;
    overflow-y: auto;
`;

const Item = styled.li`
    display: grid;
    grid-template-columns: 46px 10px 1fr;
    gap: 10px;
    align-items: baseline;
    padding: 8px 2px;
    border-bottom: 1px solid ${st.border};
    animation: ${highlight} 900ms ease-out;

    &:last-child { border-bottom: none; }

    @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const Time = styled.time`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-variant-numeric: tabular-nums;
`;

const Swatch = styled.span<{ $color: string }>`
    width: 9px;
    height: 9px;
    border-radius: 3px;
    background: ${p => p.$color};
    transform: translateY(1px);
`;

const Body = styled.div`
    min-width: 0;
    font-size: ${st.fontSm};
    color: ${st.text};
`;

const Context = styled.span`
    color: ${st.textSecondary};
    font-size: ${st.fontXs};
    margin-left: 6px;
    word-break: break-word;
`;

const Empty = styled.div`
    padding: 32px 0;
    text-align: center;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

/** Identyfikatory skracamy: w strumieniu liczy się „co", nie pełny UUID. */
const shortValue = (value: string): string => (value.length > 24 ? `${value.slice(0, 8)}…` : value);

const describe = (event: BusinessEventDto): string =>
    Object.entries(event.attributes)
        .filter(([key]) => key !== 'userId')
        .slice(0, 3)
        .map(([key, value]) => `${ATTRIBUTE_LABELS[key] ?? key}: ${shortValue(value)}`)
        .join(' · ');

interface Props {
    events: BusinessEventDto[];
    zone: string;
}

/**
 * Surowy strumień zdarzeń — widok tabelaryczny obok wykresów.
 *
 * Wykres mówi ile, ta lista mówi które. Bez niej „nagle 12 zdjęć" nie da się
 * z niczym powiązać, a to zwykle pierwsze pytanie po zobaczeniu skoku.
 */
export const EventFeed = ({ events, zone }: Props) => (
    <Card>
        <Title>Ostatnie zdarzenia</Title>
        <Description>
            Strumień na żywo z WebSocketu. Ten sam kanał zasila kafle i wykresy powyżej.
        </Description>
        {events.length === 0 ? (
            <Empty>Jeszcze nic się nie wydarzyło</Empty>
        ) : (
            <List aria-live="polite">
                {events.map(event => {
                    const name = event.series[event.series.length - 1];
                    const context = describe(event);
                    return (
                        <Item key={event.id}>
                            <Time dateTime={event.occurredAt}>{formatClock(event.occurredAt, zone)}</Time>
                            <Swatch $color={seriesColor(name)} />
                            <Body>
                                {seriesLabel(name)}
                                {context && <Context>{context}</Context>}
                            </Body>
                        </Item>
                    );
                })}
            </List>
        )}
    </Card>
);
