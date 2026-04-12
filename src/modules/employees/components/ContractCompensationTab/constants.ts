import type {
    ContractType,
    EtatFraction,
    EmploymentMode,
    ComponentType,
    CalculationBase,
    PaymentFrequency,
} from '../../types';

export const ETAT_HOURS: Record<EtatFraction, number> = {
    FULL: 168,
    HALF: 84,
    QUARTER: 42,
};

export const ETAT_LABELS: Record<EtatFraction, string> = {
    FULL: 'Pełen etat',
    HALF: 'Pół etatu',
    QUARTER: 'Ćwierć etatu',
};

export const ETAT_SHORT: Record<EtatFraction, string> = {
    FULL: '168 h/mies.',
    HALF: '84 h/mies.',
    QUARTER: '42 h/mies.',
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
    UOP: 'Umowa o pracę',
    UZ: 'Umowa zlecenie',
    B2B: 'B2B',
};

export const EMPLOYMENT_MODE_LABELS: Record<EmploymentMode, string> = {
    SALARY: 'Stała miesięczna',
    HOURLY: 'Stawka godzinowa',
};

export const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
    FIXED: 'Stały dodatek',
    PERCENTAGE_OF_REVENUE: 'Premia od obrotu',
    HOURLY: 'Godzinowy',
    BONUS: 'Premia uznaniowa',
};

export const CALC_BASE_LABELS: Record<CalculationBase, string> = {
    GROSS_REVENUE: 'Obrót brutto',
    NET_REVENUE: 'Obrót netto',
    HOURS_WORKED: 'Prz. godziny',
};

export const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
    MONTHLY: 'Miesięcznie',
    QUARTERLY: 'Kwartalnie',
    ANNUALLY: 'Rocznie',
    ONE_TIME: 'Jednorazowo',
};
