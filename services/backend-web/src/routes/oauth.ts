import { FastifyInstance } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@vedix/database';
import { encryptToken } from '@vedix/tool-sdk/src/utils/encryption';

const prisma = new PrismaClient();

const REDIRECT_URI = 'http://localhost:3002/api/web/oauth/callback/google';

const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly'
];

export async function oauthRoutes(fastify: FastifyInstance) {
  
  fastify.get('/oauth/connect/google', async (request, reply) => {
    // Ideally user is authenticated and we know their ID via session.
    // Since web auth isn't fully locked down yet, we expect userId in query for this demo,
    // OR we just use a default test userId from the database.
    const { userId } = request.query as { userId?: string };

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return reply.status(500).send({ error: 'Google OAuth is not configured on the server' });
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to ensure we get a refresh token
      state: userId // pass userId in state so we know who to tie it to on callback
    });

    return reply.redirect(authorizeUrl);
  });

  fastify.get('/oauth/callback/google', async (request, reply) => {
    const { code, state } = request.query as { code: string; state?: string };

    if (!code) {
      return reply.status(400).send({ error: 'Missing code from Google' });
    }

    try {
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
      );

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Get user info (email, ID)
      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const googleId = payload?.sub;
      const email = payload?.email;

      if (!googleId) {
        throw new Error('Could not get Google user ID');
      }

      // If state is not provided, fallback to finding the first user (for demo purposes)
      let userId = state;
      if (!userId || userId === 'undefined') {
        const firstUser = await prisma.user.findFirst();
        userId = firstUser?.id;
      }

      if (!userId) {
        return reply.status(400).send({ error: 'Could not resolve Vedix user to attach connection' });
      }

      const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
      
      const encryptedAccess = encryptToken(tokens.access_token!);
      let encryptedRefresh = null;
      if (tokens.refresh_token) {
        encryptedRefresh = encryptToken(tokens.refresh_token);
      }

      // Upsert the connection in DB
      await prisma.oAuthConnection.upsert({
        where: {
          userId_provider: {
            userId: userId,
            provider: 'google'
          }
        },
        create: {
          userId: userId,
          provider: 'google',
          providerId: googleId,
          email: email,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          expiresAt: expiresAt
        },
        update: {
          providerId: googleId,
          email: email,
          accessToken: encryptedAccess,
          ...(encryptedRefresh ? { refreshToken: encryptedRefresh } : {}), // only update refresh token if provided
          expiresAt: expiresAt
        }
      });
      
      // Update the user's web settings to indicate gmail is enabled
      await prisma.webUserSettings.update({
        where: { userId: userId },
        data: { gmailEnabled: true }
      });

      // Redirect back to the web frontend settings page
      return reply.redirect('http://localhost:5175/settings?connected=google');
    } catch (err) {
      console.error('OAuth Callback Error:', err);
      return reply.status(500).send({ error: 'Failed to complete OAuth flow' });
    }
  });
}
