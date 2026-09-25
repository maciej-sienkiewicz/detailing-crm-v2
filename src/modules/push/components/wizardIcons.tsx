// src/modules/push/components/wizardIcons.tsx
//
// Glify kreatora powiadomień. Ikony „Udostępnij", „Dodaj" i „•••" odwzorowują te
// z iOS celowo: instrukcja „dotknij Udostępnij" przegrywa z obrazkiem, który
// użytkownik po prostu odnajduje na swoim ekranie.

const base = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
};

/** iOS „Udostępnij": kwadrat ze strzałką w górę. */
export const IosShareIcon = () => (
    <svg {...base}>
        <path d="M8 9H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2" />
        <path d="M12 3v12" />
        <path d="M8.5 6.5 12 3l3.5 3.5" />
    </svg>
);

/** iOS „Dodaj do ekranu początkowego": kwadrat z plusem. */
export const IosAddIcon = () => (
    <svg {...base}>
        <rect x="4" y="4" width="16" height="16" rx="3.5" />
        <path d="M12 8.5v7M8.5 12h7" />
    </svg>
);

/** Przycisk „•••" - w Safari od iOS 26 kryje się pod nim „Udostępnij". */
export const MoreIcon = () => (
    <svg {...base}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="8" cy="12" r="0.9" fill="currentColor" />
        <circle cx="12" cy="12" r="0.9" fill="currentColor" />
        <circle cx="16" cy="12" r="0.9" fill="currentColor" />
    </svg>
);

export const BellIcon = () => (
    <svg {...base}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

export const PhoneIcon = () => (
    <svg {...base}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

export const WalletIcon = () => (
    <svg {...base}>
        <path d="M20 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2" />
        <path d="M3 6v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3" />
    </svg>
);

export const InboxIcon = () => (
    <svg {...base}>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
);

export const MegaphoneIcon = () => (
    <svg {...base}>
        <path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
        <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" />
        <path d="M8 6v8" />
    </svg>
);

export const CheckIcon = () => (
    <svg {...base} strokeWidth={2.5}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export const WarnIcon = () => (
    <svg {...base}>
        <path d="M12 9v3m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
);

export const SendIcon = () => (
    <svg {...base}>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
);
