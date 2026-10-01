// src/modules/employees/views/WorkTimeCardView.tsx
//
// Karta czasu pracy jednej osoby za miesiąc - osobna strona
// `/employees/worktime/:period/:userId`, a nie okno nad listą miesiąca.
//
// Dawniej karta była oknem (CardReviewModal) otwieranym z trzech miejsc, ze strzałkami
// między osobami, seryjnym przeglądem i kafelkami liczb. Zgłoszenie właściciela: „lista
// z godzinami się nie scrolluje, nie można jej podejrzeć całej" - okno pełnej wysokości
// z własnym przewijaniem treści na telefonie nie dawało dojechać do końca miesiąca.
// Strona przewija się jak każda inna, a widok miesiąca i karta są od siebie niezależne:
// do karty prowadzi wiersz listy miesiąca i wiersz na karcie pracownika, zwykłym linkiem.
//
// Na stronie: liczba godzin wobec normy, jedno zdanie o brakach, nadgodzinach i urlopie,
// miesiąc dzień po dniu, a na dole tylko akcje, które mają sens przy tym statusie.
// Wypełniony jest najwyżej jeden przycisk - „Zatwierdź kartę" (CLAUDE.md §2).

import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/common/components/PageContainer';
import { useToast } from '@/common/components/Toast';
import { Button, Card, Notice, ui } from '@/common/components/ui';
import { formatDateTime } from '@/common/utils';
import { useAuth } from '@/core/context/AuthContext';
import { BOTTOM_NAV_SPACE } from '@/widgets/BottomNav/constants';
import {
    useApproveCard, useCardDetail, useMonthOverview, useRemind, useReturnCard,
} from '../hooks/useWorktimeMonths';
import { CardDays } from '../components/worktime/CardDays';
import { CardNoteModal } from '../components/worktime/CardNoteModal';
import { StatusText } from '../components/worktime/StatusText';
import {
    cardFactsSentence, hoursText, isNotSubmitted, isPeriod, monthPath, periodInSentence, remindedRecently,
    signedSheetIncludes,
} from '../components/worktime/monthFormat';

export function WorkTimeCardView() {
    const { period = '', userId = '' } = useParams<{ period: string; userId: string }>();
    if (!isPeriod(period) || !userId) return <Navigate to="/employees/worktime" replace />;
    return <CardPage key={`${period}/${userId}`} period={period} userId={userId} />;
}

function CardPage({ period, userId }: { period: string; userId: string }) {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const { user } = useAuth();
    const card = useCardDetail(period, userId);
    // Tylko po to, by przed odblokowaniem powiedzieć, że podpisana lista stanie się nieaktualna.
    const month = useMonthOverview(period);
    const approve = useApproveCard();
    const returnCard = useReturnCard();
    const remind = useRemind(period);
    const [noteFor, setNoteFor] = useState<'return' | 'unlock' | null>(null);

    const data = card.data;
    const name = data?.name ?? '';
    const back = monthPath(period);
    const monthName = periodInSentence(period);

    /** Po decyzji karta jest „załatwiona" - wraca się do listy, tam widać, co zostało. */
    const backWith = (title: string, message: string) => {
        showSuccess(title, message);
        navigate(back);
    };

    const handleApprove = () => approve.mutate({ userId, period }, {
        onSuccess: () => backWith('Karta zatwierdzona', `${name}, karta za ${monthName}.`),
    });

    const handleNote = (note: string) => {
        const kind = noteFor;
        returnCard.mutate({ userId, period, note }, {
            onSuccess: () => {
                setNoteFor(null);
                if (kind === 'unlock') backWith('Karta odblokowana', `${name} może ją poprawić i złożyć ponownie.`);
                else backWith('Karta zwrócona do poprawy', `${name} dostanie powiadomienie z Twoją notatką.`);
            },
        });
    };

    const handleRemind = () => remind.mutate([userId], {
        onSuccess: result => {
            if (result.reminded.includes(userId)) {
                showSuccess('Przypomnienie wysłane', `${name} dostanie powiadomienie o karcie za ${monthName}.`);
            } else {
                showError('Nie wysłano przypomnienia', result.skipped[0]?.reason);
            }
        },
    });

    // `canDecide` mówi tylko o kartach złożonych i zatwierdzonych (przy niezłożonych backend
    // zawsze daje false), więc „własna karta" to porównanie z zalogowanym.
    const isOwn = !!user?.userId && user.userId === userId;
    const pending = approve.isPending || returnCard.isPending;

    let actions = null;
    if (data?.status === 'SUBMITTED' && data.canDecide) {
        actions = (
            <>
                <Button variant="outline" size="lg" onClick={() => setNoteFor('return')} disabled={pending}>
                    Zwróć do poprawy
                </Button>
                <Button variant="success" size="lg" onClick={handleApprove} disabled={pending}>
                    {approve.isPending ? 'Zatwierdzam…' : 'Zatwierdź kartę'}
                </Button>
            </>
        );
    } else if (data?.status === 'SUBMITTED') {
        actions = <ActionNote>Własnej karty nie zatwierdzasz.</ActionNote>;
    } else if (data?.status === 'APPROVED' && data.canDecide) {
        actions = (
            <Button variant="outline" size="lg" onClick={() => setNoteFor('unlock')} disabled={pending}>
                Odblokuj kartę
            </Button>
        );
    } else if (data && isNotSubmitted(data.status) && !isOwn) {
        const reminded = remindedRecently(data.remindedAt);
        actions = (
            <>
                {reminded && data.remindedAt && (
                    <ActionNote>
                        Przypomniano {formatDateTime(data.remindedAt)}. Kolejne przypomnienie po 12 godzinach.
                    </ActionNote>
                )}
                <Button variant="outline" size="lg" onClick={handleRemind} disabled={reminded || remind.isPending}>
                    {remind.isPending ? 'Wysyłam…' : 'Przypomnij'}
                </Button>
            </>
        );
    }

    const resignWarning = data && signedSheetIncludes(month.data, data.name)
        ? `Lista obecności za ${monthName} jest podpisana i obejmuje tę kartę. Po odblokowaniu trzeba będzie podpisać ją ponownie.`
        : null;

    const facts = data ? cardFactsSentence(data) : '';

    return (
        <Page $width="narrow">
            <BackLink to={back}>
                <ArrowLeft aria-hidden="true" />
                Listy miesięczne, {monthName}
            </BackLink>

            <Header>
                <Title>{name || 'Karta czasu pracy'}</Title>
                <Subtitle>
                    <span>Karta czasu pracy, {monthName}</span>
                    {data && <StatusText status={data.status} />}
                </Subtitle>
            </Header>

            {card.isError ? (
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać karty"
                    action={<Button variant="ghost" size="sm" onClick={() => card.refetch()}>Spróbuj ponownie</Button>}
                />
            ) : !data ? (
                <Card aria-busy="true" aria-label="Wczytuję kartę">
                    <Skeleton><span /><span /><span /></Skeleton>
                </Card>
            ) : (
                <Card>
                    <Summary>
                        <Total>
                            {hoursText(data.totalMinutes)}
                            <TotalOf> z {hoursText(data.expectedMinutes)}</TotalOf>
                        </Total>
                        {facts && <Facts>{facts}</Facts>}
                        {data.status === 'RETURNED' && data.returnNote && (
                            <Facts>Uwagi przy zwrocie: {data.returnNote}</Facts>
                        )}
                    </Summary>
                    <Days>
                        <CardDays days={data.days} />
                    </Days>
                </Card>
            )}

            {actions && <ActionBar aria-label="Decyzja o karcie">{actions}</ActionBar>}

            {noteFor && data && (
                <CardNoteModal
                    kind={noteFor}
                    name={data.name}
                    resignWarning={resignWarning}
                    pending={returnCard.isPending}
                    onSubmit={handleNote}
                    onClose={() => setNoteFor(null)}
                />
            )}
        </Page>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const PHONE = '(max-width: 767px)';

const Page = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    padding-block-end: 48px;

    @media ${PHONE} { gap: 14px; padding-block-end: 24px; }
`;

const BackLink = styled(Link)`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 32px;
    font-size: 14px;
    font-weight: 600;
    color: ${ui.textSecondary};
    text-decoration: none;

    svg { width: 16px; height: 16px; }
    &:hover { color: ${ui.ink}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; border-radius: 6px; }
`;

const Header = styled.header`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const Title = styled.h1`
    margin: 0;
    font-size: 26px;
    line-height: 1.2;
    font-weight: 750;
    letter-spacing: -0.02em;
    color: ${ui.ink};
    overflow-wrap: anywhere;

    @media ${PHONE} { font-size: 22px; }
`;

const Subtitle = styled.p`
    margin: 0;
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 14px;
    font-size: 14px;
    color: ${ui.textMuted};
`;

const Summary = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 20px 20px 16px;

    @media ${PHONE} { padding: 16px 16px 14px; }
`;

const Total = styled.p`
    margin: 0;
    font-size: 28px;
    line-height: 1.15;
    font-weight: 750;
    letter-spacing: -0.02em;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
`;

const TotalOf = styled.span`
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0;
    color: ${ui.textMuted};
`;

const Facts = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${ui.textSecondary};
    overflow-wrap: anywhere;
`;

/* Lista dni ma własną obwódkę - w karcie stoi na całej szerokości, bez ramki w ramce. */
const Days = styled.div`
    border-top: 1px solid ${ui.lineFaint};

    > ol { border: none; border-radius: 0; }
`;

/**
 * Akcje przyklejone do dołu ekranu: przy 30 dniach decyzja nie może wymagać przewinięcia
 * całego miesiąca z powrotem. Na telefonie stoją nad dolnym paskiem nawigacji.
 */
const ActionBar = styled.div`
    position: sticky;
    bottom: 0;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px 12px;
    margin-inline: -8px;
    padding: 12px 8px;
    background: linear-gradient(to bottom, rgba(238, 242, 247, 0), ${ui.bg} 30%);

    @media ${PHONE} {
        bottom: ${BOTTOM_NAV_SPACE};
        > button { flex: 1 1 0; min-width: 0; }
    }
`;

const ActionNote = styled.p`
    margin: 0 auto 0 0;
    flex: 1 1 220px;
    font-size: 13.5px;
    line-height: 1.45;
    color: ${ui.textMuted};

    @media ${PHONE} { flex: 1 1 100%; }
`;

const Skeleton = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;

    span {
        display: block;
        height: 18px;
        border-radius: 6px;
        background: ${ui.surfaceAlt};
    }
    span:first-child { width: 45%; height: 30px; }
    span:nth-child(2) { width: 70%; }
    span:nth-child(3) { width: 100%; height: 280px; }
`;
