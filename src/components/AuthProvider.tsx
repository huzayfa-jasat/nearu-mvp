'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import AppLayout from './AppLayout';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

const publicPaths = ['/login', '/signup'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        // Force reload if user is logged in but not verified
        if (user && !user.emailVerified) {
          await user.reload();
          user = auth.currentUser;
        }
        setUser(user);
        setLoading(false);

        // Handle routing based on auth state
        if (!user && !publicPaths.includes(pathname)) {
          router.push('/login');
        } else if (user && publicPaths.includes(pathname)) {
          router.push('/matches');
        } else if (user && !user.emailVerified && !publicPaths.includes(pathname)) {
          // Redirect to login if email is not verified
          router.push('/login?error=Please verify your email to continue');
        }
      } catch {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Wrap authenticated pages with AppLayout
  if (user && !publicPaths.includes(pathname)) {
    return (
      <AuthContext.Provider value={{ user, loading }}>
        <AppLayout>{children}</AppLayout>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 