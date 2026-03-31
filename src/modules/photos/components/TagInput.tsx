// src/modules/photos/components/TagInput.tsx
// Multi-value tag input with autocomplete dropdown

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { TagChip } from './TagChip';

// ─── Styles ───────────────────────────────────────────────────────────────────

const Wrapper = styled.div`
    position: relative;
`;

const InputArea = styled.div<{ $focused: boolean }>`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    min-height: 40px;
    padding: 6px 10px;
    border: 1.5px solid ${p => p.$focused ? st.accentBlue : st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCard};
    cursor: text;
    transition: border-color ${st.transition}, box-shadow ${st.transition};
    box-shadow: ${p => p.$focused ? st.shadowBlue : 'none'};
`;

const TextInput = styled.input`
    flex: 1;
    min-width: 100px;
    border: none;
    outline: none;
    background: transparent;
    font-size: ${st.fontSm};
    color: ${st.text};
    padding: 2px 0;

    &::placeholder {
        color: ${st.textMuted};
    }
`;

const Dropdown = styled.ul`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 200;
    margin: 0;
    padding: 4px;
    list-style: none;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    box-shadow: ${st.shadowLg};
    max-height: 200px;
    overflow-y: auto;
`;

const DropdownItem = styled.li<{ $highlighted: boolean }>`
    padding: 7px 10px;
    border-radius: 6px;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    cursor: pointer;
    background: ${p => p.$highlighted ? st.accentBlueDim : 'transparent'};
    color: ${p => p.$highlighted ? st.accentBlue : st.textSecondary};
    font-weight: ${p => p.$highlighted ? 600 : 400};
    transition: background ${st.transition};

    &:hover {
        background: ${st.accentBlueDim};
        color: ${st.accentBlue};
    }
`;

const Hint = styled.p`
    margin: 6px 0 0;
    font-size: 11px;
    color: ${st.textMuted};
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface TagInputProps {
    tags: string[];
    suggestions: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    autoFocus?: boolean;
}

export const TagInput = ({
    tags,
    suggestions,
    onChange,
    placeholder = 'Wpisz tag i naciśnij Enter…',
    autoFocus = false,
}: TagInputProps) => {
    const [inputValue, setInputValue] = useState('');
    const [focused, setFocused] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (autoFocus) inputRef.current?.focus();
    }, [autoFocus]);

    const filtered = suggestions
        .filter(s => !tags.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase()))
        .slice(0, 8);

    const showDropdown = focused && (filtered.length > 0 || inputValue.trim().length > 0);

    const addTag = (raw: string) => {
        const tag = raw.trim();
        if (!tag || tags.includes(tag)) return;
        onChange([...tags, tag]);
        setInputValue('');
        setHighlightIdx(-1);
    };

    const removeTag = (tag: string) => {
        onChange(tags.filter(t => t !== tag));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        switch (e.key) {
            case 'Enter':
            case ',':
                e.preventDefault();
                if (highlightIdx >= 0 && filtered[highlightIdx]) {
                    addTag(filtered[highlightIdx]);
                } else {
                    addTag(inputValue);
                }
                break;
            case 'Backspace':
                if (!inputValue && tags.length > 0) {
                    removeTag(tags[tags.length - 1]);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightIdx(i => Math.max(i - 1, -1));
                break;
            case 'Escape':
                setFocused(false);
                inputRef.current?.blur();
                break;
        }
    };

    return (
        <Wrapper>
            <InputArea
                $focused={focused}
                onClick={() => inputRef.current?.focus()}
            >
                {tags.map(tag => (
                    <TagChip
                        key={tag}
                        label={tag}
                        size="md"
                        onRemove={() => removeTag(tag)}
                    />
                ))}
                <TextInput
                    ref={inputRef}
                    value={inputValue}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    autoComplete="off"
                    onChange={e => {
                        setInputValue(e.target.value);
                        setHighlightIdx(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setTimeout(() => setFocused(false), 160)}
                />
            </InputArea>

            {showDropdown && (
                <Dropdown>
                    {filtered.map((s, i) => (
                        <DropdownItem
                            key={s}
                            $highlighted={i === highlightIdx}
                            onMouseDown={e => {
                                e.preventDefault(); // prevent blur
                                addTag(s);
                            }}
                        >
                            {s}
                        </DropdownItem>
                    ))}
                    {inputValue.trim() && !filtered.includes(inputValue.trim()) && !tags.includes(inputValue.trim()) && (
                        <DropdownItem
                            key="__new__"
                            $highlighted={highlightIdx === filtered.length}
                            onMouseDown={e => {
                                e.preventDefault();
                                addTag(inputValue);
                            }}
                        >
                            Utwórz „{inputValue.trim()}"
                        </DropdownItem>
                    )}
                </Dropdown>
            )}

            <Hint>Enter lub przecinek aby dodać · Backspace aby usunąć ostatni</Hint>
        </Wrapper>
    );
};
