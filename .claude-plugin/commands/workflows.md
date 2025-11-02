---
name: workflows
description: List all available Sherpa workflows with descriptions and when to use them
---

# Workflows Command

Display all available Sherpa workflows with descriptions and usage guidance.

## Task

1. **List all workflows:**
   ```
   approach()  // Call without workflow parameter to get list
   ```

2. **Format the response:**
   Present workflows in a clear, scannable format with:
   - Workflow name
   - Brief description
   - When to use
   - Key phases

3. **Add activation instructions**

## Output Format

```markdown
📋 Available Sherpa Workflows

### 🧪 TDD - Test-Driven Development
**Use for:** New features, new functionality, building from scratch
**Phases:** Define Contract → Write Tests → Implement → Refactor
**Activate:** /tdd or "use TDD workflow"

Pure test-first development with strict discipline. Design interfaces,
write comprehensive tests, implement to pass, then refactor with confidence.

---

### 🔍 Bug Hunt - Systematic Debugging
**Use for:** Bugs, errors, broken functionality, unexpected behavior
**Phases:** Reproduce & Isolate → Capture in Test → Fix → Verify
**Activate:** /bughunt or "debug this bug"

Detective-style systematic debugging. Reproduce reliably, capture in test,
fix with minimal change, verify and prevent regression.

---

### ♻️ Refactor - Safe Code Improvement
**Use for:** Code cleanup, optimization, restructuring
**Phases:** Tests First → Refactor → Verify
**Activate:** "refactor this code"

Safe code improvement with test protection. Ensure tests exist, improve
code quality while staying green, verify no regressions.

---

### 📐 Planning - Architecture & Design
**Use for:** Design discussions, architecture planning, big decisions
**Phases:** Research → Understand → Design → Document
**Activate:** "plan the architecture"

Thoughtful planning and design. Research requirements, understand context,
design approach, document decisions.

---

### ⚡ Rapid - Quick Prototyping
**Use for:** Experiments, spikes, quick prototypes, learning
**Phases:** Implement → Retroactive Tests
**Activate:** "quick prototype"

Fast exploration and prototyping. Implement quickly to learn, add tests
retroactively before production.

---

### 🚨 Hotfix - Emergency Fixes
**Use for:** Production issues, urgent fixes, critical bugs
**Phases:** Minimal process, focus on fix and deploy
**Activate:** "hotfix" or "emergency fix"

Streamlined process for critical fixes. Minimal ceremony, focused on
getting the fix out safely and quickly.

---

### 🗺️ Exploration - Learning & Investigation
**Use for:** Understanding unfamiliar code, exploring new libraries
**Phases:** Learn → Investigate → Prototype → Document
**Activate:** "explore this codebase"

Systematic exploration and learning. Understand the landscape, investigate
patterns, try things out, document findings.

---

### 👁️ Code Review - Thorough Review
**Use for:** Reviewing pull requests, code audits, quality checks
**Phases:** Context → Review → Feedback → Verify
**Activate:** "review this code"

Comprehensive code review process. Understand context, systematic review,
constructive feedback, verify fixes.

---

### ⚖️ General - Balanced Development
**Use for:** Mixed tasks, unclear scope, flexible approach
**Phases:** Research → Plan → Test → Implement
**Activate:** Default workflow for general tasks

Balanced approach combining planning, testing, and implementation.
Flexible for various task types.

---

## How to Use Workflows

**Automatic Activation:**
Just describe your task naturally, and I'll select the appropriate workflow:
- "Let's implement user authentication" → TDD
- "This login is broken" → Bug Hunt
- "Clean up this messy code" → Refactor

**Manual Activation:**
Use slash commands or explicit requests:
- /tdd → Start TDD workflow
- /bughunt → Start Bug Hunt
- "Use the planning workflow" → Planning

**Switching Workflows:**
Change workflows anytime:
- "Actually, let's use the rapid workflow"
- "Switch to exploration mode"

---

💡 **Tip:** Workflows guide you through systematic phases with positive
reinforcement. Let me handle selecting the right workflow, or choose
explicitly if you have a preference!
```

## Key Behaviors

- Present all 9 workflows clearly
- Include when to use each
- Show how to activate
- Emphasize both automatic and manual selection
- Make it scannable and easy to reference

## Customization Note

If the user has customized workflows in `~/.sherpa/workflows/`, those
will be available too. The standard 9 are always present.
