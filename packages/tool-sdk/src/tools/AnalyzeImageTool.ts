import { Tool, ToolSchema } from '../Tool';
import axios from 'axios';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export class AnalyzeImageTool extends Tool {
  name = 'analyze_image';
  requiresApproval = false;
  description = 'Analyze an image URL using a high-speed Vision model. Use this tool when the user asks a question about an uploaded image (e.g. "What is this?", "Describe this").';
  
  schema: ToolSchema = {
    type: 'object',
    properties: {
      image_url: {
        type: 'string',
        description: 'The URL of the image to analyze. Must be a valid HTTP/HTTPS URL.'
      },
      question: {
        type: 'string',
        description: 'What you want to know about the image. Examples: "Describe this image in detail", "What text is written here?", "Are there any animals in this picture?"'
      }
    },
    required: ['image_url', 'question']
  };

  async execute(args: any): Promise<any> {
    const { image_url, question } = args;

    if (!image_url || !image_url.startsWith('http')) {
      throw new Error("A valid image_url starting with http/https is required.");
    }

    try {
      const mistralKey = process.env.MISTRAL_API_KEY;
      
      if (!mistralKey) {
        throw new Error("MISTRAL_API_KEY is missing. Cannot analyze image.");
      }

      let finalImageUrl = image_url;
      
      // If it's a local MinIO URL, the external API won't be able to fetch it.
      // We must fetch it locally and convert it to a Base64 data URI.
      if (image_url.includes('localhost') || image_url.includes('127.0.0.1')) {
        try {
          if (image_url.includes('vedix-media')) {
            const s3 = new S3Client({
              region: 'us-east-1',
              endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
              credentials: {
                accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
                secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
              },
              forcePathStyle: true
            });
            const urlObj = new URL(image_url);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);
            const bucket = pathParts[0];
            const key = pathParts.slice(1).join('/');
            
            const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
            const streamToBuffer = async (stream: any) => {
              const chunks = [];
              for await (const chunk of stream) chunks.push(chunk);
              return Buffer.concat(chunks);
            };
            const buffer = await streamToBuffer(obj.Body);
            const contentType = obj.ContentType || 'image/jpeg';
            const base64 = buffer.toString('base64');
            finalImageUrl = `data:${contentType};base64,${base64}`;
          } else {
            const imageResponse = await axios.get(image_url, { responseType: 'arraybuffer' });
            const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
            const base64 = Buffer.from(imageResponse.data).toString('base64');
            finalImageUrl = `data:${contentType};base64,${base64}`;
          }
        } catch (fetchErr: any) {
          throw new Error(`Failed to fetch localhost image: ${fetchErr.message}`);
        }
      }

      const enhancedQuestion = `You are a highly intelligent Vision AI. Look closely at the image provided. Answer the following user question about the image. 
CRITICAL: If the user's question contains an obvious typo (e.g., asking about "bread" when the image clearly shows a dog "breed"), intelligently infer their true intent based on the visual content. Do NOT hallucinate objects that are not in the image.

User Question: ${question}`;

      const response = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        {
          model: 'pixtral-12b-2409',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: enhancedQuestion },
                // Mistral API expects the image URL in this format
                { type: 'image_url', image_url: { url: finalImageUrl } }
              ]
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${mistralKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const message = response.data?.choices?.[0]?.message?.content;
      
      if (!message) {
        throw new Error("Vision model returned an empty response.");
      }

      return {
        success: true,
        analysis: message
      };
      
    } catch (err: any) {
      const errorData = err.response?.data;
      console.error('AnalyzeImageTool Error:', errorData || err.message);
      
      let detailedError = err.message;
      if (errorData?.error?.message) {
        detailedError = errorData.error.message;
      } else if (errorData?.message) {
        detailedError = errorData.message;
      } else if (errorData?.detail) {
        detailedError = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      }
      
      // Prevent massive base64 strings in validation errors from blowing up the agent's context
      if (detailedError && detailedError.length > 500) {
        detailedError = detailedError.substring(0, 500) + '... (error truncated)';
      }
      
      return {
        success: false,
        error: `Failed to analyze image: ${detailedError}`
      };
    }
  }
}
