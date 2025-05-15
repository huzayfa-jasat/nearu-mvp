// File: src/app/matches/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { startLocationTracking, stopLocationTracking } from '@/lib/location';
import { calculateDistance } from '@/lib/location';
import { Location } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface NearbyUser {
  id: string;
  name: string;
  program: string;
  distance: number;
  location: Location;
}

interface UserData {
  name: string;
  program: string;
  location: Location;
  ghostMode?: boolean;
  isActive?: boolean;
}

export default function MatchesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [error, setError] = useState('');
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add auto-refresh effect with faster interval
  useEffect(() => {
    if (!user) return;
    
    const refreshInterval = setInterval(() => {
      window.location.reload();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(refreshInterval);
  }, [user]);

  // Update ghost mode in Firestore when it changes
  useEffect(() => {
    if (!user) return;

    const updateGhostMode = async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          ghostMode: isGhostMode,
          isActive: !isGhostMode,
          lastActive: new Date()
        }, { merge: true });
      } catch (error) {
        console.error('Error updating ghost mode:', error);
        setError('Failed to update ghost mode');
      }
    };

    updateGhostMode();
  }, [user, isGhostMode]);

  useEffect(() => {
    if (!user) return;

    // Check ghost mode
    const checkGhostMode = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setIsGhostMode(data.ghostMode || false);
          // If ghost mode is on, set isActive to false
          if (data.ghostMode) {
            await setDoc(doc(db, 'users', user.uid), {
              isActive: false,
              lastActive: new Date()
            }, { merge: true });
          } else {
            await setDoc(doc(db, 'users', user.uid), {
              isActive: true,
              lastActive: new Date()
            }, { merge: true });
          }
        }
      } catch (error) {
        console.error('Error checking ghost mode:', error);
        setError('Failed to check ghost mode status');
      }
    };

    checkGhostMode();

    // Start location tracking
    const handleLocationUpdate = async (location: Location) => {
      try {
        setCurrentLocation(location);
        setIsLoading(false);
        
        // Get current user data first
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          setError('User profile not found');
          return;
        }
        
        const userData = userDoc.data();
        // Update user's location in Firestore, preserving existing data
        await setDoc(doc(db, 'users', user.uid), {
          location,
          lastActive: new Date(),
          isActive: !isGhostMode,
          name: userData.name || 'Unknown',
          program: userData.program || 'Unknown',
          email: user.email || '',
        }, { merge: true });
      } catch (error) {
        console.error('Error updating location:', error);
        setError('Failed to update location');
      }
    };

    const handleLocationError = (error: Error) => {
      console.error('Location error:', error);
      setError('Unable to get your location. Please enable location services.');
      setIsLoading(false);
    };

    startLocationTracking(handleLocationUpdate, handleLocationError);

    // Listen for nearby users
    const q = query(
      collection(db, 'users'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const users: NearbyUser[] = [];
      for (const docSnap of snapshot.docs) {
        if (docSnap.id === user.uid) continue;
        const userData = docSnap.data() as UserData;
        if (!userData.location || userData.ghostMode || !currentLocation) continue;
        const distance = calculateDistance(userData.location, currentLocation);
        if (distance <= 100) {
          users.push({
            id: docSnap.id,
            name: userData.name || 'Unknown',
            program: userData.program || 'Unknown',
            distance,
            location: userData.location
          });
        }
      }
      users.sort((a, b) => a.distance - b.distance);
      setNearbyUsers(users);
    });

    return () => {
      stopLocationTracking();
      unsubscribe();
      // Set isActive to false when component unmounts
      setDoc(doc(db, 'users', user.uid), {
        isActive: false,
        lastActive: new Date()
      }, { merge: true });
    };
  }, [user, currentLocation]);

  const handleMessage = (userId: string) => {
    router.push(`/messages/${userId}`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">Nearby Students</h1>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
            >
              Refresh Now
            </button>
            <button
              onClick={() => setIsGhostMode(!isGhostMode)}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                isGhostMode 
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                  : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
              }`}
            >
              {isGhostMode ? 'Ghost Mode: On' : 'Ghost Mode: Off'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {isGhostMode && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            You are in ghost mode. Other users cannot see you.
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Finding nearby students...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {nearbyUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No nearby students found. Keep walking around campus to find matches!</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full hover:bg-indigo-200"
                >
                  Refresh Location
                </button>
              </div>
            ) : (
              nearbyUsers.map((user) => (
                <div 
                  key={user.id}
                  className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-lg">{user.name}</strong>
                      <p className="text-gray-600">{user.program}</p>
                    </div>
                    <span className="text-sm text-gray-500">{user.distance.toFixed(1)}m away</span>
                  </div>
                  <button 
                    className="mt-3 w-full bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full hover:bg-indigo-200"
                    onClick={() => handleMessage(user.id)}
                  >
                    Message
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
