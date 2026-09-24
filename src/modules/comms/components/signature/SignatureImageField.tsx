// src/modules/comms/components/signature/SignatureImageField.tsx
// Zdjęcie albo logo do stopki: wgranie z dysku (z kadrem dla zdjęcia), link do obrazka
// z internetu, logo studia z ustawień firmy.
//
// Wgrany plik od razu idzie na serwer i wraca jako stały, publiczny adres - stopka
// przechowuje wyłącznie adresy, bo obrazek pobiera klient poczty odbiorcy, a nie my.
import { useRef, useState } from 'react';
import styled from 'styled-components';
import { Building2, ImagePlus, Link2, Loader2, Trash2, User } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { apiErrorMessage } from '@/modules/visits/api/apiError';
import { useCopyCompanyLogoToSignature, useUploadSignatureImage } from '../../hooks/useComms';
import type { SignatureImageKind } from '../../types';
import { shrinkLogo, validateSignatureImageFile } from '../../utils/signatureImage';
import { IconButton } from '../shared';
import { PhotoCropDialog } from './PhotoCropDialog';
import { Field, FieldLabel, Help, Input, LinkButton, brandTint } from './designerStyles';

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
`;

const Drop = styled.div<{ $round: boolean; $over: boolean }>`
    position: relative;
    flex-shrink: 0;
    width: 76px;
    height: 76px;
    border-radius: ${p => (p.$round ? '50%' : p.theme.radii.md)};
    border: 1px ${p => (p.$over ? 'solid var(--brand-primary)' : `dashed ${p.theme.colors.border}`)};
    background: ${p => (p.$over ? brandTint(10) : p.theme.colors.surfaceAlt)};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: ${p => p.theme.colors.textMuted};

    img { width: 100%; height: 100%; object-fit: ${p => (p.$round ? 'cover' : 'contain')}; }
    svg { width: 24px; height: 24px; }
    .spin { animation: sig-spin 0.9s linear infinite; }
    @keyframes sig-spin { to { transform: rotate(360deg); } }
`;

const Actions = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
`;

const Buttons = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const UrlRow = styled.div`
    display: flex;
    gap: 6px;
    width: 100%;
`;

interface SignatureImageFieldProps {
    kind: SignatureImageKind;
    label: string;
    help: string;
    value: string | null | undefined;
    onChange: (url: string | null) => void;
    /** Studio ma logo w ustawieniach firmy - pokazujemy skrót „Użyj logo firmy". */
    companyLogoAvailable?: boolean;
}

export function SignatureImageField({ kind, label, help, value, onChange, companyLogoAvailable }: SignatureImageFieldProps) {
    const upload = useUploadSignatureImage();
    const copyCompanyLogo = useCopyCompanyLogoToSignature();
    const { showError } = useToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [cropFile, setCropFile] = useState<File | null>(null);
    const [urlOpen, setUrlOpen] = useState(false);
    const [urlDraft, setUrlDraft] = useState('');
    const [over, setOver] = useState(false);
    const busy = upload.isPending || copyCompanyLogo.isPending;

    const send = (blob: Blob) =>
        upload.mutate(
            { file: blob, kind },
            {
                onSuccess: url => onChange(url),
                onError: error => showError('Nie udało się dodać obrazka', apiErrorMessage(error, 'Spróbuj ponownie za chwilę')),
            }
        );

    const accept = async (file: File | undefined) => {
        if (!file || busy) return;
        const problem = validateSignatureImageFile(file);
        if (problem) {
            showError('Nie można użyć tego pliku', problem);
            return;
        }
        if (kind === 'photo') {
            setCropFile(file);
            return;
        }
        send(await shrinkLogo(file).catch(() => file));
    };

    const applyUrl = () => {
        const trimmed = urlDraft.trim();
        if (!trimmed) return;
        // Tylko https: obrazek z http część skrzynek blokuje, a przeglądarka ostrzega w podglądzie.
        const url = /^https:\/\//i.test(trimmed) ? trimmed : /^[a-z]+:/i.test(trimmed) ? '' : `https://${trimmed}`;
        if (!url) {
            showError('Nieprawidłowy adres', 'Podaj adres obrazka zaczynający się od https://');
            return;
        }
        onChange(url);
        setUrlOpen(false);
        setUrlDraft('');
    };

    const useCompanyLogo = () =>
        copyCompanyLogo.mutate(undefined, {
            onSuccess: url => onChange(url),
            onError: error => showError('Nie udało się użyć logo firmy', apiErrorMessage(error, 'Spróbuj ponownie za chwilę')),
        });

    const Placeholder = kind === 'photo' ? User : Building2;

    return (
        <Field as="div" $wide>
            <FieldLabel>{label}</FieldLabel>
            <Row>
                <Drop
                    $round={kind === 'photo'}
                    $over={over}
                    onDragOver={event => { event.preventDefault(); setOver(true); }}
                    onDragLeave={() => setOver(false)}
                    onDrop={event => {
                        event.preventDefault();
                        setOver(false);
                        void accept(event.dataTransfer.files[0]);
                    }}
                >
                    {busy ? <Loader2 className="spin" /> : value ? <img src={value} alt="" /> : <Placeholder />}
                </Drop>
                <Actions>
                    <Buttons>
                        <IconButton type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
                            <ImagePlus /> {value ? 'Zmień plik' : 'Wgraj z komputera'}
                        </IconButton>
                        {kind === 'logo' && companyLogoAvailable && (
                            <IconButton type="button" onClick={useCompanyLogo} disabled={busy}>
                                <Building2 /> Użyj logo firmy
                            </IconButton>
                        )}
                        {value && (
                            <IconButton type="button" onClick={() => onChange(null)} disabled={busy} aria-label={`Usuń: ${label}`}>
                                <Trash2 />
                            </IconButton>
                        )}
                    </Buttons>
                    <Help>{help}</Help>
                    {!urlOpen && (
                        <LinkButton type="button" onClick={() => setUrlOpen(true)} disabled={busy}>
                            <Link2 size={12} />
                            …lub wklej link do obrazka
                        </LinkButton>
                    )}
                </Actions>
            </Row>
            {urlOpen && (
                <UrlRow>
                    <Input
                        type="url"
                        value={urlDraft}
                        autoFocus
                        placeholder="https://twojastrona.pl/obrazek.png"
                        onChange={event => setUrlDraft(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === 'Enter') { event.preventDefault(); applyUrl(); }
                            if (event.key === 'Escape') setUrlOpen(false);
                        }}
                        aria-label={`Link do obrazka: ${label}`}
                    />
                    <IconButton type="button" onClick={applyUrl}>Użyj</IconButton>
                </UrlRow>
            )}
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={event => {
                    void accept(event.target.files?.[0]);
                    event.target.value = '';
                }}
            />
            {cropFile && (
                <PhotoCropDialog
                    file={cropFile}
                    onCancel={() => setCropFile(null)}
                    onConfirm={blob => {
                        setCropFile(null);
                        send(blob);
                    }}
                />
            )}
        </Field>
    );
}
