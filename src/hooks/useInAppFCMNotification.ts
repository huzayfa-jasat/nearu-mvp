import { useEffect } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';

export function useInAppFCMNotification() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const messaging = getMessaging();
    onMessage(messaging, (payload) => {
      // Show toast or notification in-app
      alert(payload.notification?.title + ': ' + payload.notification?.body);
    });
  }, []);
} 