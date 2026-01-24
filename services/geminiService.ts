
import { GoogleGenAI, Type } from "@google/genai";
import { BucketItemDraft, ItineraryItem, BucketItem, Coordinates } from "../types";

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

export const analyzeBucketItem = async (input: string, availableCategories: string[], itemType: 'destination' | 'roadtrip' | 'goal' = 'destination'): Promise<BucketItemDraft> => {
  try {
    const prompt = itemType === 'goal'
        ? `Analyze the goal: "${input}". Create a plan with actionable steps in the itinerary field. Do not invent a location if one is not implied.`
        : `Analyze the destination: "${input}". 
           1. Provide exact GPS coordinates for the center of this location.
           2. Generate a full itinerary of 10-15 specific spots.
           3. Focus ONLY on local attractions, hidden gems, and landmarks INSIDE the city area of "${input}". 
           4. DO NOT suggest places from neighboring cities or different regions. 
           5. Every stop must be reachable within a short local drive or walk from the city center.`;

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

export const chatWithGemini = async (query: string, locationContext?: string, bucketListSummary?: string) => {
    try {
        const systemInstruction = `You are the "Just Knock It" AI guide. 
        Your goal is to help users fulfill their bucket list dreams.
        Current Location Context: ${locationContext || "Unknown"}
        User's Bucket List Summary: ${bucketListSummary || "Empty"}
        
        IMPORTANT: If the user asks for nearby restaurants, food, or attractions without specifying a city, assume they are in ${locationContext}. Use your search tools to find current, real-world data for that specific city.
        Be inspiring, helpful, and concise. Use markdown for better readability.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: query,
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const urls = groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];

        return { text, urls };
    } catch (error) {
        console.error("Chat Error:", error);
        return { text: "I'm having trouble connecting right now. Please try again in a moment.", urls: [] };
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
        contents: `Return ONLY the name of the major city for these coordinates: ${lat}, ${lng}. No punctuation, no state, no country, just the name in UPPERCASE. Example: TOKYO`,
    });
    return response.text?.trim().toUpperCase() || "LOCATION";
};

export const getPlaceDetails = async (placeName: string, context?: string): Promise<ItineraryItem | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide full details for: "${placeName}". 
                 The place MUST be strictly within the city area or immediate surroundings of "${context}". 
                 If it is in a different city, return an empty object.`,
      config: { responseMimeType: "application/json", responseSchema: itineraryItemSchema }
    });
    const data = JSON.parse(response.text || "{}");
    if (!data.name || !data.latitude) return null;
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
      contents: `Suggest 15 top spots, hidden gems, and landmarks STRICTLY within the city area of "${location}". 
                 STRICT CONSTRAINT: DO NOT suggest any places from other cities or towns. 
                 Focus on local neighborhoods, street markets, city parks, and monuments within "${location}".`,
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
      contents: `Suggest 5-8 scenic stops for a short road trip between "${start}" and "${end}".`,
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
            contents: `Reorder these locations to create an efficient route starting from the first item: ${JSON.stringify(items.map(i => i.name))}`,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: itineraryItemSchema } }
        });
        const data = JSON.parse(response.text || "[]");
        return data.map((item: any) => {
            const original = items.find(i => i.name === item.name);
            return { ...original, ...item } as ItineraryItem;
        });
    } catch (error) { return items; }
};
