// src/modules/comms/components/SignatureSettingsModal.tsx
// Stopka zalogowanego użytkownika: kreator z pięcioma motywami albo zwykły tekst.
//
// Stopka należy do osoby, nie do studia: z jednej skrzynki (biuro@…) odpisuje kilka
// osób i każda podpisuje się własnym nazwiskiem i telefonem. Backend trzyma ją per
// użytkownik i sam dokleja przy wysyłce - tu powstaje jej treść i decyzja, czy
// przełącznik „Dodaj stopkę" ma startować włączony.
//
// Kreator renderuje HTML motywu tym samym kodem, który rysuje podgląd
// (utils/signatureTemplates.ts), i wysyła na serwer oba: HTML do wysyłki i projekt do
// ponownej edycji. Stopka tekstowa zostaje dla tych, którzy wolą cztery linijki bez
// ramek - i dla stopek zapisanych, zanim kreator powstał.
import { useCallback, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, ImageIcon, LayoutTemplate, Loader2, Trash2, Type, X } from 'lucide-react';
import { ModalFooter, ModalHeader, ModalShell, ModalSubtitle, ModalTitle, ModalTitleGroup } from '@/common/components/ModalKit';
import { ModalCloseButton } from '@/common/styles';
import { useToast } from '@/common/components/Toast';
import { apiErrorMessage } from '@/modules/visits/api/apiError';
import {
    useCopyCompanyLogoToSignature,
    useDeleteMailSignature,
    useMailSignature,
    useSaveMailSignature,
} from '../hooks/useComms';
import type { MailSignature } from '../types';
import { IconButton, PrimaryButton } from './shared';
import { signatureHtmlToText, signatureTextToHtml } from '../utils/signatureText';
import {
    createSignatureDesign,
    getSignatureTemplate,
    isHexColor,
    isSignatureDesignComplete,
    missingImages,
    renderSignature,
    signatureScale,
    withImagePlaceholders,
    type SignatureDesign,
    type SignatureTemplateId,
} from '../utils/signatureTemplates';
import { appAssetUrl } from '../utils/signatureImage';
import { SignaturePreview } from './signature/SignaturePreview';
import { DetailsStep, ImagesStep, SocialStep, StyleStep, TemplateStep } from './signature/SignatureSteps';
import { SIGNATURE_STEPS, type SignatureStepId } from './signature/designerSteps';
import { PillSwitch, StepHeader, StepHint, StepIcon, StepTitle, TextArea, brandTint } from './signature/designerStyles';

// ── Układ okna ───────────────────────────────────────────────────────────────

const Layout = styled.div`
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 480px) minmax(0, 1fr);

    /* Na wąskim ekranie kolumny idą jedna pod drugą i przewija się całość. Wiersze muszą
       mieć wysokość treści: przy domyślnym rozciąganiu panel dostawał ułamek okna, a jego
       treść wychodziła na podgląd. */
    @media (max-width: 960px) {
        grid-template-columns: minmax(0, 1fr);
        grid-auto-rows: max-content;
        overflow-y: auto;
        overscroll-behavior: contain;
    }
`;

const Panel = styled.div`
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid ${p => p.theme.colors.border};

    @media (max-width: 960px) {
        min-height: auto;
        border-right: 0;
        border-bottom: 1px solid ${p => p.theme.colors.border};
    }
`;

/**
 * Tryb stopki: motyw graficzny albo zwykły tekst. Przełącznik segmentowy, a nie link -
 * to równorzędny wybór, nie poboczna ścieżka. Aktywny segment to biała „karta" na
 * szarym tle, bez wypełnienia kolorem (jedno wypełnienie na okno: „Zapisz stopkę").
 */
const ModeSwitch = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    margin: 16px 24px 4px;
    padding: 4px;
    border-radius: ${p => p.theme.radii.lg};
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};
    flex-shrink: 0;

    /* Laptop z powiększeniem przeglądarki: każdy piksel stałej ramy zabiera miejsce
       treści kroku, która przy ~530 px wysokości miała niecałe 150 px. */
    @media (max-height: 760px) {
        margin: 10px 24px 0;
        padding: 3px;
        button { padding-top: 5px; padding-bottom: 5px; }
    }
`;

const ModeOption = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 10px;
    border: 0;
    border-radius: ${p => p.theme.radii.md};
    white-space: nowrap;
    background: ${p => (p.$active ? p.theme.colors.surface : 'transparent')};
    box-shadow: ${p => (p.$active ? '0 1px 2px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.04)' : 'none')};
    color: ${p => (p.$active ? p.theme.colors.text : p.theme.colors.textSecondary)};
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => (p.$active ? p.theme.fontWeights.semibold : p.theme.fontWeights.medium)};
    cursor: pointer;
    transition: background ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast};

    svg { width: 15px; height: 15px; color: ${p => (p.$active ? 'var(--brand-primary)' : 'currentColor')}; }
    &:hover { color: ${p => p.theme.colors.text}; }
`;

const PreviewHint = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: ${p => p.theme.radii.md};
    border: 1px dashed ${p => p.theme.colors.border};
    background: ${p => p.theme.colors.surface};
    font-size: 13px;
    color: ${p => p.theme.colors.textSecondary};

    > svg { flex-shrink: 0; width: 16px; height: 16px; color: ${p => p.theme.colors.textMuted}; }
    > span { flex: 1; }
`;

const Tabs = styled.nav`
    display: flex;
    gap: 2px;
    padding: 0 16px;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    overflow-x: auto;
    flex-shrink: 0;
`;

/** Aktywny krok: podkreślenie i odcień marki - bez wypełnienia (jedno wypełnienie na okno). */
const Tab = styled.button<{ $active: boolean; $done: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 12px 8px;
    border: 0;
    border-bottom: 2px solid ${p => (p.$active ? 'var(--brand-primary)' : 'transparent')};
    background: none;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => (p.$active ? p.theme.fontWeights.semibold : p.theme.fontWeights.medium)};
    color: ${p => (p.$active ? p.theme.colors.text : p.theme.colors.textSecondary)};
    white-space: nowrap;
    cursor: pointer;

    span {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        border: 1px solid ${p => (p.$active || p.$done ? 'var(--brand-primary)' : p.theme.colors.border)};
        background: ${p => (p.$active ? brandTint(14) : p.theme.colors.surface)};
        color: ${p => (p.$active || p.$done ? 'var(--brand-primary)' : p.theme.colors.textMuted)};
    }
`;

const PanelBody = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 22px 24px 28px;

    @media (max-width: 960px) {
        overflow: visible;
    }
`;

const PanelNav = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 24px;
    border-top: 1px solid ${p => p.theme.colors.border};
    flex-shrink: 0;

    @media (max-height: 760px) {
        padding: 8px 24px;
    }
`;

/** Podtytuł to kontekst na pierwsze otwarcie - na niskim ekranie ustępuje miejsca treści. */
const Subtitle = styled(ModalSubtitle)`
    @media (max-height: 760px) {
        display: none;
    }
`;

const Stage = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 22px 28px 28px;
    background: ${p => p.theme.colors.surfaceAlt};

    @media (max-width: 960px) {
        overflow: visible;
    }
`;

const StageHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    h3 {
        margin: 0;
        font-size: 15px;
        font-weight: ${p => p.theme.fontWeights.semibold};
        color: ${p => p.theme.colors.text};
    }
`;

const FooterStart = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    margin-right: auto;
    flex-wrap: wrap;
`;

const Loading = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 64px;
    color: ${p => p.theme.colors.textMuted};

    .spin { animation: sig-spin 0.9s linear infinite; }
    @keyframes sig-spin { to { transform: rotate(360deg); } }
`;

const TextEditor = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

// ── Stan początkowy ──────────────────────────────────────────────────────────

/** Kolor marki studia (ustawienia wyglądu) jako podpowiedź koloru przewodniego. */
const readBrandColor = (): string | null => {
    if (typeof window === 'undefined') return null;
    const value = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim().toLowerCase();
    return isHexColor(value) ? value : null;
};

type Mode = 'design' | 'text';

interface DesignerProps {
    signature: MailSignature;
    onClose: () => void;
}

function SignatureDesigner({ signature, onClose }: DesignerProps) {
    const saveSignature = useSaveMailSignature();
    const deleteSignature = useDeleteMailSignature();
    const copyCompanyLogo = useCopyCompanyLogoToSignature();
    const { showSuccess, showError } = useToast();

    const [brandColor] = useState(readBrandColor);
    // Okno montuje się przy otwarciu (key w rodzicu), więc stan startowy bierzemy raz.
    // Zapisana stopka tekstowa otwiera się jako tekst - kreator nie może jej po cichu
    // zastąpić motywem przy pierwszym „Zapisz".
    const [mode, setMode] = useState<Mode>(() =>
        !signature.design && signature.bodyHtml ? 'text' : 'design'
    );
    // Projekt sprzed suwaka rozmiaru ma tylko „wielkość tekstu" - tłumaczymy ją na rozmiar,
    // żeby suwak startował tam, gdzie stopka faktycznie jest.
    const [design, setDesign] = useState<SignatureDesign>(() =>
        signature.design
            ? { ...signature.design, scale: signatureScale(signature.design), size: 'm' }
            : createSignatureDesign(signature.defaults, brandColor ?? undefined)
    );
    const [text, setText] = useState(() => (signature.design ? '' : signatureHtmlToText(signature.bodyHtml)));
    const [enabledByDefault, setEnabledByDefault] = useState(signature.bodyHtml ? signature.enabledByDefault : true);
    const [step, setStep] = useState<SignatureStepId>('template');
    const [dark, setDark] = useState(false);
    const [nameInvalid, setNameInvalid] = useState(false);
    const logoAutofillTried = useRef(false);

    const patch = useCallback((changes: Partial<SignatureDesign>) => {
        setDesign(prev => ({ ...prev, ...changes }));
        if ('fullName' in changes) setNameInvalid(false);
    }, []);

    const iconsBaseUrl = useMemo(() => appAssetUrl(signature.iconsPath), [signature.iconsPath]);

    // Zapisywany HTML i podgląd różnią się wyłącznie zastępczymi obrazkami: podgląd pokazuje
    // miejsce na zdjęcie i logo, którego motyw jeszcze nie ma, zapis - nic w tym miejscu.
    const html = useMemo(
        () => (isHexColor(design.color) ? renderSignature(design, iconsBaseUrl) : null),
        [design, iconsBaseUrl]
    );
    const previewHtml = useMemo(
        () => (isHexColor(design.color) ? renderSignature(withImagePlaceholders(design), iconsBaseUrl) : null),
        [design, iconsBaseUrl]
    );
    const missing = missingImages(design);
    const placeholderHint =
        missing.length === 2 ? 'Szare pola to miejsca na zdjęcie i logo - bez nich stopka wyjdzie bez tych elementów.'
            : missing[0] === 'photoUrl' ? 'Szare koło to miejsce na zdjęcie - bez niego stopka wyjdzie bez zdjęcia.'
                : 'Szare pole to miejsce na logo - bez niego stopka wyjdzie bez logo.';

    /**
     * Pierwszy wybór motywu z logo podstawia logo studia z ustawień firmy - to samo, które
     * jest na protokołach. Raz: użytkownik, który je usunął, nie chce go z powrotem.
     */
    const selectTemplate = (id: SignatureTemplateId) => {
        patch({ template: id });
        const wantsLogo = getSignatureTemplate(id).images.includes('logoUrl');
        if (!wantsLogo || design.logoUrl || !signature.defaults.hasCompanyLogo || logoAutofillTried.current) return;
        logoAutofillTried.current = true;
        copyCompanyLogo.mutate(undefined, {
            onSuccess: url => setDesign(prev => (prev.logoUrl ? prev : { ...prev, logoUrl: url })),
        });
    };

    const stepIndex = SIGNATURE_STEPS.findIndex(s => s.id === step);

    const submit = () => {
        const onError = (error: unknown) =>
            showError('Nie udało się zapisać stopki', apiErrorMessage(error, 'Spróbuj ponownie za chwilę'));
        const onSuccess = () => {
            showSuccess('Stopka zapisana', 'Dołączysz ją przełącznikiem przy wysyłce');
            onClose();
        };

        if (mode === 'text') {
            if (!text.trim()) return;
            saveSignature.mutate({ bodyHtml: signatureTextToHtml(text), enabledByDefault, design: null }, { onSuccess, onError });
            return;
        }
        if (!isSignatureDesignComplete(design)) {
            setNameInvalid(true);
            setStep('details');
            showError('Uzupełnij imię i nazwisko', 'To nagłówek każdego motywu stopki');
            return;
        }
        if (!html) {
            setStep('style');
            showError('Nieprawidłowy kolor', 'Podaj kolor w postaci #RRGGBB');
            return;
        }
        saveSignature.mutate({ bodyHtml: html, enabledByDefault, design }, { onSuccess, onError });
    };

    const remove = () =>
        deleteSignature.mutate(undefined, {
            onSuccess: () => {
                showSuccess('Stopka usunięta');
                onClose();
            },
        });

    const hasSaved = Boolean(signature.bodyHtml);
    const canSave = mode === 'text' ? Boolean(text.trim()) : true;

    return (
        <>
            <Layout>
                <Panel>
                    <ModeSwitch role="radiogroup" aria-label="Rodzaj stopki">
                        <ModeOption
                            type="button"
                            role="radio"
                            aria-checked={mode === 'design'}
                            $active={mode === 'design'}
                            onClick={() => setMode('design')}
                        >
                            <LayoutTemplate /> Motyw graficzny
                        </ModeOption>
                        <ModeOption
                            type="button"
                            role="radio"
                            aria-checked={mode === 'text'}
                            $active={mode === 'text'}
                            onClick={() => setMode('text')}
                        >
                            <Type /> Zwykły tekst
                        </ModeOption>
                    </ModeSwitch>
                    {mode === 'design' ? (
                        <>
                            <Tabs aria-label="Kroki kreatora stopki">
                                {SIGNATURE_STEPS.map((s, index) => (
                                    <Tab
                                        key={s.id}
                                        type="button"
                                        $active={s.id === step}
                                        $done={index < stepIndex}
                                        aria-current={s.id === step ? 'step' : undefined}
                                        onClick={() => setStep(s.id)}
                                    >
                                        <span>{index + 1}</span>{s.label}
                                    </Tab>
                                ))}
                            </Tabs>
                            <PanelBody>
                                {step === 'template' && (
                                    <TemplateStep
                                        design={design}
                                        iconsBaseUrl={iconsBaseUrl}
                                        onSelect={selectTemplate}
                                    />
                                )}
                                {step === 'details' && <DetailsStep design={design} onChange={patch} nameInvalid={nameInvalid} />}
                                {step === 'style' && (
                                    <StyleStep
                                        design={design}
                                        onChange={patch}
                                        brandColor={brandColor}
                                        iconsBaseUrl={iconsBaseUrl}
                                    />
                                )}
                                {step === 'images' && (
                                    <ImagesStep
                                        design={design}
                                        onChange={patch}
                                        companyLogoAvailable={signature.defaults.hasCompanyLogo}
                                    />
                                )}
                                {step === 'social' && <SocialStep design={design} onChange={patch} />}
                            </PanelBody>
                            <PanelNav>
                                <IconButton
                                    type="button"
                                    onClick={() => setStep(SIGNATURE_STEPS[stepIndex - 1].id)}
                                    disabled={stepIndex === 0}
                                >
                                    <ArrowLeft /> Wstecz
                                </IconButton>
                                {stepIndex < SIGNATURE_STEPS.length - 1 && (
                                    <IconButton type="button" onClick={() => setStep(SIGNATURE_STEPS[stepIndex + 1].id)}>
                                        Dalej <ArrowRight />
                                    </IconButton>
                                )}
                            </PanelNav>
                        </>
                    ) : (
                        <PanelBody>
                            <TextEditor>
                                <StepHeader>
                                    <StepIcon><Type /></StepIcon>
                                    <div>
                                        <StepTitle>Stopka tekstowa</StepTitle>
                                        <StepHint>Każda linia to osobny wiersz stopki. Bez ramek, zdjęć i kolorów.</StepHint>
                                    </div>
                                </StepHeader>
                                <TextArea
                                    value={text}
                                    onChange={event => setText(event.target.value)}
                                    placeholder={'Jan Kowalski\nTwojaFirma\n123 123 123'}
                                    aria-label="Treść stopki"
                                    rows={8}
                                />
                            </TextEditor>
                        </PanelBody>
                    )}
                </Panel>

                <Stage>
                    <StageHead>
                        <h3>Podgląd na żywo</h3>
                        <PillSwitch type="button" role="switch" aria-checked={dark} $on={dark} onClick={() => setDark(!dark)}>
                            <span className="track"><span className="knob" /></span>
                            Ciemne tło
                        </PillSwitch>
                    </StageHead>
                    <SignaturePreview html={mode === 'design' ? previewHtml ?? '' : null} text={text} dark={dark} />
                    {mode === 'design' && missing.length > 0 && (
                        <PreviewHint>
                            <ImageIcon />
                            <span>{placeholderHint}</span>
                            {step !== 'images' && (
                                <IconButton type="button" onClick={() => setStep('images')}>
                                    {missing.length === 2 ? 'Dodaj zdjęcie i logo' : missing[0] === 'photoUrl' ? 'Dodaj zdjęcie' : 'Dodaj logo'}
                                </IconButton>
                            )}
                        </PreviewHint>
                    )}
                </Stage>
            </Layout>

            <ModalFooter>
                <FooterStart>
                    {hasSaved && (
                        <IconButton type="button" onClick={remove} disabled={deleteSignature.isPending}>
                            <Trash2 /> Usuń stopkę
                        </IconButton>
                    )}
                    <PillSwitch
                        type="button"
                        role="switch"
                        aria-checked={enabledByDefault}
                        $on={enabledByDefault}
                        onClick={() => setEnabledByDefault(!enabledByDefault)}
                        title="Czy przełącznik „Dodaj stopkę” przy nowej wiadomości ma startować włączony"
                    >
                        <span className="track"><span className="knob" /></span>
                        Dołączaj stopkę domyślnie
                    </PillSwitch>
                </FooterStart>
                <PrimaryButton type="button" onClick={submit} disabled={saveSignature.isPending || !canSave}>
                    {saveSignature.isPending ? 'Zapisywanie…' : 'Zapisz stopkę'}
                </PrimaryButton>
            </ModalFooter>
        </>
    );
}

interface SignatureSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SignatureSettingsModal({ isOpen, onClose }: SignatureSettingsModalProps) {
    const { data: signature, isError } = useMailSignature();

    return (
        // Zamknięcie Escape'em albo kliknięciem w tło zgubiłoby kilka minut konfiguracji,
        // a Escape w oknie kadru zamykałby oba okna naraz - dlatego tylko krzyżyk.
        <ModalShell isOpen={isOpen} onClose={onClose} size="full" fillHeight dismissible={false}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Twoja stopka e-mail</ModalTitle>
                    <Subtitle>
                        Przypisana do Ciebie, nie do skrzynki - inne osoby w studiu podpisują się własną.
                    </Subtitle>
                </ModalTitleGroup>
                <ModalCloseButton type="button" onClick={onClose} aria-label="Zamknij">
                    <X />
                </ModalCloseButton>
            </ModalHeader>
            {signature ? (
                <SignatureDesigner signature={signature} onClose={onClose} />
            ) : (
                <Loading>{isError ? 'Nie udało się wczytać stopki' : <Loader2 className="spin" />}</Loading>
            )}
        </ModalShell>
    );
}
