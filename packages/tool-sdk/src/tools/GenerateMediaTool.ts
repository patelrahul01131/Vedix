import { Tool, ToolSchema } from '../Tool';
import axios from 'axios';
import FormData from 'form-data';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export class GenerateMediaTool extends Tool {
  name = 'generate_media';
  description = 'Generates an image or video based on a text prompt using a self-hosted ComfyUI pipeline. Requires user approval before execution.';
  requiresApproval = true;

  schema: ToolSchema = {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The highly detailed visual description of the image to generate. THIS IS REQUIRED. DO NOT SEND AN EMPTY OBJECT. You must describe exactly what you want the image to look like. YOU MUST ACT AS A PROMPT ENGINEER: Expand short user requests into highly detailed, descriptive, and visually rich paragraphs. Focus on lighting, style, medium, subject details, and environment.'
      },
      negative_prompt: {
        type: 'string',
        description: 'What NOT to include in the image. If the user asks to remove something (e.g., "without umbrella"), DO NOT put "without umbrella" in the main prompt. Instead, put "umbrella" here.'
      },
      reference_image_url: {
        type: 'string',
        description: 'Optional URL of a reference image to base the generation on. Use this if the user uploaded an image in the chat, or if you found an image via web search that perfectly captures the desired visual style or subject.'
      },
      type: {
        type: 'string',
        enum: ['image', 'video'],
        description: 'The type of media to generate. Defaults to image.'
      }
    },
    required: ['prompt']
  };

  async execute(args: any): Promise<any> {
    const { prompt, negative_prompt, type = 'image', reference_image_url } = args;
    
    if (type === 'video') {
      throw new Error("Video generation workflow is not currently configured. Please request an image.");
    }
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new Error("You MUST provide the 'prompt' argument. Please call this tool again with a detailed 'prompt' string describing the image.");
    }

    let actualPrompt = prompt;
    let extraNegative = '';

    // Smart fallback: If the LLM didn't use the negative_prompt field but included "without X" in the prompt, automatically extract it.
    const withoutMatch = actualPrompt.match(/without\s+(?:an?\s+|any\s+)?([^,.]+)/i);
    if (withoutMatch) {
      extraNegative = withoutMatch[1].trim();
      actualPrompt = actualPrompt.replace(withoutMatch[0], '').trim();
      // Clean up dangling words at the end like "with" or "and" if they preceded "without"
      actualPrompt = actualPrompt.replace(/\s+(with|and)$/i, '').trim();
    }

    const baseNegative = negative_prompt ? `${negative_prompt}, ` : '';
    const autoNegative = extraNegative ? `${extraNegative}, ` : '';
    const actualNegativePrompt = `${baseNegative}${autoNegative}blurry, low quality, deformed, ugly`;
    const actualType = type || 'image';
    const host = process.env.COMFYUI_HOST || 'http://localhost:8188';

    // Since ComfyUI is not yet running, we will mock the response structure or attempt to connect and catch.
    try {
      // In a real ComfyUI workflow, you would post a JSON payload representing the node graph.
      // For now, we simulate a successful queue if the server is not ready, or make a basic POST request.
      
      let comfyUploadedFileName: string | null = null;
      if (reference_image_url) {
        try {
          // Download the reference image
          const imgResponse = await axios.get(reference_image_url, { responseType: 'arraybuffer' });
          const imgBuffer = Buffer.from(imgResponse.data);
          
          // Upload to ComfyUI
          const formData = new FormData();
          formData.append('image', imgBuffer, { filename: 'reference.png', contentType: 'image/png' });
          formData.append('overwrite', 'true');
          
          const uploadRes = await axios.post(`${host}/upload/image`, formData, {
            headers: formData.getHeaders()
          });
          
          if (uploadRes.data && uploadRes.data.name) {
            comfyUploadedFileName = uploadRes.data.name;
          }
        } catch (err: any) {
          console.warn('Failed to fetch or upload reference image to ComfyUI', err.message);
        }
      }

      // Build the dynamic payload
      const payload: any = {
        prompt: {
          "3": {
            "class_type": "KSampler",
            "inputs": {
              "seed": Math.floor(Math.random() * 10000000),
              "steps": comfyUploadedFileName ? 20 : 1, // Usually need more steps for Img2Img, but keeping it simple for turbo
              "cfg": 1.0,
              "sampler_name": "euler_ancestral",
              "scheduler": "karras",
              "denoise": comfyUploadedFileName ? 0.75 : 1,
              "model": ["4", 0],
              "positive": ["6", 0],
              "negative": ["7", 0],
              "latent_image": comfyUploadedFileName ? ["11", 0] : ["5", 0]
            }
          },
          "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
              "ckpt_name": "sd_xl_turbo_1.0_fp16.safetensors"
            }
          },
          "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
              "text": actualPrompt,
              "clip": ["4", 1]
            }
          },
          "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
              "text": actualNegativePrompt,
              "clip": ["4", 1]
            }
          },
          "8": {
            "class_type": "VAEDecode",
            "inputs": {
              "samples": ["3", 0],
              "vae": ["4", 2]
            }
          },
          "9": {
            "class_type": "SaveImage",
            "inputs": {
              "filename_prefix": "ComfyUI",
              "images": ["8", 0]
            }
          }
        }
      };

      if (comfyUploadedFileName) {
        // Add Img2Img nodes
        payload.prompt["10"] = {
          "class_type": "LoadImage",
          "inputs": {
            "image": comfyUploadedFileName
          }
        };
        payload.prompt["11"] = {
          "class_type": "VAEEncode",
          "inputs": {
            "pixels": ["10", 0],
            "vae": ["4", 2]
          }
        };
      } else {
        // Add Txt2Img node
        payload.prompt["5"] = {
          "class_type": "EmptyLatentImage",
          "inputs": {
            "width": 512,
            "height": 512,
            "batch_size": 1
          }
        };
      }

      const response = await axios.post(`${host}/prompt`, payload, {
        timeout: 10000 // 10 second timeout for the request to avoid hanging if offline
      });

      // Assuming ComfyUI returns a prompt_id
      const promptId = response.data.prompt_id;
      if (!promptId) {
        throw new Error('ComfyUI did not return a prompt_id.');
      }
      
      // S3 / MinIO Pipeline Integration
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
      const filename = type === 'video' ? `media_${promptId}.mp4` : `media_${promptId}.png`;

      // Polling ComfyUI for completion
      let comfyFileName = null;
      for (let i = 0; i < 120; i++) { // poll for up to 120 seconds (Flux takes longer)
        await new Promise(r => setTimeout(r, 1000));
        try {
          const historyRes = await axios.get(`${host}/history/${promptId}`);
          if (historyRes.data && historyRes.data[promptId]) {
            const outputs = historyRes.data[promptId].outputs;
            // Assuming node "9" is the SaveImage node
            if (outputs && outputs["9"] && outputs["9"].images && outputs["9"].images.length > 0) {
              comfyFileName = outputs["9"].images[0].filename;
              break;
            }
          }
        } catch (err) {
          // Ignore history fetch errors during polling
        }
      }

      let imageBuffer: Buffer;
      if (comfyFileName) {
        const fileRes = await axios.get(`${host}/view?filename=${comfyFileName}`, { responseType: 'arraybuffer' });
        imageBuffer = Buffer.from(fileRes.data);
      } else {
        throw new Error('Media generation timed out or failed to complete.');
      }

      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: imageBuffer,
        ContentType: type === 'video' ? 'video/mp4' : 'image/png'
      }));

      const minioUrl = `${process.env.MINIO_ENDPOINT || 'http://localhost:9000'}/${bucketName}/${filename}`;
      
      return {
        status: 'success',
        message: 'Media generated and uploaded to MinIO storage successfully. YOU MUST RETURN THE EXACT MARKDOWN PROVIDED IN markdown_image TO THE USER. DO NOT MODIFY THE URL.',
        prompt_id: promptId,
        media_url: minioUrl,
        markdown_image: type === 'video' ? `[video](${minioUrl})` : `![Generated Media](${minioUrl})`
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          status: 'offline',
          message: `ComfyUI server at ${host} is not running or unreachable. Once you start it, the integration will work automatically.`,
          fallback_output: type === 'video' ? `[video](${host}/view?filename=fallback.mp4)` : `![Fallback](${host}/view?filename=fallback.png)`
        };
      }
      throw new Error(`Failed to generate media: ${error.message}`);
    }
  }
}
