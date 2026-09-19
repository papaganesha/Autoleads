const cheerio = require('cheerio');
const supabase = require('../db/supabase');

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
 * Try to find the Instagram handle for a lead:
 * 1. Check if the website IS an Instagram URL
 * 2. Scrape the website HTML for Instagram links
 */
async function findHandle(website) {
  if (!website) return null;

  // Strategy 1: The website itself is an Instagram URL
  const directHandle = extractHandle(website);
  if (directHandle) return directHandle;

  // Strategy 2: Scrape the website for Instagram links
  const html = await fetchWithTimeout(website, 5000);
  if (!html) return null;

  try {
    const $ = cheerio.load(html);
    const igLinks = $('a[href*="instagram.com"]');
    for (let i = 0; i < igLinks.length; i++) {
      const href = $(igLinks[i]).attr('href');
      const handle = extractHandle(href);
      if (handle) return handle;
    }
  } catch {
    // Cheerio parse failure — ignore
  }

  return null;
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
 * Scrape basic Instagram profile data for a given handle.
 * Fetches the profile page and parses og:description for counts.
 */
async function scrapeProfile(handle) {
  if (!handle) return null;

  const html = await fetchWithTimeout(`https://www.instagram.com/${handle}/`, 8000);
  if (!html) return null;

  try {
    const $ = cheerio.load(html);
    const ogDesc = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content');

    const counts = parseOgDescription(ogDesc);

    return {
      handle,
      bio: ogTitle || null,
      profile_pic_url: ogImage || null,
      followers_count: counts ? counts.followers : 0,
      following_count: counts ? counts.following : 0,
      posts_count: counts ? counts.posts : 0,
      raw_description: ogDesc || null,
    };
  } catch {
    return null;
  }
}

/**
 * Main entry point: find and scrape Instagram data for a lead.
 * Always saves results to the instagram_data table.
 * Never throws — returns null on any failure.
 */
async function scrapeInstagram(leadId, website) {
  try {
    const handle = await findHandle(website);

    if (!handle) {
      // Save a record indicating we couldn't find Instagram
      await supabase.from('instagram_data').upsert(
        {
          lead_id: leadId,
          handle: null,
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

    const profile = await scrapeProfile(handle);

    const record = {
      lead_id: leadId,
      handle: handle,
      bio: profile ? profile.bio : null,
      profile_pic_url: profile ? profile.profile_pic_url : null,
      followers_count: profile ? profile.followers_count : 0,
      following_count: profile ? profile.following_count : 0,
      posts_count: profile ? profile.posts_count : 0,
      scrape_status: profile ? 'success' : 'failed',
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
  scrapeProfile,
};
