// src/modules/customers/components/ActivityTimeline.tsx

import styled from 'styled-components';
import type { Visit, CommunicationLog } from '../types';
import { formatDateTime } from '@/common/utils';
import { formatCurrency } from '../utils/customerMappers';
import { t } from '@/common/i18n';

const TimelineContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 600px;
`;

const TimelineHeader = styled.header`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 1px solid ${props => props.theme.colors.border};
    flex-shrink: 0;
`;

const TimelineTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    letter-spacing: -0.01em;
`;

const TimelineSubtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const TimelineContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: ${props => props.theme.spacing.lg};

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: ${props => props.theme.colors.border};
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }
`;

const TimelineList = styled.div`
    position: relative;
    padding-left: 32px;

    &::before {
        content: '';
        position: absolute;
        left: 15px;
        top: 8px;
        bottom: 8px;
        width: 2px;
        background: linear-gradient(180deg, var(--brand-primary) 0%, #e2e8f0 100%);
    }
`;

const TimelineItem = styled.div`
    position: relative;
    margin-bottom: ${props => props.theme.spacing.lg};

    &:last-child {
        margin-bottom: 0;
    }
`;

const TimelineDot = styled.div<{ $variant: 'visit' | 'communication' }>`
    position: absolute;
    left: -24px;
    top: 4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${props => props.$variant === 'visit' ? 'var(--brand-primary)' : '#10b981'};
    box-shadow: 0 0 0 4px white, 0 0 0 5px ${props => props.$variant === 'visit' ? 'var(--brand-primary)' : '#10b981'};
    z-index: 2;
`;

const ItemCard = styled.div<{ $variant: 'visit' | 'communication' }>`
    background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
    border: 1px solid ${props => props.theme.colors.border};
    border-left: 3px solid ${props => props.$variant === 'visit' ? 'var(--brand-primary)' : '#10b981'};
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.md};
    transition: all 0.2s ease;

    &:hover {
        border-color: ${props => props.$variant === 'visit' ? 'var(--brand-primary)' : '#10b981'};
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const ItemHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.sm};
    gap: ${props => props.theme.spacing.sm};
`;

const ItemTitle = styled.h4`
    margin: 0 0 2px;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const ItemDate = styled.time`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    white-space: nowrap;
`;

const ItemContent = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    line-height: 1.5;
`;

const ItemMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.sm};
    margin-top: ${props => props.theme.spacing.sm};
    padding-top: ${props => props.theme.spacing.sm};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const MetaBadge = styled.span<{ $variant?: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;

    ${props => {
        const variants: Record<string, string> = {
            service: 'background: #dbeafe; color: #1e40af;',
            repair: 'background: #fee2e2; color: #991b1b;',
            inspection: 'background: #fef3c7; color: #92400e;',
            consultation: 'background: #f3e8ff; color: #6b21a8;',
            completed: 'background: #dcfce7; color: #166534;',
            scheduled: 'background: #fef3c7; color: #92400e;',
            cancelled: 'background: #f3f4f6; color: #6b7280;',
            inbound: 'background: #dbeafe; color: #1e40af;',
            outbound: 'background: #dcfce7; color: #166534;',
            'in-progress': 'background: #dbeafe; color: #1e40af;',
        };
        return variants[props.$variant || 'service'];
    }}
`;

const MetaText = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xl};
    color: ${props => props.theme.colors.textMuted};
`;

interface ActivityTimelineProps {
    visits: Visit[];
    communications: CommunicationLog[];
}

type VisitActivity = Visit & { activityType: 'visit' };
type CommunicationActivity = CommunicationLog & { activityType: 'communication' };
type TimelineActivity = VisitActivity | CommunicationActivity;

export const ActivityTimeline = ({ visits, communications }: ActivityTimelineProps) => {
    const visitActivities: VisitActivity[] = visits.map(v => ({ ...v, activityType: 'visit' as const }));
    const commActivities: CommunicationActivity[] = communications.map(c => ({ ...c, activityType: 'communication' as const }));

    const activities: TimelineActivity[] = [...visitActivities, ...commActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (activities.length === 0) {
        return (
            <TimelineContainer>
                <TimelineHeader>
                    <TimelineTitle>{t.customers.detail.timeline.title}</TimelineTitle>
                    <TimelineSubtitle>{t.customers.detail.timeline.subtitle}</TimelineSubtitle>
                </TimelineHeader>
                <TimelineContent>
                    <EmptyState>
                        {t.customers.detail.timeline.empty}
                    </EmptyState>
                </TimelineContent>
            </TimelineContainer>
        );
    }

    const getEventsText = (count: number): string => {
        return count === 1 ? t.customers.detail.timeline.event : t.customers.detail.timeline.events;
    };

    return (
        <TimelineContainer>
            <TimelineHeader>
                <TimelineTitle>{t.customers.detail.timeline.title}</TimelineTitle>
                <TimelineSubtitle>
                    {activities.length} {getEventsText(activities.length)}
                </TimelineSubtitle>
            </TimelineHeader>

            <TimelineContent>
                <TimelineList>
                    {activities.map(activity => {
                        if (activity.activityType === 'visit') {
                            return (
                                <TimelineItem key={activity.id}>
                                    <TimelineDot $variant="visit" />
                                    <ItemCard $variant="visit">
                                        <ItemHeader>
                                            <div>
                                                <ItemTitle>{activity.description}</ItemTitle>
                                                <MetaText>{activity.vehicleName}</MetaText>
                                            </div>
                                            <ItemDate>{formatDateTime(activity.date)}</ItemDate>
                                        </ItemHeader>

                                        {activity.notes && (
                                            <ItemContent>{activity.notes}</ItemContent>
                                        )}

                                        <ItemMeta>
                                            <MetaBadge $variant={activity.type}>
                                                {t.customers.detail.timeline.visitType[activity.type]}
                                            </MetaBadge>
                                            <MetaBadge $variant={activity.status}>
                                                {t.customers.detail.timeline.visitStatus[activity.status === 'in-progress' ? 'inProgress' : activity.status]}
                                            </MetaBadge>
                                            {activity.totalCost.grossAmount > 0 && (
                                                <MetaText>
                                                    {formatCurrency(activity.totalCost.grossAmount, activity.totalCost.currency)}
                                                </MetaText>
                                            )}
                                            <MetaText>{t.customers.detail.timeline.technician}: {activity.technician}</MetaText>
                                        </ItemMeta>
                                    </ItemCard>
                                </TimelineItem>
                            );
                        }

                        return (
                            <TimelineItem key={activity.id}>
                                <TimelineDot $variant="communication" />
                                <ItemCard $variant="communication">
                                    <ItemHeader>
                                        <ItemTitle>{activity.subject}</ItemTitle>
                                        <ItemDate>{formatDateTime(activity.date)}</ItemDate>
                                    </ItemHeader>

                                    <ItemContent>{activity.summary}</ItemContent>

                                    <ItemMeta>
                                        <MetaBadge $variant={activity.type}>
                                            {t.customers.detail.timeline.commType[activity.type]}
                                        </MetaBadge>
                                        <MetaBadge $variant={activity.direction}>
                                            {t.customers.detail.timeline.commDirection[activity.direction]}
                                        </MetaBadge>
                                        <MetaText>{activity.performedBy}</MetaText>
                                    </ItemMeta>
                                </ItemCard>
                            </TimelineItem>
                        );
                    })}
                </TimelineList>
            </TimelineContent>
        </TimelineContainer>
    );
};