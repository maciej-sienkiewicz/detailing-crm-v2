// src/modules/employees/components/worktime/StatusText.tsx
//
// Status karty czasu pracy jako kolorowy TEKST. Wcześniej był pastylką (StatusPill) -
// w wierszu miesiąca, w nagłówku okna karty i na karcie pracownika - a obok stały
// pastylki etapów miesiąca. Właściciel: „badge, które są tylko informacyjne i nie można
// w nie kliknąć". Odcień zostaje (CLAUDE.md §2: odcień = znaczenie), ramka znika.

import styled from 'styled-components';
import { ui } from '@/common/components/ui';
import type { CardStatus } from '../../api/worktimeMonthsApi';
import { CARD_STATUS, type StatusTone } from './monthFormat';

const INK: Record<StatusTone, string> = {
    warn: '#b45309',
    ok: ui.okInk,
    danger: ui.dangerInk,
    muted: ui.textMuted,
};

const Text = styled.span<{ $tone: StatusTone }>`
    font-size: 13.5px;
    font-weight: ${p => p.$tone === 'muted' ? 500 : 650};
    color: ${p => INK[p.$tone]};
    white-space: nowrap;
`;

export function StatusText({ status, className }: { status: CardStatus; className?: string }) {
    const { label, tone } = CARD_STATUS[status];
    return <Text $tone={tone} data-tone={tone} className={className}>{label}</Text>;
}
