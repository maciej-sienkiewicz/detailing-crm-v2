// Main exports
export * from './types';
export * from './api/useProtocols';
export { protocolsApi } from './api/protocolsApi';

// Components
export { ProtocolRulesView } from './views/ProtocolRulesView';
export { ProtocolDemoView } from './views/ProtocolDemoView';
export { ProtocolChecklist } from './components/ProtocolChecklist';
export { ProtocolRuleCard } from './components/ProtocolRuleCard';
export { ProtocolTemplateModal } from './components/ProtocolTemplateModal';
export { ProtocolRuleModal } from './components/ProtocolRuleModal';

// Initialize mock interceptor
import { apiClient } from '../../core/apiClient';
import { setupProtocolMockInterceptor } from './api/mockProtocolsInterceptor';

setupProtocolMockInterceptor(apiClient);
