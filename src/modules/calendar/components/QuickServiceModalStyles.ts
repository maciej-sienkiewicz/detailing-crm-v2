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
    SUBMODAL_Z_INDEX,
} from '@/common/styles';

// ─── Overlay & container ──────────────────────────────────────────────────────

/**
 * Wszystkie trzy okna z tego pliku otwiera się z innego okna - z formularza
 * rezerwacji albo z edytora wyceny. Stąd warstwa okna podrzędnego, nie zwykłego.
 */
export const Overlay = styled(ModalOverlay)<{ $contentLeft?: number }>`
    z-index: ${SUBMODAL_Z_INDEX};
    left: ${p => p.$contentLeft ?? 0}px;

    /* The sidebar is only docked from md up. Below that the offset (64/240px)
       has nothing to clear and would shove the dialog off the right edge. */
    @media (max-width: 767px) {
        left: 0;
    }
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

/** Invisible placeholder, kept so existing imports don't break */
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
