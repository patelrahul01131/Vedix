import { ModelGateway } from '@vedix/model-gateway';
import { db } from '@vedix/database';
import { logger } from './logger';

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
      
      const transcript = dbMsgs.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      
      const systemPrompt = 'You are a JSON-only evaluator. Return ONLY a JSON array.';
      const prompt = `You are the Shadow Evaluator for an autonomous coding agent.
Analyze the following conversation transcript and identify:
1. Reusable Skills (e.g., a specific deployment workflow, a complex architectural setup).
2. Error Post-Mortems (e.g., a mistake the agent made and the solution that finally worked).

Rules:
- Do NOT extract user-specific personal preferences (e.g., "The user likes blue").
- Extracted skills must be objective, technical, and universally applicable to this user's codebase.
- Format your response as a valid JSON array of objects with 'type' (either 'SKILL' or 'ERROR') and 'content' (the extracted lesson).
- If there is nothing highly valuable to extract, return an empty array [].

Transcript:
${transcript}`;

      const response = await this.gateway.generate({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        tools: []
      } as any);

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
          if (item.type && item.content) {
            await (db as any).agentMemory.create({
              data: {
                userId: userId,
                type: item.type,
                content: item.content,
                status: 'PENDING', // Placed in quarantine until verified
                confidence: 50
              }
            });
          }
        }
        logger.info(`Extracted ${extracted.length} memories for user ${userId}.`);
      }
    } catch (error) {
      logger.error(`Error in evaluateMission for ${missionId}: ${error}`);
    }
  }
}
