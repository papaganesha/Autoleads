const cheerio = require('cheerio');
const supabase = require('../db/supabase');
const googleMaps = require('./googleMaps');

/**
 * Extract an Instagram handle from a URL string.
 * Handles formats like instagram.com/handle, instagram.com/handle/, etc.
 */
function extractHandle(url) {
  if (!url) return null;
  const match = url.match(/instagram\.com\/([A-Za-z0-9_.]+)\/?/);
  if (match && match[1] && !['p', 'reel', 'stories', 'explore', 'accounts'].includes(match[1])) {
    return match[1];
  }
  return null;
}

/**
 * Truncate business name by ~10% (remove last few chars or words).
 */
function truncateName(name, percent = 10) {
  if (!name) return name;
  const maxLen = Math.max(3, Math.ceil(name.length * (1 - percent / 100)));
  return name.substring(0, maxLen).trim();
}

/**
 * Verify an Instagram account exists by checking the profile page.
 */
async function verifyInstagramHandle(handle) {
  if (!handle) return false;
  const html = await fetchWithTimeout(`https://www.instagram.com/${handle}/`, 8000);
  if (!html) return false;
  try {
    const $ = cheerio.load(html);
    return !!$('meta[property="og:description"]').attr('content');
  } catch {
    return false;
  }
}

/**
 * Fetch a URL with a timeout. Returns the response text or null on failure.
 */
async function fetchWithTimeout(url, timeoutMs) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Fetch profile HTML with full browser-equivalent headers for data-sjs access.
 * Used specifically by scrapeProfile to ensure real page (not stripped app shell) is returned.
 */
async function fetchProfileHtml(url, timeoutMs) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'sec-ch-ua': '"Chromium";v="120", "Not(A:Brand";v="24", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Consolidated fetch + parse for Instagram profile.
 * Returns { handle, ...profileData, scrape_status: 'verified' | 'unverified' | null }
 * or null if profile not found.
 * scrape_status = 'verified' when og:description found (confirmed account exists)
 * scrape_status = 'unverified' when handle extracted but profile fetch blocked
 */
async function fetchAndParseProfile(handle) {
  if (!handle) return null;

  const html = await fetchProfileHtml(`https://www.instagram.com/${handle}/`, 8000);

  // If profile fetch fails, we can't verify (but we have the handle from Maps/elsewhere)
  if (!html) {
    return {
      handle,
      verified: false,
      scrape_status: 'unverified',
      counts: null,
    };
  }

  try {
    const $ = cheerio.load(html);
    const ogDesc = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');

    // Only og:description existence confirms the profile is real
    if (!ogDesc) {
      return {
        handle,
        verified: false,
        scrape_status: 'unverified',
        counts: null,
      };
    }

    const counts = parseOgDescription(ogDesc);

    // Extract real bio from data-sjs blocks
    let bioData = null;
    let bioScrapeStatus = 'not_found';
    try {
      bioData = extractBioFromSjs($);
      if (bioData) {
        bioScrapeStatus = 'success';
      }
    } catch (bioErr) {
      console.error(`[Instagram] bio-sjs extraction failed for ${handle}:`, bioErr.message);
      bioScrapeStatus = 'error';
    }

    // Extract phone signal from bio
    const phoneSignal = bioData
      ? extractPhoneAndLinkSignal(bioData.biography, bioData.bio_links)
      : { bio_phone: null, has_bio_contact: false };

    return {
      handle,
      verified: true,
      scrape_status: 'verified',
      bio: bioData?.biography || null,
      bio_links: bioData?.bio_links || null,
      bio_phone: phoneSignal.bio_phone,
      has_bio_contact: phoneSignal.has_bio_contact,
      bio_scrape_status: bioScrapeStatus,
      profile_pic_url: ogImage || null,
      followers_count: counts ? counts.followers : 0,
      following_count: counts ? counts.following : 0,
      posts_count: counts ? counts.posts : 0,
      raw_description: ogDesc || null,
    };
  } catch (err) {
    console.error(`[Instagram] Profile parse error for ${handle}:`, err.message);
    return {
      handle,
      verified: false,
      scrape_status: 'error',
      counts: null,
    };
  }
}

/**
 * Extract Instagram/Facebook handles from review text.
 * Looks for patterns like: @handle, instagram.com/handle, "siga no insta", "follow on facebook", etc.
 * Returns array of potential handles/URLs.
 */
function extractSocialFromReviewText(text) {
  if (!text || typeof text !== 'string') return [];

  const results = [];

  // Pattern 1: @handle format
  const atMatches = text.match(/@([A-Za-z0-9_.]+)/g);
  if (atMatches) {
    atMatches.forEach(m => {
      const handle = m.substring(1);
      if (handle.length >= 3 && !['instagram', 'facebook', 'whatsapp'].includes(handle.toLowerCase())) {
        results.push({ type: 'handle', value: handle, source: 'review_text' });
      }
    });
  }

  // Pattern 2: instagram.com/handle or facebook.com/page
  const urlMatches = text.match(/(instagram|facebook)\.com\/([A-Za-z0-9_.\/\-]+)/gi);
  if (urlMatches) {
    urlMatches.forEach(m => {
      results.push({ type: 'url', value: m, source: 'review_text' });
    });
  }

  // Pattern 3: Common Portuguese phrases with handles
  const phraseMatches = text.match(/(?:siga|follow|instagram|face|facebook)[:\s]+([A-Za-z0-9_.]+)/gi);
  if (phraseMatches) {
    phraseMatches.forEach(m => {
      const handle = m.split(/[:\s]+/).pop();
      if (handle && handle.length >= 3) {
        results.push({ type: 'handle', value: handle, source: 'review_phrase' });
      }
    });
  }

  return results;
}

/**
 * Strategy 3: Extract Instagram/Facebook from Google Maps reviews.
 * Fetches place details with reviews, parses them for social handles.
 */
async function findHandleFromReviews(placeId, businessName) {
  if (!placeId) return null;

  try {
    const details = await googleMaps.getPlaceDetails(placeId);
    if (!details || !details.reviews || details.reviews.length === 0) return null;

    // Extract all potential handles from all reviews
    const allHandles = [];
    for (const review of details.reviews) {
      const text = review.originalText || review.text || '';
      const handles = extractSocialFromReviewText(text);
      allHandles.push(...handles);
    }

    if (allHandles.length === 0) return null;

    // Deduplicate and prioritize
    const uniqueHandles = [...new Set(allHandles.map(h => h.value.toLowerCase()))];

    // Try to verify each handle
    for (const handle of uniqueHandles) {
      const cleanHandle = extractHandle(`https://instagram.com/${handle}`);
      if (cleanHandle && (await verifyInstagramHandle(cleanHandle))) {
        return { handle: cleanHandle, source: 'reviews', verified: true };
      }
    }

    // If no verified handle, return the first one as unverified
    if (uniqueHandles.length > 0) {
      const firstHandle = extractHandle(`https://instagram.com/${uniqueHandles[0]}`);
      if (firstHandle) {
        return { handle: firstHandle, source: 'reviews', verified: false };
      }
    }

    return null;
  } catch (err) {
    console.error(`[Instagram] Error extracting from reviews for place ${placeId}:`, err.message);
    return null;
  }
}

/**
 * Strategy 4: Scrape Google Maps page directly for social media mentions.
 * Used as fallback if reviews fetch fails or provides no results.
 */
async function findHandleFromMapsPage(googleMapsUrl, businessName) {
  if (!googleMapsUrl) return null;

  try {
    const html = await fetchWithTimeout(googleMapsUrl, 8000);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Extract all text from the page
    const pageText = $.text();

    // Look for Instagram/Facebook patterns in page text
    const socialLinks = pageText.match(/(instagram|facebook)\.com\/[A-Za-z0-9_.\/\-]+/gi);
    if (socialLinks) {
      for (const link of socialLinks) {
        const handle = extractHandle(link);
        if (handle) {
          // Verify if possible
          const isVerified = await verifyInstagramHandle(handle);
          return { handle, source: 'maps_page', verified: isVerified };
        }
      }
    }

    return null;
  } catch (err) {
    console.error(`[Instagram] Error scraping Maps page:`, err.message);
    return null;
  }
}

/**
 * Try to find the Instagram handle for a lead (5 strategies in order):
 * 1. Check if the website IS an Instagram URL (high confidence from Maps)
 * 2. Scrape the website for Instagram links (requires verification)
 * 3. Extract from Google Maps reviews (new)
 * 4. Scrape the Google Maps page directly (fallback)
 * 5. Generate verified suggestions from business name (requires verification)
 *
 * Returns { handle, verified, source } or null
 */
async function findHandle(website, businessName = null, placeId = null, googleMapsUrl = null) {
  if (!website && !businessName && !placeId) return null;

  // Strategy 1: The website itself is an Instagram URL
  // High-confidence source (Google Maps), so trust it even if fetch is blocked
  if (website) {
    const directHandle = extractHandle(website);
    if (directHandle) {
      return { handle: directHandle, source: 'maps_url', verified: false };
    }
  }

  // Strategy 2: Scrape the website for Instagram links (lower confidence, requires verification)
  if (website) {
    const html = await fetchWithTimeout(website, 5000);
    if (html) {
      try {
        const $ = cheerio.load(html);
        const igLinks = $('a[href*="instagram.com"]');
        for (let i = 0; i < igLinks.length; i++) {
          const href = $(igLinks[i]).attr('href');
          const handle = extractHandle(href);
          if (handle && (await verifyInstagramHandle(handle))) {
            return { handle, source: 'website_scrape', verified: true };
          }
        }
      } catch {
        // Cheerio parse failure — ignore
      }
    }
  }

  // Strategy 3: Extract from Google Maps reviews
  if (placeId) {
    const fromReviews = await findHandleFromReviews(placeId, businessName);
    if (fromReviews) {
      return fromReviews;
    }
  }

  // Strategy 4: Scrape the Google Maps page directly
  if (googleMapsUrl) {
    const fromMapsPage = await findHandleFromMapsPage(googleMapsUrl, businessName);
    if (fromMapsPage) {
      return fromMapsPage;
    }
  }

  // Strategy 5: Generate and verify suggestions from business name
  if (businessName) {
    const suggestions = await generateInstagramSuggestions(businessName);
    if (suggestions.length > 0) {
      return { handle: suggestions[0], source: 'name_suggestion', verified: true };
    }
  }

  return null;
}

/**
 * Generate and verify Instagram handle suggestions (max 3).
 * Uses business name, no hallucination — only returns verified accounts.
 */
async function generateInstagramSuggestions(businessName) {
  if (!businessName) return [];

  const cleanName = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (!cleanName) return [];

  const suggestions = [];

  // Suggestion 1: full clean name
  const full = cleanName.replace(/\s+/g, '');
  if (full && (await verifyInstagramHandle(full))) {
    suggestions.push(full);
  }

  // Suggestion 2: first two words with underscore
  const words = cleanName.split(/\s+/);
  if (words.length >= 2) {
    const twoWords = words.slice(0, 2).join('_');
    if ((await verifyInstagramHandle(twoWords))) {
      suggestions.push(twoWords);
    }
  }

  // Suggestion 3: first word only
  if (words[0] && (await verifyInstagramHandle(words[0]))) {
    suggestions.push(words[0]);
  }

  return suggestions.slice(0, 3);
}

/**
 * Recursively search a JSON object for biography + bio_links at the same level.
 * Bounded depth/visit limit to prevent runaway recursion on large nested blobs.
 */
function findBiographyNode(obj, depth = 0, visited = new Set(), budget = 5000) {
  if (depth > 12 || visited.size > budget || typeof obj !== 'object' || obj === null) {
    return null;
  }

  const key = JSON.stringify(obj).slice(0, 50);
  if (visited.has(key)) return null;
  visited.add(key);

  if (obj.biography !== undefined && typeof obj.biography === 'string' &&
      obj.bio_links !== undefined && Array.isArray(obj.bio_links)) {
    return {
      biography: obj.biography,
      bio_links: obj.bio_links.map(link => ({
        title: link.title || null,
        url: link.url || link.link_url || null,
      })),
    };
  }

  for (const val of Object.values(obj)) {
    const result = findBiographyNode(val, depth + 1, visited, budget);
    if (result) return result;
  }

  return null;
}

/**
 * Extract real bio text and bio_links from Instagram's data-sjs JSON blocks.
 * Returns { biography, bio_links: [{title, url}] } or null if not found.
 */
function extractBioFromSjs($) {
  const blocks = $('script[type="application/json"][data-sjs]');

  for (let i = 0; i < blocks.length; i++) {
    const raw = $(blocks[i]).html();
    if (!raw || raw.indexOf('"biography"') === -1 || raw.indexOf('bio_links') === -1) {
      continue;
    }

    try {
      const json = JSON.parse(raw);
      const found = findBiographyNode(json);
      if (found) {
        return found;
      }
    } catch {
      // This blob isn't valid/relevant JSON — try the next one
      continue;
    }
  }

  return null;
}

/**
 * Extract phone numbers and links from bio text and bio_links array.
 * Returns { bio_phone, has_bio_contact } where bio_phone is only set if it's a distinct detection.
 */
function extractPhoneAndLinkSignal(biography, bioLinks) {
  const result = {
    bio_phone: null,
    has_bio_contact: false,
  };

  // Extract link-based phone (wa.me, tel, etc.)
  let linkPhone = null;
  if (Array.isArray(bioLinks) && bioLinks.length > 0) {
    for (const link of bioLinks) {
      const url = link.url || '';

      // wa.me/5511999999999 or wa.me/+5511999999999
      const waMatch = url.match(/wa\.me\/(\+?55)?(\d+)/);
      if (waMatch) {
        linkPhone = waMatch[2] || waMatch[1];
        break;
      }

      // api.whatsapp.com/send?phone=55...
      const apiMatch = url.match(/phone=(\d+)/);
      if (apiMatch) {
        linkPhone = apiMatch[1];
        break;
      }

      // tel:+5511999999999
      const telMatch = url.match(/tel:\+?(\d+)/);
      if (telMatch) {
        linkPhone = telMatch[1];
        break;
      }
    }

    if (linkPhone) {
      result.has_bio_contact = true;
    }
  }

  // Extract text-based phone (regex in bio)
  let textPhone = null;
  if (biography) {
    // Brazilian format: (11) 99999-9999 or +55 11 9 9999-9999, etc.
    const brMatch = biography.match(/(?:\+?55\s?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}/);
    if (brMatch) {
      textPhone = brMatch[0].replace(/\D/g, '').slice(-10); // last 10 digits (ignore country code)
    }

    // Generic international fallback
    if (!textPhone) {
      const intlMatch = biography.match(/\+\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}/);
      if (intlMatch) {
        textPhone = intlMatch[0].replace(/\D/g, '');
      }
    }

    if (textPhone) {
      result.has_bio_contact = true;
    }
  }

  // Merge logic: only store text-detected phone if it's NOT the same as link-detected
  if (textPhone && linkPhone) {
    const sameNumber = linkPhone.endsWith(textPhone.slice(-8));
    if (!sameNumber) {
      result.bio_phone = textPhone;
    }
  } else if (textPhone) {
    result.bio_phone = textPhone;
  }

  return result;
}

/**
 * Parse the Instagram og:description meta tag to extract follower/following/post counts.
 * Expected format: "123 Followers, 45 Following, 67 Posts - ..."
 * Also handles Portuguese variants and varying formats.
 */
function parseOgDescription(description) {
  if (!description) return null;

  const result = { followers: 0, following: 0, posts: 0 };

  // Match patterns like "1,234 Followers" or "1.234 Seguidores" or "1K Followers"
  const followersMatch = description.match(/([\d,.KkMm]+)\s*(?:Followers|Seguidores)/i);
  const followingMatch = description.match(/([\d,.KkMm]+)\s*(?:Following|Seguindo)/i);
  const postsMatch = description.match(/([\d,.KkMm]+)\s*(?:Posts|Publicações|publicações)/i);

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').replace(/\./g, '');
    if (/[Kk]$/.test(str)) return Math.round(parseFloat(str) * 1000);
    if (/[Mm]$/.test(str)) return Math.round(parseFloat(str) * 1000000);
    return parseInt(str, 10) || 0;
  };

  if (followersMatch) result.followers = parseCount(followersMatch[1]);
  if (followingMatch) result.following = parseCount(followingMatch[1]);
  if (postsMatch) result.posts = parseCount(postsMatch[1]);

  return result;
}

/**
 * Main entry point: find and scrape Instagram data for a lead.
 * Always saves results to the instagram_data table.
 * Never throws — returns null on any failure.
 */
async function scrapeInstagram(leadId, website, businessName = null, placeId = null, googleMapsUrl = null) {
  try {
    const foundHandle = await findHandle(website, businessName, placeId, googleMapsUrl);

    if (!foundHandle) {
      // Save a record indicating we couldn't find Instagram
      await supabase.from('instagram_data').upsert(
        {
          lead_id: leadId,
          handle: null,
          bio: null,
          bio_links: null,
          bio_phone: null,
          has_bio_contact: false,
          bio_scrape_status: 'not_found',
          followers_count: 0,
          following_count: 0,
          posts_count: 0,
          scrape_status: 'not_found',
          scraped_at: new Date().toISOString(),
        },
        { onConflict: 'lead_id' }
      );
      return null;
    }

    // For handles from Maps (unverified source), fetch profile directly
    // For other sources (website scrape, name suggestion), already verified
    const profileData = await fetchAndParseProfile(foundHandle.handle);

    if (!profileData) {
      // Save a record indicating we couldn't fetch profile data
      await supabase.from('instagram_data').upsert(
        {
          lead_id: leadId,
          handle: foundHandle.handle,
          bio: null,
          bio_links: null,
          bio_phone: null,
          has_bio_contact: false,
          bio_scrape_status: 'error',
          followers_count: 0,
          following_count: 0,
          posts_count: 0,
          scrape_status: profileData?.scrape_status || 'error',
          scraped_at: new Date().toISOString(),
        },
        { onConflict: 'lead_id' }
      );
      return null;
    }

    const record = {
      lead_id: leadId,
      handle: profileData.handle,
      bio: profileData.bio || null,
      bio_links: profileData.bio_links || null,
      bio_phone: profileData.bio_phone || null,
      has_bio_contact: profileData.has_bio_contact || false,
      bio_scrape_status: profileData.bio_scrape_status || 'error',
      profile_pic_url: profileData.profile_pic_url || null,
      followers_count: profileData.followers_count || 0,
      following_count: profileData.following_count || 0,
      posts_count: profileData.posts_count || 0,
      scrape_status: profileData.scrape_status,
      scraped_at: new Date().toISOString(),
    };

    await supabase
      .from('instagram_data')
      .upsert(record, { onConflict: 'lead_id' });

    return record;
  } catch (err) {
    console.error(`[Instagram] Error scraping for lead ${leadId}:`, err.message);

    // Save failure record
    try {
      await supabase.from('instagram_data').upsert(
        {
          lead_id: leadId,
          handle: null,
          bio: null,
          bio_links: null,
          bio_phone: null,
          has_bio_contact: false,
          bio_scrape_status: 'error',
          followers_count: 0,
          following_count: 0,
          posts_count: 0,
          scrape_status: 'error',
          error_message: err.message,
          scraped_at: new Date().toISOString(),
        },
        { onConflict: 'lead_id' }
      );
    } catch {
      // If even saving the error fails, just log it
    }

    return null;
  }
}

module.exports = {
  scrapeInstagram,
  extractHandle,
  findHandle,
  fetchAndParseProfile,
  generateInstagramSuggestions,
  truncateName,
  findHandleFromReviews,
  findHandleFromMapsPage,
  extractSocialFromReviewText,
};
