import styled, { keyframes } from 'styled-components';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

export const PageWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

export const SectionHead = styled.div`
    margin-bottom: 4px;
`;

export const EyeLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    margin-bottom: 4px;
`;

export const SectionTitle = styled.h2`
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.4px;
    margin: 0 0 4px;
    color: ${p => p.theme.colors.text};
`;

export const SectionDesc = styled.p`
    font-size: 13px;
    color: #475569;
    margin: 0;
    line-height: 1.55;
`;

// ─── Status panel ─────────────────────────────────────────────────────────────

export const Panel = styled.div`
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    overflow: hidden;
`;

export const PanelRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;

    &:last-child { border-bottom: none; }
`;

export const PlanIcon = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
`;

export const PlanMeta = styled.div`
    flex: 1;
    min-width: 0;
`;

export const PlanMetaName = styled.div`
    font-size: 14px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    margin-bottom: 2px;
`;

export const PlanMetaSub = styled.div`
    font-size: 12px;
    color: #64748b;
`;

export const StatusBadge = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 9999px;
    background: ${p => p.$color}1a;
    color: ${p => p.$color};

    &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${p => p.$color};
    }
`;

export const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    border-top: 1px solid #f1f5f9;
`;

export const InfoCell = styled.div`
    padding: 16px 20px;
    border-right: 1px solid #f1f5f9;

    &:last-child { border-right: none; }
`;

export const InfoLabel = styled.div`
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
    margin-bottom: 5px;
`;

export const InfoValue = styled.div<{ $urgent?: boolean }>`
    font-size: 16px;
    font-weight: 800;
    color: ${p => p.$urgent ? '#ef4444' : p.theme.colors.text};
    letter-spacing: -0.3px;
`;

export const InfoSub = styled.div`
    font-size: 11.5px;
    color: #94a3b8;
    margin-top: 2px;
`;

// ─── Billing status banners ────────────────────────────────────────────────────

export const ExpiredBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 20px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: ${p => p.theme.radii.lg};
`;

export const TrialBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 20px;
    background: #fefce8;
    border: 1px solid #fde68a;
    border-radius: ${p => p.theme.radii.lg};
`;

export const PastDueBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 20px;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    border-radius: ${p => p.theme.radii.lg};
`;

export const BannerIconWrap = styled.div<{ $bg: string; $color: string }>`
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${p => p.$bg};
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${p => p.$color};
`;

export const BannerContent = styled.div`
    flex: 1;
    min-width: 0;
`;

export const BannerTitle = styled.div<{ $color: string }>`
    font-size: 13px;
    font-weight: 700;
    color: ${p => p.$color};
    margin-bottom: 2px;
`;

export const BannerText = styled.div<{ $color: string }>`
    font-size: 13px;
    color: ${p => p.$color};
    line-height: 1.55;
`;

export const BannerCta = styled.button`
    flex-shrink: 0;
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    background: #ef4444;
    color: white;
    font-size: 12.5px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: background 150ms;
    align-self: center;

    &:hover { background: #dc2626; }
`;

// ─── Section blocks ───────────────────────────────────────────────────────────

export const SectionBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const BlockLabel = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

export const PlansGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
`;

export const AddOnsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
`;

export const ActiveAddOnRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
`;

export const AddOnRowInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

export const AddOnRowName = styled.div`
    font-size: 13.5px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    margin-bottom: 2px;
`;

export const AddOnRowPrice = styled.div`
    font-size: 12px;
    color: #64748b;
`;

export const DeactivateBtn = styled.button`
    padding: 7px 14px;
    border-radius: 8px;
    border: 1.5px solid #fca5a5;
    background: #fef2f2;
    color: #dc2626;
    font-size: 12.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms;

    &:hover { background: #fee2e2; }
`;

// ─── Loading / Error ──────────────────────────────────────────────────────────

export const Spinner = styled.div`
    width: 22px;
    height: 22px;
    border: 2.5px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

export const LoadingWrap = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    gap: 12px;
    color: #64748b;
    font-size: 13px;
`;

export const ErrorWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    gap: 12px;
    color: #64748b;
    font-size: 13px;
    text-align: center;
`;

export const RetryBtn = styled.button`
    padding: 9px 20px;
    border-radius: 8px;
    border: 1.5px solid #e2e8f0;
    background: white;
    color: #334155;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms;

    &:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
    }
`;

export const AccessDeniedWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 320px;
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 40px;
    text-align: center;
    gap: 10px;
    color: #64748b;
    font-size: 13px;
`;
