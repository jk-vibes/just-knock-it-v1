import { GoogleGenAI, Type } from "@google/genai";
import { BucketItemDraft, ItineraryItem, BucketItem, Coordinates } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

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
  const ai = getClient();
  if (!ai) return { title: input, description: "", type: itemType, category: availableCategories[0], interests: [], images: [] };
  try {
    const prompt = `Analyze this dream: "${input}".
    1. Select the absolute best category from this list: ${availableCategories.join(', ')}.
    2. Generate 3-5 relevant interests (short tags).
    3. Provide a concise description.
    4. If it's a location, provide GPS coordinates and a full itinerary of 8-12 local spots.
    5. Be extremely fast and concise.`;

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
      title: data.title || input,
      description: data.description || "",
      type: itemType,
      locationName: data.locationName,
      latitude: hasLocation ? data.latitude : undefined,
      longitude: hasLocation ? data.longitude : undefined,
      images: data.imageKeyword ? generateImageUrls(data.imageKeyword) : generateImageUrls(data.title || input),
      category: data.category || availableCategories[0],
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
    console.warn("AI Analysis failed, using fallback.", error);
    return { title: input, description: "", type: itemType, category: availableCategories[0], interests: [], images: [] };
  }
};

export const suggestBucketItem = async (availableCategories: string[], context?: string): Promise<BucketItemDraft> => {
    const ai = getClient();
    if (!ai) return { title: "Explore the World", description: "", type: "destination", category: availableCategories[0], interests: [], images: [] };
    try {
        const prompt = `Suggest a specific, iconic bucket list experience. 
        ${context ? `Use the user's input "${context}" as a context seed for the suggestion.` : 'Pick something random and world-famous.'}
        Select a category from: ${availableCategories.join(', ')}.
        Be fast. Return JSON.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: bucketItemSchema 
            }
        });
        const data = JSON.parse(response.text || "{}");
        const hasLocation = data.latitude && data.longitude;
        
        return {
            title: data.title,
            description: data.description,
            type: 'destination',
            locationName: data.locationName,
            latitude: hasLocation ? data.latitude : undefined,
            longitude: hasLocation ? data.longitude : undefined,
            images: data.imageKeyword ? generateImageUrls(data.imageKeyword) : generateImageUrls(data.title),
            category: data.category || availableCategories[0],
            interests: data.interests || [],
            bestTimeToVisit: data.bestTimeToVisit || 'Anytime',
            itinerary: (data.itinerary || []).map((item: any) => ({
                name: item.name,
                description: item.description,
                coordinates: (item.latitude && item.longitude) ? { latitude: item.latitude, longitude: item.longitude } : undefined,
                completed: false
            }))
        };
    } catch (error) {
        return analyzeBucketItem(context || "Visit Paris", availableCategories);
    }
};

export const generateSmartNotification = async (items: BucketItem[], currentCity?: string): Promise<{ title: string; message: string; type: string; suggestion?: BucketItemDraft }> => {
    const ai = getClient();
    if (!ai) return { title: "Dream On!", message: "Keep knocking those dreams off your list!", type: "insight" };
    try {
        const listSummary = items.slice(0, 10).map(i => ({ title: i.title, location: i.locationName, completed: i.completed }));
        const prompt = `Based on the user's bucket list: ${JSON.stringify(listSummary)}. Current City: ${currentCity || 'Unknown'}. Generate ONE witty trivia/insight notification. JSON output with title, message, type.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        message: { type: Type.STRING },
                        type: { type: Type.STRING }
                    },
                    required: ["title", "message", "type"]
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { title: "Dream On!", message: "Your bucket list is waiting for its next champion.", type: "insight" };
    }
};

export const generateStatsInsight = async (completedItems: BucketItem[]): Promise<{ title: string; message: string }> => {
    const ai = getClient();
    if (!ai) return { title: "Achievement!", message: "You knocked off another dream!" };
    try {
        const history = completedItems.slice(0, 5).map(i => ({ title: i.title, cat: i.category }));
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a short witty milestone achievement for: ${JSON.stringify(history)}. JSON: title, message.`,
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
        return JSON.parse(response.text || '{"title": "Keep Knocking!", "message": "You are making progress!"}');
    } catch (e) {
        return { title: "Achievement!", message: "You knocked off another dream!" };
    }
};

export const chatWithGemini = async (query: string, locationContext?: string, bucketListSummary?: string) => {
    const ai = getClient();
    if (!ai) return { text: "Trouble connecting to the neural grid. Check your API configuration.", urls: [] };
    try {
        const systemInstruction = `You are the "Just Knock It" AI guide. Concise, inspiring. Location: ${locationContext || "Unknown"}. User List: ${bucketListSummary || "Empty"}.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: query,
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }]
            }
        });
        const text = response.text || "I couldn't generate a response.";
        const urls = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];
        return { text, urls };
    } catch (error) {
        return { text: "Trouble connecting. Try again later.", urls: [] };
    }
};

export const reverseGeocode = async (coords: Coordinates): Promise<string> => {
    const ai = getClient();
    if (!ai) return "LOCATION";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Return ONLY the name of the major city for these coordinates: ${coords.latitude}, ${coords.longitude}. No punctuation, UPPERCASE.`,
        });
        return response.text?.trim().toUpperCase() || "LOCATION";
    } catch (e) { return "LOCATION"; }
};

export const getPlaceDetails = async (placeName: string, context?: string): Promise<ItineraryItem | null> => {
  const ai = getClient();
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide full details for: "${placeName}". ${context ? `Context: ${context}` : ''}`,
      config: { responseMimeType: "application/json", responseSchema: itineraryItemSchema }
    });
    const data = JSON.parse(response.text || "{}");
    if (!data.name || !data.latitude) return null;
    return {
      name: data.name,
      description: data.description,
      coordinates: { latitude: data.latitude, longitude: data.longitude },
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
  const ai = getClient();
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest 10 specific local spots for "${location}".`,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: itineraryItemSchema } }
    });
    const data = JSON.parse(response.text || "[]");
    return data.map((item: any) => ({
      name: item.name,
      description: item.description,
      coordinates: { latitude: item.latitude, longitude: item.longitude },
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
  const ai = getClient();
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest 5 scenic stops between "${start}" and "${end}".`,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: itineraryItemSchema } }
    });
    const data = JSON.parse(response.text || "[]");
    return data.map((item: any) => ({
      name: item.name,
      description: item.description,
      coordinates: { latitude: item.latitude, longitude: item.longitude },
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
    const ai = getClient();
    if (!ai || items.length <= 2) return items;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Efficient route for: ${JSON.stringify(items.map(i => i.name))}`,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: itineraryItemSchema } }
        });
        const data = JSON.parse(response.text || "[]");
        return data.map((item: any) => {
            const original = items.find(i => i.name === item.name);
            return { ...original, ...item } as ItineraryItem;
        });
    } catch (error) { return items; }
};