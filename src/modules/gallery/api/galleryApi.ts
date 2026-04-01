// src/modules/gallery/api/galleryApi.ts

import { apiClient } from '@/core/apiClient';
import type { GalleryFilters, GalleryResponse, GalleryPhoto } from '../types';

const USE_MOCKS = true;

// ─── mock data ────────────────────────────────────────────────────────────────

const MOCK_PHOTOS: GalleryPhoto[] = [
    // BMW X5 – wizyta
    {
        id: 'gp-001', fileName: 'bmw_x5_przod_przed.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp001/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp001/1920/1440',
        description: 'Przód pojazdu przed detailingiem',
        tags: ['przód', 'przed', 'lakier'],
        uploadedAt: '2025-01-10T09:15:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VISIT',
        vehicleId: 'v1', vehicleBrand: 'BMW', vehicleModel: 'X5', vehicleLicensePlate: 'WA 12345', vehicleYear: 2021,
        visitId: 'vis-001', visitNumber: '#001/2025',
        customerId: 'c1', customerName: 'Jan Kowalski',
    },
    {
        id: 'gp-002', fileName: 'bmw_x5_przod_po.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp002/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp002/1920/1440',
        description: 'Przód pojazdu po detailingu',
        tags: ['przód', 'po', 'ceramika'],
        uploadedAt: '2025-01-10T16:30:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VISIT',
        vehicleId: 'v1', vehicleBrand: 'BMW', vehicleModel: 'X5', vehicleLicensePlate: 'WA 12345', vehicleYear: 2021,
        visitId: 'vis-001', visitNumber: '#001/2025',
        customerId: 'c1', customerName: 'Jan Kowalski',
    },
    {
        id: 'gp-003', fileName: 'bmw_x5_tyl_zarysowanie.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp003/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp003/1920/1440',
        description: 'Zarysowanie na tylnym zderzaku',
        tags: ['tył', 'zarysowanie', 'zderzak', 'uszkodzenie'],
        uploadedAt: '2025-01-10T09:20:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VISIT',
        vehicleId: 'v1', vehicleBrand: 'BMW', vehicleModel: 'X5', vehicleLicensePlate: 'WA 12345', vehicleYear: 2021,
        visitId: 'vis-001', visitNumber: '#001/2025',
        customerId: 'c1', customerName: 'Jan Kowalski',
    },
    // Audi A4
    {
        id: 'gp-004', fileName: 'audi_a4_lewy_bok.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp004/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp004/1920/1440',
        description: 'Lewy bok – korekta lakieru',
        tags: ['lewy bok', 'korekta lakieru', 'lakier'],
        uploadedAt: '2025-01-15T11:00:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VISIT',
        vehicleId: 'v2', vehicleBrand: 'Audi', vehicleModel: 'A4', vehicleLicensePlate: 'KR 67890', vehicleYear: 2020,
        visitId: 'vis-002', visitNumber: '#002/2025',
        customerId: 'c2', customerName: 'Anna Nowak',
    },
    {
        id: 'gp-005', fileName: 'audi_a4_felga_po.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp005/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp005/1920/1440',
        description: 'Felga po czyszczeniu',
        tags: ['felga', 'po', 'detailing'],
        uploadedAt: '2025-01-15T15:45:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VISIT',
        vehicleId: 'v2', vehicleBrand: 'Audi', vehicleModel: 'A4', vehicleLicensePlate: 'KR 67890', vehicleYear: 2020,
        visitId: 'vis-002', visitNumber: '#002/2025',
        customerId: 'c2', customerName: 'Anna Nowak',
    },
    {
        id: 'gp-006', fileName: 'audi_a4_wnetrze.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp006/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp006/1920/1440',
        description: 'Wnętrze – pranie tapicerki',
        tags: ['wnętrze', 'detailing'],
        uploadedAt: '2025-01-15T14:00:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VEHICLE',
        vehicleId: 'v2', vehicleBrand: 'Audi', vehicleModel: 'A4', vehicleLicensePlate: 'KR 67890', vehicleYear: 2020,
        customerId: 'c2', customerName: 'Anna Nowak',
    },
    // Mercedes C-Class
    {
        id: 'gp-007', fileName: 'merc_c_maska_ppf.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp007/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp007/1920/1440',
        description: 'Maska – naklejanie PPF',
        tags: ['maska', 'PPF', 'folia'],
        uploadedAt: '2025-01-20T10:00:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VISIT',
        vehicleId: 'v3', vehicleBrand: 'Mercedes', vehicleModel: 'C-Class', vehicleLicensePlate: 'GD 11111', vehicleYear: 2022,
        visitId: 'vis-003', visitNumber: '#003/2025',
        customerId: 'c3', customerName: 'Tomasz Zając',
    },
    {
        id: 'gp-008', fileName: 'merc_c_dach_ppf.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp008/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp008/1920/1440',
        description: 'Dach – folia ochronna PPF',
        tags: ['dach', 'PPF', 'folia', 'po'],
        uploadedAt: '2025-01-20T14:30:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VISIT',
        vehicleId: 'v3', vehicleBrand: 'Mercedes', vehicleModel: 'C-Class', vehicleLicensePlate: 'GD 11111', vehicleYear: 2022,
        visitId: 'vis-003', visitNumber: '#003/2025',
        customerId: 'c3', customerName: 'Tomasz Zając',
    },
    {
        id: 'gp-009', fileName: 'merc_c_prawy_slupek.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp009/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp009/1920/1440',
        description: 'Prawy słupek',
        tags: ['prawy bok', 'słupek'],
        uploadedAt: '2025-01-20T09:45:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VEHICLE',
        vehicleId: 'v3', vehicleBrand: 'Mercedes', vehicleModel: 'C-Class', vehicleLicensePlate: 'GD 11111', vehicleYear: 2022,
        customerId: 'c3', customerName: 'Tomasz Zając',
    },
    // Porsche Cayenne
    {
        id: 'gp-010', fileName: 'porsche_cayenne_wnetrze_przed.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp010/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp010/1920/1440',
        description: 'Wnętrze przed praniem',
        tags: ['wnętrze', 'przed', 'bagażnik'],
        uploadedAt: '2025-02-03T08:30:00Z', uploadedBy: 'u3', uploadedByName: 'Piotr Lewandowski',
        source: 'VISIT',
        vehicleId: 'v4', vehicleBrand: 'Porsche', vehicleModel: 'Cayenne', vehicleLicensePlate: 'PO 99999', vehicleYear: 2023,
        visitId: 'vis-004', visitNumber: '#004/2025',
        customerId: 'c4', customerName: 'Katarzyna Maj',
    },
    {
        id: 'gp-011', fileName: 'porsche_cayenne_wnetrze_po.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp011/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp011/1920/1440',
        description: 'Wnętrze po praniu',
        tags: ['wnętrze', 'po', 'detailing'],
        uploadedAt: '2025-02-03T16:00:00Z', uploadedBy: 'u3', uploadedByName: 'Piotr Lewandowski',
        source: 'VISIT',
        vehicleId: 'v4', vehicleBrand: 'Porsche', vehicleModel: 'Cayenne', vehicleLicensePlate: 'PO 99999', vehicleYear: 2023,
        visitId: 'vis-004', visitNumber: '#004/2025',
        customerId: 'c4', customerName: 'Katarzyna Maj',
    },
    {
        id: 'gp-012', fileName: 'porsche_cayenne_ceramika_lakier.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp012/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp012/1920/1440',
        description: 'Nakładanie powłoki ceramicznej',
        tags: ['ceramika', 'lakier', 'po'],
        uploadedAt: '2025-02-03T15:00:00Z', uploadedBy: 'u3', uploadedByName: 'Piotr Lewandowski',
        source: 'VEHICLE',
        vehicleId: 'v4', vehicleBrand: 'Porsche', vehicleModel: 'Cayenne', vehicleLicensePlate: 'PO 99999', vehicleYear: 2023,
        customerId: 'c4', customerName: 'Katarzyna Maj',
    },
    // Tesla Model 3
    {
        id: 'gp-013', fileName: 'tesla_m3_przod.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp013/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp013/1920/1440',
        description: 'Przód Tesli po korekcie',
        tags: ['przód', 'po', 'korekta lakieru'],
        uploadedAt: '2025-02-10T10:00:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VISIT',
        vehicleId: 'v5', vehicleBrand: 'Tesla', vehicleModel: 'Model 3', vehicleLicensePlate: 'WA 33333', vehicleYear: 2022,
        visitId: 'vis-005', visitNumber: '#005/2025',
        customerId: 'c5', customerName: 'Michał Dąbrowski',
    },
    {
        id: 'gp-014', fileName: 'tesla_m3_szyba.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp014/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp014/1920/1440',
        description: 'Szyba panoramiczna',
        tags: ['szyba', 'dach'],
        uploadedAt: '2025-02-10T11:30:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VEHICLE',
        vehicleId: 'v5', vehicleBrand: 'Tesla', vehicleModel: 'Model 3', vehicleLicensePlate: 'WA 33333', vehicleYear: 2022,
        customerId: 'c5', customerName: 'Michał Dąbrowski',
    },
    {
        id: 'gp-015', fileName: 'tesla_m3_felgi_po.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp015/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp015/1920/1440',
        description: 'Felgi po renowacji',
        tags: ['felga', 'po', 'detailing'],
        uploadedAt: '2025-02-10T14:00:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VISIT',
        vehicleId: 'v5', vehicleBrand: 'Tesla', vehicleModel: 'Model 3', vehicleLicensePlate: 'WA 33333', vehicleYear: 2022,
        visitId: 'vis-005', visitNumber: '#005/2025',
        customerId: 'c5', customerName: 'Michał Dąbrowski',
    },
    // Volvo XC60
    {
        id: 'gp-016', fileName: 'volvo_xc60_wgniecenie.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp016/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp016/1920/1440',
        description: 'Wgniecenie na drzwiach',
        tags: ['lewy bok', 'wgniecenie', 'uszkodzenie'],
        uploadedAt: '2025-02-18T09:00:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VISIT',
        vehicleId: 'v6', vehicleBrand: 'Volvo', vehicleModel: 'XC60', vehicleLicensePlate: 'SK 22222', vehicleYear: 2021,
        visitId: 'vis-006', visitNumber: '#006/2025',
        customerId: 'c6', customerName: 'Agnieszka Wróbel',
    },
    {
        id: 'gp-017', fileName: 'volvo_xc60_progowa.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp017/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp017/1920/1440',
        description: 'Progowa – naklejona folia ochronna',
        tags: ['progowa', 'folia', 'PPF', 'po'],
        uploadedAt: '2025-02-18T15:00:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VISIT',
        vehicleId: 'v6', vehicleBrand: 'Volvo', vehicleModel: 'XC60', vehicleLicensePlate: 'SK 22222', vehicleYear: 2021,
        visitId: 'vis-006', visitNumber: '#006/2025',
        customerId: 'c6', customerName: 'Agnieszka Wróbel',
    },
    {
        id: 'gp-018', fileName: 'volvo_xc60_lusterko.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp018/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp018/1920/1440',
        description: 'Lusterko po lakierowaniu',
        tags: ['lusterko', 'po', 'lakier'],
        uploadedAt: '2025-02-18T13:00:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VEHICLE',
        vehicleId: 'v6', vehicleBrand: 'Volvo', vehicleModel: 'XC60', vehicleLicensePlate: 'SK 22222', vehicleYear: 2021,
        customerId: 'c6', customerName: 'Agnieszka Wróbel',
    },
    // BMW M4
    {
        id: 'gp-019', fileName: 'bmw_m4_tyl_ceramika.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp019/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp019/1920/1440',
        description: 'Tył po nałożeniu ceramiki',
        tags: ['tył', 'ceramika', 'po'],
        uploadedAt: '2025-03-05T10:00:00Z', uploadedBy: 'u3', uploadedByName: 'Piotr Lewandowski',
        source: 'VISIT',
        vehicleId: 'v7', vehicleBrand: 'BMW', vehicleModel: 'M4', vehicleLicensePlate: 'WA 44444', vehicleYear: 2023,
        visitId: 'vis-007', visitNumber: '#007/2025',
        customerId: 'c1', customerName: 'Jan Kowalski',
    },
    {
        id: 'gp-020', fileName: 'bmw_m4_maska_ppf.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp020/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp020/1920/1440',
        description: 'Maska z PPF matowym',
        tags: ['maska', 'PPF', 'folia', 'po'],
        uploadedAt: '2025-03-05T14:00:00Z', uploadedBy: 'u3', uploadedByName: 'Piotr Lewandowski',
        source: 'VISIT',
        vehicleId: 'v7', vehicleBrand: 'BMW', vehicleModel: 'M4', vehicleLicensePlate: 'WA 44444', vehicleYear: 2023,
        visitId: 'vis-007', visitNumber: '#007/2025',
        customerId: 'c1', customerName: 'Jan Kowalski',
    },
    {
        id: 'gp-021', fileName: 'bmw_m4_felga_renowacja.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp021/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp021/1920/1440',
        description: 'Felga po renowacji proszkowej',
        tags: ['felga', 'po'],
        uploadedAt: '2025-03-05T16:30:00Z', uploadedBy: 'u3', uploadedByName: 'Piotr Lewandowski',
        source: 'VEHICLE',
        vehicleId: 'v7', vehicleBrand: 'BMW', vehicleModel: 'M4', vehicleLicensePlate: 'WA 44444', vehicleYear: 2023,
        customerId: 'c1', customerName: 'Jan Kowalski',
    },
    // Range Rover
    {
        id: 'gp-022', fileName: 'rr_sport_przod_przed.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp022/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp022/1920/1440',
        description: 'Przód przed korektą',
        tags: ['przód', 'przed', 'lakier'],
        uploadedAt: '2025-03-12T08:00:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VISIT',
        vehicleId: 'v8', vehicleBrand: 'Land Rover', vehicleModel: 'Range Rover Sport', vehicleLicensePlate: 'LU 55555', vehicleYear: 2022,
        visitId: 'vis-008', visitNumber: '#008/2025',
        customerId: 'c7', customerName: 'Robert Kowalczyk',
    },
    {
        id: 'gp-023', fileName: 'rr_sport_przod_po.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp023/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp023/1920/1440',
        description: 'Przód po korekcie i ceramice',
        tags: ['przód', 'po', 'ceramika', 'korekta lakieru'],
        uploadedAt: '2025-03-12T16:00:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VISIT',
        vehicleId: 'v8', vehicleBrand: 'Land Rover', vehicleModel: 'Range Rover Sport', vehicleLicensePlate: 'LU 55555', vehicleYear: 2022,
        visitId: 'vis-008', visitNumber: '#008/2025',
        customerId: 'c7', customerName: 'Robert Kowalczyk',
    },
    {
        id: 'gp-024', fileName: 'rr_sport_bagaz.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp024/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp024/1920/1440',
        description: 'Bagażnik – koło zapasowe',
        tags: ['bagażnik', 'koło zapasowe'],
        uploadedAt: '2025-03-12T09:00:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VEHICLE',
        vehicleId: 'v8', vehicleBrand: 'Land Rover', vehicleModel: 'Range Rover Sport', vehicleLicensePlate: 'LU 55555', vehicleYear: 2022,
        customerId: 'c7', customerName: 'Robert Kowalczyk',
    },
    // Ford Mustang
    {
        id: 'gp-025', fileName: 'mustang_lewy_bok_zarys.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp025/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp025/1920/1440',
        description: 'Zarysowanie lakieru – lewy bok',
        tags: ['lewy bok', 'zarysowanie', 'uszkodzenie', 'przed'],
        uploadedAt: '2025-03-20T10:00:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VISIT',
        vehicleId: 'v9', vehicleBrand: 'Ford', vehicleModel: 'Mustang', vehicleLicensePlate: 'WR 66666', vehicleYear: 2020,
        visitId: 'vis-009', visitNumber: '#009/2025',
        customerId: 'c8', customerName: 'Łukasz Pawlak',
    },
    {
        id: 'gp-026', fileName: 'mustang_lewy_bok_po.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp026/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp026/1920/1440',
        description: 'Lewy bok po korekcie lakieru',
        tags: ['lewy bok', 'po', 'korekta lakieru'],
        uploadedAt: '2025-03-20T15:00:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VISIT',
        vehicleId: 'v9', vehicleBrand: 'Ford', vehicleModel: 'Mustang', vehicleLicensePlate: 'WR 66666', vehicleYear: 2020,
        visitId: 'vis-009', visitNumber: '#009/2025',
        customerId: 'c8', customerName: 'Łukasz Pawlak',
    },
    {
        id: 'gp-027', fileName: 'mustang_opona.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp027/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp027/1920/1440',
        description: 'Stan opon',
        tags: ['opona', 'felga'],
        uploadedAt: '2025-03-20T10:30:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VEHICLE',
        vehicleId: 'v9', vehicleBrand: 'Ford', vehicleModel: 'Mustang', vehicleLicensePlate: 'WR 66666', vehicleYear: 2020,
        customerId: 'c8', customerName: 'Łukasz Pawlak',
    },
    // Lexus IS
    {
        id: 'gp-028', fileName: 'lexus_is_ceramika_pelna.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp028/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp028/1920/1440',
        description: 'Pełna powłoka ceramiczna',
        tags: ['ceramika', 'po', 'lakier'],
        uploadedAt: '2025-03-25T09:00:00Z', uploadedBy: 'u3', uploadedByName: 'Piotr Lewandowski',
        source: 'VEHICLE',
        vehicleId: 'v10', vehicleBrand: 'Lexus', vehicleModel: 'IS', vehicleLicensePlate: 'BY 77777', vehicleYear: 2023,
        customerId: 'c9', customerName: 'Zofia Krawczyk',
    },
    {
        id: 'gp-029', fileName: 'lexus_is_tyl_przed.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp029/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp029/1920/1440',
        description: 'Tył przed korektą',
        tags: ['tył', 'przed'],
        uploadedAt: '2025-03-25T08:30:00Z', uploadedBy: 'u3', uploadedByName: 'Piotr Lewandowski',
        source: 'VISIT',
        vehicleId: 'v10', vehicleBrand: 'Lexus', vehicleModel: 'IS', vehicleLicensePlate: 'BY 77777', vehicleYear: 2023,
        visitId: 'vis-010', visitNumber: '#010/2025',
        customerId: 'c9', customerName: 'Zofia Krawczyk',
    },
    {
        id: 'gp-030', fileName: 'lexus_is_tyl_po.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp030/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp030/1920/1440',
        description: 'Tył po korekcie i ceramice',
        tags: ['tył', 'po', 'ceramika', 'korekta lakieru'],
        uploadedAt: '2025-03-25T16:00:00Z', uploadedBy: 'u3', uploadedByName: 'Piotr Lewandowski',
        source: 'VISIT',
        vehicleId: 'v10', vehicleBrand: 'Lexus', vehicleModel: 'IS', vehicleLicensePlate: 'BY 77777', vehicleYear: 2023,
        visitId: 'vis-010', visitNumber: '#010/2025',
        customerId: 'c9', customerName: 'Zofia Krawczyk',
    },
    // Toyota GR86
    {
        id: 'gp-031', fileName: 'gr86_przod_ppf.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp031/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp031/1920/1440',
        description: 'Przód – PPF zestaw sportowy',
        tags: ['przód', 'PPF', 'folia', 'po'],
        uploadedAt: '2025-03-28T10:00:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VISIT',
        vehicleId: 'v11', vehicleBrand: 'Toyota', vehicleModel: 'GR86', vehicleLicensePlate: 'WA 88888', vehicleYear: 2022,
        visitId: 'vis-011', visitNumber: '#011/2025',
        customerId: 'c10', customerName: 'Bartosz Nowicki',
    },
    {
        id: 'gp-032', fileName: 'gr86_maska_ppf.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp032/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp032/1920/1440',
        description: 'Maska po PPF i ceramice',
        tags: ['maska', 'PPF', 'ceramika', 'po'],
        uploadedAt: '2025-03-28T15:00:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VISIT',
        vehicleId: 'v11', vehicleBrand: 'Toyota', vehicleModel: 'GR86', vehicleLicensePlate: 'WA 88888', vehicleYear: 2022,
        visitId: 'vis-011', visitNumber: '#011/2025',
        customerId: 'c10', customerName: 'Bartosz Nowicki',
    },
    {
        id: 'gp-033', fileName: 'gr86_bok_prawy.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp033/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp033/1920/1440',
        description: 'Prawy bok – widok boczny',
        tags: ['prawy bok', 'po'],
        uploadedAt: '2025-03-28T12:00:00Z', uploadedBy: 'u1', uploadedByName: 'Marek Wiśniewski',
        source: 'VEHICLE',
        vehicleId: 'v11', vehicleBrand: 'Toyota', vehicleModel: 'GR86', vehicleLicensePlate: 'WA 88888', vehicleYear: 2022,
        customerId: 'c10', customerName: 'Bartosz Nowicki',
    },
    // VW Golf
    {
        id: 'gp-034', fileName: 'golf_8_przod.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp034/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp034/1920/1440',
        description: 'Przód po pełnym detailingu',
        tags: ['przód', 'po', 'detailing'],
        uploadedAt: '2025-03-30T11:00:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VISIT',
        vehicleId: 'v12', vehicleBrand: 'Volkswagen', vehicleModel: 'Golf 8', vehicleLicensePlate: 'PO 12312', vehicleYear: 2021,
        visitId: 'vis-012', visitNumber: '#012/2025',
        customerId: 'c2', customerName: 'Anna Nowak',
    },
    {
        id: 'gp-035', fileName: 'golf_8_wnetrze_po.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp035/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp035/1920/1440',
        description: 'Wnętrze po praniu ozonowaniu',
        tags: ['wnętrze', 'po', 'detailing'],
        uploadedAt: '2025-03-30T14:00:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VISIT',
        vehicleId: 'v12', vehicleBrand: 'Volkswagen', vehicleModel: 'Golf 8', vehicleLicensePlate: 'PO 12312', vehicleYear: 2021,
        visitId: 'vis-012', visitNumber: '#012/2025',
        customerId: 'c2', customerName: 'Anna Nowak',
    },
    {
        id: 'gp-036', fileName: 'golf_8_zderzak_tyl.jpg',
        thumbnailUrl: 'https://picsum.photos/seed/gp036/400/300',
        fullSizeUrl:  'https://picsum.photos/seed/gp036/1920/1440',
        description: 'Zderzak tylny – drobne zarysowania',
        tags: ['tył', 'zderzak', 'zarysowanie', 'przed'],
        uploadedAt: '2025-03-30T09:00:00Z', uploadedBy: 'u2', uploadedByName: 'Anna Kowalczyk',
        source: 'VEHICLE',
        vehicleId: 'v12', vehicleBrand: 'Volkswagen', vehicleModel: 'Golf 8', vehicleLicensePlate: 'PO 12312', vehicleYear: 2021,
        customerId: 'c2', customerName: 'Anna Nowak',
    },
];

function photosMatchFilters(photo: GalleryPhoto, filters: GalleryFilters): boolean {
    const { tags, search } = filters;

    if (tags.length > 0) {
        const hasAllTags = tags.every(t => photo.tags.includes(t));
        if (!hasAllTags) return false;
    }

    if (search.trim()) {
        const q = search.trim().toLowerCase();
        const brandModel = `${photo.vehicleBrand ?? ''} ${photo.vehicleModel ?? ''}`.toLowerCase();
        const plate = (photo.vehicleLicensePlate ?? '').toLowerCase();
        const customer = (photo.customerName ?? '').toLowerCase();
        if (!brandModel.includes(q) && !plate.includes(q) && !customer.includes(q)) {
            return false;
        }
    }

    return true;
}

// ─── api ───────────────────────────────────────────────────────────────────────

export const galleryApi = {
    getPhotos: async (filters: GalleryFilters): Promise<GalleryResponse> => {
        if (USE_MOCKS) {
            await new Promise(r => setTimeout(r, 300));

            const filtered = MOCK_PHOTOS.filter(p => photosMatchFilters(p, filters));
            const { page, pageSize } = filters;
            const total = filtered.length;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const safePage = Math.min(page, totalPages);
            const start = (safePage - 1) * pageSize;
            const photos = filtered.slice(start, start + pageSize);

            const allTags = Array.from(new Set(MOCK_PHOTOS.flatMap(p => p.tags))).sort();
            const allBrands = Array.from(
                new Set(MOCK_PHOTOS.map(p => p.vehicleBrand).filter(Boolean) as string[])
            ).sort();

            return {
                photos,
                pagination: { total, page: safePage, pageSize, totalPages },
                availableTags: allTags,
                availableBrands: allBrands,
            };
        }

        const params = new URLSearchParams();
        params.set('page', String(filters.page));
        params.set('pageSize', String(filters.pageSize));
        if (filters.search) params.set('search', filters.search);
        if (filters.tags.length) params.set('tags', filters.tags.join(','));

        const response = await apiClient.get(`/v1/gallery?${params.toString()}`);
        return response.data;
    },
};
