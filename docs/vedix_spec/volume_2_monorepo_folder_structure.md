# Vedix Engineering Specification
# Part 2 — Monorepo, Folder Structure & Codebase Architecture

Version: 1.0

──────────────────────────────────────────────────────────────

# Goal

Build Vedix as an enterprise-grade AI coding platform.

The architecture must support:

- VS Code Extension
- Web Application
- Desktop Application (Future)
- CLI (Future)
- Cloud Hosted Agent
- Self Hosted Deployment
- Multi User
- Multiple Workspaces
- Multiple Conversations
- Multiple AI Models
- Multiple Agent Sessions
- Horizontal Scaling

The architecture must remain maintainable even after several years of development.

Never build a monolithic application.

Everything must be modular.

Every folder has one responsibility.

Every module must be independently testable.

No circular dependencies.

No duplicated business logic.

No duplicated UI.

No duplicated services.

──────────────────────────────────────────────────────────────

# Repository Layout

Use TurboRepo (preferred).

Repository

vedix/

    apps/
    packages/
    services/
    agents/
    infrastructure/
    scripts/
    docker/
    docs/
    .github/

Never put application logic inside the repository root.

The root only contains configuration.

──────────────────────────────────────────────────────────────

# Root Folder

vedix/

Contains

README.md

LICENSE

package.json

turbo.json

pnpm-workspace.yaml

.gitignore

.editorconfig

.prettierrc

.eslintrc

tsconfig.base.json

docker-compose.yml

.env.example

Never place application code here.

──────────────────────────────────────────────────────────────

# apps/

Contains runnable applications.

apps/

    web/

    vscode/

    desktop/

    docs/

Future

mobile/

cli/

Each application consumes packages.

Applications never contain business logic.

──────────────────────────────────────────────────────────────

# apps/web

React + Vite + Tailwind

Purpose

Browser interface.

Only UI.

Contains

src/

assets/

public/

vite.config.ts

index.html

No backend code.

──────────────────────────────────────────────────────────────

# src/

Contains

app/

pages/

layouts/

components/

features/

hooks/

providers/

store/

services/

lib/

types/

styles/

theme/

utils/

constants/

Every folder has one responsibility.

──────────────────────────────────────────────────────────────

# app/

Application bootstrap.

Contains

App.tsx

Router

Providers

Theme

Authentication

Error Boundaries

Never place feature code here.

──────────────────────────────────────────────────────────────

# layouts/

Contains layouts only.

MainLayout

AuthLayout

WorkspaceLayout

No business logic.

──────────────────────────────────────────────────────────────

# pages/

Only route level components.

Dashboard

Chat

Settings

Login

Workspace

History

Each page loads features.

──────────────────────────────────────────────────────────────

# features/

Every product feature becomes a feature.

Example

chat/

history/

settings/

approval/

permission/

terminal/

search/

memory/

context/

overlay/

model/

runtime/

status/

workspace/

attachments/

notifications/

markdown/

Every feature owns

components/

hooks/

store/

types/

api/

utils/

Never import another feature directly.

Shared logic belongs inside packages.

──────────────────────────────────────────────────────────────

# components/

Only reusable UI.

button/

input/

textarea/

dropdown/

modal/

avatar/

spinner/

badge/

tooltip/

codeblock/

markdown/

skeleton/

icons/

cards/

Everything reusable.

No feature logic.

──────────────────────────────────────────────────────────────

# hooks/

Shared hooks.

Examples

useDebounce

useShortcut

useStreaming

useResize

useTheme

useWorkspace

useClipboard

usePermission

Never access backend directly.

──────────────────────────────────────────────────────────────

# services/

API layer.

Contains

REST

WebSocket

Streaming

Authentication

Upload

Download

Reconnect

Retry

No UI.

──────────────────────────────────────────────────────────────

# store/

Global Zustand store.

Separate stores.

chatStore

uiStore

settingsStore

runtimeStore

workspaceStore

permissionStore

modelStore

historyStore

Never one giant store.

──────────────────────────────────────────────────────────────

# packages/

Contains shared libraries.

packages/

ui/

shared/

sdk/

events/

types/

config/

prompts/

markdown/

logger/

theme/

Each package must be independently publishable.

──────────────────────────────────────────────────────────────

# packages/ui

Reusable UI components.

No business logic.

Contains

Button

Card

Modal

Dropdown

CodeBlock

Input

Markdown

Skeleton

Icons

Theme

Animations

──────────────────────────────────────────────────────────────

# packages/events

Entire event system.

Defines

Events

Schemas

Validation

Types

Streaming

Event serialization

No runtime logic.

──────────────────────────────────────────────────────────────

# packages/sdk

Client SDK.

Handles

Authentication

REST

WebSocket

Streaming

Retries

Reconnect

Cancellation

Future mobile apps use same SDK.

──────────────────────────────────────────────────────────────

# packages/types

Contains

Agent Types

API Types

Database Types

Event Types

Runtime Types

Permission Types

Tool Types

Conversation Types

Workspace Types

Never duplicate interfaces.

──────────────────────────────────────────────────────────────

# services/

Contains backend services.

services/

api/

runtime/

worker/

gateway/

search/

embedding/

scheduler/

──────────────────────────────────────────────────────────────

# services/api

Fastify server.

Responsible for

REST API

WebSocket

Authentication

Sessions

Permissions

Conversation

Streaming

Uploads

Downloads

No AI logic.

──────────────────────────────────────────────────────────────

# services/runtime

Entire AI runtime.

Owns

Planner

Memory

Context

Execution

Reflection

Loop

Recovery

Checkpoint

Cancellation

Resume

Never exposes UI.

──────────────────────────────────────────────────────────────

# services/search

Owns

Vector Search

Embeddings

Ranking

Semantic Search

Chunk Retrieval

Repository Index

Documentation Search

──────────────────────────────────────────────────────────────

# services/worker

Background jobs.

BullMQ.

Responsible for

Indexing

Embeddings

Long running tasks

Compression

Summaries

Garbage collection

Cleanup

Retry jobs

──────────────────────────────────────────────────────────────

# agents/

Contains actual agent implementation.

agents/

core/

planner/

runtime/

context/

memory/

approvals/

tools/

reflection/

prompts/

events/

checkpoint/

telemetry/

No frontend.

──────────────────────────────────────────────────────────────

# tools/

Every tool isolated.

filesystem/

terminal/

git/

browser/

mcp/

rag/

documentation/

workspace/

database/

http/

Each tool exports

execute()

validate()

cancel()

cleanup()

No tool directly calls another tool.

──────────────────────────────────────────────────────────────

# Runtime Flow

Runtime

↓

Planner

↓

Context

↓

Memory

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

Loop until completed.

──────────────────────────────────────────────────────────────

# infrastructure/

Contains

postgres/

redis/

lancedb/

nginx/

monitoring/

prometheus/

grafana/

docker/

terraform/

kubernetes/

No application code.

──────────────────────────────────────────────────────────────

# docs/

Contains

Architecture

API

Database

Events

Prompt Engineering

Contributing

Deployment

Security

Developer Guide

UI Guide

Agent Guide

──────────────────────────────────────────────────────────────

# scripts/

Automation.

Examples

generate-types

generate-events

build-icons

seed-db

backup

restore

lint

format

release

──────────────────────────────────────────────────────────────

# .github/

Contains

CI

Release

PR Templates

Issue Templates

Dependabot

Security

──────────────────────────────────────────────────────────────

# Engineering Rules

Every folder has README.md explaining responsibility.

Every exported function documented.

Every module owns tests.

No module larger than its responsibility.

Feature first architecture.

Composition over inheritance.

Dependency Injection for services.

Strict TypeScript.

ESLint.

Prettier.

Husky.

lint-staged.

Commitlint.

Semantic versioning.

──────────────────────────────────────────────────────────────

# Dependency Rules

UI cannot import Runtime.

UI cannot import Database.

Runtime cannot import React.

Tools cannot import UI.

Planner cannot access Database directly.

Memory accessed only through Memory Service.

Search accessed only through Search Service.

Everything communicates through interfaces.

──────────────────────────────────────────────────────────────

# Naming Conventions

Folders: kebab-case

React Components: PascalCase

Hooks: useSomething

Types: SomethingType

Interfaces: ISomething

Enums: SomethingEnum

Events: SCREAMING_SNAKE_CASE

Files: feature-name.ts

Constants: SCREAMING_SNAKE_CASE

──────────────────────────────────────────────────────────────

# Future Scalability

The architecture must support

10,000+ users

Millions of conversations

Multiple runtime workers

Distributed event bus

Remote agents

Cloud execution

Enterprise authentication

Plugin system

Marketplace

CLI

Desktop

Browser

VS Code

JetBrains

Without major restructuring.

──────────────────────────────────────────────────────────────

# Final Objective

The repository should resemble the architecture of a production-grade engineering platform rather than a simple MERN application.

Every layer must have clear ownership, strict boundaries, modular design, dependency inversion, and long-term maintainability.

This folder structure becomes the foundation for every future implementation phase of Vedix.
