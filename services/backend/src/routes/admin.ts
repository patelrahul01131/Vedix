import { FastifyInstance } from 'fastify';
import { db } from '@vedix/database';
import { verifyJWT, verifyAdmin } from '../middleware/auth';

export default async function adminRoutes(fastify: FastifyInstance) {
  // Protect all routes with JWT and Admin checks
  fastify.addHook('preHandler', verifyJWT);
  fastify.addHook('preHandler', verifyAdmin);

  fastify.get('/users', async (request, reply) => {
    try {
      const users = await db.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          _count: {
            select: { missions: true, apiKeys: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return reply.send({ users });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch users' });
    }
  });

  fastify.get('/stats', async (request, reply) => {
    try {
      const totalUsers = await db.user.count();
      const totalMissions = await db.mission.count();
      const totalMessages = await db.message.count();
      
      return reply.send({
        stats: {
          totalUsers,
          totalMissions,
          totalMessages
        }
      });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch stats' });
    }
  });
}
