export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface UserLocation extends Location {
  userId: string;
} 