
import { GoogleGenAI, Type } from "@google/genai";
import { BucketItemDraft, ItineraryItem, BucketItem, Coordinates } from "../types";

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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = itemType === 'goal'
        ? `Analyze the goal: "${input}". Create a plan with actionable steps in the itinerary field. Do not invent a location if one is not implied.`
        : `Analyze the destination: "${input}". 
           1. Provide exact GPS coordinates for the center of this location.
           2. Generate a full itinerary of 10-15 specific spots.
           3. Focus ONLY on local attractions, hidden gems, and landmarks INSIDE the city area of "${input}". 
           4. Every stop must be reachable within a short local drive or walk from the city center.`;

    // Using gemini-3-pro-preview for complex reasoning and planning tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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

export const generateSmartNotification = async (items: BucketItem[], currentCity?: string): Promise<{ title: string; message: string; type: string; suggestion?: BucketItemDraft }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const listSummary = items.map(i => ({ title: i.title, location: i.locationName, completed: i.completed }));
        const taggedLocations = items.filter(i => !i.completed && i.locationName).map(i => i.locationName);
        
        const prompt = `Based on the user's bucket list: ${JSON.stringify(listSummary)}. 
        Current City context: ${currentCity || 'Unknown'}.
        Tagged Locations they want to visit: ${JSON.stringify(taggedLocations)}.

        GENERATE ONE SMART NOTIFICATION that is either:
        1. "Location Trivia/News": A "Did you know" or recent interesting news about one of their tagged locations.
        2. "Personal Insight": A witty observation about their progress or a motivational nudge.
        3. "Daily Discovery": A suggestion for a NEW bucket list item based on their interests.
        
        If it's a discovery, include a simplified bucket item structure.
        Return JSON with "title", "message", "type" (one of: trivia, insight, discovery), and optional "suggestion" (BucketItemDraft schema).`;

        // Using gemini-3-pro-preview for complex reasoning task
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        message: { type: Type.STRING },
                        type: { type: Type.STRING },
                        suggestion: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                locationName: { type: Type.STRING },
                                category: { type: Type.STRING }
                            }
                        }
                    },
                    required: ["title", "message", "type"]
                }
            }
        });
        const data = JSON.parse(response.text || '{}');
        return data;
    } catch (e) {
        return { title: "Dream On!", message: "Your bucket list is waiting for its next champion.", type: "insight" };
    }
};

export const generateStatsInsight = async (completedItems: BucketItem[]): Promise<{ title: string; message: string }> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        if (completedItems.length === 0) {
            return { title: "New Journey Starts!", message: "Ready to knock your first dream? Start by adding a destination!" };
        }
        const history = completedItems.map(i => ({ title: i.title, cat: i.category, loc: i.locationName }));
        // Using gemini-3-flash-preview for simple text synthesis task
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const systemInstruction = `You are the "Just Knock It" AI guide. 
        Your goal is to help users fulfill their bucket list dreams.
        Current Location Context: ${locationContext || "Unknown"}
        User's Bucket List Summary: ${bucketListSummary || "Empty"}
        
        IMPORTANT: If the user asks for nearby restaurants, food, or attractions without specifying a city, assume they are in ${locationContext}. Use your search tools to find current, real-world data for that specific city.
        Be inspiring, helpful, and concise. Use markdown for better readability.`;

        // Using gemini-3-pro-preview for high-quality conversational tasks with tool use
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: query,
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text || "I couldn't generate a response. Please try again.";
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const urls = groundingChunks?.map((chunk: any) => chunk.web?.uri).filter(Boolean) || [];

        return { text, urls };
    } catch (error) {
        console.error("Chat Error:", error);
        return { text: "I'm having trouble connecting right now. Please check your connection or try again in a moment.", urls: [] };
    }
};

export const suggestBucketItem = async (availableCategories: string[], context?: string): Promise<BucketItemDraft> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        // Using gemini-3-pro-preview for a creative reasoning task
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Suggest a random, world-famous bucket list adventure or destination. ${context ? `Take inspiration from: ${context}` : ''}
            Ensure it is iconic, specific, and has a clear location.`,
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
            images: data.imageKeyword ? generateImageUrls(data.imageKeyword) : [generateImageUrls(data.title)[0]],
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
        return { 
            title: "Northern Lights in Iceland", 
            description: "Witness the celestial dance of the Aurora Borealis in the dark skies of Iceland.", 
            type: 'destination', 
            category: "Nature", 
            images: generateImageUrls("Northern Lights Iceland") 
        };
    }
};

// Fix: Change signature to accept a single Coordinates object to resolve argument count mismatch in App.tsx
export const reverseGeocode = async (coords: Coordinates): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { latitude: lat, longitude: lng } = coords;
    // Using gemini-3-flash-preview for a simple text extraction task
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Return ONLY the name of the major city for these coordinates: ${lat}, ${lng}. No punctuation, no state, no country, just the name in UPPERCASE. Example: TOKYO`,
    });
    return response.text?.trim().toUpperCase() || "LOCATION";
};

export const getPlaceDetails = async (placeName: string, context?: string): Promise<ItineraryItem | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // Using gemini-3-pro-preview for detailed extraction task
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Provide full details for: "${placeName}". ${context ? `Context: ${context}` : ''}`,
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // Using gemini-3-pro-preview for complex planning task
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Suggest 15 top spots, hidden gems, and landmarks STRICTLY within the city area of "${location}".`,
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // Using gemini-3-pro-preview for complex planning task
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    if (items.length <= 2) return items;
    try {
        // Using gemini-3-pro-preview for optimization reasoning task
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
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
