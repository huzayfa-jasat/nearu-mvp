// File: src/app/matches/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { startLocationTracking, stopLocationTracking } from '@/lib/location';
import { calculateDistance } from '@/lib/location';
import { Location } from '@/lib/types';

interface NearbyUser {
  id: string;
  name: string;
  program: string;
  distance: number;
  location: Location;
}

export default function MatchesPage() {
  const { user } = useAuth();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [error, setError] = useState('');
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (!user) return;

    // Check ghost mode
    const checkGhostMode = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setIsGhostMode(data.ghostMode || false);
        }
      } catch (e) {
        console.error('Error checking ghost mode:', e);
      }
    };

    checkGhostMode();

    // Start location tracking
    const handleLocationUpdate = async (location: Location) => {
      try {
        setCurrentLocation(location);
        // Update user's location in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          location,
          lastActive: new Date()
        }, { merge: true });
      } catch (e) {
        console.error('Error updating location:', e);
        setError('Failed to update location');
      }
    };

    const handleLocationError = (error: Error) => {
      console.error('Location error:', error);
      setError('Unable to get your location. Please enable location services.');
    };

    startLocationTracking(handleLocationUpdate, handleLocationError);

    // Listen for nearby users
    const q = query(
      collection(db, 'users'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const users: NearbyUser[] = [];
      
      for (const doc of snapshot.docs) {
        if (doc.id === user.uid) continue; // Skip current user
        
        const userData = doc.data();
        if (!userData.location || userData.ghostMode || !currentLocation) continue;

        const distance = calculateDistance(
          userData.location,
          currentLocation
        );

        if (distance <= 100) { // Within 100 meters
          users.push({
            id: doc.id,
            name: userData.name,
            program: userData.program,
            distance,
            location: userData.location
          });
        }
      }

      // Sort by distance
      users.sort((a, b) => a.distance - b.distance);
      setNearbyUsers(users);
    });

    return () => {
      stopLocationTracking();
      unsubscribe();
    };
  }, [user, currentLocation]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-indigo-600">Nearby Students</h1>
        
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

        <div className="space-y-4">
          {nearbyUsers.length === 0 ? (
            <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-6 text-center text-gray-600">
              No nearby students found. Keep walking around campus to find matches!
            </div>
          ) : (
            nearbyUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
                    <p className="text-gray-600">{user.program}</p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {Math.round(user.distance)}m away
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
