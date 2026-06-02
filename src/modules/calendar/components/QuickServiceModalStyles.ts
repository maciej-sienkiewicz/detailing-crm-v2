/**
 * QuickServiceModal / QuickCustomerModal / PriceInputModal styles
 *
 * Shared by:
 *   - QuickServiceModal  ("Wprowadź nową usługę")
 *   - QuickCustomerModal ("Nowy klient")
 *   - PriceInputModal    ("Wprowadź cenę")
 *
 * Modal/form primitives imported from @/common/styles.
 */
import styled from 'styled-components';
import {
    overlayFadeIn,
    modalScaleIn,
    ModalOverlay,
    ModalBox,
    ModalHeader as SharedModalHeader,
    ModalTitleGroup as SharedModalTitleGroup,
    ModalTitle as SharedModalTitle,
    ModalCloseButton,
    ModalContent as SharedModalContent,
    ModalFooter as SharedModalFooter,
    FormFieldGroup,
    FormLabel,
    FormInput,
    FormSelect,
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

export const Overlay = styled(ModalOverlay)<{ $contentLeft?: number }>`
    z-index: 50;
    left: ${p => p.$contentLeft ?? 0}px;
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

export const Header = styled(SharedModalHeader)``;

export const TitleGroup = styled(SharedModalTitleGroup)``;

/** Invisible placeholder — kept so existing imports don't break */
export const DragHandle = styled.div`display: none;`;
export const DragHandleBar = styled.div`display: none;`;

export const CloseButton = styled(ModalCloseButton)``;

export const Title = styled(SharedModalTitle)`
    flex: 1;
`;

// ─── Scrollable content ───────────────────────────────────────────────────────

export const Content = styled(SharedModalContent)``;

// ─── Form field group ─────────────────────────────────────────────────────────

export const FieldGroup = styled(FormFieldGroup)``;

export const Label = styled(FormLabel)``;

export const Input = styled(FormInput)``;

export const Select = styled(FormSelect)``;

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

export const Footer = styled(SharedModalFooter)``;

// ─── Button ───────────────────────────────────────────────────────────────────

export const Button = styled(SharedButton)<{ $variant?: 'primary' | 'secondary' }>``;
