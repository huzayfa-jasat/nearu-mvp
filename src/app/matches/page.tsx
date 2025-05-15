// File: src/app/matches/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { startLocationTracking, stopLocationTracking } from '@/lib/location';
import { calculateDistance } from '@/lib/location';
import { Location } from '@/lib/types';
import { processPathCrossing } from '@/lib/pathCrossing';
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
  const [allUserDocs, setAllUserDocs] = useState<QueryDocumentSnapshot<DocumentData>[]>([]);
  const [debugUsers, setDebugUsers] = useState<NearbyUser[]>([]);

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
        let name = 'Unknown';
        let program = 'Unknown';
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.name) name = data.name;
            if (data.program) program = data.program;
          }
        } catch (e) {
          console.error('Error fetching name/program from Firestore:', e);
        }
        // Update user's location in Firestore, always merging profile info
        await setDoc(doc(db, 'users', user.uid), {
          location,
          lastActive: new Date(),
          isActive: !isGhostMode,
          name,
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
          const newUser = {
            id: docSnap.id,
            name: userData.name || 'Unknown',
            program: userData.program || 'Unknown',
            distance,
            location: userData.location
          };
          users.push(newUser);
          // Debug the exact user object being pushed
          setDebugUsers(prev => [...prev, { ...newUser, timestamp: Date.now() }]);
        }
      }
      users.sort((a, b) => a.distance - b.distance);
      setNearbyUsers(users);
      setAllUserDocs(snapshot.docs);
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

        <div>nearbyUsers.length: {nearbyUsers.length}</div>

        <div>{JSON.stringify(nearbyUsers, null, 2)}</div>

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
                  <div><strong>userData JSON:</strong> {JSON.stringify(userData, null, 2)}</div>
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
          <div><strong>Debug Distances:</strong> {allUserDocs.map(docSnap => {
            if (docSnap.id === user.uid || !currentLocation || !docSnap.data().location) return null;
            const distance = calculateDistance(docSnap.data().location, currentLocation);
            return (
              <div key={docSnap.id}>
                {docSnap.data().name || 'Unknown'}: {distance.toFixed(2)}m
              </div>
            );
          })}</div>
          <div><strong>Processing Steps:</strong>
            {allUserDocs.map(docSnap => {
              if (docSnap.id === user.uid) return null;
              const userData = docSnap.data();
              const distance = userData.location && currentLocation ? 
                calculateDistance(userData.location, currentLocation) : null;
              return (
                <div key={docSnap.id} className="mt-2">
                  <div><strong>User:</strong> {userData.name || 'Unknown'}</div>
                  <div><strong>Has Location:</strong> {!!userData.location ? 'Yes' : 'No'}</div>
                  <div><strong>Ghost Mode:</strong> {userData.ghostMode ? 'Yes' : 'No'}</div>
                  <div><strong>Distance:</strong> {distance ? `${distance.toFixed(2)}m` : 'N/A'}</div>
                  <div><strong>Would Include:</strong> {
                    userData.location && 
                    !userData.ghostMode && 
                    currentLocation && 
                    distance && 
                    distance <= 100 ? 'Yes' : 'No'
                  }</div>
                </div>
              );
            })}
          </div>
          <div><strong>Debug Users Array:</strong> {JSON.stringify(debugUsers, null, 2)}</div>
        </div>

        <button onClick={() => window.location.reload()}>Refresh Location</button>
      </div>
    </div>
  );
}
