/**
 * Main view for managing consent definitions and templates (Admin Module A).
 *
 * Features:
 * - Display all consent definitions
 * - Create new consent definitions
 * - Upload new template versions with S3 workflow
 * - Manage active template versions
 */

import { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@/common/components/Button/Button';
import { t } from '@/common/i18n';
import { useConsentDefinitions } from '../hooks/useConsents';
import { ConsentDefinitionCard } from './ConsentDefinitionCard';
import { CreateDefinitionModal } from './CreateDefinitionModal';

export const ConsentSettingsView = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { definitions, isLoading, isError, refetch } = useConsentDefinitions();

    if (isLoading) {
        return (
            <Container>
                <ContentWrapper>
                    <LoadingSkeleton />
                </ContentWrapper>
            </Container>
        );
    }

    if (isError) {
        return (
            <Container>
                <ContentWrapper>
                    <ErrorState>
                        <ErrorIcon>⚠️</ErrorIcon>
                        <ErrorTitle>{t.common.error}</ErrorTitle>
                        <ErrorMessage>{t.consents.error.loadDefinitionsFailed}</ErrorMessage>
                        <Button $variant="primary" onClick={() => refetch()}>
                            {t.common.retry}
                        </Button>
                    </ErrorState>
                </ContentWrapper>
            </Container>
        );
    }

    return (
        <>
            <Container>
                <ContentWrapper>
                    <Header>
                        <HeaderText>
                            <Title>{t.consents.title}</Title>
                            <Subtitle>{t.consents.subtitle}</Subtitle>
                        </HeaderText>
                        <HeaderActions>
                            <Button
                                $variant="primary"
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                {t.consents.addDefinition}
                            </Button>
                        </HeaderActions>
                    </Header>

                    {definitions.length === 0 ? (
                        <EmptyState>
                            <EmptyIcon>📋</EmptyIcon>
                            <EmptyTitle>{t.consents.empty.title}</EmptyTitle>
                            <EmptyDescription>{t.consents.empty.description}</EmptyDescription>
                            <Button
                                $variant="primary"
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                {t.consents.addDefinition}
                            </Button>
                        </EmptyState>
                    ) : (
                        <DefinitionsGrid>
                            {definitions.map((definitionWithTemplate) => (
                                <ConsentDefinitionCard
                                    key={definitionWithTemplate.definition.id}
                                    definitionWithTemplate={definitionWithTemplate}
                                />
                            ))}
                        </DefinitionsGrid>
                    )}
                </ContentWrapper>
            </Container>

            <CreateDefinitionModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </>
    );
};

const Container = styled.div`
    min-height: 100vh;
    background-color: ${(props) => props.theme.colors.background.main};
    padding: ${(props) => props.theme.spacing.lg};

    @media (max-width: ${(props) => props.theme.breakpoints.sm}) {
        padding: ${(props) => props.theme.spacing.md};
    }
`;

const ContentWrapper = styled.div`
    max-width: 1400px;
    margin: 0 auto;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${(props) => props.theme.spacing.xxl};
    gap: ${(props) => props.theme.spacing.md};

    @media (max-width: ${(props) => props.theme.breakpoints.sm}) {
        flex-direction: column;
        align-items: stretch;
    }
`;

const HeaderText = styled.div`
    flex: 1;
`;

const Title = styled.h1`
    font-size: 2rem;
    font-weight: 700;
    color: ${(props) => props.theme.colors.text.primary};
    margin: 0 0 ${(props) => props.theme.spacing.xs} 0;

    @media (max-width: ${(props) => props.theme.breakpoints.sm}) {
        font-size: 1.5rem;
    }
`;

const Subtitle = styled.p`
    font-size: 1rem;
    color: ${(props) => props.theme.colors.text.secondary};
    margin: 0;
`;

const HeaderActions = styled.div`
    display: flex;
    gap: ${(props) => props.theme.spacing.md};

    @media (max-width: ${(props) => props.theme.breakpoints.sm}) {
        flex-direction: column;
    }
`;

const DefinitionsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${(props) => props.theme.spacing.lg};

    @media (min-width: ${(props) => props.theme.breakpoints.lg}) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${(props) => props.theme.spacing.xxl} ${(props) => props.theme.spacing.lg};
    background-color: ${(props) => props.theme.colors.surface.main};
    border-radius: ${(props) => props.theme.radius.lg};
    text-align: center;
    min-height: 400px;
`;

const EmptyIcon = styled.div`
    font-size: 4rem;
    margin-bottom: ${(props) => props.theme.spacing.lg};
    opacity: 0.5;
`;

const EmptyTitle = styled.h3`
    font-size: 1.25rem;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.primary};
    margin: 0 0 ${(props) => props.theme.spacing.sm} 0;
`;

const EmptyDescription = styled.p`
    font-size: 1rem;
    color: ${(props) => props.theme.colors.text.secondary};
    margin: 0 0 ${(props) => props.theme.spacing.lg} 0;
`;

const ErrorState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${(props) => props.theme.spacing.xxl} ${(props) => props.theme.spacing.lg};
    background-color: ${(props) => props.theme.colors.surface.main};
    border-radius: ${(props) => props.theme.radius.lg};
    text-align: center;
    min-height: 400px;
`;

const ErrorIcon = styled.div`
    font-size: 4rem;
    margin-bottom: ${(props) => props.theme.spacing.lg};
`;

const ErrorTitle = styled.h3`
    font-size: 1.25rem;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.primary};
    margin: 0 0 ${(props) => props.theme.spacing.sm} 0;
`;

const ErrorMessage = styled.p`
    font-size: 1rem;
    color: ${(props) => props.theme.colors.text.secondary};
    margin: 0 0 ${(props) => props.theme.spacing.lg} 0;
`;

const LoadingSkeleton = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${(props) => props.theme.spacing.lg};

    &::before,
    &::after {
        content: '';
        display: block;
        height: 200px;
        background: linear-gradient(
            90deg,
            ${(props) => props.theme.colors.surface.main} 0%,
            ${(props) => props.theme.colors.surface.hover} 50%,
            ${(props) => props.theme.colors.surface.main} 100%
        );
        background-size: 200% 100%;
        border-radius: ${(props) => props.theme.radius.lg};
        animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
        0% {
            background-position: 200% 0;
        }
        100% {
            background-position: -200% 0;
        }
    }
`;
