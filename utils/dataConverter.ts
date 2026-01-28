
import { BucketItem, Coordinates } from '../types';

/**
 * Robust CSV Parser for Just Knock It
 * Maps Schema: ID,Title,Description,Location,Latitude,Longitude,Category,Status,Completed Date,Owner,Interests
 */
export const parseCsvToBucketItems = (csvText: string): BucketItem[] => {
  if (!csvText) return [];

  // Remove BOM and normalize line endings
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  
  const lines: string[] = [];
  let inQuotes = false;
  let lastPos = 0;

  // Split text into lines while respecting quoted newlines
  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    if (char === '"') inQuotes = !inQuotes;
    if (!inQuotes) {
      if (char === '\n') {
        lines.push(cleanText.substring(lastPos, i));
        lastPos = i + 1;
      } else if (char === '\r') {
        lines.push(cleanText.substring(lastPos, i));
        if (cleanText[i + 1] === '\n') i++; 
        lastPos = i + 1;
      }
    }
  }
  if (lastPos < cleanText.length) {
    lines.push(cleanText.substring(lastPos));
  }

  if (lines.length < 2) return [];

  const parseCsvLine = (line: string): string[] => {
    const fields: string[] = [];
    let currentField = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuote && nextChar === '"') {
          currentField += '"';
          i++; 
        } else {
          inQuote = !inQuote;
        }
      } else if (char === ',' && !inQuote) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());
    return fields;
  };

  const bucketItems: BucketItem[] = [];
  const now = Date.now();
  
  // Skip header (i=0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCsvLine(line);
    
    // Mapping 11 columns:
    // 0:ID, 1:Title, 2:Description, 3:Location, 4:Lat, 5:Long, 6:Category, 7:Status, 8:Date, 9:Owner, 10:Interests
    
    const id = values[0] || crypto.randomUUID();
    const title = values[1] || 'Untitled Dream';
    const description = values[2] || '';
    const locationName = values[3] || '';
    
    const latStr = (values[4] || '').replace(/[^\d.-]/g, '');
    const lngStr = (values[5] || '').replace(/[^\d.-]/g, '');
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);
    
    const category = values[6] || 'Travel';
    const status = (values[7] || '').toLowerCase();
    const completedDateStr = values[8];
    const owner = values[9] || 'Me';
    const interests = values[10] ? values[10].split(';').map(s => s.trim()).filter(Boolean) : [];

    const isCompleted = status === 'completed';
    let completedAt: number | undefined = undefined;
    
    if (isCompleted && completedDateStr) {
      const d = new Date(completedDateStr);
      if (!isNaN(d.getTime())) {
        completedAt = d.getTime();
      }
    }

    const hasValidCoords = !isNaN(latitude) && !isNaN(longitude) && (latitude !== 0 || longitude !== 0);

    const item: BucketItem = {
      id,
      title,
      description,
      type: hasValidCoords ? 'destination' : 'goal',
      locationName: locationName || undefined,
      coordinates: hasValidCoords ? { latitude, longitude } : undefined,
      completed: isCompleted,
      completedAt,
      // Decrement createdAt to maintain file order when sorting by date descending
      createdAt: now - i, 
      category,
      interests,
      owner
    };
    
    bucketItems.push(item);
  }

  return bucketItems;
};

export const exportToCsv = (items: BucketItem[]): string => {
  const headers = ['ID', 'Title', 'Description', 'Location', 'Latitude', 'Longitude', 'Category', 'Status', 'Completed Date', 'Owner', 'Interests'];
  const rows = items.map(item => {
    const esc = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    return [
      esc(item.id),
      esc(item.title),
      esc(item.description),
      esc(item.locationName || ''),
      item.coordinates?.latitude || '',
      item.coordinates?.longitude || '',
      esc(item.category || ''),
      item.completed ? 'Completed' : 'Pending',
      item.completedAt ? new Date(item.completedAt).toISOString().split('T')[0] : '',
      esc(item.owner || 'Me'),
      esc((item.interests || []).join(';'))
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
};

export const exportToJson = (items: BucketItem[]): string => {
  return JSON.stringify(items, null, 2);
};
