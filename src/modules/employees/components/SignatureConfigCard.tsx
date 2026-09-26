// src/modules/employees/components/SignatureConfigCard.tsx
//
// „Twój podpis" w Ustawienia → Dokumenty i podpisy (jedyne miejsce użycia, przez
// MySignatureSection). Podpis pracownika nakładany na protokoły przyjęcia.
//
// Po przebudowie ustawień:
//  - karta leży płasko (Panel) - w kolumnie wyniesiona jest tylko karta dokumentów;
//  - „Dodaj podpis" nie jest już wypełniony: w oknie jest nim tylko „Dodaj dokument"
//    w nagłówku sekcji (CLAUDE.md §2). Wypełnione „Zapisz podpis" pojawia się dopiero
//    w otwartym edytorze - edytor przejmuje okno;
//  - „Usuń podpis" pyta przez ConfirmationModal (wcześniej usuwał od razu);
//  - okno „Wyślij link na telefon" stoi na ModalShell zamiast własnej nakładki bez
//    Escape i bez blokady przewijania (CLAUDE.md §3);
//  - odpytywanie po wysłaniu linku restartowało się przy każdym renderze rodzica
//    (nowa funkcja `onChanged` w zależnościach efektu), więc 5-minutowy limit nigdy
//    nie mijał. Teraz efekt zależy tylko od chwili wysłania linku.

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Check, PenLine, Smartphone, Trash2, X } from 'lucide-react';
import { SignaturePad, type SignaturePadHandle } from '@/modules/public-signing/components/SignaturePad';
import { useToast } from '@/common/components/Toast';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { FormField, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { Button, Notice, Panel, SectionTitle, StatusPill, ui } from '@/common/components/ui';

// ─── Wygląd ───────────────────────────────────────────────────────────────────

const Surface = styled(Panel)`
    padding: 16px 20px 18px;

    @media (max-width: 640px) { padding: 14px 16px 16px; }
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 12px;
`;

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 10px;
`;

const Description = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;

const SignaturePreview = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surfaceSoft};
    overflow: hidden;
`;

const SignatureImage = styled.img`
    max-width: 100%;
    max-height: 140px;
    object-fit: contain;
    padding: 12px;
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const PadSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surfaceSoft};
`;

const PadLabel = styled.p`
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
`;

// ─── Komponent ────────────────────────────────────────────────────────────────

/** Jak długo po wysłaniu linku odpytujemy, czy podpis już przyszedł. */
const LINK_POLL_MS = 5000;
const LINK_POLL_LIMIT_MS = 5 * 60 * 1000;

export interface SignatureConfigCardProps {
    hasSignature: boolean;
    initialPreviewUrl?: string | null;
    onSave: (base64: string) => Promise<void>;
    onDelete: () => Promise<void>;
    onSendLink?: (phoneNumber: string) => Promise<void>;
    onChanged: () => void;
}

export function SignatureConfigCard({
    hasSignature,
    initialPreviewUrl,
    onSave,
    onDelete,
    onSendLink,
    onChanged,
}: SignatureConfigCardProps) {
    const { showSuccess, showError } = useToast();
    const padRef = useRef<SignaturePadHandle>(null);

    const [mode, setMode] = useState<'view' | 'draw'>('view');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [isSendingLink, setIsSendingLink] = useState(false);
    const [linkSentAt, setLinkSentAt] = useState<number | null>(null);
    const [hasStrokes, setHasStrokes] = useState(false);
    // Podgląd to podpisany link z czasem życia. Pamiętamy KTÓRY adres zawiódł, żeby
    // świeży (po ponownym pobraniu) dostał szansę - bez kopiowania propsa do stanu.
    const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');

    const previewUrl = initialPreviewUrl && initialPreviewUrl !== failedPreviewUrl ? initialPreviewUrl : null;

    // Najświeższy `onChanged` bez wpisywania go w zależności efektu odpytywania.
    const onChangedRef = useRef(onChanged);
    useEffect(() => { onChangedRef.current = onChanged; }, [onChanged]);

    useEffect(() => {
        if (linkSentAt === null) return;
        const poll = setInterval(() => onChangedRef.current(), LINK_POLL_MS);
        const stop = setTimeout(() => {
            clearInterval(poll);
            setLinkSentAt(null);
        }, LINK_POLL_LIMIT_MS);
        return () => { clearInterval(poll); clearTimeout(stop); };
    }, [linkSentAt]);

    const handleSave = async () => {
        const base64 = padRef.current?.toPngBase64();
        if (!base64) {
            showError('Podpis jest pusty', 'Narysuj podpis, zanim go zapiszesz.');
            return;
        }
        setIsSaving(true);
        try {
            await onSave(base64);
            showSuccess('Podpis zapisany', 'Pojawi się na kolejnych protokołach przyjęcia.');
            setMode('view');
            padRef.current?.clear();
            setHasStrokes(false);
            onChanged();
        } catch {
            showError('Nie udało się zapisać podpisu', 'Spróbuj ponownie za chwilę.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete();
            showSuccess('Podpis usunięty', 'Nowe protokoły będą bez Twojego podpisu.');
            onChanged();
        } catch {
            showError('Nie udało się usunąć podpisu', 'Spróbuj ponownie za chwilę.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSendLink = async () => {
        if (!onSendLink) return;
        const trimmed = phoneNumber.trim();
        if (!trimmed) return;
        setIsSendingLink(true);
        try {
            await onSendLink(trimmed);
            setShowPhoneModal(false);
            setLinkSentAt(Date.now());
            showSuccess('Link wysłany', 'Otwórz SMS na telefonie i narysuj podpis.');
        } catch {
            showError('Nie udało się wysłać SMS', 'Sprawdź numer telefonu i spróbuj ponownie.');
        } finally {
            setIsSendingLink(false);
        }
    };

    const handleCancel = () => {
        setMode('view');
        padRef.current?.clear();
        setHasStrokes(false);
    };

    return (
        <Surface aria-labelledby="my-signature-title">
            <Head>
                <SectionTitle as="h3" id="my-signature-title">Twój podpis</SectionTitle>
                <StatusPill $tone={hasSignature ? 'ok' : 'neutral'}>
                    {hasSignature ? 'Podpis zapisany' : 'Brak podpisu'}
                </StatusPill>
            </Head>

            <Body>
                <Description>
                    Nakładamy go na protokoły generowane przy przyjęciu pojazdu. Narysuj podpis myszką,
                    palcem albo rysikiem, albo wyślij sobie link i podpisz się na telefonie.
                </Description>

                {mode === 'view' && (
                    <>
                        {hasSignature && (
                            <SignaturePreview>
                                {previewUrl ? (
                                    <SignatureImage
                                        src={previewUrl}
                                        alt="Podgląd podpisu"
                                        onError={() => setFailedPreviewUrl(previewUrl)}
                                    />
                                ) : (
                                    <Description>Nie udało się wczytać podglądu podpisu.</Description>
                                )}
                            </SignaturePreview>
                        )}

                        {linkSentAt !== null && (
                            <Notice tone="info" role="status" title="Link wysłany, czekamy na podpis">
                                Otwórz SMS na telefonie i narysuj podpis. Ta strona odświeży się sama.
                            </Notice>
                        )}

                        <ButtonRow>
                            <Button variant="tinted" size="sm" onClick={() => setMode('draw')}>
                                <PenLine aria-hidden="true" />
                                {hasSignature ? 'Zmień podpis' : 'Dodaj podpis'}
                            </Button>
                            {onSendLink && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setPhoneNumber(''); setShowPhoneModal(true); }}
                                >
                                    <Smartphone aria-hidden="true" />
                                    Wyślij link na telefon
                                </Button>
                            )}
                            {hasSignature && (
                                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} disabled={isDeleting}>
                                    <Trash2 aria-hidden="true" />
                                    {isDeleting ? 'Usuwanie...' : 'Usuń podpis'}
                                </Button>
                            )}
                        </ButtonRow>
                    </>
                )}

                {mode === 'draw' && (
                    <PadSection>
                        <PadLabel>Narysuj podpis</PadLabel>
                        <SignaturePad ref={padRef} onStrokeChange={setHasStrokes} />
                        <ButtonRow>
                            <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving || !hasStrokes}>
                                <Check aria-hidden="true" />
                                {isSaving ? 'Zapisywanie...' : 'Zapisz podpis'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
                                <X aria-hidden="true" />
                                Anuluj
                            </Button>
                        </ButtonRow>
                    </PadSection>
                )}
            </Body>

            <ModalShell isOpen={showPhoneModal} onClose={() => { if (!isSendingLink) setShowPhoneModal(false); }} size="sm">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Wyślij link na telefon</ModalTitle>
                        <ModalSubtitle>Dostaniesz SMS z linkiem do rysowania podpisu.</ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={() => { if (!isSendingLink) setShowPhoneModal(false); }} />
                </ModalHeader>
                <ModalContent>
                    <form
                        id="signature-link-form"
                        onSubmit={e => { e.preventDefault(); void handleSendLink(); }}
                    >
                        <FormField>
                            <FieldLabel htmlFor="signature-link-phone">Numer telefonu</FieldLabel>
                            <InputShell>
                                <BareInput
                                    id="signature-link-phone"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    placeholder="Np. 600 100 200"
                                    value={phoneNumber}
                                    onChange={e => setPhoneNumber(e.target.value)}
                                    autoFocus
                                    disabled={isSendingLink}
                                />
                            </InputShell>
                        </FormField>
                    </form>
                </ModalContent>
                <ModalFooter>
                    <Button onClick={() => setShowPhoneModal(false)} disabled={isSendingLink}>Anuluj</Button>
                    <Button
                        type="submit"
                        form="signature-link-form"
                        variant="primary"
                        disabled={isSendingLink || !phoneNumber.trim()}
                    >
                        {isSendingLink ? 'Wysyłanie...' : 'Wyślij SMS'}
                    </Button>
                </ModalFooter>
            </ModalShell>

            <ConfirmationModal
                isOpen={confirmDelete}
                title="Usunąć Twój podpis?"
                message="Nowe protokoły przyjęcia będą generowane bez Twojego podpisu. Protokoły już wygenerowane zostają bez zmian."
                variant="danger"
                confirmText="Usuń podpis"
                cancelText="Zostaw"
                onConfirm={() => { void handleDelete(); }}
                onCancel={() => setConfirmDelete(false)}
            />
        </Surface>
    );
}
