import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export interface MatchRequest {
  id?: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  message?: string;
}

export const createMatchRequest = async (request: Omit<MatchRequest, 'id' | 'createdAt'>) => {
  const matchRequestsRef = collection(db, 'matchRequests');
  const newRequest = {
    ...request,
    status: 'pending' as const,
    createdAt: new Date(),
  };
  return await addDoc(matchRequestsRef, newRequest);
};

export const getPendingMatchRequests = async (userId: string) => {
  const matchRequestsRef = collection(db, 'matchRequests');
  const q = query(
    matchRequestsRef,
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchRequest));
};

export const acceptMatchRequest = async (requestId: string) => {
  const requestRef = doc(db, 'matchRequests', requestId);
  await updateDoc(requestRef, { status: 'accepted' });
};

export const rejectMatchRequest = async (requestId: string) => {
  const requestRef = doc(db, 'matchRequests', requestId);
  await updateDoc(requestRef, { status: 'rejected' });
};

// Initialize Firebase Cloud Messaging
export const initializeMessaging = async () => {
  const messaging = getMessaging();
  
  // Request permission for notifications
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return token;
  }
  return null;
};

// Listen for incoming messages
export const onMessageListener = () => {
  const messaging = getMessaging();
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
}; 