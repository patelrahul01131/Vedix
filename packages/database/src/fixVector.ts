import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing AgentMemory vector dimension...');

  try {
    // Clear all agent memories because their dimensions are wrong
    await prisma.agentMemory.deleteMany({});
    console.log('✅ Cleared AgentMemory table');

    // Alter the column dimension to 2048
    await prisma.$executeRawUnsafe(`ALTER TABLE "AgentMemory" ALTER COLUMN "embeddingVector" TYPE vector(2048);`);
    console.log('✅ Altered embeddingVector to 2048 dimensions');
  } catch (error) {
    console.error('Error fixing db:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
