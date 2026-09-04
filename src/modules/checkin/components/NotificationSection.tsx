import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LockedSection } from '@/common/components/LockedSection';
import { useToast } from '@/common/components/Toast';
import { useCapability } from '@/modules/subscription';
import { visitApi } from '@/modules/visits/api/visitApi';
import { useVisitPhotos } from '@/modules/visits/hooks';
import { useVisitCardSettings } from '@/modules/visit-card/hooks/useVisitCardSettings';
import { visitCardApi } from '@/modules/visit-card/api/visitCardApi';
import { describeVisitCardAlreadySent } from '../utils/visitCardAlreadySent';
import type { ConfirmVisitOptions } from '@/modules/visits/types';
import {
    Section,
    SectionHeader,
    SectionTitle,
    SectionTitleIcon,
    NotifCard,
    NotifCardHeader,
    NotifIconWrap,
    NotifLabelGroup,
    NotifLabel,
    NotifDescription,
    ToggleTrack,
    EmailBody,
    EmailBodyInner,
    AttachmentsLabel,
    AttachmentsList,
    AttachmentRow,
    Checkbox,
    HiddenCheckbox,
    AttachmentText,
    AttachmentSuffix,
    PhotoGridWrap,
    PhotoGridHeader,
    PhotoGridCount,
    SelectAllBtn,
    PhotoGrid,
    PhotoItem,
    PhotoThumb,
    PhotoCheckOverlay,
    PhotoLoadingPlaceholder,
    NoPhotosHint,
    AlreadySentNotice,
    MissingEmailPanel,
    MissingEmailNotice,
    MissingEmailIcon,
    MissingEmailText,
    MissingEmailForm,
    EmailInput,
    SaveEmailBtn,
    MissingEmailError,
} from './NotificationSection.styles';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface NotificationOptions {
    sendEmail: boolean;
    /** SMS z linkiem do Karty Wizyty, wysyłany po potwierdzeniu wizyty. */
    sendVisitCard: boolean;
    emailOptions: {
        attachProtocol: boolean;
        attachPhotos: boolean;
        selectedPhotoIds: Set<string>;
        attachDamageMap: boolean;
    };
}

export const defaultNotificationOptions = (
    hasProtocol = true,
    visitWelcomeEnabled = true,
    hasPhotos = false,
    hasDamageMap = false,
    visitCardSendByDefault = false,
): NotificationOptions => ({
    sendEmail: visitWelcomeEnabled,
    sendVisitCard: visitCardSendByDefault,
    emailOptions: {
        attachProtocol: hasProtocol,
        attachPhotos: hasPhotos,
        selectedPhotoIds: new Set(),
        attachDamageMap: hasDamageMap,
    },
});

export const toConfirmVisitOptions = (opts: NotificationOptions): ConfirmVisitOptions => ({
    sendEmail: opts.sendEmail || undefined,
    // Kartę wysyła backend w tym samym żądaniu - i tylko on. Osobne wywołanie
    // /card-link/send po potwierdzeniu dublowało SMS do klienta.
    sendVisitCard: opts.sendVisitCard || undefined,
    emailOptions: opts.sendEmail
        ? {
              attachProtocol: opts.emailOptions.attachProtocol || undefined,
              attachPhotos: opts.emailOptions.attachPhotos || undefined,
              photoIds:
                  opts.emailOptions.attachPhotos && opts.emailOptions.selectedPhotoIds.size > 0
                      ? [...opts.emailOptions.selectedPhotoIds]
                      : undefined,
              attachDamageMap: opts.emailOptions.attachDamageMap || undefined,
          }
        : undefined,
});

/* ─── Icons ─────────────────────────────────────────────────────────────────── */

const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const SmsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
    </svg>
);

const EmailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const DocumentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const PhotoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const DamageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const WarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
);

/* ─── Missing customer e-mail ────────────────────────────────────────────────── */

const EMAIL_PATTERN = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

interface MissingCustomerEmailProps {
    visitId: string;
    onSaved: (email: string) => void;
}

/**
 * Wysyłka e-maila wymaga adresu klienta, a ten bywa pusty - zamiast odsyłać
 * użytkownika do formularza przyjęcia (i tracić otwarty modal), pozwalamy
 * uzupełnić adres w miejscu.
 */
const MissingCustomerEmail = ({ visitId, onSaved }: MissingCustomerEmailProps) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { showSuccess } = useToast();

    const saveEmail = useMutation({
        mutationFn: (value: string) => visitApi.updateCustomerEmail(visitId, value),
        onSuccess: result => {
            setError(null);
            showSuccess('Adres e-mail klienta został zapisany');
            onSaved(result.email);
        },
        onError: (err: unknown) => {
            const apiMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(apiMessage ?? 'Nie udało się zapisać adresu e-mail. Spróbuj jeszcze raz.');
        },
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const value = email.trim();
        if (!EMAIL_PATTERN.test(value)) {
            setError('Podaj poprawny adres e-mail.');
            return;
        }
        setError(null);
        saveEmail.mutate(value);
    };

    return (
        <MissingEmailPanel>
            <MissingEmailNotice>
                <MissingEmailIcon><WarningIcon /></MissingEmailIcon>
                <MissingEmailText>
                    Wysyłka e-maila jest niedostępna - klient nie ma zapisanego adresu e-mail.
                    Możesz uzupełnić go tutaj, bez wracania do formularza.
                </MissingEmailText>
            </MissingEmailNotice>

            <MissingEmailForm onSubmit={handleSubmit} noValidate>
                <EmailInput
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="adres@email.pl"
                    aria-label="Adres e-mail klienta"
                    value={email}
                    disabled={saveEmail.isPending}
                    onChange={e => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                    }}
                />
                <SaveEmailBtn type="submit" disabled={saveEmail.isPending || email.trim().length === 0}>
                    {saveEmail.isPending ? 'Zapisywanie...' : 'Zapisz adres'}
                </SaveEmailBtn>
            </MissingEmailForm>

            {error && <MissingEmailError role="alert">{error}</MissingEmailError>}
        </MissingEmailPanel>
    );
};

/* ─── Photo Selector ─────────────────────────────────────────────────────────── */

interface PhotoSelectorProps {
    visitId: string;
    selectedIds: Set<string>;
    onTogglePhoto: (photoId: string) => void;
    onSelectAll: (allIds: string[]) => void;
    onDeselectAll: () => void;
}

const PhotoSelector = ({ visitId, selectedIds, onTogglePhoto, onSelectAll, onDeselectAll }: PhotoSelectorProps) => {
    const { photos, isLoading } = useVisitPhotos(visitId);

    if (isLoading) {
        return (
            <PhotoGridWrap>
                <PhotoLoadingPlaceholder>Ładowanie zdjęć...</PhotoLoadingPlaceholder>
            </PhotoGridWrap>
        );
    }

    if (photos.length === 0) {
        return (
            <PhotoGridWrap>
                <NoPhotosHint>Brak zdjęć dodanych do tej wizyty</NoPhotosHint>
            </PhotoGridWrap>
        );
    }

    const allSelected = photos.length > 0 && photos.every(p => selectedIds.has(p.id));
    const allIds = photos.map(p => p.id);

    return (
        <PhotoGridWrap>
            <PhotoGridHeader>
                <PhotoGridCount>
                    {selectedIds.size} z {photos.length} wybranych
                </PhotoGridCount>
                <SelectAllBtn
                    type="button"
                    onClick={() => allSelected ? onDeselectAll() : onSelectAll(allIds)}
                >
                    {allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                </SelectAllBtn>
            </PhotoGridHeader>

            <PhotoGrid>
                {photos.map(photo => (
                    <PhotoItem
                        key={photo.id}
                        $selected={selectedIds.has(photo.id)}
                        onClick={() => onTogglePhoto(photo.id)}
                        title={photo.fileName}
                    >
                        <PhotoThumb src={photo.thumbnailUrl} alt={photo.fileName} loading="lazy" />
                        <PhotoCheckOverlay $selected={selectedIds.has(photo.id)}>
                            <CheckIcon />
                        </PhotoCheckOverlay>
                    </PhotoItem>
                ))}
            </PhotoGrid>
        </PhotoGridWrap>
    );
};

/* ─── Attachment Checkbox Row ────────────────────────────────────────────────── */

interface AttachmentCheckboxProps {
    icon: ReactNode;
    label: string;
    suffix?: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
    children?: ReactNode;
}

const AttachmentCheckbox = ({ icon, label, suffix, checked, disabled, onChange, children }: AttachmentCheckboxProps) => (
    <div>
        <AttachmentRow $disabled={disabled}>
            <HiddenCheckbox checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
            <Checkbox $checked={checked}>
                <CheckIcon />
            </Checkbox>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <span style={{ width: 15, height: 15, display: 'flex', alignItems: 'center', color: checked ? '#3B82F6' : '#94A3B8', flexShrink: 0 }}>
                    {icon}
                </span>
                <AttachmentText $checked={checked}>{label}</AttachmentText>
                {suffix && <AttachmentSuffix>{suffix}</AttachmentSuffix>}
            </span>
        </AttachmentRow>
        {children}
    </div>
);

/* ─── Notification Card ──────────────────────────────────────────────────────── */

interface NotifCardToggleProps {
    icon: ReactNode;
    label: string;
    description: string;
    active: boolean;
    disabled?: boolean;
    disabledHint?: string;
    onToggle: () => void;
    children?: ReactNode;
}

const NotifCardToggle = ({ icon, label, description, active, disabled, disabledHint, onToggle, children }: NotifCardToggleProps) => (
    <NotifCard $active={active && !disabled}>
        <NotifCardHeader
            onClick={disabled ? undefined : onToggle}
            style={disabled ? { cursor: 'not-allowed', opacity: 0.6 } : undefined}
        >
            <NotifIconWrap $active={active && !disabled}>{icon}</NotifIconWrap>
            <NotifLabelGroup>
                <NotifLabel $active={active && !disabled}>{label}</NotifLabel>
                <NotifDescription>{disabled && disabledHint ? disabledHint : description}</NotifDescription>
            </NotifLabelGroup>
            <ToggleTrack $on={active && !disabled} />
        </NotifCardHeader>
        {children}
    </NotifCard>
);

/* ─── Main Export ────────────────────────────────────────────────────────────── */

interface NotificationSectionProps {
    visitId: string;
    hasProtocol: boolean;
    visitWelcomeEnabled: boolean;
    /** Adres e-mail klienta wizyty; pusty blokuje wysyłkę do czasu uzupełnienia. */
    customerEmail?: string | null;
    /** Wywoływane po zapisaniu brakującego adresu, żeby rodzic odświeżył swój stan. */
    onCustomerEmailSaved?: (email: string) => void;
    options: NotificationOptions;
    onChange: (options: NotificationOptions) => void;
}

export const NotificationSection = ({ visitId, hasProtocol, visitWelcomeEnabled, customerEmail, onCustomerEmailSaved, options, onChange }: NotificationSectionProps) => {
    const comms = useCapability('COMM_SEND_TRANSACTIONAL');
    const { visitCardActive } = useVisitCardSettings();
    // Reguła SMS-a z linkiem do Karty Wizyty ma własny szablon i przełącznik w
    // Ustawieniach → Szablony SMS, domyślnie wyłączony i z pustym szablonem - tak jak
    // świeże/wyczyszczone konto. Bez tego pola przełącznik wyglądał na aktywny, mimo
    // że backend i tak nic by nie wysłał (brak skonfigurowanej treści wiadomości).
    const { data: automationConfig } = useQuery({
        queryKey: ['sms-automation-config'],
        queryFn: () => import('@/modules/sms-campaigns/api/smsCampaignsApi').then(m => m.fetchAutomationConfig()),
    });
    const visitCardLinkSmsEnabled = automationConfig?.visitCardLink?.enabled ?? true;
    const { sendEmail, sendVisitCard, emailOptions } = options;
    const hasCustomerEmail = !!customerEmail?.trim();
    const emailDisabled = !visitWelcomeEnabled || !hasCustomerEmail;

    // Neutralize, don't just blur: the section is controlled by the parent and its
    // defaults can arrive as true; a blurred checkbox still submits its value.
    useEffect(() => {
        if (!comms.isLoading && !comms.enabled && (options.sendEmail || options.sendVisitCard)) {
            onChange({ ...options, sendEmail: false, sendVisitCard: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comms.isLoading, comms.enabled, options.sendEmail, options.sendVisitCard]);
    // Brak adresu = brak wysyłki: sam wyszarzony przełącznik nie wystarczy,
    // bo domyślne opcje przychodzą z rodzica z sendEmail = true.
    useEffect(() => {
        if (!hasCustomerEmail && options.sendEmail) {
            onChange({ ...options, sendEmail: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasCustomerEmail, options.sendEmail]);

    // Ten sam powód co przy e-mailu: sam brak przełącznika nie wystarczy, bo domyślna
    // wartość przychodzi z ustawień studia i może być włączona mimo wyłączonej Karty
    // albo mimo pustego szablonu SMS-a z linkiem do niej.
    useEffect(() => {
        if (sendVisitCard && (!visitCardActive || !visitCardLinkSmsEnabled)) {
            onChange({ ...options, sendVisitCard: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sendVisitCard, visitCardActive, visitCardLinkSmsEnabled]);

    // Jeden link dla rezerwacji i wizyty: jeśli poszedł już przy rezerwacji, mówimy o tym
    // i raz - przy pierwszym wczytaniu - zdejmujemy domyślne „wyślij". Operator może
    // włączyć je z powrotem; nie blokujemy, tylko informujemy.
    const { data: cardLink } = useQuery({
        queryKey: ['visit-card-link', visitId],
        queryFn: () => visitCardApi.getCardLink(visitId),
        enabled: visitCardActive && !!visitId,
        staleTime: 30_000,
    });
    const alreadySent = describeVisitCardAlreadySent(cardLink);
    const suggestedRef = useRef(false);
    useEffect(() => {
        if (alreadySent && sendVisitCard && !suggestedRef.current) {
            suggestedRef.current = true;
            onChange({ ...options, sendVisitCard: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alreadySent?.sentAt]);

    const { attachProtocol, attachPhotos, selectedPhotoIds, attachDamageMap } = emailOptions;

    const updateEmailOptions = (patch: Partial<typeof emailOptions>) =>
        onChange({ ...options, emailOptions: { ...emailOptions, ...patch } });

    const handleTogglePhoto = (photoId: string) => {
        const next = new Set(selectedPhotoIds);
        if (next.has(photoId)) next.delete(photoId);
        else next.add(photoId);
        updateEmailOptions({ selectedPhotoIds: next });
    };

    return (
        <Section>
            <SectionHeader>
                <SectionTitleIcon><BellIcon /></SectionTitleIcon>
                <SectionTitle>Powiadomienia dla klienta</SectionTitle>
            </SectionHeader>

            <LockedSection
                locked={!comms.enabled}
                message="Powiadomienia SMS/e-mail wymagają modułu Automatyzacja kontaktu z klientem."
            >

            <NotifCardToggle
                icon={<EmailIcon />}
                label="Wyślij e-mail potwierdzający"
                description="Szczegółowe potwierdzenie z danymi wizyty"
                active={sendEmail}
                disabled={emailDisabled}
                disabledHint={!visitWelcomeEnabled
                    ? 'Wyłączone globalnie w konfiguracji e-mail'
                    : 'Niedostępne - brak adresu e-mail klienta'}
                onToggle={() => onChange({ ...options, sendEmail: !sendEmail })}
            >
                {visitWelcomeEnabled && !hasCustomerEmail && (
                    <MissingCustomerEmail
                        visitId={visitId}
                        onSaved={email => {
                            // Adres uzupełniony w locie - włączamy wysyłkę, po którą
                            // użytkownik tu przyszedł, zamiast kazać klikać przełącznik.
                            onChange({ ...options, sendEmail: true });
                            onCustomerEmailSaved?.(email);
                        }}
                    />
                )}

                <EmailBody $visible={sendEmail && hasCustomerEmail}>
                    <EmailBodyInner>
                        <AttachmentsLabel>Załączniki do e-maila</AttachmentsLabel>
                        <AttachmentsList>

                            <AttachmentCheckbox
                                icon={<DocumentIcon />}
                                label="Protokół przyjęcia pojazdu"
                                checked={attachProtocol && hasProtocol}
                                disabled={!hasProtocol || !hasCustomerEmail}
                                onChange={v => updateEmailOptions({ attachProtocol: v })}
                            />

                            <AttachmentCheckbox
                                icon={<PhotoIcon />}
                                label="Zdjęcia pojazdu"
                                suffix={attachPhotos && selectedPhotoIds.size > 0 ? `(${selectedPhotoIds.size})` : undefined}
                                checked={attachPhotos}
                                disabled={!hasCustomerEmail}
                                onChange={v => updateEmailOptions({
                                    attachPhotos: v,
                                    selectedPhotoIds: v ? selectedPhotoIds : new Set(),
                                })}
                            >
                                {attachPhotos && hasCustomerEmail && (
                                    <PhotoSelector
                                        visitId={visitId}
                                        selectedIds={selectedPhotoIds}
                                        onTogglePhoto={handleTogglePhoto}
                                        onSelectAll={ids => updateEmailOptions({ selectedPhotoIds: new Set(ids) })}
                                        onDeselectAll={() => updateEmailOptions({ selectedPhotoIds: new Set() })}
                                    />
                                )}
                            </AttachmentCheckbox>

                            <AttachmentCheckbox
                                icon={<DamageIcon />}
                                label="Model uszkodzeń pojazdu"
                                checked={attachDamageMap}
                                disabled={!hasCustomerEmail}
                                onChange={v => updateEmailOptions({ attachDamageMap: v })}
                            />

                        </AttachmentsList>
                    </EmailBodyInner>
                </EmailBody>
            </NotifCardToggle>

            {visitCardActive && (
                <NotifCardToggle
                    icon={<SmsIcon />}
                    label="Wyślij SMS z linkiem do Karty Wizyty"
                    description="Klient otworzy Kartę Wizyty i sam domówi dodatkowe usługi"
                    active={sendVisitCard}
                    disabled={!visitCardLinkSmsEnabled}
                    disabledHint="Wyłączone globalnie w konfiguracji SMS"
                    onToggle={() => onChange({ ...options, sendVisitCard: !sendVisitCard })}
                />
            )}
            {visitCardActive && alreadySent && (
                <AlreadySentNotice role="note">
                    {alreadySent.text}
                    {sendVisitCard && ' Włączyłeś wysyłkę mimo to - klient dostanie link drugi raz.'}
                </AlreadySentNotice>
            )}
            </LockedSection>
        </Section>
    );
};
