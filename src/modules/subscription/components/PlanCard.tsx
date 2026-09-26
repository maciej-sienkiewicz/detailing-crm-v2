// src/modules/subscription/components/PlanCard.tsx
//
// Plan do wyboru w „Zmień plan".
//
// Plan FULL był dotąd wypełniony gradientem marki z białym tekstem - na ekranie,
// na którym i tak stał wypełniony przycisk „Przedłuż", dawało to dwa nasycone bloki,
// a polecany plan wyglądał jak krok następny (CLAUDE.md §2). Teraz każdy plan to płaski
// panel; bieżący i polecany niosą swój stan plakietką, nie wypełnieniem. Kliknięcie
// działa na przycisku, a nie na całym divie - div nie był osiągalny z klawiatury.

import { Check } from 'lucide-react';
import { Button, StatusPill } from '@/common/components/ui';
import type { FeaturePlan, PlanKey } from '../types';
import { formatCents, featureLabel, monthlyPriceSuffix } from '../utils/formatters';
import { Panel, Head, Name, PriceBlock, PriceAmount, PriceSuffix, FeatureList, FeatureItem } from './PlanCard.styles';

interface Props {
    plan: FeaturePlan;
    currentPlanKey: PlanKey;
    disabled?: boolean;
    onSelect: (plan: FeaturePlan) => void;
}

export function PlanCard({ plan, currentPlanKey, disabled, onSelect }: Props) {
    const isActive = plan.key === currentPlanKey;
    const isRecommended = plan.key === 'FULL';
    const suffix = monthlyPriceSuffix(plan.monthlyPriceGrossCents);

    return (
        <Panel $current={isActive}>
            <Head>
                <Name>{plan.name}</Name>
                {isActive
                    ? <StatusPill $tone="ok">Twój plan</StatusPill>
                    : isRecommended && <StatusPill $tone="info">Polecany</StatusPill>}
            </Head>

            <PriceBlock>
                <PriceAmount>{formatCents(plan.monthlyPriceGrossCents)}</PriceAmount>
                {suffix && <PriceSuffix>{suffix}</PriceSuffix>}
            </PriceBlock>

            {plan.features.length > 0 && (
                <FeatureList>
                    {plan.features.map(f => (
                        <FeatureItem key={f}>
                            <Check aria-hidden="true" />
                            {featureLabel(f)}
                        </FeatureItem>
                    ))}
                </FeatureList>
            )}

            {!isActive && (
                <Button variant="outline" block disabled={disabled} onClick={() => onSelect(plan)}>
                    Przejdź na {plan.name}
                </Button>
            )}
        </Panel>
    );
}
