import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// In production, suppress the noisy 'query' log level that floods stdout
// with every SQL statement. Only log errors and warnings.
const logLevel: ('query' | 'info' | 'warn' | 'error')[] =
  process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn'];

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: logLevel,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export * from '@prisma/client';
export * from './vector';
