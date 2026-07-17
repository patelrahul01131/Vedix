import { db } from '@vedix/database';
import { ModelGateway } from '@vedix/model-gateway';
import { getSemanticMemoryTable } from './LanceDB';

const POLLING_INTERVAL_MS = 5000;
const EXTRACTION_MODEL = 'mistral-small-latest'; // Cheaper model for background processing

export class MemoryWorker {
  private static isRunning = false;
  private static gateway = new ModelGateway(EXTRACTION_MODEL);

  /**
   * Starts the infinite background polling loop.
   */
  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[MemoryWorker] Started background memory extraction worker.');
    this.poll();
  }

  private static async poll() {
    if (!this.isRunning) return;

    try {
      // 1. Fetch oldest PENDING record
      const item = await (db as any).memoryExtractionQueue.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' }
      });

      if (item) {
        // 2. Atomic lock: mark as PROCESSING
        const updateResult = await (db as any).memoryExtractionQueue.updateMany({
          where: { id: item.id, status: 'PENDING' },
          data: { status: 'PROCESSING', attempts: { increment: 1 } }
        });

        if (updateResult.count === 0) {
          // Another worker grabbed it
          setTimeout(() => this.poll(), 0);
          return;
        }

        // 3. Process
        await this.processItem(item);

        // 4. Mark COMPLETED
        await (db as any).memoryExtractionQueue.update({
          where: { id: item.id },
          data: { status: 'COMPLETED' }
        });
        
        // Process next immediately if there was an item
        setTimeout(() => this.poll(), 0);
        return;
      }
    } catch (err) {
      console.error('[MemoryWorker] Polling error:', err);
    }

    // Wait and poll again
    setTimeout(() => this.poll(), POLLING_INTERVAL_MS);
  }

  private static async processItem(item: any) {
    console.log(`[MemoryWorker] Processing queue item ${item.id}`);

    // Fetch existing preferences to pass to LLM
    const existingPrefs = await (db as any).userExplicitPreference.findMany({
      where: { userId: item.userId }
    });

    const existingPrefsContext = existingPrefs.length > 0 
      ? existingPrefs.map((p: any) => `ID: ${p.id} | Category: ${p.category} | Rule: ${p.rule} | Confidence: ${p.confidence}`).join('\n')
      : "None.";

    const prompt = `Analyze this conversation between a user and an AI agent.
User Message: "${item.userMessage}"
Agent Response: "${item.agentResponse}"

Here are the user's CURRENT global explicit rules:
${existingPrefsContext}

Extract explicit global rules, preferences, or behavioral instructions the user stated.
Output a strict JSON array of "actions" to manage the global explicit memory database, plus a "semanticSummary" string.

CRITICAL FILTERING RULES (PREVENT MEMORY POLLUTION):
You MUST NOT extract temporary, task-specific, or local instructions as global rules.
- REJECT: "Make this button red", "Use Tailwind for this component", "Debug this login file".
- ACCEPT: "I always prefer red buttons", "Never use Tailwind", "I am a backend developer".
If the user's instruction is only relevant to the current task, do NOT output an action for it.

Allowed Actions:
1. "ADD": For brand new GLOBAL rules. Include "category", "rule", and a dynamic "confidence" (1-100) based on how explicit the user was.
2. "UPDATE": If the user repeats, refines, or adds to an existing global rule. Include "id" (the existing rule ID), the updated "rule" text (merging the old and new), and a "confidence_boost" (e.g. 10 to 30) based on their intensity.
3. "DELETE": If the user contradicts or revokes an existing global rule. Include "id".

Example JSON:
{
  "actions": [
    { "action": "ADD", "category": "CODING_STYLE", "rule": "User prefers TypeScript for all projects.", "confidence": 80 }
  ],
  "semanticSummary": "User asked for a React component and set global coding rules."
}`;

    try {
      const result = await this.gateway.generate({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: 'You are an AI memory manager. You only output valid JSON.',
        tools: [],
      });

      let parsed: any;
      try {
        const text = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(text);
      } catch (parseErr) {
        console.error('[MemoryWorker] Failed to parse LLM JSON output', parseErr);
        return; // Fail gracefully
      }

      // Execute CRUD Actions on Explicit Preferences
      if (parsed.actions && Array.isArray(parsed.actions)) {
        for (const action of parsed.actions) {
          try {
            if (action.action === 'ADD') {
              await (db as any).userExplicitPreference.create({
                data: {
                  userId: item.userId,
                  category: action.category || 'PREFERENCE',
                  rule: action.rule,
                  source: item.source,
                  confidence: Math.min(100, Math.max(1, action.confidence || 50)),
                  isActive: true
                }
              });
            } else if (action.action === 'UPDATE' && action.id) {
              const existing = existingPrefs.find((p: any) => p.id === action.id);
              if (existing) {
                const newConfidence = Math.min(100, existing.confidence + (action.confidence_boost || 10));
                await (db as any).userExplicitPreference.update({
                  where: { id: action.id },
                  data: {
                    rule: action.rule,
                    confidence: newConfidence
                  }
                });
              }
            } else if (action.action === 'DELETE' && action.id) {
              await (db as any).userExplicitPreference.delete({
                where: { id: action.id }
              }).catch(() => {}); // Ignore if already deleted
            }
          } catch (crudErr) {
            console.error('[MemoryWorker] CRUD action failed:', action, crudErr);
          }
        }
      }

      // Save Semantic Summary (LanceDB)
      if (parsed.semanticSummary) {
        try {
          const table = await getSemanticMemoryTable();
          const embedResult = await this.gateway.embed(parsed.semanticSummary);
          
          await table.add([{
            id: item.id, // Using queue ID as vector ID
            vector: embedResult.embedding,
            user_id: item.userId,
            content: parsed.semanticSummary,
            source: item.source,
            created_at: Date.now()
          }]);
        } catch (vectorErr) {
          console.error('[MemoryWorker] Failed to save to LanceDB', vectorErr);
        }
      }

    } catch (llmErr) {
      console.error('[MemoryWorker] LLM Extraction Error:', llmErr);
      throw llmErr;
    }
  }
}
