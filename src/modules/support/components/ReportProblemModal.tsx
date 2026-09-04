import { useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent, type FormEvent } from 'react';
import styled from 'styled-components';
import { Paperclip, X, ImagePlus, FileText } from 'lucide-react';
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
import { FormField, FieldLabel, InputShellTextArea, BareTextArea, FormAlertBanner } from '@/common/components/Form';
import { useToast } from '@/common/components/Toast/ToastContainer';
import { reportProblemApi } from '../api/reportProblemApi';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
const ACCEPT_ATTR = '.png,.jpg,.jpeg,.webp,.pdf';

const DropZone = styled.div<{ $isDragging?: boolean }>`
    border: 1.5px dashed ${p => p.$isDragging ? 'var(--brand-primary)' : '#e2e8f0'};
    border-radius: 10px;
    padding: 16px;
    text-align: center;
    background: ${p => p.$isDragging ? '#f0f9ff' : '#f8fafc'};
    transition: all 0.15s ease;
    cursor: pointer;

    &:hover { border-color: var(--brand-primary); background: #f0f9ff; }
`;

const DropText = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
`;

const DropHint = styled.p`
    margin: 4px 0 0;
    font-size: 12px;
    color: #64748b;
`;

const HiddenFileInput = styled.input`
    display: none;
`;

const FileList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
`;

const FileRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
`;

const FileRowIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
    flex-shrink: 0;
`;

const FileRowName = styled.div`
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const FileRowSize = styled.span`
    font-size: 12px;
    color: #94a3b8;
    flex-shrink: 0;
`;

const RemoveBtn = styled.button`
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 6px;
    background: #fee2e2;
    color: #991b1b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s ease;

    &:hover { background: #fecaca; }
`;

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface ReportProblemModalProps {
    onClose: () => void;
}

export const ReportProblemModal = ({ onClose }: ReportProblemModalProps) => {
    const { showSuccess } = useToast();
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addFiles = (incoming: File[]) => {
        setError(null);
        const accepted: File[] = [];
        for (const file of incoming) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                setError(`Nieobsługiwany typ pliku: ${file.name}. Dozwolone: PNG, JPG, WEBP, PDF.`);
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                setError(`Plik "${file.name}" przekracza dozwolony rozmiar (maks. 10 MB).`);
                continue;
            }
            accepted.push(file);
        }
        setFiles(prev => {
            const merged = [...prev, ...accepted];
            if (merged.length > MAX_FILES) {
                setError(`Można załączyć maksymalnie ${MAX_FILES} plików.`);
                return merged.slice(0, MAX_FILES);
            }
            return merged;
        });
    };

    const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) addFiles(Array.from(e.target.files));
        e.target.value = '';
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(Array.from(e.dataTransfer.files));
    };

    const handlePaste = (e: ClipboardEvent) => {
        const pastedFiles = Array.from(e.clipboardData.items)
            .filter(item => item.kind === 'file')
            .map(item => item.getAsFile())
            .filter((file): file is File => file !== null);
        if (pastedFiles.length > 0) addFiles(pastedFiles);
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const trimmed = description.trim();
        if (!trimmed) {
            setError('Opisz zaobserwowany problem.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await reportProblemApi.submit(trimmed, files);
            showSuccess('Zgłoszenie wysłane', 'Dziękujemy - zespół wsparcia otrzymał zgłoszenie.');
            onClose();
        } catch {
            setError('Nie udało się wysłać zgłoszenia. Spróbuj ponownie.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zgłoś problem</ModalTitle>
                    <ModalSubtitle>Opisz sytuację - możesz dołączyć zrzut ekranu</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {error && <FormAlertBanner style={{ marginBottom: 14 }}>{error}</FormAlertBanner>}

                <form id="report-problem-form" onSubmit={handleSubmit} onPaste={handlePaste}>
                    <FormField $fullWidth>
                        <FieldLabel htmlFor="report-problem-description">Opis problemu</FieldLabel>
                        <InputShellTextArea>
                            <BareTextArea
                                id="report-problem-description"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Co się stało? Jak to odtworzyć? (zrzut ekranu możesz wkleić Ctrl+V)"
                                maxLength={5000}
                                autoFocus
                            />
                        </InputShellTextArea>
                    </FormField>

                    <div style={{ marginTop: 14 }}>
                        <FieldLabel>Załączniki (opcjonalnie)</FieldLabel>
                        <div style={{ marginTop: 6 }}>
                            <DropZone
                                $isDragging={isDragging}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                            >
                                <DropText>
                                    <ImagePlus size={16} />
                                    Kliknij, przeciągnij lub wklej zrzut ekranu
                                </DropText>
                                <DropHint>PNG, JPG, WEBP, PDF - maks. 10 MB, do {MAX_FILES} plików</DropHint>
                            </DropZone>
                            <HiddenFileInput
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={ACCEPT_ATTR}
                                onChange={handleFileInputChange}
                            />
                        </div>

                        {files.length > 0 && (
                            <FileList>
                                {files.map((file, index) => (
                                    <FileRow key={`${file.name}-${index}`}>
                                        <FileRowIcon>
                                            {file.type.startsWith('image/') ? <Paperclip size={15} /> : <FileText size={15} />}
                                        </FileRowIcon>
                                        <FileRowName>{file.name}</FileRowName>
                                        <FileRowSize>{formatFileSize(file.size)}</FileRowSize>
                                        <RemoveBtn type="button" onClick={() => removeFile(index)} aria-label="Usuń załącznik">
                                            <X size={14} />
                                        </RemoveBtn>
                                    </FileRow>
                                ))}
                            </FileList>
                        )}
                    </div>
                </form>
            </ModalContent>

            <ModalFooter>
                <SharedButton type="button" $variant="secondary" onClick={onClose}>
                    Anuluj
                </SharedButton>
                <SharedButton
                    type="submit"
                    form="report-problem-form"
                    $variant="primary"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
