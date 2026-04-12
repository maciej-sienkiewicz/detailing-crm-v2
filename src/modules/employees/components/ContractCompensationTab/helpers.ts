import type {
    EtatFraction,
    CompensationComponent,
    ContractType,
    EmploymentMode,
    InitialCompensation,
} from '../../types';
import { ETAT_HOURS } from './constants';

export const formatCents = (cents: number): string =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);

export const formatDate = (dateStr: string): string =>
    new Date(dateStr).toLocaleDateString('pl-PL');

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const calcHourlyFromMonthlyCents = (monthlyCents: number, fraction: EtatFraction): string =>
    (monthlyCents / 100 / ETAT_HOURS[fraction]).toFixed(2);

export const calcHourlyPreview = (monthlyPln: string, fraction: EtatFraction): string | null => {
    const v = parseFloat(monthlyPln);
    if (!v || v <= 0) return null;
    return (v / ETAT_HOURS[fraction]).toFixed(2);
};

export const formatComponentValue = (comp: CompensationComponent): string => {
    if (comp.type === 'PERCENTAGE_OF_REVENUE') return `${comp.value}%`;
    if (comp.type === 'HOURLY') return `${formatCents(comp.value * 100)}/h`;
    return formatCents(comp.value * 100);
};

export const buildInitialCompensation = (
    contractType: ContractType,
    employmentMode: EmploymentMode,
    etatFraction: EtatFraction,
    monthlySalaryPln: string,
    hourlyRatePln: string,
): InitialCompensation => {
    if (employmentMode === 'SALARY') {
        return {
            employmentMode: 'SALARY',
            etatFraction,
            monthlySalaryGrossCents: Math.round(parseFloat(monthlySalaryPln) * 100),
        };
    }
    if (contractType === 'B2B') {
        return {
            employmentMode: 'HOURLY',
            rateType: 'NET',
            hourlyRateNetCents: Math.round(parseFloat(hourlyRatePln) * 100),
        };
    }
    return {
        employmentMode: 'HOURLY',
        rateType: 'GROSS',
        hourlyRateGrossCents: Math.round(parseFloat(hourlyRatePln) * 100),
    };
};
