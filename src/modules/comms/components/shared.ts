// src/modules/comms/components/shared.ts
// Współdzielone elementy wizualne modułu komunikacji - oparte o tokeny motywu
// aplikacji (kolory, promienie, cienie), żeby moduł wyglądał jak reszta CRM.
import styled from 'styled-components';
import { formatCurrency } from '@/common/utils';

/** Ceny w module są w groszach (spójnie z backendem). */
export const formatGrosze = (grosze: number): string => formatCurrency(grosze / 100);

export const formatRelativeTime = (iso: string): string => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return 'teraz';
    if (minutes < 60) return `${minutes} min temu`;
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
        return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return `wczoraj, ${date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateTime = (iso: string): string =>
    new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

export const Pill = styled.span<{ $bg: string; $fg: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${p => p.theme.radii.full};
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    background: ${({ $bg }) => $bg};
    color: ${({ $fg }) => $fg};
    white-space: nowrap;
`;

export const IconButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.full};
    padding: 7px 14px;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};
    font-family: inherit;
    white-space: nowrap;

    &:hover {
        background: ${p => p.theme.colors.surfaceHover};
        border-color: ${p => p.theme.colors.textMuted};
    }
    &:disabled { opacity: 0.5; cursor: default; }

    svg { width: 14px; height: 14px; }
`;

export const PrimaryButton = styled(IconButton)`
    background: ${p => p.theme.colors.primary};
    border-color: transparent;
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);

    &:hover {
        background: #0284c7;
        border-color: transparent;
        box-shadow: 0 4px 14px rgba(14, 165, 233, 0.36);
    }
`;

export const EmptyHint = styled.div`
    padding: 32px 16px;
    text-align: center;
    color: ${p => p.theme.colors.textMuted};
    font-size: 13px;
`;

/** Karta-powierzchnia w stylu reszty aplikacji (Dashboard, Statystyki). */
export const SurfaceCard = styled.div`
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.xl};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.04);
    overflow: hidden;
`;

/** Chip filtra/zakładki spójny z resztą aplikacji. */
export const FilterChip = styled.button<{ $active: boolean }>`
    border: 1px solid ${({ $active, theme }) => ($active ? 'transparent' : theme.colors.border)};
    background: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.surface)};
    color: ${({ $active, theme }) => ($active ? '#ffffff' : theme.colors.textSecondary)};
    border-radius: ${p => p.theme.radii.full};
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    padding: 7px 16px;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};
    font-family: inherit;
    white-space: nowrap;

    &:hover {
        ${({ $active, theme }) => !$active && `background: ${theme.colors.surfaceHover};`}
    }
`;
