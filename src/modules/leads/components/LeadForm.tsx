// src/modules/leads/components/LeadForm.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { Button, ButtonGroup } from '@/common/components/Button';
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
  // Validate contact identifier based on source
  if (data.source === LeadSource.EMAIL) {
    return isEmail(data.contactIdentifier);
  }
  if (data.source === LeadSource.PHONE) {
    return isPhoneNumber(data.contactIdentifier);
  }
  // Manual: accept either
  return isPhoneNumber(data.contactIdentifier) || isEmail(data.contactIdentifier);
}, {
  message: 'Podaj prawidłowy format kontaktu (telefon lub e-mail)',
  path: ['contactIdentifier'],
});

type LeadFormData = z.infer<typeof leadFormSchema>;

// Styled Components
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.lg};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xs};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${props => props.theme.spacing.md};

  @media (min-width: ${props => props.theme.breakpoints.sm}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Label = styled.label`
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  color: ${props => props.theme.colors.text};
`;

const Input = styled.input<{ $hasError?: boolean }>`
  padding: ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.fontSizes.md};
  border: 1.5px solid ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  transition: all ${props => props.theme.transitions.fast};
  outline: none;

  &:focus {
    border-color: ${props => props.$hasError ? props.theme.colors.error : 'var(--brand-primary)'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(14, 165, 233, 0.15)'};
  }

  &::placeholder {
    color: ${props => props.theme.colors.textMuted};
  }
`;

const TextArea = styled.textarea<{ $hasError?: boolean }>`
  padding: ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.fontSizes.md};
  border: 1.5px solid ${props => props.$hasError ? props.theme.colors.error : props.theme.colors.border};
  border-radius: ${props => props.theme.radii.md};
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  transition: all ${props => props.theme.transitions.fast};
  outline: none;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;

  &:focus {
    border-color: ${props => props.$hasError ? props.theme.colors.error : 'var(--brand-primary)'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(220, 38, 38, 0.1)' : 'rgba(14, 165, 233, 0.15)'};
  }

  &::placeholder {
    color: ${props => props.theme.colors.textMuted};
  }
`;

const ErrorMessage = styled.span`
  font-size: ${props => props.theme.fontSizes.xs};
  color: ${props => props.theme.colors.error};
  margin-top: 2px;
`;

const CurrencyInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const CurrencyInput = styled(Input)`
  padding-right: 60px;
`;

const CurrencySuffix = styled.span`
  position: absolute;
  right: ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.fontSizes.sm};
  color: ${props => props.theme.colors.textMuted};
  font-weight: ${props => props.theme.fontWeights.medium};
  pointer-events: none;
`;

const SourceToggleGroup = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.xs};
  background: ${props => props.theme.colors.surfaceAlt};
  padding: 4px;
  border-radius: ${props => props.theme.radii.md};
`;

const SourceToggle = styled.button<{ $isActive: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.xs};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.fontSizes.sm};
  font-weight: ${props => props.theme.fontWeights.medium};
  border: none;
  border-radius: ${props => props.theme.radii.sm};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.fast};

  background: ${props => props.$isActive ? props.theme.colors.surface : 'transparent'};
  color: ${props => props.$isActive ? 'var(--brand-primary)' : props.theme.colors.textSecondary};
  box-shadow: ${props => props.$isActive ? props.theme.shadows.sm : 'none'};

  &:hover {
    background: ${props => props.$isActive ? props.theme.colors.surface : 'rgba(0,0,0,0.05)'};
  }
`;

const Toast = styled.div<{ $show: boolean; $type: 'success' | 'error' }>`
  position: fixed;
  bottom: ${props => props.$show ? props.theme.spacing.xl : '-100px'};
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.$type === 'success' ? props.theme.colors.success : props.theme.colors.error};
  color: white;
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
  border-radius: ${props => props.theme.radii.lg};
  box-shadow: ${props => props.theme.shadows.xl};
  transition: bottom ${props => props.theme.transitions.normal};
  z-index: 10000;
`;

const FormFooter = styled.div`
  border-top: 1px solid ${props => props.theme.colors.border};
  padding-top: ${props => props.theme.spacing.lg};
  margin-top: ${props => props.theme.spacing.md};
`;

// Icons
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const ManualIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

interface LeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  editLead?: Lead; // If provided, form is in edit mode
}

export const LeadForm: React.FC<LeadFormProps> = ({ isOpen, onClose, editLead }) => {
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const [toast, setToast] = React.useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

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

  // Reset form when modal opens/closes or editLead changes
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
      case LeadSource.PHONE:
        return '+48 123 456 789';
      case LeadSource.EMAIL:
        return 'jan.kowalski@example.com';
      default:
        return 'Telefon lub e-mail';
    }
  };

  const getContactLabel = () => {
    switch (selectedSource) {
      case LeadSource.PHONE:
        return 'Numer telefonu';
      case LeadSource.EMAIL:
        return 'Adres e-mail';
      default:
        return t.leads?.fields?.contact || 'Kontakt';
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

  const onSubmit = async (data: LeadFormData) => {
    try {
      const estimatedValue = parseCurrencyToGrosze(data.estimatedValueDisplay);

      if (isEditMode && editLead) {
        await updateLead.mutateAsync({
          id: editLead.id,
          customerName: data.customerName || undefined,
          initialMessage: data.initialMessage || undefined,
          estimatedValue,
        });
        showToast('Lead został zaktualizowany', 'success');
      } else {
        const request: CreateLeadRequest = {
          source: data.source,
          contactIdentifier: data.contactIdentifier,
          customerName: data.customerName || undefined,
          initialMessage: data.initialMessage || undefined,
          estimatedValue,
        };
        await createLead.mutateAsync(request);
        showToast('Lead został dodany', 'success');
      }

      setTimeout(onClose, 1000);
    } catch {
      showToast('Wystąpił błąd podczas zapisywania', 'error');
    }
  };

  const modalTitle = isEditMode ? 'Edytuj lead' : (t.leads?.actions?.add || 'Dodaj lead');

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="500px">
        <Form onSubmit={handleSubmit(onSubmit)} id="lead-form">
          {/* Source Selection - only for new leads */}
          {!isEditMode && (
            <FormGroup>
              <Label>{t.leads?.fields?.source || 'Źródło'}</Label>
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
            </FormGroup>
          )}

          <FormRow>
            {/* Contact Identifier */}
            <FormGroup>
              <Label>{getContactLabel()}</Label>
              <Input
                {...register('contactIdentifier')}
                placeholder={getContactPlaceholder()}
                $hasError={!!errors.contactIdentifier}
                disabled={isEditMode} // Can't change contact in edit mode
              />
              {errors.contactIdentifier && (
                <ErrorMessage>{errors.contactIdentifier.message}</ErrorMessage>
              )}
            </FormGroup>

            {/* Customer Name */}
            <FormGroup>
              <Label>{t.leads?.fields?.name || 'Klient'}</Label>
              <Input
                {...register('customerName')}
                placeholder="Jan Kowalski"
                $hasError={!!errors.customerName}
              />
              {errors.customerName && (
                <ErrorMessage>{errors.customerName.message}</ErrorMessage>
              )}
            </FormGroup>
          </FormRow>

          {/* Estimated Value */}
          <FormGroup>
            <Label>{t.leads?.fields?.estimatedValue || 'Szacowana wartość'}</Label>
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
              <ErrorMessage>{errors.estimatedValueDisplay.message}</ErrorMessage>
            )}
          </FormGroup>

          {/* Initial Message / Notes */}
          <FormGroup>
            <Label>Notatka / Wymagania</Label>
            <TextArea
              {...register('initialMessage')}
              placeholder="Opisz wstępne wymagania klienta..."
              $hasError={!!errors.initialMessage}
            />
            {errors.initialMessage && (
              <ErrorMessage>{errors.initialMessage.message}</ErrorMessage>
            )}
          </FormGroup>

          <FormFooter>
            <ButtonGroup $justify="end">
              <Button type="button" onClick={onClose} $variant="secondary">
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                $variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Zapisywanie...' : t.common.save}
              </Button>
            </ButtonGroup>
          </FormFooter>
        </Form>
      </Modal>

      <Toast $show={toast.show} $type={toast.type}>
        {toast.message}
      </Toast>
    </>
  );
};
