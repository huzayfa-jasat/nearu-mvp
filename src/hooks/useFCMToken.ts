import { useEffect } from 'react';
import { getMessaging, getToken } from 'firebase/messaging';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export function useFCMToken(user: { uid: string } | null) {
  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = async () => {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = getMessaging();
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
      if (token) {
        // Save the token to Firestore for this user
        await setDoc(doc(db, 'userTokens', user.uid), { token }, { merge: true });
      }
    };
    register();
  }, [user]);
} 