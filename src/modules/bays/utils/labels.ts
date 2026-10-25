// src/modules/bays/utils/labels.ts

import type { BayKind } from '../types';

export const KIND_LABEL: Record<BayKind, string> = {
    LIFT: 'Podnośnik',
    BOOTH: 'Kabina',
    WASH: 'Myjnia',
    WORK_AREA: 'Strefa robocza',
};
