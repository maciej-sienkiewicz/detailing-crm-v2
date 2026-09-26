// src/modules/settings/components/companyForm.ts
//
// Logika formularza „Dane firmy" bez widoku - osobno, żeby dało się ją sprawdzić
// testem bez renderowania sekcji. Zmiany liczymy PORÓWNANIEM z wczytanymi danymi:
// wcześniej flaga `dirty` ustawiała się przy każdym wpisie i pasek „Zapisz" nie
// znikał nawet po ręcznym cofnięciu zmiany.

import type { CompanySettings } from '../types';

export const FIELDS = [
    'name', 'taxId', 'regon', 'street', 'postalCode', 'city', 'phone', 'email', 'bankAccount', 'website',
] as const;

export type FieldKey = typeof FIELDS[number];
export type CompanyForm = Record<FieldKey, string>;
export type FormErrors = Partial<Record<FieldKey, string>>;

/** Nazwa pola w zdaniu paska: „REGON wymaga poprawy". */
export const FIELD_NAMES: Record<FieldKey, string> = {
    name: 'Nazwa firmy',
    taxId: 'NIP',
    regon: 'REGON',
    street: 'Ulica i numer',
    postalCode: 'Kod pocztowy',
    city: 'Miasto',
    phone: 'Telefon',
    email: 'E-mail',
    bankAccount: 'Konto bankowe',
    website: 'Strona www',
};

export const toCompanyForm = (company: CompanySettings): CompanyForm => ({
    name: company.name ?? '',
    taxId: company.taxId ?? '',
    regon: company.regon ?? '',
    street: company.street ?? '',
    postalCode: company.postalCode ?? '',
    city: company.city ?? '',
    phone: company.phone ?? '',
    email: company.email ?? '',
    bankAccount: company.bankAccount ?? '',
    website: company.website ?? '',
});

export function validateCompanyForm(form: CompanyForm): FormErrors {
    const errors: FormErrors = {};
    if (!form.name.trim()) errors.name = 'Wpisz nazwę firmy. Drukujemy ją na fakturach i protokołach.';
    if (!/^\d{10}$/.test(form.taxId.replace(/[\s-]/g, ''))) errors.taxId = 'Wpisz NIP: 10 cyfr, z kreskami albo bez.';
    if (!/^\d{9}(\d{5})?$/.test(form.regon.replace(/\s/g, ''))) errors.regon = 'Wpisz REGON: 9 albo 14 cyfr. Jest potrzebny na fakturze.';
    if (!/^\d{2}-\d{3}$/.test(form.postalCode.trim())) errors.postalCode = 'Wpisz kod w formacie 00-000.';
    if (!form.phone.trim()) errors.phone = 'Wpisz telefon, pod który klienci mogą dzwonić.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Wpisz adres e-mail, np. biuro@studio.pl.';
    return errors;
}

/** Ile pól różni się od wczytanych - cofnięta zmiana przestaje się liczyć. */
export function countChangedFields(form: CompanyForm, saved: CompanyForm): number {
    return FIELDS.filter(key => form[key] !== saved[key]).length;
}
