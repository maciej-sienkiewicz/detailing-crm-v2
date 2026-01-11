// src/modules/appointments/components/ServiceItem.tsx
import styled from 'styled-components';
import { useState, useEffect, useRef } from 'react';
import { formatMoneyAmount } from '../hooks/usePriceCalculator';
import { useServicePricing } from '../hooks/useServicePricing';
import { t } from '@/common/i18n';
import type { ServiceLineItem, AdjustmentType } from '../types';

const ItemRow = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: linear-gradient(to right, ${props => props.theme.colors.surfaceAlt} 0%, ${props => props.theme.colors.surface} 100%);
    border-radius: ${props => props.theme.radii.lg};
    border-left: 4px solid ${props => props.theme.colors.primary};
    box-shadow: ${props => props.theme.shadows.sm};
    transition: all ${props => props.theme.transitions.normal};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.lg};
    }

    &:hover {
        box-shadow: ${props => props.theme.shadows.md};
        transform: translateY(-2px);
    }
`;

const ItemHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const ItemNameSection = styled.div`
    flex: 1;
`;

const ItemName = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.lg};
    }
`;

const ItemNote = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    font-style: italic;
    margin-top: ${props => props.theme.spacing.xs};
    line-height: 1.4;
`;

const MenuSection = styled.div`
    position: relative;
`;

const MenuButton = styled.button`
    padding: ${props => props.theme.spacing.sm};
    background-color: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    box-shadow: ${props => props.theme.shadows.sm};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        width: 36px;
        height: 36px;
    }

    &:hover {
        background-color: ${props => props.theme.colors.surfaceHover};
        border-color: ${props => props.theme.colors.primary};
        transform: translateY(-1px);
        box-shadow: ${props => props.theme.shadows.md};
    }

    &:active {
        transform: translateY(0);
    }
`;

const MenuIcon = styled.span`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    line-height: 1;
`;

const ContextMenu = styled.div`
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: ${props => props.theme.spacing.xs};
    background-color: ${props => props.theme.colors.surface};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    box-shadow: ${props => props.theme.shadows.lg};
    overflow: hidden;
    z-index: 100;
    min-width: 180px;
    animation: slideDown 0.15s ease-out;

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const MenuItem = styled.button<{ $variant?: 'danger' }>`
    width: 100%;
    padding: ${props => props.theme.spacing.md};
    background-color: transparent;
    border: none;
    text-align: left;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.$variant === 'danger' ? props.theme.colors.error : props.theme.colors.text};
    border-bottom: 1px solid ${props => props.theme.colors.border};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background-color: ${props =>
    props.$variant === 'danger'
        ? props.theme.colors.errorLight
        : props.theme.colors.surfaceHover};
    }

    &:active {
        background-color: ${props =>
    props.$variant === 'danger'
        ? props.theme.colors.error
        : props.theme.colors.primary};
        color: white;
    }
`;

const DiscountBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    color: white;
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    margin-top: ${props => props.theme.spacing.xs};
`;

const PriceBreakdown = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textSecondary};
    margin-bottom: ${props => props.theme.spacing.md};
    flex-wrap: wrap;
    line-height: 1.6;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        gap: ${props => props.theme.spacing.md};
        font-size: ${props => props.theme.fontSizes.sm};
    }
`;

const BreakdownItem = styled.span`
    font-feature-settings: 'tnum';
`;

const BreakdownLabel = styled.span`
    font-weight: ${props => props.theme.fontWeights.medium};
`;

const BreakdownValue = styled.span<{ $strikethrough?: boolean; $highlight?: boolean }>`
    font-weight: ${props => props.theme.fontWeights.semibold};
    text-decoration: ${props => props.$strikethrough ? 'line-through' : 'none'};
    color: ${props =>
    props.$strikethrough
        ? props.theme.colors.textMuted
        : props.$highlight
            ? props.theme.colors.primary
            : 'inherit'};
`;

const ExpandableSection = styled.div`
    margin-top: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background-color: white;
    border-radius: ${props => props.theme.radii.md};
    border: 2px solid ${props => props.theme.colors.border};
    animation: slideDown 0.2s ease-out;

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const DiscountGrid = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.md};
    grid-template-columns: 1fr;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: 1fr 1fr;
    }
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const FieldLabel = styled.label`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const Select = styled.select`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background-color: white;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const Input = styled.input`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
`;

const TextArea = styled.textarea`
    padding: ${props => props.theme.spacing.md};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-family: inherit;
    resize: vertical;
    min-height: 80px;
    transition: all ${props => props.theme.transitions.fast};

    &:focus {
        outline: none;
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const ActionButtons = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
    margin-top: ${props => props.theme.spacing.md};
`;

const ActionButton = styled.button<{ $active?: boolean }>`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background-color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.surface};
    color: ${props => props.$active ? 'white' : props.theme.colors.text};
    border: 1px solid ${props => props.$active ? props.theme.colors.primary : props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    box-shadow: ${props => props.theme.shadows.sm};

    &:hover {
        transform: translateY(-1px);
        box-shadow: ${props => props.theme.shadows.md};
        ${props => props.$active
    ? `background-color: #0284c7;`
    : `background-color: ${props.theme.colors.surfaceHover};`}
    }

    &:active {
        transform: translateY(0);
    }
`;

interface ServiceItemProps {
    item: ServiceLineItem;
    isDiscountExpanded: boolean;
    isNoteExpanded: boolean;
    onToggleDiscount: () => void;
    onToggleNote: () => void;
    onRemove: () => void;
    onUpdate: (updates: Partial<ServiceLineItem>) => void;
}

export const ServiceItem = ({
                                item,
                                isDiscountExpanded,
                                isNoteExpanded,
                                onToggleDiscount,
                                onToggleNote,
                                onRemove,
                                onUpdate,
                            }: ServiceItemProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { calculateServicePrice } = useServicePricing();
    const pricing = calculateServicePrice(item);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const handleMenuToggle = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleMenuItemClick = (action: () => void) => {
        action();
        setIsMenuOpen(false);
    };

    return (
        <ItemRow>
            <ItemHeader>
                <ItemNameSection>
                    <ItemName>{item.serviceName}</ItemName>
                    {item.note && <ItemNote>{item.note}</ItemNote>}
                    {pricing.hasDiscount && <DiscountBadge>{pricing.discountLabel}</DiscountBadge>}
                </ItemNameSection>
                <MenuSection ref={menuRef}>
                    <MenuButton onClick={handleMenuToggle}>
                        <MenuIcon>⋮</MenuIcon>
                    </MenuButton>
                    {isMenuOpen && (
                        <ContextMenu>
                            <MenuItem onClick={() => handleMenuItemClick(onToggleDiscount)}>
                                {isDiscountExpanded
                                    ? t.appointments.invoiceSummary.hideDiscount
                                    : t.appointments.invoiceSummary.applyDiscount}
                            </MenuItem>
                            <MenuItem onClick={() => handleMenuItemClick(onToggleNote)}>
                                {isNoteExpanded
                                    ? t.appointments.invoiceSummary.hideNote
                                    : t.appointments.invoiceSummary.addNote}
                            </MenuItem>
                            <MenuItem $variant="danger" onClick={() => handleMenuItemClick(onRemove)}>
                                {t.appointments.invoiceSummary.remove}
                            </MenuItem>
                        </ContextMenu>
                    )}
                </MenuSection>
            </ItemHeader>

            <PriceBreakdown>
                {pricing.hasDiscount && (
                    <>
                        <BreakdownItem>
                            <BreakdownLabel>{t.appointments.invoiceSummary.beforeNet}: </BreakdownLabel>
                            <BreakdownValue $strikethrough>
                                {formatMoneyAmount(pricing.originalPriceNet)} PLN
                            </BreakdownValue>
                        </BreakdownItem>
                        <BreakdownItem>•</BreakdownItem>
                    </>
                )}
                <BreakdownItem>
                    <BreakdownLabel>{t.appointments.invoiceSummary.net}: </BreakdownLabel>
                    <BreakdownValue>
                        {formatMoneyAmount(pricing.finalPriceNet)} PLN
                    </BreakdownValue>
                </BreakdownItem>
                <BreakdownItem>•</BreakdownItem>
                <BreakdownItem>
                    <BreakdownLabel>{t.appointments.invoiceSummary.vat} ({item.vatRate}%): </BreakdownLabel>
                    <BreakdownValue>
                        {formatMoneyAmount(pricing.vatAmount)} PLN
                    </BreakdownValue>
                </BreakdownItem>
                <br />
                {pricing.hasDiscount && (
                    <>
                        <BreakdownItem>
                            <BreakdownLabel>{t.appointments.invoiceSummary.beforeGross}: </BreakdownLabel>
                            <BreakdownValue $strikethrough>
                                {formatMoneyAmount(pricing.originalPriceGross)} PLN
                            </BreakdownValue>
                        </BreakdownItem>
                        <BreakdownItem>•</BreakdownItem>
                    </>
                )}
                <BreakdownItem>
                    <BreakdownLabel>{t.appointments.invoiceSummary.gross}: </BreakdownLabel>
                    <BreakdownValue $highlight={pricing.hasDiscount}>
                        {formatMoneyAmount(pricing.finalPriceGross)} PLN
                    </BreakdownValue>
                </BreakdownItem>
            </PriceBreakdown>

            {isDiscountExpanded && (
                <ExpandableSection>
                    <DiscountGrid>
                        <FieldGroup>
                            <FieldLabel>{t.appointments.invoiceSummary.discountType}</FieldLabel>
                            <Select
                                value={item.adjustment.type}
                                onChange={(e) =>
                                    onUpdate({
                                        adjustment: {
                                            ...item.adjustment,
                                            type: e.target.value as AdjustmentType,
                                        },
                                    })
                                }
                            >
                                <option value="PERCENT">{t.appointments.invoiceSummary.discountTypes.percent}</option>
                                <option value="FIXED_NET">{t.appointments.invoiceSummary.discountTypes.fixedNet}</option>
                                <option value="FIXED_GROSS">{t.appointments.invoiceSummary.discountTypes.fixedGross}</option>
                                <option value="SET_NET">{t.appointments.invoiceSummary.discountTypes.setNet}</option>
                                <option value="SET_GROSS">{t.appointments.invoiceSummary.discountTypes.setGross}</option>
                            </Select>
                        </FieldGroup>

                        <FieldGroup>
                            <FieldLabel>{t.appointments.invoiceSummary.discountValue}</FieldLabel>
                            <Input
                                type="number"
                                step="0.01"
                                value={
                                    item.adjustment.type === 'PERCENT'
                                        ? item.adjustment.value
                                        : formatMoneyAmount(Math.abs(item.adjustment.value))
                                }
                                onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    const isMoneyType = ['FIXED_NET', 'FIXED_GROSS', 'SET_NET', 'SET_GROSS'].includes(item.adjustment.type);
                                    onUpdate({
                                        adjustment: {
                                            ...item.adjustment,
                                            value: isMoneyType ? Math.round(Math.abs(value) * 100) : value,
                                        },
                                    });
                                }}
                                placeholder="0.00"
                            />
                        </FieldGroup>
                    </DiscountGrid>
                    <ActionButtons>
                        <ActionButton onClick={onToggleDiscount} $active>
                            {t.appointments.invoiceSummary.confirm}
                        </ActionButton>
                    </ActionButtons>
                </ExpandableSection>
            )}

            {isNoteExpanded && (
                <ExpandableSection>
                    <FieldGroup>
                        <FieldLabel>{t.appointments.invoiceSummary.noteLabel}</FieldLabel>
                        <TextArea
                            value={item.note || ''}
                            onChange={(e) => onUpdate({ note: e.target.value })}
                            placeholder={t.appointments.invoiceSummary.notePlaceholder}
                        />
                    </FieldGroup>
                    <ActionButtons>
                        <ActionButton onClick={onToggleNote} $active>
                            {t.appointments.invoiceSummary.confirm}
                        </ActionButton>
                    </ActionButtons>
                </ExpandableSection>
            )}
        </ItemRow>
    );
};