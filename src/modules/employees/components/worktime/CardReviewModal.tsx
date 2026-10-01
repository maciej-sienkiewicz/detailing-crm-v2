// src/modules/employees/components/worktime/CardReviewModal.tsx
//
// Okno przeglądu karty czasu pracy - JEDYNE miejsce decyzji o karcie (z widoku miesiąca
// i z karty pracownika). Dawniej karta miała „✓" i „↶" w wierszu na karcie pracownika,
// a lista obecności żyła osobno; menedżer klikał kartę po karcie, zamykając i otwierając
// widoki. Teraz przegląd jest seryjny: po decyzji okno samo przechodzi do następnej
// złożonej karty („Następna: Anna Nowak, 2 z 4"), a po ostatniej mówi, co dalej.
//
// Kolejność czytania: ile godzin wobec normy (liczba jest nagłówkiem), braki, nadgodziny
// i urlop, potem miesiąc dzień po dniu. W stopce dokładnie jedno wypełnienie - krok
// następny (CLAUDE.md §2): „Zatwierdź kartę"; „Zwróć do poprawy" niesie czerwień jako
// odcień. Zwrot i odblokowanie przełączają stopkę w edytor notatki (stan przejściowy -
// wtedy wypełnione jest jego „Zwróć kartę"). Blokadę przewijania tła daje ModalShell.
//
// Okno ma pełną wysokość (`fillHeight`): przy seryjnym przeglądzie przyciski stoją
// w tym samym miejscu dla każdej karty, a na telefonie lista dni dostaje cały ekran.

import { useEffect, useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { ArrowRight, BellRing, Check, ChevronLeft, ChevronRight, LockOpen, Undo2 } from 'lucide-react';
import {
    CloseBtn, ModalContent, ModalFooter, ModalHeader, ModalShell, ModalSubtitle, ModalTitle, ModalTitleGroup,
} from '@/common/components/ModalKit';
import { Button, IconButton, Notice, StatusPill, ui } from '@/common/components/ui';
import { useToast } from '@/common/components/Toast';
import { useAuth } from '@/core/context/AuthContext';
import { formatDateTime } from '@/common/utils';
import type { MonthCardRow } from '../../api/worktimeMonthsApi';
import {
    useApproveCard, useCardDetail, useMonthOverview, useRemind, useReturnCard,
} from '../../hooks/useWorktimeMonths';
import { CardDays } from './CardDays';
import {
    CARD_STATUS, awaitingDecision, daysLabel, hoursText, hoursVsNorm, isNotSubmitted, nextAwaiting, periodInSentence,
    periodLabel, remindedRecently, signedSheetIncludes,
} from './monthFormat';

type Decision = 'approved' | 'returned';
type EditorKind = 'return' | 'unlock';

interface Props {
    period: string;
    /** Bieżąca karta - sterowana z zewnątrz (`?card=` w adresie widoku miesiąca). */
    userId: string;
    /**
     * `month` - przegląd całego miesiąca: strzałki między osobami i przejście do następnej
     * złożonej karty po decyzji. `single` - karta otwarta z karty pracownika: decyzja
     * zostaje przy tej osobie.
     */
    mode?: 'month' | 'single';
    onNavigate?: (userId: string) => void;
    onClose: () => void;
    /** Krok po ostatniej decyzji, gdy wszystkie karty są zatwierdzone. */
    onSign?: () => void;
}

const NOTE_LIMIT = 1000;

export function CardReviewModal({ period, userId, mode = 'month', onNavigate, onClose, onSign }: Props) {
    const titleId = useId();
    const noteId = useId();
    const { showSuccess, showError } = useToast();
    const { user } = useAuth();
    const month = useMonthOverview(period);
    const card = useCardDetail(period, userId);
    const approve = useApproveCard();
    const returnCard = useReturnCard();
    const remind = useRemind(period);

    const rows = month.data?.employees ?? [];
    const serial = mode === 'month';

    // Kolejka przeglądu: karty złożone w chwili otwarcia okna. Z niej bierze się „2 z 4" -
    // odświeżony przegląd miesiąca gubiłby rozpatrzone karty i licznik skakałby w miejscu.
    const [queue, setQueue] = useState<string[] | null>(null);
    if (queue === null && month.data) setQueue(awaitingDecision(month.data.employees).map(r => r.userId));
    const [decided, setDecided] = useState<ReadonlyMap<string, Decision>>(new Map());
    const [advance, setAdvance] = useState<{ name: string; decision: Decision; to: string } | null>(null);
    const [done, setDone] = useState(false);
    const [editor, setEditor] = useState<{ kind: EditorKind; for: string } | null>(null);
    const [note, setNote] = useState('');
    const [noteError, setNoteError] = useState<string | null>(null);

    // Edytor notatki należy do karty, przy której go otwarto - przejście strzałką go zamyka.
    const activeEditor = editor?.for === userId ? editor.kind : null;

    const contentRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        contentRef.current?.scrollTo?.({ top: 0 });
    }, [userId, done]);

    const listed = rows.find(r => r.userId === userId);
    const current: MonthCardRow | undefined = card.data ?? listed;
    const name = current?.name ?? '';
    const index = rows.findIndex(r => r.userId === userId);
    const position = queue ? queue.indexOf(userId) + 1 : 0;

    const goTo = (target: string) => {
        setAdvance(null);
        setNoteError(null);
        onNavigate?.(target);
    };

    const closeEditor = () => {
        setEditor(null);
        setNote('');
        setNoteError(null);
    };

    const afterDecision = (decision: Decision) => {
        const nextDecided = new Map(decided).set(userId, decision);
        setDecided(nextDecided);
        closeEditor();
        if (!serial) {
            showSuccess(
                decision === 'approved' ? 'Karta zatwierdzona' : 'Karta zwrócona do poprawy',
                decision === 'approved'
                    ? `${name}, karta za ${periodInSentence(period)}.`
                    : `${name} dostanie powiadomienie z Twoją notatką.`,
            );
            return;
        }
        const next = nextAwaiting(rows, userId, new Set(nextDecided.keys()));
        if (!next) {
            setDone(true);
            return;
        }
        if (queue && !queue.includes(next.userId)) setQueue([...queue, next.userId]);
        setAdvance({ name, decision, to: next.userId });
        onNavigate?.(next.userId);
    };

    const handleApprove = () => {
        approve.mutate({ userId, period }, { onSuccess: () => afterDecision('approved') });
    };

    const handleNoteSubmit = () => {
        const trimmed = note.trim();
        if (!trimmed) {
            setNoteError(activeEditor === 'unlock'
                ? 'Napisz, dlaczego odblokowujesz kartę - pracownik zobaczy tę notatkę.'
                : 'Napisz, co trzeba poprawić - pracownik zobaczy tę notatkę.');
            return;
        }
        const kind = activeEditor;
        returnCard.mutate({ userId, period, note: trimmed }, {
            onSuccess: () => {
                if (kind === 'unlock') {
                    closeEditor();
                    showSuccess('Karta odblokowana', `${name} może ją poprawić i złożyć ponownie.`);
                    return;
                }
                afterDecision('returned');
            },
        });
    };

    const handleRemind = () => {
        remind.mutate([userId], {
            onSuccess: result => {
                if (result.reminded.includes(userId)) {
                    showSuccess('Przypomnienie wysłane', `${name} dostanie powiadomienie o karcie za ${periodInSentence(period)}.`);
                } else {
                    showError('Nie wysłano przypomnienia', result.skipped[0]?.reason);
                }
            },
        });
    };

    // ── Stan „przegląd zakończony" ──────────────────────────────────────────────
    if (done) {
        const allApproved = rows.length > 0
            && rows.every(r => r.status === 'APPROVED' || decided.get(r.userId) === 'approved');
        const approvedNow = [...decided.values()].filter(d => d === 'approved').length;
        const returnedNow = decided.size - approvedNow;
        const waiting = rows.filter(r => isNotSubmitted(r.status) && !decided.has(r.userId)).length;
        return (
            <ModalShell isOpen onClose={onClose} size="lg" fillHeight labelledBy={titleId}>
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle id={titleId}>Przegląd zakończony</ModalTitle>
                        <ModalSubtitle>{periodLabel(period)}</ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>
                <ModalContent ref={contentRef}>
                    <DoneMark aria-hidden="true"><Check /></DoneMark>
                    <DoneTitle>
                        {allApproved ? 'Wszystkie karty zatwierdzone' : 'Nie ma więcej kart do decyzji'}
                    </DoneTitle>
                    <DoneText>
                        {approvedNow > 0 && `Zatwierdzone w tym przeglądzie: ${approvedNow}. `}
                        {returnedNow > 0 && `Zwrócone do poprawy: ${returnedNow}. `}
                        {allApproved
                            ? `Zostało podpisanie listy obecności za ${periodInSentence(period)}.`
                            : waiting > 0
                                ? `Na złożenie czeka jeszcze ${waiting === 1 ? '1 karta' : `${waiting} kart`} - możesz przypomnieć o nich z listy.`
                                : 'Lista obecności powstanie, gdy wszystkie karty będą zatwierdzone.'}
                    </DoneText>
                </ModalContent>
                <ModalFooter>
                    <FooterRow>
                        {allApproved && onSign ? (
                            <>
                                <Button variant="ghost" onClick={onClose}>Wróć do listy</Button>
                                <FooterPrimary>
                                    <Button variant="primary" size="lg" onClick={onSign}>
                                        Wszystkie karty zatwierdzone — podpisz listę
                                        <ArrowRight aria-hidden="true" />
                                    </Button>
                                </FooterPrimary>
                            </>
                        ) : (
                            <FooterPrimary>
                                <Button variant="outline" size="lg" onClick={onClose}>Wróć do listy</Button>
                            </FooterPrimary>
                        )}
                    </FooterRow>
                </ModalFooter>
            </ModalShell>
        );
    }

    const status = current ? CARD_STATUS[current.status] : null;
    // `canDecide` mówi o kartach złożonych i zatwierdzonych (przy niezłożonych zawsze false),
    // więc „własna karta" to porównanie z zalogowanym, a nie samo `!canDecide`.
    const isOwn = !!user?.userId && user.userId === userId;
    const canDecide = current?.canDecide ?? false;
    const decidable = canDecide && current?.status === 'SUBMITTED';
    const decisionBlocked = !!current && (isOwn || (!canDecide && (current.status === 'SUBMITTED' || current.status === 'APPROVED')));
    const reminded = remindedRecently(current?.remindedAt ?? null);
    const showAdvance = advance && advance.to === userId;
    const sheetIncludes = signedSheetIncludes(month.data, name);
    const pending = approve.isPending || returnCard.isPending;

    let footer = null;
    if (current && activeEditor) {
        footer = (
            <Editor>
                {activeEditor === 'unlock' && (
                    sheetIncludes ? (
                        <Notice tone="warn" title="Lista obecności będzie do ponownego podpisu">
                            Lista za {periodInSentence(period)} jest już podpisana i obejmuje tę kartę. Po
                            odblokowaniu stanie się nieaktualna i trzeba będzie podpisać ją ponownie.
                        </Notice>
                    ) : (
                        <EditorHint>
                            Karta wróci do pracownika do poprawy. Po ponownym złożeniu znowu trafi tutaj
                            do zatwierdzenia.
                        </EditorHint>
                    )
                )}
                <NoteLabel htmlFor={noteId}>
                    {activeEditor === 'unlock' ? 'Dlaczego odblokowujesz kartę?' : 'Co trzeba poprawić?'}
                </NoteLabel>
                <NoteInput
                    id={noteId}
                    value={note}
                    maxLength={NOTE_LIMIT}
                    autoFocus
                    rows={3}
                    aria-invalid={noteError ? true : undefined}
                    aria-describedby={noteError ? `${noteId}-error` : undefined}
                    placeholder={activeEditor === 'unlock' ? 'Np. trzeba dopisać nadgodziny' : 'Np. brakuje wpisów z dwóch dni'}
                    onChange={e => { setNote(e.target.value); setNoteError(null); }}
                />
                {noteError && <NoteError id={`${noteId}-error`} role="alert">{noteError}</NoteError>}
                <FooterRow>
                    <Button variant="outline" onClick={closeEditor} disabled={returnCard.isPending}>Anuluj</Button>
                    <FooterPrimary>
                        <Button variant="primary" size="lg" onClick={handleNoteSubmit} disabled={returnCard.isPending}>
                            {activeEditor === 'unlock'
                                ? (returnCard.isPending ? 'Odblokowuję…' : 'Odblokuj kartę')
                                : (returnCard.isPending ? 'Zwracam…' : 'Zwróć kartę')}
                        </Button>
                    </FooterPrimary>
                </FooterRow>
            </Editor>
        );
    } else if (current && decidable) {
        footer = (
            <FooterRow>
                <Button
                    variant="tintedDanger"
                    onClick={() => setEditor({ kind: 'return', for: userId })}
                    disabled={pending}
                >
                    <Undo2 aria-hidden="true" />
                    {/* Jeden element tekstu: przycisk to flex z odstępem, więc osobny kawałek
                        „ do poprawy" dostawał podwójną spację. */}
                    <span>Zwróć{' '}<WideOnly>do poprawy</WideOnly></span>
                </Button>
                <FooterPrimary>
                    <Button variant="success" size="lg" onClick={handleApprove} disabled={pending}>
                        <Check aria-hidden="true" />
                        {approve.isPending ? 'Zatwierdzam…' : 'Zatwierdź kartę'}
                    </Button>
                </FooterPrimary>
            </FooterRow>
        );
    } else if (current && canDecide && current.status === 'APPROVED') {
        footer = (
            <FooterRow>
                <FooterNote>
                    Zatwierdzona{current.approvedAt ? ` ${formatDateTime(current.approvedAt)}` : ''}
                    {current.approvedByName ? `, ${current.approvedByName}` : ''}
                </FooterNote>
                <FooterPrimary>
                    <Button variant="outline" onClick={() => setEditor({ kind: 'unlock', for: userId })}>
                        <LockOpen aria-hidden="true" />Odblokuj kartę
                    </Button>
                </FooterPrimary>
            </FooterRow>
        );
    } else if (current && !isOwn && isNotSubmitted(current.status)) {
        footer = (
            <FooterRow>
                <FooterNote>
                    {reminded && current.remindedAt
                        ? `Przypomniano ${formatDateTime(current.remindedAt)}. Kolejne przypomnienie można wysłać po 12 godzinach.`
                        : current.remindedAt
                            ? `Ostatnie przypomnienie ${formatDateTime(current.remindedAt)}.`
                            : 'Pracownik dostanie powiadomienie, żeby uzupełnił i złożył kartę.'}
                </FooterNote>
                <FooterPrimary>
                    <Button
                        variant="tinted"
                        onClick={handleRemind}
                        disabled={reminded || remind.isPending}
                        title={reminded ? 'Ta osoba dostała przypomnienie mniej niż 12 godzin temu' : undefined}
                    >
                        <BellRing aria-hidden="true" />
                        {remind.isPending ? 'Wysyłam…' : 'Przypomnij'}
                    </Button>
                </FooterPrimary>
            </FooterRow>
        );
    }

    return (
        <ModalShell isOpen onClose={onClose} size="lg" fillHeight labelledBy={titleId}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle id={titleId}>{name || 'Karta czasu pracy'}</ModalTitle>
                    <SubtitleRow>
                        <ModalSubtitle as="span">Karta czasu pracy za {periodInSentence(period)}</ModalSubtitle>
                        {status && <StatusPill $tone={status.tone}>{status.label}</StatusPill>}
                    </SubtitleRow>
                </ModalTitleGroup>
                <HeaderSide>
                    {serial && rows.length > 1 && index >= 0 && (
                        <Stepper aria-label="Przejdź do innej osoby">
                            <IconButton
                                size="sm"
                                label="Poprzednia osoba"
                                disabled={index <= 0}
                                onClick={() => goTo(rows[index - 1].userId)}
                            >
                                <ChevronLeft />
                            </IconButton>
                            <StepperText>{index + 1} z {rows.length}</StepperText>
                            <IconButton
                                size="sm"
                                label="Następna osoba"
                                disabled={index >= rows.length - 1}
                                onClick={() => goTo(rows[index + 1].userId)}
                            >
                                <ChevronRight />
                            </IconButton>
                        </Stepper>
                    )}
                    <CloseBtn onClick={onClose} />
                </HeaderSide>
            </ModalHeader>

            <ModalContent ref={contentRef}>
                {showAdvance && (
                    <Notice tone="ok" role="status">
                        {/* Jeden <span>: treść Notice to kolumna, więc luźne kawałki zdania
                            rozjeżdżały się na osobne linie. */}
                        <span>
                            {advance.decision === 'approved' ? 'Zatwierdzono kartę' : 'Zwrócono kartę'}: {advance.name}.
                            {' '}Następna: <strong>{name}</strong>{queue && position > 0 ? `, ${position} z ${queue.length}` : ''}.
                        </span>
                    </Notice>
                )}

                {decisionBlocked && (
                    <Notice tone="info" title="Własnej karty nie zatwierdzasz">
                        Decyzję o tej karcie podejmuje inna osoba z uprawnieniem do kadr.
                    </Notice>
                )}

                {card.data?.status === 'RETURNED' && card.data.returnNote && (
                    <Notice tone="danger" title="Zwrócona do poprawy">
                        <span>{card.data.returnNote}</span>
                        {(card.data.returnedAt || card.data.returnedByName) && (
                            <Muted>
                                {[card.data.returnedByName, card.data.returnedAt && formatDateTime(card.data.returnedAt)]
                                    .filter(Boolean).join(', ')}
                            </Muted>
                        )}
                    </Notice>
                )}

                {card.isError ? (
                    <Notice
                        tone="danger"
                        role="alert"
                        title="Nie udało się wczytać karty"
                        action={<Button variant="ghost" size="sm" onClick={() => card.refetch()}>Spróbuj ponownie</Button>}
                    />
                ) : !card.data ? (
                    <Skeleton aria-busy="true" aria-label="Wczytuję kartę">
                        <span /><span /><span />
                    </Skeleton>
                ) : (
                    <>
                        <Summary>
                            <Headline>
                                <HeadlineValue>{hoursVsNorm(card.data.totalMinutes, card.data.expectedMinutes)}</HeadlineValue>
                                <HeadlineLabel>przepracowane wobec normy</HeadlineLabel>
                            </Headline>
                            <Facts>
                                <Fact $warn={card.data.missingWorkingDays > 0}>
                                    <dt>Brakujące dni</dt>
                                    <dd>{card.data.missingWorkingDays > 0 ? daysLabel(card.data.missingWorkingDays) : 'brak'}</dd>
                                </Fact>
                                <Fact>
                                    <dt>Nadgodziny</dt>
                                    <dd>{card.data.overtimeMinutes > 0 ? hoursText(card.data.overtimeMinutes) : 'brak'}</dd>
                                </Fact>
                                <Fact>
                                    <dt>Urlop i L4</dt>
                                    <dd>{card.data.leaveWorkingDays > 0 ? daysLabel(card.data.leaveWorkingDays) : 'brak'}</dd>
                                </Fact>
                            </Facts>
                        </Summary>
                        <CardDays days={card.data.days} />
                    </>
                )}
            </ModalContent>

            {footer && <ModalFooter>{footer}</ModalFooter>}
        </ModalShell>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

const NARROW = '(max-width: 560px)';

const SubtitleRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
`;

const HeaderSide = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
`;

const Stepper = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const StepperText = styled.span`
    min-width: 44px;
    text-align: center;
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;

    @media ${NARROW} { display: none; }
`;

const Summary = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Headline = styled.div`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 10px;
`;

const HeadlineValue = styled.span`
    font-size: 26px;
    font-weight: 750;
    letter-spacing: -0.02em;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
`;

const HeadlineLabel = styled.span`
    font-size: 13px;
    color: ${ui.textMuted};
`;

const Facts = styled.dl`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 0;

    @media ${NARROW} { gap: 6px; }
`;

const Fact = styled.div<{ $warn?: boolean }>`
    padding: 8px 12px;
    border-radius: ${ui.radiusRow};
    border: 1px solid ${p => p.$warn ? ui.warnLine : ui.line};
    background: ${p => p.$warn ? ui.warnTint : ui.surfaceSoft};
    min-width: 0;

    dt { font-size: 12px; color: ${p => p.$warn ? ui.warnInk : ui.textMuted}; }
    dd {
        margin: 2px 0 0;
        font-size: 15px;
        font-weight: 700;
        color: ${p => p.$warn ? ui.warnInk : ui.ink};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    @media ${NARROW} { padding: 7px 9px; }
`;

const Muted = styled.span`
    font-size: 12.5px;
    opacity: 0.8;
`;

const Skeleton = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    span {
        display: block;
        height: 18px;
        border-radius: 6px;
        background: ${ui.surfaceAlt};
    }
    span:first-child { width: 45%; height: 28px; }
    span:nth-child(2) { width: 100%; height: 52px; }
    span:nth-child(3) { width: 100%; height: 220px; }
`;

const FooterRow = styled.div`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    @media ${NARROW} {
        flex-wrap: nowrap;
        > button { flex: 0 1 auto; }
    }
`;

/** Miejsce na krok następny w stopce; reszta stopki to akcje drugorzędne. */
const FooterPrimary = styled.div`
    margin-left: auto;
    display: flex;
    justify-content: flex-end;
    min-width: 0;

    @media ${NARROW} {
        flex: 1 1 auto;
        > button { width: 100%; }
    }
`;

/* Na telefonie „Zwróć do poprawy" obok „Zatwierdź kartę" łamało oba przyciski na dwie
   linie - zostaje samo „Zwróć", a czytnik ekranu i tak dostaje pełną nazwę z tekstu. */
const WideOnly = styled.span`
    @media ${NARROW} {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
    }
`;

const FooterNote = styled.span`
    flex: 1 1 200px;
    min-width: 0;
    font-size: 12.5px;
    line-height: 1.45;
    color: ${ui.textMuted};
`;

const Editor = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const EditorHint = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: ${ui.textMuted};
`;

const NoteLabel = styled.label`
    font-size: 13.5px;
    font-weight: 700;
    color: ${ui.ink};
`;

const NoteInput = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    min-height: 72px;
    padding: 10px 12px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusRow};
    font-family: inherit;
    font-size: 14px;
    line-height: 1.45;
    color: ${ui.ink};
    background: ${ui.surface};
    resize: vertical;

    &:focus { outline: none; border-color: ${ui.brand}; box-shadow: 0 0 0 3px ${ui.brandTintHover}; }
    &[aria-invalid='true'] { border-color: ${ui.dangerLine}; }
`;

const NoteError = styled.span`
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.dangerInk};
`;

const DoneMark = styled.span`
    align-self: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    margin-top: 24px;
    border-radius: 50%;
    background: ${ui.okTint};
    border: 1px solid ${ui.okLine};
    color: ${ui.okInk};

    svg { width: 26px; height: 26px; }
`;

const DoneTitle = styled.h3`
    margin: 0;
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    color: ${ui.ink};
`;

const DoneText = styled.p`
    margin: 0 auto;
    max-width: 420px;
    text-align: center;
    font-size: 14px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;
