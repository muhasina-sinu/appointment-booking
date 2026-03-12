'use client';

import { FiCalendar, FiMail, FiGithub } from 'react-icons/fi';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function Footer() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FiCalendar className="h-6 w-6 text-primary-400" />
              <span className="text-lg font-bold text-white">
                Appoint<span className="text-primary-400">Book</span>
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Professional consultation booking made simple. Schedule your
              appointments with ease and manage your time effectively.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-primary-400 transition-colors">
                  Home
                </Link>
              </li>
              {isAuthenticated && !isAdmin && (
                <li>
                  <Link href="/booking" className="hover:text-primary-400 transition-colors">
                    Book Appointment
                  </Link>
                </li>
              )}
              {!isAuthenticated && (
                <>
                  <li>
                    <Link href="/login" className="hover:text-primary-400 transition-colors">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className="hover:text-primary-400 transition-colors">
                      Register
                    </Link>
                  </li>
                </>
              )}
              {isAuthenticated && !isAdmin && (
                <li>
                  <Link href="/dashboard" className="hover:text-primary-400 transition-colors">
                    My Appointments
                  </Link>
                </li>
              )}
              {isAdmin && (
                <li>
                  <Link href="/admin" className="hover:text-primary-400 transition-colors">
                    Admin Dashboard
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <div className="space-y-3 text-sm">
              <a
                href="mailto:contact@appointbook.com"
                className="flex items-center gap-2 hover:text-primary-400 transition-colors"
              >
                <FiMail className="h-4 w-4" />
                contact@appointbook.com
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary-400 transition-colors"
              >
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} AppointBook. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
