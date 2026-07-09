# Vedix Engineering Specification
# Part 5.2 — Planning Engine & Task Decomposition

Version: 1.0

──────────────────────────────────────────────────────────────

# Goal

Create a deterministic planning engine capable of converting a high-level
user request into an executable task graph.

The planner owns strategy.

The runtime owns execution.

The planner never edits code.

The planner only decides WHAT should happen.

──────────────────────────────────────────────

# Philosophy

User

↓

Goal

↓

Mission

↓

Tasks

↓

Steps

↓

Tool Calls

↓

Execution

Every task becomes progressively more concrete.

──────────────────────────────────────────────

# Planner Responsibilities

Understand user intent.

Analyze repository.

Estimate complexity.

Estimate execution cost.

Determine required tools.

Determine required permissions.

Generate execution graph.

Estimate risks.

Generate checkpoints.

Generate rollback strategy.

Generate verification plan.

──────────────────────────────────────────────

# High Level Architecture

                User Goal

                    │

                    ▼

           Goal Interpreter

                    │

                    ▼

          Task Decomposer

                    │

                    ▼

        Dependency Analyzer

                    │

                    ▼

        Execution Planner

                    │

                    ▼

       Verification Planner

                    │

                    ▼

            Execution Graph

──────────────────────────────────────────────

# Planner Components

Goal Interpreter

Intent Classifier

Repository Analyzer

Complexity Estimator

Task Decomposer

Dependency Analyzer

Risk Analyzer

Approval Planner

Execution Planner

Verification Planner

Rollback Planner

Cost Estimator

──────────────────────────────────────────────

# Planner Lifecycle

Receive Goal

↓

Analyze Goal

↓

Retrieve Context

↓

Retrieve Memory

↓

Inspect Repository

↓

Estimate Complexity

↓

Generate Plan

↓

Validate Plan

↓

Publish Plan

↓

Runtime Executes

──────────────────────────────────────────────

# Goal Interpretation

Understand

Intent

Scope

Constraints

Target Files

Expected Output

Repository Rules

Coding Standards

User Preferences

Workspace Policies

──────────────────────────────────────────────

# Goal Types

Bug Fix

Feature

Refactor

Review

Documentation

Testing

Deployment

Investigation

Optimization

Migration

Security

Unknown

Planner adapts strategy based on goal type.

──────────────────────────────────────────────

# Complexity Levels

TRIVIAL

One file

One tool

No approval

SIMPLE

Few files

Basic reasoning

MEDIUM

Multiple files

Tool coordination

COMPLEX

Repository-wide

Planning

Verification

ENTERPRISE

Large repositories

Parallel execution

Multiple approvals

Long-running runtime

──────────────────────────────────────────────

# Planning Levels

Mission

↓

Epic

↓

Task

↓

Step

↓

Tool Call

Mission

"Implement Authentication"

Task

"Create Login API"

Step

"Create Controller"

Tool

Filesystem Write

──────────────────────────────────────────────

# Execution Graph

Task A

↓

Task B

↓

Task C

↓

Task D

Supports

Linear

Branching

Parallel

Conditional

Retry

Rollback

──────────────────────────────────────────────

# Dependency Analysis

Determine

File Dependencies

Symbol Dependencies

Module Dependencies

Package Dependencies

Runtime Dependencies

Build Dependencies

Test Dependencies

Git Dependencies

──────────────────────────────────────────────

# Risk Analysis

Read File

LOW

Search

LOW

Documentation

LOW

Edit File

MEDIUM

Rename

HIGH

Delete

CRITICAL

Deploy

CRITICAL

Planner assigns risk score.

──────────────────────────────────────────────

# Approval Planning

Planner identifies

Commands

Package Installation

Git Push

Delete

Rename

Deployment

Database Changes

Network Calls

Approval inserted into plan.

──────────────────────────────────────────────

# Execution Strategy

Sequential

Parallel

Conditional

Speculative

Retry

Fallback

Planner chooses optimal strategy.

──────────────────────────────────────────────

# Tool Selection

Planner requests

Tool Registry

↓

Capabilities

↓

Permission Check

↓

Cost

↓

Risk

↓

Availability

↓

Selection

Planner never directly executes tools.

──────────────────────────────────────────────

# Verification Planning

Before execution

Planner determines

Tests

Lint

Build

Formatting

Snapshots

Custom Validation

Security Scan

Type Check

──────────────────────────────────────────────

# Rollback Planning

Every destructive task generates rollback.

Examples

Backup File

Git Stash

Temporary Copy

Reverse Patch

Restore Checkpoint

──────────────────────────────────────────────

# Planning Constraints

Maximum Planning Depth

Maximum Runtime

Maximum Cost

Maximum Token Budget

Maximum Parallel Tasks

Maximum Tool Calls

Maximum Approval Count

Maximum File Changes

──────────────────────────────────────────────

# Dynamic Replanning

Trigger replanning when

Tool fails

Verification fails

Approval rejected

Context changes

Repository changes

Runtime timeout

Model switches

User interrupts

──────────────────────────────────────────────

# Plan Optimization

Merge duplicate steps.

Remove unnecessary searches.

Reuse previous context.

Reuse embeddings.

Minimize tool calls.

Reduce token usage.

Reduce approvals.

Optimize execution order.

──────────────────────────────────────────────

# Plan Validation

Validate

Dependencies

Permissions

Workspace

Files

Tool Availability

Execution Order

Circular Dependencies

Resource Limits

──────────────────────────────────────────────

# Planner Output

Execution Plan

Goal

Tasks

Steps

Dependencies

Approvals

Verification

Rollback

Estimated Time

Estimated Tokens

Estimated Cost

Risk Score

──────────────────────────────────────────────

# Planner Events

planner.started

planner.updated

planner.completed

planner.failed

planner.replanned

step.created

step.started

step.completed

step.failed

──────────────────────────────────────────────

# Runtime Interaction

Planner

↓

Publishes Plan

↓

Runtime Executes

↓

Observes Events

↓

Planner Replans if Necessary

Planner never directly edits code.

──────────────────────────────────────────────

# Telemetry

Track

Planning Time

Replans

Average Plan Size

Task Count

Execution Accuracy

Verification Success

Rollback Count

Approval Count

Cost Estimate Accuracy

──────────────────────────────────────────────

# Future Enhancements

Hierarchical Planning

Multi-Agent Planning

Adaptive Planning

Learning Planner

Repository Templates

Domain-Specific Planning

Self-Optimizing Planner

Cloud Distributed Planning

──────────────────────────────────────────────

# Planner Rules

Planner never executes tools.

Planner never modifies files.

Planner always produces verification.

Planner always produces rollback.

Planner always estimates cost.

Planner always estimates risk.

Planner always generates checkpoints.

Planner always validates dependencies.

──────────────────────────────────────────────

# Final Objective

The Planning Engine transforms natural language goals into deterministic,
validated, executable task graphs.

It separates strategic decision-making from execution, allowing the
runtime to perform work safely, recover from failures, request
approvals, and dynamically adapt as new information becomes available.

This separation of concerns enables Vedix to solve complex software
engineering tasks with predictability, observability, and resilience.
