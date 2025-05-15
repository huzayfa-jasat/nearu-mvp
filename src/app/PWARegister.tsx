'use client';

import { useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Add to Home Screen prompt
    let deferredPrompt: BeforeInstallPromptEvent | null = null;
    const addBtn = document.createElement('button');
    addBtn.style.display = 'none';
    addBtn.className = 'fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-indigo-700 transition';
    addBtn.textContent = 'Add to Home Screen';
    document.body.appendChild(addBtn);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      addBtn.style.display = 'block';
    });

    addBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      deferredPrompt = null;
      addBtn.style.display = 'none';
    });

    window.addEventListener('appinstalled', () => {
      console.log('App was installed');
      addBtn.style.display = 'none';
    });

    return () => {
      addBtn.remove();
    };
  }, []);

  return null;
} 