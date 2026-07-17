import { FastifyInstance } from 'fastify';
import { db } from '@vedix/database';
import { verifyJWT, verifyAdmin } from '../middleware/auth';
import { memoryQueue } from '../queue/memoryQueue';

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
      const totalOldMemories = await (db as any).agentMemory.count();
      const totalNewMemories = await (db as any).userExplicitPreference.count();
      const totalMemories = totalOldMemories + totalNewMemories;
      
      // Calculate last 7 days of mission activity efficiently using GROUP BY
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const missionsByDay = await db.$queryRaw`
        SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*)::int as count
        FROM "Mission"
        WHERE "createdAt" >= ${sevenDaysAgo}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC;
      ` as any[];

      const memoriesByDay = await db.$queryRaw`
        SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*)::int as count
        FROM "AgentMemory"
        WHERE "createdAt" >= ${sevenDaysAgo}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date ASC;
      ` as any[];

      const missionActivity = new Array(7).fill(0);
      const memoryGrowth = new Array(7).fill(0);
      
      const now = new Date();
      let cumulativeMemories = 0;
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dayString = d.toISOString().split('T')[0];
        
        const mCount = missionsByDay.find(r => new Date(r.date).toISOString().split('T')[0] === dayString)?.count || 0;
        missionActivity[6 - i] = mCount;
        
        const memCount = memoriesByDay.find(r => new Date(r.date).toISOString().split('T')[0] === dayString)?.count || 0;
        cumulativeMemories += memCount;
        memoryGrowth[6 - i] = cumulativeMemories;
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
      
      // Fetch Old Agent Memories
      const oldWhereClause = search ? {
        content: { contains: search, mode: 'insensitive' as const }
      } : {};

      const oldMemories = await db.agentMemory.findMany({
        where: oldWhereClause,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch New User Explicit Preferences
      const newWhereClause = search ? {
        rule: { contains: search, mode: 'insensitive' as const }
      } : {};

      const newPreferences = await (db as any).userExplicitPreference.findMany({
        where: newWhereClause,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' }
      });

      // Map New Preferences to match the UI's Memory interface
      const mappedPreferences = newPreferences.map((pref: any) => ({
        id: pref.id,
        type: pref.category || 'PREFERENCE', // Maps category to type
        content: pref.rule, // Maps rule to content
        confidence: pref.confidence,
        status: pref.isActive ? 'APPROVED' : 'PENDING',
        createdAt: pref.createdAt,
        user: pref.user
      }));

      // Combine both lists and sort by date descending
      const allMemories = [...oldMemories, ...mappedPreferences].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return reply.send({ memories: allMemories });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch agent memories' });
    }
  });

  fastify.patch('/memories/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: 'APPROVED' | 'REJECTED' };
      
      if (!['APPROVED', 'REJECTED'].includes(status)) {
        return reply.code(400).send({ error: 'Invalid status. Must be APPROVED or REJECTED.' });
      }

      const updateData: any = { status };
      if (status === 'APPROVED') {
        updateData.confidence = 100; // Human explicit approval means 100% confidence
      }

      const memory = await db.agentMemory.update({
        where: { id },
        data: updateData
      });

      return reply.send({ success: true, memory });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to update memory status' });
    }
  });

  fastify.get('/tools', async (request, reply) => {
    try {
      // Tool list mirrors the exact tool names registered in MissionPlanner (Planner.ts)
      const tools = [
        { name: 'read_file',               description: 'Read file contents from workspace' },
        { name: 'write_file',              description: 'Create a new file or completely overwrite an existing file' },
        { name: 'update_file',             description: 'Make specific line edits to an existing file' },
        { name: 'delete_file',             description: 'Delete a file permanently' },
        { name: 'run_command',             description: 'Execute a shell command in the workspace root (requires approval)' },
        { name: 'git',                     description: 'Run git commands in the workspace root (requires approval)' },
        { name: 'semantic_search',         description: 'Semantic search over code snippets in the codebase' },
        { name: 'workspace_tree',          description: 'Get a tree view of the workspace directory structure' },
        { name: 'update_working_memory',   description: 'Persist the current task state and plan to working memory' },
        { name: 'syntax_checker',          description: 'Check a file for syntax errors' },
        { name: 'web_search',              description: 'Search the internet for real-world knowledge' },
        { name: 'system_info',             description: 'Retrieve hardware specifications and OS details' },
      ];
      return reply.send({ tools });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch tools' });
    }
  });

  fastify.get('/queue-stats', async (request, reply) => {
    try {
      const waiting = await memoryQueue.getWaitingCount();
      const active = await memoryQueue.getActiveCount();
      const completed = await memoryQueue.getCompletedCount();
      const failed = await memoryQueue.getFailedCount();
      
      const jobs = await memoryQueue.getJobs(['waiting', 'active', 'failed', 'delayed'], 0, 20);

      const formattedJobs = await Promise.all(jobs.map(async j => ({
        id: j.id,
        name: j.name,
        status: await j.getState(),
        data: j.data
      })));

      return reply.send({
        stats: { waiting, active, completed, failed },
        jobs: formattedJobs
      });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch queue stats' });
    }
  });

  fastify.get('/token-stats', async (request, reply) => {
    try {
      // Group by modelName
      const modelStats = await db.tokenLog.groupBy({
        by: ['modelName'],
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true
        }
      });
      
      // Group by service
      const serviceStats = await db.tokenLog.groupBy({
        by: ['service'],
        _sum: {
          totalTokens: true
        }
      });

      // Get last 7 days chart data
      const chartData = [];
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
        
        const dayTokens = await db.tokenLog.aggregate({
          where: { createdAt: { gte: startDate, lt: endDate } },
          _sum: { totalTokens: true }
        });
        chartData.push({
          date: startDate.toISOString().split('T')[0],
          tokens: dayTokens._sum.totalTokens || 0
        });
      }

      return reply.send({
        modelStats: modelStats.map((m: any) => ({ model: m.modelName, total: m._sum.totalTokens })),
        serviceStats: serviceStats.map((s: any) => ({ service: s.service, total: s._sum.totalTokens })),
        chartData
      });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch token stats' });
    }
  });
}
