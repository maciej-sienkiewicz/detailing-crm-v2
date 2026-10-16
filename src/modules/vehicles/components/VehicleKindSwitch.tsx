// src/modules/vehicles/components/VehicleKindSwitch.tsx
//
// „Samochód / Motocykl" w każdym formularzu, w którym powstaje albo zmienia się pojazd.
// Stoi nad marką, bo to on decyduje, z którego katalogu podpowiadamy marki i modele.
// Zbudowany na Segmented: wybrana opcja leży na białym klawiszu, bez wypełnienia -
// to stan pola, a nie krok następny (CLAUDE.md §2).

import { Car, Motorbike } from 'lucide-react';
import styled from 'styled-components';
import { Segmented, touch } from '@/common/components/ui';
import { VEHICLE_KIND_LABEL, type VehicleKind } from '../vehicleKind';

const ICON_SIZE = 15;

const OPTIONS = [
    { value: 'CAR' as const, label: <><Car size={ICON_SIZE} aria-hidden="true" />{VEHICLE_KIND_LABEL.CAR}</> },
    { value: 'MOTORCYCLE' as const, label: <><Motorbike size={ICON_SIZE} aria-hidden="true" />{VEHICLE_KIND_LABEL.MOTORCYCLE}</> },
];

/*
 * Wariant przy etykiecie pola w gęstych formularzach (szybka rezerwacja z kalendarza):
 * większość pojazdów to auta, więc przełącznik ma być pod ręką, ale nie konkurować
 * z polami - same ikony, nazwa w dymku i dla czytnika.
 */
const ICON_OPTIONS = [
    { value: 'CAR' as const, label: <Car size={14} aria-hidden="true" />, ariaLabel: VEHICLE_KIND_LABEL.CAR },
    { value: 'MOTORCYCLE' as const, label: <Motorbike size={14} aria-hidden="true" />, ariaLabel: VEHICLE_KIND_LABEL.MOTORCYCLE },
];

const IconSegmented = styled(Segmented<VehicleKind>)`
    padding: 2px;
    border-radius: 8px;

    && > button {
        height: 22px;
        padding: 0 7px;
        border-radius: 6px;
    }

    /* Pod palcem mały klawisz chybia - wysokość jak reszta pól dotykowych. */
    ${touch} {
        && > button { height: 34px; padding: 0 12px; }
    }
`;

interface Props {
    value: VehicleKind;
    onChange: (kind: VehicleKind) => void;
    /** Na całą szerokość pola - w formularzach w kolumnie. */
    block?: boolean;
    size?: 'sm' | 'md';
    /** Same ikony, do postawienia obok etykiety pola. */
    iconOnly?: boolean;
    className?: string;
}

export const VehicleKindSwitch = ({ value, onChange, block = true, size = 'md', iconOnly = false, className }: Props) =>
    iconOnly ? (
        <IconSegmented
            label="Rodzaj pojazdu"
            options={ICON_OPTIONS}
            value={value}
            onChange={onChange}
            size="sm"
            className={className}
        />
    ) : (
        <Segmented<VehicleKind>
            label="Rodzaj pojazdu"
            options={OPTIONS}
            value={value}
            onChange={onChange}
            block={block}
            size={size}
            className={className}
        />
    );
