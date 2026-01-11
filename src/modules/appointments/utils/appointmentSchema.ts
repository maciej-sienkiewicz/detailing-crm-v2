import { z } from 'zod';
import { isValidPolishPhone, isValidEmail, validatePolishNip, validatePolishRegon } from '@/common/utils';
import { t } from '@/common/i18n';

const customerNewDataSchema = z.object({
    firstName: z.string().min(2, t.appointments.validation.firstNameMinLength),
    lastName: z.string().min(2, t.appointments.validation.lastNameMinLength),
    phone: z.string().refine(isValidPolishPhone, t.appointments.validation.phoneInvalid),
    email: z.string().refine(isValidEmail, t.appointments.validation.emailInvalid),
    company: z.object({
        name: z.string().min(2, t.customers.validation.companyNameMin),
        nip: z.string().refine(validatePolishNip, t.customers.validation.nipInvalid),
        regon: z.string().refine(validatePolishRegon, t.customers.validation.regonInvalid).optional(),
        address: z.string().min(5, t.customers.validation.streetRequired),
    }).optional(),
});

const vehicleNewDataSchema = z.object({
    brand: z.string().min(2, t.appointments.validation.brandMinLength),
    model: z.string().min(1, t.appointments.validation.modelRequired),
});

export const appointmentSchema = z.object({
    customer: z.discriminatedUnion('mode', [
        z.object({
            mode: z.literal('EXISTING'),
            id: z.string().min(1, t.appointments.validation.customerRequired),
        }),
        z.object({
            mode: z.literal('NEW'),
            newData: customerNewDataSchema,
        }),
    ]),
    vehicle: z.discriminatedUnion('mode', [
        z.object({
            mode: z.literal('EXISTING'),
            id: z.string().min(1, t.appointments.validation.vehicleRequired),
        }),
        z.object({
            mode: z.literal('NEW'),
            newData: vehicleNewDataSchema,
        }),
        z.object({
            mode: z.literal('NONE'),
        }),
    ]),
    services: z.array(z.object({
        id: z.string(),
        serviceId: z.string().min(1, t.appointments.validation.serviceRequired),
        serviceName: z.string(),
        basePriceNet: z.number().min(0, t.appointments.validation.basePricePositive),
        vatRate: z.number().min(0).max(100, t.appointments.validation.vatRange),
        adjustment: z.object({
            type: z.enum(['PERCENT', 'FIXED_NET', 'FIXED_GROSS', 'SET_NET', 'SET_GROSS']),
            value: z.number(),
        }),
        note: z.string().max(500, t.appointments.validation.noteMaxLength).optional(),
    })),
    schedule: z.object({
        isAllDay: z.boolean(),
        startDateTime: z.string().min(1, t.appointments.validation.startDateRequired),
        endDateTime: z.string().min(1, t.appointments.validation.endDateRequired),
    }).refine(
        data => new Date(data.startDateTime) < new Date(data.endDateTime),
        t.appointments.validation.endAfterStart
    ),
    appointmentTitle: z.string().optional(),
    appointmentColorId: z.string().min(1, t.appointments.validation.colorRequired),
});