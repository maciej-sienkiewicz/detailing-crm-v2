import type { DayStats } from './types';
import { StatsBar, StatCell, StatLabel, StatValue } from './styles';

function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount / 100);
}

interface StatsStripProps {
    stats: DayStats;
}

export const StatsStrip = ({ stats }: StatsStripProps) => (
    <StatsBar>
        <StatCell>
            <StatLabel>Przychód brutto</StatLabel>
            <StatValue $accent>{formatCurrency(stats.totalGross, stats.currency)}</StatValue>
        </StatCell>
        <StatCell>
            <StatLabel>Zdarzeń</StatLabel>
            <StatValue>{stats.totalEvents}</StatValue>
        </StatCell>
        <StatCell>
            <StatLabel>Wizyty</StatLabel>
            <StatValue>{stats.visitCount}</StatValue>
        </StatCell>
        <StatCell>
            <StatLabel>Rezerwacje</StatLabel>
            <StatValue>{stats.appointmentCount}</StatValue>
        </StatCell>
    </StatsBar>
);
