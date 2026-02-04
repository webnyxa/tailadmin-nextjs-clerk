import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface ShortLink {
  id: string;
  shortCode: string;
  originalUrl: string;
  createdAt: string;
  userId?: string;
  clickCount: number;
}

// Use /tmp for Vercel (writable), otherwise use project data directory
const getDBPath = () => {
  // Check if we're on Vercel or in a serverless environment
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Use /tmp which is writable in serverless environments
    return '/tmp/shortlinks.json';
  }
  // Local development - use project directory
  return join(process.cwd(), 'data', 'shortlinks.json');
};

const DB_FILE = getDBPath();

// Ensure data directory exists (only needed for local development)
function ensureDataDir() {
  // Only create directory if not using /tmp
  if (!DB_FILE.startsWith('/tmp')) {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
  }
}

// Read database
function readDB(): ShortLink[] {
  try {
    ensureDataDir();
    if (!existsSync(DB_FILE)) {
      writeFileSync(DB_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = readFileSync(DB_FILE, 'utf-8');
    if (!data || data.trim() === '') {
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return [];
  }
}

// Write database
function writeDB(data: ShortLink[]): void {
  ensureDataDir();
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
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
function shortCodeExists(shortCode: string): boolean {
  const links = readDB();
  return links.some(link => link.shortCode === shortCode);
}

// Create a new short link
export function createShortLink(originalUrl: string, userId?: string): ShortLink {
  const links = readDB();
  
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
  } while (shortCodeExists(shortCode));

  const newLink: ShortLink = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    shortCode,
    originalUrl,
    createdAt: new Date().toISOString(),
    userId,
    clickCount: 0,
  };

  links.push(newLink);
  writeDB(links);
  return newLink;
}

// Get short link by short code
export function getShortLinkByCode(shortCode: string): ShortLink | null {
  if (!shortCode) {
    return null;
  }
  
  const links = readDB();
  // Case-insensitive lookup
  const link = links.find(l => l.shortCode.toLowerCase() === shortCode.toLowerCase());
  if (link) {
    // Increment click count
    link.clickCount++;
    writeDB(links);
  }
  return link || null;
}

// Get all short links with pagination
export function getAllShortLinks(
  page: number = 1,
  limit: number = 10,
  userId?: string
): { links: ShortLink[]; total: number; totalPages: number } {
  const links = readDB();
  
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
export function deleteShortLink(id: string, userId?: string): boolean {
  const links = readDB();
  const index = links.findIndex(l => l.id === id);
  
  if (index === -1) {
    return false;
  }

  // Check if user owns the link (if userId provided)
  if (userId && links[index].userId !== userId) {
    return false;
  }

  links.splice(index, 1);
  writeDB(links);
  return true;
}
