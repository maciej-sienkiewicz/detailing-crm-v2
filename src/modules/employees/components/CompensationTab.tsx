import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useCurrentCompensation, useCompensationHistory } from '../hooks/useCompensation';
import type { EmploymentMode, EtatFraction } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const ETAT_LABELS: Record<EtatFraction, string> = {
    FULL: 'Pełen etat (168 h/mies.)',
    HALF: 'Pół etatu (84 h/mies.)',
    QUARTER: 'Ćwierć etatu (42 h/mies.)',
};

const EMPLOYMENT_MODE_LABELS: Record<EmploymentMode, string> = {
    SALARY: 'Etat',
    HOURLY: 'Godzinówka',
};

// ─── Styled Components ───────────────────────────────────────────────────────

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const InfoNote = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-style: italic;
`;

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 16px;
`;

const CardTitle = styled.p`
    margin: 0 0 12px 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const ModeMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
`;

const ModeBadge = styled.span<{ $mode: EmploymentMode }>`
    display: inline-block;
    padding: 3px 10px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 700;
    background: ${p => p.$mode === 'SALARY' ? '#EFF6FF' : '#F0FDF4'};
    color: ${p => p.$mode === 'SALARY' ? '#1D4ED8' : '#16A34A'};
`;

const EtatLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const AmountGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
`;

const AmountCard = styled.div`
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    padding: 12px;
`;

const AmountLabel = styled.p`
    margin: 0 0 4px 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const AmountValue = styled.p`
    margin: 0;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
`;

const ComponentsTitle = styled.p`
    margin: 0 0 8px 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const ComponentRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
`;

const ComponentName = styled.span`
    font-size: ${st.fontSm};
    color: ${st.text};
`;

const ComponentValue = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.accentBlue};
`;

const EffectiveFrom = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const EmptyText = styled.p`
    margin: 0;
    padding: 32px 0;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 32px auto;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

const HistoryTitle = styled.h4`
    margin: 0 0 8px 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const HistoryItem = styled.div`
    padding: 10px 0;
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const HistoryPeriod = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCents = (cents: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);

interface Props { employeeId: string; }

// ─── Component ───────────────────────────────────────────────────────────────

export const CompensationTab = ({ employeeId }: Props) => {
    const { compensation, isLoading } = useCurrentCompensation(employeeId);
    const { history } = useCompensationHistory(employeeId);

    if (isLoading) return <Spinner />;

    return (
        <Section>
            <TopRow>
                <SectionTitle>Wynagrodzenie</SectionTitle>
                <InfoNote>Zmiany wynagrodzenia dodajesz jako aneks w zakładce Umowy.</InfoNote>
            </TopRow>

            {compensation ? (
                <Card>
                    <CardTitle>Aktualna konfiguracja</CardTitle>

                    <ModeMeta>
                        <ModeBadge $mode={compensation.employmentMode ?? 'SALARY'}>
                            {EMPLOYMENT_MODE_LABELS[compensation.employmentMode ?? 'SALARY']}
                        </ModeBadge>
                        {compensation.etatFraction && (
                            <EtatLabel>{ETAT_LABELS[compensation.etatFraction]}</EtatLabel>
                        )}
                    </ModeMeta>

                    <AmountGrid>
                        {compensation.monthlySalaryGrossCents != null && (
                            <AmountCard>
                                <AmountLabel>Wynagrodzenie miesięczne brutto</AmountLabel>
                                <AmountValue>{formatCents(compensation.monthlySalaryGrossCents)}</AmountValue>
                            </AmountCard>
                        )}
                        {compensation.baseSalaryGrossCents != null && compensation.monthlySalaryGrossCents == null && (
                            <AmountCard>
                                <AmountLabel>Wynagrodzenie brutto</AmountLabel>
                                <AmountValue>{formatCents(compensation.baseSalaryGrossCents)}</AmountValue>
                            </AmountCard>
                        )}
                        {compensation.hourlyRateGrossCents != null && (
                            <AmountCard>
                                <AmountLabel>
                                    {compensation.employmentMode === 'SALARY'
                                        ? 'Stawka godzinowa (wyliczona)'
                                        : 'Stawka godzinowa'}
                                </AmountLabel>
                                <AmountValue>{formatCents(compensation.hourlyRateGrossCents)}/h</AmountValue>
                            </AmountCard>
                        )}
                    </AmountGrid>

                    {compensation.components.length > 0 && (
                        <>
                            <ComponentsTitle>Składniki wynagrodzenia</ComponentsTitle>
                            {compensation.components.map(comp => (
                                <ComponentRow key={comp.id}>
                                    <ComponentName>{comp.name}</ComponentName>
                                    <ComponentValue>
                                        {comp.type === 'PERCENTAGE_OF_REVENUE'
                                            ? `${comp.value}%`
                                            : formatCents(comp.value * 100)}
                                    </ComponentValue>
                                </ComponentRow>
                            ))}
                        </>
                    )}

                    <EffectiveFrom>
                        Obowiązuje od: {new Date(compensation.effectiveFrom).toLocaleDateString('pl-PL')}
                    </EffectiveFrom>
                </Card>
            ) : (
                <EmptyText>Brak skonfigurowanego wynagrodzenia. Dodaj umowę w zakładce Umowy.</EmptyText>
            )}

            {history.length > 1 && (
                <Card>
                    <HistoryTitle>Historia wynagrodzeń</HistoryTitle>
                    {history.slice(1).map(h => (
                        <HistoryItem key={h.id}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ModeBadge $mode={h.employmentMode ?? 'SALARY'}>
                                    {EMPLOYMENT_MODE_LABELS[h.employmentMode ?? 'SALARY']}
                                </ModeBadge>
                                <span style={{ fontSize: st.fontSm, color: st.textSecondary }}>
                                    {h.monthlySalaryGrossCents != null
                                        ? formatCents(h.monthlySalaryGrossCents)
                                        : h.hourlyRateGrossCents != null
                                            ? `${formatCents(h.hourlyRateGrossCents)}/h`
                                            : h.baseSalaryGrossCents != null
                                                ? formatCents(h.baseSalaryGrossCents)
                                                : '—'}
                                </span>
                            </div>
                            <HistoryPeriod>
                                {new Date(h.effectiveFrom).toLocaleDateString('pl-PL')}
                                {h.effectiveTo ? ` – ${new Date(h.effectiveTo).toLocaleDateString('pl-PL')}` : ''}
                            </HistoryPeriod>
                        </HistoryItem>
                    ))}
                </Card>
            )}
        </Section>
    );
};
