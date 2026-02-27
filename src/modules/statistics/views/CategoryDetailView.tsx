// src/modules/statistics/views/CategoryDetailView.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { t } from '@/common/i18n';
import { StatsFilters } from '../components/StatsFilters';
import { StatsTotalsBar } from '../components/StatsTotalsBar';
import { StatsChart } from '../components/StatsChart';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { AssignServicesModal } from '../components/AssignServicesModal';
import { useCategoryDetail } from '../hooks/useCategories';
import { useCategoryStats } from '../hooks/useStats';
import type { Granularity } from '../types';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xl};
    padding: ${props => props.theme.spacing.lg};
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }
`;

const BackButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.xs} 0;
    background: none;
    border: none;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    cursor: pointer;

    &:hover {
        color: ${props => props.theme.colors.text};
    }
`;

const PageHeader = styled.header`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
`;

const TitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
`;

const ColorDot = styled.div<{ $color: string }>`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: ${props => props.$color};
    flex-shrink: 0;
`;

const TitleGroup = styled.div``;

const PageTitle = styled.h1`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const PageDescription = styled.p`
    margin: ${props => props.theme.spacing.xs} 0 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const ActionsRow = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-shrink: 0;
`;

const ActionButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    background: transparent;
    color: ${props => props.theme.colors.textSecondary};
    cursor: pointer;
    white-space: nowrap;

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
        color: ${props => props.theme.colors.text};
    }
`;

const PrimaryButton = styled(ActionButton)`
    background: var(--brand-primary);
    color: white;
    border-color: transparent;

    &:hover {
        opacity: 0.9;
        background: var(--brand-primary);
        color: white;
    }
`;

const Section = styled.section`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h2`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
`;

const ServicesList = styled.div`
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const ServicesTable = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

const Th = styled.th`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    text-align: left;
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    background: ${props => props.theme.colors.surfaceAlt};
`;

const Td = styled.td`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    border-bottom: 1px solid ${props => props.theme.colors.border};

    &:last-child {
        border-bottom: none;
    }
`;

const Tr = styled.tr`
    &:last-child td {
        border-bottom: none;
    }
`;

const StatusDot = styled.span<{ $active: boolean }>`
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => (props.$active ? props.theme.colors.success : props.theme.colors.error)};
    margin-right: ${props => props.theme.spacing.xs};
`;

const LoadingOverlay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
`;

const Spinner = styled.div`
    width: 36px;
    height: 36px;
    border: 3px solid ${props => props.theme.colors.border};
    border-top-color: ${props => props.theme.colors.primary};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const ErrorText = styled.p`
    color: ${props => props.theme.colors.error};
    text-align: center;
    font-size: ${props => props.theme.fontSizes.sm};
`;

const today = () => new Date().toISOString().slice(0, 10);
const oneYearAgo = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
};

const DEFAULT_COLOR = '#6B7280';

export const CategoryDetailView = () => {
    const { categoryId } = useParams<{ categoryId: string }>();
    const navigate = useNavigate();

    const [granularity, setGranularity] = useState<Granularity>('MONTHLY');
    const [startDate, setStartDate] = useState(oneYearAgo());
    const [endDate, setEndDate] = useState(today());
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    const { category, isLoading: catLoading, isError: catError } = useCategoryDetail(categoryId || '');
    const { stats, isLoading: statsLoading, isError: statsError } = useCategoryStats(
        categoryId || '',
        granularity,
        startDate,
        endDate
    );

    if (catLoading) {
        return (
            <ViewContainer>
                <LoadingOverlay><Spinner /></LoadingOverlay>
            </ViewContainer>
        );
    }

    if (catError || !category) {
        return (
            <ViewContainer>
                <ErrorText>{t.statistics.categoryDetail.error}</ErrorText>
            </ViewContainer>
        );
    }

    return (
        <ViewContainer>
            <BackButton onClick={() => navigate('/statistics')}>
                ← {t.common.backToList}
            </BackButton>

            <PageHeader>
                <TitleRow>
                    <ColorDot $color={category.color || DEFAULT_COLOR} />
                    <TitleGroup>
                        <PageTitle>{category.name}</PageTitle>
                        {category.description && (
                            <PageDescription>{category.description}</PageDescription>
                        )}
                    </TitleGroup>
                </TitleRow>

                <ActionsRow>
                    <ActionButton onClick={() => setIsEditModalOpen(true)}>
                        {t.common.edit}
                    </ActionButton>
                    <PrimaryButton onClick={() => setIsAssignModalOpen(true)}>
                        {t.statistics.categoryDetail.assignServices}
                    </PrimaryButton>
                </ActionsRow>
            </PageHeader>

            <Section>
                <StatsFilters
                    granularity={granularity}
                    startDate={startDate}
                    endDate={endDate}
                    onGranularityChange={setGranularity}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                />

                {statsLoading && <LoadingOverlay><Spinner /></LoadingOverlay>}
                {statsError && <ErrorText>{t.statistics.overview.error}</ErrorText>}

                {stats && (
                    <>
                        <StatsTotalsBar totals={stats.totals} />
                        <StatsChart data={stats.data} />
                    </>
                )}
            </Section>

            <Section>
                <SectionTitle>
                    {t.statistics.categoryDetail.servicesTitle} ({category.services.length})
                </SectionTitle>

                <ServicesList>
                    {category.services.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
                            {t.statistics.categoryDetail.noServices}
                        </div>
                    ) : (
                        <ServicesTable>
                            <thead>
                                <tr>
                                    <Th>{t.statistics.categoryDetail.serviceNameCol}</Th>
                                    <Th>{t.statistics.categoryDetail.serviceStatusCol}</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {category.services.map(service => (
                                    <Tr key={service.serviceId}>
                                        <Td>{service.serviceName}</Td>
                                        <Td>
                                            <StatusDot $active={service.isActive} />
                                            {service.isActive
                                                ? t.statistics.categories.statusActive
                                                : t.statistics.categories.statusInactive}
                                        </Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </ServicesTable>
                    )}
                </ServicesList>
            </Section>

            <CategoryFormModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                category={category}
            />

            {isAssignModalOpen && (
                <AssignServicesModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    category={category}
                />
            )}
        </ViewContainer>
    );
};
