/**
 * Dashboard API
 * Handles data fetching for dashboard statistics and metrics
 * Supports mock data mode for development and testing
 */

import type { DashboardData, IncomingCall } from '../types';
import {apiClient} from "@/core";

const USE_MOCKS = true;

/**
 * Mock dashboard data with realistic business metrics
 */
const mockDashboardData: DashboardData = {
  stats: {
    inProgress: 8,
    readyForPickup: 3,
    incomingToday: 5,
    inProgressDetails: [
      {
        id: 'v1',
        brand: 'BMW',
        model: 'X5',
        amount: 1200,
        customerFirstName: 'Jan',
        customerLastName: 'Kowalski',
        phoneNumber: '+48501234567',
      },
      {
        id: 'v2',
        brand: 'Audi',
        model: 'A6',
        amount: 850,
        customerFirstName: 'Anna',
        customerLastName: 'Nowak',
        phoneNumber: '+48602345678',
      },
      {
        id: 'v3',
        brand: 'Mercedes',
        model: 'C-Class',
        amount: 950,
        customerFirstName: 'Piotr',
        customerLastName: 'Wiśniewski',
      },
      {
        id: 'v4',
        brand: 'Volkswagen',
        model: 'Passat',
        amount: 650,
        customerFirstName: 'Ewa',
        customerLastName: 'Lewandowska',
        phoneNumber: '+48793456789',
      },
      {
        id: 'v5',
        brand: 'Toyota',
        model: 'Camry',
        amount: 700,
        customerFirstName: 'Marek',
        customerLastName: 'Zieliński',
        phoneNumber: '+48664567890',
      },
      {
        id: 'v6',
        brand: 'Ford',
        model: 'Mondeo',
        amount: 550,
        customerFirstName: 'Katarzyna',
        customerLastName: 'Wójcik',
      },
      {
        id: 'v7',
        brand: 'Skoda',
        model: 'Octavia',
        amount: 500,
        customerFirstName: 'Tomasz',
        customerLastName: 'Kowalczyk',
        phoneNumber: '+48505678901',
      },
      {
        id: 'v8',
        brand: 'Porsche',
        model: 'Cayenne',
        amount: 2100,
        customerFirstName: 'Robert',
        customerLastName: 'Kamiński',
        phoneNumber: '+48606789012',
      },
    ],
    readyForPickupDetails: [
      {
        id: 'v9',
        brand: 'Tesla',
        model: 'Model 3',
        amount: 1500,
        customerFirstName: 'Michał',
        customerLastName: 'Szymański',
        phoneNumber: '+48797890123',
      },
      {
        id: 'v10',
        brand: 'Mazda',
        model: 'CX-5',
        amount: 800,
        customerFirstName: 'Agnieszka',
        customerLastName: 'Dąbrowska',
        phoneNumber: '+48668901234',
      },
      {
        id: 'v11',
        brand: 'Volvo',
        model: 'XC60',
        amount: 1100,
        customerFirstName: 'Krzysztof',
        customerLastName: 'Krawczyk',
      },
    ],
    incomingTodayDetails: [
      {
        id: 'v12',
        brand: 'Renault',
        model: 'Megane',
        amount: 600,
        customerFirstName: 'Magdalena',
        customerLastName: 'Piotrowski',
        phoneNumber: '+48509012345',
      },
      {
        id: 'v13',
        brand: 'Peugeot',
        model: '508',
        amount: 750,
        customerFirstName: 'Paweł',
        customerLastName: 'Grabowski',
        phoneNumber: '+48610123456',
      },
      {
        id: 'v14',
        brand: 'Hyundai',
        model: 'Tucson',
        amount: 700,
        customerFirstName: 'Joanna',
        customerLastName: 'Pawłowski',
      },
      {
        id: 'v15',
        brand: 'Kia',
        model: 'Sportage',
        amount: 680,
        customerFirstName: 'Andrzej',
        customerLastName: 'Michalski',
        phoneNumber: '+48791234567',
      },
      {
        id: 'v16',
        brand: 'Nissan',
        model: 'Qashqai',
        amount: 650,
        customerFirstName: 'Monika',
        customerLastName: 'Nowakowski',
        phoneNumber: '+48662345678',
      },
    ],
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
  googleReviews: {
    averageRating: 4.8,
    totalReviews: 247,
    newReviews: 12,
    recentReviews: [
      {
        id: 'r1',
        authorName: 'Tomasz K.',
        rating: 5,
        text: 'Profesjonalna obsługa i rewelacyjny efekt! Auto wygląda jak nowe. Polecam szczególnie pakiet premium - wart każdej złotówki.',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        hasReply: true,
      },
      {
        id: 'r2',
        authorName: 'Anna M.',
        rating: 5,
        text: 'Świetny stosunek jakości do ceny. Zespół bardzo pomocny, wszystko dokładnie wytłumaczyli. Z pewnością wrócę!',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        hasReply: true,
      },
      {
        id: 'r3',
        authorName: 'Piotr W.',
        rating: 4,
        text: 'Bardzo dobra jakość detailingu. Jedyne co - trochę dłużej czekałem niż planowano, ale efekt końcowy rekompensuje.',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        hasReply: false,
      },
      {
        id: 'r4',
        authorName: 'Magdalena S.',
        rating: 5,
        text: 'Niesamowite! Usunęli wszystkie zarysowania i auto lśni. Bardzo polecam ceramic coating - rewelacyjna ochrona.',
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        hasReply: true,
      },
      {
        id: 'r5',
        authorName: 'Robert K.',
        rating: 5,
        text: 'Top jakość! Miły i kompetentny zespół. Szczegółowo wszystko omówili przed rozpoczęciem prac.',
        timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
        hasReply: true,
      },
    ],
    competitors: [
      {
        name: 'Auto Detailing Premium',
        rating: 4.9,
        reviewCount: 312,
        position: 1,
        isOurs: false,
      },
      {
        name: 'Twoja Firma', // This will be replaced with actual name
        rating: 4.8,
        reviewCount: 247,
        position: 2,
        isOurs: true,
      },
      {
        name: 'Detailing Pro Center',
        rating: 4.7,
        reviewCount: 189,
        position: 3,
        isOurs: false,
      },
      {
        name: 'Car Care Studio',
        rating: 4.6,
        reviewCount: 156,
        position: 4,
        isOurs: false,
      },
      {
        name: 'Perfect Auto Detailing',
        rating: 4.5,
        reviewCount: 203,
        position: 5,
        isOurs: false,
      },
    ],
  },
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
      const response = await apiClient.get('/v1/dashboard/stats');
      return response.data;
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
