/**
 * ModalKit — single import point for building consistent modals.
 *
 * import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle,
 *          ModalSubtitle, ModalContent, ModalFooter,
 *          ModalSectionTitle, ModalDivider, CloseBtn } from '@/common/components/ModalKit';
 * import { SharedButton } from '@/common/styles';
 */

export { ModalShell, type ModalSize } from './ModalShell';
export { CloseBtn } from './CloseBtn';

export {
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalSectionTitle,
    ModalDivider,
    ModalSectionDivider,
} from '@/common/styles';
