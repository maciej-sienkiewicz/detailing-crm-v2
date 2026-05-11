import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Clipboard, ClipboardCheck } from 'lucide-react';
import type { Lead } from '../../types';
import { useOfferContent } from './useOfferContent';
import {
  Overlay,
  ComposeWindow,
  TitleBar,
  TrafficLights,
  TrafficLight,
  TitleBarText,
  FormArea,
  FieldRow,
  FieldLabel,
  FieldInput,
  BodyWrapper,
  BodyTextarea,
  TypewriterCursor,
  Footer,
  CopyBtn,
  LoadingDots,
} from './styles';

function buildSubject(lead: Lead): string {
  const vehicle = [lead.vehicleBrand, lead.vehicleModel].filter(Boolean).join(' ') || 'Państwa pojazd';
  return `Oferta detailingu – ${vehicle}`;
}

interface Props {
  lead: Lead;
  onClose: () => void;
}

export function OfferComposerModal({ lead, onClose }: Props) {
  const { phase, displayedBody } = useOfferContent(lead);

  const [toValue, setToValue] = useState(lead.contactIdentifier);
  const [subjectValue, setSubjectValue] = useState(() => buildSubject(lead));
  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const handleCopy = async () => {
    const text = `Do: ${toValue}\nTemat: ${subjectValue}\n\n${displayedBody}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const isTyping = phase === 'typing';

  return createPortal(
    <Overlay $closing={closing} onClick={handleClose}>
      <ComposeWindow $closing={closing} onClick={e => e.stopPropagation()}>
        <TitleBar>
          <TrafficLights>
            <TrafficLight $color="red" onClick={handleClose} title="Zamknij" />
            <TrafficLight $color="yellow" onClick={() => {}} title="" />
            <TrafficLight $color="green" onClick={() => {}} title="" />
          </TrafficLights>
          <TitleBarText>Nowa wiadomość</TitleBarText>
        </TitleBar>

        <FormArea>
          <FieldRow>
            <FieldLabel>Do</FieldLabel>
            <FieldInput
              type="email"
              value={toValue}
              onChange={e => setToValue(e.target.value)}
              placeholder="adresat@example.com"
            />
          </FieldRow>

          <FieldRow>
            <FieldLabel>Temat</FieldLabel>
            <FieldInput
              type="text"
              value={subjectValue}
              onChange={e => setSubjectValue(e.target.value)}
              placeholder="Temat wiadomości"
            />
          </FieldRow>

          <BodyWrapper>
            <BodyTextarea
              $blurred={isTyping}
              $revealed={!isTyping}
              value={displayedBody}
              onChange={() => {}}
              readOnly={isTyping}
              spellCheck={!isTyping}
            />
            <TypewriterCursor $visible={isTyping} />
          </BodyWrapper>
        </FormArea>

        <Footer>
          {isTyping && <LoadingDots>Przygotowywanie treści…</LoadingDots>}
          <CopyBtn onClick={handleCopy} disabled={isTyping}>
            {copied ? <ClipboardCheck /> : <Clipboard />}
            {copied ? 'Skopiowano!' : 'Kopiuj do schowka'}
          </CopyBtn>
        </Footer>
      </ComposeWindow>
    </Overlay>,
    document.body
  );
}
