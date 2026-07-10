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

  fastify.get('/users/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = await db.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          missions: { orderBy: { updatedAt: 'desc' } },
          apiKeys: true,
          agentMemories: { orderBy: { createdAt: 'desc' } }
        }
      });
      if (!user) return reply.code(404).send({ error: 'User not found' });
      return reply.send({ user });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch user details' });
    }
  });

  fastify.get('/agents', async (request, reply) => {
    try {
      const missions = await db.mission.findMany({
        include: { user: { select: { email: true } }, _count: { select: { messages: true } } },
        orderBy: { updatedAt: 'desc' }
      });
      return reply.send({ agents: missions });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch agents' });
    }
  });

  fastify.get('/stats', async (request, reply) => {
    try {
      const totalUsers = await db.user.count();
      const totalMissions = await db.mission.count();
      const totalMessages = await db.message.count();
      const totalMemories = await (db as any).agentMemory.count();
      
      // Calculate last 7 days of mission activity
      const missionActivity = [];
      const memoryGrowth = [];
      const now = new Date();
      
      let cumulativeMemories = 0;
      
      for (let i = 6; i >= 0; i--) {
        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
        
        const dayMissions = await db.mission.count({
          where: { createdAt: { gte: startDate, lt: endDate } }
        });
        missionActivity.push(dayMissions);
        
        const dayMemories = await (db as any).agentMemory.count({
          where: { createdAt: { gte: startDate, lt: endDate } }
        });
        cumulativeMemories += dayMemories;
        memoryGrowth.push(cumulativeMemories);
      }
      
      return reply.send({
        stats: {
          totalUsers,
          totalMissions,
          totalMessages,
          totalMemories,
          missionActivity,
          memoryGrowth
        }
      });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch stats' });
    }
  });

  fastify.get('/memories', async (request, reply) => {
    try {
      const { search } = request.query as { search?: string };
      const whereClause = search ? {
        content: { contains: search, mode: 'insensitive' as const }
      } : {};

      const memories = await db.agentMemory.findMany({
        where: whereClause,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' }
      });
      return reply.send({ memories });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch agent memories' });
    }
  });

  fastify.get('/tools', async (request, reply) => {
    try {
      // Hardcoded list for now, ideally retrieved from Planner instance or registry
      const tools = [
        { name: 'read_file', description: 'Read file contents from workspace' },
        { name: 'write_file', description: 'Write or overwrite a file' },
        { name: 'edit_file', description: 'Make specific line edits to a file' },
        { name: 'delete_file', description: 'Delete a file' },
        { name: 'file_search', description: 'Search for files or text within files' },
        { name: 'run_command', description: 'Execute a shell command' },
        { name: 'update_working_memory', description: 'Update current state and plans' },
        { name: 'web_search', description: 'Search the internet for real-world knowledge' }
      ];
      return reply.send({ tools });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch tools' });
    }
  });
}
