import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@vedix/database';
import { WebPlanner } from '../WebPlanner';
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();
const planner = new WebPlanner();

export default async function chatRoutes(fastify: FastifyInstance) {
  
  fastify.get('/chat/history', async (request, reply) => {
    try {
      const history = await prisma.webMission.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { messages: true } } }
      });
      return { success: true, history };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch history' });
    }
  });

  fastify.get('/chat/history/:missionId', async (request, reply) => {
    const { missionId } = request.params as { missionId: string };
    try {
      const messages = await prisma.webMessage.findMany({
        where: { missionId },
        orderBy: { createdAt: 'asc' }
      });

      const formattedMessages = messages
        .filter(m => m.role !== 'tool')
        .map(m => {
          let text = m.content;
          if ((m.role === 'assistant' || m.role === 'agent') && typeof text === 'string' && (text.startsWith('[') || text.startsWith('{'))) {
            try {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed)) {
                const textParts = parsed.filter((p: any) => p.type === 'text').map((p: any) => p.text);
                text = textParts.join('\n');
              }
            } catch(e) {}
          }
          return {
            id: m.id,
            role: m.role === 'agent' ? 'assistant' : m.role,
            content: (text || '').trim(),
            createdAt: m.createdAt
          };
        })
        .filter(m => m.content.length > 0);

      return { success: true, messages: formattedMessages };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch messages' });
    }
  });

  fastify.put('/chat/history/:missionId', async (request, reply) => {
    const { missionId } = request.params as { missionId: string };
    const { title } = request.body as { title: string };
    try {
      const updated = await prisma.webMission.update({
        where: { id: missionId },
        data: { title }
      });
      return { success: true, mission: updated };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to update mission' });
    }
  });

  fastify.delete('/chat/history/:missionId', async (request, reply) => {
    const { missionId } = request.params as { missionId: string };
    try {
      const messages = await prisma.webMessage.findMany({ where: { missionId } });
      const minioKeys: string[] = [];
      const bucketName = process.env.MINIO_BUCKET || 'vedix-media';
      const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
      const minioPrefix = `${endpoint}/${bucketName}/`;

      for (const msg of messages) {
        if (typeof msg.content === 'string') {
          const regex = new RegExp(`${minioPrefix}([^\\s\\)\\]]+)`, 'g');
          let match;
          while ((match = regex.exec(msg.content)) !== null) {
            minioKeys.push(match[1]);
          }
        } else if (msg.content) {
            const strContent = JSON.stringify(msg.content);
            const regex = new RegExp(`${minioPrefix}([^\\s\\)\\]\\"]+)`, 'g');
            let match;
            while ((match = regex.exec(strContent)) !== null) {
                minioKeys.push(match[1]);
            }
        }
      }

      if (minioKeys.length > 0) {
        const s3Client = new S3Client({
          region: 'us-east-1',
          endpoint,
          credentials: {
            accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
          },
          forcePathStyle: true
        });
        
        await s3Client.send(new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: minioKeys.map(key => ({ Key: key }))
          }
        })).catch((err: any) => fastify.log.error('MinIO cleanup failed:', err));
      }

      await prisma.webMission.delete({
        where: { id: missionId }
      });
      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to delete mission' });
    }
  });

  fastify.get('/chat/models', async (request, reply) => {
    // Hardcoded list matching the VS Code extension for simplicity
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
    return { models };
  });

  fastify.post('/chat/message', async (request, reply) => {
    const { message, missionId, modelName, attachmentsBase64 } = request.body as { message: string, missionId?: string, modelName?: string, attachmentsBase64?: string[] };
    
    let finalMessage = message;

    if (attachmentsBase64 && attachmentsBase64.length > 0) {
      for (const base64Str of attachmentsBase64) {
        if (base64Str.startsWith('http://') || base64Str.startsWith('https://')) {
          // Handle cross-tab dragged URLs directly without uploading to MinIO
          finalMessage += `\n\n[Reference Image](${base64Str})`;
        } else {
        try {
          const s3Client = new S3Client({
            region: 'us-east-1',
            endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
            credentials: {
              accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
              secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
            },
            forcePathStyle: true
          });
          const bucketName = process.env.MINIO_BUCKET || 'vedix-media';
          
          const base64Data = base64Str.replace(/^data:[\w-]+\/[\w\-\.\+]+;base64,/, '');
          const mimeMatch = base64Str.match(/^data:([\w-]+\/[\w\-\.\+]+);base64,/);
          const contentType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
          const buffer = Buffer.from(base64Data, 'base64');
          
          let ext = 'bin';
          if (contentType.startsWith('image/')) ext = contentType.split('/')[1];
          else if (contentType === 'application/pdf') ext = 'pdf';
          else if (contentType.includes('word')) ext = 'docx';
          else if (contentType.includes('presentation')) ext = 'pptx';
          else if (contentType.includes('text/')) ext = 'txt';

          const filename = `uploads/ref_${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;

          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: buffer,
            ContentType: contentType
          }));

          const minioUrl = `${process.env.MINIO_ENDPOINT || 'http://localhost:9000'}/${bucketName}/${filename}`;
          const isImage = contentType.startsWith('image/');
          const prefixText = isImage ? `![Reference Image]` : `[Attachment - ${ext.toUpperCase()}]`;
          finalMessage += `\n\n${prefixText}(${minioUrl})`;
        } catch (err: any) {
          fastify.log.error('Failed to upload attachment:', err.message);
        }
      }
      }
    }

    // Save user message to database
    // We assume missionId is provided or we create a default one
    let currentMissionId = missionId;
    if (!currentMissionId) {
      const newMission = await prisma.webMission.create({
        data: { title: 'New Conversation' }
      });
      currentMissionId = newMission.id;
    }

    await prisma.webMessage.create({
      data: {
        role: 'user',
        content: finalMessage,
        missionId: currentMissionId
      }
    });

    // Fetch history for context
    const dbMessages = await prisma.webMessage.findMany({
      where: { missionId: currentMissionId },
      orderBy: { createdAt: 'asc' }
    });

    const aiMessages = dbMessages
      .filter(msg => {
        if (!msg.content || msg.content.trim().length === 0) return false;
        if (msg.role === 'tool') return false; // Drop tool results from history

        let parsedContent: any = msg.content;
        if (typeof msg.content === 'string' && (msg.content.startsWith('[') || msg.content.startsWith('{'))) {
          try {
            parsedContent = JSON.parse(msg.content);
          } catch (e) {
            // keep as string
          }
        }

        if ((msg.role === 'agent' || msg.role === 'assistant') && Array.isArray(parsedContent)) {
          // If the assistant message only has tool-calls (no text), drop it from history
          const hasText = parsedContent.some((p: any) => p.type === 'text' && p.text && p.text.trim().length > 0);
          if (!hasText) return false;
        }

        return true;
      })
      .map(msg => {
        let parsedContent: any = msg.content;
        if (typeof msg.content === 'string' && (msg.content.startsWith('[') || msg.content.startsWith('{'))) {
          try {
            parsedContent = JSON.parse(msg.content);
          } catch (e) {
            // keep as string
          }
        }

        if ((msg.role === 'agent' || msg.role === 'assistant') && Array.isArray(parsedContent)) {
          // Strip tool-calls from history, leaving only the text conversation
          parsedContent = parsedContent.filter((p: any) => p.type === 'text');
        }

        return {
          role: msg.role === 'agent' || msg.role === 'assistant' ? 'assistant' : msg.role as 'user' | 'assistant' | 'system',
          content: parsedContent
        };
      });

    // Set up Server-Sent Events (SSE) headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    try {
      // Fetch user settings to see which tools are enabled
      let settings: any = await prisma.webUserSettings.findFirst();
      const enabledConnectors = {
        gmail: settings?.gmailEnabled || false,
        canva: settings?.canvaEnabled || false
      };

      // Send missionId as the first event so frontend can track it
      reply.raw.write(`event: missionId\ndata: {"missionId":"${currentMissionId}"}\n\n`);

      // Execute the planner and stream tokens via callback
      const { finalResponseText, generatedMessages } = await planner.execute(
        aiMessages, 
        (token: string) => {
          const payload = JSON.stringify({ token });
          reply.raw.write(`data: ${payload}\n\n`);
        }, 
        modelName,
        enabledConnectors,
        (activity: any) => {
          const payload = JSON.stringify(activity);
          reply.raw.write(`event: activity\ndata: ${payload}\n\n`);
        },
        settings?.userId
      );
      
      // Save all generated messages (assistant + tool calls/results) to DB
      for (let i = 0; i < generatedMessages.length; i++) {
        const msg = generatedMessages[i];
        await prisma.webMessage.create({
          data: {
            role: msg.role === 'assistant' ? 'assistant' : msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            missionId: currentMissionId,
            createdAt: new Date(Date.now() + i)
          }
        });
      }

      // If there's text that wasn't included in the messages block (fallback)
      // Actually generatedMessages should already include the text. 
      // But we can ensure finalResponseText is handled if generatedMessages didn't capture the final text properly.
      // We will skip inserting finalResponseText duplicate if generatedMessages covered it.
      
      reply.raw.write('event: end\ndata: {}\n\n');
      reply.raw.end();
    } catch (error: any) {
      fastify.log.error(error);
      const errorMessage = error?.message || "Stream failed";
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`);
      reply.raw.end();
    }
  });

  fastify.get('/user/connectors', async (request, reply) => {
    try {
      // For simplicity, assuming a single user or fetching the first one
      let settings: any = await prisma.webUserSettings.findFirst();
      if (!settings) {
        // Create dummy user settings if none exist
        const dummyUser = await prisma.user.findFirst();
        if (dummyUser) {
          settings = (await prisma.webUserSettings.create({ data: { userId: dummyUser.id } })) as any;
        }
      }
      
      return { 
        success: true, 
        connectors: { 
          gmail: settings?.gmailEnabled || false, 
          canva: settings?.canvaEnabled || false 
        } 
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch connectors' });
    }
  });

  fastify.post('/user/connectors', async (request, reply) => {
    const { connector, enabled } = request.body as { connector: 'gmail' | 'canva', enabled: boolean };
    try {
      let settings: any = await prisma.webUserSettings.findFirst();
      if (settings) {
        await prisma.webUserSettings.update({
          where: { id: settings.id },
          data: {
            gmailEnabled: connector === 'gmail' ? enabled : undefined,
            canvaEnabled: connector === 'canva' ? enabled : undefined,
          } as any
        });
      }
      return { success: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to update connectors' });
    }
  });
}
