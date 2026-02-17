import { z } from 'zod';
import { validatePolishNip, validatePolishRegon } from './polishValidators';
import { t } from '@/common/i18n';

const homeAddressSchema = z.object({
    street: z.string().min(1, t.customers.validation.streetRequired),
    city: z.string().min(1, t.customers.validation.cityRequired),
    postalCode: z
        .string()
        .regex(/^\d{2}-\d{3}$/, t.customers.validation.postalCodeInvalid),
    country: z.string().min(1, t.customers.validation.countryRequired),
});

const companyAddressSchema = z.object({
    street: z.string().min(1, t.customers.validation.streetRequired),
    city: z.string().min(1, t.customers.validation.cityRequired),
    postalCode: z
        .string()
        .regex(/^\d{2}-\d{3}$/, t.customers.validation.postalCodeInvalid),
    country: z.string().min(1, t.customers.validation.countryRequired),
});

const companyDetailsSchema = z.object({
    name: z.string().min(2, t.customers.validation.companyNameMin),
    nip: z
        .string()
        .transform(val => val.replace(/[\s-]/g, ''))
        .refine(validatePolishNip, t.customers.validation.nipInvalid),
    regon: z
        .string()
        .transform(val => val.replace(/[\s-]/g, ''))
        .refine(validatePolishRegon, t.customers.validation.regonInvalid),
    address: companyAddressSchema,
});

export const createCustomerSchema = z.object({
    firstName: z
        .string()
        .max(50, t.customers.validation.firstNameMax)
        .optional()
        .or(z.literal('')),
    lastName: z
        .string()
        .max(50, t.customers.validation.lastNameMax)
        .optional()
        .or(z.literal('')),
    email: z
        .string()
        .refine(
            (val) => !val || val === '' || z.string().email().safeParse(val).success,
            { message: t.customers.validation.emailInvalid }
        )
        .optional()
        .or(z.literal('')),
    phone: z
        .string()
        .refine(
            (val) => !val || val === '' || /^(\+48)?[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}$/.test(val),
            { message: t.customers.validation.phoneInvalid }
        )
        .optional()
        .or(z.literal('')),
    homeAddress: homeAddressSchema.nullable().optional(),
    company: companyDetailsSchema.nullable().optional(),
}).refine(
    (data) => {
        // Wymagane: Przynajmniej jedno z telefonu lub emaila
        const hasContact = (data.phone && data.phone.trim().length > 0) ||
                          (data.email && data.email.trim().length > 0);
        return hasContact;
    },
    {
        message: 'Wymagany jest co najmniej numer telefonu lub adres email klienta.',
        path: ['phone'],
    }
);

export type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

export const customerSearchSchema = z.object({
    search: z.string().max(100),
});