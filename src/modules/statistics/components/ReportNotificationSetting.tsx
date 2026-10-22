// src/modules/statistics/components/ReportNotificationSetting.tsx
//
// „Nowy raport" w Ustawieniach → Telefon → Powiadomienia, w sekcji „Raporty
// i podsumowania". Ustawienie należy do osoby (trafia na JEJ telefon), więc każdy
// z dostępem do raportu ustawia je sam. Push przychodzi w dniu, w którym domknął się okres.
//
// Sam wiersz, bez własnej ramy i nagłówka: stał osobną ramą między „To urządzenie"
// a kodem QR, z dala od podsumowań reklam - dwa ustawienia „jak często" w dwóch
// końcach widoku. Ramę i nagłówek daje teraz sekcja, która trzyma je razem.

import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Segmented, ui } from '@/common/components/ui';
import { usePermissions } from '@/core/permissions/usePermissions';
import { ownerReportApi, type ReportFrequency } from '../api/ownerReportApi';

const KEY = ['owner-report', 'notification'];

const OPTIONS = [
    { value: 'OFF' as const, label: 'Wyłączone' },
    { value: 'WEEKLY' as const, label: 'Co tydzień' },
    { value: 'BIWEEKLY' as const, label: 'Co 2 tygodnie' },
    { value: 'MONTHLY' as const, label: 'Co miesiąc' },
];

/** Uprawnienia, bez których raportu nie ma - sekcja nad wierszem pyta o to samo. */
export const REPORT_NOTIFICATION_PERMISSIONS = ['STATISTICS_VIEW', 'FINANCE_VIEW_REPORTS'] as const;

export function ReportNotificationSetting() {
    const { can } = usePermissions();
    if (!can([...REPORT_NOTIFICATION_PERMISSIONS])) return null;
    return <Setting />;
}

function Setting() {
    const queryClient = useQueryClient();
    const current = useQuery({ queryKey: KEY, queryFn: ownerReportApi.getNotification });
    const update = useMutation({
        mutationFn: (frequency: ReportFrequency) => ownerReportApi.updateNotification(frequency),
        onSuccess: frequency => queryClient.setQueryData(KEY, frequency),
    });

    const value = update.isPending && update.variables ? update.variables : current.data ?? 'OFF';

    return (
        <Row>
            <RowTitle>Nowy raport</RowTitle>
            <Segmented
                label="Powiadomienie o nowym raporcie"
                size="sm"
                options={OPTIONS}
                value={value}
                onChange={frequency => { if (frequency !== value) update.mutate(frequency); }}
            />
            <Hint>Przychodzi rano, gdy skończy się wybrany okres: tydzień, 2 tygodnie albo miesiąc.</Hint>
        </Row>
    );
}

const Row = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    max-width: 100%;
`;

const RowTitle = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;
