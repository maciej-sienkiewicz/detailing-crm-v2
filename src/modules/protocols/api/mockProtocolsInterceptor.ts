import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { mockProtocolTemplates, mockProtocolRules } from './mockProtocols';
import type { ProtocolTemplate, ProtocolRule, VisitProtocol } from '../types';

// Flag to enable/disable mocks - set to false when backend is ready
export const USE_PROTOCOL_MOCKS = false;

let mockProtocolTemplatesData = [...mockProtocolTemplates];
let mockProtocolRulesData = [...mockProtocolRules];

// Helper to generate mock VisitProtocol based on rules
const generateMockVisitProtocols = (visitId: string): VisitProtocol[] => {
    // For demo purposes, generate protocols for a mock visit
    return [
        {
            id: 'vp-1',
            visitId,
            protocolTemplateId: 'pt-1',
            protocolTemplate: mockProtocolTemplates[0],
            stage: 'CHECK_IN',
            isMandatory: true,
            isSigned: true,
            signedAt: '2024-01-15T10:30:00Z',
            signedBy: 'Jan Kowalski',
            signatureUrl: '/signatures/sig-1.png',
            createdAt: '2024-01-15T09:00:00Z',
            updatedAt: '2024-01-15T10:30:00Z',
        },
        {
            id: 'vp-2',
            visitId,
            protocolTemplateId: 'pt-2',
            protocolTemplate: mockProtocolTemplates[1],
            stage: 'CHECK_IN',
            isMandatory: true,
            isSigned: false,
            createdAt: '2024-01-15T09:00:00Z',
            updatedAt: '2024-01-15T09:00:00Z',
        },
        {
            id: 'vp-3',
            visitId,
            protocolTemplateId: 'pt-3',
            protocolTemplate: mockProtocolTemplates[2],
            stage: 'CHECK_IN',
            isMandatory: true,
            isSigned: false,
            createdAt: '2024-01-15T09:00:00Z',
            updatedAt: '2024-01-15T09:00:00Z',
        },
        {
            id: 'vp-4',
            visitId,
            protocolTemplateId: 'pt-5',
            protocolTemplate: mockProtocolTemplates[4],
            stage: 'CHECK_OUT',
            isMandatory: true,
            isSigned: false,
            createdAt: '2024-01-15T09:00:00Z',
            updatedAt: '2024-01-15T09:00:00Z',
        },
        {
            id: 'vp-5',
            visitId,
            protocolTemplateId: 'pt-4',
            protocolTemplate: mockProtocolTemplates[3],
            stage: 'CHECK_OUT',
            isMandatory: true,
            isSigned: false,
            createdAt: '2024-01-15T09:00:00Z',
            updatedAt: '2024-01-15T09:00:00Z',
        },
        {
            id: 'vp-6',
            visitId,
            protocolTemplateId: 'pt-8',
            protocolTemplate: mockProtocolTemplates[7],
            stage: 'CHECK_OUT',
            isMandatory: false,
            isSigned: false,
            createdAt: '2024-01-15T09:00:00Z',
            updatedAt: '2024-01-15T09:00:00Z',
        },
    ];
};

const createMockResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
});

export const setupProtocolMockInterceptor = (apiClient: AxiosInstance) => {
    if (!USE_PROTOCOL_MOCKS) {
        return;
    }

    console.log('[Mock] Protocol mock interceptor enabled');

    apiClient.interceptors.request.use(
        async (config) => {
            const url = config.url || '';

            // Protocol Templates
            if (url.match(/^\/api\/v1\/protocol-templates$/)) {
                if (config.method === 'get') {
                    return Promise.reject({
                        config,
                        response: createMockResponse(mockProtocolTemplatesData),
                    });
                }
                if (config.method === 'post') {
                    const newTemplate: ProtocolTemplate = {
                        ...JSON.parse(config.data),
                        id: `pt-${Date.now()}`,
                        isActive: true,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    mockProtocolTemplatesData.push(newTemplate);
                    return Promise.reject({
                        config,
                        response: createMockResponse(newTemplate),
                    });
                }
            }

            if (url.match(/^\/api\/v1\/protocol-templates\/[^/]+$/)) {
                const id = url.split('/').pop();
                if (config.method === 'get') {
                    const template = mockProtocolTemplatesData.find(t => t.id === id);
                    return Promise.reject({
                        config,
                        response: createMockResponse(template),
                    });
                }
                if (config.method === 'patch') {
                    const index = mockProtocolTemplatesData.findIndex(t => t.id === id);
                    if (index >= 0) {
                        mockProtocolTemplatesData[index] = {
                            ...mockProtocolTemplatesData[index],
                            ...JSON.parse(config.data),
                            updatedAt: new Date().toISOString(),
                        };
                        return Promise.reject({
                            config,
                            response: createMockResponse(mockProtocolTemplatesData[index]),
                        });
                    }
                }
                if (config.method === 'delete') {
                    mockProtocolTemplatesData = mockProtocolTemplatesData.filter(t => t.id !== id);
                    return Promise.reject({
                        config,
                        response: createMockResponse({}),
                    });
                }
            }

            // Protocol Rules
            if (url.match(/^\/api\/v1\/protocol-rules$/)) {
                if (config.method === 'get') {
                    return Promise.reject({
                        config,
                        response: createMockResponse(mockProtocolRulesData),
                    });
                }
                if (config.method === 'post') {
                    const data = JSON.parse(config.data);
                    const template = mockProtocolTemplatesData.find(t => t.id === data.protocolTemplateId);
                    const newRule: ProtocolRule = {
                        ...data,
                        id: `pr-${Date.now()}`,
                        protocolTemplate: template,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    mockProtocolRulesData.push(newRule);
                    return Promise.reject({
                        config,
                        response: createMockResponse(newRule),
                    });
                }
            }

            if (url.match(/^\/api\/v1\/protocol-rules\/[^/]+$/)) {
                const id = url.split('/').pop();
                if (config.method === 'patch') {
                    const index = mockProtocolRulesData.findIndex(r => r.id === id);
                    if (index >= 0) {
                        mockProtocolRulesData[index] = {
                            ...mockProtocolRulesData[index],
                            ...JSON.parse(config.data),
                            updatedAt: new Date().toISOString(),
                        };
                        return Promise.reject({
                            config,
                            response: createMockResponse(mockProtocolRulesData[index]),
                        });
                    }
                }
                if (config.method === 'delete') {
                    mockProtocolRulesData = mockProtocolRulesData.filter(r => r.id !== id);
                    return Promise.reject({
                        config,
                        response: createMockResponse({}),
                    });
                }
            }

            // Visit Protocols
            if (url.match(/^\/api\/v1\/visits\/[^/]+\/protocols$/)) {
                const visitId = url.split('/')[4];
                if (config.method === 'get') {
                    const protocols = generateMockVisitProtocols(visitId);
                    return Promise.reject({
                        config,
                        response: createMockResponse(protocols),
                    });
                }
            }

            if (url.match(/^\/api\/v1\/visits\/[^/]+\/protocols\/[^/]+\/sign$/)) {
                const urlParts = url.split('/');
                const visitId = urlParts[4];
                const protocolId = urlParts[6];

                if (config.method === 'post') {
                    const protocols = generateMockVisitProtocols(visitId);
                    const protocol = protocols.find(p => p.id === protocolId);
                    if (protocol) {
                        const signedProtocol = {
                            ...protocol,
                            isSigned: true,
                            signedAt: new Date().toISOString(),
                            ...JSON.parse(config.data),
                        };
                        return Promise.reject({
                            config,
                            response: createMockResponse(signedProtocol),
                        });
                    }
                }
            }

            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor to handle the mock responses
    apiClient.interceptors.response.use(
        (response) => response,
        (error) => {
            // If this is a mock response, resolve with the mock data
            if (error.response && error.config) {
                return Promise.resolve(error.response);
            }
            return Promise.reject(error);
        }
    );
};
