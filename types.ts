export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ItineraryItem {
  name: string;
  description?: string;
  completed?: boolean;
  coordinates?: Coordinates;
  isImportant?: boolean;
  images?: string[]; 
  category?: string;
  interests?: string[];
  bestVisitingTime?: string;
}

export interface RoadTripDetails {
  startLocation?: string;
  startCoordinates?: Coordinates;
  stops: ItineraryItem[];
}

export interface BucketItem {
  id: string;
  title: string;
  description: string;
  type: 'destination' | 'roadtrip' | 'goal';
  locationName?: string;
  coordinates?: Coordinates;
  images?: string[];
  completed: boolean;
  completedAt?: number;
  createdAt: number;
  dueDate?: number;
  startDate?: number; // New: Trip start timestamp
  endDate?: number;   // New: Trip end timestamp
  category?: string;
  interests?: string[];
  owner?: string;
  bestTimeToVisit?: string;
  itinerary?: ItineraryItem[];
  roadTrip?: RoadTripDetails;
}

export interface BucketItemDraft {
  title: string;
  description: string;
  type: 'destination' | 'roadtrip' | 'goal';
  locationName?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  category?: string;
  interests?: string[];
  owner?: string;
  isCompleted?: boolean;
  completedAt?: number;
  dueDate?: number;
  startDate?: number; // New
  endDate?: number;   // New
  bestTimeToVisit?: string;
  itinerary?: ItineraryItem[];
  roadTrip?: RoadTripDetails;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'location' | 'system' | 'info' | 'insight';
  relatedItemId?: string;
}

export type Theme = 'marvel' | 'batman' | 'elsa';
export type TravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';
export type DistanceUnit = 'km' | 'mi';

export interface AppSettings {
  theme: Theme;
  proximityRange: number;
  travelMode: TravelMode;
  distanceUnit: DistanceUnit;
  notificationsEnabled: boolean;
  voiceAlertsEnabled: boolean;
  autoBackupEnabled: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
}

export type ActiveTab = 'list' | 'map' | 'stats';