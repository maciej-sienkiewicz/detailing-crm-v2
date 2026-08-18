// src/modules/comms/index.ts
export { useCommsSocket, useUnreadMailCount } from './hooks/useComms';
export { useNewLeadsCount } from './hooks/useLeads';
export type {
    CommThread,
    CommMessage,
    Lead,
    LeadStatus,
    LeadSource,
    MailAccountState,
} from './types';
