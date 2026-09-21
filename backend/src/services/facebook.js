const cheerio = require('cheerio');
const supabase = require('../db/supabase');

/**
 * Extract a Facebook URL from a URL string.
 * Handles formats like facebook.com/page, facebook.com/people/name, etc.
 */
function extractFacebookUrl(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('facebook.com')) {
      return url;
    }
  } catch {
    // Invalid URL
  }
  return null;
}

/**
 * Verify a Facebook page exists by checking the page URL.
 */
async function verifyFacebookPage(slug) {
  if (!slug) return false;
  const testUrl = `https://www.facebook.com/${slug}`;
  const html = await fetchWithTimeout(testUrl, 8000);
  if (!html) return false;
  try {
    const $ = cheerio.load(html);
    // Check if page title exists (indicates a real page, not 404)
    return !!$('meta[property="og:title"]').attr('content');
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
 * Try to find a Facebook URL for a lead:
 * 1. Check if website is a Facebook URL
 * 2. Scrape website for Facebook links
 */
async function findFacebookUrl(website) {
  if (!website) return null;

  // Strategy 1: The website itself is a Facebook URL
  const directUrl = extractFacebookUrl(website);
  if (directUrl && (await verifyFacebookPage(extractSlug(directUrl)))) {
    return directUrl;
  }

  // Strategy 2: Scrape the website for Facebook links
  const html = await fetchWithTimeout(website, 5000);
  if (!html) return null;

  try {
    const $ = cheerio.load(html);
    const fbLinks = $('a[href*="facebook.com"]');
    for (let i = 0; i < fbLinks.length; i++) {
      const href = $(fbLinks[i]).attr('href');
      const fbUrl = extractFacebookUrl(href);
      if (fbUrl) {
        const slug = extractSlug(fbUrl);
        if (slug && (await verifyFacebookPage(slug))) {
          return fbUrl;
        }
      }
    }
  } catch {
    // Cheerio parse failure — ignore
  }

  return null;
}

/**
 * Extract slug from Facebook URL.
 */
function extractSlug(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.replace(/^\//, '').replace(/\/$/, '');
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Generate and verify Facebook page suggestions (max 2).
 * Uses business name, no hallucination — only returns verified pages.
 */
async function generateFacebookSuggestions(businessName) {
  if (!businessName) return [];

  const cleanName = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (!cleanName) return [];

  const suggestions = [];

  // Suggestion 1: full clean name with underscores
  const full = cleanName.replace(/\s+/g, '_');
  if (full && (await verifyFacebookPage(full))) {
    suggestions.push(`https://facebook.com/${full}`);
  }

  // Suggestion 2: first two words with underscore
  const words = cleanName.split(/\s+/);
  if (words.length >= 2 && suggestions.length < 2) {
    const twoWords = words.slice(0, 2).join('_');
    if ((await verifyFacebookPage(twoWords))) {
      suggestions.push(`https://facebook.com/${twoWords}`);
    }
  }

  return suggestions.slice(0, 2);
}

/**
 * Main entry point: find Facebook URL for a lead.
 * Saves results to leads.facebook_url.
 * Never throws — returns null on any failure.
 */
async function findFacebook(leadId, website) {
  try {
    const facebookUrl = await findFacebookUrl(website);

    if (facebookUrl) {
      // Update the lead with the found Facebook URL
      await supabase
        .from('leads')
        .update({ facebook_url: facebookUrl })
        .eq('id', leadId);

      return facebookUrl;
    } else {
      // Ensure facebook_url is null in the lead record
      await supabase
        .from('leads')
        .update({ facebook_url: null })
        .eq('id', leadId);

      return null;
    }
  } catch (err) {
    console.error(`[Facebook] Error finding URL for lead ${leadId}:`, err.message);
    return null;
  }
}

module.exports = {
  findFacebook,
  findFacebookUrl,
  extractFacebookUrl,
  generateFacebookSuggestions,
  extractSlug,
};
