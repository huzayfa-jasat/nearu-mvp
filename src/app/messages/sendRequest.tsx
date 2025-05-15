'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { createMatchRequest } from '@/lib/matchRequests';
import { sendMatchRequestNotification } from '@/lib/notifications';
import styles from './sendRequest.module.css';

interface SendRequestProps {
  toUserId: string;
  onSuccess?: () => void;
}

export default function SendRequest({ toUserId, onSuccess }: SendRequestProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    setError(null);

    try {
      await createMatchRequest({
        fromUserId: auth.currentUser.uid,
        toUserId,
        message: message.trim() || undefined,
        status: 'pending'
      });
      
      await sendMatchRequestNotification(toUserId, auth.currentUser.uid);
      
      setMessage('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to send match request. Please try again.');
      console.error('Error sending match request:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputGroup}>
        <label htmlFor="message">Message (optional):</label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a message to your match request..."
          className={styles.textarea}
        />
      </div>
      
      {error && <p className={styles.error}>{error}</p>}
      
      <button 
        type="submit" 
        disabled={loading}
        className={styles.submitButton}
      >
        {loading ? 'Sending...' : 'Send Match Request'}
      </button>
    </form>
  );
} 