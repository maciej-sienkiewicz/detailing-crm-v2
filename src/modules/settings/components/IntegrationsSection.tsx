import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { legalPath } from '@/modules/legal/documents';
import type { Integration, IntegrationKind } from '../api/integrationsApi';
import { useDisconnectIntegration, useIntegrations } from '../hooks/useIntegrations';
import {
    Card, CardHead, CardHeadText, CardTitle, CardNote, CardActions, CardValue,
    OutlineBtn, DangerBtn, StateTag,
} from './security/SecurityCard';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const Footnote = styled.p`
    margin: 0;
    padding: 0 4px;
    font-size: 12.5px;
    line-height: 1.5;
    color: #64748b;

    a { color: #0369a1; font-weight: 600; }
`;

/** Łączenie zostaje w module (zakładka „Moje konta") - tu tylko stan i odłączenie. */
const MODULE_ACCOUNTS_PATH = '/instagram?view=mine';

interface Provider {
    title: string;
    account: (integration: Integration) => string | null;
    detail: (integration: Integration) => string | null;
    connectHint: string;
    confirmTitle: string;
    confirmMessage: string;
}

/**
 * Teksty potwierdzeń mówią dokładnie to, co robi backend (InstagramConnectionService.disconnect,
 * GoogleBusinessService.disconnect) i co obiecuje strona /usuwanie-danych: Instagram traci
 * dostęp także po stronie Meta, a pobrane dane zostają; Google traci dostęp, a pobrane opinie
 * i statystyki znikają.
 */
const PROVIDERS: Record<IntegrationKind, Provider> = {
    instagram: {
        title: 'Instagram',
        account: integration => (integration.account ? `@${integration.account}` : null),
        detail: integration => (integration.detail ? `Strona na Facebooku: ${integration.detail}` : null),
        connectHint: 'Konto Instagram łączysz w module Instagram, w zakładce „Moje konta”.',
        confirmTitle: 'Odłączyć Instagram?',
        confirmMessage: 'CRM odbierze sobie dostęp do konta także po stronie Meta: przestanie pobierać statystyki '
            + 'i wiadomości, a generator nie opublikuje posta. Pobrane wcześniej wiadomości, posty i statystyki '
            + 'zostają w CRM.',
    },
    google: {
        title: 'Wizytówka Google',
        account: integration => integration.account,
        detail: integration => integration.detail,
        connectHint: 'Wizytówkę Google łączysz w module Instagram, w zakładce „Moje konta”.',
        confirmTitle: 'Odłączyć wizytówkę Google?',
        confirmMessage: 'CRM odbierze sobie dostęp w Google i usunie pobrane opinie oraz statystyki wizytówki.',
    },
};

const STATUS_LABEL: Record<Integration['status'], string> = {
    CONNECTED: 'Połączono',
    PENDING_SELECTION: 'Nie wybrano konta',
    ERROR: 'Połączenie przerwane',
    NOT_CONNECTED: 'Nie połączono',
};

const IntegrationCard = ({ kind, integration }: { kind: IntegrationKind; integration: Integration }) => {
    const provider = PROVIDERS[kind];
    const navigate = useNavigate();
    const disconnect = useDisconnectIntegration();
    const [confirming, setConfirming] = useState(false);

    const connected = integration.status !== 'NOT_CONNECTED';
    const pending = disconnect.isPending && disconnect.variables === kind;
    const account = provider.account(integration);
    const detail = provider.detail(integration);

    const note = integration.status === 'PENDING_SELECTION'
        ? 'Logowanie przerwano przed wyborem konta. Dokończ je w module Instagram albo odłącz.'
        : integration.status === 'ERROR'
            ? 'Połącz konto ponownie w module Instagram albo je odłącz.'
            : integration.status === 'NOT_CONNECTED'
                ? provider.connectHint
                : null;

    return (
        <Card aria-label={provider.title}>
            <CardHead>
                <CardHeadText>
                    <CardTitle>{provider.title}</CardTitle>
                    <StateTag $on={integration.status === 'CONNECTED'}>{STATUS_LABEL[integration.status]}</StateTag>
                </CardHeadText>
                <CardActions>
                    {connected ? (
                        <DangerBtn type="button" onClick={() => setConfirming(true)} disabled={pending}>
                            {pending ? 'Odłączam…' : 'Odłącz'}
                        </DangerBtn>
                    ) : (
                        <OutlineBtn type="button" onClick={() => navigate(MODULE_ACCOUNTS_PATH)}>
                            Przejdź do modułu
                        </OutlineBtn>
                    )}
                </CardActions>
            </CardHead>

            {(account || detail) && (
                <CardHeadText>
                    {account && <CardValue>{account}</CardValue>}
                    {detail && <CardNote>{detail}</CardNote>}
                </CardHeadText>
            )}
            {note && <CardNote>{note}</CardNote>}

            <ConfirmationModal
                isOpen={confirming}
                title={provider.confirmTitle}
                message={provider.confirmMessage}
                variant="danger"
                confirmText="Odłącz"
                cancelText="Zostaw"
                onConfirm={() => { setConfirming(false); disconnect.mutate(kind); }}
                onCancel={() => setConfirming(false)}
            />
        </Card>
    );
};

/**
 * Ustawienia → Integracje: konta studia u dostawców i ich odłączenie.
 *
 * Tę ścieżkę podaje strona /usuwanie-danych („W Aplikacji przejdź do Ustawień, otwórz sekcję
 * integracji z Instagramem i wybierz Odłącz"), wpisana w panelu Meta jako instrukcja usunięcia
 * danych - recenzent App Review przechodzi ją dosłownie. Dawniej „Odłącz" było tylko w menu
 * karty w module Instagram, a studio bez modułu nie miało go wcale. Backend odłącza tu bez
 * bramki modułu (IntegrationsController).
 */
export const IntegrationsSection = () => {
    const integrations = useIntegrations();

    if (integrations.isLoading) return <Footnote role="status">Wczytuję połączenia…</Footnote>;
    if (!integrations.data) return <Footnote role="alert">Nie udało się wczytać połączeń. Odśwież stronę.</Footnote>;

    return (
        <Wrap>
            <IntegrationCard kind="instagram" integration={integrations.data.instagram} />
            <IntegrationCard kind="google" integration={integrations.data.google} />
            <Footnote>
                Odłączenie odbiera CRM dostęp do konta także u dostawcy. Jak usunąć dane pobrane wcześniej,
                opisujemy na stronie{' '}
                <a href={legalPath('usuwanie-danych')} target="_blank" rel="noopener noreferrer">Usuwanie danych</a>.
            </Footnote>
        </Wrap>
    );
};
