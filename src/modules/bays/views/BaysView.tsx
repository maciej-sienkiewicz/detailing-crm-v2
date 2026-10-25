// src/modules/bays/views/BaysView.tsx
//
// /bays - hala: „Teraz" (gdzie stoi każde auto) i „Tydzień" (plan po stanowiskach).
// Osobna trasa zamiast nowego widoku w kalendarzu: FullCalendar w projekcie nie ma
// widoku zasobów (to płatny Scheduler), więc siatkę stanowisk i tak trzeba napisać
// samemu - a osobna trasa zostawia obecny kalendarz nietknięty.
//
// Nad tablicą jest JEDEN pas: nazwa widoku z datą i przełącznik Teraz / Tydzień
// obok kroku następnego. Wszystko, co było między nagłówkiem a autami (pasek liczb,
// komunikat, osobny rząd przycisków), spychało halę pod zgięcie ekranu tabletu.

import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Settings2 } from 'lucide-react';
import { PageContainer } from '@/common/components/PageContainer';
import { PageHeader, PageHeaderPrimaryButton, MobilePageHeader, MobilePageHeaderButton, MobilePageHeaderIconButton } from '@/common/components/PageHeader';
import { Button, IconButton, Notice, Segmented } from '@/common/components/ui';
import { useBreakpoint } from '@/common/hooks';
import { useToast } from '@/common/components/Toast';
import { formatClockTime } from '@/common/dateTime';
import { usePermissions, usePersonalDataActions } from '@/core/permissions';
import { BoardNow } from '../components/BoardNow';
import { WeekView } from '../components/WeekView';
import { BaysSettingsDrawer } from '../components/BaysSettingsDrawer';
import { useBaysMutation, useBaysNow, useBaysSnapshot } from '../hooks/useBays';
import { baysApi } from '../api/baysApi';
import { useBaysEnabled, useStudioHours } from '../featureFlag';
import { dayLong, dayMonth, dayShort, toDateKey } from '../utils/slots';

const ViewContainer = styled.div`
    min-height: 100vh;
    background: ${p => p.theme.colors.background};
`;

const PageBody = styled(PageContainer)`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-block-end: 40px;
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

type ViewMode = 'now' | 'week';

export function BaysView() {
    const isDesktop = useBreakpoint('lg');
    const navigate = useNavigate();
    const { showSuccess } = useToast();
    const { canCreateVisit } = usePersonalDataActions();
    const [params, setParams] = useSearchParams();
    const mode: ViewMode = params.get('view') === 'week' ? 'week' : 'now';
    const setMode = (m: ViewMode) => setParams(p => { const n = new URLSearchParams(p); if (m === 'week') n.set('view', 'week'); else n.delete('view'); return n; }, { replace: true });
    const enabled = useBaysEnabled();
    const hoursKey = useStudioHours();
    const { data: snap } = useBaysSnapshot(undefined, enabled);
    const now = useBaysNow();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const saveSetup = useBaysMutation(baysApi.saveSetup);
    // Te same prawa co serwer: wjazd i zjazd to dokumentowanie pracy (każdy z dostępem
    // do wizyt, czyli każdy, kto tu wszedł), plan to zajęcie terminu (zakładanie wizyt),
    // a lista stanowisk to decyzja właściciela.
    const { can, isOwner } = usePermissions();
    const canPlan = can('VISITS_CREATE');

    const day = dayLong(toDateKey(now));
    // Na telefonie skrót dnia: pełna nazwa z dopiskiem ucinała się w pasku nagłówka.
    const dateLine = (
        <>
            {isDesktop ? day.charAt(0).toUpperCase() + day.slice(1) : dayShort(toDateKey(now))}, {dayMonth(toDateKey(now))}, {formatClockTime(now)}
        </>
    );

    const segmented = (
        <Segmented<ViewMode>
            label="Widok hali"
            value={mode}
            onChange={setMode}
            block={!isDesktop}
            options={[{ value: 'now', label: 'Teraz' }, { value: 'week', label: 'Tydzień' }]}
        />
    );

    return (
        <ViewContainer>
            <PageBody>
                {isDesktop ? (
                    <PageHeader
                        title="Stanowiska"
                        subtitle={dateLine}
                        actions={(
                            <HeaderActions>
                                {segmented}
                                {isOwner && <IconButton label="Ustawienia stanowisk" onClick={() => setSettingsOpen(true)}><Settings2 /></IconButton>}
                                {canCreateVisit && (
                                    <PageHeaderPrimaryButton onClick={() => navigate('/checkin/new')}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        Przyjmij auto
                                    </PageHeaderPrimaryButton>
                                )}
                            </HeaderActions>
                        )}
                    />
                ) : (
                    <>
                        <MobilePageHeader
                            icon={<LayoutGrid />}
                            title="Stanowiska"
                            subtitle={dateLine}
                            actions={(
                                <>
                                    {isOwner && <MobilePageHeaderIconButton aria-label="Ustawienia stanowisk" onClick={() => setSettingsOpen(true)}><Settings2 /></MobilePageHeaderIconButton>}
                                    {canCreateVisit && (
                                        <MobilePageHeaderButton onClick={() => navigate('/checkin/new')}>
                                            <span aria-hidden="true">+</span>
                                            Auto
                                        </MobilePageHeaderButton>
                                    )}
                                </>
                            )}
                        />
                        {segmented}
                    </>
                )}

                {/* Wejście z dawnego linku, gdy studio wyłączyło stanowiska: mówimy, gdzie je włączyć. */}
                {!enabled && (
                    <Notice
                        tone="info"
                        title="Stanowiska są wyłączone"
                        action={<Button variant="tinted" size="sm" onClick={() => navigate('/settings?tab=bays')}>Ustawienia stanowisk</Button>}
                    >
                        Włącza je właściciel w Ustawieniach. Wcześniejszy plan i historia są zapisane.
                    </Notice>
                )}

                {enabled && snap && (mode === 'now'
                    ? <BoardNow key={hoursKey} snap={snap} now={now} canEdit />
                    : <WeekView key={hoursKey} snap={snap} now={now} canEdit={canPlan} />)}
            </PageBody>

            {settingsOpen && snap && (
                <BaysSettingsDrawer
                    bays={snap.bays}
                    settings={snap.settings}
                    people={snap.people}
                    onClose={() => setSettingsOpen(false)}
                    onSave={async (bays, next) => { await saveSetup.mutateAsync([next, bays]); setSettingsOpen(false); showSuccess('Stanowiska zapisane'); }}
                />
            )}
        </ViewContainer>
    );
}
