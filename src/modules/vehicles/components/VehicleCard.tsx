import styled from 'styled-components';
import type { VehicleListItem } from '../types';
import { formatCurrency, formatDate } from '@/common/utils';
import { t } from '@/common/i18n';
import { CarLogoImage } from './CarLogoImage';
import { PiiValue } from '@/common/pii';
import { pluralPl } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/* Kafelka mówi tym samym językiem co karta klienta: biała, cienki obrys,
   delikatne uniesienie. Kolor zostaje dla rzeczy, które coś znaczą. */
const Card = styled.article`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: 12px;
    padding: ${props => props.theme.spacing.md};
    box-shadow: ${st.shadowXs};
    transition: box-shadow ${st.transition}, border-color ${st.transition};
    cursor: pointer;

    &:hover {
        border-color: ${st.borderHover};
        box-shadow: ${st.shadowSm};
    }
`;

const CardHeader = styled.header`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.sm};
`;

/* Tablica rejestracyjna wygląda tak samo jak na liście wizyt - ciemna,
   monospace'owa plakietka, nie kolorowy baner. */
const LicensePlate = styled.div`
    display: inline-flex;
    align-items: center;
    padding: 3px 9px;
    background: #1E293B;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    border-radius: 5px;
    letter-spacing: 0.08em;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
`;

const VehicleName = styled.div`
    margin-top: 5px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.2px;
    color: ${st.text};
`;

const VisitBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: ${st.bgCardAlt};
    color: ${st.textSecondary};
    border: 1px solid ${st.border};
    font-size: ${props => props.theme.fontSizes.xs};
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    font-weight: 600;
    white-space: nowrap;

    svg { width: 12px; height: 12px; color: ${st.textMuted}; }
`;

const OwnersSection = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: ${props => props.theme.spacing.sm};
`;

/* Rola właściciela to niuans, nie status do podświetlania - jeden stonowany
   znacznik dla wszystkich, główny właściciel wyróżniony samą grubością. */
const OwnerTag = styled.span<{ $role: string }>`
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.$role === 'PRIMARY' ? 600 : 500};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    color: ${props => props.$role === 'PRIMARY' ? st.textSecondary : st.textMuted};
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.xs};
    padding-top: ${props => props.theme.spacing.sm};
    border-top: 1px solid ${st.border};
`;

const StatItem = styled.div`
    display: flex;
    flex-direction: column;
`;

const StatLabel = styled.span<{ $right?: boolean }>`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${st.textMuted};
    ${props => props.$right && 'text-align: right;'}
`;

const StatValue = styled.span<{ $right?: boolean }>`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${st.text};
    ${props => props.$right && 'text-align: right;'}
`;


interface VehicleCardProps {
    vehicle: VehicleListItem;
    onCardClick?: (vehicleId: string) => void;
}

export const VehicleCard = ({ vehicle, onCardClick }: VehicleCardProps) => (
    <Card onClick={() => onCardClick?.(vehicle.id)}>
        <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CarLogoImage brand={vehicle.brand} size="md" />
                <div>
                    <LicensePlate>{vehicle.licensePlate}</LicensePlate>
                    <VehicleName>
                        {vehicle.brand} {vehicle.model} ({vehicle.yearOfProduction})
                    </VehicleName>
                </div>
            </div>
            <VisitBadge>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <rect x="3" y="4" width="18" height="18" rx="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {vehicle.stats.totalVisits} {pluralPl(vehicle.stats.totalVisits, 'wizyta', 'wizyty', 'wizyt')}
            </VisitBadge>
        </CardHeader>

        <OwnersSection>
            {vehicle.owners.map(owner => (
                <OwnerTag key={owner.customerId} $role={owner.role}>
                    <PiiValue value={owner.customerName} kind="name" />
                </OwnerTag>
            ))}
        </OwnersSection>

        <StatsGrid>
            <StatItem>
                <StatLabel>{t.vehicles.card.lastVisit}</StatLabel>
                <StatValue>
                    {vehicle.stats.lastVisitDate ? formatDate(vehicle.stats.lastVisitDate) : '-'}
                </StatValue>
            </StatItem>
            <StatItem>
                <StatLabel $right>Przychód (brutto)</StatLabel>
                <StatValue $right>
                    {formatCurrency(
                        vehicle.stats.totalSpent.grossAmount,
                        vehicle.stats.totalSpent.currency
                    )}
                </StatValue>
            </StatItem>
        </StatsGrid>
    </Card>
);