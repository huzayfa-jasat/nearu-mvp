'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Users, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

// Hook to listen for unread message notifications
function useUnreadMessages() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      where('type', '==', 'message'),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);
  return count;
}

export default function Navigation() {
  const pathname = usePathname();
  const unreadCount = useUnreadMessages();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2">
      <div className="max-w-md mx-auto flex justify-around items-center">
        <Link 
          href="/matches" 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
            isActive('/matches') ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
          }`}
        >
          <Users className="w-6 h-6" />
          <span className="text-xs mt-1">Matches</span>
        </Link>

        <Link 
          href="/messages" 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
            isActive('/messages') ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
          }`}
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-[10px] font-bold"></span>
            )}
          </div>
          <span className="text-xs mt-1">Messages</span>
        </Link>

        <Link 
          href="/settings" 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
            isActive('/settings') ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
          }`}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs mt-1">Settings</span>
        </Link>
      </div>
    </nav>
  );
} 