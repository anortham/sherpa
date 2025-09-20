# 🏔️ Sherpa - AI Development Workflow Guide

Sherpa is a lightweight MCP (Model Context Protocol) server that guides AI agents through proven development workflows, with a strong emphasis on test-driven development. Like a mountain guide, Sherpa keeps you on the right path.

## Why Sherpa?

When working with AI coding assistants, it's easy for them to:
- Skip writing tests
- Guess at implementations without checking docs
- Fix bugs without understanding them
- Create code without following team patterns

Sherpa gently but persistently guides the AI to follow YOUR preferred workflow.

## Quick Start

### 1. Install Dependencies

```bash
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

In Claude, the AI will now have access to two tools:
- `next` - Gets the next step in the workflow
- `workflow` - Switches between workflows or lists available ones

Your workflows are now available across all your projects! 🎉

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

When Claude starts working on a task, it will:

```
Claude: I need to fix the login bug.

[Calls: next check]

Sherpa: {
  "workflow": "Bug Hunt",
  "phase": "🔍 Reproduce & Isolate",
  "guidance": "Understand the bug completely",
  "suggestions": ["Reproduce manually first", ...]
}

Claude: I'll start by reproducing the issue...

[After reproducing]
[Calls: next done: "Reproduced - happens with special characters in email"]

Sherpa: {
  "workflow": "Bug Hunt",
  "phase": "🎯 Capture in Test",
  "encouragement": "Great progress! 🎯",
  "guidance": "Lock down the bug with a failing test",
  ...
}
```

## Tips for Success

1. **Start Simple**: Use the provided workflows as-is initially
2. **Customize Gradually**: Adjust workflows based on what works for your project
3. **Be Specific**: Add clear, actionable suggestions to guide the AI
4. **Reinforce Good Habits**: The AI will learn to call `next` regularly

## Philosophy

Sherpa is:
- **Suggestive, not prescriptive**: Guides without constraining
- **Lightweight**: Just 2 tools, minimal context usage
- **Customizable**: Your workflows, your way
- **Test-focused**: Because AI-generated code needs good tests

## Troubleshooting

### Workflows Not Loading
- Ensure `~/.sherpa/workflows/` exists and contains YAML files
- Run `bun run status` to check your installation
- Check the logs: `bun run logs:latest`
- If missing, run `bun run setup` to reinstall

### AI Not Following Workflow
- Remind Claude to use the `next` tool regularly
- The server instructions provide positive reinforcement
- Consider adjusting workflow suggestions to be more specific

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

## Contributing

Ideas for improvements? Workflow patterns that work well? Please share!

---

*Remember: Like a good sherpa, this tool guides the journey but doesn't carry you. The AI still needs to do the work, but now it has a trusted guide.*
