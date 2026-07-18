import { Tool, ToolSchema } from '../Tool';

// ──────────────────────────────────────────────────────────────────────────────
// Search Result Safety
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Prompt injection patterns that may appear in web search results.
 * These are scanned deterministically (no LLM needed) before the results
 * are passed back to the agent's reasoning loop.
 */
const INJECTION_SCAN_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /ignore\s+(your\s+)?system\s+prompt/i,
  /forget\s+(all\s+)?(previous\s+)?instructions?/i,
  /disregard\s+(all\s+)?(prior\s+)?instructions?/i,
  /you\s+are\s+now\s+(a\s+)?(different|new|another)/i,
  /act\s+as\s+(if\s+you\s+are|a\s+new)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /bypass\s+(approval|security|safety|permission)/i,
  /system\s+(directive|override|command)\s*:/i,
  /new\s+instructions?\s*:/i,
  /your\s+(true|real|actual)\s+(purpose|goal|mission)\s+is/i,
];

/** Placeholder shown to the LLM when a result snippet is flagged. */
const FILTERED_PLACEHOLDER = '[Content filtered: potential prompt injection detected]';

/** Maximum length for a single result's content snippet. */
const MAX_SNIPPET_CHARS = 2_000;

/**
 * Scans a text snippet for prompt injection patterns.
 * Returns the original text if safe, or FILTERED_PLACEHOLDER if flagged.
 */
function sanitizeSnippet(text: string): string {
  if (!text) return text;
  if (INJECTION_SCAN_PATTERNS.some(p => p.test(text))) {
    return FILTERED_PLACEHOLDER;
  }
  // Truncate very long snippets to prevent context flooding
  if (text.length > MAX_SNIPPET_CHARS) {
    return text.substring(0, MAX_SNIPPET_CHARS) + '…';
  }
  return text;
}

/**
 * Validates that a URL is a safe https:// URL (not javascript:, data:, etc.)
 */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Region Detection
// ──────────────────────────────────────────────────────────────────────────────

function getRegionFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return 'wt-wt';
    
    const tzLower = tz.toLowerCase();
    if (tzLower.includes('kolkata') || tzLower.includes('calcutta')) return 'in-en';
    if (tzLower.includes('america/')) return 'us-en';
    if (tzLower.includes('london')) return 'uk-en';
    if (tzLower.includes('australia/')) return 'au-en';
    if (tzLower.includes('europe/berlin')) return 'de-de';
    if (tzLower.includes('europe/paris')) return 'fr-fr';
    if (tzLower.includes('canada')) return 'ca-en';
    
    return 'wt-wt';
  } catch (e) {
    return 'wt-wt';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// WebSearchTool
// ──────────────────────────────────────────────────────────────────────────────

export class WebSearchTool extends Tool {
  readonly name = 'web_search';
  readonly description =
    'Searches the web for current information, news, and facts using SearXNG. Use this when you need external knowledge that you do not already possess.';
  readonly requiresApproval = false; // Read-only

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query.' },
    },
    required: ['query'],
  };

  async execute(args: { query: string }): Promise<any> {
    if (!args || typeof args.query !== 'string' || args.query.trim() === '') {
      return { success: false, error: 'You must provide a valid "query" argument.' };
    }

    const searxInstances = [
      process.env.SEARXNG_URL,
      'https://search.ononoki.org',
      'https://searx.tiekoetter.com',
      'https://searx.be',
      'https://searx.work'
    ].filter(Boolean) as string[];

    let results: any[] = [];
    let searchSuccess = false;
    let successSource = '';

    // 1. Try multiple SearXNG instances
    for (const searxUrl of searxInstances) {
      try {
        const searchUrl = `${searxUrl}/search?q=${encodeURIComponent(args.query)}&format=json`;
        console.log(`[WebSearchTool] Attempting SearXNG instance: ${searxUrl}`);
        const response = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (!response.ok) {
          console.warn(`[WebSearchTool] SearXNG instance ${searxUrl} failed with status: ${response.status}`);
          continue;
        }

        const data = await response.json();
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          console.log(`[WebSearchTool] Success! Extracted ${data.results.length} results from ${searxUrl}`);
          results = data.results
            .slice(0, 10)
            .filter((r: any) => isSafeUrl(r.url || ''))
            .map((r: any) => ({
              title: sanitizeSnippet(r.title || ''),
              url: r.url || '',
              content: sanitizeSnippet(r.content || r.snippet || ''),
              domain: r.parsed_url?.[1] || new URL(r.url).hostname,
            }));
          searchSuccess = true;
          successSource = 'searxng';
          break;
        } else {
          console.warn(`[WebSearchTool] SearXNG instance ${searxUrl} returned empty or invalid results structure.`);
        }
      } catch (err: any) {
        console.error(`[WebSearchTool] Error querying SearXNG instance ${searxUrl}:`, err.message || err);
      }
    }

    // 2. DuckDuckGo Lite Fallback if SearXNG failed
    if (!searchSuccess) {
      console.log(`[WebSearchTool] All SearXNG instances failed. Falling back to DDG Lite.`);
      try {
        const region = getRegionFromTimezone();
        const bodyPayload = `q=${encodeURIComponent(args.query)}&kl=${region}`;

        const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: bodyPayload
        });

        if (ddgRes.ok) {
          const html = await ddgRes.text();
          const htmlRegex = /<a rel="nofollow" href="([^"]+)"[^>]*class='result-link'[^>]*>([\s\S]*?)<\/a>[\s\S]*?<td class='result-snippet'>([\s\S]*?)<\/td>/g;
          let match;
          while ((match = htmlRegex.exec(html)) !== null && results.length < 10) {
            let url = match[1];
            if (url.includes('duckduckgo.com/y.js')) continue; // Skip sponsored
            if (url.startsWith('//')) url = 'https:' + url;
            if (!isSafeUrl(url)) continue;

            const title = match[2].replace(/<[^>]+>/g, '').trim();
            const snippet = match[3].replace(/<[^>]+>/g, '').trim();
            let domain = '';
            try { domain = new URL(url).hostname; } catch (_e) {}

            results.push({
              title: sanitizeSnippet(title),
              url,
              content: sanitizeSnippet(snippet),
              domain,
            });
          }

          if (results.length > 0) {
            console.log(`[WebSearchTool] Success! Extracted ${results.length} results from DDG Lite.`);
            searchSuccess = true;
            successSource = 'ddglite';
          } else {
             console.warn(`[WebSearchTool] DDG Lite returned 0 results or Captcha blocked.`);
          }
        } else {
           console.warn(`[WebSearchTool] DDG Lite failed with status: ${ddgRes.status}`);
        }
      } catch (err: any) {
        console.error(`[WebSearchTool] Error querying DDG Lite:`, err.message || err);
      }
    }

    // 3. Wikipedia Fallback if DDG Lite failed
    if (!searchSuccess) {
      console.log(`[WebSearchTool] DDG Lite failed. Falling back to Wikipedia API.`);
      try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(args.query)}&utf8=&format=json`;
        const wikiRes = await fetch(wikiUrl);
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData.query?.search && wikiData.query.search.length > 0) {
            console.log(`[WebSearchTool] Wikipedia API success. Found ${wikiData.query.search.length} results.`);
            results = wikiData.query.search.slice(0, 5).map((r: any) => ({
              title: sanitizeSnippet(r.title),
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`,
              content: sanitizeSnippet(r.snippet.replace(/<[^>]+>/g, '')),
              domain: 'en.wikipedia.org',
            }));
            searchSuccess = true;
            successSource = 'wikipedia';
          } else {
             console.warn(`[WebSearchTool] Wikipedia API returned 0 results for query.`);
          }
        } else {
           console.warn(`[WebSearchTool] Wikipedia API failed with status: ${wikiRes.status}`);
        }
      } catch (err: any) {
        console.error(`[WebSearchTool] Error querying Wikipedia API:`, err.message || err);
      }
    }
    if (searchSuccess && results.length > 0) {
      if (successSource === 'wikipedia') {
        // If we hit wikipedia fallback, insert a warning source to instruct the AI
        results.unshift({
          title: "SYSTEM WARNING: LIVE SEARCH OFFLINE",
          url: "https://system.local",
          content: "Live web search is blocked. These are fallback encyclopedia results. DO NOT retry the web_search tool for this query. Tell the user you cannot fetch real-time live prices right now.",
          domain: "system.local"
        });
      }
      return { success: true, sources: results };
    }

    // 3. Absolute Failure
    return {
      success: false,
      error: 'CRITICAL ERROR: Web search returned 0 results from all fallbacks. You MUST tell the user that you cannot fetch live data right now. DO NOT guess or hallucinate the answer. Admit that you do not have the real-time data.'
    };
  }
}
