import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVisitPhotos } from '@/modules/visits/hooks';
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
} from './NotificationSection.styles';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface NotificationOptions {
    sendSms: boolean;
    sendEmail: boolean;
    emailOptions: {
        attachProtocol: boolean;
        attachPhotos: boolean;
        selectedPhotoIds: Set<string>;
        attachDamageMap: boolean;
    };
}

export const defaultNotificationOptions = (hasProtocol = true): NotificationOptions => ({
    sendEmail: true,
    emailOptions: {
        attachProtocol: hasProtocol,
        attachPhotos: false,
        selectedPhotoIds: new Set(),
        attachDamageMap: false,
    },
});

export const toConfirmVisitOptions = (opts: NotificationOptions): ConfirmVisitOptions => ({
    sendEmail: opts.sendEmail || undefined,
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
    options: NotificationOptions;
    onChange: (options: NotificationOptions) => void;
}

export const NotificationSection = ({ visitId, hasProtocol, options, onChange }: NotificationSectionProps) => {
    const { sendEmail, emailOptions } = options;
    const { attachProtocol, attachPhotos, selectedPhotoIds, attachDamageMap } = emailOptions;

    const { data: emailAutomationConfig } = useQuery({
        queryKey: ['email-automation-config'],
        queryFn: () => import('@/modules/email-campaigns/api/emailCampaignsApi').then(m => m.fetchEmailAutomationConfig()),
        staleTime: 120_000,
    });
    const visitWelcomeEnabled = emailAutomationConfig?.visitWelcome?.enabled ?? true;

    useEffect(() => {
        if (!visitWelcomeEnabled && options.sendEmail) {
            onChange({ ...options, sendEmail: false });
        }
    }, [visitWelcomeEnabled]);

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

            <NotifCardToggle
                icon={<EmailIcon />}
                label="Wyślij e-mail potwierdzający"
                description="Szczegółowe potwierdzenie z danymi wizyty"
                active={sendEmail}
                disabled={!visitWelcomeEnabled}
                disabledHint="Wyłączone globalnie w konfiguracji e-mail"
                onToggle={() => onChange({ ...options, sendEmail: !sendEmail })}
            >
                <EmailBody $visible={sendEmail}>
                    <EmailBodyInner>
                        <AttachmentsLabel>Załączniki do e-maila</AttachmentsLabel>
                        <AttachmentsList>

                            <AttachmentCheckbox
                                icon={<DocumentIcon />}
                                label="Protokół przyjęcia pojazdu"
                                checked={attachProtocol && hasProtocol}
                                disabled={!hasProtocol}
                                onChange={v => updateEmailOptions({ attachProtocol: v })}
                            />

                            <AttachmentCheckbox
                                icon={<PhotoIcon />}
                                label="Zdjęcia pojazdu"
                                suffix={attachPhotos && selectedPhotoIds.size > 0 ? `(${selectedPhotoIds.size})` : undefined}
                                checked={attachPhotos}
                                onChange={v => updateEmailOptions({
                                    attachPhotos: v,
                                    selectedPhotoIds: v ? selectedPhotoIds : new Set(),
                                })}
                            >
                                {attachPhotos && (
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
                                onChange={v => updateEmailOptions({ attachDamageMap: v })}
                            />

                        </AttachmentsList>
                    </EmailBodyInner>
                </EmailBody>
            </NotifCardToggle>
        </Section>
    );
};
