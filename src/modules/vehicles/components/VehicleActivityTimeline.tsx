import styled from 'styled-components';
import type { VehicleActivity } from '../types';
import { formatDateTime } from '@/common/utils';
import { t } from '@/common/i18n';

const TimelineContainer = styled.div`
    background: white;
    overflow: hidden;
`;

const TimelineHeader = styled.header`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const Title = styled.h3`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const TimelineContent = styled.div`
    padding: ${props => props.theme.spacing.lg};
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

const TimelineDot = styled.div`
    position: absolute;
    left: -24px;
    top: 4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 0 4px white, 0 0 0 5px #10b981;
    z-index: 2;
`;

const ItemCard = styled.div`
    background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.md};
`;

const ItemHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.sm};
`;

const ItemTitle = styled.h4`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const ItemDate = styled.time`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const ItemMeta = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

interface VehicleActivityTimelineProps {
    activities: VehicleActivity[];
}

export const VehicleActivityTimeline = ({ activities }: VehicleActivityTimelineProps) => {
    if (activities.length === 0) {
        return (
            <TimelineContainer>
                <TimelineHeader>
                    <Title>{t.vehicles.detail.activity.title}</Title>
                    <Subtitle>{t.vehicles.detail.activity.subtitle}</Subtitle>
                </TimelineHeader>
                <TimelineContent>
                    <EmptyState>Brak zarejestrowanych zmian</EmptyState>
                </TimelineContent>
            </TimelineContainer>
        );
    }

    return (
        <TimelineContainer>
            <TimelineHeader>
                <Title>{t.vehicles.detail.activity.title}</Title>
                <Subtitle>{activities.length} zmian</Subtitle>
            </TimelineHeader>

            <TimelineContent>
                <TimelineList>
                    {activities.map(activity => (
                        <TimelineItem key={activity.id}>
                            <TimelineDot />
                            <ItemCard>
                                <ItemHeader>
                                    <ItemTitle>
                                        {t.vehicles.detail.activity.types[activity.type]}
                                    </ItemTitle>
                                    <ItemDate>{formatDateTime(activity.performedAt)}</ItemDate>
                                </ItemHeader>
                                <ItemMeta>{activity.description}</ItemMeta>
                            </ItemCard>
                        </TimelineItem>
                    ))}
                </TimelineList>
            </TimelineContent>
        </TimelineContainer>
    );
};