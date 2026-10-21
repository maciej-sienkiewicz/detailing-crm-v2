// src/widgets/Sidebar/menuIcons.tsx
//
// Ikony panelu bocznego w języku logo DetailBoost: pełna bryła, ostre narożniki,
// łuk tylko w prawym dolnym rogu (brzuszek „D”) i podwójne cięcie pod 45° przez ten
// łuk - to samo, które tnie „D” w logo. Bryły bez łuku (dzwonek, warstwy, wykres)
// zostają bez cięcia: cięcie należy do łuku, nie jest ozdobnikiem doklejanym wszędzie.
//
// Siatka 24×24 jak w lucide-react i kolor z currentColor, więc ikony wymieniają się
// z lucide bez zmian w stylach menu. Wycięcia robi maska; id maski jest z useId,
// bo ta sama ikona bywa na stronie dwa razy (menu na telefonie i na komputerze).

import { useId, type SVGProps } from 'react';

/** Krok maski: wycięcie (domyślnie), przywrócenie bryły (keep) albo wycięcie kreską (line = grubość). */
interface MaskStep {
    d: string;
    keep?: boolean;
    line?: number;
}

interface Glyph {
    /** Bryła wypełniona kolorem. */
    fill: string[];
    /** Kreski w kolorze ikony (Aktywność, brzeg tacy w Zapytaniach). */
    lines?: string[];
    mask?: MaskStep[];
    /** Elementy nad maską - np. koła auta w wyciętych nadkolach. */
    top?: string[];
    /** Przesunięcie w pionie, gdy bryła jest niższa niż siatka (auto). */
    dy?: number;
}

/** Grubość cięcia z logo. */
const CUT = 1.3;

export type MenuIconProps = SVGProps<SVGSVGElement>;

const menuIcon = (name: string, glyph: Glyph) => {
    const Icon = (props: MenuIconProps) => {
        const maskId = `menu-icon-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
        const { fill, lines = [], mask = [], top = [], dy } = glyph;
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width={24}
                height={24}
                fill="none"
                aria-hidden="true"
                focusable="false"
                {...props}
            >
                <g transform={dy ? `translate(0 ${dy})` : undefined}>
                    {mask.length > 0 && (
                        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
                            <rect width="24" height="24" fill="#fff" />
                            {mask.map(step => (step.line
                                ? <path key={step.d} d={step.d} fill="none" stroke="#000" strokeWidth={step.line} strokeLinecap="square" />
                                : <path key={step.d} d={step.d} fill={step.keep ? '#fff' : '#000'} />))}
                        </mask>
                    )}
                    <g mask={mask.length > 0 ? `url(#${maskId})` : undefined}>
                        <path d={fill.join('')} fill="currentColor" />
                        {lines.map(d => (
                            <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="square" strokeLinejoin="miter" />
                        ))}
                    </g>
                    {top.map(d => <path key={d} d={d} fill="currentColor" />)}
                </g>
            </svg>
        );
    };
    Icon.displayName = `${name}Icon`;
    return Icon;
};

/** Tablica */
export const DashboardIcon = menuIcon('Dashboard', {
    fill: [
        'M3 3h8v10H3z',
        'M13 3h8v6h-8z',
        'M3 15h8v6H3z',
        'M13 11H21V15A6 6 0 0 1 15 21H13Z',
    ],
    mask: [
        { d: 'M9.58 27L27 9.58', line: CUT },
        { d: 'M7.18 27L27 7.18', line: CUT },
    ],
});

/** Powiadomienia */
export const NotificationsIcon = menuIcon('Notifications', {
    fill: [
        'M12 2.6a6.2 6.2 0 0 1 6.2 6.2V13l2.3 3.4v1.2h-17v-1.2L5.8 13V8.8A6.2 6.2 0 0 1 12 2.6Z',
        'M9.6 19.2h4.8a2.4 2.4 0 0 1-4.8 0Z',
    ],
});

/** Czas pracy */
export const WorkTimeIcon = menuIcon('WorkTime', {
    fill: [
        'M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0 -19 0Z',
    ],
    mask: [
        { d: 'M12 6.6V12.4l3.6 2.4', line: 2.1 },
        { d: 'M8.03 27.5L27.5 8.03', line: CUT },
        { d: 'M5.63 27.5L27.5 5.63', line: CUT },
    ],
});

/** Urlop */
export const LeaveIcon = menuIcon('Leave', {
    fill: [
        'M7 2.5h2.4v4.2H7z',
        'M14.6 2.5H17v4.2h-2.4z',
        'M3 5H21V14.5A6.5 6.5 0 0 1 14.5 21H3Z',
    ],
    mask: [
        { d: 'M3 9.6h18v1.3H3z' },
        { d: 'M6.2 19.4 12.6 13h2.2l-6.4 6.4z' },
        { d: 'M10.4 19.4 16.8 13H19l-6.4 6.4z' },
    ],
});

/** Wizyty */
export const VisitsIcon = menuIcon('Visits', {
    fill: [
        'M7 2.5h2.4v4.2H7z',
        'M14.6 2.5H17v4.2h-2.4z',
        'M3 5H21V14.5A6.5 6.5 0 0 1 14.5 21H3Z',
    ],
    mask: [
        { d: 'M3 9.6h18v1.3H3z' },
        { d: 'M7.4 15.6l2.6 2.5 5.2-5.2', line: 2.1 },
        { d: 'M9.29 27L27 9.29', line: CUT },
        { d: 'M6.89 27L27 6.89', line: CUT },
    ],
});

/** Kalendarz */
export const CalendarIcon = menuIcon('Calendar', {
    fill: [
        'M7 2.5h2.4v4.2H7z',
        'M14.6 2.5H17v4.2h-2.4z',
        'M3 5H21V14.5A6.5 6.5 0 0 1 14.5 21H3Z',
    ],
    mask: [
        { d: 'M3 9.6h18v1.3H3z' },
        { d: 'M6 13.2h3v3H6z' },
        { d: 'M10.6 13.2h3v3h-3z' },
        { d: 'M6 17.4h3v2H6z' },
        { d: 'M9.29 27L27 9.29', line: CUT },
        { d: 'M6.89 27L27 6.89', line: CUT },
    ],
});

/** Zlecenia zbiorcze */
export const BatchOrdersIcon = menuIcon('BatchOrders', {
    fill: [
        'M12 2.5l9.5 5-9.5 5-9.5-5z',
        'M4.3 11.4 12 15.5l7.7-4.1 1.8 1-9.5 5-9.5-5z',
        'M4.3 15.9 12 20l7.7-4.1 1.8 1-9.5 5-9.5-5z',
    ],
});

/** Galeria */
export const GalleryIcon = menuIcon('Gallery', {
    fill: [
        'M2.5 2.5h15v2.2H4.7V17.5H2.5z',
        'M6.5 6.5H21.5V15.5A6 6 0 0 1 15.5 21.5H6.5Z',
    ],
    mask: [
        { d: 'M8.6 18.6l3.6-5 2.6 3.2 1.7-2 2.6 3.8z' },
        { d: 'M9.7 10.4a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0Z' },
        { d: 'M10.08 27.5L27.5 10.08', line: CUT },
        { d: 'M7.68 27.5L27.5 7.68', line: CUT },
    ],
});

/** Zapytania */
export const InquiriesIcon = menuIcon('Inquiries', {
    fill: [
        'M3 12.6h5.4l1.6 2.6h4l1.6-2.6H21V15a6 6 0 0 1-6 6H3z',
    ],
    lines: ['M3.9 12.6 6.6 4.6h10.8l2.7 8'],
    mask: [
        { d: 'M9.58 27L27 9.58', line: CUT },
        { d: 'M7.18 27L27 7.18', line: CUT },
    ],
});

/** Klienci */
export const CustomersIcon = menuIcon('Customers', {
    fill: [
        'M13.299999999999999 6.6a3.1 3.1 0 1 0 6.2 0a3.1 3.1 0 1 0 -6.2 0Z',
        'M12.6 12.7A5 5 0 0 1 15.8 11.6h1.2a5 5 0 0 1 5 5v2.6h-9.4z',
        'M5.1000000000000005 7.6a3.7 3.7 0 1 0 7.4 0a3.7 3.7 0 1 0 -7.4 0Z',
        'M2 21v-1.8A5.2 5.2 0 0 1 7.2 14h3.2A5.2 5.2 0 0 1 15.6 19.2V21z',
    ],
    mask: [
        { d: 'M3.700000000000001 7.6a5.1 5.1 0 1 0 10.2 0a5.1 5.1 0 1 0 -10.2 0Z' },
        { d: 'M0.6 22.4v-3.2A6.6 6.6 0 0 1 7.2 12.6h3.2A6.6 6.6 0 0 1 17 19.2v3.2z' },
        { d: 'M5.1000000000000005 7.6a3.7 3.7 0 1 0 7.4 0a3.7 3.7 0 1 0 -7.4 0Z', keep: true },
        { d: 'M2 21v-1.8A5.2 5.2 0 0 1 7.2 14h3.2A5.2 5.2 0 0 1 15.6 19.2V21z', keep: true },
    ],
});

/** Zaplanowane treści */
export const ScheduledContentIcon = menuIcon('ScheduledContent', {
    fill: [
        'M2.5 3h19v10.5a6 6 0 0 1-6 6H9l-5 3.5v-3.5H2.5z',
    ],
    mask: [
        { d: 'M7.4 11.2a4.6 4.6 0 1 0 9.2 0a4.6 4.6 0 1 0 -9.2 0Z' },
        { d: 'M8.8 11.2a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0Z', keep: true },
        { d: 'M12 9.2v2.4l1.4 1', line: 2.1 },
        { d: 'M10.08 25.5L27.5 8.08', line: CUT },
        { d: 'M7.68 25.5L27.5 5.68', line: CUT },
    ],
});

/** Pojazdy */
export const VehiclesIcon = menuIcon('Vehicles', {
    fill: [
        'M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0 -19 0Z',
    ],
    mask: [
        { d: 'M4.7 12a7.3 7.3 0 1 0 14.6 0a7.3 7.3 0 1 0 -14.6 0Z' },
        { d: 'M5.3 12a6.7 6.7 0 1 0 13.4 0a6.7 6.7 0 1 0 -13.4 0Z', keep: true },
        { d: 'M12.92 9.04L13.8 6.17A6.1 6.1 0 0 1 16.99 8.48L14.53 10.21A3.1 3.1 0 0 0 12.92 9.04Z' },
        { d: 'M15.1 11.96L18.1 11.91A6.1 6.1 0 0 1 16.88 15.66L14.48 13.86A3.1 3.1 0 0 0 15.1 11.96Z' },
        { d: 'M13 14.93L13.97 17.77A6.1 6.1 0 0 1 10.03 17.77L11 14.93A3.1 3.1 0 0 0 13 14.93Z' },
        { d: 'M9.52 13.86L7.12 15.66A6.1 6.1 0 0 1 5.9 11.91L8.9 11.96A3.1 3.1 0 0 0 9.52 13.86Z' },
        { d: 'M9.47 10.21L7.01 8.48A6.1 6.1 0 0 1 10.2 6.17L11.08 9.04A3.1 3.1 0 0 0 9.47 10.21Z' },
        { d: 'M10.9 12a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0 -2.2 0Z' },
        { d: 'M8.03 27.5L27.5 8.03', line: CUT },
        { d: 'M5.63 27.5L27.5 5.63', line: CUT },
    ],
});

/** Pracownicy */
export const EmployeesIcon = menuIcon('Employees', {
    fill: [
        'M2.5 4.5H21.5V13.5A6 6 0 0 1 15.5 19.5H2.5Z',
    ],
    mask: [
        { d: 'M5.999999999999999 10.4a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0Z' },
        { d: 'M4.9 16.4a3.3 3.3 0 0 1 6.6 0z' },
        { d: 'M13.4 9.2h5v1.4h-5z' },
        { d: 'M13.4 12.2h3.6v1.4h-3.6z' },
        { d: 'M10.08 25.5L27.5 8.08', line: CUT },
        { d: 'M7.68 25.5L27.5 5.68', line: CUT },
    ],
});

/** Finanse */
export const FinancesIcon = menuIcon('Finances', {
    fill: [
        'M4 2.5h10l6 6V15.5a6 6 0 0 1-6 6H4z',
    ],
    mask: [
        { d: 'M13.2 2.5v6.3H20' },
        { d: 'M7.2 11.4h6.6v1.4H7.2z' },
        { d: 'M7.2 14.6h4.6V16H7.2z' },
        { d: 'M13.6 2.2v6.2H20.3', line: 1.4 },
        { d: 'M8.58 27.5L26 10.08', line: CUT },
        { d: 'M6.18 27.5L26 7.68', line: CUT },
    ],
});

/** Statystyki */
export const StatisticsIcon = menuIcon('Statistics', {
    fill: [
        'M3 14h4v7H3z',
        'M10 9.5h4V21h-4z',
        'M17 3H21V21A0 0 0 0 1 21 21H17Z',
    ],
});

/** Produkty */
export const ProductsIcon = menuIcon('Products', {
    fill: [
        'M3 3h18v4.6H3z',
        'M4.2 9H19.8V15.9A5.6 5.6 0 0 1 14.200000000000001 21.5H4.2Z',
    ],
    mask: [
        { d: 'M9.6 12h4.8v1.6H9.6z' },
        { d: 'M8.62 27.5L25.8 10.32', line: CUT },
        { d: 'M6.22 27.5L25.8 7.92', line: CUT },
    ],
});

/** Aktywność */
export const ActivityIcon = menuIcon('Activity', {
    fill: [

    ],
    lines: ['M2.5 12.5h4.2l2.6-7 5.2 13.4 2.6-6.4h4.4'],
});

/** Kampanie */
export const CampaignsIcon = menuIcon('Campaigns', {
    fill: [
        'M21.5 2.5 2.5 10.2l7.3 2.9 2.4 7.4z',
    ],
    mask: [
        { d: 'M9.8 13.1 21.5 2.5l-10.3 12.3z' },
    ],
});

/** Instagram */
export const InstagramIcon = menuIcon('Instagram', {
    fill: [
        'M3 3H21V14A7 7 0 0 1 14 21H3Z',
    ],
    mask: [
        { d: 'M7.6 12a4.4 4.4 0 1 0 8.8 0a4.4 4.4 0 1 0 -8.8 0Z' },
        { d: 'M15.600000000000001 7.2a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0Z' },
        { d: 'M9 27L27 9', line: CUT },
        { d: 'M6.6 27L27 6.6', line: CUT },
    ],
    top: ['M9.7 12a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0 -4.6 0Z'],
});

/** Ustawienia */
export const SettingsIcon = menuIcon('Settings', {
    fill: [
        'M10.24 4.61L10.28 2.15L13.72 2.15L13.76 4.61L14.91 4.98L15.99 5.53L17.75 3.82L20.18 6.25L18.47 8.01L19.02 9.09L19.39 10.24L21.85 10.28L21.85 13.72L19.39 13.76L19.02 14.91L18.47 15.99L20.18 17.75L17.75 20.18L15.99 18.47L14.91 19.02L13.76 19.39L13.72 21.85L10.28 21.85L10.24 19.39L9.09 19.02L8.01 18.47L6.25 20.18L3.82 17.75L5.53 15.99L4.98 14.91L4.61 13.76L2.15 13.72L2.15 10.28L4.61 10.24L4.98 9.09L5.53 8.01L3.82 6.25L6.25 3.82L8.01 5.53L9.09 4.98Z',
    ],
    mask: [
        { d: 'M8.7 12a3.3 3.3 0 1 0 6.6 0a3.3 3.3 0 1 0 -6.6 0Z' },
    ],
});

/** Zgłoś problem */
export const ReportProblemIcon = menuIcon('ReportProblem', {
    fill: [
        'M2.4000000000000004 12a9.6 9.6 0 1 0 19.2 0a9.6 9.6 0 1 0 -19.2 0Z',
    ],
    mask: [
        { d: 'M10.8 6.2h2.4l-.4 7.6h-1.6z' },
        { d: 'M10.65 16.8a1.35 1.35 0 1 0 2.7 0a1.35 1.35 0 1 0 -2.7 0Z' },
        { d: 'M8.07 27.6L27.6 8.07', line: CUT },
        { d: 'M5.67 27.6L27.6 5.67', line: CUT },
    ],
});
