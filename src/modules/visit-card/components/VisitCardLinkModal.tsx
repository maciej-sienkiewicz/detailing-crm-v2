// src/modules/visit-card/components/VisitCardLinkModal.tsx
//
// Employee-facing modal: shows the public Visit Card link for a visit so the
// employee can preview what the customer sees, copy the link, or send it
// to the customer over the studio-configured channel (e-mail/SMS).

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { visitCardApi } from '../api/visitCardApi';
import { UpsellSuggestionsManager } from './UpsellSuggestionsManager';

const Description = styled.p`
    margin: 0 0 14px;
    font-size: 13.5px;
    line-height: 1.5;
    color: #64748b;
`;

const LinkRow = styled.div`
    display: flex;
    gap: 8px;
`;

const LinkInput = styled.input`
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 13px;
    color: #0f172a;
    background: #f8fafc;
    font-family: ui-monospace, monospace;
`;

const CopyBtn = styled.button<{ $copied: boolean }>`
    flex-shrink: 0;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid ${p => (p.$copied ? '#10b981' : '#e2e8f0')};
    background: ${p => (p.$copied ? '#d1fae5' : '#fff')};
    color: ${p => (p.$copied ? '#047857' : '#334155')};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 160ms ease;
    white-space: nowrap;

    &:hover { border-color: ${p => (p.$copied ? '#10b981' : '#cbd5e1')}; }
`;

const SendResult = styled.div<{ $success: boolean }>`
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: ${p => (p.$success ? '#047857' : '#b91c1c')};
    background: ${p => (p.$success ? '#d1fae5' : '#fee2e2')};
`;

const ErrorText = styled.div`
    font-size: 13.5px;
    color: #b91c1c;
`;

interface VisitCardLinkModalProps {
    visitId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const VisitCardLinkModal = ({ visitId, isOpen, onClose }: VisitCardLinkModalProps) => {
    const [link, setLink] = useState<string | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setLink(null);
        setLoadError(false);
        setCopied(false);
        setSendResult(null);

        let cancelled = false;
        visitCardApi.getCardLink(visitId)
            .then(res => {
                if (cancelled) return;
                // Build the URL on the current origin so the preview works in every environment
                setLink(`${window.location.origin}${res.path}`);
            })
            .catch(() => { if (!cancelled) setLoadError(true); });
        return () => { cancelled = true; };
    }, [isOpen, visitId]);

    const handleCopy = async () => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
        } catch {
            // Clipboard API unavailable (e.g. non-HTTPS) — fallback via hidden selection
            const input = document.createElement('textarea');
            input.value = link;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSend = async () => {
        setIsSending(true);
        setSendResult(null);
        try {
            const res = await visitCardApi.sendCardLink(visitId);
            setSendResult({ success: res.emailSent || res.smsSent, message: res.message });
        } catch {
            setSendResult({ success: false, message: 'Nie udało się wysłać Karty Wizyty' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Karta Wizyty</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Description>
                    Publiczna strona z informacjami o wizycie dla klienta — szczegóły rezerwacji,
                    pojazd, zakres usług z wyceną, a w trakcie wizyty także zdjęcia i dokumenty.
                    Link nie wymaga logowania.
                </Description>

                {loadError && <ErrorText>Nie udało się pobrać linku Karty Wizyty.</ErrorText>}

                {!loadError && (
                    <LinkRow>
                        <LinkInput
                            readOnly
                            value={link ?? 'Generowanie linku…'}
                            onFocus={e => e.currentTarget.select()}
                        />
                        <CopyBtn $copied={copied} onClick={handleCopy} disabled={!link}>
                            {copied ? 'Skopiowano' : 'Kopiuj'}
                        </CopyBtn>
                    </LinkRow>
                )}

                {sendResult && (
                    <SendResult $success={sendResult.success}>{sendResult.message}</SendResult>
                )}

                <UpsellSuggestionsManager visitId={visitId} active={isOpen} />
            </ModalContent>
            <ModalFooter>
                <SharedButton
                    $variant="secondary"
                    onClick={() => link && window.open(link, '_blank', 'noopener')}
                    disabled={!link}
                >
                    Podgląd klienta
                </SharedButton>
                <SharedButton $variant="primary" onClick={handleSend} disabled={!link || isSending}>
                    {isSending ? 'Wysyłanie…' : 'Wyślij do klienta'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
