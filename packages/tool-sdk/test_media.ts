import { GenerateMediaTool } from './src/tools/GenerateMediaTool';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

async function test() {
  const tool = new GenerateMediaTool();
  console.log("Requesting image generation from Flux...");
  const result = await tool.execute({
    prompt: "A beautiful futuristic cyberpunk city with neon lights and flying cars, high resolution",
    type: "image"
  });
  console.log("Result:", result);
}

test().catch(console.error);
