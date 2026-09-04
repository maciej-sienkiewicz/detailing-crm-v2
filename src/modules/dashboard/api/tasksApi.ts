/**
 * Tasks API: "Do zrobienia" CRUD
 *
 * Backend contract:
 *
 *   GET    /v1/tasks
 *     → 200  DashboardTask[]
 *
 *   POST   /v1/tasks
 *     ← { title: string; meta?: string }
 *     → 201  DashboardTask
 *
 *   PATCH  /v1/tasks/{id}
 *     ← { title?: string; meta?: string; done?: boolean }
 *     → 200  DashboardTask
 *
 *   DELETE /v1/tasks/{id}
 *     → 204  (empty body)
 *
 *   POST   /v1/tasks/voice          (multipart/form-data)
 *     ← audio: plik nagrania (webm/ogg/m4a - zależy od przeglądarki)
 *     → 201  DashboardTask          (backend transkrybuje i tworzy zadanie)
 */

import { apiClient } from '@/core';
import type { DashboardTask, CreateTaskPayload, UpdateTaskPayload, ArchivedTask, TaskArchivePage, TaskVisibilityOptions } from '../types';

const USE_MOCKS = false;

// ─── In-memory store ──────────────────────────────────────────────────────────

let mockArchive: ArchivedTask[] = [
  {
    id: 'a1',
    title: 'Zamówić folię PPF',
    meta: 'Dostawca: XYZ',
    done: true,
    createdAt: '2026-05-01T10:00:00Z',
    createdByUserName: 'Anna Nowak',
    completedAt: '2026-05-10T14:30:00Z',
    completedByUserName: 'Jan Kowalski',
    deletedAt: '2026-05-15T09:12:00Z',
    deletedByUserName: 'Anna Nowak',
  },
  {
    id: 'a2',
    title: 'Kupić nowe gąbki polerskie',
    meta: 'Magazyn · pilne',
    done: false,
    createdAt: '2026-05-03T08:00:00Z',
    createdByUserName: 'Jan Kowalski',
    completedAt: null,
    completedByUserName: null,
    deletedAt: '2026-05-14T11:00:00Z',
    deletedByUserName: 'Anna Nowak',
  },
];

let mockTasks: DashboardTask[] = [
  { id: 't1', title: 'Wystaw fakturę dla J. Kowalski', meta: 'Wczoraj · 1 850,00 zł', done: true, createdAt: new Date().toISOString() },
  { id: 't2', title: 'Zamów wosk ceramiczny', meta: 'Magazyn · niski stan', done: false, createdAt: new Date().toISOString() },
  { id: 't3', title: 'Zadzwoń do A. Nowak (zaległość)', meta: 'Pilne · 3 dni po terminie', done: false, createdAt: new Date().toISOString() },
  { id: 't4', title: 'Przygotuj post na Instagram', meta: 'Powłoka ceramiczna · Porsche 911', done: false, createdAt: new Date().toISOString() },
  { id: 't5', title: 'Podpisz umowę flotową (Truck-Pol)', meta: 'Oczekuje od 2 dni', done: false, createdAt: new Date().toISOString() },
];

let nextId = 6;

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));

/** MediaRecorder oddaje Blob bez nazwy; serwer rozpoznaje kontener po rozszerzeniu. */
const voiceFilename = (mimeType: string): string => {
  if (mimeType.startsWith('audio/mp4')) return 'task-note.m4a';
  if (mimeType.startsWith('audio/ogg')) return 'task-note.ogg';
  return 'task-note.webm';
};

// ─── API ─────────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: async (): Promise<DashboardTask[]> => {
    if (USE_MOCKS) {
      await delay();
      return [...mockTasks];
    }
    const response = await apiClient.get('/v1/tasks');
    return response.data;
  },

  create: async (payload: CreateTaskPayload): Promise<DashboardTask> => {
    if (USE_MOCKS) {
      await delay();
      const task: DashboardTask = {
        id: `t${nextId++}`,
        title: payload.title,
        meta: payload.meta ?? '',
        done: false,
        createdAt: new Date().toISOString(),
      };
      mockTasks = [task, ...mockTasks];
      return task;
    }
    const response = await apiClient.post('/v1/tasks', payload);
    return response.data;
  },

  update: async (id: string, payload: UpdateTaskPayload): Promise<DashboardTask> => {
    if (USE_MOCKS) {
      await delay();
      mockTasks = mockTasks.map(t =>
        t.id === id ? { ...t, ...payload } : t,
      );
      const updated = mockTasks.find(t => t.id === id);
      if (!updated) throw new Error(`Task ${id} not found`);
      return updated;
    }
    const response = await apiClient.patch(`/v1/tasks/${id}`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    if (USE_MOCKS) {
      await delay();
      mockTasks = mockTasks.filter(t => t.id !== id);
      return;
    }
    await apiClient.delete(`/v1/tasks/${id}`);
  },

  /**
   * Dyktowanie zadania. Backend transkrybuje nagranie (Whisper) i tworzy z niego
   * zadanie, więc front nie dostaje samego tekstu - dostaje gotową pozycję listy.
   * Nazwa pliku niesie kontener, bo Blob z MediaRecordera nie ma rozszerzenia,
   * a po nim serwer rozpoznaje format.
   */
  createFromVoice: async (audioBlob: Blob, mimeType: string): Promise<DashboardTask> => {
    if (USE_MOCKS) {
      await delay(800);
      const task: DashboardTask = {
        id: `t${nextId++}`,
        title: 'Zadanie z dyktowania',
        meta: '',
        done: false,
        createdAt: new Date().toISOString(),
      };
      mockTasks = [task, ...mockTasks];
      return task;
    }
    const form = new FormData();
    form.append('audio', new File([audioBlob], voiceFilename(mimeType), { type: mimeType }));
    const response = await apiClient.post('/v1/tasks/voice', form);
    return response.data;
  },

  getVisibilityOptions: async (): Promise<TaskVisibilityOptions> => {
    if (USE_MOCKS) {
      await delay();
      return { users: [], roles: [] };
    }
    const response = await apiClient.get('/v1/tasks/visibility-options');
    return response.data;
  },
};

// ─── Archive API ──────────────────────────────────────────────────────────────

export const taskArchiveApi = {
  list: async (params: { page: number; size: number; search?: string }): Promise<TaskArchivePage> => {
    if (USE_MOCKS) {
      await delay();
      const filtered = params.search
        ? mockArchive.filter(a => a.title.toLowerCase().includes(params.search!.toLowerCase()))
        : mockArchive;
      const total = filtered.length;
      const start = (params.page - 1) * params.size;
      return {
        items: filtered.slice(start, start + params.size),
        pagination: {
          total,
          page: params.page,
          pageSize: params.size,
          totalPages: Math.max(1, Math.ceil(total / params.size)),
        },
      };
    }
    const response = await apiClient.get('/v1/tasks/archive', { params });
    return response.data;
  },
};
