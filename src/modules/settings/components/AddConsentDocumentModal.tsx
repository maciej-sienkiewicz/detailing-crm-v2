import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { Button, ButtonGroup } from '@/common/components/Button';
import { ErrorMessage } from '@/common/components/Form';
import { useCreateProtocolTemplate, useDeleteProtocolTemplate, useCreateProtocolRule } from '@/modules/protocols/api/useProtocols';
import { consentsApi } from '@/modules/consents/api/consentsApi';
import type { ProtocolStage } from '@/modules/protocols/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toSlug = (text: string) =>
    text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);

const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// ─── Shared layout atoms ─────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
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

const Hint = styled.div`
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
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

const SlugInput = styled(InputEl)`
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 12px;
    letter-spacing: -0.3px;
    color: #0284c7;
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

const HiddenFileInput = styled.input`
    display: none;
`;

const UploadArea = styled.div<{ $hasFile: boolean }>`
    border: 2px dashed ${p => p.$hasFile ? '#0ea5e9' : '#cbd5e1'};
    border-radius: 10px;
    padding: 24px 16px;
    text-align: center;
    background: ${p => p.$hasFile ? 'rgba(14,165,233,0.04)' : '#f8fafc'};
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

const FilePillInfo = styled.div`
    flex: 1; min-width: 0;
`;

const FilePillName = styled.div`
    font-size: 13px; font-weight: 500; color: #0f172a;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const FilePillSize = styled.div`
    font-size: 11px; color: #64748b; margin-top: 2px;
`;

const RemoveFileBtn = styled.button`
    padding: 5px; background: transparent; border: none;
    color: #94a3b8; cursor: pointer; border-radius: 6px;
    display: flex; align-items: center;
    transition: all 150ms;
    &:hover { background: rgba(220,38,38,0.08); color: #dc2626; }
    svg { width: 15px; height: 15px; }
`;

const StageRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
`;

const StageCard = styled.button<{ $selected: boolean }>`
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1.5px solid ${p => p.$selected ? '#0ea5e9' : '#e2e8f0'};
    background: ${p => p.$selected ? 'rgba(14,165,233,0.06)' : 'white'};
    cursor: pointer; transition: all 180ms; text-align: left; font-family: inherit;
    &:hover { border-color: #0ea5e9; background: rgba(14,165,233,0.04); }
`;

const StageIconWrap = styled.div<{ $stage: ProtocolStage }>`
    width: 30px; height: 30px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    background: ${p => p.$stage === 'CHECK_IN' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)'};
    color: ${p => p.$stage === 'CHECK_IN' ? '#059669' : '#6366f1'};
    svg { width: 15px; height: 15px; }
`;

const StageText = styled.div`
    flex: 1; min-width: 0;
`;

const StageName = styled.div`
    font-size: 13px; font-weight: 600; color: #0f172a;
`;

const StageDesc = styled.div`
    font-size: 11px; color: #64748b; margin-top: 2px;
`;

const ToggleRow = styled.label`
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px;
    background: #f8fafc;
    border-radius: 10px;
    cursor: pointer;
`;

const ToggleText = styled.div``;
const ToggleLabel = styled.div`
    font-size: 13px; font-weight: 600; color: #0f172a;
`;
const ToggleDesc = styled.div`
    font-size: 11px; color: #64748b; margin-top: 2px;
`;

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

const StepIndicator = styled.div`
    display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
`;

const StepDot = styled.div<{ $active: boolean; $done: boolean }>`
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700;
    background: ${p => p.$done ? '#0ea5e9' : p.$active ? '#0f172a' : '#e2e8f0'};
    color: ${p => p.$done || p.$active ? 'white' : '#94a3b8'};
    transition: all 200ms;
    flex-shrink: 0;
`;

const StepLine = styled.div`
    flex: 1; height: 1px; background: #e2e8f0;
`;

const StepName = styled.div`
    font-size: 11px; color: #64748b;
`;

const SectionDivider = styled.div`
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: #94a3b8;
    padding-bottom: 6px; border-bottom: 1px solid #f1f5f9;
`;

const InfoBox = styled.div`
    display: flex; gap: 10px; align-items: flex-start;
    padding: 12px 14px;
    background: rgba(14,165,233,0.06);
    border: 1px solid rgba(14,165,233,0.18);
    border-radius: 10px;
    font-size: 12px; color: #0369a1; line-height: 1.55;
    svg { width: 15px; height: 15px; flex-shrink: 0; margin-top: 1px; }
`;

const NavActions = styled.div`
    display: flex; justify-content: space-between; align-items: center;
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

const InfoIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface AddConsentDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AddConsentDocumentModal({ isOpen, onClose, onSuccess }: AddConsentDocumentModalProps) {
    // Step state
    const [step, setStep] = useState<1 | 2>(1);

    // Step 1 state
    const [file, setFile] = useState<File | undefined>();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Step 2 state — slug auto-derives from name but is editable
    const [slug, setSlug] = useState('');
    const [slugEdited, setSlugEdited] = useState(false);
    const [stage, setStage] = useState<ProtocolStage>('CHECK_IN');
    const [isMandatory, setIsMandatory] = useState(true);
    const [requiresResign, setRequiresResign] = useState(false);

    // Shared error/loading
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const createTemplate = useCreateProtocolTemplate();
    const deleteTemplate = useDeleteProtocolTemplate();
    const createRule = useCreateProtocolRule();

    // Keep slug in sync with name unless user edited it manually
    useEffect(() => {
        if (!slugEdited) {
            setSlug(toSlug(name));
        }
    }, [name, slugEdited]);

    const reset = () => {
        setStep(1);
        setFile(undefined);
        setName(''); setDescription('');
        setSlug(''); setSlugEdited(false);
        setStage('CHECK_IN');
        setIsMandatory(true); setRequiresResign(false);
        setErrors({});
        setIsSubmitting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => { reset(); onClose(); };

    // ── File helpers ──────────────────────────────────────────────────────────

    const applyFile = (f: File) => {
        if (f.type !== 'application/pdf') {
            setErrors(e => ({ ...e, file: 'Tylko pliki PDF są dozwolone' }));
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setErrors(e => ({ ...e, file: 'Plik jest za duży (max 10 MB)' }));
            return;
        }
        setFile(f);
        setErrors(e => { const { file: _, ...rest } = e; return rest; });
    };

    // ── Step 1 submit ─────────────────────────────────────────────────────────

    const handleStep1Next = () => {
        const errs: Record<string, string> = {};
        if (!file) errs.file = 'Plik PDF jest wymagany';
        if (!name.trim() || name.trim().length < 3) errs.name = 'Nazwa musi mieć co najmniej 3 znaki';
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setStep(2);
    };

    // ── Step 2 submit (4 API calls) ───────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const errs: Record<string, string> = {};
        if (!slug || !/^[a-z0-9-]{2,50}$/.test(slug)) {
            errs.slug = 'Identyfikator: 2–50 znaków, tylko litery a–z, cyfry i myślniki';
        }
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setIsSubmitting(true);
        setErrors({});

        let createdTemplateId: string | undefined;

        try {
            // KROK A: stwórz protokół-szablon (PDF formularz per wizyta)
            const protocol = await createTemplate.mutateAsync({
                data: { name: name.trim(), description: description.trim() || undefined },
                file,
            });
            createdTemplateId = protocol.id;

            // KROK B: stwórz definicję zgody
            const definition = await consentsApi.createConsentDefinition({
                slug,
                name: name.trim(),
                description: description.trim() || undefined,
            });

            // KROK C: prześlij wersję dokumentu zgody (ten sam plik)
            const uploadResp = await consentsApi.uploadConsentTemplate({
                definitionId: definition.definitionId,
                requiresResign,
                setAsActive: true,
            });
            await consentsApi.uploadFileToS3(uploadResp.uploadUrl, file!);

            // KROK D: połącz regułą
            await createRule.mutateAsync({
                protocolTemplateId: protocol.id,
                triggerType: 'CUSTOMER_CONSENT_REQUIRED',
                stage,
                consentDefinitionId: definition.definitionId,
                isMandatory,
                displayOrder: 999,
            });

            reset();
            onSuccess?.();
            onClose();
        } catch (err) {
            // Best-effort cleanup: remove orphaned protocol template
            if (createdTemplateId) {
                try { await deleteTemplate.mutateAsync(createdTemplateId); } catch { /* best-effort */ }
            }
            const msg = err instanceof Error ? err.message : 'Wystąpił błąd podczas zapisywania';
            setErrors({ submit: msg });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Dodaj zgodę marketingową">

            {/* Step indicator */}
            <StepIndicator>
                <StepDot $active={step === 1} $done={step > 1}>
                    {step > 1 ? <CheckIcon /> : '1'}
                </StepDot>
                <StepName style={{ color: step === 1 ? '#0f172a' : '#94a3b8', fontWeight: step === 1 ? 600 : 400 }}>Dokument</StepName>
                <StepLine />
                <StepDot $active={step === 2} $done={false}>2</StepDot>
                <StepName style={{ color: step === 2 ? '#0f172a' : '#94a3b8', fontWeight: step === 2 ? 600 : 400 }}>Konfiguracja</StepName>
            </StepIndicator>

            {/* ── STEP 1 ────────────────────────────────────────────────────── */}
            {step === 1 && (
                <Wrap style={{ marginTop: 12 }}>
                    <InfoBox>
                        <InfoIcon />
                        <div>
                            Zgoda marketingowa jest zbierana <strong>jednorazowo</strong> per klient i pamiętana
                            między wizytami. Przy kolejnej wizycie system nie wyświetli jej ponownie, jeśli klient
                            już podpisał aktywną wersję.
                        </div>
                    </InfoBox>

                    {/* File */}
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
                                <RemoveFileBtn
                                    type="button"
                                    onClick={() => { setFile(undefined); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                >
                                    <XIcon />
                                </RemoveFileBtn>
                            </FilePill>
                        ) : (
                            <UploadArea
                                $hasFile={false}
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

                    <ButtonGroup style={{ justifyContent: 'flex-end' }}>
                        <Button type="button" $variant="secondary" onClick={handleClose}>Anuluj</Button>
                        <Button type="button" $variant="primary" onClick={handleStep1Next}>
                            Dalej →
                        </Button>
                    </ButtonGroup>
                </Wrap>
            )}

            {/* ── STEP 2 ────────────────────────────────────────────────────── */}
            {step === 2 && (
                <form onSubmit={handleSubmit}>
                    <Wrap style={{ marginTop: 12 }}>
                        <SectionDivider>Identyfikator</SectionDivider>

                        <Field>
                            <FieldLabel>Slug zgody *</FieldLabel>
                            <SlugInput
                                type="text"
                                value={slug}
                                onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSlugEdited(true); }}
                                placeholder="np. marketing"
                                spellCheck={false}
                            />
                            <Hint>
                                Unikalny identyfikator używany przez system, np. <code style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>marketing</code>.
                                Tylko małe litery, cyfry i myślniki.
                            </Hint>
                            {errors.slug && <ErrorMessage>{errors.slug}</ErrorMessage>}
                        </Field>

                        <SectionDivider>Etap</SectionDivider>

                        <Field>
                            <FieldLabel>Zbieraj zgodę przy *</FieldLabel>
                            <StageRow>
                                <StageCard type="button" $selected={stage === 'CHECK_IN'} onClick={() => setStage('CHECK_IN')}>
                                    <StageIconWrap $stage="CHECK_IN"><ArrowDownIcon /></StageIconWrap>
                                    <StageText>
                                        <StageName>Przyjęciu pojazdu</StageName>
                                        <StageDesc>Przy check-in</StageDesc>
                                    </StageText>
                                </StageCard>
                                <StageCard type="button" $selected={stage === 'CHECK_OUT'} onClick={() => setStage('CHECK_OUT')}>
                                    <StageIconWrap $stage="CHECK_OUT"><ArrowUpIcon /></StageIconWrap>
                                    <StageText>
                                        <StageName>Wydaniu pojazdu</StageName>
                                        <StageDesc>Przy check-out</StageDesc>
                                    </StageText>
                                </StageCard>
                            </StageRow>
                        </Field>

                        <SectionDivider>Opcje</SectionDivider>

                        <ToggleRow>
                            <ToggleText>
                                <ToggleLabel>Obowiązkowa</ToggleLabel>
                                <ToggleDesc>Wizyta nie może być zakończona bez podpisu zgody</ToggleDesc>
                            </ToggleText>
                            <ToggleBtn
                                type="button" $on={isMandatory}
                                onClick={() => setIsMandatory(v => !v)}
                                role="switch" aria-checked={isMandatory}
                            />
                        </ToggleRow>

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

                        <NavActions>
                            <Button type="button" $variant="secondary" onClick={() => { setErrors({}); setStep(1); }}>
                                ← Wstecz
                            </Button>
                            <Button type="submit" $variant="primary" disabled={isSubmitting}>
                                {isSubmitting ? 'Tworzenie…' : 'Utwórz zgodę'}
                            </Button>
                        </NavActions>
                    </Wrap>
                </form>
            )}
        </Modal>
    );
}
