import api from './api';
import { Appointment, PaginatedResponse } from '@/types';

export const appointmentsService = {
  async create(slotId: string): Promise<Appointment> {
    const { data } = await api.post<Appointment>('/appointments', { slotId });
    return data;
  },

  async getAll(date?: string, page = 1, limit = 10, status?: string): Promise<PaginatedResponse<Appointment>> {
    const params: any = { page, limit };
    if (date) params.date = date;
    if (status) params.status = status;
    const { data } = await api.get<PaginatedResponse<Appointment>>('/appointments', { params });
    return data;
  },

  async getMy(): Promise<Appointment[]> {
    const { data } = await api.get<Appointment[]>('/appointments/my');
    return data;
  },

  async cancel(id: string): Promise<Appointment> {
    const { data } = await api.delete<Appointment>(`/appointments/${id}`);
    return data;
  },

  async adminBook(slotId: string, clientName: string, clientPhone: string, clientEmail?: string): Promise<Appointment> {
    const { data } = await api.post<Appointment>('/appointments/admin-book', {
      slotId,
      clientName,
      clientPhone,
      ...(clientEmail ? { clientEmail } : {}),
    });
    return data;
  },
};
