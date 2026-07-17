cd ./packages/database
npx tsx --env-file=../../.env src/resetDB.ts

To reset only the agent learning memories, run:
npx tsx --env-file=../../.env src/resetAgentMemories.ts
