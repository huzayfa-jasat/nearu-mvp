'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

interface UserSettings {
  ghostMode: boolean;
}

export default function SettingsPage() {
  const [user, loading] = useAuthState(auth);
  const [settings, setSettings] = useState<UserSettings>({ ghostMode: false });
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSettings({
            ghostMode: data.ghostMode || false
          });
        }
      } catch (e) {
        console.error('Error fetching settings:', e);
        setError('Failed to load settings.');
      }
    };

    fetchSettings();
  }, [user]);

  const handleToggleGhostMode = async () => {
    if (!user) return;

    try {
      const newSettings = { ...settings, ghostMode: !settings.ghostMode };
      await setDoc(doc(db, 'users', user.uid), newSettings, { merge: true });
      setSettings(newSettings);
    } catch (e) {
      console.error('Error updating settings:', e);
      setError('Failed to update settings.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-indigo-600">Settings</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        
        <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-indigo-600">Ghost Mode</h2>
              <p className="text-indigo-600 text-sm">
                When enabled, you won&apos;t be visible to other users and won&apos;t see their check-ins.
              </p>
            </div>
            <button
              onClick={handleToggleGhostMode}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                settings.ghostMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-indigo-600'
              }`}
            >
              {settings.ghostMode ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 