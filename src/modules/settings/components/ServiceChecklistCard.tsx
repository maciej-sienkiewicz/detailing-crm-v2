// src/modules/settings/components/ServiceChecklistCard.tsx
//
// Ustawienia → Tablety, telefon, kontakty → „Odhaczanie wykonanych usług na widoku wizyty".
//
// Część studiów wiesza tablet na hali i chce odhaczać przy wizycie, co już zrobiono.
// Reszta tego nie potrzebuje, więc to ustawienie, domyślnie wyłączone. Budowa jak karty
// w Dokumentach i podpisach: pytanie jest nagłówkiem, zapis od razu po kliknięciu.

import styled from 'styled-components';
import { Toggle } from '@/common/components/Toggle';
import { useToast } from '@/common/components/Toast';
import { usePermissions } from '@/core/permissions';
import { Panel } from '@/common/components/ui';
import { useUpdateVisitViewConfig, useVisitViewConfig } from '../hooks/useCompany';
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

export function ServiceChecklistCard() {
    const { isOwner } = usePermissions();
    const { config, isLoading } = useVisitViewConfig();
    const updateMutation = useUpdateVisitViewConfig();
    const { showError } = useToast();

    // Do czasu odpowiedzi zakładamy stan domyślny backendu (wyłączone).
    const enabled = config?.serviceChecklistEnabled ?? false;
    const locked = isLoading || updateMutation.isPending || !isOwner;

    const handleChange = (value: boolean) => {
        updateMutation.mutate(
            { serviceChecklistEnabled: value },
            {
                onError: error => {
                    if (!shownByInterceptor(error)) showError('Nie udało się zapisać ustawienia widoku wizyty');
                },
            },
        );
    };

    return (
        <Card>
            <OptionRow $disabled={!isOwner}>
                <OptionTexts>
                    <OptionLabel>Odhaczanie wykonanych usług na widoku wizyty</OptionLabel>
                    <OptionHint>
                        {!isOwner
                            ? 'Zmienić to ustawienie może tylko właściciel studia.'
                            : enabled
                                ? 'Przy każdej usłudze wizyty w toku jest pole „zrobione”. Kto i kiedy je odhaczył, widać w historii wizyty. To tylko znak dla zespołu: niczego nie blokuje i nic go nie sprawdza.'
                                : 'Przydaje się, gdy na hali wisi tablet z otwartą wizytą. Po włączeniu przy usługach pojawi się pole „zrobione”, a odhaczenia trafią do historii wizyty.'}
                    </OptionHint>
                </OptionTexts>
                <Toggle
                    checked={enabled}
                    disabled={locked}
                    ariaLabel="Odhaczanie wykonanych usług na widoku wizyty"
                    onChange={handleChange}
                />
            </OptionRow>
        </Card>
    );
}
