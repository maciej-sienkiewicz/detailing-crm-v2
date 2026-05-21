import { apiClient } from '@/core/apiClient';
import type { InstagramProfile, InstagramPost, InstagramStory, ProfileSummary, WeeklyStat, FollowerHistoryEntry, GenerateInstagramPostRequest, InstagramPostResult } from '../types';
import type { WeeksOption } from '../types';

const BASE_PATH = '/v1/instagram/profiles';
const USE_MOCKS = false;

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

// ─── Mock generators ──────────────────────────────────────────────────────────

const makeWeeks = (base: number, variance: number, storiesBase: number, count = 52): WeeklyStat[] => {
    const weeks: WeeklyStat[] = [];
    const now = new Date('2025-05-21');
    let seed = base;
    const rng = () => {
        seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
        return base + ((seed / 0x7fffffff) - 0.5) * variance;
    };
    let seedS = storiesBase;
    const rngS = () => {
        seedS = (seedS * 22695477 + 1) & 0x7fffffff;
        return storiesBase + ((seedS / 0x7fffffff) - 0.5) * storiesBase * 0.6;
    };
    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const day = d.getDay();
        d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
        weeks.push({
            weekStart: d.toISOString().slice(0, 10),
            avgLikes: Math.max(0, Math.round(rng())),
            avgComments: Math.max(0, Math.round(Math.abs(rng()) * 0.12)),
            postCount: Math.max(0, Math.floor(1 + Math.abs(rng()) / base * 1.5)),
            storyCount: Math.max(0, Math.round(Math.abs(rngS()))),
        });
    }
    return weeks;
};

const makeFollowerHistory = (start: number, trend: number, days = 90): FollowerHistoryEntry[] => {
    const entries: FollowerHistoryEntry[] = [];
    const now = new Date('2025-05-21');
    let count = start - trend * days;
    let seed = start;
    const noise = () => {
        seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
        return ((seed / 0x7fffffff) - 0.5) * 8;
    };
    for (let i = days; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        count = Math.max(0, count + trend + noise());
        entries.push({ date: d.toISOString().slice(0, 10), followerCount: Math.round(count) });
    }
    return entries;
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
        storiesPerWeek: 5.4,
        lastPostAt: '2025-05-18T10:00:00Z',
        followerCount: 1667,
        followingCount: 53,
        mediaCount: 506,
        hasContactData: true,
        isVerified: false,
        isBusiness: true,
        accountType: 3,
        category: 'Automotive Service',
        externalUrl: 'http://www.autoperfect.pl/',
        biography: '• Ulubione miejsce Twojego samochodu •\nPPF • Detailing • Ceramika • Wrocław',
        hasHighlightReels: true,
        totalClipsCount: 12,
        isPrivate: false,
        detailsLastSyncedAt: '2025-05-21T08:05:12Z',
        weeklyStats: makeWeeks(131, 60, 5),
        followerHistory: makeFollowerHistory(1580, 1.5),
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
        storiesPerWeek: 1.2,
        lastPostAt: '2025-05-10T08:00:00Z',
        followerCount: 892,
        followingCount: 310,
        mediaCount: 134,
        hasContactData: false,
        isVerified: false,
        isBusiness: false,
        accountType: 1,
        category: null,
        externalUrl: null,
        biography: 'Pasja do czystych aut 🚗',
        hasHighlightReels: false,
        totalClipsCount: 3,
        isPrivate: false,
        detailsLastSyncedAt: '2025-05-21T08:05:12Z',
        weeklyStats: makeWeeks(55, 30, 1),
        followerHistory: makeFollowerHistory(870, 0.3),
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
        storiesPerWeek: 8.1,
        lastPostAt: '2025-05-20T15:00:00Z',
        followerCount: 4210,
        followingCount: 128,
        mediaCount: 890,
        hasContactData: true,
        isVerified: false,
        isBusiness: true,
        accountType: 3,
        category: 'Car Detailing',
        externalUrl: 'https://detailpro.pl/',
        biography: 'Detailing premium • PPF • Ceramika\nWarszawa 🏆 #1 w rankingu czytelników',
        hasHighlightReels: true,
        totalClipsCount: 34,
        isPrivate: false,
        detailsLastSyncedAt: '2025-05-21T08:05:12Z',
        weeklyStats: makeWeeks(198, 80, 8),
        followerHistory: makeFollowerHistory(3900, 3.2),
    },
];

const mockStories: InstagramStory[] = [
    // autoperfect_wroclaw — 3 stories (mix image + video)
    {
        storyId: 'st-1',
        imageUrl: 'https://scontent-lga3-3.cdninstagram.com/v/t51.82787-15/655644628_18409807504178385_3731828278410475725_n.heic?stp=dst-jpg_e35_s480x480_tt6&_nc_cat=104&ig_cache_key=Mzg2MTI4ODEwNjA0MDk0NTE3Mw%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTQ0MC5zZHIuQzMifQ%3D%3D&_nc_ohc=-7_5ZMMHn5wQ7kNvwEzZLjN&_nc_oc=AdqejhirwlRkBabnUcgMp0gMQgu0yYAdgGWXcItgTSh1gnVyM7h0tU93KTOnXs4dNz0&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-lga3-3.cdninstagram.com&_nc_gid=tjbWXHXs_cK0mJAfkCGycA&_nc_ss=7a32e&oh=00_Af3ibMaO--Jf_dk4EXuxAVLDyz6MKeelYA3P8q7UgDSjoQ&oe=69ED6B83',
        videoUrl: null,
        takenAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
        profileId: 'p-101',
        username: 'autoperfect_wroclaw',
    },
    {
        storyId: 'st-2',
        imageUrl: null,
        videoUrl: 'https://scontent-sea5-1.cdninstagram.com/o1/v/t2/f2/m78/AQOQ_bpN---Gko_bXK32bCXCZV9-jIFMhCEiJBqWTjp975_hILa0R5_cCKVU-UUzwCG5lLM6qgvfh-2RLow1O1WVhFyGJhQ3jeehtog.mp4?_nc_cat=111&_nc_sid=5e9851&_nc_ht=scontent-sea5-1.cdninstagram.com&_nc_ohc=slsJaQ3FMtQQ7kNvwHh91yi&efg=eyJ2ZW5jb2RlX3RhZyI6Inhwdl9wcm9ncmVzc2l2ZS5JTlNUQUdSQU0uU1RPUlkuQzMuNzIwLmRhc2hfYmFzZWxpbmVfMV92MSIsInhwdl9hc3NldF9pZCI6MTg0MTM3NTMzOTgxNzgzODUsImFzc2V0X2FnZV9kYXlzIjowLCJ2aV91c2VjYXNlX2lkIjoxMDEwMCwiZHVyYXRpb25fcyI6MTcsInVybGdlbl9zb3VyY2UiOiJ3d3cifQ%3D%3D&ccb=17-1&vs=453267677633648&_nc_vs=HBksFQIYUWlnX3hwdl9wbGFjZW1lbnRfcGVybWFuZW50X3YyLzgyNDJBNTIzODA2MDRFNDcwNUMxQjZDQzYzOTMzNzg1X3ZpZGVvX2Rhc2hpbml0Lm1wNBUAAsgBEgAVAhhRaWdfeHB2X3BsYWNlbWVudF9wZXJtYW5lbnRfdjIvNTQ0NDVCOUFGQjE0Qzg0NkJBQzQwQUMzNDVDQUVGOUZfYXVkaW9fZGFzaGluaXQubXA0FQICyAESACgAGAAbAogHdXNlX29pbAExEnByb2dyZXNzaXZlX3JlY2lwZQExFQAAJqLJveTBzbVBFQIoAkMzLBdAMSp--dsi0RgSZGFzaF9iYXNlbGluZV8xX3YxEQB16Adl6J0BAA&_nc_gid=Ed-X1RaGHD5qrUx091wKRQ&_nc_ss=7a32e&_nc_zt=28&oh=00_Af33Jv0P7OyraJeTkS8EjagdBSPUdxbcc9ZYuTo0c-oBwg&oe=69E98C44',
        takenAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
        profileId: 'p-101',
        username: 'autoperfect_wroclaw',
    },
    {
        storyId: 'st-3',
        imageUrl: 'https://scontent-lga3-3.cdninstagram.com/v/t51.82787-15/655644628_18409807504178385_3731828278410475725_n.heic?stp=dst-jpg_e35_s480x480_tt6&_nc_cat=104&ig_cache_key=Mzg2MTI4ODEwNjA0MDk0NTE3Mw%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTQ0MC5zZHIuQzMifQ%3D%3D&_nc_ohc=-7_5ZMMHn5wQ7kNvwEzZLjN&_nc_oc=AdqejhirwlRkBabnUcgMp0gMQgu0yYAdgGWXcItgTSh1gnVyM7h0tU93KTOnXs4dNz0&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-lga3-3.cdninstagram.com&_nc_gid=tjbWXHXs_cK0mJAfkCGycA&_nc_ss=7a32e&oh=00_Af3ibMaO--Jf_dk4EXuxAVLDyz6MKeelYA3P8q7UgDSjoQ&oe=69ED6B83',
        videoUrl: null,
        takenAt: new Date(Date.now() - 20 * 3600_000).toISOString(),
        profileId: 'p-101',
        username: 'autoperfect_wroclaw',
    },
    // detailpro_pl — 2 stories
    {
        storyId: 'st-4',
        imageUrl: 'https://scontent-lga3-3.cdninstagram.com/v/t51.82787-15/655644628_18409807504178385_3731828278410475725_n.heic?stp=dst-jpg_e35_s480x480_tt6&_nc_cat=104&ig_cache_key=Mzg2MTI4ODEwNjA0MDk0NTE3Mw%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTQ0MC5zZHIuQzMifQ%3D%3D&_nc_ohc=-7_5ZMMHn5wQ7kNvwEzZLjN&_nc_oc=AdqejhirwlRkBabnUcgMp0gMQgu0yYAdgGWXcItgTSh1gnVyM7h0tU93KTOnXs4dNz0&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-lga3-3.cdninstagram.com&_nc_gid=tjbWXHXs_cK0mJAfkCGycA&_nc_ss=7a32e&oh=00_Af3ibMaO--Jf_dk4EXuxAVLDyz6MKeelYA3P8q7UgDSjoQ&oe=69ED6B83',
        videoUrl: null,
        takenAt: new Date(Date.now() - 1 * 3600_000).toISOString(),
        profileId: 'p-105',
        username: 'detailpro_pl',
    },
    {
        storyId: 'st-5',
        imageUrl: null,
        videoUrl: 'https://scontent-sea5-1.cdninstagram.com/o1/v/t2/f2/m78/AQOQ_bpN---Gko_bXK32bCXCZV9-jIFMhCEiJBqWTjp975_hILa0R5_cCKVU-UUzwCG5lLM6qgvfh-2RLow1O1WVhFyGJhQ3jeehtog.mp4?_nc_cat=111&_nc_sid=5e9851&_nc_ht=scontent-sea5-1.cdninstagram.com&_nc_ohc=slsJaQ3FMtQQ7kNvwHh91yi&efg=eyJ2ZW5jb2RlX3RhZyI6Inhwdl9wcm9ncmVzc2l2ZS5JTlNUQUdSQU0uU1RPUlkuQzMuNzIwLmRhc2hfYmFzZWxpbmVfMV92MSIsInhwdl9hc3NldF9pZCI6MTg0MTM3NTMzOTgxNzgzODUsImFzc2V0X2FnZV9kYXlzIjowLCJ2aV91c2VjYXNlX2lkIjoxMDEwMCwiZHVyYXRpb25fcyI6MTcsInVybGdlbl9zb3VyY2UiOiJ3d3cifQ%3D%3D&ccb=17-1&vs=453267677633648&_nc_vs=HBksFQIYUWlnX3hwdl9wbGFjZW1lbnRfcGVybWFuZW50X3YyLzgyNDJBNTIzODA2MDRFNDcwNUMxQjZDQzYzOTMzNzg1X3ZpZGVvX2Rhc2hpbml0Lm1wNBUAAsgBEgAVAhhRaWdfeHB2X3BsYWNlbWVudF9wZXJtYW5lbnRfdjIvNTQ0NDVCOUFGQjE0Qzg0NkJBQzQwQUMzNDVDQUVGOUZfYXVkaW9fZGFzaGluaXQubXA0FQICyAESACgAGAAbAogHdXNlX29pbAExEnByb2dyZXNzaXZlX3JlY2lwZQExFQAAJqLJveTBzbVBFQIoAkMzLBdAMSp--dsi0RgSZGFzaF9iYXNlbGluZV8xX3YxEQB16Adl6J0BAA&_nc_gid=Ed-X1RaGHD5qrUx091wKRQ&_nc_ss=7a32e&_nc_zt=28&oh=00_Af33Jv0P7OyraJeTkS8EjagdBSPUdxbcc9ZYuTo0c-oBwg&oe=69E98C44',
        takenAt: new Date(Date.now() - 10 * 3600_000).toISOString(),
        profileId: 'p-105',
        username: 'detailpro_pl',
    },
    // carcare_studio — 1 story (image)
    {
        storyId: 'st-6',
        imageUrl: 'https://scontent-lga3-3.cdninstagram.com/v/t51.82787-15/655644628_18409807504178385_3731828278410475725_n.heic?stp=dst-jpg_e35_s480x480_tt6&_nc_cat=104&ig_cache_key=Mzg2MTI4ODEwNjA0MDk0NTE3Mw%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjE0NDB4MTQ0MC5zZHIuQzMifQ%3D%3D&_nc_ohc=-7_5ZMMHn5wQ7kNvwEzZLjN&_nc_oc=AdqejhirwlRkBabnUcgMp0gMQgu0yYAdgGWXcItgTSh1gnVyM7h0tU93KTOnXs4dNz0&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=scontent-lga3-3.cdninstagram.com&_nc_gid=tjbWXHXs_cK0mJAfkCGycA&_nc_ss=7a32e&oh=00_Af3ibMaO--Jf_dk4EXuxAVLDyz6MKeelYA3P8q7UgDSjoQ&oe=69ED6B83',
        videoUrl: null,
        takenAt: new Date(Date.now() - 36 * 3600_000).toISOString(),
        profileId: 'p-104',
        username: 'carcare_studio',
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

const mockReactToPost = async (postId: string, reaction: 'liked' | 'disliked' | null): Promise<void> => {
    await delay(150);
    console.debug('[mock] reactToPost', postId, reaction);
};

const mockGeneratePost = async (req: GenerateInstagramPostRequest): Promise<InstagramPostResult> => {
    await delay(2800);
    const tonePrefix: Record<string, string> = {
        premium: '✨ Ekskluzywna realizacja.',
        technical: '🔬 Technicznie precyzyjnie.',
        emotional: '❤️ To coś więcej niż auto.',
        casual: '😎 Jesteśmy z tego zadowoleni!',
    };
    const prefix = req.postTone ? tonePrefix[req.postTone] : '✨';
    return {
        content: `${prefix}\n\n${req.topic}\n\n${req.context ? req.context + '\n\n' : ''}✅ Profesjonalne podejście\n✅ Najwyższa jakość materiałów\n✅ Gwarancja satysfakcji\n\nZapisz się już teraz — link w bio 👆\n\n#detailing #premium #wroclaw #profesjonalizm`,
    };
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
    getCompetitionSummary: async (weeks: WeeksOption = 52): Promise<ProfileSummary[]> => {
        if (USE_MOCKS) return mockGetSummary();
        const response = await apiClient.get<ProfileSummary[]>(`${BASE_PATH}/summary`, {
            params: { weeks },
        });
        return response.data;
    },

    /**
     * Save user's reaction to an Instagram post for AI training.
     *
     * Backend endpoint: POST /api/v1/instagram/posts/{postId}/reaction
     * Body: { reaction: 'LIKED' | 'DISLIKED' | null }
     *   null = reaction removed (user toggled off)
     *
     * The backend stores these per-user reactions and exposes them
     * to the AI content-generation pipeline via
     * GET /api/v1/instagram/posts/reactions?studioProfileId={id}
     */
    reactToPost: async (postId: string, reaction: 'liked' | 'disliked' | null): Promise<void> => {
        if (USE_MOCKS) return mockReactToPost(postId, reaction);
        await apiClient.post(`/v1/instagram/posts/${postId}/reaction`, {
            reaction: reaction?.toUpperCase() ?? null,
        });
    },

    generatePost: async (req: GenerateInstagramPostRequest): Promise<InstagramPostResult> => {
        if (USE_MOCKS) return mockGeneratePost(req);
        const response = await apiClient.post<InstagramPostResult>('/v1/instagram/ai/generate', req);
        return response.data;
    },

    getStories: async (hoursBack: number = 72): Promise<InstagramStory[]> => {
        if (USE_MOCKS) {
            await delay(400);
            const cutoff = Date.now() - hoursBack * 3_600_000;
            return mockStories.filter(s => new Date(s.takenAt).getTime() >= cutoff);
        }
        const response = await apiClient.get<InstagramStory[]>('/v1/instagram/stories', {
            params: { hoursBack },
        });
        return response.data;
    },
};
