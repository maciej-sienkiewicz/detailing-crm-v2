// src/modules/employees/components/worktime/MonthView.tsx
//
// Zakładka „Listy miesięczne": jeden przepływ na miesiąc - karty zbierane → karty
// zatwierdzane → lista obecności podpisana (docs/api-worktime-months.md).
//
// Zastąpiła „Rozliczenia" (tabelę wygenerowanych list obecności). Ten sam miesiąc miał
// wtedy dwa niezależne zatwierdzenia: kartę na karcie pracownika i listę generowaną osobno
// z dowolnych osób - menedżer nie miał miejsca, w którym widać, kto złożył, kto nie i co
// czeka na niego. Teraz liczba w nagłówku mówi, ile kart jest zatwierdzonych, pastylki -
// na jakim etapie jest miesiąc, a jedyny wypełniony przycisk - co zrobić teraz
// (CLAUDE.md §2). Nic do zrobienia (zbieranie kart, lista podpisana) = nic wypełnionego.
//
// Miesiąc i otwarta karta są w adresie (`?period=2026-09&card={userId}`): na ten adres
// linkuje push „karta złożona" i podpowiedź na Tablicy, a „wstecz" na telefonie zamyka
// okno karty zamiast wychodzić z modułu.

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
import {
    BellRing, CheckCheck, ChevronLeft, ChevronRight, ClipboardCheck, Download, FileSignature, PenLine, Users,
} from 'lucide-react';
import { EmptyState } from '@/common/components/EmptyState';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { useAuth } from '@/core/context/AuthContext';
import {
    Button, Card, IconButton, Notice, Panel, SectionTitle, StatusPill, StepPills, ui, type StepState,
} from '@/common/components/ui';
import { formatDate, formatDateTime } from '@/common/utils';
import { readBlobErrorMessage, saveBlobAsFile } from '@/common/utils/blobFile';
import { attendanceApi } from '../../api/attendanceApi';
import {
    incompleteSheetNames, type MonthCardRow, type MonthOverview, type MonthSheet,
} from '../../api/worktimeMonthsApi';
import {
    useApproveMany, useCreateSheet, useMonthOverview, useRemind,
} from '../../hooks/useWorktimeMonths';
import { PrimaryAction } from '../leave/PrimaryAction';
import { ApproveAttendanceSheetModal, type SheetToSign } from './ApproveAttendanceSheetModal';
import { CardReviewModal } from './CardReviewModal';
import {
    CARD_STATUS, addMonths, approvableInBulk, awaitingDecision, daysLabel, defaultPeriod, hoursText, hoursVsNorm,
    isPeriod, isSigned, monthOptions, periodInSentence, periodLabel, periodOf, remindable, reusableSheet,
    sheetFileName, stageStep,
} from './monthFormat';

const PERIOD_PARAM = 'period';
const CARD_PARAM = 'card';

const STAGES = [
    { key: 'cards', label: 'Karty' },
    { key: 'review', label: 'Zatwierdzanie' },
    { key: 'sign', label: 'Podpis listy' },
];

interface Props {
    /** Przejście do zespołu - tam widać, której roli liczy się czas pracy. */
    onGoToTeam?: () => void;
}

export function MonthView({ onGoToTeam }: Props) {
    const { showSuccess, showError } = useToast();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // Miesiąc z adresu, o ile jest prawdziwy i nie z przyszłości - inaczej domyślny.
    const current = periodOf(new Date());
    const requested = searchParams.get(PERIOD_PARAM);
    const period = isPeriod(requested) && requested <= current ? requested : defaultPeriod();
    const openCard = searchParams.get(CARD_PARAM);

    const month = useMonthOverview(period);
    const data = month.data?.period === period ? month.data : undefined;
    const rows = data?.employees ?? [];

    const approveMany = useApproveMany(period);
    const remind = useRemind(period);
    const createSheet = useCreateSheet(period);

    const [bulkConfirm, setBulkConfirm] = useState<MonthCardRow[] | null>(null);
    const [incomplete, setIncomplete] = useState<string[] | null>(null);
    const [signing, setSigning] = useState<SheetToSign | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);

    const setPeriod = (next: string) => setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        params.set(PERIOD_PARAM, next);
        params.delete(CARD_PARAM);
        return params;
    });
    const openReview = (userId: string) => setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        params.set(PERIOD_PARAM, period);
        params.set(CARD_PARAM, userId);
        return params;
    });
    // Przejście między kartami w oknie nie odkłada się w historii: „wstecz" ma zamknąć
    // okno, a nie cofać po kolei przez wszystkie przejrzane osoby.
    const navigateReview = (userId: string) => setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        params.set(CARD_PARAM, userId);
        return params;
    }, { replace: true });
    const closeReview = () => setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        params.delete(CARD_PARAM);
        return params;
    }, { replace: true });

    const awaiting = awaitingDecision(rows);
    const bulk = approvableInBulk(rows);
    const toRemind = remindable(rows, Date.now(), user?.userId);
    // `counts.notSubmitted` to NOT_STARTED + DRAFT; zwrócone liczą się osobno, a przypomnienie
    // należy się także im.
    const notSubmitted = data ? data.counts.notSubmitted + data.counts.returned : 0;

    // ── Podpis listy ────────────────────────────────────────────────────────────
    const toSign = (sheet: MonthSheet, overview: MonthOverview): SheetToSign => ({
        id: sheet.id,
        period,
        signed: isSigned(sheet),
        signerName: sheet.approvedByName,
        employeeCount: Math.max(overview.counts.total - sheet.excludedNames.length, 0),
    });

    const startSign = (allowIncomplete = false) => {
        if (!data) return;
        const reuse = allowIncomplete ? null : reusableSheet(data);
        if (reuse) {
            setSigning(toSign(reuse, data));
            return;
        }
        createSheet.mutate(allowIncomplete, {
            onSuccess: sheet => setSigning(toSign(sheet, data)),
            onError: async error => {
                const names = incompleteSheetNames(error);
                if (names) {
                    setIncomplete(names);
                    return;
                }
                showError('Nie udało się utworzyć listy obecności', (await readBlobErrorMessage(error)) ?? 'Spróbuj ponownie za chwilę.');
            },
        });
    };

    const handleDownload = async (sheet: MonthSheet) => {
        setDownloading(sheet.id);
        try {
            saveBlobAsFile(await attendanceApi.downloadAttendanceSheet(sheet.id), sheetFileName(period, isSigned(sheet)));
        } catch (error) {
            showError('Nie udało się pobrać listy', (await readBlobErrorMessage(error)) ?? 'Spróbuj ponownie za chwilę.');
        } finally {
            setDownloading(null);
        }
    };

    const handleBulkApprove = (targets: MonthCardRow[]) => {
        approveMany.mutate(targets.map(r => r.userId), {
            onSuccess: result => {
                if (result.approved.length > 0) {
                    showSuccess(
                        result.approved.length === 1 ? 'Karta zatwierdzona' : `Zatwierdzono karty: ${result.approved.length}`,
                        periodLabel(period),
                    );
                }
                if (result.skipped.length > 0) {
                    // `reason` to gotowe zdanie z backendu („Karta jest zwrócona do poprawy.").
                    const lines = result.skipped.map(s => {
                        const name = rows.find(r => r.userId === s.userId)?.name;
                        return name ? `${name}: ${s.reason}` : s.reason;
                    });
                    showError('Części kart nie zatwierdzono', lines.join(' '));
                }
            },
        });
    };

    const handleRemindAll = () => {
        remind.mutate(toRemind.map(r => r.userId), {
            onSuccess: result => {
                if (result.reminded.length > 0) {
                    showSuccess(
                        'Przypomnienia wysłane',
                        result.reminded.length === 1
                            ? '1 osoba dostanie powiadomienie o karcie.'
                            : `${result.reminded.length} osoby dostaną powiadomienie o karcie.`,
                    );
                } else {
                    showError('Nie wysłano przypomnień', result.skipped[0]?.reason);
                }
            },
        });
    };

    // ── Krok następny: jedyny wypełniony element widoku ────────────────────────
    let nextStep = null;
    if (data?.stage === 'REVIEWING' && awaiting.length > 0) {
        nextStep = (
            <PrimaryAction
                icon={<ClipboardCheck />}
                title={`Przejrzyj karty (${awaiting.length})`}
                sub="zatwierdź albo zwróć do poprawy"
                onClick={() => openReview(awaiting[0].userId)}
            />
        );
    } else if (data?.stage === 'READY_TO_SIGN' || data?.stage === 'NEEDS_RESIGN') {
        nextStep = (
            <PrimaryAction
                icon={<FileSignature />}
                title={data.stage === 'NEEDS_RESIGN'
                    ? 'Podpisz listę ponownie'
                    : `Podpisz listę obecności za ${periodInSentence(period)}`}
                sub={createSheet.isPending ? 'przygotowuję listę…' : 'na tym urządzeniu, tablecie albo telefonie'}
                disabled={createSheet.isPending}
                onClick={() => startSign()}
            />
        );
    } else if (data?.stage === 'SIGNED' && data.sheet) {
        const sheet = data.sheet;
        nextStep = (
            <Button variant="outline" size="lg" onClick={() => handleDownload(sheet)} disabled={downloading === sheet.id}>
                <Download aria-hidden="true" />Pobierz podpisaną listę
            </Button>
        );
    }

    const stage = data ? stageStep(data.stage) : 0;
    const steps = STAGES.map((s, i) => ({
        ...s,
        state: (i < stage ? 'done' : i === stage ? 'active' : 'todo') as StepState,
    }));

    const options = useMemo(() => {
        const list = monthOptions();
        return list.includes(period) ? list : [...list, period];
    }, [period]);

    return (
        <Wrap>
            <MonthBar aria-label="Miesiąc">
                <IconButton label="Poprzedni miesiąc" onClick={() => setPeriod(addMonths(period, -1))}>
                    <ChevronLeft />
                </IconButton>
                <MonthSelect
                    aria-label="Wybierz miesiąc"
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                >
                    {options.map(p => <option key={p} value={p}>{periodLabel(p)}</option>)}
                </MonthSelect>
                <IconButton
                    label="Następny miesiąc"
                    disabled={period >= current}
                    onClick={() => setPeriod(addMonths(period, 1))}
                >
                    <ChevronRight />
                </IconButton>
            </MonthBar>

            {month.isError ? (
                <Notice
                    tone="danger"
                    role="alert"
                    title="Nie udało się wczytać miesiąca"
                    action={<Button variant="ghost" size="sm" onClick={() => month.refetch()}>Spróbuj ponownie</Button>}
                />
            ) : !data ? (
                <MonthCard aria-busy="true" aria-label="Wczytuję miesiąc">
                    <Head><SkeletonBar $w="220px" $h="30px" /></Head>
                    {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i}><SkeletonBar $w={`${40 + (i % 2) * 20}%`} /></SkeletonRow>)}
                </MonthCard>
            ) : data.counts.total === 0 ? (
                <EmptyState
                    icon={<Users />}
                    title="W tym miesiącu nikt nie liczy czasu pracy"
                    description="Karty czasu pracy mają osoby, których rola ma włączony liczony czas pracy."
                >
                    {onGoToTeam && <EmptyAction><Button variant="outline" onClick={onGoToTeam}>Przejdź do zespołu</Button></EmptyAction>}
                </EmptyState>
            ) : (
                <>
                    <MonthCard>
                        <Head>
                            <HeadText>
                                <Headline>
                                    <HeadlineNumber>{data.counts.approved} z {data.counts.total}</HeadlineNumber>
                                    <HeadlineWords>
                                        {data.counts.total === 1 ? 'karty zatwierdzonej' : 'kart zatwierdzonych'}
                                    </HeadlineWords>
                                </Headline>
                                <HeadSub>{data.label}, {daysLabel(data.workingDays)} roboczych</HeadSub>
                            </HeadText>
                            {nextStep && <NextStep>{nextStep}</NextStep>}
                        </Head>

                        <Progress>
                            <StepPills steps={steps} label="Etap miesiąca" />
                        </Progress>

                        {data.stage === 'REVIEWING' && awaiting.length === 0 && (
                            <HeadNote>Złożona karta czeka na decyzję innej osoby - własnej karty nie zatwierdzasz.</HeadNote>
                        )}

                        {(bulk.length > 0 || notSubmitted > 0) && (
                            <Bulk>
                                {bulk.length > 0 && (
                                    <Button variant="tintedSuccess" onClick={() => setBulkConfirm(bulk)} disabled={approveMany.isPending}>
                                        <CheckCheck aria-hidden="true" />Zatwierdź złożone bez braków ({bulk.length})
                                    </Button>
                                )}
                                {notSubmitted > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={handleRemindAll}
                                        disabled={toRemind.length === 0 || remind.isPending}
                                        title={toRemind.length === 0 ? 'Wszyscy dostali przypomnienie w ciągu ostatnich 12 godzin' : undefined}
                                    >
                                        <BellRing aria-hidden="true" />Przypomnij niezłożonym ({toRemind.length})
                                    </Button>
                                )}
                            </Bulk>
                        )}

                        <Table>
                            <TableHead aria-hidden="true">
                                <span>Pracownik</span>
                                <span>Karta</span>
                                <span>Godziny</span>
                                <span>Nadgodziny</span>
                                <span />
                            </TableHead>
                            <ul>
                                {rows.map(row => <MonthRow key={row.userId} row={row} onOpen={() => openReview(row.userId)} />)}
                            </ul>
                        </Table>
                    </MonthCard>

                    <SheetBlock
                        month={data}
                        downloading={downloading}
                        signingPending={createSheet.isPending}
                        onDownload={handleDownload}
                        onSignIncomplete={() => startSign()}
                    />
                </>
            )}

            {openCard && (
                <CardReviewModal
                    key={period}
                    period={period}
                    userId={openCard}
                    onNavigate={navigateReview}
                    onClose={closeReview}
                    onSign={() => { closeReview(); startSign(); }}
                />
            )}

            {signing && <ApproveAttendanceSheetModal sheet={signing} onClose={() => setSigning(null)} />}

            <ConfirmationModal
                isOpen={bulkConfirm !== null}
                title={bulkConfirm?.length === 1 ? 'Zatwierdzić kartę?' : `Zatwierdzić ${bulkConfirm?.length ?? 0} karty?`}
                message={`${bulkConfirm?.map(r => r.name).join(', ') ?? ''}. Każda z tych kart jest złożona i nie ma brakujących dni roboczych.`}
                variant="info"
                confirmText="Zatwierdź"
                onConfirm={() => { if (bulkConfirm) handleBulkApprove(bulkConfirm); }}
                onCancel={() => setBulkConfirm(null)}
            />

            <ConfirmationModal
                isOpen={incomplete !== null}
                title="Podpisać listę bez wszystkich kart?"
                message={`Podpisać bez: ${incomplete?.join(', ') ?? ''}? Ich karty nie są zatwierdzone. Na liście nie będzie ich kolumn, a nazwiska trafią do stopki dokumentu.`}
                variant="warning"
                confirmText="Podpisz bez nich"
                onConfirm={() => startSign(true)}
                onCancel={() => setIncomplete(null)}
            />
        </Wrap>
    );
}

// ─── Wiersz pracownika ──────────────────────────────────────────────────────────

function MonthRow({ row, onOpen }: { row: MonthCardRow; onOpen: () => void }) {
    const status = CARD_STATUS[row.status];
    return (
        <li>
            <RowButton
                type="button"
                onClick={onOpen}
                aria-label={`Otwórz kartę: ${row.name}, ${status.label}`}
                data-testid="month-row"
            >
                <Who>
                    <Name>{row.name}</Name>
                    {row.remindedAt && <Meta>przypomniano {formatDate(row.remindedAt, 'pl-PL', { day: '2-digit', month: '2-digit' })}</Meta>}
                </Who>
                <Cell data-area="status">
                    <StatusPill $tone={status.tone}>{status.label}</StatusPill>
                </Cell>
                <Cell data-area="hours">
                    <Hours>{hoursVsNorm(row.totalMinutes, row.expectedMinutes)}</Hours>
                    {row.missingWorkingDays > 0 && <Missing>brak {daysLabel(row.missingWorkingDays)}</Missing>}
                </Cell>
                <Cell data-area="overtime">
                    {row.overtimeMinutes > 0
                        ? <Overtime>+{hoursText(row.overtimeMinutes)}<NarrowOnly> nadgodzin</NarrowOnly></Overtime>
                        : <Faint aria-hidden="true">-</Faint>}
                </Cell>
                <Chevron aria-hidden="true"><ChevronRight /></Chevron>
            </RowButton>
        </li>
    );
}

// ─── Lista obecności ────────────────────────────────────────────────────────────

interface SheetBlockProps {
    month: MonthOverview;
    downloading: string | null;
    signingPending: boolean;
    onDownload: (sheet: MonthSheet) => void;
    onSignIncomplete: () => void;
}

function SheetBlock({ month, downloading, signingPending, onDownload, onSignIncomplete }: SheetBlockProps) {
    const { sheet, sheetHistory, stage, counts } = month;
    const collecting = stage === 'COLLECTING' || stage === 'REVIEWING';

    let status = null;
    if (!sheet) {
        status = (
            <SheetText>
                {collecting
                    ? 'Lista powstanie z zatwierdzonych kart. Gdy wszystkie będą zatwierdzone, podpiszesz ją tutaj.'
                    : 'Wszystkie karty są zatwierdzone - lista czeka na podpis.'}
            </SheetText>
        );
    } else if (isSigned(sheet)) {
        status = (
            <>
                <SheetLine>
                    <StatusPill $tone="ok"><PenLine aria-hidden="true" />Podpisana</StatusPill>
                    {sheet.outdated && <StatusPill $tone="warn">Nieaktualna</StatusPill>}
                    <SheetText as="span">
                        {[sheet.approvedByName, sheet.approvedAt && formatDateTime(sheet.approvedAt)].filter(Boolean).join(', ')}
                    </SheetText>
                </SheetLine>
                {sheet.outdated && (
                    <SheetText>Po podpisie zmieniła się karta na tej liście - trzeba podpisać ją ponownie.</SheetText>
                )}
            </>
        );
    } else if (sheet.outdated) {
        // Niepodpisana lista też się dezaktualizuje (karta odblokowana albo zatwierdzona po
        // jej wygenerowaniu) - backend nie przyjmie już jej podpisu. Krok następny zostaje
        // zwykłym „Podpisz listę": przy podpisie powstaje nowa.
        status = (
            <>
                <SheetLine>
                    <StatusPill $tone="warn">Nieaktualna</StatusPill>
                    <SheetText as="span">przygotowana {formatDateTime(sheet.generatedAt)}</SheetText>
                </SheetLine>
                <SheetText>Karta zmieniła się po przygotowaniu tej listy. Przy podpisie powstanie nowa.</SheetText>
            </>
        );
    } else {
        status = (
            <SheetLine>
                <StatusPill $tone="warn">Czeka na podpis</StatusPill>
                <SheetText as="span">przygotowana {formatDateTime(sheet.generatedAt)}</SheetText>
            </SheetLine>
        );
    }

    return (
        <SheetPanel aria-labelledby="month-sheet-title">
            <SheetHead>
                <SectionTitle id="month-sheet-title" as="h3">Lista obecności za {periodInSentence(month.period)}</SectionTitle>
                {/* Przy podpisanej, aktualnej liście pobranie stoi już w nagłówku miesiąca. */}
                {sheet && stage !== 'SIGNED' && (
                    <Button variant="ghost" size="sm" onClick={() => onDownload(sheet)} disabled={downloading === sheet.id}>
                        <Download aria-hidden="true" />Pobierz PDF
                    </Button>
                )}
            </SheetHead>
            <SheetBody>
                {status}
                {sheet && sheet.excludedNames.length > 0 && (
                    <SheetText>Bez zatwierdzonej karty: {sheet.excludedNames.join(', ')}.</SheetText>
                )}
                {/* Miesiąc trzeba zamknąć także wtedy, gdy ktoś karty nie złoży (długie L4,
                    odejście) - to świadomy wyjątek, więc akcja jest w tle, nie wypełniona. */}
                {collecting && !sheet && counts.approved > 0 && (
                    <div>
                        <Button variant="ghost" size="sm" onClick={onSignIncomplete} disabled={signingPending}>
                            Podpisz listę bez brakujących kart
                        </Button>
                    </div>
                )}
                {sheetHistory.length > 0 && (
                    <History>
                        <summary>Wcześniejsze wersje ({sheetHistory.length})</summary>
                        <ul>
                            {sheetHistory.map(old => (
                                <li key={old.id}>
                                    <span>
                                        {isSigned(old) ? 'Podpisana' : 'Przygotowana'}{' '}
                                        {formatDateTime(old.approvedAt ?? old.generatedAt)}
                                        {old.approvedByName ? `, ${old.approvedByName}` : ''}
                                    </span>
                                    <Button variant="ghost" size="sm" onClick={() => onDownload(old)} disabled={downloading === old.id}>
                                        <Download aria-hidden="true" />PDF
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </History>
                )}
            </SheetBody>
        </SheetPanel>
    );
}

// ─── Styled ─────────────────────────────────────────────────────────────────────

/** Poniżej tej szerokości karty wiersz pracownika ma dwie linie zamiast kolumn. */
const NARROW = '(max-width: 680px)';
const GRID = 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 0.8fr) 20px';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

const MonthBar = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const MonthSelect = styled.select`
    height: 36px;
    min-width: 180px;
    padding: 0 34px 0 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusControl};
    background: ${ui.surface} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 12px center;
    appearance: none;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
    cursor: pointer;

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
    @media (hover: none) and (pointer: coarse) { height: 44px; flex: 1; }
`;

const MonthCard = styled(Card)`
    container-type: inline-size;
    container-name: month;
`;

const Head = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px 20px;
    padding: 22px 24px 14px;

    @container month ${NARROW} { padding: 18px 16px 12px; }
`;

const HeadText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

const Headline = styled.h2`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 10px;
    margin: 0;
`;

const HeadlineNumber = styled.span`
    font-size: 30px;
    line-height: 1.1;
    font-weight: 750;
    letter-spacing: -0.02em;
    color: ${ui.ink};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const HeadlineWords = styled.span`
    font-size: 16px;
    font-weight: 600;
    color: ${ui.inkSoft};
`;

const HeadSub = styled.span`
    font-size: 13.5px;
    color: ${ui.textMuted};
`;

const NextStep = styled.div`
    display: flex;
    min-width: 0;

    @container month ${NARROW} {
        width: 100%;
        > button { width: 100%; }
    }
`;

const Progress = styled.div`
    padding: 0 24px 16px;
    overflow-x: auto;

    @container month ${NARROW} { padding: 0 16px 14px; }
`;

const HeadNote = styled.p`
    margin: 0;
    padding: 0 24px 14px;
    font-size: 13px;
    color: ${ui.textMuted};

    @container month ${NARROW} { padding: 0 16px 12px; }
`;

const Bulk = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0 24px 16px;

    @container month ${NARROW} {
        padding: 0 16px 14px;
        > button { flex: 1 1 100%; }
    }
`;

const Table = styled.div`
    border-top: 1px solid ${ui.lineFaint};

    ul { margin: 0; padding: 0; list-style: none; }
    li { border-bottom: 1px solid ${ui.lineFaint}; }
    li:last-child { border-bottom: none; }
`;

const TableHead = styled.div`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 14px;
    padding: 10px 24px;
    background: ${ui.surfaceSoft};
    border-bottom: 1px solid ${ui.lineFaint};
    font-size: 12.5px;
    font-weight: 600;
    color: ${ui.textMuted};

    @container month ${NARROW} { display: none; }
`;

const RowButton = styled.button`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 14px;
    align-items: center;
    width: 100%;
    min-height: 56px;
    padding: 10px 24px;
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 120ms ease;
    -webkit-tap-highlight-color: transparent;

    &:hover { background: ${ui.surfaceSoft}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: -2px; }

    /* Telefon: dwie linie - kto i w jakim stanie, a pod spodem liczby obok siebie. */
    @container month ${NARROW} {
        grid-template-columns: auto minmax(0, 1fr) auto 16px;
        grid-template-areas:
            'who who status chevron'
            'hours overtime overtime chevron';
        gap: 6px 12px;
        padding: 12px 16px;

        > :nth-child(1) { grid-area: who; }
        > [data-area='status'] { grid-area: status; }
        > [data-area='hours'] { grid-area: hours; }
        > [data-area='overtime'] { grid-area: overtime; }
        > [data-area='overtime'] > [aria-hidden='true'] { display: none; }
        > :last-child { grid-area: chevron; }
    }
`;

const Who = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const Name = styled.span`
    font-size: 14.5px;
    font-weight: 650;
    color: ${ui.ink};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Meta = styled.span`
    font-size: 12px;
    color: ${ui.textMuted};
`;

const Cell = styled.span`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 10px;
    min-width: 0;
`;

const Hours = styled.span`
    font-size: 13.5px;
    font-weight: 600;
    color: ${ui.inkSoft};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

const amber = css`
    color: ${ui.warnInk};
    font-weight: 600;
`;

const Missing = styled.span`
    ${amber}
    font-size: 12.5px;
    white-space: nowrap;
`;

const Overtime = styled.span`
    font-size: 13px;
    color: ${ui.inkSoft};
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
`;

/* W kolumnie „Nadgodziny" wystarczy liczba; w dwóch liniach na telefonie - z podpisem. */
const NarrowOnly = styled.span`
    display: none;
    @container month ${NARROW} { display: inline; }
`;

const Faint = styled.span`
    color: ${ui.textFaint};
`;

const Chevron = styled.span`
    display: flex;
    color: ${ui.textFaint};
    svg { width: 16px; height: 16px; }
`;

const SheetPanel = styled(Panel)`
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;

    @media (max-width: 640px) { padding: 14px 16px; }
`;

const SheetHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    flex-wrap: wrap;
`;

const SheetBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SheetLine = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
`;

const SheetText = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.textSecondary};
`;

const History = styled.details`
    font-size: 13px;
    color: ${ui.textSecondary};

    summary {
        cursor: pointer;
        font-weight: 600;
        color: ${ui.textSecondary};
        padding: 4px 0;
    }
    ul { margin: 6px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
    li { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
`;

const EmptyAction = styled.div`
    margin-top: 14px;
`;

const SkeletonRow = styled.div`
    padding: 16px 24px;
    border-top: 1px solid ${ui.lineFaint};
`;

const SkeletonBar = styled.span<{ $w: string; $h?: string }>`
    display: block;
    width: ${p => p.$w};
    height: ${p => p.$h ?? '16px'};
    border-radius: 6px;
    background: ${ui.surfaceAlt};
`;
