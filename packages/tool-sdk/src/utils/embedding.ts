export async function getEmbedding(text: string): Promise<{ success: boolean; vector?: number[]; error?: string }> {
  try {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'OPEN_ROUTER_API_KEY is not configured in the environment.' };
    }

    const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'nvidia/llama-nemotron-embed-vl-1b-v2:free',
        input: text
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `OpenRouter API error: ${response.status} - ${errorText}` };
    }

    const json = await response.json();
    if (!json.data || !json.data[0] || !json.data[0].embedding) {
      return { success: false, error: 'Failed to retrieve embedding vector from OpenRouter response.' };
    }

    return { success: true, vector: json.data[0].embedding };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
