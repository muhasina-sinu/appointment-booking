import api from './api';
import { Slot } from '@/types';

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

  async getAll(date?: string): Promise<Slot[]> {
    const params = date ? { date } : {};
    const { data } = await api.get<Slot[]>('/slots/all', { params });
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
