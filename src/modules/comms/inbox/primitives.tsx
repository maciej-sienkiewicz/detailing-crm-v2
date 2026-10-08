// src/modules/comms/inbox/primitives.tsx
// Klocki skrzynki „Zapytania" wprost z makiet: okrągły przycisk z ikoną, przycisk
// z obwódką, przycisk z odcieniem, przełącznik widoków i jedyne wypełnienie w oknie
// (FooterPrimary). Jedna definicja na klocek - widok sprawy, poczty i telefonu
// składają się z tych samych.
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { ArrowRight } from 'lucide-react';
import { ix } from './tokens';

const focusRing = css`
    &:focus-visible { outline: 2px solid ${ix.accent}; outline-offset: 2px; }
`;

/** Okrągły przycisk 36 px z obwódką (szukaj, ustawienia, „⋯", archiwum). */
export const IconBtn = styled.button.attrs({ type: 'button' })<{ $size?: number; $active?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: ${p => p.$size ?? 36}px;
    height: ${p => p.$size ?? 36}px;
    padding: 0;
    border: 1px solid ${ix.line};
    border-radius: 999px;
    background: ${p => (p.$active ? ix.surfaceAlt : '#ffffff')};
    color: ${p => (p.$active ? ix.ink : ix.text2)};
    cursor: pointer;
    text-decoration: none;

    svg { width: ${p => ((p.$size ?? 36) >= 44 ? 18 : 16)}px; height: ${p => ((p.$size ?? 36) >= 44 ? 18 : 16)}px; }
    &:hover { background: ${ix.surfaceAlt}; color: ${ix.ink}; }
    &:disabled { opacity: 0.5; cursor: default; }
    ${focusRing}
`;

/** Przycisk z obwódką, bez wypełnienia - „Napisz z AI". */
export const SoftBtn = styled.button.attrs({ type: 'button' })<{ $h?: number }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: none;
    height: ${p => p.$h ?? 40}px;
    padding: 0 ${p => ((p.$h ?? 40) >= 44 ? 16 : 14)}px;
    border: 1px solid ${ix.line};
    border-radius: 999px;
    background: #ffffff;
    color: ${ix.inkSoft};
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;

    svg { width: 16px; height: 16px; color: ${ix.accentInk}; }
    &:hover:not(:disabled) { background: ${ix.surfaceSoft}; }
    &:disabled { opacity: 0.55; cursor: default; }
    ${focusRing}
`;

/** Odcień akcentu z obwódką - akcja dostępna, ale nie krok następny. */
export const TintBtn = styled.button.attrs({ type: 'button' })<{ $h?: number; $block?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex: none;
    height: ${p => p.$h ?? 44}px;
    padding: 0 20px;
    ${p => p.$block && css`width: 100%;`}
    border: 1px solid ${ix.accentLine};
    border-radius: 999px;
    background: ${ix.accentTint};
    color: ${ix.accentInk};
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;

    svg { width: 16px; height: 16px; }
    &:hover:not(:disabled) { border-color: ${ix.accent}; }
    &:disabled { opacity: 0.55; cursor: default; }
    ${focusRing}
`;

/** „Wyślij" w kompozytorze poczty: wypełniona pigułka 40 px z gradientem marki. */
export const PillPrimary = styled.button.attrs({ type: 'button' })`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: none;
    height: 40px;
    padding: 0 18px;
    border: none;
    border-radius: 999px;
    background: ${ix.primaryGradient};
    color: #ffffff;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    transition: transform 150ms;

    svg { width: 16px; height: 16px; }
    &:hover:not(:disabled) { transform: translateY(-1px); }
    &:disabled { opacity: 0.55; cursor: default; transform: none; }
    ${focusRing}
`;

const FpButton = styled.button<{ $block?: boolean; $h: number }>`
    display: flex;
    align-items: center;
    gap: 12px;
    ${p => (p.$block ? css`width: 100%;` : css`align-self: flex-end;`)}
    height: ${p => p.$h}px;
    padding: 0 ${p => (p.$block ? 18 : 20)}px 0 14px;
    border: none;
    border-radius: 16px;
    background: ${ix.primaryGradient};
    color: #ffffff;
    font-family: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    box-shadow: ${ix.primaryShadow};
    transition: transform 150ms;

    .tile {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: none;
        width: 36px;
        height: 36px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.18);
        svg { width: 18px; height: 18px; }
    }
    .lines { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .title { font-size: 15px; font-weight: 600; }
    .hint { font-size: 12px; color: rgba(255, 255, 255, 0.92); }
    .arrow { margin-left: auto; flex: none; width: 18px; height: 18px; transition: transform 200ms; }

    &:hover:not(:disabled) { transform: translateY(-1px); }
    &:hover:not(:disabled) .arrow { transform: translateX(3px); }
    &:disabled { opacity: 0.6; cursor: default; transform: none; }
    ${focusRing}

    @media (max-width: 767px) {
        .title { font-size: 16px; }
    }
`;

interface FooterPrimaryProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
    icon: ReactNode;
    title: ReactNode;
    hint?: ReactNode;
    block?: boolean;
    /** `tel:` - przycisk staje się odnośnikiem i otwiera dialer. */
    href?: string;
}

/**
 * Jedyne wypełnienie w oknie (CLAUDE.md §2): dwie linie - co się stanie i co potem -
 * kafelek ikony, gradient marki, cień w kolorze marki i strzałka reagująca na kursor.
 */
export const FooterPrimary = forwardRef<HTMLButtonElement, FooterPrimaryProps>(
    ({ icon, title, hint, block, href, type = 'button', ...rest }, ref) => {
        const content = (
            <>
                <span className="tile" aria-hidden="true">{icon}</span>
                <span className="lines">
                    <span className="title">{title}</span>
                    {hint && <span className="hint">{hint}</span>}
                </span>
                <ArrowRight className="arrow" aria-hidden="true" />
            </>
        );
        if (href) {
            return (
                <FpButton as="a" href={href} $block={block} $h={60}>
                    {content}
                </FpButton>
            );
        }
        return (
            <FpButton ref={ref} type={type} $block={block} $h={60} {...rest}>
                {content}
            </FpButton>
        );
    }
);
FooterPrimary.displayName = 'FooterPrimary';

const TabList = styled.div<{ $phone?: boolean }>`
    display: ${p => (p.$phone ? 'grid' : 'flex')};
    ${p => p.$phone && css`grid-template-columns: repeat(3, 1fr);`}
    gap: 2px;
    margin: ${p => (p.$phone ? '8px 16px 4px' : '0 16px 6px')};
    padding: 3px;
    border-radius: ${p => (p.$phone ? 14 : 999)}px;
    background: ${ix.surfaceAlt};
`;

const Tab = styled.button<{ $on: boolean; $phone?: boolean }>`
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: ${p => (p.$phone ? 44 : 32)}px;
    padding: 0 6px;
    border: none;
    border-radius: ${p => (p.$phone ? 11 : 999)}px;
    background: ${p => (p.$on ? '#ffffff' : 'transparent')};
    box-shadow: ${p => (p.$on ? '0 1px 2px rgba(15, 23, 42, 0.1)' : 'none')};
    color: ${p => (p.$on ? ix.ink : ix.text2)};
    font-family: inherit;
    font-size: ${p => (p.$phone ? 14 : 13)}px;
    font-weight: ${p => (p.$on ? 600 : 500)};
    white-space: nowrap;
    cursor: pointer;

    .count { font-weight: inherit; }
    &:hover { color: ${ix.ink}; }
    ${focusRing}
`;

export interface TabOption<T extends string> {
    value: T;
    label: string;
    count?: number | null;
    /** Licznik w kolorze akcentu (sprawy czekające na nas) zamiast szarego. */
    countAccent?: boolean;
}

interface TabsProps<T extends string> {
    options: TabOption<T>[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    phone?: boolean;
}

/** Przełącznik widoków skrzynki - pigułka z białym „klawiszem" (stan, nie akcja). */
export function Tabs<T extends string>({ options, value, onChange, label, phone }: TabsProps<T>) {
    return (
        <TabList role="tablist" aria-label={label} $phone={phone}>
            {options.map((option) => (
                <Tab
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={option.value === value}
                    $on={option.value === value}
                    $phone={phone}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                    {option.count != null && option.count > 0 && (
                        <span className="count" style={{ color: option.countAccent ? ix.accentInk : ix.muted }}>
                            {option.count}
                        </span>
                    )}
                </Tab>
            ))}
        </TabList>
    );
}

/** Plakietka stanu w nagłówku rozmowy. */
export const StatusChip = styled.span<{ $tone: 'accent' | 'neutral' | 'ok' }>`
    flex: none;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    ${p =>
        p.$tone === 'accent'
            ? css`background: ${ix.accentTint}; color: ${ix.accentInk};`
            : p.$tone === 'ok'
              ? css`background: ${ix.okTint}; color: ${ix.ok};`
              : css`background: ${ix.surfaceAlt}; color: ${ix.inkSoft};`}
`;

/** Przycisk paska edytora (Aa, zdjęcie, spinacz, formatowanie) - 36 px, bez obwódki. */
export const ToolBtn = styled.button.attrs({ type: 'button' })<{ $on?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex: none;
    height: 36px;
    min-width: 36px;
    padding: 0 8px;
    border: none;
    border-radius: 8px;
    background: ${p => (p.$on ? ix.line : 'transparent')};
    color: ${p => (p.$on ? ix.ink : ix.text2)};
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;

    svg { width: 18px; height: 18px; }
    &:hover:not(:disabled) { background: ${p => (p.$on ? ix.line : ix.surfaceAlt)}; color: ${ix.ink}; }
    &:disabled { opacity: 0.4; cursor: default; }
    ${focusRing}
`;
