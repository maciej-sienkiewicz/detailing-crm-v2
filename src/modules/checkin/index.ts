export { CheckInWizardView } from './views/CheckInWizardView';
export { MobilePhotoUploadView } from './views/MobilePhotoUploadView';

export { VerificationStep } from './components/VerificationStep';
export { TechnicalStateStep } from './components/TechnicalStateStep';
export { PhotoDocumentationStep } from './components/PhotoDocumentationStep';
export { SummaryStep } from './components/SummaryStep';

export { useCheckInWizard } from './hooks/useCheckInWizard';
export { usePhotoUpload } from './hooks/usePhotoUpload';
export { useMobilePhotoUpload } from './hooks/useMobilePhotoUpload';
export { useCheckInValidation } from './hooks/useCheckInValidation';

export { checkinApi } from './api/checkinApi';

export type {
    CheckInFormData,
    CheckInStep,
    FuelLevel,
    PhotoSlotType,
    DamagePhotoType,
    PhotoSlot,
    DepositItem,
    ReservationToVisitPayload,
    MobileUploadSession,
    UploadPhotoPayload,
    PhotoUploadResponse,
} from './types';