# NearU - University Student Proximity App
**A Progressive Web App (PWA) that connects university students based on real-time location proximity**

NearU is a location-based social networking platform designed specifically for university students. It enables students to discover and connect with nearby peers, fostering campus community and facilitating real-time interactions through proximity-based matching and instant messaging.

<br/>

## 🚀 Core Features

### **Real-Time Location-Based Matching**
- **Proximity Detection**: Automatically finds students within 500 meters of your location
- **Smart Filtering**: Only shows active users (active within the last hour)
- **Distance Calculation**: Real-time distance updates using GPS coordinates
- **Ghost Mode**: Toggle visibility to browse without being seen

### **Instant Messaging System**
- **Real-Time Chat**: Instant messaging with nearby students
- **Unread Notifications**: Badge counter for unread messages
- **Message History**: Persistent chat history across sessions
- **Push Notifications**: Real-time message alerts

### **User Authentication & Security**
- **University Email Validation**: Restricted to @uwaterloo.ca emails only
- **Firebase Authentication**: Secure user registration and login
- **Profile Management**: Customizable user profiles with program information
- **Privacy Controls**: Ghost mode and visibility settings

### **Progressive Web App Features**
- **Offline Capability**: Works without internet connection
- **App-Like Experience**: Installable on mobile devices
- **Responsive Design**: Optimized for all screen sizes
- **Fast Loading**: Optimized performance with Next.js

<br/>

## 🏗️ Architecture & Technology Stack

### **Frontend Framework**
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Modern icon library

### **Backend & Database**
- **Firebase Firestore**: Real-time NoSQL database
- **Firebase Authentication**: User management
- **Firebase Functions**: Serverless backend logic
- **Firebase Security Rules**: Data access control

### **Location Services**
- **Geolocation API**: Native browser location services
- **Custom Location Logic**: Optimized for accuracy and battery life
- **Distance Calculation**: Haversine formula for precise measurements

### **Real-Time Features**
- **Firestore Listeners**: Real-time data synchronization
- **WebSocket-like Updates**: Instant message delivery
- **Optimized Queries**: Efficient data fetching and caching

<br/>

## 📱 User Experience Flow

### **1. Authentication & Onboarding**
```
User Registration → Email Validation → Profile Setup → Location Permission
```

**Key Features:**
- University email validation (@uwaterloo.ca)
- Secure password requirements
- Profile creation with name and program
- Location permission request

### **2. Location-Based Discovery**
```
Location Tracking → Nearby User Detection → Distance Filtering → User Display
```

**Technical Implementation:**
- GPS accuracy threshold: 20 meters
- Update frequency: Movement-based + 60s fallback
- Distance calculation: Haversine formula
- Active user filtering: Last 1 hour

### **3. Messaging & Communication**
```
User Selection → Chat Initiation → Real-Time Messaging → Notification System
```

**Features:**
- Real-time message delivery
- Unread message badges
- Message persistence
- User profile integration

### **4. Privacy & Settings**
```
Ghost Mode Toggle → Visibility Controls → Profile Management → Security Settings
```

**Privacy Controls:**
- Ghost mode for anonymous browsing
- Location sharing controls
- Profile visibility settings
- Data privacy management

<br/>

## 🔧 Technical Implementation

### **Location Tracking System**
```typescript
// Optimized location tracking with battery efficiency
const LOCATION_ACCURACY = 20; // meters
const MAX_LOCATION_AGE = 60000; // 1 minute

export const startLocationTracking = (
  onLocationUpdate: (location: Location) => void,
  onError: (error: Error) => void
) => {
  // High-accuracy GPS with movement-based updates
  // Automatic fallback intervals for background operation
};
```

### **Real-Time Data Synchronization**
```typescript
// Firestore real-time listeners for instant updates
const unsubscribe = onSnapshot(q, async (querySnapshot) => {
  // Process real-time message updates
  // Update UI immediately
  // Handle offline/online state
});
```

### **Distance Calculation Algorithm**
```typescript
// Haversine formula for accurate distance calculation
export const calculateDistance = (loc1: Location, loc2: Location): number => {
  const R = 6371e3; // Earth's radius in meters
  // Precise distance calculation in meters
  return distance;
};
```

### **Security & Data Protection**
```javascript
// Firestore security rules
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
  
  match /notifications/{notificationId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

<br/>

## 📊 Performance Optimizations

### **Location Efficiency**
- **Movement-Based Updates**: Only update location when user moves significantly
- **Battery Optimization**: Reduced GPS usage in background
- **Accuracy Thresholds**: 20-meter accuracy requirement
- **Fallback Intervals**: 60s active, 10min background updates

### **Database Optimization**
- **Efficient Queries**: Indexed Firestore queries for fast retrieval
- **Real-Time Listeners**: Optimized for minimal data transfer
- **Caching Strategy**: Client-side caching for offline support
- **Query Limits**: Pagination and filtering for large datasets

### **Network Efficiency**
- **PWA Caching**: Service worker for offline functionality
- **Image Optimization**: Next.js automatic image optimization
- **Bundle Splitting**: Code splitting for faster loading
- **CDN Integration**: Global content delivery

<br/>

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ 
- Firebase project setup
- University email domain (@uwaterloo.ca)

### **Installation**
```bash
# Clone the repository
git clone https://github.com/yourusername/nearu-mvp.git
cd nearu-mvp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Firebase configuration

# Run development server
npm run dev
```

### **Environment Variables**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### **Firebase Setup**
1. Create a new Firebase project
2. Enable Authentication with Email/Password
3. Create Firestore database
4. Set up security rules
5. Configure PWA settings

<br/>

## 📱 PWA Features

### **Installation**
- **Add to Home Screen**: Installable on mobile devices
- **Offline Support**: Works without internet connection
- **App-Like Experience**: Full-screen mode and native feel
- **Push Notifications**: Real-time message alerts

### **Mobile Optimization**
- **Responsive Design**: Optimized for all screen sizes
- **Touch Gestures**: Mobile-friendly interactions
- **Fast Loading**: Optimized for mobile networks
- **Battery Efficiency**: Minimal GPS and network usage

<br/>

## 🔒 Security & Privacy

### **Data Protection**
- **University Email Validation**: Restricted access to verified students
- **Location Privacy**: User-controlled location sharing
- **Message Encryption**: Secure message transmission
- **Data Retention**: Configurable data retention policies

### **Privacy Controls**
- **Ghost Mode**: Browse anonymously
- **Visibility Settings**: Control who can see your profile
- **Location Sharing**: Granular location permission controls
- **Data Deletion**: User-initiated data removal

<br/>

## 🧪 Testing & Quality Assurance

### **Performance Testing**
- **Location Accuracy**: GPS precision validation
- **Message Delivery**: Real-time messaging reliability
- **Battery Usage**: Mobile device optimization
- **Network Efficiency**: Data usage optimization

### **Security Testing**
- **Authentication**: User verification testing
- **Data Access**: Firestore security rule validation
- **Privacy Controls**: Ghost mode and visibility testing
- **Input Validation**: User input sanitization

<br/>

## 🚀 Deployment

### **Production Build**
```bash
# Build for production
npm run build

# Start production server
npm start
```

### **Firebase Deployment**
```bash
# Deploy to Firebase Hosting
firebase deploy

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

### **PWA Deployment**
- **HTTPS Required**: Secure connection for PWA features
- **Service Worker**: Automatic caching and offline support
- **Manifest File**: App installation configuration
- **Icon Assets**: High-resolution app icons

<br/>

## 🔮 Future Enhancements

### **Advanced Features**
- **Group Chats**: Multi-user conversations
- **Study Groups**: Academic collaboration features
- **Event Planning**: Campus event coordination
- **Resource Sharing**: Academic resource exchange

### **Technical Improvements**
- **Machine Learning**: Smart matching algorithms
- **Advanced Analytics**: User behavior insights
- **Multi-Platform**: iOS/Android native apps
- **API Integration**: Third-party service connections

### **User Experience**
- **Voice Messages**: Audio communication
- **Video Calls**: Face-to-face interactions
- **File Sharing**: Document and media exchange
- **Custom Themes**: Personalized app appearance

<br/>

### **Development Guidelines**
- **TypeScript**: Strict type checking
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Testing**: Unit and integration tests

### **Code Standards**
- **Component Structure**: Functional components with hooks
- **State Management**: React hooks and context
- **Error Handling**: Comprehensive error boundaries
- **Documentation**: Inline code documentation

<br/>

**Built with ❤️ for the University of Waterloo community**

*Connect with nearby students, discover new friendships, and enhance your university experience with NearU.*
