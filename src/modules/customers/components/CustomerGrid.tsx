import styled from 'styled-components';
import type { Customer } from '../types';
import { CustomerCard } from './CustomerCard';

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${props => props.theme.spacing.md};

  @media (min-width: ${props => props.theme.breakpoints.sm}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${props => props.theme.breakpoints.xl}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

interface CustomerGridProps {
    customers: Customer[];
}

export const CustomerGrid = ({ customers }: CustomerGridProps) => (
    <Grid>
        {customers.map(customer => (
            <CustomerCard key={customer.id} customer={customer} />
        ))}
    </Grid>
);