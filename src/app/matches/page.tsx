// File: src/app/matches/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { startLocationTracking, stopLocationTracking, getCurrentLocation } from '@/lib/location';
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
  lastActive?: Timestamp | Date;
}

export default function MatchesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [error, setError] = useState('');
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Move fetchNearbyUsers to top level
  const fetchNearbyUsers = async (location: Location) => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'users'),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      const now = Date.now();
      const users: NearbyUser[] = [];
      for (const docSnap of snapshot.docs) {
        if (docSnap.id === user.uid) continue;
        const userData = docSnap.data() as UserData;
        if (!userData.location || userData.ghostMode) continue;
        let lastActive = 0;
        if (userData.lastActive instanceof Timestamp) {
          lastActive = userData.lastActive.toDate().getTime();
        } else if (userData.lastActive instanceof Date) {
          lastActive = userData.lastActive.getTime();
        }
        if (now - lastActive > 60 * 60 * 1000) continue;
        const distance = calculateDistance(userData.location, location);
        if (distance <= 500) {
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
      // Update lastActive for current user
      await setDoc(doc(db, 'users', user.uid), { lastActive: new Date() }, { merge: true });
    } catch {
      setError('Failed to fetch nearby users.');
    }
  };

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
    console.log('MatchesPage: user:', user);

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

    // Remove auto-refresh effect and onSnapshot for nearby users
    // Add fallback timer for location update every 5 minutes (if app is open)
    let locationInterval: NodeJS.Timeout | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    let isAppActive = true;
    let lastLocation: Location | null = null;

    // Helper: update location in Firestore
    const updateLocation = async (location: Location) => {
      try {
        // Only update if location changed significantly (50m)
        if (lastLocation && calculateDistance(lastLocation, location) < 50) return;
        lastLocation = location;
        setCurrentLocation(location);
        setIsLoading(false);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) return;
        const userData = userDoc.data();
        const name = userData.name ? userData.name : undefined;
        const program = userData.program ? userData.program : undefined;
        await setDoc(doc(db, 'users', user.uid), {
          location,
          lastActive: new Date(),
          isActive: !isGhostMode,
          ...(name && { name }),
          ...(program && { program }),
          email: user.email || '',
        }, { merge: true });
        // Fetch nearby users after location update
        fetchNearbyUsers(location);
      } catch {
        setError('Failed to update location.');
      }
    };

    // Listen for app visibility changes
    const handleVisibility = () => {
      isAppActive = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Start location tracking (on movement)
    startLocationTracking(updateLocation, (err) => {
      setError('Unable to get your location. Please enable location services.');
      setIsLoading(false);
      console.error('Location tracking error:', err);
    });

    // Fallback: update location every 60 seconds if app is open
    fallbackInterval = setInterval(() => {
      if (isAppActive && currentLocation) {
        updateLocation(currentLocation);
      }
    }, 150 * 1000);

    // Background: update location every 10 min (if app is in background)
    locationInterval = setInterval(() => {
      if (!isAppActive && currentLocation) {
        updateLocation(currentLocation);
      }
    }, 10 * 60 * 1000);

    // Manual refresh button handler
    window.manualNearbyRefresh = () => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser.');
        return;
      }
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          setCurrentLocation(loc);
          fetchNearbyUsers(loc)
            .then(() => setIsLoading(false))
            .catch((err: unknown) => {
              setError('Failed to fetch nearby students.');
              setIsLoading(false);
              console.error('manualNearbyRefresh error:', err);
            });
        },
        (err: GeolocationPositionError) => {
          setError('Unable to get your location. Please enable location services.');
          setIsLoading(false);
          console.error('manualNearbyRefresh geolocation error:', err);
        }
      );
    };

    return () => {
      stopLocationTracking();
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (locationInterval) clearInterval(locationInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      delete window.manualNearbyRefresh;
    };
  }, [user, isGhostMode]);

  useEffect(() => {
    if (!user) return;
    // Try to get current location immediately on mount
    getCurrentLocation()
      .then(loc => {
        setCurrentLocation(loc);
      })
      .catch(() => {
        setError('Unable to get your location. Please enable location services.');
        setIsLoading(false);
      });
  }, [user]);

  // Add robust logging
  useEffect(() => {
    console.log('MatchesPage: user:', user);
    console.log('MatchesPage: currentLocation:', currentLocation);
    if (!user || !currentLocation) return;
    setIsLoading(true);
    fetchNearbyUsers(currentLocation)
      .then(() => setIsLoading(false))
      .catch((err: unknown) => {
        setError('Failed to fetch nearby students.');
        setIsLoading(false);
        console.error('fetchNearbyUsers error:', err);
      });
  }, [user, currentLocation]);

  const handleMessage = (userId: string) => {
    router.push(`/messages/${userId}`);
  };

  if (!user || !currentLocation) {
    console.log('MatchesPage: loading state. user:', user, 'currentLocation:', currentLocation);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">Nearby Students</h1>
          <div className="flex gap-2">
            <button
              onClick={() => window.manualNearbyRefresh && window.manualNearbyRefresh()}
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
                  onClick={() => window.manualNearbyRefresh && window.manualNearbyRefresh()}
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
