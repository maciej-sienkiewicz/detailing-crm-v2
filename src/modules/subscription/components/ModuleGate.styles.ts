import styled, { keyframes } from 'styled-components';

export const GatePage = styled.div`
    position: relative;
    min-height: calc(100vh - 120px);
`;

/**
 * The real view, rendered as a live demonstration: visible but blurred and
 * fully non-interactive, so the user sees exactly what the module offers.
 */
export const DemoLayer = styled.div`
    filter: blur(4px) saturate(0.85);
    pointer-events: none;
    user-select: none;
    opacity: 0.9;
`;

export const GateOverlay = styled.div`
    position: absolute;
    inset: 0;
    z-index: 30;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 96px 24px 48px;
    background: linear-gradient(
        180deg,
        rgba(248, 250, 252, 0.55) 0%,
        rgba(248, 250, 252, 0.82) 45%,
        rgba(248, 250, 252, 0.95) 100%
    );
`;

const rise = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
`;

export const GateCard = styled.div`
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.16);
    max-width: 480px;
    width: 100%;
    padding: 36px 36px 30px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 14px;
    animation: ${rise} 260ms ease-out;
    position: sticky;
    top: 96px;
`;

export const LockBadge = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 16px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(14, 165, 233, 0.35);
`;

export const GateEyebrow = styled.div`
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #0284c7;
`;

export const GateTitle = styled.h2`
    margin: 0;
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.4px;
    color: #0f172a;
    line-height: 1.25;
`;

export const GateSubtitle = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: #64748b;
    line-height: 1.6;
`;

export const BenefitList = styled.ul`
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    width: 100%;
`;

export const BenefitItem = styled.li`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    color: #334155;
    line-height: 1.45;

    svg { flex-shrink: 0; margin-top: 2px; }
`;

export const PriceRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-top: 6px;
`;

export const PriceAmount = styled.span`
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.6px;
    color: #0f172a;
`;

export const PricePer = styled.span`
    font-size: 13px;
    color: #94a3b8;
`;

export const UnlockButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 13px 24px;
    border-radius: 11px;
    border: none;
    background: #0ea5e9;
    color: white;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;

    &:hover { background: #0284c7; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

export const FullHint = styled.div`
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.5;

    a {
        color: #0284c7;
        font-weight: 700;
        text-decoration: none;

        &:hover { text-decoration: underline; }
    }
`;

export const OwnerOnlyNote = styled.div`
    font-size: 12.5px;
    color: #64748b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 16px;
    line-height: 1.5;
`;
