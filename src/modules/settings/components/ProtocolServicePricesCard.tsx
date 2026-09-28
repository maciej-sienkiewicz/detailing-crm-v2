// src/modules/settings/components/ProtocolServicePricesCard.tsx
//
// Ustawienia → Komunikacja → Dokumenty i podpisy → „Ceny usług na protokole przyjęcia".
//
// Protokół przyjęcia wypisuje nazwy usług i jedną kwotę łączną. Część studiów chce przy
// każdej usłudze jej cenę w nawiasie, część świadomie pokazuje tylko sumę - dlatego to
// ustawienie, a nie stała reguła. Domyślnie wyłączone: tak wyglądał protokół wcześniej.
//
// Budowa jak karta logo obok (DocumentLogoCard): pytanie jest nagłówkiem, podpis mówi,
// co się stanie po przestawieniu, zapis od razu po kliknięciu, błąd cofa stan.

import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';
import { useToast } from '@/common/components/Toast';
import { usePermissions } from '@/core/permissions';
import { Panel } from '@/common/components/ui';
import { useProtocolContentConfig, useUpdateProtocolContentConfig } from '../hooks/useCompany';
import { shownByInterceptor } from './studioErrors';

const Card = styled(Panel)`
    padding: 16px 20px;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

const OptionRow = styled.div<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 16px;
    opacity: ${p => (p.$disabled ? 0.6 : 1)};
`;

const OptionTexts = styled.div`
    flex: 1;
    min-width: 0;
`;

const OptionLabel = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const OptionHint = styled.div`
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
    margin-top: 2px;
    line-height: 1.45;
`;

const Example = styled.span`
    color: ${p => p.theme.colors.text};
    font-weight: 600;
`;

export function ProtocolServicePricesCard() {
    const { isOwner } = usePermissions();
    const { config, isLoading } = useProtocolContentConfig();
    const updateMutation = useUpdateProtocolContentConfig();
    const { showError } = useToast();

    // Do czasu odpowiedzi zakładamy stan domyślny backendu (bez cen).
    const enabled = config?.showServicePrices ?? false;
    const locked = isLoading || updateMutation.isPending || !isOwner;

    const handleChange = (value: boolean) => {
        updateMutation.mutate(
            { showServicePrices: value },
            {
                onError: error => {
                    if (!shownByInterceptor(error)) showError('Nie udało się zapisać ustawienia protokołu');
                },
            },
        );
    };

    return (
        <Card>
            <OptionRow $disabled={!isOwner}>
                <OptionTexts>
                    <OptionLabel>Czy pokazywać ceny usług na protokole przyjęcia?</OptionLabel>
                    <OptionHint>
                        {!isOwner ? (
                            'Zmienić to ustawienie może tylko właściciel studia.'
                        ) : enabled ? (
                            <>
                                Przy każdej usłudze jest jej cena brutto, np.{' '}
                                <Example>Powłoka ceramiczna (1900.00 PLN brutto)</Example>. Po wyłączeniu
                                protokół pokaże same nazwy usług i kwotę łączną.
                            </>
                        ) : (
                            'Protokół pokazuje same nazwy usług i jedną kwotę łączną. Po włączeniu przy każdej usłudze pojawi się jej cena w nawiasie.'
                        )}
                    </OptionHint>
                </OptionTexts>
                <Toggle
                    checked={enabled}
                    disabled={locked}
                    ariaLabel="Czy pokazywać ceny usług na protokole przyjęcia?"
                    onChange={handleChange}
                />
            </OptionRow>
        </Card>
    );
}
