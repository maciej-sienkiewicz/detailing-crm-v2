// src/modules/photos/components/TagChip.tsx

import styled from 'styled-components';
import { getTagColor } from './tagColors';

interface TagChipProps {
    label: string;
    onRemove?: () => void;
    onClick?: () => void;
    size?: 'sm' | 'md';
    /** When true the chip acts as a filter toggle */
    active?: boolean;
}

const Chip = styled.span<{
    $bg: string;
    $text: string;
    $border: string;
    $size: 'sm' | 'md';
    $clickable: boolean;
    $active: boolean;
}>`
    display: inline-flex;
    align-items: center;
    gap: ${p => p.$size === 'sm' ? '3px' : '4px'};
    padding: ${p => p.$size === 'sm' ? '2px 7px' : '3px 9px'};
    border-radius: 9999px;
    font-size: ${p => p.$size === 'sm' ? '10px' : '11px'};
    font-weight: 600;
    white-space: nowrap;
    background: ${p => p.$active ? p.$text : p.$bg};
    color: ${p => p.$active ? '#fff' : p.$text};
    border: 1px solid ${p => p.$border};
    cursor: ${p => p.$clickable ? 'pointer' : 'default'};
    transition: all 140ms ease;
    max-width: 140px;
    user-select: none;

    span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &:hover {
        opacity: ${p => p.$clickable ? 0.82 : 1};
    }
`;

const RemoveBtn = styled.button<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 13px;
    height: 13px;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    color: ${p => p.$color};
    opacity: 0.6;
    border-radius: 50%;
    flex-shrink: 0;
    transition: opacity 140ms ease, background 140ms ease;
    line-height: 1;

    &:hover {
        opacity: 1;
        background: rgba(0,0,0,0.08);
    }
`;

export const TagChip = ({ label, onRemove, onClick, size = 'md', active = false }: TagChipProps) => {
    const { bg, text, border } = getTagColor(label);

    return (
        <Chip
            $bg={bg}
            $text={text}
            $border={border}
            $size={size}
            $clickable={!!onClick}
            $active={active}
            onClick={onClick}
            title={label}
        >
            <span>{label}</span>
            {onRemove && (
                <RemoveBtn
                    $color={text}
                    onClick={e => { e.stopPropagation(); onRemove(); }}
                    title="Usuń tag"
                    type="button"
                >
                    <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <line x1="2" y1="2" x2="8" y2="8" />
                        <line x1="8" y1="2" x2="2" y2="8" />
                    </svg>
                </RemoveBtn>
            )}
        </Chip>
    );
};
