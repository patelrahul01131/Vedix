# Vedix Engineering Specification
# Part 4.3.6 — Error Handling, Validation, Retry & Resilience

Version: 1.0

──────────────────────────────────────────────────────────────

# Goal

Build a backend that can continue operating even when

Models fail

Network disconnects

Database becomes unavailable

Redis disconnects

Workers crash

User refreshes browser

VS Code reloads

Tool execution fails

Commands timeout

Streaming disconnects

Server restarts

The user should almost never lose progress.

────────────────────────────────────────

# Engineering Philosophy

Everything fails.

Plan for failure.

Never crash.

Recover automatically.

Checkpoint everything.

Retry intelligently.

Never lose data.

────────────────────────────────────────

# Failure Categories

Validation

↓

Authentication

↓

Authorization

↓

Business Logic

↓

Tool

↓

Runtime

↓

Infrastructure

↓

External Service

↓

Unexpected

Each category handled differently.

────────────────────────────────────────

# Error Hierarchy

ApplicationError

│

├── ValidationError

├── AuthenticationError

├── AuthorizationError

├── RuntimeError

├── PlannerError

├── ToolError

├── SearchError

├── ContextError

├── MemoryError

├── DatabaseError

├── CacheError

├── NetworkError

├── TimeoutError

├── ExternalAPIError

├── ConfigurationError

├── SecurityError

├── InternalError

Never throw raw Error.

────────────────────────────────────────

# Error Metadata

Every error contains

id

code

message

category

severity

retryable

source

runtimeId

workspaceId

conversationId

userId

timestamp

stack

correlationId

────────────────────────────────────────

# Severity Levels

DEBUG

INFO

WARNING

ERROR

CRITICAL

FATAL

FATAL should almost never occur.

────────────────────────────────────────

# Validation

Validate

Request

↓

Headers

↓

JWT

↓

Workspace

↓

Conversation

↓

Files

↓

Commands

↓

Tool Arguments

↓

Database

↓

Execution

Never execute invalid input.

────────────────────────────────────────

# Request Validation

Body

Query

Params

Headers

Cookies

Workspace

Permissions

Rate Limit

JSON Schema

Zod

Reject before controller.

────────────────────────────────────────

# Runtime Validation

Current Runtime

Current State

Planner State

Checkpoint

Tool Exists

Permissions

Context

Memory

Conversation

────────────────────────────────────────

# Tool Validation

Filesystem

↓

Path

↓

Exists

↓

Allowed

↓

Permission

↓

Execute

Terminal

↓

Command

↓

Allowlist

↓

Approval

↓

Execute

────────────────────────────────────────

# Retry Philosophy

Retry only temporary failures.

Never retry permanent failures.

────────────────────────────────────────

# Retryable

HTTP 429

Timeout

Temporary Network

Redis Restart

Database Failover

Streaming Disconnect

Worker Restart

────────────────────────────────────────

# Never Retry

Permission Denied

Invalid Token

Validation Error

Missing File

Unsupported Tool

Syntax Error

User Cancelled

────────────────────────────────────────

# Retry Strategy

Attempt 1

↓

1 second

Attempt 2

↓

2 seconds

Attempt 3

↓

4 seconds

Attempt 4

↓

8 seconds

Attempt 5

↓

16 seconds

Max Attempts

5

Exponential Backoff

────────────────────────────────────────

# Circuit Breaker

Service

↓

Failure Count

↓

Threshold

↓

Open Circuit

↓

Reject Requests

↓

Cooldown

↓

Half Open

↓

Recovered

Used for

LLMs

Embedding API

GitHub API

Search

Database

Redis

────────────────────────────────────────

# Timeout Policy

REST

30 seconds

LLM

5 minutes

Tool

10 minutes

Search

60 seconds

Filesystem

30 seconds

Embedding

15 minutes

Worker

Unlimited

Configurable.

────────────────────────────────────────

# Recovery

Crash

↓

Load Checkpoint

↓

Restore Planner

↓

Restore Runtime

↓

Restore Memory

↓

Restore Context

↓

Restore Tool

↓

Continue

Never restart task from zero.

────────────────────────────────────────

# Checkpoint Frequency

Planner Updated

Tool Started

Tool Finished

Approval Requested

Approval Received

Patch Generated

Every 30 seconds

Server Shutdown

────────────────────────────────────────

# Runtime Recovery

If Runtime crashes

Restart Runtime

↓

Load Checkpoint

↓

Replay Events

↓

Continue

────────────────────────────────────────

# WebSocket Recovery

Disconnect

↓

Reconnect

↓

Authenticate

↓

Resume

↓

Replay Events

↓

Continue Streaming

────────────────────────────────────────

# Worker Recovery

Worker crashes

↓

BullMQ Retry

↓

Restore Job

↓

Continue

↓

Mark Complete

────────────────────────────────────────

# Database Recovery

Lost Connection

↓

Reconnect

↓

Retry Query

↓

Resume

↓

Log

────────────────────────────────────────

# Redis Recovery

Reconnect

↓

Resubscribe

↓

Reload Runtime Cache

↓

Continue

────────────────────────────────────────

# Model Recovery

LLM Timeout

↓

Retry

↓

Fallback Model

↓

Continue

↓

Notify User

Supports

OpenAI

Anthropic

Gemini

Open Source

────────────────────────────────────────

# Tool Recovery

Tool Timeout

↓

Cancel

↓

Cleanup

↓

Retry

↓

Fallback Tool

↓

Continue

────────────────────────────────────────

# Approval Recovery

Browser Closed

↓

Approval Stored

↓

Reconnect

↓

Restore Approval

↓

Continue

────────────────────────────────────────

# Graceful Shutdown

Stop Accepting Requests

↓

Save Runtime

↓

Save Checkpoints

↓

Finish Running Tools

↓

Close WebSockets

↓

Disconnect Database

↓

Shutdown

────────────────────────────────────────

# Startup Recovery

Server Starts

↓

Load Config

↓

Connect Services

↓

Restore Runtime

↓

Resume Workers

↓

Replay Streams

↓

Accept Requests

────────────────────────────────────────

# Logging

Structured JSON

Fields

timestamp

level

service

runtime

workspace

conversation

request

duration

Never use console.log.

────────────────────────────────────────

# Monitoring

Track

Request Rate

Latency

Runtime Duration

Planner Time

LLM Time

Embedding Time

Retry Count

Recovery Count

Crash Count

Memory Usage

CPU

WebSocket Count

────────────────────────────────────────

# Health Checks

GET /health

GET /ready

GET /live

GET /metrics

Checks

Database

Redis

LanceDB

Queue

Workers

Storage

LLM Provider

────────────────────────────────────────

# Alerts

Database Down

Redis Down

Queue Stuck

Worker Dead

High Error Rate

High Latency

LLM Offline

Storage Failure

Memory Leak

Repeated Runtime Failure

────────────────────────────────────────

# Error Boundaries

Backend

↓

Controller

↓

Service

↓

Runtime

↓

Tool

↓

Worker

↓

WebSocket

Every layer catches its own errors.

────────────────────────────────────────

# Security During Failure

Never expose stack traces.

Never expose SQL.

Never expose filesystem paths.

Never expose secrets.

Return standardized errors only.

────────────────────────────────────────

# Testing

Chaos Testing

Network Failure

Redis Failure

Database Failure

Worker Crash

Tool Timeout

Model Offline

WebSocket Disconnect

Filesystem Error

Server Restart

Everything should recover.

────────────────────────────────────────

# Final Rules

Never lose user messages.

Never lose runtime.

Never lose checkpoints.

Never lose approvals.

Everything retryable.

Everything recoverable.

Everything logged.

Everything observable.

Everything resumable.

────────────────────────────────────────

# Final Objective

Vedix must remain operational even when parts of the system fail.

Every component—from REST APIs and WebSockets to runtimes, tools,
workers, databases, caches, and AI providers—must gracefully detect
errors, preserve state, recover automatically where possible, and
continue execution without forcing the user to restart their work.

Resilience is a first-class architectural concern, ensuring that long-
running AI coding sessions remain reliable, fault-tolerant, and
enterprise-ready.
