// src/modules/services/utils/validators.ts
import { z } from 'zod';
import { t } from '@/common/i18n';

export const serviceSchema = z.object({
    name: z
        .string()
        .min(1, t.services.validation.nameRequired)
        .min(3, t.services.validation.nameMin)
        .max(100, t.services.validation.nameMax),
    basePriceNet: z
        .number()
        .min(1, t.services.validation.pricePositive),
    vatRate: z
        .number()
        .refine((val) => [0, 5, 8, 23, -1].includes(val), {
            message: t.services.validation.vatRequired,
        }),
    requireManualPrice: z.boolean().default(false),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;