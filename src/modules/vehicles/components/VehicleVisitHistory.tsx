import styled from 'styled-components';
import type { VehicleVisitSummary } from '../types';
import { formatDateTime, formatCurrency } from '@/common/utils';
import { t } from '@/common/i18n';

const HistoryContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const HistoryHeader = styled.header`
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

const VisitList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.lg};
`;

const VisitCard = styled.div<{ $status: string }>`
    background: ${props => {
        if (props.$status === 'scheduled') return 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)';
        if (props.$status === 'in-progress') return 'linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%)';
        return 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)';
    }};
    border: 1px solid ${props => props.theme.colors.border};
    border-left: 4px solid ${props => {
        if (props.$status === 'scheduled') return '#f59e0b';
        if (props.$status === 'in-progress') return 'var(--brand-primary)';
        if (props.$status === 'completed') return '#10b981';
        return '#94a3b8';
    }};
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.md};
    transition: all 0.2s ease;

    &:hover {
        box-shadow: ${props => props.theme.shadows.md};
    }
`;

const VisitHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.sm};
    gap: ${props => props.theme.spacing.sm};
`;

const VisitTitleSection = styled.div`
    flex: 1;
`;

const VisitTitle = styled.h4`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const VisitType = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const VisitDate = styled.div`
    text-align: right;
`;

const DateValue = styled.time`
    display: block;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

const DateLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const VisitMeta = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.md};
    padding-top: ${props => props.theme.spacing.sm};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const MetaItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const MetaLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const MetaValue = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

const StatusBadge = styled.span<{ $status: string }>`
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    text-transform: uppercase;

    ${props => {
        if (props.$status === 'completed') return 'background: #dcfce7; color: #166534;';
        if (props.$status === 'in-progress') return 'background: #dbeafe; color: #1e40af;';
        if (props.$status === 'scheduled') return 'background: #fef3c7; color: #92400e;';
        return 'background: #f3f4f6; color: #6b7280;';
    }}
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

interface VehicleVisitHistoryProps {
    visits: VehicleVisitSummary[];
}

const visitTypeTranslations: Record<string, string> = {
    service: 'Serwis',
    repair: 'Naprawa',
    inspection: 'Przegląd',
    consultation: 'Konsultacja',
};

const visitStatusTranslations: Record<string, string> = {
    completed: 'Zakończono',
    'in-progress': 'W trakcie',
    scheduled: 'Zaplanowano',
    cancelled: 'Anulowano',
};

export const VehicleVisitHistory = ({ visits }: VehicleVisitHistoryProps) => {
    if (visits.length === 0) {
        return (
            <HistoryContainer>
                <HistoryHeader>
                    <Title>Historia wizyt</Title>
                    <Subtitle>Wizyty serwisowe pojazdu</Subtitle>
                </HistoryHeader>
                <EmptyState>
                    Brak wizyt przypisanych do tego pojazdu
                </EmptyState>
            </HistoryContainer>
        );
    }

    const sortedVisits = [...visits].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <HistoryContainer>
            <HistoryHeader>
                <Title>Historia wizyt</Title>
                <Subtitle>{visits.length} wizyt w systemie</Subtitle>
            </HistoryHeader>

            <VisitList>
                {sortedVisits.map(visit => (
                    <VisitCard key={visit.id} $status={visit.status}>
                        <VisitHeader>
                            <VisitTitleSection>
                                <VisitTitle>{visit.description}</VisitTitle>
                                <VisitType>{visitTypeTranslations[visit.type] || visit.type}</VisitType>
                            </VisitTitleSection>
                            <VisitDate>
                                <DateValue>{formatDateTime(visit.date)}</DateValue>
                                <DateLabel>
                                    {new Date(visit.date) > new Date() ? 'Zaplanowana' : 'Wykonana'}
                                </DateLabel>
                            </VisitDate>
                        </VisitHeader>

                        <VisitMeta>
                            <MetaItem>
                                <MetaLabel>Status</MetaLabel>
                                <StatusBadge $status={visit.status}>
                                    {visitStatusTranslations[visit.status] || visit.status}
                                </StatusBadge>
                            </MetaItem>
                            <MetaItem>
                                <MetaLabel>Koszt</MetaLabel>
                                <MetaValue>
                                    {formatCurrency(visit.totalCost.grossAmount, visit.totalCost.currency)}
                                </MetaValue>
                            </MetaItem>
                        </VisitMeta>
                    </VisitCard>
                ))}
            </VisitList>
        </HistoryContainer>
    );
};