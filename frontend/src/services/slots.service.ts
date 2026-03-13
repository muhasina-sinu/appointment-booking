import api from './api';
import { Slot, PaginatedResponse } from '@/types';

export const slotsService = {
  async getAvailable(date?: string): Promise<Slot[]> {
    const params = date ? { date } : {};
    const { data } = await api.get<Slot[]>('/slots', { params });
    return data;
  },

  async getById(id: string): Promise<Slot> {
    const { data } = await api.get<Slot>(`/slots/${id}`);
    return data;
  },

  async getAll(
    date?: string,
    period?: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponse<Slot>> {
    const params: any = { page, limit };
    if (date) params.date = date;
    if (period) params.period = period;
    const { data } = await api.get<PaginatedResponse<Slot>>('/slots/all', { params });
    return data;
  },

  async create(slotData: { date: string; startTime: string; endTime: string }): Promise<Slot> {
    const { data } = await api.post<Slot>('/slots', slotData);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/slots/${id}`);
  },
};
