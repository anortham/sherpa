# Sherpa MCP Server - Development Guide

## Project Overview

Sherpa is a Model Context Protocol (MCP) server that provides workflow guidance for AI-assisted development. It reads workflows from `~/.sherpa/workflows/` and provides two tools (`next` and `workflow`) to guide development through structured phases.

## Project Structure

```
sherpa/
├── sherpa-server.ts     # Main MCP server implementation
├── setup.ts             # Setup script for initializing ~/.sherpa
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── workflows/           # Default workflow templates
│   ├── tdd.yaml        # Test-driven development workflow
│   ├── bug-hunt.yaml   # Debugging workflow
│   ├── general.yaml    # General purpose workflow
│   ├── rapid.yaml      # Rapid prototyping workflow
│   ├── refactor.yaml   # Safe refactoring workflow
│   └── examples/       # Additional example workflows
│       ├── documentation.yaml
│       ├── security-audit.yaml
│       ├── performance.yaml
│       ├── code-review.yaml
│       └── README.md
└── README.md           # User documentation
```

## User Directory Structure

When installed, Sherpa creates:
```
~/.sherpa/
├── workflows/          # User's customizable workflow copies
│   ├── tdd.yaml
│   ├── bug-hunt.yaml
│   ├── general.yaml
│   ├── rapid.yaml
│   └── refactor.yaml
└── logs/               # Server logs with automatic rotation
    └── sherpa-YYYY-MM-DD.log
```

## Key Concepts

1. **Global Installation**: Workflows are copied to `~/.sherpa/` so they're available to all projects
2. **Template System**: Default workflows stay in source, user gets customizable copies
3. **Logging**: Comprehensive logging to `~/.sherpa/logs/` for debugging
4. **Setup Script**: Automated initialization and maintenance commands

## Development Commands

```bash
# Start the server (for testing)
bun run start

# Development mode with file watching
bun run dev

# Setup user directory (copies workflows)
bun run setup

# Check status of user installation
bun run status

# Reset user workflows to defaults
bun run reset

# View server logs
bun run logs
```

## MCP Server Configuration

The server should be configured in Claude Desktop as:
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

## Testing the Server

1. Run setup to initialize: `bun run setup`
2. Start server: `bun run start`
3. Check that workflows load without errors
4. Verify logs appear in `~/.sherpa/logs/`

## Code Architecture

### SherpaServer Class
- **loadWorkflows()**: Reads YAML files from `~/.sherpa/workflows/`
- **handleNext()**: Provides next step in current workflow phase
- **handleWorkflow()**: Switches between workflows
- **log()**: Writes to daily log files with rotation

### Setup Script
- **setup()**: Creates directories and copies workflow templates
- **reset()**: Removes and reinstalls all workflows
- **status()**: Shows current installation state

## Common Issues

1. **Path Resolution**: Always use absolute paths in Claude Desktop config
2. **Directory Permissions**: Ensure `~/.sherpa` is writable
3. **YAML Parsing**: Workflow files must be valid YAML
4. **Log Rotation**: Keeps 7 days of logs automatically

## Workflow File Format

```yaml
name: "Workflow Name"
description: "Brief description"
trigger_hints:
  - "keyword1"
  - "keyword2"
phases:
  - name: "📋 Phase Name"
    guidance: "What to focus on"
    suggestions:
      - "Specific action"
      - "Another action"
```

## Testing Changes

When modifying the server:
1. Test with `bun run start` to check for TypeScript errors
2. Run `bun run setup` to test setup script
3. Check logs with `bun run logs:latest`
4. Verify workflows load correctly
5. Test both tools (`next` and `workflow`) work

## Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `yaml`: YAML parsing for workflow files
- `bun`: Runtime and package manager

## Building New Features

When adding new functionality:
1. Update the server code in `sherpa-server.ts`
2. Add any new commands to `setup.ts` if needed
3. Update `package.json` scripts as needed
4. Test thoroughly with the setup/reset cycle
5. Update documentation in `README.md`