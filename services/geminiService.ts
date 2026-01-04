
import { GoogleGenAI, Type } from "@google/genai";
import { BucketItemDraft, ItineraryItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define a common schema for itinerary items used across multiple functions
const itineraryItemSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: 'The name of the place, step, or action.' },
        description: { type: Type.STRING, description: 'A short description.' },
        latitude: { type: Type.NUMBER, description: 'Latitude coordinate (optional).' },
        longitude: { type: Type.NUMBER, description: 'Longitude coordinate (optional).' },
        isImportant: { type: Type.BOOLEAN, description: 'Whether this is a key highlight.' },
        imageKeyword: { type: Type.STRING, description: 'A keyword to search for images.' },
        category: { type: Type.STRING, description: 'The category of the place (e.g., Nature, History, Food).' },
        interests: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tags related to interests (e.g., Photography, Hiking).' },
        bestVisitingTime: { type: Type.STRING, description: 'Best time of day or opening hours summary.' }
    },
    required: ["name", "description"]
};

const bucketItemSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    locationName: { type: Type.STRING },
    latitude: { type: Type.NUMBER },
    longitude: { type: Type.NUMBER },
    imageKeyword: { type: Type.STRING },
    category: { type: Type.STRING },
    interests: { type: Type.ARRAY, items: { type: Type.STRING } },
    bestTimeToVisit: { type: Type.STRING },
    itinerary: {
        type: Type.ARRAY,
        items: itineraryItemSchema
    }
  },
  required: ["title", "description", "category"]
};

const generateImageUrls = (keyword: string): string[] => {
    const encoded = encodeURIComponent(keyword);
    return [`https://image.pollinations.ai/prompt/${encoded}?width=800&height=600&nologo=true`];
};

export const analyzeBucketItem = async (input: string, availableCategories: string[], itemType: 'destination' | 'goal' = 'destination'): Promise<BucketItemDraft> => {
  try {
    const prompt = itemType === 'goal'
        ? `Analyze the goal: "${input}". Create a plan with actionable steps in the itinerary field. Do not invent a location if one is not implied.`
        : `Analyze: "${input}". Provide location coordinates and a full itinerary if it's a destination.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: bucketItemSchema,
      }
    });

    const data = JSON.parse(response.text || "{}");
    const hasLocation = data.latitude && data.longitude;

    return {
      title: data.title,
      description: data.description,
      locationName: data.locationName,
      latitude: hasLocation ? data.latitude : undefined,
      longitude: hasLocation ? data.longitude : undefined,
      images: data.imageKeyword ? generateImageUrls(data.imageKeyword) : [],
      category: data.category,
      interests: data.interests || [],
      bestTimeToVisit: data.bestTimeToVisit || 'Anytime',
      itinerary: (data.itinerary || []).map((item: any) => ({
          name: item.name,
          description: item.description,
          coordinates: (item.latitude && item.longitude) ? { latitude: item.latitude, longitude: item.longitude } : undefined,
          isImportant: item.isImportant,
          images: item.imageKeyword ? generateImageUrls(item.imageKeyword) : [],
          category: item.category,
          interests: item.interests,
          bestVisitingTime: item.bestVisitingTime,
          completed: false
      }))
    };
  } catch (error) {
    return { title: input, description: "", category: "Other", interests: [], images: [] };
  }
};

export const suggestBucketItem = async (availableCategories: string[], context?: string): Promise<BucketItemDraft> => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest a random "Must Visit" world-famous monument, natural wonder, or unique travel experience that is highly rated. 
      It should be a top-tier bucket list item. 
      ${context ? `Ideally related to: ${context}` : ''}
      Provide title, engaging description, exact location coordinates, and 3-5 itinerary highlights.`,
      config: { 
          responseMimeType: "application/json", 
          responseSchema: bucketItemSchema 
      }
    });
    const data = JSON.parse(response.text || "{}");
    return { ...data, images: generateImageUrls(data.imageKeyword || data.title) };
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `City and country for: ${lat}, ${lng}`,
    });
    return response.text?.trim() || "Unknown Location";
};

// --- Missing functions required by ItineraryRouteModal ---

/**
 * Fetches specific details (coordinates, description) for a place name using AI
 */
export const getPlaceDetails = async (placeName: string, context?: string): Promise<ItineraryItem | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide details for the place: "${placeName}" ${context ? `located near or in ${context}` : ''}. Include exact latitude and longitude, category, interests tags, and best visiting time.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: itineraryItemSchema,
      }
    });

    const data = JSON.parse(response.text || "{}");
    if (!data.name) return null;

    return {
      name: data.name,
      description: data.description,
      coordinates: (data.latitude && data.longitude) ? { latitude: data.latitude, longitude: data.longitude } : undefined,
      isImportant: data.isImportant,
      images: data.imageKeyword ? generateImageUrls(data.imageKeyword) : [],
      category: data.category,
      interests: data.interests,
      bestVisitingTime: data.bestVisitingTime,
      completed: false
    };
  } catch (error) {
    console.error("getPlaceDetails failed:", error);
    return null;
  }
};

/**
 * Generates a full itinerary (top 15 spots) for a specific city or destination
 */
export const generateItineraryForLocation = async (location: string): Promise<ItineraryItem[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a detailed bucket list itinerary for: "${location}". Return the top 15 must-see spots with their coordinates, categories, interests, and opening/best visiting times.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: itineraryItemSchema
        },
      }
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any) => ({
      name: item.name,
      description: item.description,
      coordinates: (item.latitude && item.longitude) ? { latitude: item.latitude, longitude: item.longitude } : undefined,
      isImportant: item.isImportant,
      images: item.imageKeyword ? generateImageUrls(item.imageKeyword) : [],
      category: item.category,
      interests: item.interests,
      bestVisitingTime: item.bestVisitingTime,
      completed: false
    }));
  } catch (error) {
    console.error("generateItineraryForLocation failed:", error);
    return [];
  }
};

/**
 * Suggests interesting road trip stops between two locations
 */
export const generateRoadTripStops = async (start: string, end: string): Promise<ItineraryItem[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest 5-8 interesting road trip stops when traveling from "${start}" to "${end}". Provide names, descriptions, coordinates, categories, and interest tags.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: itineraryItemSchema
        },
      }
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any) => ({
      name: item.name,
      description: item.description,
      coordinates: (item.latitude && item.longitude) ? { latitude: item.latitude, longitude: item.longitude } : undefined,
      isImportant: item.isImportant,
      images: item.imageKeyword ? generateImageUrls(item.imageKeyword) : [],
      category: item.category,
      interests: item.interests,
      bestVisitingTime: item.bestVisitingTime,
      completed: false
    }));
  } catch (error) {
    console.error("generateRoadTripStops failed:", error);
    return [];
  }
};

/**
 * Optimizes the order of stops for a geographically logical route
 */
export const optimizeRouteOrder = async (items: ItineraryItem[]): Promise<ItineraryItem[]> => {
    if (items.length <= 2) return items;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Given these stops: ${JSON.stringify(items.map(i => i.name))}, reorder them to be geographically efficient for a single trip. Return the full objects in the new order.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: itineraryItemSchema
                }
            }
        });

        const data = JSON.parse(response.text || "[]");
        return data.map((item: any) => {
            const original = items.find(i => i.name === item.name);
            return {
                ...original,
                name: item.name,
                description: item.description,
                coordinates: (item.latitude && item.longitude) ? { latitude: item.latitude, longitude: item.longitude } : (original?.coordinates),
                isImportant: item.isImportant,
                images: item.imageKeyword ? generateImageUrls(item.imageKeyword) : (original?.images || []),
                category: item.category || original?.category,
                interests: item.interests || original?.interests,
                bestVisitingTime: item.bestVisitingTime || original?.bestVisitingTime
            } as ItineraryItem;
        });
    } catch (error) {
        console.error("optimizeRouteOrder failed:", error);
        return items;
    }
};
