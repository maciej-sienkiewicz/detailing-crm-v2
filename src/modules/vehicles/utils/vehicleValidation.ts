import { z } from 'zod';
import { t } from '@/common/i18n';

const currentYear = new Date().getFullYear();

export const createVehicleSchema = z.object({
    licensePlate: z
        .string()
        .min(1, t.vehicles.validation.licensePlateRequired)
        .regex(/^[A-Z0-9\s]{4,10}$/i, t.vehicles.validation.licensePlateFormat),

    brand: z
        .string()
        .min(2, t.vehicles.validation.brandMin)
        .max(50),

    model: z
        .string()
        .min(2, t.vehicles.validation.modelMin)
        .max(50),

    yearOfProduction: z
        .number()
        .min(1900)
        .max(currentYear, t.vehicles.validation.yearRange.replace('{currentYear}', currentYear.toString())),

    color: z
        .string()
        .min(1, t.vehicles.validation.colorRequired),

    paintType: z
        .string()
        .optional(),

    engineType: z
        .enum(['GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC'])
        .refine((val) => ['GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC'].includes(val), {
            message: t.vehicles.validation.engineTypeRequired,
        }),

    currentMileage: z
        .number()
        .positive(t.vehicles.validation.mileagePositive)
        .optional()
        .or(z.literal(0)),

    technicalNotes: z
        .string()
        .max(2000, t.vehicles.validation.notesMax)
        .optional(),

    ownerIds: z
        .array(z.string())
        .min(1, t.vehicles.validation.ownerRequired),
});

export type CreateVehicleFormData = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = z.object({
    licensePlate: z
        .string()
        .min(1, t.vehicles.validation.licensePlateRequired)
        .regex(/^[A-Z0-9\s]{4,10}$/i, t.vehicles.validation.licensePlateFormat)
        .optional(),

    brand: z
        .string()
        .min(2, t.vehicles.validation.brandMin)
        .max(50)
        .optional(),

    model: z
        .string()
        .min(2, t.vehicles.validation.modelMin)
        .max(50)
        .optional(),

    yearOfProduction: z
        .number()
        .min(1900)
        .max(currentYear + 1, t.vehicles.validation.yearRange.replace('{currentYear}', (currentYear + 1).toString()))
        .optional(),

    color: z
        .string()
        .min(1, t.vehicles.validation.colorRequired)
        .optional(),

    paintType: z
        .string()
        .optional(),

    engineType: z
        .enum(['GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC'])
        .refine((val) => !val || ['GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC'].includes(val), {
            message: t.vehicles.validation.engineTypeRequired,
        })
        .optional(),

    currentMileage: z
        .number()
        .positive(t.vehicles.validation.mileagePositive)
        .optional()
        .or(z.literal(0)),

    technicalNotes: z
        .string()
        .max(2000, t.vehicles.validation.notesMax)
        .optional(),

    status: z
        .enum(['active', 'sold', 'archived'])
        .optional(),
});

export type UpdateVehicleFormData = z.infer<typeof updateVehicleSchema>;
