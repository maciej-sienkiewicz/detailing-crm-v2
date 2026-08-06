import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { ChevronDown, ArrowRight, ExternalLink } from 'lucide-react';
import { PiiText } from '@/common/pii';
import { ActivityIcon } from './ActivityIcon';
import { formatTime, iconTone, severityFlag } from '../activityTheme';
import type { ActivityItem, ActivityReference } from '../types';

// ─── rail + shell ─────────────────────────────────────────────────────────────

const Row = styled.article<{ $bar: string | null; $wash: string | null }>`
    position: relative;
    display: grid;
    grid-template-columns: 58px 40px 1fr;
    align-items: start;
    gap: 0 14px;
    padding: 14px 18px 14px 0;
    background: ${p => p.$wash ?? 'transparent'};

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

const IconTile = styled.div<{ $edge: string; $solid: string }>`
    position: relative;
    z-index: 1;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: ${p => p.theme.colors.surface};
    border: 1.5px solid ${p => p.$edge};
    color: ${p => p.$solid};
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

const DescriptionLink = styled(Link)`
    display: block;
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: ${p => p.theme.colors.textSecondary};
    text-decoration: none;
    transition: color 150ms ease;

    &:hover {
        color: var(--brand-primary);
        text-decoration: underline;
        text-underline-offset: 2px;
    }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25);
        border-radius: 3px;
    }
`;

const MetaLine = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 2px;
`;

const Actor = styled.span`
    font-size: 12.5px;
    font-weight: 500;
    color: ${p => p.theme.colors.textSecondary};
    min-width: 0;
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

// ─── navigation ───────────────────────────────────────────────────────────────

const NavChip = styled(Link)`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: ${p => p.theme.colors.textSecondary};
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};
    padding: 2px 8px;
    border-radius: 9999px;
    text-decoration: none;
    white-space: nowrap;
    transition: color 150ms ease, border-color 150ms ease;

    svg { width: 11px; height: 11px; flex-shrink: 0; }

    &:hover {
        color: var(--brand-primary);
        border-color: var(--brand-primary);
    }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25);
    }
`;

/** Maps backend resource codes to in-app routes. Returns null for resources with no panel route. */
const subjectPath = (ref: ActivityReference): string | null => {
    switch (ref.resource) {
        case 'VISIT':        return `/visits/${ref.id}`;
        case 'CUSTOMER':     return `/customers/${ref.id}`;
        case 'VEHICLE':      return `/vehicles/${ref.id}`;
        case 'APPOINTMENT':  return `/appointments/${ref.id}/edit`;
        default:             return null;
    }
};

// ─── component ────────────────────────────────────────────────────────────────

interface ActivityRowProps {
    item: ActivityItem;
}

export const ActivityRow = ({ item }: ActivityRowProps) => {
    const [open, setOpen] = useState(false);

    const tone = iconTone(item.icon);
    const flag = severityFlag(item.severity.code);
    const hasChanges = item.changes.length > 0;

    // CUSTOMER refs are already present in item.description (e.g. "Klient: Jan Kowalski").
    // Showing them again as NavChips would triple the information. We surface the customer
    // path only to make the description line itself navigable.
    let customerPath: string | null = null;
    if (item.subject?.resource === 'CUSTOMER') {
        customerPath = subjectPath(item.subject);
    }

    const navLinks: Array<{ path: string; label: string }> = [];
    if (item.subject && item.subject.resource !== 'CUSTOMER') {
        const path = subjectPath(item.subject);
        if (path) navLinks.push({ path, label: item.subject.label ?? item.subject.resource });
    }
    item.related?.forEach(ref => {
        if (ref.resource === 'CUSTOMER') return;
        const path = subjectPath(ref);
        if (path && ref.label) navLinks.push({ path, label: ref.label });
    });

    return (
        <Row $bar={flag.bar} $wash={flag.wash}>
            <Time>{formatTime(item.occurredAt)}</Time>

            <IconTile $edge={tone.edge} $solid={tone.solid}>
                <ActivityIcon icon={item.icon} />
            </IconTile>

            <Body>
                <TopLine>
                    <Title><PiiText value={item.title} /></Title>
                    {item.amount && <Amount>{item.amount.display}</Amount>}
                </TopLine>

                {item.description && (
                    customerPath
                        ? (
                            <DescriptionLink to={customerPath}>
                                <PiiText value={item.description} />
                            </DescriptionLink>
                        )
                        : (
                            <Description><PiiText value={item.description} /></Description>
                        )
                )}

                <MetaLine>
                    <Actor>
                        {item.actor.type === 'CUSTOMER'
                            ? <PiiText value={item.actor.displayName} kind="name" />
                            : item.actor.displayName}
                    </Actor>

                    {navLinks.map(({ path, label }) => (
                        <NavChip key={path} to={path}>
                            <ExternalLink />
                            {label}
                        </NavChip>
                    ))}
                </MetaLine>

                {hasChanges && (
                    <>
                        <ExpandButton
                            $open={open}
                            onClick={() => setOpen(v => !v)}
                            aria-expanded={open}
                        >
                            <ChevronDown />
                            {open ? 'Ukryj szczegóły' : 'Szczegóły'}
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
