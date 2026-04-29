/**
 * Card component for displaying a consent definition with its templates.
 */

import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Button } from '@/common/components/Button/Button';
import { t } from '@/common/i18n';
import { ConsentDefinitionWithTemplate } from '../types';
import { UploadTemplateModal } from './UploadTemplateModal';
import { useDeleteDefinition } from '../hooks/useConsents';

interface ConsentDefinitionCardProps {
    definitionWithTemplate: ConsentDefinitionWithTemplate;
}

export const ConsentDefinitionCard = ({ definitionWithTemplate }: ConsentDefinitionCardProps) => {
    const { definition, activeTemplate, allTemplates } = definitionWithTemplate;
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [showAllVersions, setShowAllVersions] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const { deleteDefinition, isDeleting } = useDeleteDefinition();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const displayedTemplates = showAllVersions ? allTemplates : activeTemplate ? [activeTemplate] : [];

    return (
        <>
            <Card>
                <CardHeader>
                    <DefinitionInfo>
                        <DefinitionName>{definition.name}</DefinitionName>
                        <DefinitionMeta>
                            <MetaItem>
                                <MetaLabel>{t.consents.definition.slug}:</MetaLabel>
                                <MetaValue>{definition.slug}</MetaValue>
                            </MetaItem>
                            {definition.description && (
                                <MetaItem>
                                    <MetaLabel>{t.consents.definition.description}:</MetaLabel>
                                    <MetaValue>{definition.description}</MetaValue>
                                </MetaItem>
                            )}
                        </DefinitionMeta>
                    </DefinitionInfo>
                    <HeaderActions>
                        <Button
                            $variant="primary"
                            $size="sm"
                            onClick={() => setIsUploadModalOpen(true)}
                        >
                            {t.consents.uploadNewVersion}
                        </Button>
                        <DeleteButton
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            disabled={isDeleting}
                            title="Usuń definicję zgody"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6M14 11v6"/>
                            </svg>
                            Usuń
                        </DeleteButton>
                    </HeaderActions>
                </CardHeader>

                <TemplatesSection>
                    <TemplatesHeader>
                        <TemplatesTitle>
                            {activeTemplate
                                ? t.consents.definition.activeVersion
                                : t.consents.definition.noActiveVersion}
                        </TemplatesTitle>
                        {allTemplates.length > 1 && (
                            <ToggleButton onClick={() => setShowAllVersions(!showAllVersions)}>
                                {showAllVersions
                                    ? `Ukryj starsze wersje`
                                    : `${t.consents.definition.allVersions} (${allTemplates.length})`}
                            </ToggleButton>
                        )}
                    </TemplatesHeader>

                    {displayedTemplates.length === 0 ? (
                        <EmptyState>
                            <EmptyIcon>📄</EmptyIcon>
                            <EmptyText>Brak aktywnego szablonu. Wgraj pierwszą wersję.</EmptyText>
                        </EmptyState>
                    ) : (
                        <TemplatesList>
                            {displayedTemplates.map((template) => (
                                <TemplateItem key={template.id} $isActive={template.isActive}>
                                    <TemplateInfo>
                                        <TemplateVersion>
                                            {t.consents.template.version} {template.version}
                                            {template.isActive && (
                                                <ActiveBadge>{t.consents.template.active}</ActiveBadge>
                                            )}
                                        </TemplateVersion>
                                        <TemplateMeta>
                                            <TemplateMetaItem>
                                                <MetaLabel>{t.consents.template.createdAt}:</MetaLabel>
                                                <MetaValue>{formatDate(template.createdAt)}</MetaValue>
                                            </TemplateMetaItem>
                                            <TemplateMetaItem>
                                                <MetaLabel>
                                                    {t.consents.template.requiresResign}:
                                                </MetaLabel>
                                                <MetaValue>
                                                    {template.requiresResign ? t.common.yes : t.common.no}
                                                </MetaValue>
                                            </TemplateMetaItem>
                                        </TemplateMeta>
                                    </TemplateInfo>
                                    <TemplateActions>
                                        {template.downloadUrl && (
                                            <ViewPdfButton
                                                href={template.downloadUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {t.consents.viewPdf}
                                            </ViewPdfButton>
                                        )}
                                    </TemplateActions>
                                </TemplateItem>
                            ))}
                        </TemplatesList>
                    )}
                </TemplatesSection>
            </Card>

            <UploadTemplateModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                definitionId={definition.id}
                definitionName={definition.name}
            />

            {confirmDelete && (
                <ConfirmOverlay onClick={() => setConfirmDelete(false)}>
                    <ConfirmBox onClick={e => e.stopPropagation()}>
                        <ConfirmTitle>Usuń definicję zgody</ConfirmTitle>
                        <ConfirmDesc>
                            Czy na pewno chcesz usunąć{' '}
                            <strong>„{definition.name}"</strong>?{' '}
                            Istniejące podpisane zgody klientów zostaną zachowane jako wpisy
                            historyczne, ale definicja przestanie być aktywna.
                        </ConfirmDesc>
                        <ConfirmActions>
                            <Button
                                $variant="secondary"
                                $size="sm"
                                onClick={() => setConfirmDelete(false)}
                                disabled={isDeleting}
                            >
                                Anuluj
                            </Button>
                            <Button
                                $variant="danger"
                                $size="sm"
                                onClick={() => deleteDefinition(definition.id, {
                                    onSuccess: () => setConfirmDelete(false),
                                })}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Usuwanie…' : 'Usuń definicję'}
                            </Button>
                        </ConfirmActions>
                    </ConfirmBox>
                </ConfirmOverlay>
            )}
        </>
    );
};

const Card = styled.div`
    background-color: ${(props) => props.theme.colors.surface};
    border-radius: ${(props) => props.theme.radii.lg};
    padding: ${(props) => props.theme.spacing.lg};
    box-shadow: ${(props) => props.theme.shadows.sm};
    transition: box-shadow ${(props) => props.theme.transitions.normal};

    &:hover {
        box-shadow: ${(props) => props.theme.shadows.md};
    }
`;

const CardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: ${(props) => props.theme.spacing.md};
    margin-bottom: ${(props) => props.theme.spacing.lg};
    padding-bottom: ${(props) => props.theme.spacing.md};
    border-bottom: 1px solid ${(props) => props.theme.colors.border};
`;

const DefinitionInfo = styled.div`
    flex: 1;
`;

const DefinitionName = styled.h3`
    font-size: 1.25rem;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text};
    margin: 0 0 ${(props) => props.theme.spacing.sm} 0;
`;

const DefinitionMeta = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${(props) => props.theme.spacing.xs};
`;

const MetaItem = styled.div`
    display: flex;
    gap: ${(props) => props.theme.spacing.xs};
    align-items: baseline;
`;

const MetaLabel = styled.span`
    font-size: 0.75rem;
    color: ${(props) => props.theme.colors.textSecondary};
    font-weight: 500;
`;

const MetaValue = styled.span`
    font-size: 0.875rem;
    color: ${(props) => props.theme.colors.text};
`;

const HeaderActions = styled.div`
    display: flex;
    gap: ${(props) => props.theme.spacing.sm};
`;

const TemplatesSection = styled.div``;

const TemplatesHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${(props) => props.theme.spacing.md};
`;

const TemplatesTitle = styled.h4`
    font-size: 1rem;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text};
    margin: 0;
`;

const ToggleButton = styled.button`
    background: none;
    border: none;
    color: ${(props) => props.theme.colors.primary};
    font-size: 0.875rem;
    cursor: pointer;
    padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
    border-radius: ${(props) => props.theme.radii.md};
    transition: background-color ${(props) => props.theme.transitions.fast};

    &:hover {
        background-color: ${(props) => props.theme.colors.surfaceHover};
    }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${(props) => props.theme.spacing.xxl};
    text-align: center;
`;

const EmptyIcon = styled.div`
    font-size: 3rem;
    margin-bottom: ${(props) => props.theme.spacing.md};
    opacity: 0.5;
`;

const EmptyText = styled.p`
    font-size: 0.875rem;
    color: ${(props) => props.theme.colors.textSecondary};
    margin: 0;
`;

const TemplatesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${(props) => props.theme.spacing.sm};
`;

const TemplateItem = styled.div<{ $isActive: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${(props) => props.theme.spacing.md};
    background-color: ${(props) =>
        props.$isActive ? props.theme.colors.surfaceHover : props.theme.colors.background};
    border: 1px solid
        ${(props) =>
            props.$isActive ? props.theme.colors.primary : props.theme.colors.border};
    border-radius: ${(props) => props.theme.radii.md};
    transition: all ${(props) => props.theme.transitions.fast};

    &:hover {
        background-color: ${(props) => props.theme.colors.surfaceHover};
    }
`;

const TemplateInfo = styled.div`
    flex: 1;
`;

const TemplateVersion = styled.div`
    display: flex;
    align-items: center;
    gap: ${(props) => props.theme.spacing.sm};
    font-size: 0.875rem;
    font-weight: 600;
    color: ${(props) => props.theme.colors.text};
    margin-bottom: ${(props) => props.theme.spacing.xs};
`;

const ActiveBadge = styled.span`
    display: inline-block;
    padding: 2px 8px;
    font-size: 0.75rem;
    font-weight: 600;
    color: ${(props) => props.theme.colors.surface};
    background-color: ${(props) => props.theme.colors.success};
    border-radius: ${(props) => props.theme.radii.sm};
`;

const TemplateMeta = styled.div`
    display: flex;
    gap: ${(props) => props.theme.spacing.md};
`;

const TemplateMetaItem = styled.div`
    display: flex;
    gap: ${(props) => props.theme.spacing.xs};
    align-items: baseline;
`;

const TemplateActions = styled.div`
    display: flex;
    gap: ${(props) => props.theme.spacing.sm};
`;

const DeleteButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: ${(props) => props.theme.spacing.xs};
    padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
    font-size: 0.75rem;
    font-weight: 500;
    color: ${(props) => props.theme.colors.error};
    background: transparent;
    border: 1px solid ${(props) => props.theme.colors.error}40;
    border-radius: ${(props) => props.theme.radii.md};
    cursor: pointer;
    transition: all ${(props) => props.theme.transitions.fast};

    &:hover:not(:disabled) {
        background-color: ${(props) => props.theme.colors.error}12;
        border-color: ${(props) => props.theme.colors.error};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const ConfirmOverlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.4);
    animation: ${fadeIn} 150ms ease;
`;

const ConfirmBox = styled.div`
    background: ${(props) => props.theme.colors.surface};
    border: 1px solid ${(props) => props.theme.colors.border};
    border-radius: ${(props) => props.theme.radii.lg};
    padding: ${(props) => props.theme.spacing.lg};
    max-width: 420px;
    width: calc(100% - 32px);
    box-shadow: ${(props) => props.theme.shadows.lg};
`;

const ConfirmTitle = styled.p`
    margin: 0 0 ${(props) => props.theme.spacing.sm} 0;
    font-size: 1rem;
    font-weight: 700;
    color: ${(props) => props.theme.colors.text};
`;

const ConfirmDesc = styled.p`
    margin: 0 0 ${(props) => props.theme.spacing.lg} 0;
    font-size: 0.875rem;
    color: ${(props) => props.theme.colors.textSecondary};
    line-height: 1.55;
`;

const ConfirmActions = styled.div`
    display: flex;
    gap: ${(props) => props.theme.spacing.sm};
    justify-content: flex-end;
`;

const ViewPdfButton = styled.a`
    display: inline-flex;
    align-items: center;
    gap: ${(props) => props.theme.spacing.xs};
    padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
    font-size: 0.875rem;
    color: ${(props) => props.theme.colors.primary};
    text-decoration: none;
    border: 1px solid ${(props) => props.theme.colors.primary};
    border-radius: ${(props) => props.theme.radii.md};
    transition: all ${(props) => props.theme.transitions.fast};

    &:hover {
        background-color: ${(props) => props.theme.colors.primary};
        color: ${(props) => props.theme.colors.surface};
    }
`;
