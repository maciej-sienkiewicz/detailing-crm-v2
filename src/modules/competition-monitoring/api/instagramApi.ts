import { apiClient } from '@/core/apiClient';
import type { InstagramProfile, InstagramPost, ProfileSummary, WeeklyStat } from '../types';

const BASE_PATH = '/v1/instagram/profiles';
const USE_MOCKS = true;

// ─── Mock data ────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let mockProfiles: InstagramProfile[] = [
    {
        id: 'sp-1',
        profileId: 'p-101',
        username: 'autoperfect_wroclaw',
        status: 'ACTIVE',
        apiError: false,
        addedAt: '2024-11-10T09:00:00Z',
    },
    {
        id: 'sp-2',
        profileId: 'p-102',
        username: 'detailing_masters',
        status: 'PENDING_APPROVAL',
        apiError: false,
        addedAt: '2025-01-14T11:30:00Z',
    },
    {
        id: 'sp-5',
        profileId: 'p-105',
        username: 'detailpro_pl',
        status: 'ACTIVE',
        apiError: false,
        addedAt: '2024-09-15T10:00:00Z',
    },
];

const mockPostsMap: Record<string, InstagramPost[]> = {
    'sp-1': [
        {
            id: 'post-1',
            postPk: '12345678901',
            postCode: 'ABC123xyz',
            likeCount: 142,
            commentCount: 18,
            viewCount: 3400,
            caption: 'Kompleksowe detailing BMW M3 – efekty mówią same za siebie 🚗✨\n\nZanim auto trafiło do nas, lakier był pełen swirli, drobnych rys i oxidacji. Po korekcie jednoetapowej i powłoce ceramicznej wygląda jak nowe.\n\n✅ Korekta jednoetapowa\n✅ Powłoka ceramiczna 9H\n✅ Felgi zabezpieczone woskiem\n\n#detailing #bmw #bmwm3 #korektaLakieru #powłokaCeramiczna #wroclaw',
            takenAt: '2025-01-08T10:00:00Z',
            scrapedAt: '2025-01-12T03:00:00Z',
        },
        {
            id: 'post-2',
            postPk: '12345678902',
            postCode: 'DEF456uvw',
            likeCount: 89,
            commentCount: 7,
            viewCount: null,
            caption: 'Korekta lakieru Porsche 911 – efekty mówią same za siebie 🔥\n\nWłaściciel prosił o efekt „wet look" i jesteśmy z rezultatu bardzo zadowoleni. Dwa etapy polerowania + wosk twardy Collinite.\n\n#porsche #porsche911 #detailing #korektaLakieru',
            takenAt: '2025-01-05T14:00:00Z',
            scrapedAt: '2025-01-12T03:00:00Z',
        },
        {
            id: 'post-3',
            postPk: '12345678903',
            postCode: 'GHI789rst',
            likeCount: 220,
            commentCount: 31,
            viewCount: 8100,
            caption: 'Folia PPF na Lamborghini Urus – ochrona klasy premium 🏎️\n\nCały przód pojazdu oklejony folią PPF XPEL Ultimate Plus. Folia samogojąca się, odporna na kamienie i owady. Żywotność 10 lat.\n\nCzy warto? Zdecydowanie TAK.\n\n📩 Zapytaj o wycenę w wiadomości prywatnej\n\n#lamborghini #urus #ppf #foliaOchronna #xpel #detailing #wroclaw #autoperfect',
            takenAt: '2024-12-28T09:00:00Z',
            scrapedAt: '2025-01-05T03:00:00Z',
        },
        {
            id: 'post-4',
            postPk: '12345678904',
            postCode: 'JKL012mno',
            likeCount: 67,
            commentCount: 4,
            viewCount: 1200,
            caption: null,
            takenAt: '2024-12-20T12:00:00Z',
            scrapedAt: '2025-01-05T03:00:00Z',
        },
        {
            id: 'post-6',
            postPk: '12345678906',
            postCode: 'PQR678stu',
            likeCount: 178,
            commentCount: 22,
            viewCount: 5600,
            caption: 'Renowacja skórzanej tapicerki Audi RS6 🪡\n\nSkóra była sucha, popękana i odbarwiona w kilku miejscach. Po trzech etapach czyszczenia, odżywienia i barwienia wygląda jak nowa.\n\nEfekt utrzymuje się długo, a skóra jest miękka i nawilżona.\n\n#audi #rs6 #tapicerka #renowacjaSkory #detailing #wroclaw',
            takenAt: '2024-12-15T11:00:00Z',
            scrapedAt: '2025-01-05T03:00:00Z',
        },
        {
            id: 'post-7',
            postPk: '12345678907',
            postCode: 'VWX901yza',
            likeCount: 95,
            commentCount: 9,
            viewCount: 2800,
            caption: 'Czy wiesz, że detailing wnętrza warto robić co najmniej raz na pół roku? 🧹\n\nKlima, dywaniki, plastiki, skóra – wszystko się brudzi i starzeje. Regularna pielęgnacja to nie koszt, to inwestycja w wartość auta.\n\nZapisz się do nas już teraz – linkt w bio 👆\n\n#detailingWnetrza #czyszczenieSamochodow #wroclaw',
            takenAt: '2024-12-10T14:30:00Z',
            scrapedAt: '2025-01-05T03:00:00Z',
        },
    ],
    'sp-4': [
        {
            id: 'post-5',
            postPk: '98765432101',
            postCode: 'MNO345pqr',
            likeCount: 55,
            commentCount: 3,
            viewCount: 980,
            caption: 'Pranie tapicerki na czas – zapisz się już dziś!\n\nSzybka realizacja, profesjonalny sprzęt ekstrakcyjny. Auto gotowe w 4–6 godzin.\n\n#pranietapicerki #detailing',
            takenAt: '2025-01-10T08:00:00Z',
            scrapedAt: '2025-01-12T03:00:00Z',
        },
    ],
    'sp-5': [
        {
            id: 'post-10',
            postPk: '55544433301',
            postCode: 'BCD111efg',
            likeCount: 312,
            commentCount: 47,
            viewCount: 11200,
            caption: 'Przed i po – Mercedes AMG G63 po pełnym detailingu 🖤\n\nAuto przybyło do nas z zagranicy z rozległymi uszkodzeniami lakieru. Efekt po:\n• Korekta dwuetapowa\n• Aplikacja powłoki ceramicznej Gtechniq Crystal Serum Ultra\n• Folia przyciemniana na tylne szyby\n\nCzas realizacji: 4 dni robocze.\n\n#mercedes #amg #g63 #geländewagen #detailing #ceramika #gtechniq #detailpro',
            takenAt: '2025-01-11T09:00:00Z',
            scrapedAt: '2025-01-12T03:00:00Z',
        },
        {
            id: 'post-11',
            postPk: '55544433302',
            postCode: 'EFG222hij',
            likeCount: 198,
            commentCount: 28,
            viewCount: 7400,
            caption: '5 rzeczy, których NIE powinieneś robić ze swoim lakierem 🚫\n\n1️⃣ Mycie w myjni automatycznej szczotkowej\n2️⃣ Wycieranie suchą szmatką\n3️⃣ Używanie płynów domowych do czyszczenia\n4️⃣ Parkowanie pod drzewami (żywica!)\n5️⃣ Ignorowanie świeżych plam ptaków i owadów\n\nZapamiętaj to i oszczędź sobie kosztownej korekty 😅\n\n#poradyDetailing #lakier #pielegnacjaauta #detailpro #warszawa',
            takenAt: '2025-01-07T13:00:00Z',
            scrapedAt: '2025-01-12T03:00:00Z',
        },
        {
            id: 'post-12',
            postPk: '55544433303',
            postCode: 'HIJ333klm',
            likeCount: 276,
            commentCount: 35,
            viewCount: 9800,
            caption: 'Oklejanie felg w kolorze Midnight Black 🖤\n\nFolia matowa na fabrycznych alufelgach BMW M440i. Efekt – klasa sama w sobie.\n\nCzas realizacji: 1 dzień. Folia zdejmowalna, bez uszkodzeń oryginału.\n\n📩 Wycena w wiadomości prywatnej\n\n#felgi #oklejaniefelg #bmw #m440i #foliaMatowa #detailpro #tuning',
            takenAt: '2024-12-30T10:00:00Z',
            scrapedAt: '2025-01-05T03:00:00Z',
        },
        {
            id: 'post-13',
            postPk: '55544433304',
            postCode: 'KLM444nop',
            likeCount: 143,
            commentCount: 12,
            viewCount: null,
            caption: 'Nowy rok, nowe auto? 🎉\n\nNie musisz kupować nowego – wystarczy, że oddasz nam swoje stare!\n\nPakiet „Odnowa" obejmuje:\n– pranie wnętrza\n– korektę lakieru jednoetapową\n– powłokę woskową\n– mycie silnika\n\nW cenie promocyjnej do końca stycznia. Link w bio.\n\n#nowyRok #detailing #promocja #detailpro',
            takenAt: '2025-01-02T08:00:00Z',
            scrapedAt: '2025-01-05T03:00:00Z',
        },
        {
            id: 'post-14',
            postPk: '55544433305',
            postCode: 'NOP555qrs',
            likeCount: 89,
            commentCount: 6,
            viewCount: 3100,
            caption: null,
            takenAt: '2024-12-22T16:00:00Z',
            scrapedAt: '2025-01-05T03:00:00Z',
        },
    ],
};

// Weekly stat helpers for mock data
// Generates up to 52 weeks (≈ 1 year) so the date-range picker has data to work with.
const makeWeeks = (base: number, variance: number, count = 52): WeeklyStat[] => {
    const weeks: WeeklyStat[] = [];
    const now = new Date('2025-01-13');
    // Seed-like deterministic-ish values so rerenders don't reshuffle the chart
    let seed = base;
    const rng = () => {
        seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
        return base + ((seed / 0x7fffffff) - 0.5) * variance;
    };
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        // Normalise to Monday of that week
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        weeks.push({
            weekStart: d.toISOString().slice(0, 10),
            avgLikes: Math.max(0, Math.round(rng())),
            avgComments: Math.max(0, Math.round(Math.abs(rng()) * 0.12)),
            postCount: Math.max(0, Math.floor(1 + Math.abs(rng()) / base * 1.5)),
        });
    }
    return weeks;
};

const mockSummaries: ProfileSummary[] = [
    {
        id: 'sp-1',
        profileId: 'p-101',
        username: 'autoperfect_wroclaw',
        status: 'ACTIVE',
        apiError: false,
        addedAt: '2024-11-10T09:00:00Z',
        postCount: 48,
        avgLikes: 131,
        avgComments: 15,
        avgViews: 3925,
        avgEngagement: 146,
        postsPerWeek: 2.1,
        lastPostAt: '2025-01-08T10:00:00Z',
        weeklyStats: makeWeeks(131, 60),
    },
    {
        id: 'sp-4',
        profileId: 'p-104',
        username: 'carcare_studio',
        status: 'ACTIVE',
        apiError: true,
        addedAt: '2024-10-20T14:00:00Z',
        postCount: 22,
        avgLikes: 55,
        avgComments: 3,
        avgViews: 980,
        avgEngagement: 58,
        postsPerWeek: 0.9,
        lastPostAt: '2025-01-10T08:00:00Z',
        weeklyStats: makeWeeks(55, 30),
    },
    {
        id: 'sp-5',
        profileId: 'p-105',
        username: 'detailpro_pl',
        status: 'ACTIVE',
        apiError: false,
        addedAt: '2024-09-15T10:00:00Z',
        postCount: 67,
        avgLikes: 198,
        avgComments: 27,
        avgViews: 6400,
        avgEngagement: 225,
        postsPerWeek: 3.4,
        lastPostAt: '2025-01-11T15:00:00Z',
        weeklyStats: makeWeeks(198, 80),
    },
];

// ─── Mock handlers ────────────────────────────────────────────────────────────

const mockListProfiles = async (): Promise<InstagramProfile[]> => {
    await delay(500);
    return [...mockProfiles];
};

const mockAddProfile = async (username: string): Promise<InstagramProfile> => {
    await delay(700);
    const newProfile: InstagramProfile = {
        id: `sp-${Date.now()}`,
        profileId: `p-${Date.now()}`,
        username,
        status: 'PENDING_APPROVAL',
        apiError: false,
        addedAt: new Date().toISOString(),
    };
    mockProfiles.unshift(newProfile);
    return newProfile;
};

const mockApproveProfile = async (id: string): Promise<void> => {
    await delay(400);
    const profile = mockProfiles.find(p => p.id === id);
    if (profile) profile.status = 'ACTIVE';
};

const mockRejectProfile = async (id: string): Promise<void> => {
    await delay(400);
    const profile = mockProfiles.find(p => p.id === id);
    if (profile) profile.status = 'REJECTED';
};

const mockRemoveProfile = async (id: string): Promise<void> => {
    await delay(400);
    mockProfiles = mockProfiles.filter(p => p.id !== id);
};

const mockGetPosts = async (id: string): Promise<InstagramPost[]> => {
    await delay(600);
    return mockPostsMap[id] ?? [];
};

const mockGetSummary = async (): Promise<ProfileSummary[]> => {
    await delay(650);
    return mockSummaries;
};

// ─── API object ───────────────────────────────────────────────────────────────

export const instagramApi = {
    listProfiles: async (): Promise<InstagramProfile[]> => {
        if (USE_MOCKS) return mockListProfiles();
        const response = await apiClient.get<InstagramProfile[]>(BASE_PATH);
        return response.data;
    },

    addProfile: async (username: string): Promise<InstagramProfile> => {
        if (USE_MOCKS) return mockAddProfile(username);
        const response = await apiClient.post<InstagramProfile>(BASE_PATH, { username });
        return response.data;
    },

    approveProfile: async (id: string): Promise<void> => {
        if (USE_MOCKS) return mockApproveProfile(id);
        await apiClient.post(`${BASE_PATH}/${id}/approve`);
    },

    rejectProfile: async (id: string): Promise<void> => {
        if (USE_MOCKS) return mockRejectProfile(id);
        await apiClient.post(`${BASE_PATH}/${id}/reject`);
    },

    removeProfile: async (id: string): Promise<void> => {
        if (USE_MOCKS) return mockRemoveProfile(id);
        await apiClient.delete(`${BASE_PATH}/${id}`);
    },

    getPosts: async (id: string): Promise<InstagramPost[]> => {
        if (USE_MOCKS) return mockGetPosts(id);
        const response = await apiClient.get<InstagramPost[]>(`${BASE_PATH}/${id}/posts`);
        return response.data;
    },

    /**
     * Fetch aggregated statistics for all active profiles.
     *
     * Backend endpoint: GET /api/v1/instagram/profiles/summary
     *   Optional query param: ?weeks=N  (default: 52)
     *   Returns up to N weeks of weeklyStats per profile, sorted ascending by weekStart.
     *
     * The backend computes avgLikes, avgComments, avgViews, postsPerWeek and
     * weeklyStats from scraped posts, grouped by studioProfileId.
     * Only ACTIVE profiles are included.
     *
     * Date-range filtering is done client-side from the full dataset so that
     * switching ranges requires no additional network requests.
     */
    getCompetitionSummary: async (): Promise<ProfileSummary[]> => {
        if (USE_MOCKS) return mockGetSummary();
        const response = await apiClient.get<ProfileSummary[]>(`${BASE_PATH}/summary`, {
            params: { weeks: 52 },
        });
        return response.data;
    },
};
