import { useState } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, ExternalLink, EyeOff, MapPin, Settings } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { SharedButton } from '@/common/styles';
import type { AreaResults, AdvertiserRow } from '../types';
import { Card, CardTitle, CardHint, CenterState, Spinner, formatExact } from './MetricBits';
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

const CountPill = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 11px;
    border-radius: ${st.radiusFull};
    background: ${st.accentGreenDim};
    color: #047857;
    font-size: 12.5px;
    font-weight: 700;
    white-space: nowrap;
`;

// ── Akcje wiersza ─────────────────────────────────────────────────────────────

/**
 * Ikony zamiast przycisków z napisem, ale WIDOCZNE od początku.
 *
 * Pierwsza wersja odsłaniała je dopiero przy najechaniu — tabela wyglądała
 * spokojniej, tylko że nikt nie miał jak się dowiedzieć, że da się kogoś ukryć,
 * a na dotyku nie ma czym najechać. Przygaszone, pełny kontrast na hover i focus.
 */
const RowActions = styled.div`
    display: inline-flex;
    gap: 4px;
    justify-content: flex-end;
`;

const actionBase = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: ${st.radiusSm};
    border: 1px solid transparent;
    background: none;
    cursor: pointer;
    opacity: 0.55;
    transition: all ${st.transition};

    svg { width: 15px; height: 15px; }
    &:focus-visible { opacity: 1; outline: 2px solid ${st.accentBlue}; outline-offset: 1px; }
`;

const PreviewLink = styled.a`
    ${actionBase}
    color: ${st.textSecondary};
    text-decoration: none;

    &:hover { opacity: 1; color: ${st.accentBlue}; border-color: ${st.border}; background: ${st.accentBlueDim}; }
`;

const HideButton = styled.button`
    ${actionBase}
    color: ${st.textSecondary};
    font-family: inherit;

    &:hover:not(:disabled) { opacity: 1; color: ${st.accentRed}; border-color: ${st.border}; background: ${st.accentRedDim}; }
    &:disabled { cursor: default; opacity: 0.25; }
`;

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

// ── Tabela (gdy karta ma miejsce) ─────────────────────────────────────────────

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;

    /* Próg dobrany do treści, nie do urządzenia: najwęższy sensowny układ tej
       tabeli to ~480 px. Niżej idą karty — także wtedy, gdy okno jest szerokie,
       a wąska jest sama kolumna siatki. */
    @container (max-width: 520px) { display: none; }
`;

const Th = styled.th<{ $num?: boolean }>`
    text-align: ${p => (p.$num ? 'right' : 'left')};
    padding: 8px 10px;
    color: ${st.textMuted};
    font-size: ${st.fontXs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-bottom: 1px solid ${st.border};
    white-space: nowrap;
`;

const Td = styled.td<{ $num?: boolean }>`
    text-align: ${p => (p.$num ? 'right' : 'left')};
    padding: 10px;
    color: ${st.text};
    border-bottom: 1px solid ${st.border};
    vertical-align: middle;
    font-variant-numeric: ${p => (p.$num ? 'tabular-nums' : 'normal')};

    tbody tr:last-child & { border-bottom: none; }
`;

const Company = styled.span`
    display: block;
    font-weight: 700;
`;

const Handle = styled.a`
    display: inline-block;
    margin-top: 2px;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    text-decoration: none;
    overflow-wrap: anywhere;

    &:hover { color: ${st.accentBlue}; text-decoration: underline; }
`;

// ── Karty (do 640 px) ─────────────────────────────────────────────────────────

const CardList = styled.ul`
    display: none;
    list-style: none;
    margin: 0;
    padding: 0;

    @container (max-width: 520px) { display: block; }
`;

const AdvertiserCard = styled.li`
    padding: 12px 0;
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
`;

const CardTop = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
`;

const CardStats = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 8px;

    div {
        font-size: ${st.fontXs};
        color: ${st.textMuted};
        strong {
            display: block;
            margin-top: 1px;
            font-size: ${st.fontSm};
            font-weight: 700;
            color: ${st.text};
            font-variant-numeric: tabular-nums;
        }
    }
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
        <PreviewLink
            href={row.adLibraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Zobacz reklamy w Bibliotece Meta"
            aria-label={`Zobacz reklamy firmy ${row.companyName} w Bibliotece Meta`}
        >
            <ExternalLink />
        </PreviewLink>
        <HideButton
            type="button"
            title="Ukryj tę firmę w moich tabelach"
            aria-label={`Ukryj firmę ${row.companyName}`}
            disabled={busy}
            onClick={onHide}
        >
            <EyeOff />
        </HideButton>
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
                    <Table>
                        <thead>
                            <tr>
                                <Th>Firma</Th>
                                <Th $num>Aktywne reklamy</Th>
                                <Th $num>Zasięg (UE)</Th>
                                <Th $num aria-label="Akcje" />
                            </tr>
                        </thead>
                        <tbody>
                            {results.advertisers.map(row => (
                                <tr key={row.pageId}>
                                    <Td>
                                        <Company>{row.companyName}</Company>
                                        {row.instagram && (
                                            <Handle
                                                href={`https://www.instagram.com/${row.instagram}/`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                @{row.instagram}
                                            </Handle>
                                        )}
                                    </Td>
                                    <Td $num>{row.activeAds}</Td>
                                    <Td $num>{formatExact(row.reach)}</Td>
                                    <Td $num>
                                        <Actions row={row} busy={blockMut.isPending} onHide={() => hide(row)} />
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    <CardList>
                        {results.advertisers.map(row => (
                            <AdvertiserCard key={row.pageId}>
                                <CardTop>
                                    <div style={{ minWidth: 0 }}>
                                        <Company>{row.companyName}</Company>
                                        {row.instagram && (
                                            <Handle
                                                href={`https://www.instagram.com/${row.instagram}/`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                @{row.instagram}
                                            </Handle>
                                        )}
                                    </div>
                                    <Actions row={row} busy={blockMut.isPending} onHide={() => hide(row)} />
                                </CardTop>
                                <CardStats>
                                    <div>Aktywne reklamy<strong>{row.activeAds}</strong></div>
                                    <div>Zasięg (UE)<strong>{formatExact(row.reach)}</strong></div>
                                </CardStats>
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
                            {resultsQuery.data.totalAdvertisers > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <CountPill>
                                        {resultsQuery.data.totalAdvertisers} firm · {resultsQuery.data.totalActiveAds}{' '}
                                        aktywnych reklam
                                    </CountPill>
                                </div>
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
