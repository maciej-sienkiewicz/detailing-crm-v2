import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import styled, { keyframes } from 'styled-components';
import { X, Sparkles, Copy, Check, Instagram } from 'lucide-react';

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -46%) scale(0.97); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

// ─── Overlay & Content ────────────────────────────────────────────────────────

const Overlay = styled(Dialog.Overlay)`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  z-index: 100;
  animation: ${fadeIn} 200ms ease;
`;

const Content = styled(Dialog.Content)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 680px;
  max-height: 90vh;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.18);
  z-index: 101;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideIn} 220ms cubic-bezier(0.32, 0.72, 0, 1);
`;

// ─── Header ───────────────────────────────────────────────────────────────────

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 28px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
`;

const HeaderIcon = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f43f5e, #ec4899, #a855f7);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 18px; height: 18px; color: white; stroke-width: 2; }
`;

const HeaderText = styled.div`
  flex: 1;
`;

const Title = styled(Dialog.Title)`
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 2px;
`;

const Subtitle = styled.p`
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
`;

const CloseBtn = styled(Dialog.Close)`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 150ms ease;
  &:hover { background: #e2e8f0; }
  svg { width: 16px; height: 16px; stroke-width: 2; }
`;

// ─── Body ─────────────────────────────────────────────────────────────────────

const Body = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  overflow: hidden;
  flex: 1;
  min-height: 0;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
`;

const FormPanel = styled.div`
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  border-right: 1px solid #f1f5f9;

  @media (max-width: 560px) {
    border-right: none;
    border-bottom: 1px solid #f1f5f9;
  }
`;

const PreviewPanel = styled.div`
  padding: 24px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  background: #f8fafc;
`;

const FieldLabel = styled.label`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: block;
  margin-bottom: 6px;
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 90px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  resize: vertical;
  transition: border-color 150ms ease;
  line-height: 1.5;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #a855f7;
    box-shadow: 0 0 0 3px rgba(168,85,247,0.1);
  }

  &::placeholder { color: #cbd5e1; }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  color: #0f172a;
  background: #fff;
  transition: border-color 150ms ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #a855f7;
    box-shadow: 0 0 0 3px rgba(168,85,247,0.1);
  }

  &::placeholder { color: #cbd5e1; }
`;

const HashtagsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const HashtagChip = styled.button<{ $active: boolean }>`
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1px solid ${p => p.$active ? '#a855f7' : '#e2e8f0'};
  background: ${p => p.$active ? 'rgba(168,85,247,0.08)' : '#fff'};
  color: ${p => p.$active ? '#a855f7' : '#64748b'};
  cursor: pointer;
  transition: all 150ms ease;
  font-family: inherit;
  &:hover { border-color: #a855f7; color: #a855f7; }
`;

// ─── Preview ──────────────────────────────────────────────────────────────────

const PreviewLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const PostPreviewBox = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  font-size: 13px;
  color: #1e293b;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 120px;
  flex: 1;
`;

const EmptyPreview = styled.div`
  color: #cbd5e1;
  font-style: italic;
  font-size: 13px;
`;

const CopyBtn = styled.button<{ $copied: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid ${p => p.$copied ? '#10b981' : '#e2e8f0'};
  background: ${p => p.$copied ? 'rgba(16,185,129,0.08)' : '#fff'};
  color: ${p => p.$copied ? '#10b981' : '#64748b'};
  cursor: pointer;
  transition: all 150ms ease;
  font-family: inherit;
  align-self: flex-end;
  svg { width: 13px; height: 13px; }
`;

// ─── Footer ───────────────────────────────────────────────────────────────────

const Footer = styled.footer`
  padding: 16px 28px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
`;

const CancelBtn = styled(Dialog.Close)`
  padding: 9px 18px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 150ms ease;
  &:hover { background: #f8fafc; }
`;

const GenerateBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  border-radius: 9999px;
  border: none;
  background: linear-gradient(135deg, #f43f5e, #a855f7);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 150ms ease;
  box-shadow: 0 2px 8px rgba(168,85,247,0.3);

  &:hover {
    box-shadow: 0 4px 14px rgba(168,85,247,0.4);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
    transform: none;
  }

  svg { width: 15px; height: 15px; stroke-width: 2; }
`;

// ─── Post generation ──────────────────────────────────────────────────────────

const DEFAULT_HASHTAGS = ['#detailing', '#ceramika', '#ppf', '#cardetailing', '#autodetailing', '#lakiersamochodu'];

const buildPost = (desc: string, car: string, hashtags: string[]): string => {
  const lines: string[] = [];
  if (car) lines.push(`🚗 ${car}`);
  if (desc) lines.push(`\n${desc}`);
  if (hashtags.length) lines.push(`\n${hashtags.join(' ')}`);
  return lines.join('\n').trim();
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export const InstagramPostModal = ({ open, onClose }: Props) => {
  const [description, setDescription] = useState('');
  const [car, setCar] = useState('');
  const [activeHashtags, setActiveHashtags] = useState<string[]>(['#detailing', '#cardetailing']);
  const [copied, setCopied] = useState(false);

  const postText = buildPost(description, car, activeHashtags);

  const toggleHashtag = (tag: string) => {
    setActiveHashtags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleCopy = async () => {
    if (!postText) return;
    await navigator.clipboard.writeText(postText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setDescription('');
    setCar('');
    setActiveHashtags(['#detailing', '#cardetailing']);
    setCopied(false);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && handleClose()}>
      <Dialog.Portal>
        <Overlay />
        <Content aria-describedby={undefined}>
          <Header>
            <HeaderIcon><Instagram /></HeaderIcon>
            <HeaderText>
              <Title>Generator postów Instagram</Title>
              <Subtitle>Opisz wykonaną pracę — wygeneruj gotowy post</Subtitle>
            </HeaderText>
            <CloseBtn><X /></CloseBtn>
          </Header>

          <Body>
            <FormPanel>
              <div>
                <FieldLabel>Pojazd</FieldLabel>
                <Input
                  placeholder="np. BMW M3 Competition, czarny"
                  value={car}
                  onChange={e => setCar(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>Opis pracy</FieldLabel>
                <Textarea
                  placeholder="Opisz co zostało wykonane — korekta lakieru, powłoka ceramiczna, oklejanie PPF..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>Hashtagi</FieldLabel>
                <HashtagsRow>
                  {DEFAULT_HASHTAGS.map(tag => (
                    <HashtagChip
                      key={tag}
                      $active={activeHashtags.includes(tag)}
                      onClick={() => toggleHashtag(tag)}
                    >
                      {tag}
                    </HashtagChip>
                  ))}
                </HashtagsRow>
              </div>
            </FormPanel>

            <PreviewPanel>
              <PreviewLabel>Podgląd posta</PreviewLabel>
              <PostPreviewBox>
                {postText
                  ? postText
                  : <EmptyPreview>Wypełnij formularz, aby zobaczyć podgląd...</EmptyPreview>
                }
              </PostPreviewBox>
              <CopyBtn $copied={copied} onClick={handleCopy} disabled={!postText}>
                {copied ? <Check /> : <Copy />}
                {copied ? 'Skopiowano!' : 'Kopiuj tekst'}
              </CopyBtn>
            </PreviewPanel>
          </Body>

          <Footer>
            <CancelBtn>Anuluj</CancelBtn>
            <GenerateBtn disabled={!description && !car}>
              <Sparkles />
              Generuj post
            </GenerateBtn>
          </Footer>
        </Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
