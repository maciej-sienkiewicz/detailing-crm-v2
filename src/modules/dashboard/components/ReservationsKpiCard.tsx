import { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useDashboardReservations } from '../hooks/useDashboardReservations';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
  position: relative;
  flex-shrink: 0;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    width: 100%;
  }
`;

const Card = styled.div`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 18px 22px;
  min-width: 220px;
  backdrop-filter: blur(4px);
  cursor: default;
  transition: border-color 180ms ease;

  &:hover {
    border-color: rgba(255,255,255,0.18);
  }

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    min-width: 0;
    width: 100%;
  }
`;

const Eyebrow = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 6px;
`;

const Number = styled.div`
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -1.2px;
  line-height: 1;
  color: #fff;
  font-variant-numeric: tabular-nums;
`;

const Delta = styled.div<{ $positive: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.$positive ? '#10b981' : '#f87171'};
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  svg { width: 13px; height: 13px; stroke-width: 2.5; }
`;

// ─── Chart popover ────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const ChartPopover = styled.div<{ $top: number; $right: number }>`
  position: fixed;
  top: ${p => p.$top}px;
  right: ${p => p.$right}px;
  width: 340px;
  background: rgba(15, 23, 42, 0.97);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 18px 16px 12px;
  backdrop-filter: blur(20px);
  box-shadow: 0 16px 48px rgba(0,0,0,0.4);
  z-index: 9999;
  animation: ${fadeIn} 160ms ease;
  pointer-events: none;
`;

const ChartTitle = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
`;

const CustomTooltipBox = styled.div`
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  color: #f1f5f9;
  pointer-events: none;
`;

const ACCENT = '#8b5cf6';

// ─── Component ────────────────────────────────────────────────────────────────

export const ReservationsKpiCard = () => {
  const { data } = useDashboardReservations();
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.buckets.map(b => {
      const d = new Date(b.weekStart);
      return {
        weekLabel: d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
        value: b.count,
      };
    });
  }, [data]);

  if (!data) return null;

  const positive = data.deltaPercentage >= 0;
  const lastIdx = chartData.length - 1;

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
    }
    setHovered(true);
  };

  return (
    <Wrapper
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setHovered(false)}
    >
      <Card>
        <Eyebrow>Rezerwacje · tydzień</Eyebrow>
        <Number>{data.currentWeek.count}</Number>
        <Delta $positive={positive}>
          {positive ? <TrendingUp /> : <TrendingDown />}
          {positive ? '+' : ''}{data.deltaPercentage.toFixed(1)}% vs. poprzedni tydzień
        </Delta>
      </Card>

      {hovered && createPortal(
        <ChartPopover $top={pos.top} $right={pos.right}>
          <ChartTitle>Ostatnie 3 miesiące</ChartTitle>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={14}>
              <XAxis
                dataKey="weekLabel"
                tick={{ fill: '#475569', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(139,92,246,0.08)' }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <CustomTooltipBox>
                      <div style={{ color: '#94a3b8', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontWeight: 700 }}>{payload[0].value} rezerwacji</div>
                    </CustomTooltipBox>
                  ) : null
                }
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === lastIdx ? ACCENT : 'rgba(139,92,246,0.35)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPopover>,
        document.body
      )}
    </Wrapper>
  );
};
