// src/common/components/ui/FileDrop.tsx
//
// Pole wyboru pliku: strefa „kliknij albo upuść", a po wyborze - wiersz pliku
// z nazwą, rozmiarem i przyciskiem „Usuń plik".
//
// Dwa okna pojazdu (dokument, zdjęcie) miały każde swoją strefę i każde inną:
// jedna z wypełnionym gradientem kołem ikony, druga z przerywaną ramką w barwie
// marki i dopiskiem „Wybrano: …" pod spodem. Wypełnione koło stało w oknie obok
// wypełnionego „Dodaj dokument" - dwa wypełnienia w jednym oknie (CLAUDE.md §2),
// a to, co należy kliknąć, było mniej wyraźne niż ikona. Tu ikona leży na
// kafelku w odcieniu marki, a wypełniony zostaje tylko przycisk w stopce.
//
// Zdjęcie dostaje miniaturę zamiast ikony pliku - przed wysłaniem widać, czy to
// właściwe ujęcie.

import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import styled, { css } from 'styled-components';
import { FileText, Upload, X } from 'lucide-react';
import { IconButton } from './IconButton';
import { ui } from './tokens';

const Zone = styled.button<{ $dragging: boolean }>`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 26px 16px;
    border: 1.5px dashed ${ui.lineStrong};
    border-radius: 14px;
    background: ${ui.surfaceSoft};
    font-family: inherit;
    text-align: center;
    cursor: pointer;
    transition: border-color 150ms ease, background 150ms ease;

    &:hover, &:focus-visible { border-color: ${ui.brand}; background: ${ui.brandTint}; outline: none; }
    &:focus-visible { box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18); }
    &:disabled { cursor: not-allowed; opacity: 0.6; }

    ${p => p.$dragging && css`border-color: ${ui.brand}; background: ${ui.brandTintHover};`}
`;

const IconTile = styled.span`
    width: 44px;
    height: 44px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    border: 1px solid ${ui.brandLineSoft};
    background: ${ui.brandTintHover};
    color: ${ui.brandInk};

    svg { width: 20px; height: 20px; }
`;

const ZoneTitle = styled.span`
    font-size: 14.5px;
    font-weight: 600;
    color: ${ui.ink};
`;

const ZoneHint = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const Picked = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 10px 10px 12px;
    border: 1px solid ${ui.line};
    border-radius: 12px;
    background: ${ui.surface};
    min-width: 0;
`;

const Thumb = styled.span`
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    overflow: hidden;
    background: ${ui.brandTintHover};
    color: ${ui.brandInk};

    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    svg { width: 20px; height: 20px; }
`;

const PickedText = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;

    strong { font-size: 14px; font-weight: 600; color: ${ui.ink}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    span { font-size: 12.5px; color: ${ui.textMuted}; }
`;

const Hidden = styled.input`
    display: none;
`;

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
};

interface FileDropProps {
    file: File | null;
    onChange: (file: File | null) => void;
    accept?: string;
    /** „Obsługiwane: PDF, DOCX, JPG, PNG, do 10 MB". */
    hint?: string;
    /** „Wybierz plik albo upuść go tutaj" - domyślnie tak. */
    title?: string;
    disabled?: boolean;
    /** Miniatura wybranego obrazu zamiast ikony pliku. */
    preview?: boolean;
}

export function FileDrop({ file, onChange, accept, hint, title = 'Wybierz plik albo upuść go tutaj', disabled, preview }: FileDropProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const hintId = useId();
    const [dragging, setDragging] = useState(false);
    const [read, setRead] = useState<{ file: File; url: string } | null>(null);

    // Miniatura jest przypięta do pliku, z którego powstała: po zmianie wyboru stara
    // nie mignie przy nowej nazwie, zanim czytnik skończy.
    useEffect(() => {
        if (!preview || !file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') setRead({ file, url: reader.result });
        };
        reader.readAsDataURL(file);
        return () => reader.abort();
    }, [file, preview]);
    const thumb = read && read.file === file ? read.url : null;

    const drop = (e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        const dropped = e.dataTransfer.files[0];
        if (dropped) onChange(dropped);
    };

    return (
        <>
            {file ? (
                <Picked>
                    <Thumb aria-hidden="true">{thumb ? <img src={thumb} alt="" /> : <FileText />}</Thumb>
                    <PickedText>
                        <strong title={file.name}>{file.name}</strong>
                        <span>{formatFileSize(file.size)}</span>
                    </PickedText>
                    <IconButton label="Usuń plik" variant="ghost" size="sm" disabled={disabled} onClick={() => onChange(null)}>
                        <X />
                    </IconButton>
                </Picked>
            ) : (
                <Zone
                    type="button"
                    $dragging={dragging}
                    disabled={disabled}
                    aria-describedby={hint ? hintId : undefined}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={drop}
                >
                    <IconTile aria-hidden="true"><Upload /></IconTile>
                    <ZoneTitle>{title}</ZoneTitle>
                    {hint && <ZoneHint id={hintId}>{hint}</ZoneHint>}
                </Zone>
            )}
            <Hidden
                ref={inputRef}
                type="file"
                accept={accept}
                disabled={disabled}
                data-testid="file-drop-input"
                onChange={e => {
                    const picked = e.target.files?.[0];
                    if (picked) onChange(picked);
                    // Ten sam plik wybrany drugi raz po „Usuń plik" musi znów wywołać onChange.
                    e.target.value = '';
                }}
            />
        </>
    );
}
