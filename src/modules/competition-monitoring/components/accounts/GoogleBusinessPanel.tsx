import { useState } from 'react';
import styled from 'styled-components';
import { MoreHorizontal, RefreshCw, Store, Unplug } from 'lucide-react';
import {
    ActionMenu, Button, ChoiceCard, ChoiceList, IconButton, MenuItem, Notice, Panel, SectionTitle, StatusPill, ui,
    useActionMenu,
} from '@/common/components/ui';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { apiErrorMessage, apiErrorStatus } from '../../api/accountsApi';
import { useAccountActions, useGoogleBusiness } from '../../hooks/useAccounts';
import { GOOGLE_REPLY_MAX, type GoogleReview } from '../../accountsTypes';
import { formatDate, formatExact } from '../MetricBits';
import { sinceLabel, sortReviews } from './accountsLogic';
import {
    AccountHead, Actions, CardBody, CardHead, HeadText, HeadTitle, IconTile, Kpi, KpiGrid, KpiLabel, KpiValue,
    List, Loading, Meta, Muted, Section,
} from './accountsStyles';
import { ChangeLine } from './ChangeLine';

/**
 * Wizytówka w Google - dla lokalnego studia zwykle więcej telefonów niż cały Instagram.
 * Wyłącznie własna wizytówka: danych konkurencji z Google nie zbieramy (warunki Google
 * dla EOG zabraniają porównań na danych z Places API).
 */

const REVIEWS_SHOWN = 6;

const Stars = styled.span`
    color: #b45309;
    letter-spacing: 1px;
    font-size: 13px;
    white-space: nowrap;
`;

const ReviewItem = styled.li`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    background: ${ui.surface};
    min-width: 0;
`;

const ReviewTop = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    font-size: 13px;

    strong { font-weight: 650; color: ${ui.ink}; }
`;

const ReviewText = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.ink};
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const Reply = styled.p`
    margin: 0;
    padding-left: 10px;
    border-left: 2px solid ${ui.okLine};
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textSecondary};
    overflow-wrap: anywhere;
`;

const ReplyBox = styled.textarea`
    width: 100%;
    min-height: 80px;
    padding: 10px 12px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    font-family: inherit;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.ink};
    resize: vertical;
    box-sizing: border-box;

    &:focus { outline: 2px solid ${ui.focusRing}; outline-offset: 0; border-color: transparent; }
`;

const ReplyActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const ErrorText = styled.span`
    font-size: 12.5px;
    color: ${ui.dangerInk};
`;

const starsOf = (rating: number) => '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));

const ratingLabel = (rating: number | null, total: number | null) => {
    if (rating === null) return null;
    const value = rating.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    // „z 1 opinii", „z 126 opinii" - po „z" dopełniacz ma jedną formę.
    return total !== null ? `${value} ★ z ${formatExact(total)} opinii` : `${value} ★`;
};

interface ReviewProps {
    review: GoogleReview;
    /** Wypełniony „Wyślij" tylko wtedy, gdy w oknie nie stoi już inny krok następny. */
    canUsePrimary: boolean;
    /**
     * Otwarty jest najwyżej jeden edytor odpowiedzi: otwarty edytor przejmuje okno
     * i jego „Wyślij" jest krokiem następnym - dwa naraz dawałyby remis.
     */
    open: boolean;
    setOpen: (open: boolean) => void;
}

const ReviewRow = ({ review, canUsePrimary, open, setOpen }: ReviewProps) => {
    const { replyToReview } = useAccountActions();
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const send = () => {
        setError(null);
        replyToReview.mutate(
            { reviewId: review.id, comment: text.trim() },
            {
                onSuccess: () => { setOpen(false); setText(''); },
                onError: e => setError(apiErrorMessage(e, 'Google nie przyjął odpowiedzi. Spróbuj ponownie.')),
            },
        );
    };

    return (
        <ReviewItem>
            <ReviewTop>
                {review.starRating !== null && (
                    <Stars aria-label={`${review.starRating} z 5`}>{starsOf(review.starRating)}</Stars>
                )}
                <strong>{review.reviewerName ?? 'Klient'}</strong>
                {review.createdAt && <Muted as="span">{formatDate(review.createdAt)}</Muted>}
                {review.replyComment === null && <StatusPill $tone="warn">bez odpowiedzi</StatusPill>}
            </ReviewTop>
            {review.comment && <ReviewText>{review.comment}</ReviewText>}
            {review.replyComment && <Reply>{review.replyComment}</Reply>}

            {review.replyComment === null && !open && (
                <ReplyActions>
                    <Button variant="tinted" size="sm" onClick={() => setOpen(true)}>Odpowiedz</Button>
                </ReplyActions>
            )}
            {open && (
                <>
                    <ReplyBox
                        autoFocus
                        aria-label="Odpowiedź na opinię"
                        placeholder="Dziękujemy za opinię…"
                        value={text}
                        maxLength={GOOGLE_REPLY_MAX}
                        onChange={e => setText(e.target.value)}
                    />
                    <ReplyActions>
                        <Button
                            variant={canUsePrimary ? 'primary' : 'tinted'}
                            size="sm"
                            disabled={text.trim().length === 0 || replyToReview.isPending}
                            onClick={send}
                        >
                            {replyToReview.isPending ? 'Wysyłam…' : 'Wyślij odpowiedź'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setError(null); }}>Anuluj</Button>
                        {error && <ErrorText role="alert">{error}</ErrorText>}
                    </ReplyActions>
                </>
            )}
        </ReviewItem>
    );
};

interface Props {
    /**
     * Czy ten panel może mieć wypełniony przycisk. Bez połączonego Instagrama krokiem
     * następnym zakładki jest „Połącz Instagram" - wtedy Google zostaje przy odcieniu.
     */
    canUsePrimary: boolean;
}

export const GoogleBusinessPanel = ({ canUsePrimary }: Props) => {
    const google = useGoogleBusiness();
    const actions = useAccountActions();
    const menu = useActionMenu();
    const [confirmDisconnect, setConfirmDisconnect] = useState(false);
    const [syncNote, setSyncNote] = useState<string | null>(null);
    const [openReviewId, setOpenReviewId] = useState<string | null>(null);
    const data = google.data;
    const status = data?.status ?? 'NOT_CONNECTED';
    const connected = status === 'CONNECTED';
    const forbidden = [actions.connectGoogle.error, actions.selectGoogle.error, actions.disconnectGoogle.error]
        .some(error => apiErrorStatus(error) === 403);
    const connectVariant = canUsePrimary ? 'primary' : 'tinted';

    const sync = () => {
        setSyncNote(null);
        actions.syncGoogle.mutate(undefined, {
            onError: error => setSyncNote(apiErrorStatus(error) === 429
                ? 'Odświeżone przed chwilą. Spróbuj za kilka minut.'
                : 'Nie udało się odświeżyć. Spróbuj ponownie za chwilę.'),
        });
    };

    const connectButton = (label: string) => (
        <Button
            variant={connectVariant}
            onClick={() => actions.connectGoogle.mutate()}
            disabled={actions.connectGoogle.isPending}
        >
            <Store aria-hidden="true" />
            {actions.connectGoogle.isPending ? 'Przechodzę do Google…' : label}
        </Button>
    );

    const body = () => {
        if (google.isLoading) return <Loading>Sprawdzam wizytówkę…</Loading>;
        if (!data) return <Muted>Nie udało się sprawdzić wizytówki. Odśwież stronę.</Muted>;

        if (status === 'NOT_CONNECTED' && !data.available) {
            return <Notice tone="info">Połączenie z wizytówką Google nie jest jeszcze dostępne w tej instalacji.</Notice>;
        }
        if (status === 'NOT_CONNECTED') {
            return (
                <Section>
                    <Muted>Telefony, trasy i opinie z Twojej wizytówki w Mapach Google.</Muted>
                    <Actions>
                        {connectButton('Połącz wizytówkę Google')}
                        {forbidden && <Muted as="span">Łączy kierownik albo właściciel studia.</Muted>}
                    </Actions>
                </Section>
            );
        }
        if (status === 'PENDING_SELECTION') {
            return (
                <Section>
                    <Muted>To konto zarządza kilkoma wizytówkami. Która należy do studia?</Muted>
                    <ChoiceList>
                        {data.candidates.map(candidate => (
                            <ChoiceCard
                                key={candidate.locationName}
                                type="radio"
                                name="google-location"
                                checked={actions.selectGoogle.variables === candidate.locationName}
                                disabled={actions.selectGoogle.isPending}
                                onChange={() => actions.selectGoogle.mutate(candidate.locationName)}
                                title={candidate.title}
                                detail={candidate.address ?? undefined}
                            />
                        ))}
                    </ChoiceList>
                </Section>
            );
        }
        if (status === 'ERROR') {
            return (
                <Notice tone="danger" title="Google odrzucił dostęp" action={connectButton('Połącz ponownie')}>
                    {data.lastError ?? 'Połącz wizytówkę jeszcze raz.'}
                </Notice>
            );
        }

        const last = data.last30;
        const previous = data.previous30;
        const reviews = sortReviews(data.reviews).slice(0, REVIEWS_SHOWN);
        return (
            <>
                {syncNote && <Notice tone="info" role="status">{syncNote}</Notice>}
                {last ? (
                    <Section>
                        <KpiGrid>
                            <Kpi>
                                <KpiLabel>Telefony</KpiLabel>
                                <KpiValue>{formatExact(last.calls)}</KpiValue>
                                <ChangeLine current={last.calls} previous={previous?.calls ?? null} />
                            </Kpi>
                            <Kpi>
                                <KpiLabel>Trasy do studia</KpiLabel>
                                <KpiValue>{formatExact(last.directions)}</KpiValue>
                                <ChangeLine current={last.directions} previous={previous?.directions ?? null} />
                            </Kpi>
                            <Kpi>
                                <KpiLabel>Wejścia na stronę</KpiLabel>
                                <KpiValue>{formatExact(last.websiteClicks)}</KpiValue>
                                <ChangeLine current={last.websiteClicks} previous={previous?.websiteClicks ?? null} />
                            </Kpi>
                            <Kpi>
                                <KpiLabel>Wyświetlenia</KpiLabel>
                                <KpiValue>{formatExact(last.impressions)}</KpiValue>
                                <ChangeLine current={last.impressions} previous={previous?.impressions ?? null} />
                            </Kpi>
                        </KpiGrid>
                        {/* Google podaje dane z opóźnieniem 2-3 dni - bez daty „ostatnie 30 dni" kłamie. */}
                        {data.dataUntil && <Muted>Dane do {formatDate(data.dataUntil)}.</Muted>}
                    </Section>
                ) : (
                    <Muted>Pierwsze liczby z wizytówki pojawią się po pobraniu danych, zwykle w kilka minut.</Muted>
                )}

                <Section>
                    <SectionTitle
                        as="h3"
                        count={data.unansweredReviews > 0
                            ? `${data.unansweredReviews} bez odpowiedzi`
                            : undefined}
                    >
                        Opinie
                    </SectionTitle>
                    {reviews.length === 0 ? (
                        <Muted>Brak opinii do pokazania.</Muted>
                    ) : (
                        <List>
                            {reviews.map(review => (
                                <ReviewRow
                                    key={review.id}
                                    review={review}
                                    canUsePrimary={canUsePrimary}
                                    open={openReviewId === review.id}
                                    setOpen={open => setOpenReviewId(open ? review.id : null)}
                                />
                            ))}
                        </List>
                    )}
                </Section>
            </>
        );
    };

    const rating = ratingLabel(data?.averageRating ?? null, data?.totalReviews ?? null);
    const synced = sinceLabel(data?.lastSyncAt);

    return (
        <Panel aria-label="Wizytówka Google">
            <CardHead>
                <AccountHead>
                    <IconTile $tone="google"><Store aria-hidden="true" /></IconTile>
                    <HeadText>
                        <HeadTitle>{connected && data?.locationTitle ? data.locationTitle : 'Wizytówka Google'}</HeadTitle>
                        <Meta>
                            {connected && rating && <span>{rating}</span>}
                            {connected && data?.locationAddress && <span>{data.locationAddress}</span>}
                            {connected && synced && <span>odświeżone {synced}</span>}
                        </Meta>
                    </HeadText>
                </AccountHead>
                {connected && (
                    <Actions>
                        <Button variant="outline" size="sm" onClick={sync} disabled={actions.syncGoogle.isPending}>
                            <RefreshCw aria-hidden="true" />
                            {actions.syncGoogle.isPending ? 'Odświeżam…' : 'Odśwież'}
                        </Button>
                        <IconButton label="Więcej" size="sm" onClick={e => menu.toggle(e, null)}>
                            <MoreHorizontal />
                        </IconButton>
                    </Actions>
                )}
            </CardHead>
            <CardBody>{body()}</CardBody>

            <ActionMenu anchor={menu.menu?.anchor ?? null} onClose={menu.close} label="Wizytówka Google">
                <MenuItem danger icon={<Unplug />} onClick={() => setConfirmDisconnect(true)}>
                    Odłącz wizytówkę
                </MenuItem>
            </ActionMenu>

            <ConfirmationModal
                isOpen={confirmDisconnect}
                title="Odłączyć wizytówkę Google?"
                message="CRM usunie pobrane statystyki i opinie oraz odbierze sobie dostęp do wizytówki."
                variant="danger"
                confirmText="Odłącz"
                cancelText="Zostaw"
                onConfirm={() => { setConfirmDisconnect(false); actions.disconnectGoogle.mutate(); }}
                onCancel={() => setConfirmDisconnect(false)}
            />
        </Panel>
    );
};
