'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { getPendingMatchRequests, acceptMatchRequest, rejectMatchRequest, MatchRequest } from '@/lib/matchRequests';
import { sendMatchResponseNotification } from '@/lib/notifications';
import styles from './matchRequests.module.css';

export default function MatchRequests() {
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!auth.currentUser) return;
      
      try {
        const pendingRequests = await getPendingMatchRequests(auth.currentUser.uid);
        setRequests(pendingRequests);
      } catch (error) {
        console.error('Error fetching match requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleAccept = async (requestId: string, fromUserId: string) => {
    try {
      await acceptMatchRequest(requestId);
      setRequests(requests.filter(req => req.id !== requestId));
      await sendMatchResponseNotification(fromUserId, auth.currentUser!.uid, true);
    } catch (error) {
      console.error('Error accepting match request:', error);
    }
  };

  const handleReject = async (requestId: string, fromUserId: string) => {
    try {
      await rejectMatchRequest(requestId);
      setRequests(requests.filter(req => req.id !== requestId));
      await sendMatchResponseNotification(fromUserId, auth.currentUser!.uid, false);
    } catch (error) {
      console.error('Error rejecting match request:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Match Requests</h1>
      {requests.length === 0 ? (
        <p>No pending match requests</p>
      ) : (
        <div className={styles.requestsList}>
          {requests.map((request) => (
            <div key={request.id} className={styles.requestCard}>
              <p>From: {request.fromUserId}</p>
              {request.message && <p>Message: {request.message}</p>}
              <div className={styles.actions}>
                <button 
                  onClick={() => handleAccept(request.id!, request.fromUserId)}
                  className={styles.acceptButton}
                >
                  Accept
                </button>
                <button 
                  onClick={() => handleReject(request.id!, request.fromUserId)}
                  className={styles.rejectButton}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 