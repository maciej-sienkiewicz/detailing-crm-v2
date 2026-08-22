// src/modules/campaigns/views/CampaignsListView.tsx
// Lista kampanii w języku wizualnym reszty aplikacji: wspólny PageHeader,
// karta-powierzchnia, pasek pilności przy krawędzi wiersza, tokeny motywu.
// Szczegóły w oknie CampaignDetailModal — tak samo jak lead otwiera się z listy
// leadów, a nie na osobnym adresie.
//
// Co zniknęło i dlaczego:
//
// Cztery kolorowe kafle KPI nad tabelą (zielony, bursztynowy, błękitny, szary).
// Cztery równe prostokąty w czterech barwach to nie cztery akcenty, tylko zero
// akcentów — efekt izolacji działa wyłącznie wtedy, gdy wyróżnia się jedna rzecz.
// Te same liczby stoją teraz jednym cichym zdaniem w nagłówku strony: „3 działają
// · 2 zaplanowane · 1 240 kredytów SMS". Hierarchia buduje się rozmiarem i wagą,
// nie barwą.
//
// Ikonowe przyciski „wyślij" i „usuń" w każdym wierszu. Wiersz z dwiema akcjami
// obok siebie zmusza do rozpoznania właściwej przy każdym przejściu wzrokiem
// w dół listy, a jedna z nich wysyłała kampanię do wszystkich klientów po jednym
// kliknięciu w tabeli. Akcje należą teraz do okna kampanii, gdzie jest jedna,
// główna i wynikająca ze stanu.
//
// Ciemny „hero" pustego stanu. Drugi czarny prostokąt z gradientem, tuż pod
// nagłówkiem strony, który jest czarnym prostokątem z gradientem.
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowRight, Coins, Plus, Search, Settings2 } from 'lucide-react';
import { PageHeader, PageHeaderGhostButton, PageHeaderPrimaryButton } from '@/common/components/PageHeader';
import { useCampaignStats, useCampaignsList } from '../hooks/useCampaigns';
import { CHANNEL_LABELS, LOW_CREDITS_THRESHOLD, STATUS_COLORS, STATUS_LABELS } from '../constants';
import { CampaignDetailModal } from '../components/CampaignDetailModal';
import { describeCampaign, messageWord, type CampaignTone } from '../utils/campaignState';
import {
    CampaignKindMark,
    EmptyHint,
    FilterChip,
    MutedText,
    PrimaryButton,
    StatusDot,
    StatusLine,
    SurfaceCard,
    ViewContainer,
} from '../components/shared';
// „2 dni temu", „wczoraj, 14:20" — dokładnie ten sam zapis, co w tabeli leadów.
import { formatRelativeTime } from '@/modules/comms/components/shared';
import type { Campaign, CampaignStatus } from '../types';

// ─── Filtry ───────────────────────────────────────────────────────────────────

type ListFilter = 'ALL' | 'RUNNING' | 'SCHEDULED' | 'DONE' | 'DRAFT';

const FILTERS: { id: ListFilter; label: string; statuses: CampaignStatus[] | null }[] = [
    { id: 'ALL', label: 'Wszystkie', statuses: null },
    { id: 'RUNNING', label: 'Aktywne', statuses: ['ACTIVE', 'SENDING'] },
    { id: 'SCHEDULED', label: 'Zaplanowane', statuses: ['SCHEDULED'] },
    { id: 'DONE', label: 'Zakończone', statuses: ['COMPLETED', 'CANCELLED', 'FAILED', 'ARCHIVED'] },
    { id: 'DRAFT', label: 'Szkice', statuses: ['DRAFT', 'PAUSED'] },
];

/**
 * Pasek kłopotu nad listą — bliźniak paska zaległości w widoku leadów.
 *
 * Pojawia się wyłącznie wtedy, gdy jest o czym mówić: cisza nie zajmuje miejsca.
 * Wielka liczba po lewej jest dominantą widoku dokładnie tak długo, jak długo
 * jest problem; gdy wszystko idzie zgodnie z planem, dominantą staje się sama
 * tabela — i tak ma być.
 */
const AlertStrip = styled.button<{ $tone: 'due' | 'stale' }>`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid ${p => p.theme.colors.border};
    border-left: 3px solid ${({ $tone, theme }) =>
        $tone === 'due' ? theme.colors.error : theme.colors.warning};
    border-radius: ${p => p.theme.radii.lg};
    background: ${p => p.theme.colors.surface};
    padding: 12px 16px;
    transition: background ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }

    .amount {
        font-size: 20px;
        font-weight: ${p => p.theme.fontWeights.bold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }
    .text {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        color: ${p => p.theme.colors.textSecondary};
    }
    .text strong {
        color: ${p => p.theme.colors.text};
        font-weight: ${p => p.theme.fontWeights.semibold};
    }
    svg { width: 16px; height: 16px; flex-shrink: 0; color: ${p => p.theme.colors.textMuted}; }

    @media (max-width: ${p => p.theme.breakpoints.sm}) {
        flex-wrap: wrap;
        .text { flex-basis: 100%; }
    }
`;

/** Liczby z nagłówka: fakt obok faktu, jednym zdaniem, bez czterech kolorowych kafli. */
const HeaderStats = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    color: #94a3b8;

    strong {
        color: #e2e8f0;
        font-weight: ${p => p.theme.fontWeights.semibold};
        font-variant-numeric: tabular-nums;
    }
    .sep { color: #334155; }
`;

const FiltersRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
`;

/** Cienka kreska rozdzielająca dwie osie filtrowania: etap i „czy jest kłopot". */
const FilterSeparator = styled.span`
    width: 1px;
    align-self: stretch;
    margin: 2px 2px;
    background: ${p => p.theme.colors.border};
`;

const SearchBox = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.full};
    padding: 7px 14px;
    color: ${p => p.theme.colors.textMuted};
    background: ${p => p.theme.colors.surface};
    flex: 1 1 200px;
    max-width: 300px;
    transition: border-color ${p => p.theme.transitions.fast};

    &:focus-within { border-color: ${p => p.theme.colors.primary}; }

    input {
        border: none;
        outline: none;
        flex: 1;
        font-size: 13px;
        min-width: 0;
        background: transparent;
        color: ${p => p.theme.colors.text};
        font-family: inherit;
    }
`;

// ─── Tabela ───────────────────────────────────────────────────────────────────

const TableScroll = styled.div`
    overflow-x: auto;
`;

const COLUMNS = '1.8fr 0.8fr 0.9fr 0.9fr 1.4fr 1fr';

const HeadRow = styled.div`
    display: grid;
    grid-template-columns: ${COLUMNS};
    gap: 10px;
    padding: 12px 20px 12px 23px;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
    background: ${p => p.theme.colors.surfaceAlt};
    border-bottom: 1px solid ${p => p.theme.colors.border};
    min-width: 900px;
`;

const Row = styled.div<{ $active?: boolean; $tone: CampaignTone }>`
    position: relative;
    display: grid;
    grid-template-columns: ${COLUMNS};
    gap: 10px;
    align-items: center;
    width: 100%;
    min-width: 900px;
    text-align: left;
    padding: 12px 20px 12px 23px;
    border: none;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    background: ${({ $active, theme }) => ($active ? theme.colors.surfaceAlt : theme.colors.surface)};
    cursor: pointer;
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};
    font-family: inherit;
    transition: background ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
    &:last-child { border-bottom: none; }

    /*
     * Pasek pilności przy lewej krawędzi — ten sam znak, co w tabeli leadów.
     * Kłopot jest cechą całej kampanii, a nie zawartością którejś komórki, więc
     * mieszka na wierszu i nie zabiera ani piksela szerokości tabeli. Sam kolor
     * niczego nie niesie: to samo mówi znacznik tekstowy w kolumnie „Status".
     */
    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: ${({ $tone, theme }) =>
            $tone === 'due' ? theme.colors.error
            : $tone === 'stale' ? theme.colors.warning
            : 'transparent'};
    }

    .who {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }
    .name {
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .value {
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        font-variant-numeric: tabular-nums;
    }
    .num { font-variant-numeric: tabular-nums; }
`;

const StatusStack = styled.span`
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-width: 0;
`;

/**
 * „Co dalej" pod etapem — ikona-kropka i zdanie, bez ramki i bez tła. W kolumnie,
 * gdzie każdy wiersz ma już etap, druga wypełniona plakietka zamienia kolumnę
 * w kolaż. Kolor niesie tylko pilność i tylko wtedy, gdy jest o czym mówić.
 */
const StateMarker = styled.span<{ $tone: CampaignTone }>`
    font-size: 11px;
    line-height: 1.3;
    white-space: nowrap;
    font-weight: ${p => (p.$tone === 'neutral' ? p.theme.fontWeights.normal : p.theme.fontWeights.semibold)};
    color: ${({ $tone, theme }) =>
        $tone === 'due' ? theme.colors.error
        : $tone === 'stale' ? theme.colors.warning
        : theme.colors.textMuted};
`;

/**
 * Zaproszenie do pierwszej kampanii — na tle strony, bez ramki i bez gradientu.
 * Pusty moduł nie jest okazją do popisu graficznego, tylko brakiem treści; jedna
 * akcja główna stoi już w nagłówku strony, więc tutaj powtarzamy ją raz i cicho.
 */
const EmptyInvite = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 32px;
    border-radius: ${p => p.theme.radii.lg};
    background: ${p => p.theme.colors.surfaceAlt};

    h2 {
        margin: 0;
        font-size: 19px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
        letter-spacing: -0.2px;
    }
    p {
        margin: 0;
        font-size: 13.5px;
        color: ${p => p.theme.colors.textSecondary};
        max-width: 520px;
        line-height: 1.6;
    }
`;

// ─── Pomocnicze ───────────────────────────────────────────────────────────────

function recipientsLabel(c: Campaign): string {
    if (c.status === 'SENDING') return `${c.recipientsSent} / ${c.recipientsTotal}`;
    if (c.recipientsSent > 0) return String(c.recipientsSent);
    if (c.recipientsTotal > 0) return String(c.recipientsTotal);
    return '—';
}

/** Kolumna „Termin": data, która w tym stanie kampanii cokolwiek znaczy. */
function whenLabel(c: Campaign): string {
    if (c.status === 'SCHEDULED') return c.scheduledAt ? formatRelativeTime(c.scheduledAt) : 'natychmiast';
    if (c.completedAt) return formatRelativeTime(c.completedAt);
    if (c.startedAt) return formatRelativeTime(c.startedAt);
    return formatRelativeTime(c.createdAt);
}

// ─── Widok ────────────────────────────────────────────────────────────────────

export function CampaignsListView() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { campaigns, isLoading } = useCampaignsList();
    const { stats } = useCampaignStats();

    const [filter, setFilter] = useState<ListFilter>('ALL');
    // „Z błędami" to nie kolejny etap, tylko zawężenie listy do kampanii, które
    // czegoś od nas chcą — druga oś filtrowania, jak „Do odpisania" przy leadach.
    const [onlyProblems, setOnlyProblems] = useState(false);
    const [query, setQuery] = useState('');

    const selectedId = searchParams.get('campaign');
    const selectCampaign = (id: string | null) =>
        setSearchParams(id ? { campaign: id } : {}, { replace: true });

    const failedTotal = useMemo(
        () => campaigns.reduce((sum, c) => sum + c.recipientsFailed, 0),
        [campaigns],
    );
    const worstCampaign = useMemo(
        () => [...campaigns].sort((a, b) => b.recipientsFailed - a.recipientsFailed)[0],
        [campaigns],
    );

    const filtered = useMemo(() => {
        const definition = FILTERS.find((f) => f.id === filter);
        let list = definition?.statuses
            ? campaigns.filter((c) => definition.statuses!.includes(c.status))
            : campaigns;
        if (onlyProblems) list = list.filter((c) => c.recipientsFailed > 0 || c.status === 'FAILED');
        if (query.trim()) {
            const needle = query.trim().toLowerCase();
            list = list.filter((c) => c.name.toLowerCase().includes(needle));
        }
        return list;
    }, [campaigns, filter, onlyProblems, query]);

    const credits = stats?.smsCreditsAvailable ?? 0;
    const creditsLow = stats != null && credits < LOW_CREDITS_THRESHOLD;
    const isEmpty = !isLoading && campaigns.length === 0;

    return (
        <ViewContainer>
            <PageHeader
                title="Kampanie"
                subtitle={
                    stats ? (
                        <HeaderStats>
                            <span><strong>{stats.active}</strong> działa</span>
                            <span className="sep">·</span>
                            <span><strong>{stats.scheduled}</strong> zaplanowanych</span>
                            <span className="sep">·</span>
                            <span><strong>{stats.messagesSentLast30Days}</strong> wiadomości w 30 dni</span>
                            <span className="sep">·</span>
                            <span><strong>{credits}</strong> kredytów SMS</span>
                        </HeaderStats>
                    ) : (
                        'Wysyłki SMS i e-mail do Twoich klientów'
                    )
                }
                actions={
                    <>
                        <PageHeaderGhostButton onClick={() => navigate('/campaigns/settings')}>
                            <Settings2 /> Ustawienia wysyłki
                        </PageHeaderGhostButton>
                        <PageHeaderPrimaryButton onClick={() => navigate('/campaigns/new')}>
                            <Plus /> Nowa kampania
                        </PageHeaderPrimaryButton>
                    </>
                }
            />

            {/* Jeden pasek, nigdy dwa: nieudane wiadomości są pilniejsze od stanu
                konta, bo klient już czegoś nie dostał, a kredyty da się doładować
                w każdej chwili. Dwa paski jeden pod drugim znaczyłyby tyle, co żaden. */}
            {failedTotal > 0 && !onlyProblems ? (
                <AlertStrip
                    $tone="due"
                    type="button"
                    title="Pokaż kampanie, w których coś nie wyszło"
                    onClick={() => { setOnlyProblems(true); setFilter('ALL'); }}
                >
                    <span className="amount">{failedTotal}</span>
                    <span className="text">
                        {messageWord(failedTotal)} nie dotarło do odbiorców
                        {worstCampaign && worstCampaign.recipientsFailed > 0 && (
                            <> — najwięcej w <strong>{worstCampaign.name}</strong></>
                        )}
                    </span>
                    <ArrowRight />
                </AlertStrip>
            ) : creditsLow && !isEmpty ? (
                <AlertStrip
                    $tone="stale"
                    type="button"
                    title="Przejdź do doładowania kredytów"
                    onClick={() => navigate('/settings?tab=credits')}
                >
                    <span className="amount">{credits}</span>
                    <span className="text">
                        kredytów SMS zostało na koncie — <strong>doładuj</strong>, zanim ruszy
                        kolejna wysyłka
                    </span>
                    <Coins />
                </AlertStrip>
            ) : null}

            {isEmpty ? (
                <EmptyInvite>
                    <h2>Wyślij pierwszą kampanię</h2>
                    <p>
                        Przypomnij klientom o sobie: świątecznie, po wykonanej usłudze albo wtedy,
                        gdy dawno ich nie było. Odbiorców wybierasz filtrami, treść piszesz raz.
                    </p>
                    <PrimaryButton type="button" onClick={() => navigate('/campaigns/new')}>
                        <Plus /> Utwórz kampanię
                    </PrimaryButton>
                </EmptyInvite>
            ) : (
                <>
                    <FiltersRow>
                        {FILTERS.map((f) => (
                            <FilterChip key={f.id} $active={filter === f.id} onClick={() => setFilter(f.id)}>
                                {f.label}
                            </FilterChip>
                        ))}
                        <FilterSeparator />
                        <FilterChip
                            $active={onlyProblems}
                            title="Kampanie, w których jakaś wiadomość nie wyszła"
                            onClick={() => setOnlyProblems((current) => !current)}
                        >
                            Z błędami
                        </FilterChip>
                        <SearchBox>
                            <Search size={14} />
                            <input
                                placeholder="Szukaj po nazwie kampanii…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </SearchBox>
                    </FiltersRow>

                    <SurfaceCard>
                        <TableScroll>
                            <HeadRow>
                                <span>Kampania</span>
                                <span>Kanał</span>
                                <span>Odbiorcy</span>
                                <span>Koszt</span>
                                <span>Status</span>
                                <span>Termin</span>
                            </HeadRow>
                            {filtered.length === 0 && (
                                <EmptyHint>Brak kampanii w tym widoku</EmptyHint>
                            )}
                            {filtered.map((c) => {
                                const marker = describeCampaign(c);
                                return (
                                    <Row
                                        key={c.id}
                                        $active={c.id === selectedId}
                                        $tone={marker.tone}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => selectCampaign(c.id)}
                                        onKeyDown={(event) => {
                                            if (event.target !== event.currentTarget) return;
                                            if (event.key !== 'Enter' && event.key !== ' ') return;
                                            event.preventDefault();
                                            selectCampaign(c.id);
                                        }}
                                    >
                                        <span className="who">
                                            <span className="name">{c.name}</span>
                                            <CampaignKindMark kind={c.kind} />
                                        </span>

                                        <span>{CHANNEL_LABELS[c.channel]}</span>

                                        <span className="num">{recipientsLabel(c)}</span>

                                        <span className="num">
                                            {c.creditsSpent > 0 ? `${c.creditsSpent} kr.` : '—'}
                                        </span>

                                        {/* Etap i „co dalej" jedno pod drugim: to dwie odpowiedzi
                                            na dwa różne pytania o tę samą kampanię, a rozdzielone
                                            na dwie kolumny kazałyby wodzić wzrokiem w bok. */}
                                        <StatusStack>
                                            <StatusLine>
                                                <StatusDot $color={STATUS_COLORS[c.status]} />
                                                {STATUS_LABELS[c.status]}
                                            </StatusLine>
                                            <StateMarker $tone={marker.tone} title={marker.title}>
                                                {marker.label}
                                            </StateMarker>
                                        </StatusStack>

                                        <span>{whenLabel(c)}</span>
                                    </Row>
                                );
                            })}
                        </TableScroll>
                    </SurfaceCard>

                    {filtered.length > 0 && onlyProblems && (
                        <MutedText>
                            Widzisz wyłącznie kampanie z nieudanymi wiadomościami.
                        </MutedText>
                    )}
                </>
            )}

            {selectedId && (
                <CampaignDetailModal
                    // Remount na każdą kampanię: stan okna (szukajka odbiorców,
                    // otwarte potwierdzenie) należy do jednego otwarcia.
                    key={selectedId}
                    campaignId={selectedId}
                    onClose={() => selectCampaign(null)}
                    onDeleted={() => selectCampaign(null)}
                />
            )}
        </ViewContainer>
    );
}
