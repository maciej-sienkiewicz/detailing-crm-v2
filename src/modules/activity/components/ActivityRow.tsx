// src/modules/activity/components/ActivityRow.tsx

import { useState } from 'react';
import styled, { css } from 'styled-components';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { PiiText } from '@/common/pii';
import { ActivityIcon } from './ActivityIcon';
import { actorAccent, formatTime, iconTone, severityFlag } from '../activityTheme';
import type { ActivityItem } from '../types';

// ─── rail + shell ─────────────────────────────────────────────────────────────

const Row = styled.article<{ $bar: string | null; $wash: string | null }>`
    position: relative;
    display: grid;
    grid-template-columns: 58px 40px 1fr;
    align-items: start;
    gap: 0 14px;
    padding: 14px 18px 14px 0;
    background: ${p => p.$wash ?? 'transparent'};

    /* Importance flag. Absent on the quiet majority, which is what makes it
       readable on the rows that carry it. */
    ${p => p.$bar && css`
        &::after {
            content: '';
            position: absolute;
            left: 0;
            top: 6px;
            bottom: 6px;
            width: 3px;
            border-radius: 0 3px 3px 0;
            background: ${p.$bar};
        }
    `}

    /* The rail: a hairline running through every row, so the eye has a spine to
       follow instead of a stack of unrelated cards. */
    &::before {
        content: '';
        position: absolute;
        left: 77px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: ${p => p.theme.colors.border};
    }

    &:first-child::before { top: 22px; }
    &:last-child::before  { bottom: calc(100% - 22px); }

    @media (max-width: 720px) {
        grid-template-columns: 44px 36px 1fr;
        gap: 0 10px;
        padding-right: 12px;

        &::before { left: 61px; }
    }
`;

const Time = styled.div`
    padding-top: 11px;
    text-align: right;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
`;

const IconTile = styled.div<{ $tint: string; $edge: string; $solid: string }>`
    position: relative;
    z-index: 1;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: ${p => p.$tint};
    border: 1px solid ${p => p.$edge};
    color: ${p => p.$solid};
    /* Punches a hole in the rail so the tile sits on top of it, not next to it. */
    box-shadow: 0 0 0 4px ${p => p.theme.colors.surface};

    @media (max-width: 720px) {
        width: 36px;
        height: 36px;
        border-radius: 11px;
    }
`;

// ─── body ─────────────────────────────────────────────────────────────────────

const Body = styled.div`
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 2px;
`;

const TopLine = styled.div`
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
`;

const Title = styled.h3`
    margin: 0;
    font-size: 14.5px;
    font-weight: 600;
    line-height: 1.35;
    letter-spacing: -0.1px;
    color: ${p => p.theme.colors.text};
    min-width: 0;
`;

const Amount = styled.span`
    flex-shrink: 0;
    margin-left: auto;
    font-size: 13px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.2px;
    color: #0f766e;
    background: rgba(15, 118, 110, 0.09);
    border: 1px solid rgba(15, 118, 110, 0.18);
    padding: 3px 10px;
    border-radius: 9999px;
    white-space: nowrap;
`;

const Description = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: ${p => p.theme.colors.textSecondary};
`;

const MetaLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 2px;
`;

const Actor = styled.span<{ $fg: string; $bg: string }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    font-weight: 500;
    color: ${p => p.theme.colors.textSecondary};
    min-width: 0;

    span.avatar {
        display: grid;
        place-items: center;
        width: 22px;
        height: 22px;
        border-radius: 9999px;
        background: ${p => p.$bg};
        color: ${p => p.$fg};
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.02em;
        flex-shrink: 0;
    }
`;

const Chip = styled.span`
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: ${p => p.theme.colors.textSecondary};
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};
    padding: 2px 8px;
    border-radius: 9999px;
    white-space: nowrap;
`;

const CustomerChip = styled(Chip)`
    color: #6d28d9;
    background: rgba(124, 58, 237, 0.08);
    border-color: rgba(124, 58, 237, 0.2);
`;

// ─── expandable changes ───────────────────────────────────────────────────────

const ExpandButton = styled.button<{ $open: boolean }>`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
    padding: 3px 9px 3px 7px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 9999px;
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    font-size: 11.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: transform 180ms ease, border-color 180ms ease, color 180ms ease;

    svg {
        width: 13px;
        height: 13px;
        transition: transform 180ms ease;
        ${p => p.$open && css`transform: rotate(180deg);`}
    }

    &:hover {
        transform: translateY(-1px);
        border-color: var(--brand-primary);
        color: var(--brand-primary);
    }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25);
    }
`;

const Changes = styled.div`
    margin-top: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 12px;
    background: ${p => p.theme.colors.surfaceHover};
    overflow: hidden;
`;

const ChangeRow = styled.div`
    display: grid;
    grid-template-columns: minmax(120px, 30%) 1fr;
    gap: 10px;
    padding: 9px 12px;
    font-size: 12.5px;

    & + & {
        border-top: 1px solid ${p => p.theme.colors.border};
    }

    @media (max-width: 560px) {
        grid-template-columns: 1fr;
        gap: 3px;
    }
`;

const ChangeLabel = styled.span`
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
`;

const ChangeValues = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
    min-width: 0;
    color: ${p => p.theme.colors.text};

    svg {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
        color: ${p => p.theme.colors.textMuted};
    }
`;

const OldValue = styled.span`
    color: ${p => p.theme.colors.textMuted};
    text-decoration: line-through;
    text-decoration-thickness: 1px;
`;

const NewValue = styled.span`
    font-weight: 600;
`;

// ─── component ────────────────────────────────────────────────────────────────

/**
 * Personal data reaches this view embedded inside strings the backend composed —
 * a title naming the customer, a context line. The backend has already replaced
 * anything the session may not see with the mask, so those strings go through
 * `PiiText`, which swaps embedded masks for a blurred fake rather than showing a
 * bare "***".
 *
 * The related objects the backend sends are deliberately NOT rendered as chips:
 * `description` already names them in prose ("Klient: Anna Nowak · Pojazd: Audi
 * A4"), and repeating them underneath said the same thing twice in two shapes.
 * They stay in the payload for whoever wires up drill-down navigation.
 */

interface ActivityRowProps {
    item: ActivityItem;
}

export const ActivityRow = ({ item }: ActivityRowProps) => {
    const [open, setOpen] = useState(false);

    const tone = iconTone(item.icon);
    const flag = severityFlag(item.severity.code);
    const actor = actorAccent(item.actor.type);
    const hasChanges = item.changes.length > 0;

    return (
        <Row $bar={flag.bar} $wash={flag.wash}>
            <Time>{formatTime(item.occurredAt)}</Time>

            <IconTile $tint={tone.tint} $edge={tone.edge} $solid={tone.solid}>
                <ActivityIcon icon={item.icon} />
            </IconTile>

            <Body>
                <TopLine>
                    <Title><PiiText value={item.title} /></Title>
                    {item.amount && <Amount>{item.amount.display}</Amount>}
                </TopLine>

                {item.description && (
                    <Description><PiiText value={item.description} /></Description>
                )}

                <MetaLine>
                    <Actor $fg={actor.fg} $bg={actor.bg}>
                        <span className="avatar">{item.actor.initials}</span>
                        {item.actor.type === 'CUSTOMER'
                            ? <PiiText value={item.actor.displayName} kind="name" />
                            : item.actor.displayName}
                    </Actor>

                    <Chip>{item.module.label}</Chip>

                    {/* Only surfaced when it is not the panel — "where did this come
                        from" is only interesting when the answer is unusual. */}
                    {item.channel.code !== 'WEB_PANEL' && (
                        item.channel.code === 'PUBLIC_LINK'
                            ? <CustomerChip>{item.channel.label}</CustomerChip>
                            : <Chip>{item.channel.label}</Chip>
                    )}
                </MetaLine>

                {hasChanges && (
                    <>
                        <ExpandButton
                            $open={open}
                            onClick={() => setOpen(v => !v)}
                            aria-expanded={open}
                        >
                            <ChevronDown />
                            {open ? 'Ukryj zmiany' : `Zmiany: ${item.changeSummary ?? ''}`}
                        </ExpandButton>

                        {open && (
                            <Changes>
                                {item.changes.map(change => (
                                    <ChangeRow key={change.field}>
                                        <ChangeLabel>{change.label}</ChangeLabel>
                                        <ChangeValues>
                                            {change.oldValueDisplay && (
                                                <>
                                                    <OldValue>{change.oldValueDisplay}</OldValue>
                                                    <ArrowRight />
                                                </>
                                            )}
                                            <NewValue>{change.newValueDisplay ?? '—'}</NewValue>
                                        </ChangeValues>
                                    </ChangeRow>
                                ))}
                            </Changes>
                        )}
                    </>
                )}
            </Body>
        </Row>
    );
};
