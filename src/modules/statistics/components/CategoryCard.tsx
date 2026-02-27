// src/modules/statistics/components/CategoryCard.tsx
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import type { Category } from '../types';
import { t } from '@/common/i18n';

const Card = styled.div<{ $isActive: boolean }>`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.lg};
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    cursor: pointer;
    transition: box-shadow ${props => props.theme.transitions.fast},
        border-color ${props => props.theme.transitions.fast};
    opacity: ${props => (props.$isActive ? 1 : 0.6)};

    &:hover {
        box-shadow: ${props => props.theme.shadows.md};
        border-color: ${props => props.theme.colors.primary};
    }
`;

const CardHeader = styled.div`
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.md};
`;

const ColorDot = styled.div<{ $color: string }>`
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-color: ${props => props.$color};
    margin-top: 3px;
`;

const TitleGroup = styled.div`
    flex: 1;
    min-width: 0;
`;

const CategoryName = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const CategoryDescription = styled.p`
    margin: ${props => props.theme.spacing.xs} 0 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
`;

const CardFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const ServiceCount = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const StatusBadge = styled.span<{ $active: boolean }>`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 600;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.full};
    background: ${props =>
        props.$active
            ? props.theme.colors.successLight
            : props.theme.colors.errorLight};
    color: ${props =>
        props.$active
            ? props.theme.colors.success
            : props.theme.colors.error};
`;

const Actions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.xs};
`;

const ActionButton = styled.button`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    border-radius: ${props => props.theme.radii.sm};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    border: 1px solid ${props => props.theme.colors.border};
    background: transparent;
    color: ${props => props.theme.colors.textSecondary};

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
    }
`;

const DeleteButton = styled(ActionButton)`
    &:hover {
        background: ${props => props.theme.colors.errorLight};
        color: ${props => props.theme.colors.error};
        border-color: ${props => props.theme.colors.error};
    }
`;

const DEFAULT_COLOR = '#6B7280';

interface CategoryCardProps {
    category: Category;
    onEdit: (category: Category) => void;
    onDelete: (category: Category) => void;
}

export const CategoryCard = ({ category, onEdit, onDelete }: CategoryCardProps) => {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/statistics/categories/${category.id}`);
    };

    const handleEdit = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onEdit(category);
    };

    const handleDelete = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onDelete(category);
    };

    return (
        <Card $isActive={category.isActive} onClick={handleCardClick}>
            <CardHeader>
                <ColorDot $color={category.color || DEFAULT_COLOR} />
                <TitleGroup>
                    <CategoryName>{category.name}</CategoryName>
                    {category.description && (
                        <CategoryDescription>{category.description}</CategoryDescription>
                    )}
                </TitleGroup>
            </CardHeader>

            <CardFooter>
                <ServiceCount>
                    {category.serviceCount} {t.statistics.categories.services}
                </ServiceCount>
                <Actions>
                    <StatusBadge $active={category.isActive}>
                        {category.isActive
                            ? t.statistics.categories.statusActive
                            : t.statistics.categories.statusInactive}
                    </StatusBadge>
                    <ActionButton onClick={handleEdit}>{t.common.edit}</ActionButton>
                    <DeleteButton onClick={handleDelete}>{t.common.delete}</DeleteButton>
                </Actions>
            </CardFooter>
        </Card>
    );
};
