import { z } from 'zod';
import { t } from '@/common/i18n';
import { VEHICLE_KINDS, hasBrandCatalog, type VehicleKind } from '../vehicleKind';

const currentYear = new Date().getFullYear();

const vehicleKindSchema = z.enum(VEHICLE_KINDS) satisfies z.ZodType<VehicleKind>;

/*
 * Numer pojazdu „Inny" nie jest tablicą samochodową: samolot ma znaki „SP-KAT", skuter
 * wodny często nie ma żadnego. Dlatego jest opcjonalny i dopuszcza myślnik; 20 znaków
 * to szerokość kolumny license_plate w bazie.
 */
const OTHER_PLATE = /^[A-Z0-9][A-Z0-9\s-]{0,19}$/i;

/*
 * Marka i model: z katalogu się je wybiera, dla „Inny" wpisuje - komunikat mówi, co
 * zrobić w polu, które jest na ekranie. Pusty napis bierze się z wyczyszczenia przy
 * zmianie rodzaju albo marki; same spacje w polu do wpisania to też brak marki.
 */
const requireBrandAndModel = (
    data: { kind: VehicleKind; brand?: string; model?: string },
    ctx: z.RefinementCtx,
) => {
    const verb = hasBrandCatalog(data.kind) ? 'Wybierz' : 'Wpisz';
    if (data.brand !== undefined && !data.brand.trim()) {
        ctx.addIssue({ code: 'custom', path: ['brand'], message: `${verb} markę` });
    }
    if (data.model !== undefined && !data.model.trim()) {
        ctx.addIssue({ code: 'custom', path: ['model'], message: `${verb} model` });
    }
};

export const createVehicleSchema = z.object({
    kind: vehicleKindSchema,

    // Reguła zależy od rodzaju - pilnuje jej superRefine pod obiektem.
    licensePlate: z.string(),

    // Wystarczy, że marka i model są (requireBrandAndModel). Dawne „co najmniej 2 znaki"
    // odrzucałoby prawdziwe pozycje katalogu: Mazda 3, Tesla Y, motocykl BMW R.
    brand: z.string().max(50),

    model: z.string().max(50),

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
}).superRefine((data, ctx) => {
    requireBrandAndModel(data, ctx);

    const plate = data.licensePlate.trim();
    if (data.kind === 'OTHER') {
        if (plate && !OTHER_PLATE.test(plate)) {
            ctx.addIssue({ code: 'custom', path: ['licensePlate'], message: 'Numer rejestracyjny: litery, cyfry i myślnik, do 20 znaków' });
        }
        return;
    }
    if (!plate) {
        ctx.addIssue({ code: 'custom', path: ['licensePlate'], message: t.vehicles.validation.licensePlateRequired });
    } else if (!/^[A-Z0-9\s]{4,10}$/i.test(data.licensePlate)) {
        ctx.addIssue({ code: 'custom', path: ['licensePlate'], message: t.vehicles.validation.licensePlateFormat });
    }
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

    // Pustej marki i modelu pilnuje requireBrandAndModel - komunikat zależy od rodzaju.
    brand: z.preprocess(nullToUndefinedStr, z.string().max(50)),

    model: z.preprocess(nullToUndefinedStr, z.string().max(50)),

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
}).superRefine(requireBrandAndModel);

export type UpdateVehicleFormData = z.infer<typeof updateVehicleSchema>;
/** Wartości pól przed walidacją - z API przychodzi też null. */
export type UpdateVehicleFormInput = z.input<typeof updateVehicleSchema>;
