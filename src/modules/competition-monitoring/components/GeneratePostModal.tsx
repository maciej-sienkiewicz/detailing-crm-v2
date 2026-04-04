import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import {
    X, Copy, Check, RotateCcw, Sparkles, Wand2,
    Award, Cpu, Heart, Coffee,
    Shield, Droplets, Star, Car, PaintBucket, Zap, MoreHorizontal,
} from 'lucide-react';
import type { GenerateInstagramPostRequest } from '../types';
import { instagramApi } from '../api/instagramApi';

// ─── Animations ────────────────────────────────────────────────────────────────

const dotBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
  30%           { transform: translateY(-8px); opacity: 1; }
`;

const overlayIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const modalIn = keyframes`
  from { opacity: 0; transform: scale(0.97) translateY(16px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
`;

const fadeSlide = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// ─── Shell ─────────────────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  animation: ${overlayIn} 200ms ease;
`;

const Modal = styled.div`
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 660px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow:
    0 32px 64px rgba(15, 23, 42, 0.18),
    0 4px 16px rgba(15, 23, 42, 0.08),
    0 0 0 1px rgba(15, 23, 42, 0.04);
  animation: ${modalIn} 280ms cubic-bezier(0.34, 1.4, 0.64, 1);
`;

// ─── Header ────────────────────────────────────────────────────────────────────

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 18px;
  border-bottom: 1px solid #F1F5F9;
  flex-shrink: 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const IconWrap = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(59, 130, 246, 0.32);
`;

const HeaderMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0F172A;
  letter-spacing: -0.2px;
`;

const HeaderSub = styled.p`
  margin: 0;
  font-size: 12px;
  color: #94A3B8;
`;

const CloseBtn = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #94A3B8;
  cursor: pointer;
  transition: all 150ms ease;
  flex-shrink: 0;

  &:hover {
    background: #F1F5F9;
    color: #0F172A;
  }
`;

// ─── Body ──────────────────────────────────────────────────────────────────────

const ModalBody = styled.div`
  overflow-y: auto;
  padding: 24px;
  flex: 1;
  scroll-behavior: smooth;
`;

// ─── Footer ────────────────────────────────────────────────────────────────────

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  background: #FAFBFC;
`;

const FooterLeft = styled.div`
  font-size: 12px;
  color: #94A3B8;
`;

const FooterRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

// ─── Form sections ─────────────────────────────────────────────────────────────

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
`;

const FieldLabel = styled.label`
  font-size: 11px;
  font-weight: 700;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Required = styled.span`
  color: #EF4444;
`;

const TopicInput = styled.input`
  width: 100%;
  padding: 11px 14px;
  font-size: 14px;
  font-family: inherit;
  color: #0F172A;
  background: #fff;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms, box-shadow 150ms;

  &:focus {
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  &::placeholder {
    color: #CBD5E1;
  }
`;

const ContextTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 11px 14px;
  font-size: 13px;
  font-family: inherit;
  color: #0F172A;
  background: #fff;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  outline: none;
  resize: vertical;
  box-sizing: border-box;
  line-height: 1.6;
  transition: border-color 150ms, box-shadow 150ms;

  &:focus {
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  &::placeholder {
    color: #CBD5E1;
  }
`;

const HintText = styled.p`
  margin: 3px 0 0;
  font-size: 11px;
  color: #CBD5E1;
  line-height: 1.4;
`;

// ─── Tone select cards ─────────────────────────────────────────────────────────

const ToneGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const ToneCard = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
  border: 1.5px solid ${p => p.$active ? '#3B82F6' : '#E2E8F0'};
  background: ${p => p.$active ? '#F0F7FF' : '#fff'};
  box-shadow: ${p => p.$active ? '0 0 0 3px rgba(59,130,246,0.10)' : '0 1px 2px rgba(15,23,42,0.04)'};

  &:hover {
    border-color: ${p => p.$active ? '#3B82F6' : '#CBD5E1'};
    background: ${p => p.$active ? '#F0F7FF' : '#FAFBFC'};
  }
`;

const ToneIconBox = styled.div<{ $active: boolean }>`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${p => p.$active ? 'rgba(59,130,246,0.12)' : '#F1F5F9'};
  color: ${p => p.$active ? '#2563EB' : '#94A3B8'};
  transition: background 150ms, color 150ms;
`;

const ToneText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
`;

const ToneLabel = styled.span<{ $active: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.$active ? '#1E40AF' : '#0F172A'};
  line-height: 1.3;
`;

const ToneDesc = styled.span`
  font-size: 11px;
  color: #94A3B8;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// ─── Length segmented control ──────────────────────────────────────────────────

const SegmentedWrap = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  background: #F1F5F9;
  border-radius: 10px;
  padding: 3px;
`;

const SegmentBtn = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  transition: background 180ms ease, box-shadow 180ms ease, color 180ms ease;
  background: ${p => p.$active ? '#ffffff' : 'transparent'};
  box-shadow: ${p => p.$active ? '0 1px 4px rgba(15,23,42,0.10), 0 0 0 1px rgba(15,23,42,0.05)' : 'none'};

  &:hover {
    background: ${p => p.$active ? '#ffffff' : 'rgba(255,255,255,0.5)'};
  }
`;

const SegmentLabel = styled.span<{ $active: boolean }>`
  font-size: 13px;
  font-weight: ${p => p.$active ? 700 : 500};
  color: ${p => p.$active ? '#0F172A' : '#64748B'};
  transition: color 180ms, font-weight 180ms;
`;

const SegmentMeta = styled.span<{ $active: boolean }>`
  font-size: 11px;
  color: ${p => p.$active ? '#3B82F6' : '#94A3B8'};
  transition: color 180ms;
`;

// ─── Service type icon grid ────────────────────────────────────────────────────

const ServiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 7px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ServiceCell = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
  border: 1.5px solid ${p => p.$active ? '#3B82F6' : '#E2E8F0'};
  background: ${p => p.$active ? '#F0F7FF' : '#fff'};
  box-shadow: ${p => p.$active ? '0 0 0 3px rgba(59,130,246,0.10)' : '0 1px 2px rgba(15,23,42,0.04)'};

  &:hover {
    border-color: ${p => p.$active ? '#3B82F6' : '#CBD5E1'};
    background: ${p => p.$active ? '#F0F7FF' : '#FAFBFC'};
  }
`;

const ServiceIconBox = styled.div<{ $active: boolean }>`
  color: ${p => p.$active ? '#2563EB' : '#94A3B8'};
  transition: color 150ms;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ServiceLabel = styled.span<{ $active: boolean }>`
  font-size: 11px;
  font-weight: ${p => p.$active ? 700 : 500};
  color: ${p => p.$active ? '#1E40AF' : '#64748B'};
  text-align: center;
  line-height: 1.2;
  transition: color 150ms, font-weight 150ms;
`;

// ─── Style notes (tag input) ───────────────────────────────────────────────────

const TagsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px;
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  min-height: 44px;
  background: #fff;
  cursor: text;
  align-items: flex-start;
  transition: border-color 150ms, box-shadow 150ms;

  &:focus-within {
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 10px;
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  color: #2563EB;
  line-height: 1.4;
`;

const TagRemoveBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #93C5FD;
  padding: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: color 120ms;

  &:hover {
    color: #EF4444;
  }
`;

const TagInput = styled.input`
  border: none;
  outline: none;
  font-size: 12px;
  font-family: inherit;
  color: #0F172A;
  background: transparent;
  flex: 1;
  min-width: 140px;
  padding: 3px 4px;

  &::placeholder {
    color: #CBD5E1;
  }
`;

// ─── Loading ───────────────────────────────────────────────────────────────────

const LoadingWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 64px 24px;
  animation: ${fadeSlide} 200ms ease;
`;

const DotsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Dot = styled.span<{ $delay: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3B82F6;
  animation: ${dotBounce} 1.1s ease-in-out infinite;
  animation-delay: ${p => p.$delay};
`;

const LoadingText = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
  text-align: center;
`;

const LoadingEcho = styled.div`
  padding: 10px 18px;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 12px;
  color: #64748B;
  font-style: italic;
  text-align: center;
  max-width: 460px;
  line-height: 1.5;
`;

const LoadingHint = styled.p`
  margin: 0;
  font-size: 11px;
  color: #CBD5E1;
  text-align: center;
`;

// ─── Result ────────────────────────────────────────────────────────────────────

const ResultWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: ${fadeSlide} 250ms ease;
`;

const ResultTopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const ResultMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ResultLabel = styled.p`
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ResultTopicEcho = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #0F172A;
`;

const ContentBox = styled.div`
  background: #F8FAFC;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  padding: 20px 22px;
  font-size: 14px;
  color: #1E293B;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 160px;
  user-select: text;
`;

const ContentStats = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
`;

const ContentStat = styled.span`
  font-size: 11px;
  color: #94A3B8;
`;

// ─── Buttons ───────────────────────────────────────────────────────────────────

const CancelBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  background: transparent;
  color: #64748B;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #CBD5E1;
  }
`;

const GenerateBtn = styled.button<{ $disabled: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 22px;
  font-size: 13px;
  font-weight: 700;
  background: ${p => p.$disabled ? '#F1F5F9' : 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)'};
  color: ${p => p.$disabled ? '#94A3B8' : '#fff'};
  border: none;
  border-radius: 8px;
  cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 150ms ease;
  box-shadow: ${p => p.$disabled ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.28)'};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.36);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const CopyBtn = styled.button<{ $copied: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  background: ${p => p.$copied ? '#DCFCE7' : '#EFF6FF'};
  color: ${p => p.$copied ? '#16A34A' : '#2563EB'};
  border: 1.5px solid ${p => p.$copied ? '#BBF7D0' : '#BFDBFE'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 200ms ease;

  &:hover {
    background: ${p => p.$copied ? '#DCFCE7' : '#DBEAFE'};
  }
`;

const RegenerateBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  background: transparent;
  color: #64748B;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;

  &:hover {
    background: #F8FAFC;
    color: #0F172A;
    border-color: #CBD5E1;
  }
`;

// ─── Data ──────────────────────────────────────────────────────────────────────

const TONES: { value: string; label: string; desc: string; icon: React.ReactNode }[] = [
    { value: 'premium',   label: 'Premium',     desc: 'Ekskluzywny, elegancki', icon: <Award    size={16} strokeWidth={2} /> },
    { value: 'technical', label: 'Techniczny',  desc: 'Ekspercki, precyzyjny',  icon: <Cpu      size={16} strokeWidth={2} /> },
    { value: 'emotional', label: 'Emocjonalny', desc: 'Angażujący, osobisty',   icon: <Heart    size={16} strokeWidth={2} /> },
    { value: 'casual',    label: 'Swobodny',    desc: 'Luźny, przyjazny',       icon: <Coffee   size={16} strokeWidth={2} /> },
];

const LENGTHS: { value: string; label: string; meta: string }[] = [
    { value: 'short', label: 'Krótki', meta: '~150 znaków' },
    { value: 'full',  label: 'Pełny',  meta: '~500 znaków' },
];

const SERVICE_TYPES: { value: string; label: string; icon: React.ReactNode }[] = [
    { value: 'ppf',       label: 'PPF',        icon: <Shield         size={18} strokeWidth={1.8} /> },
    { value: 'ceramic',   label: 'Ceramika',   icon: <Droplets       size={18} strokeWidth={1.8} /> },
    { value: 'detailing', label: 'Detailing',  icon: <Sparkles       size={18} strokeWidth={1.8} /> },
    { value: 'interior',  label: 'Wnętrze',    icon: <Car            size={18} strokeWidth={1.8} /> },
    { value: 'wrap',      label: 'Oklejanie',  icon: <PaintBucket    size={18} strokeWidth={1.8} /> },
    { value: 'polish',    label: 'Polerowanie',icon: <Zap            size={18} strokeWidth={1.8} /> },
    { value: 'other',     label: 'Inne',       icon: <MoreHorizontal size={18} strokeWidth={1.8} /> },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'loading' | 'result';

interface Props {
    onClose: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const GeneratePostModal: React.FC<Props> = ({ onClose }) => {
    const [phase, setPhase] = useState<Phase>('form');
    const [topic, setTopic]           = useState('');
    const [context, setContext]       = useState('');
    const [tone, setTone]             = useState<string | null>(null);
    const [length, setLength]         = useState<string | null>(null);
    const [serviceType, setService]   = useState<string | null>(null);
    const [styleNotes, setNotes]      = useState<string[]>([]);
    const [noteInput, setNoteInput]   = useState('');
    const [result, setResult]         = useState('');
    const [copied, setCopied]         = useState(false);

    const tagsWrapRef = useRef<HTMLDivElement>(null);
    const topicRef    = useRef<HTMLInputElement>(null);

    const canGenerate = topic.trim().length > 0;

    // Focus topic on open
    useEffect(() => {
        const t = setTimeout(() => topicRef.current?.focus(), 80);
        return () => clearTimeout(t);
    }, []);

    // ESC closes
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleGenerate = useCallback(async () => {
        if (!canGenerate) return;
        setPhase('loading');
        try {
            const req: GenerateInstagramPostRequest = {
                topic:       topic.trim(),
                context:     context.trim() || undefined,
                postTone:    tone     as GenerateInstagramPostRequest['postTone']    ?? undefined,
                postLength:  length   as GenerateInstagramPostRequest['postLength']  ?? undefined,
                serviceType: serviceType as GenerateInstagramPostRequest['serviceType'] ?? undefined,
                styleNotes:  styleNotes.length > 0 ? styleNotes : undefined,
            };
            const data = await instagramApi.generatePost(req);
            setResult(data.content);
            setPhase('result');
        } catch {
            setPhase('form');
        }
    }, [canGenerate, topic, context, tone, length, serviceType, styleNotes]);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(result);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Ignore clipboard errors
        }
    }, [result]);

    const handleRegenerate = () => {
        setPhase('form');
        setResult('');
        setTimeout(() => topicRef.current?.focus(), 80);
    };

    const addNote = useCallback(() => {
        const note = noteInput.trim();
        if (note && !styleNotes.includes(note)) {
            setNotes(prev => [...prev, note]);
        }
        setNoteInput('');
    }, [noteInput, styleNotes]);

    const removeNote = (note: string) => {
        setNotes(prev => prev.filter(n => n !== note));
    };

    const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addNote();
        }
        if (e.key === 'Backspace' && !noteInput && styleNotes.length > 0) {
            setNotes(prev => prev.slice(0, -1));
        }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && phase !== 'loading') onClose();
    };

    const charCount   = result.length;
    const wordCount   = result.trim() ? result.trim().split(/\s+/).length : 0;

    // ── Phases ────────────────────────────────────────────────────────────────

    const renderBody = () => {
        if (phase === 'loading') {
            return (
                <LoadingWrap>
                    <DotsRow>
                        <Dot $delay="0s"    />
                        <Dot $delay="0.18s" />
                        <Dot $delay="0.36s" />
                    </DotsRow>
                    <LoadingText>Generuję post na Instagram…</LoadingText>
                    {topic && <LoadingEcho>„{topic}"</LoadingEcho>}
                    <LoadingHint>Model AI analizuje styl i tworzy treść. Chwilę…</LoadingHint>
                </LoadingWrap>
            );
        }

        if (phase === 'result') {
            return (
                <ResultWrap>
                    <ResultTopBar>
                        <ResultMeta>
                            <ResultLabel>Wygenerowany post</ResultLabel>
                            <ResultTopicEcho>{topic}</ResultTopicEcho>
                        </ResultMeta>
                    </ResultTopBar>

                    <ContentBox>{result}</ContentBox>

                    <ContentStats>
                        <ContentStat>{wordCount} słów</ContentStat>
                        <ContentStat>{charCount} znaków</ContentStat>
                    </ContentStats>
                </ResultWrap>
            );
        }

        // phase === 'form'
        return (
            <>
                {/* Topic */}
                <FormSection>
                    <FieldLabel htmlFor="gp-topic">
                        Temat posta <Required>*</Required>
                    </FieldLabel>
                    <TopicInput
                        id="gp-topic"
                        ref={topicRef}
                        type="text"
                        placeholder="Np. Nowe oklejanie PPF na BMW M4 Competition"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && canGenerate) handleGenerate(); }}
                        maxLength={200}
                    />
                    <HintText>Opisz realizację lub akcję, o której chcesz napisać.</HintText>
                </FormSection>

                {/* Context */}
                <FormSection>
                    <FieldLabel htmlFor="gp-context">Dodatkowy kontekst</FieldLabel>
                    <ContextTextarea
                        id="gp-context"
                        placeholder="Np. Klient przywiózł auto z zagranicy, zależało mu na ochronie całego przodu. Użyliśmy XPEL Ultimate Plus…"
                        value={context}
                        onChange={e => setContext(e.target.value)}
                        maxLength={800}
                    />
                    <HintText>Szczegóły realizacji, specyfika klienta, użyte produkty itp.</HintText>
                </FormSection>

                {/* Tone */}
                <FormSection>
                    <FieldLabel>Ton</FieldLabel>
                    <ToneGrid>
                        {TONES.map(t => (
                            <ToneCard
                                key={t.value}
                                type="button"
                                $active={tone === t.value}
                                onClick={() => setTone(prev => prev === t.value ? null : t.value)}
                            >
                                <ToneIconBox $active={tone === t.value}>
                                    {t.icon}
                                </ToneIconBox>
                                <ToneText>
                                    <ToneLabel $active={tone === t.value}>{t.label}</ToneLabel>
                                    <ToneDesc>{t.desc}</ToneDesc>
                                </ToneText>
                            </ToneCard>
                        ))}
                    </ToneGrid>
                </FormSection>

                {/* Length */}
                <FormSection>
                    <FieldLabel>Długość</FieldLabel>
                    <SegmentedWrap>
                        {LENGTHS.map(l => (
                            <SegmentBtn
                                key={l.value}
                                type="button"
                                $active={length === l.value}
                                onClick={() => setLength(prev => prev === l.value ? null : l.value)}
                            >
                                <SegmentLabel $active={length === l.value}>{l.label}</SegmentLabel>
                                <SegmentMeta $active={length === l.value}>{l.meta}</SegmentMeta>
                            </SegmentBtn>
                        ))}
                    </SegmentedWrap>
                </FormSection>

                {/* Service type */}
                <FormSection>
                    <FieldLabel>Rodzaj usługi</FieldLabel>
                    <ServiceGrid>
                        {SERVICE_TYPES.map(s => (
                            <ServiceCell
                                key={s.value}
                                type="button"
                                $active={serviceType === s.value}
                                onClick={() => setService(prev => prev === s.value ? null : s.value)}
                            >
                                <ServiceIconBox $active={serviceType === s.value}>
                                    {s.icon}
                                </ServiceIconBox>
                                <ServiceLabel $active={serviceType === s.value}>{s.label}</ServiceLabel>
                            </ServiceCell>
                        ))}
                    </ServiceGrid>
                </FormSection>

                {/* Style notes */}
                <FormSection>
                    <FieldLabel>Reguły stylistyczne</FieldLabel>
                    <TagsWrap
                        ref={tagsWrapRef}
                        onClick={() => tagsWrapRef.current?.querySelector('input')?.focus()}
                    >
                        {styleNotes.map(note => (
                            <Tag key={note}>
                                {note}
                                <TagRemoveBtn
                                    type="button"
                                    onClick={e => { e.stopPropagation(); removeNote(note); }}
                                    aria-label="Usuń regułę"
                                >
                                    <X size={10} strokeWidth={2.5} />
                                </TagRemoveBtn>
                            </Tag>
                        ))}
                        <TagInput
                            placeholder={styleNotes.length === 0 ? 'Np. Nie używaj emoji · Enter aby dodać' : 'Dodaj regułę…'}
                            value={noteInput}
                            onChange={e => setNoteInput(e.target.value)}
                            onKeyDown={handleNoteKeyDown}
                            onBlur={addNote}
                        />
                    </TagsWrap>
                    <HintText>Reguły nadrzędne wobec domyślnego stylu. Rozdziel Enterem lub przecinkiem.</HintText>
                </FormSection>
            </>
        );
    };

    const renderFooter = () => {
        if (phase === 'loading') return null;

        if (phase === 'result') {
            return (
                <ModalFooter>
                    <FooterLeft>
                        Gotowe do wklejenia na Instagram
                    </FooterLeft>
                    <FooterRight>
                        <RegenerateBtn type="button" onClick={handleRegenerate}>
                            <RotateCcw size={13} strokeWidth={2} />
                            Zmień parametry
                        </RegenerateBtn>
                        <CopyBtn
                            type="button"
                            $copied={copied}
                            onClick={handleCopy}
                        >
                            {copied
                                ? <><Check size={14} strokeWidth={2.5} /> Skopiowano</>
                                : <><Copy size={14} strokeWidth={2} /> Kopiuj post</>
                            }
                        </CopyBtn>
                    </FooterRight>
                </ModalFooter>
            );
        }

        return (
            <ModalFooter>
                <FooterLeft>
                    {canGenerate ? 'Gotowe do generowania' : 'Uzupełnij temat posta'}
                </FooterLeft>
                <FooterRight>
                    <CancelBtn type="button" onClick={onClose}>
                        Anuluj
                    </CancelBtn>
                    <GenerateBtn
                        type="button"
                        $disabled={!canGenerate}
                        disabled={!canGenerate}
                        onClick={handleGenerate}
                    >
                        <Sparkles size={14} strokeWidth={2} />
                        Generuj post
                    </GenerateBtn>
                </FooterRight>
            </ModalFooter>
        );
    };

    return createPortal(
        <Overlay onClick={handleOverlayClick}>
            <Modal>
                <ModalHeader>
                    <HeaderLeft>
                        <IconWrap>
                            <Wand2 size={18} strokeWidth={2} />
                        </IconWrap>
                        <HeaderMeta>
                            <HeaderTitle>Generator postów Instagram</HeaderTitle>
                            <HeaderSub>AI tworzy post na podstawie Twoich realizacji</HeaderSub>
                        </HeaderMeta>
                    </HeaderLeft>
                    {phase !== 'loading' && (
                        <CloseBtn type="button" onClick={onClose} aria-label="Zamknij">
                            <X size={16} strokeWidth={2} />
                        </CloseBtn>
                    )}
                </ModalHeader>

                <ModalBody>
                    {renderBody()}
                </ModalBody>

                {renderFooter()}
            </Modal>
        </Overlay>,
        document.body
    );
};
