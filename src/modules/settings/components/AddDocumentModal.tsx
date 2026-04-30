import React, { useState } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { Button, ButtonGroup } from '@/common/components/Button';
import { ErrorMessage } from '@/common/components/Form';
import {
    useCreateProtocolTemplate,
    useDeleteProtocolTemplate,
    useCreateProtocolRule,
} from '@/modules/protocols/api/useProtocols';
import type { ProtocolStage } from '@/modules/protocols/types';

// ─── Styled components ───────────────────────────────────────────────────────

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const Label = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: #334155;
`;

const Input = styled.input`
    height: 38px;
    border-radius: 9px;
    border: 1.5px solid #e2e8f0;
    padding: 0 12px;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
    outline: none;
    transition: all 180ms;
    width: 100%;

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14);
    }

    &::placeholder { color: #94a3b8; }
`;

const Textarea = styled.textarea`
    min-height: 72px;
    padding: 10px 12px;
    border-radius: 9px;
    border: 1.5px solid #e2e8f0;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.55;
    color: #0f172a;
    resize: vertical;
    outline: none;
    transition: all 180ms;
    width: 100%;

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14);
    }

    &::placeholder { color: #94a3b8; }
`;

const HiddenInput = styled.input`
    display: none;
`;

const UploadArea = styled.div<{ $hasFile: boolean }>`
    border: 2px dashed ${props => props.$hasFile ? '#0ea5e9' : '#cbd5e1'};
    border-radius: 10px;
    padding: 24px 16px;
    text-align: center;
    background: ${props => props.$hasFile ? 'rgba(14,165,233,0.04)' : '#f8fafc'};
    cursor: pointer;
    transition: all 180ms;

    &:hover {
        border-color: #0ea5e9;
        background: rgba(14, 165, 233, 0.04);
    }
`;

const UploadIconWrap = styled.div`
    width: 48px;
    height: 48px;
    margin: 0 auto 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(14, 165, 233, 0.12);
    color: #0284c7;

    svg { width: 24px; height: 24px; }
`;

const UploadTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 4px;
`;

const UploadHint = styled.div`
    font-size: 12px;
    color: #94a3b8;
`;

const FilePreview = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
`;

const FileIconWrap = styled.div`
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
    flex-shrink: 0;
    svg { width: 20px; height: 20px; }
`;

const FileInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const FileName = styled.div`
    font-size: 13px;
    font-weight: 500;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const FileSize = styled.div`
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
`;

const RemoveBtn = styled.button`
    padding: 6px;
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 6px;
    transition: all 150ms;
    display: flex;
    align-items: center;

    &:hover { background: rgba(220, 38, 38, 0.08); color: #dc2626; }
    svg { width: 16px; height: 16px; }
`;

const StageRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
`;

const StageCard = styled.button<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1.5px solid ${props => props.$selected ? '#0ea5e9' : '#e2e8f0'};
    background: ${props => props.$selected ? 'rgba(14,165,233,0.06)' : 'white'};
    cursor: pointer;
    transition: all 180ms;
    text-align: left;
    font-family: inherit;

    &:hover {
        border-color: #0ea5e9;
        background: rgba(14, 165, 233, 0.04);
    }
`;

const StageIconWrap = styled.div<{ $stage: ProtocolStage }>`
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: ${props => props.$stage === 'CHECK_IN'
        ? 'rgba(16,185,129,0.12)'
        : 'rgba(99,102,241,0.12)'};
    color: ${props => props.$stage === 'CHECK_IN' ? '#059669' : '#6366f1'};
    svg { width: 16px; height: 16px; }
`;

const StageText = styled.div`
    flex: 1;
    min-width: 0;
`;

const StageName = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
`;

const StageDesc = styled.div`
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
`;

const MandatoryRow = styled.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: #f8fafc;
    border-radius: 10px;
    cursor: pointer;
`;

const MandatoryText = styled.div``;
const MandatoryLabel = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
`;
const MandatoryDesc = styled.div`
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
`;

const ToggleBtn = styled.button<{ $on: boolean }>`
    position: relative;
    width: 36px;
    height: 20px;
    border-radius: 9999px;
    background: ${props => props.$on ? '#0ea5e9' : '#cbd5e1'};
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 180ms;
    padding: 0;

    &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: ${props => props.$on ? '18px' : '2px'};
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: white;
        box-shadow: 0 1px 2px rgba(0,0,0,0.15);
        transition: left 180ms ease;
    }
`;

// ─── Icons ───────────────────────────────────────────────────────────────────

const UploadCloudIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
);

const FilePdfIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
    </svg>
);

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const ArrowDownIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
    </svg>
);

const ArrowUpIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
    </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ─── Props / component ───────────────────────────────────────────────────────

interface AddDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialStage?: ProtocolStage;
    onSuccess?: () => void;
}

export function AddDocumentModal({ isOpen, onClose, initialStage = 'CHECK_IN', onSuccess }: AddDocumentModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | undefined>();
    const [stage, setStage] = useState<ProtocolStage>(initialStage);
    const [isMandatory, setIsMandatory] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const createTemplate = useCreateProtocolTemplate();
    const deleteTemplate = useDeleteProtocolTemplate();
    const createRule = useCreateProtocolRule();

    const reset = () => {
        setName('');
        setDescription('');
        setFile(undefined);
        setStage(initialStage);
        setIsMandatory(true);
        setErrors({});
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.type !== 'application/pdf') {
            setErrors(prev => ({ ...prev, file: 'Tylko pliki PDF są dozwolone' }));
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, file: 'Plik jest za duży (max 10 MB)' }));
            return;
        }
        setFile(f);
        setErrors(prev => { const { file: _, ...rest } = prev; return rest; });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (!f) return;
        if (f.type !== 'application/pdf') {
            setErrors(prev => ({ ...prev, file: 'Tylko pliki PDF są dozwolone' }));
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, file: 'Plik jest za duży (max 10 MB)' }));
            return;
        }
        setFile(f);
        setErrors(prev => { const { file: _, ...rest } = prev; return rest; });
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!name.trim() || name.trim().length < 3) errs.name = 'Nazwa musi mieć co najmniej 3 znaki';
        if (!file) errs.file = 'Plik PDF szablonu jest wymagany';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        let template: Awaited<ReturnType<typeof createTemplate.mutateAsync>> | undefined;
        try {
            template = await createTemplate.mutateAsync({ data: { name: name.trim(), description: description.trim() || undefined }, file });

            await createRule.mutateAsync({
                protocolTemplateId: template.id,
                triggerType: 'GLOBAL_ALWAYS',
                stage,
                isMandatory,
                displayOrder: 999,
            });

            reset();
            onSuccess?.();
            onClose();
        } catch (err) {
            // Clean up orphaned template if rule creation failed
            if (template && !createRule.isSuccess) {
                try { await deleteTemplate.mutateAsync(template.id); } catch { /* best-effort */ }
            }
            const msg = err instanceof Error ? err.message : 'Wystąpił błąd podczas zapisywania';
            setErrors(prev => ({ ...prev, submit: msg }));
        }
    };

    const isPending = createTemplate.isPending || createRule.isPending;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Dodaj dokument">
            <Form onSubmit={handleSubmit}>
                {/* File upload */}
                <Field>
                    <Label>Plik PDF *</Label>
                    <HiddenInput
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleFileChange}
                    />
                    {file ? (
                        <FilePreview>
                            <FileIconWrap><FilePdfIcon /></FileIconWrap>
                            <FileInfo>
                                <FileName>{file.name}</FileName>
                                <FileSize>{formatSize(file.size)}</FileSize>
                            </FileInfo>
                            <RemoveBtn
                                type="button"
                                onClick={() => { setFile(undefined); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            >
                                <XIcon />
                            </RemoveBtn>
                        </FilePreview>
                    ) : (
                        <UploadArea
                            $hasFile={false}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            <UploadIconWrap><UploadCloudIcon /></UploadIconWrap>
                            <UploadTitle>Kliknij lub przeciągnij plik PDF</UploadTitle>
                            <UploadHint>Maksymalny rozmiar: 10 MB</UploadHint>
                        </UploadArea>
                    )}
                    {errors.file && <ErrorMessage>{errors.file}</ErrorMessage>}
                </Field>

                {/* Name */}
                <Field>
                    <Label>Nazwa dokumentu *</Label>
                    <Input
                        type="text"
                        placeholder="np. Protokół przyjęcia pojazdu"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
                </Field>

                {/* Description */}
                <Field>
                    <Label>Opis <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcjonalnie)</span></Label>
                    <Textarea
                        placeholder="Krótki opis przeznaczenia dokumentu…"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={2}
                    />
                </Field>

                {/* Stage selection */}
                <Field>
                    <Label>Przypisz do etapu *</Label>
                    <StageRow>
                        <StageCard type="button" $selected={stage === 'CHECK_IN'} onClick={() => setStage('CHECK_IN')}>
                            <StageIconWrap $stage="CHECK_IN"><ArrowDownIcon /></StageIconWrap>
                            <StageText>
                                <StageName>Przyjęcie pojazdu</StageName>
                            </StageText>
                        </StageCard>
                        <StageCard type="button" $selected={stage === 'CHECK_OUT'} onClick={() => setStage('CHECK_OUT')}>
                            <StageIconWrap $stage="CHECK_OUT"><ArrowUpIcon /></StageIconWrap>
                            <StageText>
                                <StageName>Wydanie pojazdu</StageName>
                            </StageText>
                        </StageCard>
                    </StageRow>
                </Field>

                {/* Mandatory */}
                <MandatoryRow>
                    <MandatoryText>
                        <MandatoryLabel>Obowiązkowy</MandatoryLabel>
                        <MandatoryDesc>Wizyta nie może być zakończona bez podpisu</MandatoryDesc>
                    </MandatoryText>
                    <ToggleBtn
                        type="button"
                        $on={isMandatory}
                        onClick={() => setIsMandatory(v => !v)}
                        aria-checked={isMandatory}
                        role="switch"
                    />
                </MandatoryRow>

                {errors.submit && <ErrorMessage>{errors.submit}</ErrorMessage>}

                <ButtonGroup>
                    <Button type="button" $variant="secondary" onClick={handleClose}>Anuluj</Button>
                    <Button type="submit" $variant="primary" disabled={isPending}>
                        {isPending ? 'Zapisywanie…' : 'Dodaj dokument'}
                    </Button>
                </ButtonGroup>
            </Form>
        </Modal>
    );
}
