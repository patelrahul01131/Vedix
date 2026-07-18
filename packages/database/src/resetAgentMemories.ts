import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting agent learning memories in the database...');

  try {
    await prisma.agentMemory.deleteMany({});
    console.log('✅ Cleared AgentMemory table');

    await prisma.memoryExtractionQueue.deleteMany({});
    console.log('✅ Cleared MemoryExtractionQueue table');

    await prisma.userExplicitPreference.deleteMany({});
    console.log('✅ Cleared UserExplicitPreference table');

    console.log('Agent learning memories reset successfully!');
  } catch (error) {
    console.error('Error resetting agent learning memories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
