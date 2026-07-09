# Vedix Engineering Specification
# Part 4.3.1 — REST API Architecture

Version: 1.0

────────────────────────────────────────────────────────────────────

# Goal

Build a production-grade REST API capable of supporting

• Multi User
• Multi Workspace
• Multiple Conversations
• Multiple Runtime Sessions
• Streaming
• Authentication
• Permissions
• AI Runtime
• Tool Execution
• Future Mobile Apps
• Future Desktop Apps
• Future CLI
• Future Public SDK

The API should be completely independent from React.

React is only one client.

Everything communicates through the API.

────────────────────────────────────────────────────────────────────

# API Philosophy

API owns communication.

Runtime owns execution.

Database owns persistence.

Frontend owns rendering.

Never mix responsibilities.

────────────────────────────────────────────────────────────────────

# API Standards

Protocol

HTTPS

Encoding

JSON

Compression

Brotli

Gzip

Authentication

JWT

Refresh Token

API Version

/api/v1

Future

/api/v2

Never break old clients.

────────────────────────────────────────────────────────────────────

# Folder Structure

api/

controllers/

routes/

middlewares/

validators/

dto/

responses/

errors/

plugins/

interceptors/

openapi/

tests/

Every folder owns one responsibility.

────────────────────────────────────────────────────────────────────

# Controller Rules

Controller responsibilities

Validate Request

Authenticate

Call Service

Return Response

Never

Access Database

Call Runtime directly

Generate Business Logic

Generate AI Responses

Controllers should remain under 100 lines.

────────────────────────────────────────────────────────────────────

# Service Rules

Services contain business logic.

ConversationService

WorkspaceService

RuntimeService

SearchService

MemoryService

ApprovalService

ModelService

AuthenticationService

Each service should expose interfaces only.

────────────────────────────────────────────────────────────────────

# Route Structure

/api/v1

/auth

/users

/workspaces

/projects

/repositories

/conversations

/messages

/runtime

/events

/search

/memory

/context

/approval

/tools

/models

/settings

/history

/uploads

/downloads

/admin

/health

Every domain gets its own router.

────────────────────────────────────────────────────────────────────

# Authentication Routes

POST

/auth/register

POST

/auth/login

POST

/auth/logout

POST

/auth/refresh

POST

/auth/reset-password

GET

/auth/me

POST

/auth/oauth/github

POST

/auth/oauth/google

Future

SSO

Enterprise Login

Azure

Okta

────────────────────────────────────────────────────────────────────

# User Routes

GET

/users/profile

PATCH

/users/profile

DELETE

/users/profile

GET

/users/preferences

PATCH

/users/preferences

GET

/users/models

PATCH

/users/models

────────────────────────────────────────────────────────────────────

# Workspace Routes

GET

/workspaces

POST

/workspaces

PATCH

/workspaces/:id

DELETE

/workspaces/:id

GET

/workspaces/:id/members

POST

/workspaces/:id/members

DELETE

/workspaces/:id/members/:user

GET

/workspaces/:id/settings

PATCH

/workspaces/:id/settings

────────────────────────────────────────────────────────────────────

# Repository Routes

GET

/repositories

POST

/repositories

POST

/repositories/index

POST

/repositories/reindex

GET

/repositories/status

GET

/repositories/files

GET

/repositories/symbols

GET

/repositories/branches

────────────────────────────────────────────────────────────────────

# Conversation Routes

GET

/conversations

POST

/conversations

GET

/conversations/:id

PATCH

/conversations/:id

DELETE

/conversations/:id

POST

/conversations/:id/archive

POST

/conversations/:id/pin

POST

/conversations/:id/export

POST

/conversations/:id/import

────────────────────────────────────────────────────────────────────

# Message Routes

GET

/messages

POST

/messages

PATCH

/messages/:id

DELETE

/messages/:id

POST

/messages/:id/retry

POST

/messages/:id/regenerate

POST

/messages/:id/continue

POST

/messages/:id/stop

────────────────────────────────────────────────────────────────────

# Runtime Routes

GET

/runtime/:id

POST

/runtime/start

POST

/runtime/stop

POST

/runtime/cancel

POST

/runtime/resume

POST

/runtime/retry

POST

/runtime/checkpoint

POST

/runtime/restore

GET

/runtime/status

────────────────────────────────────────────────────────────────────

# Tool Routes

GET

/tools

POST

/tools/run

POST

/tools/cancel

GET

/tools/status

GET

/tools/history

GET

/tools/logs

Future

Plugin Marketplace

────────────────────────────────────────────────────────────────────

# Search Routes

GET

/search

POST

/search/code

POST

/search/documentation

POST

/search/workspace

POST

/search/symbols

POST

/search/history

────────────────────────────────────────────────────────────────────

# Memory Routes

GET

/memory

POST

/memory/update

POST

/memory/compress

POST

/memory/reset

POST

/memory/pin

POST

/memory/unpin

────────────────────────────────────────────────────────────────────

# Approval Routes

GET

/approval/pending

POST

/approval/:id/approve

POST

/approval/:id/reject

GET

/approval/history

────────────────────────────────────────────────────────────────────

# Upload Routes

POST

/uploads/image

POST

/uploads/file

POST

/uploads/folder

POST

/uploads/archive

GET

/uploads/:id

DELETE

/uploads/:id

────────────────────────────────────────────────────────────────────

# Health Routes

GET

/health

GET

/ready

GET

/version

GET

/metrics

────────────────────────────────────────────────────────────────────

# Request Lifecycle

HTTP Request

↓

Authentication

↓

Rate Limit

↓

Validation

↓

Authorization

↓

Controller

↓

Service

↓

Runtime

↓

Database

↓

Response

Every request follows identical lifecycle.

────────────────────────────────────────────────────────────────────

# Request Validation

Every endpoint validates

Headers

Body

Query

Params

Workspace

Permissions

JSON Schema

Zod

No request reaches controller before validation.

────────────────────────────────────────────────────────────────────

# API Response Format

Every response

success

message

data

meta

errors

requestId

timestamp

version

Never return raw exceptions.

────────────────────────────────────────────────────────────────────

# Pagination

Cursor based.

Never offset pagination.

Response

items

cursor

hasNext

total

Supports

Forward

Backward

Infinite Scroll

────────────────────────────────────────────────────────────────────

# Filtering

Supports

search

sort

order

page

cursor

limit

workspace

conversation

status

createdAfter

createdBefore

────────────────────────────────────────────────────────────────────

# Error Format

status

code

message

details

requestId

timestamp

Example

INVALID_WORKSPACE

INVALID_TOKEN

NOT_FOUND

PERMISSION_DENIED

RATE_LIMIT

TOOL_TIMEOUT

MODEL_OFFLINE

RUNTIME_ERROR

────────────────────────────────────────────────────────────────────

# API Versioning

Every endpoint

/api/v1

Future

/api/v2

Never break clients.

Deprecated endpoints remain available.

────────────────────────────────────────────────────────────────────

# OpenAPI

Every route documented.

Generate

Swagger

OpenAPI

SDK

TypeScript Client

Future

Python SDK

Go SDK

Rust SDK

────────────────────────────────────────────────────────────────────

# API Rules

Controllers remain thin.

Business logic inside services.

Never expose database schema.

Never expose runtime internals.

Every endpoint documented.

Every request validated.

Every response typed.

Every error standardized.

Every request logged.

Every endpoint tested.

────────────────────────────────────────────────────────────────────

# Final Objective

The REST API forms the stable contract between all Vedix clients and the backend.

It must remain versioned, strongly typed, secure, modular, and independent of any specific frontend implementation. Every application—React, VS Code extension, CLI, desktop, or mobile—should interact with the same API layer, ensuring consistency, maintainability, and long-term scalability.
