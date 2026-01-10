import styled from 'styled-components';
import type { Customer } from '../types';
import { formatDate, formatPhoneNumber, getFullName, formatCurrency } from '../utils/customerMappers';
import { t } from '@/common/i18n';

const Card = styled.article`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.radii.lg};
  border-left: 4px solid var(--brand-primary);
  padding: ${props => props.theme.spacing.md};
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: ${props => props.theme.shadows.md};
  }
`;

const CardHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const CustomerName = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const CompanyName = styled.span`
  display: block;
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.textMuted};
  margin-top: 2px;
`;

const VehicleBadge = styled.span`
  background: var(--brand-primary);
  color: white;
  font-size: ${props => props.theme.fontSizes.xs};
  padding: 2px 8px;
  border-radius: ${props => props.theme.radii.full};
  font-weight: 500;
`;

const ContactInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${props => props.theme.spacing.xs};
  padding-top: ${props => props.theme.spacing.sm};
  border-top: 1px solid ${props => props.theme.colors.border};
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatLabel = styled.span`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.textMuted};
`;

const StatValue = styled.span`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

const RevenueItem = styled.div`
  display: flex;
  flex-direction: column;
  grid-column: span 2;
`;

const RevenueValues = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RevenueRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${props => props.theme.fontSizes.sm};
`;

const RevenueLabel = styled.span`
  color: ${props => props.theme.colors.textMuted};
`;

const RevenueValue = styled.span`
  font-weight: 500;
  color: ${props => props.theme.colors.text};
`;

interface CustomerCardProps {
    customer: Customer;
}

export const CustomerCard = ({ customer }: CustomerCardProps) => (
    <Card>
        <CardHeader>
            <div>
                <CustomerName>{getFullName(customer)}</CustomerName>
                {customer.company && (
                    <CompanyName>{customer.company.name}</CompanyName>
                )}
            </div>
            <VehicleBadge>
                {customer.vehicleCount} {t.customers.card.vehicles}
            </VehicleBadge>
        </CardHeader>

        <ContactInfo>
            <span>{customer.contact.email}</span>
            <span>{formatPhoneNumber(customer.contact.phone)}</span>
        </ContactInfo>

        <StatsGrid>
            <StatItem>
                <StatLabel>{t.customers.card.lastVisit}</StatLabel>
                <StatValue>{formatDate(customer.lastVisitDate)}</StatValue>
            </StatItem>
            <StatItem>
                <StatLabel>{t.customers.card.totalVisits}</StatLabel>
                <StatValue>{customer.totalVisits}</StatValue>
            </StatItem>
            <RevenueItem>
                <StatLabel>{t.customers.card.revenue}</StatLabel>
                <RevenueValues>
                    <RevenueRow>
                        <RevenueLabel>{t.customers.table.revenueNet}:</RevenueLabel>
                        <RevenueValue>
                            {formatCurrency(customer.totalRevenue.netAmount, customer.totalRevenue.currency)}
                        </RevenueValue>
                    </RevenueRow>
                    <RevenueRow>
                        <RevenueLabel>{t.customers.table.revenueGross}:</RevenueLabel>
                        <RevenueValue>
                            {formatCurrency(customer.totalRevenue.grossAmount, customer.totalRevenue.currency)}
                        </RevenueValue>
                    </RevenueRow>
                </RevenueValues>
            </RevenueItem>
        </StatsGrid>
    </Card>
);