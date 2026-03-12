'use client';

import { Slot } from '@/types';
import { formatTime } from '@/utils/formatTime';
import { FiClock, FiCheck, FiX } from 'react-icons/fi';

interface SlotCardProps {
  slot: Slot;
  onBook?: (slotId: string) => void;
  onDelete?: (slotId: string) => void;
  showActions?: boolean;
  isAdmin?: boolean;
  isLoading?: boolean;
}

export default function SlotCard({
  slot,
  onBook,
  onDelete,
  showActions = true,
  isAdmin = false,
  isLoading = false,
}: SlotCardProps) {
  return (
    <div
      className={`card hover:shadow-md transition-shadow ${
        slot.isBooked ? 'opacity-60 bg-gray-50' : ''
      }`}
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
              {new Date(slot.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {slot.isBooked ? (
            <span className="inline-flex items-center gap-1 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
              <FiX className="h-3 w-3" />
              Booked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <FiCheck className="h-3 w-3" />
              Available
            </span>
          )}

          {showActions && !slot.isBooked && onBook && (
            <button
              onClick={() => onBook(slot.id)}
              disabled={isLoading}
              className="btn-primary text-sm py-1.5 px-3"
            >
              {isLoading ? 'Booking...' : 'Book'}
            </button>
          )}

          {isAdmin && onDelete && !slot.isBooked && (
            <button
              onClick={() => onDelete(slot.id)}
              disabled={isLoading}
              className="btn-danger text-sm py-1.5 px-3"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
