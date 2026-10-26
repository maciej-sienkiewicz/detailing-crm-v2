// src/modules/bays/utils/labels.ts

import type { BayCar, BayKind } from '../types';

export const KIND_LABEL: Record<BayKind, string> = {
    LIFT: 'Podnośnik',
    BOOTH: 'Kabina',
    WASH: 'Myjnia',
    WORK_AREA: 'Strefa robocza',
};

/**
 * Auto w zdaniu i w tytule okna: tablica, a bez niej nazwa pojazdu. Na chipsach i paskach
 * auto bez tablicy po prostu jej nie pokazuje - „bez tablicy” powtarzane na co drugim
 * aucie tylko zaśmiecało pasek oczekujących.
 */
export const carLabel = (car: Pick<BayCar, 'licensePlate' | 'vehicleName'> | null | undefined): string =>
    car?.licensePlate || car?.vehicleName || 'auto';
