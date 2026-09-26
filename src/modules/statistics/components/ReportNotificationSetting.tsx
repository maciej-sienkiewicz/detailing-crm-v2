// src/modules/statistics/components/ReportNotificationSetting.tsx
//
// „Dostępny nowy raport" w Ustawieniach → Tablety, telefon, kontakty → Powiadomienia.
// Ustawienie należy do osoby (trafia na JEJ telefon), więc każdy z dostępem do
// raportu ustawia je sam. Push przychodzi w dniu, w którym domknął się okres.

import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Panel, SectionTitle, Segmented, ui } from '@/common/components/ui';
import { usePermissions } from '@/core/permissions/usePermissions';
import { ownerReportApi, type ReportFrequency } from '../api/ownerReportApi';

const KEY = ['owner-report', 'notification'];

const OPTIONS = [
    { value: 'OFF' as const, label: 'Wyłączone' },
    { value: 'WEEKLY' as const, label: 'Co tydzień' },
    { value: 'BIWEEKLY' as const, label: 'Co 2 tygodnie' },
    { value: 'MONTHLY' as const, label: 'Co miesiąc' },
];

export function ReportNotificationSetting() {
    const { can } = usePermissions();
    if (!can(['STATISTICS_VIEW', 'FINANCE_VIEW_REPORTS'])) return null;
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
        <Box>
            <SectionTitle as="h3">Dostępny nowy raport</SectionTitle>
            <Segmented
                label="Powiadomienie o nowym raporcie"
                size="sm"
                options={OPTIONS}
                value={value}
                onChange={frequency => { if (frequency !== value) update.mutate(frequency); }}
            />
            <Hint>Rano, gdy skończy się tydzień, 2 tygodnie albo miesiąc.</Hint>
        </Box>
    );
}

const Box = styled(Panel)`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 16px 20px;

    @media (max-width: 767px) { padding: 16px; }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;
