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
        description: { type: Type.STRING, description: "Detailed description. For milestones, explain the step. For stops, explain the attraction." },
        latitude: { type: Type.NUMBER },
        longitude: { type: Type.NUMBER },
        isImportant: { type: Type.BOOLEAN },
        imageKeyword: { type: Type.STRING },
        category: { type: Type.STRING },
        interests: { type: Type.ARRAY, items: { type: Type.STRING } },
        bestVisitingTime: { 
          type: Type.STRING, 
          description: "For trips: 'Jun-Jul'. For learning paths: 'Week 1' or 'Month 1'." 
        }
    },
    required: ["name", "description"]
};

const bucketItemSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING, description: "Concise description." },
    locationName: { type: Type.STRING },
    latitude: { type: Type.NUMBER },
    longitude: { type: Type.NUMBER },
    imageKeyword: { type: Type.STRING },
    category: { type: Type.STRING },
    interests: { type: Type.ARRAY, items: { type: Type.STRING } },
    bestTimeToVisit: { type: Type.STRING },
    itinerary: { type: Type.ARRAY, items: itineraryItemSchema, description: "List of milestones, stops, or spots based on dream type." }
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
    let contextPrompt = "";
    if (itemType === 'goal') {
        contextPrompt = "This is a PERSONAL GROWTH or LEARNING dream. Rebrand the 'itinerary' as a 'LEARNING PATH'. Sub-items must be 'MILESTONES' (sequential steps to achieve the goal, e.g., 'Master basics', 'Build first project'). Ignore GPS coordinates for milestones.";
    } else if (itemType === 'roadtrip') {
        contextPrompt = "This is a ROAD TRIP dream. Rebrand the 'itinerary' as 'ROUTE STOPS'. Generate 5-8 scenic stops along a logical route. GPS coordinates are mandatory for all stops.";
    } else {
        contextPrompt = "This is a TRAVEL dream. Rebrand the 'itinerary' as a 'CITY ITINERARY'. Generate 10-12 local spots strictly within the specified city context. GPS coordinates are mandatory.";
    }

    const prompt = `Analyze this dream: "${input}". 
    ${contextPrompt}
    1. Select the best category from: ${availableCategories.join(', ')}.
    2. Provide a concise description.
    3. Return structured JSON matching the schema provided.`;

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
      bestTimeToVisit: data.bestTimeToVisit || 'Jan-Dec',
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
    console.error("AI analysis failed", error);
    return { title: input, description: "", type: itemType, category: availableCategories[0], interests: [], images: [] };
  }
};

export const generateItineraryForLocation = async (item: BucketItem): Promise<ItineraryItem[]> => {
  const ai = getClient();
  if (!ai) return [];
  try {
    let prompt = "";
    if (item.type === 'goal') {
        prompt = `Suggest 5 additional sequential LEARNING MILESTONES to master the learning path for the goal: "${item.title}". No GPS needed. Return as milestones.`;
    } else if (item.type === 'roadtrip') {
        prompt = `Suggest 5 more scenic ROAD TRIP STOPS or hidden waypoints near the route for: "${item.locationName || item.title}". GPS is required.`;
    } else {
        prompt = `Suggest 10 specific LOCAL SPOTS or attractions to visit strictly inside the city itinerary for: "${item.locationName || item.title}". GPS is required.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json", 
        responseSchema: { type: Type.ARRAY, items: itineraryItemSchema } 
      }
    });
    const data = JSON.parse(response.text || "[]");
    return data.map((sub: any) => ({
      ...sub,
      coordinates: (sub.latitude && sub.longitude) ? { latitude: sub.latitude, longitude: sub.longitude } : undefined,
      completed: false
    }));
  } catch (error) { return []; }
};

export const chatWithGemini = async (query: string, locationContext?: string, bucketListSummary?: string) => {
    const ai = getClient();
    if (!ai) return { text: "Trouble connecting to the neural grid.", urls: [] };
    try {
        const systemInstruction = `You are the "Just Knock It" AI guide. Concise, inspiring. Location: ${locationContext || "Unknown"}. User List: ${bucketListSummary || "Empty"}. 
        CRITICAL TAXONOMY:
        - For 'goal' items (Personal Growth/Learning), use the term 'Learning Paths' and 'Milestones'.
        - For 'roadtrip' items, use 'Route Stops' and 'Waypoints'.
        - For 'destination' (Travel), use 'City Itineraries' and 'Local Spots'.`;
        
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
      contents: `Provide full details for: "${placeName}". ${context ? `Context: ${context}` : ''}. If it is a milestone for a goal, treat it as a task. If it is a stop for a trip, include location.`,
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

export const generateSmartNotification = async (items: BucketItem[], currentCity: string) => {
    const ai = getClient();
    if (!ai) return null;
    try {
        const summary = items.map(i => `${i.title} (${i.type})`).join(', ');
        const prompt = `Based on these bucket list items: ${summary}. The user is currently in ${currentCity}. Generate a short, snappy, encouraging insight (max 20 words). If they have a goal, suggest a learning milestone. If a trip, a local spot. Return JSON: {title: string, message: string, type: 'trivia'|'insight'|'discovery'}`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
              responseMimeType: "application/json",
              // Fix: Added responseSchema for more predictable JSON output
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  message: { type: Type.STRING },
                  type: { type: Type.STRING, description: "Type of message: trivia, insight, or discovery" }
                },
                required: ["title", "message", "type"]
              }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return null; }
};

export const suggestBucketItem = async (categories: string[], currentInput?: string): Promise<BucketItemDraft> => {
    const ai = getClient();
    if (!ai) return { title: "Explore the World", description: "", type: "destination", category: categories[0], interests: [] };
    try {
        const prompt = `Suggest a unique, inspiring bucket list item. ${currentInput ? `The user is thinking about: ${currentInput}.` : ''} Use categories: ${categories.join(', ')}. Return JSON following the bucketItemSchema. Be specific about whether it's a Learning Path, Road Trip, or City Destination.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: bucketItemSchema }
        });
        const data = JSON.parse(response.text || "{}");
        let detectedType: 'goal' | 'roadtrip' | 'destination' = 'destination';
        const lowerTitle = (data.title || '').toLowerCase();
        if (lowerTitle.includes('road trip') || lowerTitle.includes('drive')) detectedType = 'roadtrip';
        else if (lowerTitle.includes('learn') || lowerTitle.includes('master') || data.category === 'Personal Growth') detectedType = 'goal';
        
        return {
            ...data,
            type: detectedType,
            images: data.imageKeyword ? generateImageUrls(data.imageKeyword) : [],
        };
    } catch (e) { return { title: "Explore the World", description: "", type: "destination", category: categories[0], interests: [] }; }
};

export const optimizeRouteOrder = async (items: ItineraryItem[]): Promise<ItineraryItem[]> => {
    const ai = getClient();
    if (!ai) return items;
    try {
        const prompt = `Optimize the following stops/milestones for the most logical sequence. Return ONLY the JSON array of names in order: ${JSON.stringify(items.map(i => i.name))}`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
              responseMimeType: "application/json",
              // Fix: Added responseSchema for reliable JSON output
              responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
        });
        const orderedNames = JSON.parse(response.text || "[]");
        const optimized = [...items].sort((a, b) => orderedNames.indexOf(a.name) - orderedNames.indexOf(b.name));
        return optimized;
    } catch (e) { return items; }
};
