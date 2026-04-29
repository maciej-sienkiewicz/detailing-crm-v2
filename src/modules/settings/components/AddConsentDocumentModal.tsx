import React, { useState } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { Button, ButtonGroup } from '@/common/components/Button';
import { ErrorMessage } from '@/common/components/Form';
import { consentsApi } from '@/modules/consents/api/consentsApi';
import type { ProtocolStage } from '@/modules/consents/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const STAGE_OPTIONS: { value: ProtocolStage; label: string }[] = [
    { value: 'CHECK_IN', label: 'Przyjęcie pojazdu (CHECK_IN)' },
    { value: 'CHECK_OUT', label: 'Wydanie pojazdu (CHECK_OUT)' },
];

// ─── Styled components ────────────────────────────────────────────────────────

const Wrap = styled.form`
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin-top: 4px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const FieldLabel = styled.label`
    font-size: 13px;
    font-weight: 600;
    color: #334155;
`;

const InputEl = styled.input`
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
    &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.14); }
    &::placeholder { color: #94a3b8; }
`;

const SelectEl = styled.select`
    height: 38px;
    border-radius: 9px;
    border: 1.5px solid #e2e8f0;
    padding: 0 12px;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    background: #fff;
    outline: none;
    cursor: pointer;
    width: 100%;
    &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.14); }
`;

const TextareaEl = styled.textarea`
    min-height: 68px;
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
    &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.14); }
    &::placeholder { color: #94a3b8; }
`;

const HiddenFileInput = styled.input`display: none;`;

const UploadArea = styled.div`
    border: 2px dashed #cbd5e1;
    border-radius: 10px;
    padding: 24px 16px;
    text-align: center;
    background: #f8fafc;
    cursor: pointer;
    transition: all 180ms;
    &:hover { border-color: #0ea5e9; background: rgba(14,165,233,0.04); }
`;

const UploadIconWrap = styled.div`
    width: 44px; height: 44px;
    margin: 0 auto 10px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    background: rgba(14,165,233,0.12);
    color: #0284c7;
    svg { width: 22px; height: 22px; }
`;

const UploadTitle = styled.div`
    font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 3px;
`;

const UploadSubtitle = styled.div`
    font-size: 11px; color: #94a3b8;
`;

const FilePill = styled.div`
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
`;

const FilePillIcon = styled.div`
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 8px;
    background: rgba(220,38,38,0.1);
    color: #dc2626;
    flex-shrink: 0;
    svg { width: 18px; height: 18px; }
`;

const FilePillInfo = styled.div`flex: 1; min-width: 0;`;

const FilePillName = styled.div`
    font-size: 13px; font-weight: 500; color: #0f172a;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const FilePillSize = styled.div`font-size: 11px; color: #64748b; margin-top: 2px;`;

const RemoveFileBtn = styled.button`
    padding: 5px; background: transparent; border: none;
    color: #94a3b8; cursor: pointer; border-radius: 6px;
    display: flex; align-items: center; transition: all 150ms;
    &:hover { background: rgba(220,38,38,0.08); color: #dc2626; }
    svg { width: 15px; height: 15px; }
`;

const ToggleRow = styled.label`
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px;
    background: #f8fafc;
    border-radius: 10px;
    cursor: pointer;
`;

const ToggleText = styled.div``;
const ToggleLabel = styled.div`font-size: 13px; font-weight: 600; color: #0f172a;`;
const ToggleDesc  = styled.div`font-size: 11px; color: #64748b; margin-top: 2px;`;

const ToggleBtn = styled.button<{ $on: boolean }>`
    position: relative; width: 36px; height: 20px; border-radius: 9999px;
    background: ${p => p.$on ? '#0ea5e9' : '#cbd5e1'};
    border: none; cursor: pointer; flex-shrink: 0; transition: background 180ms; padding: 0;
    &::after {
        content: ''; position: absolute;
        top: 2px; left: ${p => p.$on ? '18px' : '2px'};
        width: 16px; height: 16px; border-radius: 50%;
        background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.15);
        transition: left 180ms ease;
    }
`;

const InfoBox = styled.div`
    display: flex; gap: 10px; align-items: flex-start;
    padding: 12px 14px;
    background: rgba(99,102,241,0.06);
    border: 1px solid rgba(99,102,241,0.18);
    border-radius: 10px;
    font-size: 12px; color: #4338ca; line-height: 1.55;
    svg { width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px; }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

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

const InfoIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

// ─── Props / component ────────────────────────────────────────────────────────

interface AddConsentDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AddConsentDocumentModal({ isOpen, onClose, onSuccess }: AddConsentDocumentModalProps) {
    const [file, setFile]               = useState<File | undefined>();
    const [name, setName]               = useState('');
    const [description, setDescription] = useState('');
    const [stage, setStage]             = useState<ProtocolStage>('CHECK_IN');
    const [isMandatory, setIsMandatory] = useState(false);
    const [requiresResign, setRequiresResign] = useState(false);
    const [errors, setErrors]           = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const reset = () => {
        setFile(undefined); setName(''); setDescription('');
        setStage('CHECK_IN'); setIsMandatory(false);
        setRequiresResign(false); setErrors({}); setIsSubmitting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => { reset(); onClose(); };

    const applyFile = (f: File) => {
        if (f.type !== 'application/pdf') {
            setErrors(e => ({ ...e, file: 'Tylko pliki PDF są dozwolone' })); return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setErrors(e => ({ ...e, file: 'Plik jest za duży (max 10 MB)' })); return;
        }
        setFile(f);
        setErrors(e => { const { file: _, ...rest } = e; return rest; });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const errs: Record<string, string> = {};
        if (!file) errs.file = 'Plik PDF jest wymagany';
        if (!name.trim() || name.trim().length < 3) errs.name = 'Nazwa musi mieć co najmniej 3 znaki';
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setIsSubmitting(true);
        setErrors({});

        try {
            // 1. Utwórz definicję zgody (slug generowany automatycznie z nazwy)
            const definition = await consentsApi.createConsentDefinition({
                name: name.trim(),
                description: description.trim() || undefined,
                stage,
                isMandatory,
            });

            // 2. Dodaj pierwszą wersję PDF (presigned URL w odpowiedzi)
            const versionResp = await consentsApi.addConsentVersion(definition.id, {
                requiresResign,
                setAsActive: true,
            });

            // 3. Wyślij plik do S3
            if (versionResp.pdfUrl) {
                await consentsApi.uploadFileToS3(versionResp.pdfUrl, file!);
            }

            reset();
            onSuccess?.();
            onClose();
        } catch (err) {
            setErrors({ submit: err instanceof Error ? err.message : 'Wystąpił błąd podczas zapisywania' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Dodaj zgodę marketingową">
            <Wrap onSubmit={handleSubmit}>
                <InfoBox>
                    <InfoIcon />
                    <div>
                        Zgoda jest zbierana <strong>jednorazowo</strong> per klient przy przyjęciu pojazdu
                        i pamiętana między wizytami. Przy kolejnych wizytach nie jest wyświetlana ponownie,
                        jeśli klient już podpisał aktywną wersję.
                    </div>
                </InfoBox>

                {/* PDF */}
                <Field>
                    <FieldLabel>Plik PDF *</FieldLabel>
                    <HiddenFileInput
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={e => { const f = e.target.files?.[0]; if (f) applyFile(f); }}
                    />
                    {file ? (
                        <FilePill>
                            <FilePillIcon><FilePdfIcon /></FilePillIcon>
                            <FilePillInfo>
                                <FilePillName>{file.name}</FilePillName>
                                <FilePillSize>{formatSize(file.size)}</FilePillSize>
                            </FilePillInfo>
                            <RemoveFileBtn type="button" onClick={() => {
                                setFile(undefined);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}>
                                <XIcon />
                            </RemoveFileBtn>
                        </FilePill>
                    ) : (
                        <UploadArea
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) applyFile(f); }}
                        >
                            <UploadIconWrap><UploadCloudIcon /></UploadIconWrap>
                            <UploadTitle>Kliknij lub przeciągnij plik PDF</UploadTitle>
                            <UploadSubtitle>Maksymalny rozmiar: 10 MB</UploadSubtitle>
                        </UploadArea>
                    )}
                    {errors.file && <ErrorMessage>{errors.file}</ErrorMessage>}
                </Field>

                {/* Name */}
                <Field>
                    <FieldLabel>Nazwa dokumentu *</FieldLabel>
                    <InputEl
                        type="text"
                        placeholder="np. Zgoda na treści marketingowe"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    {errors.name && <ErrorMessage>{errors.name}</ErrorMessage>}
                </Field>

                {/* Stage */}
                <Field>
                    <FieldLabel>Etap wizyty *</FieldLabel>
                    <SelectEl
                        value={stage}
                        onChange={e => setStage(e.target.value as ProtocolStage)}
                    >
                        {STAGE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </SelectEl>
                </Field>

                {/* Description */}
                <Field>
                    <FieldLabel>Opis <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcjonalnie)</span></FieldLabel>
                    <TextareaEl
                        placeholder="Krótki opis zakresu zgody…"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={2}
                    />
                </Field>

                {/* isMandatory */}
                <ToggleRow>
                    <ToggleText>
                        <ToggleLabel>Obowiązkowa</ToggleLabel>
                        <ToggleDesc>Klient musi podpisać tę zgodę, aby kontynuować</ToggleDesc>
                    </ToggleText>
                    <ToggleBtn
                        type="button" $on={isMandatory}
                        onClick={() => setIsMandatory(v => !v)}
                        role="switch" aria-checked={isMandatory}
                    />
                </ToggleRow>

                {/* requiresResign */}
                <ToggleRow>
                    <ToggleText>
                        <ToggleLabel>Wymaga ponownego podpisu</ToggleLabel>
                        <ToggleDesc>Klienci, którzy już podpisali starszą wersję, muszą podpisać ponownie</ToggleDesc>
                    </ToggleText>
                    <ToggleBtn
                        type="button" $on={requiresResign}
                        onClick={() => setRequiresResign(v => !v)}
                        role="switch" aria-checked={requiresResign}
                    />
                </ToggleRow>

                {errors.submit && <ErrorMessage>{errors.submit}</ErrorMessage>}

                <ButtonGroup>
                    <Button type="button" $variant="secondary" onClick={handleClose}>Anuluj</Button>
                    <Button type="submit" $variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Tworzenie…' : 'Utwórz zgodę'}
                    </Button>
                </ButtonGroup>
            </Wrap>
        </Modal>
    );
}
