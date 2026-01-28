
import { BucketItem, Coordinates } from '../types';

/**
 * Maps the provided CSV schema to BucketItem array
 * Schema: ID,Title,Description,Location,Latitude,Longitude,Category,Status,Completed Date,Owner,Interests
 */
export const parseCsvToBucketItems = (csvText: string): BucketItem[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  // Simple CSV parser that handles basic quotes
  const parseLine = (line: string) => {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuote = !inQuote;
      else if (char === ',' && !inQuote) {
        result.push(cur.trim());
        cur = '';
      } else cur += char;
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const items: BucketItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    
    // Mapping based on column index
    // 0:ID, 1:Title, 2:Description, 3:Location, 4:Lat, 5:Long, 6:Category, 7:Status, 8:Completed Date, 9:Owner, 10:Interests
    const id = values[0] || crypto.randomUUID();
    const title = values[1] || 'Untitled';
    const description = values[2] || '';
    const locationName = values[3] || '';
    const latitude = parseFloat(values[4]);
    const longitude = parseFloat(values[5]);
    const category = values[6] || 'Other';
    const status = values[7];
    const completedDateStr = values[8];
    const owner = values[9] || 'Me';
    const interests = values[10] ? values[10].split(';').map(s => s.trim()).filter(Boolean) : [];

    const completed = status === 'Completed';
    let completedAt: number | undefined = undefined;
    if (completed && completedDateStr) {
      const d = new Date(completedDateStr);
      if (!isNaN(d.getTime())) completedAt = d.getTime();
    }

    const item: BucketItem = {
      id,
      title,
      description,
      type: 'destination', // Default type for CSV imports
      locationName,
      coordinates: (!isNaN(latitude) && !isNaN(longitude)) ? { latitude, longitude } : undefined,
      completed,
      completedAt,
      createdAt: Date.now(),
      category,
      interests,
      owner
    };
    items.push(item);
  }

  return items;
};

export const exportToCsv = (items: BucketItem[]): string => {
  const headers = ['ID', 'Title', 'Description', 'Location', 'Latitude', 'Longitude', 'Category', 'Status', 'Completed Date', 'Owner', 'Interests'];
  const rows = items.map(item => {
    return [
      `"${item.id}"`,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${(item.locationName || '').replace(/"/g, '""')}"`,
      item.coordinates?.latitude || '',
      item.coordinates?.longitude || '',
      `"${item.category || ''}"`,
      item.completed ? 'Completed' : 'Pending',
      item.completedAt ? new Date(item.completedAt).toISOString().split('T')[0] : '',
      `"${item.owner || 'Me'}"`,
      `"${(item.interests || []).join(';')}"`
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
};

export const exportToJson = (items: BucketItem[]): string => {
  return JSON.stringify(items, null, 2);
};
