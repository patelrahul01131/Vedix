import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat';
import { oauthRoutes } from './routes/oauth';
import { MemoryWorker } from './memory/MemoryWorker';

dotenv.config({ path: '../../.env' });

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty'
    }
  }
});

async function start() {
  try {
    await fastify.register(cors, {
      origin: true
    });

    // Register routes
    await fastify.register(chatRoutes, { prefix: '/api/web' });
    await fastify.register(oauthRoutes, { prefix: '/api/web' });

    // Start background processes
    MemoryWorker.start();

    const port = 3002;
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Vedix Web Backend listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
