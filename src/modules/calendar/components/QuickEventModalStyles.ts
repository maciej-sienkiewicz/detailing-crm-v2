/**
 * QuickEventModal styles — Stitch-inspired design
 *
 * Shared primitives (overlay, inputs, buttons) are imported from
 * @/common/styles so the same tokens can be reused elsewhere.
 */
import styled, { keyframes } from 'styled-components';
import {
    overlayFadeIn,
    modalScaleIn,
    ModalOverlay,
    ModalBox,
    ModalCloseButton,
    FormInput,
    FormTextarea,
    FormSelectButton,
    FormErrorMessage,
    SharedButton,
} from '@/common/styles';

// ─── Re-exports used by QuickEventModal/index.tsx ─────────────────────────────

export { overlayFadeIn, modalScaleIn };

// ─── Overlay & container ──────────────────────────────────────────────────────

export const Overlay = styled(ModalOverlay)`
    z-index: 50;
`;

export const ModalContainer = styled(ModalBox).attrs<{ $isOpen: boolean }>({})`
    max-width: 700px;
    max-height: 88vh;
`;

// ─── Header ───────────────────────────────────────────────────────────────────

export const Header = styled.div`
    position: relative;
    padding: 24px 24px 16px 28px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex-shrink: 0;
`;

export const HeaderContent = styled.div`
    flex: 1;
    min-width: 0;
`;

export const CloseButton = styled(ModalCloseButton)``;

export const TitleInput = styled.input<{ $accentColor?: string; $hasError?: boolean }>`
    width: 100%;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    background: transparent;
    border: none;
    border-bottom: 2px solid ${p =>
        p.$hasError ? '#ef4444' : 'transparent'};
    padding: 0 0 6px;
    outline: none;
    transition: border-color 180ms ease;
    letter-spacing: -0.4px;
    font-family: inherit;

    &::placeholder { color: #cbd5e1; }

    &:focus {
        border-bottom-color: ${p =>
            p.$hasError ? '#ef4444' : (p.$accentColor ?? '#0ea5e9')};
    }
`;

// ─── Scrollable body ──────────────────────────────────────────────────────────

export const ScrollableContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 4px 28px 20px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 2px;
    }
    &::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
`;

// ─── Row layout ───────────────────────────────────────────────────────────────

export const Row = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 6px 0;
`;

export const IconWrapper = styled.div<{ $color?: string }>`
    flex-shrink: 0;
    margin-top: 12px;
    color: ${p => p.$color ?? '#94a3b8'};
    transition: color 150ms ease;
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
    gap: 10px;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        grid-template-columns: 1fr 1fr;
    }
`;

export const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

export const Label = styled.label`
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

export const ErrorMessage = styled(FormErrorMessage)``;

export const Input = styled(FormInput)<{ $dropdownOpen?: boolean }>`
    ${p => p.$dropdownOpen && `
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        border-color: #0ea5e9;
        border-bottom-color: transparent;
        box-shadow: 0 0 0 3px rgba(14,165,233,0.14);
        clip-path: inset(-4px -4px 0 -4px);
    `}
`;

export const Checkbox = styled.input.attrs({ type: 'checkbox' })<{ $accentColor?: string }>`
    width: 15px;
    height: 15px;
    border-radius: 4px;
    cursor: pointer;
    accent-color: ${p => p.$accentColor ?? '#0ea5e9'};
`;

export const CheckboxLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    width: fit-content;

    span {
        font-size: 14px;
        color: #0f172a;
    }
`;

export const Divider = styled.div`
    height: 1px;
    margin: 4px 0;
    background: #f1f5f9;
`;

// ─── Select / trigger button ──────────────────────────────────────────────────

export const SelectButton = styled(FormSelectButton)``;

export const RemoveButton = styled.div`
    padding: 4px;
    color: #94a3b8;
    border-radius: 999px;
    transition: all 150ms ease;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover { color: #ef4444; background: #fef2f2; }
    svg { width: 14px; height: 14px; }
`;

export const Textarea = styled(FormTextarea)``;

// ─── Dropdowns ────────────────────────────────────────────────────────────────

export const DropdownContainer = styled.div`
    position: relative;
`;

export const Dropdown = styled.div`
    position: absolute;
    z-index: 2001;
    width: 100%;
    margin-top: -1px;
    background: #ffffff;
    border: 1.5px solid #0ea5e9;
    border-top: none;
    border-radius: 0 0 12px 12px;
    box-shadow:
        0 8px 20px -4px rgba(0,0,0,0.10),
        0 0 0 3px rgba(14,165,233,0.10);
    max-height: 220px;
    overflow-y: auto;
    overflow-x: hidden;
`;

export const ServicePortalDropdown = styled.div`
    position: fixed;
    z-index: 9999;
    background: #ffffff;
    border: 1.5px solid #0ea5e9;
    border-top: none;
    border-radius: 0 0 12px 12px;
    box-shadow:
        0 8px 20px -4px rgba(0,0,0,0.10),
        0 0 0 3px rgba(14,165,233,0.10);
    max-height: 220px;
    overflow-y: auto;
    overflow-x: hidden;
`;

export const DropdownItem = styled.button<{ $accentColor?: string }>`
    width: 100%;
    padding: 10px 16px;
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
    background: transparent;
    border: none;
    border-bottom: 1px solid #f8fafc;
    text-align: left;
    cursor: pointer;
    transition: background 150ms ease;

    &:last-child { border-bottom: none; }
    &:hover { background: #f8fafc; }
    &:first-child { border-radius: 16px 16px 0 0; }
    &:last-child  { border-radius: 0 0 16px 16px; }

    span:first-child {
        font-size: 14px;
        color: #0f172a;
        font-weight: 500;
    }
`;

export const DropdownItemMeta = styled.span<{ $warning?: boolean }>`
    font-size: 12px;
    font-weight: ${p => p.$warning ? 600 : 400};
    color: ${p => p.$warning ? '#f59e0b' : '#94a3b8'};
    display: flex;
    align-items: center;
    gap: 4px;
`;

export const DropdownSeparator = styled.div`
    padding: 6px 16px 4px;
    font-size: 11px;
    font-weight: 600;
    color: #b0bec5;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: #f8fafc;
    border-top: 1px solid #f1f5f9;
`;

export const DropdownAddButton = styled.button`
    width: 100%;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    border-top: 1px solid #f1f5f9;
    text-align: left;
    cursor: pointer;
    transition: background 150ms ease;
    border-radius: 0 0 16px 16px;

    &:hover { background: #f0f9ff; }

    svg { width: 15px; height: 15px; color: #0ea5e9; }

    span {
        font-size: 14px;
        font-weight: 600;
        color: #0ea5e9;
    }
`;

// ─── Service dropdown items ───────────────────────────────────────────────────

export const ServiceDropdownItem = styled.button`
    width: 100%;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: transparent;
    border: none;
    border-bottom: 1px solid #f1f5f9;
    text-align: left;
    cursor: pointer;
    transition: background 150ms ease, border-left 150ms ease, padding-left 150ms ease;

    &:last-child { border-bottom: none; }

    &:hover {
        background: #f8fafc;
        border-left: 3px solid #0ea5e9;
        padding-left: 13px;
    }
`;

export const ServiceDropdownName = styled.span`
    font-size: 14px;
    font-weight: 500;
    color: #0f172a;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const ServiceDropdownPrices = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
    flex-shrink: 0;
`;

export const ServiceDropdownGross = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    font-feature-settings: 'tnum';
    white-space: nowrap;
`;

export const ServiceDropdownNet = styled.span`
    font-size: 11px;
    font-weight: 400;
    color: #94a3b8;
    font-feature-settings: 'tnum';
    white-space: nowrap;
`;

export const ServiceDropdownManualBadge = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: #d97706;
    background: #fef3c7;
    padding: 2px 8px;
    border-radius: 6px;
    letter-spacing: 0.03em;
    white-space: nowrap;
`;

// ─── Selected customer chip ───────────────────────────────────────────────────

export const SelectedCustomerChip = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    background: #ffffff;
    border-radius: 12px;
    border: 1.5px solid #e2e8f0;
`;

export const ChipCheck = styled.div`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #16a34a;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
`;

export const ChipInfo = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
`;

export const ChipName = styled.span`
    font-size: 14px;
    font-weight: 500;
    color: #0f172a;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
`;

export const NewBadge = styled.span`
    font-size: 10px;
    padding: 2px 6px;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 999px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

export const ChipMeta = styled.span`
    font-size: 12px;
    color: #94a3b8;
    white-space: nowrap;
`;

export const ChipDot = styled.span`
    font-size: 12px;
    color: #d1d5db;
`;

export const ChipEdit = styled.button`
    flex-shrink: 0;
    padding: 4px;
    color: #94a3b8;
    background: none;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 150ms ease;

    &:hover { color: #0ea5e9; background: #e0f2fe; }
    svg { width: 14px; height: 14px; }
`;

export const ChipClear = styled.button`
    flex-shrink: 0;
    margin-left: auto;
    padding: 4px;
    color: #94a3b8;
    background: none;
    border: none;
    border-radius: 999px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 150ms ease;

    &:hover { color: #ef4444; background: #fef2f2; }
    svg { width: 14px; height: 14px; }
`;

// ─── Services unified block ───────────────────────────────────────────────────
// ServicesList + SummarySection live inside ServicesBlock so they share
// a single outer border and form one cohesive component.

/** Outer container — single border wraps header + rows + summary */
export const ServicesBlock = styled.div`
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    transition: border-color 180ms ease;

    &:focus-within { border-color: #bae6fd; }
`;

/** Sticky column-header row */
export const ServicesTableHeader = styled.div`
    display: grid;
    grid-template-columns: 1fr 74px 74px 60px;
    align-items: center;
    gap: 4px;
    padding: 7px 8px 7px 14px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
`;

export const ServicesHeaderCell = styled.span`
    font-size: 10px;
    font-weight: 700;
    color: #b0bec5;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-align: right;

    &:first-child { text-align: left; }
    &:last-child  { /* actions col — empty */ }
`;

// ─── Services list ────────────────────────────────────────────────────────────

export const ServicesList = styled.div`
    display: flex;
    flex-direction: column;
`;

export const ServiceItem = styled.div`
    border-bottom: 1px solid #f1f5f9;
    transition: background 120ms ease;

    &:last-child { border-bottom: none; }
    &:hover { background: #fafbfd; }
`;

export const ServiceItemRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 74px 74px 60px;
    align-items: center;
    gap: 4px;
    padding: 8px 8px 8px 14px;
`;

export const ServiceName = styled.span`
    font-size: 14px;
    font-weight: 500;
    color: #0f172a;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 4px;
`;

// ─── Inline price editing ─────────────────────────────────────────────────────

/** Kept as display:contents so the two inputs land in their grid cells */
export const ServicePricesGroup = styled.div`display: contents;`;
export const PriceCell            = styled.div`display: contents;`;
export const PriceCellLabel       = styled.span`display: none;`;
export const PriceSep             = styled.span`display: none;`;
export const PriceCurrency        = styled.span`display: none;`;

export const PriceCellInput = styled.input<{ $isBrutto?: boolean }>`
    width: 100%;
    padding: 5px 8px;
    font-size: 13px;
    font-weight: ${p => p.$isBrutto ? 600 : 400};
    text-align: right;
    background: transparent;
    border: 1.5px solid transparent;
    border-radius: 8px;
    color: ${p => p.$isBrutto ? '#0f172a' : '#64748b'};
    outline: none;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
    transition: all 150ms ease;
    font-family: inherit;

    &:hover {
        border-color: #e2e8f0;
        background: #f8fafc;
    }

    &:focus {
        background: #ffffff;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 2px rgba(14,165,233,0.14);
    }
`;

export const ServiceActions = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    flex-shrink: 0;
`;

export const IconButton = styled.button<{ $active?: boolean }>`
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    border: none;
    background: ${p => p.$active ? '#e0f2fe' : 'transparent'};
    color: ${p => p.$active ? '#0284c7' : '#b0bec5'};
    cursor: pointer;
    transition: all 150ms ease;

    &:hover { background: #e0f2fe; color: #0284c7; }
    svg { width: 13px; height: 13px; }
`;

export const DeleteButton = styled.button`
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: #b0bec5;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover { background: #fef2f2; color: #ef4444; }
    svg { width: 13px; height: 13px; }
`;

export const ServiceNoteContainer = styled.div`
    padding: 0 10px 10px 14px;
`;

export const ServiceNoteTextarea = styled.textarea`
    width: 100%;
    padding: 7px 10px;
    background: #f8fafc;
    border: 1.5px solid #f1f5f9;
    border-radius: 8px;
    font-size: 12.5px;
    color: #475569;
    outline: none;
    resize: none;
    transition: all 150ms ease;
    font-family: inherit;
    line-height: 1.45;

    &::placeholder { color: #b0bec5; }

    &:hover { border-color: #e2e8f0; }

    &:focus {
        background: #ffffff;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 2px rgba(14,165,233,0.10);
    }
`;

// ─── Summary (inside ServicesBlock) ──────────────────────────────────────────

export const SummarySection = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 10px 14px;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
`;

export const SummaryItem = styled.div`
    display: flex;
    align-items: baseline;
    gap: 5px;
    padding: 0 14px;
    border-right: 1px solid #e2e8f0;

    &:last-child { border-right: none; padding-right: 0; }
    &:first-child { padding-left: 0; }
`;

export const SummaryLabel = styled.span<{ $isTotal?: boolean }>`
    font-size: 11px;
    font-weight: 500;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
`;

export const SummaryValue = styled.span<{ $isTotal?: boolean }>`
    font-size: ${p => p.$isTotal ? '15px' : '13px'};
    color: ${p => p.$isTotal ? '#0f172a' : '#475569'};
    font-weight: ${p => p.$isTotal ? 700 : 500};
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
    white-space: nowrap;
`;

/** No longer used (vertical dividers are now CSS border-right on SummaryItem) */
export const SummaryDivider = styled.div`display: none;`;

// ─── Footer ───────────────────────────────────────────────────────────────────

export const Footer = styled.div`
    padding: 16px 28px;
    border-top: 1px solid #f1f5f9;
    background: #fafbfd;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
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
    border-radius: 10px;
    border: 2px solid ${p => p.$hasError ? '#ef4444' : 'transparent'};
    background: ${p => p.$hasError ? '#fef2f2' : 'transparent'};
    transition: all 150ms ease;

    svg {
        color: ${p => p.$hasError ? '#ef4444' : '#94a3b8'};
        width: 16px;
        height: 16px;
    }
`;

export const ColorErrorMessage = styled.div`
    font-size: 12px;
    color: #ef4444;
    font-weight: 500;
    padding-left: 8px;
`;

export const ColorPickerList = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const SelectedColorName = styled.div`
    display: none;
`;

export const ColorButton = styled.button<{ $color: string; $isSelected: boolean }>`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid ${p => p.$isSelected ? p.$color : 'transparent'};
    background-color: ${p => p.$color};
    box-shadow: ${p => p.$isSelected
        ? `0 0 0 2px white, 0 0 0 4px ${p.$color}70`
        : '0 1px 2px rgba(0,0,0,0.08)'};
    cursor: pointer;
    transition: all 150ms ease;

    &:hover { transform: scale(1.18); }
`;

export const AddColorButton = styled.button`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px dashed #cbd5e1;
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 150ms ease;
    color: #94a3b8;

    &:hover {
        transform: scale(1.18);
        border-color: #0ea5e9;
        background-color: #f0f9ff;
        color: #0ea5e9;
    }

    svg { width: 12px; height: 12px; }
`;

export const FooterActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const Button = styled(SharedButton)<{ $variant?: 'primary' | 'secondary' | 'ghost' }>``;

// ─── Customer multi-field input block ────────────────────────────────────────

export const CustomerInputBlock = styled.div<{ $focused?: boolean; $hasError?: boolean; $dropdownOpen?: boolean }>`
    border: 1.5px solid ${p => p.$hasError ? '#ef4444' : p.$focused ? '#0ea5e9' : '#e2e8f0'};
    border-radius: ${p => p.$dropdownOpen ? '12px 12px 0 0' : '12px'};
    background: #ffffff;
    overflow: hidden;
    box-shadow: ${p => p.$focused ? '0 0 0 3px rgba(14,165,233,0.14)' : 'none'};
    ${p => p.$dropdownOpen && `
        border-bottom-color: transparent;
        clip-path: inset(-4px -4px 0 -4px);
    `}
    transition: border-color 150ms ease, box-shadow 150ms ease, border-radius 100ms ease;
`;

export const CustomerInputRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 1px solid #f1f5f9;

    &:last-child { border-bottom: none; }
`;

export const VehicleInputRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 88px;
`;

export const VehicleSelectButton = styled.button<{ $dropdownOpen?: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: #ffffff;
    border: 1.5px solid ${p => p.$dropdownOpen ? '#0ea5e9' : '#e2e8f0'};
    border-radius: ${p => p.$dropdownOpen ? '12px 12px 0 0' : '12px'};
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    color: #0f172a;
    transition: border-color 150ms ease, border-radius 100ms ease, box-shadow 150ms ease;

    ${p => p.$dropdownOpen && `
        border-bottom-color: transparent;
        box-shadow: 0 0 0 3px rgba(14,165,233,0.14);
        clip-path: inset(-4px -4px 0 -4px);
    `}

    &:hover:not(:disabled) { border-color: #94a3b8; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
    &:focus { outline: none; }
`;

export const CustomerFieldGroup = styled.div<{ $borderRight?: boolean }>`
    padding: 8px 14px;
    border-right: ${p => p.$borderRight ? '1px solid #f1f5f9' : 'none'};
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

export const CustomerFieldLabel = styled.label`
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    pointer-events: none;
`;

export const CustomerFieldInput = styled.input`
    width: 100%;
    font-size: 14px;
    color: #0f172a;
    background: transparent;
    border: none;
    outline: none;
    font-family: inherit;
    padding: 0;
    line-height: 1.4;

    &::placeholder { color: #c8d4e0; }
`;

export const CustomerHint = styled.div`
    font-size: 12px;
    color: #94a3b8;
    padding-bottom: 6px;
`;

export const CustomerEditActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const CustomerEditConfirmBtn = styled.button`
    flex: 1;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    background: #16a34a;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: background 150ms ease;

    &:hover { background: #15803d; }
    svg { width: 14px; height: 14px; }
`;

export const CustomerEditCancelBtn = styled.button`
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms ease;

    &:hover { background: #f1f5f9; border-color: #cbd5e1; }
`;

// ─── Backwards-compat stubs (still referenced by some JSX) ───────────────────

export const DragHandle = styled.div`display: none;`;

export const ServiceItemHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 10px 10px 16px;
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
    padding: 6px 16px 10px;
`;

export const ServicePriceSeparator = styled.div`
    width: 1px;
    height: 18px;
    background: #e2e8f0;
    flex-shrink: 0;
`;

export const ServicePriceInput = styled.input`
    width: 80px;
    padding: 5px 8px;
    font-size: 13px;
    font-weight: 500;
    text-align: right;
    background: #f8fafc;
    border: 1.5px solid transparent;
    border-radius: 8px;
    color: #0f172a;
    outline: none;
    font-variant-numeric: tabular-nums;
    font-family: inherit;
    transition: all 150ms ease;
    &:hover { border-color: #e2e8f0; }
    &:focus {
        background: #ffffff;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 2px rgba(14,165,233,0.14);
    }
`;

export const ServicePriceLabel = styled.span`
    font-size: 12px;
    color: #94a3b8;
`;

export const ServicePriceBadge = styled.span`
    font-size: 10px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

export const SummaryRow = styled.div<{ $isTotal?: boolean }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${p => p.$isTotal ? '8px 0 0' : '4px 0'};
    border-top: ${p => p.$isTotal ? '1px solid #e2e8f0' : 'none'};
    margin-top: ${p => p.$isTotal ? '8px' : '0'};
`;
