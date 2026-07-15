import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { EventBus } from './EventBus';
import { MissionPlanner } from './Planner';
import { logger } from './logger';
import { db } from '@vedix/database';
import { memoryQueue } from './queue/memoryQueue'; // Queue already started by this import

import authRoutes from './routes/auth';
import apiKeyRoutes from './routes/apiKeys';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';

const server = fastify({ logger: true });

server.register(cors, { origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'] });
server.register(websocket);
server.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute'
});

// Register API Routes
server.register(authRoutes, { prefix: '/api/auth' });
server.register(apiKeyRoutes, { prefix: '/api/keys' });
server.register(adminRoutes, { prefix: '/api/admin' });
server.register(userRoutes, { prefix: '/api/user' });

// Global planner removed to prevent cross-user state leakage.
// EventBus and MissionPlanner are now instantiated per-connection.

server.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, async (connection, req) => {
    server.log.info('Client connected to WebSockets');
    
    // Validate API Key
    const apiKeyStr = (req.query as any).apiKey;
    if (!apiKeyStr) {
      connection.socket.send(JSON.stringify({ type: 'error', payload: 'Missing API Key. Please configure your API key in VSCode settings.' }));
      connection.socket.close(1008, 'Missing API Key');
      return;
    }
    
    const apiKey = await db.apiKey.findUnique({ where: { key: apiKeyStr }, include: { user: true } });
    if (!apiKey || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
      connection.socket.send(JSON.stringify({ type: 'error', payload: 'Invalid or expired API Key. Please authenticate with a valid key.' }));
      connection.socket.close(1008, 'Invalid API Key');
      return;
    }

    // Attach user to connection or req for further use if needed
    (connection as any).user = apiKey.user;

    // Instantiate per-connection EventBus and Planner for state isolation
    const eventBus = new EventBus();
    const planner = new MissionPlanner(eventBus);

    // Forward events from the EventBus to the WebSocket client
    const onAgentStatus = (status: string) => {
      connection.socket.send(JSON.stringify({ type: 'status', payload: status }));
    };
    
    const onAgentMessage = (message: any) => {
      connection.socket.send(JSON.stringify({ type: 'message', payload: message }));
    };

    const onDebugData = (data: any) => {
      connection.socket.send(JSON.stringify({ type: 'debugData', payload: data }));
    };

    const onSessionSwitched = async (id: string) => {
      connection.socket.send(JSON.stringify({ type: 'sessionSwitched', payload: id }));
      const userId = (connection as any).user.id;
      // Also update the list of sessions
      const sessions = await db.mission.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
      connection.socket.send(JSON.stringify({ type: 'sessionsList', payload: sessions }));
    };

    eventBus.on('status', onAgentStatus);
    eventBus.on('message', onAgentMessage);
    eventBus.on('debugData', onDebugData);
    eventBus.on('sessionSwitched', onSessionSwitched);
    
    const onToken = (token: string) => {
      connection.socket.send(JSON.stringify({ type: 'token', payload: token }));
    };
    
    const onActivity = (activity: any) => {
      connection.socket.send(JSON.stringify({ type: 'activity', payload: activity }));
    };

    eventBus.on('token', onToken);
    eventBus.on('activity', onActivity);

    connection.socket.on('message', async (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        server.log.info(`Received from client: ${JSON.stringify(data)}`);
        
        const userId = (connection as any).user.id;
        
        if (data.command === 'getSessions') {
          const sessions = await db.mission.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
          connection.socket.send(JSON.stringify({ type: 'sessionsList', payload: sessions }));
        }

        if (data.command === 'createSession') {
          const newSession = await db.mission.create({ data: { title: 'New Conversation', userId } });
          const sessions = await db.mission.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
          connection.socket.send(JSON.stringify({ type: 'sessionsList', payload: sessions }));
          // Auto-select the newly created session
          connection.socket.send(JSON.stringify({ type: 'sessionSwitched', payload: newSession.id }));
        }

        if (data.command === 'getSessionMessages') {
          if (data.sessionId) {
            const dbMsgs = await db.message.findMany({ where: { missionId: data.sessionId }, orderBy: { createdAt: 'asc' } });
            const formatted = dbMsgs.map((m: any) => {
              let text = m.content;
              if (m.role === 'agent' && typeof text === 'string' && (text.startsWith('[') || text.startsWith('{'))) {
                try {
                  const parsed = JSON.parse(text);
                  if (Array.isArray(parsed)) {
                    const textParts = parsed.filter((p: any) => p.type === 'text').map((p: any) => p.text);
                    text = textParts.join('\n');
                  }
                } catch(e) {}
              }
              let sources = undefined;
              if ((m as any).sources) {
                try {
                  sources = JSON.parse((m as any).sources);
                } catch(e) {}
              }
              return { role: m.role, text: text, sources: sources };
            });
            const mission = await db.mission.findUnique({ where: { id: data.sessionId } });
            const cleaned = formatted.filter((m: any) => !(m.role === 'agent' && (!m.text || typeof m.text !== 'string' || m.text.trim() === '')));
            
            if (mission?.summary) {
              cleaned.unshift({
                role: 'system',
                text: `**Summarized Context**\n\n${mission.summary}`,
                isSummary: true
              } as any);
            }

            connection.socket.send(JSON.stringify({ type: 'sessionMessages', payload: cleaned }));
          }
        }

        if (data.command === 'updateSessionTitle') {
          if (data.sessionId && data.title) {
            await db.mission.update({ where: { id: data.sessionId }, data: { title: data.title } });
            const sessions = await db.mission.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
            connection.socket.send(JSON.stringify({ type: 'sessionsList', payload: sessions }));
          }
        }

        if (data.command === 'deleteSession') {
          if (data.sessionId) {
            await db.mission.delete({ where: { id: data.sessionId } });
            const sessions = await db.mission.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
            connection.socket.send(JSON.stringify({ type: 'sessionsList', payload: sessions }));
          }
        }

        if (data.command === 'getSkills') {
          const skills = await (db as any).agentMemory.findMany({ 
            where: { userId, status: 'APPROVED' },
            orderBy: { confidence: 'desc' }
          });
          connection.socket.send(JSON.stringify({ type: 'skillsList', payload: skills }));
        }

        if (data.command === 'addSkill') {
          if (data.content) {
            // Need to generate embedding inline since this is manual injection
            let embedding = null;
            try {
               const { ModelGateway } = require('@vedix/model-gateway');
               const gw = new ModelGateway('mistral-large-latest');
               const embedRes = await gw.embed(data.content);
               embedding = embedRes.embedding;
            } catch(e) {}
            
            await (db as any).agentMemory.create({
              data: {
                userId,
                type: 'SKILL',
                content: data.content,
                status: 'APPROVED', // Manually added skills skip PENDING
                confidence: 100, // Max confidence
                embedding
              }
            });
            const skills = await (db as any).agentMemory.findMany({ where: { userId, status: 'APPROVED' }, orderBy: { confidence: 'desc' } });
            connection.socket.send(JSON.stringify({ type: 'skillsList', payload: skills }));
          }
        }

        if (data.command === 'deleteSkill') {
          if (data.skillId) {
            await (db as any).agentMemory.delete({ where: { id: data.skillId } });
            const skills = await (db as any).agentMemory.findMany({ where: { userId, status: 'APPROVED' }, orderBy: { confidence: 'desc' } });
            connection.socket.send(JSON.stringify({ type: 'skillsList', payload: skills }));
          }
        }

        if (data.command === 'getModels') {
          const models = [
            // OpenRouter
            'openrouter:qwen/qwen3-next-80b-a3b-instruct:free',
            'openrouter:poolside/laguna-m.1:free',
            'openrouter:cohere/north-mini-code:free',
            'openrouter:nvidia/nemotron-3-super-120b-a12b:free',
            'openrouter:openai/gpt-oss-120b:free',
            'openrouter:meta-llama/llama-3.3-70b-instruct:free',
            'openrouter:google/gemma-4-31b-it:free',
            // DeepSeek
            'deepseek:deepseek-chat', // DeepSeek-V4
            'deepseek:deepseek-reasoner', // DeepSeek-R1
            // Gemini
            'gemini:gemini-2.5-flash',
            'gemini:gemini-3-flash',
            'gemini:gemini-3.5-flash',
            'gemini:gemini-3-pro',
            'gemini:gemini-2.5-pro',
            // GitHub
            'github:gpt-4o',
            'github:gpt-4o-mini',
            'github:gpt-4.1',
            'github:gpt-4.1-mini',
            'github:phi-4-mini',
            'github:phi-3.5-moe',
            'github:phi-3.5-vision',
            'github:llama-3.3',
            'github:llama-4-scout-109b',
            'github:llama-4-maverick-402b',
            'github:deepseek-v4',
            'github:deepseek-v4-flash',
            'github:mistral-small-4',
            'github:mistral-large-2',
            'github:codestral',
            'github:gemma-4-31b',
            'github:gemma-4-26b-moe',
            'github:command-r-plus',
            'github:command-a-plus',
            // Ollama
            'ollama:gpt-oss:20b-cloud',
            'ollama:gpt-oss:120b-cloud',
            'ollama:minimax-m2:cloud',
            'ollama:glm-4.7:cloud',
            // Groq
            'groq:llama-3.1-8b-instant',
            'groq:llama-3.3-70b-versatile',
            'groq:openai/gpt-oss-120b',
            'groq:openai/gpt-oss-20b',
            'groq:qwen/qwen3-32b',
            'groq:meta-llama/llama-4-scout-17b-16e-instruct',
            'groq:openai/gpt-oss-safeguard-20b',
            // Mistral
            'mistral:mistral-medium-3-5',
            'mistral:mistral-small-2603',
            'mistral:devstral-2512',
            'mistral:mistral-large-2512',
            'mistral:ministral-14b-2512',
            'mistral:ministral-8b-2512',
            'mistral:ministral-3b-2512',
            'mistral:codestral-2508'
          ];
          connection.socket.send(JSON.stringify({ type: 'modelsList', payload: models }));
        }

        if (data.command === 'sendMessage') {
          // Pass the dynamic model to the planner if provided
          if (data.model) {
             planner.gateway.modelName = data.model; // Hacky but works for demo
          }
          if (data.workspaceRoot) {
            planner.workspaceRoot = data.workspaceRoot; // Use instance property, NOT process.env
          }

          if (data.text.toLowerCase() === 'approve') {
            planner.resolveApproval(true);
          } else if (data.text.toLowerCase() === 'decline') {
            planner.resolveApproval(false);
          } else {
            planner.planMission(data.text, data.sessionId, userId).catch(err => server.log.error(err));
          }
        }
        
        if (data.command === 'resolveApproval') {
          planner.resolveApproval(data.approved === true);
        }
      } catch (err) {
        server.log.error('Failed to parse WebSocket message');
      }
    });

    // Notify client that authentication is complete and we are ready to receive messages
    connection.socket.send(JSON.stringify({ type: 'authenticated' }));

    connection.socket.on('close', () => {
      server.log.info('Client disconnected');
      // Auto-decline any pending approval to prevent leaked promises
      // when a user disconnects while the agent is waiting for permission.
      planner.resolveApproval(false);
      eventBus.off('status', onAgentStatus);
      eventBus.off('message', onAgentMessage);
      eventBus.off('debugData', onDebugData);
      eventBus.off('sessionSwitched', onSessionSwitched);
      eventBus.off('token', onToken);
      eventBus.off('activity', onActivity);
    });
  });
});

server.get('/health', async (request, reply) => {
  try {
    await db.$queryRaw`SELECT 1`;
    // If Redis is down, BullMQ operations will fail, so we should check it too if possible,
    // but a DB check is the bare minimum for health.
    return { status: 'ok', service: 'vedix-backend' };
  } catch (error) {
    return reply.code(503).send({ status: 'error', message: 'Database unreachable' });
  }
});

const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' });
    logger.info('Vedix Backend is running on http://localhost:3001');
    logger.info('WebSocket listening on ws://localhost:3001/ws');

    // Migration safety: enqueue any PENDING memories that existed before the
    // event-driven critic system was deployed. New memories are reviewed
    // immediately via BullMQ jobs triggered by MemoryExtractor — no polling.
    const pendingMemories = await db.agentMemory.findMany({
      where: { status: 'PENDING' },
      select: { id: true }
    });
    if (pendingMemories.length > 0) {
      const memoryIds = pendingMemories.map((m: any) => m.id);
      await memoryQueue.add('reviewMemoryBatch', { memoryIds }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 }
      });
      logger.info(`[Startup] Enqueued ${memoryIds.length} pre-existing PENDING memories for critic review.`);
    }
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
