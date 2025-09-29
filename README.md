# 🏔️ Sherpa - AI Development Workflow Guide

[![CI](https://github.com/anthropics/sherpa-mcp/workflows/CI/badge.svg)](https://github.com/anthropics/sherpa-mcp/actions)
[![NPM Version](https://img.shields.io/npm/v/sherpa-mcp.svg)](https://www.npmjs.com/package/sherpa-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-220%20passing-green.svg)](#testing)

**MCP server that guides AI agents through systematic development workflows using behavioral adoption and positive reinforcement**

Sherpa is a Model Context Protocol (MCP) server that transforms AI-assisted development by guiding agents through proven workflows with behavioral adoption techniques. Using positive reinforcement, progress tracking, and contextual celebrations, Sherpa helps AI agents develop systematic coding practices that lead to higher quality outcomes.

## Why Sherpa?

When working with AI coding assistants, it's easy for them to:
- Skip writing tests and rush to implementation
- Guess at solutions without systematic investigation
- Fix bugs without understanding root causes
- Create code without following proven patterns

**Sherpa changes this through behavioral adoption:**
- 🎯 **Positive Reinforcement**: Celebrates progress with encouraging feedback
- 📈 **Progress Tracking**: Monitors workflow completion and streak building
- 🏆 **Achievement System**: Recognizes milestones and systematic development
- 💡 **Success Stories**: Shares real-world examples from companies like Netflix, GitHub, and Shopify
- 🎉 **Dynamic Celebrations**: Contextual encouragement based on current progress

Studies show systematic workflows reduce bugs by 60%+ and increase developer confidence dramatically.

## Quick Start

### 1. Install Dependencies

**Requirements:** This project requires [Bun](https://bun.sh) for optimal performance.

```bash
# Install Bun if you haven't already:
curl -fsSL https://bun.sh/install | bash

# Install dependencies:
bun install
```

### 2. Initialize Sherpa

Run the setup script to create your global Sherpa configuration:

```bash
bun run setup
```

This creates `~/.sherpa/` with default workflows and logging directory. The workflows are copied to your home directory so you can customize them freely.

### 3. Configure Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "sherpa": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/sherpa-server.ts"]
    }
  }
}
```

**Important:** Use the absolute path to `sherpa-server.ts` in this repository.

### 4. Start Coding!

In Claude, the AI will now have access to two powerful tools:
- `guide` - Expert guidance for your next step in the workflow
- `approach` - Choose and switch between development approaches

Your workflows are now available across all your projects! 🎉

## 🎯 Behavioral Adoption Features

Sherpa uses proven behavioral psychology to help AI agents develop systematic habits:

### Progress Tracking & Celebrations
- **Step Completion**: Celebrates each workflow step with contextual encouragement
- **Phase Advancement**: Special recognition when completing workflow phases
- **Milestone Achievements**: Unlocks achievements like "First Workflow Mastery" and "Workflow Veteran"
- **Streak Building**: Tracks consecutive days of systematic development

### Dynamic Encouragement System
- **Context-Aware Messages**: Different celebrations for first steps vs. major milestones
- **Workflow-Specific Praise**: TDD gets test-focused encouragement, Bug Hunt gets detective metaphors
- **Success Inspiration**: Occasionally shares relevant company success stories
- **Tool Usage Reinforcement**: Positive feedback for using systematic approaches

### Example Behavioral Flow
```json
// After completing a test
{
  "celebration": "🧪 Excellent! First test written - you're building bulletproof code!",
  "tool_encouragement": "🎯 Excellent workflow awareness! Checking progress keeps you oriented.",
  "progress_encouragement": "📈 Great progress! 1 workflows completed, 5 steps taken.",
  "success_inspiration": "TDD practitioners at major companies ship 67% fewer bugs!"
}
```

### Personalized Tips
Based on usage patterns, Sherpa provides personalized suggestions:
- Try different workflow types for varied experience
- Build consistency for better habit formation
- Complete more steps per workflow for maximum benefit

## Available Workflows

### 🧪 TDD (tdd.yaml)
Pure test-first development. Perfect for:
- Building parsers, extractors, transformers
- Creating well-defined utilities
- Any feature where you know the expected behavior

### 🐛 Bug Hunt (bug-hunt.yaml)
Systematic debugging with tests. Ideal for:
- Fixing reported bugs
- Investigating crashes
- Resolving test failures

### 📝 General (general.yaml)
Balanced approach with research → plan → test → implement. Good for:
- Most feature development
- Adding new functionality
- Default workflow

### 🚀 Rapid (rapid.yaml)
Quick prototyping with retroactive tests. Use for:
- Spikes and experiments
- Proof of concepts
- Demo preparation

### 📋 Planning (planning.yaml)
Pure planning workflow - research, understand, design, and document before implementation. Ideal for:
- Architecture design
- Feature specification
- Requirements analysis
- Research and documentation

### ♻️ Refactor (refactor.yaml)
Safe refactoring with test coverage. Perfect for:
- Code cleanup
- Performance improvements
- Restructuring

## Managing Workflows

### Available Commands

```bash
# Check Sherpa status and installed workflows
bun run status

# Reinstall default workflows (preserves existing customizations)
bun run setup

# Force reinstall (overwrites customizations)
bun run setup:force

# Reset to default workflows (removes all customizations)
bun run reset

# View real-time logs
bun run logs

# View latest log file
bun run logs:latest
```

### Customizing Workflows

Edit any file in `~/.sherpa/workflows/` to match your preferences:

```yaml
name: "Your Workflow Name"
description: "What this workflow is for"
trigger_hints:  # Keywords that auto-select this workflow
  - "keyword1"
  - "keyword2"
phases:
  - name: "📋 Phase Name"
    guidance: "What to focus on"
    suggestions:
      - "Specific action 1"
      - "Specific action 2"
```

### Creating New Workflows

1. Create a new file: `~/.sherpa/workflows/my-workflow.yaml`
2. Follow the structure above
3. Restart Claude to load the new workflow

### Example Workflows

Check out `workflows/examples/` for additional specialized workflows:
- 📚 **Documentation** - For writing guides and API docs
- 🔒 **Security Audit** - For defensive security reviews
- 📈 **Performance** - For optimization projects
- 👁️ **Code Review** - For thorough code reviews

Copy any example to your workflows directory:
```bash
cp ~/.sherpa/workflows/examples/documentation.yaml ~/.sherpa/workflows/
```

## Usage Example

When Claude starts working on a task, Sherpa provides rich, encouraging guidance:

```
Claude: I need to fix the login bug.

[Calls: next check]

Sherpa: {
  "workflow": "Bug Hunt",
  "phase": "🔍 Reproduce & Isolate",
  "guidance": "Understand the bug completely before fixing",
  "suggestions": ["Reproduce manually first", "Document exact steps", ...],
  "tool_encouragement": "🎯 Excellent workflow awareness! Checking progress keeps you oriented.",
  "progress_encouragement": "🔥 Amazing 3-day streak! You're building excellent workflow habits."
}

Claude: I'll systematically reproduce this issue first...

[After reproducing]
[Calls: next done: "Reproduced - happens with special characters in email"]

Sherpa: {
  "celebration": "🔍 Detective mode activated! Great systematic reproduction work.",
  "workflow": "Bug Hunt",
  "phase": "🎯 Capture in Test",
  "guidance": "Lock down the bug with a failing test",
  "suggestions": ["Write failing test with special chars", ...],
  "progress": {"completed": 1, "total": 3, "remaining": 2},
  "success_inspiration": "Netflix reduced critical incidents by 73% through systematic bug reproduction!"
}
```

**Benefits in Action:**
- 🎯 Claude naturally adopts systematic approaches
- 📈 Progress tracking builds momentum and confidence
- 🎉 Celebrations reinforce good development habits
- 💡 Success stories provide additional motivation

## Tips for Success

1. **Start Simple**: Use the provided workflows as-is initially
2. **Customize Gradually**: Adjust workflows based on what works for your project
3. **Be Specific**: Add clear, actionable suggestions to guide the AI
4. **Reinforce Good Habits**: The AI will learn to use `guide` regularly

## Philosophy

Sherpa transforms AI development through behavioral science:

### Core Principles
- **Positive Reinforcement**: Celebrates systematic approaches rather than punishing shortcuts
- **Progressive Habit Building**: Gradually builds workflow discipline through consistent encouragement
- **Context-Aware Guidance**: Adapts feedback based on current progress and workflow type
- **Evidence-Based**: Incorporates real-world success stories from industry leaders

### Design Philosophy
- **Suggestive, not prescriptive**: Guides without constraining creativity
- **Lightweight**: Just 2 intuitive tools, minimal context usage, maximum behavioral impact
- **Customizable**: Your workflows, your celebrations, your development culture
- **Test-focused**: Because AI-generated code needs systematic validation
- **Joy-Driven**: Makes systematic development feel rewarding and satisfying

## Troubleshooting

### Workflows Not Loading
- Ensure `~/.sherpa/workflows/` exists and contains YAML files
- Run `bun run status` to check your installation
- Check the logs: `bun run logs:latest`
- If missing, run `bun run setup` to reinstall

### AI Not Following Workflow
- Remind Claude to use the `guide` tool regularly - Sherpa will celebrate this!
- The behavioral adoption system provides positive reinforcement automatically
- Consider adjusting workflow suggestions to be more specific and encouraging
- Check if celebrations and progress tracking are motivating consistent tool usage

### Debugging Issues
- View real-time logs: `bun run logs`
- Check server startup messages in Claude Desktop
- Verify the absolute path in your Claude Desktop config
- Logs are stored in `~/.sherpa/logs/` with automatic rotation (7 days)

### Common Problems

**"Sherpa not initialized" error:**
```bash
bun run setup
```

**"No workflows found" warning:**
```bash
bun run reset  # Reinstall default workflows
```

**Server won't start:**
- Check the absolute path in Claude Desktop config
- Ensure Bun is installed and in your PATH
- Check for TypeScript errors: `bun run sherpa-server.ts`

## Architecture

### Behavioral Adoption System

Sherpa's behavioral adoption system consists of:

- **Adaptive Learning Engine** (`src/behavioral-adoption/adaptive-learning-engine.ts`): Tracks user patterns and provides personalized guidance
- **Progress Tracker** (`src/behavioral-adoption/progress-tracker.ts`): Monitors workflow completion, tracks milestones, and maintains usage statistics
- **Celebration Generator** (`src/behavioral-adoption/celebration-generator.ts`): Creates contextual encouragement and success celebrations
- **Encouragements System** (`src/server-instructions/templates/encouragements.json`): 100+ contextual encouragement messages organized by workflow type and context

### Core Architecture

- **MCP Server** (`sherpa-server.ts`): Main Model Context Protocol server with integrated behavioral system
- **Workflow Engine**: YAML-based workflow definitions with phase-by-phase guidance
- **File-based Logging**: All behavioral events and progress logged to `~/.sherpa/logs/`

## Contributing

Ideas for improvements? Workflow patterns that work well? New behavioral adoption techniques? Please share!

### Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Check server startup (for testing)
bun run start

# Initialize user workflows
bun run setup

# View logs during development
bun run logs
```

---

*Remember: Like a good sherpa, this tool guides the journey but doesn't carry you. The AI still needs to do the work, but now it has a trusted, encouraging guide that celebrates every step forward.*
