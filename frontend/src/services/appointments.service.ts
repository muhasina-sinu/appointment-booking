import api from './api';
import { Appointment } from '@/types';

export const appointmentsService = {
  async create(slotId: string): Promise<Appointment> {
    const { data } = await api.post<Appointment>('/appointments', { slotId });
    return data;
  },

  async getAll(date?: string): Promise<Appointment[]> {
    const params = date ? { date } : {};
    const { data } = await api.get<Appointment[]>('/appointments', { params });
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
