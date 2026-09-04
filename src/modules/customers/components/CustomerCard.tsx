import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import type { Customer } from '../types';
import { formatDate, formatPhoneNumber, getFullName, formatCurrency } from '../utils/customerMappers';
import { pluralPl } from '@/common/utils';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { t } from '@/common/i18n';

/* Kafelka mówi tym samym językiem co lista wizyt: biała karta, cienki obrys,
   delikatne uniesienie. Klient nie ma statusu, którego kolor musiałby pilnować,
   więc karta nie potrzebuje kolorowego paska - akcent zostaje dla rzeczy,
   które faktycznie coś znaczą (numer telefonu jako akcja). */
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

const CustomerName = styled.h3`
  margin: 0;
  font-size: ${props => props.theme.fontSizes.md};
  font-weight: 700;
  letter-spacing: -0.2px;
  color: ${st.text};
`;

const CompanyName = styled.span`
  display: block;
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${st.textMuted};
  margin-top: 2px;
`;

/* Liczba pojazdów to metadana, nie ostrzeżenie - stonowana pigułka jak
   pozostałe znaczniki w aplikacji, zamiast pełnego wypełnienia marką. */
const VehicleBadge = styled.span`
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

const ContactInfo = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    margin-bottom: ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${st.textSecondary};
`;

/* Numer telefonu na telefonie to nie napis, tylko akcja: odnośnik tel:, który
   system i tak potwierdza własnym pytaniem przed wybraniem numeru. */
const PhoneBtn = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 8px;
    margin-left: -8px;
    background: none;
    border: none;
    border-radius: ${props => props.theme.radii.full};
    font-family: inherit;
    font-size: inherit;
    text-decoration: none;
    color: ${st.accentBlue};
    font-weight: 600;
    cursor: pointer;

    svg { width: 13px; height: 13px; }
    &:active { background: ${st.accentBlueDim}; }
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

const StatLabel = styled.span`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${st.textMuted};
`;

const StatValue = styled.span`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: 600;
  color: ${st.text};
`;

const StatValueRight = styled(StatValue)`
  text-align: right;
`;

const StatLabelRight = styled(StatLabel)`
  text-align: right;
`;

interface CustomerCardProps {
    customer: Customer;
}

export const CustomerCard = ({ customer }: CustomerCardProps) => {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/customers/${customer.id}`);
    };

    return (
        <Card onClick={handleCardClick}>
            <CardHeader>
                <div>
                    <CustomerName>{getFullName(customer)}</CustomerName>
                    {customer.company && (
                        <CompanyName>{customer.company.name}</CompanyName>
                    )}
                </div>
                <VehicleBadge>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                        <path d="M19 17H5a2 2 0 0 1-2-2V9l2-4h10l4 4v4a2 2 0 0 1-2 2Z" />
                        <circle cx="7.5" cy="17" r="1.5" />
                        <circle cx="16.5" cy="17" r="1.5" />
                    </svg>
                    {customer.vehicleCount} {pluralPl(customer.vehicleCount, 'pojazd', 'pojazdy', 'pojazdów')}
                </VehicleBadge>
            </CardHeader>

            <ContactInfo>
                {customer.contact.email && <span>{customer.contact.email}</span>}
                {/* Bez numeru nie zostawiamy myślnika - pusty wiersz zabierał
                    miejsce, nie niosąc żadnej informacji. */}
                {customer.contact.phone && (
                    <PhoneBtn
                        href={`tel:${customer.contact.phone.replace(/[^+\d]/g, '')}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {formatPhoneNumber(customer.contact.phone)}
                    </PhoneBtn>
                )}
            </ContactInfo>

            {/* Na telefonie liczy się ostatnia wizyta i kwota do zapłaty przez
                klienta - liczba wizyt i kwota netto zostają w widoku desktopowym. */}
            <StatsGrid>
                <StatItem>
                    <StatLabel>{t.customers.card.lastVisit}</StatLabel>
                    <StatValue>{formatDate(customer.lastVisitDate)}</StatValue>
                </StatItem>
                <StatItem>
                    <StatLabelRight>Przychód (brutto)</StatLabelRight>
                    <StatValueRight>
                        {formatCurrency(customer.totalRevenue.grossAmount, customer.totalRevenue.currency)}
                    </StatValueRight>
                </StatItem>
            </StatsGrid>
        </Card>
    );
};