'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { appointmentsService } from '@/services';
import { Appointment } from '@/types';
import { formatTime } from '@/utils/formatTime';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { FiCalendar, FiClock, FiTrash2 } from 'react-icons/fi';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      fetchAppointments();
    }
  }, [isAuthenticated, authLoading]);

  const fetchAppointments = async () => {
    try {
      const data = await appointmentsService.getMy();
      setAppointments(data);
    } catch (error) {
      toast.error('Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    setConfirmCancelId(null);
    setCancellingId(id);
    try {
      await appointmentsService.cancel(id);
      toast.success('Appointment cancelled');
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading || isLoading) {
    return <LoadingSpinner message="Loading your appointments..." />;
  }

  return (
    <div className="page-container">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
            <p className="text-gray-500 mt-1">
              Welcome back, {user?.name}! Here are your upcoming appointments.
            </p>
          </div>
          <Link href="/booking" className="btn-primary mt-4 sm:mt-0 text-center">
            Book New
          </Link>
        </div>

        {/* Appointments List */}
        {appointments.length === 0 ? (
          <EmptyState
            title="No Upcoming Appointments"
            message="You don't have any upcoming appointments. Book one now!"
            icon={<FiCalendar className="h-16 w-16" />}
          />
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-100 text-primary-600 rounded-xl">
                      <FiCalendar className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {new Date(appointment.slot.date).toLocaleDateString(
                          'en-US',
                          {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          },
                        )}
                      </p>
                      <div className="flex items-center gap-1 text-gray-500 mt-1">
                        <FiClock className="h-4 w-4" />
                        <span>
                          {formatTime(appointment.slot.startTime)} -{' '}
                          {formatTime(appointment.slot.endTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full ${
                        appointment.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {appointment.status}
                    </span>
                    {appointment.status === 'CONFIRMED' && (
                      <button
                        onClick={() => setConfirmCancelId(appointment.id)}
                        disabled={cancellingId === appointment.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancel appointment"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmCancelId}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        confirmText="Yes, Cancel"
        cancelText="Keep It"
        variant="danger"
        onConfirm={() => confirmCancelId && handleCancel(confirmCancelId)}
        onCancel={() => setConfirmCancelId(null)}
      />
    </div>
  );
}
