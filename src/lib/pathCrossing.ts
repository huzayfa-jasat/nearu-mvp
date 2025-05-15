import { Location } from './types';
import { calculateDistance } from './location';
import { TEST_MODE } from './testMode';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const MAX_CROSSING_DISTANCE = 10; // meters - for testing
const DEBOUNCE_TIME = 0//TEST_MODE ? 500 : 5000; // 500ms in test mode, 5s otherwise

export interface PathCrossingEvent {
  userId: string;
  timestamp: number;
  location: Location;
}

export interface PathCrossingState {
  events: PathCrossingEvent[];
  lastProcessedTimestamp: number;
}

const getPairId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

export const processPathCrossing = async (
  currentUserId: string,
  otherUserId: string,
  currentLocation: Location,
  otherLocation: Location,
  state: PathCrossingState
): Promise<PathCrossingState> => {
  const now = Date.now();

  // Debounce updates
  if (now - state.lastProcessedTimestamp < DEBOUNCE_TIME) {
    return state;
  }

  // Remove old events (6 min in test mode, 1 hour otherwise)
  const cutoffTime = now - (TEST_MODE ? 360000 : 3600000);
  const recentEvents = state.events.filter(event => event.timestamp > cutoffTime);

  // Check if users are within proximity
  const distance = calculateDistance(currentLocation, otherLocation);
  if (distance > MAX_CROSSING_DISTANCE) {
    return {
      events: recentEvents,
      lastProcessedTimestamp: now
    };
  }

  // Add new crossing event
  const newEvent: PathCrossingEvent = {
    userId: currentUserId,
    timestamp: now,
    location: currentLocation
  };

  // Firestore logic
  const pairId = getPairId(currentUserId, otherUserId);
  const crossingRef = doc(db, 'pathCrossings', pairId);
  const crossingDoc = await getDoc(crossingRef);
  const events: PathCrossingEvent[] = crossingDoc.exists() ? crossingDoc.data().events || [] : [];
  events.push(newEvent);
  await setDoc(crossingRef, { events }, { merge: true });

  return {
    events: [...recentEvents, newEvent],
    lastProcessedTimestamp: now
  };
};

export const getCrossingCount = (events: PathCrossingEvent[], userId: string): number => {
  return events.filter(event => event.userId === userId).length;
};

export const REQUIRED_CROSSINGS = 1;

export const canUnlockChat = (events: PathCrossingEvent[], userId: string): boolean => {
  const crossings = getCrossingCount(events, userId);
  return crossings >= REQUIRED_CROSSINGS;
}; 