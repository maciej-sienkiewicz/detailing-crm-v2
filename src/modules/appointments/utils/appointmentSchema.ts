import { z } from 'zod';
import { isValidPolishPhone, isValidEmail } from '@/common/utils';

const customerNewDataSchema = z.object({
    firstName: z.string().min(2, 'Imię musi mieć minimum 2 znaki'),
    lastName: z.string().min(2, 'Nazwisko musi mieć minimum 2 znaki'),
    phone: z.string().refine(isValidPolishPhone, 'Nieprawidłowy numer telefonu'),
    email: z.string().refine(isValidEmail, 'Nieprawidłowy adres email'),
    company: z.object({
        name: z.string().min(2, 'Nazwa firmy musi mieć minimum 2 znaki'),
        nip: z.string().regex(/^\d{10}$/, 'NIP musi składać się z 10 cyfr'),
        regon: z.string().regex(/^\d{9}(\d{5})?$/, 'REGON musi składać się z 9 lub 14 cyfr').optional(),
        address: z.string().min(5, 'Adres musi mieć minimum 5 znaków'),
    }).optional(),
});

const vehicleNewDataSchema = z.object({
    brand: z.string().min(2, 'Marka musi mieć minimum 2 znaki'),
    model: z.string().min(1, 'Model jest wymagany'),
});

export const appointmentSchema = z.object({
    customer: z.discriminatedUnion('mode', [
        z.object({
            mode: z.literal('EXISTING'),
            id: z.string().min(1, 'Wybierz klienta'),
        }),
        z.object({
            mode: z.literal('NEW'),
            newData: customerNewDataSchema,
        }),
    ]),
    vehicle: z.discriminatedUnion('mode', [
        z.object({
            mode: z.literal('EXISTING'),
            id: z.string().min(1, 'Wybierz pojazd'),
        }),
        z.object({
            mode: z.literal('NEW'),
            newData: vehicleNewDataSchema,
        }),
        z.object({
            mode: z.literal('NONE'),
        }),
    ]),
    service: z.object({
        id: z.string().min(1, 'Wybierz usługę'),
        basePriceNet: z.number().min(0, 'Cena musi być większa od 0'),
        vatRate: z.number().min(0).max(100, 'VAT musi być między 0 a 100'),
        adjustment: z.object({
            type: z.enum(['PERCENT', 'FIXED_NET', 'FIXED_GROSS', 'SET_NET', 'SET_GROSS']),
            value: z.number(),
        }),
        note: z.string().max(500, 'Notatka może mieć maksymalnie 500 znaków').optional(),
    }),
    schedule: z.object({
        isAllDay: z.boolean(),
        startDateTime: z.string().min(1, 'Data rozpoczęcia jest wymagana'),
        endDateTime: z.string().min(1, 'Data zakończenia jest wymagana'),
    }).refine(
        data => new Date(data.startDateTime) < new Date(data.endDateTime),
        'Data zakończenia musi być późniejsza niż data rozpoczęcia'
    ),
});