import styled, { keyframes } from 'styled-components';
import { hexBackdrop } from '@/common/styles/hexBackdrop';
import { Link } from 'react-router-dom';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Animations ───────────────────────────────────────────────────────────────

export const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

export const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ─── Page layout ──────────────────────────────────────────────────────────────

export const ViewContainer = styled.main`
  min-height: 100vh;
  background: ${st.bg};
  ${hexBackdrop}
  animation: ${fadeIn} 0.25s ease both;
`;

export const PageContent = styled.div`
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px 24px 56px;

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    padding: 28px 32px 64px;
  }
`;

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

export const BreadcrumbNav = styled.nav`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 14px;
`;

export const BreadcrumbLink = styled(Link)`
  color: #64748b;
  text-decoration: none;
  font-weight: 500;
  transition: color 180ms ease;
  &:hover { color: #0ea5e9; }
`;

export const BreadcrumbSep = styled.span`
  color: #cbd5e1;
  font-size: 10px;
`;

export const BreadcrumbCurrent = styled.span`
  color: ${st.text};
  font-weight: 600;
`;

// ─── Page header ──────────────────────────────────────────────────────────────

export const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

export const HeaderLeft = styled.div`
  min-width: 0;
  flex: 1;
`;

export const HeaderMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
`;

export const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.4px;
  color: ${st.text};
  margin: 0;
  line-height: 1.15;
`;

export const MetaText = styled.span`
  font-size: 12px;
  color: ${st.textMuted};
`;

export const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
`;

// ─── Tier badge ───────────────────────────────────────────────────────────────

type TierKind = 'gold' | 'silver' | 'platinum' | 'bronze';

const tierStyles: Record<TierKind, string> = {
  bronze:   'background: rgba(180,120,60,0.14);   color: #b46a28;',
  silver:   'background: rgba(148,163,184,0.18);  color: #64748b;',
  gold:     'background: rgba(245,158,11,0.14);   color: #d97706;',
  platinum: 'background: rgba(139,92,246,0.14);   color: #7c3aed;',
};

export const TierBadge = styled.span<{ $tier: TierKind }>`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 9999px;
  letter-spacing: 0.02em;
  ${p => tierStyles[p.$tier]}
`;

// ─── Two-column grid ──────────────────────────────────────────────────────────

export const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  align-items: start;

  @media (max-width: ${p => p.theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`;

export const LeftRail = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (min-width: ${p => p.theme.breakpoints.lg}) {
    position: sticky;
    top: 16px;
  }
`;

export const MainCol = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

// ─── Panel ────────────────────────────────────────────────────────────────────

export const Panel = styled.div`
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  box-shadow: ${st.shadowSm};
  overflow: hidden;
`;

export const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 20px 11px;
  border-bottom: 1px solid ${st.border};
`;

export const PanelTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  letter-spacing: -0.1px;

  svg {
    width: 15px;
    height: 15px;
    color: ${st.textMuted};
    flex-shrink: 0;
  }
`;

export const PanelBody = styled.div`
  padding: 16px 20px;
`;

export const PanelBodyFlush = styled.div``;

export const PanelCountBadge = styled.span`
  background: ${st.bgCardAlt};
  color: ${st.textMuted};
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid ${st.border};
`;

export const PanelLinkBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #0284c7;
  text-decoration: none;
  transition: color 180ms ease;
  &:hover { color: #0369a1; }
  svg { width: 13px; height: 13px; }
`;

export const PanelActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #0284c7;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 180ms ease;
  &:hover { color: #0369a1; }
  svg { width: 13px; height: 13px; }
`;

// ─── Identity panel ───────────────────────────────────────────────────────────

export const IdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
`;

export const Avatar = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: -0.3px;
`;

export const IdentityMeta = styled.div`
  min-width: 0;
`;

export const IdentityName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${st.text};
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const IdentityId = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 2px;
`;

export const ContactList = styled.div`
  display: grid;
  gap: 2px;
`;

export const ContactRow = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #334155;
  text-decoration: none;
  padding: 4px 0;
  transition: color 180ms ease;
  cursor: pointer;
  &:hover { color: #0284c7; }
  svg {
    width: 14px;
    height: 14px;
    color: ${st.textMuted};
    flex-shrink: 0;
  }
`;

// ─── Vehicle items ────────────────────────────────────────────────────────────

export const VehicleItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 18px;
  border-bottom: 1px solid ${st.bgCardAlt};
  cursor: pointer;
  transition: background 180ms ease;
  background: ${p => p.$active ? 'rgba(14,165,233,0.05)' : 'transparent'};
  text-decoration: none;

  &:last-child { border-bottom: none; }
  &:hover { background: ${st.bgCardAlt}; }
`;

export const VehicleSwatch = styled.div<{ $color?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  flex-shrink: 0;
  background: ${p => p.$color ? `linear-gradient(135deg, ${p.$color}, ${p.$color}cc)` : 'linear-gradient(135deg, #1e293b, #475569)'};
`;

export const VehicleInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const VehicleName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${st.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const VehicleSub = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 2px;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.04em;
`;

// ─── KPI Summary strip ────────────────────────────────────────────────────────

export const SummaryStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const SumCell = styled.div`
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: ${st.shadowSm};
`;

export const SumCellActive = styled(SumCell)`
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-color: #0f172a;
`;

export const KpiEyebrow = styled.div<{ $light?: boolean }>`
  font-size: 10px;
  font-weight: 700;
  color: ${p => p.$light ? '#7dd3fc' : st.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
`;

export const KpiValue = styled.div<{ $light?: boolean }>`
  font-size: 20px;
  font-weight: 800;
  color: ${p => p.$light ? '#ffffff' : st.text};
  letter-spacing: -0.5px;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
  margin-bottom: 3px;
`;

export const KpiDelta = styled.div<{ $light?: boolean }>`
  font-size: 11px;
  color: ${p => p.$light ? '#94a3b8' : st.textMuted};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  svg { width: 12px; height: 12px; }
`;

// ─── Chart + upcoming grid ────────────────────────────────────────────────────

export const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

export const ChartBars = styled.div`
  height: 120px;
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 5px;
  align-items: flex-end;
  padding-top: 8px;
`;

export const ChartBarCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  height: 100%;
`;

export const ChartBarWrap = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

export const ChartBar = styled.div<{ $h: number; $active?: boolean }>`
  width: 100%;
  max-width: 16px;
  height: ${p => p.$h}%;
  min-height: 3px;
  border-radius: 4px 4px 0 0;
  background: ${p => p.$active
    ? 'linear-gradient(180deg, #0ea5e9, #0369a1)'
    : '#cbd5e1'};
  box-shadow: ${p => p.$active ? '0 2px 6px rgba(14,165,233,0.35)' : 'none'};
  transition: background 180ms ease;
  &:hover { background: ${p => p.$active ? '#38bdf8' : '#94a3b8'}; }
`;

export const ChartBarLabel = styled.div`
  font-size: 9px;
  color: ${st.textMuted};
  font-weight: 600;
  letter-spacing: 0.04em;
`;

// ─── Upcoming visits ──────────────────────────────────────────────────────────

export const UpcomingItem = styled.div<{ $suggest?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 18px;
  border-bottom: 1px solid ${st.bgCardAlt};
  background: ${p => p.$suggest ? 'rgba(14,165,233,0.03)' : 'transparent'};
  &:last-child { border-bottom: none; }
`;

export const UpcomingDateBox = styled.div<{ $ghost?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: ${st.textMuted};
  letter-spacing: 0.08em;
  background: ${p => p.$ghost ? 'transparent' : st.bgCardAlt};
  border: ${p => p.$ghost ? `1.5px dashed #cbd5e1` : 'none'};
`;

export const UpcomingDateNum = styled.span`
  font-size: 14px;
  font-weight: 800;
  color: ${st.text};
  line-height: 1;
`;

export const UpcomingInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const UpcomingTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const UpcomingSub = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 2px;
`;

// ─── Recent visits list ───────────────────────────────────────────────────────

export const VisitRow = styled.div<{ $active?: boolean }>`
  display: grid;
  grid-template-columns: 48px 1fr auto auto 16px;
  gap: 12px;
  align-items: center;
  padding: 13px 18px;
  border-bottom: 1px solid ${st.bgCardAlt};
  cursor: pointer;
  transition: background 180ms ease;
  background: ${p => p.$active ? 'rgba(14,165,233,0.04)' : 'transparent'};

  &:last-child { border-bottom: none; }
  &:hover { background: ${st.bgCardAlt}; }

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    grid-template-columns: 44px 1fr auto;
    .visit-hide-sm { display: none; }
  }
`;

export const VisitDateCol = styled.div`
  text-align: center;
`;

export const VisitDateMain = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${st.text};
  font-variant-numeric: tabular-nums;
`;

export const VisitDateSub = styled.div`
  font-size: 10px;
  color: ${st.textMuted};
  margin-top: 2px;
`;

export const VisitInfo = styled.div`
  min-width: 0;
`;

export const VisitTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${st.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const VisitSub = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 2px;
`;

export const VisitAmount = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${st.text};
  letter-spacing: -0.2px;
  min-width: 80px;
  text-align: right;
  font-variant-numeric: tabular-nums;
`;

// ─── Status badges ────────────────────────────────────────────────────────────

type BadgeKind = 'success' | 'info' | 'warn' | 'neutral' | 'error';

const badgeStyles: Record<BadgeKind, string> = {
  success: 'background: rgba(16,185,129,0.12); color: #059669;',
  info:    'background: rgba(59,130,246,0.12);  color: #1d4ed8;',
  warn:    'background: rgba(245,158,11,0.12);  color: #d97706;',
  error:   'background: rgba(239,68,68,0.12);   color: #dc2626;',
  neutral: `background: ${st.bgCardAlt}; color: ${st.textSecondary};`,
};

export const StatusBadge = styled.span<{ $kind?: BadgeKind }>`
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 9999px;
  white-space: nowrap;
  ${p => badgeStyles[p.$kind ?? 'neutral']}
`;

// ─── Preference rows ──────────────────────────────────────────────────────────

export const PrefRow = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px dashed ${st.bgCardAlt};
  font-size: 12px;
  &:last-child { border-bottom: none; }
`;

export const PrefKey = styled.span`
  color: ${st.textMuted};
  font-weight: 500;
`;

export const PrefVal = styled.span<{ $positive?: boolean }>`
  color: ${p => p.$positive ? '#059669' : st.text};
  font-weight: 600;
`;

// ─── Note ─────────────────────────────────────────────────────────────────────

export const NoteText = styled.p`
  font-size: 12px;
  color: ${st.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

// ─── Collapsible section ──────────────────────────────────────────────────────

export const CollapsibleSection = styled.div`
  background: ${st.bgCard};
  border: 1px solid ${st.border};
  border-radius: ${st.radius};
  overflow: hidden;
  box-shadow: ${st.shadowSm};
`;

export const CollapsibleHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 20px;
  background: ${st.bg};
  border: none;
  border-bottom: 1px solid ${st.border};
  cursor: pointer;
  transition: background 180ms ease;
  text-align: left;
  &:hover { background: ${st.bgCardAlt}; }
`;

export const CollapsibleHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const SectionIconWrap = styled.div<{ $gradient?: string }>`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${p => p.$gradient || 'linear-gradient(135deg, #3B82F6, #6366F1)'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const CollapsibleTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${st.text};
`;

export const CollapsibleBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${st.textMuted};
  background: ${st.bgCardAlt};
  border: 1px solid ${st.border};
  padding: 1px 8px;
  border-radius: 9999px;
`;

export const ChevronIcon = styled.svg<{ $open: boolean }>`
  width: 16px;
  height: 16px;
  color: ${st.textMuted};
  transition: transform 250ms ease;
  transform: ${p => p.$open ? 'rotate(180deg)' : 'rotate(0deg)'};
  flex-shrink: 0;
`;

export const CollapsibleBody = styled.div<{ $visible: boolean; $flush?: boolean }>`
  display: ${p => p.$visible ? 'block' : 'none'};
  padding: ${p => p.$flush ? '0' : '20px'};
  animation: ${fadeUp} 0.2s ease;
`;

// ─── Loading / Error states ───────────────────────────────────────────────────

export const CenteredBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 16px;
`;

export const SpinnerEl = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid ${st.border};
  border-top-color: #0ea5e9;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

export const LoadingText = styled.p`
  font-size: 13px;
  color: ${st.textMuted};
  margin: 0;
`;

export const ErrorTitle = styled.h2`
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  color: ${st.accentRed};
`;

export const ErrorMsg = styled.p`
  font-size: 13px;
  color: ${st.textSecondary};
  margin: 0 0 18px;
`;
