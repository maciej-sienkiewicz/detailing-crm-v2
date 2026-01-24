/**
 * Dashboard API
 * Handles data fetching for dashboard statistics and metrics
 * Supports mock data mode for development and testing
 */

import type { DashboardData, IncomingCall } from '../types';

const USE_MOCKS = true;

/**
 * Mock dashboard data with realistic business metrics
 */
const mockDashboardData: DashboardData = {
  stats: {
    inProgress: 8,
    readyForPickup: 3,
    incomingToday: 5,
  },
  revenue: {
    currentValue: 25000,
    previousValue: 21000,
    deltaPercentage: 19.05,
    unit: 'PLN',
  },
  callActivity: {
    currentValue: 42,
    previousValue: 35,
    deltaPercentage: 20.0,
    unit: 'calls',
  },
  recentCalls: [
    {
      id: '1',
      phoneNumber: '+48501234567',
      contactName: 'Jan Kowalski',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      note: 'Pytanie o cennik detailingu',
    },
    {
      id: '2',
      phoneNumber: '+48602345678',
      contactName: 'Anna Nowak',
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
    },
    {
      id: '3',
      phoneNumber: '+48793456789',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      note: 'Zainteresowany pakietem premium',
    },
    {
      id: '4',
      phoneNumber: '+48664567890',
      contactName: 'Piotr Wiśniewski',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    },
  ],
};

/**
 * Mock implementation of getStats with simulated network delay
 */
const mockGetStats = async (): Promise<DashboardData> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockDashboardData);
    }, 800);
  });
};

/**
 * Dashboard API methods
 */
export const dashboardApi = {
  /**
   * Fetches current dashboard statistics and metrics
   * @returns Promise resolving to dashboard data
   */
  getStats: async (): Promise<DashboardData> => {
    if (USE_MOCKS) {
      return mockGetStats();
    }

    // TODO: Replace with actual API call when backend is ready
    // const response = await apiClient.get('/v1/dashboard/stats');
    // return response.data;

    throw new Error('Real API not implemented yet');
  },

  /**
   * Accepts an incoming call and converts it to a customer/lead
   * @param callId - ID of the call to accept
   */
  acceptCall: async (callId: string): Promise<void> => {
    if (USE_MOCKS) {
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(`[Mock] Accepted call: ${callId}`);
          resolve();
        }, 500);
      });
    }

    // TODO: Replace with actual API call
    // await apiClient.post(`/v1/dashboard/calls/${callId}/accept`);
    throw new Error('Real API not implemented yet');
  },

  /**
   * Rejects/dismisses an incoming call
   * @param callId - ID of the call to reject
   */
  rejectCall: async (callId: string): Promise<void> => {
    if (USE_MOCKS) {
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(`[Mock] Rejected call: ${callId}`);
          resolve();
        }, 500);
      });
    }

    // TODO: Replace with actual API call
    // await apiClient.post(`/v1/dashboard/calls/${callId}/reject`);
    throw new Error('Real API not implemented yet');
  },

  /**
   * Updates call information
   * @param callId - ID of the call to update
   * @param data - Updated call data
   */
  updateCall: async (
    callId: string,
    data: Partial<Pick<IncomingCall, 'contactName' | 'note'>>
  ): Promise<void> => {
    if (USE_MOCKS) {
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(`[Mock] Updated call ${callId}:`, data);
          resolve();
        }, 500);
      });
    }

    // TODO: Replace with actual API call
    // await apiClient.patch(`/v1/dashboard/calls/${callId}`, data);
    throw new Error('Real API not implemented yet');
  },
};
