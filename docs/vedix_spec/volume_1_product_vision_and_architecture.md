# Vedix Engineering Specification
# Part 1 — Product Vision, Architecture & Engineering Principles

Version: 1.0
Project: Vedix
Type: Autonomous AI Coding Agent
Target: VS Code Extension + Web Platform
Architecture: Event Driven
Author: AI System Specification

──────────────────────────────────────────────────────────────

# Project Vision

Vedix is not a chatbot.

Vedix is not an IDE.

Vedix is not a dashboard.

Vedix is an autonomous software engineering agent capable of understanding projects, planning work, using tools, modifying code, requesting permission when necessary, recovering from failures, and communicating its reasoning through a clean conversational interface.

The conversation is only a communication medium.

The source code always remains inside VS Code.

Code review always happens using the native VS Code editor.

Vedix should feel like another software engineer working beside the developer.

The experience should resemble a highly experienced teammate rather than an assistant that simply answers prompts.

──────────────────────────────────────────────────────────────

# Product Goals

Vedix should be capable of

• Understanding entire repositories
• Maintaining long running conversations
• Planning before acting
• Using tools autonomously
• Reading thousands of files
• Performing semantic search
• Editing multiple files
• Running terminal commands
• Running tests
• Reviewing failures
• Recovering from errors
• Asking for permission whenever required
• Streaming every action live
• Working continuously until the task is complete

The developer should never wonder

"What is the agent doing?"

The UI should always answer

Current state

Current goal

Current tool

Current file

Current command

Current progress

Waiting reason

Next action

──────────────────────────────────────────────────────────────

# Non Goals

Vedix is NOT

❌ Slack

❌ Discord

❌ ChatGPT UI

❌ Dashboard software

❌ Terminal replacement

❌ Git client

❌ File explorer

❌ Browser

❌ Diff viewer

These are tools.

Not the primary interface.

──────────────────────────────────────────────────────────────

# Design Philosophy

Rule 1

Chat is permanent.

Everything else is temporary.

────────────────────────

Rule 2

The frontend never decides anything.

Backend owns all intelligence.

────────────────────────

Rule 3

Every screen must answer

What is happening?

────────────────────────

Rule 4

Every action is reversible.

────────────────────────

Rule 5

Never surprise the user.

────────────────────────

Rule 6

Never execute destructive operations automatically.

────────────────────────

Rule 7

Show only relevant information.

Hide everything else.

────────────────────────

Rule 8

The interface should disappear.

The developer should focus on code.

──────────────────────────────────────────────────────────────

# UX Philosophy

The UI should feel

Minimal

Professional

Calm

Fast

Responsive

Native to VS Code

Never flashy.

Never distracting.

Never overwhelming.

No unnecessary animations.

No dashboard mentality.

No permanent sidebars.

No clutter.

The UI should disappear while the agent works.

──────────────────────────────────────────────────────────────

# Core Experience

The user opens Vedix.

Types

Fix login bug

Vedix begins

Thinking

Planning

Reading files

Searching

Generating patch

Waiting approval

Applying changes

Running tests

Done

The user watches the progress naturally.

No JSON.

No logs.

No unnecessary messages.

Only meaningful progress.

──────────────────────────────────────────────────────────────

# Product Principles

Think before acting.

Read before editing.

Search before generating.

Explain before modifying.

Request permission before execution.

Verify before completion.

Never claim success without verification.

──────────────────────────────────────────────────────────────

# Primary Workflow

User Request

↓

Context Collection

↓

Planning

↓

Tool Selection

↓

Execution

↓

Observation

↓

Reflection

↓

Continue

↓

Approval

↓

Apply

↓

Verification

↓

Completion

──────────────────────────────────────────────────────────────

# Agent Philosophy

The AI behaves like a senior engineer.

Before writing code it should

Understand

Inspect

Search

Reason

Then edit.

Never blindly generate files.

Never rewrite large projects unnecessarily.

Never duplicate code.

Always reuse existing architecture.

──────────────────────────────────────────────────────────────

# Architecture Philosophy

Vedix follows strict separation.

Frontend

↓

Backend

↓

Runtime

↓

Tools

↓

Workspace

Every layer owns one responsibility.

No layer leaks into another.

──────────────────────────────────────────────────────────────

# Frontend Responsibilities

Render UI

Render chat

Render markdown

Render progress

Render approval

Render overlays

Render settings

Maintain input state

Maintain local preferences

Display streamed events

Never

Run tools

Edit files

Choose plans

Generate prompts

Access databases

──────────────────────────────────────────────────────────────

# Backend Responsibilities

Authentication

Session management

Conversation storage

Planning

Context

Memory

Streaming

Permission management

Checkpoint management

Runtime orchestration

Recovery

Agent lifecycle

──────────────────────────────────────────────────────────────

# Runtime Responsibilities

Runtime owns

Planning

Reflection

Tool selection

Loop execution

Retries

Cancellation

Resume

Checkpoints

Streaming

Error recovery

Memory updates

Context compression

──────────────────────────────────────────────────────────────

# Tool Philosophy

Every capability is a tool.

Filesystem

Terminal

Browser

Git

Search

Workspace

Database

MCP

Documentation

No tool knows about another tool.

The runtime coordinates them.

──────────────────────────────────────────────────────────────

# Event Driven Architecture

Everything becomes an event.

Nothing uses polling.

Example

USER_MESSAGE

↓

PLAN_CREATED

↓

SEARCH_STARTED

↓

SEARCH_RESULT

↓

FILE_READ

↓

PATCH_GENERATED

↓

WAITING_APPROVAL

↓

PATCH_ACCEPTED

↓

COMMAND_STARTED

↓

COMMAND_OUTPUT

↓

COMMAND_FINISHED

↓

TASK_COMPLETED

The frontend only subscribes.

──────────────────────────────────────────────────────────────

# State Machine

Idle

↓

Thinking

↓

Planning

↓

Reading

↓

Searching

↓

Editing

↓

Generating Patch

↓

Waiting Approval

↓

Applying Patch

↓

Running Command

↓

Testing

↓

Formatting

↓

Git

↓

Completed

↓

Idle

Any state may transition to

Cancelled

Retrying

Offline

Failed

Recovering

──────────────────────────────────────────────────────────────

# Multi User Philosophy

Every user is isolated.

Each user owns

Authentication

Workspace

Memory

Sessions

Permissions

Embeddings

Conversation history

Models

Settings

Caches

Indexes

Nothing leaks between users.

──────────────────────────────────────────────────────────────

# Workspace Philosophy

Each workspace has

Context

Rules

Ignore patterns

Memory

Embeddings

Indexes

Git information

Open files

Recent edits

Workspace preferences

Everything is independent.

──────────────────────────────────────────────────────────────

# Conversation Philosophy

Conversation stores

User prompts

Assistant responses

Tool calls

Tool outputs

Streaming

Attachments

Images

Approvals

Model

Timing

Tokens

Events

Conversation never stores

Entire repositories

Entire indexes

Large logs

Terminal history

Those belong elsewhere.

──────────────────────────────────────────────────────────────

# Memory Philosophy

Memory is hierarchical.

Global User Memory

↓

Workspace Memory

↓

Conversation Memory

↓

Task Memory

↓

Temporary Runtime Memory

Each level has different persistence.

──────────────────────────────────────────────────────────────

# Context Philosophy

Context should never overflow.

Vedix continuously

Compresses

Summarizes

Ranks

Prioritizes

Expires

Old context.

Context quality matters more than context quantity.

──────────────────────────────────────────────────────────────

# Approval Philosophy

The agent must NEVER

Edit files

Delete files

Rename files

Run terminal

Install packages

Commit Git

Push Git

Deploy

Call external APIs

Modify databases

Without explicit approval.

Approval always pauses execution.

──────────────────────────────────────────────────────────────

# Error Philosophy

Errors are expected.

The system must never crash.

Instead

Capture

Log

Recover

Retry

Resume

Continue

Users should never lose work.

──────────────────────────────────────────────────────────────

# Performance Philosophy

Everything should stream.

Never wait.

Render incrementally.

Virtualize lists.

Lazy load overlays.

Memoize components.

Debounce search.

Cache intelligently.

Background index.

──────────────────────────────────────────────────────────────

# Security Philosophy

Never trust frontend input.

Validate everything.

Escape markdown.

Sanitize HTML.

Validate paths.

Validate commands.

Sandbox tools.

Authenticate every request.

Authorize every action.

Encrypt secrets.

Audit destructive operations.

──────────────────────────────────────────────────────────────

# Engineering Rules

Never hardcode colors.

Use VS Code theme variables.

Never duplicate components.

Never duplicate business logic.

Every feature is modular.

Every async call supports cancellation.

Every network request supports retry.

Every component has an Error Boundary.

Every state is strongly typed.

Every API is versioned.

Every event is typed.

Every tool is isolated.

Every module has tests.

Every file has one responsibility.

Prefer composition over inheritance.

Prefer event driven design over callbacks.

Prefer streaming over polling.

──────────────────────────────────────────────────────────────

# Final Product Experience

The developer should feel like they are collaborating with another experienced software engineer.

Vedix quietly understands the project, plans carefully, explains its intent, performs work with permission, streams meaningful progress, recovers from failures, and leaves the user in complete control at every step.

The interface remains clean, minimal, and focused. Advanced capabilities appear only when needed and disappear when the task is complete.

The system is resilient, event-driven, scalable, and designed to support thousands of concurrent users, large repositories, long-running sessions, and future expansion across VS Code, web, desktop, CLI, and cloud environments without changing its core architecture.

This document establishes the foundational principles that every subsequent implementation must follow.
