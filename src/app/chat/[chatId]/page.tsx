// File: src/app/chat/[chatId]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '../../../lib/firebase';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function ChatPage() {
  const { chatId } = useParams();
  const [user, loadingAuth] = useAuthState(auth);
  const [otherUid, setOtherUid] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!loadingAuth && !user) router.push('/login');
  }, [user, loadingAuth, router]);

  // Parse chatId and ensure chat doc exists
  useEffect(() => {
    if (!chatId || !user) return;
    const uids = chatId.split('_');
    const other = uids.find(id => id !== user.uid) || '';
    setOtherUid(other);

    const chatRef = doc(db, 'chats', chatId);
    // create or merge chat doc with participants
    setDoc(chatRef, {
      users: [user.uid, other],
      createdAt: serverTimestamp()
    }, { merge: true });
  }, [chatId, user]);

  // Subscribe to messages subcollection
  useEffect(() => {
    if (!chatId) return;
    const msgsRef = collection(db, 'chats', chatId, 'messages');
    const q = query(msgsRef, orderBy('timestamp'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => d.data()));
      // scroll to bottom
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    return () => unsub();
  }, [chatId]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !chatId || !user) return;
    const msgsRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(msgsRef, {
      sender: user.uid,
      text: newMsg.trim(),
      timestamp: serverTimestamp()
    });
    setNewMsg('');
  };

  if (loadingAuth || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading chat…</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-indigo-600 text-white font-semibold">
        Chat with {otherUid.slice(0,6)}…
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-sm p-2 rounded ${
              m.sender === user.uid ? 'bg-indigo-100 self-end' : 'bg-white'
            }`}
          >
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white flex space-x-2 border-t">
        <input
          type="text"
          className="flex-1 p-2 border rounded"
          placeholder="Type a message…"
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
