// Test mode configuration
export const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === 'true';

// Test locations around UWaterloo campus
export const TEST_LOCATIONS = {
  'DC Library': { latitude: 43.4723, longitude: -80.5449 },
  'MC': { latitude: 43.4721, longitude: -80.5447 },
  'SLC': { latitude: 43.4719, longitude: -80.5445 },
  'DP Library': { latitude: 43.4725, longitude: -80.5451 },
  'PAC': { latitude: 43.4717, longitude: -80.5443 }
};

// Test user accounts
export const TEST_USERS = [
  {
    email: 'test1@uwaterloo.ca',
    password: 'test123456',
    name: 'Test User 1',
    program: 'Computer Science'
  },
  {
    email: 'test2@uwaterloo.ca',
    password: 'test123456',
    name: 'Test User 2',
    program: 'Mathematics'
  },
  {
    email: 'test3@uwaterloo.ca',
    password: 'test123456',
    name: 'Test User 3',
    program: 'Engineering'
  }
];

// Test mode location simulation
export const simulateLocation = (spot: string): { latitude: number; longitude: number } => {
  if (!TEST_MODE) {
    throw new Error('Test mode is not enabled');
  }
  return TEST_LOCATIONS[spot as keyof typeof TEST_LOCATIONS] || TEST_LOCATIONS['DC Library'];
};

// Test mode time acceleration
export const TEST_TIME_ACCELERATION = 10; // 1 real second = 10 test seconds 