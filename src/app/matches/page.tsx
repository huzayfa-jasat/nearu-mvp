// File: src/app/matches/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp, getDoc, doc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

interface CheckIn {
  uid: string;
  spot: string;
  createdAt: Timestamp;
}

interface CrossCount {
  [key: string]: number;
}

export default function MatchesPage() {
  const [user, loading] = useAuthState(auth);
  const [nearbyUsers, setNearbyUsers] = useState<CheckIn[]>([]);
  const [crossCounts, setCrossCounts] = useState<CrossCount>({});
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const fetchNearbyUsers = async () => {
      try {
        // Get check-ins from the last hour
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        const checkinsRef = collection(db, 'checkins');
        const q = query(
          checkinsRef,
          where('createdAt', '>', Timestamp.fromDate(oneHourAgo)),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const checkins: CheckIn[] = [];
        const seenUsers = new Set<string>();

        querySnapshot.forEach((doc) => {
          const data = doc.data() as CheckIn;
          // Don't show current user and only show each user once
          if (data.uid !== user.uid && !seenUsers.has(data.uid)) {
            checkins.push(data);
            seenUsers.add(data.uid);
          }
        });

        setNearbyUsers(checkins);

        // Fetch or initialize cross counts
        const userCrossCountsRef = doc(db, 'crossCounts', user.uid);
        const crossCountsDoc = await getDoc(userCrossCountsRef);
        
        if (crossCountsDoc.exists()) {
          setCrossCounts(crossCountsDoc.data() as CrossCount);
        } else {
          // For testing, initialize with count 1 for all nearby users
          const initialCounts: CrossCount = {};
          checkins.forEach(checkIn => {
            initialCounts[checkIn.uid] = 1;
          });
          setCrossCounts(initialCounts);
        }

      } catch (e) {
        console.error('Error fetching nearby users:', e);
        setError('Failed to load nearby users.');
      }
    };

    fetchNearbyUsers();
  }, [user]);

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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Nearby Students</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        
        {nearbyUsers.length === 0 ? (
          <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-8 text-center">
            <p className="text-gray-600">No one nearby right now. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {nearbyUsers.map((checkIn) => (
              <div key={checkIn.uid} className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">Student at {checkIn.spot}</h3>
                    <p className="text-gray-600 text-sm">
                      Checked in {checkIn.createdAt?.toDate().toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-indigo-600 mt-1">
                      Crossed {crossCounts[checkIn.uid] || 0} times
                    </p>
                  </div>
                  {/* For testing, always enable message button */}
                  <button
                    onClick={() => router.push(`/messages/${checkIn.uid}`)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                  >
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
