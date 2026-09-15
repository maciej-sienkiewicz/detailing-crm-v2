import { useState } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, ExternalLink, EyeOff, MapPin, Settings } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { SharedButton } from '@/common/styles';
import type { AreaResults, AdvertiserRow } from '../types';
import { Card, CardTitle, CardHint, CenterState, Spinner, formatExact } from './MetricBits';
import {
    Table, Th, Td, Row, NameCell, NameText, MetaLink, NumLive, NumQuiet,
    IconBtn, IconLink, RowActions, HiddenLabel, ROW_HEIGHT, INK_MUTED,
} from './DataTable';
import { AreaConfigModal, phraseWord } from './AreaConfigModal';
import { useAreaResults, useAreaSettings, useBlockAdvertiser } from '../hooks/useAreaDiscovery';

/**
 * „Reklamodawcy w okolicy" — kto jeszcze reklamuje się w moim rejonie.
 *
 * Frazy pochodzą ze wspólnego katalogu ustalonego przez administratora, rejon
 * wskazuje studio. Ustawianie siedzi w modalu pod kołem zębatym — tu tylko oglądasz.
 *
 * Tabela jest STRONICOWANA: reklamodawców w rejonie potrafi być kilkuset, a karta
 * stoi obok podsumowania roku, więc pełna lista rozciągałaby ekran bez powodu.
 *
 * Na wąskim ekranie tabela zamienia się w listę kart. Cztery kolumny nie mieszczą
 * się na 390 px w żaden sposób — poziome przewijanie ucinało zasięg w połowie liczby.
 */

const HeadRow = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
`;

const GearButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { border-color: ${st.borderHover}; color: ${st.text}; }
    svg { width: 17px; height: 17px; }
`;

const AreaLine = styled.p`
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 12px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    overflow-wrap: anywhere;

    svg { width: 14px; height: 14px; flex-shrink: 0; color: ${st.textMuted}; }
    strong { color: ${st.text}; font-weight: 600; }
`;


// ── Akcje wiersza ─────────────────────────────────────────────────────────────

/**
 * Ikony zamiast przycisków z napisem, ale WIDOCZNE od początku.
 *
 * Pierwsza wersja odsłaniała je dopiero przy najechaniu — tabela wyglądała
 * spokojniej, tylko że nikt nie miał jak się dowiedzieć, że da się kogoś ukryć,
 * a na dotyku nie ma czym najechać. Przygaszone, pełny kontrast na hover i focus.
 */
/**
 * Karta sekcji jest KONTENEREM zapytań i to jej własna szerokość decyduje
 * o układzie środka.
 *
 * Wcześniej o przełączeniu tabela↔karty decydowało `@media`, czyli szerokość
 * OKNA. Ta sekcja stoi jednak obok „Podsumowania roku" w siatce dwukolumnowej:
 * przy oknie 1100 px dostawała ~520 px, a zapytanie widziało 1100 px i zostawiało
 * tabelę. Tabela nie mieściła się w torze i — bo element siatki ma domyślne
 * `min-width: auto` — wylewała się na sąsiedni panel, malując swoje kolumny
 * na cudzych wierszach.
 *
 * `container-type: inline-size` załatwia oba problemy naraz: daje jednostkę
 * odniesienia zapytaniom niżej i odcina wpływ treści na szerokość karty, więc
 * nic nie jest już w stanie rozepchnąć jej poza tor.
 */
const AreaCard = styled(Card)`
    container-type: inline-size;
    min-width: 0;
`;

const Tally = styled.p`
    margin: 0 0 12px;
    font-size: 13px;
    color: ${INK_MUTED};
    font-variant-numeric: tabular-nums;

    strong { color: ${st.text}; font-weight: 600; }
`;

// ── Tabela ────────────────────────────────────────────────────────────────────

const COL = { active: '64px', reach: '104px', act: '72px' };

/**
 * Tory liczbowe w tych samych szerokościach co w „Podsumowaniu roku" — obie
 * tabele mają się czytać jako jedna, bo pokazują tę samą strukturę danych.
 */

/**
 * Poniżej tej szerokości karty tabela ustępuje kartom.
 *
 * Ten sam próg co w panelu obok. Wcześniej panele przełączały się przy 520 i
 * 640 px, więc stojąc ramię w ramię zmieniały układ w dwóch różnych momentach —
 * przy pewnych szerokościach okna jeden był tabelą, drugi kartami.
 */
const CARDS_BELOW = 480;

const AreaTable = styled(Table)`
    @container (max-width: ${CARDS_BELOW}px) { display: none; }
`;

// ── Karty (gdy karta jest wąska) ──────────────────────────────────────────────

const CardList = styled.ul`
    display: none;
    list-style: none;
    margin: 0;
    padding: 0;

    @container (max-width: ${CARDS_BELOW}px) { display: block; }
`;

const AdvertiserCard = styled.li`
    display: flex;
    align-items: center;
    gap: 0;
    min-height: ${ROW_HEIGHT}px;
    padding: 8px 0;
    border-bottom: 1px solid ${st.border};

    &:last-child { border-bottom: none; }
`;

/**
 * W układzie kartowym liczby stoją obok siebie w stałych torach, a nie pod
 * etykietami — dzięki temu kolumna „aktywnych" nadal tworzy jedną oś, po
 * której oko zjeżdża w dół. Etykiety są w nagłówku listy, nie przy każdej
 * wartości: przy dziesięciu wierszach było ich dwadzieścia i wszystkie
 * powtarzały to samo.
 */
const CardActions = styled.div`
    width: ${COL.act};
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
`;

const CardNums = styled.div`
    display: flex;
    align-items: baseline;
    margin-left: 12px;
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${st.text};
    white-space: nowrap;

    /*
     * STAŁE tory, te same co w tabeli — nie odstęp. Przy zmiennej szerokości
     * „12" i „8" lądują na różnych pozycjach i kolumna przestaje być kolumną;
     * oko musi szukać każdej wartości osobno, zamiast zjechać jedną osią.
     */
    > * {
        display: inline-block;
        text-align: right;
    }
    > *:nth-child(1) { width: ${COL.active}; }
    > *:nth-child(2) { width: ${COL.reach}; }
`;

/** Nagłówek listy kartowej — tu mieszkają etykiety wyjęte z wierszy. */
const CardHead = styled.div`
    display: flex;
    align-items: baseline;
    padding-bottom: 8px;
    border-bottom: 1px solid ${st.border};
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${INK_MUTED};
    white-space: nowrap;

    span { display: inline-block; text-align: right; }
    span:first-child { margin-right: auto; text-align: left; }
    span:nth-child(2) { width: ${COL.active}; }
    span:nth-child(3) { width: ${COL.reach}; }

    /* Czwarty, pusty tor nad kolumną akcji. Bez niego „ZASIĘG" wypada nad
       ikonami, a nie nad liczbami, które opisuje. */
    span:nth-child(4) { width: ${COL.act}; }
`;

// ── Stronicowanie ─────────────────────────────────────────────────────────────

const Pager = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid ${st.border};
    font-size: ${st.fontSm};
    color: ${st.textMuted};
    font-variant-numeric: tabular-nums;
`;

const PagerButtons = styled.div`
    display: inline-flex;
    gap: 6px;
`;

const PagerBtn = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: ${st.radiusSm};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover:not(:disabled) { border-color: ${st.borderHover}; color: ${st.text}; }
    &:disabled { opacity: 0.35; cursor: default; }
    svg { width: 16px; height: 16px; }
`;

const Notice = styled.div<{ $tone: 'info' | 'warn' }>`
    margin-top: 14px;
    padding: 10px 13px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    border: 1px solid ${p => (p.$tone === 'warn' ? st.accentAmber : st.border)};
    background: ${p => (p.$tone === 'warn' ? st.accentAmberDim : st.bgCardAlt)};
    color: ${st.text};
    strong { font-weight: 700; }
`;

const advertiserWord = (n: number): string => {
    if (n === 1) return 'reklamodawcę';
    const last = n % 10;
    const lastTwo = n % 100;
    if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'reklamodawców';
    return 'reklamodawców';
};

const Actions = ({ row, onHide, busy }: { row: AdvertiserRow; onHide: () => void; busy: boolean }) => (
    <RowActions>
        <IconLink
            href={row.adLibraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Zobacz reklamy w Bibliotece Meta"
            aria-label={`Zobacz reklamy firmy ${row.companyName} w Bibliotece Meta`}
        >
            <ExternalLink />
        </IconLink>
        <IconBtn
            type="button"
            title="Ukryj tę firmę w moich tabelach"
            aria-label={`Ukryj firmę ${row.companyName}`}
            disabled={busy}
            onClick={onHide}
        >
            <EyeOff />
        </IconBtn>
    </RowActions>
);

const Results = ({ results, page, onPage }: { results: AreaResults; page: number; onPage: (p: number) => void }) => {
    const blockMut = useBlockAdvertiser();
    const hide = (row: AdvertiserRow) => blockMut.mutate({ pageId: row.pageId, pageName: row.companyName });

    const notVerified = results.phraseStatuses.some(s => s.status === 'NOT_VERIFIED');
    const rateLimited = results.phraseStatuses.some(s => s.status === 'RATE_LIMITED');
    const errored = results.phraseStatuses.some(s => s.status === 'ERROR');
    const pending = results.phraseStatuses.some(s => s.status === 'PENDING');
    const truncated = results.phraseStatuses.filter(s => s.truncated).map(s => s.phrase);

    const pages = Math.max(1, Math.ceil(results.totalAdvertisers / results.pageSize));
    const from = results.totalAdvertisers === 0 ? 0 : page * results.pageSize + 1;
    const to = Math.min((page + 1) * results.pageSize, results.totalAdvertisers);

    if (!results.configured) {
        return (
            <CenterState>
                <strong>Biblioteka reklam Meta nie jest skonfigurowana</strong>
                <span>Bez tokena nie da się sprawdzić, kto reklamuje się w okolicy.</span>
            </CenterState>
        );
    }

    return (
        <div>
            {results.advertisers.length === 0 ? (
                <CenterState>
                    <strong>Nikt się tu nie reklamuje na te frazy</strong>
                    <span>Nie znaleźliśmy aktywnych reklam z targetowaniem na wskazany rejon.</span>
                </CenterState>
            ) : (
                <>
                    <AreaTable>
                        <colgroup>
                            <col />
                            <col style={{ width: COL.active }} />
                            <col style={{ width: COL.reach }} />
                            <col style={{ width: COL.act }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <Th>Firma</Th>
                                <Th $num>Aktywne</Th>
                                <Th $num>Zasięg</Th>
                                <Th $num><HiddenLabel>Akcje</HiddenLabel></Th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.advertisers.map(row => (
                                <Row key={row.pageId}>
                                    <Td>
                                        <NameCell>
                                            <NameText title={row.companyName}>{row.companyName}</NameText>
                                            {row.instagram && (
                                                <MetaLink
                                                    href={`https://www.instagram.com/${row.instagram}/`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    @{row.instagram}
                                                </MetaLink>
                                            )}
                                        </NameCell>
                                    </Td>
                                    <Td $num>
                                        <NumLive $on={row.activeAds > 0}>{row.activeAds}</NumLive>
                                    </Td>
                                    <Td $num>
                                        {row.reach !== null
                                            ? formatExact(row.reach)
                                            : <NumQuiet>{formatExact(null)}</NumQuiet>}
                                    </Td>
                                    <Td $num>
                                        <Actions row={row} busy={blockMut.isPending} onHide={() => hide(row)} />
                                    </Td>
                                </Row>
                            ))}
                        </tbody>
                    </AreaTable>

                    <CardList>
                        <CardHead aria-hidden="true">
                            <span>Firma</span>
                            <span>Aktywne</span>
                            <span>Zasięg</span>
                            <span />
                        </CardHead>
                        {results.advertisers.map(row => (
                            <AdvertiserCard key={row.pageId}>
                                <NameCell style={{ flex: 1, minWidth: 0 }}>
                                    <NameText title={row.companyName}>{row.companyName}</NameText>
                                    {row.instagram && (
                                        <MetaLink
                                            href={`https://www.instagram.com/${row.instagram}/`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            @{row.instagram}
                                        </MetaLink>
                                    )}
                                </NameCell>
                                <CardNums>
                                    <NumLive $on={row.activeAds > 0}>{row.activeAds}</NumLive>
                                    <span>{formatExact(row.reach)}</span>
                                </CardNums>
                                <CardActions>
                                    <Actions row={row} busy={blockMut.isPending} onHide={() => hide(row)} />
                                </CardActions>
                            </AdvertiserCard>
                        ))}
                    </CardList>

                    {pages > 1 && (
                        <Pager>
                            <span>
                                {from}–{to} z {results.totalAdvertisers}
                            </span>
                            <PagerButtons>
                                <PagerBtn
                                    type="button"
                                    aria-label="Poprzednia strona"
                                    disabled={page === 0}
                                    onClick={() => onPage(page - 1)}
                                >
                                    <ChevronLeft />
                                </PagerBtn>
                                <PagerBtn
                                    type="button"
                                    aria-label="Następna strona"
                                    disabled={page >= pages - 1}
                                    onClick={() => onPage(page + 1)}
                                >
                                    <ChevronRight />
                                </PagerBtn>
                            </PagerButtons>
                        </Pager>
                    )}
                </>
            )}

            {results.hiddenAdvertisers > 0 && (
                <Notice $tone="info">
                    Ukryto <strong>{results.hiddenAdvertisers}</strong>{' '}
                    {advertiserWord(results.hiddenAdvertisers)} — własnych i odsianych globalnie.
                    Własne przywrócisz w ustawieniach pod kołem zębatym.
                </Notice>
            )}
            {notVerified && (
                <Notice $tone="warn">
                    <strong>Konto Meta niezweryfikowane.</strong> Biblioteka reklam nie zwraca reklam,
                    dopóki konto nie przejdzie weryfikacji tożsamości (facebook.com/ads/library/api).
                </Notice>
            )}
            {rateLimited && (
                <Notice $tone="warn">
                    <strong>Chwilowy limit zapytań do Meta.</strong> Część fraz nie odświeżyła się teraz —
                    dane mogą być niepełne. Spróbuj ponownie za chwilę.
                </Notice>
            )}
            {errored && !rateLimited && (
                <Notice $tone="warn">
                    <strong>Nie udało się pobrać części fraz.</strong> Tabela może być niepełna —
                    spróbuj ponownie za chwilę.
                </Notice>
            )}
            {pending && !rateLimited && !errored && (
                <Notice $tone="info">Część fraz jest właśnie pobierana — odśwież za moment.</Notice>
            )}
            {truncated.length > 0 && (
                <Notice $tone="warn">
                    <strong>Fraza zbyt ogólna:</strong> {truncated.join(', ')}. Reklam było więcej, niż zdążyliśmy
                    przejrzeć — tabela może być niepełna.
                </Notice>
            )}
        </div>
    );
};

export const AreaSection = () => {
    const settingsQuery = useAreaSettings();
    const [page, setPage] = useState(0);
    const [configOpen, setConfigOpen] = useState(false);

    const settings = settingsQuery.data;
    const hasArea = (settings?.locations.length ?? 0) > 0;
    const resultsQuery = useAreaResults(page);

    return (
        <AreaCard>
            <HeadRow>
                <CardTitle>Reklamodawcy w okolicy</CardTitle>
                <GearButton
                    type="button"
                    aria-label="Ustawienia rejonu"
                    title="Ustawienia rejonu"
                    onClick={() => setConfigOpen(true)}
                >
                    <Settings />
                </GearButton>
            </HeadRow>

            {hasArea ? (
                <>
                    <AreaLine>
                        <MapPin />
                        <span>
                            <strong>{settings!.locations.join(', ')}</strong> ·{' '}
                            {settings!.trackedPhraseCount} {phraseWord(settings!.trackedPhraseCount)} z katalogu
                        </span>
                    </AreaLine>

                    {resultsQuery.isLoading ? (
                        <CenterState><Spinner /></CenterState>
                    ) : resultsQuery.data ? (
                        <>
                            {/*
                              * Zwykły tekst, nie zielona pigułka. Zieleń znaczy na tym
                              * ekranie „emituje teraz"; użyta pod licznikiem czytała się
                              * jak odznaka sukcesu przypięta konkurencji.
                              */}
                            {resultsQuery.data.totalAdvertisers > 0 && (
                                <Tally>
                                    <strong>{resultsQuery.data.totalAdvertisers}</strong> firm ·{' '}
                                    <strong>{resultsQuery.data.totalActiveAds}</strong> aktywnych reklam
                                </Tally>
                            )}
                            <Results results={resultsQuery.data} page={page} onPage={setPage} />
                        </>
                    ) : (
                        <CenterState>
                            <strong>Nie udało się pobrać wyników</strong>
                            <span>Spróbuj odświeżyć stronę za chwilę.</span>
                        </CenterState>
                    )}
                </>
            ) : (
                <>
                    <CardHint>
                        Kto jeszcze reklamuje się w Twojej okolicy. Frazy pochodzą ze wspólnego katalogu
                        branżowego — wskaż tylko rejon, w którym mam patrzeć.
                    </CardHint>
                    <CenterState>
                        <strong>Rejon nie jest jeszcze ustawiony</strong>
                        <span>Wskaż miejscowości, a pokażemy, kto reklamuje się na tym terenie.</span>
                        <SharedButton $variant="primary" $size="sm" onClick={() => setConfigOpen(true)}>
                            <MapPin size={15} /> Ustaw rejon
                        </SharedButton>
                    </CenterState>
                </>
            )}

            <AreaConfigModal isOpen={configOpen} onClose={() => setConfigOpen(false)} />
        </AreaCard>
    );
};
