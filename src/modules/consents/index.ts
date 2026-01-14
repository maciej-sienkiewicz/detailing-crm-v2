/**
 * Public API for the consents module.
 */

// Components
export { ConsentSettingsView } from './components/ConsentSettingsView';

// Types
export type {
    ConsentDefinition,
    ConsentTemplate,
    ConsentDefinitionWithTemplate,
    ConsentStatus,
    CustomerConsent,
    CustomerConsentDetails,
} from './types';

// Hooks
export {
    useConsentDefinitions,
    useConsentDefinition,
    useConsentTemplates,
    useCreateDefinition,
    useUploadTemplate,
    useSetTemplateActive,
    useCustomerConsents,
    useSignConsent,
} from './hooks/useConsents';

// API
export { consentsApi } from './api/consentsApi';
