import { Tool, ToolSchema } from '../Tool';

export class WebSearchTool extends Tool {
  readonly name = 'web_search';
  readonly description = 'Searches the web for current information, news, and facts using SearXNG. Use this when you need external knowledge that you do not already possess.';
  readonly requiresApproval = false; // Read-only

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query.' }
    },
    required: ['query']
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results || !Array.isArray(data.results)) {
        return { success: false, error: 'Invalid response format from SearXNG' };
      }

      const topResults = data.results.slice(0, 10).map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        content: r.content || r.snippet || '',
        domain: r.parsed_url?.[1] || ''
      }));

      // Fallback domain extraction
      topResults.forEach((r: any) => {
        if (!r.domain && r.url) {
          try {
            r.domain = new URL(r.url).hostname;
          } catch(e) {}
        }
      });

      return {
        success: true,
        sources: topResults
      };
    } catch (error: any) {
      // Fallback to DuckDuckGo Lite if SearXNG fails (e.g. 403 Forbidden)
      try {
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;
        const ddgRes = await fetch(ddgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          }
        });
        
        if (!ddgRes.ok) {
          return { success: false, error: `SearXNG failed (${error.message}) and DDG fallback failed (${ddgRes.status})` };
        }
        
        const html = await ddgRes.text();
        const results: any[] = [];
        
        // Improved regex scraping for DDG Lite
        const resultRegex = /<a [^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>.*?<a [^>]*class="result__snippet[^>]*>(.*?)<\/a>/gs;
        let match;
        let count = 0;
        
        while ((match = resultRegex.exec(html)) !== null && count < 10) {
           let url = match[1];
           // Clean DDG redirect URL if present
           if (url.startsWith('//duckduckgo.com/l/?uddg=')) {
              url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
           }
           let title = match[2].replace(/<[^>]+>/g, '').trim();
           let snippet = match[3].replace(/<[^>]+>/g, '').trim();
           let domain = '';
           try {
             domain = new URL(url).hostname;
           } catch(e) {}
           
           if (url && title) {
             results.push({ title, url, content: snippet, domain });
             count++;
           }
        }
        
        if (results.length > 0) {
          return { success: true, sources: results };
        }
        return { success: false, error: 'No results found via fallback.' };
      } catch (fallbackError: any) {
        return { success: false, error: `SearXNG failed: ${error.message}. Fallback also failed: ${fallbackError.message}` };
      }
    }
  }
}
