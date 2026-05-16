import { useState, useRef, ChangeEvent } from 'react';
import styled from 'styled-components';
import { Upload, FileText, X } from 'lucide-react';
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
import {
    FormField,
    FieldLabel,
    InputShell,
    BareInput,
} from '@/common/components/Form';
import { useUploadVehicleDocument } from '../hooks/useVehicleDocuments';
import { t } from '@/common/i18n';

const DropZone = styled.div<{ $isDragging?: boolean; $hasFile?: boolean }>`
    border: 2px dashed ${props =>
        props.$hasFile || props.$isDragging ? 'var(--brand-primary)' : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
    background: ${props =>
        props.$hasFile || props.$isDragging ? '#f0f9ff' : props.theme.colors.surface};
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
        border-color: var(--brand-primary);
        background: #f0f9ff;
    }
`;

const UploadIconWrap = styled.div`
    width: 56px;
    height: 56px;
    margin: 0 auto 12px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
`;

const DropText = styled.p`
    margin: 0 0 4px;
    font-size: 15px;
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const DropHint = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${props => props.theme.colors.textMuted};
`;

const HiddenFileInput = styled.input`
    display: none;
`;

const SelectedFile = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 10px;
    margin-bottom: 16px;
`;

const FileIconWrap = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--brand-primary) 0%, color-mix(in srgb, var(--brand-primary) 80%, black) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
`;

const FileDetails = styled.div`
    flex: 1;
    min-width: 0;
`;

const FileName = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const FileSize = styled.div`
    font-size: 12px;
    color: ${props => props.theme.colors.textMuted};
    margin-top: 2px;
`;

const RemoveBtn = styled.button`
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: #fee2e2;
    color: #991b1b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
    flex-shrink: 0;

    &:hover { background: #fecaca; }
`;

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface UploadVehicleDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicleId: string;
}

export const UploadVehicleDocumentModal = ({ isOpen, onClose, vehicleId }: UploadVehicleDocumentModalProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { uploadDocument, isUploading } = useUploadVehicleDocument({
        vehicleId,
        onSuccess: () => {
            handleReset();
            onClose();
        },
    });

    const handleReset = () => {
        setFile(null);
        setName('');
        setIsDragging(false);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) setFile(selected);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) setFile(dropped);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        uploadDocument({ file, vehicleId, name: name || file.name });
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Dodaj dokument</ModalTitle>
                    <ModalSubtitle>Prześlij plik do dokumentów pojazdu</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <form id="upload-document-form" onSubmit={handleSubmit}>
                    {!file ? (
                        <DropZone
                            $isDragging={isDragging}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            style={{ marginBottom: '16px' }}
                        >
                            <UploadIconWrap>
                                <Upload size={26} />
                            </UploadIconWrap>
                            <DropText>Kliknij lub przeciągnij plik</DropText>
                            <DropHint>Obsługiwane: PDF, DOCX, JPG, PNG (max 10 MB)</DropHint>
                        </DropZone>
                    ) : (
                        <SelectedFile>
                            <FileIconWrap>
                                <FileText size={20} />
                            </FileIconWrap>
                            <FileDetails>
                                <FileName>{file.name}</FileName>
                                <FileSize>{formatFileSize(file.size)}</FileSize>
                            </FileDetails>
                            <RemoveBtn type="button" onClick={() => setFile(null)}>
                                <X size={16} />
                            </RemoveBtn>
                        </SelectedFile>
                    )}

                    <HiddenFileInput
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.xlsx"
                    />

                    <FormField $fullWidth>
                        <FieldLabel htmlFor="doc-name">Nazwa dokumentu</FieldLabel>
                        <InputShell>
                            <BareInput
                                id="doc-name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Nazwa dokumentu (opcjonalnie)"
                                autoComplete="new-password"
                            />
                        </InputShell>
                    </FormField>
                </form>
            </ModalContent>

            <ModalFooter>
                <SharedButton type="button" $variant="secondary" onClick={onClose}>
                    {t.common.cancel}
                </SharedButton>
                <SharedButton
                    type="submit"
                    form="upload-document-form"
                    $variant="primary"
                    disabled={!file || isUploading}
                >
                    {isUploading ? 'Wysyłanie...' : 'Dodaj dokument'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
