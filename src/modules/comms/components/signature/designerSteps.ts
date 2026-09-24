// src/modules/comms/components/signature/designerSteps.ts
// Kolejność kroków kreatora stopki: najpierw wygląd, potem treść, na końcu dodatki.

export type SignatureStepId = 'template' | 'details' | 'style' | 'images' | 'social';

export const SIGNATURE_STEPS: { id: SignatureStepId; label: string }[] = [
    { id: 'template', label: 'Motyw' },
    { id: 'details', label: 'Dane' },
    { id: 'style', label: 'Styl' },
    { id: 'images', label: 'Zdjęcie i logo' },
    { id: 'social', label: 'Social' },
];
