// src/modules/statistics/components/AssignServicesModal.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { t } from '@/common/i18n';
import { useServices } from '@/modules/services';
import { useAssignService, useUnassignService } from '../hooks/useCategories';
import type { CategoryDetail } from '../types';

const Content = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

const SearchInput = styled.input`
    width: 100%;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const ServiceList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
    max-height: 360px;
    overflow-y: auto;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    padding: ${props => props.theme.spacing.sm};
`;

const ServiceRow = styled.label`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border-radius: ${props => props.theme.radii.sm};
    cursor: pointer;
    transition: background ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
    }
`;

const Checkbox = styled.input`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    cursor: pointer;
    accent-color: var(--brand-primary);
`;

const ServiceName = styled.span`
    flex: 1;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
`;

const ServicePrice = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    font-variant-numeric: tabular-nums;
`;

const SelectionInfo = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const ActionsRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
`;

const CancelButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: transparent;
    color: ${props => props.theme.colors.textSecondary};
    cursor: pointer;
`;

const SaveButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    background: var(--brand-primary);
    color: white;
    cursor: pointer;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    &:hover:not(:disabled) {
        opacity: 0.9;
    }
`;

const formatPrice = (grosz: number) =>
    (grosz / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });

interface AssignServicesModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: CategoryDetail;
}

export const AssignServicesModal = ({ isOpen, onClose, category }: AssignServicesModalProps) => {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    const { services } = useServices({ search: '', page: 1, limit: 200, showInactive: false });
    const assignMutation = useAssignService();
    const unassignMutation = useUnassignService();

    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setSelectedIds(new Set(category.services.map(s => s.serviceId)));
        }
    }, [isOpen, category]);

    const filtered = services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggle = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        const originalIds = new Set(category.services.map(s => s.serviceId));
        const toAdd = [...selectedIds].filter(id => !originalIds.has(id));
        const toRemove = [...originalIds].filter(id => !selectedIds.has(id));

        setIsSaving(true);
        try {
            await Promise.all([
                ...toAdd.map(serviceId => assignMutation.mutateAsync({ categoryId: category.id, serviceId })),
                ...toRemove.map(serviceId => unassignMutation.mutateAsync({ categoryId: category.id, serviceId })),
            ]);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t.statistics.assignServices.title}
        >
            <Content>
                <SearchInput
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t.statistics.assignServices.searchPlaceholder}
                />

                <ServiceList>
                    {filtered.map(service => (
                        <ServiceRow key={service.id}>
                            <Checkbox
                                type="checkbox"
                                checked={selectedIds.has(service.id)}
                                onChange={() => toggle(service.id)}
                            />
                            <ServiceName>{service.name}</ServiceName>
                            <ServicePrice>{formatPrice(service.basePriceNet)}</ServicePrice>
                        </ServiceRow>
                    ))}
                    {filtered.length === 0 && (
                        <ServiceRow as="div" style={{ cursor: 'default', justifyContent: 'center' }}>
                            <ServiceName style={{ textAlign: 'center' }}>
                                {t.common.noResults}
                            </ServiceName>
                        </ServiceRow>
                    )}
                </ServiceList>

                <ActionsRow>
                    <SelectionInfo>
                        {selectedIds.size} {t.statistics.assignServices.selected}
                    </SelectionInfo>
                    <ButtonGroup>
                        <CancelButton onClick={onClose} disabled={isSaving}>
                            {t.common.cancel}
                        </CancelButton>
                        <SaveButton onClick={handleSave} disabled={isSaving}>
                            {isSaving
                                ? t.statistics.assignServices.saving
                                : t.common.save}
                        </SaveButton>
                    </ButtonGroup>
                </ActionsRow>
            </Content>
        </Modal>
    );
};
