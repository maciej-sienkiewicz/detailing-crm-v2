import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { usePaymentMethodReport } from '../hooks/useFinance';
import type { ReportGranularity, PaymentMethodEntry } from '../types';

// ─── Colors ───────────────────────────────────────────────────────────────────

const METHOD_COLORS = {
  cash:     '#10B981',
  card:     '#3B82F6',
  transfer: '#8B5CF6',
} as const;

const METHOD_LABELS = {
  cash:     'Gotówka',
  card:     'Karta',
  transfer: 'Przelew',
} as const;

type Method = keyof typeof METHOD_COLORS;

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (pln: number) =>
  pln.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' PLN';

const fmtCompact = (pln: number): string => {
  if (pln >= 1_000_000) return (pln / 1_000_000).toFixed(1).replace('.', ',') + ' mln';
  if (pln >= 1_000)     return (pln / 1_000).toFixed(0) + ' tys.';
  return String(pln);
};

const formatPeriodLabel = (label: string, granularity: ReportGranularity): string => {
  if (granularity === 'YEARLY') return label;
  if (granularity === 'QUARTERLY') {
    const [year, q] = label.split('-');
    return `${q} ${year}`;
  }
  // MONTHLY: "2025-01" → "sty 2025"
  const [year, month] = label.split('-');
  const m = new Date(Number(year), Number(month) - 1).toLocaleDateString('pl-PL', { month: 'short' });
  return `${m} ${year}`;
};

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

// ─── Filters strip ────────────────────────────────────────────────────────────

const FiltersStrip = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  background: ${p => p.theme.colors.surfaceAlt};
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const GranularityGroup = styled.div`
  display: inline-flex;
  background: #f1f5f9;
  border-radius: 9px;
  padding: 2px;
  gap: 2px;
`;

const GranBtn = styled.button<{ $active: boolean }>`
  border: none;
  background: ${p => p.$active ? '#fff' : 'transparent'};
  padding: 5px 12px;
  border-radius: 7px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.$active ? '#0f172a' : '#64748b'};
  cursor: pointer;
  transition: all 150ms ease;
  box-shadow: ${p => p.$active ? '0 1px 3px rgba(0,0,0,0.07)' : 'none'};
  white-space: nowrap;
`;

const DateInput = styled.input`
  padding: 5px 10px;
  font-size: ${st.fontSm};
  font-family: inherit;
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${st.radiusSm};
  color: ${st.text};
  outline: none;
  transition: border-color ${st.transition};
  &:focus { border-color: ${st.accentBlue}; }
`;

const DocTypeSelect = styled.select`
  padding: 5px 10px;
  font-size: ${st.fontSm};
  font-family: inherit;
  background: ${p => p.theme.colors.surface};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${st.radiusSm};
  color: ${st.text};
  outline: none;
  cursor: pointer;
`;

const FilterSep = styled.div` flex: 1; `;

const RefreshBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: transparent;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${st.radiusSm};
  color: ${st.textMuted};
  cursor: pointer;
  transition: all ${st.transition};
  &:hover { background: ${p => p.theme.colors.surfaceAlt}; color: ${st.text}; }
  svg { width: 14px; height: 14px; }
`;

// ─── Content area ─────────────────────────────────────────────────────────────

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
`;

// ─── Method cards ─────────────────────────────────────────────────────────────

const CardsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const MethodCard = styled.div<{ $color: string }>`
  background: #fff;
  border: 1px solid ${p => p.theme.colors.border};
  border-top: 3px solid ${p => p.$color};
  border-radius: ${p => p.theme.radii.xl};
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CardIconBox = styled.div<{ $color: string; $bg: string }>`
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: ${p => p.$bg};
  color: ${p => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 16px; height: 16px; }
`;

const CardLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
`;

const CardCount = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${st.textMuted};
  margin-left: auto;
`;

const CardGross = styled.div`
  font-size: 26px;
  font-weight: 800;
  color: ${st.text};
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
`;

const CardNet = styled.div`
  font-size: 12px;
  color: ${st.textMuted};
  font-variant-numeric: tabular-nums;
`;

const SkeletonPulse = styled.div<{ $h?: string; $w?: string }>`
  height: ${p => p.$h ?? '14px'};
  width: ${p => p.$w ?? '100%'};
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 0%, #f8fafc 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

// ─── Charts section ───────────────────────────────────────────────────────────

const ChartsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: #fff;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.xl};
  padding: 16px 20px 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;

const ChartTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
  margin-bottom: 16px;
`;

const DonutWrapper = styled.div`
  position: relative;
`;

const DonutCenterOverlay = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const DonutCenterValue = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: ${st.text};
  line-height: 1;
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
`;

const DonutCenterSub = styled.div`
  font-size: 10px;
  color: ${st.textMuted};
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ChartLegend = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: 18px;
`;

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
`;

const LegendDot = styled.div<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${p => p.$color};
  flex-shrink: 0;
`;

const LegendName = styled.div`
  font-size: 13px;
  color: ${st.text};
  flex: 1;
`;

const LegendValue = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${st.text};
  font-variant-numeric: tabular-nums;
`;

const LegendPct = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  width: 36px;
  text-align: right;
`;

// ─── Period breakdown table ───────────────────────────────────────────────────

const TableCard = styled.div`
  background: #fff;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: ${p => p.theme.radii.xl};
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;

const TableHead = styled.div`
  display: grid;
  grid-template-columns: 1fr repeat(3, 1fr);
  background: ${st.bg};
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const Th = styled.div`
  padding: 10px 14px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
`;

const ThMethod = styled(Th)<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${p => p.$color};

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
  }
`;

const TableRow = styled.div<{ $even?: boolean }>`
  display: grid;
  grid-template-columns: 1fr repeat(3, 1fr);
  border-bottom: 1px solid #f1f5f9;
  background: ${p => p.$even ? p.theme.colors.surfaceAlt : '#fff'};
  &:last-child { border-bottom: none; }
`;

const TotalRow = styled(TableRow)`
  background: #f8fafc;
  border-top: 1px solid ${p => p.theme.colors.border};
  border-bottom: none;
`;

const Td = styled.div`
  padding: 10px 14px;
  font-size: 13px;
  color: ${st.text};
`;

const TdPeriod = styled(Td)`
  font-weight: 600;
  color: ${st.textSecondary};
`;

const TdGross = styled.div`
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.3px;
  color: ${st.text};
`;

const TdNet = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  font-variant-numeric: tabular-nums;
`;

const TdCount = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 1px;
`;

// ─── Empty / Error states ─────────────────────────────────────────────────────

const EmptyBox = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: ${st.textMuted};
  font-size: ${st.fontSm};
`;

const ErrorBox = styled.div`
  padding: 24px;
  text-align: center;
  color: #dc2626;
  font-size: ${st.fontSm};
`;

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const TooltipBox = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  font-size: 12px;
  color: ${st.text};
`;

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  isRevenue?: boolean;
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({ active, payload, isRevenue }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <TooltipBox>
      <div style={{ color: item.fill, fontWeight: 700, marginBottom: 2 }}>{item.name}</div>
      <div>{isRevenue ? fmt(item.value) : `${item.value} płatności`}</div>
    </TooltipBox>
  );
};

// ─── Method icon SVGs ─────────────────────────────────────────────────────────

const CashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const CardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const TransferIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const METHOD_ICONS: Record<Method, React.FC> = {
  cash: CashIcon,
  card: CardIcon,
  transfer: TransferIcon,
};

// ─── Method card component ────────────────────────────────────────────────────

interface MethodCardProps {
  method: Method;
  data: PaymentMethodEntry;
  isLoading: boolean;
}

const MethodCardItem: React.FC<MethodCardProps> = ({ method, data, isLoading }) => {
  const color = METHOD_COLORS[method];
  const bg = `${color}18`;
  const Icon = METHOD_ICONS[method];

  return (
    <MethodCard $color={color}>
      <CardHeader>
        <CardIconBox $color={color} $bg={bg}><Icon /></CardIconBox>
        <CardLabel>{METHOD_LABELS[method]}</CardLabel>
          {!isLoading && (
              <CardCount>
                  {data.count} {data.count === 1 ? 'płatność' : 'płatności'}
              </CardCount>
          )}
      </CardHeader>
      {isLoading ? (
        <>
          <SkeletonPulse $h="26px" $w="60%" />
          <SkeletonPulse $h="12px" $w="45%" />
        </>
      ) : (
        <>
          <CardGross>{fmt(data.totalGross)}</CardGross>
          <CardNet>{fmt(data.totalNet)} netto</CardNet>
        </>
      )}
    </MethodCard>
  );
};

// ─── Donut chart component ────────────────────────────────────────────────────

interface DonutChartProps {
  data: Array<{ name: string; value: number; fill: string }>;
  centerValue: string;
  centerLabel: string;
  legendFormatter: (value: number) => string;
  total: number;
  isRevenue: boolean;
}

const DonutChart: React.FC<DonutChartProps> = ({
  data, centerValue, centerLabel, legendFormatter, total, isRevenue,
}) => (
  <>
    <DonutWrapper>
      <ResponsiveContainer width="100%" height={190}>
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            cornerRadius={3}
            dataKey="value"
            isAnimationActive
            animationBegin={0}
            animationDuration={450}
            animationEasing="ease-out"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip isRevenue={isRevenue} />} />
        </PieChart>
      </ResponsiveContainer>
      <DonutCenterOverlay>
        <DonutCenterValue>{centerValue}</DonutCenterValue>
        <DonutCenterSub>{centerLabel}</DonutCenterSub>
      </DonutCenterOverlay>
    </DonutWrapper>
    <ChartLegend>
      {data.map(item => (
        <LegendRow key={item.name}>
          <LegendDot $color={item.fill} />
          <LegendName>{item.name}</LegendName>
          <LegendValue>{legendFormatter(item.value)}</LegendValue>
          <LegendPct>
            {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : '—'}
          </LegendPct>
        </LegendRow>
      ))}
    </ChartLegend>
  </>
);

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_DATE_FROM = new Date(new Date().getFullYear(), 0, 1)
  .toISOString().slice(0, 10);
const DEFAULT_DATE_TO = new Date().toISOString().slice(0, 10);

export const PaymentSummaryTab: React.FC = () => {
  const [granularity, setGranularity] = useState<ReportGranularity>('MONTHLY');
  const [dateFrom, setDateFrom] = useState(DEFAULT_DATE_FROM);
  const [dateTo, setDateTo]     = useState(DEFAULT_DATE_TO);
  const [docType, setDocType]   = useState('');

  const { report, isLoading, isError, refetch } = usePaymentMethodReport({
    granularity,
    dateFrom: dateFrom || undefined,
    dateTo:   dateTo   || undefined,
    documentType: docType || undefined,
  });

  const totals  = report?.totals;
  const methods: Method[] = ['cash', 'card', 'transfer'];

  const totalCount = totals ? methods.reduce((s, m) => s + totals[m].count, 0) : 0;
  const totalGross = totals ? methods.reduce((s, m) => s + totals[m].totalGross, 0) : 0;

  const countChartData = totals
    ? methods.map(m => ({ name: METHOD_LABELS[m], value: totals[m].count, fill: METHOD_COLORS[m] }))
    : [];

  const revenueChartData = totals
    ? methods.map(m => ({ name: METHOD_LABELS[m], value: totals[m].totalGross, fill: METHOD_COLORS[m] }))
    : [];

  // Only show periods that have at least one payment recorded
  const activePeriods = report?.periods.filter(
    p => p.cash.count > 0 || p.card.count > 0 || p.transfer.count > 0,
  ) ?? [];

  return (
    <>
      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <FiltersStrip>
        <GranularityGroup>
          {(['MONTHLY', 'QUARTERLY', 'YEARLY'] as ReportGranularity[]).map(g => (
            <GranBtn key={g} $active={granularity === g} onClick={() => setGranularity(g)}>
              {{ MONTHLY: 'Miesięcznie', QUARTERLY: 'Kwartalnie', YEARLY: 'Rocznie' }[g]}
            </GranBtn>
          ))}
        </GranularityGroup>

        <DateInput
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          title="Data od"
        />
        <DateInput
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          title="Data do"
        />

        <DocTypeSelect value={docType} onChange={e => setDocType(e.target.value)}>
          <option value="">Wszystkie typy</option>
          <option value="INVOICE">Faktury</option>
          <option value="RECEIPT">Paragony</option>
          <option value="OTHER">Inne</option>
        </DocTypeSelect>

        <FilterSep />
        <RefreshBtn onClick={() => refetch()} title="Odśwież">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </RefreshBtn>
      </FiltersStrip>

      {isError && (
        <ErrorBox>
          Nie udało się załadować raportu.{' '}
          <button onClick={() => refetch()}>Spróbuj ponownie</button>
        </ErrorBox>
      )}

      <Content>
        {/* ── Method summary cards ─────────────────────────────────────── */}
        <CardsRow>
          {methods.map(m => (
            <MethodCardItem
              key={m}
              method={m}
              data={totals?.[m] ?? { count: 0, totalNet: 0, totalGross: 0 }}
              isLoading={isLoading}
            />
          ))}
        </CardsRow>

        {/* ── Pie charts ───────────────────────────────────────────────── */}
        {!isLoading && totals && totalCount > 0 && (
          <ChartsRow>
            <ChartCard>
              <ChartTitle>Liczba płatności</ChartTitle>
              <DonutChart
                data={countChartData}
                centerValue={String(totalCount)}
                centerLabel="płatności"
                legendFormatter={v => `${v} ${v === 1 ? 'płatność' : 'płatności'}`}
                total={totalCount}
                isRevenue={false}
              />
            </ChartCard>

            <ChartCard>
              <ChartTitle>Przychód (brutto)</ChartTitle>
              <DonutChart
                data={revenueChartData}
                centerValue={fmtCompact(totalGross)}
                centerLabel="PLN brutto"
                legendFormatter={v => `${fmtCompact(v)} PLN`}
                total={totalGross}
                isRevenue
              />
            </ChartCard>
          </ChartsRow>
        )}

        {/* ── Period breakdown table ────────────────────────────────────── */}
        {!isLoading && activePeriods.length > 0 && (
          <TableCard>
            <TableHead>
              <Th>Okres</Th>
              <ThMethod $color={METHOD_COLORS.cash}>Gotówka</ThMethod>
              <ThMethod $color={METHOD_COLORS.card}>Karta</ThMethod>
              <ThMethod $color={METHOD_COLORS.transfer}>Przelew</ThMethod>
            </TableHead>

            {activePeriods.map((period, idx) => (
              <TableRow key={period.periodLabel} $even={idx % 2 === 0}>
                <TdPeriod>{formatPeriodLabel(period.periodLabel, report!.granularity)}</TdPeriod>
                {methods.map(m => (
                  <Td key={m}>
                    <TdGross>{period[m].totalGross > 0 ? fmt(period[m].totalGross) : '—'}</TdGross>
                    {period[m].totalNet > 0 && (
                      <TdNet>{fmt(period[m].totalNet)} netto</TdNet>
                    )}
                    {period[m].count > 0 && (
                      <TdCount>{period[m].count} szt.</TdCount>
                    )}
                  </Td>
                ))}
              </TableRow>
            ))}

            {totals && (
              <TotalRow>
                <Td style={{ fontWeight: 700 }}>ŁĄCZNIE</Td>
                {methods.map(m => (
                  <Td key={m}>
                    <TdGross>{fmt(totals[m].totalGross)}</TdGross>
                    <TdNet>{fmt(totals[m].totalNet)} netto</TdNet>
                    <TdCount>{totals[m].count} szt.</TdCount>
                  </Td>
                ))}
              </TotalRow>
            )}
          </TableCard>
        )}

        {!isLoading && report && activePeriods.length === 0 && (
          <EmptyBox>Brak danych dla wybranego zakresu.</EmptyBox>
        )}

        {isLoading && (
          <TableCard style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonPulse key={i} $h="32px" />
            ))}
          </TableCard>
        )}
      </Content>
    </>
  );
};
