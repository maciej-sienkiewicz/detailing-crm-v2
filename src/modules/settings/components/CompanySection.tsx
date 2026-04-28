import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import {
    useCompanySettings,
    useUpdateCompanySettings,
    useUploadCompanyLogo,
    useDeleteCompanyLogo,
} from '../hooks/useCompany';
import type { UpdateCompanySettingsRequest } from '../types';

// ─── Styled components ────────────────────────────────────────────────────────

const SectionHead = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 18px;
    margin-bottom: 4px;
    flex-wrap: wrap;
`;

const HeadLeft = styled.div``;

const EyeLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    margin-bottom: 4px;
`;

const SectionTitle = styled.h2`
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.4px;
    margin: 0 0 4px;
    color: ${props => props.theme.colors.text};
`;

const SectionDesc = styled.p`
    font-size: 13px;
    color: #475569;
    margin: 0;
    max-width: 680px;
    line-height: 1.55;
`;

const Panel = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
`;

const LogoRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 22px;
    border-bottom: 1px solid #f1f5f9;
    flex-wrap: wrap;
`;

const LogoThumb = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;

    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;

const LogoMark = styled.div`
    font-size: 22px;
    font-weight: 800;
    color: #94a3b8;
    letter-spacing: -1px;
`;

const LogoInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const LogoName = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
`;

const LogoMeta = styled.div`
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
`;

const LogoActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 16px 20px;
    padding: 22px;
`;

const Field = styled.div<{ $span?: number }>`
    grid-column: span ${props => props.$span ?? 6};

    @media (max-width: 720px) {
        grid-column: span 12;
    }
`;

const Label = styled.label`
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
`;

const Input = styled.input<{ $mono?: boolean; $error?: boolean }>`
    width: 100%;
    height: 38px;
    padding: 0 12px;
    border-radius: 9px;
    border: 1.5px solid ${props => props.$error ? '#ef4444' : '#e2e8f0'};
    font-family: ${props => props.$mono ? "'JetBrains Mono', ui-monospace, monospace" : 'inherit'};
    font-size: 13px;
    color: #0f172a;
    background: white;
    outline: none;
    transition: border-color 180ms, box-shadow 180ms;
    box-sizing: border-box;

    &:focus {
        border-color: ${props => props.$error ? '#ef4444' : '#0ea5e9'};
        box-shadow: 0 0 0 3px ${props => props.$error ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.14)'};
    }

    &:disabled {
        background: #f8fafc;
        color: #94a3b8;
        cursor: not-allowed;
    }
`;

const Select = styled.select<{ $error?: boolean }>`
    width: 100%;
    height: 38px;
    padding: 0 12px;
    border-radius: 9px;
    border: 1.5px solid ${props => props.$error ? '#ef4444' : '#e2e8f0'};
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    background: white;
    outline: none;
    cursor: pointer;
    transition: border-color 180ms, box-shadow 180ms;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
    box-sizing: border-box;

    &:focus {
        border-color: ${props => props.$error ? '#ef4444' : '#0ea5e9'};
        box-shadow: 0 0 0 3px rgba(14,165,233,0.14);
    }
`;

const Hint = styled.div`
    font-size: 11px;
    color: #94a3b8;
    margin-top: 5px;
    line-height: 1.45;
`;

const ErrorMsg = styled.div`
    font-size: 11px;
    color: #ef4444;
    margin-top: 5px;
`;

const BtnPrimary = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 9px;
    border: none;
    background: #0ea5e9;
    font-size: 13px;
    font-weight: 600;
    color: white;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 150ms, transform 100ms;
    white-space: nowrap;

    &:hover { opacity: 0.9; }
    &:active { transform: scale(0.98); }
    &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
`;

const BtnSecondary = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 9px;
    border: 1px solid #e2e8f0;
    background: white;
    font-size: 13px;
    font-weight: 500;
    color: #334155;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;
    white-space: nowrap;

    &:hover { background: #f8fafc; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const BtnDanger = styled(BtnSecondary)`
    color: #dc2626;
    border-color: #fecaca;

    &:hover { background: rgba(239,68,68,0.04); }
`;

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin: 60px auto;

    @keyframes spin { to { transform: rotate(360deg); } }
`;

const DirtyDot = styled.span`
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #f59e0b;
    margin-left: 8px;
    vertical-align: middle;
    flex-shrink: 0;
`;

// ─── Icon helpers ─────────────────────────────────────────────────────────────

const Svg = ({ d, size = 14 }: { d: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const CheckIcon = () => <Svg d="M20 6 9 17l-5-5" size={14} />;
const UploadIcon = () => <Svg d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" size={13} />;
const TrashIcon = () => <Svg d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" size={13} />;

// ─── Validation ───────────────────────────────────────────────────────────────

interface FormErrors {
    name?: string;
    taxId?: string;
    regon?: string;
    postalCode?: string;
    email?: string;
    phone?: string;
}

function validate(form: UpdateCompanySettingsRequest): FormErrors {
    const errors: FormErrors = {};

    if (!form.name.trim()) errors.name = 'Nazwa firmy jest wymagana.';

    const taxIdRaw = form.taxId.replace(/[\s-]/g, '');
    if (!/^\d{10}$/.test(taxIdRaw)) errors.taxId = 'NIP musi zawierać dokładnie 10 cyfr.';

    const regonRaw = form.regon.replace(/\s/g, '');
    if (!/^\d{9}(\d{5})?$/.test(regonRaw)) errors.regon = 'REGON musi mieć 9 lub 14 cyfr.';

    if (!/^\d{2}-\d{3}$/.test(form.postalCode.trim())) errors.postalCode = 'Format: XX-XXX';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Nieprawidłowy adres e-mail.';

    if (!form.phone.trim()) errors.phone = 'Telefon jest wymagany.';

    return errors;
}

// ─── CompanySection ───────────────────────────────────────────────────────────

export function CompanySection() {
    const { company, isLoading } = useCompanySettings();
    const updateMutation = useUpdateCompanySettings();
    const uploadLogoMutation = useUploadCompanyLogo();
    const deleteLogoMutation = useDeleteCompanyLogo();
    const { showSuccess, showError } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<UpdateCompanySettingsRequest | null>(null);
    const [errors, setErrors] = useState<FormErrors>({});
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (company && !form) {
            setForm({
                name: company.name,
                taxId: company.taxId,
                regon: company.regon,
                street: company.street,
                postalCode: company.postalCode,
                city: company.city,
                phone: company.phone,
                email: company.email,
                website: company.website,
                bankAccount: company.bankAccount,
            });
        }
    }, [company, form]);

    const set = (field: keyof UpdateCompanySettingsRequest, value: string) => {
        setForm(prev => prev ? { ...prev, [field]: value } : prev);
        setErrors(prev => ({ ...prev, [field]: undefined }));
        setDirty(true);
    };

    const handleSave = async () => {
        if (!form) return;
        const errs = validate(form);
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }
        try {
            await updateMutation.mutateAsync(form);
            setDirty(false);
            showSuccess('Zapisano', 'Dane firmy zostały zaktualizowane.');
        } catch {
            showError('Błąd', 'Nie udało się zapisać danych. Spróbuj ponownie.');
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showError('Plik za duży', 'Logo nie może przekraczać 2 MB.');
            return;
        }
        try {
            await uploadLogoMutation.mutateAsync(file);
            showSuccess('Logo zaktualizowane', 'Nowe logo zostało wgrane.');
        } catch {
            showError('Błąd', 'Nie udało się wgrać logo.');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleLogoDelete = async () => {
        if (!confirm('Usunąć logo firmy?')) return;
        try {
            await deleteLogoMutation.mutateAsync();
            showSuccess('Logo usunięte', 'Logo firmy zostało usunięte.');
        } catch {
            showError('Błąd', 'Nie udało się usunąć logo.');
        }
    };

    if (isLoading || !form) {
        return (
            <>
                <SectionHead>
                    <HeadLeft>
                        <EyeLabel>Studio</EyeLabel>
                        <SectionTitle>Dane firmy</SectionTitle>
                    </HeadLeft>
                </SectionHead>
                <Panel><Spinner /></Panel>
            </>
        );
    }

    const isSaving = updateMutation.isPending;
    const logoUploading = uploadLogoMutation.isPending;
    const logoDeleting = deleteLogoMutation.isPending;

    const initials = (form.name || 'D').trim().charAt(0).toUpperCase();

    return (
        <>
            <SectionHead>
                <HeadLeft>
                    <EyeLabel>Studio</EyeLabel>
                    <SectionTitle>
                        Dane firmy
                        {dirty && <DirtyDot title="Masz niezapisane zmiany" />}
                    </SectionTitle>
                    <SectionDesc>
                        Te dane pojawiają się na fakturach, w stopkach e-maili i na podpisywanych dokumentach.
                    </SectionDesc>
                </HeadLeft>
                <BtnPrimary onClick={handleSave} disabled={isSaving || !dirty}>
                    <CheckIcon />
                    {isSaving ? 'Zapisywanie…' : 'Zapisz zmiany'}
                </BtnPrimary>
            </SectionHead>

            <Panel>
                {/* Logo */}
                <LogoRow>
                    <LogoThumb>
                        {company?.logoUrl
                            ? <img src={company.logoUrl} alt="Logo firmy" />
                            : <LogoMark>{initials}</LogoMark>
                        }
                    </LogoThumb>
                    <LogoInfo>
                        <LogoName>{form.name || 'Nazwa firmy'}</LogoName>
                        <LogoMeta>
                            {company?.logoUrl ? 'Logo wgrane' : 'Brak logo · zalecane SVG lub PNG, min. 200 px'}
                        </LogoMeta>
                    </LogoInfo>
                    <LogoActions>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/svg+xml,image/jpeg,image/webp"
                            style={{ display: 'none' }}
                            onChange={handleLogoUpload}
                        />
                        <BtnSecondary
                            onClick={() => fileInputRef.current?.click()}
                            disabled={logoUploading}
                        >
                            <UploadIcon />
                            {logoUploading ? 'Wgrywanie…' : 'Wgraj nowe'}
                        </BtnSecondary>
                        {company?.logoUrl && (
                            <BtnDanger onClick={handleLogoDelete} disabled={logoDeleting}>
                                <TrashIcon />
                            </BtnDanger>
                        )}
                    </LogoActions>
                </LogoRow>

                {/* Form grid */}
                <Grid>
                    <Field $span={12}>
                        <Label>Nazwa firmy</Label>
                        <Input
                            value={form.name}
                            onChange={e => set('name', e.target.value)}
                            $error={!!errors.name}
                            placeholder="Np. Detail Pro Studio Sp. z o.o."
                        />
                        {errors.name && <ErrorMsg>{errors.name}</ErrorMsg>}
                    </Field>

                    <Field $span={6}>
                        <Label>NIP</Label>
                        <Input
                            value={form.taxId}
                            onChange={e => set('taxId', e.target.value)}
                            $mono
                            $error={!!errors.taxId}
                            placeholder="000-000-00-00"
                        />
                        {errors.taxId ? <ErrorMsg>{errors.taxId}</ErrorMsg> : null}
                    </Field>

                    <Field $span={6}>
                        <Label>REGON</Label>
                        <Input
                            value={form.regon}
                            onChange={e => set('regon', e.target.value)}
                            $mono
                            $error={!!errors.regon}
                            placeholder="000000000"
                        />
                        {errors.regon ? <ErrorMsg>{errors.regon}</ErrorMsg> : null}
                    </Field>

                    <Field $span={8}>
                        <Label>Adres</Label>
                        <Input
                            value={form.street}
                            onChange={e => set('street', e.target.value)}
                            placeholder="ul. Przykładowa 1"
                        />
                    </Field>

                    <Field $span={2}>
                        <Label>Kod pocztowy</Label>
                        <Input
                            value={form.postalCode}
                            onChange={e => set('postalCode', e.target.value)}
                            $mono
                            $error={!!errors.postalCode}
                            placeholder="00-000"
                        />
                        {errors.postalCode ? <ErrorMsg>{errors.postalCode}</ErrorMsg> : null}
                    </Field>

                    <Field $span={2}>
                        <Label>Miasto</Label>
                        <Input
                            value={form.city}
                            onChange={e => set('city', e.target.value)}
                            placeholder="Warszawa"
                        />
                    </Field>

                    <Field $span={6}>
                        <Label>Telefon kontaktowy</Label>
                        <Input
                            value={form.phone}
                            onChange={e => set('phone', e.target.value)}
                            $mono
                            $error={!!errors.phone}
                            placeholder="+48 000 000 000"
                        />
                        {errors.phone ? <ErrorMsg>{errors.phone}</ErrorMsg> : null}
                    </Field>

                    <Field $span={6}>
                        <Label>E-mail firmowy</Label>
                        <Input
                            type="email"
                            value={form.email}
                            onChange={e => set('email', e.target.value)}
                            $error={!!errors.email}
                            placeholder="kontakt@firma.pl"
                        />
                        {errors.email ? <ErrorMsg>{errors.email}</ErrorMsg> : null}
                    </Field>

                    <Field $span={6}>
                        <Label>Strona www <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcjonalnie)</span></Label>
                        <Input
                            type="url"
                            value={form.website ?? ''}
                            onChange={e => set('website', e.target.value)}
                            placeholder="https://firma.pl"
                        />
                        <Hint>Pojawi się w stopce e-maili i SMS-ów.</Hint>
                    </Field>

                    <Field $span={6}>
                        <Label>Konto bankowe <span style={{ fontWeight: 400, color: '#94a3b8' }}>(do faktur)</span></Label>
                        <Input
                            value={form.bankAccount ?? ''}
                            onChange={e => set('bankAccount', e.target.value)}
                            $mono
                            placeholder="00 0000 0000 0000 0000 0000 0000"
                        />
                    </Field>
                </Grid>
            </Panel>
        </>
    );
}
