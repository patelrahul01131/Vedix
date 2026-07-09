# Vedix Engineering Specification
# Part 4.3.4 — API Contracts, DTOs & Communication Protocol

Version: 1.0

────────────────────────────────────────────────────────────────────

# Goal

Create a strongly typed communication layer that ensures every
component, service, worker, tool, frontend, and external client
communicates using immutable, versioned contracts.

Every request.

Every response.

Every event.

Every DTO.

Must have a defined schema.

No implicit contracts.

No "any".

No dynamic payloads.

────────────────────────────────────────────────────────────────────

# Contract Philosophy

Frontend

↓

REST DTO

↓

Controller

↓

Service DTO

↓

Domain Model

↓

Runtime Model

↓

Event DTO

↓

WebSocket

↓

React Store

Every layer owns its own types.

Never expose database models.

────────────────────────────────────────────────────────────────────

# Folder Structure

contracts/

api/

dto/

events/

runtime/

planner/

tools/

approval/

memory/

context/

conversation/

workspace/

user/

model/

storage/

common/

errors/

validation/

shared/

types/

Every folder contains only contracts.

No business logic.

────────────────────────────────────────────────────────────────────

# Contract Layers

External API Contracts

↓

Controller DTOs

↓

Domain Models

↓

Runtime Models

↓

Event Contracts

↓

Persistence Models

Each layer converts explicitly.

Never reuse Prisma models.

────────────────────────────────────────────────────────────────────

# Request DTO Example

CreateConversationRequest

workspaceId

title

model

attachments

metadata

Validation

Required Fields

String Length

UUID

File Limits

Workspace Access

────────────────────────────────────────────────────────────────────

# Response DTO

Every response contains

success

message

data

meta

requestId

timestamp

version

Never return raw objects.

────────────────────────────────────────────────────────────────────

# Common Metadata

Every request

requestId

traceId

userId

workspaceId

conversationId

runtimeId

sessionId

deviceId

clientVersion

platform

timezone

language

────────────────────────────────────────────────────────────────────

# Runtime Contract

RuntimeStatus

Current State

Current Step

Current Tool

Progress

ETA

Checkpoint

Current File

Remaining Steps

Memory Usage

Token Usage

Estimated Cost

────────────────────────────────────────────────────────────────────

# Planner Contract

PlannerPlan

Goal

Description

Priority

Complexity

Estimated Tokens

Estimated Time

Dependencies

Verification Steps

Execution Steps

────────────────────────────────────────────────────────────────────

# Planner Step

id

title

description

tool

status

priority

dependsOn

estimatedTime

retryCount

metadata

────────────────────────────────────────────────────────────────────

# Conversation Contract

Conversation

id

workspaceId

title

summary

model

createdAt

updatedAt

status

messageCount

runtimeState

────────────────────────────────────────────────────────────────────

# Message Contract

Message

id

conversationId

role

markdown

attachments

toolCalls

events

status

createdAt

tokenUsage

cost

────────────────────────────────────────────────────────────────────

# Tool Contract

ToolDefinition

id

name

description

category

permissions

timeout

supportsStreaming

supportsCancellation

requiredApproval

version

────────────────────────────────────────────────────────────────────

# Tool Request

toolId

arguments

workspaceId

runtimeId

timeout

metadata

────────────────────────────────────────────────────────────────────

# Tool Response

success

output

logs

files

warnings

errors

duration

exitCode

────────────────────────────────────────────────────────────────────

# Approval Contract

ApprovalRequest

id

runtimeId

title

description

reason

type

risk

expiresAt

commands

files

metadata

────────────────────────────────────────────────────────────────────

# Approval Response

approvalId

approved

reviewer

timestamp

reason

────────────────────────────────────────────────────────────────────

# Memory Contract

MemoryEntry

id

scope

priority

importance

embeddingId

summary

content

expiresAt

createdAt

updatedAt

────────────────────────────────────────────────────────────────────

# Context Contract

ContextSnapshot

workspace

conversation

recentFiles

repository

symbols

embeddings

rules

gitStatus

dependencies

────────────────────────────────────────────────────────────────────

# Search Contract

SearchRequest

query

filters

workspace

repository

semantic

limit

SearchResponse

results

score

path

line

preview

source

────────────────────────────────────────────────────────────────────

# File Contract

FileDescriptor

id

path

language

size

hash

createdAt

modifiedAt

readonly

ignored

indexed

────────────────────────────────────────────────────────────────────

# Patch Contract

Patch

id

files

summary

insertions

deletions

risk

approvalRequired

generatedAt

────────────────────────────────────────────────────────────────────

# Streaming Contract

StreamChunk

streamId

sequence

type

content

finished

timestamp

Every streamed chunk ordered.

────────────────────────────────────────────────────────────────────

# Event Contract

Every event

id

version

category

type

timestamp

sequence

runtimeId

conversationId

workspaceId

userId

payload

metadata

correlationId

causationId

────────────────────────────────────────────────────────────────────

# Error Contract

ErrorResponse

code

message

details

stack (development only)

requestId

retryable

timestamp

────────────────────────────────────────────────────────────────────

# Validation Rules

Every DTO validates

UUID

Enums

Strings

Numbers

Arrays

Dates

Limits

Permissions

Workspace

File Paths

Commands

Never trust incoming data.

────────────────────────────────────────────────────────────────────

# Serialization

Dates

ISO8601

UUID

String

Enums

Literal Types

Never send BigInt.

Never send undefined.

Use null explicitly.

────────────────────────────────────────────────────────────────────

# Versioning

Every contract

version

Current

1

Future

2

Consumers negotiate supported versions.

────────────────────────────────────────────────────────────────────

# Type Generation

Single source of truth.

Generate

TypeScript Types

OpenAPI

SDK Types

Validation Schemas

Frontend Types

Worker Types

CLI Types

Never duplicate interfaces.

────────────────────────────────────────────────────────────────────

# Compatibility Rules

New fields optional.

Never remove existing fields.

Never rename fields.

Deprecate before removal.

Maintain backward compatibility.

────────────────────────────────────────────────────────────────────

# Testing

Validate every contract.

Snapshot API responses.

Schema tests.

Compatibility tests.

Contract tests.

Cross-version tests.

────────────────────────────────────────────────────────────────────

# Final Objective

The Vedix contract layer establishes a stable, strongly typed,
versioned communication protocol for every component in the system.

It guarantees that the frontend, backend, runtime, workers, tools,
plugins, and future SDKs communicate using the same immutable contracts,
eliminating ambiguity and reducing integration errors while enabling
long-term maintainability and scalability.
