import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

export const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px;
    background: #F8FAFC;
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
`;

export const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
`;

export const SectionTitle = styled.h4`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

export const SectionTitleIcon = styled.div`
    width: 18px;
    height: 18px;
    color: ${st.textMuted};
    flex-shrink: 0;

    svg {
        width: 100%;
        height: 100%;
    }
`;

/* ─── Notification Card ────────────────────────────────────── */

export const NotifCard = styled.div<{ $active: boolean }>`
    background: ${props => props.$active ? '#FFFFFF' : '#F1F5F9'};
    border: 1.5px solid ${props => props.$active ? st.accentBlue : st.border};
    border-radius: ${st.radiusSm};
    overflow: hidden;
    transition: border-color 0.2s ease, background 0.2s ease;
`;

export const NotifCardHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 16px;
    cursor: pointer;
    user-select: none;
`;

export const NotifIconWrap = styled.div<{ $active: boolean }>`
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: ${st.radiusSm};
    background: ${props => props.$active ? st.accentBlueDim : st.bgCardAlt};
    color: ${props => props.$active ? st.accentBlue : st.textMuted};
    flex-shrink: 0;
    transition: background 0.2s ease, color 0.2s ease;

    svg {
        width: 18px;
        height: 18px;
    }
`;

export const NotifLabelGroup = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
`;

export const NotifLabel = styled.span<{ $active: boolean }>`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${props => props.$active ? st.text : st.textSecondary};
    transition: color 0.2s ease;
`;

export const NotifDescription = styled.span`
    font-size: 12px;
    color: ${st.textMuted};
    line-height: 1.4;
`;

/* ─── Toggle Switch ────────────────────────────────────────── */

export const ToggleTrack = styled.div<{ $on: boolean }>`
    position: relative;
    width: 42px;
    height: 24px;
    border-radius: 12px;
    background: ${props => props.$on ? st.accentBlue : '#CBD5E1'};
    transition: background 0.2s ease;
    flex-shrink: 0;

    &::after {
        content: '';
        position: absolute;
        top: 3px;
        left: ${props => props.$on ? '21px' : '3px'};
        width: 18px;
        height: 18px;
        background: #ffffff;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        transition: left 0.2s ease;
    }
`;

/* ─── Email Options Expandable Body ────────────────────────── */

export const EmailBody = styled.div<{ $visible: boolean }>`
    max-height: ${props => props.$visible ? '600px' : '0'};
    overflow: hidden;
    transition: max-height 0.3s ease;
`;

export const EmailBodyInner = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 16px 16px;
    border-top: 1px solid ${st.border};
    padding-top: 14px;
`;

export const AttachmentsLabel = styled.div`
    font-size: 12px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

export const AttachmentsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const AttachmentRow = styled.label<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    padding: 3px 0;
    opacity: ${props => props.$disabled ? 0.45 : 1};
    pointer-events: ${props => props.$disabled ? 'none' : 'auto'};

    &:hover > span:first-child {
        border-color: ${st.accentBlue};
    }
`;

export const Checkbox = styled.span<{ $checked: boolean }>`
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 2px solid ${props => props.$checked ? st.accentBlue : '#CBD5E1'};
    background: ${props => props.$checked ? st.accentBlue : 'transparent'};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s ease;

    svg {
        width: 11px;
        height: 11px;
        color: #ffffff;
        opacity: ${props => props.$checked ? 1 : 0};
        transition: opacity 0.1s ease;
    }
`;

export const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
`;

export const AttachmentText = styled.span<{ $checked: boolean }>`
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${props => props.$checked ? st.text : st.textSecondary};
    transition: color 0.15s ease;
    flex: 1;
`;

export const AttachmentSuffix = styled.span`
    font-size: 12px;
    color: ${st.textMuted};
    margin-left: 4px;
`;

/* ─── Photo Grid ───────────────────────────────────────────── */

export const PhotoGridWrap = styled.div`
    margin-top: 4px;
    padding: 12px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

export const PhotoGridHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
`;

export const PhotoGridCount = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: ${st.textSecondary};
`;

export const SelectAllBtn = styled.button`
    background: none;
    border: none;
    padding: 0;
    font-size: 12px;
    font-weight: 600;
    color: ${st.accentBlue};
    cursor: pointer;
    transition: opacity 0.15s ease;

    &:hover {
        opacity: 0.75;
    }
`;

export const PhotoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
`;

export const PhotoItem = styled.div<{ $selected: boolean }>`
    position: relative;
    border-radius: 6px;
    overflow: hidden;
    border: 2px solid ${props => props.$selected ? st.accentBlue : 'transparent'};
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.1s ease;
    aspect-ratio: 1;
    background: ${st.bgCardAlt};

    &:hover {
        transform: scale(1.03);
        border-color: ${props => props.$selected ? st.accentBlue : '#93C5FD'};
    }
`;

export const PhotoThumb = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;

export const PhotoCheckOverlay = styled.div<{ $selected: boolean }>`
    position: absolute;
    top: 4px;
    right: 4px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid ${props => props.$selected ? 'transparent' : 'rgba(255,255,255,0.8)'};
    background: ${props => props.$selected ? st.accentBlue : 'rgba(0,0,0,0.25)'};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;

    svg {
        width: 11px;
        height: 11px;
        color: #ffffff;
        opacity: ${props => props.$selected ? 1 : 0};
    }
`;

export const PhotoLoadingPlaceholder = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    color: ${st.textMuted};
    font-size: 12px;
    gap: 8px;
`;

export const NoPhotosHint = styled.div`
    font-size: 12px;
    color: ${st.textMuted};
    text-align: center;
    padding: 10px 0 2px;
    font-style: italic;
`;
