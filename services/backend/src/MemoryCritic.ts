import { ModelGateway } from '@vedix/model-gateway';
import { db } from '@vedix/database';
import { logger } from './logger';
import { TokenTracker } from './TokenTracker';

export class MemoryCritic {
  private gateway = new ModelGateway('mistral-large-latest');
  private isRunning = false;

  public async processPendingMemories() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    try {
      // 1. Fetch pending memories
      const pendingMemories = await db.agentMemory.findMany({
        where: { status: 'PENDING' },
        take: 10 // process in batches
      });

      if (pendingMemories.length === 0) {
        this.isRunning = false;
        return;
      }

      logger.info(`MemoryCritic found ${pendingMemories.length} pending memories to review.`);

      // 2. Evaluate each memory
      for (const memory of pendingMemories) {
        const prompt = `You are a strict security and quality reviewer for an autonomous AI agent's "Global Brain".
A conversational agent wants to save the following extracted lesson so it can use it in future conversations with ALL users.

Extracted Lesson to Review:
"${memory.content}"

Review Criteria:
1. Is it a general factual statement, technical skill, or workflow?
2. Does it contain ANY Personal Identifiable Information (PII) like names, specific email addresses, passwords, or personal project API keys?
3. Is it safe and appropriate for a global knowledge base?

If it passes all criteria and is broadly useful, output exactly: APPROVED
If it contains PII, is too specific to one person, or is harmful, output exactly: REJECTED

Output ONLY the word APPROVED or REJECTED. Nothing else.`;

        try {
          const response = await this.gateway.generate({
            messages: [{ role: 'user', content: prompt }],
            systemPrompt: 'You are a strict boolean evaluator. Respond only with APPROVED or REJECTED.',
            tools: []
          } as any);
          
          if ((response as any).usage) {
            TokenTracker.log(this.gateway.modelName, 'MemoryCritic', (response as any).usage).catch(console.error);
          }

          const decision = (response as any).text.trim().toUpperCase();

          if (decision === 'APPROVED') {
            await db.agentMemory.update({
              where: { id: memory.id },
              data: { status: 'APPROVED', confidence: Math.min(100, memory.confidence + 20) }
            });
            logger.info(`MemoryCritic APPROVED memory ${memory.id}`);
          } else if (decision === 'REJECTED') {
            await db.agentMemory.update({
              where: { id: memory.id },
              data: { status: 'REJECTED' }
            });
            logger.info(`MemoryCritic REJECTED memory ${memory.id}`);
          } else {
            logger.warn(`MemoryCritic returned unclear response for memory ${memory.id}: ${decision}`);
          }
        } catch (evalError) {
          logger.error(`MemoryCritic failed to evaluate memory ${memory.id}: ${evalError}`);
        }
      }
    } catch (error) {
      logger.error(`MemoryCritic encountered an error: ${error}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Decay Memory Confidence
   * Reduces the confidence of memories that haven't been updated/reinforced recently.
   * If confidence drops below 30, it reverts to REJECTED.
   */
  public async decayMemories() {
    try {
      logger.info('Running Memory Decay process...');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const decayingMemories = await db.agentMemory.findMany({
        where: { 
          status: 'APPROVED',
          updatedAt: { lt: thirtyDaysAgo },
          confidence: { gt: 0 }
        }
      });

      let decayedCount = 0;
      let rejectedCount = 0;

      for (const memory of decayingMemories) {
        // Decrease confidence by 5
        const newConfidence = Math.max(0, memory.confidence - 5);
        let newStatus = memory.status;

        if (newConfidence < 30) {
          newStatus = 'REJECTED'; // Fall out of memory entirely
          rejectedCount++;
        }

        await db.agentMemory.update({
          where: { id: memory.id },
          data: { confidence: newConfidence, status: newStatus }
        });
        decayedCount++;
      }

      logger.info(`Memory Decay complete: Decayed ${decayedCount} memories, Rejected ${rejectedCount} obsolete memories.`);
    } catch (e) {
      logger.error(`Error in decayMemories: ${e}`);
    }
  }
}
