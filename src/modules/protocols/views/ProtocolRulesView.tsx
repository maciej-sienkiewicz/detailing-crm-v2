import { useState } from 'react';
import styled from 'styled-components';
import { useProtocolRules, useProtocolTemplates } from '../api/useProtocols';
import { ProtocolRuleCard } from '../components/ProtocolRuleCard';
import { ProtocolTemplateModal } from '../components/ProtocolTemplateModal';
import { ProtocolRuleModal } from '../components/ProtocolRuleModal';
import { EmptyState } from '@/common/components/EmptyState';
import type { ProtocolTemplate, ProtocolRule, ProtocolStage } from '../types';

const ViewContainer = styled.main`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.lg};
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
    background: rgb(248, 250, 252); // bg-slate-50

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }

    @media (min-width: ${props => props.theme.breakpoints.xl}) {
        padding: ${props => props.theme.spacing.xxl};
    }
`;

const ViewHeader = styled.header`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const TitleSection = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.md};
`;

const TitleContent = styled.div``;

const PageTitle = styled.h1`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xxl};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const PageSubtitle = styled.p`
    margin: ${props => props.theme.spacing.xs} 0 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    max-width: 600px;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
`;

const AddButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: opacity ${props => props.theme.transitions.fast};
    white-space: nowrap;

    &:hover {
        opacity: 0.9;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const SecondaryButton = styled(AddButton)`
    background: white;
    color: var(--brand-primary);
    border: 1px solid var(--brand-primary);

    &:hover {
        background: rgb(249, 250, 251);
        opacity: 1;
    }
`;

const StagesGrid = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.xl};
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.lg}) {
        grid-template-columns: 1fr 1fr;
    }
`;

const StageSection = styled.section`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const StageHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: white;
    border-radius: ${props => props.theme.radii.lg};
    border: 1px solid ${props => props.theme.colors.border};
`;

const StageTitle = styled.h2`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
`;

const StageIcon = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: ${props => props.theme.radii.md};
    background: rgb(239, 246, 255); // blue-50
    color: rgb(59, 130, 246); // blue-500

    svg {
        width: 18px;
        height: 18px;
    }
`;

const AddRuleButton = styled.button`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.md};
    background: transparent;
    color: var(--brand-primary);
    border: 1px solid var(--brand-primary);
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: rgb(249, 250, 251);
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const RulesContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    min-height: 200px;
`;

const LoadingOverlay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    background: white;
    border-radius: ${props => props.theme.radii.lg};
    border: 1px solid ${props => props.theme.colors.border};
`;

const Spinner = styled.div`
    width: 40px;
    height: 40px;
    border: 3px solid ${props => props.theme.colors.border};
    border-top-color: ${props => props.theme.colors.primary};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const ErrorContainer = styled.div`
    padding: ${props => props.theme.spacing.xl};
    text-align: center;
    color: ${props => props.theme.colors.error};
    background: white;
    border-radius: ${props => props.theme.radii.lg};
    border: 1px solid ${props => props.theme.colors.border};
`;

const EmptyStateWrapper = styled.div`
    background: white;
    border-radius: ${props => props.theme.radii.lg};
    border: 2px dashed ${props => props.theme.colors.border};
    padding: ${props => props.theme.spacing.xl};
`;

// Icons (Lucide-inspired SVG icons)
const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const ArrowDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
);

const ArrowUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
);

const FileTextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

export const ProtocolRulesView = () => {
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [selectedStage, setSelectedStage] = useState<ProtocolStage>('CHECK_IN');

    const { data: rules = [], isLoading, isError, refetch } = useProtocolRules();
    const { data: templates = [] } = useProtocolTemplates();

    const checkInRules = rules.filter(rule => rule.stage === 'CHECK_IN');
    const checkOutRules = rules.filter(rule => rule.stage === 'CHECK_OUT');

    const handleAddRule = (stage: ProtocolStage) => {
        setSelectedStage(stage);
        setIsRuleModalOpen(true);
    };

    const handleCloseRuleModal = () => {
        setIsRuleModalOpen(false);
    };

    if (isLoading) {
        return (
            <ViewContainer>
                <LoadingOverlay>
                    <Spinner />
                </LoadingOverlay>
            </ViewContainer>
        );
    }

    if (isError) {
        return (
            <ViewContainer>
                <ErrorContainer>
                    <p>Nie udało się załadować protokołów dokumentacji</p>
                </ErrorContainer>
            </ViewContainer>
        );
    }

    return (
        <ViewContainer>
            <ViewHeader>
                <TitleSection>
                    <TitleContent>
                        <PageTitle>Centrum Dokumentacji</PageTitle>
                        <PageSubtitle>
                            Zarządzaj protokołami wymaganymi przy przyjęciu i wydaniu pojazdu.
                            Ustaw reguły globalne i specyficzne dla usług.
                        </PageSubtitle>
                    </TitleContent>
                    <ButtonGroup>
                        <SecondaryButton onClick={() => setIsTemplateModalOpen(true)}>
                            <FileTextIcon />
                            Zarządzaj szablonami
                        </SecondaryButton>
                    </ButtonGroup>
                </TitleSection>
            </ViewHeader>

            <StagesGrid>
                {/* Check-in Stage */}
                <StageSection>
                    <StageHeader>
                        <StageTitle>
                            <StageIcon>
                                <ArrowDownIcon />
                            </StageIcon>
                            Etap: Przyjęcie
                        </StageTitle>
                        <AddRuleButton onClick={() => handleAddRule('CHECK_IN')}>
                            <PlusIcon />
                            Dodaj regułę
                        </AddRuleButton>
                    </StageHeader>
                    <RulesContainer>
                        {checkInRules.length === 0 ? (
                            <EmptyStateWrapper>
                                <EmptyState
                                    title="Brak protokołów"
                                    description="Dodaj pierwszy protokół wymagany przy przyjęciu pojazdu"
                                />
                            </EmptyStateWrapper>
                        ) : (
                            checkInRules
                                .sort((a, b) => a.displayOrder - b.displayOrder)
                                .map(rule => (
                                    <ProtocolRuleCard
                                        key={rule.id}
                                        rule={rule}
                                        onRefresh={refetch}
                                    />
                                ))
                        )}
                    </RulesContainer>
                </StageSection>

                {/* Check-out Stage */}
                <StageSection>
                    <StageHeader>
                        <StageTitle>
                            <StageIcon>
                                <ArrowUpIcon />
                            </StageIcon>
                            Etap: Wydanie
                        </StageTitle>
                        <AddRuleButton onClick={() => handleAddRule('CHECK_OUT')}>
                            <PlusIcon />
                            Dodaj regułę
                        </AddRuleButton>
                    </StageHeader>
                    <RulesContainer>
                        {checkOutRules.length === 0 ? (
                            <EmptyStateWrapper>
                                <EmptyState
                                    title="Brak protokołów"
                                    description="Dodaj pierwszy protokół wymagany przy wydaniu pojazdu"
                                />
                            </EmptyStateWrapper>
                        ) : (
                            checkOutRules
                                .sort((a, b) => a.displayOrder - b.displayOrder)
                                .map(rule => (
                                    <ProtocolRuleCard
                                        key={rule.id}
                                        rule={rule}
                                        onRefresh={refetch}
                                    />
                                ))
                        )}
                    </RulesContainer>
                </StageSection>
            </StagesGrid>

            <ProtocolTemplateModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                templates={templates}
                onSuccess={refetch}
            />

            <ProtocolRuleModal
                isOpen={isRuleModalOpen}
                onClose={handleCloseRuleModal}
                stage={selectedStage}
                templates={templates}
                onSuccess={refetch}
            />
        </ViewContainer>
    );
};
