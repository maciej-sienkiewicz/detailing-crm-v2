// src/common/utils/autoFocus.ts

/**
 * Czy pole w oknie modalnym może samo złapać focus po otwarciu.
 *
 * Na komputerze to wygoda: okno otwiera się z kursorem w polu i można od razu
 * pisać. Na telefonie ten sam odruch wysuwa klawiaturę zanim użytkownik zdąży
 * zobaczyć okno - połowa treści znika, zanim się pojawiła. Tam focus zostawiamy
 * użytkownikowi: klika w pole, w które faktycznie chce wpisać wartość.
 *
 * Rozróżniamy po rodzaju wskaźnika, nie po szerokości ekranu: liczy się to, czy
 * urządzenie ma klawiaturę sprzętową, a nie ile ma pikseli.
 */
export const shouldAutoFocusInput = (): boolean => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return !window.matchMedia('(pointer: coarse)').matches;
};
