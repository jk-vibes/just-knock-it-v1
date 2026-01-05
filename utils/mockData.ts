
import { BucketItem } from "../types";

const getImgs = (keyword: string, index: number) => [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}?width=800&height=600&nologo=true&seed=${index}`
];

const getRandomDate = (startYear: number = 2021) => {
    const start = new Date(`${startYear}-01-01`).getTime();
    const end = Date.now();
    return Math.floor(start + Math.random() * (end - start));
};

const INDIA_LOCATIONS = [
    { name: "Taj Mahal", city: "Agra", lat: 27.1751, lng: 78.0421, cat: "Culture" },
    { name: "Gateway of India", city: "Mumbai", lat: 18.9220, lng: 72.8347, cat: "Culture" },
    { name: "Hampi Ruins", city: "Hampi", lat: 15.3350, lng: 76.4600, cat: "Culture" },
    { name: "Amber Fort", city: "Jaipur", lat: 26.9855, lng: 75.8513, cat: "Culture" },
    { name: "Meenakshi Temple", city: "Madurai", lat: 9.9195, lng: 78.1193, cat: "Culture" },
    { name: "Pangong Lake", city: "Ladakh", lat: 33.7595, lng: 78.6674, cat: "Nature" },
    { name: "Munnar Tea Gardens", city: "Kerala", lat: 10.0889, lng: 77.0595, cat: "Nature" },
    { name: "Valley of Flowers", city: "Uttarakhand", lat: 30.7280, lng: 79.6053, cat: "Adventure" },
    { name: "Rishikesh Yoga Center", city: "Rishikesh", lat: 30.0869, lng: 78.2676, cat: "Personal Growth" },
    { name: "Dal Lake", city: "Srinagar", lat: 34.0837, lng: 74.8732, cat: "Travel" },
    { name: "Ajanta Caves", city: "Aurangabad", lat: 20.5519, lng: 75.7033, cat: "Culture" },
    { name: "Qutub Minar", city: "Delhi", lat: 28.5244, lng: 77.1855, cat: "Culture" },
    { name: "Varakala Beach", city: "Kerala", lat: 8.7374, lng: 76.7032, cat: "Nature" },
    { name: "Golden Temple", city: "Amritsar", lat: 31.6200, lng: 74.8765, cat: "Culture" },
    { name: "Khajuraho Temples", city: "Madhya Pradesh", lat: 24.8318, lng: 79.9199, cat: "Culture" }
];

const EUROPE_LOCATIONS = [
    { name: "Eiffel Tower", city: "Paris", lat: 48.8584, lng: 2.2945, cat: "Culture" },
    { name: "Colosseum", city: "Rome", lat: 41.8902, lng: 12.4922, cat: "Culture" },
    { name: "Sagrada Familia", city: "Barcelona", lat: 41.4036, lng: 2.1744, cat: "Culture" },
    { name: "Acropolis", city: "Athens", lat: 37.9715, lng: 23.7257, cat: "Culture" },
    { name: "Swiss Alps", city: "Interlaken", lat: 46.6863, lng: 7.8632, cat: "Nature" },
    { name: "Blue Lagoon", city: "Iceland", lat: 63.8792, lng: -22.4451, cat: "Nature" },
    { name: "Charles Bridge", city: "Prague", lat: 50.0865, lng: 14.4114, cat: "Culture" },
    { name: "Neuschwanstein Castle", city: "Bavaria", lat: 47.5576, lng: 10.7498, cat: "Culture" },
    { name: "Hallstatt Village", city: "Austria", lat: 47.5622, lng: 13.6493, cat: "Travel" },
    { name: "Big Ben", city: "London", lat: 51.5007, lng: -0.1246, cat: "Culture" },
    { name: "Santorini Sunsets", city: "Oia", lat: 36.4618, lng: 25.3753, cat: "Luxury" },
    { name: "Cinque Terre", city: "Italy", lat: 44.1461, lng: 9.6439, cat: "Travel" },
    { name: "Berlin Wall", city: "Berlin", lat: 52.5074, lng: 13.3904, cat: "Culture" },
    { name: "Lake Como", city: "Italy", lat: 45.9902, lng: 9.2553, cat: "Luxury" },
    { name: "Cliffs of Moher", city: "Ireland", lat: 52.9719, lng: -9.4265, cat: "Nature" }
];

const GOALS_TEMPLATES = [
    "Run a Full Marathon", "Master Meditation", "Learn to speak French", "Write a personal memoir",
    "Complete a 10-day Silent Retreat", "Master 108 Surya Namaskars", "Start a organic home garden",
    "Read 50 books in a year", "Learn to play the Flute", "Donate blood 5 times", "Teach a child to read",
    "Master advanced coding", "Climb a 5000m peak", "Perform a solo dance", "Start a successful podcast"
];

const ROAD_TRIP_TEMPLATES = [
    { title: "Manali to Leh Highway", loc: "Himalayas, India", lat: 33.1, lng: 77.5 },
    { title: "Amalfi Coast Drive", loc: "Italy", lat: 40.6, lng: 14.5 },
    { title: "The Romantic Road", loc: "Germany", lat: 49.8, lng: 9.9 },
    { title: "Wild Atlantic Way", loc: "Ireland", lat: 53.0, lng: -9.0 },
    { title: "Golden Quadrilateral", loc: "India Loop", lat: 21.0, lng: 78.0 },
    { title: "Route Napoleon", loc: "France", lat: 44.0, lng: 6.0 },
    { title: "Mumbai to Goa Drive", loc: "Konkan Coast", lat: 17.5, lng: 73.5 },
    { title: "Iceland Ring Road", loc: "Iceland", lat: 65.0, lng: -18.0 }
];

const generateLargeMockData = (): BucketItem[] => {
    const allItems: BucketItem[] = [];
    let idCounter = 1000;

    // 1. Generate 500 Destinations (Mixed India & Europe)
    for (let i = 0; i < 500; i++) {
        const pool = i % 2 === 0 ? INDIA_LOCATIONS : EUROPE_LOCATIONS;
        const source = pool[i % pool.length];
        const isCompleted = i % 5 === 0; // 20% completion rate
        
        // Add variations to title to make it look diverse
        const prefixes = ["Visit", "Explore", "Photograph", "Walk through", "Stay near"];
        const prefix = prefixes[i % prefixes.length];

        allItems.push({
            id: `dest-${idCounter++}`,
            title: `${prefix} ${source.name}`,
            description: `A unique experience at ${source.name} in ${source.city}. Explore the rich heritage and breathtaking views of this iconic spot.`,
            type: 'destination',
            locationName: `${source.city}, ${i % 2 === 0 ? 'India' : 'Europe'}`,
            coordinates: { 
                latitude: source.lat + (Math.random() - 0.5) * 0.1, 
                longitude: source.lng + (Math.random() - 0.5) * 0.1 
            },
            images: getImgs(source.name, i),
            category: source.cat,
            interests: [source.cat, i % 2 === 0 ? "Heritage" : "European", "Sightseeing"],
            completed: isCompleted,
            completedAt: isCompleted ? getRandomDate(2022) : undefined,
            createdAt: getRandomDate(2020),
            owner: 'Me'
        });
    }

    // 2. Generate 50 Road Trips
    for (let i = 0; i < 50; i++) {
        const source = ROAD_TRIP_TEMPLATES[i % ROAD_TRIP_TEMPLATES.length];
        const isCompleted = i % 7 === 0;

        allItems.push({
            id: `road-${idCounter++}`,
            title: `Classic Road Trip: ${source.title}`,
            description: `A scenic driving journey through ${source.loc}. Perfect for adventure seekers and landscape photographers.`,
            type: 'roadtrip',
            locationName: source.loc,
            coordinates: { latitude: source.lat, longitude: source.lng },
            images: getImgs(source.title, i + 600),
            category: "Adventure",
            interests: ["Driving", "Road Trip", "Scenic"],
            completed: isCompleted,
            completedAt: isCompleted ? getRandomDate(2023) : undefined,
            createdAt: getRandomDate(2021),
            owner: 'Me'
        });
    }

    // 3. Generate 50 Personal Goals
    for (let i = 0; i < 50; i++) {
        const goalText = GOALS_TEMPLATES[i % GOALS_TEMPLATES.length];
        const isCompleted = i % 10 === 0;

        allItems.push({
            id: `goal-${idCounter++}`,
            title: goalText,
            description: `A personal milestone focused on self-improvement and dedication. This goal represents a significant step in my journey.`,
            type: 'goal',
            category: "Personal Growth",
            interests: ["Self-Improvement", "Milestone", "Discipline"],
            completed: isCompleted,
            completedAt: isCompleted ? getRandomDate(2022) : undefined,
            createdAt: getRandomDate(2021),
            owner: 'Me'
        });
    }

    return allItems;
};

export const MOCK_BUCKET_ITEMS = generateLargeMockData();
