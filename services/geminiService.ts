
import { GoogleGenAI, Type } from "@google/genai";
import { BucketItemDraft, ItineraryItem, BucketItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const itineraryItemSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        latitude: { type: Type.NUMBER },
        longitude: { type: Type.NUMBER },
        isImportant: { type: Type.BOOLEAN },
        imageKeyword: { type: Type.STRING },
        category: { type: Type.STRING },
        interests: { type: Type.ARRAY, items: { type: Type.STRING } },
        bestVisitingTime: { type: Type.STRING }
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
    itinerary: { type: Type.ARRAY, items: itineraryItemSchema }
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
      type: itemType,
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
    return { title: input, description: "", type: itemType, category: "Other", interests: [], images: [] };
  }
};

export const generateStatsInsight = async (completedItems: BucketItem[]): Promise<{ title: string; message: string }> => {
    try {
        if (completedItems.length === 0) {
            return { title: "New Journey Starts!", message: "Ready to knock your first dream? Start by adding a destination!" };
        }

        const history = completedItems.map(i => ({ title: i.title, cat: i.category, loc: i.locationName }));
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Based on this bucket list history: ${JSON.stringify(history)}. Generate one short, witty, and inspiring "Fun Fact" or "Milestone Achievement". 
            Examples: "You've traveled 30% of the Great Wall's distance!", "You are officially a 5-star foodie!", "Cultural expert alert: 3 monuments visited!".
            Return JSON with "title" (short) and "message" (max 120 chars).`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        message: { type: Type.STRING }
                    },
                    required: ["title", "message"]
                }
            }
        });

        return JSON.parse(response.text || '{"title": "Keep Knocking!", "message": "You are making amazing progress on your dreams!"}');
    } catch (e) {
        return { title: "Milestone Reached!", message: "You've knocked off another dream! Keep going." };
    }
};

export const suggestBucketItem = async (availableCategories: string[], context?: string): Promise<BucketItemDraft> => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest a random famous bucket list item. ${context ? `Ideally related to: ${context}` : ''}`,
      config: { responseMimeType: "application/json", responseSchema: bucketItemSchema }
    });
    const data = JSON.parse(response.text || "{}");
    return { ...data, type: 'destination', images: generateImageUrls(data.imageKeyword || data.title) };
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `City and country for: ${lat}, ${lng}`,
    });
    return response.text?.trim() || "Unknown Location";
};

export const getPlaceDetails = async (placeName: string, context?: string): Promise<ItineraryItem | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Details for: "${placeName}" near ${context}`,
      config: { responseMimeType: "application/json", responseSchema: itineraryItemSchema }
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
  } catch (error) { return null; }
};

export const generateItineraryForLocation = async (location: string): Promise<ItineraryItem[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Top 15 spots for: "${location}".`,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: itineraryItemSchema } }
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
  } catch (error) { return []; }
};

export const generateRoadTripStops = async (start: string, end: string): Promise<ItineraryItem[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `5-8 road trip stops from "${start}" to "${end}".`,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: itineraryItemSchema } }
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
  } catch (error) { return []; }
};

export const optimizeRouteOrder = async (items: ItineraryItem[]): Promise<ItineraryItem[]> => {
    if (items.length <= 2) return items;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Reorder efficiently: ${JSON.stringify(items.map(i => i.name))}`,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: itineraryItemSchema } }
        });
        const data = JSON.parse(response.text || "[]");
        return data.map((item: any) => {
            const original = items.find(i => i.name === item.name);
            return { ...original, ...item } as ItineraryItem;
        });
    } catch (error) { return items; }
};
