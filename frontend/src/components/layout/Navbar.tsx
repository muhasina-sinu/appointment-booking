'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiMenu, FiX, FiCalendar } from 'react-icons/fi';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    router.push('/');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <FiCalendar className="h-7 w-7 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">
                Appoint<span className="text-primary-600">Book</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-600 hover:text-primary-600 transition-colors font-medium"
            >
              Home
            </Link>
            <Link
              href="/booking"
              className="text-gray-600 hover:text-primary-600 transition-colors font-medium"
            >
              Book Now
            </Link>

            {isAuthenticated ? (
              <>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="text-gray-600 hover:text-primary-600 transition-colors font-medium"
                  >
                    Admin Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="text-gray-600 hover:text-primary-600 transition-colors font-medium"
                  >
                    My Appointments
                  </Link>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    Hi, {user?.name}
                  </span>
                  <button onClick={() => setShowLogoutConfirm(true)} className="btn-secondary text-sm py-2 px-4">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="btn-secondary text-sm py-2 px-4">
                  Login
                </Link>
                <Link href="/register" className="btn-primary text-sm py-2 px-4">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? (
                <FiX className="h-6 w-6" />
              ) : (
                <FiMenu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="px-4 pt-2 pb-4 space-y-2">
            <Link
              href="/"
              className="block py-2 text-gray-600 hover:text-primary-600 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/booking"
              className="block py-2 text-gray-600 hover:text-primary-600 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Book Now
            </Link>

            {isAuthenticated ? (
              <>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="block py-2 text-gray-600 hover:text-primary-600 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/dashboard"
                    className="block py-2 text-gray-600 hover:text-primary-600 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Appointments
                  </Link>
                )}
                <div className="pt-2 border-t border-gray-100">
                  <span className="block text-sm text-gray-500 py-1">
                    Hi, {user?.name}
                  </span>
                  <button
                    onClick={() => setShowLogoutConfirm(true)}
                    className="w-full text-left py-2 text-red-600 font-medium"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <Link
                  href="/login"
                  className="block py-2 text-gray-600 hover:text-primary-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block py-2 text-primary-600 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Logout"
        message="Are you sure you want to log out of your account?"
        confirmText="Yes, Logout"
        cancelText="Stay"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </nav>
  );
}
