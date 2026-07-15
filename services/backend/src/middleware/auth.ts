import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '@vedix/database';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    '[FATAL] JWT_SECRET environment variable is not set. ' +
    'The server cannot start without a secret key. ' +
    'Add JWT_SECRET=<a long random string> to services/backend/.env'
  );
}

export const verifyJWT = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    
    // Attach user to request
    (request as any).user = decoded;
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
};

export const verifyApiKey = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing API Key in Authorization header' });
    }

    const key = authHeader.split(' ')[1];
    const apiKey = await db.apiKey.findUnique({
      where: { key },
      include: { user: true }
    });

    if (!apiKey) {
      return reply.code(401).send({ error: 'Invalid API Key' });
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return reply.code(401).send({ error: 'API Key expired' });
    }

    // Attach user to request
    (request as any).user = { id: apiKey.userId, role: apiKey.user.role };
  } catch (error) {
    return reply.code(401).send({ error: 'Authentication failed' });
  }
};

export const verifyAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;
  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Requires admin privileges' });
  }
};
