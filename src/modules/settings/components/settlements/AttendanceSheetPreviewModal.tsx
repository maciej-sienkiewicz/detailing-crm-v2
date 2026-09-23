// src/modules/settings/components/settlements/AttendanceSheetPreviewModal.tsx
//
// Podgląd listy obecności przed zatwierdzeniem. Strony rysuje pdf.js na kanwie, a nie
// <iframe>: przeglądarki na telefonie (Android Chrome) zamiast pokazać PDF w ramce
// pobierają go - a podgląd miał właśnie zastąpić pobieranie.

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { PdfPagesViewer } from '@/modules/public-signing/components/PdfPagesViewer';
import { attendanceApi, readBlobErrorMessage, saveBlobAsFile, type AttendanceSheet } from '../../api/attendanceApi';
import { employeesLabel, isApproved, periodLabel, sheetFileName } from './settlementFormat';

interface Props {
    sheet: AttendanceSheet;
    onClose: () => void;
    /** Przejście do zatwierdzenia prosto z podglądu - tylko dla listy, która na nie czeka. */
    onApprove: () => void;
}

type Pdf = { blob: Blob; bytes: ArrayBuffer };

export function AttendanceSheetPreviewModal({ sheet, onClose, onApprove }: Props) {
    const [pdf, setPdf] = useState<Pdf | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        attendanceApi.downloadAttendanceSheet(sheet.id)
            .then(async blob => {
                const bytes = await blob.arrayBuffer();
                if (!cancelled) setPdf({ blob, bytes });
            })
            .catch(async e => {
                const message = await readBlobErrorMessage(e);
                if (!cancelled) setError(message ?? 'Nie udało się wczytać podglądu. Spróbuj ponownie.');
            });
        return () => { cancelled = true; };
    }, [sheet.id]);

    return (
        <ModalShell isOpen onClose={onClose} size="xl">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Lista obecności · {periodLabel(sheet.period)}</ModalTitle>
                    <ModalSubtitle>
                        {employeesLabel(sheet.employeeCount)}
                        {sheet.signed ? ' · podpisana' : ''}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Sheet>
                    {error
                        ? <Status role="alert">{error}</Status>
                        : pdf
                            ? <PdfPagesViewer data={pdf.bytes} />
                            : <Status>Wczytuję podgląd…</Status>}
                </Sheet>
            </ModalContent>

            <ModalFooter>
                <SharedButton
                    type="button"
                    $variant="secondary"
                    $size="sm"
                    onClick={() => pdf && saveBlobAsFile(pdf.blob, sheetFileName(sheet))}
                    disabled={!pdf}
                >
                    Pobierz PDF
                </SharedButton>
                {!isApproved(sheet) && (
                    <SharedButton type="button" $variant="primary" $size="sm" onClick={onApprove}>
                        Zatwierdź
                    </SharedButton>
                )}
            </ModalFooter>
        </ModalShell>
    );
}

const Sheet = styled.div`
    min-height: 240px;
    padding: 12px;
    border-radius: 12px;
    background: #f1f5f9;
`;

const Status = styled.p`
    margin: 0;
    padding: 80px 16px;
    text-align: center;
    font-size: 13px;
    color: #64748b;
`;
