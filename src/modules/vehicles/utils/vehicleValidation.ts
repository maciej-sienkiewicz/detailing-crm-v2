import { z } from 'zod';
import { t } from '@/common/i18n';
import type { VehicleKind } from '../vehicleKind';

const currentYear = new Date().getFullYear();

const vehicleKindSchema = z.enum(['CAR', 'MOTORCYCLE']) satisfies z.ZodType<VehicleKind>;

export const createVehicleSchema = z.object({
    kind: vehicleKindSchema,

    licensePlate: z
        .string()
        .min(1, t.vehicles.validation.licensePlateRequired)
        .regex(/^[A-Z0-9\s]{4,10}$/i, t.vehicles.validation.licensePlateFormat),

    // Marka i model są wybierane z katalogu, więc wystarczy, że są wybrane. Dawne
    // „co najmniej 2 znaki" pochodziło z czasów wpisywania z ręki i odrzucałoby
    // prawdziwe pozycje katalogu: Mazda 3, Tesla Y, motocykl BMW R.
    brand: z
        .string()
        .min(1, 'Wybierz markę')
        .max(50),

    model: z
        .string()
        .min(1, 'Wybierz model')
        .max(50),

    yearOfProduction: z
        .number()
        .min(1900)
        .max(currentYear, t.vehicles.validation.yearRange.replace('{currentYear}', currentYear.toString())),

    color: z
        .string()
        .min(1, t.vehicles.validation.colorRequired),

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

// Typ parametru to zarazem typ pola przed walidacją (z.input) - formularz wie, co trzyma.
const nullToUndefinedStr = (val: string | null | undefined) => (val === null || val === undefined ? undefined : val);
const nullToUndefinedNum = (val: number | null | undefined) =>
    val === null || val === undefined || Number.isNaN(val) ? undefined : val;

export const updateVehicleSchema = z.object({
    // Okno edycji zawsze zna rodzaj (pojazd bez pola w danych to samochód), więc
    // zawsze go wysyła. Serwer czyta brak pola jako „bez zmian", a tu zmiana rodzaju
    // idzie w parze z nową marką i modelem z innego katalogu - nie może się zgubić.
    kind: vehicleKindSchema,

    licensePlate: z.preprocess(nullToUndefinedStr, z.string().optional()),

    // Puste pole bierze się tu z wyczyszczenia przy zmianie rodzaju albo marki -
    // komunikat mówi, co zrobić, a nie ile znaków brakuje.
    brand: z.preprocess(nullToUndefinedStr, z.string().min(1, 'Wybierz markę')),

    model: z.preprocess(nullToUndefinedStr, z.string().min(1, 'Wybierz model')),

    yearOfProduction: z.preprocess(nullToUndefinedNum, z.number().optional()),

    color: z.preprocess(nullToUndefinedStr, z.string().optional()),

    currentMileage: z.preprocess(nullToUndefinedNum, z.number().optional()),

    // Pusty napis zostaje pustym napisem (nie undefined): tak serwer odróżnia
    // „usuń VIN" od „bez zmian".
    vin: z
        .string()
        .max(17, 'VIN ma najwyżej 17 znaków')
        .regex(/^[A-Z0-9]*$/, 'VIN może zawierać tylko litery i cyfry')
        .optional(),

    status: z
        .enum(['active', 'sold', 'archived'])
        .optional(),
});

export type UpdateVehicleFormData = z.infer<typeof updateVehicleSchema>;
/** Wartości pól przed walidacją - z API przychodzi też null. */
export type UpdateVehicleFormInput = z.input<typeof updateVehicleSchema>;
