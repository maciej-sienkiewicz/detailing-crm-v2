import React, { useState } from 'react';
import styled from 'styled-components';
import { RefreshCw, UserPlus } from 'lucide-react';
import { Button, Notice, Segmented } from '@/common/components/ui';
import { pluralPl } from '@/common/utils/plural';
import {
    COMPETITION_DAYS_OPTIONS,
    type CompetitionDays,
    type CompetitionProfile,
} from '../../types';
import { useCompetition, useResyncFailedProfiles } from '../../hooks/useAnalytics';
import { useAdCalendar } from '../../hooks/useAds';
import { useProfileColors } from '../../hooks/useProfileColors';
import { AdsTab } from '../AdsTab';
import { AreaSection } from '../AreaSection';
import { CenterState, Spinner } from '../MetricBits';
import { splitProfiles } from '../../utils/competition';
import type { CompetitionView } from '../../utils/moduleUrl';
import { ProfilesPanel } from './ProfilesPanel';
import { PublicationCalendar } from './PublicationCalendar';
import { GrowthRanking } from './GrowthRanking';
import { ProfileDetailDrawer } from './ProfileDetailDrawer';

/**
 * Konkurencja: kto publikuje, rośnie i się reklamuje.
 *
 * Trzy widoki pod jednym przełącznikiem, bo to trzy pytania, a nie trzy źródła danych:
 * Profile (tabela, kalendarz publikacji, ranking przyrostu), Reklamy (kalendarz roku)
 * i W okolicy (firmy reklamujące się w rejonie). Wybór okresu stoi wyłącznie przy
 * widoku, na który działa - dawny przełącznik nad zakładką Tydzień nic nie zmieniał.
 */

const VIEW_OPTIONS: { value: CompetitionView; label: string }[] = [
    { value: 'profile', label: 'Profile' },
    { value: 'reklamy', label: 'Reklamy' },
    { value: 'okolica', label: 'W okolicy' },
];

/** Biblioteka reklam Meta trzyma rok historii - więcej lat nie ma czym wypełnić. */
const AD_YEARS = 2;

const Layout = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Bar = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
`;

const Columns = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: 16px;
    align-items: start;

    > * { min-width: 0; }

    @media (max-width: 900px) { grid-template-columns: minmax(0, 1fr); }
`;

const EmptyActions = styled.div`
    margin-top: 6px;
`;

interface Props {
    view: CompetitionView;
    days: CompetitionDays;
    year: number;
    onChange: (next: { view?: CompetitionView; days?: CompetitionDays; year?: number }) => void;
    onAddProfile: () => void;
    onOpenAd: (adId: string) => void;
}

export const CompetitionTab: React.FC<Props> = ({ view, days, year, onChange, onAddProfile, onOpenAd }) => {
    const colors = useProfileColors();
    const competitionQuery = useCompetition(days, view === 'profile');
    const adsQuery = useAdCalendar(year, view === 'reklamy');
    const resync = useResyncFailedProfiles();
    const [resyncMessage, setResyncMessage] = useState<string | null>(null);
    const [openProfile, setOpenProfile] = useState<CompetitionProfile | null>(null);

    const handleResync = () => {
        setResyncMessage(null);
        resync.mutate(undefined, {
            onSuccess: result => setResyncMessage(
                result.attempted === 0
                    ? 'Nie ma już czego ponawiać, dane są aktualne.'
                    : result.stillFailing === 0
                        ? `Udało się, odświeżono ${result.recovered} ${pluralPl(result.recovered, 'profil', 'profile', 'profili')}.`
                        : `Nadal bez odpowiedzi: ${result.stillFailing}. Sprawdź, czy profil nie zmienił nazwy albo nie jest prywatny.`
            ),
            onError: (err: unknown) => {
                // Serwer ma przerwę między ponowieniami - 429 to nie awaria, tylko „za wcześnie".
                const response = (err as { response?: { status?: number; data?: { message?: string } } }).response;
                setResyncMessage(
                    response?.status === 429
                        ? response.data?.message ?? 'Ponawialiśmy to przed chwilą. Spróbuj za kilka minut.'
                        : 'Nie udało się ponowić. Spróbuj ponownie za chwilę.'
                );
            },
        });
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: AD_YEARS }, (_, i) => currentYear - AD_YEARS + 1 + i);

    const data = competitionQuery.data;
    const failed = data?.profiles.filter(p => p.apiError) ?? [];
    const periodLabel = days === 365 ? 'ostatnie 12 miesięcy' : `ostatnie ${days} dni`;

    const renderProfiles = () => {
        if (competitionQuery.isLoading) return <CenterState><Spinner /></CenterState>;
        if (competitionQuery.isError || !data) {
            return (
                <CenterState>
                    <strong>Nie udało się pobrać danych</strong>
                    <span>Spróbuj odświeżyć stronę.</span>
                </CenterState>
            );
        }
        const { self, competitors } = splitProfiles(data.profiles);
        if (data.profiles.length === 0) {
            return (
                <CenterState>
                    <strong>Nie obserwujesz jeszcze konkurencji</strong>
                    <span>Dodaj 3-5 studiów, z którymi rywalizujesz o klientów. Porównanie pojawi się po pierwszym pobraniu danych.</span>
                    <EmptyActions>
                        <Button variant="primary" onClick={onAddProfile}><UserPlus size={16} /> Dodaj konkurenta</Button>
                    </EmptyActions>
                </CenterState>
            );
        }
        const calendarProfiles = [...(self ? [self] : []), ...competitors];
        return (
            <>
                {(failed.length > 0 || resyncMessage) && (
                    <Notice
                        tone={failed.length > 0 ? 'warn' : 'ok'}
                        title={failed.length > 0
                            ? `Nie udało się pobrać ${failed.length} ${pluralPl(failed.length, 'profilu', 'profili', 'profili')}`
                            : undefined}
                        action={failed.length > 0 && (
                            <Button size="sm" variant="tinted" disabled={resync.isPending} onClick={handleResync}>
                                <RefreshCw size={14} /> {resync.isPending ? 'Ponawiam…' : 'Spróbuj ponownie'}
                            </Button>
                        )}
                    >
                        {failed.length > 0 && <span>{failed.map(p => `@${p.username}`).join(', ')}</span>}
                        {resyncMessage && <span>{resyncMessage}</span>}
                    </Notice>
                )}
                <ProfilesPanel data={data} colors={colors} onOpenProfile={setOpenProfile} />
                <Columns>
                    {calendarProfiles.length > 0 && (
                        <PublicationCalendar
                            weeks={data.weeks}
                            profiles={calendarProfiles}
                            events={data.events}
                            colors={colors}
                        />
                    )}
                    <GrowthRanking
                        profiles={data.profiles}
                        median={data.median}
                        colors={colors}
                        periodLabel={periodLabel}
                    />
                </Columns>
            </>
        );
    };

    const renderAds = () => {
        if (adsQuery.isLoading) return <CenterState><Spinner /></CenterState>;
        if (adsQuery.isError || !adsQuery.data) {
            return (
                <CenterState>
                    <strong>Nie udało się pobrać danych o reklamach</strong>
                    <span>Spróbuj odświeżyć stronę.</span>
                </CenterState>
            );
        }
        return <AdsTab calendar={adsQuery.data} onOpenAd={onOpenAd} showArea={false} />;
    };

    return (
        <Layout>
            <Bar>
                <Segmented
                    label="Widok konkurencji"
                    options={VIEW_OPTIONS}
                    value={view}
                    onChange={next => onChange({ view: next })}
                />
                {view === 'profile' && (
                    <Segmented
                        label="Okres"
                        size="sm"
                        options={COMPETITION_DAYS_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))}
                        value={String(days)}
                        onChange={next => onChange({ days: next === '365' ? 365 : 90 })}
                    />
                )}
                {view === 'reklamy' && (
                    <Segmented
                        label="Rok"
                        size="sm"
                        options={years.map(y => ({ value: String(y), label: String(y) }))}
                        value={String(year)}
                        onChange={next => onChange({ year: Number(next) })}
                    />
                )}
            </Bar>

            {view === 'profile' && renderProfiles()}
            {view === 'reklamy' && renderAds()}
            {view === 'okolica' && <AreaSection />}

            {openProfile && data && (
                <ProfileDetailDrawer
                    profile={data.profiles.find(p => p.studioProfileId === openProfile.studioProfileId) ?? openProfile}
                    data={data}
                    colors={colors}
                    onClose={() => setOpenProfile(null)}
                    onOpenAds={() => {
                        setOpenProfile(null);
                        onChange({ view: 'reklamy' });
                    }}
                />
            )}
        </Layout>
    );
};
