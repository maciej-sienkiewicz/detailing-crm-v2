// src/modules/services/utils/validators.ts
import { z } from 'zod';
import { t } from '@/common/i18n';

export const serviceSchema = z.object({
    name: z
        .string()
        .min(1, t.services.validation.nameRequired)
        .min(3, t.services.validation.nameMin)
        .max(100, t.services.validation.nameMax),
    basePriceNet: z.number(),
    vatRate: z
        .number()
        .refine((val) => [0, 5, 8, 23, -1].includes(val), {
            message: t.services.validation.vatRequired,
        }),
    requireManualPrice: z.boolean().default(false),
}).refine((data) => {
    // Jeśli requireManualPrice jest false, cena musi być większa od 0
    if (!data.requireManualPrice && data.basePriceNet < 1) {
        return false;
    }
    return true;
}, {
    message: t.services.validation.pricePositive,
    path: ['basePriceNet'],
});

export type ServiceFormData = z.infer<typeof serviceSchema>;