// src/modules/employees/components/leave/LeavePdf.tsx
//
// Podgląd PDF wniosku - dokładnie tych bajtów, które się podpisuje (WYSIWYS).
// Rysowany przez pdf.js na kanwach (PdfPagesViewer z podpisu zdalnego): telefon
// w <iframe> PDF-a nie pokaże, tylko go pobierze.

import styled from 'styled-components';
import { Button, Notice, ui } from '@/common/components/ui';
import { PdfPagesViewer } from '@/modules/public-signing/components/PdfPagesViewer';

interface Props {
    bytes: ArrayBuffer | null | undefined;
    isLoading: boolean;
    isError: boolean;
    onRetry: () => void;
    /** Wysokość okna podglądu; dokument przewija się w środku. */
    maxHeight?: string;
}

export function LeavePdf({ bytes, isLoading, isError, onRetry, maxHeight = '46vh' }: Props) {
    if (isError) {
        return (
            <Notice
                tone="danger"
                role="alert"
                title="Nie udało się wczytać dokumentu"
                action={<Button variant="ghost" size="sm" onClick={onRetry}>Spróbuj ponownie</Button>}
            >
                Bez podglądu nie można podpisać wniosku.
            </Notice>
        );
    }
    return (
        <Frame $maxHeight={maxHeight} aria-busy={isLoading || undefined} data-testid="leave-pdf">
            {isLoading || !bytes ? <Loading>Wczytuję dokument…</Loading> : <PdfPagesViewer data={bytes} />}
        </Frame>
    );
}

const Frame = styled.div<{ $maxHeight: string }>`
    max-height: ${p => p.$maxHeight};
    min-height: 120px;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 8px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surfaceAlt};

    canvas { max-width: 100%; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12); }
`;

const Loading = styled.p`
    margin: 0;
    padding: 36px 12px;
    text-align: center;
    font-size: 13px;
    color: ${ui.textMuted};
`;
