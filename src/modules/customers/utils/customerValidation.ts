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
        .min(2, t.customers.validation.firstNameMin)
        .max(50, t.customers.validation.firstNameMax),
    lastName: z
        .string()
        .min(2, t.customers.validation.lastNameMin)
        .max(50, t.customers.validation.lastNameMax),
    email: z
        .string()
        .email(t.customers.validation.emailInvalid),
    phone: z
        .string()
        .regex(
            /^(\+48)?[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{3}$/,
            t.customers.validation.phoneInvalid
        ),
    homeAddress: homeAddressSchema.nullable().optional(),
    company: companyDetailsSchema.nullable().optional(),
    notes: z.string().max(1000, t.customers.validation.notesMax),
});

export type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

export const customerSearchSchema = z.object({
    search: z.string().max(100),
});