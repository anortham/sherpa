# Sherpa Workflows Plugin

AI development workflow guidance with behavioral adoption. Systematic workflows (TDD, Bug Hunt, Refactor, Planning, and more) with positive reinforcement to build good coding habits.

## Features

### 🎯 Intelligent Workflow Skills
- **guided-development** - Auto-selects appropriate workflow based on task
- **tdd-mode** - Explicit Test-Driven Development activation with strict discipline

### ⚡ Quick Start Commands
- `/tdd` - Start TDD workflow (test-first development)
- `/bughunt` - Start Bug Hunt workflow (systematic debugging)
- `/workflows` - List all available workflows

### 🧠 9 Built-in Workflows
1. **TDD** - Test-Driven Development
2. **Bug Hunt** - Systematic Debugging
3. **Refactor** - Safe Code Improvement
4. **Planning** - Architecture & Design
5. **Rapid** - Quick Prototyping
6. **Hotfix** - Emergency Fixes
7. **Exploration** - Learning & Investigation
8. **Code Review** - Thorough Review
9. **General** - Balanced Development

### 🎉 Behavioral Adoption System
- Progress tracking with milestones
- Contextual celebrations and encouragement
- Workflow-specific metaphors (lab work for TDD, detective work for bugs)
- Achievement system that builds systematic habits

## Installation

### Via Plugin Marketplace (Recommended)
```
/plugin install sherpa-workflows@your-marketplace
```

### Manual Installation
1. Clone or copy the sherpa directory
2. Run setup: `cd sherpa && bun run setup`
3. Add to `.claude/settings.json`:
```json
{
  "plugins": ["path/to/sherpa/.claude-plugin"]
}
```
4. Restart Claude Code

## Quick Start

### Automatic Workflow Selection (Recommended)

Just describe your task naturally:

```
"Let's implement payment processing"
→ TDD workflow activates automatically

"This login bug is driving me crazy"
→ Bug Hunt workflow activates automatically

"Need to clean up this messy code"
→ Refactor workflow activates automatically
```

The `guided-development` skill detects task context and activates the right workflow automatically!

### Explicit Workflow Activation

Use slash commands for direct activation:

```bash
/tdd                    # Start Test-Driven Development
/bughunt                # Start systematic debugging
/workflows              # See all workflows
```

Or ask explicitly:
```
"Use the TDD workflow"
"Start planning workflow"
"Switch to exploration mode"
```

## How It Works

### Workflow Phases

Each workflow guides you through structured phases:

**TDD Example:**
```
Phase 1: 📋 Define Contract
→ Design interfaces and types first

Phase 2: ✅ Write Tests
→ Comprehensive test suite BEFORE implementation

Phase 3: 🚀 Implement
→ Make tests pass with minimal code

Phase 4: ✨ Refactor
→ Improve code while tests stay green
```

### Guidance Cycle

**1. Workflow Activation:**
```
approach({ workflow: "tdd" })
```

**2. Get Current Guidance:**
```
guide()
→ Shows current phase, suggestions, progress
```

**3. Mark Progress:**
```
guide({ done: "wrote comprehensive test suite with 8 test cases" })
→ Celebrates progress, advances to next phase
```

### Celebrations & Encouragement

Sherpa celebrates your progress automatically:

```
✨ "Excellent test coverage! Moving to implementation..."
🎉 "All tests green! Beautiful work!"
🏆 "Milestone: First TDD Workflow Complete!"
```

## Workflow Guide

### 🧪 TDD - Test-Driven Development
**Use when:** Building new features, new functionality

**Phases:**
1. Define Contract - Design interfaces
2. Write Tests - Comprehensive suite first
3. Implement - Make tests pass
4. Refactor - Improve while green

**Activate:** `/tdd` or "implement [feature]"

### 🔍 Bug Hunt - Systematic Debugging
**Use when:** Fixing bugs, debugging issues

**Phases:**
1. Reproduce & Isolate - Trigger bug reliably
2. Capture in Test - Write failing test
3. Fix the Bug - Minimal fix
4. Verify & Prevent - Confirm and prevent regression

**Activate:** `/bughunt` or "fix [bug]"

### ♻️ Refactor - Safe Code Improvement
**Use when:** Cleaning up code, improving quality

**Phases:**
1. Tests First - Ensure coverage
2. Refactor Code - Improve while green
3. Verify & Document - Confirm no regressions

**Activate:** "refactor [code]"

### 📐 Planning - Architecture & Design
**Use when:** Designing architecture, planning approach

**Phases:**
1. Research - Requirements and constraints
2. Understand Context - Explore existing code
3. Design Approach - Create plan
4. Document - Record decisions

**Activate:** "plan the architecture"

### Other Workflows
- **⚡ Rapid:** Quick prototypes and experiments
- **🚨 Hotfix:** Emergency production fixes
- **🗺️ Exploration:** Understanding unfamiliar code
- **👁️ Code Review:** Systematic PR reviews
- **⚖️ General:** Flexible balanced approach

See full descriptions: `/workflows`

## Behavioral Adoption

### Milestones & Achievements

Sherpa tracks your progress and celebrates milestones:

- **First Workflow Mastery** - Complete your first workflow
- **Workflow Veteran** - Complete 5 workflows
- **Workflow Discipline** - 7-day usage streak
- **TDD Master** - 10 TDD workflows completed
- **Multi-Workflow Mastery** - Use all 9 workflow types

### Progress Tracking

- Workflow completion statistics
- Phase advancement tracking
- Streak monitoring
- Usage pattern analysis
- Personalized tips

### Dynamic Celebrations

Context-aware celebrations adapted to:
- Workflow type (TDD = lab metaphors, Bug Hunt = detective)
- Current phase
- Milestone achievements
- Progress speed

## Integration with Other Tools

### Goldfish Memory
Checkpoint at phase completions:
```
[Complete TDD Phase 2: Tests Written]
→ guide({ done: "wrote 8 comprehensive tests" })
→ checkpoint({ description: "Completed test suite for payment processing" })
```

### Julie Code Intelligence
Use during workflow phases:
```
[Planning Phase: Research]
→ Julie: fast_search({ query: "authentication patterns", mode: "semantic" })
→ Understand existing patterns
→ guide({ done: "researched existing auth patterns" })
```

### Combined Example
```
[TDD Workflow - Phase 1: Define Contract]
→ Julie: Search existing code for patterns
→ Design interface based on findings
→ guide({ done: "designed PaymentService interface" })
→ Goldfish: Checkpoint design decision

[Phase 2: Write Tests]
→ Write comprehensive tests
→ guide({ done: "wrote 12 test cases" })
→ Sherpa: "🎉 Outstanding test coverage!"

[Continue through phases...]
```

## Customization

### Custom Workflows

Workflows are stored in `~/.sherpa/workflows/` as YAML files:

```yaml
name: "My Custom Workflow"
description: "Custom workflow description"
trigger_hints:
  - "custom"
  - "special process"
phases:
  - name: "📋 Phase 1"
    guidance: "What to focus on in phase 1"
    suggestions:
      - "Specific action"
      - "Another action"
```

Edit or add workflows, and Sherpa will load them automatically!

## Storage Location

```
~/.sherpa/
├── workflows/              # Your customizable workflows
│   ├── tdd.yaml
│   ├── bug-hunt.yaml
│   └── ... (7 more)
└── logs/                   # Server logs (7-day rotation)
    └── sherpa-2025-11-01.log
```

## Philosophy

**Positive Reinforcement**
- Celebrate progress, never punish
- Build habits through encouragement
- Make systematic development feel rewarding

**Systematic Practice**
- Structured phases guide development
- Clear next steps prevent confusion
- Build muscle memory for good practices

**Adaptive Learning**
- Tracks usage patterns
- Provides personalized tips
- Celebrates individual achievements

**Evidence-Based**
- Based on proven development practices
- Incorporates real-world success stories
- Backed by behavioral psychology

## Troubleshooting

### Workflows not appearing
- Ensure Sherpa setup ran: `bun run setup`
- Check `~/.sherpa/workflows/` directory exists
- Verify YAML files are valid

### Guidance not advancing
- Use specific `done` descriptions in guide() calls
- Check current phase with `guide()` without parameters
- Review logs: `~/.sherpa/logs/`

### Celebrations not showing
- Ensure using `guide({ done: "specific description" })` format
- Progress tracking may need initialization (restart server)

## Requirements

- **Runtime:** Bun 1.0+
- **MCP SDK:** ^1.18.1
- **Claude Code:** Latest version

## Commands Reference

```bash
# Development
bun run start           # Start server
bun run dev             # Watch mode
bun run test            # Run tests

# User Management
bun run setup           # Initialize ~/.sherpa
bun run status          # Check installation
bun run reset           # Reset workflows to defaults
bun run logs            # View current logs
```

## License

MIT - See LICENSE file

---

**Happy systematic development! Let Sherpa guide you to better coding habits! 🎉**
