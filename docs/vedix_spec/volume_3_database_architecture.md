# Vedix Engineering Specification
# Part 3 — Database Architecture, Storage Layer & Data Model

Version 1.0

──────────────────────────────────────────────────────────────

# Goal

Design the complete storage layer for Vedix.

The database architecture must support

• Millions of users
• Millions of conversations
• Large repositories
• Multi-workspace memory
• Semantic search
• Multiple AI providers
• Streaming
• Checkpoints
• Runtime recovery
• Long-running tasks
• Multi-device synchronization
• Horizontal scaling

The storage architecture must separate structured data, vector data, cache, and files.

Never use a single database for everything.

Each storage engine has one responsibility.

──────────────────────────────────────────────────────────────

# Storage Architecture

                    Vedix Platform
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   PostgreSQL          LanceDB            Redis
 Structured Data      Vector Memory       Runtime Cache
        │
        ▼
 Object Storage (S3/MinIO)

Responsibilities

PostgreSQL
- Authentication
- Users
- Conversations
- Messages
- Sessions
- Projects
- Permissions
- Billing-ready data
- Audit logs
- Settings
- Metadata

LanceDB
- Code embeddings
- Documentation embeddings
- Conversation embeddings
- Semantic search
- Memory retrieval
- Repository chunks

Redis
- Runtime state
- Streaming buffers
- WebSocket pub/sub
- Queue metadata
- Rate limiting
- Temporary context
- Locks

Object Storage
- Attachments
- Images
- Logs
- Generated artifacts
- Checkpoints
- Export files

──────────────────────────────────────────────────────────────

# Multi-Tenant Design

Every table must support tenant isolation.

Tenant
    ↓
User
    ↓
Workspace
    ↓
Conversation
    ↓
Messages
    ↓
Runtime

Never mix user data.

All queries must be scoped by tenant_id.

──────────────────────────────────────────────────────────────

# PostgreSQL Tables

Core Identity

users

workspaces

workspace_members

sessions

refresh_tokens

api_keys

oauth_accounts

devices

notifications

────────────────────────────────────────

Conversation

conversations

messages

message_chunks

attachments

conversation_tags

conversation_events

conversation_checkpoints

────────────────────────────────────────

Runtime

runtime_sessions

runtime_events

runtime_steps

runtime_tools

runtime_errors

runtime_streams

runtime_metrics

────────────────────────────────────────

Memory

workspace_memory

conversation_memory

global_memory

memory_summaries

memory_rules

memory_pins

────────────────────────────────────────

Context

context_snapshots

context_chunks

context_compression

context_rankings

────────────────────────────────────────

Repository

repositories

branches

commits

repository_indexes

repository_files

repository_rules

ignored_files

────────────────────────────────────────

Permissions

approval_requests

approval_history

approval_rules

approval_templates

────────────────────────────────────────

Models

model_providers

model_configurations

model_usage

token_usage

cost_tracking

────────────────────────────────────────

Search

search_history

recent_files

recent_symbols

────────────────────────────────────────

Settings

user_settings

workspace_settings

theme_settings

notification_settings

tool_settings

────────────────────────────────────────

Audit

audit_logs

security_events

login_history

activity_logs

────────────────────────────────────────

Future

subscriptions

organizations

teams

billing

plugins

marketplace

──────────────────────────────────────────────────────────────

# users Table

Stores

User ID

Name

Email

Avatar

Password Hash

OAuth

Role

Timezone

Language

Status

Created At

Updated At

Deleted At

Soft delete only.

──────────────────────────────────────────────────────────────

# workspaces

Each workspace owns

Repository

Memory

Embeddings

Settings

Rules

Index

Runtime

Permissions

Workspace is the main isolation boundary.

──────────────────────────────────────────────────────────────

# conversations

Stores

Workspace ID

Conversation Title

Current Model

Runtime Status

Created

Updated

Archived

Pinned

Never store embeddings here.

──────────────────────────────────────────────────────────────

# messages

Stores

Conversation ID

Role

Markdown

Attachments

Streaming Status

Token Count

Generation Time

Message Order

Parent Message

──────────────────────────────────────────────────────────────

# runtime_sessions

Stores

Current State

Planner State

Current Tool

Current File

Progress

Cancellation Token

Resume Token

Checkpoint ID

──────────────────────────────────────────────────────────────

# approval_requests

Stores

Approval Type

Command

Files

Diff

Reason

Created

Approved

Rejected

Expired

Execution continues only after approval.

──────────────────────────────────────────────────────────────

# model_usage

Tracks

Prompt Tokens

Completion Tokens

Latency

Cost

Provider

Model

Temperature

Workspace

Conversation

──────────────────────────────────────────────────────────────

# Audit Logs

Every important action creates an immutable log.

Examples

User Login

Workspace Created

Conversation Deleted

Permission Granted

File Edited

Git Commit

Deployment

Tool Failure

Authentication Failure

Never allow modification.

──────────────────────────────────────────────────────────────

# LanceDB Collections

Each workspace owns separate collections.

Collections

code_embeddings

documentation_embeddings

conversation_embeddings

workspace_memory

summaries

rules

symbols

api_docs

examples

Never combine multiple workspaces.

──────────────────────────────────────────────────────────────

# Embedding Metadata

Every vector stores

workspace_id

repository_id

file_path

language

chunk_index

token_count

hash

created_at

updated_at

embedding_model

source_type

──────────────────────────────────────────────────────────────

# Repository Chunking

Repository

↓

Directory

↓

File

↓

Section

↓

Chunk

↓

Embedding

Chunk size

400–800 tokens

Overlap

80–120 tokens

Never embed entire files.

──────────────────────────────────────────────────────────────

# Redis Keys

session:{id}

runtime:{id}

conversation:{id}

stream:{id}

permission:{id}

queue:{id}

search:{id}

cache:{id}

locks:{id}

rate_limit:{id}

checkpoint:{id}

──────────────────────────────────────────────────────────────

# Redis Usage

Streaming markdown

Streaming events

Temporary runtime state

Pub/Sub

Rate limiting

Distributed locking

Cancellation

Resume

Queue metadata

Never store permanent data.

──────────────────────────────────────────────────────────────

# Object Storage Structure

uploads/

avatars/

attachments/

exports/

logs/

screenshots/

generated/

checkpoints/

workspace/

runtime/

Every object uses UUID filenames.

Metadata stored in PostgreSQL.

──────────────────────────────────────────────────────────────

# Memory Hierarchy

Global User Memory

↓

Workspace Memory

↓

Repository Memory

↓

Conversation Memory

↓

Task Memory

↓

Runtime Memory

Each level has

Priority

Expiration

Compression

Embedding

Summary

Source

Confidence

──────────────────────────────────────────────────────────────

# Checkpoint System

Checkpoint stores

Planner State

Current Tool

Runtime Variables

Pending Permissions

Context Snapshot

Memory Snapshot

Streaming Offset

Current Step

Retry Count

Used for

Resume

Recovery

Crash restoration

──────────────────────────────────────────────────────────────

# Data Retention

Messages

Never automatically deleted

Runtime Logs

30 days

Streaming Buffers

24 hours

Embeddings

Rebuilt when necessary

Audit Logs

Forever

Uploads

User controlled

──────────────────────────────────────────────────────────────

# Database Rules

Never duplicate data.

Normalize relational entities.

Denormalize only for performance.

Use UUID primary keys.

Soft delete important entities.

Timestamp every record.

Use optimistic locking where needed.

Index every foreign key.

Never expose internal IDs to the UI.

──────────────────────────────────────────────────────────────

# Required Indexes

users(email)

workspaces(owner_id)

conversations(workspace_id)

messages(conversation_id)

runtime_sessions(conversation_id)

approval_requests(runtime_id)

audit_logs(user_id)

repository_files(repository_id)

search_history(user_id)

token_usage(workspace_id)

Plus composite indexes for

(workspace_id, created_at)

(conversation_id, order)

(runtime_id, status)

──────────────────────────────────────────────────────────────

# Scalability Rules

Support

10M users

100M conversations

Billions of embeddings

Distributed workers

Multiple PostgreSQL replicas

Redis Cluster

LanceDB sharding

S3-compatible storage

Stateless API servers

──────────────────────────────────────────────────────────────

# Backup Strategy

PostgreSQL
Daily backups
Point-in-time recovery

Redis
Ephemeral
No backup required

LanceDB
Incremental snapshots

Object Storage
Versioning enabled

──────────────────────────────────────────────────────────────

# Final Objective

The Vedix storage layer must be cloud-native, horizontally scalable, multi-tenant, secure, and optimized for AI workflows.

Each storage engine has a clearly defined responsibility:

• PostgreSQL for structured relational data.
• LanceDB for semantic retrieval and long-term AI memory.
• Redis for ephemeral runtime state and event streaming.
• Object storage for binary assets and checkpoints.

The architecture should be capable of powering an enterprise AI coding platform serving millions of users while maintaining strict tenant isolation, high performance, and reliable recovery from failures.
