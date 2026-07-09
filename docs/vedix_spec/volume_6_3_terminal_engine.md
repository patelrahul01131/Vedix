# Vedix Engineering Specification
# Part 6.3 — Terminal Engine

Version: 1.0

──────────────────────────────────────────────────────────────

# Goal

Provide a secure, persistent, observable, cross-platform terminal
execution engine capable of running commands, streaming output,
handling interactive processes, supporting long-running sessions,
and integrating with the Runtime through an event-driven API.

The Runtime never executes shell commands directly.

Every command passes through the Terminal Engine.

──────────────────────────────────────────────

# Philosophy

Planner

↓

Runtime

↓

Terminal Engine

↓

PTY Session

↓

Operating System

↓

Streaming Output

↓

Runtime

The Runtime controls execution.
The Terminal Engine manages processes.

──────────────────────────────────────────────

# Responsibilities

Create PTY sessions

Execute commands

Persistent shells

Interactive prompts

Streaming stdout

Streaming stderr

Environment management

Working directory management

Signal handling

Cancellation

Timeouts

Background jobs

Checkpointing

Session restoration

Telemetry

Audit logging

──────────────────────────────────────────────

# High Level Architecture

                  Runtime

                     │

                     ▼

              Terminal Engine

                     │

────────────────────────────────────

Session Manager

PTY Manager

Command Executor

Environment Manager

Approval Layer

Stream Processor

Signal Handler

Timeout Manager

Checkpoint Manager

Telemetry

────────────────────────────────────

                     │

                     ▼

node-pty

↓

PowerShell

CMD

Bash

Zsh

Fish

WSL

──────────────────────────────────────────────

# Terminal Session

A session contains

Session ID

Workspace

Current Directory

Environment Variables

Shell Type

History

Running Processes

Open Streams

Checkpoint State

Session Metadata

Sessions persist until disposed.

──────────────────────────────────────────────

# Supported Shells

Windows

PowerShell

CMD

Git Bash

WSL

Linux

Bash

Zsh

Fish

macOS

Bash

Zsh

Fish

Shell auto-detection supported.

──────────────────────────────────────────────

# Command Lifecycle

Queued

↓

Validated

↓

Permission Check

↓

PTY Execution

↓

Streaming

↓

Verification

↓

Completed

OR

Cancelled

OR

Failed

──────────────────────────────────────────────

# Command Pipeline

Planner

↓

Runtime

↓

Approval

↓

PTY

↓

Output Stream

↓

Parser

↓

Events

↓

UI

──────────────────────────────────────────────

# Working Directory

Each session maintains

Workspace Root

↓

Current Directory

↓

Relative Resolution

↓

Path Validation

Supports

cd

pushd

popd

Workspace isolation enforced.

──────────────────────────────────────────────

# Environment Variables

Global Environment

↓

Workspace Environment

↓

Session Environment

↓

Temporary Variables

↓

Command Overrides

Variables are immutable during execution.

──────────────────────────────────────────────

# Streaming

Stream

stdout

stderr

ANSI

Progress

Structured Events

Partial Lines

Streaming never blocks execution.

──────────────────────────────────────────────

# ANSI Processing

Support

Colors

Cursor Movement

Progress Bars

Unicode

Hyperlinks

Clear Screen

Formatting

Convert to structured events.

──────────────────────────────────────────────

# Interactive Commands

Support

Password prompts

Confirmation prompts

Selection prompts

Text input

Custom interactive handlers

Planner pauses when user input required.

──────────────────────────────────────────────

# Long Running Processes

Development servers

Watch mode

Tail logs

Docker compose

Database servers

Background workers

Sessions remain attached.

──────────────────────────────────────────────

# Background Jobs

Detached execution

↓

Heartbeat

↓

Output streaming

↓

Notifications

↓

Reconnect support

──────────────────────────────────────────────

# Process Management

Track

PID

Child Processes

CPU

Memory

Exit Code

Signals

Runtime Duration

──────────────────────────────────────────────

# Signals

SIGINT

SIGTERM

SIGKILL

Custom Signals

Graceful shutdown preferred.

──────────────────────────────────────────────

# Timeouts

Command timeout

Idle timeout

Session timeout

Maximum runtime

Configurable per command.

──────────────────────────────────────────────

# Command Classification

Read-only

Safe

Destructive

Interactive

Network

Package Management

Deployment

Database

System

Classification determines approval.

──────────────────────────────────────────────

# Permission Rules

pwd

Auto

ls

Auto

cat

Auto

npm install

Approval

pnpm install

Approval

yarn install

Approval

rm

Approval

mv

Approval

git push

Approval

docker

Approval

kubectl

Approval

Database migration

Approval

sudo

Always approval

──────────────────────────────────────────────

# Dangerous Commands

Detect

rm -rf

sudo

shutdown

reboot

mkfs

chmod -R

dd

curl | bash

wget | bash

PowerShell Invoke-Expression

Planner requires explicit approval.

──────────────────────────────────────────────

# Command Queue

Commands execute

Sequentially by default.

Supports

Parallel execution

Dependencies

Priority

Cancellation

Approval queue

──────────────────────────────────────────────

# Session Restoration

Checkpoint

↓

Save

Current Directory

Environment

History

Running Jobs

↓

Restore

Reconnect

Resume Streaming

──────────────────────────────────────────────

# Checkpoints

Store

Session

Processes

Environment

Working Directory

History

Pending Commands

Pending Approval

Stream Position

──────────────────────────────────────────────

# Failure Recovery

PTY Crash

↓

Restart PTY

↓

Restore Session

↓

Replay Context

↓

Continue

──────────────────────────────────────────────

# Output Parsing

Detect

Compiler errors

Warnings

Stack traces

URLs

File paths

Progress

Test summaries

JSON

Markdown

Convert to structured events.

──────────────────────────────────────────────

# Resource Monitoring

CPU

Memory

Disk

Network

Execution Time

Peak Memory

Exit Status

Published continuously.

──────────────────────────────────────────────

# Events

terminal.created

terminal.connected

terminal.command.queued

terminal.command.started

terminal.stdout

terminal.stderr

terminal.progress

terminal.warning

terminal.prompt

terminal.completed

terminal.failed

terminal.cancelled

terminal.timeout

terminal.restored

──────────────────────────────────────────────

# Telemetry

Track

Command count

Average runtime

Success rate

Failure rate

Cancellation rate

Approval frequency

Timeout frequency

Resource usage

──────────────────────────────────────────────

# Security

Workspace isolation

Environment sanitization

Permission enforcement

Command validation

Audit logging

Secret masking

No direct Runtime shell execution

──────────────────────────────────────────────

# Performance

Persistent PTY

Connection reuse

Streaming parser

Lazy session creation

Background cleanup

Incremental output processing

Parallel read streams

──────────────────────────────────────────────

# Future Enhancements

Remote SSH terminals

Docker container terminals

Kubernetes exec

Cloud worker terminals

WebAssembly sandbox

Distributed terminal workers

Terminal recording

AI-assisted command optimization

──────────────────────────────────────────────

# Rules

Never execute commands without validation.

Never bypass approval for destructive operations.

Never expose secrets in output.

Never block streaming.

Always support cancellation.

Always support checkpoints.

Always emit structured events.

Always restore sessions after crashes.

──────────────────────────────────────────────

# Final Objective

The Terminal Engine provides Vedix with a secure, persistent, and
fully observable execution environment capable of running local and
remote development workflows.

By combining PTY session management, structured streaming,
permission enforcement, checkpointing, recovery, and telemetry,
Vedix can execute commands safely while maintaining complete
visibility into every process and ensuring reliable recovery from
interruptions.
