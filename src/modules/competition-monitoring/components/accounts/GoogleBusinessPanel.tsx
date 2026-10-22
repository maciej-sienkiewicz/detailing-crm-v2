import { useEffect, useRef, useState, type RefObject } from 'react';
import styled from 'styled-components';
import { ChevronDown, MoreHorizontal, RefreshCw, Store, Unplug } from 'lucide-react';
import {
    ActionMenu, Button, ChoiceCard, ChoiceList, IconButton, MenuItem, Notice, Panel, PanelBody, PanelHead, SectionTitle,
    StatusPill, ui, useActionMenu,
} from '@/common/components/ui';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useBreakpoint } from '@/common/hooks';
import { useAccountActions, useGoogleBusiness } from '../../hooks/useAccounts';
import { GOOGLE_REPLY_MAX, type GoogleReview } from '../../accountsTypes';
import { PHONE } from '../../utils/phone';
import { formatDate, formatExact } from '../MetricBits';
import { periodCaption, sinceLabel, sortReviews, splitUrgent } from './accountsLogic';
import {
    AccountHead, Actions, CardBody, CardHead, HeadText, HeadTitle, IconTile, Kpi, KpiGrid, KpiLabel, KpiValue,
    List, Loading, Meta, Muted, PeriodCaption, PhoneHead, PhoneHeadBar, PhoneHeadFact, PhoneHeadName, Section, ShowMore,
} from './accountsStyles';
import { ChangeLine } from './ChangeLine';
import { LoginRedirectOverlay } from './LoginRedirectOverlay';
import { problemDetail, problemStatus } from '@/core/problem';

/**
 * Wizytówka w Google - dla lokalnego studia zwykle więcej telefonów niż cały Instagram.
 * Wyłącznie własna wizytówka: danych konkurencji z Google nie zbieramy (warunki Google
 * dla EOG zabraniają porównań na danych z Places API).
 */

const REVIEWS_SHOWN = 6;
/** Telefon bez opinii czekających na odpowiedź: tyle najświeższych widać bez „Pokaż". */
const PHONE_REVIEWS_FALLBACK = 2;

const Stars = styled.span`
    color: #b45309;
    letter-spacing: 1px;
    font-size: 13px;
    white-space: nowrap;
`;

/* Na telefonie opinia to płaski wiersz panelu, oddzielony kreską - ramka w ramce
   zabierała 30 px szerokości z każdej strony tekstu, którego i tak jest dużo. */
const ReviewItem = styled.li`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    background: ${ui.surface};
    min-width: 0;

    ${PHONE} {
        padding: 14px 0;
        border: none;
        border-radius: 0;

        &:first-child { padding-top: 4px; }
    }
`;

/** Telefon: kto i kiedy w pierwszej linii, gwiazdki i „bez odpowiedzi" w drugiej. */
const PhoneReviewHead = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px 12px;
    min-width: 0;
    font-size: 13.5px;

    strong { font-weight: 650; color: ${ui.ink}; min-width: 0; }
    span { flex-shrink: 0; font-size: 12.5px; color: ${ui.textMuted}; font-variant-numeric: tabular-nums; }
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

/* Telefon: odpowiedź studia jako wyciszone pole z podpisem zamiast zielonej kreski
   z lewej - kolorowe paski przy krawędzi to na telefonie wycofany wzorzec. */
const Reply = styled.p`
    margin: 0;
    padding-left: 10px;
    border-left: 2px solid ${ui.okLine};
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textSecondary};
    overflow-wrap: anywhere;

    ${PHONE} {
        padding: 8px 10px;
        border-left: none;
        border-radius: ${ui.radiusRow};
        background: ${ui.surfaceSoft};
    }
`;

const ReplyLabel = styled.span`
    display: block;
    margin-bottom: 2px;
    font-size: 12px;
    font-weight: 600;
    color: ${ui.textMuted};
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

    /* Poniżej 16 px Safari na iPhonie powiększa stronę przy dotknięciu pola. */
    ${PHONE} { font-size: 16px; }
`;

const ReplyActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

/** Pole i przyciski edytora jako jeden blok: to jego dół ma stanąć nad klawiaturą. */
const Editor = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
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

/** Odstęp dołu edytora od dolnej krawędzi widocznej części: dolny pasek nawigacji, zanim się schowa. */
const KEYBOARD_CLEARANCE = 80;

/**
 * Na telefonie „Odpowiedz" otwiera klawiaturę, a ta zabiera pół ekranu: pole
 * i „Wyślij odpowiedź" lądowały pod nią i pod dolnym paskiem. Przewijamy tak, żeby
 * dół edytora stał nad klawiaturą - od razu i przy każdej zmianie rozmiaru okna,
 * póki edytor jest otwarty (Android z `resizes-content` skraca okno, iOS tylko
 * `visualViewport`). Nigdy wyżej niż góra pola: tekst, który się pisze, jest
 * ważniejszy niż przycisk.
 */
const useRevealAboveKeyboard = (ref: RefObject<HTMLElement | null>, active: boolean) => {
    useEffect(() => {
        if (!active) return;
        const vv = window.visualViewport;
        let frame = 0;
        const reveal = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const el = ref.current;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const visibleTop = vv ? vv.offsetTop : 0;
                const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
                const overflow = rect.bottom + KEYBOARD_CLEARANCE - visibleBottom;
                const room = rect.top - visibleTop - 16;
                const by = Math.min(overflow, room);
                if (by > 0) window.scrollBy({ top: by, behavior: 'smooth' });
            });
        };
        reveal();
        window.addEventListener('resize', reveal);
        vv?.addEventListener('resize', reveal);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', reveal);
            vv?.removeEventListener('resize', reveal);
        };
    }, [ref, active]);
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
    const isDesktop = useBreakpoint('md');
    const { replyToReview } = useAccountActions();
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    useRevealAboveKeyboard(editorRef, open && !isDesktop);

    const send = () => {
        setError(null);
        replyToReview.mutate(
            { reviewId: review.id, comment: text.trim() },
            {
                onSuccess: () => { setOpen(false); setText(''); },
                onError: e => setError(problemDetail(e, 'Google nie przyjął odpowiedzi. Spróbuj ponownie.')),
            },
        );
    };

    const stars = review.starRating !== null && (
        <Stars aria-label={`${review.starRating} z 5`}>{starsOf(review.starRating)}</Stars>
    );
    const unansweredPill = review.replyComment === null && <StatusPill $tone="warn">bez odpowiedzi</StatusPill>;

    const editorFields = (
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
    );

    if (!isDesktop) {
        return (
            <ReviewItem>
                <PhoneReviewHead>
                    <strong>{review.reviewerName ?? 'Klient'}</strong>
                    {review.createdAt && <span>{formatDate(review.createdAt)}</span>}
                </PhoneReviewHead>
                {(stars || unansweredPill) && <ReviewTop>{stars}{unansweredPill}</ReviewTop>}
                {review.comment && <ReviewText>{review.comment}</ReviewText>}
                {review.replyComment && <Reply><ReplyLabel>Odpowiedź studia</ReplyLabel>{review.replyComment}</Reply>}
                {review.replyComment === null && !open && (
                    <ReplyActions>
                        <Button variant="tinted" size="sm" onClick={() => setOpen(true)}>Odpowiedz</Button>
                    </ReplyActions>
                )}
                {open && <Editor ref={editorRef}>{editorFields}</Editor>}
            </ReviewItem>
        );
    }

    return (
        <ReviewItem>
            <ReviewTop>
                {stars}
                <strong>{review.reviewerName ?? 'Klient'}</strong>
                {review.createdAt && <Muted as="span">{formatDate(review.createdAt)}</Muted>}
                {unansweredPill}
            </ReviewTop>
            {review.comment && <ReviewText>{review.comment}</ReviewText>}
            {review.replyComment && <Reply>{review.replyComment}</Reply>}

            {review.replyComment === null && !open && (
                <ReplyActions>
                    <Button variant="tinted" size="sm" onClick={() => setOpen(true)}>Odpowiedz</Button>
                </ReplyActions>
            )}
            {open && editorFields}
        </ReviewItem>
    );
};

interface ReviewsProps {
    reviews: GoogleReview[];
    canUsePrimary: boolean;
    /**
     * Telefon: widać opinie bez odpowiedzi, odpowiedziane czekają za „Pokaż". Na
     * komputerze lista stoi obok statystyk i pokazuje sześć najświeższych od razu.
     */
    collapse: boolean;
}

const ReviewList = ({ reviews, canUsePrimary, collapse }: ReviewsProps) => {
    const [openReviewId, setOpenReviewId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const sorted = sortReviews(reviews);
    if (sorted.length === 0) return <Muted>Brak opinii do pokazania.</Muted>;

    const { shown, hidden } = collapse
        ? splitUrgent(sorted, review => review.replyComment === null, PHONE_REVIEWS_FALLBACK)
        : { shown: sorted.slice(0, REVIEWS_SHOWN), hidden: [] };
    const visible = expanded ? [...shown, ...hidden] : shown;
    // Gdy widać tylko te bez odpowiedzi, przycisk mówi, co dojdzie; inaczej - ile jest wszystkich.
    const onlyUnanswered = shown.every(review => review.replyComment === null);

    return (
        <>
            <List>
                {visible.map(review => (
                    <ReviewRow
                        key={review.id}
                        review={review}
                        canUsePrimary={canUsePrimary}
                        open={openReviewId === review.id}
                        setOpen={open => setOpenReviewId(open ? review.id : null)}
                    />
                ))}
            </List>
            {hidden.length > 0 && (
                <ShowMore type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
                    {expanded
                        ? 'Zwiń'
                        : onlyUnanswered
                            ? `Pokaż opinie z odpowiedzią (${hidden.length})`
                            : `Pokaż wszystkie opinie (${sorted.length})`}
                    <ChevronDown aria-hidden="true" />
                </ShowMore>
            )}
        </>
    );
};

/**
 * Opinie bez odpowiedzi jako osobny panel - tylko na telefonie, gdzie zakładka
 * układa się według tego, co czeka na reakcję: wiadomości, opinie, dopiero potem
 * statystyki. Na komputerze opinie są częścią panelu wizytówki.
 */
export const GoogleReviewsPanel = ({ canUsePrimary }: { canUsePrimary: boolean }) => {
    const google = useGoogleBusiness();
    const data = google.data;
    if (!data || data.status !== 'CONNECTED') return null;
    return (
        <Panel aria-label="Opinie w Google">
            <PanelHead>
                <SectionTitle count={data.unansweredReviews > 0 ? `${data.unansweredReviews} bez odpowiedzi` : undefined}>
                    Opinie w Google
                </SectionTitle>
            </PanelHead>
            <PanelBody>
                <Section>
                    <ReviewList reviews={data.reviews} canUsePrimary={canUsePrimary} collapse />
                </Section>
            </PanelBody>
        </Panel>
    );
};

interface Props {
    /**
     * Czy ten panel może mieć wypełniony przycisk. Bez połączonego Instagrama krokiem
     * następnym zakładki jest „Połącz Instagram" - wtedy Google zostaje przy odcieniu.
     */
    canUsePrimary: boolean;
    /** Fałsz, gdy opinie stoją wyżej we własnym panelu (`GoogleReviewsPanel`, telefon). */
    withReviews?: boolean;
}

export const GoogleBusinessPanel = ({ canUsePrimary, withReviews = true }: Props) => {
    const isDesktop = useBreakpoint('md');
    const google = useGoogleBusiness();
    const actions = useAccountActions();
    const menu = useActionMenu();
    const [confirmDisconnect, setConfirmDisconnect] = useState(false);
    const [syncNote, setSyncNote] = useState<string | null>(null);
    const data = google.data;
    const status = data?.status ?? 'NOT_CONNECTED';
    const connected = status === 'CONNECTED';
    const forbidden = [actions.connectGoogle.error, actions.selectGoogle.error, actions.disconnectGoogle.error]
        .some(error => problemStatus(error) === 403);
    const connectVariant = canUsePrimary ? 'primary' : 'tinted';

    const sync = () => {
        setSyncNote(null);
        actions.syncGoogle.mutate(undefined, {
            onError: error => setSyncNote(problemStatus(error) === 429
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
            return (
                <Notice tone="info" title="Łączenie z wizytówką Google jeszcze nieaktywne">
                    Włączamy je po naszej stronie, Ty nie musisz nic robić.
                </Notice>
            );
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
        return (
            <>
                {syncNote && <Notice tone="info" role="status">{syncNote}</Notice>}
                {last ? (
                    <Section>
                        {!isDesktop && <PeriodCaption>{periodCaption(previous !== null)}</PeriodCaption>}
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

                {withReviews && (
                    <Section>
                        <SectionTitle
                            as="h3"
                            count={data.unansweredReviews > 0
                                ? `${data.unansweredReviews} bez odpowiedzi`
                                : undefined}
                        >
                            Opinie
                        </SectionTitle>
                        <ReviewList reviews={data.reviews} canUsePrimary={canUsePrimary} collapse={!isDesktop} />
                    </Section>
                )}
            </>
        );
    };

    const rating = ratingLabel(data?.averageRating ?? null, data?.totalReviews ?? null);
    const synced = sinceLabel(data?.lastSyncAt);
    const title = connected && data?.locationTitle ? data.locationTitle : 'Wizytówka Google';

    const syncButton = (
        <Button variant="outline" size="sm" onClick={sync} disabled={actions.syncGoogle.isPending}>
            <RefreshCw aria-hidden="true" />
            {actions.syncGoogle.isPending ? 'Odświeżam…' : 'Odśwież'}
        </Button>
    );
    const moreButton = (
        <IconButton label="Więcej" size="sm" onClick={e => menu.toggle(e, null)}>
            <MoreHorizontal />
        </IconButton>
    );

    const head = !isDesktop ? (
        <PhoneHead>
            <PhoneHeadName>
                <IconTile $tone="google"><Store aria-hidden="true" /></IconTile>
                <HeadTitle>{title}</HeadTitle>
            </PhoneHeadName>
            {connected && (
                <PhoneHeadBar>
                    {rating ? <PhoneHeadFact>{rating}</PhoneHeadFact> : <span />}
                    <Actions>{syncButton}{moreButton}</Actions>
                </PhoneHeadBar>
            )}
            {connected && (data?.locationAddress || synced) && (
                <Meta>
                    {data?.locationAddress && <span>{data.locationAddress}</span>}
                    {synced && <span>odświeżone {synced}</span>}
                </Meta>
            )}
        </PhoneHead>
    ) : (
        <CardHead>
            <AccountHead>
                <IconTile $tone="google"><Store aria-hidden="true" /></IconTile>
                <HeadText>
                    <HeadTitle>{title}</HeadTitle>
                    <Meta>
                        {connected && rating && <span>{rating}</span>}
                        {connected && data?.locationAddress && <span>{data.locationAddress}</span>}
                        {connected && synced && <span>odświeżone {synced}</span>}
                    </Meta>
                </HeadText>
            </AccountHead>
            {connected && <Actions>{syncButton}{moreButton}</Actions>}
        </CardHead>
    );

    return (
        <Panel aria-label="Wizytówka Google">
            {head}
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
            <LoginRedirectOverlay leavingFor={actions.leavingFor} />
        </Panel>
    );
};
