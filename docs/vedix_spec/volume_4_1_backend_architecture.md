# Vedix Engineering Specification
# Part 4.1 — Backend System Architecture

Version: 1.0

──────────────────────────────────────────────────────────────────────

# Goal

Build a production-grade backend capable of powering a modern AI software
engineering agent similar to Cursor Agent, Claude Code, OpenAI Codex,
Augment Code and Cline.

The backend is the brain.

The frontend is only a renderer.

No AI decision making is allowed inside React.

The backend owns

• Authentication
• Sessions
• Conversations
• Runtime
• Planning
• Memory
• Context
• Tool Execution
• Streaming
• Approvals
• Recovery
• Checkpoints
• Event Streaming
• Background Jobs
• Logging
• Security

──────────────────────────────────────────────────────────────────────

# Core Philosophy

Frontend never decides.

Backend owns everything.

Every user interaction becomes an event.

Every event changes runtime state.

Every state is streamed back to frontend.

The UI never polls.

Everything is event-driven.

──────────────────────────────────────────────────────────────────────

# High Level Architecture

                    User
                      │
              React Web UI
                      │
                 WebSocket
                      │
                      ▼
             API Gateway (Fastify)
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
 Authentication   REST API     WebSocket Hub
       │              │              │
       └──────────────┴──────────────┘
                      │
                Event Dispatcher
                      │
             Session Controller
                      │
      ┌───────────────┼────────────────┐
      ▼               ▼                ▼
 Context Engine   Memory Manager   Planner
      │               │                │
      └───────────────┴────────────────┘
                      │
                Runtime Engine
                      │
 Think → Plan → Tool → Observe → Reflect
                      │
      ┌───────────────┼──────────────────────┐
      ▼               ▼                      ▼
 File Tools     Terminal Tool         Search Engine
      ▼               ▼                      ▼
 Approval      Command Runner          Vector Search
      │
 Accept / Reject
      │
 Continue Execution

──────────────────────────────────────────────────────────────────────

# Backend Principles

Every module has one responsibility.

Every service communicates through interfaces.

No module imports another module directly unless required.

Prefer dependency injection.

Never use singleton business logic.

Everything should be replaceable.

──────────────────────────────────────────────────────────────────────

# Technology Stack

Runtime

Node.js LTS

Framework

Fastify

Language

TypeScript

Validation

Zod

Realtime

WebSocket

Queue

BullMQ

Cache

Redis

Database

PostgreSQL

Vector Database

LanceDB

Logging

Pino

ORM

Prisma

Configuration

dotenv

Authentication

JWT + Refresh Tokens

File Storage

MinIO / Amazon S3

──────────────────────────────────────────────────────────────────────

# Backend Folder Structure

server/

src/

app/

config/

api/

auth/

users/

workspaces/

sessions/

conversation/

runtime/

planner/

context/

memory/

tools/

approvals/

events/

stream/

websocket/

queue/

indexing/

embedding/

search/

database/

middleware/

plugins/

telemetry/

logger/

scheduler/

storage/

security/

validation/

shared/

types/

utils/

tests/

Every folder owns one domain.

──────────────────────────────────────────────────────────────────────

# Fastify Bootstrap

The application starts in this order

Load Configuration

↓

Initialize Logger

↓

Connect PostgreSQL

↓

Connect Redis

↓

Initialize LanceDB

↓

Register Plugins

↓

Register Middleware

↓

Register Routes

↓

Initialize WebSocket

↓

Initialize Event Bus

↓

Initialize Workers

↓

Initialize Runtime Services

↓

Accept Connections

The server must fail fast if a critical dependency is unavailable.

──────────────────────────────────────────────────────────────────────

# Dependency Injection

Every service must be injected.

Never instantiate services inside controllers.

Example

Controller

↓

Conversation Service

↓

Runtime Service

↓

Planner

↓

Tool Registry

↓

Memory Service

This allows testing and replacement.

──────────────────────────────────────────────────────────────────────

# API Layer

Responsibilities

Authentication

Workspace CRUD

Conversation CRUD

Upload

Download

Settings

Model Configuration

History

Approvals

Runtime Commands

No runtime logic.

Only request validation and routing.

──────────────────────────────────────────────────────────────────────

# Authentication Module

Responsibilities

Register

Login

Logout

Refresh Token

Password Reset

OAuth

API Keys

Workspace Access

Permission Validation

Rate Limiting

Every request passes through authentication.

──────────────────────────────────────────────────────────────────────

# Session Controller

The Session Controller owns every active conversation.

Responsibilities

Start Runtime

Stop Runtime

Pause Runtime

Resume Runtime

Restore Runtime

Destroy Runtime

Manage WebSocket Connections

Maintain Session State

A session never knows about another session.

──────────────────────────────────────────────────────────────────────

# Conversation Manager

Owns

Conversation Lifecycle

Messages

Attachments

Streaming

History

Title Generation

Archiving

Pinning

Conversation Export

Conversation Import

──────────────────────────────────────────────────────────────────────

# Event Bus

Everything becomes an event.

Examples

USER_MESSAGE

ASSISTANT_MESSAGE

THINKING_STARTED

THINKING_UPDATED

PLAN_CREATED

PLAN_UPDATED

FILE_READ

FILE_SEARCH

TOOL_SELECTED

TOOL_STARTED

TOOL_PROGRESS

TOOL_FINISHED

PATCH_GENERATED

PATCH_READY

WAITING_APPROVAL

PATCH_APPROVED

PATCH_DECLINED

COMMAND_STARTED

COMMAND_OUTPUT

COMMAND_FINISHED

TEST_STARTED

TEST_FINISHED

ERROR

WARNING

COMPLETE

CANCELLED

RETRY

Every event is immutable.

Every event has

id

timestamp

sessionId

conversationId

workspaceId

userId

payload

version

──────────────────────────────────────────────────────────────────────

# Event Dispatcher

Responsibilities

Receive Events

Validate Events

Publish Events

Persist Events

Broadcast Events

Replay Events

Events are never lost.

──────────────────────────────────────────────────────────────────────

# Runtime Manager

Owns

Current State

Planner

Memory

Context

Tool Execution

Checkpoint

Streaming

Recovery

Retry

Cancellation

Resume

Only one runtime per conversation.

──────────────────────────────────────────────────────────────────────

# Planner

The planner never edits code.

Responsibilities

Understand Request

Break Task

Estimate Complexity

Generate Steps

Prioritize Steps

Monitor Progress

Replan When Needed

Output

Execution Plan

──────────────────────────────────────────────────────────────────────

# Context Engine

Responsible for collecting context.

Reads

Workspace

Repository

Conversation

Memory

Recent Files

Embeddings

Symbols

Rules

Ignored Files

Context Engine never generates responses.

──────────────────────────────────────────────────────────────────────

# Memory Manager

Owns

Workspace Memory

Conversation Memory

Pinned Rules

Summaries

Compression

Ranking

Expiration

Memory Retrieval

Memory Update

Memory Synchronization

──────────────────────────────────────────────────────────────────────

# Tool Registry

The runtime never directly calls tools.

Runtime

↓

Tool Registry

↓

Tool

Every tool implements

initialize()

validate()

execute()

cancel()

cleanup()

No exceptions.

──────────────────────────────────────────────────────────────────────

# Tool Categories

Filesystem

Terminal

Git

Browser

Search

Repository

Documentation

Database

HTTP

MCP

Diagnostics

Each tool is isolated.

──────────────────────────────────────────────────────────────────────

# Approval Manager

Owns

Permission Queue

Approval Requests

Approval Expiration

Pause Runtime

Resume Runtime

Audit Logs

No destructive operation bypasses approval.

──────────────────────────────────────────────────────────────────────

# WebSocket Hub

Responsible for

Streaming Messages

Streaming Progress

Streaming Events

Streaming Tool Output

Streaming Markdown

Heartbeat

Reconnect

Resume

Session Sync

Never store state.

──────────────────────────────────────────────────────────────────────

# Background Workers

BullMQ workers execute

Repository Indexing

Embedding Generation

Summaries

Compression

Cleanup

Retry

Exports

Log Rotation

Large File Processing

Workers never block API threads.

──────────────────────────────────────────────────────────────────────

# Search Service

Owns

Repository Search

Semantic Search

File Search

Documentation Search

Symbol Search

Never accesses frontend.

──────────────────────────────────────────────────────────────────────

# Embedding Service

Reads repository.

Chunks files.

Creates embeddings.

Stores vectors.

Updates indexes.

Deletes stale vectors.

Supports incremental indexing.

──────────────────────────────────────────────────────────────────────

# Storage Service

Handles

Uploads

Downloads

Attachments

Generated Files

Screenshots

Exports

Logs

Never stores metadata.

Metadata belongs in PostgreSQL.

──────────────────────────────────────────────────────────────────────

# Logger

Every request receives

Request ID

Session ID

Workspace ID

User ID

Runtime ID

Logs are structured JSON.

Never use console.log in production.

──────────────────────────────────────────────────────────────────────

# Error Handling

Every async operation

try

↓

catch

↓

Log

↓

Emit Error Event

↓

Recover

↓

Continue

Never crash Node.

Never lose runtime state.

──────────────────────────────────────────────────────────────────────

# Recovery

If backend crashes

Restore

Runtime

Memory

Planner

Pending Approvals

Streaming Offset

Current Tool

Current Progress

Continue from checkpoint.

──────────────────────────────────────────────────────────────────────

# Health Endpoints

GET /health

GET /ready

GET /metrics

GET /version

Used by Kubernetes and monitoring.

──────────────────────────────────────────────────────────────────────

# Backend Rules

No controller contains business logic.

No service accesses UI.

No runtime accesses React.

Everything strongly typed.

Everything validated.

Everything testable.

Everything observable.

Everything recoverable.

──────────────────────────────────────────────────────────────────────

# Final Objective

The backend should function as the operating system of Vedix.

It is responsible for orchestrating every aspect of the AI agent, from authentication and conversation management to planning, tool execution, memory, approvals, event streaming, recovery, and observability.

The frontend remains a thin client that simply renders the current state emitted by the backend. This separation ensures scalability, maintainability, reliability, and the ability to evolve Vedix into a distributed, enterprise-grade AI coding platform.
