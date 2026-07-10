import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '@vedix/database';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const { email, password } = request.body as any;
    
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    try {
      const existingUser = await db.user.findUnique({ where: { email } });
      if (existingUser) {
        return reply.code(400).send({ error: 'Email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      // First user is admin for convenience
      const userCount = await db.user.count();
      const role = userCount === 0 ? 'ADMIN' : 'USER';

      const user = await db.user.create({
        data: {
          email,
          passwordHash,
          role
        }
      });

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return reply.send({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    try {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return reply.send({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
