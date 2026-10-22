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
import type { DashboardTask, CreateTaskPayload, UpdateTaskPayload, ArchivedTask, TaskVisibilityOptions } from '../types';
import type { Page } from '@/core/page';

// ─── In-memory store ──────────────────────────────────────────────────────────

/** MediaRecorder oddaje Blob bez nazwy; serwer rozpoznaje kontener po rozszerzeniu. */
const voiceFilename = (mimeType: string): string => {
  if (mimeType.startsWith('audio/mp4')) return 'task-note.m4a';
  if (mimeType.startsWith('audio/ogg')) return 'task-note.ogg';
  return 'task-note.webm';
};

// ─── API ─────────────────────────────────────────────────────────────────────

export const tasksApi = {
  list: async (): Promise<DashboardTask[]> => {
    const response = await apiClient.get('/v1/tasks');
    return response.data;
  },

  create: async (payload: CreateTaskPayload): Promise<DashboardTask> => {
    const response = await apiClient.post('/v1/tasks', payload);
    return response.data;
  },

  update: async (id: string, payload: UpdateTaskPayload): Promise<DashboardTask> => {
    const response = await apiClient.patch(`/v1/tasks/${id}`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/v1/tasks/${id}`);
  },

  /**
   * Dyktowanie zadania. Backend transkrybuje nagranie (Whisper) i tworzy z niego
   * zadanie, więc front nie dostaje samego tekstu - dostaje gotową pozycję listy.
   * Nazwa pliku niesie kontener, bo Blob z MediaRecordera nie ma rozszerzenia,
   * a po nim serwer rozpoznaje format.
   */
  createFromVoice: async (audioBlob: Blob, mimeType: string): Promise<DashboardTask> => {
    const form = new FormData();
    form.append('audio', new File([audioBlob], voiceFilename(mimeType), { type: mimeType }));
    const response = await apiClient.post('/v1/tasks/voice', form);
    return response.data;
  },

  getVisibilityOptions: async (): Promise<TaskVisibilityOptions> => {
    const response = await apiClient.get('/v1/tasks/visibility-options');
    return response.data;
  },
};

// ─── Archive API ──────────────────────────────────────────────────────────────

export const taskArchiveApi = {
  list: async (params: { page: number; pageSize: number; search?: string }, signal?: AbortSignal): Promise<Page<ArchivedTask>> => {
    const response = await apiClient.get<Page<ArchivedTask>>('/v1/tasks/archive', { params, signal });
    return response.data;
  },
};
