---
name: tdd
description: Start Test-Driven Development workflow with strict test-first discipline
---

# TDD Workflow Command

Activate the Test-Driven Development workflow for systematic test-first development.

## Task

1. **Activate TDD workflow:**
   ```
   approach({ workflow: "tdd" })
   ```

2. **Present the workflow activation:**
   Show the user:
   - Workflow name and description
   - Current phase (Phase 1: Define Contract)
   - Initial guidance
   - Motivational message

3. **Begin guidance cycle:**
   Immediately call `guide()` to show detailed first steps:
   ```
   guide()
   ```

4. **Explain the TDD cycle:**
   Briefly explain what to expect:
   ```markdown
   🎯 TDD Workflow Activated

   **4 Phases:**
   1. 📋 Define Contract - Design interfaces first
   2. ✅ Write Tests - Comprehensive test suite BEFORE implementation
   3. 🚀 Implement - Make tests pass (minimal code)
   4. ✨ Refactor - Improve code while staying green

   **Current Phase:** Define Contract

   [Detailed guidance from guide() call]

   ---
   I'll guide you through each phase. Mark progress with your work
   and I'll celebrate your discipline! 🎉
   ```

## Example Output

```markdown
🎯 TDD Workflow - Test-First Development

**Phase 1: Define Contract**

Design your component's public interface before writing any implementation.
Think through the API, method signatures, and type contracts.

**What to do:**
- Define interfaces and types
- Specify method signatures
- Document expected behavior
- Consider edge cases early

**Remember:** This is about designing the contract that your tests will validate.
Think through what the API should look like from a client's perspective.

---

🎉 Welcome to test-first mastery! Let's build something solid.

**Next steps:**
1. Design your interfaces
2. When ready, I'll move you to writing tests
3. Continue marking progress as you complete each phase
```

## Key Behaviors

- Activate TDD workflow immediately
- Show full phase 1 guidance
- Set expectations for the 4-phase cycle
- Encourage test-first discipline
- Be ready to guide through all phases

## Error Handling

- If Sherpa server not available, explain MCP server needs to be running
- If workflow activation fails, show helpful error
