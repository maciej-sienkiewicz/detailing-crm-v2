/**
 * Kategorie profili firmowych przychodzą z Instagrama po angielsku („Automotive Service").
 * Najczęstsze w branży tłumaczymy; nieznaną pokazujemy tak, jak przyszła - lepiej
 * angielska nazwa niż żadna, bo to ona mówi, czemu konto w ogóle jest podpowiadane.
 */
const CATEGORY_PL: Record<string, string> = {
    'automotive service': 'Usługi motoryzacyjne',
    'car wash': 'Myjnia samochodowa',
    'automotive repair shop': 'Warsztat samochodowy',
    'automotive detailing': 'Detailing',
    'auto detailing service': 'Detailing',
    'automotive customization shop': 'Tuning i personalizacja aut',
    'automotive body shop': 'Blacharnia i lakiernia',
    'car dealership': 'Salon samochodowy',
    'automotive dealership': 'Salon samochodowy',
    'automotive parts store': 'Części samochodowe',
    'automotive store': 'Sklep motoryzacyjny',
    'automotive, aircraft & boat': 'Motoryzacja',
    'automotive window tinting service': 'Przyciemnianie szyb',
    'vehicle wrap service': 'Oklejanie aut',
    'motor vehicle company': 'Motoryzacja',
};

export const suggestionCategoryLabel = (category: string | null | undefined): string | null => {
    const trimmed = category?.trim();
    if (!trimmed) return null;
    return CATEGORY_PL[trimmed.toLowerCase()] ?? trimmed;
};
