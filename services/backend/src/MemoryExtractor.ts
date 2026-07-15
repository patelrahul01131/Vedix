import { ModelGateway } from '@vedix/model-gateway';
import { db } from '@vedix/database';
import { logger } from './logger';
import { TokenTracker } from './TokenTracker';

// ──────────────────────────────────────────────────────────────────────────────
// Smart Extraction Decision System
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Categories of extractable memory. The gating LLM decides which (if any)
 * are present in a conversation before the full extraction runs.
 */
export type MemoryCategory =
  | 'SKILL'        // Reusable technical workflow
  | 'ERROR'        // Post-mortem / mistake + fix
  | 'PREFERENCE'   // Technology/tool/style choice
  | 'RULE'         // Hard safety or operational constraint
  | 'BEHAVIOR'     // Recurring user pattern
  | 'PROFILE';     // Broad user fact (name, project, role)

export interface ExtractionGateResult {
  shouldExtract: boolean;
  categories: MemoryCategory[];
  reason: string;
}

/**
 * Lightweight gating prompt — uses a smaller model to decide IF and WHAT
 * should be extracted, before running the full expensive extraction.
 *
 * Returns { shouldExtract: false } immediately for trivial conversations
 * (greetings, single-word queries, no factual content).
 */
async function classifyExtractionNeeds(
  transcript: string,
  gateway: ModelGateway
): Promise<ExtractionGateResult> {
  const FAST_CLASSIFICATION_PROMPT = `You are a memory classification gate for an AI coding assistant.
Your job is to scan a conversation and decide:
1. Is there anything worth storing in long-term memory?
2. If yes, what SPECIFIC categories exist?

Memory categories:
- SKILL: A reusable technical workflow, deployment step, or code pattern was discussed in detail.
- ERROR: The agent made a mistake and then corrected it, or a bug was diagnosed and fixed.
- PREFERENCE: The user stated or revealed a preference for a tool, language, framework, or style.
- RULE: The user stated a hard constraint, safety rule, or operational policy.
- BEHAVIOR: A recurring user pattern or habit was revealed (e.g. "I always forget X").
- PROFILE: A permanent user fact was revealed (name, project name, role, company).

STRICT RULES:
- Return { shouldExtract: false } for: greetings, chitchat, single questions with no personal context, status checks ("is X working?"), ephemeral debugging sessions with no permanent learning.
- Return { shouldExtract: false } for conversations under 4 messages.
- Only include a category if you are CONFIDENT the conversation has extractable facts for it.
- Never include SKILL for a one-off task. Only for a pattern worth repeating.
- PREFERENCE requires the user to have explicitly stated a choice, not just used something once.

Return ONLY valid JSON:
{ "shouldExtract": true|false, "categories": ["SKILL", "PREFERENCE"], "reason": "<one sentence>" }

Conversation transcript:
${transcript}`;

  try {
    const response = await gateway.generate({
      messages: [{ role: 'user', content: FAST_CLASSIFICATION_PROMPT }],
      systemPrompt: 'You are a strict JSON-only classifier. Return ONLY valid JSON, no markdown, no explanation.',
      tools: [],
    } as any);

    let text = (response as any).text?.trim() ?? '';
    // Strip markdown code fences if present
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(text) as ExtractionGateResult;
    if (typeof parsed.shouldExtract !== 'boolean') {
      return { shouldExtract: false, categories: [], reason: 'Invalid gate response' };
    }
    return parsed;
  } catch (e) {
    // On gate failure, conservatively skip extraction to avoid wasted tokens
    logger.warn(`[ExtractionGate] Classification failed, skipping extraction: ${e}`);
    return { shouldExtract: false, categories: [], reason: 'Gate classification error' };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// MemoryExtractor
// ──────────────────────────────────────────────────────────────────────────────

export class MemoryExtractor {
  // Main extraction gateway (larger, more capable model)
  private gateway = new ModelGateway('mistral-large-latest');

  // Fast, cheap gateway for the classification gate
  // Uses a smaller model to save tokens on the gating decision
  private gateGateway = new ModelGateway('mistral-small-latest');

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

      // Only summarize messages that are falling out of the window
      const numToSummarize = dbMsgs.length - windowSize;
      const messagesToSummarize = dbMsgs.slice(0, numToSummarize);

      const transcript = messagesToSummarize
        .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

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
        tools: [],
      } as any);

      const newSummary = (response as any).text;

      if ((response as any).usage) {
        TokenTracker.log(this.gateway.modelName, 'Summarizer', (response as any).usage).catch(console.error);
      }

      if (newSummary) {
        await db.mission.update({
          where: { id: missionId },
          data: { summary: newSummary } as any,
        });
        logger.info(`Mission ${missionId} summarized successfully.`);
      }
    } catch (error) {
      logger.error(`Error in summarizeMission for ${missionId}: ${error}`);
    }
  }

  /**
   * Smart extraction pipeline:
   *
   * Step 1 — Gate: A fast, cheap LLM classifies the conversation.
   *   → If nothing is worth extracting, stop immediately (0 LLM extraction calls).
   *   → If something is worth extracting, returns which CATEGORIES to focus on.
   *
   * Step 2 — Targeted Extract: Run the full extraction prompt ONLY for the
   *   categories the gate identified, reducing hallucinations and token waste.
   *
   * Returns the list of newly created AgentMemory IDs so the caller (BullMQ worker)
   * can immediately enqueue a critic review job without polling.
   */
  async evaluateMission(missionId: string, userId: string): Promise<string[]> {
    const createdMemoryIds: string[] = [];

    try {
      logger.info(`Running Shadow Evaluation for mission ${missionId}...`);
      const dbMsgs = await db.message.findMany({
        where: { missionId },
        orderBy: { createdAt: 'asc' },
      });

      // ── Hard gate: skip trivial conversations immediately ──────────────────
      // Filter to only user/agent messages (not tool/activity noise)
      const conversationalMsgs = dbMsgs.filter((m: any) =>
        m.role === 'user' || m.role === 'agent' || m.role === 'assistant'
      );

      if (conversationalMsgs.length < 3) {
        logger.info(
          `[ExtractionGate] Skipping mission ${missionId} — only ${conversationalMsgs.length} conversational messages (min 3).`
        );
        return [];
      }

      // Build a compact transcript for the gate (strip huge tool results to save tokens)
      const compactTranscript = conversationalMsgs
        .map((m: any) => {
          const role = m.role.toUpperCase();
          // Truncate long messages for the gate classifier — it only needs signals
          const content = typeof m.content === 'string'
            ? m.content.substring(0, 500)
            : JSON.stringify(m.content).substring(0, 500);
          return `${role}: ${content}`;
        })
        .join('\n\n');

      // ── Step 1: Classification Gate ────────────────────────────────────────
      const gate = await classifyExtractionNeeds(compactTranscript, this.gateGateway);

      if ((this.gateGateway as any).modelName) {
        // Log gate usage if response has usage data (best-effort)
      }

      if (!gate.shouldExtract || gate.categories.length === 0) {
        logger.info(
          `[ExtractionGate] Skipping extraction for mission ${missionId}. Reason: ${gate.reason}`
        );
        return [];
      }

      logger.info(
        `[ExtractionGate] Extraction approved for mission ${missionId}. Categories: [${gate.categories.join(', ')}]. Reason: ${gate.reason}`
      );

      // ── Step 2: Targeted Extraction ────────────────────────────────────────
      // Fetch existing memories for deduplication context.
      const existingMemories = await (db as any).agentMemory.findMany({
        where: {
          userId,
          // Only fetch memories of the categories we're about to extract
          // This dramatically reduces the dedup context window and token usage
          ...(gate.categories.length > 0 ? { type: { in: gate.categories } } : {}),
        },
        select: { id: true, type: true, content: true },
        take: 50,
        orderBy: { updatedAt: 'desc' },
      });

      // Full transcript (not truncated) for the actual extraction
      const fullTranscript = dbMsgs
        .filter((m: any) => m.role !== 'activity') // Strip activity/noise messages
        .map((m: any) => {
          const role = m.role.toUpperCase();
          let content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
          // Truncate very long tool result messages to avoid token explosion
          if (content.length > 3000) content = content.substring(0, 3000) + '\n[... truncated ...]';
          return `${role}: ${content}`;
        })
        .join('\n\n');

      const existingContext =
        existingMemories.length > 0
          ? 'EXISTING MEMORIES (for deduplication):\n' +
            existingMemories
              .map((m: any) => `- ID: ${m.id} | [${m.type}] ${m.content}`)
              .join('\n')
          : 'EXISTING MEMORIES: None.';

      // Build a FOCUSED taxonomy section — only include the approved categories
      const categoryDescriptions: Record<MemoryCategory, string> = {
        SKILL:      '1. SKILL: Reusable Technical Workflows (e.g., a specific deployment workflow, a code pattern).',
        ERROR:      '2. ERROR: Post-Mortems (e.g., a mistake the agent made and the correct fix).',
        PREFERENCE: '3. PREFERENCE: User-specific choices (e.g., "I use MongoDB", "I prefer tabs").',
        RULE:       '4. RULE: Hard safety or operational constraints (e.g., "Never store passwords in plaintext").',
        BEHAVIOR:   '5. BEHAVIOR: Recognized user patterns (e.g., "User frequently forgets database indexes").',
        PROFILE:    '6. PROFILE: Broad user facts (e.g., "User\'s name is Rahul", "User is building an AI agent").',
      };

      const focusedTaxonomy = gate.categories
        .map(c => categoryDescriptions[c])
        .join('\n');

      const systemPrompt =
        'You are a strict JSON-only evaluator. Return ONLY a valid JSON array. Never generate text outside the JSON array.';

      const prompt = `You are the Shadow Evaluator for an autonomous coding agent.
Analyze the following conversation transcript and extract ONLY the specific memory types listed below.
The gate classifier has determined that ONLY these categories are present: [${gate.categories.join(', ')}]
Do NOT extract any other category. Do NOT invent facts.

Memory Taxonomy (ONLY extract these):
${focusedTaxonomy}

CRITICAL RULES:
- ATOMIZE FACTS (NO GIANT MEMORIES): Each extracted memory MUST be a single, standalone fact (max 1-2 sentences). NEVER combine unrelated preferences into a single memory.
- DEDUPLICATION: Cross-reference the EXISTING MEMORIES below. If a fact is already recorded (even with slightly different phrasing), use the "update" action to strengthen it. DO NOT create a duplicate.
- ANTI-HALLUCINATION: NEVER invent or infer facts. Only extract what is explicitly stated.
- SESSION SCOPE RULE: NEVER extract the current session's task as a permanent memory. Only extract recurring patterns or explicit permanent declarations.
- CONFIDENCE CALIBRATION for "create" actions:
  - 100: Explicit, permanent user declarations (e.g., "I switched permanently to Cursor").
  - 80: Direct preferences, rules, or safety constraints.
  - 50: Standard technical skills or workflows.
  - 30: Inferred or one-off behaviors needing reinforcement.

Format your response as a valid JSON array:
- NEW: { "action": "create", "type": "<CATEGORY>", "content": "<lesson>", "initial_confidence": <number> }
- REINFORCE: { "action": "update", "id": "<memory_id>", "content": "<updated_content>", "reason": "<brief_reason>" }
- CONTRADICT: { "action": "replace", "id": "<old_memory_id>", "type": "<CATEGORY>", "content": "<new_truth>", "reason": "<brief_reason>" }
- DELETE: { "action": "delete", "id": "<memory_id>", "reason": "<brief_reason>" }
If nothing valuable exists, return [].

${existingContext}

Transcript:
${fullTranscript}`;

      const response = await this.gateway.generate({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        tools: [],
      } as any);

      if ((response as any).usage) {
        TokenTracker.log(this.gateway.modelName, 'MemoryExtractor', (response as any).usage).catch(
          console.error
        );
      }

      let extracted: any[] = [];
      try {
        let text = ((response as any).text || '').trim();
        if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '');
        extracted = JSON.parse(text);
      } catch (e) {
        logger.warn(`Failed to parse extraction JSON from Shadow Evaluator.`);
        return [];
      }

      if (Array.isArray(extracted) && extracted.length > 0) {
        for (const item of extracted) {
          // ── update ────────────────────────────────────────────────────────
          if (item.action === 'update' && item.id && item.content) {
            const existing = await (db as any).agentMemory.findUnique({ where: { id: item.id } });
            if (existing) {
              if (item.reason) {
                logger.info(`[MemoryExtractor] Update reason for ${item.id}: ${item.reason}`);
              }
              const contentStr =
                typeof item.content === 'string' ? item.content : JSON.stringify(item.content);

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
                  confidence: Math.min(90, existing.confidence + 10),
                },
              });

              if (embedding && Array.isArray(embedding)) {
                const vectorString = `[${embedding.join(',')}]`;
                await (db as any)
                  .$executeRawUnsafe(
                    `UPDATE "AgentMemory" SET "embeddingVector" = $1::vector WHERE id = $2`,
                    vectorString,
                    item.id
                  )
                  .catch((e: any) =>
                    logger.warn(`Failed to update pgvector embedding: ${e.message}`)
                  );
              }
            }

          // ── delete ────────────────────────────────────────────────────────
          } else if (item.action === 'delete' && item.id) {
            await (db as any).agentMemory.delete({ where: { id: item.id } }).catch(() => {});
            logger.info(`Deleted memory ${item.id}`);

          // ── replace ───────────────────────────────────────────────────────
          } else if (item.action === 'replace' && item.id && item.content && item.type) {
            if (item.reason) {
              logger.info(`[MemoryExtractor] Replace reason for ${item.id}: ${item.reason}`);
            }
            const contentStr =
              typeof item.content === 'string' ? item.content : JSON.stringify(item.content);

            let embedding = null;
            try {
              const embedRes = await this.gateway.embed(contentStr);
              embedding = embedRes.embedding;
            } catch (embedErr) {
              logger.warn(`Failed to generate embedding for replaced memory: ${embedErr}`);
            }

            await (db as any).agentMemory
              .update({
                where: { id: item.id },
                data: { content: contentStr, type: item.type, embedding, confidence: 90 },
              })
              .catch(() => {});

            if (embedding && Array.isArray(embedding)) {
              const vectorString = `[${embedding.join(',')}]`;
              await (db as any)
                .$executeRawUnsafe(
                  `UPDATE "AgentMemory" SET "embeddingVector" = $1::vector WHERE id = $2`,
                  vectorString,
                  item.id
                )
                .catch((e: any) =>
                  logger.warn(`Failed to replace pgvector embedding: ${e.message}`)
                );
            }
            logger.info(`Replaced memory ${item.id}`);

          // ── create ────────────────────────────────────────────────────────
          } else if ((item.action === 'create' || !item.action) && item.type && item.content) {
            // Guard: only create if the type was approved by the gate
            if (!gate.categories.includes(item.type as MemoryCategory)) {
              logger.warn(
                `[ExtractionGate] Skipping unapproved memory type "${item.type}" — gate only approved [${gate.categories.join(', ')}]`
              );
              continue;
            }

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

            let initialConfidence = 50;
            if (
              typeof item.initial_confidence === 'number' &&
              item.initial_confidence >= 10 &&
              item.initial_confidence <= 100
            ) {
              initialConfidence = item.initial_confidence;
            }

            const newMem = await (db as any).agentMemory.create({
              data: {
                userId,
                type: item.type,
                content: contentStr,
                status: 'PENDING',
                confidence: initialConfidence,
                embedding,
              },
            });

            createdMemoryIds.push(newMem.id);

            if (embedding && Array.isArray(embedding)) {
              const vectorString = `[${embedding.join(',')}]`;
              await (db as any)
                .$executeRawUnsafe(
                  `UPDATE "AgentMemory" SET "embeddingVector" = $1::vector WHERE id = $2`,
                  vectorString,
                  newMem.id
                )
                .catch((e: any) =>
                  logger.warn(`Failed to insert pgvector embedding: ${e.message}`)
                );
            }
          }
        }

        logger.info(
          `Processed ${extracted.length} memories for user ${userId}. Created: ${createdMemoryIds.length} new.`
        );
      } else {
        logger.info(`[MemoryExtractor] No extractable memories found for mission ${missionId}.`);
      }
    } catch (error) {
      logger.error(`Error in evaluateMission for ${missionId}: ${error}`);
    }

    return createdMemoryIds;
  }
}
