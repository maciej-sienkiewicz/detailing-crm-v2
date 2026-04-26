/**
 * Tasks API — "Do zrobienia" CRUD
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
 */

import { apiClient } from '@/core';
import type { DashboardTask, CreateTaskPayload, UpdateTaskPayload } from '../types';

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
};
