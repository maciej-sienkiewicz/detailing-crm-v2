import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import {
    X, Copy, Check, RotateCcw, Sparkles, Wand2,
    Award, Cpu, Heart, Coffee, ShieldCheck, ShieldAlert,
    ThumbsUp, ThumbsDown, Plus, Trash2, AlertCircle,
} from 'lucide-react';
import type {
    GeneratedPostRating,
    GenerateInstagramPostRequest,
    InstagramPostResult,
    InstagramStyleRule,
} from '../types';
import { MAX_ACTIVE_STYLE_RULES, MAX_STYLE_RULE_LENGTH } from '../types';
import { instagramApi } from '../api/instagramApi';

// ─── Animations ────────────────────────────────────────────────────────────────

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
  /* dvh + safe areas: with plain viewport units the modal is centred inside the
     address-bar-less viewport and its footer ends up under browser chrome. */
  height: 100vh;
  height: 100dvh;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding:
    max(16px, env(safe-area-inset-top, 0px))
    max(16px, env(safe-area-inset-right, 0px))
    max(16px, env(safe-area-inset-bottom, 0px))
    max(16px, env(safe-area-inset-left, 0px));
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  animation: ${overlayIn} 200ms ease;

  @media (max-width: 640px) {
    padding:
      max(12px, env(safe-area-inset-top, 0px))
      max(12px, env(safe-area-inset-right, 0px))
      max(12px, env(safe-area-inset-bottom, 0px))
      max(12px, env(safe-area-inset-left, 0px));
  }
`;

const Modal = styled.div`
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 660px;
  max-height: 100%;
  min-height: 0;
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
  overscroll-behavior: contain;
  padding: 24px;
  flex: 1;
  min-height: 0;
  scroll-behavior: smooth;

  @media (max-width: 640px) { padding: 16px; }
`;

// ─── Footer ────────────────────────────────────────────────────────────────────

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  flex-shrink: 0;
  background: #FAFBFC;

  @media (max-width: 640px) {
    padding: 12px 16px;
    gap: 8px;
  }
`;

const FooterLeft = styled.div`
  font-size: 12px;
  color: #94A3B8;

  /* The status caption is the first thing to go when space runs out. */
  @media (max-width: 520px) { display: none; }
`;

const FooterRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  @media (max-width: 520px) {
    width: 100%;

    > button { flex: 1; min-width: 0; justify-content: center; }
  }
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
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;

  @media (max-width: 420px) {
    grid-template-columns: minmax(0, 1fr);
  }
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
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
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

// ─── Reguły stylistyczne (trwałe, per studio) ─────────────────────────────────

const RuleCounter = styled.span`
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 600;
  color: #94A3B8;
  text-transform: none;
  letter-spacing: 0;
`;

const RuleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
`;

const RuleRow = styled.label<{ $active: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid ${p => p.$active ? '#BFDBFE' : '#E2E8F0'};
  background: ${p => p.$active ? '#F8FBFF' : '#FFFFFF'};
  border-radius: 9px;
  cursor: pointer;
  transition: border-color 150ms, background 150ms;

  &:hover {
    border-color: ${p => p.$active ? '#93C5FD' : '#CBD5E1'};
  }
`;

const RuleCheckbox = styled.input`
  margin: 2px 0 0;
  accent-color: #3B82F6;
  cursor: pointer;
  flex-shrink: 0;
`;

const RuleText = styled.span<{ $active: boolean }>`
  flex: 1;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${p => p.$active ? '#1E293B' : '#94A3B8'};
  word-break: break-word;
`;

const RuleDeleteBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #CBD5E1;
  padding: 0;
  flex-shrink: 0;
  transition: color 120ms;

  &:hover { color: #EF4444; }
`;

const RuleAddRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: stretch;
`;

const RuleInput = styled.input`
  flex: 1;
  border: 1.5px solid #E2E8F0;
  border-radius: 9px;
  padding: 9px 12px;
  font-size: 13px;
  font-family: inherit;
  color: #0F172A;
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;

  &:focus {
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  &::placeholder { color: #CBD5E1; }
`;

const RuleAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  font-size: 12.5px;
  font-weight: 600;
  background: #EFF6FF;
  color: #2563EB;
  border: 1.5px solid #BFDBFE;
  border-radius: 9px;
  cursor: pointer;
  transition: background 150ms;

  &:hover:not(:disabled) { background: #DBEAFE; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const InlineError = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 0;
  font-size: 12px;
  color: #DC2626;
`;

// ─── Weryfikacja i ocena ──────────────────────────────────────────────────────

const VerificationBanner = styled.div<{ $passed: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid ${p => p.$passed ? '#BBF7D0' : '#FDE68A'};
  background: ${p => p.$passed ? '#F0FDF4' : '#FFFBEB'};
  color: ${p => p.$passed ? '#166534' : '#92400E'};
  font-size: 12px;
  line-height: 1.6;
`;

const VerificationList = styled.ul`
  margin: 4px 0 0;
  padding-left: 18px;
`;

const ViolationReason = styled.span`
    opacity: 0.85;
    font-style: italic;
`;

const RatingBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 4px;
  border-top: 1px dashed #E2E8F0;
`;

const RatingLabel = styled.span`
  font-size: 12px;
  color: #64748B;
  margin-right: auto;
`;

const RatingBtn = styled.button<{ $variant: 'up' | 'down'; $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;
  border: 1.5px solid ${p => p.$active
      ? (p.$variant === 'up' ? '#BBF7D0' : '#FECACA')
      : '#E2E8F0'};
  background: ${p => p.$active
      ? (p.$variant === 'up' ? '#DCFCE7' : '#FEE2E2')
      : 'transparent'};
  color: ${p => p.$active
      ? (p.$variant === 'up' ? '#16A34A' : '#DC2626')
      : '#64748B'};

  &:hover:not(:disabled) { border-color: #CBD5E1; }
  &:disabled { cursor: default; }
`;

const CommentTextarea = styled.textarea`
  width: 100%;
  border: 1.5px solid #E2E8F0;
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  color: #0F172A;
  resize: vertical;
  min-height: 64px;
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;

  &:focus {
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }

  &::placeholder { color: #CBD5E1; }
`;

const CommentSendBtn = styled.button`
  align-self: flex-end;
  padding: 8px 16px;
  font-size: 12.5px;
  font-weight: 600;
  background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;

  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const RatingSavedNote = styled.p`
  margin: 0;
  font-size: 12px;
  color: #16A34A;
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

const ProgressTrack = styled.div`
  width: 100%;
  max-width: 420px;
  height: 6px;
  border-radius: 999px;
  background: #E2E8F0;
  overflow: hidden;
`;

/**
 * Pasek rośnie od 0 do 92% jedną animacją CSS — bez licznika w JS.
 *
 * Kształt jest tu całą treścią: `cubic-bezier(0.05, 0.7, 0.1, 1)` rusza gwałtownie
 * i wyhamowuje na długim ogonie („progress illusion" — czekanie z paskiem, który
 * zwalnia, wydaje się krótsze niż z paskiem liniowym albo z animacją w kółko).
 *
 * Dlaczego CSS, a nie requestAnimationFrame ze stanem Reacta: animacja czasowa działa
 * niezależnie od tego, czy karta jest aktywna, nie generuje klatka po klatce nowych
 * klas styled-components i nie zależy od tego, czy wątek główny akurat nadąża.
 * 92%, bo 100% ma znaczyć „gotowe" — a to wie tylko odpowiedź serwera, po której
 * ten widok i tak znika.
 */
const grow = keyframes`
  from { width: 0%; }
  to   { width: 92%; }
`;

const ProgressFill = styled.div`
  height: 100%;
  width: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, #3B82F6 0%, #6366F1 100%);
  animation: ${grow} 25s cubic-bezier(0.05, 0.7, 0.1, 1) forwards;
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

// ─── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'loading' | 'result';

export interface GeneratePostPrefill {
    topic?: string;
    context?: string;
}

interface Props {
    onClose: () => void;
    prefill?: GeneratePostPrefill;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const GeneratePostModal: React.FC<Props> = ({ onClose, prefill }) => {
    const [phase, setPhase] = useState<Phase>('form');
    const [topic, setTopic]           = useState(prefill?.topic    ?? '');
    const [context, setContext]       = useState(prefill?.context  ?? '');
    const [tone, setTone]             = useState<string | null>(null);
    const [length, setLength]         = useState<string | null>('full');
    const [result, setResult]         = useState<InstagramPostResult | null>(null);
    const [copied, setCopied]         = useState(false);
    const [genError, setGenError]     = useState<string | null>(null);

    // Reguły stylistyczne studia — trwałe, wspólne dla wszystkich generowań.
    // Backend dokłada aktywne reguły do promptu sam, więc nie wysyłamy ich w żądaniu.
    const [rules, setRules]           = useState<InstagramStyleRule[]>([]);
    const [ruleInput, setRuleInput]   = useState('');
    const [ruleBusy, setRuleBusy]     = useState(false);
    const [ruleError, setRuleError]   = useState<string | null>(null);

    // Ocena wygenerowanego posta — wejście do pętli uczenia po stronie backendu.
    const [rating, setRating]         = useState<GeneratedPostRating | null>(null);
    const [comment, setComment]       = useState('');
    const [commentOpen, setCommentOpen] = useState(false);
    const [ratingBusy, setRatingBusy] = useState(false);

    const topicRef    = useRef<HTMLInputElement>(null);

    const activeRuleCount = rules.filter(r => r.active).length;

    const canGenerate = topic.trim().length > 0;

    // Focus topic on open
    useEffect(() => {
        const t = setTimeout(() => topicRef.current?.focus(), 80);
        return () => clearTimeout(t);
    }, []);

    // Reguły studia ładujemy raz przy otwarciu — ich brak nie może blokować generowania.
    useEffect(() => {
        let cancelled = false;
        instagramApi.listStyleRules()
            .then(loaded => { if (!cancelled) setRules(loaded); })
            .catch(() => { if (!cancelled) setRules([]); });
        return () => { cancelled = true; };
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
        setGenError(null);
        setRating(null);
        setComment('');
        setCommentOpen(false);
        try {
            const req: GenerateInstagramPostRequest = {
                topic:      topic.trim(),
                context:    context.trim() || undefined,
                postTone:   tone   as GenerateInstagramPostRequest['postTone']   ?? undefined,
                postLength: length as GenerateInstagramPostRequest['postLength'] ?? undefined,
            };
            const data = await instagramApi.generatePost(req);
            setResult(data);
            setPhase('result');
        } catch (e) {
            // Limit generowań (429) i błędy modelu mają czytelny komunikat z backendu —
            // pokazujemy go przy formularzu, żeby nie zniknął razem z toastem.
            const message = (e as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            setGenError(message ?? 'Nie udało się wygenerować posta. Spróbuj ponownie.');
            setPhase('form');
        }
    }, [canGenerate, topic, context, tone, length]);

    const handleCopy = useCallback(async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Ignore clipboard errors
        }
    }, [result]);

    const handleRegenerate = () => {
        setPhase('form');
        setResult(null);
        setRating(null);
        setComment('');
        setCommentOpen(false);
        setTimeout(() => topicRef.current?.focus(), 80);
    };

    // ── Reguły stylistyczne ───────────────────────────────────────────────────

    const addRule = useCallback(async () => {
        const ruleText = ruleInput.trim();
        if (!ruleText || ruleBusy) return;

        if (ruleText.length > MAX_STYLE_RULE_LENGTH) {
            setRuleError(`Reguła może mieć maksymalnie ${MAX_STYLE_RULE_LENGTH} znaków.`);
            return;
        }
        if (activeRuleCount >= MAX_ACTIVE_STYLE_RULES) {
            setRuleError(`Limit ${MAX_ACTIVE_STYLE_RULES} aktywnych reguł. Wyłącz lub usuń którąś, zanim dodasz kolejną.`);
            return;
        }

        setRuleBusy(true);
        setRuleError(null);
        try {
            const created = await instagramApi.createStyleRule(ruleText);
            setRules(prev => [...prev, created]);
            setRuleInput('');
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setRuleError(message ?? 'Nie udało się zapisać reguły.');
        } finally {
            setRuleBusy(false);
        }
    }, [ruleInput, ruleBusy, activeRuleCount]);

    const toggleRule = useCallback(async (rule: InstagramStyleRule) => {
        setRuleError(null);
        // Optymistycznie: przełącznik ma reagować natychmiast, a przy błędzie wracamy do stanu z serwera.
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: !r.active } : r));
        try {
            const updated = await instagramApi.updateStyleRule(rule.id, { active: !rule.active });
            setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
        } catch (e) {
            setRules(prev => prev.map(r => r.id === rule.id ? rule : r));
            const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setRuleError(message ?? 'Nie udało się zmienić reguły.');
        }
    }, []);

    const removeRule = useCallback(async (rule: InstagramStyleRule) => {
        setRuleError(null);
        setRules(prev => prev.filter(r => r.id !== rule.id));
        try {
            await instagramApi.deleteStyleRule(rule.id);
        } catch {
            setRules(prev => [...prev, rule].sort((a, b) => a.createdAt - b.createdAt));
            setRuleError('Nie udało się usunąć reguły.');
        }
    }, []);

    const handleRuleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            void addRule();
        }
    };

    // ── Ocena posta ───────────────────────────────────────────────────────────

    const submitRating = useCallback(async (value: GeneratedPostRating, commentText?: string) => {
        if (!result || ratingBusy) return;
        setRatingBusy(true);
        try {
            await instagramApi.rateGeneratedPost(result.postId, value, commentText);
            setRating(value);
            setCommentOpen(false);
        } finally {
            setRatingBusy(false);
        }
    }, [result, ratingBusy]);

    const handleThumbsDown = () => {
        // Komentarz przy ocenie negatywnej jest najcenniejszą częścią oceny — pytamy o niego,
        // zanim zapiszemy werdykt, zamiast wysyłać samo „słaby".
        setCommentOpen(true);
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && phase !== 'loading') onClose();
    };

    const content     = result?.content ?? '';
    const charCount   = content.length;
    const wordCount   = content.trim() ? content.trim().split(/\s+/).length : 0;

    // ── Phases ────────────────────────────────────────────────────────────────

    const renderBody = () => {
        if (phase === 'loading') {
            return (
                <LoadingWrap>
                    {/* Bez aria-valuenow: pasek nie mierzy postępu, tylko pokazuje, że
                        praca trwa — deklarowanie fałszywej wartości myliłoby czytnik ekranu. */}
                    <ProgressTrack role="progressbar" aria-label="Generowanie posta" aria-busy="true">
                        <ProgressFill />
                    </ProgressTrack>
                    <LoadingText>Generuję post na Instagram...</LoadingText>
                    {topic && <LoadingEcho>„{topic}"</LoadingEcho>}
                    <LoadingHint>Model pisze post, sprawdza go względem Twoich reguł i poprawia. Chwilę...</LoadingHint>
                </LoadingWrap>
            );
        }

        if (phase === 'result' && result) {
            return (
                <ResultWrap>
                    <ResultTopBar>
                        <ResultMeta>
                            <ResultLabel>Wygenerowany post</ResultLabel>
                            <ResultTopicEcho>{topic}</ResultTopicEcho>
                        </ResultMeta>
                    </ResultTopBar>

                    {/* Weryfikacja reguł: post z odstępstwem i tak trafia do studia,
                        ale musi być widać, czego model nie dowiózł. */}
                    {result.iterations > 0 && (
                        <VerificationBanner $passed={result.verificationPassed}>
                            {result.verificationPassed
                                ? <ShieldCheck size={16} strokeWidth={2} />
                                : <ShieldAlert size={16} strokeWidth={2} />}
                            <span>
                                {result.verificationPassed ? (
                                    <>
                                        Post spełnia wszystkie reguły stylistyczne
                                        {result.iterations > 1 && ' (po automatycznej korekcie)'}.
                                    </>
                                ) : (
                                    <>
                                        Nie udało się spełnić wszystkich reguł po {result.iterations} próbach:
                                        <VerificationList>
                                            {/* Powód od weryfikatora obok reguły: „łamie regułę «bez emoji»"
                                                przy poście bez emoji nie daje się ani sprawdzić, ani zgłosić. */}
                                            {(result.failedRuleDetails?.length
                                                ? result.failedRuleDetails
                                                : result.failedRules.map(rule => ({ rule, reason: '' }))
                                            ).map(({ rule, reason }) => (
                                                <li key={rule}>
                                                    {rule}
                                                    {reason && <ViolationReason> — {reason}</ViolationReason>}
                                                </li>
                                            ))}
                                        </VerificationList>
                                    </>
                                )}
                            </span>
                        </VerificationBanner>
                    )}

                    <ContentBox>{result.content}</ContentBox>

                    <ContentStats>
                        <ContentStat>{wordCount} słów</ContentStat>
                        <ContentStat>{charCount} znaków</ContentStat>
                    </ContentStats>

                    {/* Ocena uczy generator stylu tego studia — dlatego pytamy od razu,
                        zanim post zniknie razem z zamkniętym oknem. */}
                    <RatingBar>
                        <RatingLabel>
                            {rating
                                ? 'Dzięki — kolejne posty będą bliżej Twojego stylu.'
                                : 'Jak oceniasz ten post?'}
                        </RatingLabel>
                        <RatingBtn
                            type="button"
                            $variant="up"
                            $active={rating === 'POSITIVE'}
                            disabled={ratingBusy || rating !== null}
                            onClick={() => void submitRating('POSITIVE')}
                        >
                            <ThumbsUp size={14} strokeWidth={2} />
                            Dobry
                        </RatingBtn>
                        <RatingBtn
                            type="button"
                            $variant="down"
                            $active={rating === 'NEGATIVE'}
                            disabled={ratingBusy || rating !== null}
                            onClick={handleThumbsDown}
                        >
                            <ThumbsDown size={14} strokeWidth={2} />
                            Słaby
                        </RatingBtn>
                    </RatingBar>

                    {commentOpen && rating === null && (
                        <>
                            <CommentTextarea
                                autoFocus
                                placeholder={'Co jest nie tak? Np. „za dużo wykrzykników”, „zbyt sprzedażowy ton”...'}
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                maxLength={1000}
                            />
                            <CommentSendBtn
                                type="button"
                                disabled={ratingBusy || comment.trim().length === 0}
                                onClick={() => void submitRating('NEGATIVE', comment.trim())}
                            >
                                Zapisz ocenę
                            </CommentSendBtn>
                        </>
                    )}

                    {rating === 'NEGATIVE' && (
                        <RatingSavedNote>
                            Uwaga zapisana — generator będzie jej unikał w kolejnych postach.
                        </RatingSavedNote>
                    )}
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
                        placeholder="Np. Klient przywiózł auto z zagranicy, zależało mu na ochronie całego przodu. Użyliśmy XPEL Ultimate Plus..."
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

                {/* Style rules — trwałe reguły studia */}
                <FormSection>
                    <FieldLabel>
                        Reguły stylistyczne
                        <RuleCounter>{activeRuleCount}/{MAX_ACTIVE_STYLE_RULES} aktywnych</RuleCounter>
                    </FieldLabel>

                    {rules.length > 0 && (
                        <RuleList>
                            {rules.map(rule => (
                                <RuleRow key={rule.id} $active={rule.active}>
                                    <RuleCheckbox
                                        type="checkbox"
                                        checked={rule.active}
                                        onChange={() => void toggleRule(rule)}
                                    />
                                    <RuleText $active={rule.active}>{rule.ruleText}</RuleText>
                                    <RuleDeleteBtn
                                        type="button"
                                        aria-label="Usuń regułę"
                                        onClick={e => { e.preventDefault(); void removeRule(rule); }}
                                    >
                                        <Trash2 size={13} strokeWidth={2} />
                                    </RuleDeleteBtn>
                                </RuleRow>
                            ))}
                        </RuleList>
                    )}

                    <RuleAddRow>
                        <RuleInput
                            placeholder="Np. Nie używaj emoji"
                            value={ruleInput}
                            onChange={e => setRuleInput(e.target.value)}
                            onKeyDown={handleRuleKeyDown}
                            maxLength={MAX_STYLE_RULE_LENGTH}
                        />
                        <RuleAddBtn
                            type="button"
                            disabled={ruleBusy || ruleInput.trim().length === 0}
                            onClick={() => void addRule()}
                        >
                            <Plus size={14} strokeWidth={2.5} />
                            Dodaj
                        </RuleAddBtn>
                    </RuleAddRow>

                    {ruleError && <InlineError><AlertCircle size={13} strokeWidth={2} />{ruleError}</InlineError>}

                    <HintText>
                        Reguły są zapisywane dla studia i obowiązują przy każdym generowaniu.
                        AI sprawdza je po napisaniu posta i poprawia go, jeśli którejś nie spełnił.
                    </HintText>
                </FormSection>

                {genError && <InlineError><AlertCircle size={13} strokeWidth={2} />{genError}</InlineError>}

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
