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
