// src/modules/comms/components/shared.ts
// Drobne, współdzielone elementy wizualne modułu komunikacji.
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
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: ${({ $bg }) => $bg};
    color: ${({ $fg }) => $fg};
    white-space: nowrap;
`;

export const IconButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid #e5e7eb;
    background: #ffffff;
    color: #374151;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 13px;
    cursor: pointer;
    transition: background 120ms ease;

    &:hover { background: #f9fafb; }
    &:disabled { opacity: 0.5; cursor: default; }
`;

export const PrimaryButton = styled(IconButton)`
    background: #111827;
    border-color: #111827;
    color: #ffffff;

    &:hover { background: #1f2937; }
`;

export const EmptyHint = styled.div`
    padding: 32px 16px;
    text-align: center;
    color: #9ca3af;
    font-size: 13px;
`;
