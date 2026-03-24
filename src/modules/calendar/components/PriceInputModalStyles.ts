/**
 * PriceInputModal styles — Stitch-inspired design
 */
import styled from 'styled-components';
import {
    overlayFadeIn,
    modalScaleIn,
    ModalOverlay,
    ModalBox,
    ModalCloseButton,
    FormInfoBox,
    FormInfoLabel,
    FormInfoValue,
    FormErrorMessage,
    SharedButton,
} from '@/common/styles';

// ─── Overlay & container ──────────────────────────────────────────────────────

export const Overlay = styled(ModalOverlay)`
    z-index: 60;
`;

export const ModalContainer = styled(ModalBox).attrs<{ $isOpen: boolean }>({})`
    max-width: 420px;
`;

// ─── Header ───────────────────────────────────────────────────────────────────

export const Header = styled.div`
    padding: 28px 28px 20px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
`;

export const DragHandle = styled.div`display: none;`;

export const CloseButton = styled(ModalCloseButton)``;

export const Title = styled.h2`
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.4px;
    line-height: 1.2;
`;

export const Subtitle = styled.p`
    margin: 0;
    font-size: 14px;
    color: #64748b;
    font-weight: 400;
    line-height: 1.4;
`;

// ─── Body ─────────────────────────────────────────────────────────────────────

export const Content = styled.div`
    padding: 0 28px 24px;
`;

export const ServiceInfoBox = styled(FormInfoBox)`
    margin-bottom: 20px;
`;

export const ServiceInfoLabel = styled(FormInfoLabel)``;

export const ServiceInfoName = styled(FormInfoValue)``;

export const InputGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const Label = styled.label`
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

export const PriceInputWrapper = styled.div`
    position: relative;
`;

export const PriceInput = styled.input`
    width: 100%;
    padding: 14px 52px 14px 18px;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 14px;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
    outline: none;
    transition: all 180ms ease;
    font-family: inherit;

    &::placeholder { color: #cbd5e1; }

    &:hover { border-color: #cbd5e1; }

    &:focus {
        background: #ffffff;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14,165,233,0.14);
    }
`;

export const PriceCurrency = styled.span`
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    font-weight: 600;
    color: #94a3b8;
`;

export const ErrorMessage = styled(FormErrorMessage)``;

// ─── Footer ───────────────────────────────────────────────────────────────────

export const Footer = styled.div`
    padding: 16px 28px;
    border-top: 1px solid #f1f5f9;
    background: #fafbfd;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-shrink: 0;
`;

export const Button = styled(SharedButton)<{ $variant?: 'primary' | 'secondary' }>``;
