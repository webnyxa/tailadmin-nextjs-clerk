# Short Link System - How It Works

## 🎯 Overview

This document explains how the short link system works, from creating a short link to redirecting users to the original URL.

---

## 📝 Step-by-Step Process

### **Step 1: User Enters Long URL**

When a user visits `/shorten` and enters a long URL like:
```
https://vercel.com/azeems-projects-64e8e15b/tailadmin-nextjs-clerk/9BQc8REy5yiXagfU4kpcoY7PpWfP
```

### **Step 2: Short Code Generation**

The system generates a **unique 6-character short code** using this logic:

```typescript
function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
```

**Example Output:** `gXu8LY`

**How it works:**
1. Uses 62 possible characters (A-Z, a-z, 0-9)
2. Randomly picks 6 characters
3. Checks if code already exists (to ensure uniqueness)
4. If exists, generates a new one (up to 10 attempts)

**Why 6 characters?**
- Provides 62^6 = **56.8 billion** possible combinations
- Short enough to be memorable
- Long enough to avoid collisions

### **Step 3: Storing in Database**

The system creates a record with:

```json
{
  "id": "1770195183098yiym0pwiz",           // Unique internal ID
  "shortCode": "gXu8LY",                    // The 6-character code
  "originalUrl": "https://vercel.com/...",  // The original long URL
  "createdAt": "2026-02-04T08:53:03.098Z",  // Timestamp
  "userId": "user_38sY1spFQ9cNWupNpWIRU0fFM63", // Who created it
  "clickCount": 0                           // Track usage
}
```

**Storage:** Currently using JSON file (`data/shortlinks.json`), can be migrated to any database.

### **Step 4: Creating the Short URL**

The system combines:
- **Base URL:** `http://localhost:3000` (or your domain in production)
- **Path:** `/s/`
- **Short Code:** `gXu8LY`

**Result:** `http://localhost:3000/s/gXu8LY`

---

## 🔄 Redirect Process (When Someone Clicks the Short Link)

### **Step 1: User Visits Short Link**

User clicks or types: `http://localhost:3000/s/gXu8LY`

### **Step 2: Next.js Route Matching**

Next.js matches the URL pattern `/s/[shortCode]` where:
- `/s/` is the static path
- `[shortCode]` is the dynamic parameter = `gXu8LY`

### **Step 3: Page Component Executes**

The page at `src/app/s/[shortCode]/page.tsx` runs:

```typescript
export default async function ShortLinkRedirect({ params }) {
  // Extract shortCode from URL
  const { shortCode } = await params; // = "gXu8LY"
  
  // Look up in database
  const shortLink = getShortLinkByCode(shortCode);
  
  // Redirect to original URL
  redirect(shortLink.originalUrl);
}
```

### **Step 4: Database Lookup**

The `getShortLinkByCode()` function:

```typescript
export function getShortLinkByCode(shortCode: string): ShortLink | null {
  // 1. Read all links from database
  const links = readDB();
  
  // 2. Find link with matching shortCode
  const link = links.find(l => l.shortCode === shortCode);
  
  // 3. If found:
  if (link) {
    link.clickCount++;  // Increment click counter
    writeDB(links);    // Save updated count
    return link;        // Return the link data
  }
  
  return null; // Not found
}
```

**What happens:**
1. Reads the JSON file
2. Searches for a link where `shortCode === "gXu8LY"`
3. If found:
   - Increments `clickCount` (tracks usage)
   - Returns the link object with `originalUrl`
4. If not found: returns `null` (shows "Not Found" page)

### **Step 5: Redirect to Original URL**

If found, Next.js `redirect()` function:
- Sends HTTP 307 (Temporary Redirect) status
- Browser automatically navigates to: `https://vercel.com/azeems-projects-64e8e15b/tailadmin-nextjs-clerk/9BQc8REy5yiXagfU4kpcoY7PpWfP`

---

## 🗺️ Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User enters long URL                                     │
│    https://vercel.com/.../very/long/url                     │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. System generates unique short code                       │
│    gXu8LY (6 random characters)                             │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Store in database (JSON file)                            │
│    {                                                         │
│      shortCode: "gXu8LY",                                   │
│      originalUrl: "https://vercel.com/...",                 │
│      clickCount: 0                                          │
│    }                                                         │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Return short URL to user                                 │
│    http://localhost:3000/s/gXu8LY                           │
└─────────────────────────────────────────────────────────────┘

                    [User shares link]

┌─────────────────────────────────────────────────────────────┐
│ 5. Someone clicks: http://localhost:3000/s/gXu8LY           │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Next.js matches route: /s/[shortCode]                    │
│    Extracts: shortCode = "gXu8LY"                           │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Lookup in database                                       │
│    Search for: shortCode === "gXu8LY"                       │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Found! Increment clickCount, return originalUrl          │
│    originalUrl = "https://vercel.com/..."                    │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Browser redirects to original URL                       │
│    User lands on: https://vercel.com/...                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Concepts

### **1. Short Code = Unique Identifier**

The short code (`gXu8LY`) is like a **key** that maps to the original URL:
- **Short Code:** `gXu8LY` → **Original URL:** `https://vercel.com/...`
- Similar to how a library uses a book ID to find the actual book

### **2. Database as Lookup Table**

Think of the database as a **phone book**:
- **Name (shortCode):** `gXu8LY`
- **Phone Number (originalUrl):** `https://vercel.com/...`

When you know the name, you can look up the phone number.

### **3. Why It's Fast**

- **No computation needed** - just a simple lookup
- **Direct mapping** - shortCode directly points to originalUrl
- **No encryption/decryption** - it's just a random string

### **4. Uniqueness Guarantee**

Before creating a new short code:
1. Generate random code
2. Check if it exists in database
3. If exists → generate new one
4. If not exists → use it

This ensures **no two links have the same short code**.

---

## 📊 Data Structure Example

```json
[
  {
    "id": "1770195183098yiym0pwiz",        // Internal unique ID
    "shortCode": "gXu8LY",                  // What users see in URL
    "originalUrl": "https://vercel.com/...", // Where it redirects
    "createdAt": "2026-02-04T08:53:03.098Z",
    "userId": "user_38sY1spFQ9cNWupNpWIRU0fFM63",
    "clickCount": 2                         // How many times clicked
  }
]
```

**Mapping:**
- **Input:** `/s/gXu8LY` (short code from URL)
- **Lookup:** Find object where `shortCode === "gXu8LY"`
- **Output:** `originalUrl` from that object
- **Redirect:** Browser goes to `originalUrl`

---

## 🛠️ Technical Details

### **File Structure:**
```
src/
├── lib/
│   └── db.ts                    # Database functions (read/write JSON)
├── app/
│   ├── api/
│   │   └── short-links/
│   │       └── route.ts        # API: Create new short link
│   └── s/
│       └── [shortCode]/
│           └── page.tsx        # Page: Handle redirect
```

### **Functions:**

1. **`createShortLink(originalUrl, userId)`**
   - Generates short code
   - Stores in database
   - Returns short link object

2. **`getShortLinkByCode(shortCode)`**
   - Searches database
   - Increments click count
   - Returns link or null

3. **`generateShortCode()`**
   - Creates random 6-character string
   - Ensures uniqueness

---

## ✅ Summary

**Creating a Short Link:**
1. User enters long URL
2. System generates unique 6-character code
3. Stores mapping: `shortCode → originalUrl`
4. Returns short URL: `domain.com/s/shortCode`

**Using a Short Link:**
1. User visits `domain.com/s/shortCode`
2. System extracts `shortCode` from URL
3. Looks up `shortCode` in database
4. Finds matching `originalUrl`
5. Browser redirects to `originalUrl`

**It's like a translator:**
- **Input:** Short code (foreign language)
- **Dictionary:** Database (translation table)
- **Output:** Original URL (your language)
