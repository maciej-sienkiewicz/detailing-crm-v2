import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import {
    X, Copy, Check, RotateCcw, Sparkles, Wand2,
    Award, Cpu, Heart, Coffee, ShieldCheck, ShieldAlert,
    ThumbsUp, ThumbsDown, Plus, Trash2, AlertCircle, Send, ExternalLink,
} from 'lucide-react';
import type {
    GeneratedPostRating,
    GenerateInstagramPostRequest,
    InstagramPostResult,
    InstagramStyleRule,
} from '../types';
import { MAX_ACTIVE_STYLE_RULES, MAX_STYLE_RULE_LENGTH } from '../types';
import { instagramApi } from '../api/instagramApi';
import { pluralPl } from '@/common/utils/plural';
import { acquireScrollLock } from '@/common/utils/scrollLock';
import { useBreakpoint } from '@/common/hooks';
import { Button, ButtonLink, ui } from '@/common/components/ui';
import { PHONE } from '../utils/phone';
import { accountsApi, apiErrorMessage } from '../api/accountsApi';
import type { PublishResult, PublishVisit } from '../accountsTypes';
import { useInstagramConnection, useMyInstagram, usePublishVisits } from '../hooks/useAccounts';
import { PublishSection } from './accounts/PublishSection';
import { InstagramPostPreview, PreviewNote } from './accounts/InstagramPostPreview';
import { sampleLikes } from './accounts/postPreviewLogic';
import {
    captionProblem,
    defaultAiSelection,
    MAX_AI_PHOTOS,
    publishSeed,
    togglePhoto,
    topicAfterVisitChange,
    contextAfterVisitChange,
    visitContext,
} from './accounts/publishLogic';
import { VisitMaterialSection } from './accounts/VisitMaterialSection';

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

const sheetIn = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/** Ruch tylko dla tych, którzy go nie wyłączyli w systemie. */
const PHONE_REDUCED_MOTION = `${PHONE} and (prefers-reduced-motion: reduce)`;

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

  /* Telefon: generator to pełny ekran, nie okno z marginesem - formularz, wynik
     i siatka zdjęć potrzebują każdego piksela szerokości. Wcięcia systemowe
     przejmują nagłówek (góra) i stopka (dół); rozmycie tła i tak nie byłoby widać. */
  ${PHONE} {
    align-items: stretch;
    padding: 0 env(safe-area-inset-right, 0px) 0 env(safe-area-inset-left, 0px);
    backdrop-filter: none;
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

  /* Pełna wysokość widocznego obszaru (100dvh nakładki), stopka przyklejona do dołu.
     Przy klawiaturze (interactive-widget=resizes-content) obszar się skraca, a razem
     z nim środek okna - stopka zostaje nad klawiaturą, przewija się tylko treść. */
  ${PHONE} {
    position: relative;
    max-width: none;
    height: 100%;
    max-height: none;
    border-radius: 0;
    box-shadow: none;
    animation: ${sheetIn} 220ms cubic-bezier(0.32, 0.72, 0, 1);
  }

  ${PHONE_REDUCED_MOTION} {
    animation: none;
  }
`;

// ─── Header ────────────────────────────────────────────────────────────────────

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 18px;
  border-bottom: 1px solid #F1F5F9;
  flex-shrink: 0;

  /* Zwarty pasek: na telefonie nagłówek jest tylko podpisem okna, a nie treścią. */
  ${PHONE} {
    gap: 4px;
    padding: max(6px, env(safe-area-inset-top, 0px)) 4px 6px 16px;
    border-bottom-color: ${ui.line};
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  /* Wysokość krzyżyka także wtedy, gdy go nie ma (generowanie, publikacja) - inaczej
     nagłówek podskakiwał o 12 px między fazami. */
  ${PHONE} {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    gap: 10px;
  }
`;

const IconWrap = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: linear-gradient(135deg, #0369A1 0%, #6366F1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 3px 10px rgba(3, 105, 161, 0.32);

  ${PHONE} {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    box-shadow: 0 2px 6px rgba(3, 105, 161, 0.28);

    svg { width: 16px; height: 16px; }
  }
`;

const HeaderMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  ${PHONE} { min-width: 0; }
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0F172A;
  letter-spacing: -0.2px;

  ${PHONE} {
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

/* Podtytuł na telefonie znika: mówi to samo co tytuł, a kosztuje drugą linię nagłówka. */
const HeaderSub = styled.p`
  margin: 0;
  font-size: 12px;
  color: #94A3B8;

  ${PHONE} { display: none; }
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

  ${PHONE} {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    color: ${ui.textSecondary};

    svg { width: 20px; height: 20px; }
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

/**
 * Stopka na telefonie - osobny układ, nie przeróbka desktopowej. Dawniej trzy przyciski
 * po 111 px w jednym rzędzie łamały „Zmień opis" i „Kopiuj post" na dwie linie obok
 * gradientu. Tu krok następny ma własny rząd na całą szerokość, a akcje poboczne
 * dzielą rząd pod nim po równo i nigdy się nie zawijają.
 */
const PhoneFooter = styled.div`
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px max(12px, env(safe-area-inset-bottom, 0px));
  border-top: 1px solid ${ui.line};
  background: ${ui.surface};
`;

const PhoneRow = styled.div<{ $form?: boolean }>`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  ${p => p.$form && 'grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);'}
  gap: 8px;

  /* W stopce formularza oba przyciski stoją w jednym rzędzie - jedna wysokość. */
  ${p => p.$form && 'button { height: 48px; }'}
`;

const PhonePrimary = styled(Button)`
  height: 48px;
  font-size: 15px;
`;

const PhonePrimaryLink = styled(ButtonLink)`
  height: 48px;
  font-size: 15px;
`;

const PhoneSecondary = styled(Button)`
  height: 44px;
`;

// ─── Pytanie przed zamknięciem (telefon) ──────────────────────────────────────

/** Przygaszenie posta pod pytaniem - tapnięcie w nie znaczy „wróć do posta". */
const ConfirmScrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgba(15, 23, 42, 0.36);
  animation: ${overlayIn} 160ms ease;

  ${PHONE_REDUCED_MOTION} { animation: none; }
`;

/** Pytanie zajmuje miejsce stopki, więc w oknie nadal jest tylko jedno wypełnienie. */
const ConfirmSheet = styled(PhoneFooter)`
  gap: 10px;
  padding-top: 18px;
  border-top: none;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -12px 32px rgba(15, 23, 42, 0.16);
  animation: ${fadeSlide} 200ms ease;

  ${PHONE_REDUCED_MOTION} { animation: none; }
`;

const ConfirmTitle = styled.h3`
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${ui.ink};
`;

const ConfirmText = styled.p`
  margin: -4px 0 4px;
  font-size: 14px;
  line-height: 1.45;
  color: ${ui.textSecondary};
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

  /* 11 px wersalikami na telefonie czyta się jak przypis, nie jak pytanie formularza. */
  ${PHONE} {
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textSecondary};
    text-transform: none;
    letter-spacing: normal;
  }
`;

/* Na telefonie placeholder w #CBD5E1 ginie (1,5:1) - jaśniejszy od treści, ale czytelny. */
const phonePlaceholder = `
  ${PHONE} {
    &::placeholder { color: ${ui.textFaint}; }
  }
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
    border-color: #0369A1;
    box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.12);
  }

  &::placeholder {
    color: #CBD5E1;
  }

  ${PHONE} {
    min-height: 46px;
    font-size: 15px;
  }
  ${phonePlaceholder}
`;

const ContextTextarea = styled.textarea`
  width: 100%;
  min-height: 148px;
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
    border-color: #0369A1;
    box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.12);
  }

  &::placeholder {
    color: #CBD5E1;
  }

  /* Wysokość na cały przykład z placeholdera - ucięty w pół zdania nic nie podpowiada. */
  ${PHONE} {
    min-height: 124px;
    font-size: 14px;
  }
  ${phonePlaceholder}
`;

const HintText = styled.p`
  margin: 3px 0 0;
  font-size: 11px;
  color: #CBD5E1;
  line-height: 1.4;

  ${PHONE} {
    margin-top: 2px;
    font-size: 12px;
    color: ${ui.textMuted};
  }
`;

// ─── Tone select cards ─────────────────────────────────────────────────────────

const ToneGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;

  @media (max-width: 420px) {
    grid-template-columns: minmax(0, 1fr);
  }

  /* Na telefonie siatka 2×2 zamiast czterech kart po 75 px: ton to szybki wybór,
     nie powód do przewijania. Opis schodzi pod nazwę i ma całą szerokość karty. */
  ${PHONE} {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
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
  border: 1.5px solid ${p => p.$active ? '#0369A1' : '#E2E8F0'};
  background: ${p => p.$active ? '#F0F7FF' : '#fff'};
  box-shadow: ${p => p.$active ? '0 0 0 3px rgba(3, 105, 161, 0.10)' : '0 1px 2px rgba(15,23,42,0.04)'};

  &:hover {
    border-color: ${p => p.$active ? '#0369A1' : '#CBD5E1'};
    background: ${p => p.$active ? '#F0F7FF' : '#FAFBFC'};
  }

  /* Wiersze od góry: gdy opis jednej karty złamie się na dwie linie (duża czcionka
     systemowa), nazwy w rzędzie i tak stoją na jednej wysokości. */
  ${PHONE} {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    align-items: center;
    align-content: start;
    gap: 4px 8px;
    min-height: 68px;
    padding: 10px;
    font-family: inherit;
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
  background: ${p => p.$active ? 'rgba(3, 105, 161, 0.12)' : '#F1F5F9'};
  color: ${p => p.$active ? '#075985' : '#94A3B8'};
  transition: background 150ms, color 150ms;

  ${PHONE} {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    color: ${p => p.$active ? '#075985' : ui.textMuted};

    svg { width: 15px; height: 15px; }
  }
`;

const ToneText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;

  /* Nazwa obok ikony, opis w drugim wierszu karty (siatka ToneCard). */
  ${PHONE} { display: contents; }
`;

const ToneLabel = styled.span<{ $active: boolean }>`
  font-size: 13px;
  font-weight: 600;
  color: ${p => p.$active ? '#075985' : '#0F172A'};
  line-height: 1.3;

  ${PHONE} { font-size: 14px; }
`;

const ToneDesc = styled.span`
  font-size: 11px;
  color: #94A3B8;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  ${PHONE} {
    grid-column: 1 / -1;
    font-size: 12px;
    color: ${ui.textMuted};
    white-space: normal;
  }
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
  color: ${p => p.$active ? '#0369A1' : '#94A3B8'};
  transition: color 180ms;

  ${PHONE} {
    font-size: 12px;
    color: ${p => p.$active ? ui.brandStrong : ui.textMuted};
  }
`;

// ─── Reguły stylistyczne (trwałe, per studio) ─────────────────────────────────

const RuleCounter = styled.span`
  margin-left: auto;
  font-size: 10.5px;
  font-weight: 600;
  color: #94A3B8;
  text-transform: none;
  letter-spacing: 0;

  ${PHONE} {
    font-size: 12px;
    font-weight: 500;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
  }
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
  border: 1px solid ${p => p.$active ? '#C0D9E8' : '#E2E8F0'};
  background: ${p => p.$active ? '#F8FBFF' : '#FFFFFF'};
  border-radius: 9px;
  cursor: pointer;
  transition: border-color 150ms, background 150ms;

  &:hover {
    border-color: ${p => p.$active ? '#A7CADD' : '#CBD5E1'};
  }

  ${PHONE} {
    gap: 10px;
    padding: 10px 6px 10px 12px;
    border-radius: ${ui.radiusRow};
  }
`;

const RuleCheckbox = styled.input`
  margin: 2px 0 0;
  accent-color: #0369A1;
  cursor: pointer;
  flex-shrink: 0;

  ${PHONE} {
    width: 18px;
    height: 18px;
    margin-top: 1px;
  }
`;

const RuleText = styled.span<{ $active: boolean }>`
  flex: 1;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${p => p.$active ? '#1E293B' : '#94A3B8'};
  word-break: break-word;

  ${PHONE} {
    font-size: 13.5px;
    color: ${p => p.$active ? '#1E293B' : ui.textMuted};
  }
`;

/**
 * Na telefonie kosz ma 28 px widocznie i 44 px pod palcem (`::after`). Dawniej była to
 * goła ikona 13 px w klikalnym wierszu-etykiecie: chybienie o milimetr przełączało
 * regułę zamiast ją usuwać. Trafienie w `::after` to trafienie w przycisk, a etykieta
 * nie przełącza pola, gdy kliknięto przycisk w jej środku.
 */
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

  ${PHONE} {
    position: relative;
    width: 28px;
    height: 28px;
    margin: -4px 0;
    border-radius: 8px;
    color: ${ui.textMuted};

    svg { width: 16px; height: 16px; }

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 44px;
      height: 44px;
      transform: translate(-50%, -50%);
    }
  }
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
    border-color: #0369A1;
    box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.12);
  }

  &::placeholder { color: #CBD5E1; }

  /* min-width: 0 - inaczej pole trzyma szerokość domyślną i wypycha „Dodaj" za krawędź. */
  ${PHONE} {
    min-width: 0;
    min-height: 44px;
    font-size: 14px;
  }
  ${phonePlaceholder}
`;

const RuleAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  font-size: 12.5px;
  font-weight: 600;
  background: #F0F6F9;
  color: #075985;
  border: 1.5px solid #C0D9E8;
  border-radius: 9px;
  cursor: pointer;
  transition: background 150ms;

  &:hover:not(:disabled) { background: #E6F0F6; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  ${PHONE} {
    flex-shrink: 0;
    padding: 0 16px;
    font-size: 13.5px;
  }
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

  /* Telefon: pytanie w osobnym wierszu, „Dobry" i „Słaby" po równo pod nim -
     zawijany rząd zostawiał „Słaby" samotnie w nowej linii. */
  ${PHONE} {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid ${ui.line};
  }
`;

const RatingLabel = styled.span`
  font-size: 12px;
  color: #64748B;
  margin-right: auto;

  ${PHONE} {
    grid-column: 1 / -1;
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textSecondary};
  }
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

  ${PHONE} {
    justify-content: center;
    height: 44px;
    padding: 0 14px;
    font-size: 13.5px;
    border-radius: ${ui.radiusControl};
  }
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
    border-color: #0369A1;
    box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.12);
  }

  &::placeholder { color: #CBD5E1; }

  ${PHONE} {
    min-height: 92px;
    font-size: 14px;
  }
  ${phonePlaceholder}
`;

// Odcień, nie wypełnienie: ocena to akcja poboczna. Krokiem następnym okna jest
// kopiowanie albo publikacja w stopce - dwa wypełnienia dawałyby remis (CLAUDE.md §2).
const CommentSendBtn = styled.button`
  align-self: flex-end;
  padding: 8px 16px;
  font-size: 12.5px;
  font-weight: 600;
  background: #F0F6F9;
  color: #075985;
  border: 1.5px solid #C0D9E8;
  border-radius: 8px;
  cursor: pointer;

  &:hover:not(:disabled) { background: #E6F0F6; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  ${PHONE} {
    height: 44px;
    padding: 0 20px;
    font-size: 13.5px;
    border-radius: ${ui.radiusControl};
  }
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

  /* Okno ma na telefonie pełną wysokość - oczekiwanie stoi na środku ekranu. */
  ${PHONE} {
    box-sizing: border-box;
    min-height: 100%;
    padding: 32px 8px;
  }
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
 * Pasek rośnie od 0 do 92% jedną animacją CSS - bez licznika w JS.
 *
 * Kształt jest tu całą treścią: `cubic-bezier(0.05, 0.7, 0.1, 1)` rusza gwałtownie
 * i wyhamowuje na długim ogonie („progress illusion" - czekanie z paskiem, który
 * zwalnia, wydaje się krótsze niż z paskiem liniowym albo z animacją w kółko).
 *
 * Dlaczego CSS, a nie requestAnimationFrame ze stanem Reacta: animacja czasowa działa
 * niezależnie od tego, czy karta jest aktywna, nie generuje klatka po klatce nowych
 * klas styled-components i nie zależy od tego, czy wątek główny akurat nadąża.
 * 92%, bo 100% ma znaczyć „gotowe" - a to wie tylko odpowiedź serwera, po której
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
  background: linear-gradient(90deg, #0369A1 0%, #6366F1 100%);
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

  ${PHONE} {
    font-size: 12px;
    line-height: 1.5;
    color: ${ui.textMuted};
  }
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

  ${PHONE} {
    font-size: 13px;
    font-weight: 600;
    color: ${ui.textSecondary};
    text-transform: none;
    letter-spacing: normal;
  }
`;

const ResultTopicEcho = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #0F172A;
`;

/** Tło pod makietą posta - jasna szarość kanału Instagrama, żeby biała karta odcinała się jak w aplikacji. */
const PreviewStage = styled.div`
  background: #fafafa;
  border: 1px solid #efefef;
  border-radius: 16px;
  padding: 20px 16px 14px;

  /* Na telefonie okno jest na pełny ekran - karta posta dostaje całą szerokość. */
  ${PHONE} {
    padding: 14px 10px 10px;
  }
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

  ${PHONE} {
    font-size: 12px;
    color: ${ui.textMuted};
    font-variant-numeric: tabular-nums;
  }
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
  background: ${p => p.$disabled ? '#F1F5F9' : 'linear-gradient(135deg, #0369A1 0%, #6366F1 100%)'};
  color: ${p => p.$disabled ? '#94A3B8' : '#fff'};
  border: none;
  border-radius: 8px;
  cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 150ms ease;
  box-shadow: ${p => p.$disabled ? 'none' : '0 2px 8px rgba(3, 105, 161, 0.28)'};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(3, 105, 161, 0.36);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

/**
 * Kopiowanie jest krokiem następnym (wypełnione), dopóki nie da się opublikować
 * z CRM. Gdy są zaznaczone zdjęcia, wypełnienie przechodzi na „Opublikuj",
 * a kopiowanie zostaje przy odcieniu - jedno wypełnienie w oknie (CLAUDE.md §2).
 */
const CopyBtn = styled.button<{ $copied: boolean; $primary: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: ${p => p.$primary && !p.$copied ? 700 : 600};
  background: ${p => p.$copied ? '#DCFCE7' : p.$primary ? 'linear-gradient(135deg, #0369A1 0%, #6366F1 100%)' : '#F0F6F9'};
  color: ${p => p.$copied ? '#16A34A' : p.$primary ? '#fff' : '#075985'};
  border: ${p => p.$primary && !p.$copied ? 'none' : `1.5px solid ${p.$copied ? '#BBF7D0' : '#C0D9E8'}`};
  border-radius: 8px;
  cursor: pointer;
  transition: all 200ms ease;
  box-shadow: ${p => p.$primary && !p.$copied ? '0 2px 8px rgba(3, 105, 161, 0.28)' : 'none'};

  &:hover {
    background: ${p => p.$copied ? '#DCFCE7' : p.$primary ? 'linear-gradient(135deg, #0369A1 0%, #6366F1 100%)' : '#E6F0F6'};
  }
`;

/** Link do opublikowanego posta - po publikacji to jest krok następny okna. */
const ViewPostLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 22px;
  font-size: 13px;
  font-weight: 700;
  background: linear-gradient(135deg, #0369A1 0%, #6366F1 100%);
  color: #fff;
  border-radius: 8px;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(3, 105, 161, 0.28);
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
    /** Wizyta, z której otwarto generator - jej auto, usługi i zdjęcia idą do AI i do publikacji. */
    visitId?: string;
    /** „Wybierz inną realizację": okno zaczyna od wyboru wizyty, bez podpowiedzianej. */
    pickVisit?: boolean;
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

    // Reguły stylistyczne studia - trwałe, wspólne dla wszystkich generowań.
    // Backend dokłada aktywne reguły do promptu sam, więc nie wysyłamy ich w żądaniu.
    const [rules, setRules]           = useState<InstagramStyleRule[]>([]);
    const [ruleInput, setRuleInput]   = useState('');
    const [ruleBusy, setRuleBusy]     = useState(false);
    const [ruleError, setRuleError]   = useState<string | null>(null);

    // Ocena wygenerowanego posta - wejście do pętli uczenia po stronie backendu.
    const [rating, setRating]         = useState<GeneratedPostRating | null>(null);
    const [comment, setComment]       = useState('');
    const [commentOpen, setCommentOpen] = useState(false);
    const [ratingBusy, setRatingBusy] = useState(false);

    // Publikacja na połączone konto Instagram (zdjęcia z wizyt + podpis z wygenerowanego tekstu).
    const [caption, setCaption]           = useState('');
    const [selectedPhotos, setSelected]   = useState<string[]>([]);
    const [publishing, setPublishing]     = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [published, setPublished]       = useState<PublishResult | null>(null);

    // Telefon: post skopiowany choć raz jest już u właściciela - zamknięcie niczego nie traci.
    const [copiedOnce, setCopiedOnce]     = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);

    // Realizacja: wizyta i zdjęcia, które zobaczy AI. Te same zdjęcia startują jako wybór do publikacji.
    const [visitId, setVisitId]           = useState<string | undefined>(prefill?.pickVisit ? undefined : prefill?.visitId);
    const [aiPhotos, setAiPhotos]         = useState<string[]>([]);
    const [aiSeeded, setAiSeeded]         = useState(false);
    const [publishSeeded, setPublishSeeded] = useState(false);
    // Ostatni kontekst wstawiony z wizyty: odróżnia tekst „z automatu" od tekstu właściciela.
    const [autoContext, setAutoContext]   = useState('');

    const topicRef    = useRef<HTMLInputElement>(null);
    const stayRef     = useRef<HTMLButtonElement>(null);

    const isDesktop = useBreakpoint('md');
    const titleId = useId();
    const toneLabelId = useId();
    const lengthLabelId = useId();
    const confirmTitleId = useId();
    const confirmTextId = useId();

    const connectionQuery = useInstagramConnection();
    const canPublish = connectionQuery.data?.status === 'CONNECTED';
    // Wizyty są potrzebne już w formularzu (wybór realizacji), nie dopiero przy publikacji.
    const visitsQuery = usePublishVisits(true);
    // Skala polubień w podglądzie: mediana własnych postów albo liczba obserwujących.
    const mineQuery = useMyInstagram(canPublish);

    // Zdjęcia dla AI z wizyty, z której otwarto generator, zaznaczamy raz, gdy lista przyjdzie -
    // potem decyduje właściciel. Ustawienie w trakcie renderu, nie w efekcie: inaczej
    // pierwsza klatka pokazałaby pustą siatkę i dopiero druga zaznaczenie.
    if (!aiSeeded && visitsQuery.data) {
        setAiSeeded(true);
        const seeded = visitsQuery.data.find(v => v.visitId === visitId);
        setAiPhotos(defaultAiSelection(seeded));
        const filled = contextAfterVisitChange(context, autoContext, seeded);
        setContext(filled);
        setAutoContext(visitContext(seeded));
    }

    // Do publikacji startują zdjęcia, które widział model - tekst opisuje właśnie je. W renderze,
    // nie przy samym wyniku: lista wizyt mogła przyjść dopiero po kliknięciu „Generuj".
    if (phase === 'result' && !publishSeeded && visitsQuery.data) {
        setPublishSeeded(true);
        setSelected(publishSeed(aiPhotos, visitsQuery.data, visitId));
    }

    const handleVisitChange = (next: PublishVisit | undefined) => {
        setVisitId(next?.visitId);
        setAiPhotos(defaultAiSelection(next));
        setTopic(prev => topicAfterVisitChange(prev, next));
        setContext(prev => contextAfterVisitChange(prev, autoContext, next));
        setAutoContext(visitContext(next));
    };

    const activeRuleCount = rules.filter(r => r.active).length;

    const canGenerate = topic.trim().length > 0;

    // Własna nakładka (poza ModalShell) - blokada przewijania tła wyłącznie przez moduł
    // scrollLock (CLAUDE.md §3); okno jest montowane tylko otwarte, więc wystarczy mount.
    useEffect(() => acquireScrollLock(), []);

    // Focus topic on open - poza „Wybierz inną realizację": tam pierwszym pytaniem jest wizyta.
    // Na telefonie nigdy: klawiatura zasłaniała ~36% ekranu, zanim właściciel zobaczył formularz.
    // Decyzja zapada raz, przy otwarciu - obrót telefonu nie może nagle wyciągnąć klawiatury.
    const [focusTopicOnOpen] = useState(() => isDesktop && prefill?.pickVisit !== true);
    useEffect(() => {
        if (!focusTopicOnOpen) return;
        const t = setTimeout(() => topicRef.current?.focus(), 80);
        return () => clearTimeout(t);
    }, [focusTopicOnOpen]);

    // Reguły studia ładujemy raz przy otwarciu - ich brak nie może blokować generowania.
    useEffect(() => {
        let cancelled = false;
        instagramApi.listStyleRules()
            .then(loaded => { if (!cancelled) setRules(loaded); })
            .catch(() => { if (!cancelled) setRules([]); });
        return () => { cancelled = true; };
    }, []);

    /**
     * Na telefonie gotowy, jeszcze nieskopiowany i nieopublikowany post nie znika po cichu.
     * Systemowe „Wstecz" przychodzi tu jako Escape (installNativeShell), a dawniej drugie
     * „Wstecz" po schowaniu klawiatury zamykało okno razem z wygenerowanym tekstem - za
     * który studio już zapłaciło limitem generowań. Na komputerze zamknięcie zostaje
     * natychmiastowe: tam nikt nie zamyka okna przypadkiem przyciskiem systemowym.
     */
    const guardClose = !isDesktop && phase === 'result' && result !== null && published === null && !copiedOnce;
    const requestClose = useCallback(() => {
        if (guardClose) setConfirmClose(true);
        else onClose();
    }, [guardClose, onClose]);

    // ESC closes - poza publikacją: zamknięte okno nie przerwie posta po stronie Meta,
    // a właściciel nie dowiedziałby się, czy post wyszedł.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || publishing) return;
            // Drugie „Wstecz" przy otwartym pytaniu znaczy „zostań", nie „zamknij mimo to".
            if (confirmClose) setConfirmClose(false);
            else requestClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [requestClose, publishing, confirmClose]);

    // Pytanie przejmuje focus: schowa klawiaturę nad podpisem i ustawi czytnik ekranu na pytaniu.
    useEffect(() => {
        if (confirmClose) stayRef.current?.focus();
    }, [confirmClose]);

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
                visitId,
                photoIds:   visitId && aiPhotos.length > 0 ? aiPhotos : undefined,
            };
            const data = await instagramApi.generatePost(req);
            setResult(data);
            setCopiedOnce(false);
            // Nowy tekst to nowy podpis: wcześniejsza edycja dotyczyła poprzedniej wersji posta.
            setCaption(data.content);
            setPublishSeeded(false);
            setPublished(null);
            setPublishError(null);
            setPhase('result');
        } catch (e) {
            // Limit generowań (429) i błędy modelu mają czytelny komunikat z backendu -
            // pokazujemy go przy formularzu, żeby nie zniknął razem z toastem.
            const message = (e as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            setGenError(message ?? 'Nie udało się wygenerować posta. Spróbuj ponownie.');
            setPhase('form');
        }
    }, [canGenerate, topic, context, tone, length, visitId, aiPhotos]);

    const handleCopy = useCallback(async () => {
        if (!result) return;
        try {
            // Kopiujemy podpis po poprawkach właściciela - to on jest w podglądzie, nie surowy wynik.
            await navigator.clipboard.writeText(caption.trim() ? caption : result.content);
            setCopied(true);
            setCopiedOnce(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Ignore clipboard errors
        }
    }, [result, caption]);

    const handlePublish = useCallback(async () => {
        if (publishing || selectedPhotos.length === 0 || captionProblem(caption)) return;
        setPublishing(true);
        setPublishError(null);
        try {
            const done = await accountsApi.publish({ caption: caption.trim() || null, photoIds: selectedPhotos });
            setPublished(done);
        } catch (e) {
            setPublishError(apiErrorMessage(e, 'Nie udało się opublikować. Spróbuj ponownie za chwilę.'));
        } finally {
            setPublishing(false);
        }
    }, [publishing, selectedPhotos, caption]);

    const handleRegenerate = () => {
        setPhase('form');
        setResult(null);
        setRating(null);
        setComment('');
        setCommentOpen(false);
        if (isDesktop) setTimeout(() => topicRef.current?.focus(), 80);
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
        // Komentarz przy ocenie negatywnej jest najcenniejszą częścią oceny - pytamy o niego,
        // zanim zapiszemy werdykt, zamiast wysyłać samo „słaby".
        setCommentOpen(true);
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && phase !== 'loading' && !publishing) requestClose();
    };

    // Zdjęcia w podglądzie: dokładnie te i w tej kolejności, które pójdą do publikacji.
    const photoUrls = new Map((visitsQuery.data ?? []).flatMap(v => v.photos.map(p => [p.id, p.thumbnailUrl] as const)));
    const previewPhotos = selectedPhotos
        .filter(id => photoUrls.has(id))
        .map(id => ({ id, url: photoUrls.get(id)! }));
    // Liczniki i podgląd idą za podpisem, który właściciel może poprawić przed publikacją.
    const content     = caption || (result?.content ?? '');
    const charCount   = content.length;
    const wordCount   = content.trim() ? content.trim().split(/\s+/).length : 0;

    // ── Phases ────────────────────────────────────────────────────────────────

    const renderBody = () => {
        if (phase === 'loading') {
            return (
                <LoadingWrap>
                    {/* Bez aria-valuenow: pasek nie mierzy postępu, tylko pokazuje, że
                        praca trwa - deklarowanie fałszywej wartości myliłoby czytnik ekranu. */}
                    <ProgressTrack role="progressbar" aria-label="Generowanie posta" aria-busy="true">
                        <ProgressFill />
                    </ProgressTrack>
                    <LoadingText>Generuję post na Instagram…</LoadingText>
                    {topic && <LoadingEcho>„{topic}"</LoadingEcho>}
                    <LoadingHint>AI pisze post i sprawdza go z Twoimi regułami. To potrwa chwilę…</LoadingHint>
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
                                        Nie udało się spełnić wszystkich reguł po {result.iterations}{' '}
                                        {pluralPl(result.iterations, 'próbie', 'próbach', 'próbach')}:
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

                    <PreviewStage>
                        <InstagramPostPreview
                            username={connectionQuery.data?.username ?? 'twoje_studio'}
                            photos={previewPhotos}
                            caption={content}
                            likes={sampleLikes(mineQuery.data?.topPosts, mineQuery.data?.followers)}
                        />
                        <PreviewNote>
                            Tak post ułoży się w kanale Instagrama. Polubienia i komentarze są przykładowe,
                            w skali Twojego konta.
                        </PreviewNote>
                    </PreviewStage>

                    <ContentStats>
                        <ContentStat>{wordCount} {pluralPl(wordCount, 'słowo', 'słowa', 'słów')}</ContentStat>
                        <ContentStat>{charCount} {pluralPl(charCount, 'znak', 'znaki', 'znaków')}</ContentStat>
                    </ContentStats>

                    {/* Ocena uczy generator stylu tego studia - dlatego pytamy od razu,
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
                                autoFocus={isDesktop}
                                placeholder={'Co jest nie tak? Np. „za dużo wykrzykników”, „zbyt sprzedażowy ton”…'}
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
                            Zapisane. Kolejne posty będą tego unikać.
                        </RatingSavedNote>
                    )}

                    <PublishSection
                        connection={connectionQuery.data}
                        connectionLoading={connectionQuery.isLoading}
                        visits={visitsQuery.data}
                        visitsLoading={visitsQuery.isLoading}
                        selected={selectedPhotos}
                        onToggle={id => setSelected(prev => togglePhoto(prev, id))}
                        caption={caption}
                        onCaptionChange={setCaption}
                        publishing={publishing}
                        error={publishError}
                        result={published}
                        onGoToConnect={onClose}
                    />
                </ResultWrap>
            );
        }

        // phase === 'form'
        return (
            <>
                <VisitMaterialSection
                    visits={visitsQuery.data}
                    loading={visitsQuery.isLoading}
                    visitId={visitId}
                    onVisitChange={handleVisitChange}
                    aiPhotos={aiPhotos}
                    onToggleAiPhoto={id => setAiPhotos(prev => togglePhoto(prev, id, MAX_AI_PHOTOS))}
                    highlight={prefill?.pickVisit === true && !visitId}
                    autoFocus={isDesktop}
                />

                {/* Topic */}
                <FormSection>
                    <FieldLabel htmlFor="gp-topic">
                        Temat posta <Required>*</Required>
                    </FieldLabel>
                    <TopicInput
                        id="gp-topic"
                        ref={topicRef}
                        type="text"
                        placeholder={isDesktop ? 'Np. Nowe oklejanie PPF na BMW M4 Competition' : 'Np. Oklejanie PPF na BMW M4'}
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
                        maxLength={1500}
                    />
                    <HintText>
                        {visitId && context === autoContext && context !== ''
                            ? 'Uzupełnione z wizyty. Dokładnie o tym będzie post: popraw, usuń albo dopisz szczegóły.'
                            : 'Szczegóły realizacji, specyfika klienta, użyte produkty itp.'}
                    </HintText>
                </FormSection>

                {/* Tone */}
                <FormSection>
                    <FieldLabel id={toneLabelId}>Ton</FieldLabel>
                    {/* Radio, bo ton jest jeden; drugie tapnięcie w wybrany zdejmuje wybór (ton domyślny). */}
                    <ToneGrid role="radiogroup" aria-labelledby={toneLabelId}>
                        {TONES.map(t => (
                            <ToneCard
                                key={t.value}
                                type="button"
                                role="radio"
                                aria-checked={tone === t.value}
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
                    <FieldLabel id={lengthLabelId}>Długość</FieldLabel>
                    <SegmentedWrap role="radiogroup" aria-labelledby={lengthLabelId}>
                        {LENGTHS.map(l => (
                            <SegmentBtn
                                key={l.value}
                                type="button"
                                role="radio"
                                aria-checked={length === l.value}
                                $active={length === l.value}
                                onClick={() => setLength(prev => prev === l.value ? null : l.value)}
                            >
                                <SegmentLabel $active={length === l.value}>{l.label}</SegmentLabel>
                                <SegmentMeta $active={length === l.value}>{l.meta}</SegmentMeta>
                            </SegmentBtn>
                        ))}
                    </SegmentedWrap>
                </FormSection>

                {/* Style rules - trwałe reguły studia */}
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
                        Reguły obowiązują przy każdym poście. AI sprawdza je i w razie potrzeby poprawia tekst.
                    </HintText>
                </FormSection>

                {genError && <InlineError><AlertCircle size={13} strokeWidth={2} />{genError}</InlineError>}

            </>
        );
    };

    const renderFooter = () => {
        if (phase === 'loading') return null;

        if (phase === 'result') {
            if (published) {
                return (
                    <ModalFooter>
                        <FooterLeft>Post jest na Instagramie</FooterLeft>
                        <FooterRight>
                            <CancelBtn type="button" onClick={onClose}>Zamknij</CancelBtn>
                            {published.permalink && (
                                <ViewPostLink href={published.permalink} target="_blank" rel="noreferrer">
                                    <ExternalLink size={14} strokeWidth={2} />
                                    Zobacz post
                                </ViewPostLink>
                            )}
                        </FooterRight>
                    </ModalFooter>
                );
            }

            // Jedno wypełnienie: „Opublikuj", gdy są zdjęcia i połączone konto; inaczej „Kopiuj".
            const publishReady = canPublish && selectedPhotos.length > 0;
            const publishBlocked = publishing || captionProblem(caption) !== null;
            return (
                <ModalFooter>
                    <FooterLeft>
                        {publishReady ? 'Gotowe do publikacji' : 'Gotowe do wklejenia na Instagram'}
                    </FooterLeft>
                    <FooterRight>
                        <RegenerateBtn type="button" onClick={handleRegenerate} disabled={publishing}>
                            <RotateCcw size={13} strokeWidth={2} />
                            Zmień opis
                        </RegenerateBtn>
                        <CopyBtn
                            type="button"
                            $copied={copied}
                            $primary={!publishReady}
                            onClick={handleCopy}
                        >
                            {copied
                                ? <><Check size={14} strokeWidth={2.5} /> Skopiowano</>
                                : <><Copy size={14} strokeWidth={2} /> Kopiuj post</>
                            }
                        </CopyBtn>
                        {publishReady && (
                            <GenerateBtn
                                type="button"
                                $disabled={publishBlocked}
                                disabled={publishBlocked}
                                aria-busy={publishing}
                                onClick={() => void handlePublish()}
                            >
                                <Send size={14} strokeWidth={2} />
                                {publishing ? 'Publikuję…' : 'Opublikuj'}
                            </GenerateBtn>
                        )}
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
                    <CancelBtn type="button" onClick={requestClose}>
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

    /**
     * Stopka telefonu: jedno wypełnienie (krok następny) w osobnym rzędzie na całą
     * szerokość, akcje poboczne po równo pod nim. Reguła wyboru kroku następnego jest ta
     * sama co na komputerze - zmienia się tylko układ.
     */
    const renderPhoneFooter = () => {
        if (phase === 'loading') return null;

        if (confirmClose) {
            return (
                <ConfirmSheet role="alertdialog" aria-labelledby={confirmTitleId} aria-describedby={confirmTextId}>
                    <ConfirmTitle id={confirmTitleId}>Zamknąć generator?</ConfirmTitle>
                    <ConfirmText id={confirmTextId}>
                        Wygenerowany post zniknie. Żeby go zachować, wróć i skopiuj go albo opublikuj.
                    </ConfirmText>
                    <PhonePrimary ref={stayRef} variant="primary" size="lg" block onClick={() => setConfirmClose(false)}>
                        Wróć do posta
                    </PhonePrimary>
                    <PhoneSecondary variant="tintedDanger" size="lg" block onClick={onClose}>
                        Zamknij
                    </PhoneSecondary>
                </ConfirmSheet>
            );
        }

        if (phase === 'result') {
            if (published) {
                return (
                    <PhoneFooter>
                        {published.permalink && (
                            <PhonePrimaryLink
                                href={published.permalink}
                                target="_blank"
                                rel="noreferrer"
                                $variant="primary"
                                $size="lg"
                                $block
                            >
                                <ExternalLink aria-hidden="true" />
                                Zobacz post
                            </PhonePrimaryLink>
                        )}
                        <PhoneSecondary variant={published.permalink ? 'outline' : 'primary'} size="lg" block onClick={onClose}>
                            Zamknij
                        </PhoneSecondary>
                    </PhoneFooter>
                );
            }

            const publishReady = canPublish && selectedPhotos.length > 0;
            const publishBlocked = publishing || captionProblem(caption) !== null;
            const copyLabel = copied
                ? <><Check aria-hidden="true" /> Skopiowano</>
                : <><Copy aria-hidden="true" /> Kopiuj post</>;
            return (
                <PhoneFooter>
                    {publishReady ? (
                        <PhonePrimary
                            variant="primary"
                            size="lg"
                            block
                            disabled={publishBlocked}
                            aria-busy={publishing}
                            onClick={() => void handlePublish()}
                        >
                            <Send aria-hidden="true" />
                            {publishing ? 'Publikuję…' : 'Opublikuj'}
                        </PhonePrimary>
                    ) : (
                        <PhonePrimary variant={copied ? 'tintedSuccess' : 'primary'} size="lg" block onClick={handleCopy}>
                            {copyLabel}
                        </PhonePrimary>
                    )}
                    <PhoneRow>
                        <PhoneSecondary variant="outline" size="lg" block onClick={handleRegenerate} disabled={publishing}>
                            <RotateCcw aria-hidden="true" />
                            Zmień opis
                        </PhoneSecondary>
                        {publishReady && (
                            <PhoneSecondary variant={copied ? 'tintedSuccess' : 'tinted'} size="lg" block onClick={handleCopy}>
                                {copyLabel}
                            </PhoneSecondary>
                        )}
                    </PhoneRow>
                </PhoneFooter>
            );
        }

        return (
            <PhoneFooter>
                <PhoneRow $form>
                    <PhoneSecondary variant="outline" size="lg" block onClick={requestClose}>
                        Anuluj
                    </PhoneSecondary>
                    <PhonePrimary variant="primary" size="lg" block disabled={!canGenerate} onClick={handleGenerate}>
                        <Sparkles aria-hidden="true" />
                        Generuj post
                    </PhonePrimary>
                </PhoneRow>
            </PhoneFooter>
        );
    };

    return createPortal(
        <Overlay onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <Modal>
                <ModalHeader>
                    <HeaderLeft>
                        <IconWrap>
                            <Wand2 size={18} strokeWidth={2} />
                        </IconWrap>
                        <HeaderMeta>
                            <HeaderTitle id={titleId}>Generator postów na Instagram</HeaderTitle>
                            <HeaderSub>AI tworzy post na podstawie Twoich realizacji</HeaderSub>
                        </HeaderMeta>
                    </HeaderLeft>
                    {phase !== 'loading' && !publishing && (
                        <CloseBtn type="button" onClick={requestClose} aria-label="Zamknij">
                            <X size={16} strokeWidth={2} />
                        </CloseBtn>
                    )}
                </ModalHeader>

                <ModalBody>
                    {renderBody()}
                </ModalBody>

                {confirmClose && <ConfirmScrim aria-hidden="true" onClick={() => setConfirmClose(false)} />}
                {isDesktop ? renderFooter() : renderPhoneFooter()}
            </Modal>
        </Overlay>,
        document.body
    );
};
