# Vedix Engineering Specification
# Part 5.5 — Memory Architecture & Knowledge System

Version: 1.0

──────────────────────────────────────────────────────────────

# Goal

Build a hierarchical memory system that enables Vedix to remember
information across multiple timescales while preventing context overload.

The memory system should distinguish between

Temporary information

Conversation history

Workspace knowledge

Long-term user preferences

Repository architecture

Successful workflows

Semantic knowledge

Memory should improve reasoning.

Not increase token usage.

────────────────────────────────────────

# Philosophy

Conversation

↓

Working Memory

↓

Short-Term Memory

↓

Workspace Memory

↓

Long-Term Memory

↓

Knowledge Base

↓

Semantic Memory

Every memory has different lifespan.

────────────────────────────────────────

# High Level Architecture

                    Runtime

                       │

                       ▼

                Memory Manager

                       │

────────────────────────────────────────

Working Memory

Conversation Memory

Workspace Memory

Long-Term Memory

Semantic Memory

Knowledge Graph

Memory Cache

────────────────────────────────────────

                       │

                       ▼

                  Context Engine

────────────────────────────────────────

# Memory Types

Working Memory

Conversation Memory

Workspace Memory

Long-Term Memory

Semantic Memory

Procedural Memory

Repository Memory

Knowledge Memory

Tool Memory

Execution Memory

Reflection Memory

────────────────────────────────────────

# Working Memory

Purpose

Current execution state.

Contains

Current goal

Current plan

Current step

Current tool

Current files

Current diagnostics

Current verification state

Planner state

Runtime state

Lifetime

Runtime only.

Destroyed after completion.

────────────────────────────────────────

# Conversation Memory

Purpose

Maintain conversation continuity.

Contains

Messages

Plans

Summaries

Approvals

Generated patches

Errors

Decisions

Lifetime

Conversation.

────────────────────────────────────────

# Workspace Memory

Purpose

Repository-specific knowledge.

Contains

Architecture

Folder structure

Coding standards

Ignored files

Pinned instructions

Repository summary

Framework

Build commands

Testing commands

Deployment rules

Known issues

Common patterns

Lifetime

Workspace.

Persistent.

────────────────────────────────────────

# Long-Term Memory

Purpose

Remember user preferences.

Contains

Preferred models

Coding style

Naming conventions

Testing preferences

Review preferences

Documentation style

Formatting preferences

Tool preferences

Approval preferences

Lifetime

Across workspaces.

────────────────────────────────────────

# Semantic Memory

Purpose

Retrieve related knowledge.

Contains

Embeddings

Repository chunks

Documentation

Architecture notes

Past solutions

API documentation

Design decisions

Retrieved using vector search.

────────────────────────────────────────

# Procedural Memory

Purpose

Remember workflows.

Examples

Create CRUD API

Fix React bug

Refactor component

Add authentication

Database migration

Generate tests

Planner can reuse.

────────────────────────────────────────

# Repository Memory

Contains

Packages

Modules

Services

Components

Routes

Database schema

Configuration

Dependency graph

Public APIs

Shared utilities

Continuously updated.

────────────────────────────────────────

# Tool Memory

Contains

Successful commands

Failed commands

Execution history

Average runtime

Tool reliability

Preferred tools

Used for tool selection.

────────────────────────────────────────

# Reflection Memory

Contains

Failures

Successful fixes

Recovery strategies

Alternative approaches

Verification outcomes

Improves future reasoning.

────────────────────────────────────────

# Knowledge Graph

Workspace

↓

Packages

↓

Modules

↓

Files

↓

Symbols

↓

References

↓

Relationships

Supports graph retrieval.

────────────────────────────────────────

# Memory Lifecycle

Observe

↓

Extract

↓

Classify

↓

Validate

↓

Store

↓

Index

↓

Retrieve

↓

Update

↓

Archive

────────────────────────────────────────

# Memory Classification

Temporary

Session

Workspace

Persistent

Semantic

Historical

Archived

────────────────────────────────────────

# Memory Importance

LOW

Can expire.

MEDIUM

Useful later.

HIGH

Persistent.

CRITICAL

Never delete automatically.

────────────────────────────────────────

# Storage Strategy

Working Memory

Runtime

Conversation Memory

PostgreSQL

Workspace Memory

PostgreSQL

Semantic Memory

LanceDB

Knowledge Graph

Neo4j (optional)

Cache

Redis

Files

Object Storage

────────────────────────────────────────

# Memory Retrieval

Planner

↓

Memory Manager

↓

Rank Memories

↓

Merge

↓

Deduplicate

↓

Validate

↓

Context Engine

────────────────────────────────────────

# Memory Ranking

Current task

Workspace relevance

Conversation relevance

Semantic similarity

Recency

Importance

Confidence

Usage frequency

────────────────────────────────────────

# Memory Compression

Summarize

Old conversations

Old plans

Completed tasks

Large outputs

Logs

Terminal output

Store summaries.

────────────────────────────────────────

# Memory Consolidation

After task completion

↓

Summarize

↓

Extract lessons

↓

Store preferences

↓

Update workspace memory

↓

Generate embeddings

↓

Archive execution

────────────────────────────────────────

# Forgetting Strategy

Automatically remove

Expired cache

Temporary runtime

Duplicate memories

Obsolete embeddings

Old logs

Never delete

Pinned memories

Critical memories

Workspace rules

────────────────────────────────────────

# Memory Cache

Cache

Recent memories

Recent embeddings

Repository summary

Recent searches

Open files

Hot symbols

Redis.

────────────────────────────────────────

# Workspace Learning

Learn

Frequently edited files

Common commands

Preferred workflows

Architecture patterns

Frequently accessed symbols

Frequently used prompts

Repository conventions

────────────────────────────────────────

# User Learning

Learn

Preferred response length

Preferred explanation style

Review habits

Approval frequency

Model choices

Framework preferences

Always user-controllable.

────────────────────────────────────────

# Memory Validation

Before retrieval

Verify

Workspace

Freshness

Confidence

Permission

Duplicates

Embedding version

────────────────────────────────────────

# Memory Events

memory.created

memory.updated

memory.deleted

memory.archived

memory.retrieved

memory.compressed

memory.learned

memory.failed

────────────────────────────────────────

# Privacy

Workspace isolation.

Conversation isolation.

Organization isolation.

Encryption at rest.

Encryption in transit.

No cross-user leakage.

User can export memory.

User can delete memory.

User controls persistence.

────────────────────────────────────────

# Telemetry

Track

Memory hits

Memory misses

Retrieval latency

Embedding quality

Compression ratio

Workspace growth

Cache hit rate

Memory usefulness

────────────────────────────────────────

# Rules

Never retrieve irrelevant memory.

Never exceed token budget.

Never leak memory across users.

Always validate freshness.

Always rank memories.

Always deduplicate.

Always respect user privacy.

────────────────────────────────────────

# Future Enhancements

Cross-workspace knowledge

Organization memory

Team memory

Shared architecture memory

Cloud synchronization

Knowledge graph reasoning

Adaptive forgetting

Memory versioning

Memory branching

AI-generated documentation

────────────────────────────────────────

# Final Objective

The Memory System enables Vedix to retain useful knowledge across
multiple execution timescales while remaining efficient, private, and
context-aware.

Rather than repeatedly rediscovering the same information, Vedix
continuously learns about repositories, workflows, user preferences,
architectural decisions, and successful solutions, allowing future tasks
to be completed faster, with greater consistency and higher accuracy.

Memory should act as a force multiplier for reasoning, planning, and
context retrieval without overwhelming the language model or compromising
privacy.
