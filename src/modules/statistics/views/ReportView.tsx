// src/modules/statistics/views/ReportView.tsx
//
// Statystyki → Raport: PDF „co się wydarzyło w firmie i na czym stoję" za wybrany
// okres oraz (tylko właściciel) wysyłka tego raportu mailem w poniedziałek rano.
//
// Celowo mało tekstu: co jest w raporcie, mówi sam PDF. Tu są tylko kontrolki.
// Jedyne wypełnienie w oknie to „Pobierz PDF" (CLAUDE.md §2) - wysyłka mailem to
// stan, więc przełącznik, nie przycisk.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Download } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/common/components/PageHeader';
import { Button, Card, Notice, Panel, PanelBody, PanelHead, SectionTitle, Segmented, ui } from '@/common/components/ui';
import { readBlobErrorMessage, saveBlobAsFile } from '@/common/utils/blobFile';
import { usePermissions } from '@/core/permissions/usePermissions';
import { StatsNav } from '../components/StatsNav';
import { ViewContainer, HdrBtns } from '../components/shared';
import { ownerReportApi, type ReportFrequency } from '../api/ownerReportApi';
import {
    formatRange,
    lastFullWeeks,
    reportFileName,
    toIsoDate,
    validateRange,
    type ReportPeriodOption,
    type ReportRange,
} from '../reportPeriod';

const SETTINGS_KEY = ['owner-report', 'settings'];

const PERIOD_OPTIONS = [
    { value: 'WEEK' as const, label: 'Ostatni tydzień' },
    { value: 'TWO_WEEKS' as const, label: 'Ostatnie 2 tygodnie' },
    { value: 'CUSTOM' as const, label: 'Własny okres' },
];

const FREQUENCY_OPTIONS = [
    { value: 'OFF' as const, label: 'Wyłączona' },
    { value: 'WEEKLY' as const, label: 'Co tydzień' },
    { value: 'BIWEEKLY' as const, label: 'Co 2 tygodnie' },
];

const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 720px;
    width: 100%;
`;

const CardBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px 22px 22px;

    @media (max-width: 640px) { padding: 18px 16px; }
`;

const DateRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

const DateInput = styled.input`
    height: 36px;
    padding: 0 12px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    font-family: inherit;
    font-size: 14px;
    color: ${ui.ink};
    background: ${ui.surface};

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;

const RangeLabel = styled.span`
    font-size: 15px;
    font-weight: 600;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

export const ReportView = () => {
    const { isOwner } = usePermissions();
    const [option, setOption] = useState<ReportPeriodOption>('WEEK');
    const [custom, setCustom] = useState<ReportRange>(() => lastFullWeeks(1, new Date()));
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const range = useMemo<ReportRange>(() => {
        if (option === 'WEEK') return lastFullWeeks(1, new Date());
        if (option === 'TWO_WEEKS') return lastFullWeeks(2, new Date());
        return custom;
    }, [option, custom]);

    const rangeError = option === 'CUSTOM' ? validateRange(range) : null;

    const download = async () => {
        if (rangeError) return;
        setDownloading(true);
        setError(null);
        try {
            const blob = await ownerReportApi.downloadPdf(range.from, range.to);
            saveBlobAsFile(blob, reportFileName(range));
        } catch (e) {
            setError((await readBlobErrorMessage(e)) ?? 'Nie udało się pobrać raportu. Spróbuj ponownie.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <ViewContainer>
            <PageHeader
                title="Statystyki"
                subtitle="Raport z działania studia"
                actions={<HdrBtns><StatsNav /></HdrBtns>}
            />

            <Column>
                <Card>
                    <CardBody>
                        <SectionTitle size="lg">Raport PDF</SectionTitle>
                        <Segmented
                            label="Okres raportu"
                            options={PERIOD_OPTIONS}
                            value={option}
                            onChange={value => { setOption(value); setError(null); }}
                        />
                        {option === 'CUSTOM' && (
                            <DateRow>
                                <DateInput
                                    type="date"
                                    aria-label="Od"
                                    value={custom.from}
                                    max={toIsoDate(new Date())}
                                    onChange={e => setCustom(c => ({ ...c, from: e.target.value }))}
                                />
                                <span aria-hidden="true">–</span>
                                <DateInput
                                    type="date"
                                    aria-label="Do"
                                    value={custom.to}
                                    max={toIsoDate(new Date())}
                                    onChange={e => setCustom(c => ({ ...c, to: e.target.value }))}
                                />
                            </DateRow>
                        )}
                        {rangeError && <Notice tone="warn">{rangeError}</Notice>}
                        {error && <Notice tone="danger" role="alert">{error}</Notice>}
                        <Footer>
                            <RangeLabel>{rangeError ? '' : formatRange(range)}</RangeLabel>
                            <Button
                                variant="primary"
                                onClick={download}
                                disabled={downloading || rangeError !== null}
                            >
                                <Download size={16} aria-hidden="true" />
                                {downloading ? 'Przygotowuję…' : 'Pobierz PDF'}
                            </Button>
                        </Footer>
                    </CardBody>
                </Card>

                {isOwner && <EmailDelivery />}
            </Column>
        </ViewContainer>
    );
};

/** Wysyłkę mailem ustawia tylko właściciel - raport z finansami idzie na jego adres. */
function EmailDelivery() {
    const queryClient = useQueryClient();
    const settings = useQuery({ queryKey: SETTINGS_KEY, queryFn: ownerReportApi.getSettings });
    const update = useMutation({
        mutationFn: (frequency: ReportFrequency) => ownerReportApi.updateSettings(frequency),
        onSuccess: data => queryClient.setQueryData(SETTINGS_KEY, data),
    });

    const value = update.isPending && update.variables ? update.variables : settings.data?.frequency ?? 'OFF';

    return (
        <Panel>
            <PanelHead>
                <SectionTitle>Wysyłka mailem</SectionTitle>
                <Segmented
                    label="Wysyłka raportu mailem"
                    size="sm"
                    options={FREQUENCY_OPTIONS}
                    value={value}
                    onChange={frequency => { if (frequency !== value) update.mutate(frequency); }}
                />
            </PanelHead>
            <PanelBody>
                <Hint>W poniedziałek rano, na adres właściciela.</Hint>
            </PanelBody>
        </Panel>
    );
}
