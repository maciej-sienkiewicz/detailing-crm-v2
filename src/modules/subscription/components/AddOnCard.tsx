import type { AddOnDto, AddOnKey } from '../types';
import { formatCents } from '../utils/formatters';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDesc,
    PriceTag,
    SoonBadge,
    ActiveBadge,
    CardFooter,
    ActionBtn,
} from './AddOnCard.styles';

interface Props {
    addOn: AddOnDto;
    isActive: boolean;
    disabled?: boolean;
    onActivate: (key: AddOnKey) => void;
    onDeactivate: (key: AddOnKey) => void;
}

const CheckIcon = () => (
    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

export function AddOnCard({ addOn, isActive, disabled, onActivate, onDeactivate }: Props) {
    const priceDisplay = addOn.monthlyPriceGrossCents != null
        ? formatCents(addOn.monthlyPriceGrossCents)
        : 'Cena do ustalenia';

    return (
        <Card $active={isActive} $unavailable={!addOn.isAvailable}>
            <CardHeader>
                <div>
                    <CardTitle>{addOn.name}</CardTitle>
                </div>
                {isActive && (
                    <ActiveBadge><CheckIcon /> Aktywny</ActiveBadge>
                )}
                {!addOn.isAvailable && !isActive && (
                    <SoonBadge>Wkrótce</SoonBadge>
                )}
            </CardHeader>

            <CardDesc>{addOn.description}</CardDesc>

            <CardFooter>
                {addOn.monthlyPriceGrossCents != null ? (
                    <PriceTag>
                        {priceDisplay}<span>/mies.</span>
                    </PriceTag>
                ) : (
                    <PriceTag style={{ fontSize: 13, fontWeight: 600 }}>
                        Cena do ustalenia
                    </PriceTag>
                )}

                {isActive ? (
                    <ActionBtn
                        $variant="deactivate"
                        disabled={disabled}
                        onClick={() => onDeactivate(addOn.key)}
                    >
                        Dezaktywuj
                    </ActionBtn>
                ) : addOn.isAvailable ? (
                    <ActionBtn
                        $variant="activate"
                        disabled={disabled}
                        onClick={() => onActivate(addOn.key)}
                    >
                        Aktywuj
                    </ActionBtn>
                ) : (
                    <ActionBtn $variant="disabled" disabled>
                        Niedostępny
                    </ActionBtn>
                )}
            </CardFooter>
        </Card>
    );
}
