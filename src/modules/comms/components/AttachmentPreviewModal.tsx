// src/modules/comms/components/AttachmentPreviewModal.tsx
//
// Podgląd załącznika poczty w CRM-ie, bez pobierania pliku na dysk. Wcześniej PDF
// i zdjęcia otwierały się w nowej karcie - a pozostałe miejsca skrzynki (dymki
// rozmowy, pełny podgląd wiadomości, oś sprawy) pobierały wszystko, więc żeby rzucić
// okiem na zdjęcie rysy od klienta, trzeba było szukać go potem w „Pobranych".
//
// Bezpieczeństwo jest w `messageFormat.ts`: pokazujemy wyłącznie typy z zamkniętej
// listy i każdy własną, bezpieczną drogą - PDF przez pdf.js na kanwie (na telefonie
// <iframe> z PDF-em zamiast pokazać plik pobiera go), obraz przez <img>, tekst jako
// tekst. Nic z cudzej poczty nie dostaje dokumentu w pochodzeniu CRM-a.
//
// Escape zamyka WYŁĄCZNIE ten podgląd. Okno otwiera się nad innymi nakładkami
// (pełny podgląd wiadomości, arkusz sprawy), które słuchają Escape'a na dokumencie
// albo na `window` bez sprawdzania, czy są na wierzchu - jeden klawisz zamykał więc
// podgląd razem z tym, z czego go otwarto. Dlatego klawiaturę łapiemy w fazie
// przechwytywania na `window` (najwcześniej, jak się da) i dalej jej nie puszczamy.

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SUBMODAL_Z_INDEX } from '@/common/styles/sharedModalStyles';
import { Button, IconButton } from '@/common/components/ui';
import { PdfPagesViewer } from '@/modules/public-signing/components/PdfPagesViewer';
import {
    attachmentPreviewKind,
    downloadAttachmentFile,
    fileSizeLabel,
    isPreviewableAttachment,
    previewContentType,
    saveBlobAs,
    type PreviewableFile,
} from '../inbox/messageFormat';

/** Dłuższy tekst się ucina - podgląd ma pokazać, co to za plik, a nie zastąpić edytor. */
const TEXT_PREVIEW_LIMIT = 200_000;

type Loaded =
    | { kind: 'pdf'; blob: Blob; bytes: ArrayBuffer }
    | { kind: 'image'; blob: Blob; url: string }
    | { kind: 'text'; blob: Blob; text: string; truncated: boolean };

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; file: Loaded };

/** Wynik wczytania przypięty do żądania - wynik dla innego pliku albo próby to jeszcze „wczytywanie". */
type Settled = { key: string } & ({ status: 'error' } | { status: 'ready'; file: Loaded });

interface AttachmentPreviewModalProps {
    /** Pliki, między którymi wolno przechodzić strzałkami; niepodglądalne są pomijane. */
    files: PreviewableFile[];
    /** Plik, od którego zaczyna się podgląd. */
    initialId: string;
    load: (id: string) => Promise<Blob>;
    onClose: () => void;
}

async function readFile(file: Pick<PreviewableFile, 'id' | 'fileName' | 'contentType'>, load: (id: string) => Promise<Blob>): Promise<Loaded> {
    const raw = await load(file.id);
    const kind = attachmentPreviewKind(file);
    // Typ bloba ustawiamy sami z listy, nie z odpowiedzi serwera: o tym, jak
    // przeglądarka zinterpretuje bajty, decyduje sprawdzony typ.
    const blob = new Blob([raw], { type: previewContentType(file) ?? 'application/octet-stream' });
    if (kind === 'pdf') return { kind, blob, bytes: await blob.arrayBuffer() };
    if (kind === 'image') return { kind, blob, url: URL.createObjectURL(blob) };
    const text = await blob.text();
    return { kind: 'text', blob, text: text.slice(0, TEXT_PREVIEW_LIMIT), truncated: text.length > TEXT_PREVIEW_LIMIT };
}

const kindLabel = (file: PreviewableFile): string => {
    const kind = attachmentPreviewKind(file);
    if (kind === 'pdf') return 'PDF';
    if (kind === 'text') return 'Tekst';
    return 'Obraz';
};

export function AttachmentPreviewModal({ files, initialId, load, onClose }: AttachmentPreviewModalProps) {
    const titleId = useId();
    const previewable = useMemo(() => files.filter(isPreviewableAttachment), [files]);
    const [index, setIndex] = useState(() => Math.max(0, previewable.findIndex((file) => file.id === initialId)));
    const current = previewable[index] as PreviewableFile | undefined;
    const [attempt, setAttempt] = useState(0);
    const [settled, setSettled] = useState<Settled | null>(null);
    const requestKey = `${current?.id ?? ''}:${attempt}`;
    const state: State = settled && settled.key === requestKey ? settled : { status: 'loading' };

    // Efekt zależy od pól pliku, nie od obiektu: odświeżenie wątku w tle daje nowe
    // obiekty tych samych załączników i nie może wczytywać podglądu od nowa.
    const currentId = current?.id;
    const currentName = current?.fileName ?? '';
    const currentType = current?.contentType ?? '';

    useEffect(() => {
        if (!currentId) return;
        let cancelled = false;
        let objectUrl: string | null = null;
        const key = `${currentId}:${attempt}`;
        readFile({ id: currentId, fileName: currentName, contentType: currentType }, load)
            .then((file) => {
                if (file.kind === 'image') objectUrl = file.url;
                if (cancelled) {
                    if (objectUrl) URL.revokeObjectURL(objectUrl);
                    return;
                }
                setSettled({ key, status: 'ready', file });
            })
            .catch(() => {
                // Komunikat o błędzie sieci pokazuje już przechwytywacz `apiClient`.
                if (!cancelled) setSettled({ key, status: 'error' });
            });
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [currentId, currentName, currentType, load, attempt]);

    const many = previewable.length > 1;
    const step = useCallback(
        (delta: number) => setIndex((value) => (value + delta + previewable.length) % previewable.length),
        [previewable.length]
    );

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopImmediatePropagation();
                onClose();
            } else if (many && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
                event.preventDefault();
                step(event.key === 'ArrowLeft' ? -1 : 1);
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [many, step, onClose]);

    const download = () => {
        if (!current) return;
        if (state.status === 'ready') saveBlobAs(state.file.blob, current.fileName);
        else void downloadAttachmentFile(load, current.id, current.fileName).catch(() => {});
    };

    if (!current) return null;

    return (
        // Escape obsługuje efekt wyżej (faza przechwytywania), nie ModalShell.
        <ModalShell isOpen onClose={onClose} size="full" fillHeight zIndex={SUBMODAL_Z_INDEX} closeOnEscape={false} labelledBy={titleId}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id={titleId}>{current.fileName}</ModalTitle>
                    <Meta>
                        <span>{kindLabel(current)}, {fileSizeLabel(current.sizeBytes)}</span>
                        {many && <span>Plik {index + 1} z {previewable.length}</span>}
                    </Meta>
                </ModalTitleGroup>
                <Actions>
                    {many && (
                        <>
                            <IconButton label="Poprzedni plik" onClick={() => step(-1)}><ChevronLeft size={18} /></IconButton>
                            <IconButton label="Następny plik" onClick={() => step(1)}><ChevronRight size={18} /></IconButton>
                        </>
                    )}
                    <Button variant="outline" onClick={download}>
                        <Download size={16} aria-hidden="true" />
                        <span className="label">Pobierz</span>
                    </Button>
                    <CloseBtn onClick={onClose} />
                </Actions>
            </ModalHeader>

            <Stage>
                {state.status === 'loading' && <Status>Wczytywanie podglądu…</Status>}
                {state.status === 'error' && (
                    <Status role="alert">
                        Nie udało się wczytać pliku.
                        <span className="actions">
                            <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>Spróbuj ponownie</Button>
                        </span>
                    </Status>
                )}
                {state.status === 'ready' && state.file.kind === 'image' && (
                    <ImageFrame>
                        <img src={state.file.url} alt={current.fileName} />
                    </ImageFrame>
                )}
                {state.status === 'ready' && state.file.kind === 'pdf' && (
                    <Pages>
                        <PdfPagesViewer key={current.id} data={state.file.bytes} />
                    </Pages>
                )}
                {state.status === 'ready' && state.file.kind === 'text' && (
                    <Pages>
                        <TextSheet>{state.file.text}</TextSheet>
                        {state.file.truncated && <Status>To tylko początek pliku. Całość zobaczysz po pobraniu.</Status>}
                    </Pages>
                )}
            </Stage>
        </ModalShell>
    );
}

const Meta = styled(ModalSubtitle).attrs({ as: 'div' })`
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
`;

const Actions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    /* Na telefonie nazwa pliku potrzebuje miejsca bardziej niż podpis przycisku. */
    @media (max-width: 640px) {
        .label { display: none; }
    }
`;

const Stage = styled(ModalContent)`
    background: #f1f5f9;
    align-items: center;
`;

const ImageFrame = styled.div`
    flex: 1;
    width: 100%;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08), 0 8px 24px -8px rgba(15, 23, 42, 0.18);
        background: #ffffff;
    }
`;

const Pages = styled.div`
    width: 100%;
    max-width: 900px;
`;

const TextSheet = styled.pre`
    margin: 0;
    padding: 20px 24px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
    color: #0f172a;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
`;

const Status = styled.p`
    margin: auto 0;
    padding: 32px 16px;
    text-align: center;
    font-size: 14px;
    color: #64748b;

    .actions { display: block; margin-top: 12px; }
`;

