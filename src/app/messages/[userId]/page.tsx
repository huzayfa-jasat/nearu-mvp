'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, onSnapshot, where, Timestamp, doc, getDoc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { use } from 'react';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
  senderName?: string;
}

interface UserInfo {
  name?: string;
  lastCheckin?: {
    spot: string;
    createdAt: Timestamp;
  };
}

export default function MessagesPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [user, loading] = useAuthState(auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [otherUserInfo, setOtherUserInfo] = useState<UserInfo | null>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<UserInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!user) return;

    // Mark notifications for this chat as read
    const markNotificationsAsRead = async () => {
      const notificationsRef = collection(db, 'users', user.uid, 'notifications');
      const q = query(
        notificationsRef,
        where('type', '==', 'message'),
        where('chatId', '==', [user.uid, userId].sort().join('_')),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        await updateDoc(docSnap.ref, { read: true });
      }
    };
    markNotificationsAsRead();

    // Fetch current user's info
    const fetchCurrentUserInfo = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setCurrentUserInfo(userDoc.data() as UserInfo);
        }
      } catch (e) {
        console.error('Error fetching current user info:', e);
      }
    };

    // Fetch other user's info
    const fetchOtherUserInfo = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setOtherUserInfo(userDoc.data() as UserInfo);
        }
      } catch (e) {
        console.error('Error fetching user info:', e);
      }
    };

    fetchCurrentUserInfo();
    fetchOtherUserInfo();

    // Set up real-time messages listener
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only include messages where both UIDs are present in participants
        if (
          Array.isArray(data.participants) &&
          data.participants.includes(user.uid) &&
          data.participants.includes(userId)
        ) {
          const messageData = data as Message;
          // Add sender name to each message
          messageData.senderName =
            messageData.senderId === user.uid
              ? currentUserInfo?.name || 'You'
              : otherUserInfo?.name || 'User';
          newMessages.push({ ...messageData, id: doc.id });
        }
      });
      setMessages(newMessages);
      scrollToBottom();
    }, (err) => {
      console.error('Error in messages listener:', err);
      setError('Failed to load messages in real-time.');
    });

    return () => unsubscribe();
  }, [user, userId, currentUserInfo, otherUserInfo]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const messagesRef = collection(db, 'messages');
      const messageDoc = await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: user.uid,
        participants: [user.uid, userId].sort(),
        createdAt: serverTimestamp(),
      });

      // Add notification for the recipient
      const notificationRef = doc(collection(db, 'users', userId, 'notifications'));
      await setDoc(notificationRef, {
        type: 'message',
        from: user.uid,
        chatId: [user.uid, userId].sort().join('_'),
        messageId: messageDoc.id,
        timestamp: serverTimestamp(),
        read: false
      });

      setNewMessage('');
    } catch (e) {
      console.error('Error sending message:', e);
      setError('Failed to send message.');
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
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 p-6">
      <div className="max-w-2xl mx-auto bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <button
            onClick={() => router.push('/matches')}
            className="text-indigo-600 hover:text-indigo-700"
          >
            ← Back to Matches
          </button>
          {otherUserInfo && (
            <div className="text-right">
              <h2 className="font-semibold">
                {otherUserInfo.name || 'User'}
              </h2>
              {otherUserInfo.lastCheckin && (
                <p className="text-sm text-gray-600">
                  Last seen at {otherUserInfo.lastCheckin.spot}
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-red-600 mb-4">{error}</p>}

        <div className="space-y-4 mb-6 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg max-w-[80%] ${
                message.senderId === user.uid
                  ? 'ml-auto bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm font-semibold mb-1">
                {message.senderName}
              </p>
              <p>{message.text}</p>
              <p className="text-xs opacity-75 mt-1">
                {message.createdAt?.toDate().toLocaleTimeString()}
              </p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 