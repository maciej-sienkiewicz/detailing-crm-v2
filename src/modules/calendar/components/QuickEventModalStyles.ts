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
    padding: 16px;
    background-color: ${props => props.$isOpen ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0)'};
    backdrop-filter: ${props => props.$isOpen ? 'blur(4px)' : 'none'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    pointer-events: ${props => props.$isOpen ? 'auto' : 'none'};
    transition: all 0.3s ease;
    animation: ${props => props.$isOpen ? fadeIn : 'none'} 0.3s ease-out;
`;

export const ModalContainer = styled.div<{ $isOpen: boolean }>`
    background: white;
    border-radius: 24px;
    box-shadow:
        0 25px 50px -12px rgba(0, 0, 0, 0.25),
        0 10px 20px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 768px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: ${props => props.$isOpen ? 'scale(1)' : 'scale(0.95)'};
    opacity: ${props => props.$isOpen ? 1 : 0};
    transition: all 0.3s ease;
    animation: ${props => props.$isOpen ? scaleIn : 'none'} 0.3s cubic-bezier(0.32, 0.72, 0, 1);
`;

export const Header = styled.div`
    position: relative;
    padding: 24px 32px 8px;
`;

export const DragHandle = styled.div`
    display: flex;
    justify-content: center;
    margin-bottom: 16px;

    div {
        width: 48px;
        height: 6px;
        background: #e5e7eb;
        border-radius: 9999px;
    }
`;

export const CloseButton = styled.button`
    position: absolute;
    top: 24px;
    right: 24px;
    padding: 8px;
    color: #9ca3af;
    background: transparent;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        color: #4b5563;
        background: #f3f4f6;
    }

    svg {
        width: 24px;
        height: 24px;
    }
`;

export const TitleInput = styled.input<{ $accentColor?: string; $hasError?: boolean }>`
    width: 100%;
    font-size: 30px;
    font-weight: 600;
    color: #111827;
    background: transparent;
    border: none;
    border-bottom: 2px solid ${props => props.$hasError ? '#ef4444' : 'transparent'};
    padding-bottom: 12px;
    outline: none;
    transition: border-color 0.2s ease;

    &::placeholder {
        color: #d1d5db;
    }

    &:focus {
        border-bottom-color: ${props => props.$hasError ? '#ef4444' : (props.$accentColor || '#d1d5db')};
    }
`;

export const ScrollableContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 24px 32px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-height: 0;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }
`;

export const Row = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 16px;
`;

export const IconWrapper = styled.div<{ $color?: string }>`
    flex-shrink: 0;
    margin-top: 12px;
    color: ${props => props.$color || '#64748b'};
    transition: color 0.2s ease;

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
    gap: 16px;

    @media (min-width: 768px) {
        grid-template-columns: 1fr 1fr;
    }
`;

export const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
`;

export const Label = styled.label`
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 6px;
`;

export const ErrorMessage = styled.div`
    margin-top: 6px;
    font-size: 12px;
    color: #ef4444;
    font-weight: 500;
`;

export const Input = styled.input<{ $accentColor?: string; $hasError?: boolean }>`
    width: 100%;
    padding: 10px 16px;
    background: #f9fafb;
    border: 1px solid ${props => props.$hasError ? '#ef4444' : 'transparent'};
    border-radius: 12px;
    font-size: 14px;
    color: #111827;
    outline: none;
    transition: all 0.2s ease;

    &:focus {
        background: white;
        border-color: ${props => props.$hasError ? '#ef4444' : (props.$accentColor || '#3b82f6')};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const Checkbox = styled.input.attrs({ type: 'checkbox' })<{ $accentColor?: string }>`
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1px solid #d1d5db;
    cursor: pointer;
    accent-color: ${props => props.$accentColor || '#3b82f6'};

    &:focus {
        outline: 2px solid ${props => props.$accentColor || '#3b82f6'};
        outline-offset: 0;
    }
`;

export const CheckboxLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    width: fit-content;

    span {
        font-size: 14px;
        color: #374151;
    }
`;

export const Divider = styled.div`
    height: 1px;
    background: #f3f4f6;
`;

export const SelectButton = styled.button<{ $accentColor?: string; $hasValue?: boolean; $hasError?: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #f9fafb;
    border: 1px solid ${props => props.$hasError ? '#ef4444' : 'transparent'};
    border-radius: 12px;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background: #f3f4f6;
    }

    &:focus {
        border-color: ${props => props.$hasError ? '#ef4444' : (props.$accentColor || '#3b82f6')};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;

        &:hover {
            background: #f9fafb;
        }
    }

    span {
        flex: 1;
        font-size: 14px;
        color: ${props => props.$hasValue ? '#111827' : '#9ca3af'};
        font-weight: ${props => props.$hasValue ? 500 : 400};
    }
`;

export const RemoveButton = styled.div`
    padding: 4px;
    color: #9ca3af;
    border-radius: 9999px;
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
        color: #ef4444;
        background: #fee2e2;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

export const Textarea = styled.textarea<{ $accentColor?: string }>`
    width: 100%;
    padding: 12px 16px;
    background: #f9fafb;
    border: 1px solid transparent;
    border-radius: 12px;
    font-size: 14px;
    color: #111827;
    outline: none;
    resize: none;
    transition: all 0.2s ease;

    &::placeholder {
        color: #9ca3af;
    }

    &:focus {
        background: white;
        border-color: ${props => props.$accentColor || '#3b82f6'};
    }
`;

export const DropdownContainer = styled.div`
    position: relative;
`;

export const Dropdown = styled.div`
    position: absolute;
    z-index: 10;
    width: 100%;
    margin-top: 8px;
    background: white;
    border: 1px solid #f3f4f6;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    max-height: 240px;
    overflow-y: auto;
`;

export const DropdownItem = styled.button<{ $accentColor?: string }>`
    width: 100%;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: transparent;
    border: none;
    border-bottom: 1px solid #f9fafb;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s ease;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: #f9fafb;
    }

    span:first-child {
        font-size: 14px;
        color: #111827;
    }

    span:last-child {
        font-size: 14px;
        font-weight: 600;
        color: ${props => props.$accentColor || '#3b82f6'};
    }
`;

export const DropdownAddButton = styled.button`
    width: 100%;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(239, 246, 255, 0.5);
    border: none;
    border-top: 1px solid #f3f4f6;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
        background: #eff6ff;
    }

    svg {
        width: 20px;
        height: 20px;
        color: #3b82f6;
    }

    span {
        font-size: 14px;
        font-weight: 500;
        color: #3b82f6;
    }
`;

export const ServicesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const ServiceItem = styled.div`
    background: white;
    border: 1px solid #f3f4f6;
    border-radius: 12px;
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
    font-size: 14px;
    font-weight: 500;
    color: #111827;
`;

export const ServicePriceInput = styled.input`
    width: 96px;
    padding: 6px 12px;
    font-size: 14px;
    text-align: right;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    outline: none;

    &:focus {
        border-color: #3b82f6;
    }
`;

export const ServicePriceLabel = styled.span`
    font-size: 12px;
    color: #6b7280;
`;

export const IconButton = styled.button<{ $active?: boolean }>`
    padding: 6px;
    border-radius: 8px;
    border: none;
    background: ${props => props.$active ? '#eff6ff' : 'transparent'};
    color: ${props => props.$active ? '#3b82f6' : '#9ca3af'};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.$active ? '#dbeafe' : '#eff6ff'};
        color: ${props => props.$active ? '#3b82f6' : '#3b82f6'};
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

export const DeleteButton = styled.button`
    padding: 6px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #9ca3af;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: #fee2e2;
        color: #ef4444;
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
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    color: #111827;
    outline: none;
    resize: none;
    transition: all 0.2s ease;

    &::placeholder {
        color: #9ca3af;
    }

    &:focus {
        background: white;
        border-color: #3b82f6;
    }
`;

export const Footer = styled.div`
    padding: 24px 32px;
    border-top: 1px solid #f3f4f6;
    background: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-shrink: 0;
`;

export const ColorPickerSection = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;

    svg {
        color: #9ca3af;
        width: 20px;
        height: 20px;
    }
`;

export const ColorPickerList = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const ColorButton = styled.button<{ $color: string; $isSelected: boolean }>`
    width: 28px;
    height: 28px;
    border-radius: 9999px;
    border: 2px solid white;
    background-color: ${props => props.$color};
    box-shadow: ${props => props.$isSelected
        ? `0 0 0 2px ${props.$color}40`
        : '0 1px 3px rgba(0,0,0,0.1)'};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        transform: scale(1.1);
    }
`;

export const AddColorButton = styled.button`
    width: 28px;
    height: 28px;
    border-radius: 9999px;
    border: 2px dashed #d1d5db;
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #9ca3af;

    &:hover {
        transform: scale(1.1);
        border-color: #3b82f6;
        background-color: #eff6ff;
        color: #3b82f6;
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
    padding: ${props => props.$variant === 'ghost' ? '10px 20px' : '10px 24px'};
    font-size: 14px;
    font-weight: 500;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;

    ${props => {
        if (props.$variant === 'ghost') {
            return `
                color: #6b7280;
                background: transparent;

                &:hover {
                    color: #374151;
                    background: #f3f4f6;
                }
            `;
        } else if (props.$variant === 'secondary') {
            return `
                color: #374151;
                background: transparent;

                &:hover {
                    background: #f3f4f6;
                }
            `;
        } else {
            // primary
            return `
                color: white;
                background-color: var(--button-bg, #3b82f6);
                box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);

                &:hover {
                    box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.4);
                    transform: translateY(-1px);
                }

                &:active {
                    transform: translateY(0);
                }
            `;
        }
    }}
`;
