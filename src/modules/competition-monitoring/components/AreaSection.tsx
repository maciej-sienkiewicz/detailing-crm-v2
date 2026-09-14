import { useState } from 'react';
import styled from 'styled-components';
import { ExternalLink, MapPin, Settings } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { SharedButton } from '@/common/styles';
import type { AreaResults } from '../types';
import { Card, CardTitle, CardHint, CenterState, Spinner, formatExact } from './MetricBits';
import { AreaConfigModal } from './AreaConfigModal';
import { useLocationTrackings, useTrackingResults } from '../hooks/useAreaDiscovery';

/**
 * „Reklamodawcy w okolicy" — sekcja pod podsumowaniem roku w zakładce Reklamy.
 *
 * Odpowiada na pytanie „kto jeszcze reklamuje się na te frazy w moim rejonie".
 * Sekcja pokazuje tabelę wyników WYBRANEGO śledzenia; ustawianie śledzeń
 * (dodawanie/edycja/usuwanie) siedzi w modalu pod kołem zębatym — tu tylko oglądasz.
 */

const HeadRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
`;

const HeadRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const Selector = styled.div`
    display: inline-flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const TrackingPill = styled.button<{ $active: boolean; $paused: boolean }>`
    padding: 5px 12px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${p => (p.$active ? st.accentBlue : st.border)};
    background: ${p => (p.$active ? st.accentBlueDim : st.bgCard)};
    color: ${p => (p.$active ? st.accentBlue : st.textSecondary)};
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: ${p => (p.$active ? 700 : 500)};
    cursor: pointer;
    white-space: nowrap;
    opacity: ${p => (p.$paused ? 0.55 : 1)};
    transition: all ${st.transition};

    &:hover { border-color: ${st.borderHover}; }
`;

const GearButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    background: ${st.bgCard};
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { border-color: ${st.borderHover}; color: ${st.text}; }
    svg { width: 17px; height: 17px; }
`;

// ── Tabela wyników ─────────────────────────────────────────────────────────────

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

const TableScroll = styled.div`
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
`;

const Th = styled.th<{ $num?: boolean }>`
    text-align: ${p => (p.$num ? 'right' : 'left')};
    padding: 8px 12px;
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
    padding: 11px 12px;
    color: ${st.text};
    border-bottom: 1px solid ${st.border};
    vertical-align: middle;
    font-variant-numeric: ${p => (p.$num ? 'tabular-nums' : 'normal')};

    tbody tr:last-child & { border-bottom: none; }
`;

const Company = styled.span`
    font-weight: 700;
`;

const PreviewLink = styled.a`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    color: ${st.accentBlue};
    font-size: ${st.fontSm};
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
    &:hover { border-color: ${st.accentBlue}; background: ${st.accentBlueDim}; }
    svg { width: 14px; height: 14px; }
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

const ResultsTable = ({ results }: { results: AreaResults }) => {
    if (!results.configured) {
        return (
            <CenterState>
                <strong>Biblioteka reklam Meta nie jest skonfigurowana</strong>
                <span>Do czasu podłączenia tokena nie pokażemy, kto reklamuje się w rejonie.</span>
            </CenterState>
        );
    }

    const truncated = results.phraseStatuses.filter(p => p.truncated).map(p => p.phrase);
    const notVerified = results.phraseStatuses.some(p => p.status === 'NOT_VERIFIED');
    const rateLimited = results.phraseStatuses.some(p => p.status === 'RATE_LIMITED');
    const errored = results.phraseStatuses.some(p => p.status === 'ERROR');
    const pending = results.phraseStatuses.some(p => p.status === 'PENDING');

    return (
        <div>
            {results.advertisers.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                    <CountPill>{results.advertisers.length} firm · {results.totalActiveAds} aktywnych reklam</CountPill>
                </div>
            )}

            {results.advertisers.length === 0 ? (
                <CenterState>
                    <strong>Nikt się tu nie reklamuje na te frazy</strong>
                    <span>Nie znaleźliśmy aktywnych reklam z targetowaniem na wskazany rejon.</span>
                </CenterState>
            ) : (
                <TableScroll>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Firma</Th>
                                <Th $num>Aktywne reklamy</Th>
                                <Th $num>Zasięg (UE)</Th>
                                <Th aria-label="Podgląd" />
                            </tr>
                        </thead>
                        <tbody>
                            {results.advertisers.map(row => (
                                <tr key={row.pageId}>
                                    <Td><Company>{row.companyName}</Company></Td>
                                    <Td $num>{row.activeAds}</Td>
                                    <Td $num>{formatExact(row.reach)}</Td>
                                    <Td $num>
                                        <PreviewLink href={row.adLibraryUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink /> Podgląd w Bibliotece Meta
                                        </PreviewLink>
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </TableScroll>
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
                    przejrzeć — doprecyzuj frazę, żeby tabela była pełna.
                </Notice>
            )}
        </div>
    );
};

// ─── Sekcja ──────────────────────────────────────────────────────────────────

export const AreaSection = () => {
    const trackingsQuery = useLocationTrackings();
    const [chosenId, setChosenId] = useState<string | null>(null);
    const [configOpen, setConfigOpen] = useState(false);

    const trackings = trackingsQuery.data ?? [];
    // Zaznaczenie wyliczane w renderze (bez efektu): wybrane śledzenie, a gdy go nie ma
    // na liście (np. usunięte) — pierwsze z listy. Dzięki temu żadnego setState w useEffect.
    const selectedId = chosenId && trackings.some(t => t.id === chosenId) ? chosenId : (trackings[0]?.id ?? null);

    const resultsQuery = useTrackingResults(selectedId);

    return (
        <Card>
            <HeadRow>
                <CardTitle>Reklamodawcy w okolicy</CardTitle>
                <HeadRight>
                    {trackings.length > 0 && (
                        <Selector role="tablist" aria-label="Śledzone rejony">
                            {trackings.map(tracking => (
                                <TrackingPill
                                    key={tracking.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={selectedId === tracking.id}
                                    $active={selectedId === tracking.id}
                                    $paused={!tracking.active}
                                    onClick={() => setChosenId(tracking.id)}
                                    title={tracking.active ? tracking.label : `${tracking.label} (wstrzymane)`}
                                >
                                    {tracking.label}
                                </TrackingPill>
                            ))}
                        </Selector>
                    )}
                    <GearButton type="button" aria-label="Konfiguruj śledzenia obszaru" title="Konfiguruj" onClick={() => setConfigOpen(true)}>
                        <Settings />
                    </GearButton>
                </HeadRight>
            </HeadRow>

            <CardHint>
                Kto jeszcze reklamuje się na Twoje frazy w wskazanym rejonie. Frazy skanujemy wśród aktywnych
                reklam w Polsce; dane odświeżają się dwa razy dziennie.
            </CardHint>

            <div style={{ marginTop: 14 }}>
                {trackings.length === 0 ? (
                    <CenterState>
                        <strong>Nie śledzisz jeszcze żadnego rejonu</strong>
                        <span>Ustaw frazy i miejscowości, żeby zobaczyć, kto reklamuje się w Twojej okolicy.</span>
                        <div style={{ marginTop: 12 }}>
                            <SharedButton type="button" $variant="primary" $size="sm" onClick={() => setConfigOpen(true)}>
                                <MapPin size={15} /> Skonfiguruj obszar
                            </SharedButton>
                        </div>
                    </CenterState>
                ) : resultsQuery.isLoading ? (
                    <CenterState><Spinner /></CenterState>
                ) : resultsQuery.data ? (
                    <ResultsTable results={resultsQuery.data} />
                ) : resultsQuery.isError ? (
                    <CenterState>
                        <strong>Nie udało się wczytać wyników</strong>
                        <span>Spróbuj odświeżyć stronę.</span>
                    </CenterState>
                ) : null}
            </div>

            <AreaConfigModal
                isOpen={configOpen}
                onClose={() => setConfigOpen(false)}
                onSaved={id => setChosenId(id)}
                onDeleted={id => { if (chosenId === id) setChosenId(null); }}
            />
        </Card>
    );
};
