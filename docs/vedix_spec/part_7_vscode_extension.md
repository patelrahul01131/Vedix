# Vedix Engineering Specification
# Part 7 — VS Code Extension Agent UI & Native Diff Workflow

Version: 2.0

──────────────────────────────────────────────────────────────

# Goal

Redesign the entire Vedix VS Code extension into a minimal, professional, IDE-first AI coding agent.

The UI should feel closer to Claude Code, OpenAI Codex, Cursor Agent, Augment Code and Cline, but with a much cleaner philosophy.

This is NOT a chatbot.

This is NOT a dashboard.

This is an autonomous coding agent that communicates through chat while performing work inside VS Code.

The chat is only the communication layer.

The VS Code editor is the code review layer.

Everything else should appear only when required.

──────────────────────────────────────────────

# Core Design Philosophy

Primary Principle

Chat is permanent.

Everything else is contextual.

There should never be permanent:
- terminal
- timeline
- file explorer
- execution logs
- tool panels
- memory panels
- running commands
- diff viewer

These should appear only when needed.

The extension should always look lightweight.

──────────────────────────────────────────────

# Overall Layout

┌─────────────────────────────────────┐
│ Header                              │
├─────────────────────────────────────┤
│                                     │
│                                     │
│ Chat Conversation                   │
│                                     │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ Input                               │
└─────────────────────────────────────┘

Nothing else.

No fixed side panels.

No widgets.

No dashboards.

──────────────────────────────────────────────

# Header

Minimal.

Contains only:
- Vedix
- Conversation Name
- Status
- New Chat
- History
- Settings
- More

Status examples:
- Idle
- Thinking
- Working
- Waiting Approval
- Running
- Done
- Offline

Status updates must be real-time.

──────────────────────────────────────────────

# Conversation

Conversation is the primary UI.

Every action is represented as structured cards.

Never dump raw logs.

Never dump JSON.

Never spam messages.

Message Types

Every message type must have different UI.

User Message
Simple bubble.

Assistant Message
Rounded assistant card.
Markdown support.
Tables.
Lists.
Code.
Images.
Math.
Links.

Thinking Card
🧠 Thinking
Analyzing project...
Animated.
Auto updates.
Collapses after completion.

Planning Card
Planning
Read project
Analyze
Generate patch
Run tests
Live progress.

File Read Card
Reading
App.tsx
package.json
vite.config.ts

Search Card
Searching
Auth.ts
4 matches
Click opens overlay.

Command Card
npm install
Running
██████
12 sec
Click opens terminal overlay.

Patch Ready Card
Patch Ready
3 files modified
Open Review
Click
Open native VSCode diff.

Waiting Card
Waiting for Review
Agent paused.

Permission Card
Permission Required
Command
npm install
Approve
Decline

Success Card
Tests Passed
27 tests

Error Card
Build Failed
Open Logs

Warning Card
Context nearly full
Compress history

File Card
Edited
Navbar.tsx
+32
-12

Git Card
Commit Ready
View Changes

Browser Card
localhost:3000
Open Preview

──────────────────────────────────────────────

# Native VS Code Integration

Never build custom diff.

Use VS Code API.

Open Native Diff Editor:

Old ⇄ New

Exactly like Git.

After review:
Return control to chat.

──────────────────────────────────────────────

# Permission First Workflow

Agent NEVER performs destructive actions automatically.

Everything requiring changes must pause.

Includes:
- Write file
- Edit file
- Delete file
- Rename file
- Terminal
- Git
- Database
- Browser
- MCP
- Network
- APIs
- Install packages

Workflow:
Generate Patch
↓
Open Native Diff
↓
WAIT
↓
Accept
↓
Apply Patch
↓
Continue

Never skip approval.

Sequential Permission Queue:
Never open multiple dialogs.
Example:
1. Review Patch
↓
2. Run npm test
↓
3. Commit
↓
Done

One permission at a time.

──────────────────────────────────────────────

# Input Area

Very clean.

╭──────────────────────────────╮
│ Ask Vedix...                 │
│                              │
├──────────────────────────────┤
│ +  @  /   GPT-5.5 ▼     Send │
╰──────────────────────────────╯

Only permanent controls:
- Attach
- Mention
- Slash
- Model
- Send
Nothing else.

Model Selector:
Compact dropdown.
Supports:
- Auto
- GPT
- Claude
- Gemini
- Open source

Changing model affects only current conversation.
Lock while running.

Input Validation:
Must support:
- Empty input
- Character limit
- Multi-line
- Paste detection
- Code detection
- Drag drop
- Image upload
- Folder upload
- Mention validation
- Slash validation
- Duplicate prompt prevention
- Offline detection
- Workspace detection
- Attachment validation
- Long prompt warning
- Command confirmation
- Dangerous command confirmation
- Keyboard shortcuts

Slash Commands:
/fix, /review, /explain, /refactor, /test, /run, /search, /docs, /git, /commit, /deploy, /index, /context, /reset
Autocomplete.

Mentions:
@App.tsx, @Button, @AuthService, @README
Autocomplete.

──────────────────────────────────────────────

# Dynamic Agent State Machine

Must reflect actual backend state.

States:
Idle, Thinking, Planning, Reading, Searching, Editing, Generating Patch, Waiting Approval, Applying Patch, Running Command, Running Tests, Formatting, Linting, Git, Deploying, Waiting Tool, Syncing, Done, Cancelled, Retrying, Offline, Error

Never fake state.
Every state is event-driven.

──────────────────────────────────────────────

# Agent Architecture

Frontend must NOT control logic.
Everything comes from backend events.

Use event architecture:
Agent Core
↓
Event Bus
↓
UI Store
↓
React Components

Every component listens to events.
No polling.
Use streaming.
Support cancellation, resume, retry.

──────────────────────────────────────────────

# Dynamic UI & Overlays

Everything updates live: Command output, Streaming markdown, Progress, Token usage, Diff status, Permission status, Errors, Retries, Downloads, Uploads, Tool execution, Memory updates, Context updates.

Overlay System:
Everything opens as overlay. Never permanent.
Supports: Terminal, Logs, Memory, Search, Browser, File preview, Images, Context, Settings, History, Model picker.

Terminal Overlay:
Supports ANSI colors, Copy, Search, Clear, Wrap, Auto scroll, Cancel command, Restart, Download logs.

Search Overlay:
Grouped results. Click jumps to file.

Memory Overlay:
Workspace memory, Conversation memory, Pinned instructions, Ignored files, Rules.

History Overlay:
Search, Rename, Delete, Pin, Restore.

Settings Overlay:
Theme, Permissions, Models, Tools, Notifications, Keybindings, Experimental.

──────────────────────────────────────────────

# Streaming & Content Rendering

Streaming:
Assistant messages stream. Tool outputs stream. Command outputs stream. Reasoning status streams. Progress streams.
Never block UI.

Code Blocks:
Professional. Supports Syntax highlight, Copy, Wrap, Collapse, Expand, Line numbers, Open in editor, Diff.

Markdown:
Support Tables, Lists, Task lists, Images, Mermaid, Math, Links, HTML sanitization, Admonitions.

──────────────────────────────────────────────

# Error Handling & Resilience

The UI must NEVER crash.
Every component must use Error Boundaries.
Every async action must use try/catch.
Gracefully recover from failures.
Never leave the UI frozen.
Never lose user input.

Component Error Boundaries:
Every major section has its own boundary (Chat, Input, Overlay, Markdown, Terminal, History, Settings, Code Block).
If one crashes, only that component reloads.

Network Recovery:
Handle Offline, Reconnect, Server timeout, Rate limit, Authentication expired, Token expired, Workspace unavailable, Tool unavailable, Model unavailable.
Gracefully retry.

Automatic Retry:
Retry Streaming, Connection, Downloads, Uploads, Event subscriptions with exponential backoff.

State Recovery:
If VS Code reloads: Restore Conversation, Input, Scroll, Pending permissions, Running commands, Streaming, Selected model, Overlay state.

Validation:
Validate Commands, Paths, Mentions, Workspace, Files, Permissions, Attachments, Images, Folders, JSON, Markdown before sending.

──────────────────────────────────────────────

# Performance & Code Quality

Performance:
Virtualize chat. Lazy render markdown. Memoize components. Debounce search. Cancel old requests. Avoid unnecessary renders. Background indexing. Lazy overlays.

Accessibility:
Keyboard first. Tab navigation. ARIA labels. Screen reader. Reduced motion. Resizable. Theme aware.

VS Code Theme:
Use ONLY VS Code theme variables. Never hardcode colors. Support Dark, Light, High contrast Automatically.

Logging:
Developer logs. User logs. Agent logs. Tool logs. Separate. Never expose internal errors directly.

Security:
Escape markdown. Sanitize HTML. Validate commands. Never execute without permission. Never trust frontend input. Protect against malformed events.

Code Quality:
Use React, TypeScript, VS Code Webview API, Zustand.
Strong typing, Reusable components, Feature-based architecture, Custom hooks, Error boundaries, Unit-testable logic, No duplicated components, No business logic inside UI components.

──────────────────────────────────────────────

# Final Experience

The UI should feel like a premium AI operating system for developers.
The chat remains clean and uncluttered.
Every advanced feature appears only when needed.
The VS Code editor handles code review.
The agent always explains what it is doing.
Every potentially destructive action requires explicit approval.
The interface is fast, event-driven, resilient, and capable of recovering from failures without losing user work.

The user should always know:
What the agent is doing
Why it is doing it
What files are affected
What command is about to run
What requires approval
What failed
How to recover
When the agent is paused
When it has resumed
When the task is complete
