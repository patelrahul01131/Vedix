import { db } from '@vedix/database';
import { ModelGateway } from '@vedix/model-gateway';

async function backfillEmbeddings() {
  console.log('Starting embedding backfill for existing agent memories...');
  const gateway = new ModelGateway('mistral-large-latest');

  const allMemories = await db.agentMemory.findMany();
  const memories = allMemories.filter(m => m.embedding === null || m.embedding === undefined || (Array.isArray(m.embedding) && m.embedding.length === 0));

  console.log(`Found ${memories.length} memories without embeddings.`);

  for (const memory of memories) {
    try {
      console.log(`Generating embedding for memory ${memory.id}...`);
      const res = await gateway.embed(memory.content);
      if (res && res.embedding) {
        await db.agentMemory.update({
          where: { id: memory.id },
          data: { embedding: res.embedding }
        });
        console.log(`Successfully updated memory ${memory.id}.`);
      }
    } catch (e) {
      console.error(`Failed to update memory ${memory.id}:`, e);
    }
  }

  console.log('Backfill complete!');
}

backfillEmbeddings().catch(console.error).finally(() => process.exit(0));
