// src/modules/statistics/components/ReportDialog.tsx
//
// „Raport PDF" w nagłówku Statystyk: okno z trzema wyborami i jednym przyciskiem.
// Raport nie potrzebuje osobnego widoku - to plik, a nie ekran do oglądania.
//
// Domyślnie: ostatni pełny tydzień porównany z tygodniem wcześniej. Raport jest
// tylko za pełne okresy (tydzień od poniedziałku, 2 tygodnie, miesiąc), więc okres
// wybiera się z listy podanej przez backend, a nie z kalendarza.
//
// Powiadomienie push „Dostępny nowy raport" otwiera Statystyki z `?raport=WEEK&od=…`
// - okno otwiera się wtedy samo, od razu na tym okresie; zamknięcie czyści adres.

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { Bell, Download, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { Button, Notice, Segmented, ui } from '@/common/components/ui';
import { readBlobErrorMessage, saveBlobAsFile } from '@/common/utils/blobFile';
import {
    ownerReportApi,
    reportFileName,
    type ReportComparison,
    type ReportLength,
} from '../api/ownerReportApi';

const LENGTH_OPTIONS = [
    { value: 'WEEK' as const, label: 'Tydzień' },
    { value: 'TWO_WEEKS' as const, label: '2 tygodnie' },
    { value: 'MONTH' as const, label: 'Miesiąc' },
];

const COMPARISON_OPTIONS = [
    { value: 'PREVIOUS' as const, label: 'Poprzedni okres' },
    { value: 'MEDIAN' as const, label: 'Mediana 6 okresów' },
];

const NOTIFICATION_SETTINGS = '/settings?tab=mobile-devices&view=notifications';

const isLength = (value: string | null): value is ReportLength =>
    value === 'WEEK' || value === 'TWO_WEEKS' || value === 'MONTH';

/** Przycisk do ciemnego nagłówka Statystyk; otwiera okno raportu. */
export function ReportButton() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [manual, setManual] = useState<{ length: ReportLength; from: string | null } | null>(null);

    // Wejście z powiadomienia: okno wynika wprost z adresu (bez kopiowania go do stanu
    // w efekcie), a zamknięcie czyści adres, żeby odświeżenie nie otwierało go ponownie.
    const linkLength = searchParams.get('raport');
    const fromLink = isLength(linkLength) ? { length: linkLength, from: searchParams.get('od') } : null;
    const open = manual ?? fromLink;

    const close = () => {
        setManual(null);
        if (fromLink) {
            const next = new URLSearchParams(searchParams);
            next.delete('raport');
            next.delete('od');
            setSearchParams(next, { replace: true });
        }
    };

    return (
        <>
            <Button variant="onDark" onClick={() => setManual({ length: 'WEEK', from: null })}>
                <FileText aria-hidden="true" />
                Raport PDF
            </Button>
            {open && (
                <ReportDialog
                    key={`${open.length}-${open.from ?? ''}`}
                    initialLength={open.length}
                    initialFrom={open.from}
                    onClose={close}
                />
            )}
        </>
    );
}

interface DialogProps {
    initialLength: ReportLength;
    initialFrom: string | null;
    onClose: () => void;
}

export function ReportDialog({ initialLength, initialFrom, onClose }: DialogProps) {
    const navigate = useNavigate();
    const [length, setLength] = useState<ReportLength>(initialLength);
    const [pickedFrom, setPickedFrom] = useState<string | null>(initialFrom);
    const [comparison, setComparison] = useState<ReportComparison>('PREVIOUS');
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const periods = useQuery({
        queryKey: ['owner-report', 'periods', length],
        queryFn: () => ownerReportApi.listPeriods(length),
        staleTime: 5 * 60_000,
    });

    // Okres spoza listy (np. stary link z powiadomienia) - bierzemy najnowszy.
    const period = periods.data?.find(p => p.from === pickedFrom) ?? periods.data?.[0] ?? null;

    const changeLength = (next: ReportLength) => {
        setLength(next);
        setPickedFrom(null);
        setError(null);
    };

    const download = async () => {
        if (!period) return;
        setDownloading(true);
        setError(null);
        try {
            const blob = await ownerReportApi.downloadPdf(length, period.from, comparison);
            saveBlobAsFile(blob, reportFileName(length, period));
            onClose();
        } catch (e) {
            setError((await readBlobErrorMessage(e)) ?? 'Nie udało się przygotować raportu. Spróbuj ponownie.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Raport PDF</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Fields>
                    <Field>
                        <Label id="report-length">Okres</Label>
                        <Segmented label="Długość okresu" block options={LENGTH_OPTIONS} value={length} onChange={changeLength} />
                        <Select
                            aria-label="Który okres"
                            value={period?.from ?? ''}
                            onChange={e => setPickedFrom(e.target.value)}
                            disabled={!periods.data}
                        >
                            {periods.data?.map(p => (
                                <option key={p.from} value={p.from}>{p.label}</option>
                            ))}
                        </Select>
                    </Field>
                    <Field>
                        <Label>Porównanie z</Label>
                        <Segmented
                            label="Porównanie z"
                            block
                            options={COMPARISON_OPTIONS}
                            value={comparison}
                            onChange={value => { setComparison(value); setError(null); }}
                        />
                    </Field>
                    {periods.isError && <Notice tone="danger">Nie udało się wczytać okresów.</Notice>}
                    {error && <Notice tone="danger" role="alert">{error}</Notice>}
                </Fields>
            </ModalContent>
            <ModalFooter>
                <Button
                    variant="ghost"
                    onClick={() => { onClose(); navigate(NOTIFICATION_SETTINGS); }}
                >
                    <Bell aria-hidden="true" />
                    Powiadomienie o nowym raporcie
                </Button>
                <Button variant="primary" onClick={download} disabled={!period || downloading}>
                    <Download aria-hidden="true" />
                    {downloading ? 'Przygotowuję…' : 'Pobierz PDF'}
                </Button>
            </ModalFooter>
        </ModalShell>
    );
}

const Fields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Label = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
`;

const Select = styled.select`
    height: 38px;
    padding: 0 12px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    background: ${ui.surface};
    font-family: inherit;
    font-size: 14px;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;
