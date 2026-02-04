import { Redis } from '@upstash/redis';

export interface ShortLink {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: string;
  userId?: string;
  clickCount: number;
}

// Initialize Redis client
// Uses environment variables from Vercel: REDIS_URL or KV_REST_API_URL + KV_REST_API_TOKEN
const getRedisClient = () => {
  // Check if we have Redis environment variables (Vercel/Upstash)
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    // Use KV_REST_API_URL and KV_REST_API_TOKEN (Vercel naming for Upstash)
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  // Fallback: try REDIS_URL if available
  if (process.env.REDIS_URL && process.env.KV_REST_API_TOKEN) {
    return new Redis({
      url: process.env.REDIS_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return null;
};

const redis = getRedisClient();
const DB_KEY = 'shortlinks:all'; // Redis key to store all short links

// Check if Redis is available
const isRedisAvailable = () => redis !== null;

// Read database from Redis
async function readDB(): Promise<ShortLink[]> {
  if (isRedisAvailable()) {
    try {
      const data = await redis!.get<ShortLink[]>(DB_KEY);
      return data || [];
    } catch (error) {
      console.error('Error reading from Redis:', error);
      return [];
    }
  }
  // Fallback: return empty array if Redis not available
  console.warn('Redis not available, returning empty array');
  return [];
}

// Write database to Redis
async function writeDB(data: ShortLink[]): Promise<void> {
  if (isRedisAvailable()) {
    try {
      await redis!.set(DB_KEY, data);
    } catch (error) {
      console.error('Error writing to Redis:', error);
    }
  } else {
    console.warn('Redis not available, cannot write data');
  }
}

// Generate a random short code
function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Check if short code exists
async function shortCodeExists(shortCode: string): Promise<boolean> {
  const links = await readDB();
  return links.some(link => link.shortCode === shortCode);
}

// Create a new short link
export async function createShortLink(originalUrl: string, userId?: string): Promise<ShortLink> {
  const links = await readDB();
  
  // Validate URL
  try {
    new URL(originalUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  // Generate unique short code
  let shortCode: string;
  let attempts = 0;
  do {
    shortCode = generateShortCode();
    attempts++;
    if (attempts > 10) {
      throw new Error('Failed to generate unique short code');
    }
  } while (await shortCodeExists(shortCode));

  const newLink: ShortLink = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    shortCode,
    originalUrl,
    createdAt: new Date().toISOString(),
    userId,
    clickCount: 0,
  };

  links.push(newLink);
  await writeDB(links);
  return newLink;
}

// Get short link by short code
export async function getShortLinkByCode(shortCode: string): Promise<ShortLink | null> {
  if (!shortCode) {
    return null;
  }
  
  const links = await readDB();
  // Case-insensitive lookup
  const link = links.find(l => l.shortCode.toLowerCase() === shortCode.toLowerCase());
  if (link) {
    // Increment click count
    link.clickCount++;
    await writeDB(links);
  }
  return link || null;
}

// Get all short links with pagination
export async function getAllShortLinks(
  page: number = 1,
  limit: number = 10,
  userId?: string
): Promise<{ links: ShortLink[]; total: number; totalPages: number }> {
  const links = await readDB();
  
  // Filter by user if userId provided
  let filteredLinks = userId ? links.filter(l => l.userId === userId) : links;
  
  // Sort by creation date (newest first)
  filteredLinks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const total = filteredLinks.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedLinks = filteredLinks.slice(startIndex, endIndex);

  return {
    links: paginatedLinks,
    total,
    totalPages,
  };
}

// Delete a short link
export async function deleteShortLink(id: string, userId?: string): Promise<boolean> {
  const links = await readDB();
  const index = links.findIndex(l => l.id === id);
  
  if (index === -1) {
    return false;
  }

  // Check if user owns the link (if userId provided)
  if (userId && links[index].userId !== userId) {
    return false;
  }

  links.splice(index, 1);
  await writeDB(links);
  return true;
}
