import styled, { keyframes } from 'styled-components';
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

// ─── Status badge ─────────────────────────────────────────────────────────────

type StatusKind = 'active' | 'sold' | 'archived';

const statusStyles: Record<StatusKind, string> = {
  active:   'background: rgba(16,185,129,0.12); color: #059669; border: 1px solid rgba(16,185,129,0.22);',
  sold:     'background: rgba(245,158,11,0.12);  color: #d97706; border: 1px solid rgba(245,158,11,0.22);',
  archived: 'background: rgba(148,163,184,0.12); color: #64748b; border: 1px solid rgba(148,163,184,0.22);',
};

export const VehicleStatusBadge = styled.span<{ $status: StatusKind }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 9999px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  ${p => statusStyles[p.$status]}
`;

export const StatusDot = styled.div<{ $status: StatusKind }>`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  ${p => ({
    active:   'background: #34d399;',
    sold:     'background: #fbbf24;',
    archived: 'background: #94a3b8;',
  })[p.$status]}
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

export const PanelAction = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #0284c7;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 180ms ease;
  &:hover { color: #0369a1; }
  svg { width: 13px; height: 13px; }
`;

// ─── Vehicle identity panel ───────────────────────────────────────────────────

export const IdentityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
`;

export const VehicleIconWrap = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1e293b, #475569);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 26px;
    height: 26px;
    opacity: 0.9;
  }
`;

export const IdentityMeta = styled.div`
  min-width: 0;
  flex: 1;
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
  font-family: 'Courier New', monospace;
  letter-spacing: 0.06em;
`;

export const LicensePlateBadge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 3px;
  font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
  margin-bottom: 10px;
`;

// ─── Owner items ──────────────────────────────────────────────────────────────

export const OwnerItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 18px;
  border-bottom: 1px solid ${st.bgCardAlt};
  cursor: pointer;
  transition: background 180ms ease;
  text-decoration: none;

  &:last-child { border-bottom: none; }
  &:hover { background: ${st.bgCardAlt}; }
`;

export const OwnerAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9, #6366f1);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const OwnerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const OwnerName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${st.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const OwnerRole = styled.div`
  font-size: 11px;
  color: ${st.textMuted};
  margin-top: 2px;
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

// ─── Visit rows ───────────────────────────────────────────────────────────────

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

// ─── Status badge (for visits) ────────────────────────────────────────────────

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

// ─── Spec rows (vehicle info) ─────────────────────────────────────────────────

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

export const PrefVal = styled.span`
  color: ${st.text};
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
