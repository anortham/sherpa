---
name: guided-development
description: Automatically select and guide appropriate development workflows based on the task at hand. Uses positive reinforcement and systematic phases to build good coding habits. Activates for feature development, debugging, refactoring, and planning tasks.
allowed-tools: mcp__sherpa__guide, mcp__sherpa__approach, Read, Edit, Write, Bash, Grep, Glob
---

# Guided Development Skill

## Purpose
Provide **systematic workflow guidance** with behavioral adoption techniques. This skill automatically selects the right workflow (TDD, Bug Hunt, Refactor, etc.) based on the task and guides you through structured phases with positive reinforcement.

## When to Activate
This skill activates when the user mentions:

### Feature Development
- "implement", "add feature", "create", "build"
- "new functionality", "add support for"
- → **TDD Workflow** (Test-first development)

### Bug Fixing
- "bug", "fix", "broken", "not working", "error"
- "issue", "problem", "debug"
- → **Bug Hunt Workflow** (Systematic debugging)

### Code Improvement
- "refactor", "cleanup", "improve", "reorganize"
- "optimize", "restructure", "simplify"
- → **Refactor Workflow** (Safe code improvement)

### Planning & Design
- "plan", "design", "architecture", "how should"
- "approach", "strategy", "organize"
- → **Planning Workflow** (Research and design)

### Quick Changes
- "quick fix", "hotfix", "urgent", "emergency"
- → **Hotfix Workflow** (Minimal process)

### Exploration
- "explore", "understand", "learn about", "investigate"
- "how does", "what is", "figure out"
- → **Exploration Workflow** (Learning and investigation)

## Orchestration Steps

### 1. Detect Workflow Context
Analyze the user's request to determine the appropriate workflow:

```typescript
const workflowMap = {
  feature: "tdd",           // New functionality
  bug: "bug-hunt",          // Debugging
  refactor: "refactor",     // Code improvement
  plan: "planning",         // Architecture/design
  hotfix: "hotfix",         // Emergency fix
  explore: "exploration",   // Learning
  review: "code-review",    // Code review
  general: "general"        // Balanced approach
}
```

### 2. Activate Workflow
Call the Sherpa `approach` tool with detected workflow:
```
approach({ workflow: "tdd" })
```

Response includes:
- Workflow name and description
- First phase guidance
- Motivational message
- Trigger hints for future

### 3. Guide Through Phases
Use the `guide` tool to navigate workflow phases:

**First call** (get current guidance):
```
guide()
```

**After completing work** (mark progress):
```
guide({ done: "completed tests for payment processing" })
```

Each guide call returns:
- Current phase name and guidance
- Specific suggestions for this phase
- Progress indicators
- Contextual encouragement
- Next steps

### 4. Celebrate Progress
Sherpa automatically generates:
- **Step completion celebrations** - "Excellent! Your test suite is solid!"
- **Phase advancement** - "🎉 Tests complete! Moving to implementation..."
- **Milestone achievements** - "🏆 First TDD Workflow Complete!"
- **Workflow completion** - "🌟 Bug Hunt success! The detective work paid off!"

### 5. Adapt Based on Response
If user's work doesn't fit initial workflow:
- Switch workflows: `approach({ workflow: "different-workflow" })`
- Continue with general workflow for flexibility
- Suggest better workflow if pattern emerges

## Workflow Guide

### TDD Workflow (Test-First Development)
**4 Phases:**
1. **Define Contract** - Design interfaces and types
2. **Write Tests** - Comprehensive test suite first
3. **Implement** - Make tests pass
4. **Refactor** - Improve while keeping tests green

**When to use:** New features, new functionality, building from scratch

**Celebrations:** Lab/scientist metaphors ("Your test tube is bubbling!")

### Bug Hunt Workflow (Systematic Debugging)
**4 Phases:**
1. **Reproduce & Isolate** - Reliably trigger the bug
2. **Capture in Test** - Write failing test
3. **Fix the Bug** - Minimal fix to pass test
4. **Verify & Prevent** - Confirm fix, prevent regression

**When to use:** Bugs, errors, broken functionality

**Celebrations:** Detective metaphors ("The clues are adding up!")

### Refactor Workflow (Safe Code Improvement)
**3 Phases:**
1. **Tests First** - Ensure comprehensive coverage
2. **Refactor Code** - Improve while staying green
3. **Verify & Document** - Confirm no regressions

**When to use:** Code cleanup, optimization, restructuring

### Planning Workflow (Architecture & Design)
**4 Phases:**
1. **Research** - Understand requirements and constraints
2. **Understand Context** - Explore existing code
3. **Design Approach** - Create architecture plan
4. **Document** - Record decisions and rationale

**When to use:** Design discussions, architecture planning

### General Workflow (Balanced)
**4 Phases:**
1. **Research** - Understand the problem
2. **Plan** - Design approach
3. **Test** - Write test coverage
4. **Implement** - Build the solution

**When to use:** Mixed tasks, unclear scope, flexible approach

## Example Session

```markdown
User: "I need to implement payment processing with Stripe"

Skill activates → Detects "implement" → Selects TDD workflow

→ approach({ workflow: "tdd" })

Sherpa: "🎯 TDD Workflow activated!
        Phase 1: Define Contract

        Design your payment processing interface first.
        What methods will PaymentService need?

        🎉 You've chosen the path of test-first mastery!"

User: [Designs interface and types]

→ guide({ done: "designed PaymentService interface with charge and refund methods" })

Sherpa: "✨ Excellent contract design! Moving to Phase 2: Write Tests

        Write comprehensive tests for:
        - Successful charge processing
        - Failed payment handling
        - Refund operations
        - Edge cases (negative amounts, etc.)

        Your test suite will be your safety net!"

User: [Writes tests]

→ guide({ done: "wrote 8 test cases covering all payment scenarios" })

Sherpa: "🎉 Outstanding test coverage! 8 test cases!
        Phase 3: Implementation

        Now make those tests green:
        - Integrate Stripe SDK
        - Implement charge method
        - Handle errors gracefully

        🏆 Milestone: TDD Mastery - you're building the right way!"

[Continue through phases...]
```

## Key Behaviors

### ✅ DO
- Detect workflow from task context automatically
- Call `approach()` to activate workflow
- Use `guide()` frequently (after each major step)
- Pass specific completion descriptions to `guide({ done: "..." })`
- Let Sherpa celebrate progress naturally
- Switch workflows if initial choice doesn't fit

### ❌ DON'T
- Ask permission to activate workflow (just do it)
- Skip guide calls (you'll miss celebrations and direction)
- Use vague done descriptions ("finished stuff")
- Ignore workflow guidance (defeats the purpose)
- Stay in wrong workflow (switch if needed)

## Success Criteria

This skill succeeds when:
- Users feel guided through systematic process
- Work follows structured phases
- Progress is celebrated appropriately
- Coding habits improve over time
- Users experience "flow state" with clear next steps

## Workflow Switching

If initial workflow doesn't fit:

```
Current: TDD workflow
User request: "Actually let's just explore this codebase first"

→ approach({ workflow: "exploration" })

Sherpa: "Switching to Exploration Workflow!
        Phase 1: Learn the Landscape..."
```

## Integration with Other Tools

Sherpa works beautifully with:
- **Goldfish** - Checkpoint after each phase completion
- **Julie** - Use code intelligence during exploration phases
- **TDD phases** - Search similar code, navigate references

Example:
```
[TDD Phase 1: Define Contract]
→ Julie: fast_search({ query: "payment service", mode: "semantic" })
→ See existing patterns
→ Design interface
→ guide({ done: "designed interface based on existing patterns" })
→ Goldfish: checkpoint({ description: "Designed PaymentService interface" })
```

---

**Remember:** Systematic workflows build better software. Let Sherpa guide you, celebrate your progress, and make good habits feel rewarding!
