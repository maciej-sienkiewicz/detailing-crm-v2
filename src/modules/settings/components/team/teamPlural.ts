// src/modules/settings/components/team/teamPlural.ts
//
// Liczebniki w zakładce „Pracownicy i role". Wcześniej każdy plik miał własne
// `n === 1 ? … : …`, więc na ekranie stało „2 uprawnień", „przypisana do 1 osobę"
// i „3 osób" obok siebie. Polszczyzna ma trzy formy, nie dwie.

/** 1 → one, 2–4 (poza 12–14) → few, reszta → many. */
export function plural(n: number, one: string, few: string, many: string): string {
    if (n === 1) return one;
    const last = n % 10;
    const lastTwo = n % 100;
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
    return many;
}

/** „1 uprawnienie", „3 uprawnienia", „12 uprawnień". */
export const permissionsLabel = (n: number) => `${n} ${plural(n, 'uprawnienie', 'uprawnienia', 'uprawnień')}`;

/** Biernik: „przenieś 1 osobę / 3 osoby / 5 osób". */
export const peopleAccusative = (n: number) => `${n} ${plural(n, 'osobę', 'osoby', 'osób')}`;

/** Dopełniacz po „do": „przypisana do 1 osoby / 3 osób". */
export const peopleGenitive = (n: number) => `${n} ${n === 1 ? 'osoby' : 'osób'}`;

/**
 * „Używa 1 pracownik / 3 pracowników". Przy rzeczowniku męskoosobowym liczba 2–4
 * też bierze dopełniacz („3 pracowników") - tak samo jak `employeesLabel` w Rozliczeniach.
 */
export const employeesCount = (n: number) => `${n} ${n === 1 ? 'pracownik' : 'pracowników'}`;

/** „2 listy do zatwierdzenia", „5 list do zatwierdzenia". */
export const sheetsToApprove = (n: number) => `${n} ${plural(n, 'lista', 'listy', 'list')} do zatwierdzenia`;
