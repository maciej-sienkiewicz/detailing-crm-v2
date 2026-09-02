// src/modules/comms/components/RichTextEditor.tsx
// Uproszczony edytor treści wiadomości: pogrubienie, kursywa, podkreślenie,
// przekreślenie, listy i odnośniki. Tyle wystarcza do wyceny i ustaleń z klientem —
// wszystko ponad to (kolory, czcionki, tabele) zamienia mail w ulotkę i psuje się
// w co drugim programie pocztowym.
//
// Pod spodem jest zwykły contentEditable i document.execCommand. Ta para jest
// „przestarzała" od lat, ale każda przeglądarka ją wspiera, a alternatywą byłby
// edytor z dziesiątkami kilobajtów zależności — dla sześciu przycisków. Wyjściowy
// HTML i tak przechodzi przez normalizeComposerHtml, więc różnice między
// przeglądarkami (span ze stylem vs <b>) nie mają znaczenia dla tego, co wychodzi.
//
// Komponent jest niekontrolowany z zewnętrznym „resetem": rodzic dostaje surowy
// innerHTML po każdej zmianie i trzyma go jako wartość; gdy ustawi inną (korekta,
// cofnięcie, wyczyszczenie po wysyłce), podmieniamy zawartość. Dopóki wartość
// odpowiada temu, co jest w DOM, nie dotykamy go — inaczej kursor skakałby na
// początek przy każdym naciśnięciu klawisza.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import {
    Bold,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    RemoveFormatting,
    Strikethrough,
    Underline,
} from 'lucide-react';
import { normalizeComposerHtml, textToComposerHtml } from '../utils/composerHtml';

const Frame = styled.div<{ $focused: boolean }>`
    display: flex;
    flex-direction: column;
    border: 1px solid ${({ $focused, theme }) => ($focused ? '#9ca3af' : theme.colors.border)};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    transition: border-color ${p => p.theme.transitions.fast};
`;

/**
 * Pasek narzędzi NAD treścią, nie pod nią: to, co formatuje, ma być tam, gdzie
 * oko już jest, gdy zaznacza się słowo. Na telefonie przyciski mają 32 px —
 * dolny próg dla palca — i zawijają się zamiast się ściskać.
 */
const Toolbar = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    padding: 4px 6px;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
`;

const ToolButton = styled.button<{ $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: ${p => p.theme.radii.sm};
    background: ${({ $active, theme }) => ($active ? theme.colors.surfaceAlt : 'transparent')};
    color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.textSecondary)};
    cursor: pointer;
    transition: background ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceAlt}; color: ${p => p.theme.colors.text}; }
    &:disabled { opacity: 0.4; cursor: default; }

    svg { width: 16px; height: 16px; }
`;

const Separator = styled.span`
    width: 1px;
    height: 18px;
    margin: 0 4px;
    background: ${p => p.theme.colors.border};
`;

const Editable = styled.div`
    min-height: 96px;
    max-height: 45vh;
    overflow-y: auto;
    padding: 10px 12px;
    font-size: 14px;
    font-family: inherit;
    line-height: 1.5;
    color: ${p => p.theme.colors.text};
    outline: none;
    overflow-wrap: anywhere;
    cursor: text;

    &:empty::before {
        content: attr(data-placeholder);
        color: ${p => p.theme.colors.textMuted};
        pointer-events: none;
    }

    ul, ol { margin: 0.3em 0; padding-left: 1.5em; }
    li { margin: 0.1em 0; }
    a { color: ${p => p.theme.colors.primary}; text-decoration: underline; }
    blockquote {
        margin: 0.4em 0;
        padding-left: 10px;
        border-left: 2px solid ${p => p.theme.colors.border};
        color: ${p => p.theme.colors.textSecondary};
    }
`;

/** Wpisanie adresu odnośnika — na miejscu, zamiast systemowego okienka prompt(). */
const LinkPopover = styled.form`
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1 1 100%;
    padding: 4px 2px 2px;

    input {
        flex: 1;
        min-width: 0;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.sm};
        padding: 6px 8px;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        &:focus { border-color: #9ca3af; }
    }
    button {
        border: 1px solid ${p => p.theme.colors.border};
        background: ${p => p.theme.colors.surface};
        color: ${p => p.theme.colors.textSecondary};
        border-radius: ${p => p.theme.radii.sm};
        padding: 5px 10px;
        font-size: 12px;
        font-family: inherit;
        cursor: pointer;
        &:hover { background: ${p => p.theme.colors.surfaceAlt}; }
    }
    button[type="submit"] {
        background: ${p => p.theme.colors.text};
        border-color: transparent;
        color: #ffffff;
    }
`;

type Command = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList';

const COMMANDS: { command: Command; label: string; shortcut?: string; Icon: typeof Bold }[] = [
    { command: 'bold', label: 'Pogrubienie', shortcut: 'Ctrl+B', Icon: Bold },
    { command: 'italic', label: 'Kursywa', shortcut: 'Ctrl+I', Icon: Italic },
    { command: 'underline', label: 'Podkreślenie', shortcut: 'Ctrl+U', Icon: Underline },
    { command: 'strikeThrough', label: 'Przekreślenie', Icon: Strikethrough },
];

const LIST_COMMANDS: { command: Command; label: string; Icon: typeof Bold }[] = [
    { command: 'insertUnorderedList', label: 'Lista punktowana', Icon: List },
    { command: 'insertOrderedList', label: 'Lista numerowana', Icon: ListOrdered },
];

const withProtocol = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
    return `https://${trimmed}`;
};

interface RichTextEditorProps {
    /** HTML treści; edytor podmienia zawartość tylko wtedy, gdy różni się od DOM. */
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    /** Ctrl/Cmd+Enter. */
    onSubmit?: () => void;
    disabled?: boolean;
    /** Elementy doklejane do paska narzędzi po prawej (np. spinacz załączników). */
    toolbarExtra?: ReactNode;
    /** Pliki upuszczone na obszar edytora — obsługuje rodzic (kompozytor). */
    onDropFiles?: (files: File[]) => void;
}

export function RichTextEditor({
    value,
    onChange,
    placeholder,
    onSubmit,
    disabled,
    toolbarExtra,
    onDropFiles,
}: RichTextEditorProps) {
    const editableRef = useRef<HTMLDivElement>(null);
    const [focused, setFocused] = useState(false);
    const [activeCommands, setActiveCommands] = useState<Set<Command>>(new Set());
    const [linkDraft, setLinkDraft] = useState<string | null>(null);
    // Zaznaczenie znika, gdy fokus przechodzi do pola adresu — zapamiętujemy je,
    // żeby odnośnik trafił tam, gdzie użytkownik zaznaczył, a nie na koniec.
    const savedRange = useRef<Range | null>(null);

    // useLayoutEffect: zawartość ma być na miejscu przed pierwszym malowaniem,
    // inaczej placeholder mignąłby nad przywróconą treścią.
    useLayoutEffect(() => {
        const element = editableRef.current;
        if (element && element.innerHTML !== value) element.innerHTML = value;
    }, [value]);

    const refreshActive = useCallback(() => {
        if (typeof document === 'undefined' || !document.queryCommandState) return;
        const next = new Set<Command>();
        [...COMMANDS, ...LIST_COMMANDS].forEach(({ command }) => {
            try {
                if (document.queryCommandState(command)) next.add(command);
            } catch {
                /* przeglądarka bez wsparcia — przycisk po prostu nie podświetla się */
            }
        });
        setActiveCommands(next);
    }, []);

    useEffect(() => {
        if (!focused) return;
        document.addEventListener('selectionchange', refreshActive);
        return () => document.removeEventListener('selectionchange', refreshActive);
    }, [focused, refreshActive]);

    const emit = useCallback(() => {
        const element = editableRef.current;
        if (element) onChange(element.innerHTML);
    }, [onChange]);

    const exec = useCallback(
        (command: string, argument?: string) => {
            editableRef.current?.focus();
            document.execCommand(command, false, argument);
            emit();
            refreshActive();
        },
        [emit, refreshActive]
    );

    const openLink = () => {
        const selection = window.getSelection();
        savedRange.current = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        const anchor = savedRange.current?.startContainer.parentElement?.closest('a');
        setLinkDraft(anchor?.getAttribute('href') ?? '');
    };

    const applyLink = () => {
        const href = withProtocol(linkDraft ?? '');
        const range = savedRange.current;
        editableRef.current?.focus();
        if (range) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
        if (!href) {
            document.execCommand('unlink');
        } else if (range && range.collapsed) {
            // Bez zaznaczenia wstawiamy sam adres jako tekst odnośnika.
            const anchor = `<a href="${href.replace(/"/g, '&quot;')}">${href.replace(/</g, '&lt;')}</a>`;
            document.execCommand('insertHTML', false, anchor);
        } else {
            document.execCommand('createLink', false, href);
        }
        setLinkDraft(null);
        emit();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const meta = event.metaKey || event.ctrlKey;
        if (!meta) return;
        if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit?.();
            return;
        }
        const key = event.key.toLowerCase();
        if (key === 'k') {
            event.preventDefault();
            openLink();
        }
        // b/i/u obsługuje sama przeglądarka; dbamy tylko o podświetlenie przycisku.
        if (key === 'b' || key === 'i' || key === 'u') setTimeout(() => { emit(); refreshActive(); }, 0);
    };

    /**
     * Wklejanie: HTML z innej wiadomości czy dokumentu przechodzi przez tę samą
     * normalizację co wysyłka — zostają pogrubienia i listy, odpadają czcionki,
     * kolory i tabele. Czysty tekst dostaje po <div> na wiersz.
     */
    const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
        // Zrzut ekranu ze schowka to załącznik, nie treść — obsługuje go kompozytor.
        if (event.clipboardData.files.length > 0) return;
        const html = event.clipboardData.getData('text/html');
        const text = event.clipboardData.getData('text/plain');
        if (!html && !text) return;
        event.preventDefault();
        const fragment = html ? normalizeComposerHtml(html) : textToComposerHtml(text);
        document.execCommand('insertHTML', false, fragment || textToComposerHtml(text));
        emit();
    };

    return (
        <Frame $focused={focused}>
            <Toolbar role="toolbar" aria-label="Formatowanie">
                {COMMANDS.map(({ command, label, shortcut, Icon }) => (
                    <ToolButton
                        key={command}
                        type="button"
                        $active={activeCommands.has(command)}
                        aria-pressed={activeCommands.has(command)}
                        aria-label={label}
                        title={shortcut ? `${label} (${shortcut})` : label}
                        disabled={disabled}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => exec(command)}
                    >
                        <Icon />
                    </ToolButton>
                ))}
                <Separator />
                {LIST_COMMANDS.map(({ command, label, Icon }) => (
                    <ToolButton
                        key={command}
                        type="button"
                        $active={activeCommands.has(command)}
                        aria-pressed={activeCommands.has(command)}
                        aria-label={label}
                        title={label}
                        disabled={disabled}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => exec(command)}
                    >
                        <Icon />
                    </ToolButton>
                ))}
                <Separator />
                <ToolButton
                    type="button"
                    $active={linkDraft !== null}
                    aria-label="Odnośnik"
                    title="Wstaw odnośnik (Ctrl+K)"
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => (linkDraft === null ? openLink() : setLinkDraft(null))}
                >
                    <LinkIcon />
                </ToolButton>
                <ToolButton
                    type="button"
                    aria-label="Usuń formatowanie"
                    title="Usuń formatowanie z zaznaczenia"
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => { exec('removeFormat'); exec('unlink'); }}
                >
                    <RemoveFormatting />
                </ToolButton>
                {toolbarExtra && <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 2 }}>{toolbarExtra}</span>}

                {linkDraft !== null && (
                    <LinkPopover
                        onSubmit={(event) => { event.preventDefault(); applyLink(); }}
                    >
                        <input
                            autoFocus
                            value={linkDraft}
                            onChange={(event) => setLinkDraft(event.target.value)}
                            placeholder="https://adres.pl"
                            aria-label="Adres odnośnika"
                            onKeyDown={(event) => { if (event.key === 'Escape') setLinkDraft(null); }}
                        />
                        <button type="submit">{linkDraft.trim() ? 'Wstaw' : 'Usuń'}</button>
                        <button type="button" onClick={() => setLinkDraft(null)}>Anuluj</button>
                    </LinkPopover>
                )}
            </Toolbar>
            <Editable
                ref={editableRef}
                contentEditable={!disabled}
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-label={placeholder}
                data-placeholder={placeholder}
                onInput={emit}
                onKeyDown={handleKeyDown}
                onKeyUp={refreshActive}
                onMouseUp={refreshActive}
                onPaste={handlePaste}
                onFocus={() => { setFocused(true); refreshActive(); }}
                onBlur={() => setFocused(false)}
                onDragOver={(event) => { if (onDropFiles && event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
                onDrop={(event) => {
                    if (!onDropFiles || event.dataTransfer.files.length === 0) return;
                    event.preventDefault();
                    // Rodzic z własną strefą zrzutu nie ma dostać tych samych plików drugi raz.
                    event.stopPropagation();
                    onDropFiles(Array.from(event.dataTransfer.files));
                }}
            />
        </Frame>
    );
}
