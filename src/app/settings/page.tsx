'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { sendEmailVerification } from 'firebase/auth';

interface UserSettings {
  ghostMode: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ name: string; program: string; email: string }>({ name: '', program: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings>({ ghostMode: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile({
            name: data.name || 'Unknown',
            program: data.program || 'Unknown',
            email: data.email || user.email || 'Unknown',
          });
        } else {
          setProfile({ name: 'Unknown', program: 'Unknown', email: user.email || 'Unknown' });
        }
      } catch {
        setProfile({ name: 'Unknown', program: 'Unknown', email: user.email || 'Unknown' });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

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
        {success && <p className="text-green-600 mb-4">{success}</p>}
        
        {/* Profile Section */}
        <div className="mb-8 bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-bold mb-2">Profile</h2>
          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : (
            <div className="space-y-1">
              <div><span className="font-semibold">Name:</span> {profile.name}</div>
              <div><span className="font-semibold">Program:</span> {profile.program}</div>
              <div><span className="font-semibold">Email:</span> {profile.email}</div>
              <div className="mt-4">
                <span className="font-semibold">Email Verification:</span>{' '}
                {user?.emailVerified ? (
                  <span className="text-green-600">Verified ✓</span>
                ) : (
                  <div className="mt-2">
                    <span className="text-red-600">Not Verified ✗</span>
                    <button
                      onClick={async () => {
                        if (user) {
                          try {
                            await sendEmailVerification(user);
                            setSuccess('Verification email sent! Please check your inbox.');
                          } catch (error) {
                            setError('Failed to send verification email. Please try again.');
                          }
                        }
                      }}
                      className="ml-4 text-indigo-600 hover:text-indigo-800"
                    >
                      Resend Verification Email
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
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
        {/* Logout Button */}
        <div className="mt-8">
          <button
            onClick={async () => {
              if (user) {
                await setDoc(doc(db, 'users', user.uid), { isActive: false, lastActive: new Date() }, { merge: true });
              }
              await auth.signOut();
              router.push('/login');
            }}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Log Out
          </button>
        </div>
        <div className="mt-4">
          <a
            href="mailto:hjasat@uwaterloo.ca?subject=NearU%20App%20Feedback"
            className="w-full block px-4 py-2 bg-indigo-100 text-indigo-800 rounded-lg font-semibold text-center hover:bg-indigo-200 transition-colors"
          >
            Give Feedback
          </a>
        </div>
      </div>
    </div>
  );
} 