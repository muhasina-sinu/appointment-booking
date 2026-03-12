'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { slotsService, appointmentsService } from '@/services';
import { Slot, Appointment } from '@/types';
import { formatTime } from '@/utils/formatTime';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  FiCalendar,
  FiClock,
  FiPlus,
  FiTrash2,
  FiUsers,
  FiList,
  FiUserPlus,
} from 'react-icons/fi';

export default function AdminDashboard() {
  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'slots' | 'appointments'>('slots');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');

  // Slot creation form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Admin booking state
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [bookingClientName, setBookingClientName] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      if (!isAdmin) {
        router.push('/dashboard');
        return;
      }
      fetchData();
    }
  }, [isAuthenticated, isAdmin, authLoading, filterDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [slotsData, appointmentsData] = await Promise.all([
        slotsService.getAll(filterDate || undefined),
        appointmentsService.getAll(filterDate || undefined),
      ]);
      setSlots(slotsData);
      setAppointments(appointmentsData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await slotsService.create(newSlot);
      toast.success('Slot created successfully!');
      setShowCreateForm(false);
      setNewSlot({ date: '', startTime: '', endTime: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create slot');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    setConfirmDeleteId(null);
    try {
      await slotsService.delete(id);
      toast.success('Slot deleted');
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete slot');
    }
  };

  const handleAdminBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSlotId || !bookingClientName.trim()) return;

    setIsBooking(true);
    try {
      await appointmentsService.adminBook(bookingSlotId, bookingClientName.trim());
      toast.success('Slot booked successfully!');
      setBookingSlotId(null);
      setBookingClientName('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to book slot');
    } finally {
      setIsBooking(false);
    }
  };

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return <LoadingSpinner />;
  }

  return (
    <div className="page-container">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Manage time slots and view bookings
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <FiCalendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{slots.length}</p>
              <p className="text-sm text-gray-500">Total Slots</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <FiUsers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {appointments.filter((a) => a.status === 'CONFIRMED').length}
              </p>
              <p className="text-sm text-gray-500">Active Bookings</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
              <FiClock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {slots.filter((s) => !s.isBooked).length}
              </p>
              <p className="text-sm text-gray-500">Available Slots</p>
            </div>
          </div>
        </div>

        {/* Filter & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('slots')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'slots'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <FiCalendar className="h-4 w-4" />
                Slots
              </span>
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'appointments'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <FiList className="h-4 w-4" />
                Bookings
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="input-field w-auto"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Slots Tab */}
            {activeTab === 'slots' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Time Slots
                  </h2>
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <FiPlus className="h-4 w-4" />
                    Add Slot
                  </button>
                </div>

                {/* Create Slot Form */}
                {showCreateForm && (
                  <div className="card mb-6 border-primary-200 bg-primary-50/50">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Create New Slot
                    </h3>
                    <form
                      onSubmit={handleCreateSlot}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          required
                          value={newSlot.date}
                          onChange={(e) =>
                            setNewSlot({ ...newSlot, date: e.target.value })
                          }
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          required
                          value={newSlot.startTime}
                          onChange={(e) =>
                            setNewSlot({ ...newSlot, startTime: e.target.value })
                          }
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          required
                          value={newSlot.endTime}
                          onChange={(e) =>
                            setNewSlot({ ...newSlot, endTime: e.target.value })
                          }
                          className="input-field"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <button
                          type="submit"
                          disabled={isCreating}
                          className="btn-primary flex-1"
                        >
                          {isCreating ? 'Creating...' : 'Create'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(false)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {slots.length === 0 ? (
                  <EmptyState
                    title="No Slots"
                    message="No time slots found. Create one to get started."
                  />
                ) : (
                  <div className="space-y-3">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="card hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                slot.isBooked
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-green-100 text-green-600'
                              }`}
                            >
                              <FiClock className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(slot.date).toLocaleDateString(
                                  'en-US',
                                  {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  },
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs font-medium px-3 py-1 rounded-full ${
                                slot.isBooked
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {slot.isBooked ? 'Booked' : 'Available'}
                            </span>
                            {slot.isBooked && slot.appointment?.user && slot.appointment.status === 'CONFIRMED' && (
                              <span className="text-sm text-gray-500">
                                by {slot.appointment.user.name}
                              </span>
                            )}
                            {slot.isBooked && slot.appointment?.clientName && slot.appointment.status === 'CONFIRMED' && (
                              <span className="text-sm text-gray-500">
                                by {slot.appointment.clientName}
                              </span>
                            )}
                            {!slot.isBooked && (
                              <button
                                onClick={() => setBookingSlotId(slot.id)}
                                className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Book for client"
                              >
                                <FiUserPlus className="h-4 w-4" />
                              </button>
                            )}
                            {!slot.isBooked && (
                              <button
                                onClick={() => setConfirmDeleteId(slot.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete slot"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  All Bookings
                </h2>

                {appointments.length === 0 ? (
                  <EmptyState
                    title="No Bookings"
                    message="No appointments have been booked yet."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                            Client
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                            Date
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                            Time
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {appointments.map((appointment) => (
                          <tr
                            key={appointment.id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {appointment.user?.name || appointment.clientName || 'Walk-in'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {appointment.user?.email || (appointment.clientName ? 'Walk-in booking' : '')}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(
                                appointment.slot.date,
                              ).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {formatTime(appointment.slot.startTime)} -{' '}
                              {formatTime(appointment.slot.endTime)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs font-medium px-3 py-1 rounded-full ${
                                  appointment.status === 'CONFIRMED'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {appointment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Admin Book Modal */}
      {bookingSlotId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setBookingSlotId(null);
              setBookingClientName('');
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Book Slot for Client
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter the client&apos;s name to book this time slot.
            </p>
            <form onSubmit={handleAdminBook}>
              <input
                type="text"
                required
                value={bookingClientName}
                onChange={(e) => setBookingClientName(e.target.value)}
                placeholder="Client name"
                className="input-field mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBookingSlotId(null);
                    setBookingClientName('');
                  }}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBooking || !bookingClientName.trim()}
                  className="btn-primary text-sm py-2 px-4"
                >
                  {isBooking ? 'Booking...' : 'Book Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete Time Slot"
        message="Are you sure you want to delete this time slot? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Keep It"
        variant="danger"
        onConfirm={() => confirmDeleteId && handleDeleteSlot(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
