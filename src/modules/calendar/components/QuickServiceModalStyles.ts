/**
 * QuickServiceModal / QuickCustomerModal styles — Stitch-inspired design
 *
 * Shared by:
 *   - QuickServiceModal  ("Wprowadź nową usługę")
 *   - QuickCustomerModal ("Nowy klient")
 *
 * Modal/form primitives imported from @/common/styles.
 */
import styled from 'styled-components';
import {
    overlayFadeIn,
    modalScaleIn,
    ModalOverlay,
    ModalBox,
    ModalCloseButton,
    FormFieldGroup,
    FormLabel,
    FormInput,
    FormErrorMessage,
    FormSubmitError,
    FormCheckboxCard,
    FormCheckboxLabel,
    FormCheckbox,
    FormCheckboxBody,
    FormCheckboxTitle,
    FormCheckboxDescription,
    SharedButton,
} from '@/common/styles';

// ─── Overlay & container ──────────────────────────────────────────────────────

export const Overlay = styled(ModalOverlay)`
    z-index: 50;
`;

export const ModalContainer = styled(ModalBox).attrs<{ $isOpen: boolean }>({})`
    max-width: 440px;
`;

// ─── Form shell ───────────────────────────────────────────────────────────────

export const Form = styled.form`
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
`;

// ─── Header ───────────────────────────────────────────────────────────────────

export const Header = styled.div`
    padding: 28px 28px 20px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
`;

/** Invisible placeholder — kept so existing imports don't break */
export const DragHandle = styled.div`display: none;`;
export const DragHandleBar = styled.div`display: none;`;

export const CloseButton = styled(ModalCloseButton)``;

export const Title = styled.h2`
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.4px;
    line-height: 1.2;
    flex: 1;
`;

// ─── Scrollable content ───────────────────────────────────────────────────────

export const Content = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 0 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-height: 0;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 2px;
    }
    &::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
`;

// ─── Form field group ─────────────────────────────────────────────────────────

export const FieldGroup = styled(FormFieldGroup)``;

export const Label = styled(FormLabel)``;

export const Input = styled(FormInput)``;

export const ErrorMessage = styled(FormErrorMessage)``;

// ─── Checkbox card ────────────────────────────────────────────────────────────

export const CheckboxContainer = styled(FormCheckboxCard)``;

export const CheckboxLabel = styled(FormCheckboxLabel)``;

export const Checkbox = styled(FormCheckbox)``;

export const CheckboxContent = styled(FormCheckboxBody)``;

export const CheckboxTitle = styled(FormCheckboxTitle)``;

export const CheckboxDescription = styled(FormCheckboxDescription)``;

// ─── Submit error ─────────────────────────────────────────────────────────────

export const SubmitError = styled(FormSubmitError)``;

// ─── Footer ───────────────────────────────────────────────────────────────────

export const Footer = styled.div`
    padding: 16px 28px;
    border-top: 1px solid #f1f5f9;
    background: #fafbfd;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-shrink: 0;
`;

// ─── Button ───────────────────────────────────────────────────────────────────

export const Button = styled(SharedButton)<{ $variant?: 'primary' | 'secondary' }>``;
