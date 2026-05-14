import styled, { keyframes } from 'styled-components';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

export const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c1829 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    overflow-y: auto;
`;

export const Card = styled.div`
    background: white;
    border-radius: 24px;
    width: 100%;
    max-width: 680px;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    margin: auto;
`;

export const CardHeader = styled.div`
    padding: 36px 40px 28px;
    text-align: center;
    background: linear-gradient(180deg, #f0f9ff 0%, white 100%);
    border-bottom: 1px solid #e2e8f0;
`;

export const LogoWrap = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    box-shadow: 0 8px 20px rgba(14, 165, 233, 0.35);
`;

export const WelcomeTitle = styled.h1`
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #0f172a;
    margin: 0 0 8px;
`;

export const WelcomeSub = styled.p`
    font-size: 14px;
    color: #64748b;
    margin: 0;
    line-height: 1.6;
    max-width: 440px;
    margin: 0 auto;
`;

export const CardBody = styled.div`
    padding: 28px 40px 36px;
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

// ─── Trial section ────────────────────────────────────────────────────────────

export const TrialSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const SectionLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #94a3b8;
`;

export const TrialCard = styled.button<{ $disabled: boolean }>`
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 18px 22px;
    border: 2px solid ${p => p.$disabled ? '#e2e8f0' : '#a5f3fc'};
    border-radius: 14px;
    background: ${p => p.$disabled ? '#f8fafc' : 'linear-gradient(135deg, #ecfeff 0%, #f0f9ff 100%)'};
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.55 : 1};
    text-align: left;
    font-family: inherit;
    transition: all 160ms;
    width: 100%;

    &:hover:not(:disabled) {
        border-color: #22d3ee;
        background: linear-gradient(135deg, #e0f7fa 0%, #e0f2fe 100%);
        box-shadow: 0 4px 16px rgba(14, 165, 233, 0.14);
        transform: translateY(-1px);
    }

    &:disabled { cursor: not-allowed; }
`;

export const TrialIconWrap = styled.div`
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
`;

export const TrialInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

export const TrialTitle = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2px;
`;

export const TrialDesc = styled.div`
    font-size: 13px;
    color: #0369a1;
    line-height: 1.45;
`;

export const FreeBadge = styled.div`
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 4px 10px;
    border-radius: 9999px;
    background: #0ea5e9;
    color: white;
`;

// ─── Divider ──────────────────────────────────────────────────────────────────

export const Divider = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;

    &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: #e2e8f0;
    }
`;

// ─── Plans section ────────────────────────────────────────────────────────────

export const PlansGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: 540px) {
        grid-template-columns: 1fr;
    }
`;

export const PlanBtn = styled.button<{ $highlighted: boolean; $disabled: boolean }>`
    position: relative;
    background: ${p => p.$highlighted
        ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
        : '#f8fafc'};
    border: 2px solid ${p => p.$highlighted ? '#0ea5e9' : '#e2e8f0'};
    border-radius: 14px;
    padding: 20px;
    text-align: left;
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.6 : 1};
    transition: all 160ms;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;

    &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px ${p =>
            p.$highlighted ? 'rgba(14,165,233,0.28)' : 'rgba(15,23,42,0.09)'};
    }
`;

export const RecommendedBadge = styled.div`
    position: absolute;
    top: -1px;
    right: 14px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: #f59e0b;
    color: white;
    padding: 3px 9px;
    border-radius: 0 0 8px 8px;
`;

export const PlanBtnName = styled.div<{ $light: boolean }>`
    font-size: 12px;
    font-weight: 700;
    color: ${p => p.$light ? 'rgba(255,255,255,0.8)' : '#64748b'};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

export const PlanBtnPrice = styled.div<{ $light: boolean }>`
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.8px;
    color: ${p => p.$light ? 'white' : '#0f172a'};
    line-height: 1;
`;

export const PlanBtnPer = styled.div<{ $light: boolean }>`
    font-size: 12px;
    color: ${p => p.$light ? 'rgba(255,255,255,0.65)' : '#94a3b8'};
`;

export const PlanBtnFeatures = styled.div<{ $light: boolean }>`
    font-size: 11.5px;
    color: ${p => p.$light ? 'rgba(255,255,255,0.7)' : '#64748b'};
    margin-top: 4px;
    line-height: 1.6;
`;

// ─── Loading overlay on card ──────────────────────────────────────────────────

export const LoadingOverlay = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 40px;
    text-align: center;
    color: #64748b;
    font-size: 14px;
`;

export const Spinner = styled.div`
    width: 28px;
    height: 28px;
    border: 3px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

// ─── Error state ──────────────────────────────────────────────────────────────

export const ErrorNote = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 10px;
    font-size: 13px;
    color: #dc2626;
`;

// ─── Custom plan builder ──────────────────────────────────────────────────────

export const CustomToggle = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    border: 1.5px dashed #cbd5e1;
    background: transparent;
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 160ms;
    text-align: left;
    justify-content: space-between;

    &:hover {
        border-color: #94a3b8;
        color: #334155;
        background: #f8fafc;
    }
`;

export const CustomPanel = styled.div`
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    background: #fafbfc;
`;

export const CustomPanelHeader = styled.div`
    padding: 14px 18px;
    background: white;
    border-bottom: 1px solid #f1f5f9;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #94a3b8;
`;

export const AddOnRow = styled.label<{ $disabled: boolean }>`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    border-bottom: 1px solid #f1f5f9;
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.5 : 1};
    transition: background 120ms;
    user-select: none;

    &:last-of-type { border-bottom: none; }

    &:hover:not([data-disabled='true']) {
        background: white;
    }
`;

export const AddOnCheckbox = styled.input`
    width: 16px;
    height: 16px;
    border-radius: 4px;
    accent-color: #0ea5e9;
    cursor: inherit;
    flex-shrink: 0;
`;

export const AddOnMeta = styled.div`
    flex: 1;
    min-width: 0;
`;

export const AddOnName = styled.div`
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
`;

export const AddOnDesc = styled.div`
    font-size: 12px;
    color: #64748b;
    margin-top: 1px;
`;

export const AddOnPrice = styled.div`
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    white-space: nowrap;
`;

export const AddOnSoonBadge = styled.span`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 2px 7px;
    border-radius: 9999px;
    background: #f1f5f9;
    color: #64748b;
`;

export const CustomSummary = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    background: white;
    border-top: 2px solid #e2e8f0;
`;

export const SummaryPrice = styled.div`
    display: flex;
    flex-direction: column;
`;

export const SummaryLabel = styled.div`
    font-size: 11px;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 2px;
`;

export const SummaryAmount = styled.div`
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #0f172a;
`;

export const CustomConfirmBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 22px;
    border-radius: 10px;
    border: none;
    background: #0ea5e9;
    color: white;
    font-size: 13.5px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: background 150ms;
    white-space: nowrap;

    &:hover:not(:disabled) { background: #0284c7; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

// ─── Base plan line ───────────────────────────────────────────────────────────

export const BasePlanRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    border-bottom: 1px solid #f1f5f9;
    background: #f0f9ff;
`;

export const BasePlanCheck = styled.div`
    width: 16px;
    height: 16px;
    border-radius: 4px;
    background: #0ea5e9;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: white;
`;

// ─── Footer ───────────────────────────────────────────────────────────────────

export const CardFooter = styled.div`
    padding: 16px 40px 20px;
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
    border-top: 1px solid #f1f5f9;
    background: #fafafa;
    line-height: 1.6;
`;
