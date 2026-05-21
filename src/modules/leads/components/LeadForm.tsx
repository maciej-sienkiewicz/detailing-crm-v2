// src/modules/leads/components/LeadForm.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styled from 'styled-components';
import {
  ModalShell,
  ModalHeader,
  ModalTitleGroup,
  ModalTitle,
  ModalContent,
  ModalFooter,
  CloseBtn,
} from '@/common/components/ModalKit';
import {
  FormFieldGroup,
  FormGrid2Col,
  FormLabel,
  FormInput,
  FormTextarea,
  FormErrorMessage,
  SharedButton,
  SharedButtonGroup,
} from '@/common/styles';
import { t } from '@/common/i18n';
import { LeadSource } from '../types';
import type { CreateLeadRequest, Lead } from '../types';
import { useCreateLead, useUpdateLead } from '../hooks/useLeads';
import { parseCurrencyToGrosze, isPhoneNumber, isEmail } from '../utils/formatters';

// Form validation schema
const leadFormSchema = z.object({
  source: z.nativeEnum(LeadSource),
  contactIdentifier: z.string().min(1, 'Kontakt jest wymagany'),
  customerName: z.string().optional(),
  initialMessage: z.string().optional(),
  estimatedValueDisplay: z.string().min(1, 'Wartość jest wymagana'),
}).refine((data) => {
  if (data.source === LeadSource.EMAIL) {
    return isEmail(data.contactIdentifier);
  }
  if (data.source === LeadSource.PHONE) {
    return isPhoneNumber(data.contactIdentifier);
  }
  return isPhoneNumber(data.contactIdentifier) || isEmail(data.contactIdentifier);
}, {
  message: 'Podaj prawidłowy format kontaktu (telefon lub e-mail)',
  path: ['contactIdentifier'],
});

type LeadFormData = z.infer<typeof leadFormSchema>;

// ─── Local styled components (only what's specific to this form) ──────────────

const CurrencyInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const CurrencyInput = styled(FormInput)`
  padding-right: 56px;
`;

const CurrencySuffix = styled.span`
  position: absolute;
  right: 16px;
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
  pointer-events: none;
`;

const SourceToggleGroup = styled.div`
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 12px;
`;

const SourceToggle = styled.button<{ $isActive: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 180ms ease;

  background: ${p => p.$isActive ? '#ffffff' : 'transparent'};
  color: ${p => p.$isActive ? '#0ea5e9' : '#64748b'};
  box-shadow: ${p => p.$isActive ? '0 1px 4px rgba(0,0,0,0.10)' : 'none'};

  &:hover {
    background: ${p => p.$isActive ? '#ffffff' : 'rgba(0,0,0,0.04)'};
  }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const EmailIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const ManualIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  editLead?: Lead;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const LeadForm: React.FC<LeadFormProps> = ({ isOpen, onClose, editLead }) => {
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const isEditMode = !!editLead;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      source: LeadSource.MANUAL,
      contactIdentifier: '',
      customerName: '',
      initialMessage: '',
      estimatedValueDisplay: '',
    },
  });

  useEffect(() => {
    if (isOpen && editLead) {
      reset({
        source: editLead.source,
        contactIdentifier: editLead.contactIdentifier,
        customerName: editLead.customerName || '',
        initialMessage: editLead.initialMessage || '',
        estimatedValueDisplay: String(editLead.estimatedValue / 100),
      });
    } else if (isOpen) {
      reset({
        source: LeadSource.MANUAL,
        contactIdentifier: '',
        customerName: '',
        initialMessage: '',
        estimatedValueDisplay: '',
      });
    }
  }, [isOpen, editLead, reset]);

  const selectedSource = watch('source');

  const getContactPlaceholder = () => {
    switch (selectedSource) {
      case LeadSource.PHONE: return '+48 123 456 789';
      case LeadSource.EMAIL: return 'jan.kowalski@example.com';
      default:               return 'Telefon lub e-mail';
    }
  };

  const getContactLabel = () => {
    switch (selectedSource) {
      case LeadSource.PHONE: return 'Numer telefonu';
      case LeadSource.EMAIL: return 'Adres e-mail';
      default:               return t.leads?.fields?.contact || 'Kontakt';
    }
  };

  const onSubmit = async (data: LeadFormData) => {
    const estimatedValue = parseCurrencyToGrosze(data.estimatedValueDisplay);

    if (isEditMode && editLead) {
      await updateLead.mutateAsync({
        id: editLead.id,
        customerName: data.customerName || undefined,
        initialMessage: data.initialMessage || undefined,
        estimatedValue,
      });
    } else {
      const request: CreateLeadRequest = {
        source: data.source,
        contactIdentifier: data.contactIdentifier,
        customerName: data.customerName || undefined,
        initialMessage: data.initialMessage || undefined,
        estimatedValue,
      };
      await createLead.mutateAsync(request);
    }

    onClose();
  };

  const modalTitle = isEditMode ? 'Edytuj lead' : (t.leads?.actions?.add || 'Dodaj lead');

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitleGroup>
          <ModalTitle>{modalTitle}</ModalTitle>
        </ModalTitleGroup>
        <CloseBtn onClick={onClose} />
      </ModalHeader>

      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)} id="lead-form" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isEditMode && (
            <FormFieldGroup>
              <FormLabel>{t.leads?.fields?.source || 'Źródło'}</FormLabel>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <SourceToggleGroup>
                    <SourceToggle
                      type="button"
                      $isActive={field.value === LeadSource.PHONE}
                      onClick={() => field.onChange(LeadSource.PHONE)}
                    >
                      <PhoneIcon />
                      {t.leads?.sources?.phone || 'Telefon'}
                    </SourceToggle>
                    <SourceToggle
                      type="button"
                      $isActive={field.value === LeadSource.EMAIL}
                      onClick={() => field.onChange(LeadSource.EMAIL)}
                    >
                      <EmailIcon />
                      {t.leads?.sources?.email || 'E-mail'}
                    </SourceToggle>
                    <SourceToggle
                      type="button"
                      $isActive={field.value === LeadSource.MANUAL}
                      onClick={() => field.onChange(LeadSource.MANUAL)}
                    >
                      <ManualIcon />
                      {t.leads?.sources?.manual || 'Ręczne'}
                    </SourceToggle>
                  </SourceToggleGroup>
                )}
              />
            </FormFieldGroup>
          )}

          <FormGrid2Col>
            <FormFieldGroup>
              <FormLabel>{getContactLabel()}</FormLabel>
              <FormInput
                {...register('contactIdentifier')}
                placeholder={getContactPlaceholder()}
                $hasError={!!errors.contactIdentifier}
                disabled={isEditMode}
              />
              {errors.contactIdentifier && (
                <FormErrorMessage>{errors.contactIdentifier.message}</FormErrorMessage>
              )}
            </FormFieldGroup>

            <FormFieldGroup>
              <FormLabel>{t.leads?.fields?.name || 'Klient'}</FormLabel>
              <FormInput
                {...register('customerName')}
                placeholder="Jan Kowalski"
                $hasError={!!errors.customerName}
              />
              {errors.customerName && (
                <FormErrorMessage>{errors.customerName.message}</FormErrorMessage>
              )}
            </FormFieldGroup>
          </FormGrid2Col>

          <FormFieldGroup>
            <FormLabel>{t.leads?.fields?.estimatedValue || 'Szacowana wartość'}</FormLabel>
            <CurrencyInputWrapper>
              <CurrencyInput
                {...register('estimatedValueDisplay')}
                type="text"
                inputMode="decimal"
                placeholder="2500"
                $hasError={!!errors.estimatedValueDisplay}
              />
              <CurrencySuffix>PLN</CurrencySuffix>
            </CurrencyInputWrapper>
            {errors.estimatedValueDisplay && (
              <FormErrorMessage>{errors.estimatedValueDisplay.message}</FormErrorMessage>
            )}
          </FormFieldGroup>

          <FormFieldGroup>
            <FormLabel>Notatka / Wymagania</FormLabel>
            <FormTextarea
              {...register('initialMessage')}
              placeholder="Opisz wstępne wymagania klienta..."
              $hasError={!!errors.initialMessage}
              rows={3}
            />
            {errors.initialMessage && (
              <FormErrorMessage>{errors.initialMessage.message}</FormErrorMessage>
            )}
          </FormFieldGroup>
        </form>
      </ModalContent>

      <ModalFooter>
        <SharedButtonGroup>
          <SharedButton type="button" $variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </SharedButton>
          <SharedButton
            type="submit"
            form="lead-form"
            $variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Zapisywanie...' : t.common.save}
          </SharedButton>
        </SharedButtonGroup>
      </ModalFooter>
    </ModalShell>
  );
};
