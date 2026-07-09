import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clipboard, ClipboardCheck, BookmarkPlus, BookOpen } from 'lucide-react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Lead } from '../../types';
import { leadApi } from '../../api/leadApi';
import { useOfferContent } from './useOfferContent';
import { QuoteReplyExamplesPanel } from './QuoteReplyExamplesPanel';
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

// ─── Extra footer buttons ─────────────────────────────────────────────────────

const SaveExampleBtn = styled.button<{ $saved?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border: 1.5px solid ${p => p.$saved ? '#16a34a' : 'rgba(0,0,0,0.18)'};
  border-radius: 7px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.$saved ? '#16a34a' : '#555'};
  background: ${p => p.$saved ? 'rgba(22,163,74,0.07)' : 'transparent'};
  cursor: pointer;
  transition: all 0.15s;
  margin-right: auto;
  &:hover:not(:disabled) { background: rgba(0,0,0,0.05); }
  &:disabled { opacity: 0.4; cursor: default; }
  svg { width: 14px; height: 14px; }
`;

const ManageBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 11px;
  border: 1.5px solid rgba(0,0,0,0.14);
  border-radius: 7px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(0,0,0,0.05); }
  svg { width: 14px; height: 14px; }
`;

const EXAMPLES_KEY = ['quote-reply-examples'];
const MAX_EXAMPLES = 10;

import { FeatureGate, useFeature } from '@/modules/subscription';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  lead: Lead;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OfferComposerModal({ lead, onClose }: Props) {
  const aiFeature = useFeature('AI_LEADS');
  const { phase, displayedBody, title } = useOfferContent(lead);
  const queryClient = useQueryClient();

  const [toValue, setToValue] = useState(lead.contactIdentifier);
  const [subjectValue, setSubjectValue] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [showExamples, setShowExamples] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (title) setSubjectValue(title);
  }, [title]);

  useEffect(() => {
    if (phase === 'revealed') setEditedBody(displayedBody);
  }, [phase, displayedBody]);

  const bodyValue = phase === 'revealed' ? editedBody : displayedBody;

  const [closing, setClosing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: examples = [] } = useQuery({
    queryKey: EXAMPLES_KEY,
    queryFn: () => leadApi.listQuoteReplyExamples(),
  });

  const saveMutation = useMutation({
    mutationFn: () => leadApi.saveQuoteReplyExample(subjectValue, bodyValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAMPLES_KEY });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const handleCopy = async () => {
    const text = `Do: ${toValue}\nTemat: ${subjectValue}\n\n${bodyValue}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const isTyping = phase === 'typing';
  const canSave = !isTyping && !!bodyValue.trim() && examples.length < MAX_EXAMPLES;

  // AI offer composer belongs to the AI lead-assistant module. Without it the
  // window opens as a locked demonstration with an unlock/upsell overlay.
  if (!aiFeature.enabled) {
    return createPortal(
      <Overlay $closing={closing} onClick={handleClose}>
        <ComposeWindow $closing={closing} onClick={e => e.stopPropagation()}>
          <TitleBar>
            <TrafficLights>
              <TrafficLight $color="red" onClick={handleClose} title="Zamknij" />
              <TrafficLight $color="yellow" onClick={() => {}} title="" />
              <TrafficLight $color="green" onClick={() => {}} title="" />
            </TrafficLights>
            <TitleBarText>Nowa wiadomość — Asystent AI</TitleBarText>
          </TitleBar>
          <FeatureGate featureKey="AI_LEADS">
            <div style={{ minHeight: 380 }} />
          </FeatureGate>
        </ComposeWindow>
      </Overlay>,
      document.body,
    );
  }

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

        {showExamples ? (
          <QuoteReplyExamplesPanel onBack={() => setShowExamples(false)} />
        ) : (
          <>
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
                  value={bodyValue}
                  onChange={e => { if (!isTyping) setEditedBody(e.target.value); }}
                  readOnly={isTyping}
                  spellCheck={!isTyping}
                />
                <TypewriterCursor $visible={isTyping} />
              </BodyWrapper>
            </FormArea>

            <Footer>
              {isTyping && <LoadingDots>Przygotowywanie treści…</LoadingDots>}
              <SaveExampleBtn
                $saved={saved}
                disabled={!canSave || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                title={examples.length >= MAX_EXAMPLES ? `Osiągnięto limit ${MAX_EXAMPLES} przykładów` : 'Zapisz tę wersję jako wzorzec stylu dla AI'}
              >
                <BookmarkPlus />
                {saved ? 'Zapisano!' : saveMutation.isPending ? 'Zapisywanie…' : 'Zapisz jako przykład'}
              </SaveExampleBtn>

              <ManageBtn onClick={() => setShowExamples(true)} title="Zarządzaj przykładami">
                <BookOpen />
                {examples.length > 0 && <span>{examples.length}</span>}
              </ManageBtn>

              <CopyBtn onClick={handleCopy} disabled={isTyping}>
                {copied ? <ClipboardCheck /> : <Clipboard />}
                {copied ? 'Skopiowano!' : 'Kopiuj do schowka'}
              </CopyBtn>
            </Footer>
          </>
        )}
      </ComposeWindow>
    </Overlay>,
    document.body
  );
}
