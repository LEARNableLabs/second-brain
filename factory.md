# Factory Configuration — second-brain

## Goal

Evolve Second Brain — an automated knowledge capture system that passively logs browsing history and uses AI to curate daily highlights in an Obsidian vault — into a reliable, well-tested, observable system that captures browsing data and produces high-quality AI-curated daily digests.

## Project Type

cli_tool

## Language

TypeScript

## Target Branch

main

## Scope

### Modifiable

- pipeline/src/**
- pipeline/tests/**
- extension/components/**
- extension/entrypoints/**
- extension/tests/**
- shared/src/**
- shared/tests/**
- eval/score.py

### Read Only

- .obsidian/
- CLAUDE.md
- factory.md
- .factory/config.json
- package.json
- LICENSE

## Guards

- Do not modify `.obsidian/` — Obsidian app configuration
- Do not delete or overwrite existing tests
- Do not introduce secrets or credentials in code
- Do not modify files outside declared mutable paths
- Do not merge PRs — leave open for human review
- Do not lower eval thresholds

## Eval

### Command

```bash
python3 eval/score.py
```

### Threshold

0.5

### Dimensions

| Dimension | Weight | Description |
|-----------|--------|-------------|
| tests | 0.83 | Run test suite: npm test |
| observability | 0.17 | Analyze logging coverage, structured logging, and request tracing |

## Eval Spec

```json
[
  "Run the CLI with --help and verify it prints usage information",
  "Run the CLI with a sample input and verify it produces expected output"
]
```

## Smoke Test

```bash
npm test
```
