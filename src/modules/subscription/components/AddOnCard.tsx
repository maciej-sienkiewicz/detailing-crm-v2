// src/modules/subscription/components/AddOnCard.tsx
//
// Moduł do dokupienia. Włączone moduły stoją w karcie „Twój pakiet" razem z przyciskiem
// wyłączenia - wcześniej ten sam moduł miał „Dezaktywuj" dwa razy na jednym ekranie
// (w liście aktywnych i tu), więc tu wyłączenie jest tylko wtedy, gdy wywołujący
// o nie poprosi (`onDeactivate`).

import { Button, StatusPill } from '@/common/components/ui';
import type { AddOnDto, AddOnKey } from '../types';
import { formatCents, monthlyPriceSuffix } from '../utils/formatters';
import { Panel, Head, Name, Desc, Footer, Price, PriceNote } from './AddOnCard.styles';

interface Props {
    addOn: AddOnDto;
    isActive: boolean;
    disabled?: boolean;
    /** Dopisek pod ceną, np. „Bez opłat do końca okresu próbnego" - cena bez niego sugerowała płatność. */
    priceNote?: string;
    onActivate: (key: AddOnKey) => void;
    onDeactivate?: (key: AddOnKey) => void;
}

export function AddOnCard({ addOn, isActive, disabled, priceNote, onActivate, onDeactivate }: Props) {
    const suffix = monthlyPriceSuffix(addOn.monthlyPriceGrossCents);

    return (
        <Panel $unavailable={!addOn.isAvailable && !isActive}>
            <Head>
                <Name>{addOn.name}</Name>
                {isActive && <StatusPill $tone="ok">Włączony</StatusPill>}
                {!addOn.isAvailable && !isActive && <StatusPill>Wkrótce</StatusPill>}
            </Head>

            <Desc>{addOn.description}</Desc>

            <Footer>
                <Price>
                    <strong>{formatCents(addOn.monthlyPriceGrossCents)}</strong>
                    {suffix && <span>{suffix}</span>}
                    {priceNote && <PriceNote>{priceNote}</PriceNote>}
                </Price>

                {isActive ? (
                    onDeactivate && (
                        <Button variant="danger" size="sm" disabled={disabled} onClick={() => onDeactivate(addOn.key)}
                            aria-label={`Wyłącz moduł ${addOn.name}`}>
                            Wyłącz
                        </Button>
                    )
                ) : addOn.isAvailable && (
                    // Osiem przycisków „Włącz" bez nazwy modułu czytnik ekranu odczytywał identycznie.
                    <Button variant="tinted" size="sm" disabled={disabled} onClick={() => onActivate(addOn.key)}
                        aria-label={`Włącz moduł ${addOn.name}`}>
                        Włącz
                    </Button>
                )}
            </Footer>
        </Panel>
    );
}
