// src/modules/leads/components/LeadAnalyticsModal.tsx
import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { BarChart2, Users, X, TrendingUp, TrendingDown, Minus, Award, Target, Clock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/common/components/Modal/Modal';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useServiceAnalytics, useEmployeeStats, useLeadTimeAnalytics } from '../hooks';
import { leadApi } from '../api/leadApi';
import { formatCurrency } from '../utils/formatters';
import type {
  LeadSource,
  TimeAnalyticsBucket,
  TimeAnalyticsBucketType,
  TimeAnalyticsActionType,
  InterpretTimeAnalyticsResponse,
} from '../types';

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
  display: inline-flex;
  align-self: flex-start;
  gap: 3px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 9999px;
  margin-bottom: 22px;
`;

const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border: none;
  border-radius: 9999px;
  background: ${p => p.$active ? '#fff' : 'transparent'};
  font-family: inherit;
  font-size: 13px;
  font-weight: ${p => p.$active ? 700 : 600};
  color: ${p => p.$active ? '#0369a1' : st.textSecondary};
  box-shadow: ${p => p.$active ? '0 1px 3px rgba(15,23,42,0.10)' : 'none'};
  cursor: pointer;
  transition: all 180ms ease;
  white-space: nowrap;

  &:hover { color: ${p => p.$active ? '#0369a1' : st.text}; }
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
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  border: 1.5px solid ${st.border};
  border-radius: 9999px;
  background: #fff;
  color: ${st.text};
  outline: none;
  cursor: pointer;
  transition: all 180ms ease;

  &:hover { border-color: ${st.borderHover}; }
  &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.12); }
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
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  box-shadow: ${st.shadowSm};
`;

const ServiceHead = styled.div`
  display: grid;
  grid-template-columns: 1fr 70px 70px 70px 110px;
  gap: 8px;
  padding: 11px 16px;
  background: linear-gradient(180deg, #fbfcfe 0%, #f6f9fc 100%);
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
  grid-template-columns: 1fr 70px 70px 70px 110px;
  gap: 8px;
  align-items: center;
  padding: 13px 16px;
  border-bottom: 1px solid #f1f5f9;
  animation: ${fadeIn} 200ms ease both;
  transition: background 140ms ease;

  &:last-child { border-bottom: none; }
  &:hover { background: #f8fbff; }
`;

const ServiceName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NumCell = styled.span<{ $color?: string }>`
  font-size: 13px;
  font-weight: 700;
  color: ${p => p.$color ?? st.text};
  text-align: right;
  font-variant-numeric: tabular-nums;
`;

const WinRateBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 7px;
  border-radius: 9999px;
  background: #eef2f6;
  overflow: hidden;
`;

const BarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${p => p.$pct}%;
  border-radius: 9999px;
  background: linear-gradient(90deg, ${p => p.$color}cc 0%, ${p => p.$color} 100%);
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
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  box-shadow: ${st.shadowSm};
`;

const EmpHead = styled.div`
  display: grid;
  grid-template-columns: 1fr 60px 60px 60px 90px 100px;
  gap: 8px;
  padding: 11px 16px;
  background: linear-gradient(180deg, #fbfcfe 0%, #f6f9fc 100%);
  border-bottom: 1px solid ${st.border};
`;

const EmpRow = styled.div<{ $rank?: number }>`
  display: grid;
  grid-template-columns: 1fr 60px 60px 60px 90px 100px;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  animation: ${fadeIn} 200ms ease both;
  transition: background 140ms ease;
  background: ${p => p.$rank === 0 ? 'linear-gradient(90deg, rgba(16,185,129,0.07) 0%, rgba(16,185,129,0.02) 100%)' : 'transparent'};

  &:last-child { border-bottom: none; }
  &:hover { background: ${p => p.$rank === 0 ? 'rgba(16,185,129,0.10)' : '#f8fbff'}; }
`;

const EmpName = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const EmpAvatar = styled.div<{ $rank?: number }>`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: ${p => p.$rank === 0 ? 'linear-gradient(135deg, #34d399 0%, #059669 100%)' : '#eef2f6'};
  color: ${p => p.$rank === 0 ? '#fff' : '#64748b'};
  box-shadow: ${p => p.$rank === 0 ? '0 2px 6px rgba(16,185,129,0.35)' : 'none'};
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
  padding: 52px 24px;
  text-align: center;
  color: ${st.textMuted};
  font-size: ${st.fontSm};
  line-height: 1.6;
  background: #fff;
  border: 1px dashed ${st.border};
  border-radius: 14px;
`;

const SectionTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 7px;
  svg { color: ${st.textSecondary}; }
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 22px;
`;

const SummaryCard = styled.div<{ $color: string; $bg: string }>`
  position: relative;
  padding: 16px 16px 15px;
  background: linear-gradient(160deg, #fff 0%, ${p => p.$bg} 100%);
  border: 1px solid ${st.border};
  border-radius: 14px;
  box-shadow: ${st.shadowXs};
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 3px; height: 100%;
    background: ${p => p.$color};
  }
`;

const SummaryValue = styled.div<{ $color: string }>`
  font-size: 26px;
  font-weight: 800;
  color: ${p => p.$color};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.6px;
  line-height: 1;
`;

const SummaryLabel = styled.div`
  font-size: 11.5px;
  color: ${st.textSecondary};
  font-weight: 600;
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
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  border: 1.5px solid ${st.border};
  border-radius: 9999px;
  background: #fff;
  color: ${st.text};
  outline: none;
  width: 96px;
  transition: all 180ms ease;
  &:hover { border-color: ${st.borderHover}; }
  &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.12); }
  &::placeholder { color: ${st.textMuted}; }
`;

const TimingSep = styled.span`
  font-size: 12px;
  color: ${st.textMuted};
`;

const ChartTitle = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${st.text};
  display: flex;
  align-items: center;
  gap: 7px;
  svg { color: #0ea5e9; }
`;

const ChartWrap = styled.div`
  background: #fff;
  border: 1px solid ${st.border};
  border-radius: 14px;
  padding: 18px 16px 14px;
  box-shadow: ${st.shadowSm};
  animation: ${fadeIn} 200ms ease both;
`;

const ChartHeader = styled.div`
  margin-bottom: 14px;
`;

const ChartCaption = styled.div`
  font-size: 12px;
  color: ${st.textMuted};
  margin-top: 4px;
  line-height: 1.5;
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

// Deterministic mock data — used when API returns no data yet
const MOCK_HOUR_DATA = Array.from({ length: 24 }, (_, h) => {
  const peak = h >= 9 && h <= 12 ? 1.8 : h >= 15 && h <= 18 ? 1.4 : h >= 19 && h <= 21 ? 1.2 : 0.5;
  const base = Math.round(Math.sin((h / 24) * Math.PI * 2 + 1) * 6 + 8) * peak;
  const incoming = Math.max(0, Math.round(base + ((h * 7 + 3) % 5)));
  const accepted = Math.round(incoming * 0.35 + ((h * 3) % 3));
  const rejected = Math.round(incoming * 0.2 + ((h * 5) % 2));
  return { bucket: h, incomingCount: incoming, acceptedCount: accepted, rejectedCount: rejected };
});

const MOCK_DAY_DATA = Array.from({ length: 31 }, (_, i) => {
  const d = i + 1;
  const midPeak = d >= 10 && d <= 20 ? 1.3 : 1;
  const base = Math.round(Math.sin((d / 31) * Math.PI) * 10 + 12) * midPeak;
  const incoming = Math.max(0, Math.round(base + ((d * 11) % 7)));
  const accepted = Math.round(incoming * 0.38 + ((d * 3) % 4));
  const rejected = Math.round(incoming * 0.22 + ((d * 7) % 3));
  return { bucket: d, incomingCount: incoming, acceptedCount: accepted, rejectedCount: rejected };
});

const limitDecimals2 = (raw: string): string => {
  const sep = Math.max(raw.indexOf('.'), raw.indexOf(','));
  return sep === -1 ? raw : raw.slice(0, sep + 3);
};

// ─── Series definitions (needed by both InterpretPanel and TimingTab) ─────────

const SERIES_DEF = [
  { key: 'incomingCount' as const, label: 'Przychodzące', color: '#0ea5e9' },
  { key: 'acceptedCount' as const, label: 'Zaakceptowane', color: '#16a34a' },
  { key: 'rejectedCount' as const, label: 'Odrzucone',     color: '#dc2626' },
];

type SeriesKey = typeof SERIES_DEF[number]['key'];

// ─── Interpretation panel ─────────────────────────────────────────────────────

const InterpretBtn = styled.button<{ $loading?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
  padding: 9px 18px;
  border-radius: 9999px;
  border: 1.5px solid ${st.border};
  background: ${p => p.$loading ? '#f1f5f9' : '#fff'};
  color: ${st.textSecondary};
  font-size: 12px;
  font-weight: 600;
  cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
  font-family: inherit;
  box-shadow: ${st.shadowXs};
  transition: all 150ms ease;
  opacity: ${p => p.$loading ? 0.85 : 1};

  &:hover:not(:disabled) { background: #f8fafc; border-color: ${st.borderHover}; color: ${st.text}; }
  svg { width: 14px; height: 14px; color: #0ea5e9; }
`;

const InterpretCard = styled.div`
  margin-top: 14px;
  border: 1px solid ${st.border};
  border-radius: 14px;
  overflow: hidden;
  box-shadow: ${st.shadowSm};
  animation: ${fadeIn} 200ms ease both;
`;

const InterpretCardHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(180deg, #fbfcfe 0%, #f6f9fc 100%);
  border: none;
  cursor: pointer;
  font-family: inherit;
  gap: 8px;
`;

const InterpretCardTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${st.text};
  display: flex;
  align-items: center;
  gap: 7px;
  svg { color: #0ea5e9; }
`;

const InterpretBody = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fff;
  border-top: 1px solid ${st.border};
`;

const InterpretSummary = styled.p`
  font-size: 13px;
  color: ${st.textSecondary};
  line-height: 1.65;
  margin: 0;
`;

const InterpretSectionLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${st.textMuted};
  margin-bottom: 8px;
`;

const InsightList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InsightItem = styled.div`
  padding: 11px 13px;
  background: #f8fafc;
  border: 1px solid ${st.border};
  border-radius: 10px;
`;

const InsightLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #0369a1;
  margin-bottom: 4px;
`;

const InsightObs = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${st.text};
  margin-bottom: 2px;
`;

const InsightCause = styled.div`
  font-size: 12px;
  color: ${st.textMuted};
  line-height: 1.5;
`;

const RecoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const RecoCard = styled.div`
  padding: 11px 13px;
  background: #f8fafc;
  border: 1px solid ${st.border};
  border-radius: 10px;
`;

const RecoLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: ${st.textMuted};
  margin-bottom: 4px;

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #0ea5e9;
    flex-shrink: 0;
  }
`;

const RecoText = styled.div`
  font-size: 12px;
  color: ${st.text};
  line-height: 1.5;
`;

interface InterpretPanelProps {
  bucketType: TimeAnalyticsBucketType;
  buckets: TimeAnalyticsBucket[];
  visibleSeries: Set<SeriesKey>;
  chartLabel: string;
}

const InterpretPanel: React.FC<InterpretPanelProps> = ({ bucketType, buckets, visibleSeries, chartLabel }) => {
  const [result, setResult] = useState<InterpretTimeAnalyticsResponse | null>(null);
  const [expanded, setExpanded] = useState(true);

  const seriesKeyToAction: Record<SeriesKey, TimeAnalyticsActionType> = {
    incomingCount: 'INCOMING',
    acceptedCount: 'ACCEPTED',
    rejectedCount: 'REJECTED',
  };

  const { mutate, isPending } = useMutation({
    mutationFn: () => leadApi.interpretTimeAnalytics({
      bucketType,
      actionTypes: [...visibleSeries].map(k => seriesKeyToAction[k]),
      buckets: buckets.filter(b => b.incomingCount > 0 || b.acceptedCount > 0 || b.rejectedCount > 0),
    }),
    onSuccess: res => { setResult(res); setExpanded(true); },
  });

  const reco = result?.recommendations;

  return (
    <div>
      {!result ? (
        <InterpretBtn $loading={isPending} onClick={() => !isPending && mutate()} disabled={isPending}>
          <Sparkles />
          {isPending ? 'Analizuję dane…' : `Zinterpretuj ${chartLabel}`}
        </InterpretBtn>
      ) : (
        <InterpretCard>
          <InterpretCardHeader onClick={() => setExpanded(p => !p)}>
            <InterpretCardTitle>
              <Sparkles /> Interpretacja wyników
            </InterpretCardTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <InterpretBtn
                as="span"
                style={{ padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); mutate(); }}
              >
                Odśwież
              </InterpretBtn>
              {expanded ? <ChevronUp size={14} color="#7c3aed" /> : <ChevronDown size={14} color="#7c3aed" />}
            </div>
          </InterpretCardHeader>

          {expanded && (
            <InterpretBody>
              <InterpretSummary>{result.summary}</InterpretSummary>

              {result.insights.length > 0 && (
                <div>
                  <InterpretSectionLabel>Obserwacje</InterpretSectionLabel>
                  <InsightList>
                    {result.insights.map((ins, i) => (
                      <InsightItem key={i}>
                        <InsightLabel>{ins.bucketLabel}</InsightLabel>
                        <InsightObs>{ins.observation}</InsightObs>
                        <InsightCause>{ins.causalExplanation}</InsightCause>
                      </InsightItem>
                    ))}
                  </InsightList>
                </div>
              )}

              {reco && (
                <div>
                  <InterpretSectionLabel>Rekomendacje</InterpretSectionLabel>
                  <RecoGrid>
                    <RecoCard>
                      <RecoLabel>Najlepsza pora na kontakt</RecoLabel>
                      <RecoText>{reco.bestTimeToCall}</RecoText>
                    </RecoCard>
                    <RecoCard>
                      <RecoLabel>Przypomnienia</RecoLabel>
                      <RecoText>{reco.bestTimeToRemind}</RecoText>
                    </RecoCard>
                    <RecoCard>
                      <RecoLabel>Kampanie reklamowe</RecoLabel>
                      <RecoText>{reco.adCampaignTiming}</RecoText>
                    </RecoCard>
                    <RecoCard>
                      <RecoLabel>Social media</RecoLabel>
                      <RecoText>{reco.socialMediaTiming}</RecoText>
                    </RecoCard>
                  </RecoGrid>
                </div>
              )}
            </InterpretBody>
          )}
        </InterpretCard>
      )}
    </div>
  );
};

const SERIES = SERIES_DEF;

const SeriesToggleBar = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
`;

const SeriesToggle = styled.button<{ $color: string; $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 9999px;
  border: 1.5px solid ${p => p.$active ? p.$color : st.border};
  background: ${p => p.$active ? `${p.$color}14` : '#fff'};
  color: ${p => p.$active ? p.$color : st.textMuted};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  box-shadow: ${p => p.$active ? 'none' : st.shadowXs};
  transition: all 150ms ease;

  &:hover { border-color: ${p => p.$color}; color: ${p => p.$color}; background: ${p => p.$color}12; }
`;

const SeriesDot = styled.span<{ $color: string; $active: boolean }>`
  width: 8px; height: 8px;
  border-radius: 50%;
  background: ${p => p.$active ? p.$color : '#cbd5e1'};
  flex-shrink: 0;
  transition: background 150ms ease;
`;

interface TimingTabProps {
  dateFrom?: string;
  dateTo?: string;
}

const TimingTab: React.FC<TimingTabProps> = ({ dateFrom, dateTo }) => {
  const [valueMinInput, setValueMinInput] = useState('');
  const [valueMaxInput, setValueMaxInput] = useState('');
  const [appliedMin, setAppliedMin] = useState<number | undefined>();
  const [appliedMax, setAppliedMax] = useState<number | undefined>();
  const [visibleSeries, setVisibleSeries] = useState<Set<SeriesKey>>(
    new Set(['incomingCount', 'acceptedCount', 'rejectedCount'])
  );

  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries(prev => {
      if (prev.has(key) && prev.size === 1) return prev; // keep at least one
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleApply = () => {
    setAppliedMin(valueMinInput ? Math.round(parseFloat(valueMinInput.replace(',', '.')) * 100) : undefined);
    setAppliedMax(valueMaxInput ? Math.round(parseFloat(valueMaxInput.replace(',', '.')) * 100) : undefined);
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

  const hourData = (data?.byHour && data.byHour.some(b => b.incomingCount > 0)) ? data.byHour : MOCK_HOUR_DATA;
  const dayData  = (data?.byDayOfMonth && data.byDayOfMonth.some(b => b.incomingCount > 0)) ? data.byDayOfMonth : MOCK_DAY_DATA;
  const isMock   = !data || (!data.byHour.some(b => b.incomingCount > 0) && !data.byDayOfMonth.some(b => b.incomingCount > 0));

  const tooltipFormatter = (value: number, name: string) => {
    const s = SERIES.find(s => s.key === name);
    return [value, s?.label ?? name];
  };

  const renderLines = () => SERIES.filter(s => visibleSeries.has(s.key)).map(s => (
    <Line
      key={s.key}
      type="monotone"
      dataKey={s.key}
      stroke={s.color}
      strokeWidth={2.25}
      dot={false}
      activeDot={{ r: 4, strokeWidth: 0 }}
    />
  ));

  return (
    <ChartBlock>
      {/* Series toggles */}
      <SeriesToggleBar>
        {SERIES.map(s => (
          <SeriesToggle
            key={s.key}
            $color={s.color}
            $active={visibleSeries.has(s.key)}
            onClick={() => toggleSeries(s.key)}
          >
            <SeriesDot $color={s.color} $active={visibleSeries.has(s.key)} />
            {s.label}
          </SeriesToggle>
        ))}
      </SeriesToggleBar>

      {/* Value filter */}
      <TimingFilters>
        <TimingFilterLabel>Wartość leada (PLN):</TimingFilterLabel>
        <TimingInput
          type="text"
          inputMode="decimal"
          placeholder="min"
          value={valueMinInput}
          onChange={e => setValueMinInput(limitDecimals2(e.target.value.replace(/[^0-9.,]/g, '')))}
          onKeyDown={e => e.key === 'Enter' && handleApply()}
        />
        <TimingSep>–</TimingSep>
        <TimingInput
          type="text"
          inputMode="decimal"
          placeholder="max"
          value={valueMaxInput}
          onChange={e => setValueMaxInput(limitDecimals2(e.target.value.replace(/[^0-9.,]/g, '')))}
          onKeyDown={e => e.key === 'Enter' && handleApply()}
        />
        <button
          onClick={handleApply}
          style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: '#fff', border: 'none', borderRadius: 9999, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(14,165,233,0.28)' }}
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

      {isMock && !isLoading && (
        <div style={{ fontSize: 11, color: st.textMuted, marginBottom: 4, fontStyle: 'italic' }}>
          Prezentowane dane są przykładowe — brak danych dla wybranego zakresu.
        </div>
      )}

      {isLoading ? (
        <LoadingBox>Ładowanie danych…</LoadingBox>
      ) : (
        <>
          {/* By hour */}
          <ChartWrap>
            <ChartHeader>
              <ChartTitle>
                <Clock size={13} /> O której godzinie piszą klienci
              </ChartTitle>
              <ChartCaption>Rozkład zapytań w ciągu doby (0–23). Pokazuje, kiedy warto być pod telefonem.</ChartCaption>
            </ChartHeader>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={hourData} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 10, fill: st.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={h => `${h}:00`}
                  interval={2}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: st.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${st.border}` }}
                  labelFormatter={h => `Godzina ${h}:00`}
                  formatter={tooltipFormatter}
                />
                {renderLines()}
              </LineChart>
            </ResponsiveContainer>
            <InterpretPanel bucketType="BY_HOUR" buckets={hourData} visibleSeries={visibleSeries} chartLabel="rozkład godzinowy" />
          </ChartWrap>

          {/* By day of month */}
          <ChartWrap>
            <ChartHeader>
              <ChartTitle>
                <BarChart2 size={13} /> W które dni miesiąca piszą klienci
              </ChartTitle>
              <ChartCaption>Rozkład zapytań względem dnia miesiąca (1–31). Pomaga zaplanować kampanie i przypomnienia.</ChartCaption>
            </ChartHeader>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={dayData} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 10, fill: st.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: st.textMuted }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${st.border}` }}
                  labelFormatter={d => `${d}. dzień miesiąca`}
                  formatter={tooltipFormatter}
                />
                {renderLines()}
              </LineChart>
            </ResponsiveContainer>
            <InterpretPanel bucketType="BY_DAY_OF_MONTH" buckets={dayData} visibleSeries={visibleSeries} chartLabel="rozkład dzienny" />
          </ChartWrap>
        </>
      )}
    </ChartBlock>
  );
};

// ─── Date preset selector ─────────────────────────────────────────────────────

type DatePreset = 'week' | 'month' | 'quarter' | 'year' | 'custom';

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'week',    label: 'Ostatni tydzień' },
  { id: 'month',   label: 'Ostatni miesiąc' },
  { id: 'quarter', label: 'Ostatni kwartał' },
  { id: 'year',    label: 'Ostatni rok' },
  { id: 'custom',  label: 'Niestandardowy zakres' },
];

const toISO = (d: Date) => d.toISOString().slice(0, 10);

const getPresetDates = (preset: DatePreset): { dateFrom?: string; dateTo?: string } => {
  if (preset === 'custom') return {};
  const today = new Date();
  const days = preset === 'week' ? 7 : preset === 'month' ? 30 : preset === 'quarter' ? 90 : 365;
  const from = new Date(today);
  from.setDate(today.getDate() - days);
  return { dateFrom: toISO(from), dateTo: toISO(today) };
};

const PresetBar = styled.div`
  display: inline-flex;
  gap: 3px;
  padding: 4px;
  background: #f1f5f9;
  border-radius: 9999px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const PresetBtn = styled.button<{ $active: boolean }>`
  padding: 7px 14px;
  border-radius: 9999px;
  border: none;
  background: ${p => p.$active ? '#fff' : 'transparent'};
  color: ${p => p.$active ? '#0369a1' : st.textSecondary};
  box-shadow: ${p => p.$active ? '0 1px 3px rgba(15,23,42,0.10)' : 'none'};
  font-size: 12px;
  font-weight: ${p => p.$active ? 700 : 600};
  cursor: pointer;
  font-family: inherit;
  transition: all 150ms ease;
  white-space: nowrap;

  &:hover { color: ${p => p.$active ? '#0369a1' : st.text}; }
`;

const CustomRangeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  animation: ${fadeIn} 150ms ease both;
`;

// ─── Main modal ───────────────────────────────────────────────────────────────

type AnalyticsTab = 'services' | 'employees' | 'timing';

interface LeadAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeadAnalyticsModal: React.FC<LeadAnalyticsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('services');
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { dateFrom: appliedFrom, dateTo: appliedTo } = datePreset === 'custom'
    ? { dateFrom: customFrom || undefined, dateTo: customTo || undefined }
    : getPresetDates(datePreset);

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

        <PresetBar>
          {PRESETS.map(p => (
            <PresetBtn key={p.id} $active={datePreset === p.id} onClick={() => setDatePreset(p.id)}>
              {p.label}
            </PresetBtn>
          ))}
        </PresetBar>

        {datePreset === 'custom' && (
          <CustomRangeRow>
            <DateLabel>Od:</DateLabel>
            <DateInput
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={e => setCustomFrom(e.target.value)}
            />
            <DateSep>–</DateSep>
            <DateLabel>Do:</DateLabel>
            <DateInput
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={e => setCustomTo(e.target.value)}
            />
            {(customFrom || customTo) && (
              <button
                onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: st.textMuted, display: 'flex', alignItems: 'center', padding: 4 }}
                title="Wyczyść zakres"
              >
                <X size={13} />
              </button>
            )}
          </CustomRangeRow>
        )}

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
