import type { AttendanceSheet } from '../../api/attendanceApi';

const MONTHS = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** `2026-09` → „Wrzesień 2026". */
export function periodLabel(period: string): string {
    const [year, month] = period.split('-').map(Number);
    const name = MONTHS[month - 1];
    return name && year ? `${name} ${year}` : period;
}

/** Dni, które obejmuje rozliczenie: `2026-02` → „01.02–28.02.2026" (luty przestępny: 29). */
export function periodDays(period: string): string {
    const [year, month] = period.split('-').map(Number);
    if (!year || !month) return period;
    const lastDay = new Date(year, month, 0).getDate();
    return `01.${pad(month)}–${lastDay}.${pad(month)}.${year}`;
}

export function employeesLabel(count: number): string {
    return count === 1 ? '1 pracownik' : `${count} pracowników`;
}

/** Brak statusu (starszy backend) czyta się jak „do zatwierdzenia" - lista nikomu nie zniknie. */
export function isApproved(sheet: Pick<AttendanceSheet, 'status'>): boolean {
    return sheet.status === 'APPROVED';
}

/** Ile rozliczeń czeka na zatwierdzenie - licznik na zakładce. */
export function pendingCount(sheets: ReadonlyArray<Pick<AttendanceSheet, 'status'>>): number {
    return sheets.filter(sheet => !isApproved(sheet)).length;
}

/** Nazwa pliku przy pobraniu: `lista-obecnosci-2026-09.pdf`, podpisana z dopiskiem. */
export function sheetFileName(sheet: Pick<AttendanceSheet, 'period' | 'signed'>): string {
    return `lista-obecnosci-${sheet.period}${sheet.signed ? '-podpisana' : ''}.pdf`;
}
