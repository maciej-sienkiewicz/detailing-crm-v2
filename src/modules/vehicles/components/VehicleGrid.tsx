import styled from 'styled-components';
import type { VehicleListItem } from '../types';
import { VehicleCard } from './VehicleCard';

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

interface VehicleGridProps {
    vehicles: VehicleListItem[];
    onCardClick?: (vehicleId: string) => void;
}

export const VehicleGrid = ({ vehicles, onCardClick }: VehicleGridProps) => (
    <Grid>
        {vehicles.map(vehicle => (
            <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onCardClick={onCardClick}
            />
        ))}
    </Grid>
);