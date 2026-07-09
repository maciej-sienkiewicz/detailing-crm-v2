import type { FeaturePlan, PlanKey } from '../types';
import { formatCents, featureLabel } from '../utils/formatters';
import {
    Card,
    ActiveBadge,
    PopularBadge,
    PlanName,
    PriceBlock,
    PriceAmount,
    PricePeriod,
    FeatureList,
    FeatureItem,
    SelectBtn,
} from './PlanCard.styles';

interface Props {
    plan: FeaturePlan;
    currentPlanKey: PlanKey;
    disabled?: boolean;
    onSelect: (plan: FeaturePlan) => void;
}

const CheckIcon = ({ light }: { light: boolean }) => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
        stroke={light ? 'rgba(255,255,255,0.8)' : '#10b981'}
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

export function PlanCard({ plan, currentPlanKey, disabled, onSelect }: Props) {
    const isActive = plan.key === currentPlanKey;
    const isHighlighted = plan.key === 'FULL';

    return (
        <Card
            $active={isActive}
            $highlighted={isHighlighted}
            onClick={() => !isActive && !disabled && onSelect(plan)}
        >
            {isActive && <ActiveBadge>Aktualny plan</ActiveBadge>}
            {!isActive && isHighlighted && <PopularBadge>Polecany</PopularBadge>}

            <PlanName $light={isHighlighted}>{plan.name}</PlanName>

            <PriceBlock $light={isHighlighted}>
                <PriceAmount>{formatCents(plan.monthlyPriceGrossCents)}</PriceAmount>
                <PricePeriod $light={isHighlighted}>/mies.</PricePeriod>
            </PriceBlock>

            <FeatureList $light={isHighlighted}>
                {plan.features.map(f => (
                    <FeatureItem key={f} $light={isHighlighted}>
                        <CheckIcon light={isHighlighted} />
                        {featureLabel(f)}
                    </FeatureItem>
                ))}
            </FeatureList>

            <SelectBtn
                $light={isHighlighted}
                $active={isActive}
                disabled={isActive || disabled}
            >
                {isActive ? 'Obecny plan' : `Przejdź na ${plan.name}`}
            </SelectBtn>
        </Card>
    );
}
