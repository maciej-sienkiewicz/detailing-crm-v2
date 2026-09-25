// src/common/components/ui/StatusPill.tsx
//
// Plakietka stanu. Pięć tonów zamiast czternastu lokalnych odmian (PendingChip,
// DiscountChip, EditedChip, TypeBadge, StatusBadge…), z których część pisała
// 10px wersalikami. Treść to pełne słowa - „Czeka na zgodę klienta", nie „OCZEKUJE".
//
// Ton to ZNACZENIE (CLAUDE.md §2): ok = „tak / domknięte", warn = „przeczytaj",
// info = marka / w toku, danger = coś poszło źle, neutral = stan bez oceny.

import styled from 'styled-components';
import { ui } from './tokens';

export type PillTone = 'neutral' | 'info' | 'ok' | 'warn' | 'danger';

const TONES: Record<PillTone, { line: string; bg: string; ink: string }> = {
    neutral: { line: ui.line, bg: ui.surfaceSoft, ink: ui.textSecondary },
    info: { line: ui.brandLineSoft, bg: ui.brandTint, ink: ui.brandDeep },
    ok: { line: ui.okLine, bg: ui.okTint, ink: ui.okInk },
    warn: { line: ui.warnLine, bg: ui.warnTint, ink: ui.warnInk },
    danger: { line: ui.dangerLine, bg: ui.dangerTint, ink: ui.dangerInk },
};

export const StatusPill = styled.span<{ $tone?: PillTone; $size?: 'sm' | 'md' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: ${p => p.$size === 'md' ? '5px 12px' : '2px 9px'};
    border: 1px solid ${p => TONES[p.$tone ?? 'neutral'].line};
    border-radius: ${ui.radiusControl};
    background: ${p => TONES[p.$tone ?? 'neutral'].bg};
    color: ${p => TONES[p.$tone ?? 'neutral'].ink};
    font-size: ${p => p.$size === 'md' ? '13px' : '12px'};
    font-weight: 600;
    line-height: 1.4;
    white-space: nowrap;
    flex-shrink: 0;

    svg { width: 12px; height: 12px; flex-shrink: 0; }
`;
