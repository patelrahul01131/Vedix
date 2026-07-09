# Vedix Engineering Specification
# Part 4.3.2 — WebSocket Architecture

Version: 1.0

──────────────────────────────────────────────────────────────

# Goal

Build a production-grade real-time communication layer capable of
streaming every aspect of the agent without polling.

The WebSocket layer is responsible for synchronizing the backend
runtime with every connected client.

The frontend must never poll.

The frontend simply subscribes.

Everything else is streamed.

──────────────────────────────────────────────────────────────

# Philosophy

REST

↓

CRUD

Create

Read

Update

Delete

WebSocket

↓

Realtime Runtime

Agent

Progress

Thinking

Planning

Streaming

Approvals

Tool Output

Events

Logs

Memory

Context

Notifications

Never mix REST and WebSocket responsibilities.

──────────────────────────────────────────────────────────────

# High Level Architecture

                 React UI

                    │

             WebSocket Client

                    │

────────────────────────────────────────────

             Connection Manager

                    │

────────────────────────────────────────────

             WebSocket Gateway

                    │

────────────────────────────────────────────

              Event Dispatcher

                    │

────────────────────────────────────────────

              Runtime Event Bus

                    │

────────────────────────────────────────────

          Runtime / Planner / Tools

──────────────────────────────────────────────

# Responsibilities

WebSocket Gateway owns

Authentication

Connection

Heartbeat

Reconnect

Subscriptions

Streaming

Compression

Backpressure

Disconnect

Resume

Never executes runtime logic.

──────────────────────────────────────────────

# Connection Lifecycle

Client Opens

↓

Authenticate

↓

Validate Token

↓

Create Connection

↓

Register Session

↓

Subscribe Events

↓

Receive Stream

↓

Heartbeat

↓

Disconnect

↓

Resume

──────────────────────────────────────────────

# Authentication

Client

↓

JWT

↓

Gateway

↓

Validate

↓

Workspace Access

↓

Conversation Access

↓

Connection Created

Reject invalid users immediately.

──────────────────────────────────────────────

# Connection Object

Every connection stores

connectionId

userId

workspaceId

conversationId

runtimeId

deviceId

ip

platform

model

heartbeat

createdAt

lastSeen

state

──────────────────────────────────────────────

# Connection States

CONNECTING

↓

CONNECTED

↓

AUTHENTICATED

↓

SUBSCRIBED

↓

STREAMING

↓

DISCONNECTED

↓

RECONNECTING

↓

RESUMED

↓

CLOSED

──────────────────────────────────────────────

# Heartbeat

Every 20 seconds

Server

↓

PING

↓

Client

↓

PONG

If timeout

Disconnect

Cleanup

Save checkpoint

──────────────────────────────────────────────

# Event Philosophy

Everything is an event.

Nothing is special.

Thinking

↓

Event

Tool Output

↓

Event

Markdown

↓

Event

Errors

↓

Event

Approvals

↓

Event

Everything identical.

──────────────────────────────────────────────

# Event Format

Every event contains

eventId

sessionId

runtimeId

workspaceId

conversationId

userId

eventType

sequence

timestamp

payload

version

Never send anonymous events.

──────────────────────────────────────────────

# Event Categories

Conversation

Runtime

Planner

Memory

Context

Search

Files

Git

Terminal

Browser

MCP

Approval

Settings

Errors

Notifications

Telemetry

──────────────────────────────────────────────

# Runtime Events

RUNTIME_STARTED

RUNTIME_STOPPED

STATE_CHANGED

RUNTIME_PAUSED

RUNTIME_RESUMED

RUNTIME_COMPLETED

RUNTIME_CANCELLED

RUNTIME_FAILED

──────────────────────────────────────────────

# Thinking Events

THINKING_STARTED

THINKING_STREAM

THINKING_UPDATED

THINKING_FINISHED

──────────────────────────────────────────────

# Planning Events

PLAN_CREATED

PLAN_UPDATED

PLAN_STEP_STARTED

PLAN_STEP_COMPLETED

PLAN_FINISHED

──────────────────────────────────────────────

# Context Events

CONTEXT_LOADING

CONTEXT_UPDATED

CONTEXT_COMPRESSED

CONTEXT_EXPIRED

──────────────────────────────────────────────

# Memory Events

MEMORY_LOADING

MEMORY_UPDATED

MEMORY_SUMMARIZED

MEMORY_COMPRESSED

──────────────────────────────────────────────

# Search Events

SEARCH_STARTED

SEARCH_PROGRESS

SEARCH_RESULT

SEARCH_FINISHED

──────────────────────────────────────────────

# File Events

FILE_READ

FILE_EDITED

FILE_CREATED

FILE_DELETED

PATCH_GENERATED

PATCH_READY

──────────────────────────────────────────────

# Tool Events

TOOL_SELECTED

TOOL_STARTED

TOOL_PROGRESS

TOOL_OUTPUT

TOOL_WARNING

TOOL_FINISHED

TOOL_FAILED

──────────────────────────────────────────────

# Terminal Events

COMMAND_STARTED

COMMAND_OUTPUT

COMMAND_PROGRESS

COMMAND_FINISHED

COMMAND_CANCELLED

──────────────────────────────────────────────

# Git Events

GIT_STATUS

GIT_DIFF

GIT_COMMIT

GIT_PUSH

GIT_PULL

──────────────────────────────────────────────

# Approval Events

WAITING_APPROVAL

APPROVAL_RECEIVED

APPROVAL_ACCEPTED

APPROVAL_REJECTED

──────────────────────────────────────────────

# Error Events

WARNING

ERROR

RECOVERING

RETRY

FAILED

──────────────────────────────────────────────

# Streaming Markdown

Markdown should stream

word

↓

sentence

↓

paragraph

↓

completed message

Never wait for entire response.

──────────────────────────────────────────────

# Tool Streaming

Instead of

Running npm...

Finished.

Stream

Starting

↓

Installing packages

↓

34%

↓

67%

↓

Done

──────────────────────────────────────────────

# Progress Streaming

Current Step

Current File

Progress

ETA

Current Tool

Remaining Steps

Files Modified

Commands

Tests

Everything updates live.

──────────────────────────────────────────────

# Subscription System

Client subscribes

Conversation

Workspace

Runtime

Approvals

Notifications

Settings

Telemetry

Only receive subscribed events.

──────────────────────────────────────────────

# Resume

If internet disconnects

Reconnect

↓

Authenticate

↓

Resume

↓

Replay Missing Events

↓

Continue Streaming

User never loses progress.

──────────────────────────────────────────────

# Event Replay

Every event has

Sequence Number

Client reconnects

↓

Last Event

↓

Replay Missing

↓

Continue

Never duplicate events.

──────────────────────────────────────────────

# Backpressure

If frontend cannot render quickly

Buffer Events

↓

Compress

↓

Batch

↓

Continue

Never crash UI.

──────────────────────────────────────────────

# Compression

Compress

Markdown

Logs

Tool Output

Large Events

Never compress tiny events.

──────────────────────────────────────────────

# Multi Device

Same user

Laptop

↓

Desktop

↓

Browser

↓

VS Code

↓

Phone

All receive synchronized events.

──────────────────────────────────────────────

# Offline

If frontend offline

Save Runtime

↓

Continue

↓

Reconnect

↓

Replay

↓

Resume

──────────────────────────────────────────────

# Security

Authenticate every socket.

Authorize every subscription.

Validate every event.

Sanitize payload.

Rate limit messages.

Reject malformed packets.

Reject oversized payloads.

Never trust client events.

──────────────────────────────────────────────

# Performance

Batch events.

Binary encoding optional.

Lazy subscriptions.

Heartbeat optimization.

Reuse connections.

Delta updates.

Virtualized rendering.

Zero polling.

──────────────────────────────────────────────

# Error Recovery

If socket crashes

Reconnect

↓

Resume

↓

Replay

↓

Restore State

↓

Continue

User never refreshes.

──────────────────────────────────────────────

# Final Objective

The WebSocket layer is the nervous system of Vedix.

It continuously synchronizes the backend runtime with every connected
client through structured, typed, event-driven streams.

Every thought, plan, tool execution, progress update, approval request,
runtime state change, and completion is transmitted as an immutable event.

The frontend never polls, never guesses state, and never controls the
agent. It simply renders the current stream of backend events.

This architecture enables Vedix to feel responsive, reliable, scalable,
and capable of running long-lived autonomous coding sessions similar to
Cursor, Claude Code, and OpenCode while remaining resilient to network
interruptions, browser refreshes, and runtime recovery.
