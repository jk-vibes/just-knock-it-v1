import { Coordinates, DistanceUnit } from '../types';

const METERS_TO_MILES = 0.000621371;

// Calculate distance between two points in meters using Haversine formula
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  if (!coord1 || !coord2) return 0;

  const R = 6371e3; // metres
  
  // Ensure we are working with numbers to prevent string concatenation or NaN issues
  const lat1 = Number(coord1.latitude);
  const lon1 = Number(coord1.longitude);
  const lat2 = Number(coord2.latitude);
  const lon2 = Number(coord2.longitude);

  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 0;

  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const formatDistance = (meters: number, unit: DistanceUnit = 'km'): string => {
  if (unit === 'mi') {
    const miles = meters * METERS_TO_MILES;
    if (miles < 0.1) {
        return `${Math.round(meters * 3.28084)}ft`;
    }
    return `${miles.toFixed(1)}mi`;
  }

  // KM logic
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

// Format distance for Text-to-Speech (full words)
export const getDistanceSpeech = (meters: number, unit: DistanceUnit = 'km'): string => {
  if (unit === 'mi') {
    const miles = meters * METERS_TO_MILES;
    return `${miles.toFixed(1)} miles`;
  }
  if (meters < 1000) {
    return `${Math.round(meters)} meters`;
  }
  return `${(meters / 1000).toFixed(1)} kilometers`;
};

// Text-to-Speech function
export const speak = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  
  // Cancel any ongoing speech to avoid queue buildup/overlapping
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Attempt to set a natural voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                        voices.find(v => v.lang.startsWith('en'));
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
  
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }
  if (Notification.permission === "granted") {
    return true;
  }
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
};

export const sendNotification = async (title: string, body: string, tag: string = 'jk-proximity') => {
  if (Notification.permission === "granted") {
    let sent = false;

    // 1. Try Service Worker (Best for Mobile/PWA)
    if ('serviceWorker' in navigator) {
      try {
        // Race condition: if SW isn't ready in 1s, fall back to standard notification
        const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, reject) => setTimeout(() => reject('SW timeout'), 1000))
        ]) as ServiceWorkerRegistration;

        if (registration && registration.showNotification) {
            await registration.showNotification(title, {
                body,
                icon: '/icon.svg',
                badge: '/icon.svg',
                vibrate: [200, 100, 200],
                tag: tag,
                data: { url: '/' }
            } as any);
            sent = true;
        }
      } catch (e) {
        console.warn("SW Notification failed or timed out, using fallback", e);
      }
    }

    // 2. Fallback to standard Notification API if SW failed or not available
    if (!sent) {
        try {
            const n = new Notification(title, {
                body,
                icon: '/icon.svg',
                tag: tag
            });
            // Close after 5s if not interacted with (optional cleanup)
            setTimeout(n.close.bind(n), 5000);
        } catch(e) {
            console.error("Standard Notification failed", e);
        }
    }
  }
};