/**
 * Public API for the consents module.
 */

// Components
export { ConsentSettingsView } from './components/ConsentSettingsView';

// Types
export type {
    ConsentResponse,
    ConsentVersionResponse,
    ConsentStatus,
    ConsentStatusItem,
    ConsentStatusResponse,
    CreateConsentRequest,
    AddVersionRequest,
    SignConsentRequest,
    SignConsentResponse,
    ProtocolStage,
} from './types';
export { ConsentStatus as ConsentStatusEnum } from './types';

// Hooks
export {
    useConsentDefinitions,
    useConsentDefinition,
    useCreateDefinition,
    useDeleteDefinition,
    useAddVersion,
    useCustomerConsents,
    useSignConsent,
    useRevokeConsent,
} from './hooks/useConsents';

// API
export { consentsApi } from './api/consentsApi';
