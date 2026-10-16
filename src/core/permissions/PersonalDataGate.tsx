import type { ComponentType, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { EmptyState } from '@/common/components/EmptyState';
import { PageContainer } from '@/common/components/PageContainer';
import { Button } from '@/common/components/ui';
import { usePersonalDataActions, type PersonalDataAction } from './personalDataActions';

const REFUSAL: Record<PersonalDataAction, { title: string; description: string }> = {
    canCreateAppointment: {
        title: 'Nie możesz dodać rezerwacji',
        description: 'Nowa rezerwacja wymaga dostępu do danych osobowych klienta. Poproś właściciela studia o to uprawnienie.',
    },
    canEditAppointment: {
        title: 'Nie możesz edytować tej rezerwacji',
        description: 'Edycja rezerwacji wymaga dostępu do danych osobowych klienta. Poproś właściciela studia o to uprawnienie.',
    },
    canCreateVisit: {
        title: 'Nie możesz przyjąć pojazdu',
        description: 'Nowa wizyta wymaga dostępu do danych osobowych klienta. Poproś właściciela studia o to uprawnienie.',
    },
    canEditVisit: {
        title: 'Nie możesz edytować tej wizyty',
        description: 'Edycja wizyty wymaga dostępu do danych osobowych klienta. Poproś właściciela studia o to uprawnienie.',
    },
};

const Container = styled.div`
    min-height: 100vh;
    background-color: ${props => props.theme.colors.background};
`;

const Actions = styled.div`
    display: flex;
    justify-content: center;
    margin-top: ${props => props.theme.spacing.lg};
`;

export function PersonalDataRefusal({ action }: { action: PersonalDataAction }) {
    const navigate = useNavigate();
    const { title, description } = REFUSAL[action];
    return (
        <Container>
            <PageContainer>
                <EmptyState icon="🔒" title={title} description={description}>
                    <Actions>
                        <Button variant="outline" onClick={() => navigate('/calendar')}>Wróć do kalendarza</Button>
                    </Actions>
                </EmptyState>
            </PageContainer>
        </Container>
    );
}

/**
 * Trasa, która wymaga danych osobowych (patrz personalDataActions). Bez nich widok
 * w ogóle się nie montuje - nie rusza żadnego zapytania - a wejście wprost z adresu
 * dostaje czytelną odmowę zamiast formularza z gwiazdkami. Odmowa, a nie ciche
 * przekierowanie jak w RequirePermission: użytkownik MA prawo do wizyt, więc
 * zniknięcie strony bez słowa wyglądałoby na błąd.
 */
export function PersonalDataGate({ action, children }: { action: PersonalDataAction; children: ReactNode }) {
    const actions = usePersonalDataActions();
    return actions[action] ? <>{children}</> : <PersonalDataRefusal action={action} />;
}

/** Wersja dla `lazyPage` w routerze: owija ładowany widok bramką. */
export function withPersonalDataGate(View: ComponentType, action: PersonalDataAction): ComponentType {
    const Gated = () => (
        <PersonalDataGate action={action}>
            <View />
        </PersonalDataGate>
    );
    Gated.displayName = `PersonalDataGate(${View.displayName ?? View.name ?? 'View'})`;
    return Gated;
}
