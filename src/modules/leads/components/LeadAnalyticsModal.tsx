// src/modules/leads/components/LeadAnalyticsModal.tsx
import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { BarChart2, Users, X, TrendingUp, TrendingDown, Minus, Award, Target, Clock } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { Modal } from '@/common/components/Modal/Modal';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useServiceAnalytics, useEmployeeStats, useLeadTimeAnalytics } from '../hooks';
import { formatCurrency } from '../utils/formatters';
import type { LeadSource } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 400px;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid ${st.border};
  gap: 0;
  margin-bottom: 20px;
`;

const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: ${p => p.$active ? 700 : 500};
  color: ${p => p.$active ? '#0ea5e9' : st.textSecondary};
  border-bottom: 2px solid ${p => p.$active ? '#0ea5e9' : 'transparent'};
  margin-bottom: -1px;
  cursor: pointer;
  transition: all 180ms ease;
  white-space: nowrap;

  &:hover { color: #0ea5e9; }
  svg { width: 14px; height: 14px; }
`;

const DateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const DateLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${st.textMuted};
`;

const DateInput = styled.input`
  padding: 6px 10px;
  font-size: 12px;
  font-family: inherit;
  border: 1.5px solid ${st.border};
  border-radius: 8px;
  background: #f8fafc;
  color: ${st.text};
  outline: none;
  cursor: pointer;
  transition: border-color 180ms;

  &:focus { border-color: #0ea5e9; }
`;

const DateSep = styled.span`
  font-size: 12px;
  color: ${st.textMuted};
`;

// ─── Service analytics ────────────────────────────────────────────────────────

const ServiceTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid ${st.border};
  border-radius: 10px;
  overflow: hidden;
`;

const ServiceHead = styled.div`
  display: grid;
  grid-template-columns: 1fr 70px 70px 70px 100px;
  gap: 8px;
  padding: 8px 14px;
  background: ${st.bg};
  border-bottom: 1px solid ${st.border};
`;

const HeadCell = styled.span`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
  text-align: right;

  &:first-child { text-align: left; }
`;

const ServiceRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 70px 70px 70px 100px;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  animation: ${fadeIn} 200ms ease both;

  &:last-child { border-bottom: none; }
  &:hover { background: #f8fafc; }
`;

const ServiceName = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${st.text};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NumCell = styled.span<{ $color?: string }>`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.$color ?? st.text};
  text-align: right;
  font-variant-numeric: tabular-nums;
`;

const WinRateBar = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #f1f5f9;
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${p => p.$pct}%;
  border-radius: 3px;
  background: ${p => p.$color};
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
`;

const BarLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${st.text};
  white-space: nowrap;
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
`;

// ─── Employee stats ───────────────────────────────────────────────────────────

const EmpTable = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid ${st.border};
  border-radius: 10px;
  overflow: hidden;
`;

const EmpHead = styled.div`
  display: grid;
  grid-template-columns: 1fr 60px 60px 60px 90px 100px;
  gap: 8px;
  padding: 8px 14px;
  background: ${st.bg};
  border-bottom: 1px solid ${st.border};
`;

const EmpRow = styled.div<{ $rank?: number }>`
  display: grid;
  grid-template-columns: 1fr 60px 60px 60px 90px 100px;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  animation: ${fadeIn} 200ms ease both;
  background: ${p => p.$rank === 0 ? 'rgba(16, 185, 129, 0.04)' : 'transparent'};

  &:last-child { border-bottom: none; }
  &:hover { background: #f8fafc; }
`;

const EmpName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const EmpAvatar = styled.div<{ $rank?: number }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${p => p.$rank === 0 ? 'rgba(16, 185, 129, 0.15)' : '#f1f5f9'};
  color: ${p => p.$rank === 0 ? '#059669' : '#64748b'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
`;

const EmpNameText = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ConvRate = styled.span<{ $rate: number }>`
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${p =>
    p.$rate >= 60 ? '#059669' :
    p.$rate >= 40 ? '#d97706' :
    '#dc2626'
  };
`;

// ─── Empty / loading ──────────────────────────────────────────────────────────

const SkeletonRow = styled.div`
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  gap: 12px;
`;

const SkeletonPulse = styled.div<{ $w?: string }>`
  height: 13px;
  width: ${p => p.$w ?? '100%'};
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 0%, #f8fafc 50%, #f1f5f9 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const EmptyBox = styled.div`
  padding: 48px 24px;
  text-align: center;
  color: ${st.textMuted};
  font-size: ${st.fontSm};
`;

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
`;

const SummaryCard = styled.div<{ $color: string; $bg: string }>`
  padding: 12px 14px;
  background: ${p => p.$bg};
  border: 1px solid ${st.border};
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SummaryValue = styled.div<{ $color: string }>`
  font-size: 20px;
  font-weight: 800;
  color: ${p => p.$color};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
`;

const SummaryLabel = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  font-weight: 500;
`;

// ─── Service analytics tab ────────────────────────────────────────────────────

interface ServiceAnalyticsTabProps {
  dateFrom?: string;
  dateTo?: string;
}

const ServiceAnalyticsTab: React.FC<ServiceAnalyticsTabProps> = ({ dateFrom, dateTo }) => {
  const { data, isLoading, isError } = useServiceAnalytics(dateFrom, dateTo);

  const totalWon = data.reduce((s, r) => s + r.wonCount, 0);
  const totalLost = data.reduce((s, r) => s + r.lostCount, 0);
  const totalAll = data.reduce((s, r) => s + r.totalCount, 0);
  const overallWinRate = totalAll > 0 ? (totalWon / totalAll) * 100 : 0;

  const winRateColor = (rate: number) =>
    rate >= 70 ? '#059669' : rate >= 50 ? '#d97706' : '#dc2626';

  if (isError) {
    return <EmptyBox>Nie udało się załadować danych analitycznych.</EmptyBox>;
  }

  return (
    <div>
      <SummaryCards>
        <SummaryCard $color="#059669" $bg="rgba(16,185,129,0.06)">
          <SummaryValue $color="#059669">{totalWon}</SummaryValue>
          <SummaryLabel>Wygranych leadów</SummaryLabel>
        </SummaryCard>
        <SummaryCard $color="#dc2626" $bg="rgba(220,38,38,0.06)">
          <SummaryValue $color="#dc2626">{totalLost}</SummaryValue>
          <SummaryLabel>Przegranych leadów</SummaryLabel>
        </SummaryCard>
        <SummaryCard $color="#0ea5e9" $bg="rgba(14,165,233,0.06)">
          <SummaryValue $color="#0ea5e9">{overallWinRate.toFixed(1)}%</SummaryValue>
          <SummaryLabel>Ogólna konwersja</SummaryLabel>
        </SummaryCard>
      </SummaryCards>

      <SectionTitle>
        <Target size={13} />
        Wyniki per usługa
      </SectionTitle>

      <ServiceTable>
        <ServiceHead>
          <HeadCell>Usługa</HeadCell>
          <HeadCell>Wygrane</HeadCell>
          <HeadCell>Stracone</HeadCell>
          <HeadCell>Suma</HeadCell>
          <HeadCell>Win rate</HeadCell>
        </ServiceHead>

        {isLoading ? (
          Array.from({ length: 5 }, (_, i) => (
            <SkeletonRow key={i}>
              <SkeletonPulse $w="40%" />
              <SkeletonPulse $w="12%" />
              <SkeletonPulse $w="12%" />
              <SkeletonPulse $w="12%" />
              <SkeletonPulse $w="20%" />
            </SkeletonRow>
          ))
        ) : data.length === 0 ? (
          <EmptyBox>Brak danych — oznacz leady tagami usług, żeby zobaczyć statystyki.</EmptyBox>
        ) : (
          data.map((item, i) => (
            <ServiceRow key={i}>
              <ServiceName title={item.serviceName}>{item.serviceName}</ServiceName>
              <NumCell $color="#059669">{item.wonCount}</NumCell>
              <NumCell $color="#dc2626">{item.lostCount}</NumCell>
              <NumCell>{item.totalCount}</NumCell>
              <WinRateBar>
                <BarTrack>
                  <BarFill $pct={item.winRate} $color={winRateColor(item.winRate)} />
                </BarTrack>
                <BarLabel style={{ color: winRateColor(item.winRate) }}>
                  {item.winRate.toFixed(0)}%
                </BarLabel>
              </WinRateBar>
            </ServiceRow>
          ))
        )}
      </ServiceTable>

      {!isLoading && data.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: st.textMuted }}>
          Wygrane = CONFIRMED + COMPLETED · Stracone = LOST + NO_SHOW · Sortowane po liczbie leadów malejąco
        </div>
      )}
    </div>
  );
};

// ─── Employee stats tab ───────────────────────────────────────────────────────

interface EmployeeStatsTabProps {
  dateFrom?: string;
  dateTo?: string;
}

const EmployeeStatsTab: React.FC<EmployeeStatsTabProps> = ({ dateFrom, dateTo }) => {
  const { data, isLoading, isError } = useEmployeeStats(dateFrom, dateTo);

  const initials = (name: string) =>
    name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  if (isError) {
    return <EmptyBox>Nie udało się załadować statystyk pracowników.</EmptyBox>;
  }

  return (
    <div>
      <SectionTitle>
        <Award size={13} />
        Skuteczność pracowników
      </SectionTitle>

      <EmpTable>
        <EmpHead>
          <HeadCell style={{ textAlign: 'left' }}>Pracownik</HeadCell>
          <HeadCell>Leady</HeadCell>
          <HeadCell>Wygrał</HeadCell>
          <HeadCell>Stracił</HeadCell>
          <HeadCell>Śr. wartość</HeadCell>
          <HeadCell>Konwersja</HeadCell>
        </EmpHead>

        {isLoading ? (
          Array.from({ length: 4 }, (_, i) => (
            <SkeletonRow key={i}>
              <SkeletonPulse $w="40%" />
              <SkeletonPulse $w="10%" />
              <SkeletonPulse $w="10%" />
              <SkeletonPulse $w="10%" />
              <SkeletonPulse $w="20%" />
              <SkeletonPulse $w="15%" />
            </SkeletonRow>
          ))
        ) : data.length === 0 ? (
          <EmptyBox>Brak danych — przypisz pracowników do leadów, żeby zobaczyć ich skuteczność.</EmptyBox>
        ) : (
          data.map((emp, i) => (
            <EmpRow key={emp.userId} $rank={i}>
              <EmpName>
                <EmpAvatar $rank={i}>{initials(emp.userName)}</EmpAvatar>
                <EmpNameText>{emp.userName}</EmpNameText>
                {i === 0 && <Award size={13} style={{ color: '#d97706', flexShrink: 0 }} title="Najlepsza konwersja" />}
              </EmpName>
              <NumCell style={{ textAlign: 'right' }}>{emp.totalLeads}</NumCell>
              <NumCell $color="#059669" style={{ textAlign: 'right' }}>{emp.converted}</NumCell>
              <NumCell $color="#dc2626" style={{ textAlign: 'right' }}>{emp.lost}</NumCell>
              <NumCell style={{ textAlign: 'right', fontSize: 12 }}>
                {formatCurrency(emp.avgLeadValueCents)}
              </NumCell>
              <ConvRate $rate={emp.conversionRate}>
                {emp.conversionRate.toFixed(1)}%
                {emp.conversionRate >= 60
                  ? <TrendingUp size={11} style={{ marginLeft: 3, display: 'inline' }} />
                  : emp.conversionRate >= 40
                    ? <Minus size={11} style={{ marginLeft: 3, display: 'inline' }} />
                    : <TrendingDown size={11} style={{ marginLeft: 3, display: 'inline' }} />
                }
              </ConvRate>
            </EmpRow>
          ))
        )}
      </EmpTable>

      {!isLoading && data.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: st.textMuted }}>
          Konwersja = (CONFIRMED + COMPLETED) / wszystkie przypisane leady · Sortowane malejąco po liczbie leadów
        </div>
      )}
    </div>
  );
};

// ─── Timing analytics ─────────────────────────────────────────────────────────

const TimingFilters = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const TimingFilterLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${st.textMuted};
  white-space: nowrap;
`;

const TimingInput = styled.input`
  padding: 6px 10px;
  font-size: 12px;
  font-family: inherit;
  border: 1.5px solid ${st.border};
  border-radius: 8px;
  background: #f8fafc;
  color: ${st.text};
  outline: none;
  width: 110px;
  transition: border-color 180ms;
  &:focus { border-color: #0ea5e9; }
  &::placeholder { color: ${st.textMuted}; }
`;

const TimingSep = styled.span`
  font-size: 12px;
  color: ${st.textMuted};
`;

const ChartTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ChartWrap = styled.div`
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 12px;
  padding: 16px 12px 8px;
  animation: ${fadeIn} 200ms ease both;
`;

const ChartBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const LoadingBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px;
  font-size: 13px;
  color: ${st.textMuted};
`;

const CHART_COLORS = {
  incoming: '#0ea5e9',
  accepted: '#16a34a',
  rejected: '#dc2626',
};

interface TimingTabProps {
  dateFrom?: string;
  dateTo?: string;
}

const TimingTab: React.FC<TimingTabProps> = ({ dateFrom, dateTo }) => {
  const [valueMinInput, setValueMinInput] = useState('');
  const [valueMaxInput, setValueMaxInput] = useState('');
  const [appliedMin, setAppliedMin] = useState<number | undefined>();
  const [appliedMax, setAppliedMax] = useState<number | undefined>();

  const handleApply = () => {
    setAppliedMin(valueMinInput ? Math.round(parseFloat(valueMinInput) * 100) : undefined);
    setAppliedMax(valueMaxInput ? Math.round(parseFloat(valueMaxInput) * 100) : undefined);
  };

  const handleClear = () => {
    setValueMinInput(''); setValueMaxInput('');
    setAppliedMin(undefined); setAppliedMax(undefined);
  };

  const { data, isLoading } = useLeadTimeAnalytics({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    valueMin: appliedMin,
    valueMax: appliedMax,
    dateFrom,
    dateTo,
  });

  const hourData = data?.byHour ?? [];
  const dayData  = data?.byDayOfMonth ?? [];

  return (
    <ChartBlock>
      {/* Value filter */}
      <TimingFilters>
        <TimingFilterLabel>Wartość leada (PLN):</TimingFilterLabel>
        <TimingInput
          type="number"
          min="0"
          placeholder="min"
          value={valueMinInput}
          onChange={e => setValueMinInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleApply()}
        />
        <TimingSep>–</TimingSep>
        <TimingInput
          type="number"
          min="0"
          placeholder="max"
          value={valueMaxInput}
          onChange={e => setValueMaxInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleApply()}
        />
        <button
          onClick={handleApply}
          style={{ padding: '6px 14px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Filtruj
        </button>
        {(appliedMin !== undefined || appliedMax !== undefined) && (
          <button
            onClick={handleClear}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: st.textMuted, padding: 4 }}
            title="Wyczyść filtr"
          >
            <X size={13} />
          </button>
        )}
      </TimingFilters>

      {isLoading ? (
        <LoadingBox>Ładowanie danych…</LoadingBox>
      ) : (
        <>
          {/* By hour */}
          <ChartWrap>
            <ChartTitle>
              <Clock size={12} /> Rozkład godzinowy (0–23)
            </ChartTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 10, fill: st.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={h => `${h}:00`}
                  interval={1}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: st.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${st.border}` }}
                  labelFormatter={h => `Godzina ${h}:00`}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { incomingCount: 'Przychodzące', acceptedCount: 'Zaakceptowane', rejectedCount: 'Odrzucone' };
                    return [value, labels[name] ?? name];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={name => ({ incomingCount: 'Przychodzące', acceptedCount: 'Zaakceptowane', rejectedCount: 'Odrzucone' }[name] ?? name)}
                />
                <Bar dataKey="incomingCount" fill={CHART_COLORS.incoming} radius={[3, 3, 0, 0]} />
                <Bar dataKey="acceptedCount" fill={CHART_COLORS.accepted} radius={[3, 3, 0, 0]} />
                <Bar dataKey="rejectedCount" fill={CHART_COLORS.rejected} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrap>

          {/* By day of month */}
          <ChartWrap>
            <ChartTitle>
              <BarChart2 size={12} /> Rozkład dzienny (1–31)
            </ChartTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dayData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 10, fill: st.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  interval={1}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: st.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${st.border}` }}
                  labelFormatter={d => `${d}. dzień miesiąca`}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { incomingCount: 'Przychodzące', acceptedCount: 'Zaakceptowane', rejectedCount: 'Odrzucone' };
                    return [value, labels[name] ?? name];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={name => ({ incomingCount: 'Przychodzące', acceptedCount: 'Zaakceptowane', rejectedCount: 'Odrzucone' }[name] ?? name)}
                />
                <Bar dataKey="incomingCount" fill={CHART_COLORS.incoming} radius={[3, 3, 0, 0]} />
                <Bar dataKey="acceptedCount" fill={CHART_COLORS.accepted} radius={[3, 3, 0, 0]} />
                <Bar dataKey="rejectedCount" fill={CHART_COLORS.rejected} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrap>
        </>
      )}
    </ChartBlock>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────

type AnalyticsTab = 'services' | 'employees' | 'timing';

interface LeadAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadAnalyticsModal: React.FC<LeadAnalyticsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('services');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const appliedFrom = dateFrom || undefined;
  const appliedTo   = dateTo || undefined;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Analityka leadów" maxWidth="820px">
      <Container>
        <TabBar>
          <Tab $active={activeTab === 'services'} onClick={() => setActiveTab('services')}>
            <BarChart2 /> Win/Loss per usługa
          </Tab>
          <Tab $active={activeTab === 'employees'} onClick={() => setActiveTab('employees')}>
            <Users /> Skuteczność pracowników
          </Tab>
          <Tab $active={activeTab === 'timing'} onClick={() => setActiveTab('timing')}>
            <Clock /> Timing
          </Tab>
        </TabBar>

        <DateRow>
          <DateLabel>Zakres:</DateLabel>
          <DateInput
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={e => setDateFrom(e.target.value)}
            title="Od daty"
          />
          <DateSep>–</DateSep>
          <DateInput
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={e => setDateTo(e.target.value)}
            title="Do daty"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: st.textMuted, display: 'flex', alignItems: 'center', padding: 4,
              }}
              title="Wyczyść zakres"
            >
              <X size={13} />
            </button>
          )}
        </DateRow>

        {activeTab === 'services' && (
          <ServiceAnalyticsTab dateFrom={appliedFrom} dateTo={appliedTo} />
        )}
        {activeTab === 'employees' && (
          <EmployeeStatsTab dateFrom={appliedFrom} dateTo={appliedTo} />
        )}
        {activeTab === 'timing' && (
          <TimingTab dateFrom={appliedFrom} dateTo={appliedTo} />
        )}
      </Container>
    </Modal>
  );
};
