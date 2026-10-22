import { Fragment, useState } from 'react';
import styled from 'styled-components';
import { Instagram, MessageCircle, MoreHorizontal, PhoneCall, RefreshCw, Send, Unplug } from 'lucide-react';
import {
    ActionMenu, Button, Card, ChoiceCard, ChoiceList, IconButton, MenuItem, Notice, StatusPill, ui, useActionMenu,
} from '@/common/components/ui';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useBreakpoint } from '@/common/hooks';
import { useAccountActions, useMyInstagram } from '../../hooks/useAccounts';
import type { InstagramConnection } from '../../accountsTypes';
import { formatExact } from '../MetricBits';
import { handleSegments, sinceLabel } from './accountsLogic';
import {
    Actions, AccountHead, CardBody, CardHead, HeadText, HeadTitle, IconTile, Loading, Meta, Muted, PhoneHead, PhoneHeadBar,
    PhoneHeadName,
} from './accountsStyles';
import { OwnStats } from './OwnStats';
import { LoginRedirectOverlay } from './LoginRedirectOverlay';
import { problemStatus } from '@/core/problem';

/**
 * Karta konta Instagram: połączenie i - po połączeniu - statystyki z oficjalnego API.
 *
 * To jedyna wyniesiona powierzchnia zakładki (CLAUDE.md §2): bez połączenia cała
 * zakładka sprowadza się do jednego kroku, „Połącz Instagram", i to on jest jedynym
 * wypełnionym przyciskiem.
 */

const Benefits = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;

    li {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        color: ${ui.ink};
    }

    svg { width: 18px; height: 18px; color: ${ui.brandInk}; flex-shrink: 0; }
`;

const ConnectRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

const BENEFITS = [
    { icon: MessageCircle, text: 'Wiadomości z Instagrama trafiają do CRM jako zapytania' },
    { icon: PhoneCall, text: 'Zasięg i kliknięcia „zadzwoń" z Twojego profilu' },
    { icon: Send, text: 'Publikacja postów prosto z generatora, ze zdjęciami z wizyty' },
];

interface Props {
    connection: InstagramConnection | undefined;
    isLoading: boolean;
}

/** „@detailing_studio_mokotow" z miejscami łamania za „_" i „.". */
const Handle = ({ username }: { username: string }) => (
    <>
        {handleSegments(`@${username}`).map((part, i) => (
            <Fragment key={i}>{i > 0 && <wbr />}{part}</Fragment>
        ))}
    </>
);

export const InstagramAccountCard = ({ connection, isLoading }: Props) => {
    const isDesktop = useBreakpoint('md');
    const actions = useAccountActions();
    const menu = useActionMenu();
    const [confirmDisconnect, setConfirmDisconnect] = useState(false);
    const [syncNote, setSyncNote] = useState<string | null>(null);
    const connected = connection?.status === 'CONNECTED';
    const mine = useMyInstagram(connected);

    // 403 dostaje dymek z interceptora - tu tylko krótka podpowiedź obok przycisku, kto może.
    const forbidden = [actions.connect.error, actions.select.error, actions.disconnect.error]
        .some(error => problemStatus(error) === 403);

    const sync = () => {
        setSyncNote(null);
        actions.sync.mutate(undefined, {
            onError: error => setSyncNote(problemStatus(error) === 429
                ? 'Odświeżone przed chwilą. Spróbuj za kilka minut.'
                : 'Nie udało się odświeżyć. Spróbuj ponownie za chwilę.'),
        });
    };

    const status = connection?.status ?? 'NOT_CONNECTED';
    const synced = sinceLabel(mine.data?.syncedAt ?? connection?.lastSyncAt);

    const syncButton = (
        <Button variant="outline" size="sm" onClick={sync} disabled={actions.sync.isPending}>
            <RefreshCw aria-hidden="true" />
            {actions.sync.isPending ? 'Odświeżam…' : 'Odśwież'}
        </Button>
    );
    const moreButton = (
        <IconButton label="Więcej" size="sm" onClick={e => menu.toggle(e, null)}>
            <MoreHorizontal />
        </IconButton>
    );

    const phoneHead = (
        <PhoneHead>
            <PhoneHeadName>
                <IconTile><Instagram aria-hidden="true" /></IconTile>
                <HeadTitle>{connected && connection?.username ? <Handle username={connection.username} /> : 'Instagram'}</HeadTitle>
            </PhoneHeadName>
            {(connected || status === 'ERROR') && (
                <PhoneHeadBar>
                    {connected
                        ? <StatusPill $tone="ok">Połączone</StatusPill>
                        : <StatusPill $tone="danger">Wymaga ponownego połączenia</StatusPill>}
                    {connected && <Actions>{syncButton}{moreButton}</Actions>}
                </PhoneHeadBar>
            )}
            {connected && (connection?.pageName || mine.data?.followers != null || synced) && (
                <Meta>
                    {connection?.pageName && <span>strona {connection.pageName}</span>}
                    {mine.data?.followers != null && <span>{formatExact(mine.data.followers)} obserwujących</span>}
                    {synced && <span>odświeżone {synced}</span>}
                </Meta>
            )}
        </PhoneHead>
    );

    const head = !isDesktop ? phoneHead : (
        <CardHead>
            <AccountHead>
                <IconTile><Instagram aria-hidden="true" /></IconTile>
                <HeadText>
                    <HeadTitle>{connected && connection?.username ? `@${connection.username}` : 'Instagram'}</HeadTitle>
                    <Meta>
                        {connected && <StatusPill $tone="ok">Połączone</StatusPill>}
                        {status === 'ERROR' && <StatusPill $tone="danger">Wymaga ponownego połączenia</StatusPill>}
                        {connected && connection?.pageName && <span>strona {connection.pageName}</span>}
                        {connected && mine.data?.followers != null && <span>{formatExact(mine.data.followers)} obserwujących</span>}
                        {connected && synced && <span>odświeżone {synced}</span>}
                    </Meta>
                </HeadText>
            </AccountHead>
            {connected && <Actions>{syncButton}{moreButton}</Actions>}
        </CardHead>
    );

    const body = () => {
        if (isLoading) return <Loading>Sprawdzam połączenie…</Loading>;
        if (!connection) return <Muted>Nie udało się sprawdzić połączenia. Odśwież stronę.</Muted>;

        // Serwer CRM nie ma jeszcze kluczy aplikacji Meta. Właściciel studia nic tu nie
        // zrobi, więc tekst mówi, czyja to kolej, a nie jak nazywa się brakujący element.
        if (status === 'NOT_CONNECTED' && !connection.available) {
            return (
                <Notice tone="info" title="Łączenie z Instagramem jeszcze nieaktywne">
                    Włączamy je po naszej stronie, Ty nie musisz nic robić. Konkurencja, Inspiracje
                    i Przegląd działają już teraz.
                </Notice>
            );
        }

        if (status === 'NOT_CONNECTED') {
            return (
                <>
                    <Benefits>
                        {BENEFITS.map(({ icon: Icon, text }) => (
                            <li key={text}><Icon aria-hidden="true" />{text}</li>
                        ))}
                    </Benefits>
                    <ConnectRow>
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={() => actions.connect.mutate()}
                            disabled={actions.connect.isPending}
                        >
                            <Instagram aria-hidden="true" />
                            {actions.connect.isPending ? 'Przechodzę do Facebooka…' : 'Połącz Instagram'}
                        </Button>
                        <Muted>{forbidden ? 'Łączy kierownik albo właściciel studia.' : 'Logowanie przez Facebooka, konto firmowe.'}</Muted>
                    </ConnectRow>
                </>
            );
        }

        if (status === 'PENDING_SELECTION') {
            return (
                <>
                    <Muted>Masz kilka kont firmowych. Które należy do studia?</Muted>
                    <ChoiceList>
                        {connection.candidates.map(candidate => (
                            <ChoiceCard
                                key={candidate.pageId}
                                type="radio"
                                name="instagram-account"
                                checked={actions.select.variables === candidate.pageId}
                                disabled={actions.select.isPending}
                                onChange={() => actions.select.mutate(candidate.pageId)}
                                title={`@${candidate.igUsername}`}
                                detail={[
                                    candidate.pageName,
                                    candidate.followers != null ? `${formatExact(candidate.followers)} obserwujących` : null,
                                ].filter(Boolean).join(', ')}
                            />
                        ))}
                    </ChoiceList>
                    {forbidden && <Muted>Wybiera kierownik albo właściciel studia.</Muted>}
                </>
            );
        }

        if (status === 'ERROR') {
            return (
                <Notice
                    tone="danger"
                    title="Meta odrzuciła dostęp"
                    action={(
                        <Button variant="primary" size="sm" onClick={() => actions.connect.mutate()} disabled={actions.connect.isPending}>
                            Połącz ponownie
                        </Button>
                    )}
                >
                    {connection.lastError ?? 'Połącz konto jeszcze raz, żeby wrócić do statystyk i wiadomości.'}
                </Notice>
            );
        }

        return (
            <>
                {syncNote && <Notice tone="info" role="status">{syncNote}</Notice>}
                {!connection.messagingEnabled && (
                    <Notice tone="warn" title="Wiadomości nie trafiają do CRM">
                        Meta nie potwierdziła dostępu do wiadomości. Połącz konto ponownie i zaznacz wszystkie zgody.
                    </Notice>
                )}
                {mine.isLoading
                    ? <Loading>Wczytuję statystyki…</Loading>
                    : mine.data
                        ? <OwnStats mine={mine.data} />
                        : <Muted>Nie udało się wczytać statystyk.</Muted>}
            </>
        );
    };

    return (
        <Card aria-label="Konto Instagram">
            {head}
            <CardBody>{body()}</CardBody>

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Konto Instagram">
                <MenuItem danger icon={<Unplug />} onClick={() => setConfirmDisconnect(true)}>
                    Odłącz konto
                </MenuItem>
            </ActionMenu>

            <ConfirmationModal
                isOpen={confirmDisconnect}
                title="Odłączyć Instagram?"
                message="CRM przestanie widzieć statystyki i wiadomości, a generator nie opublikuje posta. Dane konkurencji zostają."
                variant="danger"
                confirmText="Odłącz"
                cancelText="Zostaw"
                onConfirm={() => { setConfirmDisconnect(false); actions.disconnect.mutate(); }}
                onCancel={() => setConfirmDisconnect(false)}
            />
            <LoginRedirectOverlay leavingFor={actions.leavingFor} />
        </Card>
    );
};
