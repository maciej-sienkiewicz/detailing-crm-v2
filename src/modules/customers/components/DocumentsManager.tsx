// src/modules/customers/components/DocumentsManager.tsx
//
// Dokumenty klienta - płaski panel z tym samym wierszem co dokumenty pojazdu
// i wizyty: ikona, nazwa, kiedy i kto, a z prawej „Podgląd" słowem, pobranie
// i usunięcie ikoną.
//
// Wcześniej dokumenty były kartami w siatce 3×3 ukrytymi w zwijanym bloku,
// z numerowanym stronicowaniem, wyszukiwarką widoczną już przy jednym pliku
// i wypełnionym przyciskiem „Dodaj dokument" - drugim wypełnieniem w oknie obok
// „Nowa wizyta" (CLAUDE.md §2). Usunięcie pytało systemowym `confirm`.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Download, FileImage, FileText, Search, Trash2, Upload } from 'lucide-react';
import { useCustomerDocuments, useDeleteDocument } from '../hooks/useCustomerDocuments';
import { UploadDocumentModal } from './UploadDocumentModal';
import { ImageViewerModal } from './ImageViewerModal';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { usePermissions } from '@/core/permissions';
import { formatDateTime } from '@/common/utils';
import {
    Button, IconButton, Panel, PanelActions, PanelBody, PanelHead, SectionTitle, ui,
} from '@/common/components/ui';
import type { CustomerDocument } from '../types';

/** Od tylu dokumentów pokazujemy wyszukiwarkę; tyle też mieści się przed „Pokaż wszystkie". */
const SEARCH_FROM = 7;
const COLLAPSED = 6;

const Rows = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const Row = styled.li`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    padding: 10px 12px;
    border-radius: ${ui.radiusStrip};
    border: 1px solid ${ui.lineSoft};
    font-size: 13.5px;

    > svg { width: 16px; height: 16px; flex-shrink: 0; color: ${ui.dangerInk}; }
    > svg.image { color: ${ui.brandInk}; }

    @media (max-width: 480px) { flex-wrap: wrap; row-gap: 6px; }
`;

const Text = styled.span`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 10px;
    min-width: 0;
    flex: 1;

    strong { font-weight: 600; color: ${ui.ink}; overflow-wrap: anywhere; }
    span { font-size: 12.5px; color: ${ui.textMuted}; }
`;

const RowActions = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    margin-left: auto;
`;

const SearchBox = styled.label`
    display: flex;
    align-items: center;
    gap: 10px;
    height: 40px;
    margin-bottom: 10px;
    padding: 0 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surfaceSoft};
    color: ${ui.textMuted};

    &:focus-within { border-color: ${ui.focusRing}; background: ${ui.surface}; }
    svg { width: 15px; height: 15px; flex-shrink: 0; }
    input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-family: inherit; font-size: 16px; color: ${ui.ink}; }
    @media (min-width: 768px) { input { font-size: 13.5px; } }
`;

const Empty = styled.p`
    margin: 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const isImageFile = (name: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
const isViewable = (name: string) => isImageFile(name) || /\.pdf$/i.test(name);

interface DocumentsManagerProps {
    customerId: string;
    id?: string;
}

export const DocumentsManager = ({ customerId, id }: DocumentsManagerProps) => {
    const { can } = usePermissions();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [toDelete, setToDelete] = useState<CustomerDocument | null>(null);

    const { documents, isLoading, isError, refetch } = useCustomerDocuments(customerId);
    const deleteMutation = useDeleteDocument(customerId);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return documents;
        return documents.filter(d => d.fileName.toLowerCase().includes(q) || d.name.toLowerCase().includes(q));
    }, [documents, query]);

    const shown = expanded || query ? filtered : filtered.slice(0, COLLAPSED);
    const viewable = useMemo(() => documents.filter(d => isViewable(d.fileName)), [documents]);
    const current = viewerIndex !== null ? viewable[viewerIndex] : null;
    // Usuwanie dokumentów było i zostaje za tym samym uprawnieniem co wcześniej w karcie dokumentu.
    const canDelete = can('VISITS_DELETE');

    const open = (doc: CustomerDocument) => {
        const idx = viewable.findIndex(d => d.id === doc.id);
        if (idx !== -1) setViewerIndex(idx);
        else window.open(doc.fileUrl, '_blank');
    };

    return (
        <Panel id={id} aria-labelledby="customer-docs-title">
            <PanelHead>
                <SectionTitle id="customer-docs-title" count={documents.length || undefined}>Dokumenty</SectionTitle>
                <PanelActions>
                    <Button variant="tinted" size="sm" onClick={() => setIsUploadOpen(true)}>
                        <Upload />Dodaj dokument
                    </Button>
                </PanelActions>
            </PanelHead>
            <PanelBody>
                {documents.length >= SEARCH_FROM && (
                    <SearchBox>
                        <Search aria-hidden="true" />
                        <input
                            aria-label="Szukaj dokumentu"
                            placeholder="Szukaj po nazwie pliku"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </SearchBox>
                )}

                {isLoading ? (
                    <Empty>Wczytywanie dokumentów...</Empty>
                ) : isError ? (
                    <Empty>
                        Nie udało się wczytać dokumentów.{' '}
                        <Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>
                    </Empty>
                ) : filtered.length === 0 ? (
                    <Empty>
                        {query
                            ? `Żaden dokument nie pasuje do „${query.trim()}".`
                            : 'Nie ma jeszcze dokumentów. Umowy, oświadczenia i skany od klienta trafią tutaj.'}
                    </Empty>
                ) : (
                    <Rows>
                        {shown.map(doc => (
                            <Row key={doc.id}>
                                {isImageFile(doc.fileName) ? <FileImage className="image" aria-hidden="true" /> : <FileText aria-hidden="true" />}
                                <Text>
                                    <strong>{doc.name || doc.fileName}</strong>
                                    <span>{formatDateTime(doc.uploadedAt)}{doc.uploadedByName ? `, ${doc.uploadedByName}` : ''}</span>
                                </Text>
                                <RowActions>
                                    {isViewable(doc.fileName) && (
                                        <Button variant="ghost" size="sm" onClick={() => open(doc)}>Podgląd</Button>
                                    )}
                                    <IconButton label={`Pobierz ${doc.name || doc.fileName}`} variant="ghost" size="sm" onClick={() => window.open(doc.fileUrl, '_blank')}>
                                        <Download />
                                    </IconButton>
                                    {canDelete && (
                                        <IconButton
                                            label={`Usuń ${doc.name || doc.fileName}`}
                                            variant="danger"
                                            size="sm"
                                            disabled={deleteMutation.isPending}
                                            onClick={() => setToDelete(doc)}
                                        >
                                            <Trash2 />
                                        </IconButton>
                                    )}
                                </RowActions>
                            </Row>
                        ))}
                    </Rows>
                )}

                {!query && filtered.length > COLLAPSED && (
                    <Button variant="ghost" size="sm" style={{ marginTop: 8, marginLeft: -11 }} onClick={() => setExpanded(v => !v)}>
                        {expanded ? 'Pokaż mniej' : `Pokaż wszystkie (${filtered.length})`}
                    </Button>
                )}
            </PanelBody>

            <UploadDocumentModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} customerId={customerId} />

            {current && (
                <ImageViewerModal
                    isOpen
                    onClose={() => setViewerIndex(null)}
                    imageUrl={current.fileUrl}
                    imageName={current.name || current.fileName}
                    isPDF={/\.pdf$/i.test(current.fileName)}
                    hasNext={viewerIndex! < viewable.length - 1}
                    hasPrev={viewerIndex! > 0}
                    onNext={() => setViewerIndex(i => (i ?? 0) + 1)}
                    onPrev={() => setViewerIndex(i => (i ?? 0) - 1)}
                    onDownload={() => window.open(current.fileUrl, '_blank')}
                />
            )}

            <ConfirmationModal
                isOpen={toDelete !== null}
                title="Usunąć dokument?"
                message={toDelete ? `„${toDelete.name || toDelete.fileName}" zniknie z dokumentów klienta. Tej operacji nie można cofnąć.` : ''}
                variant="danger"
                confirmText="Usuń dokument"
                cancelText="Zostaw"
                onConfirm={() => { if (toDelete) deleteMutation.mutate(toDelete.id); setToDelete(null); }}
                onCancel={() => setToDelete(null)}
            />
        </Panel>
    );
};
