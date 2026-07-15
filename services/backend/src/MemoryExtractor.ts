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
   *
   * Returns the list of newly created AgentMemory IDs so the caller (BullMQ worker)
   * can immediately enqueue a critic review job without polling.
   */
  async evaluateMission(missionId: string, userId: string): Promise<string[]> {
    // Hoisted above try so it's accessible in the return after the catch block
    const createdMemoryIds: string[] = [];
    try {
      logger.info(`Running Shadow Evaluation for mission ${missionId}...`);
      const dbMsgs = await db.message.findMany({ where: { missionId }, orderBy: { createdAt: 'asc' } });
      
      // Fetch existing memories for deduplication context.
      // Increased from 30→50 to reduce duplicate creation as memory grows.
      // Sorted by most recently reinforced to prioritise active knowledge.
      const existingMemories = await (db as any).agentMemory.findMany({ 
        where: { userId }, 
        select: { id: true, type: true, content: true },
        take: 50,
        orderBy: { updatedAt: 'desc' }
      });
      
      const transcript = dbMsgs.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      
      const existingContext = existingMemories.length > 0 
        ? 'EXISTING MEMORIES:\n' + existingMemories.map((m: any) => `- ID: ${m.id} | [${m.type}] ${m.content}`).join('\n')
        : 'EXISTING MEMORIES: None.';

      const systemPrompt = 'You are a strict JSON-only evaluator. Return ONLY a valid JSON array. Never generate text outside the JSON array.';
      const prompt = `You are the Shadow Evaluator for an autonomous coding agent.
Analyze the following conversation transcript and extract valuable knowledge for the agent's long-term memory.

Memory Taxonomy:
1. SKILL: Reusable Technical Workflows (e.g., a specific deployment workflow).
2. ERROR: Post-Mortems (e.g., a mistake the agent made and the solution).
3. PREFERENCE: User-specific choices (e.g., "I use MongoDB").
4. RULE: Hard safety or operational constraints (e.g., "Never store passwords").
5. BEHAVIOR: Recognized user patterns (e.g., "User frequently forgets database indexes").
6. PROFILE: Broad user facts (e.g., "User's name is Rahul", "User is building an AI agent").

CRITICAL RULES:
- ATOMIZE FACTS (NO GIANT MEMORIES): Each extracted memory MUST be a single, standalone fact (e.g., max 1-2 sentences). NEVER combine unrelated preferences (like Frontend, Backend, and Editor) into a single giant memory. Create separate independent memories!
- DEDUPLICATION: Cross-reference the EXISTING MEMORIES below. If a fact or behavior is already recorded (even with slightly different phrasing), you MUST use the "update" action to strengthen it, DO NOT "create" a duplicate.
- EXTRACT BEHAVIORS VS RULES: If a user reveals a recurring habit (e.g. "I forgot validation in my last 6 projects"), you MUST extract it as a BEHAVIOR. If the user asks you to remind them about it, you MUST also extract a RULE to remind them.
- SPLIT INDEPENDENT FACTS: If the user states multiple tools (e.g. "Node, React, MongoDB"), DO NOT group them into one memory. Create three independent PREFERENCE memories so they can be updated independently if one changes.
- ANTI-HALLUCINATION: NEVER invent or infer internal system skills (e.g. "Agent uses structured JSON output"). Only extract facts stated by the user or actual coding/workflow skills discussed.
- SESSION SCOPE RULE: NEVER extract the current session's topic or active task as a permanent memory (e.g. \"For this session we are building X\", \"Now we are implementing Y\"). These are ephemeral session goals, NOT permanent user facts. Only extract recurring cross-session patterns, explicit permanent declarations, or preferences the user stated will always apply.
- CONFIDENCE CALIBRATION: For "create" actions, set "initial_confidence" as follows:
  - 100: Explicit, permanent user declarations (e.g., "I switched permanently to Cursor").
  - 80: Direct preferences, rules, or safety constraints (e.g., "Never store passwords").
  - 50: Standard technical skills or workflows.
  - 30: Inferred or one-off behaviors that need more reinforcement (e.g., "User forgot indexes once").
- REASONING: For "update" or "replace", you must provide a "reason" property explaining why it was replaced.

Format your response as a valid JSON array of objects:
- NEW memory: { "action": "create", "type": "SKILL" | "ERROR" | "PREFERENCE" | "RULE" | "BEHAVIOR" | "PROFILE", "content": "<lesson>", "initial_confidence": <number> }
- REINFORCE memory: { "action": "update", "id": "<memory_id>", "content": "<updated_or_merged_content>", "reason": "<brief_reason>" }
- CONTRADICTED memory: { "action": "replace", "id": "<old_memory_id>", "type": "PREFERENCE" | "SKILL" | "RULE" | "BEHAVIOR" | "PROFILE", "content": "<new_truth>", "reason": "<brief_reason>" }
- DELETE memory: { "action": "delete", "id": "<memory_id>", "reason": "<brief_reason>" }
If nothing valuable exists, return [].

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
        return []; // Return empty array, not void
      }

      // Collect IDs of newly created memories to hand off to critic reviewer — declared above try

      if (Array.isArray(extracted) && extracted.length > 0) {
        for (const item of extracted) {
          if (item.action === 'update' && item.id && item.content) {
            const existing = await (db as any).agentMemory.findUnique({ where: { id: item.id } });
            if (existing) {
              // Bug fix: NEVER append reason to content — it pollutes the stored fact
              // and degrades the pgvector embedding. Log reason for debugging only.
              if (item.reason) {
                logger.info(`[MemoryExtractor] Update reason for ${item.id}: ${item.reason}`);
              }
              const contentStr = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
              
              // Bug fix: generate embedding from CLEAN content (no reason appended)
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
                  // Reinforce confidence: capped at 90 max to preserve decay headroom.
                  // The +10 per encounter is intentional but must not pin at 100.
                  confidence: Math.min(90, existing.confidence + 10)
                }
              });
              
              if (embedding && Array.isArray(embedding)) {
                const vectorString = `[${embedding.join(',')}]`;
                await (db as any).$executeRawUnsafe(
                  `UPDATE "AgentMemory" SET "embeddingVector" = $1::vector WHERE id = $2`,
                  vectorString,
                  item.id
                ).catch((e: any) => logger.warn(`Failed to update pgvector embedding: ${e.message}`));
              }
            }
          } else if (item.action === 'delete' && item.id) {
            await (db as any).agentMemory.delete({ where: { id: item.id } }).catch(() => {});
            logger.info(`Deleted memory ${item.id}`);
          } else if (item.action === 'replace' && item.id && item.content && item.type) {
            // Bug fix: NEVER append reason to content
            if (item.reason) {
              logger.info(`[MemoryExtractor] Replace reason for ${item.id}: ${item.reason}`);
            }
            const contentStr = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
            
            let embedding = null;
            try {
              const embedRes = await this.gateway.embed(contentStr);
              embedding = embedRes.embedding;
            } catch (embedErr) {
              logger.warn(`Failed to generate embedding for replaced memory: ${embedErr}`);
            }
            
            await (db as any).agentMemory.update({
              where: { id: item.id },
              data: {
                content: contentStr,
                type: item.type,
                embedding,
                // Bug fix: replacing a contradicted memory with new truth is an explicit
                // directive — set to 90 (high confidence, but not 100 so decay can still work).
                // The old hardcoded 80 was too low for explicit permanent statements.
                confidence: 90
              }
            }).catch(() => {});
            
            if (embedding && Array.isArray(embedding)) {
              const vectorString = `[${embedding.join(',')}]`;
              await (db as any).$executeRawUnsafe(
                `UPDATE "AgentMemory" SET "embeddingVector" = $1::vector WHERE id = $2`,
                vectorString,
                item.id
              ).catch((e: any) => logger.warn(`Failed to replace pgvector embedding: ${e.message}`));
            }
            logger.info(`Replaced memory ${item.id}`);
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

            const newMem = await (db as any).agentMemory.create({
              data: {
                userId: userId,
                type: item.type,
                content: contentStr,
                status: 'PENDING', // Placed in quarantine until verified by MemoryCritic
                confidence: initialConfidence,
                embedding
              }
            });
            
            // Track the new ID so the caller can enqueue critic review immediately
            createdMemoryIds.push(newMem.id);
            
            if (embedding && Array.isArray(embedding)) {
              const vectorString = `[${embedding.join(',')}]`;
              await (db as any).$executeRawUnsafe(
                `UPDATE "AgentMemory" SET "embeddingVector" = $1::vector WHERE id = $2`,
                vectorString,
                newMem.id
              ).catch((e: any) => logger.warn(`Failed to insert pgvector embedding: ${e.message}`));
            }
          }
        }
        logger.info(`Processed ${extracted.length} memories for user ${userId}. Created: ${createdMemoryIds.length} new.`);
      }
    } catch (error) {
      logger.error(`Error in evaluateMission for ${missionId}: ${error}`);
    }
    return createdMemoryIds;
  }
}
