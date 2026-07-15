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

    try {
      const searxngUrl = process.env.SEARXNG_URL || 'https://search.ononoki.org';
      const searchUrl = `${searxngUrl}/search?q=${encodeURIComponent(args.query)}&format=json`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.results || !Array.isArray(data.results)) {
        return { success: false, error: 'Invalid response format from SearXNG' };
      }

      const topResults = data.results
        .slice(0, 10)
        .filter((r: any) => isSafeUrl(r.url || ''))  // Drop unsafe URLs
        .map((r: any) => {
          const rawContent = r.content || r.snippet || '';
          return {
            title: sanitizeSnippet(r.title || ''),
            url: r.url || '',
            content: sanitizeSnippet(rawContent),
            domain: r.parsed_url?.[1] || '',
          };
        });

      // Fallback domain extraction
      topResults.forEach((r: any) => {
        if (!r.domain && r.url) {
          try {
            r.domain = new URL(r.url).hostname;
          } catch (_e) {}
        }
      });

      return {
        success: true,
        sources: topResults,
      };
    } catch (error: any) {
      // Fallback to DuckDuckGo Lite if SearXNG fails (e.g. 403 Forbidden)
      try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;
        const ddgRes = await fetch(ddgUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (!ddgRes.ok) {
          return {
            success: false,
            error: `SearXNG failed (${error.message}) and DDG fallback failed (${ddgRes.status})`,
          };
        }

        const html = await ddgRes.text();
        const results: any[] = [];

        // Improved regex scraping for DDG Lite
        const resultRegex =
          /<a [^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>.*?<a [^>]*class="result__snippet[^>]*>(.*?)<\/a>/gs;
        let match;
        let count = 0;

        while ((match = resultRegex.exec(html)) !== null && count < 10) {
          let url = match[1];
          // Clean DDG redirect URL if present
          if (url.startsWith('//duckduckgo.com/l/?uddg=')) {
            url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
          }

          // Skip unsafe URLs
          if (!isSafeUrl(url)) continue;

          const title = match[2].replace(/<[^>]+>/g, '').trim();
          const snippet = match[3].replace(/<[^>]+>/g, '').trim();
          let domain = '';
          try {
            domain = new URL(url).hostname;
          } catch (_e) {}

          if (url && title) {
            results.push({
              title: sanitizeSnippet(title),
              url,
              content: sanitizeSnippet(snippet),
              domain,
            });
            count++;
          }
        }

        if (results.length > 0) {
          return { success: true, sources: results };
        }
        return { success: false, error: 'No results found via fallback.' };
      } catch (fallbackError: any) {
        return {
          success: false,
          error: `SearXNG failed: ${error.message}. Fallback also failed: ${fallbackError.message}`,
        };
      }
    }
  }
}
