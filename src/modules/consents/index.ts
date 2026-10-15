/**
 * Public API for the consents module: definicje dokumentów zgód używane w
 * Ustawieniach → Dokumenty. Dawny osobny ekran /consents usunięto.
 */

// Types
export type {
    ConsentResponse,
    ConsentVersionResponse,
    CreateConsentRequest,
    AddVersionRequest,
    ProtocolStage,
} from './types';

// Hooks
export {
    useConsentDefinitions,
    useDeleteDefinition,
} from './hooks/useConsents';

// API
export { consentsApi } from './api/consentsApi';
