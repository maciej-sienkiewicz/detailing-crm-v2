// src/modules/customers/components/CustomerConsentsSection.tsx
//
// Zgody klienta (RODO i marketing) - panel w szynie karty klienta.
//
// Każda zgoda to wiersz: nazwa, plakietka stanu, zdanie o podpisie. Jedyna akcja
// widoczna od razu to „Udziel zgody" przy zgodzie, której brakuje - reszta
// (podgląd dokumentu, dołączenie skanu, wycofanie) siedzi w menu ⋮ wiersza.
//
// Wcześniej zgoda była przełącznikiem, a kliknięcie w niego przy zgodzie
// udzielonej otwierało wycofanie - ten sam gest znaczył „tak" i „nie". Obok stały
// trzy obrysowane przyciski na wiersz, meta sklejona kropką („Podpisano 10.05 ·
// wersja 2") i ostrzeżenie o braku skanu drukiem 10px. Wycofanie pytało własną
// nakładką, pisaną obok ConfirmationModal.

import { useRef, useState, type ChangeEvent } from 'react';
import styled from 'styled-components';
import { FileText, MoreVertical, Paperclip, ShieldOff } from 'lucide-react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { formatDateTime } from '@/common/utils';
import {
    ActionMenu, Button, IconButton, MenuDivider, MenuItem, Panel, SectionTitle, StatusPill, ui, useActionMenu,
    type PillTone,
} from '@/common/components/ui';
import {
    useCustomerConsentsStatus,
    useSignCustomerConsent,
    useRevokeCustomerConsent,
    useUploadConsentAttachment,
} from '../hooks/useCustomerConsents';
import type { CustomerConsentStatusItem } from '../types';

const RailPanel = styled(Panel)`
    padding: 16px 18px;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const List = styled.ul`
    display: flex;
    flex-direction: column;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
`;

const Row = styled.li<{ $muted?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 0;
    border-top: 1px solid ${ui.lineFaint};
    opacity: ${p => p.$muted ? 0.7 : 1};

    &:first-child { border-top: none; padding-top: 0; }
`;

const Text = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
    flex: 1;

    strong { font-size: 13.5px; font-weight: 600; color: ${ui.ink}; overflow-wrap: anywhere; }
`;

const Meta = styled.span`
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const Warn = styled.span`
    font-size: 12.5px;
    color: ${ui.warnInk};
`;

const RowActions = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
`;

const Muted = styled.p`
    margin: 10px 0 0;
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const HiddenInput = styled.input`
    display: none;
`;

const STATUS: Record<string, { label: string; tone: PillTone }> = {
    VALID: { label: 'Aktualna', tone: 'ok' },
    OUTDATED: { label: 'Stara wersja', tone: 'warn' },
    REQUIRED: { label: 'Brak zgody', tone: 'neutral' },
};

const isGranted = (item: CustomerConsentStatusItem) => item.status === 'VALID' || item.status === 'OUTDATED';

function signedSentence(item: CustomerConsentStatusItem): string {
    if (!item.signedAt) return item.isDefinitionActive ? 'Zgoda nie została udzielona.' : 'Nigdy nie podpisana.';
    return `Podpisana ${formatDateTime(item.signedAt)}${item.signedVersion ? `, wersja ${item.signedVersion}` : ''}.`;
}

interface CustomerConsentsSectionProps {
    customerId: string;
    id?: string;
}

export const CustomerConsentsSection = ({ customerId, id }: CustomerConsentsSectionProps) => {
    const [confirmRevoke, setConfirmRevoke] = useState<CustomerConsentStatusItem | null>(null);
    const [busyDefinitionId, setBusyDefinitionId] = useState<string | null>(null);
    const menu = useActionMenu<CustomerConsentStatusItem>();
    // Jedno ukryte pole pliku na cały panel; zgodę, do której dołączamy skan, pamięta ref.
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachTarget = useRef<CustomerConsentStatusItem | null>(null);

    const { data, isLoading, isError } = useCustomerConsentsStatus(customerId);
    const { mutateAsync: signConsent } = useSignCustomerConsent(customerId);
    const { mutateAsync: revokeConsent, isPending: isRevoking } = useRevokeCustomerConsent(customerId);
    const { mutateAsync: uploadAttachment } = useUploadConsentAttachment();

    const consents = data?.consents ?? [];
    const active = consents.filter(c => c.isDefinitionActive);
    const validCount = active.filter(c => c.status === 'VALID').length;

    const grant = async (item: CustomerConsentStatusItem) => {
        if (!item.isDefinitionActive || !item.currentTemplateId) return;
        setBusyDefinitionId(item.definitionId);
        try {
            await signConsent({ templateId: item.currentTemplateId });
        } finally {
            setBusyDefinitionId(null);
        }
    };

    const pickScan = (item: CustomerConsentStatusItem) => {
        attachTarget.current = item;
        fileInputRef.current?.click();
    };

    const attach = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        const item = attachTarget.current;
        if (!file || !item?.currentTemplateId) return;
        setBusyDefinitionId(item.definitionId);
        try {
            const result = await signConsent({
                templateId: item.currentTemplateId,
                payload: { requestAttachmentUpload: true },
            });
            if (result.attachmentUploadUrl) {
                await uploadAttachment({ uploadUrl: result.attachmentUploadUrl, file });
            }
        } finally {
            setBusyDefinitionId(null);
        }
    };

    const revoke = async () => {
        if (!confirmRevoke) return;
        const consentId = confirmRevoke.consentId ?? confirmRevoke.definitionId;
        try {
            await revokeConsent(consentId);
        } finally {
            setConfirmRevoke(null);
        }
    };

    const current = menu.menu?.item ?? null;
    const currentDoc = current ? (current.attachmentUrl || (!isGranted(current) ? current.downloadUrl : null)) : null;

    return (
        <RailPanel id={id} aria-labelledby="customer-consents-title">
            <Head>
                <SectionTitle
                    id="customer-consents-title"
                    count={active.length ? `aktualne ${validCount} z ${active.length}` : undefined}
                >
                    Zgody
                </SectionTitle>
            </Head>

            {isLoading ? (
                <Muted>Wczytywanie zgód...</Muted>
            ) : isError ? (
                <Muted>Nie udało się wczytać zgód. Odśwież stronę.</Muted>
            ) : consents.length === 0 ? (
                <Muted>W ustawieniach studia nie ma jeszcze zdefiniowanych zgód.</Muted>
            ) : (
                <List>
                    {consents.map(item => {
                        const busy = busyDefinitionId === item.definitionId;
                        const granted = isGranted(item);
                        const status = item.isDefinitionActive
                            ? STATUS[item.status] ?? { label: item.status, tone: 'neutral' as const }
                            : { label: 'Usunięta z ustawień', tone: 'neutral' as const };
                        const hasMenu = item.isDefinitionActive || !!item.attachmentUrl;
                        return (
                            <Row key={item.definitionId} $muted={!item.isDefinitionActive}>
                                <Text>
                                    <strong>{item.definitionName}</strong>
                                    <StatusPill $tone={status.tone}>{status.label}</StatusPill>
                                    <Meta>{signedSentence(item)}</Meta>
                                    {item.isDefinitionActive && granted && !item.attachmentUrl && (
                                        <Warn>Brak skanu podpisanej zgody.</Warn>
                                    )}
                                </Text>
                                <RowActions>
                                    {item.isDefinitionActive && !granted && (
                                        <Button variant="tinted" size="sm" disabled={busy} onClick={() => grant(item)}>
                                            {busy ? 'Zapisywanie...' : 'Udziel zgody'}
                                        </Button>
                                    )}
                                    {hasMenu && (
                                        <IconButton
                                            label={`Więcej akcji: ${item.definitionName}`}
                                            variant="ghost"
                                            size="sm"
                                            shape="square"
                                            disabled={busy}
                                            aria-haspopup="menu"
                                            active={menu.isOpen(item.definitionId)}
                                            onClick={e => menu.toggle(e, item, item.definitionId)}
                                        >
                                            <MoreVertical />
                                        </IconButton>
                                    )}
                                </RowActions>
                            </Row>
                        );
                    })}
                </List>
            )}

            <HiddenInput ref={fileInputRef} type="file" accept="application/pdf,image/*" onChange={attach} data-testid="consent-scan-input" />

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Akcje zgody">
                {current && currentDoc && (
                    <MenuItem icon={<FileText />} onClick={() => window.open(currentDoc, '_blank', 'noopener')}>
                        {current.attachmentUrl ? 'Podpisany dokument' : 'Szablon zgody (PDF)'}
                    </MenuItem>
                )}
                {current?.isDefinitionActive && (
                    <MenuItem icon={<Paperclip />} onClick={() => pickScan(current)}>
                        {current.attachmentUrl ? 'Zastąp skan' : 'Dołącz skan podpisu'}
                    </MenuItem>
                )}
                {current?.isDefinitionActive && isGranted(current) && (
                    <>
                        <MenuDivider />
                        <MenuItem icon={<ShieldOff />} danger onClick={() => setConfirmRevoke(current)}>Wycofaj zgodę</MenuItem>
                    </>
                )}
            </ActionMenu>

            <ConfirmationModal
                isOpen={confirmRevoke !== null}
                title="Wycofać zgodę?"
                message={confirmRevoke ? `Zgoda „${confirmRevoke.definitionName}" przestanie obowiązywać. Tej operacji nie można cofnąć - żeby ją przywrócić, klient musi podpisać ją ponownie.` : ''}
                variant="danger"
                confirmText={isRevoking ? 'Wycofywanie...' : 'Wycofaj zgodę'}
                cancelText="Zostaw"
                onConfirm={revoke}
                onCancel={() => setConfirmRevoke(null)}
            />
        </RailPanel>
    );
};
