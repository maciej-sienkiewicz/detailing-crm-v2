// src/modules/comms/components/WorklistPanel.tsx
// Domyślna treść panelu obok kolejki: co robić teraz, ile wpływa, co domknięte.
//
// ── Co tu NIE stoi i dlaczego ───────────────────────────────────────────────
//
// Stała tu wcześniej analityka: kwota „Zamknięte w tym miesiącu", belka wartości
// zapytań i rozkład strat. Trzy liczby, z których żadna nie zmienia się w ciągu
// dnia pracy, żadna nie wskazuje konkretnej sprawy i pod żadną nie ma przycisku.
// To jest definicja raportu miesięcznego, a nie ekranu operacyjnego - i tam
// wróciły, pod „Podsumowanie miesiąca".
//
// Nie ma tu też „wartości zapytań w toku". Ta liczba jest ślepa dokładnie tam,
// gdzie miałaby pomóc: wycena powstaje, dopiero gdy ktoś się leadem zajmie, więc
// zapytanie leżące od rana nietknięte wnosi do niej zero złotych.
//
// ── Co tu stoi ──────────────────────────────────────────────────────────────
//
//  1. JEDNA SPRAWA Z NAZWISKIEM i jeden przycisk. Nie licznik - konkretny człowiek,
//     bo licznik wymaga drugiego kroku („no dobra, ale która?"), a właściciel ma
//     piętnaście sekund między dwoma autami.
//  2. Ile wpływa miesiąc po miesiącu - w złotówkach albo w sztukach, do wyboru.
//     Jedyny wykres w module i jedyna rzecz tutaj, która patrzy wstecz.
//  3. Jedna linijka pokwitowania: ile domknięte od poniedziałku.
//
// Panel NIE POWTARZA listy obok: sekcje mają własne nagłówki z licznikami, więc
// zdanie „5 osób czeka" byłoby tą samą liczbą dwa razy na jednym ekranie. Stąd
// forma osobowa („Najdłużej czeka Marek Nowak"), a nie statystyczna.
import styled from 'styled-components';
import { ArrowRight, BarChart3, Check } from 'lucide-react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useLeadIntakeYear } from '../hooks/useLeads';
import { formatVehicle } from '../utils/leadFormat';
import { formatAge, type StagnationThresholds } from '../utils/leadUrgency';
import { leadPrimaryAction } from '../utils/leadPrimaryAction';
import { overdueCount, type Worklist } from '../utils/leadWorklist';
import { AnalyticsCard, IntakeYearChart, type YearPoint } from './analytics/charts';
import { formatMoney } from './shared';

const MONTH_ABBR = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

const Shell = styled.div<{ $compact?: boolean }>`
    display: flex;
    flex-direction: column;
    height: ${p => (p.$compact ? 'auto' : '100%')};
    min-height: 0;
    /* Szara podłoga aplikacji, nie biel: dopiero na niej białe karty czytają się
       jako uniesione powierzchnie, a nie płaskie prostokąty na bieli. W wariancie
       spod listy podłogę daje już strona, więc panel jej nie dokłada. */
    background: ${p => (p.$compact ? 'transparent' : p.theme.colors.background)};
`;

const Body = styled.div<{ $compact?: boolean }>`
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: ${p => (p.$compact ? 'visible' : 'auto')};
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: ${p => (p.$compact ? '0' : '20px 20px 40px')};
    /* Kontener zapytań szerokości: karty reagują na szerokość PANELU (~600 px),
       nie okna desktopu. */
    container-type: inline-size;

    & > * { flex-shrink: 0; }
`;

/**
 * Karta pierwszej sprawy. Czerwona krawędź z lewej - ta sama, którą nosi wiersz
 * zaległości w kolejce obok, żeby było widać, że to jest ta sama rzecz, a nie
 * drugi rodzaj alarmu.
 */
const NextCard = styled.section<{ $tone: 'due' | 'stale' }>`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 22px 24px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-left: 3px solid ${p => (p.$tone === 'due' ? p.theme.colors.error : p.theme.colors.warning)};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};

    @container (max-width: 420px) { padding: 18px 16px; }
`;

const Kicker = styled.div`
    font-size: ${st.fontXs};
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: ${st.textSecondary};
`;

const Who = styled.div`
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;

    .name {
        font-size: 22px;
        line-height: 1.2;
        font-weight: ${p => p.theme.fontWeights.bold};
        color: ${p => p.theme.colors.text};
        /* Nazwisko może być długie, a panel wąski - łamiemy, nie przycinamy.
           Ucięte nazwisko jest gorsze niż brak nazwiska: wygląda na dane. */
        overflow-wrap: anywhere;
    }
    .what {
        font-size: 13.5px;
        color: ${p => p.theme.colors.textSecondary};
    }
`;

const GoButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 13px 16px;
    border: none;
    border-radius: ${p => p.theme.radii.lg};
    background: ${p => p.theme.colors.primary};
    color: #ffffff;
    font-family: inherit;
    font-size: 14.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    cursor: pointer;
    transition: filter ${p => p.theme.transitions.fast};

    &:hover { filter: brightness(1.06); }
    &:focus-visible { outline: 2px solid ${p => p.theme.colors.primary}; outline-offset: 2px; }

    svg { width: 18px; height: 18px; flex-shrink: 0; }
`;

/** Drugie zdanie karty: skala długu. Osobno, bo to jest inna informacja niż „kto". */
const Footnote = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: ${st.textSecondary};

    strong { color: ${p => p.theme.colors.text}; font-weight: ${p => p.theme.fontWeights.semibold}; }
`;

/** Skrzynka pusta - projektowany cel tego ekranu, nie stan awaryjny. */
const DoneCard = styled.section`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 34px 24px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowSm};
    text-align: center;

    svg {
        width: 26px;
        height: 26px;
        color: ${p => p.theme.colors.success};
    }
    h2 {
        margin: 0;
        font-size: 17px;
        font-weight: ${p => p.theme.fontWeights.bold};
        color: ${p => p.theme.colors.text};
    }
    p {
        margin: 0;
        font-size: 13px;
        color: ${st.textSecondary};
    }
`;

const Reward = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    background: ${st.bgCard};
    font-size: 13.5px;
    color: ${p => p.theme.colors.text};

    svg { width: 16px; height: 16px; flex-shrink: 0; color: ${p => p.theme.colors.success}; }
    strong { font-weight: ${p => p.theme.fontWeights.bold}; }
`;

const SummaryLink = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    align-self: center;
    padding: 9px 16px;
    border: 1px solid ${st.border};
    border-radius: ${p => p.theme.radii.lg};
    background: transparent;
    color: ${p => p.theme.colors.textSecondary};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => p.theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover {
        background: ${p => p.theme.colors.surfaceHover};
        color: ${p => p.theme.colors.text};
    }
    &:focus-visible { outline: 2px solid ${p => p.theme.colors.primary}; outline-offset: 1px; }

    svg { width: 15px; height: 15px; }
`;

interface WorklistPanelProps {
    worklist: Worklist;
    thresholds: StagnationThresholds;
    /** Otwiera sprawę w panelu obok - ten sam odnośnik, co kliknięcie w wiersz kolejki. */
    onOpenLead: (leadId: string) => void;
    /** Wejście w podsumowanie miesiąca (pełna analityka). */
    onOpenSummary: () => void;
    /**
     * Wariant spod listy na wąskim ekranie: bez karty pierwszej sprawy.
     *
     * Tam kolejka jest tuż nad wykresem, więc karta „zacznij od tej sprawy"
     * powtarzałaby pierwszy wiersz listy o kilka pikseli niżej. Zostaje to,
     * czego lista nie mówi: ile wpływa i ile domknięte.
     */
    compact?: boolean;
}

export function WorklistPanel({
    worklist,
    thresholds,
    onOpenLead,
    onOpenSummary,
    compact = false,
}: WorklistPanelProps) {
    /*
     * Wykres idzie po własne, lekkie dane, a nie po pełną analitykę: ta liczy
     * macierze dni tygodnia, segmenty aut i kilkaset surowych faktów - przy każdym
     * wejściu w moduł, żeby narysować dwanaście punktów.
     */
    const intake = useLeadIntakeYear();

    const head = worklist.head;
    const overdue = overdueCount(worklist, thresholds);
    const silentValue = worklist.silent.value;
    const reward = intake.data?.confirmedValueThisWeek ?? 0;

    const points: YearPoint[] = (intake.data?.months ?? []).map((month) => ({
        period: MONTH_ABBR[month.month - 1],
        value: month.value,
        count: month.count,
    }));

    return (
        <Shell $compact={compact}>
            <Body $compact={compact}>
                {compact ? null : head ? (
                    <NextCard $tone={head.urgency.tone === 'stale' ? 'stale' : 'due'}>
                        <Kicker>
                            {head.urgency.turn === 'OURS' ? 'Zacznij od tej sprawy' : 'Najdłużej milczy'}
                        </Kicker>
                        <Who>
                            <span className="name">
                                {head.lead.customerName?.trim() || head.lead.contactIdentifier}
                            </span>
                            <span className="what">
                                {[
                                    formatVehicle(head.lead),
                                    head.lead.tagLabels[0],
                                    formatAge(head.urgency.waitingMs),
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </span>
                        </Who>

                        {/* Etykieta z tej samej reguły, co przycisk na karcie sprawy:
                            „Odpisz" przy zaległej odpowiedzi, „Zadzwoń" przy leadzie
                            z telefonu, „Przypomnij się" przy ciszy. Decyzja co kliknąć
                            nie należy do użytkownika. */}
                        <GoButton type="button" onClick={() => onOpenLead(head.lead.id)}>
                            <span>
                                {head.urgency.turn === 'OURS'
                                    ? leadPrimaryAction(head.lead, head.urgency).label
                                    : 'Przypomnij się'}
                            </span>
                            <ArrowRight />
                        </GoButton>

                        {overdue > 0 && (
                            <Footnote>
                                <strong>{overdue}</strong>
                                {overdue === 1 ? ' sprawa czeka' : ' z nich czeka'} ponad{' '}
                                {formatAge(thresholds.ourReplyHours * 3_600_000)}.
                            </Footnote>
                        )}
                        {silentValue > 0 && worklist.silent.entries.length > 0 && (
                            <Footnote>
                                W ucichłych rozmowach leży <strong>{formatMoney(silentValue)}</strong>.
                                Przypomnienie kosztuje zero złotych.
                            </Footnote>
                        )}
                    </NextCard>
                ) : (
                    <DoneCard>
                        <Check />
                        <h2>Skrzynka pusta</h2>
                        <p>
                            {worklist.total === 0
                                ? 'Nie ma otwartych zapytań.'
                                : 'Nikt nie czeka na Twoją odpowiedź i nic nie ucichło.'}
                        </p>
                    </DoneCard>
                )}

                {reward > 0 && (
                    <Reward>
                        <Check />
                        <span>
                            W tym tygodniu domknąłeś <strong>{formatMoney(reward)}</strong>.
                        </span>
                    </Reward>
                )}

                <AnalyticsCard
                    question="Zapytania miesiąc po miesiącu"
                    answer="Ile wpływa w ciągu roku - od stycznia do grudnia."
                    footnote="Przełącz na sztuki, gdy chcesz porównać ruch, a nie przychód."
                >
                    <IntakeYearChart points={points} />
                </AnalyticsCard>

                <SummaryLink type="button" onClick={onOpenSummary}>
                    <BarChart3 /> Podsumowanie miesiąca
                </SummaryLink>
            </Body>
        </Shell>
    );
}
