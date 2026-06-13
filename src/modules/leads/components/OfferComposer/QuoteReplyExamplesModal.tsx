import {
  ModalShell,
  ModalHeader,
  ModalTitleGroup,
  ModalTitle,
  ModalSubtitle,
  ModalContent,
  CloseBtn,
} from '@/common/components/ModalKit';
import { QuoteReplyExamplesPanel } from './QuoteReplyExamplesPanel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function QuoteReplyExamplesModal({ isOpen, onClose }: Props) {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitleGroup>
          <ModalTitle>Przykłady stylu odpowiedzi</ModalTitle>
          <ModalSubtitle>Wzorce używane przez AI przy generowaniu ofert e-mail</ModalSubtitle>
        </ModalTitleGroup>
        <CloseBtn onClick={onClose} />
      </ModalHeader>
      <ModalContent style={{ padding: 0, minHeight: 400 }}>
        <QuoteReplyExamplesPanel onBack={onClose} hideHeader />
      </ModalContent>
    </ModalShell>
  );
}
