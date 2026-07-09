# Vedix Engineering Specification
# Part 4.3.3 — Event Bus & Event Streaming Architecture

Version: 1.0

──────────────────────────────────────────────────────────────

# Goal

Create a centralized event-driven architecture that coordinates every
backend component without tight coupling.

The Event Bus becomes the communication backbone of Vedix.

Every module communicates through events.

Nothing talks directly unless absolutely necessary.

──────────────────────────────────────────────────────────────

# Philosophy

Traditional Backend

Controller

↓

Planner

↓

Runtime

↓

Tool

↓

Memory

↓

UI

Everything tightly coupled.

Vedix

Controller

↓

Event Bus

↓

Runtime

↓

Event Bus

↓

Planner

↓

Event Bus

↓

Tool

↓

Event Bus

↓

Frontend

Every component is replaceable.

──────────────────────────────────────────────────────────────

# High Level Architecture

                User

                  │

             REST API

                  │

          Publish Event

                  │

──────────────────────────────────

              Event Bus

──────────────────────────────────

      │

 ┌────┼───────────────────────────────┐

 ▼    ▼          ▼         ▼          ▼

Runtime Planner Memory Tool UI Stream

──────────────────────────────────────────────

# Event Bus Responsibilities

Publish Events

Subscribe Events

Replay Events

Persist Events

Broadcast Events

Filter Events

Version Events

Retry Delivery

Dead Letter Queue

Telemetry

Never execute business logic.

──────────────────────────────────────────────

# Event Lifecycle

Event Created

↓

Validated

↓

Published

↓

Persisted

↓

Subscribers Notified

↓

Acknowledged

↓

Archived

Every event is immutable.

──────────────────────────────────────────────

# Event Envelope

Every event must follow exactly one schema.

interface AgentEvent<T> {

id

sequence

timestamp

version

workspaceId

conversationId

runtimeId

sessionId

userId

source

category

type

payload

metadata

correlationId

causationId

retry

}

This schema never changes.

──────────────────────────────────────────────

# Event Sources

Frontend

REST API

Runtime

Planner

Memory

Context

Search

Filesystem

Git

Terminal

Browser

MCP

Embedding

Indexer

Queue Worker

Approval Manager

Scheduler

──────────────────────────────────────────────

# Event Categories

system

runtime

conversation

tool

terminal

filesystem

git

browser

memory

context

planner

approval

telemetry

notification

security

indexing

embedding

search

──────────────────────────────────────────────

# Runtime Events

runtime.started

runtime.paused

runtime.resumed

runtime.cancelled

runtime.completed

runtime.failed

runtime.recovering

runtime.checkpoint

──────────────────────────────────────────────

# Conversation Events

conversation.created

conversation.deleted

conversation.updated

conversation.archived

conversation.restored

message.created

message.updated

message.deleted

──────────────────────────────────────────────

# Planning Events

planner.started

planner.completed

planner.updated

planner.failed

planner.replanned

step.started

step.completed

step.failed

──────────────────────────────────────────────

# Tool Events

tool.selected

tool.initialized

tool.started

tool.progress

tool.output

tool.finished

tool.failed

tool.cancelled

──────────────────────────────────────────────

# File Events

file.read

file.created

file.updated

file.deleted

file.renamed

patch.generated

patch.applied

patch.rejected

──────────────────────────────────────────────

# Terminal Events

terminal.started

terminal.output

terminal.progress

terminal.finished

terminal.failed

terminal.cancelled

──────────────────────────────────────────────

# Git Events

git.status

git.diff

git.commit

git.push

git.pull

git.branch

git.checkout

──────────────────────────────────────────────

# Approval Events

approval.created

approval.pending

approval.accepted

approval.rejected

approval.expired

approval.cancelled

──────────────────────────────────────────────

# Memory Events

memory.loaded

memory.updated

memory.compressed

memory.expired

memory.summarized

──────────────────────────────────────────────

# Context Events

context.loading

context.loaded

context.updated

context.compressed

context.failed

──────────────────────────────────────────────

# Search Events

search.started

search.progress

search.result

search.completed

──────────────────────────────────────────────

# Security Events

login.success

login.failed

token.expired

permission.denied

permission.granted

rate.limit

──────────────────────────────────────────────

# System Events

system.startup

system.shutdown

system.ready

system.error

system.warning

──────────────────────────────────────────────

# Event Flow Example

User

↓

POST /messages

↓

message.created

↓

Planner subscribes

↓

planner.started

↓

Runtime subscribes

↓

runtime.started

↓

Tool Registry subscribes

↓

tool.selected

↓

Filesystem Tool

↓

file.read

↓

Planner

↓

planner.updated

↓

Runtime

↓

tool.started

↓

tool.finished

↓

patch.generated

↓

approval.pending

↓

Frontend receives stream

──────────────────────────────────────────────

# Event Subscription

Every service subscribes only to required events.

Planner

message.created

runtime.resumed

approval.accepted

Runtime

planner.completed

tool.finished

tool.failed

Memory

conversation.updated

runtime.completed

Context

runtime.started

planner.started

Search

search.started

──────────────────────────────────────────────

# Event Ordering

Every runtime maintains

Sequence Number

1

2

3

4

5

...

Never skip numbers.

Allows replay.

Allows recovery.

Allows synchronization.

──────────────────────────────────────────────

# Event Replay

Reconnect

↓

Last Sequence

↓

Replay Missing

↓

Continue Streaming

Frontend never loses events.

──────────────────────────────────────────────

# Event Persistence

Every important event stored.

Examples

Runtime Started

Planner Created

Patch Generated

Approval Requested

Command Executed

Runtime Completed

Events are append-only.

Never mutate history.

──────────────────────────────────────────────

# Dead Letter Queue

If subscriber fails

↓

Retry

↓

Retry

↓

Retry

↓

Move to Dead Letter Queue

Administrator can inspect.

Nothing disappears.

──────────────────────────────────────────────

# Retry Policy

Network

1

2

4

8

16

seconds

Max

5 retries

──────────────────────────────────────────────

# Event Validation

Validate

Version

Payload

Workspace

Runtime

Conversation

Permissions

Schema

Reject invalid events.

──────────────────────────────────────────────

# Event Compression

High-frequency events

tool.progress

terminal.output

thinking.stream

command.output

Batch

Compress

Stream

──────────────────────────────────────────────

# Event Security

Never trust publisher.

Validate identity.

Validate permissions.

Validate schema.

Sanitize payload.

Prevent replay attacks.

Prevent duplicated events.

──────────────────────────────────────────────

# Event Versioning

version:1

Future

version:2

Consumers support both versions.

Never break compatibility.

──────────────────────────────────────────────

# Monitoring

Track

Events/sec

Subscribers

Latency

Dropped Events

Replay Count

Retry Count

Dead Letters

Memory Usage

CPU

──────────────────────────────────────────────

# Event Bus Rules

Every module communicates using events.

Events are immutable.

Events are typed.

Events are versioned.

Events are replayable.

Events are append-only.

Never block publishers.

Never allow circular dependencies.

Never expose internal implementation.

──────────────────────────────────────────────

# Future Enhancements

Kafka Adapter

NATS Adapter

RabbitMQ Adapter

Cloud Event Bus

Cross Workspace Events

Distributed Runtime

Remote Workers

Multi-Agent Collaboration

Event Analytics Dashboard

Time Travel Debugger

──────────────────────────────────────────────

# Final Objective

The Event Bus is the nervous system of Vedix.

It decouples every subsystem while providing reliable communication,
event replay, observability, fault tolerance, and scalability.

Every planner decision, runtime state change, tool execution,
memory update, approval request, and frontend update flows through the
same immutable event protocol.

This architecture allows Vedix to scale from a local AI coding assistant
to a distributed cloud-native autonomous software engineering platform
without changing how components communicate.
