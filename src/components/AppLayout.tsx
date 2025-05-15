'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from './Navigation';
import { getCurrentLocation } from '@/lib/location';
import { useAuth } from './AuthProvider';
import { useFCMToken } from '@/hooks/useFCMToken';
import { useInAppFCMNotification } from '@/hooks/useInAppFCMNotification';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useFCMToken(user);
  useInAppFCMNotification();

  useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        // Try to get location - this will trigger the permission prompt if not granted
        await getCurrentLocation();
        setShowLocationPrompt(false);
      } catch (error) {
        if (error instanceof Error && error.message.includes('denied')) {
          setShowLocationPrompt(true);
        }
      }
    };

    checkLocationPermission();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 pb-16">
      {children}
      
      {showLocationPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-semibold mb-4">Location Access Required</h2>
            <p className="text-gray-600 mb-6">
              NearU needs access to your location to find nearby matches. Please enable location services to continue.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Go to Settings
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
} 