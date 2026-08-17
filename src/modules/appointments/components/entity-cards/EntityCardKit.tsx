// Shared visual primitives for the customer/vehicle summary cards.
// Mobile-first: actions wrap and become full-width targets below 560px,
// form grids collapse to a single column, list rows stay ≥44px tall.

import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

export const Card = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowXs};
    overflow: hidden;
`;

export const CardHead = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
`;

export const CardTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: 0.01em;
    text-transform: uppercase;
`;

export const CardBody = styled.div`
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (max-width: 560px) {
        padding: 12px;
    }
`;

/** Mode badge: neutral = reference, blue = will be created, amber = DB mutation on save. */
export const ModeBadge = styled.span<{ $tone: 'neutral' | 'new' | 'modified' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;
    white-space: nowrap;
    ${p => p.$tone === 'neutral' && `
        background: ${st.bgCardAlt};
        color: ${st.textSecondary};
        border: 1px solid ${st.border};
    `}
    ${p => p.$tone === 'new' && `
        background: ${st.accentBlueDim};
        color: #1D4ED8;
        border: 1px solid rgba(59, 130, 246, 0.3);
    `}
    ${p => p.$tone === 'modified' && `
        background: ${st.accentAmberDim};
        color: #92400E;
        border: 1px solid rgba(245, 158, 11, 0.35);
    `}
`;

export const EntityName = styled.div`
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    overflow-wrap: anywhere;
`;

export const EntityMeta = styled.div`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
    overflow-wrap: anywhere;
`;

export const ActionsRow = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    @media (max-width: 560px) {
        > * {
            flex: 1 1 calc(50% - 4px);
            justify-content: center;
        }
    }
`;

export const ActionBtn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 7px 14px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all ${st.transition};
    border: 1px solid ${p => p.$primary ? st.accentBlue : p.$danger ? 'rgba(239,68,68,0.4)' : st.border};
    background: ${p => p.$primary ? st.accentBlue : st.bgCard};
    color: ${p => p.$primary ? '#fff' : p.$danger ? '#B91C1C' : st.textSecondary};

    &:hover:not(:disabled) {
        border-color: ${p => p.$primary ? '#2563EB' : p.$danger ? st.accentRed : st.borderHover};
        background: ${p => p.$primary ? '#2563EB' : p.$danger ? st.bgAccentRed : st.bg};
        color: ${p => p.$primary ? '#fff' : p.$danger ? '#B91C1C' : st.text};
    }

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }
`;

/** Amber strip warning that a commit will mutate the shared record, not just this visit. */
export const MutationNotice = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: ${st.radiusSm};
    background: ${st.bgAccentAmber};
    border: 1px solid rgba(245, 158, 11, 0.35);
    font-size: ${st.fontSm};
    line-height: 1.5;
    color: #92400E;

    strong { font-weight: 700; }
`;

export const FormGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px 12px;

    @media (max-width: 560px) {
        grid-template-columns: 1fr;
    }
`;

export const Field = styled.label`
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.03em;
`;

export const TextInput = styled.input`
    min-height: 40px;
    padding: 8px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-family: inherit;
    color: ${st.text};
    background: ${st.bgInput};
    width: 100%;

    &:focus {
        outline: none;
        border-color: ${st.borderFocus};
        box-shadow: ${st.shadowBlue};
    }
`;

/** Picker rows (garage list, customer search results): ≥44px touch targets. */
export const OptionList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const OptionRow = styled.button<{ $selected?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
    width: 100%;
    min-height: 48px;
    padding: 10px 14px;
    border-radius: ${st.radiusSm};
    border: 1.5px solid ${p => p.$selected ? st.accentBlue : st.border};
    background: ${p => p.$selected ? st.bgAccentBlue : st.bgCard};
    font-family: inherit;
    font-size: ${st.fontSm};
    color: ${st.text};
    text-align: left;
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        border-color: ${st.accentBlue};
        background: ${st.bgAccentBlue};
    }
`;

export const OptionTitle = styled.span`
    font-weight: 600;
    overflow-wrap: anywhere;
`;

export const OptionMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
`;

export const EmptyHint = styled.div`
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    padding: 4px 0;
`;

/** Collision card container under the plate field. */
export const CollisionBox = styled.div`
    border: 1px solid rgba(245, 158, 11, 0.4);
    background: ${st.bgAccentAmber};
    border-radius: ${st.radiusSm};
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const CollisionTitle = styled.div`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: #92400E;
`;

export const CollisionMeta = styled.div`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
`;

export const RadioRow = styled.label`
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: ${st.fontSm};
    color: ${st.text};
    line-height: 1.45;
    cursor: pointer;
    min-height: 32px;

    input {
        margin-top: 3px;
        flex-shrink: 0;
        accent-color: ${st.accentBlue};
    }

    small {
        display: block;
        color: ${st.textMuted};
        font-size: ${st.fontXs};
    }
`;

export const InlineLink = styled.button`
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.accentBlue};
    cursor: pointer;
    text-align: left;

    &:hover { text-decoration: underline; }
`;
