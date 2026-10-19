// src/core/companyLegal.ts
//
// Dane spółki wymagane na stronie internetowej (art. 206 § 1 KSH): firma, siedziba
// i adres, sąd rejestrowy, KRS, NIP i kapitał zakładowy. Źródło: odpis z KRS.
//
// Te same dane stoją też STATYCZNIE w index.html (stopka ekranu startowego). Tam są
// dla robotów: weryfikacja firmy w Meta szuka oficjalnej nazwy w HTML-u strony i nie
// uruchamia JavaScriptu, więc stopka rysowana przez Reacta była dla niej niewidoczna
// („w witrynie musi być wskazana oficjalna nazwa firmy"). companyLegal.test.ts pilnuje,
// żeby obie kopie się zgadzały.
export const COMPANY_NAME = 'M&M SOLUTIONS SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ';

export const COMPANY_ADDRESS = 'ul. Poznańska 119, 60-185 Skórzewo';
export const COMPANY_COURT = 'Sąd Rejonowy Poznań – Nowe Miasto i Wilda w Poznaniu, VIII Wydział Gospodarczy KRS';
/** Trzy numery jako trzy osobne elementy, nie ciąg sklejony kropką (CLAUDE.md §4). */
export const COMPANY_IDS = ['KRS 0001267442', 'NIP 7773476300', 'REGON 545750800'] as const;
export const COMPANY_CAPITAL = 'Kapitał zakładowy 40 000,00 zł';
