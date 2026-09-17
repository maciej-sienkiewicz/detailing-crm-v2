import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { VerificationLevel } from '../types';

// Plakietka pochodzenia danych. Odcień niesie ZNACZENIE (bursztyn = „przeczytaj",
// neutralny = „w porządku"), nigdy wypełnienie priorytetu (CLAUDE.md §2) — to nie jest
// akcja, tylko etykieta.
const Badge = styled.span<{ $tone: 'amber' | 'neutral' | 'grey' | 'green' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 9px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1px;
    border: 1px solid ${p =>
        p.$tone === 'amber' ? 'rgba(245,158,11,0.4)'
        : p.$tone === 'green' ? 'rgba(16,185,129,0.4)'
        : st.border};
    background: ${p =>
        p.$tone === 'amber' ? st.bgAccentAmber
        : p.$tone === 'green' ? st.bgAccentGreen
        : st.bg};
    color: ${p =>
        p.$tone === 'amber' ? '#92400e'
        : p.$tone === 'green' ? '#047857'
        : st.textMuted};
`;

const CONFIG: Record<VerificationLevel, { tone: 'amber' | 'neutral' | 'grey' | 'green'; label: string; title: string }> = {
    AI_SUGGESTED: { tone: 'amber', label: 'Dane z AI', title: 'Rozpoznane przez AI — sprawdź etykietę przed użyciem' },
    GS1_VERIFIED: { tone: 'neutral', label: 'GS1', title: 'Dane z rejestru GS1' },
    STUDIO_CONFIRMED: { tone: 'green', label: 'Potwierdzone', title: 'Zgodność z etykietą potwierdzona w studiu' },
    CURATED: { tone: 'green', label: 'Zweryfikowane', title: 'Zweryfikowane przez zespół platformy' },
    UNVERIFIED: { tone: 'grey', label: 'Wpisane ręcznie', title: 'Dane wprowadzone ręcznie, niezweryfikowane' },
};

export function ProductProvenanceBadge({ level }: { level: VerificationLevel }) {
    const c = CONFIG[level];
    if (level === 'STUDIO_CONFIRMED' || level === 'CURATED') return null; // brak plakietki, gdy „w porządku"
    return <Badge $tone={c.tone} title={c.title}>{c.label}</Badge>;
}
