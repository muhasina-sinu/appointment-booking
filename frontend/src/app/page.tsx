'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  FiCalendar,
  FiClock,
  FiShield,
  FiSmartphone,
  FiCheckCircle,
  FiArrowRight,
} from 'react-icons/fi';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Book Your Consultation{' '}
              <span className="text-primary-200">Effortlessly</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8 leading-relaxed">
              Schedule appointments with expert consultants in just a few clicks.
              No phone calls, no waiting — just smart, simple booking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-semibold py-3 px-8 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Book Appointment
                <FiArrowRight className="h-5 w-5" />
              </Link>
              {!isAuthenticated && (
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold py-3 px-8 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Create Account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose AppointBook?
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              A modern booking platform built for consultants and their clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<FiCalendar className="h-7 w-7" />}
              title="Easy Scheduling"
              description="Browse available time slots and book appointments with a single click."
            />
            <FeatureCard
              icon={<FiClock className="h-7 w-7" />}
              title="Real-time Availability"
              description="See live slot availability and never worry about double bookings."
            />
            <FeatureCard
              icon={<FiShield className="h-7 w-7" />}
              title="Secure & Reliable"
              description="JWT authentication and role-based access keep your data safe."
            />
            <FeatureCard
              icon={<FiSmartphone className="h-7 w-7" />}
              title="Mobile Friendly"
              description="Book appointments on the go with our fully responsive design."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Booking a consultation takes just three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              title="Create an Account"
              description="Sign up with your email and set a password to get started."
            />
            <StepCard
              step={2}
              title="Choose a Time Slot"
              description="Browse available dates and select a time that works for you."
            />
            <StepCard
              step={3}
              title="Confirm Booking"
              description="Review your selection and confirm. You're all set!"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-primary-100 mb-8">
            Join hundreds of clients who book their consultations with ease.
          </p>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold py-3 px-8 rounded-lg hover:bg-primary-50 transition-colors text-lg"
          >
            Book Your Appointment
            <FiArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card text-center hover:shadow-md transition-shadow">
      <div className="inline-flex items-center justify-center p-3 bg-primary-100 text-primary-600 rounded-xl mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-600 text-white rounded-full text-lg font-bold mb-4">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );
}
