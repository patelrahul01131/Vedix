import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@vedix/database';
import { decryptToken, encryptToken } from '../utils/encryption';
import { Tool, ToolSchema } from '../Tool';

const prisma = new PrismaClient();

export class GmailTool extends Tool {
  readonly name = 'gmail_tool';
  readonly description = 'Send an email using the user\'s connected Gmail account. Do not use this tool if the user asks to send an email but you don\'t have their explicit permission or if they haven\'t connected their Gmail.';
  readonly requiresApproval = true;

  readonly schema: ToolSchema = {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'The recipient email address' },
      subject: { type: 'string', description: 'The subject of the email' },
      body: { type: 'string', description: 'The plain text body of the email' }
    },
    required: ['to', 'subject', 'body']
  };

  private userId: string;

  constructor(userId: string) {
    super();
    this.userId = userId;
  }

  async execute(args: { to?: string, subject?: string, body?: string }): Promise<any> {
    const { to, subject, body } = args;
    
    if (!to || !subject || !body) {
      return { error: 'Missing required fields: to, subject, body. You must ask the user for these details if you don\'t have them.' };
    }

    try {
      const connection = await prisma.oAuthConnection.findUnique({
        where: {
          userId_provider: {
            userId: this.userId,
            provider: 'google'
          }
        }
      });
      
      console.log(`[GmailTool] Looking up connection for userId: ${this.userId}, provider: 'google'`);
      console.log(`[GmailTool] Found connection:`, connection);
      if (!connection) {
        const allConnections = await prisma.oAuthConnection.findMany();
        console.log(`[GmailTool] All connections in DB:`, allConnections);
      }

      if (!connection) {
        return { error: 'Not authenticated. Please connect your Google account in Settings.' };
      }

      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      let accessToken = decryptToken(connection.accessToken);
      const refreshToken = connection.refreshToken ? decryptToken(connection.refreshToken) : null;
      
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: connection.expiresAt ? connection.expiresAt.getTime() : undefined
      });

      // Auto-refresh token if expired (google-auth-library handles this automatically if refresh_token is set)
      oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
          await prisma.oAuthConnection.update({
            where: { id: connection.id },
            data: {
              accessToken: encryptToken(tokens.access_token),
              ...(tokens.refresh_token ? { refreshToken: encryptToken(tokens.refresh_token) } : {}),
              expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
            }
          });
        }
      });

      // Ensure we have a valid token
      let token: string | null | undefined;
      try {
        const result = await oauth2Client.getAccessToken();
        token = result.token;
      } catch (tokenErr: any) {
        console.error('Failed to get access token:', tokenErr);
        return { error: 'Your Google authentication has expired or is invalid. Please go to Settings to disconnect and reconnect your Google account.' };
      }

      if (!token) {
        return { error: 'Failed to retrieve access token. Re-authentication may be required.' };
      }

      // Construct raw email (RFC 2822 format)
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        body
      ].join('\r\n');
      
      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      // Call Gmail API
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Gmail API Error:', data);
        return { error: `Failed to send email: ${data.error?.message || 'Unknown error'}` };
      }

      return { success: true, messageId: data.id };
    } catch (error: any) {
      console.error('Gmail Tool Error:', error);
      return { error: error.message || 'An unexpected error occurred while sending the email' };
    }
  }
}
