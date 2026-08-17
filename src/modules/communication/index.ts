// src/modules/communication/index.ts
// Uwaga: komponenty (m.in. LeadCard) nie są re-eksportowane z poziomu modułu,
// żeby nie kolidowały nazwami z typami kontraktu API (LeadCard).
export * from './types';
export * from './hooks';
export * from './views';
export { communicationApi } from './api/communicationApi';
