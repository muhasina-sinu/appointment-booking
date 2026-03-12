import Link from 'next/link';
import { FiCheckCircle, FiCalendar, FiArrowRight } from 'react-icons/fi';

export default function SuccessPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center p-4 bg-green-100 rounded-full mb-6">
          <FiCheckCircle className="h-16 w-16 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Booking Confirmed!
        </h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Your appointment has been successfully booked. You can view and manage
          your appointments from your dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <FiCalendar className="h-5 w-5" />
            View My Appointments
          </Link>
          <Link
            href="/booking"
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            Book Another
            <FiArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
