import styled from 'styled-components';
import type { VehicleVisitSummary } from '../types';
import { formatDateTime, formatCurrency } from '@/common/utils';

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

type CardVariant = 'default' | 'upcoming' | 'active' | 'abandoned';

const VisitCard = styled.div<{ $variant: CardVariant }>`
    background: ${props => {
        if (props.$variant === 'abandoned') return 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)';
        if (props.$variant === 'upcoming') return 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
        if (props.$variant === 'active') return 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
        return 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)';
    }};
    border: 1px solid ${props => {
        if (props.$variant === 'abandoned') return '#fecdd3';
        if (props.$variant === 'upcoming') return '#bae6fd';
        if (props.$variant === 'active') return '#bbf7d0';
        return props.theme.colors.border;
    }};
    border-left: 4px solid ${props => {
        if (props.$variant === 'abandoned') return '#f43f5e';
        if (props.$variant === 'upcoming') return '#0ea5e9';
        if (props.$variant === 'active') return '#10b981';
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
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

/* Polish license plate styling, matching visits/components/InfoCards.tsx */
const LicensePlate = styled.div`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 10px 4px 20px;
    background: linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%);
    border: 2px solid #000000;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #000000;
    box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        inset 0 -1px 0 rgba(0, 0, 0, 0.1);
    position: relative;
    text-transform: uppercase;
    width: fit-content;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 16px;
        background: linear-gradient(180deg, #003399 0%, #002266 100%);
        border-right: 1px solid #000000;
        border-radius: 2px 0 0 2px;
    }

    &::after {
        content: 'PL';
        position: absolute;
        left: 3px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 8px;
        font-weight: 700;
        color: #ffffff;
        letter-spacing: 0.3px;
    }
`;

const VisitDate = styled.div`
    text-align: right;
    flex-shrink: 0;
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

const StatusBadge = styled.span<{ $variant: CardVariant }>`
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    text-transform: uppercase;

    ${props => {
        if (props.$variant === 'abandoned') return 'background: #ffe4e6; color: #be123c;';
        if (props.$variant === 'upcoming') return 'background: #e0f2fe; color: #0369a1;';
        if (props.$variant === 'active') return 'background: #dcfce7; color: #166534;';
        return 'background: #f1f5f9; color: #64748b;';
    }}
`;

const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xxl};
    color: ${props => props.theme.colors.textMuted};
`;

interface VehicleVisitHistoryProps {
    visits: VehicleVisitSummary[];
    licensePlate: string;
}

const visitStatusTranslations: Record<string, string> = {
    // lowercase / kebab
    'completed': 'Zakończono',
    'in-progress': 'W trakcie',
    'scheduled': 'Zaplanowano',
    'cancelled': 'Porzucona',
    'rejected': 'Porzucona',
    'draft': 'Rezerwacja',
    'archived': 'Zarchiwizowana',
    'ready-for-pickup': 'Gotowe do odbioru',
    // uppercase (from backend)
    'COMPLETED': 'Zakończono',
    'IN_PROGRESS': 'W trakcie',
    'SCHEDULED': 'Zaplanowano',
    'CANCELLED': 'Porzucona',
    'REJECTED': 'Porzucona',
    'DRAFT': 'Rezerwacja',
    'ARCHIVED': 'Zarchiwizowana',
    'READY_FOR_PICKUP': 'Gotowe do odbioru',
};

const getCardVariant = (status: string): CardVariant => {
    const s = status.toLowerCase().replace(/_/g, '-');
    if (s === 'rejected' || s === 'cancelled') return 'abandoned';
    if (s === 'draft') return 'upcoming';
    if (s === 'completed' || s === 'in-progress' || s === 'ready-for-pickup') return 'active';
    return 'default';
};

const getDateLabel = (status: string, date: string): string => {
    const s = status.toLowerCase().replace(/_/g, '-');
    if (s === 'draft') return 'Planowana';
    if (s === 'rejected' || s === 'cancelled') return 'Porzucona';
    return new Date(date) > new Date() ? 'Planowana' : 'Wykonana';
};

export const VehicleVisitHistory = ({ visits, licensePlate }: VehicleVisitHistoryProps) => {
    if (visits.length === 0) {
        return (
            <HistoryContainer>
                <HistoryHeader>
                    <Title>Historia wizyt</Title>
                    <Subtitle>Wizyty i rezerwacje pojazdu</Subtitle>
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
                <Subtitle>{visits.length} {visits.length === 1 ? 'wizyta' : visits.length < 5 ? 'wizyty' : 'wizyt'} w systemie</Subtitle>
            </HistoryHeader>

            <VisitList>
                {sortedVisits.map(visit => {
                    const variant = getCardVariant(visit.status);
                    const statusLabel = visitStatusTranslations[visit.status] ?? visit.status;

                    return (
                        <VisitCard key={visit.id} $variant={variant}>
                            <VisitHeader>
                                <VisitTitleSection>
                                    <LicensePlate>{licensePlate}</LicensePlate>
                                </VisitTitleSection>
                                <VisitDate>
                                    <DateValue>{formatDateTime(visit.date)}</DateValue>
                                    <DateLabel>{getDateLabel(visit.status, visit.date)}</DateLabel>
                                </VisitDate>
                            </VisitHeader>

                            <VisitMeta>
                                <MetaItem>
                                    <MetaLabel>Status</MetaLabel>
                                    <StatusBadge $variant={variant}>
                                        {statusLabel}
                                    </StatusBadge>
                                </MetaItem>
                                <MetaItem>
                                    <MetaLabel>Koszt</MetaLabel>
                                    <MetaValue>
                                        {visit.totalCost.grossAmount > 0
                                            ? formatCurrency(visit.totalCost.grossAmount, visit.totalCost.currency)
                                            : '—'
                                        }
                                    </MetaValue>
                                </MetaItem>
                            </VisitMeta>
                        </VisitCard>
                    );
                })}
            </VisitList>
        </HistoryContainer>
    );
};
