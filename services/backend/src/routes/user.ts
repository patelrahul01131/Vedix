import { FastifyInstance } from 'fastify';
import { db } from '@vedix/database';
import { verifyJWT } from '../middleware/auth';

export default async function userRoutes(fastify: FastifyInstance) {
  // Protect all routes with JWT
  fastify.addHook('preHandler', verifyJWT);

  fastify.get('/stats', async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      
      const totalMissions = await db.mission.count({ where: { userId } });
      const totalApiKeys = await db.apiKey.count({ where: { userId } });
      const totalMemories = await (db as any).agentMemory.count({ where: { userId } });
      
      return reply.send({
        stats: {
          totalMissions,
          totalApiKeys,
          totalMemories
        }
      });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch user stats' });
    }
  });

  fastify.get('/memories', async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      const { search } = request.query as { search?: string };
      
      const whereClause: any = { userId };
      if (search) {
        whereClause.content = { contains: search, mode: 'insensitive' };
      }

      const memories = await (db as any).agentMemory.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 100 // Pagination guard — prevents unbounded queries as memory count grows
      });
      return reply.send({ memories });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch user memories' });
    }
  });

  fastify.get('/missions', async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      
      const missions = await db.mission.findMany({
        where: { userId },
        include: { _count: { select: { messages: true } } },
        orderBy: { updatedAt: 'desc' }
      });
      return reply.send({ missions });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch user missions' });
    }
  });

  fastify.get('/profile', async (request, reply) => {
    try {
      const userId = (request as any).user.id;
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, createdAt: true }
      });
      return reply.send({ user });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch profile' });
    }
  });
}
