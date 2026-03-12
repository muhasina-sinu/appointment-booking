'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services';
import { FiMail, FiLock, FiLogIn, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await authService.login(email, password);
      login(data.user, data.accessToken);
      toast.success(`Welcome back, ${data.user.name}!`);

      // If there's a redirect path (e.g. from booking flow), go there
      if (redirectPath) {
        router.push(redirectPath);
      } else if (data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Invalid credentials';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 mt-2">
            Sign in to manage your appointments
          </p>
        </div>

        {/* Redirect notice — shown when user came from booking flow */}
        {redirectPath && (
          <div className="card bg-amber-50 border-amber-200 mb-4">
            <div className="flex items-center gap-2">
              <FiArrowLeft className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Please sign in to complete your booking. You&apos;ll be redirected back automatically.
              </p>
            </div>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                'Signing in...'
              ) : (
                <>
                  <FiLogIn className="h-5 w-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link
              href={redirectPath ? `/register?redirect=${encodeURIComponent(redirectPath)}` : '/register'}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-700 font-medium mb-1">Demo Admin Login</p>
          <p className="text-xs text-blue-600">
            Email: admin@appointbook.com<br />
            Password: admin123
          </p>
        </div>
      </div>
    </div>
  );
}
