import React, { useState } from 'react';
import styled from 'styled-components';
import { ExternalLink, MapPin, Pause, Play, Plus, Search, Trash2, X } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { SharedButton } from '@/common/styles';
import type { AreaMatchMode, AreaResults, LocationTracking, SaveLocationTracking } from '../types';
import { Card, CardTitle, CardHint, CenterState, Spinner, formatExact } from './MetricBits';
import {
    useCreateLocationTracking,
    useDeleteLocationTracking,
    useLocationTrackings,
    usePreviewAreaDiscovery,
    useTrackingResults,
    useUpdateLocationTracking,
} from '../hooks/useAreaDiscovery';

/**
 * Odkrywanie obszaru: „Kto jeszcze reklamuje się na frazy X, Y w rejonie
 * Poznań, Skórzewo, Suchy Las".
 *
 * Ekran ma dwa tempa. Najpierw podgląd na żywo — wpisz frazy i rejon, zobacz
 * tabelę firm od ręki, bez zobowiązań. Gdy rejon jest wart pilnowania, zapisz go
 * jako śledzenie: jego frazy odświeżają się na serwerze dwa razy dziennie i nie
 * trzeba już nic wpisywać, dopóki śledzenie nie zostanie wstrzymane.
 *
 * Świadomie NIE ma tu „dodaj do śledzonych" per firma: kto zechce śledzić konkretne
 * studio, doda jego profil w normalnym trybie. Tu chodzi o rozeznanie terenu.
 */

const MODE_LABELS: Record<AreaMatchMode, string> = {
    CITIES_ONLY: 'Tylko wpisane miejscowości',
    INCLUDE_BROADER: 'Także województwo i cała Polska',
};

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Field = styled.div`
    margin-bottom: 16px;
`;

const FieldLabel = styled.label`
    display: block;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    margin-bottom: 6px;
`;

const FieldHint = styled.span`
    font-weight: 500;
    color: ${st.textMuted};
`;

const TagBox = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    background: ${st.bgInput};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};

    &:focus-within {
        border-color: ${st.borderFocus};
        box-shadow: ${st.shadowBlue};
    }
`;

const Tag = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 6px 4px 10px;
    background: ${st.accentBlueDim};
    color: ${st.accentBlue};
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;

    button {
        display: inline-flex;
        border: none;
        background: none;
        padding: 0;
        cursor: pointer;
        color: inherit;
        opacity: 0.7;
        &:hover { opacity: 1; }
    }
    svg { width: 13px; height: 13px; }
`;

const TagInput = styled.input`
    flex: 1;
    min-width: 140px;
    border: none;
    background: none;
    outline: none;
    font-family: inherit;
    font-size: ${st.fontMd};
    color: ${st.text};
    padding: 4px 2px;
    &::placeholder { color: ${st.textMuted}; }
`;

const ModeToggle = styled.div`
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusFull};
    padding: 3px;
`;

const ModeBtn = styled.button<{ $active: boolean }>`
    padding: 6px 14px;
    border-radius: ${st.radiusFull};
    border: none;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: ${p => (p.$active ? 700 : 500)};
    background: ${p => (p.$active ? st.bgCard : 'transparent')};
    color: ${p => (p.$active ? st.text : st.textSecondary)};
    box-shadow: ${p => (p.$active ? st.shadowXs : 'none')};
    cursor: pointer;
    transition: all ${st.transition};
`;

const ButtonRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
`;

const EditingBanner = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
    padding: 8px 12px;
    border: 1px solid ${st.accentBlue};
    background: ${st.accentBlueDim};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    strong { font-weight: 700; }
`;

// ── Zapisane śledzenia ────────────────────────────────────────────────────────

const TrackingList = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const TrackingChip = styled.div<{ $active: boolean; $selected: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 6px 6px 12px;
    border-radius: ${st.radiusFull};
    border: 1px solid ${p => (p.$selected ? st.accentBlue : st.border)};
    background: ${p => (p.$selected ? st.accentBlueDim : st.bgCard)};
    font-size: ${st.fontSm};
    opacity: ${p => (p.$active ? 1 : 0.55)};
`;

const TrackingName = styled.button`
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    cursor: pointer;
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ChipAction = styled.button`
    display: inline-flex;
    border: none;
    background: none;
    padding: 3px;
    border-radius: ${st.radiusFull};
    color: ${st.textMuted};
    cursor: pointer;
    &:hover { color: ${st.text}; background: ${st.bgCardAlt}; }
    svg { width: 14px; height: 14px; }
`;

// ── Tabela wyników ──────────────────────────────────────────────────────────

const ResultHead = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
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

const TableScroll = styled.div`
    overflow-x: auto;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${st.fontSm};
`;

const Th = styled.th<{ $num?: boolean }>`
    text-align: ${p => (p.$num ? 'right' : 'left')};
    padding: 8px 12px;
    color: ${st.textSecondary};
    font-weight: 600;
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
`;

const Company = styled.span`
    font-weight: 600;
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

// ─── Pole tagów (frazy / miejscowości) ────────────────────────────────────────

interface TagFieldProps {
    label: React.ReactNode;
    placeholder: string;
    values: string[];
    onChange: (values: string[]) => void;
}

const TagField = ({ label, placeholder, values, onChange }: TagFieldProps) => {
    const [draft, setDraft] = useState('');

    const commit = (raw: string) => {
        // Wklejenie „Poznań, Skórzewo, Suchy Las" rozbijamy po przecinku od razu.
        const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length === 0) return;
        const next = [...values];
        for (const part of parts) {
            if (!next.some(v => v.toLowerCase() === part.toLowerCase())) next.push(part);
        }
        onChange(next);
        setDraft('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit(draft);
        } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
            onChange(values.slice(0, -1));
        }
    };

    return (
        <Field>
            <FieldLabel>{label}</FieldLabel>
            <TagBox>
                {values.map(value => (
                    <Tag key={value}>
                        {value}
                        <button type="button" aria-label={`Usuń ${value}`} onClick={() => onChange(values.filter(v => v !== value))}>
                            <X />
                        </button>
                    </Tag>
                ))}
                <TagInput
                    value={draft}
                    placeholder={values.length === 0 ? placeholder : ''}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => commit(draft)}
                />
            </TagBox>
        </Field>
    );
};

// ─── Tabela wyników ────────────────────────────────────────────────────────────

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
    const pending = results.phraseStatuses.some(p => p.status === 'PENDING');

    return (
        <div>
            <ResultHead>
                <CardTitle>Reklamodawcy w rejonie</CardTitle>
                {results.advertisers.length > 0 && (
                    <CountPill>
                        {results.advertisers.length} firm · {results.totalActiveAds} aktywnych reklam
                    </CountPill>
                )}
            </ResultHead>

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
            {pending && !rateLimited && (
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

// ─── Zakładka ──────────────────────────────────────────────────────────────────

export const AreaTab = () => {
    const [label, setLabel] = useState('');
    const [phrases, setPhrases] = useState<string[]>([]);
    const [locations, setLocations] = useState<string[]>([]);
    const [mode, setMode] = useState<AreaMatchMode>('INCLUDE_BROADER');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const trackingsQuery = useLocationTrackings();
    const preview = usePreviewAreaDiscovery();
    const trackingResults = useTrackingResults(selectedId);
    const createMut = useCreateLocationTracking();
    const updateMut = useUpdateLocationTracking();
    const deleteMut = useDeleteLocationTracking();

    const canQuery = phrases.length > 0 && locations.length > 0;
    const body = (): SaveLocationTracking => ({ label: label.trim(), phrases, locations, matchMode: mode });

    const results: AreaResults | undefined = selectedId ? trackingResults.data : preview.data;
    const resultsLoading = selectedId ? trackingResults.isLoading : preview.isPending;

    const handlePreview = () => {
        if (!canQuery) return;
        setSelectedId(null);
        preview.mutate(body());
    };

    const handleCreate = () => {
        if (!canQuery || label.trim() === '') return;
        createMut.mutate({ ...body(), active: true }, { onSuccess: created => setSelectedId(created.id) });
    };

    const handleSaveChanges = () => {
        if (!selectedId || !canQuery || label.trim() === '') return;
        updateMut.mutate({ id: selectedId, request: { ...body(), active: true } });
    };

    const loadTracking = (tracking: LocationTracking) => {
        setLabel(tracking.label);
        setPhrases(tracking.phrases);
        setLocations(tracking.locations);
        setMode(tracking.matchMode);
        setSelectedId(tracking.id);
    };

    const startNew = () => {
        setLabel('');
        setPhrases([]);
        setLocations([]);
        setMode('INCLUDE_BROADER');
        setSelectedId(null);
        preview.reset();
    };

    const toggleActive = (tracking: LocationTracking) => {
        updateMut.mutate({
            id: tracking.id,
            request: {
                label: tracking.label,
                phrases: tracking.phrases,
                locations: tracking.locations,
                matchMode: tracking.matchMode,
                active: !tracking.active,
            },
        });
    };

    const removeTracking = (tracking: LocationTracking) => {
        deleteMut.mutate(tracking.id);
        if (selectedId === tracking.id) startNew();
    };

    const trackings = trackingsQuery.data ?? [];
    const saving = createMut.isPending || updateMut.isPending;

    return (
        <Layout>
            <Card>
                <CardTitle>Kto reklamuje się w rejonie</CardTitle>
                <CardHint>
                    Wpisz frazy z reklam (np. „detailing", „powłoka ceramiczna") i miejscowości rejonu.
                    Przeskanujemy aktywne reklamy w Polsce i pokażemy te, których targetowanie obejmuje ten teren.
                </CardHint>

                {selectedId && (
                    <EditingBanner>
                        <MapPin size={15} />
                        <span>Podgląd zapisanego śledzenia: <strong>{label || '—'}</strong></span>
                    </EditingBanner>
                )}

                <div style={{ marginTop: 16 }}>
                    <Field>
                        <FieldLabel>Nazwa śledzenia <FieldHint>(potrzebna tylko do zapisu)</FieldHint></FieldLabel>
                        <TagBox as="div" style={{ display: 'block' }}>
                            <TagInput
                                value={label}
                                placeholder="np. Detailing — aglomeracja poznańska"
                                onChange={e => setLabel(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </TagBox>
                    </Field>

                    <TagField
                        label={<>Frazy <FieldHint>(Enter lub przecinek dodaje kolejną)</FieldHint></>}
                        placeholder="np. detailing, powłoka ceramiczna, PPF"
                        values={phrases}
                        onChange={setPhrases}
                    />

                    <TagField
                        label={<>Rejon — miejscowości <FieldHint>(Enter lub przecinek dodaje kolejną)</FieldHint></>}
                        placeholder="np. Poznań, Skórzewo, Suchy Las"
                        values={locations}
                        onChange={setLocations}
                    />

                    <Field>
                        <FieldLabel>Jak szeroko rozumieć „w rejonie"</FieldLabel>
                        <ModeToggle role="radiogroup">
                            {(Object.keys(MODE_LABELS) as AreaMatchMode[]).map(key => (
                                <ModeBtn
                                    key={key}
                                    type="button"
                                    role="radio"
                                    aria-checked={mode === key}
                                    $active={mode === key}
                                    onClick={() => setMode(key)}
                                >
                                    {MODE_LABELS[key]}
                                </ModeBtn>
                            ))}
                        </ModeToggle>
                    </Field>

                    <ButtonRow>
                        <SharedButton type="button" $variant="primary" onClick={handlePreview} disabled={!canQuery || preview.isPending}>
                            <Search size={16} /> {preview.isPending ? 'Skanuję…' : 'Pokaż'}
                        </SharedButton>

                        {selectedId ? (
                            <>
                                <SharedButton type="button" $variant="secondary" onClick={handleSaveChanges} disabled={!canQuery || label.trim() === '' || saving}>
                                    Zapisz zmiany
                                </SharedButton>
                                <SharedButton type="button" $variant="ghost" onClick={startNew}>
                                    Nowe wyszukiwanie
                                </SharedButton>
                            </>
                        ) : (
                            <SharedButton type="button" $variant="secondary" onClick={handleCreate} disabled={!canQuery || label.trim() === '' || saving}>
                                <Plus size={16} /> Zapisz jako śledzenie
                            </SharedButton>
                        )}
                    </ButtonRow>
                </div>
            </Card>

            {trackings.length > 0 && (
                <Card>
                    <CardTitle>Śledzone rejony</CardTitle>
                    <CardHint>Frazy śledzeń odświeżają się automatycznie dwa razy dziennie. Wstrzymane nie są odświeżane.</CardHint>
                    <div style={{ marginTop: 14 }}>
                        <TrackingList>
                            {trackings.map(tracking => (
                                <TrackingChip key={tracking.id} $active={tracking.active} $selected={selectedId === tracking.id}>
                                    <TrackingName type="button" onClick={() => loadTracking(tracking)} title={tracking.label}>
                                        {tracking.label}
                                    </TrackingName>
                                    <ChipAction
                                        type="button"
                                        aria-label={tracking.active ? 'Wstrzymaj śledzenie' : 'Wznów śledzenie'}
                                        title={tracking.active ? 'Wstrzymaj' : 'Wznów'}
                                        onClick={() => toggleActive(tracking)}
                                    >
                                        {tracking.active ? <Pause /> : <Play />}
                                    </ChipAction>
                                    <ChipAction
                                        type="button"
                                        aria-label="Usuń śledzenie"
                                        title="Usuń"
                                        onClick={() => removeTracking(tracking)}
                                    >
                                        <Trash2 />
                                    </ChipAction>
                                </TrackingChip>
                            ))}
                        </TrackingList>
                    </div>
                </Card>
            )}

            {(results || resultsLoading) && (
                <Card>
                    {resultsLoading ? (
                        <CenterState><Spinner /></CenterState>
                    ) : results ? (
                        <ResultsTable results={results} />
                    ) : null}
                </Card>
            )}
        </Layout>
    );
};
