'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, getDoc, doc, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

interface Chat {
  id: string;
  messages: {
    text: string;
    timestamp: Timestamp;
    senderId: string;
  }[];
  otherUser: {
    id: string;
    name: string;
    photoURL: string;
  };
  status: 'pending' | 'accepted' | 'rejected';
  lastCheckin?: {
    spot: string;
    createdAt: Timestamp;
  };
}

export default function MessagesPage() {
  const [user, loading] = useAuthState(auth);
  const [chats, setChats] = useState<Chat[]>([]);
  const [error, setError] = useState('');
  const [unreadChatIds, setUnreadChatIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      try {
        const chatMap = new Map<string, Chat>();

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();
          // Find the other user's UID
          const otherUserId = (Array.isArray(data.participants) ? data.participants : []).find((id: string) => id !== user.uid);
          if (!otherUserId) continue;

          // Only keep the latest message per chat
          if (!chatMap.has(otherUserId)) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            let otherUser = { id: otherUserId, name: 'User', photoURL: '' };
            if (userDoc.exists()) {
              const userData = userDoc.data();
              otherUser = {
                id: otherUserId,
                name: userData.name || 'User',
                photoURL: userData.photoURL || ''
              };
            }
            chatMap.set(otherUserId, {
              id: otherUserId,
              messages: [{
                text: data.text,
                timestamp: data.createdAt,
                senderId: data.senderId
              }],
              otherUser,
              status: 'pending',
              lastCheckin: undefined
            });
          }
        }

        setChats(Array.from(chatMap.values()));
      } catch (e) {
        console.error('Error processing messages:', e);
        setError('Failed to load messages.');
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch unread notifications for badge
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const notificationsRef = collection(db, 'users', user.uid, 'notifications');
      const q = query(
        notificationsRef,
        where('type', '==', 'message'),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      const chatIds = new Set<string>();
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.chatId) chatIds.add(data.chatId);
      });
      setUnreadChatIds(chatIds);
    };
    fetchUnread();
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">Messages</h1>
          <button
            onClick={() => router.push('/matches')}
            className="text-indigo-600 hover:text-indigo-700"
          >
            Back to Matches
          </button>
        </div>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        {chats.length === 0 ? (
          <div className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-8 text-center">
            <p className="text-indigo-600">No messages yet. Start a conversation with someone nearby!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl p-6 cursor-pointer hover:bg-opacity-90 transition relative"
                onClick={() => router.push(`/messages/${chat.id}`)}
              >
                {/* Unread badge */}
                {unreadChatIds.has([user?.uid, chat.id].sort().join('_')) && (
                  <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg text-indigo-600">{chat.otherUser.name}</h3>
                    <p className="text-indigo-600 text-sm">
                      {chat.messages[0]?.text}
                    </p>
                    <p className="text-indigo-600 text-xs">
                      {chat.messages[0]?.timestamp?.toDate().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 