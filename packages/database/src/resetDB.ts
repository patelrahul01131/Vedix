import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting all tables in the database...');

  try {
    // Delete in order to respect foreign key constraints
    await prisma.message.deleteMany({});
    console.log('✅ Cleared Message table');

    await prisma.mission.deleteMany({});
    console.log('✅ Cleared Mission table');

    await prisma.memory.deleteMany({});
    console.log('✅ Cleared Memory table');

    await prisma.agentState.deleteMany({});
    console.log('✅ Cleared AgentState table');

    console.log('Database reset successfully!');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
