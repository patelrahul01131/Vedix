# Vedix 🤖

Vedix is an autonomous, IDE-first AI coding agent built for VS Code. It uses Fastify for its backend, LanceDB for semantic vector memory, Prisma + Postgres for relational memory, and a sleek React/Zustand UI for the VS Code Webview.

## 🚀 How to Run Vedix Locally

Follow these steps to boot up the entire agent architecture:

### 1. Start Local Infrastructure
Vedix requires PostgreSQL (for mission/message memory) and Redis (for Event Bus).
Ensure Docker is running, then spin up the infrastructure:
```bash
docker-compose up -d
```

### 2. Configure Environment Variables
Navigate to `services/backend/.env` and insert your OpenAI API Key:
```env
OPENAI_API_KEY="sk-proj-your-real-api-key"
```

### 3. Setup the Database
Push the Prisma schema to your running Postgres container to create the tables:
```bash
pnpm --filter @vedix/database db:push
```
*(Optional)* You can view the database UI by running:
```bash
pnpm --filter @vedix/database prisma studio
```

### 4. Start the Agent Workspace
At the root of the monorepo, run the development script. This will use TurboRepo to concurrently start the Fastify Backend, the React Webview watcher, and the VS Code Extension compiler:
```bash
pnpm dev
```
*Note: Ensure you have `"dev": "turbo run dev"` configured in your root `package.json`.*

### 5. Launch the VS Code Extension
1. Open the `apps/vscode` folder in a new VS Code window.
2. Press **F5** to launch the Extension Development Host.
3. In the new VS Code window, open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and type **Vedix: Start Agent**.
4. The beautiful React UI will pop open, instantly connect to your backend via WebSockets, and you can begin chatting with the autonomous agent!

## 🐳 Docker Production Deployment
If you want to deploy the backend to a remote server, we have included a highly optimized, multi-stage Dockerfile that leverages `turbo prune` to isolate the backend:
```bash
cd services/backend
docker build -t vedix-backend .
```
