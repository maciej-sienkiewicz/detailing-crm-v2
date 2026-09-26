// src/modules/subscription/components/AddOnCard.tsx
//
// Moduł do dokupienia. Aktywne moduły stoją w karcie „Twój plan" razem z przyciskiem
// wyłączenia - wcześniej ten sam moduł miał „Dezaktywuj" dwa razy na jednym ekranie
// (w liście aktywnych i tu), więc tu wyłączenie jest tylko wtedy, gdy wywołujący
// o nie poprosi (`onDeactivate`).

import { Button, StatusPill } from '@/common/components/ui';
import type { AddOnDto, AddOnKey } from '../types';
import { formatCents, monthlyPriceSuffix } from '../utils/formatters';
import { Panel, Head, Name, Desc, Footer, Price } from './AddOnCard.styles';

interface Props {
    addOn: AddOnDto;
    isActive: boolean;
    disabled?: boolean;
    onActivate: (key: AddOnKey) => void;
    onDeactivate?: (key: AddOnKey) => void;
}

export function AddOnCard({ addOn, isActive, disabled, onActivate, onDeactivate }: Props) {
    const suffix = monthlyPriceSuffix(addOn.monthlyPriceGrossCents);

    return (
        <Panel $unavailable={!addOn.isAvailable && !isActive}>
            <Head>
                <Name>{addOn.name}</Name>
                {isActive && <StatusPill $tone="ok">Aktywny</StatusPill>}
                {!addOn.isAvailable && !isActive && <StatusPill>Wkrótce</StatusPill>}
            </Head>

            <Desc>{addOn.description}</Desc>

            <Footer>
                <Price>
                    <strong>{formatCents(addOn.monthlyPriceGrossCents)}</strong>
                    {suffix && <span>{suffix}</span>}
                </Price>

                {isActive ? (
                    onDeactivate && (
                        <Button variant="danger" size="sm" disabled={disabled} onClick={() => onDeactivate(addOn.key)}>
                            Dezaktywuj
                        </Button>
                    )
                ) : addOn.isAvailable && (
                    <Button variant="tinted" size="sm" disabled={disabled} onClick={() => onActivate(addOn.key)}>
                        Aktywuj
                    </Button>
                )}
            </Footer>
        </Panel>
    );
}
