export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  appointment?: Appointment;
  createdAt: string;
}

export interface Appointment {
  id: string;
  userId?: string;
  slotId: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  status: 'CONFIRMED' | 'CANCELLED';
  slot: Slot;
  user?: User;
  createdAt: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  availableCount?: number;
}
