'use client';

import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/useAuth';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </AuthProvider>
  );
}
