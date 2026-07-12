import { ModelGateway } from '@vedix/model-gateway';
import { db } from '@vedix/database';
import { logger } from './logger';
import { TokenTracker } from './TokenTracker';

export class MemoryExtractor {
  private gateway = new ModelGateway('mistral-large-latest');

  /**
   * Summarizes the older messages of a mission that fall outside the sliding window.
   * This is triggered by the 'summarizeMission' event to prevent Context Bloat.
   */
  async summarizeMission(missionId: string, windowSize: number = 15) {
    try {
      logger.info(`Running background summarization for mission ${missionId}...`);
      const mission = await db.mission.findUnique({ where: { id: missionId } });
      if (!mission) return;

      const dbMsgs = await db.message.findMany({ where: { missionId }, orderBy: { createdAt: 'asc' } });
      
      if (dbMsgs.length <= windowSize) {
        return; // Nothing to summarize yet
      }

      // We only want to summarize messages that are falling out of the window
      const numToSummarize = dbMsgs.length - windowSize;
      const messagesToSummarize = dbMsgs.slice(0, numToSummarize);
      
      const transcript = messagesToSummarize.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      
      const systemPrompt = 'You are a summarization tool. Respond ONLY with the requested summary.';
      const prompt = `You are a background summarization agent. 
Your task is to summarize the following chat transcript to maintain long-term context.
Focus on:
1. The user's original goal.
2. The current state of progress.
3. Any important facts or constraints mentioned.

Previous Summary (if any):
${(mission as any).summary || 'None'}

New Transcript to incorporate:
${transcript}

Provide a concise, updated summary in 3-5 sentences.`;

      const response = await this.gateway.generate({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        tools: []
      } as any);

      const newSummary = (response as any).text;
      
      if ((response as any).usage) {
        TokenTracker.log(this.gateway.modelName, 'Summarizer', (response as any).usage).catch(console.error);
      }

      if (newSummary) {
        await db.mission.update({
          where: { id: missionId },
          data: { summary: newSummary } as any
        });
        logger.info(`Mission ${missionId} summarized successfully.`);
      }
    } catch (error) {
      logger.error(`Error in summarizeMission for ${missionId}: ${error}`);
    }
  }

  /**
   * Extracts reusable skills and post-mortems of errors after a mission completes.
   * This runs as a Shadow Evaluator.
   */
  async evaluateMission(missionId: string, userId: string) {
    try {
      logger.info(`Running Shadow Evaluation for mission ${missionId}...`);
      const dbMsgs = await db.message.findMany({ where: { missionId }, orderBy: { createdAt: 'asc' } });
      
      // Fetch existing memories to avoid duplicates and allow normalization
      const existingMemories = await (db as any).agentMemory.findMany({ 
        where: { userId }, 
        select: { id: true, type: true, content: true },
        take: 30, // Limit to recent to save tokens, but enough context
        orderBy: { updatedAt: 'desc' }
      });
      
      const transcript = dbMsgs.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      
      const existingContext = existingMemories.length > 0 
        ? 'EXISTING MEMORIES:\n' + existingMemories.map((m: any) => `- ID: ${m.id} | [${m.type}] ${m.content}`).join('\n')
        : 'EXISTING MEMORIES: None.';

      const systemPrompt = 'You are a JSON-only evaluator. Return ONLY a JSON array.';
      const prompt = `You are the Shadow Evaluator for an autonomous coding agent.
Analyze the following conversation transcript and identify:
1. Reusable Skills (e.g., a specific deployment workflow, a complex architectural setup).
2. Error Post-Mortems (e.g., a mistake the agent made and the solution that finally worked).

Rules:
- Do NOT extract user-specific personal preferences (e.g., "The user likes blue").
- Extracted skills must be objective, technical, and universally applicable to this user's codebase.
- Format your response as a valid JSON array of objects.
- To create a NEW memory, use format: { "action": "create", "type": "SKILL" or "ERROR", "content": "<lesson>", "initial_confidence": <number between 10 and 90> }
  - Minor fixes (typos, small errors) = 20-40
  - Standard skills (API usage, basic workflow) = 50
  - Critical architectural fixes (multi-file logic, core patterns) = 70-90
- To NORMALIZE/STRENGTHEN an EXISTING memory because it was encountered again, use format: { "action": "update", "id": "<memory_id>", "content": "<updated_or_merged_content>" }
- If there is nothing highly valuable to extract, return an empty array [].

${existingContext}

Transcript:
${transcript}`;

      const response = await this.gateway.generate({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        tools: []
      } as any);

      if ((response as any).usage) {
        TokenTracker.log(this.gateway.modelName, 'MemoryExtractor', (response as any).usage).catch(console.error);
      }

      let extracted = [];
      try {
        let text = (response as any).text.trim();
        if (text.startsWith('\`\`\`json')) text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '');
        extracted = JSON.parse(text);
      } catch (e) {
        logger.warn(`Failed to parse extraction JSON from Shadow Evaluator.`);
        return;
      }

      if (Array.isArray(extracted) && extracted.length > 0) {
        for (const item of extracted) {
          if (item.action === 'update' && item.id && item.content) {
            const existing = await (db as any).agentMemory.findUnique({ where: { id: item.id } });
            if (existing) {
              let contentStr = item.content;
              if (typeof contentStr !== 'string') contentStr = JSON.stringify(contentStr);
              
              let embedding = null;
              try {
                const embedRes = await this.gateway.embed(contentStr);
                embedding = embedRes.embedding;
              } catch (embedErr) {
                logger.warn(`Failed to generate embedding for updated memory: ${embedErr}`);
              }
              
              await (db as any).agentMemory.update({
                where: { id: item.id },
                data: {
                  content: contentStr,
                  embedding,
                  // Normalize: encountering a skill again reinforces it!
                  confidence: Math.min(100, existing.confidence + 10) 
                }
              });
            }
          } else if ((item.action === 'create' || !item.action) && item.type && item.content) {
            let contentStr = item.content;
            if (typeof contentStr !== 'string') {
              contentStr = JSON.stringify(contentStr);
            }

            let embedding = null;
            try {
              const embedRes = await this.gateway.embed(contentStr);
              embedding = embedRes.embedding;
            } catch (embedErr) {
              logger.warn(`Failed to generate embedding for new memory: ${embedErr}`);
            }

            // Fallback to 50 if the LLM forgets or provides an invalid number
            let initialConfidence = 50;
            if (typeof item.initial_confidence === 'number' && item.initial_confidence >= 10 && item.initial_confidence <= 100) {
              initialConfidence = item.initial_confidence;
            }

            await (db as any).agentMemory.create({
              data: {
                userId: userId,
                type: item.type,
                content: contentStr,
                status: 'PENDING', // Placed in quarantine until verified
                confidence: initialConfidence,
                embedding
              }
            });
          }
        }
        logger.info(`Processed ${extracted.length} memories for user ${userId}.`);
      }
    } catch (error) {
      logger.error(`Error in evaluateMission for ${missionId}: ${error}`);
    }
  }
}
