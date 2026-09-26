// src/modules/settings/components/CompanySection.tsx
//
// Ustawienia → Studio → Dane firmy.
//
// Jedna karta: logo, a pod nim trzy grupy pól z nagłówkami pisanymi zwykłym
// tekstem („Firma", „Adres i kontakt", „Do faktur i wiadomości"). Zapis przez
// jeden pasek na dole, który mówi, ile pól zmieniono i które wymaga poprawy.
//
// Co było nie tak wcześniej:
//  - „Zapisz" przy błędzie w polu poza ekranem nie robił nic - walidacja po cichu
//    przerywała zapis, a czerwone pole leżało gdzieś wyżej. Teraz pasek nazywa
//    pole („REGON wymaga poprawy"), a „Pokaż pole" i sam „Zapisz" przewijają
//    do niego i ustawiają w nim kursor;
//  - pasek nie znikał po cofnięciu zmiany ręcznie (flaga `dirty` ustawiana przy
//    każdym wpisie) - teraz zmiany to porównanie z wczytanymi danymi;
//  - błąd wczytania kończył się wiecznym kółkiem, a błąd zapisu 4xx dwoma
//    dymkami (interceptor + własny) - patrz studioErrors.ts;
//  - usunięcie logo pytało przez window.confirm;
//  - NIP, telefon i konto bankowe pisane były czcionką maszynową, jakby to był kod.

import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import styled from 'styled-components';
import { Trash2, Upload } from 'lucide-react';
import { useToast } from '@/common/components/Toast';
import { InfoTooltip } from '@/common/components/InfoTooltip';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { InputShell, BareInput, FieldLabel } from '@/common/components/Form';
import { Button, Card, IconButton, Notice, ui } from '@/common/components/ui';
import { gusApi, type CompanyInfoResponse } from '@/modules/gus/api/gusApi';
import {
    useCompanySettings,
    useUpdateCompanySettings,
    useUploadCompanyLogo,
    useDeleteCompanyLogo,
} from '../hooks/useCompany';
import type { UpdateCompanySettingsRequest } from '../types';
import { UnsavedChangesBanner } from './shared/SettingsLayout';
import { backendMessage, shownByInterceptor } from './studioErrors';
import {
    FIELDS, FIELD_NAMES, countChangedFields, toCompanyForm, validateCompanyForm,
    type CompanyForm, type FieldKey,
} from './companyForm';

// ─── Wygląd ───────────────────────────────────────────────────────────────────

const Body = styled.div`
    padding: 22px 24px 24px;

    @media (max-width: 640px) { padding: 18px 16px 20px; }
`;

const LogoRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
`;

// Brak logo: przerywana ramka z ikoną wgrywania, jak pole „upuść plik".
// Poziomy logotyp dostaje szerszy kafelek: w kwadracie byłby nieczytelny.
// Logo z własnym tłem rysuje się bez jasnego kafelka - wyglądał przy nim jak obwódka.
const LogoTile = styled.div<{ $empty: boolean; $wide?: boolean; $plain?: boolean }>`
    width: ${p => (p.$wide ? '140px' : '64px')};
    height: 64px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    padding: ${p => (p.$plain || p.$empty ? '0' : '6px 10px')};
    border-radius: 14px;
    border: ${p => p.$empty ? `1.5px dashed ${ui.lineStrong}` : p.$plain ? '1px solid transparent' : `1px solid ${ui.line}`};
    background: ${p => (p.$plain ? 'transparent' : p.$empty ? ui.surfaceSoft : ui.surfaceAlt)};
    color: ${ui.textFaint};
    overflow: hidden;

    svg { width: 22px; height: 22px; }
    img { width: 100%; height: 100%; object-fit: contain; border-radius: 10px; }
`;

const LogoText = styled.div`
    flex: 1 1 240px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong { font-size: 15px; font-weight: 600; color: ${ui.ink}; }
    span { font-size: 13px; line-height: 1.5; color: ${ui.textMuted}; }
`;

const LogoStatus = styled.span`
    display: inline-flex;
    align-items: center;
`;

const LogoActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
`;

const HiddenFile = styled.input`
    display: none;
`;

const Group = styled.section`
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid ${ui.lineFaint};
    min-width: 0;
`;

const GroupTitle = styled.h3`
    margin: 0 0 14px;
    font-size: 15px;
    font-weight: 600;
    color: ${ui.ink};
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 16px;
`;

const Field = styled.div<{ $span: number; $phoneSpan?: number }>`
    grid-column: span ${p => p.$span};
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;

    @media (max-width: 720px) { grid-column: span ${p => p.$phoneSpan ?? 12}; }
`;

const Optional = styled.span`
    font-weight: 400;
    color: ${ui.textMuted};
`;

// Pole zmienione, ale jeszcze niezapisane, dostaje obwódkę w odcieniu marki -
// widać, czego dotyczy „Zmieniono 2 pola" w pasku.
const Shell = styled(InputShell)<{ $dirty?: boolean }>`
    min-height: 44px;
    ${p => p.$dirty && !p.$hasError && `border-color: ${ui.brandLine};`}
    ${p => p.$hasError && `background: #fff7f7;`}
`;

const Suffix = styled.div`
    flex-shrink: 0;
    padding-right: 6px;
`;

const Hint = styled.span`
    font-size: 12.5px;
    line-height: 1.45;
    color: ${ui.textMuted};
`;

const ErrorText = styled.span`
    font-size: 12.5px;
    line-height: 1.45;
    color: ${ui.dangerInk};
`;

const Loading = styled.p`
    margin: 0;
    padding: 40px 24px;
    font-size: 14px;
    color: ${ui.textMuted};
    text-align: center;
`;

// ─── Stałe ────────────────────────────────────────────────────────────────────

/** Zgodne z CompanyController.MAX_LOGO_SIZE_BYTES. */
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/** Zalecenia dla właściciela warsztatu; wartości zgodne z walidacją backendu (CompanyLogoProcessor). */
const LOGO_GUIDANCE =
    'Wystarczy jeden plik: system sam przygotuje wersję do menu i wersję do druku. ' +
    'Najlepiej SVG albo PNG z przezroczystym tłem. WebP i JPEG też działają, ale JPEG nie ma przezroczystości. ' +
    'Dla PNG, WebP i JPEG dłuższy bok powinien mieć co najmniej 300 px, zalecane 1000 px lub więcej, ' +
    'bo logo trafia do nagłówka dokumentów A4 drukowanych w wysokiej rozdzielczości. Plik do 5 MB. ' +
    'Poziomy logotyp wygląda najlepiej, sygnet też się zmieści, a logo nigdy nie jest deformowane. ' +
    'Logo pojawia się w menu bocznym oraz, jeśli włączysz to w sekcji „Dokumenty i podpisy", w nagłówku protokołów i zgód.';

const gusStreetLine = (data: CompanyInfoResponse): string => {
    const { street, buildingNumber, apartmentNumber } = data.address;
    return [street, buildingNumber].filter(Boolean).join(' ') + (apartmentNumber ? `/${apartmentNumber}` : '');
};

// ─── Sekcja ───────────────────────────────────────────────────────────────────

export function CompanySection() {
    const { company, isLoading, isError, refetch } = useCompanySettings();
    const updateMutation = useUpdateCompanySettings();
    const uploadLogoMutation = useUploadCompanyLogo();
    const deleteLogoMutation = useDeleteCompanyLogo();
    const { showSuccess, showError } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRefs = useRef<Partial<Record<FieldKey, HTMLInputElement | null>>>({});

    const [form, setForm] = useState<CompanyForm | null>(null);
    const [saved, setSaved] = useState<CompanyForm | null>(null);
    /** Pola, które użytkownik już opuścił - dopiero wtedy pokazujemy ich błąd. */
    const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [confirmLogoDelete, setConfirmLogoDelete] = useState(false);
    const [gusLoading, setGusLoading] = useState(false);
    const [gusError, setGusError] = useState<string | null>(null);
    // Adres logo to podpisany link S3 z ograniczonym czasem życia - po wygaśnięciu
    // <img> zwróci błąd. Pamiętamy KTÓRY adres zawiódł, żeby świeży (po ponownym
    // pobraniu ustawień) dostał kolejną szansę zamiast utknąć w zastępczym kafelku.
    const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);

    // Formularz zasiewamy z wczytanych danych raz, w trakcie renderu (wzorzec
    // „dostosuj stan przy renderze"), a nie efektem - efekt dawał jedną klatkę
    // z pustym formularzem i kaskadę renderów.
    if (company && saved === null) {
        const initial = toCompanyForm(company);
        setSaved(initial);
        setForm(initial);
    }

    const errors = form ? validateCompanyForm(form) : {};
    const changedCount = form && saved ? countChangedFields(form, saved) : 0;
    const dirty = changedCount > 0;
    const firstInvalid = FIELDS.find(key => errors[key]);
    const showErrorFor = (key: FieldKey) => !!errors[key] && (submitAttempted || !!touched[key]);

    const focusField = (key: FieldKey) => {
        setTouched(prev => ({ ...prev, [key]: true }));
        const el = inputRefs.current[key];
        if (!el) return;
        el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        el.focus({ preventScroll: true });
    };

    const set = (key: FieldKey, value: string) => {
        setForm(prev => (prev ? { ...prev, [key]: value } : prev));
    };

    const handleSave = async () => {
        if (!form) return;
        if (firstInvalid) {
            // Zapis z błędem nie może kończyć się ciszą: pokazujemy wszystkie błędy
            // i przenosimy użytkownika do pierwszego z nich.
            setSubmitAttempted(true);
            focusField(firstInvalid);
            return;
        }
        const payload: UpdateCompanySettingsRequest = {
            name: form.name.trim(),
            taxId: form.taxId.trim(),
            regon: form.regon.trim(),
            street: form.street.trim(),
            postalCode: form.postalCode.trim(),
            city: form.city.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            website: form.website.trim() || null,
            bankAccount: form.bankAccount.trim() || null,
        };
        try {
            const updated = await updateMutation.mutateAsync(payload);
            // Backend może znormalizować wartości (np. NIP) - punktem odniesienia
            // dla „zmieniono N pól" jest to, co zapisał, a nie to, co wysłaliśmy.
            const next = updated ? toCompanyForm(updated) : { ...form };
            setSaved(next);
            setForm(next);
            setTouched({});
            setSubmitAttempted(false);
            showSuccess('Dane firmy zapisane', 'Pojawią się na kolejnych fakturach i protokołach.');
        } catch (err) {
            if (!shownByInterceptor(err)) {
                showError('Nie udało się zapisać danych firmy', backendMessage(err) ?? 'Spróbuj ponownie za chwilę.');
            }
        }
    };

    const handleDiscard = () => {
        if (!saved) return;
        setForm({ ...saved });
        setTouched({});
        setSubmitAttempted(false);
        setGusError(null);
    };

    const handleGus = async () => {
        if (!form) return;
        const nip = form.taxId.replace(/[\s-]/g, '');
        if (!/^\d{10}$/.test(nip)) {
            focusField('taxId');
            return;
        }
        setGusLoading(true);
        setGusError(null);
        try {
            const data = await gusApi.getCompanyByNip(nip);
            const postal = data.address.postalCode?.replace(/^(\d{2})(\d{3})$/, '$1-$2') ?? '';
            setForm(prev => prev ? {
                ...prev,
                name: data.name || prev.name,
                regon: data.regon || prev.regon,
                street: gusStreetLine(data) || prev.street,
                postalCode: postal || prev.postalCode,
                city: data.address.city || prev.city,
            } : prev);
            showSuccess('Uzupełniono z GUS', 'Sprawdź nazwę i adres, a potem zapisz zmiany.');
        } catch (err) {
            // Odmowę z backendu (4xx, np. „nie znaleziono firmy") pokazał już interceptor.
            if (!shownByInterceptor(err)) {
                setGusError('Nie udało się połączyć z GUS. Spróbuj ponownie za chwilę albo wpisz dane ręcznie.');
            }
        } finally {
            setGusLoading(false);
        }
    };

    const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > MAX_LOGO_BYTES) {
            showError('Plik jest za duży', 'Logo może mieć najwyżej 5 MB.');
            return;
        }
        try {
            await uploadLogoMutation.mutateAsync(file);
            setFailedLogoUrl(null);
            showSuccess('Logo zapisane', 'Przygotowaliśmy wersję do menu i wersję do druku.');
        } catch (err) {
            // Backend odrzuca m.in. za małe rastry i uszkodzone pliki z konkretnym
            // powodem - pokazujemy go zamiast ogólnego „nie udało się".
            if (!shownByInterceptor(err)) {
                showError('Nie udało się wgrać logo', backendMessage(err) ?? 'Sprawdź format i rozmiar pliku i spróbuj ponownie.');
            }
        }
    };

    const handleLogoDelete = async () => {
        try {
            await deleteLogoMutation.mutateAsync();
            showSuccess('Logo usunięte', 'Dokumenty i menu pokażą odtąd samą nazwę firmy.');
        } catch (err) {
            if (!shownByInterceptor(err)) {
                showError('Nie udało się usunąć logo', backendMessage(err) ?? 'Spróbuj ponownie za chwilę.');
            }
        }
    };

    if (isError && !company) {
        return (
            <Card>
                <Body>
                    <Notice
                        tone="danger"
                        role="alert"
                        title="Nie udało się wczytać danych firmy"
                        action={<Button variant="ghost" size="sm" onClick={() => refetch()}>Spróbuj ponownie</Button>}
                    >
                        Sprawdź połączenie z internetem. Niczego nie zmieniliśmy.
                    </Notice>
                </Body>
            </Card>
        );
    }

    if (isLoading || !form || !saved) {
        return <Card><Loading role="status">Wczytywanie danych firmy...</Loading></Card>;
    }

    const logoUrl = company?.logoUrl?.trim() || null;
    const showLogo = !!logoUrl && failedLogoUrl !== logoUrl;
    // Co backend ustalił przy wgraniu; null proporcji = logo sprzed analizy.
    const logoAnalyzed = company?.logoAspectRatio != null;
    const logoPlain = logoAnalyzed && !company?.logoNeedsLightPlate;
    const logoStatus = !logoUrl
        ? 'Na protokołach i w nagłówku maili. PNG albo SVG, najlepiej z przezroczystym tłem.'
        : !logoAnalyzed
            ? 'Logo wgrane przed analizą wyglądu. Wgraj je ponownie, żeby dobrze leżało w menu.'
            : logoPlain
                ? 'Logo ma własne tło, w menu stoi bez podkładki.'
                : 'Logo ma przezroczyste tło, w menu stoi na jasnej podkładce.';
    const logoUploading = uploadLogoMutation.isPending;

    const renderField = (
        key: FieldKey,
        opts: {
            span: number;
            phoneSpan?: number;
            label: string;
            optional?: boolean;
            hint?: string;
            placeholder?: string;
            type?: string;
            inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url';
            autoComplete?: string;
            suffix?: ReactNode;
            extra?: ReactNode;
        },
    ) => {
        const id = `company-${key}`;
        const invalid = showErrorFor(key);
        const describedBy = invalid ? `${id}-error` : opts.hint ? `${id}-hint` : undefined;
        return (
            <Field $span={opts.span} $phoneSpan={opts.phoneSpan}>
                <FieldLabel htmlFor={id}>
                    {opts.label}{opts.optional && <Optional> (opcjonalnie)</Optional>}
                </FieldLabel>
                <Shell $hasError={invalid} $dirty={form[key] !== saved[key]}>
                    <BareInput
                        id={id}
                        ref={el => { inputRefs.current[key] = el; }}
                        type={opts.type ?? 'text'}
                        inputMode={opts.inputMode}
                        autoComplete={opts.autoComplete ?? 'off'}
                        value={form[key]}
                        placeholder={opts.placeholder}
                        aria-invalid={invalid || undefined}
                        aria-describedby={describedBy}
                        onChange={e => set(key, e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, [key]: true }))}
                    />
                    {opts.suffix && <Suffix>{opts.suffix}</Suffix>}
                </Shell>
                {invalid
                    ? <ErrorText id={`${id}-error`}>{errors[key]}</ErrorText>
                    : opts.hint && <Hint id={`${id}-hint`}>{opts.hint}</Hint>}
                {opts.extra}
            </Field>
        );
    };

    return (
        <>
            <Card aria-label="Dane firmy">
                <Body>
                    <LogoRow>
                        <LogoTile
                            $empty={!showLogo}
                            $wide={showLogo && (company?.logoAspectRatio ?? 0) >= 1.6}
                            $plain={showLogo && logoPlain}
                        >
                            {showLogo
                                ? <img src={logoUrl!} alt="Logo firmy" onError={() => setFailedLogoUrl(logoUrl)} />
                                : <Upload aria-hidden="true" />}
                        </LogoTile>
                        <LogoText>
                            <strong>Logo studia</strong>
                            <span>
                                {logoStatus}
                                <LogoStatus><InfoTooltip text={LOGO_GUIDANCE} width={340} /></LogoStatus>
                            </span>
                        </LogoText>
                        <LogoActions>
                            <HiddenFile
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                                data-testid="company-logo-input"
                                onChange={handleLogoUpload}
                            />
                            <Button
                                variant="tinted"
                                size="sm"
                                disabled={logoUploading}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload aria-hidden="true" />
                                {logoUploading ? 'Wgrywanie...' : logoUrl ? 'Zmień logo' : 'Dodaj logo'}
                            </Button>
                            {logoUrl && (
                                <IconButton
                                    label="Usuń logo"
                                    variant="danger"
                                    size="sm"
                                    disabled={deleteLogoMutation.isPending}
                                    onClick={() => setConfirmLogoDelete(true)}
                                >
                                    <Trash2 />
                                </IconButton>
                            )}
                        </LogoActions>
                    </LogoRow>

                    <Group aria-labelledby="company-group-firm">
                        <GroupTitle id="company-group-firm">Firma</GroupTitle>
                        <Grid>
                            {renderField('name', { span: 12, label: 'Nazwa firmy', placeholder: 'Np. Detail Studio Sp. z o.o.', autoComplete: 'organization' })}
                            {renderField('taxId', {
                                span: 6,
                                label: 'NIP',
                                placeholder: '000-000-00-00',
                                inputMode: 'numeric',
                                suffix: (
                                    <Button variant="tinted" size="sm" disabled={gusLoading} onClick={handleGus}>
                                        {gusLoading ? 'Pobieranie...' : 'Uzupełnij z GUS'}
                                    </Button>
                                ),
                                extra: gusError && <ErrorText role="alert">{gusError}</ErrorText>,
                            })}
                            {renderField('regon', { span: 6, label: 'REGON', placeholder: '000000000', inputMode: 'numeric' })}
                        </Grid>
                    </Group>

                    <Group aria-labelledby="company-group-address">
                        <GroupTitle id="company-group-address">Adres i kontakt</GroupTitle>
                        <Grid>
                            {renderField('street', { span: 6, label: 'Ulica i numer', placeholder: 'ul. Prosta 20', autoComplete: 'street-address' })}
                            {renderField('postalCode', { span: 3, phoneSpan: 5, label: 'Kod pocztowy', placeholder: '00-000', inputMode: 'numeric', autoComplete: 'postal-code' })}
                            {renderField('city', { span: 3, phoneSpan: 7, label: 'Miasto', placeholder: 'Warszawa', autoComplete: 'address-level2' })}
                            {renderField('phone', { span: 6, label: 'Telefon', placeholder: '+48 600 100 300', type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}
                            {renderField('email', { span: 6, label: 'E-mail', placeholder: 'biuro@studio.pl', type: 'email', inputMode: 'email', autoComplete: 'email' })}
                        </Grid>
                    </Group>

                    <Group aria-labelledby="company-group-invoice">
                        <GroupTitle id="company-group-invoice">Do faktur i wiadomości</GroupTitle>
                        <Grid>
                            {renderField('bankAccount', {
                                span: 6,
                                label: 'Konto bankowe',
                                optional: true,
                                placeholder: '00 0000 0000 0000 0000 0000 0000',
                                inputMode: 'numeric',
                                hint: 'Drukujemy je na fakturze pod kwotą do zapłaty.',
                            })}
                            {renderField('website', {
                                span: 6,
                                label: 'Strona www',
                                optional: true,
                                placeholder: 'studio.pl',
                                inputMode: 'url',
                                autoComplete: 'url',
                                hint: 'W stopce e-maili i SMS-ów.',
                            })}
                        </Grid>
                    </Group>
                </Body>
            </Card>

            <UnsavedChangesBanner
                visible={dirty}
                onSave={handleSave}
                onDiscard={handleDiscard}
                isSaving={updateMutation.isPending}
                changedCount={changedCount}
                problem={firstInvalid ? `${FIELD_NAMES[firstInvalid]} wymaga poprawy` : undefined}
                onShowProblem={firstInvalid ? () => focusField(firstInvalid) : undefined}
            />

            <ConfirmationModal
                isOpen={confirmLogoDelete}
                title="Usunąć logo studia?"
                message="Logo zniknie z menu, nagłówków maili oraz z nowych protokołów i zgód. Wcześniej wygenerowane dokumenty zostaną bez zmian."
                variant="danger"
                confirmText="Usuń logo"
                cancelText="Zostaw"
                onConfirm={handleLogoDelete}
                onCancel={() => setConfirmLogoDelete(false)}
            />
        </>
    );
}
