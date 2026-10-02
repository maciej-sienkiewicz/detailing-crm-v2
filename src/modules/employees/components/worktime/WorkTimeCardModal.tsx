// src/modules/employees/components/worktime/WorkTimeCardModal.tsx
//
// Karta czasu pracy jednej osoby za miesiąc, w oknie nad listą zakładki „Czas pracy"
// (i nad sekcją czasu pracy na karcie pracownika).
//
// Krótko była osobną stroną - właściciel woli okno, bo decyzja o karcie to chwila nad
// listą, a nie przejście w inne miejsce. Zgłoszenie, od którego zaczęła się strona, brzmiało
// „lista z godzinami się nie scrolluje, nie można jej podejrzeć całej". Dlatego okno jest
// zbudowane wprost na klockach ModalKit, bez własnych wrapperów: ModalBox to kolumna
// flex z `max-height: 100%`, nagłówek i stopka się nie kurczą, a ModalContent - jedyny
// obszar z `overflow-y: auto` - dostaje całą resztę wysokości i przewija cały miesiąc.
// Okno rośnie z treścią do wysokości ekranu, a potem przewija się tylko lista. Test
// w przeglądarce (kółko i dotyk) potwierdza, że ostatni dzień miesiąca jest osiągalny.
//
// W oknie: liczba godzin wobec normy, jedno zdanie o brakach, nadgodzinach i urlopie,
// miesiąc dzień po dniu, a w stopce tylko akcje, które mają sens przy tym statusie.
// Wypełniony jest najwyżej jeden przycisk - „Zatwierdź kartę" (CLAUDE.md §2).

import { useId, useState } from 'react';
import styled from 'styled-components';
import {
    CloseBtn, ModalContent, ModalFooter, ModalHeader, ModalShell, ModalSubtitle, ModalTitle, ModalTitleGroup,
} from '@/common/components/ModalKit';
import { useToast } from '@/common/components/Toast';
import { Button, Notice, ui } from '@/common/components/ui';
import { SUBMODAL_Z_INDEX } from '@/common/styles';
import { formatDateTime } from '@/common/utils';
import { useAuth } from '@/core/context/AuthContext';
import {
    useApproveCard, useCardDetail, useMonthOverview, useRemind, useReturnCard,
} from '../../hooks/useWorktimeMonths';
import { CardDays } from './CardDays';
import { CardNoteModal } from './CardNoteModal';
import { StatusText } from './StatusText';
import {
    cardFactsSentence, hoursText, isNotSubmitted, periodInSentence, remindedRecently, signedSheetIncludes,
} from './monthFormat';

interface Props {
    period: string;
    userId: string;
    onClose: () => void;
}

export function WorkTimeCardModal({ period, userId, onClose }: Props) {
    const titleId = useId();
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
    const monthName = periodInSentence(period);

    /** Po decyzji karta jest „załatwiona" - okno się zamyka, lista pokazuje, co zostało. */
    const closeWith = (title: string, message: string) => {
        showSuccess(title, message);
        onClose();
    };

    const handleApprove = () => approve.mutate({ userId, period }, {
        onSuccess: () => closeWith('Karta zatwierdzona', `${name}, karta za ${monthName}.`),
    });

    const handleNote = (note: string) => {
        const kind = noteFor;
        returnCard.mutate({ userId, period, note }, {
            onSuccess: () => {
                setNoteFor(null);
                if (kind === 'unlock') closeWith('Karta odblokowana', `${name} może ją poprawić i złożyć ponownie.`);
                else closeWith('Karta zwrócona do poprawy', `${name} dostanie powiadomienie z Twoją notatką.`);
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
                <Button variant="outline" onClick={() => setNoteFor('return')} disabled={pending}>
                    Zwróć do poprawy
                </Button>
                <Button variant="success" onClick={handleApprove} disabled={pending}>
                    {approve.isPending ? 'Zatwierdzam…' : 'Zatwierdź kartę'}
                </Button>
            </>
        );
    } else if (data?.status === 'SUBMITTED') {
        actions = <ActionNote>Własnej karty nie zatwierdzasz.</ActionNote>;
    } else if (data?.status === 'APPROVED' && data.canDecide) {
        actions = (
            <Button variant="outline" onClick={() => setNoteFor('unlock')} disabled={pending}>
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
                <Button variant="outline" onClick={handleRemind} disabled={reminded || remind.isPending}>
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
        <>
            <ModalShell isOpen onClose={onClose} size="lg" labelledBy={titleId}>
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle id={titleId}>{name || 'Karta czasu pracy'}</ModalTitle>
                        <ModalSubtitle>
                            <SubtitleLine>
                                <span>Karta czasu pracy, {monthName}</span>
                                {data && <StatusText status={data.status} />}
                            </SubtitleLine>
                        </ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>

                <ModalContent data-testid="card-modal-content">
                    {card.isError ? (
                        <Notice
                            tone="danger"
                            role="alert"
                            title="Nie udało się wczytać karty"
                            action={<Button variant="ghost" size="sm" onClick={() => card.refetch()}>Spróbuj ponownie</Button>}
                        />
                    ) : !data ? (
                        <Skeleton aria-busy="true" aria-label="Wczytuję kartę"><span /><span /><span /></Skeleton>
                    ) : (
                        <>
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
                            <CardDays days={data.days} />
                        </>
                    )}
                </ModalContent>

                {actions && <ModalFooter aria-label="Decyzja o karcie">{actions}</ModalFooter>}
            </ModalShell>

            {noteFor && data && (
                <CardNoteModal
                    kind={noteFor}
                    name={data.name}
                    resignWarning={resignWarning}
                    pending={returnCard.isPending}
                    zIndex={SUBMODAL_Z_INDEX}
                    onSubmit={handleNote}
                    onClose={() => setNoteFor(null)}
                />
            )}
        </>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const SubtitleLine = styled.span`
    display: inline-flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 12px;
`;

/* Elementy treści się nie kurczą: przewija się ModalContent, a nie lista dni w środku. */
const Summary = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
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

const ActionNote = styled.p`
    margin: 0 auto 0 0;
    flex: 1 1 220px;
    font-size: 13.5px;
    line-height: 1.45;
    color: ${ui.textMuted};
`;

const Skeleton = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;

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
