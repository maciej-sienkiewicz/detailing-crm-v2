// src/modules/settings/components/ServicesAndCareSection.tsx
//
// Ustawienia → Cennik usług.
//
// Cennik i słownik instrukcji pielęgnacyjnych stoją w jednej sekcji, bo instrukcje
// przypisuje się do pozycji cennika - rozdzielone na dwie pozycje nawigacji zmuszałyby
// do skakania tam i z powrotem przy każdej usłudze.
//
// Jeden przełącznik „Usługi N | Pakiety N | Instrukcje pielęgnacji N" zamiast paska
// zakładek i drugiego filtra „Wszystkie / Usługi / Pakiety" pod nim. Instrukcje mają
// własny adres (`subView` z ramy ustawień), podział usługi/pakiety żyje lokalnie.
import { useState } from 'react';
import styled from 'styled-components';
import { Segmented } from '@/common/components/ui';
import { useServices } from '@/modules/services/hooks/useServices';
import { useCareInstructions } from '../hooks/useCareInstructions';
import { ServicesSection, type CatalogKind } from './ServicesSection';
import { CareInstructionsSection } from './CareInstructionsSection';

export type ServicesSubView = 'pricing' | 'care';

type SwitchValue = CatalogKind | 'care';

interface Props {
    subView: ServicesSubView;
    onSubViewChange: (next: ServicesSubView) => void;
}

export function ServicesAndCareSection({ subView, onSubViewChange }: Props) {
    const [kind, setKind] = useState<CatalogKind>('services');

    // Liczniki przy przełączniku: same aktywne, bez wyszukiwania. Zapytania po jednej
    // pozycji - liczba przychodzi w `pagination`, a lista pobiera się osobno.
    const servicesCount = useServices({ search: '', page: 1, limit: 1, showInactive: false, isPackage: false });
    const packagesCount = useServices({ search: '', page: 1, limit: 1, showInactive: false, isPackage: true });
    const { instructions } = useCareInstructions();

    const value: SwitchValue = subView === 'care' ? 'care' : kind;

    const change = (next: SwitchValue) => {
        if (next === 'care') {
            onSubViewChange('care');
            return;
        }
        setKind(next);
        if (subView === 'care') onSubViewChange('pricing');
    };

    const switcher = (
        <Segmented<SwitchValue>
            label="Zakres cennika"
            value={value}
            onChange={change}
            options={[
                { value: 'services', label: 'Usługi', count: servicesCount.pagination?.totalItems ?? null },
                { value: 'packages', label: 'Pakiety', count: packagesCount.pagination?.totalItems ?? null },
                {
                    value: 'care',
                    label: <><Wide>Instrukcje pielęgnacji</Wide><Narrow>Instrukcje</Narrow></>,
                    count: instructions.length,
                },
            ]}
        />
    );

    return subView === 'care'
        ? <CareInstructionsSection switcher={switcher} />
        : <ServicesSection kind={kind} onKindChange={change} switcher={switcher} />;
}

// <em>, nie <span>: Segmented barwi każdy <span> w opcji jak licznik.
const Wide = styled.em`
    font-style: normal;
    @media (max-width: 767px) { display: none; }
`;

const Narrow = styled.em`
    display: none;
    font-style: normal;
    @media (max-width: 767px) { display: inline; }
`;
