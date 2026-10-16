// src/modules/vehicles/components/VehicleKindSwitch.tsx
//
// „Samochód / Motocykl" w każdym formularzu, w którym powstaje albo zmienia się pojazd.
// Stoi nad marką, bo to on decyduje, z którego katalogu podpowiadamy marki i modele.
// Zbudowany na Segmented: wybrana opcja leży na białym klawiszu, bez wypełnienia -
// to stan pola, a nie krok następny (CLAUDE.md §2).

import { Car, Motorbike } from 'lucide-react';
import { Segmented } from '@/common/components/ui';
import { VEHICLE_KIND_LABEL, type VehicleKind } from '../vehicleKind';

const ICON_SIZE = 15;

const OPTIONS = [
    { value: 'CAR' as const, label: <><Car size={ICON_SIZE} aria-hidden="true" />{VEHICLE_KIND_LABEL.CAR}</> },
    { value: 'MOTORCYCLE' as const, label: <><Motorbike size={ICON_SIZE} aria-hidden="true" />{VEHICLE_KIND_LABEL.MOTORCYCLE}</> },
];

interface Props {
    value: VehicleKind;
    onChange: (kind: VehicleKind) => void;
    /** Na całą szerokość pola - w formularzach w kolumnie. */
    block?: boolean;
    size?: 'sm' | 'md';
    className?: string;
}

export const VehicleKindSwitch = ({ value, onChange, block = true, size = 'md', className }: Props) => (
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
