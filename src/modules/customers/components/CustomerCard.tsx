import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import type { Customer } from '../types';
import { formatDate, formatPhoneNumber, getFullName, formatCurrency } from '../utils/customerMappers';
import { pluralPl } from '@/common/utils';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { t } from '@/common/i18n';

const Card = styled.article`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.radii.lg};
  border-left: 4px solid var(--brand-primary);
  padding: ${props => props.theme.spacing.md};
  transition: box-shadow 0.2s ease;
  cursor: pointer;

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
    align-items: flex-start;
    gap: 4px;
    margin-bottom: ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

/* Numer telefonu na telefonie to nie napis, tylko akcja: stąd własny przycisk
   zamiast zwykłego tekstu — z ikoną słuchawki, żeby było widać, co zrobi. */
const PhoneBtn = styled.button`
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
    color: var(--brand-primary);
    font-weight: 600;
    cursor: pointer;

    svg { width: 13px; height: 13px; }
    &:active { background: rgba(14, 165, 233, 0.1); }
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
    const [callPromptOpen, setCallPromptOpen] = useState(false);

    const handleCardClick = () => {
        navigate(`/customers/${customer.id}`);
    };

    return (
        <>
        <Card onClick={handleCardClick}>
            <CardHeader>
                <div>
                    <CustomerName>{getFullName(customer)}</CustomerName>
                    {customer.company && (
                        <CompanyName>{customer.company.name}</CompanyName>
                    )}
                </div>
                <VehicleBadge>
                    {customer.vehicleCount} {pluralPl(customer.vehicleCount, 'pojazd', 'pojazdy', 'pojazdów')}
                </VehicleBadge>
            </CardHeader>

            <ContactInfo>
                {customer.contact.email && <span>{customer.contact.email}</span>}
                {/* Bez numeru nie zostawiamy myślnika — pusty wiersz zabierał
                    miejsce, nie niosąc żadnej informacji. */}
                {customer.contact.phone && (
                    <PhoneBtn
                        type="button"
                        onClick={e => { e.stopPropagation(); setCallPromptOpen(true); }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {formatPhoneNumber(customer.contact.phone)}
                    </PhoneBtn>
                )}
            </ContactInfo>

            {/* Na telefonie liczy się ostatnia wizyta i kwota do zapłaty przez
                klienta — liczba wizyt i kwota netto zostają w widoku desktopowym. */}
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

        <ConfirmationModal
            isOpen={callPromptOpen}
            title="Zadzwonić do klienta?"
            message={`Połączenie zostanie wykonane na numer ${formatPhoneNumber(customer.contact.phone)}.`}
            variant="info"
            confirmText="Zadzwoń"
            cancelText="Anuluj"
            onConfirm={() => {
                setCallPromptOpen(false);
                window.location.href = `tel:${(customer.contact.phone ?? '').replace(/[^+\d]/g, '')}`;
            }}
            onCancel={() => setCallPromptOpen(false)}
        />
        </>
    );
};