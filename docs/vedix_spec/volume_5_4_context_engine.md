# Vedix Engineering Specification
# Part 5.4 — Context Engine & Intelligent Retrieval Pipeline

Version: 1.0

──────────────────────────────────────────────────────────────

# Goal

Create an intelligent context engine capable of retrieving exactly the
information required for the current task while minimizing token usage.

The Context Engine determines

What information is relevant

What should be loaded

What should be ignored

When context should be refreshed

When context should be compressed

The model never decides context.

The Context Engine does.

──────────────────────────────────────────────

# Philosophy

Large Repository

↓

Context Engine

↓

Relevant Context

↓

Planner

↓

Runtime

↓

Model

Instead of sending the whole repository,
only send the smallest useful context.

──────────────────────────────────────────────

# Responsibilities

Repository indexing

Semantic retrieval

Symbol retrieval

Dependency retrieval

Git awareness

Workspace awareness

Conversation awareness

Memory integration

Context compression

Context ranking

Context deduplication

Token budgeting

Context refreshing

──────────────────────────────────────────────

# High Level Architecture

                Repository

                     │

                     ▼

             Repository Indexer

                     │

──────────────────────────────────────

Symbol Index

Semantic Index

Dependency Graph

Git Index

Documentation Index

Workspace Rules

──────────────────────────────────────

                     │

                     ▼

             Context Engine

                     │

──────────────────────────────────────

Retriever

Ranker

Compressor

Budget Manager

Verifier

Cache

──────────────────────────────────────

                     │

                     ▼

                Runtime

──────────────────────────────────────────────

# Context Sources

Current Conversation

Workspace Memory

Conversation Memory

Repository Files

Code Symbols

Embeddings

Git History

Open Editors

Diagnostics

Terminal Output

Tests

Search Results

Documentation

README

Package Files

Configuration

Pinned Rules

User Preferences

──────────────────────────────────────────────

# Context Layers

Layer 1

User Prompt

Layer 2

Recent Conversation

Layer 3

Current Files

Layer 4

Repository Symbols

Layer 5

Semantic Search

Layer 6

Workspace Memory

Layer 7

Documentation

Layer 8

Repository Summary

Context loaded progressively.

──────────────────────────────────────────────

# Repository Indexing

Index

Files

Symbols

Classes

Functions

Interfaces

Types

Imports

Exports

References

Dependencies

Routes

Configurations

Tests

Documentation

Embeddings

──────────────────────────────────────────────

# Indexing Pipeline

Workspace Opened

↓

Detect Language

↓

Parse Files

↓

Extract Symbols

↓

Generate Embeddings

↓

Build Dependency Graph

↓

Store Index

↓

Ready

Incremental updates only.

──────────────────────────────────────────────

# Symbol Graph

File

↓

Class

↓

Method

↓

Reference

↓

Import

↓

Usage

Navigate relationships.

──────────────────────────────────────────────

# Semantic Search

Question

↓

Embedding

↓

Vector Search

↓

Rank

↓

Return Relevant Chunks

Never keyword search only.

──────────────────────────────────────────────

# Hybrid Retrieval

Keyword Search

+

Semantic Search

+

Symbol Search

+

Dependency Graph

+

Git Awareness

↓

Merged Results

Higher accuracy.

──────────────────────────────────────────────

# Context Ranking

Rank by

Current File

Planner Needs

User Goal

Recent Changes

Git Status

Dependency Distance

Reference Count

Semantic Similarity

Confidence

Repository Rules

──────────────────────────────────────────────

# Token Budget Manager

Maximum Context

↓

Current Usage

↓

Remaining Budget

↓

Rank Results

↓

Trim

↓

Compress

↓

Send

Never exceed model limits.

──────────────────────────────────────────────

# Context Compression

Compress

Old Conversation

Large Files

Logs

Search Results

Diagnostics

Generated Plans

Keep important facts.

──────────────────────────────────────────────

# Context Cache

Cache

Embeddings

Repository Summary

Search Results

Documentation

Open Files

Dependency Graph

Reuse whenever possible.

──────────────────────────────────────────────

# Context Refresh

Refresh when

Files Edited

Git Changed

Branch Changed

Workspace Changed

Conversation Changed

Memory Updated

Tool Output

Verification Failed

──────────────────────────────────────────────

# Language Support

TypeScript

JavaScript

React

Next.js

Node.js

Python

Go

Java

Rust

C#

PHP

C++

Ruby

Swift

Kotlin

Dart

Language-specific retrieval.

──────────────────────────────────────────────

# Repository Awareness

Understand

Project Structure

Framework

Build System

Package Manager

Entry Points

Configuration

Coding Standards

Architecture

Naming Conventions

──────────────────────────────────────────────

# Context Validation

Before sending

Verify

Files Exist

Symbols Exist

Embeddings Fresh

Context Relevant

Budget Valid

Workspace Valid

──────────────────────────────────────────────

# Context Events

context.loading

context.updated

context.compressed

context.cached

context.refreshed

context.failed

──────────────────────────────────────────────

# Runtime Interaction

Planner

↓

Request Context

↓

Context Engine

↓

Retrieve

↓

Rank

↓

Compress

↓

Return Context

↓

Runtime

Context never bypasses planner.

──────────────────────────────────────────────

# Performance

Incremental indexing

Lazy embeddings

Parallel parsing

Cached retrieval

Background indexing

Streaming retrieval

Context reuse

Zero duplicate chunks

──────────────────────────────────────────────

# Failure Recovery

Missing file

↓

Skip

Corrupt index

↓

Reindex

Embedding failure

↓

Retry

Search timeout

↓

Fallback search

Repository change

↓

Refresh

──────────────────────────────────────────────

# Telemetry

Measure

Retrieval Time

Context Size

Token Usage

Search Accuracy

Embedding Latency

Cache Hit Rate

Compression Ratio

Planner Satisfaction

──────────────────────────────────────────────

# Rules

Never load entire repository.

Never exceed token budget.

Always rank results.

Always deduplicate context.

Always verify freshness.

Always cache reusable context.

Always prefer symbols over raw files.

Always combine semantic and structural retrieval.

──────────────────────────────────────────────

# Future Enhancements

GraphRAG

Knowledge Graph

Cross Repository Search

Enterprise Documentation Search

Remote Repository Indexing

Cloud Embeddings

Incremental Graph Updates

Repository Snapshots

Context Learning

Adaptive Retrieval

──────────────────────────────────────────────

# Final Objective

The Context Engine is responsible for providing the right information at
the right time.

Rather than overwhelming the language model with an entire repository,
it intelligently retrieves, ranks, validates, compresses, and delivers
only the context required for the current reasoning step.

This enables Vedix to operate efficiently on repositories ranging from
small projects to enterprise-scale monorepos while minimizing token
usage, improving reasoning quality, and maintaining high performance.
