
import { BucketItem } from "../types";

// Helper to generate consistent images with variations
const getImgs = (keyword: string) => [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(keyword)}?width=800&height=600&nologo=true&seed=1`
];

// Helper to get random date between start of 2021 and now
const getRandomDate = (startYear: number = 2021) => {
    const start = new Date(`${startYear}-01-01`).getTime();
    const end = Date.now();
    return Math.floor(start + Math.random() * (end - start));
};

const PLACES = [
    { title: "Great Wall of China", loc: "China", lat: 40.4319, lng: 116.5704, cat: "Culture", tags: ["History", "Wonders"] },
    { title: "Petra", loc: "Ma'an, Jordan", lat: 30.3285, lng: 35.4444, cat: "Culture", tags: ["History", "Archaeology"] },
    { title: "Colosseum", loc: "Rome, Italy", lat: 41.8902, lng: 12.4922, cat: "Culture", tags: ["History", "Architecture"] },
    { title: "Chichen Itza", loc: "Yucatan, Mexico", lat: 20.6843, lng: -88.5678, cat: "Culture", tags: ["History", "Mayan"] },
    { title: "Machu Picchu", loc: "Cusco Region, Peru", lat: -13.1631, lng: -72.5450, cat: "Adventure", tags: ["Hiking", "History"] },
    { title: "Taj Mahal", loc: "Agra, India", lat: 27.1751, lng: 78.0421, cat: "Culture", tags: ["Architecture", "Romance"] },
    { title: "Christ the Redeemer", loc: "Rio de Janeiro, Brazil", lat: -22.9519, lng: -43.2105, cat: "Culture", tags: ["Views", "Religion"] },
    { title: "Great Pyramid of Giza", loc: "Giza, Egypt", lat: 29.9792, lng: 31.1342, cat: "Culture", tags: ["History", "Wonders"] },
    { title: "Eiffel Tower", loc: "Paris, France", lat: 48.8584, lng: 2.2945, cat: "Travel", tags: ["City", "Romance"] },
    { title: "Statue of Liberty", loc: "New York, USA", lat: 40.6892, lng: -74.0445, cat: "Culture", tags: ["Iconic", "History"] },
    { title: "Sydney Opera House", loc: "Sydney, Australia", lat: -33.8568, lng: 151.2153, cat: "Culture", tags: ["Architecture", "Art"] },
    { title: "Louvre Museum", loc: "Paris, France", lat: 48.8606, lng: 2.3376, cat: "Culture", tags: ["Art", "Museum"] },
    { title: "Acropolis of Athens", loc: "Athens, Greece", lat: 37.9715, lng: 23.7257, cat: "Culture", tags: ["History", "Ruins"] },
    { title: "Stonehenge", loc: "Wiltshire, UK", lat: 51.1789, lng: -1.8262, cat: "Culture", tags: ["History", "Mystery"] },
    { title: "Angkor Wat", loc: "Siem Reap, Cambodia", lat: 13.4125, lng: 103.8670, cat: "Culture", tags: ["History", "Spiritual"] },
    { title: "Burj Khalifa", loc: "Dubai, UAE", lat: 25.1972, lng: 55.2744, cat: "Luxury", tags: ["Architecture", "Views"] },
    { title: "Mount Everest Base Camp", loc: "Nepal", lat: 28.0026, lng: 86.8528, cat: "Adventure", tags: ["Hiking", "Nature"] },
    { title: "Grand Canyon", loc: "Arizona, USA", lat: 36.1069, lng: -112.1129, cat: "Nature", tags: ["Views", "Hiking"] },
    { title: "Great Barrier Reef", loc: "Queensland, Australia", lat: -18.2871, lng: 147.6992, cat: "Nature", tags: ["Diving", "Ocean"] },
    { title: "Victoria Falls", loc: "Zambia/Zimbabwe", lat: -17.9243, lng: 25.8572, cat: "Nature", tags: ["Waterfall", "Views"] },
    { title: "Northern Lights", loc: "Tromso, Norway", lat: 69.6492, lng: 18.9553, cat: "Nature", tags: ["Aurora", "Bucket List"] },
    { title: "Mount Fuji", loc: "Honshu, Japan", lat: 35.3606, lng: 138.7274, cat: "Nature", tags: ["Hiking", "Views"] },
    { title: "Santorini", loc: "Greece", lat: 36.3932, lng: 25.4615, cat: "Luxury", tags: ["Romance", "Views"] },
    { title: "Venice Canals", loc: "Venice, Italy", lat: 45.4408, lng: 12.3155, cat: "Travel", tags: ["Romance", "City"] },
    { title: "Serengeti National Park", loc: "Tanzania", lat: -2.1540, lng: 34.6857, cat: "Nature", tags: ["Safari", "Wildlife"] },
    { title: "Galapagos Islands", loc: "Ecuador", lat: -0.8293, lng: -91.1357, cat: "Nature", tags: ["Wildlife", "Adventure"] },
    { title: "Yellowstone National Park", loc: "Wyoming, USA", lat: 44.4280, lng: -110.5885, cat: "Nature", tags: ["Geysers", "Hiking"] },
    { title: "Iguazu Falls", loc: "Argentina/Brazil", lat: -25.6953, lng: -54.4367, cat: "Nature", tags: ["Waterfall", "Views"] },
    { title: "Salar de Uyuni", loc: "Bolivia", lat: -20.1338, lng: -67.4891, cat: "Nature", tags: ["Photography", "Unique"] },
    { title: "Ha Long Bay", loc: "Vietnam", lat: 20.9101, lng: 107.1839, cat: "Nature", tags: ["Cruising", "Views"] },
    { title: "Bora Bora", loc: "French Polynesia", lat: -16.5004, lng: -151.7415, cat: "Luxury", tags: ["Beach", "Romance"] },
    { title: "Maldives", loc: "Maldives", lat: 3.2028, lng: 73.2207, cat: "Luxury", tags: ["Beach", "Relaxation"] },
    { title: "Banff National Park", loc: "Alberta, Canada", lat: 51.4968, lng: -115.9281, cat: "Nature", tags: ["Hiking", "Mountains"] },
    { title: "Niagara Falls", loc: "Canada/USA", lat: 43.0962, lng: -79.0377, cat: "Nature", tags: ["Waterfall", "Iconic"] },
    { title: "Table Mountain", loc: "Cape Town, South Africa", lat: -33.9628, lng: 18.4098, cat: "Nature", tags: ["Views", "Hiking"] },
    { title: "Mount Kilimanjaro", loc: "Tanzania", lat: -3.0674, lng: 37.3556, cat: "Adventure", tags: ["Hiking", "Challenge"] },
    { title: "Antelope Canyon", loc: "Arizona, USA", lat: 36.8619, lng: -111.3743, cat: "Nature", tags: ["Photography", "Geology"] },
    { title: "Yosemite National Park", loc: "California, USA", lat: 37.8651, lng: -119.5383, cat: "Nature", tags: ["Hiking", "Climbing"] },
    { title: "Golden Gate Bridge", loc: "San Francisco, USA", lat: 37.8199, lng: -122.4783, cat: "Travel", tags: ["Iconic", "City"] },
    { title: "Times Square", loc: "New York, USA", lat: 40.7580, lng: -73.9855, cat: "Travel", tags: ["City", "Lights"] },
    { title: "Buckingham Palace", loc: "London, UK", lat: 51.5014, lng: -0.1419, cat: "Culture", tags: ["History", "Royalty"] },
    { title: "Big Ben", loc: "London, UK", lat: 51.5007, lng: -0.1246, cat: "Culture", tags: ["Iconic", "History"] },
    { title: "Edinburgh Castle", loc: "Edinburgh, Scotland", lat: 55.9486, lng: -3.1999, cat: "Culture", tags: ["History", "Castle"] },
    { title: "Sagrada Familia", loc: "Barcelona, Spain", lat: 41.4036, lng: 2.1744, cat: "Culture", tags: ["Architecture", "Art"] },
    { title: "Alhambra", loc: "Granada, Spain", lat: 37.1760, lng: -3.5881, cat: "Culture", tags: ["History", "Architecture"] },
    { title: "Neuschwanstein Castle", loc: "Germany", lat: 47.5576, lng: 10.7498, cat: "Culture", tags: ["Fairytale", "Castle"] },
    { title: "Leaning Tower of Pisa", loc: "Pisa, Italy", lat: 43.7229, lng: 10.3966, cat: "Travel", tags: ["Iconic", "Photo"] },
    { title: "Vatican City", loc: "Vatican", lat: 41.9029, lng: 12.4534, cat: "Culture", tags: ["Religion", "Art"] },
    { title: "Trevi Fountain", loc: "Rome, Italy", lat: 41.9009, lng: 12.4833, cat: "Culture", tags: ["Art", "Romance"] },
    { title: "St. Basil's Cathedral", loc: "Moscow, Russia", lat: 55.7525, lng: 37.6231, cat: "Culture", tags: ["Architecture", "Iconic"] },
    { title: "Hagia Sophia", loc: "Istanbul, Turkey", lat: 41.0086, lng: 28.9802, cat: "Culture", tags: ["History", "Architecture"] },
    { title: "Cappadocia", loc: "Turkey", lat: 38.6431, lng: 34.8289, cat: "Adventure", tags: ["Hot Air Balloon", "Views"] },
    { title: "Sheikh Zayed Grand Mosque", loc: "Abu Dhabi, UAE", lat: 24.4128, lng: 54.4750, cat: "Culture", tags: ["Architecture", "Spiritual"] },
    { title: "Western Wall", loc: "Jerusalem", lat: 31.7767, lng: 35.2345, cat: "Culture", tags: ["Religion", "History"] },
    { title: "Dead Sea", loc: "Jordan/Israel", lat: 31.5590, lng: 35.4732, cat: "Nature", tags: ["Wellness", "Unique"] },
    { title: "Forbidden City", loc: "Beijing, China", lat: 39.9163, lng: 116.3972, cat: "Culture", tags: ["History", "Palace"] },
    { title: "Fushimi Inari Shrine", loc: "Kyoto, Japan", lat: 34.9671, lng: 135.7727, cat: "Culture", tags: ["Spiritual", "Hiking"] },
    { title: "Tokyo Tower", loc: "Tokyo, Japan", lat: 35.6586, lng: 139.7454, cat: "Travel", tags: ["City", "Views"] },
    { title: "Gardens by the Bay", loc: "Singapore", lat: 1.2816, lng: 103.8636, cat: "Nature", tags: ["Futuristic", "Gardens"] },
    { title: "Petronas Towers", loc: "Kuala Lumpur, Malaysia", lat: 3.1579, lng: 101.7123, cat: "Travel", tags: ["Architecture", "City"] },
    { title: "Ubud, Bali", loc: "Indonesia", lat: -8.5069, lng: 115.2625, cat: "Relaxation", tags: ["Nature", "Spiritual"] },
    { title: "Komodo Island", loc: "Indonesia", lat: -8.5568, lng: 119.4344, cat: "Adventure", tags: ["Wildlife", "Nature"] },
    { title: "Uluru", loc: "Australia", lat: -25.3444, lng: 131.0369, cat: "Nature", tags: ["Spiritual", "Desert"] },
    { title: "Milford Sound", loc: "New Zealand", lat: -44.6716, lng: 167.9256, cat: "Nature", tags: ["Fjord", "Scenery"] },
    { title: "Hobbiton", loc: "Matamata, New Zealand", lat: -37.8721, lng: 175.6829, cat: "Travel", tags: ["Movie", "Fantasy"] },
    { title: "Easter Island", loc: "Chile", lat: -27.1127, lng: -109.3497, cat: "Culture", tags: ["Mystery", "History"] },
    { title: "Torres del Paine", loc: "Chile", lat: -50.9423, lng: -73.4068, cat: "Adventure", tags: ["Hiking", "Patagonia"] },
    { title: "Perito Moreno Glacier", loc: "Argentina", lat: -50.4692, lng: -73.0299, cat: "Nature", tags: ["Ice", "Views"] },
    { title: "Metropolitan Museum of Art", loc: "New York, USA", lat: 40.7794, lng: -73.9632, cat: "Culture", tags: ["Art", "Museum"] },
    { title: "Empire State Building", loc: "New York, USA", lat: 40.7484, lng: -73.9857, cat: "Travel", tags: ["City", "Views"] },
    { title: "White House", loc: "Washington DC, USA", lat: 38.8977, lng: -77.0365, cat: "Culture", tags: ["History", "Politics"] },
    { title: "Mount Rushmore", loc: "South Dakota, USA", lat: 43.8791, lng: -103.4591, cat: "Culture", tags: ["History", "Monument"] },
    { title: "Disney World", loc: "Orlando, USA", lat: 28.3852, lng: -81.5639, cat: "Travel", tags: ["Fun", "Family"] },
    { title: "Universal Studios", loc: "Orlando, USA", lat: 28.4743, lng: -81.4678, cat: "Travel", tags: ["Fun", "Movies"] },
    { title: "Hollywood Sign", loc: "Los Angeles, USA", lat: 34.1341, lng: -118.3215, cat: "Travel", tags: ["Iconic", "Photo"] },
    { title: "Las Vegas Strip", loc: "Nevada, USA", lat: 36.1147, lng: -115.1728, cat: "Travel", tags: ["Nightlife", "Entertainment"] },
    { title: "Zion National Park", loc: "Utah, USA", lat: 37.2982, lng: -113.0263, cat: "Nature", tags: ["Hiking", "Canyons"] },
    { title: "Bryce Canyon", loc: "Utah, USA", lat: 37.5930, lng: -112.1871, cat: "Nature", tags: ["Geology", "Views"] },
    { title: "Arches National Park", loc: "Utah, USA", lat: 38.7331, lng: -109.5925, cat: "Nature", tags: ["Geology", "Hiking"] },
    { title: "Monument Valley", loc: "Arizona/Utah", lat: 36.9913, lng: -110.1939, cat: "Nature", tags: ["Western", "Views"] },
    { title: "Lake Louise", loc: "Alberta, Canada", lat: 51.4163, lng: -116.2215, cat: "Nature", tags: ["Lake", "Mountains"] },
    { title: "CN Tower", loc: "Toronto, Canada", lat: 43.6426, lng: -79.3871, cat: "Travel", tags: ["City", "Views"] },
    { title: "Chateau Frontenac", loc: "Quebec City, Canada", lat: 46.8119, lng: -71.2050, cat: "Culture", tags: ["History", "Hotel"] },
    { title: "Tulum Ruins", loc: "Mexico", lat: 20.2148, lng: -87.4290, cat: "Culture", tags: ["Mayan", "Beach"] },
    { title: "Teotihuacan", loc: "Mexico", lat: 19.6925, lng: -98.8437, cat: "Culture", tags: ["History", "Pyramids"] },
    { title: "Cusco", loc: "Peru", lat: -13.5320, lng: -71.9675, cat: "Culture", tags: ["History", "Inca"] },
    { title: "Sugerloaf Mountain", loc: "Rio de Janeiro, Brazil", lat: -22.9499, lng: -43.1559, cat: "Nature", tags: ["Views", "Cable Car"] },
    { title: "Copacabana Beach", loc: "Rio de Janeiro, Brazil", lat: -22.9711, lng: -43.1825, cat: "Travel", tags: ["Beach", "Party"] },
    { title: "Angel Falls", loc: "Venezuela", lat: 5.9675, lng: -62.5356, cat: "Nature", tags: ["Waterfall", "Adventure"] },
    { title: "Atacama Desert", loc: "Chile", lat: -23.5000, lng: -68.0000, cat: "Nature", tags: ["Desert", "Stars"] },
    { title: "Cartagena Old Town", loc: "Colombia", lat: 10.4222, lng: -75.5477, cat: "Culture", tags: ["History", "Colonial"] },
    { title: "Panama Canal", loc: "Panama", lat: 9.0768, lng: -79.6961, cat: "Culture", tags: ["Engineering", "History"] },
    { title: "Blue Lagoon", loc: "Iceland", lat: 63.8804, lng: -22.4495, cat: "Relaxation", tags: ["Spa", "Geothermal"] },
    { title: "Gullfoss Waterfall", loc: "Iceland", lat: 64.3271, lng: -20.1199, cat: "Nature", tags: ["Waterfall", "Golden Circle"] },
    { title: "Mont Saint-Michel", loc: "France", lat: 48.6360, lng: -1.5115, cat: "Culture", tags: ["History", "Abbey"] },
    { title: "Palace of Versailles", loc: "France", lat: 48.8049, lng: 2.1204, cat: "Culture", tags: ["History", "Royal"] },
    { title: "Matterhorn", loc: "Switzerland", lat: 45.9766, lng: 7.6585, cat: "Nature", tags: ["Mountains", "Skiing"] },
    { title: "Jungfraujoch", loc: "Switzerland", lat: 46.5475, lng: 7.9828, cat: "Nature", tags: ["Snow", "Views"] },
    { title: "Lake Como", loc: "Italy", lat: 46.0160, lng: 9.2572, cat: "Luxury", tags: ["Lake", "Romance"] },
    { title: "Pompeii", loc: "Italy", lat: 40.7486, lng: 14.4989, cat: "Culture", tags: ["History", "Ruins"] },
    { title: "Plitvice Lakes", loc: "Croatia", lat: 44.8805, lng: 15.6162, cat: "Nature", tags: ["Lakes", "Waterfall"] },
    { title: "Dubrovnik Old Town", loc: "Croatia", lat: 42.6403, lng: 18.1100, cat: "Culture", tags: ["History", "GOT"] },
    { title: "Charles Bridge", loc: "Prague, Czech Republic", lat: 50.0865, lng: 14.4114, cat: "Culture", tags: ["History", "Bridge"] },
    { title: "Buda Castle", loc: "Budapest, Hungary", lat: 47.4962, lng: 19.0396, cat: "Culture", tags: ["History", "Views"] },
    { title: "Acropolis of Rhodes", loc: "Rhodes, Greece", lat: 36.4407, lng: 28.2104, cat: "Culture", tags: ["History", "Ruins"] },
    { title: "Meteora", loc: "Greece", lat: 39.7115, lng: 21.6300, cat: "Nature", tags: ["Monastery", "Rocks"] },
    { title: "Pyramids of Teotihuacan", loc: "Mexico", lat: 19.6923, lng: -98.8436, cat: "Culture", tags: ["History", "Aztec"] },
    { title: "Tikal", loc: "Guatemala", lat: 17.2220, lng: -89.6237, cat: "Adventure", tags: ["Maya", "Jungle"] },
    { title: "Blue Hole", loc: "Belize", lat: 17.3160, lng: -87.5325, cat: "Adventure", tags: ["Diving", "Ocean"] },
    { title: "Arenal Volcano", loc: "Costa Rica", lat: 10.4631, lng: -84.7032, cat: "Nature", tags: ["Volcano", "Hiking"] },
    { title: "Monteverde Cloud Forest", loc: "Costa Rica", lat: 10.3069, lng: -84.8097, cat: "Nature", tags: ["Nature", "Wildlife"] }
];

export const generateMockItems = (): BucketItem[] => {
    return PLACES.map((place, index) => {
        const isCompleted = index % 2 === 0; // 50% completed
        const completedAt = isCompleted ? getRandomDate(2021) : undefined;
        
        return {
            id: `mock-${index + 100}`,
            title: `Visit ${place.title}`,
            description: `Experience the wonder of ${place.title} in ${place.loc}. A truly unforgettable destination.`,
            locationName: place.loc,
            coordinates: { latitude: place.lat, longitude: place.lng },
            images: getImgs(place.title),
            category: place.cat,
            interests: place.tags,
            completed: isCompleted,
            completedAt: completedAt,
            createdAt: getRandomDate(2020),
            owner: 'Me',
            bestTimeToVisit: "April to October"
        };
    });
};

export const MOCK_BUCKET_ITEMS = generateMockItems();
