// src/modules/statistics/views/ReportsView.tsx
//
// Statystyki → „Raporty": każdy raport od założenia konta w jednej tabeli.
//
// Tabela to spis plików, ale z liczbami, po które się do niego wraca: sprzedaż brutto
// i wizyty zamknięte okresu, z porównaniem do poprzedniego okresu albo do mediany.
// Liczby i napis zmiany podaje backend tą samą funkcją, którą liczy PDF - tabela,
// która mówi „+12%", a plik z tego wiersza „+9%", podważa oba.
//
// Trwający okres stoi zawsze na górze, ale pliku za niego nie ma: raport za pół tygodnia
// zmienia się z godziny na godzinę, a porównany z pełnym tygodniem wygląda jak spadek.
// Zamiast przycisku kręci się wskaźnik i data, od której raport będzie do pobrania.
//
// Długość okresu i porównanie siedzą w adresie (`?okres=…&porownanie=…`), żeby odświeżenie
// i link wysłany wspólnikowi pokazywały tę samą tabelę.

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Download, FileText } from 'lucide-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/common/components/PageHeader';
import { Button, Card, Notice, Segmented, StatusPill, ui, type PillTone } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { formatCurrency } from '@/common/utils';
import { readBlobErrorMessage, saveBlobAsFile } from '@/common/utils/blobFile';
import { StatsNav } from '../components/StatsNav';
import { periodRange, shortDay } from '../utils/reportDates';
import { ViewContainer, HdrBtns } from '../components/shared';
import {
    ownerReportApi,
    reportFileName,
    type ReportArchiveRow,
    type ReportComparison,
    type ReportLength,
} from '../api/ownerReportApi';

/** Pół roku tygodni na start; starsze dopiero na życzenie, żeby tabela nie była ścianą. */
export const REPORTS_PAGE = 26;

const LENGTHS: { value: ReportLength; label: string; param: string }[] = [
    { value: 'WEEK', label: 'Tydzień', param: 'tydzien' },
    { value: 'TWO_WEEKS', label: '2 tygodnie', param: '2-tygodnie' },
    { value: 'MONTH', label: 'Miesiąc', param: 'miesiac' },
];

const COMPARISONS: { value: ReportComparison; label: string; param: string; word: string }[] = [
    { value: 'PREVIOUS', label: 'Poprzedni okres', param: 'poprzedni', word: 'poprzednio' },
    { value: 'MEDIAN', label: 'Mediana 6 okresów', param: 'mediana', word: 'mediana' },
];

const pln = (grosz: number) => formatCurrency(grosz / 100, 'PLN');

/**
 * Odcień zmiany: wzrost zielony, spadek bursztynowy („przeczytaj"), a nie czerwony -
 * czerwień w tym interfejsie znaczy „nieodwracalne" (CLAUDE.md §2). „—" (odniesienie
 * równe zero) nie jest zmianą, tylko brakiem podstawy - bez pigułki.
 */
const changeTone = (change: string): PillTone =>
    change.startsWith('+') ? 'ok' : change.startsWith('-') ? 'warn' : 'neutral';

export const ReportsView = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const length = LENGTHS.find(l => l.param === searchParams.get('okres'))?.value ?? 'WEEK';
    const comparison = COMPARISONS.find(c => c.param === searchParams.get('porownanie')) ?? COMPARISONS[0];
    const [visible, setVisible] = useState(REPORTS_PAGE);

    const archive = useQuery({
        queryKey: ['owner-report', 'archive', length, comparison.value],
        queryFn: () => ownerReportApi.getArchive(length, comparison.value),
        staleTime: 5 * 60_000,
        // Przełączenie porównania nie mruga pustą tabelą - stare liczby zostają, aż przyjdą nowe.
        placeholderData: keepPreviousData,
    });

    const setParam = (name: string, value: string) => {
        const next = new URLSearchParams(searchParams);
        next.set(name, value);
        setSearchParams(next, { replace: true });
    };

    const rows = archive.data?.rows ?? [];
    const current = rows.find(r => r.inProgress);
    const full = rows.filter(r => !r.inProgress);

    return (
        <ViewContainer>
            <PageHeader
                title="Statystyki"
                subtitle="Raporty za pełne okresy od założenia konta"
                actions={<HdrBtns><StatsNav /></HdrBtns>}
            />

            <Card aria-labelledby="reports-title">
                <Head>
                    <TitleRow>
                        <IconTile aria-hidden="true"><FileText /></IconTile>
                        <div>
                            <Title id="reports-title">Raporty</Title>
                            {archive.data && (
                                <Sub>Od {shortDay(archive.data.since)}, dnia założenia konta</Sub>
                            )}
                        </div>
                    </TitleRow>
                    <Controls>
                        <Segmented
                            label="Długość okresu"
                            options={LENGTHS}
                            value={length}
                            onChange={value => {
                                setParam('okres', LENGTHS.find(l => l.value === value)!.param);
                                setVisible(REPORTS_PAGE);
                            }}
                        />
                        <Segmented
                            label="Porównanie z"
                            options={COMPARISONS}
                            value={comparison.value}
                            onChange={value => setParam('porownanie', COMPARISONS.find(c => c.value === value)!.param)}
                        />
                    </Controls>
                </Head>

                {archive.isError && (
                    <Body>
                        <Notice tone="danger" role="alert">
                            Nie udało się wczytać raportów.{' '}
                            <InlineRetry type="button" onClick={() => archive.refetch()}>Spróbuj ponownie</InlineRetry>
                        </Notice>
                    </Body>
                )}

                {archive.isPending && (
                    <Loading role="status"><Ring aria-hidden="true" />Wczytuję raporty</Loading>
                )}

                {archive.data && (
                    <TableWrap $fading={archive.isPlaceholderData}>
                        <Table>
                            <thead>
                                <tr>
                                    <th scope="col">Okres</th>
                                    <th scope="col">Sprzedaż brutto</th>
                                    <th scope="col">Wizyty zamknięte</th>
                                    <th scope="col"><VisuallyHidden>Raport PDF</VisuallyHidden></th>
                                </tr>
                            </thead>
                            <tbody>
                                {current && <CurrentRow row={current} />}
                                {full.slice(0, visible).map(row => (
                                    <FullRow
                                        key={row.from}
                                        row={row}
                                        length={length}
                                        comparison={comparison.value}
                                        baselineWord={comparison.word}
                                    />
                                ))}
                            </tbody>
                        </Table>
                        {full.length === 0 && current && (
                            <Body>
                                <Empty>
                                    Pierwszy raport będzie gotowy {shortDay(current.availableOn)}, kiedy skończy się
                                    trwający okres. Raport powstaje zawsze za pełny okres.
                                </Empty>
                            </Body>
                        )}
                        {full.length > visible && (
                            <More>
                                <Button variant="ghost" block onClick={() => setVisible(v => v + REPORTS_PAGE)}>
                                    Pokaż starsze ({full.length - visible})
                                </Button>
                            </More>
                        )}
                    </TableWrap>
                )}
            </Card>
        </ViewContainer>
    );
};

function CurrentRow({ row }: { row: ReportArchiveRow }) {
    return (
        <Tr $current>
            <th scope="row" data-label="Okres">
                <Period>
                    <PeriodLabel>{periodRange(row.from, row.to)}</PeriodLabel>
                    <StatusPill $tone="neutral" $size="sm">Trwa</StatusPill>
                </Period>
            </th>
            <td data-label="Sprzedaż brutto">
                <Amount>{pln(row.salesGrossCents)}</Amount>
                <Muted>do dziś</Muted>
            </td>
            <td data-label="Wizyty zamknięte">
                <Amount>{row.closedVisits.toLocaleString('pl-PL')}</Amount>
                <Muted>do dziś</Muted>
            </td>
            <ActionCell>
                <Pending role="status" aria-label={`Okres trwa, raport będzie gotowy ${shortDay(row.availableOn)}`}>
                    <Ring aria-hidden="true" />
                    <span>Gotowy {shortDay(row.availableOn)}</span>
                </Pending>
            </ActionCell>
        </Tr>
    );
}

interface FullRowProps {
    row: ReportArchiveRow;
    length: ReportLength;
    comparison: ReportComparison;
    baselineWord: string;
}

function FullRow({ row, length, comparison, baselineWord }: FullRowProps) {
    const { showError } = useToast();
    const [downloading, setDownloading] = useState(false);

    const download = async () => {
        setDownloading(true);
        try {
            const blob = await ownerReportApi.downloadPdf(length, row.from, comparison);
            saveBlobAsFile(blob, reportFileName(length, row));
        } catch (e) {
            showError('Nie udało się pobrać raportu', (await readBlobErrorMessage(e)) ?? 'Spróbuj ponownie za chwilę.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Tr>
            <th scope="row" data-label="Okres">
                <Period><PeriodLabel>{periodRange(row.from, row.to)}</PeriodLabel></Period>
            </th>
            <td data-label="Sprzedaż brutto">
                <Amount>{pln(row.salesGrossCents)}</Amount>
                <Compare
                    change={row.salesGrossChange}
                    baseline={row.baselineSalesGrossCents === null ? null : `${baselineWord} ${pln(row.baselineSalesGrossCents)}`}
                />
            </td>
            <td data-label="Wizyty zamknięte">
                <Amount>{row.closedVisits.toLocaleString('pl-PL')}</Amount>
                <Compare
                    change={row.closedVisitsChange}
                    baseline={row.baselineClosedVisits === null ? null : `${baselineWord} ${row.baselineClosedVisits.toLocaleString('pl-PL')}`}
                />
            </td>
            <ActionCell>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={download}
                    disabled={downloading}
                    aria-label={`Pobierz raport PDF za ${periodRange(row.from, row.to)}`}
                >
                    {downloading ? <Ring aria-hidden="true" /> : <Download aria-hidden="true" />}
                    {downloading ? 'Przygotowuję…' : 'PDF'}
                </Button>
            </ActionCell>
        </Tr>
    );
}

function Compare({ change, baseline }: { change: string | null; baseline: string | null }) {
    if (!change || !baseline) return null;
    return (
        <CompareLine>
            {change !== '—' && <StatusPill $tone={changeTone(change)} $size="sm">{change}</StatusPill>}
            <Muted>{baseline}</Muted>
        </CompareLine>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const spin = keyframes`to { transform: rotate(360deg); }`;

const Ring = styled.span`
    display: inline-block;
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    border: 2px solid ${ui.brandLineSoft};
    border-top-color: ${ui.brandStrong};
    border-radius: 50%;
    animation: ${spin} 0.9s linear infinite;

    /* Wskaźnik niesie treść („okres trwa") - przy ograniczonym ruchu zwalnia, ale nie znika. */
    @media (prefers-reduced-motion: reduce) { animation-duration: 2.4s; }
`;

const Head = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px 20px;
    padding: 20px 22px 16px;

    @media (max-width: 640px) { padding: 16px; }
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
`;

const IconTile = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 12px;
    background: ${ui.brandTint};
    border: 1px solid ${ui.brandLineSoft};
    color: ${ui.brandInk};

    svg { width: 20px; height: 20px; }
`;

const Title = styled.h2`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: ${ui.ink};
`;

const Sub = styled.p`
    margin: 2px 0 0;
    font-size: 13px;
    color: ${ui.textMuted};
`;

const Controls = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-width: 100%;

    /* Telefon: oba przełączniki na całą szerokość, jeden pod drugim - nic nie ucieka za krawędź. */
    @media (max-width: 640px) {
        flex-direction: column;
        width: 100%;

        > * { display: flex; width: 100%; }
        > * > button { flex: 1 1 0; min-width: 0; padding: 0 8px; }
    }
`;

const Body = styled.div`
    padding: 0 22px 18px;

    @media (max-width: 640px) { padding: 0 16px 16px; }
`;

const InlineRetry = styled.button`
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    font-weight: 600;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
`;

const Loading = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 160px;
    font-size: 13px;
    color: ${ui.textMuted};
`;

const TableWrap = styled.div<{ $fading: boolean }>`
    opacity: ${p => p.$fading ? 0.55 : 1};
    transition: opacity 0.15s ease;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;

    th, td {
        padding: 12px 22px;
        text-align: left;
        vertical-align: top;
        border-top: 1px solid ${ui.lineSoft};
    }

    thead th {
        padding-top: 0;
        padding-bottom: 8px;
        border-top: none;
        font-size: 12px;
        font-weight: 600;
        color: ${ui.textMuted};
    }

    /* Telefon: wiersz tabeli staje się blokiem, liczby obok siebie, przycisk pod nimi. */
    @media (max-width: 720px) {
        thead { display: none; }
        tbody, tr { display: block; }

        tr {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 12px;
            padding: 14px 16px;
            border-top: 1px solid ${ui.lineSoft};
        }

        th, td {
            display: block;
            padding: 0;
            border-top: none;
        }

        th[scope='row'] { grid-column: 1 / -1; }

        td[data-label]::before {
            content: attr(data-label);
            display: block;
            margin-bottom: 2px;
            font-size: 12px;
            font-weight: 600;
            color: ${ui.textMuted};
        }
    }
`;

/*
 * Trwający okres jest na górze, ale to jeszcze nie raport: szare tło i przygaszone liczby,
 * żeby wzrok zaczynał od pierwszego pełnego okresu. Wskaźnik zostaje wyraźny - to on
 * mówi, że okres trwa.
 */
const Tr = styled.tr<{ $current?: boolean }>`
    background: ${p => p.$current ? ui.surfaceSoft : 'transparent'};

    ${p => p.$current && `
        th, td:not(:last-child) { opacity: 0.55; }
    `}
`;

const ActionCell = styled.td`
    text-align: right !important;
    white-space: nowrap;

    @media (max-width: 720px) {
        grid-column: 1 / -1;
        text-align: left !important;
    }
`;

const Period = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
`;

const PeriodLabel = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
`;

const Amount = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: ${ui.ink};
`;

const CompareLine = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
`;

const Muted = styled.span`
    display: inline-block;
    font-size: 12px;
    color: ${ui.textMuted};
`;

const Pending = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textMuted};
`;

const Empty = styled.p`
    margin: 0;
    padding-top: 12px;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textSecondary};
`;

const More = styled.div`
    padding: 8px 22px 16px;
    border-top: 1px solid ${ui.lineSoft};

    @media (max-width: 640px) { padding: 8px 16px 14px; }
`;

const VisuallyHidden = styled.span`
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
`;
