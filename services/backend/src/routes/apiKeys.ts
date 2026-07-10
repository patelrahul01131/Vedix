import { FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { db } from '@vedix/database';
import { verifyJWT } from '../middleware/auth';

export default async function apiKeyRoutes(fastify: FastifyInstance) {
  // Allow verification without JWT
  fastify.get('/verify', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Missing API Key in Authorization header' });
      }
      const keyStr = authHeader.split(' ')[1];
      const apiKey = await db.apiKey.findUnique({ where: { key: keyStr }, include: { user: true } });
      
      if (!apiKey || (apiKey.expiresAt && apiKey.expiresAt < new Date())) {
        return reply.code(401).send({ valid: false });
      }
      return reply.send({ valid: true, user: { id: apiKey.user.id, email: apiKey.user.email } });
    } catch (e) {
      return reply.code(401).send({ valid: false });
    }
  });

  // Do not use addHook here because it applies to all routes in the plugin, including /verify.
  // Instead, use route-level preHandler.

  fastify.get('/', { preHandler: verifyJWT }, async (request, reply) => {
    const user = (request as any).user;
    try {
      const keys = await db.apiKey.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, key: true, createdAt: true, expiresAt: true }
      });
      return reply.send({ apiKeys: keys });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch API keys' });
    }
  });

  fastify.post('/generate', { preHandler: verifyJWT }, async (request, reply) => {
    const user = (request as any).user;
    const { name, expiresInDays } = request.body as any;

    try {
      // Generate a secure random key
      const keyStr = 'vdx_' + randomBytes(32).toString('hex');
      
      let expiresAt: Date | null = null;
      if (expiresInDays && expiresInDays > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
      }

      const newKey = await db.apiKey.create({
        data: {
          name: name || 'Default Key',
          key: keyStr,
          userId: user.id,
          expiresAt
        }
      });

      return reply.send({ apiKey: newKey });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to generate API key' });
    }
  });

  fastify.delete('/:id', { preHandler: verifyJWT }, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as any;

    try {
      // Ensure the key belongs to the user before deleting
      const key = await db.apiKey.findFirst({ where: { id, userId: user.id } });
      if (!key) {
        return reply.code(404).send({ error: 'API key not found' });
      }

      await db.apiKey.delete({ where: { id } });
      return reply.send({ success: true });
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to revoke API key' });
    }
  });
}
