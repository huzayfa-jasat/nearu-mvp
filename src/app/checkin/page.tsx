// File: src/app/checkin/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function CheckinPage() {
  const [user, loading] = useAuthState(auth);
  const [spot, setSpot] = useState('DC Library');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleCheckin = async () => {
    setError('');
    if (!user) {
      setError('You must be logged in to check in.');
      return;
    }
    try {
      await addDoc(collection(db, 'checkins'), {
        uid: user.uid,
        spot,
        createdAt: serverTimestamp(),
      });
      router.push('/matches');
    } catch (e) {
      console.error(e);
      setError('Failed to check in — please try again.');
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100 p-6">
      <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Where are you now?</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <select
          className="w-full mb-6 p-3 border border-gray-300 rounded"
          value={spot}
          onChange={(e) => setSpot(e.target.value)}
        >
          <option>DC Library</option>
          <option>CIF Gym</option>
          <option>DC Tim Hortons</option>
          <option>SLC Commons</option>
        </select>
        <button
          onClick={handleCheckin}
          className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
        >
          Check In
        </button>
      </div>
    </div>
  );
}
