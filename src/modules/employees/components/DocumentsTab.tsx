import { useState, useRef, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useDocuments, useUploadDocument, useDeleteDocument } from '../hooks/useDocuments';
import { employeeApi } from '../api/employeeApi';
import type { EmployeeDocument } from '../types';
import {
    Section, TopRow, SectionTitle, EmptyText, Spinner, ErrorMsg,
    TableWrapper, Table, Thead, Th, Tbody, Tr, Td, TdMuted,
    Overlay, ModalBox, ModalTitle, FormActions,
    Field, Label, Input, SaveBtn, CancelBtn, OutlineRedBtn,
} from './shared.styles';

// ─── Extra styled components ──────────────────────────────────────────────────

const UploadBtn = styled.button`
    padding: 7px 16px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:disabled { opacity: 0.6; cursor: not-allowed; }
    &:hover:not(:disabled) { background: #1D4ED8; }
`;

const ActionBtn = styled.button`
    padding: 4px 10px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { border-color: ${st.borderHover}; color: ${st.text}; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DeleteActionBtn = styled(ActionBtn)`
    border-color: ${st.accentRed};
    color: ${st.accentRed};
    &:hover { background: ${st.accentRedDim}; border-color: ${st.accentRed}; color: ${st.accentRed}; }
`;

const ActionsCell = styled(Td)`
    white-space: nowrap;
    display: flex;
    gap: 6px;
    align-items: center;
`;

const UploadFormBox = styled.div`
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const UploadFormTitle = styled.h4`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const UploadFormRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const FileInput = styled.input`
    padding: 6px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    cursor: pointer;
    &:focus { outline: none; border-color: ${st.accentBlue}; }
`;

// ─── Preview modal ────────────────────────────────────────────────────────────

const PreviewModalBox = styled(ModalBox)`
    max-width: 860px;
    width: 90vw;
    max-height: 90vh;
`;

const PreviewFrame = styled.iframe`
    width: 100%;
    height: 70vh;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
`;

const PreviewImg = styled.img`
    width: 100%;
    max-height: 70vh;
    object-fit: contain;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
`;

const PreviewUnsupported = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 16px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCardAlt};
    color: ${st.textMuted};
    font-size: ${st.fontSm};
    text-align: center;
`;

const PreviewLoading = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
`;

const CloseBtn = styled.button`
    background: none;
    border: none;
    font-size: 20px;
    color: ${st.textMuted};
    cursor: pointer;
    padding: 2px 6px;
    border-radius: ${st.radiusSm};
    transition: color ${st.transition};
    &:hover { color: ${st.text}; }
`;

const ModalFileName = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    word-break: break-all;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

const getExtension = (fileName: string) =>
    fileName.split('.').pop()?.toLowerCase() ?? '';

const isImage = (fileName: string) => IMAGE_EXTS.includes(getExtension(fileName));
const isPdf = (fileName: string) => getExtension(fileName) === 'pdf';

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

// ─── Upload form ──────────────────────────────────────────────────────────────

interface UploadFormProps {
    employeeId: string;
    onDone: () => void;
}

const UploadForm = ({ employeeId, onDone }: UploadFormProps) => {
    const uploadMutation = useUploadDocument(employeeId);
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0] ?? null;
        setFile(selected);
        if (selected && !name) {
            setName(selected.name.replace(/\.[^.]+$/, ''));
        }
    };

    const handleSubmit = async () => {
        if (!name.trim()) { setError('Podaj nazwę dokumentu.'); return; }
        if (!file) { setError('Wybierz plik.'); return; }
        setError('');
        try {
            await uploadMutation.mutateAsync({
                payload: {
                    name: name.trim(),
                    fileName: file.name,
                    contentType: file.type || 'application/octet-stream',
                },
                file,
            });
            onDone();
        } catch {
            setError('Wystąpił błąd podczas przesyłania pliku. Spróbuj ponownie.');
        }
    };

    return (
        <UploadFormBox>
            <UploadFormTitle>Dodaj dokument</UploadFormTitle>
            <UploadFormRow>
                <Field>
                    <Label>Nazwa dokumentu</Label>
                    <Input
                        type="text"
                        placeholder="np. Umowa o pracę"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </Field>
                <Field>
                    <Label>Plik</Label>
                    <FileInput
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                    />
                </Field>
            </UploadFormRow>
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <FormActions>
                <CancelBtn onClick={onDone}>Anuluj</CancelBtn>
                <SaveBtn onClick={handleSubmit} disabled={uploadMutation.isPending}>
                    {uploadMutation.isPending ? 'Przesyłanie...' : 'Prześlij'}
                </SaveBtn>
            </FormActions>
        </UploadFormBox>
    );
};

// ─── Preview modal ────────────────────────────────────────────────────────────

interface PreviewModalProps {
    employeeId: string;
    document: EmployeeDocument;
    onClose: () => void;
}

const PreviewModal = ({ employeeId, document, onClose }: PreviewModalProps) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(true);
    const [previewError, setPreviewError] = useState('');

    const fetchPreview = useCallback(async () => {
        try {
            const url = await employeeApi.getDocumentPreviewUrl(employeeId, document.id);
            setPreviewUrl(url);
        } catch {
            setPreviewError('Nie udało się załadować podglądu.');
        } finally {
            setLoadingPreview(false);
        }
    }, [employeeId, document.id]);

    // fetch on mount
    useEffect(() => { fetchPreview(); }, [fetchPreview]);

    const handleDownload = async () => {
        try {
            const url = await employeeApi.getDocumentDownloadUrl(employeeId, document.id);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = document.fileName;
            a.click();
        } catch {
            // silently ignore – user can retry
        }
    };

    const renderPreviewContent = () => {
        if (loadingPreview) return <PreviewLoading>Ładowanie podglądu...</PreviewLoading>;
        if (previewError) return <PreviewUnsupported>{previewError}</PreviewUnsupported>;
        if (!previewUrl) return null;

        if (isImage(document.fileName)) {
            return <PreviewImg src={previewUrl} alt={document.name} />;
        }
        if (isPdf(document.fileName)) {
            return <PreviewFrame src={previewUrl} title={document.name} />;
        }
        return (
            <PreviewUnsupported>
                <span>Podgląd tego formatu nie jest obsługiwany.</span>
                <SaveBtn onClick={handleDownload}>Pobierz plik</SaveBtn>
            </PreviewUnsupported>
        );
    };

    return (
        <Overlay onClick={onClose}>
            <PreviewModalBox onClick={e => e.stopPropagation()}>
                <ModalHeader>
                    <div>
                        <ModalTitle>{document.name}</ModalTitle>
                        <ModalFileName>{document.fileName}</ModalFileName>
                    </div>
                    <CloseBtn onClick={onClose} title="Zamknij">✕</CloseBtn>
                </ModalHeader>
                {renderPreviewContent()}
                {!loadingPreview && !previewError && (isPdf(document.fileName) || isImage(document.fileName)) && (
                    <FormActions>
                        <ActionBtn onClick={handleDownload}>Pobierz</ActionBtn>
                        <CancelBtn onClick={onClose}>Zamknij</CancelBtn>
                    </FormActions>
                )}
            </PreviewModalBox>
        </Overlay>
    );
};

// ─── Delete confirmation modal ────────────────────────────────────────────────

interface DeleteConfirmProps {
    document: EmployeeDocument;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting: boolean;
}

const DeleteConfirm = ({ document, onConfirm, onCancel, isDeleting }: DeleteConfirmProps) => (
    <Overlay onClick={onCancel}>
        <ModalBox onClick={e => e.stopPropagation()}>
            <ModalTitle>Usuń dokument</ModalTitle>
            <p style={{ margin: 0, fontSize: st.fontSm, color: st.textSecondary }}>
                Czy na pewno chcesz usunąć dokument <strong>{document.name}</strong>? Operacja jest nieodwracalna.
            </p>
            <FormActions>
                <CancelBtn onClick={onCancel}>Anuluj</CancelBtn>
                <OutlineRedBtn onClick={onConfirm} disabled={isDeleting}>
                    {isDeleting ? 'Usuwanie...' : 'Usuń'}
                </OutlineRedBtn>
            </FormActions>
        </ModalBox>
    </Overlay>
);

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { employeeId: string; }

export const DocumentsTab = ({ employeeId }: Props) => {
    const { documents, isLoading } = useDocuments(employeeId);
    const deleteMutation = useDeleteDocument(employeeId);

    const [showUploadForm, setShowUploadForm] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<EmployeeDocument | null>(null);
    const [deleteDoc, setDeleteDoc] = useState<EmployeeDocument | null>(null);

    const handleDelete = async () => {
        if (!deleteDoc) return;
        try {
            await deleteMutation.mutateAsync(deleteDoc.id);
            setDeleteDoc(null);
        } catch {
            // error handled by mutation state
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <Section>
            <TopRow>
                <SectionTitle>Dokumenty</SectionTitle>
                {!showUploadForm && (
                    <UploadBtn onClick={() => setShowUploadForm(true)}>+ Dodaj dokument</UploadBtn>
                )}
            </TopRow>

            {showUploadForm && (
                <UploadForm
                    employeeId={employeeId}
                    onDone={() => setShowUploadForm(false)}
                />
            )}

            {documents.length === 0 ? (
                <EmptyText>Brak dokumentów. Kliknij „Dodaj dokument", aby przesłać pierwszy.</EmptyText>
            ) : (
                <TableWrapper>
                    <Table>
                        <Thead>
                            <tr>
                                <Th>Nazwa</Th>
                                <Th>Plik</Th>
                                <Th>Dodano przez</Th>
                                <Th>Data dodania</Th>
                                <Th></Th>
                            </tr>
                        </Thead>
                        <Tbody>
                            {documents.map(doc => (
                                <Tr key={doc.id}>
                                    <Td>{doc.name}</Td>
                                    <TdMuted>{doc.fileName}</TdMuted>
                                    <TdMuted>{doc.uploadedByName}</TdMuted>
                                    <TdMuted>{formatDate(doc.uploadedAt)}</TdMuted>
                                    <ActionsCell>
                                        <ActionBtn onClick={() => setPreviewDoc(doc)}>
                                            Podgląd
                                        </ActionBtn>
                                        <DeleteActionBtn onClick={() => setDeleteDoc(doc)}>
                                            Usuń
                                        </DeleteActionBtn>
                                    </ActionsCell>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </TableWrapper>
            )}

            {previewDoc && (
                <PreviewModal
                    employeeId={employeeId}
                    document={previewDoc}
                    onClose={() => setPreviewDoc(null)}
                />
            )}

            {deleteDoc && (
                <DeleteConfirm
                    document={deleteDoc}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteDoc(null)}
                    isDeleting={deleteMutation.isPending}
                />
            )}
        </Section>
    );
};
