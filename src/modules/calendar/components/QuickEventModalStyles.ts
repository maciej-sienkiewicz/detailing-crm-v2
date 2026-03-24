import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const scaleIn = keyframes`
    from { opacity: 0; transform: scale(0.97) translateY(4px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);   }
`;

/* ─── Overlay & container ─────────────────────────────────────── */

export const Overlay = styled.div<{ $isOpen: boolean }>`
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.md};
    background-color: ${props => props.$isOpen ? 'rgba(15, 23, 42, 0.35)' : 'rgba(15, 23, 42, 0)'};
    backdrop-filter: ${props => props.$isOpen ? 'blur(4px)' : 'none'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};
    transition: all ${props => props.theme.transitions.slow};
    animation: ${props => props.$isOpen ? fadeIn : 'none'} 0.25s ease-out;
`;

export const ModalContainer = styled.div<{ $isOpen: boolean }>`
    background: ${props => props.theme.colors.surface};
    border-radius: 20px;
    box-shadow:
        0 0 0 1px rgba(0,0,0,0.06),
        0 8px 16px -4px rgba(0,0,0,0.08),
        0 24px 48px -12px rgba(0,0,0,0.14);
    width: 100%;
    max-width: 680px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: ${props => props.$isOpen ? 'scale(1) translateY(0)' : 'scale(0.97) translateY(4px)'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    transition: all ${props => props.theme.transitions.slow};
    animation: ${props => props.$isOpen ? scaleIn : 'none'} 0.25s cubic-bezier(0.32, 0.72, 0, 1);
`;

/* ─── Header ──────────────────────────────────────────────────── */

export const Header = styled.div`
    position: relative;
    padding: 20px 20px 16px 24px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
`;

export const HeaderContent = styled.div`
    flex: 1;
    min-width: 0;
`;

export const CloseButton = styled.button`
    flex-shrink: 0;
    margin-top: 2px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.theme.colors.textMuted};
    background: transparent;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        color: ${props => props.theme.colors.textSecondary};
        background: ${props => props.theme.colors.surfaceAlt};
    }

    svg { width: 18px; height: 18px; }
`;

export const TitleInput = styled.input<{ $accentColor?: string; $hasError?: boolean }>`
    width: 100%;
    font-size: 22px;
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.text};
    background: transparent;
    border: none;
    border-bottom: 2px solid ${props =>
        props.$hasError ? props.theme.colors.error : 'transparent'};
    padding-bottom: 4px;
    outline: none;
    transition: border-color ${props => props.theme.transitions.fast};
    letter-spacing: -0.01em;

    &::placeholder { color: ${props => props.theme.colors.border}; }

    &:focus {
        border-bottom-color: ${props =>
            props.$hasError
                ? props.theme.colors.error
                : (props.$accentColor || props.theme.colors.border)};
    }
`;

/* ─── Scrollable body ─────────────────────────────────────────── */

export const ScrollableContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 4px 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
        background: ${props => props.theme.colors.border};
        border-radius: 2px;
    }
    &::-webkit-scrollbar-thumb:hover {
        background: ${props => props.theme.colors.textMuted};
    }
`;

/* ─── Row layout ──────────────────────────────────────────────── */

export const Row = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 6px 0;
`;

export const IconWrapper = styled.div<{ $color?: string }>`
    flex-shrink: 0;
    margin-top: 10px;
    color: ${props => props.$color || props.theme.colors.textMuted};
    transition: color ${props => props.theme.transitions.fast};
    svg { width: 16px; height: 16px; }
`;

export const RowContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
`;

export const InputGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.sm};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        grid-template-columns: 1fr 1fr;
    }
`;

export const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const Label = styled.label`
    display: block;
    font-size: 11px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

export const ErrorMessage = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.error};
    font-weight: ${props => props.theme.fontWeights.medium};
`;

export const Input = styled.input<{ $accentColor?: string; $hasError?: boolean }>`
    width: 100%;
    padding: 9px 12px;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.$hasError ? props.theme.colors.error : 'transparent'};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    outline: none;
    transition: all ${props => props.theme.transitions.fast};

    &::placeholder { color: ${props => props.theme.colors.textMuted}; }

    &:focus {
        background: ${props => props.theme.colors.surface};
        border-color: ${props =>
            props.$hasError ? props.theme.colors.error
                : (props.$accentColor || props.theme.colors.primary)};
        box-shadow: 0 0 0 3px ${props =>
            props.$hasError ? 'rgba(220,38,38,0.08)' : 'rgba(59,130,246,0.08)'};
    }

    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export const Checkbox = styled.input.attrs({ type: 'checkbox' })<{ $accentColor?: string }>`
    width: 15px;
    height: 15px;
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
    margin: 4px 0;
    background: ${props => props.theme.colors.border};
    opacity: 0.6;
`;

/* ─── Select / dropdown buttons ───────────────────────────────── */

export const SelectButton = styled.button<{ $accentColor?: string; $hasValue?: boolean; $hasError?: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 12px;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.$hasError ? props.theme.colors.error : 'transparent'};
    border-radius: ${props => props.theme.radii.md};
    text-align: left;
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover:not(:disabled) { background: ${props => props.theme.colors.surfaceHover}; }

    &:focus {
        border-color: ${props =>
            props.$hasError ? props.theme.colors.error
                : (props.$accentColor || props.theme.colors.primary)};
    }

    &:disabled { opacity: 0.4; cursor: not-allowed; &:hover { background: ${props => props.theme.colors.surfaceAlt}; } }

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

    &:hover { color: ${props => props.theme.colors.error}; background: ${props => props.theme.colors.errorLight}; }

    svg { width: 14px; height: 14px; }
`;

export const Textarea = styled.textarea<{ $accentColor?: string }>`
    width: 100%;
    padding: 9px 12px;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid transparent;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.text};
    outline: none;
    resize: none;
    transition: all ${props => props.theme.transitions.fast};

    &::placeholder { color: ${props => props.theme.colors.textMuted}; }

    &:focus {
        background: ${props => props.theme.colors.surface};
        border-color: ${props => props.$accentColor || props.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(59,130,246,0.08);
    }
`;

/* ─── Dropdowns ───────────────────────────────────────────────── */

export const DropdownContainer = styled.div`
    position: relative;
`;

export const Dropdown = styled.div`
    position: absolute;
    z-index: 2001;
    width: 100%;
    margin-top: 4px;
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: 0 8px 24px -4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
    max-height: 220px;
    overflow-y: auto;
`;

export const DropdownItem = styled.button<{ $accentColor?: string }>`
    width: 100%;
    padding: 9px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: transparent;
    border: none;
    border-bottom: 1px solid ${props => props.theme.colors.surfaceAlt};
    text-align: left;
    cursor: pointer;
    transition: background ${props => props.theme.transitions.fast};

    &:last-child { border-bottom: none; }
    &:hover { background: ${props => props.theme.colors.surfaceAlt}; }

    span:first-child {
        font-size: ${props => props.theme.fontSizes.sm};
        color: ${props => props.theme.colors.text};
    }

    span:last-child {
        font-size: ${props => props.theme.fontSizes.xs};
        font-weight: ${props => props.theme.fontWeights.semibold};
        color: ${props => props.$accentColor || props.theme.colors.primary};
        font-variant-numeric: tabular-nums;
    }
`;

export const DropdownAddButton = styled.button`
    width: 100%;
    padding: 9px 14px;
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    background: transparent;
    border: none;
    border-top: 1px solid ${props => props.theme.colors.border};
    text-align: left;
    cursor: pointer;
    transition: background ${props => props.theme.transitions.fast};

    &:hover { background: ${props => props.theme.colors.surfaceAlt}; }

    svg { width: 16px; height: 16px; color: ${props => props.theme.colors.primary}; }

    span {
        font-size: ${props => props.theme.fontSizes.sm};
        font-weight: ${props => props.theme.fontWeights.medium};
        color: ${props => props.theme.colors.primary};
    }
`;

/* ─── Selected customer chip ──────────────────────────────────── */

export const SelectedCustomerChip = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    background: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
    border: 1px solid ${props => props.theme.colors.border};
`;

export const ChipCheck = styled.div`
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: ${props => props.theme.colors.successLight};
    color: ${props => props.theme.colors.success};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
`;

export const ChipInfo = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

export const ChipName = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
`;

export const NewBadge = styled.span`
    font-size: 10px;
    padding: 1px 5px;
    background: ${props => props.theme.colors.successLight};
    color: ${props => props.theme.colors.success};
    border-radius: ${props => props.theme.radii.sm};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

export const ChipMeta = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    white-space: nowrap;
`;

export const ChipDot = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.border};
`;

export const ChipClear = styled.button`
    flex-shrink: 0;
    padding: 2px;
    color: ${props => props.theme.colors.textMuted};
    background: none;
    border: none;
    border-radius: ${props => props.theme.radii.sm};
    cursor: pointer;
    line-height: 1;
    font-size: 16px;
    transition: all ${props => props.theme.transitions.fast};
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover { color: ${props => props.theme.colors.error}; background: ${props => props.theme.colors.errorLight}; }
    svg { width: 14px; height: 14px; }
`;

/* ─── Services list ───────────────────────────────────────────── */

export const ServicesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const ServiceItem = styled.div`
    background: ${props => props.theme.colors.surface};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
    transition: border-color ${props => props.theme.transitions.fast}, box-shadow ${props => props.theme.transitions.fast};

    &:hover {
        border-color: #cbd5e1;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
`;

export const ServiceItemRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px 10px 14px;
`;

export const ServiceName = styled.span`
    flex: 1;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

/* ─── Inline price editing ────────────────────────────────────── */

export const ServicePricesGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
`;

export const PriceCell = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
`;

export const PriceCellLabel = styled.span`
    font-size: 10px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1;
`;

export const PriceCellInput = styled.input`
    width: 76px;
    padding: 4px 6px;
    font-size: 13px;
    font-weight: ${props => props.theme.fontWeights.medium};
    text-align: right;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid transparent;
    border-radius: 6px;
    color: ${props => props.theme.colors.text};
    outline: none;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        border-color: ${props => props.theme.colors.border};
    }

    &:focus {
        background: ${props => props.theme.colors.surface};
        border-color: ${props => props.theme.colors.primary};
        box-shadow: 0 0 0 2px rgba(59,130,246,0.12);
    }
`;

export const PriceSep = styled.span`
    font-size: 12px;
    color: ${props => props.theme.colors.border};
    padding: 0 2px;
    flex-shrink: 0;
    margin-top: 14px;
`;

export const PriceCurrency = styled.span`
    font-size: 12px;
    color: ${props => props.theme.colors.textMuted};
    flex-shrink: 0;
    margin-top: 14px;
    padding-left: 2px;
`;

export const ServiceActions = styled.div`
    display: flex;
    align-items: center;
    gap: 1px;
    flex-shrink: 0;
`;

export const IconButton = styled.button<{ $active?: boolean }>`
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: ${props => props.theme.radii.md};
    border: none;
    background: ${props => props.$active ? props.theme.colors.surfaceAlt : 'transparent'};
    color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textMuted};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover {
        background: ${props => props.theme.colors.surfaceHover};
        color: ${props => props.theme.colors.primary};
    }

    svg { width: 14px; height: 14px; }
`;

export const DeleteButton = styled.button`
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: ${props => props.theme.radii.md};
    border: none;
    background: transparent;
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover { background: ${props => props.theme.colors.errorLight}; color: ${props => props.theme.colors.error}; }

    svg { width: 14px; height: 14px; }
`;

export const ServiceNoteContainer = styled.div`
    padding: 0 12px 10px;
`;

export const ServiceNoteTextarea = styled.textarea`
    width: 100%;
    padding: 7px 10px;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid transparent;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.text};
    outline: none;
    resize: none;
    transition: all ${props => props.theme.transitions.fast};

    &::placeholder { color: ${props => props.theme.colors.textMuted}; }

    &:focus {
        background: ${props => props.theme.colors.surface};
        border-color: ${props => props.theme.colors.primary};
    }
`;

/* ─── Summary ─────────────────────────────────────────────────── */

export const SummarySection = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 20px;
    padding: 10px 14px;
    background: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.md};
    flex-wrap: wrap;
`;

export const SummaryItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
`;

export const SummaryLabel = styled.span<{ $isTotal?: boolean }>`
    font-size: 10px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

export const SummaryValue = styled.span<{ $isTotal?: boolean }>`
    font-size: ${props => props.$isTotal ? '15px' : '13px'};
    color: ${props => props.$isTotal ? props.theme.colors.text : props.theme.colors.textSecondary};
    font-weight: ${props => props.$isTotal ? props.theme.fontWeights.semibold : props.theme.fontWeights.medium};
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
`;

export const SummaryDivider = styled.div`
    width: 1px;
    height: 28px;
    background: ${props => props.theme.colors.border};
    flex-shrink: 0;
`;

/* ─── Deprecated / kept for backwards compat ──────────────────── */
/* These are still referenced from JSX we haven't updated yet */

export const DragHandle = styled.div`display: none;`;

export const ServiceItemHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px 10px 14px;
`;

export const ServicePriceWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

export const ServicePricesRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 14px 10px;
`;

export const ServicePriceSeparator = styled.div`
    width: 1px;
    height: 18px;
    background: ${props => props.theme.colors.border};
    flex-shrink: 0;
`;

export const ServicePriceInput = styled.input`
    width: 80px;
    padding: 4px 6px;
    font-size: 13px;
    font-weight: ${props => props.theme.fontWeights.medium};
    text-align: right;
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid transparent;
    border-radius: 6px;
    color: ${props => props.theme.colors.text};
    outline: none;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
    transition: all ${props => props.theme.transitions.fast};
    &:hover { border-color: ${props => props.theme.colors.border}; }
    &:focus { background: ${props => props.theme.colors.surface}; border-color: ${props => props.theme.colors.primary}; box-shadow: 0 0 0 2px rgba(59,130,246,0.12); }
`;

export const ServicePriceLabel = styled.span`
    font-size: 12px;
    color: ${props => props.theme.colors.textMuted};
`;

export const ServicePriceBadge = styled.span`
    font-size: 10px;
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

/* ─── Summary row (kept for JSX compat) ───────────────────────── */

export const SummaryRow = styled.div<{ $isTotal?: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${props => props.$isTotal ? '8px 0 0' : '4px 0'};
    border-top: ${props => props.$isTotal ? `1px solid ${props.theme.colors.border}` : 'none'};
    margin-top: ${props => props.$isTotal ? '8px' : '0'};
`;

/* ─── Footer ──────────────────────────────────────────────────── */

export const Footer = styled.div`
    padding: 14px 24px;
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
    gap: 4px;
`;

export const ColorPickerSection = styled.div<{ $hasError?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 8px;
    border-radius: ${props => props.theme.radii.md};
    border: 2px solid ${props => props.$hasError ? props.theme.colors.error : 'transparent'};
    background: ${props => props.$hasError ? props.theme.colors.errorLight : 'transparent'};
    transition: all ${props => props.theme.transitions.fast};

    svg {
        color: ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.textMuted};
        width: 16px;
        height: 16px;
    }
`;

export const ColorErrorMessage = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.error};
    font-weight: ${props => props.theme.fontWeights.medium};
    padding-left: 8px;
`;

export const ColorPickerList = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
`;

export const SelectedColorName = styled.div`
    display: none;
`;

export const ColorButton = styled.button<{ $color: string; $isSelected: boolean }>`
    width: 24px;
    height: 24px;
    border-radius: ${props => props.theme.radii.full};
    border: 2px solid ${props => props.$isSelected ? props.$color : 'transparent'};
    background-color: ${props => props.$color};
    box-shadow: ${props => props.$isSelected
        ? `0 0 0 2px white, 0 0 0 4px ${props.$color}60`
        : props.theme.shadows.sm};
    cursor: pointer;
    transition: all ${props => props.theme.transitions.fast};

    &:hover { transform: scale(1.15); }
`;

export const AddColorButton = styled.button`
    width: 24px;
    height: 24px;
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
        transform: scale(1.15);
        border-color: ${props => props.theme.colors.primary};
        background-color: ${props => props.theme.colors.surfaceAlt};
        color: ${props => props.theme.colors.primary};
    }

    svg { width: 12px; height: 12px; }
`;

export const FooterActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'ghost' }>`
    padding: ${props => props.$variant === 'ghost' ? '8px 16px' : '8px 20px'};
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
                &:hover:not(:disabled) { color: ${props.theme.colors.text}; background: ${props.theme.colors.surfaceAlt}; }
                &:disabled { opacity: 0.5; cursor: not-allowed; }
            `;
        } else if (props.$variant === 'secondary') {
            return `
                color: ${props.theme.colors.textSecondary};
                background: ${props.theme.colors.surfaceAlt};
                &:hover:not(:disabled) { background: ${props.theme.colors.surfaceHover}; }
                &:disabled { opacity: 0.5; cursor: not-allowed; }
            `;
        } else {
            return `
                color: white;
                background-color: var(--button-bg, #2563eb);
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
                &:hover:not(:disabled) {
                    background-color: #1d4ed8;
                    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.36);
                    transform: translateY(-1px);
                }
                &:active { transform: translateY(0); }
                &:disabled { opacity: 0.5; cursor: not-allowed; }
            `;
        }
    }}
`;
