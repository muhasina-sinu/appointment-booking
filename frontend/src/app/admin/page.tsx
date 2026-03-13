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
import Pagination from '@/components/ui/Pagination';
import {
  FiCalendar,
  FiClock,
  FiPlus,
  FiTrash2,
  FiUsers,
  FiList,
  FiUserPlus,
  FiPhone,
  FiMail,
} from 'react-icons/fi';

export default function AdminDashboard() {
  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'slots' | 'pastSlots' | 'appointments'>('slots');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [pastSlots, setPastSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const [slotsPage, setSlotsPage] = useState(1);
  const [slotsTotalPages, setSlotsTotalPages] = useState(1);
  const [slotsTotal, setSlotsTotal] = useState(0);
  const [pastSlotsPage, setPastSlotsPage] = useState(1);
  const [pastSlotsTotalPages, setPastSlotsTotalPages] = useState(1);
  const [pastSlotsTotal, setPastSlotsTotal] = useState(0);
  const [appointmentsPage, setAppointmentsPage] = useState(1);
  const [appointmentsTotalPages, setAppointmentsTotalPages] = useState(1);
  const [appointmentsTotal, setAppointmentsTotal] = useState(0);
  // Stats: confirmed bookings count + available slots count
  const [confirmedBookingsCount, setConfirmedBookingsCount] = useState(0);
  const [availableSlotsCount, setAvailableSlotsCount] = useState(0);

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
  const [bookingClientPhone, setBookingClientPhone] = useState('');
  const [bookingClientEmail, setBookingClientEmail] = useState('');
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
      fetchStats();
    }
  }, [isAuthenticated, isAdmin, authLoading, filterDate, activeTab, slotsPage, pastSlotsPage, appointmentsPage]);

  // Fetch summary counts for stats cards (runs on mount + when filter changes)
  const fetchStats = async () => {
    try {
      const [upcomingRes, confirmedRes] = await Promise.all([
        slotsService.getAll(undefined, 'upcoming', 1, 1),
        appointmentsService.getAll(undefined, 1, 1, 'CONFIRMED'),
      ]);
      setSlotsTotal(upcomingRes.total);
      setConfirmedBookingsCount(confirmedRes.total);
      // Available = upcoming slots that are not booked
      const available = upcomingRes.data.filter((s) => !s.isBooked).length;
      // Use a larger fetch for accurate available count
      const bigRes = await slotsService.getAll(undefined, 'upcoming', 1, 1000);
      setAvailableSlotsCount(bigRes.data.filter((s) => !s.isBooked).length);
    } catch {
      // stats are best-effort
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'pastSlots') {
        // Past Slots tab — fetch only past slots
        const pastRes = await slotsService.getAll(
          filterDate || undefined,
          filterDate ? undefined : 'past',
          pastSlotsPage,
          ITEMS_PER_PAGE,
        );
        setPastSlots(pastRes.data);
        setPastSlotsTotal(pastRes.total);
        setPastSlotsTotalPages(pastRes.totalPages);
      } else if (activeTab === 'appointments') {
        const apptRes = await appointmentsService.getAll(
          filterDate || undefined,
          appointmentsPage,
          ITEMS_PER_PAGE,
        );
        setAppointments(apptRes.data);
        setAppointmentsTotal(apptRes.total);
        setAppointmentsTotalPages(apptRes.totalPages);
      } else {
        // Slots (upcoming) tab
        const slotsRes = await slotsService.getAll(
          filterDate || undefined,
          filterDate ? undefined : 'upcoming',
          slotsPage,
          ITEMS_PER_PAGE,
        );
        setSlots(slotsRes.data);
        setSlotsTotal(slotsRes.total);
        setSlotsTotalPages(slotsRes.totalPages);
      }
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
    if (!bookingSlotId || !bookingClientName.trim() || !bookingClientPhone.trim()) return;

    if (!/^\d{10,15}$/.test(bookingClientPhone)) {
      toast.error('Phone number must be 10–15 digits');
      return;
    }

    setIsBooking(true);
    try {
      await appointmentsService.adminBook(
        bookingSlotId,
        bookingClientName.trim(),
        bookingClientPhone.trim(),
        bookingClientEmail.trim() || undefined,
      );
      toast.success('Slot booked successfully!');
      setBookingSlotId(null);
      setBookingClientName('');
      setBookingClientPhone('');
      setBookingClientEmail('');
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
              <p className="text-2xl font-bold text-gray-900">{slotsTotal}</p>
              <p className="text-sm text-gray-500">Upcoming Slots</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <FiUsers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {confirmedBookingsCount}
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
                {availableSlotsCount}
              </p>
              <p className="text-sm text-gray-500">Available Slots</p>
            </div>
          </div>
        </div>

        {/* Filter & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveTab('slots'); setSlotsPage(1); }}
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
              onClick={() => { setActiveTab('pastSlots'); setPastSlotsPage(1); }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'pastSlots'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <FiClock className="h-4 w-4" />
                Past Slots
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('appointments'); setAppointmentsPage(1); }}
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
              onChange={(e) => {
                setFilterDate(e.target.value);
                setSlotsPage(1);
                setPastSlotsPage(1);
                setAppointmentsPage(1);
              }}
              className="input-field w-auto"
            />
            {filterDate && (
              <button
                onClick={() => {
                  setFilterDate('');
                  setSlotsPage(1);
                  setPastSlotsPage(1);
                  setAppointmentsPage(1);
                }}
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

                <Pagination
                  page={slotsPage}
                  totalPages={slotsTotalPages}
                  total={slotsTotal}
                  onPageChange={setSlotsPage}
                />
              </div>
            )}

            {/* Past Slots Tab */}
            {activeTab === 'pastSlots' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Past Slots
                </h2>

                {pastSlots.length === 0 ? (
                  <EmptyState
                    title="No Past Slots"
                    message="No past time slots found."
                  />
                ) : (
                  <div className="space-y-3">
                    {pastSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="card hover:shadow-md transition-shadow opacity-75"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                slot.isBooked
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-gray-100 text-gray-500'
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
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {slot.isBooked ? 'Was Booked' : 'Unused'}
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
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Pagination
                  page={pastSlotsPage}
                  totalPages={pastSlotsTotalPages}
                  total={pastSlotsTotal}
                  onPageChange={setPastSlotsPage}
                />
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
                    <table className="w-full table-auto min-w-[700px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-3 text-sm font-medium text-gray-500">
                            Client
                          </th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-gray-500">
                            Phone
                          </th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-gray-500">
                            Email
                          </th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-gray-500">
                            Date
                          </th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-gray-500">
                            Time
                          </th>
                          <th className="text-left py-3 px-3 text-sm font-medium text-gray-500">
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
                            <td className="py-3 px-3">
                              <p className="font-medium text-gray-900 break-words max-w-[150px]">
                                {appointment.user?.name || appointment.clientName || 'Walk-in'}
                              </p>
                            </td>
                            <td className="py-3 px-3 text-gray-600 text-sm whitespace-nowrap">
                              {appointment.user?.phone || appointment.clientPhone || '—'}
                            </td>
                            <td className="py-3 px-3 text-gray-600 text-sm">
                              <span className="break-all max-w-[180px] block">
                                {appointment.user?.email || appointment.clientEmail || '—'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-600 text-sm whitespace-nowrap">
                              {new Date(
                                appointment.slot.date,
                              ).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-3 px-3 text-gray-600 text-sm whitespace-nowrap">
                              {formatTime(appointment.slot.startTime)} –{' '}
                              {formatTime(appointment.slot.endTime)}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
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

                <Pagination
                  page={appointmentsPage}
                  totalPages={appointmentsTotalPages}
                  total={appointmentsTotal}
                  onPageChange={setAppointmentsPage}
                />
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
              setBookingClientPhone('');
              setBookingClientEmail('');
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Book Slot for Client
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter the client&apos;s details to book this time slot.
            </p>
            <form onSubmit={handleAdminBook} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookingClientName}
                  onChange={(e) => setBookingClientName(e.target.value)}
                  placeholder="Client name"
                  className="input-field"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="tel"
                    required
                    value={bookingClientPhone}
                    onChange={(e) => setBookingClientPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234567890"
                    className="input-field pl-10"
                    maxLength={15}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">10–15 digits</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="email"
                    value={bookingClientEmail}
                    onChange={(e) => setBookingClientEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="input-field pl-10"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBookingSlotId(null);
                    setBookingClientName('');
                    setBookingClientPhone('');
                    setBookingClientEmail('');
                  }}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBooking || !bookingClientName.trim() || !bookingClientPhone.trim()}
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
