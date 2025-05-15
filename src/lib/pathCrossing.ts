import { Location } from './types';
import { calculateDistance } from './location';
import { TEST_MODE } from './testMode';

const MAX_CROSSING_DISTANCE = 5; // meters - Changed to 5 for testing
const DEBOUNCE_TIME = TEST_MODE ? 500 : 5000; // 500ms in test mode, 5 seconds otherwise

export interface PathCrossingEvent {
  userId: string;
  timestamp: number;
  location: Location;
}

export interface PathCrossingState {
  events: PathCrossingEvent[];
  lastProcessedTimestamp: number;
}

export const processPathCrossing = (
  currentLocation: Location,
  otherLocation: Location,
  state: PathCrossingState,
  otherUserId: string
): PathCrossingState => {
  const now = Date.now();

  // Debounce updates
  if (now - state.lastProcessedTimestamp < DEBOUNCE_TIME) {
    return state;
  }

  // Remove old events (6 minutes in test mode, 1 hour otherwise)
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
    userId: otherUserId,
    timestamp: now,
    location: otherLocation
  };

  return {
    events: [...recentEvents, newEvent],
    lastProcessedTimestamp: now
  };
};

export const getCrossingCount = (events: PathCrossingEvent[], userId: string): number => {
  return events.filter(event => event.userId === userId).length;
};

export const REQUIRED_CROSSINGS = 3;

export const canUnlockChat = (events: PathCrossingEvent[], userId: string): boolean => {
  const crossings = getCrossingCount(events, userId);
  return crossings >= REQUIRED_CROSSINGS;
}; 