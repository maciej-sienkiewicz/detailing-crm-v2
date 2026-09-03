import { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useToast } from '@/common/components/Toast';
import { usePermissions } from '@/core/permissions';
import { visitApi } from '@/modules/visits/api/visitApi';
import type { OpenDraftVisit } from '@/modules/visits/types';
import { ResumeCheckInModal } from './ResumeCheckInModal';

/*
 * Kolejka nieukończonych przyjęć.
 *
 * Wizyta w statusie DRAFT nie jest wizytą — jest przyjęciem w toku, więc nie ma jej ani
 * na liście wizyt, ani w Aktywności, ani pod własnym adresem. Póki jedyną drogą do niej
 * było okno kreatora, „nie ma jej nigdzie" znaczyło w praktyce „przepadła": auto stało
 * w warsztacie, a system nie umiał o nim przypomnieć. To miejsce jest tą drogą:
 * krótka lista tego, co ktoś zaczął i nie skończył, z jedną akcją — dokończ.
 */

const Banner = styled.section<{ $alert: boolean }>`
    border: 1px solid ${({ $alert }) => ($alert ? 'rgba(234, 179, 8, 0.45)' : st.border)};
    background: ${({ $alert }) => ($alert ? 'rgba(234, 179, 8, 0.08)' : st.bgCard)};
    border-radius: 10px;
    overflow: hidden;
`;

const BannerHead = styled.button`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    padding: 12px 16px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
`;

const HeadText = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
`;

const CountChip = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    border-radius: ${st.radiusFull};
    background: #EAB308;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
`;

const HeadHint = styled.span`
    font-size: 12px;
    font-weight: 500;
    color: ${st.textSecondary};
`;

const List = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0 8px 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const Row = styled.li`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};

    @media (max-width: 639px) {
        flex-direction: column;
        align-items: stretch;
    }
`;

const RowMain = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const RowTitle = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${st.text};
`;

const RowMeta = styled.span<{ $alert: boolean }>`
    font-size: 12px;
    color: ${({ $alert }) => ($alert ? '#B45309' : st.textSecondary)};
`;

const ResumeBtn = styled.button`
    flex-shrink: 0;
    padding: 7px 16px;
    border: none;
    border-radius: ${st.radiusSm};
    background: ${st.accentBlue};
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity ${st.transition};

    &:hover { opacity: 0.9; }
`;

const ChevronIcon = ({ $open }: { $open: boolean }) => (
    <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5"
        style={{ transform: $open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }}
    >
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

/** „12 min" / „3 h 20 min" — wiek przyjęcia czyta się szybciej niż godzina zapisu. */
const formatAge = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

const describe = (draft: OpenDraftVisit): string => {
    const parts = [
        `rozpoczęte ${formatAge(draft.ageMinutes)} temu`,
        draft.createdByName ? `przez: ${draft.createdByName}` : null,
        draft.customerName,
    ].filter(Boolean);
    return parts.join(' · ');
};

export const UnfinishedCheckInsPanel = () => {
    const { can } = usePermissions();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showSuccess } = useToast();

    const [expanded, setExpanded] = useState(false);
    const [resuming, setResuming] = useState<OpenDraftVisit | null>(null);

    const { data } = useQuery({
        queryKey: ['open-draft-visits'],
        queryFn: visitApi.getOpenDrafts,
        // Przyjęcia domykają się także z innych stanowisk — lista ma być świeża,
        // ale nie kosztem odpytywania serwera przy każdym renderze listy wizyt.
        staleTime: 30_000,
        enabled: can('VISITS_CREATE'),
    });

    const drafts = data?.drafts ?? [];
    if (drafts.length === 0) return null;

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['open-draft-visits'] });
    const hasStale = drafts.some(draft => draft.stale);

    return (
        <>
            <Banner $alert={hasStale}>
                <BannerHead onClick={() => setExpanded(open => !open)}>
                    <HeadText>
                        <CountChip>{drafts.length}</CountChip>
                        Nieukończone przyjęcia
                        <HeadHint>
                            {hasStale
                                ? 'auta przyjęte, ale wizyty nie zostały rozpoczęte'
                                : 'przyjęcia czekają na podpisy i zatwierdzenie'}
                        </HeadHint>
                    </HeadText>
                    <ChevronIcon $open={expanded} />
                </BannerHead>

                {expanded && (
                    <List>
                        {drafts.map(draft => (
                            <Row key={draft.visitId}>
                                <RowMain>
                                    <RowTitle>
                                        {draft.vehicleName}
                                        {draft.licensePlate ? ` (${draft.licensePlate})` : ''}
                                        {' · '}
                                        {draft.visitNumber}
                                    </RowTitle>
                                    <RowMeta $alert={draft.stale}>{describe(draft)}</RowMeta>
                                </RowMain>
                                <ResumeBtn onClick={() => setResuming(draft)}>
                                    Dokończ przyjęcie
                                </ResumeBtn>
                            </Row>
                        ))}
                    </List>
                )}
            </Banner>

            {resuming && (
                <ResumeCheckInModal
                    draft={resuming}
                    onConfirmed={(visitId) => {
                        // Kartę Wizyty wysłał już backend razem z potwierdzeniem (flaga sendVisitCard).
                        setResuming(null);
                        refresh();
                        showSuccess(`Wizyta ${resuming.visitNumber} rozpoczęta pomyślnie!`);
                        navigate(`/visits/${visitId}`);
                    }}
                    onCancelled={() => { setResuming(null); refresh(); }}
                    onLeaveForLater={() => { setResuming(null); refresh(); }}
                />
            )}
        </>
    );
};
