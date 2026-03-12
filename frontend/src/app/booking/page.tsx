'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { slotsService, appointmentsService } from '@/services';
import { Slot } from '@/types';
import DatePicker from '@/components/ui/DatePicker';
import SlotCard from '@/components/ui/SlotCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatTime } from '@/utils/formatTime';
import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowLeft,
} from 'react-icons/fi';

export default function BookingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slotIdParam = searchParams.get('slotId');

  // ── Slot browsing state ───────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
  const [confirmBookSlotId, setConfirmBookSlotId] = useState<string | null>(null);

  // ── Direct slot confirmation state (from ?slotId= redirect) ──────────
  const [directSlot, setDirectSlot] = useState<Slot | null>(null);
  const [directSlotLoading, setDirectSlotLoading] = useState(false);
  const [directSlotError, setDirectSlotError] = useState<string | null>(null);
  const [isBookingDirect, setIsBookingDirect] = useState(false);

  // Set initial date to tomorrow (browsing mode only)
  useEffect(() => {
    if (!slotIdParam) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [slotIdParam]);

  // Fetch slots when date changes (browsing mode only)
  useEffect(() => {
    if (selectedDate && !slotIdParam) {
      fetchSlots();
    }
  }, [selectedDate, slotIdParam]);

  // Fetch specific slot when slotId param is present (direct booking mode)
  useEffect(() => {
    if (slotIdParam && !authLoading) {
      fetchDirectSlot(slotIdParam);
    }
  }, [slotIdParam, authLoading]);

  const fetchSlots = async () => {
    setIsLoading(true);
    try {
      const data = await slotsService.getAvailable(selectedDate);
      setSlots(data);
    } catch (error) {
      toast.error('Failed to load available slots');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDirectSlot = async (slotId: string) => {
    setDirectSlotLoading(true);
    setDirectSlotError(null);
    try {
      const slot = await slotsService.getById(slotId);
      if (slot.isBooked) {
        setDirectSlotError('This slot has already been booked by someone else.');
        setDirectSlot(null);
      } else {
        setDirectSlot(slot);
      }
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 404) {
        setDirectSlotError(
          'This slot is no longer available. It may have been removed.',
        );
      } else {
        setDirectSlotError('Failed to load slot details. Please try again.');
      }
      setDirectSlot(null);
    } finally {
      setDirectSlotLoading(false);
    }
  };

  const handleBookRequest = (slotId: string) => {
    if (!isAuthenticated) {
      toast('Please sign in to book an appointment', { icon: '🔒' });
      router.push(`/login?redirect=${encodeURIComponent(`/booking?slotId=${slotId}`)}`);
      return;
    }
    setConfirmBookSlotId(slotId);
  };

  const handleBook = async (slotId: string) => {
    setConfirmBookSlotId(null);
    setBookingSlotId(slotId);
    try {
      await appointmentsService.create(slotId);
      toast.success('Appointment booked successfully!');
      router.push('/success');
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to book appointment';
      toast.error(message);
      if (selectedDate) fetchSlots();
    } finally {
      setBookingSlotId(null);
    }
  };

  const handleDirectBook = async () => {
    if (!directSlot) return;

    if (!isAuthenticated) {
      toast('Please sign in to book an appointment', { icon: '🔒' });
      router.push(
        `/login?redirect=${encodeURIComponent(`/booking?slotId=${directSlot.id}`)}`,
      );
      return;
    }

    setIsBookingDirect(true);
    try {
      await appointmentsService.create(directSlot.id);
      toast.success('Appointment booked successfully!');
      router.push('/success');
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Failed to book appointment';
      toast.error(message);
      // Re-fetch slot to check if it's now booked
      await fetchDirectSlot(directSlot.id);
    } finally {
      setIsBookingDirect(false);
    }
  };

  // ── Direct Slot Confirmation View ─────────────────────────────────────
  if (slotIdParam) {
    return (
      <div className="page-container">
        <div className="max-w-lg mx-auto">
          {/* Back to browsing */}
          <button
            onClick={() => router.push('/booking')}
            className="flex items-center gap-1 text-gray-500 hover:text-primary-600 transition-colors mb-6"
          >
            <FiArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Browse all slots</span>
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Confirm Your Booking
          </h1>
          <p className="text-gray-500 mb-8">
            Review the slot details below and confirm your appointment.
          </p>

          {/* Loading */}
          {directSlotLoading && (
            <LoadingSpinner message="Loading slot details..." />
          )}

          {/* Error / unavailable */}
          {directSlotError && (
            <div className="card border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">
                    Slot Unavailable
                  </h3>
                  <p className="text-sm text-red-600 mt-1">
                    {directSlotError}
                  </p>
                  <button
                    onClick={() => router.push('/booking')}
                    className="btn-primary text-sm py-2 px-4 mt-4"
                  >
                    Browse Available Slots
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Slot confirmation card */}
          {directSlot && !directSlotLoading && (
            <div className="card border-primary-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary-100 rounded-xl">
                  <FiCalendar className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Appointment Details
                  </h2>
                  <p className="text-sm text-gray-500">
                    Confirm the details below
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FiCalendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Date
                    </p>
                    <p className="font-medium text-gray-900">
                      {new Date(directSlot.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FiClock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      Time
                    </p>
                    <p className="font-medium text-gray-900">
                      {formatTime(directSlot.startTime)} –{' '}
                      {formatTime(directSlot.endTime)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <FiCheckCircle className="h-5 w-5 text-green-500" />
                  <p className="font-medium text-green-700">
                    Available for booking
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDirectBook}
                  disabled={isBookingDirect}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isBookingDirect ? (
                    'Booking...'
                  ) : (
                    <>
                      <FiCheckCircle className="h-5 w-5" />
                      Confirm Booking
                    </>
                  )}
                </button>
                <button
                  onClick={() => router.push('/booking')}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Slot Browsing View (default) ──────────────────────────────────────
  return (
    <div className="page-container">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Book an Appointment
          </h1>
          <p className="text-gray-500">
            Select a date and choose from available consultation time slots.
          </p>
        </div>

        {/* Date Picker */}
        <div className="card mb-6">
          <DatePicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </div>

        {/* Slots */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Available Slots for{' '}
            {selectedDate &&
              new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
          </h2>

          {isLoading ? (
            <LoadingSpinner message="Loading available slots..." />
          ) : slots.length === 0 ? (
            <EmptyState
              title="No Slots Available"
              message="There are no available slots for the selected date. Please try another date."
              icon={<FiCalendar className="h-16 w-16" />}
            />
          ) : (
            <div className="space-y-3">
              {slots.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  onBook={handleBookRequest}
                  isLoading={bookingSlotId === slot.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!confirmBookSlotId}
        title="Confirm Booking"
        message="Would you like to book this appointment slot? You can cancel later from your dashboard."
        confirmText="Yes, Book It"
        cancelText="Go Back"
        variant="default"
        onConfirm={() => confirmBookSlotId && handleBook(confirmBookSlotId)}
        onCancel={() => setConfirmBookSlotId(null)}
      />
    </div>
  );
}
