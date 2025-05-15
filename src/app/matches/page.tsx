// File: src/app/matches/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
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

interface UserData {
  name: string;
  program: string;
  location: Location;
  ghostMode?: boolean;
  isActive?: boolean;
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
  const [allUserDocs, setAllUserDocs] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);

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
        // Fetch program from Firestore
        let program = 'Unknown';
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.program) program = data.program;
          }
        } catch (e) {
          console.error('Error fetching program from Firestore:', e);
        }
        // Update user's location in Firestore, always merging profile info
        await setDoc(doc(db, 'users', user.uid), {
          location,
          lastActive: new Date(),
          isActive: !isGhostMode,
          name: user.displayName || 'Unknown',
          program,
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
        const userData = docSnap.data() as UserData;
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
      console.log('Nearby users to be set:', users);
      users.sort((a, b) => a.distance - b.distance);
      setNearbyUsers(users);
      setAllUserDocs(snapshot.docs);
    });

    return () => {
      stopLocationTracking();
      unsubscribe();
      // No longer set isActive to false on unmount
    };
  }, [user]);

  const handleSendMatchRequest = async (otherUserId: string) => {
    if (!user) return;
    try {
      await createMatchRequest({ 
        fromUserId: user.uid, 
        toUserId: otherUserId,
        status: 'pending'
      });
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
        
        <div className="mb-4 text-xs text-gray-700">
          <strong>My Current Location:</strong> {currentLocation ? `${currentLocation.latitude}, ${currentLocation.longitude}` : 'N/A'}
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

        <div className="space-y-4">
          {nearbyUsers.length === 0 ? (
            <div>No nearby students found. Keep walking around campus to find matches!</div>
          ) : (
            nearbyUsers.map((user) => (
              <div key={user.id}>
                <strong>{user.name}</strong> - {user.program} - {user.distance.toFixed(2)}m
              </div>
            ))
          )}
        </div>

        {/* Debug Panel: Show all users from Firestore query */}
        <div className="mt-8 p-4 bg-yellow-100 rounded text-xs text-gray-800">
          <h3 className="font-bold mb-2">Debug: All Users in Firestore (isActive: true)</h3>
          <ul>
            {allUserDocs.map((docSnap) => {
              const userData = docSnap.data();
              let reason = '';
              if (docSnap.id === user.uid) reason = 'Filtered: This is you';
              else if (!userData.location) reason = 'Filtered: No location';
              else if (userData.ghostMode) reason = 'Filtered: Ghost mode';
              else if (!currentLocation) reason = 'Filtered: No current location';
              else if (calculateDistance(userData.location, currentLocation) > 100) reason = 'Filtered: Too far';
              else reason = 'Included in Nearby Students';
              return (
                <li key={docSnap.id}>
                  <div><strong>UID:</strong> {docSnap.id}</div>
                  <div><strong>Name:</strong> {userData.name}</div>
                  <div><strong>Location:</strong> {userData.location ? `${userData.location.latitude}, ${userData.location.longitude}` : 'N/A'}</div>
                  <div><strong>Reason:</strong> {reason}</div>
                  <hr />
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 p-2 bg-gray-200 text-xs rounded">
          <div><strong>nearbyUsers JSON:</strong> {JSON.stringify(nearbyUsers, null, 2)}</div>
          <div><strong>currentLocation:</strong> {JSON.stringify(currentLocation, null, 2)}</div>
          <div><strong>error:</strong> {error}</div>
        </div>

        <button onClick={() => window.location.reload()}>Refresh Location</button>
      </div>
    </div>
  );
}
