import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

const scaleIn = keyframes`
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
`;

export const Overlay = styled.div<{ $isOpen: boolean }>`
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.$isOpen ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0)'};
    backdrop-filter: ${props => props.$isOpen ? 'blur(4px)' : 'none'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};
    transition: all ${props => props.theme.transitions.slow};
    animation: ${props => props.$isOpen ? fadeIn : 'none'} 0.3s ease-out;
`;

export const ModalContainer = styled.div<{ $isOpen: boolean }>`
    background: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.xl};
    box-shadow: ${props => props.theme.shadows.xl};
    width: 100%;
    max-width: 768px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: ${props => props.$isOpen ? 'scale(1)' : 'scale(0.95)'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    transition: all ${props => props.theme.transitions.slow};
    animation: ${props => props.$isOpen ? scaleIn : 'none'} 0.3s cubic-bezier(0.32, 0.72, 0, 1);
`;

export const Header = styled.div`
    position: relative;
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl} ${props => props.theme.spacing.sm};
`;

export const DragHandle = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: ${props => props.theme.spacing.md};

    div {
        width: 48px;
        height: 6px;
        background: ${props => props.theme.colors.border};
        border-radius: ${props => props.theme.radii.full};
    }
`;

export const CloseButton = styled.button`
    position: absolute;
    top: ${props => props.theme.spacing.lg};
    right: ${props => props.theme.spacing.lg};
    padding: ${props => props.theme.spacing.sm};
    color: ${props => props.theme.colors.textMuted};
    background: transparent;
    border: none;
    border-radius: ${props => props.theme.radii.full};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        color: ${props => props.theme.colors.textSecondary};
        background: ${props => props.theme.colors.surfaceHover};
    }

    svg {
        width: 24px;
        height: 24px;
    }
`;

export const TitleInput = styled.input<{ $accentColor?: string; $hasError?: boolean }>`
    width: 100%;
    font-size: 30px;
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    background: transparent;
    border: none;
    border-bottom: 2px solid ${props => props.$hasError ? props.theme.colors.error : 'transparent'};
    padding-bottom: 12px;
    outline: none;
    transition: border-color ${props => props.theme.transitions.fast};

    &::placeholder {
        color: ${props => props.theme.colors.border};
    }

    &:focus {
        border-bottom-color: ${props => props.$hasError ? props.theme.colors.error : (props.$accentColor || props.theme.colors.border)};
    }
`;

export const ScrollableContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
    min-height: 0;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: ${props => props.theme.colors.border};
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: ${props => props.theme.colors.textMuted};
    }
`;

export const Row = styled.div`
    display: flex;
    align-items: flex-start;
    gap: ${props => props.theme.spacing.md};
`;

export const IconWrapper = styled.div<{ $color?: string }>`
    flex-shrink: 0;
    margin-top: 12px;
    color: ${props => props.$color || props.theme.colors.textSecondary};
    transition: color ${props => props.theme.transitions.fast};

    svg {
        width: 20px;
        height: 20px;
    }
`;

export const RowContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const InputGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 1fr 1fr;
    }
`;

export const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
`;

export const Label = styled.label`
    display: block;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textSecondary};
    margin-bottom: ${props => props.theme.spacing.sm};
`;

export const ErrorMessage = styled.div`
    margin-top: ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.error};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

export const Input = styled.input<{ $accentColor?: string; $hasError?: boolean }>`
    width: 100%;
    padding: 10px ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.$hasError ? props.theme.colors.error : 'transparent'};
    border-radius: ${props => props.theme.radii.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    outline: none;
    transition: all ${props => props.theme.transitions.fast};

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }

    &:focus {
        background: ${props => props.theme.colors.surface};
        border-color: ${props => props.$hasError ? props.theme.colors.error : (props.$accentColor || props.theme.colors.primary)};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const Checkbox = styled.input.attrs({ type: 'checkbox' })<{ $accentColor?: string }>`
    width: 16px;
    height: 16px;
    border-radius: ${props => props.theme.radii.sm};
    border: 1px solid ${props => props.theme.colors.border};
    cursor: pointer;
    accent-color: ${props => props.$accentColor || props.theme.colors.primary};

    &:focus {
        outline: 2px solid ${props => props.$accentColor || props.theme.colors.primary};
        outline-offset: 0;
    }
`;

export const CheckboxLabel = styled.label`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    cursor: pointer;
    width: fit-content;

    span {
        font-size: ${props => props.theme.fontSizes.sm};
        color: ${props => props.theme.colors.text};
    }
`;

export const Divider = styled.div`
    height: 1px;
    background: ${props => props.theme.colors.border};
`;

export const SelectButton = styled.button<{ $accentColor?: string; $hasValue?: boolean; $hasError?: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.$hasError ? props.theme.colors.error : 'transparent'};
    border-radius: ${props => props.theme.radii.lg};
    text-align: left;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover:not(:disabled) {
        background: ${props => props.theme.colors.surfaceHover};
    }

    &:focus {
        border-color: ${props => props.$hasError ? props.theme.colors.error : (props.$accentColor || props.theme.colors.primary)};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;

        &:hover {
            background: ${props => props.theme.colors.surfaceAlt};
        }
    }

    span {
        flex: 1;
        font-size: ${props => props.theme.fontSizes.sm};
        color: ${props => props.$hasValue ? props.theme.colors.text : props.theme.colors.textMuted};
        font-weight: ${props => props.$hasValue ? props.theme.fontWeights.medium : props.theme.fontWeights.normal};
    }
`;

export const RemoveButton = styled.div`
    padding: ${props => props.theme.spacing.xs};
    color: ${props => props.theme.colors.textMuted};
    border-radius: ${props => props.theme.radii.full};
    transition: all ${props => props.theme.transitions.fast};
    cursor: pointer;

    &:hover {
        color: ${props => props.theme.colors.error};
        background: ${props => props.theme.colors.errorLight};
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

export const Textarea = styled.textarea<{ $accentColor?: string }>`
    width: 100%;
    padding: 12px ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid transparent;
    border-radius: ${props => props.theme.radii.lg};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    outline: none;
    resize: none;
    transition: all ${props => props.theme.transitions.fast};

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }

    &:focus {
        background: ${props => props.theme.colors.surface};
        border-color: ${props => props.$accentColor || props.theme.colors.primary};
    }
`;

export const DropdownContainer = styled.div`
    position: relative;
`;

export const Dropdown = styled.div`
    position: absolute;
    z-index: 2001;
    width: 100%;
    margin-top: ${props => props.theme.spacing.sm};
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.xl};
    max-height: 240px;
    overflow-y: auto;
`;

export const DropdownItem = styled.button<{ $accentColor?: string }>`
    width: 100%;
    padding: 12px ${props => props.theme.spacing.md};
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: transparent;
    border: none;
    border-bottom: 1px solid ${props => props.theme.colors.surfaceAlt};
    text-align: left;
    cursor: pointer;
    transition: background ${props => props.theme.transitions.fast};

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: ${props => props.theme.colors.surfaceAlt};
    }

    span:first-child {
        font-size: ${props => props.theme.fontSizes.sm};
        color: ${props => props.theme.colors.text};
    }

    span:last-child {
        font-size: ${props => props.theme.fontSizes.sm};
        font-weight: ${props => props.theme.fontWeights.semibold};
        color: ${props => props.$accentColor || props.theme.colors.primary};
    }
`;

export const DropdownAddButton = styled.button`
    width: 100%;
    padding: 12px ${props => props.theme.spacing.md};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    background: rgba(239, 246, 255, 0.5);
    border: none;
    border-top: 1px solid ${props => props.theme.colors.border};
    text-align: left;
    cursor: pointer;
    transition: background ${props => props.theme.transitions.fast};

    &:hover {
        background: #eff6ff;
    }

    svg {
        width: 20px;
        height: 20px;
        color: ${props => props.theme.colors.primary};
    }

    span {
        font-size: ${props => props.theme.fontSizes.sm};
        font-weight: ${props => props.theme.fontWeights.medium};
        color: ${props => props.theme.colors.primary};
    }
`;

export const ServicesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

export const ServiceItem = styled.div`
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

export const ServiceItemHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
`;

export const ServiceName = styled.span`
    flex: 1;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
`;

export const ServicePriceWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

export const ServicePriceInput = styled.input`
    width: 96px;
    padding: 6px 12px;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    text-align: right;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    outline: none;
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
    transition: border-color ${props => props.theme.transitions.fast};

    &:focus {
        border-color: ${props => props.theme.colors.primary};
    }
`;

export const ServicePriceLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textSecondary};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

export const ServicePriceBadge = styled.span`
    padding: 2px 6px;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    font-weight: ${props => props.theme.fontWeights.medium};
    letter-spacing: 0.02em;
`;

export const IconButton = styled.button<{ $active?: boolean }>`
    padding: 6px;
    border-radius: ${props => props.theme.radii.md};
    border: none;
    background: ${props => props.$active ? '#eff6ff' : 'transparent'};
    color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textMuted};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props => props.$active ? '#dbeafe' : '#eff6ff'};
        color: ${props => props.theme.colors.primary};
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

export const DeleteButton = styled.button`
    padding: 6px;
    border-radius: ${props => props.theme.radii.md};
    border: none;
    background: transparent;
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props => props.theme.colors.errorLight};
        color: ${props => props.theme.colors.error};
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

export const ServiceNoteContainer = styled.div`
    padding: 0 12px 12px;
`;

export const ServiceNoteTextarea = styled.textarea`
    width: 100%;
    padding: 8px 12px;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    outline: none;
    resize: none;
    transition: all ${props => props.theme.transitions.fast};

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }

    &:focus {
        background: ${props => props.theme.colors.surface};
        border-color: ${props => props.theme.colors.primary};
    }
`;

export const SummarySection = styled.div`
    margin-top: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
`;

export const SummaryRow = styled.div<{ $isTotal?: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${props => props.$isTotal ? '12px 0 0' : '6px 0'};
    border-top: ${props => props.$isTotal ? `2px solid ${props.theme.colors.border}` : 'none'};
    margin-top: ${props => props.$isTotal ? props.theme.spacing.sm : '0'};
`;

export const SummaryLabel = styled.span<{ $isTotal?: boolean }>`
    font-size: ${props => props.$isTotal ? props.theme.fontSizes.base : props.theme.fontSizes.sm};
    color: ${props => props.$isTotal ? props.theme.colors.text : props.theme.colors.textSecondary};
    font-weight: ${props => props.$isTotal ? props.theme.fontWeights.semibold : props.theme.fontWeights.normal};
`;

export const SummaryValue = styled.span<{ $isTotal?: boolean }>`
    font-size: ${props => props.$isTotal ? props.theme.fontSizes.lg : props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    font-weight: ${props => props.$isTotal ? props.theme.fontWeights.bold : props.theme.fontWeights.medium};
    font-feature-settings: 'tnum';
    font-variant-numeric: tabular-nums;
`;

export const Footer = styled.div`
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    border-top: 1px solid ${props => props.theme.colors.border};
    background: ${props => props.theme.colors.surface};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${props => props.theme.spacing.md};
    flex-shrink: 0;
`;

export const ColorPickerWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

export const ColorPickerSection = styled.div<{ $hasError?: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: ${props => props.theme.spacing.sm} 12px;
    border-radius: ${props => props.theme.radii.lg};
    border: 2px solid ${props => props.$hasError ? props.theme.colors.error : 'transparent'};
    background: ${props => props.$hasError ? props.theme.colors.errorLight : 'transparent'};
    transition: all ${props => props.theme.transitions.fast};

    svg {
        color: ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.textMuted};
        width: 20px;
        height: 20px;
    }
`;

export const ColorErrorMessage = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.error};
    font-weight: ${props => props.theme.fontWeights.medium};
    padding-left: 12px;
`;

export const ColorPickerList = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
`;

export const SelectedColorName = styled.div`
    margin-top: ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

export const ColorButton = styled.button<{ $color: string; $isSelected: boolean }>`
    width: 28px;
    height: 28px;
    border-radius: ${props => props.theme.radii.full};
    border: 2px solid ${props => props.theme.colors.surface};
    background-color: ${props => props.$color};
    box-shadow: ${props => props.$isSelected
        ? `0 0 0 2px ${props.$color}40`
        : props.theme.shadows.sm};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        transform: scale(1.1);
    }
`;

export const AddColorButton = styled.button`
    width: 28px;
    height: 28px;
    border-radius: ${props => props.theme.radii.full};
    border: 2px dashed ${props => props.theme.colors.border};
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    color: ${props => props.theme.colors.textMuted};

    &:hover {
        transform: scale(1.1);
        border-color: ${props => props.theme.colors.primary};
        background-color: #eff6ff;
        color: ${props => props.theme.colors.primary};
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

export const FooterActions = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

export const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'ghost' }>`
    padding: ${props => props.$variant === 'ghost' ? '10px 20px' : `10px ${props.theme.spacing.lg}`};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    border-radius: ${props => props.theme.radii.full};
    border: none;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};
    white-space: nowrap;

    ${props => {
        if (props.$variant === 'ghost') {
            return `
                color: ${props.theme.colors.textSecondary};
                background: transparent;

                &:hover:not(:disabled) {
                    color: ${props.theme.colors.text};
                    background: ${props.theme.colors.surfaceHover};
                }

                &:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `;
        } else if (props.$variant === 'secondary') {
            return `
                color: ${props.theme.colors.textSecondary};
                background: transparent;

                &:hover:not(:disabled) {
                    background: ${props.theme.colors.surfaceHover};
                }

                &:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `;
        } else {
            // primary
            return `
                color: white;
                background-color: var(--button-bg, #2563eb);
                box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);

                &:hover:not(:disabled) {
                    background-color: #1d4ed8;
                    box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.4);
                    transform: translateY(-1px);
                }

                &:active {
                    transform: translateY(0);
                }

                &:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `;
        }
    }}
`;
