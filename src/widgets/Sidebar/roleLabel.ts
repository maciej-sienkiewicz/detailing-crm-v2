// src/widgets/Sidebar/roleLabel.ts
//
// Etykieta rodzaju konta pod nazwiskiem w pasku bocznym - gdy osoba nie ma roli
// nadanej przez studio (wtedy pokazujemy tę rolę, patrz Sidebar).

const LABELS: Record<string, string> = {
    owner: 'Właściciel',
    admin: 'Administrator',
    employee: 'Pracownik',
    manager: 'Menedżer',
    // Backend wysyła pracownikowi „USER" - bez tego wpisu pod nazwiskiem stało
    // surowe „USER" zamiast czytelnej etykiety.
    user: 'Pracownik',
};

export const getRoleLabel = (role: string): string =>
    // Nieznany kod nie trafia na ekran wprost - lepiej ogólne „Pracownik" niż techniczny skrót.
    LABELS[role.toLowerCase()] ?? 'Pracownik';
