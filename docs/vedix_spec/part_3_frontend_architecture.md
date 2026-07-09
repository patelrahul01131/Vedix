# Vedix Engineering Specification
# Part 3 — React/Vite Frontend Architecture & UI Components

Version: 1.0

──────────────────────────────────────────────────────────────

# Goal

Design a high-performance, real-time, responsive frontend architecture
for the Vedix web dashboard.

The UI must visualize the autonomous actions of the Vedix Runtime
in real-time, providing deep observability into AI planning, tool usage,
file changes, and system metrics without requiring manual refreshes.

──────────────────────────────────────────────

# Philosophy

The Frontend is a reflection of the Backend state.

It contains ZERO business logic regarding AI execution.

It never dictates what the AI should do.

It only sends intents and renders state.

──────────────────────────────────────────────

# Responsibilities

User Authentication

Project/Workspace Selection

Mission Visualization

Real-time Streaming (WebSockets)

Chat Interface

Execution Graph Rendering

Native Code Diff Viewer

Approval Management

Agent State Visualization

Settings & Preferences

──────────────────────────────────────────────

# Technology Stack

Framework: React 18+

Build Tool: Vite

Language: TypeScript (Strict Mode)

Styling: Tailwind CSS

Component Library: shadcn/ui + Radix UI (Headless)

State Management: Zustand

Data Fetching: TanStack Query (React Query)

Real-time: Socket.io-client / Native WebSockets

Routing: React Router v6

Icons: Lucide React

──────────────────────────────────────────────

# High Level Architecture

                      User
                       │
                       ▼
               Vite React App
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
  State Store      Components      Data Layer
   (Zustand)                       (React Query)
       │                               │
       └───────────────┬───────────────┘
                       ▼
                 API / WebSockets

──────────────────────────────────────────────

# Folder Structure

/apps/web/src/
  ├── assets/          # Static assets, images, icons
  ├── components/      # Reusable UI components
  │   ├── ui/          # shadcn/ui base components
  │   ├── layout/      # Sidebar, Header, Page wrappers
  │   ├── mission/     # Mission progress, execution graph
  │   └── chat/        # Chat input, message bubbles
  ├── features/        # Domain-specific feature modules
  ├── hooks/           # Custom React hooks (e.g., useWebSocket)
  ├── lib/             # Utility functions, API clients
  ├── pages/           # Route components
  ├── store/           # Zustand stores
  ├── types/           # Global TypeScript definitions
  └── App.tsx          # Root application component

──────────────────────────────────────────────

# Core UI Components

1. Sidebar Navigation
Shows active workspaces, recent missions, and agent health.

2. Chat Interface
Displays user intents, planner thoughts, and tool execution logs.
Supports markdown, code blocks, and streaming text.

3. Mission Execution Graph
Visual DAG (Directed Acyclic Graph) of the current plan.
Nodes represent tasks (Idle, Running, Completed, Failed, Waiting Approval).

4. Terminal Output Viewer
Streams real-time standard output from the Terminal Engine.
XTerm.js integration for colorized, authentic terminal feel.

5. Code Diff Reviewer
Side-by-side or unified diff view for proposed code changes.
Similar to VS Code native diff or GitHub PR view.

6. Approval Modal
Interrupts the UI when the backend requires user approval.
Displays risk score, affected files, and accepts/rejects input.

──────────────────────────────────────────────

# State Management Strategy

Zustand (Global UI State)
- Active workspace ID
- Sidebar collapse state
- Theme preference (Dark/Light)

React Query (Server State)
- Fetching historical missions
- Fetching workspace settings
- Pagination of logs

WebSockets (Real-time State)
- Streaming chat responses
- Live task status updates
- Immediate approval requests
- Agent capability events

──────────────────────────────────────────────

# WebSocket Integration

The frontend maintains a persistent WebSocket connection to the Fastify backend.

Events emitted by frontend:
- `mission.start`
- `mission.approval.grant`
- `mission.approval.deny`
- `chat.message.send`

Events received by frontend:
- `runtime.task.started`
- `runtime.task.completed`
- `runtime.waiting.approval`
- `model.request.streaming` (token streams)
- `browser.screenshot.captured`

──────────────────────────────────────────────

# Styling & Theming

Tailwind CSS heavily utilized.

Design System:
- Dark mode by default (fits developer tooling aesthetics).
- CSS Variables for dynamic theming (colors, border radius).
- Glassmorphism effects for modals and overlays.
- Smooth micro-animations (Framer Motion) for task transitions and streaming.

──────────────────────────────────────────────

# Error Handling & Resilience

- Reconnecting WebSockets automatically with exponential backoff.
- Error Boundaries around complex components (e.g., Execution Graph).
- Toast notifications for transient errors (e.g., Network disconnected).
- Graceful degradation if streaming fails (fallback to polling).

──────────────────────────────────────────────

# Performance Optimization

- Code splitting via React.lazy() for heavy views (Diff Viewer, DAG Viewer).
- Memoization (React.memo, useMemo) for rapidly updating streaming components.
- Virtualization (react-window) for long terminal output logs and large chat histories.
- Asset compression via Vite plugins.

──────────────────────────────────────────────

# Security Considerations

- JWT tokens stored in HTTP-only secure cookies, never in LocalStorage.
- CSRF protection enabled.
- XSS prevention (React escapes by default, DOMPurify for rendered markdown).
- Strict Content Security Policy (CSP).

──────────────────────────────────────────────

# Rules

Never store business logic on the frontend.
Always reflect backend state accurately.
Never block the main thread with heavy renders.
Always provide visual feedback for latency.
Always gracefully handle WebSocket disconnects.
──────────────────────────────────────────────

# Final Objective

The Frontend Architecture ensures Vedix provides a world-class,
highly responsive, and deeply observable developer experience.
By treating the UI strictly as a real-time reflection of the Runtime,
Vedix remains robust, scalable, and delightful to use.
