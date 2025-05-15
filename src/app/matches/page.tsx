// File: src/app/matches/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { startLocationTracking, stopLocationTracking } from '@/lib/location';
import { calculateDistance } from '@/lib/location';
import { Location } from '@/lib/types';
import { processPathCrossing, canUnlockChat, REQUIRED_CROSSINGS } from '@/lib/pathCrossing';
import { createMatchRequest } from '@/lib/matchRequests';
import type { PathCrossingEvent } from '@/lib/pathCrossing';

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
  const [crossingStates, setCrossingStates] = useState<Record<string, { events: PathCrossingEvent[]; lastProcessedTimestamp: number }>>({});
  const [loadingCrossings, setLoadingCrossings] = useState<Record<string, boolean>>({});
  const [matchRequested, setMatchRequested] = useState<Record<string, boolean>>({});

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
      } catch  {
        console.error('Error checking ghost mode:');
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
      } catch  {
        console.error('Error updating location');
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
      const newCrossingStates: Record<string, { events: PathCrossingEvent[]; lastProcessedTimestamp: number }> = { ...crossingStates };
      const newLoadingCrossings: Record<string, boolean> = { ...loadingCrossings };
      for (const docSnap of snapshot.docs) {
        if (docSnap.id === user.uid) continue;
        const userData = docSnap.data();
        if (!userData.location || userData.ghostMode || !currentLocation) continue;
        const distance = calculateDistance(userData.location, currentLocation);
        if (distance <= 100) {
          users.push({
            id: docSnap.id,
            name: userData.name,
            program: userData.program,
            distance,
            location: userData.location
          });
          // Load and update crossing events for this user
          if (!crossingStates[docSnap.id] && !loadingCrossings[docSnap.id]) {
            newLoadingCrossings[docSnap.id] = true;
            setLoadingCrossings({ ...newLoadingCrossings });
            // Load events from Firestore
            const pairId = [user.uid, docSnap.id].sort().join('_');
            const crossingRef = doc(db, 'pathCrossings', pairId);
            const crossingDoc = await getDoc(crossingRef);
            const events = crossingDoc.exists() ? crossingDoc.data().events || [] : [];
            // Process crossing
            const state = { events, lastProcessedTimestamp: 0 };
            const newState = await processPathCrossing(
              user.uid,
              docSnap.id,
              currentLocation,
              userData.location,
              state
            );
            newCrossingStates[docSnap.id] = newState;
            setCrossingStates({ ...newCrossingStates });
            newLoadingCrossings[docSnap.id] = false;
            setLoadingCrossings({ ...newLoadingCrossings });
          }
        }
      }
      users.sort((a, b) => a.distance - b.distance);
      setNearbyUsers(users);
    });

    return () => {
      stopLocationTracking();
      unsubscribe();
    };
  }, [user, currentLocation, crossingStates, loadingCrossings]);

  const handleSendMatchRequest = async (otherUserId: string) => {
    if (!user) return;
    try {
      await createMatchRequest({ fromUserId: user.uid, toUserId: otherUserId });
      setMatchRequested((prev) => ({ ...prev, [otherUserId]: true }));
    } catch {
      setError('Failed to send match request.');
    }
  };

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
            nearbyUsers.map((user) => {
              const crossingState = crossingStates[user.id];
              const canMatch = crossingState && canUnlockChat(crossingState.events, user.id);
              return (
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
                  {canMatch && !matchRequested[user.id] && (
                    <button
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      onClick={() => handleSendMatchRequest(user.id)}
                    >
                      Send Match Request
                    </button>
                  )}
                  {canMatch && matchRequested[user.id] && (
                    <span className="mt-4 inline-block text-green-600 font-semibold">Match Request Sent!</span>
                  )}
                  {crossingState && (
                    <div className="mt-2 text-xs text-gray-500">
                      Crossings: {crossingState.events.filter(e => e.userId === user.id).length} / {REQUIRED_CROSSINGS}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
