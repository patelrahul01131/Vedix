import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting agent learning memories in the database...');

  try {
    await prisma.agentMemory.deleteMany({});
    console.log('✅ Cleared AgentMemory table');

    console.log('Agent learning memories reset successfully!');
  } catch (error) {
    console.error('Error resetting agent learning memories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
