// Shared visual primitives for the customer/vehicle summary cards.
//
// Design language: quiet reference card. The default (selected) state carries
// no badge and no loud chrome — identity row with an avatar/tile, meta with
// inline icons, and a hairline-separated row of quiet text actions. Exceptional
// states (new / locally modified / ownership change) are marked with a small
// colored-dot tag, and their consequences are spelled out in the notice bar,
// not in the tag itself.
//
// Mobile-first: actions wrap, form grids collapse to one column below 560px,
// picker rows stay ≥48px tall.

import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

export const Card = styled.section`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    overflow: hidden;
`;

export const CardHead = styled.header`
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 13px 16px 0;
`;

/** Small icon tile next to the card label. */
export const HeadIcon = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: ${st.bgCardAlt};
    color: ${st.textSecondary};
    flex-shrink: 0;

    svg { width: 14px; height: 14px; }
`;

export const CardTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
`;

/** Dot-tag for exceptional states only; the default selected state shows nothing. */
export const StateTag = styled.span<{ $tone: 'new' | 'modified' }>`
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${st.fontXs};
    font-weight: 600;
    letter-spacing: 0.01em;
    white-space: nowrap;
    color: ${p => (p.$tone === 'new' ? '#1D4ED8' : '#B45309')};

    &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
    }
`;

export const CardBody = styled.div`
    padding: 12px 16px 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (max-width: 560px) {
        padding: 12px 13px 13px;
    }
`;

// ─── Identity row ─────────────────────────────────────────────────────────────

export const IdentityRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
`;

/** Customer avatar with initials. */
export const Avatar = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${st.gradientBlue};
    color: #fff;
    font-size: ${st.fontSm};
    font-weight: 700;
    letter-spacing: 0.02em;
    flex-shrink: 0;
    user-select: none;
`;

export const IdentityText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
`;

export const EntityName = styled.div`
    font-size: ${st.fontMd};
    font-weight: 650;
    color: ${st.text};
    overflow-wrap: anywhere;
`;

export const MetaRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
`;

export const MetaItem = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    overflow-wrap: anywhere;

    svg {
        width: 13px;
        height: 13px;
        color: ${st.textMuted};
        flex-shrink: 0;
    }
`;

/** License plate rendered as a physical-plate chip. */
export const PlateChip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    border: 1px solid ${st.borderHover};
    border-radius: 5px;
    background: ${st.bg};
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: ${st.textSecondary};
    white-space: nowrap;
`;

// ─── Actions ──────────────────────────────────────────────────────────────────

/** Quiet text-action row under a hairline — the card's footer. */
export const CardActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    margin: 0 -8px -6px;
    padding: 8px 8px 0;
    border-top: 1px solid ${st.border};
`;

export const QuietBtn = styled.button<{ $danger?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 6px 10px;
    border: none;
    border-radius: ${st.radiusSm};
    background: transparent;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${p => (p.$danger ? '#B91C1C' : st.textSecondary)};
    cursor: pointer;
    transition: background ${st.transition}, color ${st.transition};

    svg { width: 14px; height: 14px; }

    &:hover:not(:disabled) {
        background: ${p => (p.$danger ? st.bgAccentRed : st.bg)};
        color: ${p => (p.$danger ? '#991B1B' : st.text)};
    }

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
`;

/** Filled/outlined buttons for form commits and the collision card. */
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
    border: 1px solid ${p => (p.$primary ? st.accentBlue : p.$danger ? 'rgba(239,68,68,0.4)' : st.border)};
    background: ${p => (p.$primary ? st.accentBlue : st.bgCard)};
    color: ${p => (p.$primary ? '#fff' : p.$danger ? '#B91C1C' : st.textSecondary)};

    &:hover:not(:disabled) {
        border-color: ${p => (p.$primary ? '#2563EB' : p.$danger ? st.accentRed : st.borderHover)};
        background: ${p => (p.$primary ? '#2563EB' : p.$danger ? st.bgAccentRed : st.bg)};
        color: ${p => (p.$primary ? '#fff' : p.$danger ? '#B91C1C' : st.text)};
    }

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }
`;

// ─── Notices ──────────────────────────────────────────────────────────────────

/** Amber strip warning that a commit will mutate the shared record, not just this visit. */
export const MutationNotice = styled.div`
    display: flex;
    gap: 9px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: ${st.radiusSm};
    background: ${st.bgAccentAmber};
    border: 1px solid rgba(245, 158, 11, 0.35);
    font-size: ${st.fontSm};
    line-height: 1.5;
    color: #92400E;

    strong { font-weight: 700; }

    > svg {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        margin-top: 2px;
        color: ${st.accentAmber};
    }
`;

// ─── Forms ────────────────────────────────────────────────────────────────────

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

// ─── Pickers ──────────────────────────────────────────────────────────────────

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
    border: 1.5px solid ${p => (p.$selected ? st.accentBlue : st.border)};
    background: ${p => (p.$selected ? st.bgAccentBlue : st.bgCard)};
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

export const EntityMeta = styled.div`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
    overflow-wrap: anywhere;
`;

// ─── Plate-collision card ─────────────────────────────────────────────────────

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
