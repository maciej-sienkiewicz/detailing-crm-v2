// src/modules/comms/components/signature/SignatureSteps.tsx
// Kroki kreatora stopki. Każdy krok pyta tylko o to, co pokazuje wybrany motyw -
// pola, których motyw nie rysuje, nie pojawiają się w formularzu.
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Check, ImageIcon, LayoutTemplate, Palette, Share2, UserRound } from 'lucide-react';
import {
    SIGNATURE_FONTS,
    SIGNATURE_LOGO_PLACEHOLDER,
    SIGNATURE_PHOTO_PLACEHOLDER,
    SIGNATURE_ICON_STYLES,
    SIGNATURE_SCALE,
    SIGNATURE_SOCIAL_FIELDS,
    SIGNATURE_SOCIAL_KEYS,
    SIGNATURE_SWATCHES,
    SIGNATURE_TEMPLATES,
    SIGNATURE_TEXT_FIELDS,
    getSignatureTemplate,
    isHexColor,
    renderSignature,
    signatureScale,
    type SignatureDesign,
    type SignatureTemplateId,
    type SignatureTextKey,
} from '../../utils/signatureTemplates';
import { SignatureImageField } from './SignatureImageField';
import { SignatureThumbnail } from './SignaturePreview';
import {
    Choice,
    Field,
    FieldGrid,
    FieldLabel,
    Group,
    GroupTitle,
    Help,
    Input,
    Note,
    Segmented,
    StepHeader,
    StepHint,
    StepIcon,
    StepTitle,
    TextArea,
    brandTint,
} from './designerStyles';

type Patch = (patch: Partial<SignatureDesign>) => void;

const Step = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

function Header({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
    return (
        <StepHeader>
            <StepIcon>{icon}</StepIcon>
            <div>
                <StepTitle>{title}</StepTitle>
                {hint && <StepHint>{hint}</StepHint>}
            </div>
        </StepHeader>
    );
}

// ── 1. Motyw ────────────────────────────────────────────────────────────────

const TemplateGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;

    @media (max-width: 480px) {
        grid-template-columns: minmax(0, 1fr);
    }
`;

const TemplateCard = styled.button<{ $active: boolean }>`
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 0;
    border-radius: ${p => p.theme.radii.lg};
    border: 1px solid ${p => (p.$active ? 'var(--brand-primary)' : p.theme.colors.border)};
    box-shadow: ${p => (p.$active ? `0 0 0 3px ${brandTint(18)}` : 'none')};
    background: #ffffff;
    overflow: hidden;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    transition: border-color ${p => p.theme.transitions.fast}, box-shadow ${p => p.theme.transitions.fast};

    &:hover { border-color: var(--brand-primary); }
`;

const CardCaption = styled.span<{ $active: boolean }>`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px 12px;
    border-top: 1px solid ${p => p.theme.colors.border};
    background: ${p => (p.$active ? brandTint(8) : p.theme.colors.surfaceHover)};

    strong { font-size: 13px; color: ${p => p.theme.colors.text}; }
    small { font-size: 12px; line-height: 1.35; color: ${p => p.theme.colors.textSecondary}; }
`;

const Tick = styled.span`
    position: absolute;
    top: 8px;
    right: 8px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border: 1px solid var(--brand-primary);
    color: var(--brand-primary);

    svg { width: 13px; height: 13px; }
`;

export function TemplateStep({ design, iconsBaseUrl, onSelect }: {
    design: SignatureDesign;
    iconsBaseUrl: string;
    onSelect: (id: SignatureTemplateId) => void;
}) {
    // Miniatury ZAWSZE na zastępczych obrazkach, także gdy zdjęcie i logo są już wgrane.
    // Miniatura pokazuje układ motywu; prawdziwy obrazek doczytuje się po chwili i zmienia
    // wymiary karty, więc przy przeklikiwaniu motywów kafelki przeskakiwały.
    const sample: SignatureDesign = {
        ...design,
        fullName: design.fullName?.trim() || 'Anna Kowalska',
        photoUrl: SIGNATURE_PHOTO_PLACEHOLDER,
        logoUrl: SIGNATURE_LOGO_PLACEHOLDER,
        disclaimer: null,
    };
    return (
        <Step>
            <Header icon={<LayoutTemplate />} title="Wybierz motyw" />
            <TemplateGrid>
                {SIGNATURE_TEMPLATES.map(template => {
                    const active = template.id === design.template;
                    return (
                        <TemplateCard
                            key={template.id}
                            type="button"
                            $active={active}
                            aria-pressed={active}
                            onClick={() => onSelect(template.id)}
                            // Kliknięcie myszą nie przenosi fokusu na kafelek: przeglądarka
                            // przewijała wtedy listę tak, żeby cały kafelek był widoczny,
                            // i kolumna podskakiwała pod kursorem. Klawiatura (Tab) działa dalej.
                            onMouseDown={event => event.preventDefault()}
                        >
                            <SignatureThumbnail html={renderSignature({ ...sample, template: template.id }, iconsBaseUrl)} />
                            <CardCaption $active={active}>
                                <strong>{template.name}</strong>
                                <small>{template.description}</small>
                            </CardCaption>
                            {active && <Tick><Check /></Tick>}
                        </TemplateCard>
                    );
                })}
            </TemplateGrid>
        </Step>
    );
}

// ── 2. Dane ─────────────────────────────────────────────────────────────────

const WIDE_FIELDS: SignatureTextKey[] = ['fullName', 'address', 'disclaimer'];

export function DetailsStep({ design, onChange, nameInvalid }: {
    design: SignatureDesign;
    onChange: Patch;
    nameInvalid: boolean;
}) {
    const template = getSignatureTemplate(design.template);
    return (
        <Step>
            <Header
                icon={<UserRound />}
                title="Twoje dane"
                hint="Puste pola po prostu nie pojawią się w stopce."
            />
            <FieldGrid>
                {template.fields.map(key => {
                    const def = SIGNATURE_TEXT_FIELDS[key];
                    const invalid = key === 'fullName' && nameInvalid;
                    const common = {
                        id: `signature-${key}`,
                        name: key,
                        value: design[key] ?? '',
                        placeholder: def.placeholder,
                        $invalid: invalid,
                        'aria-invalid': invalid || undefined,
                    };
                    return (
                        <Field key={key} $wide={WIDE_FIELDS.includes(key)}>
                            <FieldLabel>{def.label}{def.required && <em> *</em>}</FieldLabel>
                            {def.type === 'textarea' ? (
                                <TextArea {...common} rows={3} onChange={event => onChange({ [key]: event.target.value })} />
                            ) : (
                                <Input
                                    {...common}
                                    type={def.type}
                                    autoComplete={def.autoComplete ?? 'off'}
                                    onChange={event => onChange({ [key]: event.target.value })}
                                />
                            )}
                            {invalid && <Help style={{ color: '#dc2626' }}>Imię i nazwisko jest nagłówkiem każdego motywu</Help>}
                        </Field>
                    );
                })}
            </FieldGrid>
        </Step>
    );
}

// ── 3. Styl ─────────────────────────────────────────────────────────────────

const Swatches = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
`;

const Swatch = styled.button<{ $color: string; $active: boolean }>`
    width: 30px;
    height: 30px;
    padding: 0;
    border-radius: ${p => p.theme.radii.md};
    border: 2px solid ${p => (p.$active ? p.theme.colors.text : 'transparent')};
    box-shadow: inset 0 0 0 2px #ffffff;
    background: ${p => p.$color};
    cursor: pointer;
`;

const ColorInputs = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;

    input[type='color'] {
        width: 38px;
        height: 34px;
        padding: 2px;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        background: #ffffff;
        cursor: pointer;
    }
`;

const ScaleHead = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;

    button { padding: 4px 10px; font-size: 12px; }
`;

const ScaleValue = styled.span`
    margin-right: auto;
    min-width: 42px;
    padding: 2px 8px;
    border-radius: ${p => p.theme.radii.full};
    background: ${p => p.theme.colors.surfaceAlt};
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: ${p => p.theme.colors.textSecondary};
`;

/**
 * Suwak rozmiaru całej stopki. Zastąpił „Wielkość tekstu" (Mała/Średnia/Duża), która
 * skalowała samo pismo - przy dużym zdjęciu i banerze stopka zostawała za duża.
 */
const ScaleRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};

    input {
        flex: 1;
        min-width: 0;
        accent-color: var(--brand-primary);
        cursor: pointer;
    }
`;

const FontGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;

    button { justify-content: flex-start; font-size: 14px; }
`;

export function StyleStep({ design, onChange, brandColor, iconsBaseUrl }: {
    design: SignatureDesign;
    onChange: Patch;
    brandColor: string | null;
    iconsBaseUrl: string;
}) {
    const template = getSignatureTemplate(design.template);
    const scale = signatureScale(design);
    const swatches = brandColor && !SIGNATURE_SWATCHES.includes(brandColor)
        ? [brandColor, ...SIGNATURE_SWATCHES]
        : SIGNATURE_SWATCHES;
    return (
        <Step>
            <Header icon={<Palette />} title="Styl" hint="Kolor przewodni, rozmiar stopki i czcionka." />

            <Group>
                <GroupTitle>Kolor przewodni</GroupTitle>
                <Swatches>
                    {swatches.map(color => (
                        <Swatch
                            key={color}
                            type="button"
                            $color={color}
                            $active={design.color.toLowerCase() === color.toLowerCase()}
                            onClick={() => onChange({ color })}
                            title={color === brandColor ? `Kolor Twojej marki (${color})` : color}
                            aria-label={color === brandColor ? 'Kolor Twojej marki' : `Kolor ${color}`}
                        />
                    ))}
                </Swatches>
                <ColorInputs>
                    <input
                        type="color"
                        value={isHexColor(design.color) ? design.color : '#000000'}
                        onChange={event => onChange({ color: event.target.value })}
                        aria-label="Własny kolor"
                    />
                    <Input
                        style={{ maxWidth: 120 }}
                        value={design.color}
                        maxLength={7}
                        onChange={event => onChange({ color: event.target.value.trim() })}
                        $invalid={!isHexColor(design.color)}
                        aria-label="Kolor w zapisie szesnastkowym"
                    />
                </ColorInputs>
            </Group>

            <Group>
                <ScaleHead>
                    <GroupTitle>Rozmiar stopki</GroupTitle>
                    <ScaleValue>{scale}%</ScaleValue>
                    {scale !== SIGNATURE_SCALE.default && (
                        <Choice type="button" $active={false} onClick={() => onChange({ scale: SIGNATURE_SCALE.default })}>
                            Przywróć 100%
                        </Choice>
                    )}
                </ScaleHead>
                <ScaleRow>
                    <span aria-hidden="true">Mniejsza</span>
                    <input
                        type="range"
                        min={SIGNATURE_SCALE.min}
                        max={SIGNATURE_SCALE.max}
                        step={SIGNATURE_SCALE.step}
                        value={scale}
                        onChange={event => onChange({ scale: Number(event.target.value), size: 'm' })}
                        aria-label="Rozmiar stopki"
                        aria-valuetext={`${scale}%`}
                    />
                    <span aria-hidden="true">Większa</span>
                </ScaleRow>
            </Group>

            <Group>
                <GroupTitle>Czcionka</GroupTitle>
                <FontGrid>
                    {SIGNATURE_FONTS.map(font => (
                        <Choice
                            key={font.id}
                            type="button"
                            $active={design.font === font.id}
                            aria-pressed={design.font === font.id}
                            style={{ fontFamily: font.stack }}
                            onClick={() => onChange({ font: font.id })}
                        >
                            {font.label}
                        </Choice>
                    ))}
                </FontGrid>
            </Group>

            {template.social && (
                <Group>
                    <GroupTitle>Ikony social media</GroupTitle>
                    <Segmented>
                        {SIGNATURE_ICON_STYLES.map(style => (
                            <Choice
                                key={style.id}
                                type="button"
                                $active={design.iconStyle === style.id}
                                aria-pressed={design.iconStyle === style.id}
                                onClick={() => onChange({ iconStyle: style.id })}
                            >
                                <img src={`${iconsBaseUrl}/${style.id}/instagram.png`} alt="" />
                                {style.label}
                            </Choice>
                        ))}
                    </Segmented>
                </Group>
            )}
        </Step>
    );
}

// ── 4. Zdjęcie i logo ───────────────────────────────────────────────────────

export function ImagesStep({ design, onChange, companyLogoAvailable }: {
    design: SignatureDesign;
    onChange: Patch;
    companyLogoAvailable: boolean;
}) {
    const template = getSignatureTemplate(design.template);
    return (
        <Step>
            <Header icon={<ImageIcon />} title="Zdjęcie i logo" />
            {template.images.length === 0 ? (
                <Note>
                    Motyw „{template.name}" nie ma zdjęcia ani logo. Jeśli ich potrzebujesz, wybierz inny motyw
                    w pierwszym kroku.
                </Note>
            ) : (
                <FieldGrid>
                    {template.images.includes('photoUrl') && (
                        <SignatureImageField
                            kind="photo"
                            label="Zdjęcie"
                            help="JPG, PNG lub WebP. Kadr ustawisz po wybraniu pliku."
                            value={design.photoUrl}
                            onChange={photoUrl => onChange({ photoUrl })}
                        />
                    )}
                    {template.images.includes('logoUrl') && (
                        <SignatureImageField
                            kind="logo"
                            label="Logo firmy"
                            help="PNG z przezroczystym tłem wygląda najlepiej."
                            value={design.logoUrl}
                            onChange={logoUrl => onChange({ logoUrl })}
                            companyLogoAvailable={companyLogoAvailable}
                        />
                    )}
                </FieldGrid>
            )}
        </Step>
    );
}

// ── 5. Social media ─────────────────────────────────────────────────────────

export function SocialStep({ design, onChange }: { design: SignatureDesign; onChange: Patch }) {
    const template = getSignatureTemplate(design.template);
    return (
        <Step>
            <Header icon={<Share2 />} title="Social media" />
            {!template.social ? (
                <Note>Motyw „{template.name}" nie wyświetla ikon social media.</Note>
            ) : (
                <FieldGrid>
                    {SIGNATURE_SOCIAL_KEYS.map(key => (
                        <Field key={key} $wide>
                            <FieldLabel>{SIGNATURE_SOCIAL_FIELDS[key].label}</FieldLabel>
                            <Input
                                type="url"
                                name={key}
                                value={design[key] ?? ''}
                                placeholder={SIGNATURE_SOCIAL_FIELDS[key].placeholder}
                                onChange={event => onChange({ [key]: event.target.value })}
                            />
                        </Field>
                    ))}
                </FieldGrid>
            )}
        </Step>
    );
}
