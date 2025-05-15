import { Location } from './types';

const LOCATION_ACCURACY = 20; // meters
const MAX_LOCATION_AGE = 60000; // 1 minute

let watchId: number | null = null;
let lastLocation: Location | null = null;

export const startLocationTracking = (
  onLocationUpdate: (location: Location) => void,
  onError: (error: Error) => void
) => {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by your browser'));
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
  };

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const newLocation: Location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };

      // Only update if accuracy is good enough and location is significantly different
      if (
        position.coords.accuracy <= LOCATION_ACCURACY &&
        (!lastLocation || 
         Math.abs(newLocation.latitude - lastLocation.latitude) > 0.0001 ||
         Math.abs(newLocation.longitude - lastLocation.longitude) > 0.0001)
      ) {
        lastLocation = newLocation;
        onLocationUpdate(newLocation);
      }
    },
    (error) => {
      onError(new Error(`Location error: ${error.message}`));
    },
    options
  );
};

export const stopLocationTracking = () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
};

export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        reject(new Error(`Location error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
};

export const isLocationValid = (location: Location): boolean => {
  const now = Date.now();
  return (
    (location.accuracy ?? Infinity) <= LOCATION_ACCURACY &&
    now - location.timestamp <= MAX_LOCATION_AGE
  );
};

export const calculateDistance = (loc1: Location, loc2: Location): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Check if two users are within proximity (default 100 meters)
export const isWithinProximity = (user1: Location, user2: Location, maxDistance: number = 5): boolean => {
  return calculateDistance(user1, user2) <= maxDistance;
}; 