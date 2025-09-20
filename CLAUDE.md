# Sherpa MCP Server - Development Guide

## Project Overview

Sherpa is a Model Context Protocol (MCP) server that transforms AI-assisted development through behavioral adoption techniques. It provides workflow guidance with positive reinforcement, progress tracking, and contextual celebrations to help AI agents develop systematic coding practices.

**Core Features:**
- 🎯 **Behavioral Adoption System**: Uses positive psychology to encourage systematic development
- 📈 **Progress Tracking**: Monitors workflow completion, milestones, and usage patterns
- 🎉 **Dynamic Celebrations**: Context-aware encouragement and success celebrations
- 🏆 **Achievement System**: Gamification through milestones and streak tracking
- 📋 **Workflow Guidance**: Structured phases for TDD, Bug Hunt, General, Rapid, and Refactor workflows

## Project Structure

```
sherpa/
├── sherpa-server.ts                    # Main MCP server with behavioral adoption
├── setup.ts                            # Setup script for initializing ~/.sherpa
├── package.json                        # Dependencies and scripts
├── tsconfig.json                       # TypeScript configuration
├── src/                                # Core behavioral adoption system
│   ├── types.ts                       # TypeScript interfaces
│   ├── behavioral-adoption/           # Behavioral psychology components
│   │   ├── progress-tracker.ts       # Progress monitoring and milestones
│   │   └── celebration-generator.ts  # Dynamic encouragement system
│   └── server-instructions/           # Template and instruction system
│       ├── instruction-builder.ts    # Dynamic instruction generation
│       └── templates/                # Instruction templates
│           ├── base-instructions.md  # Core server guidance
│           ├── encouragements.json   # 100+ contextual messages
│           └── workflow-specific/    # Per-workflow instructions
│               ├── tdd-instructions.md
│               ├── bug-hunt-instructions.md
│               ├── general-instructions.md
│               ├── rapid-instructions.md
│               └── refactor-instructions.md
├── workflows/                          # Default workflow templates
│   ├── tdd.yaml                       # Test-driven development
│   ├── bug-hunt.yaml                  # Systematic debugging
│   ├── general.yaml                   # Balanced development
│   ├── rapid.yaml                     # Quick prototyping
│   ├── refactor.yaml                  # Safe code improvement
│   └── examples/                      # Additional specialized workflows
├── test/                              # Test suite
│   ├── server.test.ts                # Server functionality tests
│   └── setup.test.ts                 # Setup script tests
└── README.md                          # User documentation
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

### Behavioral Adoption Architecture

1. **Positive Reinforcement Psychology**: Uses celebration and encouragement to build systematic habits
2. **Progressive Habit Building**: Gradually increases workflow discipline through consistent feedback
3. **Context-Aware Responses**: Adapts celebrations and guidance based on current progress
4. **Evidence-Based Motivation**: Incorporates real-world success stories from industry leaders

### Technical Architecture

1. **Global Installation**: Workflows are copied to `~/.sherpa/` so they're available to all projects
2. **Template System**: Dynamic instruction generation with Handlebars-style substitution
3. **Behavioral Components**: Progress tracking, milestone detection, and celebration generation
4. **Comprehensive Logging**: Behavioral events and workflow progress logged to `~/.sherpa/logs/`
5. **Stateful Progress**: Maintains workflow state, progress tracking, and achievement history

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

### SherpaServer Class (`sherpa-server.ts`)
**Core MCP Server with Behavioral Adoption Integration**

- **loadWorkflows()**: Reads YAML files from `~/.sherpa/workflows/`
- **handleNext()**: Enhanced with celebration generation, progress tracking, and milestone detection
- **handleWorkflow()**: Enhanced with motivational workflow selection and usage encouragement
- **recordProgress()**: Tracks step completion and triggers behavioral responses
- **log()**: Writes behavioral events and workflow progress to daily log files

**Behavioral Integration:**
- Initializes `ProgressTracker`, `CelebrationGenerator`, and `InstructionBuilder`
- Generates contextual celebrations for step completion, phase advancement, and milestones
- Provides dynamic encouragement based on usage patterns and progress

### Behavioral Adoption Components

#### ProgressTracker (`src/behavioral-adoption/progress-tracker.ts`)
**Monitors and analyzes user workflow behavior**

- **recordStepCompletion()**: Tracks individual step completion with workflow context
- **recordWorkflowCompletion()**: Records full workflow completion with timing
- **getProgressStats()**: Returns completion statistics, streaks, and usage patterns
- **checkMilestones()**: Detects achievement milestones (first workflow, consistency, diversity)
- **getPersonalizedTips()**: Provides usage-pattern-based suggestions

**Milestone System:**
- First Workflow Mastery (complete first workflow)
- Workflow Veteran (complete 5 workflows)
- Workflow Discipline (7-day usage streak)
- Multi-Workflow Mastery (use all 5 workflow types)
- Quick Learner (3 workflows in first day)
- Efficiency Master (faster than average completion)

#### CelebrationGenerator (`src/behavioral-adoption/celebration-generator.ts`)
**Creates contextual encouragement and celebrations**

- **generateCelebration()**: Main celebration creation based on context
- **generatePhaseEntryCelebration()**: Welcome messages for new workflow phases
- **generateToolUsageEncouragement()**: Positive reinforcement for tool usage
- **generateWorkflowSelectionMotivation()**: Motivational workflow selection guidance
- **generateSuccessStory()**: Real-world company success examples

**Context-Aware Celebrations:**
- Step completion celebrations adapted to workflow type
- Phase completion with increased excitement
- Milestone achievements with special recognition
- Workflow-specific metaphors (TDD = lab work, Bug Hunt = detective work)

#### InstructionBuilder (`src/server-instructions/instruction-builder.ts`)
**Dynamic server instruction generation (future MCP enhancement)**

- **buildInstructions()**: Generates context-aware server instructions
- **applyTemplateSubstitutions()**: Handlebars-style template processing
- **getWorkflowSpecificInstructions()**: Loads workflow-specific guidance
- **addContextualEncouragements()**: Injects behavioral encouragement

**Template System:**
- Base instructions with dynamic content placeholders
- Workflow-specific instruction templates
- 100+ contextual encouragement messages in JSON
- Handlebars-style substitution for current state

### Setup Script (`setup.ts`)
**Enhanced with behavioral adoption support**

- **setup()**: Creates directories and copies workflow templates
- **reset()**: Removes and reinstalls all workflows
- **status()**: Shows current installation state and behavioral system status
- **preserveCustomizations()**: Maintains user workflow customizations during updates

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

### Core Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation and server framework
- `yaml`: YAML parsing for workflow files and configuration
- `bun`: Runtime, package manager, and TypeScript execution

### Behavioral Adoption System
The behavioral adoption system is built entirely with TypeScript and native Node.js APIs:
- **No external dependencies** for behavioral psychology components
- **Template System**: Uses native string replacement (Handlebars-style syntax)
- **Progress Tracking**: In-memory state management with file persistence potential
- **Celebrations**: JSON-based message templates with dynamic selection

### Development Dependencies
- **TypeScript**: Type safety and modern JavaScript features
- **Bun Test**: Built-in testing framework for behavioral component validation

## Building New Features

### Adding Behavioral Features

When enhancing the behavioral adoption system:

1. **Celebration Messages** (`src/server-instructions/templates/encouragements.json`):
   - Add new contextual messages for specific scenarios
   - Follow existing pattern with workflow-specific and general categories
   - Test message selection randomization

2. **Progress Tracking** (`src/behavioral-adoption/progress-tracker.ts`):
   - Add new milestone types in `initializeMilestones()`
   - Implement detection logic in `isMilestoneAchieved()`
   - Update progress statistics collection

3. **Celebration Logic** (`src/behavioral-adoption/celebration-generator.ts`):
   - Add new celebration contexts in `CelebrationContext` interface
   - Implement generation methods for new scenarios
   - Ensure workflow-specific metaphors are maintained

4. **Template System** (`src/server-instructions/templates/`):
   - Add new instruction templates for specialized workflows
   - Update base instructions with new dynamic placeholders
   - Test Handlebars-style substitution patterns

### Adding Core Features

When adding server functionality:

1. **Update Server** (`sherpa-server.ts`):
   - Add new tool handlers following existing pattern
   - Integrate with behavioral adoption system for celebrations
   - Ensure proper logging and error handling

2. **Update Setup** (`setup.ts`):
   - Add new directory structures or file copies as needed
   - Update status reporting for new features
   - Maintain backward compatibility

3. **Add Tests** (`test/`):
   - Write tests for new behavioral components
   - Test server functionality with new features
   - Validate celebration and progress tracking behavior

4. **Update Documentation**:
   - Update `README.md` with user-facing changes
   - Update this `CLAUDE.md` with technical architecture changes
   - Add examples of new behavioral features

### Behavioral Design Principles

When adding new features, maintain:
- **Positive Reinforcement**: Always celebrate progress, never punish
- **Context Awareness**: Adapt feedback to current workflow and progress
- **Progressive Building**: Gradually increase complexity and expectations
- **Evidence-Based**: Include real-world success stories when relevant
- **Joy-Driven**: Make systematic development feel rewarding and fun