import type {
  SmsCampaign,
  CreateCampaignRequest,
  AudiencePreviewResult,
  SmsAutomationConfig,
  CampaignFilters,
  VehicleBrandOption,
  AgentAudienceRequest,
  AgentAudienceResult,
} from '../types';
import {apiClient} from "@/core";

// ─── Mock flag ────────────────────────────────────────────────────────────────

const USE_MOCKS = true;

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockCampaigns: SmsCampaign[] = [
  {
    id: 'camp-001',
    name: 'Właściciele BMW – oferta PPF',
    message:
      'Dzień dobry {{imie}}! Mamy specjalną ofertę na oklejanie PPF dla Twojego BMW. Zadzwoń lub zarezerwuj online. AutoCRM Studio',
    filters: {
      vehicles: [{ brand: 'BMW' }],
      services: [],
      lastVisit: null,
    },
    excludedCustomerIds: [],
    status: 'SENT',
    audienceCount: 47,
    sentCount: 47,
    sentAt: '2026-02-15T10:00:00Z',
    createdAt: '2026-02-14T14:30:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
  },
  {
    id: 'camp-002',
    name: 'Klienci bez wizyty – reaktywacja',
    message:
      'Cześć {{imie}}! Minął rok od ostatniej wizyty. Zapraszamy na przegląd i pielęgnację auta. Rezerwacja: autocrmstudio.pl',
    filters: {
      vehicles: [],
      services: [],
      lastVisit: { olderThanDays: 365 },
    },
    excludedCustomerIds: ['cust-03'],
    status: 'DRAFT',
    audienceCount: 23,
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'camp-003',
    name: 'Po PPF – pielęgnacja folii',
    message:
      'Drogi {{imie}}, minęło 6 miesięcy od oklejenia PPF. Czas na profesjonalne odświeżenie powłoki. Umów się dziś!',
    filters: {
      vehicles: [],
      services: [{ serviceId: 'svc-ppf', serviceName: 'Oklejanie PPF' }],
      lastVisit: { olderThanDays: 180 },
    },
    excludedCustomerIds: [],
    status: 'SCHEDULED',
    audienceCount: 31,
    scheduledAt: '2026-03-10T08:00:00Z',
    createdAt: '2026-03-05T11:20:00Z',
    updatedAt: '2026-03-05T11:20:00Z',
  },
];

const mockAudienceCustomers = [
  {
    id: 'cust-01',
    firstName: 'Marek',
    lastName: 'Kowalski',
    phone: '+48 600 100 200',
    vehicleBrand: 'BMW',
    vehicleModel: 'M3',
    lastVisitDate: '2025-01-10',
  },
  {
    id: 'cust-02',
    firstName: 'Anna',
    lastName: 'Nowak',
    phone: '+48 601 200 300',
    vehicleBrand: 'BMW',
    vehicleModel: '5 Series',
    lastVisitDate: '2024-12-05',
  },
  {
    id: 'cust-03',
    firstName: 'Piotr',
    lastName: 'Wiśniewski',
    phone: '+48 602 300 400',
    vehicleBrand: 'BMW',
    vehicleModel: 'X5',
    lastVisitDate: '2025-03-20',
  },
  {
    id: 'cust-04',
    firstName: 'Katarzyna',
    lastName: 'Wójcik',
    phone: '+48 603 400 500',
    vehicleBrand: 'BMW',
    vehicleModel: '3 Series',
    lastVisitDate: '2024-11-15',
  },
  {
    id: 'cust-05',
    firstName: 'Tomasz',
    lastName: 'Lewandowski',
    phone: '+48 604 500 600',
    vehicleBrand: 'BMW',
    vehicleModel: 'X3',
    lastVisitDate: '2025-02-08',
  },
];

const mockAutomation: SmsAutomationConfig = {
  preVisit: {
    enabled: true,
    offsetMinutes: 60,
    messageTemplate:
      'Dzień dobry {{imie}}! Przypominamy o wizycie w naszym studiu jutro o {{godzina}}. Do zobaczenia! AutoCRM Studio',
  },
  postVisit: {
    enabled: false,
    offsetMinutes: 1440, // 24h
    messageTemplate:
      'Drogi {{imie}}, dziękujemy za wizytę! Mamy nadzieję, że jesteś zadowolony. Czekamy na Ciebie ponownie. AutoCRM Studio',
  },
};

const mockBrands: VehicleBrandOption[] = [
  { brand: 'Audi', models: ['A3', 'A4', 'A5', 'A6', 'Q3', 'Q5', 'Q7', 'Q8', 'RS6', 'TT'] },
  { brand: 'BMW', models: ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '7 Series', 'M3', 'M5', 'X1', 'X3', 'X5', 'X7'] },
  { brand: 'Mercedes-Benz', models: ['A-Class', 'C-Class', 'CLA', 'CLS', 'E-Class', 'GLA', 'GLC', 'GLE', 'S-Class', 'AMG GT'] },
  { brand: 'Porsche', models: ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'] },
  { brand: 'Volkswagen', models: ['Golf', 'Passat', 'Polo', 'T-Roc', 'Tiguan', 'Touareg', 'ID.4'] },
  { brand: 'Toyota', models: ['Camry', 'Corolla', 'GR Supra', 'Land Cruiser', 'RAV4', 'Yaris'] },
  { brand: 'Lexus', models: ['ES', 'IS', 'LC', 'LX', 'NX', 'RX', 'UX'] },
  { brand: 'Volvo', models: ['S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90'] },
  { brand: 'Ferrari', models: ['296 GTB', '812 Superfast', 'F8', 'Roma', 'SF90'] },
  { brand: 'Lamborghini', models: ['Huracán', 'Urus', 'Revuelto'] },
  { brand: 'Range Rover', models: ['Defender', 'Discovery', 'Evoque', 'Range Rover', 'Sport', 'Velar'] },
  { brand: 'Maserati', models: ['Ghibli', 'GranTurismo', 'Grecale', 'Levante', 'Quattroporte'] },
];

// ─── API functions ─────────────────────────────────────────────────────────────

export async function fetchCampaigns(): Promise<SmsCampaign[]> {
  if (USE_MOCKS) {
    await delay(300);
    return [...mockCampaigns];
  }
  const { data } = await apiClient.get<SmsCampaign[]>('/v1/sms-campaigns');
  return data;
}

export async function createCampaign(payload: CreateCampaignRequest): Promise<SmsCampaign> {
  if (USE_MOCKS) {
    await delay(500);
    const campaign: SmsCampaign = {
      id: `camp-${Date.now()}`,
      name: payload.name,
      message: payload.message,
      filters: payload.filters,
      excludedCustomerIds: payload.excludedCustomerIds,
      status: payload.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      audienceCount: 0,
      scheduledAt: payload.scheduledAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCampaigns.push(campaign);
    return campaign;
  }
  const { data } = await apiClient.post<SmsCampaign>('/v1/sms-campaigns', payload);
  return data;
}

export async function deleteCampaign(id: string): Promise<void> {
  if (USE_MOCKS) {
    await delay(300);
    const idx = mockCampaigns.findIndex((c) => c.id === id);
    if (idx >= 0) mockCampaigns.splice(idx, 1);
    return;
  }
  await apiClient.delete(`/v1/sms-campaigns/${id}`);
}

export async function sendCampaign(id: string): Promise<SmsCampaign> {
  if (USE_MOCKS) {
    await delay(600);
    const campaign = mockCampaigns.find((c) => c.id === id);
    if (!campaign) throw new Error('Not found');
    campaign.status = 'SENT';
    campaign.sentAt = new Date().toISOString();
    campaign.sentCount = campaign.audienceCount;
    return { ...campaign };
  }
  const { data } = await apiClient.post<SmsCampaign>(`/v1/sms-campaigns/${id}/send`);
  return data;
}

export async function previewAudience(filters: CampaignFilters): Promise<AudiencePreviewResult> {
  if (USE_MOCKS) {
    await delay(600);
    // Return more or fewer customers based on filters to simulate real behavior
    let customers = [...mockAudienceCustomers];
    if (filters.vehicles.length > 0) {
      const brands = filters.vehicles.map((v) => v.brand.toLowerCase());
      customers = customers.filter((c) =>
        c.vehicleBrand && brands.includes(c.vehicleBrand.toLowerCase())
      );
    }
    return { customers, total: customers.length };
  }
  const { data } = await apiClient.post<AudiencePreviewResult>(
    '/v1/sms-campaigns/preview-audience',
    filters
  );
  return data;
}

export async function fetchAutomationConfig(): Promise<SmsAutomationConfig> {
  if (USE_MOCKS) {
    await delay(300);
    return { ...mockAutomation, preVisit: { ...mockAutomation.preVisit }, postVisit: { ...mockAutomation.postVisit } };
  }
  const { data } = await apiClient.get<SmsAutomationConfig>('/v1/sms-campaigns/automation');
  return data;
}

export async function updateAutomationConfig(config: SmsAutomationConfig): Promise<SmsAutomationConfig> {
  if (USE_MOCKS) {
    await delay(500);
    Object.assign(mockAutomation, config);
    return { ...config };
  }
  const { data } = await apiClient.put<SmsAutomationConfig>('/v1/sms-campaigns/automation', config);
  return data;
}

export async function fetchVehicleBrands(): Promise<VehicleBrandOption[]> {
  if (USE_MOCKS) {
    await delay(150);
    return mockBrands;
  }
  const { data } = await apiClient.get<VehicleBrandOption[]>('/v1/vehicles/brands');
  return data;
}

export async function generateAudienceFromPrompt(
  req: AgentAudienceRequest
): Promise<AgentAudienceResult> {
  if (USE_MOCKS) {
    await delay(2800);
    const prompt = req.prompt.toLowerCase();

    // Simulate agents finding customers based on prompt keywords
    let customers = [...mockAudienceCustomers];

    if (prompt.includes('bmw')) {
      customers = customers.filter((c) => c.vehicleBrand?.toLowerCase() === 'bmw');
    }

    // Add a few extra mock entries for richer demo
    const extra = [
      {
        id: 'cust-06',
        firstName: 'Michał',
        lastName: 'Zając',
        phone: '+48 605 600 700',
        vehicleBrand: 'BMW',
        vehicleModel: 'M5',
        lastVisitDate: '2025-04-12',
      },
      {
        id: 'cust-07',
        firstName: 'Agnieszka',
        lastName: 'Kamińska',
        phone: '+48 606 700 800',
        vehicleBrand: 'BMW',
        vehicleModel: 'X7',
        lastVisitDate: '2025-07-30',
      },
    ];
    if (prompt.includes('bmw') || customers.length > 0) {
      customers = [...customers, ...extra.filter((e) => !customers.find((c) => c.id === e.id))];
    }

    const filtersDescription =
      prompt.includes('bmw') && prompt.includes('ppf')
        ? 'Klienci posiadający BMW, którzy w ostatnim roku korzystali z usługi oklejania PPF'
        : prompt.includes('bmw')
        ? 'Klienci posiadający samochody marki BMW'
        : 'Klienci spełniający podane kryteria';

    return {
      customers,
      total: customers.length,
      generatedFiltersDescription: filtersDescription,
    };
  }

  const { data } = await apiClient.post<AgentAudienceResult>(
    '/v1/sms-campaigns/ai-audience',
    req
  );
  return data;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
