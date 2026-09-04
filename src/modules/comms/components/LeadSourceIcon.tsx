// src/modules/comms/components/LeadSourceIcon.tsx
// Skąd przyszło zapytanie - jedną ikoną, w tabeli leadów i w oknie szczegółów.
// Wspólna, bo obie listy muszą mówić o tym samym źródle tym samym znakiem;
// dwie kopie rozjeżdżają się przy pierwszym nowym kanale.
import { Globe, Mail, Phone, User } from 'lucide-react';
import type { Lead } from '../types';

export function LeadSourceIcon({ source }: { source: Lead['source'] }) {
    if (source === 'PHONE') return <Phone size={13} color="#94a3b8" />;
    if (source === 'EMAIL') return <Mail size={13} color="#94a3b8" />;
    // Formularz ze strony - inne źródło znaczy inną rozmowę, więc i inna ikona.
    if (source === 'FORM') return <Globe size={13} color="#94a3b8" />;
    return <User size={13} color="#94a3b8" />;
}
