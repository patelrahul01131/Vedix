# Vedix Engineering Specification
# Part 4.3.5 — Authentication, Authorization, RBAC & Security Architecture

Version: 1.0

──────────────────────────────────────────────────────────────

# Goal

Build a secure backend capable of supporting

• Millions of users
• Multiple organizations
• Multiple workspaces
• Enterprise deployment
• SaaS deployment
• Self Hosted deployment

The system must be secure by default.

Everything is denied unless explicitly allowed.

────────────────────────────────────────

# Security Philosophy

Authentication

↓

Who are you?

Authorization

↓

What can you access?

Permission

↓

What actions can you perform?

Approval

↓

Should this action execute now?

All four are separate systems.

────────────────────────────────────────

# Security Layers

Internet

↓

Reverse Proxy

↓

HTTPS

↓

Fastify

↓

Authentication

↓

Authorization

↓

Workspace Validation

↓

Permission Validation

↓

Rate Limiter

↓

Runtime Validation

↓

Tool Validation

↓

Execution

────────────────────────────────────────

# Authentication

Supports

Email Password

GitHub OAuth

Google OAuth

Microsoft OAuth

GitLab OAuth

SSO

OIDC

SAML

API Keys

CLI Login

Device Login

Magic Link

Future

Passkeys

Biometric Login

Enterprise Identity Providers

────────────────────────────────────────

# Authentication Flow

User

↓

Login

↓

Verify Credentials

↓

Generate Access Token

↓

Generate Refresh Token

↓

Create Session

↓

Return Tokens

↓

Authenticated

────────────────────────────────────────

# JWT

Contains

userId

workspaceId

role

permissions

deviceId

sessionId

issuedAt

expiresAt

version

Never store sensitive data.

────────────────────────────────────────

# Refresh Tokens

Stored in database.

Rotated every refresh.

Old token immediately revoked.

Supports

Logout

Device revoke

Admin revoke

Session revoke

────────────────────────────────────────

# Sessions

One user

↓

Multiple Devices

Desktop

Laptop

VS Code

Browser

CLI

Mobile

Every session isolated.

────────────────────────────────────────

# Session States

ACTIVE

IDLE

SUSPENDED

EXPIRED

LOGGED_OUT

REVOKED

────────────────────────────────────────

# Workspace Isolation

Every request validates

tenantId

↓

workspaceId

↓

repositoryId

↓

conversationId

↓

runtimeId

Never allow cross-workspace access.

────────────────────────────────────────

# Organizations

Organization

↓

Teams

↓

Workspaces

↓

Repositories

↓

Conversations

↓

Runtime

Supports

Enterprise

Teams

Billing

Shared repositories

Multiple admins

────────────────────────────────────────

# Roles

Owner

Admin

Maintainer

Developer

Reviewer

Viewer

Guest

Future

Custom Roles

────────────────────────────────────────

# Permission Categories

Workspace

Conversation

Repository

Runtime

Memory

Search

Models

Settings

Billing

Administration

Tools

Plugins

Deployments

────────────────────────────────────────

# Example Permissions

workspace.read

workspace.write

workspace.delete

conversation.create

conversation.delete

runtime.start

runtime.stop

runtime.resume

runtime.cancel

tool.execute

tool.install

terminal.execute

terminal.cancel

git.commit

git.push

repository.read

repository.write

approval.review

memory.write

settings.update

admin.manage

────────────────────────────────────────

# RBAC Flow

Request

↓

Authentication

↓

Workspace Validation

↓

Role Lookup

↓

Permission Lookup

↓

Resource Ownership

↓

Allow

or

Deny

────────────────────────────────────────

# Attribute Based Access (ABAC)

Evaluate

Resource Owner

Workspace

Repository

Runtime State

User Role

Environment

Risk

Time

Policy

Allows enterprise security.

────────────────────────────────────────

# Runtime Security

Runtime validates

Workspace

Conversation

Files

Permissions

Tools

Commands

Every tool request validated.

────────────────────────────────────────

# Tool Security

Filesystem

Allowed paths only

Terminal

Command allowlist

Git

Repository validation

Browser

Trusted domains

Database

Read-only by default

HTTP

Allowlist

MCP

Permission based

────────────────────────────────────────

# Approval Security

High-risk operations

Require approval.

Examples

Delete file

Rename folder

Overwrite project

Run terminal

Install packages

Git commit

Git push

Deploy

Database write

External API

System commands

────────────────────────────────────────

# Approval Workflow

Planner

↓

Approval Request

↓

Runtime Pause

↓

Frontend Card

↓

Approve

↓

Resume Runtime

No approval

↓

Execution denied

────────────────────────────────────────

# API Security

HTTPS only

HSTS

CORS

Helmet

CSRF Protection

Secure Cookies

Content Security Policy

Origin Validation

────────────────────────────────────────

# WebSocket Security

JWT Validation

Workspace Validation

Heartbeat

Reconnect Token

Message Validation

Payload Limits

Subscription Validation

Connection Rate Limit

────────────────────────────────────────

# Rate Limiting

Per User

Per IP

Per Workspace

Per API Key

Per Runtime

Per Tool

Separate limits

Authentication

Search

Streaming

Uploads

Downloads

────────────────────────────────────────

# Upload Security

Validate

Extension

MIME Type

Size

Virus Scan

Workspace

Permissions

Store outside public directory.

────────────────────────────────────────

# Secret Management

Never store

API Keys

Passwords

OAuth Secrets

Encryption Keys

Inside code.

Use

Vault

AWS Secrets Manager

Azure Key Vault

GCP Secret Manager

Environment Variables

────────────────────────────────────────

# Encryption

TLS

HTTPS

JWT Signing

AES-256

Database Encryption

Encrypted Storage

Encrypted Secrets

────────────────────────────────────────

# Audit Logging

Track

Login

Logout

Permission Change

Workspace Access

Repository Access

Runtime Start

Runtime Stop

Tool Execution

Approval

Git Push

Deployment

Admin Actions

Audit logs immutable.

────────────────────────────────────────

# Security Headers

HSTS

CSP

X-Frame-Options

X-Content-Type

Referrer Policy

Permissions Policy

────────────────────────────────────────

# Runtime Sandboxing

Every runtime executes

Inside isolated execution environment.

Limits

CPU

Memory

Network

Filesystem

Execution Time

────────────────────────────────────────

# Enterprise Features

SSO

SCIM

Audit Export

IP Allowlist

Device Policies

MFA

Session Policies

Approval Policies

Custom Roles

────────────────────────────────────────

# Threat Protection

SQL Injection

Command Injection

Path Traversal

XSS

CSRF

Replay Attack

MITM

Privilege Escalation

DoS

Prompt Injection

Tool Injection

Model Jailbreak

────────────────────────────────────────

# AI Security

Validate prompts.

Sanitize tool arguments.

Limit filesystem access.

Validate MCP responses.

Never trust model output.

Require approval before execution.

Never execute arbitrary shell commands automatically.

────────────────────────────────────────

# Security Monitoring

Failed Login

Permission Denied

Rate Limit

Abnormal Runtime

Tool Failure

Suspicious Commands

Unexpected Network

Repeated Approval Rejection

Administrator Notifications

────────────────────────────────────────

# Security Rules

Everything authenticated.

Everything authorized.

Everything validated.

Everything logged.

Everything encrypted.

Everything rate limited.

Everything audited.

Everything isolated.

Default deny.

Least privilege.

────────────────────────────────────────

# Final Objective

Vedix must implement defense-in-depth security across every layer of the platform.

Authentication verifies identity.

Authorization verifies access.

RBAC and ABAC determine permissions.

Approval Manager governs high-risk operations.

Every request, runtime, tool execution, WebSocket message, and background worker is validated, audited, encrypted, and isolated.

The platform should be capable of serving enterprise customers while maintaining strict tenant isolation, comprehensive audit trails, and secure AI-assisted code execution.
