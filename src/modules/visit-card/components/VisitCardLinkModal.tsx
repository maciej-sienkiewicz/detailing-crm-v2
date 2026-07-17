// src/modules/visit-card/components/VisitCardLinkModal.tsx
//
// Employee-facing modal: shows the public Visit Card link for a visit or a
// reservation so the employee can preview what the customer sees, copy the
// link, or send it to the customer over an explicitly chosen channel
// (e-mail / SMS). If the card has already been delivered, a clear banner
// says so, to avoid sending the same card twice by accident.

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { visitCardApi, type UpsellTarget } from '../api/visitCardApi';
import type { VisitCardSendChannel } from '../types';
import { UpsellSuggestionsManager } from './UpsellSuggestionsManager';

const formatDateTime = (iso: string): string =>
    new Date(iso).toLocaleString('pl-PL', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

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

/* ── Already-sent banner ── */

const SentBanner = styled.div`
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(5, 150, 105, 0.07);
    border: 1px solid rgba(5, 150, 105, 0.25);

    svg {
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        color: #059669;
        margin-top: 1px;
    }
`;

const SentBannerText = styled.div`
    font-size: 12.5px;
    line-height: 1.5;
    color: #065f46;

    strong { font-weight: 700; }
`;

/* ── Channel picker modal (opens after clicking "Wyślij kartę klientowi") ── */

const ChannelPickerHint = styled.p`
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.5;
    color: #64748b;
`;

const ChannelButtons = styled.div`
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
`;

const ChannelButton = styled.button`
    flex: 1 1 160px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    padding: 14px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    text-align: left;
    transition: all 140ms ease;

    &:hover:not(:disabled) {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.08);
    }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ChannelButtonLabel = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
`;

const ChannelButtonHint = styled.span`
    font-size: 12px;
    color: #64748b;
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
    /** Visit the card belongs to. Provide either visitId or appointmentId. */
    visitId?: string;
    /** Reservation (appointment) the card belongs to — for pre-check-in cards. */
    appointmentId?: string;
    isOpen: boolean;
    onClose: () => void;
}

export const VisitCardLinkModal = ({ visitId, appointmentId, isOpen, onClose }: VisitCardLinkModalProps) => {
    const [link, setLink] = useState<string | null>(null);
    const [lastEmailSentAt, setLastEmailSentAt] = useState<string | null>(null);
    const [lastSmsSentAt, setLastSmsSentAt] = useState<string | null>(null);
    /** Channel choice appears only after the employee clicks "Wyślij kartę klientowi". */
    const [isPickingChannel, setIsPickingChannel] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

    const target: UpsellTarget = visitId
        ? { kind: 'visit', id: visitId }
        : { kind: 'appointment', id: appointmentId ?? '' };

    useEffect(() => {
        if (!isOpen || !target.id) return;
        setLink(null);
        setLastEmailSentAt(null);
        setLastSmsSentAt(null);
        setIsPickingChannel(false);
        setLoadError(false);
        setCopied(false);
        setSendResult(null);

        let cancelled = false;
        const fetchLink = target.kind === 'visit'
            ? visitCardApi.getCardLink(target.id)
            : visitCardApi.getAppointmentCardLink(target.id);
        fetchLink
            .then(res => {
                if (cancelled) return;
                // Build the URL on the current origin so the preview works in every environment
                setLink(`${window.location.origin}${res.path}`);
                setLastEmailSentAt(res.lastEmailSentAt);
                setLastSmsSentAt(res.lastSmsSentAt);
            })
            .catch(() => { if (!cancelled) setLoadError(true); });
        return () => { cancelled = true; };
    }, [isOpen, target.kind, target.id]);

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

    const handleSend = async (channel: VisitCardSendChannel) => {
        setIsSending(true);
        setSendResult(null);
        try {
            const res = target.kind === 'visit'
                ? await visitCardApi.sendCardLink(target.id, channel)
                : await visitCardApi.sendAppointmentCardLink(target.id, channel);
            setSendResult({ success: res.emailSent || res.smsSent, message: res.message });
            const now = new Date().toISOString();
            if (res.emailSent) setLastEmailSentAt(now);
            if (res.smsSent) setLastSmsSentAt(now);
            setIsPickingChannel(false);
        } catch {
            setSendResult({ success: false, message: 'Nie udało się wysłać Karty Wizyty' });
        } finally {
            setIsSending(false);
        }
    };

    const alreadySent = lastEmailSentAt || lastSmsSentAt;

    const sentSummary = [
        lastEmailSentAt && `e-mailem ${formatDateTime(lastEmailSentAt)}`,
        lastSmsSentAt && `SMS-em ${formatDateTime(lastSmsSentAt)}`,
    ].filter(Boolean).join(' oraz ');

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Karta Wizyty</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
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

                {alreadySent && (
                    <SentBanner>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <SentBannerText>
                            <strong>Karta Wizyty została już wysłana</strong> {sentSummary}.
                            Link jest stały — ponowna wysyłka dostarczy tę samą kartę.
                        </SentBannerText>
                    </SentBanner>
                )}

                {sendResult && (
                    <SendResult $success={sendResult.success}>{sendResult.message}</SendResult>
                )}

                <UpsellSuggestionsManager target={target} active={isOpen} />
            </ModalContent>
            <ModalFooter>
                <SharedButton
                    $variant="secondary"
                    onClick={() => link && window.open(link, '_blank', 'noopener')}
                    disabled={!link}
                >
                    Podgląd karty
                </SharedButton>
                <SharedButton
                    $variant="primary"
                    onClick={() => setIsPickingChannel(true)}
                    disabled={!link || isSending || isPickingChannel}
                >
                    {isSending
                        ? 'Wysyłanie…'
                        : alreadySent ? 'Wyślij kartę ponownie' : 'Wyślij kartę klientowi'}
                </SharedButton>
            </ModalFooter>

            {/* Channel choice lives in its own modal, on top of this one. */}
            <ModalShell isOpen={isPickingChannel} onClose={() => setIsPickingChannel(false)} size="sm">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Wyślij Kartę Wizyty</ModalTitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={() => setIsPickingChannel(false)} />
                </ModalHeader>
                <ModalContent>
                    <ChannelPickerHint>Wybierz, jak dostarczyć link klientowi.</ChannelPickerHint>
                    <ChannelButtons>
                        <ChannelButton onClick={() => handleSend('EMAIL')} disabled={isSending}>
                            <ChannelButtonLabel>E-mail</ChannelButtonLabel>
                            <ChannelButtonHint>
                                {lastEmailSentAt
                                    ? `wysłano ${formatDateTime(lastEmailSentAt)}`
                                    : 'link w wiadomości e-mail'}
                            </ChannelButtonHint>
                        </ChannelButton>
                        <ChannelButton onClick={() => handleSend('SMS')} disabled={isSending}>
                            <ChannelButtonLabel>SMS</ChannelButtonLabel>
                            <ChannelButtonHint>
                                {lastSmsSentAt
                                    ? `wysłano ${formatDateTime(lastSmsSentAt)}`
                                    : 'link w wiadomości SMS'}
                            </ChannelButtonHint>
                        </ChannelButton>
                    </ChannelButtons>
                </ModalContent>
                <ModalFooter>
                    <SharedButton
                        $variant="secondary"
                        onClick={() => setIsPickingChannel(false)}
                        disabled={isSending}
                    >
                        Anuluj
                    </SharedButton>
                </ModalFooter>
            </ModalShell>
        </ModalShell>
    );
};
