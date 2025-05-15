import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export const saveFCMToken = async (userId: string, token: string) => {
  const userTokensRef = doc(db, 'userTokens', userId);
  await setDoc(userTokensRef, { token }, { merge: true });
};

export const sendMatchRequestNotification = async (toUserId: string, fromUserId: string) => {
  // This would typically be handled by a Cloud Function
  // For now, we'll just log the notification
  console.log(`Sending match request notification to user ${toUserId} from ${fromUserId}`);
  
  // In a production environment, you would:
  // 1. Get the FCM token for the target user
  // 2. Send a push notification using Firebase Cloud Messaging
  // 3. Handle the notification in the client app
};

export const sendMatchResponseNotification = async (toUserId: string, fromUserId: string, accepted: boolean) => {
  // This would typically be handled by a Cloud Function
  console.log(`Sending match response notification to user ${toUserId} from ${fromUserId}, accepted: ${accepted}`);
  
  // In a production environment, you would:
  // 1. Get the FCM token for the target user
  // 2. Send a push notification using Firebase Cloud Messaging
  // 3. Handle the notification in the client app
}; 